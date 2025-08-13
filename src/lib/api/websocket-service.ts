// src/lib/api/websocket-service.ts
import { 
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  WebSocketConnection,
  WebSocketSubscription,
  WebSocketMessage,
  WebSocketEventPayload,
  WebSocketSubscriptionType
} from '@/types/api-advanced';
import { APIError } from '@/lib/api/api-errors';

/**
 * WebSocket Service
 * Verwaltet Real-time Verbindungen und Event-Distribution
 */
export class WebSocketService {
  private readonly CONNECTIONS_COLLECTION = 'websocket_connections';
  private readonly MESSAGES_COLLECTION = 'websocket_messages';
  private readonly MAX_CONNECTIONS_PER_ORG = 50;
  private readonly MESSAGE_RETENTION_HOURS = 24;
  private readonly PING_INTERVAL_MS = 30000; // 30 Sekunden

  // In-Memory Connection Management
  private connections: Map<string, {
    connection: WebSocketConnection;
    websocket?: WebSocket;
    lastPing: Date;
    subscriptions: Map<string, WebSocketSubscription>;
  }> = new Map();

  /**
   * Registriert eine neue WebSocket-Verbindung
   */
  async registerConnection(
    connectionId: string,
    userId: string,
    organizationId: string,
    userAgent?: string,
    ipAddress?: string,
    websocket?: WebSocket
  ): Promise<WebSocketConnection> {
    try {
      // Prüfe Connection-Limit
      const existingConnections = await this.getActiveConnections(organizationId);
      if (existingConnections.length >= this.MAX_CONNECTIONS_PER_ORG) {
        throw new APIError(
          'CONNECTION_LIMIT_EXCEEDED',
          `Maximale Anzahl Verbindungen erreicht (${this.MAX_CONNECTIONS_PER_ORG})`
        );
      }

      // Erstelle Connection-Eintrag
      const connection: Omit<WebSocketConnection, 'id'> = {
        userId,
        organizationId,
        connectionId,
        subscriptions: [],
        connectedAt: serverTimestamp() as Timestamp,
        lastPingAt: serverTimestamp() as Timestamp,
        userAgent,
        ipAddress,
        status: 'connected',
        messageCount: 0
      };

      // Speichere in Firestore
      const connectionRef = await addDoc(
        collection(db, this.CONNECTIONS_COLLECTION),
        connection
      );

      const savedConnection = {
        id: connectionRef.id,
        ...connection,
        connectedAt: Timestamp.now(),
        lastPingAt: Timestamp.now()
      } as WebSocketConnection;

      // Speichere in Memory
      this.connections.set(connectionId, {
        connection: savedConnection,
        websocket,
        lastPing: new Date(),
        subscriptions: new Map()
      });

      // Starte Ping-Monitoring
      this.startPingMonitoring(connectionId);

      return savedConnection;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'CONNECTION_FAILED',
        'Fehler beim Registrieren der WebSocket-Verbindung',
        error
      );
    }
  }

  /**
   * Entfernt eine WebSocket-Verbindung
   */
  async unregisterConnection(connectionId: string): Promise<void> {
    try {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) return;

      // Aktualisiere Status in Firestore
      if (connectionData.connection.id) {
        await updateDoc(
          doc(db, this.CONNECTIONS_COLLECTION, connectionData.connection.id),
          {
            status: 'disconnected',
            lastPingAt: serverTimestamp()
          }
        );
      }

      // WebSocket schließen falls vorhanden
      if (connectionData.websocket) {
        connectionData.websocket.close();
      }

      // Entferne aus Memory
      this.connections.delete(connectionId);
    } catch (error) {
      console.error('Error unregistering connection:', error);
    }
  }

  /**
   * Fügt eine Subscription hinzu
   */
  async addSubscription(
    connectionId: string,
    subscriptionType: WebSocketSubscriptionType,
    filters?: WebSocketSubscription['filters']
  ): Promise<string> {
    try {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) {
        throw new APIError('CONNECTION_NOT_FOUND', 'WebSocket-Verbindung nicht gefunden');
      }

      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const subscription: WebSocketSubscription = {
        id: subscriptionId,
        type: subscriptionType,
        filters,
        createdAt: Timestamp.now()
      };

      // Füge zu Connection hinzu
      connectionData.connection.subscriptions.push(subscription);
      connectionData.subscriptions.set(subscriptionId, subscription);

      // Aktualisiere in Firestore
      if (connectionData.connection.id) {
        await updateDoc(
          doc(db, this.CONNECTIONS_COLLECTION, connectionData.connection.id),
          {
            subscriptions: connectionData.connection.subscriptions.map(s => ({
              id: s.id,
              type: s.type,
              filters: s.filters,
              createdAt: s.createdAt
            }))
          }
        );
      }

      return subscriptionId;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'SUBSCRIPTION_FAILED',
        'Fehler beim Hinzufügen der Subscription',
        error
      );
    }
  }

  /**
   * Entfernt eine Subscription
   */
  async removeSubscription(
    connectionId: string,
    subscriptionId: string
  ): Promise<void> {
    try {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) return;

      // Entferne aus Arrays
      connectionData.connection.subscriptions = connectionData.connection.subscriptions
        .filter(s => s.id !== subscriptionId);
      connectionData.subscriptions.delete(subscriptionId);

      // Aktualisiere in Firestore
      if (connectionData.connection.id) {
        await updateDoc(
          doc(db, this.CONNECTIONS_COLLECTION, connectionData.connection.id),
          {
            subscriptions: connectionData.connection.subscriptions.map(s => ({
              id: s.id,
              type: s.type,
              filters: s.filters,
              createdAt: s.createdAt
            }))
          }
        );
      }
    } catch (error) {
      console.error('Error removing subscription:', error);
    }
  }

  /**
   * Sendet eine Nachricht an eine Verbindung
   */
  async sendMessage(
    connectionId: string,
    message: Omit<WebSocketMessage, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) return;

      const fullMessage: WebSocketMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...message
      };

      // Sende über WebSocket falls verfügbar
      if (connectionData.websocket && connectionData.websocket.readyState === WebSocket.OPEN) {
        connectionData.websocket.send(JSON.stringify(fullMessage));
      }

      // Speichere Message für Reliability
      await this.storeMessage(connectionData.connection, fullMessage);

      // Update Message Count
      connectionData.connection.messageCount++;
      connectionData.connection.lastMessageAt = Timestamp.now();

    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  /**
   * Broadcast-Event an passende Subscriptions
   */
  async broadcastEvent(eventPayload: WebSocketEventPayload): Promise<void> {
    try {
      const matchingConnections = this.findMatchingConnections(eventPayload);

      for (const connectionId of matchingConnections) {
        await this.sendMessage(connectionId, {
          type: 'event',
          event: eventPayload.event,
          subscriptionId: eventPayload.subscriptionType
        });
      }
    } catch (error) {
      console.error('Error broadcasting WebSocket event:', error);
    }
  }

  /**
   * Sendet System-Notification
   */
  async sendNotification(
    organizationId: string,
    notification: WebSocketMessage['notification']
  ): Promise<void> {
    try {
      const connections = this.getConnectionsByOrganization(organizationId);

      for (const connectionId of connections) {
        await this.sendMessage(connectionId, {
          type: 'notification',
          notification
        });
      }
    } catch (error) {
      console.error('Error sending WebSocket notification:', error);
    }
  }

  /**
   * Ping-Pong für Connection Health
   */
  async sendPing(connectionId: string): Promise<void> {
    try {
      await this.sendMessage(connectionId, {
        type: 'ping'
      });

      // Update Last Ping
      const connectionData = this.connections.get(connectionId);
      if (connectionData) {
        connectionData.lastPing = new Date();
      }
    } catch (error) {
      console.error('Error sending ping:', error);
    }
  }

  /**
   * Behandelt Pong-Response
   */
  async handlePong(connectionId: string): Promise<void> {
    try {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) return;

      // Update Ping Time
      connectionData.lastPing = new Date();

      // Update in Firestore
      if (connectionData.connection.id) {
        await updateDoc(
          doc(db, this.CONNECTIONS_COLLECTION, connectionData.connection.id),
          {
            lastPingAt: serverTimestamp()
          }
        );
      }
    } catch (error) {
      console.error('Error handling pong:', error);
    }
  }

  /**
   * Holt aktive Verbindungen für Organisation
   */
  async getActiveConnections(organizationId: string): Promise<WebSocketConnection[]> {
    try {
      const connectionsQuery = query(
        collection(db, this.CONNECTIONS_COLLECTION),
        where('organizationId', '==', organizationId),
        where('status', '==', 'connected'),
        orderBy('connectedAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(connectionsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WebSocketConnection));
    } catch (error) {
      console.error('Error getting active connections:', error);
      return [];
    }
  }

  /**
   * Bereinigt inaktive Verbindungen
   */
  async cleanupInactiveConnections(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 Minuten

      // Prüfe In-Memory Connections
      for (const [connectionId, connectionData] of this.connections.entries()) {
        if (connectionData.lastPing < cutoffTime) {
          console.log(`Cleaning up inactive connection: ${connectionId}`);
          await this.unregisterConnection(connectionId);
        }
      }

      // Bereinige alte Firestore-Einträge
      const oldConnectionsQuery = query(
        collection(db, this.CONNECTIONS_COLLECTION),
        where('lastPingAt', '<', Timestamp.fromDate(cutoffTime)),
        limit(50)
      );

      const snapshot = await getDocs(oldConnectionsQuery);
      
      for (const connectionDoc of snapshot.docs) {
        await deleteDoc(connectionDoc.ref);
      }

      console.log(`Cleaned up ${snapshot.docs.length} old connection records`);
    } catch (error) {
      console.error('Error cleaning up inactive connections:', error);
    }
  }

  /**
   * Bereinigt alte Messages
   */
  async cleanupOldMessages(): Promise<void> {
    try {
      const cutoffTime = Timestamp.fromDate(
        new Date(Date.now() - this.MESSAGE_RETENTION_HOURS * 60 * 60 * 1000)
      );

      const oldMessagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('timestamp', '<', cutoffTime),
        limit(100)
      );

      const snapshot = await getDocs(oldMessagesQuery);
      
      for (const messageDoc of snapshot.docs) {
        await deleteDoc(messageDoc.ref);
      }

      console.log(`Cleaned up ${snapshot.docs.length} old messages`);
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
    }
  }

  // ===================
  // PRIVATE METHODS
  // ===================

  /**
   * Findet passende Connections für Event
   */
  private findMatchingConnections(eventPayload: WebSocketEventPayload): string[] {
    const matchingConnections: string[] = [];

    for (const [connectionId, connectionData] of this.connections.entries()) {
      // Prüfe Organization
      if (connectionData.connection.organizationId !== eventPayload.event.organizationId) {
        continue;
      }

      // Prüfe Subscriptions
      for (const subscription of connectionData.subscriptions.values()) {
        if (this.subscriptionMatches(subscription, eventPayload)) {
          matchingConnections.push(connectionId);
          break;
        }
      }
    }

    return matchingConnections;
  }

  /**
   * Prüft ob Subscription zum Event passt
   */
  private subscriptionMatches(
    subscription: WebSocketSubscription,
    eventPayload: WebSocketEventPayload
  ): boolean {
    // Prüfe Subscription-Type
    if (subscription.type !== eventPayload.subscriptionType) {
      return false;
    }

    // Prüfe Filters
    if (subscription.filters) {
      // Entity-Filter
      if (subscription.filters.entities?.length > 0) {
        if (!subscription.filters.entities.includes(eventPayload.event.entityId)) {
          return false;
        }
      }

      // Event-Type Filter
      if (subscription.filters.events?.length > 0) {
        if (!subscription.filters.events.includes(eventPayload.event.type)) {
          return false;
        }
      }

      // Tag-Filter
      if (subscription.filters.tags?.length > 0) {
        const eventTags = (eventPayload.event.data as any)?.tags || [];
        const hasMatchingTag = subscription.filters.tags.some(tag =>
          eventTags.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Holt Connections nach Organisation
   */
  private getConnectionsByOrganization(organizationId: string): string[] {
    const connections: string[] = [];

    for (const [connectionId, connectionData] of this.connections.entries()) {
      if (connectionData.connection.organizationId === organizationId) {
        connections.push(connectionId);
      }
    }

    return connections;
  }

  /**
   * Speichert Message für Reliability
   */
  private async storeMessage(
    connection: WebSocketConnection,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      await addDoc(collection(db, this.MESSAGES_COLLECTION), {
        connectionId: connection.connectionId,
        organizationId: connection.organizationId,
        userId: connection.userId,
        message,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error storing WebSocket message:', error);
    }
  }

  /**
   * Startet Ping-Monitoring
   */
  private startPingMonitoring(connectionId: string): void {
    const pingInterval = setInterval(async () => {
      const connectionData = this.connections.get(connectionId);
      if (!connectionData) {
        clearInterval(pingInterval);
        return;
      }

      // Prüfe ob Connection noch aktiv
      const timeSinceLastPing = Date.now() - connectionData.lastPing.getTime();
      if (timeSinceLastPing > this.PING_INTERVAL_MS * 2) {
        console.log(`Connection ${connectionId} timed out`);
        await this.unregisterConnection(connectionId);
        clearInterval(pingInterval);
        return;
      }

      // Sende Ping
      await this.sendPing(connectionId);
    }, this.PING_INTERVAL_MS);
  }
}

// Singleton Export
export const webSocketService = new WebSocketService();
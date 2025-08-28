// src/__tests__/api/advanced/websocket-service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocketService } from '@/lib/api/websocket-service';
import { 
  WebSocketConnection,
  WebSocketSubscriptionType,
  WebSocketEventPayload
} from '@/types/api-advanced';

// Mock Firebase
jest.mock('@/lib/firebase/build-safe-init', () => ({
  db: {}
}));

// Mock Firestore functions
const mockAddDoc = jest.fn() as any;
const mockGetDoc = jest.fn() as any;
const mockGetDocs = jest.fn() as any;
const mockUpdateDoc = jest.fn() as any;
const mockDeleteDoc = jest.fn() as any;
const mockQuery = jest.fn() as any;
const mockWhere = jest.fn() as any;
const mockOrderBy = jest.fn() as any;
const mockLimit = jest.fn() as any;
const mockCollection = jest.fn() as any;
const mockDoc = jest.fn() as any;
const mockServerTimestamp = jest.fn() as any;

jest.mock('firebase/firestore', () => ({
  addDoc: mockAddDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  collection: mockCollection,
  doc: mockDoc,
  serverTimestamp: mockServerTimestamp,
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date: Date) => ({ toDate: () => date })
  }
}));

// Mock WebSocket
class MockWebSocket {
  readyState = 1; // OPEN
  send = jest.fn();
  close = jest.fn();
}

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  const testOrganizationId = 'test-org-123';
  const testUserId = 'test-user-456';
  const testConnectionId = 'conn-123';

  beforeEach(() => {
    webSocketService = new WebSocketService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockServerTimestamp.mockReturnValue({});
    mockCollection.mockReturnValue({});
    mockDoc.mockReturnValue({ id: 'test-id' });
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
    mockLimit.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerConnection', () => {
    it('sollte eine WebSocket-Verbindung erfolgreich registrieren', async () => {
      // Mock successful connection creation
      const mockConnectionRef = { id: 'ws-conn-123' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);

      // Mock empty existing connections (under limit)
      mockGetDocs.mockResolvedValue({
        docs: []
      });

      const mockWebSocket = new MockWebSocket();

      const result = await webSocketService.registerConnection(
        testConnectionId,
        testUserId,
        testOrganizationId,
        'Mozilla/5.0 Test Browser',
        '192.168.1.1',
        mockWebSocket as any
      );

      expect(result).toBeDefined();
      expect(result.connectionId).toBe(testConnectionId);
      expect(result.userId).toBe(testUserId);
      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.status).toBe('connected');
      expect(result.userAgent).toBe('Mozilla/5.0 Test Browser');
      expect(result.ipAddress).toBe('192.168.1.1');
      
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it('sollte Fehler werfen wenn Connection-Limit erreicht', async () => {
      // Mock 50 existing connections (limit reached)
      const existingConnections = Array.from({ length: 50 }, (_, i) => ({
        id: `conn-${i}`,
        data: () => ({
          connectionId: `conn-${i}`,
          organizationId: testOrganizationId,
          status: 'connected'
        })
      }));

      mockGetDocs.mockResolvedValue({
        docs: existingConnections
      });

      await expect(
        webSocketService.registerConnection(
          testConnectionId,
          testUserId,
          testOrganizationId
        )
      ).rejects.toThrow('Maximale Anzahl Verbindungen erreicht');
    });
  });

  describe('unregisterConnection', () => {
    it('sollte eine Verbindung erfolgreich entfernen', async () => {
      // Erste registriere eine Verbindung
      const mockConnectionRef = { id: 'ws-conn-123' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);
      mockGetDocs.mockResolvedValue({ docs: [] });

      const mockWebSocket = new MockWebSocket();

      await webSocketService.registerConnection(
        testConnectionId,
        testUserId,
        testOrganizationId,
        undefined,
        undefined,
        mockWebSocket as any
      );

      // Dann entferne die Verbindung
      mockUpdateDoc.mockResolvedValue({});

      await webSocketService.unregisterConnection(testConnectionId);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'disconnected'
        })
      );
      
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('sollte nichts tun wenn Verbindung nicht existiert', async () => {
      await webSocketService.unregisterConnection('nonexistent-connection');
      
      // Sollte keine Firestore-Updates geben
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('addSubscription', () => {
    beforeEach(async () => {
      // Registriere eine Verbindung für die Tests
      const mockConnectionRef = { id: 'ws-conn-123' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);
      mockGetDocs.mockResolvedValue({ docs: [] });

      await webSocketService.registerConnection(
        testConnectionId,
        testUserId,
        testOrganizationId
      );
      
      // Reset mocks nach der Registrierung
      jest.clearAllMocks();
      mockUpdateDoc.mockResolvedValue({});
    });

    it('sollte eine Subscription erfolgreich hinzufügen', async () => {
      const subscriptionType: WebSocketSubscriptionType = 'contacts';
      const filters = {
        entities: ['contact-1', 'contact-2'],
        events: ['contact.created', 'contact.updated']
      };

      const subscriptionId = await webSocketService.addSubscription(
        testConnectionId,
        subscriptionType,
        filters
      );

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^sub_\d+_[a-z0-9]+$/);
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          subscriptions: expect.arrayContaining([
            expect.objectContaining({
              type: subscriptionType,
              filters: filters
            })
          ])
        })
      );
    });

    it('sollte Fehler werfen wenn Verbindung nicht existiert', async () => {
      await expect(
        webSocketService.addSubscription(
          'nonexistent-connection',
          'contacts'
        )
      ).rejects.toThrow('WebSocket-Verbindung nicht gefunden');
    });
  });

  describe('removeSubscription', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      // Registriere eine Verbindung und füge eine Subscription hinzu
      const mockConnectionRef = { id: 'ws-conn-123' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);
      mockGetDocs.mockResolvedValue({ docs: [] });

      await webSocketService.registerConnection(
        testConnectionId,
        testUserId,
        testOrganizationId
      );

      jest.clearAllMocks();
      mockUpdateDoc.mockResolvedValue({});

      subscriptionId = await webSocketService.addSubscription(
        testConnectionId,
        'contacts'
      );

      jest.clearAllMocks();
      mockUpdateDoc.mockResolvedValue({});
    });

    it('sollte eine Subscription erfolgreich entfernen', async () => {
      await webSocketService.removeSubscription(testConnectionId, subscriptionId);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          subscriptions: []
        })
      );
    });

    it('sollte nichts tun wenn Verbindung nicht existiert', async () => {
      await webSocketService.removeSubscription('nonexistent', subscriptionId);
      
      // Sollte keine Updates geben
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    let mockWebSocket: MockWebSocket;

    beforeEach(async () => {
      // Registriere eine Verbindung mit WebSocket
      const mockConnectionRef = { id: 'ws-conn-123' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);
      mockGetDocs.mockResolvedValue({ docs: [] });
      
      mockWebSocket = new MockWebSocket();

      await webSocketService.registerConnection(
        testConnectionId,
        testUserId,
        testOrganizationId,
        undefined,
        undefined,
        mockWebSocket as any
      );

      jest.clearAllMocks();
      mockAddDoc.mockResolvedValue({ id: 'message-123' });
    });

    it('sollte eine Nachricht über WebSocket senden', async () => {
      const message = {
        type: 'event' as const,
        event: {
          type: 'contact.created',
          entity: 'contact',
          action: 'created',
          data: { id: 'contact-1', name: 'John Doe' },
          timestamp: new Date().toISOString()
        }
      };

      await webSocketService.sendMessage(testConnectionId, message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"event"')
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"contact.created"')
      );

      // Verifiziere dass Nachricht gespeichert wurde
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    it('sollte nichts senden wenn Verbindung nicht existiert', async () => {
      const message = {
        type: 'ping' as const
      };

      await webSocketService.sendMessage('nonexistent', message);

      expect(mockWebSocket.send).not.toHaveBeenCalled();
      expect(mockAddDoc).not.toHaveBeenCalled();
    });

    it('sollte Nachricht speichern auch ohne WebSocket', async () => {
      // Entferne WebSocket aus der Verbindung
      await webSocketService.unregisterConnection(testConnectionId);
      
      // Registriere wieder ohne WebSocket
      const mockConnectionRef = { id: 'ws-conn-124' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);
      mockGetDocs.mockResolvedValue({ docs: [] });

      await webSocketService.registerConnection(
        'conn-no-ws',
        testUserId,
        testOrganizationId
      );

      jest.clearAllMocks();
      mockAddDoc.mockResolvedValue({ id: 'message-124' });

      const message = {
        type: 'notification' as const,
        notification: {
          level: 'info' as const,
          title: 'Test Notification',
          message: 'This is a test notification'
        }
      };

      await webSocketService.sendMessage('conn-no-ws', message);

      // WebSocket send sollte nicht aufgerufen werden
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      
      // Aber Nachricht sollte trotzdem gespeichert werden
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('broadcastEvent', () => {
    beforeEach(async () => {
      // Registriere eine Verbindung mit Subscription
      const mockConnectionRef = { id: 'ws-conn-123' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);
      mockGetDocs.mockResolvedValue({ docs: [] });

      const mockWebSocket = new MockWebSocket();

      await webSocketService.registerConnection(
        testConnectionId,
        testUserId,
        testOrganizationId,
        undefined,
        undefined,
        mockWebSocket as any
      );

      // Füge Subscription hinzu
      jest.clearAllMocks();
      mockUpdateDoc.mockResolvedValue({});
      
      await webSocketService.addSubscription(
        testConnectionId,
        'contacts',
        { events: ['contact.created'] }
      );

      jest.clearAllMocks();
      mockAddDoc.mockResolvedValue({ id: 'message-123' });
    });

    it('sollte Event an passende Subscriptions broadcasten', async () => {
      const eventPayload: WebSocketEventPayload = {
        subscriptionType: 'contacts',
        event: {
          type: 'contact.created',
          entity: 'contact',
          entityId: 'contact-1',
          action: 'created',
          data: { id: 'contact-1', name: 'John Doe' },
          timestamp: new Date().toISOString(),
          organizationId: testOrganizationId
        },
        recipients: []
      };

      await webSocketService.broadcastEvent(eventPayload);

      // Verifiziere dass Nachricht gesendet wurde
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    it('sollte Event nicht senden wenn keine passende Subscription', async () => {
      const eventPayload: WebSocketEventPayload = {
        subscriptionType: 'companies', // Andere Subscription
        event: {
          type: 'company.created',
          entity: 'company',
          entityId: 'company-1',
          action: 'created',
          data: { id: 'company-1', name: 'Test Company' },
          timestamp: new Date().toISOString(),
          organizationId: testOrganizationId
        },
        recipients: []
      };

      await webSocketService.broadcastEvent(eventPayload);

      // Sollte keine Nachricht senden
      expect(mockAddDoc).not.toHaveBeenCalled();
    });

    it('sollte Event nicht senden wenn falsche Organisation', async () => {
      const eventPayload: WebSocketEventPayload = {
        subscriptionType: 'contacts',
        event: {
          type: 'contact.created',
          entity: 'contact',
          entityId: 'contact-1',
          action: 'created',
          data: { id: 'contact-1' },
          timestamp: new Date().toISOString(),
          organizationId: 'other-org' // Andere Organisation
        },
        recipients: []
      };

      await webSocketService.broadcastEvent(eventPayload);

      // Sollte keine Nachricht senden
      expect(mockAddDoc).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    beforeEach(async () => {
      // Registriere zwei Verbindungen für die gleiche Organisation
      const mockConnectionRef1 = { id: 'ws-conn-1' };
      const mockConnectionRef2 = { id: 'ws-conn-2' };
      
      mockAddDoc
        .mockResolvedValueOnce(mockConnectionRef1)
        .mockResolvedValueOnce(mockConnectionRef2);
      
      mockGetDocs.mockResolvedValue({ docs: [] });

      await webSocketService.registerConnection(
        'conn-1',
        testUserId,
        testOrganizationId
      );

      await webSocketService.registerConnection(
        'conn-2',
        'user-2',
        testOrganizationId
      );

      jest.clearAllMocks();
      mockAddDoc.mockResolvedValue({ id: 'message-123' });
    });

    it('sollte Notification an alle Verbindungen der Organisation senden', async () => {
      const notification = {
        level: 'warning' as const,
        title: 'System Maintenance',
        message: 'The system will be down for maintenance',
        data: { maintenanceTime: '2024-01-01T02:00:00Z' }
      };

      await webSocketService.sendNotification(testOrganizationId, notification);

      // Sollte zwei Nachrichten senden (eine pro Verbindung)
      expect(mockAddDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('getActiveConnections', () => {
    it('sollte aktive Verbindungen für Organisation zurückgeben', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          connectionId: 'ws-conn-1',
          userId: testUserId,
          organizationId: testOrganizationId,
          status: 'connected',
          connectedAt: { toDate: () => new Date() },
          subscriptions: []
        },
        {
          id: 'conn-2',
          connectionId: 'ws-conn-2',
          userId: 'user-2',
          organizationId: testOrganizationId,
          status: 'connected',
          connectedAt: { toDate: () => new Date() },
          subscriptions: []
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockConnections.map(conn => ({
          id: conn.id,
          data: () => conn
        }))
      });

      const result = await webSocketService.getActiveConnections(testOrganizationId);

      expect(result).toHaveLength(2);
      expect(result[0].connectionId).toBe('ws-conn-1');
      expect(result[1].connectionId).toBe('ws-conn-2');
      expect(result[0].organizationId).toBe(testOrganizationId);
    });

    it('sollte leere Liste zurückgeben wenn keine aktiven Verbindungen', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const result = await webSocketService.getActiveConnections(testOrganizationId);

      expect(result).toHaveLength(0);
    });
  });

  describe('Ping/Pong Handling', () => {
    beforeEach(async () => {
      const mockConnectionRef = { id: 'ws-conn-123' };
      mockAddDoc.mockResolvedValue(mockConnectionRef);
      mockGetDocs.mockResolvedValue({ docs: [] });

      await webSocketService.registerConnection(
        testConnectionId,
        testUserId,
        testOrganizationId
      );

      jest.clearAllMocks();
      mockAddDoc.mockResolvedValue({ id: 'ping-message' });
    });

    it('sollte Ping erfolgreich senden', async () => {
      await webSocketService.sendPing(testConnectionId);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          message: expect.objectContaining({
            type: 'ping'
          })
        })
      );
    });

    it('sollte Pong korrekt behandeln', async () => {
      mockUpdateDoc.mockResolvedValue({});

      await webSocketService.handlePong(testConnectionId);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastPingAt: expect.anything()
        })
      );
    });
  });

  describe('Cleanup Methods', () => {
    it('sollte inaktive Verbindungen bereinigen', async () => {
      // Mock alte Verbindungen
      const oldConnections = [
        { id: 'old-conn-1', ref: { delete: jest.fn() } },
        { id: 'old-conn-2', ref: { delete: jest.fn() } }
      ];

      mockGetDocs.mockResolvedValue({
        docs: oldConnections.map(conn => ({
          id: conn.id,
          ref: { delete: jest.fn() as any }
        }))
      });

      await webSocketService.cleanupInactiveConnections();

      expect(mockGetDocs).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });

    it('sollte alte Messages bereinigen', async () => {
      const oldMessages = [
        { id: 'old-msg-1' },
        { id: 'old-msg-2' }
      ];

      mockGetDocs.mockResolvedValue({
        docs: oldMessages.map(msg => ({
          id: msg.id,
          ref: { delete: jest.fn() as any }
        }))
      });

      await webSocketService.cleanupOldMessages();

      expect(mockGetDocs).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });
  });
});
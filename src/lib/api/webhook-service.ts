// src/lib/api/webhook-service.ts
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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/build-safe-init';
import {
  WebhookConfig,
  WebhookDelivery,
  WebhookPayload,
  WebhookEvent,
  WebhookStatistics,
  APIWebhook,
  APIWebhookCreateRequest,
  APIWebhookUpdateRequest,
  APIWebhookListResponse,
  APIWebhookDelivery,
  APIWebhookDeliveryListResponse,
  APIWebhookTestRequest,
  APIWebhookTestResponse,
  WebhookSignature
} from '@/types/api-webhooks';
import { APIError } from '@/lib/api/api-errors';
import * as crypto from 'crypto';

/**
 * Webhook Service
 * Verwaltet Webhook-Registrierungen und Event-Delivery
 */
export class WebhookService {
  private readonly COLLECTION_NAME = 'webhooks';
  private readonly DELIVERIES_COLLECTION = 'webhook_deliveries';
  private readonly DEFAULT_TIMEOUT_MS = 10000;
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_BACKOFF_MULTIPLIER = 2;
  private readonly DEFAULT_INITIAL_DELAY_MS = 1000;
  private readonly DEFAULT_MAX_DELAY_MS = 60000;

  /**
   * Erstellt einen neuen Webhook
   */
  async createWebhook(
    data: APIWebhookCreateRequest,
    organizationId: string,
    userId: string
  ): Promise<APIWebhook> {
    try {
      // Validierung
      this.validateWebhookData(data);

      // Prüfe auf Duplikate
      const existingWebhook = await this.findDuplicateWebhook(
        data.url,
        data.events,
        organizationId
      );

      if (existingWebhook) {
        throw new APIError(
          'DUPLICATE_WEBHOOK',
          'Ein Webhook mit dieser URL und diesen Events existiert bereits'
        );
      }

      // Generiere Secret wenn nicht vorhanden
      const secret = data.secret || this.generateWebhookSecret();

      // Erstelle Webhook-Config
      const webhookConfig: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        description: data.description,
        url: data.url,
        events: data.events,
        secret,
        headers: data.headers || {},
        isActive: data.isActive !== false,
        retryPolicy: {
          maxAttempts: data.retryPolicy?.maxAttempts || this.DEFAULT_MAX_RETRIES,
          backoffMultiplier: data.retryPolicy?.backoffMultiplier || this.DEFAULT_BACKOFF_MULTIPLIER,
          initialDelayMs: data.retryPolicy?.initialDelayMs || this.DEFAULT_INITIAL_DELAY_MS,
          maxDelayMs: data.retryPolicy?.maxDelayMs || this.DEFAULT_MAX_DELAY_MS
        },
        timeoutMs: data.timeoutMs || this.DEFAULT_TIMEOUT_MS,
        filters: data.filters,
        organizationId,
        createdBy: userId,
        updatedBy: userId
      };

      // Speichere in Firestore (safe check)
      if (!db) {
        throw new APIError('SERVICE_UNAVAILABLE', 'Database nicht verfügbar');
      }

      const webhookRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        {
          ...webhookConfig,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      // Hole erstellten Webhook
      const createdWebhook = await getDoc(webhookRef);
      const webhookData = { id: webhookRef.id, ...createdWebhook.data() } as WebhookConfig;

      return this.transformToAPIWebhook(webhookData);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Erstellen des Webhooks',
        error
      );
    }
  }

  /**
   * Holt alle Webhooks einer Organisation
   */
  async getWebhooks(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      events?: WebhookEvent[];
    } = {}
  ): Promise<APIWebhookListResponse> {
    try {
      // Safe check für db
      if (!db) {
        throw new APIError('SERVICE_UNAVAILABLE', 'Database nicht verfügbar');
      }

      const constraints = [
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      ];

      if (params.isActive !== undefined) {
        constraints.push(where('isActive', '==', params.isActive));
      }

      let webhooks: WebhookConfig[] = [];
      
      try {
        const q = query(collection(db, this.COLLECTION_NAME), ...constraints);
        const snapshot = await getDocs(q);

        webhooks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as WebhookConfig));
      } catch (error) {
        // Falls Collection nicht existiert, return empty array
        console.warn('Warning: Webhooks collection nicht gefunden oder leer:', error);
        webhooks = [];
      }

      // Filter by events if specified
      if (params.events && params.events.length > 0) {
        webhooks = webhooks.filter(w => 
          w.events.some(e => params.events!.includes(e))
        );
      }

      // Pagination
      const page = params.page || 1;
      const pageLimit = Math.min(params.limit || 50, 100);
      const startIndex = (page - 1) * pageLimit;
      const endIndex = startIndex + pageLimit;
      const paginatedWebhooks = webhooks.slice(startIndex, endIndex);

      // Transform und füge Statistiken hinzu
      const apiWebhooks = await Promise.all(
        paginatedWebhooks.map(w => this.transformToAPIWebhook(w))
      );

      return {
        webhooks: apiWebhooks,
        total: webhooks.length,
        page,
        limit: pageLimit,
        hasNext: endIndex < webhooks.length
      };
    } catch (error) {
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen der Webhooks',
        error
      );
    }
  }

  /**
   * Holt einen einzelnen Webhook
   */
  async getWebhookById(
    webhookId: string,
    organizationId: string
  ): Promise<APIWebhook> {
    try {
      const webhookDoc = await getDoc(doc(db, this.COLLECTION_NAME, webhookId));
      
      if (!webhookDoc.exists()) {
        throw new APIError('WEBHOOK_NOT_FOUND', 'Webhook nicht gefunden');
      }

      const webhookData = { id: webhookId, ...webhookDoc.data() } as WebhookConfig;

      if (webhookData.organizationId !== organizationId) {
        throw new APIError('WEBHOOK_NOT_FOUND', 'Webhook nicht gefunden');
      }

      return this.transformToAPIWebhook(webhookData);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Abrufen des Webhooks',
        error
      );
    }
  }

  /**
   * Aktualisiert einen Webhook
   */
  async updateWebhook(
    webhookId: string,
    data: APIWebhookUpdateRequest,
    organizationId: string,
    userId: string
  ): Promise<APIWebhook> {
    try {
      // Hole bestehenden Webhook
      const existing = await this.getWebhookById(webhookId, organizationId);
      
      // Validierung wenn URL oder Events geändert werden
      if (data.url || data.events) {
        this.validateWebhookData({
          ...existing,
          ...data
        } as APIWebhookCreateRequest);
      }

      // Update-Daten vorbereiten
      const updateData: any = {
        updatedAt: serverTimestamp(),
        updatedBy: userId
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.url !== undefined) updateData.url = data.url;
      if (data.events !== undefined) updateData.events = data.events;
      if (data.secret !== undefined) updateData.secret = data.secret;
      if (data.headers !== undefined) updateData.headers = data.headers;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.timeoutMs !== undefined) updateData.timeoutMs = data.timeoutMs;
      if (data.filters !== undefined) updateData.filters = data.filters;
      
      if (data.retryPolicy) {
        updateData.retryPolicy = {
          ...existing.retryPolicy,
          ...data.retryPolicy
        };
      }

      // Update in Firestore
      await updateDoc(doc(db, this.COLLECTION_NAME, webhookId), updateData);

      // Hole aktualisierten Webhook
      return this.getWebhookById(webhookId, organizationId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Aktualisieren des Webhooks',
        error
      );
    }
  }

  /**
   * Löscht einen Webhook
   */
  async deleteWebhook(
    webhookId: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Prüfe ob Webhook existiert und zur Organisation gehört
      await this.getWebhookById(webhookId, organizationId);

      // Lösche alle zugehörigen Deliveries
      const deliveriesQuery = query(
        collection(db, this.DELIVERIES_COLLECTION),
        where('webhookId', '==', webhookId)
      );
      const deliveriesSnapshot = await getDocs(deliveriesQuery);
      
      const batch = writeBatch(db);
      deliveriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Lösche Webhook selbst
      batch.delete(doc(db, this.COLLECTION_NAME, webhookId));
      
      await batch.commit();
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'INTERNAL_SERVER_ERROR',
        'Fehler beim Löschen des Webhooks',
        error
      );
    }
  }

  /**
   * Testet einen Webhook
   */
  async testWebhook(
    data: APIWebhookTestRequest,
    organizationId: string
  ): Promise<APIWebhookTestResponse> {
    try {
      let url: string;
      let secret: string | undefined;

      if (data.webhookId) {
        // Test existing webhook
        const webhook = await this.getWebhookById(data.webhookId, organizationId);
        url = webhook.url;
        const webhookDoc = await getDoc(doc(db, this.COLLECTION_NAME, data.webhookId));
        secret = webhookDoc.data()?.secret;
      } else if (data.url) {
        // Test arbitrary URL
        url = data.url;
      } else {
        throw new APIError('VALIDATION_ERROR', 'webhookId oder url erforderlich');
      }

      // Erstelle Test-Payload
      const testPayload: WebhookPayload = {
        webhookId: data.webhookId || 'test',
        eventId: `test-${Date.now()}`,
        event: data.event,
        timestamp: new Date().toISOString(),
        organizationId,
        data: data.sampleData || {
          id: 'test-entity-id',
          type: data.event.split('.')[0],
          action: data.event.split('.')[1] as any,
          entity: {
            id: 'test-entity-id',
            name: 'Test Entity',
            test: true
          },
          metadata: {
            source: 'webhook-test'
          }
        },
        webhook: {
          id: data.webhookId || 'test',
          version: '1.0',
          attempt: 1,
          maxAttempts: 1
        }
      };

      // Sende Test-Request
      const startTime = Date.now();
      const response = await this.deliverWebhook(url, testPayload, secret);
      const responseTime = Date.now() - startTime;

      return {
        success: response.success,
        statusCode: response.statusCode,
        responseTime,
        headers: response.headers,
        body: response.body,
        error: response.error,
        signatureValid: secret ? true : undefined
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unbekannter Fehler',
          code: 'TEST_FAILED'
        }
      };
    }
  }

  /**
   * Triggert ein Webhook-Event
   */
  async triggerEvent(
    event: WebhookEvent,
    data: any,
    organizationId: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Finde alle aktiven Webhooks für dieses Event
      const webhooksQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('organizationId', '==', organizationId),
        where('isActive', '==', true),
        where('events', 'array-contains', event)
      );

      const snapshot = await getDocs(webhooksQuery);
      const webhooks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WebhookConfig));

      // Erstelle Delivery für jeden Webhook
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      for (const webhook of webhooks) {
        // Prüfe Filter
        if (!this.passesFilters(webhook, data)) {
          continue;
        }

        // Erstelle Payload
        const payload: WebhookPayload = {
          webhookId: webhook.id!,
          eventId,
          event,
          timestamp: new Date().toISOString(),
          organizationId,
          data: {
            id: data.id,
            type: event.split('.')[0],
            action: event.split('.')[1] as any,
            entity: data,
            changes: data.changes,
            metadata
          },
          webhook: {
            id: webhook.id!,
            version: '1.0',
            attempt: 1,
            maxAttempts: webhook.retryPolicy.maxAttempts
          }
        };

        // Erstelle Delivery-Eintrag
        await this.createDelivery(webhook, payload);
      }
    } catch (error) {
      console.error('Error triggering webhook event:', error);
      // Webhook-Fehler sollten nicht die Hauptoperation unterbrechen
    }
  }

  /**
   * Verarbeitet ausstehende Webhook-Deliveries
   */
  async processDeliveries(): Promise<void> {
    try {
      // Hole alle ausstehenden oder fehlgeschlagenen Deliveries die retry brauchen
      const now = Timestamp.now();
      const deliveriesQuery = query(
        collection(db, this.DELIVERIES_COLLECTION),
        where('status', 'in', ['pending', 'failed']),
        where('nextRetryAt', '<=', now),
        orderBy('nextRetryAt', 'asc'),
        limit(10) // Batch-Größe
      );

      const snapshot = await getDocs(deliveriesQuery);
      const deliveries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WebhookDelivery));

      // Verarbeite jede Delivery
      for (const delivery of deliveries) {
        await this.processDelivery(delivery);
      }
    } catch (error) {
      console.error('Error processing webhook deliveries:', error);
    }
  }

  /**
   * Verarbeitet eine einzelne Delivery
   */
  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    try {
      // Hole Webhook-Config
      const webhookDoc = await getDoc(doc(db, this.COLLECTION_NAME, delivery.webhookId));
      if (!webhookDoc.exists()) {
        // Webhook wurde gelöscht, markiere Delivery als failed
        await this.updateDeliveryStatus(delivery.id!, 'failed', {
          message: 'Webhook wurde gelöscht'
        });
        return;
      }

      const webhook = { id: delivery.webhookId, ...webhookDoc.data() } as WebhookConfig;

      // Update attempt count
      delivery.attempt++;
      delivery.payload.webhook.attempt = delivery.attempt;

      // Sende Webhook
      const response = await this.deliverWebhook(
        webhook.url,
        delivery.payload,
        webhook.secret
      );

      if (response.success) {
        // Erfolg
        await this.updateDeliveryStatus(delivery.id!, 'success', undefined, response);
      } else {
        // Fehler - prüfe ob Retry möglich
        if (delivery.attempt < webhook.retryPolicy.maxAttempts) {
          // Berechne nächsten Retry-Zeitpunkt
          const delay = this.calculateRetryDelay(
            delivery.attempt,
            webhook.retryPolicy
          );
          const nextRetryAt = new Date(Date.now() + delay);
          
          await this.updateDeliveryStatus(
            delivery.id!,
            'failed',
            response.error,
            response,
            nextRetryAt
          );
        } else {
          // Max Retries erreicht
          await this.updateDeliveryStatus(
            delivery.id!,
            'failed',
            response.error,
            response
          );
        }
      }
    } catch (error) {
      console.error('Error processing delivery:', error);
      await this.updateDeliveryStatus(delivery.id!, 'failed', {
        message: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  }

  /**
   * Sendet einen Webhook
   */
  private async deliverWebhook(
    url: string,
    payload: WebhookPayload,
    secret?: string
  ): Promise<{
    success: boolean;
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
    error?: { message: string; code?: string };
  }> {
    try {
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'CeleroPress-Webhook/1.0',
        'X-Webhook-Event': payload.event,
        'X-Webhook-ID': payload.webhookId,
        'X-Event-ID': payload.eventId
      };

      // Füge Signature hinzu wenn Secret vorhanden
      if (secret) {
        const signature = this.generateSignature(body, secret);
        headers['X-Webhook-Signature'] = signature;
      }

      // Sende Request
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT_MS)
      });

      const responseText = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          headers: responseHeaders,
          body: responseText
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          headers: responseHeaders,
          body: responseText,
          error: {
            message: `HTTP ${response.status}: ${response.statusText}`,
            code: `HTTP_${response.status}`
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unbekannter Fehler',
          code: 'DELIVERY_FAILED'
        }
      };
    }
  }

  /**
   * Generiert eine Webhook-Signatur
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verifiziert eine Webhook-Signatur
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    
    try {
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);
      
      // Ensure buffers are same length
      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generiert ein zufälliges Webhook-Secret
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validiert Webhook-Daten
   */
  private validateWebhookData(data: APIWebhookCreateRequest): void {
    if (!data.name?.trim()) {
      throw new APIError('VALIDATION_ERROR', 'Name ist erforderlich');
    }

    if (!data.url?.trim()) {
      throw new APIError('VALIDATION_ERROR', 'URL ist erforderlich');
    }

    // Validiere URL-Format
    try {
      const url = new URL(data.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Nur HTTP/HTTPS URLs erlaubt');
      }
    } catch {
      throw new APIError('INVALID_URL', 'Ungültiges URL-Format');
    }

    if (!data.events || data.events.length === 0) {
      throw new APIError('INVALID_EVENTS', 'Mindestens ein Event muss ausgewählt werden');
    }
  }

  /**
   * Prüft ob ein Webhook-Duplikat existiert
   */
  private async findDuplicateWebhook(
    url: string,
    events: WebhookEvent[],
    organizationId: string
  ): Promise<WebhookConfig | null> {
    try {
      // Safe check für db
      if (!db) {
        return null; // Keine Duplikate prüfbar, fahre fort
      }

      const webhooksQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('organizationId', '==', organizationId),
        where('url', '==', url)
      );

      const snapshot = await getDocs(webhooksQuery);
    
      for (const doc of snapshot.docs) {
        const webhook = { id: doc.id, ...doc.data() } as WebhookConfig;
        // Prüfe ob die Events überlappen
        const hasOverlap = webhook.events.some(e => events.includes(e));
        if (hasOverlap) {
          return webhook;
        }
      }

      return null;
    } catch (error) {
      console.warn('Warning: Could not check webhook duplicates:', error);
      return null; // Bei Fehler fahre fort ohne Duplikat-Check
    }
  }

  /**
   * Prüft ob Daten die Webhook-Filter passieren
   */
  private passesFilters(webhook: WebhookConfig, data: any): boolean {
    if (!webhook.filters) return true;

    // Entity ID Filter
    if (webhook.filters.entityIds && webhook.filters.entityIds.length > 0) {
      if (!webhook.filters.entityIds.includes(data.id)) {
        return false;
      }
    }

    // Tag Filter
    if (webhook.filters.tags && webhook.filters.tags.length > 0) {
      const dataTags = data.tags || [];
      const hasMatchingTag = webhook.filters.tags.some(tag => 
        dataTags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Custom Filter würde hier evaluiert werden
    // ...

    return true;
  }

  /**
   * Erstellt einen Delivery-Eintrag
   */
  private async createDelivery(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<void> {
    const delivery: Omit<WebhookDelivery, 'id'> = {
      webhookId: webhook.id!,
      webhookUrl: webhook.url,
      event: payload.event,
      eventId: payload.eventId,
      payload,
      status: 'pending',
      attempt: 0,
      scheduledAt: Timestamp.now(),
      nextRetryAt: Timestamp.now(),
      organizationId: webhook.organizationId
    };

    await addDoc(collection(db, this.DELIVERIES_COLLECTION), delivery);
  }

  /**
   * Aktualisiert den Status einer Delivery
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    status: 'success' | 'failed',
    error?: any,
    response?: any,
    nextRetryAt?: Date
  ): Promise<void> {
    const updateData: any = {
      status,
      attempt: response?.attempt || 1
    };

    if (status === 'success') {
      updateData.deliveredAt = serverTimestamp();
    }

    if (error) {
      updateData.error = error;
    }

    if (response) {
      updateData.response = {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body?.substring(0, 1000), // Limitiere Body-Größe
        duration: response.duration
      };
    }

    if (nextRetryAt) {
      updateData.nextRetryAt = Timestamp.fromDate(nextRetryAt);
    }

    await updateDoc(doc(db, this.DELIVERIES_COLLECTION, deliveryId), updateData);
  }

  /**
   * Berechnet Retry-Delay mit exponential backoff
   */
  private calculateRetryDelay(
    attempt: number,
    retryPolicy: WebhookConfig['retryPolicy']
  ): number {
    const delay = Math.min(
      retryPolicy.initialDelayMs * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
      retryPolicy.maxDelayMs
    );
    
    // Füge etwas Jitter hinzu um Thundering Herd zu vermeiden
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Transformiert WebhookConfig zu API-Format
   */
  private async transformToAPIWebhook(webhook: WebhookConfig): Promise<APIWebhook> {
    // Hole Statistiken
    const stats = await this.getWebhookStatistics(webhook.id!);

    return {
      id: webhook.id!,
      name: webhook.name,
      description: webhook.description,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      retryPolicy: webhook.retryPolicy,
      timeoutMs: webhook.timeoutMs,
      filters: webhook.filters,
      statistics: {
        totalDeliveries: stats?.deliveries.total || 0,
        successfulDeliveries: stats?.deliveries.successful || 0,
        failedDeliveries: stats?.deliveries.failed || 0,
        successRate: stats?.deliveries.successRate || 0,
        avgResponseTime: stats?.performance.avgResponseTime,
        lastDeliveryAt: stats?.lastDeliveryAt?.toDate().toISOString(),
        lastSuccessAt: stats?.lastSuccessAt?.toDate().toISOString(),
        lastFailureAt: stats?.lastFailureAt?.toDate().toISOString()
      },
      createdAt: webhook.createdAt.toDate().toISOString(),
      updatedAt: webhook.updatedAt.toDate().toISOString()
    };
  }

  /**
   * Holt Statistiken für einen Webhook
   */
  private async getWebhookStatistics(webhookId: string): Promise<WebhookStatistics | null> {
    try {
      // Vereinfachte Statistiken für jetzt
      const deliveriesQuery = query(
        collection(db, this.DELIVERIES_COLLECTION),
        where('webhookId', '==', webhookId)
      );

      const snapshot = await getDocs(deliveriesQuery);
      const deliveries = snapshot.docs.map(doc => doc.data() as WebhookDelivery);

      const successful = deliveries.filter(d => d.status === 'success').length;
      const failed = deliveries.filter(d => d.status === 'failed').length;
      const pending = deliveries.filter(d => d.status === 'pending').length;

      return {
        webhookId,
        deliveries: {
          total: deliveries.length,
          successful,
          failed,
          pending,
          successRate: deliveries.length > 0 ? (successful / deliveries.length) * 100 : 0
        },
        performance: {
          avgResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0
        },
        eventBreakdown: [],
        errors: [],
        timeline: [],
        lastDeliveryAt: deliveries[0]?.scheduledAt,
        lastSuccessAt: deliveries.find(d => d.status === 'success')?.deliveredAt,
        lastFailureAt: deliveries.find(d => d.status === 'failed')?.scheduledAt,
        periodStart: Timestamp.now(),
        periodEnd: Timestamp.now()
      };
    } catch (error) {
      console.error('Error getting webhook statistics:', error);
      return null;
    }
  }
}

// Singleton Export
export const webhookService = new WebhookService();
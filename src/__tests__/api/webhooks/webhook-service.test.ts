// src/__tests__/api/webhooks/webhook-service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebhookService } from '@/lib/api/webhook-service';
import { 
  APIWebhookCreateRequest,
  WebhookEvent 
} from '@/types/api-webhooks';

// Mock Firebase
jest.mock('@/lib/firebase/build-safe-init', () => ({
  db: {}
}));

// Mock Firestore functions
const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockWriteBatch = jest.fn();
const mockServerTimestamp = jest.fn();

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
  writeBatch: mockWriteBatch,
  serverTimestamp: mockServerTimestamp,
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date: Date) => ({ toDate: () => date })
  }
}));

// Mock fetch für Webhook-Deliveries
global.fetch = jest.fn();

describe('WebhookService', () => {
  let webhookService: WebhookService;
  const testOrganizationId = 'test-org-123';
  const testUserId = 'test-user-456';

  beforeEach(() => {
    webhookService = new WebhookService();
    
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
    
    const mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue({})
    };
    mockWriteBatch.mockReturnValue(mockBatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    const validWebhookRequest: APIWebhookCreateRequest = {
      name: 'Test Webhook',
      description: 'Test webhook description',
      url: 'https://example.com/webhook',
      events: ['contact.created', 'contact.updated'] as WebhookEvent[],
      isActive: true
    };

    it('sollte einen Webhook erfolgreich erstellen', async () => {
      // Mock successful creation
      const mockWebhookRef = { id: 'webhook-123' };
      mockAddDoc.mockResolvedValue(mockWebhookRef);
      
      const mockWebhookDoc = {
        exists: () => true,
        data: () => ({
          name: validWebhookRequest.name,
          url: validWebhookRequest.url,
          events: validWebhookRequest.events,
          isActive: true,
          retryPolicy: {
            maxAttempts: 3,
            backoffMultiplier: 2,
            initialDelayMs: 1000,
            maxDelayMs: 60000
          },
          timeoutMs: 10000,
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })
      };
      mockGetDoc.mockResolvedValue(mockWebhookDoc);

      // Mock duplicate check
      mockGetDocs.mockResolvedValue({ docs: [] });

      const result = await webhookService.createWebhook(
        validWebhookRequest,
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.name).toBe(validWebhookRequest.name);
      expect(result.url).toBe(validWebhookRequest.url);
      expect(result.events).toEqual(validWebhookRequest.events);
      expect(result.isActive).toBe(true);
      
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    it('sollte Fehler bei ungültiger URL werfen', async () => {
      const invalidRequest = {
        ...validWebhookRequest,
        url: 'invalid-url'
      };

      await expect(
        webhookService.createWebhook(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Ungültiges URL-Format');
    });

    it('sollte Fehler bei fehlenden Events werfen', async () => {
      const invalidRequest = {
        ...validWebhookRequest,
        events: []
      };

      await expect(
        webhookService.createWebhook(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Mindestens ein Event muss ausgewählt werden');
    });

    it('sollte Fehler bei fehlendem Namen werfen', async () => {
      const invalidRequest = {
        ...validWebhookRequest,
        name: ''
      };

      await expect(
        webhookService.createWebhook(invalidRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Name ist erforderlich');
    });

    it('sollte Duplikate erkennen und Fehler werfen', async () => {
      // Mock existing webhook
      const existingWebhook = {
        id: 'existing-123',
        url: validWebhookRequest.url,
        events: validWebhookRequest.events
      };
      
      mockGetDocs.mockResolvedValue({
        docs: [{
          id: existingWebhook.id,
          data: () => existingWebhook
        }]
      });

      await expect(
        webhookService.createWebhook(validWebhookRequest, testOrganizationId, testUserId)
      ).rejects.toThrow('Ein Webhook mit dieser URL und diesen Events existiert bereits');
    });
  });

  describe('getWebhooks', () => {
    it('sollte alle Webhooks einer Organisation zurückgeben', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          name: 'Webhook 1',
          url: 'https://example.com/webhook1',
          events: ['contact.created'],
          isActive: true,
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        },
        {
          id: 'webhook-2',
          name: 'Webhook 2',
          url: 'https://example.com/webhook2',
          events: ['contact.updated'],
          isActive: false,
          organizationId: testOrganizationId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockWebhooks.map(webhook => ({
          id: webhook.id,
          data: () => webhook
        }))
      });

      const result = await webhookService.getWebhooks(testOrganizationId, {
        page: 1,
        limit: 10
      });

      expect(result.webhooks).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.hasNext).toBe(false);

      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it('sollte Webhooks nach Status filtern', async () => {
      const activeWebhook = {
        id: 'webhook-1',
        name: 'Active Webhook',
        isActive: true,
        organizationId: testOrganizationId,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      };

      mockGetDocs.mockResolvedValue({
        docs: [{
          id: activeWebhook.id,
          data: () => activeWebhook
        }]
      });

      const result = await webhookService.getWebhooks(testOrganizationId, {
        isActive: true
      });

      expect(result.webhooks).toHaveLength(1);
      expect(result.webhooks[0].isActive).toBe(true);
    });

    it('sollte Pagination korrekt implementieren', async () => {
      const mockWebhooks = Array.from({ length: 15 }, (_, i) => ({
        id: `webhook-${i}`,
        name: `Webhook ${i}`,
        organizationId: testOrganizationId,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      }));

      mockGetDocs.mockResolvedValue({
        docs: mockWebhooks.map(webhook => ({
          id: webhook.id,
          data: () => webhook
        }))
      });

      const result = await webhookService.getWebhooks(testOrganizationId, {
        page: 2,
        limit: 10
      });

      expect(result.webhooks).toHaveLength(5); // Remaining items on page 2
      expect(result.page).toBe(2);
      expect(result.hasNext).toBe(false);
    });
  });

  describe('getWebhookById', () => {
    const webhookId = 'webhook-123';

    it('sollte einen einzelnen Webhook zurückgeben', async () => {
      const mockWebhook = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        organizationId: testOrganizationId,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWebhook
      });

      const result = await webhookService.getWebhookById(webhookId, testOrganizationId);

      expect(result).toBeDefined();
      expect(result.id).toBe(webhookId);
      expect(result.name).toBe(mockWebhook.name);
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    it('sollte Fehler werfen wenn Webhook nicht existiert', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      await expect(
        webhookService.getWebhookById(webhookId, testOrganizationId)
      ).rejects.toThrow('Webhook nicht gefunden');
    });

    it('sollte Fehler werfen wenn Webhook zu anderer Organisation gehört', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          organizationId: 'other-org'
        })
      });

      await expect(
        webhookService.getWebhookById(webhookId, testOrganizationId)
      ).rejects.toThrow('Webhook nicht gefunden');
    });
  });

  describe('updateWebhook', () => {
    const webhookId = 'webhook-123';
    
    it('sollte einen Webhook erfolgreich aktualisieren', async () => {
      // Mock existing webhook
      const existingWebhook = {
        id: webhookId,
        name: 'Old Name',
        url: 'https://example.com/old',
        events: ['contact.created'],
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000,
          maxDelayMs: 60000
        },
        organizationId: testOrganizationId,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      };

      // Mock getWebhookById for existing check
      jest.spyOn(webhookService, 'getWebhookById')
        .mockResolvedValueOnce(existingWebhook as any)
        .mockResolvedValueOnce({
          ...existingWebhook,
          name: 'New Name',
          url: 'https://example.com/new'
        } as any);

      mockUpdateDoc.mockResolvedValue({});

      const updateData = {
        name: 'New Name',
        url: 'https://example.com/new'
      };

      const result = await webhookService.updateWebhook(
        webhookId,
        updateData,
        testOrganizationId,
        testUserId
      );

      expect(result.name).toBe('New Name');
      expect(result.url).toBe('https://example.com/new');
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteWebhook', () => {
    const webhookId = 'webhook-123';

    it('sollte einen Webhook erfolgreich löschen', async () => {
      // Mock existing webhook
      const existingWebhook = {
        id: webhookId,
        organizationId: testOrganizationId
      };

      jest.spyOn(webhookService, 'getWebhookById')
        .mockResolvedValue(existingWebhook as any);

      // Mock deliveries query
      mockGetDocs.mockResolvedValue({ docs: [] });

      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue({})
      };
      mockWriteBatch.mockReturnValue(mockBatch);

      await webhookService.deleteWebhook(webhookId, testOrganizationId);

      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('testWebhook', () => {
    it('sollte einen Webhook erfolgreich testen', async () => {
      const webhookId = 'webhook-123';
      const testUrl = 'https://example.com/webhook';

      // Mock existing webhook
      jest.spyOn(webhookService, 'getWebhookById')
        .mockResolvedValue({ url: testUrl } as any);

      mockGetDoc.mockResolvedValue({
        data: () => ({ secret: 'test-secret' })
      });

      // Mock successful HTTP response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('OK'),
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await webhookService.testWebhook(
        {
          webhookId,
          event: 'contact.created'
        },
        testOrganizationId
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('sollte Fehler bei fehlgeschlagener HTTP-Anfrage behandeln', async () => {
      const testUrl = 'https://example.com/webhook';

      // Mock failed HTTP response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Error'),
        headers: new Map()
      });

      const result = await webhookService.testWebhook(
        {
          url: testUrl,
          event: 'contact.created'
        },
        testOrganizationId
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it('sollte Netzwerkfehler behandeln', async () => {
      const testUrl = 'https://example.com/webhook';

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await webhookService.testWebhook(
        {
          url: testUrl,
          event: 'contact.created'
        },
        testOrganizationId
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network error');
    });
  });

  describe('triggerEvent', () => {
    it('sollte Events für passende Webhooks triggern', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          url: 'https://example.com/webhook1',
          events: ['contact.created'],
          isActive: true,
          retryPolicy: {
            maxAttempts: 3,
            backoffMultiplier: 2,
            initialDelayMs: 1000,
            maxDelayMs: 60000
          }
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockWebhooks.map(webhook => ({
          id: webhook.id,
          data: () => webhook
        }))
      });

      mockAddDoc.mockResolvedValue({ id: 'delivery-123' });

      const testData = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com'
      };

      await webhookService.triggerEvent(
        'contact.created',
        testData,
        testOrganizationId,
        { userId: testUserId, source: 'api' }
      );

      expect(mockGetDocs).toHaveBeenCalledTimes(1);
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    it('sollte keine Events für inaktive Webhooks triggern', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          events: ['contact.created'],
          isActive: false // Inactive webhook
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockWebhooks.map(webhook => ({
          id: webhook.id,
          data: () => webhook
        }))
      });

      await webhookService.triggerEvent(
        'contact.created',
        { id: 'test' },
        testOrganizationId
      );

      expect(mockAddDoc).not.toHaveBeenCalled();
    });
  });

  describe('verifySignature', () => {
    it('sollte gültige Signaturen verifizieren', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const validSignature = 'sha256=8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b';

      const result = webhookService.verifySignature(payload, validSignature, secret);
      expect(result).toBe(true);
    });

    it('sollte ungültige Signaturen ablehnen', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const invalidSignature = 'sha256=invalid';

      const result = webhookService.verifySignature(payload, invalidSignature, secret);
      expect(result).toBe(false);
    });
  });
});
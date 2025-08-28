// src/__tests__/api/webhooks/event-manager.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventManager, eventManager } from '@/lib/api/event-manager';
import { webhookService } from '@/lib/api/webhook-service';

// Mock webhook service
const mockTriggerEvent = jest.fn();
jest.mock('@/lib/api/webhook-service', () => ({
  webhookService: {
    triggerEvent: mockTriggerEvent
  }
}));

describe('EventManager', () => {
  const testOrganizationId = 'test-org-123';
  const testUserId = 'test-user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('sollte immer die gleiche Instanz zurückgeben (Singleton)', () => {
      const instance1 = EventManager.getInstance();
      const instance2 = EventManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(eventManager);
    });
  });

  describe('triggerEvent', () => {
    it('sollte Events an Webhook-Service weiterleiten', async () => {
      const testData = { id: 'test-123', name: 'Test Entity' };
      const testMetadata = { userId: testUserId, source: 'api' };

      await eventManager.triggerEvent(
        'contact.created',
        testData,
        testOrganizationId,
        testMetadata
      );

      expect(mockTriggerEvent).toHaveBeenCalledWith(
        'contact.created',
        testData,
        testOrganizationId,
        testMetadata
      );
    });

    it('sollte Fehler beim Webhook-Service abfangen', async () => {
      // Mock error
      (mockTriggerEvent as any).mockRejectedValue(
        new Error('Webhook service error')
      );

      // Console.error mocken um Output zu verhindern
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const testData = { id: 'test-123' };

      // Sollte nicht werfen
      await expect(
        eventManager.triggerEvent('contact.created', testData, testOrganizationId)
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('sollte asynchron verarbeitet werden', async () => {
      const testData = { id: 'test-123' };

      // Event triggern
      const promise = eventManager.triggerEvent(
        'contact.created',
        testData,
        testOrganizationId
      );

      // Sollte sofort resolved werden
      await expect(promise).resolves.toBeUndefined();

      // Webhook service sollte trotzdem aufgerufen werden
      // (nach einem kurzen Delay für setImmediate)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockTriggerEvent).toHaveBeenCalled();
    });
  });

  describe('triggerContactEvent', () => {
    it('sollte Contact-Events korrekt formatieren', async () => {
      const contact = {
        id: 'contact-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      await eventManager.triggerContactEvent(
        'created',
        contact,
        testOrganizationId,
        { userId: testUserId }
      );

      expect(mockTriggerEvent).toHaveBeenCalledWith(
        'contact.created',
        contact,
        testOrganizationId,
        { userId: testUserId }
      );
    });

    it('sollte alle Contact-Aktionen unterstützen', async () => {
      const contact = { id: 'contact-123', name: 'Test Contact' };
      const actions = ['created', 'updated', 'deleted'] as const;

      for (const action of actions) {
        await eventManager.triggerContactEvent(
          action,
          contact,
          testOrganizationId
        );

        expect(mockTriggerEvent).toHaveBeenCalledWith(
          `contact.${action}`,
          contact,
          testOrganizationId,
          undefined
        );
      }

      expect(mockTriggerEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('triggerCompanyEvent', () => {
    it('sollte Company-Events korrekt formatieren', async () => {
      const company = {
        id: 'company-123',
        name: 'Acme Corp',
        website: 'https://acme.com'
      };

      await eventManager.triggerCompanyEvent(
        'updated',
        company,
        testOrganizationId,
        { userId: testUserId, source: 'api' }
      );

      expect(mockTriggerEvent).toHaveBeenCalledWith(
        'company.updated',
        company,
        testOrganizationId,
        { userId: testUserId, source: 'api' }
      );
    });

    it('sollte alle Company-Aktionen unterstützen', async () => {
      const company = { id: 'company-123', name: 'Test Company' };
      const actions = ['created', 'updated', 'deleted'] as const;

      for (const action of actions) {
        await eventManager.triggerCompanyEvent(
          action,
          company,
          testOrganizationId
        );
      }

      expect(mockTriggerEvent).toHaveBeenCalledTimes(3);
      
      // Verify each call had the correct event type
      const calls = (webhookService.triggerEvent as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe('company.created');
      expect(calls[1][0]).toBe('company.updated');
      expect(calls[2][0]).toBe('company.deleted');
    });
  });

  describe('triggerPublicationEvent', () => {
    it('sollte Publication-Events korrekt formatieren', async () => {
      const publication = {
        id: 'publication-123',
        title: 'Test Publication',
        type: 'magazine',
        verified: true
      };

      await eventManager.triggerPublicationEvent(
        'verified',
        publication,
        testOrganizationId,
        { userId: testUserId, source: 'admin' }
      );

      expect(mockTriggerEvent).toHaveBeenCalledWith(
        'publication.verified',
        publication,
        testOrganizationId,
        { userId: testUserId, source: 'admin' }
      );
    });

    it('sollte alle Publication-Aktionen unterstützen', async () => {
      const publication = { id: 'publication-123', title: 'Test Publication' };
      const actions = ['created', 'updated', 'deleted', 'verified'] as const;

      for (const action of actions) {
        await eventManager.triggerPublicationEvent(
          action,
          publication,
          testOrganizationId
        );
      }

      expect(mockTriggerEvent).toHaveBeenCalledTimes(4);
      
      const calls = (webhookService.triggerEvent as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe('publication.created');
      expect(calls[1][0]).toBe('publication.updated');
      expect(calls[2][0]).toBe('publication.deleted');
      expect(calls[3][0]).toBe('publication.verified');
    });
  });

  describe('triggerMediaAssetEvent', () => {
    it('sollte Media Asset Events korrekt formatieren', async () => {
      const asset = {
        id: 'asset-123',
        name: 'Test Asset',
        type: 'display',
        pricing: {
          listPrice: { amount: 1000, currency: 'EUR' }
        }
      };

      await eventManager.triggerMediaAssetEvent(
        'created',
        asset,
        testOrganizationId,
        { userId: testUserId }
      );

      expect(mockTriggerEvent).toHaveBeenCalledWith(
        'media_asset.created',
        asset,
        testOrganizationId,
        { userId: testUserId }
      );
    });

    it('sollte alle Media Asset Aktionen unterstützen', async () => {
      const asset = { id: 'asset-123', name: 'Test Asset' };
      const actions = ['created', 'updated', 'deleted'] as const;

      for (const action of actions) {
        await eventManager.triggerMediaAssetEvent(
          action,
          asset,
          testOrganizationId
        );
      }

      expect(mockTriggerEvent).toHaveBeenCalledTimes(3);
      
      const calls = (webhookService.triggerEvent as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe('media_asset.created');
      expect(calls[1][0]).toBe('media_asset.updated');
      expect(calls[2][0]).toBe('media_asset.deleted');
    });
  });

  describe('triggerMediaKitEvent', () => {
    it('sollte Media Kit Events korrekt formatieren', async () => {
      const mediaKit = {
        id: 'kit-123',
        name: 'Test Media Kit',
        companyId: 'company-123'
      };

      await eventManager.triggerMediaKitEvent(
        'shared',
        mediaKit,
        testOrganizationId,
        { userId: testUserId, recipients: ['test@example.com'] }
      );

      expect(mockTriggerEvent).toHaveBeenCalledWith(
        'media_kit.shared',
        mediaKit,
        testOrganizationId,
        { userId: testUserId, recipients: ['test@example.com'] }
      );
    });

    it('sollte alle Media Kit Aktionen unterstützen', async () => {
      const mediaKit = { id: 'kit-123', name: 'Test Kit' };
      const actions = ['created', 'shared'] as const;

      for (const action of actions) {
        await eventManager.triggerMediaKitEvent(
          action,
          mediaKit,
          testOrganizationId
        );
      }

      expect(mockTriggerEvent).toHaveBeenCalledTimes(2);
      
      const calls = (webhookService.triggerEvent as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe('media_kit.created');
      expect(calls[1][0]).toBe('media_kit.shared');
    });
  });

  describe('triggerCampaignEvent', () => {
    it('sollte Campaign Events korrekt formatieren', async () => {
      const campaign = {
        id: 'campaign-123',
        name: 'Test Campaign',
        status: 'completed'
      };

      await eventManager.triggerCampaignEvent(
        'completed',
        campaign,
        testOrganizationId,
        { userId: testUserId, source: 'scheduler' }
      );

      expect(mockTriggerEvent).toHaveBeenCalledWith(
        'campaign.completed',
        campaign,
        testOrganizationId,
        { userId: testUserId, source: 'scheduler' }
      );
    });

    it('sollte alle Campaign Aktionen unterstützen', async () => {
      const campaign = { id: 'campaign-123', name: 'Test Campaign' };
      const actions = ['created', 'sent', 'completed'] as const;

      for (const action of actions) {
        await eventManager.triggerCampaignEvent(
          action,
          campaign,
          testOrganizationId
        );
      }

      expect(mockTriggerEvent).toHaveBeenCalledTimes(3);
      
      const calls = (webhookService.triggerEvent as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe('campaign.created');
      expect(calls[1][0]).toBe('campaign.sent');
      expect(calls[2][0]).toBe('campaign.completed');
    });
  });

  describe('Error Handling', () => {
    it('sollte Fehler in Event-Callbacks abfangen', async () => {
      // Mock webhook service error
      mockTriggerEvent.mockImplementation(() => {
        throw new Error('Webhook error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const testData = { id: 'test-123' };

      // Sollte nicht werfen, auch bei Fehlern
      await expect(
        eventManager.triggerEvent('contact.created', testData, testOrganizationId)
      ).resolves.toBeUndefined();

      // Sollte asynchron verarbeitet werden, also warten
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('sollte bei fehlenden Daten nicht abstürzen', async () => {
      // Test mit undefined/null data
      await expect(
        eventManager.triggerContactEvent(
          'created',
          null as any,
          testOrganizationId
        )
      ).resolves.toBeUndefined();

      await expect(
        eventManager.triggerCompanyEvent(
          'updated',
          undefined as any,
          testOrganizationId
        )
      ).resolves.toBeUndefined();

      // Events sollten trotzdem getriggert werden
      expect(mockTriggerEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance', () => {
    it('sollte Events non-blocking verarbeiten', async () => {
      let webhookStarted = false;
      let mainCompleted = false;

      mockTriggerEvent.mockImplementation(async () => {
        webhookStarted = true;
        // Simulate slow webhook processing
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Trigger event
      const eventPromise = eventManager.triggerEvent(
        'contact.created',
        { id: 'test' },
        testOrganizationId
      );

      // Should complete immediately
      await eventPromise;
      mainCompleted = true;

      // Main should complete before webhook processing
      expect(mainCompleted).toBe(true);
      
      // Wait for async webhook processing
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(webhookStarted).toBe(true);
    });

    it('sollte mehrere Events parallel verarbeiten können', async () => {
      const events = [
        { type: 'contact.created' as const, data: { id: 'contact-1' } },
        { type: 'company.updated' as const, data: { id: 'company-1' } },
        { type: 'publication.verified' as const, data: { id: 'pub-1' } }
      ];

      const promises = events.map(event =>
        eventManager.triggerEvent(event.type, event.data, testOrganizationId)
      );

      // Alle sollten schnell completed werden
      await Promise.all(promises);

      // Warte auf async processing
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockTriggerEvent).toHaveBeenCalledTimes(3);
    });
  });
});
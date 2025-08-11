// src/__tests__/api/webhooks/webhook-types.test.ts
import { describe, it, expect } from '@jest/globals';
import { 
  WEBHOOK_EVENT_CATEGORIES,
  WebhookEvent 
} from '@/types/api-webhooks';

describe('Webhook Types', () => {
  describe('WEBHOOK_EVENT_CATEGORIES', () => {
    it('sollte alle erwarteten Kategorien enthalten', () => {
      expect(WEBHOOK_EVENT_CATEGORIES).toHaveProperty('contacts');
      expect(WEBHOOK_EVENT_CATEGORIES).toHaveProperty('companies');
      expect(WEBHOOK_EVENT_CATEGORIES).toHaveProperty('publications');
      expect(WEBHOOK_EVENT_CATEGORIES).toHaveProperty('media_assets');
      expect(WEBHOOK_EVENT_CATEGORIES).toHaveProperty('media_kits');
      expect(WEBHOOK_EVENT_CATEGORIES).toHaveProperty('campaigns');
    });

    it('sollte Contact-Events enthalten', () => {
      expect(WEBHOOK_EVENT_CATEGORIES.contacts).toContain('contact.created');
      expect(WEBHOOK_EVENT_CATEGORIES.contacts).toContain('contact.updated');
      expect(WEBHOOK_EVENT_CATEGORIES.contacts).toContain('contact.deleted');
    });

    it('sollte Company-Events enthalten', () => {
      expect(WEBHOOK_EVENT_CATEGORIES.companies).toContain('company.created');
      expect(WEBHOOK_EVENT_CATEGORIES.companies).toContain('company.updated');
      expect(WEBHOOK_EVENT_CATEGORIES.companies).toContain('company.deleted');
    });

    it('sollte Publication-Events enthalten', () => {
      expect(WEBHOOK_EVENT_CATEGORIES.publications).toContain('publication.created');
      expect(WEBHOOK_EVENT_CATEGORIES.publications).toContain('publication.updated');
      expect(WEBHOOK_EVENT_CATEGORIES.publications).toContain('publication.deleted');
      expect(WEBHOOK_EVENT_CATEGORIES.publications).toContain('publication.verified');
    });

    it('sollte Media Asset Events enthalten', () => {
      expect(WEBHOOK_EVENT_CATEGORIES.media_assets).toContain('media_asset.created');
      expect(WEBHOOK_EVENT_CATEGORIES.media_assets).toContain('media_asset.updated');
      expect(WEBHOOK_EVENT_CATEGORIES.media_assets).toContain('media_asset.deleted');
    });

    it('sollte Media Kit Events enthalten', () => {
      expect(WEBHOOK_EVENT_CATEGORIES.media_kits).toContain('media_kit.created');
      expect(WEBHOOK_EVENT_CATEGORIES.media_kits).toContain('media_kit.shared');
    });

    it('sollte Campaign Events enthalten', () => {
      expect(WEBHOOK_EVENT_CATEGORIES.campaigns).toContain('campaign.created');
      expect(WEBHOOK_EVENT_CATEGORIES.campaigns).toContain('campaign.sent');
      expect(WEBHOOK_EVENT_CATEGORIES.campaigns).toContain('campaign.completed');
    });
  });

  describe('Event Types', () => {
    it('sollte alle Events as valid WebhookEvent-Types behandeln', () => {
      const allEvents: WebhookEvent[] = [
        'contact.created',
        'contact.updated',
        'contact.deleted',
        'company.created',
        'company.updated',
        'company.deleted',
        'publication.created',
        'publication.updated',
        'publication.deleted',
        'publication.verified',
        'media_asset.created',
        'media_asset.updated',
        'media_asset.deleted',
        'media_kit.created',
        'media_kit.shared',
        'campaign.created',
        'campaign.sent',
        'campaign.completed'
      ];

      // Test that all events are valid TypeScript types
      allEvents.forEach(event => {
        expect(typeof event).toBe('string');
        expect(event).toMatch(/^[a-z_]+\.(created|updated|deleted|verified|shared|sent|completed)$/);
      });
    });

    it('sollte Event-Format korrekt validieren', () => {
      const validEvents = [
        'contact.created',
        'company.updated',
        'publication.verified'
      ];

      const invalidEvents = [
        'contact',
        'contact.',
        '.created',
        'CONTACT.CREATED',
        'contact.invalid_action'
      ];

      validEvents.forEach(event => {
        expect(event).toMatch(/^[a-z_]+\.(created|updated|deleted|verified|shared|sent|completed)$/);
      });

      invalidEvents.forEach(event => {
        expect(event).not.toMatch(/^[a-z_]+\.(created|updated|deleted|verified|shared|sent|completed)$/);
      });
    });
  });
});
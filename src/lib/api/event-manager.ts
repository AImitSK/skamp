// src/lib/api/event-manager.ts
import { webhookService } from './webhook-service';
import { WebhookEvent } from '@/types/api-webhooks';

/**
 * Event Manager
 * Zentrale Klasse für das Triggern von Webhook-Events
 */
export class EventManager {
  private static instance: EventManager;

  private constructor() {}

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Triggert ein Event mit automatischer Webhook-Benachrichtigung
   */
  async triggerEvent(
    event: WebhookEvent,
    data: any,
    organizationId: string,
    metadata?: {
      userId?: string;
      userEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      source?: string;
    }
  ): Promise<void> {
    try {
      // Triggere Webhooks asynchron (non-blocking)
      setImmediate(async () => {
        try {
          await webhookService.triggerEvent(event, data, organizationId, metadata);
        } catch (error) {
          console.error(`Error triggering webhooks for event ${event}:`, error);
        }
      });
    } catch (error) {
      // Events dürfen die Hauptoperation nie blockieren
      console.error(`Error in event manager for ${event}:`, error);
    }
  }

  /**
   * Triggert ein Contact-Event
   */
  async triggerContactEvent(
    action: 'created' | 'updated' | 'deleted',
    contact: any,
    organizationId: string,
    metadata?: any
  ): Promise<void> {
    const event = `contact.${action}` as WebhookEvent;
    await this.triggerEvent(event, contact, organizationId, metadata);
  }

  /**
   * Triggert ein Company-Event
   */
  async triggerCompanyEvent(
    action: 'created' | 'updated' | 'deleted',
    company: any,
    organizationId: string,
    metadata?: any
  ): Promise<void> {
    const event = `company.${action}` as WebhookEvent;
    await this.triggerEvent(event, company, organizationId, metadata);
  }

  /**
   * Triggert ein Publication-Event
   */
  async triggerPublicationEvent(
    action: 'created' | 'updated' | 'deleted' | 'verified',
    publication: any,
    organizationId: string,
    metadata?: any
  ): Promise<void> {
    const event = `publication.${action}` as WebhookEvent;
    await this.triggerEvent(event, publication, organizationId, metadata);
  }

  /**
   * Triggert ein Media Asset Event
   */
  async triggerMediaAssetEvent(
    action: 'created' | 'updated' | 'deleted',
    asset: any,
    organizationId: string,
    metadata?: any
  ): Promise<void> {
    const event = `media_asset.${action}` as WebhookEvent;
    await this.triggerEvent(event, asset, organizationId, metadata);
  }

  /**
   * Triggert ein Media Kit Event
   */
  async triggerMediaKitEvent(
    action: 'created' | 'shared',
    mediaKit: any,
    organizationId: string,
    metadata?: any
  ): Promise<void> {
    const event = `media_kit.${action}` as WebhookEvent;
    await this.triggerEvent(event, mediaKit, organizationId, metadata);
  }

  /**
   * Triggert ein Campaign-Event
   */
  async triggerCampaignEvent(
    action: 'created' | 'sent' | 'completed',
    campaign: any,
    organizationId: string,
    metadata?: any
  ): Promise<void> {
    const event = `campaign.${action}` as WebhookEvent;
    await this.triggerEvent(event, campaign, organizationId, metadata);
  }
}

// Singleton Export
export const eventManager = EventManager.getInstance();
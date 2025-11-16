import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { brandingService } from '@/lib/firebase/branding-service';
import type { EmailCampaignSend } from '@/types/email';
import type { MediaClipping } from '@/types/monitoring';
import type { BrandingSettings } from '@/types/branding';

/**
 * Raw Data für Report-Generierung
 */
export interface RawReportData {
  campaignId: string;
  organizationId: string;
  campaignTitle: string;
  sentAt: Date;
  sends: EmailCampaignSend[];
  clippings: MediaClipping[];
  branding: BrandingSettings | null;
}

/**
 * Data Collector für Monitoring Reports
 *
 * Sammelt alle benötigten Rohdaten aus Firestore:
 * - Campaign Metadaten
 * - Email Sends
 * - Media Clippings
 * - Branding Settings
 */
export class ReportDataCollector {
  /**
   * Sammelt alle Daten für einen Report
   *
   * @param campaignId - Campaign ID
   * @param organizationId - Organization ID
   * @returns Raw Report Data
   * @throws Error wenn Campaign nicht gefunden
   */
  async collect(
    campaignId: string,
    organizationId: string
  ): Promise<RawReportData> {
    // 1. Campaign laden
    const campaign = await prService.getById(campaignId);

    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    // 2. Parallel alle Daten laden
    const [sends, clippings, branding] = await Promise.all([
      this.collectSends(campaignId, organizationId),
      this.collectClippings(campaignId, organizationId),
      this.collectBranding(organizationId)
    ]);

    // 3. Daten zusammenführen
    return {
      campaignId,
      organizationId,
      campaignTitle: campaign.title || 'Monitoring Report',
      sentAt: campaign.sentAt?.toDate() || new Date(),
      sends,
      clippings,
      branding
    };
  }

  /**
   * Lädt alle Email Sends für Campaign
   */
  private async collectSends(
    campaignId: string,
    organizationId: string
  ): Promise<EmailCampaignSend[]> {
    try {
      return await emailCampaignService.getSends(campaignId, { organizationId });
    } catch (error) {
      console.warn('Fehler beim Laden der Email Sends:', error);
      return [];
    }
  }

  /**
   * Lädt alle Media Clippings für Campaign
   */
  private async collectClippings(
    campaignId: string,
    organizationId: string
  ): Promise<MediaClipping[]> {
    try {
      return await clippingService.getByCampaignId(campaignId, { organizationId });
    } catch (error) {
      console.warn('Fehler beim Laden der Clippings:', error);
      return [];
    }
  }

  /**
   * Lädt Branding Settings
   */
  private async collectBranding(
    organizationId: string
  ): Promise<BrandingSettings | null> {
    try {
      return await brandingService.getBrandingSettings(organizationId);
    } catch (error) {
      // Kein Branding vorhanden ist OK
      return null;
    }
  }
}

// Singleton Export
export const reportDataCollector = new ReportDataCollector();

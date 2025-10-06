import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

interface CronJobStatus {
  isEnabled: boolean;
  pausedAt?: Timestamp;
  pausedBy?: string;
  reason?: string;
}

class CrawlerControlService {
  private readonly CONFIG_DOC = 'system_config/crawler_config';

  /**
   * Cron Job Status (Feature Flag)
   */
  async getCronJobStatus(): Promise<CronJobStatus> {
    try {
      const configDoc = await adminDb.doc(this.CONFIG_DOC).get();

      if (!configDoc.exists) {
        // Default: Crawler ist aktiv
        return {
          isEnabled: true
        };
      }

      const data = configDoc.data()!;
      return {
        isEnabled: data.isEnabled ?? true,
        pausedAt: data.pausedAt as Timestamp,
        pausedBy: data.pausedBy,
        reason: data.pausedReason
      };
    } catch (error) {
      console.error('Error getting cron job status:', error);
      throw error;
    }
  }

  /**
   * Cron Job pausieren
   */
  async pauseCronJob(userId: string, reason: string): Promise<void> {
    try {
      await adminDb.doc(this.CONFIG_DOC).set({
        isEnabled: false,
        pausedAt: FieldValue.serverTimestamp(),
        pausedBy: userId,
        pausedReason: reason,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log('🛑 Cron Job pausiert von:', userId, '- Grund:', reason);
    } catch (error) {
      console.error('Error pausing cron job:', error);
      throw error;
    }
  }

  /**
   * Cron Job aktivieren
   */
  async resumeCronJob(userId: string): Promise<void> {
    try {
      await adminDb.doc(this.CONFIG_DOC).set({
        isEnabled: true,
        resumedAt: FieldValue.serverTimestamp(),
        resumedBy: userId,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log('✅ Cron Job aktiviert von:', userId);
    } catch (error) {
      console.error('Error resuming cron job:', error);
      throw error;
    }
  }

  /**
   * Manueller Crawler-Run (alle Orgs)
   */
  async triggerManualCrawl(): Promise<{ jobId: string; status: 'started' }> {
    const jobId = `manual_${Date.now()}`;

    try {
      // Start Crawler in Background via Cron Route
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      fetch(`${baseUrl}/api/cron/monitoring-crawler`, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${process.env.CRON_SECRET}`,
          'x-manual-trigger': 'true',
          'x-job-id': jobId
        }
      }).catch(err => {
        console.error('Error triggering manual crawl:', err);
      });

      console.log('🚀 Manual Crawler gestartet - Job ID:', jobId);

      return { jobId, status: 'started' };
    } catch (error) {
      console.error('Error triggering manual crawl:', error);
      throw error;
    }
  }

  /**
   * Manueller Crawler-Run (einzelne Org)
   */
  async triggerOrgCrawl(organizationId: string): Promise<{ jobId: string; status: 'started' }> {
    const jobId = `org_${organizationId}_${Date.now()}`;

    try {
      // Lade nur Tracker dieser Org
      const trackersSnapshot = await adminDb
        .collection('campaign_monitoring_trackers')
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      if (trackersSnapshot.empty) {
        throw new Error(`Keine aktiven Tracker für Organization ${organizationId} gefunden`);
      }

      // TODO: Trigger Crawler nur für diese Tracker
      // Für jetzt: Log + Return
      console.log(`🚀 Org Crawler gestartet für ${organizationId} - ${trackersSnapshot.size} Tracker - Job ID:`, jobId);

      // Crawler Logic würde hier die Tracker durchlaufen
      // Wir implementieren das in Phase 2

      return { jobId, status: 'started' };
    } catch (error) {
      console.error('Error triggering org crawl:', error);
      throw error;
    }
  }

  /**
   * Manueller Crawler-Run (einzelne Kampagne)
   */
  async triggerCampaignCrawl(campaignId: string): Promise<{ jobId: string; status: 'started' }> {
    const jobId = `campaign_${campaignId}_${Date.now()}`;

    try {
      // Lade Tracker für diese Kampagne
      const trackersSnapshot = await adminDb
        .collection('campaign_monitoring_trackers')
        .where('campaignId', '==', campaignId)
        .where('isActive', '==', true)
        .get();

      if (trackersSnapshot.empty) {
        throw new Error(`Kein aktiver Tracker für Kampagne ${campaignId} gefunden`);
      }

      const tracker = trackersSnapshot.docs[0].data();

      // TODO: Trigger Crawler nur für diesen Tracker
      // Für jetzt: Log + Return
      console.log(`🚀 Campaign Crawler gestartet für ${campaignId} - Job ID:`, jobId);

      // Crawler Logic würde hier den Tracker crawlen
      // Wir implementieren das in Phase 2

      return { jobId, status: 'started' };
    } catch (error) {
      console.error('Error triggering campaign crawl:', error);
      throw error;
    }
  }
}

export const crawlerControlService = new CrawlerControlService();

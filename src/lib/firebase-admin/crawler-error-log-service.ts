import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

interface ErrorLog {
  id: string;
  timestamp: Timestamp;
  type: 'rss_feed_error' | 'crawler_error' | 'channel_error';
  organizationId?: string;
  campaignId?: string;
  channelId?: string;
  errorMessage: string;
  stackTrace?: string;
  metadata?: any;
  createdAt: Timestamp;
}

interface ErrorLogInput {
  type: 'rss_feed_error' | 'crawler_error' | 'channel_error';
  organizationId?: string;
  campaignId?: string;
  channelId?: string;
  errorMessage: string;
  stackTrace?: string;
  metadata?: any;
}

class CrawlerErrorLogService {
  private readonly COLLECTION = 'crawler_error_logs';

  /**
   * Lädt Error Logs
   */
  async getErrorLogs(options?: {
    organizationId?: string;
    limit?: number;
    startAfter?: Timestamp;
  }): Promise<ErrorLog[]> {
    try {
      let query = adminDb
        .collection(this.COLLECTION)
        .orderBy('timestamp', 'desc');

      // Filter nach Organization
      if (options?.organizationId) {
        query = query.where('organizationId', '==', options.organizationId) as any;
      }

      // Limit
      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }

      // Pagination
      if (options?.startAfter) {
        query = query.startAfter(options.startAfter) as any;
      }

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ErrorLog[];
    } catch (error) {
      console.error('Error loading error logs:', error);
      throw error;
    }
  }

  /**
   * Erstellt Error Log Entry
   */
  async logError(errorData: ErrorLogInput): Promise<string> {
    try {
      const logEntry = {
        timestamp: FieldValue.serverTimestamp(),
        type: errorData.type,
        organizationId: errorData.organizationId,
        campaignId: errorData.campaignId,
        channelId: errorData.channelId,
        errorMessage: errorData.errorMessage,
        stackTrace: errorData.stackTrace,
        metadata: errorData.metadata,
        createdAt: FieldValue.serverTimestamp()
      };

      const docRef = await adminDb
        .collection(this.COLLECTION)
        .add(logEntry);

      console.log('📝 Error logged:', docRef.id, '-', errorData.type, '-', errorData.errorMessage);

      return docRef.id;
    } catch (error) {
      console.error('Error logging error:', error);
      throw error;
    }
  }

  /**
   * Bereinigt alte Logs (> 30 Tage)
   */
  async cleanupOldLogs(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffTimestamp = Timestamp.fromDate(thirtyDaysAgo);

      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .where('timestamp', '<', cutoffTimestamp)
        .get();

      if (snapshot.empty) {
        console.log('🧹 Keine alten Logs zum Löschen gefunden');
        return 0;
      }

      // Batch Delete
      const batch = adminDb.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`🧹 ${snapshot.size} alte Error Logs gelöscht`);
      return snapshot.size;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      throw error;
    }
  }

  /**
   * Lädt Error-Statistiken für ein Channel
   */
  async getChannelErrorStats(channelId: string): Promise<{
    totalErrors: number;
    last24Hours: number;
    lastError?: {
      timestamp: Timestamp;
      message: string;
    };
  }> {
    try {
      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .where('channelId', '==', channelId)
        .orderBy('timestamp', 'desc')
        .get();

      const totalErrors = snapshot.size;

      // Errors in letzten 24h
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const cutoff = Timestamp.fromDate(twentyFourHoursAgo);

      const recent = snapshot.docs.filter(doc => {
        const timestamp = doc.data().timestamp as Timestamp;
        return timestamp && timestamp.toMillis() > cutoff.toMillis();
      });

      const last24Hours = recent.length;

      // Letzter Fehler
      let lastError;
      if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0].data();
        lastError = {
          timestamp: lastDoc.timestamp as Timestamp,
          message: lastDoc.errorMessage
        };
      }

      return {
        totalErrors,
        last24Hours,
        lastError
      };
    } catch (error) {
      console.error('Error getting channel error stats:', error);
      throw error;
    }
  }
}

export const crawlerErrorLogService = new CrawlerErrorLogService();

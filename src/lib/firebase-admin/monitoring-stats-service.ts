import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';

interface SystemStats {
  totalActiveTrackers: number;
  totalArticlesFoundToday: number;
  totalArticlesFoundTotal: number;
  totalAutoConfirmed: number;
  totalPending: number;
  lastCrawlRun?: {
    timestamp: Timestamp;
    duration: number;
    trackersProcessed: number;
    articlesFound: number;
    status: 'success' | 'failed';
    errorMessage?: string;
  };
}

interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  activeTrackers: number;
  articlesFound: number;
  autoConfirmedRate: number;
  lastActivity?: Timestamp;
}

interface ChannelHealth {
  channelId: string;
  type: 'rss_feed' | 'google_news';
  url: string;
  publicationName: string;
  errorCount: number;
  lastError?: string;
  lastSuccess?: Timestamp;
  organizationId: string;
}

class MonitoringStatsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

  /**
   * Lädt aggregierte System-Statistiken
   */
  async getSystemStats(): Promise<SystemStats> {
    const cacheKey = 'system_stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Alle aktiven Tracker laden
      const trackersSnapshot = await adminDb
        .collection('campaign_monitoring_trackers')
        .where('isActive', '==', true)
        .get();

      const totalActiveTrackers = trackersSnapshot.size;

      // Alle Suggestions laden
      const suggestionsSnapshot = await adminDb
        .collection('monitoring_suggestions')
        .get();

      const allSuggestions = suggestionsSnapshot.docs.map(doc => doc.data());

      // Heute-Filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      const suggestionsToday = allSuggestions.filter(s => {
        const createdAt = s.createdAt as Timestamp;
        return createdAt && createdAt.toDate() >= today;
      });

      const totalArticlesFoundToday = suggestionsToday.length;
      const totalArticlesFoundTotal = allSuggestions.length;

      const confirmedSuggestions = allSuggestions.filter(s => s.status === 'confirmed');
      const totalAutoConfirmed = confirmedSuggestions.length;

      const pendingSuggestions = allSuggestions.filter(s => s.status === 'pending');
      const totalPending = pendingSuggestions.length;

      // Letzter Crawler Run (optional aus crawler_run_logs)
      let lastCrawlRun;
      const lastRunSnapshot = await adminDb
        .collection('crawler_run_logs')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!lastRunSnapshot.empty) {
        const lastRunData = lastRunSnapshot.docs[0].data();
        lastCrawlRun = {
          timestamp: lastRunData.timestamp as Timestamp,
          duration: lastRunData.duration || 0,
          trackersProcessed: lastRunData.trackersProcessed || 0,
          articlesFound: lastRunData.articlesFound || 0,
          status: lastRunData.status || 'success',
          errorMessage: lastRunData.errorMessage
        };
      }

      const stats: SystemStats = {
        totalActiveTrackers,
        totalArticlesFoundToday,
        totalArticlesFoundTotal,
        totalAutoConfirmed,
        totalPending,
        lastCrawlRun
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error loading system stats:', error);
      throw error;
    }
  }

  /**
   * Lädt Statistiken pro Organization
   */
  async getOrganizationStats(): Promise<OrganizationStats[]> {
    const cacheKey = 'organization_stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Alle Tracker gruppiert nach Organization
      const trackersSnapshot = await adminDb
        .collection('campaign_monitoring_trackers')
        .where('isActive', '==', true)
        .get();

      const trackersByOrg = new Map<string, any[]>();
      trackersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const orgId = data.organizationId;
        if (!trackersByOrg.has(orgId)) {
          trackersByOrg.set(orgId, []);
        }
        trackersByOrg.get(orgId)!.push({ id: doc.id, ...data });
      });

      // Suggestions pro Org
      const suggestionsSnapshot = await adminDb
        .collection('monitoring_suggestions')
        .get();

      const suggestionsByOrg = new Map<string, any[]>();
      suggestionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const orgId = data.organizationId;
        if (!suggestionsByOrg.has(orgId)) {
          suggestionsByOrg.set(orgId, []);
        }
        suggestionsByOrg.get(orgId)!.push(data);
      });

      // Organizations laden
      const orgStats: OrganizationStats[] = [];

      for (const [orgId, trackers] of trackersByOrg) {
        const orgSnapshot = await adminDb
          .collection('organizations')
          .doc(orgId)
          .get();

        const orgData = orgSnapshot.data();
        const orgName = orgData?.name || 'Unbekannt';

        const suggestions = suggestionsByOrg.get(orgId) || [];
        const confirmedSuggestions = suggestions.filter(s => s.status === 'confirmed');
        const autoConfirmedRate = suggestions.length > 0
          ? Math.round((confirmedSuggestions.length / suggestions.length) * 100)
          : 0;

        // Letzte Aktivität aus Suggestions
        let lastActivity: Timestamp | undefined;
        if (suggestions.length > 0) {
          const latestSuggestion = suggestions.reduce((latest, current) => {
            const currentTime = (current.createdAt as Timestamp)?.toMillis() || 0;
            const latestTime = (latest.createdAt as Timestamp)?.toMillis() || 0;
            return currentTime > latestTime ? current : latest;
          });
          lastActivity = latestSuggestion.createdAt as Timestamp;
        }

        orgStats.push({
          organizationId: orgId,
          organizationName: orgName,
          activeTrackers: trackers.length,
          articlesFound: suggestions.length,
          autoConfirmedRate,
          lastActivity
        });
      }

      this.setCache(cacheKey, orgStats);
      return orgStats;
    } catch (error) {
      console.error('Error loading organization stats:', error);
      throw error;
    }
  }

  /**
   * Lädt Channel Health Status
   */
  async getChannelHealth(): Promise<ChannelHealth[]> {
    const cacheKey = 'channel_health';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Alle Channels mit Fehlern
      const channelsSnapshot = await adminDb
        .collection('monitoring_channels')
        .get();

      const channelHealth: ChannelHealth[] = [];

      for (const doc of channelsSnapshot.docs) {
        const data = doc.data();

        // Fehler-Logs für diesen Channel
        const errorLogsSnapshot = await adminDb
          .collection('crawler_error_logs')
          .where('channelId', '==', doc.id)
          .orderBy('timestamp', 'desc')
          .limit(10)
          .get();

        const errorCount = errorLogsSnapshot.size;
        const lastError = !errorLogsSnapshot.empty
          ? errorLogsSnapshot.docs[0].data().errorMessage
          : undefined;

        channelHealth.push({
          channelId: doc.id,
          type: data.type || 'rss_feed',
          url: data.url || '',
          publicationName: data.publicationName || 'Unbekannt',
          errorCount,
          lastError,
          lastSuccess: data.lastSuccess as Timestamp,
          organizationId: data.organizationId
        });
      }

      // Sortiere nach Error Count (höchste zuerst)
      channelHealth.sort((a, b) => b.errorCount - a.errorCount);

      this.setCache(cacheKey, channelHealth);
      return channelHealth;
    } catch (error) {
      console.error('Error loading channel health:', error);
      throw error;
    }
  }

  /**
   * Cache Helper
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Cache leeren (z.B. nach Manual Trigger)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const monitoringStatsService = new MonitoringStatsService();

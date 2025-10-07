/**
 * Monitoring Crawler Service (Admin SDK)
 * Server-side Version für Cron Jobs
 */

import { adminDb } from '@/lib/firebase/admin-init';
import {
  CampaignMonitoringTracker,
  MonitoringSuggestion,
  MonitoringSource,
  SpamPattern
} from '@/types/monitoring';

/**
 * Lädt alle aktiven Tracker
 */
export async function getActiveTrackers(): Promise<CampaignMonitoringTracker[]> {
  try {
    const snapshot = await adminDb
      .collection('campaign_monitoring_trackers')
      .where('isActive', '==', true)
      .get();

    const now = new Date();

    // Filter nur aktive Tracker die noch nicht abgelaufen sind
    const trackers = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate() || now,
          endDate: data.endDate?.toDate() || now,
          createdAt: data.createdAt?.toDate() || now,
          updatedAt: data.updatedAt?.toDate() || now,
          lastCrawlAt: data.lastCrawlAt?.toDate(),
          nextCrawlAt: data.nextCrawlAt?.toDate(),
          channels: data.channels || []
        } as CampaignMonitoringTracker;
      })
      .filter(tracker => tracker.endDate > now);

    return trackers;
  } catch (error) {
    console.error('❌ Error loading active trackers:', error);
    throw error;
  }
}

/**
 * Lädt Kampagne by ID
 */
export async function getCampaign(campaignId: string): Promise<any | null> {
  try {
    const doc = await adminDb.collection('pr_campaigns').doc(campaignId).get();

    if (!doc.exists) return null;

    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error(`❌ Error loading campaign ${campaignId}:`, error);
    return null;
  }
}

/**
 * Lädt Spam Patterns für Kampagne
 */
export async function getSpamPatternsForCampaign(
  organizationId: string,
  campaignId: string
): Promise<SpamPattern[]> {
  try {
    // Globale Patterns
    const globalSnapshot = await adminDb
      .collection('spam_patterns')
      .where('organizationId', '==', organizationId)
      .where('scope', '==', 'global')
      .where('isActive', '==', true)
      .get();

    // Kampagnen-spezifische Patterns
    const campaignSnapshot = await adminDb
      .collection('spam_patterns')
      .where('organizationId', '==', organizationId)
      .where('scope', '==', 'campaign')
      .where('campaignId', '==', campaignId)
      .where('isActive', '==', true)
      .get();

    const patterns: SpamPattern[] = [
      ...globalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })),
      ...campaignSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }))
    ] as SpamPattern[];

    return patterns;
  } catch (error) {
    console.error('❌ Error loading spam patterns:', error);
    return [];
  }
}

/**
 * Prüft ob URL gegen Spam-Patterns matcht
 */
export async function checkForSpam(
  url: string,
  title: string,
  outletName: string,
  organizationId: string,
  campaignId: string
): Promise<{ isSpam: boolean; matchedPattern?: SpamPattern }> {
  const patterns = await getSpamPatternsForCampaign(organizationId, campaignId);

  for (const pattern of patterns) {
    let isMatch = false;

    switch (pattern.type) {
      case 'url_domain':
        isMatch = matchPattern(url, pattern);
        break;
      case 'keyword_title':
        isMatch = matchPattern(title, pattern);
        break;
      case 'outlet_name':
        isMatch = matchPattern(outletName, pattern);
        break;
    }

    if (isMatch) {
      // Increment match counter
      if (pattern.id) {
        await incrementSpamMatchCount(pattern.id);
      }

      console.log(`🚫 Spam detected: "${title}" matched pattern "${pattern.pattern}"`);

      return {
        isSpam: true,
        matchedPattern: pattern
      };
    }
  }

  return { isSpam: false };
}

/**
 * Pattern Matching Logik
 */
function matchPattern(text: string, pattern: SpamPattern): boolean {
  if (!text) return false;

  const textLower = text.toLowerCase();
  const patternLower = pattern.pattern.toLowerCase();

  if (pattern.isRegex) {
    try {
      const regex = new RegExp(patternLower, 'i');
      return regex.test(text);
    } catch (e) {
      console.error('Invalid regex pattern:', pattern.pattern);
      return false;
    }
  } else {
    return textLower.includes(patternLower);
  }
}

/**
 * Erhöht Spam Match Counter
 */
async function incrementSpamMatchCount(patternId: string): Promise<void> {
  try {
    const docRef = adminDb.collection('spam_patterns').doc(patternId);
    await docRef.update({
      timesMatched: (await docRef.get()).data()?.timesMatched + 1 || 1,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Failed to increment spam match count:', error);
  }
}

/**
 * Prüft ob Suggestion bereits existiert
 */
export async function findExistingSuggestion(
  campaignId: string,
  normalizedUrl: string
): Promise<{ exists: boolean; suggestionId?: string; suggestion?: MonitoringSuggestion }> {
  try {
    const snapshot = await adminDb
      .collection('monitoring_suggestions')
      .where('campaignId', '==', campaignId)
      .where('normalizedUrl', '==', normalizedUrl)
      .get();

    if (snapshot.empty) {
      return { exists: false };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      exists: true,
      suggestionId: doc.id,
      suggestion: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        foundAt: data.foundAt?.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
        autoConfirmedAt: data.autoConfirmedAt?.toDate(),
        spamMarkedAt: data.spamMarkedAt?.toDate()
      } as MonitoringSuggestion
    };
  } catch (error) {
    console.error('❌ Error finding existing suggestion:', error);
    return { exists: false };
  }
}

/**
 * Aktualisiert existierende Suggestion mit neuer Source
 */
export async function updateSuggestionWithNewSource(
  suggestionId: string,
  existing: MonitoringSuggestion,
  newSource: MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date },
  minMatchScore: number
): Promise<{ updated: boolean; autoConfirmed: boolean }> {
  try {
    const updatedSources = [...existing.sources, newSource];
    const avgScore = updatedSources.reduce((sum, s) => sum + s.matchScore, 0) / updatedSources.length;
    const highestScore = Math.max(...updatedSources.map(s => s.matchScore));

    const confidence = calculateConfidence(updatedSources.length, avgScore, highestScore);
    const shouldAutoConfirm = shouldAutoConfirmSuggestion(updatedSources.length, avgScore, highestScore, minMatchScore);

    await adminDb.collection('monitoring_suggestions').doc(suggestionId).update({
      sources: updatedSources,
      avgMatchScore: avgScore,
      highestMatchScore: highestScore,
      confidence,
      autoConfirmed: shouldAutoConfirm,
      status: shouldAutoConfirm ? 'auto_confirmed' : existing.status,
      updatedAt: new Date()
    });

    return {
      updated: true,
      autoConfirmed: shouldAutoConfirm && existing.status === 'pending'
    };
  } catch (error) {
    console.error('❌ Error updating suggestion:', error);
    return { updated: false, autoConfirmed: false };
  }
}

/**
 * Erstellt neue Suggestion
 */
export async function createSuggestion(
  tracker: CampaignMonitoringTracker,
  source: MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date },
  normalizedUrl: string,
  minMatchScore: number
): Promise<{ created: boolean; suggestionId?: string; autoConfirmed: boolean }> {
  try {
    const confidence = calculateConfidence(1, source.matchScore, source.matchScore);
    const shouldAutoConfirm = shouldAutoConfirmSuggestion(1, source.matchScore, source.matchScore, minMatchScore);

    const suggestionData: Omit<MonitoringSuggestion, 'id'> = {
      organizationId: tracker.organizationId,
      campaignId: tracker.campaignId,
      articleUrl: source.articleUrl,
      normalizedUrl,
      articleTitle: source.articleTitle,
      articleExcerpt: source.articleExcerpt,
      sources: [source],
      avgMatchScore: source.matchScore,
      highestMatchScore: source.matchScore,
      confidence,
      autoConfirmed: shouldAutoConfirm,
      status: shouldAutoConfirm ? 'auto_confirmed' : 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection('monitoring_suggestions').add(suggestionData);

    return {
      created: true,
      suggestionId: docRef.id,
      autoConfirmed: shouldAutoConfirm
    };
  } catch (error) {
    console.error('❌ Error creating suggestion:', error);
    return { created: false, autoConfirmed: false };
  }
}

/**
 * Erstellt Clipping aus Suggestion
 */
export async function createClippingFromSuggestion(
  suggestionId: string,
  suggestion: Omit<MonitoringSuggestion, 'id'>,
  tracker: CampaignMonitoringTracker
): Promise<string | null> {
  try {
    const campaign = await getCampaign(tracker.campaignId);

    if (!campaign) {
      console.error(`Campaign ${tracker.campaignId} not found for clipping creation`);
      return null;
    }

    const clippingData = {
      organizationId: tracker.organizationId,
      campaignId: tracker.campaignId,
      projectId: campaign.projectId,
      title: suggestion.articleTitle,
      url: suggestion.articleUrl,
      publishedAt: suggestion.sources[0].publishedAt || new Date(),
      outletName: suggestion.sources[0].sourceName,
      outletType: 'online' as const,
      sentiment: 'neutral' as const,
      detectionMethod: 'automated' as const,
      detectedAt: new Date(),
      createdBy: 'system-crawler',
      verifiedBy: 'system-auto-confirm',
      verifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const clippingRef = await adminDb.collection('media_clippings').add(clippingData);

    // Update Suggestion mit clippingId
    await adminDb.collection('monitoring_suggestions').doc(suggestionId).update({
      clippingId: clippingRef.id,
      autoConfirmedAt: new Date()
    });

    console.log(`✅ Auto-confirmed clipping created: ${clippingRef.id}`);

    return clippingRef.id;
  } catch (error) {
    console.error('❌ Error creating clipping:', error);
    return null;
  }
}

/**
 * Aktualisiert Tracker Channel (lastChecked, etc.)
 */
export async function updateTrackerChannel(
  trackerId: string,
  channelId: string,
  updates: {
    lastChecked?: Date;
    lastSuccess?: Date;
    errorCount?: number;
    lastError?: string;
    wasFound?: boolean;
    foundAt?: Date;
    isActive?: boolean;
    articlesFound?: number;
  }
): Promise<void> {
  try {
    const docRef = adminDb.collection('campaign_monitoring_trackers').doc(trackerId);
    const doc = await docRef.get();

    if (!doc.exists) return;

    const tracker = doc.data() as CampaignMonitoringTracker;

    const updatedChannels = tracker.channels.map(ch => {
      if (ch.id === channelId) {
        return { ...ch, ...updates };
      }
      return ch;
    });

    await docRef.update({
      channels: updatedChannels,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('❌ Error updating tracker channel:', error);
  }
}

/**
 * Aktualisiert Tracker Statistics
 */
export async function updateTrackerStats(
  trackerId: string,
  stats: {
    totalArticlesFound?: number;
    totalAutoConfirmed?: number;
    lastCrawlAt?: Date;
    nextCrawlAt?: Date;
  }
): Promise<void> {
  try {
    await adminDb.collection('campaign_monitoring_trackers').doc(trackerId).update({
      ...stats,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('❌ Error updating tracker stats:', error);
  }
}

/**
 * Deaktiviert abgelaufene Tracker
 */
export async function deactivateExpiredTrackers(): Promise<number> {
  try {
    const now = new Date();

    // Lade alle aktiven Tracker und prüfe endDate manuell
    const snapshot = await adminDb
      .collection('campaign_monitoring_trackers')
      .where('isActive', '==', true)
      .get();

    let deactivated = 0;

    for (const doc of snapshot.docs) {
      const endDate = doc.data().endDate?.toDate();

      // Prüfe ob abgelaufen
      if (endDate && endDate <= now) {
        await doc.ref.update({
          isActive: false,
          updatedAt: new Date()
        });
        deactivated++;
      }
    }

    if (deactivated > 0) {
      console.log(`⏰ Deactivated ${deactivated} expired trackers`);
    }

    return deactivated;
  } catch (error) {
    console.error('❌ Error deactivating expired trackers:', error);
    return 0;
  }
}

/**
 * Berechnet Confidence Level
 */
function calculateConfidence(
  sourceCount: number,
  avgScore: number,
  highestScore: number
): 'low' | 'medium' | 'high' | 'very_high' {
  if (sourceCount >= 3 && avgScore >= 80) return 'very_high';
  if (sourceCount >= 2 && avgScore >= 70) return 'high';
  if (sourceCount >= 2 || avgScore >= 80) return 'medium';
  return 'low';
}

/**
 * Entscheidet ob Auto-Confirm
 */
function shouldAutoConfirmSuggestion(
  sourceCount: number,
  avgScore: number,
  highestScore: number,
  minMatchScore: number
): boolean {
  // 2+ Quellen = Auto-Confirm
  if (sourceCount >= 2) return true;

  // 1 Quelle aber sehr hoher Score
  if (sourceCount === 1 && highestScore >= 85 && highestScore >= minMatchScore) {
    return true;
  }

  return false;
}

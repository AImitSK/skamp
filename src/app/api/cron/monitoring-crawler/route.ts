import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Parser from 'rss-parser';
import {
  CampaignMonitoringTracker,
  MonitoringSuggestion,
  MonitoringSource,
  MonitoringChannel,
  SpamPattern
} from '@/types/monitoring';
import { normalizeUrl } from '@/lib/utils/url-normalizer';
import { spamPatternService } from '@/lib/firebase/spam-pattern-service';

const parser = new Parser();

/**
 * Vercel Cron Job: Daily Monitoring Crawler
 *
 * Läuft täglich um 06:00 Uhr
 * - Lädt alle aktiven Campaign Monitoring Trackers
 * - Crawlt RSS Feeds und Google News
 * - Erstellt MonitoringSuggestions
 * - Auto-Import bei hoher Confidence
 */
export async function GET(request: NextRequest) {
  // Cron Secret Verification
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🤖 Starting daily monitoring crawler');

  try {
    // 1. Deaktiviere abgelaufene Tracker
    await deactivateExpiredTrackers();

    // 2. Lade alle aktiven Tracker
    const trackersQuery = query(
      collection(db, 'campaign_monitoring_trackers'),
      where('isActive', '==', true),
      where('endDate', '>', Timestamp.now())
    );

    const trackersSnapshot = await getDocs(trackersQuery);
    console.log(`📊 Found ${trackersSnapshot.size} active trackers`);

    let totalArticlesFound = 0;
    let totalAutoConfirmed = 0;

    // 3. Crawle jeden Tracker
    for (const trackerDoc of trackersSnapshot.docs) {
      const tracker = {
        id: trackerDoc.id,
        ...trackerDoc.data()
      } as CampaignMonitoringTracker;

      console.log(`🔍 Crawling tracker ${tracker.id} for campaign ${tracker.campaignId}`);

      const stats = await crawlTracker(tracker);
      totalArticlesFound += stats.articlesFound;
      totalAutoConfirmed += stats.autoConfirmed;
    }

    console.log(`✅ Crawler completed: ${totalArticlesFound} articles found, ${totalAutoConfirmed} auto-confirmed`);

    return NextResponse.json({
      success: true,
      trackersProcessed: trackersSnapshot.size,
      totalArticlesFound,
      totalAutoConfirmed
    });
  } catch (error) {
    console.error('❌ Crawler failed:', error);
    return NextResponse.json(
      { error: 'Crawler failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Crawlt einen einzelnen Tracker
 */
async function crawlTracker(tracker: CampaignMonitoringTracker): Promise<{
  articlesFound: number;
  autoConfirmed: number;
}> {
  let articlesFound = 0;
  let autoConfirmed = 0;

  // Lade Kampagnen-Daten für Keywords
  const campaignDoc = await getDocs(
    query(collection(db, 'pr_campaigns'), where('__name__', '==', tracker.campaignId))
  );

  if (campaignDoc.empty) {
    console.error(`Campaign ${tracker.campaignId} not found`);
    return { articlesFound: 0, autoConfirmed: 0 };
  }

  const campaign = campaignDoc.docs[0].data();
  const keywords = campaign.monitoringConfig?.keywords || [];
  const minMatchScore = campaign.monitoringConfig?.minMatchScore || 70;

  // Lade Spam Patterns
  const spamPatterns = await spamPatternService.getPatternsForCampaign(
    tracker.organizationId,
    tracker.campaignId
  );

  // Crawle jeden aktiven Channel
  for (const channel of tracker.channels) {
    if (!channel.isActive) continue;

    try {
      let sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Timestamp }> = [];

      // RSS Feed Crawling
      if (channel.type === 'rss_feed') {
        sources = await crawlRssFeed(channel, keywords);
      }

      // Google News Crawling
      if (channel.type === 'google_news') {
        sources = await crawlGoogleNews(channel, keywords);
      }

      // Verarbeite gefundene Artikel
      for (const source of sources) {
        const result = await processSuggestion(
          tracker,
          source,
          spamPatterns,
          minMatchScore
        );

        if (result.created) {
          articlesFound++;

          if (result.autoConfirmed) {
            autoConfirmed++;

            // Markiere Channel als gefunden und deaktiviere
            await markChannelAsFound(tracker.id!, channel.id);
          }
        }
      }

      // Update Channel lastChecked
      await updateChannelLastChecked(tracker.id!, channel.id);

    } catch (error) {
      console.error(`Error crawling channel ${channel.id}:`, error);
      await updateChannelError(tracker.id!, channel.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Update Tracker Statistics
  await updateDoc(doc(db, 'campaign_monitoring_trackers', tracker.id!), {
    totalArticlesFound: (tracker.totalArticlesFound || 0) + articlesFound,
    totalAutoConfirmed: (tracker.totalAutoConfirmed || 0) + autoConfirmed,
    lastCrawlAt: Timestamp.now(),
    nextCrawlAt: calculateNextCrawl(),
    updatedAt: Timestamp.now()
  });

  return { articlesFound, autoConfirmed };
}

/**
 * Crawlt RSS Feed
 */
async function crawlRssFeed(
  channel: MonitoringChannel,
  keywords: string[]
): Promise<Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Timestamp }>> {
  const sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Timestamp }> = [];

  try {
    const feed = await parser.parseURL(channel.url);

    for (const item of feed.items) {
      if (!item.link || !item.title) continue;

      // Keyword Matching
      const matchScore = calculateMatchScore(item.title, item.contentSnippet || '', keywords);

      if (matchScore >= 50) { // Mindest-Score für Aufnahme
        sources.push({
          type: 'rss_feed',
          sourceName: channel.publicationName,
          sourceId: channel.publicationId,
          sourceUrl: channel.url,
          matchScore,
          matchedKeywords: findMatchedKeywords(item.title, item.contentSnippet || '', keywords),
          foundAt: Timestamp.now(),
          publicationId: channel.publicationId,
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? Timestamp.fromDate(new Date(item.pubDate)) : undefined
        });
      }
    }
  } catch (error) {
    console.error(`RSS Feed parsing failed for ${channel.url}:`, error);
    throw error;
  }

  return sources;
}

/**
 * Crawlt Google News
 */
async function crawlGoogleNews(
  channel: MonitoringChannel,
  keywords: string[]
): Promise<Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Timestamp }>> {
  const sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Timestamp }> = [];

  try {
    // Google News RSS Feed URL ist bereits im Channel gespeichert
    const feed = await parser.parseURL(channel.url);

    for (const item of feed.items) {
      if (!item.link || !item.title) continue;

      // Keyword Matching
      const matchScore = calculateMatchScore(item.title, item.contentSnippet || '', keywords);

      // Google News: Höherer Mindest-Score (80 statt 50)
      if (matchScore >= 80) {
        sources.push({
          type: 'google_news',
          sourceName: 'Google News',
          sourceUrl: channel.url,
          matchScore,
          matchedKeywords: findMatchedKeywords(item.title, item.contentSnippet || '', keywords),
          foundAt: Timestamp.now(),
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? Timestamp.fromDate(new Date(item.pubDate)) : undefined
        });
      }
    }

    console.log(`📰 Google News: ${sources.length} articles found`);
  } catch (error) {
    console.error(`Google News crawling failed for ${channel.url}:`, error);
    throw error;
  }

  return sources;
}

/**
 * Verarbeitet Suggestion (prüft Spam, erstellt/updated Suggestion)
 */
async function processSuggestion(
  tracker: CampaignMonitoringTracker,
  source: MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Timestamp },
  spamPatterns: SpamPattern[],
  minMatchScore: number
): Promise<{ created: boolean; autoConfirmed: boolean }> {
  const normalized = normalizeUrl(source.articleUrl);

  // 1. Prüfe ob bereits vorhanden
  const existingQuery = query(
    collection(db, 'monitoring_suggestions'),
    where('campaignId', '==', tracker.campaignId),
    where('normalizedUrl', '==', normalized)
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    // Update: Füge Source hinzu
    const existingDoc = existingSnapshot.docs[0];
    const existing = existingDoc.data() as MonitoringSuggestion;

    const updatedSources = [...existing.sources, source];
    const avgScore = updatedSources.reduce((sum, s) => sum + s.matchScore, 0) / updatedSources.length;
    const highestScore = Math.max(...updatedSources.map(s => s.matchScore));

    // Berechne neue Confidence
    const confidence = calculateConfidence(updatedSources.length, avgScore, highestScore);
    const shouldAutoConfirm = shouldAutoConfirmSuggestion(updatedSources.length, avgScore, highestScore, minMatchScore);

    await updateDoc(existingDoc.ref, {
      sources: updatedSources,
      avgMatchScore: avgScore,
      highestMatchScore: highestScore,
      confidence,
      autoConfirmed: shouldAutoConfirm,
      status: shouldAutoConfirm ? 'auto_confirmed' : existing.status,
      updatedAt: Timestamp.now()
    });

    // Falls Auto-Confirm: Erstelle Clipping
    if (shouldAutoConfirm && existing.status === 'pending') {
      await createClippingFromSuggestion(existingDoc.id, { ...existing, sources: updatedSources }, tracker);
      return { created: false, autoConfirmed: true };
    }

    return { created: false, autoConfirmed: false };
  }

  // 2. Spam-Check
  const spamCheck = await spamPatternService.checkForSpam(
    source.articleUrl,
    source.articleTitle,
    source.sourceName,
    tracker.organizationId,
    tracker.campaignId
  );

  if (spamCheck.isSpam) {
    console.log(`🚫 Spam detected: ${source.articleUrl}`);
    return { created: false, autoConfirmed: false };
  }

  // 3. Erstelle neue Suggestion
  const confidence = calculateConfidence(1, source.matchScore, source.matchScore);
  const shouldAutoConfirm = shouldAutoConfirmSuggestion(1, source.matchScore, source.matchScore, minMatchScore);

  const suggestionData: Omit<MonitoringSuggestion, 'id'> = {
    organizationId: tracker.organizationId,
    campaignId: tracker.campaignId,
    articleUrl: source.articleUrl,
    normalizedUrl: normalized,
    articleTitle: source.articleTitle,
    articleExcerpt: source.articleExcerpt,
    sources: [source],
    avgMatchScore: source.matchScore,
    highestMatchScore: source.matchScore,
    confidence,
    autoConfirmed: shouldAutoConfirm,
    status: shouldAutoConfirm ? 'auto_confirmed' : 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const newDoc = await addDoc(collection(db, 'monitoring_suggestions'), suggestionData);

  // Falls Auto-Confirm: Erstelle Clipping
  if (shouldAutoConfirm) {
    await createClippingFromSuggestion(newDoc.id, suggestionData, tracker);
    return { created: true, autoConfirmed: true };
  }

  return { created: true, autoConfirmed: false };
}

/**
 * Berechnet Match Score basierend auf Keywords
 */
function calculateMatchScore(title: string, content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  let matchedCount = 0;

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();

    if (titleLower.includes(keywordLower)) {
      matchedCount += 2; // Titel-Match zählt doppelt
    } else if (contentLower.includes(keywordLower)) {
      matchedCount += 1;
    }
  }

  // Score: (matched / total) * 100
  const score = (matchedCount / (keywords.length * 2)) * 100;
  return Math.min(score, 100);
}

/**
 * Findet gematchte Keywords
 */
function findMatchedKeywords(title: string, content: string, keywords: string[]): string[] {
  const matched: string[] = [];
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();

    if (titleLower.includes(keywordLower) || contentLower.includes(keywordLower)) {
      matched.push(keyword);
    }
  }

  return matched;
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

/**
 * Erstellt Clipping aus Suggestion
 */
async function createClippingFromSuggestion(
  suggestionId: string,
  suggestion: Omit<MonitoringSuggestion, 'id'>,
  tracker: CampaignMonitoringTracker
): Promise<void> {
  // Lade Kampagne für projectId
  const campaignQuery = query(
    collection(db, 'pr_campaigns'),
    where('__name__', '==', tracker.campaignId)
  );
  const campaignSnapshot = await getDocs(campaignQuery);

  if (campaignSnapshot.empty) {
    console.error(`Campaign ${tracker.campaignId} not found for clipping creation`);
    return;
  }

  const campaign = campaignSnapshot.docs[0].data();

  const clippingData = {
    organizationId: tracker.organizationId,
    campaignId: tracker.campaignId,
    projectId: campaign?.projectId,
    title: suggestion.articleTitle,
    url: suggestion.articleUrl,
    publishedAt: suggestion.sources[0].publishedAt || Timestamp.now(),
    outletName: suggestion.sources[0].sourceName,
    outletType: 'online' as const,
    sentiment: 'neutral' as const,
    detectionMethod: 'automated' as const,
    detectedAt: Timestamp.now(),
    createdBy: 'system-crawler',
    verifiedBy: 'system-auto-confirm',
    verifiedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const clippingRef = await addDoc(collection(db, 'media_clippings'), clippingData);

  // Update Suggestion mit clippingId
  await updateDoc(doc(db, 'monitoring_suggestions', suggestionId), {
    clippingId: clippingRef.id,
    autoConfirmedAt: Timestamp.now()
  });

  console.log(`✅ Auto-confirmed clipping created: ${clippingRef.id}`);
}

/**
 * Markiert Channel als gefunden und deaktiviert ihn
 */
async function markChannelAsFound(trackerId: string, channelId: string): Promise<void> {
  const trackerDoc = await getDocs(
    query(collection(db, 'campaign_monitoring_trackers'), where('__name__', '==', trackerId))
  );

  if (trackerDoc.empty) return;

  const tracker = trackerDoc.docs[0].data() as CampaignMonitoringTracker;

  const updatedChannels = tracker.channels.map(ch => {
    if (ch.id === channelId) {
      return {
        ...ch,
        wasFound: true,
        foundAt: Timestamp.now(),
        isActive: false, // Deaktiviere Channel nach Fund
        articlesFound: ch.articlesFound + 1
      };
    }
    return ch;
  });

  await updateDoc(trackerDoc.docs[0].ref, {
    channels: updatedChannels,
    updatedAt: Timestamp.now()
  });
}

/**
 * Update Channel lastChecked
 */
async function updateChannelLastChecked(trackerId: string, channelId: string): Promise<void> {
  const trackerDoc = await getDocs(
    query(collection(db, 'campaign_monitoring_trackers'), where('__name__', '==', trackerId))
  );

  if (trackerDoc.empty) return;

  const tracker = trackerDoc.docs[0].data() as CampaignMonitoringTracker;

  const updatedChannels = tracker.channels.map(ch => {
    if (ch.id === channelId) {
      return {
        ...ch,
        lastChecked: Timestamp.now(),
        lastSuccess: Timestamp.now()
      };
    }
    return ch;
  });

  await updateDoc(trackerDoc.docs[0].ref, {
    channels: updatedChannels,
    updatedAt: Timestamp.now()
  });
}

/**
 * Update Channel Error
 */
async function updateChannelError(trackerId: string, channelId: string, error: string): Promise<void> {
  const trackerDoc = await getDocs(
    query(collection(db, 'campaign_monitoring_trackers'), where('__name__', '==', trackerId))
  );

  if (trackerDoc.empty) return;

  const tracker = trackerDoc.docs[0].data() as CampaignMonitoringTracker;

  const updatedChannels = tracker.channels.map(ch => {
    if (ch.id === channelId) {
      return {
        ...ch,
        errorCount: ch.errorCount + 1,
        lastError: error,
        lastChecked: Timestamp.now()
      };
    }
    return ch;
  });

  await updateDoc(trackerDoc.docs[0].ref, {
    channels: updatedChannels,
    updatedAt: Timestamp.now()
  });
}

/**
 * Deaktiviert abgelaufene Tracker
 */
async function deactivateExpiredTrackers(): Promise<number> {
  const expiredQuery = query(
    collection(db, 'campaign_monitoring_trackers'),
    where('isActive', '==', true),
    where('endDate', '<=', Timestamp.now())
  );

  const snapshot = await getDocs(expiredQuery);
  let deactivated = 0;

  for (const docSnap of snapshot.docs) {
    await updateDoc(docSnap.ref, {
      isActive: false,
      updatedAt: Timestamp.now()
    });
    deactivated++;
  }

  if (deactivated > 0) {
    console.log(`⏰ Deactivated ${deactivated} expired trackers`);
  }

  return deactivated;
}

/**
 * Berechnet nächsten Crawl-Zeitpunkt
 */
function calculateNextCrawl(): Timestamp {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(6, 0, 0, 0); // 06:00 Uhr
  return Timestamp.fromDate(next);
}

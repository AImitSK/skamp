import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import {
  CampaignMonitoringTracker,
  MonitoringSource,
  MonitoringChannel
} from '@/types/monitoring';
import { normalizeUrl } from '@/lib/utils/url-normalizer';
import { crawlerControlService } from '@/lib/firebase-admin/crawler-control-service';
import {
  getActiveTrackers,
  getCampaign,
  checkForSpam,
  findExistingSuggestion,
  updateSuggestionWithNewSource,
  createSuggestion,
  createClippingFromSuggestion,
  updateTrackerChannel,
  updateTrackerStats,
  deactivateExpiredTrackers
} from '@/lib/firebase-admin/monitoring-crawler-service';

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
    // 🆕 FEATURE FLAG CHECK
    const crawlerStatus = await crawlerControlService.getCronJobStatus();
    if (!crawlerStatus.isEnabled) {
      console.log('⏸️ Crawler is paused. Skipping run.');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: crawlerStatus.reason || 'Crawler paused by admin',
        pausedBy: crawlerStatus.pausedBy,
        pausedAt: crawlerStatus.pausedAt?.toDate().toISOString()
      });
    }

    // 1. Deaktiviere abgelaufene Tracker (Admin SDK)
    await deactivateExpiredTrackers();

    // 2. Lade alle aktiven Tracker (Admin SDK)
    const trackers = await getActiveTrackers();
    console.log(`📊 Found ${trackers.length} active trackers`);

    let totalArticlesFound = 0;
    let totalAutoConfirmed = 0;

    // 3. Crawle jeden Tracker
    for (const tracker of trackers) {
      console.log(`🔍 Crawling tracker ${tracker.id} for campaign ${tracker.campaignId}`);

      const stats = await crawlTracker(tracker);
      totalArticlesFound += stats.articlesFound;
      totalAutoConfirmed += stats.autoConfirmed;
    }

    console.log(`✅ Crawler completed: ${totalArticlesFound} articles found, ${totalAutoConfirmed} auto-confirmed`);

    return NextResponse.json({
      success: true,
      trackersProcessed: trackers.length,
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

  // Lade Kampagnen-Daten für Keywords (Admin SDK)
  const campaign = await getCampaign(tracker.campaignId);

  if (!campaign) {
    console.error(`Campaign ${tracker.campaignId} not found`);
    return { articlesFound: 0, autoConfirmed: 0 };
  }

  const keywords = campaign.monitoringConfig?.keywords || [];
  const minMatchScore = campaign.monitoringConfig?.minMatchScore || 70;

  // Crawle jeden aktiven Channel
  for (const channel of tracker.channels) {
    if (!channel.isActive) continue;

    try {
      let sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date }> = [];

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
          minMatchScore
        );

        if (result.created) {
          articlesFound++;

          if (result.autoConfirmed) {
            autoConfirmed++;

            // Markiere Channel als gefunden und deaktiviere (Admin SDK)
            await updateTrackerChannel(tracker.id!, channel.id, {
              wasFound: true,
              foundAt: new Date(),
              isActive: false,
              articlesFound: channel.articlesFound + 1
            });
          }
        }
      }

      // Update Channel lastChecked (Admin SDK)
      await updateTrackerChannel(tracker.id!, channel.id, {
        lastChecked: new Date(),
        lastSuccess: new Date()
      });

    } catch (error) {
      console.error(`Error crawling channel ${channel.id}:`, error);
      // Update Channel Error (Admin SDK)
      await updateTrackerChannel(tracker.id!, channel.id, {
        errorCount: channel.errorCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      });
    }
  }

  // Update Tracker Statistics (Admin SDK)
  await updateTrackerStats(tracker.id!, {
    totalArticlesFound: (tracker.totalArticlesFound || 0) + articlesFound,
    totalAutoConfirmed: (tracker.totalAutoConfirmed || 0) + autoConfirmed,
    lastCrawlAt: new Date(),
    nextCrawlAt: calculateNextCrawl()
  });

  return { articlesFound, autoConfirmed };
}

/**
 * Crawlt RSS Feed
 */
async function crawlRssFeed(
  channel: MonitoringChannel,
  keywords: string[]
): Promise<Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date }>> {
  const sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date }> = [];

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
          foundAt: new Date(),
          publicationId: channel.publicationId,
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined
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
): Promise<Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date }>> {
  const sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date }> = [];

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
          foundAt: new Date(),
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined
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
 * Verarbeitet Suggestion (prüft Spam, erstellt/updated Suggestion) - Admin SDK
 */
async function processSuggestion(
  tracker: CampaignMonitoringTracker,
  source: MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date },
  minMatchScore: number
): Promise<{ created: boolean; autoConfirmed: boolean }> {
  const normalized = normalizeUrl(source.articleUrl);

  // 1. Prüfe ob bereits vorhanden (Admin SDK)
  const existing = await findExistingSuggestion(tracker.campaignId, normalized);

  if (existing.exists && existing.suggestion && existing.suggestionId) {
    // Update: Füge Source hinzu (Admin SDK)
    const result = await updateSuggestionWithNewSource(
      existing.suggestionId,
      existing.suggestion,
      source,
      minMatchScore
    );

    // Falls Auto-Confirm: Erstelle Clipping
    if (result.autoConfirmed) {
      await createClippingFromSuggestion(
        existing.suggestionId,
        { ...existing.suggestion, sources: [...existing.suggestion.sources, source] },
        tracker
      );
      return { created: false, autoConfirmed: true };
    }

    return { created: false, autoConfirmed: result.updated ? false : false };
  }

  // 2. Spam-Check (Admin SDK)
  const spamCheck = await checkForSpam(
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

  // 3. Erstelle neue Suggestion (Admin SDK)
  const result = await createSuggestion(tracker, source, normalized, minMatchScore);

  // Falls Auto-Confirm: Erstelle Clipping
  if (result.created && result.autoConfirmed && result.suggestionId) {
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
      confidence: 'medium' as const,
      autoConfirmed: true,
      status: 'auto_confirmed',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await createClippingFromSuggestion(result.suggestionId, suggestionData, tracker);
  }

  return { created: result.created, autoConfirmed: result.autoConfirmed };
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
 * Berechnet nächsten Crawl-Zeitpunkt
 */
function calculateNextCrawl(): Date {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(6, 0, 0, 0); // 06:00 Uhr
  return next;
}

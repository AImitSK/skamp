import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import {
  CampaignMonitoringTracker,
  MonitoringSource,
  MonitoringChannel,
  AutoConfirmResult
} from '@/types/monitoring';
import { normalizeUrl } from '@/lib/utils/url-normalizer';
import { crawlerControlService } from '@/lib/firebase-admin/crawler-control-service';
import {
  getActiveTrackers,
  checkForSpam,
  findExistingSuggestion,
  updateSuggestionWithNewSource,
  createSuggestionWithAutoConfirm,
  createClippingFromSuggestion,
  updateTrackerChannel,
  updateTrackerStats,
  deactivateExpiredTrackers
} from '@/lib/firebase-admin/monitoring-crawler-service';
import {
  getCompanyKeywordsForCampaign,
  checkAutoConfirm
} from '@/lib/firebase-admin/keyword-extraction-service';

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

  // 🆕 Plan 02: Keywords aus Company extrahieren (nicht mehr aus Campaign)
  const { companyKeywords, seoKeywords } = await getCompanyKeywordsForCampaign(tracker.campaignId);

  // Fallback-Check: Ohne Firmennamen kein Monitoring möglich
  if (companyKeywords.length === 0) {
    console.warn(`⚠️ No company keywords for campaign ${tracker.campaignId}, skipping tracker`);
    return { articlesFound: 0, autoConfirmed: 0 };
  }

  console.log(`🔑 Keywords: Company=[${companyKeywords.join(', ')}], SEO=[${seoKeywords.join(', ')}]`);

  // Crawle jeden aktiven Channel
  for (const channel of tracker.channels) {
    if (!channel.isActive) continue;

    try {
      let sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date; autoConfirmResult?: AutoConfirmResult }> = [];

      // RSS Feed Crawling
      if (channel.type === 'rss_feed') {
        sources = await crawlRssFeed(channel, companyKeywords, seoKeywords);
      }

      // Google News Crawling
      if (channel.type === 'google_news') {
        sources = await crawlGoogleNews(channel, companyKeywords, seoKeywords);
      }

      // Verarbeite gefundene Artikel
      for (const source of sources) {
        const result = await processSuggestion(
          tracker,
          source
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
 * 🆕 Plan 02: Verwendet neue Firmenname-basierte Matching-Logik
 */
async function crawlRssFeed(
  channel: MonitoringChannel,
  companyKeywords: string[],
  seoKeywords: string[]
): Promise<Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date; autoConfirmResult?: AutoConfirmResult }>> {
  const sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date; autoConfirmResult?: AutoConfirmResult }> = [];

  try {
    const feed = await parser.parseURL(channel.url);

    for (const item of feed.items) {
      if (!item.link || !item.title) continue;

      // 🆕 Plan 02: Prüfe zuerst ob Firmenname vorkommt
      const autoConfirmResult = checkAutoConfirm(
        { title: item.title, content: item.contentSnippet || '' },
        companyKeywords,
        seoKeywords
      );

      // Nur aufnehmen wenn Firmenname gefunden wurde
      if (autoConfirmResult.companyMatch.found) {
        sources.push({
          type: 'rss_feed',
          sourceName: channel.publicationName,
          sourceId: channel.publicationId,
          sourceUrl: channel.url,
          matchScore: autoConfirmResult.seoScore,
          matchedKeywords: autoConfirmResult.companyMatch.matchedKeyword
            ? [autoConfirmResult.companyMatch.matchedKeyword]
            : [],
          foundAt: new Date(),
          publicationId: channel.publicationId,
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
          autoConfirmResult
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
 * 🆕 Plan 02: Verwendet neue Firmenname-basierte Matching-Logik
 */
async function crawlGoogleNews(
  channel: MonitoringChannel,
  companyKeywords: string[],
  seoKeywords: string[]
): Promise<Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date; autoConfirmResult?: AutoConfirmResult }>> {
  const sources: Array<MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date; autoConfirmResult?: AutoConfirmResult }> = [];

  try {
    // Google News RSS Feed URL ist bereits im Channel gespeichert
    const feed = await parser.parseURL(channel.url);

    for (const item of feed.items) {
      if (!item.link || !item.title) continue;

      // 🆕 Plan 02: Prüfe zuerst ob Firmenname vorkommt
      const autoConfirmResult = checkAutoConfirm(
        { title: item.title, content: item.contentSnippet || '' },
        companyKeywords,
        seoKeywords
      );

      // Nur aufnehmen wenn Firmenname gefunden wurde
      if (autoConfirmResult.companyMatch.found) {
        sources.push({
          type: 'google_news',
          sourceName: 'Google News',
          sourceUrl: channel.url,
          matchScore: autoConfirmResult.seoScore,
          matchedKeywords: autoConfirmResult.companyMatch.matchedKeyword
            ? [autoConfirmResult.companyMatch.matchedKeyword]
            : [],
          foundAt: new Date(),
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
          autoConfirmResult
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
 * 🆕 Plan 02: Verwendet neue Auto-Confirm Logik basierend auf Firmennamen
 */
async function processSuggestion(
  tracker: CampaignMonitoringTracker,
  source: MonitoringSource & { articleUrl: string; articleTitle: string; articleExcerpt?: string; publishedAt?: Date; autoConfirmResult?: AutoConfirmResult }
): Promise<{ created: boolean; autoConfirmed: boolean }> {
  const normalized = normalizeUrl(source.articleUrl);

  // 1. Prüfe ob bereits vorhanden (Admin SDK)
  const existing = await findExistingSuggestion(tracker.campaignId, normalized);

  if (existing.exists && existing.suggestion && existing.suggestionId) {
    // Update: Füge Source hinzu (Admin SDK)
    // 🆕 Plan 02: Auto-Confirm basiert jetzt auf autoConfirmResult
    const shouldConfirm = source.autoConfirmResult?.shouldConfirm || false;

    const result = await updateSuggestionWithNewSource(
      existing.suggestionId,
      existing.suggestion,
      source,
      shouldConfirm,
      source.autoConfirmResult
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

    return { created: false, autoConfirmed: false };
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
  // 🆕 Plan 02: Auto-Confirm basiert jetzt auf autoConfirmResult
  const shouldAutoConfirm = source.autoConfirmResult?.shouldConfirm || false;
  const result = await createSuggestionWithAutoConfirm(
    tracker,
    source,
    normalized,
    shouldAutoConfirm,
    source.autoConfirmResult
  );

  // Falls Auto-Confirm: Erstelle Clipping
  if (result.created && result.autoConfirmed && result.suggestionId) {
    const { determineConfidence } = await import('@/lib/firebase-admin/keyword-extraction-service');

    const suggestionData = {
      organizationId: tracker.organizationId,
      campaignId: tracker.campaignId,
      articleUrl: source.articleUrl,
      normalizedUrl: normalized,
      articleTitle: source.articleTitle,
      articleExcerpt: source.articleExcerpt,
      sources: [source],
      avgMatchScore: source.matchScore,
      highestMatchScore: source.matchScore,
      confidence: determineConfidence(source.autoConfirmResult),
      autoConfirmed: true,
      status: 'auto_confirmed' as const,
      autoConfirmReason: source.autoConfirmResult?.reason,
      companyMatchInTitle: source.autoConfirmResult?.companyMatch.inTitle,
      matchedCompanyKeyword: source.autoConfirmResult?.companyMatch.matchedKeyword,
      seoScore: source.autoConfirmResult?.seoScore,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await createClippingFromSuggestion(result.suggestionId, suggestionData, tracker);
  }

  return { created: result.created, autoConfirmed: result.autoConfirmed };
}

/**
 * Berechnet Match Score basierend auf Keywords
 * @deprecated Plan 02: Verwende checkAutoConfirm() aus keyword-extraction-service.ts
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
 * @deprecated Plan 02: Verwende checkAutoConfirm() aus keyword-extraction-service.ts
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

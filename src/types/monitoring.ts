import { Timestamp } from 'firebase/firestore';

export interface MediaClipping {
  id?: string;
  organizationId: string;

  // Verknüpfungen
  campaignId?: string;
  projectId?: string;
  emailSendId?: string;

  // Artikel-Daten
  title: string;
  url: string;
  publishedAt: Timestamp;

  // Medium/Outlet
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  outletUrl?: string;

  // Inhalt
  excerpt?: string;
  fullText?: string;
  screenshot?: string;
  pdfArchive?: string;

  // Metriken
  reach?: number;
  ave?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  sentimentNotes?: string;

  // Kategorisierung
  tags?: string[];
  category?: 'news' | 'feature' | 'interview' | 'mention';
  prominenceScore?: number;

  // Tracking
  detectionMethod: 'manual' | 'google_news' | 'rss' | 'web_scraping' | 'imported';
  detectedAt: Timestamp;
  verifiedBy?: string;
  verifiedAt?: Timestamp;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Phase 5: Erweiterte Monitoring Suggestion mit Multi-Source Support
 *
 * BREAKING CHANGES:
 * - `source` (singular) ist nun DEPRECATED
 * - `sources` (array) ersetzt `source`
 * - Neue Felder: normalizedUrl, avgMatchScore, highestMatchScore, confidence, autoConfirmed
 * - Neue Status: 'auto_confirmed', 'spam'
 */
export interface MonitoringSuggestion {
  id?: string;
  organizationId: string;
  campaignId: string;

  // Artikel-Daten
  articleUrl: string;
  normalizedUrl: string; // Für Duplicate Detection (ohne www., query params, etc.)
  articleTitle: string;
  articleExcerpt?: string;
  articleImage?: string;

  // DEPRECATED: Alte Single-Source Struktur
  /** @deprecated Verwende sources[] stattdessen */
  source?: 'google_news' | 'rss_feed' | 'web_scraping';
  /** @deprecated Verwende sources[].sourceName stattdessen */
  sourceName?: string;
  /** @deprecated Verwende sources[].foundAt stattdessen */
  foundAt?: Timestamp;
  /** @deprecated Verwende sources[].matchScore stattdessen */
  matchScore?: number;
  /** @deprecated Verwende sources[].matchedKeywords stattdessen */
  matchedKeywords?: string[];

  // 🆕 NEU: Multi-Source Tracking
  sources: MonitoringSource[]; // Array aller Quellen die diesen Artikel gefunden haben
  avgMatchScore: number; // Durchschnitt aller Source-Scores
  highestMatchScore: number; // Höchster Score aller Sources

  // 🆕 NEU: Auto-Confirmation
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  autoConfirmed: boolean; // Wurde automatisch bestätigt?
  autoConfirmedAt?: Timestamp;

  // Status
  status: 'pending' | 'confirmed' | 'auto_confirmed' | 'spam'; // 🆕 'auto_confirmed' + 'spam'
  reviewedBy?: string;
  reviewedAt?: Timestamp;

  // Falls bestätigt → Clipping erstellt
  clippingId?: string;

  // 🆕 NEU: Spam Tracking
  spamMarkedBy?: string;
  spamMarkedAt?: Timestamp;
  spamPattern?: string; // Welches Spam-Pattern hat gematched

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Phase 5: Monitoring Source
 *
 * Repräsentiert eine einzelne Quelle die einen Artikel gefunden hat
 * Mehrere Sources können zum selben Artikel führen (Multi-Source Detection)
 */
export interface MonitoringSource {
  type: 'google_news' | 'rss_feed'; // Phase 5: Nur RSS + Google News
  // Phase 6+: 'social_media_*' wenn APIs verfügbar

  sourceName: string; // Name der Publication oder "Google News"
  sourceId?: string; // Publication ID (bei RSS Feed) oder Campaign ID (bei Google News)
  sourceUrl?: string; // URL des Feeds oder Google News Search URL

  matchScore: number; // 0-100 Score für diesen Fund
  matchedKeywords: string[]; // Welche Keywords haben gematched

  foundAt: Timestamp; // Wann wurde dieser Artikel von dieser Quelle gefunden
  publicationId?: string; // Zuordnung zur Publication (nur bei RSS Feed)
}

export interface RSSFeed {
  id?: string;
  organizationId: string;

  // Feed-Daten
  feedUrl: string;
  feedName: string;
  feedDescription?: string;
  isActive: boolean;

  // Monitoring-Einstellungen
  keywords: string[]; // Alle Feeds, optionale Keyword-Filter
  checkFrequency: 'daily' | 'twice_daily' | 'hourly'; // Wie oft wird der Feed überprüft

  // Statistiken
  lastChecked?: Timestamp;
  lastArticleFound?: Timestamp;
  totalArticlesFound: number;
  errorCount: number;
  lastError?: string;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MonitoringConfig {
  isEnabled: boolean;
  monitoringPeriod: 30 | 90 | 365; // Tage nach Kampagnen-Start
  keywords: string[]; // Suchbegriffe für Google News
  sources: {
    googleNews: boolean;
    rssFeeds: string[]; // IDs der zu überwachenden RSS Feeds
  };
  minMatchScore: number; // 0-100, Mindest-Score für Vorschläge
}

export interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  totalAVE: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  byOutletType: {
    print: number;
    online: number;
    broadcast: number;
    blog: number;
  };
  byCategory: {
    news: number;
    feature: number;
    interview: number;
    mention: number;
  };
}

export interface PublishingData {
  articleUrl: string;
  articleTitle?: string;
  reach?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  publicationNotes?: string;
  outletName?: string;
  publishedAt?: Timestamp;
}

export interface AVESettings {
  id?: string;
  organizationId: string;

  factors: {
    print: number;
    online: number;
    broadcast: number;
    blog: number;
  };

  sentimentMultipliers: {
    positive: number;
    neutral: number;
    negative: number;
  };

  updatedBy: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export const DEFAULT_AVE_SETTINGS: Omit<AVESettings, 'id' | 'organizationId' | 'updatedBy' | 'updatedAt' | 'createdAt'> = {
  factors: {
    print: 3,
    online: 1,
    broadcast: 5,
    blog: 0.5
  },
  sentimentMultipliers: {
    positive: 1.0,
    neutral: 0.8,
    negative: 0.5
  }
};

// ========================================
// Phase 5: Campaign Monitoring Tracker
// ========================================

/**
 * Campaign Monitoring Tracker
 *
 * Zentrales Tracking-Objekt für jede Kampagne
 * - Erstellt automatisch bei Kampagnen-Start
 * - Enthält alle zu überwachenden Channels (RSS Feeds + Google News)
 * - Zeitlich begrenzt (30/90/365 Tage)
 * - Channels werden deaktiviert wenn Artikel gefunden wurde (Ressourcen-Schonung)
 */
export interface CampaignMonitoringTracker {
  id?: string;
  organizationId: string;
  campaignId: string;

  // Monitoring Period
  startDate: Timestamp;
  endDate: Timestamp; // basierend auf monitoringPeriod (30/90/365 Tage)
  isActive: boolean; // Wird automatisch auf false gesetzt wenn endDate erreicht

  // Channels to Monitor (dynamisch aus Redakteuren + Google News generiert)
  channels: MonitoringChannel[];

  // Statistics
  totalArticlesFound: number;
  totalAutoConfirmed: number;
  totalManuallyAdded: number; // Manuell erfasste Clippings
  totalSpamMarked: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastCrawlAt?: Timestamp;
  nextCrawlAt?: Timestamp;
}

/**
 * Monitoring Channel
 *
 * Ein einzelner Kanal der überwacht wird (RSS Feed oder Google News)
 * - RSS Feed: Pro Publication ein Channel
 * - Google News: Ein Channel pro Kampagne
 */
export interface MonitoringChannel {
  id: string; // Unique ID für diesen Channel

  type: 'rss_feed' | 'google_news'; // Phase 5: Nur RSS + Google News
  // Phase 6+: 'social_media_*'

  // Source Info
  publicationId?: string; // NULL bei Google News (kampagnen-weit)
  publicationName: string; // Name der Publication oder "Google News"
  url: string; // Feed URL oder Google News Search URL

  // Status
  isActive: boolean; // Wird gecrawlt? (false wenn Artikel gefunden wurde)
  wasFound: boolean; // Wurde mindestens 1 Artikel gefunden?
  foundAt?: Timestamp; // Wann wurde der erste Artikel gefunden

  // Stats
  articlesFound: number;
  lastChecked?: Timestamp;
  lastSuccess?: Timestamp; // Letzter erfolgreicher Crawl
  errorCount: number;
  lastError?: string;
}

// ========================================
// Phase 5: Spam Pattern
// ========================================

/**
 * Spam Pattern
 *
 * Filtert unerwünschte Monitoring-Vorschläge
 * - Global: Organisationsweit (z.B. "Anzeige", "Sponsored")
 * - Campaign: Nur für eine Kampagne
 */
export interface SpamPattern {
  id?: string;
  organizationId: string;

  // Pattern
  type: 'url_domain' | 'keyword_title' | 'keyword_content' | 'outlet_name';
  pattern: string; // RegEx oder einfacher String
  isRegex: boolean;

  // Scope
  scope: 'global' | 'campaign';
  campaignId?: string; // Nur wenn scope = 'campaign'

  // Metadata
  isActive: boolean;
  timesMatched: number; // Wie oft hat dieses Pattern gematched
  description?: string; // Warum ist das Spam?

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
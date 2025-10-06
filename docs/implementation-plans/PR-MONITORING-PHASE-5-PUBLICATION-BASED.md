# Phase 5: Publication-Based Automated Monitoring - Implementierungsplan

## ✅ IMPLEMENTIERUNGS-CHECKLISTE

### Phase 1: Type-Erweiterungen (Backward-Compatible)
- [x] 1.1 Publication Type in library.ts erweitern
- [x] 1.2 Monitoring Types in monitoring.ts erweitern
- [x] 1.3 Campaign Type prüfen (bereits vorhanden)

### Phase 1.5: Matching Import Erweiterung
- [x] 1.5.1 Problem analysiert
- [x] 1.5.2 matching-service.ts erweitern
- [x] 1.5.3 AI-Merge erweitern
- [x] 1.5.4 Test-Daten Script erweitern

### Phase 2: Helper Functions & Utils
- [x] 2.1 publication-helpers.ts erstellen
- [x] 2.2 url-normalizer.ts erstellen

### Phase 3: Firebase Services
- [x] 3.1 campaign-monitoring-service.ts erstellen
- [x] 3.2 spam-pattern-service.ts erstellen

### Phase 4: UI Komponenten
- [x] 4.1 Publication Modal - Monitoring Tab
- [x] 4.2 Globale Spam-Blocklist Settings Page
- [x] 4.3 Monitoring Suggestions UI (Tab in Campaign Monitoring Detail)
- [ ] 4.4 Projekt Monitoring Tab - Empfänger & Veröffentlichungen überarbeiten

### Phase 5: Firebase Scheduled Functions (Crawler)
- [ ] 5.1 Daily Crawler Function implementieren

### Phase 6: Integration & Workflow
- [ ] 6.1 Campaign Creation Hook
- [ ] 6.2 Manual Publication Entry (prüfen)

### Phase 7: Testing & Rollout
- [ ] 7.1 Testing durchführen
- [ ] 7.2 Produktiv-Rollout

---

## 🎯 Übersicht

**Ziel:** Automatisches Monitoring von Veröffentlichungen basierend auf den Publications der Kampagnen-Empfänger.

**Ansatz:** Backward-Compatible Migration mit schrittweiser Einführung des neuen Monitoring-Systems.

**Kernprinzip:**
1. Agentur erfasst Verlage, deren Publications und Redakteure
2. Redakteure werden Publications zugeordnet
3. Kampagne wird mit Verteilerliste versendet
4. System erstellt automatisch Crawler-Liste aus Redakteur → Publication → Monitoring-Daten
5. Täglicher Crawler prüft:
   - ✅ **RSS Feeds der Publications** (Publication-spezifisch)
   - ✅ **Google News** (Kampagnen-weit, findet auch Publications ohne RSS)
6. Auto-Import bei Match (2+ Quellen ODER 1 Quelle mit 85%+ Score)
7. Zeitlich begrenztes Monitoring (30/90/365 Tage)
8. Gefundene Kanäle werden von Liste entfernt (Ressourcen-Schonung)
9. Manuelle Erfassung bleibt für Print und übersehene Artikel

**Wichtige Anpassungen:**
- ❌ Social Media komplett entfernt (APIs nicht verfügbar/zu teuer, evtl. Phase 6+)
- ✅ Google News **fest integriert** (parallel zu RSS Feeds)
- ✅ Matching Import erweitert um `monitoringConfig` zu migrieren/mergen
- ✅ 2-Quellen Architektur: RSS Feeds (Publication-spezifisch) + Google News (kampagnen-weit)

---

## 📋 Phase 1: Type-Erweiterungen (Backward-Compatible)

### 1.1 Publication Type erweitern

**Datei:** `src/types/library.ts`

```typescript
export interface Publication extends BaseEntity {
  // ... alle bestehenden Felder bleiben unverändert ...

  // DEPRECATED - Verwende monitoringConfig stattdessen
  /** @deprecated Verwende monitoringConfig.websiteUrl */
  websiteUrl?: string;

  /** @deprecated Verwende monitoringConfig.socialMedia */
  socialMediaUrls?: {
    platform: string;
    url: string;
  }[];

  /** @deprecated Verwende monitoringConfig.rssFeedUrls */
  rssFeedUrl?: string;

  // 🆕 NEU: Monitoring Configuration
  monitoringConfig?: PublicationMonitoringConfig;
}

export interface PublicationMonitoringConfig {
  isEnabled: boolean;

  // Website & RSS
  websiteUrl?: string;
  rssFeedUrls: string[]; // Array für mehrere Feeds
  autoDetectRss: boolean; // Auto-Test von /feed, /rss, etc.

  // Monitoring Settings
  checkFrequency: 'daily' | 'twice_daily';
  keywords: string[]; // Publication-spezifische Keywords

  // Statistiken
  lastChecked?: Timestamp;
  totalArticlesFound: number;

  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

**Hinweis:** Social Media Felder (instagram, linkedin, facebook, tiktok) wurden aus Phase 5 **komplett entfernt**. APIs sind nicht verfügbar/zu teuer. Evtl. Phase 6+.

### 1.2 Monitoring Types erweitern

**Datei:** `src/types/monitoring.ts`

```typescript
// Erweitere MonitoringSuggestion
export interface MonitoringSuggestion {
  id?: string;
  organizationId: string;
  campaignId: string;

  // Artikel-Daten
  articleUrl: string;
  normalizedUrl: string; // Für Duplicate Detection
  articleTitle: string;
  articleExcerpt?: string;
  articleImage?: string;

  // Multi-Source Tracking
  sources: MonitoringSource[];
  avgMatchScore: number;
  highestMatchScore: number;

  // Auto-Confirmation
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  autoConfirmed: boolean;
  autoConfirmedAt?: Timestamp;

  // Status
  status: 'pending' | 'confirmed' | 'auto_confirmed' | 'spam';
  reviewedBy?: string;
  reviewedAt?: Timestamp;

  // Falls bestätigt
  clippingId?: string;

  // Spam tracking
  spamMarkedBy?: string;
  spamMarkedAt?: Timestamp;
  spamPattern?: string; // Welches Pattern hat gematched

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MonitoringSource {
  type: 'google_news' | 'rss_feed'; // Phase 5: Nur RSS + Google News
  // Phase 6+: 'social_media_instagram' | 'social_media_linkedin' | 'social_media_facebook' | 'social_media_tiktok'
  sourceName: string; // Name der Publication oder des Feeds
  sourceId?: string; // Publication ID oder RSS Feed ID
  sourceUrl?: string; // URL des Feeds/Profils
  matchScore: number; // 0-100
  matchedKeywords: string[];
  foundAt: Timestamp;
  publicationId?: string; // Zuordnung zur Publication
}

// 🆕 NEU: Campaign Monitoring Tracker
export interface CampaignMonitoringTracker {
  id?: string;
  organizationId: string;
  campaignId: string;

  // Monitoring Period
  startDate: Timestamp;
  endDate: Timestamp; // basierend auf monitoringPeriod (30/90/365 Tage)
  isActive: boolean;

  // Channels to Monitor (dynamisch aus Redakteuren generiert)
  channels: MonitoringChannel[];

  // Statistics
  totalArticlesFound: number;
  totalAutoConfirmed: number;
  totalManuallyAdded: number;
  totalSpamMarked: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastCrawlAt?: Timestamp;
  nextCrawlAt?: Timestamp;
}

export interface MonitoringChannel {
  id: string; // Unique ID für diesen Channel
  type: 'rss_feed' | 'google_news'; // Phase 5: Nur RSS + Google News
  // Phase 6+: 'social_media_instagram' | 'social_media_linkedin' | etc.

  // Source Info
  publicationId?: string; // NULL bei Google News (kampagnen-weit)
  publicationName: string;
  url: string; // Feed URL oder Google News Search URL

  // Status
  isActive: boolean; // Wird gecrawlt
  wasFound: boolean; // Mindestens 1 Artikel gefunden
  foundAt?: Timestamp; // Wann wurde der erste Artikel gefunden

  // Stats
  articlesFound: number;
  lastChecked?: Timestamp;
  lastSuccess?: Timestamp;
  errorCount: number;
  lastError?: string;
}

// 🆕 NEU: Spam Pattern (Global + Campaign-Specific)
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
  timesMatched: number;
  description?: string; // Warum ist das Spam?

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.3 Campaign Type erweitern

**Datei:** `src/types/pr.ts`

Bereits vorhanden, keine Änderung nötig:

```typescript
export interface PRCampaign {
  // ... existing fields

  monitoringConfig?: {
    isEnabled: boolean;
    monitoringPeriod: 30 | 90 | 365;
    keywords: string[];
    sources: {
      googleNews: boolean;
      rssFeeds: string[];
    };
    minMatchScore: number;
  };
}
```

---

---

## 📋 Phase 1.5: Matching Import Erweiterung

### 1.5.1 Problem

**Matching Import** importiert Journalisten aus der Super-Admin DB in User-Organisationen.
Dabei werden auch **Publications** importiert/gemerged.

**WICHTIG:** Die neuen `monitoringConfig` Felder müssen auch importiert werden!

### 1.5.2 Lösung: matching-service.ts erweitern

**Datei:** `src/lib/firebase/matching-service.ts`

```typescript
import { migratePublicationToMonitoring } from '@/lib/utils/publication-helpers';

// In importCandidate() Funktion

// Publication Import/Merge
for (const sourcePub of sourceContact.mediaProfile.publications) {
  const existingPub = await findExistingPublication(sourcePub.name, targetOrgId);

  if (existingPub) {
    // MERGE: Kombiniere Monitoring Configs
    const mergedConfig = mergeMonitoringConfigs(
      existingPub.monitoringConfig,
      sourcePub.monitoringConfig
    );

    await publicationService.update(existingPub.id, {
      monitoringConfig: mergedConfig
    });
  } else {
    // CREATE: Neue Publication
    const pubData = {
      ...sourcePub,
      organizationId: targetOrgId,

      // Migriere alte Felder zu monitoringConfig falls nötig
      monitoringConfig: sourcePub.monitoringConfig || migratePublicationToMonitoring(sourcePub)
    };

    await publicationService.create(pubData);
  }
}
```

**Merge Logic:**

```typescript
function mergeMonitoringConfigs(
  existing?: PublicationMonitoringConfig,
  incoming?: PublicationMonitoringConfig
): PublicationMonitoringConfig {
  if (!existing && !incoming) {
    return {
      isEnabled: false,
      rssFeedUrls: [],
      autoDetectRss: false,
      checkFrequency: 'daily',
      keywords: [],
      totalArticlesFound: 0
    };
  }

  if (!existing) return incoming!;
  if (!incoming) return existing;

  // Merge beide Configs
  return {
    isEnabled: existing.isEnabled || incoming.isEnabled,
    websiteUrl: incoming.websiteUrl || existing.websiteUrl,

    // RSS Feeds: Kombiniere und dedupliziere
    rssFeedUrls: [
      ...new Set([
        ...(existing.rssFeedUrls || []),
        ...(incoming.rssFeedUrls || [])
      ])
    ],

    autoDetectRss: existing.autoDetectRss || incoming.autoDetectRss,

    checkFrequency: existing.checkFrequency || incoming.checkFrequency,

    // Keywords: Kombiniere
    keywords: [
      ...new Set([
        ...(existing.keywords || []),
        ...(incoming.keywords || [])
      ])
    ],

    totalArticlesFound: existing.totalArticlesFound || 0,
    lastChecked: existing.lastChecked,
    createdAt: existing.createdAt,
    updatedAt: Timestamp.now()
  };
}
```

### 1.5.3 AI-Merge erweitern

**Datei:** `src/app/api/ai/merge-variants/route.ts`

System Prompt erweitern:

```typescript
const systemPrompt = `
Du vergleichst zwei Publikations-Datensätze und erstellst den besten Merge.

NEUE FELDER zum Mergen:

monitoringConfig:
  - websiteUrl: Bevorzuge vollständigere URL
  - rssFeedUrls: ARRAY - kombiniere BEIDE, entferne Duplikate
  - keywords: ARRAY - kombiniere BEIDE, entferne Duplikate
  - checkFrequency: Bevorzuge höhere Frequenz (twice_daily > daily)

Regeln:
- isEnabled = true wenn mindestens eine Variante enabled
- Kombiniere alle Arrays (rssFeedUrls, keywords) und dedupliziere
- Bei URL-Konflikten: Wähle längere/vollständigere URL
- autoDetectRss: true wenn mindestens eine Variante true
`;
```

---

## 📋 Phase 2: Helper Functions & Utils

### 2.1 Publication Helper Functions

**Datei:** `src/lib/utils/publication-helpers.ts` (NEU)

```typescript
import { Publication, PublicationMonitoringConfig } from '@/types/library';

/**
 * Gibt Website URL zurück (Backward Compatible)
 */
export function getWebsiteUrl(pub: Publication): string | undefined {
  return pub.monitoringConfig?.websiteUrl || pub.websiteUrl;
}

/**
 * Gibt RSS Feed URLs zurück (Backward Compatible)
 */
export function getRssFeedUrls(pub: Publication): string[] {
  if (pub.monitoringConfig?.rssFeedUrls?.length) {
    return pub.monitoringConfig.rssFeedUrls;
  }
  return pub.rssFeedUrl ? [pub.rssFeedUrl] : [];
}

/**
 * Gibt Social Media URLs zurück (Backward Compatible)
 */
export function getSocialMediaUrls(pub: Publication): Array<{ platform: string; url: string; }> {
  const urls: Array<{ platform: string; url: string; }> = [];

  // Neue Struktur
  if (pub.monitoringConfig?.socialMedia) {
    const sm = pub.monitoringConfig.socialMedia;
    if (sm.instagram?.profileUrl) {
      urls.push({ platform: 'instagram', url: sm.instagram.profileUrl });
    }
    if (sm.linkedin?.profileUrl) {
      urls.push({ platform: 'linkedin', url: sm.linkedin.profileUrl });
    }
    if (sm.facebook?.profileUrl) {
      urls.push({ platform: 'facebook', url: sm.facebook.profileUrl });
    }
    if (sm.tiktok?.profileUrl) {
      urls.push({ platform: 'tiktok', url: sm.tiktok.profileUrl });
    }
  }

  // Fallback: Alte Struktur
  if (urls.length === 0 && pub.socialMediaUrls) {
    return pub.socialMediaUrls;
  }

  return urls;
}

/**
 * Prüft ob Monitoring für Publication aktiviert ist
 */
export function isMonitoringEnabled(pub: Publication): boolean {
  return pub.monitoringConfig?.isEnabled ?? false;
}

/**
 * Migriert alte Publication-Daten zu neuer Struktur
 */
export function migratePublicationToMonitoring(pub: Publication): PublicationMonitoringConfig {
  return {
    isEnabled: !!(pub.rssFeedUrl || pub.socialMediaUrls?.length || pub.websiteUrl),
    websiteUrl: pub.websiteUrl,
    rssFeedUrls: pub.rssFeedUrl ? [pub.rssFeedUrl] : [],
    autoDetectRss: false,
    socialMedia: convertSocialMediaArray(pub.socialMediaUrls),
    checkFrequency: 'daily',
    keywords: [],
    totalArticlesFound: 0
  };
}

/**
 * Konvertiert alte Social Media Array zu neuer Struktur
 */
function convertSocialMediaArray(urls?: Array<{ platform: string; url: string; }>): PublicationMonitoringConfig['socialMedia'] {
  const result: PublicationMonitoringConfig['socialMedia'] = {};

  urls?.forEach(({ platform, url }) => {
    const handle = extractHandleFromUrl(url, platform);
    const normalizedPlatform = platform.toLowerCase();

    if (normalizedPlatform === 'instagram' || normalizedPlatform === 'linkedin' ||
        normalizedPlatform === 'facebook' || normalizedPlatform === 'tiktok') {
      result[normalizedPlatform] = {
        handle,
        profileUrl: url,
        isActive: true
      };
    }
  });

  return result;
}

/**
 * Extrahiert Handle aus Social Media URL
 */
function extractHandleFromUrl(url: string, platform: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Entferne führende/trailing Slashes
    const parts = pathname.split('/').filter(p => p);

    // Meistens ist der Handle der erste Teil nach der Domain
    if (parts.length > 0) {
      return '@' + parts[0];
    }
  } catch (e) {
    // Falls URL-Parsing fehlschlägt
  }

  return url;
}

/**
 * Auto-Detect RSS Feed URLs
 */
export async function autoDetectRssFeed(websiteUrl: string): Promise<string[]> {
  const detectedFeeds: string[] = [];

  const patterns = [
    '/feed',
    '/rss',
    '/feed.xml',
    '/rss.xml',
    '/atom.xml',
    '/index.xml',
    '/feeds/posts/default' // Blogger
  ];

  try {
    const baseUrl = new URL(websiteUrl).origin;

    // Test Standard-Patterns
    for (const pattern of patterns) {
      const testUrl = baseUrl + pattern;

      try {
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('xml') || contentType?.includes('rss') || contentType?.includes('atom')) {
            detectedFeeds.push(testUrl);
          }
        }
      } catch (e) {
        // Ignoriere Fehler, teste weiter
      }
    }

    // Fallback: Parse HTML für <link rel="alternate">
    if (detectedFeeds.length === 0) {
      try {
        const htmlResponse = await fetch(websiteUrl, {
          signal: AbortSignal.timeout(5000)
        });

        if (htmlResponse.ok) {
          const html = await htmlResponse.text();

          // Regex für RSS/Atom Links
          const linkRegex = /<link[^>]*rel=["']alternate["'][^>]*type=["'](application\/(rss|atom)\+xml)["'][^>]*href=["']([^"']+)["']/gi;
          let match;

          while ((match = linkRegex.exec(html)) !== null) {
            const feedUrl = match[3];

            // Relative URLs zu absoluten machen
            const absoluteUrl = feedUrl.startsWith('http')
              ? feedUrl
              : new URL(feedUrl, baseUrl).href;

            detectedFeeds.push(absoluteUrl);
          }
        }
      } catch (e) {
        // HTML-Parsing fehlgeschlagen
      }
    }
  } catch (e) {
    console.error('RSS Auto-Detection failed:', e);
  }

  return [...new Set(detectedFeeds)]; // Deduplizieren
}
```

### 2.2 URL Normalization Helper

**Datei:** `src/lib/utils/url-normalizer.ts` (NEU)

```typescript
/**
 * Normalisiert URLs für Duplicate Detection
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Entferne www.
    let hostname = urlObj.hostname.replace(/^www\./, '');

    // Entferne Query Parameters (außer wichtige wie article_id)
    const pathname = urlObj.pathname;

    // Entferne Tracking-Parameter
    const cleanUrl = `${urlObj.protocol}//${hostname}${pathname}`;

    // Entferne trailing slash
    return cleanUrl.replace(/\/$/, '');
  } catch (e) {
    // Falls URL-Parsing fehlschlägt, gib Original zurück
    return url;
  }
}

/**
 * Prüft ob zwei URLs die gleiche Seite sind
 */
export function isSameUrl(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2);
}
```

---

## 📋 Phase 3: Firebase Services

### 3.1 Campaign Monitoring Tracker Service

**Datei:** `src/lib/firebase/campaign-monitoring-service.ts` (NEU)

```typescript
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import {
  CampaignMonitoringTracker,
  MonitoringChannel
} from '@/types/monitoring';
import { PRCampaign } from '@/types/pr';
import { Publication } from '@/types/library';
import { handleRecipientLookup } from '@/lib/utils/publication-matcher';
import { isMonitoringEnabled } from '@/lib/utils/publication-helpers';
import { publicationService } from './library-service';
import { prService } from './pr-service';

class CampaignMonitoringService {
  private collectionName = 'campaign_monitoring_trackers';

  /**
   * Erstellt Monitoring Tracker für Kampagne
   *
   * Analysiert alle Empfänger und erstellt Channel-Liste basierend auf ihren Publications
   */
  async createTrackerForCampaign(
    campaignId: string,
    organizationId: string
  ): Promise<string> {
    // 1. Lade Kampagne
    const campaign = await prService.getById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (!campaign.monitoringConfig?.isEnabled) {
      throw new Error('Monitoring not enabled for campaign');
    }

    // 2. Berechne End-Datum basierend auf Monitoring Period
    const startDate = Timestamp.now();
    const endDate = this.calculateEndDate(startDate, campaign.monitoringConfig.monitoringPeriod);

    // 3. Sammle alle Channels aus Empfängern
    const channels = await this.buildChannelsFromRecipients(campaign);

    // 3b. Füge Google News Channel hinzu (kampagnen-weit, EINMAL)
    const googleNewsChannel = this.buildGoogleNewsChannel(campaign);
    if (googleNewsChannel) {
      channels.push(googleNewsChannel);
    }

    // 4. Erstelle Tracker
    const trackerData: Omit<CampaignMonitoringTracker, 'id'> = {
      organizationId,
      campaignId,
      startDate,
      endDate,
      isActive: true,
      channels,
      totalArticlesFound: 0,
      totalAutoConfirmed: 0,
      totalManuallyAdded: 0,
      totalSpamMarked: 0,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(
      collection(db, this.collectionName),
      trackerData
    );

    return docRef.id;
  }

  /**
   * Baut Channel-Liste aus Kampagnen-Empfängern
   */
  private async buildChannelsFromRecipients(
    campaign: PRCampaign
  ): Promise<MonitoringChannel[]> {
    const channels: MonitoringChannel[] = [];
    const seenPublicationIds = new Set<string>();

    // 1. Lade alle Email-Sends der Kampagne
    const sendsQuery = query(
      collection(db, 'email_campaign_sends'),
      where('campaignId', '==', campaign.id),
      where('status', '==', 'sent')
    );

    const sendsSnapshot = await getDocs(sendsQuery);

    // 2. Für jeden Empfänger: Lookup Publications
    for (const sendDoc of sendsSnapshot.docs) {
      const send = sendDoc.data();
      const recipientEmail = send.recipientEmail;

      if (!recipientEmail) continue;

      try {
        // Lookup Contact + Publications
        const lookup = await handleRecipientLookup(
          recipientEmail,
          campaign.organizationId
        );

        // Für jede gefundene Publication
        for (const matchedPub of lookup.publications) {
          // Nur Company-Source Publications mit ID
          if (matchedPub.source !== 'company' || !matchedPub.id) {
            continue;
          }

          // Duplicate Check
          if (seenPublicationIds.has(matchedPub.id)) {
            continue;
          }

          seenPublicationIds.add(matchedPub.id);

          // Lade vollständige Publication-Daten
          const publication = await publicationService.getById(matchedPub.id);

          if (!publication || !isMonitoringEnabled(publication)) {
            continue;
          }

          // Erstelle Channels aus Publication.monitoringConfig
          const pubChannels = this.buildChannelsFromPublication(publication);
          channels.push(...pubChannels);
        }
      } catch (error) {
        console.error(`Error processing recipient ${recipientEmail}:`, error);
      }
    }

    return channels;
  }

  /**
   * Erstellt Monitoring Channels aus einer Publication
   */
  private buildChannelsFromPublication(pub: Publication): MonitoringChannel[] {
    const channels: MonitoringChannel[] = [];

    if (!pub.monitoringConfig || !pub.id) return channels;

    const config = pub.monitoringConfig;

    // RSS Feeds
    for (const feedUrl of config.rssFeedUrls || []) {
      channels.push({
        id: this.generateChannelId('rss', pub.id, feedUrl),
        type: 'rss_feed',
        publicationId: pub.id,
        publicationName: pub.title,
        url: feedUrl,
        isActive: true,
        wasFound: false,
        articlesFound: 0,
        errorCount: 0
      });
    }

    return channels;
  }

  /**
   * Erstellt Google News Channel für Kampagne
   *
   * Google News wird EINMAL pro Kampagne erstellt (nicht pro Publication)
   */
  private buildGoogleNewsChannel(campaign: PRCampaign): MonitoringChannel | null {
    if (!campaign.monitoringConfig?.isEnabled) return null;

    const keywords = campaign.monitoringConfig.keywords || [];
    if (keywords.length === 0) return null;

    // Baue Google News RSS URL
    const query = keywords.join(' ');
    const encodedQuery = encodeURIComponent(query);
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=de&gl=DE&ceid=DE:de`;

    return {
      id: `google_news_${campaign.id}`,
      type: 'google_news',
      publicationId: undefined, // Google News ist nicht publication-spezifisch
      publicationName: 'Google News',
      url: googleNewsUrl,
      isActive: true,
      wasFound: false,
      articlesFound: 0,
      errorCount: 0
    };
  }

  /**
   * Generiert eindeutige Channel ID
   */
  private generateChannelId(type: string, publicationId: string, url: string): string {
    const hash = btoa(`${type}:${publicationId}:${url}`).substring(0, 16);
    return `${type}_${publicationId}_${hash}`;
  }

  /**
   * Berechnet End-Datum basierend auf Monitoring Period
   */
  private calculateEndDate(startDate: Timestamp, period: 30 | 90 | 365): Timestamp {
    const start = startDate.toDate();
    const end = new Date(start);
    end.setDate(end.getDate() + period);
    return Timestamp.fromDate(end);
  }

  /**
   * Lädt Tracker für Kampagne
   */
  async getTrackerByCampaignId(campaignId: string): Promise<CampaignMonitoringTracker | null> {
    const q = query(
      collection(db, this.collectionName),
      where('campaignId', '==', campaignId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as CampaignMonitoringTracker;
  }

  /**
   * Markiert Channel als gefunden und deaktiviert ihn
   */
  async markChannelAsFound(
    trackerId: string,
    channelId: string
  ): Promise<void> {
    const tracker = await this.getById(trackerId);

    if (!tracker) {
      throw new Error('Tracker not found');
    }

    const updatedChannels = tracker.channels.map(ch => {
      if (ch.id === channelId) {
        return {
          ...ch,
          wasFound: true,
          foundAt: Timestamp.now(),
          isActive: false, // 🔴 WICHTIG: Deaktiviere Channel nach Fund!
          articlesFound: ch.articlesFound + 1
        };
      }
      return ch;
    });

    await updateDoc(doc(db, this.collectionName, trackerId), {
      channels: updatedChannels,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Lädt Tracker by ID
   */
  async getById(id: string): Promise<CampaignMonitoringTracker | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as CampaignMonitoringTracker;
  }

  /**
   * Lädt alle aktiven Tracker (für Crawler)
   */
  async getActiveTrackers(): Promise<CampaignMonitoringTracker[]> {
    const now = Timestamp.now();

    const q = query(
      collection(db, this.collectionName),
      where('isActive', '==', true),
      where('endDate', '>', now)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CampaignMonitoringTracker[];
  }

  /**
   * Deaktiviert abgelaufene Tracker
   */
  async deactivateExpiredTrackers(): Promise<number> {
    const now = Timestamp.now();

    const q = query(
      collection(db, this.collectionName),
      where('isActive', '==', true),
      where('endDate', '<=', now)
    );

    const snapshot = await getDocs(q);

    let deactivated = 0;

    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(db, this.collectionName, docSnap.id), {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      deactivated++;
    }

    return deactivated;
  }

  /**
   * Update Tracker Statistics
   */
  async updateStats(
    trackerId: string,
    stats: {
      totalArticlesFound?: number;
      totalAutoConfirmed?: number;
      totalManuallyAdded?: number;
      totalSpamMarked?: number;
    }
  ): Promise<void> {
    await updateDoc(doc(db, this.collectionName, trackerId), {
      ...stats,
      updatedAt: serverTimestamp()
    });
  }
}

export const campaignMonitoringService = new CampaignMonitoringService();
```

### 3.2 Spam Pattern Service

**Datei:** `src/lib/firebase/spam-pattern-service.ts` (NEU)

```typescript
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { SpamPattern } from '@/types/monitoring';

class SpamPatternService {
  private collectionName = 'spam_patterns';

  /**
   * Erstellt neues Spam Pattern
   */
  async create(
    pattern: Omit<SpamPattern, 'id' | 'createdAt' | 'updatedAt' | 'timesMatched'>,
    context: { userId: string }
  ): Promise<string> {
    const data: Omit<SpamPattern, 'id'> = {
      ...pattern,
      timesMatched: 0,
      createdBy: context.userId,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(collection(db, this.collectionName), data);
    return docRef.id;
  }

  /**
   * Lädt alle Patterns für Organisation
   */
  async getByOrganization(
    organizationId: string,
    scope?: 'global' | 'campaign'
  ): Promise<SpamPattern[]> {
    let q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true)
    );

    if (scope) {
      q = query(q, where('scope', '==', scope));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SpamPattern[];
  }

  /**
   * Lädt Patterns für spezifische Kampagne (Global + Campaign-Specific)
   */
  async getPatternsForCampaign(
    organizationId: string,
    campaignId: string
  ): Promise<SpamPattern[]> {
    // Lade sowohl globale als auch kampagnen-spezifische Patterns
    const globalQuery = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      where('scope', '==', 'global'),
      where('isActive', '==', true)
    );

    const campaignQuery = query(
      collection(db, this.collectionName),
      where('organizationId', '==', organizationId),
      where('scope', '==', 'campaign'),
      where('campaignId', '==', campaignId),
      where('isActive', '==', true)
    );

    const [globalSnap, campaignSnap] = await Promise.all([
      getDocs(globalQuery),
      getDocs(campaignQuery)
    ]);

    const patterns: SpamPattern[] = [
      ...globalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpamPattern)),
      ...campaignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpamPattern))
    ];

    return patterns;
  }

  /**
   * Prüft ob URL/Titel gegen Spam-Patterns matcht
   */
  async checkForSpam(
    url: string,
    title: string,
    outletName: string,
    organizationId: string,
    campaignId?: string
  ): Promise<{ isSpam: boolean; matchedPattern?: SpamPattern }> {
    // Lade relevante Patterns
    const patterns = campaignId
      ? await this.getPatternsForCampaign(organizationId, campaignId)
      : await this.getByOrganization(organizationId, 'global');

    for (const pattern of patterns) {
      let isMatch = false;

      switch (pattern.type) {
        case 'url_domain':
          isMatch = this.matchPattern(url, pattern);
          break;
        case 'keyword_title':
          isMatch = this.matchPattern(title, pattern);
          break;
        case 'keyword_content':
          // TODO: Content matching wenn fullText vorhanden
          break;
        case 'outlet_name':
          isMatch = this.matchPattern(outletName, pattern);
          break;
      }

      if (isMatch) {
        // Increment match counter
        if (pattern.id) {
          await this.incrementMatchCount(pattern.id);
        }

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
  private matchPattern(text: string, pattern: SpamPattern): boolean {
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
   * Erhöht Match Counter
   */
  private async incrementMatchCount(patternId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, patternId);
    const snapshot = await getDocs(query(collection(db, this.collectionName), where('__name__', '==', patternId)));

    if (!snapshot.empty) {
      const currentCount = snapshot.docs[0].data().timesMatched || 0;
      await updateDoc(docRef, {
        timesMatched: currentCount + 1,
        updatedAt: serverTimestamp()
      });
    }
  }

  /**
   * Deaktiviert Pattern
   */
  async deactivate(patternId: string): Promise<void> {
    await updateDoc(doc(db, this.collectionName, patternId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Aktiviert Pattern
   */
  async activate(patternId: string): Promise<void> {
    await updateDoc(doc(db, this.collectionName, patternId), {
      isActive: true,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Löscht Pattern
   */
  async delete(patternId: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, patternId));
  }
}

export const spamPatternService = new SpamPatternService();
```

---

## 📋 Phase 4: UI Komponenten

### 4.1 Publication Modal - Monitoring Tab

**Datei:** `src/app/dashboard/library/publications/PublicationModal.tsx`

**Änderungen:**

1. Füge neuen Tab "Monitoring" hinzu
2. Formular für `monitoringConfig`:
   - Website URL
   - RSS Feed URLs (Array mit Add/Remove)
   - Auto-Detect RSS Button
   - Keywords (komma-getrennt)
   - Check Frequency
3. Beim Speichern: Schreibe in **beide** Strukturen (alt + neu) für Backward Compatibility

**HINWEIS:** Social Media Felder wurden ENTFERNT (Phase 6+)

**Code-Änderungen:**

```typescript
// Tab State erweitern
const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'monitoring' | 'identifiers'>('basic');

// Monitoring Config State
const [monitoringConfig, setMonitoringConfig] = useState<PublicationMonitoringConfig>({
  isEnabled: false,
  websiteUrl: '',
  rssFeedUrls: [],
  autoDetectRss: false,
  socialMedia: {},
  checkFrequency: 'daily',
  keywords: [],
  totalArticlesFound: 0
});

// Auto-Detect RSS Function
const handleAutoDetectRss = async () => {
  if (!monitoringConfig.websiteUrl) {
    toast.error('Bitte gib zuerst eine Website-URL ein');
    return;
  }

  const loading = toast.loading('Suche nach RSS Feeds...');

  try {
    const feeds = await autoDetectRssFeed(monitoringConfig.websiteUrl);

    if (feeds.length > 0) {
      setMonitoringConfig({
        ...monitoringConfig,
        rssFeedUrls: feeds
      });
      toast.success(`${feeds.length} RSS Feed(s) gefunden!`, { id: loading });
    } else {
      toast.error('Keine RSS Feeds gefunden', { id: loading });
    }
  } catch (error) {
    toast.error('Fehler beim Suchen', { id: loading });
  }
};

// Beim Laden: Migriere alte Daten wenn nötig
useEffect(() => {
  if (publication) {
    if (publication.monitoringConfig) {
      setMonitoringConfig(publication.monitoringConfig);
    } else {
      // Migriere alte Daten
      const migrated = migratePublicationToMonitoring(publication);
      setMonitoringConfig(migrated);
    }
  }
}, [publication]);

// Beim Speichern: Schreibe beide Strukturen
const handleSubmit = async () => {
  // ... existing code ...

  const publicationData = {
    // ... existing fields ...

    // NEU: Monitoring Config
    monitoringConfig: monitoringConfig.isEnabled ? monitoringConfig : undefined,

    // DEPRECATED: Aber für Backward Compatibility noch speichern
    websiteUrl: monitoringConfig.websiteUrl,
    rssFeedUrl: monitoringConfig.rssFeedUrls[0], // Erstes Feed
    socialMediaUrls: getSocialMediaUrls({ monitoringConfig } as Publication)
  };

  // ... rest of save logic ...
};
```

**JSX für Monitoring Tab:**

```tsx
{activeTab === 'monitoring' && (
  <div className="space-y-6">
    {/* Enable Toggle */}
    <div className="flex items-center justify-between">
      <div>
        <label className="font-medium text-gray-900">
          Monitoring aktivieren
        </label>
        <p className="text-sm text-gray-500">
          Automatisches Scannen nach Veröffentlichungen
        </p>
      </div>
      <Switch
        checked={monitoringConfig.isEnabled}
        onChange={(enabled) => setMonitoringConfig({ ...monitoringConfig, isEnabled: enabled })}
      />
    </div>

    {monitoringConfig.isEnabled && (
      <>
        {/* Website URL */}
        <Field>
          <Label>Website URL</Label>
          <Input
            type="url"
            value={monitoringConfig.websiteUrl || ''}
            onChange={(e) => setMonitoringConfig({ ...monitoringConfig, websiteUrl: e.target.value })}
            placeholder="https://www.example.com"
          />
        </Field>

        {/* RSS Feeds */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>RSS Feed URLs</Label>
            <Button
              type="button"
              size="sm"
              onClick={handleAutoDetectRss}
              disabled={!monitoringConfig.websiteUrl}
            >
              <MagnifyingGlassIcon className="size-4" />
              Auto-Detect
            </Button>
          </div>

          {monitoringConfig.rssFeedUrls.map((feedUrl, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <Input
                type="url"
                value={feedUrl}
                onChange={(e) => {
                  const updated = [...monitoringConfig.rssFeedUrls];
                  updated[idx] = e.target.value;
                  setMonitoringConfig({ ...monitoringConfig, rssFeedUrls: updated });
                }}
                placeholder="https://example.com/feed"
              />
              <Button
                type="button"
                color="red"
                onClick={() => {
                  const updated = monitoringConfig.rssFeedUrls.filter((_, i) => i !== idx);
                  setMonitoringConfig({ ...monitoringConfig, rssFeedUrls: updated });
                }}
              >
                Entfernen
              </Button>
            </div>
          ))}

          <Button
            type="button"
            onClick={() => {
              setMonitoringConfig({
                ...monitoringConfig,
                rssFeedUrls: [...monitoringConfig.rssFeedUrls, '']
              });
            }}
          >
            + RSS Feed hinzufügen
          </Button>
        </div>

        {/* Social Media */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Social Media Profile</h4>

          {/* Instagram */}
          <Field>
            <Label>Instagram</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                value={monitoringConfig.socialMedia.instagram?.handle || ''}
                onChange={(e) => setMonitoringConfig({
                  ...monitoringConfig,
                  socialMedia: {
                    ...monitoringConfig.socialMedia,
                    instagram: {
                      ...monitoringConfig.socialMedia.instagram,
                      handle: e.target.value,
                      profileUrl: monitoringConfig.socialMedia.instagram?.profileUrl || '',
                      isActive: true
                    }
                  }
                })}
                placeholder="@handle"
              />
              <Input
                type="url"
                value={monitoringConfig.socialMedia.instagram?.profileUrl || ''}
                onChange={(e) => setMonitoringConfig({
                  ...monitoringConfig,
                  socialMedia: {
                    ...monitoringConfig.socialMedia,
                    instagram: {
                      ...monitoringConfig.socialMedia.instagram,
                      handle: monitoringConfig.socialMedia.instagram?.handle || '',
                      profileUrl: e.target.value,
                      isActive: true
                    }
                  }
                })}
                placeholder="https://instagram.com/..."
              />
            </div>
          </Field>

          {/* LinkedIn, Facebook, TikTok analog */}
        </div>

        {/* Check Frequency */}
        <Field>
          <Label>Prüffrequenz</Label>
          <Select
            value={monitoringConfig.checkFrequency}
            onChange={(e) => setMonitoringConfig({
              ...monitoringConfig,
              checkFrequency: e.target.value as 'daily' | 'twice_daily'
            })}
          >
            <option value="daily">Täglich</option>
            <option value="twice_daily">2x täglich</option>
          </Select>
        </Field>

        {/* Keywords */}
        <Field>
          <Label>Zusätzliche Keywords (optional)</Label>
          <Input
            type="text"
            value={monitoringConfig.keywords.join(', ')}
            onChange={(e) => setMonitoringConfig({
              ...monitoringConfig,
              keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
            })}
            placeholder="Komma-getrennt"
          />
          <Text className="text-xs text-gray-500">
            Spezifische Keywords für diese Publikation
          </Text>
        </Field>
      </>
    )}
  </div>
)}
```

### 4.2 Globale Spam-Blocklist Settings Page

**Datei:** `src/app/dashboard/settings/spam-blocklist/page.tsx` (NEU)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { spamPatternService } from '@/lib/firebase/spam-pattern-service';
import { SpamPattern } from '@/types/monitoring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import { Switch } from '@/components/ui/switch';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SpamBlocklistPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [patterns, setPatterns] = useState<SpamPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'url_domain' as SpamPattern['type'],
    pattern: '',
    isRegex: false,
    description: ''
  });

  useEffect(() => {
    loadPatterns();
  }, [currentOrganization]);

  const loadPatterns = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const data = await spamPatternService.getByOrganization(
        currentOrganization.id,
        'global'
      );
      setPatterns(data);
    } catch (error) {
      console.error('Error loading patterns:', error);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user || !currentOrganization) return;

    try {
      await spamPatternService.create({
        organizationId: currentOrganization.id,
        type: formData.type,
        pattern: formData.pattern,
        isRegex: formData.isRegex,
        scope: 'global',
        isActive: true,
        description: formData.description || undefined
      }, { userId: user.uid });

      toast.success('Pattern hinzugefügt');
      setIsDialogOpen(false);
      setFormData({
        type: 'url_domain',
        pattern: '',
        isRegex: false,
        description: ''
      });
      loadPatterns();
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleDelete = async (patternId: string) => {
    if (!confirm('Pattern wirklich löschen?')) return;

    try {
      await spamPatternService.delete(patternId);
      toast.success('Pattern gelöscht');
      loadPatterns();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleToggle = async (pattern: SpamPattern) => {
    if (!pattern.id) return;

    try {
      if (pattern.isActive) {
        await spamPatternService.deactivate(pattern.id);
      } else {
        await spamPatternService.activate(pattern.id);
      }
      loadPatterns();
    } catch (error) {
      toast.error('Fehler');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Heading>Globale Spam-Blocklist</Heading>
        <Text>
          Filtere unerwünschte Veröffentlichungs-Vorschläge organisationsweit
        </Text>
      </div>

      <div className="mb-4">
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Pattern hinzufügen
        </Button>
      </div>

      {/* Patterns Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Typ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Pattern
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Matches
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patterns.map((pattern) => (
              <tr key={pattern.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge>
                    {pattern.type === 'url_domain' && 'URL Domain'}
                    {pattern.type === 'keyword_title' && 'Keyword (Titel)'}
                    {pattern.type === 'keyword_content' && 'Keyword (Inhalt)'}
                    {pattern.type === 'outlet_name' && 'Medium Name'}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {pattern.pattern}
                  </code>
                  {pattern.isRegex && (
                    <Badge color="blue" className="ml-2">RegEx</Badge>
                  )}
                  {pattern.description && (
                    <p className="text-xs text-gray-500 mt-1">{pattern.description}</p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{pattern.timesMatched || 0}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Switch
                    checked={pattern.isActive}
                    onChange={() => handleToggle(pattern)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button
                    color="red"
                    onClick={() => pattern.id && handleDelete(pattern.id)}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {patterns.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Noch keine Spam-Patterns definiert</p>
          </div>
        )}
      </div>

      {/* Add Pattern Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>Spam-Pattern hinzufügen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <Field>
              <Label>Typ</Label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SpamPattern['type'] })}
              >
                <option value="url_domain">URL Domain</option>
                <option value="keyword_title">Keyword (Titel)</option>
                <option value="keyword_content">Keyword (Inhalt)</option>
                <option value="outlet_name">Medium Name</option>
              </Select>
            </Field>

            <Field>
              <Label>Pattern</Label>
              <Input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder="z.B. spam-domain.com"
              />
            </Field>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isRegex}
                onChange={(checked) => setFormData({ ...formData, isRegex: checked })}
              />
              <Label>RegEx Pattern</Label>
            </div>

            <Field>
              <Label>Beschreibung (optional)</Label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Warum ist das Spam?"
              />
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setIsDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleAdd} disabled={!formData.pattern}>
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
```

### 4.3 Monitoring Suggestions UI

**Datei:** `src/components/monitoring/MonitoringSuggestionsTable.tsx` (NEU)

```typescript
'use client';

import { useState } from 'react';
import { MonitoringSuggestion, MonitoringSource } from '@/types/monitoring';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  RssIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  suggestions: MonitoringSuggestion[];
  onConfirm: (suggestion: MonitoringSuggestion) => Promise<void>;
  onMarkSpam: (suggestion: MonitoringSuggestion) => Promise<void>;
  loading: boolean;
}

export function MonitoringSuggestionsTable({
  suggestions,
  onConfirm,
  onMarkSpam,
  loading
}: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleConfirm = async (suggestion: MonitoringSuggestion) => {
    setProcessingId(suggestion.id || null);
    try {
      await onConfirm(suggestion);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkSpam = async (suggestion: MonitoringSuggestion) => {
    if (!confirm('Als Spam markieren? Dies kann ein Pattern erstellen.')) return;

    setProcessingId(suggestion.id || null);
    try {
      await onMarkSpam(suggestion);
    } finally {
      setProcessingId(null);
    }
  };

  const getSourceIcon = (type: MonitoringSource['type']) => {
    if (type === 'google_news') return <GlobeAltIcon className="size-4" />;
    if (type === 'rss_feed') return <RssIcon className="size-4" />;
    // Social Media Icons
    return <GlobeAltIcon className="size-4" />;
  };

  const getConfidenceBadge = (confidence: MonitoringSuggestion['confidence']) => {
    const colors = {
      low: 'gray',
      medium: 'yellow',
      high: 'green',
      very_high: 'blue'
    };

    return <Badge color={colors[confidence]}>{confidence.toUpperCase()}</Badge>;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Artikel
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Quellen
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Confidence
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {suggestions.map((suggestion) => (
            <tr key={suggestion.id} className={suggestion.autoConfirmed ? 'bg-green-50' : ''}>
              <td className="px-6 py-4">
                <div>
                  <a
                    href={suggestion.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {suggestion.articleTitle}
                  </a>
                  {suggestion.articleExcerpt && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {suggestion.articleExcerpt}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Gefunden {formatDistanceToNow(suggestion.createdAt.toDate(), { locale: de, addSuffix: true })}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {suggestion.sources.map((source, idx) => (
                    <Badge key={idx} color="blue" className="flex items-center gap-1">
                      {getSourceIcon(source.type)}
                      {source.sourceName}
                      <span className="ml-1 text-xs">({source.matchScore}%)</span>
                    </Badge>
                  ))}
                </div>
                <Text className="text-xs text-gray-500 mt-1">
                  Ø {suggestion.avgMatchScore.toFixed(0)}% | Max {suggestion.highestMatchScore}%
                </Text>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getConfidenceBadge(suggestion.confidence)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {suggestion.status === 'pending' && <Badge color="yellow">Ausstehend</Badge>}
                {suggestion.status === 'auto_confirmed' && <Badge color="green">Auto-Import</Badge>}
                {suggestion.status === 'confirmed' && <Badge color="green">Bestätigt</Badge>}
                {suggestion.status === 'spam' && <Badge color="red">Spam</Badge>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex justify-end gap-2">
                  {suggestion.status === 'pending' && (
                    <>
                      <Button
                        color="green"
                        onClick={() => handleConfirm(suggestion)}
                        disabled={processingId === suggestion.id}
                      >
                        <CheckCircleIcon className="size-4" />
                        Übernehmen
                      </Button>
                      <Button
                        color="red"
                        onClick={() => handleMarkSpam(suggestion)}
                        disabled={processingId === suggestion.id}
                      >
                        <ExclamationTriangleIcon className="size-4" />
                        Als Spam markieren
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {suggestions.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Keine Vorschläge gefunden</p>
        </div>
      )}
    </div>
  );
}
```

---

## 📋 Phase 5: Firebase Scheduled Functions (Crawler)

### 5.1 Daily Crawler Function

**Datei:** `functions/src/scheduled/monitoring-crawler.ts` (NEU)

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Parser from 'rss-parser';
import { CampaignMonitoringTracker, MonitoringSuggestion, MonitoringSource } from '../types/monitoring';
import { normalizeUrl } from '../utils/url-normalizer';

const db = admin.firestore();
const parser = new Parser();

/**
 * Daily Monitoring Crawler
 *
 * Läuft täglich um 06:00 Uhr
 * - Lädt alle aktiven Campaign Monitoring Trackers
 * - Crawlt RSS Feeds, Google News, Social Media
 * - Erstellt MonitoringSuggestions
 * - Auto-Import bei hoher Confidence
 */
export const dailyMonitoringCrawler = functions
  .region('europe-west1')
  .pubsub
  .schedule('0 6 * * *') // Täglich 06:00
  .timeZone('Europe/Berlin')
  .onRun(async (context) => {
    console.log('🤖 Starting daily monitoring crawler');

    try {
      // 1. Deaktiviere abgelaufene Tracker
      await deactivateExpiredTrackers();

      // 2. Lade alle aktiven Tracker
      const trackersSnapshot = await db
        .collection('campaign_monitoring_trackers')
        .where('isActive', '==', true)
        .where('endDate', '>', admin.firestore.Timestamp.now())
        .get();

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

      return {
        success: true,
        trackersProcessed: trackersSnapshot.size,
        totalArticlesFound,
        totalAutoConfirmed
      };
    } catch (error) {
      console.error('❌ Crawler failed:', error);
      throw error;
    }
  });

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
  const campaignDoc = await db.collection('pr_campaigns').doc(tracker.campaignId).get();
  const campaign = campaignDoc.data();

  if (!campaign) {
    console.error(`Campaign ${tracker.campaignId} not found`);
    return { articlesFound: 0, autoConfirmed: 0 };
  }

  const keywords = campaign.monitoringConfig?.keywords || [];
  const minMatchScore = campaign.monitoringConfig?.minMatchScore || 70;

  // Lade Spam Patterns
  const spamPatterns = await loadSpamPatterns(tracker.organizationId, tracker.campaignId);

  // Crawle jeden aktiven Channel
  for (const channel of tracker.channels) {
    if (!channel.isActive) continue;

    try {
      let sources: MonitoringSource[] = [];

      // RSS Feed Crawling
      if (channel.type === 'rss_feed') {
        sources = await crawlRssFeed(channel, keywords, minMatchScore);
      }

      // Google News Crawling
      if (channel.type === 'google_news') {
        sources = await crawlGoogleNews(channel, keywords, minMatchScore);
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
            await markChannelAsFound(tracker.id, channel.id);
          }
        }
      }

      // Update Channel lastChecked
      await updateChannelLastChecked(tracker.id, channel.id);

    } catch (error) {
      console.error(`Error crawling channel ${channel.id}:`, error);
      await updateChannelError(tracker.id, channel.id, error.message);
    }
  }

  // Update Tracker Statistics
  await db.collection('campaign_monitoring_trackers').doc(tracker.id).update({
    totalArticlesFound: admin.firestore.FieldValue.increment(articlesFound),
    totalAutoConfirmed: admin.firestore.FieldValue.increment(autoConfirmed),
    lastCrawlAt: admin.firestore.FieldValue.serverTimestamp(),
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
): Promise<MonitoringSource[]> {
  const sources: MonitoringSource[] = [];

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
          foundAt: admin.firestore.Timestamp.now(),
          publicationId: channel.publicationId,
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? admin.firestore.Timestamp.fromDate(new Date(item.pubDate)) : undefined
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
  keywords: string[],
  minMatchScore: number
): Promise<MonitoringSource[]> {
  const sources: MonitoringSource[] = [];

  try {
    // Google News RSS Feed URL ist bereits im Channel gespeichert
    // Format: https://news.google.com/rss/search?q=Tesla+Elektroauto&hl=de&gl=DE&ceid=DE:de
    const feed = await parser.parseURL(channel.url);

    for (const item of feed.items) {
      if (!item.link || !item.title) continue;

      // Keyword Matching
      const matchScore = calculateMatchScore(item.title, item.contentSnippet || '', keywords);

      // Google News: Höherer Mindest-Score (80 statt 50) wegen höherer False-Positive Rate
      if (matchScore >= 80) {
        sources.push({
          type: 'google_news',
          sourceName: 'Google News',
          sourceUrl: channel.url,
          matchScore,
          matchedKeywords: findMatchedKeywords(item.title, item.contentSnippet || '', keywords),
          foundAt: admin.firestore.Timestamp.now(),
          articleUrl: item.link,
          articleTitle: item.title,
          articleExcerpt: item.contentSnippet,
          publishedAt: item.pubDate ? admin.firestore.Timestamp.fromDate(new Date(item.pubDate)) : undefined
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
  source: MonitoringSource,
  spamPatterns: SpamPattern[],
  minMatchScore: number
): Promise<{ created: boolean; autoConfirmed: boolean }> {
  const normalized = normalizeUrl(source.articleUrl);

  // 1. Prüfe ob bereits vorhanden
  const existingQuery = await db
    .collection('monitoring_suggestions')
    .where('campaignId', '==', tracker.campaignId)
    .where('normalizedUrl', '==', normalized)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    // Update: Füge Source hinzu
    const existingDoc = existingQuery.docs[0];
    const existing = existingDoc.data() as MonitoringSuggestion;

    const updatedSources = [...existing.sources, source];
    const avgScore = updatedSources.reduce((sum, s) => sum + s.matchScore, 0) / updatedSources.length;
    const highestScore = Math.max(...updatedSources.map(s => s.matchScore));

    // Berechne neue Confidence
    const confidence = calculateConfidence(updatedSources.length, avgScore, highestScore);
    const shouldAutoConfirm = shouldAutoConfirmSuggestion(updatedSources.length, avgScore, highestScore, minMatchScore);

    await existingDoc.ref.update({
      sources: updatedSources,
      avgMatchScore: avgScore,
      highestMatchScore: highestScore,
      confidence,
      autoConfirmed: shouldAutoConfirm,
      status: shouldAutoConfirm ? 'auto_confirmed' : existing.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Falls Auto-Confirm: Erstelle Clipping
    if (shouldAutoConfirm && existing.status === 'pending') {
      await createClippingFromSuggestion(existingDoc.id, existing, tracker);
      return { created: false, autoConfirmed: true };
    }

    return { created: false, autoConfirmed: false };
  }

  // 2. Spam-Check
  const isSpam = checkSpamPatterns(source, spamPatterns);

  if (isSpam) {
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
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp
  };

  const newDoc = await db.collection('monitoring_suggestions').add(suggestionData);

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
 * Prüft Spam Patterns
 */
function checkSpamPatterns(source: MonitoringSource, patterns: SpamPattern[]): boolean {
  for (const pattern of patterns) {
    // Implementation siehe spamPatternService.checkForSpam
    // ...
  }
  return false;
}

/**
 * Erstellt Clipping aus Suggestion
 */
async function createClippingFromSuggestion(
  suggestionId: string,
  suggestion: MonitoringSuggestion,
  tracker: CampaignMonitoringTracker
): Promise<void> {
  // Lade Kampagne für projectId
  const campaignDoc = await db.collection('pr_campaigns').doc(tracker.campaignId).get();
  const campaign = campaignDoc.data();

  const clippingData = {
    organizationId: tracker.organizationId,
    campaignId: tracker.campaignId,
    projectId: campaign?.projectId,
    title: suggestion.articleTitle,
    url: suggestion.articleUrl,
    publishedAt: suggestion.sources[0].publishedAt || admin.firestore.Timestamp.now(),
    outletName: suggestion.sources[0].sourceName,
    outletType: 'online' as const,
    sentiment: 'neutral' as const,
    detectionMethod: 'automated' as const,
    detectedAt: admin.firestore.Timestamp.now(),
    createdBy: 'system-crawler',
    verifiedBy: 'system-auto-confirm',
    verifiedAt: admin.firestore.Timestamp.now(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const clippingRef = await db.collection('media_clippings').add(clippingData);

  // Update Suggestion mit clippingId
  await db.collection('monitoring_suggestions').doc(suggestionId).update({
    clippingId: clippingRef.id,
    autoConfirmedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✅ Auto-confirmed clipping created: ${clippingRef.id}`);
}

// Helper Functions für Channel Updates
async function markChannelAsFound(trackerId: string, channelId: string) { /* ... */ }
async function updateChannelLastChecked(trackerId: string, channelId: string) { /* ... */ }
async function updateChannelError(trackerId: string, channelId: string, error: string) { /* ... */ }
async function deactivateExpiredTrackers() { /* ... */ }
async function loadSpamPatterns(orgId: string, campaignId: string) { /* ... */ }
function calculateNextCrawl() { /* ... */ }
```

---

## 📋 Phase 6: Integration & Workflow

### 6.1 Campaign Creation Hook

**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`

**Integration Point:**

Nach erfolgreichem Campaign Save:

```typescript
// Nach Campaign-Erstellung
const campaignId = await prService.create(campaignData);

// Falls Monitoring aktiviert
if (formData.monitoringConfig?.isEnabled) {
  try {
    const trackerId = await campaignMonitoringService.createTrackerForCampaign(
      campaignId,
      currentOrganization.id
    );

    console.log(`✅ Monitoring Tracker created: ${trackerId}`);
  } catch (error) {
    console.error('Failed to create monitoring tracker:', error);
    // Non-blocking error - Campaign ist trotzdem erstellt
  }
}
```

### 6.2 Manual Publication Entry (bleibt unverändert)

Die bestehende manuelle Erfassung (`MarkPublishedModal.tsx`) funktioniert weiter wie bisher ohne Änderungen.

---

## 📋 Phase 7: Testing & Rollout

### 7.1 Testing Checklist

- [ ] Publication Type Migration Helper testen
- [ ] Publication Modal - Monitoring Tab UI testen
- [ ] Auto-Detect RSS Feed Funktion testen
- [ ] Campaign Monitoring Tracker Erstellung testen
- [ ] Channel-Liste korrekt aus Recipients generiert
- [ ] Spam Pattern Matching testen
- [ ] RSS Feed Crawler testen
- [ ] Multi-Source Duplicate Detection testen
- [ ] Auto-Confirm Logik testen
- [ ] Channel Deaktivierung nach Fund testen
- [ ] Manuelle Erfassung weiterhin funktioniert
- [ ] Clipping Archive Spam-Markierung testen

### 7.2 Rollout Plan

**Stufe 1: Backward-Compatible Types**
- Deploye Type-Änderungen
- Keine Breaking Changes
- Alte UIs funktionieren weiter

**Stufe 2: UI Updates**
- Publication Modal - Monitoring Tab
- Spam Blocklist Settings Page
- Test mit realen Publications

**Stufe 3: Services & Backend**
- Campaign Monitoring Service
- Spam Pattern Service
- Monitoring Suggestions Table
- Test mit Test-Kampagne

**Stufe 4: Crawler**
- Deploy Firebase Function
- Test mit kleiner Test-Kampagne
- Überwache Logs & Performance

**Stufe 5: Produktiv**
- Rollout für alle Kampagnen
- Monitoring & Optimierung

---

## 📋 Firestore Collections

### Neue Collections:

1. **`campaign_monitoring_trackers`**
   - Document ID: Auto-generated
   - Index: `campaignId`, `isActive`, `endDate`

2. **`monitoring_suggestions`**
   - Document ID: Auto-generated
   - Index: `campaignId`, `normalizedUrl`, `status`, `createdAt`

3. **`spam_patterns`**
   - Document ID: Auto-generated
   - Index: `organizationId`, `scope`, `isActive`

### Firestore Rules:

```javascript
// campaign_monitoring_trackers
match /campaign_monitoring_trackers/{trackerId} {
  allow read: if request.auth != null &&
    (resource.data.organizationId == request.auth.token.organizationId ||
     request.auth.token.role == 'superadmin');

  allow create: if request.auth != null;
  allow update: if request.auth != null &&
    resource.data.organizationId == request.auth.token.organizationId;
}

// monitoring_suggestions
match /monitoring_suggestions/{suggestionId} {
  allow read: if request.auth != null &&
    resource.data.organizationId == request.auth.token.organizationId;

  allow create: if request.auth != null;
  allow update: if request.auth != null &&
    resource.data.organizationId == request.auth.token.organizationId;
}

// spam_patterns
match /spam_patterns/{patternId} {
  allow read: if request.auth != null &&
    resource.data.organizationId == request.auth.token.organizationId;

  allow create, update, delete: if request.auth != null &&
    resource.data.organizationId == request.auth.token.organizationId;
}
```

---

## 🎯 Erfolgs-Kriterien

✅ **Funktional:**
- Publications haben Monitoring Tab
- RSS Auto-Detection funktioniert
- Campaign-Tracker wird automatisch bei Kampagnen-Erstellung generiert
- Crawler läuft täglich und findet Artikel
- Multi-Source Grouping funktioniert
- Auto-Confirm bei 2+ Sources
- Spam-Filter verhindert unerwünschte Vorschläge
- Channels werden nach Fund deaktiviert
- Manuelle Erfassung funktioniert weiterhin

✅ **Performance:**
- Crawler läuft in <5 Minuten für 100 Tracker
- Keine Performance-Probleme in bestehenden UIs
- Firestore Queries optimiert

✅ **UX:**
- Intuitiver Monitoring Tab in Publications
- Klare Darstellung von Multi-Source Suggestions
- Einfache Spam-Pattern Verwaltung

---

## 📝 Nächste Schritte

1. **Type-Erweiterungen** durchführen
2. **Helper Functions** implementieren
3. **Publication Modal** anpassen
4. **Services** implementieren
5. **UI Komponenten** erstellen
6. **Firebase Functions** deployen
7. **Testing** mit Test-Kampagne
8. **Produktiv-Rollout**

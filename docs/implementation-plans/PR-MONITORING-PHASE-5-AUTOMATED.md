# PR-Monitoring Phase 5: Automatische Artikel-Erkennung
## Google News RSS + RSS Feed Monitoring + Spam-Filter

**Status:** 📋 Planung
**Ziel:** Automatisches Finden von Veröffentlichungen ohne teure Monitoring-Services
**Wichtig:** Ergänzung zum manuellen Tracking, NICHT Ersatz!

---

## 🎯 Übersicht

### Was wird implementiert?
1. **Google News RSS Integration** - Findet Online-Artikel automatisch (KOSTENLOS)
2. **RSS Feed System** - User kann beliebige Feeds hinzufügen
3. **Multi-Source Matching** - Gruppierung wenn mehrere Quellen denselben Artikel finden
4. **Spam-Filter System** - 2-stufig (Kampagne + Global)
5. **Monitoring Suggestions UI** - Tab für Auto-gefundene Artikel
6. **Push-Benachrichtigungen** - Team-Benachrichtigung bei neuen Funden
7. **Firebase Scheduled Function** - Täglich automatisches Crawling

### Integration in bestehende Struktur
```
/dashboard/analytics/monitoring/[campaignId]
├── Tab: Analytics ✅ (vorhanden)
├── Tab: E-Mail Performance ✅ (vorhanden)
├── Tab: Empfänger & Veröffentlichungen ✅ (vorhanden - MANUELLES TRACKING)
├── Tab: Clipping-Archiv ✅ (vorhanden)
└── Tab: Vorschläge 🆕 (NEU) ← Hier landen Auto-Findings

/dashboard/settings/
└── monitoring-blocklist 🆕 (NEU) ← Globale Spam-Filter
```

---

## ⚠️ WICHTIG: Manuelle Erfassung bleibt primär!

**Das automatische Monitoring ERSETZT NICHT das manuelle Tracking!**

### Warum manuelle Erfassung weiterhin essentiell ist:
- ❌ Kleine Verlage haben oft **keinen RSS Feed**
- ❌ Fachpublikationen sind **nicht in Google News**
- ❌ Print-Medien müssen **manuell erfasst werden**
- ❌ Regional-Outlets sind oft **nicht online auffindbar**
- ❌ Spezial-Publikationen ohne Online-Präsenz

### Workflow-Kombination:
```
1. PRIMÄR: Manuelles Erfassen über "Als veröffentlicht markieren"
   └─> Für: Kleine Verlage, Print, Fachpublikationen, Regional-Medien

2. ZUSÄTZLICH: Automatische Vorschläge als Ergänzung
   └─> Für: Große Online-Portale, News-Sites, Blogs mit RSS

BEIDE WEGE → Gleiche MediaClippings im Clipping-Archiv
```

### Bestehende manuelle Erfassung (unverändert):
```typescript
// Tab: "Empfänger & Veröffentlichungen"
<RecipientTrackingList>
  <Button onClick={openMarkPublishedModal}>
    Als veröffentlicht markieren
  </Button>
</RecipientTrackingList>

<MarkPublishedModal>
  {/* User trägt manuell ein: */}
  - Artikel-URL
  - Titel
  - Outlet Name
  - Reichweite
  - Sentiment
  {/* → Erstellt MediaClipping */}
</MarkPublishedModal>
```

**Diese Funktionalität bleibt 100% unverändert und funktionsfähig!**

---

## 📊 Bestehende Struktur (Analyse)

### Komponenten
```
src/components/monitoring/
├── ClippingArchive.tsx ✅          # Zeigt Clippings in Tabelle
├── RecipientTrackingList.tsx ✅    # Empfänger mit "Als veröffentlicht markieren"
├── MarkPublishedModal.tsx ✅       # Modal zum manuellen Erfassen
├── EmailPerformanceStats.tsx ✅    # SendGrid Charts
└── MonitoringDashboard.tsx ✅      # Analytics Dashboard
```

### Services
```
src/lib/firebase/
├── clipping-service.ts ✅          # CRUD für Clippings
├── email-campaign-service.ts ✅    # E-Mail Sends
└── pr-service.ts ✅                # Kampagnen
```

### Datenmodell
```typescript
// src/types/monitoring.ts ✅
interface MediaClipping {
  id?: string;
  organizationId: string;
  campaignId?: string;
  title: string;
  url: string;
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  publishedAt: Timestamp;
  reach?: number;
  ave?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  detectionMethod: 'manual' | 'google_news' | 'rss' | 'web_scraping' | 'imported';
  // ... weitere Felder
}
```

---

## 🆕 Neue Datenstrukturen

### 1. Monitoring Suggestion (Multi-Source Gruppierung)

**Konzept:** Artikel werden **nach URL gruppiert**. Wenn mehrere Quellen (Google News + RSS Feeds) denselben Artikel finden, werden sie als eine Suggestion mit mehreren Sources angezeigt.

```typescript
// src/types/monitoring.ts - ERWEITERN
export interface MonitoringSuggestion {
  id?: string;
  organizationId: string;
  campaignId: string;

  // Artikel-Daten
  articleUrl: string; // UNIQUE KEY für Gruppierung
  normalizedUrl: string; // Für besseres Matching (ohne www., query params)
  articleTitle: string;
  articleExcerpt?: string;
  articleImage?: string;

  // 🆕 MULTI-SOURCE TRACKING
  sources: MonitoringSource[]; // Array von Quellen die diesen Artikel gefunden haben

  // Matching (aggregiert über alle Quellen)
  avgMatchScore: number; // Durchschnitt aller Quellen (0-100)
  highestMatchScore: number; // Beste Quelle
  matchedKeywords: string[]; // Alle gefundenen Keywords

  // Auto-Confirmation
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  autoConfirmed: boolean; // Wurde automatisch übernommen?

  // Status
  status: 'pending' | 'confirmed' | 'auto_confirmed' | 'spam';
  reviewedBy?: string; // userId
  reviewedAt?: Timestamp;

  // Falls bestätigt → ID des erstellten Clippings
  clippingId?: string;

  // Spam-Tracking
  spamMarkedBy?: string;
  spamMarkedAt?: Timestamp;
  spamReason?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 🆕 Source-Information für Multi-Source Tracking
export interface MonitoringSource {
  type: 'google_news' | 'rss_feed' | 'web_scraping';
  sourceName: string; // "Google News" oder RSS Feed Name
  sourceId?: string; // RSS Feed ID (falls RSS)
  matchScore: number; // 0-100 Score für diese Quelle
  foundAt: Timestamp;
  articleData?: {
    title?: string; // Falls Titel leicht abweicht
    excerpt?: string;
    image?: string;
  };
}
```

**Beispiel - Multi-Source Artikel:**
```typescript
{
  id: "sugg_123",
  articleUrl: "https://techcrunch.com/artikel-xyz",
  normalizedUrl: "techcrunch.com/artikel-xyz",
  articleTitle: "Neue KI-Lösung revolutioniert PR",

  sources: [
    {
      type: "google_news",
      sourceName: "Google News",
      matchScore: 85,
      foundAt: "2025-01-10 06:30"
    },
    {
      type: "rss_feed",
      sourceName: "PR-Portal.de",
      sourceId: "feed_456",
      matchScore: 92,
      foundAt: "2025-01-10 07:15"
    },
    {
      type: "rss_feed",
      sourceName: "Marketing-News.de",
      sourceId: "feed_789",
      matchScore: 78,
      foundAt: "2025-01-10 08:00"
    }
  ],

  avgMatchScore: 85,
  highestMatchScore: 92,
  confidence: "very_high",
  autoConfirmed: true, // 3 Quellen → Auto-Confirm!
  status: "auto_confirmed"
}
```

### 2. RSS Feed (Collection)

```typescript
// src/types/monitoring.ts - ERWEITERN
export interface RSSFeed {
  id?: string;
  organizationId: string;

  // Feed-Daten
  feedUrl: string;
  feedName: string;
  feedDescription?: string;
  isActive: boolean;

  // Monitoring-Einstellungen
  keywords: string[]; // Optionale Keyword-Filter
  checkFrequency: 'daily' | 'twice_daily' | 'hourly'; // Wie oft prüfen

  // Statistiken
  lastChecked?: Timestamp;
  lastArticleFound?: Timestamp;
  totalArticlesFound: number;
  errorCount: number;
  lastError?: string;

  // Metadaten
  createdBy: string; // userId
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3. Spam Pattern (2-Stufen System)

```typescript
// src/types/monitoring.ts - NEU
export interface SpamPattern {
  id?: string;
  organizationId: string;

  // Pattern-Daten
  type: 'url_domain' | 'keyword' | 'title_pattern';
  pattern: string; // z.B. "spam-news.com" oder "Werbung:"

  // Scope
  scope: 'campaign' | 'global'; // Kampagnen-spezifisch oder organisations-weit
  campaignId?: string; // Nur wenn scope = 'campaign'

  // Wie wurde es gelernt?
  learnedFrom: string[]; // IDs der Suggestions die als Spam markiert wurden
  confidence: number; // 0-100, basierend auf Anzahl False-Positives

  // Statistiken
  timesMatched: number;
  lastMatched?: Timestamp;

  // Aktiv/Inaktiv
  isActive: boolean;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. Monitoring Config (Pro Kampagne)

```typescript
// src/types/pr.ts - PRCampaign ERWEITERN
export interface PRCampaign {
  // ... bestehende Felder

  // 🆕 AUTOMATED MONITORING CONFIG
  monitoringConfig?: {
    isEnabled: boolean;
    monitoringPeriod: 30 | 90 | 365; // Tage nach Kampagnen-Start

    // Keywords für Auto-Suche
    keywords: string[]; // ["Firmenname", "Produktname", ...]

    // Aktivierte Quellen
    sources: {
      googleNews: boolean;
      rssFeeds: string[]; // IDs von RSSFeed-Dokumenten
    };

    // Auto-Confirm Settings
    autoConfirm: {
      enabled: boolean;
      minSources: number; // Default: 2
      minAvgScore: number; // Default: 75
    };

    // Spam-Filtering
    spamFiltering: {
      enabled: boolean;
      useGlobalBlocklist: boolean; // Globale Patterns nutzen?
      campaignPatterns: string[]; // IDs von SpamPattern (campaign-scope)
    };

    // Matching-Einstellungen
    minMatchScore: number; // 60-100, ab wann Vorschlag zeigen
  };
}
```

---

## 🧠 Auto-Confirmation Logic (Aggressiv)

### Ziel: User so viel Arbeit wie möglich abnehmen!

**Nur bei schwachen Scores ist manuelle Prüfung nötig.**

```typescript
function calculateAutoConfirm(suggestion: MonitoringSuggestion): {
  shouldAutoConfirm: boolean;
  confidence: 'low' | 'medium' | 'high' | 'very_high';
} {
  const sourceCount = suggestion.sources.length;
  const avgScore = suggestion.avgMatchScore;
  const highestScore = suggestion.highestMatchScore;

  // ✅ SEHR SICHER: 2+ Quellen → Sofort übernehmen
  if (sourceCount >= 2) {
    return {
      shouldAutoConfirm: true,
      confidence: 'very_high'
    };
  }

  // ✅ SICHER: 1 Quelle mit sehr hohem Score
  if (sourceCount === 1 && avgScore >= 85) {
    return {
      shouldAutoConfirm: true,
      confidence: 'high'
    };
  }

  // ⚠️ MITTEL: 1 Quelle, mittlerer Score → Manuelle Prüfung
  if (sourceCount === 1 && avgScore >= 70) {
    return {
      shouldAutoConfirm: false,
      confidence: 'medium'
    };
  }

  // ⚠️ NIEDRIG: Schwacher Score → Manuelle Prüfung
  return {
    shouldAutoConfirm: false,
    confidence: 'low'
  };
}
```

### Beispiele:

| Quellen | Avg Score | Aktion | Grund |
|---------|-----------|--------|-------|
| 3 | 65% | ✅ Auto-Confirm | 3 Quellen = sehr sicher |
| 2 | 50% | ✅ Auto-Confirm | 2 Quellen = sicher |
| 1 | 92% | ✅ Auto-Confirm | Sehr hoher Score |
| 1 | 75% | ⚠️ Manual | Mittlerer Score, nur 1 Quelle |
| 1 | 55% | ⚠️ Manual | Schwacher Score |

---

## 🚫 2-Stufen Spam-Filter System

### Stufe 1: Kampagnen-spezifischer Spam-Filter

**Use Case:** User markiert Artikel als Spam in Kampagne X
**Effekt:** Pattern wird für diese Kampagne gelernt

```typescript
// Workflow
1. User sieht Suggestion in Kampagne X
2. Klickt "Als Spam markieren"
3. Dialog: "Pattern lernen?"
   ☑️ Domain "spam-news.de" blockieren
   ☐ Keyword "Werbung:" blockieren
4. SpamPattern wird erstellt mit scope: 'campaign'
5. Nächstes Crawling für Kampagne X
   → Artikel von "spam-news.de" werden ignoriert
```

### Stufe 2: Globale Spam-Blocklist

**Use Case:** Organisation-weite Spam-Domains/Keywords blockieren
**Effekt:** Gilt für ALLE Kampagnen, Artikel werden gar nicht erst gefunden

**Settings-Seite:** `/dashboard/settings/monitoring-blocklist`

```typescript
// Globale Blocklist UI
┌─────────────────────────────────────────────────────────┐
│ 🚫 Globale Monitoring-Blocklist                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Diese Patterns werden bei ALLEN Kampagnen gefiltert:   │
│                                                         │
│ 🌐 BLOCKIERTE DOMAINS:                                 │
│ ├─ spam-news.de          [Deaktivieren] [Löschen]     │
│ ├─ werbung-portal.com    [Deaktivieren] [Löschen]     │
│ └─ [+ Domain hinzufügen]                               │
│                                                         │
│ 🔤 BLOCKIERTE KEYWORDS:                                │
│ ├─ "Werbung:"            [Deaktivieren] [Löschen]     │
│ ├─ "Anzeige -"          [Deaktivieren] [Löschen]     │
│ └─ [+ Keyword hinzufügen]                              │
│                                                         │
│ 📊 STATISTIK:                                          │
│ Insgesamt 156 Artikel durch Blocklist gefiltert       │
└─────────────────────────────────────────────────────────┘
```

**Integration im Crawling:**
```typescript
async function crawlAndFilter(campaign, articles) {
  // 1. Lade globale Blocklist
  const globalPatterns = await getGlobalSpamPatterns(campaign.organizationId);

  // 2. Lade kampagnen-spezifische Patterns
  const campaignPatterns = await getCampaignSpamPatterns(campaign.id);

  // 3. Filtere Artikel
  const filtered = articles.filter(article => {
    // Prüfe gegen globale Patterns
    if (matchesSpamPattern(article, globalPatterns)) {
      console.log(`🚫 Blocked by global pattern: ${article.url}`);
      return false;
    }

    // Prüfe gegen kampagnen-spezifische Patterns
    if (matchesSpamPattern(article, campaignPatterns)) {
      console.log(`🚫 Blocked by campaign pattern: ${article.url}`);
      return false;
    }

    return true;
  });

  return filtered;
}
```

### Edge-Case: Auto-Confirmed → Spam

**Problem:** Artikel wurde automatisch übernommen, ist aber Spam!

```typescript
// Workflow
1. Artikel wird auto-confirmed (2+ Quellen, Score 85%)
   → Clipping "clip_123" wird erstellt
   → Status: 'auto_confirmed'

2. User sieht Clipping im Clipping-Archiv
   → "Das ist Spam!"

3. User klickt "Als Spam markieren" (im Clipping-Archiv)

4. System:
   - Lösche Clipping 'clip_123'
   - Update Suggestion status → 'spam'
   - Korrigiere Statistiken (Anzahl Clippings -1)
   - Dialog: "Pattern lernen?"

5. Optional: Pattern wird gelernt
   → Zukünftige Artikel dieser Domain werden gefiltert
```

**Statistik-Korrektur:**
```typescript
async function markClippingAsSpam(clippingId: string, suggestionId: string) {
  const clipping = await clippingService.getById(clippingId);

  // Lösche Clipping
  await clippingService.delete(clippingId, {
    reason: 'marked_as_spam'
  });

  // Update Campaign Stats (Clipping-Count -1)
  await updateCampaignStats(clipping.campaignId, {
    totalClippings: -1,
    totalReach: -(clipping.reach || 0)
  });

  // Update Suggestion
  await monitoringSuggestionsService.update(suggestionId, {
    status: 'spam',
    clippingId: null
  });
}
```

---

## 📲 Push-Benachrichtigungen

### Trigger: 1 Benachrichtigung pro URL (beim ersten Fund)

**Wichtig:**
- ✅ **1 neue URL** = 1 Push-Benachrichtigung
- ❌ **NICHT** für jede weitere Quelle die dieselbe URL bestätigt
- ✅ **6 verschiedene URLs** = 6 Push-Benachrichtigungen

```typescript
async function createSuggestion(article, campaign, source) {
  // Prüfe ob URL schon existiert
  const existing = await db.collection('monitoring_suggestions')
    .where('normalizedUrl', '==', normalizeUrl(article.url))
    .where('campaignId', '==', campaign.id)
    .limit(1)
    .get();

  if (existing.empty) {
    // NEU: Erste Quelle für diese URL
    const suggestionId = await createNewSuggestion(article, campaign, source);

    // 📲 PUSH-BENACHRICHTIGUNG SENDEN
    await sendPushNotification({
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      title: "Neue Veröffentlichung gefunden",
      body: `"${article.title}" wurde automatisch erkannt`,
      url: `/dashboard/analytics/monitoring/${campaign.id}?tab=suggestions`,
      recipients: getTeamMembers(campaign)
    });

  } else {
    // BESTEHENDES: Füge weitere Quelle hinzu
    const suggestion = existing.docs[0].data();
    await addSourceToSuggestion(suggestion.id, source);

    // ❌ KEINE Push-Benachrichtigung (nur zusätzliche Quelle)
  }
}
```

**Benachrichtigungs-Format:**
```
┌─────────────────────────────────────────┐
│ 🔔 Neue Veröffentlichung gefunden      │
├─────────────────────────────────────────┤
│ Kampagne: "Produktlaunch Q1 2025"     │
│                                         │
│ "TechCrunch berichtet über neue        │
│  KI-Lösung von Firma X"                │
│                                         │
│ 📰 Google News | Score: 85%            │
│                                         │
│ [Jetzt prüfen]                         │
└─────────────────────────────────────────┘
```

**Batching bei vielen Artikeln:**
```typescript
// Wenn innerhalb 1 Stunde 5+ Artikel gefunden werden
if (newSuggestionsLastHour >= 5) {
  // Sende zusammengefasste Benachrichtigung
  await sendPushNotification({
    title: "5 neue Veröffentlichungen gefunden",
    body: `${campaign.title} - Jetzt prüfen`,
    // ...
  });
} else {
  // Einzelne Benachrichtigungen
  for (const suggestion of newSuggestions) {
    await sendPushNotification({ /* ... */ });
  }
}
```

---

## 🔧 Neue Services

### 1. Monitoring Suggestions Service (mit Multi-Source)

**Datei:** `src/lib/firebase/monitoring-suggestions-service.ts`

```typescript
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp, arrayUnion } from 'firebase/firestore';
import { MonitoringSuggestion, MonitoringSource } from '@/types/monitoring';

class MonitoringSuggestionsService {
  private collectionName = 'monitoring_suggestions';

  /**
   * Erstellt neue Suggestion ODER fügt Source zu bestehender hinzu
   */
  async createOrAddSource(
    article: {
      url: string;
      title: string;
      excerpt?: string;
      image?: string;
    },
    campaignId: string,
    source: MonitoringSource,
    keywords: string[],
    context: { organizationId: string }
  ): Promise<{ suggestionId: string; isNew: boolean }> {
    const normalizedUrl = this.normalizeUrl(article.url);

    // Prüfe ob URL bereits existiert
    const q = query(
      collection(db, this.collectionName),
      where('normalizedUrl', '==', normalizedUrl),
      where('campaignId', '==', campaignId)
    );

    const existing = await getDocs(q);

    if (!existing.empty) {
      // Füge Source zu bestehendem Suggestion hinzu
      const suggestionDoc = existing.docs[0];
      const suggestion = suggestionDoc.data() as MonitoringSuggestion;

      // Update mit neuer Source
      const updatedSources = [...suggestion.sources, source];
      const avgScore = this.calculateAvgScore(updatedSources);
      const highestScore = Math.max(...updatedSources.map(s => s.matchScore));
      const confidence = this.calculateConfidence(updatedSources, avgScore);
      const autoConfirm = this.shouldAutoConfirm(updatedSources, avgScore);

      await updateDoc(doc(db, this.collectionName, suggestionDoc.id), {
        sources: updatedSources,
        avgMatchScore: avgScore,
        highestMatchScore: highestScore,
        confidence,
        autoConfirmed: autoConfirm,
        status: autoConfirm ? 'auto_confirmed' : 'pending',
        updatedAt: Timestamp.now()
      });

      // Falls Auto-Confirm aktiviert → Erstelle Clipping
      if (autoConfirm && suggestion.status === 'pending') {
        await this.autoCreateClipping(suggestionDoc.id, suggestion, context);
      }

      return { suggestionId: suggestionDoc.id, isNew: false };
    } else {
      // Erstelle neue Suggestion
      const matchScore = source.matchScore;
      const confidence = this.calculateConfidence([source], matchScore);
      const autoConfirm = this.shouldAutoConfirm([source], matchScore);

      const docRef = await addDoc(collection(db, this.collectionName), {
        organizationId: context.organizationId,
        campaignId,
        articleUrl: article.url,
        normalizedUrl,
        articleTitle: article.title,
        articleExcerpt: article.excerpt,
        articleImage: article.image,
        sources: [source],
        avgMatchScore: matchScore,
        highestMatchScore: matchScore,
        matchedKeywords: keywords,
        confidence,
        autoConfirmed: autoConfirm,
        status: autoConfirm ? 'auto_confirmed' : 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Falls Auto-Confirm aktiviert → Erstelle Clipping
      if (autoConfirm) {
        await this.autoCreateClipping(docRef.id, {
          articleUrl: article.url,
          articleTitle: article.title,
          articleExcerpt: article.excerpt,
          matchedKeywords: keywords,
          campaignId
        } as MonitoringSuggestion, context);
      }

      return { suggestionId: docRef.id, isNew: true };
    }
  }

  /**
   * Holt alle Vorschläge für eine Kampagne (gruppiert nach Status)
   */
  async getByCampaignId(
    campaignId: string,
    context: { organizationId: string }
  ): Promise<{
    pending: MonitoringSuggestion[];
    autoConfirmed: MonitoringSuggestion[];
    spam: MonitoringSuggestion[];
  }> {
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', context.organizationId),
      where('campaignId', '==', campaignId)
    );

    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MonitoringSuggestion));

    return {
      pending: all.filter(s => s.status === 'pending'),
      autoConfirmed: all.filter(s => s.status === 'auto_confirmed'),
      spam: all.filter(s => s.status === 'spam')
    };
  }

  /**
   * Bestätigt Vorschlag manuell → erstellt Clipping
   */
  async confirm(
    suggestionId: string,
    userId: string,
    clippingData: {
      outletName: string;
      outletType: 'print' | 'online' | 'broadcast' | 'blog';
      reach?: number;
      sentiment: 'positive' | 'neutral' | 'negative';
    },
    context: { organizationId: string }
  ): Promise<string> {
    const suggestionDoc = await getDocs(
      query(collection(db, this.collectionName), where('__name__', '==', suggestionId))
    );

    if (suggestionDoc.empty) {
      throw new Error('Suggestion not found');
    }

    const suggestion = suggestionDoc.docs[0].data() as MonitoringSuggestion;

    // Erstelle Clipping
    const { clippingService } = await import('./clipping-service');
    const clippingId = await clippingService.create({
      organizationId: context.organizationId,
      campaignId: suggestion.campaignId,
      title: suggestion.articleTitle,
      url: suggestion.articleUrl,
      excerpt: suggestion.articleExcerpt,
      outletName: clippingData.outletName,
      outletType: clippingData.outletType,
      reach: clippingData.reach,
      sentiment: clippingData.sentiment,
      publishedAt: suggestion.sources[0].foundAt,
      detectionMethod: suggestion.sources[0].type,
      detectedAt: suggestion.createdAt,
      tags: suggestion.matchedKeywords
    }, context);

    // Update Suggestion Status
    await updateDoc(doc(db, this.collectionName, suggestionId), {
      status: 'confirmed',
      reviewedBy: userId,
      reviewedAt: Timestamp.now(),
      clippingId,
      updatedAt: Timestamp.now()
    });

    return clippingId;
  }

  /**
   * Markiert als Spam (löscht Clipping falls vorhanden)
   */
  async markAsSpam(
    suggestionId: string,
    userId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    hadClipping: boolean;
    suggestion: MonitoringSuggestion;
  }> {
    const suggestionDoc = await getDocs(
      query(collection(db, this.collectionName), where('__name__', '==', suggestionId))
    );

    if (suggestionDoc.empty) {
      throw new Error('Suggestion not found');
    }

    const suggestion = suggestionDoc.docs[0].data() as MonitoringSuggestion;
    let hadClipping = false;

    // Falls Clipping erstellt wurde → LÖSCHEN
    if (suggestion.clippingId) {
      const { clippingService } = await import('./clipping-service');
      await clippingService.delete(suggestion.clippingId, {
        userId,
        organizationId: suggestion.organizationId,
        reason: 'marked_as_spam'
      });
      hadClipping = true;
    }

    // Update Suggestion
    await updateDoc(doc(db, this.collectionName, suggestionId), {
      status: 'spam',
      spamMarkedBy: userId,
      spamMarkedAt: Timestamp.now(),
      spamReason: reason,
      clippingId: null,
      updatedAt: Timestamp.now()
    });

    return {
      success: true,
      hadClipping,
      suggestion
    };
  }

  // Helper Functions
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname.replace('www.', '')}${parsed.pathname}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  private calculateAvgScore(sources: MonitoringSource[]): number {
    const sum = sources.reduce((acc, s) => acc + s.matchScore, 0);
    return Math.round(sum / sources.length);
  }

  private calculateConfidence(
    sources: MonitoringSource[],
    avgScore: number
  ): 'low' | 'medium' | 'high' | 'very_high' {
    if (sources.length >= 2) return 'very_high';
    if (sources.length === 1 && avgScore >= 85) return 'high';
    if (sources.length === 1 && avgScore >= 70) return 'medium';
    return 'low';
  }

  private shouldAutoConfirm(sources: MonitoringSource[], avgScore: number): boolean {
    // 2+ Quellen → Immer Auto-Confirm
    if (sources.length >= 2) return true;

    // 1 Quelle mit sehr hohem Score
    if (sources.length === 1 && avgScore >= 85) return true;

    return false;
  }

  private async autoCreateClipping(
    suggestionId: string,
    suggestion: MonitoringSuggestion,
    context: { organizationId: string }
  ): Promise<string> {
    const { clippingService } = await import('./clipping-service');

    // Auto-Detect Outlet-Typ basierend auf URL
    const outletType = this.detectOutletType(suggestion.articleUrl);

    const clippingId = await clippingService.create({
      organizationId: context.organizationId,
      campaignId: suggestion.campaignId,
      title: suggestion.articleTitle,
      url: suggestion.articleUrl,
      excerpt: suggestion.articleExcerpt,
      outletName: this.extractOutletName(suggestion.articleUrl),
      outletType,
      sentiment: 'neutral', // Default
      publishedAt: suggestion.sources[0].foundAt,
      detectionMethod: suggestion.sources[0].type,
      detectedAt: suggestion.createdAt,
      tags: suggestion.matchedKeywords
    }, context);

    // Update Suggestion mit Clipping-ID
    await updateDoc(doc(db, this.collectionName, suggestionId), {
      clippingId,
      updatedAt: Timestamp.now()
    });

    return clippingId;
  }

  private extractOutletName(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unbekannt';
    }
  }

  private detectOutletType(url: string): 'online' | 'blog' | 'broadcast' | 'print' {
    const hostname = this.extractOutletName(url).toLowerCase();

    if (hostname.includes('blog') || hostname.includes('medium.com')) return 'blog';
    if (hostname.includes('radio') || hostname.includes('tv')) return 'broadcast';

    return 'online'; // Default
  }
}

export const monitoringSuggestionsService = new MonitoringSuggestionsService();
```

### 2. Spam Pattern Service

**Datei:** `src/lib/firebase/spam-pattern-service.ts`

```typescript
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { SpamPattern } from '@/types/monitoring';

class SpamPatternService {
  private collectionName = 'spam_patterns';

  /**
   * Erstellt neues Spam-Pattern
   */
  async create(
    pattern: Omit<SpamPattern, 'id' | 'createdAt' | 'updatedAt' | 'timesMatched'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...pattern,
      organizationId: context.organizationId,
      createdBy: context.userId,
      timesMatched: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  }

  /**
   * Holt alle Patterns (global + kampagnen-spezifisch)
   */
  async getPatterns(
    context: { organizationId: string; campaignId?: string }
  ): Promise<{
    global: SpamPattern[];
    campaign: SpamPattern[];
  }> {
    const qGlobal = query(
      collection(db, this.collectionName),
      where('organizationId', '==', context.organizationId),
      where('scope', '==', 'global'),
      where('isActive', '==', true)
    );

    const globalSnap = await getDocs(qGlobal);
    const global = globalSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SpamPattern));

    let campaign: SpamPattern[] = [];
    if (context.campaignId) {
      const qCampaign = query(
        collection(db, this.collectionName),
        where('organizationId', '==', context.organizationId),
        where('scope', '==', 'campaign'),
        where('campaignId', '==', context.campaignId),
        where('isActive', '==', true)
      );

      const campaignSnap = await getDocs(qCampaign);
      campaign = campaignSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SpamPattern));
    }

    return { global, campaign };
  }

  /**
   * Prüft ob Artikel gegen Patterns matcht
   */
  async checkIfSpam(
    article: { url: string; title: string },
    context: { organizationId: string; campaignId: string }
  ): Promise<{
    isSpam: boolean;
    matchedPattern?: SpamPattern;
  }> {
    const patterns = await this.getPatterns(context);
    const allPatterns = [...patterns.global, ...patterns.campaign];

    for (const pattern of allPatterns) {
      const matches = this.matchesPattern(article, pattern);
      if (matches) {
        // Erhöhe Match-Counter
        await this.incrementMatchCount(pattern.id!);

        return { isSpam: true, matchedPattern: pattern };
      }
    }

    return { isSpam: false };
  }

  /**
   * Löscht Pattern
   */
  async delete(patternId: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, patternId));
  }

  /**
   * Deaktiviert Pattern (soft delete)
   */
  async deactivate(patternId: string): Promise<void> {
    await updateDoc(doc(db, this.collectionName, patternId), {
      isActive: false,
      updatedAt: Timestamp.now()
    });
  }

  // Helper Functions
  private matchesPattern(
    article: { url: string; title: string },
    pattern: SpamPattern
  ): boolean {
    try {
      switch (pattern.type) {
        case 'url_domain':
          const hostname = new URL(article.url).hostname.replace('www.', '');
          return hostname === pattern.pattern;

        case 'keyword':
          return article.title.toLowerCase().includes(pattern.pattern.toLowerCase());

        case 'title_pattern':
          const regex = new RegExp(pattern.pattern, 'i');
          return regex.test(article.title);

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async incrementMatchCount(patternId: string): Promise<void> {
    const patternDoc = await getDocs(
      query(collection(db, this.collectionName), where('__name__', '==', patternId))
    );

    if (!patternDoc.empty) {
      const current = patternDoc.docs[0].data() as SpamPattern;
      await updateDoc(doc(db, this.collectionName, patternId), {
        timesMatched: (current.timesMatched || 0) + 1,
        lastMatched: Timestamp.now()
      });
    }
  }
}

export const spamPatternService = new SpamPatternService();
```

### 3. RSS Feed Service

**Datei:** `src/lib/firebase/rss-feed-service.ts`

```typescript
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { RSSFeed } from '@/types/monitoring';

class RSSFeedService {
  private collectionName = 'rss_feeds';

  async create(
    feed: Omit<RSSFeed, 'id' | 'createdAt' | 'updatedAt' | 'totalArticlesFound' | 'errorCount'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...feed,
      organizationId: context.organizationId,
      createdBy: context.userId,
      totalArticlesFound: 0,
      errorCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getAll(
    context: { organizationId: string }
  ): Promise<RSSFeed[]> {
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', context.organizationId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RSSFeed));
  }

  async getActive(
    context: { organizationId: string }
  ): Promise<RSSFeed[]> {
    const q = query(
      collection(db, this.collectionName),
      where('organizationId', '==', context.organizationId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RSSFeed));
  }

  async update(
    feedId: string,
    updates: Partial<RSSFeed>
  ): Promise<void> {
    const feedRef = doc(db, this.collectionName, feedId);
    await updateDoc(feedRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  async delete(feedId: string): Promise<void> {
    const feedRef = doc(db, this.collectionName, feedId);
    await deleteDoc(feedRef);
  }
}

export const rssFeedService = new RSSFeedService();
```

---

## 🎨 Neue UI-Komponenten

### 1. Monitoring Suggestions Component (Multi-Source UI)

**Datei:** `src/components/monitoring/MonitoringSuggestions.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { MonitoringSuggestion } from '@/types/monitoring';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { CheckCircleIcon, XMarkIcon, LinkIcon, SparklesIcon, NewspaperIcon, RssIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface MonitoringSuggestionsProps {
  campaignId: string;
  onSuggestionConfirmed: () => void;
}

export function MonitoringSuggestions({
  campaignId,
  onSuggestionConfirmed
}: MonitoringSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<{
    pending: MonitoringSuggestion[];
    autoConfirmed: MonitoringSuggestion[];
  }>({ pending: [], autoConfirmed: [] });

  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSpamModal, setShowSpamModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MonitoringSuggestion | null>(null);

  // Form State für Confirm Modal
  const [outletName, setOutletName] = useState('');
  const [outletType, setOutletType] = useState<'online' | 'print' | 'broadcast' | 'blog'>('online');
  const [reach, setReach] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('positive');

  // Spam Modal State
  const [learnDomain, setLearnDomain] = useState(false);
  const [learnKeyword, setLearnKeyword] = useState(false);
  const [spamScope, setSpamScope] = useState<'campaign' | 'global'>('campaign');

  useEffect(() => {
    loadSuggestions();
  }, [campaignId]);

  const loadSuggestions = async () => {
    // TODO: Service implementieren
    setLoading(false);
  };

  const handleConfirm = async (suggestion: MonitoringSuggestion) => {
    setSelectedSuggestion(suggestion);
    setOutletName(extractOutletName(suggestion.articleUrl));
    setShowConfirmModal(true);
  };

  const handleMarkAsSpam = async (suggestion: MonitoringSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowSpamModal(true);
  };

  const submitSpamMarkup = async () => {
    if (!selectedSuggestion) return;

    // TODO: Service-Call zum Spam markieren
    // TODO: Optional Pattern lernen (learnDomain, learnKeyword, spamScope)

    setShowSpamModal(false);
    loadSuggestions();
  };

  const submitConfirmation = async () => {
    // TODO: Service-Call zum Bestätigen
    setShowConfirmModal(false);
    onSuggestionConfirmed();
  };

  const extractOutletName = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const extractDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'zinc';
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      very_high: 'green',
      high: 'blue',
      medium: 'yellow',
      low: 'zinc'
    };
    const labels = {
      very_high: 'Sehr sicher',
      high: 'Sicher',
      medium: 'Mittel',
      low: 'Unsicher'
    };
    return <Badge color={colors[confidence as keyof typeof colors]}>
      {labels[confidence as keyof typeof labels]}
    </Badge>;
  };

  const getSourceIcon = (type: string) => {
    if (type === 'google_news') return <NewspaperIcon className="h-4 w-4" />;
    if (type === 'rss_feed') return <RssIcon className="h-4 w-4" />;
    return <LinkIcon className="h-4 w-4" />;
  };

  if (loading) {
    return <Text>Lade Vorschläge...</Text>;
  }

  const totalPending = suggestions.pending.length;
  const totalAutoConfirmed = suggestions.autoConfirmed.length;

  return (
    <div className="space-y-6">
      {/* Auto-Confirmed Section */}
      {totalAutoConfirmed > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-green-600" />
            <Subheading>⚡ Automatisch übernommen ({totalAutoConfirmed})</Subheading>
          </div>
          <Text className="text-sm text-gray-600">
            Diese Artikel wurden automatisch erfasst (2+ Quellen oder Score {'>'} 85%).
            Clippings wurden erstellt.
          </Text>

          <div className="space-y-3">
            {suggestions.autoConfirmed.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge color="green">✓ Übernommen</Badge>
                      {getConfidenceBadge(suggestion.confidence)}
                      <Badge color={getMatchScoreColor(suggestion.avgMatchScore)}>
                        {suggestion.avgMatchScore}% Match
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">
                      {suggestion.articleTitle}
                    </h3>

                    {suggestion.articleExcerpt && (
                      <Text className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {suggestion.articleExcerpt}
                      </Text>
                    )}

                    {/* Multi-Source Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <Text className="text-xs text-gray-500">Quellen:</Text>
                      {suggestion.sources.map((source, i) => (
                        <Badge key={i} color="blue" className="text-xs flex items-center gap-1">
                          {getSourceIcon(source.type)}
                          {source.sourceName} ({source.matchScore}%)
                        </Badge>
                      ))}
                    </div>

                    <a
                      href={suggestion.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Artikel ansehen
                    </a>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      color="green"
                      outline
                      onClick={() => {
                        // Navigate to Clipping
                        window.location.href = `/dashboard/analytics/monitoring/${campaignId}?tab=clippings`;
                      }}
                    >
                      Clipping ansehen
                    </Button>
                    <Button
                      color="red"
                      outline
                      onClick={() => handleMarkAsSpam(suggestion)}
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Als Spam
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          <Subheading>⏳ Warten auf Prüfung ({totalPending})</Subheading>
        </div>

        {totalPending === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <Text className="text-gray-500">
              Keine neuen Vorschläge. Das System durchsucht täglich automatisch nach Veröffentlichungen.
            </Text>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.pending.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getConfidenceBadge(suggestion.confidence)}
                      <Badge color={getMatchScoreColor(suggestion.avgMatchScore)}>
                        {suggestion.avgMatchScore}% Match
                      </Badge>
                      <Text className="text-xs text-gray-500">
                        vor {getTimeAgo(suggestion.createdAt)}
                      </Text>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">
                      {suggestion.articleTitle}
                    </h3>

                    {suggestion.articleExcerpt && (
                      <Text className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {suggestion.articleExcerpt}
                      </Text>
                    )}

                    {/* Multi-Source Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <Text className="text-xs text-gray-500">
                        {suggestion.sources.length === 1 ? 'Quelle:' : `${suggestion.sources.length} Quellen:`}
                      </Text>
                      {suggestion.sources.map((source, i) => (
                        <Badge key={i} color="zinc" className="text-xs flex items-center gap-1">
                          {getSourceIcon(source.type)}
                          {source.sourceName} ({source.matchScore}%)
                        </Badge>
                      ))}
                    </div>

                    {/* Matched Keywords */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {suggestion.matchedKeywords.map((kw, i) => (
                        <Badge key={i} color="blue" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>

                    <a
                      href={suggestion.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Artikel ansehen
                    </a>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      color="green"
                      onClick={() => handleConfirm(suggestion)}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Übernehmen
                    </Button>
                    <Button
                      color="red"
                      outline
                      onClick={() => handleMarkAsSpam(suggestion)}
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      Spam
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <DialogTitle>Veröffentlichung bestätigen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medium/Outlet
              </label>
              <Input
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                placeholder="z.B. Süddeutsche Zeitung"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medium-Typ
              </label>
              <Select
                value={outletType}
                onChange={(e) => setOutletType(e.target.value as any)}
              >
                <option value="online">Online</option>
                <option value="print">Print</option>
                <option value="broadcast">Broadcast</option>
                <option value="blog">Blog</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reichweite (optional)
              </label>
              <Input
                type="number"
                value={reach}
                onChange={(e) => setReach(e.target.value)}
                placeholder="z.B. 1000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sentiment
              </label>
              <Select
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value as any)}
              >
                <option value="positive">Positiv</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negativ</option>
              </Select>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowConfirmModal(false)}>
            Abbrechen
          </Button>
          <Button color="green" onClick={submitConfirmation}>
            Bestätigen & Clipping erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Spam Modal mit Pattern-Learning */}
      <Dialog open={showSpamModal} onClose={() => setShowSpamModal(false)}>
        <DialogTitle>Als Spam markieren</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <Text>
              Dieser Artikel wird als Spam markiert.
              {selectedSuggestion?.clippingId && (
                <strong className="block mt-2 text-red-600">
                  ⚠️ Das bereits erstellte Clipping wird gelöscht!
                </strong>
              )}
            </Text>

            <div className="border-t pt-4">
              <Subheading className="mb-2">Spam-Pattern lernen?</Subheading>
              <Text className="text-sm text-gray-600 mb-3">
                Zukünftig automatisch filtern:
              </Text>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={learnDomain}
                    onChange={(e) => setLearnDomain(e.target.checked)}
                    className="rounded"
                  />
                  <Text>
                    Domain blockieren: <strong>{selectedSuggestion ? extractDomain(selectedSuggestion.articleUrl) : ''}</strong>
                  </Text>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={learnKeyword}
                    onChange={(e) => setLearnKeyword(e.target.checked)}
                    className="rounded"
                  />
                  <Text>
                    Keyword-Pattern lernen (manuelle Eingabe nach Bestätigung)
                  </Text>
                </label>
              </div>

              {(learnDomain || learnKeyword) && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pattern-Scope
                  </label>
                  <Select
                    value={spamScope}
                    onChange={(e) => setSpamScope(e.target.value as 'campaign' | 'global')}
                  >
                    <option value="campaign">Nur diese Kampagne</option>
                    <option value="global">Alle Kampagnen (Global)</option>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowSpamModal(false)}>
            Abbrechen
          </Button>
          <Button color="red" onClick={submitSpamMarkup}>
            Als Spam markieren
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function getTimeAgo(timestamp: any): string {
  if (!timestamp?.toDate) return 'unbekannt';

  const now = new Date();
  const past = timestamp.toDate();
  const diffMs = now.getTime() - past.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'weniger als 1 Stunde';
  if (diffHours < 24) return `${diffHours} Stunden`;
  if (diffDays < 7) return `${diffDays} Tagen`;
  return past.toLocaleDateString('de-DE');
}
```

### 2. Globale Spam-Blocklist Settings Page

**Datei:** `src/app/dashboard/settings/monitoring-blocklist/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { SpamPattern } from '@/types/monitoring';

export default function MonitoringBlocklistPage() {
  const [patterns, setPatterns] = useState<SpamPattern[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [patternType, setPatternType] = useState<'url_domain' | 'keyword'>('url_domain');
  const [patternValue, setPatternValue] = useState('');
  const [totalFiltered, setTotalFiltered] = useState(0);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    // TODO: Service-Call
  };

  const handleAddPattern = async () => {
    // TODO: Service-Call
    setShowAddModal(false);
    setPatternValue('');
    loadPatterns();
  };

  const handleDeletePattern = async (patternId: string) => {
    // TODO: Service-Call
    loadPatterns();
  };

  const handleDeactivatePattern = async (patternId: string) => {
    // TODO: Service-Call
    loadPatterns();
  };

  const domainPatterns = patterns.filter(p => p.type === 'url_domain');
  const keywordPatterns = patterns.filter(p => p.type === 'keyword');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading>🚫 Globale Monitoring-Blocklist</Heading>
          <Text>
            Diese Patterns werden bei ALLEN Kampagnen gefiltert und verhindern
            das Crawling von Spam-Artikeln.
          </Text>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Pattern hinzufügen
        </Button>
      </div>

      {/* Statistik */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <NoSymbolIcon className="h-5 w-5 text-blue-600" />
          <Text className="font-medium">
            Insgesamt {totalFiltered} Artikel durch Blocklist gefiltert
          </Text>
        </div>
      </div>

      {/* Domains */}
      <div className="space-y-3">
        <Subheading>🌐 Blockierte Domains ({domainPatterns.length})</Subheading>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {domainPatterns.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Keine Domains blockiert
            </div>
          ) : (
            domainPatterns.map((pattern) => (
              <div key={pattern.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Text className="font-medium">{pattern.pattern}</Text>
                    <Badge color={pattern.isActive ? 'green' : 'zinc'}>
                      {pattern.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                  <Text className="text-xs text-gray-500 mt-1">
                    {pattern.timesMatched} mal gefiltert
                    {pattern.lastMatched && ` | Zuletzt: ${new Date(pattern.lastMatched.toDate()).toLocaleDateString('de-DE')}`}
                  </Text>
                </div>
                <div className="flex gap-2">
                  {pattern.isActive && (
                    <Button
                      outline
                      onClick={() => handleDeactivatePattern(pattern.id!)}
                    >
                      Deaktivieren
                    </Button>
                  )}
                  <Button
                    color="red"
                    outline
                    onClick={() => handleDeletePattern(pattern.id!)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-3">
        <Subheading>🔤 Blockierte Keywords ({keywordPatterns.length})</Subheading>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {keywordPatterns.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Keine Keywords blockiert
            </div>
          ) : (
            keywordPatterns.map((pattern) => (
              <div key={pattern.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Text className="font-medium">"{pattern.pattern}"</Text>
                    <Badge color={pattern.isActive ? 'green' : 'zinc'}>
                      {pattern.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                  <Text className="text-xs text-gray-500 mt-1">
                    {pattern.timesMatched} mal gefiltert
                    {pattern.lastMatched && ` | Zuletzt: ${new Date(pattern.lastMatched.toDate()).toLocaleDateString('de-DE')}`}
                  </Text>
                </div>
                <div className="flex gap-2">
                  {pattern.isActive && (
                    <Button
                      outline
                      onClick={() => handleDeactivatePattern(pattern.id!)}
                    >
                      Deaktivieren
                    </Button>
                  )}
                  <Button
                    color="red"
                    outline
                    onClick={() => handleDeletePattern(pattern.id!)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)}>
        <DialogTitle>Spam-Pattern hinzufügen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pattern-Typ
              </label>
              <Select
                value={patternType}
                onChange={(e) => setPatternType(e.target.value as any)}
              >
                <option value="url_domain">Domain</option>
                <option value="keyword">Keyword</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {patternType === 'url_domain' ? 'Domain' : 'Keyword'}
              </label>
              <Input
                value={patternValue}
                onChange={(e) => setPatternValue(e.target.value)}
                placeholder={patternType === 'url_domain' ? 'z.B. spam-news.de' : 'z.B. Werbung:'}
              />
              <Text className="text-xs text-gray-500 mt-1">
                {patternType === 'url_domain'
                  ? 'Alle Artikel von dieser Domain werden gefiltert'
                  : 'Alle Artikel mit diesem Begriff im Titel werden gefiltert'}
              </Text>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowAddModal(false)}>Abbrechen</Button>
          <Button onClick={handleAddPattern}>Hinzufügen</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
```

### 3. RSS Feed Management Page

**Datei:** `src/app/dashboard/settings/monitoring/rss-feeds/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { RSSFeed } from '@/types/monitoring';

export default function RSSFeedsPage() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');

  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    // TODO: Service-Call
  };

  const handleAddFeed = async () => {
    // TODO: Service-Call
    setShowAddModal(false);
    setFeedUrl('');
    setFeedName('');
    loadFeeds();
  };

  const handleDeleteFeed = async (feedId: string) => {
    // TODO: Service-Call
    loadFeeds();
  };

  const handleToggleActive = async (feed: RSSFeed) => {
    // TODO: Service-Call
    loadFeeds();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading>RSS Feed Monitoring</Heading>
          <Text>Füge RSS Feeds hinzu, um automatisch nach Veröffentlichungen zu suchen</Text>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Feed hinzufügen
        </Button>
      </div>

      {/* Feed Liste */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {feeds.length === 0 ? (
          <div className="p-8 text-center">
            <Text className="text-gray-500">
              Noch keine RSS Feeds hinzugefügt. Füge Feeds von Fachpublikationen hinzu,
              um automatisch über Veröffentlichungen benachrichtigt zu werden.
            </Text>
          </div>
        ) : (
          feeds.map((feed) => (
            <div key={feed.id} className="p-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Subheading>{feed.feedName}</Subheading>
                  <Badge color={feed.isActive ? 'green' : 'zinc'}>
                    {feed.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                  {feed.lastError && (
                    <Badge color="red">
                      Fehler
                    </Badge>
                  )}
                </div>
                <Text className="text-sm text-gray-600">{feed.feedUrl}</Text>
                <div className="flex items-center gap-4 mt-2">
                  <Text className="text-xs text-gray-500">
                    {feed.totalArticlesFound} Artikel gefunden
                  </Text>
                  {feed.lastChecked && (
                    <Text className="text-xs text-gray-500">
                      Zuletzt geprüft: {new Date(feed.lastChecked.toDate()).toLocaleDateString('de-DE')}
                    </Text>
                  )}
                </div>
                {feed.lastError && (
                  <Text className="text-xs text-red-600 mt-1">
                    Fehler: {feed.lastError}
                  </Text>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  outline
                  color={feed.isActive ? 'zinc' : 'green'}
                  onClick={() => handleToggleActive(feed)}
                >
                  {feed.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                  {feed.isActive ? 'Deaktivieren' : 'Aktivieren'}
                </Button>
                <Button color="red" outline onClick={() => handleDeleteFeed(feed.id!)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)}>
        <DialogTitle>RSS Feed hinzufügen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feed-URL
              </label>
              <Input
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <Input
                value={feedName}
                onChange={(e) => setFeedName(e.target.value)}
                placeholder="z.B. TechCrunch"
              />
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowAddModal(false)}>Abbrechen</Button>
          <Button onClick={handleAddFeed}>Hinzufügen</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
```

---

## 🔄 Integration in bestehende Monitoring-Seite

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`

```typescript
// HINZUFÜGEN zu bestehenden Tabs:

const [activeTab, setActiveTab] = useState<
  'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions'
>('dashboard');

// Tab Navigation erweitern:
<button
  type="button"
  onClick={() => setActiveTab('suggestions')}
  className={`flex items-center pb-2 text-sm font-medium ${
    activeTab === 'suggestions'
      ? 'text-[#005fab] border-b-2 border-[#005fab]'
      : 'text-gray-500 hover:text-gray-700'
  }`}
>
  <SparklesIcon className="w-4 h-4 mr-2" />
  Vorschläge
  {suggestionsCount > 0 && (
    <Badge color="blue" className="ml-2">
      {suggestionsCount}
    </Badge>
  )}
</button>

// Im Content-Bereich:
{activeTab === 'suggestions' && (
  <MonitoringSuggestions
    campaignId={campaignId}
    onSuggestionConfirmed={handleSuggestionConfirmed}
  />
)}
```

---

## 🚀 Firebase Functions (Scheduled Crawling)

### 1. Google News RSS Crawler

**Datei:** `functions/src/monitoring/google-news-crawler.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Parser from 'rss-parser';

const parser = new Parser();

export const dailyGoogleNewsCrawler = functions.pubsub
  .schedule('0 6 * * *') // Täglich 06:00 UTC (07:00 CET)
  .timeZone('Europe/Berlin')
  .onRun(async (context) => {
    const db = admin.firestore();

    console.log('🤖 Starting Google News Crawler');

    // Hole alle Kampagnen mit aktiviertem Google News Monitoring
    const campaignsSnapshot = await db.collection('pr_campaigns')
      .where('monitoringConfig.isEnabled', '==', true)
      .where('monitoringConfig.sources.googleNews', '==', true)
      .get();

    console.log(`📊 Found ${campaignsSnapshot.size} campaigns with Google News monitoring`);

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaign = campaignDoc.data();
      const keywords = campaign.monitoringConfig?.keywords || [];

      if (keywords.length === 0) {
        console.log(`⏭️ Skipping campaign ${campaignDoc.id} - no keywords`);
        continue;
      }

      try {
        // Lade Spam-Patterns
        const spamPatterns = await loadSpamPatterns(db, campaign.organizationId, campaignDoc.id);

        // Google News RSS Feed durchsuchen
        const query = keywords.join(' OR ');
        const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=de&gl=DE&ceid=DE:de`;

        console.log(`🔍 Searching Google News for: ${query}`);
        const feed = await parser.parseURL(feedUrl);

        let newArticles = 0;
        let filteredBySpam = 0;

        for (const item of feed.items) {
          if (!item.link || !item.title) continue;

          // Prüfe gegen Spam-Patterns
          if (matchesSpamPattern(item, spamPatterns)) {
            filteredBySpam++;
            continue;
          }

          // Prüfe ob bereits vorhanden
          const normalizedUrl = normalizeUrl(item.link);
          const existingSnapshot = await db.collection('monitoring_suggestions')
            .where('normalizedUrl', '==', normalizedUrl)
            .where('campaignId', '==', campaignDoc.id)
            .limit(1)
            .get();

          if (existingSnapshot.empty) {
            // Neue Suggestion erstellen
            const matchScore = calculateMatchScore(item, keywords);
            const matchedKeywords = findMatchedKeywords(item, keywords);

            const source = {
              type: 'google_news',
              sourceName: 'Google News',
              matchScore,
              foundAt: admin.firestore.Timestamp.now(),
              articleData: {
                title: item.title,
                excerpt: item.contentSnippet
              }
            };

            await db.collection('monitoring_suggestions').add({
              organizationId: campaign.organizationId,
              campaignId: campaignDoc.id,
              articleUrl: item.link,
              normalizedUrl,
              articleTitle: item.title,
              articleExcerpt: item.contentSnippet,
              sources: [source],
              avgMatchScore: matchScore,
              highestMatchScore: matchScore,
              matchedKeywords,
              confidence: calculateConfidence([source], matchScore),
              autoConfirmed: shouldAutoConfirm([source], matchScore),
              status: shouldAutoConfirm([source], matchScore) ? 'auto_confirmed' : 'pending',
              createdAt: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.Timestamp.now()
            });

            newArticles++;

            // TODO: Push-Benachrichtigung senden
          } else {
            // Füge weitere Quelle hinzu (falls noch nicht vorhanden)
            const suggestion = existingSnapshot.docs[0].data();
            const hasGoogleNews = suggestion.sources.some((s: any) => s.type === 'google_news');

            if (!hasGoogleNews) {
              // Füge Google News als weitere Quelle hinzu
              const matchScore = calculateMatchScore(item, keywords);
              const newSource = {
                type: 'google_news',
                sourceName: 'Google News',
                matchScore,
                foundAt: admin.firestore.Timestamp.now()
              };

              const updatedSources = [...suggestion.sources, newSource];
              const avgScore = calculateAvgScore(updatedSources);

              await existingSnapshot.docs[0].ref.update({
                sources: updatedSources,
                avgMatchScore: avgScore,
                highestMatchScore: Math.max(...updatedSources.map((s: any) => s.matchScore)),
                updatedAt: admin.firestore.Timestamp.now()
              });
            }
          }
        }

        console.log(`✅ Campaign ${campaignDoc.id}: ${newArticles} new articles, ${filteredBySpam} filtered by spam`);

      } catch (error) {
        console.error(`❌ Error crawling campaign ${campaignDoc.id}:`, error);
      }
    }

    console.log('🏁 Google News Crawler completed');
  });

// Helper Functions
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace('www.', '')}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function calculateMatchScore(item: any, keywords: string[]): number {
  let score = 0;
  const titleLower = item.title.toLowerCase();
  const excerptLower = (item.contentSnippet || '').toLowerCase();

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (titleLower.includes(keywordLower)) score += 30;
    if (excerptLower.includes(keywordLower)) score += 20;
  }

  return Math.min(score, 100);
}

function findMatchedKeywords(item: any, keywords: string[]): string[] {
  const content = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
  return keywords.filter(kw => content.includes(kw.toLowerCase()));
}

function calculateConfidence(sources: any[], avgScore: number): string {
  if (sources.length >= 2) return 'very_high';
  if (sources.length === 1 && avgScore >= 85) return 'high';
  if (sources.length === 1 && avgScore >= 70) return 'medium';
  return 'low';
}

function shouldAutoConfirm(sources: any[], avgScore: number): boolean {
  if (sources.length >= 2) return true;
  if (sources.length === 1 && avgScore >= 85) return true;
  return false;
}

function calculateAvgScore(sources: any[]): number {
  const sum = sources.reduce((acc: number, s: any) => acc + s.matchScore, 0);
  return Math.round(sum / sources.length);
}

async function loadSpamPatterns(
  db: admin.firestore.Firestore,
  organizationId: string,
  campaignId: string
): Promise<any[]> {
  const globalSnap = await db.collection('spam_patterns')
    .where('organizationId', '==', organizationId)
    .where('scope', '==', 'global')
    .where('isActive', '==', true)
    .get();

  const campaignSnap = await db.collection('spam_patterns')
    .where('organizationId', '==', organizationId)
    .where('scope', '==', 'campaign')
    .where('campaignId', '==', campaignId)
    .where('isActive', '==', true)
    .get();

  return [
    ...globalSnap.docs.map(d => d.data()),
    ...campaignSnap.docs.map(d => d.data())
  ];
}

function matchesSpamPattern(item: any, patterns: any[]): boolean {
  for (const pattern of patterns) {
    try {
      switch (pattern.type) {
        case 'url_domain':
          const hostname = new URL(item.link).hostname.replace('www.', '');
          if (hostname === pattern.pattern) return true;
          break;

        case 'keyword':
          if (item.title.toLowerCase().includes(pattern.pattern.toLowerCase())) {
            return true;
          }
          break;

        case 'title_pattern':
          const regex = new RegExp(pattern.pattern, 'i');
          if (regex.test(item.title)) return true;
          break;
      }
    } catch {
      continue;
    }
  }
  return false;
}
```

### 2. RSS Feed Crawler

**Datei:** `functions/src/monitoring/rss-crawler.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Parser from 'rss-parser';

const parser = new Parser();

export const dailyRSSCrawler = functions.pubsub
  .schedule('0 7 * * *') // Täglich 07:00 UTC (08:00 CET)
  .timeZone('Europe/Berlin')
  .onRun(async (context) => {
    const db = admin.firestore();

    console.log('🤖 Starting RSS Feed Crawler');

    // Hole alle aktiven RSS Feeds
    const feedsSnapshot = await db.collection('rss_feeds')
      .where('isActive', '==', true)
      .get();

    console.log(`📊 Found ${feedsSnapshot.size} active RSS feeds`);

    for (const feedDoc of feedsSnapshot.docs) {
      const feed = feedDoc.data();

      try {
        console.log(`🔍 Crawling feed: ${feed.feedName}`);
        const rss = await parser.parseURL(feed.feedUrl);

        // Hole alle Kampagnen dieser Organisation mit Monitoring
        const campaignsSnapshot = await db.collection('pr_campaigns')
          .where('organizationId', '==', feed.organizationId)
          .where('monitoringConfig.isEnabled', '==', true)
          .where('monitoringConfig.sources.rssFeeds', 'array-contains', feedDoc.id)
          .get();

        let totalArticlesFound = 0;

        for (const campaignDoc of campaignsSnapshot.docs) {
          const campaign = campaignDoc.data();
          const keywords = campaign.monitoringConfig?.keywords || [];

          if (keywords.length === 0) continue;

          // Lade Spam-Patterns
          const spamPatterns = await loadSpamPatterns(db, campaign.organizationId, campaignDoc.id);

          for (const item of rss.items) {
            if (!item.link || !item.title) continue;

            // Prüfe gegen Spam-Patterns
            if (matchesSpamPattern(item, spamPatterns)) continue;

            // Prüfe gegen Keywords
            const matchScore = calculateMatchScore(item, keywords);
            if (matchScore < 60) continue; // Mindest-Score

            // Prüfe ob bereits vorhanden
            const normalizedUrl = normalizeUrl(item.link);
            const existingSnapshot = await db.collection('monitoring_suggestions')
              .where('normalizedUrl', '==', normalizedUrl)
              .where('campaignId', '==', campaignDoc.id)
              .limit(1)
              .get();

            if (existingSnapshot.empty) {
              // Neue Suggestion
              const matchedKeywords = findMatchedKeywords(item, keywords);
              const source = {
                type: 'rss_feed',
                sourceName: feed.feedName,
                sourceId: feedDoc.id,
                matchScore,
                foundAt: admin.firestore.Timestamp.now()
              };

              await db.collection('monitoring_suggestions').add({
                organizationId: campaign.organizationId,
                campaignId: campaignDoc.id,
                articleUrl: item.link,
                normalizedUrl,
                articleTitle: item.title,
                articleExcerpt: item.contentSnippet,
                sources: [source],
                avgMatchScore: matchScore,
                highestMatchScore: matchScore,
                matchedKeywords,
                confidence: calculateConfidence([source], matchScore),
                autoConfirmed: shouldAutoConfirm([source], matchScore),
                status: shouldAutoConfirm([source], matchScore) ? 'auto_confirmed' : 'pending',
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
              });

              totalArticlesFound++;

            } else {
              // Füge RSS als weitere Quelle hinzu
              const suggestion = existingSnapshot.docs[0].data();
              const hasThisFeed = suggestion.sources.some(
                (s: any) => s.type === 'rss_feed' && s.sourceId === feedDoc.id
              );

              if (!hasThisFeed) {
                const newSource = {
                  type: 'rss_feed',
                  sourceName: feed.feedName,
                  sourceId: feedDoc.id,
                  matchScore,
                  foundAt: admin.firestore.Timestamp.now()
                };

                const updatedSources = [...suggestion.sources, newSource];
                const avgScore = calculateAvgScore(updatedSources);

                await existingSnapshot.docs[0].ref.update({
                  sources: updatedSources,
                  avgMatchScore: avgScore,
                  highestMatchScore: Math.max(...updatedSources.map((s: any) => s.matchScore)),
                  updatedAt: admin.firestore.Timestamp.now()
                });
              }
            }
          }
        }

        // Update Feed Status
        await feedDoc.ref.update({
          lastChecked: admin.firestore.Timestamp.now(),
          lastArticleFound: totalArticlesFound > 0 ? admin.firestore.Timestamp.now() : feed.lastArticleFound,
          totalArticlesFound: (feed.totalArticlesFound || 0) + totalArticlesFound,
          lastError: null,
          errorCount: 0
        });

        console.log(`✅ Feed ${feed.feedName}: ${totalArticlesFound} new articles`);

      } catch (error: any) {
        console.error(`❌ Error crawling feed ${feed.feedName}:`, error);

        await feedDoc.ref.update({
          lastChecked: admin.firestore.Timestamp.now(),
          lastError: error.message,
          errorCount: (feed.errorCount || 0) + 1
        });
      }
    }

    console.log('🏁 RSS Feed Crawler completed');
  });

// Helper Functions (same as Google News Crawler)
// ... (copy functions from above)
```

---

## 📋 Implementierungs-Reihenfolge

### Phase 5.1: Types & Services (Woche 1)
1. ✅ Types erweitern (`monitoring.ts`, `pr.ts`)
2. ✅ `monitoring-suggestions-service.ts` erstellen
3. ✅ `spam-pattern-service.ts` erstellen
4. ✅ `rss-feed-service.ts` erstellen
5. ✅ Firestore Security Rules erweitern

### Phase 5.2: UI-Komponenten (Woche 2)
1. ✅ `MonitoringSuggestions.tsx` erstellen (mit Multi-Source UI)
2. ✅ Integration in Monitoring-Detail-Seite (neuer Tab)
3. ✅ Globale Spam-Blocklist Settings-Seite erstellen
4. ✅ RSS Feed Management Page erstellen
5. ✅ Settings-Navigation erweitern

### Phase 5.3: Firebase Functions (Woche 3)
1. ✅ Google News RSS Crawler implementieren
2. ✅ RSS Crawler implementieren
3. ✅ Spam-Filter Integration in Crawling
4. ✅ Auto-Confirm Logic implementieren
5. ✅ Deploy & Testing

### Phase 5.4: Push-Benachrichtigungen (Woche 3.5)
1. ✅ Push-Notification Service implementieren
2. ✅ Integration in Crawler (nur bei neuen URLs)
3. ✅ Batching-Logic für viele Artikel
4. ✅ Testing

### Phase 5.5: Testing & Optimization (Woche 4)
1. ✅ End-to-End Tests mit echter Kampagne
2. ✅ Matching-Score Optimierung
3. ✅ Spam-Filter Testing
4. ✅ Performance-Tuning
5. ✅ Dokumentation

---

## 💰 Kosten-Übersicht

### Option 1: Google News RSS (Start) ✅
**Kosten:** KOSTENLOS
```
https://news.google.com/rss/search?q=KEYWORD&hl=de&gl=DE&ceid=DE:de
```
- ✅ Unbegrenzte Anfragen
- ✅ Kein API Key nötig
- ✅ Real-time Updates
- ✅ Deutsche News-Quellen
- ⚠️ Nur RSS-Format (kein JSON)
- ⚠️ Basis-Parsing mit RSS-Parser Library nötig

**Implementation:**
```typescript
import Parser from 'rss-parser';

const parser = new Parser();
const feed = await parser.parseURL(
  `https://news.google.com/rss/search?q=${keywords.join('+OR+')}&hl=de&gl=DE&ceid=DE:de`
);
```

### Option 2: GNews.io (Upgrade) ✅
**Free Tier:** 100 Anfragen/Tag (KOSTENLOS)
**Basic:** $9/Monat - 5000 Anfragen/Tag
**Pro:** $99/Monat - 50000 Anfragen/Tag

- ✅ 60.000+ Quellen weltweit
- ✅ JSON API (einfacher als RSS)
- ✅ 5 Jahre historische Daten
- ✅ Besseres Filtering

### Option 3: Social Media (später)
**Mention.com:** ~49€/Monat
- Instagram, LinkedIn, Facebook, TikTok Monitoring
- Nur wenn Google News + RSS nicht ausreichen

### ❌ NICHT empfohlen: NewsAPI.org
- **Grund:** $449/Monat zu teuer
- **Free Tier:** Zu limitiert

---

## 🔒 Firestore Security Rules

```javascript
// Erweitere firestore.rules

// Monitoring Suggestions - Nur eigene Organisation
match /monitoring_suggestions/{suggestionId} {
  allow read: if belongsToOrg(resource.data.organizationId);
  allow create: if true; // Functions erstellen ohne Auth
  allow update: if belongsToOrg(resource.data.organizationId);
  allow delete: if belongsToOrg(resource.data.organizationId);
}

// RSS Feeds - Nur eigene Organisation
match /rss_feeds/{feedId} {
  allow read: if belongsToOrg(resource.data.organizationId);
  allow create: if belongsToOrg(request.resource.data.organizationId);
  allow update: if belongsToOrg(resource.data.organizationId);
  allow delete: if belongsToOrg(resource.data.organizationId);
}

// Spam Patterns - Nur eigene Organisation
match /spam_patterns/{patternId} {
  allow read: if belongsToOrg(resource.data.organizationId);
  allow create: if belongsToOrg(request.resource.data.organizationId);
  allow update: if belongsToOrg(resource.data.organizationId);
  allow delete: if belongsToOrg(resource.data.organizationId);
}
```

---

## ✅ Erfolgskriterien

- [ ] Google News RSS findet relevante Artikel
- [ ] RSS Feeds werden täglich gecrawlt
- [ ] Multi-Source Gruppierung funktioniert (mehrere Quellen → 1 Suggestion)
- [ ] Auto-Confirm bei 2+ Quellen funktioniert
- [ ] Spam-Filter blockiert unwanted Artikel
- [ ] Globale Blocklist funktioniert organisations-weit
- [ ] Push-Benachrichtigungen werden gesendet (1x pro URL)
- [ ] Suggestions erscheinen in UI mit allen Quellen
- [ ] Übernehmen → erstellt Clipping automatisch
- [ ] Spam markieren → löscht Clipping + lernt optional Pattern
- [ ] Match-Score ist aussagekräftig (>80% = sehr relevant)
- [ ] Keine URL-Duplikate
- [ ] Firebase Functions laufen stabil
- [ ] Manuelles Tracking funktioniert weiterhin 100%

---

## 📝 Offene Fragen

1. ✅ **News API gelöst:** Google News RSS (kostenlos) für Start
2. **Matching-Algorithmus:** Reicht Keyword-Matching oder wollen wir AI (Gemini)?
3. **Social Media:** Später mit Mention.com API ergänzen? (~49€/Monat)
4. **Push-Notification Provider:** Welchen Service nutzen? (Firebase Cloud Messaging, OneSignal, etc.)

---

**Status:** 📋 Bereit für Implementierung
**Next:** Phase 5.1 starten - Types & Services implementieren

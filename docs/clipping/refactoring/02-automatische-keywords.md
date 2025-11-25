# Refactoring-Plan 02: Automatische Keyword-Extraktion + Crawler-Logik

**Datum:** 25.11.2025
**Status:** Implementiert
**Priorität:** Hoch
**Abhängigkeit:** NACH Plan 00 (Critical Fix) durchführen

---

## Zusammenfassung

Implementierung eines automatischen Keyword-Systems basierend auf **Firmendaten aus dem CRM**.

**Kernprinzip:**
- Keywords = Nur Firmennamen (zuverlässig)
- Auto-Confirm = Nur bei Firmenname + hoher SEO-Score
- Alles andere = Auto-Funde zur manuellen Prüfung

---

## Datenquellen

### Company (CRM) - Einzige zuverlässige Quelle

```typescript
// Aus src/types/crm-enhanced.ts
interface CompanyEnhanced {
  name: string;           // "TechVision GmbH" - Anzeigename
  officialName: string;   // "TechVision Solutions GmbH" - Handelsregister
  tradingName?: string;   // "TechVision" - Handelsname/DBA
  legalForm?: string;     // "GmbH" - Zur Bereinigung
}
```

### Generierte Keyword-Varianten

```
Eingabe: Company mit name="TechVision GmbH", tradingName="TechVision"

Generierte Keywords:
1. "TechVision GmbH"      (name - exakt)
2. "TechVision"           (tradingName oder name ohne Rechtsform)
3. "TechVision Solutions GmbH" (officialName, falls anders)
```

---

## Neue Auto-Confirm Logik

### Aktuell (Problematisch)

```typescript
// Nur Score-basiert - führt zu False Positives
if (sourceCount >= 2 || highestScore >= 85) {
  return true; // Auto-Confirm
}
```

### Neu (Firmenname-basiert)

```typescript
function shouldAutoConfirm(
  article: Article,
  companyKeywords: string[],  // Firmennamen-Varianten
  seoKeywords: string[]       // Optional: campaign.keywords
): boolean {

  // 1. PFLICHT: Firmenname MUSS im Artikel vorkommen
  const companyMatch = findCompanyMatch(article, companyKeywords);

  if (!companyMatch.found) {
    return false; // → Immer Auto-Funde (manuell)
  }

  // 2. Firmenname im TITEL = Sehr hohe Relevanz → Auto-Confirm
  if (companyMatch.inTitle) {
    return true;
  }

  // 3. Firmenname nur im Content: Braucht zusätzlich SEO-Match
  if (seoKeywords.length > 0) {
    const seoScore = calculateSeoScore(article, seoKeywords);
    if (seoScore >= 70) {
      return true; // Firmenname + hoher SEO-Score → Auto-Confirm
    }
  }

  // 4. Nur Firmenname im Content ohne SEO-Match
  return false; // → Auto-Funde (manuell prüfen)
}

interface CompanyMatchResult {
  found: boolean;
  inTitle: boolean;
  inContent: boolean;
  matchedKeyword: string | null;
}

function findCompanyMatch(article: Article, companyKeywords: string[]): CompanyMatchResult {
  const titleLower = article.title.toLowerCase();
  const contentLower = article.content.toLowerCase();

  for (const keyword of companyKeywords) {
    const keywordLower = keyword.toLowerCase();

    if (titleLower.includes(keywordLower)) {
      return { found: true, inTitle: true, inContent: true, matchedKeyword: keyword };
    }

    if (contentLower.includes(keywordLower)) {
      return { found: true, inTitle: false, inContent: true, matchedKeyword: keyword };
    }
  }

  return { found: false, inTitle: false, inContent: false, matchedKeyword: null };
}
```

---

## Entscheidungsbaum

```
Artikel gefunden
      │
      ▼
┌─────────────────────────┐
│ Enthält Firmenname?     │
└───────────┬─────────────┘
            │
     ┌──────┴──────┐
     │             │
    NEIN          JA
     │             │
     ▼             ▼
┌─────────┐  ┌─────────────────────┐
│ SKIP    │  │ Firmenname im Titel?│
│ (kein   │  └──────────┬──────────┘
│ Match)  │             │
└─────────┘      ┌──────┴──────┐
                 │             │
                JA           NEIN
                 │             │
                 ▼             ▼
          ┌───────────┐  ┌─────────────────────┐
          │ AUTO-     │  │ SEO-Keywords        │
          │ CONFIRM   │  │ Score >= 70?        │
          └───────────┘  └──────────┬──────────┘
                                    │
                             ┌──────┴──────┐
                             │             │
                            JA           NEIN
                             │             │
                             ▼             ▼
                      ┌───────────┐  ┌───────────┐
                      │ AUTO-     │  │ AUTO-     │
                      │ CONFIRM   │  │ FUNDE     │
                      └───────────┘  │ (manuell) │
                                     └───────────┘
```

---

## Betroffene Dateien

### Neue Dateien

- `src/lib/firebase-admin/keyword-extraction-service.ts`

### Zu ändern

- `src/app/api/cron/monitoring-crawler/route.ts`
- `src/lib/firebase-admin/monitoring-crawler-service.ts`

### Typ-Definitionen

- `src/types/monitoring.ts`

---

## Implementierung

### 1. Neuer Service: keyword-extraction-service.ts

```typescript
// src/lib/firebase-admin/keyword-extraction-service.ts

import { adminDb } from './admin';

// Rechtsformen für Bereinigung
const LEGAL_FORMS = [
  'GmbH', 'AG', 'KG', 'OHG', 'GbR', 'UG', 'e.V.', 'eG',
  'Ltd.', 'Ltd', 'Inc.', 'Inc', 'LLC', 'Corp.', 'Corp',
  'SE', 'S.A.', 'S.L.', 'B.V.', 'N.V.', 'Pty', 'PLC'
];

export interface CompanyKeywords {
  all: string[];           // Alle Varianten für Suche
  primary: string;         // Haupt-Firmenname
  variants: string[];      // Weitere Varianten
}

export interface AutoConfirmResult {
  shouldConfirm: boolean;
  reason: 'company_in_title' | 'company_plus_seo' | 'company_only' | 'no_company_match';
  companyMatch: {
    found: boolean;
    inTitle: boolean;
    matchedKeyword: string | null;
  };
  seoScore: number;
}

/**
 * Extrahiert Keyword-Varianten aus Company-Daten
 */
export function extractCompanyKeywords(company: {
  name: string;
  officialName?: string;
  tradingName?: string;
  legalForm?: string;
}): CompanyKeywords {
  const keywords = new Set<string>();

  // 1. Anzeigename (Pflicht)
  if (company.name) {
    keywords.add(company.name.trim());

    // Variante ohne Rechtsform
    const nameWithoutLegal = removeLegalForm(company.name);
    if (nameWithoutLegal && nameWithoutLegal !== company.name.trim()) {
      keywords.add(nameWithoutLegal);
    }
  }

  // 2. Offizieller Name (falls anders)
  if (company.officialName && company.officialName !== company.name) {
    keywords.add(company.officialName.trim());

    const officialWithoutLegal = removeLegalForm(company.officialName);
    if (officialWithoutLegal && officialWithoutLegal !== company.officialName.trim()) {
      keywords.add(officialWithoutLegal);
    }
  }

  // 3. Handelsname (falls vorhanden)
  if (company.tradingName) {
    keywords.add(company.tradingName.trim());
  }

  const allKeywords = Array.from(keywords).filter(k => k.length >= 2);

  return {
    all: allKeywords,
    primary: company.name,
    variants: allKeywords.filter(k => k !== company.name)
  };
}

/**
 * Entfernt Rechtsform vom Firmennamen
 */
function removeLegalForm(name: string): string {
  let result = name.trim();

  for (const form of LEGAL_FORMS) {
    // Am Ende des Namens
    const regex = new RegExp(`\\s*${escapeRegex(form)}\\s*$`, 'i');
    result = result.replace(regex, '').trim();
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Prüft ob Artikel auto-confirmed werden soll
 */
export function checkAutoConfirm(
  article: { title: string; content: string },
  companyKeywords: string[],
  seoKeywords: string[] = []
): AutoConfirmResult {
  const titleLower = article.title.toLowerCase();
  const contentLower = article.content.toLowerCase();

  // 1. Firmenname-Match prüfen
  let companyMatch = {
    found: false,
    inTitle: false,
    matchedKeyword: null as string | null
  };

  for (const keyword of companyKeywords) {
    const keywordLower = keyword.toLowerCase();

    if (titleLower.includes(keywordLower)) {
      companyMatch = { found: true, inTitle: true, matchedKeyword: keyword };
      break;
    }

    if (contentLower.includes(keywordLower) && !companyMatch.found) {
      companyMatch = { found: true, inTitle: false, matchedKeyword: keyword };
    }
  }

  // 2. Kein Firmenname gefunden → Kein Match
  if (!companyMatch.found) {
    return {
      shouldConfirm: false,
      reason: 'no_company_match',
      companyMatch,
      seoScore: 0
    };
  }

  // 3. Firmenname im Titel → Auto-Confirm
  if (companyMatch.inTitle) {
    return {
      shouldConfirm: true,
      reason: 'company_in_title',
      companyMatch,
      seoScore: 100
    };
  }

  // 4. Firmenname nur im Content → SEO-Score prüfen
  const seoScore = calculateSeoScore(article, seoKeywords);

  if (seoScore >= 70) {
    return {
      shouldConfirm: true,
      reason: 'company_plus_seo',
      companyMatch,
      seoScore
    };
  }

  // 5. Firmenname im Content, aber niedriger SEO-Score → Manuell
  return {
    shouldConfirm: false,
    reason: 'company_only',
    companyMatch,
    seoScore
  };
}

/**
 * Berechnet SEO-Keyword Score
 */
function calculateSeoScore(
  article: { title: string; content: string },
  seoKeywords: string[]
): number {
  if (seoKeywords.length === 0) return 0;

  const titleLower = article.title.toLowerCase();
  const contentLower = article.content.toLowerCase();

  let matchedCount = 0;
  let maxScore = seoKeywords.length * 2; // Titel = 2, Content = 1

  for (const keyword of seoKeywords) {
    const keywordLower = keyword.toLowerCase();

    if (titleLower.includes(keywordLower)) {
      matchedCount += 2; // Titel zählt doppelt
    } else if (contentLower.includes(keywordLower)) {
      matchedCount += 1;
    }
  }

  return Math.round((matchedCount / maxScore) * 100);
}

/**
 * Lädt Company-Keywords für eine Kampagne
 */
export async function getCompanyKeywordsForCampaign(
  campaignId: string
): Promise<{ companyKeywords: string[]; seoKeywords: string[] }> {

  // Kampagne laden
  const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get();
  if (!campaignDoc.exists) {
    return { companyKeywords: [], seoKeywords: [] };
  }

  const campaign = campaignDoc.data();
  const seoKeywords = campaign?.keywords || [];

  // Customer laden
  const customerId = campaign?.clientId;
  if (!customerId) {
    console.warn(`[KeywordExtraction] Campaign ${campaignId} has no clientId`);
    return { companyKeywords: [], seoKeywords };
  }

  const customerDoc = await adminDb.collection('companies').doc(customerId).get();
  if (!customerDoc.exists) {
    console.warn(`[KeywordExtraction] Customer ${customerId} not found`);
    return { companyKeywords: [], seoKeywords };
  }

  const customer = customerDoc.data();
  const companyKeywords = extractCompanyKeywords({
    name: customer?.name || '',
    officialName: customer?.officialName,
    tradingName: customer?.tradingName,
    legalForm: customer?.legalForm
  });

  console.log('[KeywordExtraction] Extracted keywords:', {
    campaignId,
    customerId,
    companyKeywords: companyKeywords.all,
    seoKeywords
  });

  return {
    companyKeywords: companyKeywords.all,
    seoKeywords
  };
}
```

### 2. Crawler-Integration (VOLLSTÄNDIGE ÄNDERUNGEN)

#### 2a. Route: `src/app/api/cron/monitoring-crawler/route.ts`

```typescript
// IMPORT hinzufügen (am Anfang der Datei)
import {
  getCompanyKeywordsForCampaign,
  checkAutoConfirm,
  AutoConfirmResult
} from '@/lib/firebase-admin/keyword-extraction-service';

// ============================================================
// ÄNDERUNG 1: In crawlTracker() - Keywords laden (ca. Zeile 104-114)
// ============================================================

// VORHER:
const keywords = campaign.monitoringConfig?.keywords || [];
const minMatchScore = campaign.monitoringConfig?.minMatchScore || 70;

// NACHHER:
// 🆕 Keywords aus Company extrahieren (nicht mehr aus Campaign)
const { companyKeywords, seoKeywords } = await getCompanyKeywordsForCampaign(tracker.campaignId);

// Fallback-Check: Ohne Firmennamen kein Monitoring möglich
if (companyKeywords.length === 0) {
  console.warn(`⚠️ No company keywords for campaign ${tracker.campaignId}, skipping tracker`);
  return { articlesFound: 0, autoConfirmed: 0 };
}

console.log(`🔑 Keywords: Company=[${companyKeywords.join(', ')}], SEO=[${seoKeywords.join(', ')}]`);

// ============================================================
// ÄNDERUNG 2: In crawlRssFeed() - Matching-Logik (ca. Zeile 201)
// ============================================================

// VORHER:
const matchScore = calculateMatchScore(item.title, item.contentSnippet || '', keywords);

if (matchScore >= 50) {
  sources.push({...});
}

// NACHHER:
// 🆕 Prüfe zuerst ob Firmenname vorkommt
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
    // 🆕 NEU: Auto-Confirm Ergebnis speichern
    autoConfirmResult
  });
}

// ============================================================
// ÄNDERUNG 3: In crawlGoogleNews() - Gleiche Logik (ca. Zeile 245)
// ============================================================

// VORHER:
const matchScore = calculateMatchScore(item.title, item.contentSnippet || '', keywords);
if (matchScore >= 80) {
  sources.push({...});
}

// NACHHER:
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

// ============================================================
// ÄNDERUNG 4: In processSuggestion() - Auto-Confirm entscheiden (ca. Zeile 323)
// ============================================================

// VORHER:
const result = await createSuggestion(tracker, source, normalized, minMatchScore);

// NACHHER:
// 🆕 Auto-Confirm basiert jetzt auf dem autoConfirmResult
const shouldConfirm = source.autoConfirmResult?.shouldConfirm || false;
const result = await createSuggestionWithAutoConfirm(
  tracker,
  source,
  normalized,
  shouldConfirm,
  source.autoConfirmResult
);

// ============================================================
// ÄNDERUNG 5: calculateMatchScore() ENTFERNEN oder DEPRECATEN
// ============================================================

// Die alte Funktion wird nicht mehr benötigt.
// Optional: Als deprecated markieren für Rollback-Zwecke.

/**
 * @deprecated Verwende checkAutoConfirm() aus keyword-extraction-service.ts
 */
function calculateMatchScore(title: string, content: string, keywords: string[]): number {
  // ... alter Code bleibt für Rollback
}
```

#### 2b. Service: `src/lib/firebase-admin/monitoring-crawler-service.ts`

```typescript
// ============================================================
// ÄNDERUNG 1: Neue Funktion createSuggestionWithAutoConfirm()
// ============================================================

/**
 * Erstellt Suggestion mit neuer Auto-Confirm Logik
 */
export async function createSuggestionWithAutoConfirm(
  tracker: CampaignMonitoringTracker,
  source: MonitoringSource & {
    articleUrl: string;
    articleTitle: string;
    articleExcerpt?: string;
    autoConfirmResult?: AutoConfirmResult;
  },
  normalizedUrl: string,
  shouldAutoConfirm: boolean,
  autoConfirmResult?: AutoConfirmResult
): Promise<{ created: boolean; autoConfirmed: boolean; suggestionId?: string }> {

  try {
    // Confidence basiert auf neuer Logik
    const confidence = determineConfidence(autoConfirmResult);

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
      // 🆕 NEU: Auto-Confirm Reason speichern
      autoConfirmReason: autoConfirmResult?.reason || 'unknown',
      companyMatchInTitle: autoConfirmResult?.companyMatch.inTitle || false,
      matchedCompanyKeyword: autoConfirmResult?.companyMatch.matchedKeyword || null,
      seoScore: autoConfirmResult?.seoScore || 0,
      // Status basiert auf neuer Logik
      status: shouldAutoConfirm ? 'auto_confirmed' : 'pending',
      autoConfirmed: shouldAutoConfirm,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection('monitoring_suggestions').add(suggestionData);

    console.log(`📝 Suggestion created: ${docRef.id} (${shouldAutoConfirm ? 'AUTO-CONFIRM' : 'PENDING'})`);
    console.log(`   Reason: ${autoConfirmResult?.reason}, Company in title: ${autoConfirmResult?.companyMatch.inTitle}`);

    return {
      created: true,
      autoConfirmed: shouldAutoConfirm,
      suggestionId: docRef.id
    };
  } catch (error) {
    console.error('❌ Error creating suggestion:', error);
    return { created: false, autoConfirmed: false };
  }
}

/**
 * Bestimmt Confidence basierend auf neuer Logik
 */
function determineConfidence(result?: AutoConfirmResult): 'low' | 'medium' | 'high' | 'very_high' {
  if (!result) return 'low';

  // Firmenname im Titel = very_high
  if (result.reason === 'company_in_title') {
    return 'very_high';
  }

  // Firmenname + hoher SEO-Score = high
  if (result.reason === 'company_plus_seo') {
    return 'high';
  }

  // Nur Firmenname im Content = medium
  if (result.reason === 'company_only') {
    return 'medium';
  }

  // Kein Match = low (sollte nicht vorkommen)
  return 'low';
}

// ============================================================
// ÄNDERUNG 2: shouldAutoConfirmSuggestion() DEPRECATEN
// ============================================================

/**
 * @deprecated Verwende createSuggestionWithAutoConfirm() mit AutoConfirmResult
 */
function shouldAutoConfirmSuggestion(
  sourceCount: number,
  avgScore: number,
  highestScore: number,
  minMatchScore: number
): boolean {
  // Alter Code bleibt für Rollback
  if (sourceCount >= 2) return true;
  if (sourceCount === 1 && highestScore >= 85 && highestScore >= minMatchScore) {
    return true;
  }
  return false;
}
```

#### 2c. Typ-Erweiterung für MonitoringSuggestion

```typescript
// In src/types/monitoring.ts - MonitoringSuggestion Interface erweitern:

export interface MonitoringSuggestion {
  // ... bestehende Felder ...

  // 🆕 NEU: Auto-Confirm Analyse-Daten
  autoConfirmReason?: 'company_in_title' | 'company_plus_seo' | 'company_only' | 'no_company_match';
  companyMatchInTitle?: boolean;
  matchedCompanyKeyword?: string | null;
  seoScore?: number;
}
```

### 3. Typ-Erweiterungen

**Datei:** `src/types/monitoring.ts`

```typescript
// Am Ende hinzufügen:

/**
 * Ergebnis der Auto-Confirm Prüfung
 */
export interface AutoConfirmResult {
  shouldConfirm: boolean;
  reason: 'company_in_title' | 'company_plus_seo' | 'company_only' | 'no_company_match';
  companyMatch: {
    found: boolean;
    inTitle: boolean;
    matchedKeyword: string | null;
  };
  seoScore: number;
}

/**
 * Company Keywords für Monitoring
 */
export interface CompanyKeywords {
  all: string[];
  primary: string;
  variants: string[];
}
```

---

## Tests

### Unit-Tests

```typescript
// __tests__/keyword-extraction-service.test.ts

import { extractCompanyKeywords, checkAutoConfirm } from '../keyword-extraction-service';

describe('extractCompanyKeywords', () => {
  it('extrahiert alle Firmennamen-Varianten', () => {
    const result = extractCompanyKeywords({
      name: 'TechVision GmbH',
      officialName: 'TechVision Solutions GmbH',
      tradingName: 'TechVision'
    });

    expect(result.all).toContain('TechVision GmbH');
    expect(result.all).toContain('TechVision');
    expect(result.all).toContain('TechVision Solutions GmbH');
    expect(result.all).toContain('TechVision Solutions');
    expect(result.primary).toBe('TechVision GmbH');
  });

  it('entfernt verschiedene Rechtsformen', () => {
    const forms = ['GmbH', 'AG', 'Ltd.', 'Inc.', 'LLC'];

    forms.forEach(form => {
      const result = extractCompanyKeywords({ name: `TestCompany ${form}` });
      expect(result.all).toContain('TestCompany');
    });
  });
});

describe('checkAutoConfirm', () => {
  const companyKeywords = ['TechVision GmbH', 'TechVision'];

  it('bestätigt bei Firmenname im Titel', () => {
    const result = checkAutoConfirm(
      { title: 'TechVision stellt neues Produkt vor', content: 'Heute wurde...' },
      companyKeywords,
      []
    );

    expect(result.shouldConfirm).toBe(true);
    expect(result.reason).toBe('company_in_title');
  });

  it('bestätigt bei Firmenname + hohem SEO-Score', () => {
    const result = checkAutoConfirm(
      { title: 'Neues Smart Home Produkt', content: 'TechVision hat heute sein Smart Home Hub vorgestellt.' },
      companyKeywords,
      ['Smart Home', 'Hub']
    );

    expect(result.shouldConfirm).toBe(true);
    expect(result.reason).toBe('company_plus_seo');
  });

  it('verweigert bei Firmenname ohne SEO-Match', () => {
    const result = checkAutoConfirm(
      { title: 'Branchennews der Woche', content: 'Unter anderem berichtet TechVision von neuen Entwicklungen.' },
      companyKeywords,
      ['Smart Home', 'Hub']
    );

    expect(result.shouldConfirm).toBe(false);
    expect(result.reason).toBe('company_only');
  });

  it('verweigert ohne Firmenname-Match', () => {
    const result = checkAutoConfirm(
      { title: 'Smart Home Markt wächst', content: 'Der Markt für Smart Home Produkte...' },
      companyKeywords,
      ['Smart Home']
    );

    expect(result.shouldConfirm).toBe(false);
    expect(result.reason).toBe('no_company_match');
  });
});
```

---

## Checkliste

- [x] `keyword-extraction-service.ts` erstellen
- [x] Typen in `monitoring.ts` hinzufügen
- [x] Unit-Tests schreiben
- [x] Unit-Tests ausführen (31 Tests bestanden)
- [x] Crawler-Integration: Keywords laden
- [x] Crawler-Integration: Auto-Confirm Logik
- [ ] Integration-Test mit echtem Tracker
- [ ] Logging prüfen
- [ ] Manueller End-to-End Test

---

## Risiko-Bewertung

| Risiko | Bewertung | Grund |
|--------|-----------|-------|
| Breaking Changes | Niedrig | Bestehende Suggestions bleiben |
| False Positives | **Gesenkt** | Firmenname ist Pflicht |
| False Negatives | Mittel | Mehr geht in Auto-Funde |
| Performance | Niedrig | Ein DB-Read pro Kampagne |

---

## Erwartete Verbesserungen

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| False Positives (Auto-Confirm) | Hoch | Niedrig |
| Auto-Funde zur Prüfung | Wenig | Mehr |
| Qualität Auto-Confirms | Variabel | Hoch |
| Manueller Aufwand | Niedrig (aber Fehler) | Mittel (aber korrekt) |

---

## Rollback-Plan

```typescript
// Feature-Flag in monitoring-crawler/route.ts
const USE_COMPANY_BASED_MATCHING = true;

if (USE_COMPANY_BASED_MATCHING) {
  // Neue Logik
  const { companyKeywords, seoKeywords } = await getCompanyKeywordsForCampaign(...);
  const result = checkAutoConfirm(article, companyKeywords, seoKeywords);
} else {
  // Alte Logik
  const keywords = campaign.monitoringConfig?.keywords || [];
  const shouldConfirm = shouldAutoConfirmSuggestion(sourceCount, avgScore, highestScore, minMatchScore);
}
```

---

*Erstellt am 25.11.2025*
*Überarbeitet am 25.11.2025 - Fokus auf Firmennamen als einzige zuverlässige Quelle*

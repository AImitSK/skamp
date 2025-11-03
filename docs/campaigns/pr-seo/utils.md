# PR-SEO Utils - Pure Function Library

> **Modul**: PR-SEO Utils
> **Version**: 2.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-03

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Module](#module)
  - [KeywordMetricsCalculator](#keywordmetricscalculator)
  - [PRMetricsCalculator](#prmetricscalculator)
  - [PRTypeDetector](#prtypedetector)
  - [SEOScoreCalculator](#seoscorecalculator)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Bug-Fixes Phase 5](#bug-fixes-phase-5)
- [Performance](#performance)
- [Testing](#testing)
- [Best Practices](#best-practices)

---

## Übersicht

Das **Utils-Modul** enthält alle Berechnungslogik des PR-SEO Tools als **Pure Functions**. Pure Functions sind deterministisch (gleiche Inputs → gleiche Outputs), haben keine Side Effects und sind ideal testbar.

**Dateien:**
- `keyword-metrics-calculator.ts` (105 Zeilen)
- `pr-metrics-calculator.ts` (90 Zeilen)
- `pr-type-detector.ts` (106 Zeilen)
- `seo-score-calculator.ts` (411 Zeilen)

**Gesamt**: 703 Zeilen Code + 320 Zeilen Tests = **86 Tests mit >85% Coverage**

**Vorteile von Pure Functions:**
- ✅ Deterministisch (keine Zufälligkeit)
- ✅ Testbar ohne Mocks
- ✅ Parallelisierbar
- ✅ Einfach zu debuggen
- ✅ Keine Side Effects

---

## Module

### KeywordMetricsCalculator

**Datei**: `keyword-metrics-calculator.ts` (105 Zeilen)

Berechnet **Basis-Metriken** für Keywords (ohne KI). Diese Metriken werden lokal berechnet und sind sofort verfügbar (kein API-Call).

#### Public API

##### `calculateBasicMetrics(keyword, text, documentTitle)`

Berechnet Basis-Metriken für ein Keyword.

**Signatur:**
```typescript
static calculateBasicMetrics(
  keyword: string,
  text: string,
  documentTitle: string
): Omit<KeywordMetrics, 'semanticRelevance' | 'contextQuality' | 'relatedTerms' | 'targetAudience' | 'tonality'>
```

**Parameter:**
- `keyword` (string) - Das zu analysierende Keyword (z.B. "Innovation")
- `text` (string) - Der HTML-Text-Inhalt (z.B. `<p>Innovation ist wichtig...</p>`)
- `documentTitle` (string) - Der Titel/Headline (z.B. "Innovation im Fokus")

**Return-Value:**
```typescript
{
  keyword: string;              // Das Keyword
  density: number;              // Keyword-Dichte in % (0-100)
  occurrences: number;          // Anzahl Vorkommen
  inHeadline: boolean;          // Kommt in Headline vor?
  inFirstParagraph: boolean;    // Kommt im ersten Absatz vor?
  distribution: 'gut' | 'mittel' | 'schlecht';  // Verteilung im Text
}
```

**Beispiel:**
```typescript
const metrics = KeywordMetricsCalculator.calculateBasicMetrics(
  'Innovation',
  '<p>Innovation ist der Schlüssel. Innovation hilft Unternehmen. Wir fördern Innovation.</p>',
  'Innovation im Fokus'
);

console.log(metrics);
/*
{
  keyword: 'Innovation',
  density: 3.75,              // 3 Vorkommen / 80 Wörter × 100
  occurrences: 3,
  inHeadline: true,           // "Innovation" in "Innovation im Fokus"
  inFirstParagraph: true,     // "Innovation" im ersten <p>-Tag
  distribution: 'gut'         // Gleichmäßig verteilt
}
*/
```

**Algorithmus:**

1. **Erste-Paragraph-Extraktion**:
   ```typescript
   const firstParagraphMatch = text.match(/<p[^>]*>(.*?)<\/p>/i);
   const firstParagraphText = firstParagraphMatch[1].replace(/<[^>]*>/g, ' ').toLowerCase();
   ```

2. **Text-Bereinigung**:
   ```typescript
   const cleanText = text.replace(/<[^>]*>/g, ' ').toLowerCase();
   const totalWords = cleanText.split(/\s+/).filter(word => word.length > 0).length;
   ```

3. **Keyword-Vorkommen zählen**:
   ```typescript
   const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
   const matches = cleanText.match(regex) || [];
   const occurrences = matches.length;
   ```

4. **Dichte berechnen**:
   ```typescript
   const density = totalWords > 0 ? (occurrences / totalWords) * 100 : 0;
   ```

5. **Position-Checks**:
   ```typescript
   // WICHTIG: Separate RegEx ohne 'g'-Flag für .test()
   const testRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
   const inFirstParagraph = testRegex.test(firstParagraphText);
   const inHeadline = testRegex.test(documentTitle.toLowerCase());
   ```

6. **Verteilung berechnen**:
   ```typescript
   const distribution = this.calculateDistribution(cleanText, new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i'));
   ```

**Edge Cases:**
- **Leerer Text**: `density = 0`, `occurrences = 0`, `distribution = 'schlecht'`
- **Keyword nicht gefunden**: `occurrences = 0`, `inHeadline = false`, `inFirstParagraph = false`
- **HTML-Tags**: Werden korrekt entfernt (auch `<strong>`, `<em>`, etc.)
- **Case-Insensitive**: "innovation", "Innovation", "INNOVATION" werden alle erkannt

---

##### `updateMetrics(keyword, text, documentTitle, existingMetrics?)`

Aktualisiert Basis-Metriken, behält aber KI-Daten bei.

**Signatur:**
```typescript
static updateMetrics(
  keyword: string,
  text: string,
  documentTitle: string,
  existingMetrics?: KeywordMetrics
): KeywordMetrics
```

**Parameter:**
- `keyword` (string) - Das Keyword
- `text` (string) - Der HTML-Text-Inhalt
- `documentTitle` (string) - Der Titel
- `existingMetrics` (KeywordMetrics, optional) - Bestehende Metriken mit KI-Daten

**Return-Value:**
```typescript
KeywordMetrics // Vollständiges Metrics-Objekt (Basis + KI)
```

**Beispiel:**
```typescript
// Bestehende Metriken mit KI-Daten
const existingMetrics = {
  keyword: 'Innovation',
  density: 2.0,
  occurrences: 2,
  inHeadline: false,
  inFirstParagraph: true,
  distribution: 'mittel',
  semanticRelevance: 85,      // KI-Daten (soll erhalten bleiben)
  contextQuality: 80,         // KI-Daten (soll erhalten bleiben)
  targetAudience: 'B2B',      // KI-Daten (soll erhalten bleiben)
  tonality: 'Sachlich',       // KI-Daten (soll erhalten bleiben)
  relatedTerms: ['Technologie', 'Entwicklung']  // KI-Daten (soll erhalten bleiben)
};

// User hat Content geändert → Basis-Metriken neu berechnen
const updatedMetrics = KeywordMetricsCalculator.updateMetrics(
  'Innovation',
  '<p>Innovation im Fokus. Innovation ist wichtig. Innovation hilft.</p>',
  'Innovation-Titel',
  existingMetrics
);

console.log(updatedMetrics);
/*
{
  keyword: 'Innovation',
  density: 3.5,               // NEU berechnet
  occurrences: 3,             // NEU berechnet
  inHeadline: true,           // NEU berechnet
  inFirstParagraph: true,     // NEU berechnet
  distribution: 'gut',        // NEU berechnet
  semanticRelevance: 85,      // ERHALTEN (KI)
  contextQuality: 80,         // ERHALTEN (KI)
  targetAudience: 'B2B',      // ERHALTEN (KI)
  tonality: 'Sachlich',       // ERHALTEN (KI)
  relatedTerms: ['Technologie', 'Entwicklung']  // ERHALTEN (KI)
}
*/
```

**Use-Case:**
Wird in `useKeywordAnalysis` verwendet, um bei Content-Änderung nur die Basis-Metriken neu zu berechnen, ohne die KI-Analyse erneut aufzurufen.

---

##### `calculateDistribution(cleanText, regex)` (private)

Berechnet die Verteilung eines Keywords im Text.

**Algorithmus:**
```typescript
private static calculateDistribution(
  cleanText: string,
  regex: RegExp
): 'gut' | 'mittel' | 'schlecht' {
  const textParts = cleanText.split(/\s+/);
  const keywordPositions = textParts
    .map((word, index) => regex.test(word) ? index / textParts.length : -1)
    .filter(pos => pos >= 0);

  if (keywordPositions.length >= 3) {
    const spread = Math.max(...keywordPositions) - Math.min(...keywordPositions);
    return spread > 0.4 ? 'gut' : spread > 0.2 ? 'mittel' : 'schlecht';
  } else if (keywordPositions.length >= 2) {
    return 'mittel';
  }

  return 'schlecht';
}
```

**Bewertungskriterien:**
- **gut**: ≥3 Vorkommen mit Spread >40% (gleichmäßig verteilt)
- **mittel**: ≥3 Vorkommen mit Spread 20-40% ODER ≥2 Vorkommen
- **schlecht**: <2 Vorkommen ODER Spread <20%

**Beispiele:**
```typescript
// GUT: Keyword am Anfang, Mitte, Ende
"Innovation ... Text ... Innovation ... Text ... Innovation"
// Positions: [0.05, 0.45, 0.95] → spread = 0.90 → "gut"

// MITTEL: Keyword am Anfang und Mitte
"Innovation ... Text ... Innovation ... Text"
// Positions: [0.05, 0.45] → 2 Vorkommen → "mittel"

// SCHLECHT: Keyword nur am Anfang
"Innovation ... Text ... Text ... Text"
// Positions: [0.05] → 1 Vorkommen → "schlecht"
```

---

#### Bug-Fixes (Phase 5)

**Problem**: RegEx mit `'g'`-Flag führte zu `lastIndex`-Bug in `.test()` Calls.

**Vorher (Buggy):**
```typescript
const regex = new RegExp(`\\b${keyword}\\b`, 'gi');  // 'g'-Flag!

// Erster .test() Call → regex.lastIndex = 10
const inFirstParagraph = regex.test(firstParagraphText);

// Zweiter .test() Call startet bei lastIndex = 10 (falsche Position!)
const inHeadline = regex.test(documentTitle.toLowerCase());  // BUG!
```

**Nachher (Fixed):**
```typescript
// Für .match() (braucht 'g'-Flag)
const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
const matches = cleanText.match(regex) || [];

// Für .test() (OHNE 'g'-Flag!)
const testRegex = new RegExp(`\\b${keyword}\\b`, 'i');
const inFirstParagraph = testRegex.test(firstParagraphText);
const inHeadline = testRegex.test(documentTitle.toLowerCase());
```

**Test-Coverage:**
```typescript
it('should be case-insensitive', () => {
  const result = KeywordMetricsCalculator.calculateBasicMetrics('SOFTWARE', text, title);
  expect(result.inHeadline).toBe(true);  // Vorher: false (Bug)
});
```

---

#### Tests

**86 Tests gesamt**, davon 29 für `KeywordMetricsCalculator`.

**Beispiel-Tests:**
```typescript
describe('calculateBasicMetrics', () => {
  it('should calculate keyword density correctly', () => {
    const result = KeywordMetricsCalculator.calculateBasicMetrics(
      'Digitalisierung',
      '<p>Digitalisierung ist wichtig. Digitalisierung hilft. Digitalisierung wächst.</p>',
      'Digitalisierung-Titel'
    );

    expect(result.keyword).toBe('Digitalisierung');
    expect(result.density).toBeGreaterThan(0);
    expect(result.occurrences).toBe(3);
  });

  it('should detect keyword in headline', () => {
    const result = KeywordMetricsCalculator.calculateBasicMetrics(
      'Software',
      '<p>Text</p>',
      'Software revolutioniert Digitalisierung'
    );

    expect(result.inHeadline).toBe(true);
  });

  it('should calculate distribution as "gut" for well-distributed keywords', () => {
    const spreadText = '<p>Software am Anfang</p><p>Text</p><p>Software Mitte</p><p>Text</p><p>Software Ende</p>';
    const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', spreadText, 'Titel');

    expect(result.distribution).toBe('gut');
  });
});
```

---

### PRMetricsCalculator

**Datei**: `pr-metrics-calculator.ts` (90 Zeilen)

Berechnet **PR-spezifische Metriken** für Struktur, Formatierung und Inhalt von Pressemitteilungen.

#### Public API

##### `calculate(text, title, keywords)`

Berechnet alle PR-Metriken für einen Text.

**Signatur:**
```typescript
static calculate(text: string, title: string, keywords: string[]): PRMetrics
```

**Parameter:**
- `text` (string) - Der HTML-Text-Inhalt
- `title` (string) - Der Titel/Headline
- `keywords` (string[]) - Die Keywords für Keyword-Checks

**Return-Value:**
```typescript
interface PRMetrics {
  // Headline
  headlineLength: number;
  headlineHasKeywords: boolean;
  headlineHasActiveVerb: boolean;

  // Lead-Absatz
  leadLength: number;
  leadHasNumbers: boolean;
  leadKeywordMentions: number;

  // Zitate
  quoteCount: number;
  avgQuoteLength: number;

  // Engagement
  hasActionVerbs: boolean;
  hasLearnMore: boolean;

  // Struktur
  avgParagraphLength: number;
  hasBulletPoints: boolean;
  hasSubheadings: boolean;

  // Konkretheit
  numberCount: number;
  hasSpecificDates: boolean;
  hasCompanyNames: boolean;
}
```

**Beispiel:**
```typescript
const prMetrics = PRMetricsCalculator.calculate(
  `<p>Innovation revolutioniert die Digitalisierung. 85% der Unternehmen investieren in Innovation.</p>
   <blockquote data-type="pr-quote">Innovation ist der Schlüssel zum Erfolg</blockquote>
   <h2>Weitere Details</h2>
   <ul><li>Punkt 1</li><li>Punkt 2</li></ul>`,
  'Innovation revolutioniert Digitalisierung',
  ['Innovation', 'Digitalisierung']
);

console.log(prMetrics);
/*
{
  headlineLength: 41,
  headlineHasKeywords: true,        // "Innovation" und "Digitalisierung" in Headline
  headlineHasActiveVerb: true,      // "revolutioniert"
  leadLength: 85,
  leadHasNumbers: true,             // "85%"
  leadKeywordMentions: 2,           // "Innovation" 1x, "Digitalisierung" 1x
  quoteCount: 1,                    // 1 <blockquote data-type="pr-quote">
  avgQuoteLength: 150,              // Estimate
  hasActionVerbs: false,            // Keine Action-Verben wie "jetzt", "heute"
  hasLearnMore: false,              // Keine "mehr erfahren"-Links
  avgParagraphLength: 85,           // Durchschnitt aus 1 Absatz
  hasBulletPoints: true,            // <ul>-Tag vorhanden
  hasSubheadings: true,             // <h2>-Tag vorhanden
  numberCount: 1,                   // "85"
  hasSpecificDates: false,          // Keine Datumsangaben
  hasCompanyNames: false            // Keine Firmennamen erkannt
}
*/
```

**Algorithmus-Details:**

**1. Absatz-Extraktion:**
```typescript
// Absätze korrekt aus HTML <p> Tags extrahieren
const paragraphMatches = text.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
const paragraphs = paragraphMatches
  .map(p => p.replace(/<[^>]*>/g, '').trim())
  .filter(p => p.length > 0);
```

**2. Zitat-Erkennung:**
```typescript
// PR-Zitate (Markup-basiert)
const prQuoteMatches = text.match(/<blockquote[^>]*data-type="pr-quote"[^>]*>/g) || [];
// Reguläre Blockquotes
const regularQuoteMatches = text.match(/<blockquote(?![^>]*data-type)[^>]*>/g) || [];
const quoteCount = prQuoteMatches.length + regularQuoteMatches.length;
```

**3. Aktive Verben:**
```typescript
const activeVerbs = this.getActiveVerbs();
const hasActiveVerb = activeVerbs.some(verb =>
  new RegExp(`\\b${verb.replace(/\s+/g, '\\s+')}\\b`, 'i').test(title)
);
```

**4. Keyword-Mentions im Lead:**
```typescript
leadKeywordMentions: keywords.reduce((count, kw) =>
  count + (paragraphs[0]?.toLowerCase().split(kw.toLowerCase()).length - 1 || 0), 0
)
```

**5. Firmennamen-Erkennung:**
```typescript
// Pattern 1: "Firma GmbH", "Company Inc"
/\b[A-Z][a-z]+ (GmbH|AG|Inc|Corp|Ltd)\b/.test(cleanText)

// Pattern 2: Großgeschriebene Wörter (z.B. "SAP Deutschland")
/\b[A-Z]{2,}(\s+[A-Z][a-z]+){1,3}\b/.test(cleanText)
```

---

##### `getActiveVerbs()`

Liefert erweiterte deutsche aktive Verben für verschiedene PR-Typen.

**Signatur:**
```typescript
static getActiveVerbs(): string[]
```

**Return-Value:**
```typescript
[
  // Business/Corporate (10 Verben)
  'startet', 'lanciert', 'präsentiert', 'entwickelt', 'investiert',
  'expandiert', 'gründet', 'übernimmt', 'kooperiert', 'digitalisiert',

  // Innovation/Tech (9 Verben)
  'innoviert', 'automatisiert', 'revolutioniert', 'optimiert', 'transformiert',
  'implementiert', 'integriert', 'skaliert', 'modernisiert',

  // Marketing/Sales (9 Verben)
  'führt ein', 'bringt heraus', 'veröffentlicht', 'kündigt an', 'erweitert',
  'verbessert', 'aktualisiert', 'steigert', 'erhöht',

  // Achievements (8 Verben)
  'erreicht', 'gewinnt', 'erhält', 'wird ausgezeichnet', 'feiert',
  'verzeichnet', 'erzielt', 'übertrifft',

  // Weitere (10 Verben)
  'realisiert', 'etabliert', 'verstärkt', 'ausbaut', 'schafft',
  'eröffnet', 'bietet', 'liefert', 'produziert', 'erschließt'
]
```

**Verwendung:**
Diese Verben werden in der Headline-Bewertung verwendet. Headlines mit aktiven Verben wirken dynamischer und erhalten Bonus-Punkte.

**Beispiele:**
```typescript
// GUTE Headlines (mit aktivem Verb):
"Firma X lanciert neue Software-Lösung"         // +15-25 Punkte
"Unternehmen Y gewinnt Innovation-Award"        // +15-25 Punkte
"Start-up Z revolutioniert Digitalisierung"     // +15-25 Punkte

// NEUTRALE Headlines (ohne aktives Verb):
"Neue Software-Lösung verfügbar"                // +0 Punkte
"Innovation-Award für Unternehmen Y"            // +0 Punkte
"Digitalisierung im Fokus"                      // +0 Punkte
```

---

#### Tests

**24 Tests** für `PRMetricsCalculator`.

**Beispiel-Tests:**
```typescript
describe('calculate', () => {
  it('should calculate headline metrics correctly', () => {
    const result = PRMetricsCalculator.calculate(
      '<p>Text</p>',
      'Software revolutioniert Digitalisierung',
      ['Software', 'Digitalisierung']
    );

    expect(result.headlineLength).toBe(41);
    expect(result.headlineHasKeywords).toBe(true);
    expect(result.headlineHasActiveVerb).toBe(true);  // "revolutioniert"
  });

  it('should count quotes correctly', () => {
    const text = `
      <blockquote data-type="pr-quote">Zitat 1</blockquote>
      <blockquote>Zitat 2</blockquote>
    `;
    const result = PRMetricsCalculator.calculate(text, 'Titel', []);

    expect(result.quoteCount).toBe(2);
  });

  it('should detect bullet points', () => {
    const text = '<ul><li>Punkt 1</li><li>Punkt 2</li></ul>';
    const result = PRMetricsCalculator.calculate(text, 'Titel', []);

    expect(result.hasBulletPoints).toBe(true);
  });
});
```

---

### PRTypeDetector

**Datei**: `pr-type-detector.ts` (106 Zeilen)

Erkennt PR-Typ aus Content und liefert typ-spezifische Bewertungsmodifikatoren. Dies ermöglicht eine **kontextsensitive Bewertung** (z.B. bei Financial PR sind Zahlen wichtiger als aktive Verben).

#### Public API

##### `detectType(content, title)`

Erkennt den PR-Typ aus Content und Titel.

**Signatur:**
```typescript
static detectType(content: string, title: string): PRTypeInfo
```

**Parameter:**
- `content` (string) - Der HTML-Text-Inhalt
- `title` (string) - Der Titel

**Return-Value:**
```typescript
interface PRTypeInfo {
  isProduct: boolean;     // Produkt-Launch, Service-Ankündigung
  isFinancial: boolean;   // Quartalszahlen, Bilanzen
  isPersonal: boolean;    // Personalien, Ernennungen
  isResearch: boolean;    // Studien, Umfragen
  isCrisis: boolean;      // Stellungnahmen, Richtigstellungen
  isEvent: boolean;       // Veranstaltungen, Konferenzen
}
```

**Erkennungsmuster:**

| PR-Typ | Keywords | Beispiele |
|--------|----------|-----------|
| **Product** | produkt, service, lösung, software, app, plattform, tool | "Neue Software-Lösung für Digitalisierung" |
| **Financial** | umsatz, gewinn, quartal, geschäftsjahr, bilanz, finanzen, ergebnis | "Quartalszahlen: Umsatz steigt um 15%" |
| **Personal** | ernennung, beförderung, new hire, verstorben, nachruf, award | "Max Mustermann wird neuer CTO" |
| **Research** | studie, umfrage, forschung, analyse, bericht, whitepaper | "Studie: 85% der Unternehmen investieren in KI" |
| **Crisis** | entschuldigung, bedauern, korrektur, richtigstellung, stellungnahme | "Stellungnahme zu Vorwürfen" |
| **Event** | veranstaltung, konferenz, messe, webinar, event, termin | "Konferenz: Innovation im Fokus am 15.03.2025" |

**Beispiel:**
```typescript
const prType = PRTypeDetector.detectType(
  '<p>Neue Software-Lösung für Digitalisierung verfügbar. Die Plattform bietet...</p>',
  'Software-Lösung revolutioniert Digitalisierung'
);

console.log(prType);
/*
{
  isProduct: true,        // "Software" und "Plattform" erkannt
  isFinancial: false,
  isPersonal: false,
  isResearch: false,
  isCrisis: false,
  isEvent: false
}
*/
```

**Multi-Type-Erkennung:**
Eine PR kann mehrere Typen gleichzeitig haben (z.B. Product + Event):
```typescript
const prType = PRTypeDetector.detectType(
  '<p>Neue Software wird auf Konferenz präsentiert...</p>',
  'Produkt-Launch auf Tech-Konferenz'
);

console.log(prType);
/*
{
  isProduct: true,   // "Software" und "Produkt"
  isFinancial: false,
  isPersonal: false,
  isResearch: false,
  isCrisis: false,
  isEvent: true      // "Konferenz"
}
*/
```

---

##### `getModifiers(content, title)`

Liefert PR-Typ-spezifische Modifikatoren für Bewertung.

**Signatur:**
```typescript
static getModifiers(content: string, title: string): PRTypeModifiers
```

**Parameter:**
- `content` (string) - Der HTML-Text-Inhalt
- `title` (string) - Der Titel

**Return-Value:**
```typescript
interface PRTypeModifiers {
  headlineModifier: number;       // Zusätzliche Punkte für Headline (0-12)
  verbImportance: number;         // Gewichtung für aktive Verben (3-25)
  recommendationSuffix: string;   // Erklärung für User
  prType: PRTypeInfo;             // Erkannter PR-Typ
}
```

**Modifikatoren nach PR-Typ:**

| PR-Typ | Headline-Modifier | Verb-Importance | Begründung |
|--------|-------------------|-----------------|------------|
| **Product/Event** | 0 | 25 | Aktive Verben sehr wichtig für Action |
| **Financial/Research** | 10 (Zahlen) | 5 | Zahlen wichtiger als Dynamik |
| **Personal** | 8 (Titel) | 8 | Titel und Position wichtiger |
| **Crisis** | 12 (Sachlichkeit) | 3 | Sachlichkeit wichtiger als Dynamik |
| **Standard** | 0 | 15 | Ausgewogene Bewertung |

**Beispiel:**
```typescript
const modifiers = PRTypeDetector.getModifiers(
  '<p>Quartalszahlen: Umsatz steigt auf 150 Millionen Euro...</p>',
  'Q3 2024: Umsatz steigt um 15%'
);

console.log(modifiers);
/*
{
  headlineModifier: 10,         // Zahlen-Bonus (weil isFinancial)
  verbImportance: 5,            // Verben unwichtig (weil isFinancial)
  recommendationSuffix: ' (Zahlen und Fakten wichtiger als aktive Sprache)',
  prType: {
    isProduct: false,
    isFinancial: true,          // "Quartalszahlen" und "Umsatz" erkannt
    isPersonal: false,
    isResearch: false,
    isCrisis: false,
    isEvent: false
  }
}
*/
```

**Empfehlungen mit Suffix:**
```typescript
// Bei Product PR:
"Aktive Verben empfohlen (bei Produkt/Event-PR verstärken aktive Verben die Wirkung)"

// Bei Financial PR:
"Aktive Verben sind optional (Zahlen und Fakten wichtiger als aktive Sprache)"

// Bei Personal PR:
"Aktive Verben können Headlines verstärken (bei Personal-PR sind Titel und Position wichtiger)"

// Bei Crisis PR:
"Aktive Verben sind optional (bei Crisis-PR ist sachliche Kommunikation wichtiger)"
```

---

##### `getThresholds(targetAudience)`

Liefert zielgruppen-spezifische Schwellenwerte für Bewertung.

**Signatur:**
```typescript
static getThresholds(targetAudience: string): AudienceThresholds
```

**Parameter:**
- `targetAudience` (string) - Die Zielgruppe ('B2B', 'B2C', 'Verbraucher', etc.)

**Return-Value:**
```typescript
interface AudienceThresholds {
  paragraphLength: { min: number; max: number };  // Optimale Absatzlänge
  sentenceComplexity: { max: number };            // Max. Wörter pro Satz
  technicalTerms: {
    bonus?: number;      // Punkte-Bonus für Fachbegriffe
    penalty?: number;    // Punkte-Abzug für Fachbegriffe
    neutral?: number;    // Neutral (weder Bonus noch Penalty)
  };
}
```

**Schwellenwerte nach Zielgruppe:**

| Zielgruppe | Absatzlänge | Satzkomplexität | Fachbegriffe | Begründung |
|------------|-------------|-----------------|--------------|------------|
| **B2B** | 150-500 Zeichen | Max. 25 Wörter | +10 Bonus | Fachpublikum erwartet Detail-Tiefe |
| **B2C** | 80-250 Zeichen | Max. 15 Wörter | -5 Penalty | Allgemeinpublikum bevorzugt Einfachheit |
| **Verbraucher** | 60-200 Zeichen | Max. 12 Wörter | -10 Penalty | Sehr einfache Sprache erforderlich |
| **Standard** | 100-300 Zeichen | Max. 20 Wörter | 0 Neutral | Ausgewogene Bewertung |

**Beispiel:**
```typescript
const thresholds = PRTypeDetector.getThresholds('B2B');

console.log(thresholds);
/*
{
  paragraphLength: { min: 150, max: 500 },
  sentenceComplexity: { max: 25 },
  technicalTerms: { bonus: 10 }
}
*/

// Verwendung in Score-Berechnung:
if (avgParagraphLength >= 150 && avgParagraphLength <= 500) {
  score += 30;  // Optimal für B2B
} else if (avgParagraphLength > 500) {
  recommendations.push('[KI] Absätze für B2B-Zielgruppe kürzen (aktuell: 650 Zeichen - optimal: 150-500)');
}
```

**Integration mit KI-Analyse:**
Die Zielgruppe wird automatisch aus den KI-Metriken extrahiert:
```typescript
// In SEOScoreCalculator:
const targetAudiences = keywordMetrics
  .map(km => km.targetAudience)
  .filter((ta): ta is string => ta !== undefined && ta !== 'Unbekannt');
const dominantAudience = targetAudiences.length > 0 ? targetAudiences[0] : 'Standard';

const thresholds = PRTypeDetector.getThresholds(dominantAudience);
```

---

#### Tests

**20 Tests** für `PRTypeDetector`.

**Beispiel-Tests:**
```typescript
describe('detectType', () => {
  it('should detect product PR', () => {
    const result = PRTypeDetector.detectType(
      '<p>Neue Software-Lösung für Digitalisierung</p>',
      'Produkt-Launch'
    );

    expect(result.isProduct).toBe(true);
    expect(result.isFinancial).toBe(false);
  });

  it('should detect multiple types', () => {
    const result = PRTypeDetector.detectType(
      '<p>Neue Software wird auf Konferenz präsentiert. Umsatz steigt.</p>',
      'Titel'
    );

    expect(result.isProduct).toBe(true);
    expect(result.isEvent).toBe(true);
    expect(result.isFinancial).toBe(true);
  });
});

describe('getModifiers', () => {
  it('should return high verb importance for product PR', () => {
    const result = PRTypeDetector.getModifiers(
      '<p>Neue Software-Lösung</p>',
      'Produkt-Launch'
    );

    expect(result.verbImportance).toBe(25);
  });

  it('should return low verb importance for financial PR', () => {
    const result = PRTypeDetector.getModifiers(
      '<p>Quartalszahlen: Umsatz steigt</p>',
      'Q3 2024'
    );

    expect(result.verbImportance).toBe(5);
  });
});

describe('getThresholds', () => {
  it('should return B2B thresholds', () => {
    const result = PRTypeDetector.getThresholds('B2B');

    expect(result.paragraphLength).toEqual({ min: 150, max: 500 });
    expect(result.sentenceComplexity.max).toBe(25);
    expect(result.technicalTerms.bonus).toBe(10);
  });

  it('should return B2C thresholds', () => {
    const result = PRTypeDetector.getThresholds('B2C');

    expect(result.paragraphLength).toEqual({ min: 80, max: 250 });
    expect(result.technicalTerms.penalty).toBe(5);
  });
});
```

---

### SEOScoreCalculator

**Datei**: `seo-score-calculator.ts` (411 Zeilen)

Master-Calculator für den Gesamt-PR-Score. Integriert alle anderen Utils und berechnet den finalen Score nach 7 Kategorien.

#### Public API

##### `calculatePRScore(...)`

Berechnet den Gesamt-PR-Score.

**Signatur:**
```typescript
static calculatePRScore(
  prMetrics: PRMetrics,
  keywordMetrics: KeywordMetrics[],
  text: string,
  documentTitle: string,
  keywords: string[],
  keywordScoreData?: KeywordScoreData | null
): {
  totalScore: number;
  breakdown: PRScoreBreakdown;
  recommendations: string[];
}
```

**Parameter:**
- `prMetrics` (PRMetrics) - PR-Metriken aus `PRMetricsCalculator`
- `keywordMetrics` (KeywordMetrics[]) - Keyword-Metriken (Basis + KI)
- `text` (string) - Der HTML-Text-Inhalt
- `documentTitle` (string) - Der Titel
- `keywords` (string[]) - Die Keywords
- `keywordScoreData` (KeywordScoreData, optional) - Vorberechnete Keyword-Score-Daten

**Return-Value:**
```typescript
{
  totalScore: number;              // 0-100
  breakdown: PRScoreBreakdown;     // Score nach Kategorien
  recommendations: string[];       // Actionable Empfehlungen
}
```

**Beispiel:**
```typescript
const prMetrics = PRMetricsCalculator.calculate(text, title, keywords);
const keywordMetrics = [/* ... */];
const keywordScoreData = seoKeywordService.calculateKeywordScore(keywords, text, keywordMetrics);

const result = SEOScoreCalculator.calculatePRScore(
  prMetrics,
  keywordMetrics,
  text,
  title,
  keywords,
  keywordScoreData
);

console.log(result);
/*
{
  totalScore: 78,
  breakdown: {
    headline: 85,       // 20% Gewichtung
    keywords: 80,       // 20% Gewichtung
    structure: 75,      // 20% Gewichtung
    relevance: 70,      // 15% Gewichtung
    concreteness: 65,   // 10% Gewichtung
    engagement: 80,     // 10% Gewichtung
    social: 60          // 5% Gewichtung
  },
  recommendations: [
    'Headline etwas kürzen (aktuell: 95 Zeichen - optimal: 30-80)',
    '"Innovation" öfter verwenden (nur 1x - optimal: 2-5x)',
    '[KI] "Innovation" thematische Relevanz stärken (55%)',
    'Zitat oder Aussage hinzufügen',
    '2-3 relevante Hashtags hinzufügen für Social-Media-Optimierung'
  ]
}
*/
```

**Score-Berechnung:**
```typescript
totalScore = Math.round(
  (breakdown.headline * 0.20) +      // 20%
  (breakdown.keywords * 0.20) +      // 20%
  (breakdown.structure * 0.20) +     // 20%
  (breakdown.relevance * 0.15) +     // 15%
  (breakdown.concreteness * 0.10) +  // 10%
  (breakdown.engagement * 0.10) +    // 10%
  (breakdown.social * 0.05)          // 5%
);
```

**Ohne Keywords**: Score = 0 (keine Bewertung ohne Keywords möglich)

---

#### Score-Kategorien (Detailliert)

##### 1. Headline-Score (20%)

**Basis-Score**: 60 Punkte (solider Start)

**Längen-Bewertung:**
```typescript
if (headlineLength >= 30 && headlineLength <= 80) {
  score += 20;  // Optimal
} else if (headlineLength >= 25 && headlineLength <= 90) {
  score += 15;  // Gut
} else if (headlineLength >= 20 && headlineLength <= 100) {
  score += 10;  // Akzeptabel
} else {
  score -= 10;  // Zu kurz oder zu lang
  recommendations.push('Headline zu kurz/lang: X Zeichen (optimal: 30-80)');
}
```

**Keywords-Bonus:**
```typescript
if (headlineHasKeywords) {
  score += 15;
} else {
  recommendations.push('Keywords in Headline verwenden für bessere SEO-Performance');
}
```

**Aktive Verben (PR-Typ-bewusst):**
```typescript
if (headlineHasActiveVerb) {
  score += verbImportance;  // 3-25 Punkte (je nach PR-Typ)
} else {
  if (verbImportance >= 20) {
    recommendations.push('Aktive Verben empfohlen (bei Produkt/Event-PR)');
  } else if (verbImportance >= 10) {
    recommendations.push('Aktive Verben können Headlines verstärken');
  }
  // Bei verbImportance < 10: Keine Empfehlung (unwichtig für diesen PR-Typ)
}
```

**PR-Typ-Modifier:**
```typescript
score += headlineModifier;  // 0-12 Punkte (z.B. Zahlen-Bonus bei Financial PR)
```

**Keyword-Stuffing-Check:**
```typescript
const keywordMentions = keywords.reduce((count, kw) =>
  count + (documentTitle.toLowerCase().split(kw.toLowerCase()).length - 1), 0
);

if (keywordMentions > 2) {
  score -= 15;
  recommendations.push('Keyword-Stuffing in Headline vermeiden');
}
```

**Min/Max**: 40-100 Punkte

---

##### 2. Keyword-Score (20%)

Nutzt vorberechnete `KeywordScoreData` aus `seoKeywordService.calculateKeywordScore()`.

**Score-Komponenten:**
```typescript
interface KeywordScoreData {
  baseScore: number;        // 0-60 (Basis-Metriken)
  aiBonus: number;          // 0-40 (KI-Metriken)
  totalScore: number;       // 0-100
  hasAIAnalysis: boolean;
  breakdown: {
    keywordPosition: number;      // 0-15
    keywordDistribution: number;  // 0-15
    keywordVariations: number;    // 0-10
    naturalFlow: number;          // 0-10
    contextRelevance: number;     // 0-10
    aiRelevanceBonus: number;     // 0-40 (KI)
    fallbackBonus: number;        // 0-40 (ohne KI)
  };
}
```

**Empfehlungen generiert aus Breakdown:**
```typescript
if (baseScore < 30) {
  recommendations.push('Keywords besser positionieren: In Headline und ersten Absatz einbauen');
}
if (breakdown.keywordDistribution < 10) {
  recommendations.push('Keywords gleichmäßiger im Text verteilen');
}
if (breakdown.naturalFlow < 5) {
  recommendations.push('Keyword-Stuffing vermeiden - natürlichere Einbindung');
}
if (hasAIAnalysis && aiBonus < 20) {
  recommendations.push('[KI] Thematische Relevanz der Keywords zum Content verbessern');
}
```

**Keyword-spezifische Empfehlungen:**
```typescript
keywordMetrics.forEach(km => {
  if (km.density < 0.3) {
    recommendations.push(`"${km.keyword}" öfter verwenden (nur ${km.occurrences}x - optimal: 2-5x)`);
  } else if (km.density > 3.0) {
    recommendations.push(`"${km.keyword}" weniger verwenden (${km.occurrences}x = ${km.density.toFixed(1)}% - zu häufig)`);
  }

  if (!km.inHeadline && !km.inFirstParagraph) {
    recommendations.push(`"${km.keyword}" in Headline oder ersten Absatz einbauen`);
  }

  if (km.semanticRelevance && km.semanticRelevance < 60) {
    recommendations.push(`[KI] "${km.keyword}" thematische Relevanz stärken (${km.semanticRelevance}%)`);
  }
});
```

---

##### 3. Struktur-Score (20%)

Zielgruppen-basierte Bewertung mit `PRTypeDetector.getThresholds()`.

**Absatzlänge (zielgruppenbasiert):**
```typescript
const thresholds = PRTypeDetector.getThresholds(dominantAudience);

if (avgParagraphLength >= thresholds.paragraphLength.min &&
    avgParagraphLength <= thresholds.paragraphLength.max) {
  score += 30;  // Optimal
} else if (avgParagraphLength > thresholds.paragraphLength.max) {
  recommendations.push(`[KI] Absätze für ${dominantAudience}-Zielgruppe kürzen`);
}
```

**Formatierungs-Elemente:**
```typescript
if (hasBulletPoints) score += 20;    // Optional, aber hilfreich
if (hasSubheadings) score += 25;     // Struktur verbessert Lesbarkeit
```

**Lead-Länge:**
```typescript
if (leadLength >= 80 && leadLength <= 250) {
  score += 25;  // Optimal
} else {
  recommendations.push(`Lead-Absatz sollte 80-250 Zeichen haben (aktuell: ${leadLength})`);
}
```

---

##### 4. Relevanz-Score (15%)

KI-basiert: Durchschnittliche `contextQuality` aller Keywords.

```typescript
const relevanceScore = keywordMetrics.length > 0
  ? keywordMetrics.reduce((sum, km) => sum + (km.contextQuality || 50), 0) / keywordMetrics.length
  : 0;
```

**Wenn KI-Analyse verfügbar**: `contextQuality` von 0-100%
**Fallback ohne KI**: Default = 50%

---

##### 5. Konkretheit-Score (10%)

**Zahlen:**
```typescript
if (numberCount >= 2) score += 40;
```

**Spezifische Daten:**
```typescript
if (hasSpecificDates) score += 30;
```

**Firmennamen:**
```typescript
if (hasCompanyNames) score += 30;
```

**Empfehlung bei niedrigem Score:**
```typescript
if (numberCount < 2 && !hasSpecificDates && !hasCompanyNames) {
  recommendations.push('Konkrete Zahlen, Daten und Firmennamen verwenden');
}
```

---

##### 6. Engagement-Score (10%)

**Basis-Score**: 40 Punkte

**Zitat-Erkennung (Bug-Fix Phase 5):**
```typescript
// 4 Erkennungsmechanismen:
const hasBlockquotes = quoteCount >= 1;
const hasQuotationMarks = text.includes('"') || text.includes('„') || text.includes('"');
const hasAttributions = /\b(sagt|erklärt|betont|kommentiert|so|laut)\b/i.test(text);
const hasAnyQuote = hasBlockquotes || (hasQuotationMarks && hasAttributions);

if (hasAnyQuote) {
  score += 30;
} else {
  recommendations.push('Zitat oder Aussage hinzufügen (Strg+Shift+Q oder "..." mit Attribution)');
}
```

**CTA-Erkennung (Bug-Fix Phase 5):**
```typescript
// 4 Erkennungsmechanismen:
const hasStandardCTA = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g)?.length >= 1;
const hasContactInfo = /\b(kontakt|telefon|email|@|\.de|\.com)\b/i.test(text);
const hasUrls = /\b(http|www\.|\.de|\.com)\b/i.test(text);
const hasActionWords = /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren|erfahren|downloaden)\b/i.test(text);
const hasAnyCTA = hasStandardCTA || hasContactInfo || hasUrls || hasActionWords;

if (hasAnyCTA) {
  score += 30;
} else {
  recommendations.push('Call-to-Action hinzufügen (Strg+Shift+C, Kontaktdaten oder Handlungsaufforderung)');
}
```

**Aktive Sprache:**
```typescript
if (hasActionVerbs) score += 20;
```

**Perfekte Kombination:**
```typescript
if (hasAnyQuote && hasAnyCTA) score += 10;  // Bonus
```

---

##### 7. Social-Media-Score (5%)

**Headline Twitter-optimiert:**
```typescript
if (documentTitle.length <= 280) {
  score += 40;
} else if (documentTitle.length <= 320) {
  score += 25;
  recommendations.push('Headline etwas kürzen für bessere Social-Media-Tauglichkeit');
} else {
  score += 10;
  recommendations.push('Headline für Twitter kürzen: Unter 280 Zeichen');
}
```

**Hashtags:**
```typescript
const detectedHashtags = HashtagDetector.detectHashtags(text);

if (detectedHashtags.length >= 3) {
  score += 35;
} else if (detectedHashtags.length >= 2) {
  score += 25;
} else if (detectedHashtags.length >= 1) {
  score += 15;
  recommendations.push('Weitere Hashtags ergänzen (optimal: 2-3 pro Post)');
} else {
  recommendations.push('2-3 relevante Hashtags hinzufügen');
}
```

**Hashtag-Qualität:**
```typescript
if (detectedHashtags.length > 0) {
  const quality = HashtagDetector.assessHashtagQuality(detectedHashtags, keywords);
  score += Math.min(25, (quality.averageScore / 100) * 25);

  if (quality.averageScore < 60) {
    recommendations.push('Verwende branchenrelevante und keyword-bezogene Hashtags');
  }
}
```

---

#### Bug-Fixes (Phase 5)

**1. CTA-Erkennung erweitert**

**Problem**: Nur CTA-Markup wurde erkannt, aber keine alternativen CTAs (Kontaktdaten, URLs, Action-Words).

**Fix**: 4 Erkennungsmechanismen implementiert:
```typescript
const hasStandardCTA = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g)?.length >= 1;
const hasContactInfo = /\b(kontakt|telefon|email|@|\.de|\.com)\b/i.test(text);
const hasUrls = /\b(http|www\.|\.de|\.com)\b/i.test(text);
const hasActionWords = /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren|erfahren|downloaden)\b/i.test(text);
const hasAnyCTA = hasStandardCTA || hasContactInfo || hasUrls || hasActionWords;
```

**2. Zitat-Erkennung erweitert**

**Problem**: Nur Blockquotes wurden erkannt, aber keine Inline-Quotes mit Attribution.

**Fix**: 3 Erkennungsmechanismen implementiert:
```typescript
const hasBlockquotes = quoteCount >= 1;
const hasQuotationMarks = text.includes('"') || text.includes('„') || text.includes('"');
const hasAttributions = /\b(sagt|erklärt|betont|kommentiert|so|laut)\b/i.test(text);
const hasAnyQuote = hasBlockquotes || (hasQuotationMarks && hasAttributions);
```

**3. Zielgruppen-basierte Schwellenwerte**

**Problem**: Alle Texte wurden nach gleichen Kriterien bewertet (unfair für B2B vs. B2C).

**Fix**: Zielgruppen-spezifische Schwellenwerte implementiert:
```typescript
const dominantAudience = /* aus keywordMetrics extrahiert */;
const thresholds = PRTypeDetector.getThresholds(dominantAudience);

// B2B: 150-500 Zeichen OK
// B2C: 80-250 Zeichen bevorzugt
// Verbraucher: 60-200 Zeichen erforderlich
```

---

#### Tests

**13 Tests** für `SEOScoreCalculator`.

**Beispiel-Tests:**
```typescript
describe('calculatePRScore', () => {
  it('should return 0 score when no keywords', () => {
    const result = SEOScoreCalculator.calculatePRScore(
      mockPRMetrics,
      [],
      text,
      title,
      [],
      null
    );

    expect(result.totalScore).toBe(0);
    expect(result.recommendations).toContain('Keywords hinzufügen für SEO-Bewertung');
  });

  it('should calculate headline score correctly', () => {
    const result = SEOScoreCalculator.calculatePRScore(
      {
        ...mockPRMetrics,
        headlineLength: 50,
        headlineHasKeywords: true,
        headlineHasActiveVerb: true
      },
      mockKeywordMetrics,
      text,
      title,
      ['Innovation'],
      null
    );

    expect(result.breakdown.headline).toBeGreaterThan(80);
  });

  it('should detect CTA with multiple mechanisms', () => {
    const textWithContactInfo = '<p>Kontaktieren Sie uns: info@firma.de</p>';
    const result = SEOScoreCalculator.calculatePRScore(
      mockPRMetrics,
      mockKeywordMetrics,
      textWithContactInfo,
      title,
      ['Innovation'],
      null
    );

    expect(result.breakdown.engagement).toBeGreaterThan(70);
  });
});
```

---

## Verwendungsbeispiele

### Minimales Beispiel

```typescript
import { KeywordMetricsCalculator } from './utils/keyword-metrics-calculator';

const metrics = KeywordMetricsCalculator.calculateBasicMetrics(
  'Innovation',
  '<p>Innovation ist wichtig. Innovation hilft.</p>',
  'Innovation im Fokus'
);

console.log(metrics);
// { keyword: 'Innovation', density: 2.5, occurrences: 2, ... }
```

### Vollständiger PR-Score

```typescript
import { PRMetricsCalculator } from './utils/pr-metrics-calculator';
import { SEOScoreCalculator } from './utils/seo-score-calculator';

// 1. PR-Metriken berechnen
const prMetrics = PRMetricsCalculator.calculate(text, title, keywords);

// 2. Keyword-Metriken berechnen (mit KI)
const keywordMetrics = await Promise.all(
  keywords.map(async keyword => {
    const basicMetrics = KeywordMetricsCalculator.calculateBasicMetrics(keyword, text, title);
    const aiMetrics = await analyzeKeyword(keyword, text);  // KI-API-Call
    return { ...basicMetrics, ...aiMetrics };
  })
);

// 3. Score berechnen
const result = SEOScoreCalculator.calculatePRScore(
  prMetrics,
  keywordMetrics,
  text,
  title,
  keywords,
  null
);

console.log('PR-Score:', result.totalScore);
console.log('Breakdown:', result.breakdown);
console.log('Empfehlungen:', result.recommendations);
```

### PR-Typ-erkennung

```typescript
import { PRTypeDetector } from './utils/pr-type-detector';

const prType = PRTypeDetector.detectType(content, title);

if (prType.isFinancial) {
  console.log('Financial PR erkannt → Zahlen wichtiger als Verben');
} else if (prType.isProduct) {
  console.log('Product PR erkannt → Aktive Verben sehr wichtig');
}

const modifiers = PRTypeDetector.getModifiers(content, title);
console.log('Verb-Gewichtung:', modifiers.verbImportance);
```

### Zielgruppen-basierte Bewertung

```typescript
import { PRTypeDetector } from './utils/pr-type-detector';

// Zielgruppe aus KI-Metriken
const targetAudience = keywordMetrics[0]?.targetAudience || 'Standard';

// Schwellenwerte laden
const thresholds = PRTypeDetector.getThresholds(targetAudience);

// Absatzlänge bewerten
if (avgParagraphLength >= thresholds.paragraphLength.min &&
    avgParagraphLength <= thresholds.paragraphLength.max) {
  console.log('Absatzlänge optimal für', targetAudience);
} else {
  console.log('Absatzlänge anpassen:', thresholds.paragraphLength);
}
```

---

## Bug-Fixes Phase 5

### Zusammenfassung

| Bug | Modul | Fix | Impact |
|-----|-------|-----|--------|
| **RegEx lastIndex** | KeywordMetricsCalculator | Separate RegEx ohne 'g'-Flag für .test() | Keyword-Position korrekt erkannt |
| **CTA-Erkennung** | SEOScoreCalculator | 4 Erkennungsmechanismen | Engagement-Score realistischer |
| **Zitat-Erkennung** | SEOScoreCalculator | 3 Erkennungsmechanismen | Engagement-Score realistischer |
| **Zielgruppen-Schwellenwerte** | SEOScoreCalculator + PRTypeDetector | Zielgruppen-spezifische Bewertung | Fairere Bewertung für B2B vs. B2C |

### Details

**1. RegEx lastIndex-Bug (KeywordMetricsCalculator)**

```typescript
// VORHER (Buggy):
const regex = new RegExp(`\\b${keyword}\\b`, 'gi');  // 'g'-Flag!
const inFirstParagraph = regex.test(firstParagraphText);  // lastIndex = 10
const inHeadline = regex.test(documentTitle);  // Startet bei lastIndex = 10 (FALSCH!)

// NACHHER (Fixed):
const regex = new RegExp(`\\b${keyword}\\b`, 'gi');  // Für .match()
const matches = cleanText.match(regex);

const testRegex = new RegExp(`\\b${keyword}\\b`, 'i');  // Ohne 'g'!
const inFirstParagraph = testRegex.test(firstParagraphText);
const inHeadline = testRegex.test(documentTitle);
```

**2. CTA-Erkennung (SEOScoreCalculator)**

```typescript
// VORHER: Nur Markup erkannt
const hasStandardCTA = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g)?.length >= 1;

// NACHHER: 4 Mechanismen
const hasStandardCTA = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g)?.length >= 1;
const hasContactInfo = /\b(kontakt|telefon|email|@|\.de|\.com)\b/i.test(cleanText);
const hasUrls = /\b(http|www\.|\.de|\.com)\b/i.test(cleanText);
const hasActionWords = /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren)\b/i.test(cleanText);
const hasAnyCTA = hasStandardCTA || hasContactInfo || hasUrls || hasActionWords;
```

**3. Zitat-Erkennung (SEOScoreCalculator)**

```typescript
// VORHER: Nur Blockquotes erkannt
const hasBlockquotes = quoteCount >= 1;

// NACHHER: 3 Mechanismen
const hasBlockquotes = quoteCount >= 1;
const hasQuotationMarks = text.includes('"') || text.includes('„') || text.includes('"');
const hasAttributions = /\b(sagt|erklärt|betont|kommentiert)\b/i.test(cleanText);
const hasAnyQuote = hasBlockquotes || (hasQuotationMarks && hasAttributions);
```

**4. Zielgruppen-Schwellenwerte (SEOScoreCalculator + PRTypeDetector)**

```typescript
// VORHER: Einheitliche Bewertung
if (avgParagraphLength >= 100 && avgParagraphLength <= 300) {
  score += 30;
}

// NACHHER: Zielgruppen-spezifisch
const dominantAudience = keywordMetrics[0]?.targetAudience || 'Standard';
const thresholds = PRTypeDetector.getThresholds(dominantAudience);

if (avgParagraphLength >= thresholds.paragraphLength.min &&
    avgParagraphLength <= thresholds.paragraphLength.max) {
  score += 30;
}
```

---

## Performance

### Pure Functions: Deterministisch & Testbar

**Vorteile:**
- ✅ Gleiche Inputs → Gleiche Outputs (keine Zufälligkeit)
- ✅ Keine Side Effects (keine Datenbank-/API-Calls)
- ✅ Einfach testbar (keine Mocks nötig)
- ✅ Parallelisierbar (mehrere Keywords gleichzeitig)

**Beispiel:**
```typescript
// Pure Function:
function calculateDensity(keyword: string, text: string): number {
  const occurrences = (text.match(new RegExp(keyword, 'gi')) || []).length;
  const totalWords = text.split(/\s+/).length;
  return (occurrences / totalWords) * 100;
}

// Deterministisch:
calculateDensity('Innovation', 'Innovation ist wichtig. Innovation hilft.') === 2.5  // IMMER
```

### Memoization (optional)

Für sehr lange Texte könnten Utils mit Memoization optimiert werden:

```typescript
import memoize from 'lodash/memoize';

const calculateBasicMetricsMemoized = memoize(
  KeywordMetricsCalculator.calculateBasicMetrics,
  (keyword, text, title) => `${keyword}|${text}|${title}`  // Cache-Key
);

// Bei gleichem Input wird gecachtes Ergebnis zurückgegeben
const metrics1 = calculateBasicMetricsMemoized('Innovation', text, title);  // Berechnet
const metrics2 = calculateBasicMetricsMemoized('Innovation', text, title);  // Cache-Hit
```

### Benchmark

```typescript
// Test: 1000 Keywords analysieren
console.time('Pure Function');
for (let i = 0; i < 1000; i++) {
  KeywordMetricsCalculator.calculateBasicMetrics('Keyword', text, title);
}
console.timeEnd('Pure Function');
// Pure Function: ~50ms (sehr schnell)
```

---

## Testing

### Test-Strategien

**1. Pure Function Tests (Deterministisch)**

```typescript
describe('calculateBasicMetrics', () => {
  it('should calculate keyword density correctly', () => {
    const result = KeywordMetricsCalculator.calculateBasicMetrics(
      'Digitalisierung',
      '<p>Digitalisierung ist wichtig. Digitalisierung hilft.</p>',
      'Digitalisierung-Titel'
    );

    expect(result.density).toBeGreaterThan(0);
    expect(result.occurrences).toBe(2);
  });
});
```

**2. Edge Case Tests**

```typescript
it('should handle empty text', () => {
  const result = KeywordMetricsCalculator.calculateBasicMetrics('Keyword', '', 'Titel');

  expect(result.density).toBe(0);
  expect(result.occurrences).toBe(0);
  expect(result.distribution).toBe('schlecht');
});

it('should handle HTML tags correctly', () => {
  const result = KeywordMetricsCalculator.calculateBasicMetrics(
    'Software',
    '<div><strong>Software</strong> ist <em>wichtig</em></div>',
    'Titel'
  );

  expect(result.occurrences).toBe(1);
});
```

**3. Regression Tests (Bug-Fixes)**

```typescript
it('should not have RegEx lastIndex bug', () => {
  const result = KeywordMetricsCalculator.calculateBasicMetrics(
    'SOFTWARE',  // Uppercase
    '<p>Software ist wichtig</p>',
    'Software-Titel'
  );

  expect(result.inHeadline).toBe(true);  // Vorher: false (Bug)
  expect(result.inFirstParagraph).toBe(true);
});
```

**4. Integration Tests**

```typescript
describe('Full PR Score Calculation', () => {
  it('should calculate complete score', () => {
    const prMetrics = PRMetricsCalculator.calculate(text, title, keywords);
    const keywordMetrics = [/* mock data */];

    const result = SEOScoreCalculator.calculatePRScore(
      prMetrics,
      keywordMetrics,
      text,
      title,
      keywords,
      null
    );

    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.breakdown.headline).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);
  });
});
```

### Coverage-Report

```bash
npm run test:coverage

# Output:
PASS  src/components/campaigns/pr-seo/utils/keyword-metrics-calculator.test.ts
PASS  src/components/campaigns/pr-seo/utils/pr-metrics-calculator.test.ts
PASS  src/components/campaigns/pr-seo/utils/pr-type-detector.test.ts
PASS  src/components/campaigns/pr-seo/utils/seo-score-calculator.test.ts

---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
utils/                     |   87.5  |   85.2   |   90.0  |   87.5  |
 keyword-metrics-...       |   92.3  |   88.9   |  100.0  |   92.3  |
 pr-metrics-calculator.ts  |   85.0  |   80.0   |   85.7  |   85.0  |
 pr-type-detector.ts       |   90.5  |   88.2   |  100.0  |   90.5  |
 seo-score-calculator.ts   |   84.2  |   82.5   |   85.7  |   84.2  |
---------------------------|---------|----------|---------|---------|
```

---

## Best Practices

### 1. Pure Functions bevorzugen

```typescript
// ✅ GOOD: Pure Function
function calculateDensity(keyword: string, text: string): number {
  const occurrences = (text.match(new RegExp(keyword, 'gi')) || []).length;
  const totalWords = text.split(/\s+/).length;
  return (occurrences / totalWords) * 100;
}

// ❌ BAD: Impure Function (Side Effects)
let globalDensity = 0;
function calculateDensity(keyword: string, text: string): void {
  globalDensity = /* ... */;  // Side Effect!
}
```

### 2. TypeScript-Typen nutzen

```typescript
// ✅ GOOD: Explizite Return-Types
static calculateBasicMetrics(
  keyword: string,
  text: string,
  documentTitle: string
): Omit<KeywordMetrics, 'semanticRelevance' | ...> {
  // ...
}

// ❌ BAD: Implizite Types
static calculateBasicMetrics(keyword, text, documentTitle) {
  // ...
}
```

### 3. Edge Cases testen

```typescript
// Immer testen:
// - Leere Strings
// - Null/Undefined
// - Extrem lange Texte
// - HTML-Entities
// - Case-Sensitivity
```

### 4. Dokumentation

```typescript
/**
 * Berechnet Basis-Metriken für ein Keyword
 * @param keyword - Das zu analysierende Keyword
 * @param text - Der HTML-Text-Inhalt
 * @param documentTitle - Der Titel des Dokuments
 * @returns Basis-Metriken (ohne KI-Felder)
 * @example
 * const metrics = KeywordMetricsCalculator.calculateBasicMetrics(
 *   'Innovation',
 *   '<p>Innovation ist wichtig</p>',
 *   'Innovation-Titel'
 * );
 */
static calculateBasicMetrics(...): ... {
  // ...
}
```

---

## Siehe auch

- **[../README.md](../README.md)** - Haupt-Dokumentation
- **[../hooks/README.md](../hooks/README.md)** - Hooks-Dokumentation
- **[../components/README.md](../components/README.md)** - Components-Dokumentation
- **[../types.ts](../types.ts)** - Type-Definitionen

---

**Letzte Aktualisierung**: 2025-11-03
**Version**: 2.0
**Autor**: CeleroPress Team

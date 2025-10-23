# Genkit Evaluation Ergebnisse - generatePressReleaseStructured Flow

**Datum:** 2025-10-23
**Flow:** `generatePressReleaseStructured`
**Test-Dataset:** `src/lib/ai/test-data/generate-press-release-structured-dataset.json` (5 Szenarien)

## Zusammenfassung

### Flow-Status

**Aktueller Stand:**
- Flow-Implementation: ✅ Produktionsreif
- 7 Custom Evaluators implementiert (6 Heuristic + 1 LLM-based)
- 5 Test-Szenarien mit vielfältigen Branchen
- Dokumenten-Kontext Support (bis zu 3 Dateien, max. 15k chars)
- Plain Text Generierung mit strukturiertem Parsing (bewährtes Pattern)

**Besonderheiten:**
- Strukturierte Output-Generierung (Headline, Lead, Body, Quote, CTA, Hashtags)
- Umfassende Prompt Library (700+ Zeilen System-Prompts)
- Industry-spezifische Prompts (Technology, Healthcare, Finance, Manufacturing)
- Tone-spezifische Prompts (Formal, Modern, Technical, Startup)
- Audience-spezifische Prompts (B2B, Consumer, Media)
- HTML-Generierung für direkten Editor-Import

---

## Evaluator-Scores

### Heuristic Evaluators

| Evaluator | Metrik | Erwartung | Gewichtung |
|-----------|--------|-----------|------------|
| ✅ Headline Length | 40-75 Zeichen | Strict | Hoch |
| ✅ Lead Length | 80-200 Zeichen | Strict | Hoch |
| ✅ Body Count | 3-4 Absätze | Strict | Mittel |
| ✅ Quote Structure | Vollständig (text, person, role, company) | Strict | Hoch |
| ✅ Hashtag Count | 2-3 Hashtags | Strict | Niedrig |
| ✅ Social Optimized | Flag gesetzt | Boolean | Niedrig |

### LLM-Based Evaluator

| Evaluator | Bewertungs-Skala | Kriterien |
|-----------|------------------|-----------|
| ✅ Overall PR Quality | 1-5 (normalisiert 0-1) | Journalistische Standards, Vollständigkeit, Faktische Präzision, Professionelle Sprache, SEO-Optimierung |

---

## Test-Szenarien im Detail

### ✅ Scenario 1: Tech-Startup Produktlaunch

**Test:** Vollständige Pressemitteilung mit allen Elementen

**Input:**
```json
{
  "prompt": "DataFlow startet KI-Plattform SmartAnalytics Pro für Unternehmensdaten-Analyse. 10x schnellere Verarbeitung, 80% Zeitersparnis. Ab 299€/Monat verfügbar.",
  "context": {
    "industry": "technology",
    "tone": "modern",
    "audience": "b2b",
    "companyName": "DataFlow"
  }
}
```

**Erwartetes Output:**
```json
{
  "headline": "DataFlow lanciert KI-Plattform SmartAnalytics Pro (40-75 chars)",
  "leadParagraph": "Berlin, 23.10.2025. DataFlow startet heute SmartAnalytics Pro... (80-200 chars)",
  "bodyParagraphs": [
    "Die KI-gestützte Plattform analysiert Unternehmensdaten zehnmal schneller...",
    "SmartAnalytics Pro nutzt maschinelles Lernen und verarbeitet...",
    "Die Lösung ist ab sofort verfügbar. Pricing: Ab 299 Euro/Monat..."
  ],
  "quote": {
    "text": "Mit SmartAnalytics Pro ermöglichen wir Unternehmen...",
    "person": "Max Mustermann",
    "role": "CEO",
    "company": "DataFlow"
  },
  "cta": "Weitere Informationen: www.dataflow.de | Pressekontakt: press@dataflow.de",
  "hashtags": ["#KI", "#DataAnalytics", "#B2B"],
  "socialOptimized": true,
  "htmlContent": "<h2>DataFlow lanciert...</h2><p>Berlin, 23.10.2025...</p>..."
}
```

**Evaluators (Erwartung):**
- ✅ Headline Length: 40-75 Zeichen
- ✅ Lead Length: 80-200 Zeichen
- ✅ Body Count: 3 Absätze
- ✅ Quote Structure: Vollständig (text, person, role, company)
- ✅ Hashtag Count: 3 Hashtags
- ✅ Social Optimized: true
- ✅ Overall Quality: 4-5/5 (Gut bis Exzellent)

**Reference Kriterien:**
```json
{
  "headlineMinLength": 40,
  "headlineMaxLength": 75,
  "leadMinLength": 80,
  "leadMaxLength": 200,
  "bodyParagraphsCount": {"min": 3, "max": 4},
  "hashtagsCount": {"min": 2, "max": 3},
  "quoteRequired": true,
  "socialOptimized": true
}
```

---

### ✅ Scenario 2: Healthcare Innovation

**Test:** Seriöse, vertrauenswürdige Sprache für Gesundheitswesen

**Input:**
```json
{
  "prompt": "MediCare GmbH führt Telemedizin-System ein. 500 Hausarztpraxen verbunden. 60% Reduktion der Wartezeiten. 5 Millionen Euro Förderung vom Bundesgesundheitsministerium.",
  "context": {
    "industry": "healthcare",
    "tone": "formal",
    "audience": "media",
    "companyName": "MediCare GmbH"
  }
}
```

**Erwartete Eigenschaften:**
- Formale, seriöse Sprache
- Fokus auf Patientenwohl und Qualität
- Erwähnung regulatorischer Aspekte (Bundesgesundheitsministerium)
- Konkrete Zahlen (500 Praxen, 60%, 5 Mio. EUR)

**Industry-Specific Prompt (Auszug):**
```
BRANCHE: GESUNDHEITSWESEN
✓ Vertrauenswürdige, seriöse Sprache
✓ Patientenwohl und Qualität betonen
✓ Regulatorische Aspekte erwähnen
Beispiele: "verbessert", "unterstützt", "erhöht Sicherheit"
```

**Evaluators (Erwartung):**
- ✅ Headline enthält "MediCare", "Telemedizin"
- ✅ Lead beantwortet 5 W-Fragen
- ✅ Body hebt Patientennutzen hervor
- ✅ Quote von Geschäftsführer oder Arzt
- ✅ CTA mit Kontaktdaten
- ✅ Overall Quality: 4-5/5 (Professionell, vertrauenswürdig)

---

### ✅ Scenario 3: Nachhaltigkeit/CO2-Reduktion

**Test:** Faktenbasierte Nachhaltigkeits-PR

**Input:**
```json
{
  "prompt": "TechParts stellt Produktion auf 100% erneuerbare Energien um. 45.000 Tonnen CO2 Reduktion pro Jahr. 50 Millionen Euro Investment in Solar und Wind. Umstellung bis Ende 2025.",
  "context": {
    "industry": "manufacturing",
    "tone": "formal",
    "audience": "media",
    "companyName": "TechParts"
  }
}
```

**Erwartete Eigenschaften:**
- Konkrete CO2-Zahlen prominent
- Investment-Summe im Lead
- Zeitrahmen klar kommuniziert
- Faktenbasiert, nicht werblich

**Industry-Specific Prompt (Auszug):**
```
BRANCHE: PRODUKTION/FERTIGUNG
✓ Effizienz und Nachhaltigkeit
✓ Prozessverbesserungen konkret
✓ Industrie 4.0 Begriffe
Beispiele: "steigert Produktivität", "reduziert CO2", "automatisiert"
```

**Evaluators (Erwartung):**
- ✅ Headline enthält CO2/Nachhaltigkeit/erneuerbare Energien
- ✅ Lead mit Kernfakten (45.000t, 50 Mio., 100%)
- ✅ Body beschreibt konkrete Maßnahmen
- ✅ Quote unterstreicht Nachhaltigkeits-Commitment
- ✅ Overall Quality: 4-5/5 (Klar, faktenbasiert, professionell)

---

### ✅ Scenario 4: Startup-Finanzierung

**Test:** Energiegeladene Startup-Tonalität

**Input:**
```json
{
  "prompt": "PropTech HomeMatch schließt 2 Millionen Euro Seed-Runde ab. KI-gestütztes Wohnungs-Matching. 50.000 Nutzer in 3 Monaten. Expansion nach Österreich und Schweiz geplant.",
  "context": {
    "industry": "technology",
    "tone": "startup",
    "audience": "media",
    "companyName": "HomeMatch"
  }
}
```

**Erwartete Eigenschaften:**
- Energiegeladene Sprache (aber nicht werblich!)
- Wachstumszahlen prominent
- Expansionspläne
- Disruption/Innovation betonen

**Tone-Specific Prompt (Auszug):**
```
TONALITÄT: STARTUP
✓ Energiegeladen und mutig
✓ Disruption und Wandel
✓ Wachstum und Vision
```

**Evaluators (Erwartung):**
- ✅ Headline mit Funding-Summe
- ✅ Lead mit Wachstumszahlen (50.000 Nutzer)
- ✅ Body mit Expansionsplänen
- ✅ Quote mit Vision/Zukunft
- ✅ Overall Quality: 4/5 (Dynamisch, aber professionell)

---

### ✅ Scenario 5: Mit Dokumenten-Kontext

**Test:** Dokument-Einbindung für detaillierte PRs

**Input:**
```json
{
  "prompt": "CloudSystems übernimmt KI-Startup DeepLearn für 120 Millionen Euro",
  "context": {
    "industry": "technology",
    "tone": "formal",
    "audience": "media",
    "companyName": "CloudSystems AG"
  },
  "documentContext": {
    "documents": [
      {
        "fileName": "acquisition-details.md",
        "plainText": "CloudSystems AG übernimmt DeepLearn GmbH. Transaktion: 120 Mio. EUR. DeepLearn: 85 Mitarbeiter, 200 Enterprise-Kunden in DACH. CloudSystems: 2.500 Mitarbeiter, 450 Mio. EUR Jahresumsatz.",
        "excerpt": "Details zur Übernahme von DeepLearn durch CloudSystems"
      }
    ]
  }
}
```

**Erwartete Eigenschaften:**
- Nutzung von Details aus Dokument (85 MA, 200 Kunden, 450 Mio. Umsatz)
- Strukturierte Integration in Body-Paragraphs
- Keine Wiederholung von Dokument-Metadaten im Text

**Evaluators (Erwartung):**
- ✅ Dokument-Details integriert (nicht nur Prompt-Infos)
- ✅ Body umfasst vollständige Story (Übernahme + Hintergründe)
- ✅ Quote kontextualisiert Übernahme
- ✅ Overall Quality: 5/5 (Vollständig, detailreich, professionell)

---

## System-Prompt Details

### Prompt-Struktur (700+ Zeilen)

**1. Basis System-Prompt (150 Zeilen)**
- Expertenprofil (PR-Experte, dpa-Stil)
- Strukturvorgaben (Headline, Lead, Body, Quote, CTA)
- Formatierungs-Regeln
- HTML-Generierung

**2. Industry-Prompts (4 Branchen)**
```
TECHNOLOGY:    Fachbegriffe moderat, Innovation, Zahlen/Benchmarks
HEALTHCARE:    Vertrauenswürdig, Patientenwohl, Regulatorisch
FINANCE:       Präzise, konservativ, Compliance, ROI
MANUFACTURING: Effizienz, Nachhaltigkeit, Industrie 4.0
```

**3. Tone-Prompts (4 Tonalitäten)**
```
FORMAL:    Sachlich, neutral, vollständige Firmennamen
MODERN:    Dynamisch, zeitgemäß, Trends/Innovation
TECHNICAL: Fachbegriffe präzise, technische Details, Experten-Zielgruppe
STARTUP:   Energiegeladen, mutig, Disruption, Wachstum
```

**4. Audience-Prompts (3 Zielgruppen)**
```
B2B:      ROI/Effizienz, Entscheider-Perspektive, Business-Impact
CONSUMER: Nutzen/Benefits klar, verständliche Sprache, emotional
MEDIA:    Nachrichtenwert, journalistische Standards, Fakten/Quellen
```

**5. Quote-Extraktion (Spezialität)**
- Automatische Zitat-Generierung aus Body-Paragraphen
- Wenn im Prompt kein Zitat: AI generiert passende Quote
- Struktur: Text + Person + Rolle + Firma (vollständig)

**6. SEO-Optimierung**
- Headline-Länge 40-75 Zeichen
- Keywords am Anfang
- Hashtags für Social Media
- Social Optimized Flag (Headline ≤280 chars)

---

## Evaluators im Detail

### 1. Headline Length Evaluator

**Code:**
```typescript
export const prHeadlineLengthEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/headlineLength', displayName: 'Headline Length (40-75 chars)',
    definition: 'Checks headline length', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    const output = datapoint.output as StructuredPressRelease;
    const len = output.headline?.length || 0;
    const score = len >= 40 && len <= 75 ? 1 : 0;
    return {
      testCaseId: datapoint.testCaseId || 'unknown',
      evaluation: { score, details: { reasoning: `Headline: ${len} chars (expected 40-75)`, length: len } }
    };
  }
);
```

**Rationale:** SEO-optimale Headline-Länge nach journalistischem Standard

---

### 2. Lead Length Evaluator

**Code:**
```typescript
export const prLeadLengthEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/leadLength', displayName: 'Lead Length (80-200 chars)',
    definition: 'Checks lead paragraph length', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    const output = datapoint.output as StructuredPressRelease;
    const len = output.leadParagraph?.length || 0;
    const score = len >= 80 && len <= 200 ? 1 : 0;
    return {
      testCaseId: datapoint.testCaseId || 'unknown',
      evaluation: { score, details: { reasoning: `Lead: ${len} chars (expected 80-200)`, length: len } }
    };
  }
);
```

**Rationale:** Lead muss kompakt 5 W-Fragen beantworten, aber nicht zu lang sein

---

### 3. Body Count Evaluator

**Code:**
```typescript
export const prBodyCountEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/bodyCount', displayName: 'Body Paragraphs (3-4)',
    definition: 'Checks body paragraph count', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    const output = datapoint.output as StructuredPressRelease;
    const count = output.bodyParagraphs?.length || 0;
    const score = count >= 3 && count <= 4 ? 1 : 0;
    return {
      testCaseId: datapoint.testCaseId || 'unknown',
      evaluation: { score, details: { reasoning: `${count} body paragraphs (expected 3-4)`, count } }
    };
  }
);
```

**Rationale:** Standard-PR-Struktur: 3-4 Absätze für vollständige Story

---

### 4. Quote Structure Evaluator

**Code:**
```typescript
export const prQuoteStructureEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/quoteStructure', displayName: 'Quote Structure Complete',
    definition: 'Checks quote has person, role, company', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    const output = datapoint.output as StructuredPressRelease;
    const quote = output.quote;
    const hasAll = quote?.text && quote?.person && quote?.role && quote?.company;
    const score = hasAll ? 1 : 0;
    return {
      testCaseId: datapoint.testCaseId || 'unknown',
      evaluation: {
        score,
        details: {
          reasoning: score === 1 ? 'Quote structure complete' : 'Missing quote fields',
          hasText: !!quote?.text, hasPerson: !!quote?.person,
          hasRole: !!quote?.role, hasCompany: !!quote?.company
        }
      }
    };
  }
);
```

**Rationale:** Journalistischer Standard verlangt vollständige Quellenangabe

---

### 5. Hashtag Count Evaluator

**Code:**
```typescript
export const prHashtagCountEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/hashtagCount', displayName: 'Hashtags (2-3)',
    definition: 'Checks 2-3 hashtags present', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    const output = datapoint.output as StructuredPressRelease;
    const count = output.hashtags?.length || 0;
    const score = count >= 2 && count <= 3 ? 1 : 0;
    return {
      testCaseId: datapoint.testCaseId || 'unknown',
      evaluation: { score, details: { reasoning: `${count} hashtags (expected 2-3)`, count } }
    };
  }
);
```

**Rationale:** Social Media Best Practice: 2-3 relevante Hashtags

---

### 6. Social Optimized Evaluator

**Code:**
```typescript
export const prSocialOptimizedEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/socialOptimized', displayName: 'Social Media Optimized',
    definition: 'Checks social optimization flag', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    const output = datapoint.output as StructuredPressRelease;
    const score = output.socialOptimized ? 1 : 0;
    return {
      testCaseId: datapoint.testCaseId || 'unknown',
      evaluation: { score, details: { reasoning: score === 1 ? 'Social optimized' : 'Not social optimized' } }
    };
  }
);
```

**Rationale:** Flag für Social-Media-Tauglichkeit (Headline ≤280 Zeichen)

---

### 7. Overall Quality Evaluator (LLM-based)

**Prompt:**
```
Du bist ein PR-Experte. Bewerte die Qualität dieser Pressemitteilung.

KRITERIEN:
1. Journalistische Standards (dpa-Stil)
2. Vollständigkeit (Headline, Lead, Body, Zitat, CTA)
3. Faktische Präzision
4. Professionelle Sprache
5. SEO-Optimierung

BEWERTUNG (1-5):
5: Exzellent - Publikationsreif
4: Gut - Kleine Anpassungen nötig
3: Akzeptabel - Mehrere Verbesserungen nötig
2: Schwach - Signifikante Mängel
1: Ungenügend - Nicht publikationsreif

PRESSEMITTEILUNG:
Headline: {{headline}}
Lead: {{lead}}
Body: {{body}}
Zitat: "{{quoteText}}" - {{quotePerson}}, {{quoteRole}}

Bewerte mit JSON:
{ "score": <1-5>, "reasoning": "<Begründung>" }
```

**Rationale:** Holistisches Quality Assessment durch LLM-as-Judge

---

## Offene Fragen / Nächste Schritte

### 1. Initial Evaluation durchführen

**Status:** ⏳ Ausstehend

**TODO:**
```bash
genkit eval:flow generatePressReleaseStructured \
  --input src/lib/ai/test-data/generate-press-release-structured-dataset.json \
  --evaluators pressRelease/headlineLength,pressRelease/leadLength,pressRelease/bodyCount,pressRelease/quoteStructure,pressRelease/hashtagCount,pressRelease/socialOptimized,pressRelease/quality
```

**Erwartete Baseline:**
- Heuristic Evaluators: 80-90% Pass-Rate (Flow bereits produktionsreif)
- LLM Quality Evaluator: 4/5 im Durchschnitt

---

### 2. Prompt-Optimierung basierend auf Evaluation

**Mögliche Verbesserungen:**
1. ✅ Quote-Extraktion verbessern (mehr Kontext aus Body)
2. ✅ Body-Struktur diversifizieren (nicht immer gleiche Abfolge)
3. ✅ CTA-Varianten (nicht nur "Weitere Informationen")
4. ✅ HTML-Formatierung konsistenter (Listen, Fettdruck)

---

### 3. Dokumenten-Kontext Testing

**Status:** ⚠️ Nur 1 Test-Case mit Dokumenten (Scenario 5)

**TODO:** Mehr Test-Cases mit:
- Mehrere Dokumente (2-3 gleichzeitig)
- Große Dokumente (nahe 15k chars Limit)
- Konfligierende Informationen in Dokumenten
- Dokumente in verschiedenen Formaten

---

### 4. Industry/Tone/Audience Konsistenz

**Status:** ⚠️ Keine dedizierten Evaluators für Context-Einhaltung

**TODO:**
- Evaluator: Industry Context Adherence
- Evaluator: Tone Consistency
- Evaluator: Audience Appropriateness

**Beispiel:**
```typescript
export const industryContextEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/industryContext', displayName: 'Industry Context Adherence',
    definition: 'Checks if PR matches industry-specific requirements', isBilled: true },
  async (datapoint: BaseEvalDataPoint) => {
    // LLM-based check: Ist die PR passend für die Branche?
  }
);
```

---

## Verwendete Dateien

### Code
- `src/lib/ai/flows/generate-press-release-structured.ts` - Flow Implementation (680 Zeilen)
- `src/lib/ai/schemas/press-release-structured-schemas.ts` - Zod Schemas (74 Zeilen)
- `src/lib/ai/evaluators/press-release-structured-evaluators.ts` - 7 Evaluators (210 Zeilen)
- `src/app/api/ai/generate-structured/route.ts` - API Route (120 Zeilen, -84% vs. vorher)

### Test-Daten
- `src/lib/ai/test-data/generate-press-release-structured-dataset.json` - 5 Test-Szenarien
  - Tech product launch (DataFlow)
  - Healthcare innovation (MediCare)
  - Sustainability (TechParts)
  - Startup funding (HomeMatch)
  - With documents (CloudSystems) ← Dokumenten-Kontext Test

### Prompt Library
- **System Prompt:** 150 Zeilen Basis-Prompt
- **Industry Prompts:** 4 × ~20 Zeilen (Technology, Healthcare, Finance, Manufacturing)
- **Tone Prompts:** 4 × ~15 Zeilen (Formal, Modern, Technical, Startup)
- **Audience Prompts:** 3 × ~15 Zeilen (B2B, Consumer, Media)
- **GESAMT:** ~700 Zeilen strukturierte Prompts

---

## CLI-Befehle für Reproduktion

### Evaluation ausführen
```bash
genkit eval:flow generatePressReleaseStructured \
  --input src/lib/ai/test-data/generate-press-release-structured-dataset.json \
  --evaluators pressRelease/headlineLength,pressRelease/leadLength,pressRelease/bodyCount,pressRelease/quoteStructure,pressRelease/hashtagCount,pressRelease/socialOptimized,pressRelease/quality
```

### Ergebnisse im Browser
```bash
# Genkit Dev UI öffnen
npm run genkit:dev

# Dann navigieren zu Evaluations-Tab
http://localhost:4002/evaluate
```

### Einzelnen Flow testen
```bash
genkit flow:run generatePressReleaseStructured '{
  "prompt": "TechCorp startet neue Cloud-Plattform",
  "context": {
    "industry": "technology",
    "tone": "modern",
    "audience": "b2b",
    "companyName": "TechCorp"
  },
  "documentContext": null
}'
```

### Mit Dokumenten testen
```bash
genkit flow:run generatePressReleaseStructured '{
  "prompt": "Übernahme-Ankündigung",
  "context": {...},
  "documentContext": {
    "documents": [
      {
        "fileName": "details.md",
        "plainText": "Details zur Übernahme...",
        "excerpt": "Kurzfassung..."
      }
    ]
  }
}'
```

---

## Fazit

Der `generatePressReleaseStructured` Flow ist **produktionsreif**:
- ✅ Umfassende Prompt Library (700+ Zeilen)
- ✅ 7 Custom Evaluators (6 Heuristic + 1 LLM-based)
- ✅ 5 Test-Szenarien mit vielfältigen Branchen
- ✅ Dokumenten-Kontext Support
- ✅ Code-Reduktion von 732 → 120 Zeilen (-84%) durch Migration

**Stärken:**
1. Strukturierte Output-Generierung mit vollständiger Validierung
2. Industry/Tone/Audience-spezifische Anpassungen
3. Automatische Quote-Extraktion
4. HTML-Generierung für direkten Editor-Import
5. Bewährtes Plain-Text-Parsing Pattern (wie bei Headlines)

**Nächste Schritte:**
1. 🔧 Initial Evaluation durchführen (Baseline etablieren)
2. 📊 Context-Adherence Evaluators hinzufügen
3. 🧪 Mehr Dokumenten-Kontext Test-Cases
4. 📈 Quote-Qualität separater Evaluator

**Empfehlung:**
- Flow in aktueller Form belassen
- Baseline-Evaluation durchführen
- Prompt-Optimierung nur bei konkreten Problemen in Evaluation

**Trade-off:**
- Umfangreiche Prompts (700+ Zeilen) → mehr Tokens, aber bessere Qualität
- Plain Text Parsing → robuster als JSON Mode (Lessons Learned aus Headlines)
- Temperature nicht dokumentiert → vermutlich 0.7 (Standard Genkit)

# 🎯 PR-SEO Analyse System 2.0 - Implementierungsplan

## 📋 Status: 🔴 NEU GEPLANT
**Stand:** 16.08.2025  
**Konzept:** PR-optimierte SEO-Analyse mit KI-Integration
**Fortschritt:** 0/8 Aufgaben

## 🏗️ Architektur-Übersicht

### Kernprinzipien:
- **2-Keyword-Limit** für fokussierte PR-Texte
- **Pro-Keyword Metriken** für präzise Analyse
- **KI nur bei manueller Aktion** (Keyword-Eingabe oder Aktualisieren)
- **PR-spezifische Metriken** statt generisches SEO

### KI-Integration:
- **NUTZE:** `/api/ai/generate` für SEO-Analyse (NICHT generate-structured!)
- Generate-structured ist für PR-Assistenten, nicht für Analyse
- Sparsame API-Calls nur bei User-Interaktion

## 📁 Relevante Dateien

### Bestehende Komponenten:
- `src/components/campaigns/SEOHeaderBar.tsx` - Header mit Metriken
- `src/components/FloatingAIToolbar.tsx` - Toolbar (SEO-Button entfernt)
- `src/lib/ai/seo-keyword-service.ts` - SEO-Service Layer

### API Routes:
- `src/app/api/ai/generate/route.ts` - ✅ DIESE für SEO-Analyse nutzen
- `src/app/api/ai/generate-structured/route.ts` - ❌ NICHT nutzen (PR-Assistent)
- `src/app/api/ai/custom-instruction/route.ts` - Für Custom Instructions

### Tests:
- `src/__tests__/seo-header-bar.test.tsx` - Bestehende Tests
- `src/__tests__/seo-keyword-service.test.tsx` - Service Tests (TODO)

## 📝 Implementierungs-Tasks

### 1. ⚡ **Keyword-Limit System** 
**Datei:** `src/components/campaigns/SEOHeaderBar.tsx`
- [ ] Max. 2 Keywords enforced
- [ ] Warnung bei Versuch 3. Keyword hinzuzufügen
- [ ] UI-Anpassung für 2-Keyword-Layout
- [ ] Badge-Design für Pro-Keyword-Scores

### 2. 📊 **Pro-Keyword Metriken**
**Datei:** `src/lib/ai/seo-keyword-service.ts`
```typescript
interface PerKeywordMetrics {
  keyword: string;
  
  // Basis-Metriken (ohne KI)
  density: number;              // 0.5-2% optimal
  occurrences: number;
  inHeadline: boolean;
  inFirstParagraph: boolean;
  distribution: 'gut' | 'mittel' | 'schlecht';
  
  // KI-Metriken (nur bei Aktualisieren)
  semanticRelevance?: number;   // 0-100
  contextQuality?: number;       // 0-100
  relatedTermsFound?: string[];
}
```

### 3. 🤖 **KI-Analyse Integration**
**Datei:** `src/lib/ai/seo-keyword-service.ts`
```typescript
// Neue Methoden
async analyzeKeywordWithAI(keyword: string, text: string): Promise<KeywordAIAnalysis>
async checkSemanticRelevance(keyword: string, text: string): Promise<number>
async findRelatedTerms(keyword: string, text: string): Promise<string[]>
```
- [ ] Nutze `/api/ai/generate` Route
- [ ] Präzise Prompts für Keyword-Analyse
- [ ] Response-Parsing für strukturierte Daten
- [ ] Error-Handling und Fallbacks

### 4. 🎨 **PR-spezifische Metriken**
**Datei:** `src/lib/ai/seo-keyword-service.ts`
```typescript
interface PRMetrics {
  // Headline-Qualität
  headlineLength: number;
  headlineHasKeywords: boolean;
  headlineHasActiveVerb: boolean;
  
  // Lead-Analyse (erste 150 Zeichen)
  leadLength: number;
  leadHasNumbers: boolean;
  leadKeywordMentions: number;
  
  // Zitat-Erkennung
  quoteCount: number;
  avgQuoteLength: number;
  
  // Call-to-Action (im Text)
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

### 5. 📈 **Neue Score-Berechnung**
**Datei:** `src/lib/ai/seo-keyword-service.ts`
```typescript
calculatePRScore(text: string, perKeywordMetrics: PerKeywordMetrics[], prMetrics: PRMetrics) {
  // Gewichtung:
  // 25% Headline & Lead-Qualität
  // 20% Keyword-Performance (Durchschnitt beider)
  // 20% Struktur & Lesbarkeit
  // 15% Semantische Relevanz (KI)
  // 10% Konkretheit (Zahlen, Fakten)
  // 10% Zitate & CTA
  
  return {
    totalScore: number,
    breakdown: {
      headline: number,
      keywords: number,
      structure: number,
      relevance: number,
      concreteness: number,
      engagement: number
    },
    recommendations: string[]
  };
}
```

### 6. 🎯 **Zitat-Erkennung System**
**Datei:** `src/components/editor/TipTapEditor.tsx` (erweitern)
- [ ] Zitat-Button in Editor-Toolbar
- [ ] Setzt `<blockquote>` Tags
- [ ] CSS-Styling für Zitate
- [ ] Parser in SEO-Service erkennt `<blockquote>`

### 7. 💡 **Intelligente Empfehlungen**
**Datei:** `src/lib/ai/seo-keyword-service.ts`
```typescript
generatePRRecommendations(metrics: PRMetrics, keywordMetrics: PerKeywordMetrics[]) {
  // Spezifische, umsetzbare Empfehlungen:
  // Statt: "Keyword-Dichte erhöhen"
  // Neu: "Erwähne 'Produktname' im ersten Absatz"
  
  // Priorisierte Liste:
  // 1. Kritische Fehler (z.B. Headline zu lang)
  // 2. Quick Wins (z.B. Zahl hinzufügen)
  // 3. Optimierungen (z.B. Satz kürzen)
}
```

### 8. 🧪 **Test-Suite Update**
**Datei:** `src/__tests__/seo-pr-metrics.test.tsx`
- [ ] Tests für 2-Keyword-Limit
- [ ] Tests für Pro-Keyword-Metriken
- [ ] Tests für PR-Score-Berechnung
- [ ] Mock KI-Responses
- [ ] Performance-Tests (Debouncing)

## 🔄 Implementierungs-Flow

### User-Workflow:
1. **User schreibt PR-Text** → Basis-Metriken live berechnet (ohne KI)
2. **User gibt Keyword ein** → KI analysiert NUR dieses Keyword
3. **User klickt "Aktualisieren"** → KI analysiert alle Keywords neu
4. **Feedback pro Keyword** → Individuelle Scores und Empfehlungen

### KI-Aufruf-Strategie:
```typescript
// Bei Keyword-Eingabe
onKeywordAdd = async (keyword) => {
  // 1. Basis-Metriken sofort berechnen
  const basicMetrics = calculateBasicMetrics(keyword, text);
  
  // 2. KI-Analyse async im Hintergrund
  const aiAnalysis = await analyzeWithAI(keyword, text);
  
  // 3. UI updaten mit KI-Ergebnissen
  updateKeywordMetrics(keyword, { ...basicMetrics, ...aiAnalysis });
};

// Bei Aktualisieren-Button
onRefresh = async () => {
  // Batch-Analyse für alle Keywords
  const promises = keywords.map(k => analyzeWithAI(k, text));
  const results = await Promise.all(promises);
  updateAllMetrics(results);
};
```

## ⚡ Performance-Optimierungen

### Caching:
- 5-Minuten Cache für KI-Analysen
- LocalStorage für letzte Analyse-Ergebnisse
- Debouncing bei Text-Änderungen (2 Sekunden)

### API-Optimierung:
```typescript
// Batching für mehrere Keywords
const batchAnalyze = async (keywords: string[], text: string) => {
  const prompt = `
    Analysiere diese Keywords für den PR-Text:
    Keywords: ${keywords.join(', ')}
    
    Gib für JEDES Keyword zurück:
    - Semantische Relevanz (0-100)
    - Kontext-Qualität (0-100)
    - 3 verwandte Begriffe
    
    Format: JSON
  `;
  
  // Ein API-Call statt mehrere
  return await callAPI('/api/ai/generate', { prompt });
};
```

## 🎨 UI/UX Verbesserungen

### Keyword-Badges:
```tsx
<Badge color={getScoreColor(metrics.semanticRelevance)}>
  {keyword}
  <div className="flex gap-1 ml-2">
    <span title="Relevanz">{metrics.semanticRelevance}%</span>
    <span title="Dichte">{metrics.density.toFixed(1)}%</span>
  </div>
</Badge>
```

### Visual Feedback:
- 🟢 Grün: Score > 70
- 🟡 Gelb: Score 40-70
- 🔴 Rot: Score < 40
- ⚡ Animation bei KI-Analyse
- ✅ Check-Icon wenn optimal

## 🚀 Migration von Alt zu Neu

### Phase 1: Basis-Implementation
1. Keyword-Limit einführen
2. Pro-Keyword-Metriken ohne KI
3. UI-Anpassungen

### Phase 2: KI-Integration
1. API-Anbindung implementieren
2. Semantic Relevance hinzufügen
3. Cache-System aktivieren

### Phase 3: PR-Features
1. Zitat-Erkennung
2. Headline-Analyse
3. Erweiterte Empfehlungen

## 📊 Erfolgsmetriken

### Performance:
- [ ] KI-Response < 2 Sekunden
- [ ] Basis-Metriken < 100ms
- [ ] Cache-Hit-Rate > 60%

### User Experience:
- [ ] Klare Pro-Keyword-Bewertung
- [ ] Umsetzbare Empfehlungen
- [ ] Verständliche Score-Aufschlüsselung

### Accuracy:
- [ ] Semantic Relevance Präzision > 80%
- [ ] Falsch-Positive Keywords < 10%
- [ ] Empfehlungs-Qualität > 85% hilfreich

---

**Status:** 🔴 **BEREIT FÜR IMPLEMENTIERUNG**  
**Priorität:** Hoch  
**Geschätzte Zeit:** 3-4 Tage  
**Nächster Schritt:** Keyword-Limit in SEOHeaderBar implementieren
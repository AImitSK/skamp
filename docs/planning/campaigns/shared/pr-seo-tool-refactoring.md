# PR SEO Tool Refactoring - Implementierungsplan

**Version:** 1.0
**Erstellt:** 2025-11-03
**Modul:** PR SEO Tool (PRSEOHeaderBar)
**Entry Point:** `src/components/campaigns/PRSEOHeaderBar.tsx`
**Status:** 📋 PLANUNG
**Aufwand:** XL (X-Large) - 4-5 Tage
**Priorität:** P0 (KRITISCH - blockiert Content Composer & Inhalt Tab!)

---

## 📋 Übersicht

**Problem:** Die PRSEOHeaderBar-Komponente ist mit **1.182 Zeilen** extrem groß und monolithisch aufgebaut. Alle Features (SEO-Score, Keyword-Analyse, KI-Integration, Hashtag-Detektion) sind in einer einzigen Datei implementiert.

**Verwendet in:**
- `src/components/pr/campaign/CampaignContentComposer.tsx` (529 Zeilen)
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` (2.437 Zeilen - Campaign Edit Page)

**Ziel:** Modularisierung in wartbare Sub-Komponenten (< 300 Zeilen), Custom Hooks extrahieren, Performance-Optimierung, vollständige Test-Coverage.

---

## 🎯 Ist-Zustand Analyse

### Datei-Größe
- **PRSEOHeaderBar.tsx:** 1.182 Zeilen (⚠️ EXTREM GROSS!)

### Hauptfunktionalitäten

1. **Keyword-Management** (Zeilen 150-783)
   - Keyword hinzufügen/entfernen (max 2 Keywords)
   - Basis-Metriken berechnen (Density, Occurrences, Distribution)
   - KI-Analyse per Keyword (Genkit Flow Integration)

2. **SEO Score Berechnung** (Zeilen 383-688)
   - PR-Metriken berechnen (Headline, Lead, Struktur)
   - 7-Kategorien-Bewertung (Headline 20%, Keywords 20%, Struktur 20%, Relevanz 15%, Konkretheit 10%, Engagement 10%, Social 5%)
   - PR-Typ-Erkennung (Product, Financial, Personal, Research, Crisis, Event)
   - Zielgruppen-basierte Schwellenwerte (B2B, B2C, Verbraucher)

3. **KI-Integration** (Zeilen 690-727)
   - Genkit Flow Aufruf: `/api/ai/analyze-keyword-seo`
   - Semantische Relevanz, Kontext-Qualität, Zielgruppe, Tonalität, Related Terms
   - Loading States

4. **Social Media Score** (Zeilen 351-380)
   - Headline Twitter-optimiert (< 280 Zeichen)
   - Hashtag-Detektion (HashtagDetector)
   - Hashtag-Qualität-Assessment

5. **Empfehlungen-System** (Zeilen 384-556)
   - Kontext-sensitive Empfehlungen basierend auf PR-Typ
   - Zielgruppen-spezifische Empfehlungen
   - KI-basierte Empfehlungen

6. **UI-Komponenten** (Zeilen 884-1182)
   - Score-Anzeige mit Badge
   - Keyword-Eingabe
   - Keyword-Metriken-Liste (One-Line Layout)
   - Score-Aufschlüsselung (4 Boxen)
   - KI-Analysis-Box
   - Empfehlungen-Liste (expandable)

### Probleme identifiziert

❌ **Monolithische Komponente** - Alle Features in einer Datei
❌ **Komplexe State-Logik** - 6+ useState, 3+ useEffect
❌ **Inline Berechnungen** - Score-Logik direkt in Komponente
❌ **Keine Separation of Concerns** - UI, Logic, Data-Fetching vermischt
❌ **Schwer testbar** - Zu viele Abhängigkeiten
❌ **Performance-Risiken** - Viele useCallback/useMemo nötig

### Dependencies

```typescript
// External
- React (useState, useEffect, useCallback, useMemo)
- @heroicons/react/24/outline (Icons)
- clsx (CSS)

// Internal
- @/components/ui/badge (Badge)
- @/components/ui/button (Button)
- @/components/ui/input (Input)
- @/lib/ai/seo-keyword-service (seoKeywordService)
- @/lib/hashtag-detector (HashtagDetector)
- @/lib/api/api-client (apiClient - Genkit Flow)
```

---

## 🚀 Refactoring-Plan: Die 8 Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/pr-seo-tool-refactoring
  ```

- [ ] Backup erstellen
  ```bash
  cp src/components/campaigns/PRSEOHeaderBar.tsx \
     src/components/campaigns/PRSEOHeaderBar.backup.tsx
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/components/campaigns/PRSEOHeaderBar.tsx
  # Ergebnis: 1.182 Zeilen
  ```

- [ ] Dependencies prüfen
  - React Query installiert? ✅
  - Testing Libraries vorhanden? ✅
  - TypeScript korrekt konfiguriert? ✅

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/pr-seo-tool-refactoring`
- Ist-Zustand: 1 Datei, 1.182 Zeilen Code
- Backup: PRSEOHeaderBar.backup.tsx erstellt
- Dependencies: Alle vorhanden

### Struktur (Ist)
- PRSEOHeaderBar.tsx: 1.182 Zeilen (monolithisch)
  - Keyword-Management: ~600 Zeilen
  - Score-Berechnung: ~300 Zeilen
  - KI-Integration: ~40 Zeilen
  - UI-Rendering: ~300 Zeilen

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für PR SEO Tool Refactoring

- Feature-Branch erstellt: feature/pr-seo-tool-refactoring
- Backup PRSEOHeaderBar.backup.tsx erstellt
- Ist-Zustand: 1 Datei, 1.182 Zeilen Code

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 2-3 Stunden (größere Datei)

#### 0.5.1 TODO-Kommentare finden

```bash
grep -rn "TODO:" src/components/campaigns/PRSEOHeaderBar.tsx
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen

#### 0.5.2 Console-Logs finden

```bash
grep -rn "console\." src/components/campaigns/PRSEOHeaderBar.tsx
```

**Gefunden (Zeile 714):**
```typescript
console.error('❌ SEO-Analyse Fehler:', error); // ✅ Production-relevant (behalten)
```

**Aktion:**
- [ ] Production-relevante console.error behalten
- [ ] Debug-Logs entfernen (falls vorhanden)

#### 0.5.3 Deprecated Functions finden

**Identifizierte Kandidaten:**
- Keine deprecated Functions gefunden ✅

#### 0.5.4 Unused State entfernen

```bash
grep -n "useState" src/components/campaigns/PRSEOHeaderBar.tsx
```

**State-Variablen (alle verwendet):**
- `newKeyword` - Keyword-Eingabe ✅
- `isAnalyzing` - Loading State ✅
- `keywordMetrics` - Keyword-Daten ✅
- `prScore` - Gesamt-Score ✅
- `scoreBreakdown` - Score-Details ✅
- `keywordScoreData` - Keyword-Score-Daten ✅
- `recommendations` - Empfehlungen ✅
- `showAllRecommendations` - Expandable Empfehlungen ✅

**Aktion:**
- [ ] Alle States sind in Verwendung ✅

#### 0.5.5 Kommentierte Code-Blöcke finden

**Gefunden:**
- Zeile 129: `const relevanceTrend = "";` - Kommentar: "Später implementierbar"
- Zeile 1041-1061: Auskommentierte Keyword-Score-Status Anzeige (`{false && ...}`)
- Zeile 1064-1108: Auskommentierte Social-Score Details (`{false && ...}`)

**Aktion:**
- [ ] `relevanceTrend` Variable entfernen (nicht implementiert)
- [ ] Auskommentierte UI-Blöcke entfernen (zu technisch für User laut Kommentar)

#### 0.5.6 ESLint Auto-Fix

```bash
npx eslint src/components/campaigns/PRSEOHeaderBar.tsx --fix
```

**Aktion:**
- [ ] ESLint ausführen
- [ ] Warnings prüfen

#### 0.5.7 Manueller Test

```bash
npm run dev
```

**Test-Schritte:**
- [ ] Campaign Edit Page öffnen
- [ ] PR SEO Tool laden
- [ ] Keyword hinzufügen
- [ ] KI-Analyse auslösen
- [ ] Score-Berechnung prüfen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] Debug-Console-Logs entfernt (0 gefunden)
- [ ] Deprecated Functions entfernt (0 gefunden)
- [ ] Unused State-Variablen entfernt (0 gefunden)
- [ ] Kommentierte Code-Blöcke gelöscht (~100 Zeilen)
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- 0 TODO-Kommentare
- 0 Debug-Console-Logs
- 0 Deprecated Functions
- 0 Unused State-Variablen
- ~100 Zeilen auskommentierte UI-Blöcke (Keyword-Score-Status, Social-Score Details)
- 1 unused Variable (relevanceTrend)
- Unused imports (via ESLint)

### Ergebnis
- PRSEOHeaderBar.tsx: 1.182 → ~1.080 Zeilen (-~100 Zeilen toter Code)
- Saubere Basis für Modularisierung
- Kein toter Code wird in neue Module übernommen

### Manueller Test
- ✅ Campaign Edit Page lädt
- ✅ PR SEO Tool funktioniert
- ✅ Keyword hinzufügen/entfernen funktioniert
- ✅ KI-Analyse funktioniert
- ✅ Score-Berechnung korrekt
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- ~100 Zeilen auskommentierte UI-Blöcke entfernt
- Unused Variable (relevanceTrend) entfernt
- Unused imports entfernt via ESLint

PRSEOHeaderBar.tsx: 1.182 → ~1.080 Zeilen (-~100 Zeilen toter Code)

Saubere Basis für Modularisierung (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Hinweis:** ⚠️ **NICHT ANWENDBAR** für PR SEO Tool!

Das PR SEO Tool hat **KEINE Backend-Calls** außer der KI-Analyse (bereits über `apiClient` implementiert). Alle Berechnungen sind **client-side**.

**Entscheidung:**
- ✅ **Phase 1 überspringen** - Keine React Query nötig
- ✅ KI-Analyse bleibt bei `apiClient.post()` (bestehende Implementation)
- ✅ Direkt zu Phase 2 (Modularisierung) springen

**Deliverable:**
```markdown
## Phase 1: React Query Integration ⏭️ ÜBERSPRUNGEN

### Begründung
- PR SEO Tool hat keine persistenten Backend-Daten
- Alle Berechnungen sind client-side (Score, Metriken)
- Einziger API-Call: KI-Analyse (bereits über apiClient implementiert)

### KI-Integration (bleibt unverändert)
- `/api/ai/analyze-keyword-seo` - Genkit Flow
- Verwendet: `apiClient.post()` (bestehend)
- Kein Caching nötig (Keywords ändern sich selten)

### Nächste Phase
→ Phase 2: Code-Separation & Modularisierung
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** 1.182 Zeilen in wartbare Module aufteilen (< 300 Zeilen)

**Geplante Struktur:**
```
src/components/campaigns/pr-seo/
├── PRSEOHeaderBar.tsx                    # Main Orchestrator (~250 Zeilen)
├── types.ts                              # Shared Types (~100 Zeilen)
├── components/
│   ├── KeywordInput.tsx                  # Keyword-Eingabe (~80 Zeilen)
│   ├── KeywordMetricsCard.tsx            # Keyword-Metriken-Zeile (~120 Zeilen)
│   ├── KIAnalysisBox.tsx                 # KI-Analysis-Box (~50 Zeilen)
│   ├── ScoreBreakdownGrid.tsx            # 4-Box Score-Anzeige (~80 Zeilen)
│   ├── RecommendationsList.tsx           # Empfehlungen expandable (~100 Zeilen)
│   └── SocialScoreInfo.tsx               # Social-Score Details (~60 Zeilen - optional)
├── hooks/
│   ├── useKeywordAnalysis.ts             # Keyword-Analyse Hook (~150 Zeilen)
│   ├── usePRScoreCalculation.ts          # Score-Berechnung Hook (~250 Zeilen)
│   └── useKIAnalysis.ts                  # KI-Integration Hook (~80 Zeilen)
└── utils/
    ├── seo-score-calculator.ts           # Score-Logik (~300 Zeilen)
    ├── pr-metrics-calculator.ts          # PR-Metriken (~200 Zeilen)
    ├── keyword-metrics-calculator.ts     # Keyword-Metriken (~150 Zeilen)
    └── pr-type-detector.ts               # PR-Typ & Zielgruppen (~100 Zeilen)

Gesamt: ~14 Dateien, durchschnittlich ~120 Zeilen
```

#### 2.1 Types extrahieren

**Datei:** `src/components/campaigns/pr-seo/types.ts`

**Inhalt:**
```typescript
// Alle Interfaces aus PRSEOHeaderBar.tsx
export interface KeywordMetrics { ... }
export interface PRMetrics { ... }
export interface PRScoreBreakdown { ... }
export interface KeywordScoreData { ... }
export interface PRSEOHeaderBarProps { ... }
export interface KIAnalysisBoxProps { ... }
```

**Aktion:**
- [ ] types.ts erstellen
- [ ] Alle Interfaces verschieben
- [ ] Exports hinzufügen

#### 2.2 Utils extrahieren

**Datei 1:** `src/components/campaigns/pr-seo/utils/keyword-metrics-calculator.ts`

**Inhalt:**
```typescript
export class KeywordMetricsCalculator {
  static calculateBasicMetrics(
    keyword: string,
    text: string,
    documentTitle: string
  ): Omit<KeywordMetrics, 'semanticRelevance' | 'contextQuality' | 'relatedTerms'> {
    // Logik aus calculateBasicMetrics (Zeilen 168-203)
  }
}
```

**Datei 2:** `src/components/campaigns/pr-seo/utils/pr-metrics-calculator.ts`

**Inhalt:**
```typescript
export class PRMetricsCalculator {
  static calculate(text: string, title: string, keywords: string[]): PRMetrics {
    // Logik aus calculatePRMetrics (Zeilen 231-274)
  }

  static getActiveVerbs(): string[] {
    // Logik aus getActiveVerbs (Zeilen 206-228)
  }
}
```

**Datei 3:** `src/components/campaigns/pr-seo/utils/pr-type-detector.ts`

**Inhalt:**
```typescript
export class PRTypeDetector {
  static detectType(content: string, title: string) {
    // Logik aus getPRTypeModifiers (Zeilen 307-348)
  }

  static getThresholds(targetAudience: string) {
    // Logik aus getThresholds (Zeilen 277-304)
  }
}
```

**Datei 4:** `src/components/campaigns/pr-seo/utils/seo-score-calculator.ts`

**Inhalt:**
```typescript
export class SEOScoreCalculator {
  static calculatePRScore(
    prMetrics: PRMetrics,
    keywordMetrics: KeywordMetrics[],
    text: string,
    documentTitle: string,
    keywords: string[],
    keywordScoreData?: KeywordScoreData | null
  ): { totalScore: number, breakdown: PRScoreBreakdown, recommendations: string[] } {
    // Logik aus calculatePRScore (Zeilen 383-688)
  }

  static calculateSocialScore(
    content: string,
    headline: string,
    hashtags?: string[]
  ): number {
    // Logik aus calculateSocialScore (Zeilen 351-380)
  }
}
```

**Aktion:**
- [ ] 4 Utils-Dateien erstellen
- [ ] Logik aus Komponente extrahieren
- [ ] Rein funktional (keine React Hooks)
- [ ] Exports hinzufügen
- [ ] Tests vorbereiten

#### 2.3 Custom Hooks erstellen

**Datei 1:** `src/components/campaigns/pr-seo/hooks/useKIAnalysis.ts`

**Inhalt:**
```typescript
import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/api-client';
import type { KeywordMetrics } from '../types';

export function useKIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeKeyword = useCallback(async (
    keyword: string,
    text: string
  ): Promise<Partial<KeywordMetrics>> => {
    // Logik aus analyzeKeywordWithAI (Zeilen 691-727)
  }, []);

  return { analyzeKeyword, isAnalyzing };
}
```

**Datei 2:** `src/components/campaigns/pr-seo/hooks/useKeywordAnalysis.ts`

**Inhalt:**
```typescript
import { useState, useCallback, useEffect } from 'react';
import { KeywordMetricsCalculator } from '../utils/keyword-metrics-calculator';
import { useKIAnalysis } from './useKIAnalysis';
import type { KeywordMetrics } from '../types';

export function useKeywordAnalysis(
  keywords: string[],
  content: string,
  documentTitle: string,
  onKeywordsChange: (keywords: string[]) => void
) {
  const [keywordMetrics, setKeywordMetrics] = useState<KeywordMetrics[]>([]);
  const { analyzeKeyword, isAnalyzing } = useKIAnalysis();

  const addKeyword = useCallback(async (keyword: string) => {
    // Logik aus handleAddKeyword (Zeilen 730-752)
  }, []);

  const removeKeyword = useCallback((keyword: string) => {
    // Logik aus handleRemoveKeyword (Zeilen 779-783)
  }, []);

  const refreshAnalysis = useCallback(async () => {
    // Logik aus handleRefreshAnalysis (Zeilen 755-768)
  }, []);

  // Auto-Update bei Content-Änderung
  useEffect(() => {
    // Logik aus useEffect (Zeilen 786-841)
  }, [content, keywords, documentTitle]);

  return {
    keywordMetrics,
    addKeyword,
    removeKeyword,
    refreshAnalysis,
    isAnalyzing
  };
}
```

**Datei 3:** `src/components/campaigns/pr-seo/hooks/usePRScoreCalculation.ts`

**Inhalt:**
```typescript
import { useState, useEffect } from 'react';
import { SEOScoreCalculator } from '../utils/seo-score-calculator';
import { PRMetricsCalculator } from '../utils/pr-metrics-calculator';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import type { KeywordMetrics, PRScoreBreakdown, KeywordScoreData } from '../types';

export function usePRScoreCalculation(
  content: string,
  documentTitle: string,
  keywords: string[],
  keywordMetrics: KeywordMetrics[],
  onSeoScoreChange?: (scoreData: any) => void
) {
  const [prScore, setPrScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<PRScoreBreakdown>({ ... });
  const [keywordScoreData, setKeywordScoreData] = useState<KeywordScoreData | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    // Logik aus useEffect (Zeilen 844-868)
  }, [content, documentTitle, keywordMetrics, keywords]);

  return {
    prScore,
    scoreBreakdown,
    keywordScoreData,
    recommendations
  };
}
```

**Aktion:**
- [ ] 3 Custom Hooks erstellen
- [ ] State-Logik extrahieren
- [ ] useCallback/useEffect korrekt implementieren
- [ ] Type-Safety sicherstellen

#### 2.4 Sub-Komponenten erstellen

**Datei 1:** `src/components/campaigns/pr-seo/components/KeywordInput.tsx`

**Inhalt:**
```typescript
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface KeywordInputProps {
  keywords: string[];
  onAddKeyword: (keyword: string) => void;
  maxKeywords?: number;
}

export function KeywordInput({ keywords, onAddKeyword, maxKeywords = 2 }: KeywordInputProps) {
  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim()) && keywords.length < maxKeywords) {
      onAddKeyword(newKeyword.trim());
      setNewKeyword('');
    }
  };

  return (
    <div className="flex gap-2 w-1/2">
      <Input
        type="text"
        value={newKeyword}
        onChange={(e) => setNewKeyword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        placeholder={keywords.length >= maxKeywords ? `Maximum ${maxKeywords} Keywords erreicht` : "Keyword hinzufügen..."}
        disabled={keywords.length >= maxKeywords}
        className="flex-1"
      />
      <Button
        type="button"
        onClick={handleAdd}
        color="secondary"
        className="whitespace-nowrap px-3 py-1.5 text-sm"
      >
        Hinzufügen
      </Button>
    </div>
  );
}
```

**Datei 2:** `src/components/campaigns/pr-seo/components/KIAnalysisBox.tsx`

**Inhalt:**
```typescript
// Logik aus KIAnalysisBox (Zeilen 108-139)
```

**Datei 3:** `src/components/campaigns/pr-seo/components/KeywordMetricsCard.tsx`

**Inhalt:**
```typescript
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { KIAnalysisBox } from './KIAnalysisBox';
import type { KeywordMetrics } from '../types';
import clsx from 'clsx';

interface KeywordMetricsCardProps {
  metrics: KeywordMetrics;
  isAnalyzing: boolean;
  onRemove: () => void;
}

export function KeywordMetricsCard({ metrics, isAnalyzing, onRemove }: KeywordMetricsCardProps) {
  return (
    <div className="flex items-center bg-white rounded-md p-3 gap-4">
      {/* Keyword + Basis-Metriken */}
      <div className="flex items-center gap-3 flex-1">
        <div className="text-base font-medium text-gray-900">
          {metrics.keyword}
        </div>
        <div className="flex gap-2 items-center">
          {/* Dichte, Vorkommen, Verteilung Badges */}
        </div>
      </div>

      {/* KI-Box + Delete */}
      <div className="flex items-center gap-3">
        <KIAnalysisBox metrics={metrics} isLoading={isAnalyzing} />
        <button onClick={onRemove} className="...">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

**Datei 4:** `src/components/campaigns/pr-seo/components/ScoreBreakdownGrid.tsx`

**Inhalt:**
```typescript
// 4-Box Grid (Zeilen 991-1038)
```

**Datei 5:** `src/components/campaigns/pr-seo/components/RecommendationsList.tsx`

**Inhalt:**
```typescript
// Expandable Empfehlungen-Liste (Zeilen 1139-1180)
```

**Aktion:**
- [ ] 5 Sub-Komponenten erstellen
- [ ] UI-Logik aus Hauptkomponente extrahieren
- [ ] Props korrekt typisieren
- [ ] React.memo für Performance

#### 2.5 Main Orchestrator refactorn

**Datei:** `src/components/campaigns/pr-seo/PRSEOHeaderBar.tsx`

**Neue Struktur (~250 Zeilen):**
```typescript
import { useKeywordAnalysis } from './hooks/useKeywordAnalysis';
import { usePRScoreCalculation } from './hooks/usePRScoreCalculation';
import { KeywordInput } from './components/KeywordInput';
import { KeywordMetricsCard } from './components/KeywordMetricsCard';
import { ScoreBreakdownGrid } from './components/ScoreBreakdownGrid';
import { RecommendationsList } from './components/RecommendationsList';
import type { PRSEOHeaderBarProps } from './types';

export function PRSEOHeaderBar({
  title = "PR-SEO Analyse",
  content,
  keywords,
  onKeywordsChange,
  documentTitle = '',
  className,
  onSeoScoreChange
}: PRSEOHeaderBarProps) {
  // Custom Hooks
  const {
    keywordMetrics,
    addKeyword,
    removeKeyword,
    refreshAnalysis,
    isAnalyzing
  } = useKeywordAnalysis(keywords, content, documentTitle, onKeywordsChange);

  const {
    prScore,
    scoreBreakdown,
    recommendations
  } = usePRScoreCalculation(content, documentTitle, keywords, keywordMetrics, onSeoScoreChange);

  return (
    <div className={clsx('bg-gray-50 rounded-lg p-4 border border-gray-200', className)}>
      {/* Header mit Score */}
      <div className="flex items-center justify-between mb-4">
        {/* ... */}
      </div>

      {/* Keyword-Eingabe */}
      <KeywordInput
        keywords={keywords}
        onAddKeyword={addKeyword}
        maxKeywords={2}
      />

      {/* Keyword-Metriken */}
      {keywordMetrics.length > 0 && (
        <div className="space-y-2 mb-4">
          {keywordMetrics.map((metrics) => (
            <KeywordMetricsCard
              key={metrics.keyword}
              metrics={metrics}
              isAnalyzing={isAnalyzing}
              onRemove={() => removeKeyword(metrics.keyword)}
            />
          ))}
        </div>
      )}

      {/* Score-Breakdown */}
      {keywords.length > 0 && (
        <>
          <ScoreBreakdownGrid breakdown={scoreBreakdown} />
          <RecommendationsList recommendations={recommendations} />
        </>
      )}
    </div>
  );
}
```

**Aktion:**
- [ ] Hauptkomponente auf ~250 Zeilen reduzieren
- [ ] Alle Custom Hooks verwenden
- [ ] Alle Sub-Komponenten einbinden
- [ ] Props korrekt weitergeben

#### 2.6 Backward Compatibility sicherstellen

**Datei:** `src/components/campaigns/PRSEOHeaderBar.tsx` (Root-Level)

**Inhalt:**
```typescript
// Re-export für bestehende Imports
export { PRSEOHeaderBar } from './pr-seo/PRSEOHeaderBar';
export type { PRSEOHeaderBarProps } from './pr-seo/types';
```

**Aktion:**
- [ ] Re-Export erstellen
- [ ] Bestehende Importer testen (CampaignContentComposer)
- [ ] Keine Breaking Changes

#### Checkliste Phase 2

- [ ] types.ts erstellt (100 Zeilen)
- [ ] 4 Utils-Module erstellt (~750 Zeilen gesamt)
- [ ] 3 Custom Hooks erstellt (~480 Zeilen gesamt)
- [ ] 5 Sub-Komponenten erstellt (~490 Zeilen gesamt)
- [ ] Main Orchestrator refactored (~250 Zeilen)
- [ ] Backward Compatibility sichergestellt
- [ ] Alle Imports aktualisiert
- [ ] Manueller Test durchgeführt

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Neue Struktur
- **14 Dateien** (statt 1 Monolith)
- **Durchschnittlich ~120 Zeilen pro Datei** (statt 1.182)
- **Separation of Concerns:** Utils, Hooks, Components getrennt

### Module
- types.ts (100 Zeilen) - Shared Types
- Utils (4 Dateien, ~750 Zeilen)
  - keyword-metrics-calculator.ts
  - pr-metrics-calculator.ts
  - pr-type-detector.ts
  - seo-score-calculator.ts
- Hooks (3 Dateien, ~480 Zeilen)
  - useKIAnalysis.ts
  - useKeywordAnalysis.ts
  - usePRScoreCalculation.ts
- Components (5 Dateien, ~490 Zeilen)
  - KeywordInput.tsx
  - KeywordMetricsCard.tsx
  - KIAnalysisBox.tsx
  - ScoreBreakdownGrid.tsx
  - RecommendationsList.tsx
- Main Orchestrator (~250 Zeilen)

### Code-Reduktion
- Hauptdatei: 1.182 → 250 Zeilen (-79%)
- Gesamt-LOC: ~2.070 Zeilen (inkl. neue Struktur)
- Overhead: ~890 Zeilen (+75% für Modularität)

### Vorteile
- ✅ Bessere Wartbarkeit (kleine Dateien)
- ✅ Testbarkeit stark verbessert (isolierte Utils)
- ✅ Wiederverwendbarkeit (Utils, Hooks)
- ✅ Klare Verantwortlichkeiten
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - PR SEO Tool Modularisierung abgeschlossen

- 1.182 Zeilen → 14 Module (~120 Zeilen avg)
- Utils: 4 Module (Score-Calc, PR-Metrics, Keyword-Metrics, PR-Type)
- Hooks: 3 Custom Hooks (KI, Keyword-Analyse, Score-Calc)
- Components: 5 Sub-Komponenten
- Main Orchestrator: 250 Zeilen
- Backward Compatibility: Re-Export für bestehende Importer

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden

#### 3.1 useCallback für Handler

**In:** `useKeywordAnalysis.ts`

```typescript
const addKeyword = useCallback(async (keyword: string) => {
  // ...
}, [keywords, content, onKeywordsChange]);

const removeKeyword = useCallback((keyword: string) => {
  // ...
}, [keywords, onKeywordsChange]);

const refreshAnalysis = useCallback(async () => {
  // ...
}, [keywords, content, analyzeKeyword]);
```

**Aktion:**
- [ ] Alle Handler mit useCallback wrappen
- [ ] Dependencies korrekt angeben

#### 3.2 useMemo für Computed Values

**In:** `PRSEOHeaderBar.tsx`

```typescript
const scoreBadgeColor = useMemo(() => {
  if (prScore === 0 && keywords.length === 0) return 'zinc';
  if (prScore >= 76) return 'green';
  if (prScore >= 51) return 'yellow';
  return 'red';
}, [prScore, keywords.length]);
```

**In:** `ScoreBreakdownGrid.tsx`

```typescript
const scoreColors = useMemo(() => {
  return Object.entries(breakdown).map(([key, value]) => ({
    key,
    value,
    color: value >= 70 ? 'green' : value >= 40 ? 'orange' : 'red'
  }));
}, [breakdown]);
```

**Aktion:**
- [ ] Computed Values mit useMemo cachen
- [ ] Badge-Colors, Score-Colors optimieren

#### 3.3 React.memo für Komponenten

**Alle Sub-Komponenten:**
```typescript
import React from 'react';

export const KeywordInput = React.memo(function KeywordInput({ ... }: Props) {
  // ...
});

export const KeywordMetricsCard = React.memo(function KeywordMetricsCard({ ... }: Props) {
  // ...
});

export const ScoreBreakdownGrid = React.memo(function ScoreBreakdownGrid({ ... }: Props) {
  // ...
});

export const RecommendationsList = React.memo(function RecommendationsList({ ... }: Props) {
  // ...
});

export const KIAnalysisBox = React.memo(function KIAnalysisBox({ ... }: Props) {
  // ...
});
```

**Aktion:**
- [ ] Alle 5 Sub-Komponenten mit React.memo wrappen
- [ ] Props-Comparison testen

#### 3.4 Debouncing (falls nötig)

**Hinweis:** Aktuell kein Live-Typing, nur Button-Click → Kein Debouncing nötig ✅

#### Checkliste Phase 3

- [ ] useCallback für 3 Handler (addKeyword, removeKeyword, refreshAnalysis)
- [ ] useMemo für 2 Computed Values (scoreBadgeColor, scoreColors)
- [ ] React.memo für 5 Komponenten
- [ ] Performance-Tests durchgeführt (React DevTools Profiler)

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 3 Handler
- useMemo für 2 Computed Values
- React.memo für 5 Sub-Komponenten

### Messbare Verbesserungen
- Re-Renders reduziert um ~60% (geschätzt)
- Score-Berechnung optimiert (gecacht)
- Sub-Komponenten rendern nur bei Props-Änderung

### Tools verwendet
- React DevTools Profiler
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

- useCallback für Handler (addKeyword, removeKeyword, refreshAnalysis)
- useMemo für Computed Values (scoreBadgeColor, scoreColors)
- React.memo für alle Sub-Komponenten

Re-Renders reduziert um ~60%.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle comprehensive Test Suite für PR SEO Tool Refactoring nach Phase 3.

Context:
- Modul: PR SEO Tool
- Utils: src/components/campaigns/pr-seo/utils/ (4 Module)
- Hooks: src/components/campaigns/pr-seo/hooks/ (3 Hooks)
- Components: src/components/campaigns/pr-seo/components/ (5 Komponenten)
- Main: src/components/campaigns/pr-seo/PRSEOHeaderBar.tsx

Requirements:
- Utils Tests (>80% Coverage für 4 Module)
  - seo-score-calculator.test.ts
  - pr-metrics-calculator.test.ts
  - keyword-metrics-calculator.test.ts
  - pr-type-detector.test.ts
- Hook Tests (>80% Coverage für 3 Hooks)
  - useKIAnalysis.test.tsx
  - useKeywordAnalysis.test.tsx
  - usePRScoreCalculation.test.tsx
- Component Tests (5 Komponenten)
  - KeywordInput.test.tsx
  - KeywordMetricsCard.test.tsx
  - KIAnalysisBox.test.tsx
  - ScoreBreakdownGrid.test.tsx
  - RecommendationsList.test.tsx
- Integration Test
  - PRSEOHeaderBar.test.tsx (End-to-End)
- Cleanup alter Tests
- Alle Tests müssen bestehen

Deliverable:
- Test-Suite vollständig implementiert (KEINE TODOs!)
- Coverage Report (npm run test:coverage)
- Test-Dokumentation
```

**Der Agent wird:**
1. Utils-Tests schreiben (4 Dateien)
2. Hook-Tests schreiben (3 Dateien mit renderHook)
3. Component-Tests schreiben (5 Dateien)
4. Integration-Test schreiben (1 Datei)
5. Alte Tests entfernen
6. Coverage Report erstellen
7. Test-Dokumentation generieren

#### Checkliste Phase 4

- [ ] refactoring-test Agent aufgerufen
- [ ] Utils-Tests: 4/4 erstellt (KEINE TODOs)
- [ ] Hook-Tests: 3/3 erstellt (KEINE TODOs)
- [ ] Component-Tests: 5/5 erstellt (KEINE TODOs)
- [ ] Integration-Test: 1/1 erstellt (KEINE TODOs)
- [ ] Alte Tests entfernt
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] Test-Dokumentation vorhanden

#### Deliverable

```markdown
## Phase 4: Testing ✅

**🤖 Agent-Workflow verwendet:** Ja

### Test Suite
- Utils-Tests: 4/4 bestanden ✅ (20+ Tests)
- Hook-Tests: 3/3 bestanden ✅ (15+ Tests)
- Component-Tests: 5/5 bestanden ✅ (25+ Tests)
- Integration-Test: 1/1 bestanden ✅ (5+ Tests)
- **Gesamt: 65+ Tests bestanden**

### Coverage
- Statements: 85% ✅
- Branches: 82% ✅
- Functions: 88% ✅
- Lines: 85% ✅

### Agent-Output
- ✅ Alle Tests vollständig implementiert (KEINE TODOs)
- ✅ Test-Dokumentation generiert
- ✅ Coverage Report erstellt
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt (via refactoring-test Agent)

- Utils-Tests: 4 Dateien (20+ Tests)
- Hook-Tests: 3 Dateien (15+ Tests)
- Component-Tests: 5 Dateien (25+ Tests)
- Integration-Test: 1 Datei (5+ Tests)

Gesamt: 65+ Tests, Coverage >80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Ziel:** Vollständige, wartbare Dokumentation

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle umfassende Dokumentation für PR SEO Tool Refactoring nach Phase 4.

Context:
- Modul: PR SEO Tool
- Utils: src/components/campaigns/pr-seo/utils/ (4 Module)
- Hooks: src/components/campaigns/pr-seo/hooks/ (3 Hooks)
- Components: src/components/campaigns/pr-seo/components/ (5 Komponenten)
- Main: src/components/campaigns/pr-seo/PRSEOHeaderBar.tsx
- Tests: Comprehensive Test Suite mit >80% Coverage

Requirements:
- README.md (Hauptdokumentation 400+ Zeilen)
- API-Dokumentation (Utils & Hooks 800+ Zeilen)
- Komponenten-Dokumentation (Props, Usage 650+ Zeilen)
- ADR-Dokumentation (Entscheidungen 350+ Zeilen)
- Code-Beispiele (funktionierend, getestet)
- Troubleshooting-Guides

Deliverable:
- Vollständige Dokumentation (2.500+ Zeilen)
- Funktionierende Code-Beispiele
```

**Der Agent wird:**
1. docs/campaigns/shared/pr-seo-tool/ Ordner-Struktur anlegen
2. README.md erstellen (Hauptdokumentation)
3. api/README.md + api/utils.md + api/hooks.md erstellen
4. components/README.md erstellen
5. adr/README.md erstellen
6. Code-Beispiele einbauen
7. Troubleshooting-Guides schreiben

**Output:**
- `docs/campaigns/shared/pr-seo-tool/README.md` (400+ Zeilen)
- `docs/campaigns/shared/pr-seo-tool/api/README.md` (200+ Zeilen)
- `docs/campaigns/shared/pr-seo-tool/api/utils.md` (400+ Zeilen)
- `docs/campaigns/shared/pr-seo-tool/api/hooks.md` (400+ Zeilen)
- `docs/campaigns/shared/pr-seo-tool/components/README.md` (650+ Zeilen)
- `docs/campaigns/shared/pr-seo-tool/adr/README.md` (350+ Zeilen)
- **Gesamt: 2.400+ Zeilen Dokumentation**

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] README.md (400+ Zeilen, vollständig)
- [ ] API-Docs (800+ Zeilen, vollständig)
- [ ] Component-Docs (650+ Zeilen, vollständig)
- [ ] ADR-Docs (350+ Zeilen, vollständig)
- [ ] Code-Beispiele funktionieren
- [ ] Alle Links funktionieren
- [ ] Keine Platzhalter ([TODO], [BESCHREIBUNG], etc.)

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅

**🤖 Agent-Workflow verwendet:** Ja

### Erstellt
- README.md (400+ Zeilen) - Hauptdokumentation ✅
- api/README.md (200+ Zeilen) - API-Übersicht ✅
- api/utils.md (400+ Zeilen) - Utils-Dokumentation ✅
- api/hooks.md (400+ Zeilen) - Hooks-Dokumentation ✅
- components/README.md (650+ Zeilen) - Komponenten-Dokumentation ✅
- adr/README.md (350+ Zeilen) - Architecture Decision Records ✅

### Gesamt
- **2.400+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Metriken

### Agent-Output
- ✅ Alle Dokumente vollständig (keine Platzhalter)
- ✅ Code-Beispiele funktionieren
- ✅ Konsistente Struktur
```

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt (via refactoring-dokumentation Agent)

- README.md (400+ Zeilen)
- API-Dokumentation (800+ Zeilen - Utils + Hooks)
- Komponenten-Dokumentation (650+ Zeilen)
- ADR-Dokumentation (350+ Zeilen)

Gesamt: 2.400+ Zeilen Dokumentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit | grep "campaigns/pr-seo"
```

**Aktion:**
- [ ] Alle TypeScript-Fehler beheben
- [ ] Type-Safety für alle Utils/Hooks/Components

#### 6.2 ESLint Check

```bash
npx eslint src/components/campaigns/pr-seo --fix
```

**Aktion:**
- [ ] ESLint ausführen
- [ ] Alle Warnings beheben

#### 6.3 Console Cleanup

```bash
grep -r "console\." src/components/campaigns/pr-seo
```

**Erlaubt:**
```typescript
// ✅ In useKIAnalysis.ts (catch-block)
console.error('❌ SEO-Analyse Fehler:', error);
```

**Aktion:**
- [ ] Nur production-relevante console.error behalten
- [ ] Debug-Logs entfernen

#### 6.4 Design System Compliance

**Prüfen:**
- [ ] Keine Schatten (außer Dropdowns)
- [ ] Nur Heroicons /24/outline
- [ ] Zinc-Palette für neutrale Farben
- [ ] #005fab für Primary Actions
- [ ] Focus-Rings (focus:ring-2 focus:ring-primary)

**Aktion:**
- [ ] Alle Komponenten gegen Design System prüfen
- [ ] Abweichungen korrigieren oder dokumentieren

#### 6.5 Final Build Test

```bash
npm run build
npm run start
```

**Prüfen:**
- [ ] Build erfolgreich
- [ ] Keine TypeScript-Errors
- [ ] Campaign Edit Page funktioniert
- [ ] PR SEO Tool funktioniert

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: Bestanden

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: 1 console.error (production-relevant)
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt

- TypeScript: 0 Fehler ✅
- ESLint: 0 Warnings ✅
- Design System: Compliant ✅
- Build: Erfolgreich ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Ziel:** FINALE Überprüfung ALLER Phasen vor Merge zu Main

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** PROAKTIV aufgerufen!

#### Agent wird automatisch aufgerufen

**Der Agent überprüft:**

**Phase 0/0.5 Checks:**
- [ ] Feature-Branch existiert
- [ ] Backup vorhanden
- [ ] Toter Code entfernt

**Phase 2 Checks:**
- [ ] 14 Module existieren
- [ ] Utils (4 Dateien) implementiert
- [ ] Hooks (3 Dateien) implementiert
- [ ] Components (5 Dateien) implementiert
- [ ] Main Orchestrator refactored
- [ ] Alte monolithische Datei entfernt
- [ ] Backward Compatibility funktioniert

**Phase 3 Checks:**
- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] React.memo für Komponenten

**Phase 4 Checks:**
- [ ] Tests existieren
- [ ] Alle Tests bestehen
- [ ] Coverage >80%
- [ ] KEINE TODOs in Tests

**Phase 5 Checks:**
- [ ] docs/campaigns/shared/pr-seo-tool/ existiert
- [ ] README.md vollständig (>400 Zeilen)
- [ ] API-Docs vollständig (>800 Zeilen)
- [ ] Component-Docs vollständig (>650 Zeilen)
- [ ] ADR-Docs vollständig (>350 Zeilen)
- [ ] KEINE Platzhalter

**Phase 6 Checks:**
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build erfolgreich

**Integration Checks:**
- [ ] Alte Datei gelöscht (nicht nur auskommentiert)
- [ ] Imports aktualisiert (CampaignContentComposer, Campaign Edit Page)
- [ ] Keine unused Imports
- [ ] Backward Compatibility funktioniert

**Output:**
- Comprehensive Quality Report
- GO/NO-GO Empfehlung

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] Quality Report erhalten
- [ ] ALLE Checks bestanden (GO)
- [ ] Falls NO-GO: Probleme behoben und Agent erneut aufgerufen

#### Deliverable

```markdown
## Phase 6.5: Quality Gate Check ✅

**🤖 Agent verwendet:** Ja

### Quality Report
- Phase 0/0.5: ✅ Bestanden
- Phase 2 (Modularisierung): ✅ Bestanden (14 Module)
- Phase 3 (Performance): ✅ Bestanden
- Phase 4 (Testing): ✅ Bestanden (>80% Coverage)
- Phase 5 (Dokumentation): ✅ Bestanden (2.400+ Zeilen)
- Phase 6 (Code Quality): ✅ Bestanden
- Integration Checks: ✅ Bestanden

### Result
**GO für Merge zu Main** ✅

### Keine Probleme gefunden
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden

Alle Phasen überprüft, GO für Merge zu Main.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 7: Merge zu Main

**Ziel:** Code zu Main mergen

**⚠️ WICHTIG:** Nur nach erfolgreichem Phase 6.5 Quality Gate Check!

#### Workflow

```bash
# 1. Finaler Commit (falls noch Änderungen)
git add .
git commit -m "chore: Finaler Cleanup vor Merge"

# 2. Push Feature-Branch
git push origin feature/pr-seo-tool-refactoring

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/pr-seo-tool-refactoring --no-edit

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- pr-seo
```

#### Checkliste Merge

- [ ] ⭐ Phase 6.5 Quality Gate Check bestanden (GO)
- [ ] Alle 8 Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

#### Final Report

```markdown
## ✅ PR SEO Tool Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 8 Phasen:** Abgeschlossen (0, 0.5, 1, 2, 3, 4, 5, 6, 6.5, 7)
- **Agent-Workflow:** Phase 4 (Testing), Phase 5 (Doku), Phase 6.5 (Quality Check)
- **Tests:** 65+/65+ bestanden ✅
- **Coverage:** 85% (>80%) ✅
- **Dokumentation:** 2.400+ Zeilen ✅
- **Quality Gate:** GO für Production ✅

### Änderungen
- +14 Dateien erstellt (neue Struktur)
- -1 Datei gelöscht (PRSEOHeaderBar.tsx monolithisch)
- ~2.070 Zeilen Code (inkl. neue Struktur)

### Highlights
- PRSEOHeaderBar: 1.182 → 14 Module (~120 Zeilen avg)
- Utils: 4 Module (Score-Calc, PR-Metrics, Keyword-Metrics, PR-Type)
- Hooks: 3 Custom Hooks (KI-Analyse, Keyword-Analyse, Score-Calc)
- Components: 5 Sub-Komponenten
- Performance-Optimierungen (useCallback, useMemo, React.memo)
- Comprehensive Test Suite (65+ Tests, via refactoring-test Agent)
- 2.400+ Zeilen Dokumentation (via refactoring-dokumentation Agent)
- Quality Gate Check bestanden (via refactoring-quality-check Agent)

### Agent-Workflow
- 🤖 **Phase 4:** refactoring-test Agent → 65+ Tests, 85% Coverage
- 🤖 **Phase 5:** refactoring-dokumentation Agent → 2.400+ Zeilen Docs
- 🤖 **Phase 6.5:** refactoring-quality-check Agent → GO für Merge

### Nächste Schritte
- [ ] **Phase 0.2:** KI Assistent Refactoring planen
- [ ] **Phase 0.3:** Content Composer Refactoring planen
- [ ] **Phase 1.1:** Campaign Edit Page Refactoring planen
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** 1.182 → 250 Zeilen Hauptdatei (-79%)
- **Komponenten-Größe:** Alle < 300 Zeilen
- **Module:** 14 Dateien (durchschnittlich ~120 Zeilen)
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** 85% (>80%)
- **Anzahl Tests:** 65+ Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Reduktion um ~60%
- **Score-Berechnung:** Optimiert (gecacht)

### Dokumentation

- **Zeilen:** 2.400+ Zeilen
- **Dateien:** 6 Dokumente
- **Code-Beispiele:** 15+ Beispiele

---

## 📝 Checkliste: Gesamtes Refactoring

### Phase 0: Vorbereitung
- [ ] Feature-Branch erstellt
- [ ] Backup erstellt
- [ ] Ist-Zustand dokumentiert

### Phase 0.5: Cleanup
- [ ] TODO-Kommentare entfernt
- [ ] Console-Logs entfernt
- [ ] Auskommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt

### Phase 1: React Query
- [ ] ⏭️ ÜBERSPRUNGEN (keine Backend-Calls)

### Phase 2: Modularisierung
- [ ] 14 Module erstellt
- [ ] Utils (4 Dateien)
- [ ] Hooks (3 Dateien)
- [ ] Components (5 Dateien)
- [ ] Main Orchestrator refactored
- [ ] Backward Compatibility

### Phase 3: Performance
- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] React.memo für Komponenten

### Phase 4: Testing ⭐ AGENT
- [ ] refactoring-test Agent aufgerufen
- [ ] 65+ Tests (KEINE TODOs)
- [ ] Coverage >80%

### Phase 5: Dokumentation ⭐ AGENT
- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] 2.400+ Zeilen Docs
- [ ] Keine Platzhalter

### Phase 6: Code Quality
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build erfolgreich

### Phase 6.5: Quality Gate ⭐ AGENT
- [ ] refactoring-quality-check Agent aufgerufen
- [ ] GO-Empfehlung erhalten

### Phase 7: Merge
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Tests auf Main bestanden

---

## 🔗 Referenzen

### Projekt-Spezifisch
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`
- **Master Template:** `docs/templates/module-refactoring-template.md`
- **Master Checklist:** `docs/planning/campaigns-refactoring-master-checklist.md`

### Dependencies
- **seoKeywordService:** `src/lib/ai/seo-keyword-service.ts`
- **HashtagDetector:** `src/lib/hashtag-detector.ts`
- **apiClient:** `src/lib/api/api-client.ts`
- **Genkit Flow:** `/api/ai/analyze-keyword-seo`

---

## 💡 Hinweise

### Besonderheiten

- **Keine React Query** - Alle Berechnungen client-side
- **KI-Integration** - Genkit Flow bleibt bei apiClient
- **Backward Compatibility** - Re-Export für bestehende Importer wichtig
- **Performance kritisch** - Score-Berechnung bei jedem Content-Update

### Risiken

- **Komplexe Score-Logik** - Viele Edge Cases (PR-Typen, Zielgruppen)
- **KI-Abhängigkeit** - Fallback-Werte bei Fehler wichtig
- **Breaking Changes** - Bestehende Importer (CampaignContentComposer, Campaign Edit Page) müssen getestet werden

---

**Zuletzt aktualisiert:** 2025-11-03
**Maintainer:** CeleroPress Team

**Status:** 📋 PLANUNG → Bereit für Phase 0

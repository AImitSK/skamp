# PR-SEO Hooks - State Management & KI-Integration

> **Modul**: PR-SEO Hooks
> **Version**: 2.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-03

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Hooks](#hooks)
  - [useKIAnalysis](#usekianalysis)
  - [useKeywordAnalysis](#usekeywordanalysis)
  - [usePRScoreCalculation](#useprscorecalculation)
- [Integration](#integration)
- [Best Practices](#best-practices)
- [Testing](#testing)

---

## Übersicht

Das **Hooks-Modul** enthält Custom React Hooks für State Management, KI-Integration und Score-Berechnung.

**Dateien:**
- `useKIAnalysis.ts` (65 Zeilen) - Genkit API Integration
- `useKeywordAnalysis.ts` (119 Zeilen) - Keyword-Management
- `usePRScoreCalculation.ts` (89 Zeilen) - Score-Berechnung

**Gesamt**: 270 Zeilen Code + 120 Zeilen Tests = **26 Tests mit >95% Coverage**

**Architektur-Prinzipien:**
- ✅ Custom Hooks für wiederverwendbare Logik
- ✅ Separation of Concerns (KI / Keyword / Score)
- ✅ useState für State Management
- ✅ useEffect für Side Effects
- ✅ useCallback für Performance

---

## Hooks

### useKIAnalysis

**Datei**: `useKIAnalysis.ts` (65 Zeilen)

Hook für **KI-basierte Keyword-Analyse** über Google Genkit.

#### API

```typescript
const { analyzeKeyword, isAnalyzing } = useKIAnalysis();
```

**Return Values:**
- `analyzeKeyword` ((keyword: string, text: string) => Promise<Partial<KeywordMetrics>>) - Analysiert ein Keyword mit KI
- `isAnalyzing` (boolean) - Ist Analyse aktiv?

#### Verwendung

```typescript
import { useKIAnalysis } from './hooks/useKIAnalysis';

function MyComponent() {
  const { analyzeKeyword, isAnalyzing } = useKIAnalysis();

  const handleAnalyze = async () => {
    const aiMetrics = await analyzeKeyword('Innovation', '<p>Innovation ist wichtig...</p>');

    console.log('KI-Metriken:', aiMetrics);
    /*
    {
      semanticRelevance: 85,      // 0-100%
      contextQuality: 80,         // 0-100%
      targetAudience: 'B2B',      // B2B, B2C, Verbraucher
      tonality: 'Sachlich',       // Sachlich, Emotional, Verkäuferisch
      relatedTerms: ['Technologie', 'Entwicklung']
    }
    */
  };

  return (
    <button onClick={handleAnalyze} disabled={isAnalyzing}>
      {isAnalyzing ? 'Analysiere...' : 'KI-Analyse starten'}
    </button>
  );
}
```

#### Genkit Integration

**API Route**: `/api/ai/analyze-keyword-seo`

**Request:**
```typescript
{
  keyword: string;
  text: string;
}
```

**Response:**
```typescript
{
  success: true;
  semanticRelevance: number;      // 0-100
  contextQuality: number;         // 0-100
  targetAudience: string;         // "B2B", "B2C", "Verbraucher"
  tonality: string;               // "Sachlich", "Emotional", "Verkäuferisch"
  relatedTerms: string[];         // Max. 3 Begriffe
}
```

**Implementierung:**
```typescript
const analyzeKeyword = useCallback(async (
  keyword: string,
  text: string
): Promise<Partial<KeywordMetrics>> => {
  try {
    setIsAnalyzing(true);

    // POST Request an Genkit API
    const data = await apiClient.post<any>('/api/ai/analyze-keyword-seo', {
      keyword,
      text
    });

    if (data && data.success) {
      return {
        semanticRelevance: Math.min(100, Math.max(0, data.semanticRelevance || 50)),
        contextQuality: Math.min(100, Math.max(0, data.contextQuality || 50)),
        targetAudience: data.targetAudience || 'Unbekannt',
        tonality: data.tonality || 'Neutral',
        relatedTerms: Array.isArray(data.relatedTerms) ? data.relatedTerms.slice(0, 3) : []
      };
    }
  } catch (error) {
    console.error('❌ SEO-Analyse Fehler:', error);
  } finally {
    setIsAnalyzing(false);
  }

  // Fallback-Werte bei Fehler
  return {
    semanticRelevance: 50,
    contextQuality: 50,
    targetAudience: 'Unbekannt',
    tonality: 'Neutral',
    relatedTerms: []
  };
}, []);
```

#### Fallback-Strategie

Bei API-Fehler werden **Default-Werte** zurückgegeben (50%, "Unbekannt", "Neutral"). Dies verhindert, dass die UI blockiert wird.

**Fehlerbehandlung:**
```typescript
try {
  const data = await apiClient.post(...);
  if (data && data.success) {
    return { /* KI-Metriken */ };
  }
} catch (error) {
  console.error('❌ SEO-Analyse Fehler:', error);
}

// Fallback
return {
  semanticRelevance: 50,
  contextQuality: 50,
  targetAudience: 'Unbekannt',
  tonality: 'Neutral',
  relatedTerms: []
};
```

#### Performance

- **Async**: Läuft im Hintergrund, blockiert UI nicht
- **Loading State**: `isAnalyzing` ermöglicht Spinner/Disabled-State
- **Clamping**: Werte werden auf 0-100 begrenzt (`Math.min(100, Math.max(0, value))`)

#### Tests

```typescript
describe('useKIAnalysis', () => {
  it('should return default values when API fails', async () => {
    mockApiClient.post.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useKIAnalysis());
    const metrics = await result.current.analyzeKeyword('Innovation', 'Text');

    expect(metrics.semanticRelevance).toBe(50);
    expect(metrics.targetAudience).toBe('Unbekannt');
  });

  it('should set isAnalyzing during API call', async () => {
    mockApiClient.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { result } = renderHook(() => useKIAnalysis());

    act(() => {
      result.current.analyzeKeyword('Innovation', 'Text');
    });

    expect(result.current.isAnalyzing).toBe(true);
  });
});
```

---

### useKeywordAnalysis

**Datei**: `useKeywordAnalysis.ts` (119 Zeilen)

Hook für **Keyword-Management und Analyse** (Basis + KI).

#### API

```typescript
const {
  keywordMetrics,      // KeywordMetrics[]
  addKeyword,          // (keyword: string) => Promise<void>
  removeKeyword,       // (keyword: string) => void
  refreshAnalysis,     // () => Promise<void>
  isAnalyzing          // boolean
} = useKeywordAnalysis(keywords, content, documentTitle, onKeywordsChange);
```

**Parameter:**
- `keywords` (string[]) - Aktuelle Keywords aus Parent-State
- `content` (string) - HTML-Text-Inhalt
- `documentTitle` (string) - Titel/Headline
- `onKeywordsChange` ((keywords: string[]) => void) - Callback bei Keyword-Änderung

**Return Values:**
- `keywordMetrics` (KeywordMetrics[]) - Vollständige Metriken (Basis + KI)
- `addKeyword` ((keyword: string) => Promise<void>) - Fügt Keyword hinzu und analysiert es
- `removeKeyword` ((keyword: string) => void) - Entfernt Keyword
- `refreshAnalysis` (() => Promise<void>) - Aktualisiert KI-Analyse für alle Keywords
- `isAnalyzing` (boolean) - Ist KI-Analyse aktiv?

#### Verwendung

```typescript
import { useKeywordAnalysis } from './hooks/useKeywordAnalysis';

function MyComponent() {
  const [keywords, setKeywords] = useState<string[]>(['Innovation']);
  const [content, setContent] = useState('<p>Innovation ist wichtig...</p>');

  const {
    keywordMetrics,
    addKeyword,
    removeKeyword,
    refreshAnalysis,
    isAnalyzing
  } = useKeywordAnalysis(keywords, content, 'Titel', setKeywords);

  // Keyword hinzufügen
  const handleAdd = async () => {
    await addKeyword('Digitalisierung');
    // State wird automatisch aktualisiert via onKeywordsChange
  };

  // Keyword entfernen
  const handleRemove = () => {
    removeKeyword('Innovation');
  };

  // KI-Analyse aktualisieren
  const handleRefresh = async () => {
    await refreshAnalysis();
  };

  return (
    <div>
      {keywordMetrics.map(metrics => (
        <div key={metrics.keyword}>
          <strong>{metrics.keyword}</strong>: {metrics.density.toFixed(1)}%
          {metrics.semanticRelevance && (
            <span> (Relevanz: {metrics.semanticRelevance}%)</span>
          )}
          <button onClick={() => removeKeyword(metrics.keyword)}>Entfernen</button>
        </div>
      ))}

      <button onClick={handleAdd}>Keyword hinzufügen</button>
      <button onClick={handleRefresh} disabled={isAnalyzing}>
        {isAnalyzing ? 'Analysiere...' : 'KI-Analyse aktualisieren'}
      </button>
    </div>
  );
}
```

#### Ablauf: `addKeyword()`

```typescript
const addKeyword = useCallback(async (keyword: string) => {
  // 1. Validierung
  if (!keyword || keywords.includes(keyword) || keywords.length >= 2) return;

  // 2. Basis-Metriken sofort berechnen (synchron)
  const basicMetrics = KeywordMetricsCalculator.calculateBasicMetrics(
    keyword,
    content,
    documentTitle
  );

  // 3. Parent-State aktualisieren
  const updatedKeywords = [...keywords, keyword];
  onKeywordsChange(updatedKeywords);

  // 4. Temporäre Metriken setzen (instant feedback)
  const tempMetrics = [...keywordMetrics, basicMetrics];
  setKeywordMetrics(tempMetrics);

  // 5. KI-Analyse im Hintergrund (async)
  const aiMetrics = await analyzeKeyword(keyword, content);
  const fullMetrics = { ...basicMetrics, ...aiMetrics };

  // 6. Finale Metriken aktualisieren
  setKeywordMetrics(prev =>
    prev.map(km => km.keyword === keyword ? fullMetrics : km)
  );
}, [keywords, content, documentTitle, onKeywordsChange, keywordMetrics, analyzeKeyword]);
```

**Vorteile:**
- ✅ **Instant Feedback**: Basis-Metriken werden sofort angezeigt
- ✅ **Progressive Enhancement**: KI-Metriken werden später hinzugefügt
- ✅ **Non-Blocking**: UI bleibt responsiv während KI-Analyse

#### Auto-Update bei Content-Änderung

```typescript
useEffect(() => {
  if (keywords.length === 0) return;

  // Basis-Metriken für alle Keywords neu berechnen
  const updatedMetrics = keywords.map(keyword => {
    const existing = keywordMetrics.find(km => km.keyword === keyword);
    return KeywordMetricsCalculator.updateMetrics(
      keyword,
      content,
      documentTitle,
      existing  // Bewahrt KI-Daten!
    );
  });

  setKeywordMetrics(updatedMetrics);
}, [content, keywords, documentTitle]);
```

**Wichtig**: KI-Daten bleiben erhalten! Nur Basis-Metriken werden neu berechnet.

#### Initiale KI-Analyse beim Laden

```typescript
useEffect(() => {
  // Nur ausführen wenn Keywords vorhanden sind und noch keine Metriken existieren
  if (keywords.length > 0 && keywordMetrics.length === 0 && content) {
    refreshAnalysis();
  }
}, [keywords.length, content]);
```

**Use-Case**: Wenn Kampagne aus Datenbank geladen wird mit vorhandenen Keywords.

#### Tests

```typescript
describe('useKeywordAnalysis', () => {
  it('should add keyword and trigger analysis', async () => {
    const mockOnChange = jest.fn();
    const { result, waitForNextUpdate } = renderHook(() =>
      useKeywordAnalysis([], content, title, mockOnChange)
    );

    act(() => {
      result.current.addKeyword('Innovation');
    });

    // Parent-State aktualisiert
    expect(mockOnChange).toHaveBeenCalledWith(['Innovation']);

    // Temporäre Metriken sofort verfügbar
    expect(result.current.keywordMetrics).toHaveLength(1);
    expect(result.current.keywordMetrics[0].keyword).toBe('Innovation');

    // Warte auf KI-Analyse
    await waitForNextUpdate();

    // Finale Metriken mit KI-Daten
    expect(result.current.keywordMetrics[0].semanticRelevance).toBeDefined();
  });

  it('should remove keyword', () => {
    const mockOnChange = jest.fn();
    const { result } = renderHook(() =>
      useKeywordAnalysis(['Innovation'], content, title, mockOnChange)
    );

    act(() => {
      result.current.removeKeyword('Innovation');
    });

    expect(mockOnChange).toHaveBeenCalledWith([]);
    expect(result.current.keywordMetrics).toHaveLength(0);
  });

  it('should update metrics on content change', () => {
    const { result, rerender } = renderHook(
      ({ content }) => useKeywordAnalysis(['Innovation'], content, title, jest.fn()),
      { initialProps: { content: '<p>Innovation</p>' } }
    );

    const initialDensity = result.current.keywordMetrics[0].density;

    // Content ändern
    rerender({ content: '<p>Innovation Innovation Innovation</p>' });

    const updatedDensity = result.current.keywordMetrics[0].density;
    expect(updatedDensity).toBeGreaterThan(initialDensity);
  });
});
```

---

### usePRScoreCalculation

**Datei**: `usePRScoreCalculation.ts` (89 Zeilen)

Hook für **PR-Score-Berechnung** (Gesamt-Score + Breakdown + Empfehlungen).

#### API

```typescript
const {
  prScore,              // number (0-100)
  scoreBreakdown,       // PRScoreBreakdown
  keywordScoreData,     // KeywordScoreData | null
  recommendations       // string[]
} = usePRScoreCalculation(content, documentTitle, keywords, keywordMetrics, onSeoScoreChange?);
```

**Parameter:**
- `content` (string) - HTML-Text-Inhalt
- `documentTitle` (string) - Titel/Headline
- `keywords` (string[]) - Aktuelle Keywords
- `keywordMetrics` (KeywordMetrics[]) - Vollständige Metriken (Basis + KI)
- `onSeoScoreChange` (optional) - Callback mit Score-Daten

**Return Values:**
- `prScore` (number) - Gesamt-Score (0-100)
- `scoreBreakdown` (PRScoreBreakdown) - Score nach 7 Kategorien
- `keywordScoreData` (KeywordScoreData | null) - Keyword-Score-Details
- `recommendations` (string[]) - Actionable Empfehlungen

#### Verwendung

```typescript
import { usePRScoreCalculation } from './hooks/usePRScoreCalculation';

function MyComponent() {
  const [content, setContent] = useState('<p>Innovation...</p>');
  const [documentTitle, setDocumentTitle] = useState('Innovation im Fokus');
  const [keywords, setKeywords] = useState(['Innovation']);
  const [keywordMetrics, setKeywordMetrics] = useState<KeywordMetrics[]>([...]);

  const {
    prScore,
    scoreBreakdown,
    keywordScoreData,
    recommendations
  } = usePRScoreCalculation(
    content,
    documentTitle,
    keywords,
    keywordMetrics,
    (scoreData) => {
      console.log('Score aktualisiert:', scoreData.totalScore);
      // Optional: Speichere in Datenbank
    }
  );

  return (
    <div>
      <div>PR-Score: {prScore}/100</div>

      <div>
        <div>Headline: {scoreBreakdown.headline}/100</div>
        <div>Keywords: {scoreBreakdown.keywords}/100</div>
        <div>Struktur: {scoreBreakdown.structure}/100</div>
      </div>

      {keywordScoreData && (
        <div>
          <div>Base Score: {keywordScoreData.baseScore}/60</div>
          <div>AI Bonus: {keywordScoreData.aiBonus}/40</div>
        </div>
      )}

      <ul>
        {recommendations.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### Implementierung

```typescript
useEffect(() => {
  // 1. PR-Metriken berechnen
  const prMetrics = PRMetricsCalculator.calculate(content, documentTitle, keywords);

  // 2. Keyword-Score-Daten berechnen
  const keywordScoreResult = seoKeywordService.calculateKeywordScore(
    keywords,
    content,
    keywordMetrics
  );
  setKeywordScoreData(keywordScoreResult);

  // 3. Gesamt-PR-Score berechnen
  const {
    totalScore,
    breakdown,
    recommendations: newRecommendations
  } = SEOScoreCalculator.calculatePRScore(
    prMetrics,
    keywordMetrics,
    content,
    documentTitle,
    keywords,
    keywordScoreResult  // Vorberechnete Keyword-Score-Daten
  );

  setPrScore(totalScore);
  setScoreBreakdown(breakdown);
  setRecommendations(newRecommendations);

  // 4. Optional: Callback an Parent
  if (onSeoScoreChange) {
    onSeoScoreChange({
      totalScore,
      breakdown,
      hints: newRecommendations,
      keywordMetrics
    });
  }
}, [content, documentTitle, keywordMetrics, keywords]);
```

**Performance**: Score wird nur bei Content-/Keyword-Änderung neu berechnet (nicht bei jedem Render).

#### Callback-Integration

```typescript
// In CampaignForm.tsx:
const [prScore, setPrScore] = useState(0);

const { /* ... */ } = usePRScoreCalculation(
  content,
  documentTitle,
  keywords,
  keywordMetrics,
  (scoreData) => {
    setPrScore(scoreData.totalScore);

    // Auto-Save in Datenbank
    debouncedSave({
      prScore: scoreData.totalScore,
      seoScoreBreakdown: scoreData.breakdown,
      lastSeoAnalysis: Timestamp.now()
    });
  }
);
```

#### Tests

```typescript
describe('usePRScoreCalculation', () => {
  it('should calculate PR score', () => {
    const { result } = renderHook(() =>
      usePRScoreCalculation(content, title, ['Innovation'], keywordMetrics)
    );

    expect(result.current.prScore).toBeGreaterThan(0);
    expect(result.current.scoreBreakdown.headline).toBeDefined();
  });

  it('should return 0 score when no keywords', () => {
    const { result } = renderHook(() =>
      usePRScoreCalculation(content, title, [], [])
    );

    expect(result.current.prScore).toBe(0);
    expect(result.current.recommendations).toContain('Keywords hinzufügen');
  });

  it('should call onSeoScoreChange callback', () => {
    const mockCallback = jest.fn();
    renderHook(() =>
      usePRScoreCalculation(content, title, ['Innovation'], keywordMetrics, mockCallback)
    );

    expect(mockCallback).toHaveBeenCalledWith({
      totalScore: expect.any(Number),
      breakdown: expect.any(Object),
      hints: expect.any(Array),
      keywordMetrics: expect.any(Array)
    });
  });
});
```

---

## Integration

### Verwendung in PRSEOHeaderBar

```typescript
// src/components/campaigns/pr-seo/PRSEOHeaderBar.tsx
import { useKeywordAnalysis } from './hooks/useKeywordAnalysis';
import { usePRScoreCalculation } from './hooks/usePRScoreCalculation';

export function PRSEOHeaderBar({ content, keywords, onKeywordsChange, documentTitle, onSeoScoreChange }: PRSEOHeaderBarProps) {
  // Keyword-Management + KI-Analyse
  const {
    keywordMetrics,
    addKeyword,
    removeKeyword,
    refreshAnalysis,
    isAnalyzing
  } = useKeywordAnalysis(keywords, content, documentTitle, onKeywordsChange);

  // PR-Score-Berechnung
  const {
    prScore,
    scoreBreakdown,
    keywordScoreData,
    recommendations
  } = usePRScoreCalculation(content, documentTitle, keywords, keywordMetrics, onSeoScoreChange);

  return (
    <div>
      {/* UI Components */}
    </div>
  );
}
```

### Datenfluss

```
User Input (KeywordInput)
   │
   ▼
addKeyword() [useKeywordAnalysis]
   │
   ├─→ KeywordMetricsCalculator.calculateBasicMetrics() (sofort)
   │
   └─→ useKIAnalysis.analyzeKeyword() (async)
   │
   ▼
keywordMetrics (State)
   │
   ▼
usePRScoreCalculation (useEffect)
   │
   ├─→ PRMetricsCalculator.calculate()
   ├─→ seoKeywordService.calculateKeywordScore()
   └─→ SEOScoreCalculator.calculatePRScore()
   │
   ▼
prScore + scoreBreakdown + recommendations (State)
   │
   ▼
UI Update (ScoreBreakdownGrid, RecommendationsList)
```

---

## Best Practices

### 1. useCallback für Callback-Props

```typescript
// ✅ GOOD: useCallback verhindert Re-Renders
const addKeyword = useCallback(async (keyword: string) => {
  // ...
}, [keywords, content, documentTitle]);

// ❌ BAD: Neue Funktion bei jedem Render
const addKeyword = async (keyword: string) => {
  // ...
};
```

### 2. Dependencies korrekt definieren

```typescript
// ✅ GOOD: Nur relevante Dependencies
useEffect(() => {
  // Score neu berechnen
}, [content, documentTitle, keywordMetrics, keywords]);

// ❌ BAD: Zu viele Dependencies (Endlosschleife)
useEffect(() => {
  // Score neu berechnen
}, [content, documentTitle, keywordMetrics, keywords, prScore, scoreBreakdown]);
```

### 3. Loading States

```typescript
// ✅ GOOD: Loading State während async Operation
const [isAnalyzing, setIsAnalyzing] = useState(false);

const analyzeKeyword = async (...) => {
  setIsAnalyzing(true);
  try {
    // API Call
  } finally {
    setIsAnalyzing(false);
  }
};

// In UI:
<button disabled={isAnalyzing}>
  {isAnalyzing ? 'Analysiere...' : 'Analysieren'}
</button>
```

### 4. Error Handling

```typescript
// ✅ GOOD: Fallback-Werte bei Fehler
try {
  const data = await apiClient.post(...);
  return data;
} catch (error) {
  console.error('API Error:', error);
  return { /* Fallback-Werte */ };
}
```

### 5. Memoization

```typescript
// ✅ GOOD: Computed Values mit useMemo
const scoreBadgeColor = useMemo(() => {
  if (prScore >= 76) return 'green';
  if (prScore >= 51) return 'yellow';
  return 'red';
}, [prScore]);

// ❌ BAD: Berechnung bei jedem Render
const scoreBadgeColor = prScore >= 76 ? 'green' : prScore >= 51 ? 'yellow' : 'red';
```

---

## Testing

### renderHook für Custom Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';

describe('useKeywordAnalysis', () => {
  it('should add keyword', async () => {
    const { result } = renderHook(() =>
      useKeywordAnalysis([], content, title, onChange)
    );

    await act(async () => {
      await result.current.addKeyword('Innovation');
    });

    expect(result.current.keywordMetrics).toHaveLength(1);
  });
});
```

### Mock API Calls

```typescript
jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    post: jest.fn()
  }
}));

beforeEach(() => {
  (apiClient.post as jest.Mock).mockResolvedValue({
    success: true,
    semanticRelevance: 85,
    // ...
  });
});
```

### Async Tests

```typescript
it('should wait for KI analysis', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useKIAnalysis());

  act(() => {
    result.current.analyzeKeyword('Innovation', 'Text');
  });

  await waitForNextUpdate();

  expect(result.current.isAnalyzing).toBe(false);
});
```

---

## Siehe auch

- **[../README.md](../README.md)** - Haupt-Dokumentation
- **[../utils/README.md](../utils/README.md)** - Utils-Dokumentation
- **[../components/README.md](../components/README.md)** - Components-Dokumentation

---

**Letzte Aktualisierung**: 2025-11-03
**Version**: 2.0
**Autor**: CeleroPress Team

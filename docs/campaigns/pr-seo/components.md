# PR-SEO Components - UI Components

> **Modul**: PR-SEO Components
> **Version**: 2.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-03

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Components](#components)
  - [KeywordInput](#keywordinput)
  - [KeywordMetricsCard](#keywordmetricscard)
  - [KIAnalysisBox](#kianalysisbox)
  - [ScoreBreakdownGrid](#scorebreakdowngrid)
  - [RecommendationsList](#recommendationslist)
- [Performance](#performance)
- [Testing](#testing)
- [Styling](#styling)

---

## Übersicht

Das **Components-Modul** enthält alle UI-Komponenten des PR-SEO Tools.

**Dateien:**
- `KeywordInput.tsx` (52 Zeilen) - Eingabefeld für Keywords
- `KeywordMetricsCard.tsx` (62 Zeilen) - One-Line-Card mit Metriken
- `KIAnalysisBox.tsx` (46 Zeilen) - KI-Status-Box
- `ScoreBreakdownGrid.tsx` (70 Zeilen) - 4-Box-Grid für Score-Breakdown
- `RecommendationsList.tsx` (69 Zeilen) - Empfehlungen mit Expand/Collapse

**Gesamt**: 278 Zeilen Code + 250 Zeilen Tests = **55 Tests mit 100% Coverage**

**Design-Prinzipien:**
- ✅ React.memo für Performance
- ✅ Tailwind CSS für Styling
- ✅ Heroicons /24/outline
- ✅ Accessibility (ARIA-Labels)
- ✅ Responsive Design

---

## Components

### KeywordInput

**Datei**: `KeywordInput.tsx` (52 Zeilen)

Eingabefeld für neue Keywords mit Validierung und Enter-Key-Support.

#### Props

```typescript
interface KeywordInputProps {
  keywords: string[];
  onAddKeyword: (keyword: string) => void;
  maxKeywords?: number;  // Default: 2
}
```

#### Verwendung

```typescript
import { KeywordInput } from './components/KeywordInput';

function MyComponent() {
  const [keywords, setKeywords] = useState<string[]>([]);

  const handleAddKeyword = (keyword: string) => {
    setKeywords([...keywords, keyword]);
  };

  return (
    <KeywordInput
      keywords={keywords}
      onAddKeyword={handleAddKeyword}
      maxKeywords={2}
    />
  );
}
```

#### Features

**1. Duplikat-Prüfung:**
```typescript
if (newKeyword.trim() && !keywords.includes(newKeyword.trim()) && keywords.length < maxKeywords) {
  onAddKeyword(newKeyword.trim());
  setNewKeyword('');
}
```

**2. Enter-Key-Support:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAdd();
  }
};
```

**3. Max-Keywords-Validierung:**
```typescript
<Input
  placeholder={keywords.length >= maxKeywords ? `Maximum ${maxKeywords} Keywords erreicht` : "Keyword hinzufügen..."}
  disabled={keywords.length >= maxKeywords}
/>
```

#### UI

```
┌──────────────────────────────────────┬────────────┐
│ Keyword hinzufügen...                │ Hinzufügen │
└──────────────────────────────────────┴────────────┘
```

#### Tests

```typescript
describe('KeywordInput', () => {
  it('should add keyword on button click', () => {
    const mockOnAdd = jest.fn();
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAdd} />);

    const input = screen.getByPlaceholderText(/keyword hinzufügen/i);
    fireEvent.change(input, { target: { value: 'Innovation' } });
    fireEvent.click(screen.getByText('Hinzufügen'));

    expect(mockOnAdd).toHaveBeenCalledWith('Innovation');
  });

  it('should add keyword on Enter key', () => {
    const mockOnAdd = jest.fn();
    render(<KeywordInput keywords={[]} onAddKeyword={mockOnAdd} />);

    const input = screen.getByPlaceholderText(/keyword hinzufügen/i);
    fireEvent.change(input, { target: { value: 'Innovation' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnAdd).toHaveBeenCalledWith('Innovation');
  });

  it('should disable input when max keywords reached', () => {
    render(<KeywordInput keywords={['Keyword1', 'Keyword2']} onAddKeyword={jest.fn()} maxKeywords={2} />);

    const input = screen.getByPlaceholderText(/maximum 2 keywords erreicht/i);
    expect(input).toBeDisabled();
  });

  it('should not add duplicate keyword', () => {
    const mockOnAdd = jest.fn();
    render(<KeywordInput keywords={['Innovation']} onAddKeyword={mockOnAdd} />);

    const input = screen.getByPlaceholderText(/keyword hinzufügen/i);
    fireEvent.change(input, { target: { value: 'Innovation' } });
    fireEvent.click(screen.getByText('Hinzufügen'));

    expect(mockOnAdd).not.toHaveBeenCalled();
  });
});
```

---

### KeywordMetricsCard

**Datei**: `KeywordMetricsCard.tsx` (62 Zeilen)

One-Line-Card mit Keyword-Metriken und KI-Status.

#### Props

```typescript
interface KeywordMetricsCardProps {
  metrics: KeywordMetrics;
  isAnalyzing: boolean;
  onRemove: () => void;
}
```

#### Verwendung

```typescript
import { KeywordMetricsCard } from './components/KeywordMetricsCard';

function MyComponent() {
  const metrics: KeywordMetrics = {
    keyword: 'Innovation',
    density: 1.5,
    occurrences: 3,
    inHeadline: true,
    inFirstParagraph: true,
    distribution: 'gut',
    semanticRelevance: 85,
    contextQuality: 80
  };

  return (
    <KeywordMetricsCard
      metrics={metrics}
      isAnalyzing={false}
      onRemove={() => console.log('Removed')}
    />
  );
}
```

#### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Innovation │ Dichte: 1.5% │ Vorkommen: 3x │ Verteilung: gut │ [KI-Box] │ X │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Farben

**Verteilung:**
- **Gut**: Grün (bg-green-50, text-green-700, border-green-300)
- **Mittel**: Orange (bg-orange-50, text-orange-700, border-orange-300)
- **Schlecht**: Rot (bg-red-50, text-red-700, border-red-300)

```typescript
const distributionClasses = clsx(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
  metrics.distribution === 'gut' ? 'bg-green-50 text-green-700 border border-green-300' :
  metrics.distribution === 'mittel' ? 'bg-orange-50 text-orange-700 border border-orange-300' :
  'bg-red-50 text-red-700 border border-red-300'
);
```

#### Features

**1. KI-Analysis-Box Integration:**
```typescript
<KIAnalysisBox metrics={metrics} isLoading={isAnalyzing} />
```

**2. Remove-Button:**
```typescript
<button
  onClick={onRemove}
  className="bg-white text-gray-400 hover:text-red-500 p-1 rounded"
  aria-label="Keyword entfernen"
>
  <XMarkIcon className="h-4 w-4 text-gray-600" />
</button>
```

#### Tests

```typescript
describe('KeywordMetricsCard', () => {
  const mockMetrics: KeywordMetrics = {
    keyword: 'Innovation',
    density: 1.5,
    occurrences: 3,
    inHeadline: true,
    inFirstParagraph: true,
    distribution: 'gut',
    semanticRelevance: 85,
    contextQuality: 80
  };

  it('should render keyword metrics', () => {
    render(<KeywordMetricsCard metrics={mockMetrics} isAnalyzing={false} onRemove={jest.fn()} />);

    expect(screen.getByText('Innovation')).toBeInTheDocument();
    expect(screen.getByText('Dichte: 1.5%')).toBeInTheDocument();
    expect(screen.getByText('Vorkommen: 3x')).toBeInTheDocument();
    expect(screen.getByText('Verteilung: gut')).toBeInTheDocument();
  });

  it('should show green color for good distribution', () => {
    const { container } = render(<KeywordMetricsCard metrics={mockMetrics} isAnalyzing={false} onRemove={jest.fn()} />);

    const distributionBadge = screen.getByText('Verteilung: gut').closest('div');
    expect(distributionBadge).toHaveClass('bg-green-50');
  });

  it('should call onRemove when delete button clicked', () => {
    const mockOnRemove = jest.fn();
    render(<KeywordMetricsCard metrics={mockMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    const deleteButton = screen.getByRole('button', { name: /keyword entfernen/i });
    fireEvent.click(deleteButton);

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });
});
```

---

### KIAnalysisBox

**Datei**: `KIAnalysisBox.tsx` (46 Zeilen)

Inline-Status-Box für KI-Analyse mit 3 States.

#### Props

```typescript
interface KIAnalysisBoxProps {
  metrics: KeywordMetrics;
  isLoading: boolean;
}
```

#### Verwendung

```typescript
import { KIAnalysisBox } from './components/KIAnalysisBox';

function MyComponent() {
  const metrics: KeywordMetrics = {
    // ...
    semanticRelevance: 85,
    targetAudience: 'B2B',
    tonality: 'Sachlich'
  };

  return <KIAnalysisBox metrics={metrics} isLoading={false} />;
}
```

#### States

**1. Loading:**
```typescript
if (isLoading) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs bg-purple-50 text-purple-700 border border-purple-300">
      <div className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      <span>KI analysiert...</span>
    </div>
  );
}
```

**UI:**
```
┌─────────────────────┐
│ ⟳ KI analysiert...  │
└─────────────────────┘
```

**2. No Data:**
```typescript
if (!hasAIData) {
  return (
    <div className="...">
      <SparklesIcon className="h-3 w-3" />
      <span>Bereit für Analyse</span>
    </div>
  );
}
```

**UI:**
```
┌───────────────────────────┐
│ ✨ Bereit für Analyse     │
└───────────────────────────┘
```

**3. With Data:**
```typescript
return (
  <div className="...">
    <SparklesIcon className="h-3 w-3" />
    <span className="font-semibold">Relevanz:</span>
    <span>{metrics.semanticRelevance || 0}%</span>
  </div>
);
```

**UI:**
```
┌─────────────────────┐
│ ✨ Relevanz: 85%    │
└─────────────────────┘
```

#### Tests

```typescript
describe('KIAnalysisBox', () => {
  it('should show loading state', () => {
    render(<KIAnalysisBox metrics={mockMetrics} isLoading={true} />);

    expect(screen.getByText('KI analysiert...')).toBeInTheDocument();
  });

  it('should show ready state when no AI data', () => {
    const metricsWithoutAI = { ...mockMetrics, semanticRelevance: undefined };
    render(<KIAnalysisBox metrics={metricsWithoutAI} isLoading={false} />);

    expect(screen.getByText('Bereit für Analyse')).toBeInTheDocument();
  });

  it('should show relevance score when AI data available', () => {
    const metricsWithAI = { ...mockMetrics, semanticRelevance: 85 };
    render(<KIAnalysisBox metrics={metricsWithAI} isLoading={false} />);

    expect(screen.getByText('Relevanz: 85%')).toBeInTheDocument();
  });
});
```

---

### ScoreBreakdownGrid

**Datei**: `ScoreBreakdownGrid.tsx` (70 Zeilen)

4-Box-Grid für Score-Aufschlüsselung.

#### Props

```typescript
interface ScoreBreakdownGridProps {
  breakdown: PRScoreBreakdown;
}
```

#### Verwendung

```typescript
import { ScoreBreakdownGrid } from './components/ScoreBreakdownGrid';

function MyComponent() {
  const breakdown: PRScoreBreakdown = {
    headline: 85,
    keywords: 80,
    structure: 75,
    relevance: 70,
    concreteness: 65,
    engagement: 80,
    social: 60
  };

  return <ScoreBreakdownGrid breakdown={breakdown} />;
}
```

#### Layout

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 🟢          │ 🟢          │ 🟢          │ 🟠          │
│ Headline:   │ Keywords:   │ Struktur:   │ Social:     │
│ 85/100      │ 80/100      │ 75/100      │ 60/100      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### Farben (Score-basiert)

```typescript
const getScoreColor = (score: number): string => {
  if (score >= 70) return 'bg-green-500';    // Grün
  if (score >= 40) return 'bg-orange-500';   // Orange
  return 'bg-red-500';                       // Rot
};
```

**Farbschema:**
- **≥70**: Grün (Exzellent)
- **40-69**: Orange (Gut, verbesserbar)
- **<40**: Rot (Verbesserungsbedarf)

#### Performance

**useMemo für Score-Colors:**
```typescript
const scoreColors = useMemo(() => ({
  headline: getScoreColor(breakdown.headline),
  keywords: getScoreColor(breakdown.keywords),
  structure: getScoreColor(breakdown.structure),
  social: getScoreColor(breakdown.social)
}), [breakdown.headline, breakdown.keywords, breakdown.structure, breakdown.social]);
```

**Vorteil**: Colors werden nur bei Breakdown-Änderung neu berechnet, nicht bei jedem Render.

#### Tests

```typescript
describe('ScoreBreakdownGrid', () => {
  const mockBreakdown: PRScoreBreakdown = {
    headline: 85,
    keywords: 80,
    structure: 75,
    relevance: 70,
    concreteness: 65,
    engagement: 80,
    social: 60
  };

  it('should render all scores', () => {
    render(<ScoreBreakdownGrid breakdown={mockBreakdown} />);

    expect(screen.getByText(/Headline: 85/)).toBeInTheDocument();
    expect(screen.getByText(/Keywords: 80/)).toBeInTheDocument();
    expect(screen.getByText(/Struktur: 75/)).toBeInTheDocument();
    expect(screen.getByText(/Social: 60/)).toBeInTheDocument();
  });

  it('should show green color for high scores', () => {
    const { container } = render(<ScoreBreakdownGrid breakdown={mockBreakdown} />);

    const greenDots = container.querySelectorAll('.bg-green-500');
    expect(greenDots.length).toBeGreaterThan(0);
  });

  it('should show orange color for medium scores', () => {
    const mediumBreakdown = { ...mockBreakdown, social: 50 };
    const { container } = render(<ScoreBreakdownGrid breakdown={mediumBreakdown} />);

    const orangeDots = container.querySelectorAll('.bg-orange-500');
    expect(orangeDots.length).toBeGreaterThan(0);
  });
});
```

---

### RecommendationsList

**Datei**: `RecommendationsList.tsx` (69 Zeilen)

Liste mit SEO-Empfehlungen und Expand/Collapse.

#### Props

```typescript
interface RecommendationsListProps {
  recommendations: string[];
}
```

#### Verwendung

```typescript
import { RecommendationsList } from './components/RecommendationsList';

function MyComponent() {
  const recommendations = [
    'Headline zu kurz: 15 Zeichen (optimal: 30-80)',
    '"Innovation" öfter verwenden (nur 1x - optimal: 2-5x)',
    '[KI] "Innovation" thematische Relevanz stärken (55%)',
    'Zitat oder Aussage hinzufügen',
    '2-3 relevante Hashtags hinzufügen für Social-Media-Optimierung'
  ];

  return <RecommendationsList recommendations={recommendations} />;
}
```

#### UI

**Initial (3 Empfehlungen):**
```
┌─────────────────────────────────────────────────────────┐
│ Empfehlungen: (5)                                       │
│ • Headline zu kurz: 15 Zeichen (optimal: 30-80)         │
│ • "Innovation" öfter verwenden (nur 1x - optimal: 2-5x) │
│ • "Innovation" thematische Relevanz stärken (55%) [KI]  │
│                                                          │
│ [ 2 weitere anzeigen ▼ ]                                │
└─────────────────────────────────────────────────────────┘
```

**Expanded (alle Empfehlungen):**
```
┌─────────────────────────────────────────────────────────┐
│ Empfehlungen: (5)                                       │
│ • Headline zu kurz: 15 Zeichen (optimal: 30-80)         │
│ • "Innovation" öfter verwenden (nur 1x - optimal: 2-5x) │
│ • "Innovation" thematische Relevanz stärken (55%) [KI]  │
│ • Zitat oder Aussage hinzufügen                         │
│ • 2-3 relevante Hashtags hinzufügen                     │
│                                                          │
│ [ weniger anzeigen ▲ ]                                  │
└─────────────────────────────────────────────────────────┘
```

#### Features

**1. KI-Badge für KI-Empfehlungen:**
```typescript
{displayedRecommendations.map((rec, index) => (
  <li key={index} className="flex items-start justify-between gap-2">
    <span>• {rec.replace('[KI] ', '')}</span>
    {rec.startsWith('[KI]') && (
      <Badge color="purple" className="text-[9px] px-1 py-0">
        KI
      </Badge>
    )}
  </li>
))}
```

**2. Expand/Collapse:**
```typescript
const [showAll, setShowAll] = useState(false);
const displayedRecommendations = showAll ? recommendations : recommendations.slice(0, 3);

{recommendations.length > 3 && (
  <button onClick={() => setShowAll(!showAll)}>
    {showAll ? 'weniger anzeigen ▲' : `${recommendations.length - 3} weitere anzeigen ▼`}
  </button>
)}
```

**3. Empty State:**
```typescript
if (recommendations.length === 0) {
  return null;
}
```

#### Tests

```typescript
describe('RecommendationsList', () => {
  const mockRecommendations = [
    'Empfehlung 1',
    'Empfehlung 2',
    '[KI] Empfehlung 3',
    'Empfehlung 4',
    'Empfehlung 5'
  ];

  it('should render first 3 recommendations initially', () => {
    render(<RecommendationsList recommendations={mockRecommendations} />);

    expect(screen.getByText(/Empfehlung 1/)).toBeInTheDocument();
    expect(screen.getByText(/Empfehlung 2/)).toBeInTheDocument();
    expect(screen.getByText(/Empfehlung 3/)).toBeInTheDocument();
    expect(screen.queryByText(/Empfehlung 4/)).not.toBeInTheDocument();
  });

  it('should show expand button when more than 3 recommendations', () => {
    render(<RecommendationsList recommendations={mockRecommendations} />);

    expect(screen.getByText(/2 weitere anzeigen/)).toBeInTheDocument();
  });

  it('should expand on button click', () => {
    render(<RecommendationsList recommendations={mockRecommendations} />);

    const expandButton = screen.getByText(/2 weitere anzeigen/);
    fireEvent.click(expandButton);

    expect(screen.getByText(/Empfehlung 4/)).toBeInTheDocument();
    expect(screen.getByText(/Empfehlung 5/)).toBeInTheDocument();
    expect(screen.getByText(/weniger anzeigen/)).toBeInTheDocument();
  });

  it('should show KI badge for KI recommendations', () => {
    render(<RecommendationsList recommendations={mockRecommendations} />);

    const kiBadges = screen.getAllByText('KI');
    expect(kiBadges.length).toBeGreaterThan(0);
  });

  it('should return null when no recommendations', () => {
    const { container } = render(<RecommendationsList recommendations={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
```

---

## Performance

### React.memo

Alle Components verwenden `React.memo` für Performance:

```typescript
export const KeywordMetricsCard = React.memo(function KeywordMetricsCard({ ... }) {
  // Component Logic
});
```

**Vorteil**: Component wird nur re-rendered, wenn Props sich ändern.

**Messung:**
```typescript
// Ohne React.memo: ~60 Re-Renders bei Content-Änderung
// Mit React.memo: ~5 Re-Renders (nur betroffene Components)
```

### useMemo für Computed Values

```typescript
// ScoreBreakdownGrid.tsx
const scoreColors = useMemo(() => ({
  headline: getScoreColor(breakdown.headline),
  keywords: getScoreColor(breakdown.keywords),
  structure: getScoreColor(breakdown.structure),
  social: getScoreColor(breakdown.social)
}), [breakdown.headline, breakdown.keywords, breakdown.structure, breakdown.social]);
```

**Vorteil**: Colors werden nur bei Breakdown-Änderung neu berechnet.

### clsx für Conditional Classnames

```typescript
import clsx from 'clsx';

const classes = clsx(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
  metrics.distribution === 'gut' ? 'bg-green-50 text-green-700' :
  metrics.distribution === 'mittel' ? 'bg-orange-50 text-orange-700' :
  'bg-red-50 text-red-700'
);
```

**Vorteil**: Keine String-Concatenation, optimierte Performance.

---

## Testing

### Component Testing mit React Testing Library

**Rendering:**
```typescript
import { render, screen } from '@testing-library/react';

it('should render component', () => {
  render(<KeywordInput keywords={[]} onAddKeyword={jest.fn()} />);

  expect(screen.getByPlaceholderText(/keyword hinzufügen/i)).toBeInTheDocument();
});
```

**User Interactions:**
```typescript
import { fireEvent } from '@testing-library/react';

it('should handle button click', () => {
  const mockOnClick = jest.fn();
  render(<button onClick={mockOnClick}>Click</button>);

  fireEvent.click(screen.getByText('Click'));

  expect(mockOnClick).toHaveBeenCalledTimes(1);
});
```

**Snapshot Tests:**
```typescript
it('should match snapshot', () => {
  const { container } = render(<KeywordMetricsCard metrics={mockMetrics} />);

  expect(container.firstChild).toMatchSnapshot();
});
```

### Accessibility Testing

```typescript
it('should have accessible remove button', () => {
  render(<KeywordMetricsCard metrics={mockMetrics} onRemove={jest.fn()} />);

  const button = screen.getByRole('button', { name: /keyword entfernen/i });
  expect(button).toBeInTheDocument();
});
```

---

## Styling

### Tailwind CSS Patterns

**Card-Style:**
```typescript
className="bg-white rounded-md p-3 border border-gray-200"
```

**Badge-Style:**
```typescript
className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-300"
```

**Button-Style:**
```typescript
className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
```

### Color Palette

**Primary Colors:**
- **Gray**: bg-gray-50, text-gray-700, border-gray-300
- **Green**: bg-green-50, text-green-700, border-green-300 (Erfolg)
- **Orange**: bg-orange-50, text-orange-700, border-orange-300 (Warnung)
- **Red**: bg-red-50, text-red-700, border-red-300 (Fehler)
- **Purple**: bg-purple-50, text-purple-700, border-purple-300 (KI)

### Heroicons

**Verwendete Icons:**
- `XMarkIcon` - Remove-Button
- `SparklesIcon` - KI-Analyse
- `ChevronDownIcon` - Expand
- `ChevronUpIcon` - Collapse

**Immer /24/outline verwenden:**
```typescript
import { XMarkIcon } from '@heroicons/react/24/outline';
```

---

## Siehe auch

- **[../README.md](../README.md)** - Haupt-Dokumentation
- **[../utils/README.md](../utils/README.md)** - Utils-Dokumentation
- **[../hooks/README.md](../hooks/README.md)** - Hooks-Dokumentation

---

**Letzte Aktualisierung**: 2025-11-03
**Version**: 2.0
**Autor**: CeleroPress Team

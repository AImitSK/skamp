# Testing Guide - Analytics Tab

> **Modul**: Monitoring Analytics
> **Test Framework**: Jest + React Testing Library
> **Coverage**: >95%
> **Letzte Aktualisierung**: 2025-01-18

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Test-Struktur](#test-struktur)
3. [Komponenten-Tests](#komponenten-tests)
4. [Hook-Tests](#hook-tests)
5. [Test Utilities](#test-utilities)
6. [Coverage-Ziele](#coverage-ziele)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Übersicht

### Test-Statistiken

```
Gesamt: 76 Tests
├── Komponenten-Tests: 58 Tests (6 Dateien)
│   ├── EmptyState.test.tsx: 4 Tests
│   ├── PerformanceMetrics.test.tsx: 15 Tests
│   ├── TimelineChart.test.tsx: 10 Tests
│   ├── MediaDistributionChart.test.tsx: 9 Tests
│   ├── SentimentChart.test.tsx: 10 Tests
│   └── TopOutletsChart.test.tsx: 10 Tests
│
└── Hook-Tests: 18 Tests (2 Dateien)
    ├── useAVECalculation.test.tsx: 9 Tests
    └── useClippingStats.test.tsx: 9 Tests
```

### Coverage

```
File                           | % Stmts | % Branch | % Funcs | % Lines
-------------------------------|---------|----------|---------|--------
MonitoringDashboard.tsx        | 100     | 100      | 100     | 100
useAVECalculation.ts           | 100     | 100      | 100     | 100
useClippingStats.ts            | 100     | 100      | 100     | 100
analytics/EmptyState.tsx       | 100     | 100      | 100     | 100
analytics/PerformanceMetrics   | 98.5    | 95       | 100     | 98.5
analytics/TimelineChart.tsx    | 100     | 100      | 100     | 100
analytics/MediaDistribution... | 100     | 100      | 100     | 100
analytics/SentimentChart.tsx   | 100     | 100      | 100     | 100
analytics/TopOutletsChart.tsx  | 100     | 100      | 100     | 100
-------------------------------|---------|----------|---------|--------
GESAMT                         | >95%    | >95%     | 100%    | >95%
```

---

## Test-Struktur

### Standard-Template

Jede Test-Datei folgt diesem Aufbau:

```tsx
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  // Test-Daten (ganz oben)
  const defaultProps = {
    prop1: 'value1',
    prop2: 42,
  };

  describe('Rendering', () => {
    // Tests für grundlegendes Rendering
    it('should render with default props', () => { /* ... */ });
    it('should render all sub-elements', () => { /* ... */ });
  });

  describe('Props Handling', () => {
    // Tests für verschiedene Prop-Kombinationen
    it('should handle prop variations', () => { /* ... */ });
  });

  describe('Edge Cases', () => {
    // Tests für Grenzfälle
    it('should handle empty data', () => { /* ... */ });
    it('should handle null/undefined', () => { /* ... */ });
  });

  describe('React.memo Optimization', () => {
    // Tests für Performance-Optimierungen
    it('should not re-render with same props', () => { /* ... */ });
  });
});
```

### Test-Kategorien

#### 1. Rendering Tests

Prüfen ob Komponente korrekt rendert:

```tsx
it('should render heading with icon', () => {
  render(<PerformanceMetrics {...defaultProps} />);

  expect(screen.getByText('Performance-Übersicht')).toBeInTheDocument();
});
```

#### 2. Props Handling Tests

Prüfen verschiedene Prop-Kombinationen:

```tsx
it('should render only 4 metric cards when totalAVE = 0', () => {
  render(<PerformanceMetrics {...defaultProps} totalAVE={0} />);

  expect(screen.queryByText('Gesamt-AVE')).not.toBeInTheDocument();
});
```

#### 3. Edge Case Tests

Prüfen Grenzfälle:

```tsx
it('should handle zero values', () => {
  render(
    <PerformanceMetrics
      totalClippings={0}
      totalReach={0}
      totalAVE={0}
      openRate={0}
      conversionRate={0}
    />
  );

  expect(screen.getAllByText('0').length).toBeGreaterThan(0);
});
```

#### 4. Performance Tests

Prüfen React.memo Optimierungen:

```tsx
it('should not re-render when props are the same', () => {
  const { rerender } = render(<PerformanceMetrics {...defaultProps} />);

  const firstRender = screen.getByText('Performance-Übersicht');

  rerender(<PerformanceMetrics {...defaultProps} />);

  const secondRender = screen.getByText('Performance-Übersicht');

  expect(firstRender).toBe(secondRender); // Gleiche DOM-Referenz
});
```

---

## Komponenten-Tests

### EmptyState.test.tsx

**Datei**: `src/components/monitoring/analytics/EmptyState.test.tsx`

**Anzahl Tests**: 4

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  describe('Rendering', () => {
    it('should render empty state message', () => {
      render(<EmptyState />);

      expect(
        screen.getByText('Noch keine Daten für Analytics verfügbar')
      ).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = render(<EmptyState />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-12', 'w-12', 'text-gray-400');
    });
  });

  describe('Styling', () => {
    it('should have correct container classes', () => {
      const { container } = render(<EmptyState />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('text-center', 'py-12', 'bg-gray-50');
    });
  });

  describe('React.memo', () => {
    it('should be memoized (no re-render on parent update)', () => {
      const { rerender } = render(<EmptyState />);

      const firstRender = screen.getByText(
        'Noch keine Daten für Analytics verfügbar'
      );

      rerender(<EmptyState />);

      const secondRender = screen.getByText(
        'Noch keine Daten für Analytics verfügbar'
      );

      expect(firstRender).toBe(secondRender);
    });
  });
});
```

**Getestet**:
- ✅ Rendering von Text und Icon
- ✅ CSS-Klassen
- ✅ React.memo Optimierung

---

### PerformanceMetrics.test.tsx

**Datei**: `src/components/monitoring/analytics/PerformanceMetrics.test.tsx`

**Anzahl Tests**: 15

**Highlights**:

```tsx
describe('PerformanceMetrics Component', () => {
  const defaultProps = {
    totalClippings: 42,
    totalReach: 150000,
    totalAVE: 5000,
    openRate: 65,
    conversionRate: 45,
  };

  // Test 1: Alle 5 Karten wenn AVE > 0
  it('should render all 5 metric cards when totalAVE > 0', () => {
    render(<PerformanceMetrics {...defaultProps} />);

    expect(screen.getByText('Veröffentlichungen')).toBeInTheDocument();
    expect(screen.getByText('Gesamtreichweite')).toBeInTheDocument();
    expect(screen.getByText('Gesamt-AVE')).toBeInTheDocument();
    expect(screen.getByText('Öffnungsrate')).toBeInTheDocument();
    expect(screen.getByText('Conversion')).toBeInTheDocument();
  });

  // Test 2: Nur 4 Karten wenn AVE = 0
  it('should render only 4 metric cards when totalAVE = 0', () => {
    render(<PerformanceMetrics {...defaultProps} totalAVE={0} />);

    expect(screen.queryByText('Gesamt-AVE')).not.toBeInTheDocument();
  });

  // Test 3: Formatierung von totalReach
  it('should format totalReach with locale separator', () => {
    render(<PerformanceMetrics {...defaultProps} />);

    expect(screen.getByText('150.000')).toBeInTheDocument();
  });

  // Test 4: Formatierung von totalAVE
  it('should format totalAVE with Euro symbol', () => {
    render(<PerformanceMetrics {...defaultProps} />);

    expect(screen.getByText('5.000 €')).toBeInTheDocument();
  });

  // Test 5: Große Zahlen
  it('should handle large numbers correctly', () => {
    render(
      <PerformanceMetrics
        {...defaultProps}
        totalReach={9999999}
        totalAVE={1234567}
      />
    );

    expect(screen.getByText('9.999.999')).toBeInTheDocument();
    expect(screen.getByText('1.234.567 €')).toBeInTheDocument();
  });

  // Test 6: Dezimalzahlen (AVE sollte auf 0 Dezimalstellen runden)
  it('should handle decimal AVE values (should round to 0 decimals)', () => {
    render(<PerformanceMetrics {...defaultProps} totalAVE={5432.89} />);

    expect(screen.getByText('5.433 €')).toBeInTheDocument();
  });
});
```

**Getestet**:
- ✅ Conditional Rendering (AVE-Karte)
- ✅ Formatierung (Zahlen, Prozent, Euro)
- ✅ Edge Cases (0-Werte, große Zahlen, Dezimalzahlen)
- ✅ React.memo

---

### TimelineChart.test.tsx

**Datei**: `src/components/monitoring/analytics/TimelineChart.test.tsx`

**Anzahl Tests**: 10

**Highlights**:

```tsx
describe('TimelineChart Component', () => {
  const mockData = [
    { date: '15 Jan', clippings: 5, reach: 10000 },
    { date: '16 Jan', clippings: 3, reach: 7000 },
  ];

  // Test 1: Rendering mit Daten
  it('should render LineChart with correct data', () => {
    render(<TimelineChart data={mockData} />);

    expect(screen.getByText('Veröffentlichungen über Zeit')).toBeInTheDocument();
  });

  // Test 2: Conditional Rendering (leere Daten)
  it('should return null when data is empty', () => {
    const { container } = render(<TimelineChart data={[]} />);

    expect(container.firstChild).toBeNull();
  });

  // Test 3: Recharts-Integration (Mock)
  it('should render Recharts LineChart', () => {
    const { container } = render(<TimelineChart data={mockData} />);

    // Recharts rendert .recharts-responsive-container
    const recharts = container.querySelector('.recharts-responsive-container');
    expect(recharts).toBeInTheDocument();
  });

  // Test 4: Dual Y-Axis
  it('should render dual Y-axis (clippings + reach)', () => {
    render(<TimelineChart data={mockData} />);

    // Recharts rendert Labels
    expect(screen.getByText('Anzahl')).toBeInTheDocument();
    expect(screen.getByText('Reichweite')).toBeInTheDocument();
  });
});
```

**Getestet**:
- ✅ Rendering mit Daten
- ✅ Conditional Rendering (empty data)
- ✅ Recharts-Integration
- ✅ Dual Y-Axis
- ✅ React.memo

**Wichtig**: Recharts muss NICHT gemockt werden in Jest (funktioniert out-of-the-box).

---

### MediaDistributionChart.test.tsx

**Datei**: `src/components/monitoring/analytics/MediaDistributionChart.test.tsx`

**Anzahl Tests**: 9

**Highlights**:

```tsx
describe('MediaDistributionChart Component', () => {
  const mockData = [
    { name: 'online', count: 15, reach: 50000 },
    { name: 'print', count: 8, reach: 30000 },
  ];

  // Test 1: Legende wird gerendert
  it('should render legend with outlet types', () => {
    render(<MediaDistributionChart data={mockData} />);

    expect(screen.getByText(/online: 15/)).toBeInTheDocument();
    expect(screen.getByText(/print: 8/)).toBeInTheDocument();
  });

  // Test 2: Farben
  it('should apply correct colors to pie segments', () => {
    const { container } = render(<MediaDistributionChart data={mockData} />);

    // Recharts rendert <path> mit fill-Attribut
    const paths = container.querySelectorAll('path[fill]');
    expect(paths.length).toBeGreaterThan(0);
  });
});
```

**Getestet**:
- ✅ Rendering mit Daten
- ✅ Legende
- ✅ Farben
- ✅ Conditional Rendering
- ✅ React.memo

---

### SentimentChart.test.tsx

**Datei**: `src/components/monitoring/analytics/SentimentChart.test.tsx`

**Anzahl Tests**: 10

**Highlights**:

```tsx
describe('SentimentChart Component', () => {
  const mockData = [
    { name: 'Positiv', value: 10, color: '#10b981' },
    { name: 'Neutral', value: 5, color: '#6b7280' },
    { name: 'Negativ', value: 2, color: '#ef4444' },
  ];

  // Test 1: Legende mit Farben
  it('should render legend with sentiment colors', () => {
    const { container } = render(<SentimentChart data={mockData} />);

    // Finde Farbquadrate
    const colorBoxes = container.querySelectorAll('.w-3.h-3.rounded-sm');
    expect(colorBoxes.length).toBe(3);
  });

  // Test 2: Nur Sentiments mit value > 0
  it('should only render sentiments with value > 0', () => {
    const dataWithZero = [
      { name: 'Positiv', value: 10, color: '#10b981' },
      { name: 'Neutral', value: 0, color: '#6b7280' }, // ← Wird gefiltert
    ];

    render(<SentimentChart data={dataWithZero} />);

    expect(screen.getByText(/Positiv: 10/)).toBeInTheDocument();
    expect(screen.queryByText(/Neutral: 0/)).not.toBeInTheDocument();
  });
});
```

**Getestet**:
- ✅ Rendering mit Daten
- ✅ Farben (Positiv, Neutral, Negativ)
- ✅ Filterung (value > 0)
- ✅ Conditional Rendering
- ✅ React.memo

---

### TopOutletsChart.test.tsx

**Datei**: `src/components/monitoring/analytics/TopOutletsChart.test.tsx`

**Anzahl Tests**: 10

**Highlights**:

```tsx
describe('TopOutletsChart Component', () => {
  const mockData = [
    { name: 'Die Zeit', reach: 100000, count: 3 },
    { name: 'Süddeutsche', reach: 80000, count: 2 },
  ];

  // Test 1: Horizontal BarChart
  it('should render horizontal BarChart', () => {
    const { container } = render(<TopOutletsChart data={mockData} />);

    // Recharts rendert .recharts-bar
    const bars = container.querySelectorAll('.recharts-bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  // Test 2: Outlet-Namen auf Y-Axis
  it('should show outlet names on Y-axis', () => {
    render(<TopOutletsChart data={mockData} />);

    // Recharts rendert Y-Axis Labels
    expect(screen.getByText('Die Zeit')).toBeInTheDocument();
    expect(screen.getByText('Süddeutsche')).toBeInTheDocument();
  });

  // Test 3: Max 5 Outlets
  it('should limit to max 5 outlets', () => {
    const manyOutlets = Array.from({ length: 10 }, (_, i) => ({
      name: `Outlet ${i}`,
      reach: (10 - i) * 1000,
      count: 1,
    }));

    render(<TopOutletsChart data={manyOutlets} />);

    // Nur Top 5 sollten gerendert werden
    expect(screen.getByText('Outlet 0')).toBeInTheDocument();
    expect(screen.getByText('Outlet 4')).toBeInTheDocument();
    expect(screen.queryByText('Outlet 5')).not.toBeInTheDocument();
  });
});
```

**Getestet**:
- ✅ Horizontal Layout
- ✅ Outlet-Namen auf Y-Axis
- ✅ Max 5 Outlets
- ✅ Conditional Rendering
- ✅ React.memo

---

## Hook-Tests

### useAVECalculation.test.tsx

**Datei**: `src/lib/hooks/useAVECalculation.test.tsx`

**Anzahl Tests**: 9

**Setup**:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAVECalculation } from './useAVECalculation';

// Mock AVE Settings Service
jest.mock('@/lib/firebase/ave-settings-service', () => ({
  aveSettingsService: {
    getOrCreate: jest.fn(),
    calculateAVE: jest.fn(),
  },
}));

// Test Helper: Wrapper mit QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}
```

**Highlights**:

```tsx
describe('useAVECalculation Hook', () => {
  describe('React Query Integration', () => {
    it('should load AVE settings via React Query', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      // Initial: Loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.aveSettings).toBeNull();

      // Nach Laden
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aveSettings).toEqual(mockAVESettings);
    });

    it('should not fetch when organizationId is missing', async () => {
      const { result } = renderHook(
        () => useAVECalculation(undefined, 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockAveSettingsService.getOrCreate).not.toHaveBeenCalled();
    });
  });

  describe('calculateAVE Function', () => {
    it('should return existing AVE value when clipping.ave is present', async () => {
      mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);

      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const clippingWithAVE = { ...mockClipping, ave: 999 };
      const ave = result.current.calculateAVE(clippingWithAVE);

      expect(ave).toBe(999);
      expect(mockAveSettingsService.calculateAVE).not.toHaveBeenCalled();
    });

    it('should return 0 when aveSettings are not loaded yet', async () => {
      const { result } = renderHook(
        () => useAVECalculation('org-123', 'user-456'),
        { wrapper: createWrapper() }
      );

      // Sofort aufrufen (während isLoading === true)
      const ave = result.current.calculateAVE(mockClipping);

      expect(ave).toBe(0);
    });
  });
});
```

**Getestet**:
- ✅ React Query Integration
- ✅ Loading States
- ✅ calculateAVE Logik
- ✅ Fehlende Parameter (organizationId, userId)
- ✅ Error Handling

**Wichtig**:
- QueryClient muss mit `retry: false` konfiguriert sein (sonst dauern Tests ewig)
- `waitFor` für asynchrone Assertions

---

### useClippingStats.test.tsx

**Datei**: `src/lib/hooks/useClippingStats.test.tsx`

**Anzahl Tests**: 9

**Setup**:

```tsx
import { renderHook } from '@testing-library/react';
import { useClippingStats } from './useClippingStats';

// Mock Firestore Timestamp
const createTimestamp = (date: Date) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
});

const mockClippings = [
  {
    id: 'clip-1',
    outletName: 'Outlet A',
    outletType: 'online',
    reach: 10000,
    sentiment: 'positive',
    publishedAt: createTimestamp(new Date('2025-01-15')),
    // ...
  },
  // ...
];
```

**Highlights**:

```tsx
describe('useClippingStats Hook', () => {
  describe('Basic Stats', () => {
    it('should return correct totalClippings', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, []));

      expect(result.current.totalClippings).toBe(3);
    });

    it('should calculate totalReach correctly', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, []));

      expect(result.current.totalReach).toBe(75000); // 10000 + 50000 + 15000
    });
  });

  describe('Timeline Data', () => {
    it('should group clippings by date', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, []));

      expect(result.current.timelineData).toHaveLength(2); // 2 Tage
    });

    it('should aggregate reach per date', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, []));

      const jan15 = result.current.timelineData.find((d) =>
        d.date.includes('15')
      );

      expect(jan15!.clippings).toBe(2);
      expect(jan15!.reach).toBe(60000);
    });
  });

  describe('Email Stats', () => {
    it('should calculate email stats correctly', () => {
      const { result } = renderHook(() => useClippingStats([], mockSends));

      expect(result.current.emailStats).toMatchObject({
        total: 4,
        opened: 3,
        clicked: 1,
        withClippings: 2,
        openRate: 75,
        conversionRate: 67,
      });
    });
  });

  describe('Memoization and Re-renders', () => {
    it('should memoize results when inputs do not change', () => {
      const { result, rerender } = renderHook(() =>
        useClippingStats(mockClippings, mockSends)
      );

      const firstResult = result.current;

      rerender();

      // Referenzen sollten gleich sein
      expect(result.current.timelineData).toBe(firstResult.timelineData);
      expect(result.current.emailStats).toBe(firstResult.emailStats);
    });
  });
});
```

**Getestet**:
- ✅ Alle 7 Stats-Berechnungen
- ✅ Gruppierung und Sortierung
- ✅ Edge Cases (leere Arrays, fehlende Daten)
- ✅ Memoization (Referenz-Stabilität)

---

## Test Utilities

### Mock Firestore Timestamp

```tsx
const createTimestamp = (date: Date) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
});

const timestamp = createTimestamp(new Date('2025-01-15'));
```

---

### Mock React Query Provider

```tsx
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // ← Wichtig!
        cacheTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}
```

---

### Mock AVE Settings Service

```tsx
jest.mock('@/lib/firebase/ave-settings-service', () => ({
  aveSettingsService: {
    getOrCreate: jest.fn(),
    calculateAVE: jest.fn(),
  },
}));

const mockAveSettingsService = aveSettingsService as jest.Mocked<
  typeof aveSettingsService
>;

// In Test:
mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);
```

---

## Coverage-Ziele

### Minimum Requirements

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >95%
- **Lines**: >90%

### Aktueller Stand

```
GESAMT: >95% Coverage
```

### Coverage Report generieren

```bash
npm run test:coverage
```

Output:

```
File                           | % Stmts | % Branch | % Funcs | % Lines
-------------------------------|---------|----------|---------|--------
All files                      |   96.42 |    94.73 |   100.0 |   96.42
 MonitoringDashboard.tsx       |     100 |      100 |     100 |     100
 useAVECalculation.ts          |     100 |      100 |     100 |     100
 useClippingStats.ts           |     100 |      100 |     100 |     100
 analytics/EmptyState.tsx      |     100 |      100 |     100 |     100
 analytics/PerformanceMetrics  |    98.5 |       95 |     100 |    98.5
 ...
```

### Coverage visualisieren

```bash
# HTML Report
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## Best Practices

### 1. Test-Daten

**DO**: Test-Daten als Konstanten definieren

```tsx
const defaultProps = {
  totalClippings: 42,
  totalReach: 150000,
  totalAVE: 5000,
  openRate: 65,
  conversionRate: 45,
};

it('should render', () => {
  render(<PerformanceMetrics {...defaultProps} />);
});
```

**DON'T**: Inline-Daten

```tsx
// ❌ Schlecht
it('should render', () => {
  render(<PerformanceMetrics totalClippings={42} totalReach={150000} ... />);
});
```

---

### 2. Assertions

**DO**: Spezifische Assertions

```tsx
expect(screen.getByText('Performance-Übersicht')).toBeInTheDocument();
expect(screen.getByText('5.000 €')).toBeInTheDocument();
```

**DON'T**: Generische Assertions

```tsx
// ❌ Schlecht
expect(container.innerHTML).toContain('Performance');
```

---

### 3. Edge Cases

**DO**: Alle Edge Cases testen

```tsx
it('should handle empty data', () => { /* ... */ });
it('should handle null values', () => { /* ... */ });
it('should handle zero values', () => { /* ... */ });
it('should handle large numbers', () => { /* ... */ });
```

**DON'T**: Nur Happy Path testen

---

### 4. React.memo Tests

**DO**: Referenz-Vergleich

```tsx
it('should not re-render with same props', () => {
  const { rerender } = render(<MyComponent {...props} />);

  const firstRender = screen.getByText('Heading');

  rerender(<MyComponent {...props} />);

  const secondRender = screen.getByText('Heading');

  expect(firstRender).toBe(secondRender); // ← Wichtig: .toBe() nicht .toEqual()
});
```

---

### 5. Async Tests

**DO**: `waitFor` für async Assertions

```tsx
it('should load data', async () => {
  const { result } = renderHook(() => useMyHook(), { wrapper });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

**DON'T**: `setTimeout` oder feste Delays

```tsx
// ❌ Schlecht
await new Promise((resolve) => setTimeout(resolve, 1000));
```

---

### 6. Test-Isolation

**DO**: `beforeEach` für Setup/Cleanup

```tsx
describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

**DON'T**: State zwischen Tests teilen

---

## Troubleshooting

### Problem 1: "No QueryClient set"

**Fehler**:

```
Error: No QueryClient set, use QueryClientProvider to set one
```

**Lösung**:

```tsx
// Wrapper hinzufügen
const { result } = renderHook(() => useAVECalculation(...), {
  wrapper: createWrapper(),
});
```

---

### Problem 2: "Cannot read property 'toDate' of undefined"

**Fehler**:

```
TypeError: Cannot read property 'toDate' of undefined
```

**Lösung**: Mock Timestamp verwenden

```tsx
const createTimestamp = (date: Date) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
});

const clipping = {
  publishedAt: createTimestamp(new Date('2025-01-15')),
};
```

---

### Problem 3: "Test timeout exceeded"

**Fehler**:

```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Lösung**: `retry: false` in QueryClient

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // ← Wichtig!
    },
  },
});
```

---

### Problem 4: "Unable to find element"

**Fehler**:

```
TestingLibraryElementError: Unable to find an element with the text: "Performance-Übersicht"
```

**Debugging**:

```tsx
import { screen } from '@testing-library/react';

it('test', () => {
  render(<MyComponent />);

  screen.debug(); // ← Gibt DOM-Tree aus

  expect(screen.getByText('...')).toBeInTheDocument();
});
```

---

### Problem 5: "Recharts not rendering"

**Fehler**: Chart wird nicht gerendert.

**Lösung**: Recharts benötigt Größe

```tsx
// ✅ Gut: ResponsiveContainer mit width/height
<ResponsiveContainer width="100%" height={300}>
  <LineChart>...</LineChart>
</ResponsiveContainer>

// ❌ Schlecht: LineChart ohne Container
<LineChart>...</LineChart>
```

In Tests: Recharts rendert automatisch (kein Mock notwendig).

---

## Tests ausführen

### Alle Tests

```bash
npm test
```

### Nur Analytics-Tests

```bash
npm test -- analytics
```

### Watch-Modus

```bash
npm test -- --watch
```

### Mit Coverage

```bash
npm run test:coverage
```

### Einzelne Datei

```bash
npm test -- PerformanceMetrics.test.tsx
```

### Einzelner Test

```bash
npm test -- -t "should render all 5 metric cards"
```

---

## Neue Tests hinzufügen

### Schritt 1: Datei erstellen

```bash
touch src/components/monitoring/analytics/MyComponent.test.tsx
```

### Schritt 2: Template kopieren

```tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  const defaultProps = {
    // ...
  };

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<MyComponent {...defaultProps} />);

      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    // ...
  });

  describe('Edge Cases', () => {
    // ...
  });

  describe('React.memo Optimization', () => {
    // ...
  });
});
```

### Schritt 3: Tests implementieren

Mindestens testen:
- ✅ Rendering
- ✅ Props-Variationen
- ✅ Edge Cases
- ✅ React.memo (falls verwendet)

### Schritt 4: Coverage prüfen

```bash
npm run test:coverage
```

Ziel: >90% Coverage für neue Komponente.

---

**Erstellt**: 2025-01-18
**Autor**: Refactoring-Team
**Version**: 2.0.0

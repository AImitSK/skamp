# API-Referenz - Analytics Tab

> **Modul**: Monitoring Analytics
> **Version**: 2.0.0
> **Letzte Aktualisierung**: 2025-01-18

---

## Inhaltsverzeichnis

1. [Hooks](#hooks)
2. [Komponenten](#komponenten)
3. [Type Definitions](#type-definitions)
4. [Services](#services)

---

## Hooks

### useAVECalculation

Lädt AVE-Settings via React Query und stellt Berechnungsfunktion bereit.

#### Signatur

```tsx
function useAVECalculation(
  organizationId: string | undefined,
  userId: string | undefined
): AVECalculation
```

#### Parameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `organizationId` | `string \| undefined` | Ja | ID der aktuellen Organisation |
| `userId` | `string \| undefined` | Ja | ID des aktuellen Users |

#### Return Value

```tsx
interface AVECalculation {
  aveSettings: AVESettings | null;
  isLoading: boolean;
  calculateAVE: (clipping: MediaClipping) => number;
}
```

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `aveSettings` | `AVESettings \| null` | Geladene AVE-Einstellungen oder `null` wenn nicht geladen |
| `isLoading` | `boolean` | `true` während des Ladens |
| `calculateAVE` | `(clipping: MediaClipping) => number` | Funktion zur AVE-Berechnung |

#### Beispiel

```tsx
import { useAVECalculation } from '@/lib/hooks/useAVECalculation';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const { aveSettings, isLoading, calculateAVE } = useAVECalculation(
    currentOrganization?.id,
    user?.uid
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const totalAVE = clippings.reduce((sum, c) => sum + calculateAVE(c), 0);

  return <div>Gesamt-AVE: {totalAVE} €</div>;
}
```

#### Verhalten

- **Caching**: Settings werden 10 Minuten lang gecacht
- **Enabled**: Query läuft nur wenn `organizationId && userId` vorhanden
- **Error Handling**: Bei Fehler wird `aveSettings = null` zurückgegeben
- **calculateAVE Logik**:
  1. Wenn `clipping.ave` existiert → Wert direkt verwenden
  2. Wenn `aveSettings === null` → `0` zurückgeben
  3. Ansonsten → `aveSettingsService.calculateAVE(clipping, aveSettings)`

#### Query Key

```tsx
['aveSettings', organizationId, userId]
```

---

### useClippingStats

Aggregiert alle Analytics-Metriken aus Clippings und Email-Sends.

#### Signatur

```tsx
function useClippingStats(
  clippings: MediaClipping[],
  sends: EmailCampaignSend[]
): ClippingStats
```

#### Parameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `clippings` | `MediaClipping[]` | Ja | Array von Media Clippings |
| `sends` | `EmailCampaignSend[]` | Ja | Array von Email-Sends |

#### Return Value

```tsx
interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  timelineData: TimelineDataPoint[];
  outletDistribution: OutletDistribution[];
  sentimentData: SentimentData[];
  topOutlets: TopOutlet[];
  emailStats: EmailStats;
}
```

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `totalClippings` | `number` | Anzahl aller Clippings |
| `totalReach` | `number` | Summe aller Reichweiten |
| `timelineData` | `TimelineDataPoint[]` | Gruppierte Daten nach Datum |
| `outletDistribution` | `OutletDistribution[]` | Verteilung nach Outlet-Typ |
| `sentimentData` | `SentimentData[]` | Sentiment-Verteilung (nur > 0) |
| `topOutlets` | `TopOutlet[]` | Top 5 Outlets nach Reichweite |
| `emailStats` | `EmailStats` | Email-Metriken (Öffnungsrate etc.) |

#### Beispiel

```tsx
import { useClippingStats } from '@/lib/hooks/useClippingStats';

function AnalyticsDashboard() {
  const clippings = useClippings();
  const sends = useSends();

  const stats = useClippingStats(clippings, sends);

  return (
    <div>
      <h1>Total Clippings: {stats.totalClippings}</h1>
      <TimelineChart data={stats.timelineData} />
      <SentimentChart data={stats.sentimentData} />
    </div>
  );
}
```

#### Verhalten

- **Memoization**: Alle Berechnungen sind mit `useMemo` optimiert
- **Performance**: Berechnet nur neu wenn `clippings` oder `sends` sich ändern
- **Empty Arrays**: Gibt sinnvolle Defaults zurück (`0`, `[]`)
- **Edge Cases**: Behandelt fehlende Daten (`reach || 0`, `outletType || 'Unbekannt'`)

#### Berechnungen im Detail

##### totalReach

```tsx
clippings.reduce((sum, c) => sum + (c.reach || 0), 0)
```

##### timelineData

1. Gruppiert nach Datum (Format: "15 Jan")
2. Summiert `clippings` und `reach` pro Datum
3. Sortiert aufsteigend nach Datum

##### outletDistribution

1. Gruppiert nach `outletType` (`print`, `online`, `broadcast`, `blog`, `Unbekannt`)
2. Summiert `count` und `reach` pro Typ

##### sentimentData

1. Zählt Sentiments (`positive`, `neutral`, `negative`)
2. Filtert `value === 0` heraus
3. Weist Farben zu (`#10b981`, `#6b7280`, `#ef4444`)

##### topOutlets

1. Gruppiert nach `outletName`
2. Summiert `reach` und `count` pro Outlet
3. Sortiert absteigend nach `reach`
4. Nimmt Top 5

##### emailStats

```tsx
{
  total: sends.length,
  opened: sends.filter(s => s.status === 'opened' || s.status === 'clicked').length,
  clicked: sends.filter(s => s.status === 'clicked').length,
  withClippings: sends.filter(s => s.clippingId).length,
  openRate: Math.round((opened / total) * 100) || 0,
  conversionRate: Math.round((withClippings / opened) * 100) || 0,
}
```

**Wichtig**: `conversionRate = withClippings / opened` (nicht `total`!)

---

## Komponenten

### MonitoringDashboard

Hauptkomponente für Analytics-Dashboard.

#### Signatur

```tsx
function MonitoringDashboard(props: MonitoringDashboardProps): JSX.Element
```

#### Props

```tsx
interface MonitoringDashboardProps {
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `clippings` | `MediaClipping[]` | Ja | Array von Media Clippings |
| `sends` | `EmailCampaignSend[]` | Ja | Array von Email-Sends |

#### Beispiel

```tsx
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';

function MyPage() {
  const { data: clippings = [] } = useClippings();
  const { data: sends = [] } = useSends();

  return <MonitoringDashboard clippings={clippings} sends={sends} />;
}
```

#### Verhalten

- Zeigt `<EmptyState />` wenn `clippings.length === 0 && sends.length === 0`
- Berechnet `totalAVE` mit `useMemo`
- Rendert 5 Chart-Komponenten

#### Context-Dependencies

- **OrganizationContext**: `useOrganization()` → `currentOrganization?.id`
- **AuthContext**: `useAuth()` → `user?.uid`
- **React Query Provider**: Muss vorhanden sein (für `useAVECalculation`)

---

### EmptyState

Zeigt "Keine Daten"-Zustand an.

#### Signatur

```tsx
function EmptyState(): JSX.Element
```

#### Props

Keine Props (statische Komponente).

#### Beispiel

```tsx
import { EmptyState } from './analytics/EmptyState';

{clippings.length === 0 && <EmptyState />}
```

#### Verhalten

- Zentrierter Text mit Icon (ChartBarIcon)
- Grauer Hintergrund (bg-gray-50)

---

### PerformanceMetrics

Zeigt Performance-Übersicht mit 5 Metriken.

#### Signatur

```tsx
const PerformanceMetrics = React.memo(function PerformanceMetrics(
  props: PerformanceMetricsProps
): JSX.Element)
```

#### Props

```tsx
interface PerformanceMetricsProps {
  totalClippings: number;
  totalReach: number;
  totalAVE: number;
  openRate: number;
  conversionRate: number;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `totalClippings` | `number` | Ja | Anzahl Veröffentlichungen |
| `totalReach` | `number` | Ja | Gesamtreichweite |
| `totalAVE` | `number` | Ja | Gesamt-AVE in Euro |
| `openRate` | `number` | Ja | Öffnungsrate in Prozent (0-100) |
| `conversionRate` | `number` | Ja | Conversion-Rate in Prozent (0-100) |

#### Beispiel

```tsx
<PerformanceMetrics
  totalClippings={42}
  totalReach={150000}
  totalAVE={5000}
  openRate={65}
  conversionRate={45}
/>
```

#### Verhalten

- **Conditional Rendering**: AVE-Karte wird nur angezeigt wenn `totalAVE > 0`
- **Formatierung**:
  - `totalReach`: `150.000` (Tausender-Trennzeichen)
  - `totalAVE`: `5.000 €` (Euro-Symbol)
  - `openRate` / `conversionRate`: `65%` (Prozent-Symbol)
- **Grid-Layout**: 5 Spalten (md:grid-cols-5), responsive

#### Optimierung

- Verwendet `React.memo` → Re-Render nur bei Props-Änderung

---

### TimelineChart

Zeigt Timeline mit Veröffentlichungen und Reichweite.

#### Signatur

```tsx
const TimelineChart = React.memo(function TimelineChart(
  props: TimelineChartProps
): JSX.Element | null)
```

#### Props

```tsx
interface TimelineChartProps {
  data: TimelineDataPoint[];
}

interface TimelineDataPoint {
  date: string;
  clippings: number;
  reach: number;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `data` | `TimelineDataPoint[]` | Ja | Timeline-Daten |

#### Beispiel

```tsx
const data = [
  { date: '15 Jan', clippings: 5, reach: 10000 },
  { date: '16 Jan', clippings: 3, reach: 7000 },
];

<TimelineChart data={data} />
```

#### Verhalten

- **Conditional Rendering**: Gibt `null` zurück wenn `data.length === 0`
- **Dual Y-Axis**:
  - Links: Anzahl Artikel (clippings)
  - Rechts: Reichweite (reach)
- **Farben**:
  - Artikel: `#005fab` (CeleroPress Primary)
  - Reichweite: `#DEDC00` (CeleroPress Secondary)

#### Optimierung

- Verwendet `React.memo`

---

### MediaDistributionChart

Zeigt Medium-Verteilung als Donut-Chart.

#### Signatur

```tsx
const MediaDistributionChart = React.memo(function MediaDistributionChart(
  props: MediaDistributionChartProps
): JSX.Element | null)
```

#### Props

```tsx
interface MediaDistributionChartProps {
  data: OutletDistribution[];
}

interface OutletDistribution {
  name: string;
  count: number;
  reach: number;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `data` | `OutletDistribution[]` | Ja | Outlet-Verteilung |

#### Beispiel

```tsx
const data = [
  { name: 'online', count: 15, reach: 50000 },
  { name: 'print', count: 8, reach: 30000 },
];

<MediaDistributionChart data={data} />
```

#### Verhalten

- **Conditional Rendering**: Gibt `null` zurück wenn `data.length === 0`
- **Donut-Style**: `innerRadius={60}`, `outerRadius={80}`
- **Farben**: 5 CeleroPress Brand-Colors
- **Legende**: Grid mit 2 Spalten

#### Optimierung

- Verwendet `React.memo`

---

### SentimentChart

Zeigt Sentiment-Verteilung als Donut-Chart.

#### Signatur

```tsx
const SentimentChart = React.memo(function SentimentChart(
  props: SentimentChartProps
): JSX.Element | null)
```

#### Props

```tsx
interface SentimentChartProps {
  data: SentimentData[];
}

interface SentimentData {
  name: string;
  value: number;
  color: string;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `data` | `SentimentData[]` | Ja | Sentiment-Daten |

#### Beispiel

```tsx
const data = [
  { name: 'Positiv', value: 10, color: '#10b981' },
  { name: 'Neutral', value: 5, color: '#6b7280' },
  { name: 'Negativ', value: 2, color: '#ef4444' },
];

<SentimentChart data={data} />
```

#### Verhalten

- **Conditional Rendering**: Gibt `null` zurück wenn `data.length === 0`
- **Vordefinierte Farben**:
  - Positiv: `#10b981` (green-500)
  - Neutral: `#6b7280` (gray-500)
  - Negativ: `#ef4444` (red-500)

#### Optimierung

- Verwendet `React.memo`

---

### TopOutletsChart

Zeigt Top 5 Outlets nach Reichweite als horizontales BarChart.

#### Signatur

```tsx
const TopOutletsChart = React.memo(function TopOutletsChart(
  props: TopOutletsChartProps
): JSX.Element | null)
```

#### Props

```tsx
interface TopOutletsChartProps {
  data: TopOutlet[];
}

interface TopOutlet {
  name: string;
  reach: number;
  count: number;
}
```

| Prop | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `data` | `TopOutlet[]` | Ja | Top Outlets (max. 5) |

#### Beispiel

```tsx
const data = [
  { name: 'Die Zeit', reach: 100000, count: 3 },
  { name: 'Süddeutsche', reach: 80000, count: 2 },
];

<TopOutletsChart data={data} />
```

#### Verhalten

- **Conditional Rendering**: Gibt `null` zurück wenn `data.length === 0`
- **Horizontal Layout**: `layout="vertical"`
- **Sortierung**: Top 5 nach Reichweite (absteigend)
- **Y-Axis Width**: 150px (für lange Outlet-Namen)

#### Optimierung

- Verwendet `React.memo`

---

## Type Definitions

### TimelineDataPoint

```tsx
interface TimelineDataPoint {
  date: string; // Format: "15 Jan", "16 Jan", ...
  clippings: number;
  reach: number;
}
```

**Verwendung**: TimelineChart

---

### OutletDistribution

```tsx
interface OutletDistribution {
  name: string; // 'print' | 'online' | 'broadcast' | 'blog' | 'Unbekannt'
  count: number;
  reach: number;
}
```

**Verwendung**: MediaDistributionChart

---

### SentimentData

```tsx
interface SentimentData {
  name: string; // 'Positiv' | 'Neutral' | 'Negativ'
  value: number;
  color: string; // '#10b981' | '#6b7280' | '#ef4444'
}
```

**Verwendung**: SentimentChart

---

### TopOutlet

```tsx
interface TopOutlet {
  name: string; // Outlet-Name oder 'Unbekannt'
  reach: number;
  count: number; // Anzahl Artikel
}
```

**Verwendung**: TopOutletsChart

---

### EmailStats

```tsx
interface EmailStats {
  total: number;
  opened: number;
  clicked: number;
  withClippings: number;
  openRate: number; // 0-100 (Prozent)
  conversionRate: number; // 0-100 (Prozent)
}
```

**Verwendung**: PerformanceMetrics

---

### ClippingStats

```tsx
interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  timelineData: TimelineDataPoint[];
  outletDistribution: OutletDistribution[];
  sentimentData: SentimentData[];
  topOutlets: TopOutlet[];
  emailStats: EmailStats;
}
```

**Verwendung**: useClippingStats (Return Value)

---

### AVECalculation

```tsx
interface AVECalculation {
  aveSettings: AVESettings | null;
  isLoading: boolean;
  calculateAVE: (clipping: MediaClipping) => number;
}
```

**Verwendung**: useAVECalculation (Return Value)

---

## Services

### aveSettingsService

Zentrale Service-Klasse für AVE-Settings.

#### getOrCreate

Lädt AVE-Settings oder erstellt Default-Settings.

```tsx
async getOrCreate(
  organizationId: string,
  userId: string
): Promise<AVESettings>
```

**Parameter**:
- `organizationId`: ID der Organisation
- `userId`: ID des Users (für Audit-Trail)

**Return**: AVE-Settings (entweder geladen oder neu erstellt mit Defaults)

**Throws**: Firebase-Fehler

---

#### calculateAVE

Berechnet AVE-Wert für ein Clipping.

```tsx
calculateAVE(
  clipping: MediaClipping,
  settings: AVESettings
): number
```

**Berechnung**:

```tsx
const factor = settings.factors[clipping.outletType] || 1;
const sentimentMultiplier = settings.sentimentMultipliers[clipping.sentiment] || 1;
return (clipping.reach || 0) * factor * sentimentMultiplier;
```

**Beispiel**:

```tsx
const clipping = {
  reach: 10000,
  outletType: 'print',
  sentiment: 'positive',
};

const settings = {
  factors: { print: 3, online: 1, broadcast: 5, blog: 0.5 },
  sentimentMultipliers: { positive: 1.0, neutral: 0.8, negative: 0.5 },
};

const ave = calculateAVE(clipping, settings);
// → 10000 * 3 * 1.0 = 30.000 €
```

---

## Constants

### BRAND_COLORS

Verwendet in TimelineChart und TopOutletsChart:

```tsx
const BRAND_COLORS = {
  primary: '#005fab',
  secondary: '#DEDC00',
};
```

---

### CHART_COLORS

Verwendet in MediaDistributionChart:

```tsx
const CHART_COLORS = ['#005fab', '#3397d7', '#add8f0', '#DEDC00', '#10b981'];
```

---

### SENTIMENT_COLORS

Verwendet in SentimentChart (via useClippingStats):

```tsx
const SENTIMENT_COLORS = {
  success: '#10b981',  // Positiv
  gray: '#6b7280',     // Neutral
  danger: '#ef4444',   // Negativ
};
```

---

## Error Handling

### useAVECalculation

```tsx
// Bei Fehler:
aveSettings = null
isLoading = false
calculateAVE(clipping) → 0
```

**Wichtig**: Komponente muss `totalAVE > 0` prüfen bevor AVE-Karte angezeigt wird.

---

### useClippingStats

```tsx
// Bei leeren Arrays:
totalClippings = 0
totalReach = 0
timelineData = []
outletDistribution = []
sentimentData = []
topOutlets = []
emailStats = { total: 0, opened: 0, ..., openRate: 0, conversionRate: 0 }
```

**Wichtig**: Charts prüfen `data.length === 0` und geben `null` zurück.

---

## Performance Notes

### React.memo

Alle 7 Chart-Komponenten verwenden `React.memo`:

```tsx
export const TimelineChart = React.memo(function TimelineChart({ data }) {
  // ...
});
```

**Effekt**: Re-Render nur bei Props-Änderung.

---

### useMemo

6 Berechnungen in useClippingStats sind memoized:

```tsx
const totalReach = useMemo(() => { /* ... */ }, [clippings]);
const timelineData = useMemo(() => { /* ... */ }, [clippings]);
const outletDistribution = useMemo(() => { /* ... */ }, [clippings]);
const sentimentData = useMemo(() => { /* ... */ }, [clippings]);
const topOutlets = useMemo(() => { /* ... */ }, [clippings]);
const emailStats = useMemo(() => { /* ... */ }, [sends]);
```

**Effekt**: Berechnung nur bei Datenänderung.

---

### React Query Caching

AVE-Settings werden 10 Minuten gecacht:

```tsx
staleTime: 10 * 60 * 1000 // 10 Minuten
```

**Effekt**: Firebase-Call nur einmal alle 10 Minuten.

---

**Erstellt**: 2025-01-18
**Autor**: Refactoring-Team
**Version**: 2.0.0

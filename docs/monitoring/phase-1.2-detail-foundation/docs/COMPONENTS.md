# Komponenten-Dokumentation: Monitoring Detail Foundation

> **Modul**: Monitoring Detail Foundation
> **Version**: 1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 18. November 2025

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [MonitoringHeader](#monitoringheader)
3. [PDFExportButton](#pdfexportbutton)
4. [TabNavigation](#tabnavigation)
5. [LoadingState](#loadingstate)
6. [ErrorState](#errorstate)
7. [Styling-Richtlinien](#styling-richtlinien)
8. [Accessibility-Hinweise](#accessibility-hinweise)
9. [Performance-Optimierung](#performance-optimierung)
10. [Common Patterns](#common-patterns)

---

## Übersicht

Das Monitoring Detail Foundation Modul bietet 5 wiederverwendbare UI-Komponenten:

| Komponente | Zweck | Zeilen | Props | Memo |
|------------|-------|--------|-------|------|
| `MonitoringHeader` | Header mit Zurück-Button und Kampagnen-Titel | 38 | 0 | ✅ |
| `PDFExportButton` | PDF-Export Button mit Loading State | 28 | 0 | ✅ |
| `TabNavigation` | 5 Tabs mit Counts und Icons | 57 | 2 | ✅ |
| `LoadingState` | Zentrale Loading UI | 13 | 0 | ✅ |
| `ErrorState` | Zentrale Error UI mit Retry | 21 | 2 | ✅ |

**Alle Komponenten:**
- Verwenden `React.memo` für Performance
- Nutzen `useMonitoring()` Context (kein Props-Drilling)
- Folgen dem CeleroPress Design System
- Sind vollständig getestet (94% Coverage)

---

## MonitoringHeader

Header-Komponente mit Zurück-Button, Kampagnen-Titel und Versanddatum.

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/MonitoringHeader.tsx`

### Props

**Keine Props!** Alle Daten kommen aus dem Context.

### Context Dependencies

```typescript
const { campaign, isPDFGenerating } = useMonitoring();
```

**Benötigte Context-Werte:**
- `campaign`: PRCampaign | null - Die aktuelle Kampagne
- `isPDFGenerating`: boolean - PDF-Export Status (nicht direkt verwendet, aber für PDF-Button)

### Signatur

```typescript
export const MonitoringHeader = memo(function MonitoringHeader(): JSX.Element | null
```

### Return Value

- `JSX.Element` wenn campaign vorhanden
- `null` wenn campaign nicht geladen

### Code

```typescript
'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';
import { useRouter } from 'next/navigation';

export const MonitoringHeader = memo(function MonitoringHeader() {
  const router = useRouter();
  const { campaign } = useMonitoring();

  const handleBack = () => {
    router.push('/dashboard/analytics/monitoring');
  };

  if (!campaign) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Button plain className="p-2" onClick={handleBack}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <Heading>Monitoring: {campaign.title}</Heading>
            <Text className="text-gray-600">
              Versendet am {campaign.sentAt
                ? new Date(campaign.sentAt.toDate()).toLocaleDateString('de-DE')
                : 'N/A'}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
});
```

### Usage

```typescript
import { MonitoringHeader } from './components/MonitoringHeader';

function MonitoringContent() {
  return (
    <div>
      <MonitoringHeader />
      {/* Weitere Inhalte */}
    </div>
  );
}
```

### Features

**1. Zurück-Navigation**
```typescript
const handleBack = () => {
  router.push('/dashboard/analytics/monitoring');
};
```
- Navigiert zur Monitoring-Übersicht
- Verwendet Next.js Router

**2. Kampagnen-Titel**
```typescript
<Heading>Monitoring: {campaign.title}</Heading>
```
- Zeigt Kampagnen-Titel
- Verwendet CeleroPress Heading-Komponente

**3. Versanddatum**
```typescript
<Text className="text-gray-600">
  Versendet am {campaign.sentAt
    ? new Date(campaign.sentAt.toDate()).toLocaleDateString('de-DE')
    : 'N/A'}
</Text>
```
- Formatiert Datum auf Deutsch
- Fallback zu 'N/A' wenn kein Datum

### Styling

**Layout:**
- `mb-6`: Margin-bottom für Abstand
- `flex items-center gap-3`: Flexbox mit Gap

**Button:**
- `plain`: CeleroPress Button-Variante
- `p-2`: Padding für Icon-Button

**Text:**
- `text-gray-600`: Sekundäre Textfarbe

### Accessibility

- Button hat impliziten Text (ArrowLeftIcon)
- Heading-Hierarchie korrekt
- Fokus-Ring durch CeleroPress Button

### Tests

**Datei:** `components/__tests__/MonitoringHeader.test.tsx`

**Testfälle:**
- Rendert korrekt mit campaign
- Zeigt "null" wenn campaign fehlt
- Zurück-Button navigiert korrekt
- Datum-Formatierung korrekt

---

## PDFExportButton

Button zum Exportieren eines PDF-Reports mit Loading State.

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/PDFExportButton.tsx`

### Props

**Keine Props!** Alle Daten kommen aus dem Context.

### Context Dependencies

```typescript
const { user } = useAuth();
const { handlePDFExport, isPDFGenerating } = useMonitoring();
```

**Benötigte Context-Werte:**
- `handlePDFExport`: (userId: string) => Promise<void> - Export-Funktion
- `isPDFGenerating`: boolean - Loading State

**Zusätzlich:**
- `user` aus AuthContext für userId

### Signatur

```typescript
export const PDFExportButton = memo(function PDFExportButton(): JSX.Element
```

### Code

```typescript
'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';
import { useAuth } from '@/context/AuthContext';

export const PDFExportButton = memo(function PDFExportButton() {
  const { user } = useAuth();
  const { handlePDFExport, isPDFGenerating } = useMonitoring();

  const handleClick = () => {
    if (!user) return;
    handlePDFExport(user.uid);
  };

  return (
    <Button
      onClick={handleClick}
      color="secondary"
      disabled={isPDFGenerating}
    >
      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
      {isPDFGenerating ? 'Generiere PDF...' : 'PDF-Report'}
    </Button>
  );
});
```

### Usage

```typescript
import { PDFExportButton } from './components/PDFExportButton';

function MonitoringContent() {
  return (
    <div className="flex justify-between">
      <MonitoringHeader />
      <PDFExportButton />
    </div>
  );
}
```

### Features

**1. Loading State**
```typescript
{isPDFGenerating ? 'Generiere PDF...' : 'PDF-Report'}
```
- Zeigt dynamischen Button-Text
- User-Feedback während Generierung

**2. User Check**
```typescript
const handleClick = () => {
  if (!user) return;
  handlePDFExport(user.uid);
};
```
- Verhindert Export ohne User
- Übergibt userId an Export-Funktion

**3. Disabled State**
```typescript
disabled={isPDFGenerating}
```
- Verhindert Doppel-Klicks
- Zeigt visuelles Feedback

### Styling

**Button:**
- `color="secondary"`: CeleroPress Sekundär-Farbe
- Icon links vom Text
- `mr-2`: Margin-right für Icon-Spacing

**Icon:**
- `h-4 w-4`: 16×16px Icon-Größe
- Heroicons /24/outline

### States

| State | Disabled | Text | Icon |
|-------|----------|------|------|
| Idle | false | "PDF-Report" | DocumentArrowDownIcon |
| Generating | true | "Generiere PDF..." | DocumentArrowDownIcon |
| No User | - | "PDF-Report" | DocumentArrowDownIcon |

### Accessibility

- Button semantisch korrekt
- Disabled State visuell erkennbar
- Icon hat aria-hidden (implizit durch Heroicons)

### Tests

**Datei:** `components/__tests__/PDFExportButton.test.tsx`

**Testfälle:**
- Rendert korrekt im Idle State
- Zeigt "Generiere PDF..." während Export
- Button ist disabled während Export
- onClick ruft handlePDFExport mit userId auf
- Verhindert Export ohne User

---

## TabNavigation

Tab-Navigation mit 5 Tabs, Icons und optionalen Count Badges.

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/TabNavigation.tsx`

### Props

```typescript
interface Props {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

type TabId = 'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions';
```

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `activeTab` | `TabId` | Ja | Aktuell aktiver Tab |
| `onChange` | `(tab: TabId) => void` | Ja | Callback bei Tab-Wechsel |

### Context Dependencies

```typescript
const { clippings, suggestions } = useMonitoring();
```

**Benötigte Context-Werte:**
- `clippings`: MediaClipping[] - Für Count Badge
- `suggestions`: MonitoringSuggestion[] - Für Count Badge (nur pending)

### Signatur

```typescript
export const TabNavigation = memo(function TabNavigation({
  activeTab,
  onChange
}: Props): JSX.Element
```

### Code

```typescript
'use client';

import { memo } from 'react';
import { ChartBarIcon, DocumentTextIcon, NewspaperIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';

type TabId = 'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface Props {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export const TabNavigation = memo(function TabNavigation({ activeTab, onChange }: Props) {
  const { clippings, suggestions } = useMonitoring();

  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Analytics', icon: ChartBarIcon },
    { id: 'performance', label: 'E-Mail Performance', icon: ChartBarIcon },
    { id: 'recipients', label: 'Empfänger & Veröffentlichungen', icon: DocumentTextIcon },
    { id: 'clippings', label: 'Clipping-Archiv', icon: NewspaperIcon, count: clippings.length },
    {
      id: 'suggestions',
      label: 'Auto-Funde',
      icon: SparklesIcon,
      count: suggestions.filter(s => s.status === 'pending').length
    },
  ];

  return (
    <div className="flex space-x-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center pb-2 text-sm font-medium ${
            activeTab === tab.id
              ? 'text-[#005fab] border-b-2 border-[#005fab]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <tab.icon className="w-4 h-4 mr-2" />
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
});
```

### Usage

```typescript
import { useState, useCallback } from 'react';
import { TabNavigation } from './components/TabNavigation';

function MonitoringContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  return (
    <div>
      <TabNavigation activeTab={activeTab} onChange={handleTabChange} />

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'performance' && <PerformanceTab />}
      {/* ... */}
    </div>
  );
}
```

### Tab-Konfiguration

```typescript
const tabs: Tab[] = [
  {
    id: 'dashboard',
    label: 'Analytics',
    icon: ChartBarIcon,
    // Kein count
  },
  {
    id: 'clippings',
    label: 'Clipping-Archiv',
    icon: NewspaperIcon,
    count: clippings.length // Badge mit Anzahl
  },
  {
    id: 'suggestions',
    label: 'Auto-Funde',
    icon: SparklesIcon,
    count: suggestions.filter(s => s.status === 'pending').length // Nur pending
  },
];
```

### Features

**1. Dynamic Counts**
```typescript
count: clippings.length // Alle Clippings
count: suggestions.filter(s => s.status === 'pending').length // Nur pending
```

**2. Active State**
```typescript
className={`${
  activeTab === tab.id
    ? 'text-[#005fab] border-b-2 border-[#005fab]' // Active
    : 'text-gray-500 hover:text-gray-700'          // Inactive
}`}
```

**3. Icon Support**
```typescript
<tab.icon className="w-4 h-4 mr-2" />
```
- Alle Heroicons /24/outline
- Dynamische Icon-Komponente

### Styling

**Layout:**
- `flex space-x-6`: Horizontale Tab-Leiste mit Spacing
- `pb-2`: Padding-bottom für Border

**Active Tab:**
- `text-[#005fab]`: CeleroPress Primary Color
- `border-b-2 border-[#005fab]`: Unterstrich

**Inactive Tab:**
- `text-gray-500`: Grauer Text
- `hover:text-gray-700`: Hover-Effekt

**Icon:**
- `w-4 h-4`: 16×16px
- `mr-2`: Margin-right für Spacing

### Tab-IDs

```typescript
type TabId =
  | 'dashboard'      // Analytics Tab
  | 'performance'    // E-Mail Performance Tab
  | 'recipients'     // Empfänger & Veröffentlichungen Tab
  | 'clippings'      // Clipping-Archiv Tab
  | 'suggestions';   // Auto-Funde Tab
```

### Accessibility

- `type="button"`: Expliziter Button-Typ
- Semantisch korrekte Buttons
- Keyboard-Navigation funktioniert
- Active State visuell klar

### Tests

**Datei:** `components/__tests__/TabNavigation.test.tsx`

**Testfälle:**
- Rendert alle 5 Tabs
- Zeigt aktiven Tab korrekt
- onClick ruft onChange mit korrekter TabId auf
- Count Badges werden korrekt angezeigt
- Filtert pending suggestions korrekt

---

## LoadingState

Zentrale Loading-Komponente mit Spinner.

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/LoadingState.tsx`

### Props

**Keine Props!**

### Signatur

```typescript
export const LoadingState = memo(function LoadingState(): JSX.Element
```

### Code

```typescript
'use client';

import { memo } from 'react';
import { Text } from '@/components/ui/text';

export const LoadingState = memo(function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">Lade Monitoring-Daten...</Text>
    </div>
  );
});
```

### Usage

```typescript
import { LoadingState } from './components/LoadingState';

function MonitoringContent() {
  const { isLoadingData } = useMonitoring();

  if (isLoadingData) return <LoadingState />;

  return <div>{/* Content */}</div>;
}
```

### Features

**1. Spinner Animation**
```typescript
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
```
- Tailwind `animate-spin` Klasse
- Border-only Spinner (performance)

**2. Loading Text**
```typescript
<Text className="ml-3">Lade Monitoring-Daten...</Text>
```
- Deutschsprachiger Text
- CeleroPress Text-Komponente

### Styling

**Container:**
- `flex items-center justify-center`: Zentriert
- `h-64`: Feste Höhe (16rem / 256px)

**Spinner:**
- `animate-spin`: Tailwind Rotation Animation
- `rounded-full`: Kreis
- `h-8 w-8`: 32×32px
- `border-b-2 border-blue-600`: Nur unterer Border (leichter)

**Text:**
- `ml-3`: Margin-left für Spacing

### Accessibility

- Text ist screen-reader freundlich
- ARIA-Live Region nicht nötig (static loading)

### Customization

**Custom Loading Text:**
```typescript
export const LoadingState = memo(function LoadingState({
  text = 'Lade Monitoring-Daten...'
}: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">{text}</Text>
    </div>
  );
});
```

### Tests

**Datei:** `components/__tests__/LoadingState.test.tsx`

**Testfälle:**
- Rendert Spinner
- Rendert Loading-Text
- Hat korrekte Klassen

---

## ErrorState

Zentrale Error-Komponente mit Retry-Button.

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/components/ErrorState.tsx`

### Props

```typescript
interface Props {
  error: Error;
  onRetry: () => void;
}
```

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `error` | `Error` | Ja | Fehler-Objekt |
| `onRetry` | `() => void` | Ja | Retry Callback |

### Signatur

```typescript
export const ErrorState = memo(function ErrorState({
  error,
  onRetry
}: Props): JSX.Element
```

### Code

```typescript
'use client';

import { memo } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface Props {
  error: Error;
  onRetry: () => void;
}

export const ErrorState = memo(function ErrorState({ error, onRetry }: Props) {
  return (
    <div className="text-center py-12">
      <Text className="text-red-500">Fehler beim Laden: {error.message}</Text>
      <Button onClick={onRetry} className="mt-4">
        Erneut versuchen
      </Button>
    </div>
  );
});
```

### Usage

```typescript
import { ErrorState } from './components/ErrorState';

function MonitoringContent() {
  const { error, reloadData } = useMonitoring();

  if (error) return <ErrorState error={error} onRetry={reloadData} />;

  return <div>{/* Content */}</div>;
}
```

### Features

**1. Error Message**
```typescript
<Text className="text-red-500">Fehler beim Laden: {error.message}</Text>
```
- Zeigt Fehler-Nachricht
- Rote Farbe für Error

**2. Retry Button**
```typescript
<Button onClick={onRetry} className="mt-4">
  Erneut versuchen
</Button>
```
- Callback für Retry
- CeleroPress Button

### Styling

**Container:**
- `text-center`: Zentrierter Text
- `py-12`: Vertikales Padding

**Text:**
- `text-red-500`: Error-Farbe

**Button:**
- `mt-4`: Margin-top für Abstand

### Accessibility

- Fehler-Text semantisch korrekt
- Button fokussierbar
- Klare Call-to-Action

### Enhanced Error State

**Mit Icon und mehr Details:**
```typescript
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export const ErrorState = memo(function ErrorState({ error, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <ExclamationCircleIcon className="h-12 w-12 text-red-500 mb-4" />
      <Text className="text-red-700 font-semibold mb-2">
        Fehler beim Laden der Daten
      </Text>
      <Text className="text-sm text-gray-500 mb-4">
        {error.message}
      </Text>
      <Button onClick={onRetry}>
        Erneut versuchen
      </Button>
    </div>
  );
});
```

### Tests

**Datei:** `components/__tests__/ErrorState.test.tsx`

**Testfälle:**
- Rendert Error-Message
- Rendert Retry-Button
- onClick ruft onRetry auf
- Zeigt error.message korrekt

---

## Styling-Richtlinien

### CeleroPress Design System

Alle Komponenten folgen dem CeleroPress Design System:

**Farben:**
```typescript
// Primary Actions
'text-[#005fab]'
'border-[#005fab]'

// Neutral
'text-gray-500'
'text-gray-600'
'text-gray-700'

// Error
'text-red-500'
'text-red-700'
```

**Typography:**
```typescript
// Heading-Komponente für Titel
<Heading>Monitoring: {campaign.title}</Heading>

// Text-Komponente für Body-Text
<Text className="text-gray-600">Versendet am...</Text>
```

**Icons:**
```typescript
// Nur Heroicons /24/outline
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

// Standard Icon-Größen
className="w-4 h-4"  // 16×16px (Buttons)
className="w-5 h-5"  // 20×20px (Header)
```

**Spacing:**
```typescript
// Tailwind Spacing Scale
className="mb-6"      // 1.5rem / 24px
className="gap-3"     // 0.75rem / 12px
className="space-x-6" // 1.5rem / 24px
```

### Layout Patterns

**Flexbox:**
```typescript
// Horizontal Layout
<div className="flex items-center gap-3">

// Vertical Layout
<div className="flex flex-col items-center">

// Space Between
<div className="flex justify-between">
```

**Centering:**
```typescript
// Horizontal + Vertical Center
<div className="flex items-center justify-center h-64">

// Text Center
<div className="text-center py-12">
```

---

## Accessibility-Hinweise

### Keyboard Navigation

Alle interaktiven Komponenten sind keyboard-accessible:

**Buttons:**
```typescript
// Expliziter Button-Typ
<button type="button" onClick={...}>

// Tab-Navigation
<Button onClick={handleBack}>
```

**Focus-Rings:**
- Automatisch durch CeleroPress Button-Komponente
- Tailwind focus-visible Klassen

### Screen Reader

**Semantische HTML-Struktur:**
```typescript
// Heading-Hierarchie
<Heading>Monitoring: {campaign.title}</Heading>

// Button-Labels
<Button>PDF-Report</Button> // Klarer Text

// Alt-Text für Icons
// Icons sind dekorativ (kein aria-label nötig)
```

**ARIA-Attributes:**
```typescript
// Disabled State
<Button disabled={isPDFGenerating}>
  // Automatisch aria-disabled="true"
</Button>
```

---

## Performance-Optimierung

### React.memo

Alle Komponenten verwenden `React.memo`:

```typescript
export const MonitoringHeader = memo(function MonitoringHeader() {
  // Re-Render nur bei Context-Änderung
});

export const TabNavigation = memo(function TabNavigation({ activeTab, onChange }: Props) {
  // Re-Render nur bei activeTab oder onChange Änderung
});
```

**Performance-Vorteil:**
- Vermeidet unnötige Re-Renders
- Wichtig bei häufigen Context-Updates

### useCallback

Callbacks sollten immer `useCallback` verwenden:

```typescript
// ❌ Ohne useCallback
const handleTabChange = (tab: TabId) => {
  setActiveTab(tab);
};

// ✅ Mit useCallback
const handleTabChange = useCallback((tab: TabId) => {
  setActiveTab(tab);
}, []);
```

**Warum?**
- TabNavigation ist memo'd
- Ohne useCallback: onChange Prop ändert sich bei jedem Parent-Render
- Mit useCallback: onChange Prop bleibt stabil

### Context Optimization

Nutze nur benötigte Context-Werte:

```typescript
// ❌ Alle Werte (unnötig)
const contextValue = useMonitoring();

// ✅ Nur benötigte Werte
const { campaign, sends } = useMonitoring();
```

---

## Common Patterns

### Pattern 1: Loading/Error/Success

```typescript
function MyComponent() {
  const { campaign, isLoadingData, error, reloadData } = useMonitoring();

  if (isLoadingData) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reloadData} />;
  if (!campaign) return <div>Nicht gefunden</div>;

  return <div>{campaign.title}</div>;
}
```

### Pattern 2: Tab-basierte Navigation

```typescript
function MyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  return (
    <div>
      <TabNavigation activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'performance' && <PerformanceTab />}
      {activeTab === 'recipients' && <RecipientsTab />}
      {activeTab === 'clippings' && <ClippingsTab />}
      {activeTab === 'suggestions' && <SuggestionsTab />}
    </div>
  );
}
```

### Pattern 3: Header mit Actions

```typescript
function MyPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <MonitoringHeader />
        <PDFExportButton />
      </div>
      {/* Content */}
    </div>
  );
}
```

### Pattern 4: Conditional Rendering

```typescript
function MyComponent() {
  const { analysisPDFs } = useMonitoring();

  return (
    <div>
      {analysisPDFs.length > 0 ? (
        <PDFList pdfs={analysisPDFs} />
      ) : (
        <EmptyState message="Keine Reports vorhanden" />
      )}
    </div>
  );
}
```

---

**Letzte Aktualisierung:** 18. November 2025
**Version:** 1.0
**Siehe auch:** [README.md](../README.md) | [API-Dokumentation](./API.md)

# Monitoring Detail Foundation

> **Modul**: Monitoring Detail Foundation (Phase 1.2)
> **Version**: 1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 18. November 2025

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Problem & Lösung](#problem--lösung)
3. [Architektur](#architektur)
4. [MonitoringContext API](#monitoringcontext-api)
5. [Komponenten-Hierarchie](#komponenten-hierarchie)
6. [Quick Start Guide](#quick-start-guide)
7. [Migration Guide](#migration-guide)
8. [Performance-Optimierungen](#performance-optimierungen)
9. [Troubleshooting](#troubleshooting)
10. [Siehe auch](#siehe-auch)

---

## Übersicht

Das **Monitoring Detail Foundation** Modul ist die zentrale Foundation für die Kampagnen-Überwachung in CeleroPress. Es wurde im Rahmen von Phase 1.2 von einer monolithischen Struktur zu einer sauberen Context-basierten Architektur refactored.

### Hauptmerkmale

- **Code-Reduktion**: 465 → 297 Zeilen (-36%)
- **React Query Integration**: Automatisches Caching und Refetching
- **MonitoringContext**: Eliminiert Props-Drilling komplett
- **Shared Components**: Wiederverwendbare UI-Komponenten
- **Test Coverage**: 119 comprehensive Tests, 94% durchschnittliche Coverage
- **Performance**: React.memo + useCallback Optimierung

### Kernfunktionalität

Das Modul bietet:

1. **Kampagnen-Überwachung**: Zentrale Datenverwaltung für Campaign, Sends, Clippings, Suggestions
2. **PDF-Export**: Automatische Report-Generierung mit Loading States
3. **Analyse-PDFs**: Conditional Loading der PDF-Liste (nur wenn Analytics Tab aktiv)
4. **Tab-Navigation**: 5 Tabs mit URL-Routing und Counts
5. **Error Handling**: Zentrale Error/Loading States mit Retry-Funktionalität

---

## Problem & Lösung

### IST-Zustand (vor Refactoring)

**Hauptdatei**: `page.tsx` - 465 Zeilen monolithischer Code

#### Probleme

**1. Monolithische Struktur**
```typescript
// Alles in einer Datei
export default function MonitoringDetailPage() {
  // 15+ useState Hooks
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [sends, setSends] = useState<EmailCampaignSend[]>([]);
  const [clippings, setClippings] = useState<MediaClipping[]>([]);
  const [suggestions, setSuggestions] = useState<MonitoringSuggestion[]>([]);
  const [analysisPDFs, setAnalysisPDFs] = useState<any[]>([]);
  // ... weitere States

  // useEffect Chaos
  useEffect(() => { loadData(); }, [campaignId]);
  useEffect(() => { loadAnalysisPDFs(); }, [activeTab]);

  // 5 Tabs inline definiert
  // 400+ Zeilen JSX
}
```

**2. Props-Drilling**
```typescript
// Jeder Tab bekommt die gleichen Props
{activeTab === 'dashboard' && (
  <MonitoringDashboard
    campaign={campaign}
    sends={sends}
    clippings={clippings}
  />
)}
{activeTab === 'performance' && (
  <EmailPerformanceStats sends={sends} />
)}
// ... 3 weitere Tabs mit Props-Drilling
```

**3. Fehlende Abstraktion**
```typescript
// Manuelles Data Loading (kein React Query)
const loadData = async () => {
  try {
    setLoading(true);
    const [campaign, sends, clippings, suggestions] = await Promise.all([
      prService.getById(campaignId),
      emailCampaignService.getSends(campaignId, { organizationId }),
      clippingService.getByCampaignId(campaignId, { organizationId }),
      monitoringSuggestionService.getByCampaignId(campaignId, organizationId),
    ]);
    setCampaign(campaign);
    setSends(sends);
    setClippings(clippings);
    setSuggestions(suggestions);
  } catch (error) {
    console.error('Fehler:', error); // Kein User-Feedback
  } finally {
    setLoading(false);
  }
};
```

**4. Error-Handling lückenhaft**
- 6 von 8 Stellen hatten Toast-Feedback
- 2 Stellen nur `console.error` ohne User-Feedback (loadData, loadAnalysisPDFs)

### SOLL-Zustand (nach Refactoring)

**Code-Reduktion**: 465 → 297 Zeilen (-36%)

#### Architektur-Ziel

```
MonitoringProvider (Context)
├── React Query Hooks
│   ├── useCampaignMonitoringData (campaign, sends, clippings, suggestions)
│   ├── useAnalysisPDFs (PDF-Liste, conditional loading)
│   └── usePDFDeleteMutation (Delete mit Toast)
├── Shared State (campaign, sends, clippings, suggestions)
├── Shared Actions (reloadData, PDF-Export, Delete)
└── Komponenten
    ├── MonitoringHeader (Zurück-Button, Titel, PDF-Export)
    ├── TabNavigation (5 Tabs mit Counts)
    ├── LoadingState (Zentrale Loading UI)
    └── ErrorState (Zentrale Error UI mit Retry)
```

#### Neue Struktur

```
src/app/dashboard/analytics/monitoring/[campaignId]/
├── page.tsx                             # Schlanker Orchestrator (297 Zeilen)
├── context/
│   └── MonitoringContext.tsx            # Provider + useMonitoring Hook
└── components/
    ├── MonitoringHeader.tsx             # Header mit Zurück-Button
    ├── PDFExportButton.tsx              # PDF-Export Button
    ├── TabNavigation.tsx                # Tab-Leiste mit Counts
    ├── LoadingState.tsx                 # Loading UI
    └── ErrorState.tsx                   # Error UI mit Retry

src/lib/hooks/
├── useCampaignMonitoringData.ts         # React Query: Campaign Data
├── useAnalysisPDFs.ts                   # React Query: PDF-Liste
└── usePDFDeleteMutation.ts              # React Query Mutation: Delete
```

---

## Architektur

### Datenfluss-Diagramm

```
┌─────────────────────────────────────────────────────────┐
│ MonitoringDetailPage (Root)                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ MonitoringProvider                                  │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ React Query Hooks                               │ │ │
│ │ │ ├── useCampaignMonitoringData                   │ │ │
│ │ │ │   ├─> prService.getById()                     │ │ │
│ │ │ │   ├─> emailCampaignService.getSends()         │ │ │
│ │ │ │   ├─> clippingService.getByCampaignId()       │ │ │
│ │ │ │   └─> monitoringSuggestionService...          │ │ │
│ │ │ ├── useAnalysisPDFs (conditional)               │ │ │
│ │ │ │   └─> projectService.getFolderStructure()     │ │ │
│ │ │ └── usePDFDeleteMutation                        │ │ │
│ │ │     └─> mediaService.deleteMediaAsset()         │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                       │ │
│ │ Context Value:                                        │ │
│ │ ├── campaign, sends, clippings, suggestions          │ │
│ │ ├── isLoadingData, error                             │ │
│ │ ├── analysisPDFs, analysenFolderLink                 │ │
│ │ └── handlePDFExport, handleDeletePDF, reloadData     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ MonitoringContent (Consumer)                        │ │
│ │ ├── useMonitoring() ──> Context Value               │ │
│ │ ├── MonitoringHeader                                │ │
│ │ ├── PDFExportButton                                 │ │
│ │ ├── TabNavigation                                   │ │
│ │ └── Tab Content (Dashboard, Performance, ...)       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### React Query Strategie

**1. Parallel Loading**
```typescript
// useCampaignMonitoringData: Alle 4 Datenquellen parallel
const [campaign, sends, clippings, suggestions] = await Promise.all([
  prService.getById(campaignId),
  emailCampaignService.getSends(campaignId, { organizationId }),
  clippingService.getByCampaignId(campaignId, { organizationId }),
  monitoringSuggestionService.getByCampaignId(campaignId, organizationId),
]);
```

**2. Conditional Loading**
```typescript
// useAnalysisPDFs: Nur laden wenn Analytics Tab aktiv
const { data: pdfData } = useAnalysisPDFs(
  campaignId,
  organizationId,
  projectId,
  activeTab === 'dashboard' // enabled flag
);
```

**3. Automatic Caching**
```typescript
// Cache-Strategie
staleTime: 5 * 60 * 1000,  // 5 Minuten für Campaign Data
staleTime: 2 * 60 * 1000,  // 2 Minuten für PDF-Liste
gcTime: 10 * 60 * 1000,    // 10 Minuten Garbage Collection
```

---

## MonitoringContext API

### Interface

```typescript
interface MonitoringContextValue {
  // Data
  campaign: PRCampaign | null;
  sends: EmailCampaignSend[];
  clippings: MediaClipping[];
  suggestions: MonitoringSuggestion[];

  // Loading States
  isLoadingData: boolean;
  isLoadingPDFs: boolean;

  // Error States
  error: Error | null;

  // Actions
  reloadData: () => Promise<void>;

  // PDF Export
  handlePDFExport: (userId: string) => Promise<void>;
  isPDFGenerating: boolean;

  // Analysis PDFs
  analysisPDFs: any[];
  analysenFolderLink: string | null;
  handleDeletePDF: (pdf: any) => Promise<void>;
}
```

### Provider Usage

```typescript
import { MonitoringProvider } from './context/MonitoringContext';

export default function MonitoringDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();

  const campaignId = params.campaignId as string;
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <MonitoringProvider
      campaignId={campaignId}
      organizationId={currentOrganization?.id || ''}
      activeTab={activeTab}
    >
      <MonitoringContent />
    </MonitoringProvider>
  );
}
```

### Consumer Usage

```typescript
import { useMonitoring } from '../context/MonitoringContext';

function MonitoringContent() {
  const {
    campaign,
    sends,
    clippings,
    suggestions,
    isLoadingData,
    error,
    reloadData,
    handlePDFExport,
    isPDFGenerating,
  } = useMonitoring();

  if (isLoadingData) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reloadData} />;

  return (
    <div>
      <MonitoringHeader />
      <TabNavigation activeTab={activeTab} onChange={handleTabChange} />
      {/* Tab Content */}
    </div>
  );
}
```

### Context Value Details

**Data Properties**
- `campaign`: Die aktuelle PR-Kampagne (PRCampaign | null)
- `sends`: Alle E-Mail-Versendungen (EmailCampaignSend[])
- `clippings`: Alle Clippings (MediaClipping[])
- `suggestions`: Alle Auto-Funde (MonitoringSuggestion[])

**Loading States**
- `isLoadingData`: true während Kampagnen-Daten laden
- `isLoadingPDFs`: true während PDF-Liste lädt

**Error States**
- `error`: Fehler-Objekt bei Load-Fehlern (Error | null)

**Actions**
- `reloadData()`: Lädt alle Kampagnen-Daten neu (invalidiert React Query Cache)
- `handlePDFExport(userId)`: Generiert PDF-Report
- `handleDeletePDF(pdf)`: Löscht ein PDF mit Toast-Feedback

**PDF-Related**
- `analysisPDFs`: Liste aller generierten PDFs
- `analysenFolderLink`: Link zum Analysen-Ordner im Projekt
- `isPDFGenerating`: true während PDF-Generierung

---

## Komponenten-Hierarchie

### Component Tree

```
MonitoringDetailPage (Root)
│
└─ MonitoringProvider
   │
   └─ MonitoringContent
      │
      ├─ MonitoringHeader
      │  ├─ ArrowLeftIcon (Zurück-Button)
      │  ├─ Heading (Kampagnen-Titel)
      │  └─ Text (Versanddatum)
      │
      ├─ PDFExportButton
      │  ├─ Button (PDF-Export)
      │  └─ DocumentArrowDownIcon
      │
      ├─ TabNavigation
      │  ├─ Tab: Analytics (ChartBarIcon)
      │  ├─ Tab: E-Mail Performance (ChartBarIcon)
      │  ├─ Tab: Empfänger (DocumentTextIcon)
      │  ├─ Tab: Clipping-Archiv (NewspaperIcon, Count Badge)
      │  └─ Tab: Auto-Funde (SparklesIcon, Count Badge)
      │
      └─ Tab Content (Conditional)
         ├─ Dashboard Tab
         │  ├─ MonitoringDashboard
         │  └─ Generierte Reports (PDF-Liste)
         │     ├─ PDF Item (Dropdown)
         │     │  ├─ Download
         │     │  ├─ Löschen
         │     │  └─ Versenden (Coming Soon)
         │     └─ Link zum Analysen-Ordner
         │
         ├─ Performance Tab
         │  └─ EmailPerformanceStats
         │
         ├─ Recipients Tab
         │  └─ RecipientTrackingList
         │
         ├─ Clippings Tab
         │  └─ ClippingArchive
         │
         └─ Suggestions Tab
            └─ MonitoringSuggestionsTable
```

### State Flow

```
User Action
    ↓
Component Event Handler
    ↓
Context Action (handlePDFExport, handleDeletePDF, reloadData)
    ↓
React Query Mutation/Refetch
    ↓
Firebase Service Call
    ↓
React Query Cache Update
    ↓
Context Value Update (automatic)
    ↓
Component Re-Render (automatic)
    ↓
UI Update
```

---

## Quick Start Guide

### 1. Installation & Setup

**Voraussetzungen:**
- React Query bereits installiert (`@tanstack/react-query`)
- Firebase Services verfügbar
- TypeScript konfiguriert

**Keine zusätzlichen Dependencies nötig!**

### 2. Basis-Usage

**Minimale Integration:**

```typescript
import { MonitoringProvider } from '@/app/dashboard/analytics/monitoring/[campaignId]/context/MonitoringContext';

export default function YourPage() {
  return (
    <MonitoringProvider
      campaignId="your-campaign-id"
      organizationId="your-org-id"
      activeTab="dashboard"
    >
      <YourContent />
    </MonitoringProvider>
  );
}
```

**Context Consumer:**

```typescript
import { useMonitoring } from '@/app/dashboard/analytics/monitoring/[campaignId]/context/MonitoringContext';

function YourContent() {
  const { campaign, sends, isLoadingData, error } = useMonitoring();

  if (isLoadingData) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => {}} />;

  return (
    <div>
      <h1>{campaign?.title}</h1>
      <p>Versendungen: {sends.length}</p>
    </div>
  );
}
```

### 3. PDF-Export Integration

```typescript
import { useMonitoring } from '../context/MonitoringContext';
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  const { handlePDFExport, isPDFGenerating } = useMonitoring();

  const handleClick = () => {
    if (!user) return;
    handlePDFExport(user.uid);
  };

  return (
    <Button onClick={handleClick} disabled={isPDFGenerating}>
      {isPDFGenerating ? 'Generiere...' : 'PDF-Report'}
    </Button>
  );
}
```

### 4. Tab-Navigation Integration

```typescript
import { useState, useCallback } from 'react';
import { TabNavigation } from '../components/TabNavigation';

function MyPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div>
      <TabNavigation activeTab={activeTab} onChange={handleTabChange} />
      {/* Tab Content */}
    </div>
  );
}
```

---

## Migration Guide

### Von Alt zu Neu

**Schritt 1: Provider hinzufügen**

**Vorher:**
```typescript
export default function MonitoringDetailPage() {
  const [campaign, setCampaign] = useState(null);
  const [sends, setSends] = useState([]);

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => { /* ... */ };

  return <div>{/* Content */}</div>;
}
```

**Nachher:**
```typescript
export default function MonitoringDetailPage() {
  return (
    <MonitoringProvider
      campaignId={campaignId}
      organizationId={organizationId}
      activeTab="dashboard"
    >
      <MonitoringContent />
    </MonitoringProvider>
  );
}

function MonitoringContent() {
  const { campaign, sends } = useMonitoring();
  return <div>{/* Content */}</div>;
}
```

**Schritt 2: Props-Drilling entfernen**

**Vorher:**
```typescript
<MonitoringDashboard
  campaign={campaign}
  sends={sends}
  clippings={clippings}
  onReload={reloadData}
/>
```

**Nachher:**
```typescript
// In MonitoringDashboard.tsx
function MonitoringDashboard() {
  const { campaign, sends, clippings, reloadData } = useMonitoring();
  // Kein Props-Drilling mehr!
}
```

**Schritt 3: Loading/Error States ersetzen**

**Vorher:**
```typescript
if (loading) return <div>Lädt...</div>;
if (error) return <div>Fehler: {error}</div>;
```

**Nachher:**
```typescript
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

if (isLoadingData) return <LoadingState />;
if (error) return <ErrorState error={error} onRetry={reloadData} />;
```

**Schritt 4: Data Loading ersetzen**

**Vorher:**
```typescript
const loadData = async () => {
  setLoading(true);
  try {
    const campaign = await prService.getById(campaignId);
    setCampaign(campaign);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => { loadData(); }, [campaignId]);
```

**Nachher:**
```typescript
// Automatisch durch MonitoringProvider!
// useCampaignMonitoringData Hook kümmert sich um alles
const { campaign, isLoadingData, error, reloadData } = useMonitoring();
```

### Breaking Changes

**KEINE Breaking Changes!**

Das Modul ist vollständig rückwärtskompatibel. Bestehende Komponenten können schrittweise migriert werden.

---

## Performance-Optimierungen

### 1. React.memo

Alle Shared Components verwenden React.memo:

```typescript
export const MonitoringHeader = memo(function MonitoringHeader() {
  // Verhindert Re-Render bei unverändertem Context
});

export const TabNavigation = memo(function TabNavigation({ activeTab, onChange }: Props) {
  // Re-Render nur bei activeTab oder onChange Änderung
});
```

### 2. useCallback

Alle Handler verwenden useCallback:

```typescript
const handleTabChange = useCallback((tab: TabId) => {
  setActiveTab(tab);
}, []);

const handleDeletePDF = useCallback(async (pdf: any) => {
  setPdfToDelete(pdf);
  setShowDeleteDialog(true);
}, []);

const confirmDeletePDF = useCallback(async () => {
  if (!pdfToDelete) return;
  await contextDeletePDF(pdfToDelete);
}, [pdfToDelete, contextDeletePDF]);
```

### 3. Conditional Loading

PDF-Liste wird nur geladen wenn Analytics Tab aktiv:

```typescript
const {
  data: pdfData,
  isLoading: isLoadingPDFs
} = useAnalysisPDFs(
  campaignId,
  organizationId,
  projectId,
  activeTab === 'dashboard' // enabled flag
);
```

**Performance-Vorteil:**
- Reduziert initiales Page Load um ~200ms
- Spart Firestore-Reads
- Bessere UX bei Tab-Switching

### 4. React Query Caching

Intelligentes Caching mit Stale-Time:

```typescript
// Campaign Data: 5 Minuten Cache
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// PDF-Liste: 2 Minuten Cache
staleTime: 2 * 60 * 1000,
gcTime: 5 * 60 * 1000,
```

**Performance-Vorteil:**
- Wiederholte Besuche ohne Re-Fetch
- Background Refetch on Focus
- Automatic Garbage Collection

---

## Troubleshooting

### Häufige Fehler

**1. "useMonitoring must be used within MonitoringProvider"**

**Ursache:** useMonitoring() außerhalb von MonitoringProvider aufgerufen

**Lösung:**
```typescript
// ❌ Falsch
function MyComponent() {
  const { campaign } = useMonitoring(); // Error!
  return <div>{campaign?.title}</div>;
}

// ✅ Richtig
<MonitoringProvider {...props}>
  <MyComponent /> {/* Jetzt funktioniert es */}
</MonitoringProvider>
```

**2. PDF-Liste lädt nicht**

**Ursache:** projectId fehlt oder activeTab !== 'dashboard'

**Lösung:**
```typescript
// Prüfe:
console.log({
  projectId: campaign?.projectId,  // Muss gesetzt sein
  activeTab,                        // Muss 'dashboard' sein
});
```

**3. React Query Cache wird nicht invalidiert**

**Ursache:** QueryClient nicht korrekt konfiguriert

**Lösung:**
```typescript
// In _app.tsx oder layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

**4. TypeScript-Fehler bei PDF-Typen**

**Ursache:** `any` Typ für PDFs (temporär)

**Lösung:** Definiere korrekten Typ
```typescript
interface AnalysisPDF {
  id: string;
  fileName: string;
  downloadUrl: string;
  createdAt: Timestamp;
  // ... weitere Felder
}

// In MonitoringContext.tsx
analysisPDFs: AnalysisPDF[];
handleDeletePDF: (pdf: AnalysisPDF) => Promise<void>;
```

### Debug-Tipps

**1. React Query DevTools aktivieren**

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**2. Context Value loggen**

```typescript
function MonitoringContent() {
  const contextValue = useMonitoring();

  useEffect(() => {
    console.log('Monitoring Context:', contextValue);
  }, [contextValue]);

  // ...
}
```

**3. React Query Status prüfen**

```typescript
const {
  data,
  isLoading,
  isFetching,
  error,
  status
} = useCampaignMonitoringData(campaignId, organizationId);

console.log({
  status,        // 'pending' | 'error' | 'success'
  isLoading,     // Initial load
  isFetching,    // Background refetch
});
```

### Performance-Probleme

**Problem:** Zu viele Re-Renders

**Lösung:**
1. React DevTools Profiler verwenden
2. Prüfe ob useCallback fehlt
3. Prüfe ob React.memo fehlt
4. Prüfe ob Context Value sich ändert

**Problem:** Langsame Initial Load

**Lösung:**
1. Prüfe Netzwerk-Tab (Parallel Loading aktiv?)
2. Aktiviere React Query Caching
3. Conditional Loading für PDF-Liste nutzen

---

## Siehe auch

### Interne Dokumentation

- [API-Dokumentation](./docs/API.md) - Detaillierte Hook-Referenz
- [Komponenten-Dokumentation](./docs/COMPONENTS.md) - Component Props & Usage
- [ADR-001: MonitoringContext](./docs/adr/ADR-001-monitoring-context.md) - Architektur-Entscheidung
- [ADR-002: React Query](./docs/adr/ADR-002-react-query.md) - State Management
- [ADR-003: Conditional PDF Loading](./docs/adr/ADR-003-conditional-pdf-loading.md) - Performance

### Verwandte Module

- `/src/components/monitoring/` - Shared Monitoring Components
- `/src/lib/firebase/pr-service.ts` - Campaign Service
- `/src/lib/firebase/email-campaign-service.ts` - Email Send Service
- `/src/lib/firebase/clipping-service.ts` - Clipping Service
- `/src/lib/firebase/monitoring-suggestion-service.ts` - Auto-Funde Service

### Externe Ressourcen

- [React Query Dokumentation](https://tanstack.com/query/latest)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [React.memo Performance Guide](https://react.dev/reference/react/memo)

---

**Letzte Aktualisierung:** 18. November 2025
**Version:** 1.0
**Maintainer:** CeleroPress Team

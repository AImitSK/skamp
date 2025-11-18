# ADR-001: MonitoringContext vs Props-Drilling

> **Status**: ✅ Accepted
> **Datum**: 17. November 2025
> **Autoren**: CeleroPress Team
> **Kontext**: Phase 1.2 - Monitoring Detail Foundation

---

## Kontext

### Problem

Die ursprüngliche Monitoring Detail Page (`page.tsx`, 465 Zeilen) litt unter massivem Props-Drilling:

**Vorher:**
```typescript
export default function MonitoringDetailPage() {
  // 15+ useState Hooks
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [sends, setSends] = useState<EmailCampaignSend[]>([]);
  const [clippings, setClippings] = useState<MediaClipping[]>([]);
  const [suggestions, setSuggestions] = useState<MonitoringSuggestion[]>([]);
  // ... weitere States

  return (
    <div>
      {/* 5 Tabs mit Props-Drilling */}
      {activeTab === 'dashboard' && (
        <MonitoringDashboard
          campaign={campaign}
          sends={sends}
          clippings={clippings}
          onReload={loadData}
        />
      )}
      {activeTab === 'performance' && (
        <EmailPerformanceStats sends={sends} />
      )}
      {activeTab === 'recipients' && (
        <RecipientTrackingList
          sends={sends}
          campaignId={campaignId}
          onSendUpdated={loadData}
        />
      )}
      {activeTab === 'clippings' && (
        <ClippingArchive clippings={clippings} />
      )}
      {activeTab === 'suggestions' && (
        <MonitoringSuggestionsTable
          suggestions={suggestions}
          onConfirm={handleConfirm}
          onMarkSpam={handleMarkSpam}
          loading={loading}
        />
      )}
    </div>
  );
}
```

**Probleme:**

1. **Props-Drilling**: Jeder Tab bekommt 2-4 Props
   - 5 Tabs × durchschnittlich 3 Props = 15 Prop-Übergaben
   - Änderung an Daten-Struktur = 5 Stellen anpassen

2. **Code-Duplikation**: Gleiche Props mehrfach übergeben
   - `sends` wird 3× übergeben
   - `campaign` wird 1× übergeben
   - `clippings` wird 1× übergeben
   - `suggestions` wird 1× übergeben

3. **Wartbarkeit**: Neue Tabs brauchen alle Props erneut
   - Phase 2.1-2.5 würden jedes Mal Props hinzufügen müssen
   - Keine Separation of Concerns

4. **Testbarkeit**: Jeder Tab braucht Mock-Props
   - Test-Setup komplex
   - Props müssen überall synchronisiert werden

### Anforderungen

**Funktional:**
- Alle Tabs brauchen Zugriff auf: campaign, sends, clippings, suggestions
- Alle Tabs brauchen Zugriff auf: reloadData, handlePDFExport
- PDF-Export Button braucht Zugriff auf: isPDFGenerating
- Header braucht Zugriff auf: campaign

**Nicht-Funktional:**
- Code-Reduktion: Mindestens 30%
- Wartbarkeit: Neue Tabs ohne Props-Drilling
- Performance: Keine unnötigen Re-Renders
- Testbarkeit: Einfaches Mocking

---

## Entscheidung

**Implementierung eines React Context (`MonitoringContext`) mit React Query Integration.**

### Architektur

```
MonitoringProvider (Context)
├── React Query Hooks
│   ├── useCampaignMonitoringData (campaign, sends, clippings, suggestions)
│   ├── useAnalysisPDFs (PDF-Liste, conditional loading)
│   └── usePDFDeleteMutation (Delete mit Toast)
├── Shared State (aus React Query)
├── Shared Actions (reloadData, PDF-Export, Delete)
└── Komponenten (nutzen useMonitoring Hook)
    ├── MonitoringHeader
    ├── PDFExportButton
    ├── TabNavigation
    └── Tab-Komponenten (ohne Props-Drilling!)
```

### Implementation

**1. MonitoringContext erstellen**

```typescript
// src/app/dashboard/analytics/monitoring/[campaignId]/context/MonitoringContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useCampaignMonitoringData } from '@/lib/hooks/useCampaignMonitoringData';
import { useAnalysisPDFs } from '@/lib/hooks/useAnalysisPDFs';
import { usePDFDeleteMutation } from '@/lib/hooks/usePDFDeleteMutation';

interface MonitoringContextValue {
  // Data
  campaign: PRCampaign | null;
  sends: EmailCampaignSend[];
  clippings: MediaClipping[];
  suggestions: MonitoringSuggestion[];

  // Loading/Error
  isLoadingData: boolean;
  error: Error | null;

  // Actions
  reloadData: () => Promise<void>;
  handlePDFExport: (userId: string) => Promise<void>;
  handleDeletePDF: (pdf: any) => Promise<void>;
  isPDFGenerating: boolean;

  // PDFs
  analysisPDFs: any[];
  analysenFolderLink: string | null;
}

const MonitoringContext = createContext<MonitoringContextValue | undefined>(undefined);

export function MonitoringProvider({ children, campaignId, organizationId, activeTab }) {
  const { data, isLoading, error, refetch } = useCampaignMonitoringData(
    campaignId,
    organizationId
  );

  const { data: pdfData } = useAnalysisPDFs(
    campaignId,
    organizationId,
    data?.campaign?.projectId,
    activeTab === 'dashboard'
  );

  const pdfDelete = usePDFDeleteMutation(campaignId, organizationId, data?.campaign?.projectId);

  const value: MonitoringContextValue = {
    campaign: data?.campaign || null,
    sends: data?.sends || [],
    clippings: data?.clippings || [],
    suggestions: data?.suggestions || [],
    isLoadingData: isLoading,
    error,
    reloadData: refetch,
    // ... weitere Werte
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within MonitoringProvider');
  }
  return context;
}
```

**2. Provider in page.tsx einbinden**

```typescript
export default function MonitoringDetailPage() {
  return (
    <MonitoringProvider
      campaignId={campaignId}
      organizationId={organizationId}
      activeTab={activeTab}
    >
      <MonitoringContent />
    </MonitoringProvider>
  );
}
```

**3. Consumer ohne Props-Drilling**

```typescript
function MonitoringDashboard() {
  // Kein Props-Drilling mehr!
  const { campaign, sends, clippings, reloadData } = useMonitoring();

  return (
    <div>
      <h1>{campaign?.title}</h1>
      <p>Versendungen: {sends.length}</p>
      {/* ... */}
    </div>
  );
}
```

---

## Konsequenzen

### Positiv

**1. Code-Reduktion: 36%**
```
Vorher: 465 Zeilen (page.tsx)
Nachher: 297 Zeilen (page.tsx)
Reduktion: 168 Zeilen (-36%)
```

**2. Props-Drilling eliminiert**
```
Vorher: 5 Tabs × 3 Props = 15 Prop-Übergaben
Nachher: 0 Props (Context)
Einsparung: 100%
```

**3. Wartbarkeit erhöht**
- Neue Tabs brauchen keine Props mehr
- Daten-Struktur-Änderung nur an 1 Stelle (Context)
- Separation of Concerns

**4. Testbarkeit verbessert**
```typescript
// Vorher: Mock-Props für jeden Test
<MonitoringDashboard
  campaign={mockCampaign}
  sends={mockSends}
  clippings={mockClippings}
  onReload={mockReload}
/>

// Nachher: Mock-Context einmal
<MonitoringProvider value={mockValue}>
  <MonitoringDashboard />
</MonitoringProvider>
```

**5. Performance optimiert**
- React Query Caching automatisch
- Conditional Loading für PDFs
- React.memo funktioniert (stabile Context-Werte)

### Negativ

**1. Zusätzliche Dateien**
```
Vorher: 1 Datei (page.tsx)
Nachher: 5 Dateien
  - page.tsx
  - MonitoringContext.tsx
  - useCampaignMonitoringData.ts
  - useAnalysisPDFs.ts
  - usePDFDeleteMutation.ts

Netto: +277 Zeilen (aber bessere Architektur)
```

**2. Lernkurve**
- Entwickler müssen Context-Pattern verstehen
- React Query Konzepte (queries, mutations, cache)
- Aber: Standard-Pattern in React-Ecosystem

**3. Debug-Komplexität**
- Context-Werte nicht in React DevTools Props sichtbar
- Aber: React Query DevTools zeigen Cache

### Risiken & Mitigation

**Risiko 1: Context Re-Render bei jedem Update**

**Mitigation:**
```typescript
// ✅ Context Value ist stabil (React Query managed state)
const value: MonitoringContextValue = {
  campaign: data?.campaign || null,
  sends: data?.sends || [],
  // ... nur bei data-Änderung neu
};

// ✅ React.memo für Komponenten
export const MonitoringHeader = memo(function MonitoringHeader() { ... });
```

**Risiko 2: Testing-Komplexität**

**Mitigation:**
```typescript
// Test-Helper für Mock-Context
export function createMockMonitoringContext(overrides = {}) {
  return {
    campaign: null,
    sends: [],
    clippings: [],
    suggestions: [],
    isLoadingData: false,
    error: null,
    ...overrides,
  };
}

// In Tests
<MonitoringProvider value={createMockMonitoringContext({ campaign: mockCampaign })}>
  <MyComponent />
</MonitoringProvider>
```

---

## Alternativen

### Alternative 1: Props-Drilling beibehalten

**Vorteile:**
- Einfach zu verstehen
- Keine zusätzlichen Dateien
- Props in React DevTools sichtbar

**Nachteile:**
- 15 Prop-Übergaben
- Code-Duplikation
- Wartbarkeit schlecht
- **→ Abgelehnt**

### Alternative 2: Redux/Zustand

**Vorteile:**
- Zentrale State-Verwaltung
- DevTools
- Bewährtes Pattern

**Nachteile:**
- Overhead (Actions, Reducers, Store-Setup)
- Keine Integration mit Data-Fetching
- Mehr Boilerplate als Context
- **→ Abgelehnt** (Overkill für diesen Use-Case)

### Alternative 3: React Query + Props

**Vorteile:**
- Automatisches Caching
- Kein Context nötig

**Nachteile:**
- Props-Drilling bleibt
- Query-Hooks in jedem Tab dupliziert
- **→ Abgelehnt**

### Alternative 4: React Query + Context (GEWÄHLT)

**Vorteile:**
- Bestes aus beiden Welten
- Automatisches Caching + kein Props-Drilling
- Standard-Pattern in React-Ecosystem

**Nachteile:**
- Zusätzliche Dateien (akzeptabel)

**→ Gewählt!**

---

## Lessons Learned

### Was funktioniert gut

**1. React Query Integration**
- Automatisches Caching spart viele Zeilen
- Background Refetch funktioniert out-of-the-box
- Error Handling zentral

**2. Conditional Loading**
```typescript
useAnalysisPDFs(campaignId, organizationId, projectId, activeTab === 'dashboard')
```
- Spart Firestore-Reads
- Bessere Performance

**3. React.memo + Context**
- Funktioniert perfekt zusammen
- Keine unnötigen Re-Renders

### Was verbessert werden könnte

**1. TypeScript-Typen für PDFs**
```typescript
// Aktuell: any
analysisPDFs: any[];

// Besser: MediaAsset
analysisPDFs: MediaAsset[];
```

**2. Error Boundaries**
- Aktuell: Error nur in Component
- Besser: Error Boundary um Provider

**3. Loading States granularer**
```typescript
// Aktuell: isLoadingData (alles)
// Besser: isLoadingCampaign, isLoadingSends, ...
```

---

## Zukunft

### Phase 2.1-2.5: Tab-Refactorings

Alle Tab-Refactorings profitieren von diesem Pattern:

```typescript
// Phase 2.1: Analytics Tab
function AnalyticsTab() {
  const { campaign, sends, clippings } = useMonitoring();
  // Kein Props-Drilling!
}

// Phase 2.2: Performance Tab
function PerformanceTab() {
  const { sends } = useMonitoring();
  // Nur was gebraucht wird!
}
```

### Wiederverwendung in anderen Modulen

Pattern kann wiederverwendet werden:

- Projekt-Detail Foundation (ProjectContext)
- Kontakt-Detail Foundation (ContactContext)
- Newsletter-Detail Foundation (NewsletterContext)

---

## Referenzen

### Interne Dokumentation

- [README.md](../README.md) - Hauptdokumentation
- [API.md](./API.md) - Hook-Referenz
- [ADR-002: React Query](./ADR-002-react-query.md) - State Management Details

### Externe Ressourcen

- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [React Query + Context Pattern](https://tkdodo.eu/blog/react-query-and-forms)
- [Props Drilling Anti-Pattern](https://kentcdodds.com/blog/prop-drilling)

---

**Status:** ✅ Accepted
**Datum:** 17. November 2025
**Implementiert in:** Phase 1.2 - Monitoring Detail Foundation

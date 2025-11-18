# Phase 1.2: Monitoring Detail Foundation - Implementierungsplan

**Version:** 1.0
**Basiert auf:** Module-Refactoring Template v2.1
**Projekt:** CeleroPress - Analytics/Monitoring
**Phase:** 1.2 (Foundation)
**Erstellt:** 17. November 2025

---

## 📋 Übersicht

Refactoring der Monitoring Detail Page (`[campaignId]/page.tsx`) von monolithischer Struktur zu sauberer Context-basierter Architektur.

**Ziel:** Foundation schaffen für alle Tab-Module (Phase 2.1-2.5)

---

## 🎯 Problem (IST-Zustand)

**Entry Point:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`

**Aktuelle LOC:** 463 Zeilen (reduziert von ursprünglich 526)

**Hauptprobleme:**

1. **Monolithische Struktur**
   - Alle 5 Tabs in einer Datei
   - Daten-Loading inline (loadData, loadAnalysisPDFs)
   - PDF-Export inline
   - Dialogs inline

2. **Props-Drilling**
   - Jeder Tab bekommt: campaign, sends, clippings, suggestions
   - Duplicate Props in 5 Tab-Komponenten

3. **Fehlende Abstraktion**
   - Kein React Query (useEffect + useState Pattern)
   - Keine Shared Actions (reloadData überall dupliziert)
   - Keine Shared Components

4. **Error-Handling**
   - Toast teilweise vorhanden (6/8 Stellen)
   - 2 Stellen mit console.error ohne User-Feedback:
     - loadData() - Initial Page Load
     - loadAnalysisPDFs() - PDF-Liste

---

## 🎯 Lösung (SOLL-Zustand)

**Code-Reduktion Ziel:** 463 → ~250 Zeilen (-46%)

### Architektur-Ziel

```
MonitoringProvider (Context)
├── Shared State (campaign, sends, clippings, suggestions)
├── Shared Actions (reloadData, PDF-Export)
└── Komponenten
    ├── MonitoringHeader
    ├── TabNavigation
    ├── LoadingState / ErrorState
    └── Tabs (Props-Drilling eliminiert!)
```

### Neue Struktur

```
src/app/dashboard/analytics/monitoring/[campaignId]/
├── page.tsx                        # Schlanker Orchestrator (~250 Zeilen)
├── components/
│   ├── MonitoringHeader.tsx        # Header mit Buttons
│   ├── TabNavigation.tsx           # Tab-Leiste
│   ├── LoadingState.tsx            # Loading UI
│   └── ErrorState.tsx              # Error UI
└── context/
    └── MonitoringContext.tsx       # Provider + Context

src/lib/hooks/
├── useMonitoringData.ts            # React Query: Campaign, Sends, Clippings, Suggestions
├── usePDFExport.ts                 # React Query Mutation: PDF-Export
└── useAnalysisPDFs.ts              # React Query: PDF-Liste
```

---

## 🔧 Technische Details

### MonitoringContext API

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
  handlePDFExport: () => Promise<void>;
  isPDFGenerating: boolean;

  // Analysis PDFs
  analysisPDFs: any[];
  analysenFolderLink: string | null;
  handleDeletePDF: (pdfId: string) => Promise<void>;
}
```

### React Query Hooks

**useMonitoringData(campaignId, organizationId)**
- Lädt: campaign, sends, clippings, suggestions
- Parallel-Fetching mit Promise.all
- Auto-Refetch on focus
- Cache: 5 Minuten

**usePDFExport()**
- Mutation für PDF-Generierung
- Toast-Feedback
- Auto-Reload von PDF-Liste

**useAnalysisPDFs(campaignId, organizationId)**
- Lädt PDF-Liste vom analysen-Ordner
- Cache: 2 Minuten
- Conditional enabled (nur wenn Analytics Tab aktiv)

---

## 🚀 Die 8 Phasen

### Phase 0: Vorbereitung & Setup

**Dauer:** 30 Minuten

#### Aufgaben

- [x] Feature-Branch erstellen
  ```bash
  git checkout -b feature/monitoring-detail-foundation
  ```

- [x] Ist-Zustand dokumentieren
  ```bash
  wc -l src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx
  # 463 Zeilen
  ```

- [x] Backup erstellen
  ```bash
  cp src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx \
     src/app/dashboard/analytics/monitoring/[campaignId]/page.backup.tsx
  ```

- [x] Dependencies prüfen
  - ✅ React Query vorhanden: `@tanstack/react-query`
  - ✅ Testing Libraries vorhanden
  - ✅ TypeScript korrekt konfiguriert
  - ✅ Toast-Service vorhanden: `src/lib/utils/toast.ts`

#### Deliverable

- Feature-Branch: `feature/monitoring-detail-foundation`
- Backup: `page.backup.tsx`
- Ist-Zustand: 463 Zeilen, 5 Tabs, 6 Toast-Aufrufe, 2 fehlende Toasts

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Monitoring Detail Foundation"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Dauer:** 1-2 Stunden

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

#### Toast-Error-Handling vervollständigen

**2 fehlende Toasts hinzufügen:**

1. **loadData() - Zeile 92**
   ```typescript
   } catch (error) {
     console.error('Fehler beim Laden:', error);
     toastService.error('Fehler beim Laden der Kampagne');
   }
   ```

2. **loadAnalysisPDFs() - Zeile 141**
   ```typescript
   } catch (error) {
     console.error('Fehler beim Laden der Analyse-PDFs:', error);
     toastService.error('Fehler beim Laden der PDFs');
   }
   ```

#### Cleanup-Schritte

**1. TODOs finden & entfernen**
```bash
grep -rn "TODO:" src/app/dashboard/analytics/monitoring/[campaignId]
```
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen

**2. Console-Logs prüfen**
```bash
grep -rn "console\." src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx
```
- [ ] 5x console.error vorhanden (OK - in catch blocks)
- [ ] Debug-Logs entfernen (falls vorhanden)

**3. Unused State entfernen**
```bash
grep -n "useState" src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx
```
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused States identifizieren

**4. ESLint Auto-Fix**
```bash
npx eslint src/app/dashboard/analytics/monitoring/[campaignId] --fix
```
- [ ] ESLint mit --fix ausführen
- [ ] Manuelle Fixes für Warnings

**5. Manueller Test**
```bash
npm run dev
```
- [ ] Dev-Server starten
- [ ] Monitoring Detail Page testen
- [ ] Alle 5 Tabs funktionieren
- [ ] PDF-Export funktioniert
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] 2 fehlende Toasts hinzugefügt (loadData, loadAnalysisPDFs)
- [ ] TODO-Kommentare entfernt (falls vorhanden)
- [ ] Debug-Console-Logs entfernt (falls vorhanden)
- [ ] Unused State entfernt (falls vorhanden)
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test erfolgreich

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- Toast-Error-Handling vervollständigt (loadData, loadAnalysisPDFs)
- ESLint Auto-Fix durchgeführt
- Manueller Test erfolgreich

page.tsx: 463 → ~465 Zeilen (+2 Toast-Aufrufe)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Dauer:** 2-3 Stunden

**Ziel:** State Management mit React Query ersetzen

#### 1.1 Custom Hooks erstellen

**Hook 1: useMonitoringData.ts**

Datei: `src/lib/hooks/useMonitoringData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';

export function useMonitoringData(
  campaignId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['monitoring', campaignId, organizationId],
    queryFn: async () => {
      if (!campaignId || !organizationId) throw new Error('Missing params');

      const [campaign, sends, clippings, suggestions] = await Promise.all([
        prService.getById(campaignId),
        emailCampaignService.getSends(campaignId, { organizationId }),
        clippingService.getByCampaignId(campaignId, { organizationId }),
        monitoringSuggestionService.getByCampaignId(campaignId, organizationId),
      ]);

      return { campaign, sends, clippings, suggestions };
    },
    enabled: !!campaignId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000,   // 10 Minuten
  });
}
```

**Hook 2: useAnalysisPDFs.ts**

Datei: `src/lib/hooks/useAnalysisPDFs.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { storageService } from '@/lib/firebase/storage-service';

export function useAnalysisPDFs(
  campaignId: string | undefined,
  organizationId: string | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analysisPDFs', campaignId, organizationId],
    queryFn: async () => {
      if (!campaignId || !organizationId) throw new Error('Missing params');

      const folderPath = `analysen/${organizationId}/${campaignId}/`;
      const files = await storageService.listFiles(folderPath);

      // Get download URLs
      const pdfsWithUrls = await Promise.all(
        files.map(async (file) => {
          const url = await storageService.getDownloadURL(file.fullPath);
          return {
            id: file.name,
            name: file.name,
            url,
            created: file.timeCreated,
          };
        })
      );

      return pdfsWithUrls.sort((a, b) =>
        b.created.getTime() - a.created.getTime()
      );
    },
    enabled: enabled && !!campaignId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}
```

**Hook 3: usePDFDeleteMutation.ts**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '@/lib/firebase/storage-service';
import { toastService } from '@/lib/utils/toast';

export function usePDFDeleteMutation(
  campaignId: string | undefined,
  organizationId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pdfPath: string) => {
      await storageService.deleteFile(pdfPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['analysisPDFs', campaignId, organizationId]
      });
      toastService.success('PDF erfolgreich gelöscht');
    },
    onError: (error) => {
      console.error('Fehler beim Löschen:', error);
      toastService.error('Fehler beim Löschen des PDFs');
    },
  });
}
```

#### 1.2 MonitoringContext erstellen

Datei: `src/app/dashboard/analytics/monitoring/[campaignId]/context/MonitoringContext.tsx`

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { useMonitoringData } from '@/lib/hooks/useMonitoringData';
import { useAnalysisPDFs } from '@/lib/hooks/useAnalysisPDFs';
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
import { usePDFDeleteMutation } from '@/lib/hooks/usePDFDeleteMutation';
import { PRCampaign } from '@/types/pr';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping, MonitoringSuggestion } from '@/types/monitoring';

interface MonitoringContextValue {
  // Data
  campaign: PRCampaign | null;
  sends: EmailCampaignSend[];
  clippings: MediaClipping[];
  suggestions: MonitoringSuggestion[];

  // Loading
  isLoadingData: boolean;
  isLoadingPDFs: boolean;

  // Error
  error: Error | null;

  // Actions
  reloadData: () => Promise<void>;

  // PDF Export
  handlePDFExport: () => Promise<void>;
  isPDFGenerating: boolean;

  // Analysis PDFs
  analysisPDFs: any[];
  analysenFolderLink: string | null;
  handleDeletePDF: (pdfId: string) => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  campaignId: string;
  organizationId: string;
  activeTab: string;
}

export function MonitoringProvider({ children, campaignId, organizationId, activeTab }: Props) {
  // Data Loading
  const { data, isLoading: isLoadingData, error, refetch } = useMonitoringData(
    campaignId,
    organizationId
  );

  // PDF-Liste (nur wenn Analytics Tab aktiv)
  const { data: analysisPDFs = [], isLoading: isLoadingPDFs } = useAnalysisPDFs(
    campaignId,
    organizationId,
    activeTab === 'dashboard'
  );

  // PDF-Export
  const pdfGenerator = usePDFReportGenerator();

  // PDF-Delete
  const pdfDelete = usePDFDeleteMutation(campaignId, organizationId);

  const handlePDFExport = async () => {
    if (!data?.campaign) return;

    await pdfGenerator.generate({
      campaign: data.campaign,
      sends: data.sends,
      clippings: data.clippings,
      organizationId,
    });
  };

  const handleDeletePDF = async (pdfPath: string) => {
    await pdfDelete.mutateAsync(pdfPath);
  };

  const analysenFolderLink = `analysen/${organizationId}/${campaignId}/`;

  const value: MonitoringContextValue = {
    campaign: data?.campaign || null,
    sends: data?.sends || [],
    clippings: data?.clippings || [],
    suggestions: data?.suggestions || [],
    isLoadingData,
    isLoadingPDFs,
    error,
    reloadData: refetch,
    handlePDFExport,
    isPDFGenerating: pdfGenerator.isGenerating,
    analysisPDFs,
    analysenFolderLink,
    handleDeletePDF,
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

#### 1.3 page.tsx anpassen

**Entfernen:**
```typescript
// Altes Pattern
const [loading, setLoading] = useState(true);
const [campaign, setCampaign] = useState<PRCampaign | null>(null);
const [sends, setSends] = useState<EmailCampaignSend[]>([]);
// ... weitere States

useEffect(() => {
  loadData();
}, [campaignId, organizationId]);

const loadData = async () => { /* ... */ };
```

**Hinzufügen:**
```typescript
import { MonitoringProvider } from './context/MonitoringContext';

export default function MonitoringDetailPage() {
  // Minimal State
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <MonitoringProvider
      campaignId={campaignId}
      organizationId={organizationId}
      activeTab={activeTab}
    >
      <MonitoringLayout activeTab={activeTab} onTabChange={setActiveTab} />
    </MonitoringProvider>
  );
}
```

#### Checkliste Phase 1

- [ ] useMonitoringData.ts erstellt
- [ ] useAnalysisPDFs.ts erstellt
- [ ] usePDFDeleteMutation.ts erstellt
- [ ] MonitoringContext.tsx erstellt
- [ ] page.tsx auf Context umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration & MonitoringContext

- useMonitoringData Hook erstellt (campaign, sends, clippings, suggestions)
- useAnalysisPDFs Hook erstellt (PDF-Liste mit conditional loading)
- usePDFDeleteMutation Hook erstellt (Delete mit Toast)
- MonitoringContext erstellt (Provider + useMonitoring Hook)
- page.tsx auf Context umgestellt
- Props-Drilling eliminiert

LOC: 463 → ~350 Zeilen (-24%)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Dauer:** 2-3 Stunden

**Ziel:** Shared Components extrahieren

#### 2.1 MonitoringHeader.tsx

Datei: `src/app/dashboard/analytics/monitoring/[campaignId]/components/MonitoringHeader.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';
import { useRouter } from 'next/navigation';

export function MonitoringHeader() {
  const router = useRouter();
  const { campaign, handlePDFExport, isPDFGenerating } = useMonitoring();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          plain
          onClick={() => router.push('/dashboard/analytics/monitoring')}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück
        </Button>
        <Heading>{campaign?.title || 'Monitoring'}</Heading>
      </div>

      <Button
        onClick={handlePDFExport}
        disabled={isPDFGenerating}
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        {isPDFGenerating ? 'Generiere...' : 'PDF-Report'}
      </Button>
    </div>
  );
}
```

#### 2.2 TabNavigation.tsx

Datei: `src/app/dashboard/analytics/monitoring/[campaignId]/components/TabNavigation.tsx`

```typescript
import { useRouter, useSearchParams } from 'next/navigation';

type TabId = 'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Analytics', icon: ChartBarIcon },
  { id: 'performance', label: 'E-Mail Performance', icon: EnvelopeIcon },
  { id: 'recipients', label: 'Empfänger', icon: UsersIcon },
  { id: 'clippings', label: 'Clipping-Archiv', icon: NewspaperIcon },
  { id: 'suggestions', label: 'Auto-Funde', icon: SparklesIcon },
];

interface Props {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onChange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tabId: TabId) => {
    onChange(tabId);
    // Update URL
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-8">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

#### 2.3 LoadingState.tsx & ErrorState.tsx

**LoadingState.tsx:**
```typescript
import { Text } from '@/components/ui/text';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Text>Lade Monitoring-Daten...</Text>
    </div>
  );
}
```

**ErrorState.tsx:**
```typescript
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface Props {
  error: Error;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <ExclamationCircleIcon className="h-12 w-12 text-red-500" />
      <Text className="text-red-700">Fehler beim Laden der Daten</Text>
      <Text className="text-sm text-gray-500">{error.message}</Text>
      <Button onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
```

#### 2.4 page.tsx vereinfachen

**Neuer Orchestrator:**
```typescript
import { MonitoringProvider, useMonitoring } from './context/MonitoringContext';
import { MonitoringHeader } from './components/MonitoringHeader';
import { TabNavigation } from './components/TabNavigation';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';

function MonitoringContent() {
  const {
    isLoadingData,
    error,
    reloadData,
    campaign,
    sends,
    clippings,
    suggestions
  } = useMonitoring();

  const [activeTab, setActiveTab] = useState('dashboard');

  if (isLoadingData) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reloadData} />;

  return (
    <div className="space-y-6">
      <MonitoringHeader />
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'dashboard' && (
        <MonitoringDashboard
          campaign={campaign}
          sends={sends}
          clippings={clippings}
        />
      )}
      {/* ... andere Tabs */}
    </div>
  );
}

export default function MonitoringDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();

  return (
    <MonitoringProvider
      campaignId={params.campaignId as string}
      organizationId={currentOrganization?.id}
      activeTab={activeTab}
    >
      <MonitoringContent />
    </MonitoringProvider>
  );
}
```

#### Checkliste Phase 2

- [ ] MonitoringHeader.tsx erstellt
- [ ] TabNavigation.tsx erstellt
- [ ] LoadingState.tsx erstellt
- [ ] ErrorState.tsx erstellt
- [ ] page.tsx vereinfacht (schlanker Orchestrator)
- [ ] Inline-Komponenten entfernt
- [ ] Backward Compatibility sichergestellt

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Shared Components extrahiert

- MonitoringHeader (Zurück-Button, Titel, PDF-Button)
- TabNavigation (5 Tabs mit URL-Routing)
- LoadingState (Zentrale Loading UI)
- ErrorState (Zentrale Error UI mit Retry)
- page.tsx vereinfacht → schlanker Orchestrator

LOC: ~350 → ~280 Zeilen (-20%)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Dauer:** 1 Stunde

**Ziel:** Performance optimieren

#### 3.1 useCallback für Handler

```typescript
const handleTabChange = useCallback((tab: string) => {
  setActiveTab(tab);
  // URL Update
}, []);
```

#### 3.2 React.memo für Komponenten

```typescript
export const MonitoringHeader = React.memo(function MonitoringHeader() {
  // ...
});

export const TabNavigation = React.memo(function TabNavigation({ activeTab, onChange }: Props) {
  // ...
});
```

#### Checkliste Phase 3

- [ ] useCallback für Tab-Handler
- [ ] React.memo für MonitoringHeader
- [ ] React.memo für TabNavigation
- [ ] React.memo für LoadingState
- [ ] React.memo für ErrorState

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung

- useCallback für Tab-Handler
- React.memo für alle Shared Components
- Verhindert unnötige Re-Renders

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Dauer:** Autonom (Agent)

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

#### Agent aufrufen

**Schritt 1: Agent starten**
```
Prompt: "Starte refactoring-test Agent für Monitoring Detail Foundation"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle comprehensive Test Suite für Monitoring Detail Foundation nach Phase 3.

Context:
- Modul: Monitoring Detail Foundation
- Hooks:
  - src/lib/hooks/useMonitoringData.ts
  - src/lib/hooks/useAnalysisPDFs.ts
  - src/lib/hooks/usePDFDeleteMutation.ts
- Context: src/app/dashboard/analytics/monitoring/[campaignId]/context/MonitoringContext.tsx
- Components:
  - MonitoringHeader.tsx
  - TabNavigation.tsx
  - LoadingState.tsx
  - ErrorState.tsx

Requirements:
- Hook Tests (>80% Coverage)
  - useMonitoringData: Parallel loading, error handling
  - useAnalysisPDFs: Conditional loading, sorting
  - usePDFDeleteMutation: Success/Error mit Toast
- Context Tests
  - MonitoringProvider: Value propagation
  - useMonitoring: Hook usage
- Component Tests
  - MonitoringHeader: PDF-Export Button
  - TabNavigation: Tab switching, URL routing
  - LoadingState: Display
  - ErrorState: Retry button
- Integration Tests
  - Full Page Load → Display

Deliverable:
- Test-Suite vollständig implementiert
- Coverage Report (npm run test:coverage)
- Test-Dokumentation
```

#### Checkliste Phase 4

- [ ] refactoring-test Agent aufgerufen
- [ ] Hook Tests vollständig
- [ ] Context Tests vollständig
- [ ] Component Tests vollständig
- [ ] Integration Tests vollständig
- [ ] Alle Tests bestehen
- [ ] Coverage >80%

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (via refactoring-test Agent)"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Dauer:** Autonom (Agent)

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

#### Agent aufrufen

**Schritt 1: Agent starten**
```
Prompt: "Starte refactoring-dokumentation Agent für Monitoring Detail Foundation"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle umfassende Dokumentation für Monitoring Detail Foundation nach Phase 4.

Context:
- Modul: Monitoring Detail Foundation (Phase 1.2)
- Code-Reduktion: 463 → ~250 Zeilen (-46%)
- Neue Architektur: MonitoringContext + React Query
- Hooks: useMonitoringData, useAnalysisPDFs, usePDFDeleteMutation
- Components: MonitoringHeader, TabNavigation, LoadingState, ErrorState
- Tests: Comprehensive Suite mit >80% Coverage

Requirements:
- README.md (Hauptdokumentation 400+ Zeilen)
  - Architektur-Übersicht
  - MonitoringContext API
  - Komponenten-Hierarchie
  - Migration Guide (Alt → Neu)
- API-Dokumentation (Hooks 500+ Zeilen)
  - useMonitoringData
  - useAnalysisPDFs
  - usePDFDeleteMutation
- Komponenten-Dokumentation (400+ Zeilen)
  - MonitoringHeader
  - TabNavigation
  - LoadingState / ErrorState
- ADR-Dokumentation (300+ Zeilen)
  - ADR-001: MonitoringContext vs Props-Drilling
  - ADR-002: React Query Integration
  - ADR-003: Conditional PDF Loading

Deliverable:
- Vollständige Dokumentation (1.600+ Zeilen)
- Funktionierende Code-Beispiele
```

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] README.md vollständig (>400 Zeilen)
- [ ] API-Docs vollständig (>500 Zeilen)
- [ ] Component-Docs vollständig (>400 Zeilen)
- [ ] ADR-Docs vollständig (>300 Zeilen)
- [ ] Code-Beispiele funktionieren

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation (via refactoring-dokumentation Agent)"
```

---

### Phase 6: Production-Ready Code Quality

**Dauer:** 1 Stunde

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit
```

#### 6.2 ESLint Check

```bash
npx eslint src/app/dashboard/analytics/monitoring/[campaignId] --fix
npx eslint src/lib/hooks/useMonitoring*.ts --fix
```

#### 6.3 Console Cleanup

```bash
grep -r "console\." src/app/dashboard/analytics/monitoring/[campaignId]
```

**Erlaubt:**
```typescript
console.error('Failed to load data:', error); // In catch-blocks OK
```

#### 6.4 Design System Compliance

```
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary Actions
✓ Focus-Rings
```

#### 6.5 Final Build Test

```bash
npm run build
npm run start
```

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: App funktioniert

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Dauer:** Autonom (Agent)

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** durchgeführt!

**PROAKTIV:** Agent wird AUTOMATISCH vor Phase 7 aufgerufen!

#### Agent-Workflow

**Der Agent überprüft:**

**Phase 0/0.5 Checks:**
- [ ] Feature-Branch existiert
- [ ] Backup vorhanden
- [ ] Toast-Error-Handling vollständig

**Phase 1 Checks:**
- [ ] useMonitoringData.ts existiert
- [ ] useAnalysisPDFs.ts existiert
- [ ] usePDFDeleteMutation.ts existiert
- [ ] MonitoringContext.tsx existiert
- [ ] page.tsx verwendet Context (KEINE alten loadData!)

**Phase 2 Checks:**
- [ ] MonitoringHeader.tsx existiert
- [ ] TabNavigation.tsx existiert
- [ ] LoadingState.tsx existiert
- [ ] ErrorState.tsx existiert
- [ ] page.tsx ist schlanker Orchestrator (< 300 Zeilen)

**Phase 3 Checks:**
- [ ] useCallback für Handler
- [ ] React.memo für Komponenten

**Phase 4 Checks:**
- [ ] Tests existieren
- [ ] Alle Tests bestehen
- [ ] Coverage >80%

**Phase 5 Checks:**
- [ ] Dokumentation existiert (1.600+ Zeilen)
- [ ] Keine TODOs/Platzhalter

**Phase 6 Checks:**
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build erfolgreich

**Integration Checks:**
- [ ] Alte loadData entfernt
- [ ] Imports aktualisiert
- [ ] Keine Props-Drilling mehr

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] Quality Report erhalten
- [ ] ALLE Checks bestanden (GO)
- [ ] Falls NO-GO: Probleme behoben

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden"
```

---

### Phase 7: Merge zu Main

**Dauer:** 30 Minuten

**⚠️ WICHTIG:** Nur nach erfolgreichem Phase 6.5 Quality Gate Check!

#### Workflow

```bash
# 1. Push Feature-Branch
git push origin feature/monitoring-detail-foundation

# 2. Zu Main wechseln und mergen
git checkout main
git merge feature/monitoring-detail-foundation --no-edit

# 3. Main pushen
git push origin main

# 4. Tests auf Main
npm test -- monitoring
```

#### Checkliste Merge

- [ ] ⭐ Phase 6.5 Quality Gate Check bestanden (GO)
- [ ] Alle 8 Phasen abgeschlossen
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

---

## 📊 Metriken & Erfolg

### Code-Reduktion

| Datei | Vorher | Nachher | Reduktion |
|-------|--------|---------|-----------|
| page.tsx | 463 Zeilen | ~250 Zeilen | -46% |
| **Neu erstellt** |  |  |  |
| MonitoringContext.tsx | - | ~150 Zeilen | NEW |
| useMonitoringData.ts | - | ~80 Zeilen | NEW |
| useAnalysisPDFs.ts | - | ~60 Zeilen | NEW |
| usePDFDeleteMutation.ts | - | ~40 Zeilen | NEW |
| MonitoringHeader.tsx | - | ~40 Zeilen | NEW |
| TabNavigation.tsx | - | ~80 Zeilen | NEW |
| LoadingState.tsx | - | ~15 Zeilen | NEW |
| ErrorState.tsx | - | ~25 Zeilen | NEW |

**Netto LOC:** 463 → 740 Zeilen (+277 Zeilen für bessere Architektur)

**Aber:** page.tsx -46% = Hauptziel erreicht! ✅

### Architektur-Verbesserungen

✅ **Props-Drilling eliminiert**
- Vorher: 5 Tabs × 4 Props = 20 Prop-Übergaben
- Nachher: 0 Props (Context)

✅ **State Management verbessert**
- Vorher: useEffect + useState (15 Zeilen pro Load)
- Nachher: React Query (automatisch)

✅ **Code-Duplikation entfernt**
- loadData() nur einmal (statt 5x)
- Loading/Error States zentral (statt 5x)

✅ **Wartbarkeit erhöht**
- Komponenten < 150 Zeilen
- Separation of Concerns
- Testbarkeit

### Tab-Module profitieren

**Phase 2.1-2.5 (Tab-Refactorings) können jetzt:**
- ✅ Context nutzen (kein Props-Drilling)
- ✅ Daten zentral laden
- ✅ Shared Actions nutzen (reloadData, PDF-Export)
- ✅ Unabhängig entwickelt werden

---

## 🔗 Referenzen

### Projekt-Spezifisch
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Master Checklist:** `docs/planning/monitoring/monitoring-refactoring-master-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`

### Externe Ressourcen
- [React Query Docs](https://tanstack.com/query/latest)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)

---

## 🚀 Nächste Schritte

**Nach Merge zu Main:**

1. **Phase 2.1:** Analytics Tab Refactoring
2. **Phase 2.2:** Performance Tab Refactoring
3. **Phase 2.3:** Recipients Tab Refactoring
4. **Phase 2.4:** Clippings Tab Refactoring
5. **Phase 2.5:** Suggestions Tab Refactoring

**Alle Tab-Refactorings profitieren von:**
- ✅ MonitoringContext (Props-Drilling eliminiert)
- ✅ React Query Hooks (Data Loading zentral)
- ✅ Shared Components (LoadingState, ErrorState)

---

**Version:** 1.0
**Erstellt:** 17. November 2025
**Status:** 📋 READY FOR IMPLEMENTATION

**Changelog:**
- 2025-11-17: Initial Plan erstellt basierend auf Template v2.1

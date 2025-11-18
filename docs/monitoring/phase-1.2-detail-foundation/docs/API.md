# API-Dokumentation: Monitoring Detail Foundation

> **Modul**: Monitoring Detail Foundation
> **Version**: 1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 18. November 2025

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [React Query Hooks](#react-query-hooks)
   - [useCampaignMonitoringData](#usecampaignmonitoringdata)
   - [useAnalysisPDFs](#useanalysispdfs)
   - [usePDFDeleteMutation](#usepdfdeletemutation)
3. [MonitoringContext API](#monitoringcontext-api)
   - [MonitoringProvider](#monitoringprovider)
   - [useMonitoring Hook](#usemonitoring-hook)
4. [Code-Beispiele](#code-beispiele)
5. [Error Handling](#error-handling)
6. [Performance-Tipps](#performance-tipps)

---

## Übersicht

Die Monitoring Detail Foundation bietet 3 React Query Hooks und einen Context für zentrales State Management:

**React Query Hooks:**
- `useCampaignMonitoringData` - Lädt Campaign, Sends, Clippings, Suggestions
- `useAnalysisPDFs` - Lädt PDF-Liste (conditional)
- `usePDFDeleteMutation` - Löscht PDFs mit Toast

**Context:**
- `MonitoringProvider` - Provider-Komponente
- `useMonitoring` - Consumer-Hook

---

## React Query Hooks

### useCampaignMonitoringData

Lädt alle Monitoring-Daten für eine spezifische Kampagne parallel.

**Datei:** `src/lib/hooks/useCampaignMonitoringData.ts`

#### Signatur

```typescript
function useCampaignMonitoringData(
  campaignId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<{
  campaign: PRCampaign;
  sends: EmailCampaignSend[];
  clippings: MediaClipping[];
  suggestions: MonitoringSuggestion[];
}>
```

#### Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `campaignId` | `string \| undefined` | Ja | Die ID der Kampagne |
| `organizationId` | `string \| undefined` | Ja | Die ID der Organisation |

#### Return Value

**UseQueryResult Object:**

```typescript
{
  // Data
  data: {
    campaign: PRCampaign;           // Die PR-Kampagne
    sends: EmailCampaignSend[];     // Alle E-Mail-Versendungen
    clippings: MediaClipping[];     // Alle Clippings
    suggestions: MonitoringSuggestion[]; // Alle Auto-Funde
  } | undefined;

  // Status
  isLoading: boolean;    // true während initialer Datenabruf
  isFetching: boolean;   // true während Refetch (auch Background)
  isError: boolean;      // true bei Fehler
  error: Error | null;   // Fehler-Objekt

  // Actions
  refetch: () => Promise<void>; // Lädt Daten neu
}
```

#### Internes Verhalten

**1. Parallel Loading**
```typescript
const [campaign, sends, clippings, suggestions] = await Promise.all([
  prService.getById(campaignId),
  emailCampaignService.getSends(campaignId, { organizationId }),
  clippingService.getByCampaignId(campaignId, { organizationId }),
  monitoringSuggestionService.getByCampaignId(campaignId, organizationId),
]);
```

**Performance:** Alle 4 API-Calls parallel statt sequentiell!

**2. Cache-Strategie**
```typescript
{
  queryKey: ['campaignMonitoring', campaignId, organizationId],
  enabled: !!campaignId && !!organizationId,
  staleTime: 5 * 60 * 1000,  // 5 Minuten
  gcTime: 10 * 60 * 1000,    // 10 Minuten
}
```

**3. Error Handling**
```typescript
if (!campaignId || !organizationId) {
  throw new Error('CampaignId und OrganizationId erforderlich');
}
```

#### Code-Beispiele

**Basis-Usage:**

```typescript
import { useCampaignMonitoringData } from '@/lib/hooks/useCampaignMonitoringData';

function MyComponent() {
  const campaignId = 'campaign-123';
  const organizationId = 'org-456';

  const {
    data,
    isLoading,
    error,
    refetch
  } = useCampaignMonitoringData(campaignId, organizationId);

  if (isLoading) return <div>Lädt...</div>;
  if (error) return <div>Fehler: {error.message}</div>;

  return (
    <div>
      <h1>{data.campaign.title}</h1>
      <p>Versendungen: {data.sends.length}</p>
      <p>Clippings: {data.clippings.length}</p>
      <p>Auto-Funde: {data.suggestions.length}</p>
      <button onClick={() => refetch()}>Aktualisieren</button>
    </div>
  );
}
```

**Mit Loading/Error States:**

```typescript
import { useCampaignMonitoringData } from '@/lib/hooks/useCampaignMonitoringData';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

function MyComponent({ campaignId, organizationId }) {
  const query = useCampaignMonitoringData(campaignId, organizationId);

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (!query.data) return null;

  const { campaign, sends, clippings, suggestions } = query.data;

  return (
    <div>
      <h1>{campaign.title}</h1>
      {/* Content */}
    </div>
  );
}
```

**Mit Auto-Refetch:**

```typescript
function MyComponent() {
  const { data, isFetching, refetch } = useCampaignMonitoringData(
    campaignId,
    organizationId
  );

  useEffect(() => {
    // Auto-Refetch alle 30 Sekunden
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <div>
      {isFetching && <span>Aktualisiere...</span>}
      {/* Content */}
    </div>
  );
}
```

---

### useAnalysisPDFs

Lädt die Liste der Analyse-PDFs für eine Kampagne aus dem Analysen-Ordner.

**Datei:** `src/lib/hooks/useAnalysisPDFs.ts`

#### Signatur

```typescript
function useAnalysisPDFs(
  campaignId: string | undefined,
  organizationId: string | undefined,
  projectId: string | undefined,
  enabled?: boolean
): UseQueryResult<{
  pdfs: MediaAsset[];
  folderLink: string | null;
}>
```

#### Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `campaignId` | `string \| undefined` | Ja | Die ID der Kampagne |
| `organizationId` | `string \| undefined` | Ja | Die ID der Organisation |
| `projectId` | `string \| undefined` | Ja | Die ID des Projekts |
| `enabled` | `boolean` | Nein | Ob Query aktiv sein soll (default: `true`) |

#### Return Value

```typescript
{
  data: {
    pdfs: MediaAsset[];        // Liste aller PDFs
    folderLink: string | null; // Link zum Analysen-Ordner
  } | undefined;

  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**MediaAsset Struktur:**
```typescript
interface MediaAsset {
  id: string;
  fileName: string;
  downloadUrl: string;
  fileType: string;
  createdAt: Timestamp;
  // ... weitere Felder
}
```

#### Internes Verhalten

**1. Folder-Struktur laden**
```typescript
const folderStructure = await projectService.getProjectFolderStructure(
  projectId,
  { organizationId }
);
```

**2. Analysen-Ordner finden**
```typescript
const analysenFolder = folderStructure.subfolders.find(
  (f: any) => f.name === 'Analysen'
);
```

**3. Media Assets laden**
```typescript
const assets = await mediaService.getMediaAssets(
  organizationId,
  analysenFolder.id
);
```

**4. PDFs filtern**
```typescript
const campaignPDFs = assets.filter(
  (asset) => asset.fileType === 'application/pdf'
);
```

**5. Conditional Loading**
```typescript
{
  enabled: enabled && !!campaignId && !!organizationId && !!projectId,
  staleTime: 2 * 60 * 1000, // 2 Minuten
  gcTime: 5 * 60 * 1000,    // 5 Minuten
}
```

#### Code-Beispiele

**Basis-Usage:**

```typescript
import { useAnalysisPDFs } from '@/lib/hooks/useAnalysisPDFs';

function MyComponent() {
  const campaignId = 'campaign-123';
  const organizationId = 'org-456';
  const projectId = 'project-789';

  const { data, isLoading } = useAnalysisPDFs(
    campaignId,
    organizationId,
    projectId
  );

  if (isLoading) return <div>Lädt PDFs...</div>;

  return (
    <div>
      <h2>Analyse-PDFs ({data?.pdfs.length || 0})</h2>
      {data?.folderLink && (
        <a href={data.folderLink}>Zum Analysen-Ordner</a>
      )}
      <ul>
        {data?.pdfs.map((pdf) => (
          <li key={pdf.id}>
            <a href={pdf.downloadUrl} target="_blank">
              {pdf.fileName}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Mit Conditional Loading (Performance-Optimierung):**

```typescript
function MyComponent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Lädt nur wenn Analytics Tab aktiv
  const { data, isLoading } = useAnalysisPDFs(
    campaignId,
    organizationId,
    projectId,
    activeTab === 'dashboard' // enabled flag
  );

  return (
    <div>
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'dashboard' && (
        <div>
          {isLoading ? (
            <div>Lädt PDFs...</div>
          ) : (
            <PDFList pdfs={data?.pdfs || []} />
          )}
        </div>
      )}
    </div>
  );
}
```

**Mit Error Handling:**

```typescript
function MyComponent() {
  const { data, isLoading, error } = useAnalysisPDFs(
    campaignId,
    organizationId,
    projectId
  );

  if (isLoading) return <LoadingState />;

  if (error) {
    console.error('Fehler beim Laden der PDFs:', error);
    // Zeige trotzdem UI (leere Liste)
    return (
      <div>
        <p>Keine PDFs vorhanden</p>
      </div>
    );
  }

  return (
    <div>
      {data?.pdfs.length === 0 ? (
        <p>Noch keine Reports generiert</p>
      ) : (
        <PDFList pdfs={data.pdfs} />
      )}
    </div>
  );
}
```

---

### usePDFDeleteMutation

Mutation zum Löschen eines PDF-Reports mit automatischem Toast-Feedback.

**Datei:** `src/lib/hooks/usePDFDeleteMutation.ts`

#### Signatur

```typescript
function usePDFDeleteMutation(
  campaignId: string | undefined,
  organizationId: string | undefined,
  projectId: string | undefined
): UseMutationResult<void, Error, MediaAsset>
```

#### Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `campaignId` | `string \| undefined` | Ja | Die ID der Kampagne (für Cache-Invalidierung) |
| `organizationId` | `string \| undefined` | Ja | Die ID der Organisation (für Cache-Invalidierung) |
| `projectId` | `string \| undefined` | Ja | Die ID des Projekts (für Cache-Invalidierung) |

#### Return Value

```typescript
{
  mutate: (pdf: MediaAsset) => void;
  mutateAsync: (pdf: MediaAsset) => Promise<void>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
}
```

#### Internes Verhalten

**1. Delete Mutation**
```typescript
mutationFn: async (pdf: MediaAsset) => {
  await mediaService.deleteMediaAsset(pdf);
}
```

**2. Success Handler**
```typescript
onSuccess: () => {
  // Cache invalidieren (löst auto-reload aus)
  queryClient.invalidateQueries({
    queryKey: ['analysisPDFs', campaignId, organizationId, projectId]
  });

  // Success Toast
  toastService.success('PDF erfolgreich gelöscht');
}
```

**3. Error Handler**
```typescript
onError: (error) => {
  console.error('Fehler beim Löschen des PDFs:', error);
  toastService.error('Fehler beim Löschen des PDFs');
}
```

#### Code-Beispiele

**Basis-Usage:**

```typescript
import { usePDFDeleteMutation } from '@/lib/hooks/usePDFDeleteMutation';

function MyComponent() {
  const mutation = usePDFDeleteMutation(
    campaignId,
    organizationId,
    projectId
  );

  const handleDelete = (pdf: MediaAsset) => {
    // Confirm Dialog
    if (confirm(`PDF "${pdf.fileName}" wirklich löschen?`)) {
      mutation.mutate(pdf);
    }
  };

  return (
    <div>
      {pdfs.map((pdf) => (
        <div key={pdf.id}>
          <span>{pdf.fileName}</span>
          <button
            onClick={() => handleDelete(pdf)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Löscht...' : 'Löschen'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Mit Dialog-Integration:**

```typescript
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { usePDFDeleteMutation } from '@/lib/hooks/usePDFDeleteMutation';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<MediaAsset | null>(null);
  const mutation = usePDFDeleteMutation(campaignId, organizationId, projectId);

  const handleDelete = (pdf: MediaAsset) => {
    setPdfToDelete(pdf);
    setShowDialog(true);
  };

  const confirmDelete = async () => {
    if (!pdfToDelete) return;

    try {
      await mutation.mutateAsync(pdfToDelete);
      setShowDialog(false);
      setPdfToDelete(null);
    } catch (error) {
      // Error wird automatisch via Toast angezeigt
      console.error(error);
    }
  };

  return (
    <div>
      {/* PDF-Liste */}
      <button onClick={() => handleDelete(pdf)}>Löschen</button>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle>PDF löschen</DialogTitle>
        <DialogBody>
          Möchten Sie "{pdfToDelete?.fileName}" wirklich löschen?
        </DialogBody>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Abbrechen</Button>
          <Button
            onClick={confirmDelete}
            color="red"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Löscht...' : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
```

**Mit Optimistic Update:**

```typescript
function MyComponent() {
  const queryClient = useQueryClient();
  const mutation = usePDFDeleteMutation(campaignId, organizationId, projectId);

  const handleDelete = async (pdf: MediaAsset) => {
    // Optimistic Update: Sofort aus Liste entfernen
    queryClient.setQueryData(
      ['analysisPDFs', campaignId, organizationId, projectId],
      (old: any) => ({
        ...old,
        pdfs: old.pdfs.filter((p: MediaAsset) => p.id !== pdf.id),
      })
    );

    try {
      await mutation.mutateAsync(pdf);
    } catch (error) {
      // Bei Fehler: Refetch (stellt alten Zustand wieder her)
      queryClient.invalidateQueries({
        queryKey: ['analysisPDFs', campaignId, organizationId, projectId]
      });
    }
  };

  // ...
}
```

---

## MonitoringContext API

### MonitoringProvider

Provider-Komponente für das Monitoring Detail Modul.

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/context/MonitoringContext.tsx`

#### Signatur

```typescript
function MonitoringProvider({
  children,
  campaignId,
  organizationId,
  activeTab
}: {
  children: ReactNode;
  campaignId: string;
  organizationId: string;
  activeTab: string;
}): JSX.Element
```

#### Props

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `children` | `ReactNode` | Ja | Child-Komponenten |
| `campaignId` | `string` | Ja | Die ID der Kampagne |
| `organizationId` | `string` | Ja | Die ID der Organisation |
| `activeTab` | `string` | Ja | Aktueller Tab (für conditional PDF loading) |

#### Context Value

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
  analysisPDFs: MediaAsset[];
  analysenFolderLink: string | null;
  handleDeletePDF: (pdf: MediaAsset) => Promise<void>;
}
```

#### Code-Beispiele

**Basis-Setup:**

```typescript
import { MonitoringProvider } from './context/MonitoringContext';

export default function MonitoringDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();

  const campaignId = params.campaignId as string;
  const organizationId = currentOrganization?.id || '';
  const activeTab = searchParams.get('tab') || 'dashboard';

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

**Mit Error Boundary:**

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import { MonitoringProvider } from './context/MonitoringContext';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div>
      <h2>Etwas ist schief gelaufen</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Erneut versuchen</button>
    </div>
  );
}

export default function MonitoringDetailPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MonitoringProvider
        campaignId={campaignId}
        organizationId={organizationId}
        activeTab={activeTab}
      >
        <MonitoringContent />
      </MonitoringProvider>
    </ErrorBoundary>
  );
}
```

---

### useMonitoring Hook

Consumer-Hook für den MonitoringContext.

#### Signatur

```typescript
function useMonitoring(): MonitoringContextValue
```

#### Return Value

Siehe [MonitoringContextValue](#context-value) oben.

#### Error Handling

**Wirft Error wenn außerhalb von Provider verwendet:**
```typescript
if (!context) {
  throw new Error('useMonitoring must be used within MonitoringProvider');
}
```

#### Code-Beispiele

**Alle Werte nutzen:**

```typescript
import { useMonitoring } from '../context/MonitoringContext';

function MyComponent() {
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
    analysisPDFs,
    analysenFolderLink,
    handleDeletePDF,
  } = useMonitoring();

  // Nutze alle Werte...
}
```

**Nur benötigte Werte extrahieren:**

```typescript
function MyComponent() {
  // Nur campaign und sends
  const { campaign, sends } = useMonitoring();

  return (
    <div>
      <h1>{campaign?.title}</h1>
      <p>Versendungen: {sends.length}</p>
    </div>
  );
}
```

**Mit Loading/Error States:**

```typescript
import { useMonitoring } from '../context/MonitoringContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

function MyComponent() {
  const { campaign, isLoadingData, error, reloadData } = useMonitoring();

  if (isLoadingData) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reloadData} />;
  if (!campaign) return <div>Kampagne nicht gefunden</div>;

  return <div>{campaign.title}</div>;
}
```

---

## Code-Beispiele

### Vollständige Integration

**Komplettes Setup mit allen Features:**

```typescript
// page.tsx
import { useParams, useSearchParams } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { MonitoringProvider, useMonitoring } from './context/MonitoringContext';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { MonitoringHeader } from './components/MonitoringHeader';
import { PDFExportButton } from './components/PDFExportButton';
import { TabNavigation } from './components/TabNavigation';

function MonitoringContent() {
  const {
    campaign,
    sends,
    clippings,
    suggestions,
    isLoadingData,
    error,
    reloadData,
    analysisPDFs,
    analysenFolderLink,
    handleDeletePDF,
  } = useMonitoring();

  const [activeTab, setActiveTab] = useState('dashboard');

  // Loading State
  if (isLoadingData) return <LoadingState />;

  // Error State
  if (error) return <ErrorState error={error} onRetry={reloadData} />;

  // Not Found
  if (!campaign) {
    return <div>Kampagne nicht gefunden</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <MonitoringHeader />
        <PDFExportButton />
      </div>

      {/* Tabs */}
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div>
          <MonitoringDashboard
            clippings={clippings}
            sends={sends}
          />

          {/* PDF-Liste */}
          {analysisPDFs.length > 0 && (
            <PDFList
              pdfs={analysisPDFs}
              folderLink={analysenFolderLink}
              onDelete={handleDeletePDF}
            />
          )}
        </div>
      )}
      {/* Weitere Tabs... */}
    </div>
  );
}

export default function MonitoringDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();

  return (
    <MonitoringProvider
      campaignId={params.campaignId as string}
      organizationId={currentOrganization?.id || ''}
      activeTab={searchParams.get('tab') || 'dashboard'}
    >
      <MonitoringContent />
    </MonitoringProvider>
  );
}
```

---

## Error Handling

### Query-Level Errors

**useCampaignMonitoringData:**
```typescript
const { data, error, isError } = useCampaignMonitoringData(campaignId, organizationId);

if (isError) {
  // Error wird automatisch geloggt
  // Zeige Error UI
  return <ErrorState error={error} onRetry={refetch} />;
}
```

**useAnalysisPDFs:**
```typescript
const { data, error } = useAnalysisPDFs(campaignId, organizationId, projectId);

// Fehler werden abgefangen und leere Liste zurückgegeben
// Kein Error-Throw!
if (error) {
  console.error('PDF-Laden fehlgeschlagen:', error);
  // data.pdfs ist []
}
```

### Mutation-Level Errors

**usePDFDeleteMutation:**
```typescript
const mutation = usePDFDeleteMutation(campaignId, organizationId, projectId);

// Fehler werden automatisch via Toast angezeigt
mutation.mutate(pdf);

// Oder manuell:
try {
  await mutation.mutateAsync(pdf);
} catch (error) {
  // Error Toast wird automatisch gezeigt
  // Zusätzliche Fehlerbehandlung hier
}
```

---

## Performance-Tipps

### 1. Conditional Queries

Nutze `enabled` Flag für bedingte Queries:

```typescript
// Nur laden wenn Tab aktiv
const { data } = useAnalysisPDFs(
  campaignId,
  organizationId,
  projectId,
  activeTab === 'dashboard' // enabled
);
```

### 2. Query Keys optimieren

Nutze spezifische Query Keys:

```typescript
// ❌ Zu generisch
queryKey: ['monitoring']

// ✅ Spezifisch
queryKey: ['campaignMonitoring', campaignId, organizationId]
```

### 3. Cache-Strategie anpassen

```typescript
// Für häufig ändernde Daten
staleTime: 1 * 60 * 1000,  // 1 Minute

// Für selten ändernde Daten
staleTime: 10 * 60 * 1000, // 10 Minuten
```

### 4. Parallel Loading nutzen

```typescript
// ✅ Parallel (schnell)
const [campaign, sends, clippings] = await Promise.all([...]);

// ❌ Sequentiell (langsam)
const campaign = await prService.getById(campaignId);
const sends = await emailCampaignService.getSends(campaignId, ...);
// ...
```

---

**Letzte Aktualisierung:** 18. November 2025
**Version:** 1.0
**Siehe auch:** [README.md](../README.md) | [Komponenten-Dokumentation](./COMPONENTS.md)

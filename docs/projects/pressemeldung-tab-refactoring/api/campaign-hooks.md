# Campaign Hooks - Detaillierte Referenz

> **Modul**: Pressemeldung Tab - React Query Hooks
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-27
> **Datei**: `src/lib/hooks/useCampaignData.ts`

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [useProjectCampaigns](#useprojectcampaigns)
- [useProjectApprovals](#useprojectapprovals)
- [useProjectPressData](#useprojectpressdata)
- [useUpdateCampaign](#useupdatecampaign)
- [TypeScript-Typen](#typescript-typen)
- [React Query Integration](#react-query-integration)
- [Cache-Strategien](#cache-strategien)
- [Testing](#testing)
- [Performance-Optimierung](#performance-optimierung)
- [Migration von useState/useEffect](#migration-von-usestateuseeffect)
- [Troubleshooting](#troubleshooting)

---

## Übersicht

Die Campaign Hooks abstrahieren die Komplexität des Daten-Ladens aus Firebase und bieten ein deklaratives Interface basierend auf TanStack Query (React Query v5).

### Vorteile gegenüber useState/useEffect

| Feature | useState/useEffect | React Query Hooks |
|---------|-------------------|-------------------|
| **Automatisches Caching** | ❌ Manuell implementieren | ✅ Built-in |
| **Refetching bei Tab-Wechsel** | ❌ Manuell implementieren | ✅ Automatisch |
| **Loading States** | ⚠️ Manuell tracken | ✅ Automatisch |
| **Error Handling** | ⚠️ Manuell try/catch | ✅ Deklarativ |
| **Duplicate Requests** | ❌ Möglich | ✅ Dedupliziert |
| **Parallel Queries** | ⚠️ Promise.all manuell | ✅ Automatisch |
| **Optimistic Updates** | ❌ Komplex | ✅ Eingebaut |
| **Devtools** | ❌ Nicht vorhanden | ✅ React Query Devtools |

### Architektur-Diagramm

```
┌────────────────────────────────────────────────────────────┐
│  React Component                                           │
│  (ProjectPressemeldungenTab)                               │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          v
┌────────────────────────────────────────────────────────────┐
│  useProjectPressData (Combined Hook)                       │
│  - Vereinfachtes Interface                                 │
│  - Unified Loading State                                   │
└──────────────┬─────────────────────────┬───────────────────┘
               │                         │
               v                         v
┌──────────────────────────┐  ┌──────────────────────────┐
│  useProjectCampaigns     │  │  useProjectApprovals     │
│  - staleTime: 0          │  │  - staleTime: 2min       │
│  - gcTime: 5min          │  │  - enabled: !!projectId  │
└──────────────┬───────────┘  └──────────────┬───────────┘
               │                             │
               v                             v
┌──────────────────────────┐  ┌──────────────────────────┐
│  React Query Cache       │  │  React Query Cache       │
│  queryKey:               │  │  queryKey:               │
│  ['project-campaigns']   │  │  ['project-approvals']   │
└──────────────┬───────────┘  └──────────────┬───────────┘
               │                             │
               v                             v
┌──────────────────────────────────────────────────────────┐
│  Firebase Services                                       │
│  - prService.getCampaignsByProject()                     │
│  - projectService.getById()                              │
│  - approvalServiceExtended.getApprovalsByProject()       │
└──────────────────────────────────────────────────────────┘
```

---

## useProjectCampaigns

Lädt alle PR-Kampagnen für ein Projekt. Dieser Hook implementiert eine **kombinierte Loading-Strategie**, die sowohl den alten Ansatz (`linkedCampaigns` Array) als auch den neuen Ansatz (`projectId`-basiert) unterstützt.

### Import

```typescript
import { useProjectCampaigns } from '@/lib/hooks/useCampaignData';
```

### Signatur

```typescript
function useProjectCampaigns(
  projectId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<PRCampaign[], Error>
```

### Parameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `projectId` | `string \| undefined` | Ja | ID des Projekts |
| `organizationId` | `string \| undefined` | Ja | ID der Organisation (für Multi-Tenancy) |

### Return Value

```typescript
interface UseQueryResult<PRCampaign[], Error> {
  // Daten
  data: PRCampaign[] | undefined;     // Array der Kampagnen (undefined während Initial Load)

  // Loading States
  isLoading: boolean;                 // true während Initial Load (kein Cache)
  isFetching: boolean;                // true während jeglichem Fetch (auch mit Cache)
  isRefetching: boolean;              // true während Refetch (mit bestehenden Daten)

  // Success/Error States
  isSuccess: boolean;                 // true wenn Daten erfolgreich geladen
  isError: boolean;                   // true bei Fehler
  error: Error | null;                // Error-Objekt (null wenn kein Fehler)

  // Status
  status: 'pending' | 'error' | 'success';  // Query Status

  // Funktionen
  refetch: () => Promise<QueryObserverResult>;  // Manuelles Neu-Laden
}
```

### Datenfluss

Der Hook implementiert eine **3-Schritt-Strategie**:

```typescript
// Schritt 1: Projekt laden
const projectData = await projectService.getById(projectId, { organizationId });

// Schritt 2a: Lade Kampagnen via linkedCampaigns Array (ALTER ANSATZ)
if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
  const linkedCampaignData = await Promise.all(
    projectData.linkedCampaigns.map(async (campaignId) => {
      try {
        const campaign = await prService.getById(campaignId);
        return campaign;
      } catch {
        return null; // Fehlerhafte Kampagnen ignorieren
      }
    })
  );
  allCampaigns.push(...linkedCampaignData.filter(Boolean));
}

// Schritt 2b: Lade Kampagnen via projectId (NEUER ANSATZ)
const projectCampaigns = await prService.getCampaignsByProject(projectId, organizationId);
allCampaigns.push(...projectCampaigns);

// Schritt 3: Duplikate entfernen
const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
  index === self.findIndex(c => c.id === campaign.id)
);

return uniqueCampaigns;
```

**Warum kombiniert?**
- Legacy-Projekte verwenden noch `linkedCampaigns` Array
- Neue Projekte verwenden `projectId`-Feld in Campaign
- Hook funktioniert mit beiden Ansätzen
- Automatische Duplikaten-Entfernung

### Cache-Konfiguration

```typescript
{
  queryKey: ['project-campaigns', projectId, organizationId],
  staleTime: 0,                  // Daten sind sofort "stale"
  gcTime: 5 * 60 * 1000,         // Cache wird nach 5 Minuten gelöscht
  enabled: !!projectId && !!organizationId,  // Nur aktiv wenn IDs vorhanden
}
```

**Warum staleTime: 0?**
- Kampagnen ändern sich häufig (Bearbeitung, Status-Wechsel)
- Bei Tab-Wechsel soll immer neu geladen werden
- User sieht immer aktuelle Daten

**Warum gcTime: 5 Minuten?**
- Balance zwischen Performance und Aktualität
- Bei schnellem Tab-Wechsel (< 5min) werden Daten aus Cache genommen
- Nach 5min ohne Verwendung wird Cache geleert

### Verwendungsbeispiele

#### Beispiel 1: Basis-Verwendung

```typescript
import { useProjectCampaigns } from '@/lib/hooks/useCampaignData';

function CampaignList({ projectId, organizationId }) {
  const { data: campaigns, isLoading, isError, error } = useProjectCampaigns(
    projectId,
    organizationId
  );

  if (isLoading) {
    return <div>Lade Kampagnen...</div>;
  }

  if (isError) {
    return <div>Fehler: {error.message}</div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return <div>Keine Kampagnen vorhanden</div>;
  }

  return (
    <ul>
      {campaigns.map(campaign => (
        <li key={campaign.id}>
          <h3>{campaign.title}</h3>
          <p>Status: {campaign.status}</p>
        </li>
      ))}
    </ul>
  );
}
```

#### Beispiel 2: Mit Loading-Skeleton

```typescript
function CampaignTable({ projectId, organizationId }) {
  const { data: campaigns, isLoading } = useProjectCampaigns(
    projectId,
    organizationId
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <table>
      {/* Tabellen-Inhalt */}
    </table>
  );
}
```

#### Beispiel 3: Mit Refetch-Button

```typescript
function CampaignListWithRefresh({ projectId, organizationId }) {
  const { data: campaigns, refetch, isFetching } = useProjectCampaigns(
    projectId,
    organizationId
  );

  return (
    <div>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isFetching ? 'Lädt...' : 'Aktualisieren'}
      </button>

      <CampaignList campaigns={campaigns} />
    </div>
  );
}
```

#### Beispiel 4: Mit Error Retry

```typescript
function CampaignListWithRetry({ projectId, organizationId }) {
  const { data: campaigns, isError, error, refetch } = useProjectCampaigns(
    projectId,
    organizationId
  );

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <h3 className="text-red-800 font-semibold">Fehler beim Laden</h3>
        <p className="text-red-600">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return <CampaignList campaigns={campaigns} />;
}
```

#### Beispiel 5: Conditional Query (enabled)

```typescript
function ConditionalCampaignList({ projectId, organizationId, userHasAccess }) {
  const { data: campaigns, isLoading } = useProjectCampaigns(
    projectId,
    organizationId,
    {
      enabled: !!projectId && !!organizationId && userHasAccess,
    }
  );

  if (!userHasAccess) {
    return <div>Keine Berechtigung</div>;
  }

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  return <CampaignList campaigns={campaigns} />;
}
```

### Error Cases

| Error | Ursache | Handling |
|-------|---------|----------|
| `No projectId or organizationId` | Parameter fehlen | Query wird nicht ausgeführt (enabled: false) |
| `Project not found` | Projekt existiert nicht | isError = true, error.message enthält Details |
| `Permission denied` | Fehlende Firestore-Rechte | isError = true, error.message = 'Permission denied' |
| `Network error` | Keine Internetverbindung | isError = true, automatisches Retry (React Query) |
| `Invalid campaign data` | Korrupte Daten | Kampagne wird übersprungen (try/catch in map) |

### Performance-Hinweise

**1. Automatisches Request Deduplication:**
Wenn mehrere Komponenten gleichzeitig `useProjectCampaigns` mit gleichen Parametern aufrufen, wird nur ein Request ausgeführt.

**2. Parallel Loading:**
Kampagnen aus `linkedCampaigns` werden parallel geladen (Promise.all):
```typescript
const linkedCampaignData = await Promise.all(
  projectData.linkedCampaigns.map(id => prService.getById(id))
);
```

**3. Cache Sharing:**
Alle Komponenten mit gleichen `projectId` und `organizationId` teilen sich den Cache.

**4. Automatic Garbage Collection:**
Cache wird nach 5 Minuten Inaktivität automatisch geleert (gcTime).

---

## useProjectApprovals

Lädt alle Freigaben (Approvals) für ein Projekt.

### Import

```typescript
import { useProjectApprovals } from '@/lib/hooks/useCampaignData';
```

### Signatur

```typescript
function useProjectApprovals(
  projectId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<ApprovalEnhanced[], Error>
```

### Parameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `projectId` | `string \| undefined` | Ja | ID des Projekts |
| `organizationId` | `string \| undefined` | Ja | ID der Organisation |

### Return Value

Gleich wie `useProjectCampaigns`, aber mit `ApprovalEnhanced[]` statt `PRCampaign[]`.

```typescript
{
  data: ApprovalEnhanced[];      // Array der Freigaben
  isLoading: boolean;            // Initial Load
  isFetching: boolean;           // Jeglicher Fetch
  isError: boolean;              // Fehler aufgetreten
  error: Error | null;           // Error-Objekt
  refetch: () => void;           // Manuelles Neu-Laden
  // ... weitere Properties
}
```

### Datenfluss

```typescript
// Lade Approvals direkt über Service
const approvalData = await approvalServiceExtended.getApprovalsByProject(
  projectId,
  organizationId
);

return approvalData;
```

**Einfacher als Campaigns:**
- Keine kombinierte Loading-Logik
- Direkte Service-Anfrage
- Keine Duplikaten-Entfernung nötig

### Cache-Konfiguration

```typescript
{
  queryKey: ['project-approvals', projectId, organizationId],
  staleTime: 2 * 60 * 1000,      // 2 Minuten Cache
  enabled: !!projectId && !!organizationId,
}
```

**Warum staleTime: 2 Minuten?**
- Approvals ändern sich seltener als Campaigns
- Weniger häufiges Refetching spart Performance
- 2 Minuten ist guter Balance-Wert

### Verwendungsbeispiele

#### Beispiel 1: Freigabe-Tabelle

```typescript
function ApprovalTable({ projectId, organizationId }) {
  const { data: approvals, isLoading, isError } = useProjectApprovals(
    projectId,
    organizationId
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage />;

  if (approvals.length === 0) {
    return (
      <EmptyState
        icon={CheckCircleIcon}
        title="Keine Freigaben"
        description="Noch keine Freigaben für dieses Projekt"
      />
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Kampagne</th>
          <th>Status</th>
          <th>Kunde</th>
          <th>Letzte Aktivität</th>
        </tr>
      </thead>
      <tbody>
        {approvals.map(approval => (
          <ApprovalRow key={approval.id} approval={approval} />
        ))}
      </tbody>
    </table>
  );
}
```

#### Beispiel 2: Approval-Status Badge

```typescript
function ApprovalStatusBadge({ projectId, organizationId }) {
  const { data: approvals } = useProjectApprovals(projectId, organizationId);

  const pendingCount = approvals?.filter(a => a.status === 'pending').length || 0;
  const approvedCount = approvals?.filter(a => a.status === 'approved').length || 0;

  return (
    <div className="flex gap-2">
      <Badge color="amber">
        {pendingCount} Ausstehend
      </Badge>
      <Badge color="green">
        {approvedCount} Freigegeben
      </Badge>
    </div>
  );
}
```

---

## useProjectPressData

**Combined Hook** für Campaigns + Approvals. Lädt beide Datensätze **parallel** und bietet ein vereinfachtes Interface.

### Import

```typescript
import { useProjectPressData } from '@/lib/hooks/useCampaignData';
```

### Signatur

```typescript
function useProjectPressData(
  projectId: string | undefined,
  organizationId: string | undefined
): {
  campaigns: PRCampaign[];
  approvals: ApprovalEnhanced[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### Parameter

Gleich wie die anderen Hooks.

### Return Value

```typescript
{
  // Daten (immer definiert, default: [])
  campaigns: PRCampaign[];           // Array der Kampagnen
  approvals: ApprovalEnhanced[];     // Array der Freigaben

  // Loading State (unified)
  isLoading: boolean;                // true wenn EINER der Hooks lädt

  // Error State (unified)
  isError: boolean;                  // true wenn EINER der Hooks Fehler hat
  error: Error | null;               // Erster aufgetretener Fehler

  // Refetch (both)
  refetch: () => void;               // Lädt BEIDE Datensätze neu
}
```

### Implementation

```typescript
export function useProjectPressData(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  // Rufe beide Hooks auf (parallel!)
  const campaigns = useProjectCampaigns(projectId, organizationId);
  const approvals = useProjectApprovals(projectId, organizationId);

  // Kombiniere Ergebnisse
  return {
    campaigns: campaigns.data ?? [],        // Default: []
    approvals: approvals.data ?? [],        // Default: []
    isLoading: campaigns.isLoading || approvals.isLoading,
    isError: campaigns.isError || approvals.isError,
    error: campaigns.error || approvals.error,
    refetch: () => {
      campaigns.refetch();
      approvals.refetch();
    },
  };
}
```

### Vorteile

1. **Vereinfachtes Interface**: Kein verschachteltes Destructuring
2. **Paralleles Laden**: Beide Requests laufen gleichzeitig
3. **Unified Loading State**: Ein `isLoading` für beide
4. **Ein Refetch für beide**: `refetch()` lädt beides neu
5. **Default-Werte**: `campaigns` und `approvals` sind immer Arrays (nie undefined)

### Verwendungsbeispiele

#### Beispiel 1: Komplette Übersicht

```typescript
function ProjectPressemeldungenTab({ projectId, organizationId }) {
  const {
    campaigns,
    approvals,
    isLoading,
    refetch,
  } = useProjectPressData(projectId, organizationId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Kampagnen-Tabelle */}
      <section>
        <Heading level={3}>Pressemeldung</Heading>
        <PressemeldungCampaignTable
          campaigns={campaigns}
          organizationId={organizationId}
          onRefresh={refetch}
        />
      </section>

      {/* Freigabe-Tabelle */}
      <section>
        <Heading level={3}>Freigabe</Heading>
        <PressemeldungApprovalTable
          approvals={approvals}
          onRefresh={refetch}
        />
      </section>
    </div>
  );
}
```

#### Beispiel 2: Statistik-Dashboard

```typescript
function PressDashboard({ projectId, organizationId }) {
  const { campaigns, approvals } = useProjectPressData(projectId, organizationId);

  const stats = {
    totalCampaigns: campaigns.length,
    draftCampaigns: campaigns.filter(c => c.status === 'draft').length,
    sentCampaigns: campaigns.filter(c => c.status === 'sent').length,
    pendingApprovals: approvals.filter(a => a.status === 'pending').length,
    approvedApprovals: approvals.filter(a => a.status === 'approved').length,
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard title="Kampagnen gesamt" value={stats.totalCampaigns} />
      <StatCard title="Entwürfe" value={stats.draftCampaigns} />
      <StatCard title="Versendet" value={stats.sentCampaigns} />
      <StatCard title="Ausstehende Freigaben" value={stats.pendingApprovals} />
      <StatCard title="Freigegeben" value={stats.approvedApprovals} />
    </div>
  );
}
```

#### Beispiel 3: Mit Conditional Rendering

```typescript
function PressOverview({ projectId, organizationId }) {
  const {
    campaigns,
    approvals,
    isLoading,
    isError,
    error,
  } = useProjectPressData(projectId, organizationId);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState error={error} />;
  }

  const hasData = campaigns.length > 0 || approvals.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="Keine Daten"
        description="Erstellen Sie eine Pressemeldung, um zu beginnen"
        action={{
          label: "Meldung erstellen",
          onClick: handleCreate,
        }}
      />
    );
  }

  return (
    <div>
      <CampaignTable campaigns={campaigns} />
      <ApprovalTable approvals={approvals} />
    </div>
  );
}
```

---

## useUpdateCampaign

Mutation-Hook zum Aktualisieren von Kampagnen. Invalidiert automatisch den Cache nach erfolgreicher Mutation.

### Import

```typescript
import { useUpdateCampaign } from '@/lib/hooks/useCampaignData';
```

### Signatur

```typescript
function useUpdateCampaign(): UseMutationResult<
  void,
  Error,
  { id: string; organizationId: string; campaignData: any }
>
```

### Return Value

```typescript
{
  mutate: (data: MutationData) => void;      // Führt Update aus (fire-and-forget)
  mutateAsync: (data: MutationData) => Promise<void>;  // Async-Version
  isLoading: boolean;                         // Mutation läuft
  isError: boolean;                           // Fehler aufgetreten
  error: Error | null;                        // Fehler-Objekt
  isSuccess: boolean;                         // Mutation erfolgreich
  reset: () => void;                          // Reset State
}
```

### Implementation

```typescript
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      organizationId: string;
      campaignData: any;
    }) => {
      await prService.update(data.id, data.campaignData);
    },
    onSuccess: () => {
      // Invalidiere alle project-campaigns Queries
      queryClient.invalidateQueries({
        queryKey: ['project-campaigns']
      });
    },
  });
}
```

### Cache-Invalidierung

Nach erfolgreicher Mutation werden **alle** `project-campaigns` Queries invalidiert:

```typescript
queryClient.invalidateQueries({
  queryKey: ['project-campaigns']
});
```

**Was passiert?**
1. Mutation wird ausgeführt
2. Bei Erfolg: `onSuccess` Callback wird getriggert
3. Alle Queries mit `queryKey: ['project-campaigns', ...]` werden als "stale" markiert
4. React Query fetcht automatisch neu (wenn Komponenten noch gemountet sind)
5. UI updated automatisch mit neuen Daten

### Verwendungsbeispiele

#### Beispiel 1: Einfaches Update

```typescript
function CampaignEditor({ campaignId, organizationId }) {
  const { mutate, isLoading } = useUpdateCampaign();

  const handleSave = (title: string) => {
    mutate({
      id: campaignId,
      organizationId,
      campaignData: { title },
    });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSave(e.target.title.value);
    }}>
      <input name="title" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Speichert...' : 'Speichern'}
      </button>
    </form>
  );
}
```

#### Beispiel 2: Mit Toast Notifications

```typescript
import { toastService } from '@/lib/utils/toast';

function CampaignForm({ campaignId, organizationId }) {
  const { mutate, isLoading } = useUpdateCampaign();

  const handleSubmit = (data: Partial<PRCampaign>) => {
    mutate(
      {
        id: campaignId,
        organizationId,
        campaignData: data,
      },
      {
        onSuccess: () => {
          toastService.success('Kampagne erfolgreich gespeichert');
        },
        onError: (error) => {
          toastService.error(`Fehler: ${error.message}`);
        },
      }
    );
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit({ title: e.target.title.value });
    }}>
      {/* Form Fields */}
    </form>
  );
}
```

#### Beispiel 3: Mit Navigation nach Success

```typescript
import { useRouter } from 'next/navigation';

function CampaignCreateForm({ organizationId }) {
  const router = useRouter();
  const { mutate, isLoading } = useUpdateCampaign();

  const handleCreate = async (data: Partial<PRCampaign>) => {
    mutate(
      {
        id: 'new-campaign-id', // Von vorherigem Create-Call
        organizationId,
        campaignData: data,
      },
      {
        onSuccess: () => {
          toastService.success('Kampagne erstellt');
          router.push('/dashboard/pr-tools/campaigns');
        },
      }
    );
  };

  return <CampaignForm onSubmit={handleCreate} isLoading={isLoading} />;
}
```

#### Beispiel 4: Optimistic Update

```typescript
function CampaignQuickEdit({ campaign, organizationId }) {
  const queryClient = useQueryClient();
  const { mutate } = useUpdateCampaign();

  const handleToggleStatus = () => {
    const newStatus = campaign.status === 'draft' ? 'in_review' : 'draft';

    mutate(
      {
        id: campaign.id,
        organizationId,
        campaignData: { status: newStatus },
      },
      {
        onMutate: async () => {
          // Cancel laufende Queries
          await queryClient.cancelQueries({
            queryKey: ['project-campaigns']
          });

          // Snapshot des alten Werts
          const previousCampaigns = queryClient.getQueryData([
            'project-campaigns',
            campaign.projectId,
            organizationId
          ]);

          // Optimistisches Update
          queryClient.setQueryData(
            ['project-campaigns', campaign.projectId, organizationId],
            (old: PRCampaign[]) => old.map(c =>
              c.id === campaign.id ? { ...c, status: newStatus } : c
            )
          );

          // Return Context für Rollback
          return { previousCampaigns };
        },
        onError: (err, variables, context) => {
          // Rollback bei Fehler
          queryClient.setQueryData(
            ['project-campaigns', campaign.projectId, organizationId],
            context.previousCampaigns
          );
          toastService.error('Fehler beim Update');
        },
      }
    );
  };

  return (
    <button onClick={handleToggleStatus}>
      Status: {campaign.status}
    </button>
  );
}
```

---

## TypeScript-Typen

### PRCampaign

```typescript
interface PRCampaign {
  id?: string;
  title: string;
  content: string;
  status: 'draft' | 'in_review' | 'approved' | 'sent' | 'rejected' | 'changes_requested';
  userId: string;
  organizationId: string;
  projectId?: string;              // Neuer Ansatz
  projectTitle?: string;
  linkedCampaigns?: string[];      // Alter Ansatz (auf Projekt-Ebene)
  attachedAssets?: CampaignAssetAttachment[];
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  // ... weitere Felder
}
```

### ApprovalEnhanced

```typescript
interface ApprovalEnhanced {
  id: string;
  campaignId: string;
  campaignTitle?: string;
  projectId: string;
  organizationId: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested' | 'expired';
  clientName?: string;
  clientEmail?: string;
  recipients?: Array<{
    name?: string;
    email: string;
  }>;
  shareId?: string;
  history?: Array<{
    action: string;
    actorName: string;
    timestamp: Timestamp | Date;
    details?: {
      comment?: string;
    };
  }>;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  // ... weitere Felder
}
```

### CampaignAssetAttachment

```typescript
interface CampaignAssetAttachment {
  id: string;
  type: 'asset' | 'file';
  metadata?: {
    fileName?: string;
    fileType?: string;
    thumbnailUrl?: string;
  };
}
```

---

## React Query Integration

### Query Keys

Alle Hooks verwenden standardisierte Query Keys:

```typescript
// Campaigns
['project-campaigns', projectId, organizationId]

// Approvals
['project-approvals', projectId, organizationId]
```

**Vorteile:**
- Eindeutige Identifikation
- Automatisches Caching pro Projekt + Organisation
- Einfache Invalidierung

### Invalidierung Patterns

**1. Spezifische Query invalidieren:**
```typescript
queryClient.invalidateQueries({
  queryKey: ['project-campaigns', 'project-123', 'org-456']
});
```

**2. Alle Campaigns invalidieren:**
```typescript
queryClient.invalidateQueries({
  queryKey: ['project-campaigns']
});
```

**3. Alle Queries invalidieren:**
```typescript
queryClient.invalidateQueries();
```

### Refetch on Window Focus

Standardmäßig aktiv:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,  // Default
    },
  },
});
```

**Was passiert?**
1. User wechselt zu anderem Tab
2. User kommt zurück
3. React Query prüft: Sind Daten "stale"?
4. Ja (weil staleTime: 0 für Campaigns) → Refetch automatisch

### Manual Query Refetching

```typescript
// Via Hook
const { refetch } = useProjectCampaigns(projectId, orgId);
refetch();

// Via QueryClient
queryClient.refetchQueries({
  queryKey: ['project-campaigns', projectId, orgId]
});
```

---

## Cache-Strategien

### Campaigns: Aggressive Refetching

```typescript
{
  staleTime: 0,           // Immer stale
  gcTime: 5 * 60 * 1000,  // 5 Minuten Garbage Collection
}
```

**Use Case:**
Kampagnen ändern sich häufig durch:
- Bearbeitung im Editor
- Status-Änderungen
- Versenden
- Löschen

**Verhalten:**
- Bei Tab-Wechsel: Sofortiges Refetch
- Bei Component Remount: Sofortiges Refetch
- Cache wird 5 Minuten behalten (für schnelle Re-Renders)

### Approvals: Moderate Caching

```typescript
{
  staleTime: 2 * 60 * 1000,  // 2 Minuten Cache
}
```

**Use Case:**
Approvals ändern sich seltener:
- Nur bei Kunden-Aktionen
- Selten durch Team-Mitglieder

**Verhalten:**
- Bei Tab-Wechsel (< 2min): Kein Refetch (Cache verwendet)
- Bei Tab-Wechsel (> 2min): Automatisches Refetch
- Balance zwischen Performance und Aktualität

### Comparison Table

| Hook | staleTime | gcTime | Refetch on Focus | Use Case |
|------|-----------|--------|------------------|----------|
| `useProjectCampaigns` | 0 | 5min | ✅ Immer | Häufig geänderte Daten |
| `useProjectApprovals` | 2min | default | ⚠️ Nach 2min | Selten geänderte Daten |

---

## Testing

### Test Setup

```typescript
// jest.setup.js
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock QueryClient für Tests
global.queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,  // Kein Retry in Tests
    },
  },
});

// Wrapper-Komponente für Tests
export function createQueryWrapper() {
  return ({ children }) => (
    <QueryClientProvider client={global.queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectCampaigns } from '@/lib/hooks/useCampaignData';
import { createQueryWrapper } from '../test-utils';

describe('useProjectCampaigns', () => {
  beforeEach(() => {
    // Reset Query Client vor jedem Test
    global.queryClient.clear();
  });

  it('sollte Kampagnen laden', async () => {
    // Arrange
    const mockCampaigns = [
      { id: 'c1', title: 'Campaign 1' },
      { id: 'c2', title: 'Campaign 2' },
    ];

    // Mock Service
    jest.spyOn(prService, 'getCampaignsByProject').mockResolvedValue(mockCampaigns);

    // Act
    const { result } = renderHook(
      () => useProjectCampaigns('p1', 'org1'),
      { wrapper: createQueryWrapper() }
    );

    // Assert
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCampaigns);
  });

  it('sollte Fehler behandeln', async () => {
    // Arrange
    const mockError = new Error('Fehler beim Laden');
    jest.spyOn(prService, 'getCampaignsByProject').mockRejectedValue(mockError);

    // Act
    const { result } = renderHook(
      () => useProjectCampaigns('p1', 'org1'),
      { wrapper: createQueryWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });
});
```

### Mutation Testing

```typescript
describe('useUpdateCampaign', () => {
  it('sollte Kampagne aktualisieren und Cache invalidieren', async () => {
    // Arrange
    const updateSpy = jest.spyOn(prService, 'update').mockResolvedValue();

    // Act
    const { result } = renderHook(
      () => useUpdateCampaign(),
      { wrapper: createQueryWrapper() }
    );

    result.current.mutate({
      id: 'c1',
      organizationId: 'org1',
      campaignData: { title: 'Updated' },
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateSpy).toHaveBeenCalledWith('c1', { title: 'Updated' });
  });
});
```

---

## Performance-Optimierung

### 1. Request Deduplication

React Query dedupliziert automatisch identische Requests:

```typescript
// Beide Komponenten rufen Hook auf
function ComponentA() {
  const { data } = useProjectCampaigns('p1', 'org1');
  // ...
}

function ComponentB() {
  const { data } = useProjectCampaigns('p1', 'org1');
  // ...
}

// Nur EIN Request wird ausgeführt!
// Beide Komponenten bekommen die gleichen Daten
```

### 2. Parallel Queries

```typescript
// Campaigns und Approvals laden parallel
const campaigns = useProjectCampaigns('p1', 'org1');
const approvals = useProjectApprovals('p1', 'org1');

// Beide Requests laufen gleichzeitig
// Gesamtzeit = max(campaignsTime, approvalsTime)
// Nicht: campaignsTime + approvalsTime
```

### 3. Selective Subscriptions

Nur die Properties abonnieren, die du brauchst:

```typescript
// Gut - nur data abonniert
const { data } = useProjectCampaigns('p1', 'org1');

// Nicht optimal - alles abonniert
const query = useProjectCampaigns('p1', 'org1');
const campaigns = query.data;
```

### 4. Lazy Queries

```typescript
const { data, refetch } = useProjectCampaigns('p1', 'org1', {
  enabled: false,  // Query läuft nicht automatisch
});

// Manueller Trigger
<button onClick={() => refetch()}>
  Kampagnen laden
</button>
```

### 5. Prefetching

```typescript
const queryClient = useQueryClient();

// Prefetch beim Hover
const handleMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: ['project-campaigns', 'p1', 'org1'],
    queryFn: () => /* ... */,
  });
};

<Link onMouseEnter={handleMouseEnter} to="/campaigns">
  Kampagnen
</Link>
```

---

## Migration von useState/useEffect

### Vorher (useState/useEffect)

```typescript
function CampaignList({ projectId, organizationId }) {
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCampaigns = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Lade Projekt
        const project = await projectService.getById(projectId, { organizationId });

        // 2. Lade linkedCampaigns
        const linkedPromises = project.linkedCampaigns?.map(id =>
          prService.getById(id)
        ) || [];
        const linkedCampaigns = await Promise.all(linkedPromises);

        // 3. Lade projectId-basierte Campaigns
        const projectCampaigns = await prService.getCampaignsByProject(
          projectId,
          organizationId
        );

        // 4. Kombiniere und entferne Duplikate
        const allCampaigns = [...linkedCampaigns, ...projectCampaigns];
        const unique = allCampaigns.filter((c, i, self) =>
          i === self.findIndex(x => x.id === c.id)
        );

        if (!cancelled) {
          setCampaigns(unique);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCampaigns();

    return () => {
      cancelled = true;
    };
  }, [projectId, organizationId]);

  const refetch = () => {
    // Trigger useEffect neu
    setLoading(true);
  };

  // Render logic...
}
```

**Probleme:**
- ~50 Zeilen Code
- Manuelles Loading-State-Management
- Manuelles Error-Handling
- Manuelles Cleanup (cancelled Flag)
- Kein Caching
- Kein automatisches Refetching
- Schwer zu testen

### Nachher (React Query)

```typescript
function CampaignList({ projectId, organizationId }) {
  const { data: campaigns, isLoading, isError, error, refetch } = useProjectCampaigns(
    projectId,
    organizationId
  );

  // Render logic...
}
```

**Vorteile:**
- 3 Zeilen Code (statt 50+)
- Automatisches Loading-State-Management
- Automatisches Error-Handling
- Automatisches Cleanup
- Built-in Caching
- Automatisches Refetching (Window Focus)
- Einfach zu testen

### Migration Steps

**Schritt 1: Installiere React Query**
```bash
npm install @tanstack/react-query
```

**Schritt 2: Setup QueryClient**
```tsx
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Schritt 3: Ersetze useState/useEffect**
```typescript
// Alt
const [campaigns, setCampaigns] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => { /* ... */ }, []);

// Neu
const { data: campaigns, isLoading } = useProjectCampaigns(projectId, orgId);
```

**Schritt 4: Teste Migration**
```bash
npm test
```

---

## Troubleshooting

### Problem: "No QueryClient provided"

**Fehler:**
```
Error: No QueryClient set, use QueryClientProvider to set one
```

**Lösung:**
```tsx
// App-Root
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

---

### Problem: Daten werden nicht aktualisiert

**Symptom:**
Nach Mutation sieht man alte Daten.

**Ursache:**
Cache wurde nicht invalidiert.

**Lösung:**
```typescript
const { mutate } = useUpdateCampaign();

mutate(data, {
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['project-campaigns']
    });
  },
});
```

---

### Problem: Zu viele Requests

**Symptom:**
Bei jedem Render wird neu geladen.

**Ursache:**
`staleTime: 0` + häufige Re-Renders.

**Lösung:**
Erhöhe `staleTime` wenn möglich:
```typescript
const { data } = useProjectCampaigns('p1', 'org1', {
  staleTime: 60 * 1000,  // 1 Minute
});
```

---

### Problem: Memory Leak Warning

**Fehler:**
```
Warning: Can't perform a React state update on an unmounted component
```

**Ursache:**
Component wurde unmounted während Query lief.

**Lösung:**
React Query handled das automatisch! Wenn du trotzdem die Warnung siehst:
```typescript
useEffect(() => {
  return () => {
    queryClient.cancelQueries({
      queryKey: ['project-campaigns']
    });
  };
}, []);
```

---

**Letzte Aktualisierung**: 2025-10-27
**Version**: 0.1.0

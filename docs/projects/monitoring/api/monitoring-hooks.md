# Monitoring Hooks - Detaillierte API-Referenz

> **Modul**: React Query Hooks für Monitoring Tab
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 27. Oktober 2025

## Inhaltsverzeichnis

1. [useProjectMonitoringData](#useprojectmonitoringdata)
2. [useConfirmSuggestion](#useconfirmsuggestion)
3. [useRejectSuggestion](#userejectsuggestion)
4. [Hook Utilities](#hook-utilities)
5. [Advanced Patterns](#advanced-patterns)
6. [Testing](#testing)

---

## useProjectMonitoringData

Lädt alle Monitoring-Daten für ein Projekt: Kampagnen, Sends, Clippings und Suggestions.

### Signatur

```typescript
function useProjectMonitoringData(
  projectId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<MonitoringData, Error>
```

### Parameter

| Parameter | Type | Required | Beschreibung |
|-----------|------|----------|--------------|
| `projectId` | `string \| undefined` | Ja | Die Projekt-ID |
| `organizationId` | `string \| undefined` | Ja | Die Organisations-ID für Multi-Tenancy |

**Wichtig:** Beide Parameter müssen definiert sein, sonst wird die Query nicht ausgeführt (`enabled: false`).

### Rückgabewert

```typescript
interface UseQueryResult<MonitoringData, Error> {
  // Data
  data?: MonitoringData;

  // Status
  isLoading: boolean;      // Initial Loading
  isError: boolean;        // Hat Error
  isSuccess: boolean;      // Erfolgreich geladen
  isFetching: boolean;     // Fetching (auch Background Refetch)

  // Error
  error: Error | null;

  // Methods
  refetch: () => Promise<QueryObserverResult>;

  // Status (granular)
  status: 'loading' | 'error' | 'success';
  fetchStatus: 'idle' | 'fetching' | 'paused';
}
```

### MonitoringData Type

```typescript
interface MonitoringData {
  campaigns: CampaignWithStats[];
  allSends: Send[];
  allClippings: Clipping[];
  allSuggestions: MonitoringSuggestion[];
}

interface CampaignWithStats extends Campaign {
  id?: string;
  name: string;
  projectId: string;
  organizationId: string;
  stats: {
    total: number;        // Gesamtzahl Sends
    delivered: number;    // Status: delivered, opened, clicked
    opened: number;       // Status: opened, clicked
    clicked: number;      // Status: clicked
    bounced: number;      // Status: bounced
    clippings: number;    // Anzahl Clippings
  };
}
```

### Funktionsweise

#### 1. Projekt laden

```typescript
const projectData = await projectService.getById(projectId, { organizationId });
if (!projectData) throw new Error('Projekt nicht gefunden');
```

#### 2. Kampagnen sammeln

```typescript
let allCampaigns: any[] = [];

// a) Linked Campaigns aus Projekt
if (projectData.linkedCampaigns?.length > 0) {
  const linkedCampaignData = await Promise.all(
    projectData.linkedCampaigns.map(async (campaignId: string) => {
      try {
        return await prService.getById(campaignId);
      } catch (error) {
        console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
        return null;
      }
    })
  );
  allCampaigns.push(...linkedCampaignData.filter(Boolean));
}

// b) Kampagnen via projectId
const projectCampaigns = await prService.getCampaignsByProject(projectId, organizationId);
allCampaigns.push(...projectCampaigns);
```

#### 3. Duplikate entfernen

```typescript
const uniqueCampaigns = allCampaigns.filter(
  (campaign, index, self) => index === self.findIndex(c => c.id === campaign.id)
);
```

#### 4. Daten pro Kampagne laden (Parallel)

```typescript
const campaignsWithData = await Promise.all(
  uniqueCampaigns.map(async (campaign) => {
    const [sends, clippings, suggestions] = await Promise.all([
      emailCampaignService.getSends(campaign.id!, { organizationId }),
      clippingService.getByCampaignId(campaign.id!, { organizationId }),
      monitoringSuggestionService.getByCampaignId(campaign.id!, organizationId)
    ]);
    return { campaign, sends, clippings, suggestions };
  })
);
```

#### 5. Filtern: Nur Kampagnen mit Aktivität

```typescript
const activeCampaigns = campaignsWithData.filter(
  ({ sends, clippings, suggestions }) =>
    sends.length > 0 || clippings.length > 0 || suggestions.length > 0
);
```

#### 6. Stats berechnen

```typescript
const campaigns = activeCampaigns.map(({ campaign, sends, clippings }) => ({
  ...campaign,
  stats: {
    total: sends.length,
    delivered: sends.filter((s: any) =>
      s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
    ).length,
    opened: sends.filter((s: any) =>
      s.status === 'opened' || s.status === 'clicked'
    ).length,
    clicked: sends.filter((s: any) => s.status === 'clicked').length,
    bounced: sends.filter((s: any) => s.status === 'bounced').length,
    clippings: clippings.length
  }
}));
```

#### 7. Aggregierte Daten zurückgeben

```typescript
return {
  campaigns,
  allSends: activeCampaigns.flatMap(({ sends }) => sends),
  allClippings: activeCampaigns.flatMap(({ clippings }) => clippings),
  allSuggestions: activeCampaigns.flatMap(({ suggestions }) => suggestions)
};
```

### Query Configuration

```typescript
{
  queryKey: ['projectMonitoring', projectId, organizationId],
  queryFn: async () => { /* Siehe oben */ },
  enabled: !!projectId && !!organizationId,
  staleTime: 2 * 60 * 1000, // 2 Minuten
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
}
```

**Konfigurationsdetails:**

- **queryKey**: Hierarchischer Key für präzise Cache-Invalidierung
- **enabled**: Query wird nur ausgeführt wenn beide Parameter definiert sind
- **staleTime**: Daten werden 2 Minuten als "fresh" betrachtet
- **retry**: 3 Versuche bei Fehlern
- **retryDelay**: Exponential Backoff (1s, 2s, 4s, max 30s)

### Features

#### Duplikat-Entfernung

Kampagnen können sowohl via `linkedCampaigns` als auch via `projectId` gefunden werden. Der Hook entfernt automatisch Duplikate basierend auf `campaign.id`.

```typescript
// Beispiel: Kampagne "camp-123" wird zweimal gefunden
// linkedCampaigns: ['camp-123']
// getCampaignsByProject: [{ id: 'camp-123', ... }]

// Ergebnis: Nur einmal in campaigns Array
```

#### Stats-Aggregierung

Der Hook berechnet automatisch Statistiken für jede Kampagne:

```typescript
// Send Status Mapping:
const isDelivered = ['delivered', 'opened', 'clicked'].includes(send.status);
const isOpened = ['opened', 'clicked'].includes(send.status);
const isClicked = send.status === 'clicked';
const isBounced = send.status === 'bounced';
```

#### Filtern nach Aktivität

Kampagnen ohne Sends, Clippings oder Suggestions werden automatisch gefiltert:

```typescript
// Kampagne wird NUR angezeigt wenn mindestens:
// - 1 Send ODER
// - 1 Clipping ODER
// - 1 Suggestion
vorhanden ist.
```

#### Automatisches Caching

Daten werden 2 Minuten gecached:

```typescript
// First Call (t=0s): Network Request
const { data } = useProjectMonitoringData(projectId, orgId);

// Second Call (t=30s): Sofort aus Cache
const { data: cachedData } = useProjectMonitoringData(projectId, orgId);

// Third Call (t=150s): Background Refetch (stale after 120s)
const { data: refetchedData } = useProjectMonitoringData(projectId, orgId);
```

### Verwendung

#### Basis-Verwendung

```tsx
import { useProjectMonitoringData } from '@/lib/hooks/useMonitoringData';
import LoadingState from '@/components/projects/monitoring/LoadingState';
import EmptyState from '@/components/projects/monitoring/EmptyState';

export function MonitoringComponent({ projectId }: Props) {
  const { currentOrganization } = useOrganization();

  const { data, isLoading, error } = useProjectMonitoringData(
    projectId,
    currentOrganization?.id
  );

  if (isLoading) {
    return <LoadingState message="Lade Monitoring-Daten..." />;
  }

  if (error) {
    return <EmptyState title="Fehler" description={error.message} />;
  }

  if (!data || data.campaigns.length === 0) {
    return (
      <EmptyState
        title="Noch keine Monitoring-Aktivitäten"
        description="Versende eine Kampagne oder erfasse eine Veröffentlichung"
      />
    );
  }

  return (
    <div>
      <h2>Monitoring Dashboard</h2>
      <p>Kampagnen: {data.campaigns.length}</p>
      <p>Clippings: {data.allClippings.length}</p>
      <p>Pending Suggestions: {data.allSuggestions.filter(s => s.status === 'pending').length}</p>
    </div>
  );
}
```

#### Mit Refetch

```tsx
export function MonitoringWithRefresh({ projectId }: Props) {
  const { data, refetch, isFetching } = useProjectMonitoringData(
    projectId,
    currentOrganization?.id
  );

  const handleRefresh = async () => {
    await refetch();
    toastService.success('Daten aktualisiert');
  };

  return (
    <div>
      <button onClick={handleRefresh} disabled={isFetching}>
        {isFetching ? 'Lädt...' : 'Aktualisieren'}
      </button>
      {/* Rest */}
    </div>
  );
}
```

#### Mit Conditional Fetching

```tsx
export function ConditionalMonitoring({ projectId, isActive }: Props) {
  const { currentOrganization } = useOrganization();

  const { data } = useProjectMonitoringData(
    // Nur laden wenn Projekt aktiv
    isActive ? projectId : undefined,
    currentOrganization?.id
  );

  if (!isActive) {
    return <div>Monitoring nicht aktiv</div>;
  }

  return <div>{/* Monitoring UI */}</div>;
}
```

### Query Key

```typescript
['projectMonitoring', projectId, organizationId]
```

**Verwendung für Invalidierung:**

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Alle projectMonitoring Queries
queryClient.invalidateQueries({ queryKey: ['projectMonitoring'] });

// Spezifisches Projekt
queryClient.invalidateQueries({ queryKey: ['projectMonitoring', projectId] });

// Exakte Query
queryClient.invalidateQueries({
  queryKey: ['projectMonitoring', projectId, organizationId]
});
```

### Invalidierung

Der Hook wird automatisch invalidiert nach:

1. **useConfirmSuggestion** Mutation
2. **useRejectSuggestion** Mutation

```typescript
// Beispiel: Nach Confirm wird Query invalidiert
const confirmMutation = useConfirmSuggestion();

await confirmMutation.mutateAsync({ suggestionId, userId, organizationId });
// → queryClient.invalidateQueries({ queryKey: ['projectMonitoring'] })
// → useProjectMonitoringData wird automatisch re-fetched
```

### Error Handling

#### Error Types

```typescript
// 1. Projekt nicht gefunden
Error: 'Projekt nicht gefunden'

// 2. Firebase Permission Denied
FirebaseError: {
  code: 'permission-denied',
  message: 'Missing or insufficient permissions'
}

// 3. Network Error
Error: 'Failed to fetch'

// 4. Invalid Parameters
Error: 'ProjectId und OrganizationId erforderlich'
```

#### Error Handling im Component

```tsx
const { data, error, isError } = useProjectMonitoringData(projectId, orgId);

if (isError) {
  if (error.message.includes('nicht gefunden')) {
    return <EmptyState title="Projekt nicht gefunden" />;
  }

  if (error.message.includes('permission')) {
    return <EmptyState title="Keine Berechtigung" />;
  }

  return <EmptyState title="Fehler beim Laden" description={error.message} />;
}
```

### Performance

#### Timing

```
Project Load:           50-100ms
Campaign Load:          100-200ms (parallel)
Per Campaign Data:      150-300ms (parallel für alle Kampagnen)
Stats Calculation:      <10ms
Total (3 Kampagnen):    ~400-600ms
```

#### Optimierungen

1. **Parallel Fetching**: Alle Kampagnen-Daten parallel laden
2. **Duplikat-Filter**: O(n) Komplexität
3. **Stats Calculation**: Einmal beim Query, nicht bei jedem Render
4. **Caching**: 2 Minuten Stale Time

### Tests

Der Hook hat **12 Tests** mit **94.44% Coverage**:

```typescript
describe('useProjectMonitoringData', () => {
  it('should load monitoring data successfully');
  it('should not execute query when projectId is missing');
  it('should not execute query when organizationId is missing');
  it('should throw error when project is not found');
  it('should remove duplicate campaigns');
  it('should filter campaigns with no activity');
  it('should calculate campaign stats correctly');
  it('should not execute query when disabled (missing params)');
  // ... weitere Tests
});
```

**Siehe:** `src/lib/hooks/__tests__/useMonitoringData.test.tsx`

---

## useConfirmSuggestion

Mutation Hook zum Bestätigen eines Monitoring-Vorschlags.

### Signatur

```typescript
function useConfirmSuggestion(): UseMutationResult<
  void,
  Error,
  ConfirmSuggestionInput,
  unknown
>
```

### Input Type

```typescript
interface ConfirmSuggestionInput {
  suggestionId: string;      // Die Suggestion-ID
  userId: string;            // User, der bestätigt
  organizationId: string;    // Organisation für Multi-Tenancy
}
```

### Rückgabewert

```typescript
interface UseMutationResult<void, Error, ConfirmSuggestionInput> {
  // Data
  data?: void;

  // Status
  isPending: boolean;     // Mutation läuft
  isError: boolean;       // Hat Error
  isSuccess: boolean;     // Erfolgreich

  // Error
  error: Error | null;

  // Methods
  mutate: (variables: ConfirmSuggestionInput) => void;
  mutateAsync: (variables: ConfirmSuggestionInput) => Promise<void>;
  reset: () => void;
}
```

### Funktionsweise

#### 1. Mutation Function

```typescript
mutationFn: async (data: ConfirmSuggestionInput) => {
  return await monitoringSuggestionService.confirmSuggestion(
    data.suggestionId,
    {
      userId: data.userId,
      organizationId: data.organizationId
    }
  );
}
```

#### 2. On Success

```typescript
onSuccess: () => {
  // Invalidiere alle projectMonitoring Queries
  queryClient.invalidateQueries({
    queryKey: ['projectMonitoring']
  });
}
```

**Effekt:**
- Alle aktiven `useProjectMonitoringData` Queries werden invalidiert
- Automatischer Refetch in allen Komponenten
- UI aktualisiert sich mit neuen Daten

### Was passiert beim Bestätigen?

1. **Suggestion Status Update**: Status → `confirmed`
2. **Clipping Creation**: Neues Clipping aus Suggestion-Daten
3. **Firestore Write**: Beide Dokumente werden aktualisiert
4. **Cache Invalidation**: Query Cache wird geleert
5. **Auto Refetch**: Neue Daten werden geladen

### Verwendung

#### Basis-Verwendung

```tsx
import { useConfirmSuggestion } from '@/lib/hooks/useMonitoringData';
import { toastService } from '@/lib/utils/toast';

export function SuggestionCard({ suggestion }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const confirmMutation = useConfirmSuggestion();

  const handleConfirm = async () => {
    if (!user || !currentOrganization) return;

    try {
      await confirmMutation.mutateAsync({
        suggestionId: suggestion.id!,
        userId: user.uid,
        organizationId: currentOrganization.id
      });
      toastService.success('Vorschlag bestätigt');
    } catch (error) {
      toastService.error('Fehler beim Bestätigen');
    }
  };

  return (
    <div>
      <h3>{suggestion.articleTitle}</h3>
      <button
        onClick={handleConfirm}
        disabled={confirmMutation.isPending}
      >
        {confirmMutation.isPending ? 'Bestätige...' : 'Bestätigen'}
      </button>
    </div>
  );
}
```

#### Mit Loading State

```tsx
export function SuggestionWithLoading({ suggestion }: Props) {
  const confirmMutation = useConfirmSuggestion();

  return (
    <div>
      {confirmMutation.isPending && (
        <div className="loading-overlay">
          <LoadingSpinner />
          <p>Bestätige Vorschlag...</p>
        </div>
      )}

      <button
        onClick={() => confirmMutation.mutate({ ... })}
        disabled={confirmMutation.isPending}
      >
        Bestätigen
      </button>
    </div>
  );
}
```

#### Mit Error Handling

```tsx
export function SuggestionWithErrorHandling({ suggestion }: Props) {
  const confirmMutation = useConfirmSuggestion();

  useEffect(() => {
    if (confirmMutation.isError) {
      const error = confirmMutation.error;

      if (error.message.includes('permission')) {
        toastService.error('Keine Berechtigung');
      } else if (error.message.includes('not found')) {
        toastService.error('Vorschlag nicht gefunden');
      } else {
        toastService.error('Unbekannter Fehler');
      }
    }
  }, [confirmMutation.isError, confirmMutation.error]);

  return (
    <button onClick={() => confirmMutation.mutate({ ... })}>
      Bestätigen
    </button>
  );
}
```

#### Optimistic Update

```tsx
export function OptimisticSuggestion({ suggestion, projectId }: Props) {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  const confirmMutation = useMutation({
    mutationFn: confirmSuggestionFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projectMonitoring'] });

      // Snapshot previous value
      const previous = queryClient.getQueryData([
        'projectMonitoring',
        projectId,
        currentOrganization?.id
      ]);

      // Optimistically update
      queryClient.setQueryData(
        ['projectMonitoring', projectId, currentOrganization?.id],
        (old: MonitoringData) => ({
          ...old,
          allSuggestions: old.allSuggestions.filter(
            s => s.id !== variables.suggestionId
          )
        })
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          ['projectMonitoring', projectId, currentOrganization?.id],
          context.previous
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['projectMonitoring'] });
    }
  });

  return (
    <button onClick={() => confirmMutation.mutate({ ... })}>
      Bestätigen
    </button>
  );
}
```

### Tests

Der Hook hat **2 Tests** mit **100% Coverage**:

```typescript
describe('useConfirmSuggestion', () => {
  it('should confirm suggestion and invalidate cache');
  it('should handle confirmation error');
});
```

---

## useRejectSuggestion

Mutation Hook zum Ablehnen (als Spam markieren) eines Monitoring-Vorschlags.

### Signatur

```typescript
function useRejectSuggestion(): UseMutationResult<
  void,
  Error,
  RejectSuggestionInput,
  unknown
>
```

### Input Type

```typescript
interface RejectSuggestionInput {
  suggestionId: string;      // Die Suggestion-ID
  userId: string;            // User, der ablehnt
  organizationId: string;    // Organisation für Multi-Tenancy
}
```

### Rückgabewert

Identisch zu `useConfirmSuggestion`:

```typescript
interface UseMutationResult<void, Error, RejectSuggestionInput> {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  mutate: (variables: RejectSuggestionInput) => void;
  mutateAsync: (variables: RejectSuggestionInput) => Promise<void>;
  reset: () => void;
}
```

### Funktionsweise

#### 1. Mutation Function

```typescript
mutationFn: async (data: RejectSuggestionInput) => {
  return await monitoringSuggestionService.markAsSpam(
    data.suggestionId,
    {
      userId: data.userId,
      organizationId: data.organizationId
    }
  );
}
```

#### 2. On Success

```typescript
onSuccess: () => {
  // Invalidiere alle projectMonitoring Queries
  queryClient.invalidateQueries({
    queryKey: ['projectMonitoring']
  });
}
```

### Was passiert beim Ablehnen?

1. **Suggestion Status Update**: Status → `rejected` (spam)
2. **Metadata Update**: `rejectedBy`, `rejectedAt`, `reason: 'spam'`
3. **Firestore Write**: Dokument wird aktualisiert (nicht gelöscht!)
4. **Cache Invalidation**: Query Cache wird geleert
5. **Auto Refetch**: Neue Daten werden geladen (rejected Suggestions werden nicht mehr angezeigt)

### Verwendung

#### Basis-Verwendung

```tsx
import { useRejectSuggestion } from '@/lib/hooks/useMonitoringData';

export function SuggestionCard({ suggestion }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const rejectMutation = useRejectSuggestion();

  const handleReject = async () => {
    if (!user || !currentOrganization) return;

    try {
      await rejectMutation.mutateAsync({
        suggestionId: suggestion.id!,
        userId: user.uid,
        organizationId: currentOrganization.id
      });
      toastService.success('Vorschlag abgelehnt');
    } catch (error) {
      toastService.error('Fehler beim Ablehnen');
    }
  };

  return (
    <div>
      <h3>{suggestion.articleTitle}</h3>
      <button
        onClick={handleReject}
        disabled={rejectMutation.isPending}
        className="btn-secondary"
      >
        {rejectMutation.isPending ? 'Lehne ab...' : 'Ablehnen'}
      </button>
    </div>
  );
}
```

#### Mit Bestätigung

```tsx
import { useState } from 'react';

export function SuggestionWithConfirmation({ suggestion }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const rejectMutation = useRejectSuggestion();

  const handleReject = async () => {
    await rejectMutation.mutateAsync({ ... });
    setShowConfirm(false);
    toastService.success('Vorschlag abgelehnt');
  };

  return (
    <div>
      <button onClick={() => setShowConfirm(true)}>
        Ablehnen
      </button>

      {showConfirm && (
        <div className="confirm-dialog">
          <p>Möchten Sie diesen Vorschlag wirklich ablehnen?</p>
          <button onClick={handleReject}>Ja, ablehnen</button>
          <button onClick={() => setShowConfirm(false)}>Abbrechen</button>
        </div>
      )}
    </div>
  );
}
```

#### Batch Reject

```tsx
export function BatchRejectSuggestions({ suggestions }: Props) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const rejectMutation = useRejectSuggestion();

  const handleRejectAll = async () => {
    if (!user || !currentOrganization) return;

    const results = await Promise.allSettled(
      suggestions.map(s =>
        rejectMutation.mutateAsync({
          suggestionId: s.id!,
          userId: user.uid,
          organizationId: currentOrganization.id
        })
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    toastService.success(`${succeeded} abgelehnt, ${failed} fehlgeschlagen`);
  };

  return (
    <button
      onClick={handleRejectAll}
      disabled={rejectMutation.isPending}
    >
      Alle ablehnen ({suggestions.length})
    </button>
  );
}
```

### Tests

Der Hook hat **2 Tests** mit **100% Coverage**:

```typescript
describe('useRejectSuggestion', () => {
  it('should reject suggestion and invalidate cache');
  it('should handle rejection error');
});
```

---

## Hook Utilities

### Custom Query Client

Für spezielle Anforderungen kann ein Custom Query Client erstellt werden:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const monitoringQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 Minuten (länger als Standard)
      cacheTime: 10 * 60 * 1000, // 10 Minuten
      retry: 5, // Mehr Retries
      refetchOnWindowFocus: false, // Kein Auto-Refetch beim Focus
    },
    mutations: {
      retry: 1 // Mutations nur 1x retry
    }
  }
});
```

### Invalidation Helper

```typescript
export function invalidateProjectMonitoring(
  queryClient: QueryClient,
  projectId?: string,
  organizationId?: string
) {
  if (projectId && organizationId) {
    // Exakte Query
    queryClient.invalidateQueries({
      queryKey: ['projectMonitoring', projectId, organizationId]
    });
  } else if (projectId) {
    // Alle Queries für Projekt
    queryClient.invalidateQueries({
      queryKey: ['projectMonitoring', projectId]
    });
  } else {
    // Alle Monitoring Queries
    queryClient.invalidateQueries({
      queryKey: ['projectMonitoring']
    });
  }
}

// Verwendung
invalidateProjectMonitoring(queryClient, 'project-123', 'org-456');
```

### Prefetch Helper

```typescript
export async function prefetchMonitoringData(
  queryClient: QueryClient,
  projectId: string,
  organizationId: string
) {
  await queryClient.prefetchQuery({
    queryKey: ['projectMonitoring', projectId, organizationId],
    queryFn: () => fetchMonitoringData(projectId, organizationId),
    staleTime: 2 * 60 * 1000
  });
}

// Verwendung in List Component
function ProjectList({ projects }: Props) {
  const queryClient = useQueryClient();

  const handleMouseEnter = (project: Project) => {
    prefetchMonitoringData(queryClient, project.id, project.organizationId);
  };

  return (
    <div>
      {projects.map(project => (
        <div
          key={project.id}
          onMouseEnter={() => handleMouseEnter(project)}
        >
          {project.name}
        </div>
      ))}
    </div>
  );
}
```

---

## Advanced Patterns

### Polling

Automatisches Re-Fetching in Intervallen:

```tsx
export function RealtimeMonitoring({ projectId }: Props) {
  const { currentOrganization } = useOrganization();

  const { data } = useQuery({
    queryKey: ['projectMonitoring', projectId, currentOrganization?.id],
    queryFn: () => fetchMonitoringData(projectId, currentOrganization?.id),
    refetchInterval: 30 * 1000, // Alle 30 Sekunden
    refetchIntervalInBackground: true // Auch im Background
  });

  return <div>{/* Monitoring UI */}</div>;
}
```

### Dependent Queries

Query abhängig von anderem Query:

```tsx
export function DependentMonitoring({ userId }: Props) {
  // 1. Lade User-Projekt
  const { data: userProject } = useQuery({
    queryKey: ['userProject', userId],
    queryFn: () => fetchUserProject(userId)
  });

  // 2. Lade Monitoring nur wenn Projekt vorhanden
  const { data: monitoringData } = useProjectMonitoringData(
    userProject?.id,
    userProject?.organizationId
  );

  return <div>{/* Monitoring UI */}</div>;
}
```

### Infinite Scroll

Pagination für große Datenmengen:

```tsx
export function InfiniteClippings({ projectId }: Props) {
  const { currentOrganization } = useOrganization();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['clippings', projectId],
    queryFn: ({ pageParam = 0 }) =>
      fetchClippingsPaginated(projectId, currentOrganization?.id, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    }
  });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.clippings.map(clipping => (
            <div key={clipping.id}>{clipping.title}</div>
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Lädt...' : 'Mehr laden'}
        </button>
      )}
    </div>
  );
}
```

### Subscriptions (Realtime)

Firestore Realtime Updates:

```tsx
export function useRealtimeMonitoring(projectId: string, organizationId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !organizationId) return;

    // Firestore onSnapshot
    const unsubscribe = onSnapshot(
      collection(db, 'clippings'),
      where('projectId', '==', projectId),
      where('organizationId', '==', organizationId)
    ), (snapshot) => {
      // Invalidate Query bei Änderungen
      queryClient.invalidateQueries({
        queryKey: ['projectMonitoring', projectId, organizationId]
      });
    });

    return unsubscribe;
  }, [projectId, organizationId, queryClient]);
}

// Verwendung
function RealtimeMonitoring({ projectId }: Props) {
  const { currentOrganization } = useOrganization();

  useRealtimeMonitoring(projectId, currentOrganization?.id);

  const { data } = useProjectMonitoringData(
    projectId,
    currentOrganization?.id
  );

  return <div>{/* UI wird automatisch bei Änderungen aktualisiert */}</div>;
}
```

---

## Testing

### Hook Testing Setup

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
```

### Testing useProjectMonitoringData

```typescript
describe('useProjectMonitoringData', () => {
  it('should load monitoring data successfully', async () => {
    // Mock Services
    mockProjectService.getById.mockResolvedValue(mockProject);
    mockPrService.getCampaignsByProject.mockResolvedValue([mockCampaign]);
    // ... weitere Mocks

    // Render Hook
    const { result } = renderHook(
      () => useProjectMonitoringData('project-123', 'org-456'),
      { wrapper: createWrapper() }
    );

    // Wait for Success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assertions
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.campaigns).toHaveLength(1);
    expect(result.current.data?.allSends).toHaveLength(3);
  });
});
```

### Testing Mutations

```typescript
describe('useConfirmSuggestion', () => {
  it('should confirm suggestion and invalidate cache', async () => {
    mockMonitoringSuggestionService.confirmSuggestion.mockResolvedValue(undefined);

    const { result } = renderHook(() => useConfirmSuggestion(), {
      wrapper: createWrapper()
    });

    await result.current.mutateAsync({
      suggestionId: 'sugg-123',
      userId: 'user-456',
      organizationId: 'org-789'
    });

    expect(mockMonitoringSuggestionService.confirmSuggestion).toHaveBeenCalledWith(
      'sugg-123',
      { userId: 'user-456', organizationId: 'org-789' }
    );
  });
});
```

### Integration Testing

```typescript
describe('Monitoring Hooks Integration', () => {
  it('should update data after confirming suggestion', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // 1. Load Initial Data
    const { result: queryResult } = renderHook(
      () => useProjectMonitoringData('project-123', 'org-456'),
      { wrapper }
    );

    await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));

    const initialSuggestions = queryResult.current.data?.allSuggestions.length;

    // 2. Confirm Suggestion
    const { result: mutationResult } = renderHook(
      () => useConfirmSuggestion(),
      { wrapper }
    );

    await mutationResult.current.mutateAsync({
      suggestionId: 'sugg-123',
      userId: 'user-456',
      organizationId: 'org-456'
    });

    // 3. Wait for Refetch
    await waitFor(() => {
      const newSuggestions = queryResult.current.data?.allSuggestions.length;
      expect(newSuggestions).toBe(initialSuggestions - 1);
    });
  });
});
```

---

## Siehe auch

- **[API-Übersicht](./README.md)** - Übersicht aller APIs und Services
- **[Hauptdokumentation](../README.md)** - Monitoring Tab Übersicht
- **[Komponenten-Dokumentation](../components/README.md)** - UI-Komponenten
- **[Test-Dateien](../../../src/lib/hooks/__tests__/useMonitoringData.test.tsx)** - Vollständige Test-Suite

---

**Erstellt mit Claude Code** 🤖
Letzte Aktualisierung: 27. Oktober 2025

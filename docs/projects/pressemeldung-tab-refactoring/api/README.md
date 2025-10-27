# Pressemeldung Tab - API-Übersicht

> **Modul**: Pressemeldung Tab API
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-27

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [React Query Hooks](#react-query-hooks)
- [Service-Funktionen](#service-funktionen)
- [Schnellreferenz](#schnellreferenz)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Die Pressemeldung Tab API besteht aus vier Haupt-Hooks, die auf React Query basieren. Diese Hooks abstrahieren die Komplexität des Daten-Ladens und bieten automatisches Caching, Refetching und Error Handling.

### Verfügbare Hooks

| Hook | Zweck | Return Type |
|------|-------|-------------|
| `useProjectCampaigns` | Lädt Kampagnen für ein Projekt | `UseQueryResult<PRCampaign[]>` |
| `useProjectApprovals` | Lädt Freigaben für ein Projekt | `UseQueryResult<ApprovalEnhanced[]>` |
| `useProjectPressData` | Kombiniert Campaigns + Approvals | `{ campaigns, approvals, isLoading, refetch }` |
| `useUpdateCampaign` | Update-Mutation für Kampagnen | `UseMutationResult` |

---

## React Query Hooks

### useProjectCampaigns

Lädt alle PR-Kampagnen für ein Projekt. Kombiniert automatisch den alten Ansatz (`linkedCampaigns`) mit dem neuen Ansatz (`projectId`-basiert).

**Import:**
```typescript
import { useProjectCampaigns } from '@/lib/hooks/useCampaignData';
```

**Signatur:**
```typescript
function useProjectCampaigns(
  projectId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<PRCampaign[], Error>
```

**Parameter:**
- `projectId` (string | undefined) - ID des Projekts
- `organizationId` (string | undefined) - ID der Organisation

**Return Value:**
```typescript
{
  data: PRCampaign[];          // Array der Kampagnen
  isLoading: boolean;          // Lädt Initial-Daten
  isFetching: boolean;         // Lädt neue Daten (auch bei Cache)
  isError: boolean;            // Fehler aufgetreten
  error: Error | null;         // Fehler-Objekt
  isSuccess: boolean;          // Daten erfolgreich geladen
  refetch: () => void;         // Manuelles Neu-Laden
}
```

**Cache-Konfiguration:**
- `staleTime: 0` - Daten sind sofort "stale"
- `gcTime: 5 * 60 * 1000` - Cache wird nach 5 Minuten gelöscht
- `enabled: !!projectId && !!organizationId` - Nur aktiv wenn IDs vorhanden

---

### useProjectApprovals

Lädt alle Freigaben (Approvals) für ein Projekt.

**Import:**
```typescript
import { useProjectApprovals } from '@/lib/hooks/useCampaignData';
```

**Signatur:**
```typescript
function useProjectApprovals(
  projectId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<ApprovalEnhanced[], Error>
```

**Parameter:**
- `projectId` (string | undefined) - ID des Projekts
- `organizationId` (string | undefined) - ID der Organisation

**Return Value:**
```typescript
{
  data: ApprovalEnhanced[];    // Array der Freigaben
  isLoading: boolean;          // Lädt Initial-Daten
  isFetching: boolean;         // Lädt neue Daten
  isError: boolean;            // Fehler aufgetreten
  error: Error | null;         // Fehler-Objekt
  isSuccess: boolean;          // Daten erfolgreich geladen
  refetch: () => void;         // Manuelles Neu-Laden
}
```

**Cache-Konfiguration:**
- `staleTime: 2 * 60 * 1000` - Daten sind 2 Minuten "fresh"
- `enabled: !!projectId && !!organizationId` - Nur aktiv wenn IDs vorhanden

---

### useProjectPressData

**Kombinierter Hook** für Campaigns + Approvals. Lädt beide Datensätze parallel und bietet ein vereinfachtes Interface.

**Import:**
```typescript
import { useProjectPressData } from '@/lib/hooks/useCampaignData';
```

**Signatur:**
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

**Parameter:**
- `projectId` (string | undefined) - ID des Projekts
- `organizationId` (string | undefined) - ID der Organisation

**Return Value:**
```typescript
{
  campaigns: PRCampaign[];           // Array der Kampagnen (default: [])
  approvals: ApprovalEnhanced[];     // Array der Freigaben (default: [])
  isLoading: boolean;                // true wenn einer der Hooks lädt
  isError: boolean;                  // true wenn einer der Hooks einen Fehler hat
  error: Error | null;               // Erster aufgetretener Fehler
  refetch: () => void;               // Lädt beide Datensätze neu
}
```

**Vorteile:**
- Vereinfachtes Interface
- Paralleles Laden (bessere Performance)
- Unified Loading State
- Ein Refetch für beide Datensätze

---

### useUpdateCampaign

Mutation-Hook zum Aktualisieren von Kampagnen. Invalidiert automatisch den Cache nach erfolgreicher Mutation.

**Import:**
```typescript
import { useUpdateCampaign } from '@/lib/hooks/useCampaignData';
```

**Signatur:**
```typescript
function useUpdateCampaign(): UseMutationResult<
  void,
  Error,
  { id: string; organizationId: string; campaignData: any }
>
```

**Return Value:**
```typescript
{
  mutate: (data: { id, organizationId, campaignData }) => void;  // Führt Update aus
  mutateAsync: (data) => Promise<void>;                          // Async-Version
  isLoading: boolean;                                             // Update läuft
  isError: boolean;                                               // Fehler aufgetreten
  error: Error | null;                                            // Fehler-Objekt
  isSuccess: boolean;                                             // Update erfolgreich
  reset: () => void;                                              // Reset State
}
```

**Auto-Invalidierung:**
Nach erfolgreicher Mutation werden alle `project-campaigns` Queries invalidiert:
```typescript
queryClient.invalidateQueries({
  queryKey: ['project-campaigns']
});
```

---

## Service-Funktionen

Die Hooks verwenden folgende Firebase Services:

### prService (PR Campaign Service)

**Verwendete Funktionen:**

```typescript
// Einzelne Kampagne laden
prService.getById(campaignId: string): Promise<PRCampaign>

// Kampagnen für Projekt laden
prService.getCampaignsByProject(
  projectId: string,
  organizationId: string
): Promise<PRCampaign[]>

// Kampagne aktualisieren
prService.update(
  campaignId: string,
  data: Partial<PRCampaign>
): Promise<void>

// Kampagne löschen
prService.delete(campaignId: string): Promise<void>
```

### projectService (Project Service)

```typescript
// Projekt laden
projectService.getById(
  projectId: string,
  options: { organizationId: string }
): Promise<Project>

// Projekt-Ressourcen initialisieren (Kampagne erstellen)
projectService.initializeProjectResources(
  projectId: string,
  options: {
    createCampaign: boolean;
    campaignTitle: string;
    attachAssets: string[];
    linkDistributionLists: string[];
    createTasks: boolean;
    notifyTeam: boolean;
  },
  organizationId: string
): Promise<{
  campaignCreated: boolean;
  campaignId?: string;
}>
```

### approvalServiceExtended (Approval Service)

```typescript
// Freigaben für Projekt laden
approvalServiceExtended.getApprovalsByProject(
  projectId: string,
  organizationId: string
): Promise<ApprovalEnhanced[]>
```

---

## Schnellreferenz

### Typische Anwendungsfälle

| Anwendungsfall | Hook | Code |
|----------------|------|------|
| Kampagnen anzeigen | `useProjectCampaigns` | `const { data: campaigns } = useProjectCampaigns(projectId, orgId);` |
| Freigaben anzeigen | `useProjectApprovals` | `const { data: approvals } = useProjectApprovals(projectId, orgId);` |
| Beide anzeigen | `useProjectPressData` | `const { campaigns, approvals } = useProjectPressData(projectId, orgId);` |
| Kampagne updaten | `useUpdateCampaign` | `const { mutate } = useUpdateCampaign(); mutate({ id, orgId, data });` |
| Daten neu laden | Beliebiger Hook | `refetch();` |

---

## Verwendungsbeispiele

### Beispiel 1: Kampagnen-Liste anzeigen

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

  return (
    <ul>
      {campaigns.map(campaign => (
        <li key={campaign.id}>{campaign.title}</li>
      ))}
    </ul>
  );
}
```

### Beispiel 2: Combined Hook verwenden

```typescript
import { useProjectPressData } from '@/lib/hooks/useCampaignData';

function PressOverview({ projectId, organizationId }) {
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
    <div>
      <h2>Kampagnen ({campaigns.length})</h2>
      <CampaignTable campaigns={campaigns} onRefresh={refetch} />

      <h2>Freigaben ({approvals.length})</h2>
      <ApprovalTable approvals={approvals} onRefresh={refetch} />
    </div>
  );
}
```

### Beispiel 3: Kampagne aktualisieren

```typescript
import { useUpdateCampaign } from '@/lib/hooks/useCampaignData';
import { toastService } from '@/lib/utils/toast';

function CampaignEditor({ campaignId, organizationId }) {
  const { mutate, isLoading } = useUpdateCampaign();

  const handleSave = (data: Partial<PRCampaign>) => {
    mutate(
      {
        id: campaignId,
        organizationId,
        campaignData: data,
      },
      {
        onSuccess: () => {
          toastService.success('Kampagne gespeichert');
        },
        onError: (error) => {
          toastService.error('Fehler beim Speichern');
          console.error(error);
        },
      }
    );
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSave({ title: e.target.title.value });
    }}>
      <input name="title" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Speichert...' : 'Speichern'}
      </button>
    </form>
  );
}
```

### Beispiel 4: Manuelles Refetching

```typescript
import { useProjectPressData } from '@/lib/hooks/useCampaignData';

function RefreshableList({ projectId, organizationId }) {
  const { campaigns, refetch } = useProjectPressData(projectId, organizationId);

  return (
    <div>
      <button onClick={() => refetch()}>
        Aktualisieren
      </button>
      <CampaignList campaigns={campaigns} />
    </div>
  );
}
```

### Beispiel 5: Conditional Rendering

```typescript
import { useProjectCampaigns } from '@/lib/hooks/useCampaignData';

function CampaignStatus({ projectId, organizationId }) {
  const { data: campaigns, isLoading, isFetching } = useProjectCampaigns(
    projectId,
    organizationId
  );

  return (
    <div>
      {isLoading && <p>Erstmaliges Laden...</p>}
      {isFetching && !isLoading && <p>Aktualisiere Daten...</p>}
      {campaigns && <p>{campaigns.length} Kampagnen geladen</p>}
    </div>
  );
}
```

---

## Error Handling

### Fehlertypen

**1. Network Errors**
```typescript
const { isError, error } = useProjectCampaigns(projectId, orgId);

if (isError && error.message.includes('network')) {
  return <NetworkErrorMessage />;
}
```

**2. Permission Errors**
```typescript
if (isError && error.message.includes('permission')) {
  return <PermissionDeniedMessage />;
}
```

**3. Not Found Errors**
```typescript
if (isError && error.message.includes('not found')) {
  return <NotFoundMessage />;
}
```

### Best Practices für Error Handling

**1. Global Error Boundary**
```typescript
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Fehler: {error.message}</p>
              <button onClick={resetErrorBoundary}>Erneut versuchen</button>
            </div>
          )}
        >
          <YourComponent />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

**2. Component-Level Error Handling**
```typescript
const { data, isError, error, refetch } = useProjectCampaigns(projectId, orgId);

if (isError) {
  return (
    <div className="error-container">
      <p>Fehler beim Laden: {error.message}</p>
      <button onClick={() => refetch()}>Erneut versuchen</button>
    </div>
  );
}
```

**3. Toast Notifications**
```typescript
import { toastService } from '@/lib/utils/toast';

const { mutate } = useUpdateCampaign();

mutate(data, {
  onError: (error) => {
    toastService.error(`Fehler: ${error.message}`);
  },
  onSuccess: () => {
    toastService.success('Erfolgreich gespeichert');
  },
});
```

---

## Best Practices

### 1. Verwende den Combined Hook wo möglich

**Gut:**
```typescript
const { campaigns, approvals, isLoading } = useProjectPressData(projectId, orgId);
```

**Nicht optimal:**
```typescript
const campaigns = useProjectCampaigns(projectId, orgId);
const approvals = useProjectApprovals(projectId, orgId);
const isLoading = campaigns.isLoading || approvals.isLoading;
```

### 2. Destructure nur benötigte Properties

**Gut:**
```typescript
const { data: campaigns, refetch } = useProjectCampaigns(projectId, orgId);
```

**Nicht optimal:**
```typescript
const query = useProjectCampaigns(projectId, orgId);
const campaigns = query.data;
const refetch = query.refetch;
```

### 3. Nutze enabled-Option für bedingte Queries

```typescript
const { data } = useProjectCampaigns(
  projectId,
  organizationId,
  {
    enabled: !!projectId && !!organizationId && userHasPermission,
  }
);
```

### 4. Verwende onSuccess/onError Callbacks

```typescript
const { mutate } = useUpdateCampaign();

mutate(data, {
  onSuccess: () => {
    toastService.success('Gespeichert');
    router.push('/dashboard');
  },
  onError: (error) => {
    toastService.error(error.message);
  },
});
```

### 5. Optimistic Updates für bessere UX

```typescript
const queryClient = useQueryClient();
const { mutate } = useUpdateCampaign();

mutate(data, {
  onMutate: async (newData) => {
    // Cancel laufende Queries
    await queryClient.cancelQueries({ queryKey: ['project-campaigns'] });

    // Snapshot des alten Werts
    const previousData = queryClient.getQueryData(['project-campaigns', projectId]);

    // Optimistisches Update
    queryClient.setQueryData(['project-campaigns', projectId], (old) => ({
      ...old,
      ...newData.campaignData,
    }));

    // Return Context für Rollback
    return { previousData };
  },
  onError: (err, newData, context) => {
    // Rollback bei Fehler
    queryClient.setQueryData(
      ['project-campaigns', projectId],
      context.previousData
    );
  },
});
```

---

## Siehe auch

- [Detaillierte Hook-Referenz](./campaign-hooks.md) - Vollständige API-Dokumentation
- [Komponenten-Dokumentation](../components/README.md) - React-Komponenten
- [Architecture Decision Records](../adr/README.md) - Design-Entscheidungen
- [Hauptdokumentation](../README.md) - Modul-Übersicht

---

**Letzte Aktualisierung**: 2025-10-27
**Version**: 0.1.0

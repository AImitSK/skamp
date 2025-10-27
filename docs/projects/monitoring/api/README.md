# Monitoring Tab - API Übersicht

> **Modul**: Projekt Monitoring Tab API
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 27. Oktober 2025

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [React Query Hooks](#react-query-hooks)
3. [Firebase Services](#firebase-services)
4. [Types & Interfaces](#types--interfaces)
5. [Error Handling](#error-handling)
6. [Performance Considerations](#performance-considerations)
7. [Best Practices](#best-practices)
8. [Code-Beispiele](#code-beispiele)

---

## Übersicht

Die Monitoring Tab API besteht aus drei Hauptkomponenten:

1. **React Query Hooks** - Custom Hooks für Daten-Fetching und Mutations
2. **Firebase Services** - Backend-Services für Firestore-Operationen
3. **Types** - TypeScript-Typen und Interfaces

### Architektur-Übersicht

```
Component Layer
     ↓
React Query Hooks (useMonitoringData.ts)
     ↓
Firebase Services (project-service, pr-service, etc.)
     ↓
Firebase Firestore Database
```

### API-Kategorien

| Kategorie | Anzahl | Beschreibung |
|-----------|--------|--------------|
| **Query Hooks** | 1 | Daten-Fetching (useProjectMonitoringData) |
| **Mutation Hooks** | 2 | Daten-Updates (confirm/reject Suggestion) |
| **Firebase Services** | 5 | Backend CRUD-Operationen |
| **Type Definitions** | 3 | TypeScript Interfaces |

---

## React Query Hooks

### Übersicht

| Hook | Type | Zeilen | Coverage | Beschreibung |
|------|------|--------|----------|--------------|
| `useProjectMonitoringData` | Query | 105 | 94.44% | Lädt alle Monitoring-Daten für ein Projekt |
| `useConfirmSuggestion` | Mutation | 18 | 100% | Bestätigt einen Monitoring-Vorschlag |
| `useRejectSuggestion` | Mutation | 16 | 100% | Lehnt einen Monitoring-Vorschlag ab |

### Quick Reference

#### useProjectMonitoringData

```typescript
function useProjectMonitoringData(
  projectId: string | undefined,
  organizationId: string | undefined
): UseQueryResult<MonitoringData>
```

**Lädt:**
- Kampagnen (via `prService`)
- Sends (via `emailCampaignService`)
- Clippings (via `clippingService`)
- Suggestions (via `monitoringSuggestionService`)

**Return Type:**
```typescript
interface MonitoringData {
  campaigns: Campaign[];       // Kampagnen mit Stats
  allSends: Send[];           // Alle E-Mail-Sends
  allClippings: Clipping[];   // Alle Veröffentlichungen
  allSuggestions: MonitoringSuggestion[]; // Alle Vorschläge
}
```

**Features:**
- ✅ Duplikat-Entfernung
- ✅ Stats-Aggregierung
- ✅ 2-Minuten Cache
- ✅ Auto-Refetch
- ✅ Error Handling

**Verwendung:**
```tsx
const { data, isLoading, error } = useProjectMonitoringData(
  'project-123',
  'org-456'
);
```

#### useConfirmSuggestion

```typescript
function useConfirmSuggestion(): UseMutationResult<void, Error, ConfirmSuggestionInput>
```

**Input:**
```typescript
interface ConfirmSuggestionInput {
  suggestionId: string;
  userId: string;
  organizationId: string;
}
```

**Aktionen:**
- Bestätigt Suggestion in Firestore
- Erstellt Clipping aus Suggestion
- Invalidiert `['projectMonitoring']` Cache

**Verwendung:**
```tsx
const confirmMutation = useConfirmSuggestion();

await confirmMutation.mutateAsync({
  suggestionId: 'sugg-123',
  userId: 'user-456',
  organizationId: 'org-789'
});
```

#### useRejectSuggestion

```typescript
function useRejectSuggestion(): UseMutationResult<void, Error, RejectSuggestionInput>
```

**Input:**
```typescript
interface RejectSuggestionInput {
  suggestionId: string;
  userId: string;
  organizationId: string;
}
```

**Aktionen:**
- Markiert Suggestion als Spam
- Invalidiert `['projectMonitoring']` Cache

**Verwendung:**
```tsx
const rejectMutation = useRejectSuggestion();

await rejectMutation.mutateAsync({
  suggestionId: 'sugg-123',
  userId: 'user-456',
  organizationId: 'org-789'
});
```

---

## Firebase Services

### Übersicht

Die Monitoring Tab API nutzt folgende Firebase Services:

| Service | Datei | Collection | Hauptfunktionen |
|---------|-------|------------|-----------------|
| `projectService` | `project-service.ts` | `projects` | `getById` |
| `prService` | `pr-service.ts` | `campaigns` | `getById`, `getCampaignsByProject` |
| `emailCampaignService` | `email-campaign-service.ts` | `sends` | `getSends` |
| `clippingService` | `clipping-service.ts` | `clippings` | `getByCampaignId` |
| `monitoringSuggestionService` | `monitoring-suggestion-service.ts` | `monitoringSuggestions` | `getByCampaignId`, `confirmSuggestion`, `markAsSpam` |

### Service Details

#### projectService

```typescript
interface ProjectService {
  getById(
    projectId: string,
    options: { organizationId: string }
  ): Promise<Project | null>;
}
```

**Verwendung:**
```typescript
import { projectService } from '@/lib/firebase/project-service';

const project = await projectService.getById('project-123', {
  organizationId: 'org-456'
});
```

#### prService (PR Campaign Service)

```typescript
interface PrService {
  getById(campaignId: string): Promise<Campaign | null>;

  getCampaignsByProject(
    projectId: string,
    organizationId: string
  ): Promise<Campaign[]>;
}
```

**Verwendung:**
```typescript
import { prService } from '@/lib/firebase/pr-service';

// Einzelne Kampagne
const campaign = await prService.getById('campaign-123');

// Alle Kampagnen eines Projekts
const campaigns = await prService.getCampaignsByProject(
  'project-123',
  'org-456'
);
```

#### emailCampaignService

```typescript
interface EmailCampaignService {
  getSends(
    campaignId: string,
    options: { organizationId: string }
  ): Promise<Send[]>;
}
```

**Verwendung:**
```typescript
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';

const sends = await emailCampaignService.getSends('campaign-123', {
  organizationId: 'org-456'
});
```

#### clippingService

```typescript
interface ClippingService {
  getByCampaignId(
    campaignId: string,
    options: { organizationId: string }
  ): Promise<Clipping[]>;
}
```

**Verwendung:**
```typescript
import { clippingService } from '@/lib/firebase/clipping-service';

const clippings = await clippingService.getByCampaignId('campaign-123', {
  organizationId: 'org-456'
});
```

#### monitoringSuggestionService

```typescript
interface MonitoringSuggestionService {
  getByCampaignId(
    campaignId: string,
    organizationId: string
  ): Promise<MonitoringSuggestion[]>;

  confirmSuggestion(
    suggestionId: string,
    options: { userId: string; organizationId: string }
  ): Promise<void>;

  markAsSpam(
    suggestionId: string,
    options: { userId: string; organizationId: string }
  ): Promise<void>;
}
```

**Verwendung:**
```typescript
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';

// Laden
const suggestions = await monitoringSuggestionService.getByCampaignId(
  'campaign-123',
  'org-456'
);

// Bestätigen
await monitoringSuggestionService.confirmSuggestion('sugg-123', {
  userId: 'user-456',
  organizationId: 'org-789'
});

// Ablehnen
await monitoringSuggestionService.markAsSpam('sugg-123', {
  userId: 'user-456',
  organizationId: 'org-789'
});
```

---

## Types & Interfaces

### MonitoringData

Hauptdaten-Struktur, die von `useProjectMonitoringData` zurückgegeben wird:

```typescript
interface MonitoringData {
  campaigns: CampaignWithStats[];
  allSends: Send[];
  allClippings: Clipping[];
  allSuggestions: MonitoringSuggestion[];
}
```

### CampaignWithStats

Kampagne mit aggregierten Statistiken:

```typescript
interface CampaignWithStats extends Campaign {
  stats: {
    total: number;       // Gesamtzahl Sends
    delivered: number;   // Zugestellt
    opened: number;      // Geöffnet
    clicked: number;     // Geklickt
    bounced: number;     // Bounced
    clippings: number;   // Anzahl Clippings
  };
}
```

### Send

E-Mail Send mit Status:

```typescript
interface Send {
  id?: string;
  campaignId: string;
  recipientId: string;
  email: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sentAt?: Timestamp;
  openedAt?: Timestamp;
  clickedAt?: Timestamp;
}
```

### Clipping

Medienveröffentlichung:

```typescript
interface Clipping {
  id?: string;
  campaignId: string;
  title: string;
  outletName: string;
  publishedAt?: Timestamp;
  reach?: number;
  detectionMethod: 'manual' | 'automated';
  url?: string;
}
```

### MonitoringSuggestion

KI-generierter Vorschlag:

```typescript
interface MonitoringSuggestion {
  id?: string;
  campaignId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  articleTitle: string;
  highestMatchScore: number;
  sources: Array<{
    sourceName: string;
    sourceUrl: string;
    matchScore: number;
  }>;
  createdAt: Timestamp;
  processedAt?: Timestamp;
}
```

### MonitoringConfig

Konfiguration für Monitoring Panel:

```typescript
interface MonitoringConfig {
  isEnabled: boolean;
  monitoringPeriod: 30 | 90 | 365;
  autoTransition: boolean;
  providers: MonitoringProvider[];
  alertThresholds: {
    minReach: number;
    sentimentAlert: number;
    competitorMentions: number;
  };
  reportSchedule: 'daily' | 'weekly' | 'monthly';
}
```

### MonitoringProvider

Provider-Konfiguration:

```typescript
interface MonitoringProvider {
  name: 'landau' | 'pmg' | 'custom';
  apiEndpoint: string;
  isEnabled: boolean;
  supportedMetrics: Array<'reach' | 'sentiment' | 'mentions' | 'social'>;
}
```

---

## Error Handling

### Query Errors

React Query behandelt Errors automatisch mit 3 Retries:

```typescript
const { data, error, isError } = useProjectMonitoringData(projectId, orgId);

if (isError) {
  console.error('Query Error:', error);
  // Error Type: Error
  // Error Message: error.message
}
```

### Mutation Errors

Mutations werfen Errors, die mit try-catch gefangen werden können:

```typescript
const confirmMutation = useConfirmSuggestion();

try {
  await confirmMutation.mutateAsync({ suggestionId, userId, organizationId });
  toastService.success('Erfolgreich bestätigt');
} catch (error) {
  console.error('Mutation Error:', error);
  toastService.error('Fehler beim Bestätigen');
}
```

### Custom Error Types

```typescript
class MonitoringError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_INPUT'
  ) {
    super(message);
    this.name = 'MonitoringError';
  }
}

// Verwendung
if (!project) {
  throw new MonitoringError('Projekt nicht gefunden', 'NOT_FOUND');
}
```

### Error Boundaries

Für kritische Fehler sollten Error Boundaries verwendet werden:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="error-container">
      <h2>Fehler beim Laden der Monitoring-Daten</h2>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>
        Seite neu laden
      </button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <ProjectMonitoringTab projectId={projectId} />
</ErrorBoundary>
```

---

## Performance Considerations

### Query Stale Time

```typescript
// In useProjectMonitoringData
staleTime: 2 * 60 * 1000 // 2 Minuten
```

**Bedeutung:**
- Daten werden für 2 Minuten als "fresh" betrachtet
- Kein Network Request bei Component Remount innerhalb von 2 Minuten
- Background Refetch nur nach 2 Minuten

**Anpassung:**
```typescript
// Für echtzeitigere Daten
staleTime: 30 * 1000 // 30 Sekunden

// Für selten ändernde Daten
staleTime: 10 * 60 * 1000 // 10 Minuten
```

### Cache Time

```typescript
// Default React Query Cache Time: 5 Minuten
cacheTime: 5 * 60 * 1000
```

**Bedeutung:**
- Inactive Queries werden 5 Minuten gecached
- Nach 5 Minuten Garbage Collection

### Prefetching

Für bessere Performance können Daten vorab geladen werden:

```typescript
import { useQueryClient } from '@tanstack/react-query';

function ProjectCard({ projectId }: Props) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch beim Hover
    queryClient.prefetchQuery({
      queryKey: ['projectMonitoring', projectId, organizationId],
      queryFn: () => fetchMonitoringData(projectId, organizationId)
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {/* ... */}
    </div>
  );
}
```

### Selective Invalidation

Nur relevante Queries invalidieren:

```typescript
// SCHLECHT: Alle Queries invalidieren
queryClient.invalidateQueries();

// GUT: Nur Monitoring Queries
queryClient.invalidateQueries({ queryKey: ['projectMonitoring'] });

// BESSER: Nur spezifisches Projekt
queryClient.invalidateQueries({
  queryKey: ['projectMonitoring', projectId]
});
```

### Parallel Fetching

`useProjectMonitoringData` nutzt `Promise.all` für parallele Requests:

```typescript
// Parallel statt Sequential
const [sends, clippings, suggestions] = await Promise.all([
  emailCampaignService.getSends(campaignId, { organizationId }),
  clippingService.getByCampaignId(campaignId, { organizationId }),
  monitoringSuggestionService.getByCampaignId(campaignId, organizationId)
]);
```

**Performance-Gewinn:**
- Sequential: 300ms + 200ms + 150ms = 650ms
- Parallel: max(300ms, 200ms, 150ms) = 300ms

---

## Best Practices

### 1. Immer organizationId mitgeben

```typescript
// ❌ FALSCH
const { data } = useProjectMonitoringData(projectId, undefined);

// ✅ RICHTIG
const { currentOrganization } = useOrganization();
const { data } = useProjectMonitoringData(projectId, currentOrganization?.id);
```

### 2. Loading States behandeln

```typescript
// ❌ FALSCH
const { data } = useProjectMonitoringData(projectId, orgId);
return <div>{data.campaigns.length}</div>; // Crash wenn data undefined!

// ✅ RICHTIG
const { data, isLoading } = useProjectMonitoringData(projectId, orgId);

if (isLoading) return <LoadingState />;
if (!data) return <EmptyState />;

return <div>{data.campaigns.length}</div>;
```

### 3. Error Handling

```typescript
// ❌ FALSCH
const { data } = useProjectMonitoringData(projectId, orgId);
// Ignoriert Errors komplett

// ✅ RICHTIG
const { data, error } = useProjectMonitoringData(projectId, orgId);

if (error) {
  return <ErrorState message={error.message} />;
}
```

### 4. Mutation Feedback

```typescript
// ❌ FALSCH
const confirmMutation = useConfirmSuggestion();
await confirmMutation.mutateAsync({ ... });
// Keine User-Feedback

// ✅ RICHTIG
const confirmMutation = useConfirmSuggestion();

try {
  await confirmMutation.mutateAsync({ ... });
  toastService.success('Vorschlag bestätigt');
} catch (error) {
  toastService.error('Fehler beim Bestätigen');
}
```

### 5. Optional Chaining

```typescript
// ❌ FALSCH
const campaignName = data.campaigns[0].name;

// ✅ RICHTIG
const campaignName = data?.campaigns?.[0]?.name || 'Unbekannt';
```

### 6. TypeScript Strict Mode

```typescript
// ❌ FALSCH
const handleConfirm = (suggestionId: any) => { ... }

// ✅ RICHTIG
const handleConfirm = (suggestionId: string) => { ... }
```

---

## Code-Beispiele

### Vollständiges Component-Beispiel

```tsx
'use client';

import { useProjectMonitoringData, useConfirmSuggestion } from '@/lib/hooks/useMonitoringData';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';
import LoadingState from '@/components/projects/monitoring/LoadingState';
import EmptyState from '@/components/projects/monitoring/EmptyState';

interface MonitoringDashboardProps {
  projectId: string;
}

export function MonitoringDashboard({ projectId }: MonitoringDashboardProps) {
  // Context
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  // Query Hook
  const { data, isLoading, error, refetch } = useProjectMonitoringData(
    projectId,
    currentOrganization?.id
  );

  // Mutation Hook
  const confirmMutation = useConfirmSuggestion();

  // Handler
  const handleConfirmSuggestion = async (suggestionId: string) => {
    if (!user || !currentOrganization) {
      toastService.error('Authentifizierung erforderlich');
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        suggestionId,
        userId: user.uid,
        organizationId: currentOrganization.id
      });
      toastService.success('Vorschlag bestätigt');
    } catch (error) {
      console.error('Fehler:', error);
      toastService.error('Fehler beim Bestätigen');
    }
  };

  // Loading State
  if (isLoading) {
    return <LoadingState message="Lade Monitoring-Daten..." />;
  }

  // Error State
  if (error) {
    return (
      <EmptyState
        title="Fehler beim Laden"
        description={error.message}
      />
    );
  }

  // Empty State
  if (!data || data.campaigns.length === 0) {
    return (
      <EmptyState
        title="Noch keine Monitoring-Aktivitäten"
        description="Versende eine Kampagne oder erfasse eine Veröffentlichung"
      />
    );
  }

  // Success State
  return (
    <div className="space-y-6">
      <h2>Monitoring Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-value">{data.campaigns.length}</div>
          <div className="stat-label">Kampagnen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.allClippings.length}</div>
          <div className="stat-label">Veröffentlichungen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {data.allSuggestions.filter(s => s.status === 'pending').length}
          </div>
          <div className="stat-label">Zu prüfen</div>
        </div>
      </div>

      {/* Pending Suggestions */}
      {data.allSuggestions.filter(s => s.status === 'pending').length > 0 && (
        <div className="suggestions-section">
          <h3>Pending Vorschläge</h3>
          {data.allSuggestions
            .filter(s => s.status === 'pending')
            .map(suggestion => (
              <div key={suggestion.id} className="suggestion-card">
                <div className="suggestion-info">
                  <h4>{suggestion.articleTitle}</h4>
                  <p>Match: {suggestion.highestMatchScore}%</p>
                </div>
                <button
                  onClick={() => handleConfirmSuggestion(suggestion.id!)}
                  disabled={confirmMutation.isPending}
                  className="btn btn-primary"
                >
                  {confirmMutation.isPending ? 'Bestätige...' : 'Bestätigen'}
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Campaigns */}
      <div className="campaigns-section">
        <h3>Kampagnen</h3>
        {data.campaigns.map(campaign => (
          <div key={campaign.id} className="campaign-card">
            <h4>{campaign.name}</h4>
            <div className="campaign-stats">
              <span>Sends: {campaign.stats.total}</span>
              <span>Geöffnet: {campaign.stats.opened}</span>
              <span>Clippings: {campaign.stats.clippings}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Custom Hook mit Transformierung

```typescript
import { useProjectMonitoringData } from '@/lib/hooks/useMonitoringData';
import { useMemo } from 'react';

interface MonitoringStats {
  totalCampaigns: number;
  totalClippings: number;
  totalReach: number;
  averageOpenRate: number;
  pendingSuggestions: number;
}

export function useMonitoringStats(
  projectId: string,
  organizationId?: string
): MonitoringStats | undefined {
  const { data } = useProjectMonitoringData(projectId, organizationId);

  return useMemo(() => {
    if (!data) return undefined;

    const totalCampaigns = data.campaigns.length;
    const totalClippings = data.allClippings.length;
    const totalReach = data.allClippings.reduce((sum, c) => sum + (c.reach || 0), 0);

    const totalSends = data.campaigns.reduce((sum, c) => sum + c.stats.total, 0);
    const totalOpened = data.campaigns.reduce((sum, c) => sum + c.stats.opened, 0);
    const averageOpenRate = totalSends > 0 ? (totalOpened / totalSends) * 100 : 0;

    const pendingSuggestions = data.allSuggestions.filter(s => s.status === 'pending').length;

    return {
      totalCampaigns,
      totalClippings,
      totalReach,
      averageOpenRate: Math.round(averageOpenRate),
      pendingSuggestions
    };
  }, [data]);
}

// Verwendung
const stats = useMonitoringStats(projectId, organizationId);
console.log('Durchschnittliche Öffnungsrate:', stats?.averageOpenRate);
```

### Batch-Operations

```typescript
import { useConfirmSuggestion } from '@/lib/hooks/useMonitoringData';

export function useBatchConfirmSuggestions() {
  const confirmMutation = useConfirmSuggestion();

  const confirmAll = async (
    suggestionIds: string[],
    userId: string,
    organizationId: string
  ) => {
    const results = await Promise.allSettled(
      suggestionIds.map(suggestionId =>
        confirmMutation.mutateAsync({ suggestionId, userId, organizationId })
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { succeeded, failed };
  };

  return { confirmAll, isPending: confirmMutation.isPending };
}

// Verwendung
const { confirmAll } = useBatchConfirmSuggestions();

const handleConfirmAll = async () => {
  const { succeeded, failed } = await confirmAll(
    ['sugg-1', 'sugg-2', 'sugg-3'],
    user.uid,
    currentOrganization.id
  );

  toastService.success(`${succeeded} bestätigt, ${failed} fehlgeschlagen`);
};
```

---

## Siehe auch

- **[Detaillierte Hook-Dokumentation](./monitoring-hooks.md)** - Vollständige API-Referenz für alle Hooks
- **[Hauptdokumentation](../README.md)** - Monitoring Tab Übersicht
- **[Komponenten-Dokumentation](../components/README.md)** - UI-Komponenten Referenz
- **[Architecture Decision Records](../adr/README.md)** - Architektur-Entscheidungen

---

**Erstellt mit Claude Code** 🤖
Letzte Aktualisierung: 27. Oktober 2025

# Overview Tab API - Übersicht

> **Modul**: Overview Tab API
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-22

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [API-Module](#api-module)
- [Schnellreferenz](#schnellreferenz)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Die **Overview Tab API** besteht aus mehreren Modulen, die zusammen die Funktionalität des Overview-Tabs bereitstellen. Die API basiert auf React Hooks, React Query für Data Fetching, und Utility-Funktionen für Business Logic.

### Hauptkomponenten

1. **useProjectTasks Hook** - React Query Hook für Task-Loading und Progress-Berechnung
2. **progress-helpers** - Utility-Funktionen für Progress-Farben und Status-Labels
3. **ProjectContext** - React Context für globalen Project-State
4. **PIPELINE_STAGE_PROGRESS** - Konstante für Pipeline-Fortschritt-Mapping

---

## API-Module

### 1. useProjectTasks Hook

**Datei**: `src/lib/hooks/useProjectTasks.ts`

**Zweck**: React Query Hook für Task-Loading mit automatischem Caching und Progress-Berechnung.

**Signatur**:
```typescript
function useProjectTasks(
  projectId: string | undefined,
  organizationId: string | undefined
): {
  tasks: Task[];
  progress: TaskProgress;
  isLoading: boolean;
  error: Error | null;
}
```

**Features**:
- ✅ Automatisches Caching (2min staleTime)
- ✅ Auto-Refetch bei Window-Focus
- ✅ Progress-Berechnung mit useMemo
- ✅ Error Handling via React Query
- ✅ Enabled/Disabled Logic

**Verwendung**:
```typescript
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';

const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);
```

**Detaillierte Dokumentation**: [useProjectTasks API-Referenz](./overview-tab-service.md#useprojecttasks)

---

### 2. progress-helpers

**Datei**: `src/lib/utils/progress-helpers.ts`

**Zweck**: Utility-Funktionen für konsistente Progress-Anzeigen mit Design-System-konformen Farben.

**Funktionen**:

#### PROGRESS_COLORS
```typescript
const PROGRESS_COLORS: {
  high: 'bg-green-600';      // 90%+
  medium: 'bg-blue-600';     // 70-89%
  low: 'bg-amber-500';       // 50-69%
  critical: 'bg-red-600';    // <50%
}
```

#### getProgressColor()
```typescript
function getProgressColor(percent: number): string
```
Gibt Tailwind CSS Klasse basierend auf Prozent-Wert zurück.

#### getProgressStatus()
```typescript
function getProgressStatus(percent: number): string
```
Gibt menschenlesbare Status-Beschreibung zurück ('Sehr gut', 'Gut', 'Ausreichend', 'Kritisch').

**Verwendung**:
```typescript
import { getProgressColor, getProgressStatus } from '@/lib/utils/progress-helpers';

const color = getProgressColor(75);    // "bg-blue-600"
const status = getProgressStatus(75);  // "Gut"
```

**Detaillierte Dokumentation**: [progress-helpers API-Referenz](./overview-tab-service.md#progress-helpers)

---

### 3. ProjectContext

**Datei**: `src/app/dashboard/projects/[projectId]/context/ProjectContext.tsx`

**Zweck**: React Context für globalen Project-State und Tab-Navigation.

**API**:

#### ProjectProvider
```typescript
<ProjectProvider
  projectId={string}
  organizationId={string}
  initialProject={Project}
  initialActiveTab={'overview' | 'tasks' | ...}
  onTabChange={(tab) => void}
  onReload={() => Promise<void>}
>
  {children}
</ProjectProvider>
```

#### useProject Hook
```typescript
const {
  project,
  setProject,
  projectId,
  organizationId,
  activeTab,
  setActiveTab,
  loading,
  setLoading,
  error,
  setError,
  reloadProject,
} = useProject();
```

**Verwendung**:
```typescript
import { useProject } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';

function MyComponent() {
  const { project, projectId, organizationId, setActiveTab } = useProject();

  return <div>{project.title}</div>;
}
```

**Detaillierte Dokumentation**: [ProjectContext API-Referenz](./overview-tab-service.md#projectcontext)

---

### 4. PIPELINE_STAGE_PROGRESS

**Datei**: `src/types/project.ts`

**Zweck**: Zentrale Konstante für Pipeline-Fortschritt-Mapping.

**Definition**:
```typescript
export const PIPELINE_STAGE_PROGRESS: Record<PipelineStage, number> = {
  'ideas_planning': 0,    // 0%
  'creation': 20,         // 20%
  'approval': 40,         // 40%
  'distribution': 60,     // 60%
  'monitoring': 80,       // 80%
  'completed': 100        // 100%
} as const;
```

**Verwendung**:
```typescript
import { PIPELINE_STAGE_PROGRESS } from '@/types/project';

const pipelinePercent = PIPELINE_STAGE_PROGRESS[project.currentStage] || 0;
```

---

## Schnellreferenz

### Hooks

| Hook | Parameter | Return | Beschreibung |
|------|-----------|--------|--------------|
| `useProjectTasks()` | `projectId, organizationId` | `{ tasks, progress, isLoading, error }` | Lädt Tasks und berechnet Progress |
| `useProject()` | - | `{ project, projectId, organizationId, ... }` | Zugriff auf Project-Context |

### Utility-Funktionen

| Funktion | Parameter | Return | Beschreibung |
|----------|-----------|--------|--------------|
| `getProgressColor()` | `percent: number` | `string` | Gibt Tailwind CSS Klasse zurück |
| `getProgressStatus()` | `percent: number` | `string` | Gibt Status-Label zurück |

### Konstanten

| Konstante | Typ | Beschreibung |
|-----------|-----|--------------|
| `PROGRESS_COLORS` | `Record<string, string>` | Design-System Farben für Progress |
| `PIPELINE_STAGE_PROGRESS` | `Record<PipelineStage, number>` | Pipeline-Fortschritt pro Stage |

---

## Verwendungsbeispiele

### Beispiel 1: Task-Loading mit Progress

```typescript
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';
import { toastService } from '@/lib/utils/toast';

function TaskOverview({ projectId, organizationId }) {
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  // Error Handling
  if (error) {
    toastService.error('Fehler beim Laden der Tasks');
  }

  // Loading State
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <h2>Task-Übersicht</h2>
      <p>Gesamt: {progress.totalTasks}</p>
      <p>Abgeschlossen: {progress.completedTasks}</p>
      <p>Fortschritt: {progress.taskCompletion}%</p>
      <p>Kritische Tasks: {progress.criticalTasksRemaining}</p>

      <ul>
        {tasks.map(task => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Beispiel 2: Progress-Bar mit Farben

```typescript
import { getProgressColor, getProgressStatus } from '@/lib/utils/progress-helpers';

function ProgressBar({ percent }: { percent: number }) {
  const color = getProgressColor(percent);
  const status = getProgressStatus(percent);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{percent}%</span>
        <span className="text-sm text-gray-500">{status}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${color} rounded-full h-3 transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
```

---

### Beispiel 3: Project-Context verwenden

```typescript
import { useProject } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';

function ProjectHeader() {
  const { project, setActiveTab } = useProject();

  return (
    <div>
      <h1>{project.title}</h1>
      <button onClick={() => setActiveTab('tasks')}>
        Zu Tasks wechseln
      </button>
    </div>
  );
}
```

---

### Beispiel 4: Pipeline-Fortschritt anzeigen

```typescript
import { PIPELINE_STAGE_PROGRESS } from '@/types/project';
import { getProgressColor } from '@/lib/utils/progress-helpers';

function PipelineProgress({ currentStage }: { currentStage: PipelineStage }) {
  const pipelinePercent = PIPELINE_STAGE_PROGRESS[currentStage] || 0;
  const color = getProgressColor(pipelinePercent);

  return (
    <div>
      <h3>Pipeline-Fortschritt</h3>
      <div className="flex items-center space-x-3">
        <span className="text-3xl font-bold">{pipelinePercent}%</span>
        <div className="flex-1 bg-gray-200 rounded-full h-3">
          <div
            className={`${color} rounded-full h-3`}
            style={{ width: `${pipelinePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

### Beispiel 5: Kombiniertes Dashboard

```typescript
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';
import { useProject } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';
import { PIPELINE_STAGE_PROGRESS } from '@/types/project';
import { getProgressColor } from '@/lib/utils/progress-helpers';

function CompleteDashboard() {
  const { project, projectId, organizationId } = useProject();
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  const pipelinePercent = PIPELINE_STAGE_PROGRESS[project.currentStage] || 0;
  const pipelineColor = getProgressColor(pipelinePercent);
  const taskColor = getProgressColor(progress.taskCompletion);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage />;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Pipeline-Fortschritt */}
      <div>
        <h4>Pipeline</h4>
        <span className="text-2xl">{pipelinePercent}%</span>
        <div className={`${pipelineColor} h-2 rounded`}
             style={{ width: `${pipelinePercent}%` }} />
      </div>

      {/* Task-Completion */}
      <div>
        <h4>Tasks</h4>
        <span className="text-2xl">{progress.taskCompletion}%</span>
        <div className={`${taskColor} h-2 rounded`}
             style={{ width: `${progress.taskCompletion}%` }} />
      </div>

      {/* Kritische Tasks */}
      <div>
        <h4>Kritische Tasks</h4>
        <span className="text-2xl">{progress.criticalTasksRemaining}</span>
      </div>
    </div>
  );
}
```

---

## Error Handling

### useProjectTasks Error Handling

```typescript
const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

// Methode 1: Toast Notification
if (error) {
  toastService.error('Fehler beim Laden der Tasks');
}

// Methode 2: Error UI anzeigen
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 rounded p-4">
      <p className="text-red-700">Fehler: {error.message}</p>
    </div>
  );
}

// Methode 3: Retry Button
if (error) {
  return (
    <div>
      <p>Fehler beim Laden</p>
      <button onClick={() => queryClient.refetchQueries(['project-tasks', projectId, organizationId])}>
        Erneut versuchen
      </button>
    </div>
  );
}
```

---

### Fehlende IDs (Query disabled)

```typescript
const { tasks, progress, isLoading } = useProjectTasks(
  projectId,    // undefined → Query disabled
  organizationId
);

// isLoading = false (Query läuft nicht)
// tasks = []
// progress = { totalTasks: 0, completedTasks: 0, taskCompletion: 100, criticalTasksRemaining: 0 }
```

**Empfehlung**: Prüfe IDs bevor du Component renderst:

```typescript
function MyComponent({ projectId, organizationId }) {
  if (!projectId || !organizationId) {
    return <div>Fehlende Projekt-Informationen</div>;
  }

  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);
  // ...
}
```

---

### Progress-Helpers Error Handling

Progress-Helpers sind pure Functions ohne Side-Effects. Sie werfen keine Errors.

**Edge-Cases**:
```typescript
getProgressColor(-10);   // "bg-red-600" (negativ → kritisch)
getProgressColor(150);   // "bg-green-600" (>100% → sehr gut)
getProgressColor(NaN);   // "bg-red-600" (NaN < 50 → kritisch)

getProgressStatus(-10);  // "Kritisch"
getProgressStatus(150);  // "Sehr gut"
getProgressStatus(NaN);  // "Kritisch"
```

---

## Best Practices

### 1. React Query Best Practices

**Query Key Naming**:
```typescript
// ✅ Gut: Beschreibend und hierarchisch
['project-tasks', projectId, organizationId]

// ❌ Schlecht: Zu generisch
['tasks']
```

**StaleTime konfigurieren**:
```typescript
// ✅ Gut: Tasks ändern sich häufig → kurze staleTime
staleTime: 2 * 60 * 1000,  // 2 Minuten

// ❌ Schlecht: Zu lange → veraltete Daten
staleTime: 60 * 60 * 1000,  // 1 Stunde
```

**Enabled Logic**:
```typescript
// ✅ Gut: Query nur wenn IDs vorhanden
enabled: !!projectId && !!organizationId

// ❌ Schlecht: Query läuft immer (Error wenn IDs fehlen)
enabled: true
```

---

### 2. Progress-Helpers Best Practices

**Verwende getProgressColor() statt inline**:
```typescript
// ✅ Gut: Zentralisiert und konsistent
import { getProgressColor } from '@/lib/utils/progress-helpers';
const color = getProgressColor(percent);

// ❌ Schlecht: Inline-Logic (Code-Duplikation)
const color = percent >= 90 ? 'bg-green-600' :
              percent >= 70 ? 'bg-blue-600' : 'bg-red-600';
```

**Design-System Farben verwenden**:
```typescript
// ✅ Gut: PROGRESS_COLORS aus progress-helpers
import { PROGRESS_COLORS } from '@/lib/utils/progress-helpers';
const criticalColor = PROGRESS_COLORS.critical;

// ❌ Schlecht: Hardcoded Farben
const criticalColor = 'bg-red-600';
```

---

### 3. Context Best Practices

**useProject nur innerhalb Provider**:
```typescript
// ✅ Gut: Innerhalb ProjectProvider
<ProjectProvider projectId={id} organizationId={orgId}>
  <MyComponent /> {/* Kann useProject() nutzen */}
</ProjectProvider>

// ❌ Schlecht: Außerhalb Provider (Error)
<MyComponent /> {/* useProject() wirft Error */}
```

**Context nicht für häufig ändernde Daten**:
```typescript
// ✅ Gut: Stabile Daten (projectId, organizationId)
const { projectId, organizationId } = useProject();

// ⚠️ Vorsicht: Häufig ändernde Daten (besser: lokaler State oder React Query)
const { tasks } = useProject(); // Alle Consumer re-rendern bei Task-Änderung!
```

---

### 4. Performance Best Practices

**React.memo verwenden**:
```typescript
// ✅ Gut: Component wird nur bei Props-Änderung re-rendered
export default memo(MyComponent);

// ❌ Schlecht: Re-Render bei jedem Parent-Render
export default MyComponent;
```

**useCallback für Handler**:
```typescript
// ✅ Gut: Stabile Handler-Referenz
const handleClick = useCallback(() => {
  setActiveTab('tasks');
}, [setActiveTab]);

// ❌ Schlecht: Neue Funktion bei jedem Render
const handleClick = () => {
  setActiveTab('tasks');
};
```

**useMemo für teure Berechnungen**:
```typescript
// ✅ Gut: Nur neu berechnen wenn tasks sich ändern
const progress = useMemo(() => {
  // Teure Berechnung
  return calculateProgress(tasks);
}, [tasks]);

// ❌ Schlecht: Bei jedem Render neu berechnen
const progress = calculateProgress(tasks);
```

---

## Siehe auch

### Interne Dokumentation
- [Detaillierte API-Referenz](./overview-tab-service.md) - Vollständige Funktionssignaturen und Beispiele
- [Komponenten-Dokumentation](../components/README.md) - React-Komponenten im Detail
- [Architecture Decision Records](../adr/README.md) - Design-Entscheidungen
- [Hauptdokumentation](../README.md) - Übersicht und Migration Guide

### Externe Links
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Hooks API](https://react.dev/reference/react)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Erstellt**: 2025-10-22
**Autor**: Claude Code
**Version**: 1.0.0

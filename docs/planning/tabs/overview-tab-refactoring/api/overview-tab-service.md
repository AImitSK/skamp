# Overview Tab Service - Detaillierte API-Referenz

> **Modul**: Overview Tab Service
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-22

## Inhaltsverzeichnis

- [useProjectTasks Hook](#useprojecttasks-hook)
- [progress-helpers Module](#progress-helpers-module)
- [ProjectContext](#projectcontext)
- [PIPELINE_STAGE_PROGRESS](#pipeline_stage_progress)
- [Types und Interfaces](#types-und-interfaces)
- [Performance-Hinweise](#performance-hinweise)
- [Troubleshooting](#troubleshooting)

---

## useProjectTasks Hook

### Übersicht

React Query Hook für Task-Loading mit automatischem Caching und Progress-Berechnung. Ersetzt manuelles useState/useEffect Pattern.

**Datei**: `src/lib/hooks/useProjectTasks.ts`

---

### Signatur

```typescript
function useProjectTasks(
  projectId: string | undefined,
  organizationId: string | undefined
): UseProjectTasksReturn

interface UseProjectTasksReturn {
  tasks: Task[];
  progress: TaskProgress;
  isLoading: boolean;
  error: Error | null;
}

interface TaskProgress {
  totalTasks: number;
  completedTasks: number;
  taskCompletion: number;         // Prozent (0-100)
  criticalTasksRemaining: number; // urgent/high priority, nicht completed
}
```

---

### Parameter

#### projectId
- **Typ**: `string | undefined`
- **Erforderlich**: Nein (undefined = Query disabled)
- **Beschreibung**: Firebase Document ID des Projekts

**Beispiele**:
```typescript
// ✅ Gültig
useProjectTasks('abc123', 'org-456')

// ✅ Query disabled (kein API-Call)
useProjectTasks(undefined, 'org-456')

// ✅ Dynamisch
const projectId = params.projectId;
useProjectTasks(projectId, organizationId)
```

#### organizationId
- **Typ**: `string | undefined`
- **Erforderlich**: Nein (undefined = Query disabled)
- **Beschreibung**: Firebase Document ID der Organisation (Multi-Tenancy)

**Beispiele**:
```typescript
// ✅ Von Context
const { currentOrganization } = useOrganization();
useProjectTasks(projectId, currentOrganization?.id)

// ✅ Query disabled wenn Organisation noch lädt
useProjectTasks(projectId, undefined)
```

---

### Return Value

#### tasks
- **Typ**: `Task[]`
- **Default**: `[]` (leeres Array)
- **Beschreibung**: Array aller Tasks des Projekts

**Task Interface** (vereinfacht):
```typescript
interface Task {
  id: string;
  title: string;
  projectId: string;
  organizationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // ... weitere Felder
}
```

**Beispiel**:
```typescript
const { tasks } = useProjectTasks(projectId, organizationId);

// Alle Tasks anzeigen
tasks.forEach(task => {
  console.log(task.title, task.status);
});

// Nach Status filtern
const pendingTasks = tasks.filter(t => t.status === 'pending');
const completedTasks = tasks.filter(t => t.status === 'completed');
```

---

#### progress
- **Typ**: `TaskProgress`
- **Default**: `{ totalTasks: 0, completedTasks: 0, taskCompletion: 100, criticalTasksRemaining: 0 }`
- **Beschreibung**: Berechnete Progress-Metriken (optimiert mit useMemo)

**TaskProgress Interface**:
```typescript
interface TaskProgress {
  totalTasks: number;           // Anzahl aller Tasks
  completedTasks: number;       // Anzahl completed Tasks
  taskCompletion: number;       // Prozent (0-100, gerundet)
  criticalTasksRemaining: number; // urgent/high priority, nicht completed
}
```

**Berechnungs-Logik**:
```typescript
// totalTasks
totalTasks = tasks.length;

// completedTasks
completedTasks = tasks.filter(task => task.status === 'completed').length;

// taskCompletion
taskCompletion = totalTasks === 0
  ? 100  // 0 Tasks = 100% (keine offenen Tasks)
  : Math.round((completedTasks / totalTasks) * 100);

// criticalTasksRemaining
// WICHTIG: "Kritische Tasks" = high/urgent Priority (user-verständlich)
// NICHT requiredForStageCompletion (Backend-Flag für Stage-Transitions)
criticalTasksRemaining = tasks.filter(task =>
  (task.priority === 'urgent' || task.priority === 'high') &&
  task.status !== 'completed'
).length;
```

**Beispiel**:
```typescript
const { progress } = useProjectTasks(projectId, organizationId);

console.log(`${progress.completedTasks} von ${progress.totalTasks} Tasks erledigt`);
console.log(`Fortschritt: ${progress.taskCompletion}%`);

if (progress.criticalTasksRemaining > 0) {
  console.log(`⚠️ ${progress.criticalTasksRemaining} kritische Tasks offen`);
}
```

---

#### isLoading
- **Typ**: `boolean`
- **Default**: `true` (beim ersten Render)
- **Beschreibung**: React Query Loading-State

**States**:
- `true`: Query läuft gerade (erste Load oder Refetch)
- `false`: Query fertig (erfolgreich oder Error)

**Wichtig**: Bei disabled Query (fehlende IDs) ist `isLoading = false`!

**Beispiel**:
```typescript
const { tasks, isLoading } = useProjectTasks(projectId, organizationId);

if (isLoading) {
  return <LoadingSkeleton />;
}

return <TaskList tasks={tasks} />;
```

---

#### error
- **Typ**: `Error | null`
- **Default**: `null`
- **Beschreibung**: React Query Error-State

**Error-Cases**:
- Firestore Permission Denied
- Network Error
- Missing projectId/organizationId (wenn Query trotzdem enabled)
- Invalid Response Format

**Beispiel**:
```typescript
const { tasks, error } = useProjectTasks(projectId, organizationId);

if (error) {
  toastService.error('Fehler beim Laden der Tasks');
  console.error('Task Load Error:', error);
}
```

---

### Vollständige Implementierung

```typescript
/**
 * useProjectTasks Hook
 *
 * React Query Hook für das Laden von Projekt-Tasks mit automatischem Caching
 * und Progress-Berechnung.
 *
 * Features:
 * - Automatisches Caching (2min staleTime)
 * - Auto-Refetch bei Window-Focus
 * - Progress-Berechnung optimiert mit useMemo
 * - Error Handling via React Query
 *
 * @example
 * const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);
 */

import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/lib/firebase/task-service';
import { useMemo } from 'react';

interface TaskProgress {
  totalTasks: number;
  completedTasks: number;
  taskCompletion: number;
  criticalTasksRemaining: number;
}

export function useProjectTasks(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  // React Query für Task-Loading
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['project-tasks', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('Missing projectId or organizationId');
      }
      return taskService.getByProjectId(organizationId, projectId);
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten (Tasks ändern sich häufiger als Projekte)
  });

  // Progress-Berechnung als useMemo (wird nur neu berechnet wenn tasks sich ändern)
  const progress = useMemo<TaskProgress>(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    // WICHTIG: "Kritische Tasks" = high/urgent Priority (nicht requiredForStageCompletion)
    // Grund: User-verständlich, Backend-Flag ist für Stage-Transitions
    const criticalTasks = tasks.filter(task =>
      (task.priority === 'urgent' || task.priority === 'high') &&
      task.status !== 'completed'
    ).length;

    return {
      totalTasks,
      completedTasks,
      taskCompletion: totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100),
      criticalTasksRemaining: criticalTasks,
    };
  }, [tasks]);

  return {
    tasks,
    progress,
    isLoading,
    error
  };
}
```

---

### Verwendungsbeispiele

#### Beispiel 1: Basis-Verwendung

```typescript
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';

function TaskDashboard({ projectId, organizationId }) {
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  if (isLoading) {
    return <div>Lädt Tasks...</div>;
  }

  if (error) {
    return <div>Fehler: {error.message}</div>;
  }

  return (
    <div>
      <h2>Tasks ({progress.totalTasks})</h2>
      <p>Fortschritt: {progress.taskCompletion}%</p>
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

#### Beispiel 2: Mit Loading Skeleton

```typescript
function TaskDashboard({ projectId, organizationId }) {
  const { tasks, progress, isLoading } = useProjectTasks(projectId, organizationId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <TaskList tasks={tasks} progress={progress} />
  );
}
```

---

#### Beispiel 3: Mit Error Handling

```typescript
import { toastService } from '@/lib/utils/toast';

function TaskDashboard({ projectId, organizationId }) {
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  // Toast bei Error
  if (error) {
    toastService.error('Fehler beim Laden der Tasks');
  }

  // UI mit fallback
  return (
    <div>
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-700">Tasks konnten nicht geladen werden</p>
          <button onClick={() => window.location.reload()}>
            Neu laden
          </button>
        </div>
      ) : (
        <TaskList tasks={tasks} isLoading={isLoading} />
      )}
    </div>
  );
}
```

---

#### Beispiel 4: Progress-Bar mit Conditional Rendering

```typescript
import { getProgressColor, getProgressStatus } from '@/lib/utils/progress-helpers';

function TaskProgressBar({ projectId, organizationId }) {
  const { progress, isLoading } = useProjectTasks(projectId, organizationId);

  if (isLoading) return null;

  const color = getProgressColor(progress.taskCompletion);
  const status = getProgressStatus(progress.taskCompletion);

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span>{progress.taskCompletion}%</span>
        <span className="text-sm text-gray-500">{status}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${color} rounded-full h-3 transition-all duration-300`}
          style={{ width: `${progress.taskCompletion}%` }}
        />
      </div>
      <p className="text-xs mt-1">
        {progress.completedTasks} von {progress.totalTasks} Tasks erledigt
      </p>
    </div>
  );
}
```

---

#### Beispiel 5: Critical Tasks Warning

```typescript
function CriticalTasksWarning({ projectId, organizationId }) {
  const { progress } = useProjectTasks(projectId, organizationId);

  if (progress.criticalTasksRemaining === 0) {
    return null; // Keine Warnung wenn keine kritischen Tasks
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center space-x-2">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
        <h4 className="font-medium text-amber-800">
          Warnung: Kritische Tasks ausstehend
        </h4>
      </div>
      <p className="mt-2 text-sm text-amber-700">
        Es sind noch {progress.criticalTasksRemaining} kritische Tasks offen,
        die für den nächsten Stage-Übergang erforderlich sind.
      </p>
    </div>
  );
}
```

---

### React Query Features

#### 1. Automatisches Caching

```typescript
// staleTime: 2 * 60 * 1000 = 2 Minuten

// Szenario:
// 1. User lädt Overview Tab → Query läuft, Daten werden gecached
// 2. User wechselt zu Tasks Tab
// 3. User wechselt zurück zu Overview Tab (innerhalb 2 Minuten)
//    → Query läuft NICHT, Daten kommen aus Cache (instant!)
// 4. Nach 2 Minuten werden Daten als "stale" markiert
//    → Nächster Render triggert Background-Refetch
```

**Manueller Cache-Invalidierung**:
```typescript
import { useQueryClient } from '@tanstack/react-query';

function TaskManager() {
  const queryClient = useQueryClient();

  const handleTaskUpdate = async () => {
    // Task updaten...

    // Cache invalidieren (triggert Re-Fetch)
    queryClient.invalidateQueries(['project-tasks', projectId, organizationId]);
  };
}
```

---

#### 2. Auto-Refetch bei Window-Focus

```typescript
// React Query refetcht automatisch wenn User zurück zum Tab wechselt
// Beispiel: User hat Tab im Hintergrund, wechselt zurück → frische Daten!

// Disable bei Bedarf:
const { data } = useQuery({
  // ...
  refetchOnWindowFocus: false, // Disabled
});
```

---

#### 3. Query Key für Cache-Isolation

```typescript
// Query Key: ['project-tasks', projectId, organizationId]

// Projekt 1 + Org A → separater Cache
useProjectTasks('project-1', 'org-a');

// Projekt 2 + Org A → separater Cache
useProjectTasks('project-2', 'org-a');

// Projekt 1 + Org B → separater Cache (Multi-Tenancy!)
useProjectTasks('project-1', 'org-b');
```

---

### Performance-Hinweise

#### useMemo für Progress-Berechnung

```typescript
// Progress wird nur neu berechnet wenn tasks-Array sich ändert
const progress = useMemo<TaskProgress>(() => {
  // Berechnung...
}, [tasks]);

// ✅ Effizient: Bei 100 Tasks, 4 Filter-Operationen
// ❌ Ineffizient ohne useMemo: Filter bei jedem Render (auch wenn tasks gleich!)
```

**Benchmark** (100 Tasks):
- Mit useMemo: ~0.1ms (nur bei tasks-Änderung)
- Ohne useMemo: ~0.1ms pro Render (bei jedem Render!)
- Bei 60 FPS Animation: 60x mehr Berechnungen ohne useMemo

---

#### enabled Flag für bedingte Queries

```typescript
// Query läuft nur wenn beide IDs vorhanden
enabled: !!projectId && !!organizationId

// Szenario: Projekt lädt noch
// projectId = undefined → Query disabled → Kein API-Call!
// Sobald projectId gesetzt → Query enabled → API-Call
```

---

### Troubleshooting

#### Problem: Query läuft nicht (isLoading = false, tasks = [])

**Lösung**: Prüfe enabled-Bedingung
```typescript
console.log('projectId:', projectId);          // undefined?
console.log('organizationId:', organizationId); // undefined?

// Query ist disabled wenn eine ID fehlt
```

---

#### Problem: Daten veraltet (keine Auto-Updates)

**Lösung 1**: Cache manuell invalidieren
```typescript
queryClient.invalidateQueries(['project-tasks', projectId, organizationId]);
```

**Lösung 2**: staleTime reduzieren
```typescript
useQuery({
  // ...
  staleTime: 30 * 1000, // 30 Sekunden statt 2 Minuten
});
```

---

#### Problem: "Missing projectId or organizationId" Error

**Lösung**: enabled Flag verhindert Query-Execution
```typescript
// ❌ Falsch: Query läuft trotz fehlender IDs
const { data } = useQuery({
  queryFn: async () => {
    if (!projectId) throw new Error('Missing projectId');
    // ...
  },
  enabled: true, // Query läuft immer!
});

// ✅ Richtig: Query disabled wenn IDs fehlen
const { data } = useQuery({
  queryFn: async () => {
    // IDs sind garantiert vorhanden (enabled = false verhindert Execution)
    return taskService.getByProjectId(organizationId, projectId);
  },
  enabled: !!projectId && !!organizationId,
});
```

---

#### Problem: Progress zeigt 100% bei 0 Tasks

**Keine Problem**: Design-Entscheidung!
```typescript
// 0 Tasks = 100% Completion
// Begründung: Keine offenen Tasks = Projekt vollständig
taskCompletion = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);

// Alternative Implementierung (0 Tasks = 0%):
taskCompletion = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
```

---

## progress-helpers Module

### Übersicht

Utility-Funktionen für konsistente Progress-Anzeigen mit Design-System-konformen Farben.

**Datei**: `src/lib/utils/progress-helpers.ts`

---

### PROGRESS_COLORS Konstante

```typescript
export const PROGRESS_COLORS = {
  high: 'bg-green-600',      // 90%+ - Design System green
  medium: 'bg-blue-600',     // 70-89% - Design System blue
  low: 'bg-amber-500',       // 50-69% - Design System amber (nicht yellow!)
  critical: 'bg-red-600'     // <50% - Design System red
} as const;
```

**Wichtig**: `amber-500` statt `yellow-500` (CeleroPress Design System Richtlinie)

**Verwendung**:
```typescript
import { PROGRESS_COLORS } from '@/lib/utils/progress-helpers';

const criticalColor = PROGRESS_COLORS.critical; // "bg-red-600"
const highColor = PROGRESS_COLORS.high;         // "bg-green-600"

<div className={criticalColor}>Kritisch</div>
```

---

### getProgressColor()

#### Signatur

```typescript
function getProgressColor(percent: number): string
```

#### Parameter

**percent**
- **Typ**: `number`
- **Range**: 0-100 (aber akzeptiert auch Werte außerhalb)
- **Beschreibung**: Fortschritt in Prozent

#### Return Value

- **Typ**: `string`
- **Format**: Tailwind CSS Klasse (z.B. "bg-green-600")
- **Mögliche Werte**:
  - `"bg-green-600"` - 90%+
  - `"bg-blue-600"` - 70-89%
  - `"bg-amber-500"` - 50-69%
  - `"bg-red-600"` - <50%

#### Mapping-Logik

```typescript
if (percent >= 90) return PROGRESS_COLORS.high;      // bg-green-600
if (percent >= 70) return PROGRESS_COLORS.medium;    // bg-blue-600
if (percent >= 50) return PROGRESS_COLORS.low;       // bg-amber-500
return PROGRESS_COLORS.critical;                     // bg-red-600
```

#### Grenzwerte

| Prozent | Farbe | CSS-Klasse |
|---------|-------|------------|
| 100% | Grün | `bg-green-600` |
| 90% | Grün | `bg-green-600` |
| 89.9% | Blau | `bg-blue-600` |
| 70% | Blau | `bg-blue-600` |
| 69.9% | Amber | `bg-amber-500` |
| 50% | Amber | `bg-amber-500` |
| 49.9% | Rot | `bg-red-600` |
| 0% | Rot | `bg-red-600` |

#### Edge-Cases

```typescript
getProgressColor(-10);   // "bg-red-600" (negativ → kritisch)
getProgressColor(150);   // "bg-green-600" (>100% → sehr gut)
getProgressColor(NaN);   // "bg-red-600" (NaN < 50 → kritisch)
getProgressColor(Infinity);  // "bg-green-600" (Infinity >= 90 → sehr gut)
```

#### Beispiele

```typescript
import { getProgressColor } from '@/lib/utils/progress-helpers';

// Basis-Verwendung
const color = getProgressColor(75);  // "bg-blue-600"

// In Component
function ProgressBar({ percent }) {
  const color = getProgressColor(percent);
  return (
    <div className={`${color} h-4 rounded-full`}
         style={{ width: `${percent}%` }} />
  );
}

// Mit bedingendem Styling
function StatusBadge({ percent }) {
  const color = getProgressColor(percent);
  const bgColor = color.replace('bg-', 'bg-opacity-20 bg-');
  const textColor = color.replace('bg-', 'text-');

  return (
    <span className={`${bgColor} ${textColor} px-3 py-1 rounded`}>
      {percent}%
    </span>
  );
}
```

---

### getProgressStatus()

#### Signatur

```typescript
function getProgressStatus(percent: number): string
```

#### Parameter

**percent**
- **Typ**: `number`
- **Range**: 0-100
- **Beschreibung**: Fortschritt in Prozent

#### Return Value

- **Typ**: `string`
- **Mögliche Werte**:
  - `"Sehr gut"` - 90%+
  - `"Gut"` - 70-89%
  - `"Ausreichend"` - 50-69%
  - `"Kritisch"` - <50%

#### Mapping-Logik

```typescript
if (percent >= 90) return 'Sehr gut';
if (percent >= 70) return 'Gut';
if (percent >= 50) return 'Ausreichend';
return 'Kritisch';
```

#### Grenzwerte

| Prozent | Status |
|---------|--------|
| 100% | Sehr gut |
| 90% | Sehr gut |
| 89.9% | Gut |
| 70% | Gut |
| 69.9% | Ausreichend |
| 50% | Ausreichend |
| 49.9% | Kritisch |
| 0% | Kritisch |

#### Beispiele

```typescript
import { getProgressStatus } from '@/lib/utils/progress-helpers';

// Basis-Verwendung
const status = getProgressStatus(85);  // "Gut"

// In Component
function ProgressLabel({ percent }) {
  const status = getProgressStatus(percent);
  return (
    <div>
      <span className="text-2xl font-bold">{percent}%</span>
      <span className="text-sm text-gray-500 ml-2">{status}</span>
    </div>
  );
}

// Mit Icon
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function ProgressWithIcon({ percent }) {
  const status = getProgressStatus(percent);
  const Icon = percent >= 70 ? CheckCircleIcon : ExclamationTriangleIcon;
  const iconColor = percent >= 70 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex items-center space-x-2">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <span>{status}</span>
    </div>
  );
}
```

---

### Kombinierte Verwendung

```typescript
import { getProgressColor, getProgressStatus } from '@/lib/utils/progress-helpers';

function CompleteProgressDisplay({ percent }) {
  const color = getProgressColor(percent);
  const status = getProgressStatus(percent);

  return (
    <div className="space-y-2">
      {/* Prozent + Status */}
      <div className="flex justify-between">
        <span className="text-2xl font-bold">{percent}%</span>
        <span className="text-sm text-gray-500">{status}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${color} rounded-full h-3 transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Status Badge */}
      <div className="flex justify-end">
        <span className={`${color} text-white px-3 py-1 rounded text-xs`}>
          {status}
        </span>
      </div>
    </div>
  );
}
```

---

### Vollständige Implementierung

```typescript
/**
 * Progress Helper Utilities
 *
 * Design System konforme Progress-Farben und Helper-Funktionen
 * für konsistente Fortschritts-Anzeigen.
 */

/**
 * Design System konforme Progress-Farben
 *
 * Basierend auf CeleroPress Design System (docs/design-system/DESIGN_SYSTEM.md)
 */
export const PROGRESS_COLORS = {
  high: 'bg-green-600',      // 90%+ - Design System green
  medium: 'bg-blue-600',     // 70-89% - Design System blue
  low: 'bg-amber-500',       // 50-69% - Design System amber (nicht yellow!)
  critical: 'bg-red-600'     // <50% - Design System red
} as const;

/**
 * Gibt die passende Progress-Farbe basierend auf Prozent-Wert zurück
 *
 * @param percent - Fortschritt in Prozent (0-100)
 * @returns Tailwind CSS Klasse (z.B. "bg-green-600")
 *
 * @example
 * const color = getProgressColor(95); // "bg-green-600"
 * const color = getProgressColor(45); // "bg-red-600"
 */
export function getProgressColor(percent: number): string {
  if (percent >= 90) return PROGRESS_COLORS.high;
  if (percent >= 70) return PROGRESS_COLORS.medium;
  if (percent >= 50) return PROGRESS_COLORS.low;
  return PROGRESS_COLORS.critical;
}

/**
 * Gibt eine menschenlesbare Beschreibung des Progress-Status
 *
 * @param percent - Fortschritt in Prozent (0-100)
 * @returns Status-Beschreibung
 *
 * @example
 * getProgressStatus(95); // "Sehr gut"
 * getProgressStatus(45); // "Kritisch"
 */
export function getProgressStatus(percent: number): string {
  if (percent >= 90) return 'Sehr gut';
  if (percent >= 70) return 'Gut';
  if (percent >= 50) return 'Ausreichend';
  return 'Kritisch';
}
```

---

## ProjectContext

### Übersicht

React Context für globalen Project-State und Tab-Navigation. Vermeidet Props-Drilling für organizationId, projectId, activeTab.

**Datei**: `src/app/dashboard/projects/[projectId]/context/ProjectContext.tsx`

---

### ProjectProvider Component

#### Signatur

```typescript
function ProjectProvider({
  children,
  projectId,
  organizationId,
  initialProject = null,
  initialActiveTab = 'overview',
  onTabChange,
  onReload,
}: ProjectProviderProps): JSX.Element

interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
  organizationId: string;
  initialProject?: Project | null;
  initialActiveTab?: 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring';
  onTabChange?: (tab: ProjectProviderProps['initialActiveTab']) => void;
  onReload?: () => Promise<void>;
}
```

#### Props

**children**
- **Typ**: `ReactNode`
- **Erforderlich**: Ja
- **Beschreibung**: Child-Komponenten die Context nutzen

**projectId**
- **Typ**: `string`
- **Erforderlich**: Ja
- **Beschreibung**: Firebase Document ID des Projekts

**organizationId**
- **Typ**: `string`
- **Erforderlich**: Ja
- **Beschreibung**: Firebase Document ID der Organisation

**initialProject**
- **Typ**: `Project | null`
- **Default**: `null`
- **Beschreibung**: Initial Project-Daten (z.B. aus page.tsx)

**initialActiveTab**
- **Typ**: `'overview' | 'tasks' | ...`
- **Default**: `'overview'`
- **Beschreibung**: Initial aktiver Tab (z.B. aus URL)

**onTabChange**
- **Typ**: `(tab) => void`
- **Optional**: Ja
- **Beschreibung**: Callback bei Tab-Wechsel (z.B. für URL-Update)

**onReload**
- **Typ**: `() => Promise<void>`
- **Optional**: Ja
- **Beschreibung**: Callback zum Reload von Project-Daten

#### Beispiel

```typescript
import { ProjectProvider } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';

function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);

  const handleTabChange = (tab) => {
    router.push(`?tab=${tab}`, { scroll: false });
  };

  const handleReload = async () => {
    const data = await projectService.getById(params.projectId);
    setProject(data);
  };

  return (
    <ProjectProvider
      projectId={params.projectId}
      organizationId={currentOrganization.id}
      initialProject={project}
      initialActiveTab="overview"
      onTabChange={handleTabChange}
      onReload={handleReload}
    >
      <ProjectHeader />
      <OverviewTabContent />
    </ProjectProvider>
  );
}
```

---

### useProject Hook

#### Signatur

```typescript
function useProject(): ProjectContextValue

interface ProjectContextValue {
  // Project Data
  project: Project | null;
  setProject: (project: Project | null) => void;

  // IDs (read-only)
  projectId: string;
  organizationId: string;

  // Tab Navigation
  activeTab: 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring';
  setActiveTab: (tab: ProjectContextValue['activeTab']) => void;

  // Loading States
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Error State
  error: string | null;
  setError: (error: string | null) => void;

  // Reload Function
  reloadProject: () => Promise<void>;
}
```

#### Return Values

**project**
- **Typ**: `Project | null`
- **Beschreibung**: Aktuelles Project-Objekt

**setProject**
- **Typ**: `(project: Project | null) => void`
- **Beschreibung**: Project-State updaten

**projectId**
- **Typ**: `string`
- **Beschreibung**: Firebase Document ID (read-only)

**organizationId**
- **Typ**: `string`
- **Beschreibung**: Firebase Document ID (read-only)

**activeTab**
- **Typ**: `'overview' | 'tasks' | ...`
- **Beschreibung**: Aktueller Tab

**setActiveTab**
- **Typ**: `(tab) => void`
- **Beschreibung**: Tab wechseln (triggert onTabChange callback)

**loading, setLoading, error, setError, reloadProject**
- Standard Loading/Error State Management

#### Beispiel

```typescript
import { useProject } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';

function ProjectHeader() {
  const { project, projectId, organizationId, setActiveTab } = useProject();

  return (
    <div>
      <h1>{project?.title}</h1>
      <p>Project ID: {projectId}</p>
      <p>Organization ID: {organizationId}</p>

      <button onClick={() => setActiveTab('tasks')}>
        Zu Tasks
      </button>
    </div>
  );
}
```

#### Error Handling

```typescript
function MyComponent() {
  try {
    const context = useProject();
    // Verwende context...
  } catch (error) {
    // Error: "useProject must be used within a ProjectProvider"
    return <div>Component muss innerhalb ProjectProvider verwendet werden</div>;
  }
}
```

---

## PIPELINE_STAGE_PROGRESS

### Übersicht

Zentrale Konstante für Pipeline-Fortschritt-Mapping. Eliminiert Code-Duplikation.

**Datei**: `src/types/project.ts`

---

### Definition

```typescript
export type PipelineStage =
  | 'ideas_planning'      // Ideen & Planung
  | 'creation'           // Erstellung-Phase
  | 'approval'           // Freigabe (kombiniert)
  | 'distribution'       // Verteilung-Phase
  | 'monitoring'         // Monitoring-Phase
  | 'completed';         // Abgeschlossen

export const PIPELINE_STAGE_PROGRESS: Record<PipelineStage, number> = {
  'ideas_planning': 0,    // 0% Ideen & Planung
  'creation': 20,         // 20% Content und Materialien
  'approval': 40,         // 40% Freigabe
  'distribution': 60,     // 60% Verteilung
  'monitoring': 80,       // 80% Monitoring
  'completed': 100        // 100% Abgeschlossen
} as const;
```

---

### Verwendung

```typescript
import { PIPELINE_STAGE_PROGRESS, PipelineStage } from '@/types/project';

function PipelineProgress({ currentStage }: { currentStage: PipelineStage }) {
  const pipelinePercent = PIPELINE_STAGE_PROGRESS[currentStage] || 0;

  return (
    <div>
      <span>Pipeline-Fortschritt: {pipelinePercent}%</span>
    </div>
  );
}
```

---

### Stage-Labels

```typescript
const stageLabels: Record<PipelineStage, string> = {
  'ideas_planning': 'Ideen & Planung',
  'creation': 'Content und Materialien',
  'approval': 'Freigabe',
  'distribution': 'Verteilung',
  'monitoring': 'Monitoring',
  'completed': 'Abgeschlossen'
};

function StageDisplay({ stage }: { stage: PipelineStage }) {
  const label = stageLabels[stage];
  const percent = PIPELINE_STAGE_PROGRESS[stage];

  return <div>{label}: {percent}%</div>;
}
```

---

## Types und Interfaces

### Task Interface

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  organizationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedUserId?: string;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  progress?: number; // 0-100
}
```

---

### Project Interface

```typescript
interface Project {
  id?: string;
  userId: string;
  organizationId: string;

  title: string;
  description?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
  currentStage: PipelineStage;

  assignedTo?: string[];
  tags?: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  completedAt?: Timestamp;

  completedGuideSteps?: string[];
}
```

---

## Performance-Hinweise

### React Query Caching

**Cache-Strategie**:
- **staleTime**: 2 Minuten
- **cacheTime**: 5 Minuten (React Query Default)
- **refetchOnWindowFocus**: true
- **refetchOnMount**: true (wenn Daten stale)

**Optimierung**:
```typescript
// ✅ Gut: Shared Cache zwischen Komponenten
function Component1() {
  const { tasks } = useProjectTasks('project-1', 'org-1');
}
function Component2() {
  const { tasks } = useProjectTasks('project-1', 'org-1'); // Cache-Hit!
}

// ❌ Schlecht: Separate Queries
function Component1() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { /* Load tasks */ }, []);
}
function Component2() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { /* Load tasks AGAIN */ }, []); // Duplicate Query!
}
```

---

### useMemo Optimierung

```typescript
// Progress-Berechnung mit useMemo
const progress = useMemo(() => {
  // Filter-Operationen...
}, [tasks]); // Nur neu berechnen wenn tasks sich ändern

// Benchmark (100 Tasks):
// - Mit useMemo: 0.1ms (nur bei tasks-Änderung)
// - Ohne useMemo: 0.1ms × Anzahl Renders
```

---

## Troubleshooting

### Problem: Tasks laden nicht

**Check 1**: Sind IDs vorhanden?
```typescript
console.log('projectId:', projectId);
console.log('organizationId:', organizationId);
```

**Check 2**: React Query enabled?
```typescript
const { isLoading, error, fetchStatus } = useProjectTasks(projectId, organizationId);
console.log('fetchStatus:', fetchStatus); // 'idle' = disabled, 'fetching' = läuft
```

**Check 3**: Firestore Rules?
```typescript
// Teste Firestore-Zugriff direkt
const tasks = await taskService.getByProjectId(organizationId, projectId);
console.log('Direct fetch:', tasks);
```

---

### Problem: Context undefined

**Fehler**: "useProject must be used within a ProjectProvider"

**Lösung**: Component innerhalb ProjectProvider wrappen
```typescript
// ❌ Falsch
<MyComponent /> // useProject() wirft Error

// ✅ Richtig
<ProjectProvider projectId={id} organizationId={orgId}>
  <MyComponent /> // useProject() funktioniert
</ProjectProvider>
```

---

### Problem: Progress zeigt falsche Werte

**Check**: Task-Status korrekt?
```typescript
const { tasks, progress } = useProjectTasks(projectId, organizationId);

console.log('Total Tasks:', progress.totalTasks);
console.log('Completed:', progress.completedTasks);

// Debug: Welche Tasks sind completed?
const completedTasks = tasks.filter(t => t.status === 'completed');
console.log('Completed Tasks:', completedTasks);
```

---

**Erstellt**: 2025-10-22
**Autor**: Claude Code
**Version**: 1.0.0

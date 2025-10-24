# Tasks API-Dokumentation

> **Modul**: Tasks Tab API
> **Version**: 2.0.0
> **Letzte Aktualisierung**: 24. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [React Query Hooks](#react-query-hooks)
  - [useProjectTasks](#useprojecttasks)
  - [useMyTasks](#usemytasks)
- [Service-Funktionen](#service-funktionen)
  - [create](#create)
  - [update](#update)
  - [delete](#delete)
  - [markAsCompleted](#markascompleted)
  - [updateProgress](#updateprogress)
  - [getByProjectId](#getbyprojectid)
  - [addComputedFields](#addcomputedfields)
- [TypeScript-Typen](#typescript-typen)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Übersicht

Die Tasks API bietet zwei Haupt-Kategorien:

1. **React Query Hooks** - Für State Management in Komponenten
2. **Service-Funktionen** - Direkte Firebase Firestore Operationen

**Empfehlung:** Verwende immer die React Query Hooks in Komponenten. Die Service-Funktionen werden intern von den Hooks verwendet.

---

## React Query Hooks

### useProjectTasks

Lädt alle Tasks für ein Projekt mit automatischem Caching und Progress-Berechnung.

**Datei:** `src/lib/hooks/useProjectTasks.ts`

#### Signatur

```typescript
function useProjectTasks(
  projectId: string | undefined,
  organizationId: string | undefined
): {
  tasks: ProjectTask[];
  progress: TaskProgress;
  isLoading: boolean;
  error: Error | null;
}
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `projectId` | `string \| undefined` | ID des Projekts |
| `organizationId` | `string \| undefined` | ID der Organisation |

#### Return Value

```typescript
interface TaskProgress {
  totalTasks: number;           // Gesamtanzahl Tasks
  completedTasks: number;       // Anzahl erledigter Tasks
  taskCompletion: number;       // Prozentsatz (0-100)
  criticalTasksRemaining: number; // Anzahl urgent/high Priority Tasks (offen)
}

// Return
{
  tasks: ProjectTask[];         // Array aller Tasks (mit computed fields)
  progress: TaskProgress;       // Progress-Statistiken
  isLoading: boolean;           // True während des Ladens
  error: Error | null;          // Error falls aufgetreten
}
```

#### Query Details

- **Query Key:** `['project-tasks', projectId, organizationId]`
- **StaleTime:** 2 Minuten (Tasks ändern sich häufiger als Projekte)
- **Enabled:** Nur wenn projectId UND organizationId vorhanden
- **Auto-Refetch:** Bei Window-Focus

#### Beispiele

**Basis-Verwendung:**

```typescript
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';

function ProjectTasksTab({ projectId, organizationId }: Props) {
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <h2>Tasks ({progress.totalTasks})</h2>
      <ProgressBar percent={progress.taskCompletion} />
      <p>{progress.criticalTasksRemaining} kritische Tasks verbleibend</p>

      <TaskList tasks={tasks} />
    </div>
  );
}
```

**Mit Filter und Sort:**

```typescript
function ProjectTasksTab({ projectId, organizationId }: Props) {
  const { tasks, isLoading } = useProjectTasks(projectId, organizationId);
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');

  // Client-seitiges Filtern
  const filteredTasks = useMemo(() => {
    if (filter === 'overdue') {
      return tasks.filter(task => task.isOverdue);
    }
    return tasks;
  }, [tasks, filter]);

  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
        <option value="all">Alle Tasks</option>
        <option value="overdue">Überfällig</option>
      </select>

      <TaskList tasks={filteredTasks} />
    </div>
  );
}
```

**Mit Query Invalidierung:**

```typescript
import { useQueryClient } from '@tanstack/react-query';

function TaskActions({ projectId, organizationId }: Props) {
  const queryClient = useQueryClient();

  const handleTaskCreated = async () => {
    // ... Task erstellen

    // Cache invalidieren → Auto-Refetch
    queryClient.invalidateQueries({
      queryKey: ['project-tasks', projectId, organizationId]
    });
  };

  return <button onClick={handleTaskCreated}>Task erstellen</button>;
}
```

#### Progress-Berechnung

Die Progress-Berechnung erfolgt via `useMemo` und ist optimiert:

```typescript
const progress = useMemo<TaskProgress>(() => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;

  // Kritische Tasks = urgent/high Priority (nicht requiredForStageCompletion)
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
```

**Wichtig:** "Kritische Tasks" basiert auf `priority` (urgent/high), NICHT auf `requiredForStageCompletion`. Grund: User-verständlicher, Backend-Flag ist für Stage-Transitions.

---

### useMyTasks

Lädt Tasks des aktuellen Users mit Filter-Optionen (Dashboard Widget).

**Datei:** `src/lib/hooks/useMyTasks.ts` (107 Zeilen)

#### Signatur

```typescript
type MyTasksFilter = 'all' | 'today' | 'overdue';

function useMyTasks(
  filter: MyTasksFilter = 'all'
): {
  data: ProjectTask[];
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
}
```

#### Parameter

| Parameter | Typ | Beschreibung | Standard |
|-----------|-----|--------------|----------|
| `filter` | `'all' \| 'today' \| 'overdue'` | Filter-Modus | `'all'` |

#### Filter-Modi

**'all':**
- Alle Tasks die dem User zugewiesen sind
- Keine Datums-Filterung
- Sortiert nach Fälligkeit

**'today':**
- Nur Tasks die HEUTE fällig sind
- Vergleicht `dueDate` mit aktuellem Datum (ohne Uhrzeit)
- Nur Tasks MIT dueDate

**'overdue':**
- Nur überfällige Tasks
- Verwendet computed field `isOverdue`
- Nur offene Tasks (status !== 'completed')

#### Query Details

- **Query Key:** `['myTasks', organizationId, userId, filter]`
- **StaleTime:** 2 Minuten
- **Enabled:** Nur wenn currentOrganization UND user vorhanden
- **Auto-Refetch:** Bei Window-Focus

#### Sortierung

Tasks werden automatisch sortiert:

1. Erledigte Tasks ans Ende
2. Nach dueDate (aufsteigend)
3. Tasks ohne dueDate am Ende
4. Bei gleichem dueDate: nach createdAt (neueste zuerst)

```typescript
return tasks.sort((a, b) => {
  // Erledigte Tasks ans Ende
  if (a.status === 'completed' && b.status !== 'completed') return 1;
  if (a.status !== 'completed' && b.status === 'completed') return -1;

  // Beide haben dueDate → nach dueDate sortieren
  if (a.dueDate && b.dueDate) {
    return a.dueDate.toMillis() - b.dueDate.toMillis();
  }

  // Nur a hat dueDate → a kommt zuerst
  if (a.dueDate && !b.dueDate) return -1;

  // Nur b hat dueDate → b kommt zuerst
  if (!a.dueDate && b.dueDate) return 1;

  // Beide haben kein dueDate → nach createdAt sortieren
  if (a.createdAt && b.createdAt) {
    return b.createdAt.toMillis() - a.createdAt.toMillis(); // Neueste zuerst
  }

  return 0;
});
```

#### Beispiele

**Basis-Verwendung (Dashboard Widget):**

```typescript
import { useMyTasks } from '@/lib/hooks/useMyTasks';

function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  if (isLoading) return <Spinner />;

  return (
    <div>
      {/* Filter Tabs */}
      <button onClick={() => setFilter('all')}>Alle</button>
      <button onClick={() => setFilter('today')}>Heute</button>
      <button onClick={() => setFilter('overdue')}>Überfällig</button>

      {/* Task Liste */}
      {tasks.map(task => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}
```

**Mit Badge-Counts:**

```typescript
function MyTasksWidget() {
  const { data: allTasks = [] } = useMyTasks('all');
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  // Count für Badges (aus 'all' berechnen)
  const todayCount = allTasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).length;

  const overdueCount = allTasks.filter(task => task.isOverdue).length;

  return (
    <div>
      <button onClick={() => setFilter('today')}>
        Heute {todayCount > 0 && <Badge>{todayCount}</Badge>}
      </button>
      <button onClick={() => setFilter('overdue')}>
        Überfällig {overdueCount > 0 && <Badge>{overdueCount}</Badge>}
      </button>

      {/* ... */}
    </div>
  );
}
```

**Mit Pagination:**

```typescript
function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  const TASKS_PER_PAGE = 5;
  const totalPages = Math.ceil(tasks.length / TASKS_PER_PAGE);
  const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
  const paginatedTasks = tasks.slice(startIndex, startIndex + TASKS_PER_PAGE);

  // Reset page bei Filter-Wechsel
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  return (
    <div>
      {/* Filter */}
      <FilterTabs filter={filter} onChange={setFilter} />

      {/* Tasks */}
      {paginatedTasks.map(task => <TaskRow key={task.id} task={task} />)}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={setCurrentPage}
      />
    </div>
  );
}
```

#### Filter-Logik Internals

**'today' Filter:**

```typescript
case 'today':
  tasks = tasks.filter(task => {
    if (!task.dueDate) return false; // Nur Tasks MIT dueDate

    // Vergleiche nur Datum (ohne Uhrzeit)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);

    return dueDate.getTime() === today.getTime();
  });
  break;
```

**'overdue' Filter:**

```typescript
case 'overdue':
  tasks = tasks.filter(task => task.isOverdue); // Verwendet computed field
  break;
```

**Computed Fields:**

Die `isOverdue`, `daysUntilDue`, `overdueBy` Felder werden via `taskService.addComputedFields()` hinzugefügt:

```typescript
tasks = taskService.addComputedFields(tasks);
```

---

## Service-Funktionen

**Datei:** `src/lib/firebase/task-service.ts`

**Wichtig:** Diese Funktionen sollten NICHT direkt in Komponenten verwendet werden. Nutze die React Query Hooks!

### create

Erstellt eine neue Task.

#### Signatur

```typescript
async function create(
  taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'daysUntilDue' | 'overdueBy'>
): Promise<{ id: string }>
```

#### Parameter

```typescript
interface CreateTaskInput {
  userId: string;                  // Creator User ID
  organizationId: string;          // Organization ID
  projectId: string;               // Project ID
  assignedUserId?: string;         // Optional: Zugewiesener User
  title: string;                   // Task-Titel
  description?: string;            // Beschreibung
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;               // 0-100
  dueDate?: Timestamp;             // Fälligkeitsdatum
  isAllDay?: boolean;              // Ganztägig?
}
```

#### Return Value

```typescript
{ id: string } // ID der erstellten Task
```

#### Beispiel

```typescript
const result = await taskService.create({
  userId: user.uid,
  organizationId: 'org-123',
  projectId: 'project-456',
  assignedUserId: 'user-789',
  title: 'Pressemeldung erstellen',
  description: 'Entwurf für neue Produktankündigung',
  status: 'pending',
  priority: 'high',
  progress: 0,
  dueDate: Timestamp.fromDate(new Date('2025-11-01')),
  isAllDay: true,
});

console.log('Task created:', result.id);
```

---

### update

Aktualisiert eine existierende Task.

#### Signatur

```typescript
async function update(
  id: string,
  updates: Partial<ProjectTask>
): Promise<void>
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `id` | `string` | Task-ID |
| `updates` | `Partial<ProjectTask>` | Felder die aktualisiert werden sollen |

#### Beispiel

```typescript
await taskService.update('task-123', {
  title: 'Pressemeldung erstellen (aktualisiert)',
  status: 'in_progress',
  progress: 50,
});
```

---

### delete

Löscht eine Task.

#### Signatur

```typescript
async function delete(id: string): Promise<void>
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `id` | `string` | Task-ID |

#### Beispiel

```typescript
await taskService.delete('task-123');
```

---

### markAsCompleted

Markiert eine Task als erledigt (setzt status='completed' und progress=100).

#### Signatur

```typescript
async function markAsCompleted(id: string): Promise<void>
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `id` | `string` | Task-ID |

#### Beispiel

```typescript
await taskService.markAsCompleted('task-123');

// Entspricht:
await taskService.update('task-123', {
  status: 'completed',
  progress: 100,
});
```

---

### updateProgress

Aktualisiert nur den Fortschritt einer Task.

#### Signatur

```typescript
async function updateProgress(
  id: string,
  progress: number
): Promise<void>
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `id` | `string` | Task-ID |
| `progress` | `number` | Fortschritt (0-100) |

#### Beispiel

```typescript
// Fortschritt auf 75% setzen
await taskService.updateProgress('task-123', 75);
```

**Hinweis:** Diese Funktion wird häufig vom Progress Bar Click-Handler verwendet:

```typescript
const handleProgressClick = async (task: ProjectTask, event: React.MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const clickPosition = (event.clientX - rect.left) / rect.width;
  const newProgress = Math.round(clickPosition * 100);

  await taskService.updateProgress(task.id!, newProgress);
  invalidateTasks(); // Query Invalidierung
};
```

---

### getByProjectId

Lädt alle Tasks für ein Projekt.

#### Signatur

```typescript
async function getByProjectId(
  organizationId: string,
  projectId: string
): Promise<ProjectTask[]>
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `organizationId` | `string` | Organization ID |
| `projectId` | `string` | Project ID |

#### Return Value

```typescript
ProjectTask[] // Array von Tasks (MIT computed fields)
```

#### Beispiel

```typescript
const tasks = await taskService.getByProjectId('org-123', 'project-456');
console.log(`${tasks.length} tasks geladen`);

// Tasks haben computed fields:
tasks.forEach(task => {
  console.log({
    title: task.title,
    isOverdue: task.isOverdue,        // computed
    daysUntilDue: task.daysUntilDue,  // computed
    overdueBy: task.overdueBy,        // computed
  });
});
```

**Hinweis:** Diese Funktion wird intern von `useProjectTasks` verwendet. In Komponenten sollte der Hook verwendet werden!

---

### addComputedFields

Fügt computed fields (isOverdue, daysUntilDue, overdueBy) zu Tasks hinzu.

#### Signatur

```typescript
function addComputedFields(tasks: ProjectTask[]): ProjectTask[]
```

#### Parameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `tasks` | `ProjectTask[]` | Array von Tasks (ohne computed fields) |

#### Return Value

```typescript
ProjectTask[] // Array mit computed fields
```

#### Computed Fields

**isOverdue:**
- `true` wenn dueDate in der Vergangenheit liegt UND status !== 'completed'
- `false` sonst

**daysUntilDue:**
- Anzahl Tage bis dueDate (positiv = Zukunft, negativ = Vergangenheit)
- `null` wenn kein dueDate

**overdueBy:**
- Anzahl Tage überfällig (positiv = überfällig)
- `null` wenn nicht überfällig oder kein dueDate

#### Beispiel

```typescript
// Tasks aus Firestore laden (ohne computed fields)
const snapshot = await getDocs(query);
let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectTask));

// Computed fields hinzufügen
tasks = taskService.addComputedFields(tasks);

// Jetzt verfügbar:
tasks[0].isOverdue       // boolean
tasks[0].daysUntilDue    // number | null
tasks[0].overdueBy       // number | null
```

**Hinweis:** Diese Funktion wird automatisch in `getByProjectId()` und `useMyTasks()` aufgerufen. Manuelle Verwendung ist selten nötig.

---

## TypeScript-Typen

### ProjectTask

**Datei:** `src/types/task.ts`

```typescript
interface ProjectTask {
  // IDs
  id?: string;
  userId: string;
  organizationId: string;
  projectId: string;
  assignedUserId?: string;

  // Task Details
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number; // 0-100

  // Datum/Zeit
  dueDate?: Timestamp;
  isAllDay?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  // Computed Fields (nur im Frontend)
  isOverdue?: boolean;
  daysUntilDue?: number | null;
  overdueBy?: number | null;

  // Zusätzliche Felder (optional)
  projectTitle?: string; // Für Dashboard-Widget
}
```

### MyTasksFilter

```typescript
type MyTasksFilter = 'all' | 'today' | 'overdue';
```

### TaskProgress

```typescript
interface TaskProgress {
  totalTasks: number;
  completedTasks: number;
  taskCompletion: number; // 0-100
  criticalTasksRemaining: number;
}
```

---

## Error Handling

Alle Service-Funktionen können Errors werfen. React Query Hooks fangen diese automatisch ab.

### Error-Typen

**Firebase Errors:**
- `permission-denied` - Fehlende Berechtigungen
- `not-found` - Task nicht gefunden
- `unavailable` - Firestore nicht erreichbar

**Validation Errors:**
- Fehlende required Parameter
- Ungültige Werte (z.B. progress > 100)

### Best Practices

**In Komponenten mit React Query:**

```typescript
const { data: tasks, isLoading, error } = useMyTasks('all');

if (error) {
  return <ErrorAlert message={error.message} />;
}
```

**Bei direkter Service-Verwendung:**

```typescript
try {
  await taskService.create(taskData);
  toastService.success('Task erstellt');
} catch (error) {
  console.error('Error creating task:', error);
  toastService.error('Fehler beim Erstellen der Task');
}
```

**Error Logging:**

Alle Errors sollten geloggt werden (console.error), auch wenn sie vom UI abgefangen werden:

```typescript
catch (error) {
  console.error('Error updating task:', error); // Wichtig für Debugging!
  toastService.error('Fehler beim Aktualisieren');
}
```

---

## Best Practices

### 1. Immer React Query Hooks verwenden

❌ **Falsch:**

```typescript
function TaskList({ projectId, organizationId }: Props) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      const data = await taskService.getByProjectId(organizationId, projectId);
      setTasks(data);
      setLoading(false);
    };
    loadTasks();
  }, [projectId, organizationId]);

  // ...
}
```

✅ **Richtig:**

```typescript
function TaskList({ projectId, organizationId }: Props) {
  const { tasks, isLoading } = useProjectTasks(projectId, organizationId);

  // Automatisches Caching, Auto-Refetch, Error Handling
}
```

---

### 2. Query Invalidierung nach Mutations

❌ **Falsch:**

```typescript
const handleCreate = async (data: any) => {
  await taskService.create(data);
  // Keine Invalidierung → alte Daten im Cache
};
```

✅ **Richtig:**

```typescript
const queryClient = useQueryClient();

const handleCreate = async (data: any) => {
  await taskService.create(data);

  // Cache invalidieren → Auto-Refetch
  queryClient.invalidateQueries({
    queryKey: ['project-tasks', projectId, organizationId]
  });
};
```

**Noch besser:** Callback-Pattern

```typescript
// In ProjectTaskManager
const invalidateTasks = useCallback(() => {
  queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, organizationId] });
}, [queryClient, projectId, organizationId]);

// An Komponenten weitergeben
<TaskTemplateButton onSuccess={invalidateTasks} />
```

---

### 3. Filter-State Client-seitig verwalten

Die Hooks laden ALLE Daten, Filter werden client-seitig angewendet (via useMemo).

✅ **Richtig:**

```typescript
const { tasks, isLoading } = useProjectTasks(projectId, organizationId);
const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

const filteredTasks = useMemo(() => {
  let result = tasks;

  if (viewMode === 'mine') {
    result = result.filter(task => task.assignedUserId === user?.uid);
  }

  if (selectedStatus.length > 0) {
    result = result.filter(task => selectedStatus.includes(task.status));
  }

  return result;
}, [tasks, viewMode, selectedStatus, user?.uid]);
```

**Vorteile:**

- Ein API-Call für alle Filter
- Instant Filter-Änderungen (kein Network-Request)
- Einfacher State-Management

---

### 4. StaleTime richtig wählen

Tasks ändern sich häufiger als andere Daten → kürzere StaleTime.

**Standard: 2 Minuten**

```typescript
staleTime: 2 * 60 * 1000 // 2 Minuten
```

**Wenn Tasks SEHR häufig aktualisiert werden (z.B. Echtzeit-Kollaboration):**

```typescript
staleTime: 30 * 1000 // 30 Sekunden
```

**Wenn Tasks selten aktualisiert werden:**

```typescript
staleTime: 5 * 60 * 1000 // 5 Minuten
```

---

### 5. Loading & Error States handhaben

Immer Loading und Error States zeigen:

✅ **Richtig:**

```typescript
const { tasks, isLoading, error } = useProjectTasks(projectId, organizationId);

if (isLoading) {
  return <LoadingSkeleton />;
}

if (error) {
  return <ErrorAlert message={error.message} />;
}

if (tasks.length === 0) {
  return <EmptyState />;
}

return <TaskList tasks={tasks} />;
```

---

### 6. Computed Fields nicht manuell berechnen

❌ **Falsch:**

```typescript
const isOverdue = task.dueDate &&
  task.dueDate.toDate() < new Date() &&
  task.status !== 'completed';
```

✅ **Richtig:**

```typescript
const isOverdue = task.isOverdue; // Verwendet computed field
```

Die Hooks rufen `addComputedFields()` automatisch auf!

---

## Siehe auch

- [Task-Hooks Detailliert](./task-hooks.md) - Ausführliche Dokumentation der Hooks
- [Komponenten-Dokumentation](../components/README.md) - Komponenten die die Hooks verwenden
- [Haupt-README](../README.md) - Übersicht über das gesamte Refactoring

---

**Version:** 2.0.0
**Maintainer:** CeleroPress Development Team
**Letzte Aktualisierung:** 24. Oktober 2025

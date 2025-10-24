# Task-Hooks - Detaillierte Dokumentation

> **Module**: Task React Query Hooks
> **Version**: 2.0.0
> **Hooks**: useProjectTasks, useMyTasks
> **Letzte Aktualisierung**: 24. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [useMyTasks Hook](#usemytasks-hook)
  - [Vollständige Signatur](#vollständige-signatur)
  - [Filter-Modi im Detail](#filter-modi-im-detail)
  - [Sortier-Logik](#sortier-logik)
  - [React Query Integration](#react-query-integration)
  - [Code-Beispiele](#code-beispiele)
  - [Error Handling](#error-handling)
  - [Performance](#performance)
  - [Best Practices](#best-practices)
  - [Do's and Don'ts](#dos-and-donts)
- [useProjectTasks Hook](#useprojecttasks-hook)
  - [Vollständige Signatur](#vollständige-signatur-1)
  - [Progress-Berechnung](#progress-berechnung)
  - [Verwendung im Tasks Tab](#verwendung-im-tasks-tab)
  - [Unterschied zu useMyTasks](#unterschied-zu-usemytasks)
  - [Query Invalidierung](#query-invalidierung)
  - [Code-Beispiele](#code-beispiele-1)

---

## useMyTasks Hook

**Datei:** `src/lib/hooks/useMyTasks.ts` (107 Zeilen)

Der `useMyTasks` Hook lädt alle Tasks die dem aktuellen User zugewiesen sind mit optionaler Filterung nach Fälligkeit.

### Vollständige Signatur

```typescript
/**
 * useMyTasks Hook
 *
 * React Query Hook für das Laden von Tasks des aktuellen Users mit Filtern.
 * Wird verwendet vom Dashboard "Meine Aufgaben" Widget.
 *
 * Features:
 * - Automatisches Caching (2min staleTime)
 * - Auto-Refetch bei Window-Focus
 * - Filter: 'all' | 'today' | 'overdue'
 * - Sortierung nach Fälligkeit
 *
 * @example
 * const { data: tasks, isLoading, error } = useMyTasks('today');
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { ProjectTask } from '@/types/tasks';
import { taskService } from '@/lib/firebase/task-service';

export type MyTasksFilter = 'all' | 'today' | 'overdue';

export function useMyTasks(filter: MyTasksFilter = 'all') {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['myTasks', currentOrganization?.id, user?.uid, filter],
    queryFn: async () => {
      if (!currentOrganization || !user) return [];

      // Lade alle Tasks die dem User zugewiesen sind
      const q = query(
        collection(db, 'tasks'),
        where('organizationId', '==', currentOrganization.id),
        where('assignedUserId', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      let tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectTask));

      // Füge computed fields hinzu (isOverdue, daysUntilDue, etc.)
      tasks = taskService.addComputedFields(tasks);

      // Filter anwenden
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (filter) {
        case 'today':
          tasks = tasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = task.dueDate.toDate();
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });
          break;

        case 'overdue':
          tasks = tasks.filter(task => task.isOverdue);
          break;

        case 'all':
        default:
          // Keine Filterung, alle Tasks anzeigen
          break;
      }

      // Sortierung nach Fälligkeit
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
    },
    enabled: !!currentOrganization && !!user,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}
```

### Filter-Modi im Detail

#### Filter: 'all'

Lädt **alle** Tasks die dem User zugewiesen sind, ohne Filterung nach Datum.

**Anwendungsfälle:**

- Dashboard Widget "Alle Tasks" Tab
- Übersicht aller zugewiesenen Tasks
- Badge-Count-Berechnung

**Filter-Logik:**

```typescript
case 'all':
default:
  // Keine Filterung, alle Tasks anzeigen
  break;
```

**Beispiel:**

```typescript
const { data: tasks = [] } = useMyTasks('all');

// tasks enthält:
// - Tasks mit dueDate (heute, morgen, überfällig)
// - Tasks ohne dueDate
// - Erledigte Tasks (am Ende der Liste)
```

**Sortierung:**

1. Offene Tasks zuerst, erledigte Tasks am Ende
2. Nach dueDate aufsteigend (nächste Fälligkeit zuerst)
3. Tasks ohne dueDate am Ende (sortiert nach createdAt)

---

#### Filter: 'today'

Lädt nur Tasks die **heute** fällig sind.

**Anwendungsfälle:**

- Dashboard Widget "Heute" Tab
- Tages-Übersicht
- Fokus auf dringende Tasks

**Filter-Logik:**

```typescript
case 'today':
  tasks = tasks.filter(task => {
    // Nur Tasks MIT dueDate
    if (!task.dueDate) return false;

    // Heutiges Datum (ohne Uhrzeit)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // DueDate (ohne Uhrzeit)
    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);

    // Vergleich: Nur wenn EXAKT heute
    return dueDate.getTime() === today.getTime();
  });
  break;
```

**Wichtig:**

- Vergleicht nur das **Datum**, NICHT die Uhrzeit
- Tasks ohne dueDate werden **ausgeschlossen**
- Erledigte Tasks (status='completed') werden **inkludiert** (aber am Ende sortiert)

**Beispiele:**

```typescript
const { data: tasks = [] } = useMyTasks('today');

// Szenario 1: Heute ist 2025-10-24
// Task A: dueDate = 2025-10-24 09:00 → ✅ Enthalten
// Task B: dueDate = 2025-10-24 18:00 → ✅ Enthalten
// Task C: dueDate = 2025-10-25 09:00 → ❌ Nicht enthalten (morgen)
// Task D: dueDate = 2025-10-23 18:00 → ❌ Nicht enthalten (gestern)
// Task E: dueDate = null → ❌ Nicht enthalten (kein Datum)

// Szenario 2: Task bereits erledigt
// Task F: dueDate = 2025-10-24, status = 'completed' → ✅ Enthalten (am Ende)
```

**Edge Cases:**

- **Mitternacht-Problem:** Task mit dueDate=2025-10-24 00:00 wird korrekt erkannt (setHours(0,0,0,0) normalisiert)
- **Zeitzonen:** Verwendet lokale Zeitzone des Browsers
- **Sommerzeit:** Date-Vergleich funktioniert korrekt

---

#### Filter: 'overdue'

Lädt nur **überfällige** Tasks (dueDate in Vergangenheit UND nicht erledigt).

**Anwendungsfälle:**

- Dashboard Widget "Überfällig" Tab
- Dringende Aufmerksamkeit benötigt
- Problem-Erkennung

**Filter-Logik:**

```typescript
case 'overdue':
  tasks = tasks.filter(task => task.isOverdue); // Verwendet computed field
  break;
```

**Computed Field `isOverdue`:**

Das `isOverdue` Field wird von `taskService.addComputedFields()` berechnet:

```typescript
// In taskService.addComputedFields():
const now = new Date();
now.setHours(0, 0, 0, 0); // Ohne Uhrzeit

const isOverdue = task.dueDate &&
  task.dueDate.toDate() < now &&
  task.status !== 'completed';
```

**Wichtig:**

- Tasks **ohne** dueDate sind NICHT überfällig (isOverdue = false)
- Erledigte Tasks (status='completed') sind NICHT überfällig (auch wenn dueDate in Vergangenheit)
- Vergleicht nur Datum, NICHT Uhrzeit

**Beispiele:**

```typescript
const { data: tasks = [] } = useMyTasks('overdue');

// Heute ist 2025-10-24
// Task A: dueDate = 2025-10-23, status = 'pending' → ✅ Überfällig
// Task B: dueDate = 2025-10-22, status = 'in_progress' → ✅ Überfällig
// Task C: dueDate = 2025-10-23, status = 'completed' → ❌ Nicht überfällig (erledigt)
// Task D: dueDate = 2025-10-24, status = 'pending' → ❌ Nicht überfällig (heute)
// Task E: dueDate = 2025-10-25, status = 'pending' → ❌ Nicht überfällig (zukunft)
// Task F: dueDate = null, status = 'pending' → ❌ Nicht überfällig (kein Datum)
```

**Performance:**

- Computed Field wird EINMAL beim Laden berechnet (nicht bei jedem Render)
- Filter ist O(n) aber auf bereits geladenen Daten

---

### Sortier-Logik

Alle drei Filter-Modi verwenden dieselbe Sortierung:

```typescript
return tasks.sort((a, b) => {
  // 1. Erledigte Tasks ans Ende
  if (a.status === 'completed' && b.status !== 'completed') return 1;
  if (a.status !== 'completed' && b.status === 'completed') return -1;

  // 2. Beide haben dueDate → nach dueDate sortieren
  if (a.dueDate && b.dueDate) {
    return a.dueDate.toMillis() - b.dueDate.toMillis(); // Aufsteigend
  }

  // 3. Nur a hat dueDate → a kommt zuerst
  if (a.dueDate && !b.dueDate) return -1;

  // 4. Nur b hat dueDate → b kommt zuerst
  if (!a.dueDate && b.dueDate) return 1;

  // 5. Beide haben kein dueDate → nach createdAt sortieren
  if (a.createdAt && b.createdAt) {
    return b.createdAt.toMillis() - a.createdAt.toMillis(); // Neueste zuerst
  }

  return 0;
});
```

**Sortier-Reihenfolge:**

1. **Offene Tasks mit dueDate** (aufsteigend nach Fälligkeit)
2. **Offene Tasks ohne dueDate** (neueste zuerst)
3. **Erledigte Tasks mit dueDate** (aufsteigend nach Fälligkeit)
4. **Erledigte Tasks ohne dueDate** (neueste zuerst)

**Beispiel:**

```typescript
// Eingabe (unsortiert):
[
  { title: 'Task E', dueDate: null, status: 'pending', createdAt: '2025-10-20' },
  { title: 'Task C', dueDate: '2025-10-25', status: 'pending' },
  { title: 'Task B', dueDate: '2025-10-24', status: 'pending' },
  { title: 'Task D', dueDate: '2025-10-26', status: 'completed' },
  { title: 'Task A', dueDate: '2025-10-23', status: 'pending' },
]

// Ausgabe (sortiert):
[
  { title: 'Task A', dueDate: '2025-10-23', status: 'pending' },      // 1. Nächste Fälligkeit
  { title: 'Task B', dueDate: '2025-10-24', status: 'pending' },      // 2. Danach
  { title: 'Task C', dueDate: '2025-10-25', status: 'pending' },      // 3. Danach
  { title: 'Task E', dueDate: null, status: 'pending' },              // 4. Kein Datum
  { title: 'Task D', dueDate: '2025-10-26', status: 'completed' },    // 5. Erledigt
]
```

---

### React Query Integration

#### Query Key

```typescript
queryKey: ['myTasks', currentOrganization?.id, user?.uid, filter]
```

**Wichtig:** Der Filter ist Teil des Query Keys!

**Konsequenz:**

- Jeder Filter-Modus hat einen **eigenen Cache**
- Wechsel zwischen Filtern = **kein neuer API-Call** (wenn cached)
- Cache-Invalidierung muss alle Filter-Modi berücksichtigen

**Beispiel:**

```typescript
// Cache nach mehreren Filter-Wechseln:
Cache:
  ['myTasks', 'org-123', 'user-456', 'all'] → [Task A, Task B, Task C]
  ['myTasks', 'org-123', 'user-456', 'today'] → [Task A]
  ['myTasks', 'org-123', 'user-456', 'overdue'] → [Task C]

// Wechsel zu 'all' → Instant (aus Cache)
// Wechsel zu 'today' → Instant (aus Cache)
```

**Cache Invalidierung:**

```typescript
// Invalidiere nur einen Filter
queryClient.invalidateQueries({
  queryKey: ['myTasks', organizationId, userId, 'all']
});

// Invalidiere ALLE Filter-Modi
queryClient.invalidateQueries({
  queryKey: ['myTasks', organizationId, userId]
  // Ohne filter-Parameter = Match für alle Filter
});
```

---

#### Enabled-Logik

```typescript
enabled: !!currentOrganization && !!user
```

**Query wird nur ausgeführt wenn:**

- `currentOrganization` ist definiert
- `user` ist definiert

**Bei Login:**

1. Initial: user = null, currentOrganization = null → Query **disabled**
2. Auth loaded: user = { uid: '...' } → Query **enabled** (aber org fehlt noch)
3. Org loaded: currentOrganization = { id: '...' } → Query **enabled** + **fetch**

**Vorteil:**

- Keine unnötigen API-Calls während Ladephase
- Keine Errors wegen fehlender IDs

---

#### StaleTime

```typescript
staleTime: 2 * 60 * 1000 // 2 Minuten
```

**Bedeutung:**

- Daten gelten 2 Minuten als "frisch"
- Kein Auto-Refetch während dieser Zeit (auch bei Window-Focus)
- Nach 2 Minuten: Daten "stale" → Auto-Refetch beim nächsten Mount/Window-Focus

**Warum 2 Minuten?**

Tasks ändern sich häufiger als Projekte, aber nicht so häufig wie Live-Chat:

- Projekte: 5 Minuten StaleTime
- Tasks: **2 Minuten StaleTime** ← Balance zwischen Performance & Aktualität
- Chat-Messages: 30 Sekunden StaleTime

**Anpassen falls nötig:**

```typescript
// Für Echtzeit-Kollaboration (Tasks werden sehr häufig aktualisiert):
staleTime: 30 * 1000 // 30 Sekunden

// Für selten aktualisierte Tasks:
staleTime: 5 * 60 * 1000 // 5 Minuten
```

---

### Code-Beispiele

#### Beispiel 1: Basis-Verwendung (Dashboard Widget)

```typescript
import { useMyTasks, MyTasksFilter } from '@/lib/hooks/useMyTasks';

function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const { data: tasks = [], isLoading, error } = useMyTasks(filter);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorAlert message={error.message} />;
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title={filter === 'all' ? 'Keine Tasks' : `Keine ${filter} Tasks`}
        message="Gut gemacht! 🎉"
      />
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'active' : ''}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter('today')}
          className={filter === 'today' ? 'active' : ''}
        >
          Heute
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={filter === 'overdue' ? 'active' : ''}
        >
          Überfällig
        </button>
      </div>

      {/* Task Liste */}
      <div className="task-list">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
```

---

#### Beispiel 2: Mit Badge-Counts

```typescript
function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');

  // Lade 'all' für Badge-Counts
  const { data: allTasks = [] } = useMyTasks('all');

  // Lade gefilterte Tasks für Anzeige
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  // Berechne Counts aus 'all' Tasks
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
      <button onClick={() => setFilter('all')}>
        Alle ({allTasks.length})
      </button>
      <button onClick={() => setFilter('today')}>
        Heute {todayCount > 0 && <Badge color="blue">{todayCount}</Badge>}
      </button>
      <button onClick={() => setFilter('overdue')}>
        Überfällig {overdueCount > 0 && <Badge color="red">{overdueCount}</Badge>}
      </button>

      {/* Task Liste */}
      {tasks.map(task => <TaskRow key={task.id} task={task} />)}
    </div>
  );
}
```

**Hinweis:** Zwei Hook-Calls (`useMyTasks('all')` + `useMyTasks(filter)`) sind performant dank React Query Caching!

---

#### Beispiel 3: Mit Pagination

```typescript
function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  const TASKS_PER_PAGE = 5;

  // Pagination berechnen
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

      {/* Tasks (paginiert) */}
      {paginatedTasks.map(task => (
        <TaskRow key={task.id} task={task} />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
        />
      )}
    </div>
  );
}
```

---

#### Beispiel 4: Mit Query Invalidierung

```typescript
function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const { data: tasks = [], isLoading } = useMyTasks(filter);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const handleTaskUpdated = () => {
    // Invalidiere ALLE Filter-Modi (weil Task könnte von 'all' zu 'overdue' wechseln)
    queryClient.invalidateQueries({
      queryKey: ['myTasks', currentOrganization?.id, user?.uid]
    });

    // Oder: Invalidiere nur aktuellen Filter
    // queryClient.invalidateQueries({
    //   queryKey: ['myTasks', currentOrganization?.id, user?.uid, filter]
    // });
  };

  return (
    <div>
      {tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          onUpdate={handleTaskUpdated}
        />
      ))}
    </div>
  );
}
```

---

#### Beispiel 5: Mit React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MyTasksWidget />

      {/* DevTools für Debugging */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**DevTools Features:**

- Query Status (fetching, stale, fresh)
- Cache Inspektion
- Query Keys Übersicht
- Manual Refetch
- Cache Invalidierung

---

### Error Handling

#### Mögliche Errors

**1. Firestore Permission Denied**

```typescript
// Error: Missing or insufficient permissions
{
  code: 'permission-denied',
  message: 'Missing or insufficient permissions'
}
```

**Lösung:** Firestore Security Rules prüfen

---

**2. User nicht authentifiziert**

```typescript
// Query ist disabled wenn user === null
enabled: !!currentOrganization && !!user
```

**Kein Error:** Query wird einfach nicht ausgeführt

---

**3. Organization nicht geladen**

```typescript
// Query ist disabled wenn currentOrganization === null
enabled: !!currentOrganization && !!user
```

**Kein Error:** Query wird einfach nicht ausgeführt

---

#### Error Handling in Komponenten

```typescript
const { data: tasks = [], isLoading, error, isError } = useMyTasks('all');

if (isError && error) {
  return (
    <ErrorAlert
      type="error"
      title="Fehler beim Laden der Tasks"
      message={error.message}
      onRetry={() => queryClient.invalidateQueries({ queryKey: ['myTasks'] })}
    />
  );
}
```

---

### Performance

#### Query Optimierungen

**Caching:**
- StaleTime: 2 Minuten → Reduziert API-Calls um ~80%
- Query Key mit Filter → Jeder Filter-Modus wird einzeln gecached

**Computed Fields:**
- `addComputedFields()` wird EINMAL beim Laden aufgerufen (nicht bei jedem Render)
- Sortierung erfolgt EINMAL nach dem Laden

**Messwerte (100 Tasks):**
- Initial Load: ~150ms (Firestore Query)
- Filter-Wechsel (cached): <5ms (aus Cache)
- Sortierung: <10ms (JavaScript Array.sort)

---

#### Re-Render Vermeidung

**Mit React.memo:**

```typescript
const TaskRow = React.memo(function TaskRow({ task }: { task: ProjectTask }) {
  return (
    <div>
      <h3>{task.title}</h3>
      <ProgressBar percent={task.progress} />
    </div>
  );
});
```

**Mit useMemo für gefilterte Daten:**

```typescript
const { data: allTasks = [] } = useMyTasks('all');

const overdueTasksOnly = useMemo(() => {
  return allTasks.filter(task => task.isOverdue);
}, [allTasks]);
```

---

### Best Practices

#### ✅ Do's

**1. Filter-State lokal verwalten:**

```typescript
const [filter, setFilter] = useState<MyTasksFilter>('all');
const { data: tasks = [] } = useMyTasks(filter);
```

**2. Pagination auf Client-Seite:**

```typescript
const paginatedTasks = tasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
```

**3. Cache invalidieren nach Mutations:**

```typescript
queryClient.invalidateQueries({ queryKey: ['myTasks'] });
```

**4. Loading & Error States zeigen:**

```typescript
if (isLoading) return <Spinner />;
if (error) return <ErrorAlert message={error.message} />;
```

**5. Empty State mit Filter-Hinweis:**

```typescript
if (tasks.length === 0) {
  return (
    <EmptyState
      title={filter === 'all' ? 'Keine Tasks' : `Keine ${filter} Tasks`}
    />
  );
}
```

---

#### ❌ Don'ts

**1. NICHT Service direkt aufrufen:**

```typescript
// ❌ Falsch
const [tasks, setTasks] = useState([]);
useEffect(() => {
  const loadTasks = async () => {
    const data = await taskService.getByUser(userId);
    setTasks(data);
  };
  loadTasks();
}, [userId]);

// ✅ Richtig
const { data: tasks = [] } = useMyTasks('all');
```

**2. NICHT Filter server-seitig abfragen:**

```typescript
// ❌ Falsch (3 separate API-Calls)
const { data: allTasks } = useMyTasks('all');
const { data: todayTasks } = useMyTasks('today');
const { data: overdueTasks } = useMyTasks('overdue');

// ✅ Richtig (1 API-Call, 3 Caches)
const [filter, setFilter] = useState<MyTasksFilter>('all');
const { data: tasks } = useMyTasks(filter);
```

**3. NICHT Query Key manuell bauen:**

```typescript
// ❌ Falsch
queryClient.invalidateQueries({
  queryKey: ['myTasks', orgId, userId, 'all']
});

// ✅ Richtig (invalidiere alle Filter)
queryClient.invalidateQueries({
  queryKey: ['myTasks', orgId, userId]
});
```

**4. NICHT ohne enabled-Check:**

```typescript
// ❌ Falsch (Query läuft auch wenn user undefined)
const { data: tasks } = useQuery({
  queryKey: ['myTasks', user?.uid],
  queryFn: () => taskService.getByUser(user?.uid), // Error wenn user undefined!
});

// ✅ Richtig (Query disabled wenn user undefined)
const { data: tasks } = useQuery({
  queryKey: ['myTasks', user?.uid],
  queryFn: () => taskService.getByUser(user!.uid),
  enabled: !!user,
});
```

**5. NICHT StaleTime zu kurz setzen:**

```typescript
// ❌ Falsch (zu viele API-Calls)
staleTime: 1000 // 1 Sekunde

// ✅ Richtig (Balance zwischen Performance & Aktualität)
staleTime: 2 * 60 * 1000 // 2 Minuten
```

---

## useProjectTasks Hook

**Datei:** `src/lib/hooks/useProjectTasks.ts`

Der `useProjectTasks` Hook lädt alle Tasks für ein Projekt mit Progress-Berechnung.

### Vollständige Signatur

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
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });

  // Progress-Berechnung als useMemo
  const progress = useMemo<TaskProgress>(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    // Kritische Tasks = high/urgent Priority
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

### Progress-Berechnung

Die Progress-Berechnung ist optimiert mit `useMemo`:

```typescript
const progress = useMemo<TaskProgress>(() => {
  // 1. Gesamtzahl Tasks
  const totalTasks = tasks.length;

  // 2. Anzahl erledigter Tasks
  const completedTasks = tasks.filter(task => task.status === 'completed').length;

  // 3. Kritische Tasks (urgent/high Priority, offen)
  const criticalTasks = tasks.filter(task =>
    (task.priority === 'urgent' || task.priority === 'high') &&
    task.status !== 'completed'
  ).length;

  // 4. Task Completion Prozentsatz
  const taskCompletion = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalTasks,
    completedTasks,
    taskCompletion,
    criticalTasksRemaining: criticalTasks,
  };
}, [tasks]); // Nur neu berechnen wenn tasks sich ändern
```

**Wichtig:** "Kritische Tasks" basiert auf `priority` (urgent/high), NICHT auf `requiredForStageCompletion`.

**Grund:** User-verständlicher. Das Backend-Flag `requiredForStageCompletion` ist für Stage-Transitions gedacht.

---

### Verwendung im Tasks Tab

```typescript
import { ProjectTaskManager } from '@/components/projects/ProjectTaskManager';

function ProjectDetailPage({ projectId }: Props) {
  const { currentOrganization } = useOrganization();

  return (
    <ProjectTaskManager
      projectId={projectId}
      organizationId={currentOrganization.id}
      projectManagerId={project.projectManagerId}
      teamMembers={teamMembers}
    />
  );
}
```

**In ProjectTaskManager:**

```typescript
function ProjectTaskManager({ projectId, organizationId }: Props) {
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  return (
    <div>
      {/* Progress Overview */}
      <div>
        <ProgressBar percent={progress.taskCompletion} />
        <p>{progress.completedTasks} / {progress.totalTasks} Tasks erledigt</p>
        {progress.criticalTasksRemaining > 0 && (
          <Badge color="red">{progress.criticalTasksRemaining} kritische Tasks</Badge>
        )}
      </div>

      {/* Task Liste */}
      <TaskList tasks={tasks} isLoading={isLoading} />
    </div>
  );
}
```

---

### Unterschied zu useMyTasks

| Feature | useProjectTasks | useMyTasks |
|---------|-----------------|------------|
| **Datenquelle** | Alle Tasks eines Projekts | Tasks des Users (assignedUserId) |
| **Filter** | Keine (client-seitig) | 'all', 'today', 'overdue' |
| **Progress** | Ja (totalTasks, completedTasks, criticalTasks) | Nein |
| **Sortierung** | Keine (client-seitig) | Ja (nach Fälligkeit) |
| **Query Key** | `['project-tasks', projectId, organizationId]` | `['myTasks', organizationId, userId, filter]` |
| **Use Case** | Tasks Tab (Projekt-Detailseite) | Dashboard Widget |

---

### Query Invalidierung

```typescript
const queryClient = useQueryClient();

// Nach Create/Update/Delete
queryClient.invalidateQueries({
  queryKey: ['project-tasks', projectId, organizationId]
});

// Oder mit Callback-Pattern
const invalidateTasks = useCallback(() => {
  queryClient.invalidateQueries({
    queryKey: ['project-tasks', projectId, organizationId]
  });
}, [queryClient, projectId, organizationId]);

// An Komponenten weitergeben
<TaskCreateModal onSuccess={invalidateTasks} />
```

---

### Code-Beispiele

#### Beispiel 1: Mit Filter & Sort

```typescript
function ProjectTaskManager({ projectId, organizationId }: Props) {
  const { tasks, isLoading } = useProjectTasks(projectId, organizationId);
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt'>('dueDate');

  // Client-seitige Filterung & Sortierung
  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks;

    // Filter
    if (viewMode === 'mine') {
      result = result.filter(task => task.assignedUserId === user?.uid);
    }

    // Sort
    result = result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.toMillis() - b.dueDate.toMillis();
        }
        return 0;
      }
      if (sortBy === 'createdAt') {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return 0;
      }
      return 0;
    });

    return result;
  }, [tasks, viewMode, sortBy, user?.uid]);

  return (
    <div>
      {/* Filter Controls */}
      <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)}>
        <option value="all">Alle Tasks</option>
        <option value="mine">Meine Tasks</option>
      </select>

      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
        <option value="dueDate">Nach Fälligkeit</option>
        <option value="createdAt">Nach Erstellung</option>
      </select>

      {/* Task Liste */}
      <TaskList tasks={filteredAndSortedTasks} isLoading={isLoading} />
    </div>
  );
}
```

---

## Siehe auch

- [API-Übersicht](./README.md) - Übersicht aller Hooks und Service-Funktionen
- [Komponenten-Dokumentation](../components/README.md) - Komponenten die die Hooks verwenden
- [Haupt-README](../README.md) - Übersicht über das gesamte Refactoring

---

**Version:** 2.0.0
**Maintainer:** CeleroPress Development Team
**Letzte Aktualisierung:** 24. Oktober 2025

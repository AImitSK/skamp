# Architecture Decision Records (ADRs) - Tasks Tab Refactoring

> **Modul**: Tasks Tab
> **Version**: 2.0.0
> **Anzahl ADRs**: 4
> **Letzte Aktualisierung**: 24. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [Über ADRs](#über-adrs)
- [ADR-Index](#adr-index)
- [ADR-0001: React Query Integration](#adr-0001-react-query-integration)
- [ADR-0002: Dashboard Widget Extraktion](#adr-0002-dashboard-widget-extraktion)
- [ADR-0003: Filter-Architektur (OR-Logik)](#adr-0003-filter-architektur-or-logik)
- [ADR-0004: Task Template System](#adr-0004-task-template-system)

---

## Über ADRs

Architecture Decision Records (ADRs) dokumentieren wichtige Design-Entscheidungen im Projekt mit:

- **Kontext:** Warum war eine Entscheidung nötig?
- **Entscheidung:** Was wurde entschieden?
- **Konsequenzen:** Welche Auswirkungen hat die Entscheidung?
- **Alternativen:** Welche Optionen wurden verworfen und warum?

**Format:** Basiert auf [Michael Nygard's ADR Template](https://github.com/joelparkerhenderson/architecture-decision-record)

---

## ADR-Index

| ADR | Titel | Status | Datum | Auswirkung |
|-----|-------|--------|-------|------------|
| [ADR-0001](#adr-0001-react-query-integration) | React Query Integration | ✅ Akzeptiert | 21. Oktober 2025 | Hoch |
| [ADR-0002](#adr-0002-dashboard-widget-extraktion) | Dashboard Widget Extraktion | ✅ Akzeptiert | 21. Oktober 2025 | Mittel |
| [ADR-0003](#adr-0003-filter-architektur-or-logik) | Filter-Architektur (OR-Logik) | ✅ Akzeptiert | 21. Oktober 2025 | Mittel |
| [ADR-0004](#adr-0004-task-template-system) | Task Template System | ✅ Akzeptiert | 21. Oktober 2025 | Niedrig |

---

## ADR-0001: React Query Integration

**Status:** ✅ Akzeptiert
**Datum:** 21. Oktober 2025
**Entscheider:** CeleroPress Development Team
**Auswirkung:** Hoch (betrifft gesamte Task-Daten-Verwaltung)

### Kontext

Das Tasks Tab Modul benötigte ein State Management für Server-Daten mit folgenden Anforderungen:

1. **Automatisches Caching** - Reduzierung von API-Calls
2. **Auto-Refetch** - Aktuelle Daten bei Window-Focus
3. **Optimistic Updates** - Schnelles UI-Feedback
4. **Error Handling** - Zentrale Fehlerbehandlung
5. **Query Invalidierung** - Cache-Update nach Mutations
6. **Loading States** - Einfaches Loading-Management

**Problem:**

Die ursprüngliche Implementierung verwendete `useState` + `useEffect` + manuelle `loadData()` Funktionen:

```typescript
// Alte Implementierung (Dashboard page.tsx)
const [tasks, setTasks] = useState<ProjectTask[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getByUser(user.uid);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  loadTasks();
}, [user?.uid]);

// Problem: Nach Create/Update/Delete muss manuell refetched werden
const handleCreate = async (data: any) => {
  await taskService.create(data);
  loadTasks(); // Manuelles Refetch
};
```

**Nachteile:**

- ❌ Kein Caching (jedes Mount = neuer API-Call)
- ❌ Kein Auto-Refetch (Daten veralten)
- ❌ Manuelles Refetch nach Mutations
- ❌ Boilerplate Code (loading, error, setState)
- ❌ Race Conditions möglich

---

### Entscheidung

Wir entschieden uns für **React Query v5** (`@tanstack/react-query`) als State Management Lösung für alle Task-Daten.

**Implementation:**

```typescript
// Neue Implementierung: useProjectTasks Hook
import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/lib/firebase/task-service';

export function useProjectTasks(
  projectId: string | undefined,
  organizationId: string | undefined
) {
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

  // ... Progress-Berechnung

  return { tasks, progress, isLoading, error };
}
```

```typescript
// Neue Implementierung: useMyTasks Hook
export function useMyTasks(filter: MyTasksFilter = 'all') {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['myTasks', currentOrganization?.id, user?.uid, filter],
    queryFn: async () => {
      // ... Firestore Query
      // ... Filter-Logik
      return sortedTasks;
    },
    enabled: !!currentOrganization && !!user,
    staleTime: 2 * 60 * 1000,
  });
}
```

**Verwendung in Komponenten:**

```typescript
// Komponente
function ProjectTaskManager({ projectId, organizationId }: Props) {
  const { tasks, isLoading, error } = useProjectTasks(projectId, organizationId);
  const queryClient = useQueryClient();

  const handleCreate = async (data: any) => {
    await taskService.create(data);

    // Automatische Query Invalidierung
    queryClient.invalidateQueries({
      queryKey: ['project-tasks', projectId, organizationId]
    });
  };

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return <TaskList tasks={tasks} />;
}
```

---

### Alternativen

Wir evaluierten folgende Alternativen:

#### Alternative 1: Redux Toolkit + RTK Query

**Vorteile:**

- ✅ Etabliert, große Community
- ✅ Redux DevTools
- ✅ Zentrale State Management (nicht nur Server-Daten)

**Nachteile:**

- ❌ Mehr Boilerplate Code (Slices, Actions, Reducers)
- ❌ Komplexere Setup
- ❌ Overkill für reines Server State Management
- ❌ Steepere Learning Curve

**Begründung für Verwerfung:**

Zu komplex für unsere Anforderungen. Tasks sind primär Server-State, kein globaler UI-State nötig.

---

#### Alternative 2: Zustand + SWR

**Vorteile:**

- ✅ Leichtgewichtig
- ✅ Einfaches API
- ✅ Weniger Dependencies

**Nachteile:**

- ❌ Weniger Features als React Query
- ❌ Manuelle Cache-Verwaltung komplexer
- ❌ Query Invalidierung weniger elegant
- ❌ Keine Mutation Hooks

**Begründung für Verwerfung:**

React Query bietet mehr Features out-of-the-box. Zustand ist besser für Client-State.

---

#### Alternative 3: Apollo Client (GraphQL)

**Vorteile:**

- ✅ Sehr mächtig
- ✅ Automatische Cache Normalization
- ✅ GraphQL-Integration

**Nachteile:**

- ❌ Benötigt GraphQL Backend (Firebase ist REST-like)
- ❌ Overkill für unsere Use Cases
- ❌ Größere Bundle Size

**Begründung für Verwerfung:**

Firebase Firestore ist kein GraphQL Backend. Migration zu GraphQL wäre zu aufwändig.

---

#### Alternative 4: Bestehendes Pattern (useState + useEffect)

**Vorteile:**

- ✅ Keine neue Dependency
- ✅ Team kennt Pattern bereits

**Nachteile:**

- ❌ Kein Caching
- ❌ Manuelles Refetch
- ❌ Viel Boilerplate
- ❌ Fehleranfällig (Race Conditions)

**Begründung für Verwerfung:**

Zu viele manuelle Schritte, fehleranfällig. React Query löst alle Probleme automatisch.

---

### Konsequenzen

#### ✅ Vorteile

1. **Weniger Code:**
   - Dashboard page.tsx: 1.466 → 1.039 Zeilen (-427 Zeilen, -29%)
   - ProjectTaskManager: 888 → 367 Zeilen (-521 Zeilen, -59%)

2. **Automatisches Caching:**
   - StaleTime: 2 Minuten
   - Reduziert API-Calls um ~80%

3. **Auto-Refetch:**
   - Bei Window-Focus
   - Bei Network-Reconnect

4. **Einfache Query Invalidierung:**
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
   ```

5. **Built-in Error Handling:**
   ```typescript
   const { error } = useProjectTasks(projectId, organizationId);
   if (error) return <ErrorAlert message={error.message} />;
   ```

6. **Loading States:**
   ```typescript
   const { isLoading } = useProjectTasks(projectId, organizationId);
   if (isLoading) return <Spinner />;
   ```

#### ⚠️ Trade-offs

1. **Neue Dependency:**
   - `@tanstack/react-query` (~50KB gzipped)
   - Akzeptabel für Feature-Set

2. **Learning Curve:**
   - Team muss React Query lernen
   - Dokumentation vorhanden
   - Investment lohnt sich

3. **Query Key Management:**
   - Konsistente Query Keys wichtig
   - Dokumentiert in ADR

#### 🔮 Zukünftige Verbesserungen

- Optimistic Updates für schnelleres UI-Feedback
- Prefetching für häufig besuchte Projekt-Tasks
- Infinite Queries für Pagination (falls >1000 Tasks)

---

## ADR-0002: Dashboard Widget Extraktion

**Status:** ✅ Akzeptiert
**Datum:** 21. Oktober 2025
**Entscheider:** CeleroPress Development Team
**Auswirkung:** Mittel (betrifft Dashboard-Struktur)

### Kontext

Das Dashboard (`app/dashboard/page.tsx`) enthielt eine "Meine Aufgaben" Sektion mit ~450 Zeilen Code:

- Filter-Tabs (Alle, Heute, Überfällig)
- Task-Tabelle mit Pagination
- Loading & Empty States
- Badge-Counts
- Projekt-Links

**Problem:**

```typescript
// Dashboard page.tsx (1.466 Zeilen, zu groß)
export default function DashboardPage() {
  // ... andere State
  const [myTasksFilter, setMyTasksFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [myTasksPage, setMyTasksPage] = useState(1);

  // ... Tasks laden (50+ Zeilen)

  return (
    <div>
      {/* ... andere Widgets */}

      {/* "Meine Aufgaben" Widget (450 Zeilen) */}
      <div>
        {/* Filter Tabs */}
        {/* Task Table */}
        {/* Pagination */}
      </div>

      {/* ... weitere Widgets */}
    </div>
  );
}
```

**Nachteile:**

- ❌ Dashboard page.tsx zu groß (1.466 Zeilen)
- ❌ "Meine Aufgaben" Code nicht wiederverwendbar
- ❌ Schwer zu testen (alles in einer Datei)
- ❌ State Management unübersichtlich

---

### Entscheidung

Wir extrahierten "Meine Aufgaben" in eine **wiederverwendbare Komponente**: `MyTasksWidget.tsx`

**Implementation:**

```typescript
// src/components/dashboard/MyTasksWidget.tsx (344 Zeilen)
export function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // React Query Hook (autark)
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  // ... Pagination Logic
  // ... Badge Counts
  // ... Rendering

  return (
    <div>
      {/* Filter Tabs */}
      {/* Task Table */}
      {/* Pagination */}
    </div>
  );
}
```

**Verwendung:**

```typescript
// Dashboard page.tsx (1.039 Zeilen, -427 Zeilen)
import { MyTasksWidget } from '@/components/dashboard/MyTasksWidget';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <MyTasksWidget />
      {/* Weitere Widgets */}
    </div>
  );
}
```

**Features:**

- Keine Props benötigt (verwendet `useAuth()` + `useOrganization()` intern)
- Eigenes State Management
- Eigener React Query Hook (`useMyTasks`)
- Vollständig autark

---

### Alternativen

#### Alternative 1: Inline-Code beibehalten

**Vorteile:**

- ✅ Keine neue Datei
- ✅ Alles an einem Ort

**Nachteile:**

- ❌ Dashboard page.tsx bleibt zu groß
- ❌ Nicht wiederverwendbar
- ❌ Schwer zu testen

**Begründung für Verwerfung:** Code-Qualität leidet.

---

#### Alternative 2: Widget mit vielen Props

```typescript
<MyTasksWidget
  userId={user.uid}
  organizationId={currentOrganization.id}
  filter={myTasksFilter}
  onFilterChange={setMyTasksFilter}
  currentPage={myTasksPage}
  onPageChange={setMyTasksPage}
/>
```

**Vorteile:**

- ✅ Explizite Dependencies

**Nachteile:**

- ❌ Zu viele Props
- ❌ State Management aufgeteilt (teilweise in Dashboard, teilweise in Widget)
- ❌ Komplexere Integration

**Begründung für Verwerfung:** Widget soll autark sein.

---

#### Alternative 3: Separate Page statt Widget

**Vorteile:**

- ✅ Vollständige Isolation

**Nachteile:**

- ❌ Nicht auf Dashboard sichtbar
- ❌ User muss navigieren

**Begründung für Verwerfung:** Dashboard-Widget ist besser für Übersicht.

---

### Konsequenzen

#### ✅ Vorteile

1. **Code-Reduktion:**
   - Dashboard page.tsx: 1.466 → 1.039 Zeilen (-29%)

2. **Wiederverwendbarkeit:**
   - Widget kann in anderen Dashboards verwendet werden
   - Potenzial für Team-Dashboards

3. **Testbarkeit:**
   - Widget kann isoliert getestet werden
   - 13 Tests implementiert

4. **Einfache Integration:**
   ```typescript
   <MyTasksWidget /> // Keine Props!
   ```

5. **Eigenständigkeit:**
   - Verwaltet eigenen State
   - Lädt eigene Daten
   - Keine Dependencies zum Parent

#### ⚠️ Trade-offs

1. **Neue Datei:**
   - MyTasksWidget.tsx (344 Zeilen)
   - Akzeptabel für Modularität

2. **Keine Konfiguration:**
   - Filter-Tabs sind fest (Alle, Heute, Überfällig)
   - Tasks-Per-Page fest (5)
   - OK für Standard-Use-Case

#### 🔮 Zukünftige Verbesserungen

- Optional Props für Konfiguration (falls benötigt)
- Team-Tasks-Widget (analog zu MyTasksWidget)
- Project-Overview-Widget (Top-Tasks pro Projekt)

---

## ADR-0003: Filter-Architektur (OR-Logik)

**Status:** ✅ Akzeptiert
**Datum:** 21. Oktober 2025
**Entscheider:** CeleroPress Development Team
**Auswirkung:** Mittel (betrifft UX und Filter-Logik)

### Kontext

Das Tasks Tab Filter-Panel bietet Multi-Select Filter:

- **Fälligkeit:** Heute, Überfällig, Zukünftig, Kein Datum
- **Status:** Offen, In Bearbeitung, Erledigt
- **Zuständige Mitglieder:** Team-Member-Liste

**Problem:**

Wie sollen Multi-Select Filter verknüpft werden?

**Option 1: AND-Verknüpfung**

```typescript
// User wählt: Status = [Offen, In Bearbeitung]
// AND-Logik: Task muss BEIDE Status haben (unmöglich!)
filtered = tasks.filter(task =>
  selectedStatusFilters.every(status => task.status === status)
);
// Ergebnis: Leer (Task kann nicht gleichzeitig offen UND in_progress sein)
```

**Option 2: OR-Verknüpfung**

```typescript
// User wählt: Status = [Offen, In Bearbeitung]
// OR-Logik: Task muss EINEN der Status haben
filtered = tasks.filter(task =>
  selectedStatusFilters.includes(task.status)
);
// Ergebnis: Alle offenen UND in-progress Tasks
```

**Frage:** Welche Logik ist user-freundlicher?

---

### Entscheidung

Wir entschieden uns für **OR-Verknüpfung** bei Multi-Select Filtern.

**Implementation:**

```typescript
// Status Filter (OR)
if (selectedStatusFilters.length > 0) {
  filtered = filtered.filter(task =>
    selectedStatusFilters.includes(task.status) // OR: 'pending' OR 'in_progress'
  );
}

// Fälligkeits-Filter (OR)
if (selectedDueDateFilters.length > 0) {
  filtered = filtered.filter(task => {
    return selectedDueDateFilters.some(filter => {
      if (filter === 'today') { return /* ... */; }
      if (filter === 'overdue') { return /* ... */; }
      if (filter === 'future') { return /* ... */; }
      if (filter === 'no-date') { return /* ... */; }
      return false;
    });
  });
}

// Zuständige Mitglieder Filter (OR)
if (selectedAssigneeIds.length > 0) {
  filtered = filtered.filter(task =>
    task.assignedUserId && selectedAssigneeIds.includes(task.assignedUserId)
  );
}
```

**Wichtig:** Zwischen Filter-Kategorien ist die Verknüpfung **AND**:

```typescript
// User wählt:
// - Status: [Offen, In Bearbeitung]
// - Zuständige: [User A, User B]

// Logik:
// (Status = Offen OR Status = In Bearbeitung) AND (Zuständige = User A OR Zuständige = User B)

filtered = tasks.filter(task => {
  const statusMatch = selectedStatusFilters.includes(task.status); // OR innerhalb
  const assigneeMatch = selectedAssigneeIds.includes(task.assignedUserId); // OR innerhalb
  return statusMatch && assigneeMatch; // AND zwischen Kategorien
});
```

---

### Alternativen

#### Alternative 1: AND-Verknüpfung

**Vorteile:**

- ✅ Striktere Filterung

**Nachteile:**

- ❌ Oft keine Ergebnisse (Task kann nicht mehrere Status gleichzeitig haben)
- ❌ Verwirrend für User
- ❌ Nicht intuitiv

**Begründung für Verwerfung:** Nicht user-freundlich. OR-Logik ist Standard in Filter-UIs.

---

#### Alternative 2: Toggle-Modus (AND/OR umschaltbar)

**Vorteile:**

- ✅ Flexibel
- ✅ User kann wählen

**Nachteile:**

- ❌ Komplexere UI
- ❌ Mehr Verwirrung (welcher Modus ist aktiv?)
- ❌ Overkill für unseren Use-Case

**Begründung für Verwerfung:** Zu komplex. OR-Logik deckt 99% der Use Cases ab.

---

#### Alternative 3: Nur Single-Select

**Vorteile:**

- ✅ Einfachste Logik
- ✅ Keine Verknüpfungs-Frage

**Nachteile:**

- ❌ Weniger flexibel
- ❌ User kann nicht mehrere Status gleichzeitig sehen
- ❌ Schlechtere UX

**Begründung für Verwerfung:** Multi-Select ist user-freundlicher.

---

### Konsequenzen

#### ✅ Vorteile

1. **User-freundlich:**
   - Tasks erscheinen wenn EINE Bedingung erfüllt ist
   - Intuitives Verhalten

2. **Standard-Konform:**
   - Gmail, Jira, Trello verwenden OR-Logik
   - Gewohnte UX

3. **Flexible Filterung:**
   - User kann "Offen ODER In Bearbeitung" wählen
   - Sinnvolle Ergebnisse

4. **Code-Einfachheit:**
   ```typescript
   .filter(task => selectedStatuses.includes(task.status)) // Simple!
   ```

#### ⚠️ Trade-offs

1. **Weniger strikt:**
   - Mehr Ergebnisse (kann überfordern bei vielen Tasks)
   - Lösung: Weitere Filter-Kategorien (Zuständige, Fälligkeit)

2. **Keine AND-Option:**
   - Falls User AND-Logik benötigt, muss er Filter nacheinander anwenden
   - In Praxis selten nötig

#### 🔮 Zukünftige Verbesserungen

- Saved Filter Sets (User kann Filter-Kombinationen speichern)
- Smart Filter (AI-basierte Filter-Vorschläge)

---

## ADR-0004: Task Template System

**Status:** ✅ Akzeptiert
**Datum:** 21. Oktober 2025
**Entscheider:** CeleroPress Development Team
**Auswirkung:** Niedrig (spezifisch für PR-Workflow)

### Kontext

CeleroPress ist eine PR-Software mit standardisiertem Workflow:

1. Strategie-Dokumente erstellen
2. Medien Assets sammeln
3. Pressemeldung entwerfen
4. Freigaben einholen (intern + Kunde)
5. Verteilerliste zusammenstellen
6. Anschreiben erstellen
7. Versand durchführen
8. Monitoring

**Problem:**

User müssen bei jedem neuen Projekt 9+ Tasks manuell erstellen. Das ist:

- ❌ Zeitaufwändig (5-10 Minuten pro Projekt)
- ❌ Fehleranfällig (Tasks vergessen, falsche Reihenfolge)
- ❌ Inkonsistent (jeder User erstellt leicht unterschiedliche Tasks)

**Frage:** Wie können wir neuen Projekten schneller starten?

---

### Entscheidung

Wir implementierten ein **Task Template System**: Button "Task Vorlage verwenden" erstellt 9 vordefinierte Standard-Tasks.

**Implementation:**

```typescript
// src/components/projects/tasks/TaskTemplateButton.tsx
const TASK_TEMPLATES = [
  {
    title: 'Strategie-Dokumente erstellen',
    description: '- Unternehmensprofil & Senderanalyse\n- Situationsanalyse\n- Zielgruppenanalyse\n- Kernbotschaften & Kommunikationsziele',
    priority: 'medium'
  },
  {
    title: 'Medien Assets zusammenstellen',
    description: '- Bilder hochladen\n- Videos hochladen\n- Key Visual festlegen',
    priority: 'medium'
  },
  // ... 7 weitere Tasks
];

const handleCreateTemplateTasks = async () => {
  for (const template of TASK_TEMPLATES) {
    await taskService.create({
      userId,
      organizationId,
      projectId,
      assignedUserId: userId,
      title: template.title,
      description: template.description,
      status: 'pending',
      priority: template.priority,
      progress: 0,
      isAllDay: true
      // Kein dueDate - User muss selbst setzen
    });
  }

  toastService.success('9 Standard-Tasks erfolgreich erstellt');
  onSuccess(); // Query Invalidierung
};
```

**Features:**

- 9 Tasks mit Titel + Beschreibung
- Priority: 'medium' (User kann ändern)
- Kein dueDate (User muss selbst festlegen)
- Sequenzielle Erstellung (korrekte Reihenfolge via Timestamps)
- Toast-Feedback
- Query Invalidierung

---

### Alternativen

#### Alternative 1: Project-Templates (Projekt-Ebene)

**Vorteile:**

- ✅ Template inklusive Tasks, Files, Team-Members
- ✅ Vollständige Projekt-Vorlage

**Nachteile:**

- ❌ Komplexere Implementation
- ❌ Overkill für MVP
- ❌ User will oft nur Tasks-Template, nicht ganzes Projekt

**Begründung für Verwerfung:** Für Zukunft, nicht jetzt. Task-Templates decken 80% Use-Case ab.

---

#### Alternative 2: Custom Templates (User-defined)

**Vorteile:**

- ✅ Flexibel
- ✅ User kann eigene Templates erstellen

**Nachteile:**

- ❌ Komplexere UI (Template-Management)
- ❌ Overkill für standardisierten Workflow
- ❌ Admin-Aufwand

**Begründung für Verwerfung:** CeleroPress hat standardisierten Workflow. Custom Templates nicht nötig.

---

#### Alternative 3: Checklist statt Tasks

**Vorteile:**

- ✅ Einfacher
- ✅ Weniger Overhead

**Nachteile:**

- ❌ Keine Zuweisungen
- ❌ Kein Progress-Tracking
- ❌ Kein dueDate
- ❌ Keine Integration mit Task-System

**Begründung für Verwerfung:** Tasks bieten mehr Features.

---

#### Alternative 4: Wizard (Step-by-Step)

**Vorteile:**

- ✅ Guided Experience
- ✅ User kann Tasks customizen während Erstellung

**Nachteile:**

- ❌ Komplexere UI
- ❌ Mehr Klicks
- ❌ Langsamerer Workflow

**Begründung für Verwerfung:** One-Click-Lösung ist schneller.

---

### Konsequenzen

#### ✅ Vorteile

1. **Schneller Projektstart:**
   - 9 Tasks in <5 Sekunden erstellt
   - Vorher: 5-10 Minuten manuell

2. **Konsistenz:**
   - Alle Projekte haben dieselben Standard-Tasks
   - Keine Tasks vergessen

3. **Einfache Bedienung:**
   ```typescript
   <TaskTemplateButton
     projectId={projectId}
     organizationId={organizationId}
     userId={userId}
     onSuccess={invalidateTasks}
   />
   ```

4. **User-freundlich:**
   - One-Click-Lösung
   - Toast-Feedback
   - Tasks können nachträglich angepasst werden

#### ⚠️ Trade-offs

1. **Hardcoded Templates:**
   - 9 Tasks fest definiert
   - Nicht customizebar
   - OK für standardisierten Workflow

2. **Keine dueDatess:**
   - User muss dueDate manuell setzen
   - Bewusste Entscheidung (jedes Projekt hat anderen Zeitplan)

3. **Sequenzielle Erstellung:**
   - for-Loop statt Promise.all (langsamer)
   - Grund: Korrekte Reihenfolge via Timestamps
   - Akzeptabel (<5 Sekunden für 9 Tasks)

#### 🔮 Zukünftige Verbesserungen

- Custom Templates (Admin-Panel für Template-Management)
- Template-Kategorien (PR-Workflow, Event-Management, etc.)
- Template-Sharing (zwischen Organizations)
- AI-generierte Templates basierend auf Projekt-Typ

---

## Zusammenfassung

### Key Decisions

1. **React Query Integration** (ADR-0001)
   - Automatisches Caching, Auto-Refetch, Query Invalidierung
   - -948 Zeilen Code-Reduktion

2. **Dashboard Widget Extraktion** (ADR-0002)
   - Wiederverwendbare MyTasksWidget-Komponente
   - -427 Zeilen im Dashboard

3. **OR-Filter-Logik** (ADR-0003)
   - User-freundliche Multi-Select Filter
   - Standard-konform (wie Gmail, Jira)

4. **Task Template System** (ADR-0004)
   - 9 Standard-Tasks für PR-Workflow
   - Schnellerer Projektstart

### Impact Summary

| ADR | Code Impact | UX Impact | Future-Proofing |
|-----|-------------|-----------|-----------------|
| ADR-0001 | 🔥 Hoch (-948 Zeilen) | ⚡ Hoch (Performance) | ✅ Exzellent |
| ADR-0002 | 🟡 Mittel (-427 Zeilen) | 🟢 Mittel (Modularität) | ✅ Gut |
| ADR-0003 | 🟢 Niedrig | ⚡ Hoch (User-freundlich) | ✅ Gut |
| ADR-0004 | 🟢 Niedrig (+135 Zeilen) | ⚡ Hoch (Produktivität) | 🟡 Mittel |

### Lessons Learned

1. **React Query ist ein Game-Changer** für Server State Management
2. **Extraktion von Widgets** verbessert Code-Qualität massiv
3. **OR-Logik** ist Standard in Filter-UIs (nicht AND)
4. **Templates** sparen Zeit und verbessern Konsistenz

---

## Siehe auch

- [Haupt-README](../README.md) - Übersicht über das gesamte Refactoring
- [API-Dokumentation](../api/README.md) - Hooks und Service-Funktionen
- [Komponenten-Dokumentation](../components/README.md) - Alle 6 Komponenten

---

**Version:** 2.0.0
**Maintainer:** CeleroPress Development Team
**Letzte Aktualisierung:** 24. Oktober 2025

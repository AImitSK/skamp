# Tasks Komponenten-Dokumentation

> **Modul**: Tasks Tab Komponenten
> **Version**: 2.0.0
> **Anzahl Komponenten**: 6
> **Letzte Aktualisierung**: 24. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Komponenten-Architektur](#komponenten-architektur)
- [TaskList](#tasklist)
- [TaskListItem](#tasklistitem)
- [TaskFilterPanel](#taskfilterpanel)
- [TaskTemplateButton](#tasktemplatebutton)
- [MyTasksWidget](#mytaskswidget)
- [ProjectTaskManager](#projecttaskmanager)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

---

## Übersicht

Das Tasks Tab Modul besteht aus 6 Haupt-Komponenten, die modular und wiederverwendbar sind:

| Komponente | Zeilen | Rolle | Wiederverwendbar |
|------------|--------|-------|------------------|
| TaskList | 170 | Container für Task-Tabelle | ✅ Ja |
| TaskListItem | 185 | Einzelne Task-Row | ✅ Ja |
| TaskFilterPanel | 302 | Filter-UI mit Popover | ✅ Ja |
| TaskTemplateButton | 135 | Standard-Tasks erstellen | ⚠️ Spezifisch für PR-Workflow |
| MyTasksWidget | 344 | Dashboard Widget | ✅ Ja |
| ProjectTaskManager | 367 | Main Orchestrator | ❌ Spezifisch für Tasks Tab |

**Gesamt:** 1.503 Zeilen (vorher 2.354 Zeilen)
**Reduktion:** -851 Zeilen (-36%)

---

## Komponenten-Architektur

### Hierarchie

```
ProjectTaskManager (Main Orchestrator)
├── TaskFilterPanel
│   ├── View Mode Select
│   ├── Quick Filter Buttons
│   └── Popover
│       ├── Fälligkeits-Filter
│       ├── Status-Filter
│       ├── Zuständige-Filter
│       └── Sortierung
├── TaskList
│   ├── Loading State (Skeleton)
│   ├── Empty State
│   └── TaskListItem[]
│       ├── Status Icon
│       ├── Task Title
│       ├── Assigned Member
│       ├── Progress Bar
│       ├── Due Date
│       └── Actions Dropdown
└── TaskTemplateButton

Separate Hierarchie (Dashboard):
MyTasksWidget
├── Filter Tabs
├── Task Table
│   └── Task Rows (kompakt)
└── Pagination
```

### Props-Flow

```
ProjectTaskManager
  ↓ (tasks, handlers, config)
TaskFilterPanel
  ↓ (onFilterChange callbacks)
ProjectTaskManager (State Update)
  ↓ (filteredAndSortedTasks)
TaskList
  ↓ (task, handlers)
TaskListItem[]
  ↓ (onClick event)
ProjectTaskManager (Handler)
  ↓ (API Call)
taskService
  ↓ (success)
Query Invalidierung
  ↓ (Auto-Refetch)
useProjectTasks Hook
  ↓ (neue Daten)
ProjectTaskManager (Re-Render)
```

---

## TaskList

**Datei:** `src/components/projects/tasks/TaskList.tsx`
**Zeilen:** 170
**Rolle:** Container für Task-Tabelle mit Loading & Empty States

### Beschreibung

Die `TaskList` Komponente ist der Container für die Task-Tabelle. Sie zeigt:

- **Loading State:** Skeleton-Loader während des Ladens
- **Empty State:** "Keine Tasks gefunden" mit Create + Template Buttons
- **Table Header:** Spaltenüberschriften (Task, Zugewiesen, Fortschritt, Fälligkeit)
- **TaskListItem[]:** Rendert TaskListItem für jede Task

### Props

```typescript
interface TaskListProps {
  tasks: ProjectTask[];              // Gefilterte und sortierte Tasks
  isLoading: boolean;                // True während des Ladens
  activeFiltersCount: number;        // Anzahl aktiver Filter (für Empty State Text)
  viewMode: 'all' | 'mine';          // Aktueller View Mode
  projectId: string;                 // Für TaskTemplateButton
  organizationId: string;            // Für TaskTemplateButton
  userId: string;                    // Für TaskTemplateButton
  teamMembers: Array<{               // Team-Mitglieder für Assigned Member Lookup
    id: string;
    displayName: string;
    email: string;
    photoUrl?: string;
  }>;
  onEdit: (task: ProjectTask) => void;           // Edit-Handler
  onComplete: (taskId: string, taskTitle: string) => void;  // Complete-Handler
  onDelete: (taskId: string, taskTitle: string) => void;    // Delete-Handler
  onProgressClick: (task: ProjectTask, event: React.MouseEvent) => void;  // Progress-Handler
  onCreateClick: () => void;                     // Create-Button Handler
  onTasksInvalidate: () => void;                 // Query Invalidierung Callback
  formatDate: (date: any) => string;             // Datum-Formatierung
}
```

### Features

#### 1. Loading State (Skeleton)

Zeigt 3 Skeleton-Rows während des Ladens:

```typescript
if (isLoading) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      </div>
      <div className="divide-y divide-gray-200">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>
              {/* ... weitere Skeleton-Elemente */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Design:**

- Gray-200 Background (Tailwind CSS)
- `animate-pulse` für Pulsieren-Effekt
- Grid-Layout wie echte Tabelle

---

#### 2. Empty State

Zeigt "Keine Tasks gefunden" mit hilfreichen Actions:

```typescript
if (tasks.length === 0) {
  return (
    <div className="bg-white rounded-lg border p-8 text-center">
      <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        Keine Tasks gefunden
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {(activeFiltersCount > 0 || viewMode === 'mine')
          ? 'Versuche andere Filter oder erstelle eine neue Task.'
          : 'Erstelle die erste Task für dieses Projekt.'
        }
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button onClick={onCreateClick}>
          <PlusIcon className="w-4 h-4" />
          Task erstellen
        </Button>
        <TaskTemplateButton
          projectId={projectId}
          organizationId={organizationId}
          userId={userId}
          disabled={isLoading}
          onSuccess={onTasksInvalidate}
        />
      </div>
    </div>
  );
}
```

**Features:**

- Kontextabhängiger Text (je nach Filter-Status)
- Create Button (primär)
- Template Button (sekundär)
- Clock Icon (Heroicons /24/outline)

---

#### 3. Table Header

Zeigt Spaltenüberschriften:

```typescript
<div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
  <div className="grid grid-cols-12 gap-4 items-center">
    <div className="col-span-6 text-xs font-medium text-gray-600 uppercase tracking-wider">
      Task
    </div>
    <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
      Zugewiesen
    </div>
    <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
      Fortschritt
    </div>
    <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
      Fälligkeit
    </div>
  </div>
</div>
```

**Grid-Layout:**

- **6 Spalten:** Task (Icon + Title)
- **2 Spalten:** Zugewiesen (Avatar + Name)
- **2 Spalten:** Fortschritt (Progress Bar + Prozent)
- **2 Spalten:** Fälligkeit (Datum + Actions Dropdown)

---

#### 4. TaskListItem Rendering

Rendert TaskListItem für jede Task:

```typescript
<div className="divide-y divide-gray-200">
  {tasks.map((task) => (
    <TaskListItem
      key={task.id}
      task={task}
      assignedMember={getTeamMember(task.assignedUserId || '')}
      onEdit={onEdit}
      onComplete={onComplete}
      onDelete={onDelete}
      onProgressClick={onProgressClick}
      formatDate={formatDate}
    />
  ))}
</div>
```

**Team Member Lookup:**

```typescript
const getTeamMember = (userId: string) => {
  return teamMembers.find(m => m.id === userId);
};
```

---

### Verwendungsbeispiel

```typescript
import { TaskList } from '@/components/projects/tasks/TaskList';

function ProjectTaskManager() {
  const { tasks, isLoading } = useProjectTasks(projectId, organizationId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, organizationId] });
  }, [queryClient, projectId, organizationId]);

  const handleEdit = (task: ProjectTask) => {
    setEditingTask(task);
  };

  const handleComplete = async (taskId: string, taskTitle: string) => {
    await taskService.markAsCompleted(taskId);
    invalidateTasks();
    toastService.success(`"${taskTitle}" als erledigt markiert`);
  };

  const handleDelete = (taskId: string, taskTitle: string) => {
    // Confirm Dialog zeigen, dann delete
  };

  const handleProgressClick = async (task: ProjectTask, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / rect.width;
    const newProgress = Math.round(clickPosition * 100);

    await taskService.updateProgress(task.id!, newProgress);
    invalidateTasks();
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <TaskList
      tasks={filteredAndSortedTasks}
      isLoading={isLoading}
      activeFiltersCount={3}
      viewMode="all"
      projectId={projectId}
      organizationId={organizationId}
      userId={user?.uid || ''}
      teamMembers={teamMembers}
      onEdit={handleEdit}
      onComplete={handleComplete}
      onDelete={handleDelete}
      onProgressClick={handleProgressClick}
      onCreateClick={() => setShowCreateModal(true)}
      onTasksInvalidate={invalidateTasks}
      formatDate={formatDate}
    />
  );
}
```

---

## TaskListItem

**Datei:** `src/components/projects/tasks/TaskListItem.tsx`
**Zeilen:** 185
**Rolle:** Einzelne Task-Row mit Actions

### Beschreibung

Die `TaskListItem` Komponente rendert eine einzelne Task-Row in der Tabelle. Sie zeigt:

- **Status Icon:** Completed (✅), Overdue (⚠️), Normal (🕐)
- **Task Title:** Truncated bei langen Titeln
- **Assigned Member:** Avatar + Name
- **Progress Bar:** Klickbar, farbcodiert, animiert
- **Due Date:** Formatiert
- **Actions Dropdown:** Edit, Complete, Delete

### Props

```typescript
interface TaskListItemProps {
  task: ProjectTask;                 // Task-Objekt
  assignedMember?: {                 // Zugewiesenes Team-Mitglied (optional)
    id: string;
    displayName: string;
    email: string;
    photoUrl?: string;
  };
  onEdit: (task: ProjectTask) => void;
  onComplete: (taskId: string, taskTitle: string) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onProgressClick: (task: ProjectTask, event: React.MouseEvent) => void;
  formatDate: (date: any) => string;
}
```

### Features

#### 1. Status Icon

Zeigt Status-Icon basierend auf Task-Status:

```typescript
{task.status === 'completed' ? (
  <CheckCircleIcon className="h-5 w-5 text-green-600" />
) : task.isOverdue ? (
  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
) : (
  <ClockIcon className="h-5 w-5 text-gray-400" />
)}
```

**Icon-Mapping:**

- **Completed:** CheckCircleIcon, grün (text-green-600)
- **Overdue:** ExclamationTriangleIcon, rot (text-red-600)
- **Normal:** ClockIcon, grau (text-gray-400)

**Alle Icons:** Heroicons /24/outline

---

#### 2. Task Title (Truncated)

Zeigt Task-Titel mit Truncation:

```typescript
<Text className="text-sm font-medium text-gray-900 truncate" title={task.title}>
  {task.title}
</Text>
```

**Features:**

- `truncate` CSS-Klasse (Tailwind CSS)
- `title` Attribut für Hover-Tooltip mit vollem Titel
- Responsive: Nutzt verfügbare Breite der col-span-6 Spalte

---

#### 3. Assigned Member (Avatar + Name)

Zeigt Avatar und Name des zugewiesenen Mitglieds:

```typescript
{assignedMember ? (
  <div className="flex items-center gap-2">
    <Avatar
      className="size-6 flex-shrink-0"
      src={assignedMember.photoUrl}
      initials={assignedMember.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)}
      title={assignedMember.displayName}
    />
    <Text className="text-sm text-gray-700 truncate">
      {assignedMember.displayName}
    </Text>
  </div>
) : (
  <Text className="text-sm text-gray-500">-</Text>
)}
```

**Avatar-Initialen:**

- Bei "Max Mustermann" → "MM"
- Bei "John Doe Smith" → "JD" (nur erste 2)
- Uppercase Transformation

**Fallback:** "-" wenn kein Member zugewiesen

---

#### 4. Progress Bar (Klickbar, Animiert)

Zeigt Progress Bar mit Klick-Funktion:

```typescript
const progress = task.progress || 0;

const getProgressColor = (percent: number) => {
  if (percent >= 90) return 'bg-green-500';
  if (percent >= 70) return 'bg-blue-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const progressColor = getProgressColor(progress);
const isInProgress = task.status === 'in_progress';

<div className="flex items-center gap-3">
  <div className="relative flex-1">
    {/* Progress Bar */}
    <div
      className="bg-gray-200 rounded-full h-3 cursor-pointer"
      onClick={(e) => onProgressClick(task, e)}
      title="Klicken um Fortschritt zu ändern"
    >
      <div
        className={`${progressColor} rounded-full h-3 transition-all duration-500`}
        style={{ width: `${progress}%` }}
      />
    </div>

    {/* In-Progress Animation */}
    {isInProgress && (
      <div className="absolute inset-0 bg-primary opacity-30 rounded-full animate-pulse pointer-events-none"></div>
    )}
  </div>

  {/* Progress Percentage */}
  <Text className="text-xs text-gray-500 flex-shrink-0">
    {Math.round(progress)}%
  </Text>
</div>
```

**Progress Color Logic:**

| Fortschritt | Farbe | CSS-Klasse |
|-------------|-------|------------|
| 90% - 100% | Grün | `bg-green-500` |
| 70% - 89% | Blau | `bg-blue-500` |
| 50% - 69% | Gelb | `bg-yellow-500` |
| 0% - 49% | Rot | `bg-red-500` |

**Animation:**

- `transition-all duration-500` auf Progress-Balken
- `animate-pulse` wenn status='in_progress'
- Smooth Width-Änderung bei Progress-Update

**Klick-Funktion:**

- User klickt auf Progress Bar
- `onProgressClick` Handler berechnet neue Prozentangabe basierend auf Klick-Position
- API-Call zu `taskService.updateProgress()`

---

#### 5. Actions Dropdown

Zeigt Actions Dropdown (Edit, Complete, Delete):

```typescript
<Dropdown>
  <DropdownButton plain className="p-1 hover:bg-gray-100 rounded-md">
    <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
  </DropdownButton>
  <DropdownMenu anchor="bottom end">
    {/* Edit */}
    <DropdownItem onClick={() => onEdit(task)}>
      <PencilIcon className="h-4 w-4" />
      Bearbeiten
    </DropdownItem>

    {/* Complete (nur wenn nicht completed) */}
    {task.status !== 'completed' && (
      <DropdownItem onClick={() => onComplete(task.id!, task.title)}>
        <CheckCircleIcon className="h-4 w-4" />
        Als erledigt markieren
      </DropdownItem>
    )}

    <DropdownDivider />

    {/* Delete */}
    <DropdownItem onClick={() => onDelete(task.id!, task.title)}>
      <TrashIcon className="h-4 w-4" />
      <span className="text-red-600">Löschen</span>
    </DropdownItem>
  </DropdownMenu>
</Dropdown>
```

**Actions:**

1. **Bearbeiten** (immer sichtbar)
2. **Als erledigt markieren** (nur bei status !== 'completed')
3. **Löschen** (immer sichtbar, rot)

**Dropdown Position:** `anchor="bottom end"` (rechts unten)

---

### React.memo Optimierung

Die Komponente ist mit `React.memo` wrapped:

```typescript
export const TaskListItem = React.memo(function TaskListItem({ ... }: TaskListItemProps) {
  // ...
});
```

**Vorteil:** Komponente re-rendert nur wenn Props sich ändern (nicht bei Parent Re-Render)

---

### Verwendungsbeispiel

```typescript
import { TaskListItem } from '@/components/projects/tasks/TaskListItem';

{tasks.map(task => (
  <TaskListItem
    key={task.id}
    task={task}
    assignedMember={teamMembers.find(m => m.id === task.assignedUserId)}
    onEdit={(task) => setEditingTask(task)}
    onComplete={async (taskId, taskTitle) => {
      await taskService.markAsCompleted(taskId);
      invalidateTasks();
      toastService.success(`"${taskTitle}" als erledigt markiert`);
    }}
    onDelete={(taskId, taskTitle) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Task löschen',
        message: `Möchten Sie "${taskTitle}" wirklich löschen?`,
        onConfirm: async () => {
          await taskService.delete(taskId);
          invalidateTasks();
        }
      });
    }}
    onProgressClick={async (task, event) => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const clickPosition = (event.clientX - rect.left) / rect.width;
      const newProgress = Math.round(clickPosition * 100);

      await taskService.updateProgress(task.id!, newProgress);
      invalidateTasks();
    }}
    formatDate={(timestamp) => {
      if (!timestamp) return '-';
      return timestamp.toDate().toLocaleDateString('de-DE');
    }}
  />
))}
```

---

## TaskFilterPanel

**Datei:** `src/components/projects/tasks/TaskFilterPanel.tsx`
**Zeilen:** 302
**Rolle:** Komplexes Filter-UI mit Popover

### Beschreibung

Die `TaskFilterPanel` Komponente bietet ein umfangreiches Filter-UI mit:

- **View Mode Select:** Alle Tasks / Meine Tasks
- **Quick Filter Buttons:** Heute fällig, Überfällig
- **Filter Popover:** Erweiterte Filter in 2-Spalten-Layout
  - Fälligkeits-Filter (4 Optionen)
  - Status-Filter (3 Optionen)
  - Zuständige Mitglieder (Multi-Select)
  - Sortierung (3 Optionen)
- **Reset Button:** Bei aktiven Filtern
- **Active Filters Badge:** Anzahl aktiver Filter

### Props

```typescript
interface TaskFilterPanelProps {
  viewMode: 'all' | 'mine';                    // Aktueller View Mode
  selectedDueDateFilters: string[];            // Aktive Fälligkeits-Filter
  selectedStatusFilters: string[];             // Aktive Status-Filter
  selectedAssigneeIds: string[];               // Aktive Zuständigen-Filter
  sortBy: 'dueDate' | 'createdAt' | 'title';   // Sortierung
  activeFiltersCount: number;                  // Anzahl aktiver Filter (für Badge)
  teamMembers: Array<{                         // Team-Mitglieder für Filter
    id: string;
    userId?: string;
    displayName: string;
  }>;
  onViewModeChange: (mode: 'all' | 'mine') => void;
  onDueDateFiltersChange: (filters: string[]) => void;
  onStatusFiltersChange: (filters: string[]) => void;
  onAssigneeIdsChange: (ids: string[]) => void;
  onSortByChange: (sortBy: 'dueDate' | 'createdAt' | 'title') => void;
  onResetFilters: () => void;
}
```

### Features

#### 1. View Mode Select

Dropdown für View Mode (Alle/Meine Tasks):

```typescript
<select
  value={viewMode}
  onChange={(e) => onViewModeChange(e.target.value as 'all' | 'mine')}
  className="rounded-lg border border-zinc-300 bg-white px-4 h-10
             text-sm text-zinc-700 font-medium
             focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
             hover:bg-zinc-50 transition-colors"
>
  <option value="all">Alle Tasks</option>
  <option value="mine">Meine Tasks</option>
</select>
```

**Design:**

- Höhe: `h-10` (konsistent mit CeleroPress Toolbar)
- Border: `border-zinc-300` (CeleroPress Design System)
- Focus: Ring mit Primary Color (`#005fab`)

---

#### 2. Quick Filter Buttons

Zwei Quick Filter Buttons (Heute fällig, Überfällig):

```typescript
// Toggle-Helper
const toggleDueDateFilter = (filterValue: string) => {
  const isActive = selectedDueDateFilters.includes(filterValue);
  onDueDateFiltersChange(
    isActive
      ? selectedDueDateFilters.filter(f => f !== filterValue)
      : [...selectedDueDateFilters, filterValue]
  );
};

// Heute fällig Button
<button
  onClick={() => toggleDueDateFilter('today')}
  className={`inline-flex items-center gap-2 rounded-lg px-4 h-10
             border transition-colors font-medium text-sm whitespace-nowrap
             ${selectedDueDateFilters.includes('today')
               ? 'border-[#005fab] bg-[#005fab] text-white'
               : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
             }`}
>
  <CalendarDaysIcon className="w-4 h-4" />
  Heute fällig
</button>

// Überfällig Button
<button
  onClick={() => toggleDueDateFilter('overdue')}
  className={`inline-flex items-center gap-2 rounded-lg px-4 h-10
             border transition-colors font-medium text-sm whitespace-nowrap
             ${selectedDueDateFilters.includes('overdue')
               ? 'border-[#005fab] bg-[#005fab] text-white'
               : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
             }`}
>
  <ExclamationTriangleIcon className="w-4 h-4" />
  Überfällig
</button>
```

**Features:**

- Toggle-Logik (Klick aktiviert/deaktiviert)
- Icon + Text
- Aktiver Zustand: Primary Background (`#005fab`)
- Inaktiver Zustand: White Background mit Hover

---

#### 3. Filter Popover

Erweiterte Filter in Popover (Headless UI):

```typescript
<Popover className="relative">
  <Popover.Button
    className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10 ${
      activeFiltersCount > 0
        ? 'border-[#005fab] bg-[#005fab]/5 text-[#005fab] hover:bg-[#005fab]/10'
        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
    }`}
    aria-label="Filter"
  >
    <FunnelIcon className="h-4 w-4" />
    {activeFiltersCount > 0 && (
      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#005fab] text-xs font-medium text-white">
        {activeFiltersCount}
      </span>
    )}
  </Popover.Button>

  <Transition
    as={Fragment}
    enter="transition ease-out duration-200"
    enterFrom="opacity-0 translate-y-1"
    enterTo="opacity-100 translate-y-0"
    leave="transition ease-in duration-150"
    leaveFrom="opacity-100 translate-y-0"
    leaveTo="opacity-0 translate-y-1"
  >
    <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px] origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
      {/* Popover Content */}
    </Popover.Panel>
  </Transition>
</Popover>
```

**Features:**

- **Filter Button:** Funnel Icon, Badge mit Count
- **Popover:** 600px breit, rechts ausgerichtet
- **Transition:** Smooth Fade-In/Out Animation
- **Active State:** Primary Color Background wenn Filter aktiv

---

#### 4. Popover Content (2-Spalten-Layout)

Popover mit 2 Spalten:

**Spalte 1: Fälligkeit + Sortierung**

```typescript
<div className="space-y-4">
  {/* Fälligkeit Filter */}
  <div className="mb-[10px]">
    <label className="block text-sm font-semibold text-zinc-700 mb-1">
      Fälligkeit
    </label>
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {[
        { value: 'today', label: 'Heute fällig' },
        { value: 'overdue', label: 'Überfällig' },
        { value: 'future', label: 'Alle zukünftigen' },
        { value: 'no-date', label: 'Kein Datum' }
      ].map((option) => (
        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedDueDateFilters.includes(option.value)}
            onChange={(e) => {
              const newValues = e.target.checked
                ? [...selectedDueDateFilters, option.value]
                : selectedDueDateFilters.filter(v => v !== option.value);
              onDueDateFiltersChange(newValues);
            }}
            className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
          />
          <span className="text-sm text-zinc-700">{option.label}</span>
        </label>
      ))}
    </div>
  </div>

  {/* Sortierung */}
  <div className="mb-[10px]">
    <label className="block text-sm font-semibold text-zinc-700 mb-1">
      Sortierung
    </label>
    <div className="space-y-2">
      {[
        { value: 'dueDate', label: 'Nach Fälligkeit' },
        { value: 'createdAt', label: 'Nach Erstellung' },
        { value: 'title', label: 'Alphabetisch' }
      ].map((option) => (
        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sortBy"
            checked={sortBy === option.value}
            onChange={() => onSortByChange(option.value as any)}
            className="h-4 w-4 border-gray-300 text-[#005fab] focus:ring-[#005fab]"
          />
          <span className="text-sm text-zinc-700">{option.label}</span>
        </label>
      ))}
    </div>
  </div>
</div>
```

**Spalte 2: Status + Zuständige Mitglieder**

```typescript
<div className="space-y-4">
  {/* Status Filter */}
  <div className="mb-[10px]">
    <label className="block text-sm font-semibold text-zinc-700 mb-1">
      Status
    </label>
    <div className="space-y-2">
      {[
        { value: 'pending', label: 'Offen' },
        { value: 'in_progress', label: 'In Bearbeitung' },
        { value: 'completed', label: 'Erledigt' }
      ].map((option) => (
        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedStatusFilters.includes(option.value)}
            onChange={(e) => {
              const newValues = e.target.checked
                ? [...selectedStatusFilters, option.value]
                : selectedStatusFilters.filter(v => v !== option.value);
              onStatusFiltersChange(newValues);
            }}
            className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
          />
          <span className="text-sm text-zinc-700">{option.label}</span>
        </label>
      ))}
    </div>
  </div>

  {/* Zuständige Mitglieder Filter */}
  {teamMembers.length > 0 && (
    <div className="mb-[10px]">
      <label className="block text-sm font-semibold text-zinc-700 mb-1">
        Zuständige Mitglieder
      </label>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {teamMembers.map((member) => (
          <label key={member.userId || member.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedAssigneeIds.includes(member.userId || member.id || '')}
              onChange={(e) => {
                const memberId = member.userId || member.id || '';
                const newValues = e.target.checked
                  ? [...selectedAssigneeIds, memberId]
                  : selectedAssigneeIds.filter(v => v !== memberId);
                onAssigneeIdsChange(newValues);
              }}
              className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
            />
            <span className="text-sm text-zinc-700">{member.displayName}</span>
          </label>
        ))}
      </div>
    </div>
  )}
</div>
```

---

#### 5. Reset Button

Reset Button (nur sichtbar bei aktiven Filtern):

```typescript
{activeFiltersCount > 0 && (
  <div className="flex justify-end pt-2 border-t border-zinc-200">
    <button
      onClick={onResetFilters}
      className="text-sm text-zinc-500 hover:text-zinc-700 underline"
    >
      Zurücksetzen
    </button>
  </div>
)}
```

---

### Filter-Logik (OR-Verknüpfung)

**Wichtig:** Multi-Select Filter verwenden OR-Verknüpfung (siehe ADR-0003):

```typescript
// Beispiel: Status-Filter mit OR
if (selectedStatusFilters.length > 0) {
  filtered = filtered.filter(task =>
    selectedStatusFilters.includes(task.status) // OR: 'pending' OR 'in_progress'
  );
}

// Beispiel: Fälligkeits-Filter mit OR
if (selectedDueDateFilters.length > 0) {
  filtered = filtered.filter(task => {
    return selectedDueDateFilters.some(filter => {
      if (filter === 'today') { /* ... */ }
      if (filter === 'overdue') { /* ... */ }
      // ...
    });
  });
}
```

**Vorteil:** User-freundlicher (Tasks erscheinen wenn EINE Bedingung erfüllt)

---

### React.memo Optimierung

```typescript
export const TaskFilterPanel = React.memo(function TaskFilterPanel({ ... }: TaskFilterPanelProps) {
  // ...
});
```

---

### Verwendungsbeispiel

```typescript
import { TaskFilterPanel } from '@/components/projects/tasks/TaskFilterPanel';

function ProjectTaskManager() {
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const [selectedDueDateFilters, setSelectedDueDateFilters] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | 'title'>('createdAt');

  const activeFiltersCount = useMemo(() => {
    return selectedDueDateFilters.length + selectedStatusFilters.length + selectedAssigneeIds.length;
  }, [selectedDueDateFilters.length, selectedStatusFilters.length, selectedAssigneeIds.length]);

  return (
    <TaskFilterPanel
      viewMode={viewMode}
      selectedDueDateFilters={selectedDueDateFilters}
      selectedStatusFilters={selectedStatusFilters}
      selectedAssigneeIds={selectedAssigneeIds}
      sortBy={sortBy}
      activeFiltersCount={activeFiltersCount}
      teamMembers={projectTeamMembers}
      onViewModeChange={setViewMode}
      onDueDateFiltersChange={setSelectedDueDateFilters}
      onStatusFiltersChange={setSelectedStatusFilters}
      onAssigneeIdsChange={setSelectedAssigneeIds}
      onSortByChange={setSortBy}
      onResetFilters={() => {
        setSelectedDueDateFilters([]);
        setSelectedStatusFilters([]);
        setSelectedAssigneeIds([]);
      }}
    />
  );
}
```

---

## TaskTemplateButton

**Datei:** `src/components/projects/tasks/TaskTemplateButton.tsx`
**Zeilen:** 135
**Rolle:** Erstellt 9 vordefinierte Standard-PR-Workflow Tasks

### Beschreibung

Die `TaskTemplateButton` Komponente erstellt 9 vordefinierte Tasks für einen Standard-PR-Workflow mit einem Klick.

### Template-Tasks

```typescript
const TASK_TEMPLATES = [
  {
    title: 'Strategie-Dokumente erstellen',
    description: '- Unternehmensprofil & Senderanalyse\n- Situationsanalyse\n- Zielgruppenanalyse\n- Kernbotschaften & Kommunikationsziele',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Medien Assets zusammenstellen',
    description: '- Bilder hochladen\n- Videos hochladen\n- Key Visual festlegen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Pressemeldungsentwurf',
    description: '- KI Assistent instruieren\n- Pressemeldung verfeinern',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Interne Freigabe',
    description: '- Text entwurf im Chat diskutieren\n- Key Visual im Chat besprechen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Kundenfreigabe einholen',
    description: '- Korrekturphasen\n- Kundenfreigabe der Pressemeldung\n- Asset Auswahl Freigabe',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Verteilerliste zusammenstellen',
    description: '- Journalisten importieren\n- Verteilerliste zusammenstellen\n- Monitoring Parameter festlegen (RSS Feeds)',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Anschreiben erstellen',
    description: '- Begleitschreiben formulieren\n- Testversand',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Versand',
    description: '- Termin festlegen\n- Versand planen\n- Versand überwachen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Monitoring',
    description: '- Email Performance überwachen\n- Veröffentlichungen überwachen\n- Veröffentlichungen manuell einpflegen',
    priority: 'medium' as TaskPriority
  }
];
```

### Props

```typescript
interface TaskTemplateButtonProps {
  projectId: string;
  organizationId: string;
  userId: string;
  disabled?: boolean;
  onSuccess: () => void;  // Query Invalidierung Callback
}
```

### Logik

```typescript
const handleCreateTemplateTasks = async () => {
  if (!userId) {
    toastService.error('Benutzer nicht gefunden');
    return;
  }

  try {
    // Erstelle alle Vorlagen-Tasks nacheinander
    for (let i = 0; i < TASK_TEMPLATES.length; i++) {
      const template = TASK_TEMPLATES[i];

      const taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'daysUntilDue' | 'overdueBy'> = {
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
      };

      await taskService.create(taskData);
    }

    // Callback to invalidate queries
    onSuccess();

    // Erfolgs-Toast
    toastService.success(`${TASK_TEMPLATES.length} Standard-Tasks erfolgreich erstellt`);
  } catch (error) {
    console.error('Error creating template tasks:', error);
    toastService.error('Fehler beim Erstellen der Vorlagen-Tasks');
  }
};
```

**Wichtig:**

- Tasks werden **sequenziell** erstellt (for-Schleife, nicht Promise.all)
- Grund: Korrekte Reihenfolge basierend auf Firestore Timestamps
- Kein `dueDate` gesetzt (User muss selbst festlegen)
- Alle Tasks zugewiesen an `userId` (Creator)

### Verwendungsbeispiel

```typescript
<TaskTemplateButton
  projectId={projectId}
  organizationId={organizationId}
  userId={user?.uid || ''}
  disabled={isLoading}
  onSuccess={() => {
    queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, organizationId] });
  }}
/>
```

---

## MyTasksWidget

**Datei:** `src/components/dashboard/MyTasksWidget.tsx`
**Zeilen:** 344
**Rolle:** Wiederverwendbares "Meine Aufgaben" Dashboard Widget

### Beschreibung

Das `MyTasksWidget` ist ein vollständig autarkes Dashboard-Widget das Tasks des Users anzeigt.

**Features:**

- Filter-Tabs: Alle, Heute, Überfällig
- Pagination: 5 Tasks pro Seite
- Kompakte Tabelle: Task, Projekt, Fortschritt
- Loading & Empty States
- Projekt-Links

### Props

**Keine Props benötigt!**

Verwendet intern:

- `useAuth()` für User
- `useOrganization()` für Organization
- `useMyTasks(filter)` für Daten

### Interner State

```typescript
const [filter, setFilter] = useState<MyTasksFilter>('all');
const [currentPage, setCurrentPage] = useState(1);

const TASKS_PER_PAGE = 5;
```

### Code-Struktur

Siehe Haupt-README für vollständige Code-Struktur (344 Zeilen).

### Verwendungsbeispiel

```typescript
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

**Das ist alles!** Keine Props, keine Konfiguration nötig.

---

## ProjectTaskManager

**Datei:** `src/components/projects/ProjectTaskManager.tsx`
**Zeilen:** 367 (vorher 888)
**Rolle:** Main Orchestrator für Tasks Tab

### Beschreibung

Der `ProjectTaskManager` ist der Haupt-Container für den Tasks Tab. Er orchestriert alle Sub-Komponenten.

**Verantwortlichkeiten:**

- React Query Hook (`useProjectTasks`)
- Filter & Sort State Management
- Modal State (Create, Edit, Confirm)
- Event Handlers (Create, Update, Delete, Complete, Progress)
- Query Invalidierung

### Props

```typescript
interface ProjectTaskManagerProps {
  projectId: string;
  organizationId: string;
  projectManagerId: string;
  teamMembers: TeamMember[];
  projectTeamMemberIds?: string[];
  projectTitle?: string;
}
```

### Verwendungsbeispiel

Siehe Haupt-README für vollständigen Code.

---

## Best Practices

### 1. React.memo für Performance

Alle Task-Komponenten sind mit React.memo optimiert:

```typescript
export const TaskList = React.memo(function TaskList({ ... }: Props) { /* ... */ });
export const TaskListItem = React.memo(function TaskListItem({ ... }: Props) { /* ... */ });
export const TaskFilterPanel = React.memo(function TaskFilterPanel({ ... }: Props) { /* ... */ });
```

### 2. Callback Pattern für Query Invalidierung

```typescript
const invalidateTasks = useCallback(() => {
  queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, organizationId] });
}, [queryClient, projectId, organizationId]);

<TaskTemplateButton onSuccess={invalidateTasks} />
```

### 3. Toast-Service für Feedback

```typescript
import { toastService } from '@/lib/utils/toast';

toastService.success('Task erstellt');
toastService.error('Fehler beim Löschen');
```

### 4. Confirm Dialog für Destructive Actions

```typescript
const handleDelete = (taskId: string, taskTitle: string) => {
  setConfirmDialog({
    isOpen: true,
    title: 'Task löschen',
    message: `Möchten Sie "${taskTitle}" wirklich löschen?`,
    type: 'danger',
    onConfirm: async () => {
      await taskService.delete(taskId);
      invalidateTasks();
    }
  });
};
```

---

## Common Patterns

### Pattern 1: Progress Bar Click Handler

```typescript
const handleProgressClick = async (task: ProjectTask, event: React.MouseEvent) => {
  event.stopPropagation();
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const clickPosition = (event.clientX - rect.left) / rect.width;
  const newProgress = Math.round(clickPosition * 100);

  try {
    await taskService.updateProgress(task.id!, newProgress);
    invalidateTasks();
  } catch (error) {
    console.error('Error updating progress:', error);
  }
};
```

### Pattern 2: Date Formatting

```typescript
const formatDate = useCallback((timestamp: Timestamp | undefined) => {
  if (!timestamp) return '-';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}, []);
```

### Pattern 3: Filter Reset

```typescript
const handleResetFilters = () => {
  setSelectedDueDateFilters([]);
  setSelectedStatusFilters([]);
  setSelectedAssigneeIds([]);
};
```

---

## Siehe auch

- [Haupt-README](../README.md) - Übersicht über das gesamte Refactoring
- [API-Dokumentation](../api/README.md) - Hooks und Service-Funktionen
- [ADR](../adr/README.md) - Architecture Decision Records

---

**Version:** 2.0.0
**Maintainer:** CeleroPress Development Team
**Letzte Aktualisierung:** 24. Oktober 2025

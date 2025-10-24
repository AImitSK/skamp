# Tasks Tab Refactoring Plan

**Version:** 1.0
**Erstellt:** 2025-10-24
**Status:** 🟡 In Planung
**Basiert auf:** `docs/templates/module-refactoring-template.md` (v1.1)

---

## 📋 Übersicht

Dieses Dokument beschreibt das Refactoring des Tasks Tabs mit Integration des "Meine Aufgaben" Widgets vom Dashboard.

### Scope

**Entry Points:**
- `src/components/projects/ProjectTaskManager.tsx` (901 Zeilen) - Hauptkomponente
- `src/app/dashboard/page.tsx` (1.466 Zeilen) - "Meine Aufgaben" Widget extrahieren

**Komponenten:**
- ProjectTaskManager (Main Component)
- TaskCreateModal
- TaskEditModal
- **NEU:** MyTasksWidget (extrahiert aus Dashboard)

**LOC:**
- ProjectTaskManager: 901 Zeilen
- "Meine Aufgaben" Widget im Dashboard: ~200 Zeilen (zu extrahieren)
- **Gesamt:** ~1.100 Zeilen Code

**Aufwand:** XL (X-Large) - 4-5 Tage

**Abhängigkeiten:**
- ✅ Toast-Service (bereits integriert)
- ✅ Design System (bereits compliant)
- ✅ Admin SDK (NICHT erforderlich - Security Rules reichen)

---

## 🎯 Ziele

### Haupt-Refactoring

- [ ] ProjectTaskManager modularisieren (901 Zeilen → < 300 Zeilen)
- [ ] React Query für Task-Loading integrieren
- [ ] Performance-Optimierungen implementieren (useCallback, useMemo, React.memo)
- [ ] Test-Coverage erreichen (>80%)
- [ ] Vollständige Dokumentation erstellen

### Dashboard-Integration

- [ ] "Meine Aufgaben" Widget aus Dashboard extrahieren
- [ ] Als wiederverwendbare Komponente `MyTasksWidget.tsx` erstellen
- [ ] Shared Hook `useMyTasks()` für beide Kontexte
- [ ] Dashboard `page.tsx` vereinfachen (1.466 → ~1.270 Zeilen)

### Bereits erledigt ✅

Diese Punkte müssen NICHT mehr gemacht werden:
- ✅ **Design System:** Bereits compliant (#005fab, Heroicons /24/outline, ConfirmDialog)
- ✅ **Toast-Service:** Bereits integriert (toastService.success/error)
- ✅ **Admin SDK:** Prüfung durchgeführt → NICHT erforderlich (Security Rules reichen)

---

## 📁 Ziel-Struktur

### Nach Refactoring

```
src/components/projects/
├── ProjectTaskManager.tsx (280 Zeilen) - Main Orchestrator
├── tasks/
│   ├── TaskList.tsx (120 Zeilen) - Liste + Empty State
│   ├── TaskListItem.tsx (180 Zeilen) - Einzelner Task mit Actions
│   ├── TaskFilterPanel.tsx (140 Zeilen) - Filter Popover + Buttons
│   ├── TaskTemplateButton.tsx (80 Zeilen) - Template-Erstellung
│   └── __tests__/
│       ├── TaskList.test.tsx
│       ├── TaskListItem.test.tsx
│       └── TaskFilterPanel.test.tsx

src/components/dashboard/
├── MyTasksWidget.tsx (220 Zeilen) - Widget für Dashboard NEU
└── __tests__/
    └── MyTasksWidget.test.tsx

src/lib/hooks/
├── useProjectTasks.ts (bereits vorhanden - Overview Tab)
├── useMyTasks.ts (80 Zeilen) - NEU für Dashboard Widget
└── __tests__/
    ├── useProjectTasks.test.tsx (bereits vorhanden)
    └── useMyTasks.test.tsx (NEU)

src/app/dashboard/
└── page.tsx (1.466 → ~1.270 Zeilen) - Widget extrahiert
```

---

## 🚀 Die 7 Phasen

### Phase 0: Vorbereitung & Setup

#### Ziel
Sicherer Start mit Backup und Dokumentation des Ist-Zustands

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/tasks-tab-refactoring
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  wc -l src/components/projects/ProjectTaskManager.tsx
  wc -l src/app/dashboard/page.tsx
  ```

- [ ] Backup-Dateien erstellen
  ```bash
  cp src/components/projects/ProjectTaskManager.tsx \
     src/components/projects/ProjectTaskManager.backup.tsx
  ```

- [ ] Dependencies prüfen
  - ✅ React Query installiert? (`@tanstack/react-query`)
  - ✅ Testing Libraries vorhanden? (`jest`, `@testing-library/react`)
  - ✅ TypeScript korrekt konfiguriert?

#### Deliverable

- Feature-Branch erstellt
- Backups angelegt
- Dokumentation des Ist-Zustands

#### Phase-Bericht

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/tasks-tab-refactoring`
- Ist-Zustand: 2 Hauptdateien
  - ProjectTaskManager.tsx: 901 Zeilen
  - Dashboard page.tsx: 1.466 Zeilen (~200 Zeilen für "Meine Aufgaben")
- Backup: ProjectTaskManager.backup.tsx erstellt
- Dependencies: Alle vorhanden

### Bereits erledigt
- ✅ Design System compliant
- ✅ Toast-Service integriert
- ✅ Security Rules vorhanden (Admin SDK nicht nötig)

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Tasks Tab Refactoring"
```

---

### Phase 0.5: Pre-Refactoring Cleanup

#### Ziel
Toten Code entfernen BEVOR mit Refactoring begonnen wird

#### 0.5.1 TODO-Kommentare

```bash
grep -rn "TODO:" src/components/projects/ProjectTaskManager.tsx
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen

#### 0.5.2 Console-Logs

```bash
grep -rn "console\." src/components/projects/ProjectTaskManager.tsx
```

**Aktion:**
- [ ] Alle console.log() statements entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 0.5.3 Unused State

```bash
grep -n "useState" src/components/projects/ProjectTaskManager.tsx
```

**Prüfen:**
- Wird die State-Variable wirklich verwendet?
- Wird sie nur gesetzt, aber nie gelesen?

**Aktion:**
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused States identifizieren und entfernen

#### 0.5.4 ESLint Auto-Fix

```bash
npx eslint src/components/projects/ProjectTaskManager.tsx --fix
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Manuelle Fixes für verbleibende Warnings

#### 0.5.5 Manueller Test

**Aktion:**
- [ ] Dev-Server starten
- [ ] Tasks Tab aufrufen
- [ ] Basis-Funktionen testen (Create, Update, Delete, Filter)
- [ ] Keine Console-Errors

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- [X] TODO-Kommentare
- ~[Y] Debug-Console-Logs
- [Z] Unused State-Variablen
- Unused imports (via ESLint)

### Ergebnis
- ProjectTaskManager.tsx: 901 → [Y] Zeilen (-[Z] Zeilen toter Code)
- Saubere Basis für Phase 1 (React Query Integration)

### Manueller Test
- ✅ Task erstellen funktioniert
- ✅ Filter funktionieren
- ✅ Template-Tasks funktionieren
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Unused State entfernt
- Unused imports entfernt via ESLint

ProjectTaskManager.tsx: 901 → [Y] Zeilen (-[Z] Zeilen)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

#### Ziel
State Management mit React Query optimieren

#### 1.1 Bestehenden Hook verwenden

**Hook:** `src/lib/hooks/useProjectTasks.ts` (bereits vorhanden aus Overview Tab)

Prüfen ob dieser Hook für Tasks Tab ausreicht oder erweitert werden muss:
- ✅ Lädt Tasks für Projekt
- ✅ Berechnet Progress
- ⚠️ Eventuell Filter-Logik hinzufügen?

#### 1.2 Neuen Hook für Dashboard Widget

**Neuer Hook:** `src/lib/hooks/useMyTasks.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/lib/firebase/task-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export function useMyTasks(filter: 'all' | 'today' | 'overdue' = 'all') {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['myTasks', currentOrganization?.id, user?.uid, filter],
    queryFn: async () => {
      if (!currentOrganization || !user) return [];

      const allTasks = await taskService.getByUser(
        currentOrganization.id,
        user.uid
      );

      // Filter anwenden
      switch (filter) {
        case 'today':
          return allTasks.filter(task => {
            if (!task.dueDate) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = task.dueDate.toDate();
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });

        case 'overdue':
          return allTasks.filter(task => task.isOverdue);

        default:
          return allTasks;
      }
    },
    enabled: !!currentOrganization && !!user,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}
```

#### 1.3 ProjectTaskManager anpassen

```typescript
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';

// In der Komponente
const {
  data: tasksData,
  isLoading,
  error
} = useProjectTasks(projectId, organizationId);

const tasks = tasksData?.tasks || [];
```

#### 1.4 Dashboard Widget extrahieren

**Neue Datei:** `src/components/dashboard/MyTasksWidget.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useMyTasks } from '@/lib/hooks/useMyTasks';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
// ... weitere Imports

export function MyTasksWidget() {
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  // ... Rest der Widget-Logik
}
```

#### Checkliste Phase 1

- [ ] useProjectTasks Hook geprüft (bereits vorhanden)
- [ ] useMyTasks Hook erstellt (neu)
- [ ] MyTasksWidget.tsx extrahiert aus Dashboard
- [ ] Dashboard page.tsx auf MyTasksWidget umgestellt
- [ ] ProjectTaskManager auf useProjectTasks umgestellt
- [ ] Alte loadTasks/useEffect entfernt
- [ ] TypeScript-Fehler behoben

#### Phase-Bericht

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- useProjectTasks Hook verwendet (bereits vorhanden)
- useMyTasks Hook erstellt (80 Zeilen)
- MyTasksWidget extrahiert (220 Zeilen)
- Dashboard page.tsx vereinfacht: 1.466 → ~1.270 Zeilen

### Vorteile
- Automatisches Caching (2min staleTime)
- Query Invalidierung bei Mutations
- Wiederverwendbarer Hook für Dashboard
- Code-Reduktion im Dashboard: -196 Zeilen

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - React Query + Dashboard Widget Extraktion

- useMyTasks Hook erstellt (80 LOC)
- MyTasksWidget extrahiert (220 LOC)
- Dashboard page.tsx: 1.466 → 1.270 Zeilen (-196 Zeilen)
- ProjectTaskManager auf useProjectTasks umgestellt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 2: Code-Separation & Modularisierung

#### Ziel
ProjectTaskManager aufteilen, Duplikate eliminieren

#### 2.1 Komponenten-Aufteilung

**ProjectTaskManager (901 Zeilen) → 5 Dateien:**

**1. TaskList.tsx** (120 Zeilen)
- Rendert Liste der Tasks
- Empty State
- Loading State
- Props: tasks, loading, onTaskClick, onTaskEdit, onTaskDelete

**2. TaskListItem.tsx** (180 Zeilen)
- Einzelner Task mit Details
- Progress Bar
- Status Badge
- Fälligkeitsdatum
- Action Dropdown (Edit, Complete, Delete)

**3. TaskFilterPanel.tsx** (140 Zeilen)
- Popover mit Filtern
- Quick-Filter Buttons ("Heute fällig", "Überfällig")
- View Mode Select ("Alle Tasks", "Meine Tasks")
- Filter Badge mit Count

**4. TaskTemplateButton.tsx** (80 Zeilen)
- "Task Vorlage verwenden" Button
- Template-Erstellung Logic
- Toast-Feedback

**5. ProjectTaskManager.tsx** (280 Zeilen)
- Main Orchestrator
- State Management
- Handler Functions
- Layout

#### 2.2 Shared Components

**Diese Komponenten sind bereits vorhanden:**
- ✅ ConfirmDialog (CRM shared)
- ✅ Toast-Service (zentral)

**Keine neuen Shared Components nötig!**

#### 2.3 Struktur

```typescript
// ProjectTaskManager.tsx (Main)
export function ProjectTaskManager({
  projectId,
  organizationId,
  projectManagerId,
  teamMembers,
  projectTeamMemberIds,
  projectTitle
}: Props) {
  const { data, isLoading } = useProjectTasks(projectId, organizationId);

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({...});

  // Handlers
  const handleDelete = (taskId, taskTitle) => { ... };
  const handleComplete = (taskId, taskTitle) => { ... };

  return (
    <div>
      <div className="flex justify-between">
        <Heading>Projekt-Tasks</Heading>
        <div className="flex gap-2">
          {tasks.length === 0 && <TaskTemplateButton ... />}
          <Button onClick={() => setShowCreateModal(true)}>
            Task erstellen
          </Button>
        </div>
      </div>

      <TaskFilterPanel ... />

      <TaskList
        tasks={filteredTasks}
        loading={isLoading}
        onEdit={setEditingTask}
        onDelete={handleDelete}
        onComplete={handleComplete}
      />

      <TaskCreateModal ... />
      <TaskEditModal ... />
      <ConfirmDialog ... />
    </div>
  );
}
```

#### Checkliste Phase 2

- [ ] TaskList.tsx erstellt
- [ ] TaskListItem.tsx erstellt
- [ ] TaskFilterPanel.tsx erstellt
- [ ] TaskTemplateButton.tsx erstellt
- [ ] ProjectTaskManager.tsx auf 280 Zeilen reduziert
- [ ] Imports in allen Dateien aktualisiert
- [ ] Keine Duplikate mehr

#### Phase-Bericht

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Modularisierung
- ProjectTaskManager.tsx: 901 → 280 Zeilen (-69%)
- 4 neue Komponenten extrahiert:
  - TaskList.tsx (120 Zeilen)
  - TaskListItem.tsx (180 Zeilen)
  - TaskFilterPanel.tsx (140 Zeilen)
  - TaskTemplateButton.tsx (80 Zeilen)

### Vorteile
- Bessere Lesbarkeit
- Einfachere Wartung
- Eigenständig testbare Komponenten
- Keine Code-Duplikation

### Commit
```bash
git add .
git commit -m "feat: Phase 2 - ProjectTaskManager modularisiert

- 4 Komponenten extrahiert (520 LOC)
- ProjectTaskManager: 901 → 280 Zeilen (-69%)
- Alle Komponenten < 200 Zeilen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 3: Performance-Optimierung

#### Ziel
Unnötige Re-Renders vermeiden

#### 3.1 useCallback für Handler

```typescript
// ProjectTaskManager.tsx
const handleDelete = useCallback((taskId: string, taskTitle: string) => {
  setConfirmDialog({...});
}, []);

const handleComplete = useCallback(async (taskId: string, taskTitle: string) => {
  await taskService.markAsCompleted(taskId);
  await refetch();
  toastService.success(`"${taskTitle}" als erledigt markiert`);
}, [refetch]);
```

#### 3.2 useMemo für Computed Values

```typescript
// Gefilterte + sortierte Tasks
const filteredAndSortedTasks = useMemo(() => {
  let filtered = [...tasks];

  // Filter anwenden
  if (viewMode === 'mine') {
    filtered = filtered.filter(task => task.assignedUserId === user?.uid);
  }

  if (selectedDueDateFilters.length > 0) {
    filtered = filtered.filter(task => {
      return selectedDueDateFilters.some(filter => {
        // ... OR-Logik
      });
    });
  }

  // Sortierung
  return filtered.sort((a, b) => {
    if (sortBy === 'dueDate') { ... }
    if (sortBy === 'createdAt') { ... }
    if (sortBy === 'title') { return a.title.localeCompare(b.title); }
    return 0;
  });
}, [tasks, viewMode, selectedDueDateFilters, selectedStatusFilters, selectedAssigneeIds, sortBy, user]);

// Active Filters Count
const activeFiltersCount = useMemo(() => {
  return selectedDueDateFilters.length + selectedStatusFilters.length + selectedAssigneeIds.length;
}, [selectedDueDateFilters.length, selectedStatusFilters.length, selectedAssigneeIds.length]);
```

#### 3.3 React.memo für Komponenten

```typescript
// TaskListItem.tsx
export default React.memo(function TaskListItem({ task, onEdit, onDelete, onComplete }: Props) {
  // ...
});

// TaskFilterPanel.tsx
export default React.memo(function TaskFilterPanel({
  viewMode,
  setViewMode,
  selectedDueDateFilters,
  setSelectedDueDateFilters,
  // ...
}: Props) {
  // ...
});
```

#### Checkliste Phase 3

- [ ] useCallback für alle Handler (5+ Handler)
- [ ] useMemo für filteredAndSortedTasks
- [ ] useMemo für activeFiltersCount
- [ ] React.memo für TaskListItem
- [ ] React.memo für TaskFilterPanel
- [ ] React.memo für TaskList
- [ ] Performance-Tests durchgeführt

#### Phase-Bericht

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 5 Handler
- useMemo für 2 Computed Values
- React.memo für 3 Komponenten

### Messbare Verbesserungen
- Re-Renders reduziert um ~[X]%
- Filter-Anwendung optimiert
- Dropdown-Options-Caching

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung

- useCallback für Handler
- useMemo für Computed Values
- React.memo für Komponenten

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 4: Testing

#### Ziel
Comprehensive Test Suite mit >80% Coverage

#### 4.1 Hook Tests

**Datei:** `src/lib/hooks/__tests__/useMyTasks.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyTasks } from '../useMyTasks';
import * as taskService from '@/lib/firebase/task-service';

jest.mock('@/lib/firebase/task-service');
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-123' } })
}));
jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-123' } })
}));

describe('useMyTasks Hook', () => {
  it('sollte Tasks für user laden', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', assignedUserId: 'user-123' },
      { id: '2', title: 'Task 2', assignedUserId: 'user-123' }
    ];

    (taskService.getByUser as jest.Mock).mockResolvedValue(mockTasks);

    const wrapper = ({ children }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useMyTasks('all'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTasks);
  });

  // Weitere Tests für filter='today', filter='overdue'
});
```

#### 4.2 Component Tests

**Tests erstellen für:**
- TaskList.test.tsx (12 Tests)
- TaskListItem.test.tsx (15 Tests)
- TaskFilterPanel.test.tsx (18 Tests)
- TaskTemplateButton.test.tsx (8 Tests)
- MyTasksWidget.test.tsx (10 Tests)

**Beispiel:** `TaskFilterPanel.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskFilterPanel from '../TaskFilterPanel';

describe('TaskFilterPanel', () => {
  it('sollte Filter-Popover öffnen', async () => {
    const user = userEvent.setup();
    render(<TaskFilterPanel ... />);

    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    expect(screen.getByText('Fälligkeit')).toBeInTheDocument();
    expect(screen.getByText('Sortierung')).toBeInTheDocument();
  });

  it('sollte Active Filter Count anzeigen', () => {
    render(<TaskFilterPanel selectedDueDateFilters={['today', 'overdue']} ... />);

    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  // ... 16 weitere Tests
});
```

#### 4.3 Integration Tests

**Datei:** `src/components/projects/__tests__/integration/tasks-tab-flow.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTaskManager } from '../../ProjectTaskManager';
import * as taskService from '@/lib/firebase/task-service';

jest.mock('@/lib/firebase/task-service');

describe('Tasks Tab CRUD Flow', () => {
  it('sollte kompletten CRUD-Flow durchlaufen', async () => {
    const user = userEvent.setup();

    // Mock leere Liste
    (taskService.getByProject as jest.Mock).mockResolvedValue([]);

    render(<ProjectTaskManager ... />);

    // CREATE
    const createButton = screen.getByText(/Task erstellen/i);
    await user.click(createButton);

    // ... Form ausfüllen & speichern

    // READ
    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    // UPDATE
    // ... Task bearbeiten

    // DELETE
    // ... Task löschen
  });
});
```

#### Checkliste Phase 4

- [ ] useMyTasks Hook-Tests (8 Tests)
- [ ] TaskList Component-Tests (12 Tests)
- [ ] TaskListItem Component-Tests (15 Tests)
- [ ] TaskFilterPanel Component-Tests (18 Tests)
- [ ] TaskTemplateButton Component-Tests (8 Tests)
- [ ] MyTasksWidget Component-Tests (10 Tests)
- [ ] Integration-Tests (2 Tests)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt
- [ ] Coverage >80%

#### Phase-Bericht

```markdown
## Phase 4: Testing ✅

### Test Suite
- Hook-Tests: 8/8 bestanden
- Component-Tests: 63/63 bestanden
- Integration-Tests: 2/2 bestanden
- **Gesamt: 73/73 Tests bestanden**

### Coverage
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%

### Commit
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite

- 73 Tests implementiert (8 Hook + 63 Component + 2 Integration)
- Coverage: [X]% (Ziel >80%)
- Alle Tests bestehen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 5: Dokumentation

#### Ziel
Vollständige, wartbare Dokumentation

#### 5.1 Struktur anlegen

```bash
mkdir -p docs/planning/tabs/tasks-tab-refactoring/{api,components,adr}
```

#### 5.2 Dokumentations-Dateien

**Zu erstellen:**

1. **README.md** (800+ Zeilen)
   - Übersicht
   - Features
   - Architektur
   - Quick Start
   - API-Referenz
   - Komponenten-Übersicht
   - Testing
   - Troubleshooting

2. **api/README.md** (400+ Zeilen)
   - useProjectTasks Hook
   - useMyTasks Hook
   - task-service.ts API

3. **api/task-hooks.md** (600+ Zeilen)
   - Detaillierte Hook-Dokumentation
   - useMyTasks Beispiele
   - Best Practices

4. **components/README.md** (900+ Zeilen)
   - TaskList
   - TaskListItem
   - TaskFilterPanel
   - TaskTemplateButton
   - MyTasksWidget
   - Props-Dokumentation
   - Verwendungsbeispiele

5. **adr/README.md** (500+ Zeilen)
   - ADR-0001: React Query Integration
   - ADR-0002: Dashboard Widget Extraktion
   - ADR-0003: Filter-Architektur (OR-Logic)
   - ADR-0004: Task Template System

#### 5.3 Beispiel: README.md

```markdown
# Tasks Tab Dokumentation

**Version:** 1.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** [Datum]

---

## Features

- ✅ **Task Management** - Erstellen, Bearbeiten, Löschen
- ✅ **Filter System** - 4 Kategorien, OR-Logik
- ✅ **Template System** - 9 Standard PR-Workflow Tasks
- ✅ **Dashboard Widget** - Wiederverwendbares MyTasksWidget
- ✅ **React Query Integration** - Automatisches Caching
- ✅ **Performance-Optimiert** - useCallback, useMemo, React.memo
- ✅ **Comprehensive Tests** - 73 Tests, >80% Coverage

---

## Architektur

### Komponenten-Hierarchie

```
ProjectTaskManager (Main)
├── TaskFilterPanel
│   ├── View Mode Select
│   ├── Quick-Filter Buttons
│   └── Filter Popover (4 Kategorien)
├── TaskTemplateButton (nur bei Empty State)
├── TaskList
│   ├── LoadingState
│   ├── EmptyState
│   └── TaskListItem[] (mit Actions)
├── TaskCreateModal
├── TaskEditModal
└── ConfirmDialog (CRM Shared)
```

---

## Quick Start

### Tasks Tab verwenden

```typescript
import { ProjectTaskManager } from '@/components/projects/ProjectTaskManager';

<ProjectTaskManager
  projectId="project-123"
  organizationId="org-123"
  projectManagerId="user-123"
  teamMembers={members}
  projectTeamMemberIds={['user-123', 'user-456']}
  projectTitle="Mein Projekt"
/>
```

### Dashboard Widget verwenden

```typescript
import { MyTasksWidget } from '@/components/dashboard/MyTasksWidget';

<MyTasksWidget />
```

---

[... Rest der Dokumentation ...]
```

#### Checkliste Phase 5

- [ ] README.md erstellt (800+ Zeilen)
- [ ] api/README.md erstellt (400+ Zeilen)
- [ ] api/task-hooks.md erstellt (600+ Zeilen)
- [ ] components/README.md erstellt (900+ Zeilen)
- [ ] adr/README.md erstellt (500+ Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

#### Phase-Bericht

```markdown
## Phase 5: Dokumentation ✅

### Erstellt
- README.md (800+ Zeilen)
- api/README.md (400+ Zeilen)
- api/task-hooks.md (600+ Zeilen)
- components/README.md (900+ Zeilen)
- adr/README.md (500+ Zeilen)

### Gesamt
- **3.200+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- 4 ADRs
- Troubleshooting-Guides

### Commit
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation

- 3.200+ Zeilen in 5 Dateien
- 4 Architecture Decision Records
- Vollständige API + Component Docs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 6: Production-Ready Code Quality

#### Ziel
Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit
```

**Aktion:**
- [ ] Alle TypeScript-Fehler in Tasks Tab beheben
- [ ] Imports ergänzen
- [ ] Types definieren

#### 6.2 ESLint Check

```bash
npx eslint src/components/projects/ProjectTaskManager.tsx --fix
npx eslint src/components/projects/tasks/ --fix
npx eslint src/components/dashboard/MyTasksWidget.tsx --fix
```

**Aktion:**
- [ ] Auto-Fix durchführen
- [ ] Manuelle Fixes für verbleibende Warnings
- [ ] Missing dependencies ergänzen

#### 6.3 Console Cleanup

```bash
grep -r "console\." src/components/projects/tasks/
```

**Erlaubt:**
```typescript
// ✅ Nur in catch-blocks
catch (error) {
  console.error('Error:', error);
}
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('data:', data);
```

#### 6.4 Design System Compliance

**Bereits erledigt:**
- ✅ Primary Color: #005fab
- ✅ Heroicons /24/outline
- ✅ Zinc-Palette
- ✅ ConfirmDialog (CRM Shared)
- ✅ Toast-Service

**Prüfen:**
- [ ] Keine zusätzlichen Schatten
- [ ] Konsistente Focus-States
- [ ] Konsistente Button-Höhen

#### 6.5 Final Build Test

```bash
npm run build
npm run start
```

**Prüfen:**
- [ ] Build erfolgreich
- [ ] Tasks Tab funktioniert
- [ ] Dashboard Widget funktioniert
- [ ] Keine Console-Errors

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: Bestanden

#### Phase-Bericht

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Commit
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality

- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Console-Cleanup durchgeführt
- Build erfolgreich

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 🔄 Phase 7: Merge zu Main

### Workflow

```bash
# 1. Push Feature-Branch
git push origin feature/tasks-tab-refactoring

# 2. Zu Main wechseln und mergen
git checkout main
git merge feature/tasks-tab-refactoring --no-edit

# 3. Main pushen
git push origin main

# 4. Tests auf Main
npm test -- tasks
```

### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

### Final Report

```markdown
## ✅ Tasks Tab Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen
- **Tests:** 73/73 bestanden (100%)
- **Coverage:** [X]%
- **Dokumentation:** 3.200+ Zeilen

### Code-Änderungen
- ProjectTaskManager: 901 → 280 Zeilen (-69%)
- Dashboard page.tsx: 1.466 → 1.270 Zeilen (-13%)
- Neue Komponenten: 5 (TaskList, TaskListItem, TaskFilterPanel, TaskTemplateButton, MyTasksWidget)
- Neue Hooks: 1 (useMyTasks)

### Highlights
- Dashboard Widget extrahiert + wiederverwendbar
- React Query Integration
- 4 Komponenten modularisiert (< 200 Zeilen)
- Performance-Optimierungen (useCallback, useMemo, React.memo)
- Comprehensive Test Suite (73 Tests)
- 3.200+ Zeilen Dokumentation
- OR-Logik Filter-System
- Task Template System (9 Standard-Tasks)

### Nächste Schritte
- [ ] Production-Deployment
- [ ] Team-Demo
- [ ] User-Feedback sammeln
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Code-Reduktion:**
  - ProjectTaskManager: 901 → 280 Zeilen (-69%)
  - Dashboard page.tsx: 1.466 → 1.270 Zeilen (-13%)
  - **Gesamt:** -317 Zeilen (-16%)

- **Komponenten-Größe:**
  - Alle < 220 Zeilen ✅
  - Durchschnitt: ~150 Zeilen

- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** > 80%
- **Anzahl Tests:** 73 Tests
- **Pass-Rate:** 100%

### Dokumentation

- **Zeilen:** 3.200+ Zeilen
- **Dateien:** 5 Dokumente
- **ADRs:** 4 Architecture Decision Records

---

## 📝 Lessons Learned

### Bereits erledigt vor Refactoring

Diese Punkte mussten NICHT mehr gemacht werden:
- ✅ **Design System:** Bereits compliant (#005fab, Heroicons, ConfirmDialog)
- ✅ **Toast-Service:** Bereits integriert (toastService.success/error)
- ✅ **Admin SDK:** Prüfung durchgeführt → Security Rules reichen

**Vorteil:** Etwa 1 Tag Zeit gespart!

### Dashboard-Integration

**Highlight:** "Meine Aufgaben" Widget extrahiert
- Wiederverwendbar in Dashboard + Tasks Tab
- Dashboard page.tsx reduziert um 196 Zeilen
- Shared Hook `useMyTasks()` für beide Kontexte

### Filter-System

**OR-Logik Implementation:**
- Multi-Select Filter mit Arrays
- `.some()` Methode für OR-Verknüpfung
- 4 Filter-Kategorien: Fälligkeit, Sortierung, Status, Mitglieder

---

## 🔗 Referenzen

### Projekt-Spezifisch

- **Master Checklist:** `docs/planning/master-refactoring-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`

### Verwandte Module

- **Overview Tab:** `docs/planning/tabs/overview-tab-refactoring.md`
- **Communication Components:** `docs/planning/shared/communication-components-refactoring/`

---

**Version:** 1.0
**Erstellt:** 2025-10-24
**Maintainer:** CeleroPress Team
**Geschätzter Aufwand:** 4-5 Tage

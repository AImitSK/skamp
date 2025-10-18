# Phase 3: Tabellen-View + Archiv - Implementierungsplan

**Version:** 1.1
**Datum:** 2025-01-18 (Update: 2025-10-18)
**Modul:** `/dashboard/projects` (Tabellen-Ansicht)
**Basiert auf:** Modul-Refactoring Template v1.1
**Voraussetzung:** Phase 1 (React Query Integration) abgeschlossen

---

## ✅ Bereits erledigt (2025-10-18)

### Design-System-Anpassungen
- [x] **Subheading und Border entfernt** aus Header
- [x] **View-Switcher** an Design-System angepasst (bg-zinc-100, rounded-lg p-1)
- [x] **Search-Input** zur Toolbar hinzugefügt mit Suchlogik (Titel + Kunde)
- [x] **Toolbar-Reihenfolge** korrigiert: Search → Primary Action → View-Toggle → Filter
- [x] **Table-Design** komplett überarbeitet:
  - Alle Dark-Mode-Klassen entfernt (nicht im Design-System)
  - gray-* → zinc-* Farben konvertiert
  - 3-Punkte-Button optimiert (hover:bg-zinc-200, stroke-[2.5])
- [x] **Results-Info-Zeile** mit Middle Dot Pattern hinzugefügt
- [x] **Empty-States** Dark-Mode-Klassen entfernt

### Toast-Benachrichtigungen
- [x] **toastService** aus `/lib/utils/toast` integriert
- [x] **Success-Toasts** für alle CRUD-Operationen:
  - Projekt erstellt, aktualisiert, verschoben, archiviert, reaktiviert, gelöscht
- [x] **Error-Toasts** für Fehlerbehandlung
- [x] Konsistentes Pattern wie CRM-Seite

**Commits:**
- `61a78235` - design: Projekte-Tabelle an CeleroPress Design-System angepasst
- `34e3110e` - fix: Button nach rechts und Überschrift größer
- `2d5d5e05` - feat: Toast-Benachrichtigungen integriert
- `c22bc221` - fix: Button zurück in Toolbar verschoben

---

## 📋 Übersicht

Die Tabellen-Ansicht ist aktuell **direkt in page.tsx eingebettet** (Zeilen 538-860, ~320 Zeilen) und benötigt Modularisierung für bessere Wartbarkeit und Wiederverwendbarkeit.

**Strategie:** Tabellen-View in separate Komponenten extrahieren, Filter-Logik in Hooks auslagern, und 4 verschiedene Empty-States erstellen.

---

## 🎯 Verbleibende Ziele

- [ ] ListView-Komponente von page.tsx extrahieren (~320 Zeilen)
- [ ] ProjectTable-Komponente erstellen (sortierbare Spalten, Team-Avatare)
- [ ] Filter-Logik in Custom Hook auslagern (`useProjectFilters`)
- [ ] 4 Empty-State Komponenten für verschiedene Filter-Kombinationen
- [ ] Archiv-Filter optimieren und vereinfachen
- [ ] ~200-250 Zeilen aus page.tsx entfernen

---

## 📊 Ist-Zustand

### Code-Statistiken

```bash
src/app/dashboard/projects/page.tsx: 791 Zeilen
- Kanban-View: ~100 Zeilen
- Tabellen-View: ~320 Zeilen (Zeilen 538-860)
- Shared Code: ~371 Zeilen
```

### Probleme (Ist-Zustand)

1. **Monolithische page.tsx:**
   - Tabellen-View direkt eingebettet (Zeilen 538-860)
   - Zu viele inline JSX-Blöcke
   - Keine klare Trennung zwischen Logik und UI

2. **Filter-State Management:**
   - `showActive` und `showArchived` direkt in page.tsx
   - Filter-Dropdown-Logik inline
   - Kein wiederverwendbarer Hook

3. **Code-Duplikation:**
   - 4 Empty-States inline definiert (Zeilen 812-858)
   - Tabellen-Header und -Body gemischt
   - Team-Avatar-Logik wiederholt

4. **Fehlende Komponenten:**
   - Keine ListView-Komponente
   - Keine ProjectTable-Komponente
   - Keine wiederverwendbaren Empty-State-Komponenten

---

## 🚀 Phase 3: Tabellen-View Modularisierung

### Dauer: 1-2 Tage

### Phasen-Übersicht

| Schritt | Aufgabe | Dauer | Status | Output |
|---------|---------|-------|--------|--------|
| **3.0** | Pre-Refactoring Cleanup | 30 Min | ✅ Erledigt | Bereits sauber |
| **3.1** | Filter-Hook erstellen | 1h | ⏳ Pending | `useProjectFilters.ts` |
| **3.2** | Empty-State Komponenten | 1h | ⏳ Pending | 4 Komponenten |
| **3.3** | ProjectTable-Komponente | 2h | ⏳ Pending | `ProjectTable.tsx` |
| **3.4** | ListView-Komponente | 1h | ⏳ Pending | `ListView.tsx` |
| **3.5** | Integration in page.tsx | 1h | ⏳ Pending | Alte Code-Blöcke entfernt |

**Gesamt:** 6-7 Stunden

---

## Phase 3.0: Pre-Refactoring Cleanup ✅

**Status:** ✅ Abgeschlossen (2025-10-18)
**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

### Ergebnis

Alle Cleanup-Aufgaben wurden bereits in vorherigen Commits erledigt:
- ✅ Console-Logs: Nur noch 1x `console.error()` in catch-block (OK)
- ✅ loadProjects: Keine Referenzen mehr (nur Kommentar)
- ✅ Unused State: Alle State-Variablen werden verwendet
- ✅ TypeScript: Keine Fehler (nur bekannter false-positive)

**Keine Code-Änderungen nötig** - Basis ist bereits sauber durch Toast-Integration.

### Aufgaben

#### 3.0.1 Console-Logs finden & entfernen

```bash
# Console-Logs in page.tsx finden
grep -n "console\." src/app/dashboard/projects/page.tsx
```

**Zu entfernen:**
- Zeile 152: `console.log('Projekt erfolgreich erstellt:', result);`
- Weitere Debug-Logs in Handlers

**Behalten:**
- `console.error()` in catch-blocks

#### 3.0.2 Alte loadProjects-Calls entfernen

**Gefunden:**
- Zeile 311: `onClick={loadProjects}` (in Error State)
- Zeile 502: `onClick={loadProjects}` (in Error State)

**Problem:** `loadProjects` existiert nicht mehr (wurde durch React Query ersetzt)

**Aktion:**
```typescript
// ❌ Alte Referenzen entfernen
<button onClick={loadProjects}>
  Erneut versuchen
</button>

// ✅ React Query Refetch verwenden
<button onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}>
  Erneut versuchen
</button>
```

#### 3.0.3 Unused State-Variablen prüfen

**Prüfen:**
```typescript
const [error, setError] = useState<string | null>(null); // Wird error noch verwendet?
```

**Ergebnis:** Error-State wird verwendet (Zeilen 305, 496), behalten.

#### Checkliste Phase 3.0

- [ ] Console-Logs entfernt (~2 Logs)
- [ ] `loadProjects` Referenzen behoben (2x)
- [ ] TypeScript-Fehler geprüft
- [ ] Manueller Test durchgeführt

#### Deliverable

- `page.tsx` bereinigt (~ -5 Zeilen)
- Keine TypeScript-Errors
- Funktioniert noch

**Commit:**
```bash
git add .
git commit -m "chore: Phase 3.0 - Pre-Refactoring Cleanup für Table-View

- Console-Logs entfernt
- Alte loadProjects-Referenzen behoben
- Basis für Phase 3.1

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3.1: Filter-Hook erstellen

**Ziel:** Filter-Logik aus page.tsx in wiederverwendbaren Hook auslagern

### 3.1.1 Hook erstellen

**Neue Datei:** `src/lib/hooks/useProjectFilters.ts`

```typescript
import { useState, useMemo, useCallback } from 'react';
import { Project } from '@/types/project';

export interface ProjectFilters {
  showActive: boolean;
  showArchived: boolean;
}

export function useProjectFilters(projects: Project[]) {
  const [showActive, setShowActive] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Gefilterte Projekte basierend auf Checkboxen
  const filteredProjects = useMemo(() => {
    if (showActive && showArchived) {
      return projects;
    } else if (showActive) {
      return projects.filter(p => p.status !== 'archived');
    } else if (showArchived) {
      return projects.filter(p => p.status === 'archived');
    }
    return [];
  }, [projects, showActive, showArchived]);

  // Toggle-Funktionen mit useCallback
  const toggleActive = useCallback((value: boolean) => {
    setShowActive(value);
  }, []);

  const toggleArchived = useCallback((value: boolean) => {
    setShowArchived(value);
  }, []);

  // Filter-State zurücksetzen
  const resetFilters = useCallback(() => {
    setShowActive(true);
    setShowArchived(false);
  }, []);

  return {
    // States
    showActive,
    showArchived,

    // Gefilterte Daten
    filteredProjects,

    // Actions
    toggleActive,
    toggleArchived,
    resetFilters,
  };
}
```

### 3.1.2 **INTEGRATION in page.tsx** ⭐

**WICHTIG:** Dieser Schritt ist PFLICHT! Der Hook muss auch verwendet werden!

**In `src/app/dashboard/projects/page.tsx`:**

```typescript
// 1. Hook importieren
import { useProjectFilters } from '@/lib/hooks/useProjectFilters';

// 2. In der Komponente verwenden
export default function ProjectsPage() {
  // ...bestehender Code

  // React Query Hook
  const { data: allProjects = [], isLoading } = useProjects(currentOrganization?.id);

  // ✅ NEU: Filter-Hook verwenden
  const {
    showActive,
    showArchived,
    filteredProjects,
    toggleActive,
    toggleArchived,
  } = useProjectFilters(allProjects);

  // ❌ ENTFERNEN: Alte Filter-States (Zeilen 94-96)
  // const [showActive, setShowActive] = useState(true);
  // const [showArchived, setShowArchived] = useState(false);

  // ❌ ENTFERNEN: Altes useMemo (Zeilen 100-109)
  // const projects = React.useMemo(() => { ... }, [allProjects, showActive, showArchived]);

  // ✅ NEU: Gefilterte Projekte aus Hook verwenden
  const projects = filteredProjects;

  // ...restlicher Code
}
```

### 3.1.3 Filter-Dropdown anpassen

**In `src/app/dashboard/projects/page.tsx`:**

```typescript
// ✅ NEU: toggleActive/toggleArchived verwenden (Zeile 461, 473)
<input
  type="checkbox"
  checked={showActive}
  onChange={(e) => toggleActive(e.target.checked)} // ← Hook-Funktion
  className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
/>

<input
  type="checkbox"
  checked={showArchived}
  onChange={(e) => toggleArchived(e.target.checked)} // ← Hook-Funktion
  className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
/>
```

### Checkliste Phase 3.1

- [ ] `useProjectFilters.ts` erstellt (~60 Zeilen)
- [ ] **Hook in page.tsx IMPORTIERT**
- [ ] **Hook in page.tsx VERWENDET**
- [ ] **Alte Filter-States ENTFERNT** (Zeilen 94-96)
- [ ] **Altes useMemo ENTFERNT** (Zeilen 100-109)
- [ ] **Filter-Dropdown angepasst** (Zeilen 461, 473)
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test (Filter funktionieren)

### Deliverable

- `useProjectFilters.ts` erstellt (~60 Zeilen)
- `page.tsx` bereinigt (~ -15 Zeilen)
- Filter-Logik wiederverwendbar

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3.1 - Filter-Hook erstellt und integriert

- useProjectFilters Hook erstellt (60 Zeilen)
- Filter-Logik aus page.tsx extrahiert
- Alte Filter-States entfernt (~15 Zeilen)
- Hook in page.tsx verwendet ✅

Vorteile:
- Wiederverwendbare Filter-Logik
- Performance durch useMemo/useCallback
- Saubere Trennung von Logik und UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3.2: Empty-State Komponenten

**Ziel:** 4 verschiedene Empty-States in wiederverwendbare Komponenten extrahieren

### 3.2.1 Komponenten erstellen

**Ordner:** `src/app/dashboard/projects/components/empty-states/`

#### NoActiveProjectsState.tsx

```typescript
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

export default function NoActiveProjectsState() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
      <RocketLaunchIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
      <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
        Keine aktiven Projekte
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Erstelle dein erstes Projekt oder aktiviere den Archiv-Filter.
      </p>
    </div>
  );
}
```

#### NoArchivedProjectsState.tsx

```typescript
import { FolderIcon } from '@heroicons/react/24/outline';

export default function NoArchivedProjectsState() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
      <FolderIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
      <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
        Keine archivierten Projekte
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Archivierte Projekte werden hier angezeigt.
      </p>
    </div>
  );
}
```

#### NoFiltersSelectedState.tsx

```typescript
import { FunnelIcon } from '@heroicons/react/24/outline';

export default function NoFiltersSelectedState() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
      <FunnelIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
      <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
        Keine Filter ausgewählt
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Wähle "Aktiv" oder "Archiv" im Filter-Menü aus.
      </p>
    </div>
  );
}
```

#### NoProjectsAtAllState.tsx

```typescript
import { FolderIcon } from '@heroicons/react/24/outline';

export default function NoProjectsAtAllState() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center">
      <FolderIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
      <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">
        Keine Projekte vorhanden
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Erstelle dein erstes Projekt mit dem Wizard.
      </p>
    </div>
  );
}
```

### 3.2.2 **INTEGRATION in page.tsx** ⭐

**WICHTIG:** Alte Empty-State-Blöcke (Zeilen 812-858) müssen ENTFERNT werden!

**In `src/app/dashboard/projects/page.tsx`:**

```typescript
// 1. Imports hinzufügen
import NoActiveProjectsState from './components/empty-states/NoActiveProjectsState';
import NoArchivedProjectsState from './components/empty-states/NoArchivedProjectsState';
import NoFiltersSelectedState from './components/empty-states/NoFiltersSelectedState';
import NoProjectsAtAllState from './components/empty-states/NoProjectsAtAllState';

// 2. Im JSX verwenden (ersetzen Zeilen 812-858)
{/* Empty States für Tabellenansicht */}
{projects.length === 0 && showActive && !showArchived && (
  <NoActiveProjectsState />
)}

{projects.length === 0 && showArchived && !showActive && (
  <NoArchivedProjectsState />
)}

{projects.length === 0 && (!showActive && !showArchived) && (
  <NoFiltersSelectedState />
)}

{projects.length === 0 && (showActive && showArchived) && (
  <NoProjectsAtAllState />
)}
```

**❌ ENTFERNEN:** Alte inline Empty-States (Zeilen 812-858, ~47 Zeilen)

### Checkliste Phase 3.2

- [ ] 4 Empty-State Komponenten erstellt (~40 Zeilen pro Komponente)
- [ ] **Komponenten in page.tsx IMPORTIERT** (4 Imports)
- [ ] **Alte Empty-State-Blöcke ENTFERNT** (Zeilen 812-858, ~47 Zeilen)
- [ ] **Neue Komponenten VERWENDET** (im JSX)
- [ ] Manueller Test (alle 4 Empty-States funktionieren)

### Deliverable

- 4 Empty-State Komponenten (~160 Zeilen gesamt)
- `page.tsx` bereinigt (~ -47 Zeilen)

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3.2 - Empty-State Komponenten erstellt

- 4 Empty-State Komponenten erstellt (~160 Zeilen)
  - NoActiveProjectsState.tsx
  - NoArchivedProjectsState.tsx
  - NoFiltersSelectedState.tsx
  - NoProjectsAtAllState.tsx
- Inline Empty-States aus page.tsx entfernt (~47 Zeilen)
- Komponenten in page.tsx verwendet ✅

Vorteile:
- Wiederverwendbare Empty-State Komponenten
- Konsistentes Design
- ~47 Zeilen gespart in page.tsx

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3.3: ProjectTable-Komponente

**Ziel:** Tabellen-UI (Header + Body) in separate Komponente extrahieren

### 3.3.1 Komponente erstellen

**Neue Datei:** `src/app/dashboard/projects/components/ProjectTable.tsx`

```typescript
import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import {
  EllipsisVerticalIcon,
  BuildingOfficeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';

interface ProjectTableProps {
  projects: Project[];
  teamMembers: TeamMember[];
  loadingTeam: boolean;
  onEdit: (project: Project) => void;
  onArchive: (projectId: string) => Promise<void>;
  onUnarchive: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export default function ProjectTable({
  projects,
  teamMembers,
  loadingTeam,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: ProjectTableProps) {
  // Helper Functions
  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'on_hold': return 'yellow';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'zinc';
    }
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'on_hold': return 'Pausiert';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Abgebrochen';
      default: return status;
    }
  };

  const getCurrentStageLabel = (stage: string) => {
    switch (stage) {
      case 'ideas_planning': return 'Planung';
      case 'creation': return 'Erstellung';
      case 'approval': return 'Freigabe';
      case 'distribution': return 'Verteilung';
      case 'monitoring': return 'Monitoring';
      case 'completed': return 'Abgeschlossen';
      default: return stage;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center">
          <div className="flex-1 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Projekt
          </div>
          <div className="w-32 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Status
          </div>
          <div className="w-40 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Projektphase
          </div>
          <div className="w-40 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Team
          </div>
          <div className="w-24 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Priorität
          </div>
          <div className="w-32 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Aktualisiert
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {projects.map((project) => {
          const projectPriority = (project as any).priority as string;

          return (
            <div
              key={project.id}
              className="px-8 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center">
                {/* Projekt Title mit Kunde */}
                <div className="flex-1 px-4 min-w-0">
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary block truncate"
                    title={project.title}
                  >
                    {project.title}
                  </Link>
                  {project.customer && (
                    <div className="flex items-center gap-2 mt-1">
                      <BuildingOfficeIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {project.customer.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="w-32 px-4">
                  <Badge color={getProjectStatusColor(project.status)}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </div>

                {/* Projektphase */}
                <div className="w-40 px-4">
                  <div className="text-sm text-zinc-900 dark:text-white">
                    {getCurrentStageLabel(project.currentStage)}
                  </div>
                </div>

                {/* Team Avatare */}
                <div className="w-40 px-4">
                  {project.assignedTo && project.assignedTo.length > 0 ? (
                    <div className="flex -space-x-2">
                      {(() => {
                        const uniqueMembers = [];
                        const seenMemberIds = new Set();

                        for (const userId of project.assignedTo) {
                          const member = teamMembers.find((m) => m.userId === userId || m.id === userId);
                          if (member && !seenMemberIds.has(member.id)) {
                            uniqueMembers.push({ userId, member });
                            seenMemberIds.add(member.id);
                          } else if (!member) {
                            uniqueMembers.push({ userId, member: null });
                          }
                        }

                        return uniqueMembers;
                      })()
                        .slice(0, 3)
                        .map(({ userId, member }) => {
                          if (!member || loadingTeam) {
                            return (
                              <div
                                key={userId}
                                className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white"
                                title={loadingTeam ? 'Lädt Mitgliederdaten...' : 'Unbekanntes Mitglied'}
                              >
                                {loadingTeam ? '...' : '?'}
                              </div>
                            );
                          }

                          const initials = member.displayName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                          return (
                            <Avatar
                              key={userId}
                              className="size-7 ring-2 ring-white"
                              src={member.photoUrl}
                              initials={initials}
                              title={member.displayName}
                            />
                          );
                        })}
                      {(() => {
                        const uniqueMembers = [];
                        const seenMemberIds = new Set();

                        for (const userId of project.assignedTo) {
                          const member = teamMembers.find((m) => m.userId === userId || m.id === userId);
                          if (member && !seenMemberIds.has(member.id)) {
                            uniqueMembers.push({ userId, member });
                            seenMemberIds.add(member.id);
                          } else if (!member) {
                            uniqueMembers.push({ userId, member: null });
                          }
                        }

                        return uniqueMembers.length > 3 ? (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                            +{uniqueMembers.length - 3}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Kein Team</span>
                  )}
                </div>

                {/* Priorität */}
                <div className="w-24 px-4">
                  {projectPriority ? (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        projectPriority === 'urgent'
                          ? 'bg-red-50 text-red-700 ring-red-600/20'
                          : projectPriority === 'high'
                          ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
                          : projectPriority === 'medium'
                          ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                          : projectPriority === 'low'
                          ? 'bg-green-50 text-green-700 ring-green-600/20'
                          : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                      }`}
                    >
                      {projectPriority === 'urgent'
                        ? 'Dringend'
                        : projectPriority === 'high'
                        ? 'Hoch'
                        : projectPriority === 'medium'
                        ? 'Mittel'
                        : projectPriority === 'low'
                        ? 'Niedrig'
                        : '-'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">-</span>
                  )}
                </div>

                {/* Aktualisiert */}
                <div className="w-32 px-4">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">{formatDate(project.updatedAt)}</div>
                </div>

                {/* Actions Dropdown */}
                <div className="w-12 flex justify-end">
                  <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem href={`/dashboard/projects/${project.id}`}>
                        <EyeIcon className="h-4 w-4" />
                        Projekt anzeigen
                      </DropdownItem>
                      <DropdownItem onClick={() => onEdit(project)}>
                        <PencilIcon className="h-4 w-4" />
                        Bearbeiten
                      </DropdownItem>
                      <DropdownDivider />
                      {project.status === 'archived' ? (
                        <DropdownItem onClick={() => project.id && onUnarchive(project.id)}>
                          <ArchiveBoxIcon className="h-4 w-4" />
                          Reaktivieren
                        </DropdownItem>
                      ) : (
                        <DropdownItem onClick={() => project.id && onArchive(project.id)}>
                          <ArchiveBoxIcon className="h-4 w-4" />
                          Archivieren
                        </DropdownItem>
                      )}
                      <DropdownDivider />
                      <DropdownItem
                        onClick={() => {
                          if (
                            confirm(
                              'Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
                            )
                          ) {
                            project.id && onDelete(project.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="text-red-600">Löschen</span>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 3.3.2 **INTEGRATION in page.tsx** ⭐

**WICHTIG:** Alte Tabellen-Code-Blöcke (Zeilen 558-808) müssen ENTFERNT werden!

**In `src/app/dashboard/projects/page.tsx`:**

```typescript
// 1. Import hinzufügen
import ProjectTable from './components/ProjectTable';

// 2. Handler-Funktionen für Callbacks
const handleArchive = async (projectId: string) => {
  try {
    await archiveProjectMutation.mutateAsync({
      projectId,
      organizationId: currentOrganization.id,
      userId: user?.uid || '',
    });
  } catch (error) {
    console.error('Fehler beim Archivieren:', error);
  }
};

const handleUnarchive = async (projectId: string) => {
  try {
    await projectService.unarchive(projectId, {
      organizationId: currentOrganization.id,
      userId: user?.uid || '',
    });
  } catch (error) {
    console.error('Fehler beim Reaktivieren:', error);
  }
};

const handleDelete = async (projectId: string) => {
  try {
    await deleteProjectMutation.mutateAsync({
      projectId,
      organizationId: currentOrganization.id,
    });
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
  }
};

// 3. Im JSX verwenden (ersetzen Zeilen 558-808)
{!loading && !error && viewMode === 'list' && projects.length > 0 && (
  <ProjectTable
    projects={projects}
    teamMembers={teamMembers}
    loadingTeam={loadingTeam}
    onEdit={handleEditProject}
    onArchive={handleArchive}
    onUnarchive={handleUnarchive}
    onDelete={handleDelete}
  />
)}
```

**❌ ENTFERNEN:**
- Alte Tabellen-JSX (Zeilen 558-808, ~250 Zeilen)
- Helper-Funktionen `getProjectStatusColor`, `getProjectStatusLabel`, `getCurrentStageLabel`, `formatDate` (Zeilen 232-272, ~40 Zeilen)

### Checkliste Phase 3.3

- [ ] `ProjectTable.tsx` erstellt (~350 Zeilen)
- [ ] **Komponente in page.tsx IMPORTIERT**
- [ ] **Handler-Funktionen erstellt** (handleArchive, handleUnarchive, handleDelete)
- [ ] **Alte Tabellen-JSX ENTFERNT** (Zeilen 558-808, ~250 Zeilen)
- [ ] **Helper-Funktionen ENTFERNT** (Zeilen 232-272, ~40 Zeilen)
- [ ] **Neue Komponente VERWENDET**
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test (Tabelle funktioniert, Actions funktionieren)

### Deliverable

- `ProjectTable.tsx` erstellt (~350 Zeilen)
- `page.tsx` bereinigt (~ -290 Zeilen)

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3.3 - ProjectTable-Komponente erstellt

- ProjectTable-Komponente erstellt (~350 Zeilen)
  - Sortierbare Spalten
  - Team-Avatare
  - Status-Badges
  - Prioritäts-Tags
  - Actions-Dropdown (Anzeigen, Bearbeiten, Archivieren, Löschen)
- Alte Tabellen-JSX aus page.tsx entfernt (~250 Zeilen)
- Helper-Funktionen in Komponente verschoben (~40 Zeilen)
- Komponente in page.tsx verwendet ✅

Vorteile:
- Wiederverwendbare Tabellen-Komponente
- Klare Trennung von Logik und UI
- ~290 Zeilen gespart in page.tsx

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3.4: ListView-Komponente

**Ziel:** Gesamte Listen-Ansicht (inkl. Filter-Dropdown, Archiv-Banner, Table, Empty-States) in separate View-Komponente extrahieren

### 3.4.1 Komponente erstellen

**Neue Datei:** `src/app/dashboard/projects/components/views/ListView.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import ProjectTable from '../ProjectTable';
import NoActiveProjectsState from '../empty-states/NoActiveProjectsState';
import NoArchivedProjectsState from '../empty-states/NoArchivedProjectsState';
import NoFiltersSelectedState from '../empty-states/NoFiltersSelectedState';
import NoProjectsAtAllState from '../empty-states/NoProjectsAtAllState';
import { FunnelIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ListViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  loadingTeam: boolean;
  showActive: boolean;
  showArchived: boolean;
  onToggleActive: (value: boolean) => void;
  onToggleArchived: (value: boolean) => void;
  onEdit: (project: Project) => void;
  onArchive: (projectId: string) => Promise<void>;
  onUnarchive: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export default function ListView({
  projects,
  teamMembers,
  loadingTeam,
  showActive,
  showArchived,
  onToggleActive,
  onToggleArchived,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: ListViewProps) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  return (
    <div className="space-y-4">
      {/* Filter Button */}
      <div className="flex justify-end">
        <div className="relative" ref={filterDropdownRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`
              px-3 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center whitespace-nowrap
              ${
                (showActive && showArchived) || (!showActive && !showArchived)
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  : showArchived
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-green-500 bg-green-50 text-green-700'
              }
            `}
            title="Status-Filter"
          >
            <FunnelIcon className="h-4 w-4" />
            {showActive && showArchived && (
              <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">2</span>
            )}
            {showArchived && !showActive && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">A</span>
            )}
            {showActive && !showArchived && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">A</span>
            )}
          </button>

          {/* Filter Dropdown Menu */}
          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status Filter</p>
              </div>
              <div className="py-1">
                <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showActive}
                    onChange={(e) => onToggleActive(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                  />
                  <span>Aktiv</span>
                  {showActive && <CheckIcon className="h-4 w-4 text-green-600 ml-auto" />}
                </label>
                <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => onToggleArchived(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                  />
                  <span>Archiv</span>
                  {showArchived && <CheckIcon className="h-4 w-4 text-blue-600 ml-auto" />}
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archiv Info-Banner */}
      {showArchived && !showActive && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Archivansicht aktiv</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Archivierte Projekte können über das 3-Punkte-Menü reaktiviert werden.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Project Table */}
      {projects.length > 0 && (
        <ProjectTable
          projects={projects}
          teamMembers={teamMembers}
          loadingTeam={loadingTeam}
          onEdit={onEdit}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onDelete={onDelete}
        />
      )}

      {/* Empty States */}
      {projects.length === 0 && showActive && !showArchived && <NoActiveProjectsState />}
      {projects.length === 0 && showArchived && !showActive && <NoArchivedProjectsState />}
      {projects.length === 0 && !showActive && !showArchived && <NoFiltersSelectedState />}
      {projects.length === 0 && showActive && showArchived && <NoProjectsAtAllState />}
    </div>
  );
}
```

### 3.4.2 **INTEGRATION in page.tsx** ⭐

**WICHTIG:** Gesamte Listen-View-Blöcke (Filter-Dropdown + Banner + Table + Empty-States) müssen ENTFERNT werden!

**In `src/app/dashboard/projects/page.tsx`:**

```typescript
// 1. Import hinzufügen
import ListView from './components/views/ListView';

// 2. Im JSX verwenden (ersetzen gesamten List-View-Block)
{!loading && !error && viewMode === 'list' && (
  <ListView
    projects={projects}
    teamMembers={teamMembers}
    loadingTeam={loadingTeam}
    showActive={showActive}
    showArchived={showArchived}
    onToggleActive={toggleActive}
    onToggleArchived={toggleArchived}
    onEdit={handleEditProject}
    onArchive={handleArchive}
    onUnarchive={handleUnarchive}
    onDelete={handleDelete}
  />
)}
```

**❌ ENTFERNEN:**
- Filter-Dropdown in Header (Zeilen 414-485, ~72 Zeilen)
- Filter-Dropdown State (`showFilterDropdown`, Zeilen 96, 117-132)
- Archiv-Banner (Zeilen 542-556)
- Table-Block (bereits in Phase 3.3 entfernt)
- Empty-States (bereits in Phase 3.2 entfernt)
- filterDropdownRef (Zeile 97)

### Checkliste Phase 3.4

- [ ] `ListView.tsx` erstellt (~180 Zeilen)
- [ ] **Komponente in page.tsx IMPORTIERT**
- [ ] **Filter-Dropdown aus Header ENTFERNT** (Zeilen 414-485, ~72 Zeilen)
- [ ] **showFilterDropdown State ENTFERNT** (Zeilen 96, 117-132)
- [ ] **filterDropdownRef ENTFERNT** (Zeile 97)
- [ ] **Archiv-Banner ENTFERNT** (Zeilen 542-556)
- [ ] **Neue ListView-Komponente VERWENDET**
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test (ListView funktioniert komplett)

### Deliverable

- `ListView.tsx` erstellt (~180 Zeilen)
- `page.tsx` bereinigt (~ -90 Zeilen)

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3.4 - ListView-Komponente erstellt

- ListView-Komponente erstellt (~180 Zeilen)
  - Filter-Dropdown integriert
  - Archiv-Banner
  - ProjectTable-Integration
  - 4 Empty-States
- Filter-Dropdown aus page.tsx Header entfernt (~72 Zeilen)
- showFilterDropdown State entfernt
- filterDropdownRef entfernt
- Komponente in page.tsx verwendet ✅

Vorteile:
- Komplette Tabellen-Ansicht modularisiert
- Wiederverwendbare View-Komponente
- ~90 Zeilen gespart in page.tsx

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3.5: Integration & Final Cleanup

**Ziel:** Alle neuen Komponenten/Hooks verifizieren und finales Cleanup

### 3.5.1 Verifikation

**Checkliste:**

- [ ] **useProjectFilters Hook:**
  - [ ] Hook in page.tsx importiert?
  - [ ] Hook in page.tsx verwendet?
  - [ ] Alte Filter-States entfernt?

- [ ] **Empty-State Komponenten:**
  - [ ] 4 Komponenten importiert?
  - [ ] Alte Empty-State-Blöcke entfernt?
  - [ ] Neue Komponenten verwendet?

- [ ] **ProjectTable Komponente:**
  - [ ] Komponente importiert?
  - [ ] Handler-Funktionen erstellt?
  - [ ] Alte Tabellen-JSX entfernt?
  - [ ] Helper-Funktionen entfernt?

- [ ] **ListView Komponente:**
  - [ ] Komponente importiert?
  - [ ] Filter-Dropdown aus Header entfernt?
  - [ ] showFilterDropdown State entfernt?
  - [ ] filterDropdownRef entfernt?

### 3.5.2 TypeScript Check

```bash
npx tsc --noEmit | grep projects
```

**Erwartung:** 0 TypeScript-Fehler in Projects-Modul

### 3.5.3 ESLint Check

```bash
npx eslint src/app/dashboard/projects --fix
```

### 3.5.4 Manueller Test

**Test-Szenarien:**

1. **Filter-Test:**
   - [ ] Filter-Dropdown öffnen
   - [ ] "Aktiv" aktivieren → Nur aktive Projekte anzeigen
   - [ ] "Archiv" aktivieren → Nur archivierte Projekte anzeigen
   - [ ] Beide aktivieren → Alle Projekte anzeigen
   - [ ] Beide deaktivieren → "Keine Filter ausgewählt" Empty-State

2. **Empty-States-Test:**
   - [ ] Keine aktiven Projekte → "Keine aktiven Projekte" State
   - [ ] Keine archivierten Projekte → "Keine archivierten Projekte" State
   - [ ] Keine Filter → "Keine Filter ausgewählt" State
   - [ ] Keine Projekte gesamt → "Keine Projekte vorhanden" State

3. **Table-Test:**
   - [ ] Projekt anzeigen (Link funktioniert)
   - [ ] Projekt bearbeiten (Edit-Wizard öffnet)
   - [ ] Projekt archivieren (verschwindet aus Aktiv-Liste)
   - [ ] Projekt reaktivieren (verschwindet aus Archiv-Liste)
   - [ ] Projekt löschen (Bestätigung → Projekt wird gelöscht)

### 3.5.5 Code-Statistiken

```bash
npx cloc src/app/dashboard/projects/page.tsx
```

**Erwartung:**
- `page.tsx`: 791 → ~500-550 Zeilen (-240-290 Zeilen)

**Neue Dateien:**
```
src/lib/hooks/useProjectFilters.ts (~60 Zeilen)
src/app/dashboard/projects/components/
├── empty-states/
│   ├── NoActiveProjectsState.tsx (~40 Zeilen)
│   ├── NoArchivedProjectsState.tsx (~40 Zeilen)
│   ├── NoFiltersSelectedState.tsx (~40 Zeilen)
│   └── NoProjectsAtAllState.tsx (~40 Zeilen)
├── ProjectTable.tsx (~350 Zeilen)
└── views/
    └── ListView.tsx (~180 Zeilen)
```

**Gesamt neu:** ~750 Zeilen (aber besser organisiert!)
**Aus page.tsx entfernt:** ~240-290 Zeilen

### Checkliste Phase 3.5

- [ ] Alle Komponenten/Hooks verifiziert
- [ ] TypeScript: 0 Fehler in Projects
- [ ] ESLint: 0 Warnings in Projects
- [ ] Manueller Test: Alle Szenarien bestanden
- [ ] Code-Statistiken dokumentiert
- [ ] page.tsx: ~500-550 Zeilen (-30-37%)

### Deliverable

- Vollständig modularisierte Tabellen-Ansicht
- `page.tsx` bereinigt (~240-290 Zeilen gespart)
- 7 neue Dateien erstellt

**Final Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Tabellen-View Modularisierung abgeschlossen

Phase 3.1: Filter-Hook
- useProjectFilters Hook erstellt (60 Zeilen)
- Filter-Logik aus page.tsx extrahiert

Phase 3.2: Empty-State Komponenten
- 4 Empty-State Komponenten erstellt (160 Zeilen)
- Inline Empty-States entfernt

Phase 3.3: ProjectTable-Komponente
- ProjectTable-Komponente erstellt (350 Zeilen)
- Tabellen-JSX und Helper-Funktionen verschoben

Phase 3.4: ListView-Komponente
- ListView-Komponente erstellt (180 Zeilen)
- Filter-Dropdown integriert
- Gesamte Tabellen-View modularisiert

Phase 3.5: Final Cleanup
- TypeScript: 0 Fehler ✅
- ESLint: 0 Warnings ✅
- Manueller Test: Bestanden ✅

Ergebnis:
- page.tsx: 791 → ~500-550 Zeilen (-240-290 Zeilen / -30-37%)
- 7 neue modulare Komponenten/Hooks
- Wiederverwendbare Filter-Logik
- Konsistente Empty-States
- Professionelle Tabellen-Komponente

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 📊 Erwartete Ergebnisse

### Code-Reduktion

| Datei | Vorher | Nachher | Reduktion |
|-------|--------|---------|-----------|
| page.tsx | 791 Zeilen | ~500-550 Zeilen | -240-290 Zeilen (-30-37%) |

### Neue Dateien

| Datei | Zeilen | Typ |
|-------|--------|-----|
| useProjectFilters.ts | ~60 | Hook |
| NoActiveProjectsState.tsx | ~40 | Component |
| NoArchivedProjectsState.tsx | ~40 | Component |
| NoFiltersSelectedState.tsx | ~40 | Component |
| NoProjectsAtAllState.tsx | ~40 | Component |
| ProjectTable.tsx | ~350 | Component |
| ListView.tsx | ~180 | Component |
| **Gesamt** | **~750** | **7 Dateien** |

### Qualitäts-Metriken

**Vorher:**
- page.tsx: 791 Zeilen (Monolith)
- Tabellen-View: Inline (~320 Zeilen)
- Filter-Logik: Inline
- Empty-States: 4x dupliziert

**Nachher:**
- page.tsx: ~500-550 Zeilen (Orchestrator)
- Tabellen-View: ListView-Komponente (~180 Zeilen)
- Filter-Logik: useProjectFilters Hook (~60 Zeilen)
- Empty-States: 4 wiederverwendbare Komponenten

---

## 🧪 Testing (Optional - Phase 4)

### Hook Tests

**Datei:** `src/lib/hooks/__tests__/useProjectFilters.test.tsx`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useProjectFilters } from '../useProjectFilters';
import { Project } from '@/types/project';

describe('useProjectFilters', () => {
  const mockProjects: Project[] = [
    { id: '1', title: 'Active 1', status: 'active' } as Project,
    { id: '2', title: 'Active 2', status: 'active' } as Project,
    { id: '3', title: 'Archived 1', status: 'archived' } as Project,
  ];

  it('sollte initial nur aktive Projekte anzeigen', () => {
    const { result } = renderHook(() => useProjectFilters(mockProjects));

    expect(result.current.showActive).toBe(true);
    expect(result.current.showArchived).toBe(false);
    expect(result.current.filteredProjects).toHaveLength(2);
  });

  it('sollte nur archivierte Projekte anzeigen wenn Archiv-Filter aktiv', () => {
    const { result } = renderHook(() => useProjectFilters(mockProjects));

    act(() => {
      result.current.toggleActive(false);
      result.current.toggleArchived(true);
    });

    expect(result.current.filteredProjects).toHaveLength(1);
    expect(result.current.filteredProjects[0].id).toBe('3');
  });

  it('sollte alle Projekte anzeigen wenn beide Filter aktiv', () => {
    const { result } = renderHook(() => useProjectFilters(mockProjects));

    act(() => {
      result.current.toggleArchived(true);
    });

    expect(result.current.filteredProjects).toHaveLength(3);
  });

  it('sollte leeres Array zurückgeben wenn keine Filter aktiv', () => {
    const { result } = renderHook(() => useProjectFilters(mockProjects));

    act(() => {
      result.current.toggleActive(false);
    });

    expect(result.current.filteredProjects).toHaveLength(0);
  });
});
```

### Component Tests

**Datei:** `src/app/dashboard/projects/components/__tests__/ProjectTable.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectTable from '../ProjectTable';
import { Project } from '@/types/project';

describe('ProjectTable', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      title: 'Test Project',
      status: 'active',
      currentStage: 'ideas_planning',
      assignedTo: [],
    } as Project,
  ];

  const mockTeamMembers = [];
  const mockHandlers = {
    onEdit: jest.fn(),
    onArchive: jest.fn(),
    onUnarchive: jest.fn(),
    onDelete: jest.fn(),
  };

  it('sollte Projekt anzeigen', () => {
    render(
      <ProjectTable
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        loadingTeam={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('sollte Bearbeiten-Action aufrufen', async () => {
    const user = userEvent.setup();

    render(
      <ProjectTable
        projects={mockProjects}
        teamMembers={mockTeamMembers}
        loadingTeam={false}
        {...mockHandlers}
      />
    );

    // Dropdown öffnen
    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    // Bearbeiten klicken
    const editButton = screen.getByText('Bearbeiten');
    await user.click(editButton);

    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockProjects[0]);
  });
});
```

---

## 🚦 Abhängigkeiten & Risiken

### Abhängigkeiten

- **Phase 1 abgeschlossen:** React Query Hooks müssen vorhanden sein (`useProjects`, `useDeleteProject`, `useArchiveProject`)
- **Design System:** CeleroPress Design System muss verfügbar sein

### Risiken

**Risiko 1: Breaking Changes in page.tsx**
- **Wahrscheinlichkeit:** Mittel
- **Impact:** Hoch
- **Mitigation:** Schrittweise Integration, nach jedem Schritt testen

**Risiko 2: Vergessen, alte Code-Blöcke zu entfernen**
- **Wahrscheinlichkeit:** Hoch (basierend auf Feedback)
- **Impact:** Mittel
- **Mitigation:** **Explizite Checklisten nach jeder Phase** (siehe ⭐ Markierungen)

**Risiko 3: TypeScript-Fehler**
- **Wahrscheinlichkeit:** Mittel
- **Impact:** Mittel
- **Mitigation:** TypeScript-Check nach jeder Phase

---

## 💡 Wichtige Hinweise

### ⚠️ KRITISCH: Neue Hooks/Komponenten MÜSSEN verwendet werden!

**Problem (aus Vergangenheit):**
> "Bei den letzten Implementierungen wurde vergessen die neu erstellen hooks usw. auch später im Code zu verwenden."

**Lösung:**

1. **Nach JEDER Phase:**
   - [ ] Neue Datei erstellt?
   - [ ] Datei in page.tsx IMPORTIERT?
   - [ ] Datei in page.tsx VERWENDET?
   - [ ] Alte Code-Blöcke ENTFERNT?

2. **Explizite "INTEGRATION"-Schritte:**
   - Jede Phase hat einen separaten "INTEGRATION in page.tsx" Abschnitt mit ⭐
   - Zeilen-Nummern der zu entfernenden Code-Blöcke angegeben

3. **Checklisten mit Verifikation:**
   - Jede Phase hat eine detaillierte Checkliste
   - Phase 3.5 verifiziert ALLE vorherigen Phasen

4. **Klare Commit-Messages:**
   - "Hook erstellt und integriert ✅"
   - Nicht nur "Hook erstellt"

---

## 📅 Zeitplan

| Phase | Dauer | Kumulativ |
|-------|-------|-----------|
| 3.0 - Cleanup | 30 Min | 30 Min |
| 3.1 - Filter-Hook | 1h | 1.5h |
| 3.2 - Empty-States | 1h | 2.5h |
| 3.3 - ProjectTable | 2h | 4.5h |
| 3.4 - ListView | 1h | 5.5h |
| 3.5 - Final Cleanup | 1h | 6.5h |

**Gesamt:** 6.5 Stunden (ca. 1 Arbeitstag)

---

## 🔗 Referenzen

### Interne Docs

- **Haupt-Refactoring-Plan:** `docs/planning/projects-overview-refactoring-plan.md`
- **Template:** `docs/templates/module-refactoring-template.md`
- **Kanban-Dokumentation:** `docs/projects/kanban/README.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`

### Code-Locations

- **Page:** `src/app/dashboard/projects/page.tsx`
- **Hooks:** `src/lib/hooks/`
- **Types:** `src/types/project.ts`

---

## ✅ Approval

**User Approval erforderlich:**
- [ ] Phase 3 Strategie akzeptiert
- [ ] Zeitplan realistisch
- [ ] Kann mit Phase 3.0 starten

**Nach Approval:**
- [ ] Mit Phase 3.0 (Cleanup) starten
- [ ] Schrittweise durch alle Phasen arbeiten
- [ ] Nach jeder Phase committen

---

**Version:** 1.0
**Autor:** Claude Code
**Status:** 🟡 Awaiting User Approval
**Geschätzter Aufwand:** 6.5 Stunden (1 Arbeitstag)

---

*Dieser Plan ist ein lebendes Dokument und wird während der Implementierung aktualisiert.*

# Projects Table-View Komponenten-Dokumentation

**Version:** 1.0
**Letzte Aktualisierung:** 18. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Hook](#hook)
- [Empty-State Komponenten](#empty-state-komponenten)
- [Table Komponenten](#table-komponenten)
- [View Komponenten](#view-komponenten)
- [Best Practices](#best-practices)
- [Testing](#testing)

---

## Übersicht

Alle Komponenten und Hooks des Table-View Refactorings mit detaillierten Verwendungsbeispielen, Props und Best Practices.

### Komponenten-Übersicht

| Komponente | Typ | Zeilen | Zweck |
|------------|-----|--------|-------|
| useProjectFilters | Hook | 68 | Filter-Logik |
| NoActiveProjectsState | Component | 15 | Empty State "Keine aktiven Projekte" |
| NoArchivedProjectsState | Component | 15 | Empty State "Keine archivierten Projekte" |
| NoFiltersSelectedState | Component | 15 | Empty State "Keine Filter ausgewählt" |
| NoProjectsAtAllState | Component | 15 | Empty State "Keine Projekte vorhanden" |
| ProjectTable | Component | 350 | Komplette Table-Implementation |
| ListView | Component | 120 | Komplette List-View |

---

## Hook

### useProjectFilters

**Pfad:** `src/lib/hooks/useProjectFilters.ts`
**Größe:** 68 Zeilen
**Typ:** Custom React Hook
**Zweck:** Filter-Logik für Project-Listen

#### Interface

```typescript
interface ProjectFilters {
  showActive: boolean;
  showArchived: boolean;
}

interface UseProjectFiltersReturn {
  showActive: boolean;
  showArchived: boolean;
  filteredProjects: Project[];
  toggleActive: (value: boolean) => void;
  toggleArchived: (value: boolean) => void;
  resetFilters: () => void;
}

function useProjectFilters(
  projects: Project[],
  searchTerm?: string
): UseProjectFiltersReturn
```

#### Props

| Prop | Typ | Required | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| projects | Project[] | ✅ | - | Array von Projekten zum Filtern |
| searchTerm | string | ❌ | '' | Suchbegriff für Name/Customer-Filter |

#### Return Values

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| showActive | boolean | Status: Aktive Projekte anzeigen |
| showArchived | boolean | Status: Archivierte Projekte anzeigen |
| filteredProjects | Project[] | Gefilterte Projekt-Liste |
| toggleActive | (value: boolean) => void | Aktive-Filter umschalten |
| toggleArchived | (value: boolean) => void | Archiv-Filter umschalten |
| resetFilters | () => void | Alle Filter zurücksetzen |

#### Filter-Logik

**Status-Filter:**
- `showActive=true, showArchived=false` → Nur aktive Projekte (status !== 'archived')
- `showActive=false, showArchived=true` → Nur archivierte Projekte (status === 'archived')
- `showActive=true, showArchived=true` → Alle Projekte
- `showActive=false, showArchived=false` → Keine Projekte (leere Liste)

**Such-Filter:**
- Sucht in `project.title` (case-insensitive)
- Sucht in `project.customer.name` (case-insensitive)
- Kombiniert mit Status-Filter (AND-Verknüpfung)

#### Performance

- **useMemo:** filteredProjects wird gecached
- **useCallback:** Callbacks werden gecached
- **Re-Render-Optimierung:** Nur bei Änderung von projects, showActive, showArchived, searchTerm

#### Verwendung

```typescript
import { useProjectFilters } from '@/lib/hooks/useProjectFilters';

function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: allProjects = [] } = useProjects(organizationId);

  const {
    showActive,
    showArchived,
    filteredProjects,
    toggleActive,
    toggleArchived,
  } = useProjectFilters(allProjects, searchTerm);

  return (
    <div>
      {/* Filter-Controls */}
      <div>
        <Checkbox
          checked={showActive}
          onChange={(e) => toggleActive(e.target.checked)}
          label="Aktiv"
        />
        <Checkbox
          checked={showArchived}
          onChange={(e) => toggleArchived(e.target.checked)}
          label="Archiv"
        />
      </div>

      {/* Projekt-Liste */}
      <ProjectTable projects={filteredProjects} />
    </div>
  );
}
```

#### Beispiel: Mit Such-Filter

```typescript
const [searchTerm, setSearchTerm] = useState('');
const { filteredProjects } = useProjectFilters(allProjects, searchTerm);

<Input
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  placeholder="Projekte durchsuchen..."
/>

<div>
  {filteredProjects.length} Projekte
  {searchTerm && ` · gefiltert von ${allProjects.length} gesamt`}
</div>
```

#### Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useProjectFilters } from '@/lib/hooks/useProjectFilters';

describe('useProjectFilters', () => {
  const mockProjects = [
    { id: '1', title: 'Project A', status: 'active' },
    { id: '2', title: 'Project B', status: 'archived' },
  ];

  it('sollte nur aktive Projekte filtern', () => {
    const { result } = renderHook(() =>
      useProjectFilters(mockProjects, '')
    );

    expect(result.current.filteredProjects).toHaveLength(1);
    expect(result.current.filteredProjects[0].id).toBe('1');
  });

  it('sollte nach Suchbegriff filtern', () => {
    const { result } = renderHook(() =>
      useProjectFilters(mockProjects, 'Project A')
    );

    expect(result.current.filteredProjects).toHaveLength(1);
    expect(result.current.filteredProjects[0].title).toBe('Project A');
  });
});
```

---

## Empty-State Komponenten

Alle Empty-State Komponenten folgen dem gleichen Pattern und sind vollständig wiederverwendbar.

### Gemeinsames Pattern

**Struktur:**
```tsx
<div className="bg-white rounded-lg shadow-sm p-8 text-center">
  <Icon className="mx-auto h-12 w-12 text-zinc-400" />
  <h3 className="mt-2 text-sm font-medium text-zinc-900">
    {title}
  </h3>
  <p className="mt-1 text-sm text-zinc-500">
    {message}
  </p>
</div>
```

**Styling:**
- Background: `bg-white`
- Border-Radius: `rounded-lg`
- Shadow: `shadow-sm`
- Padding: `p-8`
- Text-Alignment: `text-center`
- Icon: Heroicons /24/outline, `h-12 w-12`, `text-zinc-400`
- Title: `text-sm font-medium text-zinc-900`
- Message: `text-sm text-zinc-500`

---

### NoActiveProjectsState

**Pfad:** `src/app/dashboard/projects/components/empty-states/NoActiveProjectsState.tsx`
**Größe:** 15 Zeilen
**Icon:** RocketLaunchIcon

#### Verwendung

```typescript
import NoActiveProjectsState from './components/empty-states/NoActiveProjectsState';

{projects.length === 0 && showActive && !showArchived && (
  <NoActiveProjectsState />
)}
```

#### Wann anzeigen?

- Status: `showActive=true, showArchived=false`
- Bedingung: `projects.length === 0`
- Bedeutung: Keine aktiven Projekte vorhanden

#### Text

- **Titel:** "Keine aktiven Projekte"
- **Message:** "Erstelle dein erstes Projekt oder aktiviere den Archiv-Filter."

---

### NoArchivedProjectsState

**Pfad:** `src/app/dashboard/projects/components/empty-states/NoArchivedProjectsState.tsx`
**Größe:** 15 Zeilen
**Icon:** FolderIcon

#### Verwendung

```typescript
import NoArchivedProjectsState from './components/empty-states/NoArchivedProjectsState';

{projects.length === 0 && showArchived && !showActive && (
  <NoArchivedProjectsState />
)}
```

#### Wann anzeigen?

- Status: `showActive=false, showArchived=true`
- Bedingung: `projects.length === 0`
- Bedeutung: Keine archivierten Projekte vorhanden

#### Text

- **Titel:** "Keine archivierten Projekte"
- **Message:** "Archivierte Projekte werden hier angezeigt."

---

### NoFiltersSelectedState

**Pfad:** `src/app/dashboard/projects/components/empty-states/NoFiltersSelectedState.tsx`
**Größe:** 15 Zeilen
**Icon:** FunnelIcon

#### Verwendung

```typescript
import NoFiltersSelectedState from './components/empty-states/NoFiltersSelectedState';

{projects.length === 0 && !showActive && !showArchived && (
  <NoFiltersSelectedState />
)}
```

#### Wann anzeigen?

- Status: `showActive=false, showArchived=false`
- Bedingung: `projects.length === 0` (immer true bei keinen Filtern)
- Bedeutung: Keine Filter ausgewählt

#### Text

- **Titel:** "Keine Filter ausgewählt"
- **Message:** "Wähle 'Aktiv' oder 'Archiv' im Filter-Menü aus."

---

### NoProjectsAtAllState

**Pfad:** `src/app/dashboard/projects/components/empty-states/NoProjectsAtAllState.tsx`
**Größe:** 15 Zeilen
**Icon:** FolderIcon

#### Verwendung

```typescript
import NoProjectsAtAllState from './components/empty-states/NoProjectsAtAllState';

{projects.length === 0 && showActive && showArchived && (
  <NoProjectsAtAllState />
)}
```

#### Wann anzeigen?

- Status: `showActive=true, showArchived=true`
- Bedingung: `projects.length === 0`
- Bedeutung: Überhaupt keine Projekte vorhanden

#### Text

- **Titel:** "Keine Projekte vorhanden"
- **Message:** "Erstelle dein erstes Projekt mit dem Wizard."

---

## Table Komponenten

### ProjectTable

**Pfad:** `src/app/dashboard/projects/components/tables/ProjectTable.tsx`
**Größe:** 350 Zeilen
**Typ:** Client Component
**Zweck:** Vollständige Table-Implementation für Projects

#### Props Interface

```typescript
interface ProjectTableProps {
  projects: Project[];
  teamMembers: TeamMember[];
  loadingTeam: boolean;
  currentOrganizationId: string;
  userId: string;
  onEdit: (project: Project) => void;
  onArchive: (projectId: string) => Promise<void>;
  onUnarchive: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}
```

#### Props

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| projects | Project[] | ✅ | Projekte zum Anzeigen |
| teamMembers | TeamMember[] | ✅ | Team-Mitglieder für Avatare |
| loadingTeam | boolean | ✅ | Loading-State für Team |
| currentOrganizationId | string | ✅ | Aktuelle Organization-ID |
| userId | string | ✅ | Aktuelle User-ID |
| onEdit | (project) => void | ✅ | Callback: Projekt bearbeiten |
| onArchive | (projectId) => Promise<void> | ✅ | Callback: Projekt archivieren |
| onUnarchive | (projectId) => Promise<void> | ✅ | Callback: Projekt reaktivieren |
| onDelete | (projectId) => Promise<void> | ✅ | Callback: Projekt löschen |

#### Features

**Table Header:**
- 7 Spalten: Projekt, Status, Projektphase, Team, Priorität, Aktualisiert, Actions
- Sticky Header (optional)
- Uppercase Labels
- Zinc-50 Background

**Table Body:**
- Project Rows mit Hover-Effekt
- Truncated Text für lange Titel
- Customer-Info unterhalb des Titels
- Responsive Column-Widths

**Spalten:**

1. **Projekt** (flex-1)
   - Titel als Link zu `/dashboard/projects/[id]`
   - Hover: text-primary
   - Customer-Name mit BuildingOfficeIcon
   - Truncate bei langen Titeln

2. **Status** (w-32)
   - Badge mit Status-Farbe
   - Colors: green (active), yellow (on_hold), blue (completed), red (cancelled)

3. **Projektphase** (w-40)
   - Text-Label der aktuellen Phase
   - Labels: Planung, Erstellung, Freigabe, Verteilung, Monitoring, Abgeschlossen

4. **Team** (w-40)
   - Team-Avatare (max. 3 sichtbar)
   - +N Badge für weitere Mitglieder
   - Fallback für unbekannte Mitglieder
   - "Kein Team" Text wenn leer

5. **Priorität** (w-24)
   - Badge mit Prioritäts-Farbe
   - Colors: red (urgent), orange (high), yellow (medium), green (low)
   - Labels: Dringend, Hoch, Mittel, Niedrig

6. **Aktualisiert** (w-32)
   - Formatiertes Datum (DD.MM.YYYY)
   - text-xs text-zinc-600

7. **Actions** (w-12)
   - Dropdown-Menü (3-Punkte)
   - Actions: Anzeigen, Bearbeiten, Archivieren/Reaktivieren, Löschen

**Actions-Dropdown:**
```tsx
<DropdownMenu>
  <DropdownItem>Projekt anzeigen</DropdownItem>
  <DropdownItem>Bearbeiten</DropdownItem>
  <DropdownDivider />
  {archived ? (
    <DropdownItem>Reaktivieren</DropdownItem>
  ) : (
    <DropdownItem>Archivieren</DropdownItem>
  )}
  <DropdownDivider />
  <DropdownItem>Löschen</DropdownItem>
</DropdownMenu>
```

#### Hilfsfunktionen

**getProjectStatusColor(status: string)**
```typescript
switch (status) {
  case 'active': return 'green';
  case 'on_hold': return 'yellow';
  case 'completed': return 'blue';
  case 'cancelled': return 'red';
  default: return 'zinc';
}
```

**getProjectStatusLabel(status: string)**
```typescript
switch (status) {
  case 'active': return 'Aktiv';
  case 'on_hold': return 'Pausiert';
  case 'completed': return 'Abgeschlossen';
  case 'cancelled': return 'Abgebrochen';
  default: return status;
}
```

**getCurrentStageLabel(stage: string)**
```typescript
switch (stage) {
  case 'ideas_planning': return 'Planung';
  case 'creation': return 'Erstellung';
  case 'approval': return 'Freigabe';
  case 'distribution': return 'Verteilung';
  case 'monitoring': return 'Monitoring';
  case 'completed': return 'Abgeschlossen';
  default: return stage;
}
```

**formatDate(timestamp: any)**
```typescript
if (!timestamp) return '';
const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
return date.toLocaleDateString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});
```

#### Verwendung

```typescript
import ProjectTable from './components/tables/ProjectTable';

<ProjectTable
  projects={filteredProjects}
  teamMembers={teamMembers}
  loadingTeam={loadingTeam}
  currentOrganizationId={currentOrganization.id}
  userId={user?.uid || ''}
  onEdit={handleEditProject}
  onArchive={handleArchive}
  onUnarchive={handleUnarchive}
  onDelete={handleDelete}
/>
```

#### Callback-Implementierung

```typescript
const handleArchive = async (projectId: string) => {
  if (!currentOrganization) return;
  await archiveProjectMutation.mutateAsync({
    projectId,
    organizationId: currentOrganization.id,
    userId: user?.uid || ''
  });
};

const handleUnarchive = async (projectId: string) => {
  if (!currentOrganization) return;
  await projectService.unarchive(projectId, {
    organizationId: currentOrganization.id,
    userId: user?.uid || ''
  });
};

const handleDelete = async (projectId: string) => {
  if (!currentOrganization) return;
  await deleteProjectMutation.mutateAsync({
    projectId,
    organizationId: currentOrganization.id
  });
};
```

---

## View Komponenten

### ListView

**Pfad:** `src/app/dashboard/projects/components/views/ListView.tsx`
**Größe:** 120 Zeilen
**Typ:** Client Component
**Zweck:** Komplette List-View mit Loading, Results, Table, Empty-States

#### Props Interface

```typescript
interface ListViewProps {
  loading: boolean;
  projects: Project[];
  allProjects: Project[];
  searchTerm: string;
  showActive: boolean;
  showArchived: boolean;
  teamMembers: TeamMember[];
  loadingTeam: boolean;
  currentOrganizationId: string;
  userId: string;
  onEdit: (project: Project) => void;
  onArchive: (projectId: string) => Promise<void>;
  onUnarchive: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}
```

#### Props

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| loading | boolean | ✅ | Loading-State |
| projects | Project[] | ✅ | Gefilterte Projekte |
| allProjects | Project[] | ✅ | Alle Projekte (für Count) |
| searchTerm | string | ✅ | Suchbegriff für Info |
| showActive | boolean | ✅ | Active-Filter Status |
| showArchived | boolean | ✅ | Archived-Filter Status |
| teamMembers | TeamMember[] | ✅ | Team-Mitglieder |
| loadingTeam | boolean | ✅ | Team Loading-State |
| currentOrganizationId | string | ✅ | Organization-ID |
| userId | string | ✅ | User-ID |
| onEdit | (project) => void | ✅ | Edit-Callback |
| onArchive | (id) => Promise<void> | ✅ | Archive-Callback |
| onUnarchive | (id) => Promise<void> | ✅ | Unarchive-Callback |
| onDelete | (id) => Promise<void> | ✅ | Delete-Callback |

#### Features

**Loading State:**
- Spinner (animate-spin)
- "Projekte werden geladen..." Text
- Centered Display

**Results Info:**
- Projekt-Count
- Singular/Plural ("1 Projekt" / "X Projekte")
- Such-Info: "· gefiltert von X gesamt"

**Archive Banner:**
- Nur bei `showArchived && !showActive`
- Blue Background (bg-blue-50)
- FunnelIcon
- Info: "Archivansicht aktiv"
- Message: "Archivierte Projekte können über das 3-Punkte-Menü reaktiviert werden"

**Content:**
- ProjectTable (wenn projects.length > 0)
- Empty States (wenn projects.length === 0)

#### Struktur

```tsx
<ListView>
  {loading ? (
    <LoadingState />
  ) : (
    <>
      <ResultsInfo />
      <div className="space-y-4">
        {showArchived && !showActive && <ArchiveBanner />}
        {projects.length > 0 ? (
          <ProjectTable />
        ) : (
          <EmptyStates />
        )}
      </div>
    </>
  )}
</ListView>
```

#### Verwendung

```typescript
import ListView from './components/views/ListView';

{viewMode === 'list' && !error && (
  <ListView
    loading={loading}
    projects={filteredProjects}
    allProjects={allProjects}
    searchTerm={searchTerm}
    showActive={showActive}
    showArchived={showArchived}
    teamMembers={teamMembers}
    loadingTeam={loadingTeam}
    currentOrganizationId={currentOrganization.id}
    userId={user?.uid || ''}
    onEdit={handleEditProject}
    onArchive={handleArchive}
    onUnarchive={handleUnarchive}
    onDelete={handleDelete}
  />
)}
```

---

## Best Practices

### Komponenten-Größe

- ✅ **< 150 Zeilen:** Sehr gut wartbar
- ✅ **150-300 Zeilen:** Gut wartbar
- ⚠️ **300-500 Zeilen:** Prüfen ob aufspaltbar
- ❌ **> 500 Zeilen:** Aufteilen!

**Aktuelle Komponenten:**
- ✅ useProjectFilters: 68 Zeilen
- ✅ Empty States (je): ~15 Zeilen
- ✅ ListView: 120 Zeilen
- ✅ ProjectTable: 350 Zeilen (akzeptabel für komplexe Table)

### Props-Design

✅ **DO:**
- TypeScript Interfaces verwenden
- Required/Optional klar kennzeichnen
- Callbacks immer mit Promise<void> typen
- Descriptive Prop-Names

❌ **DON'T:**
- Undefinierte Props
- Any-Types verwenden
- Zu viele Props (>15)
- Props mutieren

### Performance

✅ **DO:**
- useMemo für gefilterte Daten
- useCallback für Callbacks
- React.memo für teure Komponenten
- Debouncing für Search

❌ **DON'T:**
- Inline Functions in Render
- Unnötige Re-Renders
- State-Lifting ohne Grund

### Testing

✅ **DO:**
- Unit-Tests für Hooks
- Integration-Tests für Views
- Component-Tests für Shared Components
- Mock-Data verwenden

❌ **DON'T:**
- Tests ohne Assertions
- Flaky Tests
- Tests ohne Cleanup

---

## Testing

### Hook-Tests

```typescript
// useProjectFilters.test.ts
import { renderHook, act } from '@testing-library/react';
import { useProjectFilters } from '../useProjectFilters';

describe('useProjectFilters', () => {
  it('sollte initial nur aktive Projekte anzeigen', () => {
    const { result } = renderHook(() =>
      useProjectFilters(mockProjects, '')
    );

    expect(result.current.showActive).toBe(true);
    expect(result.current.showArchived).toBe(false);
  });

  it('sollte Filter umschalten', () => {
    const { result } = renderHook(() =>
      useProjectFilters(mockProjects, '')
    );

    act(() => {
      result.current.toggleArchived(true);
    });

    expect(result.current.showArchived).toBe(true);
  });
});
```

### Component-Tests

```typescript
// NoActiveProjectsState.test.tsx
import { render, screen } from '@testing-library/react';
import NoActiveProjectsState from '../NoActiveProjectsState';

describe('NoActiveProjectsState', () => {
  it('sollte korrekten Text anzeigen', () => {
    render(<NoActiveProjectsState />);

    expect(screen.getByText('Keine aktiven Projekte')).toBeInTheDocument();
    expect(screen.getByText(/Erstelle dein erstes Projekt/)).toBeInTheDocument();
  });

  it('sollte Icon rendern', () => {
    const { container } = render(<NoActiveProjectsState />);
    const icon = container.querySelector('svg');

    expect(icon).toBeInTheDocument();
  });
});
```

### Integration-Tests

```typescript
// ListView.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import ListView from '../ListView';

describe('ListView', () => {
  it('sollte Loading-State anzeigen', () => {
    render(<ListView loading={true} projects={[]} {...otherProps} />);

    expect(screen.getByText('Projekte werden geladen...')).toBeInTheDocument();
  });

  it('sollte ProjectTable bei Projekten anzeigen', () => {
    render(<ListView loading={false} projects={mockProjects} {...otherProps} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('sollte Empty-State bei keinen Projekten anzeigen', () => {
    render(
      <ListView
        loading={false}
        projects={[]}
        showActive={true}
        showArchived={false}
        {...otherProps}
      />
    );

    expect(screen.getByText('Keine aktiven Projekte')).toBeInTheDocument();
  });
});
```

---

## Referenzen

### Interne Dokumentation

- [Main README](../README.md)
- [ADR-Dokumentation](../adr/README.md)
- [Kanban Components](../../kanban/components/README.md)
- [Design System](../../../design-system/DESIGN_SYSTEM.md)

### Code-Beispiele

- **Hooks:** `src/lib/hooks/useProjectFilters.ts`
- **Empty States:** `src/app/dashboard/projects/components/empty-states/`
- **Table:** `src/app/dashboard/projects/components/tables/ProjectTable.tsx`
- **View:** `src/app/dashboard/projects/components/views/ListView.tsx`

---

**Version:** 1.0
**Erstellt:** 18. Oktober 2025
**Maintainer:** CeleroPress Development Team

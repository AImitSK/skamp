# Project Detail Page - Komponenten-Dokumentation

> **Modul**: Project Detail Page Components
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 21. Oktober 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Komponenten-Kategorien](#komponenten-kategorien)
- [Header-Komponenten](#header-komponenten)
  - [ProjectHeader](#projectheader)
  - [ProjectInfoBar](#projectinfobar)
- [Navigation-Komponenten](#navigation-komponenten)
  - [TabNavigation](#tabnavigation)
- [Tab-Content-Komponenten](#tab-content-komponenten)
  - [OverviewTabContent](#overviewtabcontent)
  - [TasksTabContent](#taskstabcontent)
  - [StrategieTabContent](#strategietabcontent)
  - [DatenTabContent](#datentabcontent)
  - [PressemeldungTabContent](#pressemeldungtabcontent)
  - [VerteilerTabContent](#verteilertabcontent)
  - [MonitoringTabContent](#monitoringtabcontent)
- [Shared-Komponenten](#shared-komponenten)
  - [LoadingState](#loadingstate)
  - [ErrorState](#errorstate)
  - [ErrorBoundary](#errorboundary)
- [Common Patterns](#common-patterns)
- [Performance-Tipps](#performance-tipps)
- [Testing](#testing)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Die Project Detail Page besteht aus **14 modularen Komponenten**, die in 4 Kategorien organisiert sind:

### Komponenten-Übersicht

| Kategorie | Komponenten | Beschreibung |
|-----------|-------------|--------------|
| **Header** | `ProjectHeader`, `ProjectInfoBar` | Projekt-Kopfbereich mit Titel, Status, Team, Kunde, Tags |
| **Navigation** | `TabNavigation` | 7 Tab-Buttons für Inhaltsbereiche |
| **Tab-Content** | 7x `*TabContent` | Modulare Content-Bereiche für jeden Tab |
| **Shared** | `LoadingState`, `ErrorState`, `ErrorBoundary` | Wiederverwendbare UI-States |

### Architektur-Prinzipien

✅ **Single Responsibility**: Jede Komponente hat genau eine Aufgabe
✅ **Context-Aware**: Alle verwenden `useProject()` für globalen State
✅ **React.memo**: Performance-Optimierung durch Memoization
✅ **TypeScript**: Vollständige Type-Safety
✅ **Barrel Exports**: Saubere Import-Struktur

---

## Komponenten-Kategorien

### Dateistruktur

```
components/
├── header/
│   ├── index.ts                  # Barrel Export
│   ├── ProjectHeader.tsx         # 255 Zeilen
│   └── ProjectInfoBar.tsx        # 141 Zeilen
│
├── tabs/
│   ├── index.ts
│   └── TabNavigation.tsx         # 79 Zeilen
│
├── tab-content/
│   ├── index.ts
│   ├── OverviewTabContent.tsx    # 169 Zeilen
│   ├── TasksTabContent.tsx       # 34 Zeilen
│   ├── StrategieTabContent.tsx   # 52 Zeilen
│   ├── DatenTabContent.tsx       # 48 Zeilen
│   ├── PressemeldungTabContent.tsx  # 27 Zeilen
│   ├── VerteilerTabContent.tsx   # 27 Zeilen
│   └── MonitoringTabContent.tsx  # 17 Zeilen
│
└── shared/
    ├── index.ts
    ├── LoadingState.tsx          # 26 Zeilen
    ├── ErrorState.tsx            # 39 Zeilen
    └── ErrorBoundary.tsx         # 67 Zeilen
```

**Gesamt**: ~980 Zeilen in Komponenten (+ 815 Zeilen in page.tsx)

---

## Header-Komponenten

### ProjectHeader

**Datei**: `components/header/ProjectHeader.tsx`

**Beschreibung**: Zeigt Projekt-Kopfzeile mit Titel, Status, Team-Avataren und Aktions-Buttons.

**Props**:

```typescript
interface ProjectHeaderProps {
  teamMembers: TeamMember[];
  onEditClick: () => void;
  onTeamManageClick: () => void;
  onDeleteClick: () => void;
}
```

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `teamMembers` | `TeamMember[]` | ✅ | Alle Team-Mitglieder der Organisation |
| `onEditClick` | `() => void` | ✅ | Callback für Edit-Button |
| `onTeamManageClick` | `() => void` | ✅ | Callback für "Team verwalten" |
| `onDeleteClick` | `() => void` | ✅ | Callback für "Projekt löschen" |

**Context-Verwendung**:

```typescript
const { project } = useProject();
```

**Features**:

- ✅ Zurück-Button zu Projektliste
- ✅ Projekt-Titel + Status-Badge
- ✅ Erstellt-Datum
- ✅ Team-Avatare (max. 5, dann "+X weitere")
- ✅ Bearbeiten-Button
- ✅ Dropdown mit Team-Verwaltung und Löschen

**Verwendung**:

```typescript
import { ProjectHeader } from './components/header';

<ProjectHeader
  teamMembers={teamMembers}
  onEditClick={() => setShowEditWizard(true)}
  onTeamManageClick={() => setShowTeamModal(true)}
  onDeleteClick={handleDeleteProject}
/>
```

**Code-Beispiel (vereinfacht)**:

```typescript
export const ProjectHeader = React.memo(function ProjectHeader({
  teamMembers,
  onEditClick,
  onTeamManageClick,
  onDeleteClick,
}: ProjectHeaderProps) {
  const { project } = useProject();

  if (!project) return null;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        {/* Links: Titel + Status */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard/projects">
            <Button plain className="p-2">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>

          <Heading className="!text-2xl">{project.title}</Heading>

          <Badge color={getProjectStatusColor(project.status)}>
            {getProjectStatusLabel(project.status)}
          </Badge>

          <span className="text-sm text-gray-500">
            Erstellt: {formatProjectDate(project.createdAt)}
          </span>
        </div>

        {/* Rechts: Team + Aktionen */}
        <div className="flex items-center space-x-4">
          {/* Team-Avatare */}
          {project.assignedTo && project.assignedTo.length > 0 && (
            <div className="flex items-center -space-x-2">
              {/* Avatar-Rendering mit Deduplizierung */}
            </div>
          )}

          <Button onClick={onEditClick} color="secondary">
            <PencilSquareIcon className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Bearbeiten</span>
          </Button>

          <Dropdown>
            <DropdownButton plain>
              <EllipsisVerticalIcon className="w-5 h-5" />
            </DropdownButton>
            <DropdownMenu anchor="bottom end">
              <DropdownItem onClick={onTeamManageClick}>
                <UserGroupIcon className="w-4 h-4 mr-2" />
                Team verwalten
              </DropdownItem>
              <DropdownItem onClick={onDeleteClick} className="text-red-600">
                <TrashIcon className="w-4 h-4 mr-2" />
                Projekt löschen
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
});
```

**Helper-Funktionen**:

```typescript
// Status-Farbe
const getProjectStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green';
    case 'on_hold': return 'yellow';
    case 'completed': return 'blue';
    case 'cancelled': return 'red';
    default: return 'zinc';
  }
};

// Status-Label
const getProjectStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'on_hold': return 'Pausiert';
    case 'completed': return 'Abgeschlossen';
    case 'cancelled': return 'Abgebrochen';
    default: return status;
  }
};

// Datum formatieren
const formatProjectDate = (date: any): string => {
  try {
    if (!date) return '-';
    if (date && typeof date === 'object' && date.toDate) {
      return formatDate(date.toDate());
    }
    if (date && typeof date === 'object' && date.seconds) {
      return formatDate(new Date(date.seconds * 1000));
    }
    if (date instanceof Date) {
      return formatDate(date);
    }
    if (typeof date === 'string') {
      return formatDate(new Date(date));
    }
    return '-';
  } catch (error) {
    console.error('Fehler beim Formatieren des Datums:', error);
    return '-';
  }
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unbekannt';
  try {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Ungültiges Datum';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return 'Datumsformatfehler';
  }
};
```

**Performance**: `React.memo` verhindert Re-Renders bei gleichen Props

---

### ProjectInfoBar

**Datei**: `components/header/ProjectInfoBar.tsx`

**Beschreibung**: Kompakte Info-Zeile unter dem Header mit Phase, Kunde, Priorität, Deadline, Tags.

**Props**:

```typescript
interface ProjectInfoBarProps {
  projectTags: Tag[];
}
```

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `projectTags` | `Tag[]` | ✅ | Geladene Tags für dieses Projekt |

**Context-Verwendung**:

```typescript
const { project } = useProject();
```

**Features**:

- ✅ Phase-Anzeige (z.B. "Ideen & Planung")
- ✅ Kunde mit Link zur Firmen-Detailseite
- ✅ Priorität-Badge (Hoch/Mittel/Niedrig)
- ✅ Deadline (falls vorhanden)
- ✅ Tags (max. 3 angezeigt, dann "+X")

**Verwendung**:

```typescript
import { ProjectInfoBar } from './components/header';

<ProjectInfoBar projectTags={projectTags} />
```

**Code-Beispiel**:

```typescript
export const ProjectInfoBar = React.memo(function ProjectInfoBar({ projectTags }: ProjectInfoBarProps) {
  const router = useRouter();
  const { project } = useProject();

  if (!project) return null;

  return (
    <>
      {/* Trennlinie */}
      <div className="border-t border-gray-200 mt-4 mb-3"></div>

      {/* Info-Zeile */}
      <div className="flex items-center flex-wrap gap-8 text-sm text-gray-600">
        {/* Phase */}
        <div className="flex items-center gap-1.5">
          <Squares2X2Icon className="w-4 h-4 text-gray-400" />
          <span className="font-medium">Phase:</span>
          <span className="text-gray-900">{getStageLabel(project.currentStage)}</span>
        </div>

        {/* Kunde */}
        {project.customer && (
          <div className="flex items-center gap-1.5">
            <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Kunde:</span>
            <button
              className="text-primary hover:text-primary-hover hover:underline text-sm"
              onClick={() => router.push(`/dashboard/contacts/crm/companies/${project.customer?.id}`)}
            >
              {project.customer.name}
            </button>
          </div>
        )}

        {/* Priorität */}
        <div className="flex items-center gap-1.5">
          <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
          <span className="font-medium">Priorität:</span>
          <Badge
            color={project.priority === 'high' ? 'red' : project.priority === 'medium' ? 'yellow' : 'zinc'}
            className="!py-0.5 !text-xs"
          >
            {project.priority === 'high' ? 'Hoch' : project.priority === 'medium' ? 'Mittel' : 'Niedrig'}
          </Badge>
        </div>

        {/* Deadline */}
        {project.deadline && (
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Deadline:</span>
            <span className="text-gray-900">
              {project.deadline?.toDate().toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        )}

        {/* Tags */}
        {projectTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <TagIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Tags:</span>
            <div className="flex items-center gap-1">
              {projectTags.slice(0, 3).map(tag => (
                <Badge key={tag.id} color={tag.color || 'zinc'} className="!py-0.5 !text-xs">
                  {tag.name}
                </Badge>
              ))}
              {projectTags.length > 3 && (
                <span className="text-xs text-gray-500">+{projectTags.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
});
```

**Helper-Funktion**:

```typescript
const getStageLabel = (stage: string) => {
  switch (stage) {
    case 'ideas_planning': return 'Ideen & Planung';
    case 'creation': return 'Content und Materialien';
    case 'approval': return 'Freigabe';
    case 'distribution': return 'Verteilung';
    case 'monitoring': return 'Monitoring';
    case 'completed': return 'Abgeschlossen';
    default: return stage;
  }
};
```

---

## Navigation-Komponenten

### TabNavigation

**Datei**: `components/tabs/TabNavigation.tsx`

**Beschreibung**: 7 Tab-Buttons für die verschiedenen Inhaltsbereiche.

**Props**:

```typescript
interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

type TabType = 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring';
```

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `activeTab` | `TabType` | ✅ | Aktuell aktiver Tab |
| `onTabChange` | `(tab: TabType) => void` | ✅ | Callback bei Tab-Wechsel |

**Features**:

- ✅ 7 Tabs mit Icons und Labels
- ✅ Active-State mit Primary-Farbe und Border-Bottom
- ✅ Hover-State
- ✅ Responsive (Icons + Text)

**Verwendung**:

```typescript
import { TabNavigation } from './components/tabs';

const [activeTab, setActiveTab] = useState<TabType>('overview');

<TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
```

**Code-Beispiel**:

```typescript
const tabs: Tab[] = [
  { id: 'overview', label: 'Übersicht', icon: DocumentTextIcon },
  { id: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon },
  { id: 'strategie', label: 'Strategie', icon: DocumentTextIcon },
  { id: 'daten', label: 'Daten', icon: FolderOpenIcon },
  { id: 'verteiler', label: 'Verteiler', icon: UsersIcon },
  { id: 'pressemeldung', label: 'Pressemeldung', icon: DocumentTextIcon },
  { id: 'monitoring', label: 'Monitoring', icon: ChartBarIcon },
];

export const TabNavigation = React.memo(function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center pb-2 text-sm font-medium ${
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
```

**Styling**:

- **Active**: `text-primary border-b-2 border-primary`
- **Inactive**: `text-gray-500 hover:text-gray-700`
- **Icon**: `w-4 h-4 mr-2`

---

## Tab-Content-Komponenten

### OverviewTabContent

**Datei**: `components/tab-content/OverviewTabContent.tsx`

**Beschreibung**: Übersicht-Tab mit Pipeline-Dashboard, Today-Tasks und Projekt-Guide.

**Props**:

```typescript
interface OverviewTabContentProps {
  project: Project;
  currentOrganization: any;
  todayTasks: ProjectTask[];
  loadingTodayTasks: boolean;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  completedGuideSteps: string[];
  onStepToggle: (stepId: string) => Promise<void>;
  onNavigateToTasks: () => void;
}
```

**Features**:

- ✅ Pipeline-Fortschritt-Dashboard
- ✅ Heute fällige Tasks (nur für aktuellen User)
- ✅ Projekt-Leitfaden (Checklist)

**Code-Beispiel**:

```typescript
export function OverviewTabContent({
  project,
  currentOrganization,
  todayTasks,
  loadingTodayTasks,
  user,
  completedGuideSteps,
  onStepToggle,
  onNavigateToTasks
}: OverviewTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Pipeline-Fortschritt */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Squares2X2Icon className="h-5 w-5 text-primary mr-2" />
          <Subheading>Pipeline-Übersicht</Subheading>
        </div>
        <PipelineProgressDashboard />
      </div>

      {/* Heute fällige Tasks */}
      {todayTasks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Tasks-Liste */}
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                {/* Task-Rendering */}
              </div>
            ))}
          </div>

          {/* Link zu Tasks-Tab */}
          <button onClick={onNavigateToTasks} className="text-primary hover:text-primary-hover">
            Alle Tasks anzeigen →
          </button>
        </div>
      )}

      {/* Projekt-Guide */}
      <ProjectGuideBox
        completedSteps={completedGuideSteps}
        onStepToggle={onStepToggle}
      />
    </div>
  );
}
```

---

### TasksTabContent

**Datei**: `components/tab-content/TasksTabContent.tsx`

**Beschreibung**: Tasks-Tab mit vollständigem Task-Manager.

**Props**:

```typescript
interface TasksTabContentProps {
  project: Project;
  organizationId: string;
  teamMembers: TeamMember[];
}
```

**Code-Beispiel**:

```typescript
export function TasksTabContent({ project, organizationId, teamMembers }: TasksTabContentProps) {
  return (
    <div className="space-y-6">
      <ProjectTaskManager
        projectId={project.id!}
        organizationId={organizationId}
        projectManagerId={project.projectManager || project.userId}
        teamMembers={teamMembers}
        projectTeamMemberIds={project.assignedTo}
        projectTitle={project.title}
      />
    </div>
  );
}
```

---

### StrategieTabContent

**Datei**: `components/tab-content/StrategieTabContent.tsx`

**Beschreibung**: Strategie-Tab mit Strategie-Dokumenten und Dokumente-Ordner.

**Props**:

```typescript
interface StrategieTabContentProps {
  project: Project;
  organizationId: string;
  dokumenteFolder: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
}
```

**Features**:

- ✅ Strategie-Dokumente (Templates, Editor)
- ✅ Dokumente-Ordner (nur "Dokumente"-Unterordner)

**Code-Beispiel**:

```typescript
export function StrategieTabContent({
  project,
  organizationId,
  dokumenteFolder,
  foldersLoading,
  onRefresh
}: StrategieTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Strategie-Templates */}
      <ProjectStrategyTab
        projectId={project.id!}
        organizationId={organizationId}
        project={project}
        dokumenteFolderId={dokumenteFolder?.mainFolder?.id}
        onDocumentSaved={onRefresh}
      />

      {/* Dokumente-Ordner */}
      {dokumenteFolder && (
        <ProjectFoldersView
          projectId={project.id!}
          organizationId={organizationId}
          projectFolders={dokumenteFolder}
          foldersLoading={foldersLoading}
          onRefresh={onRefresh}
          filterByFolder="Dokumente"
          initialFolderId={dokumenteFolder.mainFolder?.id}
        />
      )}
    </div>
  );
}
```

---

### DatenTabContent

**Datei**: `components/tab-content/DatenTabContent.tsx`

**Beschreibung**: Daten-Tab mit allen Projekt-Ordnern.

**Props**:

```typescript
interface DatenTabContentProps {
  project: Project;
  organizationId: string;
  projectFolders: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
}
```

**Code-Beispiel**:

```typescript
export function DatenTabContent({
  project,
  organizationId,
  projectFolders,
  foldersLoading,
  onRefresh
}: DatenTabContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={3}>Projektdaten verwalten</Heading>
        <Text className="text-gray-500 mt-1">
          Organisieren Sie alle Projektdateien und Dokumente zentral
        </Text>
      </div>

      <ProjectFoldersView
        projectId={project.id!}
        organizationId={organizationId}
        projectFolders={projectFolders}
        foldersLoading={foldersLoading}
        onRefresh={onRefresh}
        filterByFolder="all"
      />
    </div>
  );
}
```

---

### PressemeldungTabContent

**Datei**: `components/tab-content/PressemeldungTabContent.tsx`

**Beschreibung**: Wrapper für Pressemeldungen-Komponente.

**Props**:

```typescript
interface PressemeldungTabContentProps {
  project: Project;
  organizationId: string;
}
```

**Code-Beispiel**:

```typescript
export function PressemeldungTabContent({ project, organizationId }: PressemeldungTabContentProps) {
  return (
    <div className="space-y-6">
      <ProjectPressemeldungenTab
        projectId={project.id!}
        organizationId={organizationId}
      />
    </div>
  );
}
```

---

### VerteilerTabContent

**Datei**: `components/tab-content/VerteilerTabContent.tsx`

**Beschreibung**: Wrapper für Distribution-Lists-Komponente.

**Props**:

```typescript
interface VerteilerTabContentProps {
  project: Project;
  organizationId: string;
}
```

**Code-Beispiel**:

```typescript
export function VerteilerTabContent({ project, organizationId }: VerteilerTabContentProps) {
  return (
    <div className="space-y-6">
      <ProjectDistributionLists
        projectId={project.id!}
        organizationId={organizationId}
      />
    </div>
  );
}
```

---

### MonitoringTabContent

**Datei**: `components/tab-content/MonitoringTabContent.tsx`

**Beschreibung**: Wrapper für Monitoring/Analytics-Komponente.

**Props**:

```typescript
interface MonitoringTabContentProps {
  projectId: string;
}
```

**Code-Beispiel**:

```typescript
export function MonitoringTabContent({ projectId }: MonitoringTabContentProps) {
  return <ProjectMonitoringTab projectId={projectId} />;
}
```

---

## Shared-Komponenten

### LoadingState

**Datei**: `components/shared/LoadingState.tsx`

**Beschreibung**: Zentrierter Loading-Spinner mit Nachricht.

**Props**:

```typescript
interface LoadingStateProps {
  message?: string;
}
```

| Prop | Typ | Required | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| `message` | `string` | ❌ | `"Projekt wird geladen..."` | Loading-Nachricht |

**Code-Beispiel**:

```typescript
export function LoadingState({ message = 'Projekt wird geladen...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">{message}</Text>
    </div>
  );
}
```

**Verwendung**:

```typescript
import { LoadingState } from './components/shared';

if (loading) {
  return <LoadingState message="Daten werden geladen..." />;
}
```

---

### ErrorState

**Datei**: `components/shared/ErrorState.tsx`

**Beschreibung**: Error-Message mit Icon und Zurück-Button.

**Props**:

```typescript
interface ErrorStateProps {
  message?: string;
}
```

| Prop | Typ | Required | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| `message` | `string` | ❌ | `"Projekt nicht gefunden"` | Fehlermeldung |

**Code-Beispiel**:

```typescript
export function ErrorState({ message = 'Projekt nicht gefunden' }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 mb-4">
        <DocumentTextIcon className="h-12 w-12 mx-auto" />
      </div>
      <Heading>{message}</Heading>
      <div className="mt-6">
        <Link href="/dashboard/projects">
          <Button>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Zurück zur Projektübersicht
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**Verwendung**:

```typescript
import { ErrorState } from './components/shared';

if (error) {
  return <ErrorState message={error} />;
}

if (!project) {
  return <ErrorState message="Projekt nicht gefunden" />;
}
```

---

### ErrorBoundary

**Datei**: `components/shared/ErrorBoundary.tsx`

**Beschreibung**: React Error Boundary - fängt JavaScript-Fehler in Child-Komponenten.

**Props**:

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
```

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `children` | `ReactNode` | ✅ | Child-Komponenten |
| `fallback` | `ReactNode` | ❌ | Custom Error-UI (optional) |

**State**:

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
```

**Code-Beispiel**:

```typescript
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
          </div>
          <Heading>Ein Fehler ist aufgetreten</Heading>
          <p className="text-gray-500 mt-2">{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Seite neu laden
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Verwendung**:

```typescript
import { ErrorBoundary } from './components/shared';

<ErrorBoundary>
  <MyComponent /> {/* Fehler in MyComponent crashen nicht die ganze App */}
</ErrorBoundary>

// Mit custom Fallback
<ErrorBoundary fallback={<div>Custom Error UI</div>}>
  <MyComponent />
</ErrorBoundary>
```

---

## Common Patterns

### 1. Tab-Content Pattern

Alle Tab-Content-Komponenten folgen diesem Pattern:

```typescript
// components/tab-content/MyTabContent.tsx
'use client';

import React from 'react';
import { Project } from '@/types/project';

interface MyTabContentProps {
  project: Project;
  organizationId: string;
  // ... weitere Props
}

export function MyTabContent({ project, organizationId }: MyTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Content hier */}
    </div>
  );
}
```

**Konventionen**:

- ✅ `'use client'` am Anfang
- ✅ Props-Interface mit `Props`-Suffix
- ✅ Wrapper `<div className="space-y-6">` für vertikales Spacing
- ✅ Keine direkten DB-Calls (über Props von page.tsx)

### 2. Context-Verwendung Pattern

Komponenten mit Context folgen diesem Pattern:

```typescript
// components/header/MyComponent.tsx
'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';

interface MyComponentProps {
  // Nur Callbacks und component-spezifische Daten
  onAction: () => void;
}

export const MyComponent = React.memo(function MyComponent({ onAction }: MyComponentProps) {
  // Context für globale Daten
  const { project, organizationId, projectId } = useProject();

  // Guard
  if (!project) return null;

  // Render
  return <div>{project.title}</div>;
});
```

**Konventionen**:

- ✅ `React.memo` für Performance
- ✅ `useProject()` für globale Daten
- ✅ Props nur für Callbacks und component-spezifische Daten
- ✅ Guard `if (!project) return null;`

### 3. Barrel Export Pattern

Jedes Komponenten-Verzeichnis hat eine `index.ts`:

```typescript
// components/header/index.ts
export { ProjectHeader } from './ProjectHeader';
export { ProjectInfoBar } from './ProjectInfoBar';

// components/tab-content/index.ts
export { OverviewTabContent } from './OverviewTabContent';
export { TasksTabContent } from './TasksTabContent';
// ... weitere Exports
```

**Verwendung**:

```typescript
// ✅ Saubere Imports
import { ProjectHeader, ProjectInfoBar } from './components/header';
import { OverviewTabContent, TasksTabContent } from './components/tab-content';

// ❌ Ohne Barrel Exports
import { ProjectHeader } from './components/header/ProjectHeader';
import { ProjectInfoBar } from './components/header/ProjectInfoBar';
```

---

## Performance-Tipps

### 1. React.memo verwenden

```typescript
// ✅ DO: React.memo für teure Komponenten
export const ProjectHeader = React.memo(function ProjectHeader({ ... }) {
  // Verhindert Re-Render bei gleichen Props
});

// ❌ DON'T: Ohne Memoization
export function ProjectHeader({ ... }) {
  // Re-rendert bei jedem Parent-Render
}
```

### 2. useCallback für Callbacks

```typescript
// page.tsx
const handleEditSuccess = useCallback((updatedProject: Project) => {
  setProject(updatedProject);
  toastService.success('Projekt erfolgreich aktualisiert');
}, []); // Stabile Referenz

<ProjectHeader onEditSuccess={handleEditSuccess} />
```

### 3. Conditional Rendering

```typescript
// ✅ DO: Conditional Rendering statt Display-None
{activeTab === 'tasks' && <TasksTabContent />}

// ❌ DON'T: Alle Tabs rendern (Performance-Problem)
<div style={{ display: activeTab === 'tasks' ? 'block' : 'none' }}>
  <TasksTabContent />
</div>
```

---

## Testing

### Component Test Beispiel

```typescript
// __tests__/unit/ProjectHeader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectProvider } from '../../context/ProjectContext';
import { ProjectHeader } from '../../components/header/ProjectHeader';

const mockProject = {
  id: 'project-123',
  title: 'Test Project',
  status: 'active',
  // ...
};

describe('ProjectHeader', () => {
  it('should render project title', () => {
    render(
      <ProjectProvider projectId="123" organizationId="org-123" initialProject={mockProject}>
        <ProjectHeader
          teamMembers={[]}
          onEditClick={jest.fn()}
          onTeamManageClick={jest.fn()}
          onDeleteClick={jest.fn()}
        />
      </ProjectProvider>
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should call onEditClick when edit button is clicked', () => {
    const mockOnEdit = jest.fn();

    render(
      <ProjectProvider projectId="123" organizationId="org-123" initialProject={mockProject}>
        <ProjectHeader
          teamMembers={[]}
          onEditClick={mockOnEdit}
          onTeamManageClick={jest.fn()}
          onDeleteClick={jest.fn()}
        />
      </ProjectProvider>
    );

    fireEvent.click(screen.getByText('Bearbeiten'));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });
});
```

---

## Siehe auch

- **[Hauptdokumentation](../README.md)**: Übersicht über das gesamte Refactoring
- **[API-Referenz](../api/README.md)**: ProjectContext API
- **[ADR](../adr/README.md)**: Architecture Decision Records
- **[CeleroPress Design System](../../../design-system/DESIGN_SYSTEM.md)**: UI-Guidelines

---

**Letzte Aktualisierung**: 21. Oktober 2025
**Maintainer**: Development Team

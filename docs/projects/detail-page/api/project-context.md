# ProjectContext - Detaillierte API-Referenz

> **Modul**: ProjectContext
> **Datei**: `src/app/dashboard/projects/[projectId]/context/ProjectContext.tsx`
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 21. Oktober 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Funktions-Referenz](#funktions-referenz)
  - [useProject](#useproject)
  - [ProjectProvider](#projectprovider)
- [Vollständige Code-Beispiele](#vollständige-code-beispiele)
  - [Setup in page.tsx](#setup-in-pagetsx)
  - [Verwendung in Child-Komponenten](#verwendung-in-child-komponenten)
  - [Projekt aktualisieren](#projekt-aktualisieren)
  - [Tab-Navigation](#tab-navigation)
  - [Error Handling](#error-handling)
- [Performance-Hinweise](#performance-hinweise)
- [Testing](#testing)
- [Häufige Fehler](#häufige-fehler)
- [Migration](#migration)

---

## Übersicht

Der **ProjectContext** ist ein React Context, der alle projekt-relevanten Daten und Funktionen zentralisiert bereitstellt. Er eliminiert Props-Drilling und vereinfacht die Komponenten-Architektur.

### Architektur

```
page.tsx
  └─ ProjectProvider (wraps all)
      ├─ creates Context value (useMemo)
      ├─ manages state (useState)
      └─ provides to children
          ├─ ProjectHeader (useProject)
          ├─ ProjectInfoBar (useProject)
          ├─ TabNavigation (useProject)
          └─ Tab Contents (useProject)
```

### Performance

- ✅ **useMemo**: Context Value wird gecacht, nur neu berechnet bei Änderungen
- ✅ **useCallback**: `reloadProject` hat stabile Referenz
- ✅ **React.memo**: Konsumenten mit `React.memo` re-rendern nur bei tatsächlichen Änderungen

---

## Funktions-Referenz

### useProject

**Signatur**:

```typescript
function useProject(): ProjectContextValue
```

**Parameter**: Keine

**Rückgabe**:

```typescript
interface ProjectContextValue {
  project: Project | null;
  setProject: (project: Project | null) => void;
  projectId: string;
  organizationId: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  reloadProject: () => Promise<void>;
}
```

**Throws**:

```typescript
Error: 'useProject must be used within a ProjectProvider'
```

**Beschreibung**:

Custom Hook zum Zugriff auf den ProjectContext. Muss innerhalb einer Komponente verwendet werden, die von `<ProjectProvider>` gewrappt ist.

**Vollständiges Code-Beispiel**:

```typescript
import { useProject } from '../../context/ProjectContext';

export function MyComponent() {
  // Destrukturiere alle benötigten Werte
  const {
    project,           // Project | null
    setProject,        // (project: Project | null) => void
    projectId,         // string
    organizationId,    // string
    activeTab,         // TabType
    setActiveTab,      // (tab: TabType) => void
    loading,           // boolean
    setLoading,        // (loading: boolean) => void
    error,             // string | null
    setError,          // (error: string | null) => void
    reloadProject      // () => Promise<void>
  } = useProject();

  // Guards für States
  if (loading) {
    return <LoadingState message="Lädt..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!project) {
    return <div>Kein Projekt geladen</div>;
  }

  // Normale Komponenten-Logik
  return (
    <div>
      <h1>{project.title}</h1>
      <p>Projekt-ID: {projectId}</p>
      <p>Organisation: {organizationId}</p>

      <button onClick={() => setActiveTab('tasks')}>
        Zu Tasks
      </button>

      <button onClick={async () => {
        setLoading(true);
        try {
          await reloadProject();
        } finally {
          setLoading(false);
        }
      }}>
        Neu laden
      </button>
    </div>
  );
}
```

**Error Cases**:

```typescript
// ❌ FEHLER: Außerhalb von Provider
export function BadComponent() {
  const { project } = useProject(); // WIRFT ERROR!
  return <div>{project?.title}</div>;
}

// ✅ RICHTIG: Innerhalb von Provider
export default function GoodPage() {
  return (
    <ProjectProvider projectId="123" organizationId="org-123">
      <GoodComponent /> {/* useProject() funktioniert */}
    </ProjectProvider>
  );
}

export function GoodComponent() {
  const { project } = useProject(); // OK
  return <div>{project?.title}</div>;
}
```

---

### ProjectProvider

**Signatur**:

```typescript
function ProjectProvider(props: ProjectProviderProps): JSX.Element

interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
  organizationId: string;
  initialProject?: Project | null;
  onReload?: () => Promise<void>;
}
```

**Props**:

#### children

```typescript
children: ReactNode
```

- **Required**: ✅ Ja
- **Typ**: `ReactNode`
- **Beschreibung**: Alle Child-Komponenten, die Zugriff auf den Context benötigen

**Beispiel**:

```typescript
<ProjectProvider {...props}>
  <ProjectHeader />
  <ProjectInfoBar />
  <TabNavigation />
  {/* Alle diese Komponenten können useProject() nutzen */}
</ProjectProvider>
```

#### projectId

```typescript
projectId: string
```

- **Required**: ✅ Ja
- **Typ**: `string`
- **Beschreibung**: Projekt-ID aus der URL (read-only für Konsumenten)
- **Quelle**: `useParams().projectId`

**Beispiel**:

```typescript
const params = useParams();
const projectId = params.projectId as string;

<ProjectProvider projectId={projectId} {...otherProps}>
  {/* ... */}
</ProjectProvider>
```

#### organizationId

```typescript
organizationId: string
```

- **Required**: ✅ Ja
- **Typ**: `string`
- **Beschreibung**: Organisations-ID (für Multi-Tenancy)
- **Quelle**: `useOrganization().currentOrganization.id`

**Beispiel**:

```typescript
const { currentOrganization } = useOrganization();

<ProjectProvider
  projectId={projectId}
  organizationId={currentOrganization?.id || ''}
  {...otherProps}
>
  {/* ... */}
</ProjectProvider>
```

#### initialProject (optional)

```typescript
initialProject?: Project | null
```

- **Required**: ❌ Nein (Default: `null`)
- **Typ**: `Project | null`
- **Beschreibung**: Initial-Projekt-Daten (z.B. aus Server-Fetch)

**Beispiel**:

```typescript
const [project, setProject] = useState<Project | null>(null);

useEffect(() => {
  loadProject(); // setzt `project` State
}, [projectId]);

<ProjectProvider
  projectId={projectId}
  organizationId={organizationId}
  initialProject={project} // Wird in Context initial gesetzt
>
  {/* ... */}
</ProjectProvider>
```

#### onReload (optional)

```typescript
onReload?: () => Promise<void>
```

- **Required**: ❌ Nein
- **Typ**: `() => Promise<void>`
- **Beschreibung**: Callback zum Neu-Laden des Projekts (wird von `reloadProject()` aufgerufen)

**Beispiel**:

```typescript
const loadProject = async () => {
  const data = await projectService.getById(projectId, {
    organizationId
  });
  setProject(data);
};

<ProjectProvider
  projectId={projectId}
  organizationId={organizationId}
  initialProject={project}
  onReload={loadProject} // Wird von reloadProject() aufgerufen
>
  {/* ... */}
</ProjectProvider>
```

**Vollständiges Setup-Beispiel**:

```typescript
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = async () => {
    if (!projectId || !currentOrganization?.id) return;

    try {
      setLoading(true);
      setError(null);

      const projectData = await projectService.getById(projectId, {
        organizationId: currentOrganization.id
      });

      if (projectData) {
        setProject(projectData);
      } else {
        setError('Projekt nicht gefunden');
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des Projekts:', error);
      setError('Projekt konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentOrganization?.id) return;
    loadProject();
  }, [projectId, currentOrganization?.id]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !project) {
    return <ErrorState message={error || 'Projekt nicht gefunden'} />;
  }

  return (
    <ProjectProvider
      projectId={projectId}
      organizationId={currentOrganization?.id || ''}
      initialProject={project}
      onReload={loadProject}
    >
      <div>
        <ProjectHeader />
        <ProjectInfoBar />
        <TabNavigation />
        {/* Tab Contents */}
      </div>
    </ProjectProvider>
  );
}
```

---

## Vollständige Code-Beispiele

### Setup in page.tsx

```typescript
// src/app/dashboard/projects/[projectId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { projectService } from '@/lib/firebase/project-service';
import { Project } from '@/types/project';
import { ProjectProvider } from './context/ProjectContext';
import { ProjectHeader, ProjectInfoBar } from './components/header';
import { TabNavigation } from './components/tabs';
import { LoadingState, ErrorState } from './components/shared';
import {
  OverviewTabContent,
  TasksTabContent,
  StrategieTabContent,
  DatenTabContent,
  PressemeldungTabContent,
  VerteilerTabContent,
  MonitoringTabContent
} from './components/tab-content';

export default function ProjectDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;

  // State Management
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | ...>('overview');

  // Load Project
  const loadProject = async () => {
    if (!projectId || !currentOrganization?.id) return;

    try {
      setLoading(true);
      setError(null);

      const projectData = await projectService.getById(projectId, {
        organizationId: currentOrganization.id
      });

      if (projectData) {
        setProject(projectData);
      } else {
        setError('Projekt nicht gefunden');
      }
    } catch (error: any) {
      setError('Projekt konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentOrganization?.id) return;
    loadProject();
  }, [projectId, currentOrganization?.id]);

  // Guards
  if (loading) return <LoadingState />;
  if (error || !project) return <ErrorState message={error || 'Projekt nicht gefunden'} />;

  // Render with Provider
  return (
    <ProjectProvider
      projectId={projectId}
      organizationId={currentOrganization?.id || ''}
      initialProject={project}
      onReload={loadProject}
    >
      <div>
        {/* Header */}
        <ProjectHeader
          teamMembers={teamMembers}
          onEditClick={() => setShowEditWizard(true)}
          onTeamManageClick={() => setShowTeamModal(true)}
          onDeleteClick={handleDeleteProject}
        />
        <ProjectInfoBar projectTags={projectTags} />

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTabContent {...props} />}
            {activeTab === 'tasks' && <TasksTabContent {...props} />}
            {/* ... weitere Tabs */}
          </div>
        </div>
      </div>
    </ProjectProvider>
  );
}
```

### Verwendung in Child-Komponenten

```typescript
// components/header/ProjectHeader.tsx
'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';

interface ProjectHeaderProps {
  teamMembers: TeamMember[];
  onEditClick: () => void;
  onTeamManageClick: () => void;
  onDeleteClick: () => void;
}

export const ProjectHeader = React.memo(function ProjectHeader({
  teamMembers,
  onEditClick,
  onTeamManageClick,
  onDeleteClick,
}: ProjectHeaderProps) {
  // Hole project aus Context (kein Props-Drilling!)
  const { project } = useProject();

  if (!project) return null;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Heading>{project.title}</Heading>
          <Badge color={getProjectStatusColor(project.status)}>
            {getProjectStatusLabel(project.status)}
          </Badge>
        </div>

        <div className="flex items-center space-x-4">
          {/* Team-Avatare */}
          {project.assignedTo && project.assignedTo.length > 0 && (
            <div className="flex items-center -space-x-2">
              {/* Avatar-Rendering */}
            </div>
          )}

          <Button onClick={onEditClick}>Bearbeiten</Button>
          <Dropdown>
            <DropdownItem onClick={onTeamManageClick}>Team verwalten</DropdownItem>
            <DropdownItem onClick={onDeleteClick}>Löschen</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </div>
  );
});
```

### Projekt aktualisieren

```typescript
// components/ProjectTitleEditor.tsx
'use client';

import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/lib/firebase/project-service';
import { toastService } from '@/lib/utils/toast';

export function ProjectTitleEditor() {
  const { user } = useAuth();
  const { project, setProject, organizationId, reloadProject } = useProject();
  const [title, setTitle] = useState(project?.title || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!project?.id || !user?.uid) return;

    setSaving(true);

    try {
      // 1. Update in Firebase
      await projectService.update(project.id, { title }, {
        organizationId,
        userId: user.uid
      });

      // 2. Optimistic Update in Context
      setProject({ ...project, title });

      // 3. Erfolgs-Toast
      toastService.success('Titel erfolgreich aktualisiert');

      // 4. Optional: Reload für vollständige Konsistenz
      await reloadProject();
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      toastService.error(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-1">
          Projekt-Titel
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full rounded-lg border border-zinc-300 px-3 py-2"
          disabled={saving}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || title === project?.title}
        className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {saving ? 'Speichert...' : 'Titel speichern'}
      </button>
    </div>
  );
}
```

### Tab-Navigation

```typescript
// components/QuickActions.tsx
'use client';

import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const { activeTab, setActiveTab } = useProject();

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => setActiveTab('tasks')}
        color={activeTab === 'tasks' ? 'primary' : 'secondary'}
      >
        Tasks anzeigen
      </Button>

      <Button
        onClick={() => setActiveTab('strategie')}
        color={activeTab === 'strategie' ? 'primary' : 'secondary'}
      >
        Strategie-Dokumente
      </Button>

      <Button
        onClick={() => setActiveTab('monitoring')}
        color={activeTab === 'monitoring' ? 'primary' : 'secondary'}
      >
        Analytics
      </Button>
    </div>
  );
}
```

### Error Handling

```typescript
// components/ProjectDeletion.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '../context/ProjectContext';
import { projectService } from '@/lib/firebase/project-service';
import { toastService } from '@/lib/utils/toast';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ProjectDeletion({ onDeleteClick }: { onDeleteClick: () => void }) {
  const router = useRouter();
  const { project, organizationId, setLoading, setError } = useProject();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!project?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Delete Project
      await projectService.delete(project.id, {
        organizationId
      });

      // Success Toast
      toastService.success('Projekt erfolgreich gelöscht');

      // Navigate away
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);

      // Set error in Context (zeigt Error-State)
      setError(error.message || 'Fehler beim Löschen des Projekts');

      // User-Feedback via Toast
      toastService.error(error.message);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowConfirm(true)} color="destructive">
        Projekt löschen
      </Button>

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>Projekt löschen?</DialogTitle>
        <DialogBody>
          <p>Möchten Sie das Projekt "{project?.title}" wirklich löschen?</p>
          <p className="text-red-600 mt-2">Diese Aktion kann nicht rückgängig gemacht werden!</p>
        </DialogBody>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleDelete} color="destructive">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
```

---

## Performance-Hinweise

### 1. Context Value Memoization

Der Context Value wird mit `useMemo` gecacht:

```typescript
// In ProjectProvider
const value: ProjectContextValue = useMemo(() => ({
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
}), [project, projectId, organizationId, activeTab, loading, error, reloadProject]);
```

**Effekt**: Context-Konsumenten re-rendern nur, wenn sich tatsächlich eine Dependency ändert.

### 2. React.memo für Konsumenten

Verwende `React.memo` für Komponenten, die `useProject()` nutzen:

```typescript
export const ProjectHeader = React.memo(function ProjectHeader({ ... }) {
  const { project } = useProject();
  // ...
});
```

**Effekt**: Komponente re-rendert nur, wenn Props ODER Context-Werte sich ändern.

### 3. Selective Consumption

Hole nur die Werte, die du brauchst:

```typescript
// ✅ GOOD: Nur benötigte Werte
const { project } = useProject();

// ❌ BAD: Alle Werte (re-render bei jeder Context-Änderung)
const context = useProject();
const project = context.project;
```

### 4. Stable Callback References

`reloadProject` hat stabile Referenz durch `useCallback`:

```typescript
const reloadProject = useCallback(async () => {
  if (onReload) {
    await onReload();
  }
}, [onReload]);
```

**Effekt**: Komponenten mit `reloadProject` in Dependencies re-rendern nicht unnötig.

---

## Testing

### Unit Test: useProject Hook

```typescript
// __tests__/unit/ProjectContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { ProjectProvider, useProject } from '../../context/ProjectContext';

const mockProject = {
  id: 'project-123',
  title: 'Test Project',
  status: 'active',
  // ... weitere Felder
};

describe('ProjectContext', () => {
  it('should provide context values correctly', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: ({ children }) => (
        <ProjectProvider
          projectId="project-123"
          organizationId="org-123"
          initialProject={mockProject}
        >
          {children}
        </ProjectProvider>
      ),
    });

    expect(result.current.project).toEqual(mockProject);
    expect(result.current.projectId).toBe('project-123');
    expect(result.current.organizationId).toBe('org-123');
    expect(result.current.activeTab).toBe('overview');
  });

  it('should allow changing active tab', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: ({ children }) => (
        <ProjectProvider projectId="123" organizationId="org-123" initialProject={mockProject}>
          {children}
        </ProjectProvider>
      ),
    });

    act(() => {
      result.current.setActiveTab('tasks');
    });

    expect(result.current.activeTab).toBe('tasks');
  });

  it('should throw error when used outside Provider', () => {
    const consoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useProject());
    }).toThrow('useProject must be used within a ProjectProvider');

    console.error = consoleError;
  });
});
```

### Integration Test: Component mit Context

```typescript
// __tests__/integration/project-header.test.tsx
import { render, screen } from '@testing-library/react';
import { ProjectProvider } from '../../context/ProjectContext';
import { ProjectHeader } from '../../components/header/ProjectHeader';

const mockProject = {
  id: 'project-123',
  title: 'Integration Test Project',
  status: 'active',
};

describe('ProjectHeader with Context', () => {
  it('should render project title from context', () => {
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

    expect(screen.getByText('Integration Test Project')).toBeInTheDocument();
  });
});
```

---

## Häufige Fehler

### 1. Verwendung außerhalb von Provider

```typescript
// ❌ FEHLER
export function MyComponent() {
  const { project } = useProject(); // ERROR: must be used within Provider
  return <div>{project?.title}</div>;
}

export default function MyPage() {
  return <MyComponent />; // Kein Provider!
}

// ✅ LÖSUNG
export default function MyPage() {
  return (
    <ProjectProvider projectId="123" organizationId="org-123">
      <MyComponent />
    </ProjectProvider>
  );
}
```

### 2. Fehlende organizationId

```typescript
// ❌ FEHLER
<ProjectProvider
  projectId={projectId}
  organizationId={undefined} // Kann zu Problemen führen
>
  {/* ... */}
</ProjectProvider>

// ✅ LÖSUNG
const { currentOrganization } = useOrganization();

<ProjectProvider
  projectId={projectId}
  organizationId={currentOrganization?.id || ''} // Fallback auf leeren String
>
  {/* ... */}
</ProjectProvider>
```

### 3. Infinite Re-Render Loop

```typescript
// ❌ FEHLER: setProject in Render-Phase
export function BadComponent() {
  const { project, setProject } = useProject();

  // Dieser Code läuft bei jedem Render!
  setProject({ ...project, updated: true }); // INFINITE LOOP!

  return <div>{project?.title}</div>;
}

// ✅ LÖSUNG: setProject in Event-Handler oder useEffect
export function GoodComponent() {
  const { project, setProject } = useProject();

  const handleUpdate = () => {
    setProject({ ...project, updated: true });
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

### 4. Direkter Context-Zugriff statt Hook

```typescript
// ❌ FEHLER: ProjectContext direkt konsumieren
import { ProjectContext } from '../../context/ProjectContext';
import { useContext } from 'react';

export function BadComponent() {
  const context = useContext(ProjectContext); // Verwende useProject() stattdessen!
  return <div>{context?.project?.title}</div>;
}

// ✅ LÖSUNG: useProject Hook verwenden
import { useProject } from '../../context/ProjectContext';

export function GoodComponent() {
  const { project } = useProject();
  return <div>{project?.title}</div>;
}
```

---

## Migration

### Von Props-Drilling zu Context

**Vorher** (Props-Drilling):

```typescript
// page.tsx
<ProjectHeader
  project={project}
  organizationId={organizationId}
  projectId={projectId}
  onEditClick={...}
/>

// ProjectHeader.tsx
interface ProjectHeaderProps {
  project: Project;
  organizationId: string;
  projectId: string;
  onEditClick: () => void;
}

export function ProjectHeader({ project, organizationId, projectId, onEditClick }: ProjectHeaderProps) {
  return (
    <div>
      <h1>{project.title}</h1>
      {/* ... */}
    </div>
  );
}
```

**Nachher** (Context):

```typescript
// page.tsx
<ProjectProvider projectId={projectId} organizationId={organizationId} initialProject={project}>
  <ProjectHeader onEditClick={...} />
</ProjectProvider>

// ProjectHeader.tsx
interface ProjectHeaderProps {
  onEditClick: () => void;
}

export function ProjectHeader({ onEditClick }: ProjectHeaderProps) {
  const { project, organizationId, projectId } = useProject();

  return (
    <div>
      <h1>{project?.title}</h1>
      {/* ... */}
    </div>
  );
}
```

**Vorteile**:
- ✅ Props von 4 auf 1 reduziert
- ✅ Keine Prop-Drilling mehr
- ✅ project, organizationId, projectId überall verfügbar
- ✅ Einfacher zu refactoren

---

**Letzte Aktualisierung**: 21. Oktober 2025
**Maintainer**: Development Team

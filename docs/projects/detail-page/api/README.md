# Project Detail Page - API-Übersicht

> **Modul**: Project Context API
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 21. Oktober 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [ProjectContext API](#projectcontext-api)
  - [useProject Hook](#useproject-hook)
  - [ProjectProvider](#projectprovider)
- [Context Values](#context-values)
  - [Project Data](#project-data)
  - [IDs](#ids)
  - [Tab Navigation](#tab-navigation)
  - [Loading & Error States](#loading--error-states)
  - [Reload Function](#reload-function)
- [Verwendungsbeispiele](#verwendungsbeispiele)
  - [Basis-Verwendung](#basis-verwendung)
  - [Tab-Wechsel](#tab-wechsel)
  - [Projekt aktualisieren](#projekt-aktualisieren)
  - [Error Handling](#error-handling)
- [TypeScript-Typen](#typescript-typen)
- [Best Practices](#best-practices)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Die **ProjectContext API** ist das zentrale State-Management-System für die Project Detail Page. Sie stellt alle projekt-relevanten Daten und Funktionen über einen React Context bereit und eliminiert Props-Drilling.

### Kernfunktionen

- ✅ **Globaler Projekt-State**: Zugriff auf `project`, `projectId`, `organizationId` von überall
- ✅ **Tab-Navigation**: Zentralisiertes Tab-State-Management
- ✅ **Loading/Error States**: Einheitliches Feedback-System
- ✅ **Reload-Funktion**: Projekt-Daten neu laden
- ✅ **Type-Safe**: Vollständige TypeScript-Unterstützung
- ✅ **Performance-Optimiert**: `useMemo` und `useCallback` integriert

---

## ProjectContext API

### useProject Hook

**Import**:

```typescript
import { useProject } from '../../context/ProjectContext';
```

**Signatur**:

```typescript
function useProject(): ProjectContextValue
```

**Rückgabewert**: `ProjectContextValue` (siehe [Context Values](#context-values))

**Throws**: Error wenn außerhalb von `ProjectProvider` verwendet

**Verwendung**:

```typescript
export function MyComponent() {
  const {
    project,           // Project | null
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

  // Komponenten-Logik
}
```

---

### ProjectProvider

**Import**:

```typescript
import { ProjectProvider } from './context/ProjectContext';
```

**Signatur**:

```typescript
interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
  organizationId: string;
  initialProject?: Project | null;
  onReload?: () => Promise<void>;
}

function ProjectProvider(props: ProjectProviderProps): JSX.Element
```

**Props**:

| Prop | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `children` | `ReactNode` | ✅ | Child-Komponenten |
| `projectId` | `string` | ✅ | Projekt-ID aus URL |
| `organizationId` | `string` | ✅ | Aktuelle Organisation |
| `initialProject` | `Project \| null` | ❌ | Initial-Projekt (optional) |
| `onReload` | `() => Promise<void>` | ❌ | Reload-Callback (optional) |

**Verwendung**:

```typescript
export default function ProjectDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();
  const [project, setProject] = useState<Project | null>(null);

  const loadProject = async () => {
    const data = await projectService.getById(params.projectId, {
      organizationId: currentOrganization.id
    });
    setProject(data);
  };

  return (
    <ProjectProvider
      projectId={params.projectId as string}
      organizationId={currentOrganization?.id || ''}
      initialProject={project}
      onReload={loadProject}
    >
      {/* Child-Komponenten */}
    </ProjectProvider>
  );
}
```

---

## Context Values

### Project Data

#### project

```typescript
project: Project | null
```

**Beschreibung**: Das aktuelle Projekt-Objekt

**Beispiel**:

```typescript
const { project } = useProject();

if (!project) {
  return <div>Kein Projekt geladen</div>;
}

console.log(project.title);        // "Mein Projekt"
console.log(project.status);       // "active"
console.log(project.currentStage); // "ideas_planning"
```

#### setProject

```typescript
setProject: (project: Project | null) => void
```

**Beschreibung**: Aktualisiert das Projekt im Context

**Beispiel**:

```typescript
const { project, setProject } = useProject();

// Projekt aktualisieren
const updatedProject = { ...project, title: 'Neuer Titel' };
setProject(updatedProject);

// Projekt entfernen
setProject(null);
```

---

### IDs

#### projectId

```typescript
projectId: string
```

**Beschreibung**: Projekt-ID (read-only, aus URL)

**Beispiel**:

```typescript
const { projectId } = useProject();

// Verwende in API-Calls
const tasks = await taskService.getByProjectId(organizationId, projectId);
```

#### organizationId

```typescript
organizationId: string
```

**Beschreibung**: Organisations-ID (read-only, aus Context)

**Beispiel**:

```typescript
const { organizationId, projectId } = useProject();

// Multi-Tenancy: Immer organizationId mitgeben
await projectService.update(projectId, { title: 'Neu' }, {
  organizationId
});
```

---

### Tab Navigation

#### activeTab

```typescript
activeTab: 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring'
```

**Beschreibung**: Aktuell aktiver Tab

**Default**: `'overview'`

**Beispiel**:

```typescript
const { activeTab } = useProject();

console.log(activeTab); // "overview"

// Conditional Rendering
{activeTab === 'tasks' && <TasksTabContent />}
```

#### setActiveTab

```typescript
setActiveTab: (tab: TabType) => void
```

**Beschreibung**: Wechselt den aktiven Tab

**Beispiel**:

```typescript
const { setActiveTab } = useProject();

// Button-Handler
<button onClick={() => setActiveTab('tasks')}>
  Go to Tasks
</button>

// Programmatisch nach Aktion
const handleSaveSuccess = () => {
  setActiveTab('overview');
};
```

---

### Loading & Error States

#### loading

```typescript
loading: boolean
```

**Beschreibung**: Loading-State des Projekts

**Default**: `true`

**Beispiel**:

```typescript
const { loading } = useProject();

if (loading) {
  return <LoadingState message="Projekt wird geladen..." />;
}
```

#### setLoading

```typescript
setLoading: (loading: boolean) => void
```

**Beschreibung**: Aktualisiert den Loading-State

**Beispiel**:

```typescript
const { setLoading } = useProject();

const loadData = async () => {
  setLoading(true);
  try {
    const data = await fetchData();
    // Verarbeite data
  } finally {
    setLoading(false);
  }
};
```

#### error

```typescript
error: string | null
```

**Beschreibung**: Fehlermeldung (wenn vorhanden)

**Default**: `null`

**Beispiel**:

```typescript
const { error } = useProject();

if (error) {
  return <ErrorState message={error} />;
}
```

#### setError

```typescript
setError: (error: string | null) => void
```

**Beschreibung**: Setzt oder löscht Fehlermeldung

**Beispiel**:

```typescript
const { setError } = useProject();

try {
  await dangerousOperation();
  setError(null); // Fehler löschen
} catch (err) {
  setError(err.message); // Fehler setzen
}
```

---

### Reload Function

#### reloadProject

```typescript
reloadProject: () => Promise<void>
```

**Beschreibung**: Lädt Projekt-Daten neu (ruft `onReload`-Callback auf)

**Beispiel**:

```typescript
const { reloadProject } = useProject();

// Nach erfolgreicher Aktualisierung
const handleUpdate = async () => {
  await projectService.update(projectId, updates, { organizationId });
  await reloadProject(); // Projekt neu laden
};

// In Button
<button onClick={reloadProject}>
  Projekt neu laden
</button>
```

---

## Verwendungsbeispiele

### Basis-Verwendung

```typescript
import { useProject } from '../../context/ProjectContext';

export function ProjectInfo() {
  // Hole benötigte Werte aus Context
  const { project, projectId, organizationId, loading, error } = useProject();

  // Loading-State
  if (loading) {
    return <div>Loading...</div>;
  }

  // Error-State
  if (error) {
    return <div>Error: {error}</div>;
  }

  // Keine Daten
  if (!project) {
    return <div>Kein Projekt gefunden</div>;
  }

  // Normale Anzeige
  return (
    <div>
      <h1>{project.title}</h1>
      <p>ID: {projectId}</p>
      <p>Organisation: {organizationId}</p>
      <p>Status: {project.status}</p>
    </div>
  );
}
```

### Tab-Wechsel

```typescript
import { useProject } from '../../context/ProjectContext';

export function QuickNavigation() {
  const { activeTab, setActiveTab } = useProject();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setActiveTab('overview')}
        className={activeTab === 'overview' ? 'active' : ''}
      >
        Übersicht
      </button>
      <button
        onClick={() => setActiveTab('tasks')}
        className={activeTab === 'tasks' ? 'active' : ''}
      >
        Tasks
      </button>
      <button
        onClick={() => setActiveTab('strategie')}
        className={activeTab === 'strategie' ? 'active' : ''}
      >
        Strategie
      </button>
    </div>
  );
}
```

### Projekt aktualisieren

```typescript
import { useProject } from '../../context/ProjectContext';
import { projectService } from '@/lib/firebase/project-service';
import { toastService } from '@/lib/utils/toast';

export function ProjectTitleEditor() {
  const { project, setProject, organizationId, reloadProject } = useProject();
  const [title, setTitle] = useState(project?.title || '');

  const handleSave = async () => {
    if (!project?.id) return;

    try {
      // Update in Firebase
      await projectService.update(project.id, { title }, {
        organizationId,
        userId: user.uid
      });

      // Update Context (optimistic)
      setProject({ ...project, title });

      // Erfolgs-Toast
      toastService.success('Titel aktualisiert');

      // Optional: Reload für Konsistenz
      await reloadProject();
    } catch (error) {
      toastService.error('Fehler beim Speichern');
      console.error(error);
    }
  };

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={handleSave}>Speichern</button>
    </div>
  );
}
```

### Error Handling

```typescript
import { useProject } from '../../context/ProjectContext';

export function ProjectActions() {
  const { project, setError, setLoading, reloadProject } = useProject();

  const handleDangerousAction = async () => {
    if (!project?.id) return;

    setLoading(true);
    setError(null); // Alte Fehler löschen

    try {
      await dangerousService.performAction(project.id);
      toastService.success('Aktion erfolgreich');
      await reloadProject();
    } catch (error: any) {
      // Fehler in Context setzen (für Error-UI)
      setError(error.message || 'Ein Fehler ist aufgetreten');

      // Zusätzlich: Toast für User-Feedback
      toastService.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDangerousAction}>
      Gefährliche Aktion
    </button>
  );
}
```

---

## TypeScript-Typen

### ProjectContextValue

```typescript
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

### TabType

```typescript
type TabType = 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring';
```

### ProjectProviderProps

```typescript
interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
  organizationId: string;
  initialProject?: Project | null;
  onReload?: () => Promise<void>;
}
```

### Project Type

```typescript
interface Project {
  id?: string;
  title: string;
  description?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  currentStage: 'ideas_planning' | 'creation' | 'approval' | 'distribution' | 'monitoring' | 'completed';
  priority: 'low' | 'medium' | 'high';
  organizationId: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  assignedTo?: string[];
  projectManager?: string;
  customer?: {
    id: string;
    name: string;
  };
  deadline?: Timestamp | Date;
  tags?: string[];
  completedGuideSteps?: string[];
  linkedCampaigns?: string[];
  // ... weitere Felder
}
```

---

## Best Practices

### 1. Immer Error Handling

```typescript
// ✅ DO: Fehler abfangen und in Context setzen
const { setError, setLoading } = useProject();

try {
  setLoading(true);
  await dangerousOperation();
  setError(null);
} catch (error: any) {
  setError(error.message);
} finally {
  setLoading(false);
}

// ❌ DON'T: Fehler ignorieren
await dangerousOperation(); // Kann unbemerkt fehlschlagen
```

### 2. Loading-States korrekt setzen

```typescript
// ✅ DO: Loading in try-finally
const { setLoading } = useProject();

const fetchData = async () => {
  setLoading(true);
  try {
    await fetchOperation();
  } finally {
    setLoading(false); // Wird immer ausgeführt
  }
};

// ❌ DON'T: Loading nur in try
setLoading(true);
try {
  await fetchOperation();
  setLoading(false); // Wird bei Fehler nicht ausgeführt!
} catch (error) {
  // Loading bleibt true
}
```

### 3. Optimistic Updates mit Reload

```typescript
// ✅ DO: Optimistic Update + Reload für Konsistenz
const { project, setProject, reloadProject } = useProject();

const handleUpdate = async () => {
  // 1. Optimistic Update (sofortiges UI-Feedback)
  setProject({ ...project, title: newTitle });

  try {
    // 2. Server-Update
    await projectService.update(project.id, { title: newTitle }, { organizationId });

    // 3. Reload für Konsistenz (optional)
    await reloadProject();
  } catch (error) {
    // 4. Rollback bei Fehler
    setProject(project);
    toastService.error('Fehler beim Speichern');
  }
};
```

### 4. Conditional Rendering mit Guards

```typescript
// ✅ DO: Early Returns für States
const { loading, error, project } = useProject();

if (loading) return <LoadingState />;
if (error) return <ErrorState message={error} />;
if (!project) return null;

// Ab hier: project ist garantiert nicht-null
return <div>{project.title}</div>;

// ❌ DON'T: Tief verschachtelte Conditions
return (
  <>
    {loading ? (
      <LoadingState />
    ) : error ? (
      <ErrorState />
    ) : project ? (
      <div>{project.title}</div>
    ) : null}
  </>
);
```

### 5. useProject nur in Komponenten

```typescript
// ✅ DO: useProject in funktionalen Komponenten
export function MyComponent() {
  const { project } = useProject();
  // ...
}

// ❌ DON'T: useProject in Utility-Funktionen
function myUtility() {
  const { project } = useProject(); // FEHLER: Hooks nur in Komponenten!
}

// ✅ DO: Project als Parameter übergeben
function myUtility(project: Project) {
  // Funktioniert
}
```

---

## Siehe auch

- **[Detaillierte API-Referenz](./project-context.md)**: Vollständige Funktionssignaturen
- **[Hauptdokumentation](../README.md)**: Übersicht über das gesamte Refactoring
- **[Komponenten-Dokumentation](../components/README.md)**: Verwendung in Komponenten
- **[ADR: Context vs Props-Drilling](../adr/README.md#adr-1-context-vs-props-drilling)**: Warum Context?

---

**Letzte Aktualisierung**: 21. Oktober 2025
**Maintainer**: Development Team

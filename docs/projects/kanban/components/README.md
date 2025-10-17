# Kanban Components - API Dokumentation

## Inhaltsverzeichnis

1. [KanbanBoard](#kanbanboard)
2. [ProjectCard](#projectcard)
3. [KanbanColumn](#kanbancolumn)
4. [BoardHeader](#boardheader)
5. [BoardFilterPanel](#boardfilterpanel)
6. [DeleteConfirmDialog](#deleteconfirmdialog)
7. [Helpers](#helpers)

---

## KanbanBoard

Die Hauptkomponente des Kanban-Systems.

### Props

```typescript
interface KanbanBoardProps {
  projects: Record<PipelineStage, Project[]>;
  totalProjects: number;
  activeUsers: ActiveUser[];
  loading: boolean;
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
}
```

### Props Beschreibung

- **projects**: Projekte gruppiert nach Pipeline Stage
- **totalProjects**: Gesamtanzahl der Projekte
- **activeUsers**: Aktive Benutzer für Multi-User-Indicator
- **loading**: Loading State
- **filters**: Aktuelle Filter (Search, Status, Priority)
- **onFiltersChange**: Callback bei Filter-Änderungen

### Usage

```typescript
import { KanbanBoard } from '@/components/projects/kanban/KanbanBoard';

export default function ProjectsPage() {
  const [filters, setFilters] = useState<BoardFilters>({});
  const { data: projects, isLoading } = useProjects(orgId);

  const projectsByStage = useMemo(() => {
    return groupProjectsByStage(projects || []);
  }, [projects]);

  return (
    <KanbanBoard
      projects={projectsByStage}
      totalProjects={projects?.length || 0}
      activeUsers={[]}
      loading={isLoading}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}
```

### Features

- **Responsive:** Desktop (Columns) & Mobile (Accordion)
- **Drag & Drop:** HTML5 Backend (Desktop), Touch Backend (Mobile)
- **Real-time Updates:** Automatische Synchronisation
- **Filter:** Search, Status, Priority, Tags
- **Multi-User:** Active User Presence

### State Management

Intern verwendet KanbanBoard:
- **useState** für UI-State (showFilters, isMobile)
- **useEffect** für Responsive Detection
- **useDragAndDrop** für Drag & Drop Logic

### Performance

- **React.memo:** Verhindert unnötige Re-Renders
- **useMemo:** Cached Computed Values
- **Code-Splitting:** Dynamic Imports

---

## ProjectCard

Modularis

ierte Projekt-Karte mit Sections Pattern.

### Props

```typescript
interface ProjectCardProps {
  project: Project;
  onSelect?: (projectId: string) => void;
  onProjectMove?: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  onProjectAdded?: () => void;
  onProjectDeleted?: () => void;
  onProjectArchived?: () => void;
  onProjectUpdated?: () => void;
  useDraggableProject: (project: Project) => any;
}
```

### Props Beschreibung

- **project**: Projekt-Daten
- **onSelect**: Callback bei Karten-Click
- **onProjectMove**: Callback bei Drag & Drop
- **onProjectAdded**: Callback nach Projekt-Erstellung
- **onProjectDeleted**: Callback nach Löschen
- **onProjectArchived**: Callback nach Archivieren
- **onProjectUpdated**: Callback nach Update
- **useDraggableProject**: Drag & Drop Hook

### Usage

```typescript
import { ProjectCard } from '@/components/projects/kanban/ProjectCard';

<ProjectCard
  project={project}
  onSelect={(id) => router.push(`/projects/${id}`)}
  onProjectDeleted={() => queryClient.invalidateQueries(['projects'])}
  useDraggableProject={useDraggableProject}
/>
```

### Struktur

```
ProjectCard (index.tsx)
├── Header (Titel, Kunde, Quick-Actions)
├── Tags (Max 3 visible, +N Overflow)
├── Progress Bar (wenn vorhanden)
├── Footer
│   ├── Team Avatars
│   ├── Due Date
│   ├── Priority Badge
│   └── Status Badge
└── Warnings (Overdue, Critical Tasks)
```

### Performance Optimizations

```typescript
// Alle Handler mit useCallback
const handleCardClick = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  if (project.id) router.push(`/dashboard/projects/${project.id}`);
}, [project.id, router]);

// Computed Values mit useMemo
const projectPriority = useMemo(() =>
  (project as any).priority as ProjectPriority,
  [project]
);

const progressPercent = useMemo(() =>
  progress?.overallPercent || 0,
  [progress]
);

const isDueToday = useMemo(() => {
  if (!project.dueDate) return false;
  return new Date(project.dueDate.seconds * 1000).toDateString() === new Date().toDateString();
}, [project.dueDate]);

// React.memo mit Custom Comparison
export const ProjectCard = memo(({ project, ... }) => {
  // Component
}, (prevProps, nextProps) => {
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.updatedAt === nextProps.project.updatedAt
  );
});
```

### React Query Integration

```typescript
// Mutations
const deleteProjectMutation = useDeleteProject();
const archiveProjectMutation = useArchiveProject();

// Usage
const confirmDelete = useCallback(async () => {
  await deleteProjectMutation.mutateAsync({
    projectId: project.id!,
    organizationId: currentOrganization.id
  });
  toast.success('Projekt gelöscht');
  if (onProjectDeleted) onProjectDeleted();
}, [deleteProjectMutation, project.id, onProjectDeleted]);
```

---

## KanbanColumn

Spalte für eine Pipeline Stage mit Drop Zone.

### Props

```typescript
interface KanbanColumnProps {
  stage: PipelineStage;
  title: string;
  projects: Project[];
  loading: boolean;
  onProjectSelect?: (projectId: string) => void;
  useDraggableProject: (project: Project) => any;
  useDropZone: (stage: PipelineStage) => any;
}
```

### Usage

```typescript
<KanbanColumn
  stage="creation"
  title="Erstellung"
  projects={projects}
  loading={false}
  useDraggableProject={useDraggableProject}
  useDropZone={useDropZone}
/>
```

### Features

- **Drop Zone:** Highlight bei Hover
- **Project Count:** Anzahl der Projekte im Header
- **Empty State:** Message wenn keine Projekte
- **Scroll:** Vertical Scroll bei vielen Projekten

---

## BoardHeader

Header mit Filter-Toggle und Actions.

### Props

```typescript
interface BoardHeaderProps {
  totalProjects: number;
  showFilters: boolean;
  onToggleFilters: () => void;
  onRefresh?: () => void;
  viewMode?: 'board' | 'list';
  onViewModeChange?: (mode: 'board' | 'list') => void;
}
```

### Usage

```typescript
<BoardHeader
  totalProjects={projects.length}
  showFilters={showFilters}
  onToggleFilters={() => setShowFilters(!showFilters)}
  onRefresh={() => queryClient.invalidateQueries(['projects'])}
/>
```

### Features

- **Project Count:** Zeigt Gesamtanzahl
- **Filter Toggle:** Button zum Ein-/Ausblenden
- **Refresh Button:** Manuelles Neu-Laden
- **View Mode Toggle:** Board vs. List View (Optional)

---

## BoardFilterPanel

Suchfilter-Panel mit Search, Status, Priority, Tags.

### Props

```typescript
interface BoardFilterPanelProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  onClose: () => void;
}

interface BoardFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  tags?: string[];
}
```

### Usage

```typescript
<BoardFilterPanel
  filters={filters}
  onChange={(newFilters) => setFilters(newFilters)}
  onClose={() => setShowFilters(false)}
/>
```

### Features

- **Search:** Durchsucht Titel, Beschreibung, Kunde
- **Status Filter:** Multi-Select (active, completed, etc.)
- **Priority Filter:** Multi-Select (urgent, high, medium, low)
- **Tags Filter:** Multi-Select aus verfügbaren Tags
- **Clear All:** Button zum Zurücksetzen aller Filter

---

## DeleteConfirmDialog

Bestätigungsdialog für Projekt-Löschung.

### Props

```typescript
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  projectTitle: string;
  isDeleting: boolean;
  hasError: boolean;
}
```

### Usage

```typescript
<DeleteConfirmDialog
  isOpen={showDeleteDialog}
  onClose={() => setShowDeleteDialog(false)}
  onConfirm={handleDelete}
  projectTitle={project.title}
  isDeleting={deleteProjectMutation.isPending}
  hasError={deleteProjectMutation.isError}
/>
```

### Features

- **Confirmation:** Verhindert versehentliches Löschen
- **Loading State:** Zeigt Spinner während Delete
- **Error Handling:** Zeigt Error Message bei Fehler
- **Escape Key:** Schließt Dialog mit ESC
- **Click Outside:** Schließt Dialog bei Click außerhalb

### Styling

```typescript
// Dialog Overlay
className="fixed inset-0 bg-black bg-opacity-50 z-50"

// Dialog Content
className="bg-white rounded-lg shadow-xl max-w-md"

// Danger Button
className="bg-red-600 hover:bg-red-700 text-white"
```

---

## Helpers

Utility-Funktionen für ProjectCard.

### getPriorityColor

Gibt Tailwind-Klassen für Priority Badge zurück.

```typescript
export function getPriorityColor(priority?: ProjectPriority): string {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
```

### getPriorityIcon

Gibt Icon für urgent/high Priority zurück.

```typescript
export function getPriorityIcon(priority?: ProjectPriority) {
  if (priority === 'urgent' || priority === 'high') {
    return <ExclamationTriangleIcon className="h-3 w-3" />;
  }
  return null;
}
```

### getStatusColor

Gibt Tailwind-Klassen für Status Badge zurück.

```typescript
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'on_hold': return 'bg-yellow-100 text-yellow-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-blue-100 text-blue-800';
  }
}
```

### Usage

```typescript
import { getPriorityColor, getPriorityIcon, getStatusColor } from './helpers';

<span className={getPriorityColor(project.priority)}>
  {getPriorityIcon(project.priority)}
  <span className="ml-1">{project.priority}</span>
</span>

<span className={getStatusColor(project.status)}>
  {project.status}
</span>
```

---

## Types

### Project

```typescript
interface Project {
  id?: string;
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  currentStage: PipelineStage;
  customer?: {
    id: string;
    name: string;
    companyName?: string;
  };
  priority?: ProjectPriority;
  tags?: string[];
  progress?: {
    overallPercent: number;
    criticalTasks?: number;
  };
  dueDate?: Timestamp;
  assignedTo?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### PipelineStage

```typescript
type PipelineStage =
  | 'ideas_planning'
  | 'creation'
  | 'approval'
  | 'distribution'
  | 'monitoring'
  | 'completed';
```

### ProjectPriority

```typescript
type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low';
```

### ProjectStatus

```typescript
type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
```

---

## Styling Guidelines

### Design System Compliance

- **Keine Shadow-Effekte** außer für Dropdowns/Modals
- **Heroicons:** Nur `/24/outline` Icons verwenden
- **Zinc-Palette:** Für neutrale Farben
- **Primary Color:** `#005fab`
- **Focus-Rings:** `focus:ring-2 focus:ring-primary`

### Spacing

```typescript
// Card Padding
className="p-4"

// Gap zwischen Elementen
className="gap-3" // 12px
className="space-y-3" // Vertical Spacing

// Margins
className="mb-3" // 12px Bottom Margin
```

### Typography

```typescript
// Titel
className="text-sm font-medium text-zinc-900"

// Subtitle
className="text-xs text-zinc-600"

// Badge
className="text-xs font-medium"
```

### Colors

```typescript
// Background
className="bg-white" // Card Background
className="bg-zinc-100" // Badge Background
className="bg-zinc-200" // Secondary Background

// Text
className="text-zinc-900" // Primary Text
className="text-zinc-600" // Secondary Text
className="text-zinc-500" // Tertiary Text

// Borders
className="border-zinc-200"
```

---

## Testing

### Component Tests

```typescript
// ProjectCard.test.tsx
describe('ProjectCard', () => {
  it('sollte Projekt-Titel rendern', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Projekt')).toBeInTheDocument();
  });

  it('sollte Kunden-Namen anzeigen', () => {
    const projectWithCustomer = {
      ...mockProject,
      customer: { id: '1', name: 'Test GmbH' }
    };
    render(<ProjectCard project={projectWithCustomer} />);
    expect(screen.getByText('Test GmbH')).toBeInTheDocument();
  });

  it('sollte Progress Bar anzeigen', () => {
    const projectWithProgress = {
      ...mockProject,
      progress: { overallPercent: 75 }
    } as any;
    render(<ProjectCard project={projectWithProgress} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
```

### Mocking

```typescript
// Mock React Query
jest.mock('@/lib/hooks/useProjectData', () => ({
  useDeleteProject: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
  }),
}));

// Mock Organization Context
jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  }),
}));

// Mock Next.js Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
```

---

## Performance Best Practices

### 1. Memoization

```typescript
// React.memo für Components
export const ProjectCard = memo(({ project }) => {
  // ...
}, (prev, next) => prev.project.id === next.project.id);

// useMemo für Computed Values
const progressPercent = useMemo(() =>
  progress?.overallPercent || 0,
  [progress]
);

// useCallback für Event Handlers
const handleClick = useCallback(() => {
  router.push(`/projects/${project.id}`);
}, [project.id, router]);
```

### 2. React Query

```typescript
// Caching mit staleTime
useQuery({
  queryKey: ['projects', orgId],
  queryFn: fetchProjects,
  staleTime: 5 * 60 * 1000, // 5 Minuten
});

// Optimistic Updates
onMutate: async (variables) => {
  queryClient.setQueryData(['projects'], (old) => /* update */);
}
```

### 3. Code-Splitting

```typescript
// Dynamic Imports
const ProjectEditWizard = dynamic(() =>
  import('@/components/projects/edit/ProjectEditWizard')
);
```

### 4. Lazy Loading

```typescript
// Virtualized List für viele Projekte
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={projects.length}
  itemSize={120}
>
  {({ index, style }) => (
    <div style={style}>
      <ProjectCard project={projects[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## Accessibility

### ARIA Labels

```typescript
// Icon Buttons
<button aria-label="Projekt löschen">
  <TrashIcon />
</button>

// Status Badges
<span role="status" aria-label={`Status: ${project.status}`}>
  {project.status}
</span>
```

### Keyboard Navigation

```typescript
// Tab Order
tabIndex={0} // Focusable
tabIndex={-1} // Not in Tab Order

// Keyboard Events
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
  }
}}
```

### Focus Management

```typescript
// Focus Ring
className="focus:outline-none focus:ring-2 focus:ring-primary"

// Skip to Content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Zum Hauptinhalt springen
</a>
```

---

**Version:** 1.0.0
**Letzte Aktualisierung:** 2025-01-17

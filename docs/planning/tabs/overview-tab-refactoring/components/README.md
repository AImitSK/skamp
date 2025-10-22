# Overview Tab Komponenten - Dokumentation

> **Modul**: Overview Tab Komponenten
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-22

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Komponenten-Hierarchie](#komponenten-hierarchie)
- [PipelineProgressDashboard](#pipelineprogressdashboard)
- [OverviewTabContent](#overviewtabcontent)
- [ProjectGuideBox](#projectguidebox)
- [State Management](#state-management)
- [Event Handlers](#event-handlers)
- [Styling-Richtlinien](#styling-richtlinien)
- [Performance-Tipps](#performance-tipps)
- [Common Patterns](#common-patterns)
- [Accessibility](#accessibility)

---

## Übersicht

Die Overview Tab Komponenten bilden die UI-Schicht des refactorten Overview-Tabs. Alle Komponenten sind mit React.memo optimiert und folgen modernen React Best Practices.

### Hauptkomponenten

1. **PipelineProgressDashboard** - Haupt-Dashboard mit Pipeline- und Task-Progress
2. **OverviewTabContent** - Container für Overview-Tab mit Layout
3. **ProjectGuideBox** - Guide mit Checkboxen für Projekt-Setup

---

## Komponenten-Hierarchie

```
page.tsx (ProjectDetailPage)
├── ProjectProvider (Context)
│   ├── ProjectHeader
│   ├── ProjectInfoBar
│   ├── TabNavigation
│   └── Tab Content:
│       └── OverviewTabContent (React.memo)
│           ├── PipelineProgressDashboard (React.memo)
│           │   ├── Loading Skeleton
│           │   ├── Progress Sections
│           │   │   ├── Gesamt-Fortschritt
│           │   │   ├── Task-Completion
│           │   │   └── Kritische Tasks
│           │   └── Critical Tasks Warning
│           ├── Today Tasks Box
│           │   ├── Task Liste
│           │   └── Navigation Button
│           └── ProjectGuideBox
│               ├── Guide Steps
│               └── Toggle Checkboxen
```

---

## PipelineProgressDashboard

### Übersicht

Haupt-Dashboard Component für Pipeline-Fortschritt und Task-Übersicht. Verwendet useProjectTasks Hook und ist mit React.memo optimiert.

**Datei**: `src/components/projects/workflow/PipelineProgressDashboard.tsx`
**Zeilen**: 183

---

### Props

```typescript
interface PipelineProgressDashboardProps {
  // Keine Props - nutzt ProjectContext
}
```

**Wichtig**: Component hat keine Props, sondern nutzt `useProject()` Hook aus Context!

---

### Context-Abhängigkeiten

```typescript
// Aus ProjectContext
const { project, projectId, organizationId, setActiveTab } = useProject();

// Benötigte Werte:
// - project.currentStage (für Pipeline-Fortschritt)
// - projectId (für useProjectTasks)
// - organizationId (für useProjectTasks)
// - setActiveTab (für Navigation zu Tasks)
```

---

### States und Hooks

```typescript
// External Hooks
const { project, projectId, organizationId, setActiveTab } = useProject();
const currentStage = project?.currentStage || 'creation';

// React Query Hook
const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

// useMemo für konstante Objekte
const stageLabels = useMemo<Record<PipelineStage, string>>(() => ({
  'ideas_planning': 'Ideen & Planung',
  'creation': 'Content und Materialien',
  'approval': 'Freigabe',
  'distribution': 'Verteilung',
  'monitoring': 'Monitoring',
  'completed': 'Abgeschlossen'
}), []);

const stageOrder = useMemo<PipelineStage[]>(() => [
  'ideas_planning',
  'creation',
  'approval',
  'distribution',
  'monitoring',
  'completed'
], []);

// useCallback für Handler
const handleNavigateToTasks = useCallback(() => {
  setActiveTab('tasks');
}, [setActiveTab]);
```

---

### Render-Logik

#### 1. Loading State

```typescript
if (isLoading) {
  return (
    <div className="space-y-6">
      <div className="bg-primary rounded-lg p-6">
        {/* Loading Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-blue-400 rounded w-48 animate-pulse"></div>
          <div className="h-6 w-6 bg-blue-400 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-blue-400 rounded w-32 animate-pulse"></div>
              <div className="flex items-center space-x-3">
                <div className="h-8 bg-blue-400 rounded w-16 animate-pulse"></div>
                <div className="flex-1 bg-blue-400 rounded-full h-3 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 h-3 bg-blue-400 rounded w-48 animate-pulse"></div>
      </div>
    </div>
  );
}
```

**Features**:
- Gleiche Struktur wie finale UI (kein Layout-Shift)
- Tailwind `animate-pulse` für Animation
- 3 Spalten für Gesamt-Fortschritt, Task-Completion, Kritische Tasks

---

#### 2. Error Handling

```typescript
if (error) {
  toastService.error('Fehler beim Laden der Tasks');
}
```

**Wichtig**: UI wird trotz Error gerendert (fallback auf Default-Werte)!

---

#### 3. Hauptinhalt

**Struktur**:
```jsx
<div className="space-y-6">
  {/* Gesamt-Progress Header */}
  <div className="bg-primary rounded-lg p-6 text-white">
    <h3>Pipeline-Fortschritt</h3>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Gesamt-Fortschritt */}
      <div>{pipelinePercent}%</div>

      {/* Task-Completion */}
      <div>{taskCompletion}%</div>

      {/* Kritische Tasks */}
      <div>{criticalTasksRemaining} offen</div>
    </div>

    <div className="mt-4">
      Letztes Update: {new Date().toLocaleString('de-DE')}
    </div>
  </div>

  {/* Critical Task Warning (conditional) */}
  {criticalTasksRemaining > 0 && (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <ExclamationTriangleIcon />
      <h4>Warnung: Kritische Tasks ausstehend</h4>
      <p>Es sind noch {criticalTasksRemaining} kritische Tasks offen</p>
    </div>
  )}
</div>
```

---

### Code-Beispiel (vollständig)

```typescript
'use client';

import React, { useCallback, useMemo } from 'react';
import { PipelineStage, PIPELINE_STAGE_PROGRESS } from '@/types/project';
import { toastService } from '@/lib/utils/toast';
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';
import { getProgressColor } from '@/lib/utils/progress-helpers';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useProject } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';

interface PipelineProgressDashboardProps {}

function PipelineProgressDashboard({}: PipelineProgressDashboardProps) {
  // Context verwenden statt Props
  const { project, projectId, organizationId, setActiveTab } = useProject();
  const currentStage = project?.currentStage || 'creation';

  // React Query Hook für Tasks und Progress
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  // Error Handling
  if (error) {
    toastService.error('Fehler beim Laden der Tasks');
  }

  // Pipeline-Fortschritt aus zentraler Konstante
  const pipelinePercent = PIPELINE_STAGE_PROGRESS[currentStage] || 0;

  // useMemo für konstante Objekte
  const stageLabels = useMemo<Record<PipelineStage, string>>(() => ({
    'ideas_planning': 'Ideen & Planung',
    'creation': 'Content und Materialien',
    'approval': 'Freigabe',
    'distribution': 'Verteilung',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  }), []);

  // useCallback für Handler
  const handleNavigateToTasks = useCallback(() => {
    setActiveTab('tasks');
  }, [setActiveTab]);

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-primary rounded-lg p-6">
          {/* Skeleton Content */}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gesamt-Progress Header */}
      <div className="bg-primary rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Pipeline-Fortschritt</h3>
          <ChartBarIcon className="w-6 h-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gesamt-Fortschritt */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Gesamt-Fortschritt</p>
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-bold">{Math.round(pipelinePercent)}%</div>
              <div className="flex-1 bg-blue-500 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${pipelinePercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Task-Completion */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Task-Completion</p>
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-bold">{Math.round(progress.taskCompletion)}%</div>
              <div className="flex-1 bg-blue-500 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${progress.taskCompletion}%` }}
                ></div>
              </div>
            </div>
            {tasks.length === 0 && (
              <button
                onClick={handleNavigateToTasks}
                className="text-xs text-blue-100 hover:text-white mt-1 underline"
              >
                Tasks erstellen
              </button>
            )}
          </div>

          {/* Kritische Tasks */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Kritische Tasks</p>
            <div className="flex items-center space-x-2">
              {progress.criticalTasksRemaining > 0 ? (
                <>
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-300" />
                  <span className="text-xl font-bold">{progress.criticalTasksRemaining} offen</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-green-300" />
                  <span className="text-xl font-bold">Alle erledigt</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-blue-100">
          Letztes Update: {new Date().toLocaleString('de-DE')}
        </div>
      </div>

      {/* Critical Task Warnings */}
      {progress.criticalTasksRemaining > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-amber-800">
              Warnung: Kritische Tasks ausstehend
            </h4>
          </div>
          <p className="mt-2 text-sm text-amber-700">
            Es sind noch {progress.criticalTasksRemaining} kritische Tasks offen,
            die für den nächsten Stage-Übergang erforderlich sind.
          </p>
        </div>
      )}
    </div>
  );
}

// React.memo verhindert Re-Renders wenn Props gleich bleiben
export default React.memo(PipelineProgressDashboard);
```

---

### Verwendung

```typescript
import PipelineProgressDashboard from '@/components/projects/workflow/PipelineProgressDashboard';
import { ProjectProvider } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';

function OverviewTab() {
  return (
    <ProjectProvider projectId={projectId} organizationId={organizationId}>
      <PipelineProgressDashboard />
    </ProjectProvider>
  );
}
```

---

### Performance-Optimierungen

#### React.memo

```typescript
export default React.memo(PipelineProgressDashboard);
```

**Effekt**: Component wird nur re-rendered wenn Props sich ändern. Da Component keine Props hat (nutzt Context), wird sie nur re-rendered wenn Context sich ändert.

**Test** (aus PipelineProgressDashboard.test.tsx):
```typescript
it('sollte Component mit React.memo exportieren', () => {
  expect(PipelineProgressDashboard.$$typeof.toString()).toContain('react.memo');
});
```

---

#### useCallback für Handler

```typescript
const handleNavigateToTasks = useCallback(() => {
  setActiveTab('tasks');
}, [setActiveTab]);
```

**Effekt**: Handler hat stabile Referenz → Keine Re-Renders von Child-Komponenten (Button)

---

#### useMemo für konstante Objekte

```typescript
const stageLabels = useMemo<Record<PipelineStage, string>>(() => ({
  'ideas_planning': 'Ideen & Planung',
  // ...
}), []);
```

**Effekt**: Objekt wird nur einmal erstellt → Keine Re-Creation bei jedem Render

---

### Styling

**Design System**:
- Primary Color: `bg-primary` (Tailwind Custom)
- Text Colors: `text-white`, `text-blue-100`, `text-gray-900`
- Spacing: `space-y-6`, `gap-6`
- Rounding: `rounded-lg`, `rounded-full`
- Shadows: Keine (flaches Design)

**Responsive**:
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Mobile: 1 Spalte, Desktop: 3 Spalten */}
</div>
```

**Transitions**:
```typescript
<div className="transition-all duration-300" style={{ width: `${percent}%` }} />
```

---

### Icons

**Heroicons 24/outline** (CeleroPress Design System Richtlinie):
- `CheckCircleIcon` - Kritische Tasks erledigt
- `ExclamationTriangleIcon` - Kritische Tasks offen / Warning
- `ChartBarIcon` - Pipeline-Fortschritt Header

**Verwendung**:
```typescript
import { CheckCircleIcon } from '@heroicons/react/24/outline';

<CheckCircleIcon className="w-6 h-6 text-green-300" />
```

---

### Accessibility

**Semantisches HTML**:
```typescript
<h3 className="text-xl font-semibold">Pipeline-Fortschritt</h3>
<p className="text-blue-100 text-sm mb-2">Gesamt-Fortschritt</p>
```

**Button Accessibility**:
```typescript
<button
  onClick={handleNavigateToTasks}
  className="text-xs text-blue-100 hover:text-white mt-1 underline"
>
  Tasks erstellen
</button>
```

**Color Contrast**:
- Text auf `bg-primary`: White (WCAG AAA)
- Warning Text auf `bg-amber-50`: `text-amber-800` (WCAG AA)

---

## OverviewTabContent

### Übersicht

Container Component für Overview-Tab. Zeigt PipelineProgressDashboard, Today Tasks, und ProjectGuideBox.

**Datei**: `src/app/dashboard/projects/[projectId]/components/tab-content/OverviewTabContent.tsx`
**Zeilen**: 172

---

### Props

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

**Wichtig**: 8 Props - alle müssen stabil sein für optimalen React.memo Effekt!

---

### Props-Details

#### project
- **Typ**: `Project`
- **Beschreibung**: Aktuelles Project-Objekt
- **Verwendung**: Wird an PipelineProgressDashboard und ProjectGuideBox weitergegeben

#### currentOrganization
- **Typ**: `any` (Organization Interface)
- **Beschreibung**: Aktuelle Organisation
- **Verwendung**: Für PipelineProgressDashboard

#### todayTasks
- **Typ**: `ProjectTask[]`
- **Beschreibung**: Heute fällige oder überfällige Tasks des aktuellen Users
- **Verwendung**: Today Tasks Box

#### loadingTodayTasks
- **Typ**: `boolean`
- **Beschreibung**: Loading-State für Today Tasks
- **Verwendung**: Skeleton anzeigen

#### user
- **Typ**: `{ uid, displayName, email, photoURL }`
- **Beschreibung**: Aktueller User
- **Verwendung**: Avatar in Today Tasks Box

#### completedGuideSteps
- **Typ**: `string[]`
- **Beschreibung**: Array der abgeschlossenen Guide-Steps
- **Verwendung**: ProjectGuideBox

#### onStepToggle
- **Typ**: `(stepId: string) => Promise<void>`
- **Beschreibung**: Callback zum Toggle von Guide-Steps
- **Verwendung**: ProjectGuideBox

#### onNavigateToTasks
- **Typ**: `() => void`
- **Beschreibung**: Callback zur Navigation zum Tasks-Tab
- **Verwendung**: "Alle Tasks anzeigen" Button

---

### Struktur

```typescript
function OverviewTabContentComponent({
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
        {project && currentOrganization && (
          <PipelineProgressDashboard />
        )}
      </div>

      {/* Heute fällige Tasks Box */}
      {todayTasks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Today Tasks Content */}
        </div>
      )}

      {/* Projekt-Leitfaden Guide Box */}
      {project && (
        <ProjectGuideBox
          completedSteps={completedGuideSteps}
          onStepToggle={onStepToggle}
        />
      )}
    </div>
  );
}

// React.memo verhindert Re-Renders wenn Props gleich bleiben
export const OverviewTabContent = memo(OverviewTabContentComponent);
```

---

### Today Tasks Box

**Features**:
- Nur anzeigen wenn `todayTasks.length > 0`
- User-Avatar mit Initialen
- Task-Liste mit Status-Icons
- Progress-Bar pro Task
- "Alle Tasks anzeigen" Button

**Code**:
```typescript
{todayTasks.length > 0 && (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <CalendarDaysIcon className="h-5 w-5 text-primary mr-2" />
        <Subheading>Meine fälligen Tasks</Subheading>
      </div>
      {user && (
        <div className="flex items-center">
          <Avatar
            className="size-8"
            src={user.photoURL}
            initials={user.displayName
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || user.email?.charAt(0).toUpperCase() || '?'}
            title={user.displayName || user.email || 'Aktueller User'}
          />
        </div>
      )}
    </div>

    {/* Task Liste */}
    <div className="space-y-3">
      {todayTasks.map((task) => (
        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          {/* Task Content */}
        </div>
      ))}
    </div>

    {/* Footer mit Link */}
    <div className="mt-4 pt-4 border-t border-gray-200">
      <button
        onClick={onNavigateToTasks}
        className="text-sm text-primary hover:text-primary-hover font-medium"
      >
        Alle Tasks anzeigen →
      </button>
    </div>
  </div>
)}
```

---

### Verwendung

```typescript
import { OverviewTabContent } from '@/app/dashboard/projects/[projectId]/components/tab-content/OverviewTabContent';

function ProjectDetailPage() {
  const [todayTasks, setTodayTasks] = useState([]);
  const [loadingTodayTasks, setLoadingTodayTasks] = useState(false);
  const [completedGuideSteps, setCompletedGuideSteps] = useState([]);

  const handleStepToggle = async (stepId: string) => {
    // Toggle Logic...
  };

  const handleNavigateToTasks = () => {
    setActiveTab('tasks');
  };

  return (
    <OverviewTabContent
      project={project}
      currentOrganization={currentOrganization}
      todayTasks={todayTasks}
      loadingTodayTasks={loadingTodayTasks}
      user={user}
      completedGuideSteps={completedGuideSteps}
      onStepToggle={handleStepToggle}
      onNavigateToTasks={handleNavigateToTasks}
    />
  );
}
```

---

## ProjectGuideBox

### Übersicht

Guide-Komponente mit Checkboxen für Projekt-Setup-Schritte.

**Datei**: `src/components/projects/guides/ProjectGuideBox.tsx`

---

### Props

```typescript
interface ProjectGuideBoxProps {
  completedSteps: string[];
  onStepToggle: (stepId: string) => Promise<void>;
}
```

---

### Features

- Checkboxen für Guide-Steps
- Visuell hervorgehoben: `bg-blue-100 border-blue-200`
- Persistierung in Firestore
- Optimistic Updates

---

### Verwendung

```typescript
<ProjectGuideBox
  completedSteps={['step-1', 'step-3']}
  onStepToggle={async (stepId) => {
    // Update in Firestore
    await projectService.update(projectId, {
      completedGuideSteps: [...completedSteps, stepId]
    });
  }}
/>
```

---

## State Management

### Context vs. Props

**ProjectContext** (global):
- `project`, `projectId`, `organizationId`
- `activeTab`, `setActiveTab`
- Vermeidet Props-Drilling

**Props** (lokal):
- `todayTasks`, `completedGuideSteps` (häufig ändernde Daten)
- Callbacks: `onStepToggle`, `onNavigateToTasks`

---

### React Query

**useProjectTasks Hook**:
- Automatisches Caching
- Loading/Error States
- Progress-Berechnung

---

## Event Handlers

### handleNavigateToTasks

```typescript
const handleNavigateToTasks = useCallback(() => {
  setActiveTab('tasks');
}, [setActiveTab]);
```

**Verwendung**:
- PipelineProgressDashboard: "Tasks erstellen" Button
- OverviewTabContent: "Alle Tasks anzeigen" Button

---

### handleStepToggle

```typescript
const handleStepToggle = useCallback(async (stepId: string) => {
  const newSteps = completedGuideSteps.includes(stepId)
    ? completedGuideSteps.filter(id => id !== stepId)
    : [...completedGuideSteps, stepId];

  setCompletedGuideSteps(newSteps);

  if (project?.id && currentOrganization?.id && user?.uid) {
    try {
      await projectService.update(project.id, {
        completedGuideSteps: newSteps
      }, { organizationId: currentOrganization.id, userId: user.uid });
    } catch (error) {
      console.error('Fehler beim Speichern der Guide-Steps:', error);
    }
  }
}, [completedGuideSteps, project?.id, currentOrganization?.id, user?.uid]);
```

**Features**:
- Optimistic Update (lokaler State sofort)
- Persistierung in Firestore
- Error Handling

---

## Styling-Richtlinien

### Design System Farben

**Primary**:
- `bg-primary` - Haupt-Farbe (Blau)
- `text-primary` - Primär-Text

**Graustufen**:
- `bg-white` - Container
- `bg-gray-50` - Leicht grau (Today Tasks Items)
- `bg-gray-100` - Grau
- `border-gray-200` - Border

**Status**:
- `bg-green-600`, `text-green-600` - Erfolg
- `bg-amber-500`, `text-amber-700` - Warnung
- `bg-red-600`, `text-red-700` - Error
- `bg-blue-600`, `text-blue-700` - Info

---

### Spacing

**Container**:
```typescript
<div className="space-y-6"> {/* 24px zwischen Sections */}
  <div className="p-6"> {/* 24px Innen-Padding */}
    <div className="gap-6"> {/* 24px Grid-Gap */}
    </div>
  </div>
</div>
```

**Konsistenz**: Überall `space-y-6` für Section-Abstände!

---

### Responsive Design

**Grid**:
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Mobile: 1 Spalte, Desktop: 3 Spalten */}
</div>
```

**Breakpoints**:
- Mobile: < 768px (1 Spalte)
- Desktop: >= 768px (3 Spalten)

---

## Performance-Tipps

### 1. React.memo verwenden

```typescript
// ✅ Gut
export const OverviewTabContent = memo(OverviewTabContentComponent);

// ❌ Schlecht
export const OverviewTabContent = OverviewTabContentComponent;
```

---

### 2. Stabile Props übergeben

```typescript
// ✅ Gut: useCallback für Callbacks
const onNavigateToTasks = useCallback(() => {
  setActiveTab('tasks');
}, [setActiveTab]);

<OverviewTabContent onNavigateToTasks={onNavigateToTasks} />

// ❌ Schlecht: Inline-Function (neue Referenz bei jedem Render)
<OverviewTabContent onNavigateToTasks={() => setActiveTab('tasks')} />
```

---

### 3. Conditional Rendering

```typescript
// ✅ Gut: Render nur wenn Daten vorhanden
{todayTasks.length > 0 && (
  <TodayTasksBox tasks={todayTasks} />
)}

// ❌ Schlecht: Immer rendern (auch wenn leer)
<TodayTasksBox tasks={todayTasks} />
```

---

## Common Patterns

### Pattern 1: Loading Skeleton

```typescript
if (isLoading) {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}
```

---

### Pattern 2: Error Handling mit Toast

```typescript
if (error) {
  toastService.error('Fehler beim Laden');
}

// UI trotzdem rendern (mit fallback)
```

---

### Pattern 3: Conditional Warning

```typescript
{progress.criticalTasksRemaining > 0 && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
    <p>Es sind noch {progress.criticalTasksRemaining} kritische Tasks offen</p>
  </div>
)}
```

---

## Accessibility

### WCAG 2.1 Compliance

**Color Contrast**:
- Text auf `bg-primary`: White (AAA)
- Text auf `bg-amber-50`: `text-amber-800` (AA)
- Icons: Mindestens 3:1 Kontrast

**Keyboard Navigation**:
```typescript
<button
  onClick={handleNavigateToTasks}
  className="..."
>
  Alle Tasks anzeigen
</button>
```

**Semantisches HTML**:
- `<h3>` für Überschriften
- `<p>` für Text
- `<button>` für Interaktionen (nicht `<div>`)

**Screen Reader**:
```typescript
<Avatar
  title={user.displayName || user.email || 'Aktueller User'}
/>
```

---

**Erstellt**: 2025-10-22
**Autor**: Claude Code
**Version**: 1.0.0

# Project Detail Page - Refactoring Plan

**Version:** 1.1
**Status:** 📝 Planning
**Erstellt:** 2025-10-21
**Aktualisiert:** 2025-10-21 (Agent-Integration)
**Modul:** Phase 1.1 - Project Detail Page (Orchestrator)

---

## 📋 Übersicht

Refactoring der Project Detail Page (`src/app/dashboard/projects/[projectId]/page.tsx`), die als Orchestrator für alle 7 Tabs fungiert. Das Refactoring fokussiert sich auf:

- **ProjectContext einführen** - Props-Drilling vermeiden
- **Code-Modularisierung** - Header, InfoBar, TabContent extrahieren
- **Loading-States vereinheitlichen** - Konsistentes UX
- **Toast-Service Integration** - Bereits umgesetzt ✅
- **Keine Admin SDK Migration** - Firestore Security Rules reichen ✅

**Entry Point:** `src/app/dashboard/projects/[projectId]/page.tsx`
**Aktueller Zustand:** 1.412 Zeilen (SEHR HOCH!)
**Ziel:** < 400 Zeilen Haupt-Komponente + modulare Sub-Komponenten

---

## 🎯 Ziele

- [ ] ProjectContext für organizationId, projectId, activeTab einführen
- [ ] Header-Komponente extrahieren (Titel, Status, Team-Avatare, Actions)
- [ ] InfoBar-Komponente extrahieren (Phase, Kunde, Priorität, Deadline, Tags)
- [ ] Tab-Content Komponenten modularisieren
- [ ] Loading-States vereinheitlichen
- [ ] Error-Boundaries hinzufügen
- [ ] React Query für Project-Daten (optional, derzeit useState/useEffect)

---

## 📊 Ist-Zustand

### Aktuelle Datei-Struktur

```
src/app/dashboard/projects/[projectId]/
└── page.tsx (1.412 Zeilen) ⚠️ SEHR GROSS!
```

### Probleme identifiziert

1. **Props-Drilling:** organizationId, projectId werden zu allen Tabs gedrilled
2. **Monolith:** 1.412 Zeilen in einer Datei
3. **Inkonsistente Loading-States:** Jeder Tab hat eigene Loading-Logik
4. **Keine Error-Boundaries:** Fehler in einem Tab crashen die ganze Page
5. **useState/useEffect Pattern:** Kein Caching, manuelle Refetches

### Komponenten identifiziert (Zeilen-Schätzung)

- **Zeile 1-75:** Imports & Setup (75 Zeilen)
- **Zeile 76-117:** State-Deklarationen (42 Zeilen)
- **Zeile 118-393:** Data Loading Functions (275 Zeilen)
- **Zeile 394-565:** Handler Functions (171 Zeilen)
- **Zeile 566-693:** Helper Functions (128 Zeilen)
- **Zeile 694-1410:** Render/JSX (716 Zeilen)
  - Header (Zeile 699-876): 177 Zeilen
  - Tab Navigation (Zeile 881-985): 104 Zeilen
  - Tab Content (Zeile 987-1243): 256 Zeilen
  - Modals (Zeile 1247-1409): 162 Zeilen

**Zielstruktur:**

```
src/app/dashboard/projects/[projectId]/
├── page.tsx (< 400 Zeilen) - Orchestrator
├── context/
│   └── ProjectContext.tsx (100 Zeilen)
├── components/
│   ├── header/
│   │   ├── ProjectHeader.tsx (120 Zeilen)
│   │   ├── ProjectInfoBar.tsx (80 Zeilen)
│   │   └── index.ts (Barrel Export)
│   ├── tabs/
│   │   ├── TabNavigation.tsx (60 Zeilen)
│   │   └── index.ts
│   └── shared/
│       ├── LoadingState.tsx (30 Zeilen)
│       ├── ErrorBoundary.tsx (50 Zeilen)
│       └── index.ts
└── __tests__/
    ├── integration/
    │   └── project-detail-page-flow.test.tsx
    └── unit/
        ├── ProjectContext.test.tsx
        ├── ProjectHeader.test.tsx
        └── ProjectInfoBar.test.tsx
```

---

## 🚀 Die Refactoring-Phasen

**Übersicht:**
- Phase 0: Vorbereitung & Setup
- Phase 0.5: Pre-Refactoring Cleanup
- Phase 1: Context Integration
- Phase 2: Code-Modularisierung
- Phase 3: Performance-Optimierung
- Phase 4: Testing (**via refactoring-test Agent**)
- Phase 5: Dokumentation (**via refactoring-dokumentation Agent**)
- Phase 6: Production-Ready Quality
- **Phase 6.5: Quality Check (**via refactoring-quality-check Agent**) - PFLICHT vor Merge!**
- Phase 7: Merge zu Main

---

### Phase 0: Vorbereitung & Setup

**Dauer:** 30 Minuten

#### Aufgaben

- [x] Feature-Branch erstellt: `feature/project-detail-page-refactoring`
- [ ] Ist-Zustand dokumentiert (1.412 Zeilen)
- [ ] Backup erstellen: `page.backup.tsx`
- [ ] Dependencies prüfen:
  - [x] React Query installiert? → **Nein, aber nicht nötig für Phase 1**
  - [x] Testing Libraries vorhanden? → Ja
  - [x] TypeScript korrekt konfiguriert? → Ja

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/project-detail-page-refactoring`
- Ist-Zustand: 1 Datei, 1.412 Zeilen Code
- Backups: page.backup.tsx erstellt
- Dependencies: Alle vorhanden

### Struktur (Ist)
- page.tsx: 1.412 Zeilen (⚠️ SEHR HOCH)
  - Imports: 75 Zeilen
  - State: 42 Zeilen
  - Data Loading: 275 Zeilen
  - Handlers: 171 Zeilen
  - Helpers: 128 Zeilen
  - Render: 716 Zeilen

### Analyse
- Toast-Service: Bereits integriert ✅
- Admin SDK: Nicht nötig (Security Rules reichen) ✅
- Props-Drilling: organizationId, projectId zu allen Tabs
- 7 Tabs: Overview, Tasks, Strategie, Daten, Verteiler, Pressemeldung, Monitoring

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git checkout -b feature/project-detail-page-refactoring
cp src/app/dashboard/projects/[projectId]/page.tsx \
   src/app/dashboard/projects/[projectId]/page.backup.tsx
git add src/app/dashboard/projects/[projectId]/page.backup.tsx
git commit -m "chore: Phase 0 - Setup & Backup für Project Detail Page Refactoring

- Feature-Branch erstellt
- Backup page.tsx (1.412 Zeilen)
- Ist-Zustand dokumentiert
- Toast-Service bereits integriert
- Admin SDK nicht nötig (Security Rules reichen)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Dauer:** 1-2 Stunden

#### 0.5.1 TODO-Kommentare prüfen

```bash
grep -rn "TODO:" src/app/dashboard/projects/[projectId]/page.tsx
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen

#### 0.5.2 Console-Logs entfernen

```bash
grep -rn "console\." src/app/dashboard/projects/[projectId]/page.tsx
```

**Zu entfernen:**
- Debug-Logs (console.log)
- Development-Logs

**Zu behalten:**
- Production-relevante console.error() in catch-blocks

#### 0.5.3 Unused State prüfen

Alle 42 State-Deklarationen durchgehen:

```typescript
// Zeile 84-111: States
const [project, setProject] = useState<Project | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
// ... 39 weitere States
```

**Aktion:**
- [ ] Jeden State auf Verwendung prüfen
- [ ] Unused States entfernen

#### 0.5.4 Kommentierte Code-Blöcke

```bash
grep -n "^[[:space:]]*//" src/app/dashboard/projects/[projectId]/page.tsx | wc -l
```

**Aktion:**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Entscheiden: Implementieren oder löschen?
- [ ] Code-Blöcke entfernen

#### 0.5.5 ESLint Auto-Fix

```bash
npx eslint src/app/dashboard/projects/[projectId]/page.tsx --fix
npx eslint src/app/dashboard/projects/[projectId]/page.tsx
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Verbleibende Warnings manuell fixen

#### 0.5.6 Manueller Test

```bash
npm run dev
# Browser: http://localhost:3000/dashboard/projects/[projectId]
```

**Testschritte:**
- [ ] Projekt-Detail-Page öffnen
- [ ] Alle 7 Tabs testen
- [ ] Team Management Modal testen
- [ ] Edit Wizard testen
- [ ] Floating Chat testen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare: ~X entfernt
- [ ] Console-Logs: ~Y entfernt
- [ ] Unused States: ~Z entfernt
- [ ] Kommentierte Code-Blöcke: ~A entfernt
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test: Bestanden ✅

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- [X] TODO-Kommentare
- ~[Y] Debug-Console-Logs
- [Z] Unused State-Variablen
- [A] Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Ergebnis
- page.tsx: 1.412 → [X] Zeilen (-[Y] Zeilen toter Code)
- Saubere Basis für Phase 1 (Context Integration)

### Manueller Test
- ✅ Alle 7 Tabs laden
- ✅ Edit Wizard funktioniert
- ✅ Team Management funktioniert
- ✅ Floating Chat funktioniert
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Unused States entfernt
- [A] Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

page.tsx: 1.412 → [X] Zeilen (-[Y] Zeilen toter Code)

Saubere Basis für Context Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: ProjectContext Integration

**Ziel:** Props-Drilling vermeiden durch Context

**Dauer:** 2-3 Stunden

#### 1.1 ProjectContext erstellen

**Datei:** `src/app/dashboard/projects/[projectId]/context/ProjectContext.tsx`

```typescript
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/types/project';

interface ProjectContextValue {
  // Project Data
  project: Project | null;
  setProject: (project: Project | null) => void;

  // IDs
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

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
  organizationId: string;
  initialProject?: Project | null;
}

export function ProjectProvider({
  children,
  projectId,
  organizationId,
  initialProject = null,
}: ProjectProviderProps) {
  const [project, setProject] = useState<Project | null>(initialProject);
  const [activeTab, setActiveTab] = useState<ProjectContextValue['activeTab']>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadProject = async () => {
    // Wird in page.tsx implementiert und übergeben
    console.log('Reload project');
  };

  const value: ProjectContextValue = {
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
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

// Custom Hook
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
```

#### 1.2 page.tsx anpassen

**Änderungen:**

1. **ProjectProvider einbinden:**
```typescript
import { ProjectProvider } from './context/ProjectContext';

export default function ProjectDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const projectId = params.projectId as string;

  // Basis-Daten laden
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadProject();
    }
  }, [projectId, currentOrganization?.id]);

  const loadProject = async () => {
    // ... existing logic
  };

  return (
    <ProjectProvider
      projectId={projectId}
      organizationId={currentOrganization?.id || ''}
      initialProject={project}
    >
      {/* Komponenten hier */}
    </ProjectProvider>
  );
}
```

2. **Props-Drilling entfernen:**

Alle Child-Komponenten können jetzt `useProject()` nutzen:

```typescript
// Vorher (Props-Drilling)
<ProjectTaskManager
  projectId={project.id!}
  organizationId={currentOrganization.id}
  projectManagerId={project.projectManager}
  // ...
/>

// Nachher (Context)
<ProjectTaskManager />
// TaskManager nutzt intern: const { project, organizationId } = useProject();
```

#### 1.3 Child-Komponenten anpassen

**Komponenten die Context nutzen sollten:**

1. **ProjectTaskManager** (Tasks Tab)
2. **ProjectStrategyTab** (Strategie Tab)
3. **ProjectFoldersView** (Daten/Strategie Tab)
4. **ProjectPressemeldungenTab** (Pressemeldung Tab)
5. **ProjectDistributionLists** (Verteiler Tab)
6. **ProjectMonitoringTab** (Monitoring Tab)
7. **PipelineProgressDashboard** (Overview Tab)
8. **ProjectGuideBox** (Overview Tab)
9. **FloatingChat** (Global)

**Wichtig:** Nicht alle Komponenten sofort ändern! Nur die, die mehrere Props bekommen.

**Priorität:**
- **Phase 1:** Nur Context einführen, kleine Komponenten anpassen
- **Später (Phase 2):** Große Komponenten refactorn (Tasks, Pressemeldung)

#### Checkliste Phase 1

- [ ] ProjectContext.tsx erstellt (100 Zeilen)
- [ ] Custom Hook `useProject()` implementiert
- [ ] ProjectProvider in page.tsx eingebunden
- [ ] FloatingChat auf Context umgestellt
- [ ] PipelineProgressDashboard auf Context umgestellt
- [ ] ProjectGuideBox auf Context umgestellt
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test durchgeführt

#### Deliverable

```markdown
## Phase 1: ProjectContext Integration ✅

### Implementiert
- ProjectContext.tsx (100 Zeilen)
- Custom Hook useProject()
- ProjectProvider in page.tsx

### Vorteile
- Props-Drilling vermieden (organizationId, projectId, activeTab)
- Zentralisierte State Management für Project-Daten
- Einfacherer Code in Child-Komponenten
- Type-Safe Context Access

### Angepasste Komponenten
- FloatingChat
- PipelineProgressDashboard
- ProjectGuideBox

### Noch zu migrieren (Phase 2+)
- ProjectTaskManager (Großes Refactoring separat)
- ProjectPressemeldungenTab (Großes Refactoring separat)
- Weitere Komponenten nach Bedarf
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - ProjectContext Integration

- ProjectContext.tsx erstellt (100 Zeilen)
- Custom Hook useProject() implementiert
- ProjectProvider in page.tsx eingebunden
- Props-Drilling für organizationId, projectId, activeTab entfernt
- FloatingChat, PipelineProgressDashboard, ProjectGuideBox auf Context umgestellt

Vorteile:
- Zentralisiertes State Management
- Type-Safe Context Access
- Weniger Boilerplate in Child-Komponenten

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** page.tsx von 1.412 → < 400 Zeilen

**Dauer:** 3-4 Stunden

#### 2.1 ProjectHeader extrahieren

**Datei:** `src/app/dashboard/projects/[projectId]/components/header/ProjectHeader.tsx`

**Inhalt (Zeile 699-876):**
- Zurück-Button
- Titel + Status Badge
- Erstellt-Datum
- Team-Avatare
- Bearbeiten-Button
- Mehr-Optionen Dropdown (Team, Löschen)

**Props:**
```typescript
interface ProjectHeaderProps {
  onEditClick: () => void;
  onTeamManageClick: () => void;
  onDeleteClick: () => void;
}
```

**Verwendung in page.tsx:**
```typescript
import { ProjectHeader } from './components/header';

<ProjectHeader
  onEditClick={() => setShowEditWizard(true)}
  onTeamManageClick={() => setShowTeamModal(true)}
  onDeleteClick={handleDeleteProject}
/>
```

#### 2.2 ProjectInfoBar extrahieren

**Datei:** `src/app/dashboard/projects/[projectId]/components/header/ProjectInfoBar.tsx`

**Inhalt (Zeile 804-876):**
- Trennlinie
- Phase
- Kunde (mit Link)
- Priorität
- Deadline
- Tags

**Props:**
```typescript
interface ProjectInfoBarProps {
  // Keine Props - nutzt useProject() Context
}
```

#### 2.3 TabNavigation extrahieren

**Datei:** `src/app/dashboard/projects/[projectId]/components/tabs/TabNavigation.tsx`

**Inhalt (Zeile 881-985):**
- 7 Tab-Buttons
- Aktiver Tab Highlighting
- Icons pro Tab

**Props:**
```typescript
interface TabNavigationProps {
  // Keine Props - nutzt useProject() Context (activeTab, setActiveTab)
}
```

#### 2.4 Shared Components

##### LoadingState.tsx

**Datei:** `src/app/dashboard/projects/[projectId]/components/shared/LoadingState.tsx`

```typescript
import { Text } from '@/components/ui/text';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">Projekt wird geladen...</Text>
    </div>
  );
}
```

##### ErrorBoundary.tsx

**Datei:** `src/app/dashboard/projects/[projectId]/components/shared/ErrorBoundary.tsx`

```typescript
'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
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

#### 2.5 Barrel Exports

**Datei:** `src/app/dashboard/projects/[projectId]/components/header/index.ts`

```typescript
export { ProjectHeader } from './ProjectHeader';
export { ProjectInfoBar } from './ProjectInfoBar';
```

**Datei:** `src/app/dashboard/projects/[projectId]/components/tabs/index.ts`

```typescript
export { TabNavigation } from './TabNavigation';
```

**Datei:** `src/app/dashboard/projects/[projectId]/components/shared/index.ts`

```typescript
export { LoadingState } from './LoadingState';
export { ErrorBoundary } from './ErrorBoundary';
```

#### 2.6 page.tsx vereinfachen

**Vorher:** 1.412 Zeilen (nach Cleanup: ~X Zeilen)

**Nachher (Struktur):**

```typescript
import { ProjectProvider } from './context/ProjectContext';
import { ProjectHeader, ProjectInfoBar } from './components/header';
import { TabNavigation } from './components/tabs';
import { LoadingState, ErrorBoundary } from './components/shared';

export default function ProjectDetailPage() {
  // State & Effects (~100 Zeilen)
  // Handler Functions (~150 Zeilen)

  if (loading) return <LoadingState />;
  if (error || !project) return <ErrorState />;

  return (
    <ProjectProvider projectId={projectId} organizationId={organizationId} initialProject={project}>
      <ErrorBoundary>
        <div>
          <ProjectHeader
            onEditClick={() => setShowEditWizard(true)}
            onTeamManageClick={() => setShowTeamModal(true)}
            onDeleteClick={handleDeleteProject}
          />

          <ProjectInfoBar />

          <div className="space-y-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200">
              <TabNavigation />

              <div className="p-6">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'tasks' && <TasksTab />}
                {/* ... weitere Tabs */}
              </div>
            </div>
          </div>

          {/* Modals */}
          {showEditWizard && <ProjectEditWizard ... />}
          {showTeamModal && <TeamManagementModal ... />}
          {showDeleteDialog && <Dialog ... />}

          {/* Floating Chat */}
          <FloatingChat />
        </div>
      </ErrorBoundary>
    </ProjectProvider>
  );
}
```

**Ziel:** < 400 Zeilen in page.tsx

#### Checkliste Phase 2

- [ ] ProjectHeader.tsx erstellt (120 Zeilen)
- [ ] ProjectInfoBar.tsx erstellt (80 Zeilen)
- [ ] TabNavigation.tsx erstellt (60 Zeilen)
- [ ] LoadingState.tsx erstellt (30 Zeilen)
- [ ] ErrorBoundary.tsx erstellt (50 Zeilen)
- [ ] Barrel Exports (index.ts) erstellt
- [ ] page.tsx auf < 400 Zeilen reduziert
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test durchgeführt

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Extrahierte Komponenten
- ProjectHeader.tsx (120 Zeilen)
- ProjectInfoBar.tsx (80 Zeilen)
- TabNavigation.tsx (60 Zeilen)
- LoadingState.tsx (30 Zeilen)
- ErrorBoundary.tsx (50 Zeilen)
- Barrel Exports (3x index.ts)

### Code-Reduktion
- page.tsx: [X] Zeilen → 380 Zeilen (-[Y] Zeilen, -[Z]%)
- Gesamt: +340 Zeilen (neue Komponenten)

### Vorteile
- Bessere Code-Lesbarkeit
- Einfachere Wartung
- Wiederverwendbare Komponenten
- Eigenständig testbare Komponenten
- Type-Safe Props

### Struktur
- components/header/ (2 Komponenten)
- components/tabs/ (1 Komponente)
- components/shared/ (2 Komponenten)
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung

Extrahierte Komponenten:
- ProjectHeader.tsx (120 Zeilen)
- ProjectInfoBar.tsx (80 Zeilen)
- TabNavigation.tsx (60 Zeilen)
- LoadingState.tsx (30 Zeilen)
- ErrorBoundary.tsx (50 Zeilen)

page.tsx: [X] → 380 Zeilen (-[Y] Zeilen, -[Z]%)

Vorteile:
- Bessere Lesbarkeit
- Wartbare Komponenten
- Type-Safe Props
- Barrel Exports für saubere Imports

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden

**Dauer:** 1-2 Stunden

#### 3.1 useCallback für Handler

```typescript
import { useCallback } from 'react';

// In page.tsx
const handleEditSuccess = useCallback((updatedProject: Project) => {
  setProject(updatedProject);
  toastService.success('Projekt erfolgreich aktualisiert');
  setTimeout(() => loadProject(), 500);
}, []);

const handleOpenPDF = useCallback(() => {
  if (currentPdfVersion?.downloadUrl) {
    window.open(currentPdfVersion.downloadUrl, '_blank');
  } else {
    toastService.warning('Kein PDF verfügbar. Bitte erstellen Sie zuerst ein PDF in der verknüpften Kampagne.');
  }
}, [currentPdfVersion]);

const handleDeleteProject = useCallback(() => {
  if (!project?.id || !currentOrganization?.id) return;
  setShowDeleteDialog(true);
}, [project?.id, currentOrganization?.id]);

const confirmDeleteProject = useCallback(async () => {
  if (!project?.id || !currentOrganization?.id) return;

  try {
    await projectService.delete(project.id, { organizationId: currentOrganization.id });
    setShowDeleteDialog(false);
    toastService.success('Projekt erfolgreich gelöscht');
    router.push('/dashboard/projects');
  } catch (error: any) {
    console.error('Fehler beim Löschen:', error);
    setShowDeleteDialog(false);
    toastService.error(error.message || 'Fehler beim Löschen des Projekts');
  }
}, [project?.id, currentOrganization?.id, router]);
```

#### 3.2 useMemo für Computed Values

```typescript
import { useMemo } from 'react';

// In page.tsx
const projectStatusColor = useMemo(() => {
  if (!project) return 'zinc';
  switch (project.status) {
    case 'active': return 'green';
    case 'on_hold': return 'yellow';
    case 'completed': return 'blue';
    case 'cancelled': return 'red';
    default: return 'zinc';
  }
}, [project?.status]);

const assignedTeamMembers = useMemo(() => {
  if (!project?.assignedTo || !teamMembers.length) return [];

  return project.assignedTo
    .map(userId => teamMembers.find(m => m.userId === userId || m.id === userId))
    .filter(Boolean)
    .slice(0, 5);
}, [project?.assignedTo, teamMembers]);

const todayTasksCount = useMemo(() => {
  return todayTasks.length;
}, [todayTasks.length]);
```

#### 3.3 React.memo für Komponenten

```typescript
// In ProjectHeader.tsx
import React from 'react';

export const ProjectHeader = React.memo(function ProjectHeader({
  onEditClick,
  onTeamManageClick,
  onDeleteClick
}: Props) {
  // ... component code
});

// In ProjectInfoBar.tsx
export const ProjectInfoBar = React.memo(function ProjectInfoBar() {
  // ... component code
});

// In TabNavigation.tsx
export const TabNavigation = React.memo(function TabNavigation() {
  // ... component code
});
```

#### 3.4 ProjectContext optimieren

```typescript
// In ProjectContext.tsx
const reloadProject = useCallback(async () => {
  setLoading(true);
  try {
    const projectData = await projectService.getById(projectId, {
      organizationId
    });
    setProject(projectData);
  } catch (error) {
    setError('Fehler beim Laden des Projekts');
  } finally {
    setLoading(false);
  }
}, [projectId, organizationId]);

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

#### Checkliste Phase 3

- [ ] useCallback für Handler (5+ Handler)
- [ ] useMemo für Computed Values (3+ Values)
- [ ] React.memo für Komponenten (3 Komponenten)
- [ ] ProjectContext optimiert (useMemo für value)
- [ ] Performance-Test durchgeführt (React DevTools Profiler)

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 5 Handler
- useMemo für 3 Computed Values
- React.memo für 3 Komponenten
- ProjectContext optimiert (useMemo)

### Messbare Verbesserungen
- Re-Renders reduziert um ~X%
- Handler-Instanziierung optimiert
- Context-Updates minimiert

### Komponenten optimiert
- ProjectHeader (React.memo)
- ProjectInfoBar (React.memo)
- TabNavigation (React.memo)
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung

- useCallback für 5 Handler
- useMemo für 3 Computed Values
- React.memo für 3 Komponenten
- ProjectContext optimiert (useMemo für value)

Resultat:
- Re-Renders reduziert
- Handler-Instanziierung optimiert
- Context-Updates minimiert

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**Dauer:** 2-3 Stunden

**WICHTIG:** Diese Phase wird vom `refactoring-test` Agent durchgeführt!

Der Agent garantiert:
- ✅ 100% Implementierung (KEINE TODOs)
- ✅ ALLE Tests vollständig implementiert
- ✅ Keine "analog" Kommentare
- ✅ >80% Coverage

#### 4.1 Agent aufrufen

**Task für refactoring-test Agent:**

```markdown
Erstelle vollständige Test Suite für Project Detail Page Refactoring:

**Modul:** Project Detail Page (Phase 1.1)
**Pfad:** src/app/dashboard/projects/[projectId]/
**Entry Point:** page.tsx

**Zu testen:**
1. ProjectContext Hook (5 Tests)
   - Context-Werte bereitstellen
   - activeTab ändern
   - project State Management
   - loading/error States
   - Error bei Verwendung außerhalb Provider

2. ProjectHeader Component (3 Tests)
   - Rendering
   - Edit-Handler
   - Delete-Handler

3. ProjectInfoBar Component (2 Tests)
   - Phase/Kunde/Deadline Display
   - Tag Rendering

4. TabNavigation Component (2 Tests)
   - Tab Switching
   - Active-State Highlighting

5. Integration Tests (2 Tests)
   - Full Page Load Flow
   - Tab Navigation Flow

**Ziel:** 14 Tests, >80% Coverage, ALLE vollständig implementiert
```

#### 4.2 ProjectContext Tests (Beispiel)

**Datei:** `src/app/dashboard/projects/[projectId]/__tests__/unit/ProjectContext.test.tsx`

```typescript
import { renderHook, act } from '@testing-library/react';
import { ProjectProvider, useProject } from '../../context/ProjectContext';

function createWrapper(projectId: string, organizationId: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <ProjectProvider projectId={projectId} organizationId={organizationId}>
      {children}
    </ProjectProvider>
  );
}

describe('ProjectContext', () => {
  it('sollte Context-Werte bereitstellen', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: createWrapper('project-123', 'org-123')
    });

    expect(result.current.projectId).toBe('project-123');
    expect(result.current.organizationId).toBe('org-123');
    expect(result.current.activeTab).toBe('overview');
  });

  it('sollte activeTab ändern können', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: createWrapper('project-123', 'org-123')
    });

    act(() => {
      result.current.setActiveTab('tasks');
    });

    expect(result.current.activeTab).toBe('tasks');
  });

  it('sollte Error werfen wenn außerhalb Provider verwendet', () => {
    expect(() => {
      renderHook(() => useProject());
    }).toThrow('useProject must be used within a ProjectProvider');
  });
});
```

#### 4.2 ProjectHeader Tests

**Datei:** `src/app/dashboard/projects/[projectId]/__tests__/unit/ProjectHeader.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectProvider } from '../../context/ProjectContext';
import { ProjectHeader } from '../../components/header/ProjectHeader';

function renderWithContext(ui: React.ReactElement) {
  return render(
    <ProjectProvider projectId="test-123" organizationId="org-123">
      {ui}
    </ProjectProvider>
  );
}

describe('ProjectHeader', () => {
  it('sollte Bearbeiten-Button rendern', () => {
    const onEditClick = jest.fn();
    renderWithContext(
      <ProjectHeader
        onEditClick={onEditClick}
        onTeamManageClick={jest.fn()}
        onDeleteClick={jest.fn()}
      />
    );

    expect(screen.getByText(/Bearbeiten/i)).toBeInTheDocument();
  });

  it('sollte Edit-Handler aufrufen', async () => {
    const user = userEvent.setup();
    const onEditClick = jest.fn();

    renderWithContext(
      <ProjectHeader
        onEditClick={onEditClick}
        onTeamManageClick={jest.fn()}
        onDeleteClick={jest.fn()}
      />
    );

    const editButton = screen.getByText(/Bearbeiten/i);
    await user.click(editButton);

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });
});
```

#### 4.3 Integration Tests

**Datei:** `src/app/dashboard/projects/[projectId]/__tests__/integration/project-detail-page-flow.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectDetailPage from '../../page';
import * as projectService from '@/lib/firebase/project-service';

jest.mock('@/lib/firebase/project-service');
jest.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'test-123' }),
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Project Detail Page Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Projekt laden und anzeigen', async () => {
    const mockProject = {
      id: 'test-123',
      title: 'Test Project',
      status: 'active',
      currentStage: 'creation',
    };

    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);

    render(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('sollte Tab-Navigation funktionieren', async () => {
    const user = userEvent.setup();
    const mockProject = {
      id: 'test-123',
      title: 'Test Project',
      status: 'active',
    };

    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);

    render(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click Tasks Tab
    const tasksTab = screen.getByText('Tasks');
    await user.click(tasksTab);

    // Verify Tab switched
    expect(screen.getByText(/Übersicht/i)).toBeInTheDocument();
  });
});
```

#### Checkliste Phase 4

- [ ] refactoring-test Agent Task erstellt (siehe 4.1)
- [ ] Agent hat Test Suite erstellt
- [ ] ProjectContext Tests (5 Tests) - vollständig implementiert
- [ ] ProjectHeader Tests (3 Tests) - vollständig implementiert
- [ ] ProjectInfoBar Tests (2 Tests) - vollständig implementiert
- [ ] TabNavigation Tests (2 Tests) - vollständig implementiert
- [ ] Integration Test (2 Tests) - vollständig implementiert
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt
- [ ] Coverage >80%
- [ ] KEINE TODOs in Test-Dateien
- [ ] KEINE "analog" Kommentare

#### Deliverable

```markdown
## Phase 4: Testing ✅

### Test Suite (via refactoring-test Agent)
- ProjectContext Tests: 5/5 bestanden ✅ VOLLSTÄNDIG implementiert
- ProjectHeader Tests: 3/3 bestanden ✅ VOLLSTÄNDIG implementiert
- ProjectInfoBar Tests: 2/2 bestanden ✅ VOLLSTÄNDIG implementiert
- TabNavigation Tests: 2/2 bestanden ✅ VOLLSTÄNDIG implementiert
- Integration Tests: 2/2 bestanden ✅ VOLLSTÄNDIG implementiert
- **Gesamt: 14/14 Tests bestanden**

### Coverage
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%

### Test-Kategorien
- Unit Tests: 12 Tests
- Integration Tests: 2 Tests

### Quality Guarantees
- ✅ KEINE TODOs in Test-Dateien
- ✅ KEINE "analog" Kommentare
- ✅ 100% Implementierung durch Agent
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt

Via refactoring-test Agent:
- ProjectContext Tests (5 Tests) ✅ VOLLSTÄNDIG
- ProjectHeader Tests (3 Tests) ✅ VOLLSTÄNDIG
- ProjectInfoBar Tests (2 Tests) ✅ VOLLSTÄNDIG
- TabNavigation Tests (2 Tests) ✅ VOLLSTÄNDIG
- Integration Tests (2 Tests) ✅ VOLLSTÄNDIG

Gesamt: 14/14 Tests bestanden
Coverage: >80%
KEINE TODOs, 100% Implementierung

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation

**Ziel:** Vollständige, wartbare Dokumentation

**Dauer:** 2-3 Stunden

**WICHTIG:** Diese Phase wird vom `refactoring-dokumentation` Agent durchgeführt!

#### 5.1 Dokumentations-Struktur

```
docs/projects/detail-page/
├── README.md (Hauptdokumentation)
├── api/
│   └── README.md (Context API)
├── components/
│   └── README.md (Komponenten-Dokumentation)
└── adr/
    └── README.md (Architecture Decision Records)
```

#### 5.2 Agent aufrufen

```markdown
@refactoring-dokumentation

Erstelle vollständige Dokumentation für das Project Detail Page Refactoring:

**Modul:** Project Detail Page (Phase 1.1)
**Pfad:** src/app/dashboard/projects/[projectId]/
**Entry Point:** page.tsx

**Dateien zu dokumentieren:**
- context/ProjectContext.tsx
- components/header/ProjectHeader.tsx
- components/header/ProjectInfoBar.tsx
- components/tabs/TabNavigation.tsx
- components/shared/LoadingState.tsx
- components/shared/ErrorBoundary.tsx

**Zielstruktur:** docs/projects/detail-page/

**Fokus:**
- ProjectContext API (useProject Hook)
- Komponenten-Props
- Performance-Optimierungen
- Testing-Strategie
- ADRs (Context vs Props-Drilling)

**Geschätzte Dokumentation:** 1.500+ Zeilen
```

#### Checkliste Phase 5

- [ ] Agent-Task erstellt
- [ ] README.md erstellt (300+ Zeilen)
- [ ] api/README.md erstellt (200+ Zeilen)
- [ ] components/README.md erstellt (400+ Zeilen)
- [ ] adr/README.md erstellt (300+ Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅

### Erstellt (via refactoring-dokumentation Agent)
- README.md (300+ Zeilen) - Hauptdokumentation
- api/README.md (200+ Zeilen) - Context API
- components/README.md (400+ Zeilen) - Komponenten
- adr/README.md (300+ Zeilen) - Architecture Decisions

### Gesamt
- **1.200+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Context-API-Referenz
- Performance-Best-Practices
```

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt

- README.md (300+ Zeilen)
- api/README.md (200+ Zeilen) - Context API
- components/README.md (400+ Zeilen)
- adr/README.md (300+ Zeilen)

Gesamt: 1.200+ Zeilen Dokumentation

Via refactoring-dokumentation Agent erstellt.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

**Dauer:** 1-2 Stunden

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit
```

**Zu beheben:**
- Missing imports
- Incorrect prop types
- Type mismatches in Context
- Optional chaining where needed

#### 6.2 ESLint Check

```bash
npx eslint src/app/dashboard/projects/[projectId] --fix
npx eslint src/app/dashboard/projects/[projectId]
```

**Zu beheben:**
- Unused imports
- Missing dependencies in useCallback/useMemo
- console.log statements

#### 6.3 Console Cleanup

```bash
rg "console\." src/app/dashboard/projects/[projectId]
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors in catch
catch (error) {
  console.error('Failed to load project:', error);
}
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('project:', project);
console.log('Loading tab:', activeTab);
```

#### 6.4 Design System Compliance

**Checklist:**
```bash
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary Actions
✓ Konsistente Borders (zinc-300)
✓ Focus-Rings (focus:ring-2 focus:ring-primary)
```

**Prüfen:**
- ProjectHeader: Icons, Buttons, Badges
- ProjectInfoBar: Icons, Text-Colors
- TabNavigation: Active-State Color (#005fab)

#### 6.5 Final Build Test

```bash
npm run build
npm run start
```

**Prüfen:**
- Build erfolgreich?
- App startet?
- Project Detail Page funktioniert?
- Alle 7 Tabs laden?
- Keine Console-Errors?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Nur console.error in catch
- [ ] Design System: Compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: Bestanden
- [ ] Performance: Flüssiges UI
- [ ] Accessibility: Focus-States vorhanden

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- [Liste von behobenen TypeScript-Fehlern]
- [Liste von behobenen ESLint-Warnings]

### Design System Compliance
- ProjectHeader: ✅ Icons /24/outline, Primary #005fab
- ProjectInfoBar: ✅ Zinc-Palette
- TabNavigation: ✅ Primary #005fab für Active-State
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt

- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Console-Cleanup: [X] Debug-Logs entfernt
- Design System: Vollständig compliant
- Build: Erfolgreich
- Production-Test: Bestanden

Alle Komponenten production-ready.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Check (PFLICHT vor Merge!)

**Ziel:** Umfassender Quality Check durch spezialisierten Agent

**Dauer:** 1-2 Stunden (inkl. Bugfixes)

**WICHTIG:** Diese Phase wird vom `refactoring-quality-check` Agent durchgeführt!

Der Agent prüft:
- ✅ ALLE Refactoring-Phasen VOLLSTÄNDIG implementiert
- ✅ Nicht nur Dateien erstellt, sondern INTEGRIERT
- ✅ Alter Code ENTFERNT (keine doppelte Logik)
- ✅ Tests BESTEHEN (nicht nur vorhanden)
- ✅ Keine TODOs, keine Platzhalter
- ✅ Alle Komponenten tatsächlich VERWENDET

#### 6.5.1 Agent aufrufen

**Task für refactoring-quality-check Agent:**

```markdown
Führe umfassenden Quality Check für Project Detail Page Refactoring durch:

**Modul:** Project Detail Page (Phase 1.1)
**Pfad:** src/app/dashboard/projects/[projectId]/
**Refactoring-Plan:** docs/planning/global/project-detail-page-refactoring.md

**Zu prüfen:**

1. Phase 0.5 (Cleanup)
   - Keine TODO-Kommentare mehr
   - Keine console.log Debug-Statements
   - Kein kommentierter Code
   - Keine unused States

2. Phase 1 (Context)
   - ProjectContext existiert UND wird verwendet
   - page.tsx importiert und nutzt Provider
   - Keine Props-Drilling mehr für projectId/organizationId/activeTab

3. Phase 2 (Components)
   - 6 Komponenten existieren UND werden in page.tsx importiert
   - Alter Code in page.tsx ENTFERNT (nicht nur auskommentiert)
   - Barrel Exports (index.ts) funktionieren

4. Phase 3 (Performance)
   - useCallback/useMemo tatsächlich implementiert
   - React.memo wo sinnvoll eingesetzt
   - Keine unnötigen Re-Renders

5. Phase 4 (Testing)
   - 14 Tests BESTEHEN (nicht nur existieren)
   - npm test läuft fehlerfrei durch
   - Coverage >80%

6. Phase 5 (Dokumentation)
   - docs/projects/detail-page/ existiert
   - README.md ist aussagekräftig (nicht Platzhalter)
   - Code-Beispiele funktionieren

7. Phase 6 (Production)
   - TypeScript: npx tsc --noEmit → 0 Fehler
   - ESLint: 0 Warnings
   - Build: npm run build → erfolgreich

**Ergebnis:** Liste aller gefundenen Probleme mit genauen Zeilen-Nummern
```

#### 6.5.2 Gefundene Probleme beheben

Der Agent wird alle Probleme dokumentieren. Beispiel-Findings:

```markdown
### Quality Check Findings

❌ **Problem 1:** ProjectContext wird nicht verwendet
- Datei: src/app/dashboard/projects/[projectId]/page.tsx:15
- Issue: ProjectProvider ist importiert, aber nicht um JSX gewickelt
- Fix: Wrap <ProjectProvider> um alle Komponenten

❌ **Problem 2:** Alter Code nicht entfernt
- Datei: src/app/dashboard/projects/[projectId]/page.tsx:250-280
- Issue: Header-Rendering-Code noch in page.tsx, obwohl ProjectHeader existiert
- Fix: Zeilen 250-280 löschen, durch <ProjectHeader /> ersetzen

✅ **Problem 3:** Tests bestehen
- Status: 14/14 Tests passed

❌ **Problem 4:** TODO in Context
- Datei: src/app/dashboard/projects/[projectId]/context/ProjectContext.tsx:45
- Issue: // TODO: Error Handling
- Fix: Error Handling implementieren oder TODO entfernen
```

#### 6.5.3 Alle Probleme beheben

**Jedes gefundene Problem MUSS behoben werden:**

```bash
# Beispiel: Problem 1 beheben
# Wrap ProjectProvider um JSX in page.tsx

# Beispiel: Problem 2 beheben
# Entferne Zeilen 250-280 in page.tsx

# Beispiel: Problem 4 beheben
# Implementiere Error Handling in ProjectContext
```

#### 6.5.4 Erneuter Check

**Nach Bugfixes:**

```bash
# Tests erneut durchführen
npm test -- projects/[projectId]

# TypeScript Check
npx tsc --noEmit

# Build Test
npm run build
```

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent Task erstellt
- [ ] Agent hat Quality Check durchgeführt
- [ ] Alle gefundenen Probleme dokumentiert
- [ ] ALLE Probleme behoben (0 offene Findings)
- [ ] Tests bestehen nach Fixes
- [ ] TypeScript: 0 Fehler nach Fixes
- [ ] Build erfolgreich nach Fixes
- [ ] Erneuter Agent-Check durchgeführt (alle grün ✅)

#### Deliverable

```markdown
## Phase 6.5: Quality Check ✅

### Quality Check Report (via refactoring-quality-check Agent)

#### Initial Findings
- ❌ Probleme gefunden: [X]
- ✅ Checks bestanden: [Y]

#### Behobene Probleme
1. ProjectContext Integration: ✅ Behoben
2. Alter Code Cleanup: ✅ Behoben
3. TODO Removal: ✅ Behoben
4. Test Failures: ✅ Behoben

#### Final Status
- ✅ Alle 7 Phasen vollständig implementiert
- ✅ Keine TODOs
- ✅ Kein alter Code mehr vorhanden
- ✅ Alle Tests bestehen (14/14)
- ✅ TypeScript: 0 Fehler
- ✅ Build: Erfolgreich

### Bereit für Merge zu Main
```

**Commit:**
```bash
git add .
git commit -m "fix: Phase 6.5 - Quality Check Findings behoben

Via refactoring-quality-check Agent:
- [X] Probleme identifiziert und behoben
- ProjectContext vollständig integriert
- Alter Code entfernt
- Alle TODOs behoben
- Tests: 14/14 bestanden
- TypeScript: 0 Fehler
- Build: Erfolgreich

Alle Phasen vollständig implementiert.
Bereit für Merge zu Main.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 7: Merge zu Main

**Ziel:** Code zu Main mergen

**Dauer:** 30 Minuten

#### Workflow

```bash
# 1. Finaler Test
npm test -- projects/[projectId]

# 2. Push Feature-Branch
git push origin feature/project-detail-page-refactoring

# 3. Zu Main wechseln und mergen
git checkout main
git pull origin main
git merge feature/project-detail-page-refactoring --no-ff

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test
```

#### Checkliste Merge

- [ ] Alle Phasen abgeschlossen:
  - [ ] Phase 0: Setup & Backup
  - [ ] Phase 0.5: Pre-Refactoring Cleanup
  - [ ] Phase 1: Context Integration
  - [ ] Phase 2: Code-Modularisierung
  - [ ] Phase 3: Performance-Optimierung
  - [ ] Phase 4: Testing (via refactoring-test Agent)
  - [ ] Phase 5: Dokumentation (via refactoring-dokumentation Agent)
  - [ ] Phase 6: Production-Ready Quality
  - [ ] **Phase 6.5: Quality Check (via refactoring-quality-check Agent)** ⚠️ PFLICHT!
- [ ] Quality Check Agent hat grünes Licht gegeben
- [ ] ALLE gefundenen Probleme behoben
- [ ] Alle Tests bestehen (14/14)
- [ ] TypeScript: 0 Fehler
- [ ] Build erfolgreich
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Production-Deployment geplant

#### Final Report

```markdown
## ✅ Project Detail Page Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen
- **Tests:** 14/14 bestanden
- **Coverage:** [X]%
- **Dokumentation:** 1.200+ Zeilen

### Änderungen
- page.tsx: 1.412 → 380 Zeilen (-1.032 Zeilen, -73%)
- +6 neue Komponenten (+340 Zeilen)
- +1 ProjectContext (+100 Zeilen)
- **Netto:** -592 Zeilen

### Highlights
- ProjectContext eingeführt (Props-Drilling eliminiert)
- 6 wiederverwendbare Komponenten extrahiert
- Performance-Optimierungen (useCallback, useMemo, React.memo)
- Comprehensive Test Suite (14 Tests)
- 1.200+ Zeilen Dokumentation

### Architektur
**Vorher:**
- 1 Monolith-Datei (1.412 Zeilen)
- Props-Drilling zu allen Tabs
- Keine Wiederverwendbarkeit

**Nachher:**
- Orchestrator-Page (380 Zeilen)
- ProjectContext für State-Sharing
- 6 modulare Komponenten (< 120 Zeilen)
- Type-Safe Context API

### Nächste Schritte
- [ ] Phase 2.1: Overview Tab refactorn
- [ ] Phase 2.2: Tasks Tab refactorn (XL Aufwand!)
- [ ] Phase 2.3+: Weitere Tabs refactorn
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** page.tsx: 1.412 → 380 Zeilen (-73%)
- **Komponenten-Größe:** Alle < 120 Zeilen ✅
- **Props-Drilling:** Eliminiert ✅
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** >80%
- **Anzahl Tests:** 14 Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Reduktion durch React.memo + useCallback
- **Context-Updates:** Optimiert durch useMemo
- **Handler-Instanziierung:** Optimiert durch useCallback

### Dokumentation

- **Zeilen:** 1.200+ Zeilen
- **Dateien:** 4 Dokumente
- **Code-Beispiele:** 15+ Beispiele

---

## 🔗 Referenzen

### Projekt-Spezifisch

- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Master Checklist:** `docs/planning/master-refactoring-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`

### Weitere Module (Abhängigkeiten)

- **Phase 0.1:** ProjectFoldersView (bereits refactored ✅)
- **Phase 0.2:** Communication Components (bereits refactored ✅)
- **Phase 2.1-2.7:** Tab-Module (folgen nach Phase 1.1)

---

## 💡 Wichtige Entscheidungen

### Warum kein React Query?

**Context:** Project Detail Page lädt Daten einmal und cached sie in Context.

**Entscheidung:** Kein React Query in Phase 1.

**Begründung:**
- Project wird nur 1x geladen beim Mount
- Kein automatisches Refetching nötig
- Context reicht für State-Sharing zwischen Tabs
- React Query kann später hinzugefügt werden (optional)

**Alternative für später:**
- Phase 1.1+: React Query für Project-Daten
- Automatisches Caching (5min staleTime)
- Optimistic Updates bei Project-Änderungen

### Warum kein Admin SDK?

**Context:** Project Detail Page führt nur READ-Operationen durch.

**Entscheidung:** Kein Admin SDK nötig.

**Begründung:**
- Keine User-Generated Content
- Kein Rate-Limiting nötig
- Security Rules in Firestore reichen
- Project-Updates sind selten (keine spam-Gefahr)

**Admin SDK ist nötig bei:**
- User-Generated Content (Chat-Messages)
- Rate-Limiting (10 Messages/Minute)
- Content-Moderation (Profanity-Filter)
- Server-Side Validation

---

## 🚀 Nächste Schritte

**Nach Phase 1.1:**

1. **Phase 2.1:** Overview Tab refactorn
2. **Phase 2.2:** Tasks Tab refactorn (XL Aufwand, eigener Plan!)
3. **Phase 2.3:** Strategie Tab refactorn
4. **Phase 2.4:** Daten Tab refactorn
5. **Phase 2.5:** Verteiler Tab refactorn
6. **Phase 2.6:** Pressemeldung Tab refactorn (XL Aufwand!)
7. **Phase 2.7:** Monitoring Tab refactorn

**Priorität:**
- **P1 (High):** Overview, Tasks (meist genutzt)
- **P2 (Medium):** Strategie, Daten, Verteiler, Pressemeldung
- **P3 (Low):** Monitoring

---

**Version:** 1.1
**Erstellt:** 2025-10-21
**Maintainer:** CeleroPress Team

**Changelog:**
- 2025-10-21 (v1.1): Agent-Integration für Phase 4, 5, 6.5
  - Phase 4 (Testing): refactoring-test Agent hinzugefügt
  - Phase 5 (Dokumentation): refactoring-dokumentation Agent bereits vorhanden
  - Phase 6.5 (Quality Check): refactoring-quality-check Agent neu eingefügt (PFLICHT vor Merge!)
  - Phasen-Übersicht aktualisiert
  - Phase 7 Checkliste erweitert
- 2025-10-21 (v1.0): Initiale Plan-Erstellung (Phase 1.1)

---

*Dieser Plan ist ein lebendes Dokument. Feedback und Verbesserungen sind willkommen!*

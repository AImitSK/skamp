# Overview Tab Refactoring - Implementierungsplan

**Version:** 1.0
**Modul:** Overview Tab (Project Detail Page)
**Basiert auf:** Modul-Refactoring-Template v1.1
**Projekt:** CeleroPress - SKAMP
**Erstellt:** 2025-10-21

---

## 📋 Übersicht

**Ziel:** Refactoring des Overview Tabs in der Project Detail Page mit Focus auf:
- React Query Integration für Tasks
- Toast-Service statt lokaler Alert-State
- Modularisierung von PipelineProgressDashboard
- Performance-Optimierung
- Comprehensive Testing
- Vollständige Dokumentation

**Entry Point:** `src/app/dashboard/projects/[projectId]/components/tab-content/OverviewTabContent.tsx`

**Geschätzter Aufwand:** M (Medium) - 2-3 Tage

---

## 🎯 Ziele

- [x] **Admin SDK Prüfung:** Nicht erforderlich (Guide Steps Security ist ausreichend)
- [ ] React Query für Task-Loading integrieren
- [ ] Toast-Service integrieren (Alert-State entfernen)
- [ ] PipelineProgressDashboard modularisieren
- [ ] Code-Duplication eliminieren (fixedProgressMap)
- [ ] Performance-Optimierungen implementieren
- [ ] Test-Coverage erreichen (>80%)
- [ ] Vollständige Dokumentation erstellen
- [ ] Production-Ready Code Quality sicherstellen

---

## 📁 Ist-Zustand

### Komponenten-Übersicht

| Komponente | Pfad | LOC | Status | Issues |
|------------|------|-----|--------|--------|
| OverviewTabContent | tab-content/OverviewTabContent.tsx | 169 | ✅ Klein | Props-Drilling |
| PipelineProgressDashboard | workflow/PipelineProgressDashboard.tsx | 223 | ⚠️ Mittel | Code-Dup, console.error |
| ProjectGuideBox | guides/ProjectGuideBox.tsx | 363 | ⚠️ Groß | OK (UI-Only) |

**Gesamt:** ~755 Zeilen

### Identifizierte Probleme

#### 🔴 KRITISCH

1. **Code-Duplication: fixedProgressMap**
   - Existiert 2x (PipelineProgressDashboard.tsx:54, project-service.ts:1261)
   - **Risiko:** Änderungen müssen an 2 Stellen gemacht werden
   - **Lösung:** Konstante in types/project.ts extrahieren

2. **Inkonsistente Definition "Kritische Tasks"**
   - Frontend: `priority === 'urgent' || 'high'`
   - Backend: `requiredForStageCompletion === true`
   - **Risiko:** Verschiedene Zahlen in UI vs. Backend
   - **Lösung:** Einheitliche Definition festlegen

3. **Console.error statt Toast**
   ```tsx
   console.error('Fehler beim Laden der Tasks:', error);
   // User sieht nichts!
   ```

#### ⚠️ MITTEL

4. **useState/useEffect statt React Query**
   - PipelineProgressDashboard.tsx:23-79
   - Keine Caching, keine auto-refetch

5. **Unused State: selectedTimeframe**
   - Zeile 22: `const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month');`
   - Wird NIE verwendet!

6. **Hardcoded Colors statt Design System**
   ```tsx
   const getProgressColor = (percent: number) => {
     if (percent >= 90) return 'bg-green-500'; // ❌
   ```

7. **Loading-State nicht visuell**
   - Nur Text: `{loading && <span>(Wird geladen...)</span>}`
   - Kein Spinner/Skeleton

### Dependencies

- ✅ React Query: Installiert
- ✅ toastService: Verfügbar (`src/lib/utils/toast.ts`)
- ✅ ProjectContext: Verfügbar
- ✅ Testing Libraries: Vorhanden

---

## 🚀 Die 7 Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/overview-tab-refactoring
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/components/projects/workflow/PipelineProgressDashboard.tsx
  wc -l src/components/projects/guides/ProjectGuideBox.tsx
  wc -l src/app/dashboard/projects/[projectId]/components/tab-content/OverviewTabContent.tsx
  ```

- [ ] Backup-Dateien erstellen
  ```bash
  cp src/components/projects/workflow/PipelineProgressDashboard.tsx \
     src/components/projects/workflow/PipelineProgressDashboard.backup.tsx
  ```

- [ ] Dependencies prüfen
  - [x] React Query installiert
  - [x] toastService verfügbar
  - [x] ProjectContext verfügbar

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/overview-tab-refactoring`
- Ist-Zustand: 3 Dateien, ~755 Zeilen Code
- Backups: PipelineProgressDashboard.backup.tsx
- Dependencies: Alle vorhanden

### Struktur (Ist)
- OverviewTabContent.tsx: 169 Zeilen
- PipelineProgressDashboard.tsx: 223 Zeilen
- ProjectGuideBox.tsx: 363 Zeilen

### Identifizierte Probleme
- Code-Duplication: fixedProgressMap (2x)
- Inkonsistente "Kritische Tasks" Definition
- console.error statt toastService
- Unused State: selectedTimeframe
- Hardcoded Colors

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Overview Tab Refactoring

- Feature-Branch erstellt
- Ist-Zustand dokumentiert: 3 Dateien, ~755 Zeilen
- Backup: PipelineProgressDashboard.backup.tsx
- Probleme identifiziert: 7 Issues (3 kritisch, 4 mittel)

Bereit für Pre-Refactoring Cleanup.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 1 Stunde

#### 0.5.1 Unused State entfernen

**PipelineProgressDashboard.tsx:22**
```typescript
// ❌ Unused State
const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month');
// → Wird nirgends verwendet
```

**Aktion:**
- [ ] State-Variable entfernen
- [ ] Prüfen ob Type auch entfernt werden kann

#### 0.5.2 Console-Logs durch Toast ersetzen

**PipelineProgressDashboard.tsx:72**
```typescript
// ❌ Aktuell
catch (error) {
  console.error('Fehler beim Laden der Tasks:', error);
}

// ✅ Soll
import { toastService } from '@/lib/utils/toast';

catch (error) {
  toastService.error('Fehler beim Laden der Tasks');
}
```

**Aktion:**
- [ ] toastService importieren
- [ ] console.error durch toastService.error ersetzen
- [ ] Weitere console.log/warn prüfen

#### 0.5.3 ESLint Auto-Fix

```bash
npx eslint src/components/projects/workflow/PipelineProgressDashboard.tsx --fix
npx eslint src/components/projects/guides/ProjectGuideBox.tsx --fix
npx eslint src/app/dashboard/projects/[projectId]/components/tab-content/OverviewTabContent.tsx --fix
```

#### 0.5.4 Manueller Test

```bash
npm run dev
# → /dashboard/projects/[projectId] aufrufen
# → Overview Tab testen
# → Keine Console-Errors
```

**Aktion:**
- [ ] Dev-Server starten
- [ ] Overview Tab öffnen
- [ ] Pipeline-Progress lädt
- [ ] Tasks werden angezeigt
- [ ] Guide Box funktioniert
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] Unused State entfernt (~3 Zeilen)
- [ ] console.error → toastService (~1 Zeile)
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- Unused State: selectedTimeframe (~3 Zeilen)
- console.error → toastService.error (1 Stelle)
- Unused imports (via ESLint)

### Ergebnis
- PipelineProgressDashboard.tsx: 223 → 220 Zeilen (-3)
- Saubere Basis für React Query Integration
- User sieht nun Fehlermeldungen via Toast

### Manueller Test
- ✅ Overview Tab lädt
- ✅ Pipeline-Progress funktioniert
- ✅ Tasks werden angezeigt
- ✅ Guide Box funktioniert
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- Unused State selectedTimeframe entfernt
- console.error → toastService.error
- Unused imports entfernt via ESLint

PipelineProgressDashboard.tsx: 223 → 220 Zeilen (-3)

Saubere Basis für React Query Integration.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Ziel:** Task-Loading mit React Query statt useState/useEffect

#### 1.1 Analyse: Was brauchen wir?

**PipelineProgressDashboard aktuell:**
- Lädt Tasks via `taskService.getByProjectId(projectId, organizationId)`
- Berechnet: completed, criticalTasks, taskCompletion
- Problem: Kein Caching, kein Auto-Refetch

**ProjectContext bereits verfügbar:**
- `projectId`, `organizationId` aus Context
- KEIN separater Hook nötig (Context bereits da!)

#### 1.2 Custom Hook erstellen

**ENTSCHEIDUNG:** Wir nutzen ProjectContext, aber brauchen einen zusätzlichen Hook für Task-Loading mit Progress-Berechnung.

Datei: `src/lib/hooks/useProjectTasks.ts` (NEU)

```typescript
import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/lib/firebase/task-service';
import { useMemo } from 'react';

export function useProjectTasks(projectId: string | undefined, organizationId: string | undefined) {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['project-tasks', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) throw new Error('Missing projectId or organizationId');
      return taskService.getByProjectId(organizationId, projectId);
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten (Tasks ändern sich häufiger)
  });

  // Progress-Berechnung als useMemo
  const progress = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const criticalTasks = tasks.filter(task =>
      (task.priority === 'urgent' || task.priority === 'high') &&
      task.status !== 'completed'
    ).length;

    return {
      totalTasks,
      completedTasks,
      taskCompletion: totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100),
      criticalTasksRemaining: criticalTasks,
    };
  }, [tasks]);

  return { tasks, progress, isLoading, error };
}
```

#### 1.3 PipelineProgressDashboard anpassen

**Entfernen:**
```typescript
// ❌ Alt
const [tasks, setTasks] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [progress, setProgress] = useState({ ... });

useEffect(() => {
  const loadTasksAndCalculateProgress = async () => { ... };
  loadTasksAndCalculateProgress();
}, [projectId, organizationId, currentStage]);
```

**Hinzufügen:**
```typescript
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';
import { toastService } from '@/lib/utils/toast';

export default function PipelineProgressDashboard() {
  const { project, projectId, organizationId, setActiveTab } = useProject();
  const currentStage = project?.currentStage || 'creation';

  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  // Error Handling
  if (error) {
    toastService.error('Fehler beim Laden der Tasks');
  }

  // Rest der Komponente...
}
```

#### 1.4 OverviewTabContent anpassen

**Aktuell:** Lädt `todayTasks` in page.tsx, reicht sie als Props durch

**Besser:** Hook direkt in OverviewTabContent verwenden (wenn nötig)

**ENTSCHEIDUNG:** Behalten wie ist, da `todayTasks` bereits im parent geladen werden.

#### Checkliste Phase 1

- [ ] useProjectTasks Hook erstellt
- [ ] Progress-Berechnung in Hook verschoben (useMemo)
- [ ] PipelineProgressDashboard auf React Query umgestellt
- [ ] Alte useState/useEffect entfernt
- [ ] Error Handling mit toastService
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test

#### Deliverable

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- useProjectTasks Hook (`src/lib/hooks/useProjectTasks.ts`)
- Query Hook für Tasks mit Auto-Caching (2min staleTime)
- Progress-Berechnung als useMemo im Hook
- Error Handling via toastService

### PipelineProgressDashboard
- useState/useEffect entfernt (~30 Zeilen)
- React Query Integration (+5 Zeilen)
- Netto: -25 Zeilen

### Vorteile
- Automatisches Caching (2min staleTime)
- Auto-Refetch bei Window-Focus
- Error Handling via React Query
- Progress-Berechnung optimiert (useMemo)

### Test
- ✅ Tasks werden geladen
- ✅ Progress wird berechnet
- ✅ Fehler werden via Toast angezeigt
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Overview Tab

- useProjectTasks Hook erstellt
- PipelineProgressDashboard auf React Query umgestellt
- Progress-Berechnung als useMemo optimiert
- Error Handling via toastService

PipelineProgressDashboard.tsx: 220 → 195 Zeilen (-25)

Automatisches Caching (2min) + Error Handling.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Code-Duplication eliminieren, Konstanten extrahieren

#### 2.1 fixedProgressMap extrahieren

**Problem:** Duplikat in 2 Dateien
- `PipelineProgressDashboard.tsx:54`
- `project-service.ts:1261`

**Lösung:** Konstante in types/project.ts

Datei: `src/types/project.ts` (UPDATE)

```typescript
// Konstante hinzufügen
export const PIPELINE_STAGE_PROGRESS = {
  'ideas_planning': 0,
  'creation': 20,
  'approval': 40,
  'distribution': 60,
  'monitoring': 80,
  'completed': 100
} as const;
```

**PipelineProgressDashboard.tsx:**
```typescript
import { PIPELINE_STAGE_PROGRESS } from '@/types/project';

// ✅ Verwenden
const pipelinePercent = PIPELINE_STAGE_PROGRESS[currentStage] || 0;
```

**project-service.ts:**
```typescript
import { PIPELINE_STAGE_PROGRESS } from '@/types/project';

// ✅ Verwenden
const overallPercent = PIPELINE_STAGE_PROGRESS[currentStage] || 0;
```

#### 2.2 Progress-Color-Helper extrahieren

**Problem:** Hardcoded Colors in getProgressColor()

**Lösung:** Design System Colors + Helper-Function

Datei: `src/lib/utils/progress-helpers.ts` (NEU)

```typescript
/**
 * Design System konforme Progress-Farben
 */
export const PROGRESS_COLORS = {
  high: 'bg-green-600',      // 90%+ - Design System green
  medium: 'bg-blue-600',     // 70-89% - Design System blue
  low: 'bg-amber-500',       // 50-69% - Design System amber
  critical: 'bg-red-600'     // <50% - Design System red
} as const;

export function getProgressColor(percent: number): string {
  if (percent >= 90) return PROGRESS_COLORS.high;
  if (percent >= 70) return PROGRESS_COLORS.medium;
  if (percent >= 50) return PROGRESS_COLORS.low;
  return PROGRESS_COLORS.critical;
}
```

#### 2.3 "Kritische Tasks" Definition vereinheitlichen

**Problem:** Frontend und Backend verwenden unterschiedliche Definitionen

**ENTSCHEIDUNG:** Frontend-Definition beibehalten (priority-based)
- Einfacher für User zu verstehen
- Backend `requiredForStageCompletion` ist für Stage-Transitions

**Aktion:**
- [ ] Dokumentieren in ADR
- [ ] Kommentar in Code hinzufügen

```typescript
// WICHTIG: "Kritische Tasks" = high/urgent Priority (nicht requiredForStageCompletion)
// Grund: User-verständlich, Backend-Flag ist für Stage-Transitions
const criticalTasks = tasks.filter(task =>
  (task.priority === 'urgent' || task.priority === 'high') &&
  task.status !== 'completed'
).length;
```

#### 2.4 Loading-State visuell

**Problem:** Nur Text `{loading && <span>(Wird geladen...)</span>}`

**Lösung:** Skeleton oder Spinner

```typescript
{isLoading && (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
    <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
  </div>
)}
```

#### Checkliste Phase 2

- [ ] PIPELINE_STAGE_PROGRESS in types/project.ts
- [ ] PipelineProgressDashboard importiert Konstante
- [ ] project-service.ts importiert Konstante
- [ ] progress-helpers.ts erstellt
- [ ] getProgressColor() extrahiert
- [ ] PROGRESS_COLORS Design System compliant
- [ ] "Kritische Tasks" Definition dokumentiert
- [ ] Loading Skeleton hinzugefügt
- [ ] Duplikat-Code entfernt

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Extrahiert
- PIPELINE_STAGE_PROGRESS → types/project.ts
- getProgressColor() → utils/progress-helpers.ts
- PROGRESS_COLORS (Design System compliant)

### Code-Duplication eliminiert
- fixedProgressMap: 2x → 1x (types/project.ts)
- getProgressColor(): Inline → Shared Helper

### Design System Compliance
- ✅ Hardcoded Colors entfernt
- ✅ Design System Farben verwendet
- ✅ Konsistente Progress-Farben

### Visuelle Verbesserungen
- Loading Skeleton statt Text

### Dokumentation
- "Kritische Tasks" Definition dokumentiert (ADR)
```

**Commit:**
```bash
git add .
git commit -m "refactor: Phase 2 - Code-Separation & Modularisierung

- PIPELINE_STAGE_PROGRESS extrahiert (eliminiert Duplikat)
- getProgressColor() extrahiert mit Design System Colors
- Loading Skeleton statt Text
- 'Kritische Tasks' Definition dokumentiert

Code-Duplication: -12 Zeilen
Design System: 100% compliant

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden

#### 3.1 useCallback für Handler

**PipelineProgressDashboard:**
```typescript
import { useCallback } from 'react';

// Handler mit useCallback wrappen
const handleNavigateToTasks = useCallback(() => {
  setActiveTab('tasks');
}, [setActiveTab]);
```

**OverviewTabContent:**
```typescript
const handleNavigateToTasks = useCallback(() => {
  onNavigateToTasks();
}, [onNavigateToTasks]);

const handleStepToggle = useCallback(async (stepId: string) => {
  await onStepToggle(stepId);
}, [onStepToggle]);
```

#### 3.2 useMemo für Computed Values

**useProjectTasks Hook:** (bereits in Phase 1 implementiert ✅)
```typescript
// ✅ Bereits optimiert
const progress = useMemo(() => { ... }, [tasks]);
```

**PipelineProgressDashboard:**
```typescript
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
```

#### 3.3 React.memo für Komponenten

**PipelineProgressDashboard:**
```typescript
import React from 'react';

export default React.memo(function PipelineProgressDashboard() {
  // ...
});
```

**OverviewTabContent:**
```typescript
export const OverviewTabContent = React.memo(function OverviewTabContent({
  project,
  currentOrganization,
  todayTasks,
  loadingTodayTasks,
  user,
  completedGuideSteps,
  onStepToggle,
  onNavigateToTasks
}: OverviewTabContentProps) {
  // ...
});
```

#### Checkliste Phase 3

- [ ] useCallback für handleNavigateToTasks
- [ ] useCallback für handleStepToggle
- [ ] useMemo für stageLabels
- [ ] useMemo für stageOrder
- [ ] React.memo für PipelineProgressDashboard
- [ ] React.memo für OverviewTabContent
- [ ] Performance-Test durchgeführt

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 2 Handler
- useMemo für stageLabels, stageOrder
- React.memo für PipelineProgressDashboard
- React.memo für OverviewTabContent

### Messbare Verbesserungen
- Re-Renders reduziert (vor allem bei Tab-Wechsel)
- Konstante Objekte werden nicht neu erstellt
- Callbacks bleiben stabil

### Performance-Tests
- ✅ Tab-Wechsel: Keine unnötigen Re-Renders
- ✅ Task-Update: Nur betroffene Komponenten re-rendern
```

**Commit:**
```bash
git add .
git commit -m "perf: Phase 3 - Performance-Optimierung

- useCallback für Handler (2x)
- useMemo für konstante Objekte (2x)
- React.memo für Komponenten (2x)

Re-Renders optimiert, Performance verbessert.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

#### Agent-Aufruf

```bash
# refactoring-test Agent aufrufen
# Dieser Agent erstellt ALLE Tests vollständig (keine TODOs!)
```

**Agent-Instruktionen:**

Der refactoring-test Agent soll folgende Tests erstellen:

1. **Hook Tests:** `src/lib/hooks/__tests__/useProjectTasks.test.tsx`
   - Query-Loading-Test
   - Progress-Berechnung-Test
   - Error-Handling-Test
   - Enabled/Disabled-Test

2. **Component Tests:** `src/components/projects/workflow/__tests__/PipelineProgressDashboard.test.tsx`
   - Render-Test mit Mock-Daten
   - Loading-State-Test
   - Error-State-Test
   - Stage-Progress-Anzeige-Test
   - Kritische-Tasks-Warning-Test

3. **Integration Tests:** `src/app/dashboard/projects/[projectId]/__tests__/overview-tab-integration.test.tsx`
   - Kompletter Render-Flow
   - Task-Loading + Progress-Anzeige
   - Guide-Box-Interaktion

#### Erwartete Test-Coverage

- **Hook Tests:** 3-5 Tests (95%+ Coverage)
- **Component Tests:** 5-8 Tests (85%+ Coverage)
- **Integration Tests:** 2-3 Tests (80%+ Coverage)
- **Gesamt:** 10-16 Tests

#### Deliverable

```markdown
## Phase 4: Testing ✅

### Test Suite (vom refactoring-test Agent erstellt)
- Hook-Tests: X/X bestanden
- Component-Tests: Y/Y bestanden
- Integration-Tests: Z/Z bestanden
- **Gesamt: A/A Tests bestanden (100% Pass Rate)**

### Coverage
- Statements: X%
- Branches: X%
- Functions: X%
- Lines: X%

### Besonderheiten
- Firestore Timestamp Mocks
- React Query Wrapper
- ProjectContext Mocks
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (refactoring-test Agent)

- Hook-Tests: useProjectTasks (X Tests)
- Component-Tests: PipelineProgressDashboard (Y Tests)
- Integration-Tests: Overview Tab (Z Tests)
- Gesamt: A Tests, 100% Pass Rate

Coverage: >80% für alle Module.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation

**Ziel:** Vollständige, wartbare Dokumentation

**WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

#### Agent-Aufruf

```bash
# refactoring-dokumentation Agent aufrufen
# Dieser Agent erstellt vollständige Dokumentation in Deutsch
```

**Agent-Instruktionen:**

Der refactoring-dokumentation Agent soll folgende Dokumentation erstellen:

1. **README.md** - Hauptdokumentation
   - Übersicht
   - Features
   - Architektur
   - Quick Start

2. **api/README.md** - API-Übersicht
   - useProjectTasks Hook
   - PIPELINE_STAGE_PROGRESS Konstante
   - progress-helpers Utilities

3. **api/overview-tab-service.md** - Detaillierte API-Referenz
   - Hook-Signatur
   - Parameter
   - Rückgabewerte
   - Code-Beispiele

4. **components/README.md** - Komponenten-Dokumentation
   - PipelineProgressDashboard
   - ProjectGuideBox
   - OverviewTabContent

5. **adr/README.md** - Architecture Decision Records
   - ADR-0001: React Query vs. useState
   - ADR-0002: Toast-Service vs. lokaler Alert-State
   - ADR-0003: "Kritische Tasks" Definition
   - ADR-0004: Code-Duplication Elimination

#### Erwartete Dokumentation

- **Gesamt:** 3.000+ Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** 15+ Beispiele
- **Diagramme:** Optional

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅ (refactoring-dokumentation Agent)

### Erstellt
- README.md (X Zeilen) - Hauptdokumentation
- api/README.md (Y Zeilen) - API-Übersicht
- api/overview-tab-service.md (Z Zeilen) - API-Referenz
- components/README.md (A Zeilen) - Komponenten-Docs
- adr/README.md (B Zeilen) - Architecture Decisions

### Gesamt
- **3.000+ Zeilen Dokumentation**
- 15+ Code-Beispiele
- Troubleshooting-Guides
- Migration-Guides
```

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation (refactoring-dokumentation Agent)

- README.md: Overview Tab Hauptdokumentation
- API-Docs: useProjectTasks, PIPELINE_STAGE_PROGRESS, Helpers
- Component-Docs: PipelineProgressDashboard, ProjectGuideBox
- ADRs: 4 Architecture Decision Records

Gesamt: 3.000+ Zeilen Dokumentation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit | grep -E "(PipelineProgress|ProjectGuide|OverviewTab|useProjectTasks)"
```

**Erwartung:** 0 Fehler

#### 6.2 ESLint Check

```bash
npx eslint src/components/projects/workflow/PipelineProgressDashboard.tsx
npx eslint src/components/projects/guides/ProjectGuideBox.tsx
npx eslint src/lib/hooks/useProjectTasks.ts
npx eslint src/app/dashboard/projects/[projectId]/components/tab-content/OverviewTabContent.tsx
```

**Erwartung:** 0 Warnings

#### 6.3 Console Cleanup

```bash
rg "console\." src/components/projects/workflow/PipelineProgressDashboard.tsx
rg "console\." src/components/projects/guides/ProjectGuideBox.tsx
```

**Erlaubt:** Keine! Alle Fehler via toastService.

#### 6.4 Design System Compliance

```bash
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary (#bg-primary)
✓ Progress-Farben: Design System (green-600, blue-600, amber-500, red-600)
✓ Focus-Rings vorhanden
```

#### 6.5 Final Build Test

```bash
npm run build
npm run start
# → /dashboard/projects/[projectId] aufrufen
# → Overview Tab testen
```

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Alle via toastService
- [ ] Design System: 100% compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: Bestanden
- [ ] Performance: Flüssig, keine Lags

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: Alle via toastService
- ✅ Design System: 100% compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Design System Compliance
- ✅ Progress-Farben: Design System (green-600, blue-600, amber-500, red-600)
- ✅ Primary Color: #005fab
- ✅ Heroicons: /24/outline
- ✅ Zinc-Palette: konsistent

### Ausnahmen
- Keine!
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality

- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Design System: 100% compliant
- Build: Erfolgreich getestet

Bereit für Quality Check Agent.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Check (Agent)

**Ziel:** Comprehensive Quality Check vor Merge

**WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** durchgeführt!

#### Agent-Aufruf

```bash
# refactoring-quality-check Agent aufrufen
# Dieser Agent prüft ALLE Refactoring-Phasen auf Vollständigkeit
```

**Agent-Instruktionen:**

Der refactoring-quality-check Agent soll prüfen:

1. **Phase 0-6 Vollständigkeit:**
   - Alle Dateien erstellt?
   - Alle TODOs entfernt?
   - Keine "analog"-Kommentare?

2. **Code-Integration:**
   - Neue Komponenten korrekt importiert?
   - Alte Code-Pfade entfernt?
   - Keine Duplikate mehr?

3. **Tests:**
   - Alle Tests laufen?
   - Coverage >80%?
   - Keine skipped/todo Tests?

4. **Dokumentation:**
   - Alle Docs erstellt?
   - Links funktionieren?
   - Code-Beispiele korrekt?

5. **Build:**
   - TypeScript kompiliert?
   - Keine ESLint-Warnings?
   - Production-Build erfolgreich?

#### Erwartetes Ergebnis

```markdown
## Phase 6.5: Quality Check ✅ (refactoring-quality-check Agent)

### Geprüft
- ✅ Phase 0-6: Vollständig implementiert
- ✅ Keine TODOs im Code
- ✅ Keine "analog"-Kommentare
- ✅ Alte Code-Pfade entfernt
- ✅ Tests: 100% Pass Rate, >80% Coverage
- ✅ Dokumentation: Vollständig, Links OK
- ✅ Build: Erfolgreich

### Gefundene Issues
- [Keine] oder [Liste von zu behebenden Issues]

### Bereit für Merge
- ✅ Ja / ⚠️ Nein (Fixes erforderlich)
```

#### Deliverable (nach Fixes)

**Commit:**
```bash
git add .
git commit -m "fix: Phase 6.5 - Quality Check Fixes (refactoring-quality-check Agent)

- Issue 1 behoben: [Beschreibung]
- Issue 2 behoben: [Beschreibung]

Quality Check: Bestanden ✅
Bereit für Merge to Main.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🔄 Phase 7: Merge zu Main

**Ziel:** Overview Tab Refactoring zu Main mergen

### Workflow

```bash
# 1. Push Feature-Branch
git push origin feature/overview-tab-refactoring

# 2. Zu Main wechseln und mergen
git checkout main
git merge feature/overview-tab-refactoring --no-ff

# 3. Main pushen
git push origin main

# 4. Tests auf Main
npm test -- overview
```

### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen (inkl. Phase 0.5 Cleanup + 6.5 Quality Check)
- [ ] refactoring-test Agent ausgeführt (Phase 4)
- [ ] refactoring-dokumentation Agent ausgeführt (Phase 5)
- [ ] refactoring-quality-check Agent ausgeführt (Phase 6.5)
- [ ] Alle Tests bestehen (100% Pass Rate)
- [ ] Dokumentation vollständig (3.000+ Zeilen)
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

### Final Report

```markdown
## ✅ Overview Tab Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen (inkl. Pre-Cleanup + Quality Check)
- **Tests:** X/X bestanden (100% Pass Rate)
- **Coverage:** Y% (Ziel: >80% ✅)
- **Dokumentation:** 3.000+ Zeilen

### Änderungen
- +X Zeilen hinzugefügt
- -Y Zeilen entfernt
- Z Dateien geändert

### Highlights
- ✅ React Query Integration (useProjectTasks Hook)
- ✅ Code-Duplication eliminiert (fixedProgressMap)
- ✅ Toast-Service statt lokaler Alert-State
- ✅ Design System 100% compliant
- ✅ Performance-Optimierungen (useCallback, useMemo, React.memo)
- ✅ Comprehensive Test Suite (X Tests, Y% Coverage)
- ✅ 3.000+ Zeilen Dokumentation

### Gelöste Probleme
- ✅ Code-Duplication (fixedProgressMap 2x → 1x)
- ✅ Inkonsistente "Kritische Tasks" dokumentiert
- ✅ console.error → toastService
- ✅ Unused State entfernt
- ✅ Hardcoded Colors → Design System
- ✅ Loading-State visuell (Skeleton)

### Nächste Schritte
- [ ] Overview Tab in Production testen
- [ ] Nächstes Tab-Modul: Tasks Tab (Phase 2.2)
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** ~8% (durch useState/useEffect → React Query)
- **Code-Duplikation:** fixedProgressMap eliminiert (-12 Zeilen)
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0
- **Design System:** 100% compliant

### Testing

- **Test-Coverage:** >80% (Ziel erreicht)
- **Anzahl Tests:** ~10-16 Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Optimiert (React.memo, useCallback, useMemo)
- **Caching:** 2min staleTime (React Query)
- **Error Handling:** User-sichtbar (toastService)

### Dokumentation

- **Zeilen:** 3.000+ Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** 15+ Beispiele
- **ADRs:** 4 Architecture Decision Records

---

## 📝 Hinweise

### Toast-Service Pattern

**Wichtig:** Kein lokaler Alert-State mehr!

```typescript
// ❌ Alt (nicht mehr verwenden)
const [alert, setAlert] = useState<Alert | null>(null);
const showAlert = (type, title, message) => { ... };

// ✅ Neu (verwenden)
import { toastService } from '@/lib/utils/toast';

toastService.success('Erfolgreich gespeichert');
toastService.error('Fehler beim Laden');
toastService.warning('Achtung: Daten unvollständig');
```

**Vorteile:**
- ~33 Zeilen pro Component gespart
- Bessere UX (non-blocking)
- Konsistentes Design
- Automatisches Schließen

### Admin SDK

**Entscheidung:** NICHT erforderlich für Overview Tab

**Begründung:**
- Guide Steps Update: Client-Side Security ist ausreichend (organizationId-Check)
- Kein finanzieller/rechtlicher Impact
- Geringer Missbrauchspotential
- Aufwand > Benefit

**Dokumentiert in:** `docs/planning/tabs/overview-tab-refactoring.md` (diese Datei)

### Agent-Verwendung

**Phase 4 - Testing:**
- ✅ `refactoring-test` Agent verwenden
- Agent erstellt ALLE Tests vollständig (keine TODOs!)
- 100% Completion Guarantee

**Phase 5 - Dokumentation:**
- ✅ `refactoring-dokumentation` Agent verwenden
- Agent erstellt vollständige Dokumentation auf Deutsch
- 3.000+ Zeilen garantiert

**Phase 6.5 - Quality Check:**
- ✅ `refactoring-quality-check` Agent verwenden
- Agent prüft ALLE Phasen auf Vollständigkeit
- Verhindert unvollständiges Refactoring

---

## 🔗 Referenzen

### Interne Docs

- **Master-Refactoring-Checklist:** `docs/planning/master-refactoring-checklist.md`
- **Module-Refactoring-Template:** `docs/templates/module-refactoring-template.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`

### Analysierte Komponenten

- **PipelineProgressDashboard:** `src/components/projects/workflow/PipelineProgressDashboard.tsx`
- **ProjectGuideBox:** `src/components/projects/guides/ProjectGuideBox.tsx`
- **OverviewTabContent:** `src/app/dashboard/projects/[projectId]/components/tab-content/OverviewTabContent.tsx`

### Services & Utilities

- **taskService:** `src/lib/firebase/task-service.ts`
- **toastService:** `src/lib/utils/toast.ts`
- **ProjectContext:** `src/app/dashboard/projects/[projectId]/context/ProjectContext.tsx`

---

## 📞 Support

**Team:** CeleroPress Development Team
**Maintainer:** [Name]
**Fragen?** Siehe CLAUDE.md oder Team-Channel

---

**Version:** 1.0
**Basiert auf:** Module-Refactoring-Template v1.1
**Erstellt:** 2025-10-21
**Status:** Ready for Implementation

---

*Dieser Plan ist ein lebendes Dokument. Anpassungen während der Implementierung sind möglich.*

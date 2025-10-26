# Daten Tab Refactoring - Implementierungsplan

**Version:** 1.0
**Modul:** Daten Tab (Project Detail Page)
**Basiert auf:** Modul-Refactoring-Template v1.1
**Projekt:** CeleroPress - SKAMP
**Erstellt:** 2025-10-26

---

## 📋 Übersicht

**Ziel:** Abschluss des Daten Tab Refactorings mit Focus auf:
- Performance-Optimierung (React.memo)
- Testing (Wrapper-Tests)
- Vollständige Dokumentation

**Entry Point:** `src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx`

**Geschätzter Aufwand:** S (Small) - 0.5-1 Tag

**Status:** ⚡ **FAST FERTIG!** - Die meiste Arbeit wurde bereits im ProjectFoldersView Refactoring (Phase 0.1) erledigt!

---

## 🎯 Ziele

- [x] **ProjectFoldersView (shared):** Bereits refactored in Phase 0.1 ✅
- [x] **SmartUploadInfoPanel:** Wurde entfernt/integriert ✅
- [x] **Upload-Logic:** In Custom Hooks modularisiert ✅
- [x] **Code-Modularisierung:** 10 spezialisierte Dateien erstellt ✅
- [x] **ProjectFoldersView Tests:** 113/113 passed ✅
- [x] **Design System:** 100% compliant ✅
- [ ] React.memo auf DatenTabContent
- [ ] Tests für DatenTabContent Wrapper
- [ ] Dokumentation erstellen
- [ ] Production-Ready Code Quality Check

---

## 📁 Ist-Zustand

### Komponenten-Übersicht

| Komponente | Pfad | LOC | Status | Issues |
|------------|------|-----|--------|--------|
| DatenTabContent | tab-content/DatenTabContent.tsx | 49 | ✅ Sehr schlank | Keine |
| ProjectFoldersView (shared) | components/projects/ProjectFoldersView.tsx | 478 | ✅ Refactored (Phase 0.1) | - |

**Gesamt DatenTabContent:** 49 Zeilen (extrem schlank!)

### ✅ Bereits durch Phase 0.1 (ProjectFoldersView Refactoring) erledigt

**Refactoring abgeschlossen am:** 2025-10-19 (Merged to Main)

**Was wurde bereits gemacht:**

1. **Code-Modularisierung:** 1 große Datei → 10 spezialisierte Dateien
   - ProjectFoldersView.tsx (478 Zeilen - Hauptkomponente)
   - 3 Custom Hooks:
     - `useFolderNavigation.ts` - Ordner-Navigation
     - `useFileActions.ts` - CRUD Operations
     - `useDocumentEditor.ts` - Editor-Integration
   - 6 UI Komponenten:
     - `Alert.tsx`
     - `DeleteConfirmDialog.tsx`
     - `UploadZone.tsx`
     - `MoveAssetModal.tsx`
     - `FolderCreateDialog.tsx`
     - `BoilerplateImportDialog.tsx`

2. **SmartUploadInfoPanel:** Entfernt/Integriert in ProjectFoldersView

3. **Tests:** 113/113 Tests passed (100% Pass Rate)
   - 73 Hook Tests
   - 40 Component Tests
   - Integration Tests + Unit Tests + E2E Tests

4. **Design System:** 100% Compliance
   - Primary Color: #005fab
   - Heroicons /24/outline
   - Zinc-Palette
   - Keine Schatten (außer Dropdowns)

5. **Parameterisierung:** `filterByFolder: 'Dokumente' | 'all'`
   - Strategie Tab: `filterByFolder="Dokumente"`
   - Daten Tab: `filterByFolder="all"`

6. **Dokumentation:** 4.579 Zeilen in 5 Dateien
   - README.md
   - API-Docs
   - Components-Docs
   - ADRs

### Aktueller DatenTabContent Code

```tsx
'use client';

import React from 'react';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import ProjectFoldersView from '@/components/projects/ProjectFoldersView';
import { Project } from '@/types/project';

interface DatenTabContentProps {
  project: Project;
  organizationId: string;
  projectFolders: any;
  foldersLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function DatenTabContent({
  project,
  organizationId,
  projectFolders,
  foldersLoading,
  onRefresh
}: DatenTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Heading level={3}>Projektdaten verwalten</Heading>
        <Text className="text-gray-500 mt-1">
          Organisieren Sie alle Projektdateien und Dokumente zentral
        </Text>
      </div>

      {/* Projekt-Ordner - Zeigt alle Projekt-Ordner */}
      {projectFolders && (
        <ProjectFoldersView
          projectId={project.id!}
          organizationId={organizationId}
          customerId={project.customer?.id}
          customerName={project.customer?.name}
          projectFolders={projectFolders}
          foldersLoading={foldersLoading}
          onRefresh={onRefresh}
          filterByFolder="all"
        />
      )}
    </div>
  );
}
```

**Analyse:**
- ✅ Nur 49 Zeilen - bereits extrem schlank
- ✅ Nutzt refactored ProjectFoldersView
- ✅ Keine komplexe Logik mehr
- ✅ Design System konform
- ⚠️ Fehlt: React.memo für Performance
- ⚠️ Fehlt: Tests
- ⚠️ Fehlt: Dokumentation

### Dependencies

- ✅ React Query: Installiert (in ProjectFoldersView verwendet)
- ✅ toastService: Verfügbar (in ProjectFoldersView verwendet)
- ✅ ProjectContext: Verfügbar
- ✅ ProjectFoldersView: Refactored (Shared)
- ✅ Testing Libraries: Vorhanden

---

## 🚀 Die verbleibenden Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

**Status:** ⚡ FAST SKIP - Datei ist sehr klein (49 Zeilen)

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/daten-tab-refactoring
  ```

- [ ] **BUG-FIX: Analyse-Ordner Farbe korrigieren** ⚠️ WICHTIG!

  **Problem:** Analyse-Ordner ist aktuell blau (wie Medien-Ordner)
  **Lösung:** Analyse-Ordner sollte orange sein

  **Datei:** `src/lib/firebase/media-folders-service.ts` oder wo Ordner-Icons/Farben definiert sind

  ```typescript
  // Beispiel-Fix (zu verifizieren):
  const FOLDER_COLORS = {
    'Medien': 'blue',      // bg-blue-100, text-blue-600
    'Analyse': 'orange',   // bg-orange-100, text-orange-600 ⭐ FIX
    'Dokumente': 'green',  // bg-green-100, text-green-600
    // ...
  };
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx
  # Ergebnis: 49 Zeilen
  ```

- [ ] Backup-Datei erstellen (optional - Datei ist sehr klein)
  ```bash
  # Optional
  cp src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx \
     src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.backup.tsx
  ```

- [ ] Dependencies prüfen
  - [x] React Query installiert (in ProjectFoldersView verwendet)
  - [x] toastService verfügbar
  - [x] ProjectContext verfügbar
  - [x] ProjectFoldersView (Shared Component) verfügbar
  - [x] Testing Libraries vorhanden

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/daten-tab-refactoring`
- Ist-Zustand: 1 Datei, 49 Zeilen Code
- Backups: Optional (Datei sehr klein)
- Dependencies: Alle vorhanden

### Bug-Fix identifiziert
- ⚠️ **Analyse-Ordner Farbe:** Aktuell blau (wie Medien) → Soll orange sein

### Besonderheit
- ⚡ **FAST FERTIG:** Meiste Arbeit bereits in Phase 0.1 (ProjectFoldersView) erledigt
- DatenTabContent ist nur ein schlanker Wrapper (49 Zeilen)
- Keine komplexe Logik mehr vorhanden

### Bereit für Phase 3 (Skip Phase 1 & 2 - bereits erledigt)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup für Daten Tab Refactoring + Bug-Fix

- Ist-Zustand: 1 Datei, 49 Zeilen Code
- ProjectFoldersView bereits refactored (Phase 0.1) ✅
- SmartUploadInfoPanel bereits entfernt ✅
- Bug-Fix: Analyse-Ordner Farbe korrigiert (blau → orange)
- Nur Performance, Tests & Docs fehlen noch

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### ~~Phase 1: React Query Integration~~ ✅ SKIP

**Status:** ✅ **BEREITS ERLEDIGT** in Phase 0.1 (ProjectFoldersView Refactoring)

**Warum Skip:**
- ProjectFoldersView nutzt bereits React Query für Media-Loading
- DatenTabContent hat keine eigene Data-Fetching-Logik
- Alle Daten werden über Props übergeben (project, projectFolders, onRefresh)
- onRefresh ist bereits ein Callback vom Parent

**Keine Aktion erforderlich.**

---

### ~~Phase 2: Code-Separation & Modularisierung~~ ✅ SKIP

**Status:** ✅ **BEREITS ERLEDIGT** in Phase 0.1 (ProjectFoldersView Refactoring)

**Warum Skip:**
- DatenTabContent ist nur 49 Zeilen - bereits extrem modular
- Alle komplexe Logik wurde in ProjectFoldersView ausgelagert
- Komponente ist bereits gut strukturiert:
  - Header (Heading + Text)
  - ProjectFoldersView (Shared Component)

**Keine Aktion erforderlich.**

---

### Phase 3: Performance-Optimierung

**Ziel:** React.memo auf DatenTabContent anwenden

**Geschätzter Aufwand:** 15 Minuten

#### Aufgaben

- [ ] **React.memo auf DatenTabContent anwenden**

  ```tsx
  'use client';

  import React from 'react';
  import { Heading } from '@/components/ui/heading';
  import { Text } from '@/components/ui/text';
  import ProjectFoldersView from '@/components/projects/ProjectFoldersView';
  import { Project } from '@/types/project';

  interface DatenTabContentProps {
    project: Project;
    organizationId: string;
    projectFolders: any;
    foldersLoading: boolean;
    onRefresh: () => Promise<void>;
  }

  export const DatenTabContent = React.memo(function DatenTabContent({
    project,
    organizationId,
    projectFolders,
    foldersLoading,
    onRefresh
  }: DatenTabContentProps) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Heading level={3}>Projektdaten verwalten</Heading>
          <Text className="text-gray-500 mt-1">
            Organisieren Sie alle Projektdateien und Dokumente zentral
          </Text>
        </div>

        {/* Projekt-Ordner - Zeigt alle Projekt-Ordner */}
        {projectFolders && (
          <ProjectFoldersView
            projectId={project.id!}
            organizationId={organizationId}
            customerId={project.customer?.id}
            customerName={project.customer?.name}
            projectFolders={projectFolders}
            foldersLoading={foldersLoading}
            onRefresh={onRefresh}
            filterByFolder="all"
          />
        )}
      </div>
    );
  });
  ```

**Hinweis:**
- `onRefresh` sollte im Parent (page.tsx) bereits mit `useCallback` wrapped sein
- ProjectFoldersView ist bereits intern optimiert (Phase 0.1)

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Durchgeführt
- React.memo auf DatenTabContent angewendet

### Performance-Verbesserungen
- Verhindert unnötige Re-Renders wenn Props gleich bleiben
- ProjectFoldersView bereits intern optimiert (useCallback, useMemo, React.memo)

### Bereit für Phase 4 (Testing)
```

**Commit:**
```bash
git add src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx
git commit -m "refactor: Phase 3 - Performance-Optimierung für Daten Tab

- React.memo auf DatenTabContent angewendet
- Verhindert unnötige Re-Renders

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing

**Ziel:** Test-Coverage für DatenTabContent Wrapper erreichen (>80%)

**Geschätzter Aufwand:** 1-2 Stunden

**🤖 AGENT:** Wird an `refactoring-test` Agent übergeben

#### Aufgaben

- [ ] **refactoring-test Agent starten**

  ```bash
  # Nutzung: Task tool mit subagent_type="refactoring-test"
  ```

  **Agent-Prompt:**
  ```
  Erstelle eine umfassende Test-Suite für DatenTabContent.tsx mit 100% Completion-Garantie.

  Kontext:
  - Datei: src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx
  - Komponente: Wrapper-Komponente (49 Zeilen)
  - Nutzt: ProjectFoldersView (bereits in Phase 0.1 getestet mit 113 Tests)

  Anforderungen:
  - Test-Datei: __tests__/DatenTabContent.test.tsx
  - Mindestens 10 Tests (ALLE vollständig implementiert, KEINE TODOs)
  - Coverage: >80% (Ziel: 100%)
  - Test-Kategorien:
    1. Rendering (Header, Beschreibungstext, ProjectFoldersView)
    2. Props Passing (korrekte Props an ProjectFoldersView)
    3. Performance (React.memo Verhalten)
    4. Conditional Rendering (null projectFolders)

  WICHTIG:
  - ProjectFoldersView mocken (bereits getestet in Phase 0.1)
  - 100% vollständige Tests, KEINE "analog" Kommentare
  - KEINE TODOs in den Tests
  ```

- [ ] **Test-Datei erstellen (wird vom Agent gemacht)**

  ```bash
  # Test-Datei erstellen
  touch src/app/dashboard/projects/[projectId]/components/tab-content/__tests__/DatenTabContent.test.tsx
  ```

- [ ] **Tests schreiben**

  ```tsx
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { DatenTabContent } from '../DatenTabContent';
  import { Project } from '@/types/project';
  import { Timestamp } from 'firebase/firestore';

  // Mock ProjectFoldersView (bereits getestet in Phase 0.1)
  jest.mock('@/components/projects/ProjectFoldersView', () => {
    return {
      __esModule: true,
      default: jest.fn(({ filterByFolder }) => (
        <div data-testid="project-folders-view">
          ProjectFoldersView (filterByFolder={filterByFolder})
        </div>
      ))
    };
  });

  describe('DatenTabContent', () => {
    const mockProject: Project = {
      id: 'project-123',
      title: 'Test Project',
      organizationId: 'org-123',
      userId: 'user-123',
      status: 'active',
      stage: 'briefing',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      customer: {
        id: 'customer-123',
        name: 'Test Customer'
      }
    };

    const mockProjectFolders = {
      mainFolder: { id: 'folder-123', name: 'Daten' },
      assets: []
    };

    const mockOnRefresh = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Rendering', () => {
      it('sollte Header mit Titel rendern', () => {
        render(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        expect(screen.getByText('Projektdaten verwalten')).toBeInTheDocument();
      });

      it('sollte Beschreibungstext rendern', () => {
        render(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        expect(screen.getByText(/Organisieren Sie alle Projektdateien/)).toBeInTheDocument();
      });

      it('sollte ProjectFoldersView mit filterByFolder="all" rendern', () => {
        render(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        const foldersView = screen.getByTestId('project-folders-view');
        expect(foldersView).toBeInTheDocument();
        expect(foldersView).toHaveTextContent('filterByFolder=all');
      });

      it('sollte ProjectFoldersView NICHT rendern wenn projectFolders null ist', () => {
        render(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={null}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        expect(screen.queryByTestId('project-folders-view')).not.toBeInTheDocument();
      });
    });

    describe('Props Passing', () => {
      it('sollte korrekte Props an ProjectFoldersView übergeben', () => {
        const ProjectFoldersView = require('@/components/projects/ProjectFoldersView').default;

        render(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={true}
            onRefresh={mockOnRefresh}
          />
        );

        expect(ProjectFoldersView).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'project-123',
            organizationId: 'org-123',
            customerId: 'customer-123',
            customerName: 'Test Customer',
            projectFolders: mockProjectFolders,
            foldersLoading: true,
            onRefresh: mockOnRefresh,
            filterByFolder: 'all'
          }),
          expect.anything()
        );
      });

      it('sollte customerId undefined sein wenn project.customer fehlt', () => {
        const ProjectFoldersView = require('@/components/projects/ProjectFoldersView').default;
        const projectWithoutCustomer = { ...mockProject, customer: undefined };

        render(
          <DatenTabContent
            project={projectWithoutCustomer}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        expect(ProjectFoldersView).toHaveBeenCalledWith(
          expect.objectContaining({
            customerId: undefined,
            customerName: undefined
          }),
          expect.anything()
        );
      });
    });

    describe('Performance', () => {
      it('sollte nicht re-rendern wenn Props gleich bleiben', () => {
        const { rerender } = render(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        const ProjectFoldersView = require('@/components/projects/ProjectFoldersView').default;
        const callCount = ProjectFoldersView.mock.calls.length;

        // Re-render mit gleichen Props
        rerender(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        // Sollte nicht erneut gerendert werden (React.memo)
        expect(ProjectFoldersView.mock.calls.length).toBe(callCount);
      });

      it('sollte re-rendern wenn foldersLoading ändert', () => {
        const { rerender } = render(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        const ProjectFoldersView = require('@/components/projects/ProjectFoldersView').default;
        const callCount = ProjectFoldersView.mock.calls.length;

        // Re-render mit geändertem foldersLoading
        rerender(
          <DatenTabContent
            project={mockProject}
            organizationId="org-123"
            projectFolders={mockProjectFolders}
            foldersLoading={true}
            onRefresh={mockOnRefresh}
          />
        );

        // Sollte erneut gerendert werden
        expect(ProjectFoldersView.mock.calls.length).toBeGreaterThan(callCount);
      });
    });
  });
  ```

- [ ] **Tests ausführen**

  ```bash
  npm test -- DatenTabContent.test.tsx
  ```

#### Test-Coverage Ziel

- **Mindest-Coverage:** 80%
- **Ziel-Coverage:** 95%+ (Komponente ist sehr einfach)

**Erwartete Test-Ergebnisse:**
- 10-12 Tests
- 100% Statement Coverage (sehr kleine Komponente)
- 100% Branch Coverage
- 100% Function Coverage

#### Deliverable

```markdown
## Phase 4: Testing ✅

### Durchgeführt
- Test-Datei erstellt: `DatenTabContent.test.tsx`
- 10 Tests implementiert

### Test-Ergebnis
- **Tests:** 10/10 passed (100%)
- **Coverage:** 100% (Statement, Branch, Function, Line)

### Test-Kategorien
1. Rendering (4 Tests)
   - Header Titel
   - Beschreibungstext
   - ProjectFoldersView mit filterByFolder="all"
   - Conditional Rendering (null projectFolders)

2. Props Passing (2 Tests)
   - Korrekte Props an ProjectFoldersView
   - customerId undefined wenn customer fehlt

3. Performance (2 Tests)
   - Kein Re-Render bei gleichen Props (React.memo)
   - Re-Render bei geänderten Props

### Bereit für Phase 5 (Dokumentation)
```

**Commit:**
```bash
git add src/app/dashboard/projects/[projectId]/components/tab-content/__tests__/DatenTabContent.test.tsx
git commit -m "test: Phase 4 - Tests für Daten Tab

- 10 Tests implementiert (100% passed)
- Coverage: 100% (Wrapper-Tests)
- Rendering, Props Passing, Performance Tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation

**Ziel:** Vollständige Dokumentation für Daten Tab erstellen

**Geschätzter Aufwand:** 2-3 Stunden

**🤖 AGENT:** Wird an `refactoring-dokumentation` Agent übergeben

**Hinweis:**
- ProjectFoldersView Dokumentation existiert bereits (4.579 Zeilen in Phase 0.1)
- Daten Tab Dokumentation kann darauf verweisen

#### Aufgaben

- [ ] **refactoring-dokumentation Agent starten**

  ```bash
  # Nutzung: Task tool mit subagent_type="refactoring-dokumentation"
  ```

  **Agent-Prompt:**
  ```
  Erstelle umfassende Dokumentation für das Daten Tab Refactoring.

  Kontext:
  - Modul: Daten Tab (Project Detail Page)
  - Komponente: DatenTabContent.tsx (49 Zeilen)
  - Nutzt: ProjectFoldersView (bereits in Phase 0.1 refactored)
  - Refactoring-Plan: docs/planning/tabs/daten-tab-refactoring.md

  Ziel-Ordner: docs/projects/daten-tab-refactoring/

  Anforderungen:
  - README.md (~800 Zeilen)
  - api/README.md (~400 Zeilen - Verweis auf ProjectFoldersView Docs)
  - components/README.md (~600 Zeilen - DatenTabContent Docs)
  - adr/README.md (~400 Zeilen - Architecture Decision Records)

  Gesamt: ~2.200 Zeilen Dokumentation

  Besonderheiten:
  - Meiste Arbeit wurde in Phase 0.1 (ProjectFoldersView) erledigt
  - DatenTabContent ist nur ein Wrapper
  - Verweise auf Phase 0.1 Dokumentation (docs/projects/folders/)

  Format: Deutsch, Markdown, Code-Beispiele, Best Practices
  ```

- [ ] **Ordnerstruktur erstellen (wird vom Agent gemacht)**

  ```bash
  mkdir -p docs/projects/daten-tab-refactoring/api
  mkdir -p docs/projects/daten-tab-refactoring/components
  mkdir -p docs/projects/daten-tab-refactoring/adr
  ```

- [ ] **README.md erstellen** (~800 Zeilen)

  **Template:** [Siehe unten - README Template]

- [ ] **api/README.md erstellen** (~400 Zeilen)

  **Template:** [Siehe unten - API README Template]

- [ ] **components/README.md erstellen** (~600 Zeilen)

  **Template:** [Siehe unten - Components README Template]

- [ ] **adr/README.md erstellen** (~400 Zeilen)

  **Template:** [Siehe unten - ADR Template]

#### Ziel-Umfang

**Gesamt:** ~2.200 Zeilen Dokumentation (weniger als üblich, da meiste Arbeit in Phase 0.1)

| Datei | Zeilen | Inhalt |
|-------|--------|--------|
| README.md | ~800 | Hauptdokumentation, Übersicht, Migration Guide |
| api/README.md | ~400 | Verweis auf ProjectFoldersView API Docs |
| components/README.md | ~600 | DatenTabContent Komponenten-Dokumentation |
| adr/README.md | ~400 | Architecture Decision Records |

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅

### Erstellt
- 4 Markdown-Dateien in `docs/projects/daten-tab-refactoring/`
  - README.md (800+ Zeilen)
  - api/README.md (400+ Zeilen)
  - components/README.md (600+ Zeilen)
  - adr/README.md (400+ Zeilen)

### Gesamt
- **2.200+ Zeilen Dokumentation**
- Code-Beispiele, Migration Guides, Best Practices
- Verweise auf ProjectFoldersView Dokumentation (Phase 0.1)

### Bereit für Phase 6 (Code Quality)
```

**Commit:**
```bash
git add docs/projects/daten-tab-refactoring/
git commit -m "docs: Phase 5 - Dokumentation für Daten Tab

- README.md (800+ Zeilen)
- API, Components, ADR Docs (1.400+ Zeilen)
- Migration Guide, Best Practices, Code-Beispiele

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Sicherstellen, dass der Code production-ready ist

**Geschätzter Aufwand:** 30 Minuten

#### Aufgaben

- [ ] **TypeScript Check**

  ```bash
  npx tsc --noEmit
  ```

  - Keine neuen TypeScript-Fehler in DatenTabContent
  - Pre-existing Errors sind OK (werden separat gefixt)

- [ ] **ESLint Check**

  ```bash
  npx eslint src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx
  ```

  - Keine Warnings
  - Keine Errors

- [ ] **Console Cleanup**

  ```bash
  # Suche nach console.log, console.error, etc.
  grep -r "console\." src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx
  ```

  - Alle console-Statements entfernen oder durch toastService ersetzen

- [ ] **Design System Compliance**

  - [x] Primary Color: #005fab (nicht in dieser Komponente verwendet)
  - [x] Heroicons /24/outline (nicht in dieser Komponente verwendet)
  - [x] Zinc-Palette für neutrale Farben (text-gray-500 ✓)
  - [x] Keine Schatten (✓)

- [ ] **Production Build Test (optional)**

  ```bash
  npm run build
  ```

  - Build sollte erfolgreich sein
  - Pre-existing Build Errors sind OK

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Durchgeführt
- TypeScript: 0 Fehler in DatenTabContent
- ESLint: 0 Warnings/Errors
- Console Cleanup: Bestätigt sauber (keine console-Statements)
- Design System: 100% compliant
  - text-gray-500 (Zinc-Palette) ✓
  - Heading/Text Komponenten ✓
  - Keine Schatten ✓

### Production Build (optional)
- Build-Test: [Erfolgreich / Pre-existing Errors bleiben]

### Bereit für Phase 7 (Merge to Main)
```

**Commit:**
```bash
git add .
git commit -m "quality: Phase 6 - Production-Ready Code Quality für Daten Tab

- TypeScript: 0 Fehler ✅
- ESLint: 0 Warnings ✅
- Console Cleanup: Bestätigt sauber ✅
- Design System: 100% compliant ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check

**Ziel:** Umfassende Qualitätsprüfung VOR dem Merge

**Geschätzter Aufwand:** 30 Minuten

**🤖 AGENT:** Wird an `refactoring-quality-check` Agent übergeben

#### Aufgaben

- [ ] **refactoring-quality-check Agent starten**

  ```bash
  # Nutzung: Task tool mit subagent_type="refactoring-quality-check"
  ```

  **Agent-Prompt:**
  ```
  Führe einen umfassenden Quality Check für das Daten Tab Refactoring durch.

  Kontext:
  - Feature-Branch: feature/daten-tab-refactoring
  - Refactoring-Plan: docs/planning/tabs/daten-tab-refactoring.md
  - Phasen: 0-6 sollten vollständig abgeschlossen sein

  Prüfe:
  1. ALLE Dateien erstellt (nicht nur existieren, sondern vollständig implementiert)
  2. ALLE Tests bestehen (npm test -- --testPathPattern="DatenTabContent")
  3. Alte Code-Stellen entfernt (keine Duplikate)
  4. ProjectFoldersView korrekt integriert
  5. TypeScript: 0 neue Fehler
  6. ESLint: 0 Warnings
  7. Console-Logs entfernt
  8. Design System Compliance (100%)
  9. Bug-Fix: Analyse-Ordner Farbe ist orange (nicht blau)
  10. Dokumentation vollständig (2.200+ Zeilen)

  WICHTIG:
  - Keine oberflächliche Prüfung - ALLE Phasen müssen VOLLSTÄNDIG sein
  - Wenn Probleme gefunden werden: Konkrete Fix-Anweisungen geben
  - MERGE NUR GENEHMIGEN wenn ALLES 100% perfekt ist
  ```

- [ ] **Quality Check Ergebnis prüfen**

  Agent gibt einen Report:
  - ✅ MERGE APPROVED (alle Checks bestanden)
  - ⚠️ FIXES REQUIRED (Liste der Probleme)

- [ ] **Ggf. Fixes durchführen**

  Falls der Agent Probleme findet, diese beheben und Quality Check erneut ausführen.

#### Deliverable

```markdown
## Phase 6.5: Quality Gate Check ✅

### Durchgeführt
- refactoring-quality-check Agent ausgeführt
- Alle Checks bestanden: ✅

### Quality Report
- [X/X Checks bestanden]
- Probleme gefunden: [0 oder Liste]
- Fixes durchgeführt: [Liste]

### MERGE STATUS
- ✅ APPROVED - Bereit für Main-Merge
```

**Commit:**
```bash
git add .
git commit -m "quality: Phase 6.5 - Quality Gate Check für Daten Tab

- refactoring-quality-check Agent ausgeführt
- Alle Checks bestanden ✅
- Bereit für Merge to Main

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 7: Merge to Main

**Ziel:** Feature-Branch in Main mergen

**Geschätzter Aufwand:** 15 Minuten

**⚠️ WICHTIG:** Nur ausführen wenn Phase 6.5 (Quality Gate) bestanden ist!

#### Aufgaben

- [ ] **Phase 6.5 Quality Gate bestanden?**

  - ✅ refactoring-quality-check Agent hat MERGE APPROVED

- [ ] **Finale Tests ausführen**

  ```bash
  npm test -- --testPathPattern="DatenTabContent"
  ```

- [ ] **Branch in Main mergen**

  ```bash
  git checkout main
  git pull origin main
  git merge feature/daten-tab-refactoring --no-ff -m "$(cat <<'EOF'
  merge: Daten Tab Refactoring - Phase 0-6 abgeschlossen

  Feature Branch: feature/daten-tab-refactoring

  ZUSAMMENFASSUNG:

  Vorarbeit (bereits erledigt):
  ✅ Phase 0.1: ProjectFoldersView Refactoring (2025-10-19)
    - 10 spezialisierte Dateien erstellt
    - 113/113 Tests passed
    - 4.579 Zeilen Dokumentation
    - SmartUploadInfoPanel entfernt/integriert

  Daten Tab Refactoring (neue Arbeit):
  ✅ Phase 3: Performance-Optimierung
    - React.memo auf DatenTabContent

  ✅ Phase 4: Testing
    - 10/10 Tests passed (100%)
    - Coverage: 100%

  ✅ Phase 5: Dokumentation
    - 2.200+ Zeilen in 4 Dateien
    - Migration Guide, Best Practices

  ✅ Phase 6: Production-Ready Code Quality
    - TypeScript: 0 Fehler
    - ESLint: 0 Warnings
    - Design System: 100% compliant

  Modifizierte Dateien:
  - DatenTabContent.tsx (React.memo)

  Neue Dateien:
  - DatenTabContent.test.tsx (10 Tests)
  - docs/projects/daten-tab-refactoring/ (4 Docs)

  Git-Statistik:
  - Files changed: ~6
  - Code: +500 Zeilen (Tests + Docs)

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Push to Remote**

  ```bash
  git push origin main
  ```

- [ ] **Master Refactoring Checklist aktualisieren**

  Update `docs/planning/master-refactoring-checklist.md`:
  - [x] **Plan erstellt:** ✓
  - [x] **Implementierung durchgeführt:** ✓
  - Ergebnis-Zusammenfassung ausfüllen
  - Status: 7/13 Module (54%)

#### Deliverable

```markdown
## Phase 7: Merge to Main ✅

### Durchgeführt
- Finale Tests: 10/10 passed
- Feature-Branch → Main gemerged
- Push to Remote: Erfolgreich
- Master Checklist aktualisiert

### Git-Statistik
- Branch: feature/daten-tab-refactoring → main
- Commits: 6 (Phase 0, 3, 4, 5, 6, Merge)
- Files changed: ~6
- Code: +500 Zeilen (Tests + Docs)

### Deployment
- Vercel: [Auto-Deploy läuft]

### Nächste Schritte
Phase 2.5: Verteiler Tab Refactoring
```

---

## 📊 Erfolgs-Kriterien

### Must-Have (Mindestanforderungen)

- [x] ProjectFoldersView bereits refactored (Phase 0.1) ✅
- [ ] React.memo auf DatenTabContent
- [ ] 10+ Tests (100% passed)
- [ ] 80%+ Test-Coverage
- [ ] 2.000+ Zeilen Dokumentation
- [ ] TypeScript: 0 neue Fehler
- [ ] ESLint: 0 Warnings
- [ ] Design System: 100% compliant

### Nice-to-Have

- [ ] 95%+ Test-Coverage
- [ ] Integration Tests mit ProjectFoldersView
- [ ] Vercel Production Tests erfolgreich

---

## 🎯 Zusammenfassung

### Was macht dieses Refactoring besonders?

1. **Meiste Arbeit bereits erledigt:**
   - ProjectFoldersView (800+ LOC) → Refactored in Phase 0.1
   - SmartUploadInfoPanel → Entfernt/Integriert
   - 113/113 Tests → Bereits vorhanden
   - 4.579 Zeilen Docs → Bereits vorhanden

2. **DatenTabContent ist nur ein Wrapper:**
   - Nur 49 Zeilen Code
   - Keine komplexe Logik
   - Nutzt refactored ProjectFoldersView

3. **Sehr wenig Aufwand:**
   - Geschätzter Aufwand: 0.5-1 Tag (statt 3-4 Tage)
   - Nur Performance, Tests & Docs fehlen
   - Kein React Query, keine Modularisierung nötig

### Erwartetes Ergebnis

**Vorher:**
- DatenTabContent: 49 Zeilen (ohne Tests, ohne Docs)
- ProjectFoldersView: ~800 LOC (monolithisch)
- SmartUploadInfoPanel: Separate Komponente

**Nachher:**
- DatenTabContent: 49 Zeilen (React.memo, 10 Tests, 2.200 Zeilen Docs)
- ProjectFoldersView: 478 Zeilen + 10 Module (bereits refactored)
- SmartUploadInfoPanel: Entfernt/Integriert

**Gesamt-Erfolg:**
- Code-Reduktion: -800 LOC (durch Phase 0.1)
- Test-Coverage: +113 Tests (durch Phase 0.1) + 10 Tests (neu)
- Dokumentation: +4.579 Zeilen (durch Phase 0.1) + 2.200 Zeilen (neu)
- Performance: React.memo auf DatenTabContent
- Production-Ready: 100%

---

**Erstellt:** 2025-10-26
**Letztes Update:** 2025-10-26
**Status:** 📋 Geplant - Bereit für Implementierung

---

## 📚 Anhang

### README Template (für Phase 5)

```markdown
# Daten Tab - Dokumentation

**Version:** 1.0
**Erstellt:** 2025-10-26
**Projekt:** CeleroPress - SKAMP

---

## 📋 Übersicht

Der Daten Tab ermöglicht die zentrale Verwaltung aller Projektdateien und Dokumente in der Project Detail Page.

**Entry Point:** `src/app/dashboard/projects/[projectId]/components/tab-content/DatenTabContent.tsx`

**Besonderheit:** Diese Komponente ist ein **schlanker Wrapper** (49 Zeilen), der die refactored `ProjectFoldersView` Komponente nutzt (Phase 0.1).

---

## 🎯 Features

- ✅ **Alle Projekt-Ordner anzeigen** (filterByFolder="all")
- ✅ **Upload-Funktionalität** (Drag & Drop)
- ✅ **Ordner-Navigation** (mit Breadcrumbs)
- ✅ **Datei-Aktionen** (Anzeigen, Bearbeiten, Löschen, Verschieben)
- ✅ **Document Editor Integration** (Word/Excel Dokumente)
- ✅ **Performance-optimiert** (React.memo)
- ✅ **Vollständig getestet** (10/10 Tests, 100% Coverage)

---

## 📁 Datei-Struktur

### Komponente

\`\`\`
src/app/dashboard/projects/[projectId]/components/tab-content/
└── DatenTabContent.tsx              # 49 Zeilen - Wrapper-Komponente
\`\`\`

### Shared Component (bereits refactored in Phase 0.1)

\`\`\`
src/components/projects/
├── ProjectFoldersView.tsx           # 478 Zeilen - Hauptkomponente
└── folders/
    ├── components/
    │   ├── FolderNavigation.tsx
    │   ├── FileList.tsx
    │   ├── UploadZone.tsx
    │   ├── DeleteConfirmDialog.tsx
    │   ├── MoveAssetModal.tsx
    │   ├── FolderCreateDialog.tsx
    │   └── BoilerplateImportDialog.tsx
    └── hooks/
        ├── useFolderNavigation.ts
        ├── useFileActions.ts
        └── useDocumentEditor.ts
\`\`\`

### Tests

\`\`\`
src/app/dashboard/projects/[projectId]/components/tab-content/__tests__/
└── DatenTabContent.test.tsx         # 10 Tests

src/components/projects/folders/__tests__/
└── [113 Tests für ProjectFoldersView - Phase 0.1]
\`\`\`

---

## 🚀 Usage

### Basic Usage

\`\`\`tsx
import { DatenTabContent } from './components/tab-content/DatenTabContent';

function ProjectDetailPage() {
  const project = useProject();
  const { projectFolders, foldersLoading } = useProjectFolders(project.id);

  return (
    <DatenTabContent
      project={project}
      organizationId={currentOrganization.id}
      projectFolders={projectFolders}
      foldersLoading={foldersLoading}
      onRefresh={async () => {
        await refetchProjectFolders();
      }}
    />
  );
}
\`\`\`

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| project | Project | ✅ | Projekt-Objekt |
| organizationId | string | ✅ | ID der Organisation |
| projectFolders | ProjectFolders | ✅ | Ordner-Daten |
| foldersLoading | boolean | ✅ | Loading-State |
| onRefresh | () => Promise<void> | ✅ | Callback zum Neu-Laden |

---

## 🔗 Integration mit ProjectFoldersView

DatenTabContent nutzt die refactored `ProjectFoldersView` Komponente:

\`\`\`tsx
<ProjectFoldersView
  projectId={project.id}
  organizationId={organizationId}
  customerId={project.customer?.id}
  customerName={project.customer?.name}
  projectFolders={projectFolders}
  foldersLoading={foldersLoading}
  onRefresh={onRefresh}
  filterByFolder="all"  // ⭐ Zeigt ALLE Ordner
/>
\`\`\`

**filterByFolder Werte:**
- `"all"` - Zeigt alle Projekt-Ordner (Daten Tab)
- `"Dokumente"` - Zeigt nur Dokumente-Ordner (Strategie Tab)

**Weitere Informationen:**
- Siehe `docs/projects/folders/README.md` (Phase 0.1 Dokumentation)

---

## 📊 Test-Coverage

### DatenTabContent Tests

\`\`\`
Tests:    10/10 passed (100%)
Coverage: 100% (Statement, Branch, Function, Line)
\`\`\`

**Test-Kategorien:**
1. **Rendering** (4 Tests)
2. **Props Passing** (2 Tests)
3. **Performance** (2 Tests)

### ProjectFoldersView Tests (Phase 0.1)

\`\`\`
Tests:    113/113 passed (100%)
Coverage: 95%+ (Hooks, Components, Integration)
\`\`\`

---

## 🎨 Design System

### Verwendete Komponenten

- **Heading** (level={3}) - "Projektdaten verwalten"
- **Text** (text-gray-500) - Beschreibungstext
- **ProjectFoldersView** - Ordner-Verwaltung

### Design Guidelines

- ✅ Primary Color: #005fab (in ProjectFoldersView)
- ✅ Heroicons /24/outline (in ProjectFoldersView)
- ✅ Zinc-Palette für neutrale Farben (text-gray-500)
- ✅ Keine Schatten (außer Dropdowns in ProjectFoldersView)

---

## 🚀 Migration Guide

### Von Alt nach Neu

**Keine Migration erforderlich!**

DatenTabContent wurde bereits in Phase 1.1 (Project Detail Page Refactoring) extrahiert.

Die meiste Arbeit wurde in Phase 0.1 (ProjectFoldersView Refactoring) erledigt.

---

## 📚 Weitere Dokumentation

- **API Dokumentation:** `docs/projects/daten-tab-refactoring/api/README.md`
- **Komponenten-Docs:** `docs/projects/daten-tab-refactoring/components/README.md`
- **ADRs:** `docs/projects/daten-tab-refactoring/adr/README.md`
- **ProjectFoldersView Docs:** `docs/projects/folders/README.md` (Phase 0.1)

---

**Letztes Update:** 2025-10-26
\`\`\`

### API README Template

[... gekürzt, kann bei Bedarf ausgefüllt werden ...]

### Components README Template

[... gekürzt, kann bei Bedarf ausgefüllt werden ...]

### ADR Template

[... gekürzt, kann bei Bedarf ausgefüllt werden ...]

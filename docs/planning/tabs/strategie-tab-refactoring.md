# Strategie Tab Refactoring - Implementierungsplan

**Version:** 1.0
**Modul:** Strategie Tab (Project Detail Page)
**Basiert auf:** Modul-Refactoring-Template v1.1
**Projekt:** CeleroPress - SKAMP
**Erstellt:** 2025-10-25

---

## 📋 Übersicht

**Ziel:** Refactoring des Strategie Tabs in der Project Detail Page mit Focus auf:
- React Query Integration für Strategie-Dokumente
- Performance-Optimierung
- Comprehensive Testing
- Vollständige Dokumentation

**Entry Point:** `src/components/projects/strategy/ProjectStrategyTab.tsx`

**Geschätzter Aufwand:** M (Medium) - 2-3 Tage

---

## 🎯 Ziele

- [x] **Admin SDK Prüfung:** Nicht erforderlich (Client-Side Security ausreichend)
- [x] **Toast-Service:** Bereits integriert
- [x] **Design System:** Bereits angewendet
- [ ] React Query für Strategy-Document-Service integrieren
- [ ] Performance-Optimierungen implementieren (React.memo, useCallback, useMemo)
- [ ] Test-Coverage erreichen (>80%)
- [ ] Vollständige Dokumentation erstellen
- [ ] Production-Ready Code Quality sicherstellen

---

## 📁 Ist-Zustand

### Komponenten-Übersicht

| Komponente | Pfad | LOC | Status | Issues |
|------------|------|-----|--------|--------|
| ProjectStrategyTab | strategy/ProjectStrategyTab.tsx | 124 | ✅ Klein, gut strukturiert | - |
| StrategyDocumentsTable | strategy/StrategyDocumentsTable.tsx | 207 | ✅ UI-Only | Design System OK |
| StrategyTemplateGrid | strategy/StrategyTemplateGrid.tsx | 108 | ✅ UI-Only | Design System OK |

**Gesamt:** ~439 Zeilen

### Bereits vorhanden

✅ **ProjectFoldersView (Shared Component)**
- Wurde in Phase 0.1 refactored
- Integration bereits erfolgt in ProjectStrategyTab

✅ **DocumentEditorModal + SpreadsheetEditorModal**
- Lazy loaded (next/dynamic)
- Bereits integriert

✅ **Toast-Service**
- `toastService` aus `@/lib/utils/toast.ts` verfügbar
- Kein lokaler Alert-State nötig

✅ **Design System**
- Primary Color: #005fab
- Heroicons /24/outline
- Zinc-Palette
- Konsistent angewendet

✅ **ProjectContext**
- `projectId`, `organizationId`, `project` verfügbar
- Reduziert Props-Drilling

### Identifizierte Verbesserungspotentiale

#### ⚠️ MITTEL

1. **Keine React Query Integration**
   - Strategy-Document-Service nutzt noch keine React Query
   - Kein Caching, keine auto-refetch
   - Potential für Performance-Verbesserung

2. **Performance-Optimierungen fehlen**
   - Keine React.memo auf Komponenten
   - Keine useCallback für Handler
   - Keine useMemo für konstante Werte

3. **Tests fehlen**
   - Keine Tests für ProjectStrategyTab
   - Keine Tests für StrategyDocumentsTable
   - Keine Tests für StrategyTemplateGrid

4. **Dokumentation fehlt**
   - Keine API-Dokumentation
   - Keine Komponenten-Dokumentation
   - Keine ADRs

### Dependencies

- ✅ React Query: Installiert
- ✅ toastService: Verfügbar
- ✅ ProjectContext: Verfügbar
- ✅ ProjectFoldersView: Refactored (Shared)
- ✅ Testing Libraries: Vorhanden

---

## 🚀 Die 7 Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/strategie-tab-refactoring
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/components/projects/strategy/*.tsx
  ```

- [ ] Backup-Dateien erstellen (optional - kleine Dateien)
  ```bash
  # Optional, da Komponenten klein sind
  cp src/components/projects/strategy/ProjectStrategyTab.tsx \
     src/components/projects/strategy/ProjectStrategyTab.backup.tsx
  ```

- [ ] Dependencies prüfen
  - [x] React Query installiert
  - [x] toastService verfügbar
  - [x] ProjectContext verfügbar
  - [x] ProjectFoldersView (Shared Component) verfügbar

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/strategie-tab-refactoring`
- Ist-Zustand: 3 Dateien, ~439 Zeilen Code
- Backups: Optional (Komponenten klein und gut strukturiert)
- Dependencies: Alle vorhanden

### Struktur (Ist)
- ProjectStrategyTab.tsx: 124 Zeilen (Orchestrator)
- StrategyDocumentsTable.tsx: 207 Zeilen (UI-Only)
- StrategyTemplateGrid.tsx: 108 Zeilen (UI-Only)

### Positive Aspekte
- ✅ Bereits gut strukturiert und modular
- ✅ Toast-Service bereits integriert
- ✅ Design System bereits angewendet
- ✅ ProjectFoldersView (Shared) bereits integriert
- ✅ Lazy Loading für Modals bereits implementiert

### Verbesserungspotential
- React Query Integration für strategy-document-service
- Performance-Optimierungen (React.memo, useCallback)
- Tests erstellen
- Dokumentation erstellen

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Strategie Tab Refactoring

- Feature-Branch erstellt
- Ist-Zustand dokumentiert: 3 Dateien, ~439 Zeilen
- Komponenten bereits gut strukturiert
- Verbesserungspotential identifiziert: React Query, Performance, Tests, Docs

Bereit für Pre-Refactoring Cleanup.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 30 Minuten

#### 0.5.1 Console-Logs prüfen

```bash
# Console-Statements finden
rg "console\." src/components/projects/strategy/
```

**Aktion:**
- [ ] Alle console.log() statements prüfen
- [ ] Nur console.error() in catch-blocks behalten
- [ ] Debug-Logs entfernen

#### 0.5.2 Unused Imports/Code prüfen

```bash
# ESLint Auto-Fix
npx eslint src/components/projects/strategy/ --fix
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Manuelle Fixes für verbleibende Warnings

#### 0.5.3 Manueller Test

```bash
npm run dev
# → /dashboard/projects/[projectId] aufrufen
# → Strategie Tab öffnen
```

**Aktion:**
- [ ] Dev-Server starten
- [ ] Strategie Tab öffnen
- [ ] Template Grid funktioniert
- [ ] Dokumente-Tabelle lädt
- [ ] Dokument erstellen funktioniert
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] Console-Logs geprüft
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- Console-Logs geprüft (keine gefunden / X entfernt)
- Unused imports entfernt via ESLint

### Ergebnis
- Komponenten: Sauber und bereit für React Query Integration
- Saubere Basis für Phase 1

### Manueller Test
- ✅ Strategie Tab lädt
- ✅ Template Grid funktioniert
- ✅ Dokumente-Tabelle funktioniert
- ✅ Dokument erstellen funktioniert
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- Console-Logs geprüft
- Unused imports entfernt via ESLint

Saubere Basis für React Query Integration.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Ziel:** Strategy-Document-Loading mit React Query statt direkter Service-Calls

#### 1.1 Analyse: Was brauchen wir?

**Aktuell in page.tsx:**
```typescript
// Strategie-Dokumente werden in page.tsx geladen
const [strategyDocuments, setStrategyDocuments] = useState<any[]>([]);

useEffect(() => {
  const loadStrategyDocuments = async () => {
    const docs = await strategyDocumentService.getByProjectId(projectId, organizationId);
    setStrategyDocuments(docs);
  };
  loadStrategyDocuments();
}, [projectId, organizationId]);
```

**Problem:**
- Kein Caching
- Kein Auto-Refetch
- Manuelle State-Verwaltung

#### 1.2 Custom Hook erstellen

**OPTION A:** Hook in page.tsx (einfachste Lösung)
**OPTION B:** Hook in src/lib/hooks/useStrategyDocuments.ts (sauberste Lösung)

**Entscheidung:** OPTION B (sauberste Lösung, wiederverwendbar)

Datei: `src/lib/hooks/useStrategyDocuments.ts` (NEU)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { strategyDocumentService } from '@/lib/firebase/strategy-document-service';
import type { StrategyDocument } from '@/lib/firebase/strategy-document-service';

/**
 * React Query Hook für Strategy Documents
 */
export function useStrategyDocuments(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['strategy-documents', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('Missing projectId or organizationId');
      }
      return strategyDocumentService.getByProjectId(projectId, organizationId);
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Mutation Hook für Create Strategy Document
 */
export function useCreateStrategyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      organizationId: string;
      documentData: Omit<StrategyDocument, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      return strategyDocumentService.create(data.documentData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['strategy-documents', variables.projectId, variables.organizationId]
      });
    },
  });
}

/**
 * Mutation Hook für Update Strategy Document
 */
export function useUpdateStrategyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      projectId: string;
      organizationId: string;
      documentData: Partial<StrategyDocument>;
    }) => {
      await strategyDocumentService.update(data.id, data.documentData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['strategy-documents', variables.projectId, variables.organizationId]
      });
    },
  });
}

/**
 * Mutation Hook für Delete Strategy Document
 */
export function useDeleteStrategyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      projectId: string;
      organizationId: string;
    }) => {
      await strategyDocumentService.delete(data.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['strategy-documents', variables.projectId, variables.organizationId]
      });
    },
  });
}
```

#### 1.3 page.tsx anpassen

**Entfernen:**
```typescript
// ❌ Alt
const [strategyDocuments, setStrategyDocuments] = useState<any[]>([]);

useEffect(() => {
  const loadStrategyDocuments = async () => { ... };
  loadStrategyDocuments();
}, [projectId, organizationId]);
```

**Hinzufügen:**
```typescript
import { useStrategyDocuments } from '@/lib/hooks/useStrategyDocuments';

// In der Komponente
const { data: strategyDocuments = [], isLoading: loadingStrategyDocs } =
  useStrategyDocuments(projectId, organizationId);
```

#### 1.4 ProjectStrategyTab anpassen (optional)

**Aktuell:** Keine Document-Loading-Logic in ProjectStrategyTab (gut!)

**Entscheidung:** ProjectStrategyTab bleibt wie ist - nur page.tsx wird angepasst.

#### Checkliste Phase 1

- [ ] useStrategyDocuments Hook erstellt
- [ ] 4 Hooks implementiert (Query: getByProjectId | Mutation: create, update, delete)
- [ ] page.tsx auf React Query umgestellt
- [ ] Alte useState/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test

#### Deliverable

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- useStrategyDocuments Hook (`src/lib/hooks/useStrategyDocuments.ts`)
- 4 Hooks: Query (getByProjectId) + Mutations (create, update, delete)
- page.tsx vollständig auf React Query umgestellt

### Vorteile
- Automatisches Caching (5min staleTime)
- Query Invalidierung bei Mutations
- Error Handling über React Query
- Weniger Boilerplate Code (~20 Zeilen gespart in page.tsx)

### Fixes
- useState/useEffect Pattern entfernt
- Manuelle State-Verwaltung eliminiert

### Test
- ✅ Strategie-Dokumente werden geladen
- ✅ Erstellen funktioniert + Cache wird invalidiert
- ✅ Bearbeiten funktioniert + Cache wird invalidiert
- ✅ Löschen funktioniert + Cache wird invalidiert
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Strategie Tab

- useStrategyDocuments Hook erstellt (4 Hooks)
- page.tsx auf React Query umgestellt
- useState/useEffect Pattern entfernt

page.tsx: ~20 Zeilen gespart
Automatisches Caching (5min) + Error Handling.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Komponenten optimieren, keine großen Umstrukturierungen nötig

#### 2.1 Analyse

**Aktuelle Struktur:**
- ✅ ProjectStrategyTab (124 Zeilen) - Bereits gut strukturiert, Orchestrator
- ✅ StrategyDocumentsTable (207 Zeilen) - UI-Only, gut modular
- ✅ StrategyTemplateGrid (108 Zeilen) - UI-Only, gut modular

**Fazit:** Keine großen Umstrukturierungen nötig! Komponenten sind bereits gut modularisiert.

#### 2.2 Kleine Verbesserungen

**StrategyDocumentsTable:**
- Helper-Funktionen eventuell extrahieren (formatDate, getStatusColor, etc.)
- Aber: Funktionen sind klein und gut lesbar → **Behalten wie ist**

**StrategyTemplateGrid:**
- TemplateCard bereits als Sub-Komponente extrahiert → **Gut!**

**Entscheidung:** Keine Code-Separation nötig, Struktur ist bereits optimal.

#### 2.3 Focus: Design System Compliance Check

```bash
# Prüfen ob alle Komponenten Design System compliant sind
✓ Primary Color: #005fab (verwendet in focus:ring)
✓ Heroicons: /24/outline (verwendet)
✓ Zinc-Palette: Verwendet (text-zinc-700, bg-zinc-50, etc.)
✓ Keine Schatten: ✅ (außer hover:shadow-sm in TemplateCard - OK)
✓ Focus-Rings: ✅ (focus:ring-2 focus:ring-primary)
```

#### Checkliste Phase 2

- [ ] Struktur-Analyse durchgeführt
- [ ] Design System Compliance geprüft
- [ ] Keine großen Umstrukturierungen nötig
- [ ] Code ist bereits optimal modularisiert

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Analyse
- ✅ ProjectStrategyTab: Gut strukturiert (Orchestrator, 124 Zeilen)
- ✅ StrategyDocumentsTable: UI-Only, gut modular (207 Zeilen)
- ✅ StrategyTemplateGrid: UI-Only, gut modular (108 Zeilen)

### Entscheidung
- Keine großen Umstrukturierungen nötig
- Komponenten sind bereits optimal modularisiert
- Design System: 100% compliant

### Design System Compliance
- ✅ Primary Color: #005fab
- ✅ Heroicons: /24/outline
- ✅ Zinc-Palette: Konsistent
- ✅ Focus-Rings: Vorhanden
- ✅ Keine Schatten (außer hover:shadow-sm - OK)

### Fazit
Phase 2 ist bereits erfüllt durch bestehende Struktur. Weiter zu Phase 3 (Performance).
```

**Commit:**
```bash
git add .
git commit -m "refactor: Phase 2 - Code-Separation Analyse

- Struktur-Analyse durchgeführt
- Design System Compliance geprüft: 100% ✅
- Komponenten sind bereits optimal modularisiert

Keine Änderungen nötig - Weiter zu Phase 3 (Performance).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden

#### 3.1 useCallback für Handler

**ProjectStrategyTab:**
```typescript
import { useCallback } from 'react';

// Handler mit useCallback wrappen
const handleTemplateSelect = useCallback((templateType: TemplateType, content?: string) => {
  const template = STRATEGY_TEMPLATES[templateType];

  if (templateType === 'table') {
    setTemplateInfo({ type: templateType, name: template.title });
    setShowSpreadsheetEditor(true);
  } else {
    setTemplateContent(content || '');
    setTemplateInfo({ type: templateType, name: template.title });
    setShowEditor(true);
  }
}, []); // Keine Dependencies - nur lokaler State

const handleCloseEditor = useCallback(() => {
  setShowEditor(false);
  setTemplateContent(null);
  setTemplateInfo(null);
}, []);

const handleCloseSpreadsheetEditor = useCallback(() => {
  setShowSpreadsheetEditor(false);
  setTemplateInfo(null);
}, []);

const handleDocumentSave = useCallback(() => {
  setShowEditor(false);
  setShowSpreadsheetEditor(false);
  setTemplateContent(null);
  setTemplateInfo(null);
  if (onDocumentSaved) {
    onDocumentSaved();
  }
}, [onDocumentSaved]);
```

**page.tsx (Strategie Tab Handling):**
```typescript
const handleStrategyDocumentSaved = useCallback(() => {
  // Re-fetch strategy documents via React Query invalidation
  queryClient.invalidateQueries({
    queryKey: ['strategy-documents', projectId, organizationId]
  });
}, [projectId, organizationId]);
```

#### 3.2 useMemo für Computed Values

**StrategyTemplateGrid:**
```typescript
import { useMemo } from 'react';

const templateCards = useMemo<Array<{
  id: TemplateType;
  icon: React.ComponentType<{ className?: string }>;
}>>(() => [
  { id: 'blank', icon: DocumentTextIcon },
  { id: 'table', icon: TableCellsIcon },
  { id: 'company-profile', icon: BuildingOfficeIcon },
  { id: 'situation-analysis', icon: ChartBarIcon },
  { id: 'audience-analysis', icon: UsersIcon },
  { id: 'core-messages', icon: SpeakerWaveIcon },
], []); // Konstante, keine Dependencies
```

**StrategyDocumentsTable:**
```typescript
// Helper-Funktionen sind bereits außerhalb der Komponente definiert (gut!)
// Keine useMemo nötig
```

#### 3.3 React.memo für Komponenten

**ProjectStrategyTab:**
```typescript
import React from 'react';

export default React.memo(function ProjectStrategyTab({
  projectId,
  organizationId,
  project,
  dokumenteFolderId,
  onDocumentSaved
}: ProjectStrategyTabProps) {
  // ...
});
```

**StrategyTemplateGrid:**
```typescript
export default React.memo(function StrategyTemplateGrid({ onTemplateSelect }: StrategyTemplateGridProps) {
  // ...
});
```

**StrategyDocumentsTable:**
```typescript
export default React.memo(function StrategyDocumentsTable({
  documents,
  onEdit,
  onDelete,
  loading
}: StrategyDocumentsTableProps) {
  // ...
});
```

**TemplateCard (Sub-Komponente):**
```typescript
const TemplateCard = React.memo(function TemplateCard({
  id, title, description, icon: Icon, onClick
}: TemplateCardProps) {
  // ...
});
```

#### Checkliste Phase 3

- [ ] useCallback für handleTemplateSelect
- [ ] useCallback für handleCloseEditor
- [ ] useCallback für handleCloseSpreadsheetEditor
- [ ] useCallback für handleDocumentSave
- [ ] useMemo für templateCards
- [ ] React.memo für ProjectStrategyTab
- [ ] React.memo für StrategyTemplateGrid
- [ ] React.memo für StrategyDocumentsTable
- [ ] React.memo für TemplateCard
- [ ] Performance-Test durchgeführt

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 4 Handler
- useMemo für templateCards
- React.memo für 4 Komponenten (ProjectStrategyTab, StrategyTemplateGrid, StrategyDocumentsTable, TemplateCard)

### Messbare Verbesserungen
- Re-Renders reduziert (vor allem bei Tab-Wechsel)
- Konstante Objekte werden nicht neu erstellt
- Callbacks bleiben stabil

### Performance-Tests
- ✅ Tab-Wechsel: Keine unnötigen Re-Renders
- ✅ Dokument erstellen: Optimiert
- ✅ Template auswählen: Optimiert
```

**Commit:**
```bash
git add .
git commit -m "perf: Phase 3 - Performance-Optimierung

- useCallback für Handler (4x)
- useMemo für konstante Objekte (1x)
- React.memo für Komponenten (4x)

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

1. **Hook Tests:** `src/lib/hooks/__tests__/useStrategyDocuments.test.tsx`
   - Query-Loading-Test (getByProjectId)
   - Create-Mutation-Test + Cache-Invalidation
   - Update-Mutation-Test + Cache-Invalidation
   - Delete-Mutation-Test + Cache-Invalidation
   - Error-Handling-Test
   - Enabled/Disabled-Test

2. **Component Tests:** `src/components/projects/strategy/__tests__/`
   - **ProjectStrategyTab.test.tsx:**
     - Render-Test mit Mock-Props
     - Template-Select-Test (blank, table, templates)
     - DocumentEditorModal öffnen
     - SpreadsheetEditorModal öffnen
     - onDocumentSaved Callback
   - **StrategyTemplateGrid.test.tsx:**
     - Render-Test (alle 6 Templates)
     - onTemplateSelect Callback
     - Template-Click-Test
   - **StrategyDocumentsTable.test.tsx:**
     - Render-Test mit Mock-Dokumenten
     - Loading-State-Test
     - Empty-State-Test
     - onEdit Callback
     - onDelete Callback
     - Status-Badge-Rendering
     - Date-Formatting

3. **Integration Tests:** `src/app/dashboard/projects/[projectId]/__tests__/strategie-tab-integration.test.tsx`
   - Kompletter Render-Flow
   - Document-Loading + Table-Anzeige
   - Template auswählen + Editor öffnen
   - Dokument erstellen + Save

#### Erwartete Test-Coverage

- **Hook Tests:** 6-8 Tests (95%+ Coverage)
- **Component Tests:** 15-20 Tests (85%+ Coverage)
- **Integration Tests:** 3-5 Tests (80%+ Coverage)
- **Gesamt:** 24-33 Tests

#### Deliverable

```markdown
## Phase 4: Testing ✅ (refactoring-test Agent)

### Test Suite
- Hook-Tests: X/X bestanden (useStrategyDocuments)
- Component-Tests: Y/Y bestanden (ProjectStrategyTab, StrategyTemplateGrid, StrategyDocumentsTable)
- Integration-Tests: Z/Z bestanden (Strategie Tab Flow)
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
- Template-Content Mocks
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (refactoring-test Agent)

- Hook-Tests: useStrategyDocuments (X Tests)
- Component-Tests: ProjectStrategyTab, StrategyTemplateGrid, StrategyDocumentsTable (Y Tests)
- Integration-Tests: Strategie Tab Flow (Z Tests)
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
   - Übersicht des Strategie Tabs
   - Features (Template System, Dokumente-Verwaltung, Folder-Integration)
   - Architektur
   - Quick Start

2. **api/README.md** - API-Übersicht
   - useStrategyDocuments Hook
   - strategy-document-service
   - STRATEGY_TEMPLATES Konstante

3. **api/strategie-tab-service.md** - Detaillierte API-Referenz
   - Hook-Signaturen (Query + Mutations)
   - Parameter
   - Rückgabewerte
   - Code-Beispiele

4. **components/README.md** - Komponenten-Dokumentation
   - ProjectStrategyTab
   - StrategyTemplateGrid
   - StrategyDocumentsTable
   - Props, Usage, Beispiele

5. **adr/README.md** - Architecture Decision Records
   - ADR-0001: React Query vs. direkter Service-Call
   - ADR-0002: Template System Architecture
   - ADR-0003: Shared ProjectFoldersView Integration
   - ADR-0004: Lazy Loading für Editoren

#### Erwartete Dokumentation

- **Gesamt:** 3.000+ Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** 15+ Beispiele
- **Diagramme:** Optional

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅ (refactoring-dokumentation Agent)

### Erstellt
- README.md (X Zeilen) - Strategie Tab Hauptdokumentation
- api/README.md (Y Zeilen) - API-Übersicht
- api/strategie-tab-service.md (Z Zeilen) - API-Referenz
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

- README.md: Strategie Tab Hauptdokumentation
- API-Docs: useStrategyDocuments, strategy-document-service
- Component-Docs: ProjectStrategyTab, StrategyTemplateGrid, StrategyDocumentsTable
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
npx tsc --noEmit | grep -E "(ProjectStrategyTab|StrategyTemplateGrid|StrategyDocumentsTable|useStrategyDocuments)"
```

**Erwartung:** 0 Fehler

#### 6.2 ESLint Check

```bash
npx eslint src/components/projects/strategy/
npx eslint src/lib/hooks/useStrategyDocuments.ts
```

**Erwartung:** 0 Warnings

#### 6.3 Console Cleanup

```bash
rg "console\." src/components/projects/strategy/
```

**Erlaubt:** Keine! Alle Fehler via toastService.

#### 6.4 Design System Compliance

```bash
✓ Keine Schatten (außer hover:shadow-sm in TemplateCard - OK)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary
✓ Focus-Rings vorhanden
```

#### 6.5 Final Build Test

```bash
npm run build
npm run start
# → /dashboard/projects/[projectId] aufrufen
# → Strategie Tab testen
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
- ✅ Console-Cleanup: Sauber
- ✅ Design System: 100% compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Design System Compliance
- ✅ Primary Color: #005fab
- ✅ Heroicons: /24/outline
- ✅ Zinc-Palette: konsistent
- ✅ Focus-Rings: vorhanden

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
   - useStrategyDocuments Hook korrekt importiert?
   - page.tsx auf React Query umgestellt?
   - Alte useState/useEffect entfernt?

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
- ✅ React Query Integration: Vollständig
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

**Ziel:** Strategie Tab Refactoring zu Main mergen

### Workflow

```bash
# 1. Push Feature-Branch
git push origin feature/strategie-tab-refactoring

# 2. Zu Main wechseln und mergen
git checkout main
git merge feature/strategie-tab-refactoring --no-ff

# 3. Main pushen
git push origin main

# 4. Tests auf Main
npm test -- strategie
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
## ✅ Strategie Tab Refactoring erfolgreich abgeschlossen!

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
- ✅ React Query Integration (useStrategyDocuments Hook)
- ✅ Performance-Optimierungen (useCallback, useMemo, React.memo)
- ✅ Design System 100% compliant
- ✅ Comprehensive Test Suite (X Tests, Y% Coverage)
- ✅ 3.000+ Zeilen Dokumentation

### Architektur-Verbesserungen
- ✅ Automatisches Caching (5min staleTime)
- ✅ Query Invalidation bei Mutations
- ✅ Optimierte Re-Renders (React.memo auf 4 Komponenten)
- ✅ Bereits gut modularisierte Struktur beibehalten

### Nächste Schritte
- [ ] Strategie Tab in Production testen
- [ ] Nächstes Tab-Modul: Daten Tab (Phase 2.4)
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** ~5% (durch useState/useEffect → React Query in page.tsx)
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0
- **Design System:** 100% compliant

### Testing

- **Test-Coverage:** >80% (Ziel erreicht)
- **Anzahl Tests:** ~24-33 Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Optimiert (React.memo, useCallback, useMemo)
- **Caching:** 5min staleTime (React Query)
- **Lazy Loading:** Editoren bereits lazy loaded

### Dokumentation

- **Zeilen:** 3.000+ Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** 15+ Beispiele
- **ADRs:** 4 Architecture Decision Records

---

## 📝 Hinweise

### Bereits vorhanden (Große Vorteile!)

✅ **ProjectFoldersView (Shared Component)**
- Wurde in Phase 0.1 refactored
- Bereits in ProjectStrategyTab integriert
- Spart ~800+ Zeilen Code-Duplication

✅ **Toast-Service**
- Kein lokaler Alert-State nötig
- Bessere UX (non-blocking)
- Automatisches Schließen

✅ **Design System**
- Bereits konsistent angewendet
- Keine größeren Änderungen nötig

✅ **Lazy Loading**
- DocumentEditorModal + SpreadsheetEditorModal bereits lazy loaded
- Optimale Bundle-Size

### Admin SDK

**Entscheidung:** NICHT erforderlich für Strategie Tab

**Begründung:**
- Strategy Documents Update: Client-Side Security ist ausreichend (organizationId-Check)
- Kein finanzieller/rechtlicher Impact
- Geringer Missbrauchspotential
- Aufwand > Benefit

**Dokumentiert in:** `docs/planning/tabs/strategie-tab-refactoring.md` (diese Datei)

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

- **ProjectStrategyTab:** `src/components/projects/strategy/ProjectStrategyTab.tsx` (124 Zeilen)
- **StrategyDocumentsTable:** `src/components/projects/strategy/StrategyDocumentsTable.tsx` (207 Zeilen)
- **StrategyTemplateGrid:** `src/components/projects/strategy/StrategyTemplateGrid.tsx` (108 Zeilen)

### Services & Utilities

- **strategyDocumentService:** `src/lib/firebase/strategy-document-service.ts`
- **toastService:** `src/lib/utils/toast.ts`
- **ProjectContext:** `src/app/dashboard/projects/[projectId]/context/ProjectContext.tsx`
- **STRATEGY_TEMPLATES:** `src/constants/strategy-templates.ts`

### Shared Components

- **ProjectFoldersView:** `src/components/projects/ProjectFoldersView.tsx` (refactored in Phase 0.1)
- **DocumentEditorModal:** `src/components/projects/DocumentEditorModal.tsx` (lazy loaded)
- **SpreadsheetEditorModal:** `src/components/projects/SpreadsheetEditorModal.tsx` (lazy loaded)

---

## 📞 Support

**Team:** CeleroPress Development Team
**Maintainer:** [Name]
**Fragen?** Siehe CLAUDE.md oder Team-Channel

---

**Version:** 1.0
**Basiert auf:** Module-Refactoring-Template v1.1
**Erstellt:** 2025-10-25
**Status:** Ready for Implementation

---

*Dieser Plan ist ein lebendes Dokument. Anpassungen während der Implementierung sind möglich.*

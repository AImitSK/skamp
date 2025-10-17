# Projekt-Übersicht Refactoring - Implementierungsplan

**Version:** 1.0
**Datum:** 2025-10-17
**Modul:** `/dashboard/projects` (Übersicht)
**Basiert auf:** Modul-Refactoring Template v1.1

---

## 📋 Übersicht

Die Projekt-Übersicht (`/dashboard/projects`) ist mit **2069 Zeilen Code** eines der komplexesten Module in CeleroPress. Das Modul umfasst:

- **Kanban-Board** mit Drag & Drop
- **Tabellen-Ansicht** mit Archiv-Filter
- **Projekt-Wizard** (Creation + Edit)
- **75+ Komponenten** in `/components/projects/`

**Strategie:** Wir teilen das Refactoring in **4 separate Phasen** auf, um die Komplexität zu beherrschen und das Risiko zu minimieren.

---

## 🎯 Ziele

### Gesamt-Ziele

- [ ] React Query für State Management integrieren
- [ ] Code-Duplikation eliminieren
- [ ] Performance-Optimierungen implementieren
- [ ] Test-Coverage >80% erreichen
- [ ] Vollständige Dokumentation erstellen
- [ ] Production-Ready Code Quality sicherstellen

### Modul-spezifische Ziele

- [ ] `page.tsx` von 827 auf <400 Zeilen reduzieren
- [ ] View-Modes (Board/List) klar trennen
- [ ] Filter-Logik modularisieren
- [ ] Wizard-Integration vereinfachen
- [ ] Shared Components für Projekt-Listen erstellen

---

## 📊 Ist-Zustand

### Code-Statistiken

```bash
npx cloc src/app/dashboard/projects --by-file
```

**Ergebnis:**
- `page.tsx`: 827 Zeilen Code
- `[projectId]/page.tsx`: 1234 Zeilen Code (wird später behandelt)
- `layout.tsx`: 8 Zeilen Code
- **Gesamt:** 2069 Zeilen

### Komponenten-Übersicht

```
src/components/projects/
├── kanban/              # Kanban-Board Komponenten
│   ├── KanbanBoard.tsx
│   ├── KanbanColumn.tsx
│   ├── ProjectCard.tsx
│   └── 10+ weitere
├── creation/            # Wizard Komponenten
│   ├── ProjectCreationWizard.tsx
│   ├── ProjectEditWizard.tsx
│   └── 8+ weitere
├── communication/       # Chat & Team
├── distribution/        # Verteiler-Listen
├── monitoring/          # Monitoring & Analytics
└── 50+ weitere Dateien
```

### Probleme (Ist-Zustand)

1. **Monolithische page.tsx:**
   - 827 Zeilen mit 3 verschiedenen Views
   - Zu viel State Management (15+ useState Hooks)
   - Keine klare Trennung zwischen Logik und UI

2. **Fehlende State Management Layer:**
   - Direkte `loadProjects()` Aufrufe
   - Kein Caching
   - Manuelles Error Handling
   - Keine Optimistic Updates

3. **Code-Duplikation:**
   - Empty States mehrfach definiert
   - Filter-Logik wiederholt
   - Loading States dupliziert

4. **Performance-Probleme:**
   - Keine Memoization
   - Fehlende useCallback
   - Re-Renders bei jedem Filter-Change

5. **Testing-Lücken:**
   - Hook-Tests fehlen komplett
   - Integration-Tests minimal
   - Component-Tests veraltet

---

## 🚀 Die 4 Refactoring-Phasen

### Übersicht

| Phase | Fokus | Dauer | Output |
|-------|-------|-------|--------|
| **Phase 1** | Basis-Infrastruktur | 2-3 Tage | React Query Hooks, Cleanup |
| **Phase 2** | Kanban-View | 2-3 Tage | Modularisierte Kanban-Komponenten |
| **Phase 3** | Tabellen-View + Archiv | 2 Tage | Table-Component, Filter |
| **Phase 4** | Wizard-Integration | 2 Tage | Wizard-Hooks, Success-Handling |

**Gesamt-Aufwand:** 8-10 Tage

---

## Phase 1: Basis-Infrastruktur (PRIO 1)

**Ziel:** Solide Basis für alle weiteren Phasen schaffen

**Dauer:** 2-3 Tage

### 1.1 Pre-Refactoring Cleanup (Phase 0.5)

**Aufgaben:**
- [ ] TODO-Kommentare finden und entfernen
- [ ] Console-Logs bereinigen (nur console.error in catch-blocks)
- [ ] Deprecated Functions identifizieren und entfernen
- [ ] Unused State-Variablen entfernen
- [ ] Kommentierte Code-Blöcke löschen
- [ ] ESLint Auto-Fix durchführen

**Erwartete Code-Reduktion:** ~50-100 Zeilen

### 1.2 React Query Integration

**Neue Datei:** `src/lib/hooks/useProjectData.ts`

**Hooks zu implementieren:**

```typescript
// Query Hooks
export function useProjects(organizationId: string | undefined, filters?: ProjectFilters)
export function useProject(projectId: string | undefined)
export function useProjectsByStage(organizationId: string | undefined, stage: PipelineStage)
export function useTeamMembers(organizationId: string | undefined)

// Mutation Hooks
export function useCreateProject()
export function useUpdateProject()
export function useDeleteProject()
export function useArchiveProject()
export function useUnarchiveProject()
export function useMoveProject() // Für Kanban Drag & Drop
```

**Vorteile:**
- Automatisches Caching (5min staleTime)
- Query Invalidierung bei Mutations
- Optimistic Updates für Drag & Drop
- Error Handling out-of-the-box
- Loading States automatisch

### 1.3 Shared Components erstellen

**Neue Komponenten:**

```
src/app/dashboard/projects/components/
├── shared/
│   ├── ProjectEmptyState.tsx       # Wiederverwendbarer Empty State
│   ├── ProjectLoadingState.tsx     # Loading Spinner
│   ├── ProjectErrorState.tsx       # Error Display
│   ├── ViewModeToggle.tsx          # Board/List Toggle
│   └── FilterDropdown.tsx          # Status Filter (Aktiv/Archiv)
```

**Vorteile:**
- Eliminiert Code-Duplikation
- Konsistente UI über alle Views
- Einfacher zu testen
- Wiederverwendbar für Detail-Seite

### 1.4 page.tsx Cleanup

**Aufgaben:**
- [ ] Alte `loadProjects()` durch React Query ersetzen
- [ ] State-Management reduzieren (15+ useState → ~6)
- [ ] Shared Components integrieren
- [ ] Helper-Functions in utils auslagern

**Erwartete Code-Reduktion:** ~200-300 Zeilen

### Deliverables Phase 1

- [ ] `useProjectData.ts` mit 10 Hooks
- [ ] 5 Shared Components
- [ ] `page.tsx` reduziert auf ~600 Zeilen
- [ ] Alle Tests bestehen
- [ ] TypeScript 0 Errors

**Commit:**
```bash
git commit -m "feat: Phase 1 - Basis-Infrastruktur für Projects-Modul

- React Query Hooks (10 Hooks) implementiert
- Shared Components erstellt (EmptyState, Loading, Error, etc.)
- page.tsx Cleanup (~200 Zeilen gespart)
- State Management vereinfacht
- Console-Logs bereinigt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Kanban-View Modularisierung (PRIO 2)

**Ziel:** Kanban-View extrahieren und optimieren

**Dauer:** 2-3 Tage

**Voraussetzung:** Phase 1 abgeschlossen

### 2.1 Kanban-View extrahieren

**Neue Datei:** `src/app/dashboard/projects/components/views/KanbanView.tsx`

**Struktur:**
```typescript
interface KanbanViewProps {
  projects: Project[];
  organizationId: string;
  onProjectMove: (projectId: string, targetStage: PipelineStage) => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
}

export default function KanbanView({ ... }: KanbanViewProps) {
  // Verwende useMoveProject Hook
  // Verwende useProjectsByStage Hook
  // Integriere KanbanBoard Komponente
  // Performance: useCallback, useMemo
}
```

### 2.2 Filter-Panel modularisieren

**Bestehende Komponente:** `src/components/projects/kanban/BoardFilterPanel.tsx`

**Aufgaben:**
- [ ] Filter-State in Custom Hook auslagern
- [ ] Filter-Logik von UI trennen
- [ ] Performance-Optimierung (useCallback)

**Neuer Hook:** `useProjectFilters()`

### 2.3 Drag & Drop optimieren

**Aufgaben:**
- [ ] Optimistic Updates implementieren
- [ ] Error Handling bei fehlgeschlagenen Moves
- [ ] Loading-State während Move
- [ ] Undo-Funktion (optional)

### 2.4 Performance-Optimierung

**Aufgaben:**
- [ ] React.memo für KanbanColumn
- [ ] React.memo für ProjectCard
- [ ] useMemo für groupProjectsByStage
- [ ] Virtualization für lange Listen (optional)

### Deliverables Phase 2

- [ ] `KanbanView.tsx` (~200 Zeilen)
- [ ] `useProjectFilters.ts` Hook
- [ ] Optimistic Updates funktionieren
- [ ] Performance-Verbesserung messbar
- [ ] Kanban-Tests aktualisiert

**Commit:**
```bash
git commit -m "feat: Phase 2 - Kanban-View Modularisierung

- KanbanView in separate Komponente extrahiert
- Filter-Logik in useProjectFilters Hook
- Optimistic Updates für Drag & Drop
- Performance-Optimierungen (React.memo, useMemo)
- ~150 Zeilen aus page.tsx entfernt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3: Tabellen-View + Archiv (PRIO 3)

**Ziel:** Tabellen-Ansicht modularisieren und Archiv-Funktion optimieren

**Dauer:** 2 Tage

**Voraussetzung:** Phase 1 abgeschlossen

### 3.1 ListView extrahieren

**Neue Datei:** `src/app/dashboard/projects/components/views/ListView.tsx`

**Struktur:**
```typescript
interface ListViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  onEditProject: (project: Project) => void;
  onArchive: (projectId: string) => void;
  onUnarchive: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

export default function ListView({ ... }: ListViewProps) {
  // Verwende ProjectTable Komponente
  // Verwende FilterDropdown Komponente
  // Performance: useMemo für sortierte/gefilterte Projekte
}
```

### 3.2 ProjectTable Komponente

**Neue Datei:** `src/app/dashboard/projects/components/ProjectTable.tsx`

**Features:**
- Sortierbare Spalten
- Team-Member Avatare
- Projekt-Status Badges
- Priority-Tags
- Action-Dropdown (Anzeigen, Bearbeiten, Archivieren, Löschen)

### 3.3 Archiv-Filter optimieren

**Aufgaben:**
- [ ] Filter-State in Hook auslagern
- [ ] Filter-UI in Dropdown-Komponente
- [ ] Archiv-Badge im Header
- [ ] Empty-States für verschiedene Filter-Kombinationen

### 3.4 Empty States

**Neue Komponenten:**
```
- NoActiveProjectsState.tsx     # Wenn nur "Aktiv" Filter und leer
- NoArchivedProjectsState.tsx   # Wenn nur "Archiv" Filter und leer
- NoFiltersSelectedState.tsx    # Wenn kein Filter ausgewählt
- NoProjectsAtAllState.tsx      # Wenn komplett leer (beide Filter, keine Projekte)
```

### Deliverables Phase 3

- [ ] `ListView.tsx` (~250 Zeilen)
- [ ] `ProjectTable.tsx` (~300 Zeilen)
- [ ] 4 Empty-State Komponenten
- [ ] Archiv-Filter funktioniert perfekt
- [ ] ~200 Zeilen aus page.tsx entfernt

**Commit:**
```bash
git commit -m "feat: Phase 3 - Tabellen-View Modularisierung

- ListView in separate Komponente extrahiert
- ProjectTable mit sortable Spalten
- 4 Empty-State Komponenten für verschiedene Filter
- Archiv-Filter optimiert
- ~200 Zeilen aus page.tsx entfernt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4: Wizard-Integration (PRIO 4)

**Ziel:** Wizard-Integration vereinfachen und Erfolgs-Handling optimieren

**Dauer:** 2 Tage

**Voraussetzung:** Phase 1 abgeschlossen

### 4.1 Wizard-State Hook

**Neuer Hook:** `useProjectWizard()`

```typescript
export function useProjectWizard(organizationId: string) {
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const createProject = useCreateProject();

  const handleCreationSuccess = useCallback((result: ProjectCreationResult) => {
    // Optimistic Update
    // Toast-Benachrichtigung
    // Optional: Redirect zur Detail-Seite
  }, [createProject]);

  const handleEditSuccess = useCallback((updatedProject: Project) => {
    // Optimistic Update
    // Toast-Benachrichtigung
  }, []);

  return {
    // States
    showCreationWizard,
    showEditWizard,
    editingProject,

    // Actions
    openCreationWizard: () => setShowCreationWizard(true),
    closeCreationWizard: () => setShowCreationWizard(false),
    openEditWizard: (project: Project) => {
      setEditingProject(project);
      setShowEditWizard(true);
    },
    closeEditWizard: () => {
      setShowEditWizard(false);
      setEditingProject(null);
    },

    // Handlers
    handleCreationSuccess,
    handleEditSuccess,
  };
}
```

### 4.2 Toast-Benachrichtigungen

**Aufgaben:**
- [ ] console.log() durch toastService ersetzen
- [ ] Success-Toast nach Projekt-Erstellung
- [ ] Error-Toast bei Fehlern
- [ ] Info-Toast bei Wizard-Schritten

**Migration:**
```typescript
// ❌ Vorher
console.log('Projekt erfolgreich erstellt:', result);

// ✅ Nachher
toastService.success('Projekt erfolgreich erstellt');
```

### 4.3 Wizard-Props vereinfachen

**Aufgaben:**
- [ ] Redundante Props eliminieren
- [ ] organizationId aus Context statt Props
- [ ] Success-Handler vereinfachen

### 4.4 Optimistic Updates

**Aufgaben:**
- [ ] Neu erstelltes Projekt sofort in Liste anzeigen
- [ ] Aktualisiertes Projekt sofort updaten
- [ ] Bei Fehler: Rollback und Error-Toast

### Deliverables Phase 4

- [ ] `useProjectWizard.ts` Hook
- [ ] Toast-Benachrichtigungen integriert
- [ ] Wizard-Integration vereinfacht
- [ ] Optimistic Updates funktionieren
- [ ] ~50 Zeilen aus page.tsx entfernt

**Commit:**
```bash
git commit -m "feat: Phase 4 - Wizard-Integration vereinfacht

- useProjectWizard Hook für State-Management
- Toast-Benachrichtigungen statt console.log
- Optimistic Updates für Create/Edit
- Wizard-Props vereinfacht
- ~50 Zeilen aus page.tsx entfernt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 📊 Erwartete Ergebnisse

### Code-Reduktion

| Datei | Vorher | Nachher | Reduktion |
|-------|--------|---------|-----------|
| page.tsx | 827 Zeilen | ~350 Zeilen | -477 Zeilen (-58%) |

**Neue Dateien:**
- `useProjectData.ts`: ~300 Zeilen
- `useProjectFilters.ts`: ~80 Zeilen
- `useProjectWizard.ts`: ~100 Zeilen
- `KanbanView.tsx`: ~200 Zeilen
- `ListView.tsx`: ~250 Zeilen
- `ProjectTable.tsx`: ~300 Zeilen
- 5 Shared Components: ~400 Zeilen
- 4 Empty-State Components: ~200 Zeilen

**Gesamt:** +1830 Zeilen (aber besser organisiert!)

### Qualitäts-Metriken

**Vorher:**
- TypeScript-Fehler: ~10-20
- ESLint-Warnings: ~30-40
- Test-Coverage: ~40%
- Performance-Score: ???

**Nachher (Ziel):**
- TypeScript-Fehler: 0
- ESLint-Warnings: 0
- Test-Coverage: >80%
- Performance-Score: Messbar besser (weniger Re-Renders)

---

## 🧪 Testing-Strategie

### Phase 1 Tests

**Hook-Tests:** `src/lib/hooks/__tests__/useProjectData.test.tsx`
- [ ] useProjects lädt Projekte
- [ ] useProjects filtered nach Status
- [ ] useCreateProject erstellt Projekt
- [ ] useMoveProject bewegt Projekt
- [ ] Cache-Invalidierung funktioniert

**Component-Tests:**
- [ ] ProjectEmptyState.test.tsx
- [ ] ProjectLoadingState.test.tsx
- [ ] ProjectErrorState.test.tsx
- [ ] ViewModeToggle.test.tsx
- [ ] FilterDropdown.test.tsx

### Phase 2 Tests

**Component-Tests:**
- [ ] KanbanView.test.tsx (Integration)
- [ ] Drag & Drop funktioniert
- [ ] Optimistic Updates

### Phase 3 Tests

**Component-Tests:**
- [ ] ListView.test.tsx (Integration)
- [ ] ProjectTable.test.tsx (Sortierung, Actions)
- [ ] Archiv-Filter

### Phase 4 Tests

**Hook-Tests:**
- [ ] useProjectWizard.test.tsx
- [ ] Success-Handling
- [ ] Error-Handling

**Gesamt-Ziel:** 40+ neue Tests, Coverage >80%

---

## 📚 Dokumentation

### Nach Abschluss erstellen

**Dateien:**
```
docs/projects/
├── README.md                      # Übersicht & Features
├── api/
│   ├── README.md                  # API-Übersicht
│   └── project-service.md         # Service-Dokumentation
├── components/
│   ├── README.md                  # Komponenten-Übersicht
│   ├── kanban-view.md             # Kanban-Dokumentation
│   ├── list-view.md               # Tabellen-Dokumentation
│   └── wizard-integration.md      # Wizard-Dokumentation
└── adr/
    └── README.md                  # Architecture Decision Records
```

**Umfang:** ~2500+ Zeilen Dokumentation

---

## 🎯 Erfolgsmetriken

### Code Quality

- ✅ page.tsx: 827 → ~350 Zeilen (-58%)
- ✅ Komponenten-Größe: Alle <300 Zeilen
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings

### Testing

- ✅ Test-Coverage: >80%
- ✅ Anzahl Tests: 40+ neue Tests
- ✅ Pass-Rate: 100%

### Performance

- ✅ Re-Renders reduziert (messbar)
- ✅ Caching durch React Query
- ✅ Optimistic Updates funktionieren

### Developer Experience

- ✅ Klare Trennung: Views, Hooks, Components
- ✅ Wiederverwendbare Komponenten
- ✅ Einfaches Onboarding durch Docs

---

## 📅 Zeitplan

### Übersicht

| Woche | Phase | Fokus |
|-------|-------|-------|
| **Woche 1** | Phase 1 | Basis-Infrastruktur (React Query, Cleanup) |
| **Woche 2** | Phase 2 | Kanban-View Modularisierung |
| **Woche 3** | Phase 3 | Tabellen-View + Archiv |
| **Woche 4** | Phase 4 | Wizard-Integration |
| **Woche 5** | Testing & Docs | Finalisierung |

**Gesamt:** ~5 Wochen (mit Buffer)

### Detailliert (Phase 1 als Beispiel)

**Tag 1-2:**
- Phase 0.5: Pre-Refactoring Cleanup
- Ist-Zustand dokumentieren
- Backups erstellen

**Tag 3-4:**
- React Query Hooks implementieren
- Erste Integration in page.tsx

**Tag 5-6:**
- Shared Components erstellen
- page.tsx Cleanup
- TypeScript Fixes

**Tag 7:**
- Tests schreiben
- Dokumentation
- Phase 1 Commit

---

## 🚦 Abhängigkeiten & Risiken

### Abhängigkeiten

**Phase 1 → Phase 2/3/4:**
- Phase 2, 3, 4 benötigen React Query Hooks aus Phase 1
- Shared Components aus Phase 1 werden in Phase 2/3 wiederverwendet

**Phase 2 ↔ Phase 3:**
- Unabhängig voneinander (können parallel laufen)
- Beide hängen nur von Phase 1 ab

### Risiken

**Risiko 1: Scope Creep**
- **Wahrscheinlichkeit:** Hoch
- **Impact:** Mittel
- **Mitigation:** Strikte Phase-Trennung, keine Feature-Erweiterungen während Refactoring

**Risiko 2: Breaking Changes in Wizard**
- **Wahrscheinlichkeit:** Mittel
- **Impact:** Hoch
- **Mitigation:** Bestehende Wizard-Tests MÜSSEN alle durchlaufen

**Risiko 3: Performance-Regression**
- **Wahrscheinlichkeit:** Niedrig
- **Impact:** Hoch
- **Mitigation:** Performance-Messungen vor/nach jeder Phase

**Risiko 4: Test-Failures**
- **Wahrscheinlichkeit:** Hoch
- **Impact:** Mittel
- **Mitigation:** Bestehende Tests MÜSSEN vor Refactoring laufen

---

## 🔗 Referenzen

### Interne Docs

- **Refactoring-Template:** `docs/templates/module-refactoring-template.md`
- **Quick Reference:** `docs/templates/QUICK_REFERENCE.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`

### Bestehende Implementierungen

- **Listen-Modul:** `src/app/dashboard/contacts/lists/` (Best Practice)
- **Editors-Modul:** `src/app/dashboard/contacts/editors/`

### Code-Locations

- **Page:** `src/app/dashboard/projects/page.tsx`
- **Komponenten:** `src/components/projects/`
- **Services:** `src/lib/firebase/project-service.ts`
- **Types:** `src/types/project.ts`

---

## 💡 Nächste Schritte

### Immediate Actions

1. **Entscheidung:** User muss bestätigen, dass wir mit Phase 1 starten
2. **Branch erstellen:** `feature/projects-overview-refactoring-phase1`
3. **Ist-Zustand dokumentieren:** Screenshots, Zeilen-Count, etc.
4. **Backups erstellen:** `page.tsx` → `page.backup.tsx`

### Phase 1 Start

```bash
# 1. Branch erstellen
git checkout -b feature/projects-overview-refactoring-phase1

# 2. Backup
cp src/app/dashboard/projects/page.tsx \
   src/app/dashboard/projects/page.backup.tsx

# 3. Ist-Zustand dokumentieren
npx cloc src/app/dashboard/projects > docs/planning/projects-initial-state.txt

# 4. Phase 0.5: Cleanup starten
grep -rn "TODO:" src/app/dashboard/projects/page.tsx
grep -rn "console\." src/app/dashboard/projects/page.tsx
```

---

## ❓ Entscheidungsfragen für User

### Frage 1: Phase-Reihenfolge

**Option A (Empfohlen):** Phase 1 → Phase 2 → Phase 3 → Phase 4
**Vorteile:** Logische Reihenfolge, sichere Basis
**Nachteile:** Kanban erst nach Phase 1 fertig

**Option B:** Phase 1 → Phase 3 → Phase 2 → Phase 4
**Vorteile:** Tabellen-View (wichtiger?) zuerst
**Nachteile:** Kanban-spezifische Optimierungen später

**User-Entscheidung:** ___

### Frage 2: Testing-Approach

**Option A (Empfohlen):** Tests parallel zu jeder Phase
**Vorteile:** Bessere Qualität, frühes Feedback
**Nachteile:** Länger dauert jede Phase

**Option B:** Tests gebündelt am Ende
**Vorteile:** Schnellere Implementierung
**Nachteile:** Höheres Risiko, späteres Feedback

**User-Entscheidung:** ___

### Frage 3: Dokumentation

**Option A (Empfohlen):** Dokumentation parallel zu jeder Phase
**Vorteile:** Immer aktuell, kein Vergessen
**Nachteile:** Mehr Aufwand pro Phase

**Option B:** Dokumentation gebündelt am Ende (Phase 5)
**Vorteile:** Schnellere Implementierung
**Nachteile:** Risiko von Vergessen, weniger aktuell

**User-Entscheidung:** ___

---

## ✅ Approval

**User Approval erforderlich:**
- [ ] Strategie (4 Phasen) akzeptiert
- [ ] Phase 1 kann starten
- [ ] Zeitplan realistisch
- [ ] Entscheidungsfragen beantwortet

**Nach Approval:**
- [ ] Feature-Branch erstellen
- [ ] Phase 1 Cleanup starten
- [ ] Phase 1 Implementierung beginnen

---

**Version:** 1.0
**Autor:** Claude Code
**Status:** 🟡 Awaiting User Approval
**Geschätzter Gesamt-Aufwand:** 8-10 Tage (bei 100% Focus)

---

*Dieser Implementierungsplan ist ein lebendes Dokument und wird während des Refactorings aktualisiert.*

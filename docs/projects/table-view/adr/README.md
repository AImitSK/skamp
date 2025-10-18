# Architecture Decision Records (ADRs) - Projects Table-View

**Projekt:** SKAMP Platform - Projects Module
**Modul:** Table-View Refactoring
**Version:** 1.0

---

## ADR-Index

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| ADR-0001 | Component Extraction Strategy | Accepted | 2025-10-18 |
| ADR-0002 | Props-based API vs. Context | Accepted | 2025-10-18 |
| ADR-0003 | Filter-Hook vs. Reducer | Accepted | 2025-10-18 |
| ADR-0004 | Empty-States Modularisierung | Accepted | 2025-10-18 |

---

## ADR-0001: Component Extraction Strategy

**Status:** Accepted
**Datum:** 18. Oktober 2025
**Entscheider:** Claude Code + Stefan Kühne

### Kontext

Das Projects Table-View war ein monolithischer Component (page.tsx, 872 Zeilen) mit:
- Inline Table-Implementation (~255 Zeilen)
- Inline Empty-States (~47 Zeilen)
- Inline Filter-Logik (~27 Zeilen)
- Inline Hilfsfunktionen

**Problem:** Schwer wartbar, nicht wiederverwendbar, keine klare Separation of Concerns.

### Entscheidung

Wir haben uns für eine **schrittweise Bottom-Up Extraction** entschieden:

**Phase 3.1: Filter-Hook**
- Extraktion der Filter-Logik in Custom Hook
- Grund: Wiederverwendbar, testbar, Performance-optimiert

**Phase 3.2: Empty-States**
- 4 separate Komponenten für verschiedene States
- Grund: Kleinste Einheiten, einfach zu testen, wiederverwendbar

**Phase 3.3: ProjectTable**
- Gesamte Table-Implementation
- Grund: Komplexe Komponente mit vielen Features, zentrale Komponente

**Phase 3.4: ListView**
- Komplette View-Komponente
- Grund: Kapselung der gesamten List-View-Logik

### Alternativen

**Alternative 1: Top-Down (ListView zuerst)**
- ✅ Schneller sichtbare Ergebnisse
- ❌ Schwieriger zu testen
- ❌ Größere Änderungen auf einmal
- ❌ Höheres Fehlerrisiko

**Alternative 2: Big-Bang (alles auf einmal)**
- ✅ Nur ein Commit
- ❌ Sehr hohes Fehlerrisiko
- ❌ Schwierig zu reviewen
- ❌ Keine inkrementelle Verbesserung

**Alternative 3: Feature-Branch (separater Branch)**
- ✅ Isolierte Entwicklung
- ❌ Merge-Konflikte
- ❌ Längere Integration
- ❌ Nicht nötig bei reinem Refactoring

### Konsequenzen

✅ **Vorteile:**
- Inkrementelle Verbesserung
- Kleine, reviewbare Commits
- Jederzeit rollback-fähig
- Geringes Fehlerrisiko
- Testbare Zwischenstände

⚠️ **Trade-offs:**
- 4 Commits statt 1
- Längere Refactoring-Zeit (~4h statt ~2h)
- Mehr Dokumentation nötig

❌ **Nachteile:**
- Zwischenstände teilweise noch nicht optimal
- Mehrfache Änderungen an page.tsx

### Bewertung

**Erfolg:** ✅ Sehr gut

Die schrittweise Extraktion hat sich bewährt:
- Alle 4 Phasen ohne Fehler durchgeführt
- Jede Phase einzeln getestet und committed
- Klare Separation of Concerns erreicht
- Wiederverwendbare Komponenten erstellt

---

## ADR-0002: Props-based API vs. Context

**Status:** Accepted
**Datum:** 18. Oktober 2025
**Entscheider:** Claude Code + Stefan Kühne

### Kontext

Die extrahierten Komponenten (ProjectTable, ListView) benötigen Zugriff auf:
- Projekt-Daten
- Team-Member-Daten
- Organization-ID
- User-ID
- Callbacks (onEdit, onArchive, onDelete, etc.)

**Frage:** Props-based API oder React Context?

### Entscheidung

Wir haben uns für **Props-based API** entschieden.

**Begründung:**
- ✅ Explizite Dependencies
- ✅ Einfacher zu testen (keine Provider nötig)
- ✅ Type-safe mit TypeScript
- ✅ Keine impliziten Dependencies
- ✅ Bessere Performance (kein Context-Re-Render)

### Alternativen

**Alternative 1: React Context**

```typescript
// ❌ Nicht gewählt
const ProjectsContext = createContext<ProjectsContextValue>(null);

function ListView() {
  const { projects, onEdit, onDelete } = useProjectsContext();
  // ...
}
```

**Probleme:**
- ❌ Implizite Dependencies (schwerer zu verstehen)
- ❌ Tests brauchen Provider-Wrapper
- ❌ Context-Re-Renders können Performance beeinträchtigen
- ❌ Weniger flexibel (Komponente ist an Context gebunden)

**Alternative 2: Hybrid (Props + Context)**

```typescript
// ❌ Nicht gewählt
// Props für Daten, Context für Callbacks
const ActionsContext = createContext<Actions>(null);

function ListView({ projects }: { projects: Project[] }) {
  const { onEdit, onDelete } = useActions();
  // ...
}
```

**Probleme:**
- ❌ Komplexer (zwei Mechanismen)
- ❌ Nicht konsistent
- ❌ Schwieriger zu verstehen

### Implementierung

**Props-Interface:**
```typescript
interface ListViewProps {
  // Daten
  loading: boolean;
  projects: Project[];
  allProjects: Project[];
  searchTerm: string;
  teamMembers: TeamMember[];
  loadingTeam: boolean;

  // IDs
  currentOrganizationId: string;
  userId: string;

  // Filter-State
  showActive: boolean;
  showArchived: boolean;

  // Callbacks
  onEdit: (project: Project) => void;
  onArchive: (projectId: string) => Promise<void>;
  onUnarchive: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}
```

**Vorteile:**
- Alle Dependencies explizit
- TypeScript-Unterstützung
- Einfach zu mocken
- Keine Context-Provider

### Konsequenzen

✅ **Vorteile:**
- Klare, explizite API
- Einfach zu testen
- Gute TypeScript-Unterstützung
- Keine Performance-Probleme
- Komponenten bleiben flexibel

⚠️ **Trade-offs:**
- Viele Props (14 Props bei ListView)
- Props-Drilling bei tiefen Hierarchien

❌ **Nachteile:**
- Props-Drilling wenn weitere Verschachtelung

### Bewertung

**Erfolg:** ✅ Sehr gut

Props-based API funktioniert gut für unseren Use-Case:
- Hierarchie ist flach (max. 2 Ebenen)
- Props sind klar und gut dokumentiert
- Tests sind einfach zu schreiben
- TypeScript verhindert Fehler

**Wann Context verwenden?**
- Bei sehr tiefen Komponent en-Hierarchien (>3 Ebenen)
- Bei globalen Zuständen (Theme, Auth, etc.)
- Bei >20 Props

---

## ADR-0003: Filter-Hook vs. Reducer

**Status:** Accepted
**Datum:** 18. Oktober 2025
**Entscheider:** Claude Code + Stefan Kühne

### Kontext

Die Filter-Logik für Projects (Active/Archived + Search) musste aus page.tsx extrahiert werden.

**Anforderungen:**
- Status-Filter (showActive, showArchived)
- Such-Filter (Name, Customer)
- Performance-Optimierung
- Wiederverwendbar

**Frage:** Custom Hook mit useState oder useReducer?

### Entscheidung

Wir haben uns für **Custom Hook mit useState + useMemo + useCallback** entschieden.

**Implementierung:**
```typescript
function useProjectFilters(projects: Project[], searchTerm: string = '') {
  const [showActive, setShowActive] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const filteredProjects = useMemo(() => {
    // Filter-Logik
  }, [projects, showActive, showArchived, searchTerm]);

  const toggleActive = useCallback((value: boolean) => {
    setShowActive(value);
  }, []);

  return {
    showActive,
    showArchived,
    filteredProjects,
    toggleActive,
    toggleArchived,
    resetFilters,
  };
}
```

### Alternativen

**Alternative 1: useReducer**

```typescript
// ❌ Nicht gewählt
type Action =
  | { type: 'TOGGLE_ACTIVE'; value: boolean }
  | { type: 'TOGGLE_ARCHIVED'; value: boolean }
  | { type: 'RESET' };

function filterReducer(state: FilterState, action: Action) {
  switch (action.type) {
    case 'TOGGLE_ACTIVE':
      return { ...state, showActive: action.value };
    case 'TOGGLE_ARCHIVED':
      return { ...state, showArchived: action.value };
    case 'RESET':
      return initialState;
  }
}

function useProjectFilters(projects: Project[]) {
  const [state, dispatch] = useReducer(filterReducer, initialState);
  // ...
}
```

**Warum nicht?**
- ❌ Overkill für 2 Boolean-States
- ❌ Mehr Boilerplate (Actions, Reducer)
- ❌ Komplexer zu verstehen
- ❌ Keine bessere Performance

**Alternative 2: State-Manager (Zustand, Redux)**

```typescript
// ❌ Nicht gewählt
const useFilterStore = create((set) => ({
  showActive: true,
  showArchived: false,
  toggleActive: (value) => set({ showActive: value }),
  toggleArchived: (value) => set({ showArchived: value }),
}));
```

**Warum nicht?**
- ❌ Zusätzliche Dependency
- ❌ Overkill für lokalen State
- ❌ Globaler State nicht nötig
- ❌ Schwieriger zu testen

### Begründung für useState

**Vorteile:**
- ✅ Einfach und verständlich
- ✅ Keine zusätzlichen Patterns
- ✅ Gute Performance mit useMemo/useCallback
- ✅ Wenig Boilerplate
- ✅ Standard React Pattern

**State-Complexity:**
- 2 Boolean-States (showActive, showArchived)
- 3 Callbacks (toggleActive, toggleArchived, resetFilters)
- 1 Computed Value (filteredProjects)

**→ Perfekt für useState**

### Konsequenzen

✅ **Vorteile:**
- Sehr einfach zu verstehen
- Wenig Boilerplate
- Gute Performance
- Standard React Pattern

⚠️ **Trade-offs:**
- Bei >5 States würde Reducer besser sein
- Keine Time-Travel Debugging

❌ **Nachteile:**
- Nicht skalierbar auf sehr komplexe Filter

### Bewertung

**Erfolg:** ✅ Sehr gut

useState war die richtige Wahl:
- Hook ist nur 68 Zeilen
- Sehr einfach zu verstehen
- Gute Performance
- Leicht zu testen

**Wann Reducer verwenden?**
- >5 zusammenhängende States
- Komplexe State-Transitions
- State-History nötig
- Redux DevTools gewünscht

---

## ADR-0004: Empty-States Modularisierung

**Status:** Accepted
**Datum:** 18. Oktober 2025
**Entscheider:** Claude Code + Stefan Kühne

### Kontext

Die page.tsx hatte 4 inline Empty-State Blöcke (je ~12 Zeilen, total ~47 Zeilen):
- Keine aktiven Projekte
- Keine archivierten Projekte
- Keine Filter ausgewählt
- Keine Projekte vorhanden

**Problem:** Code-Duplikation, schwer wartbar, nicht wiederverwendbar.

### Entscheidung

Wir haben uns für **4 separate Komponenten** entschieden, je eine pro Empty-State.

**Struktur:**
```
components/empty-states/
├── NoActiveProjectsState.tsx
├── NoArchivedProjectsState.tsx
├── NoFiltersSelectedState.tsx
└── NoProjectsAtAllState.tsx
```

### Alternativen

**Alternative 1: Eine generische EmptyState-Komponente**

```typescript
// ❌ Nicht gewählt
<EmptyState
  icon={RocketLaunchIcon}
  title="Keine aktiven Projekte"
  message="Erstelle dein erstes Projekt..."
/>
```

**Warum nicht?**
- ❌ Weniger Type-Safe
- ❌ Props können falsch gesetzt werden
- ❌ Keine Wiederverwendbarkeit (Props müssen immer übergeben werden)
- ❌ Weniger "Self-Documenting"

**Alternative 2: Enum-basiert**

```typescript
// ❌ Nicht gewählt
enum EmptyStateType {
  NO_ACTIVE,
  NO_ARCHIVED,
  NO_FILTERS,
  NO_PROJECTS,
}

<EmptyState type={EmptyStateType.NO_ACTIVE} />
```

**Warum nicht?**
- ❌ Switch-Statement in Komponente (komplexer)
- ❌ Schlechter für Code-Splitting
- ❌ Alle States in einer Datei (größere Datei)

**Alternative 3: Render-Props**

```typescript
// ❌ Nicht gewählt
<EmptyStateRenderer>
  {({ icon, title, message }) => (
    <div>
      <icon />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )}
</EmptyStateRenderer>
```

**Warum nicht?**
- ❌ Overkill für statischen Content
- ❌ Komplexer zu verstehen
- ❌ Keine bessere Wiederverwendbarkeit

### Begründung für separate Komponenten

**Vorteile:**
- ✅ Self-Documenting (Komponentenname = Bedeutung)
- ✅ Type-Safe (keine Props-Fehler möglich)
- ✅ Einfache Verwendung (keine Props nötig)
- ✅ Code-Splitting freundlich
- ✅ Leicht zu finden (eigene Dateien)
- ✅ Wiederverwendbar in anderen Modulen

**Pattern:**
```typescript
// Sehr einfach zu verwenden
{projects.length === 0 && showActive && !showArchived && (
  <NoActiveProjectsState />
)}
```

### Gemeinsames Styling

Alle Komponenten teilen das gleiche Styling-Pattern:
- bg-white rounded-lg shadow-sm p-8
- Icon: h-12 w-12 text-zinc-400
- Title: text-sm font-medium text-zinc-900
- Message: text-sm text-zinc-500

**Konsistenz durch Copy-Paste statt Abstraktion:**
- ✅ Einfach zu verstehen (kein verstecktes Styling)
- ✅ Einfach anzupassen (pro Komponente)
- ❌ Code-Duplikation (~10 Zeilen pro Komponente)

**Trade-off akzeptiert:** Duplikation ist OK für einfache, statische Komponenten.

### Konsequenzen

✅ **Vorteile:**
- Sehr einfach zu verwenden
- Type-Safe
- Self-Documenting
- Wiederverwendbar
- Leicht zu finden

⚠️ **Trade-offs:**
- 4 Dateien statt 1
- Styling-Duplikation (~10 Zeilen je)

❌ **Nachteile:**
- Bei >10 Empty-States würde generische Komponente besser sein

### Bewertung

**Erfolg:** ✅ Sehr gut

Separate Komponenten waren die richtige Wahl:
- Sehr einfach zu verwenden
- Keine Props-Fehler
- Klar benennbar
- Wiederverwendbar

**Wann generische Komponente?**
- >10 verschiedene Empty-States
- Dynamischer Content
- Komplexe Logik pro State

---

## Zusammenfassung

### Erfolgreiche Entscheidungen

1. **Bottom-Up Extraction:** Schrittweise, risikoarm
2. **Props-based API:** Explizit, testbar, type-safe
3. **useState statt Reducer:** Einfach, wenig Boilerplate
4. **Separate Empty-States:** Self-documenting, wiederverwendbar

### Lessons Learned

✅ **Bewährt:**
- Inkrementelle Refactorings
- Explizite Props über impliziten Context
- Einfache Patterns über komplexe Abstraktionen
- Type-Safety über Flexibilität

⚠️ **Zu beachten:**
- Props-Drilling bei >3 Ebenen
- Code-Duplikation bei >10 ähnlichen Komponenten
- useState bei >5 States

---

## Zukünftige ADRs

Geplante Entscheidungen für nächste Refactorings:

- [ ] ADR-0005: Calendar-View Modularisierung
- [ ] ADR-0006: Filtering Performance mit useDeferredValue
- [ ] ADR-0007: Table Virtualization (react-window)
- [ ] ADR-0008: Batch-Actions Implementation

---

**Version:** 1.0
**Erstellt:** 18. Oktober 2025
**Maintainer:** CeleroPress Development Team
**Projekt:** SKAMP Platform

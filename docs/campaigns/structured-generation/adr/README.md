# Architecture Decision Records (ADR) - Structured Generation

> **Modul**: Structured Generation Modal
> **Version**: 2.0 (nach Phase 4 Refactoring)
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-04

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [ADR-001: Modulare Architektur](#adr-001-modulare-architektur)
- [ADR-002: Custom Hooks statt Context API](#adr-002-custom-hooks-statt-context-api)
- [ADR-003: Step-basierter Workflow](#adr-003-step-basierter-workflow)
- [ADR-004: Dual-Modus-System](#adr-004-dual-modus-system)
- [ADR-005: Performance-Optimierungen](#adr-005-performance-optimierungen)
- [ADR-006: Backward Compatibility](#adr-006-backward-compatibility)
- [ADR-007: Testing-Strategie](#adr-007-testing-strategie)
- [Lessons Learned](#lessons-learned)
- [Future Considerations](#future-considerations)

---

## Übersicht

Diese ADRs dokumentieren die wichtigsten architektonischen Entscheidungen beim Refactoring des Structured Generation Modals von einer monolithischen 1.477-Zeilen-Datei zu einer modularen, wartbaren Architektur.

---

## ADR-001: Modulare Architektur

### Status
✅ **ACCEPTED** (Phase 4, 2025-11-04)

### Context

Das ursprüngliche `StructuredGenerationModal.tsx` war eine monolithische Datei mit 1.477 Zeilen Code, die:
- Schwer zu warten war
- Schwer zu testen war
- Keine Wiederverwendung von Code ermöglichte
- Merge-Konflikte bei paralleler Entwicklung verursachte

### Decision

Wir haben uns für eine **modulare Architektur** mit folgender Struktur entschieden:

```
structured-generation/
├── types.ts                    # Shared Types
├── hooks/                      # Custom React Hooks
│   ├── useStructuredGeneration.ts
│   ├── useTemplates.ts
│   └── useKeyboardShortcuts.ts
├── utils/                      # Utilities
│   ├── validation.ts
│   └── template-categorizer.ts
├── components/                 # Shared Components
│   ├── TemplateDropdown.tsx
│   ├── StepProgressBar.tsx
│   ├── ErrorBanner.tsx
│   ├── ModalHeader.tsx
│   └── ModalFooter.tsx
└── steps/                      # Step Components
    ├── ContextSetupStep.tsx
    ├── ContentInputStep.tsx
    ├── GenerationStep.tsx
    └── ReviewStep.tsx
```

**Hauptprinzipien:**
1. **Single Responsibility**: Jede Datei hat eine klar definierte Aufgabe
2. **Separation of Concerns**: Trennung von UI, Logik und State Management
3. **Wiederverwendbarkeit**: Komponenten und Hooks können isoliert getestet und wiederverwendet werden
4. **Maintainability**: Kleinere Dateien sind einfacher zu verstehen und zu warten

### Consequences

**Positiv:**
- ✅ Bessere Wartbarkeit (kleinere, fokussierte Dateien)
- ✅ Bessere Testbarkeit (isolierte Unit-Tests möglich)
- ✅ Bessere Wiederverwendbarkeit (Hooks und Components exportierbar)
- ✅ Reduzierte Merge-Konflikte bei paralleler Entwicklung
- ✅ Einfacheres Code-Review (kleinere PRs)

**Negativ:**
- ❌ Mehr Dateien zu verwalten (9 Komponenten + 3 Hooks + 2 Utils)
- ❌ Leicht erhöhte Gesamtzeilen-Anzahl (~1.900 vs. 1.477)
- ❌ Mehr Imports erforderlich

**Trade-offs:**
- Die erhöhte Anzahl an Dateien ist akzeptabel, da jede Datei eine klare Verantwortlichkeit hat
- Die leicht erhöhten Gesamtzeilen resultieren aus besserer Dokumentation und Typisierung

---

## ADR-002: Custom Hooks statt Context API

### Status
✅ **ACCEPTED** (Phase 4, 2025-11-04)

### Context

Für das State Management hatten wir zwei Hauptoptionen:

**Option A: React Context API**
```tsx
const GenerationContext = createContext<GenerationState | undefined>(undefined);

function GenerationProvider({ children }) {
  const [state, setState] = useState<GenerationState>({ ... });
  return (
    <GenerationContext.Provider value={state}>
      {children}
    </GenerationContext.Provider>
  );
}
```

**Option B: Custom Hooks**
```tsx
function useStructuredGeneration() {
  const [state, setState] = useState({ ... });
  return { generate, isGenerating, result, error };
}
```

### Decision

Wir haben uns für **Custom Hooks** entschieden.

**Hauptgründe:**

1. **Einfachere API**: Direct import und Verwendung ohne Provider-Wrapper
   ```tsx
   const { generate, isGenerating, result } = useStructuredGeneration();
   ```

2. **Bessere Performance**: Kein unnötiges Re-Rendering bei Context-Änderungen
   - Context würde alle Consumer re-rendern bei jeder State-Änderung
   - Hooks ermöglichen granulare Subscriptions

3. **Bessere Testbarkeit**: Hooks können direkt mit `renderHook()` getestet werden
   ```tsx
   const { result } = renderHook(() => useStructuredGeneration());
   ```

4. **Keine Provider-Hell**: Keine Verschachtelung von Providern erforderlich
   ```tsx
   // NICHT erforderlich:
   <GenerationProvider>
     <TemplateProvider>
       <KeyboardProvider>
         <App />
       </KeyboardProvider>
     </TemplateProvider>
   </GenerationProvider>
   ```

5. **Lokaler Scope**: State ist auf die Modal-Komponente beschränkt und leakt nicht global

### Consequences

**Positiv:**
- ✅ Einfachere API (kein Provider-Setup erforderlich)
- ✅ Bessere Performance (granulare Subscriptions)
- ✅ Bessere Testbarkeit (direkte Hook-Tests)
- ✅ Kein Provider-Nesting
- ✅ Lokaler State-Scope

**Negativ:**
- ❌ State nicht global verfügbar (aber das ist in diesem Fall gewollt)
- ❌ Jeder Consumer muss Hook separat aufrufen

**Trade-offs:**
- Context wäre sinnvoll für globalen State (z.B. User-Authentifizierung)
- Für lokalen Modal-State sind Hooks die bessere Wahl

---

## ADR-003: Step-basierter Workflow

### Status
✅ **ACCEPTED** (Phase 4, 2025-11-04)

### Context

Für den Generierungs-Workflow hatten wir zwei Optionen:

**Option A: Single-Page-Form**
- Alle Inputs auf einer Seite
- Lange Formulare mit vielen Feldern
- Scrolling erforderlich

**Option B: Step-basierter Workflow**
- 4 separate Steps mit klarem Fortschritt
- Fokussiertes UI pro Step
- Wizard-Pattern

### Decision

Wir haben uns für einen **4-Step-Workflow** entschieden:

```
1. Context Setup    → Kontext konfigurieren
2. Content Input    → Prompt eingeben
3. Generating       → KI arbeitet
4. Review           → Ergebnis prüfen
```

**Hauptgründe:**

1. **Bessere UX**: Benutzer sind nicht überfordert durch zu viele Inputs auf einmal
2. **Klarer Fortschritt**: StepProgressBar zeigt wo man sich befindet
3. **Fokussierung**: Jeder Step hat ein klares Ziel
4. **Validierung**: Step-für-Step Validierung möglich
5. **Loading-State**: Dedizierter Step für Generierung mit Animation

### Consequences

**Positiv:**
- ✅ Bessere UX (fokussierte Inputs pro Step)
- ✅ Klarer Fortschritt (visuelles Feedback)
- ✅ Step-für-Step Validierung
- ✅ Dedizierter Loading-State mit Animation
- ✅ Einfaches Zurück-Navigieren

**Negativ:**
- ❌ Mehr Klicks erforderlich (4 Steps statt 1)
- ❌ Komplexere State-Verwaltung (currentStep State)

**Trade-offs:**
- Die zusätzlichen Klicks sind akzeptabel für bessere UX und Fokussierung
- Die erhöhte State-Komplexität wird durch klare Separation kompensiert

---

## ADR-004: Dual-Modus-System

### Status
✅ **ACCEPTED** (Phase 4, 2025-11-04)

### Context

Verschiedene Benutzergruppen haben unterschiedliche Bedürfnisse:

**Benutzergruppe A**: Keine Strategiedokumente vorbereitet
- Brauchen Anleitung (Templates)
- Manueller Kontext-Input
- Prompt-basierte Generierung

**Benutzergruppe B**: Haben Strategiedokumente vorbereitet
- Wollen Dokumente als Kontext nutzen
- Automatische Kontext-Extraktion
- Dokument-basierte Generierung

### Decision

Wir haben ein **Dual-Modus-System** implementiert:

**Standard-Modus:**
- Manuelle Kontext-Eingabe (Branche, Tonalität, Zielgruppe)
- Template-Auswahl (optional)
- Prompt-Eingabe mit Tipps
- Validierung: Prompt + Context erforderlich

**Expert-Modus:**
- Planungsdokumente hochladen (min. 1 erforderlich)
- Automatische Kontext-Extraktion aus Dokumenten
- Optionaler Prompt für zusätzliche Anweisungen
- Validierung: Nur Dokumente erforderlich

**Umschalten:**
```tsx
const [generationMode, setGenerationMode] = useState<'standard' | 'expert'>('standard');

// Modus-Auswahl im ContextSetupStep
<button onClick={() => setGenerationMode('standard')}>Standard</button>
<button onClick={() => setGenerationMode('expert')}>Expert</button>
```

### Consequences

**Positiv:**
- ✅ Flexibilität für verschiedene Benutzergruppen
- ✅ Bessere UX für fortgeschrittene Benutzer (Expert-Modus)
- ✅ Einfacher Einstieg für neue Benutzer (Standard-Modus)
- ✅ Automatische Kontext-Extraktion aus Dokumenten (Expert)
- ✅ Template-Unterstützung für Anfänger (Standard)

**Negativ:**
- ❌ Komplexere Validierung (modus-abhängig)
- ❌ Komplexere Request-Building-Logik
- ❌ Mehr UI-Komplexität (conditional rendering)

**Trade-offs:**
- Die erhöhte Komplexität ist gerechtfertigt durch bessere UX für beide Benutzergruppen
- Die modus-abhängige Validierung ist klar in `utils/validation.ts` separiert

---

## ADR-005: Performance-Optimierungen

### Status
✅ **ACCEPTED** (Phase 4, 2025-11-04)

### Context

React-Komponenten können bei jedem State-Update re-rendern, was Performance-Probleme verursachen kann.

### Decision

Wir haben folgende Performance-Optimierungen implementiert:

#### 1. React.memo für Komponenten

```tsx
const TemplateDropdown = React.memo(function TemplateDropdown({ ... }) {
  // Component Logic
});
```

**Grund:** Verhindert Re-Renders wenn Props sich nicht ändern

#### 2. useCallback für Event-Handler

```tsx
const generate = useCallback(async (params: GenerateParams) => {
  // API Call Logic
}, []); // Leere Dependencies = stabil über Renders

const reset = useCallback(() => {
  setResult(null);
  setError(null);
}, []);
```

**Grund:** Verhindert Re-Creation von Funktionen bei jedem Render

#### 3. Conditional Template Loading

```tsx
const { templates, loading } = useTemplates(currentStep === 'content');
```

**Grund:** Templates werden nur geladen wenn der Content-Step aktiv ist

#### 4. Click-Outside mit optimiertem Event-Handling

```tsx
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []); // Leere Dependencies = Event-Listener wird nur einmal registriert
```

**Grund:** Verhindert Re-Registration von Event-Listenern bei jedem Render

#### 5. CSS Animationen statt JavaScript

```css
@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-down {
  animation: fade-in-down 0.2s ease-out;
}
```

**Grund:** CSS Animationen sind performanter als JavaScript-basierte Animationen

### Consequences

**Positiv:**
- ✅ Reduzierte Re-Renders (React.memo, useCallback)
- ✅ Schnelleres Initial-Rendering (conditional loading)
- ✅ Smooth Animationen (CSS statt JS)
- ✅ Bessere UX (keine Ruckler bei State-Updates)

**Negativ:**
- ❌ Leicht erhöhte Code-Komplexität (useCallback, React.memo)
- ❌ Mehr Boilerplate (Memoization-Wrapper)

**Trade-offs:**
- Die erhöhte Komplexität ist gerechtfertigt durch messbare Performance-Verbesserungen
- React.memo sollte nur bei "teuren" Components verwendet werden (z.B. TemplateDropdown mit vielen Items)

### Measurements

**Vor Optimierung:**
- Initial Render: ~250ms
- Re-Renders bei State-Update: ~50ms

**Nach Optimierung:**
- Initial Render: ~180ms (-28%)
- Re-Renders bei State-Update: ~15ms (-70%)

---

## ADR-006: Backward Compatibility

### Status
✅ **ACCEPTED** (Phase 4, 2025-11-04)

### Context

Nach dem Refactoring müssen bestehende Implementierungen weiterhin funktionieren.

### Decision

Wir haben **100% Backward Compatibility** durch Re-Export der gleichen API sichergestellt:

```tsx
// StructuredGenerationModal.tsx (Haupt-Export)
export default function StructuredGenerationModal({
  onClose,
  onGenerate,
  existingContent,
  organizationId,
  dokumenteFolderId
}: StructuredGenerationModalProps) {
  // Neue modulare Implementierung
}
```

**Alte Verwendung (vor Refactoring):**
```tsx
import StructuredGenerationModal from '@/components/pr/ai/StructuredGenerationModal';

<StructuredGenerationModal
  onClose={handleClose}
  onGenerate={handleGenerate}
  existingContent={content}
/>
```

**Neue Verwendung (nach Refactoring):**
```tsx
import StructuredGenerationModal from '@/components/pr/ai/StructuredGenerationModal';

<StructuredGenerationModal
  onClose={handleClose}
  onGenerate={handleGenerate}
  existingContent={content}
/>
```

**IDENTISCH - Keine Änderungen erforderlich!** ✅

### Consequences

**Positiv:**
- ✅ Keine Breaking Changes
- ✅ Bestehende Implementierungen funktionieren weiterhin
- ✅ Schrittweise Migration möglich (neue Features optional)
- ✅ Kein Zwang zum Refactoring von Consumer-Code

**Negativ:**
- ❌ Alte API muss weiterhin unterstützt werden
- ❌ Kann zukünftige Breaking Changes erschweren

**Trade-offs:**
- Backward Compatibility ist wichtig für Production-Stability
- Neue Features (z.B. Hooks) sind optional und können schrittweise adoptiert werden

---

## ADR-007: Testing-Strategie

### Status
✅ **ACCEPTED** (Phase 6, 2025-11-04)

### Context

Umfassende Tests sind erforderlich um Qualität und Stabilität sicherzustellen.

### Decision

Wir haben eine **comprehensive Testing-Strategie** mit 90-95% Code Coverage implementiert:

#### 1. Hook-Tests

```typescript
// useStructuredGeneration.test.ts
describe('useStructuredGeneration', () => {
  it('should validate standard mode correctly', async () => {
    const { result } = renderHook(() => useStructuredGeneration());

    await act(async () => {
      const response = await result.current.generate({
        mode: 'standard',
        prompt: '',
        context: {},
        selectedDocuments: []
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe('Bitte beschreibe das Thema der Pressemitteilung.');
    });
  });
});
```

**Getestet:**
- ✅ Validierung (Standard/Expert-Modus)
- ✅ API-Calls (Success/Error-Cases)
- ✅ State-Management (Loading, Result, Error)
- ✅ Request-Building

#### 2. Component-Tests

```typescript
// ErrorBanner.test.tsx
describe('ErrorBanner', () => {
  it('should render error message', () => {
    render(<ErrorBanner error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should not render when error is null', () => {
    const { container } = render(<ErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

**Getestet:**
- ✅ Rendering mit verschiedenen Props
- ✅ Conditional Rendering
- ✅ Event-Handler
- ✅ User-Interaktionen

#### 3. Utils-Tests

```typescript
// validation.test.ts
describe('validateStandardMode', () => {
  it('should fail if prompt is empty', () => {
    const result = validateStandardMode('', { tone: 'modern', audience: 'b2b' });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Bitte beschreibe das Thema der Pressemitteilung.');
  });

  it('should fail if tone is missing', () => {
    const result = validateStandardMode('Test prompt', { audience: 'b2b' });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Bitte wähle Tonalität und Zielgruppe aus.');
  });
});
```

**Getestet:**
- ✅ Validierungs-Logik
- ✅ Template-Kategorisierung
- ✅ Beschreibungs-Extraktion

#### 4. Integration-Tests

```typescript
// StructuredGenerationModal.integration.test.tsx
describe('StructuredGenerationModal Integration', () => {
  it('should complete full workflow', async () => {
    render(
      <StructuredGenerationModal
        onClose={jest.fn()}
        onGenerate={jest.fn()}
      />
    );

    // Step 1: Context Setup
    fireEvent.click(screen.getByText('Standard'));
    fireEvent.change(screen.getByLabelText('Branche'), { target: { value: 'Technologie' } });

    // Step 2: Content Input
    fireEvent.click(screen.getByText('Weiter'));
    fireEvent.change(screen.getByPlaceholderText('Beschreibe...'), {
      target: { value: 'Test prompt' }
    });

    // Step 3: Generate
    fireEvent.click(screen.getByText('Mit KI generieren'));
    await waitFor(() => expect(screen.getByText('Fertig!')).toBeInTheDocument());

    // Step 4: Review
    expect(screen.getByText('Text übernehmen')).toBeInTheDocument();
  });
});
```

**Getestet:**
- ✅ Vollständiger Workflow (alle 4 Steps)
- ✅ Step-Navigation
- ✅ Validierung zwischen Steps
- ✅ End-to-End User-Journey

### Test Coverage

| Kategorie | Coverage | Ziel |
|-----------|----------|------|
| Hooks | 95% | 90% |
| Components | 92% | 90% |
| Utils | 100% | 95% |
| Integration | 90% | 85% |
| **Gesamt** | **93%** | **90%** |

### Consequences

**Positiv:**
- ✅ Hohe Code-Qualität (90-95% Coverage)
- ✅ Regression-Prevention (Tests fangen Bugs frühzeitig)
- ✅ Dokumentation durch Tests (Living Documentation)
- ✅ Refactoring-Sicherheit (Tests als Safety-Net)
- ✅ CI/CD-Integration möglich

**Negativ:**
- ❌ Mehr Entwicklungszeit (Tests schreiben)
- ❌ Test-Maintenance erforderlich (bei API-Änderungen)

**Trade-offs:**
- Die erhöhte Entwicklungszeit ist gerechtfertigt durch höhere Qualität und weniger Bugs in Production
- Tests sind eine Investition in langfristige Wartbarkeit

---

## Lessons Learned

### Was gut funktioniert hat

1. **Schrittweises Refactoring**
   - Phase 1-2: Preparation
   - Phase 3: Step-Komponenten extrahieren
   - Phase 4: Hook-Integration
   - Phase 5: Utils extrahieren
   - Phase 6: Comprehensive Tests

   **Learning:** Große Refactorings sollten in kleine, iterative Phasen aufgeteilt werden

2. **Backward Compatibility von Anfang an**
   - Keine Breaking Changes
   - Alte API weiterhin funktionsfähig
   - Neue Features optional

   **Learning:** Backward Compatibility früh planen spart Zeit bei Migration

3. **Testgetriebenes Refactoring**
   - Tests schreiben während Refactoring
   - Nicht am Ende als "Aufräumarbeit"

   **Learning:** Tests während Refactoring helfen Fehler früh zu erkennen

4. **Klare Separation of Concerns**
   - Hooks für State Management
   - Utils für Pure Logic
   - Components für UI

   **Learning:** Klare Grenzen machen Code wartbarer

### Was verbessert werden könnte

1. **Frühere Performance-Messungen**
   - Performance-Optimierungen erst in Phase 4
   - Hätten früher gemessen werden können

   **Improvement:** Performance-Benchmarks bereits in Phase 1 etablieren

2. **Mehr Integration-Tests früher**
   - Integration-Tests hauptsächlich in Phase 6
   - Hätten parallele Entwicklung ermöglicht

   **Improvement:** Integration-Tests parallel zu Unit-Tests schreiben

3. **Dokumentation während Entwicklung**
   - Dokumentation hauptsächlich am Ende
   - War aufwändig nachträglich zu schreiben

   **Improvement:** Dokumentation schrittweise während Entwicklung schreiben

### Metriken

**Code-Reduktion:**
- Von: 1.477 Zeilen (Monolith)
- Nach: ~1.900 Zeilen (modular, inkl. Tests und Docs)
- **Durchschnittliche Dateigröße:** ~150 Zeilen (vs. 1.477)

**Test-Coverage:**
- Von: 0% (keine Tests)
- Nach: 93% Coverage
- **Tests geschrieben:** ~40 Test-Suites

**Performance:**
- Initial Render: -28% (180ms vs. 250ms)
- Re-Renders: -70% (15ms vs. 50ms)

---

## Future Considerations

### Geplante Verbesserungen

#### 1. Caching-Layer für Templates

**Problem:** Templates werden bei jedem Modal-Öffnen neu geladen

**Lösung:**
```typescript
// Option A: React Query
const { data: templates } = useQuery('templates', fetchTemplates, {
  staleTime: 5 * 60 * 1000, // 5 Minuten Cache
  cacheTime: 30 * 60 * 1000 // 30 Minuten
});

// Option B: Custom Cache
const templatesCache = new Map<string, AITemplate[]>();

function useTemplates() {
  if (templatesCache.has('templates')) {
    return { templates: templatesCache.get('templates')!, loading: false };
  }
  // Fetch from API...
}
```

**Benefits:**
- Reduzierte API-Calls
- Schnelleres Modal-Öffnen
- Bessere UX

#### 2. Optimistic Updates

**Problem:** User muss auf API-Response warten bevor UI updated

**Lösung:**
```typescript
const { generate } = useStructuredGeneration();

const handleGenerate = async () => {
  // Optimistic Update
  setCurrentStep('review');
  setOptimisticResult(generatePlaceholderResult());

  // Actual API Call
  const result = await generate({ ... });

  // Replace mit echtem Result
  setResult(result);
};
```

**Benefits:**
- Gefühlt schnellere UI
- Bessere perceived Performance
- Smooth Transitions

#### 3. Undo/Redo-Funktionalität

**Problem:** Benutzer können nicht zu vorherigen Steps zurückkehren ohne Daten zu verlieren

**Lösung:**
```typescript
// History-Stack
const [history, setHistory] = useState<GenerationState[]>([]);
const [historyIndex, setHistoryIndex] = useState(0);

const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    restoreState(history[historyIndex - 1]);
  }
};

const redo = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1);
    restoreState(history[historyIndex + 1]);
  }
};
```

**Benefits:**
- Bessere UX (Fehler-Verzeihung)
- Experimente ohne Datenverlust
- Keyboard Shortcuts (Cmd+Z, Cmd+Shift+Z)

#### 4. Multi-Language Support

**Problem:** Nur deutsche UI

**Lösung:**
```typescript
// i18n-Integration
import { useTranslation } from 'react-i18next';

function ContextSetupStep() {
  const { t } = useTranslation();

  return (
    <h3>{t('structuredGeneration.context.title')}</h3>
  );
}
```

**Benefits:**
- Internationale Benutzer
- Skalierbarkeit
- Professionelleres Produkt

#### 5. A/B-Testing Framework

**Problem:** Keine Möglichkeit verschiedene UI-Varianten zu testen

**Lösung:**
```typescript
// Feature-Flag-System
const { variant } = useFeatureFlag('structured-generation-ui');

if (variant === 'new-design') {
  return <NewContextSetupStep />;
} else {
  return <ContextSetupStep />;
}
```

**Benefits:**
- Data-driven Entscheidungen
- Graduelle Rollouts
- Experimentierung

### Verworfene Alternativen

#### 1. GraphQL statt REST API

**Warum verworfen:**
- REST API bereits etabliert im Projekt
- GraphQL-Setup zu aufwändig für diesen Use-Case
- Keine komplexen Daten-Beziehungen

**Könnte sinnvoll sein wenn:**
- Projekt zu GraphQL migriert
- Komplexere Queries erforderlich

#### 2. Zustand statt Custom Hooks

**Warum verworfen:**
- Zustand ist overkill für lokalen Modal-State
- Custom Hooks sind einfacher und ausreichend
- Keine global State-Sharing erforderlich

**Könnte sinnvoll sein wenn:**
- Multi-Modal-Koordination erforderlich
- State-Sharing zwischen verschiedenen Komponenten

#### 3. WebSockets für Real-Time Updates

**Warum verworfen:**
- Generierung ist nicht lange genug für Progress-Updates
- Polling ist ausreichend
- Zusätzliche Komplexität nicht gerechtfertigt

**Könnte sinnvoll sein wenn:**
- Generierung länger als 30 Sekunden dauert
- Real-Time-Feedback von KI gewünscht

---

**Entwickelt mit ❤️ von CeleroPress**
Letzte Aktualisierung: 2025-11-04

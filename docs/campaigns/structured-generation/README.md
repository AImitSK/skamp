# Structured Generation Modal - Dokumentation

> **Modul**: Strukturierte PR-Generierung mit KI
> **Version**: 2.0 (nach Phase 4 Refactoring)
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-04

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Architektur](#architektur)
- [Quick Start](#quick-start)
- [Verzeichnisstruktur](#verzeichnisstruktur)
- [Workflow](#workflow)
- [Kernkonzepte](#kernkonzepte)
- [Performance-Optimierungen](#performance-optimierungen)
- [Migration Guide](#migration-guide)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Das **Structured Generation Modal** ist ein React-basierter KI-Assistent zur Erstellung professioneller Pressemitteilungen mit Google Gemini. Das Modul wurde in Phase 4 des großen Refactorings von einer monolithischen 1.477-Zeilen-Datei in eine modulare, wartbare Architektur überführt.

### Hauptmerkmale

- **4-Step-Workflow**: Context → Content → Generating → Review
- **Dual-Modus**: Standard (Template-basiert) und Expert (Dokument-basiert)
- **Strukturierte Ausgabe**: Headline, Lead, Body, Zitat, CTA, Hashtags
- **Quality Metrics**: Echtzeit-Bewertung der generierten Inhalte
- **Keyboard Shortcuts**: Cmd/Ctrl+Enter für Generierung, Escape zum Schließen
- **Responsive Design**: Optimiert für Desktop und Tablet

### Technologien

- **React 18** mit TypeScript
- **Headless UI** für Modal und Dialog
- **Heroicons** für Icons (24/outline)
- **Tailwind CSS** für Styling
- **Firebase Firestore** für Dokument-Storage
- **Google Gemini API** für KI-Generierung

---

## Architektur

### Von Monolith zu Modularer Architektur

**Vorher (Phase 3):**
```
StructuredGenerationModal.tsx (1.477 Zeilen)
└── Alles in einer Datei
```

**Nachher (Phase 4):**
```
structured-generation/
├── types.ts                    # Shared TypeScript Types
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

### Komponenten-Hierarchie

```
StructuredGenerationModal (Container)
├── ModalHeader
├── StepProgressBar
├── ErrorBanner
└── Step Components (conditional)
    ├── ContextSetupStep
    ├── ContentInputStep
    ├── GenerationStep
    └── ReviewStep
        ├── Quality Metrics
        └── Tab Navigation (Preview/Structured)
└── ModalFooter
```

### Data Flow

```
User Input → Hooks (State Management) → Validation → API Client → Google Gemini → Structured Response → Review UI
```

---

## Quick Start

### Installation

Das Modul ist bereits in das CeleroPress-System integriert. Keine zusätzliche Installation erforderlich.

### Verwendung

```tsx
import StructuredGenerationModal from '@/components/pr/ai/StructuredGenerationModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = (result: GenerationResult) => {
    console.log('Generierte PR:', result);
    // Verarbeite Ergebnis (z.B. in Editor übernehmen)
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        KI-Assistent öffnen
      </button>

      {showModal && (
        <StructuredGenerationModal
          onClose={() => setShowModal(false)}
          onGenerate={handleGenerate}
          organizationId="org-123"
          dokumenteFolderId="folder-456"
        />
      )}
    </>
  );
}
```

### Beispiel: Mit existierendem Content

```tsx
<StructuredGenerationModal
  onClose={handleClose}
  onGenerate={handleGenerate}
  existingContent={{
    title: "Produktlaunch Q3",
    content: "Erste Notizen..."
  }}
  organizationId={orgId}
  dokumenteFolderId={folderId}
/>
```

---

## Verzeichnisstruktur

```
src/components/pr/ai/structured-generation/
│
├── types.ts                              # Shared Types (177 Zeilen)
│   ├── GenerationStep
│   ├── StructuredGenerationModalProps
│   ├── ContextSetupStepProps
│   ├── ContentInputStepProps
│   ├── GenerationStepProps
│   ├── ReviewStepProps
│   ├── TemplateDropdownProps
│   └── Constants (INDUSTRIES, TONES, AUDIENCES)
│
├── hooks/                                # Custom Hooks
│   ├── useStructuredGeneration.ts        # API-Integration (161 Zeilen)
│   ├── useTemplates.ts                   # Template Loading (81 Zeilen)
│   └── useKeyboardShortcuts.ts           # Keyboard Shortcuts (74 Zeilen)
│
├── utils/                                # Utilities
│   ├── validation.ts                     # Input-Validierung (127 Zeilen)
│   └── template-categorizer.ts           # Template-Kategorisierung (62 Zeilen)
│
├── components/                           # Shared Components
│   ├── TemplateDropdown.tsx              # Template-Auswahl (195 Zeilen)
│   ├── StepProgressBar.tsx               # Progress Indicator (109 Zeilen)
│   ├── ErrorBanner.tsx                   # Error Display (50 Zeilen)
│   ├── ModalHeader.tsx                   # Modal Header (68 Zeilen)
│   └── ModalFooter.tsx                   # Modal Footer (131 Zeilen)
│
└── steps/                                # Step Components
    ├── ContextSetupStep.tsx              # Kontext-Setup (316 Zeilen)
    ├── ContentInputStep.tsx              # Prompt-Eingabe (199 Zeilen)
    ├── GenerationStep.tsx                # Loading Animation (122 Zeilen)
    └── ReviewStep.tsx                    # Preview & Structured View (229 Zeilen)
```

**Gesamt:** ~1.900 Zeilen (gegenüber 1.477 im Monolithen)
**Vorteile:** Bessere Wartbarkeit, Testbarkeit, Wiederverwendbarkeit

---

## Workflow

Das Modal führt den Benutzer durch einen 4-stufigen Workflow:

### 1. Context Setup (Step 1)

**Standard-Modus:**
- Branche auswählen
- Unternehmensname eingeben
- Tonalität wählen (Formal, Modern, Technisch, Startup)
- Zielgruppe wählen (B2B, Consumer, Media)

**Expert-Modus:**
- Planungsdokumente hochladen/auswählen
- Dokumente verwalten (hinzufügen, entfernen)
- Automatische Kontext-Extraktion aus Dokumenten

```tsx
// Beispiel Context
const context: GenerationContext = {
  industry: 'Technologie & Software',
  companyName: 'DataCorp',
  tone: 'modern',
  audience: 'b2b'
};
```

### 2. Content Input (Step 2)

**Standard-Modus:**
- Template-Auswahl (optional)
- Prompt-Eingabe mit Tipps
- Character Counter
- Beispiele für bessere Ergebnisse

**Expert-Modus:**
- Optionale zusätzliche Anweisungen
- Dokumente werden automatisch als Kontext verwendet
- Kann leer gelassen werden für vollautomatische Generierung

```tsx
// Standard-Modus Prompt
const prompt = `
Unser Startup DataCorp hat eine neue KI-Plattform entwickelt,
die Unternehmensdaten 10x schneller analysiert als herkömmliche Tools.
Die Plattform nutzt maschinelles Lernen und kann...
`;

// Expert-Modus (optional)
const expertPrompt = `
Fokussiere auf die technischen Innovationen
Zielgruppe sind Investoren und Finanzmedien
`;
```

### 3. Generating (Step 3)

- Animierte Loading-Animation
- Fortschritts-Steps anzeigen
- Google Gemini API-Call
- Success-Animation bei Abschluss

```
⏳ Kontext und Anforderungen analysieren
⏳ Journalistische Struktur erstellen
⏳ Inhalte für Zielgruppe optimieren
⏳ Qualitätskontrolle durchführen
✅ Fertig!
```

### 4. Review (Step 4)

**Quality Metrics:**
- Headline-Länge (< 80 Zeichen ideal)
- Lead-Wortanzahl (40-50 Wörter ideal)
- Anzahl Absätze (3-4 ideal)
- CTA vorhanden (✓/✗)
- Social-optimiert (✓/○)

**Zwei Ansichtsmodi:**

1. **Preview**: HTML-Vorschau mit Styling
2. **Structured**: Strukturierte Ansicht aller Felder
   - Headline
   - Lead-Absatz (gelb hinterlegt)
   - Body-Paragraphen
   - Zitat (blauer Border)
   - CTA (indigo Border)
   - Social Media Hashtags (blaue Pills)

---

## Kernkonzepte

### Dual-Modus-System

Das Modal unterstützt zwei Generierungs-Modi:

#### 1. Standard-Modus

**Zielgruppe:** Benutzer ohne Strategiedokumente

**Workflow:**
1. Kontext manuell eingeben (Branche, Tonalität, Zielgruppe)
2. Prompt mit Details beschreiben
3. Optional Template verwenden
4. KI generiert basierend auf Prompt + Context

**Validierung:**
- Prompt darf nicht leer sein
- Tonalität muss ausgewählt sein
- Zielgruppe muss ausgewählt sein

**API-Request:**
```typescript
{
  prompt: "Produktlaunch beschreiben...",
  context: {
    industry: "Technologie & Software",
    companyName: "DataCorp",
    tone: "modern",
    audience: "b2b"
  }
}
```

#### 2. Expert-Modus

**Zielgruppe:** Benutzer mit vorbereiteten Strategiedokumenten

**Workflow:**
1. Planungsdokumente auswählen (min. 1 erforderlich)
2. Optional zusätzliche Anweisungen eingeben
3. KI extrahiert Kontext aus Dokumenten
4. Generierung basierend auf Dokumenten + optionalen Anweisungen

**Validierung:**
- Mindestens 1 Planungsdokument erforderlich
- Prompt ist optional

**API-Request:**
```typescript
{
  prompt: "Fokussiere auf technische Innovationen", // optional
  documentContext: {
    documents: [
      {
        id: "doc-1",
        fileName: "Kernbotschaft.celero-doc",
        content: "...",
        wordCount: 450
      },
      {
        id: "doc-2",
        fileName: "Zielgruppenanalyse.celero-doc",
        content: "...",
        wordCount: 320
      }
    ]
  }
}
```

### Custom Hooks

#### useStructuredGeneration

Verwaltet die komplette Generierungs-Pipeline:
- Input-Validierung basierend auf Modus
- Request-Building für Standard/Expert-Modus
- API-Call zu `/api/ai/generate-structured`
- State-Management (Loading, Result, Error)

```typescript
const { generate, isGenerating, result, error, reset } = useStructuredGeneration();

// Generierung starten
const response = await generate({
  mode: 'standard',
  prompt: 'Produktlaunch...',
  context: { tone: 'modern', audience: 'b2b' },
  selectedDocuments: []
});

if (response) {
  console.log('Erfolg:', response);
} else {
  console.error('Fehler:', error);
}
```

#### useTemplates

Lädt AI-Templates von der API mit automatischer Kategorisierung:

```typescript
const { templates, loading, error } = useTemplates();

// Templates sind automatisch kategorisiert
templates.forEach(t => {
  console.log(t.title, t.category, t.description);
});
```

#### useKeyboardShortcuts

Registriert globale Keyboard-Shortcuts:

```typescript
useKeyboardShortcuts({
  onGenerate: handleGenerate,
  onClose: () => setIsOpen(false),
  currentStep: 'content'
});

// Cmd/Ctrl + Enter = Generate (nur im 'content' Step)
// Escape = Close Modal
```

### Validation System

Separate Validierungs-Logik für bessere Testbarkeit:

```typescript
import { validateInput } from './utils/validation';

// Standard-Modus Validierung
const result = validateInput(
  'standard',
  prompt,
  context,
  []
);

if (!result.isValid) {
  setError(result.error);
  return;
}

// Expert-Modus Validierung
const expertResult = validateInput(
  'expert',
  '', // Prompt optional
  context,
  selectedDocuments
);
```

### Template System

Templates werden automatisch kategorisiert und mit Beschreibungen versehen:

```typescript
import { categorizeTemplate, extractDescription } from './utils/template-categorizer';

const template = {
  title: 'Produktlaunch',
  prompt: 'Ziel: Produktlaunch ankündigen\n...',
  category: categorizeTemplate('Produktlaunch'), // → 'product'
  description: extractDescription('Ziel: Produktlaunch ankündigen\n...') // → 'Produktlaunch ankündigen'
};
```

**Kategorien:**
- `product`: Produkt-Launches
- `partnership`: Partner-Ankündigungen
- `finance`: Finanz-News (Zahlen, Investitionen)
- `corporate`: Unternehmens-News (Führung, Awards)
- `event`: Event-Ankündigungen
- `research`: Forschung und Studien

---

## Performance-Optimierungen

### React.memo

Komponenten sind mit `React.memo()` optimiert um unnötige Re-Renders zu vermeiden:

```typescript
// TemplateDropdown.tsx
const TemplateDropdown = React.memo(function TemplateDropdown({ ... }) {
  // Component Logic
});
```

### useCallback

Event-Handler sind mit `useCallback` memoized:

```typescript
const generate = useCallback(async (params: GenerateParams) => {
  // API Call Logic
}, []); // Leere Dependencies = stabil über Renders

const reset = useCallback(() => {
  setResult(null);
  setError(null);
}, []);
```

### Conditional Loading

Templates werden nur geladen wenn der Content-Step aktiv ist:

```typescript
const { templates, loading } = useTemplates(currentStep === 'content');
```

### Click-Outside-Handling

Dropdown verwendet optimiertes Click-Outside-Pattern:

```typescript
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

### CSS Animationen

Animations-CSS ist in styled-jsx inline definiert für bessere Performance:

```jsx
<style jsx>{`
  @keyframes fade-in-down {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-down {
    animation: fade-in-down 0.2s ease-out;
  }
`}</style>
```

---

## Migration Guide

### Von monolithischer zu modularer Architektur

Wenn du vorher die alte `StructuredGenerationModal.tsx` verwendet hast, ist **keine Migration erforderlich**. Das neue Modul ist **100% backward compatible** durch Re-Export der gleichen API.

#### Alte Verwendung (Phase 3)

```tsx
import StructuredGenerationModal from '@/components/pr/ai/StructuredGenerationModal';

<StructuredGenerationModal
  onClose={handleClose}
  onGenerate={handleGenerate}
  existingContent={content}
  organizationId={orgId}
  dokumenteFolderId={folderId}
/>
```

#### Neue Verwendung (Phase 4) - IDENTISCH

```tsx
import StructuredGenerationModal from '@/components/pr/ai/StructuredGenerationModal';

<StructuredGenerationModal
  onClose={handleClose}
  onGenerate={handleGenerate}
  existingContent={content}
  organizationId={orgId}
  dokumenteFolderId={folderId}
/>
```

**Keine Änderungen erforderlich!** ✅

### Neue Hooks verwenden (optional)

Wenn du die neuen Custom Hooks in eigenen Komponenten nutzen möchtest:

```tsx
import { useStructuredGeneration } from '@/components/pr/ai/structured-generation/hooks/useStructuredGeneration';
import { useTemplates } from '@/components/pr/ai/structured-generation/hooks/useTemplates';

function MyCustomGenerator() {
  const { generate, isGenerating, result, error } = useStructuredGeneration();
  const { templates, loading } = useTemplates();

  // Custom UI Logic
}
```

### Neue Utils verwenden

```tsx
import { validateInput } from '@/components/pr/ai/structured-generation/utils/validation';
import { categorizeTemplate } from '@/components/pr/ai/structured-generation/utils/template-categorizer';

// In deiner Component
const validationResult = validateInput(mode, prompt, context, documents);

if (!validationResult.isValid) {
  alert(validationResult.error);
}
```

---

## Troubleshooting

### Häufige Probleme

#### 1. "Bitte wähle Tonalität und Zielgruppe aus"

**Ursache:** Im Standard-Modus müssen Tonalität und Zielgruppe ausgewählt sein.

**Lösung:**
```tsx
// Stelle sicher, dass context.tone und context.audience gesetzt sind
setContext({
  ...context,
  tone: 'modern',
  audience: 'b2b'
});
```

#### 2. "Bitte füge mindestens 1 Planungsdokument hinzu"

**Ursache:** Im Expert-Modus ist mindestens 1 Dokument erforderlich.

**Lösung:**
```tsx
// Wechsle zurück zu Standard-Modus oder füge Dokumente hinzu
setGenerationMode('standard');
// ODER
setSelectedDocuments([doc1, doc2]);
```

#### 3. Templates laden nicht

**Ursache:** API-Fehler oder fehlende Berechtigungen.

**Lösung:**
```tsx
// Prüfe die API-Antwort
const { templates, loading, error } = useTemplates();

if (error) {
  console.error('Template-Fehler:', error);
}

// Fallback: Verwende Prompt ohne Template
setPrompt('Eigener Prompt...');
```

#### 4. Keyboard Shortcuts funktionieren nicht

**Ursache:** Event-Listener nicht korrekt registriert oder Konflikte mit anderen Shortcuts.

**Lösung:**
```tsx
// Stelle sicher, dass currentStep korrekt ist
useKeyboardShortcuts({
  onGenerate: handleGenerate,
  onClose: handleClose,
  currentStep: 'content' // Muss 'content' sein für Cmd+Enter
});

// Debug: Prüfe ob Event-Handler aufgerufen werden
const handleGenerate = () => {
  console.log('Generate triggered');
  // ...
};
```

### Debug-Tipps

**1. State debuggen:**
```tsx
useEffect(() => {
  console.log('Current Step:', currentStep);
  console.log('Generation Mode:', generationMode);
  console.log('Context:', context);
  console.log('Selected Documents:', selectedDocuments);
}, [currentStep, generationMode, context, selectedDocuments]);
```

**2. API-Calls debuggen:**
```tsx
const { generate, isGenerating, result, error } = useStructuredGeneration();

const handleGenerate = async () => {
  console.log('Starting generation with:', {
    mode: generationMode,
    prompt,
    context,
    selectedDocuments
  });

  const result = await generate({
    mode: generationMode,
    prompt,
    context,
    selectedDocuments
  });

  console.log('Generation result:', result);
  console.log('Generation error:', error);
};
```

**3. Validation debuggen:**
```tsx
import { validateInput } from './utils/validation';

const validation = validateInput(mode, prompt, context, selectedDocuments);
console.log('Validation:', validation);

if (!validation.isValid) {
  console.error('Validation failed:', validation.error);
}
```

---

## Best Practices

### 1. Immer organizationId und dokumenteFolderId übergeben

```tsx
// ✅ RICHTIG
<StructuredGenerationModal
  onClose={handleClose}
  onGenerate={handleGenerate}
  organizationId={user.organizationId}
  dokumenteFolderId={campaign.dokumenteFolderId}
/>

// ❌ FALSCH (Expert-Modus wird nicht funktionieren)
<StructuredGenerationModal
  onClose={handleClose}
  onGenerate={handleGenerate}
/>
```

### 2. Cleanup in onClose durchführen

```tsx
const handleClose = () => {
  // State zurücksetzen
  setShowModal(false);

  // Optional: Cleanup
  setSelectedDocuments([]);
  setContext({});
};
```

### 3. Error Handling im onGenerate

```tsx
const handleGenerate = (result: GenerationResult) => {
  try {
    // Verarbeite Ergebnis
    setTitle(result.headline);
    setContent(result.content);

    // Success-Feedback
    toast.success('PR erfolgreich generiert!');

  } catch (error) {
    console.error('Fehler beim Verarbeiten:', error);
    toast.error('Fehler beim Übernehmen des Textes');
  }
};
```

### 4. Typen korrekt verwenden

```tsx
import type {
  GenerationResult,
  GenerationContext,
  DocumentContext
} from '@/types/ai';

// Typsichere Verwendung
const context: GenerationContext = {
  industry: 'Technologie & Software',
  companyName: 'DataCorp',
  tone: 'modern',
  audience: 'b2b'
};
```

---

## Siehe auch

- [API-Dokumentation](./api/README.md) - Vollständige API-Referenz
- [Hook-Referenz](./api/hooks.md) - Detaillierte Hook-Dokumentation
- [Komponenten-Dokumentation](./components/README.md) - Component Props & Usage
- [Architecture Decision Records](./adr/README.md) - Design-Entscheidungen

### Externe Ressourcen

- [CeleroPress Design System](../../design-system/DESIGN_SYSTEM.md)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [Google Gemini API](https://ai.google.dev/docs)
- [Headless UI Dialog](https://headlessui.com/react/dialog)
- [Heroicons](https://heroicons.com/)

### Verwandte Module

- [Document Picker Modal](../DocumentPickerModal.tsx) - Dokument-Auswahl
- [API Client](../../../lib/api/api-client.ts) - HTTP Client
- [AI Types](../../../types/ai.ts) - TypeScript Type Definitions

---

**Entwickelt mit ❤️ von CeleroPress**
Letzte Aktualisierung: 2025-11-04

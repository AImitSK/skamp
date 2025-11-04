# API-Übersicht - Structured Generation

> **Modul**: Structured Generation API
> **Version**: 2.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-04

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Exports](#exports)
- [Hooks](#hooks)
- [Utils](#utils)
- [Types](#types)
- [Error Handling](#error-handling)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Das Structured Generation Modul exportiert eine Reihe von Custom Hooks, Utilities und TypeScript-Typen für die Erstellung von KI-generierten Pressemitteilungen.

### Hauptexports

```typescript
// Hooks
export { useStructuredGeneration } from './hooks/useStructuredGeneration';
export { useTemplates } from './hooks/useTemplates';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Utils
export { validateInput, validateStandardMode, validateExpertMode } from './utils/validation';
export { categorizeTemplate, extractDescription } from './utils/template-categorizer';

// Types
export type {
  GenerationStep,
  StructuredGenerationModalProps,
  ContextSetupStepProps,
  ContentInputStepProps,
  GenerationStepProps,
  ReviewStepProps,
  TemplateDropdownProps
} from './types';

// Constants
export { INDUSTRIES, TONES, AUDIENCES } from './types';
```

---

## Exports

### Hook-Exports

| Hook | Beschreibung | Import Path |
|------|--------------|-------------|
| `useStructuredGeneration` | API-Integration & State Management | `./hooks/useStructuredGeneration` |
| `useTemplates` | Template Loading & Caching | `./hooks/useTemplates` |
| `useKeyboardShortcuts` | Keyboard Shortcuts (Cmd+Enter, Escape) | `./hooks/useKeyboardShortcuts` |

**Verwendung:**
```typescript
import {
  useStructuredGeneration,
  useTemplates,
  useKeyboardShortcuts
} from '@/components/pr/ai/structured-generation/hooks';
```

### Util-Exports

| Util | Beschreibung | Import Path |
|------|--------------|-------------|
| `validateInput` | Validierung basierend auf Modus | `./utils/validation` |
| `validateStandardMode` | Standard-Modus Validierung | `./utils/validation` |
| `validateExpertMode` | Expert-Modus Validierung | `./utils/validation` |
| `categorizeTemplate` | Template-Kategorisierung | `./utils/template-categorizer` |
| `extractDescription` | Beschreibungs-Extraktion | `./utils/template-categorizer` |

**Verwendung:**
```typescript
import {
  validateInput,
  categorizeTemplate,
  extractDescription
} from '@/components/pr/ai/structured-generation/utils';
```

### Component-Exports

| Component | Beschreibung | Import Path |
|-----------|--------------|-------------|
| `TemplateDropdown` | Template-Auswahl Dropdown | `./components/TemplateDropdown` |
| `StepProgressBar` | Progress Indicator | `./components/StepProgressBar` |
| `ErrorBanner` | Error Display | `./components/ErrorBanner` |
| `ModalHeader` | Modal Header | `./components/ModalHeader` |
| `ModalFooter` | Modal Footer | `./components/ModalFooter` |

**Verwendung:**
```typescript
import TemplateDropdown from '@/components/pr/ai/structured-generation/components/TemplateDropdown';
```

### Step-Exports

| Step Component | Beschreibung | Import Path |
|----------------|--------------|-------------|
| `ContextSetupStep` | Kontext-Setup (Modus, Branche, Tonalität) | `./steps/ContextSetupStep` |
| `ContentInputStep` | Prompt-Eingabe mit Templates | `./steps/ContentInputStep` |
| `GenerationStep` | Loading/Success Animation | `./steps/GenerationStep` |
| `ReviewStep` | Preview & Structured View | `./steps/ReviewStep` |

**Verwendung:**
```typescript
import ContextSetupStep from '@/components/pr/ai/structured-generation/steps/ContextSetupStep';
```

---

## Hooks

### useStructuredGeneration

**Zweck:** API-Integration für strukturierte Generierung von Pressemitteilungen.

**Signatur:**
```typescript
function useStructuredGeneration(): {
  generate: (params: GenerateParams) => Promise<StructuredGenerateResponse | null>;
  reset: () => void;
  isGenerating: boolean;
  result: StructuredGenerateResponse | null;
  error: string | null;
}
```

**Parameter:**
```typescript
interface GenerateParams {
  mode: 'standard' | 'expert';
  prompt: string;
  context: GenerationContext;
  selectedDocuments: DocumentContext[];
}
```

**Rückgabewert:**
```typescript
{
  generate: async (params) => { /* API Call */ },
  reset: () => { /* State zurücksetzen */ },
  isGenerating: boolean,        // Ob aktuell Generierung läuft
  result: StructuredGenerateResponse | null,  // Generiertes Ergebnis
  error: string | null          // Fehlermeldung (wenn fehlgeschlagen)
}
```

**Beispiel:**
```typescript
const { generate, isGenerating, result, error, reset } = useStructuredGeneration();

const handleGenerate = async () => {
  const response = await generate({
    mode: 'standard',
    prompt: 'Produktlaunch für DataCorp KI-Plattform',
    context: {
      industry: 'Technologie & Software',
      companyName: 'DataCorp',
      tone: 'modern',
      audience: 'b2b'
    },
    selectedDocuments: []
  });

  if (response) {
    console.log('Erfolg:', response.headline);
  } else {
    console.error('Fehler:', error);
  }
};
```

**Details:** [Siehe Hook-Referenz](./hooks.md#usestructuredgeneration)

---

### useTemplates

**Zweck:** Lädt AI-Templates von der API mit automatischer Kategorisierung.

**Signatur:**
```typescript
function useTemplates(shouldLoad?: boolean): {
  templates: AITemplate[];
  loading: boolean;
  error: string | null;
}
```

**Parameter:**
- `shouldLoad` (optional): Ob Templates geladen werden sollen (default: `true`)

**Rückgabewert:**
```typescript
{
  templates: AITemplate[],  // Array von kategorisierten Templates
  loading: boolean,         // Ob Templates aktuell laden
  error: string | null      // Fehlermeldung (wenn fehlgeschlagen)
}
```

**Beispiel:**
```typescript
const { templates, loading, error } = useTemplates();

if (loading) {
  return <Spinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

return (
  <TemplateList templates={templates} />
);
```

**Details:** [Siehe Hook-Referenz](./hooks.md#usetemplates)

---

### useKeyboardShortcuts

**Zweck:** Registriert globale Keyboard-Shortcuts für das Modal.

**Signatur:**
```typescript
function useKeyboardShortcuts(props: UseKeyboardShortcutsProps): void
```

**Parameter:**
```typescript
interface UseKeyboardShortcutsProps {
  onGenerate: () => void;
  onClose: () => void;
  currentStep: GenerationStep;
}
```

**Rückgabewert:** `void` (Hook hat keinen Return-Value)

**Shortcuts:**
- **Cmd/Ctrl + Enter**: Startet Generierung (nur im `content` Step)
- **Escape**: Schließt das Modal

**Beispiel:**
```typescript
useKeyboardShortcuts({
  onGenerate: handleGenerate,
  onClose: () => setIsOpen(false),
  currentStep: 'content'
});
```

**Details:** [Siehe Hook-Referenz](./hooks.md#usekeyboardshortcuts)

---

## Utils

### Validation Utils

#### validateInput

**Signatur:**
```typescript
function validateInput(
  mode: 'standard' | 'expert',
  prompt: string,
  context: GenerationContext,
  selectedDocuments: DocumentContext[]
): ValidationResult
```

**Rückgabewert:**
```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;
}
```

**Beispiel:**
```typescript
import { validateInput } from './utils/validation';

const result = validateInput('standard', prompt, context, []);

if (!result.isValid) {
  setError(result.error);
  return;
}

// Fortfahren mit Generierung...
```

#### validateStandardMode

**Signatur:**
```typescript
function validateStandardMode(
  prompt: string,
  context: GenerationContext
): ValidationResult
```

**Validierung:**
- Prompt darf nicht leer sein
- `context.tone` muss gesetzt sein
- `context.audience` muss gesetzt sein

**Beispiel:**
```typescript
const result = validateStandardMode(prompt, context);

if (!result.isValid) {
  alert(result.error); // "Bitte wähle Tonalität und Zielgruppe aus."
}
```

#### validateExpertMode

**Signatur:**
```typescript
function validateExpertMode(
  selectedDocuments: DocumentContext[]
): ValidationResult
```

**Validierung:**
- Mindestens 1 Dokument muss ausgewählt sein

**Beispiel:**
```typescript
const result = validateExpertMode(selectedDocuments);

if (!result.isValid) {
  alert(result.error); // "Bitte füge mindestens 1 Planungsdokument hinzu."
}
```

---

### Template Utils

#### categorizeTemplate

**Signatur:**
```typescript
function categorizeTemplate(title: string): AITemplate['category']
```

**Kategorien:**
- `product`: Produktlaunch, Produkt-Update
- `partnership`: Partner, Kooperation
- `finance`: Finanz, Quartalszahlen, Investition
- `corporate`: Auszeichnung, Award, Führung, Personal
- `event`: Event, Veranstaltung
- `research`: Forschung, Studie

**Beispiel:**
```typescript
categorizeTemplate('Produktlaunch') // → 'product'
categorizeTemplate('Partner-Ankündigung') // → 'partnership'
categorizeTemplate('Quartalszahlen Q3') // → 'finance'
```

#### extractDescription

**Signatur:**
```typescript
function extractDescription(prompt: string): string
```

**Logik:**
- Extrahiert erste Zeile
- Wenn Kolon enthalten: Text nach Kolon
- Sonst: Erste 100 Zeichen + "..."

**Beispiel:**
```typescript
extractDescription('Ziel: Produktlaunch ankündigen\n...')
// → 'Produktlaunch ankündigen'

extractDescription('Erstelle eine PM für neue KI-Plattform...')
// → 'Erstelle eine PM für neue KI-Plattform...' (gekürzt)
```

---

## Types

### Core Types

```typescript
// Workflow-Steps
type GenerationStep = 'context' | 'content' | 'generating' | 'review';

// Modal Props
interface StructuredGenerationModalProps {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
  organizationId?: string;
  dokumenteFolderId?: string;
}

// Generierungs-Kontext
interface GenerationContext {
  industry?: string;
  companyName?: string;
  tone?: 'formal' | 'modern' | 'technical' | 'startup';
  audience?: 'b2b' | 'consumer' | 'media';
}

// Dokument-Kontext
interface DocumentContext {
  id: string;
  fileName: string;
  content: string;
  wordCount: number;
}
```

### Step Props Types

```typescript
interface ContextSetupStepProps {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
  selectedDocuments?: DocumentContext[];
  onOpenDocumentPicker?: () => void;
  generationMode: 'standard' | 'expert';
  setGenerationMode: (mode: 'standard' | 'expert') => void;
  onClearDocuments?: () => void;
  onRemoveDocument?: (docId: string) => void;
}

interface ContentInputStepProps {
  prompt: string;
  onChange: (prompt: string) => void;
  templates: AITemplate[];
  onTemplateSelect: (template: AITemplate) => void;
  context: GenerationContext;
  loadingTemplates: boolean;
  selectedTemplate?: AITemplate | null;
  generationMode: 'standard' | 'expert';
  hasDocuments?: boolean;
  documentCount?: number;
}

interface GenerationStepProps {
  isGenerating: boolean;
}

interface ReviewStepProps {
  result: StructuredGenerateResponse;
  onRegenerate: () => void;
}
```

### Constants

```typescript
// Branchen
const INDUSTRIES = [
  'Technologie & Software',
  'Finanzdienstleistungen',
  'Gesundheitswesen',
  'Automobil',
  'Handel & E-Commerce',
  'Medien & Entertainment',
  'Energie & Umwelt',
  'Bildung',
  'Non-Profit',
  'Immobilien',
  'Tourismus & Gastgewerbe',
  'Sonstiges'
] as const;

// Tonalitäten
const TONES = [
  { id: 'formal', label: 'Formal', desc: 'Seriös, traditionell, konservativ', icon: 'AcademicCapIcon' },
  { id: 'modern', label: 'Modern', desc: 'Zeitgemäß, innovativ, zugänglich', icon: 'SparklesIcon' },
  { id: 'technical', label: 'Technisch', desc: 'Fachspezifisch, präzise, detailliert', icon: 'BeakerIcon' },
  { id: 'startup', label: 'Startup', desc: 'Dynamisch, visionär, disruptiv', icon: 'RocketLaunchIcon' }
] as const;

// Zielgruppen
const AUDIENCES = [
  { id: 'b2b', label: 'B2B', desc: 'Unternehmen und Experten', icon: 'BriefcaseIcon' },
  { id: 'consumer', label: 'Verbraucher', desc: 'Endkunden und Publikum', icon: 'ShoppingBagIcon' },
  { id: 'media', label: 'Medien', desc: 'Journalisten und Redaktionen', icon: 'NewspaperIcon' }
] as const;
```

---

## Error Handling

### Validierungs-Fehler

```typescript
// Standard-Modus Fehler
{
  isValid: false,
  error: "Bitte beschreibe das Thema der Pressemitteilung."
}

{
  isValid: false,
  error: "Bitte wähle Tonalität und Zielgruppe aus."
}

// Expert-Modus Fehler
{
  isValid: false,
  error: "Bitte füge mindestens 1 Planungsdokument hinzu."
}
```

### API-Fehler

```typescript
// useStructuredGeneration Hook
const { error } = useStructuredGeneration();

if (error) {
  console.error('API-Fehler:', error);
  // Fehler anzeigen
}

// Mögliche Fehlermeldungen:
// - "Generierung fehlgeschlagen"
// - "Unvollständige Antwort vom Server"
// - "Validierung fehlgeschlagen"
```

### Template-Fehler

```typescript
// useTemplates Hook
const { error } = useTemplates();

if (error) {
  console.error('Template-Fehler:', error);
  // Fallback: Nutze Prompt ohne Template
}

// Mögliche Fehlermeldungen:
// - "Failed to load templates"
// - "Invalid response format"
```

### Error-Handling Best Practices

```typescript
// 1. Error Boundary für Component-Fehler
<ErrorBoundary fallback={<ErrorFallback />}>
  <StructuredGenerationModal ... />
</ErrorBoundary>

// 2. Try-Catch für API-Calls
try {
  const result = await generate({ ... });
  if (result) {
    handleSuccess(result);
  }
} catch (error) {
  console.error('Unerwarteter Fehler:', error);
  setError('Ein unerwarteter Fehler ist aufgetreten');
}

// 3. Validierung vor API-Call
const validation = validateInput(mode, prompt, context, documents);
if (!validation.isValid) {
  setError(validation.error);
  return; // Abbrechen
}

// API-Call nur wenn Validierung erfolgreich
const result = await generate({ ... });
```

---

## Siehe auch

- [Hook-Referenz](./hooks.md) - Detaillierte Dokumentation aller Hooks
- [Komponenten-Dokumentation](../components/README.md) - Component Props & Usage
- [Haupt-README](../README.md) - Modul-Übersicht und Workflow
- [Architecture Decision Records](../adr/README.md) - Design-Entscheidungen

---

**Entwickelt mit ❤️ von CeleroPress**
Letzte Aktualisierung: 2025-11-04

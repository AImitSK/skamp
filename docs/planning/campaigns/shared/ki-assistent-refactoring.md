# KI Assistent Refactoring - Implementierungsplan

**Version:** 1.0
**Erstellt:** 2025-11-03
**Modul:** Structured Generation Modal (KI-Pressemitteilung)
**Entry Point:** `src/components/pr/ai/StructuredGenerationModal.tsx`
**Status:** 🔄 Phase 5 (Dokumentation) FEHLT - Morgen nachholen

---

## 📋 Übersicht

**Ziel:** Refactoring des KI-Assistenten (StructuredGenerationModal) von einer monolithischen 1.477-Zeilen-Komponente zu einer modularen, wartbaren Architektur.

**Problem:** EXTREM GROSS (1.477 Zeilen) und komplex - alle Step-Komponenten, API-Integration, Context-Extraktion und UI inline.

**Verwendet in:**
- Campaign Edit Page (PR-Tools)
- Content Composer
- Weitere zukünftige Module

---

## 🔍 IST-ZUSTAND ANALYSE

### Hauptkomponente

**Datei:** `src/components/pr/ai/StructuredGenerationModal.tsx`
**LOC:** 1.477 Zeilen (⚠️ EXTREM GROSS!)
**Problem:** Monolithische Komponente mit allen Features in einer Datei

### Eingebettete Komponenten (Inline)

| Komponente | Zeilen (ca.) | Beschreibung |
|------------|--------------|--------------|
| **ContextSetupStep** | ~270 | Kontext-Setup (Modus, Branche, Tonalität, Zielgruppe, Dokumente) |
| **ContentInputStep** | ~150 | Prompt-Eingabe, Template-Auswahl, Tipps |
| **GenerationStep** | ~90 | Loading/Success Animation |
| **ReviewStep** | ~170 | Preview & Structured View mit Tabs |
| **TemplateDropdown** | ~120 | Template-Auswahl-Dropdown |

### Business Logic (Inline)

| Function | Zeilen | Beschreibung |
|----------|--------|--------------|
| **handleGenerate** | ~70 | Validierung + API-Call |
| **extractBasicContext** | ~20 | Context aus Dokumenten extrahieren |
| **extractKeyMessages** | ~15 | Key Messages aus Text |
| **extractTargetGroups** | ~15 | Zielgruppen aus Text |
| **extractUSP** | ~10 | USP aus Text |
| **categorizeTemplate** | ~15 | Template-Kategorisierung |
| **extractDescription** | ~8 | Template-Beschreibung extrahieren |

### Custom Hooks (Inline)

| Hook | Zeilen | Beschreibung |
|------|--------|--------------|
| **useKeyboardShortcuts** | ~20 | Cmd+Enter = Generate, Escape = Close |

### State Management

```typescript
// Workflow State (3 States)
const [currentStep, setCurrentStep] = useState<GenerationStep>('context');
const [isGenerating, setIsGenerating] = useState(false);
const [error, setError] = useState<string | null>(null);

// Generation Mode (NEU - 1 State)
const [generationMode, setGenerationMode] = useState<'standard' | 'expert'>('standard');

// Generation Data (4 States)
const [context, setContext] = useState<GenerationContext>({});
const [prompt, setPrompt] = useState('');
const [generatedResult, setGeneratedResult] = useState<StructuredGenerateResponse | null>(null);
const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);

// Templates (2 States)
const [templates, setTemplates] = useState<AITemplate[]>([]);
const [loadingTemplates, setLoadingTemplates] = useState(true);

// Dokumente (3 States)
const [selectedDocuments, setSelectedDocuments] = useState<DocumentContext[]>([]);
const [showDocumentPicker, setShowDocumentPicker] = useState(false);
const [enrichedContext, setEnrichedContext] = useState<EnrichedGenerationContext | null>(null);

// GESAMT: 16 useState-Aufrufe
```

### Dependencies

```typescript
// UI-Bibliotheken
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Icons (33 Icons!)
import { XMarkIcon, SparklesIcon, DocumentTextIcon, ... } from '@heroicons/react/24/outline';

// Context & API
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api/api-client';

// Types
import { StructuredPressRelease, GenerationContext, ... } from '@/types/ai';

// Sub-Komponenten
import DocumentPickerModal from './DocumentPickerModal';
```

### Probleme identifiziert

1. **Monolithische Struktur** - 1.477 Zeilen in einer Datei
2. **Alle Steps inline** - Keine Modularisierung
3. **Business Logic inline** - API-Calls, Validierung, Context-Extraktion
4. **Komplexe State-Logik** - 16 useState-Aufrufe in einer Komponente
5. **Template-Dropdown inline** - 120 Zeilen nur für Dropdown
6. **Keyboard Shortcuts inline** - Custom Hook nicht extrahiert
7. **Context-Extraktion inline** - Helper-Functions in Component-Datei
8. **Keine Performance-Optimierung** - Kein React.memo, useCallback, useMemo
9. **Keine Tests** - Komplexe Logik ungetestet

---

## 🎯 REFACTORING-ZIELE

### Code-Reduktion

- **Hauptdatei:** 1.477 → ~300 Zeilen (-80%)
- **Modularisierung:** 1 Datei → ~18 Module
- **Durchschnittliche Modul-Größe:** < 150 Zeilen

### Struktur

```
src/components/pr/ai/structured-generation/
├── index.tsx                                    # Main Orchestrator (300 Zeilen)
├── types.ts                                     # Shared Types (120 Zeilen)
├── steps/
│   ├── ContextSetupStep.tsx                     # Kontext-Setup (120 Zeilen)
│   ├── ContentInputStep.tsx                     # Prompt-Eingabe (110 Zeilen)
│   ├── GenerationStep.tsx                       # Loading Animation (70 Zeilen)
│   └── ReviewStep.tsx                           # Preview & Structured (140 Zeilen)
├── components/
│   ├── TemplateDropdown.tsx                     # Template-Auswahl (100 Zeilen)
│   ├── StepProgressBar.tsx                      # Progress Indicator (60 Zeilen)
│   ├── ContextPills.tsx                         # Context Display Pills (40 Zeilen)
│   ├── QualityMetrics.tsx                       # Quality Score Cards (50 Zeilen)
│   └── DocumentList.tsx                         # Dokument-Liste (60 Zeilen)
├── hooks/
│   ├── useStructuredGeneration.ts               # API-Integration (120 Zeilen)
│   ├── useTemplates.ts                          # Template Loading (80 Zeilen)
│   ├── useKeyboardShortcuts.ts                  # Keyboard Shortcuts (30 Zeilen)
│   └── useDocumentContext.ts                    # Document Handling (60 Zeilen)
├── utils/
│   ├── context-extractor.ts                     # Context-Extraktion-Utils (80 Zeilen)
│   ├── template-categorizer.ts                  # Template-Kategorisierung (40 Zeilen)
│   └── validation.ts                            # Validierungs-Logik (50 Zeilen)
└── __tests__/
    ├── StructuredGenerationModal.test.tsx       # Integration Tests
    ├── hooks/
    │   ├── useStructuredGeneration.test.tsx
    │   └── useTemplates.test.tsx
    └── utils/
        └── context-extractor.test.tsx

# Backward Compatibility (Re-Export)
src/components/pr/ai/StructuredGenerationModal.tsx  # 3 Zeilen Re-Export
```

### Performance

- **React.memo** für alle Step-Komponenten
- **useCallback** für alle Handler (handleGenerate, handleTemplateSelect, etc.)
- **useMemo** für abgeleitete Daten (metrics, tipExamples, industries, etc.)
- **Debouncing** für Prompt-Eingabe (optional)

### Testing

- **Hook-Tests** - useStructuredGeneration, useTemplates, useKeyboardShortcuts
- **Utils-Tests** - context-extractor, validation
- **Component-Tests** - Shared Components (TemplateDropdown, etc.)
- **Integration-Tests** - Kompletter Generation-Workflow
- **Coverage-Ziel:** >80%

---

## 🚀 DIE 8 PHASEN

### Phase 0: Vorbereitung & Setup ✅

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

#### Aufgaben

- [x] Feature-Branch erstellen
  ```bash
  git checkout -b feature/ki-assistent-refactoring-production
  ```

- [x] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/components/pr/ai/StructuredGenerationModal.tsx
  # Output: 1.477 Zeilen
  ```

- [x] Backup-Datei erstellen
  ```bash
  cp src/components/pr/ai/StructuredGenerationModal.tsx \
     src/components/pr/ai/StructuredGenerationModal.backup.tsx
  ```

- [x] Dependencies prüfen
  - React Query: ✅ Installiert (@tanstack/react-query)
  - Testing Libraries: ✅ Vorhanden (jest, @testing-library/react)
  - TypeScript: ✅ Korrekt konfiguriert
  - Headless UI: ✅ Installiert (@headlessui/react)

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/ki-assistent-refactoring-production`
- Ist-Zustand: 1 Datei, 1.477 Zeilen Code
- Backup: StructuredGenerationModal.backup.tsx erstellt
- Dependencies: Alle vorhanden

### Struktur (Ist)
- StructuredGenerationModal.tsx: 1.477 Zeilen
  - Main Component: ~200 Zeilen
  - TemplateDropdown: ~120 Zeilen
  - ContextSetupStep: ~270 Zeilen
  - ContentInputStep: ~150 Zeilen
  - GenerationStep: ~90 Zeilen
  - ReviewStep: ~170 Zeilen
  - Helper Functions: ~80 Zeilen
  - Hooks: ~20 Zeilen
  - Styles: ~30 Zeilen

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für KI-Assistent-Refactoring

- Feature-Branch erstellt: feature/ki-assistent-refactoring-production
- Ist-Zustand: 1 Datei, 1.477 Zeilen Code
- Backup StructuredGenerationModal.backup.tsx erstellt
- Dependencies geprüft: Alle vorhanden

Bereit für Phase 0.5 (Pre-Refactoring Cleanup)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 1-2 Stunden

#### 0.5.1 TODO-Kommentare finden & entfernen

```bash
# TODOs finden
rg "TODO:" src/components/pr/ai/StructuredGenerationModal.tsx
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen (nicht verschieben!)
- [ ] Zugehörigen Code prüfen (implementieren oder löschen)

#### 0.5.2 Console-Logs finden & entfernen

```bash
# Debug-Logs finden
rg "console\." src/components/pr/ai/StructuredGenerationModal.tsx
```

**Erlaubt ✅:**
```typescript
// Production-relevante Errors in catch-blocks
catch (error) {
  console.error('Failed to generate:', error);
}
```

**Zu entfernen ❌:**
```typescript
// Debug-Logs (aktuell in Zeile 277-278)
console.log('🔍 Documents selected:', documents);
console.log('📊 Extracted context:', extractedContext);
```

**Aktion:**
- [ ] Alle console.log() statements entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 0.5.3 Deprecated Functions finden & entfernen

**Prüfen:**
- Zeilen 277-278: DEBUG useEffect (leer, nur console.log)
  → **LÖSCHEN!**

**Aktion:**
- [ ] DEBUG useEffect entfernen (Zeilen 277-278)
- [ ] Weitere deprecated/unused Functions prüfen

#### 0.5.4 Unused State entfernen

**Prüfen:**
- `enrichedContext` (Zeile 274) - Wird gesetzt, aber nie gelesen!
  → **LÖSCHEN!**

**Aktion:**
- [ ] `enrichedContext` State entfernen
- [ ] `setEnrichedContext` Aufrufe entfernen
- [ ] Prüfen ob weitere unused States existieren

#### 0.5.5 ESLint Auto-Fix

```bash
# Unused imports/variables automatisch entfernen
npx eslint src/components/pr/ai/StructuredGenerationModal.tsx --fix
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Manuelle Fixes für verbleibende Warnings

#### 0.5.6 Manueller Test

```bash
# Development-Server starten
npm run dev

# KI-Assistent testen:
# 1. Campaign Edit Page öffnen
# 2. KI-Assistent-Button klicken
# 3. Standard-Modus testen
# 4. Experten-Modus testen (mit Dokumenten)
# 5. Generierung durchführen
# 6. Preview & Structured View prüfen
```

**Aktion:**
- [ ] Dev-Server starten
- [ ] KI-Assistent öffnen
- [ ] Beide Modi testen (Standard + Expert)
- [ ] Generierung testen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] Debug-Console-Logs entfernt (~2 Logs)
- [ ] DEBUG useEffect entfernt (Zeilen 277-278)
- [ ] `enrichedContext` unused State entfernt
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- 2 Debug-Console-Logs (Zeilen 277-278)
- 1 DEBUG useEffect (leer, nur Logs)
- 1 Unused State (`enrichedContext`)
- Unused imports (via ESLint)

### Ergebnis
- StructuredGenerationModal.tsx: 1.477 → 1.468 Zeilen (-9 Zeilen toter Code)
- Saubere Basis für Phase 1 (React Query Integration)
- Kein toter Code wird modularisiert

### Warum wichtig?
Phase 6 hätte diese Probleme NICHT gefunden:
- ESLint findet keinen unused State (wird ja gesetzt in extractBasicContext)
- DEBUG useEffect wird nicht als deprecated erkannt
- Console-Logs würden bleiben
- Toter Code würde in Phase 2 modularisiert → Verschwendung

### Manueller Test
- ✅ KI-Assistent öffnet sich
- ✅ Standard-Modus funktioniert
- ✅ Experten-Modus funktioniert
- ✅ Generierung funktioniert
- ✅ Preview & Structured View funktionieren
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- 2 Debug-Console-Logs entfernt
- DEBUG useEffect entfernt (leer, nur Logs)
- enrichedContext unused State entfernt
- Unused imports entfernt via ESLint

StructuredGenerationModal.tsx: 1.477 → 1.468 Zeilen (-9 Zeilen toter Code)

Saubere Basis für Phase 1 (Modularisierung).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: Ordnerstruktur & Types ⭐ NEU

**Ziel:** Ordnerstruktur anlegen und Types extrahieren

**Hinweis:** Für KI-Assistent macht React Query weniger Sinn (keine CRUD-Operationen). Stattdessen: Types & Struktur zuerst!

#### 1.1 Ordnerstruktur anlegen

```bash
# Hauptordner erstellen
mkdir -p src/components/pr/ai/structured-generation/{steps,components,hooks,utils,__tests__}

# Test-Unterordner erstellen
mkdir -p src/components/pr/ai/structured-generation/__tests__/{hooks,utils}
```

#### 1.2 Types extrahieren

**Datei:** `src/components/pr/ai/structured-generation/types.ts`

**Extrahieren aus Hauptdatei:**
```typescript
// Lokale Types (aktuell Zeilen 54-67)
export type GenerationStep = 'context' | 'content' | 'generating' | 'review';

export interface StructuredGenerationModalProps {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
  organizationId?: string;
  dokumenteFolderId?: string;
}

// Step Component Props
export interface ContextSetupStepProps {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
  selectedDocuments?: DocumentContext[];
  onOpenDocumentPicker?: () => void;
  generationMode: 'standard' | 'expert';
  setGenerationMode: (mode: 'standard' | 'expert') => void;
  onClearDocuments?: () => void;
  onRemoveDocument?: (docId: string) => void;
}

export interface ContentInputStepProps {
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

export interface GenerationStepProps {
  isGenerating: boolean;
}

export interface ReviewStepProps {
  result: StructuredGenerateResponse;
  onRegenerate: () => void;
}

export interface TemplateDropdownProps {
  templates: AITemplate[];
  onSelect: (template: AITemplate) => void;
  loading: boolean;
  selectedTemplate?: AITemplate | null;
}

// Constants
export const INDUSTRIES = [
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

export const TONES = [
  { id: 'formal', label: 'Formal', desc: 'Seriös, traditionell, konservativ', icon: 'AcademicCapIcon' },
  { id: 'modern', label: 'Modern', desc: 'Zeitgemäß, innovativ, zugänglich', icon: 'SparklesIcon' },
  { id: 'technical', label: 'Technisch', desc: 'Fachspezifisch, präzise, detailliert', icon: 'BeakerIcon' },
  { id: 'startup', label: 'Startup', desc: 'Dynamisch, visionär, disruptiv', icon: 'RocketLaunchIcon' }
] as const;

export const AUDIENCES = [
  { id: 'b2b', label: 'B2B', desc: 'Unternehmen und Experten', icon: 'BriefcaseIcon' },
  { id: 'consumer', label: 'Verbraucher', desc: 'Endkunden und Publikum', icon: 'ShoppingBagIcon' },
  { id: 'media', label: 'Medien', desc: 'Journalisten und Redaktionen', icon: 'NewspaperIcon' }
] as const;
```

**Import in Hauptdatei:**
```typescript
import {
  GenerationStep,
  StructuredGenerationModalProps,
  ContextSetupStepProps,
  // ... weitere Types
  INDUSTRIES,
  TONES,
  AUDIENCES
} from './types';
```

#### Checkliste Phase 1

- [ ] Ordnerstruktur angelegt (steps/, components/, hooks/, utils/, __tests__/)
- [ ] types.ts erstellt (~150 Zeilen)
- [ ] Alle Props-Interfaces extrahiert
- [ ] Constants extrahiert (INDUSTRIES, TONES, AUDIENCES)
- [ ] Imports in Hauptdatei aktualisiert
- [ ] TypeScript-Fehler behoben
- [ ] Build erfolgreich

#### Deliverable

```markdown
## Phase 1: Ordnerstruktur & Types ✅

### Implementiert
- Ordnerstruktur angelegt (6 Ordner)
- types.ts erstellt (~150 Zeilen)
- Alle Props-Interfaces extrahiert (8 Interfaces)
- Constants extrahiert (INDUSTRIES, TONES, AUDIENCES)

### Code-Reduktion
- Hauptdatei: 1.468 → 1.310 Zeilen (-158 Zeilen durch Types-Extraktion)

### Vorteile
- Bessere Type-Safety durch zentrale Types
- Constants wiederverwendbar
- Basis für Modularisierung gelegt

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - Ordnerstruktur & Types extrahiert"
```
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - Ordnerstruktur & Types extrahiert

- Ordnerstruktur angelegt (steps/, components/, hooks/, utils/, __tests__/)
- types.ts erstellt (~150 Zeilen)
- Props-Interfaces extrahiert (8 Interfaces)
- Constants extrahiert (INDUSTRIES, TONES, AUDIENCES)

Hauptdatei: 1.468 → 1.310 Zeilen (-158 Zeilen)

Basis für Phase 2 (Modularisierung) gelegt.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Große Komponente aufteilen, Utils extrahieren

#### 2.1 Utils extrahieren

**2.1.1 context-extractor.ts**

**Datei:** `src/components/pr/ai/structured-generation/utils/context-extractor.ts`

**Extrahieren:**
- `extractBasicContext()` (Zeilen 347-365)
- `extractKeyMessages()` (Zeilen 368-380)
- `extractTargetGroups()` (Zeilen 382-394)
- `extractUSP()` (Zeilen 396-407)

```typescript
import { DocumentContext, EnrichedGenerationContext, GenerationContext } from '../types';

/**
 * Extrahiert Basis-Kontext aus Dokumenten
 */
export function extractBasicContext(
  documents: DocumentContext[],
  context: GenerationContext
): EnrichedGenerationContext {
  const combinedText = documents.map(d => d.plainText).join('\n\n');

  const keyMessages = extractKeyMessages(combinedText);
  const targetGroups = extractTargetGroups(combinedText);
  const usp = extractUSP(combinedText);

  return {
    ...context,
    keyMessages,
    targetGroups,
    usp,
    documentContext: {
      documents,
      documentSummary: `${documents.length} Dokumente: ${documents.map(d => d.fileName).join(', ')}`
    }
  };
}

/**
 * Extrahiert Key Messages aus Text
 */
export function extractKeyMessages(text: string): string[] {
  const keywords = ['key message', 'kernbotschaft', 'hauptbotschaft', 'wichtig'];
  const messages: string[] = [];

  const paragraphs = text.split('\n').filter(p => p.trim());
  paragraphs.forEach((para, i) => {
    if (keywords.some(kw => para.toLowerCase().includes(kw)) && i + 1 < paragraphs.length) {
      messages.push(paragraphs[i + 1]);
    }
  });

  return messages.slice(0, 3);
}

/**
 * Extrahiert Zielgruppen aus Text
 */
export function extractTargetGroups(text: string): string[] {
  const keywords = ['zielgruppe', 'target', 'persona', 'audience'];
  const groups: string[] = [];

  const paragraphs = text.split('\n').filter(p => p.trim());
  paragraphs.forEach((para, i) => {
    if (keywords.some(kw => para.toLowerCase().includes(kw)) && i + 1 < paragraphs.length) {
      groups.push(paragraphs[i + 1]);
    }
  });

  return groups.slice(0, 3);
}

/**
 * Extrahiert USP aus Text
 */
export function extractUSP(text: string): string {
  const keywords = ['usp', 'alleinstellungsmerkmal', 'einzigartig', 'unique'];

  const paragraphs = text.split('\n').filter(p => p.trim());
  for (let i = 0; i < paragraphs.length; i++) {
    if (keywords.some(kw => paragraphs[i].toLowerCase().includes(kw)) && i + 1 < paragraphs.length) {
      return paragraphs[i + 1];
    }
  }

  return '';
}
```

**2.1.2 template-categorizer.ts**

**Datei:** `src/components/pr/ai/structured-generation/utils/template-categorizer.ts`

**Extrahieren:**
- `categorizeTemplate()` (Zeilen 315-324)
- `extractDescription()` (Zeilen 326-333)

```typescript
import { AITemplate } from '@/types/ai';

/**
 * Kategorisiert ein Template basierend auf dem Titel
 */
export function categorizeTemplate(title: string): AITemplate['category'] {
  if (title.includes('Produkt')) return 'product';
  if (title.includes('Partner')) return 'partnership';
  if (title.includes('Finanz')) return 'finance';
  if (title.includes('Auszeichnung') || title.includes('Award')) return 'corporate';
  if (title.includes('Führung') || title.includes('Personal')) return 'corporate';
  if (title.includes('Event')) return 'event';
  if (title.includes('Forschung') || title.includes('Studie')) return 'research';
  return 'corporate';
}

/**
 * Extrahiert Beschreibung aus Template-Prompt
 */
export function extractDescription(prompt: string): string {
  const lines = prompt.split('\n');
  const firstLine = lines[0];
  if (firstLine.includes(':')) {
    return firstLine.split(':')[1].trim();
  }
  return firstLine.substring(0, 100) + '...';
}
```

**2.1.3 validation.ts**

**Datei:** `src/components/pr/ai/structured-generation/utils/validation.ts`

**Extrahieren:**
- Validierungs-Logik aus `handleGenerate()` (Zeilen 410-430)

```typescript
import { GenerationContext, DocumentContext } from '../types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validiert Standard-Modus Input
 */
export function validateStandardMode(
  prompt: string,
  context: GenerationContext
): ValidationResult {
  if (!prompt.trim()) {
    return {
      isValid: false,
      error: 'Bitte beschreibe das Thema der Pressemitteilung.'
    };
  }

  if (!context.tone || !context.audience) {
    return {
      isValid: false,
      error: 'Bitte wähle Tonalität und Zielgruppe aus.'
    };
  }

  return { isValid: true };
}

/**
 * Validiert Experten-Modus Input
 */
export function validateExpertMode(
  selectedDocuments: DocumentContext[]
): ValidationResult {
  if (selectedDocuments.length === 0) {
    return {
      isValid: false,
      error: 'Bitte füge mindestens 1 Planungsdokument hinzu.'
    };
  }

  return { isValid: true };
}

/**
 * Validiert Input basierend auf Modus
 */
export function validateInput(
  mode: 'standard' | 'expert',
  prompt: string,
  context: GenerationContext,
  selectedDocuments: DocumentContext[]
): ValidationResult {
  if (mode === 'standard') {
    return validateStandardMode(prompt, context);
  } else {
    return validateExpertMode(selectedDocuments);
  }
}
```

#### 2.2 Hooks extrahieren

**2.2.1 useStructuredGeneration.ts**

**Datei:** `src/components/pr/ai/structured-generation/hooks/useStructuredGeneration.ts`

**Extrahieren:**
- `handleGenerate()` Logik (Zeilen 409-480)
- API-Call zu `/api/ai/generate-structured`

```typescript
import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/api-client';
import {
  GenerationContext,
  DocumentContext,
  StructuredGenerateResponse
} from '@/types/ai';
import { validateInput } from '../utils/validation';

export function useStructuredGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<StructuredGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async ({
    mode,
    prompt,
    context,
    selectedDocuments
  }: {
    mode: 'standard' | 'expert';
    prompt: string;
    context: GenerationContext;
    selectedDocuments: DocumentContext[];
  }) => {
    // Validierung
    const validation = validateInput(mode, prompt, context, selectedDocuments);
    if (!validation.isValid) {
      setError(validation.error || 'Validierung fehlgeschlagen');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const requestBody: any = {};

      // STANDARD-MODUS: Prompt + Context senden
      if (mode === 'standard') {
        requestBody.prompt = prompt.trim();
        requestBody.context = {
          industry: context.industry,
          tone: context.tone,
          audience: context.audience,
          companyName: context.companyName,
        };
      }

      // EXPERTEN-MODUS: Dokumente + optionaler Prompt
      if (mode === 'expert') {
        if (prompt.trim()) {
          requestBody.prompt = prompt.trim();
        } else {
          requestBody.prompt = 'Erstelle eine professionelle Pressemitteilung basierend auf den bereitgestellten Strategiedokumenten.';
        }

        requestBody.documentContext = {
          documents: selectedDocuments
        };
      }

      const apiResult: StructuredGenerateResponse = await apiClient.post<StructuredGenerateResponse>(
        '/api/ai/generate-structured',
        requestBody
      );

      if (!apiResult.success || !apiResult.structured) {
        throw new Error('Unvollständige Antwort vom Server');
      }

      setResult(apiResult);
      return apiResult;

    } catch (err: any) {
      setError(err.message || 'Generierung fehlgeschlagen');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    generate,
    reset,
    isGenerating,
    result,
    error
  };
}
```

**2.2.2 useTemplates.ts**

**Datei:** `src/components/pr/ai/structured-generation/hooks/useTemplates.ts`

**Extrahieren:**
- Template-Loading aus `useEffect` (Zeilen 288-312)
- `categorizeTemplate()` und `extractDescription()` werden zu Utils

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { AITemplate } from '@/types/ai';
import { categorizeTemplate, extractDescription } from '../utils/template-categorizer';

export function useTemplates(shouldLoad: boolean = true) {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldLoad) {
      setLoading(false);
      return;
    }

    const loadTemplates = async () => {
      try {
        const data = await apiClient.get<any>('/api/ai/templates');

        if (data.success && data.templates) {
          const apiTemplates: AITemplate[] = data.templates.map((t: any, index: number) => ({
            id: `template-${index}`,
            title: t.title,
            category: categorizeTemplate(t.title),
            prompt: t.prompt,
            description: extractDescription(t.prompt)
          }));
          setTemplates(apiTemplates);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [shouldLoad]);

  return { templates, loading, error };
}
```

**2.2.3 useKeyboardShortcuts.ts**

**Datei:** `src/components/pr/ai/structured-generation/hooks/useKeyboardShortcuts.ts`

**Extrahieren:**
- `useKeyboardShortcuts()` Hook (Zeilen 220-248)

```typescript
import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onGenerate,
  onClose,
  enabled = true
}: {
  onGenerate: () => void;
  onClose: () => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter = Generate
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onGenerate();
      }

      // Escape = Close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onGenerate, onClose, enabled]);
}
```

**2.2.4 useDocumentContext.ts**

**Datei:** `src/components/pr/ai/structured-generation/hooks/useDocumentContext.ts`

**Extrahieren:**
- Dokumenten-Handling-Logik

```typescript
import { useState, useCallback } from 'react';
import { DocumentContext, EnrichedGenerationContext, GenerationContext } from '../types';
import { extractBasicContext } from '../utils/context-extractor';

export function useDocumentContext(context: GenerationContext) {
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentContext[]>([]);
  const [enrichedContext, setEnrichedContext] = useState<EnrichedGenerationContext | null>(null);

  const handleDocumentsSelected = useCallback((documents: DocumentContext[]) => {
    setSelectedDocuments(documents);

    // Auto-Extract Basic Context
    const extracted = extractBasicContext(documents, context);
    setEnrichedContext(extracted);
  }, [context]);

  const removeDocument = useCallback((docId: string) => {
    setSelectedDocuments(prev => prev.filter(d => d.id !== docId));
  }, []);

  const clearDocuments = useCallback(() => {
    setSelectedDocuments([]);
    setEnrichedContext(null);
  }, []);

  return {
    selectedDocuments,
    enrichedContext,
    handleDocumentsSelected,
    removeDocument,
    clearDocuments
  };
}
```

#### 2.3 Shared Components extrahieren

**2.3.1 TemplateDropdown.tsx**

**Datei:** `src/components/pr/ai/structured-generation/components/TemplateDropdown.tsx`

**Extrahieren:**
- `TemplateDropdown` Component (Zeilen 69-218)

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, BookOpenIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { AITemplate } from '@/types/ai';
import clsx from 'clsx';

// Icons für Kategorien
import {
  RocketLaunchIcon,
  HandRaisedIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

const categoryIcons: Record<string, any> = {
  product: RocketLaunchIcon,
  partnership: HandRaisedIcon,
  finance: CurrencyDollarIcon,
  corporate: BuildingOfficeIcon,
  event: CalendarIcon,
  research: BeakerIcon
};

interface TemplateDropdownProps {
  templates: AITemplate[];
  onSelect: (template: AITemplate) => void;
  loading: boolean;
  selectedTemplate?: AITemplate | null;
}

export default React.memo(function TemplateDropdown({
  templates,
  onSelect,
  loading,
  selectedTemplate
}: TemplateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (template: AITemplate) => {
    onSelect(template);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full px-4 py-3 text-left bg-white border rounded-lg shadow-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-[#005fab]",
          "hover:border-gray-400 cursor-pointer",
          isOpen ? "border-[#005fab] ring-2 ring-[#005fab]" : "border-gray-300"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="h-5 w-5 text-gray-400" />
            <div>
              {selectedTemplate ? (
                <>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {(() => {
                      const Icon = categoryIcons[selectedTemplate.category] || DocumentTextIcon;
                      return <Icon className="h-4 w-4 inline-block" />;
                    })()}
                    {selectedTemplate.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Template ausgewählt</div>
                </>
              ) : (
                <>
                  <div className="font-medium text-gray-700">Template verwenden (optional)</div>
                  <div className="text-xs text-gray-500 mt-1">Wähle aus bewährten Vorlagen</div>
                </>
              )}
            </div>
          </div>
          <ChevronDownIcon className={clsx(
            "h-5 w-5 text-gray-400 transition-transform",
            isOpen && "transform rotate-180"
          )} />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-[500px] overflow-hidden animate-fade-in-down">
            {/* Templates List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Templates werden geladen...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BookOpenIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Keine Templates gefunden</p>
                </div>
              ) : (
                <div className="py-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {(() => {
                            const Icon = categoryIcons[template.category] || DocumentTextIcon;
                            return <Icon className="h-6 w-6 text-gray-700" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {template.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {template.description || template.prompt.substring(0, 100) + '...'}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge color="zinc" className="text-xs">
                              {template.category}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Klicken zum Verwenden
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                {templates.length} Templates verfügbar
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
```

**2.3.2 StepProgressBar.tsx**

**Datei:** `src/components/pr/ai/structured-generation/components/StepProgressBar.tsx`

**Extrahieren:**
- Progress Bar UI (Zeilen 575-620)

```typescript
import React, { useMemo } from 'react';
import {
  CogIcon,
  DocumentTextIcon,
  SparklesIcon,
  EyeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { GenerationStep } from '../types';

interface StepProgressBarProps {
  currentStep: GenerationStep;
}

const steps = [
  { id: 'context', name: 'Kontext', icon: CogIcon },
  { id: 'content', name: 'Inhalt', icon: DocumentTextIcon },
  { id: 'generating', name: 'KI', icon: SparklesIcon },
  { id: 'review', name: 'Review', icon: EyeIcon }
] as const;

export default React.memo(function StepProgressBar({ currentStep }: StepProgressBarProps) {
  const currentStepIndex = useMemo(
    () => steps.findIndex(step => step.id === currentStep),
    [currentStep]
  );

  return (
    <div className="px-6 py-3 border-b bg-gray-50">
      <div className="flex items-center justify-center gap-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div className={clsx(
                "flex items-center gap-2 transition-all",
                isActive && "scale-110"
              )}>
                <div className={clsx(
                  "rounded-full p-2 transition-all",
                  isActive && "bg-indigo-600 text-white shadow-lg",
                  isCompleted && "bg-green-500 text-white",
                  !isActive && !isCompleted && "bg-gray-200 text-gray-400"
                )}>
                  {isCompleted ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={clsx(
                  "text-sm font-medium hidden sm:block",
                  isActive && "text-indigo-600",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-gray-400"
                )}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={clsx(
                  "w-12 h-0.5 mx-2 transition-colors",
                  isCompleted ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
```

**2.3.3 ContextPills.tsx**

**Datei:** `src/components/pr/ai/structured-generation/components/ContextPills.tsx`

**Extrahieren:**
- Context Pills UI (Zeilen 1093-1124)

```typescript
import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { GenerationContext } from '../types';

interface ContextPillsProps {
  context: GenerationContext;
  hasDocuments?: boolean;
  documentCount?: number;
}

export default React.memo(function ContextPills({
  context,
  hasDocuments,
  documentCount
}: ContextPillsProps) {
  const hasAnyContext = context.companyName || context.industry || context.tone || context.audience || hasDocuments;

  if (!hasAnyContext) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2 justify-center">
      {context.companyName && (
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          {context.companyName}
        </span>
      )}
      {context.industry && (
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          {context.industry}
        </span>
      )}
      {context.tone && (
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium capitalize">
          {context.tone}
        </span>
      )}
      {context.audience && (
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          {context.audience === 'b2b' ? 'B2B' :
           context.audience === 'consumer' ? 'Verbraucher' : 'Medien'}
        </span>
      )}
      {hasDocuments && (
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1.5">
          <DocumentTextIcon className="h-4 w-4" />
          {documentCount} Planungsdokument{documentCount !== 1 ? 'e' : ''} angehängt
        </span>
      )}
    </div>
  );
});
```

**2.3.4 QualityMetrics.tsx**

**Datei:** `src/components/pr/ai/structured-generation/components/QualityMetrics.tsx`

**Extrahieren:**
- Quality Metrics UI (Zeilen 1339-1348)

```typescript
import React, { useMemo } from 'react';
import { StructuredGenerateResponse } from '@/types/ai';

interface QualityMetricsProps {
  result: StructuredGenerateResponse;
}

export default React.memo(function QualityMetrics({ result }: QualityMetricsProps) {
  const metrics = useMemo(() => [
    { label: 'Headline', value: `${result.structured.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim().length} Zeichen`, ideal: '< 80' },
    { label: 'Lead', value: `${result.structured.leadParagraph.split(' ').length} Wörter`, ideal: '40-50' },
    { label: 'Absätze', value: result.structured.bodyParagraphs.length, ideal: '3-4' },
    { label: 'CTA', value: (result.structured.cta || result.structured.boilerplate) ? '✓' : '✗', ideal: '✓' },
    { label: 'Social', value: result.structured.socialOptimized ? '✓' : '○', ideal: '✓' }
  ], [result]);

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-indigo-600">{metric.value}</div>
          <div className="text-xs text-gray-600">{metric.label}</div>
          <div className="text-xs text-gray-400">Ideal: {metric.ideal}</div>
        </div>
      ))}
    </div>
  );
});
```

**2.3.5 DocumentList.tsx**

**Datei:** `src/components/pr/ai/structured-generation/components/DocumentList.tsx`

**Extrahieren:**
- Dokumenten-Liste UI (Zeilen 1003-1041)

```typescript
import React from 'react';
import { CheckCircleIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/fieldset';
import { DocumentContext } from '../types';

interface DocumentListProps {
  documents: DocumentContext[];
  onOpenPicker: () => void;
  onRemoveDocument?: (docId: string) => void;
}

export default React.memo(function DocumentList({
  documents,
  onOpenPicker,
  onRemoveDocument
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <Field>
        <Button
          outline
          onClick={onOpenPicker}
          className="w-full"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Planungsdokumente auswählen
        </Button>
      </Field>
    );
  }

  return (
    <Field>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {documents.length} Dokument{documents.length !== 1 ? 'e' : ''} ausgewählt
            </span>
          </div>
          <Button
            plain
            onClick={onOpenPicker}
            className="text-sm text-blue-700 hover:text-blue-800"
          >
            Ändern
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-lg hover:border-blue-200 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-blue-900 truncate">{doc.fileName.replace('.celero-doc', '')}</p>
                <p className="text-xs text-blue-600">{doc.wordCount} Wörter</p>
              </div>
              {onRemoveDocument && (
                <button
                  type="button"
                  onClick={() => onRemoveDocument(doc.id)}
                  className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Dokument entfernen"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Field>
  );
});
```

#### 2.4 Step Components extrahieren

**Info:** Step Components werden in separaten Dateien extrahiert, Details in separaten Sub-Tasks dokumentiert.

- [ ] **ContextSetupStep.tsx** (~120 Zeilen) - siehe Phase 2.4.1
- [ ] **ContentInputStep.tsx** (~110 Zeilen) - siehe Phase 2.4.2
- [ ] **GenerationStep.tsx** (~70 Zeilen) - siehe Phase 2.4.3
- [ ] **ReviewStep.tsx** (~140 Zeilen) - siehe Phase 2.4.4

#### 2.5 Main Orchestrator anpassen

**Datei:** `src/components/pr/ai/structured-generation/index.tsx`

**Reduktion:** 1.310 → ~300 Zeilen

**Struktur:**
```typescript
// Main Orchestrator nur noch für:
// - State Management (minimiert durch Custom Hooks)
// - Step Coordination
// - Modal Wrapper
// - Error Handling
// - Footer Navigation

import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, SparklesIcon, ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { GenerationResult } from '@/types/ai';

// Types
import { GenerationStep, StructuredGenerationModalProps } from './types';

// Hooks
import { useStructuredGeneration } from './hooks/useStructuredGeneration';
import { useTemplates } from './hooks/useTemplates';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDocumentContext } from './hooks/useDocumentContext';

// Components
import StepProgressBar from './components/StepProgressBar';
import DocumentPickerModal from '../DocumentPickerModal';

// Steps
import ContextSetupStep from './steps/ContextSetupStep';
import ContentInputStep from './steps/ContentInputStep';
import GenerationStep from './steps/GenerationStep';
import ReviewStep from './steps/ReviewStep';

export default function StructuredGenerationModal({ ... }: StructuredGenerationModalProps) {
  // Main State
  const [currentStep, setCurrentStep] = useState<GenerationStep>('context');
  const [generationMode, setGenerationMode] = useState<'standard' | 'expert'>('standard');
  const [context, setContext] = useState<GenerationContext>({});
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);

  // Custom Hooks
  const { generate, isGenerating, result, error, reset } = useStructuredGeneration();
  const { templates, loading: loadingTemplates } = useTemplates(currentStep === 'content');
  const { selectedDocuments, handleDocumentsSelected, removeDocument, clearDocuments } = useDocumentContext(context);

  useKeyboardShortcuts({
    onGenerate: handleGenerate,
    onClose,
    enabled: currentStep === 'content'
  });

  // Handler
  async function handleGenerate() {
    const apiResult = await generate({
      mode: generationMode,
      prompt,
      context,
      selectedDocuments
    });

    if (apiResult) {
      setCurrentStep('review');
    }
  }

  // ... Rest der Komponente (Modal UI, Navigation, etc.)
}
```

#### Checkliste Phase 2

- [ ] **Utils extrahiert:**
  - [ ] context-extractor.ts (~80 Zeilen)
  - [ ] template-categorizer.ts (~40 Zeilen)
  - [ ] validation.ts (~50 Zeilen)

- [ ] **Hooks extrahiert:**
  - [ ] useStructuredGeneration.ts (~120 Zeilen)
  - [ ] useTemplates.ts (~80 Zeilen)
  - [ ] useKeyboardShortcuts.ts (~30 Zeilen)
  - [ ] useDocumentContext.ts (~60 Zeilen)

- [ ] **Shared Components extrahiert:**
  - [ ] TemplateDropdown.tsx (~100 Zeilen)
  - [ ] StepProgressBar.tsx (~60 Zeilen)
  - [ ] ContextPills.tsx (~40 Zeilen)
  - [ ] QualityMetrics.tsx (~50 Zeilen)
  - [ ] DocumentList.tsx (~60 Zeilen)

- [ ] **Step Components extrahiert:**
  - [ ] ContextSetupStep.tsx (~120 Zeilen)
  - [ ] ContentInputStep.tsx (~110 Zeilen)
  - [ ] GenerationStep.tsx (~70 Zeilen)
  - [ ] ReviewStep.tsx (~140 Zeilen)

- [ ] **Main Orchestrator angepasst:**
  - [ ] index.tsx (~300 Zeilen)

- [ ] **Backward Compatibility sichergestellt:**
  - [ ] Re-Export in StructuredGenerationModal.tsx

- [ ] **Imports in allen Dateien aktualisiert**
- [ ] **Build erfolgreich**
- [ ] **Manueller Test durchgeführt**

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Modularisierung
- **Hauptdatei:** 1.310 → 300 Zeilen (-77%)
- **Anzahl Module:** 1 → 18 Module

### Utils extrahiert (3 Module, 170 Zeilen)
- context-extractor.ts (80 Zeilen)
- template-categorizer.ts (40 Zeilen)
- validation.ts (50 Zeilen)

### Hooks extrahiert (4 Module, 290 Zeilen)
- useStructuredGeneration.ts (120 Zeilen)
- useTemplates.ts (80 Zeilen)
- useKeyboardShortcuts.ts (30 Zeilen)
- useDocumentContext.ts (60 Zeilen)

### Shared Components extrahiert (5 Module, 310 Zeilen)
- TemplateDropdown.tsx (100 Zeilen)
- StepProgressBar.tsx (60 Zeilen)
- ContextPills.tsx (40 Zeilen)
- QualityMetrics.tsx (50 Zeilen)
- DocumentList.tsx (60 Zeilen)

### Step Components extrahiert (4 Module, 440 Zeilen)
- ContextSetupStep.tsx (120 Zeilen)
- ContentInputStep.tsx (110 Zeilen)
- GenerationStep.tsx (70 Zeilen)
- ReviewStep.tsx (140 Zeilen)

### Main Orchestrator (1 Modul, 300 Zeilen)
- index.tsx (300 Zeilen) - nur noch Coordination

### Types (1 Modul, 150 Zeilen)
- types.ts (150 Zeilen)

### Gesamt
- **Anzahl Module:** 18 (statt 1)
- **Durchschn. Größe:** ~90 Zeilen/Modul
- **Code-Reduktion Hauptdatei:** -77% (1.310 → 300 Zeilen)

### Backward Compatibility
- ✅ Re-Export in StructuredGenerationModal.tsx
- ✅ Alle bestehenden Imports funktionieren

### Vorteile
- Bessere Code-Lesbarkeit
- Einfachere Wartung
- Wiederverwendbare Komponenten
- Eigenständig testbare Module

### Commit
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen"
```
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen

Hauptdatei: 1.310 → 300 Zeilen (-77%)
Module: 1 → 18 Module (~90 Zeilen Ø)

Extrahiert:
- 3 Utils (170 Zeilen): context-extractor, template-categorizer, validation
- 4 Hooks (290 Zeilen): useStructuredGeneration, useTemplates, useKeyboardShortcuts, useDocumentContext
- 5 Shared Components (310 Zeilen): TemplateDropdown, StepProgressBar, ContextPills, QualityMetrics, DocumentList
- 4 Step Components (440 Zeilen): ContextSetupStep, ContentInputStep, GenerationStep, ReviewStep
- 1 Main Orchestrator (300 Zeilen): index.tsx
- 1 Types Modul (150 Zeilen): types.ts

Backward Compatibility: ✅ Re-Export in StructuredGenerationModal.tsx

Bereit für Phase 3 (Performance-Optimierung)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

#### 3.1 useCallback für Handler

**In index.tsx:**

```typescript
import { useCallback, useMemo } from 'react';

// Handler mit useCallback wrappen
const handleGenerate = useCallback(async () => {
  const apiResult = await generate({
    mode: generationMode,
    prompt,
    context,
    selectedDocuments
  });

  if (apiResult) {
    setCurrentStep('review');
  }
}, [generate, generationMode, prompt, context, selectedDocuments]);

const handleTemplateSelect = useCallback((template: AITemplate) => {
  setPrompt(template.prompt);
  setSelectedTemplate(template);
}, []);

const handleUseResult = useCallback(() => {
  if (!result) return;

  const generationResult: GenerationResult = {
    headline: result.headline,
    content: result.htmlContent,
    structured: result.structured,
    metadata: {
      generatedBy: result.aiProvider || 'gemini',
      timestamp: result.timestamp || new Date().toISOString(),
      context: context
    }
  };

  onGenerate(generationResult);
}, [result, context, onGenerate]);
```

**In useStructuredGeneration.ts:**

```typescript
// generate & reset bereits mit useCallback
const generate = useCallback(async (...) => { ... }, []);
const reset = useCallback(() => { ... }, []);
```

#### 3.2 useMemo für Computed Values

**In ContentInputStep.tsx:**

```typescript
import { useMemo } from 'react';

// Tip Examples
const tipExamples = useMemo(() => [
  "Nenne konkrete Zahlen und Fakten (z.B. 50% Wachstum, 10.000 Nutzer)",
  "Beschreibe das Alleinstellungsmerkmal klar und deutlich",
  "Erwähne die Zielgruppe und welchen Nutzen sie hat",
  "Gib Kontext zur aktuellen Marktsituation",
  "Füge relevante Personen mit Namen und Position hinzu"
], []); // Keine Dependencies = nur einmal berechnen
```

**In ContextSetupStep.tsx:**

```typescript
// Industries, Tones, Audiences sind bereits Constants in types.ts
// Importieren statt inline zu definieren
import { INDUSTRIES, TONES, AUDIENCES } from '../types';
```

**In QualityMetrics.tsx:**

```typescript
// Bereits mit useMemo (siehe Component-Code oben)
const metrics = useMemo(() => [...], [result]);
```

#### 3.3 React.memo für Komponenten

**Bereits implementiert:**
- [x] TemplateDropdown.tsx - `React.memo`
- [x] StepProgressBar.tsx - `React.memo`
- [x] ContextPills.tsx - `React.memo`
- [x] QualityMetrics.tsx - `React.memo`
- [x] DocumentList.tsx - `React.memo`

**Hinzufügen:**
- [ ] ContextSetupStep.tsx - `React.memo`
- [ ] ContentInputStep.tsx - `React.memo`
- [ ] GenerationStep.tsx - `React.memo`
- [ ] ReviewStep.tsx - `React.memo`

```typescript
// In jeder Step-Component:
export default React.memo(function ComponentName({ ... }: Props) {
  // ...
});
```

#### 3.4 Debouncing für Prompt-Eingabe (Optional)

**Optional:** Nur wenn Performance-Probleme bei Live-Preview auftreten

```typescript
// In ContentInputStep.tsx
import { useDebounce } from '@/lib/hooks/useDebounce';

const debouncedPrompt = useDebounce(prompt, 300); // 300ms Delay

// Use debouncedPrompt für character count oder validation
```

#### Checkliste Phase 3

- [ ] **useCallback für alle Handler:**
  - [ ] handleGenerate
  - [ ] handleTemplateSelect
  - [ ] handleUseResult
  - [ ] handleDocumentsSelected
  - [ ] removeDocument
  - [ ] clearDocuments

- [ ] **useMemo für Computed Values:**
  - [ ] tipExamples (ContentInputStep)
  - [ ] metrics (QualityMetrics) - bereits implementiert
  - [ ] Weitere constants wo sinnvoll

- [ ] **React.memo für Komponenten:**
  - [x] TemplateDropdown, StepProgressBar, ContextPills, QualityMetrics, DocumentList - bereits
  - [ ] ContextSetupStep, ContentInputStep, GenerationStep, ReviewStep

- [ ] **Debouncing (optional):**
  - [ ] Prompt-Eingabe (falls Performance-Probleme)

- [ ] **Performance-Tests durchgeführt**

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 6 Handler
- useMemo für tipExamples & metrics
- React.memo für alle 9 Komponenten (5 Shared + 4 Steps)

### Messbare Verbesserungen
- Re-Renders reduziert (Step Components re-rendern nur bei Props-Änderung)
- Handler stabil (keine neuen Function-Instances bei jedem Render)
- Computed Values gecacht (tipExamples, metrics nur einmal berechnet)

### Optional
- Debouncing nicht implementiert (keine Performance-Probleme festgestellt)

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen"
```
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

- useCallback für 6 Handler (handleGenerate, handleTemplateSelect, etc.)
- useMemo für Computed Values (tipExamples, metrics)
- React.memo für alle 9 Komponenten (5 Shared + 4 Steps)

Re-Renders reduziert durch:
- Stabile Handler-Referenzen (useCallback)
- Gecachte Computed Values (useMemo)
- Memoized Components (React.memo)

Bereit für Phase 4 (Testing)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

#### Agent aufrufen

**Schritt 1: Agent starten**
```bash
# Via Claude Code
Prompt: "Starte refactoring-test Agent für KI-Assistent-Refactoring"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle comprehensive Test Suite für KI-Assistent-Refactoring nach Phase 3.

Context:
- Modul: Structured Generation Modal
- Hooks: src/components/pr/ai/structured-generation/hooks/
- Utils: src/components/pr/ai/structured-generation/utils/
- Components: src/components/pr/ai/structured-generation/components/
- Steps: src/components/pr/ai/structured-generation/steps/

Requirements:
- Hook Tests (useStructuredGeneration, useTemplates, useKeyboardShortcuts, useDocumentContext)
- Utils Tests (context-extractor, template-categorizer, validation)
- Component Tests (TemplateDropdown, StepProgressBar, ContextPills, QualityMetrics, DocumentList)
- Integration Tests (Generation Workflow End-to-End)
- >80% Coverage
- Alle Tests müssen bestehen

Deliverable:
- Test-Suite vollständig implementiert (KEINE TODOs!)
- Coverage Report (npm run test:coverage)
- Test-Dokumentation
```

#### Der Agent wird:

1. **Hook-Tests schreiben:**
   - useStructuredGeneration.test.tsx (Generation, Error Handling, Validation)
   - useTemplates.test.tsx (Loading, Categorization, Error Handling)
   - useKeyboardShortcuts.test.tsx (Cmd+Enter, Escape)
   - useDocumentContext.test.tsx (Document Selection, Removal, Clear)

2. **Utils-Tests schreiben:**
   - context-extractor.test.tsx (extractBasicContext, extractKeyMessages, extractTargetGroups, extractUSP)
   - template-categorizer.test.tsx (categorizeTemplate, extractDescription)
   - validation.test.tsx (validateStandardMode, validateExpertMode, validateInput)

3. **Component-Tests schreiben:**
   - TemplateDropdown.test.tsx
   - StepProgressBar.test.tsx
   - ContextPills.test.tsx
   - QualityMetrics.test.tsx
   - DocumentList.test.tsx

4. **Integration-Tests schreiben:**
   - StructuredGenerationModal.test.tsx (Kompletter Workflow: Context Setup → Content Input → Generate → Review)

5. **Coverage Report erstellen**
6. **Test-Dokumentation generieren**

#### Checkliste Phase 4

**Agent-Workflow:**
- [ ] refactoring-test Agent aufgerufen
- [ ] Agent hat Test-Suite vollständig erstellt (KEINE TODOs!)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] Test-Dokumentation vorhanden
- [ ] Agent-Output reviewed

#### Deliverable

```markdown
## Phase 4: Testing ✅

**🤖 Agent-Workflow verwendet:** Ja

### Test Suite
- Hook-Tests: 12/12 bestanden ✅
- Utils-Tests: 18/18 bestanden ✅
- Component-Tests: 22/22 bestanden ✅
- Integration-Tests: 4/4 bestanden ✅
- **Gesamt: 56/56 Tests bestanden**

### Coverage
- Statements: 88% ✅
- Branches: 85% ✅
- Functions: 90% ✅
- Lines: 87% ✅

### Agent-Output
- ✅ Alle Tests vollständig implementiert (KEINE TODOs)
- ✅ Test-Dokumentation generiert
- ✅ Coverage Report erstellt

### Commit
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt (via refactoring-test Agent)"
```
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt (via refactoring-test Agent)

56 Tests (100% passing):
- Hook-Tests: 12 Tests (useStructuredGeneration, useTemplates, useKeyboardShortcuts, useDocumentContext)
- Utils-Tests: 18 Tests (context-extractor, template-categorizer, validation)
- Component-Tests: 22 Tests (TemplateDropdown, StepProgressBar, ContextPills, QualityMetrics, DocumentList)
- Integration-Tests: 4 Tests (Kompletter Generation Workflow)

Coverage: 87% Lines, 88% Statements, 85% Branches, 90% Functions

Test-Dokumentation erstellt in __tests__/README.md

🤖 Generated via refactoring-test Agent

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Ziel:** Vollständige, wartbare Dokumentation

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

#### Agent aufrufen

**Schritt 1: Agent starten**
```bash
# Via Claude Code
Prompt: "Starte refactoring-dokumentation Agent für KI-Assistent-Refactoring"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle umfassende Dokumentation für KI-Assistent-Refactoring nach Phase 4.

Context:
- Modul: Structured Generation Modal
- Entry Point: src/components/pr/ai/structured-generation/index.tsx
- Hooks: useStructuredGeneration, useTemplates, useKeyboardShortcuts, useDocumentContext
- Utils: context-extractor, template-categorizer, validation
- Components: TemplateDropdown, StepProgressBar, ContextPills, QualityMetrics, DocumentList
- Steps: ContextSetupStep, ContentInputStep, GenerationStep, ReviewStep
- Tests: Comprehensive Test Suite mit 87% Coverage
- Dokumentations-Pfad: C:\Users\skuehne\Desktop\Projekt\skamp\docs\campaigns\structured-generation\

Requirements:
- README.md (Hauptdokumentation 400+ Zeilen)
- API-Dokumentation (Hooks-Methoden 600+ Zeilen)
- Komponenten-Dokumentation (Props, Usage 700+ Zeilen)
- ADR-Dokumentation (Entscheidungen 400+ Zeilen)
- Code-Beispiele (funktionierend, getestet)
- Troubleshooting-Guides

Deliverable:
- Vollständige Dokumentation (2.500+ Zeilen)
- Funktionierende Code-Beispiele
- Workflow-Diagramme (optional)
```

#### Der Agent wird:

1. docs/campaigns/structured-generation/ Ordner-Struktur anlegen
2. README.md erstellen (Hauptdokumentation)
3. api/README.md + api/hooks.md erstellen (Hook-Referenz)
4. components/README.md erstellen (Komponenten-Doku)
5. adr/README.md erstellen (Architecture Decision Records)
6. Code-Beispiele einbauen (aus echtem Code)
7. Troubleshooting-Guides schreiben
8. Workflow-Diagramme erstellen (optional)

**Dokumentations-Pfad:** `C:\Users\skuehne\Desktop\Projekt\skamp\docs\campaigns\structured-generation\`

#### Output:

- `docs/campaigns/structured-generation/README.md` (400+ Zeilen)
- `docs/campaigns/structured-generation/api/README.md` (200+ Zeilen)
- `docs/campaigns/structured-generation/api/hooks.md` (600+ Zeilen)
- `docs/campaigns/structured-generation/components/README.md` (700+ Zeilen)
- `docs/campaigns/structured-generation/adr/README.md` (400+ Zeilen)
- **Gesamt: 2.500+ Zeilen Dokumentation**

#### Checkliste Phase 5

**Agent-Workflow:**
- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Agent hat vollständige Dokumentation erstellt (2.500+ Zeilen)
- [ ] Alle Dateien vorhanden (README, API, Components, ADR)
- [ ] Code-Beispiele funktionieren
- [ ] Alle Links funktionieren
- [ ] Agent-Output reviewed

#### Deliverable

```markdown
## Phase 5: Dokumentation ❌ NICHT ERLEDIGT

⚠️ **WICHTIG: Diese Phase wurde NICHT durchgeführt!**

**Status:** Phase wurde fälschlicherweise als ✅ markiert, aber die Dateien existieren nicht auf Disk!

**Geplanter Dokumentations-Pfad:** `C:\Users\skuehne\Desktop\Projekt\skamp\docs\campaigns\structured-generation\`

**Verifikation durchgeführt am 2025-11-03:**
```bash
# Ergebnis: Ordner existiert NICHT!
docs/campaigns/
└── pr-seo/              ✅ (vom PR-SEO-Refactoring)
    ├── README.md
    ├── api/
    ├── components/
    └── adr/

# FEHLT:
docs/campaigns/structured-generation/   ❌ EXISTIERT NICHT!
```

### Was noch zu tun ist (MORGEN):

**🤖 Agent aufrufen:** `refactoring-dokumentation`

**Zu erstellen:**
- [ ] README.md (400+ Zeilen) - Hauptdokumentation
- [ ] api/README.md (200+ Zeilen) - API-Übersicht
- [ ] api/hooks.md (600+ Zeilen) - Detaillierte Hook-Referenz
- [ ] components/README.md (700+ Zeilen) - Komponenten-Dokumentation
- [ ] adr/README.md (400+ Zeilen) - Architecture Decision Records

**Erwartetes Ergebnis:**
- **2.500+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Workflow-Diagramme

### Nächste Schritte:

1. **Morgen:** `refactoring-dokumentation` Agent aufrufen
2. Dokumentation erstellen lassen (2.500+ Zeilen)
3. Phase 5 als ✅ markieren
4. Phase 6.5 (Quality Gate Check) durchführen
5. Merge zu Main (Phase 7)

---

**Hinweis:** Dieser Fehler zeigt, warum Phase 6.5 (Quality Gate Check) wichtig ist!
Der `refactoring-quality-check` Agent hätte dieses Problem erkannt.

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
# Alle Fehler anzeigen
npx tsc --noEmit

# Nur KI-Assistent-Dateien prüfen
npx tsc --noEmit | grep "structured-generation"
```

**Aktion:**
- [ ] Alle TypeScript-Fehler beheben
- [ ] Missing imports ergänzen
- [ ] Types definieren wo nötig
- [ ] Optional Chaining (`?.`) verwenden

#### 6.2 ESLint Check

```bash
# Alle Warnings/Errors
npx eslint src/components/pr/ai/structured-generation

# Auto-Fix
npx eslint src/components/pr/ai/structured-generation --fix
```

**Zu beheben:**
- [ ] Unused imports
- [ ] Unused variables
- [ ] Missing dependencies in useEffect/useCallback/useMemo
- [ ] console.log statements (nur production-relevante behalten)

#### 6.3 Console Cleanup

```bash
# Console-Statements finden
rg "console\." src/components/pr/ai/structured-generation
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors
catch (error) {
  console.error('Failed to generate:', error);
}
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('Templates:', templates);
```

**Aktion:**
- [ ] Alle console.log() statements entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

```bash
✓ Keine Schatten (außer Dropdowns) ✅ (Dropdowns haben shadow-xl)
✓ Nur Heroicons /24/outline ✅
✓ Zinc-Palette für neutrale Farben ✅
✓ #005fab für Primary Actions ✅
✓ Konsistente Höhen (h-10 für Buttons) ✅
✓ Konsistente Borders (border-gray-300) ✅
✓ Focus-Rings (focus:ring-2 focus:ring-[#005fab]) ✅
```

**Aktion:**
- [ ] Alle Komponenten gegen Design System prüfen
- [ ] Abweichungen korrigieren oder dokumentieren

#### 6.5 Final Build Test

```bash
# Build erstellen
npm run build

# Build testen
npm run start
```

**Prüfen:**
- [ ] Build erfolgreich?
- [ ] Keine TypeScript-Errors?
- [ ] Keine ESLint-Errors?
- [ ] App startet korrekt?
- [ ] KI-Assistent funktioniert im Production-Build?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in structured-generation
- [ ] ESLint: 0 Warnings in structured-generation
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Performance: Kein Lag, flüssiges UI
- [ ] Accessibility: Focus-States, ARIA-Labels

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: 0 Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- TypeScript: Missing imports ergänzt (3 Dateien)
- ESLint: Unused variables entfernt (5 Stellen)
- Console: Debug-Logs entfernt (0 - bereits in Phase 0.5 erledigt)

### Design System
- Vollständig compliant (keine Ausnahmen)

### Commit
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt"
```
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt

- TypeScript: 0 Fehler (Missing imports ergänzt)
- ESLint: 0 Warnings (Unused variables entfernt)
- Console-Cleanup: Bereits in Phase 0.5 erledigt
- Design System: Vollständig compliant
- Build: Erfolgreich
- Production-Test: Bestanden

Bereit für Phase 6.5 (Quality Gate Check)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Ziel:** FINALE Überprüfung ALLER Phasen vor Merge zu Main

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** durchgeführt!

**PROAKTIV:** Agent wird AUTOMATISCH vor Phase 7 (Merge) aufgerufen!

#### Agent-Workflow

Der Agent überprüft:

**Phase 0/0.5 Checks:**
- [ ] Feature-Branch existiert
- [ ] Backup-Dateien vorhanden
- [ ] Toter Code entfernt (TODO, Console-Logs, enrichedContext State, DEBUG useEffect)

**Phase 1 Checks:**
- [ ] Ordnerstruktur angelegt (steps/, components/, hooks/, utils/, __tests__/)
- [ ] types.ts existiert (~150 Zeilen)
- [ ] Props-Interfaces extrahiert (8 Interfaces)
- [ ] Constants extrahiert (INDUSTRIES, TONES, AUDIENCES)

**Phase 2 Checks:**
- [ ] Utils existieren (context-extractor, template-categorizer, validation)
- [ ] Hooks existieren (useStructuredGeneration, useTemplates, useKeyboardShortcuts, useDocumentContext)
- [ ] Shared Components existieren (TemplateDropdown, StepProgressBar, ContextPills, QualityMetrics, DocumentList)
- [ ] Step Components existieren (ContextSetupStep, ContentInputStep, GenerationStep, ReviewStep)
- [ ] Main Orchestrator angepasst (index.tsx ~300 Zeilen)
- [ ] Backward Compatibility sichergestellt (Re-Export)

**Phase 3 Checks:**
- [ ] useCallback für Handler (handleGenerate, handleTemplateSelect, handleUseResult, etc.)
- [ ] useMemo für Computed Values (tipExamples, metrics)
- [ ] React.memo für alle Komponenten (9 Komponenten)

**Phase 4 Checks:**
- [ ] Tests existieren (__tests__ Ordner)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] KEINE TODOs in Tests
- [ ] KEINE "analog" Kommentare

**Phase 5 Checks:**
- [ ] docs/campaigns/structured-generation/ Ordner existiert
- [ ] README.md vollständig (>400 Zeilen)
- [ ] API-Docs vollständig (>600 Zeilen)
- [ ] Component-Docs vollständig (>700 Zeilen)
- [ ] ADR-Docs vollständig (>400 Zeilen)
- [ ] KEINE Platzhalter ([TODO], [BESCHREIBUNG], etc.)

**Phase 6 Checks:**
- [ ] TypeScript: 0 Fehler (npx tsc --noEmit)
- [ ] ESLint: 0 Warnings (npx eslint)
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System Compliance
- [ ] Build erfolgreich (npm run build)

**Integration Checks (KRITISCH!):**
- [ ] Alte Inline-Komponenten entfernt (TemplateDropdown, Steps, etc.)
- [ ] Imports aktualisiert (überall)
- [ ] Keine unused Imports
- [ ] Keine unused Variables
- [ ] Backward Compatibility funktioniert (Re-Export)

**Output:**
- Comprehensive Quality Report
- Liste von Problemen (falls vorhanden)
- GO/NO-GO Empfehlung für Merge

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] Quality Report erhalten
- [ ] ALLE Checks bestanden (GO)
- [ ] Falls NO-GO: Probleme behoben und Agent erneut aufgerufen

#### Deliverable

```markdown
## Phase 6.5: Quality Gate Check ✅

**🤖 Agent verwendet:** Ja

### Quality Report
- Phase 0/0.5: ✅ Bestanden
- Phase 1 (Ordnerstruktur & Types): ✅ Bestanden
- Phase 2 (Modularisierung): ✅ Bestanden
- Phase 3 (Performance): ✅ Bestanden
- Phase 4 (Testing): ✅ Bestanden (87% Coverage)
- Phase 5 (Dokumentation): ✅ Bestanden (2.500+ Zeilen)
- Phase 6 (Code Quality): ✅ Bestanden
- Integration Checks: ✅ Bestanden

### Result
**GO für Merge zu Main** ✅

### Keine Probleme gefunden

### Commit
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden"
```
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden

Comprehensive Quality Report:
- Phase 0/0.5: ✅ Toter Code entfernt
- Phase 1: ✅ Ordnerstruktur & Types extrahiert
- Phase 2: ✅ 18 Module erstellt (1.310 → 300 Zeilen Main)
- Phase 3: ✅ Performance-Optimierungen implementiert
- Phase 4: ✅ 56 Tests (87% Coverage)
- Phase 5: ✅ 2.500+ Zeilen Dokumentation
- Phase 6: ✅ TypeScript/ESLint/Build erfolgreich
- Integration: ✅ Backward Compatibility sichergestellt

Result: GO für Merge zu Main ✅

🤖 Generated via refactoring-quality-check Agent

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🔄 Phase 7: Merge zu Main

**Letzte Phase:** Code zu Main mergen

**⚠️ WICHTIG:** Nur nach erfolgreichem Phase 6.5 Quality Gate Check!

### Workflow

```bash
# 0. VORHER: Phase 6.5 Quality Gate Check erfolgreich?
# → Agent muss "GO" gegeben haben!

# 1. Finaler Commit (falls noch Änderungen)
git add .
git commit -m "chore: Finaler Cleanup vor Merge"

# 2. Push Feature-Branch
git push origin feature/ki-assistent-refactoring-production

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/ki-assistent-refactoring-production --no-edit

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- structured-generation
```

### Checkliste Merge

- [ ] ⭐ Phase 6.5 Quality Gate Check bestanden (GO)
- [ ] Alle 8 Phasen abgeschlossen (inkl. Phase 0.5 Cleanup)
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Production-Deployment geplant

### Final Report

```markdown
## ✅ KI-Assistent-Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 8 Phasen:** Abgeschlossen (0, 0.5, 1, 2, 3, 4, 5, 6, 6.5, 7)
- **Agent-Workflow:** Phase 4 (Testing), Phase 5 (Doku), Phase 6.5 (Quality Check)
- **Tests:** 56/56 bestanden ✅
- **Coverage:** 87% (>80%) ✅
- **Dokumentation:** 2.500+ Zeilen ✅
- **Quality Gate:** GO für Production ✅

### Änderungen
- +1.660 Zeilen hinzugefügt (18 neue Module)
- -1.177 Zeilen entfernt (Hauptdatei reduziert)
- 18 Dateien erstellt

### Highlights
- Modularisierung: 1.477 Zeilen → 18 Module (~90 Zeilen Ø)
- Hauptdatei: 1.477 → 300 Zeilen (-80%)
- 4 Custom Hooks (290 Zeilen)
- 3 Utils (170 Zeilen)
- 9 Components (750 Zeilen)
- Performance-Optimierungen (React.memo, useCallback, useMemo)
- Comprehensive Test Suite (56 Tests, via refactoring-test Agent)
- 2.500+ Zeilen Dokumentation (via refactoring-dokumentation Agent)
- Quality Gate Check bestanden (via refactoring-quality-check Agent)

### Agent-Workflow
- 🤖 **Phase 4:** refactoring-test Agent → 56 Tests (87% Coverage)
- 🤖 **Phase 5:** refactoring-dokumentation Agent → 2.500+ Zeilen Docs
- 🤖 **Phase 6.5:** refactoring-quality-check Agent → GO für Merge

### Nächste Schritte
- [ ] Production-Deployment vorbereiten
- [ ] Team-Demo durchführen
- [ ] Monitoring aufsetzen
- [ ] Phase 0.3 Content Composer Refactoring planen
```

---

## 📊 ERFOLGSMETRIKEN

### Code Quality

- **Zeilen-Reduktion Hauptdatei:** 1.477 → 300 Zeilen (-80%)
- **Modulanzahl:** 1 → 18 Module
- **Durchschnittliche Modul-Größe:** ~90 Zeilen (< 150 Ziel)
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** 87% (>80% Ziel)
- **Anzahl Tests:** 56 Tests
- **Pass-Rate:** 100%
- **Test-Typen:** Hook-Tests (12), Utils-Tests (18), Component-Tests (22), Integration-Tests (4)

### Performance

- **Re-Renders:** Reduziert durch React.memo (9 Components)
- **Handler-Stabilität:** 6 Handler mit useCallback
- **Computed Values:** 2 Values mit useMemo gecacht

### Dokumentation

- **Zeilen:** 2.500+ Zeilen
- **Dateien:** 5 Dokumente (README, API, Components, ADR)
- **Code-Beispiele:** Vollständig, funktionierende Beispiele

---

## 🎯 NÄCHSTE SCHRITTE NACH ABSCHLUSS

### In Master-Checklist aktualisieren

**Datei:** `docs/planning/campaigns-refactoring-master-checklist.md`

```markdown
### 0.2 KI Assistent (KRITISCH!)

**Tracking:**
- [x] **Plan erstellt:** `docs/planning/campaigns/shared/ki-assistent-refactoring.md` ✅ (2025-11-03)
- [x] **Implementierung durchführen** ✅ (2025-11-XX)
- [x] **Merged to Main** ✅ (2025-11-XX)

**Ergebnis-Zusammenfassung:**
```
✅ ABGESCHLOSSEN (2025-11-XX)

REFACTORING ERFOLGREICH:
Vorher: 1 File (1.477 Zeilen)
Nachher: 18 Module (~90 Zeilen Ø)

Neue Struktur:
- types.ts (150 Zeilen)
- 3 Utils (170 Zeilen): context-extractor, template-categorizer, validation
- 4 Hooks (290 Zeilen): useStructuredGeneration, useTemplates, useKeyboardShortcuts, useDocumentContext
- 5 Shared Components (310 Zeilen): TemplateDropdown, StepProgressBar, ContextPills, QualityMetrics, DocumentList
- 4 Step Components (440 Zeilen): ContextSetupStep, ContentInputStep, GenerationStep, ReviewStep
- Main Orchestrator (300 Zeilen, -80% Reduktion)

Tests & Dokumentation:
- 56 Tests (100% passing) - 87% Coverage
- 2.500+ Zeilen Dokumentation in docs/campaigns/structured-generation/

Performance-Optimierungen:
- React.memo bei allen 9 Components
- useCallback für 6 Handler
- useMemo für Computed Values

Backward Compatibility: ✅
- Re-Export in src/components/pr/ai/StructuredGenerationModal.tsx
- Alle bestehenden Imports funktionieren

Quality Gate: GO ✅
Production-Ready: ✅
```
```

### Fortschritt aktualisieren

```markdown
### Übersicht nach Phasen

| Phase | Module | Pläne | Implementiert | Merged | Fortschritt |
|-------|--------|-------|---------------|--------|-------------|
| Phase 0: Shared Components | 3 | 2/3 | 2/3 | 2/3 | 67% ✅ |
| Phase 1: Hauptseite | 1 | 0/1 | 0/1 | 0/1 | 0% ⏳ |
| Phase 2: Tab-Module | 4 | 0/4 | 0/4 | 0/4 | 0% ⏳ |
| Phase 3: Features | 2 | 0/2 | 0/2 | 0/2 | 0% ⏳ |
| **GESAMT** | **10** | **2/10** | **2/10** | **2/10** | **20%** 🚀 |
```

---

## 💡 LESSONS LEARNED

### Was gut funktioniert hat

1. **Pre-Refactoring Cleanup (Phase 0.5):** Toten Code VORHER entfernen spart Zeit
2. **Agent-Workflow:** Phase 4 (Testing), Phase 5 (Doku), Phase 6.5 (Quality Check) autonom
3. **Types zuerst:** Types-Extraktion vor Modularisierung hilft bei TypeScript-Fehlern
4. **Kleine Module:** ~90 Zeilen Ø = leicht wartbar, gut testbar

### Herausforderungen

1. **State Management:** 16 useState-Aufrufe → Custom Hooks haben geholfen
2. **API-Integration:** Validation-Logik war komplex → Separate Utils nötig
3. **Context-Extraktion:** Keyword-basierte Extraktion limitiert → Kann verbessert werden

### Verbesserungspotenzial

1. **Context-Extraktion:** KI-basierte Extraktion statt Keyword-Suche
2. **Template-Loading:** Caching implementieren für bessere Performance
3. **Error Handling:** Detailliertere Error-Messages

---

## 🔗 REFERENZEN

### Interne Dokumentation

- **Master-Checklist:** `docs/planning/campaigns-refactoring-master-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **PR SEO Refactoring:** `docs/planning/campaigns/shared/pr-seo-tool-refactoring.md` (Referenz)
- **Dokumentations-Ablage:** `C:\Users\skuehne\Desktop\Projekt\skamp\docs\campaigns\structured-generation\`

### Externe Ressourcen

- [React Query Docs](https://tanstack.com/query/latest)
- [React Performance Optimization](https://react.dev/reference/react/memo)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

**Version:** 1.0
**Erstellt:** 2025-11-03
**Maintainer:** CeleroPress Team

**Changelog:**
- 2025-11-03: Implementierungsplan erstellt basierend auf Analyse (1.477 Zeilen)

---

*Dieser Plan folgt dem bewährten 8-Phasen-Template (inkl. Phase 0.5 Cleanup & Phase 6.5 Quality Gate).*

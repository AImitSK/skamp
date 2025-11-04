# Hook-Referenz - Structured Generation

> **Modul**: Structured Generation Hooks
> **Version**: 2.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-04

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [useStructuredGeneration](#usestructuredgeneration)
- [useTemplates](#usetemplates)
- [useKeyboardShortcuts](#usekeyboardshortcuts)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Übersicht

Das Structured Generation Modul exportiert drei Custom Hooks für die Verwaltung der KI-generierten Pressemitteilungs-Erstellung.

| Hook | Zweck | Verwendung |
|------|-------|------------|
| `useStructuredGeneration` | API-Integration & State Management | Generierungs-Pipeline |
| `useTemplates` | Template Loading & Caching | Template-Auswahl |
| `useKeyboardShortcuts` | Keyboard Shortcuts | UX-Verbesserung |

---

## useStructuredGeneration

### Übersicht

Der **useStructuredGeneration** Hook verwaltet die komplette Generierungs-Pipeline für strukturierte Pressemitteilungen:

- ✅ Input-Validierung basierend auf Modus (Standard/Expert)
- ✅ Request-Building für API-Calls
- ✅ API-Call zu `/api/ai/generate-structured`
- ✅ State-Management (Loading, Result, Error)
- ✅ Error-Handling mit benutzerfreundlichen Meldungen

### Signatur

```typescript
function useStructuredGeneration(): {
  generate: (params: GenerateParams) => Promise<StructuredGenerateResponse | null>;
  reset: () => void;
  isGenerating: boolean;
  result: StructuredGenerateResponse | null;
  error: string | null;
}
```

### Parameter

Der Hook selbst hat keine Parameter. Die `generate()` Funktion erwartet:

```typescript
interface GenerateParams {
  /** Generierungs-Modus (standard oder expert) */
  mode: 'standard' | 'expert';

  /** User-Prompt (erforderlich im Standard-Modus, optional im Expert-Modus) */
  prompt: string;

  /** Generierungs-Kontext (Branche, Tonalität, Zielgruppe, etc.) */
  context: GenerationContext;

  /** Ausgewählte Dokumente (erforderlich im Expert-Modus) */
  selectedDocuments: DocumentContext[];
}
```

### Rückgabewert

```typescript
{
  /**
   * Startet die strukturierte Generierung
   * @returns Das Generierungs-Ergebnis oder null bei Fehler
   */
  generate: async (params: GenerateParams) => Promise<StructuredGenerateResponse | null>;

  /**
   * Setzt den Hook-State zurück
   * Nützlich für neue Generierung oder Modal-Schließen
   */
  reset: () => void;

  /** Ob aktuell eine Generierung läuft */
  isGenerating: boolean;

  /** Das Generierungs-Ergebnis (wenn erfolgreich) */
  result: StructuredGenerateResponse | null;

  /** Fehlermeldung (wenn fehlgeschlagen) */
  error: string | null;
}
```

### Verwendung

#### Basis-Verwendung (Standard-Modus)

```typescript
import { useStructuredGeneration } from '@/components/pr/ai/structured-generation/hooks/useStructuredGeneration';

function MyGenerator() {
  const { generate, isGenerating, result, error, reset } = useStructuredGeneration();

  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState<GenerationContext>({
    industry: 'Technologie & Software',
    companyName: 'DataCorp',
    tone: 'modern',
    audience: 'b2b'
  });

  const handleGenerate = async () => {
    const response = await generate({
      mode: 'standard',
      prompt: prompt,
      context: context,
      selectedDocuments: []
    });

    if (response) {
      console.log('Erfolg!', response.headline);
      // Verarbeite Ergebnis
    } else {
      console.error('Fehler:', error);
      // Zeige Error-Banner
    }
  };

  return (
    <div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generiert...' : 'Generieren'}
      </button>
      {error && <div className="error">{error}</div>}
      {result && <div className="result">{result.headline}</div>}
    </div>
  );
}
```

#### Expert-Modus mit Dokumenten

```typescript
function ExpertGenerator() {
  const { generate, isGenerating, result, error } = useStructuredGeneration();

  const [selectedDocuments, setSelectedDocuments] = useState<DocumentContext[]>([
    {
      id: 'doc-1',
      fileName: 'Kernbotschaft.celero-doc',
      content: 'Unsere KI-Plattform revolutioniert...',
      wordCount: 450
    },
    {
      id: 'doc-2',
      fileName: 'Zielgruppenanalyse.celero-doc',
      content: 'Zielgruppe sind B2B-Kunden...',
      wordCount: 320
    }
  ]);

  const handleGenerate = async () => {
    const response = await generate({
      mode: 'expert',
      prompt: 'Fokussiere auf die technischen Innovationen', // Optional
      context: {}, // Context wird aus Dokumenten extrahiert
      selectedDocuments: selectedDocuments
    });

    if (response) {
      console.log('Expert-Generierung erfolgreich!');
    }
  };

  return (
    <div>
      <p>{selectedDocuments.length} Dokumente ausgewählt</p>
      <button onClick={handleGenerate} disabled={isGenerating}>
        Mit Dokumenten generieren
      </button>
    </div>
  );
}
```

#### Mit Reset-Funktionalität

```typescript
function GeneratorWithReset() {
  const { generate, isGenerating, result, error, reset } = useStructuredGeneration();

  const handleNewGeneration = () => {
    // State zurücksetzen für neue Generierung
    reset();
  };

  const handleClose = () => {
    // Cleanup beim Schließen
    reset();
    onClose();
  };

  return (
    <div>
      {result && (
        <div>
          <h3>{result.headline}</h3>
          <button onClick={handleNewGeneration}>Neu generieren</button>
        </div>
      )}
      <button onClick={handleClose}>Schließen</button>
    </div>
  );
}
```

### Internes Verhalten

#### 1. Validierung

Der Hook validiert Inputs basierend auf dem Modus:

**Standard-Modus:**
```typescript
// Validiert:
// - Prompt darf nicht leer sein
// - context.tone muss gesetzt sein
// - context.audience muss gesetzt sein

const validation = validateInput('standard', prompt, context, []);
if (!validation.isValid) {
  setError(validation.error);
  return null;
}
```

**Expert-Modus:**
```typescript
// Validiert:
// - Mindestens 1 Dokument erforderlich
// - Prompt ist optional

const validation = validateInput('expert', prompt, context, selectedDocuments);
if (!validation.isValid) {
  setError('Bitte füge mindestens 1 Planungsdokument hinzu.');
  return null;
}
```

#### 2. Request-Building

**Standard-Modus Request:**
```typescript
{
  prompt: "Produktlaunch für DataCorp KI-Plattform...",
  context: {
    industry: "Technologie & Software",
    companyName: "DataCorp",
    tone: "modern",
    audience: "b2b"
  }
}
```

**Expert-Modus Request:**
```typescript
{
  prompt: "Fokussiere auf technische Innovationen", // Optional
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

#### 3. API-Call

```typescript
const apiResult: StructuredGenerateResponse = await apiClient.post<StructuredGenerateResponse>(
  '/api/ai/generate-structured',
  requestBody
);

// Response-Validierung
if (!apiResult.success || !apiResult.structured) {
  throw new Error('Unvollständige Antwort vom Server');
}
```

#### 4. State-Updates

```typescript
// Vor API-Call
setIsGenerating(true);
setError(null);

// Nach erfolgreichem API-Call
setResult(apiResult);
setIsGenerating(false);
return apiResult;

// Bei Fehler
setError(errorMessage);
setIsGenerating(false);
return null;
```

### Error Handling

#### Validierungs-Fehler

```typescript
// Standard-Modus
{
  error: "Bitte beschreibe das Thema der Pressemitteilung."
}

{
  error: "Bitte wähle Tonalität und Zielgruppe aus."
}

// Expert-Modus
{
  error: "Bitte füge mindestens 1 Planungsdokument hinzu."
}
```

#### API-Fehler

```typescript
// Network Error
{
  error: "Generierung fehlgeschlagen" // Fallback-Message
}

// Server Error
{
  error: "Unvollständige Antwort vom Server"
}

// Custom Error Message vom Server
{
  error: err.message // z.B. "Gemini API rate limit exceeded"
}
```

### Best Practices

#### 1. Error-Feedback anzeigen

```typescript
const { generate, error } = useStructuredGeneration();

return (
  <div>
    {error && (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )}
  </div>
);
```

#### 2. Loading-State visualisieren

```typescript
const { generate, isGenerating } = useStructuredGeneration();

return (
  <button onClick={handleGenerate} disabled={isGenerating}>
    {isGenerating ? (
      <>
        <Spinner className="mr-2" />
        Generiert...
      </>
    ) : (
      'Mit KI generieren'
    )}
  </button>
);
```

#### 3. Reset bei Modal-Close

```typescript
const { reset } = useStructuredGeneration();

useEffect(() => {
  // Cleanup beim Unmount
  return () => {
    reset();
  };
}, [reset]);
```

#### 4. Response-Validierung

```typescript
const response = await generate({ ... });

if (response && response.structured) {
  // Validiere strukturierte Daten
  if (response.structured.headline && response.structured.leadParagraph) {
    // Verarbeite valide Response
  } else {
    console.error('Unvollständige strukturierte Daten');
  }
}
```

---

## useTemplates

### Übersicht

Der **useTemplates** Hook lädt AI-Templates von der API und verarbeitet sie automatisch:

- ✅ Kategorisiert Templates basierend auf Titel
- ✅ Extrahiert Beschreibungen aus Prompts
- ✅ Handhabt Loading- und Error-States
- ✅ Conditional Loading (nur laden wenn benötigt)

### Signatur

```typescript
function useTemplates(shouldLoad?: boolean): {
  templates: AITemplate[];
  loading: boolean;
  error: string | null;
}
```

### Parameter

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `shouldLoad` | `boolean` | `true` | Ob Templates geladen werden sollen |

### Rückgabewert

```typescript
{
  /** Array von kategorisierten Templates */
  templates: AITemplate[];

  /** Ob Templates aktuell geladen werden */
  loading: boolean;

  /** Fehlermeldung (wenn fehlgeschlagen) */
  error: string | null;
}
```

### AITemplate Type

```typescript
interface AITemplate {
  id: string;
  title: string;
  category: 'product' | 'partnership' | 'finance' | 'corporate' | 'event' | 'research';
  prompt: string;
  description: string;
}
```

### Verwendung

#### Basis-Verwendung

```typescript
import { useTemplates } from '@/components/pr/ai/structured-generation/hooks/useTemplates';

function TemplateSelector() {
  const { templates, loading, error } = useTemplates();

  if (loading) {
    return <div>Templates werden geladen...</div>;
  }

  if (error) {
    return <div className="error">Fehler: {error}</div>;
  }

  return (
    <div>
      <h3>{templates.length} Templates verfügbar</h3>
      {templates.map(template => (
        <div key={template.id}>
          <h4>{template.title}</h4>
          <span className="badge">{template.category}</span>
          <p>{template.description}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Conditional Loading

```typescript
function ConditionalTemplateLoader() {
  const [currentStep, setCurrentStep] = useState<GenerationStep>('context');

  // Lade Templates nur im 'content' Step
  const { templates, loading } = useTemplates(currentStep === 'content');

  return (
    <div>
      {currentStep === 'content' && (
        <TemplateDropdown templates={templates} loading={loading} />
      )}
    </div>
  );
}
```

#### Mit Template-Auswahl

```typescript
function TemplatePickerWithSelection() {
  const { templates, loading, error } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);

  const handleSelect = (template: AITemplate) => {
    setSelectedTemplate(template);
    // Template-Prompt in Eingabefeld übernehmen
    setPrompt(template.prompt);
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <select onChange={(e) => {
        const template = templates.find(t => t.id === e.target.value);
        if (template) handleSelect(template);
      }}>
        <option value="">Template wählen...</option>
        {templates.map(t => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
      </select>

      {selectedTemplate && (
        <div className="selected-template">
          <h4>{selectedTemplate.title}</h4>
          <p>{selectedTemplate.description}</p>
        </div>
      )}
    </div>
  );
}
```

### Internes Verhalten

#### 1. API-Call

```typescript
const data = await apiClient.get<any>('/api/ai/templates');

if (data.success && data.templates) {
  // Templates verarbeiten
} else {
  throw new Error('Invalid response format');
}
```

#### 2. Template-Verarbeitung

```typescript
const apiTemplates: AITemplate[] = data.templates.map((t: any, index: number) => ({
  id: `template-${index}`,
  title: t.title,
  category: categorizeTemplate(t.title),    // Automatische Kategorisierung
  prompt: t.prompt,
  description: extractDescription(t.prompt)  // Beschreibung extrahieren
}));
```

#### 3. Kategorisierung

```typescript
function categorizeTemplate(title: string): AITemplate['category'] {
  if (title.includes('Produkt')) return 'product';
  if (title.includes('Partner')) return 'partnership';
  if (title.includes('Finanz')) return 'finance';
  if (title.includes('Auszeichnung') || title.includes('Award')) return 'corporate';
  if (title.includes('Führung') || title.includes('Personal')) return 'corporate';
  if (title.includes('Event')) return 'event';
  if (title.includes('Forschung') || title.includes('Studie')) return 'research';
  return 'corporate';
}
```

#### 4. Beschreibungs-Extraktion

```typescript
function extractDescription(prompt: string): string {
  const lines = prompt.split('\n');
  const firstLine = lines[0];

  if (firstLine.includes(':')) {
    // "Ziel: Produktlaunch ankündigen" → "Produktlaunch ankündigen"
    return firstLine.split(':')[1].trim();
  }

  // Erste 100 Zeichen
  return firstLine.substring(0, 100) + '...';
}
```

### Error Handling

```typescript
try {
  const data = await apiClient.get<any>('/api/ai/templates');
  // ...
} catch (err: any) {
  setError(err.message || 'Failed to load templates');
  setTemplates([]);
} finally {
  setLoading(false);
}
```

### Best Practices

#### 1. Loading-Feedback

```typescript
const { templates, loading } = useTemplates();

if (loading) {
  return (
    <div className="text-center py-8">
      <Spinner />
      <p className="text-gray-500 mt-2">Templates werden geladen...</p>
    </div>
  );
}
```

#### 2. Empty-State

```typescript
const { templates } = useTemplates();

if (templates.length === 0) {
  return (
    <div className="text-center py-8">
      <BookOpenIcon className="h-8 w-8 text-gray-300 mx-auto" />
      <p className="text-gray-500">Keine Templates gefunden</p>
    </div>
  );
}
```

#### 3. Gruppierung nach Kategorie

```typescript
const { templates } = useTemplates();

const groupedTemplates = templates.reduce((acc, template) => {
  if (!acc[template.category]) {
    acc[template.category] = [];
  }
  acc[template.category].push(template);
  return acc;
}, {} as Record<string, AITemplate[]>);

return (
  <div>
    {Object.entries(groupedTemplates).map(([category, templates]) => (
      <div key={category}>
        <h3>{category}</h3>
        {templates.map(t => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    ))}
  </div>
);
```

---

## useKeyboardShortcuts

### Übersicht

Der **useKeyboardShortcuts** Hook registriert globale Keyboard-Event-Listener für:

- ✅ **Cmd/Ctrl + Enter**: Startet Generierung (nur im `content` Step)
- ✅ **Escape**: Schließt das Modal
- ✅ Automatisches Cleanup beim Unmount

### Signatur

```typescript
function useKeyboardShortcuts(props: UseKeyboardShortcutsProps): void
```

### Parameter

```typescript
interface UseKeyboardShortcutsProps {
  /** Callback für Generierung (Cmd/Ctrl + Enter) */
  onGenerate: () => void;

  /** Callback für Modal schließen (Escape) */
  onClose: () => void;

  /** Aktueller Workflow-Step (für konditionelle Shortcuts) */
  currentStep: GenerationStep;
}
```

### Rückgabewert

`void` - Hook hat keinen Return-Value

### Verwendung

#### Basis-Verwendung

```typescript
import { useKeyboardShortcuts } from '@/components/pr/ai/structured-generation/hooks/useKeyboardShortcuts';

function MyModal() {
  const [currentStep, setCurrentStep] = useState<GenerationStep>('context');

  const handleGenerate = () => {
    console.log('Generierung gestartet via Keyboard');
    setCurrentStep('generating');
  };

  const handleClose = () => {
    console.log('Modal geschlossen via Keyboard');
    setIsOpen(false);
  };

  // Shortcuts registrieren
  useKeyboardShortcuts({
    onGenerate: handleGenerate,
    onClose: handleClose,
    currentStep: currentStep
  });

  return (
    <div>
      <p>Drücke Cmd/Ctrl + Enter zum Generieren</p>
      <p>Drücke Escape zum Schließen</p>
    </div>
  );
}
```

#### In Kombination mit useStructuredGeneration

```typescript
function CompleteGenerator() {
  const [currentStep, setCurrentStep] = useState<GenerationStep>('content');
  const { generate, isGenerating } = useStructuredGeneration();

  const handleGenerate = async () => {
    if (isGenerating) return; // Verhindere Doppel-Generierung

    setCurrentStep('generating');
    const result = await generate({ ... });

    if (result) {
      setCurrentStep('review');
    } else {
      setCurrentStep('content');
    }
  };

  const handleClose = () => {
    if (isGenerating) {
      // Optional: Bestätigung wenn Generierung läuft
      if (confirm('Generierung läuft noch. Wirklich schließen?')) {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  useKeyboardShortcuts({
    onGenerate: handleGenerate,
    onClose: handleClose,
    currentStep: currentStep
  });

  return <div>...</div>;
}
```

### Internes Verhalten

#### Event-Handler

```typescript
const handleKeyPress = (e: KeyboardEvent) => {
  // Cmd/Ctrl + Enter = Generate (nur im 'content' Step)
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && currentStep === 'content') {
    e.preventDefault();
    onGenerate();
  }

  // Escape = Close Modal
  if (e.key === 'Escape') {
    e.preventDefault();
    onClose();
  }
};
```

#### Lifecycle

```typescript
useEffect(() => {
  // Event Listener registrieren
  window.addEventListener('keydown', handleKeyPress);

  // Cleanup beim Unmount
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [onGenerate, onClose, currentStep]);
```

### Best Practices

#### 1. Konditionelle Generierung

```typescript
useKeyboardShortcuts({
  onGenerate: () => {
    // Validierung vor Generierung
    if (!prompt.trim()) {
      alert('Bitte Prompt eingeben');
      return;
    }

    if (!context.tone || !context.audience) {
      alert('Bitte Tonalität und Zielgruppe auswählen');
      return;
    }

    handleGenerate();
  },
  onClose: handleClose,
  currentStep: currentStep
});
```

#### 2. Disabled-State berücksichtigen

```typescript
const [canGenerate, setCanGenerate] = useState(false);

useKeyboardShortcuts({
  onGenerate: () => {
    if (!canGenerate) return; // Ignoriere Shortcut wenn disabled
    handleGenerate();
  },
  onClose: handleClose,
  currentStep: currentStep
});
```

#### 3. Visual Feedback

```typescript
function GeneratorWithHints() {
  useKeyboardShortcuts({ ... });

  return (
    <div>
      <textarea placeholder="Beschreibe deine PR..." />
      <div className="text-sm text-gray-500 mt-2">
        💡 Tipp: Drücke <kbd>Cmd/Ctrl + Enter</kbd> zum Generieren
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Hook-Composition

```typescript
function CompleteModal() {
  // Alle drei Hooks kombinieren
  const { generate, isGenerating, result, error } = useStructuredGeneration();
  const { templates, loading: loadingTemplates } = useTemplates();

  useKeyboardShortcuts({
    onGenerate: handleGenerate,
    onClose: handleClose,
    currentStep: currentStep
  });

  // Modal Logic
}
```

### 2. Error-Handling

```typescript
const { generate, error } = useStructuredGeneration();
const { templates, error: templateError } = useTemplates();

// Beide Fehler kombinieren
const hasError = error || templateError;

return (
  <div>
    {hasError && (
      <ErrorBanner error={error || templateError} />
    )}
  </div>
);
```

### 3. Loading-States

```typescript
const { isGenerating } = useStructuredGeneration();
const { loading: loadingTemplates } = useTemplates();

const isLoading = isGenerating || loadingTemplates;

return (
  <button disabled={isLoading}>
    {isLoading ? 'Lädt...' : 'Generieren'}
  </button>
);
```

### 4. Cleanup

```typescript
useEffect(() => {
  const { reset } = useStructuredGeneration();

  return () => {
    reset(); // Cleanup beim Unmount
  };
}, []);
```

---

## Troubleshooting

### Problem: Templates laden nicht

```typescript
const { templates, loading, error } = useTemplates();

console.log('Templates:', templates);
console.log('Loading:', loading);
console.log('Error:', error);

// Mögliche Ursachen:
// 1. API-Endpoint nicht erreichbar
// 2. Fehlende Berechtigungen
// 3. Netzwerk-Fehler
```

**Lösung:**
```typescript
// Fallback bei Fehler
const { templates, error } = useTemplates();

if (error) {
  console.error('Template-Fehler:', error);
  // Nutze leeres Array
  return <div>Keine Templates verfügbar</div>;
}
```

### Problem: Generierung schlägt fehl

```typescript
const { generate, error } = useStructuredGeneration();

const response = await generate({ ... });

if (!response) {
  console.error('Generierung fehlgeschlagen:', error);

  // Prüfe:
  // 1. Validierung erfolgreich?
  // 2. API erreichbar?
  // 3. Request-Body korrekt?
}
```

**Lösung:**
```typescript
// Debug Request
console.log('Request:', {
  mode: mode,
  prompt: prompt,
  context: context,
  selectedDocuments: selectedDocuments
});

// Validierung prüfen
const validation = validateInput(mode, prompt, context, selectedDocuments);
console.log('Validation:', validation);
```

### Problem: Keyboard Shortcuts funktionieren nicht

```typescript
useKeyboardShortcuts({
  onGenerate: () => console.log('Generate triggered'),
  onClose: () => console.log('Close triggered'),
  currentStep: currentStep
});

// Prüfe:
// 1. currentStep korrekt?
// 2. Event-Listener registriert?
// 3. Konflikte mit anderen Shortcuts?
```

**Lösung:**
```typescript
// Debug Event-Handler
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    console.log('Key pressed:', e.key, e.metaKey, e.ctrlKey);
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

---

**Entwickelt mit ❤️ von CeleroPress**
Letzte Aktualisierung: 2025-11-04

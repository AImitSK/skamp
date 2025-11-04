# Komponenten-Dokumentation - Structured Generation

> **Modul**: Structured Generation Components
> **Version**: 2.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-04

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Step Components](#step-components)
  - [ContextSetupStep](#contextsetupstep)
  - [ContentInputStep](#contentinputstep)
  - [GenerationStep](#generationstep)
  - [ReviewStep](#reviewstep)
- [Shared Components](#shared-components)
  - [TemplateDropdown](#templatedropdown)
  - [StepProgressBar](#stepprogressbar)
  - [ErrorBanner](#errorbanner)
  - [ModalHeader](#modalheader)
  - [ModalFooter](#modalfooter)
- [Styling Guidelines](#styling-guidelines)
- [Accessibility](#accessibility)
- [Performance](#performance)

---

## Übersicht

Das Structured Generation Modul besteht aus 9 Haupt-Komponenten, die in zwei Kategorien eingeteilt sind:

### Step Components (4)

Workflow-spezifische Komponenten für jeden Generierungs-Step:

| Component | Zweck | Step |
|-----------|-------|------|
| `ContextSetupStep` | Kontext-Konfiguration | 1 |
| `ContentInputStep` | Prompt-Eingabe | 2 |
| `GenerationStep` | Loading-Animation | 3 |
| `ReviewStep` | Ergebnis-Anzeige | 4 |

### Shared Components (5)

Wiederverwendbare UI-Komponenten:

| Component | Zweck |
|-----------|-------|
| `TemplateDropdown` | Template-Auswahl Dropdown |
| `StepProgressBar` | Progress Indicator |
| `ErrorBanner` | Fehler-Anzeige |
| `ModalHeader` | Modal Header |
| `ModalFooter` | Modal Footer mit Navigation |

---

## Step Components

## ContextSetupStep

### Übersicht

Der **ContextSetupStep** ist der erste Workflow-Step und ermöglicht die Konfiguration des Generierungs-Kontexts.

**Features:**
- ✅ Dual-Modus-Auswahl (Standard/Expert)
- ✅ Standard-Modus: Branche, Firma, Tonalität, Zielgruppe
- ✅ Expert-Modus: Planungsdokumente hochladen
- ✅ Dokument-Management (hinzufügen, entfernen)
- ✅ Responsive Design mit Grid-Layout

### Props

```typescript
interface ContextSetupStepProps {
  /** Generierungs-Kontext (Branche, Tonalität, etc.) */
  context: GenerationContext;

  /** Callback für Context-Änderungen */
  onChange: (context: GenerationContext) => void;

  /** Ausgewählte Dokumente (Expert-Modus) */
  selectedDocuments?: DocumentContext[];

  /** Callback zum Öffnen des Document Pickers */
  onOpenDocumentPicker?: () => void;

  /** Aktueller Generierungs-Modus */
  generationMode: 'standard' | 'expert';

  /** Callback zum Ändern des Modus */
  setGenerationMode: (mode: 'standard' | 'expert') => void;

  /** Callback zum Löschen aller Dokumente */
  onClearDocuments?: () => void;

  /** Callback zum Entfernen eines einzelnen Dokuments */
  onRemoveDocument?: (docId: string) => void;
}
```

### Types

```typescript
interface GenerationContext {
  industry?: string;
  companyName?: string;
  tone?: 'formal' | 'modern' | 'technical' | 'startup';
  audience?: 'b2b' | 'consumer' | 'media';
}

interface DocumentContext {
  id: string;
  fileName: string;
  content: string;
  wordCount: number;
}
```

### Verwendung

#### Standard-Modus

```tsx
import ContextSetupStep from '@/components/pr/ai/structured-generation/steps/ContextSetupStep';

function MyGenerator() {
  const [context, setContext] = useState<GenerationContext>({});
  const [mode, setMode] = useState<'standard' | 'expert'>('standard');

  return (
    <ContextSetupStep
      context={context}
      onChange={setContext}
      generationMode={mode}
      setGenerationMode={setMode}
    />
  );
}
```

#### Expert-Modus mit Dokumenten

```tsx
function ExpertGenerator() {
  const [context, setContext] = useState<GenerationContext>({});
  const [mode, setMode] = useState<'standard' | 'expert'>('expert');
  const [documents, setDocuments] = useState<DocumentContext[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <ContextSetupStep
        context={context}
        onChange={setContext}
        generationMode={mode}
        setGenerationMode={setMode}
        selectedDocuments={documents}
        onOpenDocumentPicker={() => setShowPicker(true)}
        onClearDocuments={() => setDocuments([])}
        onRemoveDocument={(id) => setDocuments(docs => docs.filter(d => d.id !== id))}
      />

      {showPicker && (
        <DocumentPickerModal
          onSelect={setDocuments}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
```

### UI-Elemente

#### Modus-Auswahl

```tsx
// Standard-Modus Button (aktiv)
<button className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
  <div className="w-5 h-5 rounded-full bg-green-500">
    <CheckIcon />
  </div>
  <h3>Standard</h3>
</button>
```

#### Tonalität-Auswahl

```tsx
const TONES = [
  { id: 'formal', label: 'Formal', desc: 'Seriös, traditionell', icon: AcademicCapIcon },
  { id: 'modern', label: 'Modern', desc: 'Zeitgemäß, innovativ', icon: SparklesIcon },
  { id: 'technical', label: 'Technisch', desc: 'Fachspezifisch, präzise', icon: BeakerIcon },
  { id: 'startup', label: 'Startup', desc: 'Dynamisch, visionär', icon: RocketLaunchIcon }
];
```

#### Dokument-Liste (Expert-Modus)

```tsx
<div className="grid grid-cols-1 gap-2">
  {selectedDocuments.map(doc => (
    <div key={doc.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
      <div>
        <p className="font-medium">{doc.fileName.replace('.celero-doc', '')}</p>
        <p className="text-xs text-blue-600">{doc.wordCount} Wörter</p>
      </div>
      <button onClick={() => onRemoveDocument(doc.id)}>
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  ))}
</div>
```

### Konstanten

```typescript
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
];
```

---

## ContentInputStep

### Übersicht

Der **ContentInputStep** ist der zweite Workflow-Step und ermöglicht die Eingabe des Prompts mit Template-Unterstützung.

**Features:**
- ✅ Template-Dropdown (Standard-Modus)
- ✅ Prompt-Textarea mit Character Counter
- ✅ Context Pills (Firma, Branche, Tonalität, etc.)
- ✅ Dokument-Hinweis (Expert-Modus)
- ✅ Tipps für bessere Ergebnisse

### Props

```typescript
interface ContentInputStepProps {
  /** Aktueller Prompt */
  prompt: string;

  /** Callback für Prompt-Änderungen */
  onChange: (prompt: string) => void;

  /** Verfügbare Templates */
  templates: AITemplate[];

  /** Callback für Template-Auswahl */
  onTemplateSelect: (template: AITemplate) => void;

  /** Generierungs-Kontext */
  context: GenerationContext;

  /** Ob Templates geladen werden */
  loadingTemplates: boolean;

  /** Aktuell ausgewähltes Template */
  selectedTemplate?: AITemplate | null;

  /** Generierungs-Modus */
  generationMode: 'standard' | 'expert';

  /** Ob Dokumente angehängt sind */
  hasDocuments?: boolean;

  /** Anzahl angehängter Dokumente */
  documentCount?: number;
}
```

### Verwendung

#### Standard-Modus

```tsx
import ContentInputStep from '@/components/pr/ai/structured-generation/steps/ContentInputStep';

function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const { templates, loading } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);

  const handleTemplateSelect = (template: AITemplate) => {
    setPrompt(template.prompt);
    setSelectedTemplate(template);
  };

  return (
    <ContentInputStep
      prompt={prompt}
      onChange={setPrompt}
      templates={templates}
      onTemplateSelect={handleTemplateSelect}
      context={context}
      loadingTemplates={loading}
      selectedTemplate={selectedTemplate}
      generationMode="standard"
    />
  );
}
```

#### Expert-Modus mit Dokumenten

```tsx
function ExpertPromptInput() {
  const [prompt, setPrompt] = useState('');

  return (
    <ContentInputStep
      prompt={prompt}
      onChange={setPrompt}
      templates={[]}
      onTemplateSelect={() => {}}
      context={{}}
      loadingTemplates={false}
      selectedTemplate={null}
      generationMode="expert"
      hasDocuments={true}
      documentCount={3}
    />
  );
}
```

### UI-Elemente

#### Context Pills

```tsx
<div className="flex flex-wrap gap-2">
  {context.companyName && (
    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
      {context.companyName}
    </span>
  )}
  {context.industry && (
    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
      {context.industry}
    </span>
  )}
  {hasDocuments && (
    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1.5">
      <DocumentTextIcon className="h-4 w-4" />
      {documentCount} Planungsdokument{documentCount !== 1 ? 'e' : ''}
    </span>
  )}
</div>
```

#### Dokumenten-Modus Hinweis

```tsx
{generationMode === 'expert' && hasDocuments && (
  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
    <CheckCircleIcon className="h-6 w-6 text-green-600" />
    <h3>Kontext-basierte Generierung aktiviert</h3>
    <p>
      Die KI nutzt die {documentCount} ausgewählten Planungsdokumente als Kontext.
      Gib optional weitere Anweisungen oder lasse das Feld leer.
    </p>
  </div>
)}
```

#### Tipps-Sektion

```tsx
const tipExamples = [
  "Nenne konkrete Zahlen und Fakten (z.B. 50% Wachstum, 10.000 Nutzer)",
  "Beschreibe das Alleinstellungsmerkmal klar und deutlich",
  "Erwähne die Zielgruppe und welchen Nutzen sie hat",
  "Gib Kontext zur aktuellen Marktsituation",
  "Füge relevante Personen mit Namen und Position hinzu"
];

<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
  <LightBulbIcon className="h-5 w-5 text-blue-600" />
  <p className="font-semibold text-blue-900">Tipps für bessere Ergebnisse:</p>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {tipExamples.map((tip, index) => (
      <div key={index}>
        <span className="text-blue-400">•</span>
        <span className="text-sm text-blue-700">{tip}</span>
      </div>
    ))}
  </div>
</div>
```

---

## GenerationStep

### Übersicht

Der **GenerationStep** ist der dritte Workflow-Step und zeigt eine animierte Loading-Animation während der KI-Generierung.

**Features:**
- ✅ Rotierendes Sparkles-Icon mit Gradient-Ring
- ✅ Animierte Fortschritts-Steps
- ✅ Success-Animation bei Abschluss
- ✅ Smooth Transitions

### Props

```typescript
interface GenerationStepProps {
  /** Ob aktuell eine Generierung läuft */
  isGenerating: boolean;
}
```

### Verwendung

```tsx
import GenerationStep from '@/components/pr/ai/structured-generation/steps/GenerationStep';

function Generator() {
  const { isGenerating } = useStructuredGeneration();

  return (
    <GenerationStep isGenerating={isGenerating} />
  );
}
```

### UI-Elemente

#### Loading-Animation

```tsx
{isGenerating ? (
  <>
    {/* Gradient Ring (rotierend) */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-spin"
         style={{ animationDuration: '3s' }}>
      <div className="absolute inset-1 rounded-full bg-white"></div>
    </div>

    {/* Icon (pulsierend) */}
    <div className="absolute inset-0 flex items-center justify-center">
      <SparklesIcon className="h-10 w-10 text-indigo-600 animate-pulse" />
    </div>
  </>
) : (
  // Success-Animation
  <div className="rounded-full h-24 w-24 bg-green-100 animate-scale-in">
    <CheckCircleIcon className="h-12 w-12 text-green-600" />
  </div>
)}
```

#### Fortschritts-Steps

```tsx
const steps = [
  { text: "Kontext und Anforderungen analysieren", delay: "0ms" },
  { text: "Journalistische Struktur erstellen", delay: "100ms" },
  { text: "Inhalte für Zielgruppe optimieren", delay: "200ms" },
  { text: "Qualitätskontrolle durchführen", delay: "300ms" }
];

<div className="space-y-3">
  {steps.map((step, index) => (
    <div
      key={index}
      className="flex items-center gap-3 opacity-0 animate-fade-in"
      style={{ animationDelay: step.delay, animationFillMode: 'forwards' }}
    >
      <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
      <span className="text-sm text-gray-600">{step.text}</span>
    </div>
  ))}
</div>
```

#### CSS-Animationen

```css
@keyframes scale-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

## ReviewStep

### Übersicht

Der **ReviewStep** ist der vierte und finale Workflow-Step und zeigt die generierte Pressemitteilung mit Quality-Metriken und zwei Ansichtsmodi an.

**Features:**
- ✅ Quality Metrics Dashboard
- ✅ Tab Navigation (Preview/Structured)
- ✅ HTML-Vorschau mit Styling
- ✅ Strukturierte Ansicht aller Felder
- ✅ Success-Banner mit Auto-Übernahme-Info

### Props

```typescript
interface ReviewStepProps {
  /** Generiertes Ergebnis */
  result: StructuredGenerateResponse;

  /** Callback für Neu-Generierung */
  onRegenerate: () => void;
}
```

### Types

```typescript
interface StructuredGenerateResponse {
  success: boolean;
  headline: string;
  htmlContent: string;
  structured: StructuredPressRelease;
  aiProvider?: string;
  timestamp?: string;
}

interface StructuredPressRelease {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote?: {
    text: string;
    person: string;
    role: string;
    company?: string;
  };
  cta?: string;
  boilerplate?: string;
  hashtags?: string[];
  socialOptimized?: boolean;
}
```

### Verwendung

```tsx
import ReviewStep from '@/components/pr/ai/structured-generation/steps/ReviewStep';

function ResultReview() {
  const { result } = useStructuredGeneration();

  if (!result) return null;

  return (
    <ReviewStep
      result={result}
      onRegenerate={() => {
        setCurrentStep('content');
      }}
    />
  );
}
```

### UI-Elemente

#### Quality Metrics

```tsx
const metrics = [
  {
    label: 'Headline',
    value: `${result.structured.headline.length} Zeichen`,
    ideal: '< 80'
  },
  {
    label: 'Lead',
    value: `${result.structured.leadParagraph.split(' ').length} Wörter`,
    ideal: '40-50'
  },
  {
    label: 'Absätze',
    value: result.structured.bodyParagraphs.length,
    ideal: '3-4'
  },
  {
    label: 'CTA',
    value: result.structured.cta ? '✓' : '✗',
    ideal: '✓'
  },
  {
    label: 'Social',
    value: result.structured.socialOptimized ? '✓' : '○',
    ideal: '✓'
  }
];

<div className="grid grid-cols-5 gap-3">
  {metrics.map((metric, index) => (
    <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-indigo-600">{metric.value}</div>
      <div className="text-xs text-gray-600">{metric.label}</div>
      <div className="text-xs text-gray-400">Ideal: {metric.ideal}</div>
    </div>
  ))}
</div>
```

#### Tab Navigation

```tsx
const [activeTab, setActiveTab] = useState<'preview' | 'structured'>('preview');

<div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
  <button
    onClick={() => setActiveTab('preview')}
    className={clsx(
      "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
      activeTab === 'preview'
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-600 hover:text-gray-900"
    )}
  >
    <EyeIcon className="h-4 w-4 inline mr-2" />
    Vorschau
  </button>
  <button
    onClick={() => setActiveTab('structured')}
    className={clsx(
      "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
      activeTab === 'structured'
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-600 hover:text-gray-900"
    )}
  >
    <DocumentTextIcon className="h-4 w-4 inline mr-2" />
    Strukturiert
  </button>
</div>
```

#### Preview Tab

```tsx
{activeTab === 'preview' && (
  <div>
    <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
      <h1 className="text-2xl font-bold text-gray-900">
        {result.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()}
      </h1>
    </div>
    <div className="p-6 max-h-[400px] overflow-y-auto">
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: result.htmlContent }}
      />
    </div>
  </div>
)}
```

#### Structured Tab

```tsx
{activeTab === 'structured' && (
  <div className="p-6 max-h-[500px] overflow-y-auto space-y-6">
    {/* Headline */}
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase">Headline</h4>
      <p className="text-lg font-bold text-gray-900">
        {result.structured.headline}
      </p>
    </div>

    {/* Lead-Absatz */}
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase">Lead-Absatz</h4>
      <p className="text-gray-700 bg-yellow-50 p-3 rounded">
        {result.structured.leadParagraph}
      </p>
    </div>

    {/* Body Paragraphen */}
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase">Haupttext</h4>
      <div className="space-y-3">
        {result.structured.bodyParagraphs.map((para, index) => (
          <p key={index} className="text-gray-700">{para}</p>
        ))}
      </div>
    </div>

    {/* Zitat */}
    {result.structured.quote && (
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Zitat</h4>
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          <blockquote className="italic text-gray-800">
            &ldquo;{result.structured.quote.text}&rdquo;
          </blockquote>
          <p className="text-sm text-gray-600 mt-2">
            — {result.structured.quote.person}, {result.structured.quote.role}
          </p>
        </div>
      </div>
    )}

    {/* CTA */}
    {result.structured.cta && (
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Call-to-Action</h4>
        <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-400">
          <p className="font-bold text-indigo-900">{result.structured.cta}</p>
        </div>
      </div>
    )}

    {/* Hashtags */}
    {result.structured.hashtags && result.structured.hashtags.length > 0 && (
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Social Media Hashtags</h4>
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          <div className="flex flex-wrap gap-2">
            {result.structured.hashtags.map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

---

## Shared Components

## TemplateDropdown

### Übersicht

Der **TemplateDropdown** ist eine wiederverwendbare Dropdown-Component zur Auswahl von AI-Templates.

**Features:**
- ✅ Kategorisierte Icons
- ✅ Click-Outside zum Schließen
- ✅ Loading- und Empty-States
- ✅ Optimiert mit React.memo

### Props

```typescript
interface TemplateDropdownProps {
  /** Verfügbare Templates */
  templates: AITemplate[];

  /** Callback für Template-Auswahl */
  onSelect: (template: AITemplate) => void;

  /** Ob Templates geladen werden */
  loading: boolean;

  /** Aktuell ausgewähltes Template */
  selectedTemplate?: AITemplate | null;
}
```

### Verwendung

```tsx
import TemplateDropdown from '@/components/pr/ai/structured-generation/components/TemplateDropdown';

function MyForm() {
  const { templates, loading } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);

  const handleSelect = (template: AITemplate) => {
    setSelectedTemplate(template);
    setPrompt(template.prompt);
  };

  return (
    <TemplateDropdown
      templates={templates}
      onSelect={handleSelect}
      loading={loading}
      selectedTemplate={selectedTemplate}
    />
  );
}
```

### Icon-Mapping

```typescript
const categoryIcons: Record<string, any> = {
  product: RocketLaunchIcon,
  partnership: HandRaisedIcon,
  finance: CurrencyDollarIcon,
  corporate: BuildingOfficeIcon,
  event: CalendarIcon,
  research: BeakerIcon
};
```

---

## StepProgressBar

### Übersicht

Der **StepProgressBar** zeigt den aktuellen Fortschritt im Generierungs-Workflow an.

**Features:**
- ✅ Aktiver Step (Indigo-Hintergrund, Scale-Animation)
- ✅ Abgeschlossene Steps (Grün, Check-Icon)
- ✅ Ausstehende Steps (Grau)
- ✅ Verbindungslinien zwischen Steps

### Props

```typescript
interface StepProgressBarProps {
  /** Aktueller Workflow-Step */
  currentStep: GenerationStep;

  /** Step-Konfiguration mit Icons und Labels */
  steps: Array<{
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}
```

### Verwendung

```tsx
import StepProgressBar from '@/components/pr/ai/structured-generation/components/StepProgressBar';

function MyModal() {
  const [currentStep, setCurrentStep] = useState<GenerationStep>('context');

  const steps = [
    { id: 'context', name: 'Kontext', icon: CogIcon },
    { id: 'content', name: 'Inhalt', icon: DocumentTextIcon },
    { id: 'generating', name: 'KI', icon: SparklesIcon },
    { id: 'review', name: 'Review', icon: EyeIcon }
  ];

  return (
    <StepProgressBar currentStep={currentStep} steps={steps} />
  );
}
```

---

## ErrorBanner

### Übersicht

Der **ErrorBanner** zeigt Fehlermeldungen in einem roten Banner mit Shake-Animation an.

### Props

```typescript
interface ErrorBannerProps {
  /** Fehlermeldung (oder null wenn kein Fehler) */
  error: string | null;
}
```

### Verwendung

```tsx
import ErrorBanner from '@/components/pr/ai/structured-generation/components/ErrorBanner';

function MyForm() {
  const { error } = useStructuredGeneration();

  return (
    <div>
      <ErrorBanner error={error} />
      {/* Rest of form */}
    </div>
  );
}
```

---

## ModalHeader

### Übersicht

Der **ModalHeader** zeigt den Header des Generierungs-Modals mit Titel und Close-Button an.

### Props

```typescript
interface ModalHeaderProps {
  /** Callback für Modal schließen */
  onClose: () => void;
}
```

### Verwendung

```tsx
import ModalHeader from '@/components/pr/ai/structured-generation/components/ModalHeader';

function MyModal() {
  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogPanel>
        <ModalHeader onClose={handleClose} />
        {/* Modal Content */}
      </DialogPanel>
    </Dialog>
  );
}
```

---

## ModalFooter

### Übersicht

Der **ModalFooter** zeigt step-spezifische Navigation-Buttons im Footer an.

### Props

```typescript
interface ModalFooterProps {
  currentStep: GenerationStep;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onGenerate: () => void;
  onUseResult: () => void;
  canGenerate: boolean;
  isGenerating: boolean;
}
```

### Verwendung

```tsx
import ModalFooter from '@/components/pr/ai/structured-generation/components/ModalFooter';

function MyModal() {
  return (
    <ModalFooter
      currentStep={currentStep}
      onClose={handleClose}
      onBack={handleBack}
      onNext={handleNext}
      onGenerate={handleGenerate}
      onUseResult={handleUseResult}
      canGenerate={canGenerate}
      isGenerating={isGenerating}
    />
  );
}
```

---

## Styling Guidelines

### Tailwind CSS Klassen

#### Buttons

```css
/* Primary Button (Gradient) */
.bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700

/* Success Button (Gradient) */
.bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700

/* Plain Button */
.text-gray-600 hover:text-gray-900
```

#### Cards

```css
/* Info Card (Blue) */
.bg-blue-50 border border-blue-200 rounded-lg p-4

/* Success Card (Green) */
.bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4

/* Error Card (Red) */
.bg-red-50 border border-red-200 rounded-lg p-4
```

#### Pills

```css
/* Context Pills */
.px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium

/* Hashtag Pills */
.bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold
```

### Farbschema

| Element | Farbe | Hex |
|---------|-------|-----|
| Primary | Indigo | #005fab |
| Success | Green | #10b981 |
| Error | Red | #ef4444 |
| Info | Blue | #3b82f6 |
| Warning | Orange | #f59e0b |

---

## Accessibility

### ARIA Labels

```tsx
<button
  onClick={handleGenerate}
  aria-label="Pressemitteilung mit KI generieren"
  aria-disabled={isGenerating}
>
  Mit KI generieren
</button>
```

### Keyboard Navigation

```tsx
// Focus-Styles
className="focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2"

// Tab-Index für Custom Components
<div role="button" tabIndex={0} onKeyPress={handleKeyPress}>
  ...
</div>
```

### Screen Reader Support

```tsx
<div role="status" aria-live="polite">
  {isGenerating ? 'KI arbeitet für dich...' : 'Generierung abgeschlossen'}
</div>
```

---

## Performance

### React.memo

```tsx
const TemplateDropdown = React.memo(function TemplateDropdown({ ... }) {
  // Component Logic
});
```

### useCallback

```tsx
const handleSelect = useCallback((template: AITemplate) => {
  onSelect(template);
  setIsOpen(false);
}, [onSelect]);
```

### Conditional Rendering

```tsx
{currentStep === 'content' && (
  <TemplateDropdown templates={templates} />
)}
```

---

**Entwickelt mit ❤️ von CeleroPress**
Letzte Aktualisierung: 2025-11-04

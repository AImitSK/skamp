# usePDFGeneration - Hook-API-Referenz

> **Hook**: usePDFGeneration
> **Datei**: `src/components/pr/campaign/hooks/usePDFGeneration.ts`
> **Zeilen**: 101
> **Status**: ✅ Produktiv

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Import](#import)
- [Signatur](#signatur)
- [Return-Values](#return-values)
- [Verwendung](#verwendung)
- [Workflow](#workflow)
- [Beispiele](#beispiele)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Überblick

`usePDFGeneration` ist ein Custom Hook für PDF-Export-Funktionalität im CampaignContentComposer. Er verwaltet:

- PDF-Generierungs-Status (loading)
- Download-URL Management
- Folder-Selector Dialog State
- Titel-Validierung vor Export

### Features

- ✅ State Management für PDF-Generation
- ✅ Folder-Selector Dialog Integration
- ✅ Automatische Titel-Validierung
- ✅ Toast-Notifications
- ✅ 100% Test-Coverage (10 Tests)

### Architektur

```
usePDFGeneration
├── State
│   ├── generatingPdf (boolean)
│   ├── pdfDownloadUrl (string | null)
│   └── showFolderSelector (boolean)
└── Handlers
    ├── generatePdf (async)
    └── handlePdfExport (validation + dialog)
```

## Import

```tsx
// Standard Import
import { usePDFGeneration } from '@/components/pr/campaign/hooks/usePDFGeneration';

// Mit Destrukturierung
const {
  generatingPdf,
  pdfDownloadUrl,
  showFolderSelector,
  setShowFolderSelector,
  generatePdf,
  handlePdfExport
} = usePDFGeneration();
```

## Signatur

```typescript
function usePDFGeneration(): {
  generatingPdf: boolean;
  pdfDownloadUrl: string | null;
  showFolderSelector: boolean;
  setShowFolderSelector: (show: boolean) => void;
  generatePdf: (targetFolderId?: string) => Promise<void>;
  handlePdfExport: (title: string) => void;
}
```

## Return-Values

### generatingPdf

```typescript
generatingPdf: boolean
```

**Beschreibung:** Gibt an, ob PDF-Generierung läuft.

**Verwendung:**
- Loading-State für Export-Button
- Disable-State für UI während Generation

**Beispiel:**
```tsx
const { generatingPdf } = usePDFGeneration();

<Button disabled={generatingPdf}>
  {generatingPdf ? 'PDF wird erstellt...' : 'Als PDF exportieren'}
</Button>
```

**Hinweis:** Aktuell immer `false` (PDF-Generation deaktiviert)

---

### pdfDownloadUrl

```typescript
pdfDownloadUrl: string | null
```

**Beschreibung:** Download-URL des generierten PDFs.

**Werte:**
- `null` - Kein PDF generiert
- `string` - URL zum Download/Öffnen

**Verwendung:**
```tsx
const { pdfDownloadUrl } = usePDFGeneration();

{pdfDownloadUrl && (
  <a
    href={pdfDownloadUrl}
    target="_blank"
    rel="noopener noreferrer"
  >
    PDF öffnen
  </a>
)}
```

---

### showFolderSelector

```typescript
showFolderSelector: boolean
```

**Beschreibung:** Steuert Sichtbarkeit des FolderSelectorDialog.

**Verwendung:**
```tsx
const { showFolderSelector } = usePDFGeneration();

<FolderSelectorDialog
  isOpen={showFolderSelector}
  // ...
/>
```

---

### setShowFolderSelector

```typescript
setShowFolderSelector: (show: boolean) => void
```

**Beschreibung:** Setter für `showFolderSelector`.

**Parameter:**
- `show`: `true` = Dialog öffnen, `false` = Dialog schließen

**Verwendung:**
```tsx
const { showFolderSelector, setShowFolderSelector } = usePDFGeneration();

<FolderSelectorDialog
  isOpen={showFolderSelector}
  onClose={() => setShowFolderSelector(false)}
/>
```

---

### generatePdf

```typescript
generatePdf: (targetFolderId?: string) => Promise<void>
```

**Beschreibung:** Generiert PDF und speichert es im ausgewählten Ordner.

**HINWEIS:** Aktuell deaktiviert - PDF-Generierung erfolgt über Puppeteer API Route.

**Parameter:**
- `targetFolderId` (optional): Ziel-Ordner ID

**Return:** Promise<void>

**Geplante Implementierung:**
```tsx
const { generatePdf } = usePDFGeneration();

await generatePdf('folder-123');
// → POST /api/pdf/generate
// → { downloadUrl: "..." }
```

**Aktuelles Verhalten:**
```tsx
// Funktion endet sofort ohne Action
await generatePdf(); // No-op
```

---

### handlePdfExport

```typescript
handlePdfExport: (title: string) => void
```

**Beschreibung:** Handler für PDF-Export Button mit Titel-Validierung.

**Parameter:**
- `title`: Titel der Pressemitteilung (erforderlich)

**Validierung:**
1. Prüft ob `title` vorhanden
2. Prüft ob `title.trim()` nicht leer
3. Bei Fehler: Toast-Notification
4. Bei Erfolg: Öffnet FolderSelectorDialog

**Verwendung:**
```tsx
const { handlePdfExport } = usePDFGeneration();

<Button onClick={() => handlePdfExport(title)}>
  Als PDF exportieren
</Button>
```

**Error-Cases:**
```tsx
handlePdfExport(''); // ❌ Toast: "Bitte geben Sie einen Titel ein."
handlePdfExport('   '); // ❌ Toast: "Bitte geben Sie einen Titel ein."
handlePdfExport('Titel'); // ✅ Öffnet Dialog
```

## Verwendung

### Basic Usage

```tsx
import { usePDFGeneration } from '@/components/pr/campaign/hooks/usePDFGeneration';

function MyComponent() {
  const [title, setTitle] = useState('Pressemitteilung');

  const {
    generatingPdf,
    handlePdfExport,
    showFolderSelector,
    setShowFolderSelector,
    generatePdf
  } = usePDFGeneration();

  return (
    <>
      <Button
        onClick={() => handlePdfExport(title)}
        disabled={generatingPdf}
      >
        Als PDF exportieren
      </Button>

      <FolderSelectorDialog
        isOpen={showFolderSelector}
        onClose={() => setShowFolderSelector(false)}
        onFolderSelect={generatePdf}
        organizationId="org-123"
      />
    </>
  );
}
```

### Im CampaignContentComposer

```tsx
// src/components/pr/campaign/CampaignContentComposer.tsx
export default function CampaignContentComposer({ title, ... }) {
  // Hook-Integration
  const {
    generatingPdf,
    pdfDownloadUrl,
    showFolderSelector,
    setShowFolderSelector,
    generatePdf,
    handlePdfExport
  } = usePDFGeneration();

  return (
    <>
      {/* Export-Button */}
      <Button
        onClick={() => handlePdfExport(title)}
        disabled={generatingPdf || !processedContent}
      >
        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
        {generatingPdf ? 'PDF wird erstellt...' : 'Als PDF exportieren'}
      </Button>

      {/* Download-Link */}
      {pdfDownloadUrl && (
        <a href={pdfDownloadUrl} target="_blank">
          PDF öffnen
        </a>
      )}

      {/* Folder-Selector */}
      <FolderSelectorDialog
        isOpen={showFolderSelector}
        onClose={() => setShowFolderSelector(false)}
        onFolderSelect={generatePdf}
        organizationId={organizationId}
        clientId={clientId}
      />
    </>
  );
}
```

## Workflow

### PDF-Export-Workflow

```
1. User klickt "Als PDF exportieren"
   ↓
2. handlePdfExport(title) aufgerufen
   ↓
3. Validierung: title vorhanden?
   ├─ Nein → Toast-Error
   └─ Ja → setShowFolderSelector(true)
   ↓
4. FolderSelectorDialog öffnet
   ↓
5. User wählt Ordner
   ↓
6. onFolderSelect(folderId) aufgerufen
   ↓
7. generatePdf(folderId) aufgerufen
   ↓
8. (Aktuell: No-op)
   (Geplant: PDF-Generation via API)
   ↓
9. setPdfDownloadUrl(url)
   ↓
10. Download-Link erscheint
```

### State-Transitions

```
Initial State:
{
  generatingPdf: false,
  pdfDownloadUrl: null,
  showFolderSelector: false
}

Nach handlePdfExport('Titel'):
{
  generatingPdf: false,
  pdfDownloadUrl: null,
  showFolderSelector: true ← geändert
}

Nach generatePdf() (geplant):
{
  generatingPdf: true ← während Generierung
  pdfDownloadUrl: null,
  showFolderSelector: false
}

Nach erfolgreicher Generierung:
{
  generatingPdf: false,
  pdfDownloadUrl: "https://..." ← URL vorhanden
  showFolderSelector: false
}
```

## Beispiele

### Beispiel 1: Einfacher Export-Button

```tsx
function SimpleExport() {
  const [title, setTitle] = useState('');
  const { handlePdfExport } = usePDFGeneration();

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel eingeben"
      />
      <Button onClick={() => handlePdfExport(title)}>
        Exportieren
      </Button>
    </div>
  );
}
```

### Beispiel 2: Mit Loading-State

```tsx
function ExportWithLoading() {
  const [title] = useState('Pressemitteilung');
  const { generatingPdf, handlePdfExport } = usePDFGeneration();

  return (
    <Button
      onClick={() => handlePdfExport(title)}
      disabled={generatingPdf}
      className={generatingPdf ? 'opacity-50' : ''}
    >
      {generatingPdf ? (
        <>
          <Spinner className="mr-2" />
          Erstelle PDF...
        </>
      ) : (
        <>
          <DocumentArrowDownIcon className="mr-2" />
          Als PDF exportieren
        </>
      )}
    </Button>
  );
}
```

### Beispiel 3: Mit Download-Link

```tsx
function ExportWithDownload() {
  const [title] = useState('Pressemitteilung');
  const {
    generatingPdf,
    pdfDownloadUrl,
    handlePdfExport
  } = usePDFGeneration();

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={() => handlePdfExport(title)}
        disabled={generatingPdf}
      >
        {generatingPdf ? 'Erstelle...' : 'Exportieren'}
      </Button>

      {pdfDownloadUrl && (
        <a
          href={pdfDownloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          PDF öffnen
        </a>
      )}
    </div>
  );
}
```

### Beispiel 4: Mit Custom Validation

```tsx
function ExportWithValidation() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { handlePdfExport } = usePDFGeneration();

  const handleExport = () => {
    // Custom Validierung
    if (!title.trim()) {
      toastService.error('Titel erforderlich');
      return;
    }

    if (!content.trim()) {
      toastService.error('Content erforderlich');
      return;
    }

    // Hook-Validierung + Dialog
    handlePdfExport(title);
  };

  return (
    <Button onClick={handleExport}>
      Exportieren
    </Button>
  );
}
```

### Beispiel 5: Komplette Integration

```tsx
function CompleteExportFeature() {
  const [title, setTitle] = useState('');
  const [organizationId] = useState('org-123');
  const [clientId] = useState('client-456');

  const {
    generatingPdf,
    pdfDownloadUrl,
    showFolderSelector,
    setShowFolderSelector,
    generatePdf,
    handlePdfExport
  } = usePDFGeneration();

  return (
    <div>
      {/* Editor */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel"
      />

      {/* Export-Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => handlePdfExport(title)}
          disabled={generatingPdf}
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
          {generatingPdf ? 'Erstelle PDF...' : 'Als PDF exportieren'}
        </Button>

        {pdfDownloadUrl && (
          <a
            href={pdfDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            PDF öffnen
          </a>
        )}
      </div>

      {/* Folder-Selector Dialog */}
      <FolderSelectorDialog
        isOpen={showFolderSelector}
        onClose={() => setShowFolderSelector(false)}
        onFolderSelect={generatePdf}
        organizationId={organizationId}
        clientId={clientId}
      />
    </div>
  );
}
```

## Best Practices

### 1. Titel-Validierung

```tsx
// ✅ RICHTIG - Vor Export validieren
const handleExport = () => {
  if (!title || !title.trim()) {
    toastService.error('Titel erforderlich');
    return;
  }
  handlePdfExport(title);
};

// ❌ FALSCH - Ungültige Titel
handlePdfExport(''); // Error-Toast
handlePdfExport('   '); // Error-Toast
```

### 2. Loading-State nutzen

```tsx
// ✅ RICHTIG - Button disablen während Generation
<Button
  onClick={() => handlePdfExport(title)}
  disabled={generatingPdf}
>
  {generatingPdf ? 'Erstelle...' : 'Exportieren'}
</Button>

// ❌ FALSCH - Kein Feedback
<Button onClick={() => handlePdfExport(title)}>
  Exportieren
</Button>
```

### 3. Dialog-State korrekt schließen

```tsx
// ✅ RICHTIG - onClose implementieren
<FolderSelectorDialog
  isOpen={showFolderSelector}
  onClose={() => setShowFolderSelector(false)}
  onFolderSelect={generatePdf}
/>

// ❌ FALSCH - onClose fehlt
<FolderSelectorDialog
  isOpen={showFolderSelector}
  onFolderSelect={generatePdf}
/>
```

### 4. Error-Handling

```tsx
// ✅ RICHTIG - Try-Catch in generatePdf (geplant)
const generatePdf = useCallback(async (folderId?: string) => {
  setGeneratingPdf(true);
  try {
    const response = await fetch('/api/pdf/generate', {
      method: 'POST',
      body: JSON.stringify({ content, folderId })
    });
    const { downloadUrl } = await response.json();
    setPdfDownloadUrl(downloadUrl);
    toastService.success('PDF erstellt');
  } catch (error) {
    toastService.error('Fehler beim Erstellen der PDF');
    console.error('PDF Generation Error:', error);
  } finally {
    setGeneratingPdf(false);
  }
}, [content]);
```

## Troubleshooting

### Problem: Toast "Titel erforderlich" erscheint

**Symptom:**
```tsx
handlePdfExport(title);
// Toast: "Bitte geben Sie einen Titel für die Pressemitteilung ein."
```

**Ursachen:**
1. `title` ist leerer String
2. `title` enthält nur Whitespace

**Lösung:**
```tsx
// ✅ Titel validieren
if (!title || !title.trim()) {
  setTitle('Pressemitteilung'); // Default-Titel
}
handlePdfExport(title);
```

### Problem: Dialog öffnet nicht

**Symptom:**
```tsx
handlePdfExport(title);
// Dialog bleibt geschlossen
```

**Ursache:** Titel-Validierung schlägt fehl

**Lösung:**
```tsx
// Debug-Log
console.log('Title:', title);
console.log('Valid:', !!title && !!title.trim());
```

### Problem: PDF-Generation läuft nicht

**Symptom:**
```tsx
generatePdf('folder-123');
// Nichts passiert
```

**Ursache:** Funktion aktuell deaktiviert (No-op)

**Hinweis:**
```tsx
// Aktuelles Verhalten (deaktiviert)
const generatePdf = useCallback(async (targetFolderId?: string) => {
  setGeneratingPdf(false);
  return; // ← Früher Return
}, []);

// Wird aktiviert wenn Puppeteer-API verfügbar
```

### Problem: generatingPdf bleibt true

**Symptom:**
Button bleibt deaktiviert

**Ursache:** Error in generatePdf ohne finally-Block

**Lösung:**
```tsx
// ✅ RICHTIG - finally-Block
try {
  // PDF-Generation
} catch (error) {
  // Error-Handling
} finally {
  setGeneratingPdf(false); // ← Wichtig!
}
```

---

**Dokumentation erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)

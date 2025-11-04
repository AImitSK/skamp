# CampaignContentComposer - API-Übersicht

> **Modul**: Campaign Content Composer API
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 04. November 2025

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Komponenten-APIs](#komponenten-apis)
- [Custom Hooks](#custom-hooks)
- [TypeScript-Typen](#typescript-typen)
- [Schnellreferenz](#schnellreferenz)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Überblick

Die CampaignContentComposer API besteht aus:

1. **Hauptkomponente** - `CampaignContentComposer`
2. **Custom Hooks** - `usePDFGeneration`, `useBoilerplateProcessing`
3. **Shared Components** - `FolderSelectorDialog`
4. **TypeScript-Typen** - `BoilerplateSection`, Props-Interfaces

### API-Kategorien

| Kategorie | Komponente/Hook | Zweck | Zeilen |
|-----------|----------------|-------|--------|
| **Hauptkomponente** | `CampaignContentComposer` | Pressemitteilungs-Editor | 256 |
| **PDF-Export** | `usePDFGeneration` | PDF-Generierung & Ordner-Auswahl | 101 |
| **Content-Processing** | `useBoilerplateProcessing` | Boilerplate-Content-Verarbeitung | 94 |
| **Dialog** | `FolderSelectorDialog` | Ordner-Navigation & Auswahl | 182 |

## Komponenten-APIs

### CampaignContentComposer

**Import:**
```tsx
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
```

**Signatur:**
```tsx
function CampaignContentComposer(props: CampaignContentComposerProps): JSX.Element
```

**Props:**
```typescript
interface CampaignContentComposerProps {
  // === ERFORDERLICH ===
  organizationId: string;
  title: string;
  onTitleChange: (title: string) => void;
  mainContent: string;
  onMainContentChange: (content: string) => void;
  onFullContentChange: (fullContent: string) => void;

  // === OPTIONAL - Client-Kontext ===
  clientId?: string;
  clientName?: string;

  // === OPTIONAL - Boilerplate-Sections ===
  initialBoilerplateSections?: BoilerplateSection[];
  onBoilerplateSectionsChange?: (sections: BoilerplateSection[]) => void;

  // === OPTIONAL - UI-Optionen ===
  hideMainContentField?: boolean;
  hidePreview?: boolean;
  hideBoilerplates?: boolean;
  readOnlyTitle?: boolean;

  // === OPTIONAL - PR-SEO ===
  keywords?: string[];
  onKeywordsChange?: (keywords: string[]) => void;
  onSeoScoreChange?: (score: any) => void;
}
```

**Verwendung:**
```tsx
<CampaignContentComposer
  organizationId="org-123"
  title={title}
  onTitleChange={setTitle}
  mainContent={content}
  onMainContentChange={setContent}
  onFullContentChange={setFullContent}
/>
```

**Siehe:** [Detaillierte API-Dokumentation](./CampaignContentComposer.md)

---

### FolderSelectorDialog

**Import:**
```tsx
import FolderSelectorDialog from '@/components/pr/campaign/shared/FolderSelectorDialog';
```

**Signatur:**
```tsx
function FolderSelectorDialog(props: FolderSelectorDialogProps): JSX.Element | null
```

**Props:**
```typescript
interface FolderSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelect: (folderId?: string) => void;
  organizationId: string;
  clientId?: string;
}
```

**Verwendung:**
```tsx
<FolderSelectorDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onFolderSelect={handleFolderSelect}
  organizationId="org-123"
  clientId="client-456"
/>
```

**Performance:** Mit `React.memo` optimiert

**Siehe:** [Detaillierte API-Dokumentation](./FolderSelectorDialog.md)

## Custom Hooks

### usePDFGeneration

**Import:**
```tsx
import { usePDFGeneration } from '@/components/pr/campaign/hooks/usePDFGeneration';
```

**Signatur:**
```tsx
function usePDFGeneration(): {
  generatingPdf: boolean;
  pdfDownloadUrl: string | null;
  showFolderSelector: boolean;
  setShowFolderSelector: (show: boolean) => void;
  generatePdf: (targetFolderId?: string) => Promise<void>;
  handlePdfExport: (title: string) => void;
}
```

**Return Values:**

| Property | Type | Beschreibung |
|----------|------|--------------|
| `generatingPdf` | `boolean` | PDF-Generierung läuft |
| `pdfDownloadUrl` | `string \| null` | Download-URL nach Generierung |
| `showFolderSelector` | `boolean` | Folder-Selector Dialog sichtbar |
| `setShowFolderSelector` | `(show: boolean) => void` | Dialog-Sichtbarkeit setzen |
| `generatePdf` | `(folderId?: string) => Promise<void>` | PDF generieren (aktuell deaktiviert) |
| `handlePdfExport` | `(title: string) => void` | Export-Button Handler (mit Validierung) |

**Verwendung:**
```tsx
const {
  generatingPdf,
  pdfDownloadUrl,
  showFolderSelector,
  setShowFolderSelector,
  generatePdf,
  handlePdfExport
} = usePDFGeneration();

// Export-Button
<Button
  onClick={() => handlePdfExport(title)}
  disabled={generatingPdf}
>
  {generatingPdf ? 'Erstelle PDF...' : 'Als PDF exportieren'}
</Button>

// Folder-Selector Dialog
<FolderSelectorDialog
  isOpen={showFolderSelector}
  onClose={() => setShowFolderSelector(false)}
  onFolderSelect={generatePdf}
  organizationId={orgId}
/>
```

**Siehe:** [Detaillierte API-Dokumentation](./usePDFGeneration.md)

---

### useBoilerplateProcessing

**Import:**
```tsx
import { useBoilerplateProcessing } from '@/components/pr/campaign/hooks/useBoilerplateProcessing';
```

**Signatur:**
```tsx
function useBoilerplateProcessing(
  boilerplateSections: BoilerplateSection[],
  title: string,
  onFullContentChange: (content: string) => void
): string
```

**Parameter:**

| Parameter | Type | Beschreibung |
|-----------|------|--------------|
| `boilerplateSections` | `BoilerplateSection[]` | Zu verarbeitende Sections |
| `title` | `string` | Titel der Pressemitteilung |
| `onFullContentChange` | `(content: string) => void` | Callback für vollständigen Content |

**Return Value:**
- `string` - Vollständig prozessierter HTML-Content

**Verwendung:**
```tsx
const processedContent = useBoilerplateProcessing(
  boilerplateSections,
  title,
  onFullContentChange
);

// In Preview
<div
  dangerouslySetInnerHTML={{ __html: processedContent }}
/>
```

**Siehe:** [Detaillierte API-Dokumentation](./useBoilerplateProcessing.md)

## TypeScript-Typen

### BoilerplateSection

**Definition:**
```typescript
interface BoilerplateSection {
  // Identifikation
  id: string;
  type: 'boilerplate' | 'lead' | 'main' | 'quote';

  // Anordnung & Status
  order: number;
  isLocked: boolean;
  isCollapsed: boolean;

  // Content (optional je nach type)
  boilerplateId?: string;
  boilerplate?: Boilerplate;
  content?: string;
  customTitle?: string;

  // Metadata (nur für type: 'quote')
  metadata?: {
    person?: string;
    role?: string;
    company?: string;
  };
}
```

**Section-Typen:**

| Type | Beschreibung | Erforderliche Felder |
|------|--------------|---------------------|
| `boilerplate` | Wiederverwendbarer Textbaustein | `boilerplateId`, `boilerplate` |
| `lead` | Lead-Absatz (5 W-Fragen) | `content` |
| `main` | Haupttext | `content` |
| `quote` | Zitat | `content`, `metadata` |

**Beispiel:**
```typescript
const sections: BoilerplateSection[] = [
  {
    id: 'section-1',
    type: 'lead',
    order: 0,
    isLocked: false,
    isCollapsed: false,
    content: '<p>Unternehmen X gibt heute bekannt...</p>',
  },
  {
    id: 'section-2',
    type: 'quote',
    order: 1,
    isLocked: false,
    isCollapsed: false,
    content: '<p>Diese Partnerschaft ist ein Meilenstein.</p>',
    metadata: {
      person: 'Max Mustermann',
      role: 'CEO',
      company: 'Unternehmen X',
    },
  },
  {
    id: 'section-3',
    type: 'boilerplate',
    order: 2,
    isLocked: true,
    isCollapsed: false,
    boilerplateId: 'bp-123',
    boilerplate: {
      id: 'bp-123',
      name: 'Über uns',
      content: '<p>Unternehmen X ist...</p>',
      // ...
    },
  },
];
```

### Boilerplate

**Definition:**
```typescript
interface Boilerplate {
  id: string;
  name: string;
  content: string;
  organizationId: string;
  clientId?: string;
  category?: string;
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Schnellreferenz

### Props-Kategorien

**Erforderliche Props:**
```tsx
<CampaignContentComposer
  organizationId={orgId}           // ✅ Erforderlich
  title={title}                    // ✅ Erforderlich
  onTitleChange={setTitle}         // ✅ Erforderlich
  mainContent={content}            // ✅ Erforderlich
  onMainContentChange={setContent} // ✅ Erforderlich
  onFullContentChange={setFull}    // ✅ Erforderlich
/>
```

**Client-Kontext:**
```tsx
<CampaignContentComposer
  clientId={clientId}              // ⭕ Optional
  clientName={clientName}          // ⭕ Optional
  {...requiredProps}
/>
```

**Boilerplate-Sections:**
```tsx
<CampaignContentComposer
  initialBoilerplateSections={sections}     // ⭕ Optional
  onBoilerplateSectionsChange={setSections} // ⭕ Optional
  {...requiredProps}
/>
```

**UI-Optionen:**
```tsx
<CampaignContentComposer
  hideMainContentField={true}      // ⭕ Optional (default: false)
  hidePreview={true}               // ⭕ Optional (default: false)
  hideBoilerplates={true}          // ⭕ Optional (default: false)
  readOnlyTitle={true}             // ⭕ Optional (default: false)
  {...requiredProps}
/>
```

**PR-SEO:**
```tsx
<CampaignContentComposer
  keywords={keywords}              // ⭕ Optional
  onKeywordsChange={setKeywords}   // ⭕ Optional
  onSeoScoreChange={setScore}      // ⭕ Optional
  {...requiredProps}
/>
```

### Hook-Usage-Patterns

**PDF-Export:**
```tsx
const {
  generatingPdf,
  handlePdfExport,
  showFolderSelector,
  setShowFolderSelector,
  generatePdf
} = usePDFGeneration();

// Export-Button
<Button onClick={() => handlePdfExport(title)}>
  {generatingPdf ? 'Erstelle...' : 'Exportieren'}
</Button>

// Dialog
<FolderSelectorDialog
  isOpen={showFolderSelector}
  onClose={() => setShowFolderSelector(false)}
  onFolderSelect={generatePdf}
  organizationId={orgId}
/>
```

**Content-Processing:**
```tsx
const processedContent = useBoilerplateProcessing(
  boilerplateSections,
  title,
  onFullContentChange
);

// Automatisch aktualisiert bei:
// - boilerplateSections ändern
// - title ändert
// - Ruft onFullContentChange automatisch auf
```

## Error Handling

### Validierungs-Fehler

**Titel-Validierung:**
```tsx
// usePDFGeneration validiert automatisch
handlePdfExport(''); // ❌ Fehler: "Bitte geben Sie einen Titel ein."
handlePdfExport('   '); // ❌ Fehler: Whitespace nicht erlaubt
handlePdfExport('Titel'); // ✅ OK
```

**Toast-Meldungen:**
```tsx
import { toastService } from '@/lib/utils/toast';

// Automatisch durch Hook
toastService.error('Bitte geben Sie einen Titel für die Pressemitteilung ein.');
toastService.success('PDF erfolgreich erstellt');
```

### Netzwerk-Fehler

**Folder-Loading:**
```tsx
<FolderSelectorDialog
  // Zeigt automatisch Loading-State
  // Zeigt automatisch Fehler-State
/>
```

**Fehler-Handling in Component:**
```tsx
try {
  const folders = await mediaService.getFolders(orgId);
} catch (error) {
  console.error('Fehler beim Laden der Ordner:', error);
  // UI zeigt automatisch "Keine Ordner" State
}
```

### Type-Safety

**TypeScript-Validierung:**
```tsx
// ✅ RICHTIG - Alle erforderlichen Props
<CampaignContentComposer
  organizationId="org-123"
  title={title}
  onTitleChange={setTitle}
  mainContent={content}
  onMainContentChange={setContent}
  onFullContentChange={setFullContent}
/>

// ❌ FEHLER - Props fehlen
<CampaignContentComposer
  organizationId="org-123"
  // TypeScript-Error: title, onTitleChange, etc. fehlen
/>
```

**Section-Type-Validation:**
```tsx
// ✅ RICHTIG - Korrekte Section-Typen
const section: BoilerplateSection = {
  id: '1',
  type: 'lead', // ✅ Valider Type
  order: 0,
  isLocked: false,
  isCollapsed: false,
  content: '<p>Content</p>',
};

// ❌ FEHLER - Ungültiger Type
const badSection: BoilerplateSection = {
  type: 'invalid', // ❌ TypeScript-Error
  // ...
};
```

## Best Practices

### 1. Props-Memoization

**Parent-Component:**
```tsx
function ParentComponent() {
  const [sections, setSections] = useState<BoilerplateSection[]>([]);

  // ✅ RICHTIG - Callback memoizen
  const handleSectionsChange = useCallback((newSections: BoilerplateSection[]) => {
    setSections(newSections);
  }, []);

  return (
    <CampaignContentComposer
      onBoilerplateSectionsChange={handleSectionsChange}
      {...otherProps}
    />
  );
}

// ❌ FALSCH - Inline-Funktion
function BadParent() {
  return (
    <CampaignContentComposer
      onBoilerplateSectionsChange={(sections) => setSections(sections)}
      {...otherProps}
    />
  );
}
```

### 2. Conditional Rendering

**UI-Optionen nutzen:**
```tsx
// ✅ RICHTIG - Props verwenden
<CampaignContentComposer
  hideMainContentField={mode === 'preview'}
  hideBoilerplates={mode === 'simple'}
  readOnlyTitle={!canEdit}
  {...otherProps}
/>

// ❌ FALSCH - Conditional Mounting
{mode === 'preview' ? (
  <PreviewComponent />
) : (
  <EditComponent />
)}
```

### 3. Error-Boundaries

**Robuste Error-Handling:**
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <CampaignContentComposer {...props} />
    </ErrorBoundary>
  );
}
```

### 4. Loading-States

**Initial-Loading:**
```tsx
function CampaignEditor({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading } = useCampaign(campaignId);

  if (isLoading) {
    return <Spinner />;
  }

  if (!campaign) {
    return <NotFound />;
  }

  return (
    <CampaignContentComposer
      organizationId={campaign.organizationId}
      title={campaign.title}
      {...otherProps}
    />
  );
}
```

### 5. TypeScript-Generics

**Type-Safe-Handlers:**
```tsx
// ✅ RICHTIG - Type-Safe
const handleTitleChange: (title: string) => void = (title) => {
  setTitle(title);
  // TypeScript validiert Type
};

<CampaignContentComposer
  onTitleChange={handleTitleChange}
  {...otherProps}
/>

// ❌ FALSCH - Any-Type
const handleTitleChange = (title: any) => {
  setTitle(title); // Keine Type-Validierung
};
```

## Verwandte Dokumentation

### Detaillierte API-Dokumentation
- [CampaignContentComposer API](./CampaignContentComposer.md)
- [usePDFGeneration API](./usePDFGeneration.md)
- [useBoilerplateProcessing API](./useBoilerplateProcessing.md)
- [FolderSelectorDialog API](./FolderSelectorDialog.md)

### Guides
- [Getting Started Guide](../guides/getting-started.md)
- [Integration Guide](../guides/integration-guide.md)
- [Testing Guide](../guides/testing-guide.md)

### Architektur
- [Component Structure](../architecture/component-structure.md)
- [Data Flow](../architecture/data-flow.md)
- [Performance](../architecture/performance.md)

---

**Dokumentation erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)

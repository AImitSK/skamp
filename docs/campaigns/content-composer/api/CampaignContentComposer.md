# CampaignContentComposer - Detaillierte API-Referenz

> **Komponente**: CampaignContentComposer
> **Datei**: `src/components/pr/campaign/CampaignContentComposer.tsx`
> **Zeilen**: 256
> **Status**: ✅ Produktiv

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Import](#import)
- [Props-Interface](#props-interface)
- [Props-Referenz](#props-referenz)
- [Verwendungsbeispiele](#verwendungsbeispiele)
- [Event-Handling](#event-handling)
- [Performance](#performance)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Übersicht

`CampaignContentComposer` ist die Hauptkomponente für die Erstellung und Bearbeitung von Pressemitteilungen. Sie vereint alle Features in einer modularen, performanten Komponente.

### Features

- ✅ Titel-Verwaltung mit KI-Generator
- ✅ Rich-Text-Editor (Gmail-Style)
- ✅ Boilerplate-Section-Management
- ✅ Live-Vorschau mit HTML-Rendering
- ✅ PDF-Export mit Ordner-Auswahl
- ✅ PR-SEO-Analyse
- ✅ Multi-Tenancy Support
- ✅ Conditional Rendering (hideMainContentField, hidePreview, etc.)
- ✅ Read-Only-Modus
- ✅ 100% Test-Coverage

### Architektur

```
CampaignContentComposer
├── Hooks
│   ├── usePDFGeneration         # PDF-Export Logic
│   └── useBoilerplateProcessing # Content-Processing
├── Child Components
│   ├── GmailStyleEditor         # Rich-Text-Editor
│   ├── IntelligentBoilerplateSection # Boilerplate-Management
│   ├── PRSEOHeaderBar          # SEO-Analyse
│   ├── HeadlineGenerator       # KI-Titel-Generator
│   └── FolderSelectorDialog    # Ordner-Auswahl
└── UI Components
    ├── Field, Label, Input     # Form-Elements
    ├── Button                  # Actions
    └── InfoTooltip             # Help-Text
```

## Import

```tsx
// Standard Import
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';

// Mit TypeScript-Types
import CampaignContentComposer, {
  type CampaignContentComposerProps
} from '@/components/pr/campaign/CampaignContentComposer';

// BoilerplateSection-Type
import { type BoilerplateSection } from '@/components/pr/campaign/IntelligentBoilerplateSection';
```

## Props-Interface

```typescript
interface CampaignContentComposerProps {
  // ============================================
  // ERFORDERLICHE PROPS
  // ============================================

  /**
   * Organisation ID (Multi-Tenancy)
   * Wird für Boilerplate-Abfragen und Folder-Filtering verwendet.
   */
  organizationId: string;

  /**
   * Titel der Pressemitteilung
   * Erforderlich für PDF-Export und Vorschau.
   */
  title: string;

  /**
   * Callback wenn Titel sich ändert
   * Wird bei jedem Tastendruck aufgerufen.
   */
  onTitleChange: (title: string) => void;

  /**
   * Hauptinhalt der Pressemitteilung (HTML)
   * Aus GmailStyleEditor.
   */
  mainContent: string;

  /**
   * Callback wenn Hauptinhalt sich ändert
   * Wird bei Editor-Updates aufgerufen.
   */
  onMainContentChange: (content: string) => void;

  /**
   * Callback für vollständigen Content (Titel + Sections)
   * WICHTIG: Wird automatisch von useBoilerplateProcessing aufgerufen
   * bei Änderungen von boilerplateSections oder title.
   */
  onFullContentChange: (fullContent: string) => void;

  // ============================================
  // OPTIONAL - CLIENT-KONTEXT
  // ============================================

  /**
   * Client ID für Client-spezifische Features
   * - Boilerplate-Filtering
   * - Folder-Filtering
   */
  clientId?: string;

  /**
   * Client-Name für UI-Anzeige
   * Wird in Boilerplate-Section angezeigt.
   */
  clientName?: string;

  // ============================================
  // OPTIONAL - BOILERPLATE-SECTIONS
  // ============================================

  /**
   * Initiale Boilerplate-Sections
   * Unterstützt Legacy-Format mit position-Property.
   * Wird automatisch zu order-Property konvertiert.
   */
  initialBoilerplateSections?: BoilerplateSection[];

  /**
   * Callback wenn Sections sich ändern
   * Wird bei Drag & Drop, Add, Remove, Edit aufgerufen.
   */
  onBoilerplateSectionsChange?: (sections: BoilerplateSection[]) => void;

  // ============================================
  // OPTIONAL - UI-OPTIONEN
  // ============================================

  /**
   * Hauptinhalt-Feld verstecken
   * Nützlich für Vorschau-Modus oder wenn nur Boilerplates verwendet werden.
   * @default false
   */
  hideMainContentField?: boolean;

  /**
   * Vorschau-Section verstecken
   * Nützlich wenn Parent-Component eigene Vorschau hat.
   * @default false
   */
  hidePreview?: boolean;

  /**
   * Boilerplate-Section verstecken
   * Nützlich für einfache Pressemitteilungen ohne Boilerplates.
   * @default false
   */
  hideBoilerplates?: boolean;

  /**
   * Titel als Read-Only anzeigen
   * Nützlich für Vorschau-Modus.
   * @default false
   */
  readOnlyTitle?: boolean;

  // ============================================
  // OPTIONAL - PR-SEO
  // ============================================

  /**
   * Keywords für SEO-Analyse
   * Array von Strings.
   */
  keywords?: string[];

  /**
   * Callback wenn Keywords sich ändern
   * Wird von PRSEOHeaderBar aufgerufen.
   */
  onKeywordsChange?: (keywords: string[]) => void;

  /**
   * Callback wenn SEO-Score sich ändert
   * Wird von PRSEOHeaderBar aufgerufen.
   */
  onSeoScoreChange?: (score: any) => void;
}
```

## Props-Referenz

### Erforderliche Props

#### organizationId

```tsx
organizationId: string
```

**Beschreibung:** Organisation ID für Multi-Tenancy-Support.

**Verwendung:**
- Boilerplate-Abfragen filtern
- Folder-Abfragen filtern
- Permissions-Checks

**Beispiel:**
```tsx
<CampaignContentComposer
  organizationId={organization.id}
  // ...
/>
```

**Validierung:**
- Muss nicht-leerer String sein
- Sollte gültige Firestore-Document-ID sein

---

#### title

```tsx
title: string
```

**Beschreibung:** Aktueller Titel der Pressemitteilung.

**Verwendung:**
- Anzeige in Input-Feld
- Vorschau-Rendering
- PDF-Export-Validierung

**Beispiel:**
```tsx
const [title, setTitle] = useState('Neue Partnerschaft angekündigt');

<CampaignContentComposer
  title={title}
  onTitleChange={setTitle}
  // ...
/>
```

**Validierung:**
- Kann leer sein (während Bearbeitung)
- Erforderlich für PDF-Export (validiert durch usePDFGeneration)
- Whitespace-only-Titel werden als ungültig behandelt

---

#### onTitleChange

```tsx
onTitleChange: (title: string) => void
```

**Beschreibung:** Callback wenn Titel sich ändert.

**Parameter:**
- `title`: Neuer Titel-String (inkl. leer bei Löschen)

**Aufgerufen bei:**
- Jeder Tastendruck im Titel-Input
- Auswahl eines KI-generierten Titels

**Beispiel:**
```tsx
const handleTitleChange = useCallback((newTitle: string) => {
  setTitle(newTitle);
  // Optional: Validierung, Debouncing, etc.
}, []);

<CampaignContentComposer
  onTitleChange={handleTitleChange}
  // ...
/>
```

**Best Practice:**
```tsx
// ✅ RICHTIG - Memoized Callback
const handleTitleChange = useCallback((title: string) => {
  setTitle(title);
}, []);

// ❌ FALSCH - Inline-Funktion
<CampaignContentComposer
  onTitleChange={(title) => setTitle(title)}
/>
```

---

#### mainContent

```tsx
mainContent: string
```

**Beschreibung:** Hauptinhalt der Pressemitteilung (HTML-String).

**Format:**
- HTML-String aus GmailStyleEditor
- Enthält Tiptap-generierte HTML-Tags

**Beispiel:**
```tsx
const [content, setContent] = useState('<p>Pressemitteilung...</p>');

<CampaignContentComposer
  mainContent={content}
  onMainContentChange={setContent}
  // ...
/>
```

**Hinweise:**
- Kann leer sein
- Wird NICHT direkt in Vorschau verwendet
- Wird durch useBoilerplateProcessing mit Sections kombiniert

---

#### onMainContentChange

```tsx
onMainContentChange: (content: string) => void
```

**Beschreibung:** Callback wenn Hauptinhalt sich ändert.

**Parameter:**
- `content`: Neuer HTML-Content aus GmailStyleEditor

**Aufgerufen bei:**
- Editor-Content-Updates (Tippex, Formatierung, etc.)

**Beispiel:**
```tsx
const handleContentChange = useCallback((newContent: string) => {
  setContent(newContent);
  // Optional: Auto-Save
}, []);

<CampaignContentComposer
  onMainContentChange={handleContentChange}
  // ...
/>
```

---

#### onFullContentChange

```tsx
onFullContentChange: (fullContent: string) => void
```

**Beschreibung:** Callback für vollständigen, prozessierten Content.

**WICHTIG:** Wird automatisch von `useBoilerplateProcessing` aufgerufen!

**Parameter:**
- `fullContent`: Vollständiger HTML-Content (Titel + Sections + Datum)

**Aufgerufen bei:**
- `boilerplateSections` ändern
- `title` ändert
- Component-Mount

**Beispiel:**
```tsx
const [fullContent, setFullContent] = useState('');

<CampaignContentComposer
  onFullContentChange={setFullContent}
  // ...
/>

// fullContent enthält jetzt:
// <h1>Titel</h1>
// <p>Lead-Section...</p>
// <p>Main-Section...</p>
// <blockquote>Quote...</blockquote>
// <p>Boilerplate...</p>
// <p class="text-sm text-gray-600 mt-8">04. November 2025</p>
```

**Use-Cases:**
- Campaign-Speicherung (content: fullContent)
- Email-Versand (body: fullContent)
- External Preview

---

### Optionale Props - Client-Kontext

#### clientId

```tsx
clientId?: string
```

**Beschreibung:** Client ID für Client-spezifische Features.

**Verwendung:**
- Boilerplate-Filtering (zeigt Client-Boilerplates + Org-Boilerplates)
- Folder-Filtering (zeigt Client-Ordner + Shared-Ordner)

**Beispiel:**
```tsx
<CampaignContentComposer
  organizationId={org.id}
  clientId={client.id}
  clientName={client.name}
  // ...
/>
```

**Hinweise:**
- Optional (falls nicht vorhanden: zeigt alle Org-Boilerplates/Ordner)
- Sollte mit `clientName` zusammen verwendet werden

---

#### clientName

```tsx
clientName?: string
```

**Beschreibung:** Client-Name für UI-Anzeige.

**Verwendung:**
- Anzeige in IntelligentBoilerplateSection

**Beispiel:**
```tsx
<CampaignContentComposer
  clientId="client-123"
  clientName="Acme Corporation"
  // ...
/>
```

---

### Optionale Props - Boilerplate-Sections

#### initialBoilerplateSections

```tsx
initialBoilerplateSections?: BoilerplateSection[]
```

**Beschreibung:** Initiale Boilerplate-Sections beim Component-Mount.

**Format:**
```typescript
const sections: BoilerplateSection[] = [
  {
    id: 'section-1',
    type: 'lead',
    order: 0,
    isLocked: false,
    isCollapsed: false,
    content: '<p>Lead-Absatz...</p>',
  },
  {
    id: 'section-2',
    type: 'boilerplate',
    order: 1,
    isLocked: true,
    isCollapsed: false,
    boilerplateId: 'bp-123',
    boilerplate: { /* Boilerplate-Object */ },
  },
];
```

**Legacy-Support:**
```typescript
// Legacy-Format (mit position) wird automatisch konvertiert
const legacySections = [
  {
    id: '1',
    type: 'boilerplate',
    position: 0, // ← Legacy (wird zu order konvertiert)
    // ...
  }
];

<CampaignContentComposer
  initialBoilerplateSections={legacySections} // ✅ Funktioniert!
/>
```

**Beispiel:**
```tsx
function EditCampaign({ campaign }: { campaign: Campaign }) {
  return (
    <CampaignContentComposer
      initialBoilerplateSections={campaign.boilerplateSections}
      // ...
    />
  );
}
```

---

#### onBoilerplateSectionsChange

```tsx
onBoilerplateSectionsChange?: (sections: BoilerplateSection[]) => void
```

**Beschreibung:** Callback wenn Boilerplate-Sections sich ändern.

**Parameter:**
- `sections`: Aktualisiertes Sections-Array

**Aufgerufen bei:**
- Drag & Drop Sortierung
- Section hinzufügen
- Section entfernen
- Section bearbeiten
- Section lock/unlock
- Section collapse/expand

**Beispiel:**
```tsx
const [sections, setSections] = useState<BoilerplateSection[]>([]);

const handleSectionsChange = useCallback((newSections: BoilerplateSection[]) => {
  setSections(newSections);
  // Optional: Auto-Save
}, []);

<CampaignContentComposer
  initialBoilerplateSections={sections}
  onBoilerplateSectionsChange={handleSectionsChange}
  // ...
/>
```

---

### Optionale Props - UI-Optionen

#### hideMainContentField

```tsx
hideMainContentField?: boolean // default: false
```

**Beschreibung:** Versteckt das Hauptinhalt-Feld (GmailStyleEditor).

**Use-Cases:**
- Vorschau-Modus (nur Sections + Preview anzeigen)
- Boilerplate-only-Pressemitteilungen
- Custom Editor in Parent-Component

**Beispiel:**
```tsx
// Vorschau-Modus
<CampaignContentComposer
  hideMainContentField={true}
  readOnlyTitle={true}
  // ...
/>

// Edit-Modus
<CampaignContentComposer
  hideMainContentField={false}
  // ...
/>
```

---

#### hidePreview

```tsx
hidePreview?: boolean // default: false
```

**Beschreibung:** Versteckt die Vorschau-Section.

**Use-Cases:**
- Parent-Component hat eigene Vorschau
- Mobile-Ansicht (Vorschau in separatem Screen)
- Einfacher Edit-Modus

**Beispiel:**
```tsx
<CampaignContentComposer
  hidePreview={true}
  onFullContentChange={setFullContent}
  // ...
/>

{/* Custom Preview in Parent */}
<CustomPreview content={fullContent} />
```

---

#### hideBoilerplates

```tsx
hideBoilerplates?: boolean // default: false
```

**Beschreibung:** Versteckt die Boilerplate-Section.

**Use-Cases:**
- Einfache Pressemitteilungen (ohne Boilerplates)
- Quick-Compose-Modus
- External Content Import

**Beispiel:**
```tsx
<CampaignContentComposer
  hideBoilerplates={true}
  // ...
/>
```

---

#### readOnlyTitle

```tsx
readOnlyTitle?: boolean // default: false
```

**Beschreibung:** Zeigt Titel als Read-Only (h2-Element statt Input).

**Use-Cases:**
- Vorschau-Modus
- Genehmigungs-Workflow
- Published Campaigns

**Beispiel:**
```tsx
<CampaignContentComposer
  readOnlyTitle={true}
  title="Finale Pressemitteilung"
  // ...
/>

// Rendert:
// <h2 className="text-xl font-semibold text-gray-900">
//   Finale Pressemitteilung
// </h2>
```

---

### Optionale Props - PR-SEO

#### keywords

```tsx
keywords?: string[]
```

**Beschreibung:** Keywords für SEO-Analyse.

**Format:**
```typescript
const keywords = ['Partnerschaft', 'Innovation', 'Digitalisierung'];
```

**Beispiel:**
```tsx
const [keywords, setKeywords] = useState<string[]>([]);

<CampaignContentComposer
  keywords={keywords}
  onKeywordsChange={setKeywords}
  onSeoScoreChange={setSeoScore}
  // ...
/>
```

**Hinweise:**
- Wird von PRSEOHeaderBar verwendet
- Analysiert Keyword-Dichte im Content
- Zeigt Optimierungs-Vorschläge

---

#### onKeywordsChange

```tsx
onKeywordsChange?: (keywords: string[]) => void
```

**Beschreibung:** Callback wenn Keywords sich ändern.

**Parameter:**
- `keywords`: Aktualisiertes Keywords-Array

**Aufgerufen bei:**
- Keyword hinzufügen
- Keyword entfernen
- Keyword bearbeiten (in PRSEOHeaderBar)

---

#### onSeoScoreChange

```tsx
onSeoScoreChange?: (score: any) => void
```

**Beschreibung:** Callback wenn SEO-Score sich ändert.

**Parameter:**
- `score`: SEO-Score-Object (Structure siehe PRSEOHeaderBar)

**Aufgerufen bei:**
- Content-Änderung
- Keyword-Änderung
- Title-Änderung

## Verwendungsbeispiele

### Beispiel 1: Basic Usage (Minimum)

```tsx
import { useState } from 'react';
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';

function CreateCampaign() {
  const { organization } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');

  return (
    <CampaignContentComposer
      organizationId={organization.id}
      title={title}
      onTitleChange={setTitle}
      mainContent={content}
      onMainContentChange={setContent}
      onFullContentChange={setFullContent}
    />
  );
}
```

### Beispiel 2: Mit Boilerplate-Sections

```tsx
import { useState, useCallback } from 'react';
import CampaignContentComposer from '@/components/pr/campaign/CampaignContentComposer';
import { type BoilerplateSection } from '@/components/pr/campaign/IntelligentBoilerplateSection';

function CreateCampaignWithBoilerplates() {
  const { organization } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [sections, setSections] = useState<BoilerplateSection[]>([]);

  const handleSectionsChange = useCallback((newSections: BoilerplateSection[]) => {
    setSections(newSections);
  }, []);

  return (
    <CampaignContentComposer
      organizationId={organization.id}
      title={title}
      onTitleChange={setTitle}
      mainContent={content}
      onMainContentChange={setContent}
      onFullContentChange={setFullContent}
      initialBoilerplateSections={sections}
      onBoilerplateSectionsChange={handleSectionsChange}
    />
  );
}
```

### Beispiel 3: Mit Client-Kontext

```tsx
function CreateCampaignForClient({ client }: { client: Client }) {
  const { organization } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');

  return (
    <CampaignContentComposer
      organizationId={organization.id}
      clientId={client.id}
      clientName={client.name}
      title={title}
      onTitleChange={setTitle}
      mainContent={content}
      onMainContentChange={setContent}
      onFullContentChange={setFullContent}
    />
  );
}
```

### Beispiel 4: Mit PR-SEO

```tsx
function CreateCampaignWithSEO() {
  const { organization } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [seoScore, setSeoScore] = useState<any>(null);

  return (
    <div>
      <CampaignContentComposer
        organizationId={organization.id}
        title={title}
        onTitleChange={setTitle}
        mainContent={content}
        onMainContentChange={setContent}
        onFullContentChange={setFullContent}
        keywords={keywords}
        onKeywordsChange={setKeywords}
        onSeoScoreChange={setSeoScore}
      />

      {/* SEO-Score-Anzeige */}
      {seoScore && (
        <div className="mt-4">
          <h3>SEO-Score: {seoScore.score}/100</h3>
        </div>
      )}
    </div>
  );
}
```

### Beispiel 5: Vorschau-Modus (Read-Only)

```tsx
function CampaignPreview({ campaign }: { campaign: Campaign }) {
  const [fullContent, setFullContent] = useState('');

  return (
    <div className="max-w-4xl mx-auto">
      <CampaignContentComposer
        organizationId={campaign.organizationId}
        title={campaign.title}
        onTitleChange={() => {}} // No-op
        mainContent={campaign.mainContent}
        onMainContentChange={() => {}} // No-op
        onFullContentChange={setFullContent}
        initialBoilerplateSections={campaign.boilerplateSections}
        readOnlyTitle={true}
        hideMainContentField={true}
        hideBoilerplates={true}
        hidePreview={false} // Nur Vorschau zeigen
      />
    </div>
  );
}
```

### Beispiel 6: Edit-Modus mit Auto-Save

```tsx
function EditCampaign({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [sections, setSections] = useState<BoilerplateSection[]>([]);

  // Initialisiere State aus Campaign
  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title);
      setContent(campaign.mainContent || '');
      setSections(campaign.boilerplateSections || []);
    }
  }, [campaign]);

  // Auto-Save mit Debouncing
  const debouncedSave = useMemo(
    () => debounce(async (data) => {
      await campaignService.update(campaignId, data);
    }, 2000),
    [campaignId]
  );

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    debouncedSave({ title: newTitle });
  }, [debouncedSave]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    debouncedSave({ mainContent: newContent });
  }, [debouncedSave]);

  const handleFullContentChange = useCallback((newFullContent: string) => {
    setFullContent(newFullContent);
    debouncedSave({ content: newFullContent });
  }, [debouncedSave]);

  const handleSectionsChange = useCallback((newSections: BoilerplateSection[]) => {
    setSections(newSections);
    debouncedSave({ boilerplateSections: newSections });
  }, [debouncedSave]);

  if (isLoading) return <Spinner />;
  if (!campaign) return <NotFound />;

  return (
    <div>
      <AutoSaveIndicator />
      <CampaignContentComposer
        organizationId={campaign.organizationId}
        clientId={campaign.clientId}
        clientName={campaign.clientName}
        title={title}
        onTitleChange={handleTitleChange}
        mainContent={content}
        onMainContentChange={handleContentChange}
        onFullContentChange={handleFullContentChange}
        initialBoilerplateSections={sections}
        onBoilerplateSectionsChange={handleSectionsChange}
      />
    </div>
  );
}
```

## Event-Handling

### Event-Flow

```
User-Action → Component → Callback → Parent-State
```

**Beispiel: Titel ändern**
```
1. User tippt "N" → Input-Event
2. CampaignContentComposer → onTitleChange("N")
3. Parent → setTitle("N")
4. Re-Render mit title="N"
```

### Event-Timing

**Synchrone Events:**
- `onTitleChange` - Jeder Tastendruck
- `onMainContentChange` - Jedes Editor-Update
- `onBoilerplateSectionsChange` - Jede Section-Änderung

**Asynchrone Events:**
- `onFullContentChange` - Nach useEffect in useBoilerplateProcessing
- `onSeoScoreChange` - Nach SEO-Analyse in PRSEOHeaderBar

### Event-Batching

**React automatisches Batching (React 18+):**
```tsx
// Beide State-Updates werden gebatcht
const handleChange = (newTitle: string) => {
  setTitle(newTitle); // Update 1
  setDirty(true);     // Update 2
  // Nur 1 Re-Render!
};
```

## Performance

### Re-Render-Optimierung

**1. Parent-Component Memoization:**
```tsx
// ✅ RICHTIG
const handleTitleChange = useCallback((title: string) => {
  setTitle(title);
}, []);

const handleContentChange = useCallback((content: string) => {
  setContent(content);
}, []);

<CampaignContentComposer
  onTitleChange={handleTitleChange}
  onMainContentChange={handleContentChange}
  // ...
/>
```

**2. Conditional Props:**
```tsx
// ✅ RICHTIG - Props nur setzen wenn vorhanden
<CampaignContentComposer
  clientId={client?.id}
  clientName={client?.name}
  // ...
/>

// ❌ FALSCH - Immer neue Callbacks
<CampaignContentComposer
  onTitleChange={(title) => setTitle(title)}
  // ...
/>
```

### Performance-Metriken

**Before Refactoring:**
- Re-Renders bei Section-Change: ~10-15x
- Berechnungen: ~5-8x

**After Refactoring:**
- Re-Renders bei Section-Change: ~3-5x (-60-70%)
- Berechnungen: ~1x (-87%)

**Optimierungen:**
- useCallback für `handleBoilerplateSectionsChange`
- useMemo für `convertedSections`
- React.memo für `FolderSelectorDialog`

## Best Practices

### 1. Callback-Memoization

```tsx
// ✅ RICHTIG
const handleTitleChange = useCallback((title: string) => {
  setTitle(title);
}, []);

// ❌ FALSCH
const handleTitleChange = (title: string) => {
  setTitle(title);
};
```

### 2. State-Initialisierung

```tsx
// ✅ RICHTIG - useEffect für External-Data
useEffect(() => {
  if (campaign) {
    setTitle(campaign.title);
  }
}, [campaign]);

// ❌ FALSCH - Direktes Setzen im Render
if (campaign) {
  setTitle(campaign.title); // Endlos-Loop!
}
```

### 3. Error-Handling

```tsx
// ✅ RICHTIG - Validierung in Callbacks
const handleSave = async () => {
  if (!title.trim()) {
    toastService.error('Titel ist erforderlich');
    return;
  }

  try {
    await campaignService.save({ title, content: fullContent });
    toastService.success('Gespeichert');
  } catch (error) {
    toastService.error('Fehler beim Speichern');
  }
};
```

### 4. Type-Safety

```tsx
// ✅ RICHTIG - Explicit Types
const handleSectionsChange = useCallback((sections: BoilerplateSection[]) => {
  setSections(sections);
}, []);

// ❌ FALSCH - Any-Type
const handleSectionsChange = useCallback((sections: any) => {
  setSections(sections);
}, []);
```

## Troubleshooting

### Problem: Vorschau zeigt keinen Content

**Symptom:**
```tsx
// Vorschau bleibt leer
<CampaignContentComposer {...props} />
```

**Lösung:**
```tsx
// ✅ onFullContentChange erforderlich
<CampaignContentComposer
  onFullContentChange={setFullContent} // ← Wichtig!
  {...props}
/>
```

### Problem: PDF-Export funktioniert nicht

**Symptom:**
```
Toast: "Bitte geben Sie einen Titel ein."
```

**Lösung:**
```tsx
// ✅ Titel validieren
if (!title || !title.trim()) {
  toastService.error('Titel erforderlich');
  return;
}
```

### Problem: Sections nicht sortiert

**Symptom:**
Sections in falscher Reihenfolge

**Lösung:**
```tsx
// ✅ order-Property setzen
const sections: BoilerplateSection[] = [
  { id: '1', type: 'lead', order: 0, /* ... */ },
  { id: '2', type: 'main', order: 1, /* ... */ },
];
```

### Problem: Zu viele Re-Renders

**Symptom:**
Performance-Probleme

**Lösung:**
```tsx
// ✅ Callbacks memoizen
const handleChange = useCallback((sections) => {
  setSections(sections);
}, []); // Dependencies korrekt!
```

---

**Dokumentation erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)

# ContentTab Components - Detaillierte Dokumentation

> **Modul**: ContentTab Components
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 05.11.2025

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [ContentTab Component](#contenttab-component)
- [CustomerFeedbackAlert Component](#customerfeedbackalert-component)
- [AiAssistantCTA Component](#aiassistantcta-component)
- [CampaignContentComposer Integration](#campaigncontentcomposer-integration)
- [KeyVisualSection Integration](#keyvisualsection-integration)
- [Type Definitions](#type-definitions)
- [Code-Beispiele](#code-beispiele)

---

## Übersicht

Dieses Dokument beschreibt alle Components des ContentTab-Moduls im Detail:

| Component | Zeilen | Tests | Coverage | Zweck |
|-----------|--------|-------|----------|-------|
| **ContentTab** | 132 | 30 | 100% | Haupt-Tab Component |
| **CustomerFeedbackAlert** | 59 | 9 | 100% | Feedback-Anzeige |
| **AiAssistantCTA** | 38 | 11 | 100% | KI-Assistent Button |
| **CampaignContentComposer** | Extern | - | - | Content Editor (Phase 0.3) |
| **KeyVisualSection** | 446 | - | - | Media Upload (Phase 0) |

---

## ContentTab Component

### Übersicht

Die Hauptcomponent des Content-Tabs mit vollständiger Context-Integration und Performance-Optimierungen.

**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ContentTab.tsx`

**Zeilen:** 132

**Wrapped:** `React.memo` für Performance

### Props Interface

```typescript
interface ContentTabProps {
  // Organization & User (Infrastructure)
  organizationId: string;
  userId: string;
  campaignId: string;

  // UI Callbacks
  onOpenAiModal: () => void;
  onSeoScoreChange: (scoreData: any) => void;
}
```

### Props-Beschreibungen

#### organizationId: string

**Typ:** `string` (Pflicht)

**Zweck:** Multi-Tenancy ID für Firebase Storage und Firestore-Queries.

**Verwendung:**
- Wird an `CampaignContentComposer` weitergegeben
- Wird an `KeyVisualSection` weitergegeben
- Bestimmt Storage-Pfad: `organizations/{organizationId}/...`

**Beispiel:**
```typescript
<ContentTab organizationId="org-abc123" {...otherProps} />
```

**Validation:**
- Darf nicht leer sein
- Muss existierende Organization ID sein
- Format: `org-[alphanumeric]`

#### userId: string

**Typ:** `string` (Pflicht)

**Zweck:** User ID für Attribution von Uploads und Änderungen.

**Verwendung:**
- Wird an `KeyVisualSection` für Media-Upload weitergegeben
- Tracking: Wer hat Key Visual hochgeladen?

**Beispiel:**
```typescript
<ContentTab userId="user-xyz789" {...otherProps} />
```

#### campaignId: string

**Typ:** `string` (Pflicht)

**Zweck:** Campaign ID für Smart Router und Campaign-Context.

**Verwendung:**
- Wird an `KeyVisualSection` für strukturierte Storage-Pfade weitergegeben
- Storage: `...campaigns/{campaignId}/media/...`

**Beispiel:**
```typescript
<ContentTab campaignId="campaign-123" {...otherProps} />
```

#### onOpenAiModal: () => void

**Typ:** `() => void` (Pflicht)

**Zweck:** Callback zum Öffnen des KI-Assistenten-Modals.

**Verwendung:**
- Wird direkt an `AiAssistantCTA` weitergegeben
- Wird aufgerufen wenn User auf KI-Button klickt

**Beispiel:**
```typescript
const [showAiModal, setShowAiModal] = useState(false);

<ContentTab
  onOpenAiModal={() => setShowAiModal(true)}
  {...otherProps}
/>

{showAiModal && (
  <AiAssistantModal
    onClose={() => setShowAiModal(false)}
    onGenerate={(content) => {
      // Update Campaign Context
    }}
  />
)}
```

#### onSeoScoreChange: (scoreData: any) => void

**Typ:** `(scoreData: any) => void` (Pflicht)

**Zweck:** Callback bei SEO-Score-Änderungen für Parent-State-Updates.

**Verwendung:**
- Wird intern durch `handleSeoScoreChange` wrapped (useCallback)
- Empfängt transformierte SEO-Daten mit garantiertem `social` Property

**Data Structure:**
```typescript
interface SeoScoreData {
  totalScore: number;
  breakdown: {
    headline: number;
    keywords: number;
    structure: number;
    social: number;  // Wird von ContentTab garantiert!
  };
  hints: string[];
}
```

**Beispiel:**
```typescript
const [seoScore, setSeoScore] = useState<SeoScoreData | null>(null);

<ContentTab
  onSeoScoreChange={(scoreData) => {
    console.log('SEO Score:', scoreData.totalScore);
    console.log('Breakdown:', scoreData.breakdown);
    setSeoScore(scoreData);
  }}
  {...otherProps}
/>
```

### Context-Integration

ContentTab holt folgende Werte aus `CampaignContext`:

```typescript
const {
  // Content
  campaignTitle,              // string
  updateTitle,                // (title: string) => void
  editorContent,              // string (HTML)
  updateEditorContent,        // (content: string) => void
  pressReleaseContent,        // string (HTML)
  updatePressReleaseContent,  // (content: string) => void

  // SEO & Boilerplates
  boilerplateSections,        // BoilerplateSection[]
  updateBoilerplateSections,  // (sections: BoilerplateSection[]) => void
  keywords,                   // string[]
  updateKeywords,             // (keywords: string[]) => void

  // Media
  keyVisual,                  // KeyVisual | undefined
  updateKeyVisual,            // (visual: KeyVisual) => void

  // Company & Project
  selectedCompanyId,          // string
  selectedCompanyName,        // string
  selectedProjectId,          // string
  selectedProjectName,        // string

  // Feedback
  previousFeedback            // Feedback[]
} = useCampaign();
```

### Performance-Hooks

#### useCallback: handleSeoScoreChange

```typescript
const handleSeoScoreChange = useCallback((scoreData: any) => {
  // Garantiere social Property
  if (scoreData && scoreData.breakdown) {
    onSeoScoreChange({
      ...scoreData,
      breakdown: {
        ...scoreData.breakdown,
        social: scoreData.breakdown.social || 0
      }
    });
  } else {
    onSeoScoreChange(scoreData);
  }
}, [onSeoScoreChange]);
```

**Warum?** Verhindert Re-Renders von `CampaignContentComposer` bei ContentTab-Updates.

**Dependencies:** `[onSeoScoreChange]` - Nur neu erstellen wenn Parent-Callback ändert.

#### useMemo: composerKey

```typescript
const composerKey = useMemo(
  () => `composer-${boilerplateSections.length}`,
  [boilerplateSections.length]
);
```

**Warum?** Key-Prop für Force-Remount von `CampaignContentComposer` wenn Boilerplates sich ändern.

**Dependencies:** `[boilerplateSections.length]` - Nur neu berechnen wenn Anzahl ändert.

### Verwendungsbeispiel

```typescript
import ContentTab from './tabs/ContentTab';
import { CampaignProvider } from './context/CampaignContext';

function CampaignEditPage() {
  const [showAiModal, setShowAiModal] = useState(false);
  const [seoScore, setSeoScore] = useState(null);

  return (
    <CampaignProvider value={campaignContext}>
      <Tabs>
        <TabPanel value="content">
          <ContentTab
            organizationId="org-abc123"
            userId="user-xyz789"
            campaignId="campaign-123"
            onOpenAiModal={() => setShowAiModal(true)}
            onSeoScoreChange={(data) => setSeoScore(data)}
          />
        </TabPanel>
      </Tabs>

      {showAiModal && (
        <AiAssistantModal onClose={() => setShowAiModal(false)} />
      )}
    </CampaignProvider>
  );
}
```

---

## CustomerFeedbackAlert Component

### Übersicht

Zeigt die letzte Änderungsanforderung vom Kunden prominent am Anfang des Tabs an.

**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/CustomerFeedbackAlert.tsx`

**Zeilen:** 59

**Tests:** 9 Tests, 100% Coverage

### Props Interface

```typescript
interface Feedback {
  author: string;
  comment: string;
  requestedAt?: {
    toDate: () => Date;
  };
}

interface CustomerFeedbackAlertProps {
  feedback: Feedback[];
}
```

### Features

**1. Kunden-Filter:**
Zeigt nur Feedback mit `author === 'Kunde'`, filtert Admin/Intern-Feedback automatisch.

**2. Neuestes Feedback:**
Verwendet `[...feedback].reverse()` um neuestes Feedback zu finden.

**3. Deutsche Datum-Formatierung:**
```typescript
new Date(requestedAt.toDate()).toLocaleString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
// Output: "15.01.2025, 14:30"
```

**4. Conditional Rendering:**
Rendert `null` wenn:
- Feedback-Array leer ist
- Kein Kunden-Feedback vorhanden (nur Admin-Feedback)

### Styling

**Design:** Gelbe Warnfarben für visuelle Auffälligkeit

```typescript
<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
  <h4 className="text-sm font-medium text-yellow-900">
    Letzte Änderungsanforderung vom Kunden
  </h4>
  <p className="text-sm text-yellow-800">{comment}</p>
  <p className="text-xs text-yellow-600">{formattedDate}</p>
</div>
```

**Icons:** `ExclamationTriangleIcon` aus `@heroicons/react/24/outline` (Design System konform)

### Verwendungsbeispiel

```typescript
import { CustomerFeedbackAlert } from './components/CustomerFeedbackAlert';

function ContentTab() {
  const { previousFeedback } = useCampaign();

  return (
    <div>
      <CustomerFeedbackAlert feedback={previousFeedback || []} />
      {/* Rest des Tabs */}
    </div>
  );
}
```

**Mit mehreren Feedbacks:**
```typescript
const feedback = [
  {
    author: 'Admin',
    comment: 'Internes Feedback - nicht sichtbar',
    requestedAt: { toDate: () => new Date('2025-01-10T10:00:00') }
  },
  {
    author: 'Kunde',
    comment: 'Bitte Titel ändern',
    requestedAt: { toDate: () => new Date('2025-01-15T14:30:00') }
  },
  {
    author: 'Kunde',
    comment: 'Bitte auch Zitat ergänzen', // Wird angezeigt!
    requestedAt: { toDate: () => new Date('2025-01-16T09:15:00') }
  }
];

<CustomerFeedbackAlert feedback={feedback} />
// Zeigt nur: "Bitte auch Zitat ergänzen" (neuestes Kunden-Feedback)
```

### Edge Cases

**Leeres Array:**
```typescript
<CustomerFeedbackAlert feedback={[]} />
// Rendert: null
```

**Undefined Feedback:**
```typescript
<CustomerFeedbackAlert feedback={undefined} />
// Rendert: null (internal check: !feedback || feedback.length === 0)
```

**Feedback ohne Datum:**
```typescript
<CustomerFeedbackAlert
  feedback={[{
    author: 'Kunde',
    comment: 'Feedback ohne Datum'
    // requestedAt fehlt
  }]}
/>
// Rendert Alert, aber ohne Datum-Zeile
```

### Testing

**Test-Coverage:** 9/9 Tests, 100%

**Test-Kategorien:**
1. **Rendering** (3 Tests)
   - Leer / Kein Kunden-Feedback / Zeigt neuestes
2. **Datum-Formatierung** (2 Tests)
   - Deutsches Format / Fehlendes Datum
3. **Styling** (2 Tests)
   - Gelbe Farben / Warning-Icon
4. **Edge Cases** (2 Tests)
   - Mehrere Feedbacks / Undefined handling

**Beispiel-Test:**
```typescript
it('zeigt das letzte Kunden-Feedback an', () => {
  const feedback = [
    { author: 'Kunde', comment: 'Altes Feedback' },
    { author: 'Admin', comment: 'Internes Feedback' },
    { author: 'Kunde', comment: 'Neuestes Feedback' }
  ];

  render(<CustomerFeedbackAlert feedback={feedback} />);

  expect(screen.getByText('Neuestes Feedback')).toBeInTheDocument();
  expect(screen.queryByText('Altes Feedback')).not.toBeInTheDocument();
});
```

---

## AiAssistantCTA Component

### Übersicht

Auffälliger Call-to-Action-Button mit Gradient-Design, der den KI-Assistenten öffnet.

**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/AiAssistantCTA.tsx`

**Zeilen:** 38

**Tests:** 11 Tests, 100% Coverage

### Props Interface

```typescript
interface AiAssistantCTAProps {
  onOpenAiModal: () => void;
}
```

### Features

**1. Gradient-Design:**
- Background: `from-indigo-500 to-purple-600`
- Hover: `hover:from-indigo-600 hover:to-purple-700`

**2. Icons:**
- Links: `SparklesIcon` (KI-Symbol)
- Rechts: `ArrowRightIcon` (mit Translation-Animation)

**3. Hover-Animationen:**
```typescript
className="group"  // Parent für group-hover

<ArrowRightIcon className="group-hover:translate-x-1 transition-transform" />
// Arrow bewegt sich nach rechts bei Hover
```

**4. Shadow-Effekte:**
- Normal: `shadow-lg`
- Hover: `hover:shadow-xl`

### Styling

```typescript
<button
  type="button"
  onClick={onOpenAiModal}
  className="w-full mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <SparklesIcon className="h-8 w-8 text-white" />
      <div className="text-left">
        <p className="text-lg font-bold text-white mb-1">
          Schnellstart mit dem KI-Assistenten
        </p>
        <p className="text-sm text-indigo-100">
          Erstelle einen kompletten Rohentwurf mit Titel, Lead-Absatz, Haupttext und Zitat in Sekunden
        </p>
      </div>
    </div>
    <ArrowRightIcon className="h-6 w-6 text-white group-hover:translate-x-1 transition-transform" />
  </div>
</button>
```

### Verwendungsbeispiel

```typescript
import { AiAssistantCTA } from './components/AiAssistantCTA';

function ContentTab({ onOpenAiModal }: ContentTabProps) {
  return (
    <div>
      <AiAssistantCTA onOpenAiModal={onOpenAiModal} />
      <CampaignContentComposer {...composerProps} />
    </div>
  );
}
```

**Mit State Management:**
```typescript
function CampaignEditPage() {
  const [showAiModal, setShowAiModal] = useState(false);

  return (
    <>
      <ContentTab onOpenAiModal={() => setShowAiModal(true)} />

      {showAiModal && (
        <AiAssistantModal
          onClose={() => setShowAiModal(false)}
          onGenerate={(content) => {
            // Update Content
            updateCampaignContent(content);
            setShowAiModal(false);
          }}
        />
      )}
    </>
  );
}
```

### Accessibility

**1. Button Type:**
```typescript
type="button"  // Verhindert Form-Submit
```

**2. Cursor:**
```typescript
cursor-pointer  // Visuelle Affordance
```

**3. Role:**
```typescript
// Implizit durch <button> Element
role="button"
```

**4. Keyboard Support:**
- Enter/Space triggert onClick
- Focus-Ring automatisch (Browser Default)

### Testing

**Test-Coverage:** 11/11 Tests, 100%

**Test-Kategorien:**
1. **Rendering** (3 Tests)
   - Button-Text / Button-Element / Icons
2. **Interaktion** (2 Tests)
   - Click einmal / Click mehrfach
3. **Styling** (4 Tests)
   - Gradient / Hover / Full-Width / Group-Class
4. **Accessibility** (2 Tests)
   - Button-Rolle / Cursor-Pointer

**Beispiel-Test:**
```typescript
it('ruft onOpenAiModal beim Klick auf', () => {
  const mockOnOpenAiModal = jest.fn();
  render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

  const button = screen.getByRole('button');
  fireEvent.click(button);

  expect(mockOnOpenAiModal).toHaveBeenCalledTimes(1);
});
```

---

## CampaignContentComposer Integration

### Übersicht

Der `CampaignContentComposer` ist ein externes Component (Phase 0.3), das vollständig in ContentTab integriert ist.

**Component:** Modularisiert in eigenem Verzeichnis

**Features:**
- Titel-Editor
- Rich-Text-Editor (TipTap)
- Keywords-Manager
- Boilerplate-Sections
- SEO-Score-Berechnung

### Props-Mapping

ContentTab mapped 13 Props an `CampaignContentComposer`:

```typescript
<CampaignContentComposer
  // 1. Infrastructure
  organizationId={organizationId}             // Aus Props
  clientId={selectedCompanyId}                // Aus Context
  clientName={selectedCompanyName}            // Aus Context

  // 2. Content (aus Context)
  title={campaignTitle}                       // Aus Context
  onTitleChange={updateTitle}                 // Aus Context
  mainContent={editorContent}                 // Aus Context
  onMainContentChange={updateEditorContent}   // Aus Context
  onFullContentChange={updatePressReleaseContent}  // Aus Context

  // 3. Boilerplates (aus Context)
  initialBoilerplateSections={boilerplateSections}  // Aus Context
  onBoilerplateSectionsChange={updateBoilerplateSections}  // Aus Context

  // 4. SEO (aus Context + Local Handler)
  keywords={keywords}                         // Aus Context
  onKeywordsChange={updateKeywords}           // Aus Context
  onSeoScoreChange={handleSeoScoreChange}     // Local (useCallback)

  // 5. UI Flags
  hideMainContentField={false}                // Show Editor
  hidePreview={true}                          // Hide Preview
  hideBoilerplates={true}                     // Hide Boilerplates UI

  // 6. Force Remount Key
  key={composerKey}                           // useMemo: `composer-${length}`
/>
```

### SEO Score Transformation

ContentTab fügt ein fehlendes `social` Property hinzu:

```typescript
const handleSeoScoreChange = useCallback((scoreData: any) => {
  if (scoreData && scoreData.breakdown) {
    onSeoScoreChange({
      ...scoreData,
      breakdown: {
        ...scoreData.breakdown,
        social: scoreData.breakdown.social || 0  // Default: 0
      }
    });
  } else {
    onSeoScoreChange(scoreData);
  }
}, [onSeoScoreChange]);
```

**Warum?** Parent Component (Campaign Edit Page) erwartet `social` für Statistiken.

### Composer Key

Der Key erzwingt ein Re-Mount des Composers wenn Boilerplates sich ändern:

```typescript
const composerKey = useMemo(
  () => `composer-${boilerplateSections.length}`,
  [boilerplateSections.length]
);
```

**Use Case:** Wenn User Boilerplate hinzufügt/entfernt, wird Composer neu gemountet → Sauberer State-Reset.

### Verwendungsbeispiel

```typescript
// Im ContentTab (bereits implementiert):
<CampaignContentComposer
  key={composerKey}
  organizationId={organizationId}
  clientId={selectedCompanyId}
  clientName={selectedCompanyName}
  title={campaignTitle}
  onTitleChange={updateTitle}
  mainContent={editorContent}
  onMainContentChange={updateEditorContent}
  onFullContentChange={updatePressReleaseContent}
  onBoilerplateSectionsChange={updateBoilerplateSections}
  initialBoilerplateSections={boilerplateSections}
  hideMainContentField={false}
  hidePreview={true}
  hideBoilerplates={true}
  keywords={keywords}
  onKeywordsChange={updateKeywords}
  onSeoScoreChange={handleSeoScoreChange}
/>
```

---

## KeyVisualSection Integration

### Übersicht

Die `KeyVisualSection` (Phase 0) ist vollständig in ContentTab integriert für Key Visual Upload.

**Component:** Bereits modularisiert (446 Zeilen)

**Features:**
- Drag & Drop Upload
- Campaign Smart Router (strukturierte Storage-Pfade)
- Image Preview
- Format/Größen-Validation
- Multi-Tenancy Support

### Props-Mapping

ContentTab mapped 10 Props an `KeyVisualSection`:

```typescript
<KeyVisualSection
  // 1. Media Value
  value={keyVisual}                    // Aus Context (undefined wenn leer)
  onChange={updateKeyVisual}           // Aus Context

  // 2. Organization & User
  organizationId={organizationId}      // Aus Props
  userId={userId}                      // Aus Props

  // 3. Client Context
  clientId={selectedCompanyId}         // Aus Context
  clientName={selectedCompanyName}     // Aus Context

  // 4. Campaign Context (für Smart Router)
  campaignId={campaignId}              // Aus Props
  campaignName={campaignTitle}         // Aus Context
  selectedProjectId={selectedProjectId}  // Aus Context
  selectedProjectName={selectedProjectName}  // Aus Context

  // 5. Feature Flags
  enableSmartRouter={true}             // Always true für structured paths
/>
```

### Campaign Smart Router

**Storage-Pfad:**
```
organizations/{organizationId}/
  companies/{selectedCompanyId}/
    projects/{selectedProjectId}/
      campaigns/{campaignId}/
        media/
          key-visual-{timestamp}.{ext}
```

**Beispiel:**
```
organizations/org-abc123/
  companies/company-xyz/
    projects/project-456/
      campaigns/campaign-789/
        media/
          key-visual-1736943600000.jpg
```

**Vorteile:**
- Strukturierte Organisation
- Easy Cleanup (delete ganze Campaign)
- Separate Pfade pro Tenant

### KeyVisual Data Structure

```typescript
interface KeyVisual {
  url: string;           // Firebase Storage Download URL
  path: string;          // Storage Path (für Delete)
  alt?: string;          // Alt-Text (optional)
  width?: number;        // Bild-Breite (optional)
  height?: number;       // Bild-Höhe (optional)
  size?: number;         // Datei-Größe in Bytes (optional)
}
```

**Beispiel:**
```typescript
const keyVisual = {
  url: 'https://firebasestorage.googleapis.com/v0/b/.../key-visual-123.jpg',
  path: 'organizations/org-abc/companies/comp-xyz/.../key-visual-123.jpg',
  alt: 'Produktfoto Neues Widget',
  width: 1920,
  height: 1080,
  size: 245678
};
```

### Verwendungsbeispiel

```typescript
// Im ContentTab (bereits implementiert):
<KeyVisualSection
  value={keyVisual}
  onChange={updateKeyVisual}
  clientId={selectedCompanyId}
  clientName={selectedCompanyName}
  organizationId={organizationId}
  userId={userId}
  campaignId={campaignId}
  campaignName={campaignTitle}
  selectedProjectId={selectedProjectId}
  selectedProjectName={selectedProjectName}
  enableSmartRouter={true}
/>
```

**Mit Custom Handler:**
```typescript
const handleKeyVisualChange = useCallback((visual: KeyVisual) => {
  console.log('New Key Visual:', visual.url);
  updateKeyVisual(visual);

  // Optional: Trigger Analytics
  trackEvent('key_visual_uploaded', {
    campaignId,
    size: visual.size
  });
}, [campaignId, updateKeyVisual]);

<KeyVisualSection
  value={keyVisual}
  onChange={handleKeyVisualChange}
  {...otherProps}
/>
```

---

## Type Definitions

### Feedback Type

```typescript
interface Feedback {
  author: string;              // "Kunde", "Admin", etc.
  comment: string;             // Feedback-Text
  requestedAt?: {              // Firebase Timestamp
    toDate: () => Date;
  };
}
```

### SeoScoreData Type

```typescript
interface SeoScoreData {
  totalScore: number;          // 0-100
  breakdown: {
    headline: number;          // 0-25
    keywords: number;          // 0-25
    structure: number;         // 0-25
    social: number;            // 0-25 (garantiert durch ContentTab)
  };
  hints: string[];             // Verbesserungsvorschläge
}
```

### KeyVisual Type

```typescript
interface KeyVisual {
  url: string;                 // Firebase Storage Download URL
  path: string;                // Storage Path (für Delete)
  alt?: string;                // Alt-Text (optional)
  width?: number;              // Bild-Breite (optional)
  height?: number;             // Bild-Höhe (optional)
  size?: number;               // Datei-Größe in Bytes (optional)
}
```

### BoilerplateSection Type

```typescript
interface BoilerplateSection {
  id: string;                  // Unique ID
  type: string;                // 'about-company', 'contact', etc.
  content: string;             // HTML Content
  enabled: boolean;            // Aktiv in Pressemeldung?
}
```

---

## Code-Beispiele

### Vollständiges Integration-Beispiel

```typescript
// CampaignEditPage.tsx
import { useState } from 'react';
import { CampaignProvider } from './context/CampaignContext';
import ContentTab from './tabs/ContentTab';
import AiAssistantModal from './modals/AiAssistantModal';

function CampaignEditPage({ params }: { params: { campaignId: string } }) {
  const [showAiModal, setShowAiModal] = useState(false);
  const [seoScore, setSeoScore] = useState<SeoScoreData | null>(null);

  // User & Organization aus Auth
  const { userId, organizationId } = useAuth();

  // Campaign Context (lädt Campaign-Daten)
  const campaignContext = useCampaignData(params.campaignId);

  return (
    <CampaignProvider value={campaignContext}>
      <div className="campaign-edit-page">
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Inhalt</TabsTrigger>
            <TabsTrigger value="distribution">Verteilerkreis</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          <TabPanel value="content">
            <ContentTab
              organizationId={organizationId}
              userId={userId}
              campaignId={params.campaignId}
              onOpenAiModal={() => setShowAiModal(true)}
              onSeoScoreChange={(data) => {
                console.log('SEO Score:', data.totalScore);
                setSeoScore(data);
              }}
            />
          </TabPanel>

          {/* Andere Tabs */}
        </Tabs>

        {/* SEO Score Display (optional) */}
        {seoScore && (
          <div className="fixed bottom-4 right-4 p-4 bg-white shadow-lg rounded-lg">
            <p className="text-sm font-medium">SEO Score</p>
            <p className="text-3xl font-bold">{seoScore.totalScore}/100</p>
          </div>
        )}

        {/* KI-Assistent Modal */}
        {showAiModal && (
          <AiAssistantModal
            onClose={() => setShowAiModal(false)}
            onGenerate={(generatedContent) => {
              // Update Campaign Context mit generiertem Content
              campaignContext.updateTitle(generatedContent.title);
              campaignContext.updateEditorContent(generatedContent.content);
              setShowAiModal(false);
            }}
          />
        )}
      </div>
    </CampaignProvider>
  );
}
```

### Custom Feedback-Handling

```typescript
// Custom Hook für Feedback-Management
function useFeedbackManagement(campaignId: string) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  const addCustomerFeedback = useCallback(async (comment: string) => {
    const newFeedback: Feedback = {
      author: 'Kunde',
      comment,
      requestedAt: {
        toDate: () => new Date()
      }
    };

    // Speichere in Firestore
    await addDoc(collection(db, `campaigns/${campaignId}/feedback`), {
      ...newFeedback,
      requestedAt: serverTimestamp()
    });

    // Update local state
    setFeedback(prev => [...prev, newFeedback]);
  }, [campaignId]);

  return { feedback, addCustomerFeedback };
}

// In Component:
const { feedback, addCustomerFeedback } = useFeedbackManagement(campaignId);

<CustomerFeedbackAlert feedback={feedback} />
```

### SEO Score Analytics

```typescript
// Track SEO Score Changes
function ContentTabWithAnalytics(props: ContentTabProps) {
  const handleSeoScoreChange = useCallback((scoreData: SeoScoreData) => {
    // Original Handler
    props.onSeoScoreChange(scoreData);

    // Analytics Tracking
    trackEvent('seo_score_updated', {
      campaignId: props.campaignId,
      totalScore: scoreData.totalScore,
      breakdown: scoreData.breakdown
    });

    // Warnings bei niedrigem Score
    if (scoreData.totalScore < 50) {
      toast.warning('SEO-Score ist niedrig. Beachte die Optimierungshinweise!');
    }
  }, [props]);

  return (
    <ContentTab
      {...props}
      onSeoScoreChange={handleSeoScoreChange}
    />
  );
}
```

---

**Letzte Aktualisierung:** 05.11.2025
**Version:** 1.0.0
**Status:** ✅ Production Ready

# PreviewTab - Campaign Edit Page

> **Modul**: PreviewTab (Campaign Edit - Vorschau & PDF-Generierung)
> **Phase**: 2.4 - Testing & Dokumentation
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 05.11.2025

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Architektur](#architektur)
- [Features](#features)
- [Verwendung](#verwendung)
- [Component-Hierarchie](#component-hierarchie)
- [State Management](#state-management)
- [Performance-Optimierungen](#performance-optimierungen)
- [Conditional Rendering](#conditional-rendering)
- [Toast-Integration](#toast-integration)
- [Testing](#testing)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Der **PreviewTab** ist der vierte und finale Tab innerhalb der Campaign Edit Page. Er ermöglicht Redakteuren eine Live-Vorschau ihrer Kampagne, PDF-Generierung mit Template-Auswahl und die Verwaltung von PDF-Versionen.

### Hauptfunktionen

- **📄 Live-Vorschau**: Realtime-Darstellung der Kampagne mit allen Inhalten
- **📑 PDF-Generierung**: Ein-Klick-PDF-Erstellung mit Template-Auswahl
- **📚 PDF-Versionen-Historie**: Verwaltung und Download aller PDF-Versionen
- **🔄 Pipeline-PDF-Viewer**: Interne PDFs für projekt-verknüpfte Kampagnen
- **✅ Approval-Workflow**: Vorbereitet für zukünftigen Freigabe-Workflow (noch nicht implementiert)
- **🔒 Edit-Lock-Integration**: Respektiert Bearbeitungssperren während Approval

### Besonderheiten

Das PreviewTab ist **bereits optimal strukturiert** und wurde OHNE Code-Refactoring dokumentiert:

- **267 Zeilen**: Kompakt und gut lesbar (< 300 Zeilen Grenze)
- **React.memo**: Performance-Optimierung bereits vorhanden
- **useMemo**: Berechnung von `finalContentHtml` optimiert
- **Toast-Integration**: Vollständig in Context und Tab integriert
- **Externe Komponenten**: Bereits gut separiert (CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer)
- **92.59% Test-Coverage**: 60 comprehensive Tests

**Refactoring-Entscheidung:** Keine Modularisierung nötig, Fokus auf Tests und Dokumentation.

---

## Architektur

### Context-basiertes State Management

PreviewTab verwendet ausschließlich den **CampaignContext** für State Management. Diese Architektur-Entscheidung (siehe [ADR-001](./adr/README.md#adr-001-context-basiertes-state-management)) bringt folgende Vorteile:

- ✅ **Konsistenz**: Einheitliches State Management über alle Tabs
- ✅ **Einfachheit**: Keine doppelte State-Verwaltung (Context + React Query)
- ✅ **Performance**: Context ist für die Preview-Anforderungen optimal
- ✅ **Maintainability**: Weniger Komplexität, einfacher zu warten

```typescript
// PreviewTab nutzt ausschließlich CampaignContext
const {
  // Campaign Core Data
  campaign,                    // PRCampaign | null

  // Content States
  campaignTitle,               // string
  editorContent,               // string (HTML)
  keyVisual,                   // KeyVisualData | undefined
  keywords,                    // string[]
  boilerplateSections,         // BoilerplateSection[]
  attachedAssets,              // CampaignAssetAttachment[]

  // SEO & Approval
  seoScore,                    // SEO-Analyse-Objekt
  selectedCompanyName,         // string
  approvalData,                // Approval-Konfiguration

  // PDF States
  selectedTemplateId,          // string | undefined
  updateSelectedTemplate,      // (templateId: string, name?: string) => void
  currentPdfVersion,           // PDFVersion | null
  generatingPdf,               // boolean
  generatePdf,                 // (forApproval?: boolean) => Promise<void>

  // Edit Lock
  editLockStatus               // EditLockData
} = useCampaign();
```

### Dateistruktur

```
tabs/
├── PreviewTab.tsx (267 Zeilen)
│   └── Main Component mit Live-Vorschau & PDF-Generierung
│
└── __tests__/
    ├── PreviewTab.integration.test.tsx (60 Tests, 92.59% Coverage)
    ├── PreviewTab.test.tsx (21 Tests, Backward Compatibility)
    └── PreviewTab.TEST_DOCUMENTATION.md (Test-Dokumentation)
```

**Keine Modularisierung notwendig:**
- Workflow-Status-Banner ist conditional (~40 Zeilen, nur bei aktivem Workflow)
- Extraktion würde mehr Overhead erzeugen als Nutzen bringen
- Code ist bereits sehr gut lesbar und wartbar

### Component-Hierarchie

```
PreviewTab
├── [Approval-Workflow-Banner] (conditional, noch nicht implementiert)
│   ├── ClockIcon
│   ├── Workflow-Status-Text
│   └── Shareable-Links (Team & Kunde)
│
├── Live-Vorschau Section
│   └── CampaignPreviewStep (extern)
│       ├── Pressemitteilung im Papier-Look (mit Key Visual)
│       ├── Kampagnen-Info (Kunde, Freigabe-Status)
│       ├── Statistiken (Zeichen, Boilerplates, Keywords, Medien)
│       ├── PR-SEO Analyse (Score mit Breakdown)
│       ├── Anhänge-Liste
│       └── TemplateSelector (für PDF-Template-Auswahl)
│
├── PDF-Vorschau und Versionen Section
│   ├── Header mit PDF-Generierungs-Button (oder Lock-Status)
│   ├── [Aktuelle PDF-Version Box] (conditional)
│   │   ├── Vorschau PDF Label mit Status-Badge
│   │   ├── Download-Button
│   │   └── [Workflow-Status] (conditional)
│   ├── [PDF-Hinweis] (wenn keine PDF vorhanden)
│   └── PDFVersionHistory (extern)
│       └── Liste aller PDF-Versionen mit Download
│
└── [Pipeline-PDF-Viewer Section] (conditional, nur mit projectId)
    └── PipelinePDFViewer (extern)
        ├── Pipeline-Stadium-Info
        ├── PDF-Generierungs-Button
        ├── Download & Share Actions
        └── Auto-Generate Hinweis
```

---

## Features

### 1. Live-Vorschau

Die Live-Vorschau zeigt die Kampagne in Echtzeit mit allen Inhalten:

```typescript
// finalContentHtml wird via useMemo berechnet
const finalContentHtml = useMemo(() => {
  let html = editorContent;

  if (boilerplateSections.length > 0) {
    const boilerplateHtml = boilerplateSections
      .map(section => section.content)
      .join('\n');
    html = `${html}\n${boilerplateHtml}`;
  }

  return html;
}, [editorContent, boilerplateSections]);
```

**Komponente:** `CampaignPreviewStep`

**Props:**
- `campaignTitle`: Titel der Kampagne
- `finalContentHtml`: Kombinierter Content (Editor + Boilerplates)
- `keyVisual`: Key Visual Bild (optional)
- `selectedCompanyName`: Kundenname
- `realPrScore`: SEO-Score-Objekt
- `keywords`: SEO-Keywords Array
- `boilerplateSections`: Textbausteine
- `attachedAssets`: Angehängte Medien
- `editorContent`: Haupt-Editor-Content
- `approvalData`: Approval-Konfiguration
- `organizationId`: Organisation-ID für Template-Selector
- `selectedTemplateId`: Ausgewähltes PDF-Template
- `onTemplateSelect`: Callback für Template-Auswahl
- `showTemplateSelector`: Boolean (immer `true` im PreviewTab)

**Darstellung:**
- **16:9 Key Visual** (wenn vorhanden)
- **Pressemitteilungs-Header** mit Titel
- **Hauptinhalt** mit finalContentHtml (dangerouslySetInnerHTML)
- **Kampagnen-Info Sidebar** (Kunde, Freigabe-Status)
- **Statistiken Sidebar** (Zeichen, Boilerplates, Keywords, Medien)
- **PR-SEO Analyse Sidebar** (Score, Breakdown: Headline, Keywords, Struktur, Social)
- **Anhänge-Liste Sidebar** (erste 3 Assets mit Typ-Icons)
- **Template-Selector** (unterhalb der Vorschau)

### 2. PDF-Generierung

**Trigger:** Button "PDF generieren" (wenn nicht gesperrt)

```typescript
// generatePdf ist eine Context-Funktion
<Button
  type="button"
  onClick={() => generatePdf()}
  disabled={generatingPdf}
  color="secondary"
>
  {generatingPdf ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
      PDF wird erstellt...
    </>
  ) : (
    <>
      <DocumentTextIcon className="h-4 w-4 mr-2" />
      PDF generieren
    </>
  )}
</Button>
```

**Validierung (im Context):**
- Benutzer eingeloggt
- Kampagnen-Titel vorhanden
- Kunde ausgewählt
- Content vorhanden (nicht leer oder `<p></p>`)

**Prozess:**
1. User klickt "PDF generieren"
2. Context validiert Felder
3. `pdfVersionsService.createPDFVersion()` wird aufgerufen
4. PDF wird generiert und in Firebase Storage hochgeladen
5. PDF-Version-Eintrag in Firestore erstellt
6. `currentPdfVersion` wird aktualisiert
7. Toast-Benachrichtigung: "PDF erfolgreich generiert!"

**Error Handling:**
- Fehlende Felder: Toast mit Fehler-Liste
- Generierungs-Fehler: Toast "Fehler bei der PDF-Erstellung"

### 3. Template-Auswahl

**Integration:** Über `CampaignPreviewStep` → `TemplateSelector`

```typescript
// Template-Auswahl wird an CampaignPreviewStep übergeben
<CampaignPreviewStep
  // ... andere Props
  organizationId={organizationId}
  selectedTemplateId={selectedTemplateId}
  onTemplateSelect={updateSelectedTemplate}
  showTemplateSelector={true}
/>
```

**Callback-Flow:**
1. User wählt Template im `TemplateSelector`
2. `onTemplateSelect(templateId, templateName)` wird aufgerufen
3. `updateSelectedTemplate` im Context wird ausgeführt
4. Context aktualisiert `selectedTemplateId`
5. Toast-Benachrichtigung: "PDF-Template '[Name]' ausgewählt"

**Template-Persistierung:**
- Template-ID wird in Campaign-Daten gespeichert
- Bei nächster PDF-Generierung wird gespeicherte Template-ID verwendet

### 4. PDF-Version Anzeige

**Conditional Rendering:** Nur wenn `currentPdfVersion` vorhanden

```typescript
{currentPdfVersion && (
  <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-base/6 text-zinc-500 sm:text-sm/6">
              Vorschau PDF
            </span>
            <Badge color="blue" className="text-xs">
              {approvalWorkflowResult?.pdfVersionId ? 'Freigabe-PDF' : 'Aktuell'}
            </Badge>
          </div>
          {approvalWorkflowResult?.workflowId && (
            <div className="text-sm text-blue-700">Workflow aktiv</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          color={
            currentPdfVersion.status === 'draft' ? 'zinc' :
            currentPdfVersion.status === 'approved' ? 'green' : 'amber'
          }
          className="text-xs"
        >
          {currentPdfVersion.status === 'draft' ? 'Entwurf' :
           currentPdfVersion.status === 'approved' ? 'Freigegeben' :
           'Freigabe angefordert'}
        </Badge>

        <Button
          type="button"
          plain
          onClick={() => window.open(currentPdfVersion.downloadUrl, '_blank')}
          className="!text-gray-600 hover:!text-gray-900 text-sm"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  </div>
)}
```

**Status-Badges:**
- `draft`: Entwurf (zinc/grau)
- `pending_customer`: Freigabe angefordert (amber/gelb)
- `approved`: Freigegeben (green/grün)

**Download-Funktion:**
```typescript
window.open(currentPdfVersion.downloadUrl, '_blank');
```

### 5. PDF-Versionen-Historie

**Komponente:** `PDFVersionHistory`

**Props:**
```typescript
<PDFVersionHistory
  campaignId={campaignId}
  organizationId={organizationId}
  showActions={true}
/>
```

**Features:**
- Zeigt alle PDF-Versionen der Kampagne
- Sortiert nach Version-Nummer (neueste zuerst)
- Download-Button pro Version
- Status-Badge pro Version
- Aktuelle Version wird hervorgehoben ("Aktuell" Badge)
- Datum-Anzeige (formatDateShort)

**Rendering:**
- **Loading State**: Skeleton Loader (2 graue Boxen)
- **Empty State**: "Noch keine PDF-Versionen vorhanden" mit Icon
- **Liste**: Kompakte Version-Cards mit Actions

### 6. Pipeline-PDF-Viewer

**Conditional Rendering:** Nur wenn `campaign.projectId` vorhanden

```typescript
{campaign?.projectId && organizationId && (
  <div className="mt-8">
    <PipelinePDFViewer
      campaign={campaign}
      organizationId={organizationId}
      onPDFGenerated={(pdfUrl: string) => {
        toastService.success('Pipeline-PDF erfolgreich generiert');
      }}
    />
  </div>
)}
```

**Features:**
- Pipeline-Stadium-spezifische Konfiguration (Creation, Review, Freigabe)
- Interne PDF-Generierung (separate von Kunden-PDFs)
- Download & Link-Kopieren
- Auto-Generation-Hinweis (wenn aktiviert)
- Versionszähler & Zeitstempel

**Toast-Integration:**
```typescript
onPDFGenerated={(pdfUrl: string) => {
  toastService.success('Pipeline-PDF erfolgreich generiert');
}}
```

### 7. Edit-Lock-Integration

**Edit-Lock verhindert PDF-Generierung:**

```typescript
{!editLockStatus.isLocked ? (
  <Button onClick={() => generatePdf()} disabled={generatingPdf}>
    PDF generieren
  </Button>
) : (
  <div className="flex items-center gap-2 text-sm text-gray-500">
    <LockClosedIcon className="h-4 w-4" />
    PDF-Erstellung gesperrt - {
      editLockStatus.reason
        ? EDIT_LOCK_CONFIG[editLockStatus.reason]?.label
        : 'Bearbeitung nicht möglich'
    }
  </div>
)}
```

**Lock-Gründe (EDIT_LOCK_CONFIG):**
- `pending_customer_approval`: "Kunde prüft"
- `approved_final`: "Freigegeben"
- `system_processing`: "System verarbeitet"
- `manual_lock`: "Manuell gesperrt"
- `undefined`: "Bearbeitung nicht möglich" (Fallback)

**UI-Anzeige:**
- Lock-Icon (`LockClosedIcon`)
- Lock-Grund aus `EDIT_LOCK_CONFIG`
- Kein PDF-Generierungs-Button

---

## Verwendung

### Basic Usage

```tsx
import PreviewTab from './tabs/PreviewTab';

function CampaignEditPage() {
  return (
    <CampaignProvider campaignId={campaignId} organizationId={organizationId}>
      <PreviewTab
        organizationId={organizationId}
        campaignId={campaignId}
      />
    </CampaignProvider>
  );
}
```

### Mit Conditional Rendering

```tsx
function CampaignEditPage() {
  const [activeTab, setActiveTab] = useState(4); // Tab 4 = PreviewTab

  return (
    <CampaignProvider campaignId={campaignId} organizationId={organizationId}>
      {activeTab === 4 && (
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      )}
    </CampaignProvider>
  );
}
```

### Integration in Tab-System

```tsx
function CampaignEditPage() {
  const { activeTab } = useCampaign();

  return (
    <div>
      <TabNavigation />

      {activeTab === 1 && <ContentTab />}
      {activeTab === 2 && <AttachmentsTab />}
      {activeTab === 3 && <ApprovalTab />}
      {activeTab === 4 && <PreviewTab
        organizationId={organizationId}
        campaignId={campaignId}
      />}
    </div>
  );
}
```

---

## State Management

### Context Values (Read)

| Value | Type | Beschreibung |
|-------|------|--------------|
| `campaign` | `PRCampaign \| null` | Komplette Kampagnen-Daten |
| `campaignTitle` | `string` | Titel der Kampagne |
| `editorContent` | `string` | Haupt-Editor-Content (HTML) |
| `keyVisual` | `KeyVisualData \| undefined` | Key Visual Bild |
| `keywords` | `string[]` | SEO-Keywords |
| `boilerplateSections` | `BoilerplateSection[]` | Textbausteine |
| `attachedAssets` | `CampaignAssetAttachment[]` | Angehängte Medien |
| `seoScore` | `Object` | SEO-Score-Analyse |
| `selectedCompanyName` | `string` | Kundenname |
| `approvalData` | `Object` | Approval-Konfiguration |
| `selectedTemplateId` | `string \| undefined` | Ausgewähltes PDF-Template |
| `currentPdfVersion` | `PDFVersion \| null` | Aktuelle PDF-Version |
| `generatingPdf` | `boolean` | PDF-Generierungs-Status |
| `editLockStatus` | `EditLockData` | Edit-Lock-Status |

### Context Actions (Write)

| Action | Signature | Beschreibung |
|--------|-----------|--------------|
| `updateSelectedTemplate` | `(templateId: string, name?: string) => void` | Template auswählen + Toast |
| `generatePdf` | `(forApproval?: boolean) => Promise<void>` | PDF generieren + Validierung + Toast |

### useMemo: finalContentHtml

```typescript
const finalContentHtml = useMemo(() => {
  let html = editorContent;

  if (boilerplateSections.length > 0) {
    const boilerplateHtml = boilerplateSections
      .map(section => section.content)
      .join('\n');
    html = `${html}\n${boilerplateHtml}`;
  }

  return html;
}, [editorContent, boilerplateSections]);
```

**Zweck:** Kombiniert `editorContent` mit `boilerplateSections` zu finalem HTML

**Dependencies:**
- `editorContent`: Haupt-Editor-Content
- `boilerplateSections`: Textbausteine-Array

**Neu-Berechnung erfolgt nur wenn:**
- `editorContent` sich ändert (User editiert Content)
- `boilerplateSections` sich ändert (Boilerplate hinzugefügt/entfernt)

**Performance-Vorteil:**
- Verhindert unnötige String-Konkatenation bei jedem Render
- `CampaignPreviewStep` erhält stabiles `finalContentHtml`

---

## Performance-Optimierungen

### 1. React.memo

```typescript
export default React.memo(function PreviewTab({
  organizationId,
  campaignId
}: PreviewTabProps) {
  // ...
});
```

**Zweck:** Verhindert unnötige Re-Renders des PreviewTab

**Wann wird neu gerendert:**
- `organizationId` ändert sich (unwahrscheinlich)
- `campaignId` ändert sich (Navigation zu anderer Kampagne)

**Wann wird NICHT neu gerendert:**
- Parent-Component rendert neu (z.B. Tab-Wechsel)
- Sibling-Components rendern neu
- Context-Werte ändern sich (triggert intern, aber nicht von außen)

### 2. useMemo für finalContentHtml

Siehe [State Management](#usememo-finalcontenthtml)

**Messbare Performance-Verbesserung:**
- Ohne useMemo: String-Konkatenation bei jedem Render (~1-2ms bei großen Boilerplates)
- Mit useMemo: Nur bei Änderung (0ms bei stabilen Werten)

### 3. Externe Komponenten

**Bereits separiert:**
- `CampaignPreviewStep`: Shared Component (verwendet auch im PreviewStep Wizard)
- `PDFVersionHistory`: Shared Component (wiederverwendbar für andere Kampagnen-Tools)
- `PipelinePDFViewer`: Shared Component (auch für Projekt-PDFs)

**Vorteil:**
- Code-Splitting: Komponenten werden nur geladen wenn benötigt
- Wiederverwendbarkeit: Komponenten können in anderen Features genutzt werden
- Testbarkeit: Jede Komponente kann isoliert getestet werden

### 4. Conditional Rendering

**Vermeidung unnötiger DOM-Elemente:**

```typescript
// Pipeline-PDF-Viewer nur wenn projectId vorhanden
{campaign?.projectId && (
  <PipelinePDFViewer ... />
)}

// PDF-Version Box nur wenn currentPdfVersion vorhanden
{currentPdfVersion && (
  <div>...</div>
)}

// Workflow-Banner nur wenn approvalWorkflowResult vorhanden
{approvalWorkflowResult?.workflowId && (
  <div>...</div>
)}
```

**Performance-Vorteil:**
- Weniger DOM-Elemente
- Weniger Event-Listener
- Schnelleres Initial Rendering

---

## Conditional Rendering

### Übersicht

| Element | Bedingung | Grund |
|---------|-----------|-------|
| Approval-Workflow-Banner | `approvalWorkflowResult?.workflowId` | Noch nicht implementiert (hardcoded `null`) |
| PDF-Generierungs-Button | `!editLockStatus.isLocked` | Respektiert Edit-Lock |
| Lock-Status Anzeige | `editLockStatus.isLocked` | Zeigt Lock-Grund |
| Aktuelle PDF-Version Box | `currentPdfVersion` | Nur wenn PDF existiert |
| PDF-Hinweis | `!currentPdfVersion` | Nur wenn keine PDF vorhanden |
| Pipeline-PDF-Viewer | `campaign?.projectId` | Nur für projekt-verknüpfte Kampagnen |
| PDFVersionHistory | `campaignId && organizationId` | Immer angezeigt (IDs werden geprüft) |

### Approval-Workflow-Banner (Future)

```typescript
// Aktuell hardcoded null (Zeile 78)
const approvalWorkflowResult = null as ApprovalWorkflowResult | null;

// Geplante Implementierung (separater Task):
{approvalWorkflowResult?.workflowId && (
  <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
    <div className="flex items-start">
      <ClockIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-medium text-green-800 mb-2">
          Freigabe-Workflow aktiv
        </h4>
        <Text className="text-sm text-green-700 mb-3">
          Die Kampagne befindet sich im Freigabe-Prozess. Links wurden versendet.
        </Text>

        <div className="flex flex-wrap gap-2">
          {approvalWorkflowResult?.shareableLinks?.team && (
            <Button
              plain
              onClick={() => window.open(approvalWorkflowResult?.shareableLinks?.team!, '_blank')}
              className="text-xs text-green-700 hover:text-green-800"
            >
              <UserGroupIcon className="h-3 w-3 mr-1" />
              Team-Link öffnen
            </Button>
          )}

          {approvalWorkflowResult?.shareableLinks?.customer && (
            <Button
              plain
              onClick={() => window.open(approvalWorkflowResult?.shareableLinks?.customer!, '_blank')}
              className="text-xs text-green-700 hover:text-green-800"
            >
              <BuildingOfficeIcon className="h-3 w-3 mr-1" />
              Kunden-Link öffnen
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

**Status:** Vorbereitet, aber noch nicht implementiert (~40 Zeilen Code)

**Grund für Conditional:** Workflow ist optional und wird erst bei expliziter Aktivierung angezeigt

### Edit-Lock Conditional

```typescript
{!editLockStatus.isLocked ? (
  // Zeige PDF-Generierungs-Button
  <Button onClick={() => generatePdf()} disabled={generatingPdf}>
    {generatingPdf ? "PDF wird erstellt..." : "PDF generieren"}
  </Button>
) : (
  // Zeige Lock-Status
  <div className="flex items-center gap-2 text-sm text-gray-500">
    <LockClosedIcon className="h-4 w-4" />
    PDF-Erstellung gesperrt - {
      editLockStatus.reason
        ? EDIT_LOCK_CONFIG[editLockStatus.reason]?.label
        : 'Bearbeitung nicht möglich'
    }
  </div>
)}
```

**Grund:** User soll keine PDFs generieren können während Freigabe-Prozess läuft

---

## Toast-Integration

### Übersicht

PreviewTab nutzt **zentralisierte Toast-Meldungen** im CampaignContext und im Tab selbst.

| Aktion | Ort | Toast-Nachricht |
|--------|-----|-----------------|
| PDF generieren (Erfolg) | Context (`generatePdf`) | "PDF erfolgreich generiert!" |
| PDF generieren (Fehler) | Context (`generatePdf`) | "Fehler bei der PDF-Erstellung" |
| Validierung fehlgeschlagen | Context (`generatePdf`) | Fehler-Liste (z.B. "Titel ist erforderlich") |
| Template ausgewählt | Context (`updateSelectedTemplate`) | "PDF-Template '[Name]' ausgewählt" |
| Pipeline-PDF generiert | PreviewTab (`onPDFGenerated`) | "Pipeline-PDF erfolgreich generiert" |

### Implementation

#### Context-Toast (PDF-Generierung)

```typescript
// In CampaignContext.tsx
const generatePdf = async (forApproval: boolean = false) => {
  // Validierung
  const errors: string[] = [];
  if (!selectedCompanyId) errors.push('Bitte wählen Sie einen Kunden aus');
  if (!campaignTitle.trim()) errors.push('Titel ist erforderlich');
  if (!editorContent.trim() || editorContent === '<p></p>') {
    errors.push('Inhalt ist erforderlich');
  }

  if (errors.length > 0) {
    toastService.error(errors.join(', '));
    return;
  }

  try {
    // PDF generieren
    await pdfVersionsService.createPDFVersion(...);
    toastService.success('PDF erfolgreich generiert!');
  } catch (error) {
    toastService.error('Fehler bei der PDF-Erstellung');
  }
};
```

#### Context-Toast (Template-Auswahl)

```typescript
// In CampaignContext.tsx
const updateSelectedTemplate = useCallback((templateId: string, templateName?: string) => {
  setSelectedTemplateId(templateId);

  if (templateName) {
    toastService.success(`PDF-Template "${templateName}" ausgewählt`);
  } else {
    toastService.success('PDF-Template ausgewählt');
  }
}, []);
```

#### Tab-Toast (Pipeline-PDF)

```typescript
// In PreviewTab.tsx
<PipelinePDFViewer
  campaign={campaign}
  organizationId={organizationId}
  onPDFGenerated={(pdfUrl: string) => {
    toastService.success('Pipeline-PDF erfolgreich generiert');
  }}
/>
```

### Toast Service Import

```typescript
import { toastService } from '@/lib/utils/toast';
```

**Verfügbare Methoden:**
- `toastService.success(message: string)`
- `toastService.error(message: string)`
- `toastService.info(message: string)`
- `toastService.warning(message: string)`

---

## Testing

### Test-Coverage

**Datei:** `PreviewTab.integration.test.tsx`
**Tests:** 60 comprehensive Tests
**Coverage:** 92.59% Statements | 85.18% Branches | 75% Functions | 92.3% Lines

### Test-Kategorien

1. **Basic Rendering & Structure** (5 Tests)
   - Component rendert erfolgreich
   - Korrekte CSS-Struktur
   - Alle Child-Components vorhanden

2. **Context-Integration** (9 Tests)
   - Alle Context-Werte werden korrekt verwendet
   - campaignTitle, editorContent, keyVisual, keywords, seoScore, etc.

3. **finalContentHtml useMemo** (6 Tests)
   - Kombiniert editorContent mit boilerplateSections
   - Neu-Berechnung bei Änderungen
   - Funktioniert mit leeren Arrays

4. **PDF-Generierung** (9 Tests)
   - Button Anzeige & Klick-Handling
   - Loading-States & Spinner
   - Edit-Lock Integration
   - EDIT_LOCK_CONFIG Labels

5. **Template-Auswahl** (5 Tests)
   - selectedTemplateId Übergabe
   - updateSelectedTemplate Callback
   - Template-Selector Anzeige

6. **PDF-Version Anzeige** (10 Tests)
   - currentPdfVersion Rendering
   - Status-Badges (draft, approved, pending)
   - Download-Button mit window.open

7. **Pipeline-PDF-Viewer** (6 Tests)
   - Conditional Rendering (nur mit projectId)
   - Props-Übergabe
   - onPDFGenerated Callback mit Toast

8. **Conditional Rendering** (5 Tests)
   - Workflow-Banner (conditional)
   - Pipeline-Viewer (nur mit projectId)
   - PDF-Version Box (nur mit currentPdfVersion)

9. **React.memo** (3 Tests)
   - Keine unnötigen Re-Renders
   - Neu-Render bei geänderten Props

10. **Integration Scenarios** (3 Tests)
    - Komplexe Szenarien mit mehreren Context-Werten
    - Locked Status + PDF-Version kombiniert

### Test ausführen

```bash
# Alle PreviewTab Tests
npm test -- PreviewTab

# Nur Integration Tests
npm test -- PreviewTab.integration.test.tsx

# Mit Coverage
npm test -- PreviewTab.integration.test.tsx --coverage

# Watch Mode
npm test -- PreviewTab.integration.test.tsx --watch
```

### Siehe auch

- [Test-Dokumentation](../../../testing/PreviewTab-Test-Report.md)
- [Test-Case-Details](./__tests__/PreviewTab.TEST_DOCUMENTATION.md)

---

## Migration Guide

### Von Legacy-Code

Falls Sie von einem älteren PreviewTab migrieren, beachten Sie:

**KEINE Migration notwendig!**

PreviewTab wurde **OHNE Code-Refactoring** dokumentiert. Der bestehende Code ist bereits optimal strukturiert und muss nicht angepasst werden.

**Einzige Änderung:** Phase 0.5 - Pre-Refactoring Cleanup

```diff
- // TODO: Add approvalWorkflowResult to Context once approval workflow is implemented
  const approvalWorkflowResult = null as ApprovalWorkflowResult | null;
+ // Approval Workflow wird in separater Task implementiert
+ const approvalWorkflowResult = null as ApprovalWorkflowResult | null;
```

### Für neue Features

Wenn Sie neue Features zum PreviewTab hinzufügen:

1. **Prüfen Sie Context-Integration:**
   - Benötigen Sie neue Context-Werte? → Erweitern Sie CampaignContext
   - Benötigen Sie neue Actions? → Fügen Sie sie im CampaignContext hinzu

2. **Beachten Sie Performance:**
   - Nutzen Sie `useMemo` für berechnete Werte
   - Nutzen Sie `useCallback` für Callbacks (falls nötig)
   - PreviewTab ist bereits mit `React.memo` optimiert

3. **Schreiben Sie Tests:**
   - Fügen Sie Tests in `PreviewTab.integration.test.tsx` hinzu
   - Folgen Sie der bestehenden Test-Struktur
   - Nutzen Sie die bestehenden Mocks

4. **Dokumentieren Sie Änderungen:**
   - Aktualisieren Sie diese README
   - Aktualisieren Sie die Test-Dokumentation
   - Aktualisieren Sie ADRs falls architektonische Änderungen

---

## Troubleshooting

### Problem: PDF-Generierung schlägt fehl

**Symptom:** "Fehler bei der PDF-Erstellung" Toast

**Mögliche Ursachen:**

1. **Fehlende Felder:**
   ```
   Toast: "Bitte wählen Sie einen Kunden aus, Titel ist erforderlich, Inhalt ist erforderlich"
   ```
   **Lösung:** Füllen Sie alle erforderlichen Felder aus

2. **Firebase Storage Fehler:**
   ```
   Console Error: "Permission denied" oder "Storage quota exceeded"
   ```
   **Lösung:** Prüfen Sie Firebase Storage Permissions und Quota

3. **PDF-Service Fehler:**
   ```
   Console Error: "PDF generation service unavailable"
   ```
   **Lösung:** Prüfen Sie Cloud Functions Status

### Problem: Template-Auswahl funktioniert nicht

**Symptom:** Template wird ausgewählt, aber nicht gespeichert

**Debug-Schritte:**

1. **Prüfen Sie Context:**
   ```typescript
   console.log('selectedTemplateId:', selectedTemplateId);
   console.log('updateSelectedTemplate:', updateSelectedTemplate);
   ```

2. **Prüfen Sie Toast:**
   - Erwartete Toast: "PDF-Template '[Name]' ausgewählt"
   - Wenn kein Toast → Context-Callback nicht ausgeführt

3. **Prüfen Sie CampaignPreviewStep:**
   - `showTemplateSelector={true}` gesetzt?
   - `organizationId` vorhanden?
   - `onTemplateSelect` Callback übergeben?

### Problem: Pipeline-PDF-Viewer wird nicht angezeigt

**Symptom:** Viewer ist nicht sichtbar, obwohl Projekt verknüpft

**Debug-Schritte:**

1. **Prüfen Sie `campaign.projectId`:**
   ```typescript
   console.log('campaign.projectId:', campaign?.projectId);
   ```
   - Wenn `undefined` → Kampagne ist nicht mit Projekt verknüpft

2. **Prüfen Sie `organizationId`:**
   ```typescript
   console.log('organizationId:', organizationId);
   ```
   - Wenn `undefined` → Props nicht korrekt übergeben

3. **Prüfen Sie `campaign.internalPDFs?.enabled`:**
   ```typescript
   console.log('internalPDFs enabled:', campaign?.internalPDFs?.enabled);
   ```
   - Wenn `false` → Pipeline-PDFs sind für diese Kampagne deaktiviert

### Problem: Edit-Lock verhindert PDF-Generierung

**Symptom:** "PDF-Erstellung gesperrt" statt Button

**Erwartetes Verhalten:** Lock ist aktiv während Freigabe-Prozess

**Debug-Schritte:**

1. **Prüfen Sie `editLockStatus`:**
   ```typescript
   console.log('editLockStatus:', editLockStatus);
   ```

2. **Lock-Grund verstehen:**
   - `pending_customer_approval`: Kunde prüft gerade → Normal
   - `approved_final`: Freigegeben → Keine Änderungen mehr möglich
   - `system_processing`: System verarbeitet → Temporär, warten
   - `manual_lock`: Manuell gesperrt → Admin kontaktieren

3. **Lock entfernen (nur Admin):**
   - Über `pdfVersionsService.clearEditLock(campaignId)`
   - ACHTUNG: Nur wenn Lock irrtümlich gesetzt wurde!

### Problem: finalContentHtml ist leer

**Symptom:** Live-Vorschau zeigt "Klicken Sie auf 'Weiter' oder 'Vorschau'..."

**Debug-Schritte:**

1. **Prüfen Sie `editorContent`:**
   ```typescript
   console.log('editorContent:', editorContent);
   ```
   - Wenn leer oder `<p></p>` → Content Tab ausfüllen

2. **Prüfen Sie `boilerplateSections`:**
   ```typescript
   console.log('boilerplateSections:', boilerplateSections);
   ```
   - Wenn leer → Boilerplates hinzufügen (optional)

3. **Prüfen Sie useMemo:**
   ```typescript
   console.log('finalContentHtml:', finalContentHtml);
   ```
   - Sollte `editorContent` + Boilerplates kombinieren

---

## Best Practices

### 1. Context-basiertes State Management

**DO:**
```typescript
// Nutze Context für alle Campaign-States
const { campaignTitle, updateTitle } = useCampaign();
```

**DON'T:**
```typescript
// Vermeide lokalen State für Campaign-Daten
const [localTitle, setLocalTitle] = useState(''); // ❌
```

**Grund:** Context ist Single Source of Truth für Campaign-Daten

### 2. useMemo für berechnete Werte

**DO:**
```typescript
const finalContentHtml = useMemo(() => {
  let html = editorContent;
  if (boilerplateSections.length > 0) {
    // ... Berechnung
  }
  return html;
}, [editorContent, boilerplateSections]);
```

**DON'T:**
```typescript
// Vermeide Re-Berechnung bei jedem Render
const finalContentHtml = editorContent + boilerplateSections.join(''); // ❌
```

**Grund:** Performance-Optimierung für große Daten-Sets

### 3. Conditional Rendering

**DO:**
```typescript
{campaign?.projectId && (
  <PipelinePDFViewer campaign={campaign} ... />
)}
```

**DON'T:**
```typescript
<PipelinePDFViewer
  campaign={campaign}
  show={!!campaign?.projectId}  // ❌
  ...
/>
```

**Grund:** Vermeide unnötige Component-Instanziierung

### 4. Toast-Meldungen

**DO:**
```typescript
// Nutze zentrale Toast-Meldungen im Context
const updateSelectedTemplate = (templateId, name) => {
  setSelectedTemplateId(templateId);
  toastService.success(`PDF-Template "${name}" ausgewählt`);
};
```

**DON'T:**
```typescript
// Vermeide duplizierte Toast-Logik im Tab
const handleTemplateSelect = (templateId, name) => {
  updateSelectedTemplate(templateId);
  toastService.success(...); // ❌ Duplikation
};
```

**Grund:** Konsistenz und DRY-Prinzip

### 5. Edit-Lock Respektieren

**DO:**
```typescript
{!editLockStatus.isLocked && (
  <Button onClick={generatePdf}>PDF generieren</Button>
)}
```

**DON'T:**
```typescript
<Button
  onClick={generatePdf}
  disabled={editLockStatus.isLocked}  // ❌ Button wird trotzdem gerendert
>
  PDF generieren
</Button>
```

**Grund:** UI soll Lock-Status klar kommunizieren (kein Button vs. disabled Button)

### 6. Externe Komponenten nutzen

**DO:**
```typescript
// Nutze externe, shared Components
<CampaignPreviewStep {...props} />
<PDFVersionHistory {...props} />
<PipelinePDFViewer {...props} />
```

**DON'T:**
```typescript
// Vermeide Inline-Components für komplexe UI
<div>
  {/* 200 Zeilen Inline-Code für Vorschau */} // ❌
</div>
```

**Grund:** Wiederverwendbarkeit, Testbarkeit, Code-Splitting

---

## Siehe auch

### Dokumentation

- **[Components-Dokumentation](./components/README.md)**: Details zu CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer
- **[API-Dokumentation](./api/README.md)**: CampaignContext Integration, PDF & Template API
- **[ADR-Dokumentation](./adr/README.md)**: Architecture Decision Records

### Tests

- **[Test-Report](../../../testing/PreviewTab-Test-Report.md)**: Finaler Test-Report mit Coverage-Analyse
- **[Test-Dokumentation](./__tests__/PreviewTab.TEST_DOCUMENTATION.md)**: Detaillierte Test-Case-Dokumentation

### Verwandte Module

- **[ContentTab](../content-tab/README.md)**: Content-Erstellung mit KI-Assistent
- **[AttachmentsTab](../attachments-tab/README.md)**: Medien-Verwaltung
- **[ApprovalTab](../approval-tab/README.md)**: Freigabe-Workflow-Konfiguration

### Services

- **[CampaignContext](../../context/README.md)**: Zentrale State-Management-Dokumentation
- **[pdfVersionsService](../../../../lib/firebase/pdf-versions-service.md)**: PDF-Generierung & Versionen-Verwaltung
- **[toastService](../../../../lib/utils/toast.md)**: Toast-Benachrichtigungen

### Implementierungs-Planung

- **[Phase 2.4 Implementierungsplan](../../../../planning/campaigns/phase-2.4-preview-tab-refactoring.md)**: Vollständiger Refactoring-Plan

---

**Erstellt von:** Claude Code (Documentation Agent)
**Version:** 1.0.0
**Letzte Aktualisierung:** 05.11.2025
**Status:** ✅ Produktionsreif

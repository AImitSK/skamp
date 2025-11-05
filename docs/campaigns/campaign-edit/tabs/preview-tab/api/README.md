# PreviewTab API Documentation

> **Modul**: PreviewTab API & Context Integration
> **Context**: CampaignContext
> **Services**: pdfVersionsService, toastService
> **Letzte Aktualisierung**: 05.11.2025

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [CampaignContext Integration](#campaigncontext-integration)
- [Context Values (Read)](#context-values-read)
- [Context Actions (Write)](#context-actions-write)
- [PDF-Generierung API](#pdf-generierung-api)
- [Template-Auswahl API](#template-auswahl-api)
- [Toast-Service Integration](#toast-service-integration)
- [Edit-Lock-Status API](#edit-lock-status-api)
- [Code-Beispiele](#code-beispiele)
- [Siehe auch](#siehe-auch)

---

## Übersicht

PreviewTab nutzt ausschließlich **CampaignContext** für State Management. Diese Architektur-Entscheidung ermöglicht:

- ✅ **Konsistente States** über alle Campaign-Tabs
- ✅ **Zentralisierte Validierung** in Context-Actions
- ✅ **Toast-Integration** im Context-Layer
- ✅ **Keine State-Duplikation** (Single Source of Truth)

**KEIN React Query:** PreviewTab benötigt keine eigenen Netzwerk-Anfragen, alle Daten kommen aus dem Context.

---

## CampaignContext Integration

### Hook Import

```typescript
import { useCampaign } from '../context/CampaignContext';
```

### Context Provider (Parent Component)

```typescript
// In CampaignEditPage
<CampaignProvider campaignId={campaignId} organizationId={organizationId}>
  <PreviewTab
    organizationId={organizationId}
    campaignId={campaignId}
  />
</CampaignProvider>
```

### useCampaign Hook (in PreviewTab)

```typescript
export default React.memo(function PreviewTab({
  organizationId,
  campaignId
}: PreviewTabProps) {
  // Get all state from Context
  const {
    campaign,
    campaignTitle,
    editorContent,
    keyVisual,
    keywords,
    boilerplateSections,
    attachedAssets,
    seoScore,
    selectedCompanyName,
    approvalData,
    selectedTemplateId,
    updateSelectedTemplate,
    currentPdfVersion,
    generatingPdf,
    generatePdf,
    editLockStatus
  } = useCampaign();

  // ... Component Logic
});
```

---

## Context Values (Read)

### Content States

| Value | Type | Beschreibung | Verwendung in PreviewTab |
|-------|------|--------------|--------------------------|
| `campaign` | `PRCampaign \| null` | Komplette Kampagnen-Daten | Für PipelinePDFViewer (campaign.projectId check) |
| `campaignTitle` | `string` | Titel der Kampagne | Anzeige in CampaignPreviewStep |
| `editorContent` | `string` (HTML) | Haupt-Editor-Content | Verwendet in finalContentHtml useMemo |
| `pressReleaseContent` | `string` (HTML) | Finale Pressemitteilung (Legacy) | Nicht verwendet in PreviewTab |

**Code-Beispiel:**

```typescript
// campaignTitle wird an CampaignPreviewStep übergeben
<CampaignPreviewStep
  campaignTitle={campaignTitle}
  finalContentHtml={finalContentHtml}
  // ...
/>
```

### Visual & SEO States

| Value | Type | Beschreibung | Verwendung in PreviewTab |
|-------|------|--------------|--------------------------|
| `keyVisual` | `KeyVisualData \| undefined` | Key Visual Bild | Anzeige in CampaignPreviewStep (16:9 Format) |
| `keywords` | `string[]` | SEO-Keywords | Anzeige in CampaignPreviewStep (Statistiken + SEO-Box) |
| `seoScore` | `Object` | SEO-Analyse-Ergebnis | Anzeige in CampaignPreviewStep (PR-SEO Analyse) |

**SEO-Score Struktur:**

```typescript
interface SEOScore {
  totalScore: number;
  breakdown: {
    headline: number;
    keywords: number;
    structure: number;
    relevance: number;
    concreteness: number;
    engagement: number;
    social: number;
  };
  hints: string[];
  keywordMetrics: any[];
}
```

**Code-Beispiel:**

```typescript
<CampaignPreviewStep
  keyVisual={keyVisual}
  realPrScore={seoScore}
  keywords={keywords}
  // ...
/>
```

### Boilerplates & Assets

| Value | Type | Beschreibung | Verwendung in PreviewTab |
|-------|------|--------------|--------------------------|
| `boilerplateSections` | `BoilerplateSection[]` | Textbausteine | Verwendet in finalContentHtml useMemo + Statistiken |
| `attachedAssets` | `CampaignAssetAttachment[]` | Angehängte Medien | Anzeige in CampaignPreviewStep (Anhänge-Liste) |

**BoilerplateSection Struktur:**

```typescript
interface BoilerplateSection {
  id: string;
  type: 'boilerplate' | 'custom';
  boilerplateId?: string;
  content: string;
  metadata?: any;
  order: number;
  isLocked?: boolean;
  isCollapsed?: boolean;
  customTitle?: string;
  boilerplate?: any;
}
```

**Code-Beispiel:**

```typescript
// finalContentHtml kombiniert editorContent mit boilerplateSections
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

### Company & Approval States

| Value | Type | Beschreibung | Verwendung in PreviewTab |
|-------|------|--------------|--------------------------|
| `selectedCompanyName` | `string` | Kundenname | Anzeige in CampaignPreviewStep (Kampagnen-Info) |
| `approvalData` | `Object` | Approval-Konfiguration | Übergabe an CampaignPreviewStep (Freigabe-Badge) |

**ApprovalData Struktur (relevant für Preview):**

```typescript
interface ApprovalData {
  customerApprovalRequired: boolean;
  customerContact?: any;
  customerApprovalMessage?: string;
}
```

**Code-Beispiel:**

```typescript
<CampaignPreviewStep
  selectedCompanyName={selectedCompanyName}
  approvalData={approvalData}
  // ...
/>
```

### PDF States

| Value | Type | Beschreibung | Verwendung in PreviewTab |
|-------|------|--------------|--------------------------|
| `selectedTemplateId` | `string \| undefined` | Ausgewähltes PDF-Template | Template-Auswahl in CampaignPreviewStep |
| `currentPdfVersion` | `PDFVersion \| null` | Aktuelle PDF-Version | Anzeige der PDF-Version Box |
| `generatingPdf` | `boolean` | PDF-Generierungs-Status | Loading-State des PDF-Buttons |

**PDFVersion Struktur:**

```typescript
interface PDFVersion {
  id: string;
  campaignId: string;
  version: number;
  downloadUrl: string;
  status: 'draft' | 'pending_customer' | 'pending_team' | 'approved' | 'rejected' | 'changes_requested';
  createdAt: Timestamp;
  createdBy: string;
  // ... weitere Felder
}
```

**Code-Beispiel:**

```typescript
// currentPdfVersion Anzeige
{currentPdfVersion && (
  <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
    <span>Vorschau PDF</span>
    <Badge color={
      currentPdfVersion.status === 'draft' ? 'zinc' :
      currentPdfVersion.status === 'approved' ? 'green' : 'amber'
    }>
      {currentPdfVersion.status === 'draft' ? 'Entwurf' :
       currentPdfVersion.status === 'approved' ? 'Freigegeben' :
       'Freigabe angefordert'}
    </Badge>
    <Button onClick={() => window.open(currentPdfVersion.downloadUrl, '_blank')}>
      Download
    </Button>
  </div>
)}
```

### Edit Lock States

| Value | Type | Beschreibung | Verwendung in PreviewTab |
|-------|------|--------------|--------------------------|
| `editLockStatus` | `EditLockData` | Edit-Lock-Status | PDF-Generierungs-Button Ein/Aus |

**EditLockData Struktur:**

```typescript
interface EditLockData {
  isLocked: boolean;
  reason?: 'pending_customer_approval' | 'approved_final' | 'system_processing' | 'manual_lock';
  lockedBy?: string;
  lockedAt?: Timestamp;
}
```

**Code-Beispiel:**

```typescript
{!editLockStatus.isLocked ? (
  <Button onClick={() => generatePdf()}>
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

---

## Context Actions (Write)

### updateSelectedTemplate

**Signature:**

```typescript
updateSelectedTemplate: (templateId: string, templateName?: string) => void
```

**Zweck:** PDF-Template auswählen und in Campaign speichern

**Implementierung (in CampaignContext):**

```typescript
const updateSelectedTemplate = useCallback((templateId: string, templateName?: string) => {
  setSelectedTemplateId(templateId);

  // Toast-Meldung für Template-Auswahl
  if (templateName) {
    toastService.success(`PDF-Template "${templateName}" ausgewählt`);
  } else {
    toastService.success('PDF-Template ausgewählt');
  }
}, []);
```

**Verwendung in PreviewTab:**

```typescript
// Übergabe an CampaignPreviewStep
<CampaignPreviewStep
  selectedTemplateId={selectedTemplateId}
  onTemplateSelect={updateSelectedTemplate}
  // ...
/>
```

**Callback-Flow:**

1. User wählt Template im `TemplateSelector` (innerhalb CampaignPreviewStep)
2. `onTemplateSelect(templateId, templateName)` wird aufgerufen
3. `updateSelectedTemplate` im Context wird ausgeführt
4. `setSelectedTemplateId(templateId)` aktualisiert State
5. Toast: `"PDF-Template 'CeleroPress Standard' ausgewählt"`

**Toast-Benachrichtigung:**
- Mit Template-Name: `"PDF-Template '[Name]' ausgewählt"`
- Ohne Template-Name: `"PDF-Template ausgewählt"`

### generatePdf

**Signature:**

```typescript
generatePdf: (forApproval?: boolean) => Promise<void>
```

**Zweck:** PDF-Version erstellen mit Validierung und Toast-Feedback

**Implementierung (in CampaignContext):**

```typescript
const generatePdf = async (forApproval: boolean = false) => {
  if (!user || !campaignTitle.trim()) {
    toastService.error('Bitte füllen Sie alle erforderlichen Felder aus');
    return;
  }

  // Validiere erforderliche Felder
  const errors: string[] = [];
  if (!selectedCompanyId) {
    errors.push('Bitte wählen Sie einen Kunden aus');
  }
  if (!campaignTitle.trim()) {
    errors.push('Titel ist erforderlich');
  }
  if (!editorContent.trim() || editorContent === '<p></p>') {
    errors.push('Inhalt ist erforderlich');
  }

  if (errors.length > 0) {
    toastService.error(errors.join(', '));
    return;
  }

  if (!campaignId) {
    toastService.error('Campaign-ID nicht gefunden');
    return;
  }

  setGeneratingPdf(true);

  try {
    // PDF für Campaign erstellen
    const pdfVersionId = await pdfVersionsService.createPDFVersion(
      campaignId,
      organizationId,
      {
        title: campaignTitle,
        mainContent: editorContent,
        boilerplateSections,
        keyVisual,
        clientName: selectedCompanyName,
        templateId: selectedTemplateId
      },
      {
        userId: user.uid,
        status: forApproval ? 'pending_customer' : 'draft'
      }
    );

    // PDF-Version für Vorschau laden
    const newVersion = await pdfVersionsService.getCurrentVersion(campaignId);
    setCurrentPdfVersion(newVersion);

    toastService.success('PDF erfolgreich generiert!');

  } catch (error) {
    toastService.error('Fehler bei der PDF-Erstellung');
  } finally {
    setGeneratingPdf(false);
  }
};
```

**Verwendung in PreviewTab:**

```typescript
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

**Validierung:**

| Feld | Prüfung | Error-Message |
|------|---------|---------------|
| `selectedCompanyId` | Nicht leer | "Bitte wählen Sie einen Kunden aus" |
| `campaignTitle` | Nicht leer, trim | "Titel ist erforderlich" |
| `editorContent` | Nicht leer, nicht `<p></p>` | "Inhalt ist erforderlich" |
| `user` | Eingeloggt | "Bitte füllen Sie alle erforderlichen Felder aus" |

**Flow:**

1. User klickt "PDF generieren"
2. Context validiert Felder
3. Bei Fehler: Toast mit Error-Liste → Return
4. `setGeneratingPdf(true)` → Button zeigt Loading-State
5. `pdfVersionsService.createPDFVersion()` wird aufgerufen
6. PDF wird generiert und in Firebase Storage hochgeladen
7. PDF-Version-Eintrag in Firestore erstellt
8. `pdfVersionsService.getCurrentVersion()` lädt neue Version
9. `setCurrentPdfVersion(newVersion)` aktualisiert State
10. Toast: "PDF erfolgreich generiert!"
11. `setGeneratingPdf(false)` → Button normalisiert sich

**Error Handling:**

| Error-Type | Toast-Message | Aktion |
|------------|---------------|--------|
| Validierung fehlgeschlagen | Error-Liste (z.B. "Titel ist erforderlich, Inhalt ist erforderlich") | Early Return |
| PDF-Service Fehler | "Fehler bei der PDF-Erstellung" | Finally-Block setzt generatingPdf=false |
| Campaign-ID fehlt | "Campaign-ID nicht gefunden" | Early Return |

---

## PDF-Generierung API

### pdfVersionsService.createPDFVersion

**Import:**

```typescript
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
```

**Signature:**

```typescript
pdfVersionsService.createPDFVersion(
  campaignId: string,
  organizationId: string,
  content: PDFContentData,
  options: PDFVersionOptions
): Promise<string>
```

**Content-Daten:**

```typescript
interface PDFContentData {
  title: string;
  mainContent: string;  // HTML
  boilerplateSections: BoilerplateSection[];
  keyVisual?: KeyVisualData;
  clientName: string;
  templateId?: string;
}
```

**Options:**

```typescript
interface PDFVersionOptions {
  userId: string;
  status: 'draft' | 'pending_customer' | 'pending_team' | 'approved';
}
```

**Return Value:** `pdfVersionId` (string)

**Verwendung im Context:**

```typescript
const pdfVersionId = await pdfVersionsService.createPDFVersion(
  campaignId,
  organizationId,
  {
    title: campaignTitle,
    mainContent: editorContent,
    boilerplateSections,
    keyVisual,
    clientName: selectedCompanyName,
    templateId: selectedTemplateId
  },
  {
    userId: user.uid,
    status: forApproval ? 'pending_customer' : 'draft'
  }
);
```

### pdfVersionsService.getCurrentVersion

**Signature:**

```typescript
pdfVersionsService.getCurrentVersion(campaignId: string): Promise<PDFVersion | null>
```

**Zweck:** Lädt die aktuelle (neueste) PDF-Version einer Kampagne

**Return Value:** `PDFVersion` Objekt oder `null`

**Verwendung im Context:**

```typescript
const newVersion = await pdfVersionsService.getCurrentVersion(campaignId);
setCurrentPdfVersion(newVersion);
```

### pdfVersionsService.getVersionHistory

**Signature:**

```typescript
pdfVersionsService.getVersionHistory(campaignId: string): Promise<PDFVersion[]>
```

**Zweck:** Lädt alle PDF-Versionen einer Kampagne

**Return Value:** Array von `PDFVersion` Objekten (sortiert nach Version)

**Verwendung in PDFVersionHistory:**

```typescript
const versionHistory = await pdfVersionsService.getVersionHistory(campaignId);
const sortedVersions = versionHistory.sort((a, b) => b.version - a.version);
```

### pdfVersionsService.generatePipelinePDF

**Signature:**

```typescript
pdfVersionsService.generatePipelinePDF(
  campaignId: string,
  campaign: PRCampaign,
  options: { organizationId: string; userId: string }
): Promise<string>
```

**Zweck:** Generiert interne Pipeline-PDF für projekt-verknüpfte Kampagnen

**Return Value:** PDF-URL (string)

**Verwendung in PipelinePDFViewer:**

```typescript
const pdfUrl = await pdfVersionsService.generatePipelinePDF(
  campaign.id,
  campaign,
  { organizationId, userId: 'current-user' }
);

setLastPdfUrl(pdfUrl);
onPDFGenerated?.(pdfUrl);
```

---

## Template-Auswahl API

### TemplateSelector Component

**Import (via CampaignPreviewStep):**

```typescript
import { TemplateSelector } from '@/components/templates/TemplateSelector';
```

**Props:**

```typescript
interface TemplateSelectorProps {
  organizationId: string;
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string, templateName: string) => void;
  showPreview?: boolean;
  onPreviewError?: (error: string) => void;
}
```

**Verwendung in CampaignPreviewStep:**

```typescript
<TemplateSelector
  organizationId={organizationId}
  selectedTemplateId={selectedTemplateId}
  onTemplateSelect={onTemplateSelect}
  showPreview={true}
  onPreviewError={(error) => {
    // TODO: Toast-Benachrichtigung
  }}
/>
```

**Callback-Flow:**

```
TemplateSelector (User wählt Template)
    ↓
onTemplateSelect(templateId, templateName)
    ↓
CampaignPreviewStep (Prop-Callback)
    ↓
updateSelectedTemplate (Context-Action)
    ↓
setSelectedTemplateId(templateId)
    ↓
toastService.success(`PDF-Template "${templateName}" ausgewählt`)
```

**Template-Persistierung:**

Template-ID wird im CampaignContext gespeichert und bei nächster PDF-Generierung verwendet:

```typescript
await pdfVersionsService.createPDFVersion(
  campaignId,
  organizationId,
  {
    // ...
    templateId: selectedTemplateId  // ← Hier wird gespeichertes Template verwendet
  },
  options
);
```

---

## Toast-Service Integration

### Import

```typescript
import { toastService } from '@/lib/utils/toast';
```

### Verfügbare Methoden

| Methode | Signature | Beschreibung |
|---------|-----------|--------------|
| `success` | `(message: string) => void` | Erfolgs-Benachrichtigung (grün) |
| `error` | `(message: string) => void` | Fehler-Benachrichtigung (rot) |
| `info` | `(message: string) => void` | Info-Benachrichtigung (blau) |
| `warning` | `(message: string) => void` | Warnung (gelb) |

### Toast-Übersicht (PreviewTab & Context)

| Aktion | Ort | Toast-Typ | Nachricht |
|--------|-----|-----------|-----------|
| PDF erfolgreich generiert | Context | `success` | "PDF erfolgreich generiert!" |
| PDF-Generierung fehlgeschlagen | Context | `error` | "Fehler bei der PDF-Erstellung" |
| Validierung fehlgeschlagen | Context | `error` | Error-Liste (z.B. "Titel ist erforderlich, Inhalt ist erforderlich") |
| Template ausgewählt (mit Name) | Context | `success` | `"PDF-Template '[Name]' ausgewählt"` |
| Template ausgewählt (ohne Name) | Context | `success` | "PDF-Template ausgewählt" |
| Pipeline-PDF generiert | PreviewTab | `success` | "Pipeline-PDF erfolgreich generiert" |

### Code-Beispiele

**Context-Toast (PDF-Generierung):**

```typescript
// Erfolg
toastService.success('PDF erfolgreich generiert!');

// Fehler
toastService.error('Fehler bei der PDF-Erstellung');

// Validierung
const errors = ['Titel ist erforderlich', 'Inhalt ist erforderlich'];
toastService.error(errors.join(', '));
```

**Context-Toast (Template-Auswahl):**

```typescript
if (templateName) {
  toastService.success(`PDF-Template "${templateName}" ausgewählt`);
} else {
  toastService.success('PDF-Template ausgewählt');
}
```

**Tab-Toast (Pipeline-PDF):**

```typescript
<PipelinePDFViewer
  campaign={campaign}
  organizationId={organizationId}
  onPDFGenerated={(pdfUrl: string) => {
    toastService.success('Pipeline-PDF erfolgreich generiert');
  }}
/>
```

---

## Edit-Lock-Status API

### EDIT_LOCK_CONFIG

**Import:**

```typescript
import { EDIT_LOCK_CONFIG } from '@/types/pr';
```

**Struktur:**

```typescript
const EDIT_LOCK_CONFIG: Record<EditLockReason, { label: string; description: string }> = {
  pending_customer_approval: {
    label: 'Kunde prüft',
    description: 'Die Kampagne wird gerade vom Kunden geprüft'
  },
  approved_final: {
    label: 'Freigegeben',
    description: 'Die Kampagne wurde freigegeben und kann nicht mehr bearbeitet werden'
  },
  system_processing: {
    label: 'System verarbeitet',
    description: 'Die Kampagne wird gerade vom System verarbeitet'
  },
  manual_lock: {
    label: 'Gesperrt',
    description: 'Die Kampagne wurde manuell gesperrt'
  }
};
```

**Verwendung in PreviewTab:**

```typescript
{editLockStatus.isLocked && (
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

**Fallback:** Wenn `editLockStatus.reason` undefined → "Bearbeitung nicht möglich"

### pdfVersionsService.getEditLockStatus

**Signature:**

```typescript
pdfVersionsService.getEditLockStatus(campaignId: string): Promise<EditLockData>
```

**Zweck:** Lädt den aktuellen Edit-Lock-Status einer Kampagne

**Return Value:**

```typescript
interface EditLockData {
  isLocked: boolean;
  reason?: 'pending_customer_approval' | 'approved_final' | 'system_processing' | 'manual_lock';
  lockedBy?: string;
  lockedAt?: Timestamp;
}
```

**Verwendung im Context:**

```typescript
const lockStatus = await pdfVersionsService.getEditLockStatus(campaignId);
setEditLockStatus(lockStatus);
```

**Lock-Status wird geladen:**
- Beim Campaign-Load (useEffect in CampaignContext)
- Nach PDF-Generierung (optional)
- Nach Approval-Workflow-Aktionen

---

## Code-Beispiele

### Vollständige Context-Integration

```typescript
// In PreviewTab.tsx
import { useCampaign } from '../context/CampaignContext';

export default React.memo(function PreviewTab({
  organizationId,
  campaignId
}: PreviewTabProps) {
  // Get all state from Context
  const {
    campaign,
    campaignTitle,
    editorContent,
    keyVisual,
    keywords,
    boilerplateSections,
    attachedAssets,
    seoScore,
    selectedCompanyName,
    approvalData,
    selectedTemplateId,
    updateSelectedTemplate,
    currentPdfVersion,
    generatingPdf,
    generatePdf,
    editLockStatus
  } = useCampaign();

  // Computed values
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

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Live Vorschau */}
      <CampaignPreviewStep
        campaignTitle={campaignTitle}
        finalContentHtml={finalContentHtml}
        keyVisual={keyVisual}
        selectedCompanyName={selectedCompanyName}
        realPrScore={seoScore}
        keywords={keywords}
        boilerplateSections={boilerplateSections}
        attachedAssets={attachedAssets}
        editorContent={editorContent}
        approvalData={approvalData}
        organizationId={organizationId}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={updateSelectedTemplate}
        showTemplateSelector={true}
      />

      {/* PDF-Generierung */}
      {!editLockStatus.isLocked ? (
        <Button
          onClick={() => generatePdf()}
          disabled={generatingPdf}
        >
          {generatingPdf ? 'PDF wird erstellt...' : 'PDF generieren'}
        </Button>
      ) : (
        <div>PDF-Erstellung gesperrt</div>
      )}

      {/* PDF-Version */}
      {currentPdfVersion && (
        <div>
          <span>Vorschau PDF</span>
          <Button onClick={() => window.open(currentPdfVersion.downloadUrl, '_blank')}>
            Download
          </Button>
        </div>
      )}

      {/* PDF-Versionen Historie */}
      <PDFVersionHistory
        campaignId={campaignId}
        organizationId={organizationId}
        showActions={true}
      />

      {/* Pipeline-PDF-Viewer */}
      {campaign?.projectId && (
        <PipelinePDFViewer
          campaign={campaign}
          organizationId={organizationId}
          onPDFGenerated={(pdfUrl) => {
            toastService.success('Pipeline-PDF erfolgreich generiert');
          }}
        />
      )}
    </div>
  );
});
```

### PDF-Generierung mit Validierung

```typescript
// In CampaignContext.tsx
const generatePdf = async (forApproval: boolean = false) => {
  // 1. User-Check
  if (!user) {
    toastService.error('Bitte melden Sie sich an');
    return;
  }

  // 2. Validierung
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

  // 3. Campaign-ID Check
  if (!campaignId) {
    toastService.error('Campaign-ID nicht gefunden');
    return;
  }

  // 4. Loading State
  setGeneratingPdf(true);

  try {
    // 5. PDF generieren
    const pdfVersionId = await pdfVersionsService.createPDFVersion(
      campaignId,
      organizationId,
      {
        title: campaignTitle,
        mainContent: editorContent,
        boilerplateSections,
        keyVisual,
        clientName: selectedCompanyName,
        templateId: selectedTemplateId
      },
      {
        userId: user.uid,
        status: forApproval ? 'pending_customer' : 'draft'
      }
    );

    // 6. Neue Version laden
    const newVersion = await pdfVersionsService.getCurrentVersion(campaignId);
    setCurrentPdfVersion(newVersion);

    // 7. Erfolgs-Toast
    toastService.success('PDF erfolgreich generiert!');

  } catch (error) {
    // 8. Error-Toast
    toastService.error('Fehler bei der PDF-Erstellung');
  } finally {
    // 9. Loading State zurücksetzen
    setGeneratingPdf(false);
  }
};
```

### Template-Auswahl Flow

```typescript
// 1. User wählt Template im TemplateSelector
// (TemplateSelector ist Child von CampaignPreviewStep)

// 2. TemplateSelector ruft onTemplateSelect auf
onTemplateSelect(templateId, templateName);

// 3. CampaignPreviewStep leitet an PreviewTab weiter
<TemplateSelector
  onTemplateSelect={onTemplateSelect}  // Prop von PreviewTab
/>

// 4. PreviewTab nutzt Context-Action
<CampaignPreviewStep
  onTemplateSelect={updateSelectedTemplate}  // Context-Action
/>

// 5. Context-Action aktualisiert State & zeigt Toast
const updateSelectedTemplate = useCallback((templateId: string, templateName?: string) => {
  setSelectedTemplateId(templateId);

  if (templateName) {
    toastService.success(`PDF-Template "${templateName}" ausgewählt`);
  } else {
    toastService.success('PDF-Template ausgewählt');
  }
}, []);
```

---

## Siehe auch

### Dokumentation

- **[PreviewTab Haupt-Dokumentation](../README.md)**: Übersicht, Architektur, Features
- **[Components-Dokumentation](../components/README.md)**: CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer
- **[ADR-Dokumentation](../adr/README.md)**: Architecture Decision Records

### Context

- **[CampaignContext Source](../../../../../../src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/context/CampaignContext.tsx)**
- **[CampaignContext Dokumentation](../../../context/README.md)**: Vollständige Context-API

### Services

- **[pdfVersionsService](../../../../../lib/firebase/pdf-versions-service.md)**: PDF-Generierung & Versionen-Verwaltung
- **[toastService](../../../../../lib/utils/toast.md)**: Toast-Benachrichtigungen

### Types

- **[@/types/pr](../../../../../../src/types/pr.ts)**: PRCampaign, EditLockData, KeyVisualData, EDIT_LOCK_CONFIG

---

**Erstellt von:** Claude Code (Documentation Agent)
**Version:** 1.0.0
**Letzte Aktualisierung:** 05.11.2025

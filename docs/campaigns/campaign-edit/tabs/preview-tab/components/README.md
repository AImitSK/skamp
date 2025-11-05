# PreviewTab Components

> **Modul**: PreviewTab Components
> **Externe Komponenten**: CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer
> **Letzte Aktualisierung**: 05.11.2025

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [CampaignPreviewStep](#campaignpreviewstep)
- [PDFVersionHistory](#pdfversionhistory)
- [PipelinePDFViewer](#pipelinepdfviewer)
- [Datenfluss](#datenfluss)
- [Gemeinsame Patterns](#gemeinsame-patterns)
- [Siehe auch](#siehe-auch)

---

## Übersicht

PreviewTab nutzt **drei externe Shared Components**, die auch in anderen Teilen der Applikation verwendet werden:

| Component | Pfad | Zweck | Wiederverwendbarkeit |
|-----------|------|-------|---------------------|
| **CampaignPreviewStep** | `src/components/campaigns/CampaignPreviewStep.tsx` | Live-Vorschau der Kampagne mit Template-Auswahl | ✅ Auch im Campaign Creation Wizard |
| **PDFVersionHistory** | `src/components/campaigns/PDFVersionHistory.tsx` | PDF-Versionen-Historie mit Download | ✅ Auch in Projekt-Übersicht verwendbar |
| **PipelinePDFViewer** | `src/components/campaigns/PipelinePDFViewer.tsx` | Pipeline-PDFs für interne Freigabe | ✅ Auch in Projekt-Pipeline verwendbar |

**Keine Inline-Components:** PreviewTab hat keine eigenen Sub-Components (außer conditional Workflow-Banner, ~40 Zeilen)

---

## CampaignPreviewStep

### Übersicht

**Datei:** `src/components/campaigns/CampaignPreviewStep.tsx`
**Zeilen:** ~294 Zeilen
**Zweck:** Live-Vorschau der Kampagne mit vollständigem Content, Statistiken und Template-Auswahl

### Props Interface

```typescript
interface CampaignPreviewStepProps {
  // Content Props
  campaignTitle: string;
  finalContentHtml: string;
  keyVisual?: KeyVisualData;
  editorContent: string;

  // Company & SEO
  selectedCompanyName?: string;
  realPrScore: {
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
  } | null;
  keywords: string[];

  // Boilerplates & Assets
  boilerplateSections: any[];
  attachedAssets: CampaignAssetAttachment[];

  // Approval
  approvalData: { customerApprovalRequired: boolean };

  // Template Integration
  organizationId?: string;
  selectedTemplateId?: string;
  onTemplateSelect?: (templateId: string, templateName: string) => void;
  showTemplateSelector?: boolean;
}
```

### Verwendung in PreviewTab

```typescript
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
```

### Hauptfunktionen

#### 1. Pressemitteilungs-Vorschau (Papier-Look)

**Layout:** 2-Spalten-Grid (2/3 Vorschau + 1/3 Sidebar)

**Vorschau-Bereich:**
```typescript
<div className="bg-white shadow-xl rounded-lg p-12 max-w-4xl mx-auto">
  {/* Key Visual im 16:9 Format */}
  {keyVisual?.url && (
    <div className="mb-8 -mx-12 -mt-12">
      <div className="w-full" style={{ aspectRatio: '16/9' }}>
        <img src={keyVisual.url} alt="Key Visual" />
      </div>
    </div>
  )}

  {/* Header */}
  <div className="mb-8">
    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
      Pressemitteilung
    </p>
    <h1 className="text-3xl font-bold text-gray-900 leading-tight">
      {campaignTitle || 'Titel der Pressemitteilung'}
    </h1>
  </div>

  {/* Content */}
  <div
    className="prose max-w-none text-gray-800 text-base leading-relaxed"
    dangerouslySetInnerHTML={{ __html: finalContentHtml }}
  />

  {/* Datum */}
  <p className="text-sm text-gray-600 mt-8 pt-4 border-t border-gray-200">
    {new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })}
  </p>
</div>
```

**CSS-Styling:** Inline `<style jsx>` für Content-Spezifika:
- Alle Texte in `#374151` (text-gray-700)
- CTA-Texte in Schwarz & Bold
- Hashtags in Schwarz ohne Dekoration
- Links ohne Unterstriche
- Blockquotes mit linker Border
- Keine Hover-Effekte

#### 2. Kampagnen-Info Sidebar

```typescript
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <div className="flex items-center gap-2 mb-3">
    <InformationCircleIcon className="h-5 w-5 text-gray-400" />
    <h4 className="font-semibold text-gray-900">Kampagnen-Info</h4>
  </div>
  <div className="space-y-2 text-sm">
    {selectedCompanyName && (
      <div className="flex justify-between">
        <span className="text-gray-600">Kunde:</span>
        <span className="font-medium text-right">{selectedCompanyName}</span>
      </div>
    )}
    {approvalData.customerApprovalRequired && (
      <div className="flex justify-between">
        <span className="text-gray-600">Freigabe:</span>
        <Badge color="amber">Erforderlich</Badge>
      </div>
    )}
  </div>
</div>
```

#### 3. Statistiken Sidebar

```typescript
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <div className="flex items-center gap-2 mb-3">
    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
    <h4 className="font-semibold text-gray-900">Statistiken</h4>
  </div>
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">Zeichen</span>
      <span className="font-mono text-sm">
        {(editorContent || '').replace(/<[^>]*>/g, '').length}
      </span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">Textbausteine</span>
      <span className="font-mono text-sm">{boilerplateSections.length}</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">Keywords</span>
      <span className="font-mono text-sm">{keywords.length}</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">Medien</span>
      <span className="font-mono text-sm">{attachedAssets.length}</span>
    </div>
  </div>
</div>
```

#### 4. PR-SEO Analyse Sidebar

**Conditional:** Nur wenn `keywords.length > 0`

```typescript
{keywords.length > 0 && (
  <div className="bg-white rounded-lg p-4 border border-gray-200">
    <div className="flex items-center gap-2 mb-3">
      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      <h4 className="font-semibold text-gray-900">PR-SEO Analyse</h4>
    </div>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Gesamt-Score</span>
        <Badge
          color={
            (realPrScore?.totalScore || 0) >= 76 ? 'green' :
            (realPrScore?.totalScore || 0) >= 51 ? 'amber' : 'red'
          }
        >
          {realPrScore?.totalScore || 0}/100
        </Badge>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Headline</span>
        <span className="font-mono text-sm">
          {Math.round(realPrScore?.breakdown?.headline || 0)}/100
        </span>
      </div>
      {/* ... weitere Breakdown-Werte */}
    </div>
  </div>
)}
```

**Score-Badges:**
- **Grün**: >= 76
- **Amber**: >= 51
- **Rot**: < 51

#### 5. Anhänge Sidebar

**Conditional:** Nur wenn `attachedAssets.length > 0`

```typescript
{attachedAssets.length > 0 && (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3">
      <PaperClipIcon className="h-5 w-5 text-gray-400" />
      <h4 className="font-semibold text-gray-900">Anhänge</h4>
    </div>
    <div className="space-y-2">
      {attachedAssets.slice(0, 3).map((asset) => (
        <div key={asset.id} className="flex items-center gap-2 text-sm">
          {asset.type === 'folder' ? (
            <FolderIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <DocumentTextIcon className="h-4 w-4 text-gray-400" />
          )}
          <span className="truncate text-gray-700">
            {asset.metadata.fileName || asset.metadata.folderName}
          </span>
        </div>
      ))}
      {attachedAssets.length > 3 && (
        <div className="text-xs text-gray-500 pt-1">
          +{attachedAssets.length - 3} weitere
        </div>
      )}
    </div>
  </div>
)}
```

**Features:**
- Zeigt erste 3 Assets
- Asset-Typ Icon (Folder vs. File)
- "+X weitere" Counter

#### 6. Template-Selector

**Conditional:** Nur wenn `showTemplateSelector && organizationId && onTemplateSelect`

```typescript
{showTemplateSelector && organizationId && onTemplateSelect && (
  <div className="bg-white border border-gray-200 rounded-lg p-6">
    <TemplateSelector
      organizationId={organizationId}
      selectedTemplateId={selectedTemplateId}
      onTemplateSelect={onTemplateSelect}
      showPreview={true}
      onPreviewError={(error) => {
        // TODO: Toast-Benachrichtigung hinzufügen
      }}
    />
  </div>
)}
```

**Callback-Flow:**
1. User wählt Template im TemplateSelector
2. `onTemplateSelect(templateId, templateName)` wird aufgerufen
3. Im PreviewTab → `updateSelectedTemplate` (Context-Funktion)
4. Toast: "PDF-Template '[Name]' ausgewählt"

### Wiederverwendbarkeit

**Auch verwendet in:**
- Campaign Creation Wizard (Step 5: Preview Step)
- Campaign Overview (Quick Preview Modal)

**Abstraktionslevel:** Hoch (keine Campaign-ID benötigt, arbeitet nur mit übergebenen Props)

---

## PDFVersionHistory

### Übersicht

**Datei:** `src/components/campaigns/PDFVersionHistory.tsx`
**Zeilen:** ~223 Zeilen
**Zweck:** Anzeige aller PDF-Versionen einer Kampagne mit Download-Funktionalität

### Props Interface

```typescript
interface PDFVersionHistoryProps {
  campaignId: string;
  organizationId: string;
  showActions?: boolean;
  compact?: boolean;
  onVersionSelect?: (version: PDFVersion) => void;
}
```

### Verwendung in PreviewTab

```typescript
<PDFVersionHistory
  campaignId={campaignId}
  organizationId={organizationId}
  showActions={true}
/>
```

**Default-Werte:**
- `showActions`: `true` (Download-Button anzeigen)
- `compact`: `false` (vollständige Ansicht)
- `onVersionSelect`: `undefined` (keine Click-Handler)

### Hauptfunktionen

#### 1. Versionen Laden

```typescript
useEffect(() => {
  loadVersions();
}, [campaignId]);

const loadVersions = async () => {
  setLoading(true);
  try {
    const versionHistory = await pdfVersionsService.getVersionHistory(campaignId);
    const current = await pdfVersionsService.getCurrentVersion(campaignId);

    // Sortiere nach Version absteigend (neueste zuerst)
    const sortedVersions = versionHistory.sort((a, b) => b.version - a.version);

    setVersions(sortedVersions);
    setCurrentVersion(current);
  } catch (error) {
    // Error handling
  } finally {
    setLoading(false);
  }
};
```

**Service-Calls:**
- `pdfVersionsService.getVersionHistory(campaignId)`: Alle Versionen
- `pdfVersionsService.getCurrentVersion(campaignId)`: Aktuelle Version

**Sortierung:** Neueste Version zuerst (absteigend nach `version` Nummer)

#### 2. Status-Icon Mapping

```typescript
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    case 'rejected':
      return <XCircleIcon className="h-5 w-5 text-red-600" />;
    case 'pending_customer':
    case 'pending_team':
      return <ClockIcon className="h-5 w-5 text-yellow-600" />;
    case 'changes_requested':
      return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />;
    default:
      return <DocumentTextIcon className="h-5 w-5 text-gray-400" />;
  }
};
```

#### 3. Status-Label & Color

```typescript
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Entwurf';
    case 'pending_customer':
      return 'Zur Kundenfreigabe';
    case 'pending_team':
      return 'Zur Teamfreigabe';
    case 'approved':
      return 'Freigegeben';
    case 'rejected':
      return 'Abgelehnt';
    case 'changes_requested':
      return 'Änderungen angefordert';
    default:
      return status;
  }
};

const getStatusColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'zinc' => {
  switch (status) {
    case 'approved': return 'green';
    case 'pending_customer':
    case 'pending_team': return 'yellow';
    case 'rejected': return 'red';
    case 'changes_requested': return 'orange';
    case 'draft': return 'blue';
    default: return 'zinc';
  }
};
```

#### 4. Version-Card Rendering

```typescript
{versions.map((version) => {
  const isCurrent = currentVersion?.id === version.id;

  return (
    <div
      key={version.id}
      className={`
        border rounded-lg p-3 transition-all
        ${isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
        ${onVersionSelect ? 'cursor-pointer' : ''}
      `}
      onClick={() => onVersionSelect?.(version)}
    >
      <div className="flex items-center justify-between">
        {/* Version Info */}
        <div className="flex items-center gap-3">
          <Text className="font-medium">PDF v{version.version}</Text>
          {isCurrent && <Badge color="blue">Aktuell</Badge>}
          <Badge color={getStatusColor(version.status)}>
            {getStatusLabel(version.status)}
          </Badge>
          <Text className="text-sm text-gray-500">
            {formatDateShort(timestamp)}
          </Text>
        </div>

        {/* Download Action */}
        {showActions && (
          <Button
            plain
            onClick={(e) => {
              e.stopPropagation();
              window.open(version.downloadUrl, '_blank');
            }}
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
})}
```

**Highlights:**
- **Aktuelle Version** wird blau hervorgehoben
- **Version-Nummer** wird angezeigt (v1, v2, v3, ...)
- **Status-Badge** mit Farbe
- **Datum** formatiert mit `formatDateShort()`
- **Download-Button** (stopPropagation für onVersionSelect)

#### 5. Loading & Empty States

```typescript
// Loading
if (loading) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 bg-gray-200 rounded-lg"></div>
      <div className="h-24 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

// Empty
if (versions.length === 0) {
  return (
    <div className="text-center py-8 bg-gray-50 rounded-lg">
      <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300" />
      <Text className="mt-2 text-gray-500">
        Noch keine PDF-Versionen vorhanden
      </Text>
    </div>
  );
}
```

#### 6. Timestamp-Behandlung (Robust)

```typescript
const getTimestamp = (createdAt: any) => {
  // Standard Firebase Timestamp
  if (createdAt?.toDate) {
    return createdAt.toDate();
  }
  // Native Date Object
  if (createdAt instanceof Date) {
    return createdAt;
  }
  // Unaufgelöste serverTimestamp() FieldValue-Objekte (Legacy)
  if (createdAt && typeof createdAt === 'object' && createdAt._methodName === 'serverTimestamp') {
    const now = new Date();
    const versionOffset = (version.version - 1) * 60000; // 1 Minute pro Version zurück
    return new Date(now.getTime() - versionOffset);
  }
  // Fehlerhafte Timestamp-Objekte mit seconds/nanoseconds
  if (createdAt && typeof createdAt === 'object') {
    const seconds = createdAt.seconds || createdAt._seconds;
    const nanoseconds = createdAt.nanoseconds || createdAt._nanoseconds || 0;

    if (typeof seconds === 'number') {
      return new Date(seconds * 1000 + nanoseconds / 1000000);
    }
  }
  return null;
};
```

**Grund:** Legacy-Daten und verschiedene Timestamp-Formate

### Wiederverwendbarkeit

**Auch verwendbar in:**
- Projekt-Übersicht (alle Kampagnen-PDFs)
- Campaign-Archiv (historische PDFs)
- Admin-Dashboard (PDF-Verwaltung)

**Abstraktionslevel:** Hoch (benötigt nur `campaignId` und `organizationId`)

---

## PipelinePDFViewer

### Übersicht

**Datei:** `src/components/campaigns/PipelinePDFViewer.tsx`
**Zeilen:** ~246 Zeilen
**Zweck:** Pipeline-PDFs für interne Freigabe bei projekt-verknüpften Kampagnen

**Feature:** Nur relevant für Kampagnen die mit einem Projekt verknüpft sind (`campaign.projectId`)

### Props Interface

```typescript
interface PipelinePDFViewerProps {
  campaign: PRCampaign;
  organizationId: string;
  onPDFGenerated?: (pdfUrl: string) => void;
  className?: string;
}
```

### Verwendung in PreviewTab

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

**Conditional:** Nur wenn `campaign.projectId` vorhanden

### Hauptfunktionen

#### 1. Pipeline-Stadium-Konfiguration

```typescript
const getStageConfig = (stage?: PipelineStage) => {
  switch (stage) {
    case 'creation':
      return {
        label: 'Erstellung',
        color: 'blue' as const,
        icon: DocumentTextIcon,
        description: 'Entwurfs-PDFs für interne Abstimmung'
      };
    case 'internal_approval':
      return {
        label: 'Review',
        color: 'amber' as const,
        icon: ClockIcon,
        description: 'Review-PDFs für Team-Freigabe'
      };
    case 'customer_approval':
      return {
        label: 'Freigabe',
        color: 'green' as const,
        icon: CheckCircleIcon,
        description: 'Finale PDFs für Kunden-Freigabe'
      };
    default:
      return {
        label: 'Unbekannt',
        color: 'zinc' as const,
        icon: DocumentTextIcon,
        description: 'Pipeline-PDFs'
      };
  }
};

const stageConfig = getStageConfig(pdfInfo.currentStage);
```

**Pipeline-Stadien:**
- **Creation**: Entwurfs-Phase (blau)
- **Internal Approval**: Review-Phase (amber)
- **Customer Approval**: Freigabe-Phase (grün)

#### 2. Pipeline-PDF Generierung

```typescript
const handleGeneratePipelinePDF = async () => {
  if (!campaign.id || !campaign.projectId) {
    setError('Kampagne oder Projekt-ID fehlt');
    return;
  }

  setGenerating(true);
  setError('');

  try {
    const pdfUrl = await pdfVersionsService.generatePipelinePDF(
      campaign.id,
      campaign,
      { organizationId, userId: 'current-user' }
    );

    setLastPdfUrl(pdfUrl);
    setPdfInfo(prev => ({
      ...prev,
      versionCount: prev.versionCount + 1,
      lastGenerated: Timestamp.now()
    }));

    onPDFGenerated?.(pdfUrl);
  } catch (error) {
    console.error('Pipeline-PDF-Generierung fehlgeschlagen:', error);
    setError('PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
  } finally {
    setGenerating(false);
  }
};
```

**Callback-Flow:**
1. User klickt "PDF generieren"
2. `pdfVersionsService.generatePipelinePDF()` wird aufgerufen
3. PDF wird generiert und URL zurückgegeben
4. `onPDFGenerated(pdfUrl)` Callback wird ausgeführt
5. PreviewTab zeigt Toast: "Pipeline-PDF erfolgreich generiert"

#### 3. Header mit Generierungs-Button

```typescript
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <stageConfig.icon className="h-5 w-5 text-gray-500" />
    <Text className="font-medium">Interne Pipeline-PDFs</Text>
    <Badge color={stageConfig.color} className="text-xs">
      {stageConfig.label}
    </Badge>
  </div>

  <Button
    onClick={handleGeneratePipelinePDF}
    disabled={generating}
    color="secondary"
  >
    {generating ? (
      <>
        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
        Generiere...
      </>
    ) : (
      <>
        <DocumentTextIcon className="h-4 w-4 mr-2" />
        PDF generieren
      </>
    )}
  </Button>
</div>
```

#### 4. Pipeline-Stadium Info

```typescript
<div className="mb-4 p-3 bg-gray-50 rounded-lg">
  <Text className="text-sm text-gray-600">
    {stageConfig.description}
  </Text>
  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
    <span>Versionen: {pdfInfo.versionCount}</span>
    {pdfInfo.lastGenerated && (
      <span>
        Zuletzt: {new Date(pdfInfo.lastGenerated.toDate()).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    )}
    {pdfInfo.autoGenerate && (
      <Badge color="green" className="text-xs">
        Auto-Generation AN
      </Badge>
    )}
  </div>
</div>
```

**Anzeige:**
- Stadium-Beschreibung (context-abhängig)
- Versionszähler
- Letzter Generierungs-Zeitstempel (formatiert)
- Auto-Generation Badge (wenn aktiviert)

#### 5. Error Display

```typescript
{error && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center gap-2">
      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      <Text className="text-sm text-red-700">{error}</Text>
    </div>
  </div>
)}
```

#### 6. PDF Actions (Download & Share)

```typescript
<div className="flex items-center gap-2">
  {lastPdfUrl && (
    <>
      <Button
        onClick={handleDownload}
        plain
      >
        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
        Download
      </Button>

      <Button
        onClick={() => {
          if (lastPdfUrl) {
            navigator.clipboard.writeText(lastPdfUrl);
          }
        }}
        plain
      >
        <ShareIcon className="h-4 w-4 mr-1" />
        Link kopieren
      </Button>
    </>
  )}

  {!lastPdfUrl && pdfInfo.versionCount === 0 && (
    <Text className="text-sm text-gray-500">
      Noch keine Pipeline-PDF generiert
    </Text>
  )}
</div>
```

**Actions:**
- **Download**: Öffnet PDF in neuem Tab (`window.open()`)
- **Link kopieren**: Kopiert URL in Zwischenablage (`navigator.clipboard.writeText()`)

#### 7. Auto-Generate Hinweis

```typescript
{pdfInfo.autoGenerate && (
  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
    📄 Bei jeder Speicherung wird automatisch eine neue interne PDF-Version erstellt
  </div>
)}
```

**Feature:** Wenn aktiviert, wird bei jedem Campaign-Save automatisch eine neue Pipeline-PDF generiert

### Wiederverwendbarkeit

**Auch verwendbar in:**
- Projekt-Pipeline-Ansicht (alle Kampagnen-PDFs des Projekts)
- Workflow-Dashboard (Pipeline-Status-Übersicht)

**Abstraktionslevel:** Mittel (benötigt vollständiges `campaign` Objekt)

---

## Datenfluss

### Datenfluss-Diagramm

```
PreviewTab (Context Consumer)
│
├─→ CampaignContext (Daten-Quelle)
│   ├─→ campaignTitle
│   ├─→ editorContent
│   ├─→ boilerplateSections
│   ├─→ keyVisual
│   ├─→ keywords
│   ├─→ seoScore
│   ├─→ attachedAssets
│   ├─→ selectedCompanyName
│   ├─→ approvalData
│   ├─→ selectedTemplateId
│   ├─→ updateSelectedTemplate
│   ├─→ currentPdfVersion
│   ├─→ generatingPdf
│   └─→ generatePdf
│
├─→ useMemo (Berechnung)
│   └─→ finalContentHtml = editorContent + boilerplateSections
│
├─→ CampaignPreviewStep (Externe Component)
│   ├─→ Props: campaignTitle, finalContentHtml, keyVisual, ...
│   ├─→ Callback: onTemplateSelect(templateId, templateName)
│   └─→ Trigger: updateSelectedTemplate (Context)
│
├─→ PDFVersionHistory (Externe Component)
│   ├─→ Props: campaignId, organizationId, showActions
│   ├─→ Service: pdfVersionsService.getVersionHistory()
│   └─→ Action: window.open(downloadUrl)
│
└─→ PipelinePDFViewer (Externe Component, conditional)
    ├─→ Props: campaign, organizationId
    ├─→ Service: pdfVersionsService.generatePipelinePDF()
    ├─→ Callback: onPDFGenerated(pdfUrl)
    └─→ Trigger: toastService.success()
```

### Props-Flow

| Component | Props In | Callbacks Out | Context Used |
|-----------|----------|---------------|--------------|
| **PreviewTab** | `organizationId`, `campaignId` | - | ✅ Alle Campaign-States |
| **CampaignPreviewStep** | 13 Props (siehe Interface) | `onTemplateSelect` | ❌ Keine |
| **PDFVersionHistory** | `campaignId`, `organizationId`, `showActions` | `onVersionSelect` (optional) | ❌ Keine |
| **PipelinePDFViewer** | `campaign`, `organizationId` | `onPDFGenerated` (optional) | ❌ Keine |

**Design-Prinzip:** Komponenten sind **context-agnostic** und können ohne CampaignContext verwendet werden.

---

## Gemeinsame Patterns

### 1. Conditional Rendering

Alle drei Komponenten nutzen Conditional Rendering für optionale UI-Elemente:

**CampaignPreviewStep:**
```typescript
{keyVisual?.url && <img src={keyVisual.url} />}
{keywords.length > 0 && <PRScoreBox />}
{attachedAssets.length > 0 && <AssetsList />}
{showTemplateSelector && organizationId && <TemplateSelector />}
```

**PDFVersionHistory:**
```typescript
{loading && <SkeletonLoader />}
{!loading && versions.length === 0 && <EmptyState />}
{!loading && versions.length > 0 && <VersionsList />}
```

**PipelinePDFViewer:**
```typescript
{!campaign.projectId && null}  // Frühes Return
{error && <ErrorDisplay />}
{lastPdfUrl && <DownloadActions />}
{pdfInfo.autoGenerate && <AutoGenerateHint />}
```

### 2. Loading States

**PDFVersionHistory:**
```typescript
if (loading) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 bg-gray-200 rounded-lg"></div>
      <div className="h-24 bg-gray-200 rounded-lg"></div>
    </div>
  );
}
```

**PipelinePDFViewer:**
```typescript
<Button disabled={generating}>
  {generating ? (
    <>
      <ArrowPathIcon className="animate-spin" />
      Generiere...
    </>
  ) : (
    <>PDF generieren</>
  )}
</Button>
```

### 3. Status-Badge Mapping

**PDFVersionHistory:**
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'green';
    case 'pending_customer':
    case 'pending_team': return 'yellow';
    case 'rejected': return 'red';
    case 'changes_requested': return 'orange';
    case 'draft': return 'blue';
    default: return 'zinc';
  }
};
```

**PipelinePDFViewer:**
```typescript
const getStageConfig = (stage?: PipelineStage) => {
  switch (stage) {
    case 'creation': return { color: 'blue', ... };
    case 'internal_approval': return { color: 'amber', ... };
    case 'customer_approval': return { color: 'green', ... };
    default: return { color: 'zinc', ... };
  }
};
```

### 4. Service-Integration

Alle Komponenten nutzen **Firebase Services** für Daten:

```typescript
// PDFVersionHistory
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
await pdfVersionsService.getVersionHistory(campaignId);
await pdfVersionsService.getCurrentVersion(campaignId);

// PipelinePDFViewer
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
await pdfVersionsService.generatePipelinePDF(campaignId, campaign, options);
```

### 5. Error Handling

**PipelinePDFViewer (explizit):**
```typescript
try {
  const pdfUrl = await pdfVersionsService.generatePipelinePDF(...);
  onPDFGenerated?.(pdfUrl);
} catch (error) {
  console.error('Pipeline-PDF-Generierung fehlgeschlagen:', error);
  setError('PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
}
```

**PDFVersionHistory (silent):**
```typescript
try {
  const versions = await pdfVersionsService.getVersionHistory(campaignId);
  setVersions(versions);
} catch (error) {
  // Silent error handling (leere Liste wird angezeigt)
}
```

---

## Siehe auch

### Dokumentation

- **[PreviewTab Haupt-Dokumentation](../README.md)**: Übersicht, Architektur, Verwendung
- **[API-Dokumentation](../api/README.md)**: CampaignContext Integration
- **[ADR-Dokumentation](../adr/README.md)**: Architecture Decision Records

### Externe Components (Source)

- **[CampaignPreviewStep.tsx](../../../../../../src/components/campaigns/CampaignPreviewStep.tsx)**
- **[PDFVersionHistory.tsx](../../../../../../src/components/campaigns/PDFVersionHistory.tsx)**
- **[PipelinePDFViewer.tsx](../../../../../../src/components/campaigns/PipelinePDFViewer.tsx)**

### Services

- **[pdfVersionsService](../../../../../lib/firebase/pdf-versions-service.md)**: PDF-Generierung & Versionen-Verwaltung
- **[toastService](../../../../../lib/utils/toast.md)**: Toast-Benachrichtigungen

---

**Erstellt von:** Claude Code (Documentation Agent)
**Version:** 1.0.0
**Letzte Aktualisierung:** 05.11.2025

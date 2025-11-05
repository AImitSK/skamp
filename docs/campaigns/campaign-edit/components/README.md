# Campaign Components - Dokumentation

**Version:** 1.1
**Letzte Aktualisierung:** 05. November 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [CampaignContext](#campaigncontext)
- [Tab-Komponenten](#tab-komponenten)
- [Support-Komponenten](#support-komponenten)
- [Usage-Beispiele](#usage-beispiele)
- [Best Practices](#best-practices)

---

## Übersicht

Die Campaign Edit Page besteht aus modularen Komponenten mit Context-basiertem State Management.

### Komponenten-Hierarchie

```
page.tsx (Orchestrator)
├── CampaignProvider (Context)
│   └── CampaignEditPageContent
│       ├── CampaignHeader
│       ├── TabNavigation
│       ├── EditLockBanner (wenn locked)
│       ├── ContentTab
│       ├── AttachmentsTab
│       ├── ApprovalTab
│       └── PreviewTab
└── Modals
    ├── AssetSelectorModal
    ├── StructuredGenerationModal (KI-Assistent)
    └── ProjectAssignmentMigrationDialog
```

---

## CampaignContext

**Location:** `context/CampaignContext.tsx`

**Zweck:** Zentrales State Management für die gesamte Campaign Edit Page

### Interface

```typescript
interface CampaignContextValue {
  // Core Campaign State
  campaign: PRCampaign | null;
  loading: boolean;
  saving: boolean;

  // Navigation
  activeTab: 1 | 2 | 3 | 4;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;

  // Campaign Actions
  setCampaign: (campaign: PRCampaign | null) => void;
  updateField: (field: keyof PRCampaign, value: any) => void;
  saveCampaign: () => Promise<void>;
  reloadCampaign: () => Promise<void>;

  // Content States
  campaignTitle: string;
  editorContent: string;
  pressReleaseContent: string;
  updateTitle: (title: string) => void;
  updateEditorContent: (content: string) => void;
  updatePressReleaseContent: (content: string) => void;

  // SEO States
  keywords: string[];
  updateKeywords: (keywords: string[]) => void;
  seoScore: any;
  updateSeoScore: (scoreData: any) => void;

  // Visual States
  keyVisual: KeyVisualData | undefined;
  updateKeyVisual: (visual: KeyVisualData | undefined) => void;

  // Boilerplates States
  boilerplateSections: BoilerplateSection[];
  updateBoilerplateSections: (sections: BoilerplateSection[]) => void;

  // Assets States
  attachedAssets: CampaignAssetAttachment[];
  updateAttachedAssets: (assets: CampaignAssetAttachment[]) => void;
  removeAsset: (assetId: string) => void;

  // Company & Project States
  selectedCompanyId: string;
  selectedCompanyName: string;
  selectedProjectId: string;
  selectedProjectName: string | undefined;
  selectedProject: Project | null;
  dokumenteFolderId: string | undefined;
  updateCompany: (companyId: string, companyName: string) => void;
  updateProject: (projectId: string, projectName?: string, project?: Project | null) => void;
  updateDokumenteFolderId: (folderId: string | undefined) => void;

  // Approval States
  approvalData: any;
  updateApprovalData: (data: any) => void;
  previousFeedback: any[];

  // Template States
  selectedTemplateId: string | undefined;
  updateSelectedTemplate: (templateId: string, templateName?: string) => void;

  // PDF Generation
  generatingPdf: boolean;
  currentPdfVersion: PDFVersion | null;
  generatePdf: (forApproval?: boolean) => Promise<void>;

  // Edit Lock
  editLockStatus: EditLockData;
  loadingEditLock: boolean;

  // Approval Workflow
  approvalLoading: boolean;
  submitForApproval: () => Promise<void>;
  approveCampaign: (approved: boolean, note?: string) => Promise<void>;
}
```

### Provider

**Props:**
```typescript
interface CampaignProviderProps {
  children: React.ReactNode;
  campaignId: string;
  organizationId: string;
}
```

**Verwendung:**
```typescript
export default function EditPRCampaignPage({ params }) {
  const { campaignId } = use(params);
  const { currentOrganization } = useOrganization();

  return (
    <CampaignProvider
      campaignId={campaignId}
      organizationId={currentOrganization.id}
    >
      <CampaignEditPageContent campaignId={campaignId} />
    </CampaignProvider>
  );
}
```

### Hook: useCampaign

**Verwendung in Komponenten:**
```typescript
function ContentTab() {
  const {
    campaignTitle,
    updateTitle,
    editorContent,
    updateEditorContent,
    keywords,
    updateKeywords,
    seoScore
  } = useCampaign();

  return (
    <div>
      <input
        value={campaignTitle}
        onChange={(e) => updateTitle(e.target.value)}
      />
      <Editor
        content={editorContent}
        onChange={updateEditorContent}
      />
      <KeywordInput
        keywords={keywords}
        onChange={updateKeywords}
      />
      <SEOScore score={seoScore} />
    </div>
  );
}
```

### Context-Features

#### Auto-Loading
```typescript
// Context lädt Campaign automatisch bei Mount
useEffect(() => {
  loadCampaign();
}, [loadCampaign]);

// loadCampaign() holt Campaign aus Firestore und setzt alle States
const loadCampaign = useCallback(async () => {
  setLoading(true);
  try {
    const campaign = await prService.getById(campaignId);
    setCampaign(campaign);

    // Setze alle Content-States aus Campaign
    setCampaignTitle(campaign.title || '');
    setEditorContent(campaign.mainContent || '');
    setKeywords(campaign.keywords || []);
    // ... weitere States

  } catch (error) {
    toastService.error('Kampagne konnte nicht geladen werden');
  } finally {
    setLoading(false);
  }
}, [campaignId, organizationId]);
```

#### Optimistic Updates
```typescript
// Update-Functions verwenden useCallback für Performance
const updateTitle = useCallback((title: string) => {
  setCampaignTitle(title); // Sofortiges UI-Update
}, []);

const updateEditorContent = useCallback((content: string) => {
  setEditorContent(content); // Sofortiges UI-Update
}, []);

// Speichern erfolgt später über saveCampaign()
```

#### Edit-Lock-Integration
```typescript
// Context lädt Edit-Lock Status automatisch
const loadCampaign = useCallback(async () => {
  // ... Campaign laden

  // Lade Edit-Lock Status
  try {
    setLoadingEditLock(true);
    const lockStatus = await pdfVersionsService.getEditLockStatus(campaignId);
    setEditLockStatus(lockStatus);
  } catch (error) {
    // Edit-Lock Fehler nicht kritisch
  } finally {
    setLoadingEditLock(false);
  }
}, [campaignId]);

// UI kann lockStatus.isLocked prüfen
if (editLockStatus.isLocked) {
  // Zeige Banner & deaktiviere Speichern-Button
}
```

---

## Tab-Komponenten

### ContentTab

**Location:** `tabs/ContentTab.tsx`

**Zweck:** Content-Erstellung (Editor, SEO, Key Visual)

**Props:**
```typescript
interface ContentTabProps {
  organizationId: string;
  userId: string;
  campaignId: string;
  onOpenAiModal: () => void;
  onSeoScoreChange: (scoreData: any) => void;
}
```

**Features:**
- Rich-Text-Editor (CampaignContentComposer)
- KI-Assistent-Button
- SEO-Score-Anzeige
- Key Visual Upload
- Letztes Kunden-Feedback Banner

**Context-Integration:**
```typescript
const {
  campaignTitle,
  updateTitle,
  editorContent,
  updateEditorContent,
  pressReleaseContent,
  updatePressReleaseContent,
  boilerplateSections,
  updateBoilerplateSections,
  keywords,
  updateKeywords,
  keyVisual,
  updateKeyVisual,
  selectedCompanyId,
  selectedCompanyName,
  selectedProjectId,
  selectedProjectName,
  previousFeedback
} = useCampaign();
```

**Verwendung:**
```typescript
<ContentTab
  organizationId={currentOrganization.id}
  userId={user.uid}
  campaignId={campaignId}
  onOpenAiModal={() => setShowAiModal(true)}
  onSeoScoreChange={(scoreData) => {
    // Handle SEO score updates
  }}
/>
```

**Komponenten-Struktur:**
```tsx
<div className="bg-white rounded-lg border p-6">
  {/* Letztes Kunden-Feedback Banner */}
  {previousFeedback.length > 0 && (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <ExclamationTriangleIcon />
      <p>{lastCustomerFeedback.comment}</p>
    </div>
  )}

  <FieldGroup>
    {/* Pressemeldung */}
    <div className="mb-8 mt-8">
      {/* KI-Assistent CTA */}
      <button onClick={onOpenAiModal}>
        <SparklesIcon />
        Schnellstart mit dem KI-Assistenten
      </button>

      {/* Content Composer mit SEO-Features */}
      <CampaignContentComposer
        title={campaignTitle}
        onTitleChange={updateTitle}
        mainContent={editorContent}
        onMainContentChange={updateEditorContent}
        onFullContentChange={updatePressReleaseContent}
        keywords={keywords}
        onKeywordsChange={updateKeywords}
        onSeoScoreChange={onSeoScoreChange}
        // ... weitere Props
      />
    </div>

    {/* Key Visual */}
    <div className="mt-8">
      <KeyVisualSection
        value={keyVisual}
        onChange={updateKeyVisual}
        clientId={selectedCompanyId}
        clientName={selectedCompanyName}
        organizationId={organizationId}
        userId={userId}
        // Smart Router Props
        campaignId={campaignId}
        campaignName={campaignTitle}
        selectedProjectId={selectedProjectId}
        selectedProjectName={selectedProjectName}
        enableSmartRouter={true}
      />
    </div>
  </FieldGroup>
</div>
```

### AttachmentsTab

**Location:** `tabs/AttachmentsTab.tsx`

**Zweck:** Asset-Management (Medien, Textbausteine)

**Props:**
```typescript
interface AttachmentsTabProps {
  organizationId: string;
  onOpenAssetSelector: () => void;
}
```

**Features:**
- Textbausteine-Loader (SimpleBoilerplateLoader)
- Medien-Liste mit Thumbnails
- Asset entfernen
- Empty State mit "Medien hinzufügen" Button

**Context-Integration:**
```typescript
const {
  selectedCompanyId: clientId,
  selectedCompanyName: clientName,
  boilerplateSections,
  updateBoilerplateSections,
  attachedAssets,
  removeAsset
} = useCampaign();
```

**Verwendung:**
```typescript
<AttachmentsTab
  organizationId={currentOrganization.id}
  onOpenAssetSelector={() => setShowAssetSelector(true)}
/>
```

**Komponenten-Struktur:**
```tsx
<div className="bg-white rounded-lg border p-6">
  <FieldGroup>
    {/* Textbausteine */}
    <div className="mb-6">
      <SimpleBoilerplateLoader
        organizationId={organizationId}
        clientId={clientId}
        clientName={clientName}
        onSectionsChange={updateBoilerplateSections}
        initialSections={boilerplateSections}
      />
    </div>

    {/* Medien */}
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3>Medien</h3>
        {clientId && (
          <Button onClick={onOpenAssetSelector}>
            <PlusIcon />
            Medien hinzufügen
          </Button>
        )}
      </div>

      {attachedAssets.length > 0 ? (
        <div className="space-y-2">
          {attachedAssets.map((attachment) => (
            <div key={attachment.id}>
              {/* Thumbnail oder Icon */}
              {attachment.type === 'folder' ? (
                <FolderIcon />
              ) : (
                <img src={attachment.metadata.thumbnailUrl} />
              )}
              <p>{attachment.metadata.fileName}</p>
              <button onClick={() => removeAsset(attachment.assetId)}>
                <XMarkIcon />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" onClick={onOpenAssetSelector}>
          <PhotoIcon />
          <p>Medien hinzufügen</p>
        </div>
      )}
    </div>
  </FieldGroup>
</div>
```

### ApprovalTab

**Location:** `tabs/ApprovalTab.tsx`

**Zweck:** Kunden-Freigaben und Pipeline-Integration

**Props:**
```typescript
interface ApprovalTabProps {
  organizationId: string;
}
```

**Features:**
- Approval-Settings (Kunde, Nachricht)
- PDF-Versions-History
- Pipeline-Status-Anzeige
- Feedback-History

**Context-Integration:**
```typescript
const {
  approvalData,
  updateApprovalData,
  previousFeedback,
  selectedCompanyId,
  selectedCompanyName
} = useCampaign();
```

**Verwendung:**
```typescript
<ApprovalTab
  organizationId={currentOrganization.id}
/>
```

**Komponenten-Struktur:**
```tsx
<div className="bg-white rounded-lg border p-6">
  <FieldGroup>
    {/* Approval Settings */}
    <ApprovalSettings
      approvalData={approvalData}
      onApprovalDataChange={updateApprovalData}
      clientId={selectedCompanyId}
      clientName={selectedCompanyName}
      organizationId={organizationId}
    />

    {/* PDF-Versions-History */}
    {campaign.id && (
      <div className="mt-8">
        <PDFVersionHistory
          campaignId={campaign.id}
          organizationId={organizationId}
        />
      </div>
    )}

    {/* Feedback-History */}
    {previousFeedback.length > 0 && (
      <div className="mt-8">
        <h3>Feedback-Verlauf</h3>
        {previousFeedback.map((feedback, index) => (
          <div key={index}>
            <p>{feedback.author}</p>
            <p>{feedback.comment}</p>
            <p>{feedback.requestedAt?.toDate().toLocaleString('de-DE')}</p>
          </div>
        ))}
      </div>
    )}
  </FieldGroup>
</div>
```

### PreviewTab

**Location:** `tabs/PreviewTab.tsx`

**Zweck:** Final Preview & PDF-Generierung

**Props:**
```typescript
interface PreviewTabProps {
  organizationId: string;
  campaignId: string;
}
```

**Features:**
- Live-Preview (HTML)
- PDF-Generierung
- Pipeline-PDF-Viewer
- Template-Auswahl

**Context-Integration:**
```typescript
const {
  campaignTitle,
  editorContent,
  boilerplateSections,
  keyVisual,
  generatingPdf,
  currentPdfVersion,
  generatePdf,
  selectedTemplateId,
  updateSelectedTemplate
} = useCampaign();
```

**Verwendung:**
```typescript
<PreviewTab
  organizationId={currentOrganization.id}
  campaignId={campaignId}
/>
```

**Komponenten-Struktur:**
```tsx
<div className="bg-white rounded-lg border p-6">
  {/* Template-Auswahl */}
  <div className="mb-6">
    <Label>PDF-Template</Label>
    <Select value={selectedTemplateId} onChange={updateSelectedTemplate}>
      <option value="default">Standard</option>
      <option value="modern">Modern</option>
      <option value="classic">Classic</option>
    </Select>
  </div>

  {/* PDF-Generierung */}
  <div className="mb-6">
    <Button
      onClick={() => generatePdf(false)}
      disabled={generatingPdf}
    >
      {generatingPdf ? (
        <>
          <div className="animate-spin h-4 w-4 border-b-2 border-white" />
          Generiert...
        </>
      ) : (
        <>
          <DocumentArrowDownIcon />
          PDF generieren
        </>
      )}
    </Button>
  </div>

  {/* PDF-Viewer */}
  {currentPdfVersion && (
    <PipelinePDFViewer
      pdfUrl={currentPdfVersion.downloadUrl}
      version={currentPdfVersion.version}
      createdAt={currentPdfVersion.createdAt}
      fileName={currentPdfVersion.fileName}
      fileSize={currentPdfVersion.fileSize}
    />
  )}

  {/* Live-Preview (HTML) */}
  <div className="mt-8">
    <h3>Vorschau</h3>
    <CampaignPreviewStep
      title={campaignTitle}
      mainContent={editorContent}
      boilerplateSections={boilerplateSections}
      keyVisual={keyVisual}
    />
  </div>
</div>
```

---

## Support-Komponenten

### CampaignHeader

**Location:** `components/CampaignHeader.tsx`

**Zweck:** Page-Header mit Breadcrumbs und Projekt-Link

**Props:**
```typescript
interface CampaignHeaderProps {
  campaign: PRCampaign;
  selectedCompanyName: string;
  selectedCompanyId: string;
}
```

**Features:**
- Breadcrumb-Navigation
- Projekt-Link (wenn projectId vorhanden)
- Kunden-Name-Anzeige
- Timestamp (Erstellt/Aktualisiert)

**Verwendung:**
```typescript
{existingCampaign && (
  <CampaignHeader
    campaign={existingCampaign}
    selectedCompanyName={selectedCompanyName}
    selectedCompanyId={selectedCompanyId}
  />
)}
```

### TabNavigation

**Location:** `components/TabNavigation.tsx`

**Zweck:** Tab-Switcher mit Step-Indikator

**Props:**
```typescript
interface TabNavigationProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  onGeneratePreview: () => void;
}
```

**Features:**
- 4 Tabs: Content, Attachments, Approval, Preview
- Step-Indikator (1/4, 2/4, etc.)
- Aktiver Tab hervorgehoben
- "Vorschau generieren" Trigger bei Step 3 → 4

**Verwendung:**
```typescript
<TabNavigation
  currentStep={currentStep}
  onStepChange={setCurrentStep}
  onGeneratePreview={handleGeneratePreview}
/>
```

### LoadingState

**Location:** `components/LoadingState.tsx`

**Zweck:** Loading-Spinner mit Text

**Props:**
```typescript
interface LoadingStateProps {
  message?: string;
}
```

**Verwendung:**
```typescript
if (loading) {
  return <LoadingState message="Kampagne wird geladen..." />;
}
```

### ErrorState

**Location:** `components/ErrorState.tsx`

**Zweck:** Fehler-Anzeige mit Retry-Button

**Props:**
```typescript
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}
```

**Verwendung:**
```typescript
if (error) {
  return (
    <ErrorState
      message="Kampagne konnte nicht geladen werden"
      onRetry={reloadCampaign}
    />
  );
}
```

---

## Usage-Beispiele

### Beispiel 1: Titel ändern

```typescript
function ContentTab() {
  const { campaignTitle, updateTitle } = useCampaign();

  return (
    <input
      type="text"
      value={campaignTitle}
      onChange={(e) => updateTitle(e.target.value)}
      placeholder="Campaign-Titel eingeben..."
    />
  );
}
```

### Beispiel 2: Editor-Content ändern

```typescript
function ContentTab() {
  const { editorContent, updateEditorContent } = useCampaign();

  return (
    <CampaignContentComposer
      mainContent={editorContent}
      onMainContentChange={updateEditorContent}
      // ... weitere Props
    />
  );
}
```

### Beispiel 3: Keywords hinzufügen

```typescript
function ContentTab() {
  const { keywords, updateKeywords } = useCampaign();

  const handleAddKeyword = (newKeyword: string) => {
    if (!keywords.includes(newKeyword)) {
      updateKeywords([...keywords, newKeyword]);
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    updateKeywords(keywords.filter(k => k !== keyword));
  };

  return (
    <div>
      {keywords.map(keyword => (
        <Badge key={keyword}>
          {keyword}
          <button onClick={() => handleRemoveKeyword(keyword)}>
            <XMarkIcon />
          </button>
        </Badge>
      ))}
      <input
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleAddKeyword(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
      />
    </div>
  );
}
```

### Beispiel 4: Asset hinzufügen

```typescript
function AttachmentsTab() {
  const { attachedAssets, updateAttachedAssets } = useCampaign();
  const [showAssetSelector, setShowAssetSelector] = useState(false);

  const handleAssetsSelected = (selectedAssets: CampaignAssetAttachment[]) => {
    // Füge neue Assets hinzu (ohne Duplikate)
    const existingIds = attachedAssets.map(a => a.assetId || a.folderId);
    const newAssets = selectedAssets.filter(
      a => !existingIds.includes(a.assetId || a.folderId)
    );

    updateAttachedAssets([...attachedAssets, ...newAssets]);
    setShowAssetSelector(false);
  };

  return (
    <>
      <Button onClick={() => setShowAssetSelector(true)}>
        Medien hinzufügen
      </Button>

      <AssetSelectorModal
        isOpen={showAssetSelector}
        onClose={() => setShowAssetSelector(false)}
        onAssetsSelected={handleAssetsSelected}
        // ... weitere Props
      />
    </>
  );
}
```

### Beispiel 5: PDF generieren

```typescript
function PreviewTab() {
  const {
    generatePdf,
    generatingPdf,
    currentPdfVersion
  } = useCampaign();

  const handleGeneratePdf = async () => {
    await generatePdf(false); // Draft-PDF
  };

  return (
    <div>
      <Button onClick={handleGeneratePdf} disabled={generatingPdf}>
        {generatingPdf ? 'Generiert...' : 'PDF generieren'}
      </Button>

      {currentPdfVersion && (
        <div className="mt-6">
          <p>Version: {currentPdfVersion.version}</p>
          <p>Erstellt: {currentPdfVersion.createdAt.toDate().toLocaleString('de-DE')}</p>
          <a
            href={currentPdfVersion.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            PDF herunterladen
          </a>
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Context immer über Hook verwenden

```typescript
// ✅ RICHTIG
function MyComponent() {
  const { campaignTitle, updateTitle } = useCampaign();
  return <input value={campaignTitle} onChange={(e) => updateTitle(e.target.value)} />;
}

// ❌ FALSCH: Direkter Context-Zugriff
function MyComponent() {
  const context = useContext(CampaignContext); // Fehleranfällig
  return <input value={context?.campaignTitle} />;
}
```

### 2. React.memo für Tab-Komponenten

```typescript
// ✅ RICHTIG: Verhindert unnötige Re-Renders
export default React.memo(function ContentTab({
  organizationId,
  userId,
  campaignId,
  onOpenAiModal,
  onSeoScoreChange
}: ContentTabProps) {
  // ... Component-Code
});

// ❌ FALSCH: Ohne Memo → Re-Render bei jedem Context-Update
export default function ContentTab(props: ContentTabProps) {
  // ... Component-Code
}
```

### 3. Optimistic Updates nutzen

```typescript
// ✅ RICHTIG: Sofortiges UI-Update
const handleTitleChange = (newTitle: string) => {
  updateTitle(newTitle); // Context update → sofortiges UI-Update
  // Speichern erfolgt später über saveCampaign()
};

// ❌ FALSCH: Warten auf Server-Response
const handleTitleChange = async (newTitle: string) => {
  await prService.update(campaignId, { title: newTitle }); // Langsam!
  await reloadCampaign(); // Noch langsamer!
};
```

### 4. Loading-States richtig behandeln

```typescript
// ✅ RICHTIG
function PreviewTab() {
  const { generatingPdf, generatePdf } = useCampaign();

  return (
    <Button onClick={generatePdf} disabled={generatingPdf}>
      {generatingPdf ? (
        <>
          <div className="animate-spin" />
          Generiert...
        </>
      ) : (
        'PDF generieren'
      )}
    </Button>
  );
}

// ❌ FALSCH: Kein Loading-State
function PreviewTab() {
  const { generatePdf } = useCampaign();

  return <Button onClick={generatePdf}>PDF generieren</Button>;
  // User weiß nicht ob es funktioniert!
}
```

### 5. Props minimal halten

```typescript
// ✅ RICHTIG: Nur Infrastructure-Props
interface ContentTabProps {
  organizationId: string;
  userId: string;
  campaignId: string;
  onOpenAiModal: () => void;
}
// Campaign-Daten kommen aus Context

// ❌ FALSCH: Zu viele Props
interface ContentTabProps {
  organizationId: string;
  userId: string;
  campaignId: string;
  campaignTitle: string;
  editorContent: string;
  keywords: string[];
  onTitleChange: (title: string) => void;
  onEditorContentChange: (content: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  // ... 20 weitere Props
}
// Props-Drilling → schwer wartbar
```

---

## Siehe auch

- [API-Dokumentation](../api/README.md)
- [ADRs](../adr/README.md)
- [Hauptdokumentation](../README.md)

---

**Letzte Aktualisierung:** 05. November 2025
**Version:** 1.1 (Phase 1.1 - Foundation)

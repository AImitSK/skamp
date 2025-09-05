# Interne Freigabe-Phase Integration

## Konzept-Übersicht
Integration einer flexiblen internen Freigabephase in CeleroPress durch:
1. **Projekt-Zuordnung** in Kampagnen (NEW/EDIT Seiten)
2. **Erweiterte PDF-Generierung** für interne Entwürfe
3. **Interne PDF-Versionierung** im Projekt-Ordner
4. **Chat-Integration** für zwanglose Diskussionen
5. **Flexible Freigabe-Workflows** ohne feste Regeln

## 1. PROJEKT-ZUORDNUNG IN KAMPAGNEN

### 1.1 Erweiterung der Kampagnen-Erstellung
**Dateien zu erweitern:**
- `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`

### 1.2 PRCampaign Entity Erweiterung
```typescript
interface PRCampaign {
  // ... bestehende Felder
  
  // NEU: Projekt-Zuordnung
  projectId?: string;           // Verknüpfung zum Projekt
  projectTitle?: string;        // Denormalisiert für Performance
  projectStage?: PipelineStage; // Aktueller Pipeline-Status
  
  // NEU: Interne PDF-Verwaltung
  internalPDFs?: {
    enabled: boolean;           // Soll interne PDF-Generierung aktiviert sein?
    autoGenerate: boolean;      // Bei Speicherung automatisch PDF erstellen?
    storageFolder: string;      // Pfad im Projekt-Ordner
    lastGenerated?: Timestamp;  // Letzte PDF-Generierung
    versionCount: number;       // Anzahl generierte Versionen
  };
  
  // ... restliche Felder
}
```

### 1.3 Projekt-Selector in Kampagnen-Form
```typescript
// Neue Komponente: ProjectSelector
const ProjectSelector = ({
  selectedProjectId,
  onProjectSelect,
  organizationId,
  clientId
}: {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string, projectTitle: string) => void;
  organizationId: string;
  clientId?: string;
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [clientId]);

  const loadProjects = async () => {
    let projectsData;
    if (clientId) {
      // Nur Projekte für diesen Kunden
      projectsData = await projectService.getProjectsByClient(organizationId, clientId);
    } else {
      // Alle aktiven Projekte
      projectsData = await projectService.getActiveProjects(organizationId);
    }
    setProjects(projectsData);
  };

  return (
    <div className="project-selector">
      <label className="block text-sm font-medium mb-2">
        Projekt-Zuordnung (Optional)
      </label>
      
      <select
        value={selectedProjectId || ''}
        onChange={(e) => {
          if (e.target.value) {
            const project = projects.find(p => p.id === e.target.value);
            if (project) {
              onProjectSelect(e.target.value, project.title);
            }
          }
        }}
        className="w-full border rounded-lg px-3 py-2"
      >
        <option value="">Kein Projekt zugeordnet</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.title} - {project.clientName}
          </option>
        ))}
      </select>
      
      {/* Quick-Create neues Projekt */}
      <button
        type="button"
        onClick={() => setShowCreateNew(true)}
        className="mt-2 text-sm text-blue-600 hover:underline"
      >
        + Neues Projekt für diese Kampagne erstellen
      </button>
      
      {showCreateNew && (
        <QuickProjectCreator
          clientId={clientId}
          onProjectCreated={(project) => {
            onProjectSelect(project.id!, project.title);
            setShowCreateNew(false);
          }}
          onCancel={() => setShowCreateNew(false)}
        />
      )}
    </div>
  );
};
```

## 2. ERWEITERTE PDF-GENERIERUNG

### 2.1 Interne PDF-Version Entity
```typescript
// Erweiterung der bestehenden PDFVersion
interface InternalPDFVersion extends PDFVersion {
  // Zusätzliche Felder für interne PDFs
  type: 'customer_approval' | 'internal_review' | 'draft_snapshot';
  
  // Interne Review-spezifische Felder
  internalReview?: {
    projectId: string;
    reviewStage: 'draft' | 'internal_review' | 'ready_for_customer';
    reviewRequested: boolean;
    reviewRequestedAt?: Timestamp;
    reviewComments?: string[];
    reviewApprovedBy?: string[];   // User IDs die approved haben
    reviewRejectedBy?: string[];   // User IDs die rejected haben
  };
  
  // Storage-Location für interne PDFs
  storagePath: string;  // z.B. "projects/{projectId}/internal-pdfs/draft-v{version}.pdf"
  projectFolderId?: string; // MediaFolder ID im Projekt-Ordner
}
```

### 2.2 Erweiterte PDF-Generierung Service
```typescript
// Erweiterung des bestehenden pdfVersionsService
export const pdfVersionsService = {
  // ... bestehende Methoden
  
  /**
   * NEU: Generiert interne PDF-Version für Projekt-Review
   */
  async createInternalPDF(
    campaignId: string,
    projectId: string,
    content: {
      title: string;
      mainContent: string;
      boilerplateSections: any[];
      keyVisual?: any;
    },
    context: {
      userId: string;
      displayName: string;
      type: 'draft_snapshot' | 'internal_review';
      autoGenerated?: boolean;
    }
  ): Promise<InternalPDFVersion> {
    try {
      // Projekt-Ordner laden
      const project = await projectService.getById(projectId);
      const projectFolder = await mediaService.getProjectFolder(projectId);
      
      // Dateiname generieren
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const versionNumber = await this.getNextInternalVersionNumber(campaignId, projectId);
      const fileName = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_internal_v${versionNumber}_${timestamp}.pdf`;
      
      // PDF generieren (nutzt bestehende generatePDF Funktion)
      const pdfResult = await this.generatePDF(content, {
        templateId: 'internal_review', // Spezielles internes Template
        fileName,
        watermark: 'INTERNER ENTWURF - NICHT FÜR KUNDEN'
      });
      
      // Upload in Projekt-Ordner (nicht in Customer-Approval Bereich)
      const storagePath = `projects/${projectId}/internal-pdfs/${fileName}`;
      const uploadUrl = await mediaService.uploadToProjectPath(
        pdfResult.buffer, 
        storagePath,
        {
          contentType: 'application/pdf',
          organizationId: project.organizationId,
          projectId,
          metadata: {
            campaignId,
            type: 'internal_pdf',
            version: versionNumber,
            createdBy: context.userId
          }
        }
      );
      
      // Interne PDF-Version in DB speichern
      const internalPDF: Omit<InternalPDFVersion, 'id'> = {
        campaignId,
        organizationId: project.organizationId,
        version: versionNumber,
        createdAt: Timestamp.now(),
        createdBy: context.userId,
        
        // Interne PDF spezifisch
        type: context.type,
        status: 'draft', // Immer Draft bei internen PDFs
        
        downloadUrl: uploadUrl,
        fileName,
        fileSize: pdfResult.size,
        storagePath,
        projectFolderId: projectFolder.id,
        
        contentSnapshot: {
          title: content.title,
          mainContent: content.mainContent,
          boilerplateSections: content.boilerplateSections,
          keyVisual: content.keyVisual,
          createdForApproval: false // Interne PDFs sind nie für Kunden-Freigabe
        },
        
        internalReview: {
          projectId,
          reviewStage: context.type === 'internal_review' ? 'internal_review' : 'draft',
          reviewRequested: context.type === 'internal_review',
          reviewRequestedAt: context.type === 'internal_review' ? Timestamp.now() : undefined,
          reviewComments: [],
          reviewApprovedBy: [],
          reviewRejectedBy: []
        }
      };
      
      // Speichern in separater Collection für interne PDFs
      const docRef = await addDoc(collection(db, 'internal_pdf_versions'), internalPDF);
      const finalPDF = { id: docRef.id, ...internalPDF };
      
      // Communication-Entry im Projekt-Chat erstellen
      await communicationService.createEntry({
        projectId,
        type: 'pdf_generated',
        message: context.autoGenerated 
          ? `Automatische PDF-Version erstellt: ${fileName}`
          : `${context.displayName} hat eine PDF-Version erstellt: ${fileName}`,
        attachments: [{
          type: 'pdf',
          id: docRef.id,
          name: fileName,
          url: uploadUrl
        }],
        contextType: 'campaign',
        contextId: campaignId,
        contextTitle: content.title
      });
      
      // Projekt-Statistiken aktualisieren
      await projectService.updateProject(projectId, {
        'internalPDFs.lastGenerated': Timestamp.now(),
        'internalPDFs.versionCount': increment(1)
      });
      
      return finalPDF;
    } catch (error) {
      throw new Error('Fehler bei interner PDF-Generierung');
    }
  },
  
  /**
   * NEU: Automatische PDF-Generierung bei Kampagnen-Speicherung
   */
  async autoGenerateInternalPDF(
    campaignId: string,
    projectId: string,
    content: any,
    userId: string
  ): Promise<void> {
    try {
      // Prüfen ob Auto-Generate aktiviert
      const campaign = await prService.getById(campaignId);
      if (!campaign?.internalPDFs?.autoGenerate) return;
      
      // Letzte Generierung prüfen (nicht öfter als alle 5 Minuten)
      const lastGenerated = campaign.internalPDFs?.lastGenerated;
      if (lastGenerated) {
        const timeDiff = Date.now() - lastGenerated.toDate().getTime();
        if (timeDiff < 5 * 60 * 1000) return; // 5 Minuten Cooldown
      }
      
      // PDF im Hintergrund generieren (non-blocking)
      this.createInternalPDF(campaignId, projectId, content, {
        userId,
        displayName: 'Auto-Generator',
        type: 'draft_snapshot',
        autoGenerated: true
      }).catch(error => {
        console.error('Auto-PDF generation failed:', error);
      });
    } catch (error) {
      // Fehler bei Auto-Generation ignorieren (darf Speicherung nicht blockieren)
    }
  },
  
  /**
   * NEU: Lädt alle internen PDFs für ein Projekt
   */
  async getInternalPDFs(projectId: string): Promise<InternalPDFVersion[]> {
    const q = query(
      collection(db, 'internal_pdf_versions'),
      where('internalReview.projectId', '==', projectId),
      orderBy('version', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InternalPDFVersion[];
  }
};
```

### 2.3 Automatische PDF-Generierung bei Speicherung
```typescript
// In den Kampagnen-Seiten (NEW/EDIT) integrieren:
const handleSaveCampaign = async (campaignData: any) => {
  try {
    // Normale Kampagnen-Speicherung
    await prService.updateCampaign(campaignId, campaignData);
    
    // Auto-PDF-Generierung (falls aktiviert und Projekt zugeordnet)
    if (campaignData.projectId && campaignData.internalPDFs?.autoGenerate) {
      await pdfVersionsService.autoGenerateInternalPDF(
        campaignId,
        campaignData.projectId,
        {
          title: campaignData.title,
          mainContent: campaignData.contentHtml,
          boilerplateSections: campaignData.boilerplateSections,
          keyVisual: campaignData.keyVisual
        },
        currentUser.uid
      );
    }
    
    showAlert('success', 'Kampagne gespeichert');
  } catch (error) {
    showAlert('error', 'Fehler beim Speichern');
  }
};
```

## 3. CHAT-INTEGRATION FÜR PDF-SHARING

### 3.1 Erweiterte Communication-Entry
```typescript
interface CommunicationEntry {
  // ... bestehende Felder
  
  // Erweitert für PDF-Sharing
  type: 'comment' | 'file_upload' | 'pdf_shared' | 'pdf_feedback' | 'review_request';
  
  // PDF-spezifische Felder
  pdfData?: {
    pdfVersionId: string;        // InternalPDFVersion ID
    campaignId: string;          // Zugehörige Kampagne
    fileName: string;
    downloadUrl: string;
    version: number;
    
    // Review-Status
    reviewRequested: boolean;
    reviewDeadline?: Timestamp;
    requiresApproval: boolean;
    
    // Feedback-Tracking
    feedbackCount: number;
    approvalCount: number;
    rejectionCount: number;
  };
}
```

### 3.2 PDF-Sharing in Chat-Komponente
```typescript
const ProjectCommunicationFeed = ({ projectId }: { projectId: string }) => {
  const [internalPDFs, setInternalPDFs] = useState<InternalPDFVersion[]>([]);
  
  useEffect(() => {
    loadInternalPDFs();
  }, [projectId]);
  
  const loadInternalPDFs = async () => {
    const pdfs = await pdfVersionsService.getInternalPDFs(projectId);
    setInternalPDFs(pdfs);
  };
  
  const sharePDFInChat = async (pdf: InternalPDFVersion, message?: string) => {
    await communicationService.createEntry({
      projectId,
      type: 'pdf_shared',
      message: message || `PDF zur Ansicht geteilt: ${pdf.fileName}`,
      pdfData: {
        pdfVersionId: pdf.id!,
        campaignId: pdf.campaignId,
        fileName: pdf.fileName,
        downloadUrl: pdf.downloadUrl,
        version: pdf.version,
        reviewRequested: false,
        requiresApproval: false,
        feedbackCount: 0,
        approvalCount: 0,
        rejectionCount: 0
      }
    });
  };
  
  const requestReview = async (pdf: InternalPDFVersion, message: string, deadline?: Date) => {
    // PDF-Review anfordern
    await pdfVersionsService.requestInternalReview(pdf.id!, {
      message,
      deadline,
      requestedBy: currentUser.uid
    });
    
    // Chat-Nachricht erstellen
    await communicationService.createEntry({
      projectId,
      type: 'review_request',
      message: `🔍 Review angefordert: ${pdf.fileName}\n${message}`,
      pdfData: {
        pdfVersionId: pdf.id!,
        campaignId: pdf.campaignId,
        fileName: pdf.fileName,
        downloadUrl: pdf.downloadUrl,
        version: pdf.version,
        reviewRequested: true,
        reviewDeadline: deadline ? Timestamp.fromDate(deadline) : undefined,
        requiresApproval: true,
        feedbackCount: 0,
        approvalCount: 0,
        rejectionCount: 0
      },
      mentions: project.assignedTeamMembers // Alle Team-Mitglieder erwähnen
    });
  };
  
  return (
    <div className="communication-feed">
      {/* PDF-Sharing Panel */}
      <div className="pdf-sharing-panel bg-gray-50 p-4 rounded-lg mb-4">
        <h4 className="font-medium mb-3">PDF-Versionen teilen</h4>
        
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {internalPDFs.map(pdf => (
            <div key={pdf.id} className="flex items-center justify-between bg-white p-2 rounded">
              <div className="flex-1">
                <span className="text-sm font-medium">{pdf.fileName}</span>
                <span className="text-xs text-gray-500 ml-2">
                  v{pdf.version} • {formatDistanceToNow(pdf.createdAt.toDate())}
                </span>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => sharePDFInChat(pdf)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  📎 Teilen
                </button>
                
                <button
                  onClick={() => setShowReviewRequest({ pdf, show: true })}
                  className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                >
                  🔍 Review
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {internalPDFs.length === 0 && (
          <p className="text-sm text-gray-500">Noch keine PDF-Versionen vorhanden</p>
        )}
      </div>
      
      {/* Standard Chat-Messages */}
      <div className="messages-container">
        {messages.map(entry => (
          <ChatMessage key={entry.id} entry={entry} />
        ))}
      </div>
      
      {/* Message Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
};
```

### 3.3 PDF-Message Komponente
```typescript
const PDFMessage = ({ entry }: { entry: CommunicationEntry }) => {
  const { pdfData } = entry;
  if (!pdfData) return null;
  
  const handlePDFAction = async (action: 'approve' | 'reject' | 'comment') => {
    if (action === 'approve') {
      await pdfVersionsService.addReviewApproval(pdfData.pdfVersionId, currentUser.uid);
    } else if (action === 'reject') {
      await pdfVersionsService.addReviewRejection(pdfData.pdfVersionId, currentUser.uid);
    }
    
    // Feedback-Comment erstellen
    await communicationService.createEntry({
      projectId: entry.projectId,
      type: 'pdf_feedback',
      message: `${action === 'approve' ? '✅' : '❌'} ${currentUser.displayName} hat ${pdfData.fileName} ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`
    });
  };
  
  return (
    <div className="pdf-message bg-blue-50 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="bg-red-500 text-white px-2 py-1 text-xs rounded">PDF</div>
        <div className="flex-1">
          <div className="font-medium">{pdfData.fileName}</div>
          <div className="text-sm text-gray-600">Version {pdfData.version}</div>
        </div>
        
        {/* PDF Actions */}
        <div className="flex gap-2">
          <a
            href={pdfData.downloadUrl}
            target="_blank"
            className="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-50"
          >
            📄 Öffnen
          </a>
          
          {pdfData.reviewRequested && (
            <>
              <button
                onClick={() => handlePDFAction('approve')}
                className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
              >
                ✅ Freigeben
              </button>
              
              <button
                onClick={() => handlePDFAction('reject')}
                className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
              >
                ❌ Ablehnen
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Review-Status */}
      {pdfData.reviewRequested && (
        <div className="mt-2 text-sm">
          <span className="text-gray-600">
            Status: {pdfData.approvalCount} Freigaben, {pdfData.rejectionCount} Ablehnungen
          </span>
          {pdfData.reviewDeadline && (
            <span className="text-orange-600 ml-2">
              • Deadline: {format(pdfData.reviewDeadline.toDate(), 'dd.MM.yyyy')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
```

## 4. ERWEITERTE KAMPAGNEN-FORM INTEGRATION

### 4.1 Interne PDF-Einstellungen in Kampagnen-Form
```typescript
// Neue Komponente für Kampagnen NEW/EDIT Seiten
const InternalPDFSettings = ({
  campaignData,
  onUpdate,
  projectId
}: {
  campaignData: PRCampaign;
  onUpdate: (data: Partial<PRCampaign>) => void;
  projectId?: string;
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<InternalPDFVersion[]>([]);
  
  useEffect(() => {
    if (projectId && campaignData.id) {
      loadPDFHistory();
    }
  }, [projectId, campaignData.id]);
  
  const loadPDFHistory = async () => {
    if (!projectId || !campaignData.id) return;
    const history = await pdfVersionsService.getInternalPDFs(projectId);
    const campaignPDFs = history.filter(pdf => pdf.campaignId === campaignData.id);
    setGenerationHistory(campaignPDFs);
  };
  
  const handleManualPDFGeneration = async () => {
    if (!projectId || !campaignData.id) return;
    
    setIsGenerating(true);
    try {
      const content = {
        title: campaignData.title,
        mainContent: campaignData.contentHtml,
        boilerplateSections: campaignData.boilerplateSections,
        keyVisual: campaignData.keyVisual
      };
      
      await pdfVersionsService.createInternalPDF(
        campaignData.id,
        projectId,
        content,
        {
          userId: currentUser.uid,
          displayName: currentUser.displayName,
          type: 'internal_review'
        }
      );
      
      await loadPDFHistory();
      showAlert('success', 'PDF-Version erstellt');
    } catch (error) {
      showAlert('error', 'Fehler bei PDF-Generierung');
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (!projectId) return null; // Nur anzeigen wenn Projekt zugeordnet
  
  return (
    <div className="internal-pdf-settings border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Interne PDF-Einstellungen</h3>
        {generationHistory.length > 0 && (
          <span className="text-xs text-gray-500">
            {generationHistory.length} Version{generationHistory.length !== 1 ? 'en' : ''} erstellt
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={campaignData.internalPDFs?.enabled || false}
            onChange={(e) => onUpdate({
              internalPDFs: {
                ...campaignData.internalPDFs,
                enabled: e.target.checked,
                storageFolder: `projects/${projectId}/internal-pdfs/`,
                versionCount: generationHistory.length
              }
            })}
          />
          <span className="text-sm">Interne PDF-Generierung aktivieren</span>
        </label>
        
        {campaignData.internalPDFs?.enabled && (
          <>
            <label className="flex items-center gap-2 ml-6">
              <input
                type="checkbox"
                checked={campaignData.internalPDFs?.autoGenerate || false}
                onChange={(e) => onUpdate({
                  internalPDFs: {
                    ...campaignData.internalPDFs,
                    autoGenerate: e.target.checked
                  }
                })}
              />
              <span className="text-sm text-gray-600">
                Automatisch PDF bei Speicherung generieren
              </span>
            </label>
            
            {/* PDF-Generierung Historie */}
            {generationHistory.length > 0 && (
              <div className="ml-6 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Letzte PDF-Versionen</h4>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {generationHistory.slice(0, 3).map(pdf => (
                    <div key={pdf.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          pdf.reviewStatus === 'approved' ? 'bg-green-500' :
                          pdf.reviewStatus === 'needs_revision' ? 'bg-red-500' :
                          pdf.reviewStatus === 'under_review' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}></span>
                        {pdf.fileName}
                      </span>
                      <span className="text-gray-500">
                        {formatDistanceToNow(pdf.createdAt.toDate(), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Manual PDF Generation */}
      {campaignData.internalPDFs?.enabled && (
        <div className="pt-3 border-t space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleManualPDFGeneration}
              disabled={isGenerating || !campaignData.title || !campaignData.contentHtml}
              className="text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin w-3 h-3 border border-blue-700 border-t-transparent rounded-full"></div>
                  Generiere PDF...
                </>
              ) : (
                <>📄 PDF jetzt generieren</>
              )}
            </button>
            
            {campaignData.internalPDFs?.lastGenerated && (
              <span className="text-xs text-gray-500">
                Zuletzt: {formatDistanceToNow(campaignData.internalPDFs.lastGenerated.toDate(), { addSuffix: true })}
              </span>
            )}
          </div>
          
          {/* Warnung wenn Content fehlt */}
          {(!campaignData.title || !campaignData.contentHtml) && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Titel und Inhalt müssen ausgefüllt sein für PDF-Generierung
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### 4.2 Erweiterte Kampagnen-Seiten Struktur

#### 4.2.1 NEW-Seite Erweiterungen (`campaigns/new/page.tsx`)
```typescript
const NewCampaignPage = () => {
  const [campaignData, setCampaignData] = useState<Partial<PRCampaign>>({
    // Standard-Felder...
    
    // NEU: Projekt-Integration
    projectId: undefined,
    projectTitle: undefined,
    projectStage: undefined,
    
    // NEU: Interne PDF-Einstellungen
    internalPDFs: {
      enabled: false,
      autoGenerate: false,
      storageFolder: '',
      versionCount: 0
    }
  });
  
  return (
    <div className="campaign-form">
      {/* Bestehende Form-Felder... */}
      
      {/* NEU: Projekt-Zuordnung Sektion */}
      <div className="form-section">
        <h2 className="section-title">Projekt-Zuordnung</h2>
        <ProjectSelector
          selectedProjectId={campaignData.projectId}
          onProjectSelect={(projectId, projectTitle) => {
            setCampaignData(prev => ({
              ...prev,
              projectId,
              projectTitle,
              projectStage: 'creation' // Bei Kampagnen-Erstellung
            }));
          }}
          organizationId={organizationId}
          clientId={campaignData.clientId}
        />
      </div>
      
      {/* NEU: Interne PDF-Einstellungen (nur wenn Projekt zugeordnet) */}
      {campaignData.projectId && (
        <div className="form-section">
          <h2 className="section-title">Interne Freigabe</h2>
          <InternalPDFSettings
            campaignData={campaignData}
            onUpdate={(updates) => setCampaignData(prev => ({ ...prev, ...updates }))}
            projectId={campaignData.projectId}
          />
        </div>
      )}
      
      {/* Bestehende Speicher-Logik erweitert */}
    </div>
  );
};
```

#### 4.2.2 EDIT-Seite Erweiterungen (`campaigns/edit/[campaignId]/page.tsx`)
```typescript
const EditCampaignPage = ({ params }: { params: { campaignId: string }}) => {
  const [campaignData, setCampaignData] = useState<PRCampaign | null>(null);
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [internalPDFs, setInternalPDFs] = useState<InternalPDFVersion[]>([]);
  
  useEffect(() => {
    loadCampaignData();
  }, [params.campaignId]);
  
  const loadCampaignData = async () => {
    const campaign = await prService.getById(params.campaignId);
    setCampaignData(campaign);
    
    // Projekt-Daten laden wenn zugeordnet
    if (campaign.projectId) {
      const project = await projectService.getById(campaign.projectId);
      setProjectData(project);
      
      // Interne PDFs laden
      const pdfs = await pdfVersionsService.getInternalPDFs(campaign.projectId);
      const campaignPDFs = pdfs.filter(pdf => pdf.campaignId === campaign.id);
      setInternalPDFs(campaignPDFs);
    }
  };
  
  return (
    <div className="campaign-form">
      {/* Bestehende Form-Felder... */}
      
      {/* Projekt-Zuordnung (kann geändert werden) */}
      <div className="form-section">
        <h2 className="section-title flex items-center justify-between">
          Projekt-Zuordnung
          {projectData && (
            <span className="text-sm text-gray-500">
              Aktuell: {projectData.title} ({projectData.stage})
            </span>
          )}
        </h2>
        
        <ProjectSelector
          selectedProjectId={campaignData?.projectId}
          onProjectSelect={handleProjectChange}
          organizationId={organizationId}
          clientId={campaignData?.clientId}
        />
        
        {/* Warnung bei Projekt-Wechsel */}
        {campaignData?.projectId && internalPDFs.length > 0 && (
          <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ {internalPDFs.length} interne PDF-Version{internalPDFs.length !== 1 ? 'en' : ''} vorhanden. 
            Bei Projekt-Wechsel gehen diese Verknüpfungen verloren.
          </div>
        )}
      </div>
      
      {/* Erweiterte Interne PDF-Verwaltung */}
      {campaignData?.projectId && (
        <div className="form-section">
          <h2 className="section-title">Interne Freigabe & PDF-Verwaltung</h2>
          
          <InternalPDFSettings
            campaignData={campaignData}
            onUpdate={handleCampaignUpdate}
            projectId={campaignData.projectId}
          />
          
          {/* PDF-Verlauf und -Verwaltung */}
          {internalPDFs.length > 0 && (
            <div className="mt-4">
              <InternalPDFManager
                pdfs={internalPDFs}
                projectId={campaignData.projectId}
                campaignId={campaignData.id}
                onPDFUpdate={loadCampaignData}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### 4.2.3 Interne PDF-Manager Komponente
```typescript
const InternalPDFManager = ({
  pdfs,
  projectId,
  campaignId,
  onPDFUpdate
}: {
  pdfs: InternalPDFVersion[];
  projectId: string;
  campaignId: string;
  onPDFUpdate: () => void;
}) => {
  const [selectedPDF, setSelectedPDF] = useState<InternalPDFVersion | null>(null);
  const [showChatDialog, setShowChatDialog] = useState(false);
  
  const handleShareInChat = async (pdf: InternalPDFVersion) => {
    try {
      // Neuen Chat erstellen oder bestehenden verwenden
      let chatId = pdf.discussionChatId;
      
      if (!chatId) {
        chatId = await projectChatService.createPDFDiscussionChat(
          pdf.id!,
          projectId,
          project.assignedTeamMembers,
          `Diskussion zur PDF-Version: ${pdf.fileName}`,
          { userId: currentUser.uid, organizationId }
        );
      } else {
        // PDF erneut in bestehenden Chat teilen
        await projectChatService.sharePDFInChat(
          chatId,
          pdf,
          'PDF-Version erneut geteilt',
          { userId: currentUser.uid, organizationId }
        );
      }
      
      showAlert('success', 'PDF im Team-Chat geteilt');
      onPDFUpdate();
    } catch (error) {
      showAlert('error', 'Fehler beim Teilen');
    }
  };
  
  return (
    <div className="pdf-manager">
      <h4 className="font-medium mb-3">PDF-Versionen ({pdfs.length})</h4>
      
      <div className="space-y-3">
        {pdfs.map(pdf => (
          <div key={pdf.id} className="bg-white border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{pdf.fileName}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pdf.reviewStatus === 'approved' ? 'bg-green-100 text-green-700' :
                    pdf.reviewStatus === 'needs_revision' ? 'bg-red-100 text-red-700' :
                    pdf.reviewStatus === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {pdf.reviewStatus === 'approved' ? 'Freigegeben' :
                     pdf.reviewStatus === 'needs_revision' ? 'Überarbeitung' :
                     pdf.reviewStatus === 'under_review' ? 'In Prüfung' :
                     'Entwurf'}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500 space-x-3">
                  <span>Version {pdf.version}</span>
                  <span>{formatDistanceToNow(pdf.createdAt.toDate(), { addSuffix: true })}</span>
                  {pdf.chatMessageCount > 0 && (
                    <span>💬 {pdf.chatMessageCount} Kommentare</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <a
                  href={pdf.downloadUrl}
                  target="_blank"
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  📄 Öffnen
                </a>
                
                <button
                  onClick={() => handleShareInChat(pdf)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  💬 In Chat teilen
                </button>
                
                {pdf.discussionChatId && (
                  <button
                    onClick={() => openProjectChat(projectId, pdf.discussionChatId)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                  >
                    🔗 Chat öffnen
                  </button>
                )}
              </div>
            </div>
            
            {/* Freigabe-Status Details */}
            {pdf.reviewStatus !== 'draft' && (
              <div className="mt-2 pt-2 border-t text-xs">
                {pdf.approvedBy && pdf.approvedBy.length > 0 && (
                  <div className="text-green-600">
                    ✅ Freigegeben von: {pdf.approvedBy.length} Personen
                  </div>
                )}
                {pdf.revisionNotes && (
                  <div className="text-amber-600 mt-1">
                    📝 Änderungshinweise: {pdf.revisionNotes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {pdfs.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">Noch keine PDF-Versionen erstellt</p>
            <p className="text-xs mt-1">Aktivieren Sie die PDF-Generierung und speichern Sie die Kampagne</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

## 5. PROJEKT-PIPELINE INTEGRATION

### 5.1 Interne Freigabe-Status im Projekt
```typescript
interface Project {
  // ... bestehende Felder
  
  // NEU: Interne Freigabe-Tracking
  internalApproval: {
    stage: 'not_started' | 'in_progress' | 'completed';
    
    // PDF-Versionen
    pdfVersions: string[];     // InternalPDFVersion IDs
    latestPDFVersion?: string; // Neueste Version
    
    // Review-Status
    reviewRequested: boolean;
    reviewRequestedAt?: Timestamp;
    reviewApprovedBy: string[];  // User IDs
    reviewRejectedBy: string[];  // User IDs
    
    // Flexible Freigabe-Logik
    requiresUniminousApproval: boolean;  // Alle müssen zustimmen
    minimumApprovals: number;            // Mindestanzahl Zustimmungen
    
    // Abschluss
    completedAt?: Timestamp;
    completedBy?: string;
    notes?: string;
  };
}
```

### 5.2 Interne Freigabe-Tab in Projekt-Detail
```typescript
const ProjectInternalApprovalTab = ({ project }: { project: Project }) => {
  const [internalPDFs, setInternalPDFs] = useState<InternalPDFVersion[]>([]);
  
  useEffect(() => {
    loadInternalPDFs();
  }, [project.id]);
  
  return (
    <div className="internal-approval-tab">
      {/* Status-Übersicht */}
      <div className="approval-status bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium mb-2">Interne Freigabe-Status</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {project.internalApproval.reviewApprovedBy.length}
            </div>
            <div className="text-sm text-gray-600">Freigaben</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {project.internalApproval.reviewRejectedBy.length}
            </div>
            <div className="text-sm text-gray-600">Ablehnungen</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {internalPDFs.length}
            </div>
            <div className="text-sm text-gray-600">PDF-Versionen</div>
          </div>
        </div>
      </div>
      
      {/* PDF-Versionen Liste */}
      <div className="pdf-versions mb-6">
        <h4 className="font-medium mb-3">PDF-Versionen</h4>
        <InternalPDFList 
          pdfs={internalPDFs} 
          projectId={project.id!}
          onPDFShare={handlePDFShare}
          onReviewRequest={handleReviewRequest}
        />
      </div>
      
      {/* Team-Kommunikation */}
      <div className="team-communication">
        <h4 className="font-medium mb-3">Team-Diskussion</h4>
        <ProjectCommunicationFeed 
          projectId={project.id!}
          teamMembers={project.assignedTeamMembers}
          showPDFSharing={true}
        />
      </div>
      
      {/* Freigabe-Aktionen */}
      {project.internalApproval.stage === 'in_progress' && (
        <div className="approval-actions mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-3">Interne Freigabe abschließen</h4>
          
          <button
            onClick={handleCompleteInternalApproval}
            className="bg-green-600 text-white px-4 py-2 rounded-lg mr-3"
            disabled={!canCompleteApproval(project)}
          >
            ✅ Interne Freigabe erteilen
          </button>
          
          <button
            onClick={handleRejectInternalApproval}
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            ❌ Zurück zur Überarbeitung
          </button>
        </div>
      )}
    </div>
  );
};
```

## ZUSAMMENFASSUNG: IMPLEMENTIERUNG

### Phase 1: Grundstruktur
1. **Projekt-Zuordnung** in Kampagnen NEW/EDIT
2. **InternalPDFVersion** Entity und Service
3. **Basis PDF-Generierung** für interne Reviews

### Phase 2: Chat-Integration
1. **PDF-Sharing** in Communication-Feed
2. **Review-Request** Funktionalität
3. **Flexible Freigabe-Workflows**

### Phase 3: Pipeline-Integration
1. **Interne Freigabe-Status** im Projekt
2. **Automatische Stage-Transitions**
3. **Vollständige UI-Integration**

### Phase 4: Erweiterte Features
1. **Auto-PDF-Generierung** bei Speicherung
2. **Review-Deadlines** und Erinnerungen
3. **Freigabe-Analytics** und Reports

**Resultat**: Vollständige interne Freigabephase mit:
- ✅ Flexible, zwanglose Diskussionen im Team-Chat
- ✅ PDF-Generierung und -Versionierung im Projekt-Ordner
- ✅ Nahtlose Integration in bestehende Kampagnen-Workflows
- ✅ Automatisierung wo sinnvoll, manuelle Kontrolle wo nötig
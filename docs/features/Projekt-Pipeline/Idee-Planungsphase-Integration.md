# Idee/Planungsphase - Integration in CeleroPress

## Konzept-Übersicht
Integration einer vollständigen Idee/Planungsphase in die bestehende CeleroPress-Architektur durch:
1. **Projekt-spezifische Media-Ordner** (automatisch angelegt)
2. **Integriertes Editor-System** (wie Kampagnen-Editor)
3. **Team-Kommunikationsfeed** (Chat-ähnlich, vereinfacht)
4. **Strategiedokumente & Bildideen** (Upload & Management)

## 1. PROJEKT-ORDNER SYSTEM

### 1.1 Automatische Ordner-Erstellung
```typescript
// Bei Projekt-Erstellung automatisch Ordner anlegen
const createProjectFolder = async (project: Project): Promise<MediaFolder> => {
  const projectFolder = await mediaService.createFolder({
    name: `Projekt: ${project.title}`,
    description: `Alle Materialien für ${project.title} (${project.clientName})`,
    parentId: null, // Root-Level oder unter Client-Ordner
    organizationId: project.organizationId,
    
    // Projekt-spezifische Metadaten
    projectId: project.id,
    clientId: project.clientId,
    
    // Spezielle Ordner-Struktur
    subfolders: [
      'Strategiedokumente',
      'Bildideen & Inspiration', 
      'Recherche & Briefings',
      'Entwürfe & Notizen',
      'Externe Dokumente'
    ]
  });
  
  // Projekt-Ordner-ID im Projekt speichern
  await projectService.updateProject(project.id, {
    linkedElements: {
      ...project.linkedElements,
      projectFolderId: projectFolder.id
    }
  });
  
  return projectFolder;
};
```

### 1.2 Erweiterte MediaFolder Entity
```typescript
interface ProjectMediaFolder extends MediaFolder {
  // Projekt-spezifische Felder
  projectId?: string;
  folderType?: 'project_root' | 'strategy' | 'inspiration' | 'research' | 'drafts' | 'external';
  
  // Automatische Sub-Ordner
  autoCreatedSubfolders?: {
    strategyId: string;      // "Strategiedokumente"
    inspirationId: string;   // "Bildideen & Inspiration"
    researchId: string;      // "Recherche & Briefings"
    draftsId: string;        // "Entwürfe & Notizen"
    externalId: string;      // "Externe Dokumente"
  };
  
  // Berechtigungen
  teamAccess: {
    canView: string[];       // User IDs
    canEdit: string[];       // User IDs
    canUpload: string[];     // User IDs
  };
}
```

### 1.3 Ordner-Struktur Visualisierung
```
📁 Projekt: [Projektname] - [Kunde]
├── 📄 Strategiedokumente/
│   ├── Projektbriefing.md
│   ├── Zielgruppen-Analyse.md
│   └── Kommunikationsstrategie.md
├── 🖼️ Bildideen & Inspiration/
│   ├── Visual-Moodboard.jpg
│   ├── Competitor-Analysis.pdf
│   └── Style-References/
├── 📊 Recherche & Briefings/
│   ├── Marktanalyse.pdf
│   ├── Kunden-Briefing.docx
│   └── Zielgruppen-Research.xlsx
├── ✏️ Entwürfe & Notizen/
│   ├── Erste-Ideen.md
│   ├── Brainstorming-Notes.md
│   └── Team-Feedback.md
└── 📎 Externe Dokumente/
    ├── Kunden-Logos.zip
    ├── Brand-Guidelines.pdf
    └── Pressematerial.pdf
```

## 2. INTEGRIERTES EDITOR-SYSTEM

### 2.1 Strategiedokument-Editor
```typescript
// Neue Entity für Strategiedokumente
interface StrategyDocument extends BaseEntity {
  projectId: string;
  title: string;
  type: 'briefing' | 'strategy' | 'analysis' | 'notes' | 'other';
  
  // Editor-Content (wie bei Kampagnen)
  content: string;           // HTML vom TipTap Editor
  plainText?: string;        // Plain-Text Version
  
  // Metadaten
  author: string;            // User ID
  authorName: string;        // Denormalisiert
  lastEditedBy?: string;
  version: number;
  
  // Sharing & Collaboration
  sharedWith: string[];      // Team Member IDs
  isPublic: boolean;         // Für alle Team-Mitglieder sichtbar
  
  // Verknüpfung zu Media Assets
  attachedAssets?: string[]; // Asset IDs aus Projekt-Ordner
  
  // Status
  status: 'draft' | 'review' | 'approved' | 'archived';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: string;
}
```

### 2.2 Strategy-Editor Komponente
```typescript
// Ähnlich wie CampaignContentComposer
const StrategyDocumentEditor = ({
  document,
  projectId,
  onSave
}: {
  document?: StrategyDocument;
  projectId: string;
  onSave: (doc: StrategyDocument) => void;
}) => {
  // TipTap Editor mit erweiterten Features
  const editor = useEditor({
    extensions: [
      // Standard-Extensions wie bei Kampagnen
      StarterKit,
      Link,
      Table,
      TaskList,
      TaskItem,
      
      // Zusätzlich für Strategiedokumente:
      Highlight,              // Text-Markierung
      TextAlign,              // Text-Ausrichtung
      Underline,             // Unterstreichen
      Subscript,             // Tiefgestellt
      Superscript,           // Hochgestellt
    ],
    content: document?.content || ''
    // Kein Auto-Save - nur manuelles Speichern
  });

  // Template-System für häufige Dokument-Typen
  const templates = {
    briefing: `
      <h1>Projekt-Briefing</h1>
      <h2>Ausgangssituation</h2>
      <p>[Beschreibung der aktuellen Situation]</p>
      
      <h2>Ziele</h2>
      <ul>
        <li>Hauptziel</li>
        <li>Nebenziele</li>
      </ul>
      
      <h2>Zielgruppen</h2>
      <p>[Primäre und sekundäre Zielgruppen]</p>
      
      <h2>Kernbotschaften</h2>
      <p>[Hauptbotschaften]</p>
    `,
    
    strategy: `
      <h1>Kommunikationsstrategie</h1>
      <h2>Strategische Ausrichtung</h2>
      <p>[Grundlegende Strategie]</p>
      
      <h2>Kanäle & Medien</h2>
      <ul>
        <li>Print-Medien</li>
        <li>Online-Medien</li>
        <li>Social Media</li>
      </ul>
      
      <h2>Timeline & Meilensteine</h2>
      <p>[Zeitplan]</p>
    `,
    
    analysis: `
      <h1>Analyse</h1>
      <h2>Marktumfeld</h2>
      <p>[Marktanalyse]</p>
      
      <h2>Wettbewerber</h2>
      <p>[Competitor-Analyse]</p>
      
      <h2>Chancen & Risiken</h2>
      <ul>
        <li>Chancen</li>
        <li>Risiken</li>
      </ul>
    `
  };

  return (
    <div className="strategy-editor">
      {/* Editor-Toolbar */}
      <EditorToolbar 
        editor={editor}
        templates={templates}
        onInsertTemplate={(template) => editor.commands.setContent(template)}
      />
      
      {/* Editor-Content */}
      <EditorContent editor={editor} className="prose max-w-none" />
      
      {/* Save Button */}
      <div className="editor-actions mt-4">
        <button
          onClick={() => onSave({
            ...document,
            content: editor.getHTML(),
            updatedAt: serverTimestamp()
          })}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Dokument speichern
        </button>
      </div>
      
      {/* Asset-Integration */}
      <AssetPanel 
        projectFolderId={projectFolderId}
        onAssetInsert={(asset) => insertAssetIntoEditor(editor, asset)}
      />
    </div>
  );
};
```

### 2.3 Dokument-Templates
```typescript
interface DocumentTemplate {
  id: string;
  name: string;
  type: 'briefing' | 'strategy' | 'analysis' | 'notes';
  content: string;          // HTML-Template
  description: string;
  isDefault: boolean;
  organizationId: string;
}

// Vordefinierte Templates
const defaultTemplates: DocumentTemplate[] = [
  {
    name: 'Projekt-Briefing',
    type: 'briefing',
    content: briefingTemplate,
    description: 'Standard-Vorlage für Projekt-Briefings'
  },
  {
    name: 'Kommunikationsstrategie', 
    type: 'strategy',
    content: strategyTemplate,
    description: 'Vorlage für strategische Dokumente'
  },
  {
    name: 'Zielgruppen-Analyse',
    type: 'analysis', 
    content: analysisTemplate,
    description: 'Template für Zielgruppen- und Marktanalysen'
  }
];
```

## 3. TEAM-KOMMUNIKATIONSFEED

### 3.1 Communication-Entry Entity
```typescript
interface CommunicationEntry {
  id: string;
  projectId: string;
  
  // Nachricht
  type: 'comment' | 'file_upload' | 'document_created' | 'document_updated' | 'status_change' | 'mention';
  message: string;
  
  // Autor
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  
  // Kontext
  contextType?: 'document' | 'asset' | 'task' | 'general';
  contextId?: string;        // Document/Asset/Task ID
  contextTitle?: string;     // Für bessere UX
  
  // Anhänge
  attachments?: {
    type: 'asset' | 'document';
    id: string;
    name: string;
    url?: string;
  }[];
  
  // Mentions (@team-member)
  mentions?: string[];       // User IDs
  
  // Reaktionen (einfach)
  reactions?: {
    emoji: string;           // 👍, ❤️, 👎
    userIds: string[];
  }[];
  
  // Status
  isEdited: boolean;
  editedAt?: Timestamp;
  isDeleted: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  organizationId: string;
}
```

### 3.2 Communication-Feed Komponente
```typescript
const ProjectCommunicationFeed = ({
  projectId,
  teamMembers
}: {
  projectId: string;
  teamMembers: TeamMember[];
}) => {
  const [messages, setMessages] = useState<CommunicationEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Real-time Updates via Firestore Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'communication_entries'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CommunicationEntry[];
        setMessages(entries.reverse()); // Chronologisch
      }
    );

    return unsubscribe;
  }, [projectId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await communicationService.createEntry({
      projectId,
      type: 'comment',
      message: newMessage,
      mentions: extractMentions(newMessage), // @username erkennen
    });

    setNewMessage('');
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Upload in Projekt-Ordner
      const asset = await mediaService.uploadToProjectFolder(projectId, file);
      
      // Automatische Nachricht erstellen
      await communicationService.createEntry({
        projectId,
        type: 'file_upload',
        message: `Hat eine Datei hochgeladen: ${file.name}`,
        attachments: [{
          type: 'asset',
          id: asset.id!,
          name: asset.fileName,
          url: asset.downloadUrl
        }]
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="communication-feed">
      {/* Message-Liste */}
      <div className="messages-container max-h-96 overflow-y-auto">
        {messages.map(entry => (
          <CommunicationMessage 
            key={entry.id} 
            entry={entry}
            teamMembers={teamMembers}
          />
        ))}
      </div>

      {/* Input-Bereich */}
      <div className="message-input border-t pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nachricht schreiben... (@username für Erwähnung)"
            className="flex-1 px-3 py-2 border rounded-lg"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          
          {/* File Upload */}
          <input
            type="file"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.png,.gif"
          />
          <label 
            htmlFor="file-upload"
            className="px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"
          >
            📎
          </label>
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 3.3 Message-Komponente
```typescript
const CommunicationMessage = ({
  entry,
  teamMembers
}: {
  entry: CommunicationEntry;
  teamMembers: TeamMember[];
}) => {
  const author = teamMembers.find(m => m.id === entry.authorId);
  
  return (
    <div className="message-item flex gap-3 p-3 hover:bg-gray-50">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {author?.avatar ? (
          <img src={author.avatar} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            {entry.authorName.charAt(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{entry.authorName}</span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(entry.createdAt.toDate())}
          </span>
        </div>
        
        <div className="mt-1">
          {entry.type === 'comment' && (
            <p className="text-gray-900">{entry.message}</p>
          )}
          
          {entry.type === 'file_upload' && (
            <div className="flex items-center gap-2 text-blue-600">
              📎 {entry.message}
            </div>
          )}
          
          {entry.attachments && (
            <div className="mt-2 space-y-1">
              {entry.attachments.map(att => (
                <a 
                  key={att.id}
                  href={att.url} 
                  className="text-blue-600 hover:underline text-sm"
                  target="_blank"
                >
                  {att.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Simple Reactions */}
        {entry.reactions && entry.reactions.length > 0 && (
          <div className="mt-2 flex gap-1">
            {entry.reactions.map(reaction => (
              <button
                key={reaction.emoji}
                className="text-sm bg-gray-100 rounded px-2 py-1"
              >
                {reaction.emoji} {reaction.userIds.length}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

## 4. DATEITYPEN & UPLOAD-SYSTEM

### 4.1 Unterstützte Dateitypen für Planungsphase
```typescript
const planningFileTypes = {
  // Strategiedokumente
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  
  // Tabellen & Analysen  
  spreadsheets: ['.xlsx', '.xls', '.csv', '.ods'],
  
  // Präsentationen
  presentations: ['.ppt', '.pptx', '.key', '.odp'],
  
  // Bilder & Inspiration
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
  
  // Design-Dateien
  design: ['.psd', '.ai', '.sketch', '.fig', '.xd'],
  
  // Archive
  archives: ['.zip', '.rar', '.7z'],
  
  // Andere
  other: ['.md', '.html', '.json']
};

// File-Type Kategorisierung
const categorizeFile = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  
  if (planningFileTypes.documents.includes(ext)) return 'document';
  if (planningFileTypes.spreadsheets.includes(ext)) return 'spreadsheet';
  if (planningFileTypes.presentations.includes(ext)) return 'presentation';
  if (planningFileTypes.images.includes(ext)) return 'image';
  if (planningFileTypes.design.includes(ext)) return 'design';
  if (planningFileTypes.archives.includes(ext)) return 'archive';
  
  return 'other';
};
```

### 4.2 Upload in Projekt-Ordner
```typescript
// Erweiterte MediaService Methoden
export const mediaService = {
  // ... bestehende Methoden
  
  // NEU: Upload direkt in Projekt-Ordner
  async uploadToProjectFolder(
    projectId: string, 
    file: File, 
    subfolder?: 'strategy' | 'inspiration' | 'research' | 'drafts' | 'external'
  ): Promise<MediaAsset> {
    // Projekt-Ordner laden
    const project = await projectService.getById(projectId);
    const projectFolder = await this.getProjectFolder(projectId);
    
    // Ziel-Ordner bestimmen
    let targetFolderId = projectFolder.id;
    if (subfolder && projectFolder.autoCreatedSubfolders) {
      targetFolderId = projectFolder.autoCreatedSubfolders[`${subfolder}Id`];
    }
    
    // Upload mit automatischer Kategorisierung
    const asset = await this.uploadFile(file, {
      organizationId: project.organizationId,
      folderId: targetFolderId,
      clientId: project.clientId,
      
      // Projekt-spezifische Metadaten
      projectId,
      category: categorizeFile(file.name),
      uploadContext: 'planning_phase'
    });
    
    // Communication-Entry erstellen
    await communicationService.createEntry({
      projectId,
      type: 'file_upload',
      message: `Hat ${file.name} hochgeladen`,
      attachments: [{
        type: 'asset',
        id: asset.id!,
        name: asset.fileName,
        url: asset.downloadUrl
      }]
    });
    
    return asset;
  },
  
  // NEU: Projekt-Ordner laden
  async getProjectFolder(projectId: string): Promise<ProjectMediaFolder> {
    const project = await projectService.getById(projectId);
    if (!project.linkedElements.projectFolderId) {
      throw new Error('Projekt-Ordner nicht gefunden');
    }
    
    return await this.getFolderById(project.linkedElements.projectFolderId);
  }
};
```

## 5. INTEGRATION IN BESTEHENDE ARCHITEKTUR

### 5.1 Project Entity Erweiterung
```typescript
interface Project extends BaseEntity {
  // ... bestehende Felder
  
  // NEU: Planungsphase-spezifische Felder
  planning: {
    // Strategiedokumente
    strategyDocuments: string[];     // StrategyDocument IDs
    
    // Projekt-Ordner
    projectFolderId?: string;        // MediaFolder ID
    
    // Team-Kommunikation
    lastCommunicationAt?: Timestamp;
    unreadMessages?: Record<string, number>; // userId -> count
    
    // Planungs-Status
    planningCompleted: boolean;
    approvedForCreation: boolean;
    approvedBy?: string;
    approvedAt?: Timestamp;
    
    // Templates & Briefings
    briefingCompleted: boolean;
    strategyApproved: boolean;
    targetGroupsDefined: boolean;
    budgetApproved: boolean;
  };
}
```

### 5.2 Neue Services
```typescript
// StrategyDocumentService
class StrategyDocumentService extends BaseService<StrategyDocument> {
  async createDocument(projectId: string, type: string, title: string): Promise<string>
  async getProjectDocuments(projectId: string): Promise<StrategyDocument[]>
  async updateDocument(docId: string, content: string): Promise<void>
  async shareWithTeam(docId: string, userIds: string[]): Promise<void>
}

// CommunicationService  
class CommunicationService extends BaseService<CommunicationEntry> {
  async createEntry(entry: Omit<CommunicationEntry, 'id'>): Promise<string>
  async getProjectCommunication(projectId: string): Promise<CommunicationEntry[]>
  async markAsRead(projectId: string, userId: string): Promise<void>
  async mentionUser(entryId: string, userId: string): Promise<void>
}

// ProjectPlanningService
class ProjectPlanningService {
  async initializePlanning(projectId: string): Promise<void>
  async completePlanningPhase(projectId: string): Promise<void>
  async generatePlanningReport(projectId: string): Promise<PlanningReport>
}
```

### 5.3 UI-Integration in Projekt-Karte
```typescript
// Planungsphase-Tab in Projekt-Detail-View
const ProjectPlanningTab = ({ project }: { project: Project }) => {
  return (
    <div className="planning-phase">
      {/* Strategiedokumente */}
      <section className="mb-8">
        <h3>Strategiedokumente</h3>
        <StrategyDocumentsList projectId={project.id} />
        <CreateDocumentButton projectId={project.id} />
      </section>

      {/* Projekt-Ordner */}
      <section className="mb-8">
        <h3>Projekt-Materialien</h3>
        <ProjectFolderBrowser folderId={project.planning.projectFolderId} />
        <QuickUploadArea projectId={project.id} />
      </section>

      {/* Team-Kommunikation */}
      <section className="mb-8">
        <h3>Team-Kommunikation</h3>
        <ProjectCommunicationFeed 
          projectId={project.id} 
          teamMembers={project.assignedTeamMembers}
        />
      </section>

      {/* Planungs-Checkliste */}
      <section>
        <h3>Planungsfortschritt</h3>
        <PlanningChecklist project={project} />
      </section>
    </div>
  );
};
```

## ZUSAMMENFASSUNG: IMPLEMENTIERUNGSSCHRITTE

### Phase 1: Grundstruktur
1. **Projekt-Ordner System** implementieren
2. **StrategyDocument Entity** und Service erstellen
3. **Basis Editor-Komponente** entwickeln

### Phase 2: Kommunikation
1. **CommunicationEntry System** implementieren  
2. **Team-Feed Komponente** entwickeln
3. **Real-time Updates** via Firestore

### Phase 3: Integration
1. **Upload-System** in Projekt-Ordner
2. **File-Kategorisierung** und Metadaten
3. **UI-Integration** in Projekt-Pipeline

### Phase 4: Erweiterte Features
1. **Document-Templates** System
2. **Erweiterte Editor-Features**
3. **Planungsphase-Abschluss** Workflow

**Resultat**: Vollständige Idee/Planungsphase mit:
- ✅ Automatische Projekt-Ordner
- ✅ Integrierte Strategiedokumente  
- ✅ Team-Kommunikation
- ✅ File-Upload & -Management
- ✅ Nahtlose Integration in bestehende Architektur
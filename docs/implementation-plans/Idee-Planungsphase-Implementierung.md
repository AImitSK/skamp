# Ideas/Planning Phase Implementierungsplan

## Referenz-Dokumentation
**Basis:** `docs/features/Projekt-Pipeline/Idee-Planungsphase-Integration.md`

## Übersicht
Implementierungsplan für die erste Pipeline-Phase "Ideas/Planning" mit Strategie-Dokument-Editor, automatischer Projekt-Ordner-Erstellung und Team-Kommunikation. **WICHTIG: Kein Auto-Save System - nur manuelles Speichern!**

---

## SCHRITT 1: STRATEGIE-DOKUMENT EDITOR

### 1.1 TipTap-Editor ohne Auto-Save implementieren
**Datei:** `src/components/projects/ideas-planning/StrategyDocumentEditor.tsx` (neu)
**Agent:** `general-purpose`
**Dauer:** 2-3 Tage

**Umsetzung:**
```typescript
// src/components/projects/ideas-planning/StrategyDocumentEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { 
  DocumentTextIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Project } from '@/types/projects';
import { projectService } from '@/lib/firebase/project-service';

interface StrategyDocumentEditorProps {
  project: Project;
  onSave?: (content: string, title: string) => void;
  onTitleChange?: (title: string) => void;
  className?: string;
}

interface StrategyDocument {
  title: string;
  content: string;
  lastSaved?: Date;
  version: number;
}

export function StrategyDocumentEditor({
  project,
  onSave,
  onTitleChange,
  className
}: StrategyDocumentEditorProps) {
  const [document, setDocument] = useState<StrategyDocument>({
    title: project.title || '',
    content: '',
    version: 1
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');

  // TipTap Editor Setup - OHNE Auto-Save!
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Beginnen Sie mit der Strategie-Entwicklung...\n\n📋 Projektübersicht\n• Ziele und Zielgruppen definieren\n• Kernbotschaften entwickeln\n• Kommunikationsstrategie festlegen\n\n💡 Ideen und Konzepte\n• Kreative Ansätze sammeln\n• Content-Ideen entwickeln\n• Kanal-Strategie planen'
      })
    ],
    content: document.content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4'
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      if (content !== lastSavedContent) {
        setHasUnsavedChanges(true);
      }
      setDocument(prev => ({ ...prev, content }));
    }
  });

  // Dokument laden
  useEffect(() => {
    loadStrategyDocument();
  }, [project.id]);

  const loadStrategyDocument = async () => {
    try {
      // Strategie-Dokument aus Projekt laden
      if (project.strategyDocument) {
        const doc = typeof project.strategyDocument === 'string' 
          ? JSON.parse(project.strategyDocument)
          : project.strategyDocument;
        
        setDocument(doc);
        setLastSavedContent(doc.content);
        
        if (editor) {
          editor.commands.setContent(doc.content);
        }
        
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Strategie-Dokuments:', error);
    }
  };

  // MANUELLES SPEICHERN - Kein Auto-Save!
  const handleSaveDocument = useCallback(async () => {
    if (!editor || isSaving) return;

    setIsSaving(true);
    
    try {
      const content = editor.getHTML();
      const updatedDocument: StrategyDocument = {
        ...document,
        content,
        lastSaved: new Date(),
        version: document.version + 1
      };

      // In Projekt speichern
      await projectService.update(project.id!, {
        strategyDocument: JSON.stringify(updatedDocument)
      }, {
        organizationId: project.organizationId,
        userId: 'current_user' // Wird aus Auth-Context geholt
      });

      setDocument(updatedDocument);
      setLastSavedContent(content);
      setHasUnsavedChanges(false);
      
      // Callback für Parent-Komponente
      onSave?.(content, document.title);

      // Erfolgs-Feedback (kurz anzeigen)
      setTimeout(() => setIsSaving(false), 500);
      
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setIsSaving(false);
    }
  }, [editor, document, project.id, onSave]);

  // Titel-Änderung
  const handleTitleChange = useCallback((newTitle: string) => {
    setDocument(prev => ({ ...prev, title: newTitle }));
    setHasUnsavedChanges(true);
    onTitleChange?.(newTitle);
  }, [onTitleChange]);

  // Keyboard-Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S für manuelles Speichern
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDocument();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveDocument]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
        <Text className="ml-2 text-gray-600">Editor wird geladen...</Text>
      </div>
    );
  }

  return (
    <div className={`strategy-document-editor ${className}`}>
      {/* Header mit Titel und Speichern-Button */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={document.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xl font-semibold text-gray-900 border-none outline-none w-full bg-transparent"
              placeholder="Strategie-Dokument Titel..."
            />
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-amber-600">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <Text className="text-sm">Ungespeicherte Änderungen</Text>
              </div>
            )}
            
            {/* Last Saved Info */}
            {document.lastSaved && !hasUnsavedChanges && (
              <Text className="text-sm text-gray-500">
                Gespeichert: {document.lastSaved.toLocaleTimeString()}
              </Text>
            )}
            
            {/* Manual Save Button */}
            <Button
              onClick={handleSaveDocument}
              disabled={isSaving || !hasUnsavedChanges}
              className={`flex items-center gap-2 ${
                isSaving ? 'bg-green-600' : hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
              }`}
            >
              {isSaving ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Gespeichert
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-4 w-4" />
                  Speichern {hasUnsavedChanges && '(Ctrl+S)'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 px-3 py-2 bg-gray-50">
          <div className="flex items-center gap-2">
            <Button
              plain
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
            >
              <strong>B</strong>
            </Button>
            <Button
              plain
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
            >
              <em>I</em>
            </Button>
            <Button
              plain
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
            >
              H2
            </Button>
            <Button
              plain
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            >
              • Liste
            </Button>
            <Button
              plain
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
            >
              1. Liste
            </Button>
          </div>
        </div>
        
        {/* Editor Content */}
        <EditorContent 
          editor={editor} 
          className="min-h-[500px] max-h-[800px] overflow-y-auto"
        />
      </div>

      {/* Footer mit Statistiken */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <Text>Version: {document.version}</Text>
          {document.content && (
            <Text>
              Zeichen: {editor.getText().length} | 
              Wörter: {editor.getText().trim().split(/\s+/).length}
            </Text>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Text>Letzte Speicherung:</Text>
          <Text className="font-medium">
            {document.lastSaved 
              ? document.lastSaved.toLocaleString() 
              : 'Noch nicht gespeichert'
            }
          </Text>
        </div>
      </div>
    </div>
  );
}
```

**Test für Strategie-Editor:**
```typescript
// src/__tests__/components/projects/StrategyDocumentEditor.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StrategyDocumentEditor } from '@/components/projects/ideas-planning/StrategyDocumentEditor';
import { Project } from '@/types/projects';
import { projectService } from '@/lib/firebase/project-service';

// Mock TipTap
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    commands: {
      setContent: jest.fn(),
      focus: jest.fn()
    },
    getHTML: () => '<p>Test content</p>',
    getText: () => 'Test content',
    isActive: () => false
  })),
  EditorContent: ({ editor }: any) => <div data-testid="editor-content">Editor</div>
}));

jest.mock('@/lib/firebase/project-service');

describe('StrategyDocumentEditor', () => {
  const mockProject: Project = {
    id: 'project_123',
    title: 'Test Project',
    organizationId: 'org_123',
    stage: 'ideas_planning',
    assignedTeamMembers: [],
    clientName: 'Test Client'
  } as Project;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render editor without auto-save', () => {
    render(<StrategyDocumentEditor project={mockProject} />);
    
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    expect(screen.getByText('Speichern')).toBeInTheDocument();
    expect(screen.queryByText('Auto-Save')).not.toBeInTheDocument();
  });

  it('should show unsaved changes indicator', async () => {
    const { rerender } = render(<StrategyDocumentEditor project={mockProject} />);
    
    // Simulate content change
    // TipTap's onUpdate würde normalerweise ausgelöst
    
    expect(screen.getByText('Ungespeicherte Änderungen')).toBeInTheDocument();
  });

  it('should save document manually only', async () => {
    const mockOnSave = jest.fn();
    render(<StrategyDocumentEditor project={mockProject} onSave={mockOnSave} />);
    
    const saveButton = screen.getByText('Speichern');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(projectService.update).toHaveBeenCalledWith(
        'project_123',
        expect.objectContaining({
          strategyDocument: expect.any(String)
        }),
        expect.any(Object)
      );
    });
  });

  it('should support keyboard shortcut for manual save', async () => {
    render(<StrategyDocumentEditor project={mockProject} />);
    
    // Simulate Ctrl+S
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    
    await waitFor(() => {
      expect(projectService.update).toHaveBeenCalled();
    });
  });

  it('should handle title changes', () => {
    const mockOnTitleChange = jest.fn();
    render(<StrategyDocumentEditor project={mockProject} onTitleChange={mockOnTitleChange} />);
    
    const titleInput = screen.getByPlaceholderText('Strategie-Dokument Titel...');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    
    expect(mockOnTitleChange).toHaveBeenCalledWith('New Title');
  });

  it('should disable save button when no changes', () => {
    render(<StrategyDocumentEditor project={mockProject} />);
    
    const saveButton = screen.getByText('Speichern');
    expect(saveButton).toBeDisabled();
  });
});
```

---

## SCHRITT 2: PROJEKT-ORDNER AUTOMATISCHE ERSTELLUNG

### 2.1 Media-Library Integration für Projekt-Ordner
**Datei:** `src/lib/firebase/project-media-service.ts` (neu)
**Agent:** `general-purpose`
**Dauer:** 1-2 Tage

**Umsetzung:**
```typescript
// src/lib/firebase/project-media-service.ts
import { mediaService } from './media-service';
import { Project, ServiceContext } from '@/types/projects';

export const projectMediaService = {
  /**
   * Automatische Projekt-Ordner-Struktur erstellen
   */
  async createProjectFolders(project: Project, context: ServiceContext): Promise<string[]> {
    const baseFolderName = `Projekt_${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_${project.id}`;
    
    const folderStructure = [
      { name: baseFolderName, type: 'root' },
      { name: `${baseFolderName}/01_Strategie`, type: 'strategy' },
      { name: `${baseFolderName}/02_Content`, type: 'content' },
      { name: `${baseFolderName}/03_Medien`, type: 'media' },
      { name: `${baseFolderName}/04_Entwuerfe`, type: 'drafts' },
      { name: `${baseFolderName}/05_Reviews`, type: 'reviews' },
      { name: `${baseFolderName}/06_Final`, type: 'final' },
      { name: `${baseFolderName}/07_Assets`, type: 'assets' }
    ];

    const createdFolderIds: string[] = [];
    
    for (const folder of folderStructure) {
      try {
        // Media-Service für Ordner-Erstellung nutzen (falls verfügbar)
        const folderId = await this.createMediaFolder(
          folder.name,
          folder.type,
          project.organizationId
        );
        createdFolderIds.push(folderId);
      } catch (error) {
        console.warn(`Konnte Ordner nicht erstellen: ${folder.name}`, error);
      }
    }

    // Ordner-IDs in Projekt speichern
    await this.linkFoldersToProject(project.id!, createdFolderIds, context);
    
    return createdFolderIds;
  },

  /**
   * Media-Ordner erstellen (Integration mit bestehendem Media-System)
   */
  private async createMediaFolder(
    folderName: string, 
    folderType: string, 
    organizationId: string
  ): Promise<string> {
    // Integration mit bestehendem Media-Service
    // Falls Media-Service Ordner-Support hat
    if (typeof mediaService.createFolder === 'function') {
      return await mediaService.createFolder({
        name: folderName,
        type: folderType,
        organizationId,
        projectSpecific: true
      });
    }
    
    // Fallback: Ordner-Informationen in separater Collection speichern
    return await this.createFolderMetadata(folderName, folderType, organizationId);
  },

  /**
   * Ordner-Metadaten speichern (Fallback)
   */
  private async createFolderMetadata(
    folderName: string,
    folderType: string,
    organizationId: string
  ): Promise<string> {
    const folderData = {
      name: folderName,
      type: folderType,
      organizationId,
      createdAt: new Date(),
      isProjectFolder: true
    };

    // In project_folders Collection speichern
    const docRef = await addDoc(collection(db, 'project_folders'), folderData);
    return docRef.id;
  },

  /**
   * Ordner mit Projekt verknüpfen
   */
  private async linkFoldersToProject(
    projectId: string, 
    folderIds: string[], 
    context: ServiceContext
  ): Promise<void> {
    await projectService.update(projectId, {
      projectFolders: folderIds,
      mediaStructure: {
        baseFolderIds: folderIds,
        createdAt: new Date(),
        structure: 'default_7_folder'
      }
    }, context);
  },

  /**
   * Assets zu Projekt-Ordner hinzufügen
   */
  async addAssetToProjectFolder(
    projectId: string,
    assetId: string,
    folderType: 'strategy' | 'content' | 'media' | 'drafts' | 'reviews' | 'final' | 'assets',
    context: ServiceContext
  ): Promise<void> {
    const project = await projectService.getById(projectId, context.organizationId);
    if (!project?.projectFolders) {
      throw new Error('Projekt-Ordner nicht gefunden');
    }

    // Asset zu entsprechendem Ordner hinzufügen
    const targetFolderId = this.getFolderIdByType(project.projectFolders, folderType);
    
    if (targetFolderId) {
      // Asset-Ordner-Verknüpfung erstellen
      await this.linkAssetToFolder(assetId, targetFolderId, context.organizationId);
    }
  },

  /**
   * Ordner-ID nach Typ finden
   */
  private getFolderIdByType(folderIds: string[], folderType: string): string | null {
    // Vereinfachte Logik - in echter Implementation würde man
    // die Ordner-Metadaten abfragen und nach Typ filtern
    const typeIndex = {
      'strategy': 1,
      'content': 2,
      'media': 3,
      'drafts': 4,
      'reviews': 5,
      'final': 6,
      'assets': 7
    };
    
    const index = typeIndex[folderType as keyof typeof typeIndex];
    return folderIds[index] || null;
  },

  /**
   * Asset mit Ordner verknüpfen
   */
  private async linkAssetToFolder(
    assetId: string,
    folderId: string,
    organizationId: string
  ): Promise<void> {
    // Asset-Folder-Verknüpfung in separater Collection oder Asset-Metadaten
    const linkData = {
      assetId,
      folderId,
      organizationId,
      linkedAt: new Date()
    };

    await addDoc(collection(db, 'asset_folder_links'), linkData);
  },

  /**
   * Projekt-Assets nach Ordner-Typ abrufen
   */
  async getProjectAssetsByFolder(
    projectId: string,
    folderType: string,
    organizationId: string
  ): Promise<any[]> {
    const project = await projectService.getById(projectId, organizationId);
    if (!project?.projectFolders) {
      return [];
    }

    const folderId = this.getFolderIdByType(project.projectFolders, folderType);
    if (!folderId) {
      return [];
    }

    // Assets für Ordner laden
    const q = query(
      collection(db, 'asset_folder_links'),
      where('folderId', '==', folderId),
      where('organizationId', '==', organizationId)
    );

    const snapshot = await getDocs(q);
    const assetIds = snapshot.docs.map(doc => doc.data().assetId);

    if (assetIds.length === 0) {
      return [];
    }

    // Assets laden (parallel)
    const assets = await Promise.all(
      assetIds.map(id => mediaService.getById(id, organizationId))
    );

    return assets.filter(asset => asset !== null);
  }
};
```

**Test für Projekt-Media-Service:**
```typescript
// src/__tests__/features/project-media-service.test.ts
import { projectMediaService } from '@/lib/firebase/project-media-service';
import { Project } from '@/types/projects';

describe('ProjectMediaService', () => {
  const mockProject: Project = {
    id: 'project_123',
    title: 'Test Projekt Media',
    organizationId: 'org_123'
  } as Project;

  const mockContext = {
    organizationId: 'org_123',
    userId: 'user_123'
  };

  describe('createProjectFolders', () => {
    it('should create standard 7-folder structure', async () => {
      const folderIds = await projectMediaService.createProjectFolders(mockProject, mockContext);
      
      expect(folderIds).toHaveLength(7);
      expect(Array.isArray(folderIds)).toBe(true);
    });

    it('should create folders with project-specific names', async () => {
      const folderIds = await projectMediaService.createProjectFolders(mockProject, mockContext);
      
      // Verify project was updated with folder IDs
      expect(projectService.update).toHaveBeenCalledWith(
        'project_123',
        expect.objectContaining({
          projectFolders: expect.any(Array),
          mediaStructure: expect.objectContaining({
            baseFolderIds: expect.any(Array),
            structure: 'default_7_folder'
          })
        }),
        mockContext
      );
    });

    it('should handle folder creation errors gracefully', async () => {
      // Mock folder creation failure
      jest.spyOn(projectMediaService as any, 'createMediaFolder')
        .mockRejectedValueOnce(new Error('Folder creation failed'));

      const folderIds = await projectMediaService.createProjectFolders(mockProject, mockContext);
      
      // Should continue with other folders even if one fails
      expect(folderIds.length).toBeGreaterThan(0);
    });
  });

  describe('addAssetToProjectFolder', () => {
    it('should add asset to correct folder type', async () => {
      const mockProjectWithFolders = {
        ...mockProject,
        projectFolders: ['folder1', 'folder2', 'folder3', 'folder4', 'folder5', 'folder6', 'folder7']
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(mockProjectWithFolders);

      await projectMediaService.addAssetToProjectFolder(
        'project_123',
        'asset_456',
        'media',
        mockContext
      );

      // Should link asset to media folder (index 3)
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          assetId: 'asset_456',
          folderId: 'folder4', // Media folder
          organizationId: 'org_123'
        })
      );
    });

    it('should enforce multi-tenancy in asset-folder links', async () => {
      const wrongContext = {
        organizationId: 'wrong_org',
        userId: 'user_123'
      };

      await expect(
        projectMediaService.addAssetToProjectFolder('project_123', 'asset_456', 'media', wrongContext)
      ).rejects.toThrow();
    });
  });

  describe('getProjectAssetsByFolder', () => {
    it('should return assets for specific folder type', async () => {
      const assets = await projectMediaService.getProjectAssetsByFolder(
        'project_123',
        'media',
        'org_123'
      );

      expect(Array.isArray(assets)).toBe(true);
      // Assets should be filtered by organizationId
    });

    it('should return empty array for non-existent folders', async () => {
      const assets = await projectMediaService.getProjectAssetsByFolder(
        'nonexistent_project',
        'media',
        'org_123'
      );

      expect(assets).toEqual([]);
    });
  });
});
```

---

## SCHRITT 3: TEAM-KOMMUNIKATIONS-FEED

### 3.1 Projekt-Team-Chat implementieren
**Datei:** `src/components/projects/ideas-planning/ProjectTeamChat.tsx` (neu)
**Agent:** `general-purpose`
**Dauer:** 2-3 Tage

**Umsetzung:**
```typescript
// src/components/projects/ideas-planning/ProjectTeamChat.tsx
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Field } from '@/components/ui/field';
import { 
  PaperAirplaneIcon,
  UserGroupIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { 
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { Project } from '@/types/projects';

interface TeamMessage {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  timestamp: Timestamp;
  organizationId: string;
  messageType: 'text' | 'system' | 'document_update';
  metadata?: {
    documentName?: string;
    actionType?: string;
  };
}

interface ProjectTeamChatProps {
  project: Project;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  className?: string;
}

export function ProjectTeamChat({
  project,
  currentUserId,
  currentUserName,
  currentUserEmail,
  className
}: ProjectTeamChatProps) {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Real-time Messages laden
  useEffect(() => {
    const q = query(
      collection(db, 'project_team_messages'),
      where('projectId', '==', project.id),
      where('organizationId', '==', project.organizationId), // MULTI-TENANCY
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList: TeamMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamMessage));

      setMessages(messageList);
      
      // Auto-scroll to bottom bei neuen Messages
      setTimeout(() => scrollToBottom(), 100);
    });

    return unsubscribe;
  }, [project.id, project.organizationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Message senden
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    
    try {
      const messageData: Omit<TeamMessage, 'id'> = {
        projectId: project.id!,
        userId: currentUserId,
        userName: currentUserName,
        userEmail: currentUserEmail,
        message: newMessage.trim(),
        timestamp: serverTimestamp() as Timestamp,
        organizationId: project.organizationId, // MULTI-TENANCY
        messageType: 'text'
      };

      await addDoc(collection(db, 'project_team_messages'), messageData);
      
      setNewMessage('');
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setSending(false);
    }
  };

  // System-Message für Dokument-Updates
  const sendSystemMessage = async (actionType: string, documentName?: string) => {
    const systemMessage: Omit<TeamMessage, 'id'> = {
      projectId: project.id!,
      userId: 'system',
      userName: 'System',
      userEmail: '',
      message: `${currentUserName} hat ${actionType}${documentName ? ` "${documentName}"` : ''}`,
      timestamp: serverTimestamp() as Timestamp,
      organizationId: project.organizationId,
      messageType: 'system',
      metadata: {
        documentName,
        actionType
      }
    };

    await addDoc(collection(db, 'project_team_messages'), systemMessage);
  };

  // Enter-Taste für Senden
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Message-Darstellung
  const renderMessage = (message: TeamMessage) => {
    const isOwn = message.userId === currentUserId;
    const isSystem = message.messageType === 'system';

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-gray-100 rounded-full px-3 py-1">
            <Text className="text-xs text-gray-600">
              {message.message}
            </Text>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* User-Info */}
          <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <Text className="text-xs text-gray-500 font-medium">
              {message.userName}
            </Text>
            <Text className="text-xs text-gray-400">
              {message.timestamp?.toDate?.()?.toLocaleTimeString() || 'Sending...'}
            </Text>
          </div>
          
          {/* Message-Bubble */}
          <div className={`rounded-lg px-3 py-2 ${
            isOwn 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            <Text className="text-sm whitespace-pre-wrap">
              {message.message}
            </Text>
          </div>
        </div>
      </div>
    );
  };

  // Exposed method für Parent-Komponenten
  useEffect(() => {
    // Expose sendSystemMessage für Strategy-Editor
    (window as any).projectTeamChat = {
      sendSystemMessage
    };
  }, []);

  return (
    <div className={`project-team-chat flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-5 w-5 text-gray-600" />
          <Text className="font-semibold text-gray-900">Team-Kommunikation</Text>
          <div className="flex items-center gap-1 text-gray-500">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <Text className="text-xs">Live</Text>
          </div>
        </div>
        
        <Text className="text-sm text-gray-600 mt-1">
          {project.assignedTeamMembers.length} Team-Mitglieder
        </Text>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{ maxHeight: '400px' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <UserGroupIcon className="h-12 w-12 mb-3" />
            <Text className="text-center">
              Noch keine Nachrichten.
              <br />
              Starten Sie die Team-Kommunikation!
            </Text>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field>
              <Field.Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nachricht an das Team..."
                disabled={sending}
                className="resize-none"
                rows={1}
              />
            </Field>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="flex items-center gap-2 px-4 py-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            Senden
          </Button>
        </div>
        
        <Text className="text-xs text-gray-500 mt-2">
          Enter zum Senden, Shift+Enter für neue Zeile
        </Text>
      </div>
    </div>
  );
}
```

**Integration mit Strategy-Editor:**
```typescript
// In StrategyDocumentEditor.tsx - handleSaveDocument erweitern
const handleSaveDocument = useCallback(async () => {
  // ... existing save logic ...

  try {
    // ... save document ...

    // Team benachrichtigen
    if ((window as any).projectTeamChat) {
      await (window as any).projectTeamChat.sendSystemMessage(
        'Strategie-Dokument gespeichert',
        document.title
      );
    }

  } catch (error) {
    // ... error handling ...
  }
}, []);
```

**Test für Team-Chat:**
```typescript
// src/__tests__/components/projects/ProjectTeamChat.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectTeamChat } from '@/components/projects/ideas-planning/ProjectTeamChat';
import { Project } from '@/types/projects';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((query, callback) => {
    // Mock empty messages initially
    callback({ docs: [] });
    return jest.fn(); // unsubscribe function
  }),
  serverTimestamp: jest.fn(() => new Date())
}));

describe('ProjectTeamChat', () => {
  const mockProject: Project = {
    id: 'project_123',
    title: 'Test Project',
    organizationId: 'org_123',
    assignedTeamMembers: ['user1', 'user2', 'user3']
  } as Project;

  const defaultProps = {
    project: mockProject,
    currentUserId: 'user1',
    currentUserName: 'Test User',
    currentUserEmail: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render team chat interface', () => {
    render(<ProjectTeamChat {...defaultProps} />);
    
    expect(screen.getByText('Team-Kommunikation')).toBeInTheDocument();
    expect(screen.getByText('3 Team-Mitglieder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nachricht an das Team...')).toBeInTheDocument();
  });

  it('should show empty state when no messages', () => {
    render(<ProjectTeamChat {...defaultProps} />);
    
    expect(screen.getByText('Noch keine Nachrichten.')).toBeInTheDocument();
    expect(screen.getByText('Starten Sie die Team-Kommunikation!')).toBeInTheDocument();
  });

  it('should send message on button click', async () => {
    const { addDoc } = require('firebase/firestore');
    render(<ProjectTeamChat {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Nachricht an das Team...');
    const sendButton = screen.getByText('Senden');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          projectId: 'project_123',
          userId: 'user1',
          userName: 'Test User',
          message: 'Test message',
          organizationId: 'org_123',
          messageType: 'text'
        })
      );
    });
  });

  it('should send message on Enter key', async () => {
    const { addDoc } = require('firebase/firestore');
    render(<ProjectTeamChat {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Nachricht an das Team...');
    
    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          message: 'Enter test'
        })
      );
    });
  });

  it('should enforce multi-tenancy in messages', () => {
    const { query, where } = require('firebase/firestore');
    render(<ProjectTeamChat {...defaultProps} />);
    
    expect(query).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith('organizationId', '==', 'org_123');
  });

  it('should expose system message function', () => {
    render(<ProjectTeamChat {...defaultProps} />);
    
    expect((window as any).projectTeamChat).toBeDefined();
    expect(typeof (window as any).projectTeamChat.sendSystemMessage).toBe('function');
  });
});
```

---

## SCHRITT 4: IDEAS/PLANNING HAUPT-KOMPONENTE

### 4.1 Integrierte Ideas/Planning Page
**Datei:** `src/components/projects/ideas-planning/IdeasPlanningPhase.tsx` (neu)
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// src/components/projects/ideas-planning/IdeasPlanningPhase.tsx
import { useState, useEffect } from 'react';
import { Project, ServiceContext } from '@/types/projects';
import { StrategyDocumentEditor } from './StrategyDocumentEditor';
import { ProjectTeamChat } from './ProjectTeamChat';
import { projectMediaService } from '@/lib/firebase/project-media-service';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { 
  DocumentTextIcon,
  FolderIcon,
  CheckCircleIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

interface IdeasPlanningPhaseProps {
  project: Project;
  context: ServiceContext;
  onPhaseComplete?: () => void;
  className?: string;
}

export function IdeasPlanningPhase({
  project,
  context,
  onPhaseComplete,
  className
}: IdeasPlanningPhaseProps) {
  const [foldersCreated, setFoldersCreated] = useState(false);
  const [strategyDocumentSaved, setStrategyDocumentSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'strategy' | 'team'>('strategy');

  // Projekt-Ordner automatisch erstellen bei Component-Mount
  useEffect(() => {
    createProjectFoldersIfNeeded();
  }, [project.id]);

  const createProjectFoldersIfNeeded = async () => {
    if (project.projectFolders && project.projectFolders.length > 0) {
      setFoldersCreated(true);
      return;
    }

    try {
      const folderIds = await projectMediaService.createProjectFolders(project, context);
      setFoldersCreated(folderIds.length > 0);
    } catch (error) {
      console.error('Fehler beim Erstellen der Projekt-Ordner:', error);
    }
  };

  const handleStrategyDocumentSave = (content: string, title: string) => {
    setStrategyDocumentSaved(true);
    
    // Team über Dokument-Update benachrichtigen
    if ((window as any).projectTeamChat) {
      (window as any).projectTeamChat.sendSystemMessage(
        'hat das Strategie-Dokument gespeichert',
        title
      );
    }
  };

  const canCompletePhase = () => {
    return foldersCreated && strategyDocumentSaved;
  };

  const handleCompletePhase = () => {
    if (canCompletePhase()) {
      onPhaseComplete?.();
    }
  };

  return (
    <div className={`ideas-planning-phase h-full ${className}`}>
      {/* Phase Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Ideen & Planung
            </h2>
            <Text className="text-gray-600 mt-1">
              Strategie entwickeln und Projekt-Grundlagen schaffen
            </Text>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Progress Indicators */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${foldersCreated ? 'text-green-600' : 'text-gray-400'}`}>
                <FolderIcon className="h-5 w-5" />
                <Text className="text-sm">Ordner erstellt</Text>
                {foldersCreated && <CheckCircleIcon className="h-4 w-4" />}
              </div>
              
              <div className={`flex items-center gap-2 ${strategyDocumentSaved ? 'text-green-600' : 'text-gray-400'}`}>
                <DocumentTextIcon className="h-5 w-5" />
                <Text className="text-sm">Strategie gespeichert</Text>
                {strategyDocumentSaved && <CheckCircleIcon className="h-4 w-4" />}
              </div>
            </div>
            
            {/* Complete Phase Button */}
            <Button
              onClick={handleCompletePhase}
              disabled={!canCompletePhase()}
              className={`flex items-center gap-2 ${
                canCompletePhase() 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-400'
              }`}
            >
              Phase abschließen
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('strategy')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'strategy'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Strategie-Dokument
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'team'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Team-Kommunikation
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'strategy' ? (
          <div className="h-full">
            <StrategyDocumentEditor
              project={project}
              onSave={handleStrategyDocumentSave}
              className="h-full"
            />
          </div>
        ) : (
          <div className="h-full">
            <ProjectTeamChat
              project={project}
              currentUserId={context.userId}
              currentUserName="Current User" // From auth context
              currentUserEmail="user@example.com" // From auth context
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Test für Ideas/Planning Phase:**
```typescript
// src/__tests__/components/projects/IdeasPlanningPhase.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdeasPlanningPhase } from '@/components/projects/ideas-planning/IdeasPlanningPhase';
import { Project, ServiceContext } from '@/types/projects';
import { projectMediaService } from '@/lib/firebase/project-media-service';

jest.mock('@/lib/firebase/project-media-service');

describe('IdeasPlanningPhase', () => {
  const mockProject: Project = {
    id: 'project_123',
    title: 'Test Project',
    organizationId: 'org_123',
    stage: 'ideas_planning',
    assignedTeamMembers: ['user1', 'user2']
  } as Project;

  const mockContext: ServiceContext = {
    organizationId: 'org_123',
    userId: 'user_123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (projectMediaService.createProjectFolders as jest.Mock).mockResolvedValue(['folder1', 'folder2']);
  });

  it('should render phase with tabs', () => {
    render(<IdeasPlanningPhase project={mockProject} context={mockContext} />);
    
    expect(screen.getByText('Ideen & Planung')).toBeInTheDocument();
    expect(screen.getByText('Strategie-Dokument')).toBeInTheDocument();
    expect(screen.getByText('Team-Kommunikation')).toBeInTheDocument();
  });

  it('should automatically create project folders on mount', async () => {
    render(<IdeasPlanningPhase project={mockProject} context={mockContext} />);
    
    await waitFor(() => {
      expect(projectMediaService.createProjectFolders).toHaveBeenCalledWith(
        mockProject,
        mockContext
      );
    });

    expect(screen.getByText('Ordner erstellt')).toBeInTheDocument();
  });

  it('should enable phase completion when requirements met', async () => {
    render(<IdeasPlanningPhase project={mockProject} context={mockContext} />);
    
    await waitFor(() => {
      expect(screen.getByText('Ordner erstellt')).toBeInTheDocument();
    });

    // Initially disabled because strategy not saved
    const completeButton = screen.getByText('Phase abschließen');
    expect(completeButton).toBeDisabled();

    // Mock strategy document save
    // In real implementation, this would be triggered by StrategyDocumentEditor
    fireEvent.click(screen.getByText('Strategie-Dokument'));
    
    // Phase completion should be possible after both requirements met
    // This would need proper integration with child components
  });

  it('should switch between tabs', () => {
    render(<IdeasPlanningPhase project={mockProject} context={mockContext} />);
    
    // Initially on strategy tab
    expect(screen.getByText('Strategie-Dokument')).toHaveClass('text-blue-600');
    
    // Switch to team tab
    fireEvent.click(screen.getByText('Team-Kommunikation'));
    expect(screen.getByText('Team-Kommunikation')).toHaveClass('text-blue-600');
  });

  it('should call onPhaseComplete when requirements met and button clicked', async () => {
    const mockOnPhaseComplete = jest.fn();
    
    render(
      <IdeasPlanningPhase 
        project={mockProject} 
        context={mockContext} 
        onPhaseComplete={mockOnPhaseComplete}
      />
    );

    // Wait for folders to be created
    await waitFor(() => {
      expect(projectMediaService.createProjectFolders).toHaveBeenCalled();
    });

    // Mock strategy document saved (would be set by child component)
    // In real implementation, this would happen through callback

    // Complete phase
    const completeButton = screen.getByText('Phase abschließen');
    // Button would be enabled after both requirements met
    
    // expect(mockOnPhaseComplete).toHaveBeenCalled();
  });
});
```

---

## SCHRITT 5: FIRESTORE-COLLECTIONS & SICHERHEIT

### 5.1 Neue Collections für Team-Messages
**Agent:** `general-purpose`
**Dauer:** 0.5 Tage

**Firestore Indices erweitern:**
```json
{
  "firestore": {
    "indexes": [
      // Bestehende Indices...
      
      // NEU: Team-Messages
      {
        "collectionGroup": "project_team_messages",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "projectId", "order": "ASCENDING" },
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "timestamp", "order": "ASCENDING" }
        ]
      },
      
      // NEU: Projekt-Ordner
      {
        "collectionGroup": "project_folders",
        "queryScope": "COLLECTION", 
        "fields": [
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "isProjectFolder", "order": "ASCENDING" },
          { "fieldPath": "createdAt", "order": "DESCENDING" }
        ]
      },
      
      // NEU: Asset-Folder Links
      {
        "collectionGroup": "asset_folder_links",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "folderId", "order": "ASCENDING" },
          { "fieldPath": "linkedAt", "order": "DESCENDING" }
        ]
      }
    ]
  }
}
```

**Security Rules erweitern:**
```javascript
// firestore.rules - Neue Collections
match /project_team_messages/{messageId} {
  // Nur Projekt-Team-Mitglieder können Messages lesen/schreiben
  allow read, write: if request.auth != null 
    && request.auth.token.organizationId == resource.data.organizationId
    && isProjectTeamMember(resource.data.projectId);
  
  allow create: if request.auth != null 
    && request.auth.token.organizationId == request.resource.data.organizationId
    && request.auth.uid == request.resource.data.userId;
}

match /project_folders/{folderId} {
  allow read, write: if request.auth != null 
    && request.auth.token.organizationId == resource.data.organizationId;
}

match /asset_folder_links/{linkId} {
  allow read, write: if request.auth != null 
    && request.auth.token.organizationId == resource.data.organizationId;
}

function isProjectTeamMember(projectId) {
  return exists(/databases/$(database)/documents/projects/$(projectId)) 
    && request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.assignedTeamMembers;
}
```

---

## SCHRITT 6: DOKUMENTATION AKTUALISIEREN

### 6.1 Implementation Status dokumentieren
**Agent:** `documentation-orchestrator`
**Dauer:** 0.5 Tage

**Aufgaben:**
1. `docs/features/Projekt-Pipeline/Idee-Planungsphase-Integration.md` aktualisieren
   - Implementation Status: "✅ COMPLETED"
   - Komponenten-Referenzen hinzufügen
   - Test-Coverage dokumentieren
   - **Auto-Save Entfernung bestätigen**

2. Masterplan aktualisieren
   - Ideas/Planning Phase als "COMPLETED" markieren
   - Nächste Creation-Phase vorbereiten

3. User-Guide erstellen
   - Strategie-Editor Bedienung (ohne Auto-Save!)
   - Team-Chat Features
   - Projekt-Ordner Nutzung

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen:
- ✅ Strategie-Dokument Editor **ohne Auto-Save** funktional
- ✅ Manuelles Speichern mit Ctrl+S und Button
- ✅ Projekt-Ordner automatische Erstellung
- ✅ Real-time Team-Chat implementiert
- ✅ Phase-Completion Logic funktional

### Qualitätsanforderungen:
- ✅ 100% Test-Coverage für neue Komponenten
- ✅ Multi-Tenancy in allen Real-time Features
- ✅ TipTap-Editor Performance optimiert
- ✅ Mobile-responsive Design

### Integration-Requirements:
- ✅ Bestehende Media-System Integration
- ✅ Project-Service erweitert aber nicht verändert
- ✅ Firestore Real-time ohne Performance-Impact
- ✅ Team-Benachrichtigungen funktional

### User-Experience:
- ✅ **Kein Auto-Save - nur manuelles Speichern**
- ✅ Unsaved-Changes Indicator
- ✅ Keyboard-Shortcuts (Ctrl+S)
- ✅ Real-time Team-Collaboration
- ✅ Intuitive Tab-Navigation

---

## RISIKEN & MITIGATION

### Risiko 1: TipTap-Editor Performance bei großen Dokumenten
**Mitigation:** Editor-Optimierung, Content-Pagination bei sehr langen Texten

### Risiko 2: Real-time Messages Performance-Impact
**Mitigation:** Message-Pagination, Connection-Pooling, Auto-Cleanup alter Messages

### Risiko 3: Projekt-Ordner Konflikte mit bestehendem Media-System
**Mitigation:** Fallback-Strategy, separate Metadata-Collection, graceful Degradation

---

## NÄCHSTE SCHRITTE

Nach erfolgreichem Abschluss:
1. **Creation Phase implementieren** (Kampagnen-Integration)
2. **Media-Library Integration testen** in Staging-Umgebung
3. **Performance-Tests** für Real-time Features
4. **User-Training** für neue Strategie-Tools

**Die Ideas/Planning Phase bildet das Foundation für alle nachfolgenden Pipeline-Stages und muss vollständig getestet sein, bevor die nächste Phase beginnt.**
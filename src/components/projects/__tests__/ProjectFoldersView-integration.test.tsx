/**
 * Enhanced ProjectFoldersView Integration Tests  
 * Test-Suite für Smart Upload Router Integration in handleUpload
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/firebase/services/projects', () => ({
  getProject: jest.fn(),
  getProjectFolders: jest.fn(),
  createProjectFolder: jest.fn(),
  updateProject: jest.fn(),
}));

jest.mock('@/lib/firebase/services/media', () => ({
  uploadClientMedia: jest.fn(),
  getMediaFiles: jest.fn(),
}));

jest.mock('@/lib/firebase/project-upload-service', () => ({
  ProjectUploadService: jest.fn(() => ({
    uploadWithSmartRouting: jest.fn(),
    generateUploadPreview: jest.fn(),
    batchUpload: jest.fn(),
    validateFiles: jest.fn(),
  })),
}));

jest.mock('@/components/projects/config/project-folder-feature-flags', () => ({
  ProjectFolderFeatureFlags: jest.fn(() => ({
    isFeatureEnabled: jest.fn(),
    getSmartUploadConfig: jest.fn(),
  })),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      organizationId: 'org-789',
    },
  }),
}));

import { ProjectFoldersView } from '../ProjectFoldersView';
import { ProjectUploadService } from '@/lib/firebase/project-upload-service';
import { ProjectFolderFeatureFlags } from '@/components/projects/config/project-folder-feature-flags';
import * as projectService from '@/lib/firebase/services/projects';
import type { Project, ProjectFolder, PipelinePhase } from '@/types';

// Create data URLs for file testing
const createFile = (name: string, type: string, size: number = 1024): File => {
  return new File([new ArrayBuffer(size)], name, { type });
};

describe('ProjectFoldersView Integration Tests', () => {
  let mockProject: Project;
  let mockFolders: ProjectFolder[];
  let mockUploadService: any;
  let mockFeatureFlags: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    // Mock Project
    mockProject = {
      id: 'proj-123',
      title: 'Test Kampagne',
      company: 'ACME Corp',
      clientId: 'client-456',
      organizationId: 'org-789',
      stage: 'creation',
      pipelinePhase: 'creation' as PipelinePhase,
      folders: ['folder-docs', 'folder-media', 'folder-pr'],
      createdAt: new Date(),
    };

    // Mock Folders
    mockFolders = [
      {
        id: 'folder-docs',
        name: 'Dokumente',
        type: 'documents',
        projectId: 'proj-123',
        clientId: 'client-456',
        organizationId: 'org-789',
        path: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Dokumente',
        color: '#3B82F6',
        createdAt: new Date(),
        mediaCount: 5,
      },
      {
        id: 'folder-media',
        name: 'Medien',
        type: 'media',
        projectId: 'proj-123',
        clientId: 'client-456',
        organizationId: 'org-789',
        path: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Medien',
        color: '#10B981',
        createdAt: new Date(),
        mediaCount: 12,
      },
      {
        id: 'folder-pr',
        name: 'Pressemeldungen',
        type: 'press_releases',
        projectId: 'proj-123',
        clientId: 'client-456',
        organizationId: 'org-789',
        path: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Pressemeldungen',
        color: '#F59E0B',
        createdAt: new Date(),
        mediaCount: 3,
      },
    ];

    // Mock Upload Service
    mockUploadService = {
      uploadWithSmartRouting: jest.fn(),
      generateUploadPreview: jest.fn(),
      batchUpload: jest.fn(),
      validateFiles: jest.fn(),
    };

    (ProjectUploadService as jest.Mock).mockReturnValue(mockUploadService);

    // Mock Feature Flags
    mockFeatureFlags = {
      isFeatureEnabled: jest.fn(),
      getSmartUploadConfig: jest.fn(),
    };

    (ProjectFolderFeatureFlags as jest.Mock).mockReturnValue(mockFeatureFlags);

    // Mock Service Functions
    (projectService.getProject as jest.Mock).mockResolvedValue(mockProject);
    (projectService.getProjectFolders as jest.Mock).mockResolvedValue(mockFolders);

    // Default Feature Flags
    mockFeatureFlags.isFeatureEnabled.mockImplementation((flag: string) => {
      const enabledFlags = [
        'smart_upload_routing',
        'drag_drop_preview',
        'batch_upload_optimization',
        'upload_progress_tracking',
        'enhanced_error_messages'
      ];
      return Promise.resolve(enabledFlags.includes(flag));
    });

    mockFeatureFlags.getSmartUploadConfig.mockResolvedValue({
      enabled: true,
      confidenceThreshold: 0.7,
      autoAcceptThreshold: 0.9,
      showPreview: true,
    });

    // Default Upload Service Responses
    mockUploadService.validateFiles.mockResolvedValue({ valid: true, errors: [] });
    mockUploadService.generateUploadPreview.mockResolvedValue({
      recommendations: [],
      hasConflicts: false,
    });

    jest.clearAllMocks();
  });

  describe('Smart Upload Router Integration in handleUpload', () => {
    it('sollte Smart Upload Router bei Datei-Upload aktivieren', async () => {
      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'document.pdf',
            targetFolder: 'Dokumente',
            targetFolderId: 'folder-docs',
            confidence: 95,
            autoRoute: true,
            reason: 'PDF-Dokument für Dokumentenordner'
          }
        ],
        hasConflicts: false,
        smartRouterUsed: true,
      });

      mockUploadService.uploadWithSmartRouting.mockResolvedValue({
        success: true,
        uploadedFiles: [{ id: 'file-1', name: 'document.pdf' }],
        smartRouterUsed: true,
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.getByText('Test Kampagne')).toBeInTheDocument();
      });

      // Simuliere Datei-Upload
      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const pdfFile = createFile('document.pdf', 'application/pdf');

      await user.upload(fileInput, pdfFile);

      await waitFor(() => {
        expect(mockUploadService.generateUploadPreview).toHaveBeenCalledWith({
          projectId: 'proj-123',
          files: [pdfFile],
          organizationId: 'org-789',
        });
      });

      // Upload bestätigen
      const uploadButton = screen.getByRole('button', { name: /hochladen/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadService.uploadWithSmartRouting).toHaveBeenCalledWith({
          projectId: 'proj-123',
          files: [pdfFile],
          organizationId: 'org-789',
          smartRouting: true,
        });
      });
    });

    it('sollte Pipeline-Phase-spezifisches Routing anwenden', async () => {
      // Creation Phase - Medien bevorzugt
      mockProject.pipelinePhase = 'creation';
      (projectService.getProject as jest.Mock).mockResolvedValue(mockProject);

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'keyvisual.jpg',
            targetFolder: 'Medien',
            targetFolderId: 'folder-media',
            confidence: 95,
            autoRoute: true,
            reason: 'Kreativ-Phase bevorzugt Medien-Ordner',
            pipelineOptimized: true,
          }
        ],
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.getByText(/creation/i)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const imageFile = createFile('keyvisual.jpg', 'image/jpeg');

      await user.upload(fileInput, imageFile);

      await waitFor(() => {
        expect(screen.getByText(/pipeline-optimiert/i)).toBeInTheDocument();
        expect(screen.getByText(/medien-ordner/i)).toBeInTheDocument();
      });
    });

    it('sollte Konfidenz-basierte Benutzer-Bestätigung anzeigen', async () => {
      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'unknown.xyz',
            targetFolder: 'Dokumente',
            targetFolderId: 'folder-docs',
            confidence: 55,
            autoRoute: false,
            requiresConfirmation: true,
            reason: 'Unbekannter Dateityp',
            alternatives: [
              { folder: 'Medien', confidence: 45 },
              { folder: 'Pressemeldungen', confidence: 30 }
            ]
          }
        ],
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const unknownFile = createFile('unknown.xyz', 'application/octet-stream');

      await user.upload(fileInput, unknownFile);

      await waitFor(() => {
        expect(screen.getByText(/bestätigung erforderlich/i)).toBeInTheDocument();
        expect(screen.getByText(/55%/)).toBeInTheDocument();
        expect(screen.getByText(/alternative ordner/i)).toBeInTheDocument();
      });

      // Alternative auswählen
      const alternativeButton = screen.getByRole('button', { name: /medien/i });
      await user.click(alternativeButton);

      const confirmButton = screen.getByRole('button', { name: /bestätigen/i });
      await user.click(confirmButton);

      expect(mockUploadService.uploadWithSmartRouting).toHaveBeenCalledWith(
        expect.objectContaining({
          manualOverride: {
            targetFolderId: 'folder-media',
            userSelection: true,
          }
        })
      );
    });
  });

  describe('Enhanced Drag & Drop mit Smart Routing Preview', () => {
    it('sollte Drag & Drop mit Live-Preview unterstützen', async () => {
      mockFeatureFlags.isFeatureEnabled.mockImplementation((flag: string) => 
        Promise.resolve(flag === 'drag_drop_preview')
      );

      render(<ProjectFoldersView projectId="proj-123" />);

      const dropZone = screen.getByTestId('project-folders-dropzone');
      const files = [
        createFile('image1.jpg', 'image/jpeg'),
        createFile('document.pdf', 'application/pdf'),
      ];

      // Simuliere Drag Enter
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          files,
          items: files.map(file => ({ kind: 'file', type: file.type })),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(/2 dateien erkannt/i)).toBeInTheDocument();
        expect(screen.getByText(/smart routing preview/i)).toBeInTheDocument();
      });

      // Drag Over für Routing-Vorschau
      fireEvent.dragOver(dropZone, {
        dataTransfer: { files },
      });

      await waitFor(() => {
        expect(mockUploadService.generateUploadPreview).toHaveBeenCalledWith({
          projectId: 'proj-123',
          files: expect.arrayContaining([
            expect.objectContaining({ name: 'image1.jpg' }),
            expect.objectContaining({ name: 'document.pdf' }),
          ]),
          organizationId: 'org-789',
          previewOnly: true,
        });
      });
    });

    it('sollte Drag & Drop Visual Feedback für Ziel-Ordner anzeigen', async () => {
      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'image.jpg',
            targetFolderId: 'folder-media',
            confidence: 90,
            visualHint: 'highlight_target',
          }
        ],
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const dropZone = screen.getByTestId('project-folders-dropzone');
      const imageFile = createFile('image.jpg', 'image/jpeg');

      fireEvent.dragEnter(dropZone, {
        dataTransfer: { files: [imageFile] },
      });

      await waitFor(() => {
        const mediaFolder = screen.getByTestId('folder-media');
        expect(mediaFolder).toHaveClass('drag-target-highlight');
        expect(within(mediaFolder).getByText(/90% konfidenz/i)).toBeInTheDocument();
      });
    });

    it('sollte Multi-Ordner Drag & Drop für gemischte Dateitypen handhaben', async () => {
      const mixedFiles = [
        createFile('doc1.pdf', 'application/pdf'),
        createFile('img1.jpg', 'image/jpeg'),
        createFile('PM_press.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      ];

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          { fileName: 'doc1.pdf', targetFolderId: 'folder-docs', confidence: 85 },
          { fileName: 'img1.jpg', targetFolderId: 'folder-media', confidence: 90 },
          { fileName: 'PM_press.docx', targetFolderId: 'folder-pr', confidence: 95 },
        ],
        batchOptimization: {
          groups: [
            { targetFolderId: 'folder-docs', files: ['doc1.pdf'] },
            { targetFolderId: 'folder-media', files: ['img1.jpg'] },
            { targetFolderId: 'folder-pr', files: ['PM_press.docx'] },
          ]
        },
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const dropZone = screen.getByTestId('project-folders-dropzone');

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: mixedFiles },
      });

      await waitFor(() => {
        expect(screen.getByText(/3 ordner betroffen/i)).toBeInTheDocument();
        expect(screen.getByTestId('folder-docs')).toHaveClass('drag-target-highlight');
        expect(screen.getByTestId('folder-media')).toHaveClass('drag-target-highlight');
        expect(screen.getByTestId('folder-pr')).toHaveClass('drag-target-highlight');
      });

      // Drop ausführen
      fireEvent.drop(dropZone, {
        dataTransfer: { files: mixedFiles },
      });

      await waitFor(() => {
        expect(mockUploadService.batchUpload).toHaveBeenCalledWith({
          projectId: 'proj-123',
          files: mixedFiles,
          organizationId: 'org-789',
          smartRouting: true,
          batchOptimization: true,
        });
      });
    });
  });

  describe('Smart Upload Modal mit Recommendations', () => {
    it('sollte Smart Upload Modal mit detaillierten Empfehlungen anzeigen', async () => {
      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'presentation.pptx',
            targetFolder: 'Dokumente',
            targetFolderId: 'folder-docs',
            confidence: 87,
            autoRoute: true,
            reason: 'PowerPoint-Präsentation passt zu Dokumenten',
            fileIcon: 'document',
            estimatedUploadTime: 3,
          }
        ],
        totalFiles: 1,
        totalSize: 5242880, // 5MB
        estimatedTime: 3,
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const pptFile = createFile('presentation.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 5242880);

      await user.upload(fileInput, pptFile);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /smart upload/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');
      
      expect(within(modal).getByText('presentation.pptx')).toBeInTheDocument();
      expect(within(modal).getByText('87%')).toBeInTheDocument();
      expect(within(modal).getByText(/dokumente/i)).toBeInTheDocument();
      expect(within(modal).getByText(/3 sekunden/i)).toBeInTheDocument();
      expect(within(modal).getByText(/5 mb/i)).toBeInTheDocument();
    });

    it('sollte Upload-Optionen und -Einstellungen in Modal anzeigen', async () => {
      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const files = [
        createFile('file1.jpg', 'image/jpeg'),
        createFile('file2.pdf', 'application/pdf'),
      ];

      await user.upload(fileInput, files);

      const modal = screen.getByRole('dialog');
      
      // Upload-Optionen
      expect(within(modal).getByLabelText(/parallele verarbeitung/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/progress tracking/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/automatische ordner-erstellung/i)).toBeInTheDocument();

      // Erweiterte Einstellungen
      const advancedButton = within(modal).getByRole('button', { name: /erweiterte einstellungen/i });
      await user.click(advancedButton);

      expect(within(modal).getByLabelText(/upload-qualität/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/metadaten erweitern/i)).toBeInTheDocument();
    });

    it('sollte Batch-Upload-Konfigurations-Interface anzeigen', async () => {
      const batchFiles = Array.from({ length: 15 }, (_, i) => 
        createFile(`file${i + 1}.jpg`, 'image/jpeg')
      );

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: batchFiles.map((_, i) => ({
          fileName: `file${i + 1}.jpg`,
          targetFolderId: 'folder-media',
          confidence: 88,
        })),
        batchOptimization: {
          enabled: true,
          recommendedStrategy: 'parallel',
          maxParallel: 5,
          estimatedTime: 25,
        },
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      await user.upload(fileInput, batchFiles);

      const modal = screen.getByRole('dialog');
      
      expect(within(modal).getByText(/15 dateien/i)).toBeInTheDocument();
      expect(within(modal).getByText(/batch-optimierung aktiviert/i)).toBeInTheDocument();
      expect(within(modal).getByText(/5 parallel/i)).toBeInTheDocument();
      expect(within(modal).getByText(/25 sekunden/i)).toBeInTheDocument();

      // Batch-Strategie ändern
      const strategySelect = within(modal).getByLabelText(/verarbeitungsstrategie/i);
      await user.selectOptions(strategySelect, 'sequential');

      expect(strategySelect).toHaveValue('sequential');
    });
  });

  describe('Pipeline-aware Upload-Restrictions', () => {
    it('sollte Upload-Restrictions für locked Pipeline-Phasen anzeigen', async () => {
      mockProject.pipelinePhase = 'customer_approval';
      mockProject.pipelineLocked = true;
      mockProject.lockReason = 'Kunde-Review läuft';
      
      (projectService.getProject as jest.Mock).mockResolvedValue(mockProject);

      render(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.getByText(/pipeline gesperrt/i)).toBeInTheDocument();
        expect(screen.getByText(/kunde-review läuft/i)).toBeInTheDocument();
      });

      const uploadButton = screen.queryByLabelText(/dateien hochladen/i);
      expect(uploadButton).toBeDisabled();

      // Warnung bei Upload-Versuch
      if (uploadButton) {
        await user.click(uploadButton);
      }

      expect(screen.getByText(/uploads während kunde-review nicht möglich/i)).toBeInTheDocument();
    });

    it('sollte Phase-spezifische Upload-Hinweise anzeigen', async () => {
      mockProject.pipelinePhase = 'distribution';
      (projectService.getProject as jest.Mock).mockResolvedValue(mockProject);

      render(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.getByText(/distribution-phase/i)).toBeInTheDocument();
        expect(screen.getByText(/nur pressemeldungen empfohlen/i)).toBeInTheDocument();
      });

      // Phase-spezifische Upload-Tipps
      expect(screen.getByTestId('phase-upload-tips')).toBeInTheDocument();
      expect(screen.getByText(/finale materialien für veröffentlichung/i)).toBeInTheDocument();
    });

    it('sollte Pipeline-Transition-Warnungen bei bestimmten Uploads zeigen', async () => {
      mockProject.pipelinePhase = 'internal_approval';
      (projectService.getProject as jest.Mock).mockResolvedValue(mockProject);

      mockUploadService.generateUploadPreview.mockResolvedValue({
        recommendations: [
          {
            fileName: 'final_campaign.pdf',
            targetFolderId: 'folder-pr',
            confidence: 92,
            pipelineImpact: {
              mayTriggerTransition: true,
              nextPhase: 'customer_approval',
              warning: 'Upload könnte zur nächsten Phase führen',
            }
          }
        ],
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const finalFile = createFile('final_campaign.pdf', 'application/pdf');

      await user.upload(fileInput, finalFile);

      await waitFor(() => {
        expect(screen.getByText(/pipeline-übergang möglich/i)).toBeInTheDocument();
        expect(screen.getByText(/kunde-genehmigung/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /trotzdem hochladen/i })).toBeInTheDocument();
      });
    });
  });

  describe('Feature-Flag-basierte UI-Rendering', () => {
    it('sollte Smart Upload Features nur bei aktivierten Flags anzeigen', async () => {
      mockFeatureFlags.isFeatureEnabled.mockImplementation((flag: string) => {
        return Promise.resolve(flag === 'smart_upload_routing');
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.getByText(/smart routing/i)).toBeInTheDocument();
        expect(screen.queryByText(/drag drop preview/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/batch optimization/i)).not.toBeInTheDocument();
      });
    });

    it('sollte Beta-Features nur für Beta-Benutzer anzeigen', async () => {
      mockFeatureFlags.isFeatureEnabled.mockImplementation((flag: string) => {
        const betaFlags = ['ai_powered_suggestions', 'predictive_routing'];
        return Promise.resolve(betaFlags.includes(flag));
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.getByText(/ki-empfehlungen/i)).toBeInTheDocument();
        expect(screen.getByText(/predictive routing/i)).toBeInTheDocument();
        expect(screen.getByTestId('beta-badge')).toBeInTheDocument();
      });
    });

    it('sollte Feature-abhängige UI-Elemente korrekt ein-/ausblenden', async () => {
      // Erst alle Features aktiviert
      mockFeatureFlags.isFeatureEnabled.mockResolvedValue(true);

      const { rerender } = render(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('smart-upload-panel')).toBeInTheDocument();
        expect(screen.getByTestId('drag-drop-zone')).toBeInTheDocument();
      });

      // Dann Features deaktivieren
      mockFeatureFlags.isFeatureEnabled.mockResolvedValue(false);

      rerender(<ProjectFoldersView projectId="proj-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('smart-upload-panel')).not.toBeInTheDocument();
        expect(screen.getByTestId('basic-upload-input')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling und User Feedback', () => {
    it('sollte Smart Router Fehler elegant handhaben', async () => {
      mockUploadService.generateUploadPreview.mockRejectedValue(
        new Error('Smart Router Service nicht verfügbar')
      );

      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const file = createFile('test.pdf', 'application/pdf');

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/smart router nicht verfügbar/i)).toBeInTheDocument();
        expect(screen.getByText(/standard upload wird verwendet/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /standard upload/i })).toBeInTheDocument();
      });
    });

    it('sollte Upload-Fehler mit Recovery-Optionen anzeigen', async () => {
      mockUploadService.uploadWithSmartRouting.mockResolvedValue({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Speicher-Quota überschritten',
          suggestedAction: 'upgrade_plan'
        },
        partialSuccess: false,
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      const file = createFile('test.pdf', 'application/pdf');

      await user.upload(fileInput, file);

      const uploadButton = screen.getByRole('button', { name: /hochladen/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/speicher-quota überschritten/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /plan erweitern/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument();
      });
    });

    it('sollte Netzwerk-Probleme mit Offline-Hinweisen behandeln', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      expect(screen.getByText(/offline-modus/i)).toBeInTheDocument();
      expect(screen.getByText(/uploads pausiert/i)).toBeInTheDocument();

      const uploadInput = screen.getByLabelText(/dateien hochladen/i);
      expect(uploadInput).toBeDisabled();

      // Online wieder verfügbar
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.queryByText(/offline-modus/i)).not.toBeInTheDocument();
        expect(uploadInput).not.toBeDisabled();
      });
    });
  });

  describe('Performance und UX', () => {
    it('sollte Upload-Progress mit Real-time Updates anzeigen', async () => {
      const progressCallback = jest.fn();
      
      mockUploadService.uploadWithSmartRouting.mockImplementation(({ onProgress }) => {
        // Simuliere Progress Updates
        setTimeout(() => onProgress({ percentage: 25, currentFile: 'test.pdf' }), 100);
        setTimeout(() => onProgress({ percentage: 50, currentFile: 'test.pdf' }), 200);
        setTimeout(() => onProgress({ percentage: 100, currentFile: 'test.pdf' }), 300);
        
        return Promise.resolve({ success: true, uploadedFiles: [{ id: 'file-1' }] });
      });

      render(<ProjectFoldersView projectId="proj-123" />);

      const fileInput = screen.getByLabelText(/dateien hochladen/i) as HTMLInputElement;
      await user.upload(fileInput, createFile('test.pdf', 'application/pdf'));

      const uploadButton = screen.getByRole('button', { name: /hochladen/i });
      await user.click(uploadButton);

      // Progress Bar sollte erscheinen
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // 25% Progress
      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument();
      });

      // 100% Progress
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      // Success Message
      await waitFor(() => {
        expect(screen.getByText(/erfolgreich hochgeladen/i)).toBeInTheDocument();
      });
    });

    it('sollte lazy Loading für große Ordner-Listen implementieren', async () => {
      const largeFolderList = Array.from({ length: 50 }, (_, i) => ({
        ...mockFolders[0],
        id: `folder-${i}`,
        name: `Ordner ${i + 1}`,
      }));

      (projectService.getProjectFolders as jest.Mock).mockResolvedValue(largeFolderList);

      render(<ProjectFoldersView projectId="proj-123" />);

      // Nur erste 20 Ordner sollten initial geladen werden
      await waitFor(() => {
        expect(screen.getAllByTestId(/^folder-/)).toHaveLength(20);
        expect(screen.getByText(/weitere 30 ordner laden/i)).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /mehr laden/i });
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getAllByTestId(/^folder-/)).toHaveLength(40);
      });
    });
  });
});

// Test Helper Components
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
};

// Mock IntersectionObserver für lazy loading tests
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
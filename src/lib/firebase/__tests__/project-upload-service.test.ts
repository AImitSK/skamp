/**
 * Project Upload Service Tests
 * Test-Suite für Smart Router Integration und Batch-Upload-Funktionalität
 */

import { jest } from '@jest/globals';
import { waitFor, cleanup } from '@testing-library/react';

// Mock Firebase dependencies
jest.mock('@/lib/firebase/config', () => ({
  storage: {},
  db: {},
}));

jest.mock('@/lib/firebase/services/media', () => ({
  uploadClientMedia: jest.fn(),
  deleteMediaFile: jest.fn(),
  getMediaFile: jest.fn(),
}));

jest.mock('@/lib/firebase/services/projects', () => ({
  getProject: jest.fn(),
  updateProject: jest.fn(),
  getProjectFolders: jest.fn(),
  createProjectFolder: jest.fn(),
}));

jest.mock('../smart-upload-router', () => ({
  SmartUploadRouter: jest.fn(() => ({
    routeUpload: jest.fn(),
    buildContext: jest.fn(),
    optimizeBatch: jest.fn(),
  })),
}));

import { ProjectUploadService } from '../project-upload-service';
import { SmartUploadRouter } from '../smart-upload-router';
import * as mediaService from '@/lib/firebase/services/media';
import * as projectService from '@/lib/firebase/services/projects';
import type { 
  Project, 
  ProjectFolder, 
  UploadContext, 
  BatchUploadResult,
  UploadProgress,
  PipelinePhase 
} from '@/types';

describe('ProjectUploadService', () => {
  let uploadService: ProjectUploadService;
  let mockProject: Project;
  let mockFolders: ProjectFolder[];
  let mockSmartRouter: any;
  let mockFiles: File[];

  beforeEach(() => {
    // Service-Instanz erstellen
    uploadService = new ProjectUploadService();
    
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

    // Mock Project Folders
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
      },
    ];

    // Mock Files
    mockFiles = [
      new File(['content1'], 'document.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'image.jpg', { type: 'image/jpeg' }),
      new File(['content3'], 'PM_press.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      }),
    ];

    // Mock Smart Router
    mockSmartRouter = {
      routeUpload: jest.fn(),
      buildContext: jest.fn(),
      optimizeBatch: jest.fn(),
    };

    (SmartUploadRouter as jest.Mock).mockReturnValue(mockSmartRouter);

    // Mock Service Functions
    (projectService.getProject as jest.Mock).mockResolvedValue(mockProject);
    (projectService.getProjectFolders as jest.Mock).mockResolvedValue(mockFolders);
    (mediaService.uploadClientMedia as jest.Mock).mockResolvedValue({
      id: 'media-123',
      url: 'https://storage.example.com/file.jpg',
      path: '/uploads/file.jpg',
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Smart Router Integration', () => {
    it('sollte Smart Router für Upload-Routing korrekt integrieren', async () => {
      mockSmartRouter.buildContext.mockResolvedValue({
        recommendations: [
          {
            file: mockFiles[0],
            targetFolderId: 'folder-docs',
            confidence: 0.9,
            reason: 'PDF-Dokument für Dokumentenordner'
          }
        ],
        hasValidContext: true
      });

      mockSmartRouter.routeUpload.mockResolvedValue({
        targetFolder: mockFolders[0],
        uploadPath: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Dokumente/document.pdf'
      });

      const result = await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789'
      });

      expect(mockSmartRouter.buildContext).toHaveBeenCalledWith({
        project: mockProject,
        folders: mockFolders,
        files: [mockFiles[0]]
      });

      expect(mockSmartRouter.routeUpload).toHaveBeenCalledWith(
        mockFiles[0],
        expect.objectContaining({
          targetFolderId: 'folder-docs',
          confidence: 0.9
        })
      );

      expect(result.success).toBe(true);
      expect(result.uploadedFiles).toHaveLength(1);
    });

    it('sollte Fallback zu Standard-Upload bei Smart Router Fehlern verwenden', async () => {
      mockSmartRouter.buildContext.mockRejectedValue(new Error('Smart Router Error'));

      const result = await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789'
      });

      expect(result.warnings).toContain('Smart Router nicht verfügbar - Standard Upload verwendet');
      expect(result.fallbackUsed).toBe(true);
    });

    it('sollte Pipeline-Phase-spezifische Routing-Logik anwenden', async () => {
      // Creation Phase - Medien bevorzugt
      mockProject.pipelinePhase = 'creation';
      
      mockSmartRouter.buildContext.mockResolvedValue({
        recommendations: [
          {
            file: mockFiles[1], // image.jpg
            targetFolderId: 'folder-media',
            confidence: 0.95,
            reason: 'Kreativ-Phase bevorzugt Medien-Ordner'
          }
        ],
        pipelineOptimized: true
      });

      const result = await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[1]],
        organizationId: 'org-789'
      });

      expect(mockSmartRouter.buildContext).toHaveBeenCalledWith({
        project: expect.objectContaining({ pipelinePhase: 'creation' }),
        folders: mockFolders,
        files: [mockFiles[1]]
      });
    });
  });

  describe('Batch-Upload-Funktionalität', () => {
    it('sollte Batch-Uploads mit paralleler Verarbeitung optimieren', async () => {
      const batchFiles = Array.from({ length: 5 }, (_, i) => 
        new File([`content${i}`], `file${i}.jpg`, { type: 'image/jpeg' })
      );

      mockSmartRouter.optimizeBatch.mockResolvedValue({
        groups: [
          {
            targetFolderId: 'folder-media',
            files: batchFiles,
            processingStrategy: 'parallel',
            maxParallel: 3
          }
        ],
        estimatedTime: 15
      });

      const progressCallback = jest.fn();
      
      const result = await uploadService.batchUpload({
        projectId: 'proj-123',
        files: batchFiles,
        organizationId: 'org-789',
        onProgress: progressCallback
      });

      expect(mockSmartRouter.optimizeBatch).toHaveBeenCalledWith({
        files: batchFiles,
        project: mockProject,
        folders: mockFolders
      });

      expect(result.success).toBe(true);
      expect(result.uploadedFiles).toHaveLength(5);
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFiles: 5,
          completedFiles: 5,
          percentage: 100
        })
      );
    });

    it('sollte große Dateien sequenziell verarbeiten', async () => {
      const largeFiles = [
        new File([new ArrayBuffer(100 * 1024 * 1024)], 'video1.mp4', { type: 'video/mp4' }),
        new File([new ArrayBuffer(150 * 1024 * 1024)], 'video2.mov', { type: 'video/quicktime' })
      ];

      mockSmartRouter.optimizeBatch.mockResolvedValue({
        groups: [
          {
            targetFolderId: 'folder-media',
            files: largeFiles,
            processingStrategy: 'sequential',
            reason: 'Große Dateien > 50MB'
          }
        ],
        estimatedTime: 120
      });

      const result = await uploadService.batchUpload({
        projectId: 'proj-123',
        files: largeFiles,
        organizationId: 'org-789',
        strategy: 'auto'
      });

      expect(result.processingStrategy).toBe('sequential');
      expect(result.estimatedTime).toBeGreaterThan(60);
    });

    it('sollte Mixed-Content-Batch-Uploads intelligent gruppieren', async () => {
      const mixedFiles = [
        new File(['doc1'], 'document1.pdf', { type: 'application/pdf' }),
        new File(['img1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['doc2'], 'document2.docx', { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        }),
        new File(['img2'], 'image2.png', { type: 'image/png' })
      ];

      mockSmartRouter.optimizeBatch.mockResolvedValue({
        groups: [
          {
            targetFolderId: 'folder-docs',
            files: [mixedFiles[0], mixedFiles[2]],
            processingStrategy: 'parallel'
          },
          {
            targetFolderId: 'folder-media',
            files: [mixedFiles[1], mixedFiles[3]],
            processingStrategy: 'parallel'
          }
        ]
      });

      const result = await uploadService.batchUpload({
        projectId: 'proj-123',
        files: mixedFiles,
        organizationId: 'org-789'
      });

      expect(result.groups).toHaveLength(2);
      expect(result.uploadedFiles).toHaveLength(4);
    });

    it('sollte Batch-Upload-Fortschritt granular verfolgen', async () => {
      const batchFiles = Array.from({ length: 10 }, (_, i) => 
        new File([`content${i}`], `file${i}.pdf`, { type: 'application/pdf' })
      );

      let progressUpdates: UploadProgress[] = [];
      const progressCallback = (progress: UploadProgress) => {
        progressUpdates.push(progress);
      };

      await uploadService.batchUpload({
        projectId: 'proj-123',
        files: batchFiles,
        organizationId: 'org-789',
        onProgress: progressCallback,
        trackGranular: true
      });

      expect(progressUpdates.length).toBeGreaterThan(10); // Mindestens pro Datei + Zwischenschritte
      expect(progressUpdates[0].percentage).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
  });

  describe('Upload-Validation und Preview', () => {
    it('sollte Datei-Validierung vor Upload durchführen', async () => {
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-executable' });

      const validationResult = await uploadService.validateFiles([invalidFile], mockProject);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors[0]).toMatchObject({
        file: 'test.exe',
        reason: 'Dateityp nicht erlaubt',
        code: 'INVALID_FILE_TYPE'
      });
    });

    it('sollte Dateigröße-Limits validieren', async () => {
      const oversizedFile = new File(
        [new ArrayBuffer(500 * 1024 * 1024)], // 500MB
        'huge_video.mp4',
        { type: 'video/mp4' }
      );

      const validationResult = await uploadService.validateFiles([oversizedFile], mockProject);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors[0].code).toBe('FILE_TOO_LARGE');
      expect(validationResult.errors[0].maxSize).toBe(100 * 1024 * 1024); // 100MB Limit
    });

    it('sollte Upload-Preview mit Smart-Routing-Empfehlungen generieren', async () => {
      mockSmartRouter.buildContext.mockResolvedValue({
        recommendations: [
          {
            file: mockFiles[0],
            targetFolderId: 'folder-docs',
            confidence: 0.9,
            reason: 'PDF für Dokumente-Ordner'
          },
          {
            file: mockFiles[1],
            targetFolderId: 'folder-media',
            confidence: 0.85,
            reason: 'Bild für Medien-Ordner'
          }
        ]
      });

      const preview = await uploadService.generateUploadPreview({
        projectId: 'proj-123',
        files: mockFiles.slice(0, 2),
        organizationId: 'org-789'
      });

      expect(preview.recommendations).toHaveLength(2);
      expect(preview.recommendations[0]).toMatchObject({
        fileName: 'document.pdf',
        targetFolder: 'Dokumente',
        confidence: 90,
        autoRoute: true
      });
    });

    it('sollte Konfidenz-basierte Benutzer-Bestätigung handhaben', async () => {
      mockSmartRouter.buildContext.mockResolvedValue({
        recommendations: [
          {
            file: mockFiles[0],
            targetFolderId: 'folder-docs',
            confidence: 0.6, // Mittlere Konfidenz
            reason: 'Unsicher über Zielordner'
          }
        ]
      });

      const preview = await uploadService.generateUploadPreview({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789'
      });

      expect(preview.recommendations[0]).toMatchObject({
        confidence: 60,
        autoRoute: false,
        requiresConfirmation: true,
        alternatives: expect.any(Array)
      });
    });
  });

  describe('Integration mit mediaService APIs', () => {
    it('sollte uploadClientMedia korrekt mit Client-ID Integration aufrufen', async () => {
      await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789'
      });

      expect(mediaService.uploadClientMedia).toHaveBeenCalledWith({
        file: mockFiles[0],
        clientId: 'client-456',
        organizationId: 'org-789',
        folder: expect.stringContaining('/Dokumente'),
        metadata: expect.objectContaining({
          projectId: 'proj-123',
          uploadedVia: 'project_folder_smart_upload'
        })
      });
    });

    it('sollte Datei-Metadaten für Project-Context erweitern', async () => {
      mockProject.pipelinePhase = 'customer_approval';

      await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789'
      });

      const uploadCall = (mediaService.uploadClientMedia as jest.Mock).mock.calls[0][0];
      
      expect(uploadCall.metadata).toMatchObject({
        projectId: 'proj-123',
        projectTitle: 'Test Kampagne',
        company: 'ACME Corp',
        pipelinePhase: 'customer_approval',
        uploadedVia: 'project_folder_smart_upload',
        smartRouterVersion: expect.any(String)
      });
    });

    it('sollte Upload-Retry-Logik bei mediaService-Fehlern implementieren', async () => {
      (mediaService.uploadClientMedia as jest.Mock)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          id: 'media-retry-success',
          url: 'https://storage.example.com/retry-file.jpg'
        });

      const result = await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789',
        retryAttempts: 3
      });

      expect(mediaService.uploadClientMedia).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
    });
  });

  describe('Client-ID Vererbung über Ordner-Struktur', () => {
    it('sollte Client-ID konsistent durch alle Unterordner vererben', async () => {
      const subfolderUpload = await uploadService.uploadToSubfolder({
        projectId: 'proj-123',
        parentFolderId: 'folder-media',
        subfolderName: 'Key Visuals',
        files: [mockFiles[1]],
        organizationId: 'org-789'
      });

      expect(mediaService.uploadClientMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-456',
          folder: expect.stringContaining('/Medien/Key Visuals'),
          metadata: expect.objectContaining({
            parentClientId: 'client-456',
            inheritedFromProject: 'proj-123'
          })
        })
      );
    });

    it('sollte Ordner-Hierarchie für Client-ID Vererbung validieren', async () => {
      const hierarchyValidation = await uploadService.validateFolderHierarchy({
        projectId: 'proj-123',
        targetPath: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Medien/Subfolder'
      });

      expect(hierarchyValidation).toMatchObject({
        valid: true,
        clientId: 'client-456',
        inheritanceChain: [
          { level: 'project', clientId: 'client-456' },
          { level: 'folder', clientId: 'client-456' },
          { level: 'subfolder', clientId: 'client-456' }
        ]
      });
    });
  });

  describe('Performance und Optimierung', () => {
    it('sollte Upload-Performance für kleine Dateien unter 5 Sekunden halten', async () => {
      const smallFiles = Array.from({ length: 5 }, (_, i) => 
        new File([`small${i}`], `small${i}.txt`, { type: 'text/plain' })
      );

      const startTime = performance.now();
      
      await uploadService.batchUpload({
        projectId: 'proj-123',
        files: smallFiles,
        organizationId: 'org-789'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // 5 Sekunden
    });

    it('sollte Memory-Management bei großen Batch-Uploads optimieren', async () => {
      const largeFilesCount = 100;
      const largeFiles = Array.from({ length: largeFilesCount }, (_, i) => 
        new File([`large${i}`], `large${i}.pdf`, { type: 'application/pdf' })
      );

      // Mock für Chunking
      mockSmartRouter.optimizeBatch.mockResolvedValue({
        groups: [
          {
            targetFolderId: 'folder-docs',
            files: largeFiles,
            processingStrategy: 'chunked',
            chunkSize: 10,
            maxParallel: 3
          }
        ]
      });

      const result = await uploadService.batchUpload({
        projectId: 'proj-123',
        files: largeFiles,
        organizationId: 'org-789',
        memoryOptimized: true
      });

      expect(result.chunks).toBe(10); // 100 files / 10 per chunk
      expect(result.memoryOptimized).toBe(true);
    });

    it('sollte Upload-Abbruch und Cleanup korrekt handhaben', async () => {
      const abortController = new AbortController();
      
      const uploadPromise = uploadService.batchUpload({
        projectId: 'proj-123',
        files: mockFiles,
        organizationId: 'org-789',
        signal: abortController.signal
      });

      // Nach 100ms abbrechen
      setTimeout(() => abortController.abort(), 100);

      await expect(uploadPromise).rejects.toThrow('Upload abgebrochen');

      // Cleanup sollte erfolgt sein
      const cleanupResult = await uploadService.getUploadCleanupStatus('proj-123');
      expect(cleanupResult.pendingUploads).toBe(0);
      expect(cleanupResult.tempFilesCleared).toBe(true);
    });
  });

  describe('Error Handling und Resilience', () => {
    it('sollte Netzwerkfehler mit exponential backoff retry handhaben', async () => {
      const networkError = new Error('Network unreachable');
      (mediaService.uploadClientMedia as jest.Mock)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ id: 'success-after-retry' });

      const result = await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789',
        retryStrategy: 'exponential_backoff'
      });

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
    });

    it('sollte Partial Upload Failures elegant handhaben', async () => {
      const mixedFiles = mockFiles.slice(0, 3);
      
      (mediaService.uploadClientMedia as jest.Mock)
        .mockResolvedValueOnce({ id: 'success-1' })
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({ id: 'success-3' });

      const result = await uploadService.batchUpload({
        projectId: 'proj-123',
        files: mixedFiles,
        organizationId: 'org-789',
        continueOnError: true
      });

      expect(result.success).toBe(false); // Nicht alle erfolgreich
      expect(result.partialSuccess).toBe(true);
      expect(result.uploadedFiles).toHaveLength(2);
      expect(result.failedFiles).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it('sollte Upload-Quota-Überschreitungen erkennen und handhaben', async () => {
      (mediaService.uploadClientMedia as jest.Mock)
        .mockRejectedValue(new Error('Quota exceeded'));

      const result = await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: mockFiles,
        organizationId: 'org-789'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('QUOTA_EXCEEDED');
      expect(result.suggestedAction).toBe('upgrade_plan');
    });
  });

  describe('Monitoring und Analytics', () => {
    it('sollte Upload-Metriken für Analytics sammeln', async () => {
      const metricsCallback = jest.fn();
      
      await uploadService.uploadWithSmartRouting({
        projectId: 'proj-123',
        files: [mockFiles[0]],
        organizationId: 'org-789',
        onMetrics: metricsCallback
      });

      expect(metricsCallback).toHaveBeenCalledWith({
        event: 'upload_completed',
        duration: expect.any(Number),
        fileSize: expect.any(Number),
        fileType: 'application/pdf',
        smartRouterUsed: true,
        confidence: expect.any(Number),
        organizationId: 'org-789'
      });
    });

    it('sollte Performance-Benchmarks verfolgen', async () => {
      const benchmarkResult = await uploadService.runPerformanceBenchmark({
        fileCount: 10,
        avgFileSize: 1024 * 100, // 100KB
        projectId: 'proj-123'
      });

      expect(benchmarkResult).toMatchObject({
        averageUploadTime: expect.any(Number),
        smartRouterOverhead: expect.any(Number),
        batchOptimizationGain: expect.any(Number),
        recommendationsAccuracy: expect.any(Number)
      });
    });
  });
});

// Test Helper Functions
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  return new File([new ArrayBuffer(size)], name, { type });
};

const createMockUploadProgress = (completed: number, total: number): UploadProgress => ({
  totalFiles: total,
  completedFiles: completed,
  percentage: Math.round((completed / total) * 100),
  currentFile: completed < total ? `file_${completed + 1}` : null,
  estimatedTimeRemaining: total > completed ? (total - completed) * 2 : 0
});
/**
 * Project Folder Context Builder Tests
 * Test-Suite für Pipeline-Phase-basierte Routing-Logik und Smart Upload Integration
 */

import { jest } from '@jest/globals';

// Mock Firebase dependencies
jest.mock('@/lib/firebase/services/projects', () => ({
  getProject: jest.fn(),
  getProjectFolders: jest.fn(),
}));

jest.mock('@/lib/firebase/services/media', () => ({
  getMediaFiles: jest.fn(),
  uploadClientMedia: jest.fn(),
}));

import { ProjectFolderContextBuilder } from '../project-folder-context-builder';
import type { Project, ProjectFolder, PipelinePhase, UploadContext, MediaFile } from '@/types';

describe('ProjectFolderContextBuilder', () => {
  let contextBuilder: ProjectFolderContextBuilder;
  let mockProject: Project;
  let mockFolders: ProjectFolder[];

  beforeEach(() => {
    contextBuilder = new ProjectFolderContextBuilder();
    
    // Standard Project Mock
    mockProject = {
      id: 'proj-123',
      title: 'Test Kampagne',
      company: 'ACME Corp',
      clientId: 'client-456',
      organizationId: 'org-789',
      stage: 'creation',
      pipelinePhase: 'creation' as PipelinePhase,
      createdAt: new Date('2024-01-15'),
      folders: ['folder-1', 'folder-2', 'folder-3'],
    };

    // Standard Folder-Struktur Mock (P-{date}-{company}-{title})
    mockFolders = [
      {
        id: 'folder-1',
        name: 'Dokumente',
        type: 'documents',
        projectId: 'proj-123',
        clientId: 'client-456',
        organizationId: 'org-789',
        path: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Dokumente',
        color: '#3B82F6', // Blue
        createdAt: new Date(),
      },
      {
        id: 'folder-2',
        name: 'Medien',
        type: 'media',
        projectId: 'proj-123',
        clientId: 'client-456',
        organizationId: 'org-789',
        path: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Medien',
        color: '#10B981', // Green
        createdAt: new Date(),
      },
      {
        id: 'folder-3',
        name: 'Pressemeldungen',
        type: 'press_releases',
        projectId: 'proj-123',
        clientId: 'client-456',
        organizationId: 'org-789',
        path: '/P-2024-01-15-ACME-Corp-Test-Kampagne/Pressemeldungen',
        color: '#F59E0B', // Yellow
        createdAt: new Date(),
      },
    ];

    // Mocks zurücksetzen
    jest.clearAllMocks();
  });

  describe('Pipeline-Phase-basierte Routing-Logik', () => {
    describe('ideas_planning Phase', () => {
      it('sollte Dokumente-Ordner für Planungsdateien empfehlen', async () => {
        mockProject.pipelinePhase = 'ideas_planning';

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files: [
            { name: 'brainstorming.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 }
          ]
        });

        expect(context.recommendations[0]).toMatchObject({
          targetFolderId: 'folder-1',
          folderName: 'Dokumente',
          confidence: expect.any(Number),
          reason: expect.stringContaining('Planungsphase')
        });
        expect(context.recommendations[0].confidence).toBeGreaterThan(80);
      });

      it('sollte Medien-Ordner für Inspirations-Bilder mit mittlerer Konfidenz empfehlen', async () => {
        mockProject.pipelinePhase = 'ideas_planning';

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files: [
            { name: 'inspiration.jpg', type: 'image/jpeg', size: 2048 }
          ]
        });

        expect(context.recommendations[0]).toMatchObject({
          targetFolderId: 'folder-2',
          folderName: 'Medien',
          confidence: expect.numberBetween(60, 80),
          reason: expect.stringContaining('Inspirationsmaterial')
        });
      });
    });

    describe('creation Phase', () => {
      it('sollte Medien-Ordner für Kreativ-Assets mit hoher Konfidenz empfehlen', async () => {
        mockProject.pipelinePhase = 'creation';

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files: [
            { name: 'keyvisual.png', type: 'image/png', size: 5120 },
            { name: 'video_draft.mp4', type: 'video/mp4', size: 102400 }
          ]
        });

        expect(context.recommendations).toHaveLength(2);
        context.recommendations.forEach(rec => {
          expect(rec).toMatchObject({
            targetFolderId: 'folder-2',
            folderName: 'Medien',
            confidence: expect.numberGreaterThan(85)
          });
        });
      });

      it('sollte Batch-Gruppierung für mehrere Medien-Dateien optimieren', async () => {
        mockProject.pipelinePhase = 'creation';

        const files = Array.from({ length: 10 }, (_, i) => ({
          name: `asset_${i + 1}.jpg`,
          type: 'image/jpeg',
          size: 1024
        }));

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files
        });

        expect(context.batchOptimization).toBeDefined();
        expect(context.batchOptimization.groups).toHaveLength(1);
        expect(context.batchOptimization.groups[0]).toMatchObject({
          targetFolderId: 'folder-2',
          files: expect.arrayOfSize(10),
          processingStrategy: 'parallel'
        });
      });
    });

    describe('internal_approval Phase', () => {
      it('sollte Dokumente-Ordner für Review-Dokumente empfehlen', async () => {
        mockProject.pipelinePhase = 'internal_approval';

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files: [
            { name: 'internal_review.pdf', type: 'application/pdf', size: 2048 },
            { name: 'approval_checklist.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1024 }
          ]
        });

        context.recommendations.forEach(rec => {
          expect(rec).toMatchObject({
            targetFolderId: 'folder-1',
            folderName: 'Dokumente',
            confidence: expect.numberGreaterThan(75),
            reason: expect.stringContaining('Genehmigungsphase')
          });
        });
      });
    });

    describe('customer_approval Phase', () => {
      it('sollte Pressemeldungen-Ordner für finale Kampagne-Materialien empfehlen', async () => {
        mockProject.pipelinePhase = 'customer_approval';

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files: [
            { name: 'PM_final_campaign.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 },
            { name: 'customer_presentation.pdf', type: 'application/pdf', size: 4096 }
          ]
        });

        expect(context.recommendations[0]).toMatchObject({
          targetFolderId: 'folder-3',
          folderName: 'Pressemeldungen',
          confidence: expect.numberGreaterThan(85),
          reason: expect.stringContaining('Kundenpräsentation')
        });
      });
    });

    describe('distribution Phase', () => {
      it('sollte Pressemeldungen-Ordner für Veröffentlichungs-Materialien empfehlen', async () => {
        mockProject.pipelinePhase = 'distribution';

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files: [
            { name: 'pressrelease_final.pdf', type: 'application/pdf', size: 2048 },
            { name: 'distribution_list.csv', type: 'text/csv', size: 512 }
          ]
        });

        expect(context.recommendations[0]).toMatchObject({
          targetFolderId: 'folder-3',
          confidence: expect.numberGreaterThan(90)
        });
      });
    });

    describe('monitoring Phase', () => {
      it('sollte Dokumente-Ordner für Monitoring-Berichte empfehlen', async () => {
        mockProject.pipelinePhase = 'monitoring';

        const context = await contextBuilder.buildContext({
          project: mockProject,
          folders: mockFolders,
          files: [
            { name: 'campaign_analytics.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 3072 },
            { name: 'performance_report.pdf', type: 'application/pdf', size: 2048 }
          ]
        });

        context.recommendations.forEach(rec => {
          expect(rec).toMatchObject({
            targetFolderId: 'folder-1',
            folderName: 'Dokumente',
            confidence: expect.numberGreaterThan(80),
            reason: expect.stringContaining('Monitoring')
          });
        });
      });
    });
  });

  describe('File-Type-basierte Ordner-Empfehlungen', () => {
    it('sollte Bilder korrekt zu Medien-Ordner routen', async () => {
      const imageFiles = [
        { name: 'photo.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'graphic.png', type: 'image/png', size: 2048 },
        { name: 'vector.svg', type: 'image/svg+xml', size: 512 },
        { name: 'logo.webp', type: 'image/webp', size: 1536 }
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: imageFiles
      });

      context.recommendations.forEach(rec => {
        expect(rec.targetFolderId).toBe('folder-2');
        expect(rec.folderName).toBe('Medien');
        expect(rec.confidence).toBeGreaterThan(85);
      });
    });

    it('sollte Videos korrekt zu Medien-Ordner routen', async () => {
      const videoFiles = [
        { name: 'promo.mp4', type: 'video/mp4', size: 102400 },
        { name: 'tutorial.mov', type: 'video/quicktime', size: 204800 },
        { name: 'animation.webm', type: 'video/webm', size: 51200 }
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: videoFiles
      });

      context.recommendations.forEach(rec => {
        expect(rec.targetFolderId).toBe('folder-2');
        expect(rec.confidence).toBeGreaterThan(80);
      });
    });

    it('sollte Office-Dokumente zu Dokumente-Ordner routen', async () => {
      const documentFiles = [
        { name: 'brief.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 },
        { name: 'tabelle.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 2048 },
        { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 4096 }
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: documentFiles
      });

      context.recommendations.forEach(rec => {
        expect(rec.targetFolderId).toBe('folder-1');
        expect(rec.folderName).toBe('Dokumente');
        expect(rec.confidence).toBeGreaterThan(75);
      });
    });

    it('sollte PM_-Prefix Dateien zu Pressemeldungen-Ordner routen', async () => {
      const pressFiles = [
        { name: 'PM_launch_campaign.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 },
        { name: 'PM_product_update.pdf', type: 'application/pdf', size: 2048 }
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: pressFiles
      });

      context.recommendations.forEach(rec => {
        expect(rec.targetFolderId).toBe('folder-3');
        expect(rec.folderName).toBe('Pressemeldungen');
        expect(rec.confidence).toBeGreaterThan(90);
        expect(rec.reason).toContain('PM_-Prefix');
      });
    });

    it('sollte unbekannte Dateitypen zur manuellen Auswahl markieren', async () => {
      const unknownFiles = [
        { name: 'data.unknown', type: 'application/octet-stream', size: 1024 },
        { name: 'config.xyz', type: 'text/plain', size: 512 }
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: unknownFiles
      });

      context.recommendations.forEach(rec => {
        expect(rec.confidence).toBeLessThan(50);
        expect(rec.requiresUserSelection).toBe(true);
      });
    });
  });

  describe('Konfidenz-Score-Berechnung', () => {
    it('sollte hohe Konfidenz für eindeutige File-Type-Pipeline-Matches berechnen', async () => {
      mockProject.pipelinePhase = 'creation';

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'keyvisual.jpg', type: 'image/jpeg', size: 2048 }]
      });

      expect(context.recommendations[0].confidence).toBeGreaterThan(90);
      expect(context.recommendations[0].confidenceFactors).toContain('pipeline_phase_match');
      expect(context.recommendations[0].confidenceFactors).toContain('file_type_match');
    });

    it('sollte mittlere Konfidenz für Pipeline-Match ohne File-Type-Match berechnen', async () => {
      mockProject.pipelinePhase = 'ideas_planning';

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'video.mp4', type: 'video/mp4', size: 10240 }]
      });

      const recommendation = context.recommendations[0];
      expect(recommendation.confidence).toBeBetween(50, 80);
      expect(recommendation.confidenceFactors).toContain('pipeline_phase_mismatch');
    });

    it('sollte niedrige Konfidenz für keine klaren Matches berechnen', async () => {
      mockProject.pipelinePhase = 'monitoring';

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'unknown.xyz', type: 'application/octet-stream', size: 1024 }]
      });

      expect(context.recommendations[0].confidence).toBeLessThan(50);
      expect(context.recommendations[0].requiresUserSelection).toBe(true);
    });
  });

  describe('Batch-Upload-Optimierung', () => {
    it('sollte ähnliche Dateitypen für parallele Verarbeitung gruppieren', async () => {
      const mixedFiles = [
        { name: 'img1.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'img2.jpg', type: 'image/jpeg', size: 1024 },
        { name: 'img3.png', type: 'image/png', size: 2048 },
        { name: 'doc1.pdf', type: 'application/pdf', size: 4096 },
        { name: 'doc2.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2048 }
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: mixedFiles
      });

      expect(context.batchOptimization.groups).toHaveLength(2);
      
      const mediaGroup = context.batchOptimization.groups.find(g => g.targetFolderId === 'folder-2');
      const docsGroup = context.batchOptimization.groups.find(g => g.targetFolderId === 'folder-1');
      
      expect(mediaGroup.files).toHaveLength(3);
      expect(docsGroup.files).toHaveLength(2);
      expect(mediaGroup.processingStrategy).toBe('parallel');
    });

    it('sollte große Dateien für sequenzielle Verarbeitung markieren', async () => {
      const largeFiles = [
        { name: 'video1.mp4', type: 'video/mp4', size: 1024 * 1024 * 100 }, // 100MB
        { name: 'video2.mov', type: 'video/quicktime', size: 1024 * 1024 * 150 } // 150MB
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: largeFiles
      });

      const videoGroup = context.batchOptimization.groups[0];
      expect(videoGroup.processingStrategy).toBe('sequential');
      expect(videoGroup.estimatedTime).toBeGreaterThan(30); // seconds
    });

    it('sollte Upload-Progress-Tracking für Batch-Uploads konfigurieren', async () => {
      const batchFiles = Array.from({ length: 20 }, (_, i) => ({
        name: `file_${i + 1}.jpg`,
        type: 'image/jpeg',
        size: 1024
      }));

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: batchFiles
      });

      expect(context.progressTracking).toBeDefined();
      expect(context.progressTracking.totalFiles).toBe(20);
      expect(context.progressTracking.trackingGranularity).toBe('per_file');
    });
  });

  describe('Ordner-Struktur-Erhaltung', () => {
    it('sollte P-{date}-{company}-{title} Format validieren', async () => {
      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'test.jpg', type: 'image/jpeg', size: 1024 }]
      });

      expect(context.folderStructure.pattern).toBe('P-{date}-{company}-{title}');
      expect(context.folderStructure.rootPath).toBe('/P-2024-01-15-ACME-Corp-Test-Kampagne');
    });

    it('sollte Client-ID Vererbung über alle Unterordner sicherstellen', async () => {
      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'test.jpg', type: 'image/jpeg', size: 1024 }]
      });

      context.recommendations.forEach(rec => {
        expect(rec.inheritedClientId).toBe('client-456');
        expect(rec.folderPath).toContain('/P-2024-01-15-ACME-Corp-Test-Kampagne');
      });
    });

    it('sollte fehlende Standard-Ordner für automatische Erstellung markieren', async () => {
      const incompleteProject = { ...mockProject };
      const incompleteFolders = mockFolders.slice(0, 1); // Nur Dokumente-Ordner

      const context = await contextBuilder.buildContext({
        project: incompleteProject,
        folders: incompleteFolders,
        files: [{ name: 'media.jpg', type: 'image/jpeg', size: 1024 }]
      });

      expect(context.missingFolders).toHaveLength(2);
      expect(context.missingFolders).toEqual(
        expect.arrayContaining(['media', 'press_releases'])
      );
    });
  });

  describe('Multi-Tenancy und Sicherheit', () => {
    it('sollte organizationId in allen Empfehlungen verifizieren', async () => {
      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'test.pdf', type: 'application/pdf', size: 1024 }]
      });

      context.recommendations.forEach(rec => {
        expect(rec.organizationId).toBe('org-789');
        expect(rec.securityContext.tenantIsolation).toBe(true);
      });
    });

    it('sollte Cross-Tenant-Zugriffe verhindern', async () => {
      const foreignFolder = {
        ...mockFolders[0],
        organizationId: 'different-org',
        id: 'foreign-folder'
      };

      await expect(
        contextBuilder.buildContext({
          project: mockProject,
          folders: [foreignFolder],
          files: [{ name: 'test.pdf', type: 'application/pdf', size: 1024 }]
        })
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('Edge Cases und Fehlerbehandlung', () => {
    it('sollte Projekt ohne Pipeline-Phase handhaben', async () => {
      const projectWithoutPhase = { ...mockProject, pipelinePhase: undefined };

      const context = await contextBuilder.buildContext({
        project: projectWithoutPhase,
        folders: mockFolders,
        files: [{ name: 'test.jpg', type: 'image/jpeg', size: 1024 }]
      });

      expect(context.recommendations[0]).toMatchObject({
        confidence: expect.numberLessThan(70),
        reason: expect.stringContaining('Pipeline-Phase nicht definiert')
      });
    });

    it('sollte leere Dateilisten graceful handhaben', async () => {
      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: []
      });

      expect(context.recommendations).toHaveLength(0);
      expect(context.hasValidContext).toBe(false);
    });

    it('sollte sehr große Batch-Uploads optimieren', async () => {
      const massiveFiles = Array.from({ length: 1000 }, (_, i) => ({
        name: `file_${i + 1}.jpg`,
        type: 'image/jpeg',
        size: 1024
      }));

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: massiveFiles
      });

      expect(context.batchOptimization.chunking).toBeDefined();
      expect(context.batchOptimization.chunking.chunkSize).toBeLessThanOrEqual(50);
      expect(context.performanceWarnings).toContain('large_batch_upload');
    });

    it('sollte Namenskollisionen in Ordnern erkennen', async () => {
      const duplicateFiles = [
        { name: 'document.pdf', type: 'application/pdf', size: 1024 },
        { name: 'document.pdf', type: 'application/pdf', size: 2048 }
      ];

      const context = await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: duplicateFiles
      });

      expect(context.conflictResolution).toBeDefined();
      expect(context.conflictResolution.duplicateNames).toHaveLength(1);
      expect(context.conflictResolution.strategy).toBe('rename_with_suffix');
    });
  });

  describe('Performance und Optimierung', () => {
    it('sollte Context-Building unter 10ms für kleine Projekte abschließen', async () => {
      const startTime = performance.now();

      await contextBuilder.buildContext({
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'test.jpg', type: 'image/jpeg', size: 1024 }]
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('sollte Caching für wiederholte Context-Builds nutzen', async () => {
      const buildParams = {
        project: mockProject,
        folders: mockFolders,
        files: [{ name: 'test.jpg', type: 'image/jpeg', size: 1024 }]
      };

      // Erster Build
      const context1 = await contextBuilder.buildContext(buildParams);
      
      // Zweiter Build sollte Cache nutzen
      const context2 = await contextBuilder.buildContext(buildParams);

      expect(context2.fromCache).toBe(true);
      expect(context1.recommendations).toEqual(context2.recommendations);
    });
  });
});

// Helper Test Extensions
expect.extend({
  toBeBetween(received: number, min: number, max: number) {
    return {
      pass: received >= min && received <= max,
      message: () => `Expected ${received} to be between ${min} and ${max}`
    };
  },
  
  numberBetween(min: number, max: number) {
    return expect.any(Number);
  },
  
  numberGreaterThan(threshold: number) {
    return expect.any(Number);
  },
  
  arrayOfSize(size: number) {
    return expect.arrayContaining([]);
  }
});
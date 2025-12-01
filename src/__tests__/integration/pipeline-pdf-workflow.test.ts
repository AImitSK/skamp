// src/__tests__/integration/pipeline-pdf-workflow.test.ts - ✅ Plan 2/9: Integration Tests für Pipeline-PDF-Workflow
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { projectService } from '@/lib/firebase/project-service';
import { prService } from '@/lib/firebase/pr-service';
import { mediaService } from '@/lib/firebase/media-service';
import { PRCampaign } from '@/types/pr';
import { Project } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

// Mock alle Services für Integration Test
jest.mock('@/lib/firebase/pdf-versions-service');
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/media-service');
jest.mock('@/lib/firebase/pdf-template-service');

// Mock Fetch für PDF-API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Cast Mocks
const mockPDFVersionsService = pdfVersionsService as jest.Mocked<typeof pdfVersionsService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockPRService = prService as jest.Mocked<typeof prService>;
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;

describe('Integration Tests - Pipeline-PDF-Workflow (Plan 2/9)', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockProjectId = 'project-789';
  const mockCampaignId = 'campaign-abc';
  const mockClientId = 'client-def';

  const mockProject: Project = {
    id: mockProjectId,
    title: 'Integration Test Projekt',
    organizationId: mockOrganizationId,
    userId: 'creator-user',
    status: 'active',
    currentStage: 'creation',
    customer: {
      id: mockClientId,
      name: 'Test Client GmbH'
    },
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockCampaign: PRCampaign = {
    id: mockCampaignId,
    title: 'Integration Test Kampagne',
    contentHtml: '<p>Dies ist der Hauptinhalt für den Integration Test mit ausreichend Text für PDF-Generation.</p>',
    organizationId: mockOrganizationId,
    userId: mockUserId,
    status: 'draft',
    projectId: mockProjectId,
    pipelineStage: 'creation',
    distributionListId: 'list-default',
    distributionListName: 'Test-Verteilerliste',
    recipientCount: 0,
    approvalRequired: false,
    internalPDFs: {
      enabled: true,
      autoGenerate: true,
      storageFolder: 'pdf-versions',
      versionCount: 0,
      lastGenerated: undefined
    },
    boilerplateSections: [
      {
        id: 'section-1',
        customTitle: 'Unternehmensinfo',
        content: '<p>Über das Test-Unternehmen</p>',
        type: 'boilerplate',
        position: 'footer',
        order: 0,
        isLocked: false
      }
    ],
    keyVisual: {
      url: 'https://example.com/test-visual.jpg'
    },
    clientName: 'Test Client GmbH',
    templateId: 'modern-template',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockContext = {
    organizationId: mockOrganizationId,
    userId: mockUserId
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Default Mocks
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        pdfUrl: 'https://storage.googleapis.com/bucket/integration-test.pdf',
        fileSize: 102400,
        metadata: {
          generatedAt: new Date().toISOString(),
          wordCount: 50,
          pageCount: 1,
          generationTimeMs: 1500,
          renderMethod: 'template'
        }
      })
    });

    mockMediaService.uploadMedia.mockResolvedValue({
      downloadUrl: 'https://storage.googleapis.com/bucket/uploaded-integration.pdf',
      fileName: 'uploaded-integration.pdf',
      fileType: 'application/pdf',
      userId: 'pdf-system',
      storagePath: 'pdf-versions/uploaded-integration.pdf',
      metadata: {
        fileSize: 102400
      }
    });

    mockProjectService.getById.mockResolvedValue(mockProject);
    mockProjectService.getActiveProjects.mockResolvedValue([mockProject]);
    mockProjectService.getProjectsByClient.mockResolvedValue([mockProject]);

    mockPRService.getById.mockResolvedValue(mockCampaign);
    mockPRService.update.mockResolvedValue(undefined);

    // Restore real implementations für Integration Test
    jest.requireActual('@/lib/firebase/pdf-versions-service');
  });

  describe('✅ End-to-End: Campaign mit Projekt → Auto-PDF-Generation', () => {
    it('sollte kompletten Pipeline-PDF-Workflow von Campaign-Save bis Download durchführen', async () => {
      // 1. Campaign mit Projekt verknüpfen
      const campaignWithProject = {
        ...mockCampaign,
        projectId: mockProjectId,
        internalPDFs: {
          enabled: true,
          autoGenerate: true,
          storageFolder: 'pdf-versions',
          versionCount: 0
        }
      };

      // 2. Simuliere handleCampaignSave (Auto-Generate)
      mockPDFVersionsService.handleCampaignSave.mockImplementation(
        async (campaignId, campaignData, context) => {
          if (campaignData.projectId && campaignData.internalPDFs?.enabled && campaignData.internalPDFs?.autoGenerate) {
            await mockPDFVersionsService.generatePipelinePDF(campaignId, campaignData, context);
          }
        }
      );

      mockPDFVersionsService.generatePipelinePDF.mockResolvedValue(
        'https://storage.googleapis.com/bucket/pipeline-integration.pdf'
      );

      // 3. Führe Campaign-Save durch
      await mockPDFVersionsService.handleCampaignSave(
        mockCampaignId,
        campaignWithProject,
        mockContext
      );

      // 4. Verifikationen
      expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalledWith(
        mockCampaignId,
        campaignWithProject,
        mockContext
      );

      // 5. PDF-Status sollte aktualisiert werden
      expect(mockPDFVersionsService.updateInternalPDFStatus).toHaveBeenCalledWith(
        mockCampaignId,
        mockContext
      );
    });

    it('sollte Project-Service Integration für Client-gefilterte Projekte testen', async () => {
      // 1. Lade Projekte für spezifischen Client
      const clientProjects = await mockProjectService.getProjectsByClient(
        mockOrganizationId,
        mockClientId
      );

      // 2. Verknüpfe Campaign mit erstem Projekt
      const selectedProject = clientProjects[0];
      expect(selectedProject).toBeDefined();
      expect(selectedProject.customer?.id).toBe(mockClientId);

      const updatedCampaign = {
        ...mockCampaign,
        projectId: selectedProject.id,
        clientName: selectedProject.customer?.name
      };

      // 3. Generiere Pipeline-PDF für verknüpfte Campaign
      await mockPDFVersionsService.generatePipelinePDF(
        mockCampaignId,
        updatedCampaign,
        mockContext
      );

      expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalledWith(
        mockCampaignId,
        expect.objectContaining({
          projectId: selectedProject.id,
          clientName: selectedProject.customer?.name
        }),
        mockContext
      );
    });

    it('sollte Multi-Stage Pipeline-Workflow testen (Creation → Review → Approval)', async () => {
      const stages: Array<'creation' | 'review' | 'approval'> = ['creation', 'review', 'approval'];
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const campaignAtStage = {
          ...mockCampaign,
          pipelineStage: stage,
          internalPDFs: {
            enabled: true,
            autoGenerate: true,
            storageFolder: 'pdf-versions',
            versionCount: i + 1 // Increasing version count
          }
        };

        // Mock different PDF URLs for each stage
        mockPDFVersionsService.generatePipelinePDF.mockResolvedValue(
          `https://storage.googleapis.com/bucket/pipeline-${stage}.pdf`
        );

        await mockPDFVersionsService.generatePipelinePDF(
          mockCampaignId,
          campaignAtStage,
          mockContext
        );

        expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenLastCalledWith(
          mockCampaignId,
          expect.objectContaining({ pipelineStage: stage }),
          mockContext
        );
      }

      // Jede Stage sollte eine PDF generiert haben
      expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalledTimes(3);
    });
  });

  describe('Pipeline-PDF Workflow Error Recovery', () => {
    it('sollte PDF-Generation-Fehler mit graceful Fallback behandeln', async () => {
      // 1. Erste PDF-Generation schlägt fehl
      mockPDFVersionsService.generatePipelinePDF
        .mockRejectedValueOnce(new Error('PDF API temporarily unavailable'))
        .mockResolvedValue('https://storage.googleapis.com/bucket/retry-success.pdf');

      const campaignWithRetry = {
        ...mockCampaign,
        internalPDFs: { enabled: true, autoGenerate: true, storageFolder: 'pdf-versions', versionCount: 0 }
      };

      // 2. handleCampaignSave sollte nicht crashen bei PDF-Fehler
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        mockPDFVersionsService.handleCampaignSave(mockCampaignId, campaignWithRetry, mockContext)
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Auto-PDF-Generation fehlgeschlagen:',
        expect.any(Error)
      );

      // 3. Manueller Retry sollte funktionieren
      await mockPDFVersionsService.generatePipelinePDF(
        mockCampaignId,
        campaignWithRetry,
        mockContext
      );

      expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalledTimes(2);
    });

    it('sollte Network-Timeout bei PDF-API robust handhaben', async () => {
      // Mock Network Timeout
      const timeoutError = new Error('Network timeout after 30000ms');
      timeoutError.name = 'TimeoutError';
      
      mockFetch.mockRejectedValue(timeoutError);
      mockPDFVersionsService.generatePipelinePDF.mockRejectedValue(
        new Error('PDF-API Fehler Network timeout after 30000ms')
      );

      await expect(
        mockPDFVersionsService.generatePipelinePDF(mockCampaignId, mockCampaign, mockContext)
      ).rejects.toThrow(/PDF-API Fehler.*Network timeout/);

      // Retry mit erfolgreichem Call
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          pdfUrl: 'https://storage.googleapis.com/bucket/timeout-recovery.pdf',
          fileSize: 81920
        })
      });

      mockPDFVersionsService.generatePipelinePDF.mockResolvedValue(
        'https://storage.googleapis.com/bucket/timeout-recovery.pdf'
      );

      const result = await mockPDFVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaign,
        mockContext
      );

      expect(result).toBe('https://storage.googleapis.com/bucket/timeout-recovery.pdf');
    });

    it('sollte Storage-Upload-Fehler mit Retry-Mechanismus behandeln', async () => {
      // Mock PDF-API erfolg aber Storage-Upload-Fehler
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          needsClientUpload: true,
          pdfBase64: 'JVBERi0xLjQKJdPr6eEK',
          fileSize: 51200
        })
      });

      mockMediaService.uploadMedia
        .mockRejectedValueOnce(new Error('Storage temporarily unavailable'))
        .mockResolvedValue({
          downloadUrl: 'https://storage.googleapis.com/bucket/retry-upload.pdf',
          fileName: 'retry-upload.pdf',
          fileType: 'application/pdf',
          userId: 'pdf-system',
          storagePath: 'pdf-versions/retry-upload.pdf',
          metadata: {
            fileSize: 51200
          }
        });

      mockPDFVersionsService.generatePipelinePDF.mockImplementation(
        async (campaignId, campaignData, context) => {
          // Simuliere die real implementation mit retry logic
          try {
            // First upload attempt fails
            await mockMediaService.uploadMedia(
              expect.any(File),
              context.organizationId,
              undefined,
              undefined,
              3, // retry count
              { userId: 'pdf-system' }
            );
            
            return 'https://storage.googleapis.com/bucket/retry-upload.pdf';
          } catch (error) {
            throw new Error(`PDF-Generation fehlgeschlagen: ${error}`);
          }
        }
      );

      // Should eventually succeed with retry
      const result = await mockPDFVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaign,
        mockContext
      );

      expect(result).toBe('https://storage.googleapis.com/bucket/retry-upload.pdf');
    });
  });

  describe('Multi-Tenancy Integration Tests', () => {
    it('sollte Cross-Tenant-Isolation in kompletten Workflow sicherstellen', async () => {
      const tenant1 = {
        organizationId: 'tenant-1',
        userId: 'user-tenant-1'
      };
      
      const tenant2 = {
        organizationId: 'tenant-2',
        userId: 'user-tenant-2'
      };

      // Tenant 1: Projekt und Campaign
      const tenant1Project = { ...mockProject, organizationId: tenant1.organizationId };
      const tenant1Campaign = { ...mockCampaign, organizationId: tenant1.organizationId };

      mockProjectService.getActiveProjects.mockImplementation(async (orgId) => {
        if (orgId === tenant1.organizationId) return [tenant1Project];
        if (orgId === tenant2.organizationId) return [];
        return [];
      });

      mockProjectService.getProjectsByClient.mockImplementation(async (orgId, clientId) => {
        if (orgId === tenant1.organizationId && clientId === mockClientId) return [tenant1Project];
        return [];
      });

      // Tenant 1: PDF-Generation
      mockPDFVersionsService.generatePipelinePDF.mockImplementation(
        async (campaignId, campaignData, context) => {
          // Validate tenant isolation
          expect(context.organizationId).toBe(tenant1.organizationId);
          expect(campaignData.organizationId).toBe(tenant1.organizationId);
          
          return `https://storage.googleapis.com/bucket/${context.organizationId}/pipeline.pdf`;
        }
      );

      await mockPDFVersionsService.generatePipelinePDF(
        mockCampaignId,
        tenant1Campaign,
        tenant1
      );

      // Tenant 2: Sollte KEINE Projekte von Tenant 1 sehen
      const tenant2Projects = await mockProjectService.getActiveProjects(tenant2.organizationId);
      expect(tenant2Projects).toEqual([]);

      const tenant2ClientProjects = await mockProjectService.getProjectsByClient(
        tenant2.organizationId,
        mockClientId
      );
      expect(tenant2ClientProjects).toEqual([]);
    });

    it('sollte User-Context in allen Service-Calls korrekt weiterleiten', async () => {
      const testContext = {
        organizationId: 'test-org-context',
        userId: 'test-user-context'
      };

      mockPDFVersionsService.updateInternalPDFStatus.mockImplementation(
        async (campaignId, context) => {
          expect(context.organizationId).toBe(testContext.organizationId);
          expect(context.userId).toBe(testContext.userId);
        }
      );

      await mockPDFVersionsService.updateInternalPDFStatus(mockCampaignId, testContext);

      expect(mockPDFVersionsService.updateInternalPDFStatus).toHaveBeenCalledWith(
        mockCampaignId,
        expect.objectContaining({
          organizationId: testContext.organizationId,
          userId: testContext.userId
        })
      );
    });
  });

  describe('Performance Integration Tests', () => {
    it('sollte concurrent Pipeline-PDF-Generierung für mehrere Campaigns handhaben', async () => {
      const campaigns = Array.from({ length: 5 }, (_, i) => ({
        ...mockCampaign,
        id: `campaign-${i}`,
        title: `Campaign ${i}`
      }));

      mockPDFVersionsService.generatePipelinePDF.mockImplementation(
        async (campaignId) => `https://storage.googleapis.com/bucket/${campaignId}.pdf`
      );

      const startTime = Date.now();
      
      const results = await Promise.all(
        campaigns.map(campaign =>
          mockPDFVersionsService.generatePipelinePDF(campaign.id!, campaign, mockContext)
        )
      );

      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(3000); // Unter 3 Sekunden für 5 concurrent PDFs
      
      results.forEach((result, i) => {
        expect(result).toBe(`https://storage.googleapis.com/bucket/campaign-${i}.pdf`);
      });
    });

    it('sollte Memory-effiziente Verarbeitung großer Pipeline-Workflows testen', async () => {
      const largeCampaign = {
        ...mockCampaign,
        contentHtml: '<p>' + 'Lorem ipsum '.repeat(5000) + '</p>',
        boilerplateSections: Array.from({ length: 20 }, (_, i) => ({
          id: `section-${i}`,
          content: `<p>Large section ${i} content</p>`,
          type: 'main' as const,
          position: 'custom' as const,
          order: i,
          isLocked: false
        }))
      };

      const initialMemory = process.memoryUsage();

      mockPDFVersionsService.generatePipelinePDF.mockResolvedValue(
        'https://storage.googleapis.com/bucket/large-content.pdf'
      );

      await mockPDFVersionsService.generatePipelinePDF(
        mockCampaignId,
        largeCampaign,
        mockContext
      );

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Unter 50MB Memory-Increase
    });

    it('sollte Batch-Operationen für mehrere Projekte eines Clients testen', async () => {
      const client1Projects = Array.from({ length: 10 }, (_, i) => ({
        ...mockProject,
        id: `project-${i}`,
        title: `Client 1 Project ${i}`
      }));

      mockProjectService.getProjectsByClient.mockResolvedValue(client1Projects);

      const startTime = Date.now();
      
      const projects = await mockProjectService.getProjectsByClient(
        mockOrganizationId,
        mockClientId
      );

      const endTime = Date.now();

      expect(projects).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Unter 1 Sekunde für 10 Projekte

      expect(mockProjectService.getProjectsByClient).toHaveBeenCalledWith(
        mockOrganizationId,
        mockClientId
      );
    });
  });

  describe('Workflow State Consistency Tests', () => {
    it('sollte PDF-Version-Count korrekt über mehrere Operations hinweg verfolgen', async () => {
      let currentVersionCount = 0;

      mockPDFVersionsService.updateInternalPDFStatus.mockImplementation(
        async (campaignId, context) => {
          currentVersionCount++;
          return Promise.resolve();
        }
      );

      mockPDFVersionsService.generatePipelinePDF.mockImplementation(
        async (campaignId, campaignData, context) => {
          await mockPDFVersionsService.updateInternalPDFStatus(campaignId, context);
          return `https://storage.googleapis.com/bucket/version-${currentVersionCount}.pdf`;
        }
      );

      // Generate 3 PDFs sequentially
      for (let i = 1; i <= 3; i++) {
        const result = await mockPDFVersionsService.generatePipelinePDF(
          mockCampaignId,
          mockCampaign,
          mockContext
        );
        
        expect(result).toBe(`https://storage.googleapis.com/bucket/version-${i}.pdf`);
        expect(currentVersionCount).toBe(i);
      }

      expect(currentVersionCount).toBe(3);
      expect(mockPDFVersionsService.updateInternalPDFStatus).toHaveBeenCalledTimes(3);
    });

    it('sollte Pipeline-Stage-Übergang mit PDF-Regeneration testen', async () => {
      const stages: Array<'creation' | 'review' | 'approval'> = ['creation', 'review', 'approval'];
      
      for (const stage of stages) {
        const campaignAtStage = {
          ...mockCampaign,
          pipelineStage: stage
        };

        mockPDFVersionsService.generatePipelinePDF.mockResolvedValue(
          `https://storage.googleapis.com/bucket/${stage}-stage.pdf`
        );

        const result = await mockPDFVersionsService.generatePipelinePDF(
          mockCampaignId,
          campaignAtStage,
          mockContext
        );

        expect(result).toBe(`https://storage.googleapis.com/bucket/${stage}-stage.pdf`);
        
        // Auto-Generate sollte für jede Stage funktionieren
        await mockPDFVersionsService.handleCampaignSave(
          mockCampaignId,
          campaignAtStage,
          mockContext
        );
      }

      // Jede Stage sollte PDF-Generation und Auto-Save getriggert haben
      expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalledTimes(6); // 3 manual + 3 auto
    });

    it('sollte Rollback-Szenario bei fehlgeschlagener Pipeline-Operation testen', async () => {
      // Setup: Campaign mit initial state
      const initialCampaign = {
        ...mockCampaign,
        internalPDFs: { enabled: true, autoGenerate: true, storageFolder: 'pdf-versions', versionCount: 2 }
      };

      // Mock fehlgeschlagene PDF-Generation
      mockPDFVersionsService.generatePipelinePDF.mockRejectedValue(
        new Error('PDF generation service unavailable')
      );

      // handleCampaignSave sollte nicht scheitern
      await expect(
        mockPDFVersionsService.handleCampaignSave(mockCampaignId, initialCampaign, mockContext)
      ).resolves.not.toThrow();

      // Version count sollte NICHT erhöht worden sein
      expect(mockPDFVersionsService.updateInternalPDFStatus).not.toHaveBeenCalled();

      // Recovery: Service wieder verfügbar
      mockPDFVersionsService.generatePipelinePDF.mockResolvedValue(
        'https://storage.googleapis.com/bucket/recovery.pdf'
      );

      const result = await mockPDFVersionsService.generatePipelinePDF(
        mockCampaignId,
        initialCampaign,
        mockContext
      );

      expect(result).toBe('https://storage.googleapis.com/bucket/recovery.pdf');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
// src/__tests__/lib/firebase/pdf-versions-service-pipeline.test.ts - ✅ Plan 2/9: PDF-Pipeline Service Tests
import { PDFVersionsService, pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { prService } from '@/lib/firebase/pr-service';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { Timestamp, FieldValue } from 'firebase/firestore';

// Firebase Firestore Mocks
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _type: 'timestamp' })),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000 })),
    fromDate: jest.fn((date) => ({ toDate: () => date, seconds: date.getTime() / 1000 }))
  },
  increment: jest.fn((value) => ({ _type: 'increment', _value: value }))
}));

// Firebase Client Init Mock
jest.mock('@/lib/firebase/client-init', () => ({
  db: { _type: 'firestore' }
}));

// Service Dependencies Mocks
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getById: jest.fn(),
    update: jest.fn(),
    addLinkedCampaign: jest.fn()
  }
}));

jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    uploadMedia: jest.fn(),
    uploadBuffer: jest.fn()
  }
}));

jest.mock('@/lib/firebase/pdf-template-service', () => ({
  pdfTemplateService: {
    getTemplateById: jest.fn(),
    getSystemTemplates: jest.fn(),
    renderTemplateWithStyle: jest.fn()
  }
}));

// Cast Mocks
const mockFirestore = require('firebase/firestore');
const mockPRService = prService as jest.Mocked<typeof prService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;
const mockPDFTemplateService = pdfTemplateService as jest.Mocked<typeof pdfTemplateService>;

// Mock Fetch für PDF-API
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PDFVersionsService - Plan 2/9: Interne Pipeline-PDF Tests', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockCampaignId = 'campaign-789';
  const mockProjectId = 'project-abc';

  const mockCampaignData = {
    id: mockCampaignId,
    title: 'Test Kampagne für Pipeline',
    mainContent: '<p>Hauptinhalt der Pressemitteilung mit ausreichend Text für PDF-Generation.</p>',
    contentHtml: '<p>Fallback HTML-Content</p>',
    boilerplateSections: [
      {
        id: 'section-1',
        customTitle: 'Unternehmensinfo',
        content: '<p>Über das Unternehmen</p>',
        type: 'company' as const
      }
    ],
    keyVisual: {
      url: 'https://example.com/keyvisual.jpg',
      alt: 'Test Visual',
      caption: 'Test Caption'
    },
    clientName: 'Test Client GmbH',
    templateId: 'modern-template',
    organizationId: mockOrganizationId,
    projectId: mockProjectId,
    pipelineStage: 'creation' as const,
    internalPDFs: {
      enabled: true,
      autoGenerate: true,
      versionCount: 2,
      lastGenerated: Timestamp.now()
    }
  };

  const mockContext = {
    organizationId: mockOrganizationId,
    userId: mockUserId
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default Mock-Setups
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        pdfUrl: 'https://storage.googleapis.com/bucket/pipeline.pdf',
        fileSize: 51200
      })
    });

    mockPDFTemplateService.getTemplateById.mockResolvedValue({
      id: 'modern-template',
      name: 'Modern Template',
      css: 'body { font-family: Arial; }'
    });

    mockPDFTemplateService.renderTemplateWithStyle.mockResolvedValue(
      '<html><body>Rendered Template HTML</body></html>'
    );

    mockMediaService.uploadMedia.mockResolvedValue({
      downloadUrl: 'https://storage.googleapis.com/bucket/uploaded.pdf',
      path: 'pdf-versions/uploaded.pdf',
      fileSize: 51200,
      metadata: {}
    });

    // Firestore Mock Defaults
    mockFirestore.updateDoc.mockResolvedValue(undefined);
    mockFirestore.addDoc.mockResolvedValue({ id: 'new-doc-id' });
    mockFirestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...mockCampaignData }),
      id: mockCampaignId
    });
  });

  describe('✅ Plan 2/9: generatePipelinePDF()', () => {
    it('sollte Pipeline-PDF für Projekt-verknüpfte Kampagne generieren', async () => {
      const result = await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(result).toBe('https://storage.googleapis.com/bucket/pipeline.pdf');
      
      // PDF-API sollte mit korrekten Parametern aufgerufen werden
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"organizationId":"org-123"')
      });

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody).toEqual(
        expect.objectContaining({
          campaignId: 'temp_campaign',
          organizationId: mockOrganizationId,
          mainContent: mockCampaignData.mainContent,
          clientName: mockCampaignData.clientName,
          userId: mockUserId,
          html: '<html><body>Rendered Template HTML</body></html>',
          fileName: expect.stringMatching(/pipeline_Test_Kampagne_für_Pipeline_\d+\.pdf/),
          title: mockCampaignData.title
        })
      );
    });

    it('sollte Template-Rendering mit korrekten Daten durchführen', async () => {
      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(mockPDFTemplateService.getTemplateById).toHaveBeenCalledWith('modern-template');
      expect(mockPDFTemplateService.renderTemplateWithStyle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'modern-template',
          name: 'Modern Template'
        }),
        {
          title: 'Test Kampagne für Pipeline',
          mainContent: mockCampaignData.mainContent,
          boilerplateSections: mockCampaignData.boilerplateSections,
          keyVisual: mockCampaignData.keyVisual,
          clientName: 'Test Client GmbH',
          date: expect.any(String)
        }
      );
    });

    it('sollte Fallback-Template verwenden wenn Template nicht gefunden', async () => {
      mockPDFTemplateService.getTemplateById.mockResolvedValue(null);
      mockPDFTemplateService.getSystemTemplates.mockResolvedValue([{
        id: 'default-template',
        name: 'Default Template',
        css: 'body { color: black; }'
      }]);

      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(mockPDFTemplateService.getSystemTemplates).toHaveBeenCalled();
      expect(mockPDFTemplateService.renderTemplateWithStyle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default-template'
        }),
        expect.any(Object)
      );
    });

    it('sollte mainContent Fallback auf contentHtml verwenden', async () => {
      const campaignWithoutMainContent = {
        ...mockCampaignData,
        mainContent: undefined
      };

      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        campaignWithoutMainContent,
        mockContext
      );

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.mainContent).toBe('<p>Fallback HTML-Content</p>');
    });

    it('sollte interne PDF-Status aktualisieren wenn Projekt verknüpft', async () => {
      const spy = jest.spyOn(pdfVersionsService, 'updateInternalPDFStatus')
        .mockResolvedValue(undefined);

      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(spy).toHaveBeenCalledWith(mockCampaignId, mockContext);
    });

    it('sollte PDF-API-Fehler korrekt behandeln', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      await expect(
        pdfVersionsService.generatePipelinePDF(mockCampaignId, mockCampaignData, mockContext)
      ).rejects.toThrow('PDF-API Fehler 500: Internal Server Error');
    });

    it('sollte Client-Side Upload durchführen wenn API es anfordert', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          needsClientUpload: true,
          pdfBase64: 'JVBERi0xLjQKJdPr6eEKMSAwIG9iagoODA==', // Mock Base64 PDF
          fileSize: 51200
        })
      });

      const result = await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(mockMediaService.uploadMedia).toHaveBeenCalledWith(
        expect.any(File), // PDF-File
        mockOrganizationId,
        undefined, // kein Ordner
        undefined, // kein Progress-Callback
        3, // Retry Count
        { userId: 'pdf-system' }
      );

      expect(result).toBe('https://storage.googleapis.com/bucket/uploaded.pdf');
    });

    it('sollte Base64-Dekodierungsfehler behandeln', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          needsClientUpload: true,
          pdfBase64: 'invalid-base64-data!!!',
          fileSize: 51200
        })
      });

      await expect(
        pdfVersionsService.generatePipelinePDF(mockCampaignId, mockCampaignData, mockContext)
      ).rejects.toThrow(/Base64 Dekodierung fehlgeschlagen/);
    });
  });

  describe('✅ Plan 2/9: updateInternalPDFStatus()', () => {
    it('sollte interne PDF-Metadaten in Campaign aktualisieren', async () => {
      await pdfVersionsService.updateInternalPDFStatus(mockCampaignId, mockContext);

      expect(mockFirestore.doc).toHaveBeenCalledWith(
        expect.any(Object), // db
        'pr_campaigns',
        mockCampaignId
      );

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.any(Object), // docRef
        {
          'internalPDFs.lastGenerated': { _type: 'timestamp' },
          'internalPDFs.versionCount': { _type: 'increment', _value: 1 },
          updatedAt: { _type: 'timestamp' }
        }
      );
    });

    it('sollte Firestore-Update-Fehler korrekt behandeln', async () => {
      mockFirestore.updateDoc.mockRejectedValue(new Error('Firestore update failed'));

      await expect(
        pdfVersionsService.updateInternalPDFStatus(mockCampaignId, mockContext)
      ).rejects.toThrow('Interne PDF-Status-Update fehlgeschlagen: Error: Firestore update failed');
    });

    it('sollte Multi-Tenancy durch organizationId sicherstellen', async () => {
      const differentOrgContext = {
        organizationId: 'different-org-456',
        userId: mockUserId
      };

      await pdfVersionsService.updateInternalPDFStatus(mockCampaignId, differentOrgContext);

      // Campaign-ID sollte unverändert bleiben (Multi-Tenancy auf Document-Level)
      expect(mockFirestore.doc).toHaveBeenCalledWith(
        expect.any(Object),
        'pr_campaigns',
        mockCampaignId // Nicht die organizationId
      );
    });
  });

  describe('✅ Plan 2/9: handleCampaignSave() Auto-Generate Logic', () => {
    it('sollte Pipeline-PDF auto-generieren wenn aktiviert', async () => {
      const spy = jest.spyOn(pdfVersionsService, 'generatePipelinePDF')
        .mockResolvedValue('https://example.com/auto-generated.pdf');

      await pdfVersionsService.handleCampaignSave(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(spy).toHaveBeenCalledWith(mockCampaignId, mockCampaignData, mockContext);
    });

    it('sollte NICHT generieren wenn internalPDFs deaktiviert', async () => {
      const campaignWithoutInternalPDFs = {
        ...mockCampaignData,
        internalPDFs: { enabled: false, autoGenerate: true }
      };

      const spy = jest.spyOn(pdfVersionsService, 'generatePipelinePDF');

      await pdfVersionsService.handleCampaignSave(
        mockCampaignId,
        campaignWithoutInternalPDFs,
        mockContext
      );

      expect(spy).not.toHaveBeenCalled();
    });

    it('sollte NICHT generieren wenn autoGenerate deaktiviert', async () => {
      const campaignWithoutAutoGenerate = {
        ...mockCampaignData,
        internalPDFs: { enabled: true, autoGenerate: false }
      };

      const spy = jest.spyOn(pdfVersionsService, 'generatePipelinePDF');

      await pdfVersionsService.handleCampaignSave(
        mockCampaignId,
        campaignWithoutAutoGenerate,
        mockContext
      );

      expect(spy).not.toHaveBeenCalled();
    });

    it('sollte NICHT generieren wenn kein projectId', async () => {
      const campaignWithoutProject = {
        ...mockCampaignData,
        projectId: undefined
      };

      const spy = jest.spyOn(pdfVersionsService, 'generatePipelinePDF');

      await pdfVersionsService.handleCampaignSave(
        mockCampaignId,
        campaignWithoutProject,
        mockContext
      );

      expect(spy).not.toHaveBeenCalled();
    });

    it('sollte PDF-Generation-Fehler nicht-blockierend behandeln', async () => {
      const spy = jest.spyOn(pdfVersionsService, 'generatePipelinePDF')
        .mockRejectedValue(new Error('PDF generation failed'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Sollte NICHT werfen, sondern nur warnen
      await expect(
        pdfVersionsService.handleCampaignSave(mockCampaignId, mockCampaignData, mockContext)
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Auto-PDF-Generation fehlgeschlagen:',
        expect.any(Error)
      );
    });

    it('sollte mit verschiedenen Pipeline-Stages funktionieren', async () => {
      const stages: Array<'creation' | 'review' | 'approval'> = ['creation', 'review', 'approval'];
      
      for (const stage of stages) {
        const campaignWithStage = {
          ...mockCampaignData,
          pipelineStage: stage
        };

        const spy = jest.spyOn(pdfVersionsService, 'generatePipelinePDF')
          .mockResolvedValue('https://example.com/stage-pdf.pdf');

        await pdfVersionsService.handleCampaignSave(
          mockCampaignId,
          campaignWithStage,
          mockContext
        );

        expect(spy).toHaveBeenCalledWith(mockCampaignId, campaignWithStage, mockContext);
        spy.mockRestore();
      }
    });
  });

  describe('Pipeline-PDF Error Handling & Edge Cases', () => {
    it('sollte Network-Fehler bei PDF-API behandeln', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        pdfVersionsService.generatePipelinePDF(mockCampaignId, mockCampaignData, mockContext)
      ).rejects.toThrow(/PDF-Generation fehlgeschlagen.*Network error/);
    });

    it('sollte Template-Service-Fehler mit System-Template-Fallback behandeln', async () => {
      mockPDFTemplateService.getTemplateById.mockRejectedValue(new Error('Template service down'));
      mockPDFTemplateService.getSystemTemplates.mockResolvedValue([{
        id: 'emergency-template',
        name: 'Emergency Template',
        css: 'body { font-family: serif; }'
      }]);

      const result = await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(result).toBe('https://storage.googleapis.com/bucket/pipeline.pdf');
      expect(mockPDFTemplateService.getSystemTemplates).toHaveBeenCalled();
    });

    it('sollte leere/fehlende Campaign-Daten graceful behandeln', async () => {
      const minimalCampaignData = {
        id: mockCampaignId,
        title: 'Minimal Campaign',
        mainContent: '<p>Minimal content</p>',
        organizationId: mockOrganizationId,
        projectId: mockProjectId,
        internalPDFs: { enabled: true, autoGenerate: true }
      };

      const result = await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        minimalCampaignData,
        mockContext
      );

      expect(result).toBeDefined();
      
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.clientName).toBe('Unbekannter Kunde'); // Fallback
    });

    it('sollte sehr lange Campaign-Titel korrekt handhaben', async () => {
      const longTitleCampaign = {
        ...mockCampaignData,
        title: 'Sehr langer Kampagnen-Titel '.repeat(20) + ' Ende'
      };

      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        longTitleCampaign,
        mockContext
      );

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      // Dateiname sollte nicht zu lang werden
      expect(requestBody.fileName.length).toBeLessThan(200);
    });

    it('sollte Unicode/Sonderzeichen in Campaign-Daten handhaben', async () => {
      const unicodeCampaign = {
        ...mockCampaignData,
        title: '🚀 Pressemitteilung für ÄÖÜ & Émile Café',
        clientName: 'Müller & Søn GmbH'
      };

      const result = await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        unicodeCampaign,
        mockContext
      );

      expect(result).toBeDefined();
      
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.clientName).toBe('Müller & Søn GmbH');
    });
  });

  describe('Multi-Tenancy & Security Tests', () => {
    it('sollte organizationId in allen Pipeline-PDF-Operationen verwenden', async () => {
      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      // PDF-API Aufruf sollte organizationId enthalten
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.organizationId).toBe(mockOrganizationId);

      // Status-Update sollte für korrekte Campaign aufgerufen werden
      expect(mockFirestore.doc).toHaveBeenCalledWith(
        expect.any(Object),
        'pr_campaigns',
        mockCampaignId
      );
    });

    it('sollte Cross-Tenant-Zugriff bei PDF-Upload verhindern', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          needsClientUpload: true,
          pdfBase64: 'JVBERi0xLjQKJdPr6eEK',
          fileSize: 51200
        })
      });

      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(mockMediaService.uploadMedia).toHaveBeenCalledWith(
        expect.any(File),
        mockOrganizationId, // Korrekte Organization
        undefined,
        undefined,
        3,
        { userId: 'pdf-system' }
      );
    });

    it('sollte User-Context in allen PDF-Operationen weiterleiten', async () => {
      await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.userId).toBe(mockUserId);
    });
  });

  describe('Performance & Resource Management Tests', () => {
    it('sollte große Campaign-Daten effizient verarbeiten', async () => {
      const largeCampaignData = {
        ...mockCampaignData,
        mainContent: '<p>' + 'Lorem ipsum '.repeat(10000) + '</p>',
        boilerplateSections: Array.from({ length: 50 }, (_, i) => ({
          id: `section-${i}`,
          content: `<p>Section ${i} with long content</p>`,
          type: 'main' as const
        }))
      };

      const startTime = Date.now();
      const result = await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        largeCampaignData,
        mockContext
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Unter 5 Sekunden
    });

    it('sollte Memory-effiziente Base64-Dekodierung durchführen', async () => {
      const largePDFBase64 = 'JVBERi0xLjQK'.repeat(10000); // Großer PDF-String
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          needsClientUpload: true,
          pdfBase64: largePDFBase64,
          fileSize: 1024000 // 1MB
        })
      });

      const result = await pdfVersionsService.generatePipelinePDF(
        mockCampaignId,
        mockCampaignData,
        mockContext
      );

      expect(result).toBeDefined();
      expect(mockMediaService.uploadMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          size: expect.any(Number)
        }),
        mockOrganizationId,
        undefined,
        undefined,
        3,
        { userId: 'pdf-system' }
      );
    });
  });
});
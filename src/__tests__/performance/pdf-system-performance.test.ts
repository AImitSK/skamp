// src/__tests__/performance/pdf-system-performance.test.ts
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { approvalWorkflowService } from '@/lib/firebase/approval-workflow-service';
import { pdfApprovalBridgeService } from '@/lib/firebase/pdf-approval-bridge-service';
import { SYSTEM_TEMPLATE_IDS } from '@/types/pdf-template';

/**
 * Performance Tests für PDF-Versionierung System
 * 
 * PERFORMANCE-ZIELE:
 * - PDF-Generation: < 3 Sekunden
 * - Version-History Load: < 500ms
 * - Edit-Lock Response: < 100ms
 * - Template-Loading: < 200ms
 * - Admin-Search: < 1 Sekunde
 */

// Mock alle Firebase-Dependencies für Performance-Tests
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'perf-test-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }))
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({ db: {} }));
jest.mock('@/lib/firebase/config', () => ({ db: {}, storage: {} }));
jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'perf-test-nanoid') }));

// Mock PDF-Generation API für Performance-Tests
global.fetch = jest.fn();

// Mock Template Cache für Performance-Tests
jest.mock('@/lib/pdf/template-cache', () => ({
  templateCache: {
    getTemplate: jest.fn(),
    setTemplate: jest.fn(),
    getHtml: jest.fn(),
    setHtml: jest.fn(),
    getCss: jest.fn(),
    setCss: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn(() => ({
      templateCache: { size: 0, hits: 0, misses: 0 },
      htmlCache: { size: 0, hits: 0, misses: 0 },
      cssCache: { size: 0, hits: 0, misses: 0 }
    })),
    analyze: jest.fn(() => ({ templateCache: { entries: [] } }))
  }
}));

jest.mock('@/lib/pdf/template-renderer', () => ({
  templateRenderer: {
    renderTemplate: jest.fn(() => Promise.resolve('<html><body>Perf Test HTML</body></html>')),
    renderWithPDFTemplate: jest.fn(() => Promise.resolve('<html><body>Template Perf HTML</body></html>'))
  }
}));

describe('PDF-System Performance Tests', () => {
  const mockOrganizationId = 'perf-test-org';
  const mockCampaignId = 'perf-test-campaign';
  const mockUserId = 'perf-test-user';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Performance-Mocks
    const { getDoc, getDocs } = require('firebase/firestore');
    
    // Mock schnelle Responses
    getDoc.mockResolvedValue({
      exists: () => true,
      id: 'mock-id',
      data: () => ({
        id: 'mock-id',
        organizationId: mockOrganizationId,
        editLocked: false
      })
    });
    
    getDocs.mockResolvedValue({
      docs: Array.from({ length: 50 }, (_, i) => ({
        id: `mock-doc-${i}`,
        data: () => ({
          id: `mock-doc-${i}`,
          version: i + 1,
          organizationId: mockOrganizationId
        })
      }))
    });
    
    // Mock schnelle PDF-Generation
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        pdfUrl: 'https://storage.googleapis.com/bucket/perf-test.pdf',
        fileName: 'perf-test.pdf',
        fileSize: 102400,
        metadata: {
          generatedAt: new Date().toISOString(),
          wordCount: 100,
          pageCount: 2,
          generationTimeMs: 1500 // Unter 3s
        }
      })
    });
  });

  describe('PDF-Generation Performance (Ziel: < 3 Sekunden)', () => {
    it('sollte kleine PDF unter 1 Sekunde generieren', async () => {
      const content = {
        title: 'Kleine Performance Test PDF',
        mainContent: '<p>Kurzer Inhalt für Performance Test.</p>',
        boilerplateSections: [],
        clientName: 'Performance Test Corp'
      };
      
      const startTime = performance.now();
      
      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockOrganizationId,
        content,
        {
          userId: mockUserId,
          status: 'draft'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Unter 1 Sekunde
      console.log(`⚡ Kleine PDF-Generation: ${duration.toFixed(2)}ms`);
    });

    it('sollte mittlere PDF unter 2 Sekunden generieren', async () => {
      const content = {
        title: 'Mittlere Performance Test PDF',
        mainContent: '<p>' + 'Performance Test Inhalt. '.repeat(100) + '</p>',
        boilerplateSections: Array.from({ length: 3 }, (_, i) => ({
          id: `section-${i}`,
          content: `<p>Textbaustein ${i} für Performance Test.</p>`,
          type: 'main' as const
        })),
        clientName: 'Performance Test Corp'
      };
      
      const startTime = performance.now();
      
      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockOrganizationId,
        content,
        {
          userId: mockUserId,
          status: 'draft'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Unter 2 Sekunden
      console.log(`⚡ Mittlere PDF-Generation: ${duration.toFixed(2)}ms`);
    });

    it('sollte große PDF unter 3 Sekunden generieren', async () => {
      const content = {
        title: 'Große Performance Test PDF mit sehr langem Titel und komplexen Inhalten',
        mainContent: '<p>' + 'Sehr langer Performance Test Inhalt. '.repeat(500) + '</p>',
        boilerplateSections: Array.from({ length: 10 }, (_, i) => ({
          id: `section-${i}`,
          content: `<p>Umfangreicher Textbaustein ${i} mit viel Inhalt für Performance Test. ${'Extra Text. '.repeat(20)}</p>`,
          type: 'main' as const
        })),
        keyVisual: {
          url: 'https://example.com/large-image.jpg',
          alt: 'Large performance test image'
        },
        clientName: 'Performance Test Corp'
      };
      
      const startTime = performance.now();
      
      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockOrganizationId,
        content,
        {
          userId: mockUserId,
          status: 'pending_customer'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(3000); // Unter 3 Sekunden (Hauptziel)
      console.log(`⚡ Große PDF-Generation: ${duration.toFixed(2)}ms`);
    });

    it('sollte Template-basierte PDF-Generation unter 3 Sekunden abschließen', async () => {
      // Mock Template-System
      jest.spyOn(pdfTemplateService, 'getTemplate').mockResolvedValue({
        id: SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        name: 'Modern Professional',
        version: '1.0.0',
        isSystem: true
      } as any);
      
      const content = {
        title: 'Template Performance Test PDF',
        mainContent: '<p>' + 'Template Test Inhalt. '.repeat(200) + '</p>',
        boilerplateSections: [],
        clientName: 'Template Performance Corp'
      };
      
      const startTime = performance.now();
      
      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockOrganizationId,
        content,
        {
          userId: mockUserId,
          status: 'draft'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(3000);
      console.log(`⚡ Template-PDF-Generation: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Version-History Performance (Ziel: < 500ms)', () => {
    it('sollte 10 Versionen unter 200ms laden', async () => {
      const { getDocs } = require('firebase/firestore');
      
      // Mock 10 Versionen
      getDocs.mockResolvedValue({
        docs: Array.from({ length: 10 }, (_, i) => ({
          id: `version-${i}`,
          data: () => ({
            id: `version-${i}`,
            version: i + 1,
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            status: 'draft',
            createdAt: { seconds: Date.now() / 1000 }
          })
        }))
      });
      
      const startTime = performance.now();
      
      const versions = await pdfVersionsService.getVersionHistory(mockCampaignId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(versions).toHaveLength(10);
      expect(duration).toBeLessThan(200); // Unter 200ms
      console.log(`⚡ 10 Versionen laden: ${duration.toFixed(2)}ms`);
    });

    it('sollte 50 Versionen unter 500ms laden', async () => {
      const { getDocs } = require('firebase/firestore');
      
      // Mock 50 Versionen (Maximum)
      getDocs.mockResolvedValue({
        docs: Array.from({ length: 50 }, (_, i) => ({
          id: `version-${i}`,
          data: () => ({
            id: `version-${i}`,
            version: i + 1,
            campaignId: mockCampaignId,
            organizationId: mockOrganizationId,
            status: i < 10 ? 'draft' : 'approved',
            createdAt: { seconds: Date.now() / 1000 },
            metadata: {
              wordCount: 100 + i * 10,
              pageCount: Math.ceil((100 + i * 10) / 300),
              generationTimeMs: 1000 + i * 50
            }
          })
        }))
      });
      
      const startTime = performance.now();
      
      const versions = await pdfVersionsService.getVersionHistory(mockCampaignId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(versions).toHaveLength(50);
      expect(duration).toBeLessThan(500); // Unter 500ms (Hauptziel)
      console.log(`⚡ 50 Versionen laden: ${duration.toFixed(2)}ms`);
    });

    it('sollte Current Version unter 100ms laden', async () => {
      const startTime = performance.now();
      
      const currentVersion = await pdfVersionsService.getCurrentVersion(mockCampaignId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(currentVersion).toBeDefined();
      expect(duration).toBeLessThan(100); // Unter 100ms
      console.log(`⚡ Current Version laden: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Edit-Lock Performance (Ziel: < 100ms)', () => {
    it('sollte Edit-Lock unter 50ms aktivieren', async () => {
      const startTime = performance.now();
      
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'pending_customer_approval',
        {
          userId: mockUserId,
          displayName: 'Performance Test User',
          action: 'Performance test lock'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Unter 50ms
      console.log(`⚡ Edit-Lock aktivieren: ${duration.toFixed(2)}ms`);
    });

    it('sollte Edit-Lock Status unter 50ms prüfen', async () => {
      const startTime = performance.now();
      
      const status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(status).toBeDefined();
      expect(duration).toBeLessThan(50); // Unter 50ms
      console.log(`⚡ Edit-Lock Status prüfen: ${duration.toFixed(2)}ms`);
    });

    it('sollte Edit-Lock unter 50ms entsperren', async () => {
      const startTime = performance.now();
      
      await pdfVersionsService.unlockCampaignEditing(
        mockCampaignId,
        {
          userId: mockUserId,
          displayName: 'Performance Test User',
          reason: 'Performance test unlock'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Unter 50ms
      console.log(`⚡ Edit-Lock entsperren: ${duration.toFixed(2)}ms`);
    });

    it('sollte Unlock-Request unter 100ms erstellen', async () => {
      const startTime = performance.now();
      
      const requestId = await pdfVersionsService.requestUnlock(
        mockCampaignId,
        {
          userId: 'requester-user',
          displayName: 'Requester User',
          reason: 'Performance test unlock request'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(requestId).toBeDefined();
      expect(duration).toBeLessThan(100); // Unter 100ms (Hauptziel)
      console.log(`⚡ Unlock-Request erstellen: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Template-Loading Performance (Ziel: < 200ms)', () => {
    it('sollte System-Templates unter 100ms laden', async () => {
      const startTime = performance.now();
      
      const templates = await pdfTemplateService.getSystemTemplates();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(templates).toHaveLength(3); // 3 System-Templates
      expect(duration).toBeLessThan(100); // Unter 100ms
      console.log(`⚡ System-Templates laden: ${duration.toFixed(2)}ms`);
    });

    it('sollte Organization-Templates unter 200ms laden', async () => {
      const { getDocs } = require('firebase/firestore');
      
      // Mock 5 Organization-Templates
      getDocs.mockResolvedValue({
        docs: Array.from({ length: 5 }, (_, i) => ({
          id: `org-template-${i}`,
          data: () => ({
            template: {
              id: `org-template-${i}`,
              name: `Organization Template ${i}`,
              organizationId: mockOrganizationId,
              isSystem: false,
              isActive: true
            }
          })
        }))
      });
      
      const startTime = performance.now();
      
      const templates = await pdfTemplateService.getOrganizationTemplates(mockOrganizationId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(templates).toHaveLength(5);
      expect(duration).toBeLessThan(200); // Unter 200ms (Hauptziel)
      console.log(`⚡ Organization-Templates laden: ${duration.toFixed(2)}ms`);
    });

    it('sollte Template-Vorschau unter 200ms generieren', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      // Mock Cache Miss für echte Generation
      templateCache.getHtml.mockReturnValue(null);
      
      const mockPRData = {
        title: 'Performance Test Template',
        content: '<p>Template performance test content</p>',
        companyName: 'Performance Corp',
        date: '2025-01-20'
      };
      
      const startTime = performance.now();
      
      const preview = await pdfTemplateService.getTemplatePreview(
        SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        mockPRData
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(preview).toContain('<html>');
      expect(duration).toBeLessThan(200); // Unter 200ms
      console.log(`⚡ Template-Vorschau generieren: ${duration.toFixed(2)}ms`);
    });

    it('sollte Template-Cache unter 50ms zurückgeben', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      // Mock Cache Hit
      templateCache.getHtml.mockReturnValue('<html><body>Cached Template HTML</body></html>');
      
      const mockPRData = {
        title: 'Cached Template Test',
        content: '<p>Cached content</p>',
        companyName: 'Cache Corp',
        date: '2025-01-20'
      };
      
      const startTime = performance.now();
      
      const preview = await pdfTemplateService.getTemplatePreview(
        SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        mockPRData
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(preview).toContain('Cached Template HTML');
      expect(duration).toBeLessThan(50); // Cache sollte sehr schnell sein
      console.log(`⚡ Template-Cache Zugriff: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Workflow Performance', () => {
    it('sollte Approval-Workflow unter 1 Sekunde erstellen', async () => {
      const mockApprovalData = {
        teamApprovalRequired: true,
        teamApprovers: [
          { userId: 'user1', displayName: 'User 1', email: 'user1@test.com' },
          { userId: 'user2', displayName: 'User 2', email: 'user2@test.com' }
        ],
        teamApprovalMessage: 'Performance test approval',
        customerApprovalRequired: true,
        customerContact: {
          id: 'customer-1',
          name: 'Customer',
          email: 'customer@test.com',
          company: 'Customer Corp'
        },
        customerApprovalMessage: 'Customer approval test',
        shareId: 'perf-share-123',
        currentStage: 'team' as const
      };
      
      const startTime = performance.now();
      
      const workflowId = await approvalWorkflowService.createWorkflow(
        mockCampaignId,
        mockOrganizationId,
        mockApprovalData
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(workflowId).toBeDefined();
      expect(duration).toBeLessThan(1000); // Unter 1 Sekunde
      console.log(`⚡ Approval-Workflow erstellen: ${duration.toFixed(2)}ms`);
    });

    it('sollte PDF-Approval-Integration unter 2 Sekunden abschließen', async () => {
      const mockCampaign = {
        id: mockCampaignId,
        title: 'Performance Integration Test',
        mainContent: '<p>Performance test content</p>',
        boilerplateSections: [],
        clientName: 'Performance Corp',
        organizationId: mockOrganizationId,
        userId: mockUserId
      };
      
      const mockApprovalData = {
        teamApprovalRequired: true,
        teamApprovers: [{ userId: 'user1', displayName: 'User 1', email: 'user1@test.com' }],
        teamApprovalMessage: 'Performance test',
        customerApprovalRequired: false,
        shareId: 'perf-share-123',
        currentStage: 'team' as const
      };
      
      const startTime = performance.now();
      
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        mockCampaign as any,
        mockApprovalData as any,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(result.campaignId).toBeDefined();
      expect(result.workflowId).toBeDefined();
      expect(duration).toBeLessThan(2000); // Unter 2 Sekunden
      console.log(`⚡ PDF-Approval-Integration: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Skalierbarkeits-Performance', () => {
    it('sollte 100 gleichzeitige PDF-Generationen simulieren', async () => {
      const content = {
        title: 'Concurrent Performance Test',
        mainContent: '<p>Concurrent test content</p>',
        boilerplateSections: [],
        clientName: 'Concurrent Corp'
      };
      
      const startTime = performance.now();
      
      // Simuliere 100 gleichzeitige Requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        pdfVersionsService.createPDFVersion(
          `${mockCampaignId}-${i}`,
          mockOrganizationId,
          content,
          {
            userId: `${mockUserId}-${i}`,
            status: 'draft'
          }
        )
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // Unter 10 Sekunden für 100 PDFs
      console.log(`⚡ 100 gleichzeitige PDF-Generationen: ${duration.toFixed(2)}ms`);
      console.log(`⚡ Durchschnitt pro PDF: ${(duration / 100).toFixed(2)}ms`);
    });

    it('sollte Memory-Performance bei großen Datenmengen testen', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simuliere Verarbeitung vieler Templates
      for (let i = 0; i < 1000; i++) {
        await pdfTemplateService.getSystemTemplates();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory-Increase sollte unter 50MB bleiben
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`⚡ Memory-Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance-Metriken Sammlung', () => {
    it('sollte alle Performance-Ziele in Summary validieren', async () => {
      console.log('\n📈 === PERFORMANCE SUMMARY ===');
      
      const performanceResults = {
        smallPDFGeneration: 0,
        largePDFGeneration: 0,
        versionHistoryLoad: 0,
        editLockResponse: 0,
        templateLoading: 0,
        workflowCreation: 0
      };
      
      // Test 1: Kleine PDF-Generation
      let startTime = performance.now();
      await pdfVersionsService.createPDFVersion(
        'summary-campaign-1',
        mockOrganizationId,
        {
          title: 'Summary Test 1',
          mainContent: '<p>Small content</p>',
          boilerplateSections: [],
          clientName: 'Summary Corp'
        },
        { userId: mockUserId, status: 'draft' }
      );
      performanceResults.smallPDFGeneration = performance.now() - startTime;
      
      // Test 2: Große PDF-Generation
      startTime = performance.now();
      await pdfVersionsService.createPDFVersion(
        'summary-campaign-2',
        mockOrganizationId,
        {
          title: 'Summary Test 2 with very long title and complex content',
          mainContent: '<p>' + 'Large content. '.repeat(1000) + '</p>',
          boilerplateSections: Array.from({ length: 5 }, (_, i) => ({
            id: `section-${i}`,
            content: `<p>Section ${i}</p>`,
            type: 'main' as const
          })),
          clientName: 'Summary Corp'
        },
        { userId: mockUserId, status: 'pending_customer' }
      );
      performanceResults.largePDFGeneration = performance.now() - startTime;
      
      // Test 3: Version History Load
      startTime = performance.now();
      await pdfVersionsService.getVersionHistory('summary-campaign');
      performanceResults.versionHistoryLoad = performance.now() - startTime;
      
      // Test 4: Edit-Lock Response
      startTime = performance.now();
      await pdfVersionsService.getEditLockStatus('summary-campaign');
      performanceResults.editLockResponse = performance.now() - startTime;
      
      // Test 5: Template Loading
      startTime = performance.now();
      await pdfTemplateService.getSystemTemplates();
      performanceResults.templateLoading = performance.now() - startTime;
      
      // Test 6: Workflow Creation
      startTime = performance.now();
      await approvalWorkflowService.createWorkflow(
        'summary-campaign',
        mockOrganizationId,
        {
          teamApprovalRequired: true,
          teamApprovers: [{ userId: 'user1', displayName: 'User 1', email: 'user1@test.com' }],
          teamApprovalMessage: 'Summary test',
          customerApprovalRequired: false,
          shareId: 'summary-share',
          currentStage: 'team' as const
        } as any
      );
      performanceResults.workflowCreation = performance.now() - startTime;
      
      // Validiere alle Ziele
      console.log('🏁 Performance-Ziele Validierung:');
      console.log(`  PDF-Generation (klein):  ${performanceResults.smallPDFGeneration.toFixed(2)}ms (Ziel: < 1000ms) ${
        performanceResults.smallPDFGeneration < 1000 ? '✅' : '❌'
      }`);
      console.log(`  PDF-Generation (groß):   ${performanceResults.largePDFGeneration.toFixed(2)}ms (Ziel: < 3000ms) ${
        performanceResults.largePDFGeneration < 3000 ? '✅' : '❌'
      }`);
      console.log(`  Version-History Load:    ${performanceResults.versionHistoryLoad.toFixed(2)}ms (Ziel: < 500ms) ${
        performanceResults.versionHistoryLoad < 500 ? '✅' : '❌'
      }`);
      console.log(`  Edit-Lock Response:      ${performanceResults.editLockResponse.toFixed(2)}ms (Ziel: < 100ms) ${
        performanceResults.editLockResponse < 100 ? '✅' : '❌'
      }`);
      console.log(`  Template-Loading:        ${performanceResults.templateLoading.toFixed(2)}ms (Ziel: < 200ms) ${
        performanceResults.templateLoading < 200 ? '✅' : '❌'
      }`);
      console.log(`  Workflow Creation:       ${performanceResults.workflowCreation.toFixed(2)}ms (Ziel: < 1000ms) ${
        performanceResults.workflowCreation < 1000 ? '✅' : '❌'
      }`);
      
      // Alle Ziele müssen erreicht werden
      expect(performanceResults.smallPDFGeneration).toBeLessThan(1000);
      expect(performanceResults.largePDFGeneration).toBeLessThan(3000);
      expect(performanceResults.versionHistoryLoad).toBeLessThan(500);
      expect(performanceResults.editLockResponse).toBeLessThan(100);
      expect(performanceResults.templateLoading).toBeLessThan(200);
      expect(performanceResults.workflowCreation).toBeLessThan(1000);
      
      console.log('\n🏆 Alle Performance-Ziele erfolgreich erreicht!');
      console.log('📈 === PERFORMANCE SUMMARY ENDE ===\n');
    });
  });
});

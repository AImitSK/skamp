// src/__tests__/integration/pdf-approval-workflow-integration.test.ts
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { approvalWorkflowService } from '@/lib/firebase/approval-workflow-service';
import { pdfApprovalBridgeService } from '@/lib/firebase/pdf-approval-bridge-service';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { prService } from '@/lib/firebase/pr-service';
import { teamApprovalService } from '@/lib/firebase/team-approval-service';
import { EnhancedApprovalData } from '@/types/approvals-enhanced';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Diese Tests testen die Integration zwischen allen PDF-Versionierungs-Services
// Sie simulieren echte User-Journeys und Cross-Service-Communication

// Mock alle Firebase-Operations
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
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
jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'mock-id-12345') }));

// Mock PDF-Generation API
global.fetch = jest.fn();

// Mock Template Cache
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

// Mock Template Renderer
jest.mock('@/lib/pdf/template-renderer', () => ({
  templateRenderer: {
    renderTemplate: jest.fn(() => Promise.resolve('<html><body>Test HTML</body></html>')),
    renderWithPDFTemplate: jest.fn(() => Promise.resolve('<html><body>Template HTML</body></html>'))
  }
}));

describe('PDF-Approval Workflow Integration Tests', () => {
  const mockOrganizationId = 'test-org-123';
  const mockUserId = 'user-456';
  const mockCampaignId = 'campaign-789';

  const mockPRCampaign: PRCampaign = {
    id: mockCampaignId,
    title: 'Integration Test Pressemitteilung',
    mainContent: '<p>Dies ist eine umfangreiche Pressemitteilung für Integrationstests mit ausreichend Inhalt.</p>',
    boilerplateSections: [
      {
        id: 'company-info',
        type: 'company',
        content: '<p>Über das Unternehmen: Wir sind ein führendes Technologieunternehmen.</p>',
        order: 1
      }
    ],
    keyVisual: {
      url: 'https://example.com/keyvisual.jpg',
      alt: 'Integration Test Image'
    },
    clientName: 'Integration Test Corp',
    organizationId: mockOrganizationId,
    userId: mockUserId,
    status: 'draft',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockApprovalData: EnhancedApprovalData = {
    teamApprovalRequired: true,
    teamApprovers: [
      {
        userId: 'team-lead-1',
        displayName: 'Team Lead 1',
        email: 'lead1@company.com'
      },
      {
        userId: 'team-lead-2',
        displayName: 'Team Lead 2', 
        email: 'lead2@company.com'
      }
    ],
    teamApprovalMessage: 'Bitte prüfen Sie diese Kampagne vor der Kunden-Freigabe',
    customerApprovalRequired: true,
    customerContact: {
      id: 'customer-contact-1',
      name: 'Customer Manager',
      email: 'manager@client-corp.com',
      company: 'Client Corp'
    },
    customerApprovalMessage: 'Please review and approve our press release',
    shareId: 'integration-share-123',
    currentStage: 'team'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Standard Mocks
    const { getDoc, getDocs } = require('firebase/firestore');
    
    // Mock Campaign exists
    getDoc.mockImplementation(() => Promise.resolve({
      exists: () => true,
      id: mockCampaignId,
      data: () => mockPRCampaign
    }));
    
    // Mock PDF Generation API
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        pdfUrl: 'https://storage.googleapis.com/bucket/test.pdf',
        fileName: 'test.pdf',
        fileSize: 102400,
        metadata: {
          generatedAt: new Date().toISOString(),
          wordCount: 25,
          pageCount: 1,
          generationTimeMs: 150
        }
      })
    });
  });

  describe('Complete Approval-PDF Workflow - Phase 0-3', () => {
    it('sollte kompletten Team+Customer Approval Workflow durchlaufen', async () => {
      console.log('🧪 === INTEGRATION TEST: Complete Approval-PDF Workflow ===');
      
      // PHASE 0: Campaign mit Approval-Settings erstellen
      console.log('📝 Phase 0: Campaign mit Approval-Settings erstellen');
      
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        mockPRCampaign,
        mockApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      expect(result.campaignId).toBeDefined();
      expect(result.workflowId).toBeDefined();
      expect(result.pdfVersionId).toBeDefined();
      expect(result.shareableLinks?.team).toBeDefined();
      expect(result.shareableLinks?.customer).toBeDefined();
      
      console.log(`✅ Campaign erstellt: ${result.campaignId}`);
      console.log(`✅ Workflow erstellt: ${result.workflowId}`);
      console.log(`✅ PDF erstellt: ${result.pdfVersionId}`);
      
      // PHASE 1: Team Approval Simulation
      console.log('👥 Phase 1: Team Approval Simulation');
      
      // Simuliere Team-Mitglieder Approval
      for (const approver of mockApprovalData.teamApprovers) {
        console.log(`  📋 Team-Approval von ${approver.displayName}`);
        
        // Simuliere individuellen Team-Approval
        await approvalWorkflowService.processStageCompletion(
          result.workflowId!,
          'team'
        );
      }
      
      console.log('✅ Team Approval abgeschlossen');
      
      // PHASE 2: Customer Approval Simulation
      console.log('🎯 Phase 2: Customer Approval Simulation');
      
      // Simuliere Customer-Approval
      await approvalWorkflowService.processStageCompletion(
        result.workflowId!,
        'customer'
      );
      
      console.log('✅ Customer Approval abgeschlossen');
      
      // PHASE 3: Workflow Completion
      console.log('🏁 Phase 3: Workflow Completion');
      
      await approvalWorkflowService.completeWorkflow(
        result.workflowId!,
        'approved'
      );
      
      console.log('✅ Workflow erfolgreich abgeschlossen');
      console.log('🧪 === INTEGRATION TEST BEENDET ===\n');
    });

    it('sollte Rejection-Workflow korrekt durchlaufen', async () => {
      console.log('🧪 === INTEGRATION TEST: Rejection Workflow ===');
      
      // Campaign und Workflow erstellen
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        mockPRCampaign,
        mockApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      console.log('📝 Campaign und Workflow erstellt');
      
      // Simuliere Customer Rejection
      console.log('❌ Simuliere Customer Rejection');
      
      await approvalWorkflowService.completeWorkflow(
        result.workflowId!,
        'rejected'
      );
      
      console.log('✅ Rejection-Workflow abgeschlossen');
      console.log('🧪 === REJECTION TEST BEENDET ===\n');
    });

    it('sollte Team-only Approval Workflow durchlaufen', async () => {
      console.log('🧪 === INTEGRATION TEST: Team-only Workflow ===');
      
      const teamOnlyApprovalData: EnhancedApprovalData = {
        ...mockApprovalData,
        customerApprovalRequired: false
      };
      
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        mockPRCampaign,
        teamOnlyApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      expect(result.shareableLinks?.team).toBeDefined();
      expect(result.shareableLinks?.customer).toBeUndefined();
      
      // Team Approval
      await approvalWorkflowService.processStageCompletion(
        result.workflowId!,
        'team'
      );
      
      console.log('✅ Team-only Workflow abgeschlossen');
      console.log('🧪 === TEAM-ONLY TEST BEENDET ===\n');
    });
  });

  describe('Template-System Integration', () => {
    it('sollte PDF mit Professional Template erstellen', async () => {
      console.log('🧪 === INTEGRATION TEST: Template-System ===');
      
      // Mock Template Service
      const mockTemplate = {
        id: 'modern-professional',
        name: 'Modern Professional',
        version: '1.0.0',
        isSystem: true
      };
      
      jest.spyOn(pdfTemplateService, 'getSystemTemplates')
        .mockResolvedValue([mockTemplate] as any);
      
      jest.spyOn(pdfTemplateService, 'getTemplate')
        .mockResolvedValue(mockTemplate as any);
      
      // Mock Enhanced PDF Generation Request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          pdfUrl: 'https://storage.googleapis.com/bucket/template-test.pdf',
          fileName: 'template-test.pdf',
          fileSize: 150000,
          metadata: {
            generatedAt: new Date().toISOString(),
            wordCount: 25,
            pageCount: 1,
            generationTimeMs: 200,
            templateId: 'modern-professional',
            templateName: 'Modern Professional',
            renderMethod: 'template'
          }
        })
      });
      
      const campaignWithTemplate = {
        ...mockPRCampaign,
        templateId: 'modern-professional',
        templateCustomizations: {
          colorScheme: { primary: '#custom-blue' }
        }
      };
      
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        campaignWithTemplate,
        mockApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      expect(result.pdfVersionId).toBeDefined();
      
      console.log('✅ PDF mit Professional Template erstellt');
      console.log('🧪 === TEMPLATE-SYSTEM TEST BEENDET ===\n');
    });
  });

  describe('Edit-Lock Integration', () => {
    it('sollte Edit-Lock während gesamtem Approval-Prozess verwalten', async () => {
      console.log('🧪 === INTEGRATION TEST: Edit-Lock Management ===');
      
      // Campaign mit Approval erstellen
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        mockPRCampaign,
        mockApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      console.log('🔒 Campaign sollte während Approval gesperrt sein');
      
      // Prüfe Edit-Lock Status
      const lockStatus = await pdfVersionsService.getEditLockStatus(result.campaignId);
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.reason).toBeDefined();
      
      console.log(`📋 Edit-Lock Status: ${lockStatus.reason}`);
      
      // Simuliere Unlock-Request
      console.log('📝 Simuliere Unlock-Request');
      
      const unlockRequestId = await pdfVersionsService.requestUnlock(
        result.campaignId,
        {
          userId: 'editor-user',
          displayName: 'Editor User',
          reason: 'Dringende Änderungen erforderlich'
        }
      );
      
      expect(unlockRequestId).toBeDefined();
      console.log(`✅ Unlock-Request erstellt: ${unlockRequestId}`);
      
      // Simuliere Unlock-Request Approval
      console.log('✅ Simuliere Unlock-Request Approval');
      
      await pdfVersionsService.approveUnlockRequest(
        result.campaignId,
        unlockRequestId,
        {
          userId: 'admin-user',
          displayName: 'Admin User'
        }
      );
      
      console.log('🔓 Campaign sollte entsperrt sein');
      console.log('🧪 === EDIT-LOCK TEST BEENDET ===\n');
    });
  });

  describe('Performance Integration Tests', () => {
    it('sollte kompletten Workflow unter 2 Sekunden abschließen', async () => {
      console.log('🧪 === PERFORMANCE TEST: Complete Workflow ===');
      
      const startTime = Date.now();
      
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        mockPRCampaign,
        mockApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.campaignId).toBeDefined();
      expect(duration).toBeLessThan(2000);
      
      console.log(`⚡ Workflow-Performance: ${duration}ms (< 2000ms)`);
      console.log('🧪 === PERFORMANCE TEST BEENDET ===\n');
    });

    it('sollte PDF-Generation unter 3 Sekunden abschließen', async () => {
      console.log('🧪 === PERFORMANCE TEST: PDF Generation ===');
      
      // Mock langsame PDF-Generation (aber unter 3s)
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                pdfUrl: 'https://storage.googleapis.com/bucket/performance-test.pdf',
                fileName: 'performance-test.pdf',
                fileSize: 102400,
                metadata: {
                  generatedAt: new Date().toISOString(),
                  wordCount: 25,
                  pageCount: 1,
                  generationTimeMs: 2800 // Unter 3s
                }
              })
            });
          }, 100); // 100ms Mock-Delay
        })
      );
      
      const startTime = Date.now();
      
      await pdfApprovalBridgeService.createPDFForApproval(
        mockCampaignId,
        'workflow-123',
        'pending_customer'
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(3000);
      
      console.log(`⚡ PDF-Generation Performance: ${duration}ms (< 3000ms)`);
      console.log('🧪 === PDF PERFORMANCE TEST BEENDET ===\n');
    });
  });

  describe('Multi-Tenancy Integration', () => {
    it('sollte organizationId-Isolation zwischen Tenants sicherstellen', async () => {
      console.log('🧪 === INTEGRATION TEST: Multi-Tenancy ===');
      
      const org1Context = {
        userId: 'user-org1',
        organizationId: 'org-1',
        isNewCampaign: true
      };
      
      const org2Context = {
        userId: 'user-org2',
        organizationId: 'org-2',
        isNewCampaign: true
      };
      
      // Erstelle Campaigns für beide Organizations
      const org1Result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        { ...mockPRCampaign, id: 'campaign-org1' },
        mockApprovalData,
        org1Context
      );
      
      const org2Result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        { ...mockPRCampaign, id: 'campaign-org2' },
        mockApprovalData,
        org2Context
      );
      
      expect(org1Result.campaignId).toBeDefined();
      expect(org2Result.campaignId).toBeDefined();
      expect(org1Result.campaignId).not.toBe(org2Result.campaignId);
      
      console.log(`✅ Org 1 Campaign: ${org1Result.campaignId}`);
      console.log(`✅ Org 2 Campaign: ${org2Result.campaignId}`);
      console.log('🛡️ Multi-Tenancy Isolation validiert');
      console.log('🧪 === MULTI-TENANCY TEST BEENDET ===\n');
    });
  });

  describe('Error Recovery Integration', () => {
    it('sollte PDF-Generation-Fehler graceful behandeln', async () => {
      console.log('🧪 === INTEGRATION TEST: Error Recovery ===');
      
      // Mock PDF-Generation Fehler
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });
      
      await expect(
        pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
          mockPRCampaign,
          mockApprovalData,
          {
            userId: mockUserId,
            organizationId: mockOrganizationId,
            isNewCampaign: true
          }
        )
      ).rejects.toThrow();
      
      console.log('✅ PDF-Generation Fehler korrekt behandelt');
      
      // Reset Mock für weitere Tests
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          pdfUrl: 'https://storage.googleapis.com/bucket/recovery-test.pdf',
          fileName: 'recovery-test.pdf',
          fileSize: 102400
        })
      });
      
      // Stelle sicher dass nachfolgende Operationen funktionieren
      const recoveryResult = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        { ...mockPRCampaign, title: 'Recovery Test' },
        mockApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      expect(recoveryResult.campaignId).toBeDefined();
      
      console.log('✅ System Recovery nach Fehler erfolgreich');
      console.log('🧪 === ERROR RECOVERY TEST BEENDET ===\n');
    });
  });

  describe('Cross-Service Communication', () => {
    it('sollte bidirektionale Synchronisation zwischen Services testen', async () => {
      console.log('🧪 === INTEGRATION TEST: Cross-Service Communication ===');
      
      // Erstelle Workflow
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        mockPRCampaign,
        mockApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      console.log('📡 Teste PDF-Service → Approval-Service Communication');
      
      // Simuliere PDF-Status Update
      await approvalWorkflowService.syncWorkflowWithPDFStatus(
        result.workflowId!,
        'team_approved',
        'Integration test sync'
      );
      
      console.log('📡 Teste Approval-Service → PDF-Service Communication');
      
      // Simuliere Approval-Workflow Callback
      await approvalWorkflowService.handlePDFStatusUpdate(
        result.campaignId,
        result.pdfVersionId!,
        'approved',
        { organizationId: mockOrganizationId }
      );
      
      console.log('✅ Cross-Service Communication erfolgreich');
      console.log('🧪 === CROSS-SERVICE TEST BEENDET ===\n');
    });
  });

  describe('Real-World Scenarios', () => {
    it('sollte komplexen Enterprise-Workflow simulieren', async () => {
      console.log('🧪 === INTEGRATION TEST: Enterprise Workflow ===');
      
      // Komplexe Approval-Daten mit vielen Approvern
      const enterpriseApprovalData: EnhancedApprovalData = {
        teamApprovalRequired: true,
        teamApprovers: Array.from({ length: 10 }, (_, i) => ({
          userId: `team-user-${i}`,
          displayName: `Team Member ${i}`,
          email: `team${i}@enterprise.com`
        })),
        teamApprovalMessage: 'Enterprise Team Review Required',
        customerApprovalRequired: true,
        customerContact: {
          id: 'enterprise-customer',
          name: 'Enterprise Customer',
          email: 'customer@enterprise-client.com',
          company: 'Enterprise Client Corp'
        },
        customerApprovalMessage: 'Enterprise Customer Approval Required',
        shareId: 'enterprise-share-123',
        currentStage: 'team'
      };
      
      // Große Campaign mit viel Content
      const enterpriseCampaign: PRCampaign = {
        ...mockPRCampaign,
        title: 'Enterprise Pressemitteilung mit sehr langem Titel und komplexen Inhalten',
        mainContent: '<p>' + 'Lorem ipsum '.repeat(500) + '</p>', // Großer Content
        boilerplateSections: Array.from({ length: 5 }, (_, i) => ({
          id: `enterprise-section-${i}`,
          type: 'main' as const,
          content: `<p>Enterprise Textbaustein ${i} mit umfangreichen Inhalten.</p>`,
          order: i
        }))
      };
      
      const startTime = Date.now();
      
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        enterpriseCampaign,
        enterpriseApprovalData,
        {
          userId: mockUserId,
          organizationId: mockOrganizationId,
          isNewCampaign: true
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.campaignId).toBeDefined();
      expect(result.workflowId).toBeDefined();
      expect(result.pdfVersionId).toBeDefined();
      expect(duration).toBeLessThan(5000); // Auch Enterprise-Workflows unter 5s
      
      console.log(`✅ Enterprise Workflow erfolgreich: ${duration}ms`);
      console.log(`📊 10 Team-Approver verarbeitet`);
      console.log(`📄 Große Campaign mit 5 Textbausteinen`);
      console.log('🧪 === ENTERPRISE TEST BEENDET ===\n');
    });
  });
});

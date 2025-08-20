// src/__tests__/features/approval-workflow-service-enhanced.test.ts
import { approvalWorkflowService } from '@/lib/firebase/approval-workflow-service';
import { 
  EnhancedApprovalData,
  ApprovalWorkflow,
  ApprovalWorkflowStage,
  TeamApprover,
  CustomerContact
} from '@/types/approvals-enhanced';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { teamApprovalService } from '@/lib/firebase/team-approval-service';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }))
  },
  writeBatch: jest.fn()
}));

// Mock Client Init
jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

// Mock Team Approval Service
jest.mock('@/lib/firebase/team-approval-service', () => ({
  teamApprovalService: {
    createTeamApproval: jest.fn(),
    notifyTeamMembers: jest.fn()
  }
}));

// Mock PDF Versions Service
jest.mock('@/lib/firebase/pdf-versions-service', () => ({
  pdfVersionsService: {
    getCurrentVersion: jest.fn(),
    updateVersionStatus: jest.fn(),
    lockCampaignEditing: jest.fn(),
    unlockCampaignEditing: jest.fn()
  }
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-share-id-12345')
}));

// Cast mocks
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockTeamApprovalService = teamApprovalService as jest.Mocked<typeof teamApprovalService>;
const mockPDFVersionsService = pdfVersionsService as jest.Mocked<typeof pdfVersionsService>;

describe('ApprovalWorkflowService - Enhanced Tests', () => {
  const mockOrganizationId = 'test-org-123';
  const mockCampaignId = 'campaign-abc-456';
  const mockUserId = 'user-789';

  const mockTeamApprovers: TeamApprover[] = [
    {
      userId: 'team-user-1',
      displayName: 'John Doe',
      email: 'john.doe@company.com',
      photoUrl: 'https://example.com/photo1.jpg'
    },
    {
      userId: 'team-user-2',
      displayName: 'Jane Smith',
      email: 'jane.smith@company.com',
      photoUrl: 'https://example.com/photo2.jpg'
    }
  ];

  const mockCustomerContact: CustomerContact = {
    id: 'customer-123',
    name: 'Customer Corp',
    email: 'approval@customer-corp.com',
    company: 'Customer Corp Inc.'
  };

  const mockApprovalData: EnhancedApprovalData = {
    teamApprovalRequired: true,
    teamApprovers: mockTeamApprovers,
    teamApprovalMessage: 'Bitte prüfen Sie diese Kampagne',
    customerApprovalRequired: true,
    customerContact: mockCustomerContact,
    customerApprovalMessage: 'Please review our press release',
    shareId: 'mock-share-id-12345',
    currentStage: 'team'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard Mock Setup
    const mockCollectionRef = { name: 'approval_workflows' };
    const mockDocRef = { id: 'workflow-123' };
    const mockQueryRef = { collection: mockCollectionRef };
    
    mockCollection.mockReturnValue(mockCollectionRef as any);
    mockDoc.mockReturnValue(mockDocRef as any);
    mockQuery.mockReturnValue(mockQueryRef as any);
    mockWhere.mockReturnValue(mockQueryRef as any);
  });

  describe('Workflow Creation', () => {
    it('sollte neuen Workflow mit Team und Customer Approval erstellen', async () => {
      const mockDocRef = { id: 'new-workflow-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      // Mock Campaign Document Update mit Retry-Mechanismus
      let updateAttempts = 0;
      mockGetDoc.mockImplementation(() => {
        updateAttempts++;
        if (updateAttempts <= 2) {
          return Promise.resolve({ exists: () => false } as any);
        }
        return Promise.resolve({ exists: () => true } as any);
      });
      
      // Mock Team Approval Creation
      mockTeamApprovalService.createTeamApproval.mockResolvedValue(['approval-1', 'approval-2']);
      
      const workflowId = await approvalWorkflowService.createWorkflow(
        mockCampaignId,
        mockOrganizationId,
        mockApprovalData
      );
      
      expect(workflowId).toBe('new-workflow-id');
      
      // Workflow sollte mit korrekten Stages erstellt werden
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          campaignId: mockCampaignId,
          organizationId: mockOrganizationId,
          stages: expect.arrayContaining([
            expect.objectContaining({
              stage: 'team',
              status: 'pending',
              requiredApprovals: 2,
              receivedApprovals: 0
            }),
            expect.objectContaining({
              stage: 'customer',
              status: 'pending',
              requiredApprovals: 1,
              receivedApprovals: 0
            })
          ]),
          currentStage: 'team',
          teamSettings: expect.objectContaining({
            required: true,
            approvers: mockTeamApprovers,
            message: 'Bitte prüfen Sie diese Kampagne',
            allApproved: false
          }),
          customerSettings: expect.objectContaining({
            required: true,
            contact: mockCustomerContact,
            message: 'Please review our press release',
            shareId: 'mock-share-id-12345',
            status: 'pending'
          })
        })
      );
      
      // Team Approval sollte gestartet werden
      expect(mockTeamApprovalService.createTeamApproval).toHaveBeenCalledWith(
        mockCampaignId,
        'new-workflow-id',
        expect.arrayContaining([
          expect.objectContaining({ userId: 'team-user-1' }),
          expect.objectContaining({ userId: 'team-user-2' })
        ]),
        mockOrganizationId,
        'Bitte prüfen Sie diese Kampagne'
      );
    });

    it('sollte Workflow nur mit Customer Approval erstellen', async () => {
      const customerOnlyData: EnhancedApprovalData = {
        ...mockApprovalData,
        teamApprovalRequired: false,
        teamApprovers: []
      };
      
      const mockDocRef = { id: 'customer-workflow-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue({ exists: () => true } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const workflowId = await approvalWorkflowService.createWorkflow(
        mockCampaignId,
        mockOrganizationId,
        customerOnlyData
      );
      
      expect(workflowId).toBe('customer-workflow-id');
      
      // Nur Customer Stage sollte erstellt werden
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({
              stage: 'customer',
              status: 'pending'
            })
          ])
        })
      );
      
      // Team Approval sollte NICHT gestartet werden
      expect(mockTeamApprovalService.createTeamApproval).not.toHaveBeenCalled();
    });

    it('sollte Campaign Update mit Retry-Mechanismus durchführen', async () => {
      const mockDocRef = { id: 'retry-workflow-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      
      // Simuliere mehrere Versuche bis Campaign existiert
      let getDocCallCount = 0;
      mockGetDoc.mockImplementation(() => {
        getDocCallCount++;
        return Promise.resolve({
          exists: () => getDocCallCount > 3 // Campaign existiert erst beim 4. Versuch
        } as any);
      });
      
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const workflowId = await approvalWorkflowService.createWorkflow(
        mockCampaignId,
        mockOrganizationId,
        mockApprovalData
      );
      
      expect(workflowId).toBe('retry-workflow-id');
      expect(mockGetDoc).toHaveBeenCalledTimes(4); // 3 Retry + 1 erfolgreicher Versuch
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1); // Nur ein erfolgreiches Update
    });

    it('sollte PDF-Sync beim Team Approval Start aufrufen', async () => {
      const mockDocRef = { id: 'pdf-sync-workflow-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue({ exists: () => true } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockTeamApprovalService.createTeamApproval.mockResolvedValue(['approval-1']);
      
      const syncSpy = jest.spyOn(approvalWorkflowService, 'syncWorkflowWithPDFStatus');
      
      await approvalWorkflowService.createWorkflow(
        mockCampaignId,
        mockOrganizationId,
        mockApprovalData
      );
      
      expect(syncSpy).toHaveBeenCalledWith(
        'pdf-sync-workflow-id',
        'pending_team',
        'Team-Freigabe gestartet'
      );
    });
  });

  describe('Workflow Stage Processing', () => {
    const mockWorkflow: ApprovalWorkflow = {
      id: 'workflow-123',
      campaignId: mockCampaignId,
      organizationId: mockOrganizationId,
      stages: [
        {
          stage: 'team',
          status: 'in_progress',
          requiredApprovals: 2,
          receivedApprovals: 2
        },
        {
          stage: 'customer',
          status: 'pending',
          requiredApprovals: 1,
          receivedApprovals: 0
        }
      ],
      currentStage: 'team',
      createdAt: Timestamp.now(),
      teamSettings: {
        required: true,
        approvers: mockTeamApprovers,
        message: 'Team approval message',
        allApproved: true
      },
      customerSettings: {
        required: true,
        contact: mockCustomerContact,
        message: 'Customer approval message',
        shareId: 'share-123',
        status: 'pending'
      }
    };

    it('sollte Team Stage Completion korrekt verarbeiten', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWorkflow
      } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const syncSpy = jest.spyOn(approvalWorkflowService, 'syncWorkflowWithPDFStatus');
      const startCustomerSpy = jest.spyOn(approvalWorkflowService, 'startCustomerApproval');
      
      await approvalWorkflowService.processStageCompletion('workflow-123', 'team');
      
      // PDF-Sync für Team Approval sollte aufgerufen werden
      expect(syncSpy).toHaveBeenCalledWith(
        'workflow-123',
        'team_approved',
        'Team-Freigabe abgeschlossen'
      );
      
      // Customer Approval sollte gestartet werden
      expect(startCustomerSpy).toHaveBeenCalledWith('workflow-123');
    });

    it('sollte Customer Stage Completion korrekt verarbeiten', async () => {
      const customerCompleteWorkflow = {
        ...mockWorkflow,
        currentStage: 'customer',
        stages: [{
          stage: 'customer',
          status: 'in_progress',
          requiredApprovals: 1,
          receivedApprovals: 1
        }]
      };
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => customerCompleteWorkflow
      } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const syncSpy = jest.spyOn(approvalWorkflowService, 'syncWorkflowWithPDFStatus');
      const completeSpy = jest.spyOn(approvalWorkflowService, 'completeWorkflow');
      
      await approvalWorkflowService.processStageCompletion('workflow-123', 'customer');
      
      // PDF-Sync für Customer Approval sollte aufgerufen werden
      expect(syncSpy).toHaveBeenCalledWith(
        'workflow-123',
        'customer_approved',
        'Kunden-Freigabe abgeschlossen'
      );
      
      // Workflow sollte als approved abgeschlossen werden
      expect(completeSpy).toHaveBeenCalledWith('workflow-123', 'approved');
    });

    it('sollte Team-only Workflow korrekt abschließen', async () => {
      const teamOnlyWorkflow = {
        ...mockWorkflow,
        customerSettings: {
          ...mockWorkflow.customerSettings,
          required: false
        }
      };
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => teamOnlyWorkflow
      } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const completeSpy = jest.spyOn(approvalWorkflowService, 'completeWorkflow');
      
      await approvalWorkflowService.processStageCompletion('workflow-123', 'team');
      
      // Workflow sollte direkt als approved abgeschlossen werden
      expect(completeSpy).toHaveBeenCalledWith('workflow-123', 'approved');
    });
  });

  describe('Customer Approval Handling', () => {
    it('sollte Customer Approval korrekt starten', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWorkflow
      } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const syncSpy = jest.spyOn(approvalWorkflowService, 'syncWorkflowWithPDFStatus');
      
      await approvalWorkflowService.startCustomerApproval('workflow-123');
      
      // Workflow Current Stage sollte auf customer gesetzt werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStage: 'customer'
        })
      );
      
      // Customer Stage Status sollte auf in_progress gesetzt werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'stages.1.status': 'in_progress',
          'stages.1.startedAt': expect.anything()
        })
      );
      
      // PDF-Sync sollte aufgerufen werden
      expect(syncSpy).toHaveBeenCalledWith(
        'workflow-123',
        'pending_customer',
        'Kunden-Freigabe gestartet'
      );
    });

    it('sollte Fehler werfen wenn Customer Approval nicht konfiguriert', async () => {
      const workflowWithoutCustomer = {
        ...mockWorkflow,
        customerSettings: {
          ...mockWorkflow.customerSettings,
          required: false,
          contact: null
        }
      };
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => workflowWithoutCustomer
      } as any);
      
      await expect(
        approvalWorkflowService.startCustomerApproval('workflow-123')
      ).rejects.toThrow('Customer-Approval ist nicht konfiguriert');
    });
  });

  describe('Workflow Completion', () => {
    it('sollte Workflow als approved abschließen', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWorkflow
      } as any);
      
      const syncSpy = jest.spyOn(approvalWorkflowService, 'syncWorkflowWithPDFStatus');
      
      await approvalWorkflowService.completeWorkflow('workflow-123', 'approved');
      
      // Workflow sollte als completed markiert werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStage: 'completed',
          completedAt: expect.anything()
        })
      );
      
      // Campaign Status sollte aktualisiert werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'approved'
        })
      );
      
      // PDF-Sync sollte aufgerufen werden
      expect(syncSpy).toHaveBeenCalledWith(
        'workflow-123',
        'workflow_approved',
        'Workflow approved'
      );
    });

    it('sollte Workflow als rejected abschließen', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWorkflow
      } as any);
      
      const syncSpy = jest.spyOn(approvalWorkflowService, 'syncWorkflowWithPDFStatus');
      
      await approvalWorkflowService.completeWorkflow('workflow-123', 'rejected');
      
      // Campaign Status sollte auf changes_requested gesetzt werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'changes_requested'
        })
      );
      
      // PDF-Sync sollte aufgerufen werden
      expect(syncSpy).toHaveBeenCalledWith(
        'workflow-123',
        'workflow_rejected',
        'Workflow rejected'
      );
    });
  });

  describe('PDF-Workflow Synchronisation', () => {
    beforeEach(() => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWorkflow
      } as any);
      
      mockPDFVersionsService.getCurrentVersion.mockResolvedValue({
        id: 'pdf-version-123',
        campaignId: mockCampaignId,
        organizationId: mockOrganizationId,
        version: 1,
        status: 'pending_customer',
        downloadUrl: 'https://example.com/pdf.pdf'
      } as any);
    });

    it('sollte PDF-Status für Team Approval korrekt synchronisieren', async () => {
      await approvalWorkflowService.syncWorkflowWithPDFStatus(
        'workflow-123',
        'pending_team',
        'Team approval started'
      );
      
      // PDF-Status sollte auf pending_customer gesetzt werden (Team-Approval wird intern behandelt)
      expect(mockPDFVersionsService.updateVersionStatus).toHaveBeenCalledWith(
        'pdf-version-123',
        'pending_customer'
      );
      
      // Edit-Lock sollte aktiviert werden
      expect(mockPDFVersionsService.lockCampaignEditing).toHaveBeenCalledWith(
        mockCampaignId,
        'pending_team_approval'
      );
    });

    it('sollte PDF-Status für Customer Approval korrekt synchronisieren', async () => {
      await approvalWorkflowService.syncWorkflowWithPDFStatus(
        'workflow-123',
        'pending_customer',
        'Customer approval started'
      );
      
      expect(mockPDFVersionsService.updateVersionStatus).toHaveBeenCalledWith(
        'pdf-version-123',
        'pending_customer'
      );
      
      expect(mockPDFVersionsService.lockCampaignEditing).toHaveBeenCalledWith(
        mockCampaignId,
        'pending_customer_approval'
      );
    });

    it('sollte PDF-Status für Team Approved korrekt behandeln', async () => {
      await approvalWorkflowService.syncWorkflowWithPDFStatus(
        'workflow-123',
        'team_approved',
        'Team approved'
      );
      
      // Da Customer-Approval erforderlich ist, sollte PDF pending_customer bleiben
      expect(mockPDFVersionsService.updateVersionStatus).toHaveBeenCalledWith(
        'pdf-version-123',
        'pending_customer'
      );
      
      expect(mockPDFVersionsService.lockCampaignEditing).toHaveBeenCalledWith(
        mockCampaignId,
        'pending_customer_approval'
      );
    });

    it('sollte PDF-Status für Customer Approved korrekt behandeln', async () => {
      await approvalWorkflowService.syncWorkflowWithPDFStatus(
        'workflow-123',
        'customer_approved',
        'Customer approved'
      );
      
      expect(mockPDFVersionsService.updateVersionStatus).toHaveBeenCalledWith(
        'pdf-version-123',
        'approved'
      );
      
      // Edit-Lock sollte aufgehoben werden
      expect(mockPDFVersionsService.unlockCampaignEditing).toHaveBeenCalledWith(
        mockCampaignId
      );
    });

    it('sollte PDF-Status für Workflow Rejected korrekt behandeln', async () => {
      await approvalWorkflowService.syncWorkflowWithPDFStatus(
        'workflow-123',
        'workflow_rejected',
        'Workflow rejected'
      );
      
      expect(mockPDFVersionsService.updateVersionStatus).toHaveBeenCalledWith(
        'pdf-version-123',
        'rejected'
      );
      
      // Edit-Lock sollte für Überarbeitung aufgehoben werden
      expect(mockPDFVersionsService.unlockCampaignEditing).toHaveBeenCalledWith(
        mockCampaignId
      );
    });

    it('sollte graceful mit fehlendem PDF umgehen', async () => {
      mockPDFVersionsService.getCurrentVersion.mockResolvedValue(null);
      
      // Sollte nicht werfen, nur warnen
      await expect(
        approvalWorkflowService.syncWorkflowWithPDFStatus(
          'workflow-123',
          'team_approved',
          'Team approved'
        )
      ).resolves.not.toThrow();
      
      expect(mockPDFVersionsService.updateVersionStatus).not.toHaveBeenCalled();
    });

    it('sollte PDF-Sync Fehler graceful behandeln', async () => {
      mockPDFVersionsService.getCurrentVersion.mockRejectedValue(new Error('PDF load error'));
      
      // Sollte nicht werfen - PDF-Sync ist nicht kritisch
      await expect(
        approvalWorkflowService.syncWorkflowWithPDFStatus(
          'workflow-123',
          'team_approved',
          'Team approved'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('PDF-Status Callback Handling', () => {
    const mockActiveWorkflow = {
      id: 'active-workflow-123',
      campaignId: mockCampaignId,
      currentStage: 'customer',
      organizationId: mockOrganizationId
    };

    it('sollte PDF approved Callback korrekt verarbeiten', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [{
          data: () => mockActiveWorkflow
        }]
      } as any);
      
      const processStageCompletionSpy = jest.spyOn(approvalWorkflowService, 'processStageCompletion');
      
      await approvalWorkflowService.handlePDFStatusUpdate(
        mockCampaignId,
        'pdf-version-123',
        'approved',
        { organizationId: mockOrganizationId }
      );
      
      expect(processStageCompletionSpy).toHaveBeenCalledWith(
        'active-workflow-123',
        'customer'
      );
    });

    it('sollte PDF rejected Callback korrekt verarbeiten', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [{
          data: () => mockActiveWorkflow
        }]
      } as any);
      
      const completeWorkflowSpy = jest.spyOn(approvalWorkflowService, 'completeWorkflow');
      
      await approvalWorkflowService.handlePDFStatusUpdate(
        mockCampaignId,
        'pdf-version-123',
        'rejected',
        { organizationId: mockOrganizationId }
      );
      
      expect(completeWorkflowSpy).toHaveBeenCalledWith(
        'active-workflow-123',
        'rejected'
      );
    });

    it('sollte Callback ohne aktiven Workflow graceful behandeln', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);
      
      await expect(
        approvalWorkflowService.handlePDFStatusUpdate(
          'nonexistent-campaign',
          'pdf-version-123',
          'approved'
        )
      ).resolves.not.toThrow();
    });

    it('sollte Callback-Fehler graceful behandeln', async () => {
      mockGetDocs.mockRejectedValue(new Error('Query error'));
      
      // Callback-Fehler sollen PDF-Operationen nicht blockieren
      await expect(
        approvalWorkflowService.handlePDFStatusUpdate(
          mockCampaignId,
          'pdf-version-123',
          'approved'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Workflow Data Loading', () => {
    it('sollte Workflow korrekt laden', async () => {
      const workflowData = { id: 'workflow-123', ...mockWorkflow };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'workflow-123',
        data: () => mockWorkflow
      } as any);
      
      const workflow = await approvalWorkflowService.getWorkflow('workflow-123');
      
      expect(workflow).toEqual({ id: 'workflow-123', ...mockWorkflow });
    });

    it('sollte Fehler werfen für nicht existierenden Workflow', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);
      
      await expect(
        approvalWorkflowService.getWorkflow('nonexistent-workflow')
      ).rejects.toThrow('Workflow nicht gefunden');
    });

    it('sollte Workflow-Status korrekt laden', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWorkflow
      } as any);
      
      const stages = await approvalWorkflowService.getWorkflowStatus('workflow-123');
      
      expect(stages).toEqual(mockWorkflow.stages);
    });

    it('sollte Workflows für Organisation laden', async () => {
      const mockWorkflowDocs = [
        { id: 'workflow-1', data: () => ({ ...mockWorkflow, id: 'workflow-1' }) },
        { id: 'workflow-2', data: () => ({ ...mockWorkflow, id: 'workflow-2' }) }
      ];
      
      mockGetDocs.mockResolvedValue({ docs: mockWorkflowDocs } as any);
      
      const workflows = await approvalWorkflowService.getWorkflowsByOrganization(mockOrganizationId);
      
      expect(workflows).toHaveLength(2);
      expect(workflows[0].id).toBe('workflow-1');
      expect(workflows[1].id).toBe('workflow-2');
      
      // Query sollte organizationId filtern
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('sollte Workflow Creation Fehler korrekt behandeln', async () => {
      mockAddDoc.mockRejectedValue(new Error('Firestore error'));
      
      await expect(
        approvalWorkflowService.createWorkflow(
          mockCampaignId,
          mockOrganizationId,
          mockApprovalData
        )
      ).rejects.toThrow('Approval-Workflow konnte nicht erstellt werden');
    });

    it('sollte Campaign Update Timeout nach max Retries behandeln', async () => {
      const mockDocRef = { id: 'timeout-workflow-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      
      // Simuliere dass Campaign nie existiert (max retries erreicht)
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);
      
      await expect(
        approvalWorkflowService.createWorkflow(
          'nonexistent-campaign',
          mockOrganizationId,
          mockApprovalData
        )
      ).rejects.toThrow('Campaign document not found after 5 retries');
    });

    it('sollte Stage Processing für nicht existierenden Workflow behandeln', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);
      
      await expect(
        approvalWorkflowService.processStageCompletion('nonexistent-workflow', 'team')
      ).rejects.toThrow('Workflow nicht gefunden');
    });

    it('sollte graceful mit Benachrichtigungsfehlern umgehen', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockWorkflow
      } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      mockTeamApprovalService.notifyTeamMembers.mockRejectedValue(new Error('Notification error'));
      
      // Sollte trotz Notification-Fehler nicht werfen
      await expect(
        approvalWorkflowService.sendStageNotifications('workflow-123', 'team')
      ).resolves.not.toThrow();
    });

    it('sollte Multi-Tenancy durch organizationId sicherstellen', async () => {
      const org1WorkflowDocs = [{ id: 'org1-workflow', data: () => ({ organizationId: 'org-1' }) }];
      const org2WorkflowDocs = [{ id: 'org2-workflow', data: () => ({ organizationId: 'org-2' }) }];
      
      // Simuliere verschiedene Organizations
      let queryCallCount = 0;
      mockGetDocs.mockImplementation(() => {
        queryCallCount++;
        return Promise.resolve({
          docs: queryCallCount === 1 ? org1WorkflowDocs : org2WorkflowDocs
        } as any);
      });
      
      const workflows1 = await approvalWorkflowService.getWorkflowsByOrganization('org-1');
      const workflows2 = await approvalWorkflowService.getWorkflowsByOrganization('org-2');
      
      expect(workflows1[0].id).toBe('org1-workflow');
      expect(workflows2[0].id).toBe('org2-workflow');
      
      // Jede Query sollte organizationId-Filter haben
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'org-1');
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'org-2');
    });
  });

  describe('Performance & Integration Tests', () => {
    it('sollte Workflow Creation unter 500ms abschließen', async () => {
      mockAddDoc.mockResolvedValue({ id: 'perf-workflow-id' } as any);
      mockGetDoc.mockResolvedValue({ exists: () => true } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockTeamApprovalService.createTeamApproval.mockResolvedValue(['approval-1']);
      
      const startTime = Date.now();
      
      await approvalWorkflowService.createWorkflow(
        mockCampaignId,
        mockOrganizationId,
        mockApprovalData
      );
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('sollte komplexe Workflows mit vielen Approvern handhaben', async () => {
      const manyApprovers: TeamApprover[] = Array.from({ length: 20 }, (_, i) => ({
        userId: `user-${i}`,
        displayName: `User ${i}`,
        email: `user${i}@company.com`
      }));
      
      const complexApprovalData: EnhancedApprovalData = {
        ...mockApprovalData,
        teamApprovers: manyApprovers
      };
      
      mockAddDoc.mockResolvedValue({ id: 'complex-workflow-id' } as any);
      mockGetDoc.mockResolvedValue({ exists: () => true } as any);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockTeamApprovalService.createTeamApproval.mockResolvedValue(
        manyApprovers.map((_, i) => `approval-${i}`)
      );
      
      const workflowId = await approvalWorkflowService.createWorkflow(
        mockCampaignId,
        mockOrganizationId,
        complexApprovalData
      );
      
      expect(workflowId).toBe('complex-workflow-id');
      
      // Workflow sollte 20 required approvals haben
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({
              stage: 'team',
              requiredApprovals: 20,
              receivedApprovals: 0
            })
          ])
        })
      );
    });
  });
});

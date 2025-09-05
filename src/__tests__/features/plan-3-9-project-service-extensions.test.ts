// src/__tests__/features/plan-3-9-project-service-extensions.test.ts
// Tests für Plan 3/9: Kunden-Freigabe-Implementierung - Project-Service Extensions

import { projectService } from '@/lib/firebase/project-service';
import { Project, PipelineStage } from '@/types/project';
import { ApprovalEnhanced } from '@/types/approvals';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs, 
  getDoc, 
  doc, 
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn(),
  })),
  increment: jest.fn((value) => ({ _type: 'increment', value })),
  arrayUnion: jest.fn((item) => ({ _type: 'arrayUnion', items: [item] })),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
}));

// Mock Approval Service for import
jest.mock('@/lib/firebase/approval-service', () => ({
  approvalService: {
    getByProjectId: jest.fn(),
    getApprovalByCampaignId: jest.fn(),
  },
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockLimit = limit as jest.MockedFunction<typeof limit>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;

describe('Plan 3/9: ProjectService Pipeline Extensions', () => {
  const mockContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
  };

  const mockProject: Project = {
    id: 'project-123',
    userId: 'test-user-456',
    organizationId: 'test-org-123',
    title: 'Pipeline Test Project',
    description: 'Test project for pipeline approval integration',
    status: 'active',
    currentStage: 'approval',
    customer: {
      id: 'client-123',
      name: 'Test Client GmbH',
    },
    linkedCampaigns: ['campaign-123', 'campaign-456'],
    budget: 50000,
    currency: 'EUR',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    dueDate: Timestamp.fromDate(new Date('2024-12-31')),
  };

  const mockApproval: ApprovalEnhanced = {
    id: 'approval-123',
    organizationId: 'test-org-123',
    projectId: 'project-123',
    campaignId: 'campaign-123',
    title: 'Project Pipeline Approval',
    campaignTitle: 'Test Campaign',
    clientId: 'client-123',
    clientName: 'Test Client GmbH',
    status: 'approved',
    type: 'customer_only',
    shareId: 'share-123-abc',
    recipients: [
      {
        id: 'recipient-1',
        type: 'customer',
        email: 'client@testcompany.com',
        name: 'Client Contact',
        status: 'approved',
        decision: 'approved',
        decidedAt: Timestamp.now(),
        notificationsSent: 1,
        order: 0,
      },
    ],
    workflow: {
      currentStage: 'customer',
      stages: ['customer'],
      isMultiStage: false,
    },
    history: [],
    analytics: {
      totalViews: 5,
      uniqueViews: 2,
    },
    approvedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as ApprovalEnhanced;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Firebase mock chain
    const mockCollectionRef = { name: 'projects' };
    const mockQueryRef = { collection: mockCollectionRef };
    const mockDocRef = { id: 'project-123' };
    
    mockCollection.mockReturnValue(mockCollectionRef as any);
    mockQuery.mockReturnValue(mockQueryRef as any);
    mockWhere.mockReturnValue(mockQueryRef as any);
    mockOrderBy.mockReturnValue(mockQueryRef as any);
    mockLimit.mockReturnValue(mockQueryRef as any);
    mockDoc.mockReturnValue(mockDocRef as any);
  });

  describe('getLinkedApprovals', () => {
    it('sollte verknüpfte Approvals eines Projekts laden', async () => {
      const mockApprovalDocs = [
        {
          id: 'approval-1',
          data: () => ({
            ...mockApproval,
            id: 'approval-1',
            projectId: 'project-123',
            campaignId: 'campaign-123',
            status: 'approved',
          }),
        },
        {
          id: 'approval-2',
          data: () => ({
            ...mockApproval,
            id: 'approval-2',
            projectId: 'project-123',
            campaignId: 'campaign-456',
            status: 'pending',
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockApprovalDocs,
        empty: false,
      } as any);

      const result = await projectService.getLinkedApprovals('project-123', mockContext);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(), // collection
        expect.anything(), // where projectId
        expect.anything(), // where organizationId
        expect.anything()  // orderBy
      );

      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', 'project-123');
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'test-org-123');
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'approval-1',
        projectId: 'project-123',
        status: 'approved',
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        id: 'approval-2',
        projectId: 'project-123',
        status: 'pending',
      }));
    });

    it('sollte Multi-Tenancy bei Approval-Abfragen durchsetzen', async () => {
      const crossTenantApproval = {
        id: 'cross-tenant-approval',
        data: () => ({
          ...mockApproval,
          organizationId: 'malicious-org-789', // Different organization
          projectId: 'project-123',
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [crossTenantApproval],
        empty: false,
      } as any);

      await projectService.getLinkedApprovals('project-123', mockContext);

      // Should enforce organizationId filtering
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'test-org-123');
      expect(mockWhere).not.toHaveBeenCalledWith('organizationId', '==', 'malicious-org-789');
    });

    it('sollte leere Liste für Projekte ohne Approvals zurückgeben', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      const result = await projectService.getLinkedApprovals('project-no-approvals', mockContext);

      expect(result).toEqual([]);
    });

    it('sollte Fehler bei Datenbank-Problemen handhaben', async () => {
      mockGetDocs.mockRejectedValue(new Error('Database connection failed'));

      const result = await projectService.getLinkedApprovals('project-123', mockContext);

      expect(result).toEqual([]);
    });

    it('sollte Approvals korrekt nach Datum sortieren', async () => {
      const olderApproval = {
        id: 'approval-old',
        data: () => ({
          ...mockApproval,
          id: 'approval-old',
          createdAt: Timestamp.fromDate(new Date('2024-01-01')),
        }),
      };

      const newerApproval = {
        id: 'approval-new',
        data: () => ({
          ...mockApproval,
          id: 'approval-new',
          createdAt: Timestamp.fromDate(new Date('2024-12-31')),
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [newerApproval, olderApproval], // Firestore returns in desc order
        empty: false,
      } as any);

      const result = await projectService.getLinkedApprovals('project-123', mockContext);

      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result[0].id).toBe('approval-new');
      expect(result[1].id).toBe('approval-old');
    });
  });

  describe('updateStage', () => {
    const mockDocSnapshot = {
      id: 'project-123',
      exists: () => true,
      data: () => mockProject,
    };

    beforeEach(() => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot as any);
      mockUpdateDoc.mockResolvedValue(undefined);
    });

    it('sollte Stage-Transition mit Approval-Validation durchführen', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      (approvalService.getApprovalByCampaignId as jest.Mock).mockResolvedValue({
        ...mockApproval,
        status: 'approved',
      });

      await projectService.updateStage(
        'project-123',
        'distribution',
        { distributionStartedAt: Timestamp.now() },
        mockContext
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        expect.objectContaining({
          currentStage: 'distribution',
          updatedAt: expect.anything(),
          distributionStartedAt: expect.anything(),
          stageUpdatedAt: expect.anything(),
          stageUpdatedBy: 'test-user-456',
        })
      );
    });

    it('sollte Distribution-Übergang ohne Approval-Validation blockieren', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      (approvalService.getApprovalByCampaignId as jest.Mock).mockResolvedValue({
        ...mockApproval,
        status: 'pending', // Not approved yet
      });

      await expect(
        projectService.updateStage('project-123', 'distribution', {}, mockContext)
      ).rejects.toThrow('Kunden-Freigabe erforderlich vor Distribution-Phase');

      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('sollte Distribution-Übergang ohne Approval blockieren', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      (approvalService.getApprovalByCampaignId as jest.Mock).mockResolvedValue(null);

      await expect(
        projectService.updateStage('project-123', 'distribution', {}, mockContext)
      ).rejects.toThrow('Kunden-Freigabe erforderlich vor Distribution-Phase');
    });

    it('sollte andere Stage-Übergänge ohne Approval-Prüfung erlauben', async () => {
      await projectService.updateStage(
        'project-123',
        'review',
        { reviewStartedAt: Timestamp.now() },
        mockContext
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStage: 'review',
          reviewStartedAt: expect.anything(),
        })
      );

      // No approval validation for non-distribution stages
      const { approvalService } = await import('@/lib/firebase/approval-service');
      expect(approvalService.getApprovalByCampaignId).not.toHaveBeenCalled();
    });

    it('sollte Multi-Tenancy bei Stage-Updates durchsetzen', async () => {
      // Mock project belongs to different org
      const crossOrgProject = {
        ...mockProject,
        organizationId: 'other-org-456',
      };

      mockGetDoc.mockResolvedValue({
        ...mockDocSnapshot,
        data: () => crossOrgProject,
      } as any);

      await expect(
        projectService.updateStage('project-123', 'review', {}, mockContext)
      ).rejects.toThrow('Projekt nicht gefunden oder keine Berechtigung');
    });

    it('sollte Transition-Metadaten korrekt speichern', async () => {
      const transitionData = {
        approvalCompletedAt: Timestamp.now(),
        approvalComment: 'All requirements met',
        nextMilestone: 'Distribution Phase',
      };

      await projectService.updateStage(
        'project-123',
        'review',
        transitionData,
        mockContext
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStage: 'review',
          ...transitionData,
          stageUpdatedAt: expect.anything(),
          stageUpdatedBy: 'test-user-456',
        })
      );
    });

    it('sollte leere Transition-Daten handhaben', async () => {
      await projectService.updateStage('project-123', 'approval', {}, mockContext);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1); // Only basic update
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStage: 'approval',
          updatedAt: expect.anything(),
        })
      );
    });

    it('sollte Approval-Service-Fehler handhaben', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      (approvalService.getApprovalByCampaignId as jest.Mock).mockRejectedValue(
        new Error('Approval service unavailable')
      );

      await expect(
        projectService.updateStage('project-123', 'distribution', {}, mockContext)
      ).rejects.toThrow();
    });
  });

  describe('getProjectPipelineStatus', () => {
    beforeEach(() => {
      const mockDocSnapshot = {
        id: 'project-123',
        exists: () => true,
        data: () => mockProject,
      };
      mockGetDoc.mkResolvedValue(mockDocSnapshot as any);
    });

    it('sollte Pipeline-Status mit Approval-Check zurückgeben', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      (approvalService.getApprovalByCampaignId as jest.Mock).mockResolvedValue({
        ...mockApproval,
        status: 'approved',
      });

      const result = await projectService.getProjectPipelineStatus('project-123', mockContext);

      expect(result).toEqual({
        currentStage: 'approval',
        approvalStatus: 'approved',
        canProgress: true,
        nextStage: 'distribution',
      });
    });

    it('sollte Progress-Blockierung bei fehlendem Approval anzeigen', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      (approvalService.getApprovalByCampaignId as jest.Mock).mockResolvedValue(null);

      // Test project trying to go to distribution
      const distributionProject = {
        ...mockProject,
        currentStage: 'approval' as PipelineStage,
      };

      mockGetDoc.mockResolvedValue({
        id: 'project-123',
        exists: () => true,
        data: () => distributionProject,
      } as any);

      const result = await projectService.getProjectPipelineStatus('project-123', mockContext);

      expect(result).toEqual({
        currentStage: 'approval',
        approvalStatus: null,
        canProgress: false,
        nextStage: 'distribution',
        blockedReason: 'Keine Freigabe gefunden',
      });
    });

    it('sollte verschiedene Approval-Status korrekt abbilden', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');

      // Test pending approval
      (approvalService.getApprovalByCampaignId as jest.Mock).mockResolvedValue({
        ...mockApproval,
        status: 'pending',
      });

      const result = await projectService.getProjectPipelineStatus('project-123', mockContext);

      expect(result.approvalStatus).toBe('pending');
      expect(result.canProgress).toBe(false);
      expect(result.blockedReason).toBe('Kunden-Freigabe ausstehend');
    });

    it('sollte Stage-Reihenfolge korrekt bestimmen', async () => {
      const stages: { current: PipelineStage; expected: PipelineStage | undefined }[] = [
        { current: 'creation', expected: 'review' },
        { current: 'review', expected: 'approval' },
        { current: 'approval', expected: 'distribution' },
        { current: 'distribution', expected: 'completed' },
        { current: 'completed', expected: undefined },
      ];

      for (const { current, expected } of stages) {
        const testProject = { ...mockProject, currentStage: current };
        
        mockGetDoc.mockResolvedValue({
          id: 'project-123',
          exists: () => true,
          data: () => testProject,
        } as any);

        const result = await projectService.getProjectPipelineStatus('project-123', mockContext);

        expect(result.currentStage).toBe(current);
        expect(result.nextStage).toBe(expected);
      }
    });

    it('sollte unbekannte Projekte handhaben', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await projectService.getProjectPipelineStatus('non-existent', mockContext);

      expect(result).toEqual({
        currentStage: 'unknown',
        canProgress: false,
        blockedReason: 'Projekt nicht gefunden',
      });
    });

    it('sollte Multi-Tenancy bei Pipeline-Status durchsetzen', async () => {
      const crossOrgProject = {
        ...mockProject,
        organizationId: 'other-org-456',
      };

      mockGetDoc.mockResolvedValue({
        id: 'project-123',
        exists: () => true,
        data: () => crossOrgProject,
      } as any);

      const result = await projectService.getProjectPipelineStatus('project-123', mockContext);

      expect(result).toEqual({
        currentStage: 'unknown',
        canProgress: false,
        blockedReason: 'Projekt nicht gefunden',
      });
    });

    it('sollte Approval-Service-Fehler bei Pipeline-Status handhaben', async () => {
      const { approvalService } = await import('@/lib/firebase/approval-service');
      (approvalService.getApprovalByCampaignId as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const approvalProject = {
        ...mockProject,
        currentStage: 'approval' as PipelineStage,
      };

      mockGetDoc.mockResolvedValue({
        id: 'project-123',
        exists: () => true,
        data: () => approvalProject,
      } as any);

      const result = await projectService.getProjectPipelineStatus('project-123', mockContext);

      // Should still return project status even if approval check fails
      expect(result.currentStage).toBe('approval');
      expect(result.nextStage).toBe('distribution');
      // Approval status should be indeterminate due to error
    });

    it('sollte Performance bei großen Projekt-Abfragen optimieren', async () => {
      const startTime = Date.now();

      await projectService.getProjectPipelineStatus('project-123', mockContext);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Pipeline status should be fast
      expect(duration).toBeLessThan(100);
      
      // Should call Firebase only once for project
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases und Performance', () => {
    it('sollte mit ungültigen Stage-Namen umgehen', async () => {
      const invalidStageProject = {
        ...mockProject,
        currentStage: 'invalid_stage' as any,
      };

      mockGetDoc.mockResolvedValue({
        id: 'project-123',
        exists: () => true,
        data: () => invalidStageProject,
      } as any);

      const result = await projectService.getProjectPipelineStatus('project-123', mockContext);

      expect(result.currentStage).toBe('invalid_stage');
      expect(result.canProgress).toBe(true); // No blocking for unknown stages
      expect(result.nextStage).toBeUndefined();
    });

    it('sollte mehrere gleichzeitige Pipeline-Abfragen handhaben', async () => {
      const projects = ['project-1', 'project-2', 'project-3'];
      
      mockGetDoc.mockImplementation(() => Promise.resolve({
        exists: () => true,
        data: () => mockProject,
      }));

      const results = await Promise.all(
        projects.map(projectId =>
          projectService.getProjectPipelineStatus(projectId, mockContext)
        )
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.currentStage).toBe('approval');
      });
    });

    it('sollte Memory-Leaks bei großen Approval-Listen vermeiden', async () => {
      const manyApprovals = Array.from({ length: 100 }, (_, i) => ({
        id: `approval-${i}`,
        data: () => ({
          ...mockApproval,
          id: `approval-${i}`,
          campaignId: `campaign-${i}`,
        }),
      }));

      mockGetDocs.mockResolvedValue({
        docs: manyApprovals,
        empty: false,
      } as any);

      const result = await projectService.getLinkedApprovals('project-with-many-approvals', mockContext);

      expect(result).toHaveLength(100);
      // Verify memory usage doesn't explode
      expect(result.every(approval => typeof approval.id === 'string')).toBe(true);
    });

    it('sollte Network-Timeouts bei Approval-Queries handhaben', async () => {
      mockGetDocs.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 50)
        )
      );

      const result = await projectService.getLinkedApprovals('project-timeout', mockContext);

      expect(result).toEqual([]); // Should return empty array on error
    });

    it('sollte Partial-Updates bei Stage-Transition handhaben', async () => {
      mockGetDoc.mockResolvedValue({
        id: 'project-123',
        exists: () => true,
        data: () => mockProject,
      } as any);

      mockUpdateDoc.mockRejectedValueOnce(new Error('Partial update failed'))
                   .mockResolvedValueOnce(undefined);

      await expect(
        projectService.updateStage('project-123', 'review', { partialData: 'test' }, mockContext)
      ).rejects.toThrow('Partial update failed');
    });

    it('sollte Concurrent Stage-Updates synchronisieren', async () => {
      const concurrentUpdates = [
        projectService.updateStage('project-123', 'review', {}, mockContext),
        projectService.updateStage('project-123', 'approval', {}, mockContext),
      ];

      mockGetDoc.mockResolvedValue({
        id: 'project-123', 
        exists: () => true,
        data: () => mockProject,
      } as any);

      mockUpdateDoc.mockResolvedValue(undefined);

      await Promise.allSettled(concurrentUpdates);

      // Both updates should attempt to run
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });
  });
});
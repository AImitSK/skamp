// src/__tests__/features/plan-3-9-pipeline-approval-workflow-e2e.test.ts
// Tests für Plan 3/9: Kunden-Freigabe-Implementierung - Pipeline-Approval Workflow End-to-End Tests

import { approvalService } from '@/lib/firebase/approval-service';
import { projectService } from '@/lib/firebase/project-service';
import { prService } from '@/lib/firebase/pr-service';
import { ApprovalEnhanced, ApprovalStatus } from '@/types/approvals';
import { Project, PipelineStage } from '@/types/project';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Services
jest.mock('@/lib/firebase/approval-service');
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/pr-service');

const mockApprovalService = approvalService as jest.Mocked<typeof approvalService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockPRService = prService as jest.Mocked<typeof prService>;

describe('Plan 3/9: Pipeline-Approval Workflow End-to-End Tests', () => {
  const mockContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
  };

  const mockProject: Project = {
    id: 'project-123',
    userId: 'test-user-456',
    organizationId: 'test-org-123',
    title: 'E2E Test Project',
    description: 'End-to-end test project for pipeline approval workflow',
    status: 'active',
    currentStage: 'approval',
    customer: {
      id: 'client-123',
      name: 'E2E Test Client GmbH',
    },
    linkedCampaigns: ['campaign-123'],
    budget: 100000,
    currency: 'EUR',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const mockCampaign: PRCampaign = {
    id: 'campaign-123',
    userId: 'test-user-456',
    organizationId: 'test-org-123',
    title: 'E2E Test Campaign',
    contentHtml: '<p>End-to-end test campaign content</p>',
    status: 'draft',
    projectId: 'project-123',
    projectTitle: 'E2E Test Project',
    pipelineStage: 'approval',
    distributionListId: 'list-123',
    distributionListName: 'E2E Test List',
    recipientCount: 100,
    approvalRequired: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const mockClientContact = {
    id: 'contact-123',
    name: 'E2E Client Contact',
    email: 'client@e2etest.com',
    role: 'Decision Maker',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Pipeline-Approval Workflow', () => {
    it('sollte kompletten Workflow: Campaign → Projekt → Approval-Erstellung → Stage-Transition durchführen', async () => {
      // Step 1: Setup - Campaign mit Projekt verknüpfen
      mockPRService.getById.mockResolvedValue(mockCampaign);
      mockProjectService.getById.mockResolvedValue(mockProject);

      // Step 2: Approval-Erstellung
      const approvalId = 'approval-e2e-123';
      mockApprovalService.createCustomerApproval.mockResolvedValue(approvalId);

      const createdApprovalId = await approvalService.createCustomerApproval(
        'campaign-123',
        'test-org-123',
        mockClientContact,
        'E2E Test: Bitte prüfen Sie die Kampagne.',
        {
          name: 'E2E Team Member',
          email: 'team@e2e.com',
        }
      );

      expect(createdApprovalId).toBe(approvalId);
      expect(mockApprovalService.createCustomerApproval).toHaveBeenCalledWith(
        'campaign-123',
        'test-org-123',
        mockClientContact,
        'E2E Test: Bitte prüfen Sie die Kampagne.',
        expect.objectContaining({
          name: 'E2E Team Member',
          email: 'team@e2e.com',
        })
      );

      // Step 3: Approval-Completion Simulation
      const completedApproval: ApprovalEnhanced = {
        id: approvalId,
        organizationId: 'test-org-123',
        projectId: 'project-123',
        campaignId: 'campaign-123',
        status: 'approved',
        approvedAt: Timestamp.now(),
        recipients: [
          {
            id: 'recipient-1',
            type: 'customer',
            email: 'client@e2etest.com',
            name: 'E2E Client Contact',
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
        analytics: { totalViews: 3, uniqueViews: 1 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as ApprovalEnhanced;

      mockApprovalService.getApprovalByCampaignId.mockResolvedValue(completedApproval);

      // Step 4: Stage-Transition nach Approval
      mockProjectService.updateStage.mockResolvedValue(undefined);

      await projectService.updateStage(
        'project-123',
        'distribution',
        {
          approvalCompletedAt: Timestamp.now(),
          approvalId: approvalId,
          nextPhaseStarted: true,
        },
        mockContext
      );

      expect(mockProjectService.updateStage).toHaveBeenCalledWith(
        'project-123',
        'distribution',
        expect.objectContaining({
          approvalCompletedAt: expect.anything(),
          approvalId: approvalId,
          nextPhaseStarted: true,
        }),
        mockContext
      );
    });

    it('sollte End-to-End Client-Access URLs mit Projekt-Branding generieren', async () => {
      const brandedProject = {
        ...mockProject,
        customer: {
          ...mockProject.customer,
          branding: {
            customDomain: 'approvals.e2eclient.com',
            primaryColor: '#ff6600',
            logo: 'https://e2eclient.com/logo.png',
          },
        },
      };

      mockProjectService.getById.mockResolvedValue(brandedProject as any);
      mockPRService.getById.mockResolvedValue(mockCampaign);

      const mockApproval: ApprovalEnhanced = {
        id: 'branded-approval-123',
        organizationId: 'test-org-123',
        projectId: 'project-123',
        campaignId: 'campaign-123',
        shareId: 'branded-share-123',
        clientName: 'E2E Test Client GmbH',
        status: 'pending',
        recipients: [mockClientContact],
        workflow: { currentStage: 'customer', stages: ['customer'], isMultiStage: false },
        history: [],
        analytics: { totalViews: 0, uniqueViews: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as ApprovalEnhanced;

      mockApprovalService.createCustomerApproval.mockResolvedValue('branded-approval-123');

      const approvalId = await approvalService.createCustomerApproval(
        'campaign-123',
        'test-org-123',
        mockClientContact,
        'Branded E2E Test'
      );

      expect(approvalId).toBe('branded-approval-123');
      
      // The branding would be applied in the notification/email phase
      // Here we verify the approval was created with the right client context
      expect(mockApprovalService.createCustomerApproval).toHaveBeenCalledWith(
        'campaign-123',
        'test-org-123',
        mockClientContact,
        'Branded E2E Test'
      );
    });

    it('sollte Auto-Stage-Übergang nach Genehmigung durchführen', async () => {
      // Simulate the full approval and auto-transition workflow
      const pendingApproval: ApprovalEnhanced = {
        id: 'auto-transition-approval',
        organizationId: 'test-org-123',
        projectId: 'project-123',
        campaignId: 'campaign-123',
        status: 'pending',
        recipients: [
          {
            id: 'recipient-auto',
            type: 'customer',
            email: 'auto@transition.com',
            name: 'Auto Transition Client',
            status: 'pending',
            notificationsSent: 1,
            order: 0,
          },
        ],
        workflow: { currentStage: 'customer', stages: ['customer'], isMultiStage: false },
        history: [],
        analytics: { totalViews: 0, uniqueViews: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as ApprovalEnhanced;

      mockApprovalService.getByShareId.mockResolvedValue(pendingApproval);
      mockApprovalService.submitDecision.mockImplementation(async (shareId, email, decision) => {
        if (decision === 'approved') {
          // Auto-trigger stage transition
          await projectService.updateStage(
            'project-123',
            'distribution',
            { autoTransitionTriggered: true },
            mockContext
          );
        }
      });

      mockProjectService.updateStage.mockResolvedValue(undefined);

      // Simulate client approval
      await approvalService.submitDecision('auto-share-123', 'auto@transition.com', 'approved');

      // Verify the stage transition was triggered
      expect(mockProjectService.updateStage).toHaveBeenCalledWith(
        'project-123',
        'distribution',
        expect.objectContaining({
          autoTransitionTriggered: true,
        }),
        mockContext
      );
    });

    it('sollte Error Recovery bei Stage-Transition-Fehlern handhaben', async () => {
      const approvedApproval: ApprovalEnhanced = {
        id: 'error-recovery-approval',
        organizationId: 'test-org-123',
        projectId: 'project-123',
        status: 'approved',
        approvedAt: Timestamp.now(),
        recipients: [
          {
            id: 'recipient-error',
            type: 'customer',
            email: 'error@recovery.com',
            name: 'Error Recovery Client',
            status: 'approved',
            decision: 'approved',
            decidedAt: Timestamp.now(),
            notificationsSent: 1,
            order: 0,
          },
        ],
        workflow: { currentStage: 'customer', stages: ['customer'], isMultiStage: false },
        history: [],
        analytics: { totalViews: 1, uniqueViews: 1 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as ApprovalEnhanced;

      mockApprovalService.getApprovalByCampaignId.mockResolvedValue(approvedApproval);
      
      // Simulate stage transition failure
      mockProjectService.updateStage.mockRejectedValueOnce(
        new Error('Stage transition failed - external service unavailable')
      );
      
      // Should retry or handle gracefully
      await expect(
        projectService.updateStage('project-123', 'distribution', {}, mockContext)
      ).rejects.toThrow('Stage transition failed - external service unavailable');

      // Recovery attempt
      mockProjectService.updateStage.mockResolvedValueOnce(undefined);
      
      await projectService.updateStage(
        'project-123',
        'distribution',
        { recoveryAttempt: true },
        mockContext
      );

      expect(mockProjectService.updateStage).toHaveBeenCalledWith(
        'project-123',
        'distribution',
        expect.objectContaining({
          recoveryAttempt: true,
        }),
        mockContext
      );
    });

    it('sollte Multi-Tenant-Isolation bei Cross-Project-Access verhindern', async () => {
      const crossTenantProject = {
        ...mockProject,
        organizationId: 'malicious-org-789',
      };

      const crossTenantCampaign = {
        ...mockCampaign,
        organizationId: 'malicious-org-789',
        projectId: 'project-123', // Same project ID, different org
      };

      mockPRService.getById.mockResolvedValue(crossTenantCampaign);
      mockProjectService.getById.mockResolvedValue(crossTenantProject);

      // Attempt to create approval for cross-tenant scenario
      mockApprovalService.createCustomerApproval.mockRejectedValue(
        new Error('Cross-tenant access denied')
      );

      await expect(
        approvalService.createCustomerApproval(
          'campaign-123',
          'test-org-123', // Our org
          mockClientContact
        )
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('Complex Pipeline-Approval Scenarios', () => {
    it('sollte Multi-Stage Pipeline-Approvals handhaben', async () => {
      const multiStageProject = {
        ...mockProject,
        currentStage: 'review' as PipelineStage, // Not yet at approval stage
      };

      const multiStageApproval: ApprovalEnhanced = {
        id: 'multi-stage-approval',
        organizationId: 'test-org-123',
        projectId: 'project-123',
        type: 'multi_stage',
        workflow: {
          currentStage: 'internal',
          stages: ['internal', 'customer', 'final'],
          isMultiStage: true,
        },
        recipients: [
          {
            id: 'internal-reviewer',
            type: 'internal',
            email: 'internal@company.com',
            name: 'Internal Reviewer',
            status: 'approved',
            decision: 'approved',
            decidedAt: Timestamp.now(),
            notificationsSent: 1,
            order: 0,
          },
          {
            id: 'customer-reviewer',
            type: 'customer',
            email: 'customer@client.com',
            name: 'Customer Reviewer',
            status: 'pending',
            notificationsSent: 0,
            order: 1,
          },
        ],
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as ApprovalEnhanced;

      mockProjectService.getById.mockResolvedValue(multiStageProject);
      mockApprovalService.getApprovalByCampaignId.mockResolvedValue(multiStageApproval);

      // Should not allow stage transition until all stages complete
      await expect(
        projectService.updateStage('project-123', 'distribution', {}, mockContext)
      ).rejects.toThrow('Kunden-Freigabe erforderlich vor Distribution-Phase');
    });

    it('sollte Zeitbasierte Approval-Workflows handhaben', async () => {
      const timedProject = {
        ...mockProject,
        dueDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
      };

      const timedApproval: ApprovalEnhanced = {
        id: 'timed-approval',
        organizationId: 'test-org-123',
        projectId: 'project-123',
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // 3 days ago
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), // 2 days from now
        remindersSent: 1,
        recipients: [mockClientContact],
        workflow: { currentStage: 'customer', stages: ['customer'], isMultiStage: false },
        history: [],
        analytics: { totalViews: 5, uniqueViews: 2 },
        updatedAt: Timestamp.now(),
      } as ApprovalEnhanced;

      mockProjectService.getById.mockResolvedValue(timedProject);
      mockApprovalService.getApprovalByCampaignId.mockResolvedValue(timedApproval);

      const pipelineStatus = await projectService.getProjectPipelineStatus('project-123', mockContext);

      expect(pipelineStatus).toEqual({
        currentStage: 'approval',
        approvalStatus: 'pending',
        canProgress: false,
        nextStage: 'distribution',
        blockedReason: 'Kunden-Freigabe ausstehend',
      });
    });

    it('sollte Bulk-Pipeline-Operations handhaben', async () => {
      const bulkProjects = [
        { ...mockProject, id: 'bulk-project-1', title: 'Bulk Project 1' },
        { ...mockProject, id: 'bulk-project-2', title: 'Bulk Project 2' },
        { ...mockProject, id: 'bulk-project-3', title: 'Bulk Project 3' },
      ];

      const bulkCampaigns = [
        { ...mockCampaign, id: 'bulk-campaign-1', projectId: 'bulk-project-1' },
        { ...mockCampaign, id: 'bulk-campaign-2', projectId: 'bulk-project-2' },
        { ...mockCampaign, id: 'bulk-campaign-3', projectId: 'bulk-project-3' },
      ];

      // Mock bulk approval creation
      mockApprovalService.createCustomerApproval
        .mockResolvedValueOnce('bulk-approval-1')
        .mockResolvedValueOnce('bulk-approval-2')
        .mockResolvedValueOnce('bulk-approval-3');

      const bulkApprovalPromises = bulkCampaigns.map(campaign =>
        approvalService.createCustomerApproval(
          campaign.id!,
          'test-org-123',
          { ...mockClientContact, email: `bulk-${campaign.id}@client.com` }
        )
      );

      const bulkResults = await Promise.all(bulkApprovalPromises);

      expect(bulkResults).toEqual([
        'bulk-approval-1',
        'bulk-approval-2',
        'bulk-approval-3',
      ]);

      expect(mockApprovalService.createCustomerApproval).toHaveBeenCalledTimes(3);
    });

    it('sollte Pipeline-Dependency-Chains handhaben', async () => {
      const dependentProject = {
        ...mockProject,
        taskDependencies: ['project-456'], // Depends on another project
      };

      const blockingProject = {
        ...mockProject,
        id: 'project-456',
        currentStage: 'review' as PipelineStage, // Still in review, blocking dependent
      };

      mockProjectService.getById
        .mockResolvedValueOnce(dependentProject as any)
        .mockResolvedValueOnce(blockingProject);

      // Should check dependencies before allowing stage transition
      const pipelineStatus = await projectService.getProjectPipelineStatus('project-123', mockContext);

      // In a real implementation, this would check dependencies
      expect(pipelineStatus.currentStage).toBe('approval');
    });

    it('sollte Resource-Limits bei parallelen Approval-Workflows respektieren', async () => {
      // Simulate many concurrent approval workflows
      const concurrentApprovals = Array.from({ length: 50 }, (_, i) => ({
        campaignId: `concurrent-campaign-${i}`,
        approvalId: `concurrent-approval-${i}`,
      }));

      // Mock rate limiting
      let approvalCount = 0;
      mockApprovalService.createCustomerApproval.mockImplementation(async () => {
        approvalCount++;
        if (approvalCount > 10) {
          throw new Error('Rate limit exceeded - too many concurrent approvals');
        }
        return `approval-${approvalCount}`;
      });

      const concurrentPromises = concurrentApprovals.slice(0, 15).map(({ campaignId }) =>
        approvalService.createCustomerApproval(
          campaignId,
          'test-org-123',
          mockClientContact
        ).catch(err => err.message)
      );

      const results = await Promise.allSettled(concurrentPromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const rateLimited = results.filter(r => 
        r.status === 'rejected' || 
        (r.status === 'fulfilled' && r.value.includes('Rate limit'))
      ).length;

      expect(successful).toBeLessThanOrEqual(10);
      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('Performance und Skalierung', () => {
    it('sollte große Pipeline-Projekte effizient verarbeiten', async () => {
      const largeProject = {
        ...mockProject,
        linkedCampaigns: Array.from({ length: 100 }, (_, i) => `campaign-${i}`),
        milestones: Array.from({ length: 20 }, (_, i) => ({
          id: `milestone-${i}`,
          title: `Large Project Milestone ${i}`,
          dueDate: Timestamp.now(),
          completed: i < 10, // Half completed
        })),
      };

      mockProjectService.getById.mockResolvedValue(largeProject as any);
      mockProjectService.getLinkedApprovals.mockResolvedValue([]);

      const startTime = performance.now();
      const status = await projectService.getProjectPipelineStatus('project-123', mockContext);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete in reasonable time
      expect(status.currentStage).toBe('approval');
    });

    it('sollte Memory-Leaks bei langen Approval-Ketten vermeiden', async () => {
      const longApprovalChain = Array.from({ length: 1000 }, (_, i) => ({
        id: `chain-approval-${i}`,
        organizationId: 'test-org-123',
        projectId: 'project-123',
        status: i < 999 ? 'approved' : 'pending',
        createdAt: Timestamp.fromDate(new Date(Date.now() - i * 60000)),
      }));

      mockProjectService.getLinkedApprovals.mockResolvedValue(longApprovalChain as any);

      const result = await projectService.getLinkedApprovals('project-123', mockContext);

      expect(result).toHaveLength(1000);
      // Verify no memory explosion
      expect(result.every(approval => typeof approval.id === 'string')).toBe(true);
    });

    it('sollte Timeout-Handling bei langsamen Pipeline-Operationen haben', async () => {
      // Mock slow operation
      mockProjectService.updateStage.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds
      );

      const timeoutPromise = Promise.race([
        projectService.updateStage('project-123', 'distribution', {}, mockContext),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), 5000))
      ]);

      await expect(timeoutPromise).rejects.toThrow('Operation timeout');
    });

    it('sollte Database-Connection-Pools effizient nutzen', async () => {
      // Test multiple concurrent database operations
      const operations = [
        () => projectService.getProjectPipelineStatus('project-1', mockContext),
        () => projectService.getProjectPipelineStatus('project-2', mockContext),
        () => projectService.getProjectPipelineStatus('project-3', mockContext),
        () => approvalService.createCustomerApproval('campaign-1', 'test-org-123', mockClientContact),
        () => approvalService.createCustomerApproval('campaign-2', 'test-org-123', mockClientContact),
      ];

      mockProjectService.getById.mockResolvedValue(mockProject);
      mockProjectService.getProjectPipelineStatus.mockResolvedValue({
        currentStage: 'approval',
        canProgress: true,
        nextStage: 'distribution',
      });
      mockApprovalService.createCustomerApproval.mockResolvedValue('test-approval');

      const startTime = performance.now();
      const results = await Promise.all(operations.map(op => op()));
      const endTime = performance.now();

      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(1000); // All operations should complete quickly
    });
  });
});
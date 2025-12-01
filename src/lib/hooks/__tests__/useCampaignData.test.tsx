// src/lib/hooks/__tests__/useCampaignData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProjectCampaigns,
  useProjectApprovals,
  useProjectPressData,
  useUpdateCampaign
} from '../useCampaignData';
import { prService } from '@/lib/firebase/pr-service';
import { approvalServiceExtended } from '@/lib/firebase/approval-service';
import { projectService } from '@/lib/firebase/project-service';
import { PRCampaign } from '@/types/pr';
import { ApprovalEnhanced } from '@/types/approvals';
import { Timestamp } from 'firebase/firestore';

// Mocks
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/approval-service');
jest.mock('@/lib/firebase/project-service');

// Helper: QueryClient Wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Mock Data
const mockProject = {
  id: 'project-123',
  title: 'Test Project',
  linkedCampaigns: ['campaign-1', 'campaign-2'],
  organizationId: 'org-123'
};

const mockCampaign1 = {
  id: 'campaign-1',
  title: 'Campaign 1',
  status: 'draft',
  userId: 'user-123',
  organizationId: 'org-123',
  contentHtml: '<p>Test content</p>',
  distributionListId: 'list-1',
  distributionListName: 'Test List',
  recipientCount: 0,
  approvalRequired: false,
  createdAt: Timestamp.now()
} as PRCampaign;

const mockCampaign2 = {
  id: 'campaign-2',
  title: 'Campaign 2',
  status: 'sent',
  userId: 'user-123',
  organizationId: 'org-123',
  contentHtml: '<p>Test content 2</p>',
  distributionListId: 'list-2',
  distributionListName: 'Test List 2',
  recipientCount: 10,
  approvalRequired: false,
  createdAt: Timestamp.now()
} as PRCampaign;

const mockCampaign3 = {
  id: 'campaign-3',
  title: 'Campaign 3',
  status: 'approved',
  userId: 'user-123',
  organizationId: 'org-123',
  projectId: 'project-123',
  contentHtml: '<p>Test content 3</p>',
  distributionListId: 'list-3',
  distributionListName: 'Test List 3',
  recipientCount: 5,
  approvalRequired: true,
  createdAt: Timestamp.now()
} as PRCampaign;

const mockApproval1 = {
  id: 'approval-1',
  campaignId: 'campaign-1',
  campaignTitle: 'Campaign 1',
  projectId: 'project-123',
  status: 'pending',
  clientName: 'Test Client',
  organizationId: 'org-123',
  userId: 'user-123',
  createdBy: 'user-123',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  recipients: [],
  title: 'Freigabe Campaign 1',
  content: { html: '<p>Test content for approval</p>' },
  options: {
    requireAllApprovals: false,
    allowPartialApproval: true,
    autoSendAfterApproval: false,
    allowComments: true,
    allowInlineComments: false
  },
  shareId: 'share-1',
  shareSettings: {
    requirePassword: false,
    requireEmailVerification: false,
    accessLog: true
  },
  history: [],
  analytics: {
    totalViews: 0,
    uniqueViews: 0
  },
  requestedAt: Timestamp.now(),
  notifications: {
    requested: { sent: false, method: 'email' }
  },
  version: 1,
  workflow: 'simple'
} as ApprovalEnhanced;

const mockApproval2 = {
  id: 'approval-2',
  campaignId: 'campaign-2',
  campaignTitle: 'Campaign 2',
  projectId: 'project-123',
  status: 'approved',
  clientName: 'Test Client 2',
  organizationId: 'org-123',
  userId: 'user-123',
  createdBy: 'user-123',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  recipients: [],
  title: 'Freigabe Campaign 2',
  content: { html: '<p>Test content for approval 2</p>' },
  options: {
    requireAllApprovals: false,
    allowPartialApproval: true,
    autoSendAfterApproval: false,
    allowComments: true,
    allowInlineComments: false
  },
  shareId: 'share-2',
  shareSettings: {
    requirePassword: false,
    requireEmailVerification: false,
    accessLog: true
  },
  history: [],
  analytics: {
    totalViews: 5,
    uniqueViews: 3
  },
  requestedAt: Timestamp.now(),
  notifications: {
    requested: { sent: true, method: 'email' }
  },
  version: 1,
  workflow: 'simple'
} as ApprovalEnhanced;

describe('useProjectCampaigns Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when projectId is undefined', async () => {
    const { result } = renderHook(
      () => useProjectCampaigns(undefined, 'org-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should return empty array when organizationId is undefined', async () => {
    const { result } = renderHook(
      () => useProjectCampaigns('project-123', undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should load campaigns from linkedCampaigns array', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
    (prService.getById as jest.Mock)
      .mockResolvedValueOnce(mockCampaign1)
      .mockResolvedValueOnce(mockCampaign2);
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useProjectCampaigns('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toContainEqual(mockCampaign1);
    expect(result.current.data).toContainEqual(mockCampaign2);
  });

  it('should load campaigns from projectId', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue({ ...mockProject, linkedCampaigns: [] });
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([mockCampaign3]);

    const { result } = renderHook(
      () => useProjectCampaigns('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data).toContainEqual(mockCampaign3);
  });

  it('should combine linkedCampaigns and projectId campaigns', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
    (prService.getById as jest.Mock)
      .mockResolvedValueOnce(mockCampaign1)
      .mockResolvedValueOnce(mockCampaign2);
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([mockCampaign3]);

    const { result } = renderHook(
      () => useProjectCampaigns('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
  });

  it('should remove duplicate campaigns', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
    (prService.getById as jest.Mock)
      .mockResolvedValueOnce(mockCampaign1)
      .mockResolvedValueOnce(mockCampaign2);
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([mockCampaign1]);

    const { result } = renderHook(
      () => useProjectCampaigns('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    const campaign1Count = result.current.data?.filter(c => c.id === 'campaign-1').length;
    expect(campaign1Count).toBe(1);
  });

  it('should handle errors when loading linkedCampaigns', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
    (prService.getById as jest.Mock)
      .mockRejectedValueOnce(new Error('Campaign not found'))
      .mockResolvedValueOnce(mockCampaign2);
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useProjectCampaigns('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data).toContainEqual(mockCampaign2);
  });

  it('should return empty array when project has no campaigns', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue({
      ...mockProject,
      linkedCampaigns: []
    });
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useProjectCampaigns('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should throw error when project not found', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(
      () => useProjectCampaigns('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe('useProjectApprovals Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when projectId is undefined', async () => {
    const { result } = renderHook(
      () => useProjectApprovals(undefined, 'org-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should return empty array when organizationId is undefined', async () => {
    const { result } = renderHook(
      () => useProjectApprovals('project-123', undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should load approvals for project', async () => {
    (approvalServiceExtended.getApprovalsByProject as jest.Mock).mockResolvedValue([
      mockApproval1,
      mockApproval2
    ]);

    const { result } = renderHook(
      () => useProjectApprovals('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toContainEqual(mockApproval1);
    expect(result.current.data).toContainEqual(mockApproval2);
  });

  it('should handle empty approvals', async () => {
    (approvalServiceExtended.getApprovalsByProject as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useProjectApprovals('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle errors', async () => {
    (approvalServiceExtended.getApprovalsByProject as jest.Mock).mockRejectedValue(
      new Error('Failed to load approvals')
    );

    const { result } = renderHook(
      () => useProjectApprovals('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useProjectPressData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should combine campaigns and approvals', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
    (prService.getById as jest.Mock)
      .mockResolvedValueOnce(mockCampaign1)
      .mockResolvedValueOnce(mockCampaign2);
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([]);
    (approvalServiceExtended.getApprovalsByProject as jest.Mock).mockResolvedValue([
      mockApproval1,
      mockApproval2
    ]);

    const { result } = renderHook(
      () => useProjectPressData('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(!result.current.isLoading).toBe(true));

    expect(result.current.campaigns).toHaveLength(2);
    expect(result.current.approvals).toHaveLength(2);
  });

  it('should return empty arrays when both queries fail', async () => {
    (projectService.getById as jest.Mock).mockRejectedValue(new Error('Failed'));
    (approvalServiceExtended.getApprovalsByProject as jest.Mock).mockRejectedValue(
      new Error('Failed')
    );

    const { result } = renderHook(
      () => useProjectPressData('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(!result.current.isLoading).toBe(true));

    expect(result.current.campaigns).toEqual([]);
    expect(result.current.approvals).toEqual([]);
    expect(result.current.isError).toBe(true);
  });

  it('should indicate loading state', async () => {
    (projectService.getById as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockProject), 100))
    );
    (approvalServiceExtended.getApprovalsByProject as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    const { result } = renderHook(
      () => useProjectPressData('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(!result.current.isLoading).toBe(true));

    expect(result.current.isLoading).toBe(false);
  });

  it('should provide refetch function', async () => {
    (projectService.getById as jest.Mock).mockResolvedValue(mockProject);
    (prService.getById as jest.Mock)
      .mockResolvedValueOnce(mockCampaign1)
      .mockResolvedValueOnce(mockCampaign2);
    (prService.getCampaignsByProject as jest.Mock).mockResolvedValue([]);
    (approvalServiceExtended.getApprovalsByProject as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useProjectPressData('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(!result.current.isLoading).toBe(true));

    expect(typeof result.current.refetch).toBe('function');

    result.current.refetch();

    expect(projectService.getById).toHaveBeenCalled();
  });
});

describe('useUpdateCampaign Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update campaign', async () => {
    (prService.update as jest.Mock).mockResolvedValue(undefined);

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useUpdateCampaign(),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        )
      }
    );

    await result.current.mutateAsync({
      id: 'campaign-1',
      organizationId: 'org-123',
      campaignData: { title: 'Updated Title' }
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(prService.update).toHaveBeenCalledWith('campaign-1', { title: 'Updated Title' });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['project-campaigns']
    });
  });

  it('should handle update errors', async () => {
    (prService.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(
      () => useUpdateCampaign(),
      { wrapper: createWrapper() }
    );

    try {
      await result.current.mutateAsync({
        id: 'campaign-1',
        organizationId: 'org-123',
        campaignData: { title: 'Updated Title' }
      });
    } catch (error) {
      expect(error).toBeDefined();
    }

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectMonitoringData, useConfirmSuggestion, useRejectSuggestion } from '../useMonitoringData';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { projectService } from '@/lib/firebase/project-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';

// Mock Firebase Services
jest.mock('@/lib/firebase/email-campaign-service');
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/clipping-service');
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/monitoring-suggestion-service');

const mockEmailCampaignService = emailCampaignService as jest.Mocked<typeof emailCampaignService>;
const mockPrService = prService as jest.Mocked<typeof prService>;
const mockClippingService = clippingService as jest.Mocked<typeof clippingService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockMonitoringSuggestionService = monitoringSuggestionService as jest.Mocked<typeof monitoringSuggestionService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const Wrapper = ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('useProjectMonitoringData', () => {
  const mockProjectId = 'project-123';
  const mockOrganizationId = 'org-456';

  const mockProject = {
    id: mockProjectId,
    name: 'Test Project',
    linkedCampaigns: ['campaign-1', 'campaign-2']
  };

  const mockCampaign = {
    id: 'campaign-1',
    name: 'Test Campaign',
    projectId: mockProjectId
  };

  const mockSends = [
    { id: 'send-1', status: 'delivered' },
    { id: 'send-2', status: 'opened' },
    { id: 'send-3', status: 'clicked' }
  ];

  const mockClippings = [
    { id: 'clip-1', title: 'Clipping 1', reach: 1000 },
    { id: 'clip-2', title: 'Clipping 2', reach: 2000 }
  ];

  const mockSuggestions = [
    { id: 'sugg-1', status: 'pending' },
    { id: 'sugg-2', status: 'confirmed' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectService.getById.mockResolvedValue(mockProject as any);
    mockPrService.getById.mockResolvedValue(mockCampaign as any);
    mockPrService.getCampaignsByProject.mockResolvedValue([mockCampaign] as any);
    mockEmailCampaignService.getSends.mockResolvedValue(mockSends as any);
    mockClippingService.getByCampaignId.mockResolvedValue(mockClippings as any);
    mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue(mockSuggestions as any);
  });

  it('should load monitoring data successfully', async () => {
    const { result } = renderHook(
      () => useProjectMonitoringData(mockProjectId, mockOrganizationId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.campaigns).toBeDefined();
    expect(result.current.data?.allSends).toHaveLength(3);
    expect(result.current.data?.allClippings).toHaveLength(2);
    expect(result.current.data?.allSuggestions).toHaveLength(2);
  });

  it('should not execute query when projectId is missing', async () => {
    const { result } = renderHook(
      () => useProjectMonitoringData(undefined, mockOrganizationId),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockProjectService.getById).not.toHaveBeenCalled();
  });

  it('should not execute query when organizationId is missing', async () => {
    const { result } = renderHook(
      () => useProjectMonitoringData(mockProjectId, undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockProjectService.getById).not.toHaveBeenCalled();
  });

  it('should throw error when project is not found', async () => {
    mockProjectService.getById.mockResolvedValue(null);

    const { result } = renderHook(
      () => useProjectMonitoringData(mockProjectId, mockOrganizationId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('nicht gefunden');
  });

  it('should remove duplicate campaigns', async () => {
    const duplicateCampaign = { ...mockCampaign, id: 'campaign-1' };
    mockPrService.getCampaignsByProject.mockResolvedValue([duplicateCampaign] as any);

    const { result } = renderHook(
      () => useProjectMonitoringData(mockProjectId, mockOrganizationId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.campaigns).toHaveLength(1);
  });

  it('should filter campaigns with no activity', async () => {
    mockEmailCampaignService.getSends.mockResolvedValue([]);
    mockClippingService.getByCampaignId.mockResolvedValue([]);
    mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

    const { result } = renderHook(
      () => useProjectMonitoringData(mockProjectId, mockOrganizationId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.campaigns).toHaveLength(0);
  });

  it('should calculate campaign stats correctly', async () => {
    const { result } = renderHook(
      () => useProjectMonitoringData(mockProjectId, mockOrganizationId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const campaign = result.current.data?.campaigns[0];
    expect(campaign?.stats.total).toBe(3);
    expect(campaign?.stats.delivered).toBe(3);
    expect(campaign?.stats.opened).toBe(2);
    expect(campaign?.stats.clicked).toBe(1);
    expect(campaign?.stats.clippings).toBe(2);
  });

  it('should not execute query when disabled (missing params)', () => {
    const { result } = renderHook(
      () => useProjectMonitoringData(undefined, undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockProjectService.getById).not.toHaveBeenCalled();
  });
});

describe('useConfirmSuggestion', () => {
  it('should confirm suggestion and invalidate cache', async () => {
    const mockMutationData = {
      suggestionId: 'sugg-1',
      userId: 'user-123',
      organizationId: 'org-456'
    };

    mockMonitoringSuggestionService.confirmSuggestion.mockResolvedValue(undefined as any);

    const { result } = renderHook(() => useConfirmSuggestion(), {
      wrapper: createWrapper()
    });

    await result.current.mutateAsync(mockMutationData);

    expect(mockMonitoringSuggestionService.confirmSuggestion).toHaveBeenCalledWith(
      'sugg-1',
      { userId: 'user-123', organizationId: 'org-456' }
    );
  });

  it('should handle confirmation error', async () => {
    const mockMutationData = {
      suggestionId: 'sugg-1',
      userId: 'user-123',
      organizationId: 'org-456'
    };

    mockMonitoringSuggestionService.confirmSuggestion.mockRejectedValue(
      new Error('Confirmation failed')
    );

    const { result } = renderHook(() => useConfirmSuggestion(), {
      wrapper: createWrapper()
    });

    await expect(result.current.mutateAsync(mockMutationData)).rejects.toThrow('Confirmation failed');
  });
});

describe('useRejectSuggestion', () => {
  it('should reject suggestion and invalidate cache', async () => {
    const mockMutationData = {
      suggestionId: 'sugg-2',
      userId: 'user-456',
      organizationId: 'org-789'
    };

    mockMonitoringSuggestionService.markAsSpam.mockResolvedValue(undefined as any);

    const { result } = renderHook(() => useRejectSuggestion(), {
      wrapper: createWrapper()
    });

    await result.current.mutateAsync(mockMutationData);

    expect(mockMonitoringSuggestionService.markAsSpam).toHaveBeenCalledWith(
      'sugg-2',
      { userId: 'user-456', organizationId: 'org-789' }
    );
  });

  it('should handle rejection error', async () => {
    const mockMutationData = {
      suggestionId: 'sugg-2',
      userId: 'user-456',
      organizationId: 'org-789'
    };

    mockMonitoringSuggestionService.markAsSpam.mockRejectedValue(
      new Error('Rejection failed')
    );

    const { result } = renderHook(() => useRejectSuggestion(), {
      wrapper: createWrapper()
    });

    await expect(result.current.mutateAsync(mockMutationData)).rejects.toThrow('Rejection failed');
  });
});

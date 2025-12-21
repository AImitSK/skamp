import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCampaignMonitoringData } from '../useCampaignMonitoringData';
import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';

jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/email-campaign-service');
jest.mock('@/lib/firebase/clipping-service');
jest.mock('@/lib/firebase/monitoring-suggestion-service');

const mockPrService = prService as jest.Mocked<typeof prService>;
const mockEmailCampaignService = emailCampaignService as jest.Mocked<typeof emailCampaignService>;
const mockClippingService = clippingService as jest.Mocked<typeof clippingService>;
const mockMonitoringSuggestionService = monitoringSuggestionService as jest.Mocked<typeof monitoringSuggestionService>;

describe('useCampaignMonitoringData', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('successful data loading', () => {
    it('should load all monitoring data in parallel', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        title: 'Test Campaign',
        projectId: 'project-1',
        userId: 'user-1',
        organizationId: 'org-1',
        contentHtml: '<p>Test content</p>',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false,
        createdAt: { toDate: () => new Date() } as any,
        updatedAt: { toDate: () => new Date() } as any
      };
      const mockSends = [{
        id: 'send-1',
        campaignId: 'campaign-1',
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        status: 'sent' as const
      }];
      const mockClippings = [{
        id: 'clip-1',
        organizationId: 'org-1',
        title: 'Test Clipping',
        url: 'https://example.com',
        publishedAt: { toDate: () => new Date() } as any,
        outletName: 'Test Outlet',
        outletType: 'online' as const,
        sentiment: 'positive' as const,
        detectionMethod: 'manual' as const,
        detectedAt: { toDate: () => new Date() } as any,
        createdBy: 'user-1',
        createdAt: { toDate: () => new Date() } as any,
        updatedAt: { toDate: () => new Date() } as any
      }];
      const mockSuggestions = [{
        id: 'sug-1',
        organizationId: 'org-1',
        campaignId: 'campaign-1',
        status: 'pending' as const,
        articleUrl: 'https://example.com/article',
        normalizedUrl: 'https://example.com/article',
        articleTitle: 'Test Article',
        sources: [],
        avgMatchScore: 0,
        highestMatchScore: 0,
        confidence: 'medium' as const,
        autoConfirmed: false,
        createdAt: { toDate: () => new Date() } as any
      }];

      mockPrService.getById.mockResolvedValue(mockCampaign as any);
      mockEmailCampaignService.getSends.mockResolvedValue(mockSends as any);
      mockClippingService.getByCampaignId.mockResolvedValue(mockClippings as any);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue(mockSuggestions as any);

      const { result } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        campaign: mockCampaign,
        sends: mockSends,
        clippings: mockClippings,
        suggestions: mockSuggestions,
      });

      expect(mockPrService.getById).toHaveBeenCalledWith('campaign-1');
      expect(mockEmailCampaignService.getSends).toHaveBeenCalledWith('campaign-1', { organizationId: 'org-1' });
      expect(mockClippingService.getByCampaignId).toHaveBeenCalledWith('campaign-1', { organizationId: 'org-1' });
      expect(mockMonitoringSuggestionService.getByCampaignId).toHaveBeenCalledWith('campaign-1', 'org-1');
    });

    it('should use parallel loading with Promise.all', async () => {
      const startTime = Date.now();
      let prServiceCallTime = 0;
      let emailServiceCallTime = 0;

      mockPrService.getById.mockImplementation(async () => {
        prServiceCallTime = Date.now() - startTime;
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          id: 'campaign-1',
          title: 'Test',
          userId: 'user-1',
          organizationId: 'org-1',
          contentHtml: '',
          status: 'draft' as const,
          distributionListId: '',
          distributionListName: '',
          recipientCount: 0,
          approvalRequired: false
        } as any;
      });

      mockEmailCampaignService.getSends.mockImplementation(async () => {
        emailServiceCallTime = Date.now() - startTime;
        await new Promise(resolve => setTimeout(resolve, 50));
        return [] as any;
      });

      mockClippingService.getByCampaignId.mockResolvedValue([] as any);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([] as any);

      const { result } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(Math.abs(prServiceCallTime - emailServiceCallTime)).toBeLessThan(20);
    });

    it('should respect staleTime of 5 minutes', async () => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      mockPrService.getById.mockResolvedValue({
        id: 'campaign-1',
        userId: 'user-1',
        organizationId: 'org-1',
        title: '',
        contentHtml: '',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      } as any);
      mockEmailCampaignService.getSends.mockResolvedValue([]);
      mockClippingService.getByCampaignId.mockResolvedValue([]);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

      const { result, rerender } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const firstCallCount = mockPrService.getById.mock.calls.length;

      rerender();

      expect(mockPrService.getById.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('error handling', () => {
    it('should show error when params are provided but fetch fails', async () => {
      mockPrService.getById.mockRejectedValue(new Error('Failed to load campaign'));
      mockEmailCampaignService.getSends.mockResolvedValue([]);
      mockClippingService.getByCampaignId.mockResolvedValue([]);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

      const { result } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error).message).toBe('Failed to load campaign');
    });

    it('should handle error from emailCampaignService', async () => {
      mockPrService.getById.mockResolvedValue({
        id: 'campaign-1',
        userId: 'user-1',
        organizationId: 'org-1',
        title: '',
        contentHtml: '',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      } as any);
      mockEmailCampaignService.getSends.mockRejectedValue(new Error('Failed to load sends'));
      mockClippingService.getByCampaignId.mockResolvedValue([]);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

      const { result } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect((result.current.error as Error).message).toBe('Failed to load sends');
    });
  });

  describe('enabled/disabled states', () => {
    it('should not fetch when campaignId is undefined', () => {
      renderHook(
        () => useCampaignMonitoringData(undefined, 'org-1'),
        { wrapper: createWrapper() }
      );

      expect(mockPrService.getById).not.toHaveBeenCalled();
      expect(mockEmailCampaignService.getSends).not.toHaveBeenCalled();
    });

    it('should not fetch when organizationId is undefined', () => {
      renderHook(
        () => useCampaignMonitoringData('campaign-1', undefined),
        { wrapper: createWrapper() }
      );

      expect(mockPrService.getById).not.toHaveBeenCalled();
      expect(mockEmailCampaignService.getSends).not.toHaveBeenCalled();
    });

    it('should fetch when both parameters are provided', async () => {
      mockPrService.getById.mockResolvedValue({
        id: 'campaign-1',
        userId: 'user-1',
        organizationId: 'org-1',
        title: '',
        contentHtml: '',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      } as any);
      mockEmailCampaignService.getSends.mockResolvedValue([]);
      mockClippingService.getByCampaignId.mockResolvedValue([]);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

      const { result } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPrService.getById).toHaveBeenCalled();
      expect(mockEmailCampaignService.getSends).toHaveBeenCalled();
    });
  });

  describe('refetch functionality', () => {
    it('should refetch data when refetch is called', async () => {
      mockPrService.getById.mockResolvedValue({
        id: 'campaign-1',
        userId: 'user-1',
        organizationId: 'org-1',
        title: '',
        contentHtml: '',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      } as any);
      mockEmailCampaignService.getSends.mockResolvedValue([]);
      mockClippingService.getByCampaignId.mockResolvedValue([]);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

      const { result } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const firstCallCount = mockPrService.getById.mock.calls.length;

      await result.current.refetch();

      expect(mockPrService.getById.mock.calls.length).toBe(firstCallCount + 1);
    });
  });

  describe('cache behavior', () => {
    it('should use correct queryKey for caching', async () => {
      mockPrService.getById.mockResolvedValue({
        id: 'campaign-1',
        userId: 'user-1',
        organizationId: 'org-1',
        title: '',
        contentHtml: '',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      } as any);
      mockEmailCampaignService.getSends.mockResolvedValue([]);
      mockClippingService.getByCampaignId.mockResolvedValue([]);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

      const { result } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cachedData = queryClient.getQueryData(['campaignMonitoring', 'campaign-1', 'org-1']);
      expect(cachedData).toBeDefined();
    });

    it('should use different cache for different campaignIds', async () => {
      mockPrService.getById.mockResolvedValue({
        id: 'campaign-1',
        userId: 'user-1',
        organizationId: 'org-1',
        title: '',
        contentHtml: '',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      } as any);
      mockEmailCampaignService.getSends.mockResolvedValue([]);
      mockClippingService.getByCampaignId.mockResolvedValue([]);
      mockMonitoringSuggestionService.getByCampaignId.mockResolvedValue([]);

      const { result: result1 } = renderHook(
        () => useCampaignMonitoringData('campaign-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      mockPrService.getById.mockResolvedValue({
        id: 'campaign-2',
        userId: 'user-1',
        organizationId: 'org-1',
        title: '',
        contentHtml: '',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      } as any);

      const { result: result2 } = renderHook(
        () => useCampaignMonitoringData('campaign-2', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      expect(result1.current.data?.campaign?.id).toBe('campaign-1');
      expect(result2.current.data?.campaign?.id).toBe('campaign-2');
    });
  });
});

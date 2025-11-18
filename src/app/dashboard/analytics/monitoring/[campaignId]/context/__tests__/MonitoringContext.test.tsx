import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { MonitoringProvider, useMonitoring } from '../MonitoringContext';
import { useCampaignMonitoringData } from '@/lib/hooks/useCampaignMonitoringData';
import { useAnalysisPDFs } from '@/lib/hooks/useAnalysisPDFs';
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
import { usePDFDeleteMutation } from '@/lib/hooks/usePDFDeleteMutation';

jest.mock('@/lib/hooks/useCampaignMonitoringData');
jest.mock('@/lib/hooks/useAnalysisPDFs');
jest.mock('@/lib/hooks/useMonitoringReport');
jest.mock('@/lib/hooks/usePDFDeleteMutation');

const mockUseCampaignMonitoringData = useCampaignMonitoringData as jest.MockedFunction<typeof useCampaignMonitoringData>;
const mockUseAnalysisPDFs = useAnalysisPDFs as jest.MockedFunction<typeof useAnalysisPDFs>;
const mockUsePDFReportGenerator = usePDFReportGenerator as jest.MockedFunction<typeof usePDFReportGenerator>;
const mockUsePDFDeleteMutation = usePDFDeleteMutation as jest.MockedFunction<typeof usePDFDeleteMutation>;

describe('MonitoringContext', () => {
  let queryClient: QueryClient;

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MonitoringProvider
        campaignId="campaign-1"
        organizationId="org-1"
        activeTab="dashboard"
      >
        {children}
      </MonitoringProvider>
    </QueryClientProvider>
  );

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

  describe('MonitoringProvider', () => {
    it('should provide monitoring context values to children', async () => {
      const mockData = {
        campaign: { id: 'campaign-1', title: 'Test Campaign', projectId: 'project-1' },
        sends: [{ id: 'send-1' }],
        clippings: [{ id: 'clip-1' }],
        suggestions: [{ id: 'sug-1' }],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: { pdfs: [], folderLink: null },
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const TestComponent = () => {
        const context = useMonitoring();
        return (
          <div>
            <div data-testid="campaign">{context.campaign?.title}</div>
            <div data-testid="sends-count">{context.sends.length}</div>
            <div data-testid="clippings-count">{context.clippings.length}</div>
          </div>
        );
      };

      render(<TestComponent />, { wrapper: createWrapper });

      expect(screen.getByTestId('campaign')).toHaveTextContent('Test Campaign');
      expect(screen.getByTestId('sends-count')).toHaveTextContent('1');
      expect(screen.getByTestId('clippings-count')).toHaveTextContent('1');
    });

    it('should provide loading states', async () => {
      mockUseCampaignMonitoringData.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const TestComponent = () => {
        const context = useMonitoring();
        return (
          <div>
            <div data-testid="loading-data">{context.isLoadingData.toString()}</div>
            <div data-testid="loading-pdfs">{context.isLoadingPDFs.toString()}</div>
          </div>
        );
      };

      render(<TestComponent />, { wrapper: createWrapper });

      expect(screen.getByTestId('loading-data')).toHaveTextContent('true');
      expect(screen.getByTestId('loading-pdfs')).toHaveTextContent('true');
    });

    it('should provide error state', async () => {
      const error = new Error('Failed to load');

      mockUseCampaignMonitoringData.mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const TestComponent = () => {
        const context = useMonitoring();
        return <div data-testid="error">{context.error?.message}</div>;
      };

      render(<TestComponent />, { wrapper: createWrapper });

      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load');
    });

    it('should pass campaignId and organizationId to hooks', () => {
      mockUseCampaignMonitoringData.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const TestComponent = () => {
        useMonitoring();
        return <div>Test</div>;
      };

      render(<TestComponent />, { wrapper: createWrapper });

      expect(mockUseCampaignMonitoringData).toHaveBeenCalledWith('campaign-1', 'org-1');
    });

    it('should pass activeTab to useAnalysisPDFs for conditional loading', () => {
      const mockData = {
        campaign: { id: 'campaign-1', projectId: 'project-1' },
        sends: [],
        clippings: [],
        suggestions: [],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const TestComponent = () => {
        useMonitoring();
        return <div>Test</div>;
      };

      render(<TestComponent />, { wrapper: createWrapper });

      expect(mockUseAnalysisPDFs).toHaveBeenCalledWith(
        'campaign-1',
        'org-1',
        'project-1',
        true
      );
    });

    it('should disable PDF loading when tab is not dashboard', () => {
      const mockData = {
        campaign: { id: 'campaign-1', projectId: 'project-1' },
        sends: [],
        clippings: [],
        suggestions: [],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const customWrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <MonitoringProvider
            campaignId="campaign-1"
            organizationId="org-1"
            activeTab="performance"
          >
            {children}
          </MonitoringProvider>
        </QueryClientProvider>
      );

      const TestComponent = () => {
        useMonitoring();
        return <div>Test</div>;
      };

      render(<TestComponent />, { wrapper: customWrapper });

      expect(mockUseAnalysisPDFs).toHaveBeenCalledWith(
        'campaign-1',
        'org-1',
        'project-1',
        false
      );
    });
  });

  describe('useMonitoring hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponent = () => {
        useMonitoring();
        return <div>Test</div>;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useMonitoring must be used within MonitoringProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should return context value when used inside provider', () => {
      const mockData = {
        campaign: { id: 'campaign-1', title: 'Test', projectId: 'project-1' },
        sends: [],
        clippings: [],
        suggestions: [],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: { pdfs: [], folderLink: null },
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const { result } = renderHook(() => useMonitoring(), { wrapper: createWrapper });

      expect(result.current).toBeDefined();
      expect(result.current.campaign).toEqual(mockData.campaign);
    });
  });

  describe('context handlers', () => {
    it('should provide handlePDFExport that calls PDF generator', async () => {
      const mockMutate = jest.fn();
      const mockData = {
        campaign: { id: 'campaign-1', title: 'Test', projectId: 'project-1' },
        sends: [],
        clippings: [],
        suggestions: [],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: { pdfs: [], folderLink: null },
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const { result } = renderHook(() => useMonitoring(), { wrapper: createWrapper });

      await result.current.handlePDFExport('user-123');

      expect(mockMutate).toHaveBeenCalledWith({
        campaignId: 'campaign-1',
        organizationId: 'org-1',
        userId: 'user-123',
      });
    });

    it('should provide handleDeletePDF that calls delete mutation', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      const mockPDF = { id: 'pdf-1', fileName: 'Report.pdf' };
      const mockData = {
        campaign: { id: 'campaign-1', projectId: 'project-1' },
        sends: [],
        clippings: [],
        suggestions: [],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: { pdfs: [], folderLink: null },
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
      } as any);

      const { result } = renderHook(() => useMonitoring(), { wrapper: createWrapper });

      await result.current.handleDeletePDF(mockPDF);

      expect(mockMutateAsync).toHaveBeenCalledWith(mockPDF);
    });

    it('should provide reloadData that triggers refetch', async () => {
      const mockRefetch = jest.fn();
      const mockData = {
        campaign: { id: 'campaign-1', projectId: 'project-1' },
        sends: [],
        clippings: [],
        suggestions: [],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: { pdfs: [], folderLink: null },
        isLoading: false,
      } as any);

      mockUsePDFReportGenerator.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as any);

      mockUsePDFDeleteMutation.mockReturnValue({
        mutateAsync: jest.fn(),
      } as any);

      const { result } = renderHook(() => useMonitoring(), { wrapper: createWrapper });

      await result.current.reloadData();

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MonitoringDetailPage from '../page';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useCampaignMonitoringData } from '@/lib/hooks/useCampaignMonitoringData';
import { useAnalysisPDFs } from '@/lib/hooks/useAnalysisPDFs';
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
import { usePDFDeleteMutation } from '@/lib/hooks/usePDFDeleteMutation';
import { useParams, useSearchParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';

jest.mock('@/context/AuthContext');
jest.mock('@/context/OrganizationContext');
jest.mock('@/lib/hooks/useCampaignMonitoringData');
jest.mock('@/lib/hooks/useAnalysisPDFs');
jest.mock('@/lib/hooks/useMonitoringReport');
jest.mock('@/lib/hooks/usePDFDeleteMutation');
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>;
const mockUseCampaignMonitoringData = useCampaignMonitoringData as jest.MockedFunction<typeof useCampaignMonitoringData>;
const mockUseAnalysisPDFs = useAnalysisPDFs as jest.MockedFunction<typeof useAnalysisPDFs>;
const mockUsePDFReportGenerator = usePDFReportGenerator as jest.MockedFunction<typeof usePDFReportGenerator>;
const mockUsePDFDeleteMutation = usePDFDeleteMutation as jest.MockedFunction<typeof usePDFDeleteMutation>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe('MonitoringDetailPage - Integration Tests', () => {
  let queryClient: QueryClient;

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

    mockUseParams.mockReturnValue({ campaignId: 'campaign-1' });
    mockUseSearchParams.mockReturnValue({ get: () => null } as any);

    mockUseAuth.mockReturnValue({
      user: { uid: 'user-123' },
    } as any);

    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'org-1' },
    } as any);

    mockUsePDFReportGenerator.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as any);

    mockUsePDFDeleteMutation.mockReturnValue({
      mutateAsync: jest.fn(),
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  describe('full page load and display', () => {
    it('should load and display monitoring data', async () => {
      const mockData = {
        campaign: {
          id: 'campaign-1',
          title: 'Integration Test Campaign',
          sentAt: Timestamp.fromDate(new Date('2024-01-15')),
          projectId: 'project-1',
        },
        sends: [{ id: 'send-1', recipientEmail: 'test@example.com' }],
        clippings: [{ id: 'clip-1', title: 'Test Clipping' }],
        suggestions: [{ id: 'sug-1', status: 'pending' }],
      };

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: { pdfs: [], folderLink: null },
        isLoading: false,
      } as any);

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Monitoring: Integration Test Campaign')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      mockUseCampaignMonitoringData.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      renderWithProviders(<MonitoringDetailPage />);

      expect(screen.getByText('Lade Monitoring-Daten...')).toBeInTheDocument();
    });

    it('should show error state when data loading fails', async () => {
      const error = new Error('Failed to load campaign data');

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

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load campaign data/)).toBeInTheDocument();
      });
    });
  });

  describe('tab switching flow', () => {
    it('should switch between tabs', async () => {
      const mockData = {
        campaign: {
          id: 'campaign-1',
          title: 'Test Campaign',
          sentAt: Timestamp.fromDate(new Date()),
          projectId: 'project-1',
        },
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

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });

      const performanceTab = screen.getByText('E-Mail Performance');
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(performanceTab.closest('button')).toHaveClass('text-[#005fab]');
      });
    });

    it('should load PDFs only when dashboard tab is active', async () => {
      const mockData = {
        campaign: {
          id: 'campaign-1',
          title: 'Test Campaign',
          sentAt: Timestamp.fromDate(new Date()),
          projectId: 'project-1',
        },
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

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(mockUseAnalysisPDFs).toHaveBeenCalledWith(
          'campaign-1',
          'org-1',
          'project-1',
          true
        );
      });
    });
  });

  describe('PDF export flow', () => {
    it('should trigger PDF export when button is clicked', async () => {
      const mockMutate = jest.fn();
      const mockData = {
        campaign: {
          id: 'campaign-1',
          title: 'Test Campaign',
          sentAt: Timestamp.fromDate(new Date()),
          projectId: 'project-1',
        },
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

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('PDF-Report')).toBeInTheDocument();
      });

      const pdfButton = screen.getByText('PDF-Report');
      fireEvent.click(pdfButton);

      expect(mockMutate).toHaveBeenCalledWith({
        campaignId: 'campaign-1',
        organizationId: 'org-1',
        userId: 'user-123',
      });
    });
  });

  describe('PDF list display', () => {
    it('should display generated PDFs in dashboard tab', async () => {
      const mockData = {
        campaign: {
          id: 'campaign-1',
          title: 'Test Campaign',
          sentAt: Timestamp.fromDate(new Date()),
          projectId: 'project-1',
        },
        sends: [],
        clippings: [],
        suggestions: [],
      };

      const mockPDFs = [
        {
          id: 'pdf-1',
          fileName: 'Report-Jan-2024.pdf',
          downloadUrl: 'url-1',
          createdAt: Timestamp.fromDate(new Date()),
        },
        {
          id: 'pdf-2',
          fileName: 'Report-Feb-2024.pdf',
          downloadUrl: 'url-2',
          createdAt: Timestamp.fromDate(new Date()),
        },
      ];

      mockUseCampaignMonitoringData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: {
          pdfs: mockPDFs,
          folderLink: '/dashboard/projects/project-1?tab=daten&folder=folder-1',
        },
        isLoading: false,
      } as any);

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Report-Jan-2024.pdf')).toBeInTheDocument();
        expect(screen.getByText('Report-Feb-2024.pdf')).toBeInTheDocument();
      });
    });

    it('should not display PDF section when no PDFs exist', async () => {
      const mockData = {
        campaign: {
          id: 'campaign-1',
          title: 'Test Campaign',
          sentAt: Timestamp.fromDate(new Date()),
          projectId: 'project-1',
        },
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

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(screen.queryByText('Generierte Reports')).not.toBeInTheDocument();
      });
    });
  });

  describe('error recovery flow', () => {
    it('should retry loading data when retry button is clicked', async () => {
      const mockRefetch = jest.fn();
      const error = new Error('Connection error');

      mockUseCampaignMonitoringData.mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
        refetch: mockRefetch,
      } as any);

      mockUseAnalysisPDFs.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any);

      renderWithProviders(<MonitoringDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Erneut versuchen');
      fireEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MonitoringDashboard } from './MonitoringDashboard';
import { MediaClipping } from '@/types/monitoring';
import { EmailCampaignSend } from '@/types/email';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';

// Mocks
jest.mock('@/context/OrganizationContext');
jest.mock('@/context/AuthContext');
jest.mock('@/lib/firebase/ave-settings-service');

// Mock Recharts (damit Charts nicht fehlschlagen)
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div />,
  Bar: () => <div />,
  Pie: ({ data }: any) => <div data-items={data?.length || 0} />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
}));

const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockAveSettingsService = aveSettingsService as jest.Mocked<typeof aveSettingsService>;

// Test Helper: QueryClient Wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Mock Firestore Timestamp
const createTimestamp = (date: Date) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
});

// Test-Daten
const mockClippings: MediaClipping[] = [
  {
    id: 'clip-1',
    publicationId: 'pub-1',
    organizationId: 'org-123',
    title: 'Article 1',
    content: 'Content 1',
    url: 'https://example.com/1',
    outletName: 'Outlet A',
    outletType: 'online',
    reach: 10000,
    sentiment: 'positive',
    publishedAt: createTimestamp(new Date('2025-01-15')) as any,
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
  },
  {
    id: 'clip-2',
    publicationId: 'pub-1',
    organizationId: 'org-123',
    title: 'Article 2',
    content: 'Content 2',
    url: 'https://example.com/2',
    outletName: 'Outlet B',
    outletType: 'print',
    reach: 50000,
    sentiment: 'neutral',
    publishedAt: createTimestamp(new Date('2025-01-15')) as any,
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
  },
];

const mockSends: EmailCampaignSend[] = [
  {
    id: 'send-1',
    campaignId: 'camp-1',
    recipientId: 'rec-1',
    recipientEmail: 'test1@example.com',
    status: 'opened',
    clippingId: 'clip-1',
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
  },
  {
    id: 'send-2',
    campaignId: 'camp-1',
    recipientId: 'rec-2',
    recipientEmail: 'test2@example.com',
    status: 'sent',
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
  },
];

const mockAVESettings = {
  id: 'ave-123',
  organizationId: 'org-123',
  userId: 'user-123',
  rates: { print: 5.0, online: 3.0, radio: 4.0, tv: 7.0 },
  createdAt: createTimestamp(new Date()) as any,
  updatedAt: createTimestamp(new Date()) as any,
};

describe('MonitoringDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default Mocks
    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'org-123', name: 'Test Org' } as any,
      setCurrentOrganization: jest.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { uid: 'user-123' } as any,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    mockAveSettingsService.getOrCreate.mockResolvedValue(mockAVESettings);
    mockAveSettingsService.calculateAVE.mockReturnValue(500);
  });

  describe('Empty State', () => {
    it('should render EmptyState when no clippings and no sends', () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MonitoringDashboard clippings={[]} sends={[]} />
        </QueryClientProvider>
      );

      expect(screen.getByText('Noch keine Daten für Analytics verfügbar')).toBeInTheDocument();
    });

    it('should not render charts when no data', () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MonitoringDashboard clippings={[]} sends={[]} />
        </QueryClientProvider>
      );

      expect(screen.queryByText('Performance-Übersicht')).not.toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  describe('Rendering with Data', () => {
    it('should render PerformanceMetrics component', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Performance-Übersicht')).toBeInTheDocument();
      });
    });

    it('should render TimelineChart component', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Veröffentlichungen über Zeit')).toBeInTheDocument();
      });
    });

    it('should render MediaDistributionChart component', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Medium-Verteilung')).toBeInTheDocument();
      });
    });

    it('should render SentimentChart component', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Sentiment-Verteilung')).toBeInTheDocument();
      });
    });

    it('should render TopOutletsChart component', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Top 5 Medien nach Reichweite')).toBeInTheDocument();
      });
    });
  });

  describe('Hook Integration', () => {
    it('should use useAVECalculation hook with correct params', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockAveSettingsService.getOrCreate).toHaveBeenCalledWith('org-123', 'user-123');
      });
    });

    it('should calculate total AVE using calculateAVE function', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockAveSettingsService.calculateAVE).toHaveBeenCalledTimes(2);
      });
    });

    it('should use useClippingStats hook for aggregations', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // totalClippings
      });
    });
  });

  describe('Context Dependencies', () => {
    it('should handle missing organization gracefully', async () => {
      mockUseOrganization.mockReturnValue({
        currentOrganization: undefined,
        setCurrentOrganization: jest.fn(),
      });

      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockAveSettingsService.getOrCreate).not.toHaveBeenCalled();
      });
    });

    it('should handle missing user gracefully', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<MonitoringDashboard clippings={mockClippings} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockAveSettingsService.getOrCreate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should render with only clippings (no sends)', async () => {
      render(<MonitoringDashboard clippings={mockClippings} sends={[]} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Performance-Übersicht')).toBeInTheDocument();
      });
    });

    it('should render with only sends (no clippings)', async () => {
      render(<MonitoringDashboard clippings={[]} sends={mockSends} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Performance-Übersicht')).toBeInTheDocument();
      });
    });
  });
});

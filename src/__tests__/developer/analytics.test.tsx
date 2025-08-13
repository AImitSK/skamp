// src/__tests__/developer/analytics.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsPage from '@/app/dashboard/developer/analytics/page';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Auth Context
const mockUser = {
  uid: 'test-uid',
  getIdToken: jest.fn().mockResolvedValue('mock-token')
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

// Mock Recharts components to avoid rendering issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>, 
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
}));

describe('Analytics Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders without crashing', async () => {
    render(<AnalyticsPage />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('API Analytics')).toBeInTheDocument();
    });
  });

  it('displays key metrics cards', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Requests heute')).toBeInTheDocument();
      expect(screen.getAllByText('Fehlerrate')[0]).toBeInTheDocument(); // Use first occurrence  
      expect(screen.getAllByText('Avg. Latenz')[0]).toBeInTheDocument(); // Use first occurrence
      expect(screen.getByText('Quota Verbrauch')).toBeInTheDocument();
    });
  });

  it('loads and displays mock data correctly', async () => {
    render(<AnalyticsPage />);

    // Wait for mock data to load - use exact formatted values
    await waitFor(() => {
      expect(screen.getByText('3.421')).toBeInTheDocument(); // requests today (German formatting)
      expect(screen.getByText('0.2%')).toBeInTheDocument(); // error rate
      expect(screen.getByText('89ms')).toBeInTheDocument(); // avg latency
    }, { timeout: 2000 });
  });

  it('displays API keys dropdown without crashing', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Alle API Keys')).toBeInTheDocument();
    });

    // Wait for API keys to load
    await waitFor(() => {
      const liveKeyOption = screen.getByText('Live API Key (cp_live_a3...)');
      expect(liveKeyOption).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays API key performance table without map error', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('API Key Performance')).toBeInTheDocument();
    });

    // Wait for API keys to load and verify table renders without error
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Should show mock API keys
      expect(screen.getByText('Live API Key')).toBeInTheDocument();
      expect(screen.getByText('Test API Key')).toBeInTheDocument();
      expect(screen.getByText('Dev API Key')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays charts without errors', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('handles time range selection', async () => {
    render(<AnalyticsPage />);

    const timeRangeSelect = await screen.findByDisplayValue('Letzte 24 Stunden');
    expect(timeRangeSelect).toBeInTheDocument();
  });

  it('calculates quota percentage correctly', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      // Mock data: 15847 used / 100000 limit = 15.8%
      expect(screen.getByText('15.8%')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows console logs for debugging', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Loading usage stats with mock data...');
      expect(consoleSpy).toHaveBeenCalledWith('Loading API keys with mock data...');
    }, { timeout: 2000 });
  });
});
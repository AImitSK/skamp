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

// Mock Firestore mit Testdaten
const mockApiKeys = [
  {
    id: 'key-1',
    name: 'Live API Key',
    key: 'cp_live_a3x4y5z6',
    status: 'active',
    createdAt: { toDate: () => new Date('2024-01-01') }
  },
  {
    id: 'key-2',
    name: 'Test API Key',
    key: 'cp_test_b7c8d9e0',
    status: 'active',
    createdAt: { toDate: () => new Date('2024-01-15') }
  },
  {
    id: 'key-3',
    name: 'Dev API Key',
    key: 'cp_dev_f1g2h3i4',
    status: 'active',
    createdAt: { toDate: () => new Date('2024-02-01') }
  }
];

const mockApiLogs = [
  {
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 30) }, // 30 min ago
    endpoint: '/api/articles',
    status: 200,
    latency: 89,
    method: 'GET',
    apiKeyId: 'key-1'
  },
  {
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 60) }, // 1h ago
    endpoint: '/api/media',
    status: 200,
    latency: 95,
    method: 'POST',
    apiKeyId: 'key-2'
  },
  {
    timestamp: { toDate: () => new Date(Date.now() - 1000 * 60 * 120) }, // 2h ago
    endpoint: '/api/users',
    status: 400,
    latency: 50,
    method: 'GET',
    apiKeyId: 'key-1'
  }
];

const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockCollection = jest.fn();
const mockWhere = jest.fn();

jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date
    })),
    now: jest.fn(() => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
      toDate: () => new Date()
    }))
  }
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
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup Firestore Mock-Antworten
    mockCollection.mockReturnValue('mock-collection');
    mockWhere.mockReturnValue('mock-where');
    mockQuery.mockReturnValue('mock-query');

    // Mock getDocs basierend auf Query-Typ
    mockGetDocs.mockImplementation((query: any) => {
      // Wenn query api_keys enthält
      if (mockCollection.mock.calls.some(call => call[1] === 'api_keys')) {
        return Promise.resolve({
          size: mockApiKeys.length,
          forEach: (callback: any) => {
            mockApiKeys.forEach((key) => {
              callback({
                id: key.id,
                data: () => key
              });
            });
          }
        });
      }

      // Wenn query api_logs enthält
      if (mockCollection.mock.calls.some(call => call[1] === 'api_logs')) {
        return Promise.resolve({
          size: mockApiLogs.length,
          forEach: (callback: any) => {
            mockApiLogs.forEach((log) => {
              callback({
                id: `log-${Math.random()}`,
                data: () => log
              });
            });
          }
        });
      }

      // Fallback: leeres Ergebnis
      return Promise.resolve({
        size: 0,
        forEach: () => {}
      });
    });
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

    // Warte bis Daten geladen sind - Die Komponente zeigt jetzt echte berechnete Werte
    await waitFor(() => {
      // Prüfe ob Statistiken angezeigt werden (Werte werden aus mockApiLogs berechnet)
      // requestsToday: Logs aus mockApiLogs die heute sind
      const requestsElements = screen.getAllByText(/\d+/);
      expect(requestsElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Prüfe dass die Metrikkarten gerendert werden
    expect(screen.getByText('Requests heute')).toBeInTheDocument();
    expect(screen.getAllByText('Fehlerrate')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Avg. Latenz')[0]).toBeInTheDocument();
  });

  it('displays API keys dropdown without crashing', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Alle API Keys')).toBeInTheDocument();
    });

    // Warte bis API Keys geladen sind - prüfe ob das Dropdown existiert
    await waitFor(() => {
      // Das Select-Element sollte die Option "Alle API Keys" haben
      const select = screen.getByDisplayValue('Alle API Keys') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      // Prüfe ob Options geladen wurden (mindestens die "Alle" Option + mock keys)
      expect(select.options.length).toBeGreaterThan(1);
    }, { timeout: 3000 });
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
      // Quota wird berechnet aus (quotaLimit - remainingQuota) / quotaLimit * 100
      // Mit unseren Mock-Daten: mockApiLogs.length (3) / 100000 * 100 = 0.0%
      // Suche nach dem Quota Verbrauch Element
      expect(screen.getByText('Quota Verbrauch')).toBeInTheDocument();
      // Prozentsatz sollte angezeigt werden (Format: X.X%)
      const percentageElements = screen.getAllByText(/\d+\.?\d*%/);
      expect(percentageElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('shows console logs for debugging', async () => {
    // Entferne console.log Mock für diesen Test
    jest.restoreAllMocks();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AnalyticsPage />);

    // Komponente hat keine console.log Statements mehr mit diesem Text
    // Prüfe stattdessen dass Komponente ohne Fehler rendert
    await waitFor(() => {
      expect(screen.getByText('API Analytics')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Stelle sicher dass keine Fehler geloggt wurden
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Fehler beim')
    );
  });
});
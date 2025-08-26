// src/__tests__/components/templates/TemplateAnalyticsDashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { TemplateAnalyticsDashboard } from '@/components/templates/TemplateAnalyticsDashboard';
import { TemplateUsageStats, TemplatePerformanceMetrics } from '@/types/pdf-template';

const mockUsageStats: TemplateUsageStats[] = [
  {
    templateId: 'modern-professional',
    templateName: 'Modern Professional',
    usageCount: 150,
    lastUsed: new Date('2024-01-15'),
    isDefault: true,
    isSystem: true,
    averageGenerationTime: 1200
  },
  {
    templateId: 'classic-elegant',
    templateName: 'Classic Elegant',
    usageCount: 89,
    lastUsed: new Date('2024-01-10'),
    isDefault: false,
    isSystem: true,
    averageGenerationTime: 1400
  },
  {
    templateId: 'custom-template-1',
    templateName: 'Custom Corporate',
    usageCount: 23,
    lastUsed: new Date('2024-01-05'),
    isDefault: false,
    isSystem: false,
    averageGenerationTime: 1800
  }
];

const mockPerformanceMetrics: TemplatePerformanceMetrics[] = [
  {
    templateId: 'modern-professional',
    averageRenderTime: 450,
    averagePdfGenerationTime: 1200,
    cacheHitRate: 85,
    errorRate: 2,
    totalUsages: 150,
    lastMetricsUpdate: new Date('2024-01-15')
  }
];

// Mock API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      usageStats: mockUsageStats,
      performanceMetrics: mockPerformanceMetrics
    })
  })
) as jest.Mock;

describe('TemplateAnalyticsDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders analytics dashboard with usage statistics', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Template-Analytics')).toBeInTheDocument();
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      expect(screen.getByText('150 Verwendungen')).toBeInTheDocument();
    });
  });

  it('displays performance metrics', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Performance-Metriken')).toBeInTheDocument();
      expect(screen.getByText('1.2s')).toBeInTheDocument(); // Average generation time
      expect(screen.getByText('85%')).toBeInTheDocument(); // Cache hit rate
    });
  });

  it('shows template usage ranking', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Beliebteste Templates')).toBeInTheDocument();
      
      const templates = screen.getAllByTestId(/template-ranking-item/);
      expect(templates).toHaveLength(3);
      
      // Should be sorted by usage count
      expect(templates[0]).toHaveTextContent('Modern Professional');
      expect(templates[1]).toHaveTextContent('Classic Elegant');
      expect(templates[2]).toHaveTextContent('Custom Corporate');
    });
  });

  it('allows filtering by time range', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="7d"
      />
    );

    const timeRangeSelect = screen.getByRole('combobox', { name: /zeitraum/i });
    fireEvent.change(timeRangeSelect, { target: { value: '90d' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/pdf-templates/analytics?organizationId=test-org&timeRange=90d',
        expect.any(Object)
      );
    });
  });

  it('displays template type breakdown', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Template-Typen')).toBeInTheDocument();
      expect(screen.getByText('System: 2')).toBeInTheDocument();
      expect(screen.getByText('Custom: 1')).toBeInTheDocument();
    });
  });

  it('shows error rate warnings', async () => {
    // Mock template with high error rate
    const highErrorTemplate = {
      ...mockPerformanceMetrics[0],
      errorRate: 15 // 15% error rate
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        usageStats: mockUsageStats,
        performanceMetrics: [highErrorTemplate]
      })
    });

    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/hohe fehlerrate/i)).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });
  });

  it('handles export functionality', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Template-Analytics')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /exportieren/i });
    fireEvent.click(exportButton);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/pdf-templates/analytics/export',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test-org')
      })
    );
  });

  it('displays loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    expect(screen.getByText(/analytics werden geladen/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Analytics failed'));

    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/fehler beim laden der analytics/i)).toBeInTheDocument();
    });
  });

  it('shows template recommendations', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Empfehlungen')).toBeInTheDocument();
      // Should recommend optimizing slow templates
      expect(screen.getByText(/custom corporate.*langsam/i)).toBeInTheDocument();
    });
  });

  it('supports drilling down into template details', async () => {
    render(
      <TemplateAnalyticsDashboard
        organizationId="test-org"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    const templateItem = screen.getByTestId('template-ranking-item-modern-professional');
    fireEvent.click(templateItem);

    await waitFor(() => {
      expect(screen.getByText('Template-Details')).toBeInTheDocument();
      expect(screen.getByText('Verwendungsverlauf')).toBeInTheDocument();
    });
  });
});
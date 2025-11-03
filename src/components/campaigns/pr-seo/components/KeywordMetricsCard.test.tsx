// src/components/campaigns/pr-seo/components/KeywordMetricsCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { KeywordMetricsCard } from './KeywordMetricsCard';
import type { KeywordMetrics } from '../types';

describe('KeywordMetricsCard', () => {
  const baseMetrics: KeywordMetrics = {
    keyword: 'Innovation',
    density: 1.5,
    occurrences: 3,
    inHeadline: true,
    inFirstParagraph: true,
    distribution: 'gut'
  };

  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render keyword name', () => {
    render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('Innovation')).toBeInTheDocument();
  });

  it('should render density with one decimal place', () => {
    render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('1.5%')).toBeInTheDocument();
  });

  it('should render occurrences count', () => {
    render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('should render distribution as "gut"', () => {
    render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('gut')).toBeInTheDocument();
  });

  it('should render distribution as "mittel" with orange styling', () => {
    const metrics = { ...baseMetrics, distribution: 'mittel' as const };
    const { container } = render(<KeywordMetricsCard metrics={metrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('mittel')).toBeInTheDocument();
    const distributionBadge = screen.getByText('mittel').closest('div');
    expect(distributionBadge).toHaveClass('bg-orange-50');
  });

  it('should render distribution as "schlecht" with red styling', () => {
    const metrics = { ...baseMetrics, distribution: 'schlecht' as const };
    const { container } = render(<KeywordMetricsCard metrics={metrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('schlecht')).toBeInTheDocument();
    const distributionBadge = screen.getByText('schlecht').closest('div');
    expect(distributionBadge).toHaveClass('bg-red-50');
  });

  it('should call onRemove when remove button is clicked', () => {
    render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    const removeButton = screen.getByRole('button', { name: /keyword entfernen/i });
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  it('should render KIAnalysisBox component', () => {
    render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('Bereit für Analyse')).toBeInTheDocument();
  });

  it('should pass isAnalyzing to KIAnalysisBox', () => {
    render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={true} onRemove={mockOnRemove} />);

    expect(screen.getByText('KI analysiert...')).toBeInTheDocument();
  });

  it('should render remove button with X icon', () => {
    const { container } = render(<KeywordMetricsCard metrics={baseMetrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    const removeButton = screen.getByRole('button', { name: /keyword entfernen/i });
    expect(removeButton).toBeInTheDocument();

    const icon = removeButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should format high density correctly', () => {
    const metrics = { ...baseMetrics, density: 10.567 };
    render(<KeywordMetricsCard metrics={metrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('10.6%')).toBeInTheDocument();
  });

  it('should display zero occurrences correctly', () => {
    const metrics = { ...baseMetrics, occurrences: 0 };
    render(<KeywordMetricsCard metrics={metrics} isAnalyzing={false} onRemove={mockOnRemove} />);

    expect(screen.getByText('0x')).toBeInTheDocument();
  });
});

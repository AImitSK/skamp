// src/components/campaigns/pr-seo/components/KIAnalysisBox.test.tsx

import { render, screen } from '@testing-library/react';
import { KIAnalysisBox } from './KIAnalysisBox';
import type { KeywordMetrics } from '../types';

describe('KIAnalysisBox', () => {
  const baseMetrics: KeywordMetrics = {
    keyword: 'Innovation',
    density: 1.5,
    occurrences: 3,
    inHeadline: true,
    inFirstParagraph: true,
    distribution: 'gut'
  };

  it('should show loading state when isLoading is true', () => {
    render(<KIAnalysisBox metrics={baseMetrics} isLoading={true} />);

    expect(screen.getByText('KI analysiert...')).toBeInTheDocument();
  });

  it('should show spinner when loading', () => {
    const { container } = render(<KIAnalysisBox metrics={baseMetrics} isLoading={true} />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show "Bereit für Analyse" when no AI data available', () => {
    render(<KIAnalysisBox metrics={baseMetrics} isLoading={false} />);

    expect(screen.getByText('Bereit für Analyse')).toBeInTheDocument();
  });

  it('should show semantic relevance when AI data available', () => {
    const metricsWithAI: KeywordMetrics = {
      ...baseMetrics,
      semanticRelevance: 85
    };

    render(<KIAnalysisBox metrics={metricsWithAI} isLoading={false} />);

    expect(screen.getByText('Relevanz:')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should show SparklesIcon when not loading', () => {
    const { container } = render(<KIAnalysisBox metrics={baseMetrics} isLoading={false} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should handle zero semantic relevance', () => {
    const metricsWithZero: KeywordMetrics = {
      ...baseMetrics,
      semanticRelevance: 0
    };

    render(<KIAnalysisBox metrics={metricsWithZero} isLoading={false} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should show relevance when targetAudience is present', () => {
    const metricsWithAudience: KeywordMetrics = {
      ...baseMetrics,
      semanticRelevance: 75,
      targetAudience: 'B2B'
    };

    render(<KIAnalysisBox metrics={metricsWithAudience} isLoading={false} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should show relevance when tonality is present', () => {
    const metricsWithTonality: KeywordMetrics = {
      ...baseMetrics,
      semanticRelevance: 90,
      tonality: 'Sachlich'
    };

    render(<KIAnalysisBox metrics={metricsWithTonality} isLoading={false} />);

    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('should apply correct CSS classes', () => {
    const { container } = render(<KIAnalysisBox metrics={baseMetrics} isLoading={false} />);

    const box = container.firstChild;
    expect(box).toHaveClass('inline-flex', 'items-center', 'gap-2', 'bg-purple-50', 'text-purple-700');
  });
});

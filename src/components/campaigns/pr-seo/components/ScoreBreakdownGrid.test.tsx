// src/components/campaigns/pr-seo/components/ScoreBreakdownGrid.test.tsx

import { render, screen } from '@testing-library/react';
import { ScoreBreakdownGrid } from './ScoreBreakdownGrid';
import type { PRScoreBreakdown } from '../types';

describe('ScoreBreakdownGrid', () => {
  const baseBreakdown: PRScoreBreakdown = {
    headline: 85,
    keywords: 80,
    structure: 75,
    relevance: 70,
    concreteness: 65,
    engagement: 80,
    social: 60
  };

  it('should render all four score categories', () => {
    render(<ScoreBreakdownGrid breakdown={baseBreakdown} />);

    expect(screen.getByText(/Headline: 85/)).toBeInTheDocument();
    expect(screen.getByText(/Keywords: 80/)).toBeInTheDocument();
    expect(screen.getByText(/Struktur: 75/)).toBeInTheDocument();
    expect(screen.getByText(/Social: 60/)).toBeInTheDocument();
  });

  it('should show green indicator for high scores (>= 70)', () => {
    const { container } = render(<ScoreBreakdownGrid breakdown={baseBreakdown} />);

    const indicators = container.querySelectorAll('.bg-green-500');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('should show orange indicator for medium scores (40-69)', () => {
    const lowBreakdown = {
      ...baseBreakdown,
      social: 50
    };

    const { container } = render(<ScoreBreakdownGrid breakdown={lowBreakdown} />);

    const indicators = container.querySelectorAll('.bg-orange-500');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('should show red indicator for low scores (< 40)', () => {
    const lowBreakdown = {
      ...baseBreakdown,
      social: 30
    };

    const { container } = render(<ScoreBreakdownGrid breakdown={lowBreakdown} />);

    const indicators = container.querySelectorAll('.bg-red-500');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('should round structure score correctly', () => {
    const breakdown = { ...baseBreakdown, structure: 75.7 };
    render(<ScoreBreakdownGrid breakdown={breakdown} />);

    expect(screen.getByText(/Struktur: 76/)).toBeInTheDocument();
  });

  it('should round social score correctly', () => {
    const breakdown = { ...baseBreakdown, social: 60.3 };
    render(<ScoreBreakdownGrid breakdown={breakdown} />);

    expect(screen.getByText(/Social: 60/)).toBeInTheDocument();
  });

  it('should use grid layout with 4 columns', () => {
    const { container } = render(<ScoreBreakdownGrid breakdown={baseBreakdown} />);

    const grid = container.querySelector('.grid-cols-4');
    expect(grid).toBeInTheDocument();
  });

  it('should display perfect scores correctly', () => {
    const perfectBreakdown = {
      headline: 100,
      keywords: 100,
      structure: 100,
      relevance: 100,
      concreteness: 100,
      engagement: 100,
      social: 100
    };

    render(<ScoreBreakdownGrid breakdown={perfectBreakdown} />);

    expect(screen.getByText(/Headline: 100/)).toBeInTheDocument();
    expect(screen.getByText(/Keywords: 100/)).toBeInTheDocument();
  });

  it('should display zero scores correctly', () => {
    const zeroBreakdown = {
      headline: 0,
      keywords: 0,
      structure: 0,
      relevance: 0,
      concreteness: 0,
      engagement: 0,
      social: 0
    };

    render(<ScoreBreakdownGrid breakdown={zeroBreakdown} />);

    expect(screen.getByText(/Headline: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Keywords: 0/)).toBeInTheDocument();
  });
});

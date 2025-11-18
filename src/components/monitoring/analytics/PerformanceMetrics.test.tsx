import React from 'react';
import { render, screen } from '@testing-library/react';
import { PerformanceMetrics } from './PerformanceMetrics';

describe('PerformanceMetrics Component', () => {
  const defaultProps = {
    totalClippings: 42,
    totalReach: 150000,
    totalAVE: 5000,
    openRate: 65,
    conversionRate: 45,
  };

  describe('Rendering', () => {
    it('should render all 5 metric cards when totalAVE > 0', () => {
      render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('Veröffentlichungen')).toBeInTheDocument();
      expect(screen.getByText('Gesamtreichweite')).toBeInTheDocument();
      expect(screen.getByText('Gesamt-AVE')).toBeInTheDocument();
      expect(screen.getByText('Öffnungsrate')).toBeInTheDocument();
      expect(screen.getByText('Conversion')).toBeInTheDocument();
    });

    it('should render only 4 metric cards when totalAVE = 0', () => {
      render(<PerformanceMetrics {...defaultProps} totalAVE={0} />);

      expect(screen.getByText('Veröffentlichungen')).toBeInTheDocument();
      expect(screen.getByText('Gesamtreichweite')).toBeInTheDocument();
      expect(screen.queryByText('Gesamt-AVE')).not.toBeInTheDocument();
      expect(screen.getByText('Öffnungsrate')).toBeInTheDocument();
      expect(screen.getByText('Conversion')).toBeInTheDocument();
    });

    it('should render heading with icon', () => {
      const { container } = render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('Performance-Übersicht')).toBeInTheDocument();

      const icon = container.querySelector('svg.text-\\[\\#005fab\\]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Values Formatting', () => {
    it('should display totalClippings as string', () => {
      render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should format totalReach with locale separator', () => {
      render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('150.000')).toBeInTheDocument();
    });

    it('should format totalAVE with Euro symbol', () => {
      render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('5.000 €')).toBeInTheDocument();
    });

    it('should display openRate with percentage symbol', () => {
      render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('should display conversionRate with percentage symbol', () => {
      render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should display conversion subtitle', () => {
      render(<PerformanceMetrics {...defaultProps} />);

      expect(screen.getByText('Öffnungen → Clippings')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      render(
        <PerformanceMetrics
          totalClippings={0}
          totalReach={0}
          totalAVE={0}
          openRate={0}
          conversionRate={0}
        />
      );

      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    });

    it('should handle large numbers correctly', () => {
      render(
        <PerformanceMetrics
          {...defaultProps}
          totalReach={9999999}
          totalAVE={1234567}
        />
      );

      expect(screen.getByText('9.999.999')).toBeInTheDocument();
      expect(screen.getByText('1.234.567 €')).toBeInTheDocument();
    });

    it('should handle decimal AVE values (should round to 0 decimals)', () => {
      render(<PerformanceMetrics {...defaultProps} totalAVE={5432.89} />);

      expect(screen.getByText('5.433 €')).toBeInTheDocument();
    });
  });

  describe('React.memo Optimization', () => {
    it('should not re-render when props are the same', () => {
      const { rerender } = render(<PerformanceMetrics {...defaultProps} />);

      const firstRender = screen.getByText('Performance-Übersicht');

      rerender(<PerformanceMetrics {...defaultProps} />);

      const secondRender = screen.getByText('Performance-Übersicht');

      expect(firstRender).toBe(secondRender);
    });
  });
});

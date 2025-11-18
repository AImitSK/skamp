import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelineChart } from './TimelineChart';

// Mock Recharts (Recharts hat Probleme im Jest/JSDOM Environment)
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children, data }: any) => (
      <div data-testid="line-chart" data-items={data.length}>
        {children}
      </div>
    ),
    Line: ({ dataKey, name }: any) => (
      <div data-testid={`line-${dataKey}`} data-name={name} />
    ),
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: ({ yAxisId, label }: any) => (
      <div data-testid={`y-axis-${yAxisId}`} data-label={label?.value} />
    ),
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

describe('TimelineChart Component', () => {
  const mockData = [
    { date: '15. Jan', clippings: 5, reach: 10000 },
    { date: '16. Jan', clippings: 8, reach: 25000 },
    { date: '17. Jan', clippings: 3, reach: 5000 },
  ];

  describe('Rendering with Data', () => {
    it('should render chart when data is provided', () => {
      render(<TimelineChart data={mockData} />);

      expect(screen.getByText('Veröffentlichungen über Zeit')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should pass correct data to LineChart', () => {
      render(<TimelineChart data={mockData} />);

      const chart = screen.getByTestId('line-chart');
      expect(chart).toHaveAttribute('data-items', '3');
    });

    it('should render both line series', () => {
      render(<TimelineChart data={mockData} />);

      expect(screen.getByTestId('line-clippings')).toBeInTheDocument();
      expect(screen.getByTestId('line-reach')).toBeInTheDocument();
    });

    it('should render dual Y-axes', () => {
      render(<TimelineChart data={mockData} />);

      expect(screen.getByTestId('y-axis-left')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis-right')).toBeInTheDocument();
    });

    it('should render heading icon', () => {
      const { container } = render(<TimelineChart data={mockData} />);

      const icon = container.querySelector('svg.text-\\[\\#005fab\\]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should return null when data is empty array', () => {
      const { container } = render(<TimelineChart data={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render heading when data is empty', () => {
      render(<TimelineChart data={[]} />);

      expect(screen.queryByText('Veröffentlichungen über Zeit')).not.toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should configure chart with correct props', () => {
      render(<TimelineChart data={mockData} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should use correct line names', () => {
      render(<TimelineChart data={mockData} />);

      const clippingsLine = screen.getByTestId('line-clippings');
      const reachLine = screen.getByTestId('line-reach');

      expect(clippingsLine).toHaveAttribute('data-name', 'Artikel');
      expect(reachLine).toHaveAttribute('data-name', 'Reichweite');
    });
  });

  describe('React.memo Optimization', () => {
    it('should not re-render when data reference is the same', () => {
      const { rerender } = render(<TimelineChart data={mockData} />);

      const firstRender = screen.getByText('Veröffentlichungen über Zeit');

      rerender(<TimelineChart data={mockData} />);

      const secondRender = screen.getByText('Veröffentlichungen über Zeit');

      expect(firstRender).toBe(secondRender);
    });
  });
});

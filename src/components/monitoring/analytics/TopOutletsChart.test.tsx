import React from 'react';
import { render, screen } from '@testing-library/react';
import { TopOutletsChart } from './TopOutletsChart';

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children, data, layout }: any) => (
      <div data-testid="bar-chart" data-items={data.length} data-layout={layout}>
        {children}
      </div>
    ),
    Bar: ({ dataKey, name, fill }: any) => (
      <div data-testid={`bar-${dataKey}`} data-name={name} data-fill={fill} />
    ),
    XAxis: ({ type }: any) => <div data-testid="x-axis" data-type={type} />,
    YAxis: ({ type, dataKey }: any) => (
      <div data-testid="y-axis" data-type={type} data-datakey={dataKey} />
    ),
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

describe('TopOutletsChart Component', () => {
  const mockData = [
    { name: 'Spiegel Online', reach: 150000, count: 12 },
    { name: 'FAZ', reach: 120000, count: 8 },
    { name: 'Süddeutsche', reach: 100000, count: 15 },
    { name: 'Zeit Online', reach: 80000, count: 6 },
    { name: 'Handelsblatt', reach: 50000, count: 4 },
  ];

  describe('Rendering with Data', () => {
    it('should render chart when data is provided', () => {
      render(<TopOutletsChart data={mockData} />);

      expect(screen.getByText('Top 5 Medien nach Reichweite')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should pass correct data to BarChart', () => {
      render(<TopOutletsChart data={mockData} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-items', '5');
      expect(chart).toHaveAttribute('data-layout', 'vertical');
    });

    it('should render Bar component with correct configuration', () => {
      render(<TopOutletsChart data={mockData} />);

      const bar = screen.getByTestId('bar-reach');
      expect(bar).toHaveAttribute('data-name', 'Reichweite');
      expect(bar).toHaveAttribute('data-fill', '#005fab');
    });

    it('should render axes with correct configuration', () => {
      render(<TopOutletsChart data={mockData} />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-type', 'number');

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-type', 'category');
      expect(yAxis).toHaveAttribute('data-datakey', 'name');
    });

    it('should render heading icon', () => {
      const { container } = render(<TopOutletsChart data={mockData} />);

      const icon = container.querySelector('svg.text-\\[\\#005fab\\]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should return null when data is empty array', () => {
      const { container } = render(<TopOutletsChart data={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render heading when data is empty', () => {
      render(<TopOutletsChart data={[]} />);

      expect(screen.queryByText('Top 5 Medien nach Reichweite')).not.toBeInTheDocument();
    });
  });

  describe('Variable Data Lengths', () => {
    it('should handle less than 5 outlets', () => {
      const shortData = mockData.slice(0, 2);

      render(<TopOutletsChart data={shortData} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-items', '2');
    });

    it('should handle exactly 1 outlet', () => {
      const singleData = [mockData[0]];

      render(<TopOutletsChart data={singleData} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-items', '1');
    });
  });

  describe('React.memo Optimization', () => {
    it('should not re-render when data reference is the same', () => {
      const { rerender } = render(<TopOutletsChart data={mockData} />);

      const firstRender = screen.getByText('Top 5 Medien nach Reichweite');

      rerender(<TopOutletsChart data={mockData} />);

      const secondRender = screen.getByText('Top 5 Medien nach Reichweite');

      expect(firstRender).toBe(secondRender);
    });
  });
});

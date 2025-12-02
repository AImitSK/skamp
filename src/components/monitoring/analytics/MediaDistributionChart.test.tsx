import React from 'react';
import { render, screen } from '@testing-library/react';
import { MediaDistributionChart } from './MediaDistributionChart';

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data, dataKey, nameKey }: any) => (
      <div data-testid="pie" data-items={data.length} data-datakey={dataKey} data-namekey={nameKey}>
        {data.map((_: any, index: number) => (
          <div key={index} data-testid={`pie-cell-${index}`} />
        ))}
      </div>
    ),
    Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

describe('MediaDistributionChart Component', () => {
  const mockData = [
    { name: 'Online', count: 15, reach: 50000 },
    { name: 'Print', count: 8, reach: 120000 },
    { name: 'Radio', count: 3, reach: 25000 },
  ];

  describe('Rendering with Data', () => {
    it('should render chart when data is provided', () => {
      render(<MediaDistributionChart data={mockData} />);

      expect(screen.getByText('Medium-Verteilung')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should pass correct data to Pie component', () => {
      render(<MediaDistributionChart data={mockData} />);

      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-items', '3');
      expect(pie).toHaveAttribute('data-datakey', 'count');
      expect(pie).toHaveAttribute('data-namekey', 'name');
    });

    it('should render legend items with correct labels and counts', () => {
      render(<MediaDistributionChart data={mockData} />);

      // Labels enthalten jetzt Emojis durch getOutletTypeLabel()
      expect(screen.getByText('💻 Online: 15')).toBeInTheDocument();
      expect(screen.getByText('📰 Print: 8')).toBeInTheDocument();
      // Radio hat kein spezifisches Emoji-Mapping, bleibt als Text
      expect(screen.getByText('Radio: 3')).toBeInTheDocument();
    });

    it('should render colored legend boxes', () => {
      const { container } = render(<MediaDistributionChart data={mockData} />);

      const colorBoxes = container.querySelectorAll('.w-3.h-3.rounded-sm');
      expect(colorBoxes).toHaveLength(3);
    });

    it('should render heading icon', () => {
      const { container } = render(<MediaDistributionChart data={mockData} />);

      const icon = container.querySelector('svg.text-\\[\\#005fab\\]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should return null when data is empty array', () => {
      const { container } = render(<MediaDistributionChart data={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render heading when data is empty', () => {
      render(<MediaDistributionChart data={[]} />);

      expect(screen.queryByText('Medium-Verteilung')).not.toBeInTheDocument();
    });
  });

  describe('Color Cycling', () => {
    it('should cycle colors when more items than colors', () => {
      const manyItems = Array.from({ length: 7 }, (_, i) => ({
        name: `Medium ${i}`,
        count: i + 1,
        reach: (i + 1) * 1000,
      }));

      render(<MediaDistributionChart data={manyItems} />);

      const legendItems = screen.getAllByText(/Medium \d+: \d+/);
      expect(legendItems).toHaveLength(7);
    });
  });

  describe('React.memo Optimization', () => {
    it('should not re-render when data reference is the same', () => {
      const { rerender } = render(<MediaDistributionChart data={mockData} />);

      const firstRender = screen.getByText('Medium-Verteilung');

      rerender(<MediaDistributionChart data={mockData} />);

      const secondRender = screen.getByText('Medium-Verteilung');

      expect(firstRender).toBe(secondRender);
    });
  });
});

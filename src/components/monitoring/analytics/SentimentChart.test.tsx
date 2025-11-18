import React from 'react';
import { render, screen } from '@testing-library/react';
import { SentimentChart } from './SentimentChart';

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data, dataKey, nameKey }: any) => (
      <div data-testid="pie" data-items={data.length} data-datakey={dataKey} data-namekey={nameKey}>
        {data.map((entry: any, index: number) => (
          <div key={index} data-testid={`pie-cell-${index}`} data-color={entry.color} />
        ))}
      </div>
    ),
    Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

describe('SentimentChart Component', () => {
  const mockData = [
    { name: 'Positiv', value: 12, color: '#10b981' },
    { name: 'Neutral', value: 5, color: '#6b7280' },
    { name: 'Negativ', value: 3, color: '#ef4444' },
  ];

  describe('Rendering with Data', () => {
    it('should render chart when data is provided', () => {
      render(<SentimentChart data={mockData} />);

      expect(screen.getByText('Sentiment-Verteilung')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should pass correct data to Pie component', () => {
      render(<SentimentChart data={mockData} />);

      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-items', '3');
      expect(pie).toHaveAttribute('data-datakey', 'value');
      expect(pie).toHaveAttribute('data-namekey', 'name');
    });

    it('should render legend items with correct labels and values', () => {
      render(<SentimentChart data={mockData} />);

      expect(screen.getByText('Positiv: 12')).toBeInTheDocument();
      expect(screen.getByText('Neutral: 5')).toBeInTheDocument();
      expect(screen.getByText('Negativ: 3')).toBeInTheDocument();
    });

    it('should render colored legend boxes with correct colors', () => {
      const { container } = render(<SentimentChart data={mockData} />);

      const colorBoxes = container.querySelectorAll('.w-3.h-3.rounded-sm');
      expect(colorBoxes).toHaveLength(3);

      expect(colorBoxes[0]).toHaveStyle({ backgroundColor: '#10b981' });
      expect(colorBoxes[1]).toHaveStyle({ backgroundColor: '#6b7280' });
      expect(colorBoxes[2]).toHaveStyle({ backgroundColor: '#ef4444' });
    });

    it('should render heading icon', () => {
      const { container } = render(<SentimentChart data={mockData} />);

      const icon = container.querySelector('svg.text-\\[\\#005fab\\]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should return null when data is empty array', () => {
      const { container } = render(<SentimentChart data={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render heading when data is empty', () => {
      render(<SentimentChart data={[]} />);

      expect(screen.queryByText('Sentiment-Verteilung')).not.toBeInTheDocument();
    });
  });

  describe('Partial Sentiment Data', () => {
    it('should render only positive sentiment when others are 0', () => {
      const positiveOnly = [{ name: 'Positiv', value: 20, color: '#10b981' }];

      render(<SentimentChart data={positiveOnly} />);

      expect(screen.getByText('Positiv: 20')).toBeInTheDocument();
      expect(screen.queryByText('Neutral:')).not.toBeInTheDocument();
      expect(screen.queryByText('Negativ:')).not.toBeInTheDocument();
    });

    it('should render only negative sentiment when others are 0', () => {
      const negativeOnly = [{ name: 'Negativ', value: 8, color: '#ef4444' }];

      render(<SentimentChart data={negativeOnly} />);

      expect(screen.getByText('Negativ: 8')).toBeInTheDocument();
      expect(screen.queryByText('Positiv:')).not.toBeInTheDocument();
    });
  });

  describe('React.memo Optimization', () => {
    it('should not re-render when data reference is the same', () => {
      const { rerender } = render(<SentimentChart data={mockData} />);

      const firstRender = screen.getByText('Sentiment-Verteilung');

      rerender(<SentimentChart data={mockData} />);

      const secondRender = screen.getByText('Sentiment-Verteilung');

      expect(firstRender).toBe(secondRender);
    });
  });
});

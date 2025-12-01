import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render error message', () => {
      const error = new Error('Failed to load data');

      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText(/Failed to load data/)).toBeInTheDocument();
    });

    it('should render retry button', () => {
      const error = new Error('Test error');

      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should call onRetry when retry button is clicked', () => {
      const error = new Error('Test error');

      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      const retryButton = screen.getByText('Erneut versuchen');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      const error = new Error('Test error');

      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      expect((ErrorState as any).$$typeof).toBeDefined();
    });
  });
});

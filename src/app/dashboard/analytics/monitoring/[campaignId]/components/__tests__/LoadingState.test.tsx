import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  describe('rendering', () => {
    it('should render loading text', () => {
      render(<LoadingState />);

      expect(screen.getByText('Lade Monitoring-Daten...')).toBeInTheDocument();
    });

    it('should render loading spinner', () => {
      const { container } = render(<LoadingState />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should be a memoized component', () => {
      render(<LoadingState />);

      expect((LoadingState as any).type).toBeDefined();
    });
  });
});

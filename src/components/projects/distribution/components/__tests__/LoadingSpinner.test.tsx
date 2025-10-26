// src/components/projects/distribution/components/__tests__/LoadingSpinner.test.tsx

import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default message', () => {
    render(<LoadingSpinner />);

    expect(screen.getByText('Lade...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingSpinner message="Daten werden geladen..." />);

    expect(screen.getByText('Daten werden geladen...')).toBeInTheDocument();
  });

  it('should render spinner animation', () => {
    const { container } = render(<LoadingSpinner />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('border-primary');
  });
});

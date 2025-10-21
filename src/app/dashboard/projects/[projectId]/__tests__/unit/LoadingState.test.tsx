// src/app/dashboard/projects/[projectId]/__tests__/unit/LoadingState.test.tsx
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../../components/shared/LoadingState';

describe('LoadingState', () => {
  it('should render default loading message', () => {
    render(<LoadingState />);

    expect(screen.getByText('Projekt wird geladen...')).toBeInTheDocument();
  });

  it('should render custom loading message', () => {
    render(<LoadingState message="Daten werden geladen..." />);

    expect(screen.getByText('Daten werden geladen...')).toBeInTheDocument();
    expect(screen.queryByText('Projekt wird geladen...')).not.toBeInTheDocument();
  });

  it('should render loading spinner', () => {
    const { container } = render(<LoadingState />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('rounded-full');
    expect(spinner).toHaveClass('border-b-2');
    expect(spinner).toHaveClass('border-blue-600');
  });

  it('should center content vertically and horizontally', () => {
    const { container } = render(<LoadingState />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });
});

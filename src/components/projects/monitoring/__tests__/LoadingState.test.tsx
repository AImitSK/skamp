import { render, screen } from '@testing-library/react';
import LoadingState from '../LoadingState';

describe('LoadingState', () => {
  it('should render with default message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Lädt...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingState message="Lade Monitoring-Daten..." />);
    expect(screen.getByText('Lade Monitoring-Daten...')).toBeInTheDocument();
  });

  it('should render loading spinner', () => {
    const { container } = render(<LoadingState />);
    const spinner = container.querySelector('.animate-spin');

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-blue-600');
  });

  it('should apply custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />);
    const wrapper = container.firstChild;

    expect(wrapper).toHaveClass('custom-class');
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center', 'h-64');
  });
});

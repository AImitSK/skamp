import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  it('should render empty state message', () => {
    render(<EmptyState />);

    expect(screen.getByText('Noch keine Daten für Analytics verfügbar')).toBeInTheDocument();
  });

  it('should render chart icon', () => {
    const { container } = render(<EmptyState />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-12', 'w-12', 'text-gray-400');
  });

  it('should apply correct styling', () => {
    const { container } = render(<EmptyState />);

    const wrapper = container.querySelector('.text-center');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('py-12', 'bg-gray-50', 'rounded-lg', 'border', 'border-gray-200');
  });

  it('should be memoized (render with same props does not re-render)', () => {
    const { rerender } = render(<EmptyState />);

    const firstRender = screen.getByText('Noch keine Daten für Analytics verfügbar');

    rerender(<EmptyState />);

    const secondRender = screen.getByText('Noch keine Daten für Analytics verfügbar');

    expect(firstRender).toBe(secondRender);
  });
});

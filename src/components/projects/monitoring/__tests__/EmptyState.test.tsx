import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';
import { ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';

describe('EmptyState', () => {
  it('should render title and description', () => {
    render(
      <EmptyState
        title="Test Title"
        description="Test Description"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should render with default icon (ChartBarIcon)', () => {
    const { container } = render(
      <EmptyState
        title="Test Title"
        description="Test Description"
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-12', 'w-12', 'text-gray-400');
  });

  it('should render with custom icon', () => {
    render(
      <EmptyState
        title="Test Title"
        description="Test Description"
        icon={ClockIcon}
      />
    );

    const icon = screen.getByText('Test Title').parentElement?.parentElement?.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <EmptyState
        title="Test Title"
        description="Test Description"
        className="custom-class"
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
    expect(wrapper).toHaveClass('text-center', 'py-12', 'bg-gray-50');
  });
});

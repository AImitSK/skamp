// src/app/dashboard/library/editors/components/shared/__tests__/EmptyState.test.tsx
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';
import { UserIcon, InboxIcon } from '@heroicons/react/24/outline';

describe('EmptyState Component', () => {
  it('renders with title and description', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adjusting your search or filters"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
  });

  it('renders with default icon (UserIcon)', () => {
    const { container } = render(
      <EmptyState
        title="Empty"
        description="No data"
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-12', 'w-12', 'text-zinc-400');
  });

  it('renders with custom icon', () => {
    const { container } = render(
      <EmptyState
        icon={InboxIcon}
        title="Empty inbox"
        description="No messages"
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-12', 'w-12', 'text-zinc-400');
  });

  it('applies correct styling classes', () => {
    const { container } = render(
      <EmptyState
        title="Test"
        description="Description"
      />
    );

    const wrapper = container.querySelector('.text-center.py-12');
    expect(wrapper).toBeInTheDocument();

    const title = screen.getByText('Test');
    expect(title).toHaveClass('text-sm', 'font-medium', 'text-zinc-900');

    const description = screen.getByText('Description');
    expect(description).toHaveClass('text-sm', 'text-zinc-500');
  });
});

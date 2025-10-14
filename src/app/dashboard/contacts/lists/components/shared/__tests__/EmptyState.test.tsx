// src/app/dashboard/contacts/lists/components/shared/__tests__/EmptyState.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { UsersIcon } from '@heroicons/react/24/outline';

describe('EmptyState Component', () => {
  it('renders with icon, title, and description', () => {
    render(
      <EmptyState
        icon={UsersIcon}
        title="No Data"
        description="There is no data to display"
      />
    );

    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('There is no data to display')).toBeInTheDocument();
  });

  it('renders without action button', () => {
    render(
      <EmptyState
        icon={UsersIcon}
        title="Empty"
        description="Nothing here"
      />
    );

    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders with action button and handles click', () => {
    const handleAction = jest.fn();

    render(
      <EmptyState
        icon={UsersIcon}
        title="No Items"
        description="Create your first item"
        action={{
          label: 'Create Item',
          onClick: handleAction,
        }}
      />
    );

    const actionButton = screen.getByText('Create Item');
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders action button with icon', () => {
    render(
      <EmptyState
        icon={UsersIcon}
        title="No Items"
        description="Create your first item"
        action={{
          label: 'Create',
          onClick: jest.fn(),
          icon: UsersIcon,
        }}
      />
    );

    expect(screen.getByText('Create')).toBeInTheDocument();
  });
});

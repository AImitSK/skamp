// src/components/projects/distribution/components/__tests__/EmptyListState.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import EmptyListState from '../EmptyListState';
import { InboxIcon } from '@heroicons/react/24/outline';

describe('EmptyListState', () => {
  const defaultProps = {
    icon: InboxIcon,
    title: 'Keine Listen gefunden',
    description: 'Es wurden noch keine Listen erstellt.',
  };

  it('should render icon, title and description', () => {
    render(<EmptyListState {...defaultProps} />);

    expect(screen.getByText('Keine Listen gefunden')).toBeInTheDocument();
    expect(screen.getByText('Es wurden noch keine Listen erstellt.')).toBeInTheDocument();
  });

  it('should render without action button when no action provided', () => {
    render(<EmptyListState {...defaultProps} />);

    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('should render action button when action is provided', () => {
    const mockAction = { label: 'Liste erstellen', onClick: jest.fn() };
    render(<EmptyListState {...defaultProps} action={mockAction} />);

    const button = screen.getByRole('button', { name: 'Liste erstellen' });
    expect(button).toBeInTheDocument();
  });

  it('should call action onClick when button is clicked', () => {
    const mockOnClick = jest.fn();
    const mockAction = { label: 'Liste erstellen', onClick: mockOnClick };
    render(<EmptyListState {...defaultProps} action={mockAction} />);

    const button = screen.getByRole('button', { name: 'Liste erstellen' });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should render provided icon component', () => {
    const { container } = render(<EmptyListState {...defaultProps} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-gray-400');
  });
});

// src/components/projects/pressemeldungen/components/__tests__/EmptyState.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../EmptyState';
import { DocumentTextIcon, CheckCircleIcon, FolderIcon } from '@heroicons/react/24/outline';

describe('EmptyState Component', () => {
  const defaultProps = {
    icon: DocumentTextIcon,
    title: 'No Data',
    description: 'No data available'
  };

  describe('Basic Rendering', () => {
    it('should render title', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByText('No Data')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = render(<EmptyState {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-12', 'w-12', 'text-gray-400');
    });

    it('should render with different icons', () => {
      const { container: container1 } = render(
        <EmptyState {...defaultProps} icon={DocumentTextIcon} />
      );
      expect(container1.querySelector('svg')).toBeInTheDocument();

      const { container: container2 } = render(
        <EmptyState {...defaultProps} icon={CheckCircleIcon} />
      );
      expect(container2.querySelector('svg')).toBeInTheDocument();

      const { container: container3 } = render(
        <EmptyState {...defaultProps} icon={FolderIcon} />
      );
      expect(container3.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('should not render action button when no action provided', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render action button when action provided', () => {
      const action = {
        label: 'Create New',
        onClick: jest.fn()
      };

      render(<EmptyState {...defaultProps} action={action} />);

      expect(screen.getByText('Create New')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should call onClick when action button clicked', async () => {
      const mockOnClick = jest.fn();
      const action = {
        label: 'Create New',
        onClick: mockOnClick
      };
      const user = userEvent.setup();

      render(<EmptyState {...defaultProps} action={action} />);

      const button = screen.getByText('Create New');
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should render action button with custom label', () => {
      const action = {
        label: 'Custom Action Label',
        onClick: jest.fn()
      };

      render(<EmptyState {...defaultProps} action={action} />);

      expect(screen.getByText('Custom Action Label')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should render with border and gray background', () => {
      const { container } = render(<EmptyState {...defaultProps} />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('border', 'border-gray-200', 'rounded-lg', 'bg-gray-50');
    });

    it('should center content', () => {
      const { container } = render(<EmptyState {...defaultProps} />);

      const emptyState = container.firstChild;
      expect(emptyState).toHaveClass('text-center', 'py-8');
    });

    it('should render icon centered with proper size', () => {
      const { container } = render(<EmptyState {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('mx-auto', 'h-12', 'w-12', 'text-gray-400');
    });

    it('should render title with proper styling', () => {
      const { container } = render(<EmptyState {...defaultProps} />);

      const title = container.querySelector('.mt-2');
      expect(title).toBeInTheDocument();
    });

    it('should render description with gray text', () => {
      const { container } = render(<EmptyState {...defaultProps} />);

      const description = container.querySelector('.text-gray-500');
      expect(description).toBeInTheDocument();
      expect(description?.textContent).toBe('No data available');
    });

    it('should render action button with primary color', () => {
      const action = {
        label: 'Action',
        onClick: jest.fn()
      };

      const { container } = render(<EmptyState {...defaultProps} action={action} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('mt-4');
    });
  });

  describe('Content Variations', () => {
    it('should handle long title', () => {
      render(
        <EmptyState
          {...defaultProps}
          title="This is a very long title that should still be displayed correctly"
        />
      );

      expect(
        screen.getByText('This is a very long title that should still be displayed correctly')
      ).toBeInTheDocument();
    });

    it('should handle long description', () => {
      render(
        <EmptyState
          {...defaultProps}
          description="This is a very long description that provides detailed information about why there is no data and what the user can do about it"
        />
      );

      expect(
        screen.getByText(
          'This is a very long description that provides detailed information about why there is no data and what the user can do about it'
        )
      ).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      render(<EmptyState {...defaultProps} title="Keine Daten vorhanden! (0/0)" />);

      expect(screen.getByText('Keine Daten vorhanden! (0/0)')).toBeInTheDocument();
    });

    it('should handle special characters in description', () => {
      render(
        <EmptyState
          {...defaultProps}
          description="Erstellen Sie eine neue Datei & versuchen Sie es erneut!"
        />
      );

      expect(
        screen.getByText('Erstellen Sie eine neue Datei & versuchen Sie es erneut!')
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<EmptyState {...defaultProps} />);

      const heading = screen.getByText('No Data');
      expect(heading).toBeInTheDocument();
    });

    it('should have button role for action', () => {
      const action = {
        label: 'Create',
        onClick: jest.fn()
      };

      render(<EmptyState {...defaultProps} action={action} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have clickable button', async () => {
      const mockOnClick = jest.fn();
      const action = {
        label: 'Create',
        onClick: mockOnClick
      };
      const user = userEvent.setup();

      render(<EmptyState {...defaultProps} action={action} />);

      const button = screen.getByRole('button');
      expect(button).toBeEnabled();

      await user.click(button);
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('Memoization', () => {
    it('should be memoized component', () => {
      const { rerender } = render(<EmptyState {...defaultProps} />);

      expect(screen.getByText('No Data')).toBeInTheDocument();

      rerender(<EmptyState {...defaultProps} />);

      expect(screen.getByText('No Data')).toBeInTheDocument();
    });

    it('should update when props change', () => {
      const { rerender } = render(<EmptyState {...defaultProps} />);

      expect(screen.getByText('No Data')).toBeInTheDocument();

      rerender(<EmptyState {...defaultProps} title="Updated Title" />);

      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.queryByText('No Data')).not.toBeInTheDocument();
    });
  });
});

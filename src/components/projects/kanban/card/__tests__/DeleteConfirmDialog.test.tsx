// src/components/projects/kanban/card/__tests__/DeleteConfirmDialog.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  TrashIcon: ({ className }: any) => <div data-testid="trash-icon" className={className} />,
  XMarkIcon: ({ className }: any) => <div data-testid="x-mark-icon" className={className} />,
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, color }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-${color || type}`}
      data-disabled={disabled}
    >
      {children}
    </button>
  ),
}));

describe('DeleteConfirmDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    projectTitle: 'Test Projekt',
    isDeleting: false,
    hasError: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when isOpen is true', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Projekt löschen')).toBeInTheDocument();
      expect(screen.getByText(/Test Projekt/)).toBeInTheDocument();
      expect(screen.getByText(/Diese Aktion kann nicht rückgängig gemacht werden/)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<DeleteConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Projekt löschen')).not.toBeInTheDocument();
    });

    it('should display project title in warning message', () => {
      render(<DeleteConfirmDialog {...defaultProps} projectTitle="Mein Super Projekt" />);

      expect(screen.getByText(/Mein Super Projekt/)).toBeInTheDocument();
    });

    it('should render trash icons', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const trashIcons = screen.getAllByTestId('trash-icon');
      expect(trashIcons.length).toBeGreaterThan(0);
    });

    it('should render close button with X icon', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      expect(screen.getByTestId('x-mark-icon')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onClose when close button is clicked', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const closeButton = screen.getByTestId('x-mark-icon').parentElement!;
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Abbrechen button is clicked', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByText('Abbrechen');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Löschen button is clicked', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm or onClose when buttons are disabled', () => {
      render(<DeleteConfirmDialog {...defaultProps} isDeleting={true} />);

      const deleteButton = screen.getByText('Lösche...');
      const cancelButton = screen.getByText('Abbrechen');

      fireEvent.click(deleteButton);
      fireEvent.click(cancelButton);

      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isDeleting is true', () => {
      render(<DeleteConfirmDialog {...defaultProps} isDeleting={true} />);

      expect(screen.getByText('Lösche...')).toBeInTheDocument();
      expect(screen.queryByText('Löschen')).not.toBeInTheDocument();
    });

    it('should disable buttons when isDeleting is true', () => {
      render(<DeleteConfirmDialog {...defaultProps} isDeleting={true} />);

      const deleteButton = screen.getByText('Lösche...').closest('button')!;
      const cancelButton = screen.getByText('Abbrechen').closest('button')!;

      expect(deleteButton).toHaveAttribute('data-disabled', 'true');
      expect(cancelButton).toHaveAttribute('data-disabled', 'true');
    });

    it('should show loading spinner when isDeleting is true', () => {
      render(<DeleteConfirmDialog {...defaultProps} isDeleting={true} />);

      const spinner = screen.getByText('Lösche...').querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when hasError is true', () => {
      render(<DeleteConfirmDialog {...defaultProps} hasError={true} />);

      expect(screen.getByText(/Fehler beim Löschen des Projekts/)).toBeInTheDocument();
    });

    it('should not show error message when hasError is false', () => {
      render(<DeleteConfirmDialog {...defaultProps} hasError={false} />);

      expect(screen.queryByText(/Fehler beim Löschen des Projekts/)).not.toBeInTheDocument();
    });

    it('should show error message with correct styling', () => {
      render(<DeleteConfirmDialog {...defaultProps} hasError={true} />);

      const errorMessage = screen.getByText(/Fehler beim Löschen des Projekts/).closest('div');
      expect(errorMessage).toHaveClass('bg-red-50');
      expect(errorMessage).toHaveClass('border-red-200');
    });
  });

  describe('Normal State', () => {
    it('should show normal delete button text when not deleting', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Löschen')).toBeInTheDocument();
    });

    it('should enable buttons when not deleting', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const deleteButton = screen.getByText('Löschen').closest('button')!;
      const cancelButton = screen.getByText('Abbrechen').closest('button')!;

      expect(deleteButton).not.toHaveAttribute('disabled');
      expect(cancelButton).not.toHaveAttribute('disabled');
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Projekt löschen')).toBeInTheDocument();
      expect(screen.getByText('Projekt löschen').tagName).toBe('H3');
    });

    it('should show warning message with strong emphasis on project name', () => {
      render(<DeleteConfirmDialog {...defaultProps} />);

      const projectName = screen.getByText('Test Projekt');
      expect(projectName.tagName).toBe('STRONG');
    });
  });
});

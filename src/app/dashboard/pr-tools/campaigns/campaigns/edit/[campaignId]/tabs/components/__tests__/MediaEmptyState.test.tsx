/**
 * MediaEmptyState Component Tests
 *
 * Testet die MediaEmptyState-Komponente:
 * - onClick Callback
 * - Keyboard Navigation (Enter, Space)
 * - Hover States
 * - Accessibility (role, tabIndex, aria-label)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaEmptyState } from '../MediaEmptyState';

describe('MediaEmptyState Component', () => {
  const mockOnAddMedia = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render empty state with correct text', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      expect(screen.getByText('Medien hinzufügen')).toBeInTheDocument();
      expect(screen.getByText('Klicken zum Auswählen')).toBeInTheDocument();
    });

    it('should render PhotoIcon', () => {
      const { container } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      // Hero Icons werden als SVG gerendert
      const icon = container.querySelector('svg.h-10.w-10.text-gray-400');
      expect(icon).toBeInTheDocument();
    });

    it('should have correct base styling', () => {
      const { container } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass(
        'border-2',
        'border-dashed',
        'border-gray-300',
        'rounded-lg',
        'bg-gray-50',
        'cursor-pointer'
      );
    });
  });

  describe('Click Interaction', () => {
    it('should call onAddMedia when clicked', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });
      fireEvent.click(emptyState);

      expect(mockOnAddMedia).toHaveBeenCalledTimes(1);
    });

    it('should call onAddMedia on multiple clicks', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });

      fireEvent.click(emptyState);
      fireEvent.click(emptyState);
      fireEvent.click(emptyState);

      expect(mockOnAddMedia).toHaveBeenCalledTimes(3);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onAddMedia when Enter key is pressed', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });

      fireEvent.keyDown(emptyState, { key: 'Enter', code: 'Enter' });

      expect(mockOnAddMedia).toHaveBeenCalledTimes(1);
    });

    it('should call onAddMedia when Space key is pressed', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });

      fireEvent.keyDown(emptyState, { key: ' ', code: 'Space' });

      expect(mockOnAddMedia).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior on Space key', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      emptyState.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not call onAddMedia for other keys', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });

      fireEvent.keyDown(emptyState, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(emptyState, { key: 'Tab', code: 'Tab' });
      fireEvent.keyDown(emptyState, { key: 'a', code: 'KeyA' });

      expect(mockOnAddMedia).not.toHaveBeenCalled();
    });

    it('should be focusable with tabIndex={0}', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });

      expect(emptyState).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Accessibility', () => {
    it('should have role="button"', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button');
      expect(emptyState).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByLabelText('Medien hinzufügen');
      expect(emptyState).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });

      // Tab zum Element
      await user.tab();
      expect(emptyState).toHaveFocus();

      // Enter drücken
      await user.keyboard('{Enter}');
      expect(mockOnAddMedia).toHaveBeenCalledTimes(1);
    });
  });

  describe('Hover States', () => {
    it('should apply hover classes for background and border', () => {
      const { container } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('hover:bg-gray-100', 'hover:border-[#005fab]');
    });

    it('should apply hover effect to icon through group class', () => {
      const { container } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('group');

      const icon = container.querySelector('.group-hover\\:text-\\[\\#005fab\\]');
      expect(icon).toBeInTheDocument();
    });

    it('should apply hover effect to text through group class', () => {
      const { container } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const mainText = screen.getByText('Medien hinzufügen');
      expect(mainText).toHaveClass('group-hover:text-[#005fab]');
    });

    it('should have transition-all class for smooth transitions', () => {
      const { container } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('transition-all');
    });
  });

  describe('Component Memoization', () => {
    it('should not re-render when props are unchanged', () => {
      const { rerender } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const firstRender = screen.getByText('Medien hinzufügen');

      // Re-render mit denselben Props
      rerender(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const secondRender = screen.getByText('Medien hinzufügen');

      // Komponente sollte React.memo verwenden
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when onAddMedia callback changes', () => {
      const { rerender } = render(<MediaEmptyState onAddMedia={mockOnAddMedia} />);

      const firstRender = screen.getByText('Medien hinzufügen');

      const newCallback = jest.fn();
      rerender(<MediaEmptyState onAddMedia={newCallback} />);

      // Neuer Callback sollte funktionieren
      const emptyState = screen.getByRole('button', { name: 'Medien hinzufügen' });
      fireEvent.click(emptyState);

      expect(newCallback).toHaveBeenCalledTimes(1);
      expect(mockOnAddMedia).not.toHaveBeenCalled();
    });
  });
});

// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/__tests__/AiAssistantCTA.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiAssistantCTA } from '../AiAssistantCTA';

describe('AiAssistantCTA', () => {
  describe('Rendering', () => {
    it('rendert den Button mit korrektem Text', () => {
      const mockOnOpenAiModal = jest.fn();
      render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      expect(screen.getByText('Schnellstart mit dem KI-Assistenten')).toBeInTheDocument();
      expect(screen.getByText(/Erstelle einen kompletten Rohentwurf/)).toBeInTheDocument();
    });

    it('rendert als Button-Element', () => {
      const mockOnOpenAiModal = jest.fn();
      render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.getAttribute('type')).toBe('button');
    });

    it('zeigt die Icons an', () => {
      const mockOnOpenAiModal = jest.fn();
      const { container } = render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      // Prüft auf Heroicons SVG-Elemente
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2); // SparklesIcon und ArrowRightIcon
    });
  });

  describe('Interaktion', () => {
    it('ruft onOpenAiModal beim Klick auf', () => {
      const mockOnOpenAiModal = jest.fn();
      render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnOpenAiModal).toHaveBeenCalledTimes(1);
    });

    it('ruft onOpenAiModal bei mehrfachen Klicks mehrfach auf', () => {
      const mockOnOpenAiModal = jest.fn();
      render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnOpenAiModal).toHaveBeenCalledTimes(3);
    });
  });

  describe('Styling', () => {
    it('hat Gradient-Background-Klassen', () => {
      const mockOnOpenAiModal = jest.fn();
      const { container } = render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-gradient-to-r');
      expect(button?.className).toContain('from-indigo-500');
      expect(button?.className).toContain('to-purple-600');
    });

    it('hat Hover-Effekt-Klassen', () => {
      const mockOnOpenAiModal = jest.fn();
      const { container } = render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('hover:from-indigo-600');
      expect(button?.className).toContain('hover:to-purple-700');
      expect(button?.className).toContain('hover:shadow-xl');
    });

    it('hat die korrekte volle Breite', () => {
      const mockOnOpenAiModal = jest.fn();
      const { container } = render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('w-full');
    });

    it('hat Group-Klasse für Hover-Animationen', () => {
      const mockOnOpenAiModal = jest.fn();
      const { container } = render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('group');
    });
  });

  describe('Accessibility', () => {
    it('ist als Button zugänglich', () => {
      const mockOnOpenAiModal = jest.fn();
      render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = screen.getByRole('button');
      expect(button).toBeEnabled();
    });

    it('hat cursor-pointer für bessere UX', () => {
      const mockOnOpenAiModal = jest.fn();
      const { container } = render(<AiAssistantCTA onOpenAiModal={mockOnOpenAiModal} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('cursor-pointer');
    });
  });
});

// src/components/projects/strategy/__tests__/StrategyTemplateGrid.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StrategyTemplateGrid from '../StrategyTemplateGrid';
import { STRATEGY_TEMPLATES } from '@/constants/strategy-templates';

describe('StrategyTemplateGrid Component', () => {
  const mockOnTemplateSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all 6 template cards', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    expect(screen.getByText('Neues Dokument erstellen')).toBeInTheDocument();
    expect(screen.getByText('Leere Tabelle erstellen')).toBeInTheDocument();
    expect(screen.getByText('Unternehmensprofil & Senderanalyse')).toBeInTheDocument();
    expect(screen.getByText('Situationsanalyse')).toBeInTheDocument();
    expect(screen.getByText('Zielgruppenanalyse')).toBeInTheDocument();
    expect(screen.getByText('Kernbotschaften & Kommunikationsziele')).toBeInTheDocument();
  });

  it('should call onTemplateSelect with correct templateType and content on click', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const blankCard = screen.getByText('Neues Dokument erstellen');
    fireEvent.click(blankCard.closest('button')!);

    expect(mockOnTemplateSelect).toHaveBeenCalledWith('blank', '');
  });

  it('should pass correct content for company-profile template', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const profileCard = screen.getByText('Unternehmensprofil & Senderanalyse');
    fireEvent.click(profileCard.closest('button')!);

    expect(mockOnTemplateSelect).toHaveBeenCalledWith(
      'company-profile',
      STRATEGY_TEMPLATES['company-profile'].content
    );
  });

  it('should display "Vorlage" badge only for template cards (not blank or table)', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const vorlageBadges = screen.getAllByText('Vorlage');

    expect(vorlageBadges).toHaveLength(4);
  });

  it('should not display "Vorlage" badge for blank template', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const blankCard = screen.getByText('Neues Dokument erstellen').closest('button');

    expect(blankCard).not.toHaveTextContent('Vorlage');
  });

  it('should not display "Vorlage" badge for table template', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const tableCard = screen.getByText('Leere Tabelle erstellen').closest('button');

    expect(tableCard).not.toHaveTextContent('Vorlage');
  });

  it('should have focus ring styles for accessibility', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const blankButton = screen.getByText('Neues Dokument erstellen').closest('button')!;

    expect(blankButton).toHaveClass('focus:outline-none');
    expect(blankButton).toHaveClass('focus:ring-2');
    expect(blankButton).toHaveClass('focus:ring-[#005fab]');
  });

  it('should apply gradient background to template cards but not to blank/table', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const blankButton = screen.getByText('Neues Dokument erstellen').closest('button')!;
    const profileButton = screen.getByText('Unternehmensprofil & Senderanalyse').closest('button')!;

    expect(blankButton).toHaveClass('bg-white');
    expect(blankButton).not.toHaveClass('bg-gradient-to-br');

    expect(profileButton).toHaveClass('bg-gradient-to-br');
    expect(profileButton).toHaveClass('from-blue-50');
  });

  it('should render template descriptions correctly', () => {
    render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    expect(screen.getByText('Beginnen Sie mit einem leeren Blatt für Ihre Notizen und Ideen.')).toBeInTheDocument();
    expect(screen.getByText('Strukturieren Sie Ihre Daten in einer einfachen Tabelle.')).toBeInTheDocument();
    expect(
      screen.getByText('Erfassen Sie die Kernfakten des Absenders, die als Grundlage für die gesamte Kommunikation dienen.')
    ).toBeInTheDocument();
  });

  it('should prevent re-renders with React.memo when props do not change', () => {
    const { rerender } = render(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const firstRenderButton = screen.getByText('Neues Dokument erstellen').closest('button');

    rerender(<StrategyTemplateGrid onTemplateSelect={mockOnTemplateSelect} />);

    const secondRenderButton = screen.getByText('Neues Dokument erstellen').closest('button');

    expect(firstRenderButton).toBe(secondRenderButton);
  });
});

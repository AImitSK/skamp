import { render, screen, fireEvent } from '@testing-library/react';
import { StatusCircles, DocumentStatus } from '../StatusCircles';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

describe('StatusCircles', () => {
  const mockDocuments = {
    briefing: 'completed' as DocumentStatus,
    swot: 'completed' as DocumentStatus,
    audience: 'missing' as DocumentStatus,
    positioning: 'missing' as DocumentStatus,
    goals: 'missing' as DocumentStatus,
    messages: 'missing' as DocumentStatus,
  };

  it('rendert 6 Kreise', () => {
    render(<StatusCircles documents={mockDocuments} />);

    const circles = screen.getAllByRole('button');
    expect(circles).toHaveLength(6);
  });

  it('rendert korrekte Farben basierend auf Status', () => {
    render(<StatusCircles documents={mockDocuments} />);

    const circles = screen.getAllByRole('button');

    // Erste 2 sollten grün sein (completed)
    expect(circles[0]).toHaveClass('bg-green-500');
    expect(circles[1]).toHaveClass('bg-green-500');

    // Restliche sollten grau sein (missing)
    expect(circles[2]).toHaveClass('bg-zinc-300');
    expect(circles[3]).toHaveClass('bg-zinc-300');
    expect(circles[4]).toHaveClass('bg-zinc-300');
    expect(circles[5]).toHaveClass('bg-zinc-300');
  });

  it('zeigt korrekten Prozentsatz', () => {
    render(<StatusCircles documents={mockDocuments} />);

    // 2 von 6 = 33%
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('zeigt alle Dokumente als completed = 100%', () => {
    const allCompleted = {
      briefing: 'completed' as DocumentStatus,
      swot: 'completed' as DocumentStatus,
      audience: 'completed' as DocumentStatus,
      positioning: 'completed' as DocumentStatus,
      goals: 'completed' as DocumentStatus,
      messages: 'completed' as DocumentStatus,
    };

    render(<StatusCircles documents={allCompleted} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('zeigt gelbe Farbe für draft Status', () => {
    const draftDocuments = {
      ...mockDocuments,
      audience: 'draft' as DocumentStatus,
    };

    render(<StatusCircles documents={draftDocuments} />);

    const circles = screen.getAllByRole('button');
    expect(circles[2]).toHaveClass('bg-yellow-500');
  });

  it('rendert Tooltips mit Dokumentnamen', () => {
    render(<StatusCircles documents={mockDocuments} />);

    const circles = screen.getAllByRole('button');
    expect(circles[0]).toHaveAttribute('title', 'briefing');
    expect(circles[1]).toHaveAttribute('title', 'swot');
    expect(circles[2]).toHaveAttribute('title', 'audience');
    expect(circles[3]).toHaveAttribute('title', 'positioning');
    expect(circles[4]).toHaveAttribute('title', 'goals');
    expect(circles[5]).toHaveAttribute('title', 'messages');
  });

  it('ruft onCircleClick bei Klick auf wenn clickable=true', () => {
    const handleClick = jest.fn();

    render(
      <StatusCircles
        documents={mockDocuments}
        clickable
        onCircleClick={handleClick}
      />
    );

    const circles = screen.getAllByRole('button');
    fireEvent.click(circles[2]); // audience

    expect(handleClick).toHaveBeenCalledWith('audience');
  });

  it('ruft onCircleClick NICHT auf wenn clickable=false', () => {
    const handleClick = jest.fn();

    render(
      <StatusCircles
        documents={mockDocuments}
        clickable={false}
        onCircleClick={handleClick}
      />
    );

    const circles = screen.getAllByRole('button');
    fireEvent.click(circles[2]);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('rendert verschiedene Größen korrekt', () => {
    const { rerender } = render(
      <StatusCircles documents={mockDocuments} size="sm" />
    );

    let circles = screen.getAllByRole('button');
    expect(circles[0]).toHaveClass('h-2', 'w-2');

    rerender(<StatusCircles documents={mockDocuments} size="md" />);
    circles = screen.getAllByRole('button');
    expect(circles[0]).toHaveClass('h-3', 'w-3');

    rerender(<StatusCircles documents={mockDocuments} size="lg" />);
    circles = screen.getAllByRole('button');
    expect(circles[0]).toHaveClass('h-4', 'w-4');
  });

  it('hat hover-Effekte wenn clickable=true', () => {
    render(
      <StatusCircles
        documents={mockDocuments}
        clickable
        onCircleClick={jest.fn()}
      />
    );

    const circles = screen.getAllByRole('button');
    expect(circles[0]).toHaveClass('cursor-pointer', 'hover:ring-2', 'hover:ring-primary');
  });

  it('hat KEINE hover-Effekte wenn clickable=false', () => {
    render(<StatusCircles documents={mockDocuments} clickable={false} />);

    const circles = screen.getAllByRole('button');
    expect(circles[0]).toHaveClass('cursor-default');
    expect(circles[0]).not.toHaveClass('cursor-pointer');
  });

  it('rendert aria-labels für Accessibility', () => {
    render(<StatusCircles documents={mockDocuments} />);

    const circles = screen.getAllByRole('button');
    expect(circles[0]).toHaveAttribute('aria-label', 'briefing: completed');
    expect(circles[2]).toHaveAttribute('aria-label', 'audience: missing');
  });
});

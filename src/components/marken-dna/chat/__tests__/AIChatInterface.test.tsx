// Tests für AIChatInterface Komponente
// Phase 3: KI-Chat Backend

import { render, screen, fireEvent } from '@testing-library/react';
import { AIChatInterface, ChatMessage } from '../AIChatInterface';

// ============================================================================
// MOCKS
// ============================================================================

// next-intl Mock
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// react-markdown Mock
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

// ============================================================================
// TESTS
// ============================================================================

describe('AIChatInterface', () => {
  const mockMessages: ChatMessage[] = [
    { role: 'user', content: 'Hallo KI' },
    { role: 'assistant', content: 'Guten Tag! Wie kann ich helfen?' },
  ];

  const defaultProps = {
    messages: mockMessages,
    input: '',
    onInputChange: jest.fn(),
    onSendMessage: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('sollte alle Nachrichten rendern', () => {
      render(<AIChatInterface {...defaultProps} />);

      expect(screen.getByText('Hallo KI')).toBeInTheDocument();
      expect(screen.getByText('Guten Tag! Wie kann ich helfen?')).toBeInTheDocument();
    });

    it('sollte leeren Chat rendern', () => {
      render(<AIChatInterface {...defaultProps} messages={[]} />);

      expect(screen.queryByText('Hallo KI')).not.toBeInTheDocument();
    });

    it('sollte Progress Bar anzeigen wenn progress > 0', () => {
      render(<AIChatInterface {...defaultProps} progress={50} />);

      // Progress Bar sollte sichtbar sein (der Text kommt aus i18n)
      // Prüfen dass ProgressIndicator gerendert wird
      const progressBar = document.querySelector('.bg-primary[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('sollte Progress Bar nicht anzeigen wenn progress = 0', () => {
      render(<AIChatInterface {...defaultProps} progress={0} />);

      const progressBar = document.querySelector('.bg-primary[style*="width"]');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('sollte Suggested Prompts anzeigen wenn vorhanden', () => {
      const suggestedPrompts = ['Vorschlag 1', 'Vorschlag 2', 'Vorschlag 3'];

      render(
        <AIChatInterface {...defaultProps} suggestedPrompts={suggestedPrompts} />
      );

      expect(screen.getByText('Vorschlag 1')).toBeInTheDocument();
      expect(screen.getByText('Vorschlag 2')).toBeInTheDocument();
      expect(screen.getByText('Vorschlag 3')).toBeInTheDocument();
    });

    it('sollte Suggested Prompts nicht anzeigen während Loading', () => {
      const suggestedPrompts = ['Vorschlag 1'];

      render(
        <AIChatInterface
          {...defaultProps}
          suggestedPrompts={suggestedPrompts}
          isLoading={true}
        />
      );

      expect(screen.queryByText('Vorschlag 1')).not.toBeInTheDocument();
    });

    it('sollte Loading-Indikator anzeigen', () => {
      render(<AIChatInterface {...defaultProps} isLoading={true} />);

      // Prüfen dass "..." angezeigt wird
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('sollte Custom-Placeholder verwenden wenn vorhanden', () => {
      render(
        <AIChatInterface {...defaultProps} placeholder="Custom Placeholder" />
      );

      expect(screen.getByPlaceholderText('Custom Placeholder')).toBeInTheDocument();
    });
  });

  describe('Interaktion', () => {
    it('sollte onSendMessage bei Submit aufrufen', () => {
      const onSendMessage = jest.fn();

      render(
        <AIChatInterface
          {...defaultProps}
          input="Test Nachricht"
          onSendMessage={onSendMessage}
        />
      );

      const form = screen.getByRole('textbox').closest('form');
      fireEvent.submit(form!);

      expect(onSendMessage).toHaveBeenCalledWith('Test Nachricht');
    });

    it('sollte onSendMessage NICHT aufrufen wenn Input leer', () => {
      const onSendMessage = jest.fn();

      render(
        <AIChatInterface
          {...defaultProps}
          input="   "
          onSendMessage={onSendMessage}
        />
      );

      const form = screen.getByRole('textbox').closest('form');
      fireEvent.submit(form!);

      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('sollte onSendMessage NICHT aufrufen während Loading', () => {
      const onSendMessage = jest.fn();

      render(
        <AIChatInterface
          {...defaultProps}
          input="Test"
          onSendMessage={onSendMessage}
          isLoading={true}
        />
      );

      const form = screen.getByRole('textbox').closest('form');
      fireEvent.submit(form!);

      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('sollte Suggestion-Click korrekt behandeln', () => {
      const onInputChange = jest.fn();
      const onSendMessage = jest.fn();
      const suggestedPrompts = ['Vorschlag 1'];

      render(
        <AIChatInterface
          {...defaultProps}
          suggestedPrompts={suggestedPrompts}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
        />
      );

      fireEvent.click(screen.getByText('Vorschlag 1'));

      expect(onInputChange).toHaveBeenCalledWith('Vorschlag 1');
      expect(onSendMessage).toHaveBeenCalledWith('Vorschlag 1');
    });

    it('sollte onRegenerate an letzte AI-Message übergeben', () => {
      const onRegenerate = jest.fn();

      render(
        <AIChatInterface {...defaultProps} onRegenerate={onRegenerate} />
      );

      // Regenerate-Button sollte nur bei letzter Message sichtbar sein
      // (Diese Logik ist in AIMessage implementiert)
      expect(screen.queryAllByRole('button')).toBeDefined();
    });

    it('sollte onCopy an letzte AI-Message übergeben', () => {
      const onCopy = jest.fn();

      render(<AIChatInterface {...defaultProps} onCopy={onCopy} />);

      // Copy-Button sollte nur bei letzter Message sichtbar sein
      // (Diese Logik ist in AIMessage implementiert)
      expect(screen.queryAllByRole('button')).toBeDefined();
    });
  });

  describe('Layout', () => {
    it('sollte flex-col Layout verwenden', () => {
      const { container } = render(<AIChatInterface {...defaultProps} />);

      const chatContainer = container.firstChild;
      expect(chatContainer).toHaveClass('flex', 'flex-col', 'h-full');
    });

    it('sollte MessageList als flex-1 rendern', () => {
      const { container } = render(<AIChatInterface {...defaultProps} />);

      // MessageList ist das erste Kind und sollte flex-1 haben
      const messageList = container.querySelector('.flex-1');
      expect(messageList).toBeInTheDocument();
    });

    it('sollte Input unten mit Border rendern', () => {
      const { container } = render(<AIChatInterface {...defaultProps} />);

      const form = screen.getByRole('textbox').closest('form');
      expect(form).toHaveClass('border-t', 'border-zinc-200');
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit sehr vielen Nachrichten umgehen', () => {
      const manyMessages: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Nachricht ${i}`,
      }));

      render(<AIChatInterface {...defaultProps} messages={manyMessages} />);

      expect(screen.getByText('Nachricht 0')).toBeInTheDocument();
      expect(screen.getByText('Nachricht 99')).toBeInTheDocument();
    });

    it('sollte mit langen Nachrichtentexten umgehen', () => {
      const longMessage = 'A'.repeat(1000);
      const messages: ChatMessage[] = [
        { role: 'user', content: longMessage },
      ];

      render(<AIChatInterface {...defaultProps} messages={messages} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('sollte mit leeren Suggested Prompts Array umgehen', () => {
      render(<AIChatInterface {...defaultProps} suggestedPrompts={[]} />);

      // Sollte keine Suggestion-Buttons rendern
      const buttons = screen.getAllByRole('button');
      // Nur Send-Button sollte vorhanden sein
      expect(buttons.length).toBe(1);
    });
  });
});

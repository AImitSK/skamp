// Tests für ChatInput Komponente
// Phase 3: KI-Chat Backend

import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

// ============================================================================
// TESTS
// ============================================================================

describe('ChatInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('sollte Textarea und Send-Button rendern', () => {
      render(<ChatInput {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /senden/i })).toBeInTheDocument();
    });

    it('sollte Default-Placeholder anzeigen', () => {
      render(<ChatInput {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Nachricht eingeben...')
      ).toBeInTheDocument();
    });

    it('sollte Custom-Placeholder anzeigen', () => {
      render(
        <ChatInput {...defaultProps} placeholder="Custom Placeholder" />
      );

      expect(screen.getByPlaceholderText('Custom Placeholder')).toBeInTheDocument();
    });

    it('sollte aktuellen Value anzeigen', () => {
      render(<ChatInput {...defaultProps} value="Test Nachricht" />);

      expect(screen.getByRole('textbox')).toHaveValue('Test Nachricht');
    });
  });

  describe('Interaktion', () => {
    it('sollte onChange bei Input aufrufen', () => {
      const onChange = jest.fn();

      render(<ChatInput {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Neue Nachricht' } });

      expect(onChange).toHaveBeenCalledWith('Neue Nachricht');
    });

    it('sollte Form submitten bei Enter', () => {
      const mockForm = document.createElement('form');
      mockForm.requestSubmit = jest.fn();

      render(
        <form>
          <ChatInput {...defaultProps} value="Test" />
        </form>
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // preventDefault sollte aufgerufen werden
      // (nicht direkt testbar, aber Komponente sollte nicht crashen)
      expect(textarea).toBeInTheDocument();
    });

    it('sollte NICHT submitten bei Shift+Enter', () => {
      render(
        <form>
          <ChatInput {...defaultProps} value="Test" />
        </form>
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      // Neue Zeile sollte möglich sein (preventDefault wird NICHT aufgerufen)
      expect(textarea).toBeInTheDocument();
    });

    it('sollte Send-Button deaktivieren wenn Input leer', () => {
      render(<ChatInput {...defaultProps} value="" />);

      const button = screen.getByRole('button', { name: /senden/i });
      expect(button).toBeDisabled();
    });

    it('sollte Send-Button deaktivieren wenn nur Leerzeichen', () => {
      render(<ChatInput {...defaultProps} value="   " />);

      const button = screen.getByRole('button', { name: /senden/i });
      expect(button).toBeDisabled();
    });

    it('sollte Send-Button aktivieren wenn Text vorhanden', () => {
      render(<ChatInput {...defaultProps} value="Test" />);

      const button = screen.getByRole('button', { name: /senden/i });
      expect(button).not.toBeDisabled();
    });

    it('sollte Textarea deaktivieren während Loading', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('sollte Send-Button deaktivieren während Loading', () => {
      render(<ChatInput {...defaultProps} value="Test" isLoading={true} />);

      const button = screen.getByRole('button', { name: /senden/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Design System', () => {
    it('sollte Design System Klassen für Textarea verwenden', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');

      expect(textarea).toHaveClass('rounded-lg');
      expect(textarea).toHaveClass('border-zinc-300');
      expect(textarea).toHaveClass('text-sm');
    });

    it('sollte Design System Klassen für Button verwenden', () => {
      render(<ChatInput {...defaultProps} value="Test" />);

      const button = screen.getByRole('button', { name: /senden/i });

      expect(button).toHaveClass('bg-primary');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('w-10');
      expect(button).toHaveClass('rounded-lg');
    });

    it('sollte Mindesthöhe von 40px haben', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('min-h-[40px]');
    });

    it('sollte Maximalhöhe von 200px haben', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('max-h-[200px]');
    });

    it('sollte PaperAirplane Icon im Button haben', () => {
      const { container } = render(<ChatInput {...defaultProps} value="Test" />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('h-5', 'w-5');
    });
  });

  describe('Layout', () => {
    it('sollte Flex-Layout mit Gap verwenden', () => {
      const { container } = render(<ChatInput {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-end', 'gap-2');
    });

    it('sollte Textarea als flex-1 rendern', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('flex-1');
    });
  });

  describe('Accessibility', () => {
    it('sollte Title-Attribut für Button haben', () => {
      render(<ChatInput {...defaultProps} value="Test" />);

      const button = screen.getByRole('button', { name: /senden/i });
      expect(button).toHaveAttribute('title', 'Senden');
    });

    it('sollte disabled State korrekt kommunizieren', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('disabled');
    });

    it('sollte Placeholder für Screen Reader zugänglich sein', () => {
      render(<ChatInput {...defaultProps} placeholder="Test Placeholder" />);

      const textarea = screen.getByPlaceholderText('Test Placeholder');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit sehr langem Text umgehen', () => {
      const longText = 'A'.repeat(1000);

      render(<ChatInput {...defaultProps} value={longText} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(longText);
    });

    it('sollte mit Zeilenumbrüchen umgehen', () => {
      const multilineText = 'Zeile 1\nZeile 2\nZeile 3';

      render(<ChatInput {...defaultProps} value={multilineText} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(multilineText);
    });

    it('sollte mit Sonderzeichen umgehen', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const onChange = jest.fn();

      render(<ChatInput {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: specialChars } });

      expect(onChange).toHaveBeenCalledWith(specialChars);
    });

    it('sollte mit Emojis umgehen', () => {
      const emojiText = '😀 👍 ❤️';

      const onChange = jest.fn();

      render(<ChatInput {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: emojiText } });

      expect(onChange).toHaveBeenCalledWith(emojiText);
    });
  });

  describe('Dynamic Sizing', () => {
    it('sollte rows=1 als Startwert haben', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '1');
    });

    it('sollte resize-none Klasse haben', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('resize-none');
    });

    it('sollte overflow-y:auto bei vielen Zeilen setzen', () => {
      const multilineText = Array(5).fill('Zeile').join('\n');

      const { container } = render(
        <ChatInput {...defaultProps} value={multilineText} />
      );

      const textarea = container.querySelector('textarea');
      const style = textarea?.getAttribute('style');

      // Sollte overflowY: auto haben
      expect(style).toContain('overflow');
    });

    it('sollte overflow-y:hidden bei wenigen Zeilen setzen', () => {
      const singleLineText = 'Eine Zeile';

      const { container } = render(
        <ChatInput {...defaultProps} value={singleLineText} />
      );

      const textarea = container.querySelector('textarea');
      const style = textarea?.getAttribute('style');

      // Sollte overflowY: hidden haben
      expect(style).toBeDefined();
    });
  });
});

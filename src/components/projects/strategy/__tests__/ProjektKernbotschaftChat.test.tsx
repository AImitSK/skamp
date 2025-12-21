import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjektKernbotschaftChat } from '../ProjektKernbotschaftChat';
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

// Mock useGenkitChat Hook
jest.mock('@/lib/hooks/useGenkitChat');

describe('ProjektKernbotschaftChat', () => {
  const mockMarkenSynthese = {
    id: 'synthese-123',
    content: '<p>DNA Synthese</p>',
    plainText: 'DNA Synthese Plaintext',
  };

  const defaultProps = {
    projectId: 'project-123',
    companyId: 'company-123',
    companyName: 'Test GmbH',
    markenSynthese: null,
    existingKernbotschaft: null,
    onSave: jest.fn(),
  };

  const mockUseGenkitChat = {
    messages: [],
    input: '',
    setInput: jest.fn(),
    sendMessage: jest.fn(),
    isLoading: false,
    document: null,
    progress: 0,
    suggestedPrompts: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGenkitChat as jest.Mock).mockReturnValue(mockUseGenkitChat);
  });

  describe('Rendering', () => {
    it('rendert den Chat-Header', () => {
      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('Kernbotschaft erarbeiten')).toBeInTheDocument();
    });

    it('zeigt DNA Synthese Hinweis wenn markenSynthese vorhanden', () => {
      render(
        <ProjektKernbotschaftChat
          {...defaultProps}
          markenSynthese={mockMarkenSynthese}
        />
      );

      expect(
        screen.getByText('DNA Synthese wird als Kontext verwendet')
      ).toBeInTheDocument();
    });

    it('zeigt KEINEN DNA Synthese Hinweis wenn markenSynthese=null', () => {
      render(
        <ProjektKernbotschaftChat {...defaultProps} markenSynthese={null} />
      );

      expect(
        screen.queryByText('DNA Synthese wird als Kontext verwendet')
      ).not.toBeInTheDocument();
    });

    it('zeigt Empty-State wenn keine Messages', () => {
      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(
        screen.getByText(
          /Starte ein Gespräch, um die Kernbotschaft zu erarbeiten/
        )
      ).toBeInTheDocument();
    });
  });

  describe('Chat Messages', () => {
    it('rendert User-Nachrichten korrekt', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        messages: [{ role: 'user', content: 'Hallo KI!' }],
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('Hallo KI!')).toBeInTheDocument();
    });

    it('rendert AI-Nachrichten korrekt', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        messages: [
          { role: 'user', content: 'Hallo KI!' },
          { role: 'assistant', content: 'Hallo! Wie kann ich helfen?' },
        ],
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('Hallo! Wie kann ich helfen?')).toBeInTheDocument();
      expect(screen.getByText('CeleroPress')).toBeInTheDocument();
    });

    it('rendert mehrere Messages in korrekter Reihenfolge', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        messages: [
          { role: 'user', content: 'Nachricht 1' },
          { role: 'assistant', content: 'Antwort 1' },
          { role: 'user', content: 'Nachricht 2' },
        ],
      });

      const { container } = render(
        <ProjektKernbotschaftChat {...defaultProps} />
      );

      const messages = container.querySelectorAll('.max-w-\\[85\\%\\]');
      expect(messages).toHaveLength(3);
    });
  });

  describe('Suggested Prompts', () => {
    it('zeigt Suggested Prompts im Empty-State', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        suggestedPrompts: ['Produktlaunch', 'Event-Ankündigung'],
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('Produktlaunch')).toBeInTheDocument();
      expect(screen.getByText('Event-Ankündigung')).toBeInTheDocument();
    });

    it('sendet Message bei Klick auf Suggested Prompt', () => {
      const mockSendMessage = jest.fn();
      const mockSetInput = jest.fn();

      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        setInput: mockSetInput,
        sendMessage: mockSendMessage,
        suggestedPrompts: ['Produktlaunch'],
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      const promptButton = screen.getByText('Produktlaunch');
      fireEvent.click(promptButton);

      expect(mockSetInput).toHaveBeenCalledWith('Produktlaunch');
      expect(mockSendMessage).toHaveBeenCalledWith('Produktlaunch');
    });

    it('zeigt Suggested Prompts nach Messages (falls vorhanden)', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        messages: [{ role: 'user', content: 'Test' }],
        suggestedPrompts: ['Weiter mit Zielgruppen', 'Konkurrenz analysieren'],
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('Vorschläge:')).toBeInTheDocument();
      expect(screen.getByText('Weiter mit Zielgruppen')).toBeInTheDocument();
    });
  });

  describe('Nachricht senden', () => {
    it('ruft sendMessage auf bei Form-Submit', () => {
      const mockSendMessage = jest.fn();
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        sendMessage: mockSendMessage,
        input: 'Neue Nachricht',
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      const form = screen.getByRole('textbox').closest('form');
      fireEvent.submit(form!);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('sendet Nachricht bei Enter-Taste (ohne Shift)', () => {
      const mockSendMessage = jest.fn();
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        sendMessage: mockSendMessage,
        input: 'Test',
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('sendet KEINE Nachricht bei Shift+Enter', () => {
      const mockSendMessage = jest.fn();
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        sendMessage: mockSendMessage,
        input: 'Test',
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('deaktiviert Submit-Button wenn input leer', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        input: '',
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: '' });
      expect(submitButton).toBeDisabled();
    });

    it('deaktiviert Submit-Button während isLoading=true', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        input: 'Test',
        isLoading: true,
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: '' });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('zeigt Loading-Indicator während isLoading=true', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        isLoading: true,
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('Schreibt...')).toBeInTheDocument();
      expect(screen.getByText('Generiert Antwort...')).toBeInTheDocument();
    });

    it('deaktiviert Textarea während isLoading=true', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        isLoading: true,
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('Progress Indicator', () => {
    it('zeigt Progress Bar wenn progress > 0 und < 100', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        progress: 50,
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('zeigt KEINE Progress Bar bei progress = 0', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        progress: 0,
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });

    it('zeigt KEINE Progress Bar bei progress = 100', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        progress: 100,
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });
  });

  describe('Kernbotschaft speichern', () => {
    it('zeigt "Kernbotschaft speichern" Button wenn document vorhanden', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        document: '# Kernbotschaft\n\nInhalt...',
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(screen.getByText('Kernbotschaft speichern')).toBeInTheDocument();
    });

    it('zeigt KEINEN "Speichern" Button wenn document=null', () => {
      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        document: null,
      });

      render(<ProjektKernbotschaftChat {...defaultProps} />);

      expect(
        screen.queryByText('Kernbotschaft speichern')
      ).not.toBeInTheDocument();
    });

    it('ruft onSave mit document und messages auf', () => {
      const onSave = jest.fn();
      const messages = [
        { role: 'user' as const, content: 'Test' },
        { role: 'assistant' as const, content: 'Antwort' },
      ];

      (useGenkitChat as jest.Mock).mockReturnValue({
        ...mockUseGenkitChat,
        document: '# Kernbotschaft\n\nInhalt...',
        messages,
      });

      render(
        <ProjektKernbotschaftChat {...defaultProps} onSave={onSave} />
      );

      const saveButton = screen.getByText('Kernbotschaft speichern');
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        '# Kernbotschaft\n\nInhalt...',
        messages
      );
    });
  });

  describe('useGenkitChat Integration', () => {
    it('übergibt korrekte Props an useGenkitChat', () => {
      render(
        <ProjektKernbotschaftChat
          {...defaultProps}
          markenSynthese={mockMarkenSynthese}
        />
      );

      expect(useGenkitChat).toHaveBeenCalledWith({
        flowName: 'projectStrategyChat',
        projectId: 'project-123',
        companyId: 'company-123',
        companyName: 'Test GmbH',
        dnaSynthese: 'DNA Synthese Plaintext',
        existingChatHistory: null,
      });
    });

    it('übergibt existingChatHistory wenn vorhanden', () => {
      const chatHistory = [
        { role: 'user' as const, content: 'Alte Nachricht' },
      ];

      render(
        <ProjektKernbotschaftChat
          {...defaultProps}
          existingKernbotschaft={{
            id: 'kernbotschaft-123',
            content: 'Inhalt',
            chatHistory,
          }}
        />
      );

      expect(useGenkitChat).toHaveBeenCalledWith(
        expect.objectContaining({
          existingChatHistory: chatHistory,
        })
      );
    });
  });
});

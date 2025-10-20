/**
 * MessageInput Component Tests
 *
 * Tests für:
 * - Rendering der Input-Komponente
 * - Text-Eingabe und Änderungen
 * - Send-Button (disabled/enabled States)
 * - Asset-Picker und Emoji-Picker Buttons
 * - Keyboard-Navigation (Enter to send)
 * - @-Mention Dropdown Anzeige
 * - Disabled State während Sending
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '../MessageInput';
import { TeamMember } from '@/types/international';

describe('MessageInput', () => {
  const mockTeamMembers: TeamMember[] = [
    {
      userId: 'user-1',
      displayName: 'Alice Smith',
      email: 'alice@example.com',
      role: 'member',
      addedAt: new Date(),
    },
    {
      userId: 'user-2',
      displayName: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'member',
      addedAt: new Date(),
    },
  ];

  const defaultProps = {
    newMessage: '',
    sending: false,
    textareaRef: { current: null } as React.RefObject<HTMLTextAreaElement>,
    handleTextChange: jest.fn(),
    handleKeyDown: jest.fn(),
    handleSendMessage: jest.fn(),
    setShowAssetPicker: jest.fn(),
    setShowEmojiPicker: jest.fn(),
    showMentionDropdown: false,
    mentionDropdownPosition: { top: 0, left: 0 },
    mentionSearchTerm: '',
    teamMembers: mockTeamMembers,
    selectedMentionIndex: 0,
    selectMention: jest.fn(),
    setShowMentionDropdown: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Textarea und Send-Button rendern', () => {
    render(<MessageInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(textarea).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });

  it('sollte Send-Button disablen wenn Message leer', () => {
    render(<MessageInput {...defaultProps} newMessage="" />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('sollte Send-Button enablen wenn Message vorhanden', () => {
    render(<MessageInput {...defaultProps} newMessage="Test message" />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).not.toBeDisabled();
  });

  it('sollte Send-Button disablen während Sending', () => {
    render(<MessageInput {...defaultProps} newMessage="Test" sending={true} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('sollte Loading-Spinner anzeigen während Sending', () => {
    const { container } = render(<MessageInput {...defaultProps} sending={true} />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('sollte handleTextChange aufrufen bei Text-Eingabe', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'T');

    expect(defaultProps.handleTextChange).toHaveBeenCalled();
  });

  it('sollte handleSendMessage aufrufen beim Klick auf Send-Button', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} newMessage="Test message" />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(defaultProps.handleSendMessage).toHaveBeenCalled();
  });

  it('sollte handleKeyDown aufrufen bei Keyboard-Eingabe', () => {
    render(<MessageInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    expect(defaultProps.handleKeyDown).toHaveBeenCalled();
  });

  it('sollte Asset-Picker Button rendern und onClick aufrufen', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);

    const assetButton = screen.getByTitle('Asset anhängen');
    await user.click(assetButton);

    expect(defaultProps.setShowAssetPicker).toHaveBeenCalledWith(true);
  });

  it('sollte Emoji-Picker Button rendern und onClick aufrufen', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);

    const emojiButton = screen.getByTitle('Emoji einfügen');
    await user.click(emojiButton);

    expect(defaultProps.setShowEmojiPicker).toHaveBeenCalledWith(true);
  });

  it('sollte Textarea disablen während Sending', () => {
    render(<MessageInput {...defaultProps} sending={true} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('sollte Asset und Emoji Buttons disablen während Sending', () => {
    render(<MessageInput {...defaultProps} sending={true} />);

    const assetButton = screen.getByTitle('Asset anhängen');
    const emojiButton = screen.getByTitle('Emoji einfügen');

    expect(assetButton).toBeDisabled();
    expect(emojiButton).toBeDisabled();
  });

  it('sollte MentionDropdown rendern wenn showMentionDropdown true', () => {
    render(
      <MessageInput
        {...defaultProps}
        showMentionDropdown={true}
        mentionSearchTerm="ali"
      />
    );

    // MentionDropdown sollte Team-Members anzeigen
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('sollte MentionDropdown nicht rendern wenn showMentionDropdown false', () => {
    render(<MessageInput {...defaultProps} showMentionDropdown={false} />);

    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('sollte selectMention aufrufen beim Klick auf Mention', async () => {
    const user = userEvent.setup();
    render(
      <MessageInput
        {...defaultProps}
        showMentionDropdown={true}
        mentionSearchTerm="ali"
      />
    );

    const mention = screen.getByText('Alice Smith');
    await user.click(mention);

    expect(defaultProps.selectMention).toHaveBeenCalledWith(mockTeamMembers[0]);
  });
});

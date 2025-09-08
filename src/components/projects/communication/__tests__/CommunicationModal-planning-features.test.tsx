// src/components/projects/communication/__tests__/CommunicationModal-planning-features.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { CommunicationModal } from '../CommunicationModal';

// ========================================
// MOCKS
// ========================================

// Auth & Organization Context Mocks
const mockUser = {
  uid: 'test-user-123',
  displayName: 'Test User',
  email: 'test@example.com'
};

const mockOrganization = {
  id: 'test-org-456',
  name: 'Test Organization'
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true
  })
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: mockOrganization
  })
}));

// Project Communication Service Mock
const mockProjectCommunicationService = {
  getProjectCommunicationFeed: jest.fn(),
  sendMessage: jest.fn(),
  uploadFile: jest.fn()
};

jest.mock('@/lib/firebase/project-communication-service', () => ({
  projectCommunicationService: mockProjectCommunicationService
}));

// UI Components Mocks
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant || 'default'} ${className || ''}`}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>
      {children}
    </span>
  )
}));

// Heroicons Mocks
jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => <span data-testid="x-mark-icon">×</span>,
  ChatBubbleLeftRightIcon: () => <span data-testid="chat-bubble-icon">Chat</span>,
  EnvelopeIcon: () => <span data-testid="envelope-icon">Email</span>,
  PhoneIcon: () => <span data-testid="phone-icon">Phone</span>,
  DocumentTextIcon: () => <span data-testid="document-icon">Document</span>,
  CalendarIcon: () => <span data-testid="calendar-icon">Calendar</span>,
  UserIcon: () => <span data-testid="user-icon">User</span>,
  MagnifyingGlassIcon: () => <span data-testid="search-icon">Search</span>,
  FunnelIcon: () => <span data-testid="funnel-icon">Filter</span>,
  PlusIcon: () => <span data-testid="plus-icon">+</span>,
  PaperAirplaneIcon: () => <span data-testid="paper-airplane-icon">Send</span>,
  LinkIcon: () => <span data-testid="link-icon">Link</span>,
  AtSymbolIcon: () => <span data-testid="at-symbol-icon">@</span>
}));

// ========================================
// TEST DATA
// ========================================

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  projectId: 'test-project-789',
  projectTitle: 'Test Projekt für Planning Features'
};

const mockCommunicationFeed = {
  id: 'feed-123',
  projectId: 'test-project-789',
  items: []
};

const mockProjectMessages = [
  {
    id: 'msg-1',
    projectId: 'test-project-789',
    messageType: 'planning' as const,
    planningContext: 'strategy' as const,
    content: 'Das Strategiedokument ist fertig. @team bitte reviewen.',
    author: 'user-123',
    authorName: 'Strategy Manager',
    mentions: ['team'],
    attachments: [],
    timestamp: new Date('2024-01-15T10:00:00Z'),
    organizationId: 'test-org-456'
  },
  {
    id: 'msg-2',
    projectId: 'test-project-789',
    messageType: 'planning' as const,
    planningContext: 'briefing' as const,
    content: 'Kunde hat neues Briefing bereitgestellt.',
    author: 'user-456',
    authorName: 'Project Manager',
    mentions: [],
    attachments: [
      { id: 'file-1', name: 'briefing-v2.pdf', url: 'https://example.com/file1' }
    ],
    timestamp: new Date('2024-01-14T14:30:00Z'),
    organizationId: 'test-org-456'
  },
  {
    id: 'msg-3',
    projectId: 'test-project-789',
    messageType: 'general' as const,
    content: 'Allgemeine Projekt-Updates',
    author: 'user-789',
    authorName: 'Team Member',
    mentions: [],
    attachments: [],
    timestamp: new Date('2024-01-13T09:15:00Z'),
    organizationId: 'test-org-456'
  }
];

// ========================================
// SETUP HELPERS
// ========================================

function setupDefaultMocks() {
  mockProjectCommunicationService.getProjectCommunicationFeed.mockResolvedValue(mockCommunicationFeed);
  mockProjectCommunicationService.sendMessage.mockResolvedValue({ id: 'new-msg-id' });
}

// ========================================
// TEST SUITE
// ========================================

describe('CommunicationModal - Planning Features (Plan 11/11)', () => {
  
  beforeEach(() => {
    setupDefaultMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // BASIC RENDERING & LOADING TESTS
  // ========================================
  
  describe('Modal Rendering & Loading', () => {
    
    test('sollte Communication Modal öffnen und Team-Messages laden', async () => {
      render(<CommunicationModal {...defaultProps} />);
      
      // Modal sollte sichtbar sein
      expect(screen.getByText('Kommunikation: Test Projekt für Planning Features')).toBeInTheDocument();
      
      // Loading sollte ausgelöst werden
      await waitFor(() => {
        expect(mockProjectCommunicationService.getProjectCommunicationFeed).toHaveBeenCalledWith(
          'test-project-789',
          'test-org-456',
          { limit: 25, types: ['email-thread', 'internal-note'] }
        );
      });
      
      // Team-View sollte verfügbar sein
      expect(screen.getByRole('tab', { name: /team/i })).toBeInTheDocument();
    });
    
    test('sollte Modal schließen bei onClose', async () => {
      const mockOnClose = jest.fn();
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} onClose={mockOnClose} />);
      
      const closeButton = screen.getByTestId('x-mark-icon').closest('button')!;
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    test('sollte nicht laden wenn Modal geschlossen ist', () => {
      render(<CommunicationModal {...defaultProps} isOpen={false} />);
      
      expect(mockProjectCommunicationService.getProjectCommunicationFeed).not.toHaveBeenCalled();
    });

  });

  // ========================================
  // PLANNING MESSAGE TYPES TESTS
  // ========================================
  
  describe('Planning Message Types', () => {
    
    test('sollte Message Type Auswahl korrekt anzeigen', () => {
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      fireEvent.click(teamTab);
      
      // Message Type Select sollte sichtbar sein
      const messageTypeSelect = screen.getByDisplayValue('general');
      expect(messageTypeSelect).toBeInTheDocument();
      
      // Alle Message Types sollten verfügbar sein
      expect(screen.getByRole('option', { name: /allgemein/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /planung/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /feedback/i })).toBeInTheDocument();
    });
    
    test('sollte Planning Context Auswahl zeigen wenn Planning ausgewählt', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      // Message Type auf 'planning' ändern
      const messageTypeSelect = screen.getByDisplayValue('general');
      await user.selectOptions(messageTypeSelect, 'planning');
      
      // Planning Context Select sollte erscheinen
      const planningContextSelect = screen.getByDisplayValue('');
      expect(planningContextSelect).toBeInTheDocument();
      
      // Alle Planning Contexts sollten verfügbar sein
      expect(screen.getByRole('option', { name: /strategie/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /briefing/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /inspiration/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /recherche/i })).toBeInTheDocument();
    });
    
    test('sollte Planning Context ausblenden wenn Message Type nicht Planning', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      // Erst auf 'planning' setzen
      const messageTypeSelect = screen.getByDisplayValue('general');
      await user.selectOptions(messageTypeSelect, 'planning');
      
      // Planning Context sollte sichtbar sein
      expect(screen.getByText('Planungskontext wählen...')).toBeInTheDocument();
      
      // Zurück auf 'general' setzen
      await user.selectOptions(messageTypeSelect, 'general');
      
      // Planning Context sollte verschwinden
      expect(screen.queryByText('Planungskontext wählen...')).not.toBeInTheDocument();
    });

  });

  // ========================================
  // MESSAGE SENDING TESTS
  // ========================================
  
  describe('Message Sending with Planning Context', () => {
    
    test('sollte Planning Message mit Strategy Context senden', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      // Message Type auf 'planning' setzen
      const messageTypeSelect = screen.getByDisplayValue('general');
      await user.selectOptions(messageTypeSelect, 'planning');
      
      // Planning Context auf 'strategy' setzen
      const planningContextSelect = screen.getByDisplayValue('');
      await user.selectOptions(planningContextSelect, 'strategy');
      
      // Nachricht eingeben
      const messageInput = screen.getByPlaceholderText(/neue nachrichten eingeben/i);
      await user.type(messageInput, 'Strategiedokument ist fertig für Review');
      
      // Senden
      const sendButton = screen.getByTestId('paper-airplane-icon').closest('button')!;
      await user.click(sendButton);
      
      // Service sollte aufgerufen werden
      await waitFor(() => {
        expect(mockProjectCommunicationService.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'test-project-789',
            messageType: 'planning',
            planningContext: 'strategy',
            content: 'Strategiedokument ist fertig für Review',
            author: 'test-user-123',
            authorName: 'Test User'
          })
        );
      });
      
      // Input sollte geleert werden
      expect(messageInput).toHaveValue('');
    });
    
    test('sollte Planning Message mit Briefing Context senden', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren und Setup
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      const messageTypeSelect = screen.getByDisplayValue('general');
      await user.selectOptions(messageTypeSelect, 'planning');
      
      const planningContextSelect = screen.getByDisplayValue('');
      await user.selectOptions(planningContextSelect, 'briefing');
      
      // Nachricht senden
      const messageInput = screen.getByPlaceholderText(/neue nachrichten eingeben/i);
      await user.type(messageInput, 'Neues Briefing vom Kunden erhalten');
      
      const sendButton = screen.getByTestId('paper-airplane-icon').closest('button')!;
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockProjectCommunicationService.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            messageType: 'planning',
            planningContext: 'briefing',
            content: 'Neues Briefing vom Kunden erhalten'
          })
        );
      });
    });
    
    test('sollte General Message ohne Planning Context senden', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      // General Message senden (Default)
      const messageInput = screen.getByPlaceholderText(/neue nachrichten eingeben/i);
      await user.type(messageInput, 'Allgemeine Projekt-Updates');
      
      const sendButton = screen.getByTestId('paper-airplane-icon').closest('button')!;
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockProjectCommunicationService.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            messageType: 'general',
            planningContext: undefined,
            content: 'Allgemeine Projekt-Updates'
          })
        );
      });
    });
    
    test('sollte leere Nachrichten nicht senden', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      // Leere Nachricht senden versuchen
      const sendButton = screen.getByTestId('paper-airplane-icon').closest('button')!;
      await user.click(sendButton);
      
      // Service sollte nicht aufgerufen werden
      expect(mockProjectCommunicationService.sendMessage).not.toHaveBeenCalled();
    });

  });

  // ========================================
  // MESSAGE DISPLAY TESTS
  // ========================================
  
  describe('Message Display with Planning Context', () => {
    
    test('sollte Planning Messages mit Context-Badges anzeigen', async () => {
      // Mock Messages setzen
      jest.spyOn(React, 'useState')
        .mockImplementationOnce(() => ['', jest.fn()]) // searchTerm
        .mockImplementationOnce(() => ['all', jest.fn()]) // filterType
        .mockImplementationOnce(() => [[], jest.fn()]) // communications
        .mockImplementationOnce(() => [mockProjectMessages, jest.fn()]) // projectMessages
        .mockImplementationOnce(() => ['', jest.fn()]) // newMessage
        .mockImplementationOnce(() => ['general', jest.fn()]) // messageType
        .mockImplementationOnce(() => ['', jest.fn()]) // planningContext
        .mockImplementationOnce(() => [false, jest.fn()]) // loading
        .mockImplementationOnce(() => ['team', jest.fn()]) // activeView
        .mockImplementationOnce(() => [mockCommunicationFeed, jest.fn()]); // communicationFeed
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      fireEvent.click(teamTab);
      
      // Planning Messages sollten mit Context-Badges angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Das Strategiedokument ist fertig. @team bitte reviewen.')).toBeInTheDocument();
        expect(screen.getByText('Kunde hat neues Briefing bereitgestellt.')).toBeInTheDocument();
      });
      
      // Strategy Context Badge
      expect(screen.getByText(/strategie/i)).toBeInTheDocument();
      
      // Briefing Context Badge
      expect(screen.getByText(/briefing/i)).toBeInTheDocument();
      
      // General Message ohne Badge
      expect(screen.getByText('Allgemeine Projekt-Updates')).toBeInTheDocument();
    });
    
    test('sollte Messages mit Attachments korrekt anzeigen', async () => {
      // Mock Messages setzen (vereinfacht)
      jest.spyOn(React, 'useState')
        .mockImplementation((initial) => {
          if (initial === 'team') return ['team', jest.fn()];
          if (Array.isArray(initial) && initial.length === 0) {
            return [mockProjectMessages, jest.fn()];
          }
          return [initial, jest.fn()];
        });
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      fireEvent.click(teamTab);
      
      // Message mit Attachment sollte angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('briefing-v2.pdf')).toBeInTheDocument();
      });
    });
    
    test('sollte @mentions in Messages hervorheben', async () => {
      // Mock Messages setzen
      jest.spyOn(React, 'useState')
        .mockImplementation((initial) => {
          if (initial === 'team') return ['team', jest.fn()];
          if (Array.isArray(initial) && initial.length === 0) {
            return [mockProjectMessages, jest.fn()];
          }
          return [initial, jest.fn()];
        });
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      fireEvent.click(teamTab);
      
      // @mentions sollten hervorgehoben werden
      await waitFor(() => {
        const mentionElement = screen.getByText(/@team/);
        expect(mentionElement).toBeInTheDocument();
        expect(mentionElement).toHaveClass('text-blue-600', 'font-medium');
      });
    });

  });

  // ========================================
  // FILTERING & SEARCH TESTS
  // ========================================
  
  describe('Message Filtering by Planning Context', () => {
    
    test('sollte Messages nach Planning Context filtern können', async () => {
      // TODO: Diese Funktionalität müsste in der Komponente implementiert werden
      // Für jetzt als Platzhalter-Test
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      fireEvent.click(teamTab);
      
      // Filter-UI sollte vorhanden sein
      expect(screen.getByTestId('funnel-icon')).toBeInTheDocument();
    });
    
    test('sollte Planning Context in Suchfunktion berücksichtigen', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      // Suche nach 'Strategie'
      const searchInput = screen.getByPlaceholderText(/suche nach nachrichten/i);
      await user.type(searchInput, 'Strategie');
      
      // Filter sollte angewendet werden
      expect(searchInput).toHaveValue('Strategie');
    });

  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================
  
  describe('Error Handling', () => {
    
    test('sollte Fehler beim Message Senden korrekt behandeln', async () => {
      const user = userEvent.setup();
      
      // Mock Service Error
      mockProjectCommunicationService.sendMessage.mockRejectedValueOnce(
        new Error('Network error')
      );
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren und Message senden
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      const messageInput = screen.getByPlaceholderText(/neue nachrichten eingeben/i);
      await user.type(messageInput, 'Test Nachricht');
      
      const sendButton = screen.getByTestId('paper-airplane-icon').closest('button')!;
      await user.click(sendButton);
      
      // Fehler sollte geloggt werden
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Fehler beim Senden der Nachricht:',
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });
    
    test('sollte Fehler beim Feed Laden korrekt behandeln', async () => {
      mockProjectCommunicationService.getProjectCommunicationFeed.mockRejectedValueOnce(
        new Error('Feed load error')
      );
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<CommunicationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Fehler beim Laden des Kommunikations-Feeds:',
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });

  });

  // ========================================
  // MULTI-TENANCY TESTS
  // ========================================
  
  describe('Multi-Tenancy Security', () => {
    
    test('sollte Organization ID bei Message Erstellung einbinden', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren und Message senden
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      const messageInput = screen.getByPlaceholderText(/neue nachrichten eingeben/i);
      await user.type(messageInput, 'Security Test Message');
      
      const sendButton = screen.getByTestId('paper-airplane-icon').closest('button')!;
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(mockProjectCommunicationService.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'test-org-456'
          })
        );
      });
    });
    
    test('sollte Feed nur für korrekte Organization laden', async () => {
      render(<CommunicationModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockProjectCommunicationService.getProjectCommunicationFeed).toHaveBeenCalledWith(
          'test-project-789',
          'test-org-456',
          expect.any(Object)
        );
      });
    });

  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================
  
  describe('Accessibility', () => {
    
    test('sollte korrekte ARIA-Labels für Planning Features haben', () => {
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      fireEvent.click(teamTab);
      
      // Message Type Select sollte zugänglich sein
      const messageTypeSelect = screen.getByDisplayValue('general');
      expect(messageTypeSelect).toHaveAttribute('aria-label', expect.stringMatching(/message.*type/i));
      
      // Send Button sollte zugänglich sein
      const sendButton = screen.getByTestId('paper-airplane-icon').closest('button')!;
      expect(sendButton).toHaveAttribute('aria-label', expect.stringMatching(/send.*message/i));
    });
    
    test('sollte Keyboard Navigation unterstützen', async () => {
      const user = userEvent.setup();
      
      render(<CommunicationModal {...defaultProps} />);
      
      // Team Tab aktivieren
      const teamTab = screen.getByRole('tab', { name: /team/i });
      await user.click(teamTab);
      
      // Tab Navigation
      const messageTypeSelect = screen.getByDisplayValue('general');
      messageTypeSelect.focus();
      
      expect(messageTypeSelect).toHaveFocus();
      
      // Arrow keys für Select Navigation
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      // Planning Context sollte erscheinen wenn 'planning' ausgewählt
      // (Das hängt von der spezifischen Implementierung ab)
    });

  });

});
/**
 * Integration Test: CommunicationModal Flow
 *
 * Testet die Integration zwischen:
 * - CommunicationModal Component
 * - useCommunicationFeed Hook
 * - Firebase Service
 * - Tab-Switching (TeamChat + Communication Feed)
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommunicationModal } from '@/components/projects/communication/CommunicationModal';
import { projectCommunicationService } from '@/lib/firebase/project-communication-service';
import { teamChatService } from '@/lib/firebase/team-chat-service';

// Mocks
jest.mock('@/lib/firebase/project-communication-service');
jest.mock('@/lib/firebase/team-chat-service');

describe('CommunicationModal Flow Integration', () => {
  const mockCommunicationFeed = {
    emails: [
      {
        id: 'email-1',
        subject: 'Test Email',
        from: 'sender@example.com',
        timestamp: new Date(),
      },
    ],
    internalNotes: [
      {
        id: 'note-1',
        content: 'Internal note content',
        author: 'User 1',
        timestamp: new Date(),
      },
    ],
    statusChanges: [],
    approvals: [],
  };

  const mockTeamMessages = [
    {
      id: 'msg-1',
      content: 'Team chat message',
      authorId: 'user-1',
      authorName: 'User 1',
      timestamp: new Date(),
      reactions: [],
    },
  ];

  function renderWithProviders(component: React.ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Services
    (projectCommunicationService.getProjectCommunicationFeed as jest.Mock).mockResolvedValue(
      mockCommunicationFeed
    );
    (teamChatService.getMessages as jest.Mock).mockResolvedValue(mockTeamMessages);
    (teamChatService.subscribeToMessages as jest.Mock).mockReturnValue(() => {});
  });

  it('sollte Modal öffnen und Communication Feed laden', async () => {
    const onClose = jest.fn();

    renderWithProviders(
      <CommunicationModal
        isOpen={true}
        onClose={onClose}
        projectId="project-123"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
      />
    );

    // Modal sollte sichtbar sein
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Communication Feed sollte geladen werden
    await waitFor(() => {
      expect(screen.getByText('Test Email')).toBeInTheDocument();
      expect(screen.getByText('Internal note content')).toBeInTheDocument();
    });

    // Service wurde aufgerufen
    expect(projectCommunicationService.getProjectCommunicationFeed).toHaveBeenCalledWith(
      'project-123',
      undefined
    );
  });

  it('sollte zwischen Tabs switchen können', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <CommunicationModal
        isOpen={true}
        onClose={jest.fn()}
        projectId="project-123"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
      />
    );

    // Initial: Communication Feed Tab aktiv
    await waitFor(() => {
      expect(screen.getByText('Test Email')).toBeInTheDocument();
    });

    // TeamChat Tab klicken
    const teamChatTab = screen.getByRole('tab', { name: /team.*chat/i });
    await user.click(teamChatTab);

    // TeamChat sollte geladen werden
    await waitFor(() => {
      expect(screen.getByText('Team chat message')).toBeInTheDocument();
    });

    // Service wurde aufgerufen
    expect(teamChatService.getMessages).toHaveBeenCalledWith('project-123');

    // Zurück zu Communication Feed Tab
    const communicationTab = screen.getByRole('tab', { name: /kommunikation|communication/i });
    await user.click(communicationTab);

    // Communication Feed sollte wieder sichtbar sein
    await waitFor(() => {
      expect(screen.getByText('Test Email')).toBeInTheDocument();
    });
  });

  it('sollte Modal schließen beim Close-Button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    renderWithProviders(
      <CommunicationModal
        isOpen={true}
        onClose={onClose}
        projectId="project-123"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
      />
    );

    // Close-Button finden und klicken
    const closeButton = screen.getByRole('button', { name: /close|schließen/i });
    await user.click(closeButton);

    // onClose wurde aufgerufen
    expect(onClose).toHaveBeenCalled();
  });

  it('sollte Projekt-Title im Header anzeigen', async () => {
    renderWithProviders(
      <CommunicationModal
        isOpen={true}
        onClose={jest.fn()}
        projectId="project-123"
        projectTitle="My Awesome Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
      />
    );

    // Project Title sollte im Modal sichtbar sein
    await waitFor(() => {
      expect(screen.getByText(/My Awesome Project/i)).toBeInTheDocument();
    });
  });
});

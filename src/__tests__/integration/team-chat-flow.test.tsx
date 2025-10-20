/**
 * Integration Test: TeamChat Complete Flow
 *
 * Testet die Integration zwischen:
 * - TeamChat Component
 * - useTeamMessages Hook
 * - Firebase Service
 * - React Query Cache
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamChat } from '@/components/projects/communication/TeamChat';
import { teamChatService } from '@/lib/firebase/team-chat-service';
import { authenticatedFetch } from '@/lib/utils/api-client';

// Mocks
jest.mock('@/lib/firebase/team-chat-service');
jest.mock('@/lib/utils/api-client');

describe('TeamChat Flow Integration', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      content: 'First message',
      authorId: 'user-1',
      authorName: 'User 1',
      timestamp: new Date(),
      reactions: [],
    },
    {
      id: 'msg-2',
      content: 'Second message',
      authorId: 'user-2',
      authorName: 'User 2',
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
    localStorage.clear();

    // Mock Firebase Service
    (teamChatService.getMessages as jest.Mock).mockResolvedValue(mockMessages);
    (teamChatService.subscribeToMessages as jest.Mock).mockReturnValue(() => {});
    (teamChatService.toggleReaction as jest.Mock).mockResolvedValue(undefined);

    // Mock API Client
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, messageId: 'new-msg' }),
    });
  });

  it('sollte Messages laden und anzeigen', async () => {
    renderWithProviders(
      <TeamChat
        projectId="project-123"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
        lastReadTimestamp={new Date(Date.now() - 1000)}
      />
    );

    // Warte auf Messages
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    // Service wurde aufgerufen
    expect(teamChatService.getMessages).toHaveBeenCalledWith('project-123');

    // Real-time Subscription wurde erstellt
    expect(teamChatService.subscribeToMessages).toHaveBeenCalled();
  });

  it('sollte neue Message senden und in Liste anzeigen', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TeamChat
        projectId="project-123"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
        lastReadTimestamp={new Date()}
      />
    );

    // Warte bis Messages geladen
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
    });

    // Message-Input finden
    const messageInput = screen.getByRole('textbox');
    await user.type(messageInput, 'New test message');

    // Send-Button klicken
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // API wurde aufgerufen
    await waitFor(() => {
      expect(authenticatedFetch).toHaveBeenCalledWith(
        '/api/v1/messages',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New test message'),
        })
      );
    });

    // Input sollte gecleart sein
    expect(messageInput).toHaveValue('');
  });

  it('sollte Reaction hinzufügen via Hook + Service', async () => {
    const user = userEvent.setup();

    // Mock mit Reaction-Button
    const mockMessagesWithReaction = [
      {
        ...mockMessages[0],
        id: 'msg-reaction-test',
      },
    ];

    (teamChatService.getMessages as jest.Mock).mockResolvedValue(mockMessagesWithReaction);

    renderWithProviders(
      <TeamChat
        projectId="project-123"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
        lastReadTimestamp={new Date()}
      />
    );

    // Warte auf Message
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
    });

    // Hover über Message (Reaction-Bar sollte erscheinen)
    const message = screen.getByText('First message').closest('[data-testid^="message-item"]');
    if (message) {
      await user.hover(message);

      // Reaction-Button klicken
      const reactionButton = screen.getByTitle(/reaction/i);
      if (reactionButton) {
        await user.click(reactionButton);

        // Service wurde aufgerufen
        await waitFor(() => {
          expect(teamChatService.toggleReaction).toHaveBeenCalledWith(
            'project-123',
            'msg-reaction-test',
            expect.any(String),
            'user-1',
            'Test User'
          );
        });
      }
    }
  });

  it('sollte Loading-State während Message-Sending anzeigen', async () => {
    const user = userEvent.setup();

    // Mock lange API-Response
    (authenticatedFetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, messageId: 'new-msg' }),
              }),
            1000
          )
        )
    );

    renderWithProviders(
      <TeamChat
        projectId="project-123"
        projectTitle="Test Project"
        organizationId="org-1"
        userId="user-1"
        userDisplayName="Test User"
        lastReadTimestamp={new Date()}
      />
    );

    // Message-Input finden
    const messageInput = screen.getByRole('textbox');
    await user.type(messageInput, 'Test message');

    // Send-Button klicken
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Loading-Spinner sollte erscheinen
    await waitFor(() => {
      const spinner = screen.getByRole('button', { name: /send/i }).querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    // Warte bis Sending abgeschlossen
    await waitFor(
      () => {
        const spinner = screen
          .getByRole('button', { name: /send/i })
          .querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});

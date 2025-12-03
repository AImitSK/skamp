/**
 * useTeamMessages Hook Tests
 *
 * Tests für:
 * - useTeamMessages (Messages laden + Real-time Updates)
 * - useSendMessage (Message senden)
 * - useMessageReaction (Reaction hinzufügen/entfernen)
 * - useEditMessage (Message bearbeiten)
 * - useDeleteMessage (Message löschen)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTeamMessages,
  useSendMessage,
  useMessageReaction,
  useEditMessage,
  useDeleteMessage
} from '../useTeamMessages';
import { teamChatService } from '@/lib/firebase/team-chat-service';
import { authenticatedFetch } from '@/lib/utils/api-client';

// Mocks
jest.mock('@/lib/firebase/team-chat-service');
jest.mock('@/lib/utils/api-client');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useTeamMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Messages laden wenn projectId vorhanden', async () => {
    const mockMessages = [
      { id: '1', content: 'Test 1', authorId: 'user1', authorName: 'User 1', timestamp: new Date() },
      { id: '2', content: 'Test 2', authorId: 'user2', authorName: 'User 2', timestamp: new Date() },
    ];

    (teamChatService.getMessages as jest.Mock).mockResolvedValue(mockMessages);
    (teamChatService.subscribeToMessages as jest.Mock).mockReturnValue(() => {});

    const { result } = renderHook(
      () => useTeamMessages('project-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMessages);
    expect(teamChatService.getMessages).toHaveBeenCalledWith('project-123');
  });

  it('sollte Query disablen wenn projectId undefined', async () => {
    const { result } = renderHook(
      () => useTeamMessages(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(teamChatService.getMessages).not.toHaveBeenCalled();
  });

  it('sollte Real-time Subscription erstellen und cleanup', async () => {
    const unsubscribeMock = jest.fn();
    (teamChatService.getMessages as jest.Mock).mockResolvedValue([]);
    (teamChatService.subscribeToMessages as jest.Mock).mockReturnValue(unsubscribeMock);

    const { unmount } = renderHook(
      () => useTeamMessages('project-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(teamChatService.subscribeToMessages).toHaveBeenCalledWith(
        'project-123',
        expect.any(Function)
      );
    });

    // Cleanup beim Unmount
    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('sollte Error werfen bei API-Fehler', async () => {
    (teamChatService.getMessages as jest.Mock).mockRejectedValue(
      new Error('Firestore error')
    );

    const { result } = renderHook(
      () => useTeamMessages('project-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe('useSendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Message erfolgreich senden', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, messageId: 'new-msg-123' })
    });

    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      projectId: 'project-123',
      content: 'Test message',
      authorId: 'user-1',
      authorName: 'Test User',
      organizationId: 'org-1',
      mentions: ['@user2']
    });

    expect(authenticatedFetch).toHaveBeenCalledWith('/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project-123',
        content: 'Test message',
        authorId: 'user-1',
        authorName: 'Test User',
        organizationId: 'org-1',
        mentions: ['@user2']
      })
    });
  });

  it('sollte Error werfen bei API-Fehler', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Rate limit exceeded' })
    });

    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({
        projectId: 'project-123',
        content: 'Test',
        authorId: 'user-1',
        authorName: 'Test User',
        organizationId: 'org-1'
      })
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('sollte Cache invalidieren nach erfolgreichem Senden', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, messageId: 'new-msg' })
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await result.current.mutateAsync({
      projectId: 'project-123',
      content: 'Test',
      authorId: 'user-1',
      authorName: 'Test User',
      organizationId: 'org-1'
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['team-messages', 'project-123']
    });
  });
});

describe('useMessageReaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Reaction erfolgreich toggled', async () => {
    (teamChatService.toggleReaction as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useMessageReaction(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      projectId: 'project-123',
      messageId: 'msg-1',
      emoji: '👍',
      userId: 'user-1',
      userName: 'Test User'
    });

    expect(teamChatService.toggleReaction).toHaveBeenCalledWith(
      'project-123',
      'msg-1',
      '👍',
      'user-1',
      'Test User'
    );
  });

  it('sollte optimistischen Update durchführen ohne Cache-Invalidierung', async () => {
    (teamChatService.toggleReaction as jest.Mock).mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Initialer Cache-Zustand mit bestehenden Messages
    const initialMessages = [
      {
        id: 'msg-1',
        content: 'Test message',
        authorId: 'user-2',
        authorName: 'User 2',
        timestamp: new Date(),
        reactions: []
      }
    ];
    queryClient.setQueryData(['team-messages', 'project-123'], initialMessages);

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useMessageReaction(), { wrapper });

    await result.current.mutateAsync({
      projectId: 'project-123',
      messageId: 'msg-1',
      emoji: '👍',
      userId: 'user-1',
      userName: 'Test User'
    });

    // Prüfe dass KEIN invalidateQueries aufgerufen wurde
    // (Real-time Subscription übernimmt Updates)
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Prüfe dass optimistischer Update durchgeführt wurde
    const updatedMessages = queryClient.getQueryData(['team-messages', 'project-123']) as any[];
    expect(updatedMessages[0].reactions).toEqual([
      {
        emoji: '👍',
        userIds: ['user-1'],
        userNames: ['Test User'],
        count: 1
      }
    ]);
  });
});

describe('useEditMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Message erfolgreich bearbeiten', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    const { result } = renderHook(() => useEditMessage(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      projectId: 'project-123',
      messageId: 'msg-1',
      newContent: 'Updated content'
    });

    expect(authenticatedFetch).toHaveBeenCalledWith('/api/v1/messages/msg-1', {
      method: 'PATCH',
      body: JSON.stringify({
        projectId: 'project-123',
        newContent: 'Updated content'
      })
    });
  });

  it('sollte Error werfen bei Time-Limit', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Time limit exceeded' })
    });

    const { result } = renderHook(() => useEditMessage(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({
        projectId: 'project-123',
        messageId: 'msg-1',
        newContent: 'Updated'
      })
    ).rejects.toThrow('Time limit exceeded');
  });
});

describe('useDeleteMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Message erfolgreich löschen', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    const { result } = renderHook(() => useDeleteMessage(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      projectId: 'project-123',
      messageId: 'msg-1'
    });

    expect(authenticatedFetch).toHaveBeenCalledWith(
      '/api/v1/messages/msg-1?projectId=project-123',
      {
        method: 'DELETE'
      }
    );
  });

  it('sollte Error werfen bei Permission-Fehler', async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Forbidden. You can only delete your own messages.' })
    });

    const { result } = renderHook(() => useDeleteMessage(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({
        projectId: 'project-123',
        messageId: 'msg-1'
      })
    ).rejects.toThrow('Forbidden');
  });
});

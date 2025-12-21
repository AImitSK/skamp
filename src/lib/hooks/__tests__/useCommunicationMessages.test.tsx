/**
 * useCommunicationMessages Hook Tests
 *
 * Tests für:
 * - useCommunicationFeed (Communication Feed laden)
 * - useCreateInternalNote (Interne Notiz erstellen)
 * - useLinkEmailToProject (E-Mail mit Projekt verknüpfen)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCommunicationFeed,
  useCreateInternalNote,
  useLinkEmailToProject
} from '../useCommunicationMessages';
import { projectCommunicationService } from '@/lib/firebase/project-communication-service';

// Mocks
jest.mock('@/lib/firebase/project-communication-service');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('useCommunicationFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Communication Feed laden', async () => {
    const mockFeed = {
      projectId: 'project-123',
      entries: [
        { id: 'email-1', type: 'email-thread' as const, title: 'Test Email', preview: 'Test', timestamp: { toMillis: () => Date.now() } }
      ],
      summary: {
        totalEntries: 1,
        unreadEmails: 0,
        pendingApprovals: 0,
        recentActivity: 1
      },
      hasMore: false
    };

    (projectCommunicationService.getProjectCommunicationFeed as jest.Mock).mockResolvedValue(mockFeed);

    const { result } = renderHook(
      () => useCommunicationFeed('project-123', 'org-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFeed);
    expect(projectCommunicationService.getProjectCommunicationFeed).toHaveBeenCalledWith(
      'project-123',
      'org-123',
      { limit: undefined }
    );
  });

  it('sollte Query disablen wenn projectId undefined', async () => {
    const { result } = renderHook(
      () => useCommunicationFeed(undefined, undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(projectCommunicationService.getProjectCommunicationFeed).not.toHaveBeenCalled();
  });

  it('sollte limitCount Option respektieren', async () => {
    const mockFeed = {
      projectId: 'project-123',
      entries: [],
      summary: {
        totalEntries: 0,
        unreadEmails: 0,
        pendingApprovals: 0,
        recentActivity: 0
      },
      hasMore: false
    };

    (projectCommunicationService.getProjectCommunicationFeed as jest.Mock).mockResolvedValue(mockFeed);

    const { result } = renderHook(
      () => useCommunicationFeed('project-123', 'org-123', { limitCount: 50 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(projectCommunicationService.getProjectCommunicationFeed).toHaveBeenCalledWith(
      'project-123',
      'org-123',
      { limit: 50 }
    );
  });
});

describe('useCreateInternalNote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte interne Notiz erfolgreich erstellen', async () => {
    (projectCommunicationService.createInternalNote as jest.Mock).mockResolvedValue('note-123');

    const { result } = renderHook(() => useCreateInternalNote(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      projectId: 'project-123',
      content: 'Test internal note',
      author: 'user-123',
      authorName: 'Test User',
      organizationId: 'org-123',
      mentions: ['@user2']
    });

    expect(projectCommunicationService.createInternalNote).toHaveBeenCalledWith(
      'project-123',
      'Test internal note',
      'user-123',
      'Test User',
      'org-123',
      ['@user2'],
      undefined
    );
  });

  it('sollte Cache invalidieren nach erfolgreichem Erstellen', async () => {
    (projectCommunicationService.createInternalNote as jest.Mock).mockResolvedValue('note-123');

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

    const { result } = renderHook(() => useCreateInternalNote(), { wrapper });

    await result.current.mutateAsync({
      projectId: 'project-123',
      content: 'Test note',
      author: 'Test User',
      authorName: 'Test User',
      organizationId: 'org-123'
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['communication-feed', 'project-123']
    });
  });
});

describe('useLinkEmailToProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte E-Mail erfolgreich mit Projekt verknüpfen', async () => {
    (projectCommunicationService.linkEmailToProject as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLinkEmailToProject(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      projectId: 'project-123',
      emailThreadId: 'thread-456',
      method: 'manual',
      userId: 'user-123'
    });

    expect(projectCommunicationService.linkEmailToProject).toHaveBeenCalledWith(
      'thread-456',
      'project-123',
      'manual',
      1.0,
      'user-123'
    );
  });

  it('sollte Cache invalidieren nach erfolgreichem Verknüpfen', async () => {
    (projectCommunicationService.linkEmailToProject as jest.Mock).mockResolvedValue(undefined);

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

    const { result } = renderHook(() => useLinkEmailToProject(), { wrapper });

    await result.current.mutateAsync({
      projectId: 'project-123',
      emailThreadId: 'thread-456',
      method: 'manual',
      userId: 'user-123'
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['communication-feed', 'project-123']
    });
  });
});

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamChatService, TeamMessage } from '@/lib/firebase/team-chat-service';
import { useEffect } from 'react';

/**
 * Hook für Team-Chat-Messages mit Real-time Updates
 * Kombiniert React Query Caching mit Firebase Real-time Subscriptions
 */
export function useTeamMessages(projectId: string | undefined) {
  const queryClient = useQueryClient();

  // Initial Query (lädt Messages aus Firestore)
  const query = useQuery({
    queryKey: ['team-messages', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No projectId');
      return teamChatService.getMessages(projectId);
    },
    enabled: !!projectId,
    staleTime: 0, // Immer fresh wegen Real-time Updates
  });

  // Real-time Subscription
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = teamChatService.subscribeToMessages(
      projectId,
      (messages) => {
        // Update Cache mit neuen Messages
        queryClient.setQueryData(['team-messages', projectId], messages);
      }
    );

    return () => unsubscribe();
  }, [projectId, queryClient]);

  return query;
}

/**
 * Hook zum Senden einer Team-Chat-Message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      content: string;
      authorId: string;
      authorName: string;
      authorPhotoUrl?: string;
      organizationId: string;
      mentions?: string[];
    }) => {
      const { projectId, ...messageData } = data;
      return teamChatService.sendMessage(projectId, {
        ...messageData,
        mentions: messageData.mentions || [],
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['team-messages', variables.projectId]
      });
    },
  });
}

/**
 * Hook für Message Reactions (Toggle)
 */
export function useMessageReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      messageId: string;
      emoji: string;
      userId: string;
      userName: string;
    }) => {
      return teamChatService.toggleReaction(
        data.projectId,
        data.messageId,
        data.emoji,
        data.userId,
        data.userName
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['team-messages', variables.projectId]
      });
    },
  });
}

/**
 * Hook für Message Edit
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      messageId: string;
      newContent: string;
    }) => {
      return teamChatService.editMessage(
        data.projectId,
        data.messageId,
        data.newContent
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['team-messages', variables.projectId]
      });
    },
  });
}

/**
 * Hook für Message Delete
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      messageId: string;
    }) => {
      return teamChatService.deleteMessage(
        data.projectId,
        data.messageId
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['team-messages', variables.projectId]
      });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamChatService, TeamMessage } from '@/lib/firebase/team-chat-service';
import { useEffect } from 'react';
import { authenticatedFetch } from '@/lib/utils/api-client';

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
 * Verwendet Admin SDK API Route für Server-Side Validation
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
      // API Route aufrufen mit Auth Token
      const response = await authenticatedFetch('/api/v1/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return response.json();
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
 * Mit Optimistic Updates für sofortige UI-Reaktion
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
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['team-messages', variables.projectId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(['team-messages', variables.projectId]);

      // Optimistically update reactions
      queryClient.setQueryData(['team-messages', variables.projectId], (old: any) => {
        if (!old) return old;

        return old.map((msg: any) => {
          if (msg.id !== variables.messageId) return msg;

          const currentReactions = msg.reactions || [];

          // Remove all user's reactions first
          let updatedReactions = currentReactions.map((reaction: any) => ({
            ...reaction,
            userIds: reaction.userIds.filter((id: string) => id !== variables.userId),
            userNames: reaction.userNames.filter((_: string, index: number) =>
              reaction.userIds[index] !== variables.userId
            ),
            count: reaction.userIds.filter((id: string) => id !== variables.userId).length
          })).filter((reaction: any) => reaction.count > 0);

          // Check if user already had this reaction
          const hadThisReaction = currentReactions.some((r: any) =>
            r.emoji === variables.emoji && r.userIds.includes(variables.userId)
          );

          if (!hadThisReaction) {
            // Add new reaction
            const existingReactionIndex = updatedReactions.findIndex((r: any) => r.emoji === variables.emoji);

            if (existingReactionIndex >= 0) {
              updatedReactions[existingReactionIndex].userIds.push(variables.userId);
              updatedReactions[existingReactionIndex].userNames.push(variables.userName);
              updatedReactions[existingReactionIndex].count++;
            } else {
              updatedReactions.push({
                emoji: variables.emoji,
                userIds: [variables.userId],
                userNames: [variables.userName],
                count: 1
              });
            }
          }

          return { ...msg, reactions: updatedReactions };
        });
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['team-messages', variables.projectId], context.previousMessages);
      }
    },
    // onSettled entfernt - kein Refetch nötig, Firebase Real-time übernimmt
  });
}

/**
 * Hook für Message Edit
 * Verwendet Admin SDK API Route für Server-Side Validation
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      messageId: string;
      newContent: string;
    }) => {
      // API Route aufrufen mit Auth Token
      const response = await authenticatedFetch(`/api/v1/messages/${data.messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          projectId: data.projectId,
          newContent: data.newContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to edit message');
      }

      return response.json();
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
 * Verwendet Admin SDK API Route für Server-Side Validation
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      messageId: string;
    }) => {
      // API Route aufrufen mit Auth Token
      const response = await authenticatedFetch(
        `/api/v1/messages/${data.messageId}?projectId=${data.projectId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete message');
      }

      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['team-messages', variables.projectId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(['team-messages', variables.projectId]);

      // Optimistically remove message from cache
      queryClient.setQueryData(['team-messages', variables.projectId], (old: any) => {
        if (!old) return old;
        return old.filter((msg: any) => msg.id !== variables.messageId);
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['team-messages', variables.projectId], context.previousMessages);
      }
    },
    onSettled: (_, __, variables) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({
        queryKey: ['team-messages', variables.projectId]
      });
    },
  });
}

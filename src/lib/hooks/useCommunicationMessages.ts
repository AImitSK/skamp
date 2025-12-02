import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectCommunicationService, ProjectCommunicationFeed } from '@/lib/firebase/project-communication-service';

/**
 * Hook für Project Communication Feed
 *
 * Lädt den Kommunikations-Feed für ein Projekt
 * (E-Mails, Interne Notizen, Status-Änderungen, Approvals)
 */
export function useCommunicationFeed(
  projectId: string | undefined,
  organizationId: string | undefined,
  options?: {
    limitCount?: number;
  }
) {
  return useQuery<ProjectCommunicationFeed>({
    queryKey: ['communication-feed', projectId, organizationId, options?.limitCount],
    queryFn: async () => {
      if (!projectId || !organizationId) throw new Error('No projectId or organizationId');
      return projectCommunicationService.getProjectCommunicationFeed(
        projectId,
        organizationId,
        { limit: options?.limitCount }
      );
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten (Communication Feed updates weniger häufig als Team Chat)
  });
}

/**
 * Hook zum Erstellen einer internen Notiz
 */
export function useCreateInternalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      content: string;
      author: string;
      authorName: string;
      organizationId: string;
      mentions?: string[];
      attachments?: string[];
    }) => {
      return projectCommunicationService.createInternalNote(
        data.projectId,
        data.content,
        data.author,
        data.authorName,
        data.organizationId,
        data.mentions,
        data.attachments
      );
    },
    onSuccess: (_, variables) => {
      // Invalidiere den Communication Feed
      queryClient.invalidateQueries({
        queryKey: ['communication-feed', variables.projectId]
      });
    },
  });
}

/**
 * Hook zum Verknüpfen einer E-Mail mit einem Projekt
 */
export function useLinkEmailToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      emailThreadId: string;
      projectId: string;
      method: 'manual' | 'automatic';
      userId?: string;
    }) => {
      return projectCommunicationService.linkEmailToProject(
        data.emailThreadId,
        data.projectId,
        data.method,
        1.0, // confidence
        data.userId
      );
    },
    onSuccess: (_, variables) => {
      // Invalidiere den Communication Feed
      queryClient.invalidateQueries({
        queryKey: ['communication-feed', variables.projectId]
      });
    },
  });
}

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
  options?: {
    limitCount?: number;
  }
) {
  return useQuery<ProjectCommunicationFeed>({
    queryKey: ['communication-feed', projectId, options?.limitCount],
    queryFn: async () => {
      if (!projectId) throw new Error('No projectId');
      return projectCommunicationService.getProjectCommunicationFeed(
        projectId,
        options?.limitCount
      );
    },
    enabled: !!projectId,
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
      mentions?: string[];
    }) => {
      return projectCommunicationService.createInternalNote(
        data.projectId,
        data.content,
        data.author,
        data.mentions
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
      projectId: string;
      emailThreadId: string;
    }) => {
      return projectCommunicationService.linkEmailToProject(
        data.projectId,
        data.emailThreadId
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

// src/hooks/useListLinking.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectListsService } from '@/lib/firebase/project-lists-service';
import { toastService } from '@/lib/utils/toast';
import { projectListsKeys } from './useProjectLists';
import { masterListsKeys } from './useMasterLists';

// Hook: Master-Liste mit Projekt verknüpfen
export function useLinkMasterList(projectId: string, organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      masterListId: string;
      userId: string;
    }) => {
      return await projectListsService.linkMasterList(
        projectId,
        data.masterListId,
        data.userId,
        organizationId
      );
    },
    onSuccess: (_data, variables) => {
      // Invalidate betroffene Queries
      queryClient.invalidateQueries({ queryKey: projectListsKeys.byProject(projectId) });
      queryClient.invalidateQueries({ queryKey: masterListsKeys.details([variables.masterListId]) });
      toastService.success('Liste erfolgreich verknüpft');
    },
    onError: (error: Error) => {
      toastService.error(error.message || 'Fehler beim Verknüpfen der Liste');
    },
  });
}

// Hook: Liste-Verknüpfung entfernen
export function useUnlinkList(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      await projectListsService.unlinkList(projectId, listId);
    },
    onSuccess: () => {
      // Invalidate Project Lists
      queryClient.invalidateQueries({ queryKey: projectListsKeys.byProject(projectId) });
      toastService.success('Verknüpfung erfolgreich entfernt');
    },
    onError: (error: Error) => {
      toastService.error(error.message || 'Fehler beim Entfernen der Verknüpfung');
    },
  });
}

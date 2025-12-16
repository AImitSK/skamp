// src/hooks/useListLinking.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { projectListsService } from '@/lib/firebase/project-lists-service';
import { toastService } from '@/lib/utils/toast';
import { projectListsKeys } from './useProjectLists';
import { masterListsKeys } from './useMasterLists';

// Hook: Master-Liste mit Projekt verknüpfen
export function useLinkMasterList(projectId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const tToast = useTranslations('toasts');

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
      toastService.success(tToast('listLinked'));
    },
    onError: (error: Error) => {
      toastService.error(error.message || tToast('listLinkError'));
    },
  });
}

// Hook: Liste-Verknüpfung entfernen
export function useUnlinkList(projectId: string) {
  const queryClient = useQueryClient();
  const tToast = useTranslations('toasts');

  return useMutation({
    mutationFn: async (listId: string) => {
      await projectListsService.unlinkList(projectId, listId);
    },
    onSuccess: () => {
      // Invalidate Project Lists
      queryClient.invalidateQueries({ queryKey: projectListsKeys.byProject(projectId) });
      toastService.success(tToast('listUnlinked'));
    },
    onError: (error: Error) => {
      toastService.error(error.message || tToast('listUnlinkError'));
    },
  });
}

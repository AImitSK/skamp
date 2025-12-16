// src/hooks/useProjectLists.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectListsService, ProjectDistributionList } from '@/lib/firebase/project-lists-service';
import { DistributionList } from '@/types/lists';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { toastService } from '@/lib/utils/toast';
import { useTranslations } from 'next-intl';

// Query Keys
export const projectListsKeys = {
  all: ['project-lists'] as const,
  byProject: (projectId: string) => [...projectListsKeys.all, projectId] as const,
  contacts: (listId: string) => ['project-list-contacts', listId] as const,
};

// Hook: Projekt-Listen abrufen
export function useProjectLists(projectId: string) {
  return useQuery({
    queryKey: projectListsKeys.byProject(projectId),
    queryFn: () => projectListsService.getProjectLists(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 Minuten
  });
}

// Hook: Projekt-Liste erstellen
export function useCreateProjectList(projectId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const tToast = useTranslations('toasts');

  return useMutation({
    mutationFn: async (data: {
      listData: {
        name: string;
        description?: string;
        category?: string;
        type?: 'static' | 'dynamic';
        filters?: any;
        contactIds?: string[];
      };
      userId: string;
    }) => {
      return await projectListsService.createProjectList(
        projectId,
        data.listData,
        data.userId,
        organizationId
      );
    },
    onSuccess: () => {
      // Invalidate und refetch
      queryClient.invalidateQueries({ queryKey: projectListsKeys.byProject(projectId) });
      toastService.success(tToast('listCreated'));
    },
    onError: (error: Error) => {
      toastService.error(error.message || tToast('listCreateError'));
    },
  });
}

// Hook: Projekt-Liste aktualisieren
export function useUpdateProjectList(projectId: string) {
  const queryClient = useQueryClient();
  const tToast = useTranslations('toasts');

  return useMutation({
    mutationFn: async (data: {
      listId: string;
      updates: Partial<ProjectDistributionList>;
    }) => {
      await projectListsService.updateProjectList(data.listId, data.updates);
    },
    onMutate: async ({ listId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectListsKeys.byProject(projectId) });

      // Snapshot previous value
      const previousLists = queryClient.getQueryData<ProjectDistributionList[]>(
        projectListsKeys.byProject(projectId)
      );

      // Optimistically update
      if (previousLists) {
        queryClient.setQueryData<ProjectDistributionList[]>(
          projectListsKeys.byProject(projectId),
          previousLists.map(list =>
            list.id === listId ? { ...list, ...updates } : list
          )
        );
      }

      return { previousLists };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousLists) {
        queryClient.setQueryData(
          projectListsKeys.byProject(projectId),
          context.previousLists
        );
      }
      toastService.error(error.message || tToast('listUpdateError'));
    },
    onSuccess: () => {
      toastService.success(tToast('listUpdated'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectListsKeys.byProject(projectId) });
    },
  });
}

// Hook: Projekt-Liste löschen
export function useDeleteProjectList(projectId: string) {
  const queryClient = useQueryClient();
  const tToast = useTranslations('toasts');

  return useMutation({
    mutationFn: async (listId: string) => {
      await projectListsService.unlinkList(projectId, listId);
    },
    onMutate: async (listId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectListsKeys.byProject(projectId) });

      // Snapshot previous value
      const previousLists = queryClient.getQueryData<ProjectDistributionList[]>(
        projectListsKeys.byProject(projectId)
      );

      // Optimistically remove
      if (previousLists) {
        queryClient.setQueryData<ProjectDistributionList[]>(
          projectListsKeys.byProject(projectId),
          previousLists.filter(list => list.id !== listId)
        );
      }

      return { previousLists };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousLists) {
        queryClient.setQueryData(
          projectListsKeys.byProject(projectId),
          context.previousLists
        );
      }
      toastService.error(error.message || tToast('listDeleteError'));
    },
    onSuccess: () => {
      toastService.success(tToast('listDeleted'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectListsKeys.byProject(projectId) });
    },
  });
}

// Hook: Kontakte einer Projekt-Liste abrufen
export function useProjectListContacts(listId: string | undefined) {
  return useQuery({
    queryKey: projectListsKeys.contacts(listId!),
    queryFn: () => projectListsService.getProjectListContacts(listId!),
    enabled: !!listId,
    staleTime: 1000 * 60 * 3, // 3 Minuten
  });
}

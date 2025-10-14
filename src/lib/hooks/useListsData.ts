// src/lib/hooks/useListsData.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsService } from '@/lib/firebase/lists-service';
import { DistributionList } from '@/types/lists';

/**
 * Hook zum Laden aller Verteilerlisten
 */
export function useLists(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['lists', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization');
      return listsService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Hook zum Laden einer einzelnen Liste
 */
export function useList(listId: string | undefined) {
  return useQuery({
    queryKey: ['list', listId],
    queryFn: () => {
      if (!listId) throw new Error('No list ID');
      return listsService.getById(listId);
    },
    enabled: !!listId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook zum Erstellen einer Liste
 */
export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>;
      organizationId: string;
      userId: string;
    }) => {
      return listsService.create(data.listData);
    },
    onSuccess: (_, variables) => {
      // Invalidiere Listen-Cache
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Aktualisieren einer Liste
 */
export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listId: string;
      updates: Partial<DistributionList>;
      organizationId: string;
    }) => {
      return listsService.update(data.listId, data.updates);
    },
    onSuccess: (_, variables) => {
      // Invalidiere spezifische Liste und Listen-Cache
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Löschen einer Liste
 */
export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listId: string;
      organizationId: string;
    }) => {
      return listsService.delete(data.listId);
    },
    onSuccess: (_, variables) => {
      // Invalidiere Listen-Cache
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Bulk-Löschen von Listen
 */
export function useBulkDeleteLists() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listIds: string[];
      organizationId: string;
    }) => {
      await Promise.all(
        data.listIds.map(id => listsService.delete(id))
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}

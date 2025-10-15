import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicationService } from '@/lib/firebase/library-service';
import type { Publication } from '@/types/library';

// Query Hooks
export function usePublications(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['publications', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization');
      return publicationService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

export function usePublication(id: string | undefined, organizationId: string | undefined) {
  return useQuery({
    queryKey: ['publication', id, organizationId],
    queryFn: () => {
      if (!id) throw new Error('No ID');
      if (!organizationId) throw new Error('No organization');
      return publicationService.getById(id, organizationId);
    },
    enabled: !!id && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation Hooks
export function useCreatePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { organizationId: string; userId: string; publicationData: any }) => {
      return publicationService.create(data.publicationData, {
        organizationId: data.organizationId,
        userId: data.userId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}

export function useUpdatePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; userId: string; publicationData: any }) => {
      await publicationService.update(data.id, data.publicationData, {
        organizationId: data.organizationId,
        userId: data.userId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publication', variables.id, variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}

export function useDeletePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; userId: string }) => {
      await publicationService.softDelete(data.id, {
        organizationId: data.organizationId,
        userId: data.userId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}

export function useVerifyPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; userId: string }) => {
      await publicationService.verify(data.id, {
        organizationId: data.organizationId,
        userId: data.userId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publication', variables.id, variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}

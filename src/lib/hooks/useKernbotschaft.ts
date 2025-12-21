// src/lib/hooks/useKernbotschaft.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { kernbotschaftService } from '@/lib/firebase/kernbotschaft-service';
import { Kernbotschaft, KernbotschaftCreateData, KernbotschaftUpdateData } from '@/types/kernbotschaft';

/**
 * Hook um die Kernbotschaft eines Projekts zu laden
 *
 * @param projectId - ID des Projekts
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Kernbotschaft
 *
 * @example
 * ```tsx
 * const { data: kernbotschaft, isLoading } = useKernbotschaft(projectId);
 * ```
 */
export function useKernbotschaft(
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<Kernbotschaft | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['kernbotschaft', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return kernbotschaftService.getKernbotschaftByProject(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook um eine Kernbotschaft zu erstellen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Erstellen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: createKernbotschaft, isPending } = useCreateKernbotschaft();
 * createKernbotschaft({
 *   data: { projectId, companyId, occasion: '...', goal: '...', ... },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useCreateKernbotschaft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      organizationId,
      userId,
    }: {
      data: KernbotschaftCreateData;
      organizationId: string;
      userId: string;
    }) => {
      return kernbotschaftService.createKernbotschaft(data, { organizationId, userId });
    },
    onSuccess: (_, { data }) => {
      // Invalidiere Kernbotschaft Query
      queryClient.invalidateQueries({
        queryKey: ['kernbotschaft', data.projectId],
      });
    },
  });
}

/**
 * Hook um eine Kernbotschaft zu aktualisieren
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Update
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: updateKernbotschaft, isPending } = useUpdateKernbotschaft();
 * updateKernbotschaft({
 *   projectId: 'proj-123',
 *   id: 'kernb-123',
 *   data: { content: 'Updated...', status: 'completed' },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useUpdateKernbotschaft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      id,
      data,
      organizationId,
      userId,
    }: {
      projectId: string;
      id: string;
      data: KernbotschaftUpdateData;
      organizationId: string;
      userId: string;
    }) => {
      return kernbotschaftService.updateKernbotschaft(projectId, id, data, { organizationId, userId });
    },
    onSuccess: (_, { projectId }) => {
      // Invalidiere Kernbotschaft Query
      queryClient.invalidateQueries({
        queryKey: ['kernbotschaft', projectId],
      });
    },
  });
}

/**
 * Hook um eine Kernbotschaft zu loeschen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Loeschen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: deleteKernbotschaft, isPending } = useDeleteKernbotschaft();
 * deleteKernbotschaft({ projectId: 'proj-123', id: 'kernb-123' });
 * ```
 */
export function useDeleteKernbotschaft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, id }: { projectId: string; id: string }) => {
      return kernbotschaftService.deleteKernbotschaft(projectId, id);
    },
    onSuccess: (_, { projectId }) => {
      // Invalidiere Kernbotschaft Query
      queryClient.invalidateQueries({
        queryKey: ['kernbotschaft', projectId],
      });
    },
  });
}

// src/lib/hooks/useDNASynthese.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { dnaSyntheseService } from '@/lib/firebase/dna-synthese-service';
import { DNASynthese, DNASyntheseCreateData, DNASyntheseUpdateData } from '@/types/dna-synthese';

/**
 * Hook um die DNA Synthese eines Kunden zu laden
 *
 * @param companyId - ID des Kunden (Company mit type: 'customer')
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit DNA Synthese
 *
 * @example
 * ```tsx
 * const { data: synthese, isLoading } = useDNASynthese(companyId);
 * ```
 */
export function useDNASynthese(
  companyId: string | undefined,
  options?: Omit<UseQueryOptions<DNASynthese | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['dnaSynthese', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return dnaSyntheseService.getSynthese(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook um eine DNA Synthese zu erstellen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Erstellen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: createSynthese, isPending } = useCreateDNASynthese();
 * createSynthese({
 *   data: { companyId, content: '...', plainText: '...', ... },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useCreateDNASynthese() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      organizationId,
      userId,
    }: {
      data: DNASyntheseCreateData;
      organizationId: string;
      userId: string;
    }) => {
      return dnaSyntheseService.createSynthese(data, { organizationId, userId });
    },
    onSuccess: (_, { data }) => {
      // Invalidiere DNA Synthese Query
      queryClient.invalidateQueries({
        queryKey: ['dnaSynthese', data.companyId],
      });
      // Invalidiere Marken-DNA Status (weil Synthese erstellt wurde)
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'status', data.companyId],
      });
    },
  });
}

/**
 * Hook um eine DNA Synthese zu aktualisieren
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Update
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: updateSynthese, isPending } = useUpdateDNASynthese();
 * updateSynthese({
 *   companyId: 'comp-123',
 *   data: { content: 'Updated...', manuallyEdited: true },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useUpdateDNASynthese() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
      organizationId,
      userId,
    }: {
      companyId: string;
      data: DNASyntheseUpdateData;
      organizationId: string;
      userId: string;
    }) => {
      return dnaSyntheseService.updateSynthese(companyId, data, { organizationId, userId });
    },
    onSuccess: (_, { companyId }) => {
      // Invalidiere DNA Synthese Query
      queryClient.invalidateQueries({
        queryKey: ['dnaSynthese', companyId],
      });
    },
  });
}

/**
 * Hook um eine DNA Synthese zu loeschen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Loeschen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: deleteSynthese, isPending } = useDeleteDNASynthese();
 * deleteSynthese({ companyId: 'comp-123' });
 * ```
 */
export function useDeleteDNASynthese() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      return dnaSyntheseService.deleteSynthese(companyId);
    },
    onSuccess: (_, { companyId }) => {
      // Invalidiere DNA Synthese Query
      queryClient.invalidateQueries({
        queryKey: ['dnaSynthese', companyId],
      });
    },
  });
}

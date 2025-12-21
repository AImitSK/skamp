// src/lib/hooks/useTextMatrix.ts - React Query Hooks für Text-Matrix (Phase 4)
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import {
  textMatrixService,
  TextMatrix,
  TextMatrixData,
} from '@/lib/firebase/text-matrix-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

/**
 * Hook um die Text-Matrix eines Projekts zu laden
 *
 * @param projectId - ID des Projekts
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Text-Matrix
 *
 * @example
 * ```tsx
 * const { data: textMatrix, isLoading } = useTextMatrix(projectId);
 * ```
 */
export function useTextMatrix(
  projectId: string | undefined,
  options?: Omit<
    UseQueryOptions<TextMatrix | null, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['textMatrix', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      return textMatrixService.getTextMatrix(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook zum Erstellen einer Text-Matrix
 *
 * @param options - Optionale React Query Mutation Optionen
 * @returns Mutation-Objekt mit mutate-Funktion
 *
 * @example
 * ```tsx
 * const { mutate: createTextMatrix } = useCreateTextMatrix({
 *   onSuccess: () => toast.success('Text-Matrix erstellt'),
 * });
 *
 * createTextMatrix({
 *   projectId: 'proj-123',
 *   companyId: 'comp-456',
 *   data: { content: '<p>...</p>', plainText: '...' }
 * });
 * ```
 */
export function useCreateTextMatrix(
  options?: UseMutationOptions<
    string,
    Error,
    {
      projectId: string;
      companyId: string;
      data: TextMatrixData;
    }
  >
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({
      projectId,
      companyId,
      data,
    }: {
      projectId: string;
      companyId: string;
      data: TextMatrixData;
    }) => {
      if (!user?.uid) throw new Error('User nicht authentifiziert');
      if (!currentOrganization?.id)
        throw new Error('Keine Organisation ausgewählt');

      return textMatrixService.createTextMatrix(
        projectId,
        companyId,
        currentOrganization.id,
        data,
        user.uid
      );
    },
    onSuccess: (_, variables) => {
      // Invalidiere Text-Matrix Query für dieses Projekt
      queryClient.invalidateQueries({
        queryKey: ['textMatrix', variables.projectId],
      });
    },
    ...options,
  });
}

/**
 * Hook zum Aktualisieren einer Text-Matrix
 *
 * @param options - Optionale React Query Mutation Optionen
 * @returns Mutation-Objekt mit mutate-Funktion
 *
 * @example
 * ```tsx
 * const { mutate: updateTextMatrix } = useUpdateTextMatrix({
 *   onSuccess: () => toast.success('Text-Matrix aktualisiert'),
 * });
 *
 * updateTextMatrix({
 *   id: 'tm-123',
 *   projectId: 'proj-456',
 *   data: { content: '<p>Aktualisiert...</p>' }
 * });
 * ```
 */
export function useUpdateTextMatrix(
  options?: UseMutationOptions<
    void,
    Error,
    {
      id: string;
      projectId: string;
      data: Partial<TextMatrixData>;
    }
  >
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      projectId: string;
      data: Partial<TextMatrixData>;
    }) => {
      if (!user?.uid) throw new Error('User nicht authentifiziert');

      return textMatrixService.updateTextMatrix(id, data, user.uid);
    },
    onSuccess: (_, variables) => {
      // Invalidiere Text-Matrix Query für dieses Projekt
      queryClient.invalidateQueries({
        queryKey: ['textMatrix', variables.projectId],
      });
    },
    ...options,
  });
}

/**
 * Hook zum Finalisieren einer Text-Matrix (Human Sign-off)
 *
 * @param options - Optionale React Query Mutation Optionen
 * @returns Mutation-Objekt mit mutate-Funktion
 *
 * @example
 * ```tsx
 * const { mutate: finalizeTextMatrix } = useFinalizeTextMatrix({
 *   onSuccess: () => toast.success('Text-Matrix finalisiert'),
 * });
 *
 * finalizeTextMatrix({ id: 'tm-123', projectId: 'proj-456' });
 * ```
 */
export function useFinalizeTextMatrix(
  options?: UseMutationOptions<
    void,
    Error,
    {
      id: string;
      projectId: string;
    }
  >
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      if (!user?.uid) throw new Error('User nicht authentifiziert');

      return textMatrixService.finalizeTextMatrix(id, user.uid);
    },
    onSuccess: (_, variables) => {
      // Invalidiere Text-Matrix Query für dieses Projekt
      queryClient.invalidateQueries({
        queryKey: ['textMatrix', variables.projectId],
      });
    },
    ...options,
  });
}

/**
 * Hook zum Löschen einer Text-Matrix
 *
 * @param options - Optionale React Query Mutation Optionen
 * @returns Mutation-Objekt mit mutate-Funktion
 *
 * @example
 * ```tsx
 * const { mutate: deleteTextMatrix } = useDeleteTextMatrix({
 *   onSuccess: () => toast.success('Text-Matrix gelöscht'),
 * });
 *
 * deleteTextMatrix({ id: 'tm-123', projectId: 'proj-456' });
 * ```
 */
export function useDeleteTextMatrix(
  options?: UseMutationOptions<
    void,
    Error,
    {
      id: string;
      projectId: string;
    }
  >
) {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      if (!currentOrganization?.id)
        throw new Error('Keine Organisation ausgewählt');

      return textMatrixService.deleteTextMatrix(id, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      // Invalidiere Text-Matrix Query für dieses Projekt
      queryClient.invalidateQueries({
        queryKey: ['textMatrix', variables.projectId],
      });
    },
    ...options,
  });
}

/**
 * Hook zum Laden aller Text-Matrices für einen Kunden
 *
 * @param companyId - ID des Kunden
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Text-Matrices
 *
 * @example
 * ```tsx
 * const { data: textMatrices } = useTextMatricesByCompany(companyId);
 * ```
 */
export function useTextMatricesByCompany(
  companyId: string | undefined,
  options?: Omit<
    UseQueryOptions<TextMatrix[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['textMatricesByCompany', companyId, currentOrganization?.id],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      if (!currentOrganization?.id)
        throw new Error('Keine Organisation ausgewählt');

      return textMatrixService.getTextMatricesByCompany(
        companyId,
        currentOrganization.id
      );
    },
    enabled: !!companyId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

// Re-export Types
export type { TextMatrix, TextMatrixData };

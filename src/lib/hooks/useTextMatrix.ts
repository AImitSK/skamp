// src/lib/hooks/useTextMatrix.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

/**
 * Platzhalter-Interface fuer Text-Matrix
 * TODO Phase 4: Vollstaendiges Interface erstellen
 */
export interface TextMatrix {
  id: string;
  projectId: string;
  content: string;
  status: 'draft' | 'completed';
  updatedAt: Date;
}

/**
 * Hook um die Text-Matrix eines Projekts zu laden
 *
 * TODO Phase 4: Service implementieren und Hook vervollstaendigen
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
  options?: Omit<UseQueryOptions<TextMatrix | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['textMatrix', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      // TODO Phase 4: textMatrixService.getTextMatrix(projectId) aufrufen
      return null;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

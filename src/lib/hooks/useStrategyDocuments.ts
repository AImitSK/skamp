import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { strategyDocumentService } from '@/lib/firebase/strategy-document-service';
import type { StrategyDocument } from '@/lib/firebase/strategy-document-service';

/**
 * React Query Hook für Strategy Documents
 *
 * Lädt alle Strategiedokumente für ein Projekt mit automatischem Caching
 * und staleTime von 5 Minuten.
 *
 * @param projectId - ID des Projekts
 * @param organizationId - ID der Organisation
 * @returns Query-Ergebnis mit Dokumenten-Array
 */
export function useStrategyDocuments(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['strategy-documents', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('Missing projectId or organizationId');
      }
      return strategyDocumentService.getByProjectId(projectId, {
        organizationId,
      });
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Mutation Hook für Create Strategy Document
 *
 * Erstellt ein neues Strategiedokument und invalidiert automatisch
 * den Query-Cache nach erfolgreichem Erstellen.
 *
 * @returns Mutation-Objekt
 */
export function useCreateStrategyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      organizationId: string;
      userId: string;
      documentData: Omit<StrategyDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
    }) => {
      return strategyDocumentService.create(data.documentData, {
        organizationId: data.organizationId,
        userId: data.userId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['strategy-documents', variables.projectId, variables.organizationId],
      });
    },
  });
}

/**
 * Mutation Hook für Update Strategy Document
 *
 * Aktualisiert ein bestehendes Strategiedokument und erstellt automatisch
 * eine neue Version bei Content-Änderungen. Invalidiert den Query-Cache.
 *
 * @returns Mutation-Objekt
 */
export function useUpdateStrategyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      projectId: string;
      organizationId: string;
      userId: string;
      updates: Partial<Pick<StrategyDocument, 'title' | 'content' | 'status' | 'plainText' | 'version'>>;
      versionNotes: string;
    }) => {
      await strategyDocumentService.update(
        data.id,
        data.updates,
        data.versionNotes,
        {
          organizationId: data.organizationId,
          userId: data.userId,
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['strategy-documents', variables.projectId, variables.organizationId],
      });
    },
  });
}

/**
 * Mutation Hook für Archive Strategy Document
 *
 * Archiviert ein Strategiedokument (Soft Delete).
 * Invalidiert den Query-Cache nach erfolgreichem Archivieren.
 *
 * @returns Mutation-Objekt
 */
export function useArchiveStrategyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      projectId: string;
      organizationId: string;
      userId: string;
    }) => {
      await strategyDocumentService.archive(data.id, {
        organizationId: data.organizationId,
        userId: data.userId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['strategy-documents', variables.projectId, variables.organizationId],
      });
    },
  });
}

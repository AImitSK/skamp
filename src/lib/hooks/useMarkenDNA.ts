// src/lib/hooks/useMarkenDNA.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
import {
  MarkenDNADocument,
  MarkenDNADocumentType,
  MarkenDNACreateData,
  MarkenDNAUpdateData,
  CompanyMarkenDNAStatus,
} from '@/types/marken-dna';

/**
 * Hook um ein einzelnes Marken-DNA Dokument zu laden
 *
 * @param companyId - ID des Kunden (Company mit type: 'customer')
 * @param type - Dokumenttyp (briefing, swot, audience, positioning, goals, messages)
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Dokument, Loading- und Error-States
 *
 * @example
 * ```tsx
 * const { data: briefing, isLoading } = useMarkenDNADocument(companyId, 'briefing');
 * ```
 */
export function useMarkenDNADocument(
  companyId: string | undefined,
  type: MarkenDNADocumentType,
  options?: Omit<UseQueryOptions<MarkenDNADocument | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['markenDNA', 'document', companyId, type],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return markenDNAService.getDocument(companyId, type);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook um alle Marken-DNA Dokumente eines Kunden zu laden
 *
 * @param companyId - ID des Kunden (Company mit type: 'customer')
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Array von Dokumenten
 *
 * @example
 * ```tsx
 * const { data: documents, isLoading } = useMarkenDNADocuments(companyId);
 * ```
 */
export function useMarkenDNADocuments(
  companyId: string | undefined,
  options?: Omit<UseQueryOptions<MarkenDNADocument[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['markenDNA', 'documents', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return markenDNAService.getDocuments(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook um den Marken-DNA Status eines Kunden zu laden
 *
 * @param companyId - ID des Kunden (Company mit type: 'customer')
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Status (welche Dokumente vorhanden, Fortschritt)
 *
 * @example
 * ```tsx
 * const { data: status, isLoading } = useMarkenDNAStatus(companyId);
 * // status.documents.briefing, status.completeness, status.isComplete
 * ```
 */
export function useMarkenDNAStatus(
  companyId: string | undefined,
  options?: Omit<UseQueryOptions<CompanyMarkenDNAStatus, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['markenDNA', 'status', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return markenDNAService.getCompanyStatus(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook um den Marken-DNA Status aller Kunden einer Organisation zu laden
 *
 * Filtert automatisch auf Companies mit type: 'customer'
 *
 * @param organizationId - ID der Organisation
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Array von Kunden-Status
 *
 * @example
 * ```tsx
 * const { data: customersStatus, isLoading } = useAllCustomersMarkenDNAStatus(organizationId);
 * ```
 */
export function useAllCustomersMarkenDNAStatus(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<CompanyMarkenDNAStatus[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['markenDNA', 'allCustomersStatus', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return markenDNAService.getAllCustomersStatus(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 0, // Immer als stale betrachten
    gcTime: 5 * 60 * 1000, // 5 Minuten
    refetchOnMount: true, // Bei jedem Mount neu laden
    refetchOnWindowFocus: true, // Bei Tab-Fokus neu laden
    ...options,
  });
}

/**
 * Hook um den Hash aller Marken-DNA Dokumente zu berechnen
 *
 * Wird fuer Aktualitaets-Check der DNA Synthese verwendet
 *
 * @param companyId - ID des Kunden (Company mit type: 'customer')
 * @param options - Optionale React Query Optionen
 * @returns Query-Ergebnis mit Hash-String
 *
 * @example
 * ```tsx
 * const { data: hash } = useMarkenDNAHash(companyId);
 * ```
 */
export function useMarkenDNAHash(
  companyId: string | undefined,
  options?: Omit<UseQueryOptions<string, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['markenDNA', 'hash', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return markenDNAService.computeMarkenDNAHash(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...options,
  });
}

/**
 * Hook um ein Marken-DNA Dokument zu erstellen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Erstellen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: createDocument, isPending } = useCreateMarkenDNADocument();
 * createDocument({
 *   data: { companyId, companyName, type: 'briefing', content: '...' },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useCreateMarkenDNADocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      organizationId,
      userId,
    }: {
      data: MarkenDNACreateData;
      organizationId: string;
      userId: string;
    }) => {
      return markenDNAService.createDocument(data, { organizationId, userId });
    },
    onSuccess: (_, { data, organizationId }) => {
      // Invalidiere Dokument-Queries
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'document', data.companyId, data.type],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'documents', data.companyId],
      });
      // Invalidiere Status-Queries
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'status', data.companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'allCustomersStatus', organizationId],
      });
      // Invalidiere Hash
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'hash', data.companyId],
      });
    },
  });
}

/**
 * Hook um ein Marken-DNA Dokument zu aktualisieren
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Update
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: updateDocument, isPending } = useUpdateMarkenDNADocument();
 * updateDocument({
 *   companyId: 'comp-123',
 *   type: 'briefing',
 *   data: { content: 'Updated...', status: 'completed' },
 *   organizationId: 'org-123',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useUpdateMarkenDNADocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      type,
      data,
      organizationId,
      userId,
    }: {
      companyId: string;
      type: MarkenDNADocumentType;
      data: MarkenDNAUpdateData;
      organizationId: string;
      userId: string;
    }) => {
      return markenDNAService.updateDocument(companyId, type, data, { organizationId, userId });
    },
    onSuccess: (_, { companyId, type, organizationId }) => {
      // Invalidiere Dokument-Queries
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'document', companyId, type],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'documents', companyId],
      });
      // Invalidiere Status-Queries
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'status', companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'allCustomersStatus', organizationId],
      });
      // Invalidiere Hash
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'hash', companyId],
      });
    },
  });
}

/**
 * Hook um ein Marken-DNA Dokument zu loeschen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Loeschen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: deleteDocument, isPending } = useDeleteMarkenDNADocument();
 * deleteDocument({
 *   companyId: 'comp-123',
 *   type: 'briefing',
 *   organizationId: 'org-123'
 * });
 * ```
 */
export function useDeleteMarkenDNADocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      type,
      organizationId,
    }: {
      companyId: string;
      type: MarkenDNADocumentType;
      organizationId: string;
    }) => {
      return markenDNAService.deleteDocument(companyId, type);
    },
    onSuccess: (_, { companyId, organizationId }) => {
      // Invalidiere alle Queries fuer diesen Kunden
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'document', companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'documents', companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'status', companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'allCustomersStatus', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'hash', companyId],
      });
    },
  });
}

/**
 * Hook um alle Marken-DNA Dokumente eines Kunden zu loeschen
 *
 * Invalidiert automatisch die relevanten Query-Caches nach erfolgreichem Loeschen
 *
 * @returns Mutation-Objekt
 *
 * @example
 * ```tsx
 * const { mutate: deleteAllDocuments, isPending } = useDeleteAllMarkenDNADocuments();
 * deleteAllDocuments({
 *   companyId: 'comp-123',
 *   organizationId: 'org-123'
 * });
 * ```
 */
export function useDeleteAllMarkenDNADocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      organizationId,
    }: {
      companyId: string;
      organizationId: string;
    }) => {
      return markenDNAService.deleteAllDocuments(companyId);
    },
    onSuccess: (_, { companyId, organizationId }) => {
      // Invalidiere alle Queries fuer diesen Kunden
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'document', companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'documents', companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'status', companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'allCustomersStatus', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['markenDNA', 'hash', companyId],
      });
    },
  });
}

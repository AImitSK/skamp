// src/lib/hooks/useGlossary.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { glossaryService } from '@/lib/services/glossary-service';
import {
  CustomerGlossaryEntry,
  CreateGlossaryEntryInput,
  UpdateGlossaryEntryInput,
  GlossaryFilterOptions,
} from '@/types/glossary';

/**
 * Query key factory für Glossar-Queries
 */
export const glossaryKeys = {
  all: ['glossary'] as const,
  lists: () => [...glossaryKeys.all, 'list'] as const,
  list: (orgId: string, filters?: GlossaryFilterOptions) =>
    [...glossaryKeys.lists(), orgId, filters] as const,
  details: () => [...glossaryKeys.all, 'detail'] as const,
  detail: (orgId: string, id: string) => [...glossaryKeys.details(), orgId, id] as const,
};

/**
 * Hook zum Laden aller Glossar-Einträge einer Organization
 *
 * @param organizationId - Organization ID
 * @param options - Filter-Optionen (customerId, searchQuery, etc.)
 * @param queryOptions - React Query Optionen
 *
 * @example
 * ```tsx
 * const { data: entries, isLoading } = useGlossaryEntries(orgId);
 * const { data: customerEntries } = useGlossaryEntries(orgId, { customerId: 'abc' });
 * ```
 */
export function useGlossaryEntries(
  organizationId: string | undefined,
  filterOptions?: GlossaryFilterOptions,
  queryOptions?: Omit<UseQueryOptions<CustomerGlossaryEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: glossaryKeys.list(organizationId || '', filterOptions),
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return glossaryService.getByOrganization(organizationId, filterOptions);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...queryOptions,
  });
}

/**
 * Hook zum Laden eines einzelnen Glossar-Eintrags
 *
 * @param organizationId - Organization ID
 * @param entryId - Glossar-Eintrag ID
 *
 * @example
 * ```tsx
 * const { data: entry, isLoading } = useGlossaryEntry(orgId, entryId);
 * ```
 */
export function useGlossaryEntry(
  organizationId: string | undefined,
  entryId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<CustomerGlossaryEntry | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: glossaryKeys.detail(organizationId || '', entryId || ''),
    queryFn: () => {
      if (!organizationId || !entryId) throw new Error('Organization ID and Entry ID are required');
      return glossaryService.getById(organizationId, entryId);
    },
    enabled: !!organizationId && !!entryId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });
}

/**
 * Hook zum Erstellen eines neuen Glossar-Eintrags
 *
 * @example
 * ```tsx
 * const { mutate: createEntry, isPending } = useCreateGlossaryEntry();
 * createEntry({
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 *   input: { customerId: 'company-789', translations: { de: 'KI', en: 'AI' } }
 * });
 * ```
 */
export function useCreateGlossaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      input,
    }: {
      organizationId: string;
      userId: string;
      input: CreateGlossaryEntryInput;
    }) => {
      return glossaryService.create(organizationId, userId, input);
    },
    onSuccess: (_, { organizationId }) => {
      // Invalidiere alle Glossar-Listen für diese Organization
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.lists(),
        predicate: (query) =>
          query.queryKey[0] === 'glossary' &&
          query.queryKey[2] === organizationId,
      });
    },
  });
}

/**
 * Hook zum Aktualisieren eines Glossar-Eintrags
 *
 * @example
 * ```tsx
 * const { mutate: updateEntry, isPending } = useUpdateGlossaryEntry();
 * updateEntry({
 *   organizationId: 'org-123',
 *   entryId: 'entry-456',
 *   input: { translations: { de: 'Künstliche Intelligenz', en: 'Artificial Intelligence' } }
 * });
 * ```
 */
export function useUpdateGlossaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      entryId,
      input,
    }: {
      organizationId: string;
      entryId: string;
      input: UpdateGlossaryEntryInput;
    }) => {
      return glossaryService.update(organizationId, entryId, input);
    },
    onSuccess: (_, { organizationId, entryId }) => {
      // Invalidiere Listen und Detail
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.detail(organizationId, entryId),
      });
    },
  });
}

/**
 * Hook zum Löschen eines Glossar-Eintrags
 *
 * @example
 * ```tsx
 * const { mutate: deleteEntry, isPending } = useDeleteGlossaryEntry();
 * deleteEntry({ organizationId: 'org-123', entryId: 'entry-456' });
 * ```
 */
export function useDeleteGlossaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      entryId,
    }: {
      organizationId: string;
      entryId: string;
    }) => {
      return glossaryService.delete(organizationId, entryId);
    },
    onSuccess: (_, { organizationId }) => {
      // Invalidiere alle Glossar-Listen
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.lists(),
      });
    },
  });
}

/**
 * Hook zum Freigeben/Ablehnen eines Glossar-Eintrags
 *
 * @example
 * ```tsx
 * const { mutate: approveEntry } = useApproveGlossaryEntry();
 * approveEntry({ organizationId: 'org-123', entryId: 'entry-456', isApproved: true });
 * ```
 */
export function useApproveGlossaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      entryId,
      isApproved,
    }: {
      organizationId: string;
      entryId: string;
      isApproved: boolean;
    }) => {
      return glossaryService.update(organizationId, entryId, { isApproved });
    },
    onSuccess: (_, { organizationId, entryId }) => {
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: glossaryKeys.detail(organizationId, entryId),
      });
    },
  });
}

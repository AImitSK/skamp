// src/lib/hooks/useTranslations.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { translationService } from '@/lib/services/translation-service';
import {
  ProjectTranslation,
  CreateTranslationInput,
  UpdateTranslationInput,
  TranslationFilterOptions,
  TranslationSummary,
} from '@/types/translation';
import { LanguageCode } from '@/types/international';

/**
 * Query key factory für Translation-Queries
 */
export const translationKeys = {
  all: ['translations'] as const,
  lists: () => [...translationKeys.all, 'list'] as const,
  list: (orgId: string, projectId: string, filters?: TranslationFilterOptions) =>
    [...translationKeys.lists(), orgId, projectId, filters] as const,
  details: () => [...translationKeys.all, 'detail'] as const,
  detail: (orgId: string, projectId: string, id: string) =>
    [...translationKeys.details(), orgId, projectId, id] as const,
  byLanguage: (orgId: string, projectId: string, language: LanguageCode) =>
    [...translationKeys.all, 'language', orgId, projectId, language] as const,
  summary: (orgId: string, projectId: string) =>
    [...translationKeys.all, 'summary', orgId, projectId] as const,
  languages: (orgId: string, projectId: string) =>
    [...translationKeys.all, 'languages', orgId, projectId] as const,
};

/**
 * Hook zum Laden aller Übersetzungen eines Projekts
 *
 * @param organizationId - Organization ID
 * @param projectId - Projekt ID
 * @param options - Filter-Optionen (language, status, etc.)
 *
 * @example
 * ```tsx
 * const { data: translations, isLoading } = useProjectTranslations(orgId, projectId);
 * const { data: outdated } = useProjectTranslations(orgId, projectId, { outdatedOnly: true });
 * ```
 */
export function useProjectTranslations(
  organizationId: string | undefined,
  projectId: string | undefined,
  filterOptions?: TranslationFilterOptions,
  queryOptions?: Omit<UseQueryOptions<ProjectTranslation[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: translationKeys.list(organizationId || '', projectId || '', filterOptions),
    queryFn: () => {
      if (!organizationId || !projectId) {
        throw new Error('Organization ID and Project ID are required');
      }
      return translationService.getByProject(organizationId, projectId, filterOptions);
    },
    enabled: !!organizationId && !!projectId,
    staleTime: 2 * 60 * 1000, // 2 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten
    ...queryOptions,
  });
}

/**
 * Hook zum Laden einer Übersetzung nach Sprache
 *
 * @param organizationId - Organization ID
 * @param projectId - Projekt ID
 * @param language - Sprachcode (z.B. 'en', 'fr')
 *
 * @example
 * ```tsx
 * const { data: englishTranslation } = useTranslationByLanguage(orgId, projectId, 'en');
 * ```
 */
export function useTranslationByLanguage(
  organizationId: string | undefined,
  projectId: string | undefined,
  language: LanguageCode | undefined,
  queryOptions?: Omit<UseQueryOptions<ProjectTranslation | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: translationKeys.byLanguage(organizationId || '', projectId || '', language || 'de'),
    queryFn: () => {
      if (!organizationId || !projectId || !language) {
        throw new Error('Organization ID, Project ID and Language are required');
      }
      return translationService.getByLanguage(organizationId, projectId, language);
    },
    enabled: !!organizationId && !!projectId && !!language,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });
}

/**
 * Hook zum Laden einer Übersetzung nach ID
 *
 * @param organizationId - Organization ID
 * @param projectId - Projekt ID
 * @param translationId - Übersetzungs-ID
 *
 * @example
 * ```tsx
 * const { data: translation } = useProjectTranslation(orgId, projectId, translationId);
 * ```
 */
export function useProjectTranslation(
  organizationId: string | undefined,
  projectId: string | undefined,
  translationId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<ProjectTranslation | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: translationKeys.detail(organizationId || '', projectId || '', translationId || ''),
    queryFn: () => {
      if (!organizationId || !projectId || !translationId) {
        throw new Error('Organization ID, Project ID and Translation ID are required');
      }
      return translationService.getById(organizationId, projectId, translationId);
    },
    enabled: !!organizationId && !!projectId && !!translationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });
}

/**
 * Hook zum Laden der Übersetzungs-Zusammenfassung eines Projekts
 *
 * @example
 * ```tsx
 * const { data: summary } = useTranslationSummary(orgId, projectId);
 * // summary.totalCount, summary.outdatedCount, summary.languages
 * ```
 */
export function useTranslationSummary(
  organizationId: string | undefined,
  projectId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<TranslationSummary, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: translationKeys.summary(organizationId || '', projectId || ''),
    queryFn: () => {
      if (!organizationId || !projectId) {
        throw new Error('Organization ID and Project ID are required');
      }
      return translationService.getSummary(organizationId, projectId);
    },
    enabled: !!organizationId && !!projectId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });
}

/**
 * Hook zum Laden der verfügbaren Sprachen eines Projekts
 *
 * @example
 * ```tsx
 * const { data: languages } = useAvailableLanguages(orgId, projectId);
 * // ['en', 'fr', 'es']
 * ```
 */
export function useAvailableLanguages(
  organizationId: string | undefined,
  projectId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<LanguageCode[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: translationKeys.languages(organizationId || '', projectId || ''),
    queryFn: () => {
      if (!organizationId || !projectId) {
        throw new Error('Organization ID and Project ID are required');
      }
      return translationService.getAvailableLanguages(organizationId, projectId);
    },
    enabled: !!organizationId && !!projectId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });
}

/**
 * Hook zum Erstellen einer neuen Übersetzung
 *
 * @example
 * ```tsx
 * const { mutate: createTranslation, isPending } = useCreateTranslation();
 * createTranslation({
 *   organizationId: 'org-123',
 *   input: {
 *     projectId: 'proj-456',
 *     language: 'en',
 *     content: '<p>Translated content...</p>',
 *     sourceVersion: 1
 *   }
 * });
 * ```
 */
export function useCreateTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      input,
    }: {
      organizationId: string;
      input: CreateTranslationInput;
    }) => {
      return translationService.create(organizationId, input);
    },
    onSuccess: (data, { organizationId, input }) => {
      // Invalidiere alle Translation-Listen für dieses Projekt
      queryClient.invalidateQueries({
        queryKey: translationKeys.list(organizationId, input.projectId),
      });
      // Invalidiere Summary
      queryClient.invalidateQueries({
        queryKey: translationKeys.summary(organizationId, input.projectId),
      });
      // Invalidiere Languages
      queryClient.invalidateQueries({
        queryKey: translationKeys.languages(organizationId, input.projectId),
      });
    },
  });
}

/**
 * Hook zum Aktualisieren einer Übersetzung
 *
 * @example
 * ```tsx
 * const { mutate: updateTranslation } = useUpdateTranslation();
 * updateTranslation({
 *   organizationId: 'org-123',
 *   projectId: 'proj-456',
 *   translationId: 'trans-789',
 *   input: { status: 'reviewed', reviewedBy: 'user-abc' }
 * });
 * ```
 */
export function useUpdateTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      projectId,
      translationId,
      input,
    }: {
      organizationId: string;
      projectId: string;
      translationId: string;
      input: UpdateTranslationInput;
    }) => {
      return translationService.update(organizationId, projectId, translationId, input);
    },
    onSuccess: (_, { organizationId, projectId, translationId }) => {
      // Invalidiere Listen
      queryClient.invalidateQueries({
        queryKey: translationKeys.list(organizationId, projectId),
      });
      // Invalidiere Detail
      queryClient.invalidateQueries({
        queryKey: translationKeys.detail(organizationId, projectId, translationId),
      });
      // Invalidiere Summary
      queryClient.invalidateQueries({
        queryKey: translationKeys.summary(organizationId, projectId),
      });
    },
  });
}

/**
 * Hook zum Löschen einer Übersetzung
 *
 * @example
 * ```tsx
 * const { mutate: deleteTranslation } = useDeleteTranslation();
 * deleteTranslation({ organizationId: 'org-123', projectId: 'proj-456', translationId: 'trans-789' });
 * ```
 */
export function useDeleteTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      projectId,
      translationId,
    }: {
      organizationId: string;
      projectId: string;
      translationId: string;
    }) => {
      return translationService.delete(organizationId, projectId, translationId);
    },
    onSuccess: (_, { organizationId, projectId }) => {
      // Invalidiere alle Translation-Queries für dieses Projekt
      queryClient.invalidateQueries({
        queryKey: translationKeys.list(organizationId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: translationKeys.summary(organizationId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: translationKeys.languages(organizationId, projectId),
      });
    },
  });
}

/**
 * Hook zum Markieren aller Übersetzungen als veraltet
 *
 * @example
 * ```tsx
 * const { mutate: markOutdated } = useMarkTranslationsOutdated();
 * markOutdated({ organizationId: 'org-123', projectId: 'proj-456' });
 * ```
 */
export function useMarkTranslationsOutdated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      projectId,
    }: {
      organizationId: string;
      projectId: string;
    }) => {
      return translationService.markAsOutdated(organizationId, projectId);
    },
    onSuccess: (_, { organizationId, projectId }) => {
      // Invalidiere alle Translation-Queries für dieses Projekt
      queryClient.invalidateQueries({
        queryKey: translationKeys.list(organizationId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: translationKeys.summary(organizationId, projectId),
      });
    },
  });
}

/**
 * Hook zum Markieren einer Übersetzung als aktuell
 *
 * @example
 * ```tsx
 * const { mutate: markCurrent } = useMarkTranslationCurrent();
 * markCurrent({ organizationId: 'org-123', projectId: 'proj-456', translationId: 'trans-789' });
 * ```
 */
export function useMarkTranslationCurrent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      projectId,
      translationId,
    }: {
      organizationId: string;
      projectId: string;
      translationId: string;
    }) => {
      return translationService.markAsCurrent(organizationId, projectId, translationId);
    },
    onSuccess: (_, { organizationId, projectId, translationId }) => {
      queryClient.invalidateQueries({
        queryKey: translationKeys.list(organizationId, projectId),
      });
      queryClient.invalidateQueries({
        queryKey: translationKeys.detail(organizationId, projectId, translationId),
      });
      queryClient.invalidateQueries({
        queryKey: translationKeys.summary(organizationId, projectId),
      });
    },
  });
}

// src/lib/hooks/useCRMData.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  companiesEnhancedService,
  contactsEnhancedService,
  tagsEnhancedService
} from '@/lib/firebase/crm-service-enhanced';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';

/**
 * Hook to fetch companies for an organization with React Query caching
 *
 * @param organizationId - The organization ID to fetch companies for
 * @param options - Optional React Query options
 * @returns Query result with companies data, loading and error states
 *
 * @example
 * ```tsx
 * const { data: companies, isLoading } = useCompanies(currentOrganization.id);
 * ```
 */
export function useCompanies(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<CompanyEnhanced[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['companies', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return companiesEnhancedService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    ...options,
  });
}

/**
 * Hook to fetch contacts for an organization with React Query caching
 *
 * @param organizationId - The organization ID to fetch contacts for
 * @param options - Optional React Query options
 * @returns Query result with contacts data, loading and error states
 *
 * @example
 * ```tsx
 * const { data: contacts, isLoading } = useContacts(currentOrganization.id);
 * ```
 */
export function useContacts(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<ContactEnhanced[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['contacts', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return contactsEnhancedService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch tags for an organization with React Query caching
 *
 * @param organizationId - The organization ID to fetch tags for
 * @param options - Optional React Query options
 * @returns Query result with tags data, loading and error states
 *
 * @example
 * ```tsx
 * const { data: tags, isLoading } = useTags(currentOrganization.id);
 * ```
 */
export function useTags(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<Tag[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['tags', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return tagsEnhancedService.getAllAsLegacyTags(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes (tags change less frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Hook to update a company with automatic cache invalidation
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: updateCompany, isPending } = useUpdateCompany();
 * updateCompany({ id: '123', data: { name: 'New Name' }, organizationId: 'org-123' });
 * ```
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      organizationId
    }: {
      id: string;
      data: Partial<CompanyEnhanced>;
      organizationId: string;
    }) => companiesEnhancedService.update(id, data, organizationId),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['companies', organizationId] });
    },
  });
}

/**
 * Hook to delete a company with automatic cache invalidation
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: deleteCompany, isPending } = useDeleteCompany();
 * deleteCompany({ id: '123', organizationId: 'org-123' });
 * ```
 */
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client-init');
      await deleteDoc(doc(db, 'companies_enhanced', id));
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['companies', organizationId] });
      // Also invalidate contacts since they reference companies
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });
    },
  });
}

/**
 * Hook to update a contact with automatic cache invalidation
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: updateContact, isPending } = useUpdateContact();
 * updateContact({ id: '123', data: { firstName: 'John' }, organizationId: 'org-123' });
 * ```
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      organizationId
    }: {
      id: string;
      data: Partial<ContactEnhanced>;
      organizationId: string;
    }) => contactsEnhancedService.update(id, data, organizationId),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });
    },
  });
}

/**
 * Hook to delete a contact with automatic cache invalidation
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: deleteContact, isPending } = useDeleteContact();
 * deleteContact({ id: '123', organizationId: 'org-123' });
 * ```
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client-init');
      await deleteDoc(doc(db, 'contacts_enhanced', id));
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });
    },
  });
}

/**
 * Hook to bulk delete companies with automatic cache invalidation
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: bulkDelete, isPending } = useBulkDeleteCompanies();
 * bulkDelete({ ids: ['1', '2', '3'], organizationId: 'org-123' });
 * ```
 */
export function useBulkDeleteCompanies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, organizationId }: { ids: string[]; organizationId: string }) => {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client-init');
      await Promise.all(ids.map(id => deleteDoc(doc(db, 'companies_enhanced', id))));
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['companies', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });
    },
  });
}

/**
 * Hook to bulk delete contacts with automatic cache invalidation
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { mutate: bulkDelete, isPending } = useBulkDeleteContacts();
 * bulkDelete({ ids: ['1', '2', '3'], organizationId: 'org-123' });
 * ```
 */
export function useBulkDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, organizationId }: { ids: string[]; organizationId: string }) => {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client-init');
      await Promise.all(ids.map(id => deleteDoc(doc(db, 'contacts_enhanced', id))));
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });
    },
  });
}

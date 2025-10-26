// src/hooks/useMasterLists.ts
import { useQuery } from '@tanstack/react-query';
import { listsService } from '@/lib/firebase/lists-service';
import { projectListsService } from '@/lib/firebase/project-lists-service';
import { DistributionList } from '@/types/lists';
import { ContactEnhanced } from '@/types/crm-enhanced';

// Query Keys
export const masterListsKeys = {
  all: ['master-lists'] as const,
  byOrg: (organizationId: string) => [...masterListsKeys.all, organizationId] as const,
  details: (listIds: string[]) => ['master-lists-details', ...listIds.sort()] as const,
  contacts: (listId: string) => ['master-list-contacts', listId] as const,
};

// Hook: Alle Master-Listen einer Organisation abrufen
export function useMasterLists(organizationId: string) {
  return useQuery({
    queryKey: masterListsKeys.byOrg(organizationId),
    queryFn: () => listsService.getAll(organizationId),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 Minuten
  });
}

// Hook: Details für mehrere Master-Listen abrufen
export function useMasterListDetails(listIds: string[]) {
  return useQuery({
    queryKey: masterListsKeys.details(listIds),
    queryFn: () => projectListsService.getMasterListsWithDetails(listIds),
    enabled: listIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 Minuten
  });
}

// Hook: Kontakte einer Master-Liste abrufen
export function useMasterListContacts(list: DistributionList | null | undefined) {
  return useQuery({
    queryKey: masterListsKeys.contacts(list?.id || ''),
    queryFn: async () => {
      if (!list) return [];
      return await listsService.getContacts(list);
    },
    enabled: !!list && !!list.id,
    staleTime: 1000 * 60 * 3, // 3 Minuten
  });
}

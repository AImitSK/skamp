// src/lib/hooks/useBoilerplatesData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { Boilerplate, BoilerplateCreateData } from '@/types/crm-enhanced';

/**
 * Query Hook: Alle Boilerplates einer Organisation laden
 */
export function useBoilerplates(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['boilerplates', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      return boilerplatesService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Query Hook: Einzelnen Boilerplate laden
 */
export function useBoilerplate(id: string | undefined) {
  return useQuery({
    queryKey: ['boilerplate', id],
    queryFn: async () => {
      if (!id) throw new Error('No boilerplate ID');
      return boilerplatesService.getById(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Mutation Hook: Neuen Boilerplate erstellen
 */
export function useCreateBoilerplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organizationId: string;
      userId: string;
      boilerplateData: BoilerplateCreateData;
    }) => {
      return boilerplatesService.create(data.boilerplateData, {
        organizationId: data.organizationId,
        userId: data.userId,
      });
    },
    onSuccess: (_, variables) => {
      // Cache invalidieren für die Boilerplates-Liste
      queryClient.invalidateQueries({
        queryKey: ['boilerplates', variables.organizationId],
      });
    },
  });
}

/**
 * Mutation Hook: Boilerplate aktualisieren
 */
export function useUpdateBoilerplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      organizationId: string;
      userId: string;
      boilerplateData: Partial<Boilerplate>;
    }) => {
      await boilerplatesService.update(
        data.id,
        data.boilerplateData,
        {
          organizationId: data.organizationId,
          userId: data.userId,
        }
      );
    },
    onSuccess: (_, variables) => {
      // Cache invalidieren für den einzelnen Boilerplate
      queryClient.invalidateQueries({
        queryKey: ['boilerplate', variables.id],
      });
      // Cache invalidieren für die Boilerplates-Liste
      queryClient.invalidateQueries({
        queryKey: ['boilerplates', variables.organizationId],
      });
    },
  });
}

/**
 * Mutation Hook: Boilerplate löschen
 */
export function useDeleteBoilerplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string }) => {
      await boilerplatesService.delete(data.id);
    },
    onSuccess: (_, variables) => {
      // Cache invalidieren für die Boilerplates-Liste
      queryClient.invalidateQueries({
        queryKey: ['boilerplates', variables.organizationId],
      });
    },
  });
}

/**
 * Mutation Hook: Favorit-Status toggeln
 */
export function useToggleFavoriteBoilerplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      organizationId: string;
      userId: string;
    }) => {
      await boilerplatesService.toggleFavorite(data.id, {
        organizationId: data.organizationId,
        userId: data.userId,
      });
    },
    onSuccess: (_, variables) => {
      // Cache invalidieren für den einzelnen Boilerplate
      queryClient.invalidateQueries({
        queryKey: ['boilerplate', variables.id],
      });
      // Cache invalidieren für die Boilerplates-Liste
      queryClient.invalidateQueries({
        queryKey: ['boilerplates', variables.organizationId],
      });
    },
  });
}

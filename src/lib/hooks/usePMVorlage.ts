// src/lib/hooks/usePMVorlage.ts
// React Query Hooks fuer PM-Vorlage (Pressemeldungs-Refactoring Phase 5)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pmVorlageService } from '@/lib/firebase/pm-vorlage-service';
import { faktenMatrixService } from '@/lib/firebase/fakten-matrix-service';
import { auth } from '@/lib/firebase/client-init';
import type { PMVorlage } from '@/types/pm-vorlage';
import type { FaktenMatrix } from '@/types/fakten-matrix';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const pmVorlageKeys = {
  all: ['pmVorlage'] as const,
  byProject: (projectId: string) => [...pmVorlageKeys.all, projectId] as const,
  outdated: (projectId: string) => [...pmVorlageKeys.byProject(projectId), 'outdated'] as const,
};

export const faktenMatrixKeys = {
  all: ['faktenMatrix'] as const,
  byProject: (projectId: string) => [...faktenMatrixKeys.all, projectId] as const,
};

// ============================================================================
// PM-VORLAGE HOOKS
// ============================================================================

/**
 * Laedt die PM-Vorlage eines Projekts
 */
export function usePMVorlage(projectId: string | undefined) {
  return useQuery({
    queryKey: pmVorlageKeys.byProject(projectId!),
    queryFn: () => pmVorlageService.get(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Prueft ob die PM-Vorlage existiert
 */
export function usePMVorlageExists(projectId: string | undefined) {
  return useQuery({
    queryKey: [...pmVorlageKeys.byProject(projectId!), 'exists'],
    queryFn: () => pmVorlageService.exists(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Generiert eine neue PM-Vorlage
 */
export function useGeneratePMVorlage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      companyId: string;
      companyName: string;
      dnaContacts: Array<{
        id: string;
        name: string;
        position: string;
        expertise?: string;
        email?: string;
        phone?: string;
      }>;
      targetGroup?: 'ZG1' | 'ZG2' | 'ZG3';
      dnaSynthese?: string;
      faktenMatrix?: FaktenMatrix;
    }) => {
      // Auth Token holen
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Nicht authentifiziert');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/ai/pm-vorlage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PM-Vorlage Generierung fehlgeschlagen');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Cache invalidieren
      queryClient.invalidateQueries({
        queryKey: pmVorlageKeys.byProject(variables.projectId),
      });
    },
  });
}

/**
 * Loescht eine PM-Vorlage
 */
export function useDeletePMVorlage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string }) => {
      await pmVorlageService.delete(params.projectId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: pmVorlageKeys.byProject(variables.projectId),
      });
    },
  });
}

/**
 * Stellt eine aeltere Version aus der History wieder her
 */
export function useRestorePMVorlageFromHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string; historyIndex: number }) => {
      await pmVorlageService.restoreFromHistory(params.projectId, params.historyIndex);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: pmVorlageKeys.byProject(variables.projectId),
      });
    },
  });
}

// ============================================================================
// FAKTEN-MATRIX HOOKS
// ============================================================================

/**
 * Laedt die Fakten-Matrix eines Projekts
 */
export function useFaktenMatrix(projectId: string | undefined) {
  return useQuery({
    queryKey: faktenMatrixKeys.byProject(projectId!),
    queryFn: () => faktenMatrixService.get(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Prueft ob die Fakten-Matrix existiert
 */
export function useFaktenMatrixExists(projectId: string | undefined) {
  return useQuery({
    queryKey: [...faktenMatrixKeys.byProject(projectId!), 'exists'],
    queryFn: () => faktenMatrixService.exists(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Laedt die Fakten-Matrix mit Hash
 */
export function useFaktenMatrixWithHash(projectId: string | undefined) {
  return useQuery({
    queryKey: [...faktenMatrixKeys.byProject(projectId!), 'withHash'],
    queryFn: () => faktenMatrixService.getWithHash(projectId!),
    enabled: !!projectId,
  });
}

// ============================================================================
// COMBINED HOOKS
// ============================================================================

/**
 * Prueft ob PM-Vorlage veraltet ist (DNA oder Fakten-Matrix geaendert)
 */
export function useIsPMVorlageOutdated(
  projectId: string | undefined,
  currentDNAHash: string | undefined,
  currentFaktenMatrixHash: string | undefined
) {
  const { data: pmVorlage } = usePMVorlage(projectId);

  if (!pmVorlage || !currentDNAHash || !currentFaktenMatrixHash) {
    return { data: false, isLoading: false };
  }

  const isOutdated =
    pmVorlage.markenDNAHash !== currentDNAHash ||
    pmVorlage.faktenMatrixHash !== currentFaktenMatrixHash;

  return { data: isOutdated, isLoading: false };
}

/**
 * Prueft ob PM-Vorlage generiert werden kann
 * (DNA-Synthese und Fakten-Matrix muessen vorhanden sein)
 */
export function useCanGeneratePMVorlage(
  projectId: string | undefined,
  hasDNASynthese: boolean
) {
  const { data: hasFaktenMatrix } = useFaktenMatrixExists(projectId);

  return {
    canGenerate: hasDNASynthese && hasFaktenMatrix,
    hasDNASynthese,
    hasFaktenMatrix: hasFaktenMatrix ?? false,
  };
}

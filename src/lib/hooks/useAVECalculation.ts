import { useQuery } from '@tanstack/react-query';
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';
import { AVESettings } from '@/types/monitoring';
import { MediaClipping } from '@/types/monitoring';

interface AVECalculation {
  aveSettings: AVESettings | null;
  isLoading: boolean;
  calculateAVE: (clipping: MediaClipping) => number;
}

/**
 * Hook für AVE-Berechnung mit React Query
 *
 * Lädt AVE-Settings automatisch via React Query und stellt
 * eine Berechnungsfunktion bereit.
 *
 * @param organizationId - ID der Organisation
 * @param userId - ID des Users
 * @returns AVE-Settings, Loading State und Berechnungsfunktion
 *
 * @example
 * ```tsx
 * const { aveSettings, isLoading, calculateAVE } = useAVECalculation(
 *   organizationId,
 *   userId
 * );
 *
 * const totalAVE = clippings.reduce((sum, c) => sum + calculateAVE(c), 0);
 * ```
 */
export function useAVECalculation(
  organizationId: string | undefined,
  userId: string | undefined
): AVECalculation {
  const { data: aveSettings = null, isLoading } = useQuery({
    queryKey: ['aveSettings', organizationId, userId],
    queryFn: async () => {
      if (!organizationId || !userId) throw new Error('Missing params');
      return aveSettingsService.getOrCreate(organizationId, userId);
    },
    enabled: !!organizationId && !!userId,
    staleTime: 10 * 60 * 1000, // 10 Minuten (Settings ändern selten)
  });

  const calculateAVE = (clipping: MediaClipping): number => {
    if (clipping.ave) return clipping.ave;
    if (!aveSettings) return 0;
    return aveSettingsService.calculateAVE(clipping, aveSettings);
  };

  return {
    aveSettings,
    isLoading,
    calculateAVE,
  };
}

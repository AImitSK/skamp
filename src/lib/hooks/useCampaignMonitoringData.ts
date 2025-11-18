import { useQuery } from '@tanstack/react-query';
import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';

/**
 * Hook: useCampaignMonitoringData
 * Lädt alle Monitoring-Daten für eine spezifische Kampagne
 *
 * @param campaignId - Die ID der Kampagne
 * @param organizationId - Die ID der Organisation
 * @returns Query mit campaign, sends, clippings, suggestions
 */
export function useCampaignMonitoringData(
  campaignId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['campaignMonitoring', campaignId, organizationId],
    queryFn: async () => {
      if (!campaignId || !organizationId) {
        throw new Error('CampaignId und OrganizationId erforderlich');
      }

      // Parallel loading aller Daten
      const [campaign, sends, clippings, suggestions] = await Promise.all([
        prService.getById(campaignId),
        emailCampaignService.getSends(campaignId, { organizationId }),
        clippingService.getByCampaignId(campaignId, { organizationId }),
        monitoringSuggestionService.getByCampaignId(campaignId, organizationId),
      ]);

      return { campaign, sends, clippings, suggestions };
    },
    enabled: !!campaignId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000,   // 10 Minuten (ehemals cacheTime)
  });
}

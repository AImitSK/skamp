import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { projectService } from '@/lib/firebase/project-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';

// ===================================
// Query Hooks
// ===================================

/**
 * Hook: useProjectMonitoringData
 * Lädt alle Monitoring-Daten für ein Projekt (Campaigns, Sends, Clippings, Suggestions)
 */
export function useProjectMonitoringData(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['projectMonitoring', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('ProjectId und OrganizationId erforderlich');
      }

      // Lade Projekt-Daten
      const projectData = await projectService.getById(projectId, { organizationId });
      if (!projectData) throw new Error('Projekt nicht gefunden');

      // Lade Kampagnen (beide Ansätze: linkedCampaigns + projectId-basiert)
      let allCampaigns: any[] = [];

      if (projectData.linkedCampaigns?.length > 0) {
        const linkedCampaignData = await Promise.all(
          projectData.linkedCampaigns.map(async (campaignId: string) => {
            try {
              return await prService.getById(campaignId);
            } catch (error) {
              console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
              return null;
            }
          })
        );
        allCampaigns.push(...linkedCampaignData.filter(Boolean));
      }

      const projectCampaigns = await prService.getCampaignsByProject(projectId, organizationId);
      allCampaigns.push(...projectCampaigns);

      // Duplikate entfernen
      const uniqueCampaigns = allCampaigns.filter(
        (campaign, index, self) => index === self.findIndex(c => c.id === campaign.id)
      );

      // Lade Sends, Clippings, Suggestions für jede Kampagne
      const campaignsWithData = await Promise.all(
        uniqueCampaigns.map(async (campaign: any) => {
          const [sends, clippings, suggestions] = await Promise.all([
            emailCampaignService.getSends(campaign.id!, { organizationId }),
            clippingService.getByCampaignId(campaign.id!, { organizationId }),
            monitoringSuggestionService.getByCampaignId(campaign.id!, organizationId)
          ]);
          return { campaign, sends, clippings, suggestions };
        })
      );

      // Filter: Nur Kampagnen mit Aktivität
      const activeCampaigns = campaignsWithData.filter(
        ({ sends, clippings, suggestions }) =>
          sends.length > 0 || clippings.length > 0 || suggestions.length > 0
      );

      // Aggregierte Daten
      const campaigns = activeCampaigns.map(({ campaign, sends, clippings }) => ({
        ...campaign,
        stats: {
          total: sends.length,
          delivered: sends.filter((s: any) =>
            s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
          ).length,
          opened: sends.filter((s: any) =>
            s.status === 'opened' || s.status === 'clicked'
          ).length,
          clicked: sends.filter((s: any) => s.status === 'clicked').length,
          bounced: sends.filter((s: any) => s.status === 'bounced').length,
          clippings: clippings.length
        }
      }));

      const allSends = activeCampaigns.flatMap(({ sends }) => sends);
      const allClippings = activeCampaigns.flatMap(({ clippings }) => clippings);
      const allSuggestions = activeCampaigns.flatMap(({ suggestions }) => suggestions);

      return {
        campaigns,
        allSends,
        allClippings,
        allSuggestions
      };
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten (Monitoring-Daten sollten aktuell sein)
  });
}

// ===================================
// Mutation Hooks
// ===================================

/**
 * Hook: useConfirmSuggestion
 * Bestätigt einen Monitoring-Vorschlag
 */
export function useConfirmSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { suggestionId: string; userId: string; organizationId: string }) => {
      return await monitoringSuggestionService.confirmSuggestion(data.suggestionId, {
        userId: data.userId,
        organizationId: data.organizationId
      });
    },
    onSuccess: () => {
      // Invalidiere projektbezogene Monitoring-Queries
      queryClient.invalidateQueries({
        queryKey: ['projectMonitoring']
      });
    },
  });
}

/**
 * Hook: useRejectSuggestion
 * Lehnt einen Monitoring-Vorschlag ab
 */
export function useRejectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { suggestionId: string; userId: string; organizationId: string }) => {
      return await monitoringSuggestionService.markAsSpam(data.suggestionId, {
        userId: data.userId,
        organizationId: data.organizationId
      });
    },
    onSuccess: () => {
      // Invalidiere projektbezogene Monitoring-Queries
      queryClient.invalidateQueries({
        queryKey: ['projectMonitoring']
      });
    },
  });
}

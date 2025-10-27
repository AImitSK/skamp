// src/lib/hooks/useCampaignData.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prService } from '@/lib/firebase/pr-service';
import { approvalServiceExtended } from '@/lib/firebase/approval-service';
import { projectService } from '@/lib/firebase/project-service';
import { PRCampaign } from '@/types/pr';
import { ApprovalEnhanced } from '@/types/approvals';

/**
 * Hook zum Laden von Campaigns für ein Projekt
 * Kombiniert linkedCampaigns (alter Ansatz) und projectId-basierte Kampagnen (neuer Ansatz)
 */
export function useProjectCampaigns(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['project-campaigns', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('No projectId or organizationId');
      }

      // 1. Projekt laden
      const projectData = await projectService.getById(projectId, { organizationId });
      let allCampaigns: PRCampaign[] = [];

      if (projectData) {
        // 2a. Lade Kampagnen über linkedCampaigns Array (alter Ansatz)
        if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
          const linkedCampaignData = await Promise.all(
            projectData.linkedCampaigns.map(async (campaignId) => {
              try {
                const campaign = await prService.getById(campaignId);
                return campaign;
              } catch {
                return null; // Fehlerhafte Kampagnen ignorieren
              }
            })
          );
          allCampaigns.push(...linkedCampaignData.filter(Boolean) as PRCampaign[]);
        }

        // 2b. Lade Kampagnen über projectId (neuer Ansatz)
        const projectCampaigns = await prService.getCampaignsByProject(projectId, organizationId);
        allCampaigns.push(...projectCampaigns);

        // Duplikate entfernen
        const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
          index === self.findIndex(c => c.id === campaign.id)
        );

        return uniqueCampaigns;
      }

      return [];
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 0, // Immer als stale markieren, damit bei Rückkehr neu geladen wird
    gcTime: 5 * 60 * 1000, // Garbage collection nach 5 Minuten
  });
}

/**
 * Hook zum Laden von Approvals für ein Projekt
 */
export function useProjectApprovals(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['project-approvals', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('No projectId or organizationId');
      }

      const approvalData = await approvalServiceExtended.getApprovalsByProject(
        projectId,
        organizationId
      );
      return approvalData;
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}

/**
 * Combined Hook: Campaigns + Approvals
 * Lädt beide Datensätze parallel und kombiniert die Ergebnisse
 */
export function useProjectPressData(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  const campaigns = useProjectCampaigns(projectId, organizationId);
  const approvals = useProjectApprovals(projectId, organizationId);

  return {
    campaigns: campaigns.data ?? [],
    approvals: approvals.data ?? [],
    isLoading: campaigns.isLoading || approvals.isLoading,
    isError: campaigns.isError || approvals.isError,
    error: campaigns.error || approvals.error,
    refetch: () => {
      campaigns.refetch();
      approvals.refetch();
    },
  };
}

/**
 * Mutation Hook: Campaign Update
 * Für spätere Verwendung (z.B. in Edit-Modals)
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; campaignData: any }) => {
      await prService.update(data.id, data.campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-campaigns']
      });
    },
  });
}

// src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { PRCampaign } from '@/types/pr';
import { ApprovalEnhanced } from '@/types/approval';
import { prService } from '@/lib/firebase/pr-service';
import { approvalServiceExtended } from '@/lib/firebase/approval-service';
import { projectService } from '@/lib/firebase/project-service';
import PressemeldungCampaignTable from './PressemeldungCampaignTable';
import PressemeldungApprovalTable from './PressemeldungApprovalTable';
import PressemeldungToggleSection from './PressemeldungToggleSection';
import CampaignCreateModal from './CampaignCreateModal';

interface Props {
  projectId: string;
  organizationId: string;
}

export default function ProjectPressemeldungenTab({
  projectId,
  organizationId
}: Props) {
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [approvals, setApprovals] = useState<ApprovalEnhanced[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProjectPressData = useCallback(async () => {
    try {
      // Lade Projekt-Daten um linkedCampaigns zu erhalten
      const projectData = await projectService.getById(projectId, { organizationId });

      let allCampaigns: PRCampaign[] = [];

      if (projectData) {
        // 1. Lade Kampagnen über linkedCampaigns Array (alter Ansatz)
        if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
          const linkedCampaignData = await Promise.all(
            projectData.linkedCampaigns.map(async (campaignId) => {
              try {
                const campaign = await prService.getById(campaignId, organizationId);
                return campaign;
              } catch (error) {
                console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
                return null;
              }
            })
          );
          allCampaigns.push(...linkedCampaignData.filter(Boolean) as PRCampaign[]);
        }

        // 2. Lade Kampagnen über projectId (neuer Ansatz)
        const projectCampaigns = await prService.getCampaignsByProject(projectId, organizationId);
        allCampaigns.push(...projectCampaigns);

        // Duplikate entfernen
        const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
          index === self.findIndex(c => c.id === campaign.id)
        );

        setCampaigns(uniqueCampaigns);

        // Lade Freigaben für gefundene Kampagnen
        if (uniqueCampaigns.length > 0) {
          const approvalData = await approvalServiceExtended.getApprovalsByProject(projectId, organizationId);
          setApprovals(approvalData);
        } else {
          setApprovals([]);
        }
      } else {
        setCampaigns([]);
        setApprovals([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Pressemeldungen:', error);
      setCampaigns([]);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, organizationId]);

  useEffect(() => {
    loadProjectPressData();
  }, [loadProjectPressData]);

  const hasLinkedCampaign = campaigns.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Heading level={3}>Pressemeldung</Heading>
        <Button
          onClick={() => setShowCreateModal(true)}
          className={hasLinkedCampaign
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-[#005fab] hover:bg-[#004a8c] text-white"
          }
          disabled={hasLinkedCampaign}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Meldung Erstellen
        </Button>
      </div>

      {/* Kampagnen-Tabelle */}
      <PressemeldungCampaignTable
        campaigns={campaigns}
        organizationId={organizationId}
        onRefresh={loadProjectPressData}
      />

      {/* Freigabe-Tabelle */}
      <div className="space-y-4">
        <Heading level={3}>Freigabe</Heading>
        <PressemeldungApprovalTable
          approvals={approvals}
          onRefresh={loadProjectPressData}
        />
      </div>

      {/* Toggle-Bereiche - nur anzeigen wenn Freigaben vorhanden sind */}
      {approvals.length > 0 && (
        <div className="space-y-4">
          <Heading level={3}>Freigabe-Details</Heading>
          <PressemeldungToggleSection
            projectId={projectId}
            campaignId={campaigns[0]?.id}
            organizationId={organizationId}
          />
        </div>
      )}

      {/* Footer-Aktionen */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <Button
          color="secondary"
          href="/dashboard/library/boilerplates"
        >
          Boilerplate erstellen
        </Button>
        <Button
          color="secondary"
          href="/dashboard/settings/templates"
        >
          PDF Template erstellen
        </Button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CampaignCreateModal
          projectId={projectId}
          organizationId={organizationId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(campaignId) => {
            setShowCreateModal(false);
            loadProjectPressData();
          }}
        />
      )}
    </div>
  );
}
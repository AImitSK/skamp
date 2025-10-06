'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { ChartBarIcon, EyeIcon, ExclamationCircleIcon, EnvelopeIcon, NewspaperIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { projectService } from '@/lib/firebase/project-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import { EmailPerformanceStats } from '@/components/monitoring/EmailPerformanceStats';
import { RecipientTrackingList } from '@/components/monitoring/RecipientTrackingList';
import { ClippingArchive } from '@/components/monitoring/ClippingArchive';
import { ProjectMonitoringOverview } from '@/components/projects/monitoring/ProjectMonitoringOverview';
import { MonitoringSuggestion } from '@/types/monitoring';
import { MarkPublishedModal } from '@/components/monitoring/MarkPublishedModal';

interface ProjectMonitoringTabProps {
  projectId: string;
}

export function ProjectMonitoringTab({ projectId }: ProjectMonitoringTabProps) {
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [allSends, setAllSends] = useState<any[]>([]);
  const [allClippings, setAllClippings] = useState<any[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<MonitoringSuggestion[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'recipients' | 'clippings'>('overview');
  const [showAddPublicationModal, setShowAddPublicationModal] = useState(false);
  const [selectedCampaignForPublication, setSelectedCampaignForPublication] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);

      // Lade Projekt-Daten um linkedCampaigns zu erhalten
      const projectData = await projectService.getById(projectId, { organizationId: currentOrganization.id });

      let allCampaigns: any[] = [];

      if (projectData) {
        // 1. Lade Kampagnen über linkedCampaigns Array (alter Ansatz)
        if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
          const linkedCampaignData = await Promise.all(
            projectData.linkedCampaigns.map(async (campaignId: string) => {
              try {
                const campaign = await prService.getById(campaignId);
                return campaign;
              } catch (error) {
                console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
                return null;
              }
            })
          );
          allCampaigns.push(...linkedCampaignData.filter(Boolean));
        }

        // 2. Lade Kampagnen über projectId (neuer Ansatz)
        const projectCampaigns = await prService.getCampaignsByProject(projectId, currentOrganization.id);
        allCampaigns.push(...projectCampaigns);

        // Duplikate entfernen
        const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
          index === self.findIndex(c => c.id === campaign.id)
        );

        allCampaigns = uniqueCampaigns;
      }

      const projectCampaigns = allCampaigns;

      const campaignsWithData = await Promise.all(
        projectCampaigns.map(async (campaign: any) => {
          const [sends, clippings, suggestions] = await Promise.all([
            emailCampaignService.getSends(campaign.id!, {
              organizationId: currentOrganization.id
            }),
            clippingService.getByCampaignId(campaign.id!, {
              organizationId: currentOrganization.id
            }),
            monitoringSuggestionService.getByCampaignId(campaign.id!, currentOrganization.id)
          ]);
          return { campaign, sends, clippings, suggestions };
        })
      );

      const sentCampaigns = campaignsWithData.filter(({ sends }) => sends.length > 0);

      const allSendsArr = sentCampaigns.flatMap(({ sends }) => sends);
      const allClippingsArr = sentCampaigns.flatMap(({ clippings }) => clippings);
      const allSuggestionsArr = sentCampaigns.flatMap(({ suggestions }) => suggestions);

      setCampaigns(sentCampaigns.map(({ campaign, sends, clippings }) => ({
        ...campaign,
        stats: {
          total: sends.length,
          delivered: sends.filter((s: any) => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
          opened: sends.filter((s: any) => s.status === 'opened' || s.status === 'clicked').length,
          clicked: sends.filter((s: any) => s.status === 'clicked').length,
          bounced: sends.filter((s: any) => s.status === 'bounced').length,
          clippings: clippings.length
        }
      })));

      setAllSends(allSendsArr);
      setAllClippings(allClippingsArr);
      setAllSuggestions(allSuggestionsArr);
    } catch (error) {
      console.error('Fehler beim Laden der Monitoring-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendUpdated = () => {
    loadData();
  };

  const totalSends = allSends.length;
  const totalClippings = allClippings.length;
  const totalReach = allClippings.reduce((sum, c) => sum + (c.reach || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Lade Monitoring-Daten...</Text>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <Subheading>Noch keine versendeten Kampagnen</Subheading>
        <Text className="text-gray-500">Versende deine erste Kampagne in diesem Projekt</Text>
      </div>
    );
  }

  const handleConfirmSuggestion = async (suggestionId: string) => {
    // TODO: Implement suggestion confirmation
    console.log('Confirm suggestion:', suggestionId);
    loadData();
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    // TODO: Implement suggestion rejection
    console.log('Reject suggestion:', suggestionId);
    loadData();
  };

  const handleAddPublication = () => {
    // Nimm erste Kampagne oder öffne Selection
    if (campaigns.length > 0) {
      setSelectedCampaignForPublication(campaigns[0]);
      setShowAddPublicationModal(true);
    } else {
      alert('Keine Kampagnen vorhanden');
    }
  };

  return (
    <div className="space-y-6">
      {/* View Toggle - nur wenn Overview */}
      {activeView === 'overview' && (
        <ProjectMonitoringOverview
          clippings={allClippings}
          suggestions={allSuggestions}
          sends={allSends}
          campaigns={campaigns}
          onViewAllClippings={() => setActiveView('clippings')}
          onViewAllRecipients={() => setActiveView('recipients')}
          onViewSuggestion={(suggestion) => {
            // Navigate to campaign monitoring detail
            const campaign = campaigns.find(c => c.id === suggestion.campaignId);
            if (campaign) {
              router.push(`/dashboard/analytics/monitoring/${campaign.id}`);
            }
          }}
          onConfirmSuggestion={handleConfirmSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onAddPublication={handleAddPublication}
        />
      )}

      {/* Recipients Detail View */}
      {activeView === 'recipients' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Subheading>📋 Alle Empfänger & Veröffentlichungen</Subheading>
            <button
              onClick={() => setActiveView('overview')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Zurück zur Übersicht
            </button>
          </div>
          <RecipientTrackingList
            sends={allSends}
            campaignId={projectId}
            onSendUpdated={handleSendUpdated}
          />
        </div>
      )}

      {/* Clippings Detail View */}
      {activeView === 'clippings' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Subheading>📰 Alle Veröffentlichungen</Subheading>
            <button
              onClick={() => setActiveView('overview')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Zurück zur Übersicht
            </button>
          </div>
          <ClippingArchive clippings={allClippings} />
        </div>
      )}

      {/* Mark Published Modal */}
      {showAddPublicationModal && selectedCampaignForPublication && allSends.length > 0 && (
        <MarkPublishedModal
          send={allSends[0]} // Dummy send - we just need campaign context
          campaignId={selectedCampaignForPublication.id}
          onClose={() => {
            setShowAddPublicationModal(false);
            setSelectedCampaignForPublication(null);
          }}
          onSuccess={() => {
            setShowAddPublicationModal(false);
            setSelectedCampaignForPublication(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';
import { useProjectMonitoringData, useConfirmSuggestion, useRejectSuggestion } from '@/lib/hooks/useMonitoringData';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { RecipientTrackingList } from '@/components/monitoring/RecipientTrackingList';
import { ClippingArchive } from '@/components/monitoring/ClippingArchive';
import { ProjectMonitoringOverview } from '@/components/projects/monitoring/ProjectMonitoringOverview';

interface ProjectMonitoringTabProps {
  projectId: string;
}

export function ProjectMonitoringTab({ projectId }: ProjectMonitoringTabProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const router = useRouter();

  const [activeView, setActiveView] = useState<'overview' | 'recipients' | 'clippings'>('overview');

  // React Query Hooks
  const { data, isLoading, error, refetch } = useProjectMonitoringData(
    projectId,
    currentOrganization?.id
  );
  const confirmSuggestion = useConfirmSuggestion();
  const rejectSuggestion = useRejectSuggestion();

  // Daten aus Query extrahieren
  const campaigns = data?.campaigns || [];
  const allSends = data?.allSends || [];
  const allClippings = data?.allClippings || [];
  const allSuggestions = data?.allSuggestions || [];

  const handleSendUpdated = () => {
    refetch();
  };

  if (isLoading) {
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
        <Subheading>Noch keine Monitoring-Aktivitäten</Subheading>
        <Text className="text-gray-500">Versende eine Kampagne oder erfasse eine Veröffentlichung</Text>
      </div>
    );
  }

  const handleConfirmSuggestion = async (suggestionId: string) => {
    if (!user || !currentOrganization) {
      toastService.error('Authentifizierung erforderlich');
      return;
    }

    try {
      await confirmSuggestion.mutateAsync({
        suggestionId,
        userId: user.uid,
        organizationId: currentOrganization.id
      });
      toastService.success('Vorschlag bestätigt und Clipping erstellt');
    } catch (error) {
      console.error('Fehler beim Bestätigen des Vorschlags:', error);
      toastService.error('Fehler beim Bestätigen des Vorschlags');
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    if (!user || !currentOrganization) {
      toastService.error('Authentifizierung erforderlich');
      return;
    }

    try {
      await rejectSuggestion.mutateAsync({
        suggestionId,
        userId: user.uid,
        organizationId: currentOrganization.id
      });
      toastService.success('Vorschlag abgelehnt');
    } catch (error) {
      console.error('Fehler beim Ablehnen des Vorschlags:', error);
      toastService.error('Fehler beim Ablehnen des Vorschlags');
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

    </div>
  );
}
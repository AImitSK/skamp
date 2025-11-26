'use client';

import { useState, useCallback, useMemo } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';
import {
  useProjectMonitoringData,
  useConfirmSuggestion,
  useRejectSuggestion,
  useProjectMonitoringTracker,
  useToggleMonitoring,
  useExtendMonitoring
} from '@/lib/hooks/useMonitoringData';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { useRouter } from 'next/navigation';
import { RecipientTrackingList } from '@/components/monitoring/RecipientTrackingList';
import { ClippingArchive } from '@/components/monitoring/ClippingArchive';
import { ProjectMonitoringOverview } from '@/components/projects/monitoring/ProjectMonitoringOverview';
import EmptyState from '@/components/projects/monitoring/EmptyState';
import LoadingState from '@/components/projects/monitoring/LoadingState';
import { MonitoringControlBox } from '@/components/projects/monitoring/MonitoringControlBox';

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
  const {
    data: tracker,
    isLoading: trackerLoading
  } = useProjectMonitoringTracker(projectId, currentOrganization?.id);

  const confirmSuggestion = useConfirmSuggestion();
  const rejectSuggestion = useRejectSuggestion();
  const toggleMonitoring = useToggleMonitoring();
  const extendMonitoring = useExtendMonitoring();

  // Daten aus Query extrahieren
  const campaigns = data?.campaigns || [];
  const allSends = data?.allSends || [];
  const allClippings = data?.allClippings || [];
  const allSuggestions = data?.allSuggestions || [];

  // Computed Values (useMemo für Performance)
  const totalSends = useMemo(() => allSends.length, [allSends.length]);
  const totalClippings = useMemo(() => allClippings.length, [allClippings.length]);
  const totalReach = useMemo(() =>
    allClippings.reduce((sum, c) => sum + (c.reach || 0), 0),
    [allClippings]
  );

  const handleSendUpdated = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleConfirmSuggestion = useCallback(async (
    suggestionId: string,
    sentiment?: 'positive' | 'neutral' | 'negative'
  ) => {
    if (!user || !currentOrganization) {
      toastService.error('Authentifizierung erforderlich');
      return;
    }

    try {
      await confirmSuggestion.mutateAsync({
        suggestionId,
        userId: user.uid,
        organizationId: currentOrganization.id,
        sentiment: sentiment || 'neutral'
      });
      toastService.success('Vorschlag bestätigt und Clipping erstellt');
    } catch (error) {
      console.error('Fehler beim Bestätigen des Vorschlags:', error);
      toastService.error('Fehler beim Bestätigen des Vorschlags');
    }
  }, [confirmSuggestion, user, currentOrganization]);

  const handleRejectSuggestion = useCallback(async (suggestionId: string) => {
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
  }, [rejectSuggestion, user, currentOrganization]);

  const handleViewAllClippings = useCallback(() => {
    setActiveView('clippings');
  }, []);

  const handleViewAllRecipients = useCallback(() => {
    setActiveView('recipients');
  }, []);

  // Tracker Handlers
  const handleToggleMonitoring = useCallback(async (enabled: boolean) => {
    if (!tracker?.id || !currentOrganization) {
      toastService.error('Tracker nicht verfügbar');
      return;
    }

    try {
      await toggleMonitoring.mutateAsync({
        trackerId: tracker.id,
        isActive: enabled,
        organizationId: currentOrganization.id
      });
      toastService.success(enabled ? 'Monitoring aktiviert' : 'Monitoring deaktiviert');
    } catch (error) {
      console.error('Fehler beim Ändern des Monitoring-Status:', error);
      toastService.error('Fehler beim Ändern des Monitoring-Status');
    }
  }, [tracker?.id, currentOrganization, toggleMonitoring]);

  const handleExtendMonitoring = useCallback(async (days: 30 | 60 | 90) => {
    if (!tracker?.id || !currentOrganization) {
      toastService.error('Tracker nicht verfügbar');
      return;
    }

    try {
      await extendMonitoring.mutateAsync({
        trackerId: tracker.id,
        additionalDays: days,
        organizationId: currentOrganization.id
      });
      toastService.success(`Monitoring um ${days} Tage verlängert`);
    } catch (error) {
      console.error('Fehler beim Verlängern des Monitorings:', error);
      toastService.error('Fehler beim Verlängern des Monitorings');
    }
  }, [tracker?.id, currentOrganization, extendMonitoring]);

  if (isLoading) {
    return <LoadingState message="Lade Monitoring-Daten..." />;
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="Noch keine Monitoring-Aktivitäten"
        description="Versende eine Kampagne oder erfasse eine Veröffentlichung"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Monitoring Control Box */}
      <MonitoringControlBox
        tracker={tracker ?? null}
        isLoading={trackerLoading}
        onToggle={handleToggleMonitoring}
        onExtend={handleExtendMonitoring}
      />

      {/* View Toggle - nur wenn Overview */}
      {activeView === 'overview' && (
        <ProjectMonitoringOverview
          clippings={allClippings}
          suggestions={allSuggestions}
          sends={allSends}
          campaigns={campaigns}
          onViewAllClippings={handleViewAllClippings}
          onViewAllRecipients={handleViewAllRecipients}
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
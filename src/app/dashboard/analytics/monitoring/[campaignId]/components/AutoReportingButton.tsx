'use client';

import { memo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { autoReportingService } from '@/lib/firebase/auto-reporting-service';
import { AutoReporting } from '@/types/auto-reporting';
import { AutoReportingModal } from '@/components/monitoring/AutoReportingModal';

export const AutoReportingButton = memo(function AutoReportingButton() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { campaign } = useMonitoring();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingReporting, setExistingReporting] = useState<AutoReporting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lade existierendes Auto-Reporting für diese Kampagne
  useEffect(() => {
    async function loadExistingReporting() {
      if (!campaign?.id || !currentOrganization?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const reporting = await autoReportingService.getAutoReportingByCampaign(
          campaign.id,
          { organizationId: currentOrganization.id, userId: user?.uid || '' }
        );
        setExistingReporting(reporting);
      } catch (error) {
        console.error('Fehler beim Laden des Auto-Reportings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadExistingReporting();
  }, [campaign?.id, currentOrganization?.id, user?.uid]);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSaved = (reporting: AutoReporting) => {
    setExistingReporting(reporting);
    setIsModalOpen(false);
  };

  const handleDeleted = () => {
    setExistingReporting(null);
    setIsModalOpen(false);
  };

  // Nicht anzeigen wenn keine Kampagne
  if (!campaign) return null;

  const isActive = existingReporting?.isActive ?? false;
  const hasReporting = existingReporting !== null;

  return (
    <>
      <Button
        onClick={handleClick}
        color="secondary"
        disabled={isLoading}
        className="relative"
      >
        <ClockIcon className="h-4 w-4 mr-2" />
        {isLoading ? 'Laden...' : hasReporting ? 'Auto-Report' : 'Auto-Report'}
        {/* Aktiv-Indikator */}
        {isActive && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        )}
      </Button>

      {isModalOpen && campaign && currentOrganization && (
        <AutoReportingModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          campaignId={campaign.id!}
          campaignName={campaign.title || 'Unbenannte Kampagne'}
          organizationId={currentOrganization.id}
          existingReporting={existingReporting}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
});

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Text } from '@/components/ui/text';
import {
  EllipsisVerticalIcon,
  PaperAirplaneIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { autoReportingService } from '@/lib/firebase/auto-reporting-service';
import { toastService } from '@/lib/utils/toast';
import { formatShortDate, isMonitoringExpired } from '@/lib/utils/reporting-helpers';
import {
  AutoReporting,
  frequencyLabels,
  dayOfWeekLabels,
  sendStatusLabels,
  sendStatusColors
} from '@/types/auto-reporting';
import { AutoReportingModal } from '@/components/monitoring/AutoReportingModal';

export default function ReportingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const [reportings, setReportings] = useState<AutoReporting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReporting, setEditingReporting] = useState<AutoReporting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Daten laden
  useEffect(() => {
    if (currentOrganization?.id && user?.uid) {
      loadReportings();
    }
  }, [currentOrganization?.id, user?.uid]);

  const loadReportings = async () => {
    if (!currentOrganization?.id || !user?.uid) return;

    try {
      setIsLoading(true);
      const data = await autoReportingService.getAutoReportingsForOrganization({
        organizationId: currentOrganization.id,
        userId: user.uid
      });
      setReportings(data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      toastService.error('Reportings konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (reporting: AutoReporting) => {
    if (!currentOrganization?.id || !user?.uid || !reporting.id) return;

    try {
      const newStatus = !reporting.isActive;
      await autoReportingService.toggleAutoReporting(
        reporting.id,
        newStatus,
        { organizationId: currentOrganization.id, userId: user.uid }
      );
      toastService.success(newStatus ? 'Auto-Reporting aktiviert' : 'Auto-Reporting pausiert');
      loadReportings();
    } catch (error) {
      console.error('Fehler beim Umschalten:', error);
      toastService.error('Status konnte nicht geändert werden');
    }
  };

  const handleDelete = async (reporting: AutoReporting) => {
    if (!currentOrganization?.id || !user?.uid || !reporting.id) return;

    if (!confirm(`Auto-Reporting für "${reporting.campaignName}" wirklich löschen?`)) return;

    try {
      await autoReportingService.deleteAutoReporting(
        reporting.id,
        { organizationId: currentOrganization.id, userId: user.uid }
      );
      toastService.success('Auto-Reporting gelöscht');
      loadReportings();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toastService.error('Löschen fehlgeschlagen');
    }
  };

  const handleSendNow = async (reporting: AutoReporting) => {
    if (!reporting.id || !user) return;

    try {
      toastService.loading('Report wird gesendet...');

      // Firebase ID-Token für Authentifizierung holen
      const token = await user.getIdToken();

      const response = await fetch('/api/reporting/send-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ autoReportingId: reporting.id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Versand fehlgeschlagen');
      }

      toastService.dismiss();
      toastService.success('Report wurde versendet');
      loadReportings();
    } catch (error) {
      toastService.dismiss();
      console.error('Fehler beim Senden:', error);
      toastService.error(error instanceof Error ? error.message : 'Report konnte nicht gesendet werden');
    }
  };

  const handleEdit = (reporting: AutoReporting) => {
    setEditingReporting(reporting);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingReporting(null);
  };

  const handleModalSaved = () => {
    setIsModalOpen(false);
    setEditingReporting(null);
    loadReportings();
  };

  const handleModalDeleted = () => {
    setIsModalOpen(false);
    setEditingReporting(null);
    loadReportings();
  };

  const getStatusBadge = (reporting: AutoReporting) => {
    const isExpired = isMonitoringExpired(reporting.monitoringEndDate);

    if (isExpired) {
      return <Badge color="red">Beendet</Badge>;
    }
    if (reporting.isActive) {
      return <Badge color="green">Aktiv</Badge>;
    }
    return <Badge color="zinc">Pausiert</Badge>;
  };


  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Auto-Reporting
        </h1>
        <Text className="mt-1 text-zinc-600 dark:text-zinc-400">
          Automatische Report-Zustellung an Kunden verwalten
        </Text>
      </div>

      {reportings.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-white">
            Keine Auto-Reports konfiguriert
          </h3>
          <Text className="mt-2 text-zinc-500">
            Aktiviere Auto-Reports im Monitoring-Bereich einer Kampagne,
            um automatisch Reports an deine Kunden zu senden.
          </Text>
          <div className="mt-6">
            <Button
              color="primary"
              onClick={() => router.push('/dashboard/analytics/monitoring')}
            >
              Zum Monitoring
            </Button>
          </div>
        </div>
      ) : (
        /* Table */
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
          {/* Table Header - 40% + 4x15% */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center">
              <div className="w-[40%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-left">
                Kampagne
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-left">
                Status
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-left">
                Frequenz
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-left">
                Nächster Versand
              </div>
              <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-left">
                Letzter Status
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {reportings.map((reporting) => {
              const isExpired = isMonitoringExpired(reporting.monitoringEndDate);

              return (
                <div
                  key={reporting.id}
                  className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center">
                    {/* Kampagne - 40% */}
                    <div className="w-[40%] pr-4">
                      <button
                        onClick={() => router.push(`/dashboard/analytics/monitoring/${reporting.campaignId}`)}
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary line-clamp-1 text-left"
                      >
                        {reporting.campaignName}
                      </button>
                      <Text className="text-xs text-zinc-500">
                        {reporting.recipients.length} Empfänger
                      </Text>
                    </div>

                    {/* Status - 15% */}
                    <div className="w-[15%] text-left">
                      {getStatusBadge(reporting)}
                    </div>

                    {/* Frequenz - 15%, max 2 Zeilen */}
                    <div className="w-[15%] text-left">
                      <Text className="text-sm">
                        {frequencyLabels[reporting.frequency]}
                      </Text>
                      {reporting.frequency === 'weekly' && reporting.dayOfWeek !== undefined && (
                        <Text className="text-xs text-zinc-500">
                          ({dayOfWeekLabels[reporting.dayOfWeek]})
                        </Text>
                      )}
                    </div>

                    {/* Nächster Versand - 15%, max 2 Zeilen */}
                    <div className="w-[15%] text-left">
                      {isExpired ? (
                        <Text className="text-sm text-zinc-400">—</Text>
                      ) : reporting.isActive ? (
                        <>
                          <Text className="text-sm">
                            {reporting.nextSendAt?.toDate().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </Text>
                          <Text className="text-xs text-zinc-500">07:00 Uhr</Text>
                        </>
                      ) : (
                        <Text className="text-sm text-zinc-400">Pausiert</Text>
                      )}
                    </div>

                    {/* Letzter Status - 15%, max 2 Zeilen */}
                    <div className="w-[15%] text-left">
                      {!reporting.lastSendStatus ? (
                        <Text className="text-sm text-zinc-400">Noch nicht gesendet</Text>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <Badge color={sendStatusColors[reporting.lastSendStatus] as 'green' | 'yellow' | 'red'}>
                              {sendStatusLabels[reporting.lastSendStatus]}
                            </Badge>
                            {reporting.lastSendError && (
                              <span title={reporting.lastSendError}>
                                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 cursor-help" />
                              </span>
                            )}
                          </div>
                          {reporting.lastSentAt && (
                            <Text className="text-xs text-zinc-500">
                              {formatShortDate(reporting.lastSentAt)}
                            </Text>
                          )}
                        </>
                      )}
                    </div>

                    {/* Aktionen - Dropdown */}
                    <div className="ml-auto">
                      <Dropdown>
                        <DropdownButton plain>
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem onClick={() => handleSendNow(reporting)}>
                            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                            Jetzt senden
                          </DropdownItem>
                          <DropdownItem onClick={() => handleEdit(reporting)}>
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </DropdownItem>
                          <DropdownDivider />
                          {!isExpired && (
                            <DropdownItem onClick={() => handleToggle(reporting)}>
                              {reporting.isActive ? (
                                <>
                                  <PauseIcon className="h-4 w-4 mr-2" />
                                  Pausieren
                                </>
                              ) : (
                                <>
                                  <PlayIcon className="h-4 w-4 mr-2" />
                                  Fortsetzen
                                </>
                              )}
                            </DropdownItem>
                          )}
                          <DropdownItem onClick={() => handleDelete(reporting)}>
                            <TrashIcon className="h-4 w-4 mr-2 text-red-500" />
                            <span className="text-red-500">Löschen</span>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingReporting && currentOrganization && (
        <AutoReportingModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          campaignId={editingReporting.campaignId}
          campaignName={editingReporting.campaignName}
          organizationId={currentOrganization.id}
          existingReporting={editingReporting}
          onSaved={handleModalSaved}
          onDeleted={handleModalDeleted}
        />
      )}
    </div>
  );
}

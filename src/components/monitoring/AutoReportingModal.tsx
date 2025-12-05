'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { autoReportingService } from '@/lib/firebase/auto-reporting-service';
import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { monitoringTrackerService } from '@/lib/firebase/monitoring-tracker-service';
import { toastService } from '@/lib/utils/toast';
import {
  AutoReporting,
  AutoReportingRecipient,
  ReportingFrequency,
  frequencyLabels,
  dayOfWeekLabels,
  MAX_RECIPIENTS,
  DEFAULT_DAY_OF_WEEK,
  DEFAULT_DAY_OF_MONTH
} from '@/types/auto-reporting';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { Timestamp } from 'firebase/firestore';
import { formatShortDate } from '@/lib/utils/reporting-helpers';

interface AutoReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  organizationId: string;
  existingReporting: AutoReporting | null;
  onSaved: (reporting: AutoReporting) => void;
  onDeleted: () => void;
}

export function AutoReportingModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  organizationId,
  existingReporting,
  onSaved,
  onDeleted
}: AutoReportingModalProps) {
  const { user } = useAuth();

  // Form State
  const [selectedRecipients, setSelectedRecipients] = useState<AutoReportingRecipient[]>([]);
  const [frequency, setFrequency] = useState<ReportingFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(DEFAULT_DAY_OF_WEEK);
  const [dayOfMonth] = useState<number>(DEFAULT_DAY_OF_MONTH);

  // Data State
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [monitoringEndDate, setMonitoringEndDate] = useState<Timestamp | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingTracker, setIsLoadingTracker] = useState(true);

  // Action State
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lade Kontakte und Tracker beim Öffnen
  useEffect(() => {
    if (isOpen) {
      loadContacts();
      loadMonitoringTracker();
    }
  }, [isOpen, organizationId, campaignId]);

  // Initialisiere Form mit existierenden Daten
  useEffect(() => {
    if (existingReporting) {
      setSelectedRecipients(existingReporting.recipients);
      setFrequency(existingReporting.frequency);
      setDayOfWeek(existingReporting.dayOfWeek ?? DEFAULT_DAY_OF_WEEK);
    } else {
      // Reset Form
      setSelectedRecipients([]);
      setFrequency('weekly');
      setDayOfWeek(DEFAULT_DAY_OF_WEEK);
    }
  }, [existingReporting, isOpen]);

  const loadContacts = async () => {
    try {
      setIsLoadingContacts(true);
      // Lade alle Kontakte der Organisation (Kunden)
      const result = await contactsEnhancedService.searchEnhanced(organizationId, {});
      setContacts(result);
    } catch (error) {
      console.error('Fehler beim Laden der Kontakte:', error);
      toastService.error('Kontakte konnten nicht geladen werden');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const loadMonitoringTracker = async () => {
    try {
      setIsLoadingTracker(true);
      // Finde den Tracker für diese Kampagne
      const tracker = await monitoringTrackerService.getTrackerByCampaign(
        campaignId,
        { organizationId, userId: user?.uid || '' }
      );
      if (tracker?.endDate) {
        setMonitoringEndDate(tracker.endDate);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Monitoring-Trackers:', error);
    } finally {
      setIsLoadingTracker(false);
    }
  };

  const handleAddRecipient = (contactId: string) => {
    if (selectedRecipients.length >= MAX_RECIPIENTS) {
      toastService.warning(`Maximal ${MAX_RECIPIENTS} Empfänger erlaubt`);
      return;
    }

    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    // Prüfe ob bereits hinzugefügt
    if (selectedRecipients.some(r => r.contactId === contactId)) {
      toastService.warning('Kontakt bereits hinzugefügt');
      return;
    }

    // E-Mail extrahieren
    const email = contact.emails?.find(e => e.isPrimary)?.email || contact.emails?.[0]?.email;
    if (!email) {
      toastService.error('Kontakt hat keine E-Mail-Adresse');
      return;
    }

    // Name zusammensetzen
    const name = `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim() || email;

    const newRecipient: AutoReportingRecipient = {
      contactId,
      email,
      name
    };

    setSelectedRecipients([...selectedRecipients, newRecipient]);
  };

  const handleRemoveRecipient = (contactId: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.contactId !== contactId));
  };

  const handleSave = async () => {
    if (!user) return;

    // Validierung
    if (selectedRecipients.length === 0) {
      toastService.error('Bitte mindestens einen Empfänger auswählen');
      return;
    }

    if (!monitoringEndDate) {
      toastService.error('Kein aktives Monitoring gefunden');
      return;
    }

    try {
      setIsSaving(true);

      const context = { organizationId, userId: user.uid };

      if (existingReporting?.id) {
        // Update
        await autoReportingService.updateAutoReporting(
          existingReporting.id,
          {
            recipients: selectedRecipients,
            frequency,
            dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
            dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined
          },
          context
        );

        toastService.success('Einstellungen gespeichert');

        // Lade aktualisierte Daten
        const updated = await autoReportingService.getAutoReportingById(existingReporting.id, context);
        if (updated) {
          onSaved(updated);
        }
      } else {
        // Create
        const id = await autoReportingService.createAutoReporting(
          {
            campaignId,
            campaignName,
            recipients: selectedRecipients,
            frequency,
            dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
            dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
            monitoringEndDate
          },
          context
        );

        toastService.success('Auto-Reporting aktiviert');

        // Lade neu erstellte Daten
        const created = await autoReportingService.getAutoReportingById(id, context);
        if (created) {
          onSaved(created);
        }
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toastService.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReporting?.id || !user) return;

    if (!confirm('Auto-Reporting wirklich löschen?')) return;

    try {
      setIsDeleting(true);
      await autoReportingService.deleteAutoReporting(
        existingReporting.id,
        { organizationId, userId: user.uid }
      );
      toastService.success('Auto-Reporting gelöscht');
      onDeleted();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toastService.error('Fehler beim Löschen');
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isLoadingContacts || isLoadingTracker;
  const isEditing = existingReporting !== null;

  // Filtere bereits ausgewählte Kontakte aus der Dropdown-Liste
  const availableContacts = contacts.filter(
    c => !selectedRecipients.some(r => r.contactId === c.id)
  );

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>
        {isEditing ? 'Auto-Reporting bearbeiten' : 'Auto-Reporting einrichten'}
      </DialogTitle>

      <DialogBody className="space-y-6">
        {/* Kampagnen-Info */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <Text className="text-sm text-zinc-600 dark:text-zinc-400">Kampagne</Text>
          <Text className="font-medium">{campaignName}</Text>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Empfänger-Auswahl */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Empfänger (max. {MAX_RECIPIENTS})
              </label>

              {/* Ausgewählte Empfänger als Chips */}
              {selectedRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map(recipient => (
                    <div
                      key={recipient.contactId}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      <UserIcon className="h-4 w-4" />
                      <span>{recipient.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(recipient.contactId)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Kontakt-Dropdown */}
              {selectedRecipients.length < MAX_RECIPIENTS && (
                <Select
                  value=""
                  onChange={(e) => handleAddRecipient(e.target.value)}
                  className="w-full"
                  disabled={availableContacts.length === 0}
                >
                  <option value="">
                    {availableContacts.length === 0
                      ? 'Keine weiteren Kontakte verfügbar'
                      : 'Kontakt hinzufügen...'}
                  </option>
                  {availableContacts.map(contact => {
                    const email = contact.emails?.find(e => e.isPrimary)?.email || contact.emails?.[0]?.email;
                    const name = `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim();
                    return (
                      <option key={contact.id} value={contact.id} disabled={!email}>
                        {name || 'Unbekannt'} {email ? `(${email})` : '- Keine E-Mail'}
                      </option>
                    );
                  })}
                </Select>
              )}

              {contacts.length === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <Text className="text-sm text-yellow-800">
                      Keine Kontakte im CRM gefunden. Bitte fügen Sie zuerst Kunden-Kontakte hinzu.
                    </Text>
                  </div>
                </div>
              )}
            </div>

            {/* Frequenz-Auswahl */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Versand-Frequenz
              </label>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={frequency === 'weekly'}
                    onChange={() => setFrequency('weekly')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>{frequencyLabels.weekly}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="monthly"
                    checked={frequency === 'monthly'}
                    onChange={() => setFrequency('monthly')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>{frequencyLabels.monthly}</span>
                </label>
              </div>

              {/* Wochentag-Auswahl bei weekly */}
              {frequency === 'weekly' && (
                <div className="mt-3">
                  <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                    Versand jeden
                  </label>
                  <Select
                    value={dayOfWeek.toString()}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-48"
                  >
                    {Object.entries(dayOfWeekLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Info bei monthly */}
              {frequency === 'monthly' && (
                <Text className="text-sm text-zinc-500">
                  Der Report wird jeden 1. des Monats um 8:00 Uhr versendet.
                </Text>
              )}
            </div>

            {/* Monitoring-Ende Info */}
            {monitoringEndDate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <Text className="text-sm text-blue-800">
                    Das Reporting endet automatisch am <strong>{formatShortDate(monitoringEndDate)}</strong>,
                    wenn das Monitoring ausläuft.
                  </Text>
                </div>
              </div>
            )}

            {!monitoringEndDate && !isLoadingTracker && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <Text className="text-sm text-red-800">
                    Kein aktives Monitoring für diese Kampagne gefunden.
                    Auto-Reporting kann nur für Kampagnen mit aktivem Monitoring eingerichtet werden.
                  </Text>
                </div>
              </div>
            )}
          </>
        )}
      </DialogBody>

      <DialogActions>
        {/* Löschen-Button (nur bei bestehenden) */}
        {isEditing && (
          <Button
            plain
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="mr-auto text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            {isDeleting ? 'Löschen...' : 'Löschen'}
          </Button>
        )}

        <Button plain onClick={onClose} disabled={isSaving || isDeleting}>
          Abbrechen
        </Button>

        <Button
          color="primary"
          onClick={handleSave}
          disabled={
            isSaving ||
            isDeleting ||
            isLoading ||
            selectedRecipients.length === 0 ||
            !monitoringEndDate
          }
        >
          {isSaving
            ? 'Speichern...'
            : isEditing
              ? 'Speichern'
              : 'Aktivieren'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

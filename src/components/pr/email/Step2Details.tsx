// src/components/pr/email/Step2Details.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, ManualRecipient, StepValidation } from '@/types/email-composer';
import { Input } from '@/components/ui/input';
import { InfoTooltip } from '@/components/InfoTooltip';
import { EnvelopeIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/20/solid';
import RecipientManager from '@/components/pr/email/RecipientManager';
import EmailAddressSelector from '@/components/pr/email/EmailAddressSelector';
import { projectListsService } from '@/lib/firebase/project-lists-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { toastService } from '@/lib/utils/toast';

interface Step2DetailsProps {
  recipients: EmailDraft['recipients'];
  emailAddressId: string;
  metadata: EmailDraft['metadata'];
  onRecipientsChange: (recipients: Partial<EmailDraft['recipients']>) => void;
  onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) => void;
  onRemoveManualRecipient: (id: string) => void;
  onEmailAddressChange: (emailAddressId: string) => void;
  onMetadataChange: (metadata: Partial<EmailDraft['metadata']>) => void;
  validation: StepValidation['step2'];
  campaign: PRCampaign;
}

export default function Step2Details({
  recipients,
  emailAddressId,
  metadata,
  onRecipientsChange,
  onAddManualRecipient,
  onRemoveManualRecipient,
  onEmailAddressChange,
  onMetadataChange,
  validation,
  campaign
}: Step2DetailsProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const hasInitialized = useRef(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [projectLists, setProjectLists] = useState<any[]>([]);

  // Lade Projekt-Verteilerlisten aus project_distribution_lists Collection
  useEffect(() => {
    const loadProjectLists = async () => {
      // Nur einmal beim ersten Laden ausführen und nur wenn keine Listen ausgewählt sind
      if (hasInitialized.current || recipients.listIds.length > 0) {
        return;
      }

      if (!campaign.projectId) {
        return;
      }

      if (!user || !currentOrganization) {
        return;
      }

      hasInitialized.current = true;
      setLoadingProject(true);

      try {
        // Lade Listen aus project_distribution_lists Collection
        const lists = await projectListsService.getProjectLists(campaign.projectId);

        console.log('🔍 Step2Details: Projekt-Listen geladen:', lists);
        setProjectLists(lists); // Speichere für RecipientManager

        if (lists && lists.length > 0) {
          // Extrahiere die masterListIds (verknüpfte Listen)
          const linkedListIds = lists
            .filter(pl => pl.type === 'linked' && pl.masterListId)
            .map(pl => pl.masterListId!);

          // Extrahiere die IDs von custom-Listen
          const customListIds = lists
            .filter(pl => pl.type === 'custom' && pl.id)
            .map(pl => pl.id!);

          const allListIds = [...linkedListIds, ...customListIds];

          console.log('🔍 Step2Details: Linked List IDs:', linkedListIds);
          console.log('🔍 Step2Details: Custom List IDs:', customListIds);
          console.log('🔍 Step2Details: All List IDs:', allListIds);

          if (allListIds.length > 0) {
            onRecipientsChange({
              listIds: allListIds,
              listNames: [], // Namen werden später von RecipientManager geladen
              totalCount: 0, // Wird von RecipientManager berechnet
              validCount: 0
            });
            toastService.success(`${allListIds.length} Verteilerliste(n) geladen`);
          } else {
            console.log('⚠️ Step2Details: Keine Liste-IDs gefunden!');
          }
        }
      } catch (error) {
        toastService.error('Fehler beim Laden der Verteilerlisten');
      } finally {
        setLoadingProject(false);
      }
    };

    loadProjectLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.projectId, user, currentOrganization, recipients.listIds.length]);
  // WICHTIG: onRecipientsChange NICHT in deps - sonst Endlosschleife!
  // Der useEffect lädt nur initial die Listen, danach nie wieder (hasInitialized.current)

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Empfänger-Verwaltung */}
        <div className="border rounded-lg p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5 text-gray-500" />
            Empfänger
          </h3>
          
          <RecipientManager
            selectedListIds={recipients.listIds}
            projectLists={projectLists}
            manualRecipients={recipients.manual}
            onListsChange={(listIds, listNames, totalFromLists) => {
              // Berechne die Gesamtzahl korrekt
              const totalCount = totalFromLists + recipients.manual.length;
              
              onRecipientsChange({ 
                listIds, 
                listNames,
                totalCount: totalCount,
                validCount: totalCount // Für jetzt nehmen wir an, alle sind valide
              });
            }}
            onAddManualRecipient={onAddManualRecipient}
            onRemoveManualRecipient={onRemoveManualRecipient}
            recipientCount={recipients.totalCount}
          />
          
          {validation.errors.recipients && (
            <p className="text-sm text-red-600 mt-2">{validation.errors.recipients}</p>
          )}
        </div>

        {/* Absender-Verwaltung */}
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-gray-500" />
            Absender
          </h3>

          <EmailAddressSelector
            value={emailAddressId}
            onChange={onEmailAddressChange}
            organizationId={currentOrganization?.id || ''}
          />

          {validation.errors.emailAddress && (
            <p className="text-sm text-red-600 mt-2">{validation.errors.emailAddress}</p>
          )}
        </div>

        {/* E-Mail Metadaten */}
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
            E-Mail Details
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-1">
                Betreff
              </label>
              <Input
                id="subject"
                type="text"
                value={metadata.subject}
                onChange={(e) => onMetadataChange({ subject: e.target.value })}
                placeholder="z.B. Pressemitteilung: {{campaignTitle}}"
              />
              {validation.errors.subject && (
                <p className="text-sm text-red-600 mt-1">{validation.errors.subject}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="preheader" className="block text-sm font-medium mb-1">
                Vorschautext (Pre-Header)
              </label>
              <Input
                id="preheader"
                type="text"
                value={metadata.preheader}
                onChange={(e) => onMetadataChange({ preheader: e.target.value })}
                placeholder="Kurze Zusammenfassung für die E-Mail-Vorschau"
                maxLength={150}
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">
                  {metadata.preheader.length}/150
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
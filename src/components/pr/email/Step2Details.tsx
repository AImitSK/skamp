// src/components/pr/email/Step2Details.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, ManualRecipient, SenderInfo, StepValidation } from '@/types/email-composer';
import { Input } from '@/components/ui/input';
import { InfoTooltip } from '@/components/InfoTooltip';
import { EnvelopeIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/20/solid';
import RecipientManager from '@/components/pr/email/RecipientManager';
import SenderSelector from '@/components/pr/email/SenderSelector';
import { projectService } from '@/lib/firebase/project-service';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

interface Step2DetailsProps {
  recipients: EmailDraft['recipients'];
  sender: EmailDraft['sender'];
  metadata: EmailDraft['metadata'];
  onRecipientsChange: (recipients: Partial<EmailDraft['recipients']>) => void;
  onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) => void;
  onRemoveManualRecipient: (id: string) => void;
  onSenderChange: (sender: SenderInfo) => void;
  onMetadataChange: (metadata: Partial<EmailDraft['metadata']>) => void;
  validation: StepValidation['step2'];
  campaign: PRCampaign;
}

export default function Step2Details({
  recipients,
  sender,
  metadata,
  onRecipientsChange,
  onAddManualRecipient,
  onRemoveManualRecipient,
  onSenderChange,
  onMetadataChange,
  validation,
  campaign
}: Step2DetailsProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const hasInitialized = useRef(false);
  const [loadingProject, setLoadingProject] = useState(false);

  // Lade Projekt und setze Verteilerlisten aus dem Projekt
  useEffect(() => {
    const loadProjectLists = async () => {
      console.log('🔍 Step2Details - Check:', {
        hasInitialized: hasInitialized.current,
        recipientsListsLength: recipients.listIds.length,
        projectId: campaign.projectId,
        hasUser: !!user,
        hasOrg: !!currentOrganization
      });

      // Nur einmal beim ersten Laden ausführen und nur wenn keine Listen ausgewählt sind
      if (hasInitialized.current || recipients.listIds.length > 0) {
        console.log('⏭️ Skip: Already initialized or lists already set');
        return;
      }

      if (!campaign.projectId) {
        console.warn('⚠️ Keine projectId in campaign:', campaign);
        return;
      }

      if (!user || !currentOrganization) {
        console.log('⏳ Warte auf user/organization');
        return;
      }

      hasInitialized.current = true;
      setLoadingProject(true);

      try {
        console.log('📋 Lade Projekt:', campaign.projectId);
        const project = await projectService.getById(campaign.projectId, {
          userId: user.uid,
          organizationId: currentOrganization.id
        });

        console.log('✅ Projekt geladen:', {
          projectTitle: project?.title,
          distributionLists: project?.distributionLists
        });

        if (project && project.distributionLists && project.distributionLists.length > 0) {
          console.log('📋 Setze Verteilerlisten:', project.distributionLists);

          // Setze die Projekt-Verteilerlisten
          onRecipientsChange({
            listIds: project.distributionLists,
            listNames: [], // Namen werden später von RecipientManager geladen
            totalCount: 0, // Wird von RecipientManager berechnet
            validCount: 0
          });
        } else {
          console.warn('⚠️ Projekt hat keine Verteilerlisten');
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Projekt-Verteilerlisten:', error);
      } finally {
        setLoadingProject(false);
      }
    };

    loadProjectLists();
  }, [campaign.projectId, user, currentOrganization, recipients.listIds.length, onRecipientsChange]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Versand-Details festlegen</h3>
            <InfoTooltip content="Wählen Sie die Empfänger aus Ihren Verteilerlisten und legen Sie den Absender fest." />
          </div>
        </div>

        {/* Empfänger-Verwaltung */}
        <div className="border rounded-lg p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5 text-gray-500" />
            Empfänger
          </h3>
          
          <RecipientManager
            selectedListIds={recipients.listIds}
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
        <div className="border rounded-lg p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-gray-500" />
            Absender
          </h3>
          
          <SenderSelector
            campaign={campaign}
            sender={sender}
            onChange={onSenderChange}
            error={validation.errors.sender}
          />
        </div>

        {/* E-Mail Metadaten */}
        <div className="border rounded-lg p-6">
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
              <p className="text-xs text-gray-500 mt-1">
                Sie können Variablen wie {"{{campaignTitle}}"} verwenden
              </p>
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
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Wird in vielen E-Mail-Clients als Vorschau angezeigt
                </p>
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
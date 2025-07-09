// src/components/pr/email/Step2Details.tsx
"use client";

import { useEffect, useRef } from 'react';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, ManualRecipient, SenderInfo, StepValidation } from '@/types/email-composer';
import { Input } from '@/components/input';
import { InfoTooltip } from '@/components/InfoTooltip';
import { EnvelopeIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/20/solid';
import RecipientManager from '@/components/pr/email/RecipientManager';
import SenderSelector from '@/components/pr/email/SenderSelector';

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
  // Verwende useRef um zu tracken, ob wir bereits initialisiert haben
  const hasInitialized = useRef(false);

  // Vorauswahl der Kampagnen-Verteilerlisten beim ersten Laden
  useEffect(() => {
    // Nur einmal beim ersten Laden ausführen und nur wenn keine Listen ausgewählt sind
    if (!hasInitialized.current && recipients.listIds.length === 0) {
      hasInitialized.current = true;
      
      // Prüfe ob die Kampagne Verteilerlisten hat
      if (campaign.distributionListIds && campaign.distributionListIds.length > 0) {
        console.log('📋 Vorauswahl der Kampagnen-Verteilerlisten:', campaign.distributionListIds);
        
        // Setze die Kampagnen-Verteilerlisten als vorausgewählt
        onRecipientsChange({
          listIds: campaign.distributionListIds,
          listNames: campaign.distributionListNames || [],
          totalCount: campaign.recipientCount || 0,
          validCount: campaign.recipientCount || 0
        });
      }
    }
  }, [campaign, recipients.listIds.length, onRecipientsChange]);

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

        {/* Info-Box wenn Kampagnen-Listen vorausgewählt wurden */}
        {campaign.distributionListIds && campaign.distributionListIds.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
            <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Kampagnen-Verteilerlisten</p>
              <p className="text-blue-800">
                Die für diese Kampagne definierten Verteilerlisten wurden automatisch vorausgewählt. 
                Sie können die Auswahl bei Bedarf anpassen.
              </p>
            </div>
          </div>
        )}

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

        {/* Hilfe-Box */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Tipps für bessere Zustellbarkeit</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Verwenden Sie einen aussagekräftigen Betreff ohne Spam-Wörter</li>
            <li>Der Vorschautext sollte den Betreff ergänzen, nicht wiederholen</li>
            <li>Nutzen Sie einen verifizierten Absender aus der Firma</li>
            <li>Vermeiden Sie zu viele Empfänger auf einmal (max. 500 pro Versand)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
// src/components/pr/email/Step2Details.tsx
"use client";

import { useEffect } from 'react';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, ManualRecipient, SenderInfo, StepValidation } from '@/types/email-composer';
import { Input } from '@/components/input';
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
  // Berechne Gesamt-Empfängeranzahl wenn sich Listen oder manuelle Empfänger ändern
  useEffect(() => {
    // Diese Berechnung würde normalerweise die tatsächlichen Kontakte aus den Listen zählen
    // Für jetzt nehmen wir an, dass recipientCount bereits korrekt gesetzt ist
    const manualCount = recipients.manual.length;
    const totalCount = (recipients.totalCount || 0) + manualCount;
    const validCount = recipients.manual.filter(r => r.isValid !== false).length + (recipients.validCount || 0);
    
    onRecipientsChange({
      totalCount,
      validCount
    });
  }, [recipients.manual.length, recipients.listIds.length]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Versand-Details festlegen</h3>
          <p className="text-sm text-gray-600">
            Wählen Sie die Empfänger aus Ihren Verteilerlisten und legen Sie den Absender fest.
          </p>
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
            onListsChange={(listIds, listNames) => 
              onRecipientsChange({ listIds, listNames })
            }
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
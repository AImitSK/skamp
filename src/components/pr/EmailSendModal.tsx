// src/components/pr/EmailSendModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { emailCampaignService } from "@/lib/firebase/email-campaign-service";
import { PRCampaign } from "@/types/pr";
import { PRCampaignEmail } from "@/types/email";
import { 
  EnvelopeIcon, 
  EyeIcon, 
  UsersIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/20/solid";

interface EmailSendModalProps {
  campaign: PRCampaign;
  onClose: () => void;
  onSent: () => void;
}

export default function EmailSendModal({ campaign, onClose, onSent }: EmailSendModalProps) {
  const [step, setStep] = useState<'compose' | 'preview' | 'sending' | 'sent' | 'error'>('compose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);

  // E-Mail-Inhalt State
  const [emailContent, setEmailContent] = useState<PRCampaignEmail>({
    subject: `Pressemitteilung: ${campaign.title}`,
    greeting: 'Liebe {{firstName}} {{lastName}},',
    introduction: 'gerne möchten wir Ihnen die folgende Pressemitteilung zur Verfügung stellen:',
    pressReleaseHtml: campaign.contentHtml,
    closing: 'Für Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\nBeste Grüße',
    signature: '{{senderName}}\n{{senderTitle}}\n{{senderCompany}}\n\nTel: {{senderPhone}}\nE-Mail: {{senderEmail}}'
  });

  // Absender-Informationen State
  const [senderInfo, setSenderInfo] = useState({
    name: '',
    title: '',
    company: '',
    phone: '',
    email: ''
  });

  const handleGeneratePreview = async () => {
    if (!senderInfo.name || !senderInfo.company) {
      setError('Bitte füllen Sie alle Absender-Informationen aus.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const previewData = await emailCampaignService.generateCampaignPreview(
        campaign,
        emailContent,
        senderInfo
      );
      setPreview(previewData);
      setStep('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    setStep('sending');
    setLoading(true);
    setError(null);

    try {
      const result = await emailCampaignService.sendPRCampaign(
        campaign,
        emailContent,
        senderInfo
      );
      
      setSendResult(result);
      setStep('sent');
      
      // Nach erfolgreichem Versand die Kampagnen-Liste aktualisieren
      setTimeout(() => {
        onSent();
        onClose();
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderComposeStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <UsersIcon className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <h4 className="font-medium text-blue-900">Kampagne: {campaign.title}</h4>
            <p className="text-sm text-blue-700">
              Verteiler: {campaign.distributionListName} ({campaign.recipientCount} Empfänger)
            </p>
          </div>
        </div>
      </div>

      <FieldGroup>
        <h3 className="text-lg font-semibold mb-4">Absender-Informationen</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Name *</Label>
            <Input
              value={senderInfo.name}
              onChange={(e) => setSenderInfo({ ...senderInfo, name: e.target.value })}
              placeholder="Max Mustermann"
              required
            />
          </Field>
          <Field>
            <Label>Position *</Label>
            <Input
              value={senderInfo.title}
              onChange={(e) => setSenderInfo({ ...senderInfo, title: e.target.value })}
              placeholder="Pressesprecher"
              required
            />
          </Field>
        </div>
        <Field>
          <Label>Unternehmen *</Label>
          <Input
            value={senderInfo.company}
            onChange={(e) => setSenderInfo({ ...senderInfo, company: e.target.value })}
            placeholder="Ihre Firma GmbH"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Telefon</Label>
            <Input
              value={senderInfo.phone}
              onChange={(e) => setSenderInfo({ ...senderInfo, phone: e.target.value })}
              placeholder="+49 123 456789"
            />
          </Field>
          <Field>
            <Label>E-Mail</Label>
            <Input
              type="email"
              value={senderInfo.email}
              onChange={(e) => setSenderInfo({ ...senderInfo, email: e.target.value })}
              placeholder="presse@firma.de"
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup>
        <h3 className="text-lg font-semibold mb-4">E-Mail-Vorlage</h3>
        <Field>
          <Label>Betreff</Label>
          <Input
            value={emailContent.subject}
            onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
          />
        </Field>
        <Field>
          <Label>Begrüßung</Label>
          <Input
            value={emailContent.greeting}
            onChange={(e) => setEmailContent({ ...emailContent, greeting: e.target.value })}
            placeholder="Liebe {{firstName}} {{lastName}},"
          />
        </Field>
        <Field>
          <Label>Einleitung</Label>
          <Textarea
            value={emailContent.introduction}
            onChange={(e) => setEmailContent({ ...emailContent, introduction: e.target.value })}
            rows={2}
          />
        </Field>
        <Field>
          <Label>Schluss-Grußformel</Label>
          <Textarea
            value={emailContent.closing}
            onChange={(e) => setEmailContent({ ...emailContent, closing: e.target.value })}
            rows={2}
          />
        </Field>
        <Field>
          <Label>Signatur</Label>
          <Textarea
            value={emailContent.signature}
            onChange={(e) => setEmailContent({ ...emailContent, signature: e.target.value })}
            rows={4}
            placeholder="{{senderName}}&#10;{{senderTitle}}&#10;{{senderCompany}}"
          />
        </Field>
      </FieldGroup>

      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="font-medium mb-2">Verfügbare Variablen:</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <code>{'{{firstName}}'}</code>
          <code>{'{{lastName}}'}</code>
          <code>{'{{companyName}}'}</code>
          <code>{'{{senderName}}'}</code>
          <code>{'{{senderTitle}}'}</code>
          <code>{'{{senderCompany}}'}</code>
          <code>{'{{senderPhone}}'}</code>
          <code>{'{{senderEmail}}'}</code>
          <code>{'{{currentDate}}'}</code>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <EyeIcon className="h-5 w-5 text-green-600 mr-2" />
          <div>
            <h4 className="font-medium text-green-900">E-Mail-Vorschau</h4>
            <p className="text-sm text-green-700">
              Vorschau für: {preview?.recipient?.name} ({preview?.recipient?.email})
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <p className="text-sm"><strong>Betreff:</strong> {preview?.subject}</p>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          <div dangerouslySetInnerHTML={{ __html: preview?.html || '' }} />
        </div>
      </div>
    </div>
  );

  const renderSendingStep = () => (
    <div className="text-center py-8">
      <EnvelopeIcon className="mx-auto h-16 w-16 text-blue-600 mb-4 animate-pulse" />
      <h3 className="text-lg font-semibold mb-2">E-Mails werden versendet...</h3>
      <p className="text-gray-600">
        Die Kampagne wird an {campaign.recipientCount} Empfänger versendet.
      </p>
      <div className="mt-4">
        <div className="bg-blue-200 rounded-full h-2 w-full max-w-xs mx-auto">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );

  const renderSentStep = () => (
    <div className="text-center py-8">
      <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <EnvelopeIcon className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-green-900 mb-2">Kampagne erfolgreich versendet!</h3>
      {sendResult && (
        <div className="space-y-2">
          <p className="text-green-700">
            ✅ {sendResult.success} E-Mails erfolgreich versendet
          </p>
          {sendResult.failed > 0 && (
            <p className="text-orange-600">
              ⚠️ {sendResult.failed} E-Mails fehlgeschlagen
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-gray-600 mt-4">
        Sie werden automatisch zur Kampagnen-Übersicht weitergeleitet...
      </p>
    </div>
  );

  const renderErrorStep = () => (
    <div className="text-center py-8">
      <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-600 mb-4" />
      <h3 className="text-lg font-semibold text-red-900 mb-2">Versand fehlgeschlagen</h3>
      <p className="text-red-700 mb-4">{error}</p>
      <Button onClick={() => setStep('compose')} color="indigo">
        Zurück zur Bearbeitung
      </Button>
    </div>
  );

  return (
    <Dialog open={true} onClose={onClose} size="4xl">
      <DialogTitle className="px-6 py-4">
        Kampagne versenden: {campaign.title}
      </DialogTitle>

      <DialogBody className="px-6 pb-4 max-h-[80vh] overflow-y-auto">
        {error && step === 'compose' && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {step === 'compose' && renderComposeStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'sending' && renderSendingStep()}
        {step === 'sent' && renderSentStep()}
        {step === 'error' && renderErrorStep()}
      </DialogBody>

      {(step === 'compose' || step === 'preview') && (
        <DialogActions className="px-6 py-4 flex justify-between">
          <Button plain onClick={onClose}>
            Abbrechen
          </Button>
          <div className="flex gap-2">
            {step === 'preview' && (
              <Button plain onClick={() => setStep('compose')}>
                Zurück
              </Button>
            )}
            {step === 'compose' && (
              <Button 
                color="indigo" 
                onClick={handleGeneratePreview}
                disabled={loading || !senderInfo.name || !senderInfo.company}
              >
                {loading ? 'Lade Vorschau...' : 'Vorschau anzeigen'}
              </Button>
            )}
            {step === 'preview' && (
              <Button color="indigo" onClick={handleSendCampaign}>
                <EnvelopeIcon className="size-4 mr-2" />
                Jetzt senden ({campaign.recipientCount} Empfänger)
              </Button>
            )}
          </div>
        </DialogActions>
      )}
    </Dialog>
  );
}
// src/components/pr/email/Step3Preview.tsx
"use client";

import { useState, useCallback, useMemo } from 'react';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, StepValidation } from '@/types/email-composer';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { InfoTooltip } from '@/components/InfoTooltip';
import { emailService } from '@/lib/email/email-service';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { apiClient } from '@/lib/api/api-client';
import { 
  EyeIcon,
  PaperAirplaneIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  PaperClipIcon,
  DocumentIcon,
  InformationCircleIcon
} from '@heroicons/react/20/solid';

interface Step3PreviewProps {
  draft: EmailDraft;
  scheduling: EmailDraft['scheduling'];
  onSchedulingChange: (scheduling: EmailDraft['scheduling']) => void;
  validation: StepValidation['step3'];
  campaign: PRCampaign;
  onSent?: () => void;
}

type PreviewMode = 'desktop' | 'mobile';
type SendMode = 'now' | 'scheduled';

// Alert Component for consistent feedback
interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

function Alert({ type, message, onClose }: AlertProps) {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  const icons = {
    success: CheckCircleIcon,
    error: ExclamationCircleIcon,
    info: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 border ${styles[type]} flex items-start`}>
      <Icon className={`h-5 w-5 ${type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400'} mr-3 flex-shrink-0`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 inline-flex text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Schließen</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function Step3Preview({
  draft,
  scheduling,
  onSchedulingChange,
  validation,
  campaign,
  onSent
}: Step3PreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [testEmailError, setTestEmailError] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [sendMode, setSendMode] = useState<SendMode>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sending, setSending] = useState(false);
  
  // State für Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Berechne korrekte Empfänger-Zahlen
  const totalRecipients = draft.recipients.totalCount || 0;
  const manualRecipients = draft.recipients.manual.length;
  const listRecipients = totalRecipients - manualRecipients;

  // Generiere Vorschau-HTML
  const previewHtml = useMemo(() => {
    // Beispiel-Empfänger für Vorschau
    const sampleRecipient = {
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max.mustermann@example.com',
      companyName: 'Beispiel GmbH'
    };

    // Extrahiere Sender-Info
    const senderInfo = draft.sender.type === 'contact' 
      ? draft.sender.contactData 
      : draft.sender.manual;

    // Erstelle Email-Content aus Draft
    const emailContent = emailComposerService.mergeEmailFields(draft, campaign);

    // Generiere Vorschau mit emailService
    const preview = emailService.generatePreview(
      sampleRecipient as any,
      emailContent,
      {
        name: senderInfo?.name || 'Ihr Name',
        title: senderInfo?.title || '',
        company: senderInfo?.company || campaign.clientName || '',
        phone: senderInfo?.phone || '',
        email: senderInfo?.email || ''
      },
      campaign.assetShareUrl
    );

    return preview.html;
  }, [draft, campaign]);

  // Test-Email validieren
  const validateTestEmail = (email: string): boolean => {
    if (!email.trim()) {
      setTestEmailError('E-Mail-Adresse ist erforderlich');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setTestEmailError('Ungültige E-Mail-Adresse');
      return false;
    }
    setTestEmailError('');
    return true;
  };

  // Test-Email senden mit API
  const handleSendTest = async () => {
    if (!validateTestEmail(testEmail)) return;

    setSendingTest(true);
    setTestSent(false);

    try {
      console.log('Sending test email to:', testEmail);
      
      // API Call für Test-Email
      const result = await emailService.sendTestEmail({
        campaignId: campaign.id!,
        recipientEmail: testEmail,
        recipientName: 'Test Empfänger',
        draft: draft
      });
      
      if (result.success) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 5000);
        console.log('✅ Test email sent:', result.messageId);
      } else {
        setTestEmailError(result.error || 'Test-Versand fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('Test email failed:', error);
      setTestEmailError(error.message || 'Test-Versand fehlgeschlagen');
    } finally {
      setSendingTest(false);
    }
  };

  // Finaler Versand mit API
  const handleFinalSend = async () => {
    if (sendMode === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      setAlert({ type: 'error', message: 'Bitte wählen Sie Datum und Uhrzeit für den geplanten Versand' });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSend = async () => {
    setSending(true);
    
    try {
      // Merge Email-Felder
      const emailContent = emailComposerService.mergeEmailFields(draft, campaign);
      
      // Extrahiere Sender-Info
      const senderInfo = draft.sender.type === 'contact' 
        ? draft.sender.contactData 
        : draft.sender.manual;

      if (!senderInfo) {
        throw new Error('Keine Absender-Informationen gefunden');
      }

      if (sendMode === 'scheduled') {
        // Geplanter Versand
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        console.log('Scheduling email for:', scheduledDateTime);
        console.log('Including', draft.recipients.manual.length, 'manual recipients');
        
        const result = await emailService.scheduleEmail({
          campaign,
          emailContent,
          senderInfo: {
            name: senderInfo.name,
            title: senderInfo.title || '',
            company: senderInfo.company || campaign.clientName || '',
            phone: senderInfo.phone,
            email: senderInfo.email
          },
          scheduledDate: scheduledDateTime,
          timezone: 'Europe/Berlin',
          manualRecipients: draft.recipients.manual // NEU: Manuelle Empfänger übergeben
        } as any);
        
        if (result.success) {
          console.log('✅ Email scheduled:', result.jobId);
          setAlert({ 
            type: 'success', 
            message: `E-Mail wurde für ${scheduledDateTime.toLocaleString('de-DE')} geplant!` 
          });
          setShowConfirmDialog(false);
          if (onSent) {
            setTimeout(() => onSent(), 2000); // Verzögerung für bessere UX
          }
        } else {
          throw new Error(result.error || 'Planung fehlgeschlagen');
        }
      } else {
        // Sofortiger Versand über emailCampaignService
        console.log('Sending email now to', totalRecipients, 'recipients');
        console.log('Including', draft.recipients.manual.length, 'manual recipients');
        
        const result = await emailCampaignService.sendPRCampaign(
          campaign,
          emailContent,
          {
            name: senderInfo.name,
            title: senderInfo.title || '',
            company: senderInfo.company || campaign.clientName || '',
            phone: senderInfo.phone,
            email: senderInfo.email
          },
          draft.recipients.manual // NEU: Manuelle Empfänger übergeben
        );
        
        console.log('✅ Email sent:', result);
        setAlert({ 
          type: 'success', 
          message: `E-Mail wurde erfolgreich an ${result.success} Empfänger gesendet!` 
        });
        setShowConfirmDialog(false);
        if (onSent) {
          setTimeout(() => onSent(), 2000); // Verzögerung für bessere UX
        }
      }
    } catch (error: any) {
      console.error('Send failed:', error);
      setAlert({ 
        type: 'error', 
        message: `Versand fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}` 
      });
      setShowConfirmDialog(false);
    } finally {
      setSending(false);
    }
  };

  // Berechne Mindestdatum für Scheduling (jetzt + 15 Minuten)
  const minScheduleDate = new Date();
  minScheduleDate.setMinutes(minScheduleDate.getMinutes() + 15);
  const minDateString = minScheduleDate.toISOString().split('T')[0];
  const minTimeString = minScheduleDate.toTimeString().slice(0, 5);

  // Helper-Funktion für Dateigrößen-Formatierung (entfernt, da keine Größe in attachedAssets)
  const getFileTypeIcon = (fileType?: string) => {
    // Später können hier verschiedene Icons basierend auf Dateityp zurückgegeben werden
    return DocumentIcon;
  };

  // Extrahiere Anhang-Informationen aus der Kampagne
  const attachments = useMemo(() => {
    const attachmentList: Array<{
      name: string;
      type: string;
      icon: typeof DocumentIcon;
      description?: string;
    }> = [];
    
    // Anhänge aus attachedAssets
    if (campaign.attachedAssets && campaign.attachedAssets.length > 0) {
      campaign.attachedAssets.forEach((attachment) => {
        if (attachment.type === 'asset' && attachment.metadata.fileName) {
          attachmentList.push({
            name: attachment.metadata.fileName,
            type: attachment.metadata.fileType || 'Dokument',
            icon: DocumentIcon,
            description: attachment.metadata.description
          });
        } else if (attachment.type === 'folder' && attachment.metadata.folderName) {
          attachmentList.push({
            name: attachment.metadata.folderName,
            type: 'Ordner',
            icon: DocumentIcon,
            description: attachment.metadata.description
          });
        }
      });
    }
    
    // Falls keine attachedAssets vorhanden sind, aber ein contentHtml existiert,
    // könnte die Pressemitteilung selbst als PDF angehängt werden
    if (attachmentList.length === 0 && campaign.contentHtml) {
      attachmentList.push({
        name: `${campaign.title}.pdf`,
        type: 'Pressemitteilung',
        icon: DocumentIcon,
        description: 'Generierte Pressemitteilung'
      });
    }
    
    return attachmentList;
  }, [campaign]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Vorschau & Versand</h3>
            <InfoTooltip content={`Überprüfen Sie Ihre E-Mail und senden Sie sie an ${totalRecipients} Empfänger`} />
          </div>
        </div>

        {/* Alert anzeigen falls vorhanden */}
        {alert && (
          <div className="mb-6">
            <Alert 
              type={alert.type} 
              message={alert.message} 
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Linke Spalte: Vorschau (60%) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Vorschau-Header */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <EyeIcon className="h-5 w-5 text-gray-500" />
                  E-Mail-Vorschau
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title="Desktop-Ansicht"
                  >
                    <ComputerDesktopIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title="Mobile Ansicht"
                  >
                    <DevicePhoneMobileIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Email-Metadaten */}
              <div className="mb-4 p-3 bg-gray-50 rounded text-sm space-y-1">
                <div><strong>Von:</strong> {draft.sender.type === 'contact' 
                  ? draft.sender.contactData?.name 
                  : draft.sender.manual?.name} &lt;{draft.sender.type === 'contact' 
                  ? draft.sender.contactData?.email 
                  : draft.sender.manual?.email}&gt;</div>
                <div><strong>An:</strong> {totalRecipients} Empfänger</div>
                <div><strong>Betreff:</strong> {draft.metadata.subject}</div>
                {draft.metadata.preheader && (
                  <div><strong>Vorschau:</strong> {draft.metadata.preheader}</div>
                )}
                {attachments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <strong>Anhänge:</strong>
                    <span className="flex items-center gap-1">
                      <PaperClipIcon className="h-4 w-4 text-gray-500" />
                      {attachments.length} {attachments.length === 1 ? 'Datei' : 'Dateien'}
                    </span>
                  </div>
                )}
              </div>

              {/* Preview Frame */}
              <div className={`border rounded overflow-hidden bg-gray-100 ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
              }`}>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full"
                  style={{ height: '700px' }}
                  title="E-Mail Vorschau"
                />
              </div>
            </div>

            {/* Anhang-Liste */}
            {attachments.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <PaperClipIcon className="h-5 w-5 text-gray-500" />
                  Anhänge ({attachments.length})
                </h4>
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <attachment.icon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                          <p className="text-xs text-gray-500">
                            {attachment.type}
                            {attachment.description && ` • ${attachment.description}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Diese Dateien werden automatisch an jede E-Mail angehängt.
                </p>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Versand-Optionen (40%) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Test-Versand */}
            <div className="border rounded-lg p-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <PaperAirplaneIcon className="h-5 w-5 text-gray-500" />
                Test-Versand
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="test-email" className="block text-sm font-medium mb-1">
                    Test-E-Mail senden an:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => {
                        setTestEmail(e.target.value);
                        setTestEmailError('');
                      }}
                      placeholder="test@example.com"
                      className={testEmailError ? 'border-red-300' : ''}
                    />
                    <Button
                      onClick={handleSendTest}
                      disabled={sendingTest}
                      className="whitespace-nowrap"
                    >
                      {sendingTest ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sende...
                        </>
                      ) : (
                        'Test senden'
                      )}
                    </Button>
                  </div>
                  {testEmailError && (
                    <p className="text-sm text-red-600 mt-1">{testEmailError}</p>
                  )}
                  {testSent && (
                    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      Test-E-Mail wurde erfolgreich versendet
                    </p>
                  )}
                </div>
                
                <p className="text-sm text-gray-600">
                  Senden Sie eine Test-E-Mail um die Formatierung und Variablen zu überprüfen.
                  Die Test-E-Mail enthält alle Anhänge.
                </p>
              </div>
            </div>

            {/* Finaler Versand */}
            <div className="border rounded-lg p-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <PaperAirplaneIcon className="h-5 w-5 text-gray-500" />
                Finaler Versand
              </h4>

              <div className="space-y-4">
                {/* Versand-Modus */}
                <div>
                  <label className="block text-sm font-medium mb-2">Versand-Zeitpunkt</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="now"
                        checked={sendMode === 'now'}
                        onChange={(e) => setSendMode(e.target.value as SendMode)}
                        className="h-4 w-4 text-[#005fab] border-gray-300 focus:ring-[#005fab]"
                      />
                      <span className="ml-2">Jetzt senden</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="scheduled"
                        checked={sendMode === 'scheduled'}
                        onChange={(e) => setSendMode(e.target.value as SendMode)}
                        className="h-4 w-4 text-[#005fab] border-gray-300 focus:ring-[#005fab]"
                      />
                      <span className="ml-2">Versand planen</span>
                    </label>
                  </div>
                </div>

                {/* Scheduling-Optionen */}
                {sendMode === 'scheduled' && (
                  <div className="pl-6 space-y-3">
                    <div>
                      <label htmlFor="schedule-date" className="block text-sm font-medium mb-1">
                        Datum
                      </label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={minDateString}
                      />
                    </div>
                    <div>
                      <label htmlFor="schedule-time" className="block text-sm font-medium mb-1">
                        Uhrzeit
                      </label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Der Versand muss mindestens 15 Minuten in der Zukunft liegen.
                    </p>
                  </div>
                )}

                {/* Versand-Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleFinalSend}
                    className="w-full"
                  >
                    {sendMode === 'now' ? (
                      <>
                        <PaperAirplaneIcon className="-ml-1 mr-2 h-4 w-4" />
                        Jetzt an {totalRecipients} Empfänger senden
                      </>
                    ) : (
                      <>
                        <ClockIcon className="-ml-1 mr-2 h-4 w-4" />
                        Versand planen
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Zusammenfassung */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Versand-Übersicht</h4>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-blue-700">Empfänger gesamt:</dt>
                  <dd className="font-medium text-blue-900">{totalRecipients}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700">Aus Verteilerlisten:</dt>
                  <dd className="font-medium text-blue-900">{listRecipients}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-blue-700">Manuell hinzugefügt:</dt>
                  <dd className="font-medium text-blue-900">{manualRecipients}</dd>
                </div>
                {attachments.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Anhänge:</dt>
                    <dd className="font-medium text-blue-900">{attachments.length} Datei{attachments.length !== 1 ? 'en' : ''}</dd>
                  </div>
                )}
              </dl>
              
              {draft.recipients.listNames && draft.recipients.listNames.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-700 mb-1">Ausgewählte Listen:</p>
                  <ul className="text-xs text-blue-800 list-disc list-inside">
                    {draft.recipients.listNames.map((name, index) => (
                      <li key={index}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bestätigungs-Dialog */}
      <ConfirmSendDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmSend}
        recipientCount={totalRecipients}
        sendMode={sendMode}
        scheduledDateTime={sendMode === 'scheduled' ? `${scheduledDate} ${scheduledTime}` : ''}
        sending={sending}
        attachmentCount={attachments.length}
      />
    </div>
  );
}

// Bestätigungs-Dialog Komponente (erweitert um Anhang-Info)
function ConfirmSendDialog({
  isOpen,
  onClose,
  onConfirm,
  recipientCount,
  sendMode,
  scheduledDateTime,
  sending,
  attachmentCount
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipientCount: number;
  sendMode: SendMode;
  scheduledDateTime: string;
  sending: boolean;
  attachmentCount: number;
}) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle className="px-6 pt-6">
        {sendMode === 'now' ? 'E-Mail jetzt versenden?' : 'E-Mail-Versand planen?'}
      </DialogTitle>
      <DialogBody className="px-6 pb-2">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <ExclamationCircleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-900">
                {sendMode === 'now' 
                  ? `Sie sind dabei, diese E-Mail an ${recipientCount} Empfänger zu versenden.`
                  : `Sie planen den Versand dieser E-Mail an ${recipientCount} Empfänger.`
                }
              </p>
              {attachmentCount > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Die E-Mail enthält {attachmentCount} {attachmentCount === 1 ? 'Anhang' : 'Anhänge'}.
                </p>
              )}
              {sendMode === 'scheduled' && (
                <p className="text-sm text-gray-600 mt-2">
                  Geplanter Versand: <strong>{scheduledDateTime}</strong>
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogActions className="px-6 pb-6">
        <Button plain onClick={onClose} disabled={sending}>
          Abbrechen
        </Button>
        <Button 
          onClick={onConfirm} 
          disabled={sending}
        >
          {sending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Wird verarbeitet...
            </>
          ) : (
            <>
              {sendMode === 'now' ? 'Jetzt senden' : 'Versand planen'}
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
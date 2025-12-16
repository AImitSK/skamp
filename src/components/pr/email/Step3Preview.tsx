// src/components/pr/email/Step3Preview.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, StepValidation } from '@/types/email-composer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { InfoTooltip } from '@/components/InfoTooltip';
import { emailService } from '@/lib/email/email-service';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { apiClient } from '@/lib/api/api-client';
import { db } from '@/lib/firebase/client-init';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { emailLogger } from '@/utils/emailLogger';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { toastService } from '@/lib/utils/toast';
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
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/20/solid';
import TranslationLanguageSelector, {
  SelectedLanguages
} from '@/components/pr/email/TranslationLanguageSelector';
import { LanguageCode } from '@/types/international';

interface Step3PreviewProps {
  draft: EmailDraft;
  scheduling: EmailDraft['scheduling'];
  onSchedulingChange: (scheduling: EmailDraft['scheduling']) => void;
  validation: StepValidation['step3'];
  campaign: PRCampaign;
  onSent?: () => void;
  // ✅ PIPELINE-PROPS HINZUGEFÜGT (Plan 4/9)
  pipelineMode?: boolean;
  autoTransitionAfterSend?: boolean;
  onPipelineComplete?: (campaignId: string) => void;
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
  const t = useTranslations('email.step3');

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
        <AlertCloseButton onClose={onClose} t={t} />
      )}
    </div>
  );
}

function AlertCloseButton({ onClose, t }: { onClose: () => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <button
      onClick={onClose}
      className="ml-3 inline-flex text-gray-400 hover:text-gray-500"
    >
      <span className="sr-only">{t('close')}</span>
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

export default function Step3Preview({
  draft,
  scheduling,
  onSchedulingChange,
  validation,
  campaign,
  onSent,
  pipelineMode = false,
  autoTransitionAfterSend = false,
  onPipelineComplete
}: Step3PreviewProps) {
  const t = useTranslations('email.step3');
  const tToast = useTranslations('toasts');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

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
  const [previewContact, setPreviewContact] = useState<any>(null);
  const [previewSignature, setPreviewSignature] = useState<string>('');
  const [assetShareUrl, setAssetShareUrl] = useState<string | undefined>(campaign.assetShareUrl);

  // State für Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // State für Übersetzungs-Sprachen (Phase 2.6)
  const [selectedLanguages, setSelectedLanguages] = useState<SelectedLanguages>({
    original: true,
    translations: []
  });

  // Berechne korrekte Empfänger-Zahlen
  const totalRecipients = draft.recipients.totalCount || 0;
  const manualRecipients = draft.recipients.manual.length;
  const listRecipients = totalRecipients - manualRecipients;

  // Lade ersten Kontakt aus Verteilerlisten für realistische Vorschau
  useEffect(() => {
    const loadPreviewContact = async () => {
      if (!user || !currentOrganization) {
        return;
      }

      try {
        // Wenn manuelle Empfänger vorhanden, nutze den ersten
        if (draft.recipients.manual.length > 0) {
          setPreviewContact(draft.recipients.manual[0]);
          return;
        }

        // Ansonsten lade ersten Kontakt aus erster Liste
        if (draft.recipients.listIds.length > 0 && campaign.projectId) {
          const { projectListsService } = await import('@/lib/firebase/project-lists-service');
          const { listsService } = await import('@/lib/firebase/lists-service');
          const { contactsService } = await import('@/lib/firebase/crm-service');

          // Lade alle Projekt-Listen, um den Typ zu bestimmen
          const projectLists = await projectListsService.getProjectLists(campaign.projectId);

          // Gehe durch die listIds und finde die erste mit Kontakten
          for (const listId of draft.recipients.listIds) {

            // Finde die ProjectDistributionList für diese ID
            const projectList = projectLists.find(pl =>
              pl.id === listId || pl.masterListId === listId
            );


            let contactId: string | undefined;

            // Custom-Liste: contactIds direkt aus ProjectDistributionList
            if (projectList?.type === 'custom' && projectList.contactIds && projectList.contactIds.length > 0) {
              contactId = projectList.contactIds[0];
            }
            // Linked-Liste: contactIds aus master distribution_lists
            else if (projectList?.type === 'linked' && projectList.masterListId) {
              const masterList = await listsService.getById(projectList.masterListId);

              if (masterList && masterList.contactIds && masterList.contactIds.length > 0) {
                contactId = masterList.contactIds[0];
              } else {
              }
            }
            // Fallback: Versuche direkt als distribution_list zu laden
            else {
              const list = await listsService.getById(listId);
              if (list && list.contactIds && list.contactIds.length > 0) {
                contactId = list.contactIds[0];
              }
            }

            // Wenn wir eine contactId haben, lade den Kontakt
            if (contactId) {

              try {
                const contact = await contactsService.getById(contactId);


                if (contact) {
                // Konvertiere Contact zu Preview-Format
                const previewData = {
                  salutation: '',
                  title: '',
                  firstName: contact.firstName || '',
                  lastName: contact.lastName || '',
                  email: contact.email || '',
                  companyName: contact.companyName || ''
                };
                setPreviewContact(previewData);
                return; // Erfolg! Beende die Schleife
              } else {
              }
            } catch (contactError) {
              console.error('❌ Fehler beim Laden des Kontakts:', contactId, contactError);
            }
            }
          }

        }
      } catch (error) {
        console.error('❌ Fehler beim Laden des Preview-Kontakts:', error);
      }
    };

    loadPreviewContact();
  }, [draft.recipients, user, currentOrganization, campaign.projectId]);

  // Lade ausgewählte Signatur
  useEffect(() => {
    const loadSignature = async () => {
      if (!draft.content.signatureId) {
        setPreviewSignature('');
        return;
      }

      try {
        const { emailSignatureService } = await import('@/lib/email/email-signature-service');
        const signature = await emailSignatureService.get(draft.content.signatureId);
        if (signature) {
          setPreviewSignature(signature.content);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Signatur:', error);
      }
    };

    loadSignature();
  }, [draft.content.signatureId]);

  // Erstelle automatisch Share-Link für Campaign-Assets
  useEffect(() => {
    const createAssetShareLink = async () => {
      // Prüfe ob Assets vorhanden sind
      if (!campaign.attachedAssets || campaign.attachedAssets.length === 0) {
        return;
      }

      // Prüfe ob bereits ein Share-Link existiert
      if (campaign.assetShareUrl) {
        return;
      }

      try {
        const { prService } = await import('@/lib/firebase/pr-service');

        const shareLink = await prService.createCampaignShareLink(campaign, {
          allowDownload: true,
          watermark: false
        });


        // Setze Share-URL im lokalen State für sofortige Anzeige
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/share/${shareLink.shareId}`;
        setAssetShareUrl(shareUrl);

        // Zeige Info-Alert
        setAlert({
          type: 'info',
          message: t('assetLinkGenerated', { count: campaign.attachedAssets.length })
        });

        // Auto-hide alert after 3 seconds
        setTimeout(() => setAlert(null), 3000);

      } catch (error) {
        console.error('❌ Fehler beim Erstellen des Asset Share-Links:', error);
        // Kein Alert für Fehler - silent fail
      }
    };

    createAssetShareLink();
  }, [campaign.id, campaign.attachedAssets, campaign.assetShareUrl]);

  // Generiere Vorschau-HTML
  const previewHtml = useMemo(() => {

    // WARNUNG wenn kein echter Kontakt geladen wurde
    if (!previewContact) {
      console.error('⚠️ WARNUNG: Kein echter Kontakt geladen! Verwende Fallback.');
    }

    // Verwende den ersten echten Kontakt oder einen Beispiel-Empfänger
    const sampleRecipient = previewContact || {
      salutation: 'Herr',
      title: 'Dr.',
      firstName: 'Beispiel',
      lastName: 'Empfänger',
      email: 'empfaenger@example.com',
      companyName: 'Beispiel GmbH'
    };


    const senderInfo = {
      name: 'Absender',
      email: draft.emailAddressId ? 'absender@example.com' : '',
      title: '',
      company: campaign.clientName || '',
      phone: ''
    };

    // Erstelle Email-Content aus Draft
    const emailContent = emailComposerService.mergeEmailFields(draft, campaign);

    // Generiere Vorschau mit emailService
    const preview = emailService.generatePreview(
      sampleRecipient as any,
      emailContent,
      {
        name: senderInfo.name || 'Ihr Name',
        title: senderInfo.title || '',
        company: senderInfo.company || campaign.clientName || '',
        phone: senderInfo.phone || '',
        email: senderInfo.email || ''
      },
      assetShareUrl, // Verwende lokalen State statt campaign.assetShareUrl
      campaign.keyVisual,
      previewSignature
    );

    return preview.html;
  }, [draft, campaign, previewContact, previewSignature, assetShareUrl]);

  // Test-Email validieren
  const validateTestEmail = (email: string): boolean => {
    if (!email.trim()) {
      setTestEmailError(t('validation.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setTestEmailError(t('validation.emailInvalid'));
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
      emailLogger.info('Test email requested', {
        campaignId: campaign.id,
        recipientEmail: testEmail
      });

      // API Call für Test-Email mit allen ausgewählten Sprachen
      const result = await emailService.sendTestEmail({
        campaignId: campaign.id!,
        recipientEmail: testEmail,
        recipientName: 'Test Empfänger',
        draft: draft,
        // Phase 2 i18n: Projekt-ID und ausgewählte Sprachen für PDFs
        projectId: campaign.projectId,
        selectedLanguages: selectedLanguages // Alle ausgewählten Sprachen (Original + Übersetzungen)
      });
      
      if (result.success) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 5000);
        toastService.success(tToast('testEmailSent', { email: testEmail }));
        emailLogger.info('Test email sent successfully', {
          campaignId: campaign.id,
          messageId: result.messageId,
          recipientEmail: testEmail
        });
      } else {
        const errorMsg = result.error || tToast('testEmailError');
        setTestEmailError(errorMsg);
        toastService.error(errorMsg);
      }
    } catch (error: any) {
      emailLogger.error('Test email failed', {
        campaignId: campaign.id,
        error: error.message,
        recipientEmail: testEmail
      });
      const errorMsg = error.message || tToast('testEmailError');
      setTestEmailError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setSendingTest(false);
    }
  };

  // Helper-Funktion um Kampagnen-Status zu aktualisieren
  const updateCampaignStatus = async (status: string, additionalData?: any) => {
    if (!campaign.id) return;
    
    try {
      const campaignRef = doc(db, 'pr_campaigns', campaign.id);
      await updateDoc(campaignRef, {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      });
      emailLogger.info('Campaign status updated', {
        campaignId: campaign.id,
        status,
        additionalData
      });
    } catch (error) {
      emailLogger.error('Failed to update campaign status', {
        campaignId: campaign.id,
        status,
        error
      });
      throw error;
    }
  };

  // Finaler Versand mit API
  const handleFinalSend = async () => {
    if (sendMode === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      setAlert({ type: 'error', message: t('errors.dateTimeRequired') });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSend = async () => {
    setSending(true);
    
    try {
      // Merge Email-Felder
      const emailContent = emailComposerService.mergeEmailFields(draft, campaign);

      if (!draft.emailAddressId) {
        throw new Error(t('errors.noSenderEmail'));
      }

      if (sendMode === 'scheduled') {
        // Geplanter Versand via neuer API
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        emailLogger.info('Email scheduling requested', {
          campaignId: campaign.id,
          scheduledDateTime: scheduledDateTime.toISOString(),
          recipientCount: draft.recipients.totalCount
        });

        // Firebase ID Token für Auth
        const idToken = await user?.getIdToken();
        if (!idToken) {
          throw new Error(t('errors.noAuthentication'));
        }

        // API Call zum neuen Endpoint
        const response = await fetch('/api/pr/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            organizationId: currentOrganization?.id,
            draft: draft,
            sendImmediately: false,
            scheduledDate: scheduledDateTime.toISOString(),
            // NEU: Multi-Language Optionen (Phase 2.7)
            projectId: campaign.projectId,
            selectedLanguages: selectedLanguages,
            pdfFormat: 'separate' // Immer separate PDFs pro Sprache
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          emailLogger.info('Email scheduled successfully', {
            campaignId: campaign.id,
            scheduledEmailId: result.scheduledEmailId,
            scheduledFor: result.scheduledFor
          });

          // WICHTIG: Update Campaign Status auf "scheduled"
          await updateCampaignStatus('scheduled', {
            scheduledAt: scheduledDateTime,
            scheduledEmailId: result.scheduledEmailId
          });

          setAlert({
            type: 'success',
            message: t('scheduling.scheduled', { dateTime: scheduledDateTime.toLocaleString('de-DE') })
          });
          toastService.success(t('scheduling.scheduledToast', { dateTime: scheduledDateTime.toLocaleString('de-DE') }));
          setShowConfirmDialog(false);
          if (onSent) {
            setTimeout(() => onSent(), 2000);
          }
        } else {
          throw new Error(result.error || t('errors.schedulingFailed'));
        }
      } else {
        // Sofortiger Versand via neuer API
        emailLogger.info('Immediate email send initiated', {
          campaignId: campaign.id,
          totalRecipients,
          manualRecipients: draft.recipients.manual.length
        });

        // Firebase ID Token für Auth
        const idToken = await user?.getIdToken();
        if (!idToken) {
          throw new Error(t('errors.noAuthentication'));
        }

        // WICHTIG: Update Campaign Status auf "sending" VOR dem Versand
        await updateCampaignStatus('sending');

        try {
          // API Call zum neuen Endpoint
          const response = await fetch('/api/pr/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              campaignId: campaign.id,
              organizationId: currentOrganization?.id,
              draft: draft,
              sendImmediately: true,
              // NEU: Multi-Language Optionen (Phase 2.7)
              projectId: campaign.projectId,
              selectedLanguages: selectedLanguages,
              pdfFormat: 'separate' // Immer separate PDFs pro Sprache
            })
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || t('errors.sendFailed', { reason: t('errors.unknownError') }));
          }

          emailLogger.info('Email sent successfully', {
            campaignId: campaign.id,
            successCount: result.result?.successCount || 0,
            totalRecipients
          });

          // WICHTIG: Update Campaign Status auf "sent" NACH erfolgreichem Versand
          const successCount = result.result?.successCount || 0;
          await updateCampaignStatus('sent', {
            sentAt: serverTimestamp(),
            actualRecipientCount: successCount,
            // ✅ PIPELINE-DISTRIBUTION-STATUS HINZUFÜGEN (Plan 4/9)
            ...(pipelineMode && campaign.projectId && {
              distributionStatus: {
                status: 'sent' as const,
                sentAt: serverTimestamp(),
                recipientCount: totalRecipients,
                successCount: successCount,
                failureCount: result.result?.failureCount || 0,
                distributionId: `dist_${Date.now()}`
              }
            })
          });

          // ✅ PIPELINE AUTO-TRANSITION (Plan 4/9)
          if (pipelineMode && campaign.projectId && autoTransitionAfterSend && successCount > 0) {
            try {
              // Importiere projektService dynamisch um Circular Dependency zu vermeiden
              const { projectService } = await import('@/lib/firebase/project-service');

              await projectService.updateStage(
                campaign.projectId,
                'monitoring',
                {
                  transitionReason: 'distribution_completed',
                  transitionBy: 'user', // Kann später mit echter userId erweitert werden
                  transitionAt: serverTimestamp(),
                  distributionData: {
                    recipientCount: successCount,
                    distributionId: `dist_${Date.now()}`
                  }
                },
                { organizationId: campaign.organizationId!, userId: 'user' }
              );

              // Pipeline-Complete Callback aufrufen
              if (onPipelineComplete) {
                onPipelineComplete(campaign.id!);
              }

              emailLogger.info('Pipeline auto-transition to monitoring completed', {
                campaignId: campaign.id,
                projectId: campaign.projectId,
                recipientCount: successCount
              });
            } catch (pipelineError) {
              emailLogger.error('Pipeline auto-transition failed', {
                campaignId: campaign.id,
                projectId: campaign.projectId,
                error: pipelineError
              });
              // Pipeline-Fehler sollen den E-Mail-Versand nicht beeinträchtigen
            }
          }

          const successMsg = pipelineMode && autoTransitionAfterSend && successCount > 0
            ? t('sending.sentPipelineTransition', { count: successCount })
            : t('sending.sent', { count: successCount });

          setAlert({
            type: 'success',
            message: pipelineMode && autoTransitionAfterSend && successCount > 0
              ? t('sending.sentWithPipelineAlert', { count: successCount })
              : t('sending.sentAlert', { count: successCount })
          });
          toastService.success(successMsg);
          setShowConfirmDialog(false);
          if (onSent) {
            setTimeout(() => onSent(), 2000);
          }
        } catch (sendError) {
          // Bei Fehler: Status zurück auf "draft" setzen
          await updateCampaignStatus('draft');
          throw sendError;
        }
      }
    } catch (error: any) {
      emailLogger.error('Email send failed', {
        campaignId: campaign.id,
        error: error.message,
        sendMode
      });
      const errorMsg = t('errors.sendFailed', { reason: error.message || t('errors.unknownError') });
      setAlert({
        type: 'error',
        message: errorMsg
      });
      toastService.error(errorMsg);
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
    return DocumentTextIcon;
  };

  // Extrahiere Anhang-Informationen aus der Kampagne
  const attachments = useMemo(() => {
    const attachmentList: Array<{
      name: string;
      type: string;
      icon: typeof DocumentTextIcon;
      description?: string;
    }> = [];
    
    // Anhänge aus attachedAssets
    if (campaign.attachedAssets && campaign.attachedAssets.length > 0) {
      campaign.attachedAssets.forEach((attachment) => {
        if (attachment.type === 'asset' && attachment.metadata.fileName) {
          attachmentList.push({
            name: attachment.metadata.fileName,
            type: attachment.metadata.fileType || 'Dokument',
            icon: DocumentTextIcon,
            description: attachment.metadata.description
          });
        } else if (attachment.type === 'folder' && attachment.metadata.folderName) {
          attachmentList.push({
            name: attachment.metadata.folderName,
            type: 'Ordner',
            icon: DocumentTextIcon,
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
        icon: DocumentTextIcon,
        description: 'Generierte Pressemitteilung'
      });
    }
    
    return attachmentList;
  }, [campaign]);

  // Prüfe ob Kampagne bereits versendet wurde oder geplant ist
  const isDisabled = campaign.status === 'sent' || campaign.status === 'scheduled' || campaign.status === 'sending';

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
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

        {/* Status-Warnung wenn bereits versendet/geplant */}
        {isDisabled && (
          <div className="mb-6">
            <Alert
              type="info"
              message={
                campaign.status === 'sent'
                  ? t('status.alreadySent')
                  : campaign.status === 'scheduled'
                  ? t('status.alreadyScheduled')
                  : t('status.sending')
              }
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Test-Versand und Finaler Versand (50/50 Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test-Versand */}
            <div className="border rounded-lg p-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <PaperAirplaneIcon className="h-5 w-5 text-gray-500" />
                {t('testSend.title')}
              </h4>

              <div className="space-y-4">
                <div>
                  <label htmlFor="test-email" className="block text-sm font-medium mb-1">
                    {t('testSend.label')}
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
                      placeholder={t('testSend.placeholder')}
                      className={testEmailError ? 'border-red-300' : ''}
                      disabled={isDisabled}
                    />
                    <Button
                      onClick={handleSendTest}
                      disabled={sendingTest || isDisabled}
                      className="whitespace-nowrap"
                    >
                      {sendingTest ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t('testSend.sending')}
                        </>
                      ) : (
                        t('testSend.send')
                      )}
                    </Button>
                  </div>
                  {testEmailError && (
                    <p className="text-sm text-red-600 mt-1">{testEmailError}</p>
                  )}
                  {testSent && (
                    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      {t('testSend.success')}
                    </p>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  {t('testSend.description')}
                </p>
              </div>
            </div>

            {/* Finaler Versand */}
            <div className="border rounded-lg p-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <PaperAirplaneIcon className="h-5 w-5 text-gray-500" />
                {t('finalSend.title')}
              </h4>

              <div className="space-y-4">
                {/* Versand-Modus */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('finalSend.timing')}</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="now"
                        checked={sendMode === 'now'}
                        onChange={(e) => setSendMode(e.target.value as SendMode)}
                        className="h-4 w-4 text-[#005fab] border-gray-300 focus:ring-[#005fab]"
                        disabled={isDisabled}
                      />
                      <span className="ml-2">{t('finalSend.sendNow')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="scheduled"
                        checked={sendMode === 'scheduled'}
                        onChange={(e) => setSendMode(e.target.value as SendMode)}
                        className="h-4 w-4 text-[#005fab] border-gray-300 focus:ring-[#005fab]"
                        disabled={isDisabled}
                      />
                      <span className="ml-2">{t('finalSend.schedule')}</span>
                    </label>
                  </div>
                </div>

                {/* Scheduling-Optionen */}
                {sendMode === 'scheduled' && (
                  <div className="pl-6 space-y-3">
                    <div>
                      <label htmlFor="schedule-date" className="block text-sm font-medium mb-1">
                        {t('finalSend.dateLabel')}
                      </label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={minDateString}
                        disabled={isDisabled}
                      />
                    </div>
                    <div>
                      <label htmlFor="schedule-time" className="block text-sm font-medium mb-1">
                        {t('finalSend.timeLabel')}
                      </label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        disabled={isDisabled}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('finalSend.minTimeHint')}
                    </p>
                  </div>
                )}

                {/* Versand-Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleFinalSend}
                    className="w-full"
                    disabled={isDisabled}
                  >
                    {sendMode === 'now' ? (
                      <>
                        <PaperAirplaneIcon className="-ml-1 mr-2 h-4 w-4" />
                        {t('finalSend.sendNowButton', { count: totalRecipients })}
                      </>
                    ) : (
                      <>
                        <ClockIcon className="-ml-1 mr-2 h-4 w-4" />
                        {t('finalSend.scheduleButton')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Übersetzungs-Sprachauswahl (Phase 2.6) */}
          {currentOrganization && campaign.projectId && (
            <TranslationLanguageSelector
              organizationId={currentOrganization.id}
              projectId={campaign.projectId}
              sourceLanguage={((currentOrganization as any).contentLanguages?.primary || 'de') as LanguageCode}
              selectedLanguages={selectedLanguages}
              onSelectedLanguagesChange={setSelectedLanguages}
              disabled={isDisabled}
            />
          )}

          {/* E-Mail-Vorschau (volle Breite) */}
          <div>
            {/* Vorschau-Header */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <EyeIcon className="h-5 w-5 text-gray-500" />
                  {t('preview.title')}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title={t('preview.desktopView')}
                  >
                    <ComputerDesktopIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title={t('preview.mobileView')}
                  >
                    <DevicePhoneMobileIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Email-Metadaten */}
              <div className="mb-4 p-3 bg-gray-50 rounded text-sm space-y-1">
                <div><strong>{t('preview.from')}</strong> {draft.emailAddressId ? `Email ID: ${draft.emailAddressId.substring(0, 8)}...` : t('preview.notSelected')}</div>
                <div><strong>{t('preview.to')}</strong> {totalRecipients} {t('preview.recipients')}</div>
                <div><strong>{t('preview.subject')}</strong> {draft.metadata.subject}</div>
                {draft.metadata.preheader && (
                  <div><strong>{t('preview.preheader')}</strong> {draft.metadata.preheader}</div>
                )}
                {attachments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <strong>{t('preview.attachments')}</strong>
                    <span className="flex items-center gap-1">
                      <PaperClipIcon className="h-4 w-4 text-gray-500" />
                      {attachments.length} {attachments.length === 1 ? t('preview.file') : t('preview.files')}
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
                  style={{ height: 'auto', minHeight: '400px', border: 'none' }}
                  scrolling="no"
                  title={t('preview.iframeTitle')}
                  onLoad={(e) => {
                    // Auto-resize iframe to content height
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentWindow) {
                      const height = iframe.contentWindow.document.body.scrollHeight;
                      iframe.style.height = `${height + 20}px`;
                    }
                  }}
                />
              </div>
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
  const t = useTranslations('email.step3');

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle className="px-6 pt-6">
        {sendMode === 'now' ? t('dialog.titleNow') : t('dialog.titleScheduled')}
      </DialogTitle>
      <DialogBody className="px-6 pb-2">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <ExclamationCircleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-900">
                {sendMode === 'now'
                  ? t('dialog.messageSendNow', { count: recipientCount })
                  : t('dialog.messageScheduled', { count: recipientCount })
                }
              </p>
              {attachmentCount > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('dialog.attachmentInfo', { count: attachmentCount })}
                </p>
              )}
              {sendMode === 'scheduled' && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('dialog.scheduledTime', { dateTime: scheduledDateTime })}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                {t('dialog.irreversible')}
              </p>
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogActions className="px-6 pb-6">
        <Button plain onClick={onClose} disabled={sending}>
          {t('common.cancel')}
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
              {t('dialog.processing')}
            </>
          ) : (
            <>
              {sendMode === 'now' ? t('dialog.confirmNow') : t('dialog.confirmScheduled')}
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
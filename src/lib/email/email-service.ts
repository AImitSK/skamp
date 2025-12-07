// src/lib/email/email-service.ts - UPDATED WITH NOTIFICATION INTEGRATION
import { PRCampaignEmail } from '@/types/email';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';
import { EmailDraft, TestEmailRequest, SendTestEmailResponse } from '@/types/email-composer';
import { Timestamp } from 'firebase/firestore';
import { apiClient } from '@/lib/api/api-client';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { emailLogger } from '@/utils/emailLogger';

export interface EmailSendResult {
  success: boolean;
  results: Array<{
    email: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

export interface EmailPreviewData {
  html: string;
  text: string;
  subject: string;
  recipient: {
    email: string;
    name: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    content?: string[];
    subject?: string[];
    sender?: string[];
    recipients?: string[];
  };
  warnings?: {
    content?: string[];
    subject?: string[];
  };
}

// ERWEITERT: Interface für Schedule-Request mit manuellen Empfängern
export interface ScheduleEmailRequest {
  campaign: PRCampaign;
  emailContent: PRCampaignEmail;
  senderInfo: {
    name: string;
    title: string;
    company: string;
    phone?: string;
    email?: string;
  };
  scheduledDate: Date;
  timezone?: string;
  manualRecipients?: Array<{ // NEU: Optional manuelle Empfänger
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
  }>;
}

export interface ScheduleEmailResult {
  success: boolean;
  jobId?: string;
  scheduledFor: Date;
  error?: string;
}

export class EmailService {
  
  /**
   * PR-Kampagne per E-Mail versenden (über API Route)
   */
  async sendPRCampaign(
    campaign: PRCampaign,
    emailContent: PRCampaignEmail,
    senderInfo: {
      name: string;
      title: string;
      company: string;
      phone?: string;
      email?: string;
    },
    contacts: Contact[],
    mediaShareUrl?: string,
    keyVisual?: { url: string; cropData?: any },
    // ✅ PIPELINE-OPTIONS HINZUGEFÜGT (Plan 4/9)
    options?: { pipelineMode?: boolean; projectId?: string }
  ): Promise<EmailSendResult> {
    
    // Kontakte zu Empfängern konvertieren
    const recipients = contacts
      .filter(contact => contact.email)
      .map(contact => ({
        email: contact.email!,
        name: `${contact.firstName} ${contact.lastName}`,
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyName: contact.companyName
      }));

    if (recipients.length === 0) {
      throw new Error('Keine Kontakte mit E-Mail-Adressen gefunden');
    }

    // API Route mit authenticated fetch aufrufen
    const result = await apiClient.post<EmailSendResult>('/api/sendgrid/send-pr-campaign', {
      recipients,
      campaignEmail: emailContent,
      senderInfo,
      campaignId: campaign.id, // WICHTIG: Campaign ID für email_campaign_sends
      campaignTitle: campaign.title,
      mediaShareUrl,
      keyVisual
    });

    // ========== NOTIFICATION INTEGRATION: Email Sent Success ==========
    if (result.summary.success > 0) {
      try {
        await notificationsService.notifyEmailSent(
          campaign,
          result.summary.success,
          campaign.userId
        );
      } catch (notificationError) {
        // Fehler bei Benachrichtigung sollte den Hauptprozess nicht stoppen
      }
    }

    // ========== NOTIFICATION INTEGRATION: Email Bounces ==========
    // Prüfe ob es Bounces gab (failed emails)
    const bouncedEmails = result.results.filter(r => r.status === 'failed');
    if (bouncedEmails.length > 0) {
      // Sende Benachrichtigung für jeden Bounce (oder aggregiert)
      try {
        // Option 1: Eine Benachrichtigung pro Bounce (für wenige Bounces)
        if (bouncedEmails.length <= 5) {
          for (const bounce of bouncedEmails) {
            await notificationsService.notifyEmailBounced(
              campaign,
              bounce.email,
              campaign.userId
            );
          }
        } else {
          // Option 2: Eine aggregierte Benachrichtigung für viele Bounces
          await notificationsService.notifyEmailBounced(
            campaign,
            `${bouncedEmails.length} E-Mails`,
            campaign.userId
          );
        }
      } catch (notificationError) {
        // Fehler bei Benachrichtigung sollte den Hauptprozess nicht stoppen
      }
    }

    // ✅ PIPELINE-TRACKING HINZUGEFÜGT (Plan 4/9)
    if (options?.pipelineMode && options.projectId) {
      try {
        await this.createPipelineDistributionEvent({
          projectId: options.projectId,
          campaignId: campaign.id!,
          distributionId: `dist_${Date.now()}`,
          recipientCount: result.summary.success,
          timestamp: Timestamp.now(),
          metadata: {
            emailContent: emailContent.subject,
            senderInfo: senderInfo.name
          }
        });
      } catch (pipelineError) {
        // Pipeline-Event-Erstellung soll den E-Mail-Versand nicht blockieren
        console.warn('Pipeline-Event creation failed:', pipelineError);
      }
    }

    return result;
  }

  /**
   * Test-Email versenden
   */
  async sendTestEmail(request: TestEmailRequest): Promise<SendTestEmailResponse> {
    try {

      // Erstelle einen Test-Kontakt
      const testContact: Contact = {
        id: 'test-contact',
        userId: '',
        firstName: request.recipientName?.split(' ')[0] || 'Test',
        lastName: request.recipientName?.split(' ')[1] || 'Empfänger',
        email: request.recipientEmail,
        companyName: 'Test Company',
        companyId: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Extrahiere Sender-Info aus dem Draft
      const senderInfo = this.extractSenderInfo(request.draft);

      // Erstelle Email-Content aus dem Draft
      const emailContent = this.createEmailContent(request.draft, request.campaignId);

      // Sende über API Route mit authenticated fetch
      const result = await apiClient.post<SendTestEmailResponse>('/api/email/test', {
        recipient: {
          email: request.recipientEmail,
          name: testContact.firstName + ' ' + testContact.lastName,
          firstName: testContact.firstName,
          lastName: testContact.lastName,
          companyName: testContact.companyName
        },
        campaignEmail: emailContent,
        senderInfo,
        campaignId: request.campaignId, // NEU: Campaign ID übergeben
        signatureId: request.draft.content.signatureId, // NEU: Signatur-ID übergeben
        // Phase 2 i18n: Übersetzungs-Parameter
        projectId: request.projectId,
        targetLanguage: request.targetLanguage,
        testMode: true
      });

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Email-Content validieren
   */
  validateEmailContent(
    emailContent: PRCampaignEmail,
    senderInfo: any,
    recipientCount: number
  ): ValidationResult {
    const errors: ValidationResult['errors'] = {};
    const warnings: ValidationResult['warnings'] = {};

    // Content-Validierung
    const contentErrors: string[] = [];
    const contentWarnings: string[] = [];

    // Prüfe auf leere Felder
    if (!emailContent.subject || emailContent.subject.trim().length === 0) {
      contentErrors.push('Betreff darf nicht leer sein');
    }

    if (!emailContent.greeting || emailContent.greeting.trim().length === 0) {
      contentErrors.push('Begrüßung fehlt');
    }

    if (!emailContent.introduction || emailContent.introduction.trim().length === 0) {
      contentErrors.push('Einleitung fehlt');
    }

    if (!emailContent.pressReleaseHtml || emailContent.pressReleaseHtml.trim().length === 0) {
      contentErrors.push('Pressemitteilung fehlt');
    }

    // Prüfe Betreff-Länge
    if (emailContent.subject && emailContent.subject.length > 150) {
      contentErrors.push('Betreff ist zu lang (max. 150 Zeichen)');
    } else if (emailContent.subject && emailContent.subject.length < 10) {
      contentWarnings.push('Betreff ist sehr kurz');
    }

    // Prüfe auf Spam-Trigger-Wörter
    const spamWords = ['kostenlos', 'gratis', 'gewinn', 'klicken sie hier', 'jetzt kaufen'];
    const subjectLower = emailContent.subject?.toLowerCase() || '';
    const foundSpamWords = spamWords.filter(word => subjectLower.includes(word));
    if (foundSpamWords.length > 0) {
      contentWarnings.push(`Betreff enthält potenzielle Spam-Wörter: ${foundSpamWords.join(', ')}`);
    }

    // Prüfe auf fehlende Variablen
    const requiredVariables = ['{{firstName}}', '{{lastName}}'];
    const hasPersonalization = requiredVariables.some(variable => 
      emailContent.greeting.includes(variable) || 
      emailContent.introduction.includes(variable)
    );
    if (!hasPersonalization) {
      contentWarnings.push('E-Mail enthält keine Personalisierung');
    }

    if (contentErrors.length > 0) errors.content = contentErrors;
    if (contentWarnings.length > 0) warnings.content = contentWarnings;

    // Absender-Validierung
    const senderErrors: string[] = [];
    
    if (!senderInfo.name || senderInfo.name.trim().length === 0) {
      senderErrors.push('Absender-Name fehlt');
    }

    if (!senderInfo.email || !this.isValidEmail(senderInfo.email)) {
      senderErrors.push('Ungültige Absender-E-Mail-Adresse');
    }

    if (senderErrors.length > 0) errors.sender = senderErrors;

    // Empfänger-Validierung
    const recipientErrors: string[] = [];

    if (recipientCount === 0) {
      recipientErrors.push('Keine Empfänger ausgewählt');
    } else if (recipientCount > 500) {
      recipientErrors.push('Zu viele Empfänger (max. 500 pro Versand)');
    }

    if (recipientErrors.length > 0) errors.recipients = recipientErrors;

    // Bestimme ob insgesamt valide
    const isValid = Object.keys(errors).length === 0;

    return {
      isValid,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined
    };
  }

  /**
   * Email-Versand planen - ERWEITERT für manuelle Empfänger
   */
  async scheduleEmail(request: ScheduleEmailRequest): Promise<ScheduleEmailResult> {
    try {

      // Validiere Datum (mindestens 15 Minuten in der Zukunft)
      const now = new Date();
      const minScheduleTime = new Date(now.getTime() + 15 * 60 * 1000);
      
      if (request.scheduledDate < minScheduleTime) {
        return {
          success: false,
          scheduledFor: request.scheduledDate,
          error: 'Der Versand muss mindestens 15 Minuten in der Zukunft liegen'
        };
      }

      // NEU: Berechne die Gesamtzahl der Empfänger
      const listRecipientCount = request.campaign.recipientCount || 0;
      const manualRecipientCount = request.manualRecipients?.length || 0;
      const totalRecipientCount = listRecipientCount + manualRecipientCount;

      emailLogger.debug('Scheduling details', {
        campaignId: request.campaign.id,
        listRecipients: listRecipientCount,
        manualRecipients: manualRecipientCount,
        total: totalRecipientCount
      });

      // API Route mit authenticated fetch aufrufen
      const result = await apiClient.post<ScheduleEmailResult>('/api/email/schedule', {
        campaignId: request.campaign.id,
        emailContent: request.emailContent,
        senderInfo: request.senderInfo,
        recipients: { // NEU: Strukturierte Empfänger-Info
          listIds: request.campaign.distributionListIds || [request.campaign.distributionListId],
          listNames: request.campaign.distributionListNames || [request.campaign.distributionListName],
          manualRecipients: request.manualRecipients || [],
          totalCount: totalRecipientCount
        },
        scheduledDate: request.scheduledDate.toISOString(),
        timezone: request.timezone || 'Europe/Berlin'
      });

      // ========== NOTIFICATION INTEGRATION: Scheduled Email (Optional) ==========
      // Du könntest hier auch eine Benachrichtigung für geplante E-Mails hinzufügen
      // wenn das gewünscht ist, z.B.:
      /*
      if (result.success) {
        try {
          // Erstelle eine Custom-Benachrichtigung für geplante E-Mails
          await notificationsService.create({
            userId: request.campaign.userId,
            type: 'EMAIL_SENT_SUCCESS', // Oder ein neuer Typ 'EMAIL_SCHEDULED'
            title: 'E-Mail-Kampagne geplant',
            message: `Die Kampagne "${request.campaign.title}" wurde für ${request.scheduledDate.toLocaleString('de-DE')} geplant.`,
            linkUrl: `/dashboard/schedule-mails/${request.campaign.id}`,
            linkType: 'campaign',
            linkId: request.campaign.id,
            isRead: false,
            metadata: {
              campaignId: request.campaign.id,
              campaignTitle: request.campaign.title,
              recipientCount: totalRecipientCount,
              scheduledDate: request.scheduledDate.toISOString()
            }
          });
        } catch (notificationError) {
        }
      }
      */

      return result;

    } catch (error) {
      return {
        success: false,
        scheduledFor: request.scheduledDate,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * E-Mail-Preview generieren (clientseitig)
   */
  generatePreview(
    contact: Contact | any,
    campaignEmail: PRCampaignEmail,
    senderInfo: {
      name: string;
      title: string;
      company: string;
      phone?: string;
      email?: string;
    },
    mediaShareUrl?: string,
    keyVisual?: { url: string; cropData?: any },
    signatureHtml?: string
  ): EmailPreviewData {

    const recipient = {
      email: contact.email || 'preview@example.com',
      name: `${contact.firstName} ${contact.lastName}`,
      firstName: contact.firstName,
      lastName: contact.lastName,
      companyName: contact.companyName
    };

    // Berechne salutationFormal (Contact hat kein salutation-Property mehr)
    let salutationFormal = 'Sehr geehrte Damen und Herren';

    // Variablen ersetzen
    const variables = {
      salutationFormal: salutationFormal,
      title: '',
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      fullName: `${contact.firstName || ''} ${contact.lastName || ''}`,
      companyName: contact.companyName || '',
      senderName: senderInfo.name,
      senderTitle: senderInfo.title,
      senderCompany: senderInfo.company,
      senderPhone: senderInfo.phone || '',
      senderEmail: senderInfo.email || '',
      currentDate: new Date().toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      mediaShareUrl: mediaShareUrl || ''
    };

    const html = this.buildPreviewHtml(campaignEmail, variables, mediaShareUrl, keyVisual, signatureHtml);
    const text = this.buildPreviewText(campaignEmail, variables, mediaShareUrl);
    const subject = this.replaceVariables(campaignEmail.subject, variables);

    return {
      html,
      text,
      subject,
      recipient: {
        email: recipient.email,
        name: recipient.name
      }
    };
  }

  /**
   * Helper: Sender-Info aus Draft extrahieren
   * HINWEIS: Sender-Info wird jetzt über emailAddressId verwaltet
   * Die echte Sender-Info wird vom Backend aus der EmailAddress Collection geladen
   */
  private extractSenderInfo(draft: EmailDraft) {
    // Placeholder Sender-Info für Test-Email
    // Die echte Sender-Info wird im Backend über emailAddressId geladen
    return {
      name: 'Absender',
      title: '',
      company: '',
      phone: '',
      email: draft.emailAddressId || 'noreply@example.com'
    };
  }

  /**
   * Helper: Email-Content aus Draft erstellen
   */
  private createEmailContent(draft: EmailDraft, campaignTitle: string): PRCampaignEmail {
    // Extrahiere die verschiedenen Teile aus dem HTML-Content
    // Dies ist eine vereinfachte Version - in der Praxis würde man das HTML parsen
    const content = draft.content.body;

    // WICHTIG: Wenn eine HTML-Signatur ausgewählt ist, KEINE Text-Signatur erstellen
    // Die HTML-Signatur wird vom Backend geladen (via signatureId)
    const textSignature = draft.content.signatureId
      ? '' // Leer lassen wenn HTML-Signatur ausgewählt
      : '{{senderName}}\n{{senderTitle}}\n{{senderCompany}}\n{{senderPhone}}\n{{senderEmail}}'; // Fallback

    return {
      subject: draft.metadata.subject,
      greeting: 'Sehr geehrte/r {{firstName}} {{lastName}},',
      introduction: content,
      pressReleaseHtml: `<h2>${campaignTitle}</h2><p>[Pressemitteilung wird hier eingefügt]</p>`,
      closing: 'Mit freundlichen Grüßen',
      signature: textSignature
    };
  }

  /**
   * Helper: Email-Validierung
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Preview HTML aufbauen - Vereinfachte Version ohne Header
   */
  private buildPreviewHtml(email: PRCampaignEmail, variables: Record<string, string>, mediaShareUrl?: string, keyVisual?: { url: string; cropData?: any }, signatureHtml?: string): string {
    const mediaLinkHtml = mediaShareUrl ? `
        <div style="margin: 30px 0 20px 0; padding: 15px; background-color: #f0f7ff; border-left: 4px solid #005fab; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                <strong style="color: #005fab;">→ Medien-Anhänge:</strong><br>
                <a href="${mediaShareUrl}" style="color: #005fab; text-decoration: underline; font-weight: 500;">Hier können Sie die Medien-Dateien zu dieser Pressemitteilung herunterladen</a>
            </p>
        </div>` : '';

    // Verwende HTML-Signatur falls vorhanden, ansonsten die alte Text-Signatur
    const signatureContent = signatureHtml
      ? this.replaceVariables(signatureHtml, variables)
      : this.replaceVariables(email.signature, variables).replace(/\n/g, '<br>');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.replaceVariables(email.subject, variables)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }
        .content {
            max-width: 600px;
            margin: 0;
            padding-bottom: 10px;
        }
        .email-body {
            margin-bottom: 10px;
        }
        .signature {
            margin-top: 20px;
        }
        p {
            margin: 0 0 1em 0;
        }
        a {
            color: #005fab;
        }
    </style>
</head>
<body>
    <div class="content">
        <div class="email-body">
            ${this.replaceVariables(email.introduction, variables)}
        </div>

        ${mediaLinkHtml}

        <div class="signature">
            ${signatureContent}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Preview Text aufbauen - Vereinfachte Version
   */
  private buildPreviewText(email: PRCampaignEmail, variables: Record<string, string>, mediaShareUrl?: string): string {
    const mediaText = mediaShareUrl ? `\n\nMedian-Anhänge: ${mediaShareUrl}\n` : '';

    return `
${this.stripHtml(this.replaceVariables(email.introduction, variables))}
${mediaText}
${this.replaceVariables(email.signature, variables)}
`;
  }

  /**
   * Variablen in Text ersetzen
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }

  /**
   * HTML zu Text konvertieren
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  // ✅ PIPELINE-DISTRIBUTION-METHODEN HINZUGEFÜGT (Plan 4/9)
  
  /**
   * Pipeline-Distribution-Event für Analytics
   */
  async createPipelineDistributionEvent(eventData: PipelineDistributionEvent): Promise<void> {
    try {
      // Event in bestehende Analytics/Events Collection speichern
      const { addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client-init');
      
      await addDoc(collection(db, 'pipeline_events'), {
        type: 'distribution',
        ...eventData,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Failed to create pipeline distribution event:', error);
      throw error;
    }
  }

  /**
   * Pipeline-Distribution-Statistiken abrufen
   */
  async getPipelineDistributionStats(
    projectId: string,
    context: { organizationId: string }
  ): Promise<PipelineDistributionStats> {
    try {
      const { query, collection, where, onSnapshot } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client-init');
      
      const q = query(
        collection(db, 'pipeline_events'),
        where('projectId', '==', projectId),
        where('type', '==', 'distribution'),
        where('organizationId', '==', context.organizationId)
      );

      return new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const events = snapshot.docs.map(doc => doc.data());
          
          const stats: PipelineDistributionStats = {
            totalCampaigns: events.length,
            totalRecipients: events.reduce((sum, e: any) => sum + (e.recipientCount || 0), 0),
            distributionDates: events.map((e: any) => e.timestamp),
            successRate: events.length > 0 ? 
              events.reduce((sum, e: any) => sum + (e.recipientCount || 0), 0) / events.length : 0
          };
          
          unsubscribe();
          resolve(stats);
        }, (error) => {
          unsubscribe();
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to get pipeline distribution stats:', error);
      throw error;
    }
  }

  // ============================================
  // PLAN 7/9: PROJEKT-BEWUSSTE E-MAIL-VERSENDUNG
  // ============================================

  /**
   * Projekt-bewusste E-Mail-Versendung
   */
  async sendProjectEmail(emailData: {
    to: string[];
    subject: string;
    content: string;
    projectId: string;
    contextType: 'campaign' | 'approval' | 'media' | 'general';
    contextId: string;
    organizationId: string;
  }): Promise<string> {
    
    try {
      // Projekt-spezifische Reply-To-Adresse generieren
      const replyToAddress = this.generateProjectReplyTo({
        organizationId: emailData.organizationId,
        projectId: emailData.projectId,
        contextType: emailData.contextType,
        contextId: emailData.contextId
      });
      
      // Projekt-Header hinzufügen
      const headers = {
        'X-CeleroPress-Project-ID': emailData.projectId,
        'X-CeleroPress-Context-Type': emailData.contextType,
        'X-CeleroPress-Context-ID': emailData.contextId,
        'Reply-To': replyToAddress
      };
      
      // Standard E-Mail-Versendung über API Route mit erweiterten Headern
      const result = await apiClient.post<{ messageId: string }>('/api/email/send-project', {
        to: emailData.to,
        subject: emailData.subject,
        content: emailData.content,
        headers,
        replyTo: replyToAddress,
        organizationId: emailData.organizationId,
        projectId: emailData.projectId,
        contextType: emailData.contextType,
        contextId: emailData.contextId
      });
      
      return result.messageId;
      
    } catch (error) {
      console.error('Project email sending failed:', error);
      throw error;
    }
  }
  
  /**
   * Generiert projekt-spezifische Reply-To-Adresse
   */
  private generateProjectReplyTo(data: {
    organizationId: string;
    projectId: string;
    contextType: string;
    contextId: string;
  }): string {
    const domain = this.getInboxDomain(data.organizationId);
    return `pr-${data.projectId}-${data.contextType}-${data.contextId}@inbox.${domain}`;
  }
  
  /**
   * Ermittelt Inbox-Domain für Organisation
   */
  private getInboxDomain(organizationId: string): string {
    // TODO: Aus Organisation-Settings oder Default verwenden
    return 'celeropress.de';
  }
}

// ✅ PIPELINE-DISTRIBUTION-TYPES HINZUGEFÜGT (Plan 4/9)
interface PipelineDistributionEvent {
  projectId: string;
  campaignId: string;
  distributionId: string;
  recipientCount: number;
  timestamp: Timestamp;
  metadata: Record<string, any>;
  organizationId?: string; // Für Multi-Tenancy
}

// ✅ PIPELINE-DISTRIBUTION-TYPES HINZUGEFÜGT (Plan 4/9)
interface PipelineDistributionEvent {
  projectId: string;
  campaignId: string;
  distributionId: string;
  recipientCount: number;
  timestamp: Timestamp;
  metadata: Record<string, any>;
  organizationId?: string; // Für Multi-Tenancy
}

interface PipelineDistributionStats {
  totalCampaigns: number;
  totalRecipients: number;
  distributionDates: Timestamp[];
  successRate: number;
}

// Singleton instance
export const emailService = new EmailService();
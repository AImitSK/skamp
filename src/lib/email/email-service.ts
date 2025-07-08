// src/lib/email/email-service.ts - ERWEITERT
import { PRCampaignEmail } from '@/types/email';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';
import { EmailDraft, TestEmailRequest, SendTestEmailResponse } from '@/types/email-composer';
import { Timestamp } from 'firebase/firestore';

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
    mediaShareUrl?: string
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

    // API Route aufrufen
    const response = await fetch('/api/sendgrid/send-pr-campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients,
        campaignEmail: emailContent,
        senderInfo,
        mediaShareUrl
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'E-Mail-Versand fehlgeschlagen');
    }

    return await response.json();
  }

  /**
   * Test-Email versenden
   */
  async sendTestEmail(request: TestEmailRequest): Promise<SendTestEmailResponse> {
    try {
      console.log('📧 Sending test email to:', request.recipientEmail);

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

      // Generiere Vorschau
      const preview = this.generatePreview(testContact, emailContent, senderInfo);

      // Sende über API Route
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            email: request.recipientEmail,
            name: testContact.firstName + ' ' + testContact.lastName,
            firstName: testContact.firstName,
            lastName: testContact.lastName,
            companyName: testContact.companyName
          },
          campaignEmail: emailContent,
          senderInfo,
          testMode: true
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Test-Email konnte nicht gesendet werden'
        };
      }

      const result = await response.json();

      return {
        success: true,
        messageId: result.messageId,
        preview: {
          html: preview.html,
          text: preview.text,
          subject: preview.subject
        }
      };

    } catch (error) {
      console.error('❌ Error sending test email:', error);
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
   * Email-Versand planen
   */
  async scheduleEmail(request: ScheduleEmailRequest): Promise<ScheduleEmailResult> {
    try {
      console.log('📅 Scheduling email campaign for:', request.scheduledDate);

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

      // API Route aufrufen
      const response = await fetch('/api/email/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: request.campaign.id,
          emailContent: request.emailContent,
          senderInfo: request.senderInfo,
          scheduledDate: request.scheduledDate.toISOString(),
          timezone: request.timezone || 'Europe/Berlin'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          scheduledFor: request.scheduledDate,
          error: error.error || 'Planung fehlgeschlagen'
        };
      }

      const result = await response.json();

      return {
        success: true,
        jobId: result.jobId,
        scheduledFor: new Date(result.scheduledFor)
      };

    } catch (error) {
      console.error('❌ Error scheduling email:', error);
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
    contact: Contact,
    campaignEmail: PRCampaignEmail,
    senderInfo: {
      name: string;
      title: string;
      company: string;
      phone?: string;
      email?: string;
    },
    mediaShareUrl?: string
  ): EmailPreviewData {
    
    const recipient = {
      email: contact.email || 'preview@example.com',
      name: `${contact.firstName} ${contact.lastName}`,
      firstName: contact.firstName,
      lastName: contact.lastName,
      companyName: contact.companyName
    };

    // Variablen ersetzen
    const variables = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
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

    const html = this.buildPreviewHtml(campaignEmail, variables, mediaShareUrl);
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
   */
  private extractSenderInfo(draft: EmailDraft) {
    if (draft.sender.type === 'contact' && draft.sender.contactData) {
      return {
        name: draft.sender.contactData.name,
        title: draft.sender.contactData.title || '',
        company: draft.sender.contactData.company || '',
        phone: draft.sender.contactData.phone,
        email: draft.sender.contactData.email
      };
    } else if (draft.sender.type === 'manual' && draft.sender.manual) {
      return {
        name: draft.sender.manual.name,
        title: draft.sender.manual.title || '',
        company: draft.sender.manual.company || '',
        phone: draft.sender.manual.phone,
        email: draft.sender.manual.email
      };
    }

    throw new Error('Keine gültigen Absender-Informationen gefunden');
  }

  /**
   * Helper: Email-Content aus Draft erstellen
   */
  private createEmailContent(draft: EmailDraft, campaignTitle: string): PRCampaignEmail {
    // Extrahiere die verschiedenen Teile aus dem HTML-Content
    // Dies ist eine vereinfachte Version - in der Praxis würde man das HTML parsen
    const content = draft.content.body;

    return {
      subject: draft.metadata.subject,
      greeting: 'Sehr geehrte/r {{firstName}} {{lastName}},',
      introduction: content,
      pressReleaseHtml: `<h2>${campaignTitle}</h2><p>[Pressemitteilung wird hier eingefügt]</p>`,
      closing: 'Mit freundlichen Grüßen',
      signature: '{{senderName}}\n{{senderTitle}}\n{{senderCompany}}\n{{senderPhone}}\n{{senderEmail}}'
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
   * Preview HTML aufbauen
   */
  private buildPreviewHtml(email: PRCampaignEmail, variables: Record<string, string>, mediaShareUrl?: string): string {
    const mediaButtonHtml = mediaShareUrl ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${mediaShareUrl}" 
                   style="display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    📎 Medien ansehen
                </a>
            </div>` : '';

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
            background-color: #f8f9fa;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
        }
        .content { 
            padding: 30px 20px; 
        }
        .greeting { 
            font-size: 16px; 
            margin-bottom: 20px; 
        }
        .introduction { 
            margin-bottom: 25px; 
            color: #555;
        }
        .press-release { 
            background: #f8f9fa; 
            padding: 25px; 
            border-left: 4px solid #667eea; 
            margin: 25px 0; 
            border-radius: 0 8px 8px 0;
        }
        .closing { 
            margin: 25px 0; 
        }
        .signature { 
            border-top: 2px solid #e9ecef; 
            padding-top: 20px; 
            margin-top: 30px; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .footer { 
            font-size: 12px; 
            color: #6c757d; 
            text-align: center;
            padding: 20px;
            background: #f1f3f4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${variables.senderCompany}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${this.replaceVariables(email.greeting, variables)}
            </div>
            
            <div class="introduction">
                ${this.replaceVariables(email.introduction, variables)}
            </div>
            
            <div class="press-release">
                ${this.replaceVariables(email.pressReleaseHtml, variables)}
            </div>
            
            ${mediaButtonHtml}
            
            <div class="closing">
                ${this.replaceVariables(email.closing, variables)}
            </div>
            
            <div class="signature">
                ${this.replaceVariables(email.signature, variables).replace(/\n/g, '<br>')}
            </div>
        </div>
        
        <div class="footer">
            <p>Diese E-Mail wurde über das SKAMP PR-Tool versendet.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Preview Text aufbauen
   */
  private buildPreviewText(email: PRCampaignEmail, variables: Record<string, string>, mediaShareUrl?: string): string {
    const mediaText = mediaShareUrl ? `\n\n📎 Medien ansehen: ${mediaShareUrl}\n` : '';
    
    return `
${this.replaceVariables(email.greeting, variables)}

${this.replaceVariables(email.introduction, variables)}

--- PRESSEMITTEILUNG ---
${this.stripHtml(this.replaceVariables(email.pressReleaseHtml, variables))}
--- ENDE PRESSEMITTEILUNG ---
${mediaText}
${this.replaceVariables(email.closing, variables)}

${this.replaceVariables(email.signature, variables)}

---
Diese E-Mail wurde über das SKAMP PR-Tool versendet.
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
}

// Singleton instance
export const emailService = new EmailService();
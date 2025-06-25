// src/lib/email/sendgrid-service.ts
import sgMail from '@sendgrid/mail';
import { 
  EmailSendRequest, 
  EmailSendResult, 
  EmailRecipient, 
  TemplateVariables,
  PRCampaignEmail 
} from '@/types/email';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class SendGridService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
    this.fromName = process.env.SENDGRID_FROM_NAME || '';
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
  }

  /**
   * Einzelne E-Mail senden
   */
  async sendSingle(request: EmailSendRequest): Promise<EmailSendResult> {
    try {
      const msg = {
        to: request.to.map(recipient => ({
          email: recipient.email,
          name: recipient.name
        })),
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: request.subject,
        html: request.htmlContent,
        text: request.textContent || this.stripHtml(request.htmlContent),
        attachments: request.attachments?.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type,
          disposition: att.disposition,
          content_id: att.contentId
        })),
        trackingSettings: {
          clickTracking: {
            enable: request.trackingSettings?.clickTracking ?? true
          },
          openTracking: {
            enable: request.trackingSettings?.openTracking ?? true
          }
        }
      };

      const [response] = await sgMail.send(msg);
      
      return {
        messageId: response.headers['x-message-id'] || '',
        accepted: request.to.map(r => r.email),
        rejected: [],
        status: 'sent'
      };
    } catch (error: any) {
      console.error('SendGrid Error:', error);
      return {
        messageId: '',
        accepted: [],
        rejected: request.to.map(r => r.email),
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Bulk-E-Mails mit Personalisierung senden
   */
  async sendBulkPersonalized(
    recipients: EmailRecipient[],
    subject: string,
    htmlTemplate: string,
    textTemplate?: string
  ): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];
    
    // SendGrid empfiehlt max 1000 E-Mails pro Batch
    const batchSize = 1000;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      try {
        const personalizations = batch.map(recipient => ({
          to: [{ email: recipient.email, name: recipient.name }],
          subject: this.replaceVariables(subject, recipient.substitutions || {}),
          substitutions: recipient.substitutions || {}
        }));

        const msg = {
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          html: htmlTemplate,
          text: textTemplate || this.stripHtml(htmlTemplate),
          personalizations,
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true }
          }
        };

        const [response] = await sgMail.send(msg);
        
        results.push({
          messageId: response.headers['x-message-id'] || '',
          accepted: batch.map(r => r.email),
          rejected: [],
          status: 'sent'
        });
      } catch (error: any) {
        console.error('SendGrid Bulk Error:', error);
        results.push({
          messageId: '',
          accepted: [],
          rejected: batch.map(r => r.email),
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * PR-Kampagne E-Mail senden
   */
  async sendPRCampaign(
    recipients: EmailRecipient[],
    campaignEmail: PRCampaignEmail,
    variables: TemplateVariables
  ): Promise<EmailSendResult[]> {
    // E-Mail-Template zusammensetzen
    const htmlContent = this.buildPREmailHtml(campaignEmail, variables);
    const textContent = this.buildPREmailText(campaignEmail, variables);
    
    return this.sendBulkPersonalized(
      recipients,
      campaignEmail.subject,
      htmlContent,
      textContent
    );
  }

  /**
   * E-Mail-Preview generieren (ohne Versand)
   */
  generatePreview(
    recipient: EmailRecipient,
    campaignEmail: PRCampaignEmail,
    variables: TemplateVariables
  ): { html: string; text: string; subject: string } {
    const personalizedVariables = {
      ...variables,
      firstName: recipient.substitutions?.firstName || variables.firstName,
      lastName: recipient.substitutions?.lastName || variables.lastName,
      fullName: recipient.substitutions?.fullName || variables.fullName,
      companyName: recipient.substitutions?.companyName || variables.companyName
    };

    return {
      html: this.buildPREmailHtml(campaignEmail, personalizedVariables),
      text: this.buildPREmailText(campaignEmail, personalizedVariables),
      subject: this.replaceVariables(campaignEmail.subject, personalizedVariables)
    };
  }

  /**
   * HTML E-Mail für PR-Kampagne zusammenbauen
   */
  buildPREmailHtml(email: PRCampaignEmail, variables: TemplateVariables): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.replaceVariables(email.subject, variables)}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 20px; }
        .content { margin-bottom: 30px; }
        .press-release { background: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; }
        .signature { border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; }
        .footer { font-size: 12px; color: #6c757d; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #007bff; margin: 0;">${variables.senderCompany}</h1>
        </div>
        
        <div class="content">
            <p>${this.replaceVariables(email.greeting, variables)}</p>
            
            <div>${this.replaceVariables(email.introduction, variables)}</div>
            
            <div class="press-release">
                ${this.replaceVariables(email.pressReleaseHtml, variables)}
            </div>
            
            <div>${this.replaceVariables(email.closing, variables)}</div>
        </div>
        
        <div class="signature">
            ${this.replaceVariables(email.signature, variables)}
        </div>
        
        <div class="footer">
            <p>Diese E-Mail wurde über das SKAMP PR-Tool versendet.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Text-Version der E-Mail
   */
  buildPREmailText(email: PRCampaignEmail, variables: TemplateVariables): string {
    return `
${this.replaceVariables(email.greeting, variables)}

${this.replaceVariables(email.introduction, variables)}

--- PRESSEMITTEILUNG ---
${this.stripHtml(this.replaceVariables(email.pressReleaseHtml, variables))}
--- ENDE PRESSEMITTEILUNG ---

${this.replaceVariables(email.closing, variables)}

${this.stripHtml(this.replaceVariables(email.signature, variables))}

---
Diese E-Mail wurde über das SKAMP PR-Tool versendet.
`;
  }

  /**
   * Variablen in Text ersetzen
   */
  replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });
    
    return result;
  }

  /**
   * HTML zu Text konvertieren (vereinfacht)
   */
  stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * SendGrid Webhook für Status-Updates verarbeiten
   */
  async processWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      try {
        // TODO: Status in der Datenbank aktualisieren
        console.log('SendGrid Event:', event);
        
        // Beispiel Event-Typen:
        // - delivered: E-Mail zugestellt
        // - open: E-Mail geöffnet
        // - click: Link geklickt
        // - bounce: E-Mail nicht zustellbar
        // - dropped: E-Mail von SendGrid blockiert
        
      } catch (error) {
        console.error('Webhook processing error:', error);
      }
    }
  }
}

// Singleton instance
export const sendGridService = new SendGridService();
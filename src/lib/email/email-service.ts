// src/lib/email/email-service.ts (ersetzt sendgrid-service.ts)
import { PRCampaignEmail } from '@/types/email';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';

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
    mediaShareUrl?: string // NEU: Optional media share URL
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
        mediaShareUrl // NEU: Share-Link übergeben
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'E-Mail-Versand fehlgeschlagen');
    }

    return await response.json();
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
    mediaShareUrl?: string // NEU: Optional media share URL
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
      mediaShareUrl: mediaShareUrl || '' // NEU: Share-Link als Variable
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
   * Preview HTML aufbauen
   */
  private buildPreviewHtml(email: PRCampaignEmail, variables: Record<string, string>, mediaShareUrl?: string): string {
    // NEU: Media Button HTML
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
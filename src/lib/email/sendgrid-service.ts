// src/lib/email/sendgrid-service.ts - SendGrid E-Mail Service für PR-Kampagnen
import { Contact } from '@/types/crm';
import { PRCampaign } from '@/types/pr';

export interface SendCampaignEmailsInput {
  campaignId: string;
  campaign: PRCampaign;
  recipients: Contact[];
  subject: string;
  content: {
    html: string;
    text?: string;
  };
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export interface SendCampaignEmailsResult {
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

export interface EmailValidationResult {
  valid: boolean;
  emails: Array<{
    email: string;
    valid: boolean;
    reason?: string;
  }>;
}

export const sendgridService = {
  /**
   * Sendet eine PR-Kampagne an eine Liste von Empfängern
   */
  async sendCampaignEmails(
    input: SendCampaignEmailsInput
  ): Promise<SendCampaignEmailsResult> {
    try {
      console.log('📧 Sending campaign emails via SendGrid:', {
        campaignId: input.campaignId,
        recipientCount: input.recipients.length
      });
      
      const response = await fetch('/api/sendgrid/send-pr-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Campaign emails sent successfully:', result.summary);
      
      return result;
    } catch (error) {
      console.error('❌ Error sending campaign emails:', error);
      throw error;
    }
  },

  /**
   * Validiert eine Liste von E-Mail-Adressen
   */
  async validateEmailList(emails: string[]): Promise<EmailValidationResult> {
    try {
      console.log('🔍 Validating email list:', emails.length, 'addresses');
      
      // Einfache Validierung - kann erweitert werden
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const results = emails.map(email => ({
        email,
        valid: emailRegex.test(email),
        reason: emailRegex.test(email) ? undefined : 'Invalid email format'
      }));

      const validCount = results.filter(r => r.valid).length;
      
      return {
        valid: validCount === emails.length,
        emails: results
      };
    } catch (error) {
      console.error('❌ Error validating email list:', error);
      throw error;
    }
  },

  /**
   * Testet die SendGrid-Verbindung
   */
  async testConnection(): Promise<boolean> {
    try {
      // Hier könnte ein echter SendGrid API Test stehen
      return true;
    } catch (error) {
      console.error('SendGrid connection test failed:', error);
      return false;
    }
  }
};
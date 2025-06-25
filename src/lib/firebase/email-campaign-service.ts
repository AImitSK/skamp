// src/lib/firebase/email-campaign-service.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './client-init';
import { listsService } from './lists-service';
import { contactsService } from './crm-service';
import { sendGridService } from '../email/sendgrid-service';
import { 
  EmailCampaignSend, 
  EmailRecipient, 
  PRCampaignEmail, 
  TemplateVariables 
} from '@/types/email';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';

export const emailCampaignService = {

  /**
   * PR-Kampagne per E-Mail versenden
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
    }
  ): Promise<{ success: number; failed: number; messageIds: string[] }> {
    
    console.log('🚀 Starting PR campaign send:', campaign.title);
    
    try {
      // 1. Kontakte aus der Liste laden
      const contacts = await listsService.getContacts({
        id: campaign.distributionListId,
        type: 'dynamic', // wird überschrieben durch echte Liste
        userId: campaign.userId
      } as any);
      
      console.log('📋 Found', contacts.length, 'contacts in distribution list');
      
      if (contacts.length === 0) {
        throw new Error('Keine Kontakte in der Verteilerliste gefunden');
      }

      // 2. Kontakte zu E-Mail-Empfängern konvertieren
      const recipients: EmailRecipient[] = contacts
        .filter(contact => contact.email) // Nur Kontakte mit E-Mail
        .map(contact => ({
          email: contact.email!,
          name: `${contact.firstName} ${contact.lastName}`,
          substitutions: this.createSubstitutions(contact, campaign, senderInfo)
        }));

      console.log('✉️ Prepared', recipients.length, 'email recipients');

      if (recipients.length === 0) {
        throw new Error('Keine Kontakte mit E-Mail-Adressen gefunden');
      }

      // 3. Template-Variablen vorbereiten
      const baseVariables: TemplateVariables = {
        firstName: '', // wird pro Empfänger ersetzt
        lastName: '',
        fullName: '',
        companyName: '',
        pressReleaseTitle: campaign.title,
        campaignTitle: campaign.title,
        senderName: senderInfo.name,
        senderTitle: senderInfo.title,
        senderCompany: senderInfo.company,
        senderPhone: senderInfo.phone,
        senderEmail: senderInfo.email,
        currentDate: new Date().toLocaleDateString('de-DE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      };

      // 4. E-Mails über SendGrid versenden
      console.log('📤 Sending emails via SendGrid...');
      const sendResults = await sendGridService.sendPRCampaign(
        recipients,
        emailContent,
        baseVariables
      );

      // 5. Versand-Status in Datenbank speichern
      await this.saveSendResults(campaign.id!, recipients, sendResults);

      // 6. Kampagnen-Status aktualisieren
      const totalSent = sendResults.reduce((sum, result) => sum + result.accepted.length, 0);
      const totalFailed = sendResults.reduce((sum, result) => sum + result.rejected.length, 0);

      if (totalSent > 0) {
        // Kampagne als "sent" markieren
        await updateDoc(doc(db, 'pr_campaigns', campaign.id!), {
          status: 'sent',
          sentAt: serverTimestamp(),
          actualRecipientCount: totalSent,
          updatedAt: serverTimestamp()
        });
      }

      console.log('✅ Campaign send completed:', { totalSent, totalFailed });

      return {
        success: totalSent,
        failed: totalFailed,
        messageIds: sendResults.map(r => r.messageId).filter(Boolean)
      };

    } catch (error) {
      console.error('❌ Error sending PR campaign:', error);
      
      // Kampagne als failed markieren
      await updateDoc(doc(db, 'pr_campaigns', campaign.id!), {
        status: 'draft', // Zurück zu Draft für erneuten Versuch
        lastSendError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: serverTimestamp()
      });
      
      throw error;
    }
  },

  /**
   * E-Mail-Preview für eine Kampagne generieren
   */
  async generateCampaignPreview(
    campaign: PRCampaign,
    emailContent: PRCampaignEmail,
    senderInfo: {
      name: string;
      title: string;
      company: string;
      phone?: string;
      email?: string;
    },
    previewContactEmail?: string
  ): Promise<{ html: string; text: string; subject: string; recipient: EmailRecipient }> {
    
    // Kontakte laden
    const contacts = await listsService.getContacts({
      id: campaign.distributionListId,
      type: 'dynamic',
      userId: campaign.userId
    } as any);

    // Vorschau-Kontakt auswählen
    let previewContact: Contact;
    if (previewContactEmail) {
      previewContact = contacts.find(c => c.email === previewContactEmail) || contacts[0];
    } else {
      previewContact = contacts[0];
    }

    if (!previewContact) {
      throw new Error('Keine Kontakte für Vorschau verfügbar');
    }

    // Empfänger-Objekt erstellen
    const recipient: EmailRecipient = {
      email: previewContact.email || 'preview@example.com',
      name: `${previewContact.firstName} ${previewContact.lastName}`,
      substitutions: this.createSubstitutions(previewContact, campaign, senderInfo)
    };

    // Template-Variablen
    const variables: TemplateVariables = {
      firstName: previewContact.firstName,
      lastName: previewContact.lastName,
      fullName: `${previewContact.firstName} ${previewContact.lastName}`,
      companyName: previewContact.companyName || '',
      pressReleaseTitle: campaign.title,
      campaignTitle: campaign.title,
      senderName: senderInfo.name,
      senderTitle: senderInfo.title,
      senderCompany: senderInfo.company,
      senderPhone: senderInfo.phone,
      senderEmail: senderInfo.email,
      currentDate: new Date().toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    };

    // Preview generieren
    const preview = sendGridService.generatePreview(recipient, emailContent, variables);

    return {
      ...preview,
      recipient
    };
  },

  /**
   * Substitutions für einen Kontakt erstellen
   */
  createSubstitutions(
    contact: Contact,
    campaign: PRCampaign,
    senderInfo: any
  ): Record<string, string> {
    return {
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
      companyName: contact.companyName || '',
      outlet: contact.companyName || '',
      title: contact.position || '',
      pressReleaseTitle: campaign.title,
      campaignTitle: campaign.title,
      senderName: senderInfo.name,
      senderTitle: senderInfo.title,
      senderCompany: senderInfo.company,
      currentDate: new Date().toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    };
  },

  /**
   * Versand-Ergebnisse in der Datenbank speichern
   */
  async saveSendResults(
    campaignId: string,
    recipients: EmailRecipient[],
    sendResults: any[]
  ): Promise<void> {
    const batch = writeBatch(db);
    
    let recipientIndex = 0;
    
    for (const result of sendResults) {
      // Erfolgreiche Sends
      for (const acceptedEmail of result.accepted) {
        const recipient = recipients.find(r => r.email === acceptedEmail);
        if (recipient) {
          const sendDoc = doc(collection(db, 'email_campaign_sends'));
          const sendData: Omit<EmailCampaignSend, 'id'> = {
            campaignId,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            messageId: result.messageId,
            status: 'sent',
            sentAt: serverTimestamp(),
            userId: '', // wird vom Campaign-Kontext gesetzt
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          batch.set(sendDoc, sendData);
        }
      }
      
      // Fehlgeschlagene Sends
      for (const rejectedEmail of result.rejected) {
        const recipient = recipients.find(r => r.email === rejectedEmail);
        if (recipient) {
          const sendDoc = doc(collection(db, 'email_campaign_sends'));
          const sendData: Omit<EmailCampaignSend, 'id'> = {
            campaignId,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            status: 'failed',
            errorMessage: result.error || 'Send failed',
            userId: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          batch.set(sendDoc, sendData);
        }
      }
    }
    
    await batch.commit();
  },

  /**
   * Kampagnen-Versand-Statistiken laden
   */
  async getCampaignSendStats(campaignId: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  }> {
    const q = query(
      collection(db, 'email_campaign_sends'),
      where('campaignId', '==', campaignId)
    );
    
    const snapshot = await getDocs(q);
    const sends = snapshot.docs.map(doc => doc.data() as EmailCampaignSend);
    
    return {
      total: sends.length,
      sent: sends.filter(s => s.status === 'sent').length,
      delivered: sends.filter(s => s.status === 'delivered').length,
      opened: sends.filter(s => s.status === 'opened').length,
      clicked: sends.filter(s => s.status === 'clicked').length,
      failed: sends.filter(s => s.status === 'failed').length
    };
  }
};
// src/lib/firebase/email-campaign-service.ts (VOLLSTÄNDIG KORRIGIERT)
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
import { emailService } from '../email/email-service';
import { 
  EmailCampaignSend, 
  PRCampaignEmail
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
      // 1. Vollständige Liste laden
      const distributionList = await listsService.getById(campaign.distributionListId);
      
      if (!distributionList) {
        throw new Error('Verteilerliste nicht gefunden');
      }
      
      // 2. Kontakte aus der Liste laden
      const contacts = await listsService.getContacts(distributionList);
      
      console.log('📋 Found', contacts.length, 'contacts in distribution list');
      
      if (contacts.length === 0) {
        throw new Error('Keine Kontakte in der Verteilerliste gefunden');
      }

      // 3. Nur Kontakte mit E-Mail-Adressen
      const contactsWithEmail = contacts.filter(contact => contact.email);
      
      if (contactsWithEmail.length === 0) {
        throw new Error('Keine Kontakte mit E-Mail-Adressen gefunden');
      }

      console.log('✉️ Prepared', contactsWithEmail.length, 'email recipients');

      // 4. E-Mails über Email Service (API Route) versenden
      console.log('📤 Sending emails via API...');
      const sendResult = await emailService.sendPRCampaign(
        campaign,
        emailContent,
        senderInfo,
        contactsWithEmail
      );

      // 5. Versand-Status in Datenbank speichern
      await this.saveSendResults(campaign.id!, contactsWithEmail, sendResult, campaign.userId);

      // 6. Kampagnen-Status aktualisieren
      if (sendResult.summary.success > 0) {
        await updateDoc(doc(db, 'pr_campaigns', campaign.id!), {
          status: 'sent',
          sentAt: serverTimestamp(),
          actualRecipientCount: sendResult.summary.success,
          updatedAt: serverTimestamp()
        });
      }

      console.log('✅ Campaign send completed:', sendResult.summary);

      return {
        success: sendResult.summary.success,
        failed: sendResult.summary.failed,
        messageIds: sendResult.results.map(r => r.messageId).filter(Boolean) as string[]
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
  ): Promise<{ html: string; text: string; subject: string; recipient: any }> {
    
    console.log('🔍 Generating preview for campaign:', campaign.title);
    console.log('📋 Distribution list ID:', campaign.distributionListId);
    
    try {
      // 1. Vollständige Liste laden
      const distributionList = await listsService.getById(campaign.distributionListId);
      
      if (!distributionList) {
        throw new Error(`Verteilerliste mit ID ${campaign.distributionListId} nicht gefunden`);
      }
      
      console.log('📋 Found list:', distributionList.name, 'Type:', distributionList.type);

      // 2. Kontakte aus der Liste laden
      const contacts = await listsService.getContacts(distributionList);
      
      console.log('👥 Found', contacts.length, 'contacts in list');
      
      if (contacts.length === 0) {
        throw new Error('Die Verteilerliste enthält keine Kontakte');
      }

      // 3. Vorschau-Kontakt auswählen
      let previewContact: Contact;
      if (previewContactEmail) {
        previewContact = contacts.find(c => c.email === previewContactEmail) || contacts[0];
      } else {
        previewContact = contacts[0];
      }

      if (!previewContact) {
        throw new Error('Keine Kontakte für Vorschau verfügbar');
      }
      
      console.log('👤 Using preview contact:', previewContact.firstName, previewContact.lastName);

      // 4. Preview über Email Service generieren
      const preview = emailService.generatePreview(previewContact, emailContent, senderInfo);
      
      console.log('✅ Preview generated successfully');
      
      return preview;
      
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      throw error;
    }
  },

  /**
   * Versand-Ergebnisse in der Datenbank speichern (KORRIGIERT)
   */
  async saveSendResults(
    campaignId: string,
    contacts: Contact[],
    sendResult: any,
    userId: string
  ): Promise<void> {
    const batch = writeBatch(db);
    
    // Mapping zwischen E-Mail und Kontakt erstellen
    const contactMap = new Map(contacts.map(c => [c.email, c]));
    
    for (const result of sendResult.results) {
      const contact = contactMap.get(result.email);
      if (contact) {
        const sendDoc = doc(collection(db, 'email_campaign_sends'));
        
        // KORRIGIERT: Nur definierte Werte hinzufügen, undefined vermeiden
        const sendData: any = {
          campaignId,
          recipientEmail: result.email,
          recipientName: `${contact.firstName} ${contact.lastName}`,
          status: result.status === 'sent' ? 'sent' : 'failed',
          userId: userId, // Aus Campaign-Kontext
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Nur hinzufügen wenn definiert
        if (result.messageId) {
          sendData.messageId = result.messageId;
        }

        if (result.status === 'sent') {
          sendData.sentAt = serverTimestamp();
        }

        if (result.error) {
          sendData.errorMessage = result.error;
        }

        batch.set(sendDoc, sendData);
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
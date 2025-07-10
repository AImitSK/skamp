// src/lib/firebase/email-campaign-service.ts
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './client-init';
import { listsService } from './lists-service';
import { emailService } from '../email/email-service';
import { mediaService } from './media-service';
import { 
  EmailCampaignSend, 
  PRCampaignEmail
} from '@/types/email';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';

// Helper function to get the base URL with fallback
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.NEXT_PUBLIC_BASE_URL || 
         (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
};

export const emailCampaignService = {

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
    
    try {
      // 1. Kontakte aus der Verteilerliste laden - KORRIGIERT: getContacts verwenden
      const contacts = await this.getCampaignContacts(campaign);
      
      if (contacts.length === 0) {
        throw new Error('Die Verteilerliste enthält keine Kontakte');
      }

      // 2. Vorschau-Kontakt auswählen
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

      // 3. Preview über Email Service generieren
      const preview = emailService.generatePreview(previewContact, emailContent, senderInfo);
      
      console.log('✅ Preview generated successfully');
      
      return preview;
      
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      throw error;
    }
  },

  /**
   * PR-Kampagne per E-Mail versenden - ERWEITERT für manuelle Empfänger
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
    manualRecipients?: Array<{ // NEU: Optional manuelle Empfänger
      firstName: string;
      lastName: string;
      email: string;
      companyName?: string;
    }>
  ): Promise<{ success: number; failed: number; messageIds: string[] }> {
    
    console.log('🚀 Starting PR campaign send:', campaign.title);
    
    try {
      // 1. Kontakte aus der Verteilerliste(n) laden
      const contacts = await this.getCampaignContacts(campaign);
      
      console.log('📋 Found', contacts.length, 'contacts in distribution list(s)');
      
      // NEU: Manuelle Empfänger zu Kontakten konvertieren und hinzufügen
      if (manualRecipients && manualRecipients.length > 0) {
        console.log('➕ Adding', manualRecipients.length, 'manual recipients');
        
        const manualContacts: Contact[] = manualRecipients.map((recipient, index) => ({
          id: `manual-${Date.now()}-${index}`,
          userId: campaign.userId,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          email: recipient.email,
          companyName: recipient.companyName,
          companyId: '',
          createdAt: new Date() as any,
          updatedAt: new Date() as any
        }));
        
        // Füge manuelle Kontakte zur Liste hinzu
        contacts.push(...manualContacts);
        console.log('📊 Total contacts after adding manual:', contacts.length);
      }
      
      if (contacts.length === 0) {
        throw new Error('Keine Kontakte in der Verteilerliste gefunden');
      }

      // 2. Nur Kontakte mit E-Mail-Adressen
      const contactsWithEmail = contacts.filter(contact => contact.email);
      
      if (contactsWithEmail.length === 0) {
        throw new Error('Keine Kontakte mit E-Mail-Adressen gefunden');
      }

      console.log('✉️ Prepared', contactsWithEmail.length, 'email recipients (including manual)');

      // 3. Media Share Link erstellen falls Medien angehängt sind
      let mediaShareUrl: string | undefined;
      
      if (campaign.attachedAssets && campaign.attachedAssets.length > 0) {
        console.log('📎 Creating media share link for', campaign.attachedAssets.length, 'assets');
        
        try {
          // Sammle alle Asset-IDs
          const assetIds = campaign.attachedAssets
            .filter(a => a.type === 'asset' && a.assetId)
            .map(a => a.assetId!);
          
          const folderIds = campaign.attachedAssets
            .filter(a => a.type === 'folder' && a.folderId)
            .map(a => a.folderId!);

          // Erstelle Share-Link mit mediaService
          const shareLink = await mediaService.createShareLink({
            targetId: campaign.id!, // Verwende Campaign ID als Target
            type: 'campaign', // Neuer Typ für Kampagnen-Medien
            title: `Medien zu: ${campaign.title}`,
            description: `Pressematerial und Medien zur Kampagne "${campaign.title}"`,
            settings: {
              expiresAt: null,
              downloadAllowed: true,
              passwordRequired: null,
              watermarkEnabled: false
            },
            assetIds, // Die gesammelten Asset-IDs
            folderIds, // Die gesammelten Folder-IDs
            userId: campaign.userId
          });

          // KORRIGIERT: Verwende getBaseUrl() mit Fallback
          const baseUrl = getBaseUrl();
          mediaShareUrl = `${baseUrl}/share/${shareLink.shareId}`;
          console.log('✅ Media share link created:', mediaShareUrl);
          
        } catch (error) {
          console.error('⚠️ Could not create media share link:', error);
          // Fortsetzung ohne Media-Link
        }
      }

      // 4. E-Mails über Email Service (API Route) versenden
      console.log('📤 Sending emails via API...');
      const sendResult = await emailService.sendPRCampaign(
        campaign,
        emailContent,
        senderInfo,
        contactsWithEmail,
        mediaShareUrl // Pass the share URL
      );

      // 5. Versand-Status in Datenbank speichern
      await this.saveSendResults(campaign.id!, contactsWithEmail, sendResult, campaign.userId);

      // 6. Kampagnen-Status aktualisieren
      if (sendResult.summary.success > 0) {
        const updateData: any = {
          status: 'sent',
          sentAt: serverTimestamp(),
          actualRecipientCount: sendResult.summary.success,
          updatedAt: serverTimestamp()
        };
        
        // Speichere die Share-URL falls erstellt
        if (mediaShareUrl) {
          updateData.assetShareUrl = mediaShareUrl;
        }
        
        await updateDoc(doc(db, 'pr_campaigns', campaign.id!), updateData);
      }

      console.log('✅ Campaign send completed:', sendResult.summary);

      return {
        success: sendResult.summary.success,
        failed: sendResult.summary.failed,
        messageIds: sendResult.results
          .filter(r => r.messageId)
          .map(r => r.messageId!)
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
   * Hilfsfunktion: Kontakte aus den Verteilerlisten einer Kampagne laden
   */
  async getCampaignContacts(campaign: PRCampaign): Promise<Contact[]> {
    console.log('📋 Loading contacts for campaign:', campaign.title);
    
    try {
      const allContacts: Contact[] = [];
      const contactIds = new Set<string>(); // Für Deduplizierung
      
      // Multi-List Support: Lade Kontakte aus allen Listen
      const listIds = campaign.distributionListIds || [campaign.distributionListId];
      
      for (const listId of listIds) {
        console.log('📋 Loading list:', listId);
        
        // Lade die Verteilerliste
        const list = await listsService.getById(listId);
        
        if (!list) {
          console.warn('⚠️ List not found:', listId);
          continue;
        }
        
        // KORRIGIERT: Verwende getContacts statt getListContacts
        const contacts = await listsService.getContacts(list);
        console.log('👥 Found', contacts.length, 'contacts in list:', list.name);
        
        // Füge nur neue Kontakte hinzu (Deduplizierung)
        for (const contact of contacts) {
          if (!contactIds.has(contact.id!)) {
            contactIds.add(contact.id!);
            allContacts.push(contact);
          }
        }
      }
      
      console.log('📊 Total unique contacts:', allContacts.length);
      return allContacts;
      
    } catch (error) {
      console.error('❌ Error loading campaign contacts:', error);
      throw error;
    }
  },

  /**
   * Versand-Ergebnisse in der Datenbank speichern
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
        
        // KORRIGIERT: Verwende campaignId statt campaignTitle
        const sendData: Omit<EmailCampaignSend, 'id'> = {
          campaignId, // KORRIGIERT
          recipientEmail: result.email,
          recipientName: `${contact.firstName} ${contact.lastName}`,
          status: result.status === 'sent' ? 'sent' : 'failed',
          userId: userId,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any
        };

        // Nur hinzufügen wenn definiert
        if (result.messageId) {
          sendData.messageId = result.messageId;
        }

        if (result.status === 'sent') {
          sendData.sentAt = serverTimestamp() as any;
        }

        if (result.error) {
          sendData.errorMessage = result.error;
        }

        batch.set(sendDoc, sendData);
      }
    }
    
    await batch.commit();
  }
};
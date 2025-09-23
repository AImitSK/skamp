// src/lib/firebase/email-campaign-service.ts - UPDATED FOR ENHANCED CONTACTS & MULTI-TENANCY
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  getDocs,
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
import { ContactEnhanced } from '@/types/crm-enhanced';
import { notificationsService } from './notifications-service';

// Helper function to get the base URL with fallback
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.NEXT_PUBLIC_BASE_URL || 
         (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
};

// Helper function to get primary email from ContactEnhanced
const getPrimaryEmail = (contact: ContactEnhanced): string | undefined => {
  if (!contact.emails || contact.emails.length === 0) return undefined;
  const primary = contact.emails.find(e => e.isPrimary);
  return primary?.email || contact.emails[0].email;
};

// Helper function to get display name from ContactEnhanced
const getContactDisplayName = (contact: ContactEnhanced): string => {
  return contact.displayName || `${contact.name.firstName} ${contact.name.lastName}`;
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
      // 1. Kontakte aus der Verteilerliste laden
      const contacts = await this.getCampaignContacts(campaign);
      
      if (contacts.length === 0) {
        throw new Error('Die Verteilerliste enthält keine Kontakte');
      }

      // 2. Vorschau-Kontakt auswählen
      let previewContact: ContactEnhanced;
      if (previewContactEmail) {
        previewContact = contacts.find(c => getPrimaryEmail(c) === previewContactEmail) || contacts[0];
      } else {
        previewContact = contacts[0];
      }

      if (!previewContact) {
        throw new Error('Keine Kontakte für Vorschau verfügbar');
      }
      
      console.log('👤 Using preview contact:', getContactDisplayName(previewContact));

      // 3. Preview über Email Service generieren - ANPASSUNG NÖTIG im emailService
      // Für jetzt erstellen wir ein kompatibles Objekt
      const contactForPreview = {
        firstName: previewContact.name.firstName,
        lastName: previewContact.name.lastName,
        email: getPrimaryEmail(previewContact),
        companyName: previewContact.companyName
      };

      const preview = emailService.generatePreview(contactForPreview as any, emailContent, senderInfo, undefined, campaign.keyVisual);
      
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
      
      // NEU: Manuelle Empfänger zu ContactEnhanced konvertieren und hinzufügen
      if (manualRecipients && manualRecipients.length > 0) {
        console.log('➕ Adding', manualRecipients.length, 'manual recipients');
        
        const manualContacts: ContactEnhanced[] = manualRecipients.map((recipient, index) => ({
          id: `manual-${Date.now()}-${index}`,
          organizationId: campaign.organizationId || campaign.userId, // Use organizationId if available
          createdBy: campaign.userId,
          name: {
            firstName: recipient.firstName,
            lastName: recipient.lastName
          },
          displayName: `${recipient.firstName} ${recipient.lastName}`,
          emails: [{
            type: 'business',
            email: recipient.email,
            isPrimary: true
          }],
          companyName: recipient.companyName,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any
        }));
        
        // Füge manuelle Kontakte zur Liste hinzu
        contacts.push(...manualContacts);
        console.log('📊 Total contacts after adding manual:', contacts.length);
      }
      
      if (contacts.length === 0) {
        throw new Error('Keine Kontakte in der Verteilerliste gefunden');
      }

      // 2. Nur Kontakte mit E-Mail-Adressen
      const contactsWithEmail = contacts.filter(contact => getPrimaryEmail(contact));
      
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

          // Erstelle Share-Link mit mediaService - FIXED für Multi-Tenancy
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
            organizationId: campaign.organizationId || campaign.userId, // FIXED: Use organizationId
            createdBy: campaign.userId // FIXED: Add createdBy
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
      // Konvertiere ContactEnhanced zu kompatiblem Format für emailService
      const contactsForEmail = contactsWithEmail.map(contact => ({
        id: contact.id,
        firstName: contact.name.firstName,
        lastName: contact.name.lastName,
        email: getPrimaryEmail(contact)!,
        companyName: contact.companyName,
        position: contact.position
      }));

      console.log('📤 Sending emails via API...');
      const sendResult = await emailService.sendPRCampaign(
        campaign,
        emailContent,
        senderInfo,
        contactsForEmail as any, // Temporärer Cast bis emailService auch updated ist
        mediaShareUrl, // Pass the share URL
        campaign.keyVisual // Pass the key visual
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
      
      // Benachrichtigung über fehlgeschlagenen Versand
      try {
        await notificationsService.create({
          userId: campaign.userId,
          type: 'EMAIL_BOUNCED', // Verwende EMAIL_BOUNCED als nächstbeste Option
          title: 'Kampagnen-Versand fehlgeschlagen',
          message: `Der Versand der Kampagne "${campaign.title}" ist fehlgeschlagen. Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
          linkUrl: `/dashboard/pr-kampagnen/${campaign.id}`,
          linkType: 'campaign',
          linkId: campaign.id!,
          isRead: false,
          metadata: {
            campaignId: campaign.id!,
            campaignTitle: campaign.title,
            bouncedEmail: 'Systemfehler beim Versand'
          }
        });
        console.log('📬 Benachrichtigung gesendet: Kampagnen-Versand fehlgeschlagen');
      } catch (notificationError) {
        console.error('Fehler beim Senden der Fehler-Benachrichtigung:', notificationError);
      }
      
      throw error;
    }
  },

  /**
   * Hilfsfunktion: Kontakte aus den Verteilerlisten einer Kampagne laden
   */
  async getCampaignContacts(campaign: PRCampaign): Promise<ContactEnhanced[]> {
    console.log('📋 Loading contacts for campaign:', campaign.title);

    try {
      const allContacts: ContactEnhanced[] = [];
      const contactIds = new Set<string>(); // Für Deduplizierung

      // Multi-List Support: Lade Kontakte aus allen Listen
      const listIds = campaign.distributionListIds ||
                     (campaign.distributionListId ? [campaign.distributionListId] : []);

      // Wenn keine Listen vorhanden sind, gebe leeres Array zurück
      if (listIds.length === 0 || (listIds.length === 1 && !listIds[0])) {
        console.log('📋 No distribution lists found, returning empty array');
        return [];
      }

      for (const listId of listIds) {
        if (!listId) continue; // Skip empty/undefined list IDs
        console.log('📋 Loading list:', listId);
        
        // Lade die Verteilerliste
        const list = await listsService.getById(listId);
        
        if (!list) {
          console.warn('⚠️ List not found:', listId);
          continue;
        }
        
        // Verwende getContacts - gibt jetzt ContactEnhanced[] zurück
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
    contacts: ContactEnhanced[],
    sendResult: any,
    userId: string
  ): Promise<void> {
    const batch = writeBatch(db);
    
    // Mapping zwischen E-Mail und Kontakt erstellen
    const contactMap = new Map<string, ContactEnhanced>();
    for (const contact of contacts) {
      const email = getPrimaryEmail(contact);
      if (email) {
        contactMap.set(email, contact);
      }
    }
    
    for (const result of sendResult.results) {
      const contact = contactMap.get(result.email);
      if (contact) {
        const sendDoc = doc(collection(db, 'email_campaign_sends'));
        
        const sendData: Omit<EmailCampaignSend, 'id'> = {
          campaignId,
          recipientEmail: result.email,
          recipientName: getContactDisplayName(contact!),
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
  },

  /**
   * Versand-Daten für eine Kampagne abrufen
   */
  async getSends(
    campaignId: string,
    options?: { organizationId?: string }
  ): Promise<EmailCampaignSend[]> {
    try {
      console.log('📊 getSends called with campaignId:', campaignId);

      const sendsRef = collection(db, 'email_campaign_sends');
      const q = query(sendsRef, where('campaignId', '==', campaignId));

      const snapshot = await getDocs(q);

      console.log('📊 Found', snapshot.docs.length, 'sends for campaign:', campaignId);

      const sends = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmailCampaignSend));

      console.log('📊 Sends data:', sends);

      return sends;
    } catch (error) {
      console.error('Error fetching campaign sends:', error);
      return [];
    }
  }
};
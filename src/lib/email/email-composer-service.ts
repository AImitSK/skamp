// src/lib/firebase/email-composer-service.ts - UPDATED WITH MULTI-TENANCY
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/client-init';
import { 
  EmailDraft, 
  EmailVariables,
  SaveDraftResponse 
} from '@/types/email-composer';
import { emailLogger } from '@/utils/emailLogger';
import { EmailErrorHandler, EMAIL_ERROR_CODES } from '@/utils/emailErrorHandler';
import { EMAIL_TIMING } from '@/constants/email';
import { PRCampaignEmail } from '@/types/email';
import { PRCampaign } from '@/types/pr';

export interface EmailDraftDocument {
  id?: string;
  campaignId: string;
  userId: string;
  organizationId: string; // NEU: Für Multi-Tenancy
  content: EmailDraft;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSaved: Timestamp;
}

export const emailComposerService = {
  /**
   * Draft in Firestore speichern
   */
  async saveDraft(
    campaignId: string, 
    draft: EmailDraft,
    userId: string,
    organizationId?: string // Optional für Backwards Compatibility
  ): Promise<SaveDraftResponse> {
    try {
      emailLogger.debug('Saving email draft for campaign', { campaignId });

      // Prüfe ob bereits ein Draft existiert
      const existingDraft = await this.loadDraft(campaignId);
      
      const draftId = existingDraft?.id || doc(collection(db, 'email_drafts')).id;
      const version = existingDraft ? existingDraft.version + 1 : 1;

      const draftDocument: EmailDraftDocument = {
        campaignId,
        userId,
        organizationId: organizationId || userId, // Fallback für Single-User
        content: draft,
        version,
        createdAt: existingDraft?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastSaved: Timestamp.now()
      };

      // Speichere in Firestore
      await setDoc(doc(db, 'email_drafts', draftId), draftDocument);

      emailLogger.draftSaved(campaignId);

      return {
        success: true,
        draftId,
        lastSaved: new Date()
      };

    } catch (error) {
      const emailError = EmailErrorHandler.handle(error, { campaignId }, EMAIL_ERROR_CODES.DRAFT_SAVE_ERROR);
      throw emailError;
      return {
        success: false,
        error: (error as any).message || 'Speichern fehlgeschlagen'
      };
    }
  },

  /**
   * Draft aus Firestore laden
   */
  async loadDraft(campaignId: string): Promise<EmailDraftDocument | null> {
    try {
      emailLogger.debug('Loading draft for campaign', { campaignId });

      // Suche den neuesten Draft für diese Kampagne
      const draftsRef = collection(db, 'email_drafts');
      const q = query(
        draftsRef,
        where('campaignId', '==', campaignId),
        orderBy('version', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        emailLogger.debug('No draft found for campaign', { campaignId });
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data() as EmailDraftDocument;
      
      emailLogger.debug('Draft loaded successfully', { campaignId, draftId: doc.id });
      
      return {
        ...data,
        id: doc.id
      };

    } catch (error) {
      const emailError = EmailErrorHandler.handle(error, { campaignId }, EMAIL_ERROR_CODES.DRAFT_LOAD_ERROR);
      throw emailError;
      return null;
    }
  },

  /**
   * Email-Felder aus Draft und Campaign zusammenführen
   */
  mergeEmailFields(
    draft: EmailDraft, 
    campaign: PRCampaign
  ): PRCampaignEmail {
    emailLogger.debug('Merging email fields');

    // Extrahiere Sender-Info
    let senderSignature = '';
    if (draft.sender.type === 'contact' && draft.sender.contactData) {
      const contact = draft.sender.contactData;
      senderSignature = [
        contact.name,
        contact.title,
        contact.company,
        contact.phone,
        contact.email
      ].filter(Boolean).join('\n');
    } else if (draft.sender.type === 'manual' && draft.sender.manual) {
      const manual = draft.sender.manual;
      senderSignature = [
        manual.name,
        manual.title,
        manual.company,
        manual.phone,
        manual.email
      ].filter(Boolean).join('\n');
    }

    // WICHTIG: Verwende den HTML-Content direkt, ohne die Formatierung zu zerstören
    // Die introduction ist der gesamte HTML-Body aus dem Editor
    const emailContent: PRCampaignEmail = {
      subject: draft.metadata.subject,
      greeting: '', // Wird im Email-Service aus dem HTML extrahiert
      introduction: draft.content.body, // Behalte das komplette HTML
      pressReleaseHtml: campaign.contentHtml || '<p>[Pressemitteilung]</p>',
      closing: '', // Wird im Email-Service aus dem HTML extrahiert
      signature: senderSignature
    };

    return emailContent;
  },

  /**
   * Variablen in Email-Content ersetzen
   */
  replaceVariables(
    content: string, 
    variables: Partial<EmailVariables>
  ): string {
    let result = content;

    // Flache alle verschachtelten Variablen ab
    const flatVariables: Record<string, string> = {};

    // Empfänger-Variablen
    if (variables.recipient) {
      Object.entries(variables.recipient).forEach(([key, value]) => {
        if (value !== undefined) {
          flatVariables[key] = String(value);
        }
      });
    }

    // Absender-Variablen
    if (variables.sender) {
      Object.entries(variables.sender).forEach(([key, value]) => {
        if (value !== undefined) {
          flatVariables[`sender${key.charAt(0).toUpperCase() + key.slice(1)}`] = String(value);
        }
      });
    }

    // Kampagnen-Variablen
    if (variables.campaign) {
      Object.entries(variables.campaign).forEach(([key, value]) => {
        if (value !== undefined) {
          flatVariables[`campaign${key.charAt(0).toUpperCase() + key.slice(1)}`] = String(value);
        }
      });
    }

    // System-Variablen
    if (variables.system) {
      Object.entries(variables.system).forEach(([key, value]) => {
        if (value !== undefined) {
          flatVariables[key] = String(value);
        }
      });
    }

    // Ersetze alle Variablen
    Object.entries(flatVariables).forEach(([key, value]) => {
      // Unterstütze beide Formate: {{variable}} und {variable}
      const regex1 = new RegExp(`{{${key}}}`, 'g');
      const regex2 = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex1, value);
      result = result.replace(regex2, value);
    });

    // Spezielle Bedingungen für companyName
    // {{companyName ? 'r Herr/Frau' : ''}}
    result = result.replace(
      /{{companyName\s*\?\s*'([^']+)'\s*:\s*'([^']*)'}}/g,
      (match, withCompany, withoutCompany) => {
        return flatVariables.companyName ? withCompany : withoutCompany;
      }
    );

    return result;
  },

  /**
   * Bereite Variablen für einen spezifischen Kontakt vor
   */
  prepareVariables(
    contact: {
      firstName: string;
      lastName: string;
      email: string;
      companyName?: string;
      salutation?: string;
      title?: string;
    },
    sender: {
      name: string;
      title?: string;
      company?: string;
      phone?: string;
      email?: string;
    },
    campaign: {
      title: string;
      clientName?: string;
    },
    mediaShareUrl?: string
  ): EmailVariables {
    // Berechne salutationFormal basierend auf salutation
    let salutationFormal = 'Sehr geehrte Damen und Herren';
    if (contact.salutation) {
      const salutation = contact.salutation.toLowerCase();
      if (salutation === 'herr') {
        salutationFormal = 'Sehr geehrter Herr';
      } else if (salutation === 'frau') {
        salutationFormal = 'Sehr geehrte Frau';
      }
    }

    return {
      recipient: {
        salutation: contact.salutation || '',
        salutationFormal: salutationFormal,
        title: contact.title || '',
        firstName: contact.firstName,
        lastName: contact.lastName,
        fullName: `${contact.firstName} ${contact.lastName}`,
        companyName: contact.companyName,
        email: contact.email
      },
      sender: {
        name: sender.name,
        title: sender.title,
        company: sender.company,
        phone: sender.phone,
        email: sender.email
      },
      campaign: {
        title: campaign.title,
        clientName: campaign.clientName
      },
      system: {
        currentDate: new Date().toLocaleDateString('de-DE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        currentYear: new Date().getFullYear().toString(),
        mediaShareUrl
      }
    };
  },

  /**
   * Validiere Draft-Vollständigkeit
   */
  validateDraft(draft: EmailDraft): {
    isComplete: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];

    // Prüfe Content
    if (!draft.content.body || draft.content.body.trim().length < 50) {
      missingFields.push('E-Mail-Inhalt (mindestens 50 Zeichen)');
    }

    // Prüfe Empfänger
    if (draft.recipients.listIds.length === 0 && draft.recipients.manual.length === 0) {
      missingFields.push('Empfänger');
    }

    // Prüfe Absender
    if (draft.sender.type === 'contact' && !draft.sender.contactId) {
      missingFields.push('Absender-Kontakt');
    } else if (draft.sender.type === 'manual' && (!draft.sender.manual?.name || !draft.sender.manual?.email)) {
      missingFields.push('Absender-Informationen');
    }

    // Prüfe Metadaten
    if (!draft.metadata.subject || draft.metadata.subject.trim().length < 5) {
      missingFields.push('Betreff');
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  },

  /**
   * Helper: HTML für E-Mail vorbereiten
   * Fügt CSS-Inline-Styles hinzu für bessere E-Mail-Client-Kompatibilität
   */
  prepareHtmlForEmail(html: string): string {
    // Ersetze Standard-Tags mit inline-styles für E-Mail-Kompatibilität
    let emailHtml = html;

    // Paragraphen
    emailHtml = emailHtml.replace(/<p>/g, '<p style="margin: 0 0 1em 0; line-height: 1.6;">');
    
    // Überschriften
    emailHtml = emailHtml.replace(/<h1>/g, '<h1 style="margin: 0 0 0.5em 0; font-size: 24px; font-weight: bold;">');
    emailHtml = emailHtml.replace(/<h2>/g, '<h2 style="margin: 0 0 0.5em 0; font-size: 20px; font-weight: bold;">');
    emailHtml = emailHtml.replace(/<h3>/g, '<h3 style="margin: 0 0 0.5em 0; font-size: 18px; font-weight: bold;">');
    
    // Listen
    emailHtml = emailHtml.replace(/<ul>/g, '<ul style="margin: 0 0 1em 0; padding-left: 20px;">');
    emailHtml = emailHtml.replace(/<ol>/g, '<ol style="margin: 0 0 1em 0; padding-left: 20px;">');
    emailHtml = emailHtml.replace(/<li>/g, '<li style="margin: 0 0 0.5em 0;">');
    
    // Links
    emailHtml = emailHtml.replace(/<a /g, '<a style="color: #005fab; text-decoration: underline;" ');
    
    // Blockquotes
    emailHtml = emailHtml.replace(/<blockquote>/g, '<blockquote style="margin: 0 0 1em 0; padding-left: 20px; border-left: 3px solid #ccc;">');

    // Zeilenumbrüche
    emailHtml = emailHtml.replace(/<br>/g, '<br />');
    emailHtml = emailHtml.replace(/<br\/>/g, '<br />');

    return emailHtml;
  },

  /**
   * Draft-Historie abrufen
   */
  async getDraftHistory(
    campaignId: string,
    limitCount: number = 10
  ): Promise<EmailDraftDocument[]> {
    try {
      const draftsRef = collection(db, 'email_drafts');
      const q = query(
        draftsRef,
        where('campaignId', '==', campaignId),
        orderBy('version', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as EmailDraftDocument,
        id: doc.id
      }));

    } catch (error) {
      emailLogger.error('Error loading draft history', { campaignId, error: (error as any).message });
      return [];
    }
  },

  /**
   * Draft löschen
   */
  async deleteDraft(draftId: string): Promise<boolean> {
    try {
      // Soft delete - markiere als gelöscht
      await setDoc(doc(db, 'email_drafts', draftId), {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return true;
    } catch (error) {
      emailLogger.error('Error deleting draft', { draftId, error: (error as any).message });
      return false;
    }
  }
};
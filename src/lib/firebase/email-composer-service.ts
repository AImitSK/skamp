// src/lib/firebase/email-composer-service.ts
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
import { db } from './client-init';
import { 
  EmailDraft, 
  EmailVariables,
  SaveDraftResponse 
} from '@/types/email-composer';
import { PRCampaignEmail } from '@/types/email';
import { PRCampaign } from '@/types/pr';

export interface EmailDraftDocument {
  id?: string;
  campaignId: string;
  userId: string;
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
    userId: string
  ): Promise<SaveDraftResponse> {
    try {
      console.log('💾 Saving email draft for campaign:', campaignId);

      // Prüfe ob bereits ein Draft existiert
      const existingDraft = await this.loadDraft(campaignId);
      
      const draftId = existingDraft?.id || doc(collection(db, 'email_drafts')).id;
      const version = existingDraft ? existingDraft.version + 1 : 1;

      const draftDocument: EmailDraftDocument = {
        campaignId,
        userId,
        content: draft,
        version,
        createdAt: existingDraft?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastSaved: Timestamp.now()
      };

      // Speichere in Firestore
      await setDoc(doc(db, 'email_drafts', draftId), draftDocument);

      console.log('✅ Draft saved successfully:', draftId);

      return {
        success: true,
        draftId,
        lastSaved: new Date()
      };

    } catch (error) {
      console.error('❌ Error saving draft:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Speichern fehlgeschlagen'
      };
    }
  },

  /**
   * Draft aus Firestore laden
   */
  async loadDraft(campaignId: string): Promise<EmailDraftDocument | null> {
    try {
      console.log('📄 Loading draft for campaign:', campaignId);

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
        console.log('📭 No draft found for campaign');
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data() as EmailDraftDocument;
      
      console.log('✅ Draft loaded:', doc.id);
      
      return {
        ...data,
        id: doc.id
      };

    } catch (error) {
      console.error('❌ Error loading draft:', error);
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
    console.log('🔀 Merging email fields');

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

    // Parse den HTML-Content um die Sektionen zu extrahieren
    const { greeting, introduction, closing } = this.extractSectionsFromHtml(draft.content.body);

    // Erstelle das finale Email-Objekt
    const emailContent: PRCampaignEmail = {
      subject: draft.metadata.subject,
      greeting: greeting || 'Sehr geehrte Damen und Herren,',
      introduction: introduction || draft.content.body,
      pressReleaseHtml: campaign.contentHtml || '<p>[Pressemitteilung]</p>',
      closing: closing || 'Mit freundlichen Grüßen',
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
    return {
      recipient: {
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
   * Helper: Sektionen aus HTML extrahieren
   */
  extractSectionsFromHtml(html: string): {
    greeting?: string;
    introduction?: string;
    closing?: string;
  } {
    // Dies ist eine vereinfachte Implementierung
    // In der Praxis würde man einen HTML-Parser verwenden

    const lines = html
      .replace(/<[^>]*>/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      return {};
    }

    // Annahme: Erste Zeile ist Begrüßung
    const greeting = lines[0];
    
    // Letzte Zeile ist Schlussformel
    const closing = lines.length > 2 ? lines[lines.length - 1] : undefined;
    
    // Alles dazwischen ist Einleitung
    const introduction = lines.length > 2 
      ? lines.slice(1, -1).join('\n')
      : lines.slice(1).join('\n');

    return {
      greeting,
      introduction,
      closing
    };
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
      console.error('❌ Error loading draft history:', error);
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
      console.error('❌ Error deleting draft:', error);
      return false;
    }
  }
};
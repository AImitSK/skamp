// src/lib/firebase/marken-dna-service.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './client-init';
import {
  MarkenDNADocument,
  MarkenDNADocumentType,
  MarkenDNACreateData,
  MarkenDNAUpdateData,
  CompanyMarkenDNAStatus,
  MARKEN_DNA_DOCUMENTS,
} from '@/types/marken-dna';
import { ContactEnhanced } from '@/types/crm-enhanced';
import crypto from 'crypto';

// Positionen die als "Sprecher" gelten (für DNA Synthese)
// WICHTIG: Kleingeschrieben, da position.toLowerCase().includes(sp) verwendet wird
const SPOKESPERSON_POSITIONS = [
  // Führungsebene
  'präsident', 'president', 'vorsitzend', 'chairman',
  'geschäftsführ', 'ceo', 'managing director', // "geschäftsführ" matcht Geschäftsführer/in
  'vorstand', 'board member',
  'inhaber', 'owner', 'eigentümer',
  'gründer', 'founder',
  'direktor', 'director',

  // Management
  'leiter', 'head', 'chief',
  'manager', 'clubmanager',

  // Kommunikation & Marketing
  'pressesprecher', 'press officer', 'spokesperson',
  'marketing', 'kommunikation', 'pr-',

  // Golf-/Club-spezifisch
  'pro', 'head-pro', 'head pro', 'golflehrer',
  'greenkeeper', 'platzwart', 'course manager',
  'sekretär', 'secretary', 'clubsekretär',
  'schatzmeister', 'treasurer', 'kassenwart',
  'jugendwart', 'sportdirektor', 'sportwart',
  'captain', 'spielführer',
];

/**
 * Service fuer Marken-DNA Dokumente
 *
 * Firestore-Pfad: companies/{companyId}/markenDNA/{documentType}
 *
 * Hinweis: Kunden sind Companies mit type: 'customer'
 */
class MarkenDNAService {

  /**
   * Laedt ein einzelnes Marken-DNA Dokument
   */
  async getDocument(
    companyId: string,
    type: MarkenDNADocumentType
  ): Promise<MarkenDNADocument | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'markenDNA', type);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as MarkenDNADocument;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden des Marken-DNA Dokuments:', error);
      return null;
    }
  }

  /**
   * Laedt alle Marken-DNA Dokumente eines Kunden
   */
  async getDocuments(companyId: string): Promise<MarkenDNADocument[]> {
    console.log('[MarkenDNA] getDocuments called for companyId:', companyId);
    try {
      const collectionRef = collection(db, 'companies', companyId, 'markenDNA');
      const snapshot = await getDocs(collectionRef);
      console.log('[MarkenDNA] getDocuments found', snapshot.docs.length, 'docs for', companyId);

      return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          // Fallback: type aus Dokument-ID ableiten (fuer alte Dokumente ohne type-Feld)
          type: data.type || docSnap.id as MarkenDNADocumentType,
          ...data
        } as MarkenDNADocument;
      });
    } catch (error) {
      console.error('[MarkenDNA] Fehler beim Laden der Marken-DNA Dokumente:', error);
      return [];
    }
  }

  /**
   * Erstellt ein neues Marken-DNA Dokument
   */
  async createDocument(
    data: MarkenDNACreateData,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      const documentData: any = {
        id: data.type,
        companyId: data.companyId,
        companyName: data.companyName,
        organizationId: context.organizationId,
        type: data.type,
        title: MARKEN_DNA_DOCUMENTS[data.type].title,
        content: data.content,
        plainText: data.plainText || data.content.replace(/<[^>]*>/g, ''),
        status: data.status || 'draft',
        completeness: data.completeness || 0,
        chatHistory: data.chatHistory || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: context.userId,
        updatedBy: context.userId,
      };

      // structuredData nur hinzufuegen wenn definiert (Firebase erlaubt kein undefined)
      if (data.structuredData !== undefined) {
        documentData.structuredData = data.structuredData;
      }

      const docRef = doc(db, 'companies', data.companyId, 'markenDNA', data.type);
      await setDoc(docRef, documentData);

      return data.type;
    } catch (error) {
      console.error('Fehler beim Erstellen des Marken-DNA Dokuments:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert ein Marken-DNA Dokument
   */
  async updateDocument(
    companyId: string,
    type: MarkenDNADocumentType,
    data: MarkenDNAUpdateData,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'markenDNA', type);

      // undefined-Werte filtern (Firebase erlaubt kein undefined)
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
      );

      const updateData: any = {
        ...filteredData,
        updatedAt: serverTimestamp(),
        updatedBy: context.userId,
      };

      // PlainText automatisch aus content generieren wenn nicht explizit gesetzt
      if (data.content && !data.plainText) {
        updateData.plainText = data.content.replace(/<[^>]*>/g, '');
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Marken-DNA Dokuments:', error);
      throw error;
    }
  }

  /**
   * Loescht ein Marken-DNA Dokument
   */
  async deleteDocument(
    companyId: string,
    type: MarkenDNADocumentType
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'markenDNA', type);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Fehler beim Loeschen des Marken-DNA Dokuments:', error);
      throw error;
    }
  }

  /**
   * Loescht alle Marken-DNA Dokumente eines Kunden
   */
  async deleteAllDocuments(companyId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Alle 6 Dokumenttypen loeschen
      const types: MarkenDNADocumentType[] = [
        'briefing',
        'swot',
        'audience',
        'positioning',
        'goals',
        'messages',
      ];

      types.forEach(type => {
        const docRef = doc(db, 'companies', companyId, 'markenDNA', type);
        batch.delete(docRef);
      });

      await batch.commit();
    } catch (error) {
      console.error('Fehler beim Loeschen aller Marken-DNA Dokumente:', error);
      throw error;
    }
  }

  /**
   * Ermittelt den Status eines Kunden (welche Dokumente vorhanden)
   */
  async getCompanyStatus(companyId: string): Promise<CompanyMarkenDNAStatus> {
    try {
      const documents = await this.getDocuments(companyId);

      // Status-Map erstellen
      const documentStatus: CompanyMarkenDNAStatus['documents'] = {
        briefing: 'missing',
        swot: 'missing',
        audience: 'missing',
        positioning: 'missing',
        goals: 'missing',
        messages: 'missing',
      };

      let totalCompleteness = 0;
      let lastUpdated: Timestamp | undefined;

      documents.forEach(doc => {
        if (doc.type in documentStatus) {
          documentStatus[doc.type as MarkenDNADocumentType] = doc.status;
          totalCompleteness += doc.completeness || 0;

          if (!lastUpdated || doc.updatedAt.toMillis() > lastUpdated.toMillis()) {
            lastUpdated = doc.updatedAt;
          }
        }
      });

      const completedCount = Object.values(documentStatus).filter(s => s === 'completed').length;
      const averageCompleteness = completedCount > 0 ? Math.round(totalCompleteness / completedCount) : 0;

      // Company-Name ermitteln (aus erstem Dokument)
      const companyName = documents.length > 0 ? documents[0].companyName : '';

      return {
        companyId,
        companyName,
        documents: documentStatus,
        completeness: averageCompleteness,
        isComplete: completedCount === 6,
        lastUpdated,
      };
    } catch (error) {
      console.error('Fehler beim Ermitteln des Company-Status:', error);
      throw error;
    }
  }

  /**
   * Ermittelt den Status aller Kunden einer Organisation
   *
   * Hinweis: Filtert auf Companies mit type: 'customer'
   */
  async getAllCustomersStatus(organizationId: string): Promise<CompanyMarkenDNAStatus[]> {
    try {
      // Alle Kunden der Organisation laden (aus companies_enhanced Collection!)
      // WICHTIG: Kein deletedAt Filter - Firestore kann nicht nach nicht-existierenden Feldern filtern
      // WICHTIG: Kein orderBy - braucht Composite Index
      const companiesQuery = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', organizationId),
        where('type', '==', 'customer')
      );

      const companiesSnapshot = await getDocs(companiesQuery);

      const statuses: CompanyMarkenDNAStatus[] = [];

      // Fuer jeden Kunden den Status ermitteln
      for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data();

        // Ueberspringe geloeschte Companies (falls deletedAt gesetzt ist)
        if (companyData.deletedAt) continue;

        const status = await this.getCompanyStatus(companyDoc.id);

        // Company-Name aus Company-Dokument uebernehmen falls nicht in Marken-DNA vorhanden
        if (!status.companyName) {
          status.companyName = companyData.name || '';
        }

        statuses.push(status);
      }

      // Client-seitig nach Name sortieren (statt Firestore orderBy das Index braucht)
      return statuses.sort((a, b) => a.companyName.localeCompare(b.companyName, 'de'));
    } catch (error) {
      console.error('[MarkenDNA] Fehler beim Ermitteln aller Kunden-Status:', error);
      return [];
    }
  }

  /**
   * Prueft ob alle 6 Dokumente vorhanden sind
   */
  async isComplete(companyId: string): Promise<boolean> {
    try {
      const status = await this.getCompanyStatus(companyId);
      return status.isComplete;
    } catch (error) {
      console.error('Fehler beim Pruefen der Vollstaendigkeit:', error);
      return false;
    }
  }

  /**
   * Exportiert alle Dokumente als Plain-Text fuer KI
   *
   * Format:
   * # Briefing-Check
   * [Inhalt]
   *
   * # SWOT-Analyse
   * [Inhalt]
   *
   * ...
   *
   * # Ansprechpartner
   * [Kontakte mit Führungsrollen]
   *
   * @param companyId - ID des Kunden (Company mit type: 'customer')
   * @param organizationId - Optional: Wenn angegeben, werden auch Ansprechpartner geladen
   */
  async exportForAI(companyId: string, organizationId?: string): Promise<string> {
    try {
      const documents = await this.getDocuments(companyId);

      // Keine Dokumente gefunden
      if (!documents || documents.length === 0) {
        console.warn('[MarkenDNA] exportForAI: Keine Dokumente gefunden für', companyId);
        return '';
      }

      // Nur gueltige Dokumente mit bekanntem Type filtern
      const validDocs = documents.filter(doc => {
        if (!doc.type || !MARKEN_DNA_DOCUMENTS[doc.type]) {
          console.warn('[MarkenDNA] exportForAI: Ungueltiger Dokumenttyp:', doc.type, 'fuer doc.id:', doc.id);
          return false;
        }
        return true;
      });

      if (validDocs.length === 0) {
        console.warn('[MarkenDNA] exportForAI: Keine gueltigen Dokumente nach Filterung für', companyId);
        return '';
      }

      // Nach Reihenfolge sortieren
      const sortedDocs = validDocs.sort((a, b) =>
        MARKEN_DNA_DOCUMENTS[a.type].order - MARKEN_DNA_DOCUMENTS[b.type].order
      );

      const parts: string[] = [];

      sortedDocs.forEach(doc => {
        const title = doc.title || MARKEN_DNA_DOCUMENTS[doc.type]?.title || doc.type;
        const content = doc.plainText || doc.content?.replace(/<[^>]*>/g, '') || '';
        if (content.trim()) {
          parts.push(`# ${title}\n\n${content}\n`);
        }
      });

      // Ansprechpartner laden wenn organizationId vorhanden
      if (organizationId) {
        const spokespersons = await this.getSpokespersonsForCompany(companyId, organizationId);
        if (spokespersons.length > 0) {
          const contactsSection = this.formatSpokespersonsForAI(spokespersons);
          parts.push(contactsSection);
        }
      }

      return parts.join('\n---\n\n');
    } catch (error) {
      console.error('Fehler beim Export fuer KI:', error);
      return '';
    }
  }

  /**
   * Laedt Ansprechpartner (Sprecher) fuer eine Company
   * Filtert nach Fuehrungspositionen basierend auf SPOKESPERSON_POSITIONS
   */
  private async getSpokespersonsForCompany(
    companyId: string,
    organizationId: string
  ): Promise<ContactEnhanced[]> {
    try {
      // Alle Kontakte der Company laden
      const contactsRef = collection(db, 'contacts_enhanced');
      const q = query(
        contactsRef,
        where('organizationId', '==', organizationId),
        where('companyId', '==', companyId)
      );

      const snapshot = await getDocs(q);
      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactEnhanced[];

      // Nach Sprecher-Positionen filtern
      const spokespersons = contacts.filter(contact => {
        const position = (contact.position || '').toLowerCase();
        const department = (contact.department || '').toLowerCase();

        // Pruefen ob Position eine Fuehrungsrolle ist
        return SPOKESPERSON_POSITIONS.some(sp =>
          position.includes(sp) || department.includes(sp)
        );
      });

      // Sortieren: Präsident/GF zuerst, dann alphabetisch
      spokespersons.sort((a, b) => {
        const posA = (a.position || '').toLowerCase();
        const posB = (b.position || '').toLowerCase();

        // Präsident/CEO ganz oben
        const isTopA = posA.includes('präsident') || posA.includes('ceo') || posA.includes('geschäftsführer');
        const isTopB = posB.includes('präsident') || posB.includes('ceo') || posB.includes('geschäftsführer');

        if (isTopA && !isTopB) return -1;
        if (!isTopA && isTopB) return 1;

        return (a.displayName || '').localeCompare(b.displayName || '');
      });

      return spokespersons;
    } catch (error) {
      console.error('[MarkenDNA] Fehler beim Laden der Ansprechpartner:', error);
      return [];
    }
  }

  /**
   * Formatiert Ansprechpartner als Plain-Text fuer KI
   */
  private formatSpokespersonsForAI(contacts: ContactEnhanced[]): string {
    const lines: string[] = ['# Ansprechpartner\n'];

    contacts.forEach((contact, index) => {
      const name = contact.displayName || 'Unbekannt';
      const position = contact.position || '';
      const department = contact.department || '';

      // Primaere Email finden
      const primaryEmail = contact.emails?.find(e => e.isPrimary)?.email
        || contact.emails?.[0]?.email
        || '';

      // Primaere Telefonnummer finden
      const primaryPhone = contact.phones?.find(p => p.isPrimary)?.number
        || contact.phones?.[0]?.number
        || '';

      lines.push(`${index + 1}. **${name}**`);
      if (position) lines.push(`   - Position: ${position}`);
      if (department) lines.push(`   - Abteilung: ${department}`);
      if (primaryEmail) lines.push(`   - E-Mail: ${primaryEmail}`);
      if (primaryPhone) lines.push(`   - Telefon: ${primaryPhone}`);
      lines.push('');
    });

    lines.push('Hinweis: Die KI soll aus Position und Abteilung ableiten, zu welchen Themen diese Person zitiert werden kann.');

    return lines.join('\n');
  }

  /**
   * Berechnet einen Hash ueber alle Marken-DNA Dokumente
   *
   * Verwendung: Aenderungs-Tracking fuer DNA Synthese
   *
   * Hash-Berechnung:
   * - Dokumente nach Typ sortieren
   * - Fuer jedes Dokument: `${type}:${updatedAt.toMillis()}`
   * - Mit '|' verbinden
   * - SHA256 Hash berechnen
   * - Erste 16 Zeichen zurueckgeben
   */
  async computeMarkenDNAHash(companyId: string): Promise<string> {
    try {
      const documents = await this.getDocuments(companyId);

      if (!documents || documents.length === 0) {
        return '';
      }

      // Nur gueltige Dokumente mit Type und updatedAt
      const validDocs = documents.filter(doc => doc.type && doc.updatedAt);

      if (validDocs.length === 0) {
        return '';
      }

      // Nach Typ sortieren fuer konsistente Hashes
      const sortedDocs = validDocs.sort((a, b) => a.type.localeCompare(b.type));

      // Hash-String erstellen
      const combined = sortedDocs
        .map(doc => `${doc.type}:${doc.updatedAt.toMillis()}`)
        .join('|');

      // SHA256 Hash berechnen (erste 16 Zeichen)
      const hash = crypto.createHash('sha256').update(combined).digest('hex');
      return hash.substring(0, 16);
    } catch (error) {
      console.error('Fehler beim Berechnen des Marken-DNA Hashes:', error);
      return '';
    }
  }
}

export const markenDNAService = new MarkenDNAService();

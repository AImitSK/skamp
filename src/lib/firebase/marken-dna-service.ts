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
import crypto from 'crypto';

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
    try {
      const collectionRef = collection(db, 'companies', companyId, 'markenDNA');
      const snapshot = await getDocs(collectionRef);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MarkenDNADocument));
    } catch (error) {
      console.error('Fehler beim Laden der Marken-DNA Dokumente:', error);
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
        structuredData: data.structuredData,
        status: data.status || 'draft',
        completeness: data.completeness || 0,
        chatHistory: data.chatHistory || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: context.userId,
        updatedBy: context.userId,
      };

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

      const updateData: any = {
        ...data,
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
      // Alle Kunden der Organisation laden
      const companiesQuery = query(
        collection(db, 'companies'),
        where('organizationId', '==', organizationId),
        where('type', '==', 'customer'),
        orderBy('name')
      );

      const companiesSnapshot = await getDocs(companiesQuery);
      const statuses: CompanyMarkenDNAStatus[] = [];

      // Fuer jeden Kunden den Status ermitteln
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const status = await this.getCompanyStatus(companyId);

        // Company-Name aus Company-Dokument uebernehmen falls nicht in Marken-DNA vorhanden
        if (!status.companyName) {
          status.companyName = companyDoc.data().name || '';
        }

        statuses.push(status);
      }

      return statuses;
    } catch (error) {
      console.error('Fehler beim Ermitteln aller Kunden-Status:', error);
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
   */
  async exportForAI(companyId: string): Promise<string> {
    try {
      const documents = await this.getDocuments(companyId);

      // Nach Reihenfolge sortieren
      const sortedDocs = documents.sort((a, b) =>
        MARKEN_DNA_DOCUMENTS[a.type].order - MARKEN_DNA_DOCUMENTS[b.type].order
      );

      const parts: string[] = [];

      sortedDocs.forEach(doc => {
        parts.push(`# ${doc.title}\n\n${doc.plainText}\n`);
      });

      return parts.join('\n---\n\n');
    } catch (error) {
      console.error('Fehler beim Export fuer KI:', error);
      return '';
    }
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

      if (documents.length === 0) {
        return '';
      }

      // Nach Typ sortieren fuer konsistente Hashes
      const sortedDocs = documents.sort((a, b) => a.type.localeCompare(b.type));

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

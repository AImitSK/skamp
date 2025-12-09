// src/lib/services/glossary-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import {
  CustomerGlossaryEntry,
  CreateGlossaryEntryInput,
  UpdateGlossaryEntryInput,
  GlossaryFilterOptions,
} from '@/types/glossary';

/**
 * Service für kundenspezifische Glossar-Einträge
 *
 * Firestore Collection: `organizations/{orgId}/customer_glossary`
 */
class GlossaryService {
  /**
   * Gibt den Collection-Pfad für eine Organization zurück
   */
  private getCollectionPath(organizationId: string): string {
    return `organizations/${organizationId}/customer_glossary`;
  }

  /**
   * Konvertiert Firestore-Dokument zu CustomerGlossaryEntry
   */
  private docToEntry(
    docSnap: any,
    organizationId: string
  ): CustomerGlossaryEntry {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      organizationId,
      customerId: data.customerId,
      translations: data.translations || {},
      context: data.context,
      isApproved: data.isApproved ?? false,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      createdBy: data.createdBy,
    };
  }

  /**
   * Holt alle Glossar-Einträge einer Organization
   */
  async getByOrganization(
    organizationId: string,
    options?: GlossaryFilterOptions
  ): Promise<CustomerGlossaryEntry[]> {
    const collectionRef = collection(db, this.getCollectionPath(organizationId));

    // Baue Query mit kombinierten Filtern
    const constraints: any[] = [];

    // Filter nach Kunde
    if (options?.customerId) {
      constraints.push(where('customerId', '==', options.customerId));
    }

    // Filter nur freigegebene
    if (options?.approvedOnly) {
      constraints.push(where('isApproved', '==', true));
    }

    // Sortierung
    constraints.push(orderBy('createdAt', 'desc'));

    // Query mit allen Constraints erstellen
    const q = query(collectionRef, ...constraints);

    const snapshot = await getDocs(q);
    let entries = snapshot.docs.map((doc) => this.docToEntry(doc, organizationId));

    // Client-seitige Suche (Firestore unterstützt keine Volltextsuche)
    if (options?.searchQuery) {
      const searchLower = options.searchQuery.toLowerCase();
      entries = entries.filter((entry) => {
        // Suche in allen Übersetzungen
        const translationMatch = Object.values(entry.translations).some(
          (translation) => translation.toLowerCase().includes(searchLower)
        );
        // Suche im Kontext
        const contextMatch = entry.context?.toLowerCase().includes(searchLower);
        return translationMatch || contextMatch;
      });
    }

    // Pagination
    if (options?.offset) {
      entries = entries.slice(options.offset);
    }
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Holt Glossar-Einträge für einen bestimmten Kunden
   */
  async getByCustomer(
    organizationId: string,
    customerId: string
  ): Promise<CustomerGlossaryEntry[]> {
    return this.getByOrganization(organizationId, { customerId });
  }

  /**
   * Holt einen einzelnen Glossar-Eintrag
   */
  async getById(
    organizationId: string,
    entryId: string
  ): Promise<CustomerGlossaryEntry | null> {
    const docRef = doc(db, this.getCollectionPath(organizationId), entryId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return this.docToEntry(docSnap, organizationId);
  }

  /**
   * Erstellt einen neuen Glossar-Eintrag
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreateGlossaryEntryInput
  ): Promise<CustomerGlossaryEntry> {
    const collectionRef = collection(db, this.getCollectionPath(organizationId));

    const docData = {
      customerId: input.customerId,
      translations: input.translations,
      context: input.context || null,
      isApproved: true, // Neue Einträge sind sofort nutzbar
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
    };

    const docRef = await addDoc(collectionRef, docData);

    return {
      id: docRef.id,
      organizationId,
      customerId: input.customerId,
      translations: input.translations,
      context: input.context,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };
  }

  /**
   * Aktualisiert einen Glossar-Eintrag
   */
  async update(
    organizationId: string,
    entryId: string,
    input: UpdateGlossaryEntryInput
  ): Promise<void> {
    const docRef = doc(db, this.getCollectionPath(organizationId), entryId);

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (input.translations !== undefined) {
      updateData.translations = input.translations;
    }
    if (input.context !== undefined) {
      updateData.context = input.context;
    }
    if (input.isApproved !== undefined) {
      updateData.isApproved = input.isApproved;
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * Löscht einen Glossar-Eintrag
   */
  async delete(organizationId: string, entryId: string): Promise<void> {
    const docRef = doc(db, this.getCollectionPath(organizationId), entryId);
    await deleteDoc(docRef);
  }

  /**
   * Sucht in allen Glossar-Einträgen
   */
  async search(
    organizationId: string,
    searchQuery: string
  ): Promise<CustomerGlossaryEntry[]> {
    return this.getByOrganization(organizationId, { searchQuery });
  }

  /**
   * Zählt die Anzahl der Glossar-Einträge
   */
  async count(
    organizationId: string,
    customerId?: string
  ): Promise<number> {
    const entries = await this.getByOrganization(organizationId, { customerId });
    return entries.length;
  }
}

export const glossaryService = new GlossaryService();

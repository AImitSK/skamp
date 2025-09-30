/**
 * Reference Service - Verwaltung von Journalisten-Verweisen
 *
 * Dieses System erstellt VERWEISE auf globale Journalisten, KEINE Kopien!
 * - SuperAdmin pflegt globale Daten
 * - Organisationen importieren Verweise
 * - Änderungen propagieren automatisch
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ========================================
// TYPES
// ========================================

export interface JournalistReference {
  id?: string;
  organizationId: string;
  globalJournalistId: string;

  // Lokale Daten (editierbar)
  localNotes?: string;
  localTags?: string[];
  customLabel?: string;

  // Meta
  addedAt: any;
  addedBy: string;
  lastModified?: any;
  isActive: boolean;
}

export interface ReferencedJournalist {
  // Globale Daten (read-only)
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  position?: string;
  publicationIds?: string[];
  beats?: string[];
  mediaTypes?: string[];
  isGlobal: boolean;

  // Reference Meta
  _isReference: true;
  _referenceId: string;
  _localMeta: {
    notes?: string;
    tags?: string[];
    customLabel?: string;
    addedAt: Date;
  };
}

// ========================================
// REFERENCE SERVICE
// ========================================

class ReferenceService {
  private referencesCollection = 'journalist_references';

  /**
   * Erstellt einen Verweis auf einen globalen Journalisten
   */
  async createReference(
    globalJournalistId: string,
    organizationId: string,
    userId: string,
    initialNotes?: string
  ): Promise<string> {
    try {
      // Prüfe ob bereits eine Reference existiert
      const existing = await this.findExistingReference(globalJournalistId, organizationId);
      if (existing) {
        throw new Error('Journalist wurde bereits als Verweis hinzugefügt');
      }

      // Prüfe ob globaler Journalist existiert
      const globalJournalist = await getDoc(doc(db, 'contacts_enhanced', globalJournalistId));
      if (!globalJournalist.exists() || !globalJournalist.data().isGlobal) {
        throw new Error('Globaler Journalist nicht gefunden');
      }

      // Erstelle Reference
      const referenceData: Omit<JournalistReference, 'id'> = {
        organizationId,
        globalJournalistId,
        localNotes: initialNotes || '',
        localTags: [],
        addedAt: serverTimestamp(),
        addedBy: userId,
        isActive: true
      };

      const docRef = await addDoc(
        collection(db, 'organizations', organizationId, this.referencesCollection),
        referenceData
      );

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Reference:', error);
      throw error;
    }
  }

  /**
   * Lädt alle References einer Organisation mit globalen Daten
   */
  async getReferencesWithData(organizationId: string): Promise<ReferencedJournalist[]> {
    try {
      // 1. Lade alle References der Organisation
      const referencesQuery = query(
        collection(db, 'organizations', organizationId, this.referencesCollection),
        where('isActive', '==', true)
      );

      const referencesSnapshot = await getDocs(referencesQuery);

      if (referencesSnapshot.empty) {
        return [];
      }

      const references = referencesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as JournalistReference));

      // 2. Sammle alle globalJournalistIds
      const globalIds = references.map(ref => ref.globalJournalistId);

      // 3. Batch-Lade globale Journalisten
      const globalJournalists = await this.batchLoadGlobalJournalists(globalIds);

      // 4. Kombiniere References mit globalen Daten
      const referencedJournalists: ReferencedJournalist[] = [];

      for (const reference of references) {
        const globalData = globalJournalists.get(reference.globalJournalistId);

        if (globalData) {
          referencedJournalists.push({
            // Globale Daten (read-only)
            id: globalData.id,
            displayName: globalData.displayName,
            email: globalData.emails?.[0]?.email,
            phone: globalData.phones?.[0]?.number,
            companyName: globalData.companyName,
            position: globalData.position,
            publicationIds: globalData.mediaProfile?.publicationIds,
            beats: globalData.mediaProfile?.beats,
            mediaTypes: globalData.mediaProfile?.mediaTypes,
            isGlobal: true,

            // Reference Meta
            _isReference: true,
            _referenceId: reference.id!,
            _localMeta: {
              notes: reference.localNotes,
              tags: reference.localTags,
              customLabel: reference.customLabel,
              addedAt: reference.addedAt?.toDate() || new Date()
            }
          });
        }
      }

      return referencedJournalists;
    } catch (error) {
      console.error('Fehler beim Laden der References:', error);
      return [];
    }
  }

  /**
   * Aktualisiert lokale Daten einer Reference
   */
  async updateLocalMeta(
    referenceId: string,
    organizationId: string,
    updates: {
      localNotes?: string;
      localTags?: string[];
      customLabel?: string;
    }
  ): Promise<void> {
    try {
      const referenceRef = doc(
        db,
        'organizations',
        organizationId,
        this.referencesCollection,
        referenceId
      );

      await updateDoc(referenceRef, {
        ...updates,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Fehler beim Update der lokalen Meta-Daten:', error);
      throw error;
    }
  }

  /**
   * Entfernt eine Reference (löscht nur den Verweis, nicht die globalen Daten!)
   */
  async removeReference(
    referenceId: string,
    organizationId: string
  ): Promise<void> {
    try {
      const referenceRef = doc(
        db,
        'organizations',
        organizationId,
        this.referencesCollection,
        referenceId
      );

      // Soft-Delete (behalte für Historie)
      await updateDoc(referenceRef, {
        isActive: false,
        removedAt: serverTimestamp()
      });

      // Alternative: Hard-Delete
      // await deleteDoc(referenceRef);
    } catch (error) {
      console.error('Fehler beim Entfernen der Reference:', error);
      throw error;
    }
  }

  /**
   * Prüft ob ein Journalist bereits referenziert wurde
   */
  async isReferenced(
    globalJournalistId: string,
    organizationId: string
  ): Promise<boolean> {
    const existing = await this.findExistingReference(globalJournalistId, organizationId);
    return !!existing;
  }

  // ========================================
  // HELPER METHODEN
  // ========================================

  /**
   * Findet existierende Reference
   */
  private async findExistingReference(
    globalJournalistId: string,
    organizationId: string
  ): Promise<JournalistReference | null> {
    try {
      const q = query(
        collection(db, 'organizations', organizationId, this.referencesCollection),
        where('globalJournalistId', '==', globalJournalistId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as JournalistReference;
    } catch (error) {
      console.error('Fehler bei der Suche nach existierender Reference:', error);
      return null;
    }
  }

  /**
   * Batch-Load globale Journalisten für Performance
   */
  private async batchLoadGlobalJournalists(
    journalistIds: string[]
  ): Promise<Map<string, any>> {
    const journalistsMap = new Map();

    // Firestore erlaubt max 10 IDs pro "in" Query
    const chunks = this.chunkArray(journalistIds, 10);

    for (const chunk of chunks) {
      const q = query(
        collection(db, 'contacts_enhanced'),
        where(documentId(), 'in', chunk),
        where('isGlobal', '==', true)
      );

      const snapshot = await getDocs(q);

      snapshot.docs.forEach(doc => {
        journalistsMap.set(doc.id, {
          id: doc.id,
          ...doc.data()
        });
      });
    }

    return journalistsMap;
  }

  /**
   * Teilt Array in Chunks für Batch-Operationen
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Batch-Import mehrerer References
   */
  async batchCreateReferences(
    journalistIds: string[],
    organizationId: string,
    userId: string
  ): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>
  }> {
    const batch = writeBatch(db);
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const journalistId of journalistIds) {
      try {
        // Prüfe ob bereits referenziert
        const existing = await this.findExistingReference(journalistId, organizationId);
        if (existing) {
          failed.push({
            id: journalistId,
            error: 'Bereits als Verweis hinzugefügt'
          });
          continue;
        }

        // Füge zur Batch hinzu
        const referenceRef = doc(
          collection(db, 'organizations', organizationId, this.referencesCollection)
        );

        batch.set(referenceRef, {
          organizationId,
          globalJournalistId: journalistId,
          localNotes: '',
          localTags: [],
          addedAt: serverTimestamp(),
          addedBy: userId,
          isActive: true
        });

        successful.push(journalistId);
      } catch (error) {
        failed.push({
          id: journalistId,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    // Commit batch
    if (successful.length > 0) {
      await batch.commit();
    }

    return { successful, failed };
  }
}

// ========================================
// EXPORT
// ========================================

export const referenceService = new ReferenceService();
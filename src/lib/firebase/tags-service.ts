// Isolierter Tags Service ohne zirkuläre Abhängigkeiten
import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tag, TagColor } from '@/types/crm';

class TagsService {
  private collectionName = 'tags';

  /**
   * Alle Tags für eine Organisation abrufen (mit Fallback auf userId für Rückwärtskompatibilität)
   */
  async getAll(organizationIdOrUserId: string, fallbackUserId?: string): Promise<Tag[]> {
    try {
      // Erst nach organizationId suchen
      const orgQuery = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationIdOrUserId)
      );
      
      const orgSnapshot = await getDocs(orgQuery);
      const orgTags = orgSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Tag));

      // Falls keine Tags mit organizationId gefunden wurden und ein fallbackUserId vorhanden ist,
      // suche nach userId (für Rückwärtskompatibilität)
      if (orgTags.length === 0 && fallbackUserId) {
        const userQuery = query(
          collection(db, this.collectionName),
          where('userId', '==', fallbackUserId)
        );
        
        const userSnapshot = await getDocs(userQuery);
        return userSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Tag));
      }

      return orgTags;
    } catch (error) {
      console.error('Fehler beim Abrufen der Tags:', error);
      return [];
    }
  }

  /**
   * Neues Tag erstellen
   */
  async create(tag: { name: string; color: TagColor }, organizationId: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...tag,
        organizationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Tags:', error);
      throw error;
    }
  }
}

export const tagsService = new TagsService();
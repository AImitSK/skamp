// Isolierter Tags Service ohne zirkuläre Abhängigkeiten
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  documentId,
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
   * Tags direkt über ihre IDs laden
   */
  async getByIds(tagIds: string[]): Promise<Tag[]> {
    if (!tagIds || tagIds.length === 0) return [];
    
    try {
      const tags: Tag[] = [];
      
      // Lade jeden Tag einzeln über seine ID
      for (const tagId of tagIds) {
        try {
          const tagDoc = await getDoc(doc(db, this.collectionName, tagId));
          if (tagDoc.exists()) {
            tags.push({
              id: tagDoc.id,
              ...tagDoc.data()
            } as Tag);
          }
        } catch (error) {
          console.warn(`Tag mit ID ${tagId} konnte nicht geladen werden:`, error);
        }
      }
      
      return tags;
    } catch (error) {
      console.error('Fehler beim Laden der Tags über IDs:', error);
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
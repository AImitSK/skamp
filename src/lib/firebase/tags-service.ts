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
   * Alle Tags für eine Organisation abrufen
   */
  async getAll(organizationId: string): Promise<Tag[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('organizationId', '==', organizationId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Tag));
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
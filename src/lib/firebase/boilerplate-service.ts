// src/lib/firebase/boilerplate-service.ts

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
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from './client-init';
import { Boilerplate, BoilerplateCreateData } from '@/types/crm';
import { Timestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'boilerplates';

export const boilerplatesService = {
  // Alle Boilerplates eines Nutzers laden
  async getAll(userId: string): Promise<Boilerplate[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('isArchived', '!=', true),
      orderBy('isArchived'),
      orderBy('category'),
      orderBy('sortOrder'),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Boilerplate));
  },

  // NEU: Boilerplates für einen spezifischen Kunden + globale
  async getForClient(userId: string, clientId: string): Promise<Boilerplate[]> {
    // Zwei Queries: Globale + kundenspezifische
    const globalQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('isGlobal', '==', true),
      where('isArchived', '!=', true)
    );
    
    const clientQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('clientId', '==', clientId),
      where('isArchived', '!=', true)
    );
    
    const [globalSnapshot, clientSnapshot] = await Promise.all([
      getDocs(globalQuery),
      getDocs(clientQuery)
    ]);
    
    const globalBoilerplates = globalSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Boilerplate));
    
    const clientBoilerplates = clientSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Boilerplate));
    
    // Kombinieren und sortieren
    return [...globalBoilerplates, ...clientBoilerplates].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      if (a.sortOrder !== b.sortOrder) {
        return (a.sortOrder || 999) - (b.sortOrder || 999);
      }
      return a.name.localeCompare(b.name);
    });
  },

  // NEU: Nach Kategorie gruppiert
  async getGroupedByCategory(userId: string, clientId?: string): Promise<Record<string, Boilerplate[]>> {
    const boilerplates = clientId 
      ? await this.getForClient(userId, clientId)
      : await this.getAll(userId);
    
    return boilerplates.reduce((groups, bp) => {
      const category = bp.category || 'custom';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(bp);
      return groups;
    }, {} as Record<string, Boilerplate[]>);
  },

  // NEU: Für Campaign Editor strukturiert
  async getForCampaignEditor(userId: string, clientId?: string): Promise<{
    global: Record<string, Boilerplate[]>;
    client: Record<string, Boilerplate[]>;
    favorites: Boilerplate[];
  }> {
    if (!clientId) {
      const all = await this.getGroupedByCategory(userId);
      return {
        global: all,
        client: {},
        favorites: Object.values(all).flat().filter(bp => bp.isFavorite)
      };
    }

    const globalQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('isGlobal', '==', true),
      where('isArchived', '!=', true)
    );
    
    const clientQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('clientId', '==', clientId),
      where('isArchived', '!=', true)
    );
    
    const [globalSnapshot, clientSnapshot] = await Promise.all([
      getDocs(globalQuery),
      getDocs(clientQuery)
    ]);
    
    const globalBoilerplates = globalSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Boilerplate));
    
    const clientBoilerplates = clientSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Boilerplate));
    
    // Helper function zum Gruppieren
    const groupByCategory = (boilerplates: Boilerplate[]): Record<string, Boilerplate[]> => {
      return boilerplates.reduce((groups, bp) => {
        const category = bp.category || 'custom';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(bp);
        return groups;
      }, {} as Record<string, Boilerplate[]>);
    };
    
    const globalGrouped = groupByCategory(globalBoilerplates);
    const clientGrouped = groupByCategory(clientBoilerplates);
    
    const allBoilerplates = [...globalBoilerplates, ...clientBoilerplates];
    const favorites = allBoilerplates.filter(bp => bp.isFavorite);
    
    return {
      global: globalGrouped,
      client: clientGrouped,
      favorites
    };
  },

  // Einen spezifischen Boilerplate anhand seiner ID laden
  async getById(id: string): Promise<Boilerplate | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Boilerplate;
    }
    return null;
  },

  // NEU: Mehrere Boilerplates nach IDs
  async getByIds(ids: string[]): Promise<Boilerplate[]> {
    if (ids.length === 0) return [];
    
    const boilerplates = await Promise.all(
      ids.map(id => this.getById(id))
    );
    
    return boilerplates.filter(bp => bp !== null) as Boilerplate[];
  },

  // Einen neuen Boilerplate erstellen
  async create(data: BoilerplateCreateData): Promise<string> {
    const docData = {
      ...data,
      isGlobal: data.isGlobal ?? true,
      isArchived: false,
      isFavorite: false,
      usageCount: 0,
      sortOrder: data.sortOrder || 999,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    return docRef.id;
  },

  // Einen bestehenden Boilerplate aktualisieren
  async update(id: string, data: Partial<Boilerplate>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(docRef, updateData);
  },

  // Einen Boilerplate löschen
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  // NEU: Archivieren statt löschen
  async archive(id: string): Promise<void> {
    await this.update(id, { isArchived: true });
  },

  // NEU: Favorit toggle
  async toggleFavorite(id: string): Promise<void> {
    const bp = await this.getById(id);
    if (bp) {
      await this.update(id, { isFavorite: !bp.isFavorite });
    }
  },

  // NEU: Usage tracking
  async incrementUsage(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      usageCount: increment(1),
      lastUsedAt: serverTimestamp()
    });
  },

  // NEU: Batch usage tracking
  async incrementUsageMultiple(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    
    const batch = writeBatch(db);
    const now = serverTimestamp();
    
    ids.forEach(id => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.update(docRef, {
        usageCount: increment(1),
        lastUsedAt: now
      });
    });
    
    await batch.commit();
  },

  // NEU: Suche
  async search(userId: string, searchTerm: string, clientId?: string): Promise<Boilerplate[]> {
    const boilerplates = clientId 
      ? await this.getForClient(userId, clientId)
      : await this.getAll(userId);
    
    const term = searchTerm.toLowerCase();
    return boilerplates.filter(bp => 
      bp.name.toLowerCase().includes(term) ||
      bp.content.toLowerCase().includes(term) ||
      bp.description?.toLowerCase().includes(term) ||
      bp.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  },

  // NEU: Sortierung aktualisieren
  async updateSortOrder(userId: string, updates: Array<{id: string, sortOrder: number}>): Promise<void> {
    const batch = writeBatch(db);
    
    updates.forEach(({id, sortOrder}) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.update(docRef, { 
        sortOrder,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  },

  // NEU: Kopieren
  async duplicate(id: string, newName: string, newClientId?: string): Promise<string> {
    const original = await this.getById(id);
    if (!original) throw new Error('Boilerplate nicht gefunden');
    
    const { id: _, createdAt, updatedAt, usageCount, lastUsedAt, ...data } = original;
    
    return this.create({
      ...data,
      name: newName,
      clientId: newClientId || data.clientId,
      isGlobal: newClientId ? false : data.isGlobal
    });
  },

  // NEU: Statistiken
  async getStats(userId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    global: number;
    clientSpecific: number;
    favorites: number;
    mostUsed: Boilerplate[];
  }> {
    const all = await this.getAll(userId);
    
    const byCategory = all.reduce((acc, bp) => {
      const cat = bp.category || 'custom';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostUsed = [...all]
      .filter(bp => (bp.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5);
    
    return {
      total: all.length,
      byCategory,
      global: all.filter(bp => bp.isGlobal).length,
      clientSpecific: all.filter(bp => !bp.isGlobal).length,
      favorites: all.filter(bp => bp.isFavorite).length,
      mostUsed
    };
  }
};
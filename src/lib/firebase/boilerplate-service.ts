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
import { Boilerplate, BoilerplateCreateData } from '@/types/crm-enhanced';
import { Timestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'boilerplates';

export const boilerplatesService = {
  /**
   * Alle Boilerplates einer Organisation laden
   * Fallback auf userId für Rückwärtskompatibilität
   */
  async getAll(organizationId: string): Promise<Boilerplate[]> {
    // Versuche zuerst mit organizationId
    let q = query(
      collection(db, COLLECTION_NAME),
      where('organizationId', '==', organizationId),
      where('isArchived', '!=', true),
      orderBy('isArchived'),
      orderBy('category'),
      orderBy('sortOrder'),
      orderBy('name')
    );
    
    let snapshot = await getDocs(q);
    
    // Wenn keine Ergebnisse, versuche mit userId (Legacy)
    if (snapshot.empty) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', organizationId), // organizationId könnte userId sein
        where('isArchived', '!=', true),
        orderBy('isArchived'),
        orderBy('category'),
        orderBy('sortOrder'),
        orderBy('name')
      );
      snapshot = await getDocs(q);
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Boilerplate));
  },

  /**
   * Boilerplates für einen spezifischen Kunden + globale
   */
  async getForClient(organizationId: string, clientId: string): Promise<Boilerplate[]> {
    // Zwei Queries: Globale + kundenspezifische
    const globalQuery = query(
      collection(db, COLLECTION_NAME),
      where('organizationId', '==', organizationId),
      where('isGlobal', '==', true),
      where('isArchived', '!=', true)
    );
    
    const clientQuery = query(
      collection(db, COLLECTION_NAME),
      where('organizationId', '==', organizationId),
      where('clientId', '==', clientId),
      where('isArchived', '!=', true)
    );
    
    const [globalSnapshot, clientSnapshot] = await Promise.all([
      getDocs(globalQuery),
      getDocs(clientQuery)
    ]);
    
    // Legacy Support: Wenn keine Ergebnisse, versuche mit userId
    if (globalSnapshot.empty && clientSnapshot.empty) {
      const legacyGlobalQuery = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', organizationId),
        where('isGlobal', '==', true),
        where('isArchived', '!=', true)
      );
      
      const legacyClientQuery = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', organizationId),
        where('clientId', '==', clientId),
        where('isArchived', '!=', true)
      );
      
      const [legacyGlobalSnapshot, legacyClientSnapshot] = await Promise.all([
        getDocs(legacyGlobalQuery),
        getDocs(legacyClientQuery)
      ]);
      
      const globalBoilerplates = legacyGlobalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Boilerplate));
      
      const clientBoilerplates = legacyClientSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Boilerplate));
      
      return [...globalBoilerplates, ...clientBoilerplates].sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 999) - (b.sortOrder || 999);
        }
        return a.name.localeCompare(b.name);
      });
    }
    
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

  /**
   * Nach Kategorie gruppiert
   */
  async getGroupedByCategory(organizationId: string, clientId?: string): Promise<Record<string, Boilerplate[]>> {
    const boilerplates = clientId 
      ? await this.getForClient(organizationId, clientId)
      : await this.getAll(organizationId);
    
    return boilerplates.reduce((groups, bp) => {
      const category = bp.category || 'custom';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(bp);
      return groups;
    }, {} as Record<string, Boilerplate[]>);
  },

  /**
   * Für Campaign Editor strukturiert - VEREINFACHT: Nutze exakt wie Boilerplates-Modul
   */
  async getForCampaignEditor(organizationId: string, clientId?: string): Promise<{
    global: Record<string, Boilerplate[]>;
    client: Record<string, Boilerplate[]>;
    favorites: Boilerplate[];
  }> {
    // VEREINFACHT: Nutze getAll() genau wie das funktionierende Boilerplates-Modul
    const allBoilerplates = await this.getAll(organizationId);
    
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
    
    // KORREKT: Filtere globale vs. client-spezifische Textbausteine
    const globalBoilerplates = allBoilerplates.filter(bp => 
      bp.isGlobal === true || !bp.clientId  // Global = explizit isGlobal ODER keine Kundenzuordnung
    );
    const globalGrouped = groupByCategory(globalBoilerplates);
    
    // Client-spezifische nur für den ausgewählten Kunden
    const clientBoilerplates = allBoilerplates.filter(bp => 
      bp.clientId === clientId && !bp.isGlobal  // Kundenspezifisch UND nicht global
    );
    const clientGrouped = groupByCategory(clientBoilerplates);
    
    const favorites = allBoilerplates.filter(bp => bp.isFavorite);
    
    return {
      global: globalGrouped,
      client: clientGrouped,
      favorites
    };
  },

  /**
   * Einen spezifischen Boilerplate anhand seiner ID laden
   */
  async getById(id: string): Promise<Boilerplate | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Boilerplate;
    }
    return null;
  },

  /**
   * Mehrere Boilerplates nach IDs
   */
  async getByIds(ids: string[]): Promise<Boilerplate[]> {
    if (ids.length === 0) return [];
    
    const boilerplates = await Promise.all(
      ids.map(id => this.getById(id))
    );
    
    return boilerplates.filter(bp => bp !== null) as Boilerplate[];
  },

  /**
   * Einen neuen Boilerplate erstellen
   */
  async create(
    data: BoilerplateCreateData,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    // Bereite die Daten vor und entferne undefined Werte
    const docData: any = {
      name: data.name,
      content: data.content,
      category: data.category,
      organizationId: context.organizationId,
      isGlobal: data.isGlobal ?? true,
      isArchived: false,
      isFavorite: false,
      usageCount: 0,
      sortOrder: data.sortOrder || 999,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: context.userId,
      updatedBy: context.userId
    };
    
    // Füge optionale Felder nur hinzu wenn sie definiert sind
    if (data.description) docData.description = data.description;
    if (data.clientId) docData.clientId = data.clientId;
    if (data.clientName) docData.clientName = data.clientName;
    if (data.tags && data.tags.length > 0) docData.tags = data.tags;
    if (data.defaultPosition) docData.defaultPosition = data.defaultPosition;
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    return docRef.id;
  },

  /**
   * Einen bestehenden Boilerplate aktualisieren
   */
  async update(
    id: string,
    data: Partial<Boilerplate>,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: context.userId
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(docRef, updateData);
  },

  /**
   * Einen Boilerplate löschen
   */
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  /**
   * Archivieren statt löschen
   */
  async archive(id: string, context: { organizationId: string; userId: string }): Promise<void> {
    await this.update(id, { isArchived: true }, context);
  },

  /**
   * Favorit toggle
   */
  async toggleFavorite(id: string, context: { organizationId: string; userId: string }): Promise<void> {
    const bp = await this.getById(id);
    if (bp) {
      await this.update(id, { isFavorite: !bp.isFavorite }, context);
    }
  },

  /**
   * Usage tracking
   */
  async incrementUsage(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      usageCount: increment(1),
      lastUsedAt: serverTimestamp()
    });
  },

  /**
   * Batch usage tracking
   */
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

  /**
   * Suche
   */
  async search(organizationId: string, searchTerm: string, clientId?: string): Promise<Boilerplate[]> {
    const boilerplates = clientId 
      ? await this.getForClient(organizationId, clientId)
      : await this.getAll(organizationId);
    
    const term = searchTerm.toLowerCase();
    return boilerplates.filter(bp => 
      bp.name.toLowerCase().includes(term) ||
      bp.content.toLowerCase().includes(term) ||
      bp.description?.toLowerCase().includes(term) ||
      bp.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  },

  /**
   * Sortierung aktualisieren
   */
  async updateSortOrder(
    updates: Array<{id: string, sortOrder: number}>,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    const batch = writeBatch(db);
    
    updates.forEach(({id, sortOrder}) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.update(docRef, { 
        sortOrder,
        updatedAt: serverTimestamp(),
        updatedBy: context.userId
      });
    });
    
    await batch.commit();
  },

  /**
   * Kopieren
   */
  async duplicate(
    id: string,
    newName: string,
    context: { organizationId: string; userId: string },
    newClientId?: string
  ): Promise<string> {
    const original = await this.getById(id);
    if (!original) throw new Error('Boilerplate nicht gefunden');
    
    // Extrahiere nur die Felder die für BoilerplateCreateData benötigt werden
    const createData: BoilerplateCreateData = {
      name: newName,
      content: original.content,
      category: original.category,
      description: original.description,
      isGlobal: newClientId ? false : original.isGlobal,
      clientId: newClientId || original.clientId,
      clientName: original.clientName,
      tags: original.tags,
      defaultPosition: original.defaultPosition,
      sortOrder: original.sortOrder
    };
    
    return this.create(createData, context);
  },

  /**
   * Statistiken
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    global: number;
    clientSpecific: number;
    favorites: number;
    mostUsed: Boilerplate[];
  }> {
    const all = await this.getAll(organizationId);
    
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
  },

  /**
   * Migration von userId zu organizationId
   */
  async migrateFromUserToOrg(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const legacyQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(legacyQuery);
    if (snapshot.empty) return;
    
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      batch.update(doc.ref, {
        organizationId,
        createdBy: data.userId || userId,
        updatedBy: userId,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  }
};
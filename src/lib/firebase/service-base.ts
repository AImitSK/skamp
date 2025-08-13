// src/lib/firebase/service-base.ts
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
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  DocumentData,
  QueryConstraint,
  OrderByDirection,
  DocumentSnapshot,
  Timestamp,
  WhereFilterOp,
  Query,
  CollectionReference
} from 'firebase/firestore';
import { db } from './config';
import { BaseEntity, TeamMember } from '@/types/international';

// ========================================
// Types für Service Base
// ========================================

export interface QueryOptions {
  orderBy?: {
    field: string;
    direction?: OrderByDirection;
  };
  limit?: number;
  startAfter?: DocumentSnapshot;
  includeDeleted?: boolean;
}

export interface FilterOptions {
  [key: string]: any;
}

export interface PaginationResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
  total?: number;
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: { id?: string; error: string }[];
}

// ========================================
// Basis Service Klasse
// ========================================

export abstract class BaseService<T extends BaseEntity> {
  protected collectionName: string;
  protected collectionRef: CollectionReference;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    // Build-safe collection reference
    try {
      if (db && typeof db === 'object' && 'type' in db) {
        this.collectionRef = collection(db, collectionName);
      } else {
        // Mock für Build-Zeit
        this.collectionRef = {} as CollectionReference;
      }
    } catch (error) {
      // Fallback für Build-Zeit
      this.collectionRef = {} as CollectionReference;
    }
  }

  /**
   * Convert raw document data to entity
   * Override in subclasses for custom transformations
   */
  protected toEntity(doc: DocumentData): T {
    return {
      id: doc.id,
      ...doc
    } as T;
  }

  /**
   * Basis-Query mit Mandanten-Filter
   */
  protected getBaseQuery(
    organizationId: string,
    additionalConstraints: QueryConstraint[] = []
  ): Query<DocumentData> {
    const constraints: QueryConstraint[] = [
      where('organizationId', '==', organizationId),
      ...additionalConstraints
    ];

    return query(this.collectionRef, ...constraints);
  }

  /**
   * Erstellt eine neue Entität
   */
  /**
   * Bereinigt ein Objekt von undefined Werten (rekursiv)
   */
  private cleanData(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanData(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanData(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  async create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      const cleanedData = this.cleanData(data);
      
      const docData = {
        ...cleanedData,
        organizationId: context.organizationId,
        createdBy: context.userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(this.collectionRef, docData);
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw new Error(`Fehler beim Erstellen`);
    }
  }

  /**
   * Erstellt mehrere Entitäten (Batch)
   */
  async createMany(
    items: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>[],
    context: { organizationId: string; userId: string }
  ): Promise<BatchOperationResult> {
    const batch = writeBatch(db);
    const results: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      for (const item of items) {
        try {
          const docRef = doc(this.collectionRef);
          const docData = {
            ...item,
            organizationId: context.organizationId,
            createdBy: context.userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(docRef, docData);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
        }
      }

      await batch.commit();
      return results;
    } catch (error) {
      console.error(`Error in batch create for ${this.collectionName}:`, error);
      throw new Error('Fehler beim Batch-Import');
    }
  }

  /**
   * Lädt eine Entität by ID
   */
  async getById(
    id: string,
    organizationId: string,
    includeDeleted = false
  ): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as T;

      // Prüfe Mandanten-Zugehörigkeit
      if (data.organizationId !== organizationId) {
        console.warn(`Access denied: Document ${id} belongs to different organization`);
        return null;
      }

      // Prüfe Soft Delete
      if (!includeDeleted && data.deletedAt) {
        return null;
      }

      return { ...data, id: docSnap.id } as T;
    } catch (error) {
      console.error(`Error fetching ${this.collectionName} by id:`, error);
      return null;
    }
  }

  /**
   * Lädt alle Entitäten einer Organisation
   */
  async getAll(
    organizationId: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Sortierung
      if (options.orderBy) {
        constraints.push(
          orderBy(options.orderBy.field, options.orderBy.direction || 'asc')
        );
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      // Limit
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      // Pagination
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = this.getBaseQuery(organizationId, constraints);
      const snapshot = await getDocs(q);

      const documents = snapshot.docs.map(doc => this.toEntity({
        id: doc.id,
        ...doc.data()
      }));

      // Client-seitige Filterung für Soft Delete
      if (!options.includeDeleted) {
        return documents.filter(doc => !doc.deletedAt);
      }

      return documents;
    } catch (error) {
      console.error(`Error fetching all ${this.collectionName}:`, error);
      return [];
    }
  }

  /**
   * Lädt Entitäten mit Pagination
   */
  async getPaginated(
    organizationId: string,
    pageSize: number = 25,
    options: QueryOptions = {}
  ): Promise<PaginationResult<T>> {
    try {
      const constraints: QueryConstraint[] = [];

      // Sortierung
      if (options.orderBy) {
        constraints.push(
          orderBy(options.orderBy.field, options.orderBy.direction || 'asc')
        );
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      // Limit (1 mehr als pageSize für hasMore Check)
      constraints.push(limit(pageSize + 1));

      // Pagination
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = this.getBaseQuery(organizationId, constraints);
      const snapshot = await getDocs(q);

      const docs = snapshot.docs;
      const hasMore = docs.length > pageSize;
      let data = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));

      // Client-seitige Filterung für Soft Delete
      if (!options.includeDeleted) {
        data = data.filter(doc => !doc.deletedAt);
      }

      return {
        data,
        hasMore,
        lastDoc: data.length > 0 ? docs[data.length - 1] : undefined
      };
    } catch (error) {
      console.error(`Error in paginated fetch for ${this.collectionName}:`, error);
      return { data: [], hasMore: false };
    }
  }

  /**
   * Sucht Entitäten mit Filtern
   */
  async search(
    organizationId: string,
    filters: FilterOptions,
    options: QueryOptions = {}
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Dynamische Filter
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            // Array-Contains für Tags etc.
            constraints.push(where(field, 'array-contains-any', value));
          } else if (typeof value === 'object' && value.operator && value.value !== undefined) {
            // Erweiterte Filter mit Operator
            constraints.push(where(field, value.operator as WhereFilterOp, value.value));
          } else {
            // Einfacher Gleichheits-Filter
            constraints.push(where(field, '==', value));
          }
        }
      });

      // Sortierung
      if (options.orderBy) {
        constraints.push(
          orderBy(options.orderBy.field, options.orderBy.direction || 'asc')
        );
      }

      // Limit
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = this.getBaseQuery(organizationId, constraints);
      const snapshot = await getDocs(q);

      const documents = snapshot.docs.map(doc => this.toEntity({
        id: doc.id,
        ...doc.data()
      }));

      // Client-seitige Filterung für Soft Delete
      if (!options.includeDeleted) {
        return documents.filter(doc => !doc.deletedAt);
      }

      return documents;
    } catch (error) {
      console.error(`Error searching ${this.collectionName}:`, error);
      return [];
    }
  }

  /**
   * Aktualisiert eine Entität
   */
  async update(
    id: string,
    data: Partial<T>,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Erst prüfen ob Dokument zur Organisation gehört
      const existing = await this.getById(id, context.organizationId);
      if (!existing) {
        throw new Error('Dokument nicht gefunden oder keine Berechtigung');
      }

      const docRef = doc(db, this.collectionName, id);
      
      // Entferne System-Felder die nicht überschrieben werden sollen
      const { 
        id: _, 
        organizationId: __, 
        createdAt, 
        createdBy, 
        ...updateData 
      } = data as any;

      // Bereinige undefined Werte
      const cleanedData = this.cleanData(updateData);

      await updateDoc(docRef, {
        ...cleanedData,
        updatedBy: context.userId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Soft Delete einer Entität
   */
  async softDelete(
    id: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      await this.update(
        id,
        {
          deletedAt: serverTimestamp() as any,
          deletedBy: context.userId
        } as Partial<T>,
        context
      );
    } catch (error) {
      console.error(`Error soft deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Hard Delete einer Entität (Vorsicht!)
   */
  async hardDelete(
    id: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Erst prüfen ob Dokument zur Organisation gehört
      const existing = await this.getById(id, organizationId, true);
      if (!existing) {
        throw new Error('Dokument nicht gefunden oder keine Berechtigung');
      }

      await deleteDoc(doc(db, this.collectionName, id));
    } catch (error) {
      console.error(`Error hard deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Wiederherstellen einer soft-gelöschten Entität
   */
  async restore(
    id: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const existing = await this.getById(id, context.organizationId, true);
      
      if (!existing) {
        throw new Error('Dokument nicht gefunden');
      }

      if (!existing.deletedAt) {
        throw new Error('Dokument ist nicht gelöscht');
      }

      await updateDoc(docRef, {
        deletedAt: null,
        deletedBy: null,
        updatedBy: context.userId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error restoring ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Zählt Entitäten
   */
  async count(
    organizationId: string,
    filters: FilterOptions = {},
    includeDeleted = false
  ): Promise<number> {
    try {
      const constraints: QueryConstraint[] = [];

      // Filter anwenden
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          constraints.push(where(field, '==', value));
        }
      });

      const q = this.getBaseQuery(organizationId, constraints);
      const snapshot = await getDocs(q);
      
      // Client-seitige Filterung für Soft Delete
      if (!includeDeleted) {
        const documents = snapshot.docs.map(doc => doc.data());
        return documents.filter(doc => !doc.deletedAt).length;
      }

      return snapshot.size;
    } catch (error) {
      console.error(`Error counting ${this.collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Prüft ob eine Entität existiert
   */
  async exists(
    id: string,
    organizationId: string
  ): Promise<boolean> {
    const doc = await this.getById(id, organizationId);
    return doc !== null;
  }

  /**
   * Batch Update
   */
  async updateMany(
    ids: string[],
    data: Partial<T>,
    context: { organizationId: string; userId: string }
  ): Promise<BatchOperationResult> {
    const batch = writeBatch(db);
    const results: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // Erst alle Dokumente prüfen
      const documents = await Promise.all(
        ids.map(id => this.getById(id, context.organizationId))
      );

      documents.forEach((document, index) => {
        if (!document) {
          results.failed++;
          results.errors.push({
            id: ids[index],
            error: 'Dokument nicht gefunden oder keine Berechtigung'
          });
          return;
        }

        try {
          const docRef = doc(db, this.collectionName, ids[index]);
          
          const { 
            id: _, 
            organizationId: __, 
            createdAt, 
            createdBy, 
            ...updateData 
          } = data as any;

          batch.update(docRef, {
            ...updateData,
            updatedBy: context.userId,
            updatedAt: serverTimestamp()
          });
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: ids[index],
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
        }
      });

      if (results.success > 0) {
        await batch.commit();
      }

      return results;
    } catch (error) {
      console.error(`Error in batch update for ${this.collectionName}:`, error);
      throw new Error('Fehler beim Batch-Update');
    }
  }

  /**
   * Batch Delete (Soft)
   */
  async deleteMany(
    ids: string[],
    context: { organizationId: string; userId: string }
  ): Promise<BatchOperationResult> {
    return this.updateMany(
      ids,
      {
        deletedAt: serverTimestamp() as any,
        deletedBy: context.userId
      } as Partial<T>,
      context
    );
  }

  /**
   * Export zu CSV/JSON
   */
  async export(
    organizationId: string,
    format: 'csv' | 'json',
    filters: FilterOptions = {}
  ): Promise<string> {
    try {
      const data = await this.search(organizationId, filters);
      
      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      }
      
      // CSV Export (vereinfacht - sollte mit Papa Parse gemacht werden)
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0] as any).filter(
        key => !['createdAt', 'updatedAt', 'deletedAt'].includes(key)
      );
      
      const csv = [
        headers.join(','),
        ...data.map(item => 
          headers.map(header => {
            const value = (item as any)[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');
      
      return csv;
    } catch (error) {
      console.error(`Error exporting ${this.collectionName}:`, error);
      throw error;
    }
  }
}

// ========================================
// Helper Functions
// ========================================

/**
 * Erstellt einen Service Context aus TeamMember
 */
export function createServiceContext(member: TeamMember): {
  organizationId: string;
  userId: string;
} {
  return {
    organizationId: member.organizationId,
    userId: member.userId
  };
}

/**
 * Validiert ob User Zugriff auf Organisation hat
 */
export async function validateAccess(
  userId: string,
  organizationId: string
): Promise<TeamMember | null> {
  try {
    const { teamMemberService } = await import('./organization-service');
    return teamMemberService.getByUserAndOrg(userId, organizationId);
  } catch (error) {
    return null;
  }
}
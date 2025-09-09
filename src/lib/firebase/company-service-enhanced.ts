// src/lib/firebase/company-service-enhanced.ts
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, Timestamp, writeBatch, Firestore } from 'firebase/firestore';

// Direct import - runtime safe wird in build-safe-init.ts gehandhabt
import { db } from '@/lib/firebase/config';
import { Company } from '@/types/crm';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { migrateCompanyToEnhanced, migrateCompanyFromEnhanced } from './crm-migration-helper';

/**
 * Enhanced Company Service that supports both legacy and enhanced formats
 * This service provides a migration path from the old Company format to CompanyEnhanced
 */
class CompanyServiceEnhanced {
  private readonly collectionName = 'companies';
  private readonly enhancedCollectionName = 'companies_enhanced';

  /**
   * Get a company by ID (returns enhanced format)
   */
  async getById(companyId: string, organizationId: string): Promise<CompanyEnhanced | null> {
    try {
      // db is already imported
      
      // First try enhanced collection
      const enhancedDoc = await getDoc(doc(db, this.enhancedCollectionName, companyId));
      if (enhancedDoc.exists()) {
        return { id: enhancedDoc.id, ...enhancedDoc.data() } as CompanyEnhanced;
      }

      // Fallback to legacy collection and migrate on the fly
      const legacyDoc = await getDoc(doc(db, this.collectionName, companyId));
      if (legacyDoc.exists()) {
        const legacyCompany = { id: legacyDoc.id, ...legacyDoc.data() } as Company;
        // Migrate but don't save yet (let the user decide)
        return migrateCompanyToEnhanced(legacyCompany, organizationId, legacyCompany.userId);
      }

      return null;
    } catch (error) {
      console.error('Error getting company:', error);
      throw error;
    }
  }

  /**
   * Get all companies for an organization (returns enhanced format)
   */
  async getAll(organizationId: string): Promise<CompanyEnhanced[]> {
    try {
      
      const results: CompanyEnhanced[] = [];

      // Get enhanced companies
      const enhancedQuery = query(
        collection(db, this.enhancedCollectionName),
        where('organizationId', '==', organizationId)
        // orderBy('name') removed - needs composite index [organizationId ASC, name ASC]
      );
      const enhancedSnapshot = await getDocs(enhancedQuery);
      
      enhancedSnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as CompanyEnhanced);
      });

      // Get legacy companies and migrate them
      const legacyQuery = query(
        collection(db, this.collectionName),
        where('userId', '==', organizationId) // Legacy uses userId
        // orderBy('name') removed - needs composite index [userId ASC, name ASC]
      );
      const legacySnapshot = await getDocs(legacyQuery);
      
      const enhancedIds = new Set(results.map(c => c.id));
      
      legacySnapshot.forEach((doc) => {
        // Only include if not already in enhanced collection
        if (!enhancedIds.has(doc.id)) {
          const legacyCompany = { id: doc.id, ...doc.data() } as Company;
          const enhanced = migrateCompanyToEnhanced(legacyCompany, organizationId, legacyCompany.userId);
          results.push(enhanced);
        }
      });

      return results.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error getting companies:', error);
      throw error;
    }
  }

  /**
   * Create a new company (enhanced format)
   */
  async create(companyData: Omit<CompanyEnhanced, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // db is already imported
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, this.enhancedCollectionName), {
        ...companyData,
        createdAt: now,
        updatedAt: now
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Update a company (enhanced format)
   */
  async update(companyId: string, updates: Partial<CompanyEnhanced>): Promise<void> {
    try {
      // db is already imported
      const docRef = doc(db, this.enhancedCollectionName, companyId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Delete a company
   */
  async delete(companyId: string): Promise<void> {
    try {
      // db is already imported
      // Delete from both collections to ensure cleanup
      await Promise.all([
        deleteDoc(doc(db, this.enhancedCollectionName, companyId)).catch(() => {}),
        deleteDoc(doc(db, this.collectionName, companyId)).catch(() => {})
      ]);
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Create a company in legacy format (for backward compatibility)
   */
  async createLegacy(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>, organizationId: string): Promise<string> {
    try {
      // Convert to enhanced format
      const enhanced = migrateCompanyToEnhanced(
        { ...companyData, id: '' } as Company,
        organizationId,
        companyData.userId
      );
      
      // Remove the temporary id
      const { id, ...dataToSave } = enhanced;
      
      return await this.create(dataToSave);
    } catch (error) {
      console.error('Error creating legacy company:', error);
      throw error;
    }
  }

  /**
   * Update a company in legacy format (for backward compatibility)
   */
  async updateLegacy(companyId: string, updates: Partial<Company>, organizationId: string): Promise<void> {
    try {
      // Get current enhanced data
      const current = await this.getById(companyId, organizationId);
      if (!current) {
        throw new Error('Company not found');
      }

      // Create a temporary full legacy company for migration
      const legacyCompany = migrateCompanyFromEnhanced(current);
      const updatedLegacy = { ...legacyCompany, ...updates, userId: current.createdBy };
      
      // Migrate back to enhanced
      const enhanced = migrateCompanyToEnhanced(
        { ...updatedLegacy, id: companyId } as Company,
        organizationId,
        current.createdBy
      );

      // Update with enhanced data
      const { id, organizationId: _, createdBy, createdAt, ...updateData } = enhanced;
      await this.update(companyId, updateData);
    } catch (error) {
      console.error('Error updating legacy company:', error);
      throw error;
    }
  }

  /**
   * Migrate all legacy companies to enhanced format
   */
  async migrateAllCompanies(userId: string, organizationId: string): Promise<{
    migrated: number;
    failed: number;
    errors: Array<{ companyId: string; error: string }>;
  }> {
    const results = {
      migrated: 0,
      failed: 0,
      errors: [] as Array<{ companyId: string; error: string }>
    };

    try {
      // Get all legacy companies
      const legacyQuery = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(legacyQuery);

      // Process in batches
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const docSnapshot of snapshot.docs) {
        try {
          const legacyCompany = { id: docSnapshot.id, ...docSnapshot.data() } as Company;
          const enhanced = migrateCompanyToEnhanced(legacyCompany, organizationId, userId);
          
          // Write to enhanced collection
          batch.set(doc(db, this.enhancedCollectionName, docSnapshot.id), {
            ...enhanced,
            id: undefined // Remove id field from document data
          });

          batchCount++;
          
          // Commit batch every 500 documents
          if (batchCount >= 500) {
            await batch.commit();
            results.migrated += batchCount;
            batchCount = 0;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            companyId: docSnapshot.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Commit remaining
      if (batchCount > 0) {
        await batch.commit();
        results.migrated += batchCount;
      }

      return results;
    } catch (error) {
      console.error('Error migrating companies:', error);
      throw error;
    }
  }

  /**
   * Search companies by name or industry
   */
  async search(organizationId: string, searchTerm: string): Promise<CompanyEnhanced[]> {
    try {
      const results = await this.getAll(organizationId);
      
      const lowerSearch = searchTerm.toLowerCase();
      return results.filter(company => 
        company.name.toLowerCase().includes(lowerSearch) ||
        company.officialName?.toLowerCase().includes(lowerSearch) ||
        company.tradingName?.toLowerCase().includes(lowerSearch) ||
        company.industryClassification?.primary?.toLowerCase().includes(lowerSearch)
      );
    } catch (error) {
      console.error('Error searching companies:', error);
      throw error;
    }
  }

  /**
   * Get companies by type
   */
  async getByType(organizationId: string, type: Company['type']): Promise<CompanyEnhanced[]> {
    try {
      const results = await this.getAll(organizationId);
      return results.filter(company => company.type === type);
    } catch (error) {
      console.error('Error getting companies by type:', error);
      throw error;
    }
  }

  /**
   * Get media companies (publishers, media houses, agencies)
   */
  async getMediaCompanies(organizationId: string): Promise<CompanyEnhanced[]> {
    try {
      const results = await this.getAll(organizationId);
      return results.filter(company => 
        ['publisher', 'media_house', 'agency'].includes(company.type)
      );
    } catch (error) {
      console.error('Error getting media companies:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const companyServiceEnhanced = new CompanyServiceEnhanced();
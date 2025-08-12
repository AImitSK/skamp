// src/lib/api/safe-companies-service.ts
/**
 * Build-Safe Companies Service
 * Komplett isoliert von Firebase-Imports zur Build-Zeit
 */

import { CompanyEnhanced } from '@/types/crm-enhanced';

export class SafeCompaniesService {
  
  async getCompanies(organizationId: string): Promise<CompanyEnhanced[]> {
    console.log('=== SAFE COMPANIES SERVICE ===');
    console.log('organizationId:', organizationId);
    
    try {
      // Lazy import Firebase services zur Laufzeit
      console.log('Loading Firebase modules dynamically...');
      
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      console.log('Firestore functions imported successfully');
      
      const { db } = await import('@/lib/firebase/build-safe-init');
      console.log('Firebase db imported:', typeof db, !!db);
      
      if (!db) {
        throw new Error('Firebase database not initialized');
      }
      
      const results: CompanyEnhanced[] = [];
      
      // Query enhanced companies
      console.log('Querying companies_enhanced collection...');
      const enhancedQuery = query(
        collection(db, 'companies_enhanced'),
        where('organizationId', '==', organizationId)
        // orderBy removed - needs composite index
      );
      
      const enhancedSnapshot = await getDocs(enhancedQuery);
      console.log('Enhanced companies found:', enhancedSnapshot.size);
      
      enhancedSnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as CompanyEnhanced);
      });
      
      // Query legacy companies
      console.log('Querying companies collection...');
      const legacyQuery = query(
        collection(db, 'companies'),
        where('userId', '==', organizationId)
        // orderBy removed - needs composite index
      );
      
      const legacySnapshot = await getDocs(legacyQuery);
      console.log('Legacy companies found:', legacySnapshot.size);
      
      // Add legacy companies that aren't in enhanced yet
      const enhancedIds = new Set(results.map(c => c.id));
      
      legacySnapshot.forEach((doc) => {
        if (!enhancedIds.has(doc.id)) {
          const legacyData = doc.data();
          // Simple migration inline
          results.push({
            id: doc.id,
            name: legacyData.name || '',
            organizationId,
            userId: legacyData.userId || organizationId,
            createdAt: legacyData.createdAt,
            updatedAt: legacyData.updatedAt,
            // Map other legacy fields as needed
            ...legacyData
          } as CompanyEnhanced);
        }
      });
      
      console.log('Total companies returned:', results.length);
      return results.sort((a, b) => a.name.localeCompare(b.name));
      
    } catch (error) {
      console.error('=== SAFE COMPANIES SERVICE ERROR ===');
      console.error('Error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      
      throw error;
    }
  }
}

export const safeCompaniesService = new SafeCompaniesService();
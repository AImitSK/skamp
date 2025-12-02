import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { multiEntityService } from '@/lib/firebase/multi-entity-reference-service';
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { publicationService } from '@/lib/firebase/library-service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ContactEnhanced, CompanyEnhanced } from '@/types/crm-enhanced';

// Query: Get All Global Journalists
export function useGlobalJournalists() {
  return useQuery({
    queryKey: ['editors', 'global'],
    queryFn: async () => {
      const globalContactsQuery = query(
        collection(db, 'contacts_enhanced'),
        where('isGlobal', '==', true)
      );
      const snapshot = await getDocs(globalContactsQuery);
      const allContacts = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data
        } as ContactEnhanced;
      });
      // Filter for journalists only
      return allContacts.filter(c => c.mediaProfile?.isJournalist);
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

// Query: Get Imported Journalist References
export function useImportedJournalists(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'imported', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      const references = await multiEntityService.getAllContactReferences(organizationId);
      return new Set(references.map(ref => ref._globalJournalistId));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation: Create Journalist Reference
export function useCreateJournalistReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      journalistId: string;
      organizationId: string;
      userId: string;
      notes?: string;
    }) => {
      // Check contacts limit before importing journalist reference
      const { auth } = await import('@/lib/firebase/client-init');
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const limitCheckResponse = await fetch('/api/usage/check-contacts-limit?count=1', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!limitCheckResponse.ok) {
        throw new Error('Limit-Check fehlgeschlagen');
      }

      const limitCheck = await limitCheckResponse.json();

      if (!limitCheck.allowed) {
        throw new Error(
          `Kontakte-Limit erreicht (${limitCheck.current} / ${limitCheck.limit}). Bitte upgraden Sie Ihren Plan, um weitere Journalist-Verweise zu importieren.`
        );
      }

      return multiEntityService.createJournalistReference(
        data.journalistId,
        data.organizationId,
        data.userId,
        data.notes || `Importiert als Verweis am ${new Date().toLocaleDateString('de-DE')}`
      );
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['editors', 'imported', variables.organizationId]
      });

      // Auto-Sync usage after journalist reference import
      try {
        const { auth } = await import('@/lib/firebase/client-init');
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          await fetch('/api/admin/sync-usage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (syncError) {
        // Silent fail - sync will happen on next page load
      }
    },
  });
}

// Mutation: Remove Journalist Reference
export function useRemoveJournalistReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      journalistId: string;
      organizationId: string;
    }) => {
      await multiEntityService.removeJournalistReference(
        data.journalistId,
        data.organizationId
      );
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['editors', 'imported', variables.organizationId]
      });

      // Auto-Sync usage after journalist reference removal
      try {
        const { auth } = await import('@/lib/firebase/client-init');
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          await fetch('/api/admin/sync-usage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (syncError) {
        // Silent fail - sync will happen on next page load
      }
    },
  });
}

// Query: Load Companies (local + global)
export function useCompanies(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'companies', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');

      const localCompanies = await companiesEnhancedService.getAll(organizationId);

      // Globale Companies
      let globalCompanies: CompanyEnhanced[] = [];
      try {
        const globalCompaniesQuery = query(
          collection(db, 'companies_enhanced'),
          where('isGlobal', '==', true)
        );
        const globalSnapshot = await getDocs(globalCompaniesQuery);
        globalCompanies = globalSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CompanyEnhanced[];
      } catch (e) {
        console.error('Fehler beim Laden globaler Companies:', e);
      }

      // Fallback: SuperAdmin Companies
      if (globalCompanies.length === 0) {
        try {
          globalCompanies = await companiesEnhancedService.getAll('superadmin-org');
        } catch (e) {
          console.error('Fehler beim Laden von SuperAdmin Companies:', e);
        }
      }

      // Kombiniere ohne Duplikate
      const combined = [...localCompanies];
      globalCompanies.forEach(globalComp => {
        if (!combined.find(localComp => localComp.id === globalComp.id)) {
          combined.push(globalComp);
        }
      });

      return combined;
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 Minuten (selten ändernd)
  });
}

// Query: Load Publications (local + referenced)
export function usePublications(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'publications', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      return publicationService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}

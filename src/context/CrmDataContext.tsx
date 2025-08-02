// src/context/CrmDataContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { CompanyEnhanced, ContactEnhanced, Tag } from '@/types/crm-enhanced';
import { companiesEnhancedService, contactsEnhancedService, tagsEnhancedService } from '@/lib/firebase/crm-service-enhanced';

interface CrmDataContextType {
  companies: CompanyEnhanced[];
  contacts: ContactEnhanced[];
  tags: Tag[];
  loading: boolean;
  error: Error | null;
  refreshData: () => void;
}

const CrmDataContext = createContext<CrmDataContextType | undefined>(undefined);

export function CrmDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    // Warte bis Organisation geladen ist
    if (!user || !currentOrganization || orgLoading) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Verwende die aktuelle Organisation statt user.uid
      const orgId = currentOrganization.id;
      
      
      const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesEnhancedService.getAll(orgId),
        contactsEnhancedService.getAll(orgId),
        tagsEnhancedService.getAllAsLegacyTags(orgId),
      ]);
      
      
      setCompanies(companiesData);
      setContacts(contactsData);
      setTags(tagsData);
    } catch (err: any) {
      console.error("Fehler im CrmDataContext:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization, orgLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const value = {
    companies,
    contacts,
    tags,
    loading,
    error,
    refreshData: fetchData
  };

  return (
    <CrmDataContext.Provider value={value}>
      {children}
    </CrmDataContext.Provider>
  );
}

export function useCrmData() {
  const context = useContext(CrmDataContext);
  if (context === undefined) {
    throw new Error('useCrmData muss innerhalb eines CrmDataProvider verwendet werden');
  }
  return context;
}
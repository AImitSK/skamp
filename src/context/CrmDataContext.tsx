// src/context/CrmDataContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Company, Contact, Tag } from '@/types/crm';
import { companiesService, contactsService, tagsService } from '@/lib/firebase/crm-service';

interface CrmDataContextType {
  companies: Company[];
  contacts: Contact[];
  tags: Tag[];
  loading: boolean;
  error: Error | null;
  refreshData: () => void;
}

const CrmDataContext = createContext<CrmDataContextType | undefined>(undefined);

export function CrmDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
        setLoading(false);
        return;
    };
    setLoading(true);
    setError(null);
    try {
      const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesService.getAll(user.uid),
        contactsService.getAll(user.uid),
        tagsService.getAll(user.uid),
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
  }, [user]);

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
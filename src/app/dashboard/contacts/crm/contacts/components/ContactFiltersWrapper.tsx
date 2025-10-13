// src/app/dashboard/contacts/crm/contacts/components/ContactFiltersWrapper.tsx
"use client";

import { useMemo } from 'react';
import { ContactFilters } from './ContactFilters';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';

export interface ContactFiltersWrapperProps {
  selectedCompanyIds: string[];
  selectedTagIds: string[];
  journalistsOnly: boolean;
  onCompanyChange: (companyIds: string[]) => void;
  onTagChange: (tagIds: string[]) => void;
  onJournalistToggle: (value: boolean) => void;
  availableCompanies: CompanyEnhanced[];
  availableTags: Tag[];
  contacts: ContactEnhanced[];
}

/**
 * ContactFilters Wrapper Component
 *
 * Transformiert CompanyEnhanced[] zu companyOptions und filtert
 * nur verwendete Firmen.
 *
 * @component
 */
export function ContactFiltersWrapper({
  selectedCompanyIds,
  selectedTagIds,
  journalistsOnly,
  onCompanyChange,
  onTagChange,
  onJournalistToggle,
  availableCompanies,
  availableTags,
  contacts
}: ContactFiltersWrapperProps) {
  // Defensive: Stelle sicher, dass Arrays nie undefined sind
  const safeCompanies = availableCompanies || [];
  const safeTags = availableTags || [];
  const safeContacts = contacts || [];

  // Erstelle companyOptions von den verwendeten Firmen
  const companyOptions = useMemo(() => {
    const usedCompanyIds = new Set<string>();
    safeContacts.forEach(contact => {
      if (contact.companyId) {
        usedCompanyIds.add(contact.companyId);
      }
    });

    return safeCompanies
      .filter(company => company.id && usedCompanyIds.has(company.id))
      .map(company => ({
        value: company.id!,
        label: company.name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [safeCompanies, safeContacts]);

  return (
    <ContactFilters
      selectedCompanyIds={selectedCompanyIds}
      selectedTagIds={selectedTagIds}
      onCompanyChange={onCompanyChange}
      onTagChange={onTagChange}
      availableTags={safeTags}
      companyOptions={companyOptions}
      contacts={safeContacts}
    />
  );
}

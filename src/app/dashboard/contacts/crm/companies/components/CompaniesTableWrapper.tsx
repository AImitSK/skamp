// src/app/dashboard/contacts/crm/companies/components/CompaniesTableWrapper.tsx
"use client";

import { useMemo } from 'react';
import { CompaniesTable } from './CompaniesTable';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';

const COUNTRY_NAMES: Record<string, string> = {
  'DE': 'Deutschland',
  'AT': 'Österreich',
  'CH': 'Schweiz',
  'US': 'USA',
  'GB': 'Großbritannien',
  'FR': 'Frankreich',
  'IT': 'Italien',
  'ES': 'Spanien',
  'NL': 'Niederlande',
  'BE': 'Belgien',
  'LU': 'Luxemburg',
  'PL': 'Polen',
  'CZ': 'Tschechien',
  'DK': 'Dänemark',
  'SE': 'Schweden',
  'NO': 'Norwegen',
  'FI': 'Finnland'
};

export interface CompaniesTableWrapperProps {
  companies: CompanyEnhanced[];
  selectedIds: Set<string>;
  contacts: ContactEnhanced[];
  tags: Tag[];
  onSelect: React.Dispatch<React.SetStateAction<Set<string>>>;
  onView: (id: string) => void;
  onEdit: (company: CompanyEnhanced) => void;
  onDelete: (id: string, name: string) => void;
}

/**
 * CompaniesTable Wrapper Component
 *
 * Transformiert einfache Props (tags[], contacts[]) in die benötigten
 * Datenstrukturen (tagsMap, getContactCount, etc.) für die CompaniesTable.
 *
 * @component
 */
export function CompaniesTableWrapper({
  companies,
  selectedIds,
  contacts,
  tags,
  onSelect,
  onView,
  onEdit,
  onDelete
}: CompaniesTableWrapperProps) {
  // Defensive: Stelle sicher, dass Arrays nie undefined sind
  const safeCompanies = companies || [];
  const safeContacts = contacts || [];
  const safeTags = tags || [];

  // Tags Map erstellen
  const tagsMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    safeTags.forEach(tag => {
      if (tag.id) {
        map.set(tag.id, { name: tag.name, color: tag.color });
      }
    });
    return map;
  }, [safeTags]);

  // Contact Count Funktion
  const getContactCount = useMemo(() => {
    return (companyId: string) => {
      return safeContacts.filter(contact => contact.companyId === companyId).length;
    };
  }, [safeContacts]);

  // Country Name Funktion
  const getCountryName = (countryCode?: string) => {
    if (!countryCode) return '';
    return COUNTRY_NAMES[countryCode] || countryCode;
  };

  // onSelectAll Handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(safeCompanies.map(c => c.id!).filter(Boolean));
      onSelect(allIds);
    } else {
      onSelect(new Set());
    }
  };

  // onSelect Handler (transformiert setState zu callback)
  const handleSelect = (id: string, checked: boolean) => {
    onSelect(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  return (
    <CompaniesTable
      companies={safeCompanies}
      selectedIds={selectedIds}
      onSelectAll={handleSelectAll}
      onSelect={handleSelect}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      tagsMap={tagsMap}
      getContactCount={getContactCount}
      getCountryName={getCountryName}
    />
  );
}

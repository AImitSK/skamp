// src/app/dashboard/contacts/crm/companies/components/CompaniesTableWrapper.tsx
"use client";

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CompaniesTable } from './CompaniesTable';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';

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

  // i18n hook for country names
  const t = useTranslations('crm.companiesTable');

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

  // Country Name Funktion - now using i18n
  const getCountryName = (countryCode?: string) => {
    if (!countryCode) return '';

    // Try to get translated country name, fallback to country code
    const key = `countries.${countryCode}` as any;
    const translated = t(key);

    // If translation key equals the output, it means no translation exists
    // In that case, return the country code
    return translated === key ? countryCode : translated;
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

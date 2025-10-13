// src/app/dashboard/contacts/crm/contacts/components/ContactsTableWrapper.tsx
"use client";

import { ContactsTable } from './ContactsTable';
import { ContactEnhanced, CompanyEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';

export interface ContactsTableWrapperProps {
  contacts: ContactEnhanced[];
  selectedIds: Set<string>;
  companies: CompanyEnhanced[];
  tags: Tag[];
  onSelect: React.Dispatch<React.SetStateAction<Set<string>>>;
  onView: (id: string) => void;
  onEdit: (contact: ContactEnhanced) => void;
  onDelete: (id: string, name: string) => void;
}

/**
 * ContactsTable Wrapper Component
 *
 * Transformiert einfache Props in die benötigten Datenstrukturen
 * und Utility-Funktionen für die ContactsTable.
 *
 * @component
 */
export function ContactsTableWrapper({
  contacts,
  selectedIds,
  companies,
  tags,
  onSelect,
  onView,
  onEdit,
  onDelete
}: ContactsTableWrapperProps) {
  // Defensive: Stelle sicher, dass Arrays nie undefined sind
  const safeContacts = contacts || [];
  const safeTags = tags || [];

  // onSelectAll Handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(safeContacts.map(c => c.id!).filter(Boolean));
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

  // Primary Email Funktion
  const getPrimaryEmail = (emails?: Array<{ email: string; isPrimary?: boolean }>) => {
    if (!emails || emails.length === 0) return '';
    const primary = emails.find(e => e.isPrimary);
    return primary?.email || emails[0]?.email || '';
  };

  // Primary Phone Funktion
  const getPrimaryPhone = (phones?: Array<{ number: string; countryCode?: string; isPrimary?: boolean }>) => {
    if (!phones || phones.length === 0) return '';
    const primary = phones.find(p => p.isPrimary);
    return primary?.number || phones[0]?.number || '';
  };

  return (
    <ContactsTable
      contacts={safeContacts}
      selectedIds={selectedIds}
      onSelectAll={handleSelectAll}
      onSelect={handleSelect}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      tags={safeTags}
      getPrimaryEmail={getPrimaryEmail}
      getPrimaryPhone={getPrimaryPhone}
    />
  );
}

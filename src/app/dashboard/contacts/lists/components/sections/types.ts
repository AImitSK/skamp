// src/app/dashboard/contacts/lists/components/sections/types.ts

import { DistributionList, ListFilters } from "@/types/lists";

/**
 * Props für alle Section-Komponenten
 */
export interface SectionProps {
  formData: Partial<DistributionList>;
  onFilterChange: (filterKey: keyof ListFilters, value: any) => void;
  onFormDataChange: (updates: Partial<DistributionList>) => void;
}

/**
 * Props für die BasicInfoSection
 */
export interface BasicInfoSectionProps {
  formData: Partial<DistributionList>;
  onFormDataChange: (updates: Partial<DistributionList>) => void;
}

/**
 * Props für die PreviewSection
 */
export interface PreviewSectionProps {
  previewContacts: any[];
  previewCount: number;
  loadingPreview: boolean;
  listType: 'dynamic' | 'static';
}

/**
 * Props für die ContactSelectorSection
 */
export interface ContactSelectorSectionProps {
  contactCount: number;
  onOpenSelector: () => void;
}

/**
 * Extended Company Type Labels
 */
export const extendedCompanyTypeLabels = {
  customer: 'Kunde',
  competitor: 'Wettbewerber',
  partner: 'Partner',
  supplier: 'Lieferant',
  other: 'Sonstiges',
  publisher: 'Verlag',
  media_house: 'Medienhaus',
  agency: 'Agentur'
} as const;

/**
 * Format Contact Name Helper
 */
export function formatContactName(contact: any): string {
  if ('name' in contact && typeof contact.name === 'object') {
    // Enhanced Contact
    const parts = [];
    if (contact.name.title) parts.push(contact.name.title);
    if (contact.name.firstName) parts.push(contact.name.firstName);
    if (contact.name.lastName) parts.push(contact.name.lastName);
    return parts.join(' ') || contact.displayName;
  } else {
    // Legacy Contact
    return `${contact.firstName} ${contact.lastName}`;
  }
}

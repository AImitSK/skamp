// src/app/dashboard/contacts/lists/components/sections/PersonFiltersSection.tsx
"use client";

import { useMemo } from "react";
import { UsersIcon, EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { useCrmData } from "@/context/CrmDataContext";
import { LANGUAGE_NAMES } from "@/types/international";
import { CONTACT_STATUS_OPTIONS } from "@/types/crm-enhanced";
import { SectionProps } from './types';

export function PersonFiltersSection({ formData, onFilterChange }: SectionProps) {
  const { contacts, tags } = useCrmData();

  // Extract available languages from contacts
  const availableLanguages = useMemo(() => {
    const languages = new Set<string>();
    contacts.forEach(contact => {
      if ('communicationPreferences' in contact) {
        const enhanced = contact as any;
        if (enhanced.communicationPreferences?.preferredLanguage) {
          languages.add(enhanced.communicationPreferences.preferredLanguage);
        }
      }
    });
    return Array.from(languages).sort();
  }, [contacts]);

  // Extract available positions from contacts
  const availablePositions = useMemo(() => {
    const positions = new Set<string>();
    contacts.forEach(contact => {
      if ('position' in contact && contact.position) {
        positions.add(contact.position as string);
      }
    });
    return Array.from(positions).sort();
  }, [contacts]);

  // Memoize language options to prevent recreation on every render
  const languageOptions = useMemo(() =>
    availableLanguages.map(lang => ({
      value: lang,
      label: LANGUAGE_NAMES[lang] || lang
    })),
    [availableLanguages]
  );

  // Memoize position options
  const positionOptions = useMemo(() =>
    availablePositions.map(pos => ({ value: pos, label: pos })),
    [availablePositions]
  );

  // Memoize tag options (for contact tags)
  const tagOptions = useMemo(() =>
    tags.map(tag => ({ value: tag.id!, label: tag.name })),
    [tags]
  );

  // Memoize status options
  const statusOptions = useMemo(() =>
    CONTACT_STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
    []
  );

  return (
    <div className="space-y-4 rounded-md border p-4 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <UsersIcon className="h-4 w-4 text-gray-400" />
        Personen-Filter
      </div>

      <div className="space-y-4">
        {/* Tags - wichtigstes Filter */}
        <MultiSelectDropdown
          label="Kontakt-Tags"
          placeholder="Alle Tags"
          options={tagOptions}
          selectedValues={formData.filters?.contactTagIds || []}
          onChange={(values) => onFilterChange('contactTagIds', values)}
        />

        {/* Positionen */}
        {availablePositions.length > 0 && (
          <MultiSelectDropdown
            label="Positionen"
            placeholder="Alle Positionen"
            options={positionOptions}
            selectedValues={formData.filters?.positions || []}
            onChange={(values) => onFilterChange('positions', values)}
          />
        )}

        {/* Status */}
        <MultiSelectDropdown
          label="Kontakt-Status"
          placeholder="Alle Status"
          options={statusOptions}
          selectedValues={formData.filters?.contactStatus || []}
          onChange={(values) => onFilterChange('contactStatus', values)}
        />

        {/* Sprachen */}
        {availableLanguages.length > 0 && (
          <MultiSelectDropdown
            label="Bevorzugte Sprachen"
            placeholder="Alle Sprachen"
            options={languageOptions}
            selectedValues={formData.filters?.languages || []}
            onChange={(values) => onFilterChange('languages', values)}
          />
        )}

        {/* Kontaktdaten */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative flex items-center">
            <Checkbox
              checked={formData.filters?.hasEmail || false}
              onChange={(checked) => onFilterChange('hasEmail', checked)}
            />
            <label className="ml-3 flex items-center text-sm text-gray-900">
              <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
              Hat E-Mail
            </label>
          </div>
          <div className="relative flex items-center">
            <Checkbox
              checked={formData.filters?.hasPhone || false}
              onChange={(checked) => onFilterChange('hasPhone', checked)}
            />
            <label className="ml-3 flex items-center text-sm text-gray-900">
              <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
              Hat Telefon
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

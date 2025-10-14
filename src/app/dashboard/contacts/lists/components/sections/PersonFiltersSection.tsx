// src/app/dashboard/contacts/lists/components/sections/PersonFiltersSection.tsx
"use client";

import { useMemo } from "react";
import { UsersIcon, EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { useCrmData } from "@/context/CrmDataContext";
import { LANGUAGE_NAMES } from "@/types/international";
import { SectionProps } from './types';

export function PersonFiltersSection({ formData, onFilterChange }: SectionProps) {
  const { contacts } = useCrmData();

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

  return (
    <div className="space-y-4 rounded-md border p-4 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <UsersIcon className="h-4 w-4 text-gray-400" />
        Personen-Filter
      </div>

      <div className="space-y-4">
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

        {availableLanguages.length > 0 && (
          <MultiSelectDropdown
            label="Bevorzugte Sprachen"
            placeholder="Alle Sprachen"
            options={availableLanguages.map(lang => ({
              value: lang,
              label: LANGUAGE_NAMES[lang] || lang
            }))}
            selectedValues={formData.filters?.languages || []}
            onChange={(values) => onFilterChange('languages', values)}
          />
        )}
      </div>
    </div>
  );
}

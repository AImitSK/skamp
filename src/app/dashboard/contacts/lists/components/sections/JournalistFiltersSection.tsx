// src/app/dashboard/contacts/lists/components/sections/JournalistFiltersSection.tsx
"use client";

import { useMemo } from "react";
import { NewspaperIcon } from "@heroicons/react/24/outline";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { useCrmData } from "@/context/CrmDataContext";
import { SectionProps } from './types';

export function JournalistFiltersSection({ formData, onFilterChange }: SectionProps) {
  const { contacts } = useCrmData();

  // Extract beats from journalist profiles
  const availableBeats = useMemo(() => {
    const beats = new Set<string>();
    contacts.forEach(contact => {
      if ('mediaProfile' in contact) {
        const enhanced = contact as any;
        if (enhanced.mediaProfile?.beats) {
          enhanced.mediaProfile.beats.forEach((beat: string) => beats.add(beat));
        }
      }
    });
    return Array.from(beats).sort();
  }, [contacts]);

  // Memoize beat options to prevent recreation on every render
  const beatOptions = useMemo(() =>
    availableBeats.map(beat => ({ value: beat, label: beat })),
    [availableBeats]
  );

  if (availableBeats.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-md border p-4 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <NewspaperIcon className="h-4 w-4 text-gray-400" />
        Journalisten-Filter
      </div>

      <div className="space-y-4">
        <MultiSelectDropdown
          label="Ressorts/Beats"
          placeholder="Alle Ressorts"
          options={beatOptions}
          selectedValues={formData.filters?.beats || []}
          onChange={(values) => onFilterChange('beats', values)}
        />
      </div>
    </div>
  );
}

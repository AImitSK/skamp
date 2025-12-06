// src/app/dashboard/contacts/lists/components/sections/JournalistFiltersSection.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { NewspaperIcon } from "@heroicons/react/24/outline";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { useCrmData } from "@/context/CrmDataContext";
import { publicationService } from "@/lib/firebase/library-service";
import { Publication } from "@/types/library";
import { SectionProps } from './types';

interface JournalistFiltersSectionProps extends SectionProps {
  organizationId?: string;
}

export function JournalistFiltersSection({ formData, onFilterChange, organizationId }: JournalistFiltersSectionProps) {
  const { contacts } = useCrmData();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(false);

  // Load publications for the linked publications filter
  useEffect(() => {
    if (!organizationId) return;

    const loadPublications = async () => {
      setLoadingPublications(true);
      try {
        const pubs = await publicationService.getAll(organizationId);
        setPublications(pubs);
      } catch (error) {
        console.error('Fehler beim Laden der Publikationen:', error);
      } finally {
        setLoadingPublications(false);
      }
    };
    loadPublications();
  }, [organizationId]);

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

  // Memoize publication options
  const publicationOptions = useMemo(() =>
    publications.map(pub => ({
      value: pub.id!,
      label: `${pub.title}${pub.publisherName ? ` (${pub.publisherName})` : ''}`
    })),
    [publications]
  );

  return (
    <div className="space-y-4 rounded-md border p-4 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <NewspaperIcon className="h-4 w-4 text-gray-400" />
        Journalisten-Filter
      </div>

      <div className="space-y-4">
        {/* Nur Journalisten */}
        <div className="relative flex items-center">
          <Checkbox
            checked={formData.filters?.onlyJournalists || false}
            onChange={(checked) => onFilterChange('onlyJournalists', checked)}
          />
          <label className="ml-3 flex items-center text-sm text-gray-900">
            <NewspaperIcon className="h-4 w-4 mr-1 text-gray-400" />
            Nur Journalisten
          </label>
        </div>

        {/* Ressorts/Beats */}
        {availableBeats.length > 0 && (
          <MultiSelectDropdown
            label="Ressorts/Beats"
            placeholder="Alle Ressorts"
            options={beatOptions}
            selectedValues={formData.filters?.beats || []}
            onChange={(values) => onFilterChange('beats', values)}
          />
        )}

        {/* Verknüpfte Publikationen */}
        {publications.length > 0 && (
          <MultiSelectDropdown
            label="Verknüpfte Publikationen"
            placeholder={loadingPublications ? "Laden..." : "Alle Publikationen"}
            options={publicationOptions}
            selectedValues={formData.filters?.linkedPublicationIds || []}
            onChange={(values) => onFilterChange('linkedPublicationIds', values)}
          />
        )}
      </div>
    </div>
  );
}

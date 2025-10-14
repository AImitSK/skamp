// src/components/listen/PublicationFilterSection.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { publicationService } from '@/lib/firebase/library-service';
import { Publication, PUBLICATION_TYPE_LABELS, PUBLICATION_FREQUENCY_LABELS } from '@/types/library';
import { COUNTRY_NAMES, LANGUAGE_NAMES } from '@/types/international';
import { ListFilters } from '@/types/lists';
import {
  NewspaperIcon,
  GlobeAltIcon,
  LanguageIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  TagIcon
} from '@heroicons/react/20/solid';

interface PublicationFilterSectionProps {
  filters: ListFilters['publications'];
  organizationId: string;
  onChange: (filters: ListFilters['publications']) => void;
}

export default function PublicationFilterSection({ 
  filters = {}, 
  organizationId, 
  onChange 
}: PublicationFilterSectionProps) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  // Lade alle Publikationen
  useEffect(() => {
    const loadPublications = async () => {
      setLoading(true);
      try {
        const pubs = await publicationService.getAll(organizationId);
        setPublications(pubs);
      } catch (error) {
        console.error('Fehler beim Laden der Publikationen:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPublications();
  }, [organizationId]);

  // Aggregierte Optionen
  const options = useMemo(() => {
    const types = new Set<string>();
    const formats = new Set<string>();
    const frequencies = new Set<string>();
    const focusAreas = new Set<string>();
    const languages = new Set<string>();
    const countries = new Set<string>();
    const publishers = new Map<string, string>();
    const industries = new Set<string>();

    // Schutz gegen undefined publications
    if (!publications || !Array.isArray(publications)) {
      return {
        types: [],
        formats: [],
        frequencies: [],
        focusAreas: [],
        languages: [],
        countries: [],
        publishers: [],
        industries: []
      };
    }

    publications.forEach(pub => {
      if (pub.type) types.add(pub.type);
      if (pub.format) formats.add(pub.format);
      if (pub.metrics?.frequency) frequencies.add(pub.metrics.frequency);
      
      if (pub.focusAreas && Array.isArray(pub.focusAreas)) {
        pub.focusAreas.forEach(area => focusAreas.add(area));
      }
      if (pub.languages && Array.isArray(pub.languages)) {
        pub.languages.forEach(lang => languages.add(lang));
      }
      if (pub.geographicTargets && Array.isArray(pub.geographicTargets)) {
        pub.geographicTargets.forEach(country => countries.add(country));
      }
      
      if (pub.publisherId && pub.publisherName) {
        publishers.set(pub.publisherId, pub.publisherName);
      }
      
      if (pub.targetIndustries && Array.isArray(pub.targetIndustries)) {
        pub.targetIndustries.forEach(industry => industries.add(industry));
      }
    });

    return {
      types: Array.from(types),
      formats: Array.from(formats),
      frequencies: Array.from(frequencies),
      focusAreas: Array.from(focusAreas).sort(),
      languages: Array.from(languages),
      countries: Array.from(countries),
      publishers: Array.from(publishers.entries()).map(([id, name]) => ({ id, name })),
      industries: Array.from(industries).sort()
    };
  }, [publications]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const applyPreset = (preset: typeof PUBLICATION_FILTER_PRESETS[0]) => {
    onChange(preset.filters);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Lade Publikationen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basis-Filter */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('basic')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <NewspaperIcon className="h-5 w-5 text-gray-400" />
            Publikations-Auswahl
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('basic') ? '−' : '+'}
          </span>
        </button>
        
        {expandedSections.has('basic') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label="Spezifische Publikationen"
              placeholder="Alle Publikationen"
              options={publications.map(p => ({
                value: p.id!,
                label: `${p.title} ${p.publisherName ? `(${p.publisherName})` : ''}`
              }))}
              selectedValues={filters.publicationIds || []}
              onChange={(values) => onChange({ ...filters, publicationIds: values })}
            />

            <MultiSelectDropdown
              label="Publikationstypen"
              placeholder="Alle Typen"
              options={options.types.map(type => ({
                value: type,
                label: PUBLICATION_TYPE_LABELS[type as keyof typeof PUBLICATION_TYPE_LABELS] || type
              }))}
              selectedValues={filters.types || []}
              onChange={(values) => onChange({ ...filters, types: values as any })}
            />

            <MultiSelectDropdown
              label="Formate"
              placeholder="Alle Formate"
              options={[
                { value: 'print', label: 'Print' },
                { value: 'online', label: 'Online' },
                { value: 'both', label: 'Print & Online' },
                { value: 'broadcast', label: 'Broadcast' }
              ]}
              selectedValues={filters.formats || []}
              onChange={(values) => onChange({ ...filters, formats: values as any })}
            />

            <MultiSelectDropdown
              label="Erscheinungsweise"
              placeholder="Alle Frequenzen"
              options={options.frequencies.map(freq => ({
                value: freq,
                label: PUBLICATION_FREQUENCY_LABELS[freq as keyof typeof PUBLICATION_FREQUENCY_LABELS] || freq
              }))}
              selectedValues={filters.frequencies || []}
              onChange={(values) => onChange({ ...filters, frequencies: values as any })}
            />
          </div>
        )}
      </div>

      {/* Geografische Filter */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('geographic')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-gray-400" />
            Geografisch
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('geographic') ? '−' : '+'}
          </span>
        </button>
        
        {expandedSections.has('geographic') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label="Zielländer"
              placeholder="Alle Länder"
              options={options.countries.map(c => ({
                value: c,
                label: COUNTRY_NAMES[c] || c
              }))}
              selectedValues={filters.countries || []}
              onChange={(values) => onChange({ ...filters, countries: values as any })}
            />

            <MultiSelectDropdown
              label="Reichweite"
              placeholder="Alle Reichweiten"
              options={[
                { value: 'local', label: 'Lokal' },
                { value: 'regional', label: 'Regional' },
                { value: 'national', label: 'National' },
                { value: 'international', label: 'International' },
                { value: 'global', label: 'Global' }
              ]}
              selectedValues={filters.geographicScopes || []}
              onChange={(values) => onChange({ ...filters, geographicScopes: values as any })}
            />

            <MultiSelectDropdown
              label="Sprachen"
              placeholder="Alle Sprachen"
              options={options.languages.map(lang => ({
                value: lang,
                label: LANGUAGE_NAMES[lang] || lang
              }))}
              selectedValues={filters.languages || []}
              onChange={(values) => onChange({ ...filters, languages: values as any })}
            />
          </div>
        )}
      </div>

      {/* Thematische Filter */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('thematic')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-gray-400" />
            Thematisch
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('thematic') ? '−' : '+'}
          </span>
        </button>
        
        {expandedSections.has('thematic') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label="Themenschwerpunkte"
              placeholder="Alle Themen"
              options={options.focusAreas.map(area => ({
                value: area,
                label: area
              }))}
              selectedValues={filters.focusAreas || []}
              onChange={(values) => onChange({ ...filters, focusAreas: values })}
            />

            {options.industries.length > 0 && (
              <MultiSelectDropdown
                label="Zielbranchen"
                placeholder="Alle Branchen"
                options={options.industries.map(ind => ({
                  value: ind,
                  label: ind
                }))}
                selectedValues={filters.targetIndustries || []}
                onChange={(values) => onChange({ ...filters, targetIndustries: values })}
              />
            )}
          </div>
        )}
      </div>

      {/* Metriken */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('metrics')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
            Reichweite & Metriken
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('metrics') ? '−' : '+'}
          </span>
        </button>
        
        {expandedSections.has('metrics') && (
          <div className="space-y-4 pl-7">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Min. Druckauflage</Label>
                <Input
                  type="number"
                  value={filters.minPrintCirculation || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    minPrintCirculation: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="z.B. 5000"
                />
              </Field>
              
              <Field>
                <Label>Max. Druckauflage</Label>
                <Input
                  type="number"
                  value={filters.maxPrintCirculation || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    maxPrintCirculation: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="z.B. 100000"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Min. Online-Besucher/Monat</Label>
                <Input
                  type="number"
                  value={filters.minOnlineVisitors || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    minOnlineVisitors: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="z.B. 50000"
                />
              </Field>
              
              <Field>
                <Label>Max. Online-Besucher/Monat</Label>
                <Input
                  type="number"
                  value={filters.maxOnlineVisitors || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    maxOnlineVisitors: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="z.B. 1000000"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Verlage & Qualität */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('quality')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
            Verlage & Qualität
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('quality') ? '−' : '+'}
          </span>
        </button>
        
        {expandedSections.has('quality') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label="Verlage/Medienhäuser"
              placeholder="Alle Verlage"
              options={options.publishers.map(pub => ({
                value: pub.id,
                label: pub.name
              }))}
              selectedValues={filters.publisherIds || []}
              onChange={(values) => onChange({ ...filters, publisherIds: values })}
            />

            <div className="flex items-center gap-3">
              <Checkbox
                checked={filters.onlyVerified || false}
                onChange={(checked) => onChange({ ...filters, onlyVerified: checked })}
              />
              <label className="text-sm text-gray-700">
                Nur verifizierte Publikationen
              </label>
            </div>

            <MultiSelectDropdown
              label="Status"
              placeholder="Alle Status"
              options={[
                { value: 'active', label: 'Aktiv' },
                { value: 'inactive', label: 'Inaktiv' },
                { value: 'discontinued', label: 'Eingestellt' }
              ]}
              selectedValues={filters.status || []}
              onChange={(values) => onChange({ ...filters, status: values as any })}
            />
          </div>
        )}
      </div>

      {/* Aktive Filter-Zusammenfassung */}
      {Object.keys(filters).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Aktive Filter</h4>
            <Button
              plain
              onClick={() => onChange({})}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Alle zurücksetzen
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.publicationIds?.length ? (
              <Badge color="blue">
                {filters.publicationIds.length} Publikationen ausgewählt
              </Badge>
            ) : null}
            {filters.types?.length ? (
              <Badge color="purple">
                {filters.types.length} Typen
              </Badge>
            ) : null}
            {filters.focusAreas?.length ? (
              <Badge color="green">
                {filters.focusAreas.length} Themenbereiche
              </Badge>
            ) : null}
            {filters.minPrintCirculation ? (
              <Badge color="amber">
                Auflage ≥ {filters.minPrintCirculation.toLocaleString()}
              </Badge>
            ) : null}
            {filters.onlyVerified ? (
              <Badge color="emerald">
                Nur verifiziert
              </Badge>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
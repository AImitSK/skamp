// src/components/listen/PublicationFilterSection.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('listen.publicationFilter');
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

  // applyPreset ist derzeit nicht verwendet - kann später aktiviert werden wenn Preset-UI implementiert wird
  // const applyPreset = (preset: typeof PUBLICATION_FILTER_PRESETS[0]) => {
  //   onChange(preset.filters);
  // };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">{t('loading')}</p>
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
            {t('sections.basic')}
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('basic') ? '−' : '+'}
          </span>
        </button>

        {expandedSections.has('basic') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label={t('labels.specificPublications')}
              placeholder={t('placeholders.allPublications')}
              options={publications.map(p => ({
                value: p.id!,
                label: `${p.title} ${p.publisherName ? `(${p.publisherName})` : ''}`
              }))}
              selectedValues={filters.publicationIds || []}
              onChange={(values) => onChange({ ...filters, publicationIds: values })}
            />

            <MultiSelectDropdown
              label={t('labels.publicationTypes')}
              placeholder={t('placeholders.allTypes')}
              options={options.types.map(type => ({
                value: type,
                label: PUBLICATION_TYPE_LABELS[type as keyof typeof PUBLICATION_TYPE_LABELS] || type
              }))}
              selectedValues={filters.types || []}
              onChange={(values) => onChange({ ...filters, types: values as any })}
            />

            <MultiSelectDropdown
              label={t('labels.formats')}
              placeholder={t('placeholders.allFormats')}
              options={[
                { value: 'print', label: t('formats.print') },
                { value: 'online', label: t('formats.digital') },
                { value: 'both', label: t('formats.printAndDigital') },
                { value: 'broadcast', label: t('formats.broadcast') },
                { value: 'audio', label: t('formats.audio') }
              ]}
              selectedValues={filters.formats || []}
              onChange={(values) => onChange({ ...filters, formats: values as any })}
            />

            <MultiSelectDropdown
              label={t('labels.frequency')}
              placeholder={t('placeholders.allFrequencies')}
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
            {t('sections.geographic')}
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('geographic') ? '−' : '+'}
          </span>
        </button>

        {expandedSections.has('geographic') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label={t('labels.targetCountries')}
              placeholder={t('placeholders.allCountries')}
              options={options.countries.map(c => ({
                value: c,
                label: COUNTRY_NAMES[c] || c
              }))}
              selectedValues={filters.countries || []}
              onChange={(values) => onChange({ ...filters, countries: values as any })}
            />

            <MultiSelectDropdown
              label={t('labels.reach')}
              placeholder={t('placeholders.allReaches')}
              options={[
                { value: 'local', label: t('reach.local') },
                { value: 'regional', label: t('reach.regional') },
                { value: 'national', label: t('reach.national') },
                { value: 'international', label: t('reach.international') },
                { value: 'global', label: t('reach.global') }
              ]}
              selectedValues={filters.geographicScopes || []}
              onChange={(values) => onChange({ ...filters, geographicScopes: values as any })}
            />

            <MultiSelectDropdown
              label={t('labels.languages')}
              placeholder={t('placeholders.allLanguages')}
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
            {t('sections.thematic')}
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('thematic') ? '−' : '+'}
          </span>
        </button>

        {expandedSections.has('thematic') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label={t('labels.focusAreas')}
              placeholder={t('placeholders.allTopics')}
              options={options.focusAreas.map(area => ({
                value: area,
                label: area
              }))}
              selectedValues={filters.focusAreas || []}
              onChange={(values) => onChange({ ...filters, focusAreas: values })}
            />

            {options.industries.length > 0 && (
              <MultiSelectDropdown
                label={t('labels.targetIndustries')}
                placeholder={t('placeholders.allIndustries')}
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
            {t('sections.metrics')}
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('metrics') ? '−' : '+'}
          </span>
        </button>

        {expandedSections.has('metrics') && (
          <div className="space-y-4 pl-7">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>{t('labels.minPrintCirculation')}</Label>
                <Input
                  type="number"
                  value={filters.minPrintCirculation || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    minPrintCirculation: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder={t('placeholders.exampleSmall')}
                />
              </Field>

              <Field>
                <Label>{t('labels.maxPrintCirculation')}</Label>
                <Input
                  type="number"
                  value={filters.maxPrintCirculation || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    maxPrintCirculation: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder={t('placeholders.exampleMedium')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>{t('labels.minOnlineVisitors')}</Label>
                <Input
                  type="number"
                  value={filters.minOnlineVisitors || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    minOnlineVisitors: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder={t('placeholders.exampleMedium2')}
                />
              </Field>

              <Field>
                <Label>{t('labels.maxOnlineVisitors')}</Label>
                <Input
                  type="number"
                  value={filters.maxOnlineVisitors || ''}
                  onChange={(e) => onChange({
                    ...filters,
                    maxOnlineVisitors: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder={t('placeholders.exampleLarge')}
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
            {t('sections.quality')}
          </h4>
          <span className="text-gray-400">
            {expandedSections.has('quality') ? '−' : '+'}
          </span>
        </button>

        {expandedSections.has('quality') && (
          <div className="space-y-4 pl-7">
            <MultiSelectDropdown
              label={t('labels.publishers')}
              placeholder={t('placeholders.allPublishers')}
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
                {t('labels.onlyVerified')}
              </label>
            </div>

            <MultiSelectDropdown
              label={t('labels.status')}
              placeholder={t('placeholders.allStatuses')}
              options={[
                { value: 'active', label: t('status.active') },
                { value: 'inactive', label: t('status.inactive') },
                { value: 'discontinued', label: t('status.discontinued') },
                { value: 'planned', label: t('status.planned') }
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
            <h4 className="text-sm font-medium text-gray-700">{t('activeFilters.title')}</h4>
            <Button
              plain
              onClick={() => onChange({})}
              className="text-xs text-red-600 hover:text-red-700"
            >
              {t('activeFilters.resetAll')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.publicationIds?.length ? (
              <Badge color="blue">
                {t('activeFilters.publicationsSelected', { count: filters.publicationIds.length })}
              </Badge>
            ) : null}
            {filters.types?.length ? (
              <Badge color="purple">
                {t('activeFilters.typesCount', { count: filters.types.length })}
              </Badge>
            ) : null}
            {filters.focusAreas?.length ? (
              <Badge color="green">
                {t('activeFilters.topicAreasCount', { count: filters.focusAreas.length })}
              </Badge>
            ) : null}
            {filters.minPrintCirculation ? (
              <Badge color="amber">
                {t('activeFilters.circulationMin', { value: filters.minPrintCirculation.toLocaleString() })}
              </Badge>
            ) : null}
            {filters.onlyVerified ? (
              <Badge color="emerald">
                {t('activeFilters.onlyVerified')}
              </Badge>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
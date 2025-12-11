// src/app/dashboard/contacts/lists/components/sections/CompanyFiltersSection.tsx
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { useCrmData } from "@/context/CrmDataContext";
import { COUNTRY_NAMES } from "@/types/international";
import { SectionProps, extendedCompanyTypeLabels } from './types';

export function CompanyFiltersSection({ formData, onFilterChange }: SectionProps) {
  const t = useTranslations('lists.sections.companyFilters');
  const tLabels = useTranslations('lists.companyTypeLabels');
  const { companies, tags } = useCrmData();

  // Memoize company type options with i18n labels
  const companyTypeOptions = useMemo(() =>
    Object.keys(extendedCompanyTypeLabels).map((key) => ({
      value: key,
      label: tLabels(key as any)
    })),
    [tLabels]
  );

  // Extract unique values from Enhanced Model
  const availableIndustries = useMemo(() =>
    Array.from(new Set(
      companies
        .map(c => c.industryClassification?.primary)
        .filter((item): item is string => !!item)
    )).sort(),
    [companies]
  );

  const availableCountries = useMemo(() =>
    Array.from(new Set(
      companies
        .map(c => c.mainAddress?.countryCode)
        .filter((item): item is string => !!item)
    )).sort(),
    [companies]
  );

  // Memoize dropdown options to prevent recreation on every render
  const industryOptions = useMemo(() =>
    availableIndustries.map(i => ({ value: i, label: i })),
    [availableIndustries]
  );

  const tagOptions = useMemo(() =>
    tags.map(tag => ({ value: tag.id!, label: tag.name })),
    [tags]
  );

  const countryOptions = useMemo(() =>
    availableCountries.map(c => ({
      value: c,
      label: COUNTRY_NAMES[c] || c
    })),
    [availableCountries]
  );

  return (
    <div className="space-y-4 rounded-md border p-4 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
        {t('title')}
      </div>

      <div className="space-y-4">
        <MultiSelectDropdown
          label={t('companyTypes.label')}
          placeholder={t('companyTypes.placeholder')}
          options={companyTypeOptions}
          selectedValues={formData.filters?.companyTypes || []}
          onChange={(values) => onFilterChange('companyTypes', values)}
        />

        <MultiSelectDropdown
          label={t('industries.label')}
          placeholder={t('industries.placeholder')}
          options={industryOptions}
          selectedValues={formData.filters?.industries || []}
          onChange={(values) => onFilterChange('industries', values)}
        />

        <MultiSelectDropdown
          label={t('tags.label')}
          placeholder={t('tags.placeholder')}
          options={tagOptions}
          selectedValues={formData.filters?.tagIds || []}
          onChange={(values) => onFilterChange('tagIds', values)}
        />

        <MultiSelectDropdown
          label={t('countries.label')}
          placeholder={t('countries.placeholder')}
          options={countryOptions}
          selectedValues={formData.filters?.countries || []}
          onChange={(values) => onFilterChange('countries', values)}
        />
      </div>
    </div>
  );
}

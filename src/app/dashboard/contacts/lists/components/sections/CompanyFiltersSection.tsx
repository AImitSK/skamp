// src/app/dashboard/contacts/lists/components/sections/CompanyFiltersSection.tsx
"use client";

import { useMemo } from "react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { useCrmData } from "@/context/CrmDataContext";
import { COUNTRY_NAMES } from "@/types/international";
import { SectionProps, extendedCompanyTypeLabels } from './types';

export function CompanyFiltersSection({ formData, onFilterChange }: SectionProps) {
  const { companies, tags } = useCrmData();

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

  return (
    <div className="space-y-4 rounded-md border p-4 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
        Firmen-Filter
      </div>

      <div className="space-y-4">
        <MultiSelectDropdown
          label="Firmentypen"
          placeholder="Alle Typen"
          options={Object.entries(extendedCompanyTypeLabels).map(([value, label]) => ({ value, label }))}
          selectedValues={formData.filters?.companyTypes || []}
          onChange={(values) => onFilterChange('companyTypes', values)}
        />

        <MultiSelectDropdown
          label="Branchen"
          placeholder="Alle Branchen"
          options={availableIndustries.map(i => ({ value: i, label: i }))}
          selectedValues={formData.filters?.industries || []}
          onChange={(values) => onFilterChange('industries', values)}
        />

        <MultiSelectDropdown
          label="Tags"
          placeholder="Alle Tags"
          options={tags.map(tag => ({ value: tag.id!, label: tag.name }))}
          selectedValues={formData.filters?.tagIds || []}
          onChange={(values) => onFilterChange('tagIds', values)}
        />

        <MultiSelectDropdown
          label="Länder"
          placeholder="Alle Länder"
          options={availableCountries.map(c => ({
            value: c,
            label: COUNTRY_NAMES[c] || c
          }))}
          selectedValues={formData.filters?.countries || []}
          onChange={(values) => onFilterChange('countries', values)}
        />
      </div>
    </div>
  );
}

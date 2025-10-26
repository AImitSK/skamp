// src/components/projects/distribution/components/details/ListFiltersDisplay.tsx
'use client';

import { Text } from '@/components/ui/text';
import { Tag } from '@/types/crm-enhanced';
import { Publication } from '@/types/library';
import {
  renderFilterValue,
  renderPublicationFilterValue,
  getFilterIcon,
  getPublicationFilterIcon,
  getFilterLabel,
  getPublicationFilterLabel,
} from '../../helpers/filter-helpers';

interface ListFiltersDisplayProps {
  filters: any;
  tags: Tag[];
  publications: Publication[];
}

export default function ListFiltersDisplay({
  filters,
  tags,
  publications,
}: ListFiltersDisplayProps) {
  if (!filters || Object.keys(filters).length === 0) return null;

  // Prüfe ob überhaupt aktive Filter vorhanden sind
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'publications') {
      return value && typeof value === 'object' && Object.values(value).some(v => v && (!Array.isArray(v) || v.length > 0));
    }
    return value && (!Array.isArray(value) || value.length > 0);
  });

  if (!hasActiveFilters) return null;

  // Basis-Filter (alles außer publications)
  const baseFilters = Object.entries(filters).filter(([key, value]) => {
    return key !== 'publications' && value && (!Array.isArray(value) || value.length > 0);
  });

  // Publikations-Filter
  const publicationFilters = filters.publications || null;
  const hasPublicationFilters = publicationFilters &&
    Object.entries(publicationFilters).some(([_, value]) => value && (!Array.isArray(value) || (value as any[]).length > 0));

  return (
    <div className="mb-6 space-y-4">
      {/* Basis-Filter */}
      {baseFilters.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center mb-3">
            <Text className="text-sm font-medium text-gray-900">Kontakt-Filter</Text>
          </div>
          <div className="space-y-3">
            {baseFilters.map(([key, value]) => {
              const Icon = getFilterIcon(key);
              const label = getFilterLabel(key);
              const displayValue = renderFilterValue(key, value, tags);

              return (
                <div key={key} className="flex items-start gap-3">
                  <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Text className="text-xs font-medium text-gray-700 mb-0.5">
                      {label}
                    </Text>
                    <Text className="text-sm text-gray-900 break-words">
                      {displayValue}
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Publikations-Filter */}
      {hasPublicationFilters && publicationFilters && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center mb-3">
            <Text className="text-sm font-medium text-gray-900">Publikations-Filter</Text>
          </div>
          <div className="space-y-3">
            {Object.entries(publicationFilters)
              .filter(([_, value]) => value && (!Array.isArray(value) || (value as any[]).length > 0))
              .map(([key, value]) => {
                const Icon = getPublicationFilterIcon(key);
                const label = getPublicationFilterLabel(key);
                const displayValue = renderPublicationFilterValue(key, value, publications);

                return (
                  <div key={key} className="flex items-start gap-3">
                    <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Text className="text-xs font-medium text-gray-700 mb-0.5">
                        {label}
                      </Text>
                      <Text className="text-sm text-gray-900 break-words">
                        {displayValue}
                      </Text>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// src/app/dashboard/contacts/crm/companies/components/CompanyFilters.tsx
"use client";

import { Fragment } from "react";
import { useTranslations } from 'next-intl';
import { Popover, Transition } from '@headlessui/react';
import { FunnelIcon } from "@heroicons/react/24/outline";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableFilter } from "@/components/ui/searchable-filter";
import { CompanyType, companyTypeLabels, Tag } from "@/types/crm";
import { CompanyEnhanced } from "@/types/crm-enhanced";
import clsx from 'clsx';

export interface CompanyFiltersProps {
  selectedTypes: CompanyType[];
  selectedTagIds: string[];
  onTypeChange: (types: CompanyType[]) => void;
  onTagChange: (tagIds: string[]) => void;
  availableTags: Tag[];
  companies: CompanyEnhanced[];
}

/**
 * Company Filters Component
 *
 * Filterpanel für Firmen mit Typ- und Tag-Auswahl.
 *
 * @component
 * @example
 * ```tsx
 * <CompanyFilters
 *   selectedTypes={selectedTypes}
 *   selectedTagIds={selectedCompanyTagIds}
 *   onTypeChange={setSelectedTypes}
 *   onTagChange={setSelectedCompanyTagIds}
 *   availableTags={tags}
 *   companies={filteredCompanies}
 * />
 * ```
 */
export function CompanyFilters({
  selectedTypes,
  selectedTagIds,
  onTypeChange,
  onTagChange,
  availableTags,
  companies
}: CompanyFiltersProps) {
  const t = useTranslations('companies.filters');
  const activeFiltersCount = selectedTypes.length + selectedTagIds.length;

  // Get tags that are actually used in the current filtered data
  const usedTagIds = new Set<string>();
  companies.forEach(company => {
    company.tagIds?.forEach(tagId => usedTagIds.add(tagId));
  });
  const usedTags = availableTags
    .filter(tag => tag.id && usedTagIds.has(tag.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleReset = () => {
    onTypeChange([]);
    onTagChange([]);
  };

  const typeOptions = Object.entries(companyTypeLabels).map(([value, label]) => ({
    value,
    label
  }));

  const tagOptions = usedTags.map(tag => ({
    value: tag.id!,
    label: tag.name
  }));

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={clsx(
              'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10',
              activeFiltersCount > 0
                ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            )}
            aria-label="Filter"
          >
            <FunnelIcon className="h-5 w-5 stroke-2" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                {activeFiltersCount}
              </span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px] origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Type Filter */}
                  <div className="mb-[10px]">
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('type')}
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {typeOptions.map((option) => {
                        const isChecked = selectedTypes.includes(option.value as CompanyType);

                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={isChecked}
                              onChange={(checked: boolean) => {
                                const newValues = checked
                                  ? [...selectedTypes, option.value as CompanyType]
                                  : selectedTypes.filter(v => v !== option.value);
                                onTypeChange(newValues);
                              }}
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tag Filter */}
                  <div className="mb-[10px]">
                    {tagOptions.length > 10 ? (
                      // Use SearchableFilter for large datasets
                      <SearchableFilter
                        label={t('tags')}
                        options={tagOptions}
                        selectedValues={selectedTagIds}
                        onChange={onTagChange}
                        placeholder={t('tagsSearchPlaceholder')}
                      />
                    ) : (
                      // Keep existing UI for small datasets
                      <>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          {t('tags')}
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {tagOptions.map((option) => {
                            const isChecked = selectedTagIds.includes(option.value);

                            return (
                              <label
                                key={option.value}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onChange={(checked: boolean) => {
                                    const newValues = checked
                                      ? [...selectedTagIds, option.value]
                                      : selectedTagIds.filter(v => v !== option.value);
                                    onTagChange(newValues);
                                  }}
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {option.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={handleReset}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
                    >
                      {t('reset')}
                    </button>
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

// src/app/dashboard/contacts/crm/contacts/components/ContactFilters.tsx
"use client";

import { Fragment } from "react";
import { Popover, Transition } from '@headlessui/react';
import { FunnelIcon } from "@heroicons/react/24/outline";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableFilter } from "@/components/ui/searchable-filter";
import { Tag } from "@/types/crm";
import { ContactEnhanced } from "@/types/crm-enhanced";
import clsx from 'clsx';

export interface ContactFiltersProps {
  selectedCompanyIds: string[];
  selectedTagIds: string[];
  onCompanyChange: (companyIds: string[]) => void;
  onTagChange: (tagIds: string[]) => void;
  availableTags: Tag[];
  companyOptions: Array<{ value: string; label: string }>;
  contacts: ContactEnhanced[];
}

/**
 * Contact Filters Component
 *
 * Filterpanel für Kontakte mit Firmen- und Tag-Auswahl.
 *
 * @component
 * @example
 * ```tsx
 * <ContactFilters
 *   selectedCompanyIds={selectedContactCompanyIds}
 *   selectedTagIds={selectedContactTagIds}
 *   onCompanyChange={setSelectedContactCompanyIds}
 *   onTagChange={setSelectedContactTagIds}
 *   availableTags={tags}
 *   companyOptions={companyOptions}
 *   contacts={filteredContacts}
 * />
 * ```
 */
export function ContactFilters({
  selectedCompanyIds,
  selectedTagIds,
  onCompanyChange,
  onTagChange,
  availableTags,
  companyOptions,
  contacts
}: ContactFiltersProps) {
  const activeFiltersCount = selectedCompanyIds.length + selectedTagIds.length;

  // Get tags that are actually used in the current filtered data
  const usedTagIds = new Set<string>();
  contacts.forEach(contact => {
    contact.tagIds?.forEach(tagId => usedTagIds.add(tagId));
  });
  const usedTags = availableTags
    .filter(tag => tag.id && usedTagIds.has(tag.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleReset = () => {
    onCompanyChange([]);
    onTagChange([]);
  };

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
                  {/* Company Filter */}
                  <div className="mb-[10px]">
                    {companyOptions.length > 10 ? (
                      // Use SearchableFilter for large datasets
                      <SearchableFilter
                        label="Firma"
                        options={companyOptions}
                        selectedValues={selectedCompanyIds}
                        onChange={onCompanyChange}
                        placeholder="Firma suchen..."
                      />
                    ) : (
                      // Keep existing UI for small datasets
                      <>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Firma
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {companyOptions.map((option) => {
                            const isChecked = selectedCompanyIds.includes(option.value);

                            return (
                              <label
                                key={option.value}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onChange={(checked: boolean) => {
                                    const newValues = checked
                                      ? [...selectedCompanyIds, option.value]
                                      : selectedCompanyIds.filter(v => v !== option.value);
                                    onCompanyChange(newValues);
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

                  {/* Tag Filter */}
                  <div className="mb-[10px]">
                    {tagOptions.length > 10 ? (
                      // Use SearchableFilter for large datasets
                      <SearchableFilter
                        label="Tags"
                        options={tagOptions}
                        selectedValues={selectedTagIds}
                        onChange={onTagChange}
                        placeholder="Tags suchen..."
                      />
                    ) : (
                      // Keep existing UI for small datasets
                      <>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Tags
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
                      Zurücksetzen
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

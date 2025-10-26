// src/components/projects/distribution/components/ListFilterButton.tsx
'use client';

import { Fragment, memo } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { FunnelIcon } from '@heroicons/react/24/outline';

interface FilterOption {
  value: string;
  label: string;
}

interface ListFilterButtonProps {
  categoryOptions: FilterOption[];
  typeOptions: FilterOption[];
  selectedCategories: string[];
  selectedTypes: string[];
  onCategoryChange: (values: string[]) => void;
  onTypeChange: (values: string[]) => void;
  onReset: () => void;
}

const ListFilterButton = memo(function ListFilterButton({
  categoryOptions,
  typeOptions,
  selectedCategories,
  selectedTypes,
  onCategoryChange,
  onTypeChange,
  onReset,
}: ListFilterButtonProps) {
  const activeFiltersCount = selectedCategories.length + selectedTypes.length;

  const handleCheckboxChange = (
    currentValues: string[],
    value: string,
    checked: boolean,
    onChange: (values: string[]) => void
  ) => {
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    onChange(newValues);
  };

  return (
    <Popover className="relative">
      <Popover.Button
        className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10 ${
          activeFiltersCount > 0
            ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
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
        <Popover.Panel className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Filter</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={onReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  type="button"
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            {/* Type Filter */}
            {typeOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ
                </label>
                <div className="space-y-2">
                  {typeOptions.map((option) => {
                    const isChecked = selectedTypes.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleCheckboxChange(
                              selectedTypes,
                              option.value,
                              e.target.checked,
                              onTypeChange
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Filter */}
            {categoryOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categoryOptions.map((option) => {
                    const isChecked = selectedCategories.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleCheckboxChange(
                              selectedCategories,
                              option.value,
                              e.target.checked,
                              onCategoryChange
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
});

export default ListFilterButton;

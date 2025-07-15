// src/components/filter-popover.tsx
'use client'

import { Fragment, useState } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { Button } from './button'
import { Badge } from './badge'
import clsx from 'clsx'

interface FilterOption {
  id: string
  label: string
  type: 'select' | 'multiselect'
  options: { value: string; label: string }[]
}

interface FilterPopoverProps {
  filters: FilterOption[]
  values: Record<string, string | string[]>
  onChange: (filterId: string, value: string | string[]) => void
  onReset: () => void
  className?: string
}

export function FilterPopover({ filters, values, onChange, onReset, className }: FilterPopoverProps) {
  const activeFiltersCount = Object.values(values).filter(v => 
    Array.isArray(v) ? v.length > 0 : !!v
  ).length

  return (
    <Popover className={clsx('relative', className)}>
      {({ open }) => (
        <>
          <Popover.Button
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              activeFiltersCount > 0
                ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            )}
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <Badge color="blue" className="ml-1">
                {activeFiltersCount}
              </Badge>
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
            <Popover.Panel className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Filter</h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={onReset}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                {filters.map((filter) => (
                  <div key={filter.id}>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {filter.label}
                    </label>
                    {filter.type === 'multiselect' ? (
                      <div className="space-y-2">
                        {filter.options.map((option) => {
                          const currentValues = (values[filter.id] as string[]) || []
                          const isChecked = currentValues.includes(option.value)
                          
                          return (
                            <label
                              key={option.value}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newValues = e.target.checked
                                    ? [...currentValues, option.value]
                                    : currentValues.filter(v => v !== option.value)
                                  onChange(filter.id, newValues)
                                }}
                                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                {option.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <select
                        value={(values[filter.id] as string) || ''}
                        onChange={(e) => onChange(filter.id, e.target.value)}
                        className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-700"
                      >
                        <option value="">Alle</option>
                        {filter.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
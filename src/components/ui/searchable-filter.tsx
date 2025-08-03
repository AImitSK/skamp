// src/components/searchable-filter.tsx
'use client'

import { useState, useMemo } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { Badge } from './badge'
import clsx from 'clsx'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface SearchableFilterProps {
  options: FilterOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  label: string
}

export function SearchableFilter({
  options,
  selectedValues,
  onChange,
  placeholder = "Suchen...",
  label
}: SearchableFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options.slice(0, 20) // Show only first 20 when no search
    
    return options
      .filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 50) // Limit results to 50
  }, [options, searchTerm])

  // Get selected options for display
  const selectedOptions = useMemo(() => {
    return options.filter(opt => selectedValues.includes(opt.value))
  }, [options, selectedValues])

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const removeSelected = (value: string) => {
    onChange(selectedValues.filter(v => v !== value))
  }

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        {selectedValues.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Alle entfernen
          </button>
        )}
      </div>

      {/* Selected Values */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.slice(0, 5).map(option => (
            <Badge key={option.value} color="blue" className="inline-flex items-center gap-1 text-xs">
              {option.label}
              <button
                onClick={() => removeSelected(option.value)}
                className="ml-0.5 hover:text-white/80"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedValues.length > 5 && (
            <Badge color="zinc" className="text-xs">
              +{selectedValues.length - 5} weitere
            </Badge>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-zinc-300 bg-white py-1.5 pl-9 pr-3 text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
        />
      </div>

      {/* Options List */}
      <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
            Keine Ergebnisse gefunden
          </div>
        ) : (
          <div className="py-1">
            {filteredOptions.map(option => {
              const isSelected = selectedValues.includes(option.value)
              return (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={clsx(
                    'flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.count !== undefined && (
                    <span className="ml-2 text-xs text-zinc-500">
                      ({option.count})
                    </span>
                  )}
                </button>
              )
            })}
            {searchTerm && options.length > filteredOptions.length && (
              <div className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700">
                {options.length - filteredOptions.length} weitere Ergebnisse...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Text */}
      {!searchTerm && options.length > 20 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tippen Sie zum Suchen in {options.length} {label}
        </p>
      )}
    </div>
  )
}
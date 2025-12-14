// src/components/MultiSelectDropdown.tsx
"use client";

import { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { Badge } from './ui/badge';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label?: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
}: MultiSelectDropdownProps) {
  const t = useTranslations('common.multiSelect');
  const [query, setQuery] = useState('');

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));
  
  const filteredOptions =
    query === ''
      ? options
      : options.filter(opt =>
          opt.label.toLowerCase().includes(query.toLowerCase())
        );

  const handleRemove = (valueToRemove: string) => {
    const newValues = selectedValues.filter(value => value !== valueToRemove);
    onChange(newValues);
  };

  return (
    <div>
      <Combobox value={selectedValues} onChange={onChange} multiple>
        {label && <Combobox.Label className="block text-sm font-medium text-zinc-700 mb-1">{label}</Combobox.Label>}
        
        <div className="relative">
          {/* ## Behälter für die Eingabe und die Badges ## 
            Der focus-within-Stil sorgt für einen sauberen Fokus-Rahmen auf dem gesamten Element.
          */}
          <div 
            className={clsx(
              "flex flex-wrap items-center gap-2 rounded-md border border-zinc-300 p-2 min-h-[42px] bg-white transition-colors duration-150",
              "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
            )}
          >
            {/* Ausgewählte Elemente als Badges */}
            {selectedOptions.map(option => (
              <Badge key={option.value} color="zinc" className="inline-flex items-center gap-x-1.5 py-1 px-2">
                {option.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // Verhindert, dass das Dropdown geöffnet/geschlossen wird
                    handleRemove(option.value);
                  }}
                  className="rounded-full hover:bg-black/10 p-0.5"
                  aria-label={t('removeItem', { item: option.label })}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
            
            {/* ## Eingabefeld ##
              focus:outline-none entfernt den letzten hartnäckigen Standard-Fokusring des Browsers.
            */}
            <Combobox.Input
              className="flex-grow bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none"
              placeholder={selectedOptions.length > 0 ? '' : placeholder}
              onChange={event => setQuery(event.target.value)}
            />
          </div>
          
          {/* Button zum Öffnen/Schließen des Dropdowns */}
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>

          {/* ## Dropdown-Menü mit den Optionen ##
            Rendert die Liste der verfügbaren Optionen.
          */}
          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
            {filteredOptions.length === 0 && query !== '' ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                {t('nothingFound')}
              </div>
            ) : (
              filteredOptions.map(option => (
                <Combobox.Option
                  key={option.value}
                  className={({ active }) =>
                    clsx(
                      'relative cursor-default select-none py-2 px-4', // Einheitliches Padding
                      active ? 'bg-primary text-white' : 'text-gray-900'
                    )
                  }
                  value={option.value}
                >
                  {({ selected }) => (
                    // Flexbox für saubere Ausrichtung von Label und Häkchen
                    <div className="flex items-center justify-between">
                      <span className={clsx('block truncate', selected ? 'font-semibold' : 'font-normal')}>
                        {option.label}
                      </span>
                      {selected ? (
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      ) : null}
                    </div>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>
    </div>
  );
}
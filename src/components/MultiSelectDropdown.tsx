// src/components/MultiSelectDropdown.tsx
"use client";

import { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Badge } from './badge';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: Option[];
  selectedValues: string[];
  // GEÄNDERT: Die onChange-Funktion akzeptiert jetzt das gesamte Array
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
  const [query, setQuery] = useState('');

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));
  
  const filteredOptions =
    query === ''
      ? options
      : options.filter(opt =>
          opt.label.toLowerCase().includes(query.toLowerCase())
        );

  // NEU: Eigene Handler-Funktion zum Entfernen eines einzelnen Elements
  const handleRemove = (valueToRemove: string) => {
    // Erstelle ein neues Array ohne das zu entfernende Element
    const newValues = selectedValues.filter(value => value !== valueToRemove);
    // Rufe die onChange-Funktion des Parents mit dem neuen Array auf
    onChange(newValues);
  };

  return (
    <div>
      {/* GEÄNDERT: Die onChange-Prop von Combobox passt jetzt zu unserer Prop */}
      <Combobox value={selectedValues} onChange={onChange} multiple>
        <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
        <div className="relative">
          <div className="flex flex-wrap gap-2 rounded-md border border-zinc-300 p-2 min-h-[40px] bg-white">
            {selectedOptions.map(option => (
              <Badge key={option.value} color="zinc" className="inline-flex items-center gap-x-1.5">
                {option.label}
                {/* GEÄNDERT: Der Button nutzt jetzt unsere neue handleRemove-Funktion */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(option.value);
                  }}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
            
            <Combobox.Input
              className="flex-grow bg-transparent border-none p-0 text-sm focus:ring-0"
              placeholder={selectedOptions.length > 0 ? '' : placeholder}
              onChange={event => setQuery(event.target.value)}
              onFocus={() => setQuery('')}
            />
          </div>
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>

          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
            {filteredOptions.length > 0 && (
              filteredOptions.map(option => (
                <Combobox.Option
                  key={option.value}
                  className={({ active }) =>
                    clsx(
                      'relative cursor-default select-none py-2 pl-10 pr-4',
                      active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                    )
                  }
                  value={option.value}
                >
                  {({ selected, active }) => (
                    <>
                      <span className={clsx('block truncate', selected ? 'font-medium' : 'font-normal')}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span
                          className={clsx(
                            'absolute inset-y-0 left-0 flex items-center pl-3',
                            active ? 'text-white' : 'text-indigo-600'
                          )}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
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
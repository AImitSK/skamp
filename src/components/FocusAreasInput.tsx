// src/components/FocusAreasInput.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface FocusAreasInputProps {
  value: string[];
  onChange: (areas: string[]) => void;
  placeholder?: string;
  suggestions?: string[]; // Vordefinierte Vorschläge
}

// Häufige Themenschwerpunkte als Vorschläge
const DEFAULT_SUGGESTIONS = [
  // Technologie & Digital
  'Künstliche Intelligenz',
  'Cybersecurity',
  'Cloud Computing',
  'Blockchain',
  'IoT',
  'Robotik',
  'Software',
  'Hardware',
  'Big Data',
  'Machine Learning',
  
  // Wirtschaft & Business
  'Startup',
  'Mittelstand',
  'Börse',
  'Fintech',
  'E-Commerce',
  'Handel',
  'Logistik',
  'Immobilien',
  'Marketing',
  'Vertrieb',
  
  // Branchen
  'Automotive',
  'Gesundheitswesen',
  'Bildung',
  'Energie',
  'Nachhaltigkeit',
  'Tourismus',
  'Mode',
  'Food & Beverage',
  'Industrie 4.0',
  'Maschinenbau',
  
  // Gesellschaft
  'Politik',
  'Kultur',
  'Sport',
  'Lifestyle',
  'Familie',
  'Reise',
  'Entertainment',
  'Gaming',
  'Wissenschaft',
  'Forschung'
];

export function FocusAreasInput({ 
  value = [], 
  onChange, 
  placeholder = "Neuen Schwerpunkt hinzufügen...",
  suggestions = DEFAULT_SUGGESTIONS 
}: FocusAreasInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suggestions
        .filter(s => 
          s.toLowerCase().includes(inputValue.toLowerCase()) && 
          !value.includes(s)
        )
        .slice(0, 8); // Max 8 Vorschläge
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions, value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addArea = (area: string) => {
    const trimmedArea = area.trim();
    if (trimmedArea && !value.includes(trimmedArea)) {
      onChange([...value, trimmedArea]);
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const removeArea = (area: string) => {
    onChange(value.filter(a => a !== area));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        addArea(filteredSuggestions[0]);
      } else if (inputValue.trim()) {
        addArea(inputValue);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-sm bg-zinc-100 text-zinc-800 rounded-md hover:bg-zinc-200 transition-colors"
          >
            {area}
            <button
              type="button"
              onClick={() => removeArea(area)}
              className="ml-1 hover:text-zinc-600"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        
        {/* Add Button */}
        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => addArea(inputValue)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addArea(suggestion)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition-colors"
            >
              <span className="font-medium">{suggestion}</span>
              {suggestions.includes(suggestion) && (
                <span className="ml-2 text-xs text-zinc-500">Häufig verwendet</span>
              )}
            </button>
          ))}
          {inputValue.trim() && !filteredSuggestions.includes(inputValue.trim()) && (
            <button
              type="button"
              onClick={() => addArea(inputValue)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition-colors border-t"
            >
              <span className="text-zinc-600">"{inputValue}" hinzufügen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
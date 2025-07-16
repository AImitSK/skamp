// src/components/FocusAreasInput.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, PlusIcon } from '@heroicons/react/20/solid';

interface FocusAreasInputProps {
  value: string[];
  onChange: (areas: string[]) => void;
  placeholder?: string;
  suggestions?: string[]; // Vordefinierte Vorschläge
}

// Häufige Themenschwerpunkte als Vorschläge
const DEFAULT_SUGGESTIONS = [
  'Künstliche Intelligenz', 'Cybersecurity', 'Cloud Computing', 'Blockchain', 'IoT', 'Robotik', 'Software', 'Hardware', 'Big Data', 'Machine Learning',
  'Startup', 'Mittelstand', 'Börse', 'Fintech', 'E-Commerce', 'Handel', 'Logistik', 'Immobilien', 'Marketing', 'Vertrieb',
  'Automotive', 'Gesundheitswesen', 'Bildung', 'Energie', 'Nachhaltigkeit', 'Tourismus', 'Mode', 'Food & Beverage', 'Industrie 4.0', 'Maschinenbau',
  'Politik', 'Kultur', 'Sport', 'Lifestyle', 'Familie', 'Reise', 'Entertainment', 'Gaming', 'Wissenschaft', 'Forschung'
];

export function FocusAreasInput({ 
  value = [], 
  onChange, 
  placeholder = "Neuen Schwerpunkt hinzufügen...",
  suggestions = DEFAULT_SUGGESTIONS 
}: FocusAreasInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtert die Vorschläge basierend auf der Eingabe
  const filteredSuggestions = inputValue.trim()
    ? suggestions
        .filter(s => 
          s.toLowerCase().includes(inputValue.toLowerCase()) && 
          !value.includes(s)
        )
        .slice(0, 8) // Max. 8 Vorschläge anzeigen
    : [];

  // Berechnet die Position des Dropdowns neu, wenn es angezeigt wird
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4, // 4px Abstand nach unten
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (showSuggestions) {
      updateDropdownPosition();
      // Event Listener für die Neupositionierung bei Scrollen oder Größenänderung
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [showSuggestions, updateDropdownPosition]);

  // Schließt die Vorschläge bei einem Klick außerhalb
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
  
  const handleFocus = () => {
    if (inputValue.trim()) {
        setShowSuggestions(true);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setInputValue(term);
    if(term.trim()){
        setShowSuggestions(true);
    } else {
        setShowSuggestions(false);
    }
  }

  // Das Dropdown-Menü, das im Portal gerendert wird
  const SuggestionsDropdown = () => (
    <>
      {showSuggestions && filteredSuggestions.length > 0 && createPortal(
        <div 
          className="fixed z-50 bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ 
            top: `${dropdownPosition.top}px`, 
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addArea(suggestion)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition-colors"
            >
              <span className="font-medium">{suggestion}</span>
            </button>
          ))}
          {inputValue.trim() && !filteredSuggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase()) && (
             <button
                type="button"
                onClick={() => addArea(inputValue)}
                className="w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition-colors border-t"
              >
                <span className="text-zinc-600">"{inputValue.trim()}" hinzufügen</span>
              </button>
          )}
        </div>,
        document.body
      )}
    </>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Tags Display */}
      {value.length > 0 && (
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
      )}

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        
        {/* Add Button */}
        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => addArea(inputValue)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-[#0693e3]"
            title="Hinzufügen"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown (Portal) */}
      <SuggestionsDropdown />
    </div>
  );
}
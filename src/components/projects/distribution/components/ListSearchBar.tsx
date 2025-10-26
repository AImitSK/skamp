// src/components/projects/distribution/components/ListSearchBar.tsx
'use client';

import { memo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ListSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ListSearchBar = memo(function ListSearchBar({
  value,
  onChange,
  placeholder = 'Suchen...'
}: ListSearchBarProps) {
  return (
    <div className="flex-1 relative">
      {/* Search Icon */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
      </div>

      {/* Input Field */}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-10 text-sm',
          'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'h-10'
        )}
        aria-label="Liste durchsuchen"
      />

      {/* Clear Button */}
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-gray-700 text-gray-400 transition-colors"
          aria-label="Suche zurücksetzen"
          type="button"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
});

export default ListSearchBar;

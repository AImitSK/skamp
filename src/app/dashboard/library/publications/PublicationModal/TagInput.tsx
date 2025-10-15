// src/app/dashboard/library/publications/PublicationModal/TagInput.tsx
"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last tag
      onChange(value.slice(0, -1));
    }
  };

  const addTag = () => {
    const tag = inputValue.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="min-h-[42px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:border-[#005fab] focus-within:ring-1 focus-within:ring-[#005fab]">
      <div className="flex flex-wrap gap-2 items-center">
        {value.map((tag, index) => (
          <Badge key={index} color="blue" className="inline-flex items-center gap-1 pl-2 pr-1 py-1">
            <span className="text-xs">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm"
        />
      </div>
    </div>
  );
}

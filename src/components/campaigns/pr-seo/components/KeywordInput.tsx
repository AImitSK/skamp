// src/components/campaigns/pr-seo/components/KeywordInput.tsx
"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { KeywordInputProps } from '../types';

/**
 * Keyword-Eingabe-Komponente
 * Erlaubt das Hinzufügen neuer Keywords (max 2)
 */
export const KeywordInput = React.memo(function KeywordInput({ keywords, onAddKeyword, maxKeywords = 2 }: KeywordInputProps) {
  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim()) && keywords.length < maxKeywords) {
      onAddKeyword(newKeyword.trim());
      setNewKeyword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex gap-2 w-1/2">
      <Input
        type="text"
        value={newKeyword}
        onChange={(e) => setNewKeyword(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={keywords.length >= maxKeywords ? `Maximum ${maxKeywords} Keywords erreicht` : "Keyword hinzufügen..."}
        disabled={keywords.length >= maxKeywords}
        className="flex-1"
      />
      <Button
        type="button"
        onClick={handleAdd}
        color="secondary"
        className="whitespace-nowrap px-3 py-1.5 text-sm"
      >
        Hinzufügen
      </Button>
    </div>
  );
});

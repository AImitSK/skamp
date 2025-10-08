// src/components/tag-input.tsx
"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Badge } from "@/components/ui/badge";
import { Tag, TagColor } from "@/types/crm";
import clsx from "clsx";

interface TagInputProps {
  selectedTagIds: string[];
  availableTags: Tag[];
  onChange: (tagIds: string[]) => void;
  onCreateTag: (name: string, color: TagColor) => Promise<string>;
}

const tagColors: TagColor[] = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'orange', 'zinc'];

export function TagInput({ selectedTagIds, availableTags, onChange, onCreateTag }: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTagColor] = useState<TagColor>('blue'); // Alle Tags sind blau

  const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id!));
  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTagIds.includes(tag.id!)
  );

  const handleAddTag = (tagId: string) => {
    onChange([...selectedTagIds, tagId]);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateTag = async (tagName: string) => {
    if (!tagName.trim()) return;

    setIsCreating(true);
    try {
      const newTagId = await onCreateTag(tagName.trim(), newTagColor);
      onChange([...selectedTagIds, newTagId]);
      setSearchTerm("");
      setIsOpen(false);
    } catch (error) {
      console.error("Fehler beim Erstellen des Tags:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();

      // Prüfe ob Tag bereits existiert
      const existingTag = availableTags.find(tag =>
        tag.name.toLowerCase() === searchTerm.trim().toLowerCase()
      );

      if (existingTag) {
        // Tag existiert bereits - hinzufügen
        handleAddTag(existingTag.id!);
      } else {
        // Neues Tag erstellen
        await handleCreateTag(searchTerm.trim());
      }
    }
  };

  return (
    <div className="relative">
      {/* Ausgewählte Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <Badge key={tag.id} color={tag.color as any} className="inline-flex items-center gap-1">
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id!)}
              className="ml-1 hover:text-red-600"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Tag-Auswahl */}
      <div className="relative">
        <span
          className={clsx(
            'relative block w-full',
            'before:absolute before:inset-px before:rounded-[calc(theme(borderRadius.lg)-1px)] before:bg-white before:shadow-sm',
            'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset focus-within:after:ring-2 focus-within:after:ring-blue-500',
            isCreating && 'opacity-50'
          )}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder="Tag eingeben + Enter drücken..."
            disabled={isCreating}
            className="relative block w-full appearance-none rounded-lg px-3 py-2 text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 border border-zinc-950/10 hover:border-zinc-950/20 bg-white/95 focus:outline-none disabled:border-zinc-950/20 disabled:cursor-not-allowed"
          />
        </span>

        {/* Autocomplete Dropdown - nur bei Eingabe */}
        {isOpen && searchTerm.trim() && filteredTags.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 max-h-48 overflow-auto">
            {filteredTags.slice(0, 5).map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAddTag(tag.id!)}
                className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-zinc-50 transition-colors rounded-md"
              >
                <Badge color={tag.color as any} className="text-xs">
                  {tag.name}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click-outside Handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
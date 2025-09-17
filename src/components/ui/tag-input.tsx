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
  const [newTagColor, setNewTagColor] = useState<TagColor>('blue');

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

  const handleCreateTag = async () => {
    if (!searchTerm.trim()) return;
    
    setIsCreating(true);
    try {
      const newTagId = await onCreateTag(searchTerm.trim(), newTagColor);
      onChange([...selectedTagIds, newTagId]);
      setSearchTerm("");
      setIsOpen(false);
    } catch (error) {
      console.error("Fehler beim Erstellen des Tags:", error);
    } finally {
      setIsCreating(false);
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
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation(); // Verhindere Form-Submit

              // Wenn es einen gefilterten Tag gibt, wähle den ersten aus
              if (filteredTags.length > 0) {
                handleAddTag(filteredTags[0].id!);
              }
              // Wenn searchTerm existiert und noch kein Tag mit dem Namen existiert, erstelle neuen Tag
              else if (searchTerm.trim() && !availableTags.some(tag =>
                tag.name.toLowerCase() === searchTerm.toLowerCase()
              )) {
                handleCreateTag();
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
              setSearchTerm("");
            }
          }}
          placeholder="Tags hinzufügen..."
          className="w-full rounded-md border border-zinc-300 py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
            {/* Vorhandene Tags */}
            {filteredTags.length > 0 && (
              <div className="max-h-60 overflow-auto">
                {filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.id!)}
                    className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    <Badge color={tag.color as any} className="mr-2">
                      {tag.name}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {/* Neues Tag erstellen */}
            {searchTerm.trim() && !availableTags.some(tag => 
              tag.name.toLowerCase() === searchTerm.toLowerCase()
            ) && (
              <div className="border-t border-gray-200 p-3">
                <div className="text-xs text-gray-500 mb-2">Tag erstellen:</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{searchTerm}</span>
                  <div className="flex gap-1">
                    {tagColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={clsx(
                          "h-4 w-4 rounded-full",
                          color === 'blue' && 'bg-blue-500',
                          color === 'green' && 'bg-green-500',
                          color === 'yellow' && 'bg-yellow-500',
                          color === 'red' && 'bg-red-500',
                          color === 'purple' && 'bg-purple-500',
                          color === 'pink' && 'bg-pink-500',
                          color === 'orange' && 'bg-orange-500',
                          color === 'zinc' && 'bg-zinc-500',
                          newTagColor === color && 'ring-2 ring-offset-1 ring-gray-400'
                        )}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                  className="w-full rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary disabled:opacity-50"
                >
                  {isCreating ? 'Erstelle...' : 'Tag erstellen'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click-outside Handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
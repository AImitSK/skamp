// src/components/mediathek/MediaToolbar.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  PlusIcon,
  FolderPlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

type ViewMode = 'grid' | 'list';

interface MediaToolbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedAssetsCount: number;
  foldersCount: number;
  assetsCount: number;
  onCreateFolder: () => void;
  onUpload: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  disabled?: boolean;
}

export default function MediaToolbar({
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
  selectedAssetsCount,
  foldersCount,
  assetsCount,
  onCreateFolder,
  onUpload,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  disabled = false,
}: MediaToolbarProps) {
  return (
    <div>
      {/* Search and Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Dateien und Ordner durchsuchen..."
            className="pl-10"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCreateFolder}
            disabled={disabled}
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FolderPlusIcon className="h-4 w-4" />
            Ordner anlegen
          </Button>
          <Button
            onClick={onUpload}
            disabled={disabled}
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Dateien hochladen
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            plain
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid'
              ? 'bg-white shadow-sm text-[#005fab]'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4" />
          </Button>
          <Button
            plain
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list'
              ? 'bg-white shadow-sm text-[#005fab]'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ListBulletIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Info and Bulk Actions */}
      <div className="mt-4 flex items-center justify-between">
        <Text>
          {foldersCount} {foldersCount === 1 ? 'Ordner' : 'Ordner'},{' '}
          {assetsCount} {assetsCount === 1 ? 'Datei' : 'Dateien'}
        </Text>

        <div className="flex min-h-10 items-center gap-4">
          {selectedAssetsCount > 0 && (
            <>
              <Text>
                {selectedAssetsCount} ausgewählt
              </Text>
              <Button plain onClick={onSelectAll} className="text-[#005fab]">
                Alle auswählen
              </Button>
              <Button plain onClick={onClearSelection}>
                Auswahl aufheben
              </Button>
              <Button color="zinc" onClick={onBulkDelete}>
                <TrashIcon className="h-4 w-4" />
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

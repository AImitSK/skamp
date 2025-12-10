// src/components/mediathek/MediaToolbar.tsx
"use client";

import { useTranslations } from 'next-intl';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  PlusIcon,
  FolderPlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import clsx from 'clsx';

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
  const t = useTranslations('media.toolbar');

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search')}
              className={clsx(
                'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
                'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                'dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-700',
                'h-10'
              )}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-primary'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-white text-primary'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Add Folder Button */}
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary px-6 py-2"
            onClick={onCreateFolder}
            disabled={disabled}
          >
            <FolderPlusIcon className="h-4 w-4 mr-2" />
            {t('createFolder')}
          </Button>

          {/* Add Files Button */}
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary px-6 py-2"
            onClick={onUpload}
            disabled={disabled}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('upload')}
          </Button>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-2 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('stats', { folders: foldersCount, assets: assetsCount })}
          {selectedAssetsCount > 0 && (
            <span className="ml-2">· {t('selected', { count: selectedAssetsCount })}</span>
          )}
        </Text>

        {selectedAssetsCount > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={onSelectAll}
              className="text-sm text-primary hover:text-primary-hover underline"
            >
              {t('selectAll')}
            </button>
            <button
              onClick={onClearSelection}
              className="text-sm text-zinc-600 hover:text-zinc-700 underline"
            >
              {t('clearSelection')}
            </button>
            <button
              onClick={onBulkDelete}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              {t('bulkDelete', { count: selectedAssetsCount })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

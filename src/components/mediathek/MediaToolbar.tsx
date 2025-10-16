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
  TrashIcon,
  EllipsisVerticalIcon
} from "@heroicons/react/24/outline";
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from "react";
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
              placeholder="Suchen"
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
            Ordner anlegen
          </Button>

          {/* Add Files Button */}
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary px-6 py-2"
            onClick={onUpload}
            disabled={disabled}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Dateien hochladen
          </Button>

          {/* Actions Button */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-2.5 text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 h-10 w-10">
              <EllipsisVerticalIcon className="h-5 w-5 stroke-[2.5]" />
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="py-1">
                  {selectedAssetsCount > 0 && (
                    <>
                      <button
                        onClick={onSelectAll}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Alle auswählen
                      </button>
                      <button
                        onClick={onClearSelection}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Auswahl aufheben
                      </button>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={onBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-5 w-5" />
                        Auswahl löschen ({selectedAssetsCount})
                      </button>
                    </>
                  )}
                  {selectedAssetsCount === 0 && (
                    <div className="px-4 py-2 text-sm text-zinc-500">
                      Keine Dateien ausgewählt
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-2 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {foldersCount} {foldersCount === 1 ? 'Ordner' : 'Ordner'}, {assetsCount} {assetsCount === 1 ? 'Datei' : 'Dateien'}
          {selectedAssetsCount > 0 && (
            <span className="ml-2">· {selectedAssetsCount} ausgewählt</span>
          )}
        </Text>

        {selectedAssetsCount > 0 && (
          <button
            onClick={onBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedAssetsCount} Löschen
          </button>
        )}
      </div>
    </div>
  );
}

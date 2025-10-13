// src/app/dashboard/contacts/crm/contacts/components/ContactBulkActions.tsx
"use client";

import { Fragment } from "react";
import { Popover, Transition } from '@headlessui/react';
import {
  EllipsisVerticalIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

export interface ContactBulkActionsProps {
  selectedCount: number;
  onImport: () => void;
  onExport: () => void;
  onBulkDelete: () => void;
}

/**
 * Contact Bulk Actions Component
 *
 * Aktionsmenü für Kontakte mit Import, Export und Bulk Delete.
 *
 * @component
 * @example
 * ```tsx
 * <ContactBulkActions
 *   selectedCount={selectedContactIds.size}
 *   onImport={() => setShowImportModal(true)}
 *   onExport={handleExport}
 *   onBulkDelete={handleBulkDelete}
 * />
 * ```
 */
export function ContactBulkActions({
  selectedCount,
  onImport,
  onExport,
  onBulkDelete
}: ContactBulkActionsProps) {
  return (
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
            <button
              onClick={onImport}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              Import
            </button>
            <button
              onClick={onExport}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export
            </button>
            {selectedCount > 0 && (
              <>
                <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                <button
                  onClick={onBulkDelete}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <TrashIcon className="h-5 w-5" />
                  Auswahl löschen ({selectedCount})
                </button>
              </>
            )}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}

/**
 * Candidate Filters Komponente - CRM Pattern
 *
 * Kompakte Filter-Leiste mit:
 * - SearchInput (flex-1)
 * - Filter-Button (Popover)
 * - Scan-Button
 * - Actions-Dropdown (3 Punkte)
 */

'use client';

import { Fragment } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import {
  MatchingCandidateFilters,
  MATCHING_STATUS_LABELS,
  MATCHING_DEFAULTS
} from '@/types/matching';

interface CandidateFiltersProps {
  filters: MatchingCandidateFilters;
  onFiltersChange: (filters: MatchingCandidateFilters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  devMode: boolean;
  onDevModeChange: (devMode: boolean) => void;
  useAiMerge: boolean; // Read-only, kommt aus globalen Settings
  scanning: boolean;
  onScan: () => Promise<void>;
}

export default function CandidateFilters({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  devMode,
  onDevModeChange,
  useAiMerge,
  scanning,
  onScan
}: CandidateFiltersProps) {
  /**
   * Zählt aktive Filter
   */
  const getActiveFilterCount = (): number => {
    let count = 0;

    // Status (default ist ['pending'], zählt nicht)
    if (filters.status &&
        filters.status.length > 0 &&
        !(filters.status.length === 1 && filters.status[0] === 'pending')) {
      count++;
    }

    if (filters.minScore && filters.minScore !== MATCHING_DEFAULTS.MIN_SCORE) count++;
    if (filters.maxScore) count++;
    if (filters.minVariants) count++;
    if (filters.matchType) count++;

    return count;
  };

  /**
   * Status Toggle
   */
  const toggleStatus = (status: 'pending' | 'imported' | 'skipped' | 'rejected') => {
    const currentStatuses = filters.status || [];

    if (currentStatuses.includes(status)) {
      const newStatuses = currentStatuses.filter(s => s !== status);
      onFiltersChange({
        ...filters,
        status: newStatuses.length > 0 ? newStatuses : undefined
      });
    } else {
      onFiltersChange({
        ...filters,
        status: [...currentStatuses, status]
      });
    }
  };

  /**
   * Reset Filter
   */
  const resetFilters = () => {
    onFiltersChange({
      status: ['pending'],
      minScore: MATCHING_DEFAULTS.MIN_SCORE
    });
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <SearchInput
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Kandidaten durchsuchen..."
        className="flex-1"
      />

      {/* Filter Button - nur Icon */}
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              className={clsx(
                'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10',
                activeFilterCount > 0
                  ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
              aria-label="Filter"
            >
              <FunnelIcon className="h-5 w-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                  {activeFilterCount}
                </span>
              )}
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
              <Popover.Panel className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Filter</h3>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>

                  {/* Status Multi-Select */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Status
                    </label>
                    <div className="space-y-2">
                      {(['pending', 'imported', 'skipped', 'rejected'] as const).map((status) => {
                        const isChecked = filters.status?.includes(status) || false;
                        return (
                          <label
                            key={status}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStatus(status)}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {MATCHING_STATUS_LABELS[status]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score Range */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Min. Score
                    </label>
                    <select
                      value={filters.minScore?.toString() || ''}
                      onChange={(e) => onFiltersChange({
                        ...filters,
                        minScore: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-700"
                    >
                      <option value="">Alle</option>
                      <option value="50">Min. 50 Punkte</option>
                      <option value="60">Min. 60 Punkte</option>
                      <option value="70">Min. 70 Punkte</option>
                      <option value="80">Min. 80 Punkte</option>
                      <option value="90">Min. 90 Punkte</option>
                    </select>
                  </div>

                  {/* Match Type */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Match-Type
                    </label>
                    <select
                      value={filters.matchType || ''}
                      onChange={(e) => onFiltersChange({
                        ...filters,
                        matchType: e.target.value as 'email' | 'name' | undefined
                      })}
                      className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-700"
                    >
                      <option value="">Alle</option>
                      <option value="email">E-Mail</option>
                      <option value="name">Name</option>
                    </select>
                  </div>

                  {/* Min Varianten */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Min. Organisationen
                    </label>
                    <select
                      value={filters.minVariants?.toString() || ''}
                      onChange={(e) => onFiltersChange({
                        ...filters,
                        minVariants: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-700"
                    >
                      <option value="">Alle</option>
                      <option value="2">Min. 2</option>
                      <option value="3">Min. 3</option>
                      <option value="4">Min. 4</option>
                      <option value="5">Min. 5</option>
                    </select>
                  </div>

                  {/* Development Mode */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={devMode}
                        onChange={(e) => onDevModeChange(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          🔧 Development-Modus
                        </span>
                        <span className="text-xs text-zinc-500">
                          Min 1 Org, min Score: 40
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* KI-Daten-Merge Info (read-only, gesteuert in Settings) */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded ${useAiMerge ? 'bg-blue-600' : 'bg-zinc-300'}`} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          🤖 KI-Daten-Merge {useAiMerge ? 'aktiviert' : 'deaktiviert'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Einstellung ändern in → SuperAdmin Settings
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>

      {/* Scan Button */}
      <Button
        color="indigo"
        onClick={onScan}
        disabled={scanning}
        className="whitespace-nowrap h-10"
      >
        {scanning ? (
          <>
            <ArrowPathIcon className="size-5 animate-spin" />
            Scanne...
          </>
        ) : (
          <>
            <ArrowPathIcon className="size-5" />
            Scan
          </>
        )}
      </Button>

      {/* Actions Dropdown - nur 3 Punkte */}
      <Popover className="relative">
        <Popover.Button className="inline-flex items-center justify-center p-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800 h-10 w-10">
          <EllipsisVerticalIcon className="h-5 w-5" />
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
              {devMode && (
                <div className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-200 dark:border-zinc-700">
                  🔧 Dev-Mode aktiv
                </div>
              )}
              <button
                onClick={() => window.open('/dashboard/super-admin/matching/analytics', '_blank')}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Analytics öffnen
              </button>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
}

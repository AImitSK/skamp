/**
 * Candidate Filters Komponente
 *
 * Filter-Leiste für Kandidaten:
 * - Status-Filter (Multi-Select)
 * - Score-Range Filter
 * - Search (Name/E-Mail)
 * - Development-Mode Toggle
 */

'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Input } from '@/components/catalyst/input';
import { Select } from '@/components/catalyst/select';
import { Button } from '@/components/catalyst/button';
import { Badge } from '@/components/catalyst/badge';
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
}

export default function CandidateFilters({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  devMode,
  onDevModeChange
}: CandidateFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Status Toggle
   */
  const toggleStatus = (status: 'pending' | 'imported' | 'skipped' | 'rejected') => {
    const currentStatuses = filters.status || [];

    if (currentStatuses.includes(status)) {
      // Remove
      const newStatuses = currentStatuses.filter(s => s !== status);
      onFiltersChange({
        ...filters,
        status: newStatuses.length > 0 ? newStatuses : undefined
      });
    } else {
      // Add
      onFiltersChange({
        ...filters,
        status: [...currentStatuses, status]
      });
    }
  };

  /**
   * Reset alle Filter
   */
  const resetFilters = () => {
    onFiltersChange({
      status: ['pending'],
      minScore: MATCHING_DEFAULTS.MIN_SCORE
    });
    onSearchChange('');
  };

  /**
   * Zählt aktive Filter
   */
  const getActiveFilterCount = (): number => {
    let count = 0;

    if (filters.status && filters.status.length > 0 && !(filters.status.length === 1 && filters.status[0] === 'pending')) {
      count++;
    }

    if (filters.minScore && filters.minScore !== MATCHING_DEFAULTS.MIN_SCORE) {
      count++;
    }

    if (filters.maxScore) count++;
    if (filters.minVariants) count++;
    if (filters.matchType) count++;
    if (searchQuery) count++;

    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="space-y-4">
      {/* Haupt-Filter-Zeile */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Suche nach Name oder E-Mail..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Score Filter */}
        <div className="w-full sm:w-48">
          <Select
            value={filters.minScore?.toString() || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              minScore: e.target.value ? parseInt(e.target.value) : undefined
            })}
          >
            <option value="">Alle Scores</option>
            <option value="50">Min. 50 Punkte</option>
            <option value="60">Min. 60 Punkte</option>
            <option value="70">Min. 70 Punkte</option>
            <option value="80">Min. 80 Punkte</option>
            <option value="90">Min. 90 Punkte</option>
          </Select>
        </div>

        {/* Advanced Filter Toggle */}
        <Button
          color="light"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <FunnelIcon className="size-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge color="blue" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Reset Button */}
        {activeFilterCount > 0 && (
          <Button
            color="light"
            onClick={resetFilters}
            title="Filter zurücksetzen"
          >
            <XMarkIcon className="size-4" />
          </Button>
        )}
      </div>

      {/* Status-Filter Badges (Always Visible) */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Status:
        </span>

        {(['pending', 'imported', 'skipped', 'rejected'] as const).map((status) => {
          const isActive = filters.status?.includes(status);

          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`
                px-3 py-1 rounded-md text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }
              `}
            >
              {MATCHING_STATUS_LABELS[status]}
              {isActive && (
                <XMarkIcon className="inline-block ml-1 size-3" />
              )}
            </button>
          );
        })}
      </div>

      {/* Advanced Filters (Collapsible) */}
      {showAdvanced && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Match Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Match-Type
              </label>
              <Select
                value={filters.matchType || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  matchType: e.target.value as 'email' | 'name' | undefined
                })}
              >
                <option value="">Alle</option>
                <option value="email">E-Mail</option>
                <option value="name">Name</option>
              </Select>
            </div>

            {/* Min Varianten */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Min. Organisationen
              </label>
              <Select
                value={filters.minVariants?.toString() || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  minVariants: e.target.value ? parseInt(e.target.value) : undefined
                })}
              >
                <option value="">Alle</option>
                <option value="2">Min. 2</option>
                <option value="3">Min. 3</option>
                <option value="4">Min. 4</option>
                <option value="5">Min. 5</option>
              </Select>
            </div>

            {/* Max Score */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Max. Score
              </label>
              <Select
                value={filters.maxScore?.toString() || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  maxScore: e.target.value ? parseInt(e.target.value) : undefined
                })}
              >
                <option value="">Alle</option>
                <option value="60">Max. 60</option>
                <option value="70">Max. 70</option>
                <option value="80">Max. 80</option>
                <option value="90">Max. 90</option>
              </Select>
            </div>
          </div>

          {/* Development Mode Toggle */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => onDevModeChange(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                🔧 Development-Modus
              </span>
              <span className="text-xs text-zinc-500">
                (zeigt Kandidaten mit 1 Org, min Score: 40)
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Search and Filter Component
 * Filter für Organizations nach Tier, Type, Status
 */

'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export interface FilterState {
  search: string;
  tier: 'all' | 'STARTER' | 'BUSINESS' | 'AGENTUR';
  type: 'all' | 'regular' | 'promo' | 'beta' | 'internal';
  status: 'all' | 'expiring';
}

interface Props {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export default function SearchAndFilter({ filters, onFiltersChange }: Props) {
  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleTierChange = (tier: FilterState['tier']) => {
    onFiltersChange({ ...filters, tier });
  };

  const handleTypeChange = (type: FilterState['type']) => {
    onFiltersChange({ ...filters, type });
  };

  const handleStatusChange = (status: FilterState['status']) => {
    onFiltersChange({ ...filters, status });
  };

  const selectClassName = `block w-full rounded-lg border border-zinc-300 bg-white
                           px-3 py-2 text-sm h-10
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            Suche
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Name, Email, ID..."
              className="block w-full rounded-lg border border-zinc-300 bg-white
                         pl-10 pr-3 py-2 text-sm h-10
                         placeholder:text-zinc-400
                         focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Tier Filter */}
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            Tier
          </label>
          <select
            value={filters.tier}
            onChange={(e) => handleTierChange(e.target.value as FilterState['tier'])}
            className={selectClassName}
          >
            <option value="all">Alle Tiers</option>
            <option value="STARTER">STARTER</option>
            <option value="BUSINESS">BUSINESS</option>
            <option value="AGENTUR">AGENTUR</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            Account Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleTypeChange(e.target.value as FilterState['type'])}
            className={selectClassName}
          >
            <option value="all">Alle Types</option>
            <option value="regular">Regular</option>
            <option value="promo">Promo</option>
            <option value="beta">Beta</option>
            <option value="internal">Internal</option>
          </select>
        </div>
      </div>

      {/* Status Filter (second row for better UX) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value as FilterState['status'])}
            className={selectClassName}
          >
            <option value="all">Alle</option>
            <option value="expiring">Promo läuft ab (7 Tage)</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(filters.search || filters.tier !== 'all' || filters.type !== 'all' || filters.status !== 'all') && (
          <div className="flex items-end">
            <button
              onClick={() => onFiltersChange({ search: '', tier: 'all', type: 'all', status: 'all' })}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900
                         bg-zinc-100 hover:bg-zinc-200 rounded-lg transition h-10"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

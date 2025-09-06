// src/components/projects/kanban/BoardHeader.tsx - Board Header für Plan 10/9
'use client';

import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowPathIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

import { BoardFilters } from '@/lib/kanban/kanban-board-service';
// Falls useDebounce Hook existiert, importieren - sonst eigene Implementation unten

// ========================================
// INTERFACES
// ========================================

export interface BoardHeaderProps {
  totalProjects: number;
  activeUsers: Array<{
    id: string;
    name: string;
    avatar?: string;
    currentProject?: string;
  }>;
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  onRefresh?: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  viewMode: 'board' | 'list' | 'calendar';
  onViewModeChange: (mode: 'board' | 'list' | 'calendar') => void;
}

// ========================================
// DEBOUNCE HOOK (Fallback wenn nicht vorhanden)
// ========================================

const useDebounceSearch = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ========================================
// BOARD HEADER KOMPONENTE
// ========================================

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  totalProjects,
  activeUsers,
  filters,
  onFiltersChange,
  onRefresh,
  showFilters,
  onToggleFilters,
  viewMode,
  onViewModeChange
}) => {
  // Search State
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const debouncedSearch = useDebounceSearch(searchValue, 300);

  // Update filters when search changes
  React.useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch, filters, onFiltersChange]);

  // Active Filter Count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.customers?.length) count++;
    if (filters.teamMembers?.length) count++;
    if (filters.priority?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.dateRange) count++;
    if (filters.overdue) count++;
    if (filters.critical) count++;
    return count;
  }, [filters]);

  // Handle Search Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // Clear Search
  const clearSearch = () => {
    setSearchValue('');
    onFiltersChange({ ...filters, search: '' });
  };

  // Handle Refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="board-header bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side - Title & Stats */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Squares2X2Icon className="h-6 w-6 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              Projekt-Board
            </h1>
          </div>
          
          {/* Project Count */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
              {totalProjects}
            </span>
            <span>
              {totalProjects === 1 ? 'Projekt' : 'Projekte'}
            </span>
          </div>

          {/* Active Users Indicator */}
          {activeUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <UserGroupIcon className="h-4 w-4" />
              <span>{activeUsers.length} online</span>
              
              {/* User Avatars */}
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map(user => (
                  <div
                    key={user.id}
                    className="relative"
                    title={user.name}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-6 w-6 rounded-full border-2 border-white bg-gray-200"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {activeUsers.length > 3 && (
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      +{activeUsers.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Search & Actions */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Projekte suchen..."
              className="block w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={searchValue}
              onChange={handleSearchChange}
            />
            {searchValue && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <span className="text-sm">×</span>
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={onToggleFilters}
            className={`
              flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
              ${showFilters
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => onViewModeChange('board')}
              className={`
                p-2 text-sm font-medium rounded-l-lg transition-colors
                ${viewMode === 'board'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
              title="Board-Ansicht"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`
                p-2 text-sm font-medium border-l border-gray-300 rounded-r-lg transition-colors
                ${viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
              title="Listen-Ansicht"
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>

          {/* Settings Button */}
          <button
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Board-Einstellungen"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-sm text-gray-600">Aktive Filter:</span>
          <div className="flex items-center space-x-2">
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                Suche: "{filters.search}"
                <button
                  onClick={() => onFiltersChange({ ...filters, search: '' })}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.customers && filters.customers.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                {filters.customers.length} Kunde(n)
                <button
                  onClick={() => onFiltersChange({ ...filters, customers: [] })}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.overdue && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                Überfällig
                <button
                  onClick={() => onFiltersChange({ ...filters, overdue: false })}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.critical && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                Kritisch
                <button
                  onClick={() => onFiltersChange({ ...filters, critical: false })}
                  className="ml-2 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          
          {/* Clear All Filters */}
          {activeFilterCount > 1 && (
            <button
              onClick={() => onFiltersChange({})}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Alle entfernen
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardHeader;
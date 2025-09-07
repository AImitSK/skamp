// src/components/projects/kanban/BoardHeader.tsx - Board Header für Plan 10/9
'use client';

import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

import { BoardFilters } from '@/lib/kanban/kanban-board-service';
import { BoardSettingsModal, BoardSettings } from './BoardSettingsModal';
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
  boardSettings?: BoardSettings;
  onBoardSettingsChange?: (settings: BoardSettings) => void;
  // New props for extended toolbar
  viewMode?: 'board' | 'list';
  onViewModeChange?: (mode: 'board' | 'list') => void;
  onNewProject?: () => void;
  onMoreOptions?: () => void;
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
  boardSettings,
  onBoardSettingsChange,
  viewMode = 'board',
  onViewModeChange,
  onNewProject,
  onMoreOptions
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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

        {/* Right Side - New Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Projekte suchen..."
              className="w-64 pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={searchValue}
              onChange={handleSearchChange}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            {searchValue && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <span className="text-sm">×</span>
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => onViewModeChange('board')}
                className={`
                  px-3 py-2 text-sm font-medium rounded-l-lg transition-colors
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
                  px-3 py-2 text-sm font-medium border-l border-gray-300 rounded-r-lg transition-colors
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
          )}

          {/* Filter Button */}
          <button
            onClick={onToggleFilters}
            className={`px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
              showFilters
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title="Filter"
          >
            <FunnelIcon className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Aktualisieren"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Einstellungen"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
          </button>

          {/* New Project Button */}
          {onNewProject && (
            <Button 
              onClick={onNewProject}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Neues Projekt</span>
            </Button>
          )}

          {/* Three Dots Menu - NO BORDER */}
          {onMoreOptions && (
            <button
              onClick={onMoreOptions}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              title="Weitere Optionen"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          )}
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

      {/* Board Settings Modal */}
      {boardSettings && onBoardSettingsChange && (
        <BoardSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={boardSettings}
          onSettingsChange={onBoardSettingsChange}
        />
      )}
    </div>
  );
};

export default BoardHeader;
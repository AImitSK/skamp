/**
 * TaskFilterPanel Component
 *
 * Filter- und Sortier-Panel für Task-Listen.
 * Zeigt View-Mode, Quick-Filter-Buttons und erweiterte Filter im Popover.
 *
 * Features:
 * - View Mode Select (Alle/Meine Tasks)
 * - Quick Filter Buttons (Heute fällig, Überfällig)
 * - Filter Popover mit:
 *   - Fälligkeits-Filter (Heute, Überfällig, Zukünftig, Kein Datum)
 *   - Status-Filter (Offen, In Bearbeitung, Erledigt)
 *   - Zuständige Mitglieder
 *   - Sortierung (Fälligkeit, Erstellung, Alphabetisch)
 * - Reset-Button
 */

'use client';

import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import {
  FunnelIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface TaskFilterPanelProps {
  viewMode: 'all' | 'mine';
  selectedDueDateFilters: string[];
  selectedStatusFilters: string[];
  selectedAssigneeIds: string[];
  sortBy: 'dueDate' | 'createdAt' | 'title';
  activeFiltersCount: number;
  teamMembers: Array<{
    id: string;
    userId?: string;
    displayName: string;
  }>;
  onViewModeChange: (mode: 'all' | 'mine') => void;
  onDueDateFiltersChange: (filters: string[]) => void;
  onStatusFiltersChange: (filters: string[]) => void;
  onAssigneeIdsChange: (ids: string[]) => void;
  onSortByChange: (sortBy: 'dueDate' | 'createdAt' | 'title') => void;
  onResetFilters: () => void;
}

export const TaskFilterPanel = React.memo(function TaskFilterPanel({
  viewMode,
  selectedDueDateFilters,
  selectedStatusFilters,
  selectedAssigneeIds,
  sortBy,
  activeFiltersCount,
  teamMembers,
  onViewModeChange,
  onDueDateFiltersChange,
  onStatusFiltersChange,
  onAssigneeIdsChange,
  onSortByChange,
  onResetFilters
}: TaskFilterPanelProps) {
  const t = useTranslations('projects.tasks.filterPanel');

  // Toggle-Helper für Quick-Filter
  const toggleDueDateFilter = (filterValue: string) => {
    const isActive = selectedDueDateFilters.includes(filterValue);
    onDueDateFiltersChange(
      isActive
        ? selectedDueDateFilters.filter(f => f !== filterValue)
        : [...selectedDueDateFilters, filterValue]
    );
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* View Mode Select */}
      <select
        value={viewMode}
        onChange={(e) => onViewModeChange(e.target.value as 'all' | 'mine')}
        className="rounded-lg border border-zinc-300 bg-white px-4 h-10
                   text-sm text-zinc-700 font-medium
                   focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                   hover:bg-zinc-50 transition-colors"
      >
        <option value="all">{t('viewMode.all')}</option>
        <option value="mine">{t('viewMode.mine')}</option>
      </select>

      {/* Quick Filter: Heute fällig */}
      <button
        onClick={() => toggleDueDateFilter('today')}
        className={`inline-flex items-center gap-2 rounded-lg px-4 h-10
                   border transition-colors font-medium text-sm whitespace-nowrap
                   ${selectedDueDateFilters.includes('today')
                     ? 'border-[#005fab] bg-[#005fab] text-white'
                     : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                   }`}
      >
        <CalendarDaysIcon className="w-4 h-4" />
        {t('quickFilters.dueToday')}
      </button>

      {/* Quick Filter: Überfällig */}
      <button
        onClick={() => toggleDueDateFilter('overdue')}
        className={`inline-flex items-center gap-2 rounded-lg px-4 h-10
                   border transition-colors font-medium text-sm whitespace-nowrap
                   ${selectedDueDateFilters.includes('overdue')
                     ? 'border-[#005fab] bg-[#005fab] text-white'
                     : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                   }`}
      >
        <ExclamationTriangleIcon className="w-4 h-4" />
        {t('quickFilters.overdue')}
      </button>

      {/* Filter Popover */}
      <Popover className="relative">
        <Popover.Button
          className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10 ${
            activeFiltersCount > 0
              ? 'border-[#005fab] bg-[#005fab]/5 text-[#005fab] hover:bg-[#005fab]/10'
              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
          }`}
          aria-label="Filter"
        >
          <FunnelIcon className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#005fab] text-xs font-medium text-white">
              {activeFiltersCount}
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
          <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px] origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Spalte 1: Fälligkeit + Sortierung */}
                <div className="space-y-4">
                  {/* Fälligkeit Filter */}
                  <div className="mb-[10px]">
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">
                      {t('dueDateFilter.label')}
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {[
                        { value: 'today', labelKey: 'dueDateFilter.options.today' },
                        { value: 'overdue', labelKey: 'dueDateFilter.options.overdue' },
                        { value: 'future', labelKey: 'dueDateFilter.options.future' },
                        { value: 'no-date', labelKey: 'dueDateFilter.options.noDate' }
                      ].map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDueDateFilters.includes(option.value)}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...selectedDueDateFilters, option.value]
                                : selectedDueDateFilters.filter(v => v !== option.value);
                              onDueDateFiltersChange(newValues);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                          />
                          <span className="text-sm text-zinc-700">
                            {t(option.labelKey)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sortierung */}
                  <div className="mb-[10px]">
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">
                      {t('sortBy.label')}
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'dueDate', labelKey: 'sortBy.options.dueDate' },
                        { value: 'createdAt', labelKey: 'sortBy.options.createdAt' },
                        { value: 'title', labelKey: 'sortBy.options.title' }
                      ].map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="sortBy"
                            checked={sortBy === option.value}
                            onChange={() => onSortByChange(option.value as 'dueDate' | 'createdAt' | 'title')}
                            className="h-4 w-4 border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                          />
                          <span className="text-sm text-zinc-700">
                            {t(option.labelKey)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Spalte 2: Status + Zuständige Mitglieder */}
                <div className="space-y-4">
                  {/* Status Filter */}
                  <div className="mb-[10px]">
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">
                      {t('statusFilter.label')}
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'pending', labelKey: 'statusFilter.options.pending' },
                        { value: 'in_progress', labelKey: 'statusFilter.options.inProgress' },
                        { value: 'completed', labelKey: 'statusFilter.options.completed' }
                      ].map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStatusFilters.includes(option.value)}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...selectedStatusFilters, option.value]
                                : selectedStatusFilters.filter(v => v !== option.value);
                              onStatusFiltersChange(newValues);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                          />
                          <span className="text-sm text-zinc-700">
                            {t(option.labelKey)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Zuständige Mitglieder Filter */}
                  {teamMembers.length > 0 && (
                    <div className="mb-[10px]">
                      <label className="block text-sm font-semibold text-zinc-700 mb-1">
                        {t('assigneeFilter.label')}
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {teamMembers.map((member) => (
                          <label
                            key={member.userId || member.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssigneeIds.includes(member.userId || member.id || '')}
                              onChange={(e) => {
                                const memberId = member.userId || member.id || '';
                                const newValues = e.target.checked
                                  ? [...selectedAssigneeIds, memberId]
                                  : selectedAssigneeIds.filter(v => v !== memberId);
                                onAssigneeIdsChange(newValues);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                            />
                            <span className="text-sm text-zinc-700">
                              {member.displayName}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset Button am Ende */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-end pt-2 border-t border-zinc-200">
                  <button
                    onClick={onResetFilters}
                    className="text-sm text-zinc-500 hover:text-zinc-700 underline"
                  >
                    {t('reset')}
                  </button>
                </div>
              )}
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
});

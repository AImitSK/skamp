// src/components/projects/kanban/BoardFilterPanel.tsx - Filter Panel für Plan 10/9
'use client';

import React, { useState } from 'react';
import {
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  BuildingOfficeIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

import { BoardFilters } from '@/lib/kanban/kanban-board-service';
import { ProjectPriority } from '@/types/project';

// ========================================
// INTERFACES
// ========================================

export interface BoardFilterPanelProps {
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  onClose: () => void;
  projectCount: number;
}

// ========================================
// FILTER PANEL KOMPONENTE
// ========================================

export const BoardFilterPanel: React.FC<BoardFilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClose,
  projectCount
}) => {
  // Local State für Form Fields
  const [localFilters, setLocalFilters] = useState<BoardFilters>(filters);

  // Mock-Daten (in der Praxis würden diese dynamisch geladen)
  const availableCustomers = [
    { id: 'customer1', name: 'TechCorp GmbH' },
    { id: 'customer2', name: 'StartUp AG' },
    { id: 'customer3', name: 'Media Solutions' }
  ];

  const availableTeamMembers = [
    { id: 'user1', name: 'Max Mustermann' },
    { id: 'user2', name: 'Lisa Schmidt' },
    { id: 'user3', name: 'Tom Weber' }
  ];

  const availableTags = [
    'Marketing', 'PR', 'Social Media', 'Event', 'Launch', 'Campaign'
  ];

  const availablePriorities: ProjectPriority[] = ['low', 'medium', 'high', 'urgent'];

  // Apply Filters
  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  // Reset Filters
  const resetFilters = () => {
    const emptyFilters: BoardFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  // Close without applying
  const handleClose = () => {
    setLocalFilters(filters); // Reset to original
    onClose();
  };

  // Update local filter
  const updateLocalFilter = (key: keyof BoardFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  // Toggle array value (customers, teamMembers, etc.)
  const toggleArrayValue = (key: keyof BoardFilters, value: string) => {
    const currentArray = (localFilters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateLocalFilter(key, newArray.length > 0 ? newArray : undefined);
  };

  // Toggle boolean value (overdue, critical)
  const toggleBooleanValue = (key: keyof BoardFilters) => {
    const currentValue = localFilters[key] as boolean;
    updateLocalFilter(key, !currentValue || undefined);
  };

  // Date Range Handler
  const handleDateRangeChange = (type: 'start' | 'end', dateStr: string) => {
    const date = dateStr ? new Date(dateStr) : null;
    const currentRange = localFilters.dateRange || [null, null];
    
    if (type === 'start') {
      const newRange: [Date, Date] | undefined = date && currentRange[1] 
        ? [date, currentRange[1]] 
        : date 
        ? [date, date] 
        : undefined;
      updateLocalFilter('dateRange', newRange);
    } else {
      const newRange: [Date, Date] | undefined = currentRange[0] && date
        ? [currentRange[0], date]
        : date 
        ? [date, date] 
        : undefined;
      updateLocalFilter('dateRange', newRange);
    }
  };

  // Format Date for Input
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="filter-panel bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Filter & Suche</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Customers Filter */}
          <div className="filter-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
              Kunden
            </label>
            <div className="space-y-2">
              {availableCustomers.map(customer => (
                <label key={customer.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(localFilters.customers || []).includes(customer.id)}
                    onChange={() => toggleArrayValue('customers', customer.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">{customer.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Team Members Filter */}
          <div className="filter-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="h-4 w-4 inline mr-1" />
              Team-Mitglieder
            </label>
            <div className="space-y-2">
              {availableTeamMembers.map(member => (
                <label key={member.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(localFilters.teamMembers || []).includes(member.id)}
                    onChange={() => toggleArrayValue('teamMembers', member.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="filter-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
              Priorität
            </label>
            <div className="space-y-2">
              {availablePriorities.map(priority => (
                <label key={priority} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(localFilters.priority || []).includes(priority)}
                    onChange={() => toggleArrayValue('priority', priority)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600 capitalize">
                    {priority === 'urgent' ? 'Dringend' :
                     priority === 'high' ? 'Hoch' :
                     priority === 'medium' ? 'Mittel' :
                     priority === 'low' ? 'Niedrig' : priority}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div className="filter-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TagIcon className="h-4 w-4 inline mr-1" />
              Tags
            </label>
            <div className="space-y-2">
              {availableTags.map(tag => (
                <label key={tag} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(localFilters.tags || []).includes(tag)}
                    onChange={() => toggleArrayValue('tags', tag)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">{tag}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
          {/* Date Range */}
          <div className="filter-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
              Datum-Bereich
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Von</label>
                <input
                  type="date"
                  value={formatDateForInput(localFilters.dateRange?.[0] || null)}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bis</label>
                <input
                  type="date"
                  value={formatDateForInput(localFilters.dateRange?.[1] || null)}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Special Filters */}
          <div className="filter-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ClockIcon className="h-4 w-4 inline mr-1" />
              Besondere Filter
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.overdue || false}
                  onChange={() => toggleBooleanValue('overdue')}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Überfällige Projekte</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.critical || false}
                  onChange={() => toggleBooleanValue('critical')}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Kritische Projekte</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'} gefunden
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              Zurücksetzen
            </button>
            
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Filter anwenden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardFilterPanel;
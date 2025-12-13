'use client';

import React from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface MessageFiltersProps {
  searchTerm: string;
  filterType: 'all' | 'email' | 'call' | 'meeting' | 'note';
  activeView: 'external' | 'team';
  onSearchChange: (term: string) => void;
  onFilterChange: (type: 'all' | 'email' | 'call' | 'meeting' | 'note') => void;
  onViewChange: (view: 'external' | 'team') => void;
}

/**
 * MessageFilters Component
 *
 * Filter- und Such-Bereich mit:
 * - Suchfeld für Kommunikation
 * - Type-Filter (Alle, E-Mails, Anrufe, Meetings, Notizen)
 * - Tab-Navigation (Externe Kommunikation / Team-Chat)
 *
 * Extrahiert aus CommunicationModal.tsx:260-321
 */
export const MessageFilters = React.memo<MessageFiltersProps>(function MessageFilters({
  searchTerm,
  filterType,
  activeView,
  onSearchChange,
  onFilterChange,
  onViewChange
}) {
  const t = useTranslations('projects.communication.modal.filters');

  return (
    <>
      {/* Search and Filter */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => onFilterChange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('types.all')}</option>
              <option value="email">{t('types.email')}</option>
              <option value="call">{t('types.call')}</option>
              <option value="meeting">{t('types.meeting')}</option>
              <option value="note">{t('types.note')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-6 px-6">
          <button
            onClick={() => onViewChange('external')}
            className={`py-3 text-sm font-medium ${
              activeView === 'external'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <EnvelopeIcon className="w-4 h-4 mr-2 inline" />
            {t('tabs.external')}
          </button>
          <button
            onClick={() => onViewChange('team')}
            className={`py-3 text-sm font-medium ${
              activeView === 'team'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2 inline" />
            {t('tabs.team')}
          </button>
        </div>
      </div>
    </>
  );
});

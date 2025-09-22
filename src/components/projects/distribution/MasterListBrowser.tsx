// src/components/projects/distribution/MasterListBrowser.tsx
'use client';

import { useState, Fragment } from 'react';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Popover, Transition } from '@headlessui/react';
import {
  LinkIcon,
  UsersIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';

interface Props {
  lists: DistributionList[];
  onLink: (listId: string) => void;
}

export default function MasterListBrowser({ lists, onLink }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Listen
  const filteredLists = lists.filter(list => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!list.name.toLowerCase().includes(searchLower) &&
          !(list.description?.toLowerCase().includes(searchLower))) {
        return false;
      }
    }

    // Typ-Filter
    if (selectedTypes.length > 0) {
      if (!selectedTypes.includes(list.type)) return false;
    }

    // Kategorie-Filter
    if (selectedCategories.length > 0) {
      if (!selectedCategories.includes(list.category || 'custom')) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLists = filteredLists.slice(startIndex, startIndex + itemsPerPage);

  // Filter Options
  const categoryOptions = [
    { value: 'press', label: 'Presse' },
    { value: 'customers', label: 'Kunden' },
    { value: 'partners', label: 'Partner' },
    { value: 'leads', label: 'Leads' },
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];

  const typeOptions = [
    { value: 'dynamic', label: 'Dynamisch' },
    { value: 'static', label: 'Statisch' }
  ];

  const activeFiltersCount = selectedCategories.length + selectedTypes.length;

  const getCategoryColor = (category?: string): string => {
    switch (category) {
      case 'press': return 'purple';
      case 'customers': return 'blue';
      case 'partners': return 'green';
      case 'leads': return 'amber';
      default: return 'zinc';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Subheading>Verfügbare Master-Listen</Subheading>
        <Text className="text-sm text-gray-500">
          {filteredLists.length} {filteredLists.length === 1 ? 'Liste' : 'Listen'} verfügbar
        </Text>
      </div>

      {/* Such- und Filterleiste */}
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Master-Listen durchsuchen..."
          className="flex-1"
        />

        {/* Filter Button */}
        <Popover className="relative">
          <Popover.Button
            className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10 ${
              activeFiltersCount > 0
                ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-label="Filter"
          >
            <FunnelIcon className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
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
            <Popover.Panel className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Filter</h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCategories([]);
                        setSelectedTypes([]);
                        setCurrentPage(1);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ
                  </label>
                  <div className="space-y-2">
                    {typeOptions.map((option) => {
                      const isChecked = selectedTypes.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...selectedTypes, option.value]
                                : selectedTypes.filter(v => v !== option.value);
                              setSelectedTypes(newValues);
                              setCurrentPage(1);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {categoryOptions.map((option) => {
                      const isChecked = selectedCategories.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...selectedCategories, option.value]
                                : selectedCategories.filter(v => v !== option.value);
                              setSelectedCategories(newValues);
                              setCurrentPage(1);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>
      </div>

      {/* Master-Listen Tabelle */}
      {paginatedLists.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <div className="w-[35%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </div>
              <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategorie
              </div>
              <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </div>
              <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                Kontakte
              </div>
              <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktualisiert
              </div>
              <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                Aktion
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200">
            {paginatedLists.map((list) => (
              <div key={list.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  {/* Name */}
                  <div className="w-[35%] min-w-0">
                    <div className="flex items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {list.name}
                        </p>
                        {list.description && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {list.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kategorie */}
                  <div className="w-[15%]">
                    <Badge
                      color={getCategoryColor(list.category) as any}
                      className="text-xs whitespace-nowrap"
                    >
                      {LIST_CATEGORY_LABELS[list.category as keyof typeof LIST_CATEGORY_LABELS] || list.category}
                    </Badge>
                  </div>

                  {/* Typ */}
                  <div className="w-[10%]">
                    <Badge
                      color={list.type === 'dynamic' ? 'green' : 'zinc'}
                      className="text-xs whitespace-nowrap"
                    >
                      {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                    </Badge>
                  </div>

                  {/* Kontakte */}
                  <div className="w-[10%] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-medium text-gray-700">
                        {(list.contactCount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Aktualisiert */}
                  <div className="flex-1">
                    <div className="flex items-center text-sm text-gray-600">
                      {list.type === 'dynamic' && (
                        <ArrowPathIcon className="h-3 w-3 mr-1 text-gray-400" />
                      )}
                      <span>{formatDate(list.lastUpdated || list.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Aktion */}
                  <div className="w-[10%] text-center">
                    <Button
                      onClick={() => list.id && onLink(list.id)}
                      color="secondary"
                      className="text-xs px-3 py-1"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Verknüpfen
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
          <UsersIcon className="mx-auto h-10 w-10 text-gray-400" />
          <Text className="mt-2 text-gray-600">
            {searchTerm || selectedCategories.length > 0 || selectedTypes.length > 0
              ? 'Keine Listen gefunden'
              : 'Keine weiteren Master-Listen verfügbar'}
          </Text>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            plain
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center text-sm"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Zurück
          </Button>
          <div className="flex items-center gap-2">
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <Button
                  key={pageNum}
                  plain
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm ${
                    currentPage === pageNum
                      ? 'font-semibold text-primary bg-primary/10 rounded'
                      : 'text-gray-600'
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            plain
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center text-sm"
          >
            Weiter
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
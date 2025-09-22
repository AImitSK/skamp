// src/components/projects/distribution/MasterListBrowser.tsx
'use client';

import { useState } from 'react';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import {
  LinkIcon,
  UsersIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';

interface Props {
  lists: DistributionList[];
  onLink: (listId: string) => void;
}

export default function MasterListBrowser({ lists, onLink }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter Listen
  const filteredLists = lists.filter(list => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!list.name.toLowerCase().includes(searchLower) &&
          !(list.description?.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    if (selectedCategory !== 'all') {
      if (list.category !== selectedCategory) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLists = filteredLists.slice(startIndex, startIndex + itemsPerPage);

  // Kategorien für Filter
  const categories = ['all', 'press', 'customers', 'partners', 'leads', 'custom'];

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
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Master-Listen durchsuchen..."
          className="flex-1"
        />
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat}
              plain
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`text-sm ${selectedCategory === cat ? 'font-semibold text-primary' : 'text-gray-600'}`}
            >
              {cat === 'all' ? 'Alle' : LIST_CATEGORY_LABELS[cat as keyof typeof LIST_CATEGORY_LABELS] || cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Listen Grid */}
      {paginatedLists.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedLists.map((list) => (
            <div
              key={list.id}
              className="relative rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h4 className="font-medium text-gray-900 truncate">
                    {list.name}
                  </h4>
                  {list.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {list.description}
                    </p>
                  )}
                </div>
                <Button
                  plain
                  onClick={() => list.id && onLink(list.id)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                  title="Liste verknüpfen"
                >
                  <LinkIcon className="h-4 w-4 text-primary" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Badge
                  color={getCategoryColor(list.category) as any}
                  className="text-xs"
                >
                  {LIST_CATEGORY_LABELS[list.category as keyof typeof LIST_CATEGORY_LABELS] || list.category}
                </Badge>
                <Badge
                  color={list.type === 'dynamic' ? 'green' : 'zinc'}
                  className="text-xs"
                >
                  {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <UsersIcon className="h-4 w-4 mr-1" />
                  <span>{(list.contactCount || 0).toLocaleString()} Kontakte</span>
                </div>
                {list.type === 'dynamic' && (
                  <div className="flex items-center text-xs text-gray-400">
                    <ArrowPathIcon className="h-3 w-3 mr-1" />
                    {formatDate(list.lastUpdated || list.updatedAt)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
          <UsersIcon className="mx-auto h-10 w-10 text-gray-400" />
          <Text className="mt-2 text-gray-600">
            {searchTerm || selectedCategory !== 'all'
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
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                plain
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 text-sm ${
                  currentPage === i + 1
                    ? 'font-semibold text-primary bg-primary/10 rounded'
                    : 'text-gray-600'
                }`}
              >
                {i + 1}
              </Button>
            ))}
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
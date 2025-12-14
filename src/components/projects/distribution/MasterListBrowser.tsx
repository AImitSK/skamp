// src/components/projects/distribution/MasterListBrowser.tsx
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { UsersIcon } from '@heroicons/react/24/outline';
import { DistributionList } from '@/types/lists';
import ListDetailsModal from './ListDetailsModal';

// Sub-Komponenten
import ListSearchBar from './components/ListSearchBar';
import ListFilterButton from './components/ListFilterButton';
import ListTableHeader from './components/ListTableHeader';
import ListPagination from './components/ListPagination';
import EmptyListState from './components/EmptyListState';
import MasterListRow from './components/MasterListRow';

// Helper Functions
import { categoryOptions, masterListTypeOptions } from './helpers/list-helpers';

interface Props {
  lists: DistributionList[];
  linkedListIds?: string[];
  onLink: (listId: string) => void;
  onUnlink?: (listId: string) => void;
}

export default function MasterListBrowser({ lists, linkedListIds = [], onLink, onUnlink }: Props) {
  const t = useTranslations('projects.distribution.masterListBrowser');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedList, setSelectedList] = useState<DistributionList | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Filter Listen (memoized für Performance)
  const filteredLists = useMemo(() => {
    return lists.filter(list => {
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
  }, [lists, searchTerm, selectedTypes, selectedCategories]);

  // Pagination (memoized)
  const totalPages = useMemo(() => {
    return Math.ceil(filteredLists.length / itemsPerPage);
  }, [filteredLists.length, itemsPerPage]);

  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLists, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Heading>{t('title')}</Heading>
        <Text className="text-sm text-gray-500">
          {t('listsAvailable', { count: filteredLists.length })}
        </Text>
      </div>

      {/* Such- und Filterleiste */}
      <div className="flex items-center gap-2">
        <ListSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('searchPlaceholder')}
        />
        <ListFilterButton
          categoryOptions={categoryOptions}
          typeOptions={masterListTypeOptions}
          selectedCategories={selectedCategories}
          selectedTypes={selectedTypes}
          onCategoryChange={(values) => {
            setSelectedCategories(values);
            setCurrentPage(1);
          }}
          onTypeChange={(values) => {
            setSelectedTypes(values);
            setCurrentPage(1);
          }}
          onReset={() => {
            setSelectedCategories([]);
            setSelectedTypes([]);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Master-Listen Tabelle */}
      {paginatedLists.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <ListTableHeader
            columns={[
              { label: t('columns.name'), width: 'w-[35%]' },
              { label: t('columns.category'), width: 'w-[15%]' },
              { label: t('columns.type'), width: 'w-[15%]' },
              { label: t('columns.contacts'), width: 'w-[12%]' },
              { label: t('columns.updated'), width: 'flex-1' },
            ]}
          />

          {/* Body */}
          <div className="divide-y divide-gray-200">
            {paginatedLists.map((list) => (
              <MasterListRow
                key={list.id}
                list={list}
                isLinked={linkedListIds.includes(list.id!)}
                onViewDetails={() => {
                  setSelectedList(list);
                  setModalOpen(true);
                }}
                onToggleLink={() => {
                  if (!list.id) return;
                  const isLinked = linkedListIds.includes(list.id);
                  if (isLinked && onUnlink) {
                    onUnlink(list.id);
                  } else {
                    onLink(list.id);
                  }
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyListState
          icon={UsersIcon}
          title={
            searchTerm || selectedCategories.length > 0 || selectedTypes.length > 0
              ? t('emptyState.noListsFound')
              : t('emptyState.noMasterLists')
          }
          description=""
        />
      )}

      {/* Pagination */}
      <ListPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Listen-Details Modal */}
      <ListDetailsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedList(null);
        }}
        list={selectedList}
        type="master"
      />
    </div>
  );
}
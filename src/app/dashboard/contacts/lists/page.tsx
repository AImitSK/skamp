// src/app/dashboard/contacts/lists/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon
} from "@heroicons/react/24/outline";
import { listsService } from "@/lib/firebase/lists-service";
import { DistributionList, ListMetrics } from "@/types/lists";
import ListModal from "./ListModal";
import Papa from 'papaparse';
import clsx from 'clsx';
import { useLists, useCreateList, useUpdateList, useDeleteList, useBulkDeleteLists } from '@/lib/hooks/useListsData';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from './components/shared/ConfirmDialog';
import { toastService } from '@/lib/utils/toast';

export default function ListsPage() {
  const t = useTranslations('lists');
  const tToast = useTranslations('toasts');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // React Query hooks statt useEffect
  const { data: lists = [], isLoading } = useLists(currentOrganization?.id);
  const { mutate: createList } = useCreateList();
  const { mutate: updateList } = useUpdateList();
  const { mutate: deleteList } = useDeleteList();
  const { mutate: bulkDeleteLists } = useBulkDeleteLists();

  const [metrics, setMetrics] = useState<Map<string, ListMetrics>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Metrics laden wenn Listen sich ändern
  useEffect(() => {
    const loadMetrics = async () => {
      if (!lists || lists.length === 0) return;

      const metricsMap = new Map<string, ListMetrics>();
      for (const list of lists) {
        if (list.id) {
          const listMetrics = await listsService.getListMetrics(list.id);
          if (listMetrics) {
            metricsMap.set(list.id, listMetrics);
          }
        }
      }
      setMetrics(metricsMap);
    };

    loadMetrics();
  }, [lists]);

  const handleCreateList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!currentOrganization?.id || !user) return;

    createList(
      {
        listData,
        organizationId: currentOrganization.id,
        userId: user.uid,
      },
      {
        onSuccess: () => {
          toastService.success(tToast('listCreated'));
          setShowCreateModal(false);
        },
        onError: () => {
          toastService.error(tToast('listCreateError'));
        },
      }
    );
  };

  const handleEditList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!editingList?.id || !currentOrganization?.id) return;

    updateList(
      {
        listId: editingList.id,
        updates: listData,
        organizationId: currentOrganization.id,
      },
      {
        onSuccess: () => {
          toastService.success(tToast('listUpdated'));
          setEditingList(null);
        },
        onError: () => {
          toastService.error(tToast('listUpdateError'));
        },
      }
    );
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!currentOrganization?.id) return;

    setConfirmDialog({
      isOpen: true,
      title: t('deleteDialog.title'),
      message: t('deleteDialog.message', { name: listName }),
      type: 'danger',
      onConfirm: () => {
        deleteList(
          {
            listId,
            organizationId: currentOrganization.id,
          },
          {
            onSuccess: () => {
              toastService.success(tToast('listDeleted', { name: listName }));
            },
            onError: () => {
              toastService.error(tToast('listDeleteError'));
            },
          }
        );
      }
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedListIds.size;
    if (count === 0 || !currentOrganization?.id) return;

    setConfirmDialog({
      isOpen: true,
      title: t('bulkDeleteDialog.title', { count }),
      message: t('bulkDeleteDialog.message', { count }),
      type: 'danger',
      onConfirm: () => {
        bulkDeleteLists(
          {
            listIds: Array.from(selectedListIds),
            organizationId: currentOrganization.id,
          },
          {
            onSuccess: () => {
              toastService.success(tToast('listsDeleted', { count }));
              setSelectedListIds(new Set());
            },
            onError: () => {
              toastService.error(tToast('listsDeleteError'));
            },
          }
        );
      }
    });
  };

  const handleRefreshList = async (listId: string) => {
    if (!currentOrganization?.id) return;

    try {
      await listsService.refreshDynamicList(listId);
      toastService.success(tToast('listRefreshed'));
      // Invalidiere die Listen-Query um die aktualisierten Daten zu laden
      queryClient.invalidateQueries({ queryKey: ['lists', currentOrganization.id] });
    } catch (error) {
      toastService.error(tToast('listRefreshError'));
    }
  };

  const handleRefreshAllLists = async () => {
    if (!user || !currentOrganization?.id) return;

    setConfirmDialog({
      isOpen: true,
      title: t('refreshAllDialog.title'),
      message: t('refreshAllDialog.message'),
      type: 'warning',
      onConfirm: async () => {
        try {
          toastService.info(tToast('refreshAllStarted'));
          await listsService.refreshAllDynamicLists(currentOrganization.id);
          toastService.success(tToast('refreshAllSuccess'));
          // Invalidiere die Listen-Query um die aktualisierten Daten zu laden
          queryClient.invalidateQueries({ queryKey: ['lists', currentOrganization.id] });
        } catch (error) {
          toastService.error(tToast('refreshAllError'));
        }
      }
    });
  };

  const handleExportList = async (list: DistributionList) => {
    try {
      const contacts = await listsService.exportContacts(list.id!);
      const exportData = contacts.map(contact => ({
        "Name": 'name' in contact && typeof contact.name === 'object' 
          ? `${contact.name.firstName} ${contact.name.lastName}` 
          : `${(contact as any).firstName} ${(contact as any).lastName}`,
        "Position": contact.position || '',
        "Firma": contact.companyName || '',
        "E-Mail": 'emails' in contact && Array.isArray(contact.emails) 
          ? contact.emails[0]?.email || ''
          : (contact as any).email || '',
        "Telefon": 'phones' in contact && Array.isArray(contact.phones)
          ? contact.phones[0]?.number || ''
          : (contact as any).phone || ''
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${list.name.toLowerCase().replace(/\s+/g, '-')}-kontakte.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toastService.success(tToast('exportSuccess'));
    } catch (error) {
      toastService.error(tToast('exportError'));
    }
  };

  // Filter Options
  const categoryOptions = [
    { value: 'press', label: t('categories.press') },
    { value: 'customers', label: t('categories.customers') },
    { value: 'partners', label: t('categories.partners') },
    { value: 'leads', label: t('categories.leads') },
    { value: 'custom', label: t('categories.custom') }
  ];

  const typeOptions = [
    { value: 'dynamic', label: t('types.dynamic') },
    { value: 'static', label: t('types.static') }
  ];

  const filteredLists = useMemo(() => {
    return lists.filter(list => {
      const searchMatch = list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         list.description?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;
      
      const categoryMatch = selectedCategory.length === 0 || 
                           selectedCategory.includes(list.category || 'custom');
      if (!categoryMatch) return false;

      const typeMatch = selectedTypes.length === 0 || 
                       selectedTypes.includes(list.type);
      if (!typeMatch) return false;
      
      return true;
    });
  }, [lists, searchTerm, selectedCategory, selectedTypes]);

  // Paginated Data
  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLists, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLists.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedTypes]);

  const getCategoryLabel = (category: string) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option?.label || category;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return t('unknown');
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedListIds(new Set(paginatedLists.map(l => l.id!)));
    } else {
      setSelectedListIds(new Set());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">{t('loading')}</Text>
        </div>
      </div>
    );
  }

  const activeFiltersCount = selectedCategory.length + selectedTypes.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-zinc-950 dark:text-white">{t('title')}</h1>
      </div>

      {/* Compact Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className={clsx(
                'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
                'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                'dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-700',
                'h-10'
              )}
            />
          </div>

          {/* Filter Button */}
          <Popover className="relative">
            <Popover.Button
              className={clsx(
                'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10',
                activeFiltersCount > 0
                  ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              )}
              aria-label="Filter"
            >
              <FunnelIcon className="h-5 w-5 stroke-2" />
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
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px] origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Category Filter */}
                    <div className="mb-[10px]">
                      <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('filters.category')}
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {categoryOptions.map((option) => {
                          const isChecked = selectedCategory.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={isChecked}
                                onChange={(checked: boolean) => {
                                  const newValues = checked
                                    ? [...selectedCategory, option.value]
                                    : selectedCategory.filter(v => v !== option.value);
                                  setSelectedCategory(newValues);
                                }}
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                {option.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Type Filter */}
                    <div className="mb-[10px]">
                      <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('filters.type')}
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {typeOptions.map((option) => {
                          const isChecked = selectedTypes.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={isChecked}
                                onChange={(checked: boolean) => {
                                  const newValues = checked
                                    ? [...selectedTypes, option.value]
                                    : selectedTypes.filter(v => v !== option.value);
                                  setSelectedTypes(newValues);
                                }}
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                {option.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {activeFiltersCount > 0 && (
                    <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <button
                        onClick={() => {
                          setSelectedCategory([]);
                          setSelectedTypes([]);
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
                      >
                        {t('filters.reset')}
                      </button>
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>

          {/* Add Button */}
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('createButton')}
          </Button>

          {/* Actions Button */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-2.5 text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 h-10 w-10">
              <EllipsisVerticalIcon className="h-5 w-5 stroke-[2.5]" />
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
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="py-1">
                  <button
                    onClick={handleRefreshAllLists}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    {t('actions.refreshAll')}
                  </button>
                  {selectedListIds.size > 0 && (
                    <>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-4 w-4" />
                        {t('actions.deleteSelected', { count: selectedListIds.size })}
                      </button>
                    </>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('resultsInfo', { filtered: filteredLists.length, total: lists.length })}
          {selectedListIds.size > 0 && (
            <span className="ml-2">
              • {t('selected', { count: selectedListIds.size })}
            </span>
          )}
        </Text>

        {/* Bulk Delete Link */}
        {selectedListIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {t('bulkDeleteLink', { count: selectedListIds.size })}
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {filteredLists.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white dark:bg-zinc-800">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mt-2">{t('empty.title')}</h3>
            <Text className="mt-1">
              {searchTerm || selectedCategory.length > 0 || selectedTypes.length > 0
                ? t('empty.searchHint')
                : t('empty.createHint')}
            </Text>
            {!searchTerm && selectedCategory.length === 0 && selectedTypes.length === 0 && (
              <div className="mt-6">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  color="primary"
                >
                  <PlusIcon />
                  {t('empty.createFirstButton')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Table View
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="flex items-center w-[30%]">
                  <Checkbox
                    checked={paginatedLists.length > 0 && selectedListIds.size === paginatedLists.length}
                    indeterminate={selectedListIds.size > 0 && selectedListIds.size < paginatedLists.length}
                    onChange={(checked: boolean) => handleSelectAll(checked)}
                  />
                  <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t('table.name')}
                  </span>
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {t('table.category')}
                </div>
                <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {t('table.type')}
                </div>
                <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {t('table.contacts')}
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {t('table.usage')}
                </div>
                <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pr-14">
                  {t('table.updated')}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedLists.map((list) => {
                const listMetrics = metrics.get(list.id!);
                return (
                  <div key={list.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      {/* Name */}
                      <div className="flex items-center w-[30%]">
                        <Checkbox
                          checked={selectedListIds.has(list.id!)}
                          onChange={(checked: boolean) => {
                            const newIds = new Set(selectedListIds);
                            if (checked) newIds.add(list.id!);
                            else newIds.delete(list.id!);
                            setSelectedListIds(newIds);
                          }}
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <Link
                            href={`/dashboard/contacts/lists/${list.id}`}
                            className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block"
                          >
                            {list.name}
                          </Link>
                          {list.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                              {list.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Category */}
                      <div className="w-[15%]">
                        <Badge color="zinc" className="text-xs whitespace-nowrap">
                          {getCategoryLabel(list.category || 'custom')}
                        </Badge>
                      </div>

                      {/* Type */}
                      <div className="w-[10%]">
                        <Badge color={list.type === 'dynamic' ? 'green' : 'blue'} className="text-xs whitespace-nowrap">
                          {list.type === 'dynamic' ? t('types.dynamic') : t('types.static')}
                        </Badge>
                      </div>

                      {/* Contacts */}
                      <div className="w-[10%]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {(list.contactCount || 0).toLocaleString()}
                          </span>
                          {list.type === 'dynamic' && (
                            <button
                              onClick={() => handleRefreshList(list.id!)}
                              className="text-blue-600 hover:text-blue-800"
                              title={t('actions.refresh')}
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Usage */}
                      <div className="w-[15%]">
                        {listMetrics ? (
                          <div className="text-sm">
                            <div className="font-medium text-zinc-700 dark:text-zinc-300">
                              {t('usage.campaigns', { count: listMetrics.last30DaysCampaigns })}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {t('usage.last30Days')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">{t('usage.notUsed')}</span>
                        )}
                      </div>

                      {/* Updated */}
                      <div className="flex-1 pr-14">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {formatDate(list.lastUpdated || list.updatedAt)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="ml-4">
                        <Dropdown>
                          <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                            <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-400 stroke-[2.5]" />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
  <DropdownItem href={`/dashboard/contacts/lists/${list.id}`}>
    <EyeIcon className="h-4 w-4" />
    {t('actions.view')}
  </DropdownItem>
  <DropdownItem onClick={() => {
    setEditingList(list);
    setShowCreateModal(true);
  }}>
    <PencilIcon className="h-4 w-4" />
    {t('actions.edit')}
  </DropdownItem>
  {list.type === 'dynamic' && (
    <DropdownItem onClick={() => handleRefreshList(list.id!)}>
      <ArrowPathIcon className="h-4 w-4" />
      {t('actions.refresh')}
    </DropdownItem>
  )}
  <DropdownItem onClick={() => handleExportList(list)}>
    <ArrowDownTrayIcon className="h-4 w-4" />
    {t('actions.export')}
  </DropdownItem>
  <DropdownDivider />
  <DropdownItem onClick={() => handleDeleteList(list.id!, list.name)}>
    <TrashIcon className="h-4 w-4" />
    <span className="text-red-600">{t('actions.delete')}</span>
  </DropdownItem>
</DropdownMenu>

                        </Dropdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 pt-4">
          <div className="-mt-px flex w-0 flex-1">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="whitespace-nowrap"
            >
              <ChevronLeftIcon />
              {t('pagination.previous')}
            </Button>
          </div>
          <div className="hidden md:-mt-px md:flex">
            {(() => {
              const pages = [];
              const maxVisible = 7;
              let start = Math.max(1, currentPage - 3);
              let end = Math.min(totalPages, start + maxVisible - 1);
              
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }
              
              for (let i = start; i <= end; i++) {
                pages.push(
                  <Button
                    key={i}
                    plain
                    onClick={() => setCurrentPage(i)}
                    className={currentPage === i ? 'font-semibold text-primary' : ''}
                  >
                    {i}
                  </Button>
                );
              }
              
              return pages;
            })()}
          </div>
          <div className="-mt-px flex w-0 flex-1 justify-end">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="whitespace-nowrap"
            >
              {t('pagination.next')}
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      )}

      {/* Modals */}
      {showCreateModal && user && (
        <ListModal
          list={editingList || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingList(null);
          }}
          onSave={editingList ? handleEditList : handleCreateList}
          userId={user.uid}
          organizationId={currentOrganization?.id || user.uid}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
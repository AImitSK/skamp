// src/app/dashboard/contacts/lists/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { SearchableFilter } from "@/components/ui/searchable-filter";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
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
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon,
  CalendarIcon,
  SparklesIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/24/outline";
import { listsService } from "@/lib/firebase/lists-service";
import { DistributionList, ListMetrics } from "@/types/lists";
import ListModal from "./ListModal";
import Papa from 'papaparse';
import clsx from 'clsx';

type ViewMode = 'grid' | 'list';

// ViewToggle Component
function ViewToggle({ value, onChange, className }: { value: ViewMode; onChange: (value: ViewMode) => void; className?: string }) {
  return (
    <div className={clsx('inline-flex rounded-lg border border-zinc-300 dark:border-zinc-600', className)}>
      <button
        onClick={() => onChange('list')}
        className={clsx(
          'flex items-center justify-center h-10 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-l-lg',
          value === 'list'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="List view"
      >
        <ListBulletIcon className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => onChange('grid')}
        className={clsx(
          'flex items-center justify-center h-10 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-r-lg border-l border-zinc-300 dark:border-zinc-600',
          value === 'grid'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="Grid view"
      >
        <Squares2X2Icon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message, 
  action 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>{message}</Text>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ListsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [metrics, setMetrics] = useState<Map<string, ListMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filter & View States
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  useEffect(() => {
    if (user && currentOrganization?.id) {
      loadData();
    }
  }, [user, currentOrganization?.id]);

  const loadData = async () => {
    if (!user || !currentOrganization?.id) return;
    setLoading(true);
    try {
      const listsData = await listsService.getAll(currentOrganization.id);
      setLists(listsData);

      const metricsMap = new Map<string, ListMetrics>();
      for (const list of listsData) {
        if (list.id) {
          const listMetrics = await listsService.getListMetrics(list.id);
          if (listMetrics) {
            metricsMap.set(list.id, listMetrics);
          }
        }
      }
      setMetrics(metricsMap);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Listen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    try {
      await listsService.create(listData);
      showAlert('success', 'Liste erstellt', 'Die Liste wurde erfolgreich erstellt.');
      await loadData();
      setShowCreateModal(false);
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht erstellt werden.');
    }
  };

  const handleEditList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!editingList?.id) return;
    try {
      await listsService.update(editingList.id, listData);
      showAlert('success', 'Liste aktualisiert', 'Die Liste wurde erfolgreich aktualisiert.');
      await loadData();
      setEditingList(null);
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Liste löschen',
      message: `Möchten Sie die Liste "${listName}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await listsService.delete(listId);
          showAlert('success', 'Liste gelöscht', `"${listName}" wurde erfolgreich gelöscht.`);
          await loadData();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen', 'Die Liste konnte nicht gelöscht werden.');
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedListIds.size;
    if (count === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: `${count} Listen löschen`,
      message: `Möchten Sie wirklich ${count} Listen unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedListIds).map(id => 
            listsService.delete(id)
          ));
          showAlert('success', `${count} Listen gelöscht`);
          await loadData();
          setSelectedListIds(new Set());
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  const handleRefreshList = async (listId: string) => {
    try {
      await listsService.refreshDynamicList(listId);
      showAlert('success', 'Liste aktualisiert', 'Die dynamische Liste wurde erfolgreich aktualisiert.');
      await loadData();
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
    }
  };

  const handleRefreshAllLists = async () => {
    if (!user) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Alle Listen aktualisieren',
      message: 'Möchten Sie wirklich alle dynamischen Listen neu berechnen lassen?',
      type: 'warning',
      onConfirm: async () => {
        try {
          showAlert('info', 'Aktualisierung gestartet', 'Alle dynamischen Listen werden neu berechnet...');
          await listsService.refreshAllDynamicLists(currentOrganization?.id || user.uid);
          showAlert('success', 'Aktualisierung abgeschlossen', 'Alle dynamischen Listen wurden erfolgreich aktualisiert.');
          await loadData();
        } catch (error) {
          showAlert('error', 'Fehler', 'Die Listen konnten nicht aktualisiert werden.');
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

      showAlert('success', 'Export erfolgreich', `Die Kontakte wurden erfolgreich exportiert.`);
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht exportiert werden.');
    }
  };

  const handleDuplicateList = async (listId: string, listName: string) => {
    try {
      await listsService.duplicateList(listId, `${listName} (Kopie)`);
      showAlert('success', 'Liste dupliziert', 'Die Liste wurde erfolgreich dupliziert.');
      await loadData();
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht dupliziert werden.');
    }
  };

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
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">Lade Listen...</Text>
        </div>
      </div>
    );
  }

  const activeFiltersCount = selectedCategory.length + selectedTypes.length;

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Heading level={1}>Verteilerlisten</Heading>
      </div>

      {/* Compact Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Listen durchsuchen..."
            className="flex-1"
          />

          {/* Filter Button */}
          <Popover className="relative">
            <Popover.Button
              className={clsx(
                'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10',
                activeFiltersCount > 0
                  ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
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
              <Popover.Panel className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Filter</h3>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          setSelectedCategory([]);
                          setSelectedTypes([]);
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Kategorie
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {categoryOptions.map((option) => {
                        const isChecked = selectedCategory.includes(option.value);
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
                                  ? [...selectedCategory, option.value]
                                  : selectedCategory.filter(v => v !== option.value);
                                setSelectedCategory(newValues);
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
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
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
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
              </Popover.Panel>
            </Transition>
          </Popover>

          {/* View Toggle */}
          <ViewToggle value={viewMode} onChange={setViewMode} />

          {/* Add Button */}
          <Button 
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Liste erstellen
          </Button>

          {/* Actions Button */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center p-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <EllipsisVerticalIcon className="h-4 w-4" />
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
                    Alle aktualisieren
                  </button>
                  {selectedListIds.size > 0 && (
                    <>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Auswahl löschen ({selectedListIds.size})
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
          {filteredLists.length} von {lists.length} Listen
          {selectedListIds.size > 0 && (
            <span className="ml-2">
              • {selectedListIds.size} ausgewählt
            </span>
          )}
        </Text>
        
        {/* Bulk Delete Link */}
        {selectedListIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedListIds.size} Löschen
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {filteredLists.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white dark:bg-zinc-800">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Heading level={3} className="mt-2">Keine Listen gefunden</Heading>
            <Text className="mt-1">
              {searchTerm || selectedCategory.length > 0 || selectedTypes.length > 0
                ? "Versuchen Sie andere Suchkriterien" 
                : "Erstellen Sie Ihre erste Verteilerliste"}
            </Text>
            {!searchTerm && selectedCategory.length === 0 && selectedTypes.length === 0 && (
              <div className="mt-6">
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  color="primary"
                >
                  <PlusIcon />
                  Erste Liste erstellen
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'list' ? (
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
                    Name
                  </span>
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kategorie
                </div>
                <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Typ
                </div>
                <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                  Kontakte
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Verwendung
                </div>
                <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right pr-14">
                  Aktualisiert
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
                        <Badge color="purple" className="text-xs whitespace-nowrap">
                          {getCategoryLabel(list.category || 'custom')}
                        </Badge>
                      </div>

                      {/* Type */}
                      <div className="w-[10%]">
                        <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'} className="text-xs whitespace-nowrap">
                          {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                        </Badge>
                      </div>

                      {/* Contacts */}
                      <div className="w-[10%] text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {(list.contactCount || 0).toLocaleString()}
                          </span>
                          {list.type === 'dynamic' && (
                            <button
                              onClick={() => handleRefreshList(list.id!)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Liste aktualisieren"
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
                              {listMetrics.last30DaysCampaigns} Kampagnen
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              in 30 Tagen
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">Noch nicht verwendet</span>
                        )}
                      </div>

                      {/* Updated */}
                      <div className="flex-1 text-right pr-14">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {formatDate(list.lastUpdated || list.updatedAt)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="ml-4">
                        <Dropdown>
                          <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                            <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
  <DropdownItem href={`/dashboard/contacts/lists/${list.id}`}>
    <EyeIcon className="h-4 w-4" />
    Anzeigen
  </DropdownItem>
  <DropdownItem href={`/dashboard/contacts/lists/${list.id}/analytics`}>
    <ChartBarIcon className="h-4 w-4" />
    Statistiken
  </DropdownItem>
  <DropdownItem onClick={() => {
    setEditingList(list);
    setShowCreateModal(true);
  }}>
    <PencilIcon className="h-4 w-4" />
    Bearbeiten
  </DropdownItem>
  <DropdownItem onClick={() => handleDuplicateList(list.id!, list.name)}>
    <DocumentDuplicateIcon className="h-4 w-4" />
    Duplizieren
  </DropdownItem>
  {list.type === 'dynamic' && (
    <DropdownItem onClick={() => handleRefreshList(list.id!)}>
      <ArrowPathIcon className="h-4 w-4" />
      Aktualisieren
    </DropdownItem>
  )}
  <DropdownItem onClick={() => handleExportList(list)}>
    <ArrowDownTrayIcon className="h-4 w-4" />
    Exportieren
  </DropdownItem>
  <DropdownDivider />
  <DropdownItem onClick={() => handleDeleteList(list.id!, list.name)}>
    <TrashIcon className="h-4 w-4" />
    <span className="text-red-600">Löschen</span>
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
        ) : (
          // Grid View
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedLists.map((list) => {
              const listMetrics = metrics.get(list.id!);
              return (
                <div
                  key={list.id}
                  className="relative rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {/* Checkbox */}
                  <div className="absolute top-4 right-4">
                    <Checkbox
                      checked={selectedListIds.has(list.id!)}
                      onChange={(checked: boolean) => {
                        const newIds = new Set(selectedListIds);
                        if (checked) newIds.add(list.id!);
                        else newIds.delete(list.id!);
                        setSelectedListIds(newIds);
                      }}
                    />
                  </div>

                  {/* List Info */}
                  <div className="pr-8">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      <Link href={`/dashboard/contacts/lists/${list.id}`} className="hover:text-primary">
                        {list.name}
                      </Link>
                    </h3>
                    {list.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Badge color="purple" className="text-xs">
                        {getCategoryLabel(list.category || 'custom')}
                      </Badge>
                      <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'} className="text-xs">
                        {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Kontakte</span>
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        {(list.contactCount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Verwendet</span>
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        {listMetrics?.last30DaysCampaigns || 0}x
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-700">
                    <Link
                      href={`/dashboard/contacts/lists/${list.id}`}
                      className="text-sm text-primary hover:text-primary-hover"
                    >
                      Anzeigen
                    </Link>
                    <Dropdown>
                      <DropdownButton plain className="p-1 hover:bg-zinc-100 rounded dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem onClick={() => {
                          setEditingList(list);
                          setShowCreateModal(true);
                        }}>
                          <PencilIcon />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownItem onClick={() => handleDuplicateList(list.id!, list.name)}>
                          <DocumentDuplicateIcon />
                          Duplizieren
                        </DropdownItem>
                        {list.type === 'dynamic' && (
                          <DropdownItem onClick={() => handleRefreshList(list.id!)}>
                            <ArrowPathIcon />
                            Aktualisieren
                          </DropdownItem>
                        )}
                        <DropdownItem onClick={() => handleExportList(list)}>
                          <ArrowDownTrayIcon />
                          Exportieren
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem onClick={() => handleDeleteList(list.id!, list.name)}>
                          <TrashIcon />
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              );
            })}
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
              Zurück
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
              Weiter
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
      <Dialog
        open={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              confirmDialog.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <ExclamationTriangleIcon className={`h-6 w-6 ${
                confirmDialog.type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogBody className="mt-2">
                <Text>{confirmDialog.message}</Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button
              plain
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              className="whitespace-nowrap"
            >
              Abbrechen
            </Button>
            <Button
              color={confirmDialog.type === 'danger' ? 'zinc' : 'zinc'}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
              className={confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
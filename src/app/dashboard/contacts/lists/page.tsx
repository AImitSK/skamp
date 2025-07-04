// src/app/dashboard/contacts/lists/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Input } from "@/components/input";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
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
  ChevronRightIcon
} from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { DistributionList, ListMetrics } from "@/types/lists";
import ListModal from "./ListModal";
import Papa from 'papaparse';

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
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [metrics, setMetrics] = useState<Map<string, ListMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingListModal, setEditingListModal] = useState<DistributionList | null>(null);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const listsData = await listsService.getAll(user.uid);
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
    if (!editingListModal?.id) return;
    try {
      await listsService.update(editingListModal.id, listData);
      showAlert('success', 'Liste aktualisiert', 'Die Liste wurde erfolgreich aktualisiert.');
      await loadData();
      setEditingListModal(null);
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
          await listsService.refreshAllDynamicLists(user.uid);
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
      const exportData = [{
        "Listenname": list.name,
        "Typ": list.type === 'dynamic' ? 'Dynamisch' : 'Statisch',
        "Kontakte": list.contactCount || 0,
        "Kategorie": getCategoryLabel(list.category || 'custom'),
        "Beschreibung": list.description || ''
      }];

      const csv = Papa.unparse(exportData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${list.name.toLowerCase().replace(/\s+/g, '-')}-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showAlert('success', 'Export erfolgreich', `Die Liste wurde erfolgreich exportiert.`);
    } catch (error) {
      showAlert('error', 'Fehler', 'Die Liste konnte nicht exportiert werden.');
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(lists.map(list => list.category || 'custom'));
    return ['all', ...Array.from(cats)];
  }, [lists]);

  const filteredLists = useMemo(() => {
    return lists.filter(list => {
      const searchMatch = list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         list.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const categoryMatch = selectedCategory === "all" || 
                           (list.category || 'custom') === selectedCategory;
      
      return searchMatch && categoryMatch;
    });
  }, [lists, searchTerm, selectedCategory]);

  // Paginated Data
  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLists, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLists.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      press: 'Presse',
      customers: 'Kunden',
      partners: 'Partner',
      leads: 'Leads',
      custom: 'Benutzerdefiniert',
      all: 'Alle'
    };
    return labels[category] || category;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Listen...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Heading level={1}>Verteilerlisten</Heading>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
          <Button plain onClick={handleRefreshAllLists} className="whitespace-nowrap">
            <ArrowPathIcon />
            Alle aktualisieren
          </Button>
          <Button 
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon />
            Liste erstellen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Listen durchsuchen..."
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <Button
              key={category}
              plain={selectedCategory !== category}
              color={selectedCategory === category ? "zinc" : undefined}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {getCategoryLabel(category)} ({category === 'all' ? lists.length : lists.filter(l => (l.category || 'custom') === category).length})
            </Button>
          ))}
        </div>
      </div>

      {/* Results Info */}
      <div className="mt-4">
        <Text>
          {filteredLists.length} von {lists.length} Listen
        </Text>
      </div>

      {/* Table */}
      <div className="mt-8">
        {filteredLists.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Heading level={3} className="mt-2">Keine Listen gefunden</Heading>
            <Text className="mt-1">
              {searchTerm || selectedCategory !== "all" 
                ? "Versuchen Sie andere Suchkriterien" 
                : "Erstellen Sie Ihre erste Verteilerliste"}
            </Text>
            {!searchTerm && selectedCategory === "all" && (
              <div className="mt-6">
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                >
                  <PlusIcon />
                  Erste Liste erstellen
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Kategorie</TableHeader>
                <TableHeader>Typ</TableHeader>
                <TableHeader>Kontakte</TableHeader>
                <TableHeader>Letzte Verwendung</TableHeader>
                <TableHeader>Aktualisiert</TableHeader>
                <TableHeader>
                  <span className="sr-only">Aktionen</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLists.map((list) => {
                const listMetrics = metrics.get(list.id!);
                return (
                  <TableRow key={list.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <Link 
                        href={`/dashboard/contacts/lists/${list.id}`} 
                        className="text-[#005fab] hover:text-[#004a8c]"
                      >
                        {list.name}
                      </Link>
                    </TableCell>
                    
                    <TableCell>
                      <Badge color="purple" className="text-xs whitespace-nowrap">
                        {getCategoryLabel(list.category || 'custom')}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'} className="text-xs whitespace-nowrap">
                        {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{(list.contactCount || 0).toLocaleString()}</span>
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
                    </TableCell>
                    
                    <TableCell>
                      {listMetrics ? (
                        <div className="text-sm">
                          <div>{listMetrics.last30DaysCampaigns} Kampagnen</div>
                          <Text className="text-gray-500">in 30 Tagen</Text>
                        </div>
                      ) : (
                        <Text>Noch nicht verwendet</Text>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Text>{formatDate(list.lastUpdated || list.updatedAt)}</Text>
                    </TableCell>
                    
                    <TableCell>
                      <Dropdown>
                        <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg">
                          <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                          <DropdownItem href={`/dashboard/contacts/lists/${list.id}`} className="hover:bg-gray-50">
                            <EyeIcon className="text-gray-500" />
                            Anzeigen
                          </DropdownItem>
                          <DropdownItem href={`/dashboard/contacts/lists/${list.id}/analytics`} className="hover:bg-gray-50">
                            <ChartBarIcon className="text-gray-500" />
                            Statistiken
                          </DropdownItem>
                          <DropdownItem 
                            onClick={() => setEditingListModal(list)}
                            className="hover:bg-gray-50"
                          >
                            <PencilIcon className="text-gray-500" />
                            Bearbeiten
                          </DropdownItem>
                          {list.type === 'dynamic' && (
                            <DropdownItem 
                              onClick={() => handleRefreshList(list.id!)}
                              className="hover:bg-gray-50"
                            >
                              <ArrowPathIcon className="text-gray-500" />
                              Aktualisieren
                            </DropdownItem>
                          )}
                          <DropdownItem 
                            onClick={() => handleExportList(list)}
                            className="hover:bg-gray-50"
                          >
                            <ArrowDownTrayIcon className="text-gray-500" />
                            Exportieren
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem 
                            onClick={() => handleDeleteList(list.id!, list.name)}
                            className="hover:bg-red-50"
                          >
                            <TrashIcon className="text-red-500" />
                            <span className="text-red-600">Löschen</span>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                    className={currentPage === i ? 'font-semibold text-[#005fab]' : ''}
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
      {showCreateModal && (
        <ListModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateList}
          userId={user?.uid || ''}
        />
      )}

      {editingListModal && (
        <ListModal
          list={editingListModal}
          onClose={() => setEditingListModal(null)}
          onSave={handleEditList}
          userId={user?.uid || ''}
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
              className="whitespace-nowrap"
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
// src\app\dashboard\contacts\lists\page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
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
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckIcon,
  XMarkIcon,
  ChartBarIcon
} from "@heroicons/react/20/solid";
import { listsService } from "@/lib/firebase/lists-service";
import { DistributionList, ListMetrics } from "@/types/lists";
import ListModal from "./ListModal";
import clsx from "clsx";
import Papa from 'papaparse';

// Toast Notification Component
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

function ToastNotification({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 z-50">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${colors[toast.type]} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in-up`}
            style={{ minWidth: '320px' }}
          >
            <div className="flex">
              <Icon className={`h-5 w-5 ${iconColors[toast.type]} mr-3 flex-shrink-0`} />
              <div className="flex-1">
                <p className="font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm mt-1 opacity-90">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="ml-3 flex-shrink-0 rounded-md hover:opacity-70 focus:outline-none"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Quick Preview Component
function QuickPreview({ list, position }: { list: DistributionList; position: { x: number; y: number } }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      if (rect.right > viewportWidth) {
        newX = position.x - rect.width - 20;
      }
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 20;
      }
      
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '—';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div
      ref={previewRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 animate-fade-in-scale"
      style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
    >
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900">
          {list.name}
        </h4>
        {list.description && (
          <p className="text-sm text-gray-600 mt-1">{list.description}</p>
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Kontakte:</span>
          <span className="font-medium">{(list.contactCount || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Typ:</span>
          <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'} className="text-xs">
            {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Erstellt:</span>
          <span>{formatDate(list.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// Inline Edit Component
function InlineEdit({ 
  value, 
  onSave, 
  onCancel,
  className = ""
}: { 
  value: string; 
  onSave: (value: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={clsx(
          "px-2 py-1 border border-[#005fab] rounded focus:outline-none focus:ring-2 focus:ring-[#005fab]",
          className
        )}
      />
      <button
        onClick={() => onSave(editValue)}
        className="p-1 text-green-600 hover:bg-green-50 rounded"
      >
        <CheckIcon className="h-4 w-4" />
      </button>
      <button
        onClick={onCancel}
        className="p-1 text-red-600 hover:bg-red-50 rounded"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Dropdown Menu Component
function DropdownMenu({ 
  list, 
  onDelete, 
  onEdit,
  onEditModal,
  onRefresh,
  onExport
}: { 
  list: DistributionList;
  onDelete: (id: string, name: string) => void;
  onEdit: (id: string) => void;
  onEditModal: (list: DistributionList) => void;
  onRefresh: (id: string) => void;
  onExport: (list: DistributionList) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 192 + window.scrollX
      });
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
      </button>

      {isOpen && (
        <div 
          className={`fixed w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transform transition-all duration-200 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999
          }}
        >
          <div className="py-1">
            <Link
              href={`/dashboard/contacts/lists/${list.id}`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <EyeIcon className="h-4 w-4 mr-3 text-gray-400" />
              Anzeigen
            </Link>

            <Link href={`/dashboard/contacts/lists/${list.id}/analytics`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <ChartBarIcon className="h-4 w-4 mr-3 text-gray-400" />
              Statistiken
            </Link>

            <button
              onClick={() => handleAction(() => onEdit(list.id!))}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <PencilIcon className="h-4 w-4 mr-3 text-gray-400" />
              Umbenennen
            </button>

            <button
              onClick={() => handleAction(() => onEditModal(list))}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <PencilIcon className="h-4 w-4 mr-3 text-gray-400" />
              Bearbeiten
            </button>

            {list.type === 'dynamic' && (
              <button
                onClick={() => handleAction(() => onRefresh(list.id!))}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
              >
                <ArrowPathIcon className="h-4 w-4 mr-3 text-gray-400" />
                Aktualisieren
              </button>
            )}

            <button
              onClick={() => handleAction(() => onExport(list))}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-3 text-gray-400" />
              Exportieren
            </button>

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={() => handleAction(() => onDelete(list.id!, list.name))}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <TrashIcon className="h-4 w-4 mr-3" />
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Confirm Dialog Component
function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Löschen",
  cancelText = "Abbrechen",
  type = "danger"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
          <div className="p-6">
            <div className="flex items-center mb-4">
              {type === 'danger' ? (
                <XCircleIcon className="h-6 w-6 text-red-600 mr-3" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <Button plain onClick={onClose}>
                {cancelText}
              </Button>
              <button 
                className={clsx(
                  "px-3 py-2 text-sm font-semibold rounded-md transition-colors",
                  type === 'danger' 
                    ? "bg-red-600 text-white hover:bg-red-500" 
                    : "bg-yellow-600 text-white hover:bg-yellow-500"
                )}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewList, setPreviewList] = useState<{ list: DistributionList; position: { x: number; y: number } } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, confirmText: undefined, cancelText: undefined });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Toast Management
  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message, duration: 5000 };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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
      console.error("Fehler beim Laden der Listen:", error);
      showToast('error', 'Fehler beim Laden', 'Die Listen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    try {
      await listsService.create(listData);
      showToast('success', 'Liste erstellt', 'Die Liste wurde erfolgreich erstellt.');
      await loadData();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Fehler beim Erstellen der Liste:", error);
      showToast('error', 'Fehler', 'Die Liste konnte nicht erstellt werden.');
    }
  };

  const handleEditList = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!editingListModal?.id) return;
    try {
      await listsService.update(editingListModal.id, listData);
      showToast('success', 'Liste aktualisiert', 'Die Liste wurde erfolgreich aktualisiert.');
      await loadData();
      setEditingListModal(null);
    } catch (error) {
      console.error("Fehler beim Bearbeiten der Liste:", error);
      showToast('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Liste löschen',
      message: `Möchten Sie die Liste "${listName}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        setDeletingIds(new Set([listId]));
        
        try {
          await listsService.delete(listId);
          showToast('success', 'Liste gelöscht', `"${listName}" wurde erfolgreich gelöscht.`);
          await loadData();
        } catch (error) {
          console.error("Fehler beim Löschen der Liste:", error);
          showToast('error', 'Fehler beim Löschen', 'Die Liste konnte nicht gelöscht werden.');
          setDeletingIds(new Set());
        }
      }
    });
  };

  const handleRefreshList = async (listId: string) => {
    setRefreshingIds(new Set([listId]));
    try {
      await listsService.refreshDynamicList(listId);
      showToast('success', 'Liste aktualisiert', 'Die dynamische Liste wurde erfolgreich aktualisiert.');
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Liste:", error);
      showToast('error', 'Fehler', 'Die Liste konnte nicht aktualisiert werden.');
    } finally {
      setRefreshingIds(new Set());
    }
  };

  const handleRefreshAllLists = async () => {
    if (!user) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Alle Listen aktualisieren',
      message: 'Möchten Sie wirklich alle dynamischen Listen neu berechnen lassen?',
      type: 'warning',
      confirmText: 'Aktualisieren',
      onConfirm: async () => {
        try {
          showToast('info', 'Aktualisierung gestartet', 'Alle dynamischen Listen werden neu berechnet...');
          await listsService.refreshAllDynamicLists(user.uid);
          showToast('success', 'Aktualisierung abgeschlossen', 'Alle dynamischen Listen wurden erfolgreich aktualisiert.');
          await loadData();
        } catch (error) {
          console.error("Fehler beim Aktualisieren:", error);
          showToast('error', 'Fehler', 'Die Listen konnten nicht aktualisiert werden.');
        }
      }
    });
  };

  const handleInlineEdit = async (listId: string, newName: string) => {
    if (!newName.trim()) {
      showToast('error', 'Fehler', 'Der Name darf nicht leer sein.');
      setEditingId(null);
      return;
    }

    try {
      await listsService.update(listId, { name: newName });
      showToast('success', 'Name aktualisiert', 'Der Listenname wurde erfolgreich geändert.');
      setEditingId(null);
      await loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Namens:", error);
      showToast('error', 'Fehler', 'Der Name konnte nicht aktualisiert werden.');
    }
  };

  const handleExportList = async (list: DistributionList) => {
    try {
      showToast('info', 'Export gestartet', `Die Liste "${list.name}" wird exportiert...`);
      
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

      showToast('success', 'Export erfolgreich', `Die Liste wurde erfolgreich exportiert.`);
    } catch (error) {
      console.error("Fehler beim Exportieren:", error);
      showToast('error', 'Fehler', 'Die Liste konnte nicht exportiert werden.');
    }
  };

  const handleMouseEnter = (list: DistributionList, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPreviewList({
      list,
      position: { x: rect.right + 10, y: rect.top }
    });
  };

  const handleMouseLeave = () => {
    setPreviewList(null);
  };

  const categories = useMemo(() => {
    const cats = new Set(lists.map(list => list.category || 'custom'));
    return Array.from(cats);
  }, [lists]);

  const filteredLists = useMemo(() => {
    return lists.filter(list => {
      if (deletingIds.has(list.id!)) return false;
      
      const searchMatch = list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         list.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const categoryMatch = selectedCategory === "all" || 
                           (list.category || 'custom') === selectedCategory;
      
      return searchMatch && categoryMatch;
    });
  }, [lists, searchTerm, selectedCategory, deletingIds]);

  // Paginated Data
  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLists.slice(startIndex, endIndex);
  }, [filteredLists, currentPage, itemsPerPage]);

  // Total Pages
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
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-[#005fab] rounded-full animate-bounce"></div>
          <p className="mt-4 text-zinc-500">Lade Listen...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Verteilerlisten</Heading>
          <Text className="mt-1">
            Verwalte deine Marketing-Verteiler für alle Kanäle
          </Text>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
        >
          <PlusIcon className="size-4" />
          Liste erstellen
        </button>
      </div>

      {/* Filter + Suche in einer Box */}
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6 space-y-4">
        {/* Kategorie-Filter + Suche + Refresh-Button */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Listen durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab] transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={clsx(
                "px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all",
                selectedCategory === "all"
                  ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-opacity-50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              Alle ({lists.length})
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={clsx(
                  "px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all",
                  selectedCategory === category
                    ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-opacity-50"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {getCategoryLabel(category)} ({lists.filter(l => (l.category || 'custom') === category).length})
              </button>
            ))}
          </div>

          <Button plain onClick={handleRefreshAllLists} className="flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4" />
            Alle aktualisieren
          </Button>
        </div>
      </div>

      {/* Ergebnis-Info */}
      <div className="mb-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredLists.length} von {lists.length} Listen
          {selectedCategory !== "all" && ' • Gefiltert nach Kategorie'}
        </p>
      </div>

      {filteredLists.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white animate-fade-in">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Listen gefunden</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory !== "all" 
              ? "Versuchen Sie andere Suchkriterien" 
              : "Erstellen Sie Ihre erste Verteilerliste"}
          </p>
          {!searchTerm && selectedCategory === "all" && (
            <div className="mt-6">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
              >
                <PlusIcon className="size-4" />
                Erste Liste erstellen
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Kategorie</TableHeader>
                  <TableHeader>Typ</TableHeader>
                  <TableHeader>Kontakte</TableHeader>
                  <TableHeader>Letzte Verwendung</TableHeader>
                  <TableHeader>Aktualisiert</TableHeader>
                  <TableHeader className="w-12 relative overflow-visible"></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedLists.map((list) => {
                  const listMetrics = metrics.get(list.id!);
                  return (
                    <TableRow 
                      key={list.id}
                      className={clsx(
                        "hover:bg-gray-50 transition-all duration-150",
                        deletingIds.has(list.id!) && "opacity-50"
                      )}
                    >
                      <TableCell>
                        {editingId === list.id ? (
                          <InlineEdit
                            value={list.name}
                            onSave={(value) => handleInlineEdit(list.id!, value)}
                            onCancel={() => setEditingId(null)}
                            className="w-full"
                          />
                        ) : (
                          <div 
                            className="font-medium text-[#005fab] hover:text-[#004a8c] cursor-pointer"
                            onMouseEnter={(e) => handleMouseEnter(list, e)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <Link
                              href={`/dashboard/contacts/lists/${list.id}`}
                              className="hover:underline"
                            >
                              {list.name}
                            </Link>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge color="purple" className="text-xs">
                          {getCategoryLabel(list.category || 'custom')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge color={list.type === 'dynamic' ? 'green' : 'zinc'} className="text-xs">
                          {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{(list.contactCount || 0).toLocaleString()}</span>
                          {list.type === 'dynamic' && (
                            <button
                              onClick={() => handleRefreshList(list.id!)}
                              className={clsx(
                                "text-blue-600 hover:text-blue-800 text-xs transition-transform",
                                refreshingIds.has(list.id!) && "animate-spin"
                              )}
                              title="Liste aktualisieren"
                              disabled={refreshingIds.has(list.id!)}
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
                            <div className="text-gray-500">in 30 Tagen</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Noch nicht verwendet</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDate(list.lastUpdated || list.updatedAt)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="relative overflow-visible">
                        <DropdownMenu 
                          list={list}
                          onDelete={handleDeleteList}
                          onEdit={setEditingId}
                          onEditModal={setEditingListModal}
                          onRefresh={handleRefreshList}
                          onExport={handleExportList}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredLists.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
              Einträge pro Seite:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page info and navigation */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLists.length)} von {filteredLists.length}
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Erste Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Vorherige Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1 mx-2">
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={clsx(
                        "min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors",
                        currentPage === page
                          ? "bg-[#005fab] text-white"
                          : "hover:bg-gray-100"
                      )}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  <>
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="min-w-[32px] h-8 px-2 rounded text-sm font-medium hover:bg-gray-100"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="px-1">...</span>}
                      </>
                    )}
                    
                    {Array.from({ length: 5 }, (_, i) => {
                      const page = currentPage - 2 + i;
                      if (page > 0 && page <= totalPages) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={clsx(
                              "min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors",
                              currentPage === page
                                ? "bg-[#005fab] text-white"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {page}
                          </button>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                    
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-1">...</span>}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="min-w-[32px] h-8 px-2 rounded text-sm font-medium hover:bg-gray-100"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Nächste Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Letzte Seite"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Preview */}
      {previewList && (
        <QuickPreview 
          list={previewList.list} 
          position={previewList.position}
        />
      )}

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

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
      />

      {/* CSS für Animationen */}
      <style jsx global>{`
        @keyframes slide-in-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
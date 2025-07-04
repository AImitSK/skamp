// src\app\dashboard\pr-tools\campaigns\page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Checkbox } from "@/components/checkbox";
import { CompactCustomerSelector, CustomerBadge } from "@/components/pr/CustomerSelector";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  EnvelopeIcon,
  UsersIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  SparklesIcon,
  EllipsisVerticalIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon, // Für "Änderungen erbeten"
  CheckBadgeIcon,         // Für "Freigegeben"
      PencilSquareIcon,
    ClockIcon,
    ArchiveBoxIcon    
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import EmailSendModal from "@/components/pr/EmailSendModal";
import clsx from "clsx";
import Papa from 'papaparse';

// --- NEUER, SPEZIFISCHER FARB-TYP ---
// Wir definieren genau die Farben, die deine Badge-Komponente akzeptiert.
type BadgeColor =
  | "blue" | "green" | "purple" | "orange" | "red" | "pink" | "yellow"
  | "zinc" | "indigo" | "cyan" | "emerald" | "teal" | "amber" | "lime"
  | "sky" | "violet" | "fuchsia" | "rose";


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
function QuickPreview({ campaign, position }: { campaign: PRCampaign; position: { x: number; y: number } }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      // Adjust if preview goes off-screen
      if (rect.right > viewportWidth) {
        newX = position.x - rect.width - 20;
      }
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 20;
      }
      
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  // Extract text content from HTML
  const getTextPreview = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    return text.slice(0, 200) + (text.length > 200 ? '...' : '');
  };

  return (
    <div
      ref={previewRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 animate-fade-in-scale"
      style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
    >
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900">{campaign.title}</h4>
        <p className="text-xs text-gray-500 mt-1">
          {campaign.clientName && `${campaign.clientName} • `}
          {formatDate(campaign.createdAt)}
        </p>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        {getTextPreview(campaign.contentHtml)}
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3 text-gray-400" />
            {campaign.recipientCount?.toLocaleString()} Empfänger
          </span>
          {campaign.attachedAssets && campaign.attachedAssets.length > 0 && (
            <span className="flex items-center gap-1">
              <PhotoIcon className="h-3 w-3 text-gray-400" />
              {campaign.attachedAssets.length} Medien
            </span>
          )}
        </div>
        <StatusBadge status={campaign.status} />
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

// Dropdown Menu Component mit Animationen
function DropdownMenu({ 
  campaign, 
  onDelete, 
  onSend,
  onEdit
}: { 
  campaign: PRCampaign;
  onDelete: (id: string, title: string) => void;
  onSend: (campaign: PRCampaign) => void;
  onEdit: (id: string) => void;
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
        left: rect.right - 192 + window.scrollX // 192px = 48 * 4 (w-48)
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
            {/* Analytics - nur für versendete */}
            {campaign.status === 'sent' && (
              <Link
                href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}/analytics`}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <ChartBarIcon className="h-4 w-4 mr-3 text-gray-400" />
                Analytics anzeigen
              </Link>
            )}

            {/* Vorschau */}
            <Link
              href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <EyeIcon className="h-4 w-4 mr-3 text-gray-400" />
              Vorschau
            </Link>

{/* Bearbeiten - nur für Entwürfe und changes_requested */}
            {(campaign.status === 'draft' || campaign.status === 'changes_requested') && (
              <>
                <button
                  onClick={() => handleAction(() => onEdit(campaign.id!))}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                >
                  <PencilIcon className="h-4 w-4 mr-3 text-gray-400" />
                  Umbenennen
                </button>

                <Link
                  href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <PencilIcon className="h-4 w-4 mr-3 text-gray-400" />
                  Bearbeiten
                </Link>
              </>
            )}

            {/* Versenden - für Entwürfe und freigegebene Kampagnen */}
            {(campaign.status === 'draft' || campaign.status === 'approved') && (
              <button
                onClick={() => handleAction(() => onSend(campaign))}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
              >
                <PaperAirplaneIcon className="h-4 w-4 mr-3 text-gray-400" />
                Jetzt versenden
              </button>
            )}

            {/* Trenner */}
            <div className="border-t border-gray-100 my-1"></div>

            {/* Löschen */}
            <button
              onClick={() => handleAction(() => onDelete(campaign.id!, campaign.title))}
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

// Hilfsfunktion zum Formatieren des Datums
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Status Badge Component
function StatusBadge({ status }: { status: PRCampaignStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge color={config.color} className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Status-Label und Farben
const statusConfig: Record<PRCampaignStatus, { label: string; color: BadgeColor; icon: React.ElementType }> = {
    draft: {
        label: 'Entwurf',
        color: 'zinc',
        icon: PencilSquareIcon,
    },
    in_review: {
        label: 'In Prüfung',
        color: 'yellow',
        icon: ClockIcon,
    },
    changes_requested: {
        label: 'Änderung erbeten',
        color: 'orange',
        icon: ExclamationCircleIcon,
    },
    approved: {
        label: 'Freigegeben',
        color: 'teal',
        icon: CheckBadgeIcon,
    },
    scheduled: {
        label: 'Geplant',
        color: 'blue',
        icon: ClockIcon,
    },
    sending: {
        label: 'Wird gesendet',
        color: 'indigo',
        icon: PaperAirplaneIcon,
    },
    sent: {
        label: 'Gesendet',
        color: 'green',
        icon: CheckCircleIcon,
    },
    archived: {
        label: 'Archiviert',
        color: 'zinc',
        icon: ArchiveBoxIcon,
    },
};

export default function PRCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PRCampaignStatus | 'all'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState<PRCampaign | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<{ campaign: PRCampaign; position: { x: number; y: number } } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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

  const handleCustomerChange = useCallback((customerId: string, customerName: string) => {
    setSelectedCustomerId(customerId);
  }, []);

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const campaignsData = await prService.getAll(user.uid);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Fehler beim Laden der Kampagnen:", error);
      showToast('error', 'Fehler beim Laden', 'Die Kampagnen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Gefilterte Kampagnen
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      if (deletingIds.has(campaign.id!)) return false; // Optimistic deletion
      
      const searchMatch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.distributionListName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.contentHtml.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = selectedStatus === 'all' || campaign.status === selectedStatus;
      const customerMatch = !selectedCustomerId || campaign.clientId === selectedCustomerId;
      
      return searchMatch && statusMatch && customerMatch;
    });
  }, [campaigns, searchTerm, selectedStatus, selectedCustomerId, deletingIds]);

  // Paginated Data
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCampaigns.slice(startIndex, endIndex);
  }, [filteredCampaigns, currentPage, itemsPerPage]);

  // Total Pages
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCustomerId]);

  // Export Function
  const handleExport = () => {
    const exportData = filteredCampaigns.map(campaign => ({
      "Titel": campaign.title,
      "Kunde": campaign.clientName || '',
      "Status": statusConfig[campaign.status].label,
      "Empfänger": campaign.recipientCount || 0,
      "Medien": campaign.attachedAssets?.length || 0,
      "Erstellt": formatDate(campaign.createdAt),
      "Versendet": campaign.sentAt ? formatDate(campaign.sentAt) : 'Noch nicht versendet',
      "Verteiler": campaign.distributionListName
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `pr-kampagnen-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Export erfolgreich', `${filteredCampaigns.length} Kampagnen wurden exportiert.`);
  };

  // Inline Edit Handler
  const handleInlineEdit = async (campaignId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      showToast('error', 'Fehler', 'Der Titel darf nicht leer sein.');
      setEditingId(null);
      return;
    }

    try {
      await prService.update(campaignId, { title: newTitle });
      showToast('success', 'Titel aktualisiert', 'Der Kampagnentitel wurde erfolgreich geändert.');
      setEditingId(null);
      await loadCampaigns();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Titels:", error);
      showToast('error', 'Fehler', 'Der Titel konnte nicht aktualisiert werden.');
    }
  };

  // Quick Preview Handler
  const handleMouseEnter = (campaign: PRCampaign, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPreviewCampaign({
      campaign,
      position: { x: rect.right + 10, y: rect.top }
    });
  };

  const handleMouseLeave = () => {
    setPreviewCampaign(null);
  };

  // Bulk-Aktionen
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaignIds(new Set(paginatedCampaigns.map(c => c.id!)));
    } else {
      setSelectedCampaignIds(new Set());
    }
  };

  const handleSelectCampaign = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedCampaignIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedCampaignIds(newSelection);
  };

  const handleBulkDelete = async () => {
    const count = selectedCampaignIds.size;
    if (count === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Mehrere Kampagnen löschen',
      message: `Möchten Sie wirklich ${count} ausgewählte Kampagnen unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        const idsToDelete = Array.from(selectedCampaignIds);
        
        // Optimistic update
        setDeletingIds(new Set(idsToDelete));
        setSelectedCampaignIds(new Set());
        
        try {
          await prService.deleteMany(idsToDelete);
          showToast('success', 'Kampagnen gelöscht', `${count} Kampagnen wurden erfolgreich gelöscht.`);
          await loadCampaigns();
        } catch (error) {
          console.error("Fehler beim Löschen der Kampagnen:", error);
          showToast('error', 'Fehler beim Löschen', 'Die Kampagnen konnten nicht gelöscht werden.');
          setDeletingIds(new Set());
        }
      }
    });
  };

  const handleDeleteCampaign = async (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Kampagne löschen',
      message: `Möchten Sie die Kampagne "${title}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        // Optimistic update
        setDeletingIds(new Set([id]));
        
        try {
          await prService.delete(id);
          showToast('success', 'Kampagne gelöscht', `"${title}" wurde erfolgreich gelöscht.`);
          await loadCampaigns();
        } catch (error) {
          console.error("Fehler beim Löschen der Kampagne:", error);
          showToast('error', 'Fehler beim Löschen', 'Die Kampagne konnte nicht gelöscht werden.');
          setDeletingIds(new Set());
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-[#005fab] rounded-full animate-bounce"></div>
          <p className="mt-4 text-zinc-500">Lade Kampagnen...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>PR-Kampagnen</Heading>
          <Text className="mt-1">
            Verwalte deine Pressemitteilungen und Kampagnen
          </Text>
        </div>
        <div className="flex items-center gap-3">
          {/* KI-Modell Anzeige - Dynamisch */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <SparklesIcon className="h-5 w-5 text-[#005fab]" />
            <div className="text-sm">
              <span className="font-medium text-gray-700">KI-Modell:</span>
              <span className="ml-1 text-gray-600">Gemini 1.5 Flash</span>
            </div>
          </div>
          
          <Link href="/dashboard/pr-tools/campaigns/campaigns/new">
            <button className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]">
              <PlusIcon className="size-4" />
              Neue Kampagne
            </button>
          </Link>
        </div>
      </div>

      {/* Filter + Suche in einer Box */}
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6 space-y-4">
        {/* Suche + Kunden-Filter + Export */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Kampagnen durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 rounded-md border border-zinc-300 py-2 pl-10 pr-4 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab] transition-all"
            />
          </div>

          <div className="w-full lg:w-64">
            <CompactCustomerSelector
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              className="w-full"
            />
          </div>
        </div>

        {/* Status-Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedStatus("all")}
            className={clsx(
              "px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all",
              selectedStatus === "all"
                ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-opacity-50"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Alle ({campaigns.length})
          </button>
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = campaigns.filter(c => c.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status as PRCampaignStatus)}
                className={clsx(
                  "px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all",
                  selectedStatus === status
                    ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-opacity-50"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Ergebnis-Info und Bulk-Aktionen */}
      <div className="mb-4 flex items-center justify-between h-9">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredCampaigns.length} von {campaigns.length} Kampagnen
          {selectedCustomerId && ' • Gefiltert nach Kunde'}
        </p>
        <div className={clsx(
          "flex items-center gap-4 transition-all duration-300", 
          selectedCampaignIds.size > 0 
            ? "opacity-100 transform translate-y-0" 
            : "opacity-0 transform -translate-y-2 pointer-events-none"
        )}>
          <span className="text-sm text-zinc-600">
            {selectedCampaignIds.size} ausgewählt
          </span>
          <button 
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            <TrashIcon className="size-4" /> 
            Löschen
          </button>
        </div>
      </div>

      {/* Kampagnen-Tabelle */}
      {filteredCampaigns.length === 0 && !loading ? (
        <div className="text-center py-12 border rounded-lg bg-white animate-fade-in">
          <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {campaigns.length === 0 ? 'Noch keine Kampagnen' : 'Keine Kampagnen gefunden'}
          </h3>
          <p className="text-gray-600 mb-6">
            {campaigns.length === 0 
              ? 'Erstelle deine erste PR-Kampagne und erreiche deine Zielgruppe.'
              : 'Versuche andere Suchkriterien oder Filter.'
            }
          </p>
          {campaigns.length === 0 && (
            <Link href="/dashboard/pr-tools/campaigns/campaigns/new">
              <button className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]">
                <PlusIcon className="size-4" />
                Erste Kampagne erstellen
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="relative" ref={tableRef}>
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeader className="w-12">
                    <Checkbox 
                      checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every(campaign => selectedCampaignIds.has(campaign.id!))}
                      indeterminate={paginatedCampaigns.some(campaign => selectedCampaignIds.has(campaign.id!)) && !paginatedCampaigns.every(campaign => selectedCampaignIds.has(campaign.id!))}
                      onChange={(checked) => handleSelectAll(checked)}
                    />
                  </TableHeader>
                  <TableHeader>Kampagne</TableHeader>
                  <TableHeader>Kunde</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Medien</TableHeader>
                  <TableHeader>Empfänger</TableHeader>
                  <TableHeader>Erstellt</TableHeader>
                  <TableHeader>Versendet</TableHeader>
                  <TableHeader className="w-12 relative overflow-visible"></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCampaigns.map((campaign) => (
                  <TableRow 
                    key={campaign.id}
                    className={clsx(
                      "hover:bg-gray-50 transition-all duration-150",
                      deletingIds.has(campaign.id!) && "opacity-50"
                    )}
                  >
                    <TableCell>
                      <Checkbox 
                        checked={selectedCampaignIds.has(campaign.id!)}
                        onChange={(checked) => handleSelectCampaign(campaign.id!, checked)}
                        disabled={deletingIds.has(campaign.id!)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      {editingId === campaign.id ? (
                        <InlineEdit
                          value={campaign.title}
                          onSave={(value) => handleInlineEdit(campaign.id!, value)}
                          onCancel={() => setEditingId(null)}
                          className="w-full"
                        />
                      ) : (
                        <div 
                          className="font-medium text-[#005fab] hover:text-[#004a8c] cursor-pointer"
                          onMouseEnter={(e) => handleMouseEnter(campaign, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <Link href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`} className="hover:underline">
                            {campaign.title}
                          </Link>
                        </div>
                      )}
                      {campaign.scheduledAt && (
                        <div className="text-sm text-gray-500">
                          Geplant für: {formatDate(campaign.scheduledAt)}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {campaign.clientId ? (
                        <Link 
                          href={`/dashboard/contacts/crm/companies/${campaign.clientId}`}
                          className="inline-block"
                        >
                          <CustomerBadge 
                            customerId={campaign.clientId}
                            customerName={campaign.clientName}
                            showIcon={false}
                            className="text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                          />
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PhotoIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {campaign.attachedAssets?.length || 0}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {(campaign.recipientCount || 0).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {formatDate(campaign.createdAt)}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {campaign.sentAt ? formatDate(campaign.sentAt) : '—'}
                      </span>
                    </TableCell>
                    
                    <TableCell className="relative overflow-visible">
                      <DropdownMenu 
                        campaign={campaign}
                        onDelete={handleDeleteCampaign}
                        onSend={setShowSendModal}
                        onEdit={setEditingId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredCampaigns.length > 0 && (
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
              {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} von {filteredCampaigns.length}
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
      {previewCampaign && (
        <QuickPreview 
          campaign={previewCampaign.campaign} 
          position={previewCampaign.position}
        />
      )}

      {/* E-Mail Versand Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={showSendModal}
          onClose={() => setShowSendModal(null)}
          onSent={() => {
            setShowSendModal(null);
            showToast('success', 'Kampagne versendet', `"${showSendModal.title}" wurde erfolgreich versendet.`);
            loadCampaigns();
          }}
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
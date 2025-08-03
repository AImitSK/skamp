// src/app/dashboard/pr-tools/campaigns/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
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
  PhotoIcon,
  SparklesIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import EmailSendModal from "@/components/pr/EmailSendModal";
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
          'flex items-center justify-center p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-l-lg',
          value === 'list'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="List view"
      >
        <ListBulletIcon className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => onChange('grid')}
        className={clsx(
          'flex items-center justify-center p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-r-lg border-l border-zinc-300 dark:border-zinc-600',
          value === 'grid'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="Grid view"
      >
        <Squares2X2Icon className="h-5 w-5" />
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
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
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

// Status configuration
const statusConfig: Record<PRCampaignStatus, { label: string; color: "zinc" | "yellow" | "orange" | "teal" | "blue" | "indigo" | "green"; icon: React.ElementType }> = {
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

// Helper functions
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
    <Badge color={config.color} className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function PRCampaignsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PRCampaignStatus | 'all'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState<PRCampaign | null>(null);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // View Mode
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
    if (user && currentOrganization) {
      loadCampaigns();
    }
  }, [user, currentOrganization]);

  // Auto-reload on window focus (when returning from campaign creation)
  useEffect(() => {
    const handleFocus = () => {
      if (user && currentOrganization && !loading) {
        console.log('Window focused - reloading campaigns');
        loadCampaigns();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, currentOrganization, loading]);

  // Check for refresh parameter (from campaign creation)
  useEffect(() => {
    const shouldRefresh = searchParams.get('refresh');
    if (shouldRefresh === 'true' && user && currentOrganization) {
      console.log('Refresh parameter detected - reloading campaigns');
      loadCampaigns();
      // Clean URL without triggering navigation
      window.history.replaceState({}, '', '/dashboard/pr-tools/campaigns');
    }
  }, [searchParams, user, currentOrganization]);

  const loadCampaigns = async () => {
    if (!user || !currentOrganization) return;
    setLoading(true);
    try {
      // Verwende currentOrganization.id für Multi-Tenancy
      const campaignsData = await prService.getAllByOrganization(currentOrganization.id);
      setCampaigns(campaignsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Kampagnen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const searchMatch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.distributionListName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = selectedStatus === 'all' || campaign.status === selectedStatus;
      const customerMatch = !selectedCustomerId || campaign.clientId === selectedCustomerId;
      
      return searchMatch && statusMatch && customerMatch;
    });
  }, [campaigns, searchTerm, selectedStatus, selectedCustomerId]);

  // Paginated Data
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCampaigns, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCustomerId]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaignIds(new Set(paginatedCampaigns.map(c => c.id!)));
    } else {
      setSelectedCampaignIds(new Set());
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const count = selectedCampaignIds.size;
    if (count === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: `${count} Kampagnen löschen`,
      message: `Möchten Sie wirklich ${count} Kampagnen unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedCampaignIds).map(id => prService.delete(id)));
          showAlert('success', `${count} Kampagnen gelöscht`);
          await loadCampaigns();
          setSelectedCampaignIds(new Set());
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Delete Individual Campaign
  const handleDelete = async (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Kampagne löschen',
      message: `Möchten Sie "${title}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await prService.delete(id);
          showAlert('success', `${title} wurde gelöscht`);
          await loadCampaigns();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Export Function
  const handleExport = () => {
    if (filteredCampaigns.length === 0) {
      showAlert('warning', 'Keine Daten zum Exportieren');
      return;
    }

    try {
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

      showAlert('success', 'Export erfolgreich');
    } catch (error) {
      showAlert('error', 'Export fehlgeschlagen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Kampagnen...</Text>
        </div>
      </div>
    );
  }

  const activeFiltersCount = (selectedStatus !== 'all' ? 1 : 0) + (selectedCustomerId ? 1 : 0);

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
        <Heading level={1}>PR-Kampagnen</Heading>
        
        {/* AI Model Badge */}
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <SparklesIcon className="h-4 w-4 text-[#005fab]" />
          <span className="text-sm">
            <span className="font-medium text-gray-700">KI-Modell:</span>
            <span className="ml-1 text-gray-600">Gemini 1.5 Flash</span>
          </span>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kampagnen durchsuchen..."
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
              <FunnelIcon className="h-5 w-5" />
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
                          setSelectedStatus('all');
                          setSelectedCustomerId('');
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Status
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {Object.entries(statusConfig).map(([status, config]) => {
                        const isChecked = selectedStatus === status;
                        return (
                          <label
                            key={status}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="status"
                              checked={isChecked}
                              onChange={() => setSelectedStatus(status as PRCampaignStatus)}
                              className="h-4 w-4 border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {config.label}
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
            href="/dashboard/pr-tools/campaigns/campaigns/new"
            className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 h-10 px-6"
          >
            Neue Kampagne
          </Button>

          {/* Actions Button */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center p-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <EllipsisVerticalIcon className="h-5 w-5" />
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
                    onClick={handleExport}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Exportieren
                  </button>
                  {selectedCampaignIds.size > 0 && (
                    <>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-5 w-5" />
                        Auswahl löschen ({selectedCampaignIds.size})
                      </button>
                    </>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {Object.entries({
          all: { label: 'Alle', count: campaigns.length },
          ...Object.entries(statusConfig).reduce((acc, [status, config]) => {
            const count = campaigns.filter(c => c.status === status).length;
            if (count > 0) {
              acc[status] = { ...config, count };
            }
            return acc;
          }, {} as Record<string, any>)
        }).map(([status, data]) => (
          <Button
            key={status}
            plain={selectedStatus !== status}
            color={selectedStatus === status ? "zinc" : undefined}
            onClick={() => setSelectedStatus(status as PRCampaignStatus | 'all')}
            className="whitespace-nowrap"
          >
            {data.label} ({data.count})
          </Button>
        ))}
      </div>

      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredCampaigns.length} von {campaigns.length} Kampagnen
          {selectedCampaignIds.size > 0 && (
            <span className="ml-2">
              • {selectedCampaignIds.size} ausgewählt
            </span>
          )}
        </Text>
        
        {/* Bulk Delete Link */}
        {selectedCampaignIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedCampaignIds.size} Löschen
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white dark:bg-zinc-800">
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
              <Button 
                href="/dashboard/pr-tools/campaigns/campaigns/new"
                className="bg-[#005fab] hover:bg-[#004a8c] text-white"
              >
                <PlusIcon />
                Erste Kampagne erstellen
              </Button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          // Table View
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="flex items-center w-[25%]">
                  <Checkbox
                    checked={paginatedCampaigns.length > 0 && selectedCampaignIds.size === paginatedCampaigns.length}
                    indeterminate={selectedCampaignIds.size > 0 && selectedCampaignIds.size < paginatedCampaigns.length}
                    onChange={(checked: boolean) => handleSelectAll(checked)}
                  />
                  <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Kampagne
                  </span>
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kunde
                </div>
                <div className="w-[12%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </div>
                <div className="w-[8%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                  Medien
                </div>
                <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                  Empfänger
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Erstellt
                </div>
                <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right pr-14">
                  Versendet
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedCampaigns.map((campaign) => (
                <div key={campaign.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center">
                    {/* Kampagne */}
                    <div className="flex items-center w-[25%]">
                      <Checkbox
                        checked={selectedCampaignIds.has(campaign.id!)}
                        onChange={(checked: boolean) => {
                          const newIds = new Set(selectedCampaignIds);
                          if (checked) newIds.add(campaign.id!);
                          else newIds.delete(campaign.id!);
                          setSelectedCampaignIds(newIds);
                        }}
                      />
                      <div className="ml-4 min-w-0 flex-1">
                        <Link 
                          href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`} 
                          className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block"
                        >
                          {campaign.title}
                        </Link>
                        {campaign.scheduledAt && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                            <CalendarIcon className="h-3 w-3" />
                            Geplant für: {formatDate(campaign.scheduledAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Kunde */}
                    <div className="w-[15%]">
                      {campaign.clientId ? (
                        <Link 
                          href={`/dashboard/contacts/crm/companies/${campaign.clientId}`}
                          className="inline-flex items-center gap-1 text-sm text-[#005fab] hover:text-[#004a8c]"
                        >
                          <BuildingOfficeIcon className="h-3.5 w-3.5" />
                          <span className="truncate">{campaign.clientName}</span>
                        </Link>
                      ) : (
                        <Text className="text-sm text-zinc-400">—</Text>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-[12%]">
                      <StatusBadge status={campaign.status} />
                    </div>

                    {/* Medien */}
                    <div className="w-[8%] text-center">
                      <div className="flex items-center justify-center gap-1">
                        <PhotoIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{campaign.attachedAssets?.length || 0}</span>
                      </div>
                    </div>

                    {/* Empfänger */}
                    <div className="w-[10%] text-center">
                      <div className="flex items-center justify-center gap-1">
                        <UsersIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {(campaign.recipientCount || 0).toLocaleString('de-DE')}
                        </span>
                      </div>
                    </div>

                    {/* Erstellt */}
                    <div className="w-[15%]">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {formatDate(campaign.createdAt)}
                      </span>
                    </div>

                    {/* Versendet */}
                    <div className="flex-1 text-right pr-14">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {campaign.sentAt ? formatDate(campaign.sentAt) : '—'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="ml-4">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                          <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          {campaign.status === 'sent' && (
                            <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}/analytics`}>
                              <ChartBarIcon className="h-4 w-4" />
                              Analytics
                            </DropdownItem>
                          )}
                          <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}>
                            <EyeIcon className="h-4 w-4" />
                            Vorschau
                          </DropdownItem>
                          {(campaign.status === 'draft' || campaign.status === 'changes_requested') && (
                            <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}>
                              <PencilIcon className="h-4 w-4" />
                              Bearbeiten
                            </DropdownItem>
                          )}
                          {(campaign.status === 'draft' || campaign.status === 'approved') && (
                            <DropdownItem onClick={() => setShowSendModal(campaign)}>
                              <PaperAirplaneIcon className="h-4 w-4" />
                              Versenden
                            </DropdownItem>
                          )}
                          <DropdownDivider />
                          <DropdownItem onClick={() => handleDelete(campaign.id!, campaign.title)}>
                            <TrashIcon className="h-4 w-4" />
                            <span className="text-red-600">Löschen</span>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="relative rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
              >
                {/* Checkbox */}
                <div className="absolute top-4 right-4">
                  <Checkbox
                    checked={selectedCampaignIds.has(campaign.id!)}
                    onChange={(checked: boolean) => {
                      const newIds = new Set(selectedCampaignIds);
                      if (checked) newIds.add(campaign.id!);
                      else newIds.delete(campaign.id!);
                      setSelectedCampaignIds(newIds);
                    }}
                  />
                </div>

                {/* Campaign Info */}
                <div className="pr-8">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    <Link href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`} className="hover:text-primary">
                      {campaign.title}
                    </Link>
                  </h3>
                  {campaign.clientName && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      {campaign.clientName}
                    </p>
                  )}
                  <div className="mt-3">
                    <StatusBadge status={campaign.status} />
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Empfänger</span>
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {(campaign.recipientCount || 0).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Medien</span>
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {campaign.attachedAssets?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-700">
                  <Link
                    href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}`}
                    className="text-sm text-primary hover:text-primary-hover"
                  >
                    Anzeigen
                  </Link>
                  <Dropdown>
                    <DropdownButton plain className="p-1 hover:bg-zinc-100 rounded dark:hover:bg-zinc-700">
                      <EllipsisVerticalIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      {campaign.status === 'sent' && (
                        <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}/analytics`}>
                          <ChartBarIcon />
                          Analytics
                        </DropdownItem>
                      )}
                      {(campaign.status === 'draft' || campaign.status === 'changes_requested') && (
                        <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}>
                          <PencilIcon />
                          Bearbeiten
                        </DropdownItem>
                      )}
                      {(campaign.status === 'draft' || campaign.status === 'approved') && (
                        <DropdownItem onClick={() => setShowSendModal(campaign)}>
                          <PaperAirplaneIcon />
                          Versenden
                        </DropdownItem>
                      )}
                      <DropdownDivider />
                      <DropdownItem onClick={() => handleDelete(campaign.id!, campaign.title)}>
                        <TrashIcon />
                        <span className="text-red-600">Löschen</span>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            ))}
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

      {/* Send Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={showSendModal}
          onClose={() => setShowSendModal(null)}
          onSent={() => {
            setShowSendModal(null);
            showAlert('success', 'Kampagne versendet', `"${showSendModal.title}" wurde erfolgreich versendet.`);
            loadCampaigns();
          }}
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
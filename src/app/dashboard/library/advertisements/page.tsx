// src/app/dashboard/library/advertisements/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { advertisementService, publicationService } from "@/lib/firebase/library-service";
import type { Advertisement, Publication } from "@/types/library";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { SearchInput } from "@/components/search-input";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { Popover, Transition } from '@headlessui/react';
import { AdvertisementModal } from "./AdvertisementModal";
import { 
  PlusIcon, 
  FunnelIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CurrencyEuroIcon,
  NewspaperIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/20/solid";
import Papa from 'papaparse';
import clsx from 'clsx';

// Labels für Advertisement-Typen
const advertisementTypeLabels: Record<string, string> = {
  display_banner: "Display Banner",
  native_ad: "Native Advertising",
  video_ad: "Video-Werbung",
  print_ad: "Print-Anzeige",
  audio_spot: "Audio-Spot",
  newsletter_ad: "Newsletter-Werbung",
  social_media_ad: "Social Media Ad",
  advertorial: "Advertorial",
  event_sponsoring: "Event-Sponsoring",
  content_partnership: "Content-Partnerschaft",
  custom: "Individuell"
};

// Labels für Preismodelle
const priceModelLabels: Record<string, string> = {
  cpm: "TKP",
  cpc: "CPC",
  cpa: "CPA",
  flat: "Pauschal",
  negotiable: "Verhandelbar"
};

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

export default function AdvertisementsPage() {
  const { user } = useAuth();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const [showAdModal, setShowAdModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  
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

  // Filter States
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedPublications, setSelectedPublications] = useState<string[]>([]);
  const [selectedPriceModels, setSelectedPriceModels] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

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
      const [adsData, pubsData] = await Promise.all([
        advertisementService.getAll(user.uid),
        publicationService.getAll(user.uid)
      ]);
      setAdvertisements(adsData);
      setPublications(pubsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Data
  const filteredAdvertisements = useMemo(() => {
    return advertisements.filter(ad => {
      // Search
      const searchMatch = ad.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ad.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ad.publicationNames?.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!searchMatch) return false;
      
      // Type Filter
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(ad.type);
      if (!typeMatch) return false;
      
      // Publication Filter
      const pubMatch = selectedPublications.length === 0 || 
                       ad.publicationIds.some(id => selectedPublications.includes(id));
      if (!pubMatch) return false;
      
      // Price Model Filter
      const priceMatch = selectedPriceModels.length === 0 || 
                         selectedPriceModels.includes(ad.pricing.priceModel);
      if (!priceMatch) return false;
      
      // Status Filter
      if (selectedStatus !== 'all' && ad.status !== selectedStatus) return false;

      return true;
    });
  }, [advertisements, searchTerm, selectedTypes, selectedPublications, selectedPriceModels, selectedStatus]);

  // Paginated Data
  const paginatedAds = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAdvertisements.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAdvertisements, currentPage, itemsPerPage]);

  // Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAdIds(new Set(paginatedAds.map(ad => ad.id!)));
    } else {
      setSelectedAdIds(new Set());
    }
  };

  // Delete Functions
  const handleDelete = async (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Werbemittel löschen',
      message: `Möchten Sie "${name}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          // Verwende softDelete statt delete
          await advertisementService.softDelete(id, {
            organizationId: user?.uid || '',
            userId: user?.uid || ''
          });
          showAlert('success', `${name} wurde gelöscht`);
          await loadData();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedAdIds.size;
    if (count === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: `${count} Werbemittel löschen`,
      message: `Möchten Sie wirklich ${count} Werbemittel unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedAdIds).map(id => 
            advertisementService.softDelete(id, {
              organizationId: user?.uid || '',
              userId: user?.uid || ''
            })
          ));
          showAlert('success', `${count} Werbemittel gelöscht`);
          await loadData();
          setSelectedAdIds(new Set());
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Duplicate Function
  const handleDuplicate = async (ad: Advertisement) => {
    try {
      const duplicated = {
        ...ad,
        name: `${ad.name} (Kopie)`,
        displayName: ad.displayName ? `${ad.displayName} (Kopie)` : undefined,
        status: 'draft' as const
      };
      delete duplicated.id;
      
      await advertisementService.create(duplicated, {
        organizationId: user?.uid || '',
        userId: user?.uid || ''
      });
      
      showAlert('success', 'Werbemittel dupliziert');
      await loadData();
    } catch (error) {
      showAlert('error', 'Fehler beim Duplizieren');
    }
  };

  // Export Function
  const handleExport = () => {
    if (filteredAdvertisements.length === 0) {
      showAlert('warning', 'Keine Daten zum Exportieren');
      return;
    }

    try {
      const exportData = filteredAdvertisements.map(ad => ({
        "Name": ad.name,
        "Anzeigename": ad.displayName || '',
        "Typ": advertisementTypeLabels[ad.type] || ad.type,
        "Publikationen": ad.publicationNames?.join(', ') || '',
        "Preismodell": priceModelLabels[ad.pricing.priceModel] || ad.pricing.priceModel,
        "Listenpreis": `${ad.pricing.listPrice.amount} ${ad.pricing.listPrice.currency}`,
        "Status": ad.status
      }));
      
      const csv = Papa.unparse(exportData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'werbemittel-export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showAlert('success', 'Export erfolgreich');
    } catch (error) {
      showAlert('error', 'Export fehlgeschlagen');
    }
  };

  const formatPrice = (ad: Advertisement): string => {
    const price = ad.pricing.listPrice;
    const symbol = price.currency === 'EUR' ? '€' : price.currency;
    return `${price.amount.toLocaleString('de-DE')} ${symbol}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <p className="mt-4 text-gray-500">Lade Werbemittel...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredAdvertisements.length / itemsPerPage);

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
        <Heading level={1}>Werbemittel</Heading>
        <Text className="mt-1 text-sm text-gray-500">
          {advertisements.length} Werbemittel in Ihrer Bibliothek
        </Text>
      </div>

      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Werbemittel durchsuchen..."
            className="flex-1"
          />

          {/* Filter Button */}
          <Popover className="relative">
            {({ open }) => {
              const activeFiltersCount = selectedTypes.length + selectedPublications.length + 
                                       selectedPriceModels.length + (selectedStatus !== 'all' ? 1 : 0);
              
              return (
                <>
                  <Popover.Button
                    className={clsx(
                      'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 h-10 w-10',
                      activeFiltersCount > 0
                        ? 'border-[#005fab] bg-[#005fab]/5 text-[#005fab] hover:bg-[#005fab]/10'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    )}
                    aria-label="Filter"
                  >
                    <FunnelIcon className="h-5 w-5" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#005fab] text-xs font-medium text-white">
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
                                setSelectedTypes([]);
                                setSelectedPublications([]);
                                setSelectedPriceModels([]);
                                setSelectedStatus('all');
                              }}
                              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                              Zurücksetzen
                            </button>
                          )}
                        </div>

                        {/* Type Filter */}
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Typ
                          </label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {Object.entries(advertisementTypeLabels).map(([value, label]) => (
                              <label key={value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedTypes.includes(value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTypes([...selectedTypes, value]);
                                    } else {
                                      setSelectedTypes(selectedTypes.filter(t => t !== value));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-zinc-300 text-[#005fab] focus:ring-[#005fab]"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Publication Filter */}
                        {publications.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Publikation
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {publications.map(pub => (
                                <label key={pub.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedPublications.includes(pub.id!)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPublications([...selectedPublications, pub.id!]);
                                      } else {
                                        setSelectedPublications(selectedPublications.filter(id => id !== pub.id));
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-zinc-300 text-[#005fab] focus:ring-[#005fab]"
                                  />
                                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{pub.title}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Price Model Filter */}
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Preismodell
                          </label>
                          <div className="space-y-2">
                            {Object.entries(priceModelLabels).map(([value, label]) => (
                              <label key={value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedPriceModels.includes(value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPriceModels([...selectedPriceModels, value]);
                                    } else {
                                      setSelectedPriceModels(selectedPriceModels.filter(m => m !== value));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-zinc-300 text-[#005fab] focus:ring-[#005fab]"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Status
                          </label>
                          <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab] dark:border-zinc-600 dark:bg-zinc-700"
                          >
                            <option value="all">Alle</option>
                            <option value="draft">Entwurf</option>
                            <option value="active">Aktiv</option>
                            <option value="paused">Pausiert</option>
                            <option value="discontinued">Eingestellt</option>
                          </select>
                        </div>
                      </div>
                    </Popover.Panel>
                  </Transition>
                </>
              );
            }}
          </Popover>

          {/* Add Button */}
          <Button 
            className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 h-10 px-6"
            onClick={() => {
              setSelectedAd(null);
              setShowAdModal(true);
            }}
          >
            Werbemittel hinzufügen
          </Button>

          {/* Actions Button */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center p-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800">
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
                    Export
                  </button>
                  {selectedAdIds.size > 0 && (
                    <>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-5 w-5" />
                        Auswahl löschen ({selectedAdIds.size})
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
          {filteredAdvertisements.length} von {advertisements.length} Werbemitteln
          {selectedAdIds.size > 0 && (
            <span className="ml-2">• {selectedAdIds.size} ausgewählt</span>
          )}
        </Text>
        
        {selectedAdIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedAdIds.size} Löschen
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center">
            <div className="flex items-center w-[25%]">
              <Checkbox
                checked={paginatedAds.length > 0 && paginatedAds.every(ad => selectedAdIds.has(ad.id!))}
                indeterminate={paginatedAds.some(ad => selectedAdIds.has(ad.id!)) && !paginatedAds.every(ad => selectedAdIds.has(ad.id!))}
                onChange={handleSelectAll}
              />
              <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Name
              </span>
            </div>
            <div className="hidden md:block w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Publikation(en)
            </div>
            <div className="hidden lg:block w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Typ
            </div>
            <div className="hidden lg:block w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Preismodell
            </div>
            <div className="hidden xl:block w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Listenpreis
            </div>
            <div className="hidden xl:block flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Status
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {paginatedAds.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              Keine Werbemittel gefunden
            </div>
          ) : (
            paginatedAds.map((ad) => (
              <div key={ad.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center">
                  <div className="flex items-center w-[25%]">
                    <Checkbox
                      checked={selectedAdIds.has(ad.id!)}
                      onChange={(checked: boolean) => {
                        const newIds = new Set(selectedAdIds);
                        if (checked) {
                          newIds.add(ad.id!);
                        } else {
                          newIds.delete(ad.id!);
                        }
                        setSelectedAdIds(newIds);
                      }}
                    />
                    <div className="ml-4 min-w-0 flex-1">
                      <Link 
                        href={`/dashboard/library/advertisements/${ad.id}`} 
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-[#005fab] truncate block"
                      >
                        {ad.displayName || ad.name}
                      </Link>
                      {ad.displayName && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          Intern: {ad.name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="hidden md:block w-[20%]">
                    {ad.publicationNames && ad.publicationNames.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {ad.publicationNames.slice(0, 2).map((name, idx) => (
                          <Badge key={idx} color="blue" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                        {ad.publicationNames.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                            +{ad.publicationNames.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </div>
                  
                  <div className="hidden lg:block w-[15%]">
                    <Badge color="zinc" className="text-xs">
                      {advertisementTypeLabels[ad.type] || ad.type}
                    </Badge>
                  </div>
                  
                  <div className="hidden lg:block w-[15%] text-sm text-zinc-500 dark:text-zinc-400">
                    {priceModelLabels[ad.pricing.priceModel] || ad.pricing.priceModel}
                    {ad.pricing.priceUnit && (
                      <span className="text-xs block">/{ad.pricing.priceUnit}</span>
                    )}
                  </div>
                  
                  <div className="hidden xl:block w-[15%] text-sm font-medium text-zinc-900 dark:text-white">
                    {formatPrice(ad)}
                  </div>
                  
                  <div className="hidden xl:block flex-1">
                    <Badge 
                      color={
                        ad.status === 'active' ? 'green' :
                        ad.status === 'paused' ? 'yellow' :
                        ad.status === 'discontinued' ? 'red' :
                        'zinc'
                      }
                      className="text-xs"
                    >
                      {ad.status === 'draft' ? 'Entwurf' :
                       ad.status === 'active' ? 'Aktiv' :
                       ad.status === 'paused' ? 'Pausiert' :
                       'Eingestellt'}
                    </Badge>
                  </div>
                  
                  <div className="ml-4">
                    <Dropdown>
                      <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                        <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem href={`/dashboard/library/advertisements/${ad.id}`}>
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => {
                            setSelectedAd(ad);
                            setShowAdModal(true);
                          }}
                        >
                          <PencilIcon />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownItem onClick={() => handleDuplicate(ad)}>
                          <DocumentDuplicateIcon />
                          Duplizieren
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem 
                          onClick={() => handleDelete(ad.id!, ad.displayName || ad.name)}
                        >
                          <TrashIcon />
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 pt-4">
          <div className="-mt-px flex w-0 flex-1">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
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
            >
              Weiter
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      )}

      {/* Advertisement Modal */}
      {showAdModal && (
        <AdvertisementModal
          isOpen={showAdModal}
          onClose={() => {
            setShowAdModal(false);
            setSelectedAd(null);
          }}
          advertisement={selectedAd}
          publications={publications}
          onSuccess={async () => {
            setShowAdModal(false);
            setSelectedAd(null);
            await loadData();
            showAlert('success', selectedAd ? 'Werbemittel aktualisiert' : 'Werbemittel erstellt');
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
            >
              Abbrechen
            </Button>
            <Button
              color="zinc"
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
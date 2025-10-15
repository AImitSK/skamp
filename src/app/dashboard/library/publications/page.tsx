// src/app/dashboard/library/publications/page.tsx
"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import type { Publication } from "@/types/library";
import {
  usePublications,
  useCreatePublication,
  useUpdatePublication,
  useDeletePublication
} from "@/lib/hooks/usePublicationsData";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
import { PublicationModal } from "./PublicationModal";
import PublicationImportModal from "./PublicationImportModal";
import {
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  RssIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import Papa from 'papaparse';
import clsx from 'clsx';
import {
  PUBLICATION_TYPE_LABELS,
  FREQUENCY_LABELS,
  PUBLICATIONS_PAGE_SIZE
} from '@/lib/constants/library-publications-constants';
import type { ConfirmDialogState } from '@/types/library-publications-ui';
import { toastService } from '@/lib/utils/toast';

export default function PublicationsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // React Query Hooks
  const { data: publications = [], isLoading, error } = usePublications(currentOrganization?.id);
  const createPublication = useCreatePublication();
  const updatePublication = useUpdatePublication();
  const deletePublication = useDeletePublication();

  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedPubIds, setSelectedPubIds] = useState<Set<string>>(new Set());
  const [showPublicationModal, setShowPublicationModal] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(PUBLICATIONS_PAGE_SIZE);

  // Filter States
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedVerified, setSelectedVerified] = useState<string>('all');

  // Filtered Data
  const filteredPublications = useMemo(() => {
    return publications.filter(pub => {
      // Search - wenn leer, zeige alles
      if (searchTerm.trim()) {
        const searchMatch = pub.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            pub.publisherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            pub.focusAreas?.some(area => area?.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!searchMatch) return false;
      }
      
      // Type Filter
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(pub.type);
      if (!typeMatch) return false;
      
      // Language Filter
      const langMatch = selectedLanguages.length === 0 || 
                        pub.languages?.some(lang => selectedLanguages.includes(lang));
      if (!langMatch) return false;
      
      // Country Filter
      const countryMatch = selectedCountries.length === 0 || 
                           pub.geographicTargets?.some(country => selectedCountries.includes(country));
      if (!countryMatch) return false;
      
      // Verified Filter
      if (selectedVerified !== 'all') {
        const isVerified = pub.verified === true;
        if (selectedVerified === 'verified' && !isVerified) return false;
        if (selectedVerified === 'unverified' && isVerified) return false;
      }

      return true;
    });
  }, [publications, searchTerm, selectedTypes, selectedLanguages, selectedCountries, selectedVerified]);

  // Paginated Data
  const paginatedPublications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPublications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPublications, currentPage, itemsPerPage]);

  // Get unique values for filters
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    publications.forEach(pub => {
      pub.languages?.forEach(lang => langs.add(lang));
    });
    return Array.from(langs).sort();
  }, [publications]);

  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    publications.forEach(pub => {
      pub.geographicTargets?.forEach(country => countries.add(country));
    });
    return Array.from(countries).sort();
  }, [publications]);

  // Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPubIds(new Set(paginatedPublications.map(pub => pub.id!)));
    } else {
      setSelectedPubIds(new Set());
    }
  };

  // Delete Functions
  const handleDelete = async (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Publikation löschen',
      message: `Möchten Sie "${title}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deletePublication.mutateAsync({
            id,
            organizationId: currentOrganization?.id || '',
            userId: user?.uid || ''
          });
          toastService.success(`${title} wurde gelöscht`);
        } catch (error) {
          toastService.error('Fehler beim Löschen');
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedPubIds.size;
    if (count === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: `${count} Publikationen löschen`,
      message: `Möchten Sie wirklich ${count} Publikationen unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedPubIds).map(id =>
            deletePublication.mutateAsync({
              id,
              organizationId: currentOrganization?.id || '',
              userId: user?.uid || ''
            })
          ));
          toastService.success(`${count} Publikationen gelöscht`);
          setSelectedPubIds(new Set());
        } catch (error) {
          toastService.error('Fehler beim Löschen');
        }
      }
    });
  };

  // Export Function
  const handleExport = () => {
    if (filteredPublications.length === 0) {
      toastService.warning('Keine Daten zum Exportieren');
      return;
    }

    try {
      const exportData = filteredPublications.map(pub => ({
        "Titel": pub.title,
        "Verlag": pub.publisherName || '',
        "Typ": PUBLICATION_TYPE_LABELS[pub.type] || pub.type,
        "Format": pub.format || '',
        "Website": pub.websiteUrl || '',
        "Sprachen": pub.languages?.join(', ') || '',
        "Länder": pub.geographicTargets?.join(', ') || '',
        "Auflage": pub.metrics?.print?.circulation || '',
        "Online Besucher": pub.metrics?.online?.monthlyUniqueVisitors || '',
        "Themenschwerpunkte": pub.focusAreas?.join(', ') || '',
        "Frequenz": pub.metrics?.frequency ? FREQUENCY_LABELS[pub.metrics.frequency] : '',
        "Zielgruppe": pub.metrics?.targetAudience || '',
        "Verifiziert": pub.verified ? 'Ja' : 'Nein',
        "Status": pub.status
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `publikationen-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toastService.success('Export erfolgreich');
    } catch (error) {
      toastService.error('Export fehlgeschlagen');
    }
  };

  const formatMetric = (pub: Publication): string => {
    if (pub.metrics?.print?.circulation) {
      return `${pub.metrics.print.circulation.toLocaleString('de-DE')} Auflage`;
    }
    if (pub.metrics?.online?.monthlyUniqueVisitors) {
      return `${pub.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')} UV/Monat`;
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Lade Publikationen...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredPublications.length / itemsPerPage);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen"
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
            {({ open }) => {
              const activeFiltersCount = selectedTypes.length + selectedLanguages.length + 
                                       selectedCountries.length + (selectedVerified !== 'all' ? 1 : 0);
              
              return (
                <>
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
                    <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px] origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                      <div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Type Filter */}
                          <div className="mb-[10px]">
                            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                              Typ
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {Object.entries(PUBLICATION_TYPE_LABELS).map(([value, label]) => (
                                <label key={value} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={selectedTypes.includes(value)}
                                    onChange={(checked: boolean) => {
                                      if (checked) {
                                        setSelectedTypes([...selectedTypes, value]);
                                      } else {
                                        setSelectedTypes(selectedTypes.filter(t => t !== value));
                                      }
                                    }}
                                  />
                                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Language Filter */}
                          <div className="mb-[10px]">
                            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                              Sprachen
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {availableLanguages.length > 0 ? (
                                availableLanguages.map(lang => (
                                  <label key={lang} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={selectedLanguages.includes(lang)}
                                      onChange={(checked: boolean) => {
                                        if (checked) {
                                          setSelectedLanguages([...selectedLanguages, lang]);
                                        } else {
                                          setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{lang}</span>
                                  </label>
                                ))
                              ) : (
                                <span className="text-sm text-zinc-500">Keine Sprachen verfügbar</span>
                              )}
                            </div>
                          </div>

                          {/* Country Filter */}
                          <div className="mb-[10px]">
                            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                              Länder
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {availableCountries.length > 0 ? (
                                availableCountries.map(country => (
                                  <label key={country} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={selectedCountries.includes(country)}
                                      onChange={(checked: boolean) => {
                                        if (checked) {
                                          setSelectedCountries([...selectedCountries, country]);
                                        } else {
                                          setSelectedCountries(selectedCountries.filter(c => c !== country));
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{country}</span>
                                  </label>
                                ))
                              ) : (
                                <span className="text-sm text-zinc-500">Keine Länder verfügbar</span>
                              )}
                            </div>
                          </div>

                          {/* Verified Filter */}
                          <div className="mb-[10px]">
                            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                              Status
                            </label>
                            <select
                              value={selectedVerified}
                              onChange={(e) => setSelectedVerified(e.target.value)}
                              className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-700"
                            >
                              <option value="all">Alle</option>
                              <option value="verified">Verifiziert</option>
                              <option value="unverified">Nicht verifiziert</option>
                            </select>
                          </div>
                        </div>

                        {activeFiltersCount > 0 && (
                          <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-700">
                            <button
                              onClick={() => {
                                setSelectedTypes([]);
                                setSelectedLanguages([]);
                                setSelectedCountries([]);
                                setSelectedVerified('all');
                              }}
                              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
                            >
                              Zurücksetzen
                            </button>
                          </div>
                        )}
                      </div>
                    </Popover.Panel>
                  </Transition>
                </>
              );
            }}
          </Popover>

          {/* Add Button */}
          <Button 
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary px-6 py-2"
            onClick={() => {
              setSelectedPublication(null);
              setShowPublicationModal(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Publikation hinzufügen
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
                    onClick={() => setShowImportModal(true)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    Import
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Export
                  </button>
                  {selectedPubIds.size > 0 && (
                    <>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-5 w-5" />
                        Auswahl löschen ({selectedPubIds.size})
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
          {filteredPublications.length} von {publications.length} Publikationen
          {selectedPubIds.size > 0 && (
            <span className="ml-2">· {selectedPubIds.size} ausgewählt</span>
          )}
        </Text>
        
        {selectedPubIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedPubIds.size} Löschen
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center">
            <div className="flex items-center w-[30%]">
              <Checkbox
                checked={paginatedPublications.length > 0 && paginatedPublications.every(pub => selectedPubIds.has(pub.id!))}
                indeterminate={paginatedPublications.some(pub => selectedPubIds.has(pub.id!)) && !paginatedPublications.every(pub => selectedPubIds.has(pub.id!))}
                onChange={handleSelectAll}
              />
              <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Titel
              </span>
            </div>
            <div className="hidden md:block w-[25%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Verlag
            </div>
            <div className="hidden lg:block w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Metrik
            </div>
            <div className="hidden xl:block w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
              RSS
            </div>
            <div className="hidden xl:block flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Zielgebiet
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {paginatedPublications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              Keine Publikationen gefunden
            </div>
          ) : (
            paginatedPublications.map((pub) => (
              <div key={pub.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center">
                  {/* Titel Spalte */}
                  <div className="flex items-center w-[30%]">
                    <Checkbox
                      checked={selectedPubIds.has(pub.id!)}
                      onChange={(checked: boolean) => {
                        const newIds = new Set(selectedPubIds);
                        if (checked) {
                          newIds.add(pub.id!);
                        } else {
                          newIds.delete(pub.id!);
                        }
                        setSelectedPubIds(newIds);
                      }}
                    />
                    <div className="ml-4 min-w-0 flex-1">
                      <Link
                        href={`/dashboard/library/publications/${pub.id}`}
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block"
                      >
                        {pub.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {pub.verified && (
                          <Badge color="green" className="text-xs inline-flex items-center gap-1">
                            <CheckBadgeIcon className="h-3 w-3" />
                            Verifiziert
                          </Badge>
                        )}
                        {(pub as any)._isReference && (
                          <Badge color="blue" className="text-xs">
                            🌐 Verweis
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verlag/Typ Spalte */}
                  <div className="hidden md:block w-[25%]">
                    <div>
                      {pub.publisherId ? (
                        <Link
                          href={`/dashboard/contacts/crm/companies/${pub.publisherId}`}
                          className="text-sm text-zinc-900 dark:text-white hover:text-primary font-medium"
                        >
                          {pub.publisherName || "—"}
                        </Link>
                      ) : (
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {pub.publisherName || "—"}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5">
                      <Badge color="zinc" className="text-xs">
                        {PUBLICATION_TYPE_LABELS[pub.type] || pub.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Metrik Spalte */}
                  <div className="hidden lg:block w-[20%] text-sm text-zinc-600 dark:text-zinc-400">
                    {formatMetric(pub)}
                  </div>

                  {/* RSS Spalte */}
                  <div className="hidden xl:block w-[10%] text-center">
                    {pub.monitoringConfig?.isEnabled && pub.monitoringConfig?.rssFeedUrls && pub.monitoringConfig.rssFeedUrls.length > 0 ? (
                      <div className="inline-flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full" title={`${pub.monitoringConfig.rssFeedUrls.length} RSS Feed(s) aktiv`}></div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center">
                        <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full" title="Kein RSS Feed"></div>
                      </div>
                    )}
                  </div>

                  {/* Zielgebiet Spalte */}
                  <div className="hidden xl:block flex-1">
                    <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                      <GlobeAltIcon className="mr-1 h-4 w-4 text-zinc-400" />
                      {pub.geographicTargets?.slice(0, 2).join(", ") || "—"}
                      {pub.geographicTargets && pub.geographicTargets.length > 2 && (
                        <span className="ml-1">+{pub.geographicTargets.length - 2}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-4">
                    <Dropdown>
                      <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:hover:bg-zinc-700">
                        <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-400 stroke-[2.5]" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem href={`/dashboard/library/publications/${pub.id}`}>
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => {
                            setSelectedPublication(pub);
                            setShowPublicationModal(true);
                          }}
                          disabled={(pub as any)?._isReference}
                          className={(pub as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Bearbeiten {(pub as any)?._isReference && '(Verweis)'}
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem
                          onClick={() => handleDelete(pub.id!, pub.title)}
                          disabled={(pub as any)?._isReference}
                          className={(pub as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          <span className={(pub as any)?._isReference ? 'text-gray-400' : 'text-red-600'}>
                            Löschen {(pub as any)?._isReference && '(Verweis)'}
                          </span>
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
              <ChevronLeftIcon className="h-4 w-4 mr-2" />
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
            >
              Weiter
              <ChevronRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </nav>
      )}

      {/* Publication Modal */}
      {showPublicationModal && (
        <PublicationModal
          isOpen={showPublicationModal}
          onClose={() => {
            setShowPublicationModal(false);
            setSelectedPublication(null);
          }}
          publication={selectedPublication || undefined}
          onSuccess={() => {
            setShowPublicationModal(false);
            setSelectedPublication(null);
            toastService.success(selectedPublication ? 'Publikation aktualisiert' : 'Publikation erstellt');
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <PublicationImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            setShowImportModal(false);
            toastService.success('Import erfolgreich abgeschlossen');
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
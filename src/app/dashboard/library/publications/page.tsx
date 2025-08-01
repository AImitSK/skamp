// src/app/dashboard/library/publications/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { publicationService } from "@/lib/firebase/library-service";
import type { Publication } from "@/types/library";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { SearchInput } from "@/components/search-input";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
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
  DocumentDuplicateIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/20/solid";
import Papa from 'papaparse';
import clsx from 'clsx';

// Labels für Publikationstypen
const publicationTypeLabels: Record<string, string> = {
  newspaper: "Zeitung",
  magazine: "Magazin",
  website: "Website",
  blog: "Blog",
  newsletter: "Newsletter",
  podcast: "Podcast",
  tv: "TV",
  radio: "Radio",
  trade_journal: "Fachzeitschrift",
  press_agency: "Nachrichtenagentur",
  social_media: "Social Media"
};

// Labels für Frequenz
const frequencyLabels: Record<string, string> = {
  continuous: "Durchgehend",
  multiple_daily: "Mehrmals täglich",
  daily: "Täglich",
  weekly: "Wöchentlich",
  biweekly: "14-tägig",
  monthly: "Monatlich",
  bimonthly: "Zweimonatlich",
  quarterly: "Quartalsweise",
  biannual: "Halbjährlich",
  annual: "Jährlich",
  irregular: "Unregelmäßig"
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

export default function PublicationsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedPubIds, setSelectedPubIds] = useState<Set<string>>(new Set());
  const [showPublicationModal, setShowPublicationModal] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
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
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedVerified, setSelectedVerified] = useState<string>('all');

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
      const pubsData = await publicationService.getAll(currentOrganization.id);
      setPublications(pubsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Data
  const filteredPublications = useMemo(() => {
    return publications.filter(pub => {
      // Search
      const searchMatch = pub.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          pub.publisherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pub.focusAreas?.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!searchMatch) return false;
      
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
          await publicationService.softDelete(id, {
            organizationId: currentOrganization?.id || '',
            userId: user?.uid || ''
          });
          showAlert('success', `${title} wurde gelöscht`);
          await loadData();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
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
            publicationService.softDelete(id, {
              organizationId: currentOrganization?.id || '',
              userId: user?.uid || ''
            })
          ));
          showAlert('success', `${count} Publikationen gelöscht`);
          await loadData();
          setSelectedPubIds(new Set());
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Duplicate Function
  const handleDuplicate = async (pub: Publication) => {
    try {
      const duplicated = {
        ...pub,
        title: `${pub.title} (Kopie)`,
        verified: false,
        status: 'inactive' as const
      };
      delete duplicated.id;
      
      await publicationService.create(duplicated, {
        organizationId: currentOrganization?.id || '',
        userId: user?.uid || ''
      });
      
      showAlert('success', 'Publikation dupliziert');
      await loadData();
    } catch (error) {
      showAlert('error', 'Fehler beim Duplizieren');
    }
  };

  // Export Function
  const handleExport = () => {
    if (filteredPublications.length === 0) {
      showAlert('warning', 'Keine Daten zum Exportieren');
      return;
    }

    try {
      const exportData = filteredPublications.map(pub => ({
        "Titel": pub.title,
        "Verlag": pub.publisherName || '',
        "Typ": publicationTypeLabels[pub.type] || pub.type,
        "Format": pub.format || '',
        "Website": pub.websiteUrl || '',
        "Sprachen": pub.languages?.join(', ') || '',
        "Länder": pub.geographicTargets?.join(', ') || '',
        "Auflage": pub.metrics?.print?.circulation || '',
        "Online Besucher": pub.metrics?.online?.monthlyUniqueVisitors || '',
        "Themenschwerpunkte": pub.focusAreas?.join(', ') || '',
        "Frequenz": pub.metrics?.frequency ? frequencyLabels[pub.metrics.frequency] : '',
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
      
      showAlert('success', 'Export erfolgreich');
    } catch (error) {
      showAlert('error', 'Export fehlgeschlagen');
    }
  };

  const formatMetric = (pub: Publication): string => {
    if (pub.metrics?.print?.circulation) {
      return `${pub.metrics.print.circulation.toLocaleString('de-DE')} Auflage`;
    }
    if (pub.metrics?.online?.monthlyUniqueVisitors) {
      return `${pub.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')} UV/Monat`;
    }
    return "—";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <p className="mt-4 text-gray-500">Lade Publikationen...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredPublications.length / itemsPerPage);

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
        <Heading level={1}>Publikationen</Heading>
        <Text className="mt-1 text-sm text-gray-500">
          {publications.length} Publikationen in Ihrer Bibliothek
        </Text>
      </div>

      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Publikationen durchsuchen..."
            className="flex-1"
          />

          {/* Filter Button */}
          <Popover className="relative">
            {({ open }) => {
              const activeFiltersCount = selectedTypes.length + selectedLanguages.length + 
                                       selectedCountries.length + (selectedVerified !== 'all' ? 1 : 0);
              
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
                                setSelectedLanguages([]);
                                setSelectedCountries([]);
                                setSelectedVerified('all');
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
                            {Object.entries(publicationTypeLabels).map(([value, label]) => (
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

                        {/* Language Filter */}
                        {availableLanguages.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Sprache
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {availableLanguages.map(lang => (
                                <label key={lang} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedLanguages.includes(lang)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedLanguages([...selectedLanguages, lang]);
                                      } else {
                                        setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-zinc-300 text-[#005fab] focus:ring-[#005fab]"
                                  />
                                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{lang}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Country Filter */}
                        {availableCountries.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Land
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {availableCountries.map(country => (
                                <label key={country} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedCountries.includes(country)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCountries([...selectedCountries, country]);
                                      } else {
                                        setSelectedCountries(selectedCountries.filter(c => c !== country));
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-zinc-300 text-[#005fab] focus:ring-[#005fab]"
                                  />
                                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{country}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Verified Filter */}
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Status
                          </label>
                          <select
                            value={selectedVerified}
                            onChange={(e) => setSelectedVerified(e.target.value)}
                            className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab] dark:border-zinc-600 dark:bg-zinc-700"
                          >
                            <option value="all">Alle</option>
                            <option value="verified">Verifiziert</option>
                            <option value="unverified">Nicht verifiziert</option>
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
              setSelectedPublication(null);
              setShowPublicationModal(true);
            }}
          >
            Publikation hinzufügen
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
            <span className="ml-2">• {selectedPubIds.size} ausgewählt</span>
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
            <div className="flex items-center w-[25%]">
              <Checkbox
                checked={paginatedPublications.length > 0 && paginatedPublications.every(pub => selectedPubIds.has(pub.id!))}
                indeterminate={paginatedPublications.some(pub => selectedPubIds.has(pub.id!)) && !paginatedPublications.every(pub => selectedPubIds.has(pub.id!))}
                onChange={handleSelectAll}
              />
              <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Titel
              </span>
            </div>
            <div className="hidden md:block w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Verlag
            </div>
            <div className="hidden lg:block w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Typ
            </div>
            <div className="hidden lg:block w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Metrik
            </div>
            <div className="hidden xl:block w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Frequenz
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
                  <div className="flex items-center w-[25%]">
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
                        className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-[#005fab] truncate block"
                      >
                        {pub.title}
                      </Link>
                      {pub.verified && (
                        <div className="flex items-center mt-1">
                          <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">Verifiziert</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="hidden md:block w-[20%] text-sm text-zinc-600 dark:text-zinc-400">
                    {pub.publisherName || "—"}
                  </div>
                  
                  <div className="hidden lg:block w-[15%]">
                    <Badge color="zinc" className="text-xs">
                      {publicationTypeLabels[pub.type] || pub.type}
                    </Badge>
                  </div>
                  
                  <div className="hidden lg:block w-[15%] text-sm text-zinc-600 dark:text-zinc-400">
                    {formatMetric(pub)}
                  </div>
                  
                  <div className="hidden xl:block w-[10%] text-sm text-zinc-600 dark:text-zinc-400">
                    {pub.metrics?.frequency ? frequencyLabels[pub.metrics.frequency] : "—"}
                  </div>
                  
                  <div className="hidden xl:block flex-1">
                    <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                      <GlobeAltIcon className="mr-1 h-4 w-4 text-zinc-400" />
                      {pub.geographicTargets?.slice(0, 2).join(", ") || "—"}
                      {pub.geographicTargets && pub.geographicTargets.length > 2 && (
                        <span className="ml-1">+{pub.geographicTargets.length - 2}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Dropdown>
                      <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                        <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem href={`/dashboard/library/publications/${pub.id}`}>
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => {
                            setSelectedPublication(pub);
                            setShowPublicationModal(true);
                          }}
                        >
                          <PencilIcon />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownItem onClick={() => handleDuplicate(pub)}>
                          <DocumentDuplicateIcon />
                          Duplizieren
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem 
                          onClick={() => handleDelete(pub.id!, pub.title)}
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

      {/* Publication Modal */}
      {showPublicationModal && (
        <PublicationModal
          isOpen={showPublicationModal}
          onClose={() => {
            setShowPublicationModal(false);
            setSelectedPublication(null);
          }}
          publication={selectedPublication || undefined}
          onSuccess={async () => {
            setShowPublicationModal(false);
            setSelectedPublication(null);
            await loadData();
            showAlert('success', selectedPublication ? 'Publikation aktualisiert' : 'Publikation erstellt');
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <PublicationImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            setShowImportModal(false);
            loadData();
            showAlert('success', 'Import erfolgreich abgeschlossen');
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
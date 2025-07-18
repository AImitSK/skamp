// src/app/dashboard/library/publications/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { publicationService } from "@/lib/firebase/library-service";
import type { Publication } from "@/types/library";
import { Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { PublicationModal } from "./PublicationModal"; 
import PublicationImportModal from "./PublicationImportModal";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Papa from 'papaparse';

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700',
    warning: 'bg-yellow-50 text-yellow-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckIcon,
    error: XMarkIcon,
    warning: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${
            type === 'error' ? 'text-red-400' : 
            type === 'success' ? 'text-green-400' : 
            type === 'warning' ? 'text-yellow-400' :
            'text-blue-400'
          }`} />
        </div>
        <div className="ml-3">
          {title && <p className={`text-sm font-medium ${styles[type].split(' ')[1]}`}>{title}</p>}
          <p className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}

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
  other: "Sonstiges"
};

// Labels für Frequenz
const frequencyLabels: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich", 
  biweekly: "14-tägig",
  monthly: "Monatlich",
  quarterly: "Quartalsweise",
  yearly: "Jährlich",
  irregular: "Unregelmäßig"
};

export default function PublicationsPage() {
  const { user } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [filteredPublications, setFilteredPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterVerified, setFilterVerified] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'error' | 'warning'; title?: string; message: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadPublications();
    }
  }, [user]);

  useEffect(() => {
    filterPublications();
  }, [publications, searchTerm, filterType, filterVerified]);

  const loadPublications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Loading publications for user:', user.uid);
      const data = await publicationService.getAll(user.uid);
      console.log('Loaded publications:', data.length, data);
      setPublications(data);
    } catch (error) {
      console.error("Error loading publications:", error);
      showAlert('error', 'Fehler beim Laden der Publikationen');
    } finally {
      setLoading(false);
    }
  };

  const filterPublications = () => {
    let filtered = [...publications];

    // Suchfilter
    if (searchTerm) {
      filtered = filtered.filter(pub => 
        pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pub.publisherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pub.focusAreas?.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Typ-Filter
    if (filterType !== "all") {
      filtered = filtered.filter(pub => pub.type === filterType);
    }

    // Verifiziert-Filter
    if (filterVerified !== null) {
      filtered = filtered.filter(pub => pub.verified === filterVerified);
    }

    setFilteredPublications(filtered);
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

  const formatGeoTargets = (targets?: string[]): string => {
    if (!targets || targets.length === 0) return "—";
    if (targets.length <= 3) return targets.join(", ");
    return `${targets.slice(0, 3).join(", ")} +${targets.length - 3}`;
  };

  const showAlert = (type: 'info' | 'success' | 'error' | 'warning', message: string, title?: string) => {
    setAlert({ type, message, title });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleExport = () => {
    if (filteredPublications.length === 0) {
      showAlert('warning', 'Keine Publikationen zum Exportieren vorhanden');
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
      link.setAttribute('download', `publikationen_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showAlert('success', `${filteredPublications.length} Publikationen exportiert`);
    } catch (error) {
      console.error('Export error:', error);
      showAlert('error', 'Fehler beim Export');
    }
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

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} title={alert.title} message={alert.message} />
      )}

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Heading>Publikationen</Heading>
          <p className="mt-1 text-sm text-gray-500">
            {publications.length} Publikationen in Ihrer Bibliothek
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
          <Button plain onClick={() => setShowFilters(!showFilters)}>
            <FunnelIcon className="h-4 w-4" />
            Filter
          </Button>
          
          {/* Actions Dropdown */}
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
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>

          <Button onClick={() => {
            setSelectedPublication(null);
            setIsModalOpen(true);
          }}>
            <PlusIcon className="h-4 w-4" />
            Neue Publikation
          </Button>
        </div>
      </div>

      {/* Suchleiste */}
      <div className="max-w-md">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#005fab] sm:text-sm sm:leading-6"
            placeholder="Publikationen durchsuchen..."
          />
        </div>
      </div>

      {/* Filter-Bereich */}
      {showFilters && (
        <div className="bg-gray-50 px-4 py-3 rounded-lg space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#005fab] sm:text-sm"
              >
                <option value="all">Alle Typen</option>
                {Object.entries(publicationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterVerified === null ? "all" : filterVerified ? "verified" : "unverified"}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterVerified(value === "all" ? null : value === "verified");
                }}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#005fab] sm:text-sm"
              >
                <option value="all">Alle</option>
                <option value="verified">Verifiziert</option>
                <option value="unverified">Nicht verifiziert</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabelle */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Titel der Publikation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Verlag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Typ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Metrik (Print/Online)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Frequenz
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Sprache(n)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Geografisches Zielgebiet
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredPublications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                  Keine Publikationen gefunden
                </td>
              </tr>
            ) : (
              filteredPublications.map((pub) => (
                <tr key={pub.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          <Link 
                            href={`/dashboard/library/publications/${pub.id}`}
                            className="hover:text-[#005fab]"
                          >
                            {pub.title}
                          </Link>
                        </div>
                        {pub.verified && (
                          <CheckBadgeIcon className="mt-1 h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {pub.publisherName || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Badge color="zinc">
                      {publicationTypeLabels[pub.type] || pub.type}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatMetric(pub)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {pub.metrics?.frequency ? frequencyLabels[pub.metrics.frequency] : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {pub.languages?.join(", ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center">
                      <GlobeAltIcon className="mr-1 h-4 w-4 text-gray-400" />
                      {formatGeoTargets(pub.geographicTargets)}
                    </div>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => {
                        setSelectedPublication(pub);
                        setIsModalOpen(true);
                      }}
                      className="text-[#005fab] hover:text-[#004a8c]"
                    >
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Verifizierte Publikationen
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {publications.filter(p => p.verified).length}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Abgedeckte Länder
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {new Set(publications.flatMap(p => p.geographicTargets || [])).size}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Verschiedene Typen
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {new Set(publications.map(p => p.type)).size}
            </dd>
          </div>
        </div>
      </div>

      {/* Publication Modal */}
      <PublicationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPublication(null);
        }}
        publication={selectedPublication || undefined}
        onSuccess={async () => {
          setIsModalOpen(false);
          setSelectedPublication(null);
          // Kleine Verzögerung, damit Firebase die Daten vollständig schreibt
          setTimeout(() => {
            loadPublications();
          }, 500);
        }}
      />

      {/* Import Modal */}
      {showImportModal && (
        <PublicationImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            setShowImportModal(false);
            loadPublications();
            showAlert('success', 'Import erfolgreich abgeschlossen');
          }}
        />
      )}
    </div>
  );
}
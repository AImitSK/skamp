// src/app/dashboard/library/media-kits/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { mediaKitService } from "@/lib/firebase/library-service";
import type { MediaKit } from "@/types/library";
import { Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { MediaKitModal } from "./MediaKitModal";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  DocumentTextIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from "@heroicons/react/20/solid";
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';

// Alert Component (wiederverwendet aus publications)
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
    info: <div className="h-5 w-5 text-blue-400">ℹ️</div>,
    success: <CheckCircleIcon className="h-5 w-5 text-green-400" />,
    error: <XCircleIcon className="h-5 w-5 text-red-400" />,
    warning: <div className="h-5 w-5 text-yellow-400">⚠️</div>
  };

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          {icons[type]}
        </div>
        <div className="ml-3">
          {title && <p className={`text-sm font-medium ${styles[type].split(' ')[1]}`}>{title}</p>}
          <p className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}

// Media Kit Status Helper
function getStatusBadge(mediaKit: MediaKit) {
  const now = new Date();
  const validFrom = mediaKit.validFrom ? new Date(mediaKit.validFrom) : null;
  const validUntil = mediaKit.validUntil ? new Date(mediaKit.validUntil) : null;

  if (validUntil && validUntil < now) {
    return { color: 'red' as const, text: 'Abgelaufen' };
  }
  if (validFrom && validFrom > now) {
    return { color: 'yellow' as const, text: 'Geplant' };
  }
  return { color: 'green' as const, text: 'Aktiv' };
}

export default function MediaKitsPage() {
  const { user } = useAuth();
  const [mediaKits, setMediaKits] = useState<MediaKit[]>([]);
  const [filteredMediaKits, setFilteredMediaKits] = useState<MediaKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMediaKit, setSelectedMediaKit] = useState<MediaKit | null>(null);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'error' | 'warning'; title?: string; message: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadMediaKits();
    }
  }, [user]);

  useEffect(() => {
    filterMediaKits();
  }, [mediaKits, searchTerm, filterStatus]);

  const loadMediaKits = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await mediaKitService.getAll(user.uid);
      console.log('Loaded media kits:', data);
      setMediaKits(data);
    } catch (error) {
      console.error("Error loading media kits:", error);
      showAlert('error', 'Fehler beim Laden der Media Kits');
    } finally {
      setLoading(false);
    }
  };

  const filterMediaKits = () => {
    let filtered = [...mediaKits];

    // Suchfilter
    if (searchTerm) {
      filtered = filtered.filter(kit => 
        kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kit.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status-Filter
    if (filterStatus !== "all") {
      const now = new Date();
      filtered = filtered.filter(kit => {
        const status = getStatusBadge(kit);
        switch (filterStatus) {
          case 'active':
            return status.text === 'Aktiv';
          case 'expired':
            return status.text === 'Abgelaufen';
          case 'planned':
            return status.text === 'Geplant';
          default:
            return true;
        }
      });
    }

    setFilteredMediaKits(filtered);
  };

  const showAlert = (type: 'info' | 'success' | 'error' | 'warning', message: string, title?: string) => {
    setAlert({ type, message, title });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleDuplicate = async (mediaKit: MediaKit) => {
    if (!user) return;

    try {
      // Erstelle eine Kopie des Media Kits
      const newMediaKit = {
        ...mediaKit,
        name: `${mediaKit.name} (Kopie)`,
        version: `${new Date().getFullYear()}.1`,
        validFrom: new Date(),
        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      };

      // Entferne die ID für die neue Erstellung
      delete (newMediaKit as any).id;

      await mediaKitService.create(newMediaKit, {
        organizationId: user.uid,
        userId: user.uid
      });

      showAlert('success', 'Media Kit erfolgreich dupliziert');
      loadMediaKits();
    } catch (error) {
      console.error('Error duplicating media kit:', error);
      showAlert('error', 'Fehler beim Duplizieren des Media Kits');
    }
  };

  const handleGeneratePDF = async (mediaKit: MediaKit) => {
    showAlert('info', 'PDF-Generierung wird in Kürze verfügbar sein', 'Feature in Entwicklung');
  };

  const handleShare = async (mediaKit: MediaKit) => {
    showAlert('info', 'Share-Funktion wird in Kürze verfügbar sein', 'Feature in Entwicklung');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <p className="mt-4 text-gray-500">Lade Media Kits...</p>
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
          <Heading>Media Kits</Heading>
          <p className="mt-1 text-sm text-gray-500">
            {mediaKits.length} Media Kits erstellt
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
          <Button plain onClick={() => setShowFilters(!showFilters)}>
            <FunnelIcon className="h-4 w-4" />
            Filter
          </Button>
          <Button onClick={() => {
            setSelectedMediaKit(null);
            setIsModalOpen(true);
          }}>
            <PlusIcon className="h-4 w-4" />
            Neues Media Kit
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
            placeholder="Media Kits durchsuchen..."
          />
        </div>
      </div>

      {/* Filter-Bereich */}
      {showFilters && (
        <div className="bg-gray-50 px-4 py-3 rounded-lg">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-[#005fab] sm:text-sm"
              >
                <option value="all">Alle</option>
                <option value="active">Aktiv</option>
                <option value="expired">Abgelaufen</option>
                <option value="planned">Geplant</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Media Kit Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMediaKits.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Media Kits</h3>
            <p className="mt-1 text-sm text-gray-500">
              Erstellen Sie Ihr erstes Media Kit für Ihre Publikationen.
            </p>
            <div className="mt-6">
              <Button onClick={() => setIsModalOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Media Kit erstellen
              </Button>
            </div>
          </div>
        ) : (
          filteredMediaKits.map((mediaKit) => {
            const status = getStatusBadge(mediaKit);
            return (
              <div
                key={mediaKit.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {mediaKit.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {mediaKit.companyName}
                        </span>
                      </div>
                    </div>
                    <Badge color={status.color}>{status.text}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Version {mediaKit.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        Gültig: {new Date(mediaKit.validFrom).toLocaleDateString('de-DE')}
                        {mediaKit.validUntil && ` - ${new Date(mediaKit.validUntil).toLocaleDateString('de-DE')}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>
                        {mediaKit.publications.length} Publikationen, {mediaKit.advertisements.length} Werbemittel
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Button
                        plain
                        onClick={() => {
                          setSelectedMediaKit(mediaKit);
                          setIsModalOpen(true);
                        }}
                        className="text-sm"
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        plain
                        onClick={() => handleGeneratePDF(mediaKit)}
                        className="text-sm"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>

                    {/* More Actions */}
                    <Popover className="relative">
                      <Popover.Button className="p-1 rounded-lg hover:bg-gray-100">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
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
                        <Popover.Panel className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            <button
                              onClick={() => handleDuplicate(mediaKit)}
                              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <DocumentDuplicateIcon className="h-5 w-5" />
                              Duplizieren
                            </button>
                            <button
                              onClick={() => handleShare(mediaKit)}
                              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <ShareIcon className="h-5 w-5" />
                              Teilen
                            </button>
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </Popover>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Aktive Media Kits
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {mediaKits.filter(k => getStatusBadge(k).text === 'Aktiv').length}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Abgedeckte Firmen
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {new Set(mediaKits.map(k => k.companyId)).size}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Letzte Aktualisierung
            </dt>
            <dd className="mt-1 text-base font-medium text-gray-900">
              {mediaKits.length > 0 
                ? new Date(Math.max(...mediaKits.map(k => k.updatedAt?.toDate?.()?.getTime() || 0))).toLocaleDateString('de-DE')
                : '—'
              }
            </dd>
          </div>
        </div>
      </div>

      {/* Media Kit Modal */}
      {isModalOpen && (
        <MediaKitModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMediaKit(null);
          }}
          mediaKit={selectedMediaKit || undefined}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedMediaKit(null);
            loadMediaKits();
            showAlert('success', selectedMediaKit ? 'Media Kit aktualisiert' : 'Media Kit erstellt');
          }}
        />
      )}
    </div>
  );
}
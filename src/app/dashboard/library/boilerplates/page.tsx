// src/app/dashboard/pr-tools/boilerplates/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { companiesService } from "@/lib/firebase/crm-service";
import { Boilerplate } from "@/types/crm-enhanced";
import {
  useBoilerplates,
  useDeleteBoilerplate,
  useToggleFavoriteBoilerplate
} from "@/lib/hooks/useBoilerplatesData";
import { toastService } from '@/lib/utils/toast';
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
import {
  PlusIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  StarIcon as StarIconOutline,
  ExclamationTriangleIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import BoilerplateModal from "./BoilerplateModal";
import clsx from 'clsx';

// Kategorie-Labels
const CATEGORY_LABELS: Record<string, string> = {
  company: 'Unternehmensbeschreibung',
  contact: 'Kontaktinformationen',
  legal: 'Rechtliche Hinweise',
  product: 'Produktbeschreibung',
  custom: 'Sonstige'
};

// Sprachen-Labels
const LANGUAGE_LABELS: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  es: 'Spanisch',
  it: 'Italienisch'
};

// Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function BoilerplatesPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [showModal, setShowModal] = useState(false);
  const [editingBoilerplate, setEditingBoilerplate] = useState<Boilerplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Verwende currentOrganization.id für Multi-Tenancy
  const organizationId = currentOrganization?.id || '';

  // React Query Hooks
  const { data: boilerplates = [], isLoading: loading } = useBoilerplates(organizationId);
  const deleteBoilerplateMutation = useDeleteBoilerplate();
  const toggleFavoriteMutation = useToggleFavoriteBoilerplate();

  // Debounced search term (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Gefilterte Boilerplates
  const filteredBoilerplates = useMemo(() => {
    let filtered = boilerplates;

    // Textsuche (mit debounced term)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(bp =>
        bp.name.toLowerCase().includes(term) ||
        bp.content.toLowerCase().includes(term) ||
        bp.description?.toLowerCase().includes(term)
      );
    }

    // Kategorie-Filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(bp => selectedCategories.includes(bp.category));
    }

    // Sprachen-Filter
    if (selectedLanguages.length > 0) {
      filtered = filtered.filter(bp => selectedLanguages.includes((bp as any).language || 'de'));
    }

    // Scope-Filter
    if (selectedScope.length > 0) {
      filtered = filtered.filter(bp => {
        if (selectedScope.includes('global') && bp.isGlobal) return true;
        if (selectedScope.includes('client') && !bp.isGlobal) return true;
        return false;
      });
    }

    // Favoriten-Filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(bp => bp.isFavorite);
    }

    return filtered;
  }, [boilerplates, debouncedSearchTerm, selectedCategories, selectedLanguages, selectedScope, showFavoritesOnly]);

  // Paginated Data
  const paginatedBoilerplates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBoilerplates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBoilerplates, currentPage, itemsPerPage]);

  // Computed values mit useMemo
  const totalPages = useMemo(
    () => Math.ceil(filteredBoilerplates.length / itemsPerPage),
    [filteredBoilerplates.length, itemsPerPage]
  );

  const activeFiltersCount = useMemo(
    () => selectedCategories.length + selectedLanguages.length + selectedScope.length + (showFavoritesOnly ? 1 : 0),
    [selectedCategories.length, selectedLanguages.length, selectedScope.length, showFavoritesOnly]
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategories, selectedLanguages, selectedScope, showFavoritesOnly]);

  // Handler mit useCallback
  const handleEdit = useCallback((boilerplate: Boilerplate) => {
    setEditingBoilerplate(boilerplate);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Textbaustein löschen',
      message: `Möchten Sie den Textbaustein "${name}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteBoilerplateMutation.mutateAsync({ id, organizationId });
          toastService.success(`"${name}" erfolgreich gelöscht`);
        } catch (error) {
          toastService.error(
            error instanceof Error
              ? `Fehler beim Löschen: ${error.message}`
              : 'Fehler beim Löschen des Textbausteins'
          );
        }
      }
    });
  }, [deleteBoilerplateMutation, organizationId]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!organizationId || !id || !user) return;

    try {
      await toggleFavoriteMutation.mutateAsync({
        id,
        organizationId,
        userId: user.uid
      });
      toastService.success('Favorit-Status aktualisiert');
    } catch (error) {
      toastService.error(
        error instanceof Error
          ? `Fehler beim Aktualisieren: ${error.message}`
          : 'Fehler beim Aktualisieren des Favorit-Status'
      );
    }
  }, [toggleFavoriteMutation, organizationId, user]);

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
          <Text className="mt-4">Lade Textbausteine...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Compact Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
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
              <Popover.Panel className="absolute left-0 z-10 mt-2 w-[600px] origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Linke Spalte: Kategorie + Sprache */}
                    <div>
                      {/* Kategorie Filter */}
                      <div className="mb-[10px]">
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Kategorie
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(value)}
                                onChange={(e) => {
                                  const newValues = e.target.checked
                                    ? [...selectedCategories, value]
                                    : selectedCategories.filter(v => v !== value);
                                  setSelectedCategories(newValues);
                                }}
                                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Sprachen Filter */}
                      <div className="mb-[10px]">
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Sprache
                        </label>
                        <div className="space-y-2">
                          {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedLanguages.includes(value)}
                                onChange={(e) => {
                                  const newValues = e.target.checked
                                    ? [...selectedLanguages, value]
                                    : selectedLanguages.filter(v => v !== value);
                                  setSelectedLanguages(newValues);
                                }}
                                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Rechte Spalte: Sichtbarkeit + Favoriten */}
                    <div>
                      {/* Sichtbarkeit Filter */}
                      <div className="mb-[10px]">
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Sichtbarkeit
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedScope.includes('global')}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...selectedScope, 'global']
                                  : selectedScope.filter(v => v !== 'global');
                                setSelectedScope(newValues);
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Global</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedScope.includes('client')}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...selectedScope, 'client']
                                  : selectedScope.filter(v => v !== 'client');
                                setSelectedScope(newValues);
                              }}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Kundenspezifisch</span>
                          </label>
                        </div>
                      </div>

                      {/* Favoriten Filter */}
                      <div className="mb-[10px]">
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Favoriten
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showFavoritesOnly}
                              onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Nur Favoriten anzeigen</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reset Button */}
                  {activeFiltersCount > 0 && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <button
                        onClick={() => {
                          setSelectedCategories([]);
                          setSelectedLanguages([]);
                          setSelectedScope([]);
                          setShowFavoritesOnly(false);
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Alle Filter zurücksetzen
                      </button>
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>

          {/* Add Button */}
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6"
            onClick={() => setShowModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Neu hinzufügen
          </Button>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredBoilerplates.length} von {boilerplates.length} Textbausteinen
        </Text>
      </div>

      {/* Content */}
      <div>
        {filteredBoilerplates.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white dark:bg-zinc-800">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Heading level={3} className="mt-2">Keine Textbausteine gefunden</Heading>
            <Text className="mt-1">
              {searchTerm || activeFiltersCount > 0
                ? "Versuchen Sie andere Suchkriterien"
                : "Erstellen Sie Ihren ersten Textbaustein"}
            </Text>
            {!searchTerm && activeFiltersCount === 0 && (
              <div className="mt-6">
                <Button
                  onClick={() => setShowModal(true)}
                  className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
                >
                  <PlusIcon className="h-4 w-4" />
                  Ersten Baustein erstellen
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Table View
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="w-[40%] text-left">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Name
                  </span>
                </div>
                <div className="w-[15%] text-left">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Kategorie
                  </span>
                </div>
                <div className="w-[10%] text-left">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sprache
                  </span>
                </div>
                <div className="w-[25%] text-left">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sichtbarkeit
                  </span>
                </div>
                <div className="w-[10%] text-right"></div>
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedBoilerplates.map((bp) => (
                <div key={bp.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center">
                    {/* Favorite & Name */}
                    <div className="flex items-center w-[40%] text-left">
                      <button
                        onClick={() => bp.id && handleToggleFavorite(bp.id)}
                        className="text-gray-400 hover:text-[#dedc00]"
                      >
                        {bp.isFavorite ? (
                          <StarIconSolid className="h-4 w-4 text-[#dedc00]" />
                        ) : (
                          <StarIconOutline className="h-4 w-4" />
                        )}
                      </button>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {bp.name}
                        </div>
                        {bp.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                            {bp.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Kategorie */}
                    <div className="w-[15%] text-left">
                      <Badge color="zinc" className="text-xs whitespace-nowrap">
                        {CATEGORY_LABELS[bp.category] || bp.category}
                      </Badge>
                    </div>

                    {/* Sprache */}
                    <div className="w-[10%] text-left">
                      <Badge color="zinc" className="text-xs whitespace-nowrap">
                        {LANGUAGE_LABELS[(bp as any).language || 'de'] || 'Deutsch'}
                      </Badge>
                    </div>

                    {/* Sichtbarkeit */}
                    <div className="w-[25%] text-left">
                      {bp.isGlobal ? (
                        <Badge color="blue" className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                          <GlobeAltIcon className="h-3 w-3" />
                          Global
                        </Badge>
                      ) : (
                        <Badge color="orange" className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                          <BuildingOfficeIcon className="h-3 w-3" />
                          {bp.clientName || 'Kunde'}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="w-[10%] text-right">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors dark:hover:bg-zinc-700">
                          <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 stroke-[2.5]" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem onClick={() => handleEdit(bp)}>
                            <PencilIcon className="h-4 w-4" />
                            Bearbeiten
                          </DropdownItem>
                          <DropdownItem onClick={() => bp.id && handleToggleFavorite(bp.id)}>
                            {bp.isFavorite ? (
                              <>
                                <StarIconOutline className="h-4 w-4" />
                                Favorit entfernen
                              </>
                            ) : (
                              <>
                                <StarIconSolid className="h-4 w-4" />
                                Als Favorit
                              </>
                            )}
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onClick={() => bp.id && handleDelete(bp.id!, bp.name)}>
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
              <ChevronLeftIcon className="h-4 w-4" />
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
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}

      {/* Modal */}
      {showModal && (
        <BoilerplateModal
          boilerplate={editingBoilerplate}
          onClose={() => {
            setShowModal(false);
            setEditingBoilerplate(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingBoilerplate(null);
            // React Query invalidiert automatisch den Cache
          }}
          organizationId={organizationId}
          userId={user!.uid}
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
              className={confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white whitespace-nowrap' : ''}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
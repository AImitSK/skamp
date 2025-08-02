// src/app/dashboard/pr-tools/boilerplates/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { companiesService } from "@/lib/firebase/crm-service";
import { Boilerplate } from "@/types/crm-enhanced";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { SearchInput } from "@/components/search-input";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { Popover, Transition } from '@headlessui/react';
import { 
  PlusIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  StarIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LanguageIcon
} from "@heroicons/react/20/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import BoilerplateModal from "./BoilerplateModal";
import clsx from 'clsx';

// ViewToggle Component
function ViewToggle({ value, onChange, className }: { value: 'grid' | 'list'; onChange: (value: 'grid' | 'list') => void; className?: string }) {
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

export default function BoilerplatesPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBoilerplate, setEditingBoilerplate] = useState<Boilerplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filter & View States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Verwende currentOrganization.id für Multi-Tenancy
  const organizationId = currentOrganization?.id || '';

  useEffect(() => {
    if (user && currentOrganization && organizationId) {
      loadData();
    }
  }, [user, currentOrganization, organizationId]);

  const loadData = async () => {
    if (!user || !currentOrganization || !organizationId) return;
    
    setLoading(true);
    try {
      // Versuche Migration wenn nötig
      await boilerplatesService.migrateFromUserToOrg(user.uid, organizationId);
      
      // Lade Boilerplates
      const boilerplatesData = await boilerplatesService.getAll(organizationId);
      setBoilerplates(boilerplatesData);
      
      // Versuche Companies zu laden
      try {
        const companiesData = await companiesService.getAll(organizationId);
        setCompanies(companiesData);
      } catch (error) {
        console.warn('Companies konnten nicht geladen werden:', error);
        setCompanies([]);
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  };

  // Gefilterte Boilerplates
  const filteredBoilerplates = useMemo(() => {
    let filtered = boilerplates;

    // Textsuche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(bp =>
        bp.name.toLowerCase().includes(term) ||
        bp.content.toLowerCase().includes(term) ||
        bp.description?.toLowerCase().includes(term) ||
        bp.tags?.some(tag => tag.toLowerCase().includes(term))
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

    return filtered;
  }, [boilerplates, searchTerm, selectedCategories, selectedLanguages, selectedScope]);

  // Paginated Data
  const paginatedBoilerplates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBoilerplates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBoilerplates, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBoilerplates.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategories, selectedLanguages, selectedScope]);

  const handleEdit = (boilerplate: Boilerplate) => {
    setEditingBoilerplate(boilerplate);
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Textbaustein löschen',
      message: `Möchten Sie den Textbaustein "${name}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        await boilerplatesService.delete(id);
        await loadData();
      }
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedListIds.size;
    if (count === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: `${count} Textbausteine löschen`,
      message: `Möchten Sie wirklich ${count} Textbausteine unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        await Promise.all(Array.from(selectedListIds).map(id => 
          boilerplatesService.delete(id)
        ));
        await loadData();
        setSelectedListIds(new Set());
      }
    });
  };

  const handleArchive = async (id: string) => {
    if (!organizationId || !id) return;
    
    await boilerplatesService.archive(id, { organizationId, userId: user!.uid });
    await loadData();
  };

  const handleToggleFavorite = async (id: string) => {
    if (!organizationId || !id) return;
    
    await boilerplatesService.toggleFavorite(id, { organizationId, userId: user!.uid });
    await loadData();
  };

  const handleDuplicate = async (boilerplate: Boilerplate) => {
    if (!organizationId || !boilerplate.id) return;
    
    const newName = prompt("Name für die Kopie:", `${boilerplate.name} (Kopie)`);
    if (newName) {
      await boilerplatesService.duplicate(
        boilerplate.id, 
        newName, 
        { organizationId, userId: user!.uid }
      );
      await loadData();
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedListIds(new Set(paginatedBoilerplates.map(bp => bp.id!)));
    } else {
      setSelectedListIds(new Set());
    }
  };

  const activeFiltersCount = selectedCategories.length + selectedLanguages.length + selectedScope.length;

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
      {/* Header */}
      <div className="mb-6">
        <Heading level={1}>Textbausteine</Heading>
      </div>

      {/* Compact Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Textbausteine durchsuchen..."
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
                          setSelectedCategories([]);
                          setSelectedLanguages([]);
                          setSelectedScope([]);
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>

                  {/* Kategorie Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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

                  {/* Sichtbarkeit Filter */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>

          {/* View Toggle */}
          <ViewToggle value={viewMode} onChange={setViewMode} />

          {/* Add Button */}
          <Button 
            className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 h-10 px-6"
            onClick={() => setShowModal(true)}
          >
            Baustein erstellen
          </Button>

          {/* Actions Button */}
          {selectedListIds.size > 0 && (
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
                      onClick={handleBulkDelete}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Auswahl löschen ({selectedListIds.size})
                    </button>
                  </div>
                </Popover.Panel>
              </Transition>
            </Popover>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredBoilerplates.length} von {boilerplates.length} Textbausteinen
          {selectedListIds.size > 0 && (
            <span className="ml-2">
              • {selectedListIds.size} ausgewählt
            </span>
          )}
        </Text>
        
        {selectedListIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedListIds.size} Löschen
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {filteredBoilerplates.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white dark:bg-zinc-800">
            <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
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
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                >
                  <PlusIcon className="h-4 w-4" />
                  Ersten Baustein erstellen
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'list' ? (
          // Table View
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="flex items-center w-[35%]">
                  <Checkbox
                    checked={paginatedBoilerplates.length > 0 && selectedListIds.size === paginatedBoilerplates.length}
                    indeterminate={selectedListIds.size > 0 && selectedListIds.size < paginatedBoilerplates.length}
                    onChange={(checked: boolean) => handleSelectAll(checked)}
                  />
                  <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Name
                  </span>
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kategorie
                </div>
                <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Sprache
                </div>
                <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Sichtbarkeit
                </div>
                <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Tags
                </div>
                <div className="w-[5%]"></div>
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedBoilerplates.map((bp) => (
                <div key={bp.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center">
                    {/* Checkbox & Favorite */}
                    <div className="flex items-center w-[35%]">
                      <Checkbox
                        checked={selectedListIds.has(bp.id!)}
                        onChange={(checked: boolean) => {
                          const newIds = new Set(selectedListIds);
                          if (checked) newIds.add(bp.id!);
                          else newIds.delete(bp.id!);
                          setSelectedListIds(newIds);
                        }}
                      />
                      <button
                        onClick={() => bp.id && handleToggleFavorite(bp.id)}
                        className="ml-2 text-gray-400 hover:text-yellow-500"
                      >
                        {bp.isFavorite ? (
                          <StarIcon className="h-4 w-4 text-yellow-500" />
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
                    <div className="w-[15%]">
                      <Badge color="purple" className="text-xs whitespace-nowrap">
                        {CATEGORY_LABELS[bp.category] || bp.category}
                      </Badge>
                    </div>

                    {/* Sprache */}
                    <div className="w-[10%]">
                      <Badge color="zinc" className="text-xs whitespace-nowrap">
                        {LANGUAGE_LABELS[(bp as any).language || 'de'] || 'Deutsch'}
                      </Badge>
                    </div>

                    {/* Sichtbarkeit */}
                    <div className="w-[20%]">
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

                    {/* Tags */}
                    <div className="w-[15%]">
                      {bp.tags && bp.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {bp.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} color="zinc" className="text-xs">{tag}</Badge>
                          ))}
                          {bp.tags.length > 3 && (
                            <Text className="text-xs text-gray-400">+{bp.tags.length - 3}</Text>
                          )}
                        </div>
                      ) : (
                        <Text className="text-xs text-gray-400">—</Text>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="w-[5%] text-right">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                          <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem onClick={() => handleEdit(bp)}>
                            <PencilIcon className="h-4 w-4" />
                            Bearbeiten
                          </DropdownItem>
                          <DropdownItem onClick={() => handleDuplicate(bp)}>
                            <DocumentDuplicateIcon className="h-4 w-4" />
                            Duplizieren
                          </DropdownItem>
                          <DropdownItem onClick={() => bp.id && handleToggleFavorite(bp.id)}>
                            {bp.isFavorite ? (
                              <>
                                <StarIconOutline className="h-4 w-4" />
                                Favorit entfernen
                              </>
                            ) : (
                              <>
                                <StarIcon className="h-4 w-4" />
                                Als Favorit
                              </>
                            )}
                          </DropdownItem>
                          <DropdownDivider />
                          <DropdownItem onClick={() => bp.id && handleArchive(bp.id)}>
                            <ArchiveBoxIcon className="h-4 w-4" />
                            Archivieren
                          </DropdownItem>
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
        ) : (
          // Grid View
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedBoilerplates.map((bp) => (
              <div
                key={bp.id}
                className="relative rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
              >
                {/* Checkbox & Favorite */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={() => bp.id && handleToggleFavorite(bp.id)}
                    className="text-gray-400 hover:text-yellow-500"
                  >
                    {bp.isFavorite ? (
                      <StarIcon className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <StarIconOutline className="h-4 w-4" />
                    )}
                  </button>
                  <Checkbox
                    checked={selectedListIds.has(bp.id!)}
                    onChange={(checked: boolean) => {
                      const newIds = new Set(selectedListIds);
                      if (checked) newIds.add(bp.id!);
                      else newIds.delete(bp.id!);
                      setSelectedListIds(newIds);
                    }}
                  />
                </div>

                {/* Info */}
                <div className="pr-16">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white line-clamp-1">
                    {bp.name}
                  </h3>
                  {bp.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                      {bp.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge color="purple" className="text-xs">
                      {CATEGORY_LABELS[bp.category]}
                    </Badge>
                    <Badge color="zinc" className="text-xs inline-flex items-center gap-1">
                      <LanguageIcon className="h-3 w-3" />
                      {LANGUAGE_LABELS[(bp as any).language || 'de']}
                    </Badge>
                    {bp.isGlobal ? (
                      <Badge color="blue" className="text-xs inline-flex items-center gap-1">
                        <GlobeAltIcon className="h-3 w-3" />
                        Global
                      </Badge>
                    ) : (
                      <Badge color="orange" className="text-xs">
                        {bp.clientName}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content Preview */}
                <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                  {bp.content}
                </div>

                {/* Tags */}
                {bp.tags && bp.tags.length > 0 && (
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {bp.tags.slice(0, 2).map((tag, i) => (
                      <Badge key={i} color="zinc" className="text-xs">{tag}</Badge>
                    ))}
                    {bp.tags.length > 2 && (
                      <Badge color="zinc" className="text-xs">+{bp.tags.length - 2}</Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-700">
                  <button
                    onClick={() => handleEdit(bp)}
                    className="text-sm text-primary hover:text-primary-hover"
                  >
                    Bearbeiten
                  </button>
                  <Dropdown>
                    <DropdownButton plain className="p-1 hover:bg-zinc-100 rounded dark:hover:bg-zinc-700">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => handleDuplicate(bp)}>
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        Duplizieren
                      </DropdownItem>
                      <DropdownItem onClick={() => bp.id && handleArchive(bp.id)}>
                        <ArchiveBoxIcon className="h-4 w-4" />
                        Archivieren
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
            loadData();
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
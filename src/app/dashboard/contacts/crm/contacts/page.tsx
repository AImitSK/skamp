// src/app/dashboard/contacts/crm/contacts/page.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useContacts, useCompanies, useTags, useBulkDeleteContacts } from '@/lib/hooks/useCRMData';
import { ContactEnhanced, CompanyEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';
import { ContactsTableWrapper, ContactFiltersWrapper, ContactBulkActions } from './components';
import ContactModalEnhanced from '../ContactModalEnhanced';
import ImportModalEnhanced from '../ImportModalEnhanced';
import { ConfirmDialog } from '../components/shared';
import { toastService } from '@/lib/utils/toast';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { PlusIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { exportContactsToCSV, downloadCSV } from '@/lib/utils/exportUtils';
import clsx from 'clsx';

/**
 * Contacts Page Component
 *
 * Displays and manages contacts with filtering, search, and bulk actions.
 * Uses extracted components for better maintainability.
 *
 * @component
 */
export default function ContactsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  // React Query hooks for data fetching with automatic caching
  const { data: contacts = [], isLoading: loadingContacts } = useContacts(currentOrganization?.id);
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies(currentOrganization?.id);
  const { data: tags = [], isLoading: loadingTags } = useTags(currentOrganization?.id);
  const { mutate: bulkDeleteContacts } = useBulkDeleteContacts();

  const loading = loadingContacts || loadingCompanies || loadingTags;

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Filter State
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [journalistsOnly, setJournalistsOnly] = useState(false);

  // Modal State
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactEnhanced | null>(null);

  // Confirm State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Memoized Data
  const tagsMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    tags.forEach(tag => {
      if (tag.id) {
        map.set(tag.id, { name: tag.name, color: tag.color });
      }
    });
    return map;
  }, [tags]);

  const companiesMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach(company => {
      if (company.id) {
        map.set(company.id, company.name);
      }
    });
    return map;
  }, [companies]);

  // Filter & Pagination
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Kompatibilität: Prüfe sowohl Top-Level als auch nested Namen (ContactEnhanced hat name.firstName)
      const firstName = contact.firstName || (contact as any).name?.firstName || '';
      const lastName = contact.lastName || (contact as any).name?.lastName || '';
      const displayName = (contact as any).displayName || '';

      // Bei leerem Suchbegriff: alle Kontakte anzeigen
      if (!searchTerm.trim()) {
        // Kontakt muss aber mindestens einen Namen haben
        if (!firstName && !lastName && !displayName) return false;
      } else {
        // Suche in allen relevanten Feldern
        const searchLower = searchTerm.toLowerCase();
        const searchMatch =
          firstName.toLowerCase().includes(searchLower) ||
          lastName.toLowerCase().includes(searchLower) ||
          displayName.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.position?.toLowerCase().includes(searchLower);
        if (!searchMatch) return false;
      }

      const companyMatch = selectedCompanyIds.length === 0 ||
                          (contact.companyId && selectedCompanyIds.includes(contact.companyId));
      if (!companyMatch) return false;

      const tagMatch = selectedTagIds.length === 0 ||
                       contact.tagIds?.some(tagId => selectedTagIds.includes(tagId));
      if (!tagMatch) return false;

      const journalistMatch = !journalistsOnly || contact.isJournalist === true;
      if (!journalistMatch) return false;

      return true;
    }).sort((a, b) => {
      // Alphabetische Sortierung nach Nachname, dann Vorname
      const lastNameA = a.lastName || (a as any).name?.lastName || '';
      const lastNameB = b.lastName || (b as any).name?.lastName || '';
      const firstNameA = a.firstName || (a as any).name?.firstName || '';
      const firstNameB = b.firstName || (b as any).name?.firstName || '';

      const lastNameCompare = lastNameA.localeCompare(lastNameB, 'de');
      if (lastNameCompare !== 0) return lastNameCompare;
      return firstNameA.localeCompare(firstNameB, 'de');
    });
  }, [contacts, searchTerm, selectedCompanyIds, selectedTagIds, journalistsOnly]);

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  // Handlers
  const handleDelete = async (id: string, name: string) => {
    if (!currentOrganization) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Kontakt löschen',
      message: `Möchten Sie "${name}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        bulkDeleteContacts(
          { ids: [id], organizationId: currentOrganization.id },
          {
            onSuccess: () => {
              toastService.success(`${name} erfolgreich gelöscht`);
            },
            onError: () => {
              toastService.error('Kontakt konnte nicht gelöscht werden');
            },
          }
        );
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !currentOrganization) return;

    setConfirmDialog({
      isOpen: true,
      title: `${selectedIds.size} Kontakte löschen`,
      message: `Möchten Sie wirklich ${selectedIds.size} Kontakte unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        const ids = Array.from(selectedIds);
        bulkDeleteContacts(
          { ids, organizationId: currentOrganization.id },
          {
            onSuccess: () => {
              toastService.success(`${ids.length} Kontakte erfolgreich gelöscht`);
              setSelectedIds(new Set());
            },
            onError: () => {
              toastService.error('Kontakte konnten nicht gelöscht werden');
            },
          }
        );
      }
    });
  };

  const handleExport = () => {
    try {
      const csvContent = exportContactsToCSV(filteredContacts, companiesMap, tagsMap, {
        includeIds: false,
        includeTimestamps: false,
        includeTags: true
      });

      if (!csvContent || filteredContacts.length === 0) {
        toastService.warning('Keine Daten zum Exportieren');
        return;
      }

      downloadCSV(csvContent, 'kontakte-export.csv');
      toastService.success('Export erfolgreich: kontakte-export.csv');
    } catch (error) {
      toastService.error('Export fehlgeschlagen - bitte Konsole prüfen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">Lade Daten...</Text>
        </div>
      </div>
    );
  }

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
              placeholder="Kontakte durchsuchen..."
              className={clsx(
                'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
                'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                'dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-700',
                'h-10'
              )}
            />
          </div>

          {/* Add Button */}
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6"
            onClick={() => {
              setSelectedContact(null);
              setShowContactModal(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Neu hinzufügen
          </Button>

          {/* Filters */}
          <ContactFiltersWrapper
            selectedCompanyIds={selectedCompanyIds}
            selectedTagIds={selectedTagIds}
            journalistsOnly={journalistsOnly}
            onCompanyChange={setSelectedCompanyIds}
            onTagChange={setSelectedTagIds}
            onJournalistToggle={setJournalistsOnly}
            availableCompanies={companies}
            availableTags={tags}
            contacts={contacts}
          />

          {/* Bulk Actions */}
          <ContactBulkActions
            selectedCount={selectedIds.size}
            onImport={() => setShowImportModal(true)}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
          />
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredContacts.length} von {contacts.length} Kontakten
          {selectedIds.size > 0 && (
            <span className="ml-2">· {selectedIds.size} ausgewählt</span>
          )}
        </Text>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {selectedIds.size} Löschen
          </button>
        )}
      </div>

      {/* Table */}
      <ContactsTableWrapper
        contacts={paginatedContacts}
        selectedIds={selectedIds}
        companies={companies}
        tags={tags}
        onSelect={setSelectedIds}
        onView={(id) => router.push(`/dashboard/contacts/crm/contacts/${id}`)}
        onEdit={(contact) => {
          setSelectedContact(contact);
          setShowContactModal(true);
        }}
        onDelete={handleDelete}
      />

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
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      )}

      {/* Modals */}
      {showContactModal && (
        <ContactModalEnhanced
          contact={selectedContact}
          companies={companies}
          onClose={() => {
            setShowContactModal(false);
            setSelectedContact(null);
          }}
          onSave={() => {
            // React Query automatically refetches after mutations
            toastService.success(selectedContact ? 'Kontakt erfolgreich aktualisiert' : 'Kontakt erfolgreich erstellt');
            setShowContactModal(false);
            setSelectedContact(null);
          }}
          userId={user?.uid || ''}
          organizationId={currentOrganization?.id || user?.uid || ''}
        />
      )}

      {showImportModal && (
        <ImportModalEnhanced
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            setShowImportModal(false);
            // React Query automatically refetches after mutations
            toastService.success('Import erfolgreich abgeschlossen');
          }}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

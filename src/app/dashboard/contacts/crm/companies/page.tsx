// src/app/dashboard/contacts/crm/companies/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { companiesEnhancedService, contactsEnhancedService, tagsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { Tag, CompanyType, companyTypeLabels } from '@/types/crm';
import { CompaniesTable, CompanyFilters, CompanyBulkActions } from './components';
import CompanyModal from '../CompanyModal';
import ImportModalEnhanced from '../ImportModalEnhanced';
import { Alert, ConfirmDialog } from '../components/shared';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { PlusIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { exportCompaniesToCSV, downloadCSV } from '@/lib/utils/exportUtils';
import clsx from 'clsx';

/**
 * Companies Page Component
 *
 * Displays and manages companies with filtering, search, and bulk actions.
 * Uses extracted components for better maintainability.
 *
 * @component
 */
export default function CompaniesPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  // Data State
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Filter State
  const [selectedTypes, setSelectedTypes] = useState<CompanyType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Modal State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyEnhanced | null>(null);

  // Alert & Confirm State
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Alert Helper
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Load Data
  const loadData = useCallback(async () => {
    if (!user || !currentOrganization) return;
    setLoading(true);
    try {
      const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesEnhancedService.getAll(currentOrganization.id),
        contactsEnhancedService.getAll(currentOrganization.id),
        tagsEnhancedService.getAllAsLegacyTags(currentOrganization.id)
      ]);

      setCompanies(companiesData);
      setContacts(contactsData);
      setTags(tagsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization, showAlert]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentOrganization, loadData]);

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

  // Filter & Pagination
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const searchMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.industryClassification?.primary?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(company.type);
      if (!typeMatch) return false;

      const tagMatch = selectedTagIds.length === 0 ||
                       company.tagIds?.some(tagId => selectedTagIds.includes(tagId));
      if (!tagMatch) return false;

      return true;
    });
  }, [companies, searchTerm, selectedTypes, selectedTagIds]);

  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  // Contact Count Helper
  const getContactCount = useCallback((companyId: string) => {
    return contacts.filter(contact => contact.companyId === companyId).length;
  }, [contacts]);

  // Handlers
  const handleDelete = async (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Firma löschen',
      message: `Möchten Sie "${name}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/client-init');
          await deleteDoc(doc(db, 'companies_enhanced', id));
          showAlert('success', `${name} wurde gelöscht`);
          await loadData();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: `${selectedIds.size} Firmen löschen`,
      message: `Möchten Sie wirklich ${selectedIds.size} Firmen unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        const ids = Array.from(selectedIds);
        try {
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/client-init');
          await Promise.all(ids.map(id => deleteDoc(doc(db, 'companies_enhanced', id))));
          showAlert('success', `${ids.length} Firmen gelöscht`);
          await loadData();
          setSelectedIds(new Set());
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  const handleExport = () => {
    try {
      const csvContent = exportCompaniesToCSV(filteredCompanies, tagsMap, {
        includeIds: false,
        includeTimestamps: false,
        includeTags: true
      });

      if (!csvContent || filteredCompanies.length === 0) {
        showAlert('warning', 'Keine Daten zum Exportieren');
        return;
      }

      downloadCSV(csvContent, 'firmen-export.csv');
      showAlert('success', 'Export erfolgreich: firmen-export.csv');
    } catch (error) {
      showAlert('error', 'Export fehlgeschlagen', 'Bitte prüfen Sie die Konsole für Details.');
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
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

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
              placeholder="Firmen durchsuchen..."
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
              setSelectedCompany(null);
              setShowCompanyModal(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Neu hinzufügen
          </Button>

          {/* Filters */}
          <CompanyFilters
            selectedTypes={selectedTypes}
            selectedTagIds={selectedTagIds}
            onTypeChange={setSelectedTypes}
            onTagChange={setSelectedTagIds}
            availableTags={tags}
            companies={companies}
          />

          {/* Bulk Actions */}
          <CompanyBulkActions
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
          {filteredCompanies.length} von {companies.length} Firmen
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
      <CompaniesTable
        companies={paginatedCompanies}
        selectedIds={selectedIds}
        contacts={contacts}
        tags={tags}
        onSelect={setSelectedIds}
        onView={(id) => router.push(`/dashboard/contacts/crm/companies/${id}`)}
        onEdit={(company) => {
          setSelectedCompany(company);
          setShowCompanyModal(true);
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
      {showCompanyModal && (
        <CompanyModal
          company={selectedCompany}
          onClose={() => {
            setShowCompanyModal(false);
            setSelectedCompany(null);
          }}
          onSave={() => {
            loadData();
            showAlert('success', selectedCompany ? 'Firma aktualisiert' : 'Firma erstellt');
            setShowCompanyModal(false);
            setSelectedCompany(null);
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
            loadData();
            showAlert('success', 'Import erfolgreich');
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
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

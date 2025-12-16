// src/app/dashboard/contacts/crm/companies/page.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useCompanies, useContacts, useTags, useBulkDeleteCompanies } from '@/lib/hooks/useCRMData';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { Tag, CompanyType, companyTypeLabels } from '@/types/crm';
import { CompaniesTableWrapper, CompanyFilters, CompanyBulkActions } from './components';
import CompanyModal from '../CompanyModal';
import ImportModalEnhanced from '../ImportModalEnhanced';
import { ConfirmDialog } from '../components/shared';
import { toastService } from '@/lib/utils/toast';
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
  const t = useTranslations('companies');
  const tToast = useTranslations('toasts.companies');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  // React Query hooks for data fetching with automatic caching
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies(currentOrganization?.id);
  const { data: contacts = [], isLoading: loadingContacts } = useContacts(currentOrganization?.id);
  const { data: tags = [], isLoading: loadingTags } = useTags(currentOrganization?.id);
  const { mutate: bulkDeleteCompanies } = useBulkDeleteCompanies();

  const loading = loadingCompanies || loadingContacts || loadingTags;

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
    }).sort((a, b) => a.name.localeCompare(b.name, 'de'));
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
    if (!currentOrganization) return;

    setConfirmDialog({
      isOpen: true,
      title: t('deleteDialog.title'),
      message: t('deleteDialog.message', { name }),
      type: 'danger',
      onConfirm: async () => {
        bulkDeleteCompanies(
          { ids: [id], organizationId: currentOrganization.id },
          {
            onSuccess: () => {
              toastService.success(tToast('deleted', { name }));
            },
            onError: () => {
              toastService.error(tToast('deleteError'));
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
      title: t('bulkDeleteDialog.title', { count: selectedIds.size }),
      message: t('bulkDeleteDialog.message', { count: selectedIds.size }),
      type: 'danger',
      onConfirm: async () => {
        const ids = Array.from(selectedIds);
        bulkDeleteCompanies(
          { ids, organizationId: currentOrganization.id },
          {
            onSuccess: () => {
              toastService.success(tToast('bulkDeleted', { count: ids.length }));
              setSelectedIds(new Set());
            },
            onError: () => {
              toastService.error(tToast('bulkDeleteError'));
            },
          }
        );
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
        toastService.warning(tToast('noDataToExport'));
        return;
      }

      downloadCSV(csvContent, 'firmen-export.csv');
      toastService.success(tToast('exportSuccess'));
    } catch (error) {
      toastService.error(tToast('exportError'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">{t('loading')}</Text>
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
              placeholder={t('searchPlaceholder')}
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
            {t('addNew')}
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
          {t('resultsInfo', { filtered: filteredCompanies.length, total: companies.length })}
          {selectedIds.size > 0 && (
            <span className="ml-2">· {t('selected', { count: selectedIds.size })}</span>
          )}
        </Text>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {t('deleteSelected', { count: selectedIds.size })}
          </button>
        )}
      </div>

      {/* Table */}
      <CompaniesTableWrapper
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
              {t('pagination.previous')}
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
              {t('pagination.next')}
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
            // React Query automatically refetches after mutations
            toastService.success(selectedCompany ? tToast('updated') : tToast('created'));
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
            // React Query automatically refetches after mutations
            toastService.success(tToast('importSuccess'));
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

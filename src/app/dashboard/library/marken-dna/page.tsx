// src/app/dashboard/library/marken-dna/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useCompanies } from '@/lib/hooks/useCRMData';
import { useAllCustomersMarkenDNAStatus } from '@/lib/hooks/useMarkenDNA';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Checkbox } from '@/components/ui/checkbox';
import { CompanyTable } from './components/CompanyTable';
import { MarkenDNAEditorModal } from '@/components/marken-dna/MarkenDNAEditorModal';
import { VideoInfoCard } from '@/components/ui/VideoInfoCard';
import { toastService } from '@/lib/utils/toast';
import { type MarkenDNADocumentType, type DocumentStatus } from '@/components/marken-dna/StatusCircles';
import clsx from 'clsx';

/**
 * Marken-DNA Library Page Component
 *
 * Zeigt alle Kunden (Companies mit type='customer') mit ihrem Marken-DNA Status an.
 * Ermoeglicht das Erstellen und Bearbeiten der 6 strategischen Dokumente pro Kunde.
 *
 * @component
 */
export default function MarkenDNAPage() {
  const t = useTranslations('markenDNA');
  const tCommon = useTranslations('common');
  const tToast = useTranslations('toasts');
  const tVideo = useTranslations('markenDnaPage.video');
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Daten laden
  const { data: companies = [], isLoading } = useCompanies(currentOrganization?.id);
  const { data: markenDNAStatuses = [], isLoading: isLoadingDNA, refetch: refetchStatus } = useAllCustomersMarkenDNAStatus(currentOrganization?.id);

  // Refetch bei jedem Mount um aktuellen Status zu zeigen
  useEffect(() => {
    if (currentOrganization?.id) {
      refetchStatus();
    }
  }, [currentOrganization?.id, refetchStatus]);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [editingCompany, setEditingCompany] = useState<CompanyEnhanced | null>(null);
  const [editingDocumentType, setEditingDocumentType] = useState<MarkenDNADocumentType | null>(null);

  // Nur Kunden filtern (type: 'customer')
  const customers = useMemo(() => {
    return companies.filter(company => company.type === 'customer');
  }, [companies]);

  // Hilfsfunktion: Marken-DNA Status für Company abrufen
  const getMarkenDNAStatus = (companyId: string): Record<MarkenDNADocumentType, DocumentStatus> => {
    const status = markenDNAStatuses.find(s => s.companyId === companyId);
    if (!status) {
      return {
        briefing: 'missing',
        swot: 'missing',
        audience: 'missing',
        positioning: 'missing',
        goals: 'missing',
        messages: 'missing',
      };
    }
    return status.documents as Record<MarkenDNADocumentType, DocumentStatus>;
  };

  // Filter & Search
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search-Match
      const searchMatch = customer.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      // Status-Filter
      if (filterStatus === 'complete') {
        const status = markenDNAStatuses.find(s => s.companyId === customer.id);
        return status?.isComplete === true;
      }
      if (filterStatus === 'incomplete') {
        const status = markenDNAStatuses.find(s => s.companyId === customer.id);
        return status?.isComplete !== true;
      }

      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [customers, searchTerm, filterStatus, markenDNAStatuses]);

  // Handler-Funktionen
  const handleView = (id: string) => {
    router.push(`/dashboard/library/marken-dna/${id}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(t('confirmDelete', { companyName: name }))) {
      // TODO: Implement delete
      toastService.success(tToast('markenDNA.allDocumentsDeleted'));
    }
  };

  const handleSaveDocument = async (content: string) => {
    try {
      // TODO: Implement save
      toastService.success(tToast('markenDNA.documentSaved'));
      setEditingCompany(null);
      setEditingDocumentType(null);
    } catch (error) {
      toastService.error(tToast('saveError'));
    }
  };

  if (isLoading || isLoadingDNA) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">{tCommon('loading')}</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Video Tutorial Card */}
      <VideoInfoCard
        videoId="yTfquGkL4cg"
        title={tVideo('title')}
        description={tVideo('description')}
        features={[
          tVideo('features.crmSetup'),
          tVideo('features.documents'),
          tVideo('features.synthesis'),
          tVideo('features.projectUsage')
        ]}
        variant="default"
        className="mb-8"
      />

      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className={clsx(
              'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
              'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'h-10'
            )}
          />
        </div>

        {/* Filter Popover */}
        <Popover className="relative">
          <PopoverButton
            className={clsx(
              'inline-flex items-center justify-center rounded-lg',
              'border border-zinc-300 bg-white text-zinc-700',
              'hover:bg-zinc-50 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              'h-10 w-10 p-2.5'
            )}
          >
            <FunnelIcon className="h-5 w-5 stroke-2" />
          </PopoverButton>

          <PopoverPanel
            anchor="bottom end"
            className="mt-2 w-80 origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  {t('filter.status')}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filterStatus === 'all'}
                      onChange={() => setFilterStatus('all')}
                    />
                    <label className="text-sm text-zinc-700">{t('filter.all')}</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filterStatus === 'complete'}
                      onChange={() => setFilterStatus('complete')}
                    />
                    <label className="text-sm text-zinc-700">{t('filter.complete')}</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filterStatus === 'incomplete'}
                      onChange={() => setFilterStatus('incomplete')}
                    />
                    <label className="text-sm text-zinc-700">{t('filter.incomplete')}</label>
                  </div>
                </div>
              </div>

              {(filterStatus !== 'all') && (
                <div className="flex justify-end pt-2 border-t border-zinc-200">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className="text-sm text-zinc-500 hover:text-zinc-700 underline"
                  >
                    {t('filter.reset')}
                  </button>
                </div>
              )}
            </div>
          </PopoverPanel>
        </Popover>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4">
        <Text className="text-sm text-zinc-600">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? t('results.customer') : t('results.customers')} {t('results.found')}
        </Text>
      </div>

      {/* Table */}
      <CompanyTable
        companies={filteredCustomers}
        onView={handleView}
        onDelete={handleDelete}
        getMarkenDNAStatus={getMarkenDNAStatus}
      />

      {/* Editor Modal */}
      {editingCompany && editingDocumentType && (
        <MarkenDNAEditorModal
          open={true}
          onClose={() => {
            setEditingCompany(null);
            setEditingDocumentType(null);
          }}
          company={editingCompany}
          documentType={editingDocumentType}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  );
}

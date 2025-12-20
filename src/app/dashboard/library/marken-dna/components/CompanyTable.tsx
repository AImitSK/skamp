"use client";

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from '@/components/ui/dropdown';
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { StatusCircles, DocumentStatus, MarkenDNADocumentType } from '@/components/marken-dna/StatusCircles';
import { CompanyEnhanced } from '@/types/crm-enhanced';

export interface CompanyTableProps {
  companies: CompanyEnhanced[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onView: (id: string) => void;
  onEdit: (company: CompanyEnhanced) => void;
  onDelete: (id: string, name: string) => void;
  getMarkenDNAStatus: (companyId: string) => Record<MarkenDNADocumentType, DocumentStatus>;
}

type SortField = 'name' | 'status' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

/**
 * Company Table für Marken-DNA Bibliothek
 *
 * Zeigt eine tabellarische Liste von Kunden (type: 'customer') mit ihrem Marken-DNA Status an.
 *
 * @component
 * @example
 * ```tsx
 * <CompanyTable
 *   companies={customers}
 *   selectedIds={selectedCompanyIds}
 *   onSelectAll={handleSelectAll}
 *   onSelect={handleSelect}
 *   onView={(id) => router.push(`/marken-dna/${id}`)}
 *   onEdit={setEditingCompany}
 *   onDelete={handleDelete}
 *   getMarkenDNAStatus={getMarkenDNAStatus}
 * />
 * ```
 */
export function CompanyTable({
  companies,
  selectedIds,
  onSelectAll,
  onSelect,
  onView,
  onEdit,
  onDelete,
  getMarkenDNAStatus,
}: CompanyTableProps) {
  const t = useTranslations('markenDNA');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sortierte Companies
  const sortedCompanies = useMemo(() => {
    const sorted = [...companies];

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'name':
          compareValue = (a.name || '').localeCompare(b.name || '');
          break;

        case 'status': {
          const statusA = getMarkenDNAStatus(a.id!);
          const statusB = getMarkenDNAStatus(b.id!);

          // Berechne Anzahl completed Dokumente
          const completedA = Object.values(statusA).filter(s => s === 'completed').length;
          const completedB = Object.values(statusB).filter(s => s === 'completed').length;

          compareValue = completedA - completedB;
          break;
        }

        case 'updatedAt':
          compareValue = (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0);
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [companies, sortField, sortDirection, getMarkenDNAStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 ml-1" />
    );
  };

  const allSelected = sortedCompanies.length > 0 && selectedIds.size === sortedCompanies.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < sortedCompanies.length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center">
          {/* Column 1: Name (sortable) */}
          <div className="flex items-center w-[30%]">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(checked: boolean) => onSelectAll(checked)}
            />
            <button
              onClick={() => handleSort('name')}
              className="ml-4 flex items-center text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-700 transition-colors"
            >
              {t('table.name')}
              <SortIcon field="name" />
            </button>
          </div>

          {/* Column 2: Status (sortable) */}
          <div className="w-[30%]">
            <button
              onClick={() => handleSort('status')}
              className="flex items-center text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-700 transition-colors"
            >
              {t('table.status')}
              <SortIcon field="status" />
            </button>
          </div>

          {/* Column 3: Letzte Aktualisierung (sortable) */}
          <div className="w-[30%]">
            <button
              onClick={() => handleSort('updatedAt')}
              className="flex items-center text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-700 transition-colors"
            >
              {t('table.updated')}
              <SortIcon field="updatedAt" />
            </button>
          </div>

          {/* Column 4: Actions (Platzhalter für 3-Punkte) */}
          <div className="w-[10%]"></div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-zinc-200">
        {sortedCompanies.map((company) => {
          const markenDNAStatus = getMarkenDNAStatus(company.id!);
          const updatedDate = company.updatedAt
            ? new Date(company.updatedAt.seconds * 1000).toLocaleDateString('de-DE')
            : '—';

          return (
            <div
              key={company.id}
              className="px-6 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center">
                {/* Company Name */}
                <div className="flex items-center w-[30%]">
                  <Checkbox
                    checked={selectedIds.has(company.id!)}
                    onChange={(checked: boolean) => onSelect(company.id!, checked)}
                  />
                  <div className="ml-4 min-w-0 flex-1">
                    <button
                      onClick={() => onView(company.id!)}
                      className="text-sm font-semibold text-zinc-900 hover:text-primary truncate block text-left"
                    >
                      {company.name}
                    </button>
                    <div className="mt-1">
                      <Badge color="zinc" className="text-xs">
                        {t('results.customer')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Status Circles */}
                <div className="w-[30%]">
                  <StatusCircles
                    documents={markenDNAStatus}
                    size="md"
                    clickable={false}
                  />
                </div>

                {/* Last Updated */}
                <div className="w-[30%]">
                  <span className="text-sm text-zinc-700">{updatedDate}</span>
                </div>

                {/* Actions - 3-Punkte-Menü */}
                <div className="w-[10%] flex justify-end">
                  <Dropdown>
                    <DropdownButton
                      plain
                      className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors
                                 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 stroke-[2.5]" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => onView(company.id!)}>
                        <EyeIcon className="h-4 w-4" />
                        {t('actions.view')}
                      </DropdownItem>
                      <DropdownItem onClick={() => onEdit(company)}>
                        <PencilIcon className="h-4 w-4" />
                        {t('actions.edit')}
                      </DropdownItem>
                      <DropdownDivider />
                      <DropdownItem onClick={() => onDelete(company.id!, company.name)}>
                        <TrashIcon className="h-4 w-4" />
                        <span className="text-red-600">{t('actions.delete')}</span>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

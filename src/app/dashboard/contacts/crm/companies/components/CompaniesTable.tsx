// src/app/dashboard/contacts/crm/companies/components/CompaniesTable.tsx
"use client";

import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";
import { CompanyEnhanced } from "@/types/crm-enhanced";
import { companyTypeLabels } from "@/types/crm";
import { FlagIcon } from "../../components/shared/FlagIcon";

export interface CompaniesTableProps {
  companies: CompanyEnhanced[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onView: (id: string) => void;
  onEdit: (company: CompanyEnhanced) => void;
  onDelete: (id: string, name: string) => void;
  tagsMap: Map<string, { name: string; color: string }>;
  getContactCount: (companyId: string) => number;
  getCountryName: (countryCode?: string) => string;
}

/**
 * Companies Table Component
 *
 * Zeigt eine tabellarische Liste von Firmen mit Aktionen an.
 *
 * @component
 * @example
 * ```tsx
 * <CompaniesTable
 *   companies={paginatedCompanies}
 *   selectedIds={selectedCompanyIds}
 *   onSelectAll={handleSelectAllCompanies}
 *   onSelect={(id, checked) => handleSelectCompany(id, checked)}
 *   onView={(id) => router.push(`/companies/${id}`)}
 *   onEdit={setEditingCompany}
 *   onDelete={handleDelete}
 *   tagsMap={tagsMap}
 *   getContactCount={getContactCount}
 *   getCountryName={getCountryName}
 * />
 * ```
 */
export function CompaniesTable({
  companies,
  selectedIds,
  onSelectAll,
  onSelect,
  onView,
  onEdit,
  onDelete,
  tagsMap,
  getContactCount,
  getCountryName
}: CompaniesTableProps) {
  const router = useRouter();

  const allSelected = companies.length > 0 && selectedIds.size === companies.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < companies.length;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center">
          <div className="flex items-center w-[25%]">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(checked: boolean) => onSelectAll(checked)}
            />
            <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Firmenname / Typ
            </span>
          </div>
          <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Ort / Land
          </div>
          <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Website
          </div>
          <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Personen
          </div>
          <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pr-14">
            Tags
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {companies.map((company) => (
          <div key={company.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center">
              {/* Company Name & Type */}
              <div className="flex items-center w-[25%]">
                <Checkbox
                  checked={selectedIds.has(company.id!)}
                  onChange={(checked: boolean) => onSelect(company.id!, checked)}
                />
                <div className="ml-4 min-w-0 flex-1">
                  <button
                    onClick={() => onView(company.id!)}
                    className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                  >
                    {company.name}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color="zinc" className="text-xs whitespace-nowrap">
                      {companyTypeLabels[company.type]}
                    </Badge>
                    {(company as any)._isReference && (
                      <Badge color="blue" className="text-xs">
                        🌐 Verweis
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Location: City / Country */}
              <div className="w-[20%]">
                {company.mainAddress ? (
                  <div className="text-sm">
                    <div className="text-zinc-900 dark:text-white font-medium">
                      {company.mainAddress.city || '—'}
                    </div>
                    {company.mainAddress.countryCode && (
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 mt-0.5">
                        <FlagIcon countryCode={company.mainAddress.countryCode} className="h-3 w-5 shrink-0" />
                        <span>{getCountryName(company.mainAddress.countryCode)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-400">—</span>
                )}
              </div>

              {/* Website */}
              <div className="w-[20%]">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary-hover truncate flex items-center gap-1.5"
                    title={company.website}
                  >
                    <GlobeAltIcon className="h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
                    <span className="truncate">{company.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                  </a>
                ) : (
                  <div className="text-sm text-zinc-400 flex items-center gap-1.5">
                    <GlobeAltIcon className="h-4 w-4 shrink-0" />
                    <span>—</span>
                  </div>
                )}
              </div>

              {/* Contact Count */}
              <div className="w-[10%]">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {getContactCount(company.id!)}
                </span>
              </div>

              {/* Tags */}
              <div className="flex-1 pr-14">
                <div className="flex flex-wrap gap-1">
                  {company.tagIds?.slice(0, 3).map(tagId => {
                    const tag = tagsMap.get(tagId);
                    return tag ? (
                      <Badge key={tagId} color={tag.color as any} className="text-xs">
                        {tag.name}
                      </Badge>
                    ) : null;
                  })}
                  {company.tagIds && company.tagIds.length > 3 && (
                    <span className="text-xs text-zinc-400">+{company.tagIds.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="ml-4">
                <Dropdown>
                  <DropdownButton plain className="p-1.5 hover:bg-zinc-200 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    <EllipsisVerticalIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-400 stroke-[2.5]" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end">
                    <DropdownItem onClick={() => onView(company.id!)}>
                      <EyeIcon className="h-4 w-4" />
                      Anzeigen
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => onEdit(company)}
                      disabled={(company as any)?._isReference}
                      className={(company as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <PencilIcon className="h-4 w-4" />
                      Bearbeiten {(company as any)?._isReference && '(Verweis)'}
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() => onDelete(company.id!, company.name)}
                      disabled={(company as any)?._isReference}
                      className={(company as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="text-red-600">Löschen {(company as any)?._isReference && '(Verweis)'}</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

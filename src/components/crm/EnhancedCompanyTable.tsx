// src/components/crm/EnhancedCompanyTable.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { companyTypeLabels } from "@/types/crm";
import { CompanyEnhanced, COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS, CompanyEnhancedListView } from "@/types/crm-enhanced";
import { getCurrencyInfo } from "@/lib/validators/iso-validators";
import {
  EllipsisVerticalIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  TagIcon,
  BuildingOfficeIcon,
  CurrencyEuroIcon,
  UsersIcon,
  MapPinIcon
} from "@heroicons/react/20/solid";
import clsx from "clsx";

interface EnhancedCompanyTableProps {
  companies: CompanyEnhanced[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onEdit: (company: CompanyEnhanced) => void;
  onDelete: (company: CompanyEnhanced) => void;
  onView: (company: CompanyEnhanced) => void;
  tags?: Map<string, { name: string; color: string }>;
  viewMode?: 'compact' | 'detailed';
}

export function EnhancedCompanyTable({
  companies,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete,
  onView,
  tags = new Map(),
  viewMode = 'compact'
}: EnhancedCompanyTableProps) {
  const allSelected = companies.length > 0 && companies.every(c => selectedIds.has(c.id!));
  const someSelected = companies.some(c => selectedIds.has(c.id!)) && !allSelected;

  // Format currency amount
  const formatRevenue = (company: CompanyEnhanced) => {
    if (!company.financial?.annualRevenue) return null;
    const { amount, currency } = company.financial.annualRevenue;
    const info = getCurrencyInfo(currency);
    if (!info) return `${amount.toLocaleString('de-DE')} ${currency}`;
    return `${info.symbol} ${amount.toLocaleString('de-DE')}`;
  };

  // Get primary contact info
  const getPrimaryEmail = (company: CompanyEnhanced) => {
    return company.emails?.find(e => e.isPrimary)?.email || company.emails?.[0]?.email;
  };

  const getPrimaryPhone = (company: CompanyEnhanced) => {
    return company.phones?.find(p => p.isPrimary)?.number || company.phones?.[0]?.number;
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'zinc';
      case 'prospect': return 'blue';
      case 'archived': return 'red';
      default: return 'zinc';
    }
  };


  if (viewMode === 'detailed') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center">
            <div className="flex items-center w-[25%]">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onSelectAll}
              />
              <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Firma
              </span>
            </div>
            <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Status / Lifecycle
            </div>
            <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Branche
            </div>
            <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Umsatz / Mitarbeiter
            </div>
            <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Standort
            </div>
            <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right pr-14">
              Kontakt
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
                    onChange={(checked) => onSelectOne(company.id!, checked)}
                  />
                  <div className="ml-4 min-w-0 flex-1">
                    <button
                      onClick={() => onView(company)}
                      className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                    >
                      {company.name}
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color="zinc" className="text-xs whitespace-nowrap">
                        {companyTypeLabels[company.type]}
                      </Badge>
                      {company.tradingName && company.tradingName !== company.name && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          dba {company.tradingName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Lifecycle */}
                <div className="w-[15%] space-y-1">
                  {company.status && (
                    <Badge color={getStatusColor(company.status)} className="text-xs whitespace-nowrap">
                      {COMPANY_STATUS_OPTIONS.find(opt => opt.value === company.status)?.label}
                    </Badge>
                  )}
                  {company.lifecycleStage && (
                    <Badge color="blue" className="text-xs whitespace-nowrap">
                      {LIFECYCLE_STAGE_OPTIONS.find(opt => opt.value === company.lifecycleStage)?.label}
                    </Badge>
                  )}
                </div>

                {/* Industry */}
                <div className="w-[15%] text-sm text-zinc-500 dark:text-zinc-400">
                  {company.industryClassification?.primary || '—'}
                </div>

                {/* Financial */}
                <div className="w-[15%] space-y-1">
                  {company.financial?.annualRevenue && (
                    <div className="flex items-center gap-1 text-sm">
                      <CurrencyEuroIcon className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium">{formatRevenue(company)}</span>
                    </div>
                  )}
                  {company.financial?.employees && (
                    <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <UsersIcon className="h-4 w-4 text-zinc-400" />
                      <span>{company.financial.employees.toLocaleString('de-DE')}</span>
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="w-[20%]">
                  {company.mainAddress && (
                    <div className="flex items-start gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <MapPinIcon className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div>{company.mainAddress.city}</div>
                        <div className="text-xs">{company.mainAddress.countryCode}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="flex items-center gap-4 flex-1 justify-end pr-14 text-sm">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-primary dark:text-zinc-400"
                      title="Website"
                    >
                      <GlobeAltIcon className="h-4 w-4" />
                    </a>
                  )}
                  {getPrimaryEmail(company) && (
                    <a
                      href={`mailto:${getPrimaryEmail(company)}`}
                      className="text-zinc-500 hover:text-primary dark:text-zinc-400"
                      title="E-Mail"
                    >
                      <EnvelopeIcon className="h-4 w-4" />
                    </a>
                  )}
                  {getPrimaryPhone(company) && (
                    <a
                      href={`tel:${getPrimaryPhone(company)}`}
                      className="text-zinc-500 hover:text-primary dark:text-zinc-400"
                      title="Telefon"
                    >
                      <PhoneIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-4">
                  <Dropdown>
                    <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                      <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => onView(company)}>
                        Anzeigen
                      </DropdownItem>
                      <DropdownItem onClick={() => onEdit(company)}>
                        Bearbeiten
                      </DropdownItem>
                      <DropdownDivider />
                      <DropdownItem onClick={() => onDelete(company)}>
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
    );
  }

  // Compact view (default)
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center">
          <div className="flex items-center w-[30%]">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onSelectAll}
            />
            <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Firma
            </span>
          </div>
          <div className="hidden md:block w-[30%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Branche
          </div>
          <div className="hidden lg:block w-[30%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Tags
          </div>
          <div className="hidden xl:block flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right pr-14">
            Kontakt
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {companies.map((company) => (
          <div key={company.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center">
              <div className="flex items-center w-[30%]">
                <Checkbox
                  checked={selectedIds.has(company.id!)}
                  onChange={(checked) => onSelectOne(company.id!, checked)}
                />
                <div className="ml-4 min-w-0 flex-1">
                  <button
                    onClick={() => onView(company)}
                    className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                  >
                    {company.name}
                  </button>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {companyTypeLabels[company.type]}
                  </div>
                </div>
              </div>
              
              <div className="hidden md:block w-[30%] text-sm text-zinc-500 dark:text-zinc-400">
                {company.industryClassification?.primary || '—'}
              </div>
              
              <div className="hidden lg:block w-[30%]">
                {company.tagIds && company.tagIds.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {company.tagIds.slice(0, 2).map(tagId => {
                      const tag = tags.get(tagId);
                      return tag ? (
                        <Badge key={tagId} color={tag.color as any} className="text-xs">
                          {tag.name}
                        </Badge>
                      ) : null;
                    })}
                    {company.tagIds.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                        +{company.tagIds.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="hidden xl:flex items-center gap-4 flex-1 justify-end pr-14 text-sm">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-primary dark:text-zinc-400">
                    <GlobeAltIcon className="h-4 w-4" />
                  </a>
                )}
                {getPrimaryPhone(company) && (
                  <a href={`tel:${getPrimaryPhone(company)}`} className="text-zinc-500 hover:text-primary dark:text-zinc-400">
                    <PhoneIcon className="h-4 w-4" />
                  </a>
                )}
                {!company.website && !getPrimaryPhone(company) && (
                  <span className="text-zinc-400">—</span>
                )}
              </div>
              
              <div className="ml-4">
                <Dropdown>
                  <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                    <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end">
                    <DropdownItem onClick={() => onView(company)}>
                      Anzeigen
                    </DropdownItem>
                    <DropdownItem onClick={() => onEdit(company)}>
                      Bearbeiten
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onClick={() => onDelete(company)}>
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
  );
}
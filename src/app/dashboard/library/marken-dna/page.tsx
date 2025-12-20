// src/app/dashboard/library/marken-dna/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useCompanies } from '@/lib/hooks/useCRMData';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';
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
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Daten laden
  const { data: companies = [], isLoading } = useCompanies(currentOrganization?.id);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete'>('all');

  // Nur Kunden filtern (type: 'customer')
  const customers = useMemo(() => {
    return companies.filter(company => company.type === 'customer');
  }, [companies]);

  // Filter & Search
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search-Match
      const searchMatch = customer.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      // Status-Filter
      // TODO: Status-Berechnung aus Marken-DNA Dokumenten
      // Für jetzt: Alle anzeigen
      if (filterStatus === 'complete') {
        // return customer.markenDNAComplete === true;
        return false; // Placeholder
      }
      if (filterStatus === 'incomplete') {
        // return customer.markenDNAComplete === false;
        return true; // Placeholder
      }

      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [customers, searchTerm, filterStatus]);

  if (isLoading) {
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
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-zinc-900">Marken DNA</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Strategische Positionierung Ihrer Kunden
        </p>
      </div>

      {/* 2. Toolbar */}
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
            placeholder="Kunden durchsuchen..."
            className={clsx(
              'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
              'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'h-10'
            )}
          />
        </div>

        {/* Filter Button */}
        <button
          className={clsx(
            'inline-flex items-center justify-center rounded-lg',
            'border border-zinc-300 bg-white text-zinc-700',
            'hover:bg-zinc-50 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'h-10 w-10 p-2.5'
          )}
          aria-label="Filter"
        >
          <FunnelIcon className="h-5 w-5 stroke-2" />
        </button>
      </div>

      {/* 3. Results Info */}
      <div className="flex items-center justify-between">
        <Text className="text-sm text-zinc-600">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Kunde' : 'Kunden'} gefunden
        </Text>
      </div>

      {/* 4. Table Placeholder */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center">
            <div className="w-[40%]">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Kunde
              </span>
            </div>
            <div className="w-[30%]">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </span>
            </div>
            <div className="w-[20%]">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Aktualisiert
              </span>
            </div>
            <div className="w-[10%] flex justify-end">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Aktionen
              </span>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-zinc-200">
          {filteredCustomers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">Keine Kunden gefunden</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="px-6 py-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center">
                  {/* Kunde */}
                  <div className="w-[40%]">
                    <button className="text-sm font-semibold text-zinc-900 hover:text-primary truncate">
                      {customer.name}
                    </button>
                    {customer.industryClassification?.primary && (
                      <div className="text-xs text-zinc-500 mt-1">
                        {customer.industryClassification.primary}
                      </div>
                    )}
                  </div>

                  {/* Status - Placeholder */}
                  <div className="w-[30%]">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {/* Placeholder: 6 Kreise für die 6 Dokumente */}
                        <div className="h-3 w-3 rounded-full bg-zinc-300" title="Briefing-Check" />
                        <div className="h-3 w-3 rounded-full bg-zinc-300" title="SWOT-Analyse" />
                        <div className="h-3 w-3 rounded-full bg-zinc-300" title="Zielgruppen-Radar" />
                        <div className="h-3 w-3 rounded-full bg-zinc-300" title="Positionierungs-Designer" />
                        <div className="h-3 w-3 rounded-full bg-zinc-300" title="Ziele-Setzer" />
                        <div className="h-3 w-3 rounded-full bg-zinc-300" title="Botschaften-Baukasten" />
                      </div>
                      <span className="ml-2 text-xs text-zinc-500">0%</span>
                    </div>
                  </div>

                  {/* Aktualisiert - Placeholder */}
                  <div className="w-[20%]">
                    <span className="text-sm text-zinc-600">-</span>
                  </div>

                  {/* Aktionen - Placeholder */}
                  <div className="w-[10%] flex justify-end">
                    <button
                      className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
                      aria-label="Aktionen"
                    >
                      <svg
                        className="h-4 w-4 text-zinc-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// src/components/pr/CustomerSelector.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Field, Label, Description } from '@/components/fieldset';
import { Button } from '@/components/button';
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { 
  BuildingOfficeIcon, 
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ChevronUpDownIcon
} from '@heroicons/react/20/solid';
import { Combobox } from '@headlessui/react';
import clsx from 'clsx';

interface CustomerSelectorProps {
  value: string;
  onChange: (companyId: string, companyName: string) => void;
  required?: boolean;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

interface CompanyOption {
  id: string;
  name: string;
  industry?: string;
  website?: string;
}

export function CustomerSelector({
  value,
  onChange,
  required = false,
  label = "Kunde",
  description,
  error,
  disabled = false,
  className
}: CustomerSelectorProps) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);

  // Load companies - SIMPLIFIED VERSION using userId directly
  useEffect(() => {
    let mounted = true;

    const loadCompanies = async () => {
      if (!user?.uid) {
        console.log('CustomerSelector: No user available');
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      console.log('CustomerSelector: Loading companies for user:', user.uid);
      
      try {
        // Verwende companiesEnhancedService genau wie in der CRM-Seite
        const companiesData = await companiesEnhancedService.getAll(user.uid);
        console.log('CustomerSelector: Loaded companies:', companiesData.length);
        
        // Debug: Log die ersten Companies
        if (companiesData.length > 0) {
          console.log('CustomerSelector: First company:', companiesData[0]);
        }
        
        if (mounted) {
          // Wenn keine Companies vorhanden sind, zeige Test-Company
          if (companiesData.length === 0) {
            console.log('CustomerSelector: No companies found, showing placeholder');
            setCompanies([{
              id: 'temp-no-company',
              name: '⚠️ Keine Kunden vorhanden - Bitte erst anlegen',
              industry: 'Bitte Kunden anlegen',
              website: undefined,
            }]);
            setInternalError('Keine Kunden gefunden. Bitte legen Sie zuerst einen Kunden an.');
          } else {
            setCompanies(companiesData.map(company => ({
              id: company.id!,
              name: company.name,
              industry: company.industryClassification?.primary || undefined,
              website: company.website || undefined,
            })));
            setInternalError(null);
          }
        }
      } catch (error) {
        console.error('CustomerSelector: Error loading companies:', error);
        if (mounted) {
          setInternalError('Fehler beim Laden der Kunden');
          setCompanies([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCompanies();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Get selected company
  const selectedCompany = useMemo(() => 
    companies.find(company => company.id === value),
    [companies, value]
  );

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    
    const query = searchQuery.toLowerCase();
    return companies.filter(company => 
      company.name.toLowerCase().includes(query) ||
      company.industry?.toLowerCase().includes(query)
    );
  }, [companies, searchQuery]);

  const displayError = error || internalError;

  return (
    <Field className={className}>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {description && <Description>{description}</Description>}
      
      <div className="mt-2">
        <Combobox
          value={value}
          onChange={(companyId: string) => {
            const company = companies.find(c => c.id === companyId);
            if (company) {
              onChange(company.id, company.name);
            }
          }}
          disabled={disabled || loading}
        >
          <div className="relative">
            <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <Combobox.Input
                className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                displayValue={(companyId: string) => {
                  const company = companies.find(c => c.id === companyId);
                  return company?.name || '';
                }}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={loading ? "Lade Kunden..." : "Kunde auswählen..."}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </Combobox.Button>
            </div>
            
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {/* Link to create new company */}
              <div className="border-b border-gray-200 p-3">
                <a
                  href="/dashboard/contacts/crm/companies/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-[#005fab] hover:text-[#004a8c]"
                >
                  <PlusIcon className="h-4 w-4" />
                  Neuen Kunden anlegen
                </a>
              </div>
              
              {loading ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Lade Kunden...
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="relative cursor-default select-none py-4 px-4 text-center">
                  <BuildingOfficeIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-700 font-medium">Keine Kunden gefunden</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Bitte legen Sie zuerst einen Kunden an
                  </p>
                </div>
              ) : (
                filteredCompanies.map((company) => {
                  // Skip placeholder company
                  if (company.id === 'temp-no-company') {
                    return (
                      <div key={company.id} className="relative cursor-default select-none py-4 px-4 text-center bg-yellow-50">
                        <p className="text-yellow-800 font-medium">{company.name}</p>
                      </div>
                    );
                  }
                  
                  return (
                    <Combobox.Option
                    key={company.id}
                    value={company.id}
                    className={({ active }) =>
                      clsx(
                        'relative cursor-pointer select-none py-2 pl-3 pr-9',
                        active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                      )
                    }
                  >
                    {({ active, selected }) => (
                      <>
                        <div className="flex items-center">
                          <BuildingOfficeIcon className={clsx(
                            'h-5 w-5 mr-3',
                            active ? 'text-white' : 'text-gray-400'
                          )} />
                          <div>
                            <span className={clsx(
                              'block truncate',
                              selected && 'font-semibold'
                            )}>
                              {company.name}
                            </span>
                            {company.industry && (
                              <span className={clsx(
                                'block truncate text-sm',
                                active ? 'text-indigo-200' : 'text-gray-500'
                              )}>
                                {company.industry}
                              </span>
                            )}
                          </div>
                        </div>
                        {selected && (
                          <span className={clsx(
                            'absolute inset-y-0 right-0 flex items-center pr-4',
                            active ? 'text-white' : 'text-indigo-600'
                          )}>
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                  );
                })
              )}
            </Combobox.Options>
          </div>
        </Combobox>
      </div>
      
      {displayError && (
        <p className="mt-2 text-sm text-red-600">{displayError}</p>
      )}
    </Field>
  );
}
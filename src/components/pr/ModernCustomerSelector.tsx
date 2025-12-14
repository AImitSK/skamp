// src/components/pr/ModernCustomerSelector.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import CompanyModal from '@/app/dashboard/contacts/crm/CompanyModal';
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ChevronDownIcon
} from '@heroicons/react/20/solid';

interface ModernCustomerSelectorProps {
  value: string;
  onChange: (companyId: string, companyName: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface CompanyOption {
  id: string;
  name: string;
  industry?: string;
  website?: string;
}

export function ModernCustomerSelector({
  value,
  onChange,
  required = false,
  disabled = false,
  className
}: ModernCustomerSelectorProps) {
  const t = useTranslations('pr.modernCustomerSelector');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load companies
  const loadCompanies = async () => {
    if (!user?.uid || !currentOrganization) {
      setLoading(false);
      return;
    }
    
    try {
      const companiesData = await companiesEnhancedService.getAll(currentOrganization.id);
      
      if (companiesData.length === 0) {
        setCompanies([]);
        setError(t('errors.noCustomersFound'));
      } else {
        setCompanies(companiesData.map(company => ({
          id: company.id!,
          name: company.name,
          industry: company.industryClassification?.primary || undefined,
          website: company.website || undefined,
        })));
        setError(null);
      }
    } catch (error) {
      console.error('CustomerSelector: Error loading companies:', error);
      setError(t('errors.loadError'));
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [user, currentOrganization]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get selected company
  const selectedCompany = companies.find(company => company.id === value);

  // Filter companies based on search
  const filteredCompanies = searchQuery
    ? companies.filter(company => 
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : companies;

  const handleSelect = (company: CompanyOption) => {
    onChange(company.id, company.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCompanyCreated = () => {
    setShowCompanyModal(false);
    loadCompanies(); // Reload companies after creation
  };

  const handleNewCompanyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCompanyModal(true);
    setIsOpen(false);
  };

  const handleInputClick = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCompanies.length === 1) {
        handleSelect(filteredCompanies[0]);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Field */}
      <div 
        className={`relative w-full cursor-pointer rounded-md border bg-white px-3 py-2 text-left shadow-sm transition-colors ${
          disabled || loading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isOpen
            ? 'border-[#005fab] ring-1 ring-[#005fab]'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={handleInputClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            {isOpen ? (
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('placeholder.search')}
                className="flex-1 border-none outline-none bg-transparent text-sm"
                disabled={disabled || loading}
              />
            ) : (
              <span className="block truncate text-sm text-gray-900">
                {loading
                  ? t('loading')
                  : selectedCompany
                    ? selectedCompany.name
                    : t('placeholder.select')
                }
              </span>
            )}
          </div>
          <ChevronDownIcon 
            className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-md bg-white border border-gray-200 shadow-lg">
          {/* Header with "New Customer" button */}
          <div className="border-b border-gray-100 p-3">
            <button
              type="button"
              onClick={handleNewCompanyClick}
              className="flex items-center gap-2 text-sm font-medium text-[#005fab] hover:text-[#004a8c] transition-colors w-full text-left"
            >
              <PlusIcon className="h-4 w-4" />
              {t('createNew')}
            </button>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCompanies.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <BuildingOfficeIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium mb-1">
                  {searchQuery ? t('emptyState.noResults') : t('emptyState.noCustomers')}
                </p>
                <p className="text-xs text-gray-500">
                  {searchQuery ? t('emptyState.tryDifferentSearch') : t('emptyState.createFirst')}
                </p>
              </div>
            ) : (
              filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelect(company)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                    company.id === value ? 'bg-[#005fab]/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {company.name}
                        </p>
                        {company.industry && (
                          <p className="text-xs text-gray-500 truncate">
                            {company.industry}
                          </p>
                        )}
                      </div>
                    </div>
                    {company.id === value && (
                      <CheckIcon className="h-4 w-4 text-[#005fab] flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* Required Indicator */}
      {required && !selectedCompany && (
        <p className="mt-1 text-xs text-gray-500">
          {t('requiredField')}
        </p>
      )}
      
      {/* Company Modal */}
      {showCompanyModal && user && currentOrganization && (
        <CompanyModal
          company={null}
          onClose={() => setShowCompanyModal(false)}
          onSave={handleCompanyCreated}
          userId={user.uid}
          organizationId={currentOrganization.id}
        />
      )}
    </div>
  );
}
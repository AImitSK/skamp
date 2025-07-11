// src/components/pr/CustomerSelector.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCrmData } from '@/context/CrmDataContext';
import { Field, Label, Description } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  MagnifyingGlassIcon, 
  BuildingOfficeIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface CustomerSelectorProps {
  value: string;
  onChange: (customerId: string, customerName: string) => void;
  required?: boolean;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  
  // Erweiterte Features
  showStats?: boolean; // Zeige Medien-Statistiken
  showQuickAdd?: boolean; // Quick-Add Button
  filterByHasMedia?: boolean; // Nur Kunden mit Medien
}

export function CustomerSelector({
  value,
  onChange,
  required = true,
  label = "Kunde auswählen",
  description,
  placeholder = "Kunde wählen...",
  className,
  error,
  disabled = false,
  showStats = true,
  showQuickAdd = true,
  filterByHasMedia = false
}: CustomerSelectorProps) {
  const { companies, loading: loadingCompanies } = useCrmData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Selected company info
  const selectedCompany = useMemo(() => 
    companies.find(c => c.id === value),
    [companies, value]
  );

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    let filtered = companies;
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(search) ||
        company.industry?.toLowerCase().includes(search) ||
        company.website?.toLowerCase().includes(search)
      );
    }
    
    // Media filter
    if (filterByHasMedia) {
      // TODO: Implement when media stats are available
      // filtered = filtered.filter(company => company.mediaCount > 0);
    }
    
    // Sort alphabetically
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, searchTerm, filterByHasMedia]);

  // Handle selection
  const handleSelect = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      onChange(companyId, company.name);
      setShowDropdown(false);
      setSearchTerm('');
    }
  };

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!showDropdown) {
      setSearchTerm('');
    }
  }, [showDropdown]);

  // Quick Add Handler (Placeholder)
  const handleQuickAdd = () => {
    // TODO: Implement Quick Add Modal
    alert('Quick Add Kunde - Feature kommt bald!');
  };

  // Render loading state
  if (loadingCompanies) {
    return (
      <Field className={className}>
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-md"></div>
        </div>
      </Field>
    );
  }

  return (
    <Field className={className}>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {description && (
        <Description>{description}</Description>
      )}

      {/* Custom Dropdown Implementation */}
      <div className="relative mt-2">
        {/* Selected Value Display */}
        <button
          type="button"
          onClick={() => !disabled && setShowDropdown(!showDropdown)}
          disabled={disabled}
          className={clsx(
            "w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
            error ? "border-red-300" : "border-gray-300",
            disabled && "bg-gray-100 cursor-not-allowed",
            !disabled && "cursor-pointer hover:border-gray-400"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
              {selectedCompany ? (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {selectedCompany.name}
                  </div>
                  {selectedCompany.industry && (
                    <div className="text-xs text-gray-500 truncate">
                      {selectedCompany.industry}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </div>
            {value && (
              <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
            )}
          </div>
        </button>

        {/* Dropdown Panel */}
        {showDropdown && !disabled && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown Content */}
            <div className="absolute z-20 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-hidden">
              {/* Search Input */}
              <div className="p-2 border-b">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Kunde suchen..."
                    className="pl-9 pr-3 py-2"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Add Button */}
              {showQuickAdd && (
                <div className="p-2 border-b">
                  <Button
                    type="button"
                    onClick={handleQuickAdd}
                    plain
                    className="w-full justify-center text-indigo-600 hover:bg-indigo-50"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Neuen Kunden anlegen
                  </Button>
                </div>
              )}

              {/* Company List */}
              <div className="max-h-64 overflow-y-auto">
                {filteredCompanies.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm ? 'Keine Kunden gefunden' : 'Keine Kunden vorhanden'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredCompanies.map((company) => {
                      const isSelected = company.id === value;
                      
                      return (
                        <li key={company.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(company.id!)}
                            className={clsx(
                              "w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                              isSelected && "bg-indigo-50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className={clsx(
                                  "font-medium truncate",
                                  isSelected ? "text-indigo-900" : "text-gray-900"
                                )}>
                                  {company.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {company.industry && (
                                    <span className="text-xs text-gray-500">
                                      {company.industry}
                                    </span>
                                  )}
                                  {company.type && (
                                    <Badge 
                                      color="blue"
                                      className="text-xs"
                                    >
                                      {company.type}
                                    </Badge>
                                  )}
                                  {showStats && (
                                    <>
                                      {/* TODO: Add media count when available */}
                                      {/* <span className="text-xs text-gray-400">
                                        {company.mediaCount || 0} Medien
                                      </span> */}
                                    </>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircleIcon className="h-5 w-5 text-indigo-600 ml-2 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Stats Footer */}
              {showStats && filteredCompanies.length > 0 && (
                <div className="p-2 border-t bg-gray-50 text-xs text-gray-500">
                  {filteredCompanies.length} von {companies.length} Kunden
                  {searchTerm && ` • Suche: "${searchTerm}"`}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {/* Selected Company Info */}
      {selectedCompany && showStats && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{selectedCompany.name}</p>
              {/* TODO: Add contact count when available */}
              {/* <p className="text-gray-600 mt-1">
                X Kontakte
              </p> */}
              {/* TODO: Add media stats */}
              {/* <p className="text-gray-600">
                {selectedCompany.mediaCount || 0} Medien • 
                {selectedCompany.folderCount || 0} Ordner
              </p> */}
            </div>
            <div className="ml-4">
              <Button
                type="button"
                plain
                onClick={() => {
                  // TODO: Navigate to customer media
                  window.location.href = `/dashboard/pr-tools/media-library?clientId=${selectedCompany.id}`;
                }}
                className="text-xs text-indigo-600 hover:text-indigo-500"
              >
                Medien verwalten →
              </Button>
            </div>
          </div>
        </div>
      )}
    </Field>
  );
}

// === ZUSÄTZLICHE KOMPONENTEN ===

/**
 * Kompakte Version für Inline-Nutzung
 */
export function CompactCustomerSelector({
  value,
  onChange,
  className
}: {
  value: string;
  onChange: (customerId: string, customerName: string) => void;
  className?: string;
}) {
  const { companies } = useCrmData();
  
  const sortedCompanies = useMemo(() => 
    [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId) {
      const company = companies.find(c => c.id === selectedId);
      if (company) {
        onChange(company.id!, company.name);
      }
    } else {
      onChange('', '');
    }
  }, [companies, onChange]);
  
  return (
    <Select
      value={value}
      onChange={handleChange}
      className={className}
    >
      <option value="">-- Alle Kunden --</option>
      {sortedCompanies.map(company => (
        <option key={company.id} value={company.id!}>
          {company.name}
        </option>
      ))}
    </Select>
  );
}

/**
 * Customer Badge für Anzeige
 */
export function CustomerBadge({
  customerId,
  customerName,
  showIcon = true,
  className
}: {
  customerId: string;
  customerName?: string;
  showIcon?: boolean;
  className?: string;
}) {
  const { companies } = useCrmData();
  
  const company = customerName 
    ? { name: customerName } 
    : companies.find(c => c.id === customerId);
  
  if (!company) return null;
  
  return (
    <Badge color="blue" className={clsx("inline-flex items-center", className)}>
      {showIcon && <BuildingOfficeIcon className="h-3 w-3 mr-1" />}
      {company.name}
    </Badge>
  );
}
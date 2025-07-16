// src/app/dashboard/contacts/crm/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { SearchInput } from "@/components/search-input";
import { SearchableFilter } from "@/components/searchable-filter";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
import { Popover, Transition } from '@headlessui/react';
import * as Headless from '@headlessui/react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BuildingOfficeIcon,
  UserIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon
} from "@heroicons/react/20/solid";
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Company, Contact, Tag, companyTypeLabels, CompanyType } from "@/types/crm";
import CompanyModal from "./CompanyModal";
import ContactModal from "./ContactModal";
import ImportModal from "./ImportModal";
import Papa from 'papaparse';
import clsx from 'clsx';

type TabType = 'companies' | 'contacts';
type ViewMode = 'grid' | 'list';

// ViewToggle Component
function ViewToggle({ value, onChange, className }: { value: ViewMode; onChange: (value: ViewMode) => void; className?: string }) {
  return (
    <div className={clsx('inline-flex rounded-lg border border-zinc-300 dark:border-zinc-600', className)}>
      <button
        onClick={() => onChange('list')}
        className={clsx(
          'flex items-center justify-center p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-l-lg',
          value === 'list'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="List view"
      >
        <ListBulletIcon className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => onChange('grid')}
        className={clsx(
          'flex items-center justify-center p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-r-lg border-l border-zinc-300 dark:border-zinc-600',
          value === 'grid'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="Grid view"
      >
        <Squares2X2Icon className="h-5 w-5" />
      </button>
    </div>
  );
}

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message, 
  action 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>{message}</Text>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  const initialTab = searchParams.get('tab') === 'contacts' ? 'contacts' : 'companies';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filter States
  const [selectedTypes, setSelectedTypes] = useState<CompanyType[]>([]);
  const [selectedCompanyTagIds, setSelectedCompanyTagIds] = useState<string[]>([]);
  const [selectedContactCompanyIds, setSelectedContactCompanyIds] = useState<string[]>([]);
  const [selectedContactTagIds, setSelectedContactTagIds] = useState<string[]>([]);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Tab Change Handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchTerm('');
    setCurrentPage(1);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', tab);
    window.history.pushState({}, '', newUrl);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesService.getAll(user.uid),
        contactsService.getAll(user.uid),
        tagsService.getAll(user.uid)
      ]);
      setCompanies(companiesData);
      setContacts(contactsData);
      setTags(tagsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Memoized Filter Options
  const tagOptions = useMemo(() => {
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const companyOptions = useMemo(() => {
    return companies
      .map(c => ({ value: c.id!, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies]);

  // Filtered Data
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const searchMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          company.industry?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;
      
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(company.type);
      if (!typeMatch) return false;
        
      const tagMatch = selectedCompanyTagIds.length === 0 || 
                       company.tagIds?.some(tagId => selectedCompanyTagIds.includes(tagId));
      if (!tagMatch) return false;

      return true;
    });
  }, [companies, searchTerm, selectedTypes, selectedCompanyTagIds]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const searchMatch = `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      const companyMatch = selectedContactCompanyIds.length === 0 || 
                           (contact.companyId && selectedContactCompanyIds.includes(contact.companyId));
      if (!companyMatch) return false;
      
      const tagMatch = selectedContactTagIds.length === 0 || 
                       contact.tagIds?.some(tagId => selectedContactTagIds.includes(tagId));
      if (!tagMatch) return false;

      return true;
    });
  }, [contacts, searchTerm, selectedContactCompanyIds, selectedContactTagIds]);

  // Paginated Data
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  // Selection Handlers
  const handleSelectAllCompanies = (checked: boolean) => {
    if (checked) {
      setSelectedCompanyIds(new Set(paginatedCompanies.map(c => c.id!)));
    } else {
      setSelectedCompanyIds(new Set());
    }
  };

  const handleSelectAllContacts = (checked: boolean) => {
    if (checked) {
      setSelectedContactIds(new Set(paginatedContacts.map(c => c.id!)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const count = activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size;
    if (count === 0) return;
    const type = activeTab === 'companies' ? 'Firmen' : 'Kontakte';
    
    setConfirmDialog({
      isOpen: true,
      title: `${count} ${type} löschen`,
      message: `Möchten Sie wirklich ${count} ${type} unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        const ids = activeTab === 'companies' ? Array.from(selectedCompanyIds) : Array.from(selectedContactIds);
        const service = activeTab === 'companies' ? companiesService : contactsService;
        
        try {
          await Promise.all(ids.map(id => service.delete(id)));
          showAlert('success', `${count} ${type} gelöscht`);
          await loadData();
          if (activeTab === 'companies') {
            setSelectedCompanyIds(new Set());
          } else {
            setSelectedContactIds(new Set());
          }
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Delete Individual Item
  const handleDelete = async (id: string, name: string, type: 'company' | 'contact') => {
    setConfirmDialog({
      isOpen: true,
      title: `${type === 'company' ? 'Firma' : 'Kontakt'} löschen`,
      message: `Möchten Sie "${name}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const service = type === 'company' ? companiesService : contactsService;
          await service.delete(id);
          showAlert('success', `${name} wurde gelöscht`);
          await loadData();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen');
        }
      }
    });
  };

  // Export Function
  const handleExport = () => {
    const data = activeTab === 'companies' ? filteredCompanies : filteredContacts;
    const filename = activeTab === 'companies' ? 'firmen-export.csv' : 'kontakte-export.csv';

    if (data.length === 0) {
      showAlert('warning', 'Keine Daten zum Exportieren');
      return;
    }

    try {
      let csv;
      if (activeTab === 'companies') {
        const companyData = (data as Company[]).map(company => ({
          "Firmenname": company.name,
          "Typ": companyTypeLabels[company.type],
          "Branche": company.industry || '',
          "Website": company.website || '',
          "Telefon": company.phone || '',
        }));
        csv = Papa.unparse(companyData);
      } else {
        const contactData = (data as Contact[]).map(contact => ({
          "Vorname": contact.firstName,
          "Nachname": contact.lastName,
          "Firma": contact.companyName || '',
          "Position": contact.position || '',
          "E-Mail": contact.email || '',
          "Telefon": contact.phone || '',
        }));
        csv = Papa.unparse(contactData);
      }
      
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showAlert('success', 'Export erfolgreich');
    } catch (error) {
      showAlert('error', 'Export fehlgeschlagen');
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

  const totalPages = activeTab === 'companies' 
    ? Math.ceil(filteredCompanies.length / itemsPerPage)
    : Math.ceil(filteredContacts.length / itemsPerPage);

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Heading level={1}>Kontakte</Heading>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-0 border-zinc-200 dark:border-zinc-700">
          <nav aria-label="Tabs" className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('companies')}
              className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'companies'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              <BuildingOfficeIcon
                className={`mr-2 -ml-0.5 size-5 ${
                  activeTab === 'companies' ? 'text-primary' : 'text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400'
                }`}
              />
              <span>Firmen ({companies.length})</span>
            </button>
            <button
              onClick={() => handleTabChange('contacts')}
              className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'contacts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              <UserIcon
                className={`mr-2 -ml-0.5 size-5 ${
                  activeTab === 'contacts' ? 'text-primary' : 'text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400'
                }`}
              />
              <span>Personen ({contacts.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`${activeTab === 'companies' ? 'Firmen' : 'Personen'} durchsuchen...`}
            className="flex-1"
          />

          {/* Filter Button - nur Icon */}
          <Popover className="relative">
            {({ open }) => {
              const activeFiltersCount = activeTab === 'companies'
                ? (selectedTypes.length + selectedCompanyTagIds.length)
                : (selectedContactCompanyIds.length + selectedContactTagIds.length);
              
              const filters: Array<{
                id: string;
                label: string;
                type: 'select' | 'multiselect';
                options: { value: string; label: string }[];
              }> = activeTab === 'companies'
                ? [
                    {
                      id: 'types',
                      label: 'Typ',
                      type: 'multiselect' as const,
                      options: Object.entries(companyTypeLabels).map(([value, label]) => ({ value, label }))
                    },
                    {
                      id: 'tags',
                      label: 'Tags',
                      type: 'multiselect' as const,
                      options: tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))
                    }
                  ]
                : [
                    {
                      id: 'companies',
                      label: 'Firma',
                      type: 'multiselect' as const,
                      options: companyOptions
                    },
                    {
                      id: 'tags',
                      label: 'Tags',
                      type: 'multiselect' as const,
                      options: tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))
                    }
                  ];
              
              const values: Record<string, string | string[]> = activeTab === 'companies'
                ? { types: selectedTypes, tags: selectedCompanyTagIds }
                : { companies: selectedContactCompanyIds, tags: selectedContactTagIds };
              
              const onChange = (filterId: string, value: string | string[]) => {
                if (activeTab === 'companies') {
                  if (filterId === 'types') setSelectedTypes(value as CompanyType[]);
                  if (filterId === 'tags') setSelectedCompanyTagIds(value as string[]);
                } else {
                  if (filterId === 'companies') setSelectedContactCompanyIds(value as string[]);
                  if (filterId === 'tags') setSelectedContactTagIds(value as string[]);
                }
              };
              
              const onReset = () => {
                if (activeTab === 'companies') {
                  setSelectedTypes([]);
                  setSelectedCompanyTagIds([]);
                } else {
                  setSelectedContactCompanyIds([]);
                  setSelectedContactTagIds([]);
                }
              };
              
              return (
                <>
                  <Popover.Button
                    className={clsx(
                      'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10',
                      activeFiltersCount > 0
                        ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    )}
                    aria-label="Filter"
                  >
                    <FunnelIcon className="h-5 w-5" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Popover.Button>
                  
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                  >
                    <Popover.Panel className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Filter</h3>
                          {activeFiltersCount > 0 && (
                            <button
                              onClick={onReset}
                              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                              Zurücksetzen
                            </button>
                          )}
                        </div>

                        {filters.map((filter) => (
                          <div key={filter.id}>
                            {filter.type === 'multiselect' && filter.options.length > 10 ? (
                              // Use SearchableFilter for large datasets
                              <SearchableFilter
                                label={filter.label}
                                options={filter.options}
                                selectedValues={Array.isArray(values[filter.id as keyof typeof values]) ? values[filter.id as keyof typeof values] as string[] : []}
                                onChange={(newValues) => onChange(filter.id, newValues)}
                                placeholder={`${filter.label} suchen...`}
                              />
                            ) : (
                              // Keep existing UI for small datasets
                              <>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                  {filter.label}
                                </label>
                                {filter.type === 'multiselect' ? (
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {filter.options.map((option) => {
                                      const currentValues = values[filter.id as keyof typeof values];
                                      const currentValuesArray = Array.isArray(currentValues) ? currentValues : [];
                                      const isChecked = currentValuesArray.includes(option.value);
                                      
                                      return (
                                        <label
                                          key={option.value}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const newValues = e.target.checked
                                                ? [...currentValuesArray, option.value]
                                                : currentValuesArray.filter(v => v !== option.value);
                                              onChange(filter.id, newValues);
                                            }}
                                            className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                                          />
                                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                            {option.label}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <select
                                    value={(values[filter.id as keyof typeof values] as string) || ''}
                                    onChange={(e) => onChange(filter.id, e.target.value)}
                                    className="mt-1 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-700"
                                  >
                                    <option value="">Alle</option>
                                    {filter.options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </Popover.Panel>
                  </Transition>
                </>
              );
            }}
          </Popover>

          {/* View Toggle */}
          <ViewToggle value={viewMode} onChange={setViewMode} />

          {/* Add Button */}
          <Button 
            className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 h-10 px-6"
            onClick={() => {
              if (activeTab === 'companies') {
                setSelectedCompany(null);
                setShowCompanyModal(true);
              } else {
                setSelectedContact(null);
                setShowContactModal(true);
              }
            }}
          >
            {activeTab === 'companies' ? 'Firma hinzufügen' : 'Person hinzufügen'}
          </Button>

          {/* Actions Button - nur 3 Punkte */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center p-2 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <EllipsisVerticalIcon className="h-5 w-5" />
            </Popover.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                <div className="py-1">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    Import
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Export
                  </button>
                  {((activeTab === 'companies' && selectedCompanyIds.size > 0) || 
                    (activeTab === 'contacts' && selectedContactIds.size > 0)) && (
                    <>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-5 w-5" />
                        Auswahl löschen ({activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size})
                      </button>
                    </>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {activeTab === 'companies' 
            ? `${filteredCompanies.length} von ${companies.length} Firmen`
            : `${filteredContacts.length} von ${contacts.length} Kontakten`}
          {((activeTab === 'companies' && selectedCompanyIds.size > 0) || 
            (activeTab === 'contacts' && selectedContactIds.size > 0)) && (
            <span className="ml-2">
              • {activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size} ausgewählt
            </span>
          )}
        </Text>
        
        {/* Bulk Delete Link */}
        {((activeTab === 'companies' && selectedCompanyIds.size > 0) || 
          (activeTab === 'contacts' && selectedContactIds.size > 0)) && (
          <button
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            {activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size} Löschen
          </button>
        )}
      </div>

      {/* Modern Table/List View */}
      <div>
        {viewMode === 'list' ? (
          // Modern List View (Vercel-Style)
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="flex items-center w-[30%]">
                  <Checkbox
                    checked={activeTab === 'companies' 
                      ? paginatedCompanies.length > 0 && paginatedCompanies.every(c => selectedCompanyIds.has(c.id!))
                      : paginatedContacts.length > 0 && paginatedContacts.every(c => selectedContactIds.has(c.id!))
                    }
                    indeterminate={activeTab === 'companies'
                      ? paginatedCompanies.some(c => selectedCompanyIds.has(c.id!)) && !paginatedCompanies.every(c => selectedCompanyIds.has(c.id!))
                      : paginatedContacts.some(c => selectedContactIds.has(c.id!)) && !paginatedContacts.every(c => selectedContactIds.has(c.id!))
                    }
                    onChange={(checked: boolean) => activeTab === 'companies' ? handleSelectAllCompanies(checked) : handleSelectAllContacts(checked)}
                  />
                  <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {activeTab === 'companies' ? 'Firma' : 'Name'}
                  </span>
                </div>
                <div className="hidden md:block w-[30%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {activeTab === 'companies' ? 'Branche' : 'Position'}
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
              {activeTab === 'companies' ? (
                paginatedCompanies.map((company) => (
                  <div key={company.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      <div className="flex items-center w-[30%]">
                        <Checkbox
                          checked={selectedCompanyIds.has(company.id!)}
                          onChange={(checked: boolean) => {
                            const newIds = new Set(selectedCompanyIds);
                            if (checked) {
                              newIds.add(company.id!);
                            } else {
                              newIds.delete(company.id!);
                            }
                            setSelectedCompanyIds(newIds);
                          }}
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <Link href={`/dashboard/contacts/crm/companies/${company.id}`} className="text-xs font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block">
                            {company.name}
                          </Link>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {companyTypeLabels[company.type]}
                          </div>
                        </div>
                      </div>
                      
                      <div className="hidden md:block w-[30%] text-sm text-zinc-500 dark:text-zinc-400">
                        {company.industry || '—'}
                      </div>
                      
                      <div className="hidden lg:block w-[30%]">
                        {company.tagIds && company.tagIds.length > 0 ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {company.tagIds.slice(0, 2).map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              return tag ? (
                                <Badge key={tag.id} color={tag.color as any} className="text-xs">
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
                        ) : (
                          <span className="text-sm text-zinc-400">—</span>
                        )}
                      </div>
                      
                      <div className="hidden xl:flex items-center gap-4 flex-1 justify-end pr-14 text-sm">
                        {company.website && (
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-primary dark:text-zinc-400">
                            <GlobeAltIcon className="h-4 w-4" />
                          </a>
                        )}
                        {company.phone && (
                          <a href={`tel:${company.phone}`} className="text-zinc-500 hover:text-primary dark:text-zinc-400">
                            <PhoneIcon className="h-4 w-4" />
                          </a>
                        )}
                        {!company.website && !company.phone && (
                          <span className="text-zinc-400">—</span>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <Dropdown>
                          <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#0660ab] focus:ring-offset-2">
                            <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
                            <DropdownItem href={`/dashboard/contacts/crm/companies/${company.id}`}>
                              Anzeigen
                            </DropdownItem>
                            <DropdownItem 
                              onClick={() => {
                                setSelectedCompany(company);
                                setShowCompanyModal(true);
                              }}
                            >
                              Bearbeiten
                            </DropdownItem>
                            <DropdownDivider />
                            <DropdownItem 
                              onClick={() => handleDelete(company.id!, company.name, 'company')}
                            >
                              <span className="text-red-600">Löschen</span>
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                paginatedContacts.map((contact) => (
                  <div key={contact.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      <div className="flex items-center w-[30%]">
                        <Checkbox
                          checked={selectedContactIds.has(contact.id!)}
                          onChange={(checked: boolean) => {
                            const newIds = new Set(selectedContactIds);
                            if (checked) {
                              newIds.add(contact.id!);
                            } else {
                              newIds.delete(contact.id!);
                            }
                            setSelectedContactIds(newIds);
                          }}
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <Link href={`/dashboard/contacts/crm/contacts/${contact.id}`} className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block">
                            {contact.firstName} {contact.lastName}
                          </Link>
                          {contact.companyName && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                              <BuildingOfficeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{contact.companyName}</span>
                            </div>
                          )}
                          {!contact.companyName && (
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">—</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="hidden md:block w-[30%] text-sm text-zinc-500 dark:text-zinc-400">
                        {contact.position || '—'}
                      </div>
                      
                      <div className="hidden lg:block w-[30%]">
                        {contact.tagIds && contact.tagIds.length > 0 ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {contact.tagIds.slice(0, 2).map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              return tag ? (
                                <Badge key={tag.id} color={tag.color as any} className="text-xs">
                                  {tag.name}
                                </Badge>
                              ) : null;
                            })}
                            {contact.tagIds.length > 2 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                                +{contact.tagIds.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">—</span>
                        )}
                      </div>
                      
                      <div className="hidden xl:flex items-center gap-4 flex-1 justify-end pr-14 text-sm">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="text-zinc-500 hover:text-primary dark:text-zinc-400">
                            <EnvelopeIcon className="h-4 w-4" />
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-zinc-500 hover:text-primary dark:text-zinc-400">
                            <PhoneIcon className="h-4 w-4" />
                          </a>
                        )}
                        {!contact.email && !contact.phone && (
                          <span className="text-zinc-400">—</span>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <Dropdown>
                          <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#0660ab] focus:ring-offset-2">
                            <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
                            <DropdownItem href={`/dashboard/contacts/crm/contacts/${contact.id}`}>
                              Anzeigen
                            </DropdownItem>
                            <DropdownItem 
                              onClick={() => {
                                setSelectedContact(contact);
                                setShowContactModal(true);
                              }}
                            >
                              Bearbeiten
                            </DropdownItem>
                            <DropdownDivider />
                            <DropdownItem 
                              onClick={() => handleDelete(contact.id!, `${contact.firstName} ${contact.lastName}`, 'contact')}
                            >
                              <span className="text-red-600">Löschen</span>
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeTab === 'companies' ? (
              paginatedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="relative rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {/* Checkbox */}
                  <div className="absolute top-4 right-4">
                    <Checkbox
                      checked={selectedCompanyIds.has(company.id!)}
                      onChange={(checked: boolean) => {
                        const newIds = new Set(selectedCompanyIds);
                        if (checked) {
                          newIds.add(company.id!);
                        } else {
                          newIds.delete(company.id!);
                        }
                        setSelectedCompanyIds(newIds);
                      }}
                    />
                  </div>

                  {/* Company Info */}
                  <div className="pr-8">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      <Link href={`/dashboard/contacts/crm/companies/${company.id}`} className="hover:text-primary">
                        {company.name}
                      </Link>
                    </h3>
                    <div className="mt-2 space-y-2">
                      <Badge color="zinc">{companyTypeLabels[company.type]}</Badge>
                      {company.industry && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{company.industry}</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {company.tagIds && company.tagIds.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {company.tagIds.slice(0, 3).map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                      })}
                      {company.tagIds.length > 3 && (
                        <span className="text-xs text-zinc-400">+{company.tagIds.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-700">
                    <div className="flex gap-3">
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary-hover"
                        >
                          Website
                        </a>
                      )}
                      {company.phone && (
                        <a href={`tel:${company.phone}`} className="text-sm text-primary hover:text-primary-hover">
                          Anrufen
                        </a>
                      )}
                    </div>
                    <Dropdown>
                      <DropdownButton plain className="p-1 hover:bg-zinc-100 rounded dark:hover:bg-zinc-700">
                        <EllipsisVerticalIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem href={`/dashboard/contacts/crm/companies/${company.id}`}>
                          <EyeIcon />
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem onClick={() => {
                          setSelectedCompany(company);
                          setShowCompanyModal(true);
                        }}>
                          <PencilIcon />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem onClick={() => handleDelete(company.id!, company.name, 'company')}>
                          <TrashIcon />
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              ))
            ) : (
              paginatedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="relative rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {/* Checkbox */}
                  <div className="absolute top-4 right-4">
                    <Checkbox
                      checked={selectedContactIds.has(contact.id!)}
                      onChange={(checked: boolean) => {
                        const newIds = new Set(selectedContactIds);
                        if (checked) {
                          newIds.add(contact.id!);
                        } else {
                          newIds.delete(contact.id!);
                        }
                        setSelectedContactIds(newIds);
                      }}
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="pr-8">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      <Link href={`/dashboard/contacts/crm/contacts/${contact.id}`} className="hover:text-primary">
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </h3>
                    <div className="mt-2 space-y-1">
                      {contact.position && (
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{contact.position}</p>
                      )}
                      {contact.companyName && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{contact.companyName}</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {contact.tagIds && contact.tagIds.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {contact.tagIds.slice(0, 3).map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                      })}
                      {contact.tagIds.length > 3 && (
                        <span className="text-xs text-zinc-400">+{contact.tagIds.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-700">
                    <div className="flex gap-3">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm text-primary hover:text-primary-hover"
                        >
                          E-Mail
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-sm text-primary hover:text-primary-hover">
                          Anrufen
                        </a>
                      )}
                    </div>
                    <Dropdown>
                      <DropdownButton plain className="p-1 hover:bg-zinc-100 rounded dark:hover:bg-zinc-700">
                        <EllipsisVerticalIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem href={`/dashboard/contacts/crm/contacts/${contact.id}`}>
                          <EyeIcon />
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem onClick={() => {
                          setSelectedContact(contact);
                          setShowContactModal(true);
                        }}>
                          <PencilIcon />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem onClick={() => handleDelete(contact.id!, `${contact.firstName} ${contact.lastName}`, 'contact')}>
                          <TrashIcon />
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
          }} 
          userId={user?.uid || ''}
        />
      )}
      
      {showContactModal && (
        <ContactModal 
          contact={selectedContact} 
          companies={companies} 
          onClose={() => {
            setShowContactModal(false);
            setSelectedContact(null);
          }} 
          onSave={() => {
            loadData();
            showAlert('success', selectedContact ? 'Kontakt aktualisiert' : 'Kontakt erstellt');
          }} 
          userId={user?.uid || ''}
        />
      )}
      
      {showImportModal && (
        <ImportModal 
          activeTab={activeTab} 
          onClose={() => setShowImportModal(false)} 
          onImportSuccess={() => {
            setShowImportModal(false);
            loadData();
            showAlert('success', 'Import erfolgreich');
          }}
        />
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              confirmDialog.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <ExclamationTriangleIcon className={`h-6 w-6 ${
                confirmDialog.type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogBody className="mt-2">
                <Text>{confirmDialog.message}</Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button
              plain
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Abbrechen
            </Button>
            <Button
              color={confirmDialog.type === 'danger' ? 'zinc' : 'zinc'}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
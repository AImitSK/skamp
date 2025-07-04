// src/app/dashboard/contacts/crm/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { Input } from "@/components/input";
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
  ExclamationTriangleIcon
} from "@heroicons/react/20/solid";
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Company, Contact, Tag, companyTypeLabels, CompanyType } from "@/types/crm";
import CompanyModal from "./CompanyModal";
import ContactModal from "./ContactModal";
import ImportModal from "./ImportModal";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import Papa from 'papaparse';

type TabType = 'companies' | 'contacts';

// Standard Alert Component nach Tailwind UI Pattern
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
            <p className={`text-sm font-medium ${styles[type].split(' ')[1]}`}>{title}</p>
            {message && <p className={`mt-2 text-sm ${styles[type].split(' ')[1]}`}>{message}</p>}
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

// Confirm Dialog als einfaches Modal
function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Löschen",
  cancelText = "Abbrechen",
  type = "danger"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}) {
  if (!isOpen) return null;

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
      
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <ExclamationTriangleIcon className={`h-6 w-6 ${
                  type === 'danger' ? 'text-red-600' : 'text-yellow-600'
                }`} />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-xs sm:ml-3 sm:w-auto ${
                  type === 'danger' 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-yellow-600 hover:bg-yellow-500'
                }`}
              >
                {confirmText}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                {cancelText}
              </button>
            </div>
          </div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <p className="mt-4 text-gray-500">Lade Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Kontakte
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Verwalte deine Firmen und Ansprechpartner
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
          >
            <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
            Import
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'companies') {
                setSelectedCompany(null);
                setShowCompanyModal(true);
              } else {
                setSelectedContact(null);
                setShowContactModal(true);
              }
            }}
            className="ml-3 inline-flex items-center rounded-md bg-[#005fab] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#004a8c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005fab]"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {activeTab === 'companies' ? 'Firma hinzufügen' : 'Person hinzufügen'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav aria-label="Tabs" className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('companies')}
              className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'companies'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <BuildingOfficeIcon
                className={`mr-2 -ml-0.5 size-5 ${
                  activeTab === 'companies' ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              <span>Firmen ({companies.length})</span>
            </button>
            <button
              onClick={() => handleTabChange('contacts')}
              className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'contacts'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <UserIcon
                className={`mr-2 -ml-0.5 size-5 ${
                  activeTab === 'contacts' ? 'text-[#005fab]' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              <span>Personen ({contacts.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-6 sm:flex sm:items-center sm:justify-between">
        <div className="mt-3 flex sm:mt-0">
          <div className="-mr-px grid grow grid-cols-1 focus-within:relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`${activeTab === 'companies' ? 'Firmen' : 'Personen'} durchsuchen...`}
              className="col-start-1 row-start-1 block w-full rounded-l-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab] sm:pl-9 sm:text-sm/6"
            />
            <MagnifyingGlassIcon
              className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-gray-400 sm:size-4"
            />
          </div>
          
          {activeTab === 'companies' && (
            <>
              <div className="ml-3">
                <MultiSelectDropdown 
                  placeholder="Nach Typ filtern..." 
                  options={Object.entries(companyTypeLabels).map(([value, label]) => ({ value, label }))} 
                  selectedValues={selectedTypes} 
                  onChange={(values) => setSelectedTypes(values as CompanyType[])}
                />
              </div>
              <div className="ml-3">
                <MultiSelectDropdown 
                  placeholder="Nach Tags filtern..." 
                  options={tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))} 
                  selectedValues={selectedCompanyTagIds} 
                  onChange={(values) => setSelectedCompanyTagIds(values)}
                />
              </div>
            </>
          )}

          {activeTab === 'contacts' && (
            <>
              <div className="ml-3">
                <MultiSelectDropdown 
                  placeholder="Nach Firma filtern..." 
                  options={companyOptions} 
                  selectedValues={selectedContactCompanyIds} 
                  onChange={(values) => setSelectedContactCompanyIds(values)}
                />
              </div>
              <div className="ml-3">
                <MultiSelectDropdown 
                  placeholder="Nach Tags filtern..." 
                  options={tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))} 
                  selectedValues={selectedContactTagIds} 
                  onChange={(values) => setSelectedContactTagIds(values)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results Info and Bulk Actions */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          {activeTab === 'companies' 
            ? `${filteredCompanies.length} von ${companies.length} Firmen`
            : `${filteredContacts.length} von ${contacts.length} Kontakten`}
        </p>
        
        {((activeTab === 'companies' && selectedCompanyIds.size > 0) || 
          (activeTab === 'contacts' && selectedContactIds.size > 0)) && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size} ausgewählt
            </span>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Löschen
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {activeTab === 'companies' ? (
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                      <Checkbox
                        checked={paginatedCompanies.length > 0 && paginatedCompanies.every(c => selectedCompanyIds.has(c.id!))}
                        indeterminate={paginatedCompanies.some(c => selectedCompanyIds.has(c.id!)) && !paginatedCompanies.every(c => selectedCompanyIds.has(c.id!))}
                        onChange={(checked) => handleSelectAllCompanies(checked)}
                      />
                    </th>
                    <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-3">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Typ
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Publikationen
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Tags
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Website
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Telefon
                    </th>
                    <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-3">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedCompanies.map((company, index) => (
                    <tr key={company.id} className={index % 2 === 0 ? undefined : 'bg-gray-50'}>
                      <td className="relative px-7 sm:w-12 sm:px-6">
                        <Checkbox
                          checked={selectedCompanyIds.has(company.id!)}
                          onChange={(checked) => {
                            const newIds = new Set(selectedCompanyIds);
                            if (checked) {
                              newIds.add(company.id!);
                            } else {
                              newIds.delete(company.id!);
                            }
                            setSelectedCompanyIds(newIds);
                          }}
                        />
                      </td>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-3">
                        <Link href={`/dashboard/contacts/crm/companies/${company.id}`} className="text-[#005fab] hover:text-[#004a8c]">
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        <Badge color="zinc">{companyTypeLabels[company.type]}</Badge>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {company.mediaInfo?.publications && company.mediaInfo.publications.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {company.mediaInfo.publications.slice(0, 2).map((pub) => (
                              <Badge key={pub.id} color="blue" className="text-xs">
                                {pub.name}
                              </Badge>
                            ))}
                            {company.mediaInfo.publications.length > 2 && (
                              <span className="text-xs text-gray-400">+{company.mediaInfo.publications.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {company.tagIds && company.tagIds.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {company.tagIds.slice(0, 3).map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                            })}
                            {company.tagIds.length > 3 && (
                              <span className="text-xs text-gray-400">+{company.tagIds.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {company.website ? (
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#005fab] hover:text-[#004a8c] truncate block max-w-xs">
                            {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {company.phone ? (
                          <a href={`tel:${company.phone}`} className="text-[#005fab] hover:text-[#004a8c]">
                            {company.phone}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-3">
                        <Menu as="div" className="relative inline-block text-left">
                          <MenuButton className="flex items-center rounded-full p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                            <span className="sr-only">Optionen öffnen</span>
                            <EllipsisVerticalIcon className="size-5" />
                          </MenuButton>
                          <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                              <MenuItem>
                                <Link
                                  href={`/dashboard/contacts/crm/companies/${company.id}`}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900"
                                >
                                  <EyeIcon className="mr-3 h-5 w-5 text-gray-400" />
                                  Anzeigen
                                </Link>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setShowCompanyModal(true);
                                  }}
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900"
                                >
                                  <PencilIcon className="mr-3 h-5 w-5 text-gray-400" />
                                  Bearbeiten
                                </button>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  onClick={() => handleDelete(company.id!, company.name, 'company')}
                                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 data-focus:bg-red-50 data-focus:text-red-700"
                                >
                                  <TrashIcon className="mr-3 h-5 w-5 text-red-400" />
                                  Löschen
                                </button>
                              </MenuItem>
                            </div>
                          </MenuItems>
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                      <Checkbox
                        checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedContactIds.has(c.id!))}
                        indeterminate={paginatedContacts.some(c => selectedContactIds.has(c.id!)) && !paginatedContacts.every(c => selectedContactIds.has(c.id!))}
                        onChange={(checked) => handleSelectAllContacts(checked)}
                      />
                    </th>
                    <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-3">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Firma
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Publikationen
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Tags
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Position
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      E-Mail
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Telefon
                    </th>
                    <th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-3">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedContacts.map((contact, index) => (
                    <tr key={contact.id} className={index % 2 === 0 ? undefined : 'bg-gray-50'}>
                      <td className="relative px-7 sm:w-12 sm:px-6">
                        <Checkbox
                          checked={selectedContactIds.has(contact.id!)}
                          onChange={(checked) => {
                            const newIds = new Set(selectedContactIds);
                            if (checked) {
                              newIds.add(contact.id!);
                            } else {
                              newIds.delete(contact.id!);
                            }
                            setSelectedContactIds(newIds);
                          }}
                        />
                      </td>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-3">
                        <Link href={`/dashboard/contacts/crm/contacts/${contact.id}`} className="text-[#005fab] hover:text-[#004a8c]">
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {contact.companyName || '—'}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {contact.mediaInfo?.publications && contact.mediaInfo.publications.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {contact.mediaInfo.publications.slice(0, 2).map((pubName) => (
                              <Badge key={pubName} color="blue" className="text-xs">
                                {pubName}
                              </Badge>
                            ))}
                            {contact.mediaInfo.publications.length > 2 && (
                              <span className="text-xs text-gray-400">+{contact.mediaInfo.publications.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {contact.tagIds && contact.tagIds.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {contact.tagIds.slice(0, 3).map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                            })}
                            {contact.tagIds.length > 3 && (
                              <span className="text-xs text-gray-400">+{contact.tagIds.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {contact.position || '—'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="text-[#005fab] hover:text-[#004a8c]">
                            {contact.email}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`} className="text-[#005fab] hover:text-[#004a8c]">
                            {contact.phone}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-3">
                        <Menu as="div" className="relative inline-block text-left">
                          <MenuButton className="flex items-center rounded-full p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2">
                            <span className="sr-only">Optionen öffnen</span>
                            <EllipsisVerticalIcon className="size-5" />
                          </MenuButton>
                          <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                              <MenuItem>
                                <Link
                                  href={`/dashboard/contacts/crm/contacts/${contact.id}`}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900"
                                >
                                  <EyeIcon className="mr-3 h-5 w-5 text-gray-400" />
                                  Anzeigen
                                </Link>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  onClick={() => {
                                    setSelectedContact(contact);
                                    setShowContactModal(true);
                                  }}
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900"
                                >
                                  <PencilIcon className="mr-3 h-5 w-5 text-gray-400" />
                                  Bearbeiten
                                </button>
                              </MenuItem>
                              <MenuItem>
                                <button
                                  onClick={() => handleDelete(contact.id!, `${contact.firstName} ${contact.lastName}`, 'contact')}
                                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 data-focus:bg-red-50 data-focus:text-red-700"
                                >
                                  <TrashIcon className="mr-3 h-5 w-5 text-red-400" />
                                  Löschen
                                </button>
                              </MenuItem>
                            </div>
                          </MenuItems>
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {((activeTab === 'companies' && filteredCompanies.length > itemsPerPage) || 
        (activeTab === 'contacts' && filteredContacts.length > itemsPerPage)) && (
        <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
          <div className="-mt-px flex w-0 flex-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="mr-3 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Zurück
            </button>
          </div>
          <div className="hidden md:-mt-px md:flex">
            {(() => {
              const totalPages = activeTab === 'companies' 
                ? Math.ceil(filteredCompanies.length / itemsPerPage)
                : Math.ceil(filteredContacts.length / itemsPerPage);
              
              const pages = [];
              const maxVisible = 7;
              let start = Math.max(1, currentPage - 3);
              let end = Math.min(totalPages, start + maxVisible - 1);
              
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }
              
              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium ${
                      currentPage === i
                        ? 'border-[#005fab] text-[#005fab]'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              
              return pages;
            })()}
          </div>
          <div className="-mt-px flex w-0 flex-1 justify-end">
            <button
              onClick={() => {
                const totalPages = activeTab === 'companies' 
                  ? Math.ceil(filteredCompanies.length / itemsPerPage)
                  : Math.ceil(filteredContacts.length / itemsPerPage);
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
              }}
              disabled={currentPage === (activeTab === 'companies' 
                ? Math.ceil(filteredCompanies.length / itemsPerPage)
                : Math.ceil(filteredContacts.length / itemsPerPage))}
              className="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
              <svg className="ml-3 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
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
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
}
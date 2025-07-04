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
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/dropdown";
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
  ChevronRightIcon
} from "@heroicons/react/20/solid";
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Company, Contact, Tag, companyTypeLabels, CompanyType } from "@/types/crm";
import CompanyModal from "./CompanyModal";
import ContactModal from "./ContactModal";
import ImportModal from "./ImportModal";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import Papa from 'papaparse';

type TabType = 'companies' | 'contacts';

// Alert Component using Catalyst patterns
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
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Heading level={1}>Kontakte</Heading>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
          <Button plain onClick={() => setShowImportModal(true)}>
            <ArrowUpTrayIcon />
            Import
          </Button>
          <Button plain onClick={handleExport}>
            <ArrowDownTrayIcon />
            Export
          </Button>
          <Button 
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
            <PlusIcon />
            {activeTab === 'companies' ? 'Firma hinzufügen' : 'Person hinzufügen'}
          </Button>
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
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <BuildingOfficeIcon
                className={`mr-2 -ml-0.5 size-5 ${
                  activeTab === 'companies' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              <span>Firmen ({companies.length})</span>
            </button>
            <button
              onClick={() => handleTabChange('contacts')}
              className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'contacts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <UserIcon
                className={`mr-2 -ml-0.5 size-5 ${
                  activeTab === 'contacts' ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              <span>Personen ({contacts.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`${activeTab === 'companies' ? 'Firmen' : 'Personen'} durchsuchen...`}
              className="pl-10"
            />
          </div>
          
          {/* Filters for Companies */}
          {activeTab === 'companies' && (
            <>
              <div className="w-full sm:w-auto">
                <MultiSelectDropdown 
                  placeholder="Nach Typ filtern..." 
                  options={Object.entries(companyTypeLabels).map(([value, label]) => ({ value, label }))} 
                  selectedValues={selectedTypes} 
                  onChange={(values) => setSelectedTypes(values as CompanyType[])}
                />
              </div>
              <div className="w-full sm:w-auto">
                <MultiSelectDropdown 
                  placeholder="Nach Tags filtern..." 
                  options={tagOptions.map(tag => ({ value: tag.id!, label: tag.name }))} 
                  selectedValues={selectedCompanyTagIds} 
                  onChange={(values) => setSelectedCompanyTagIds(values)}
                />
              </div>
            </>
          )}

          {/* Filters for Contacts */}
          {activeTab === 'contacts' && (
            <>
              <div className="w-full sm:w-auto">
                <MultiSelectDropdown 
                  placeholder="Nach Firma filtern..." 
                  options={companyOptions} 
                  selectedValues={selectedContactCompanyIds} 
                  onChange={(values) => setSelectedContactCompanyIds(values)}
                />
              </div>
              <div className="w-full sm:w-auto">
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
        <Text>
          {activeTab === 'companies' 
            ? `${filteredCompanies.length} von ${companies.length} Firmen`
            : `${filteredContacts.length} von ${contacts.length} Kontakten`}
        </Text>
        
        <div className="flex min-h-10 items-center gap-4">
          {((activeTab === 'companies' && selectedCompanyIds.size > 0) || 
            (activeTab === 'contacts' && selectedContactIds.size > 0)) && (
            <>
              <Text>
                {activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size} ausgewählt
              </Text>
              <Button color="zinc" onClick={handleBulkDelete}>
                <TrashIcon />
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mt-8">
        {activeTab === 'companies' ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>
                  <Checkbox
                    checked={paginatedCompanies.length > 0 && paginatedCompanies.every(c => selectedCompanyIds.has(c.id!))}
                    indeterminate={paginatedCompanies.some(c => selectedCompanyIds.has(c.id!)) && !paginatedCompanies.every(c => selectedCompanyIds.has(c.id!))}
                    onChange={(checked) => handleSelectAllCompanies(checked)}
                  />
                </TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Typ</TableHeader>
                <TableHeader>Publikationen</TableHeader>
                <TableHeader>Tags</TableHeader>
                <TableHeader>Website</TableHeader>
                <TableHeader>Telefon</TableHeader>
                <TableHeader>
                  <span className="sr-only">Aktionen</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCompanies.map((company) => (
                <TableRow key={company.id} className="hover:bg-gray-50">
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/contacts/crm/companies/${company.id}`} className="text-primary hover:text-primary-hover">
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge color="zinc">{companyTypeLabels[company.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    {company.mediaInfo?.publications && company.mediaInfo.publications.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {company.mediaInfo.publications.slice(0, 2).map((pub) => (
                          <Badge key={pub.id} color="blue" className="text-xs">
                            {pub.name}
                          </Badge>
                        ))}
                        {company.mediaInfo.publications.length > 2 && (
                          <Text className="text-xs text-gray-400">+{company.mediaInfo.publications.length - 2}</Text>
                        )}
                      </div>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.tagIds && company.tagIds.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {company.tagIds.slice(0, 3).map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                        })}
                        {company.tagIds.length > 3 && (
                          <Text className="text-xs text-gray-400">+{company.tagIds.length - 3}</Text>
                        )}
                      </div>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover truncate block max-w-xs">
                        {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.phone ? (
                      <a href={`tel:${company.phone}`} className="text-primary hover:text-primary-hover">
                        {company.phone}
                      </a>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                        <DropdownItem href={`/dashboard/contacts/crm/companies/${company.id}`} className="hover:bg-gray-50">
                          <EyeIcon className="text-gray-500" />
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => {
                            setSelectedCompany(company);
                            setShowCompanyModal(true);
                          }}
                          className="hover:bg-gray-50"
                        >
                          <PencilIcon className="text-gray-500" />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem 
                          onClick={() => handleDelete(company.id!, company.name, 'company')}
                          className="hover:bg-red-50"
                        >
                          <TrashIcon className="text-red-500" />
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>
                  <Checkbox
                    checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedContactIds.has(c.id!))}
                    indeterminate={paginatedContacts.some(c => selectedContactIds.has(c.id!)) && !paginatedContacts.every(c => selectedContactIds.has(c.id!))}
                    onChange={(checked) => handleSelectAllContacts(checked)}
                  />
                </TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Firma</TableHeader>
                <TableHeader>Publikationen</TableHeader>
                <TableHeader>Tags</TableHeader>
                <TableHeader>Position</TableHeader>
                <TableHeader>E-Mail</TableHeader>
                <TableHeader>Telefon</TableHeader>
                <TableHeader>
                  <span className="sr-only">Aktionen</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedContacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-gray-50">
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/contacts/crm/contacts/${contact.id}`} className="text-primary hover:text-primary-hover">
                      {contact.firstName} {contact.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {contact.companyName || <Text>—</Text>}
                  </TableCell>
                  <TableCell>
                    {contact.mediaInfo?.publications && contact.mediaInfo.publications.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {contact.mediaInfo.publications.slice(0, 2).map((pubName) => (
                          <Badge key={pubName} color="blue" className="text-xs">
                            {pubName}
                          </Badge>
                        ))}
                        {contact.mediaInfo.publications.length > 2 && (
                          <Text className="text-xs text-gray-400">+{contact.mediaInfo.publications.length - 2}</Text>
                        )}
                      </div>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.tagIds && contact.tagIds.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {contact.tagIds.slice(0, 3).map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                        })}
                        {contact.tagIds.length > 3 && (
                          <Text className="text-xs text-gray-400">+{contact.tagIds.length - 3}</Text>
                        )}
                      </div>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.position || <Text>—</Text>}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="text-primary hover:text-primary-hover">
                        {contact.email}
                      </a>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="text-primary hover:text-primary-hover">
                        {contact.phone}
                      </a>
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                        <DropdownItem href={`/dashboard/contacts/crm/contacts/${contact.id}`} className="hover:bg-gray-50">
                          <EyeIcon className="text-gray-500" />
                          Anzeigen
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => {
                            setSelectedContact(contact);
                            setShowContactModal(true);
                          }}
                          className="hover:bg-gray-50"
                        >
                          <PencilIcon className="text-gray-500" />
                          Bearbeiten
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem 
                          onClick={() => handleDelete(contact.id!, `${contact.firstName} ${contact.lastName}`, 'contact')}
                          className="hover:bg-red-50"
                        >
                          <TrashIcon className="text-red-500" />
                          <span className="text-red-600">Löschen</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

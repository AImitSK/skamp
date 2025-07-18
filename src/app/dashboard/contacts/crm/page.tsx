// src/app/dashboard/contacts/crm/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
import ImportModalEnhanced from "./ImportModalEnhanced";
import { exportCompaniesToCSV, exportContactsToCSV, downloadCSV } from "@/lib/utils/exportUtils";
import { CurrencyCode } from '@/types/international';
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
  GlobeAltIcon,
  TagIcon,
  CurrencyEuroIcon,
  UsersIcon,
  MapPinIcon,
  CalendarIcon
} from "@heroicons/react/20/solid";
import { companiesService, contactsService, tagsService } from "@/lib/firebase/crm-service";
import { Company, Contact, Tag, companyTypeLabels, CompanyType } from "@/types/crm";
import { CompanyEnhanced, ContactEnhanced } from "@/types/crm-enhanced";
import CompanyModal from "./CompanyModal";
import ContactModalEnhanced from "@/components/crm/ContactModalEnhanced";
import ImportModal from "./ImportModal";
import Papa from 'papaparse';
import clsx from 'clsx';
import { EnhancedCompanyTable } from "@/components/crm/EnhancedCompanyTable";
import { EnhancedContactTable } from "@/components/crm/EnhancedContactTable";
import { companyServiceEnhanced } from "@/lib/firebase/company-service-enhanced";
import { Timestamp } from 'firebase/firestore';
import { CountryCode } from '@/types/international';
import { COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS } from '@/types/crm-enhanced';
import { companiesEnhancedService, contactsEnhancedService } from "@/lib/firebase/crm-service-enhanced";


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
  const router = useRouter();
  
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

  const [enhancedCompanies, setEnhancedCompanies] = useState<CompanyEnhanced[]>([]);
  const [enhancedContacts, setEnhancedContacts] = useState<ContactEnhanced[]>([]);
  const [useEnhancedView, setUseEnhancedView] = useState(false);

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
      // Lade Legacy-Daten
      const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesService.getAll(user.uid),
        contactsService.getAll(user.uid),
        tagsService.getAll(user.uid)
      ]);
      
      // Lade Enhanced-Daten
      const [enhancedCompData, enhancedContactsData] = await Promise.all([
        companiesEnhancedService.getAll(user.uid),
        contactsEnhancedService.getAll(user.uid)
      ]);
      
      // Merge Legacy und Enhanced Companies
      const mergedCompanies = [...companiesData];
      
      // Füge Enhanced Companies hinzu, die nicht in Legacy existieren
      enhancedCompData.forEach(enhancedCompany => {
        const existsInLegacy = companiesData.some(c => c.id === enhancedCompany.id);
        if (!existsInLegacy) {
          // Konvertiere Enhanced zu Legacy-Format für die Anzeige
          const legacyFormat: Company = {
            id: enhancedCompany.id!,
            name: enhancedCompany.name,
            type: enhancedCompany.type,
            industry: enhancedCompany.industryClassification?.primary || '',
            website: enhancedCompany.website || '',
            phone: enhancedCompany.phones?.[0]?.number || '',
            email: enhancedCompany.emails?.[0]?.email || '',
            address: {
              street: enhancedCompany.mainAddress?.street || '',
              street2: '',
              city: enhancedCompany.mainAddress?.city || '',
              zip: enhancedCompany.mainAddress?.postalCode || '',
              state: enhancedCompany.mainAddress?.region || '',
              country: enhancedCompany.mainAddress?.countryCode || ''
            },
            employees: enhancedCompany.financial?.employees,
            revenue: enhancedCompany.financial?.annualRevenue?.amount,
            notes: enhancedCompany.internalNotes || '',
            tagIds: enhancedCompany.tagIds || [],
            socialMedia: enhancedCompany.socialMedia || [],
            userId: enhancedCompany.organizationId || enhancedCompany.createdBy || user.uid,
            createdAt: enhancedCompany.createdAt,
            updatedAt: enhancedCompany.updatedAt
          };
          mergedCompanies.push(legacyFormat);
        }
      });
      
      // Merge Legacy und Enhanced Contacts
      const mergedContacts = [...contactsData];
      
      // Füge Enhanced Contacts hinzu, die nicht in Legacy existieren
      enhancedContactsData.forEach(enhancedContact => {
        const existsInLegacy = contactsData.some(c => c.id === enhancedContact.id);
        if (!existsInLegacy) {
          // Konvertiere Enhanced zu Legacy-Format für die Anzeige
          const legacyFormat: Contact = {
            id: enhancedContact.id!,
            firstName: enhancedContact.name.firstName,
            lastName: enhancedContact.name.lastName,
            email: enhancedContact.emails?.[0]?.email || '',
            phone: enhancedContact.phones?.[0]?.number || '',
            position: enhancedContact.position || '',
            companyId: enhancedContact.companyId,
            companyName: enhancedContact.companyName,
            notes: enhancedContact.personalInfo?.notes || '',
            tagIds: enhancedContact.tagIds || [],
            socialMedia: enhancedContact.socialProfiles?.map(p => ({
              platform: p.platform as any,
              url: p.url
            })) || [],
            userId: enhancedContact.organizationId || enhancedContact.createdBy || user.uid,
            createdAt: enhancedContact.createdAt,
            updatedAt: enhancedContact.updatedAt
          };
          mergedContacts.push(legacyFormat);
        }
      });
      
      setEnhancedCompanies(enhancedCompData);
      setEnhancedContacts(enhancedContactsData);
      setCompanies(mergedCompanies);
      setContacts(mergedContacts);
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

const paginatedEnhancedCompanies = useMemo(() => {
      return paginatedCompanies.map(c => {
          const enhanced = enhancedCompanies.find(ec => ec.id === c.id);
          
          // Berechne die Anzahl der zugeordneten Kontakte
          const contactCount = contacts.filter(contact => contact.companyId === c.id).length;
          
          // Finde das letzte Kontaktdatum
          const companyContacts = contacts.filter(contact => contact.companyId === c.id);
          let lastContactDate = undefined;
          if (companyContacts.length > 0) {
              // Hier könntest du die lastActivityAt oder createdAt der Kontakte nutzen
              // Für jetzt nutzen wir das createdAt des neuesten Kontakts
              const sortedContacts = companyContacts.sort((a, b) => {
                  // Handle both Date and Timestamp types
                  const getTime = (date: any): number => {
                      if (!date) return 0;
                      if (date instanceof Date) return date.getTime();
                      if (date instanceof Timestamp) return date.toDate().getTime();
                      if (date.toDate && typeof date.toDate === 'function') return date.toDate().getTime();
                      return new Date(date).getTime();
                  };
                  
                  const dateA = getTime(a.createdAt);
                  const dateB = getTime(b.createdAt);
                  return dateB - dateA;
              });
              if (sortedContacts[0]?.createdAt) {
                  lastContactDate = sortedContacts[0].createdAt;
              }
          }
          
          if (enhanced) {
              return {
                  ...enhanced,
                  contactCount,
                  lastContactDate
              };
          }
          
          // Fallback: Create a structure that matches the enhanced view as much as possible
          return {
              ...c,
              id: c.id!,
              organizationId: user!.uid,
              createdBy: user!.uid,
              name: c.name,
              type: c.type,
              officialName: c.name,
              mainAddress: c.address ? {
                  street: c.address.street || '',
                  city: c.address.city || '',
                  postalCode: c.address.zip || '',
                  region: c.address.state || '',
                  countryCode: (c.address.country || 'DE') as CountryCode
              } : undefined,
              industryClassification: c.industry ? { primary: c.industry } : undefined,
              contactCount,
              lastContactDate,
              // Ensure other required fields from CompanyEnhanced are present with default values if needed
          } as CompanyEnhanced;
      });
  }, [paginatedCompanies, enhancedCompanies, contacts, user]);

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  const paginatedEnhancedContacts = useMemo(() => {
    return paginatedContacts.map(c => {
      const enhanced = enhancedContacts.find(ec => ec.id === c.id);
      if (enhanced) {
        return enhanced;
      }
      
      // Fallback: Create enhanced structure from legacy contact
      return {
        ...c,
        id: c.id!,
        organizationId: user!.uid,
        createdBy: user!.uid,
        name: {
          firstName: c.firstName,
          lastName: c.lastName
        },
        displayName: `${c.firstName} ${c.lastName}`,
        emails: c.email ? [{
          type: 'business' as const,
          email: c.email,
          isPrimary: true
        }] : [],
        phones: c.phone ? [{
          type: 'business' as const,
          number: c.phone,
          isPrimary: true
        }] : [],
        status: 'active' as const,
        mediaProfile: c.mediaInfo ? {
          isJournalist: true,
          publicationIds: c.mediaInfo.publications || [],
          beats: c.mediaInfo.expertise || []
        } : undefined,
        lastActivityAt: c.lastContactDate
      } as ContactEnhanced;
    });
  }, [paginatedContacts, enhancedContacts, user]);

  // Create maps for efficient lookup
  const tagsMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    tags.forEach(tag => {
      if (tag.id) {
        map.set(tag.id, { name: tag.name, color: tag.color });
      }
    });
    return map;
  }, [tags]);

  const companiesMap = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    companies.forEach(company => {
      if (company.id) {
        map.set(company.id, { name: company.name, type: company.type });
      }
    });
    return map;
  }, [companies]);

  const publicationsMap = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    // For now, we'll extract publications from companies with mediaInfo
    companies.forEach(company => {
      if (company.mediaInfo?.publications) {
        company.mediaInfo.publications.forEach(pub => {
          if (pub.id) {
            map.set(pub.id, { name: pub.name, type: pub.type });
          }
        });
      }
    });
    return map;
  }, [companies]);

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
  // Export Function mit Enhanced Data
  const handleExport = () => {
    const isCompaniesTab = activeTab === 'companies';
    const filename = isCompaniesTab ? 'firmen-export.csv' : 'kontakte-export.csv';

    try {
      let csvContent: string;
      
      if (isCompaniesTab) {
        // Check if we have enhanced data
        const hasEnhancedData = enhancedCompanies.length > 0;
        
        if (hasEnhancedData) {
          // Export enhanced companies
          const exportData = filteredCompanies.map(company => {
            const enhanced = enhancedCompanies.find(ec => ec.id === company.id);
            return enhanced || {
              ...company,
              id: company.id!,
              organizationId: user!.uid,
              createdBy: user!.uid,
              name: company.name,
              type: company.type,
              officialName: company.name,
              mainAddress: company.address ? {
                street: company.address.street || '',
                city: company.address.city || '',
                postalCode: company.address.zip || '',
                region: company.address.state || '',
                countryCode: (company.address.country || 'DE') as CountryCode
              } : undefined,
              industryClassification: company.industry ? { primary: company.industry } : undefined,
              financial: {
                annualRevenue: company.revenue ? { amount: company.revenue, currency: 'EUR' as CurrencyCode } : undefined,
                employees: company.employees
              },
              phones: company.phone ? [{
                type: 'business' as const,
                number: company.phone,
                isPrimary: true
              }] : [],
              emails: company.email ? [{
                type: 'general' as const,
                email: company.email,
                isPrimary: true
              }] : [],
              socialMedia: company.socialMedia || [],
              tagIds: company.tagIds || [],
              internalNotes: company.notes,
              website: company.website
            } as CompanyEnhanced;
          });
          
          csvContent = exportCompaniesToCSV(exportData, tagsMap, {
            includeIds: false,
            includeTimestamps: false,
            includeTags: true
          });
        } else {
          // Fallback to legacy export
          const companyData = filteredCompanies.map(company => ({
            "Firmenname": company.name,
            "Typ": companyTypeLabels[company.type],
            "Branche": company.industry || '',
            "Website": company.website || '',
            "Telefon": company.phone || '',
            "E-Mail": company.email || '',
            "Straße": company.address?.street || '',
            "PLZ": company.address?.zip || '',
            "Stadt": company.address?.city || '',
            "Bundesland": company.address?.state || '',
            "Mitarbeiter": company.employees || '',
            "Umsatz": company.revenue || '',
            "Notizen": company.notes || ''
          }));
          csvContent = Papa.unparse(companyData);
        }
      } else {
        // Export contacts
        const hasEnhancedData = enhancedContacts.length > 0;
        
        if (hasEnhancedData) {
          // Export enhanced contacts
          const exportData = filteredContacts.map(contact => {
            const enhanced = enhancedContacts.find(ec => ec.id === contact.id);
            return enhanced || {
              ...contact,
              id: contact.id!,
              organizationId: user!.uid,
              createdBy: user!.uid,
              name: {
                firstName: contact.firstName,
                lastName: contact.lastName
              },
              displayName: `${contact.firstName} ${contact.lastName}`,
              emails: contact.email ? [{
                type: 'business' as const,
                email: contact.email,
                isPrimary: true
              }] : [],
              phones: contact.phone ? [{
                type: 'business' as const,
                number: contact.phone,
                isPrimary: true
              }] : [],
              status: 'active' as const,
              position: contact.position,
              companyName: contact.companyName,
              tagIds: contact.tagIds || [],
              socialMedia: contact.socialMedia || [],
              personalInfo: {
                notes: contact.notes
              }
            } as ContactEnhanced;
          });
          
          csvContent = exportContactsToCSV(exportData, companiesMap, tagsMap, {
            includeIds: false,
            includeTimestamps: false,
            includeTags: true
          });
        } else {
          // Fallback to legacy export
          const contactData = filteredContacts.map(contact => ({
            "Vorname": contact.firstName,
            "Nachname": contact.lastName,
            "Firma": contact.companyName || '',
            "Position": contact.position || '',
            "E-Mail": contact.email || '',
            "Telefon": contact.phone || '',
            "Notizen": contact.notes || ''
          }));
          csvContent = Papa.unparse(contactData);
        }
      }

      if (!csvContent || filteredCompanies.length === 0 && filteredContacts.length === 0) {
        showAlert('warning', 'Keine Daten zum Exportieren');
        return;
      }

      downloadCSV(csvContent, filename);
      showAlert('success', `Export erfolgreich: ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      showAlert('error', 'Export fehlgeschlagen', 'Bitte prüfen Sie die Konsole für Details.');
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

      {/* Tabellen-Rendering */}
      <div>
        {viewMode === 'list' ? (
          activeTab === 'companies' ? (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center">
                  <div className="flex items-center w-[25%]">
                    <Checkbox
                      checked={paginatedCompanies.length > 0 && selectedCompanyIds.size === paginatedCompanies.length}
                      indeterminate={selectedCompanyIds.size > 0 && selectedCompanyIds.size < paginatedCompanies.length}
                      onChange={(checked: boolean) => handleSelectAllCompanies(checked)}
                    />
                    <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Firmenname / Typ
                    </span>
                  </div>
                  <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Branche
                  </div>
                  <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Ort & Land
                  </div>
                  <div className="w-[15%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Website
                  </div>
                  <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                    # Personen
                  </div>
                  <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right pr-14">
                    Zuletzt kontaktiert
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedEnhancedCompanies.map((company) => (
                  <div key={company.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      {/* Company Name & Type */}
                      <div className="flex items-center w-[25%]">
                        <Checkbox
                          checked={selectedCompanyIds.has(company.id!)}
                          onChange={(checked: boolean) => {
                                const newIds = new Set(selectedCompanyIds);
                                if (checked) newIds.add(company.id!);
                                else newIds.delete(company.id!);
                                setSelectedCompanyIds(newIds);
                            }}
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <button
                            onClick={() => router.push(`/dashboard/contacts/crm/companies/${company.id}`)}
                            className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                          >
                            {company.officialName || company.name}
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge color="zinc" className="text-xs whitespace-nowrap">
                              {companyTypeLabels[company.type]}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Industry */}
                      <div className="w-[15%] text-sm text-zinc-500 dark:text-zinc-400 truncate">
                        {company.industryClassification?.primary || '—'}
                      </div>

                      {/* Location */}
                      <div className="w-[20%]">
                        {company.mainAddress ? (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {company.mainAddress.city && company.mainAddress.countryCode ? 
                              `${company.mainAddress.city}, ${company.mainAddress.countryCode}` : 
                              '—'
                            }
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">—</span>
                        )}
                      </div>

                      {/* Website */}
                      <div className="w-[15%]">
                        {company.website ? (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:text-primary-hover truncate block"
                            title={company.website}
                          >
                            {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        ) : (
                          <span className="text-sm text-zinc-400">—</span>
                        )}
                      </div>

                      {/* Contact Count */}
                      <div className="w-[10%] text-center">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {(company as any).contactCount || 0}
                        </span>
                      </div>

                      {/* Last Contact */}
                      <div className="flex items-center gap-4 flex-1 justify-end pr-14 text-sm">
                        {(company as any).lastContactDate ? (
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {new Date((company as any).lastContactDate.toDate()).toLocaleDateString('de-DE')}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Nie</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="ml-4">
                        <Dropdown>
                          <DropdownButton plain className="p-1.5 hover:bg-zinc-100 rounded-md dark:hover:bg-zinc-700">
                            <EllipsisVerticalIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          </DropdownButton>
                          <DropdownMenu anchor="bottom end">
                            <DropdownItem onClick={() => router.push(`/dashboard/contacts/crm/companies/${company.id}`)}>
                              Anzeigen
                            </DropdownItem>
                            <DropdownItem onClick={() => {
                                const originalCompany = companies.find(c => c.id === company.id);
                                if (originalCompany) {
                                    setSelectedCompany(originalCompany);
                                    setShowCompanyModal(true);
                                }
                            }}>
                              Bearbeiten
                            </DropdownItem>
                            <DropdownDivider />
                            <DropdownItem onClick={() => handleDelete(company.id!, company.name, 'company')}>
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
          ) : (
            // Enhanced Contact Table
            <EnhancedContactTable
              contacts={paginatedEnhancedContacts}
              selectedIds={selectedContactIds}
              onSelectAll={handleSelectAllContacts}
              onSelectOne={(id, checked) => {
                const newIds = new Set(selectedContactIds);
                if (checked) {
                  newIds.add(id);
                } else {
                  newIds.delete(id);
                }
                setSelectedContactIds(newIds);
              }}
              onView={(contact) => router.push(`/dashboard/contacts/crm/contacts/${contact.id}`)}
              onEdit={(contact) => {
                const originalContact = contacts.find(c => c.id === contact.id);
                if (originalContact) {
                  setSelectedContact(originalContact);
                  setShowContactModal(true);
                }
              }}
              onDelete={(contact) => handleDelete(contact.id!, contact.displayName, 'contact')}
              tags={tagsMap}
              companies={companiesMap}
              publications={publicationsMap}
              viewMode="compact"
            />
          )
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
        <ContactModalEnhanced 
          contact={selectedContact} 
          companies={companies} 
          onClose={() => {
            setShowContactModal(false);
            setSelectedContact(null);
          }} 
          onSave={async () => {
            try {
              await loadData();
              showAlert('success', selectedContact ? 'Kontakt aktualisiert' : 'Kontakt erstellt');
            } catch (error) {
              console.error('Error after save:', error);
              showAlert('error', 'Fehler beim Speichern', 'Bitte prüfen Sie die Konsole für Details.');
            }
          }} 
          userId={user?.uid || ''}
          organizationId={user?.uid || ''}
        />
      )}
      
      {showImportModal && (
        <ImportModalEnhanced 
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
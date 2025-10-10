// src/app/dashboard/contacts/crm/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
// References werden jetzt automatisch durch Enhanced ContactsService geladen!
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { SearchableFilter } from "@/components/ui/searchable-filter";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
import * as Headless from '@headlessui/react';
import ImportModalEnhanced from "./ImportModalEnhanced";
import { exportCompaniesToCSV, exportContactsToCSV, downloadCSV } from "@/lib/utils/exportUtils";
import { CurrencyCode } from '@/types/international';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
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
  // ListBulletIcon, Squares2X2Icon - Grid-View entfernt
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  TagIcon,
  CurrencyEuroIcon,
  UsersIcon,
  MapPinIcon,
  CalendarIcon
} from "@heroicons/react/24/outline";
import { companiesEnhancedService, contactsEnhancedService, tagsEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { Tag, companyTypeLabels, CompanyType } from "@/types/crm";
import { CompanyEnhanced, ContactEnhanced } from "@/types/crm-enhanced";
import CompanyModal from "./CompanyModal";
import ContactModalEnhanced from "./ContactModalEnhanced";
import Papa from 'papaparse';
import clsx from 'clsx';
import { Timestamp } from 'firebase/firestore';
import { CountryCode } from '@/types/international';
import { COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS } from '@/types/crm-enhanced';
import * as Flags from 'country-flag-icons/react/3x2';

type TabType = 'companies' | 'contacts';
// Grid-Ansicht entfernt - nur Listenansicht verfügbar

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

// Country options with calling codes
const COUNTRY_OPTIONS = [
  { code: 'DE', label: '+49 DE', callingCode: '49' },
  { code: 'AT', label: '+43 AT', callingCode: '43' },
  { code: 'CH', label: '+41 CH', callingCode: '41' },
  { code: 'US', label: '+1 US', callingCode: '1' },
  { code: 'GB', label: '+44 GB', callingCode: '44' },
  { code: 'FR', label: '+33 FR', callingCode: '33' },
  { code: 'IT', label: '+39 IT', callingCode: '39' },
  { code: 'ES', label: '+34 ES', callingCode: '34' },
  { code: 'NL', label: '+31 NL', callingCode: '31' },
  { code: 'BE', label: '+32 BE', callingCode: '32' },
  { code: 'PL', label: '+48 PL', callingCode: '48' },
  { code: 'SE', label: '+46 SE', callingCode: '46' },
  { code: 'NO', label: '+47 NO', callingCode: '47' },
  { code: 'DK', label: '+45 DK', callingCode: '45' },
  { code: 'FI', label: '+358 FI', callingCode: '358' },
  { code: 'CZ', label: '+420 CZ', callingCode: '420' },
  { code: 'HU', label: '+36 HU', callingCode: '36' },
  { code: 'PT', label: '+351 PT', callingCode: '351' },
  { code: 'GR', label: '+30 GR', callingCode: '30' },
  { code: 'IE', label: '+353 IE', callingCode: '353' }
];

// Helper functions für Enhanced Data
const getPrimaryEmail = (emails?: Array<{ email: string; isPrimary?: boolean }>): string => {
  if (!emails || emails.length === 0) return '';
  const primary = emails.find(e => e.isPrimary);
  return primary?.email || emails[0].email;
};

const getPrimaryPhone = (phones?: Array<{ number: string; countryCode?: string; isPrimary?: boolean }>): string => {
  if (!phones || phones.length === 0) return '';
  const primary = phones.find(p => p.isPrimary) || phones[0];
  if (!primary) return '';

  let number = primary.number || '';

  // If number already starts with +, return as is
  if (number.startsWith('+')) return number;

  // Remove any leading zeros or spaces
  number = number.trim().replace(/^0+/, '');

  // Get calling code from COUNTRY_OPTIONS
  // Use countryCode if available, otherwise default to 'DE'
  const countryCode = primary.countryCode || 'DE';
  const country = COUNTRY_OPTIONS.find(c => c.code === countryCode);
  if (country) {
    return `+${country.callingCode} ${number}`;
  }

  return number;
};

// Get SVG flag component for country code
const FlagIcon = ({ countryCode, className = "h-4 w-6" }: { countryCode?: string; className?: string }) => {
  if (!countryCode || countryCode.length !== 2) return null;

  // @ts-ignore - Dynamic import from flag library
  const Flag = Flags[countryCode.toUpperCase()];

  if (!Flag) return null;

  return <Flag className={className} title={countryCode} />;
};

// Country code to full name mapping
const getCountryName = (countryCode?: string): string => {
  if (!countryCode) return '';
  const countryNames: Record<string, string> = {
    'DE': 'Deutschland',
    'AT': 'Österreich',
    'CH': 'Schweiz',
    'US': 'USA',
    'GB': 'Vereinigtes Königreich',
    'FR': 'Frankreich',
    'IT': 'Italien',
    'ES': 'Spanien',
    'NL': 'Niederlande',
    'BE': 'Belgien',
    'PL': 'Polen',
    'CZ': 'Tschechien',
    'DK': 'Dänemark',
    'SE': 'Schweden',
    'NO': 'Norwegen',
    'FI': 'Finnland'
  };
  return countryNames[countryCode] || countryCode;
};

// Konvertiert ReferencedJournalist zu ContactEnhanced Format für CRM-Anzeige
const convertReferenceToContact = (reference: ReferencedJournalist): ContactEnhanced => {
  return {
    id: reference._referenceId, // Verwende Reference-ID als lokale ID
    organizationId: '', // Wird vom CRM nicht benötigt für Anzeige
    displayName: reference.displayName,
    emails: reference.email ? [{ email: reference.email, isPrimary: true, type: 'work' as any }] : [],
    phones: reference.phone ? [{ number: reference.phone, isPrimary: true, type: 'work' as any }] : [],
    companyName: reference.companyName,
    position: reference.position,
    mediaProfile: {
      isJournalist: true,
      publicationIds: reference.publicationIds || [],
      beats: reference.beats || [],
      mediaTypes: reference.mediaTypes || [],
      preferredTopics: reference.beats || []
    },
    // Reference-spezifische Marker
    _isReference: true,
    _globalJournalistId: reference.id,
    _localNotes: reference._localMeta.notes,
    _localTags: reference._localMeta.tags || [],

    // Pflichtfelder für CRM-Kompatibilität
    createdAt: reference._localMeta.addedAt,
    updatedAt: reference._localMeta.addedAt,
    createdBy: 'reference-import',
    updatedBy: 'reference-import'
  } as any; // Type assertion da wir Reference-Felder hinzufügen
};

export default function ContactsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { autoGlobalMode } = useAutoGlobal();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialTab = searchParams.get('tab') === 'contacts' ? 'contacts' : 'companies';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyEnhanced | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactEnhanced | null>(null);
  
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
  // ViewMode entfernt - nur Listenansicht

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

  const loadData = useCallback(async () => {
    if (!user || !currentOrganization) return;
    setLoading(true);
    try {
const [companiesData, contactsData, tagsData] = await Promise.all([
        companiesEnhancedService.getAll(currentOrganization.id),
        contactsEnhancedService.getAll(currentOrganization.id), // ✨ Jetzt automatisch mit References!
        tagsEnhancedService.getAllAsLegacyTags(currentOrganization.id)
      ]);

      console.log('🏢 CRM DATA LOADED:', {
        companies: companiesData.length,
        contacts: contactsData.length, // Enthält jetzt auch References!
        tags: tagsData.length,
        organizationId: currentOrganization.id
      });

      // Log alle Kontakte mit globalMetadata
      const globalContacts = contactsData.filter(c => c.isGlobal);
      const journalistContacts = contactsData.filter(c => c.mediaProfile?.isJournalist);
      const globalJournalists = contactsData.filter(c => c.isGlobal && c.mediaProfile?.isJournalist);

      console.log('📊 CRM CONTACT BREAKDOWN:', {
        totalContacts: contactsData.length,
        globalContacts: globalContacts.length,
        journalistContacts: journalistContacts.length,
        globalJournalists: globalJournalists.length
      });

      if (globalJournalists.length > 0) {
        console.log('👥 GLOBAL JOURNALISTS in CRM:', globalJournalists.map(c => ({
          id: c.id,
          name: c.displayName,
          isGlobal: c.isGlobal,
          isJournalist: c.mediaProfile?.isJournalist,
          globalMetadata: c.globalMetadata
        })));
      }

      setCompanies(companiesData);
      setContacts(contactsData); // Enthält jetzt automatisch References!
      setTags(tagsData);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentOrganization]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentOrganization, loadData]);

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
                          company.industryClassification?.primary?.toLowerCase().includes(searchTerm.toLowerCase());
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
    // ✨ Contacts enthält jetzt automatisch References durch Enhanced Service!
    return contacts.filter(contact => {
      const searchMatch = contact.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getPrimaryEmail(contact.emails).toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      const companyMatch = selectedContactCompanyIds.length === 0 ||
                           (contact.companyId && selectedContactCompanyIds.includes(contact.companyId));
      if (!companyMatch) return false;

      const tagMatch = selectedContactTagIds.length === 0 ||
                       contact.tagIds?.some(tagId => selectedContactTagIds.includes(tagId));
      if (!tagMatch) return false;

      return true;
    }).sort((a, b) => {
      const aDate = new Date((a.updatedAt as any)?.seconds ? (a.updatedAt as any).seconds * 1000 : a.updatedAt);
      const bDate = new Date((b.updatedAt as any)?.seconds ? (b.updatedAt as any).seconds * 1000 : b.updatedAt);
      return bDate.getTime() - aDate.getTime();
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

  // Maps für Tags und Companies
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
        
        try {
          // Use Firebase deleteDoc directly
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/client-init');
          
          const collectionName = activeTab === 'companies' ? 'companies_enhanced' : 'contacts_enhanced';
          
          await Promise.all(ids.map(id => 
            deleteDoc(doc(db, collectionName, id))
          ));
          
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
          // Use Firebase deleteDoc directly
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase/client-init');
          
          const collectionName = type === 'company' ? 'companies_enhanced' : 'contacts_enhanced';
          await deleteDoc(doc(db, collectionName, id));
          
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
    const isCompaniesTab = activeTab === 'companies';
    const filename = isCompaniesTab ? 'firmen-export.csv' : 'kontakte-export.csv';

    try {
      let csvContent: string;
      
      if (isCompaniesTab) {
        csvContent = exportCompaniesToCSV(filteredCompanies, tagsMap, {
          includeIds: false,
          includeTimestamps: false,
          includeTags: true
        });
      } else {
        csvContent = exportContactsToCSV(filteredContacts, companiesMap, tagsMap, {
          includeIds: false,
          includeTimestamps: false,
          includeTags: true
        });
      }

      if (!csvContent || (filteredCompanies.length === 0 && filteredContacts.length === 0)) {
        showAlert('warning', 'Keine Daten zum Exportieren');
        return;
      }

      downloadCSV(csvContent, filename);
      showAlert('success', `Export erfolgreich: ${filename}`);
    } catch (error) {
      // Export error logged via alert system
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

  // Berechne Contact Count für Companies
const getContactCount = (companyId: string) => {
  const count = contacts.filter(contact => contact.companyId === companyId).length;
  // Company contact count tracked internally
  return count;
};

  // Get last contact date
  const getLastContactDate = (companyId: string) => {
    const companyContacts = contacts.filter(contact => contact.companyId === companyId);
    if (companyContacts.length === 0) return null;
    
    // Sort by createdAt and return the most recent
    const sorted = companyContacts.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sorted[0]?.createdAt;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-zinc-950 dark:text-white">Kontakte</h1>
      </div>

      {/* Alert - Fixed height container */}
      <div className="mb-4 h-[50px]">
        {alert && (
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        )}
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
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`${activeTab === 'companies' ? 'Firmen' : 'Personen'} durchsuchen...`}
              className={clsx(
                'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
                'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                'dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-700',
                'h-10'
              )}
            />
          </div>

          {/* Add Button */}
          <Button
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-10 px-6"
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
            <PlusIcon className="h-4 w-4 mr-2" />
            Neu hinzufügen
          </Button>

          {/* Filter Button - nur Icon */}
          <Popover className="relative">
            {({ open }) => {
              const activeFiltersCount = activeTab === 'companies'
                ? (selectedTypes.length + selectedCompanyTagIds.length)
                : (selectedContactCompanyIds.length + selectedContactTagIds.length);

              // Get tags that are actually used in the current filtered data
              const usedTagIds = new Set<string>();
              if (activeTab === 'companies') {
                filteredCompanies.forEach(company => {
                  company.tagIds?.forEach(tagId => usedTagIds.add(tagId));
                });
              } else {
                filteredContacts.forEach(contact => {
                  contact.tagIds?.forEach(tagId => usedTagIds.add(tagId));
                });
              }
              const usedTags = tagOptions.filter(tag => tag.id && usedTagIds.has(tag.id));

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
                      options: usedTags.map(tag => ({ value: tag.id!, label: tag.name }))
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
                      options: usedTags.map(tag => ({ value: tag.id!, label: tag.name }))
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
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    )}
                    aria-label="Filter"
                  >
                    <FunnelIcon className="h-5 w-5 stroke-2" />
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
                    <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px] origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                      <div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                        {filters.map((filter) => (
                          <div key={filter.id} className="mb-[10px]">
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
                                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                  {filter.label}
                                </label>
                                {filter.type === 'multiselect' ? (
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {filter.options.map((option) => {
                                      const currentValues = values[filter.id as keyof typeof values];
                                      const currentValuesArray = Array.isArray(currentValues) ? currentValues : [];
                                      const isChecked = currentValuesArray.includes(option.value);

                                      return (
                                        <label
                                          key={option.value}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <Checkbox
                                            checked={isChecked}
                                            onChange={(checked: boolean) => {
                                              const newValues = checked
                                                ? [...currentValuesArray, option.value]
                                                : currentValuesArray.filter(v => v !== option.value);
                                              onChange(filter.id, newValues);
                                            }}
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

                        {activeFiltersCount > 0 && (
                          <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-700">
                            <button
                              onClick={onReset}
                              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
                            >
                              Zurücksetzen
                            </button>
                          </div>
                        )}
                      </div>
                    </Popover.Panel>
                  </Transition>
                </>
              );
            }}
          </Popover>

          {/* Actions Button - nur 3 Punkte */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-2.5 text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 h-10 w-10">
              <EllipsisVerticalIcon className="h-5 w-5 stroke-[2.5]" />
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
              · {activeTab === 'companies' ? selectedCompanyIds.size : selectedContactIds.size} ausgewählt
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

      {/* Listen-Rendering */}
      <div>
        {activeTab === 'companies' ? (
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
                {paginatedCompanies.map((company) => (
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
                            <DropdownItem onClick={() => router.push(`/dashboard/contacts/crm/companies/${company.id}`)}>
                              <EyeIcon className="h-4 w-4" />
                              Anzeigen
                            </DropdownItem>
                            <DropdownItem
                              onClick={() => {
                                setSelectedCompany(company);
                                setShowCompanyModal(true);
                              }}
                              disabled={(company as any)?._isReference}
                              className={(company as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <PencilIcon className="h-4 w-4" />
                              Bearbeiten {(company as any)?._isReference && '(Verweis)'}
                            </DropdownItem>
                            <DropdownDivider />
                            <DropdownItem
                              onClick={() => handleDelete(company.id!, company.name, 'company')}
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
          ) : (
            // Contacts Table mit Enhanced Data
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center">
                  <div className="flex items-center w-[25%]">
                    <Checkbox
                      checked={paginatedContacts.length > 0 && selectedContactIds.size === paginatedContacts.length}
                      indeterminate={selectedContactIds.size > 0 && selectedContactIds.size < paginatedContacts.length}
                      onChange={(checked: boolean) => handleSelectAllContacts(checked)}
                    />
                    <span className="ml-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Name
                    </span>
                  </div>
                  <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Firma / Position
                  </div>
                  <div className="w-[20%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Telefon / E-Mail
                  </div>
                  <div className="w-[10%] text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Social Media
                  </div>
                  <div className="flex-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pr-14">
                    Tags
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedContacts.map((contact) => (
                  <div key={contact.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      {/* Name */}
                      <div className="flex items-center w-[25%]">
                        <Checkbox
                          checked={selectedContactIds.has(contact.id!)}
                          onChange={(checked: boolean) => {
                            const newIds = new Set(selectedContactIds);
                            if (checked) newIds.add(contact.id!);
                            else newIds.delete(contact.id!);
                            setSelectedContactIds(newIds);
                          }}
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <button
                            onClick={() => router.push(`/dashboard/contacts/crm/contacts/${contact.id}`)}
                            className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary truncate block text-left"
                          >
                            {contact.displayName}
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex flex-wrap gap-1">
                              {contact.mediaProfile?.isJournalist && (
                                <Badge color="purple" className="text-xs">
                                  Journalist
                                </Badge>
                              )}
                              {(contact as any)._isReference && (
                                <Badge color="blue" className="text-xs">
                                  🌐 Verweis
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Firma / Position */}
                      <div className="w-[20%]">
                        <div className="text-sm">
                          {contact.companyName && (
                            <div className="text-zinc-900 dark:text-white font-medium truncate">
                              {contact.companyName}
                            </div>
                          )}
                          {contact.position && (
                            <div className="text-zinc-600 dark:text-zinc-400 text-xs truncate mt-0.5">
                              {contact.position}
                            </div>
                          )}
                          {!contact.companyName && !contact.position && (
                            <span className="text-zinc-400">—</span>
                          )}
                        </div>
                      </div>

                      {/* Telefon / E-Mail */}
                      <div className="w-[20%]">
                        <div className="space-y-1">
                          {getPrimaryPhone(contact.phones) ? (
                            <a
                              href={`tel:${getPrimaryPhone(contact.phones)}`}
                              className="text-sm text-primary hover:text-primary-hover flex items-center gap-1.5"
                            >
                              <PhoneIcon className="h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
                              <span className="truncate">{getPrimaryPhone(contact.phones)}</span>
                            </a>
                          ) : (
                            <div className="text-sm text-zinc-400 flex items-center gap-1.5">
                              <PhoneIcon className="h-4 w-4 shrink-0" />
                              <span>—</span>
                            </div>
                          )}
                          {getPrimaryEmail(contact.emails) ? (
                            <a
                              href={`mailto:${getPrimaryEmail(contact.emails)}`}
                              className="text-sm text-primary hover:text-primary-hover flex items-center gap-1.5 min-w-0"
                              title={getPrimaryEmail(contact.emails)}
                            >
                              <EnvelopeIcon className="h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
                              <span className="truncate block max-w-[160px]">{getPrimaryEmail(contact.emails)}</span>
                            </a>
                          ) : (
                            <div className="text-sm text-zinc-400 flex items-center gap-1.5">
                              <EnvelopeIcon className="h-4 w-4 shrink-0" />
                              <span>—</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Social Media */}
                      <div className="w-[10%]">
                        {contact.socialProfiles && contact.socialProfiles.length > 0 ? (
                          <div className="flex gap-2">
                            {contact.socialProfiles.map((profile, idx) => (
                              <a
                                key={idx}
                                href={profile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-500 hover:text-primary transition-colors"
                                title={profile.platform}
                              >
                                {profile.platform.toLowerCase() === 'linkedin' && (
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                )}
                                {profile.platform.toLowerCase() === 'twitter' && (
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                )}
                                {profile.platform.toLowerCase() === 'facebook' && (
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                                )}
                                {profile.platform.toLowerCase() === 'instagram' && (
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                )}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400">—</span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex-1 pr-14">
                        <div className="flex flex-wrap gap-1">
                          {contact.tagIds?.slice(0, 3).map(tagId => {
                            const tag = tags.find(t => t.id === tagId);
                            return tag ? <Badge key={tag.id} color={tag.color as any} className="text-xs">{tag.name}</Badge> : null;
                          })}
                          {contact.tagIds && contact.tagIds.length > 3 && (
                            <span className="text-xs text-zinc-400">+{contact.tagIds.length - 3}</span>
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
                            <DropdownItem onClick={() => router.push(`/dashboard/contacts/crm/contacts/${contact.id}`)}>
                              <EyeIcon className="h-4 w-4" />
                              Anzeigen
                            </DropdownItem>
                            <DropdownItem
                              onClick={() => {
                                setSelectedContact(contact);
                                setShowContactModal(true);
                              }}
                              disabled={(contact as any)?._isReference}
                              className={(contact as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <PencilIcon className="h-4 w-4" />
                              Bearbeiten {(contact as any)?._isReference && '(Verweis)'}
                            </DropdownItem>
                            <DropdownDivider />
                            <DropdownItem
                              onClick={() => handleDelete(contact.id!, contact.displayName, 'contact')}
                              disabled={(contact as any)?._isReference}
                              className={(contact as any)?._isReference ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span className="text-red-600">Löschen {(contact as any)?._isReference && '(Verweis)'}</span>
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
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
            setShowCompanyModal(false);
            setSelectedCompany(null);
          }} 
          userId={user?.uid || ''}
          organizationId={currentOrganization?.id || user?.uid || ''}
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
              setShowContactModal(false);
              setSelectedContact(null);
            } catch (error) {
              // Error handled via alert system
              showAlert('error', 'Fehler beim Speichern', 'Bitte prüfen Sie die Konsole für Details.');
            }
          }} 
          userId={user?.uid || ''}
          organizationId={currentOrganization?.id || user?.uid || ''}
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
              className={confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}

// src/app/dashboard/contacts/crm/companies/[companyId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
import { companiesEnhancedService, contactsEnhancedService, tagsEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { publicationService, advertisementService } from "@/lib/firebase/library-service";
import { listsService } from "@/lib/firebase/lists-service";
import { CompanyEnhanced, ContactEnhanced, COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS } from "@/types/crm-enhanced";
import { Tag, companyTypeLabels, socialPlatformLabels } from "@/types/crm";
import { Publication, Advertisement } from "@/types/library";
import { DistributionList } from "@/types/lists";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import CompanyModal from '@/app/dashboard/contacts/crm/CompanyModal';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
  UsersIcon,
  DocumentTextIcon,
  PencilIcon,
  HashtagIcon,
  ChartBarIcon,
  ListBulletIcon,
  LinkIcon,
  NewspaperIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyEuroIcon,
  ScaleIcon,
  BuildingOffice2Icon,
  IdentificationIcon,
  BanknotesIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

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

// Helper functions
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unbekannt';
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatCurrency = (amount?: number, currency: string = 'EUR') => {
  if (!amount) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

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

// Social Media Icons Component
const SocialMediaIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, JSX.Element> = {
    linkedin: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    ),
    twitter: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
      </svg>
    ),
    xing: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.188 0c-.517 0-.741.325-.927.66 0 0-7.455 13.224-7.702 13.657.015.024 4.919 9.023 4.919 9.023.17.308.436.66.967.66h3.454c.211 0 .375-.078.463-.22.089-.151.089-.346-.009-.536l-4.879-8.916c-.004-.006-.004-.016 0-.022l7.614-13.49c.098-.189.098-.384.009-.535-.088-.142-.252-.22-.463-.22h-3.446zM3.648 4.74c-.211 0-.385.074-.473.216-.09.149-.078.339.02.531l2.34 4.05c.004.01.004.016 0 .021l-3.678 6.402c-.098.189-.098.389-.009.539.089.142.258.22.47.22h3.461c.518 0 .766-.348.945-.667l3.734-6.502-2.378-4.155c-.172-.286-.429-.655-.962-.655h-3.47z"/>
      </svg>
    ),
    facebook: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    instagram: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
      </svg>
    )
  };

  return icons[platform] || <LinkIcon className="h-5 w-5" />;
};

// Alert Component
function Alert({
  type = 'info',
  title
}: {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-3 ${styles[type].split(' ')[0]}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${type === 'success' ? 'text-green-400' : type === 'info' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        <p className={`text-sm font-medium ${styles[type].split(' ')[1]} truncate`}>{title}</p>
      </div>
    </div>
  );
}

// InfoCard Component
function InfoCard({
  title,
  icon: Icon,
  children,
  className = "",
  action
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={clsx("rounded-lg border border-zinc-200 bg-white overflow-hidden", className)}>
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">
            {title}
          </h3>
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { autoGlobalMode } = useAutoGlobal();
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  // States
  const [company, setCompany] = useState<CompanyEnhanced | null>(null);
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [parentCompany, setParentCompany] = useState<CompanyEnhanced | null>(null);
  const [subsidiaries, setSubsidiaries] = useState<CompanyEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string } | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string) => {
    setAlert({ type, title });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Notes Management
  const handleEditNotes = () => {
    setNotesValue(company?.internalNotes || '');
    setEditingNotes(true);
  };

  const handleCancelEditNotes = () => {
    setEditingNotes(false);
    setNotesValue('');
  };

  const handleSaveNotes = async () => {
    if (!company || !currentOrganization?.id) return;

    setSavingNotes(true);
    try {
      await companiesEnhancedService.update(
        company.id!,
        { internalNotes: notesValue },
        { organizationId: currentOrganization.id, userId: user!.uid }
      );

      setCompany({ ...company, internalNotes: notesValue });
      setEditingNotes(false);
      showAlert('success', 'Notiz gespeichert');
    } catch (error) {
      showAlert('error', 'Fehler beim Speichern der Notiz');
    } finally {
      setSavingNotes(false);
    }
  };

  // Data Loading
  const loadData = useCallback(async () => {
    if (!user || !companyId || !currentOrganization?.id) return;
    setLoading(true);
    setError(null);
    
    const organizationId = currentOrganization.id;
    
    try {
      // Load company
      const companyData = await companiesEnhancedService.getById(companyId, organizationId);
      if (companyData) {
        setCompany(companyData);
        
        // Load related data in parallel
        const [allContacts, allLists, tagsData] = await Promise.all([
          contactsEnhancedService.getAll(organizationId),
          listsService.getAll(organizationId),
          companyData.tagIds && companyData.tagIds.length > 0 
            ? tagsEnhancedService.getAllAsLegacyTags(organizationId).then(allTags => 
                allTags.filter(tag => companyData.tagIds?.includes(tag.id!))
              )
            : Promise.resolve([])
        ]);
        
        // Filter contacts for this company
        const contactsData = allContacts.filter(contact => contact.companyId === companyId);
        setContacts(contactsData);
        setTags(tagsData);

        // Filter lists that contain this company
        const companyLists = allLists.filter((list: DistributionList) => {
          if (list.type === 'static' && list.contactIds) {
            return contactsData.some((contact: ContactEnhanced) => list.contactIds?.includes(contact.id!));
          } else if (list.type === 'dynamic' && list.filters) {
            if (list.filters.companyTypes?.includes(companyData.type)) return true;
            if (list.filters.industries?.includes(companyData.industryClassification?.primary!)) return true;
            if (list.filters.countries?.includes(companyData.mainAddress?.countryCode!)) return true;
          }
          return false;
        });
        
        setLists(companyLists);

        // Load publications for media companies
        if (['publisher', 'media_house', 'agency'].includes(companyData.type)) {
          const [pubs, ads] = await Promise.all([
            publicationService.getAll(organizationId).then(allPubs => 
              allPubs.filter(pub => pub.publisherId === companyId)
            ),
            advertisementService.getAll(organizationId)
          ]);
          setPublications(pubs);
          
          // Filter advertisements for this company's publications
          const companyAds = ads.filter(ad => 
            ad.publicationIds.some(pubId => 
              pubs.some(pub => pub.id === pubId)
            )
          );
          setAdvertisements(companyAds);
        }

        // Load parent company if exists
        if (companyData.parentCompanyId) {
          try {
            const parent = await companiesEnhancedService.getById(companyData.parentCompanyId, organizationId);
            setParentCompany(parent);
          } catch (err) {
            // Error loading parent company - operation tracked internally
          }
        }

        // Load subsidiaries if exists
        if (companyData.subsidiaryIds && companyData.subsidiaryIds.length > 0) {
          try {
            const subsPromises = companyData.subsidiaryIds.map(id => 
              companiesEnhancedService.getById(id, organizationId)
            );
            const subs = await Promise.all(subsPromises);
            setSubsidiaries(subs.filter(Boolean) as CompanyEnhanced[]);
          } catch (err) {
            // Error loading subsidiaries - operation tracked internally
          }
        }
      } else {
        setError("Firma nicht gefunden.");
      }
    } catch (err: any) {
      setError("Fehler beim Laden der Daten.");
      // Error handled via UI feedback
    } finally {
      setLoading(false);
    }
  }, [user, companyId, currentOrganization?.id]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper function to get status/lifecycle labels
  const getStatusLabel = (status?: string) => {
    return COMPANY_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status || 'Unbekannt';
  };

  const getLifecycleLabel = (stage?: string) => {
    return LIFECYCLE_STAGE_OPTIONS.find(opt => opt.value === stage)?.label || stage || 'Unbekannt';
  };

  // Helper function to count contacts per publication
  const getContactsPerPublication = (publicationId: string) => {
    // This would need to be implemented based on your contact-publication relationship
    return 0; // Placeholder
  };

  // Get last contact date
  const getLastContactDate = () => {
    if (contacts.length === 0) return null;
    
    // Sort by createdAt and return the most recent
    const sorted = contacts.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sorted[0]?.createdAt;
  };

  const isMediaCompany = company && ['publisher', 'media_house', 'agency'].includes(company.type);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Firmendaten...</Text>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <Alert type="error" title="Fehler" message={error} />
        <div className="mt-4">
          <Button
            onClick={() => router.push('/dashboard/contacts/crm/')}
            className="border border-zinc-300 bg-white text-zinc-700
                       hover:bg-zinc-50 font-medium whitespace-nowrap
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                       h-10 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!company) {
    return (
      <div className="p-8 text-center">
        <Text>Firma konnte nicht gefunden werden.</Text>
        <div className="mt-4">
          <Button
            onClick={() => router.push('/dashboard/contacts/crm/')}
            className="border border-zinc-300 bg-white text-zinc-700
                       hover:bg-zinc-50 font-medium whitespace-nowrap
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                       h-10 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              {/* Heading mit Badges */}
              <div className="flex items-center gap-3">
                <Heading>{company.name}</Heading>
                <div className="flex items-center gap-2">
                  <Badge color="zinc" className="whitespace-nowrap">{companyTypeLabels[company.type]}</Badge>
                  {company.status && (
                    <Badge
                      color={company.status === 'active' ? 'green' : company.status === 'inactive' ? 'yellow' : 'zinc'}
                      className="whitespace-nowrap"
                    >
                      {getStatusLabel(company.status)}
                    </Badge>
                  )}
                  {company.lifecycleStage && (
                    <Badge color="blue" className="whitespace-nowrap">
                      {getLifecycleLabel(company.lifecycleStage)}
                    </Badge>
                  )}
                </div>
              </div>

              {company.officialName && company.officialName !== company.name && (
                <Text className="text-zinc-600 mt-1">{company.officialName}</Text>
              )}

              {/* Adresse mit Gründungsdatum */}
              {company.mainAddress && (
                <div className="mt-3 flex items-start gap-2 text-sm text-zinc-600">
                  <MapPinIcon className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div>
                    {company.mainAddress.street && <span>{company.mainAddress.street}, </span>}
                    {company.mainAddress.countryCode && <span>{company.mainAddress.countryCode} </span>}
                    {company.mainAddress.postalCode && <span>{company.mainAddress.postalCode} </span>}
                    {company.mainAddress.city && <span>{company.mainAddress.city}</span>}
                    {company.foundedDate && (() => {
                      try {
                        // Skip if foundedDate is an empty object or invalid
                        if (typeof company.foundedDate === 'object' && Object.keys(company.foundedDate).length === 0) {
                          return null;
                        }

                        let date;
                        // Handle Firestore Timestamp object
                        if (company.foundedDate.toDate && typeof company.foundedDate.toDate === 'function') {
                          date = company.foundedDate.toDate();
                        } else if (company.foundedDate.seconds) {
                          // Plain object with seconds/nanoseconds
                          date = new Date(company.foundedDate.seconds * 1000);
                        } else {
                          date = new Date(company.foundedDate);
                        }

                        const year = date.getFullYear();
                        if (isNaN(year) || year < 1800 || year > 2100) {
                          return null;
                        }
                        return (
                          <span className="ml-2 text-zinc-500">
                            (gegr. {year})
                          </span>
                        );
                      } catch (error) {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard/contacts/crm/')}
                className="border border-zinc-300 bg-white text-zinc-700
                           hover:bg-zinc-50 font-medium whitespace-nowrap
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                           h-10 px-6 rounded-lg transition-colors inline-flex items-center"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück
              </Button>

              {(company as any)?._isReference ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-amber-800">
                    <span className="text-amber-600">🔗</span>
                    <span className="font-medium">Globaler Verweis</span>
                  </div>
                  <p className="text-amber-700 mt-1">
                    Diese Firma ist ein Verweis auf globale Daten und kann nicht bearbeitet werden.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => setShowEditModal(true)}
                  className="bg-primary hover:bg-primary-hover text-white font-medium whitespace-nowrap
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                             h-10 px-6 rounded-lg transition-colors inline-flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Firma bearbeiten
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Alert - Fixed height container */}
        <div className="mb-6 h-[50px]">
          {alert && (
            <Alert type={alert.type} title={alert.title} />
          )}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Information - Consolidated */}
            <InfoCard title="Allgemeine Informationen" icon={BuildingOfficeIcon}>
              <div className="space-y-6">
                {/* Contact Data */}
                <div>
                  <Text className="text-sm font-semibold text-zinc-700 mb-3">Kontaktdaten</Text>
                  <div className="space-y-3">
                    {company.emails && company.emails.length > 0 && (
                      <div>
                        {company.emails.map((email, index) => (
                          <div key={index} className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-3">
                              <EnvelopeIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                              <a
                                href={`mailto:${email.email}`}
                                className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                              >
                                {email.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge color="zinc" className="text-xs">
                                {email.type === 'general' ? 'Allgemein' :
                                 email.type === 'support' ? 'Support' :
                                 email.type === 'sales' ? 'Vertrieb' :
                                 email.type === 'billing' ? 'Buchhaltung' :
                                 email.type === 'press' ? 'Presse' : email.type}
                              </Badge>
                              {email.isPrimary && <Badge color="green" className="text-xs">Primär</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {company.phones && company.phones.length > 0 && (
                      <div>
                        {company.phones.map((phone, index) => {
                          // Format phone number with country code
                          let formattedNumber = phone.number || '';

                          // If number already starts with +, use as is
                          if (!formattedNumber.startsWith('+')) {
                            // Remove any leading zeros or spaces
                            formattedNumber = formattedNumber.trim().replace(/^0+/, '');

                            // Get calling code from COUNTRY_OPTIONS
                            const countryCode = phone.countryCode || 'DE';
                            const country = COUNTRY_OPTIONS.find(c => c.code === countryCode);
                            if (country) {
                              formattedNumber = `+${country.callingCode} ${formattedNumber}`;
                            }
                          }

                          return (
                            <div key={index} className="flex items-center justify-between gap-3 mb-1">
                              <div className="flex items-center gap-3">
                                <PhoneIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                                <a
                                  href={`tel:${phone.number}`}
                                  className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                                >
                                  {formattedNumber}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge color="zinc" className="text-xs">
                                  {phone.type === 'business' ? 'Geschäftlich' :
                                   phone.type === 'mobile' ? 'Mobil' :
                                   phone.type === 'fax' ? 'Fax' : phone.type}
                                </Badge>
                                {phone.isPrimary && <Badge color="green" className="text-xs">Primär</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {company.website && (
                      <div className="flex items-center gap-3">
                        <GlobeAltIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}

                    {/* Social Media unter Kontaktdaten */}
                    {company.socialMedia && company.socialMedia.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {company.socialMedia.map((social, index) => {
                          const platformLabel = socialPlatformLabels[social.platform as keyof typeof socialPlatformLabels] || social.platform || 'Unbekannt';
                          return (
                            <a
                              key={index}
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              title={platformLabel}
                            >
                              <div className="text-zinc-700">
                                <SocialMediaIcon platform={social.platform} />
                              </div>
                              <span className="text-sm font-medium">{platformLabel}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {(!company.emails?.length && !company.phones?.length && !company.website && !company.socialMedia?.length) && (
                      <Text className="text-zinc-500">Keine Kontaktdaten hinterlegt</Text>
                    )}
                  </div>
                </div>

                {/* Business Identifiers */}
                {company.identifiers && company.identifiers.length > 0 && (
                  <div>
                    <Text className="text-sm font-semibold text-zinc-700 mb-3">Geschäftliche Kennungen</Text>
                    <div className="space-y-2">
                      {company.identifiers.map((identifier, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <Text className="text-sm">
                            <span className="font-medium">
                              {identifier.type === 'VAT_EU' ? 'USt-IdNr. (EU)' :
                               identifier.type === 'EIN_US' ? 'EIN (US)' :
                               identifier.type === 'COMPANY_REG_DE' ? 'Handelsregister (DE)' :
                               identifier.type === 'COMPANY_REG_UK' ? 'Companies House (UK)' :
                               identifier.type === 'UID_CH' ? 'UID (CH)' :
                               identifier.type === 'SIREN_FR' ? 'SIREN (FR)' :
                               identifier.type === 'DUNS' ? 'D-U-N-S' :
                               identifier.type === 'LEI' ? 'LEI' : identifier.type}
                            </span>
                            {': '}
                            <span className="text-zinc-600">{identifier.value}</span>
                          </Text>
                          {identifier.issuingAuthority && (
                            <Badge color="zinc" className="text-xs">{identifier.issuingAuthority}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Information */}
                {company.financial && (
                  <div>
                    <Text className="text-sm font-semibold text-zinc-700 mb-3">Finanzen</Text>
                    <div className="grid grid-cols-2 gap-4">
                      {company.financial.annualRevenue && (
                        <div>
                          <Text className="text-sm font-medium text-zinc-500">Jahresumsatz</Text>
                          <Text className="text-lg font-semibold">
                            {formatCurrency(
                              company.financial.annualRevenue.amount,
                              company.financial.annualRevenue.currency
                            )}
                          </Text>
                        </div>
                      )}
                      {company.financial.employees !== undefined && (
                        <div>
                          <Text className="text-sm font-medium text-zinc-500">Mitarbeiterzahl</Text>
                          <Text className="text-lg font-semibold">{company.financial.employees.toLocaleString('de-DE')}</Text>
                        </div>
                      )}
                      {company.financial.creditRating && (
                        <div>
                          <Text className="text-sm font-medium text-zinc-500">Kreditrating</Text>
                          <Text className="text-lg font-semibold">{company.financial.creditRating}</Text>
                        </div>
                      )}
                      {company.financial.fiscalYearEnd && (
                        <div>
                          <Text className="text-sm font-medium text-zinc-500">Geschäftsjahresende</Text>
                          <Text>{company.financial.fiscalYearEnd}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>

            {/* Corporate Structure */}
            {(company.parentCompanyId || company.subsidiaryIds?.length) && (
              <InfoCard title="Konzernstruktur" icon={BuildingOffice2Icon}>
                <div className="space-y-4">
                  {parentCompany && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-500 mb-2">Muttergesellschaft</Text>
                      <Link
                        href={`/dashboard/contacts/crm/companies/${parentCompany.id}`}
                        className="flex items-center gap-2 text-[#005fab] hover:text-[#004a8c] hover:underline"
                      >
                        <BuildingOffice2Icon className="h-5 w-5" />
                        {parentCompany.name}
                      </Link>
                    </div>
                  )}

                  {subsidiaries.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-500 mb-2">
                        Tochtergesellschaften ({subsidiaries.length})
                      </Text>
                      <div className="space-y-1">
                        {subsidiaries.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/dashboard/contacts/crm/companies/${sub.id}`}
                            className="flex items-center gap-2 text-[#005fab] hover:text-[#004a8c] hover:underline"
                          >
                            <BuildingOffice2Icon className="h-4 w-4" />
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Contacts */}
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Kontakte
                  </h3>
                  <Badge color="blue">{contacts.length}</Badge>
                </div>
              </div>
              <div className="p-4">
                {contacts.length > 0 ? (
                  <div className="space-y-3">
                    {contacts.map(contact => (
                      <div key={contact.id} className="flex items-start justify-between p-3 rounded-lg hover:bg-zinc-50 transition-colors">
                        <div className="flex-1">
                          <Link
                            href={`/dashboard/contacts/crm/contacts/${contact.id}`}
                            className="text-[#005fab] hover:text-[#004a8c] hover:underline font-medium"
                          >
                            {contact.displayName}
                          </Link>
                          {contact.position && (
                            <span className="text-sm text-zinc-500 ml-2">• {contact.position}</span>
                          )}
                          {contact.mediaProfile?.isJournalist && (
                            <Badge color="purple" className="text-xs ml-2">Journalist</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getPrimaryEmail(contact.emails) && (
                            <a
                              href={`mailto:${getPrimaryEmail(contact.emails)}`}
                              className="text-zinc-400 hover:text-[#005fab] transition-colors"
                              title="E-Mail senden"
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </a>
                          )}
                          {getPrimaryPhone(contact.phones) && (
                            <a
                              href={`tel:${getPrimaryPhone(contact.phones)}`}
                              className="text-zinc-400 hover:text-[#005fab] transition-colors"
                              title="Anrufen"
                            >
                              <PhoneIcon className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                    <Text className="text-zinc-500">Keine Kontakte vorhanden</Text>
                  </div>
                )}
              </div>
            </div>


            {/* Notes */}
            <InfoCard
              title="Interne Notizen"
              icon={DocumentTextIcon}
              action={
                !editingNotes ? (
                  <button
                    onClick={handleEditNotes}
                    className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50
                               font-medium whitespace-nowrap transition-colors
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                               h-8 px-4 rounded-lg inline-flex items-center gap-1.5 text-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Bearbeiten
                  </button>
                ) : null
              }
            >
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={6}
                    placeholder="Interne Notizen hinzufügen..."
                    className="w-full"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="bg-primary hover:bg-primary-hover text-white h-9 px-4"
                    >
                      <CheckIcon className="h-4 w-4 mr-2" />
                      {savingNotes ? 'Speichern...' : 'Speichern'}
                    </Button>
                    <Button
                      onClick={handleCancelEditNotes}
                      disabled={savingNotes}
                      className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 h-9 px-4"
                    >
                      <XMarkIcon className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-zinc-700">
                  {company.internalNotes || 'Keine Notizen vorhanden'}
                </p>
              )}
            </InfoCard>
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-6">
            {/* Details */}
            <InfoCard title="Details" icon={InformationCircleIcon}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                  <div>
                    <span className="text-zinc-600">Erstellt:</span>
                    <span className="ml-2">{formatDate(company.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                  <div>
                    <span className="text-zinc-600">Aktualisiert:</span>
                    <span className="ml-2">{formatDate(company.updatedAt)}</span>
                  </div>
                </div>
                {getLastContactDate() && (
                  <div className="flex items-center gap-3">
                    <UsersIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                    <div>
                      <span className="text-zinc-600">Letzter Kontakt:</span>
                      <span className="ml-2">{formatDate(getLastContactDate())}</span>
                    </div>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="pt-3 border-t border-zinc-200">
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge key={tag.id} color={tag.color as any} className="whitespace-nowrap">{tag.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>

            {/* Publications for Media Companies */}
            {isMediaCompany && publications.length > 0 && (
              <InfoCard title="Publikationen" icon={NewspaperIcon}>
                <div className="space-y-3">
                  {publications.map(publication => {
                    const adCount = advertisements.filter(ad =>
                      ad.publicationIds.includes(publication.id!)
                    ).length;

                    return (
                      <div key={publication.id} className="border border-zinc-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-base">{publication.title}</h4>
                            <Link
                              href={`/dashboard/library/publications/${publication.id}`}
                              className="text-sm text-primary hover:text-primary-hover underline whitespace-nowrap ml-2"
                            >
                              Anzeigen
                            </Link>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge color="blue" className="text-xs whitespace-nowrap">
                              {publication.type}
                            </Badge>
                            {publication.verified && (
                              <Badge color="green" className="text-xs whitespace-nowrap">
                                Verifiziert
                              </Badge>
                            )}
                            {adCount > 0 && (
                              <Badge color="purple" className="text-xs whitespace-nowrap">
                                {adCount} Werbemittel
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </InfoCard>
            )}

            {/* Distribution lists */}
            {lists.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-900">
                      In Listen enthalten
                    </h3>
                    <Badge color="blue">{lists.length}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-2">
                    {lists.map(list => (
                      <li key={list.id} className="flex items-center justify-between">
                        <Link 
                          href={`/dashboard/contacts/lists/${list.id}`} 
                          className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                        >
                          {list.name}
                        </Link>
                        <Badge 
                          color={list.type === 'dynamic' ? 'green' : 'zinc'} 
                          className="text-xs whitespace-nowrap"
                        >
                          {list.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {showEditModal && !(company as any)?._isReference && (
        <CompanyModal
          company={company}
          userId={user!.uid}
          organizationId={currentOrganization?.id || user!.uid}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            loadData();
            showAlert('success', 'Firma erfolgreich aktualisiert');
          }}
        />
      )}
    </>
  );
}
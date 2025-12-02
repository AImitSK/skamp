// src/app/dashboard/contacts/crm/contacts/[contactId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
import { contactsEnhancedService, companiesEnhancedService, tagsEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { listsService } from "@/lib/firebase/lists-service";
import { publicationService } from "@/lib/firebase/library-service";
import { ContactEnhanced, CompanyEnhanced, CONTACT_STATUS_OPTIONS, COMMUNICATION_CHANNELS, MEDIA_TYPES, SUBMISSION_FORMATS } from "@/types/crm-enhanced";
import { Tag, socialPlatformLabels } from "@/types/crm";
import { DistributionList } from "@/types/lists";
import { Publication } from "@/types/library";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import ContactModalEnhanced from "@/app/dashboard/contacts/crm/ContactModalEnhanced";
import { toastService } from '@/lib/utils/toast';
import {
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  PencilIcon,
  ListBulletIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  LanguageIcon,
  CakeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  IdentificationIcon,
  CheckBadgeIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import clsx from 'clsx';

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
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatBirthday = (date: any) => {
  if (!date) return '';

  // Handle Date object
  if (date instanceof Date) {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long'
    });
  }

  // Handle Firestore Timestamp with toDate method
  if ((date as any).toDate) {
    return (date as any).toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long'
    });
  }

  // Handle plain Timestamp object {seconds, nanoseconds}
  const ts = date as any;
  if (ts.seconds !== undefined) {
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long'
    });
  }

  return '';
};

const getPrimaryEmail = (emails?: Array<{ email: string; isPrimary?: boolean; type?: string }>): { email: string; type?: string } | null => {
  if (!emails || emails.length === 0) return null;
  const primary = emails.find(e => e.isPrimary);
  return primary || emails[0];
};

const getPrimaryPhone = (phones?: Array<{ number: string; countryCode?: string; isPrimary?: boolean; type?: string }>): { number: string; type?: string } | null => {
  if (!phones || phones.length === 0) return null;
  const primary = phones.find(p => p.isPrimary);
  return primary || phones[0];
};

const formatPhoneNumber = (phone: { number: string; countryCode?: string }): string => {
  let number = phone.number || '';

  // If number already starts with +, return as is
  if (number.startsWith('+')) return number;

  // Remove any leading zeros or spaces
  number = number.trim().replace(/^0+/, '');

  // Get calling code from COUNTRY_OPTIONS
  const countryCode = phone.countryCode || 'DE';
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
          <h3 className="text-base font-semibold text-zinc-900">
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

export default function ContactDetailPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { autoGlobalMode } = useAutoGlobal();
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  // States
  const [contact, setContact] = useState<ContactEnhanced | null>(null);
  const [company, setCompany] = useState<CompanyEnhanced | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Notes Management
  const handleEditNotes = () => {
    setNotesValue(contact?.internalNotes || '');
    setEditingNotes(true);
  };

  const handleCancelEditNotes = () => {
    setEditingNotes(false);
    setNotesValue('');
  };

  const handleSaveNotes = async () => {
    if (!contact || !currentOrganization?.id) return;

    setSavingNotes(true);
    try {
      await contactsEnhancedService.update(
        contact.id!,
        { internalNotes: notesValue },
        { organizationId: currentOrganization.id, userId: user!.uid }
      );

      setContact({ ...contact, internalNotes: notesValue });
      setEditingNotes(false);
      toastService.success('Notiz gespeichert');
    } catch (error) {
      toastService.error('Fehler beim Speichern der Notiz');
    } finally {
      setSavingNotes(false);
    }
  };

  // Data Loading
  const loadData = useCallback(async () => {
    if (!user || !contactId || !currentOrganization?.id) return;
    setLoading(true);
    setError(null);
    
    const organizationId = currentOrganization.id;
    
    try {
      // Load contact
      const contactData = await contactsEnhancedService.getById(contactId, organizationId);
      if (contactData) {
        setContact(contactData);
        
        // Load related data in parallel
        const [companiesData, allLists, tagsData] = await Promise.all([
          companiesEnhancedService.getAll(organizationId),
          listsService.getAll(organizationId),
          contactData.tagIds && contactData.tagIds.length > 0 
            ? tagsEnhancedService.getAllAsLegacyTags(organizationId).then(allTags => 
                allTags.filter(tag => contactData.tagIds?.includes(tag.id!))
              )
            : Promise.resolve([])
        ]);
        
        setCompanies(companiesData);
        setTags(tagsData);
        
        // Find company
        if (contactData.companyId) {
          const contactCompany = companiesData.find(c => c.id === contactData.companyId);
          setCompany(contactCompany || null);
        }
        
        // Filter lists that contain this contact
        const contactLists = allLists.filter(list => {
          if (list.type === 'static' && list.contactIds) {
            return list.contactIds.includes(contactId);
          }
          return false;
        });
        
        setLists(contactLists);
        
        // Load publications for journalists
        if (contactData.mediaProfile?.publicationIds && contactData.mediaProfile.publicationIds.length > 0) {
          try {
            const allPublications = await publicationService.getAll(organizationId);
            const contactPublications = allPublications.filter(pub => 
              contactData.mediaProfile?.publicationIds.includes(pub.id!)
            );
            setPublications(contactPublications);
          } catch (error) {
            // Error loading publications - data loading tracked internally
            setPublications([]);
          }
        } else {
          setPublications([]);
        }
      } else {
        setError("Kontakt nicht gefunden.");
      }
    } catch (err: any) {
      setError("Fehler beim Laden der Daten.");
      // Error handled via UI feedback
    } finally {
      setLoading(false);
    }
  }, [user, contactId, currentOrganization?.id]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper function to get status label
  const getStatusLabel = (status?: string) => {
    return CONTACT_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status || 'Unbekannt';
  };

  // Helper function to get status badge color
  const getStatusBadgeColor = (status?: string): 'green' | 'yellow' | 'orange' | 'red' | 'zinc' => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'yellow';
      case 'unsubscribed':
        return 'orange';
      case 'bounced':
        return 'red';
      case 'archived':
        return 'zinc';
      default:
        return 'zinc';
    }
  };

  // Helper function to get channel label
  const getChannelLabel = (channel?: string) => {
    return COMMUNICATION_CHANNELS.find(ch => ch.value === channel)?.label || channel || '';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Kontaktdaten...</Text>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <Alert type="error" title={error} />
        <div className="mt-4">
          <Button 
            onClick={() => router.push('/dashboard/contacts/crm/')} 
            plain
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!contact) {
    return (
      <div className="p-8 text-center">
        <Text>Kontakt konnte nicht gefunden werden.</Text>
        <div className="mt-4">
          <Button 
            onClick={() => router.push('/dashboard/contacts/crm/')} 
            plain
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  const primaryEmail = getPrimaryEmail(contact.emails);
  const primaryPhone = getPrimaryPhone(contact.phones);

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading>{contact.displayName}</Heading>
              <div className="flex items-center gap-2 mt-2">
                {/* Status Badge - immer anzeigen */}
                <Badge
                  color={getStatusBadgeColor(contact.status)}
                  className="whitespace-nowrap"
                >
                  {getStatusLabel(contact.status)}
                </Badge>
                {contact.mediaProfile?.isJournalist && (
                  <Badge color="purple" className="whitespace-nowrap">
                    Journalist
                  </Badge>
                )}
                {contact.position && (
                  <Badge color="zinc" className="whitespace-nowrap">
                    {contact.position}{contact.department ? `, ${contact.department}` : ''}
                  </Badge>
                )}
              </div>
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

              {(contact as any)?._isReference ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-amber-800">
                    <span className="text-amber-600">🔗</span>
                    <span className="font-medium">Globaler Verweis</span>
                  </div>
                  <p className="text-amber-700 mt-1">
                    Dieser Kontakt ist ein Verweis auf globale Daten und kann nicht bearbeitet werden.
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
                  Person bearbeiten
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Information - Consolidated */}
            <InfoCard title="Allgemeines" icon={UserIcon}>
              <div className="space-y-6">
                {/* Contact Data */}
                <div>
                  <Text className="text-sm font-semibold text-zinc-700 mb-3">Kontaktdaten</Text>
                  <div className="space-y-3">
                    {/* Emails */}
                    {contact.emails && contact.emails.length > 0 && (
                      <div>
                        {contact.emails.map((email, index) => (
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
                                {email.type === 'business' ? 'Geschäftlich' :
                                 email.type === 'private' ? 'Privat' : 'Sonstige'}
                              </Badge>
                              {email.isPrimary && <Badge color="green" className="text-xs">Primär</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Phones */}
                    {contact.phones && contact.phones.length > 0 && (
                      <div>
                        {contact.phones.map((phone, index) => (
                          <div key={index} className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-3">
                              <PhoneIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                              <a
                                href={`tel:${phone.number}`}
                                className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                              >
                                {formatPhoneNumber(phone)}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge color="zinc" className="text-xs">
                                {phone.type === 'business' ? 'Geschäftlich' :
                                 phone.type === 'mobile' ? 'Mobil' :
                                 phone.type === 'private' ? 'Privat' :
                                 phone.type === 'fax' ? 'Fax' : phone.type}
                              </Badge>
                              {phone.isPrimary && <Badge color="green" className="text-xs">Primär</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Social Media - direkt unter Kontaktdaten */}
                    {contact.socialProfiles && contact.socialProfiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {contact.socialProfiles.map((profile, index) => {
                          const platformLabel = socialPlatformLabels[profile.platform as keyof typeof socialPlatformLabels] || profile.platform || 'Unbekannt';
                          return (
                            <a
                              key={index}
                              href={profile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                              title={platformLabel}
                            >
                              <div className="text-zinc-700">
                                <SocialMediaIcon platform={profile.platform} />
                              </div>
                              <span className="text-sm font-medium">{platformLabel}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {(!contact.emails?.length && !contact.phones?.length && !contact.socialProfiles?.length) && (
                      <Text className="text-zinc-500">Keine Kontaktdaten hinterlegt</Text>
                    )}
                  </div>
                </div>

                {/* Company & Position */}
                {company && (
                  <div>
                    <Text className="text-sm font-semibold text-zinc-700 mb-3">Berufsinformationen</Text>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <BuildingOfficeIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                        <Link
                          href={`/dashboard/contacts/crm/companies/${company.id}`}
                          className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                        >
                          {company.name}
                        </Link>
                      </div>
                      {contact.position && (
                        <div className="flex items-center gap-3">
                          <BriefcaseIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                          <Text className="text-sm">{contact.position}</Text>
                        </div>
                      )}
                      {contact.department && (
                        <div className="flex items-center gap-3">
                          <IdentificationIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                          <Text className="text-sm">{contact.department}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>

            {/* Media Profile for Journalists */}
            {contact.mediaProfile?.isJournalist && (
              <InfoCard title="Informationen" icon={NewspaperIcon}>
                <div className="space-y-6">
                  {/* Medientypen und Bevorzugte Formate - zweispaltig */}
                  {((contact.mediaProfile.mediaTypes && contact.mediaProfile.mediaTypes.length > 0) ||
                    (contact.mediaProfile.preferredFormats && contact.mediaProfile.preferredFormats.length > 0)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Medientypen */}
                      {contact.mediaProfile.mediaTypes && contact.mediaProfile.mediaTypes.length > 0 && (
                        <div>
                          <Text className="text-sm font-semibold text-zinc-700 mb-3">Medientypen</Text>
                          <div className="flex flex-wrap gap-2">
                            {contact.mediaProfile.mediaTypes.map((type, index) => {
                              const typeLabel = MEDIA_TYPES.find(t => t.value === type)?.label || type;
                              return (
                                <Badge key={index} color="blue" className="whitespace-nowrap">{typeLabel}</Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Bevorzugte Formate */}
                      {contact.mediaProfile.preferredFormats && contact.mediaProfile.preferredFormats.length > 0 && (
                        <div>
                          <Text className="text-sm font-semibold text-zinc-700 mb-3">Bevorzugte Formate</Text>
                          <div className="flex flex-wrap gap-2">
                            {contact.mediaProfile.preferredFormats.map((format, index) => {
                              const formatLabel = SUBMISSION_FORMATS.find(f => f.value === format)?.label || format;
                              return (
                                <Badge key={index} color="blue" className="whitespace-nowrap">{formatLabel}</Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ressorts und Kommunikationspräferenzen - zweispaltig */}
                  {((contact.mediaProfile.beats && contact.mediaProfile.beats.length > 0) ||
                    contact.communicationPreferences) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Ressorts */}
                      {contact.mediaProfile.beats && contact.mediaProfile.beats.length > 0 && (
                        <div>
                          <Text className="text-sm font-semibold text-zinc-700 mb-3">Ressorts / Themenbereiche</Text>
                          <div className="flex flex-wrap gap-2">
                            {contact.mediaProfile.beats.map((beat, index) => (
                              <Badge key={index} color="blue" className="whitespace-nowrap">{beat}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Kommunikationspräferenzen */}
                      {contact.communicationPreferences && (
                        <div>
                          <Text className="text-sm font-semibold text-zinc-700 mb-3">Kommunikationspräferenzen</Text>
                          <div className="flex flex-wrap gap-2">
                            {contact.communicationPreferences.preferredChannel && (
                              <Badge color="blue">
                                {getChannelLabel(contact.communicationPreferences.preferredChannel)}
                              </Badge>
                            )}
                            {contact.communicationPreferences.preferredLanguage && (
                              <Badge color="blue" className="flex items-center gap-1.5">
                                <LanguageIcon className="h-3.5 w-3.5" />
                                {contact.communicationPreferences.preferredLanguage}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {contact.mediaProfile.preferredTopics && contact.mediaProfile.preferredTopics.length > 0 && (
                    <div>
                      <Text className="text-sm font-semibold text-zinc-700 mb-3">Bevorzugte Themen</Text>
                      <div className="flex flex-wrap gap-2">
                        {contact.mediaProfile.preferredTopics.map((topic, index) => (
                          <Badge key={index} color="blue" className="whitespace-nowrap">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {contact.mediaProfile.excludedTopics && contact.mediaProfile.excludedTopics.length > 0 && (
                    <div>
                      <Text className="text-sm font-semibold text-zinc-700 mb-3">Ausgeschlossene Themen</Text>
                      <div className="flex flex-wrap gap-2">
                        {contact.mediaProfile.excludedTopics.map((topic, index) => (
                          <Badge key={index} color="blue" className="whitespace-nowrap">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {contact.mediaProfile.influence && (
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      {contact.mediaProfile.influence.score !== undefined && (
                        <div className="text-center">
                          <Text className="text-sm text-gray-500">Einfluss-Score</Text>
                          <Text className="text-lg font-semibold">{contact.mediaProfile.influence.score}/100</Text>
                        </div>
                      )}
                      {contact.mediaProfile.influence.reach !== undefined && (
                        <div className="text-center">
                          <Text className="text-sm text-gray-500">Reichweite</Text>
                          <Text className="text-lg font-semibold">{contact.mediaProfile.influence.reach.toLocaleString('de-DE')}</Text>
                        </div>
                      )}
                      {contact.mediaProfile.influence.engagement !== undefined && (
                        <div className="text-center">
                          <Text className="text-sm text-gray-500">Engagement</Text>
                          <Text className="text-lg font-semibold">{contact.mediaProfile.influence.engagement}%</Text>
                        </div>
                      )}
                    </div>
                  )}

                  {contact.mediaProfile.submissionGuidelines && (
                    <div>
                      <Text className="text-sm font-semibold text-zinc-700 mb-3">Einreichungsrichtlinien</Text>
                      <Text className="text-sm text-zinc-700">{contact.mediaProfile.submissionGuidelines}</Text>
                    </div>
                  )}

                  {/* Persönliche Informationen */}
                  {contact.personalInfo && (contact.personalInfo.birthday || contact.personalInfo.nationality || contact.personalInfo.languages?.length || contact.personalInfo.interests?.length || contact.personalInfo.notes) && (
                    <div className="space-y-4">
                      {/* Geburtstag und Nationalität - zweispaltig */}
                      {(contact.personalInfo.birthday || contact.personalInfo.nationality) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {contact.personalInfo.birthday && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <CakeIcon className="h-4 w-4 text-zinc-400" />
                                <Text className="text-sm font-semibold text-zinc-700">Geburtstag</Text>
                              </div>
                              <Text className="text-sm text-zinc-900">{formatBirthday(contact.personalInfo.birthday)}</Text>
                            </div>
                          )}

                          {contact.personalInfo.nationality && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <MapPinIcon className="h-4 w-4 text-zinc-400" />
                                <Text className="text-sm font-semibold text-zinc-700">Nationalität</Text>
                              </div>
                              <Text className="text-sm text-zinc-900">{contact.personalInfo.nationality}</Text>
                            </div>
                          )}
                        </div>
                      )}

                      {contact.personalInfo.languages && contact.personalInfo.languages.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <LanguageIcon className="h-4 w-4 text-zinc-400" />
                            <Text className="text-sm font-semibold text-zinc-700">Sprachen</Text>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {contact.personalInfo.languages.map((lang, index) => (
                              <Badge key={index} color="blue" className="text-xs">{lang}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {contact.personalInfo.interests && contact.personalInfo.interests.length > 0 && (
                        <div>
                          <Text className="text-sm font-semibold text-zinc-700 mb-1">Interessen</Text>
                          <Text className="text-sm text-zinc-700">{contact.personalInfo.interests.join(', ')}</Text>
                        </div>
                      )}

                      {contact.personalInfo.notes && (
                        <div>
                          <Text className="text-sm font-semibold text-zinc-700 mb-1">Persönliche Notizen</Text>
                          <Text className="text-sm text-zinc-700 whitespace-pre-wrap">{contact.personalInfo.notes}</Text>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Professional Info / Biografie */}
            {contact.professionalInfo && (contact.professionalInfo.biography || contact.professionalInfo.education?.length || contact.professionalInfo.certifications?.length) && (
              <InfoCard title="Biografie" icon={BriefcaseIcon}>
                <div className="space-y-4">
                  {contact.professionalInfo.education && contact.professionalInfo.education.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-gray-500 mb-2">
                        <AcademicCapIcon className="h-4 w-4 inline mr-1" />
                        Ausbildung
                      </Text>
                      <div className="space-y-2">
                        {contact.professionalInfo.education.map((edu, index) => (
                          <div key={index} className="text-sm">
                            <Text className="font-medium">{edu.degree}</Text>
                            <Text className="text-gray-600">{edu.institution}</Text>
                            {edu.year && <Text className="text-gray-500">{edu.year}</Text>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {contact.professionalInfo.biography && (
                    <div>
                      <Text className="text-sm font-medium text-gray-500 mb-2">Biografie</Text>
                      <Text className="text-sm text-gray-700 whitespace-pre-wrap">{contact.professionalInfo.biography}</Text>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

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
                  {contact.internalNotes || 'Keine Notizen vorhanden'}
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
                    <span className="ml-2">{formatDate(contact.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                  <div>
                    <span className="text-zinc-600">Aktualisiert:</span>
                    <span className="ml-2">{formatDate(contact.updatedAt)}</span>
                  </div>
                </div>
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

            {/* Publications for Journalists */}
            {contact.mediaProfile?.isJournalist && publications.length > 0 && (
              <InfoCard title="Publikationen" icon={NewspaperIcon}>
                <div className="space-y-3">
                  {publications.map(publication => (
                    <div key={publication.id} className="border border-zinc-200 rounded-lg p-4 hover:bg-zinc-50 transition-colors">
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* GDPR Consents 
            {contact.gdprConsents && contact.gdprConsents.length > 0 && (
              <InfoCard title="DSGVO Einwilligungen" icon={CheckBadgeIcon}>
                <div className="space-y-2">
                  {contact.gdprConsents.map((consent, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center justify-between">
                        <Text className="font-medium">{consent.type}</Text>
                        {consent.given ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {consent.givenAt && (
                        <Text className="text-xs text-gray-500">
                          {consent.given ? 'Erteilt' : 'Widerrufen'}: {formatDate(consent.givenAt)}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

*/}

            {/* Distribution lists */}
            {lists.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-zinc-900">
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

      {/* Edit Modal - nur für echte Kontakte, nicht für References */}
      {showEditModal && !(contact as any)?._isReference && (
        <ContactModalEnhanced
          contact={contact}
          companies={companies}
          userId={user!.uid}
          organizationId={currentOrganization?.id || user!.uid}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            loadData();
            toastService.success('Kontakt erfolgreich aktualisiert');
          }}
        />
      )}
    </>
  );
}
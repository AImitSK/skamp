// src/app/dashboard/contacts/crm/contacts/[contactId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { contactsEnhancedService, companiesEnhancedService, tagsEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { listsService } from "@/lib/firebase/lists-service";
import { ContactEnhanced, CompanyEnhanced, CONTACT_STATUS_OPTIONS, COMMUNICATION_CHANNELS } from "@/types/crm-enhanced";
import { Tag, socialPlatformLabels } from "@/types/crm";
import { DistributionList } from "@/types/lists";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import ContactModalEnhanced from "@/app/dashboard/contacts/crm/ContactModalEnhanced";
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
  CheckBadgeIcon
} from "@heroicons/react/20/solid";
import clsx from 'clsx';

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
  const birthday = date instanceof Date ? date : new Date(date);
  return birthday.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long'
  });
};

const getPrimaryEmail = (emails?: Array<{ email: string; isPrimary?: boolean; type?: string }>): { email: string; type?: string } | null => {
  if (!emails || emails.length === 0) return null;
  const primary = emails.find(e => e.isPrimary);
  return primary || emails[0];
};

const getPrimaryPhone = (phones?: Array<{ number: string; isPrimary?: boolean; type?: string }>): { number: string; type?: string } | null => {
  if (!phones || phones.length === 0) return null;
  const primary = phones.find(p => p.isPrimary);
  return primary || phones[0];
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
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
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

// InfoCard Component
function InfoCard({ 
  title, 
  icon: Icon, 
  children,
  className = ""
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-lg border bg-white overflow-hidden", className)}>
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500" />
          {title}
        </h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  // States
  const [contact, setContact] = useState<ContactEnhanced | null>(null);
  const [company, setCompany] = useState<CompanyEnhanced | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Data Loading
  const loadData = useCallback(async () => {
    if (!user || !contactId) return;
    setLoading(true);
    setError(null);
    
    try {
      // Load contact
      const contactData = await contactsEnhancedService.getById(contactId, user.uid);
      if (contactData) {
        setContact(contactData);
        
        // Load related data in parallel
        const [companiesData, allLists, tagsData] = await Promise.all([
          companiesEnhancedService.getAll(user.uid),
          listsService.getAll(user.uid),
          contactData.tagIds && contactData.tagIds.length > 0 
            ? tagsEnhancedService.getAllAsLegacyTags(user.uid).then(allTags => 
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
      } else {
        setError("Kontakt nicht gefunden.");
      }
    } catch (err: any) {
      setError("Fehler beim Laden der Daten.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, contactId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper function to get status label
  const getStatusLabel = (status?: string) => {
    return CONTACT_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status || 'Unbekannt';
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
        <Alert type="error" title="Fehler" message={error} />
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/contacts/crm/')} plain>
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
          <Button onClick={() => router.push('/dashboard/contacts/crm/')} plain>
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
      <div className="p-6 md:p-8">
        {/* Alert */}
        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} title={alert.title} message={alert.message} />
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Button 
            plain 
            onClick={() => router.push('/dashboard/contacts/crm/')}
            className="mb-4 flex items-center gap-2 whitespace-nowrap"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <Heading>{contact.displayName}</Heading>
              {contact.name.academicTitle && (
                <Text className="text-gray-600">{contact.name.academicTitle}</Text>
              )}
              <div className="flex items-center gap-3 mt-2">
                {contact.position && (
                  <Badge color="zinc" className="whitespace-nowrap">{contact.position}</Badge>
                )}
                {contact.companyName && <Text>{contact.companyName}</Text>}
                {contact.status && contact.status !== 'active' && (
                  <Badge 
                    color={contact.status === 'inactive' ? 'yellow' : 'red'}
                    className="whitespace-nowrap"
                  >
                    {getStatusLabel(contact.status)}
                  </Badge>
                )}
                {contact.mediaProfile?.isJournalist && (
                  <Badge color="purple" className="whitespace-nowrap">
                    <NewspaperIcon className="h-3 w-3 mr-1 inline" />
                    Journalist
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              onClick={() => setShowEditModal(true)}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap inline-flex items-center gap-x-2"
            >
              <PencilIcon className="h-4 w-4" />
              Person bearbeiten
            </Button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Data */}
            <InfoCard title="Kontaktdaten" icon={PhoneIcon}>
              <div className="space-y-4">
                {/* Emails */}
                {contact.emails && contact.emails.length > 0 && (
                  <div>
                    <Text className="text-sm font-medium text-gray-500 mb-2">E-Mail-Adressen</Text>
                    <div className="space-y-2">
                      {contact.emails.map((email, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <a 
                            href={`mailto:${email.email}`}
                            className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                          >
                            {email.email}
                          </a>
                          <div className="flex gap-2">
                            {email.type && (
                              <Badge color="zinc" className="text-xs">
                                {email.type === 'business' ? 'Geschäftlich' : 
                                 email.type === 'private' ? 'Privat' : 'Sonstige'}
                              </Badge>
                            )}
                            {email.isPrimary && <Badge color="green" className="text-xs">Primär</Badge>}
                            {email.isVerified && <CheckBadgeIcon className="h-4 w-4 text-green-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phones */}
                {contact.phones && contact.phones.length > 0 && (
                  <div>
                    <Text className="text-sm font-medium text-gray-500 mb-2">Telefonnummern</Text>
                    <div className="space-y-2">
                      {contact.phones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <PhoneIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <a 
                            href={`tel:${phone.number}`}
                            className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                          >
                            {phone.number}
                          </a>
                          <div className="flex gap-2">
                            {phone.type && (
                              <Badge color="zinc" className="text-xs">
                                {phone.type === 'business' ? 'Geschäftlich' :
                                 phone.type === 'mobile' ? 'Mobil' :
                                 phone.type === 'private' ? 'Privat' :
                                 phone.type === 'fax' ? 'Fax' : phone.type}
                              </Badge>
                            )}
                            {phone.isPrimary && <Badge color="green" className="text-xs">Primär</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Addresses */}
                {contact.addresses && contact.addresses.length > 0 && (
                  <div>
                    <Text className="text-sm font-medium text-gray-500 mb-2">Adressen</Text>
                    <div className="space-y-3">
                      {contact.addresses.map((addr, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <MapPinIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <Badge color="zinc" className="text-xs mb-2">
                                {addr.type === 'business' ? 'Geschäftlich' : 
                                 addr.type === 'private' ? 'Privat' : 'Sonstige'}
                              </Badge>
                              <div className="text-sm">
                                {addr.address.street && <p>{addr.address.street}</p>}
                                {(addr.address.postalCode || addr.address.city) && (
                                  <p>{addr.address.postalCode} {addr.address.city}</p>
                                )}
                                {addr.address.region && <p>{addr.address.region}</p>}
                                {addr.address.countryCode && <p>{addr.address.countryCode}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!contact.emails?.length && !contact.phones?.length && !contact.addresses?.length) && (
                  <Text className="text-gray-500">Keine Kontaktdaten hinterlegt</Text>
                )}
              </div>
            </InfoCard>

            {/* Company */}
            {company && (
              <InfoCard title="Firma" icon={BuildingOfficeIcon}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link 
                      href={`/dashboard/contacts/crm/companies/${company.id}`}
                      className="text-[#005fab] hover:text-[#004a8c] hover:underline font-medium text-lg"
                    >
                      {company.name}
                    </Link>
                    {contact.position && (
                      <p className="text-sm font-medium text-gray-700 mt-1">{contact.position}</p>
                    )}
                    {contact.department && (
                      <p className="text-sm text-gray-600">{contact.department}</p>
                    )}
                    {company.industryClassification?.primary && (
                      <p className="text-sm text-gray-600 mt-2">{company.industryClassification.primary}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      {company.website && (
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-gray-600 hover:text-[#005fab] flex items-center gap-1"
                        >
                          <GlobeAltIcon className="h-4 w-4" />
                          Website
                        </a>
                      )}
                      {getPrimaryPhone(company.phones) && (
                        <a 
                          href={`tel:${getPrimaryPhone(company.phones)?.number}`}
                          className="text-gray-600 hover:text-[#005fab] flex items-center gap-1"
                        >
                          <PhoneIcon className="h-4 w-4" />
                          {getPrimaryPhone(company.phones)?.number}
                        </a>
                      )}
                    </div>
                  </div>
                  <Button 
                    plain
                    onClick={() => router.push(`/dashboard/contacts/crm/companies/${company.id}`)}
                    className="ml-4 whitespace-nowrap"
                  >
                    Zur Firma
                  </Button>
                </div>
              </InfoCard>
            )}

            {/* Media Profile for Journalists */}
            {contact.mediaProfile?.isJournalist && (
              <InfoCard title="Medien-Profil" icon={NewspaperIcon}>
                <div className="space-y-4">
                  {contact.mediaProfile.beats && contact.mediaProfile.beats.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-gray-500 mb-2">Ressorts / Themenbereiche</Text>
                      <div className="flex flex-wrap gap-2">
                        {contact.mediaProfile.beats.map((beat, index) => (
                          <Badge key={index} color="blue" className="whitespace-nowrap">{beat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {contact.mediaProfile.preferredTopics && contact.mediaProfile.preferredTopics.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-gray-500 mb-2">Bevorzugte Themen</Text>
                      <div className="flex flex-wrap gap-2">
                        {contact.mediaProfile.preferredTopics.map((topic, index) => (
                          <Badge key={index} color="green" className="whitespace-nowrap">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {contact.mediaProfile.excludedTopics && contact.mediaProfile.excludedTopics.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-gray-500 mb-2">Ausgeschlossene Themen</Text>
                      <div className="flex flex-wrap gap-2">
                        {contact.mediaProfile.excludedTopics.map((topic, index) => (
                          <Badge key={index} color="red" className="whitespace-nowrap">{topic}</Badge>
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
                      <Text className="text-sm font-medium text-gray-500 mb-1">Einreichungsrichtlinien</Text>
                      <Text className="text-sm text-gray-700">{contact.mediaProfile.submissionGuidelines}</Text>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Social Media */}
            {contact.socialProfiles && contact.socialProfiles.length > 0 && (
              <InfoCard title="Social Media" icon={LinkIcon}>
                <div className="flex flex-wrap gap-3">
                  {contact.socialProfiles.map((social, index) => (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <div className="text-gray-700">
                        <SocialMediaIcon platform={social.platform} />
                      </div>
                      <span className="text-sm font-medium">{social.platform}</span>
                      {social.verified && <CheckBadgeIcon className="h-4 w-4 text-blue-500" />}
                    </a>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* Communication Preferences */}
            {contact.communicationPreferences && (
              <InfoCard title="Kommunikationspräferenzen" icon={ChatBubbleLeftRightIcon}>
                <div className="space-y-3 text-sm">
                  {contact.communicationPreferences.preferredChannel && (
                    <div className="flex items-center justify-between">
                      <Text className="text-gray-600">Bevorzugter Kanal:</Text>
                      <Badge color="blue">
                        {getChannelLabel(contact.communicationPreferences.preferredChannel)}
                      </Badge>
                    </div>
                  )}
                  
                  {contact.communicationPreferences.preferredLanguage && (
                    <div className="flex items-center justify-between">
                      <Text className="text-gray-600">Bevorzugte Sprache:</Text>
                      <div className="flex items-center gap-2">
                        <LanguageIcon className="h-4 w-4 text-gray-400" />
                        <Text className="font-medium">{contact.communicationPreferences.preferredLanguage}</Text>
                      </div>
                    </div>
                  )}
                  
                  {contact.communicationPreferences.preferredTime && (
                    <div>
                      <Text className="text-gray-600 mb-2">Beste Kontaktzeiten:</Text>
                      <div className="ml-4 space-y-1">
                        {contact.communicationPreferences.preferredTime.bestDays && (
                          <div>
                            <Text className="text-xs text-gray-500">Tage:</Text>
                            <div className="flex gap-1 mt-1">
                              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                                <Badge 
                                  key={day} 
                                  color={contact.communicationPreferences?.preferredTime?.bestDays?.includes(day as any) ? 'blue' : 'zinc'}
                                  className="text-xs"
                                >
                                  {day === 'mon' ? 'Mo' : day === 'tue' ? 'Di' : day === 'wed' ? 'Mi' : 
                                   day === 'thu' ? 'Do' : day === 'fri' ? 'Fr' : day === 'sat' ? 'Sa' : 'So'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {contact.communicationPreferences.preferredTime.bestHours && (
                          <div>
                            <Text className="text-xs text-gray-500">Zeit:</Text>
                            <Text className="font-medium">
                              {contact.communicationPreferences.preferredTime.bestHours.from} - {contact.communicationPreferences.preferredTime.bestHours.to}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {contact.communicationPreferences.doNotContact && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <Text className="font-medium">Nicht kontaktieren</Text>
                      </div>
                      {contact.communicationPreferences.doNotContactUntil && (
                        <Text className="text-sm text-red-600 mt-1">
                          Bis: {formatDate(contact.communicationPreferences.doNotContactUntil)}
                        </Text>
                      )}
                      {contact.communicationPreferences.doNotContactReason && (
                        <Text className="text-sm text-red-600 mt-1">
                          Grund: {contact.communicationPreferences.doNotContactReason}
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Professional Info */}
            {contact.professionalInfo && (
              <InfoCard title="Berufliche Informationen" icon={BriefcaseIcon}>
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
            {contact.internalNotes && (
              <InfoCard title="Interne Notizen" icon={DocumentTextIcon}>
                <p className="whitespace-pre-wrap text-gray-700">{contact.internalNotes}</p>
              </InfoCard>
            )}
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-6">
            {/* Details */}
            <InfoCard title="Details" icon={InformationCircleIcon}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <Text className="text-gray-600">Erstellt:</Text>
                    <Text className="ml-2">{formatDate(contact.createdAt)}</Text>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <Text className="text-gray-600">Aktualisiert:</Text>
                    <Text className="ml-2">{formatDate(contact.updatedAt)}</Text>
                  </div>
                </div>
                {contact.personalInfo?.birthday && (
                  <div className="flex items-center gap-3">
                    <CakeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <Text className="text-gray-600">Geburtstag:</Text>
                      <Text className="ml-2">{formatBirthday(contact.personalInfo.birthday)}</Text>
                    </div>
                  </div>
                )}
                {contact.personalInfo?.languages && contact.personalInfo.languages.length > 0 && (
                  <div className="flex items-start gap-3">
                    <LanguageIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <Text className="text-gray-600">Sprachen:</Text>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.personalInfo.languages.map((lang, index) => (
                          <Badge key={index} color="zinc" className="text-xs">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>

            {/* Personal Info */}
            {contact.personalInfo && (contact.personalInfo.interests?.length || contact.personalInfo.notes) && (
              <InfoCard title="Persönliche Informationen" icon={UserIcon}>
                <div className="space-y-3">
                  {contact.personalInfo.interests && contact.personalInfo.interests.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-gray-500 mb-2">Interessen</Text>
                      <div className="flex flex-wrap gap-2">
                        {contact.personalInfo.interests.map((interest, index) => (
                          <Badge key={index} color="purple" className="whitespace-nowrap">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {contact.personalInfo.notes && (
                    <div>
                      <Text className="text-sm font-medium text-gray-500 mb-1">Persönliche Notizen</Text>
                      <Text className="text-sm text-gray-700">{contact.personalInfo.notes}</Text>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <InfoCard title="Tags" icon={TagIcon}>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag.id} color={tag.color as any} className="whitespace-nowrap">{tag.name}</Badge>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* GDPR Consents */}
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

            {/* Distribution lists */}
            {lists.length > 0 && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <ListBulletIcon className="h-5 w-5 text-gray-500" />
                    In Listen enthalten
                    <Badge color="blue" className="ml-auto">{lists.length}</Badge>
                  </h3>
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
      {showEditModal && (
        <ContactModalEnhanced
          contact={contact}
          companies={companies}
          userId={user!.uid}
          organizationId={user!.uid}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            loadData();
            showAlert('success', 'Kontakt aktualisiert', 'Die Kontaktdaten wurden erfolgreich aktualisiert.');
          }}
        />
      )}
    </>
  );
}
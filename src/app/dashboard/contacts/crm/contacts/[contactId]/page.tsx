// src\app\dashboard\contacts\crm\contacts\[contactId]\page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from "@/context/AuthContext";
import { contactsService, tagsService, companiesService } from "@/lib/firebase/crm-service";
import { listsService } from "@/lib/firebase/lists-service";
import { Contact, Tag, Company, socialPlatformLabels } from "@/types/crm";
import { DistributionList } from "@/types/lists";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import ContactModal from "@/app/dashboard/contacts/crm/ContactModal"; 
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
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

// Social Media Icons mapping
const socialMediaIcons: Record<string, any> = {
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

// Toast Types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Toast Component
function ToastNotification({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 z-50">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${colors[toast.type]} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in-up`}
            style={{ minWidth: '320px' }}
          >
            <div className="flex">
              <Icon className={`h-5 w-5 ${iconColors[toast.type]} mr-3 flex-shrink-0`} />
              <div className="flex-1">
                <p className="font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm mt-1 opacity-90">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="ml-3 flex-shrink-0 rounded-md hover:opacity-70 focus:outline-none"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hilfsfunktion zum Formatieren des Datums
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// Publication Info Component
function PublicationInfo({ contact, company }: { contact: Contact; company: Company | null }) {
  if (!company || !['publisher', 'media_house', 'agency'].includes(company.type)) {
    return null;
  }

  const contactPublications = contact.mediaInfo?.publications || [];
  const companyPublications = company.mediaInfo?.publications || [];

  if (contactPublications.length === 0) {
    return null;
  }

  // Finde die vollen Publikationsdaten für die zugeordneten Publikationen
  const fullPublications = contactPublications.map(pubName => 
    companyPublications.find(pub => pub.name === pubName)
  ).filter(Boolean);

  const typeLabels: { [key: string]: string } = {
    'newspaper': 'Tageszeitung',
    'magazine': 'Magazin',
    'online': 'Online-Medium',
    'blog': 'Blog',
    'podcast': 'Podcast',
    'tv': 'TV-Sender',
    'radio': 'Radio',
    'newsletter': 'Newsletter',
    'trade_journal': 'Fachzeitschrift'
  };

  const formatLabels: { [key: string]: string } = {
    'print': 'Print',
    'online': 'Online',
    'both': 'Print & Online'
  };

  const frequencyLabels: { [key: string]: string } = {
    'daily': 'Täglich',
    'weekly': 'Wöchentlich',
    'biweekly': '14-tägig',
    'monthly': 'Monatlich',
    'quarterly': 'Vierteljährlich',
    'yearly': 'Jährlich',
    'irregular': 'Unregelmäßig'
  };

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-500" />
          Publikationen
          <Badge color="purple" className="ml-auto">{fullPublications.length}</Badge>
        </h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {fullPublications.map((pub: any, index) => (
            <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900 mb-1">{pub.name}</div>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge color="blue" className="text-xs">{typeLabels[pub.type] || pub.type}</Badge>
                <Badge color="green" className="text-xs">{formatLabels[pub.format] || pub.format}</Badge>
                <Badge color="purple" className="text-xs">{frequencyLabels[pub.frequency] || pub.frequency}</Badge>
              </div>
              {pub.focusAreas && pub.focusAreas.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1">Themenschwerpunkte:</div>
                  <div className="flex flex-wrap gap-1">
                    {pub.focusAreas.map((area: string, idx: number) => (
                      <Badge key={idx} color="zinc" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(pub.circulation || pub.reach) && (
                <div className="mt-2 text-xs text-gray-600">
                  {pub.format === 'print' ? 'Auflage' : 'Reichweite'}: {' '}
                  <span className="font-medium text-gray-900">
                    {(pub.circulation || pub.reach).toLocaleString('de-DE')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
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
  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast Management
  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message, duration: 5000 };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadData = useCallback(async () => {
    if (!user || !contactId) return;
    setLoading(true);
    setError(null);
    
    try {
      // Lade Kontakt und alle Firmen parallel
      const [contactData, companiesData, allLists] = await Promise.all([
        contactsService.getById(contactId),
        companiesService.getAll(user.uid),
        listsService.getAll(user.uid)
      ]);

      if (contactData) {
        setContact(contactData);
        setCompanies(companiesData);
        
        // Finde die Firma des Kontakts
        if (contactData.companyId) {
          const contactCompany = companiesData.find(c => c.id === contactData.companyId);
          setCompany(contactCompany || null);
        }
        
        // Lade Tags
        if (contactData.tagIds && contactData.tagIds.length > 0) {
          const tagsData = await tagsService.getByIds(contactData.tagIds);
          setTags(tagsData);
        }
        
        // Filtere Listen, die diesen Kontakt enthalten
        const contactLists = allLists.filter(list => {
          if (list.type === 'static' && list.contactIds) {
            return list.contactIds.includes(contactId);
          } else if (list.type === 'dynamic' && list.filters) {
            // Vereinfachte Prüfung für dynamische Listen
            // In Produktion würde man hier die komplette Filter-Logik anwenden
            return true; // Placeholder
          }
          return false;
        });
        
        setLists(contactLists);
      } else {
        setError("Kontakt nicht gefunden.");
      }
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Daten.");
    } finally {
      setLoading(false);
    }
  }, [user, contactId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-[#005fab] rounded-full animate-bounce"></div>
          <p className="mt-4 text-zinc-500">Lade Kontaktdaten...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fehler</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <Button onClick={() => router.push('/dashboard/contacts')} plain>
                  Zurück zur Übersicht
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!contact) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">Kontakt konnte nicht gefunden werden.</div>
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/contacts')} plain>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header mit Zurück-Button */}
        <div className="mb-6">
          <Button 
            plain 
            onClick={() => router.push('/dashboard/contacts')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <Heading>{contact.firstName} {contact.lastName}</Heading>
              <div className="flex items-center gap-3 mt-1">
                {contact.position && <Badge color="zinc">{contact.position}</Badge>}
                {contact.companyName && <Text>{contact.companyName}</Text>}
              </div>
            </div>
            <button 
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
            >
              <PencilIcon className="h-4 w-4" />
              Person bearbeiten
            </button>
          </div>
        </div>

        {/* Hauptinhalt Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Linke Spalte - Hauptinformationen */}
          <div className="lg:col-span-2 space-y-6">
            {/* Kontaktdaten */}
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <PhoneIcon className="h-5 w-5 text-gray-500" />
                  Kontaktdaten
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {!contact.email && !contact.phone && (
                  <div className="text-gray-400 text-sm">Keine Kontaktdaten hinterlegt</div>
                )}
              </div>
            </div>

            {/* Firma */}
            {company && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                    Firma
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link 
                        href={`/dashboard/contacts/companies/${company.id}`}
                        className="text-[#005fab] hover:text-[#004a8c] hover:underline font-medium text-lg"
                      >
                        {company.name}
                      </Link>
                      {company.industry && (
                        <p className="text-sm text-gray-600 mt-1">{company.industry}</p>
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
                        {company.phone && (
                          <a 
                            href={`tel:${company.phone}`}
                            className="text-gray-600 hover:text-[#005fab] flex items-center gap-1"
                          >
                            <PhoneIcon className="h-4 w-4" />
                            {company.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <Button 
                      plain
                      onClick={() => router.push(`/dashboard/contacts/companies/${company.id}`)}
                      className="ml-4"
                    >
                      Zur Firma
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Social Media */}
            {contact.socialMedia && contact.socialMedia.length > 0 && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-gray-500" />
                    Social Media
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-3">
                    {contact.socialMedia.map((social, index) => {
                      const Icon = socialMediaIcons[social.platform] || LinkIcon;
                      return (
                        <a
                          key={index}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          title={socialPlatformLabels[social.platform]}
                        >
                          <div className="text-gray-700">{Icon}</div>
                          <span className="text-sm font-medium">{socialPlatformLabels[social.platform]}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Publikationen */}
            <PublicationInfo contact={contact} company={company} />

            {/* Kommunikationspräferenzen */}
            {contact.communicationPreferences && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-500" />
                    Kommunikationspräferenzen
                  </h3>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  {contact.communicationPreferences.preferredChannel && (
                    <div>
                      <span className="text-gray-600">Bevorzugter Kanal:</span>
                      <span className="ml-2 font-medium">
                        {contact.communicationPreferences.preferredChannel === 'email' && 'E-Mail'}
                        {contact.communicationPreferences.preferredChannel === 'phone' && 'Telefon'}
                        {contact.communicationPreferences.preferredChannel === 'meeting' && 'Meeting'}
                        {contact.communicationPreferences.preferredChannel === 'social' && 'Social Media'}
                      </span>
                    </div>
                  )}
                  {contact.communicationPreferences.bestTimeToContact && (
                    <div>
                      <span className="text-gray-600">Beste Zeit:</span>
                      <span className="ml-2 font-medium">{contact.communicationPreferences.bestTimeToContact}</span>
                    </div>
                  )}
                  {contact.communicationPreferences.language && (
                    <div>
                      <span className="text-gray-600">Sprache:</span>
                      <span className="ml-2 font-medium">{contact.communicationPreferences.language}</span>
                    </div>
                  )}
                  {contact.communicationPreferences.doNotContact && (
                    <div className="text-red-600 font-medium">⚠️ Nicht kontaktieren</div>
                  )}
                </div>
              </div>
            )}

            {/* Notizen */}
            {contact.notes && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg">Notizen</h3>
                </div>
                <div className="p-4">
                  <p className="whitespace-pre-wrap text-gray-700">{contact.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Rechte Spalte - Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">Details</h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">Erstellt:</span>
                    <span className="ml-2">{formatDate(contact.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">Aktualisiert:</span>
                    <span className="ml-2">{formatDate(contact.updatedAt)}</span>
                  </div>
                </div>
                {contact.birthday && (
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-gray-600">Geburtstag:</span>
                      <span className="ml-2">
                        {new Date(contact.birthday).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'long'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <TagIcon className="h-5 w-5 text-gray-500" />
                    Tags
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge key={tag.id} color={tag.color as any}>{tag.name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Verteilerlisten */}
            {lists.length > 0 && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <ListBulletIcon className="h-5 w-5 text-gray-500" />
                    In Listen enthalten
                    <Badge color="orange" className="ml-auto">{lists.length}</Badge>
                  </h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-2">
                    {lists.map(list => (
                      <li key={list.id} className="flex items-center justify-between">
                        <Link 
                          href={`/dashboard/listen/${list.id}`} 
                          className="text-[#005fab] hover:text-[#004a8c] hover:underline"
                        >
                          {list.name}
                        </Link>
                        <Badge 
                          color={list.type === 'dynamic' ? 'green' : 'zinc'} 
                          className="text-xs"
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
        <ContactModal
          contact={contact}
          companies={companies}
          userId={user!.uid}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            loadData();
            showToast('success', 'Person aktualisiert', 'Die Kontaktdaten wurden erfolgreich aktualisiert.');
          }}
        />
      )}
      
      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />

      {/* CSS für Animationen */}
      <style jsx global>{`
        @keyframes slide-in-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
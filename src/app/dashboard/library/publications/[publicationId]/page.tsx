// src/app/dashboard/library/publications/[publicationId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { companiesService } from "@/lib/firebase/crm-service";
import type { Publication } from "@/types/library";
import type { Company } from "@/types/crm";
import {
  usePublication,
  useUpdatePublication,
  useVerifyPublication
} from "@/lib/hooks/usePublicationsData";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PublicationModal } from "../PublicationModal";
import { toastService } from '@/lib/utils/toast';
import { Timestamp } from 'firebase/firestore';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  LinkIcon,
  ClockIcon,
  InformationCircleIcon,
  CheckIcon,
  XMarkIcon,
  NewspaperIcon,
  UserGroupIcon,
  MapPinIcon,
  HashtagIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

// Type Labels
const publicationTypeLabels: Record<string, string> = {
  newspaper: "Zeitung",
  magazine: "Magazin",
  website: "Website",
  blog: "Blog",
  newsletter: "Newsletter",
  podcast: "Podcast",
  tv: "TV",
  radio: "Radio",
  trade_journal: "Fachzeitschrift",
  press_agency: "Nachrichtenagentur",
  social_media: "Social Media",
  other: "Sonstiges"
};

const formatLabels: Record<string, string> = {
  print: "Print",
  online: "Digital",
  both: "Print & Digital",
  broadcast: "Broadcast"
};

const scopeLabels: Record<string, string> = {
  local: "Lokal",
  regional: "Regional",
  national: "National",
  international: "International",
  global: "Global"
};

const frequencyLabels: Record<string, string> = {
  continuous: "Durchgehend",
  multiple_daily: "Mehrmals täglich",
  daily: "Täglich",
  weekly: "Wöchentlich",
  biweekly: "14-tägig",
  monthly: "Monatlich",
  bimonthly: "Zweimonatlich",
  quarterly: "Vierteljährlich",
  biannual: "Halbjährlich",
  annual: "Jährlich",
  irregular: "Unregelmäßig"
};

// Helper functions
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unbekannt';

  try {
    let date: Date;

    // Firestore Timestamp
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    }
    // Already a Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // String or number timestamp
    else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Firestore Timestamp object with seconds
    else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    }
    else {
      return 'Unbekannt';
    }

    // Validate date
    if (isNaN(date.getTime())) {
      return 'Unbekannt';
    }

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    return 'Unbekannt';
  }
};

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

export default function PublicationDetailPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const publicationId = params.publicationId as string;

  // React Query Hooks
  const { data: publication, isLoading, error: queryError, refetch } = usePublication(publicationId, currentOrganization?.id);
  const updatePublication = useUpdatePublication();
  const verifyPublication = useVerifyPublication();

  // Local States
  const [publisher, setPublisher] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  // Error handling
  const error = queryError ? 'Fehler beim Laden der Daten.' : null;

  // Notes Management
  const handleEditNotes = () => {
    setNotesValue(publication?.internalNotes || '');
    setEditingNotes(true);
  };

  const handleCancelEditNotes = () => {
    setEditingNotes(false);
    setNotesValue('');
  };

  const handleSaveNotes = async () => {
    if (!publication || !currentOrganization?.id) return;

    try {
      await updatePublication.mutateAsync({
        id: publication.id!,
        organizationId: currentOrganization.id,
        userId: user!.uid,
        publicationData: { internalNotes: notesValue }
      });

      setEditingNotes(false);
      toastService.success('Notiz gespeichert');
    } catch (error) {
      toastService.error('Fehler beim Speichern der Notiz');
    }
  };

  // Load publisher when publication changes
  useEffect(() => {
    const loadPublisher = async () => {
      if (publication?.publisherId) {
        try {
          const publisherData = await companiesService.getById(publication.publisherId);
          setPublisher(publisherData);
        } catch (error) {
          // Error loading publisher
        }
      }
    };

    loadPublisher();
  }, [publication?.publisherId]);

  // Verify Handler
  const handleVerify = async () => {
    if (!user || !currentOrganization || !publication) return;

    try {
      if (publication.verified) {
        // Unverifizieren
        await updatePublication.mutateAsync({
          id: publicationId,
          organizationId: currentOrganization.id,
          userId: user.uid,
          publicationData: { verified: false, verifiedAt: undefined }
        });
        toastService.success('Verifizierung zurückgenommen');
      } else {
        // Verifizieren
        await verifyPublication.mutateAsync({
          id: publicationId,
          organizationId: currentOrganization.id,
          userId: user.uid
        });
        toastService.success('Publikation verifiziert');
      }
    } catch (error) {
      toastService.error(`Fehler beim ${publication.verified ? 'Zurücknehmen der Verifizierung' : 'Verifizieren'}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">Lade Publikation...</Text>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <InformationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Fehler</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => router.push('/dashboard/library/publications')}
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
  if (!publication) {
    return (
      <div className="p-8 text-center">
        <Text>Publikation konnte nicht gefunden werden.</Text>
        <div className="mt-4">
          <Button
            onClick={() => router.push('/dashboard/library/publications')}
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
      <div>
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              {/* Heading mit Badges */}
              <div className="flex items-center gap-3">
                <Heading>{publication.title}</Heading>
                <div className="flex items-center gap-2">
                  <Badge color="zinc" className="whitespace-nowrap">
                    {publicationTypeLabels[publication.type] || publication.type}
                  </Badge>
                  <Badge color="zinc" className="whitespace-nowrap">
                    {formatLabels[publication.format] || publication.format}
                  </Badge>
                  <Badge color="zinc" className="whitespace-nowrap">
                    {scopeLabels[publication.geographicScope]}
                  </Badge>
                  {publication.status === 'active' ? (
                    <Badge color="green" className="whitespace-nowrap">Aktiv</Badge>
                  ) : publication.status === 'inactive' ? (
                    <Badge color="yellow" className="whitespace-nowrap">Inaktiv</Badge>
                  ) : (
                    <Badge color="red" className="whitespace-nowrap">Eingestellt</Badge>
                  )}
                </div>
              </div>

              {publication.subtitle && (
                <Text className="text-zinc-600 mt-1">{publication.subtitle}</Text>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard/library/publications')}
                className="border border-zinc-300 bg-white text-zinc-700
                           hover:bg-zinc-50 font-medium whitespace-nowrap
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                           h-10 px-6 rounded-lg transition-colors inline-flex items-center"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück
              </Button>

              <Button
                onClick={handleVerify}
                className="border border-zinc-300 bg-white text-zinc-700
                           hover:bg-zinc-50 font-medium whitespace-nowrap
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                           h-10 px-6 rounded-lg transition-colors inline-flex items-center"
              >
                <CheckBadgeIcon className="h-4 w-4 mr-2" />
                {publication.verified ? 'Verifizierung zurücknehmen' : 'Verifizieren'}
              </Button>

              <Button
                onClick={() => setShowEditModal(true)}
                className="bg-primary hover:bg-primary-hover text-white font-medium whitespace-nowrap
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                           h-10 px-6 rounded-lg transition-colors inline-flex items-center"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Allgemeine Informationen */}
            <InfoCard title="Allgemeine Informationen" icon={NewspaperIcon}>
              <div className="space-y-6">
                {/* Publisher */}
                {publisher && (
                  <div>
                    <Text className="text-sm font-semibold text-zinc-700 mb-3">Verlag</Text>
                    <Link
                      href={`/dashboard/contacts/crm/companies/${publisher.id}`}
                      className="flex items-center gap-2 text-primary hover:text-primary-hover hover:underline"
                    >
                      <BuildingOfficeIcon className="h-5 w-5 text-zinc-400" />
                      {publisher.name}
                    </Link>
                  </div>
                )}

                {/* URLs */}
                {(publication.websiteUrl || publication.rssFeedUrl) && (
                  <div>
                    <Text className="text-sm font-semibold text-zinc-700 mb-3">Online-Präsenz</Text>
                    <div className="space-y-2">
                      {publication.websiteUrl && (
                        <div className="flex items-center gap-3">
                          <GlobeAltIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                          <a
                            href={publication.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover hover:underline"
                          >
                            {publication.websiteUrl}
                          </a>
                        </div>
                      )}
                      {publication.rssFeedUrl && (
                        <div className="flex items-center gap-3">
                          <LinkIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                          <a
                            href={publication.rssFeedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover hover:underline"
                          >
                            RSS Feed
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Media */}
                {publication.socialMediaUrls && publication.socialMediaUrls.length > 0 && (
                  <div>
                    <Text className="text-sm font-semibold text-zinc-700 mb-3">Social Media</Text>
                    <div className="space-y-1">
                      {publication.socialMediaUrls.map((social, index) => (
                        <a
                          key={index}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:text-primary-hover hover:underline"
                        >
                          <LinkIcon className="h-4 w-4" />
                          {social.platform}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Identifiers */}
                {publication.identifiers && publication.identifiers.length > 0 && (
                  <div>
                    <Text className="text-sm font-semibold text-zinc-700 mb-3">Identifikatoren</Text>
                    <div className="space-y-2">
                      {publication.identifiers.map((identifier, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <Text className="text-sm">
                            <span className="font-medium">{identifier.type}</span>
                            {': '}
                            <span className="text-zinc-600 font-mono">{identifier.value}</span>
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geography */}
                <div>
                  <Text className="text-sm font-semibold text-zinc-700 mb-3">Sprachen & Zielländer</Text>
                  <div className="grid grid-cols-2 gap-4">
                    {publication.languages && publication.languages.length > 0 && (
                      <div>
                        <Text className="text-sm text-zinc-500 mb-1">
                          Sprachen ({publication.languages.length})
                        </Text>
                        <div className="flex flex-wrap gap-1">
                          {publication.languages.slice(0, 2).map((lang) => (
                            <Badge key={lang} color="blue" className="text-xs">
                              {lang.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {publication.geographicTargets && publication.geographicTargets.length > 0 && (
                      <div>
                        <Text className="text-sm text-zinc-500 mb-1">
                          Zielländer ({publication.geographicTargets.length})
                        </Text>
                        <div className="flex flex-wrap gap-1">
                          {publication.geographicTargets.slice(0, 2).map((country) => (
                            <Badge key={country} color="blue" className="text-xs">
                              {country}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </InfoCard>

            {/* Metriken & Zahlen */}
            {publication.metrics && (
              <InfoCard title="Metriken & Zahlen" icon={ChartBarIcon}>
                <div className="space-y-6">
                  {/* Frequency */}
                  {publication.metrics.frequency && (
                    <div>
                      <Text className="text-sm font-semibold text-zinc-700 mb-2">Erscheinungsfrequenz</Text>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-zinc-400" />
                        <Text>{frequencyLabels[publication.metrics.frequency]}</Text>
                      </div>
                    </div>
                  )}

                  {/* Print Metrics */}
                  {publication.metrics.print && (
                    <div>
                      <Text className="text-sm font-semibold text-zinc-700 mb-3">Print-Metriken</Text>
                      <div className="grid grid-cols-2 gap-4">
                        {publication.metrics.print.circulation && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Auflage</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.print.circulation.toLocaleString('de-DE')}
                            </Text>
                            {publication.metrics.print.circulationType && (
                              <Text className="text-sm text-zinc-500">
                                {publication.metrics.print.circulationType === 'distributed' ? 'Verbreitete Auflage' :
                                 publication.metrics.print.circulationType === 'sold' ? 'Verkaufte Auflage' :
                                 publication.metrics.print.circulationType === 'printed' ? 'Gedruckte Auflage' :
                                 publication.metrics.print.circulationType === 'subscribers' ? 'Abonnenten' :
                                 'IVW geprüft'}
                              </Text>
                            )}
                          </div>
                        )}
                        {publication.metrics.print.pricePerIssue && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Preis pro Ausgabe</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.print.pricePerIssue.amount.toFixed(2)} {publication.metrics.print.pricePerIssue.currency}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.print.subscriptionPriceMonthly && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Abo-Preis Monat</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.print.subscriptionPriceMonthly.amount.toFixed(2)} {publication.metrics.print.subscriptionPriceMonthly.currency}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.print.subscriptionPriceAnnual && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Abo-Preis Jahr</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.print.subscriptionPriceAnnual.amount.toFixed(2)} {publication.metrics.print.subscriptionPriceAnnual.currency}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.print.paperFormat && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Format</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.print.paperFormat}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.print.pageCount && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Seitenanzahl</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.print.pageCount}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Online Metrics */}
                  {publication.metrics.online && (
                    <div>
                      <Text className="text-sm font-semibold text-zinc-700 mb-3">Online-Metriken</Text>
                      <div className="grid grid-cols-2 gap-4">
                        {publication.metrics.online.monthlyUniqueVisitors && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Monatliche Unique Visitors</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.online.monthlyPageViews && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Monatliche Page Views</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.online.monthlyPageViews.toLocaleString('de-DE')}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.online.avgSessionDuration && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Ø Sitzungsdauer</Text>
                            <Text className="text-lg font-semibold">
                              {Math.floor(publication.metrics.online.avgSessionDuration / 60)}:{(publication.metrics.online.avgSessionDuration % 60).toString().padStart(2, '0')} Min
                            </Text>
                          </div>
                        )}
                        {publication.metrics.online.bounceRate && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Bounce Rate</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.online.bounceRate}%
                            </Text>
                          </div>
                        )}
                        {publication.metrics.online.registeredUsers && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Registrierte Nutzer</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.online.registeredUsers.toLocaleString('de-DE')}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.online.paidSubscribers && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Zahlende Abonnenten</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.online.paidSubscribers.toLocaleString('de-DE')}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.online.newsletterSubscribers && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Newsletter-Abonnenten</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.online.newsletterSubscribers.toLocaleString('de-DE')}
                            </Text>
                          </div>
                        )}
                        {publication.metrics.online.domainAuthority && (
                          <div>
                            <Text className="text-sm font-medium text-zinc-500">Domain Authority</Text>
                            <Text className="text-lg font-semibold">
                              {publication.metrics.online.domainAuthority}/100
                            </Text>
                          </div>
                        )}
                      </div>
                      {(publication.metrics.online.hasPaywall !== undefined || publication.metrics.online.hasMobileApp !== undefined) && (
                        <div className="flex items-center gap-6 pt-4 border-t border-zinc-200 mt-4">
                          {publication.metrics.online.hasPaywall !== undefined && (
                            <div className="flex items-center gap-2">
                              {publication.metrics.online.hasPaywall ? (
                                <CheckIcon className="h-5 w-5 text-green-600" />
                              ) : (
                                <XMarkIcon className="h-5 w-5 text-zinc-400" />
                              )}
                              <Text className="text-sm">Paywall</Text>
                            </div>
                          )}
                          {publication.metrics.online.hasMobileApp !== undefined && (
                            <div className="flex items-center gap-2">
                              {publication.metrics.online.hasMobileApp ? (
                                <CheckIcon className="h-5 w-5 text-green-600" />
                              ) : (
                                <XMarkIcon className="h-5 w-5 text-zinc-400" />
                              )}
                              <Text className="text-sm">Mobile App</Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Target Audience */}
                  {publication.metrics.targetAudience && (
                    <div>
                      <Text className="text-sm font-semibold text-zinc-700 mb-2">Zielgruppe</Text>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <UserGroupIcon className="h-5 w-5 text-zinc-400" />
                          <Text>{publication.metrics.targetAudience}</Text>
                        </div>
                        {publication.metrics.targetAgeGroup && (
                          <Text className="text-sm text-zinc-600">Altersgruppe: {publication.metrics.targetAgeGroup}</Text>
                        )}
                        {publication.metrics.targetGender && (
                          <Text className="text-sm text-zinc-600">
                            Geschlecht: {
                              publication.metrics.targetGender === 'all' ? 'Alle' :
                              publication.metrics.targetGender === 'predominantly_male' ? 'Überwiegend männlich' :
                              'Überwiegend weiblich'
                            }
                          </Text>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Notes */}
            <InfoCard
              title="Notizen"
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
                      disabled={updatePublication.isPending}
                      className="bg-primary hover:bg-primary-hover text-white h-9 px-4"
                    >
                      <CheckIcon className="h-4 w-4 mr-2" />
                      {updatePublication.isPending ? 'Speichern...' : 'Speichern'}
                    </Button>
                    <Button
                      onClick={handleCancelEditNotes}
                      disabled={updatePublication.isPending}
                      className="border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 h-9 px-4"
                    >
                      <XMarkIcon className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {publication.publicNotes && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-700 mb-1">Öffentliche Notizen</Text>
                      <p className="whitespace-pre-wrap text-zinc-700 text-sm">{publication.publicNotes}</p>
                    </div>
                  )}
                  {publication.internalNotes && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-700 mb-1">Interne Notizen</Text>
                      <p className="whitespace-pre-wrap text-zinc-600 text-sm">{publication.internalNotes}</p>
                    </div>
                  )}
                  {!publication.publicNotes && !publication.internalNotes && (
                    <Text className="text-zinc-500">Keine Notizen vorhanden</Text>
                  )}
                </div>
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
                    <span className="ml-2">{formatDate(publication.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                  <div>
                    <span className="text-zinc-600">Aktualisiert:</span>
                    <span className="ml-2">{formatDate(publication.updatedAt)}</span>
                  </div>
                </div>
                {publication.verified && (
                  <div className="pt-3 border-t border-zinc-200">
                    <div className="flex items-center gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex items-baseline gap-2">
                        <Text className="font-medium text-green-700">Verifiziert</Text>
                        {publication.verifiedAt && formatDate(publication.verifiedAt) !== 'Unbekannt' && (
                          <Text className="text-sm text-zinc-600">· {formatDate(publication.verifiedAt)}</Text>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>

            {/* Themenschwerpunkte & Branchen */}
            {((publication.focusAreas && publication.focusAreas.length > 0) ||
              (publication.targetIndustries && publication.targetIndustries.length > 0)) && (
              <InfoCard title="Themenschwerpunkte & Branchen" icon={HashtagIcon}>
                <div className="space-y-4">
                  {publication.focusAreas && publication.focusAreas.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-500 mb-2">
                        Themenschwerpunkte ({publication.focusAreas.length})
                      </Text>
                      <div className="flex flex-wrap gap-2">
                        {publication.focusAreas.map((area, index) => (
                          <Badge key={index} color="blue">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {publication.targetIndustries && publication.targetIndustries.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-500 mb-2">
                        Zielbranchen ({publication.targetIndustries.length})
                      </Text>
                      <div className="flex flex-wrap gap-2">
                        {publication.targetIndustries.map((industry, index) => (
                          <Badge key={index} color="zinc">
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Monitoring-Konfiguration */}
            {publication.monitoringConfig && (
              <InfoCard title="Monitoring-Konfiguration" icon={ClockIcon}>
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <Text className="text-sm font-medium text-zinc-500">Status</Text>
                    <Badge color={publication.monitoringConfig.isEnabled ? "green" : "zinc"}>
                      {publication.monitoringConfig.isEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </Badge>
                  </div>

                  {publication.monitoringConfig.lastChecked && (
                    <div className="flex items-center justify-between">
                      <Text className="text-sm font-medium text-zinc-500">Zuletzt geprüft</Text>
                      <Text className="text-sm">{formatDate(publication.monitoringConfig.lastChecked)}</Text>
                    </div>
                  )}

                  {/* URLs */}
                  {publication.monitoringConfig.rssFeedUrls && publication.monitoringConfig.rssFeedUrls.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-500 mb-2">
                        RSS Feeds ({publication.monitoringConfig.rssFeedUrls.length})
                      </Text>
                      <div className="space-y-1">
                        {publication.monitoringConfig.rssFeedUrls.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:text-primary-hover hover:underline block"
                          >
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {publication.monitoringConfig.keywords && publication.monitoringConfig.keywords.length > 0 && (
                    <div>
                      <Text className="text-sm font-medium text-zinc-500 mb-2">
                        Keywords ({publication.monitoringConfig.keywords.length})
                      </Text>
                      <div className="flex flex-wrap gap-2">
                        {publication.monitoringConfig.keywords.map((keyword, index) => (
                          <Badge key={index} color="blue">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Editions */}
            {publication.editions && publication.editions.length > 0 && (
              <InfoCard title="Ausgaben & Editionen" icon={NewspaperIcon}>
                <div className="space-y-3">
                  {publication.editions.map((edition, index) => (
                    <div key={index} className="border-l-2 border-zinc-200 pl-3">
                      <Text className="font-medium">{edition.name}</Text>
                      <Text className="text-sm text-zinc-500">
                        {edition.type === 'regional' ? 'Regional' :
                         edition.type === 'language' ? 'Sprache' :
                         edition.type === 'demographic' ? 'Zielgruppe' :
                         'Thematisch'}
                      </Text>
                      {edition.countries && edition.countries.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {edition.countries.map((country) => (
                            <Badge key={country} color="zinc" className="text-xs">
                              {country}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <PublicationModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          publication={publication}
          onSuccess={() => {
            setShowEditModal(false);
            toastService.success('Publikation erfolgreich aktualisiert');
          }}
        />
      )}
    </>
  );
}

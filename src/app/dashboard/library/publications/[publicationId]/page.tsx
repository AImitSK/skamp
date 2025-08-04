// src/app/dashboard/library/publications/[publicationId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { publicationService, advertisementService } from "@/lib/firebase/library-service";
import { companiesService } from "@/lib/firebase/crm-service";
import type { Publication, Advertisement } from "@/types/library";
import type { Company } from "@/types/crm";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { Timestamp } from 'firebase/firestore';
import { PublicationModal } from "../PublicationModal";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  NewspaperIcon,
  LinkIcon,
  ClockIcon,
  CurrencyEuroIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

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

// Tab Types
type TabType = 'overview' | 'metrics' | 'editorial' | 'advertisements' | 'identifiers';

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend,
  className = "" 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: { value: number; label: string };
  className?: string;
}) {
  return (
    <div className={`border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-zinc-900 dark:text-white flex items-baseline gap-2">
            {value}
            {trend && (
              <div className={`flex items-center text-sm font-medium ${
                trend.value > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <ArrowTrendingUpIcon className={`h-3 w-3 ${
                  trend.value < 0 ? 'rotate-180' : ''
                }`} />
                <span className="ml-1">{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
            {label}
          </div>
          {subValue && (
            <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
              {subValue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: any }) {
  return (
    <div className="py-3 flex items-center justify-between">
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-white text-right">
        {value}
      </dd>
    </div>
  );
}

export default function PublicationDetailPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const publicationId = params.publicationId as string;

  const [publication, setPublication] = useState<Publication | null>(null);
  const [publisher, setPublisher] = useState<Company | null>(null);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user && currentOrganization && publicationId) {
      loadData();
    }
  }, [user, currentOrganization, publicationId]);

  const loadData = async () => {
    if (!user || !currentOrganization) return;

    try {
      setLoading(true);
      
      // Lade Publikation
      const pubData = await publicationService.getById(publicationId, currentOrganization.id);
      if (!pubData) {
        router.push('/dashboard/library/publications');
        return;
      }
      setPublication(pubData);

      // Lade Publisher (Verlag)
      if (pubData.publisherId) {
        try {
          const publisherData = await companiesService.getById(pubData.publisherId);
          setPublisher(publisherData);
        } catch (error) {
        }
      }

      // Lade zugehörige Werbemittel
      const adsData = await advertisementService.getByPublicationId(publicationId, currentOrganization.id);
      setAdvertisements(adsData);

    } catch (error) {
      router.push('/dashboard/library/publications');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !currentOrganization || !publication) return;

    setDeleting(true);
    try {
      await publicationService.update(
        publicationId,
        {
          deletedAt: Timestamp.now(),
          deletedBy: user.uid
        },
        {
          organizationId: currentOrganization.id,
          userId: user.uid
        }
      );
      router.push('/dashboard/library/publications');
    } catch (error) {
      alert("Fehler beim Löschen der Publikation");
    } finally {
      setDeleting(false);
    }
  };

  const handleVerify = async () => {
    if (!user || !currentOrganization || !publication) return;

    try {
      await publicationService.verify(publicationId, {
        organizationId: currentOrganization.id,
        userId: user.uid
      });
      await loadData();
    } catch (error) {
      alert("Fehler beim Verifizieren");
    }
  };

  const formatMetric = (pub: Publication): string => {
    if (pub.metrics?.print?.circulation) {
      return `${pub.metrics.print.circulation.toLocaleString('de-DE')} Auflage`;
    }
    if (pub.metrics?.online?.monthlyUniqueVisitors) {
      return `${pub.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')} UV/Monat`;
    }
    return "—";
  };

  const formatDate = (date: Date | undefined | any): string => {
    if (!date) return "—";
    // Handle Firestore Timestamp
    if (date?.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('de-DE');
    }
    // Handle regular Date
    if (date instanceof Date) {
      return date.toLocaleDateString('de-DE');
    }
    // Try to parse as Date
    try {
      return new Date(date).toLocaleDateString('de-DE');
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">Lade Publikation...</Text>
        </div>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="text-center py-12">
        <Text>Publikation nicht gefunden</Text>
        <Button className="mt-4" onClick={() => router.push('/dashboard/library/publications')}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Button
            plain
            onClick={() => router.push('/dashboard/library/publications')}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Heading level={1}>{publication.title}</Heading>
              {publication.verified && (
                <CheckBadgeIcon className="h-6 w-6 text-green-500" />
              )}
            </div>
            {publication.subtitle && (
              <Text className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">
                {publication.subtitle}
              </Text>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              {publisher && (
                <Link
                  href={`/dashboard/contacts/crm/companies/${publisher.id}`}
                  className="flex items-center hover:text-primary"
                >
                  <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                  {publisher.name}
                </Link>
              )}
              <span className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Erstellt am {formatDate(publication.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!publication.verified && (
              <Button plain onClick={handleVerify}>
                <CheckBadgeIcon className="h-4 w-4 mr-2" />
                Verifizieren
              </Button>
            )}
            <Button onClick={() => setShowEditModal(true)} className="px-6 py-2">
              <PencilIcon className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
            <Dropdown>
              <DropdownButton plain>
                <EllipsisVerticalIcon className="h-5 w-5" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/dashboard/library/publications/${publicationId}`);
                  alert("Link kopiert!");
                }}>
                  <LinkIcon />
                  Link kopieren
                </DropdownItem>
                <DropdownItem>
                  <DocumentDuplicateIcon />
                  Duplizieren
                </DropdownItem>
                <DropdownItem>
                  <ShareIcon />
                  Teilen
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={() => setShowDeleteDialog(true)}>
                  <TrashIcon />
                  <span className="text-red-600">Löschen</span>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge color="zinc">{publicationTypeLabels[publication.type] || publication.type}</Badge>
        <Badge color="blue">{formatLabels[publication.format] || publication.format}</Badge>
        <Badge color="green">{scopeLabels[publication.geographicScope]}</Badge>
        {publication.status === 'active' ? (
          <Badge color="green">Aktiv</Badge>
        ) : publication.status === 'inactive' ? (
          <Badge color="yellow">Inaktiv</Badge>
        ) : (
          <Badge color="red">Eingestellt</Badge>
        )}
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ChartBarIcon}
          label="Reichweite"
          value={formatMetric(publication)}
          subValue={publication.metrics?.frequency ? frequencyLabels[publication.metrics.frequency] : undefined}
        />
        <StatCard
          icon={GlobeAltIcon}
          label="Geografisch"
          value={publication.geographicTargets?.length || 0}
          subValue={`${publication.geographicTargets?.length || 0} Länder`}
        />
        <StatCard
          icon={NewspaperIcon}
          label="Werbemittel"
          value={advertisements.length}
          subValue="Verfügbar"
        />
        <StatCard
          icon={UserGroupIcon}
          label="Sprachen"
          value={publication.languages?.length || 0}
          subValue={publication.languages?.join(", ") || "—"}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-zinc-200 dark:border-zinc-700">
          <nav aria-label="Tabs" className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Übersicht
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`${
                activeTab === 'metrics'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Metriken & Zahlen
            </button>
            <button
              onClick={() => setActiveTab('editorial')}
              className={`${
                activeTab === 'editorial'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Redaktion & Einreichung
            </button>
            <button
              onClick={() => setActiveTab('advertisements')}
              className={`${
                activeTab === 'advertisements'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Werbemittel ({advertisements.length})
            </button>
            <button
              onClick={() => setActiveTab('identifiers')}
              className={`${
                activeTab === 'identifiers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Identifikatoren & Links
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Grundinformationen
                </h3>
                <dl className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  <InfoRow label="Typ" value={publicationTypeLabels[publication.type] || publication.type} />
                  <InfoRow label="Format" value={formatLabels[publication.format] || publication.format} />
                  <InfoRow label="Geografischer Fokus" value={scopeLabels[publication.geographicScope]} />
                  <InfoRow label="Status" value={
                    publication.status === 'active' ? (
                      <Badge color="green">Aktiv</Badge>
                    ) : publication.status === 'inactive' ? (
                      <Badge color="yellow">Inaktiv</Badge>
                    ) : (
                      <Badge color="red">Eingestellt</Badge>
                    )
                  } />
                  {publication.launchDate && (
                    <InfoRow label="Gegründet" value={formatDate(publication.launchDate)} />
                  )}
                </dl>
              </div>

              {/* Focus Areas */}
              {publication.focusAreas && publication.focusAreas.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                    Themenschwerpunkte
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {publication.focusAreas.map((area, index) => (
                      <Badge key={index} color="blue">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Industries */}
              {publication.targetIndustries && publication.targetIndustries.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                    Zielbranchen
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {publication.targetIndustries.map((industry, index) => (
                      <Badge key={index} color="zinc">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(publication.publicNotes || publication.internalNotes) && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                    Notizen
                  </h3>
                  {publication.publicNotes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Öffentliche Notizen
                      </h4>
                      <Text className="text-sm whitespace-pre-wrap">{publication.publicNotes}</Text>
                    </div>
                  )}
                  {publication.internalNotes && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Interne Notizen
                      </h4>
                      <Text className="text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                        {publication.internalNotes}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Languages & Countries */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Sprachen & Länder
                </h3>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Sprachen ({publication.languages?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {publication.languages?.map((lang) => (
                      <Badge key={lang} color="blue" className="text-xs">
                        {lang.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Zielländer ({publication.geographicTargets?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {publication.geographicTargets?.map((country) => (
                      <Badge key={country} color="green" className="text-xs">
                        {country}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verification Info */}
              {publication.verified && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <div className="flex items-center">
                    <CheckBadgeIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                        Verifizierte Publikation
                      </h3>
                      {publication.verifiedAt && (
                        <Text className="mt-1 text-sm text-green-700 dark:text-green-300">
                          Verifiziert am {formatDate(publication.verifiedAt)}
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Schnellaktionen
                </h3>
                <div className="space-y-2">
                  {publication.websiteUrl && (
                    <a
                      href={publication.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-primary hover:text-primary-hover"
                    >
                      <GlobeAltIcon className="h-4 w-4 mr-2" />
                      Website besuchen
                    </a>
                  )}
                  <button
                    onClick={() => setActiveTab('advertisements')}
                    className="flex items-center text-sm text-primary hover:text-primary-hover"
                  >
                    <NewspaperIcon className="h-4 w-4 mr-2" />
                    Werbemittel anzeigen ({advertisements.length})
                  </button>
                  <Link
                    href={`/dashboard/library/media-kits/new?publicationId=${publicationId}`}
                    className="flex items-center text-sm text-primary hover:text-primary-hover"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Media Kit erstellen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Frequency */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                Erscheinungsfrequenz
              </h3>
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-zinc-400 mr-2" />
                <Text className="text-lg">
                  {publication.metrics?.frequency ? frequencyLabels[publication.metrics.frequency] : "Nicht angegeben"}
                </Text>
              </div>
            </div>

            {/* Print Metrics */}
            {publication.metrics?.print && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Print-Metriken
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {publication.metrics.print.circulation && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Auflage
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {publication.metrics.print.circulation.toLocaleString('de-DE')}
                      </dd>
                      {publication.metrics.print.circulationType && (
                        <dd className="text-sm text-zinc-500 dark:text-zinc-400">
                          {publication.metrics.print.circulationType === 'distributed' ? 'Verbreitete Auflage' :
                           publication.metrics.print.circulationType === 'sold' ? 'Verkaufte Auflage' :
                           publication.metrics.print.circulationType === 'printed' ? 'Gedruckte Auflage' :
                           publication.metrics.print.circulationType === 'subscribers' ? 'Abonnenten' :
                           'IVW geprüft'}
                        </dd>
                      )}
                    </div>
                  )}
                  {publication.metrics.print.pricePerIssue && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Preis pro Ausgabe
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {publication.metrics.print.pricePerIssue.amount.toFixed(2)} {publication.metrics.print.pricePerIssue.currency}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Online Metrics */}
            {publication.metrics?.online && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Online-Metriken
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {publication.metrics.online.monthlyUniqueVisitors && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Monatliche Unique Visitors
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {publication.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')}
                      </dd>
                    </div>
                  )}
                  {publication.metrics.online.monthlyPageViews && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Monatliche Page Views
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {publication.metrics.online.monthlyPageViews.toLocaleString('de-DE')}
                      </dd>
                    </div>
                  )}
                  {publication.metrics.online.avgSessionDuration && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Ø Sitzungsdauer
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {Math.floor(publication.metrics.online.avgSessionDuration / 60)}:{(publication.metrics.online.avgSessionDuration % 60).toString().padStart(2, '0')} Min
                      </dd>
                    </div>
                  )}
                  {publication.metrics.online.bounceRate && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Bounce Rate
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {publication.metrics.online.bounceRate}%
                      </dd>
                    </div>
                  )}
                  {publication.metrics.online.registeredUsers && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Registrierte Nutzer
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {publication.metrics.online.registeredUsers.toLocaleString('de-DE')}
                      </dd>
                    </div>
                  )}
                  {publication.metrics.online.paidSubscribers && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Zahlende Abonnenten
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {publication.metrics.online.paidSubscribers.toLocaleString('de-DE')}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Audience Demographics */}
            {publication.metrics?.targetAudience && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Zielgruppe
                </h3>
                <dl className="space-y-3">
                  <InfoRow label="Zielgruppe" value={publication.metrics.targetAudience} />
                  {publication.metrics.targetAgeGroup && (
                    <InfoRow label="Altersgruppe" value={publication.metrics.targetAgeGroup} />
                  )}
                  {publication.metrics.targetGender && (
                    <InfoRow label="Geschlecht" value={
                      publication.metrics.targetGender === 'all' ? 'Alle' :
                      publication.metrics.targetGender === 'predominantly_male' ? 'Überwiegend männlich' :
                      'Überwiegend weiblich'
                    } />
                  )}
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Editorial Tab */}
        {activeTab === 'editorial' && (
          <div className="space-y-6">
            {/* Editorial Contacts */}
            {publication.editorialContacts && publication.editorialContacts.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Redaktionelle Kontakte
                </h3>
                <div className="space-y-4">
                  {publication.editorialContacts.map((contact, index) => (
                    <div key={index} className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {contact.role}
                      </div>
                      {contact.name && (
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {contact.name}
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-4 text-sm">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="text-primary hover:text-primary-hover">
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-primary hover:text-primary-hover">
                            {contact.phone}
                          </a>
                        )}
                      </div>
                      {contact.topics && contact.topics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {contact.topics.map((topic, i) => (
                            <Badge key={i} color="zinc" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submission Guidelines */}
            {publication.submissionGuidelines && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Einreichungsrichtlinien
                </h3>
                
                {publication.submissionGuidelines.generalInfo && (
                  <div className="mb-4">
                    <Text className="text-sm whitespace-pre-wrap">
                      {publication.submissionGuidelines.generalInfo}
                    </Text>
                  </div>
                )}

                <dl className="space-y-3">
                  {publication.submissionGuidelines.preferredSubmissionMethod && (
                    <InfoRow label="Bevorzugte Einreichungsmethode" value={
                      publication.submissionGuidelines.preferredSubmissionMethod === 'email' ? 'E-Mail' :
                      publication.submissionGuidelines.preferredSubmissionMethod === 'portal' ? 'Online-Portal' :
                      'Telefon'
                    } />
                  )}
                  
                  {publication.submissionGuidelines.submissionEmail && (
                    <InfoRow label="Einreichungs-E-Mail" value={
                      <a href={`mailto:${publication.submissionGuidelines.submissionEmail}`} className="text-primary hover:text-primary-hover">
                        {publication.submissionGuidelines.submissionEmail}
                      </a>
                    } />
                  )}
                  
                  {publication.submissionGuidelines.submissionPortalUrl && (
                    <InfoRow label="Online-Portal" value={
                      <a href={publication.submissionGuidelines.submissionPortalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">
                        Portal öffnen
                      </a>
                    } />
                  )}
                </dl>

                {publication.submissionGuidelines.preferredFormats && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Bevorzugte Formate
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {publication.submissionGuidelines.preferredFormats.map((format) => (
                        <Badge key={format} color="blue">
                          {format === 'press_release' ? 'Pressemitteilung' :
                           format === 'exclusive' ? 'Exklusiv' :
                           format === 'opinion' ? 'Meinung/Kommentar' :
                           format === 'study' ? 'Studie' :
                           'Interview'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {publication.submissionGuidelines.deadlines && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Deadlines
                    </h4>
                    <Text className="text-sm">
                      {publication.submissionGuidelines.deadlines.type === 'daily' ? 'Täglich' :
                       publication.submissionGuidelines.deadlines.type === 'weekly' ? 'Wöchentlich' :
                       publication.submissionGuidelines.deadlines.type === 'monthly' ? 'Monatlich' :
                       'Ausgabenspezifisch'}
                      {publication.submissionGuidelines.deadlines.time && ` um ${publication.submissionGuidelines.deadlines.time} Uhr`}
                      {publication.submissionGuidelines.deadlines.daysBeforePublication && `, ${publication.submissionGuidelines.deadlines.daysBeforePublication} Tage vor Veröffentlichung`}
                    </Text>
                    {publication.submissionGuidelines.deadlines.notes && (
                      <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {publication.submissionGuidelines.deadlines.notes}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sections */}
            {publication.sections && publication.sections.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Ressorts & Rubriken
                </h3>
                <div className="space-y-3">
                  {publication.sections.map((section, index) => (
                    <div key={index} className="pb-3 border-b border-zinc-200 dark:border-zinc-700 last:border-0">
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {section.name}
                      </div>
                      {section.description && (
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          {section.description}
                        </Text>
                      )}
                      {section.focusTopics && section.focusTopics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {section.focusTopics.map((topic, i) => (
                            <Badge key={i} color="zinc" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advertisements Tab */}
        {activeTab === 'advertisements' && (
          <div>
            {advertisements.length === 0 ? (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-12 text-center">
                <NewspaperIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <Text className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                  Keine Werbemittel vorhanden
                </Text>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Für diese Publikation wurden noch keine Werbemittel angelegt.
                </Text>
                <Link href={`/dashboard/library/advertisements/new?publicationId=${publicationId}`}>
                  <Button className="px-6 py-2">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Werbemittel erstellen
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Typ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Preis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Aktionen</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {advertisements.map((ad) => (
                      <tr key={ad.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/library/advertisements/${ad.id}`}
                            className="text-sm font-medium text-zinc-900 dark:text-white hover:text-primary"
                          >
                            {ad.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge color="zinc">
                            {ad.type === 'display_banner' ? 'Display Banner' :
                             ad.type === 'print_ad' ? 'Print-Anzeige' :
                             ad.type === 'native_ad' ? 'Native Ad' :
                             ad.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-white">
                          {ad.pricing.listPrice.amount.toFixed(2)} {ad.pricing.listPrice.currency}
                          <span className="text-zinc-500 dark:text-zinc-400 ml-1">
                            / {ad.pricing.priceUnit || 'Einheit'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ad.status === 'active' ? (
                            <Badge color="green">Aktiv</Badge>
                          ) : ad.status === 'draft' ? (
                            <Badge color="zinc">Entwurf</Badge>
                          ) : (
                            <Badge color="yellow">Pausiert</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/library/advertisements/${ad.id}`}
                            className="text-primary hover:text-primary-hover"
                          >
                            Anzeigen
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Identifiers Tab */}
        {activeTab === 'identifiers' && (
          <div className="space-y-6">
            {/* Identifiers */}
            {publication.identifiers && publication.identifiers.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Identifikatoren
                </h3>
                <dl className="space-y-3">
                  {publication.identifiers.map((identifier, index) => (
                    <InfoRow
                      key={index}
                      label={identifier.type}
                      value={
                        <span className="font-mono text-sm">
                          {identifier.value}
                        </span>
                      }
                    />
                  ))}
                </dl>
              </div>
            )}

            {/* URLs */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                Online-Präsenz
              </h3>
              <dl className="space-y-3">
                {publication.websiteUrl && (
                  <InfoRow
                    label="Website"
                    value={
                      <a
                        href={publication.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover"
                      >
                        {publication.websiteUrl}
                      </a>
                    }
                  />
                )}
                {publication.rssFeedUrl && (
                  <InfoRow
                    label="RSS Feed"
                    value={
                      <a
                        href={publication.rssFeedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover"
                      >
                        {publication.rssFeedUrl}
                      </a>
                    }
                  />
                )}
              </dl>

              {/* Social Media */}
              {publication.socialMediaUrls && publication.socialMediaUrls.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Social Media
                  </h4>
                  <div className="space-y-2">
                    {publication.socialMediaUrls.map((social, index) => (
                      <a
                        key={index}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-primary hover:text-primary-hover"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {social.platform}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Editions */}
            {publication.editions && publication.editions.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Ausgaben & Editionen
                </h3>
                <div className="space-y-4">
                  {publication.editions.map((edition, index) => (
                    <div key={index} className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {edition.name}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {edition.type === 'regional' ? 'Regional' :
                         edition.type === 'language' ? 'Sprache' :
                         edition.type === 'demographic' ? 'Zielgruppe' :
                         'Thematisch'}
                      </div>
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <PublicationModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          publication={publication}
          onSuccess={async () => {
            setShowEditModal(false);
            await loadData();
          }}
        />
      )}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>Publikation löschen</DialogTitle>
              <DialogBody className="mt-2">
                <Text>
                  Möchten Sie die Publikation &ldquo;{publication.title}&rdquo; wirklich löschen? 
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button plain onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button color="zinc" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Lösche...' : 'Löschen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
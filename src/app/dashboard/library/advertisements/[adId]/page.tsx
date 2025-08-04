// src/app/dashboard/library/advertisements/[adId]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import {
  DocumentIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  CalculatorIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyEuroIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  PhotoIcon,
  FilmIcon,
  SpeakerWaveIcon,
  EnvelopeIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/20/solid";
import { advertisementService, publicationService } from "@/lib/firebase/library-service";
import { companiesService } from "@/lib/firebase/crm-service";
import { 
  Advertisement, 
  Publication,
  ADVERTISEMENT_TYPE_LABELS,
  PRICE_MODEL_LABELS,
  AdvertisementType,
  PriceModel
} from "@/types/library";
import { Company } from "@/types/crm";
import { CountryCode, CurrencyCode } from "@/types/international";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import clsx from "clsx";
import { AdvertisementModal } from "../AdvertisementModal";

// Simple Alert Component
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
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800',
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-lg border p-4 ${styles[type]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <p className="font-medium">{title}</p>
            {message && <p className="mt-1 text-sm">{message}</p>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className="font-medium underline hover:no-underline"
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

// Helper: Format Currency
function formatCurrency(amount: number, currency: CurrencyCode = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Helper: Get Icon for Ad Type
function getAdTypeIcon(type: AdvertisementType) {
  const icons: Record<AdvertisementType, typeof DocumentIcon> = {
    'display_banner': PhotoIcon,
    'native_ad': DocumentTextIcon,
    'video_ad': FilmIcon,
    'print_ad': DocumentIcon,
    'audio_spot': SpeakerWaveIcon,
    'newsletter_ad': EnvelopeIcon,
    'social_media_ad': GlobeAltIcon,
    'advertorial': DocumentTextIcon,
    'event_sponsoring': CalendarIcon,
    'content_partnership': DocumentDuplicateIcon,
    'custom': DocumentIcon
  };
  return icons[type] || DocumentIcon;
}

// Price Calculator Component
function PriceCalculator({ 
  advertisement,
  onClose 
}: { 
  advertisement: Advertisement;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [bookingsPerYear, setBookingsPerYear] = useState(1);
  const [daysInAdvance, setDaysInAdvance] = useState(30);
  const [isAgency, setIsAgency] = useState(false);

  const calculatedPrice = useMemo(() => {
    return advertisementService.calculatePrice(advertisement, {
      quantity,
      bookingsPerYear,
      daysInAdvance,
      isAgency
    });
  }, [advertisement, quantity, bookingsPerYear, daysInAdvance, isAgency]);

  return (
    <Dialog open={true} onClose={onClose}>
      <div className="p-6">
        <DialogTitle>Preiskalkulator</DialogTitle>
        <DialogBody className="mt-4">
          <div className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Menge
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:border-zinc-600 dark:bg-zinc-700"
              />
            </div>

            {/* Bookings per Year */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Buchungen pro Jahr
              </label>
              <input
                type="number"
                min="1"
                value={bookingsPerYear}
                onChange={(e) => setBookingsPerYear(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:border-zinc-600 dark:bg-zinc-700"
              />
            </div>

            {/* Days in Advance */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Tage im Voraus
              </label>
              <input
                type="number"
                min="0"
                value={daysInAdvance}
                onChange={(e) => setDaysInAdvance(parseInt(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:border-zinc-600 dark:bg-zinc-700"
              />
            </div>

            {/* Agency */}
            <div className="flex items-center">
              <input
                id="is-agency"
                type="checkbox"
                checked={isAgency}
                onChange={(e) => setIsAgency(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is-agency" className="ml-2 block text-sm text-zinc-700 dark:text-zinc-300">
                Agentur-Buchung
              </label>
            </div>

            {/* Results */}
            <div className="mt-6 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Basispreis:</span>
                  <span className="font-medium">{formatCurrency(calculatedPrice.basePrice, calculatedPrice.currency)}</span>
                </div>

                {calculatedPrice.discounts.map((discount, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{discount.type} ({discount.percent}%):</span>
                    <span className="font-medium text-green-600">-{formatCurrency(discount.amount, calculatedPrice.currency)}</span>
                  </div>
                ))}

                {calculatedPrice.surcharges.map((surcharge, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{surcharge.type}:</span>
                    <span className="font-medium text-red-600">+{formatCurrency(surcharge.amount, calculatedPrice.currency)}</span>
                  </div>
                ))}

                <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
                  <div className="flex justify-between">
                    <span className="text-base font-medium">Gesamtpreis:</span>
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(calculatedPrice.totalPrice, calculatedPrice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions className="mt-6">
          <Button plain onClick={onClose}>
            Schließen
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}

export default function AdvertisementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const adId = params.adId as string;

  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [publisher, setPublisher] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPriceCalculator, setShowPriceCalculator] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  useEffect(() => {
    if (user && currentOrganization && adId) {
      loadData();
    }
  }, [user, currentOrganization, adId]);

  const loadData = async () => {
    if (!user || !currentOrganization) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load advertisement
      const adData = await advertisementService.getById(adId, currentOrganization.id);
      if (!adData) {
        setError('Werbemittel nicht gefunden');
        return;
      }
      setAdvertisement(adData);

      // Load related publications
      if (adData.publicationIds.length > 0) {
        const pubPromises = adData.publicationIds.map(id => 
          publicationService.getById(id, currentOrganization.id)
        );
        const pubResults = await Promise.all(pubPromises);
        const validPubs = pubResults.filter(p => p !== null) as Publication[];
        setPublications(validPubs);

        // Load publisher from first publication
        if (validPubs.length > 0 && validPubs[0].publisherId) {
          const pub = await companiesService.getById(validPubs[0].publisherId);
          setPublisher(pub);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !currentOrganization || !advertisement) return;

    try {
      await advertisementService.softDelete(adId, { organizationId: currentOrganization.id, userId: user.uid });
      router.push('/dashboard/library/advertisements');
    } catch (err) {
      console.error('Error deleting advertisement:', err);
      setError('Fehler beim Löschen');
    }
  };

  const handleDuplicate = async () => {
    if (!user || !currentOrganization || !advertisement) return;

    try {
      const newId = await advertisementService.duplicate(
        adId,
        { organizationId: currentOrganization.id, userId: user.uid },
        { newName: `${advertisement.name} (Kopie)` }
      );
      router.push(`/dashboard/library/advertisements/${newId}`);
    } catch (err) {
      console.error('Error duplicating advertisement:', err);
      setError('Fehler beim Duplizieren');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">Lade Werbemittel...</Text>
        </div>
      </div>
    );
  }

  if (error || !advertisement) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert
          type="error"
          title="Fehler"
          message={error || 'Werbemittel konnte nicht geladen werden'}
          action={{
            label: 'Zurück zur Übersicht',
            onClick: () => router.push('/dashboard/library/advertisements')
          }}
        />
      </div>
    );
  }

  const AdTypeIcon = getAdTypeIcon(advertisement.type);

  // Check availability for today
  const availabilityToday = advertisementService.isAvailable(advertisement, new Date());

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/dashboard/library/advertisements"
          className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <AdTypeIcon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
            </div>
            <div>
              <Heading level={1} className="flex items-center gap-3">
                {advertisement.displayName || advertisement.name}
                <Badge color={advertisement.status === 'active' ? 'green' : advertisement.status === 'paused' ? 'yellow' : 'zinc'}>
                  {advertisement.status === 'active' ? 'Aktiv' : advertisement.status === 'paused' ? 'Pausiert' : 'Entwurf'}
                </Badge>
              </Heading>
              <div className="mt-1 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                <span>{ADVERTISEMENT_TYPE_LABELS[advertisement.type]}</span>
                <span>•</span>
                <span>{PRICE_MODEL_LABELS[advertisement.pricing.priceModel]}</span>
                <span>•</span>
                <span>{formatCurrency(advertisement.pricing.listPrice.amount, advertisement.pricing.listPrice.currency)}</span>
                {advertisement.pricing.priceUnit && (
                  <>
                    <span>/</span>
                    <span>{advertisement.pricing.priceUnit}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowPriceCalculator(true)}>
              <CalculatorIcon />
              Preis berechnen
            </Button>
            <Dropdown>
              <DropdownButton plain>
                <EllipsisVerticalIcon />
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem onClick={() => setShowEditModal(true)}>
                  <PencilIcon />
                  Bearbeiten
                </DropdownItem>
                <DropdownItem onClick={handleDuplicate}>
                  <DocumentDuplicateIcon />
                  Duplizieren
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

      {/* Tabs */}
      <TabGroup selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
        <TabList className="flex space-x-1 border-b border-zinc-200 dark:border-zinc-700">
          {['Übersicht', 'Spezifikationen', 'Preise & Rabatte', 'Verfügbarkeit', 'Performance', 'Materialien'].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                clsx(
                  'whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                  selected
                    ? 'border-primary text-primary'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                )
              }
            >
              {tab}
            </Tab>
          ))}
        </TabList>

        <TabPanels className="mt-6">
          {/* Übersicht Tab */}
          <TabPanel>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Beschreibung */}
                {advertisement.description && (
                  <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-3">Beschreibung</h3>
                    <Text className="whitespace-pre-wrap">{advertisement.description}</Text>
                  </div>
                )}

                {/* Zugeordnete Publikationen */}
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                    Publikationen ({publications.length})
                  </h3>
                  <div className="space-y-3">
                    {publications.map((pub) => (
                      <Link
                        key={pub.id}
                        href={`/dashboard/library/publications/${pub.id}`}
                        className="block rounded-lg border border-zinc-200 p-4 hover:border-primary hover:shadow-sm transition-all dark:border-zinc-700 dark:hover:border-primary"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-zinc-900 dark:text-white">{pub.title}</h4>
                            <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                              {pub.publisherName && <span>{pub.publisherName}</span>}
                              {pub.metrics.print?.circulation && (
                                <>
                                  <span>•</span>
                                  <span>Auflage: {pub.metrics.print.circulation.toLocaleString('de-DE')}</span>
                                </>
                              )}
                              {pub.metrics.online?.monthlyUniqueVisitors && (
                                <>
                                  <span>•</span>
                                  <span>Unique Visitors: {pub.metrics.online.monthlyUniqueVisitors.toLocaleString('de-DE')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge color="zinc">{pub.type}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Marketing Bullet Points */}
                {advertisement.marketingBulletPoints && advertisement.marketingBulletPoints.length > 0 && (
                  <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Verkaufsargumente</h3>
                    <ul className="space-y-2">
                      {advertisement.marketingBulletPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircleIcon className="mr-2 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <Text>{point}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Auf einen Blick</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-zinc-500 dark:text-zinc-400">Verfügbarkeit</dt>
                      <dd className="mt-1 flex items-center">
                        {availabilityToday.available ? (
                          <>
                            <CheckCircleIcon className="mr-1.5 h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-green-600">Verfügbar</span>
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="mr-1.5 h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium text-red-600">
                              {availabilityToday.reason || 'Nicht verfügbar'}
                            </span>
                          </>
                        )}
                      </dd>
                    </div>
                    
                    {advertisement.availability.bookingDeadline && (
                      <div>
                        <dt className="text-sm text-zinc-500 dark:text-zinc-400">Buchungsvorlauf</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {advertisement.availability.bookingDeadline.days} {advertisement.availability.bookingDeadline.type === 'business_days' ? 'Werktage' : 'Tage'}
                        </dd>
                      </div>
                    )}

                    {advertisement.pricing.minimumOrder && (
                      <div>
                        <dt className="text-sm text-zinc-500 dark:text-zinc-400">Mindestbestellung</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {advertisement.pricing.minimumOrder.quantity} {advertisement.pricing.minimumOrder.unit}
                        </dd>
                      </div>
                    )}

                    {advertisement.performance?.totalBookings && (
                      <>
                        <div>
                          <dt className="text-sm text-zinc-500 dark:text-zinc-400">Buchungen gesamt</dt>
                          <dd className="mt-1 text-sm font-medium">{advertisement.performance.totalBookings}</dd>
                        </div>
                        {advertisement.performance.totalRevenue && (
                          <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">Umsatz gesamt</dt>
                            <dd className="mt-1 text-sm font-medium">
                              {formatCurrency(advertisement.performance.totalRevenue.amount, advertisement.performance.totalRevenue.currency)}
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>
                </div>

                {/* Tags */}
                {advertisement.tags && advertisement.tags.length > 0 && (
                  <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {advertisement.tags.map((tag) => (
                        <Badge key={tag} color="zinc">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Metadaten</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">Erstellt am</dt>
                      <dd className="font-medium">
                        {advertisement.createdAt ? format(advertisement.createdAt instanceof Date ? advertisement.createdAt : advertisement.createdAt.toDate(), 'dd.MM.yyyy') : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">Zuletzt aktualisiert</dt>
                      <dd className="font-medium">
                        {advertisement.updatedAt ? format(advertisement.updatedAt instanceof Date ? advertisement.updatedAt : advertisement.updatedAt.toDate(), 'dd.MM.yyyy') : '—'}
                      </dd>
                    </div>
                    {advertisement.approval && (
                      <div className="flex justify-between">
                        <dt className="text-zinc-500 dark:text-zinc-400">Freigabe</dt>
                        <dd>
                          <Badge color={advertisement.approval.status === 'approved' ? 'green' : advertisement.approval.status === 'rejected' ? 'red' : 'yellow'}>
                            {advertisement.approval.status === 'approved' ? 'Freigegeben' : advertisement.approval.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                          </Badge>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Spezifikationen Tab */}
          <TabPanel>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* General Specs */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Allgemeine Spezifikationen</h3>
                <dl className="space-y-3">
                  {advertisement.specifications.format && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Format</dt>
                      <dd className="mt-1 text-sm">{advertisement.specifications.format}</dd>
                    </div>
                  )}
                  {advertisement.specifications.position && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Position</dt>
                      <dd className="mt-1 text-sm">{advertisement.specifications.position.join(', ')}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Type-specific Specs */}
              {advertisement.specifications.printSpecs && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Print-Spezifikationen</h3>
                  <dl className="space-y-3">
                    {advertisement.specifications.printSpecs.dimensions && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Abmessungen</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.printSpecs.dimensions}</dd>
                      </div>
                    )}
                    {advertisement.specifications.printSpecs.bleed && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Beschnitt</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.printSpecs.bleed}</dd>
                      </div>
                    )}
                    {advertisement.specifications.printSpecs.colorSpace && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Farbraum</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.printSpecs.colorSpace}</dd>
                      </div>
                    )}
                    {advertisement.specifications.printSpecs.resolution && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Auflösung</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.printSpecs.resolution}</dd>
                      </div>
                    )}
                    {advertisement.specifications.printSpecs.fileFormats && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Dateiformate</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.printSpecs.fileFormats.join(', ')}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {advertisement.specifications.digitalSpecs && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Digital-Spezifikationen</h3>
                  <dl className="space-y-3">
                    {advertisement.specifications.digitalSpecs.dimensions && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Abmessungen</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.digitalSpecs.dimensions.join(', ')}</dd>
                      </div>
                    )}
                    {advertisement.specifications.digitalSpecs.maxFileSize && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Max. Dateigröße</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.digitalSpecs.maxFileSize}</dd>
                      </div>
                    )}
                    {advertisement.specifications.digitalSpecs.fileFormats && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Dateiformate</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.digitalSpecs.fileFormats.join(', ')}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Animation</dt>
                      <dd className="mt-1 text-sm">
                        {advertisement.specifications.digitalSpecs.animated ? (
                          <>
                            <span className="text-green-600">Erlaubt</span>
                            {advertisement.specifications.digitalSpecs.maxAnimationLength && (
                              <span className="text-zinc-500"> (max. {advertisement.specifications.digitalSpecs.maxAnimationLength}s)</span>
                            )}
                          </>
                        ) : (
                          <span className="text-red-600">Nicht erlaubt</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {advertisement.specifications.videoSpecs && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Video-Spezifikationen</h3>
                  <dl className="space-y-3">
                    {advertisement.specifications.videoSpecs.length && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Länge</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.videoSpecs.length.join('s, ')}s</dd>
                      </div>
                    )}
                    {advertisement.specifications.videoSpecs.resolution && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Auflösung</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.videoSpecs.resolution.join(', ')}</dd>
                      </div>
                    )}
                    {advertisement.specifications.videoSpecs.aspectRatio && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Seitenverhältnis</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.videoSpecs.aspectRatio}</dd>
                      </div>
                    )}
                    {advertisement.specifications.videoSpecs.fileFormats && (
                      <div>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Dateiformate</dt>
                        <dd className="mt-1 text-sm">{advertisement.specifications.videoSpecs.fileFormats.join(', ')}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Custom Specs */}
              {advertisement.specifications.customSpecs && Object.keys(advertisement.specifications.customSpecs).length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Weitere Spezifikationen</h3>
                  <dl className="space-y-3">
                    {Object.entries(advertisement.specifications.customSpecs).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{key}</dt>
                        <dd className="mt-1 text-sm">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Preise & Rabatte Tab */}
          <TabPanel>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Base Pricing */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Basispreis</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
                      {formatCurrency(advertisement.pricing.listPrice.amount, advertisement.pricing.listPrice.currency)}
                    </span>
                    <Badge color="zinc">{PRICE_MODEL_LABELS[advertisement.pricing.priceModel]}</Badge>
                  </div>
                  {advertisement.pricing.priceUnit && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      pro {advertisement.pricing.priceUnit}
                    </p>
                  )}
                  {advertisement.pricing.minimumOrder && (
                    <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <InformationCircleIcon className="inline h-4 w-4 mr-1" />
                        Mindestbestellung: {advertisement.pricing.minimumOrder.quantity} {advertisement.pricing.minimumOrder.unit}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Discounts */}
              {advertisement.pricing.discounts && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Rabatte</h3>
                  <div className="space-y-4">
                    {advertisement.pricing.discounts.volume && advertisement.pricing.discounts.volume.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Mengenrabatt</h4>
                        <div className="space-y-1">
                          {advertisement.pricing.discounts.volume.map((v, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-zinc-600 dark:text-zinc-400">
                                Ab {v.threshold} {v.unit}
                              </span>
                              <span className="font-medium text-green-600">-{v.discountPercent}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {advertisement.pricing.discounts.frequency && advertisement.pricing.discounts.frequency.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Frequenzrabatt</h4>
                        <div className="space-y-1">
                          {advertisement.pricing.discounts.frequency.map((f, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-zinc-600 dark:text-zinc-400">
                                Ab {f.bookingsPerYear} Buchungen/Jahr
                              </span>
                              <span className="font-medium text-green-600">-{f.discountPercent}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {advertisement.pricing.discounts.agency !== undefined && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Agenturprovision</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">Für Agenturen</span>
                          <span className="font-medium text-green-600">-{advertisement.pricing.discounts.agency}%</span>
                        </div>
                      </div>
                    )}

                    {advertisement.pricing.discounts.earlyBooking && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Frühbucherrabatt</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {advertisement.pricing.discounts.earlyBooking.daysInAdvance} Tage im Voraus
                          </span>
                          <span className="font-medium text-green-600">-{advertisement.pricing.discounts.earlyBooking.discountPercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Surcharges */}
              {advertisement.pricing.surcharges && advertisement.pricing.surcharges.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Aufpreise</h3>
                  <div className="space-y-2">
                    {advertisement.pricing.surcharges.map((surcharge, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {surcharge.type}
                          {surcharge.description && (
                            <span className="block text-xs text-zinc-500">{surcharge.description}</span>
                          )}
                        </span>
                        <span className="font-medium text-red-600">
                          {typeof surcharge.amount === 'number' 
                            ? `+${surcharge.amount}%`
                            : `+${formatCurrency(surcharge.amount.amount, surcharge.amount.currency)}`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regional Pricing */}
              {advertisement.regionalPricing && advertisement.regionalPricing.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Regionale Preise</h3>
                  <div className="space-y-3">
                    {advertisement.regionalPricing.map((regional, index) => (
                      <div key={index} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-700">
                        <div className="flex items-start justify-between">
                          <div>
                            {regional.edition && <p className="font-medium text-sm">{regional.edition}</p>}
                            {regional.countries && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {regional.countries.join(', ')}
                              </p>
                            )}
                          </div>
                          {regional.pricing.listPrice && (
                            <span className="font-medium text-sm">
                              {formatCurrency(regional.pricing.listPrice.amount, regional.pricing.listPrice.currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Verfügbarkeit Tab */}
          <TabPanel>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* General Availability */}
              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Verfügbarkeitszeitraum</h3>
                <div className="space-y-3">
                  {advertisement.availability.startDate && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Verfügbar ab</dt>
                      <dd className="mt-1 text-sm">
                        {format(advertisement.availability.startDate, 'dd. MMMM yyyy')}
                      </dd>
                    </div>
                  )}
                  {advertisement.availability.endDate && (
                    <div>
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Verfügbar bis</dt>
                      <dd className="mt-1 text-sm">
                        {format(advertisement.availability.endDate, 'dd. MMMM yyyy')}
                      </dd>
                    </div>
                  )}
                  {advertisement.availability.bookingDeadline && (
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-700">
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Buchungsvorlauf</dt>
                      <dd className="mt-1">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 text-zinc-400 mr-2" />
                          <span className="text-sm">
                            {advertisement.availability.bookingDeadline.days} {advertisement.availability.bookingDeadline.type === 'business_days' ? 'Werktage' : 'Tage'}
                            {advertisement.availability.bookingDeadline.time && ` bis ${advertisement.availability.bookingDeadline.time} Uhr`}
                          </span>
                        </div>
                        {advertisement.availability.bookingDeadline.notes && (
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {advertisement.availability.bookingDeadline.notes}
                          </p>
                        )}
                      </dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Blackout Dates */}
              {advertisement.availability.blackoutDates && advertisement.availability.blackoutDates.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Sperrzeiten</h3>
                  <div className="space-y-3">
                    {advertisement.availability.blackoutDates.map((blackout, index) => (
                      <div key={index} className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                        <div className="flex items-start">
                          <XCircleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              {format(blackout.start, 'dd.MM.yyyy')} - {format(blackout.end, 'dd.MM.yyyy')}
                            </p>
                            {blackout.reason && (
                              <p className="text-xs text-red-600 dark:text-red-300 mt-1">{blackout.reason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory */}
              {advertisement.availability.inventory && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Inventar</h3>
                  <div className="space-y-4">
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Verfügbarkeit</span>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {advertisement.availability.inventory.booked || 0} / {advertisement.availability.inventory.total} {advertisement.availability.inventory.unit}
                        </span>
                      </div>
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-zinc-200 dark:bg-zinc-700">
                        <div
                          style={{
                            width: `${advertisement.availability.inventory.total ? ((advertisement.availability.inventory.booked || 0) / advertisement.availability.inventory.total) * 100 : 0}%`
                          }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seasonal Availability */}
              {advertisement.availability.seasonalAvailability && advertisement.availability.seasonalAvailability.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Saisonale Verfügbarkeit</h3>
                  <div className="space-y-3">
                    {advertisement.availability.seasonalAvailability.map((seasonal, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {seasonal.season === 'spring' ? 'Frühling' :
                             seasonal.season === 'summer' ? 'Sommer' :
                             seasonal.season === 'fall' ? 'Herbst' :
                             seasonal.season === 'winter' ? 'Winter' :
                             seasonal.season === 'christmas' ? 'Weihnachten' : 'Benutzerdefiniert'}
                          </p>
                          {seasonal.customPeriod && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {seasonal.customPeriod.start} - {seasonal.customPeriod.end}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {seasonal.availabilityPercent !== undefined && (
                            <p className="text-sm">
                              <span className={seasonal.availabilityPercent < 50 ? 'text-red-600' : 'text-green-600'}>
                                {seasonal.availabilityPercent}% verfügbar
                              </span>
                            </p>
                          )}
                          {seasonal.pricingAdjustment && (
                            <p className="text-xs">
                              <span className={seasonal.pricingAdjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                                {seasonal.pricingAdjustment > 0 ? '+' : ''}{seasonal.pricingAdjustment}% Preis
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Performance Tab */}
          <TabPanel>
            <div className="grid gap-6">
              {advertisement.performance ? (
                <>
                  {/* Overview Stats */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Buchungen gesamt</dt>
                      <dd className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">
                        {advertisement.performance.totalBookings || 0}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Umsatz gesamt</dt>
                      <dd className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">
                        {advertisement.performance.totalRevenue 
                          ? formatCurrency(advertisement.performance.totalRevenue.amount, advertisement.performance.totalRevenue.currency)
                          : '—'
                        }
                      </dd>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Ø CTR</dt>
                      <dd className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">
                        {advertisement.performance.avgCtr ? `${advertisement.performance.avgCtr.toFixed(2)}%` : '—'}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Letzte Buchung</dt>
                      <dd className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
                        {advertisement.performance.lastBookingDate 
                          ? format(advertisement.performance.lastBookingDate, 'dd.MM.yyyy')
                          : '—'
                        }
                      </dd>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {advertisement.performance.clientSatisfaction !== undefined && (
                      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Kundenzufriedenheit</h3>
                        <div className="flex items-center">
                          <div className="text-4xl font-semibold text-zinc-900 dark:text-white">
                            {advertisement.performance.clientSatisfaction.toFixed(1)}
                          </div>
                          <div className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">/ 5.0</div>
                        </div>
                      </div>
                    )}

                    {advertisement.performance.rebookingRate !== undefined && (
                      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Wiederbuchungsrate</h3>
                        <div className="text-4xl font-semibold text-zinc-900 dark:text-white">
                          {advertisement.performance.rebookingRate}%
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-zinc-400" />
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    Noch keine Performance-Daten verfügbar
                  </p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Materialien Tab */}
          <TabPanel>
            <div className="grid gap-6">
              {/* Spec Sheet */}
              {advertisement.materials.specSheet && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Spezifikationsblatt</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Zuletzt aktualisiert: {format(advertisement.materials.specSheet.lastUpdated, 'dd.MM.yyyy')}
                      </p>
                      {advertisement.materials.specSheet.version && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          Version: {advertisement.materials.specSheet.version}
                        </p>
                      )}
                    </div>
                        <a href={advertisement.materials.specSheet.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                          <Button plain className="text-sm">
                            <ArrowDownTrayIcon />
                            Download
                          </Button>
                        </a>
                  </div>
                </div>
              )}

              {/* Templates */}
              {advertisement.materials.templates && advertisement.materials.templates.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Vorlagen</h3>
                  <div className="space-y-3">
                    {advertisement.materials.templates.map((template, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-zinc-100 p-4 dark:border-zinc-700">
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          {template.software && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{template.software}</p>
                          )}
                        </div>
                        <a href={template.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                          <Button plain className="text-sm">
                            <ArrowDownTrayIcon />
                            Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Examples */}
              {advertisement.materials.examples && advertisement.materials.examples.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Beispiele</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {advertisement.materials.examples.map((example, index) => (
                      <div key={index} className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-700">
                        <h4 className="font-medium text-sm mb-1">{example.name}</h4>
                        {example.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{example.description}</p>
                        )}
                        {example.client && (
                          <p className="text-xs text-zinc-400 mb-3">Kunde: {example.client}</p>
                        )}
                        <a href={example.fileUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                          <Button plain className="text-sm w-full">
                            Ansehen
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Materials */}
              {!advertisement.materials.specSheet && 
               (!advertisement.materials.templates || advertisement.materials.templates.length === 0) &&
               (!advertisement.materials.examples || advertisement.materials.examples.length === 0) && (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <DocumentIcon className="mx-auto h-12 w-12 text-zinc-400" />
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    Keine Materialien verfügbar
                  </p>
                </div>
              )}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {/* Modals */}
      {showEditModal && (
        <AdvertisementModal
          isOpen={showEditModal}
          advertisement={advertisement}
          publications={publications}
          onClose={() => {
            setShowEditModal(false);
          }}
          onSuccess={async () => {
            setShowEditModal(false);
            await loadData();
          }}
        />
      )}

      {showPriceCalculator && (
        <PriceCalculator
          advertisement={advertisement}
          onClose={() => setShowPriceCalculator(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>Werbemittel löschen</DialogTitle>
              <DialogBody className="mt-2">
                <Text>
                  Möchten Sie das Werbemittel &ldquo;{advertisement.name}&rdquo; wirklich löschen? 
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button plain onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button color="zinc" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
// src/app/dashboard/contacts/lists/[listId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { listsService } from "@/lib/firebase/lists-service";
import { tagsService } from "@/lib/firebase/crm-service";
import { publicationService } from "@/lib/firebase/library-service";
import { DistributionList } from "@/types/lists";
import { useList, useUpdateList } from '@/lib/hooks/useListsData';
import { useQueryClient } from '@tanstack/react-query';
import { Contact, ContactEnhanced, companyTypeLabels, Tag } from "@/types/crm-enhanced";
import { Publication, PUBLICATION_TYPE_LABELS, PUBLICATION_FREQUENCY_LABELS } from "@/types/library";
import { COUNTRY_NAMES, LANGUAGE_NAMES } from "@/types/international";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ListModal from "../ListModal";
import { Alert } from '../components/shared/Alert';
import { toastService } from '@/lib/utils/toast';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  HashtagIcon,
  ListBulletIcon,
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  TagIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  FunnelIcon,
  PencilIcon,
  ArrowPathIcon,
  NewspaperIcon,
  ChartBarIcon,
  LanguageIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

// InfoCard Component
function InfoCard({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <h3 className="text-base font-semibold text-zinc-900">
          {title}
        </h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// Helper functions
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return 'N/A';
  return timestamp.toDate().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to format contact names
function formatContactName(contact: Contact | ContactEnhanced): string {
  if ('name' in contact && typeof contact.name === 'object') {
    // Enhanced Contact
    const enhanced = contact as ContactEnhanced;
    const parts = [];
    if (enhanced.name.title) parts.push(enhanced.name.title);
    if (enhanced.name.firstName) parts.push(enhanced.name.firstName);
    if (enhanced.name.lastName) parts.push(enhanced.name.lastName);
    return parts.join(' ') || enhanced.displayName;
  } else {
    // Legacy Contact
    const legacy = contact as Contact;
    return `${legacy.firstName} ${legacy.lastName}`;
  }
}

export default function ListDetailPage() {
  const t = useTranslations('lists');
  const tCategories = useTranslations('lists.categories');
  const tToast = useTranslations('toasts');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const listId = params.listId as string;
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: list, isLoading, error: queryError } = useList(listId);
  const { mutate: updateListMutation } = useUpdateList();

  const [contactsInList, setContactsInList] = useState<(Contact | ContactEnhanced)[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Extended company type labels
  const extendedCompanyTypeLabels = {
    ...companyTypeLabels,
    'publisher': t('detail.companyTypes.publisher'),
    'media_house': t('detail.companyTypes.media_house'),
    'agency': t('detail.companyTypes.agency')
  };

  // Lade zusätzliche Daten (Tags, Publications, Contacts)
  useEffect(() => {
    const loadAdditionalData = async () => {
      if (!user || !list) return;

      try {
        const [userTags, allPublications] = await Promise.all([
          tagsService.getAll(currentOrganization?.id || user.uid),
          publicationService.getAll(currentOrganization?.id || user.uid)
        ]);

        setTags(userTags);
        setPublications(allPublications);

        const contactsData = await listsService.getContacts(list);
        setContactsInList(contactsData);
      } catch (err: any) {
        console.error('Fehler beim Laden zusätzlicher Daten:', err);
      }
    };

    loadAdditionalData();
  }, [user, list, currentOrganization]);

  const handleRefreshList = async () => {
    if (!list || list.type !== 'dynamic') return;

    setRefreshing(true);
    try {
      await listsService.refreshDynamicList(list.id!);
      toastService.success(tToast('listRefreshed'));
      // Invalidiere die Listen-Queries um aktualisierte Daten zu laden
      queryClient.invalidateQueries({ queryKey: ['list', list.id] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    } catch (error) {
      toastService.error(tToast('listRefreshError'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async (listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => {
    if (!list?.id || !currentOrganization?.id) return;

    updateListMutation(
      {
        listId: list.id,
        updates: listData,
        organizationId: currentOrganization.id,
      },
      {
        onSuccess: () => {
          toastService.success(tToast('listUpdated'));
          setShowEditModal(false);
        },
        onError: () => {
          toastService.error(tToast('listUpdateError'));
        },
      }
    );
  };

  const getCategoryLabel = (category?: string) => {
    if (!category || category === 'custom') return tCategories('custom');
    return tCategories(category as any);
  };

  const renderFilterValue = (key: string, value: any): string => {
    // Tag-IDs
    if (key === 'tagIds' && Array.isArray(value)) {
      const tagNames = value.map(tagId => {
        const tag = tags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });
      if (tagNames.length === 0) return t('detail.table.noData');
      if (tagNames.length <= 3) return tagNames.join(', ');
      return `${tagNames.slice(0, 3).join(', ')} ${t('detail.filterValues.moreItems', { count: tagNames.length - 3 })}`;
    }

    // Firmentypen
    if (key === 'companyTypes' && Array.isArray(value)) {
      const typeLabels = value.map(type => extendedCompanyTypeLabels[type as keyof typeof extendedCompanyTypeLabels] || type);
      if (typeLabels.length === 0) return t('detail.table.noData');
      if (typeLabels.length <= 3) return typeLabels.join(', ');
      return `${typeLabels.slice(0, 3).join(', ')} ${t('detail.filterValues.moreItems', { count: typeLabels.length - 3 })}`;
    }

    // Länder - mit lesbaren Namen
    if (key === 'countries' && Array.isArray(value)) {
      const countryNames = value.map(code => COUNTRY_NAMES[code] || code);
      if (countryNames.length === 0) return t('detail.table.noData');
      if (countryNames.length <= 3) return countryNames.join(', ');
      return `${countryNames.slice(0, 3).join(', ')} ${t('detail.filterValues.moreItems', { count: countryNames.length - 3 })}`;
    }

    // Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return t('detail.table.noData');
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 3).join(', ')} ${t('detail.filterValues.moreItems', { count: value.length - 3 })}`;
    }

    if (typeof value === 'boolean') return value ? t('detail.filterValues.yes') : t('detail.filterValues.no');
    return String(value || t('detail.table.noData'));
  };

  const renderPublicationFilterValue = (key: string, value: any): string => {
    // Publikations-IDs
    if (key === 'publicationIds' && Array.isArray(value)) {
      const pubNames = value.map(pubId => {
        const pub = publications.find(p => p.id === pubId);
        return pub ? pub.title : pubId;
      });
      if (pubNames.length === 0) return t('detail.table.noData');
      if (pubNames.length <= 2) return pubNames.join(', ');
      return `${pubNames.slice(0, 2).join(', ')} ${t('detail.filterValues.moreItems', { count: pubNames.length - 2 })}`;
    }

    // Publikationstypen
    if (key === 'types' && Array.isArray(value)) {
      const typeLabels = value.map(type => PUBLICATION_TYPE_LABELS[type as keyof typeof PUBLICATION_TYPE_LABELS] || type);
      return typeLabels.join(', ');
    }

    // Frequenzen
    if (key === 'frequencies' && Array.isArray(value)) {
      const freqLabels = value.map(freq => PUBLICATION_FREQUENCY_LABELS[freq as keyof typeof PUBLICATION_FREQUENCY_LABELS] || freq);
      return freqLabels.join(', ');
    }

    // Geografische Reichweite
    if (key === 'geographicScopes' && Array.isArray(value)) {
      return value.map(scope => t(`detail.geographicScopes.${scope}` as any)).join(', ');
    }

    // Sprachen
    if (key === 'languages' && Array.isArray(value)) {
      const langNames = value.map(code => LANGUAGE_NAMES[code] || code);
      return langNames.join(', ');
    }

    // Verlage
    if (key === 'publisherIds' && Array.isArray(value)) {
      return t('detail.filterValues.publisherCount', { count: value.length });
    }

    // Metriken
    if (key === 'minPrintCirculation' || key === 'maxPrintCirculation' ||
        key === 'minOnlineVisitors' || key === 'maxOnlineVisitors') {
      return value.toLocaleString('de-DE');
    }

    // Status
    if (key === 'status' && Array.isArray(value)) {
      return value.map(s => t(`detail.publicationStatus.${s}` as any)).join(', ');
    }

    // Boolean
    if (key === 'onlyVerified' && typeof value === 'boolean') {
      return value ? t('detail.filterValues.verified') : t('detail.filterValues.all');
    }

    // Arrays allgemein
    if (Array.isArray(value)) {
      if (value.length === 0) return t('detail.table.noData');
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 3).join(', ')} ${t('detail.filterValues.moreItems', { count: value.length - 3 })}`;
    }

    return String(value || t('detail.table.noData'));
  };

  const getFilterIcon = (key: string) => {
    const iconMap: { [key: string]: any } = {
      companyTypes: BuildingOfficeIcon,
      industries: BuildingOfficeIcon,
      countries: GlobeAltIcon,
      tagIds: TagIcon,
      positions: UsersIcon,
      hasEmail: EnvelopeIcon,
      hasPhone: PhoneIcon,
      beats: NewspaperIcon,
      publications: DocumentTextIcon
    };
    return iconMap[key] || FunnelIcon;
  };

  const getPublicationFilterIcon = (key: string) => {
    const iconMap: { [key: string]: any } = {
      publicationIds: DocumentTextIcon,
      types: NewspaperIcon,
      formats: DocumentTextIcon,
      frequencies: ClockIcon,
      countries: GlobeAltIcon,
      geographicScopes: GlobeAltIcon,
      languages: LanguageIcon,
      focusAreas: TagIcon,
      targetIndustries: BuildingOfficeIcon,
      minPrintCirculation: ChartBarIcon,
      maxPrintCirculation: ChartBarIcon,
      minOnlineVisitors: ChartBarIcon,
      maxOnlineVisitors: ChartBarIcon,
      onlyVerified: CheckCircleIcon,
      status: ListBulletIcon,
      publisherIds: BuildingOfficeIcon
    };
    return iconMap[key] || DocumentTextIcon;
  };

  const getFilterLabel = (key: string) => {
    return t(`detail.filters.${key}` as any);
  };

  const getPublicationFilterLabel = (key: string) => {
    return t(`detail.publicationFilters.${key}` as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">{t('detail.loading')}</Text>
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="p-8">
        <Alert type="error" title={t('detail.error')} message={t('detail.error')} />
        <div className="mt-4">
          <Button
            onClick={() => router.push('/dashboard/contacts/lists')}
            className="border border-zinc-300 bg-white text-zinc-700
                       hover:bg-zinc-50 font-medium whitespace-nowrap
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                       h-10 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('detail.buttons.backToOverview')}
          </Button>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-8 text-center">
        <Text>{t('detail.notFound')}</Text>
        <div className="mt-4">
          <Button
            onClick={() => router.push('/dashboard/contacts/lists')}
            className="border border-zinc-300 bg-white text-zinc-700
                       hover:bg-zinc-50 font-medium whitespace-nowrap
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                       h-10 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('detail.buttons.backToOverview')}
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
              <Heading>{list.name}</Heading>
              <Text className="mt-1">{list.description || t('detail.noDescription')}</Text>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard/contacts/lists')}
                className="border border-zinc-300 bg-white text-zinc-700
                           hover:bg-zinc-50 font-medium whitespace-nowrap
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                           h-10 px-6 rounded-lg transition-colors inline-flex items-center"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                {t('detail.buttons.back')}
              </Button>
              {list.type === 'dynamic' && (
                <Button
                  onClick={handleRefreshList}
                  disabled={refreshing}
                  className="border border-zinc-300 bg-white text-zinc-700
                             hover:bg-zinc-50 font-medium whitespace-nowrap
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                             h-10 px-6 rounded-lg transition-colors inline-flex items-center"
                >
                  <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {t('detail.buttons.refresh')}
                </Button>
              )}
              <Button
                onClick={() => setShowEditModal(true)}
                className="bg-primary hover:bg-primary-hover text-white font-medium whitespace-nowrap
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                           h-10 px-6 rounded-lg transition-colors inline-flex items-center"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {t('detail.buttons.edit')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kontakte Tabelle */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-zinc-900">
                    {t('detail.sections.contacts')}
                  </h3>
                  <Badge color="blue">{list.contactCount || 0}</Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="pl-6">
                  <TableHead>
                    <TableRow>
                      <TableHeader className="pl-6">{t('detail.table.name')}</TableHeader>
                      <TableHeader>{t('detail.table.position')}</TableHeader>
                      <TableHeader>{t('detail.table.company')}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contactsInList.length > 0 ? (
                      contactsInList.map(contact => (
                        <TableRow key={contact.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium pl-6">
                            <Link
                              href={`/dashboard/contacts/crm/contacts/${contact.id}`}
                              className="text-primary hover:text-primary-hover hover:underline"
                            >
                              {formatContactName(contact)}
                            </Link>
                            {'mediaProfile' in contact && (contact as any).mediaProfile?.isJournalist && (
                              <Badge color="purple" className="ml-2 text-xs">
                                {t('detail.badges.journalist')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{contact.position || <Text>{t('detail.table.noData')}</Text>}</TableCell>
                          <TableCell>
                            {contact.companyId && contact.companyName ? (
                              <Link
                                href={`/dashboard/contacts/crm/companies/${contact.companyId}`}
                                className="text-primary hover:text-primary-hover hover:underline"
                              >
                                {contact.companyName}
                              </Link>
                            ) : (
                              <Text>{t('detail.table.noData')}</Text>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <UsersIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                          <Text>{t('detail.empty.noContacts')}</Text>
                          {list.type === 'dynamic' && (
                            <Text className="mt-2 text-sm">
                              {t('detail.empty.dynamicNoMatch')}
                            </Text>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Sidebar mit Details */}
          <div className="space-y-6">
            {/* Listen-Details */}
            <InfoCard title={t('detail.sections.details')} icon={ListBulletIcon}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <ListBulletIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">{t('detail.details.type')}:</span>
                    <span className="ml-2">
                      {list.type === 'dynamic' ? t('detail.listTypes.dynamic') : t('detail.listTypes.static')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <HashtagIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">{t('detail.details.category')}:</span>
                    <span className="ml-2">{getCategoryLabel(list.category)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">{t('detail.details.created')}:</span>
                    <span className="ml-2">{formatDate(list.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">{t('detail.details.updated')}:</span>
                    <span className="ml-2">{formatDate(list.lastUpdated || list.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </InfoCard>

            {/* Aktive Filter */}
            {list.type === 'dynamic' && list.filters && (
              <>
                {/* Basis-Filter */}
                {Object.entries(list.filters).some(([key, value]) =>
                  key !== 'publications' && value && (!Array.isArray(value) || value.length > 0)
                ) && (
                  <InfoCard title={t('detail.sections.baseFilters')} icon={FunnelIcon}>
                    <ul className="space-y-3">
                      {Object.entries(list.filters).map(([key, value]) => {
                        if (key === 'publications') return null;
                        if (!value || (Array.isArray(value) && value.length === 0)) return null;

                        const Icon = getFilterIcon(key);
                        return (
                          <li key={key} className="flex items-start gap-3">
                            <Icon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-700">
                                {getFilterLabel(key)}
                              </div>
                              <div className="text-sm text-gray-600 mt-0.5">
                                {renderFilterValue(key, value)}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </InfoCard>
                )}

                {/* Publikations-Filter */}
                {list.filters.publications && Object.entries(list.filters.publications).some(([_, value]) =>
                  value && (!Array.isArray(value) || value.length > 0)
                ) && (
                  <InfoCard title={t('detail.sections.publicationFilters')} icon={NewspaperIcon}>
                    <ul className="space-y-3">
                      {Object.entries(list.filters.publications).map(([key, value]) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) return null;

                        const Icon = getPublicationFilterIcon(key);
                        return (
                          <li key={key} className="flex items-start gap-3">
                            <Icon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-700">
                                {getPublicationFilterLabel(key)}
                              </div>
                              <div className="text-sm text-gray-600 mt-0.5">
                                {renderPublicationFilterValue(key, value)}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </InfoCard>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && user && (
        <ListModal
          list={list}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
          userId={user.uid}
          organizationId={currentOrganization?.id || user.uid}
        />
      )}
    </>
  );
}

// src/components/projects/distribution/ListDetailsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { DistributionList, LIST_CATEGORY_LABELS } from '@/types/lists';
import { ProjectDistributionList, projectListsService } from '@/lib/firebase/project-lists-service';
import { listsService } from '@/lib/firebase/lists-service';
import { tagsService } from '@/lib/firebase/crm-service';
import { publicationService } from '@/lib/firebase/library-service';
import { ContactEnhanced, Tag, companyTypeLabels } from '@/types/crm-enhanced';
import { Publication, PUBLICATION_TYPE_LABELS, PUBLICATION_FREQUENCY_LABELS } from '@/types/library';
import { COUNTRY_NAMES, LANGUAGE_NAMES } from '@/types/international';
import {
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  NewspaperIcon,
  FunnelIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  TagIcon,
  GlobeAltIcon,
  ClockIcon,
  ChartBarIcon,
  LanguageIcon,
  CheckCircleIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

interface Props {
  open: boolean;
  onClose: () => void;
  list: DistributionList | ProjectDistributionList | null;
  type: 'master' | 'project';
}

// Extended company type labels
const extendedCompanyTypeLabels: Record<string, string> = {
  ...companyTypeLabels,
  'customer': 'Kunde',
  'partner': 'Partner',
  'supplier': 'Lieferant',
  'competitor': 'Wettbewerber',
  'media': 'Medien',
  'investor': 'Investor',
  'other': 'Andere'
};

function formatContactName(contact: any): string {
  if ('name' in contact && typeof contact.name === 'object') {
    const parts = [];
    if (contact.name.title) parts.push(contact.name.title);
    if (contact.name.firstName) parts.push(contact.name.firstName);
    if (contact.name.lastName) parts.push(contact.name.lastName);
    return parts.join(' ') || 'Unbekannt';
  }
  if (contact.firstName || contact.lastName) {
    return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unbekannt';
  }
  return contact.name || 'Unbekannt';
}

export default function ListDetailsModal({ open, onClose, list, type }: Props) {
  const [contacts, setContacts] = useState<ContactEnhanced[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !list) {
      setContacts([]);
      setTags([]);
      setPublications([]);
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const isProjectList = (l: any): l is ProjectDistributionList => 'projectId' in l;
        const isMasterList = (l: any): l is DistributionList => 'name' in l && !('projectId' in l);

        const organizationId = isProjectList(list)
          ? list.organizationId
          : isMasterList(list)
            ? (list.organizationId || list.userId)
            : undefined;

        // Load contacts
        if (type === 'project' && list.id) {
          const projectContacts = await projectListsService.getProjectListContacts(list.id);
          setContacts(projectContacts);
        } else if (type === 'master') {
          const masterContacts = await listsService.getContacts(list as DistributionList);
          setContacts(masterContacts);
        }

        // Load tags and publications if organizationId available
        if (organizationId) {
          const [loadedTags, loadedPublications] = await Promise.all([
            tagsService.getAll(organizationId),
            publicationService.searchPublications(organizationId, {})
          ]);
          setTags(loadedTags);
          setPublications(loadedPublications);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [open, list, type]);

  if (!list) return null;

  const isProjectList = (l: any): l is ProjectDistributionList => 'projectId' in l;
  const projectList = isProjectList(list) ? list : null;

  const isMasterList = (l: any): l is DistributionList => 'name' in l && !('projectId' in l);
  const masterList = isMasterList(list) ? list : null;

  const listName = masterList?.name || projectList?.name || 'Unbekannt';
  const listDescription = masterList?.description || projectList?.description;
  const listCategory = masterList?.category || projectList?.category || 'custom';
  const listType = masterList?.type || projectList?.listType || 'static';
  const contactCount = contacts.length;
  const filters = masterList?.filters || projectList?.filters;

  const hasActiveFilters = filters && Object.keys(filters).length > 0 &&
    Object.entries(filters).some(([key, value]) => {
      if (key === 'publications') {
        return value && typeof value === 'object' && Object.values(value).some(v => v && (!Array.isArray(v) || v.length > 0));
      }
      return value && (!Array.isArray(value) || value.length > 0);
    });

  // Helper functions
  const renderFilterValue = (key: string, value: any): string => {
    if (key === 'tagIds' && Array.isArray(value)) {
      const tagNames = value.map(tagId => {
        const tag = tags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });
      if (tagNames.length === 0) return '—';
      if (tagNames.length <= 3) return tagNames.join(', ');
      return `${tagNames.slice(0, 3).join(', ')} (+${tagNames.length - 3} weitere)`;
    }

    if (key === 'companyTypes' && Array.isArray(value)) {
      const typeLabels = value.map(type => extendedCompanyTypeLabels[type] || type);
      if (typeLabels.length === 0) return '—';
      if (typeLabels.length <= 3) return typeLabels.join(', ');
      return `${typeLabels.slice(0, 3).join(', ')} (+${typeLabels.length - 3} weitere)`;
    }

    if (key === 'countries' && Array.isArray(value)) {
      const countryNames = value.map(code => COUNTRY_NAMES[code] || code);
      if (countryNames.length === 0) return '—';
      if (countryNames.length <= 3) return countryNames.join(', ');
      return `${countryNames.slice(0, 3).join(', ')} (+${countryNames.length - 3} weitere)`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 3).join(', ')} (+${value.length - 3} weitere)`;
    }

    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    return String(value || '—');
  };

  const renderPublicationFilterValue = (key: string, value: any): string => {
    if (key === 'publicationIds' && Array.isArray(value)) {
      const pubNames = value.map(pubId => {
        const pub = publications.find(p => p.id === pubId);
        return pub ? pub.title : pubId;
      });
      if (pubNames.length === 0) return '—';
      if (pubNames.length <= 2) return pubNames.join(', ');
      return `${pubNames.slice(0, 2).join(', ')} (+${pubNames.length - 2} weitere)`;
    }

    if (key === 'types' && Array.isArray(value)) {
      const typeLabels = value.map(type => PUBLICATION_TYPE_LABELS[type as keyof typeof PUBLICATION_TYPE_LABELS] || type);
      return typeLabels.join(', ');
    }

    if (key === 'frequencies' && Array.isArray(value)) {
      const freqLabels = value.map(freq => PUBLICATION_FREQUENCY_LABELS[freq as keyof typeof PUBLICATION_FREQUENCY_LABELS] || freq);
      return freqLabels.join(', ');
    }

    if (key === 'geographicScopes' && Array.isArray(value)) {
      const scopeLabels: Record<string, string> = {
        'local': 'Lokal',
        'regional': 'Regional',
        'national': 'National',
        'international': 'International',
      };
      return value.map(s => scopeLabels[s] || s).join(', ');
    }

    if (key === 'countries' && Array.isArray(value)) {
      const countryNames = value.map(code => COUNTRY_NAMES[code] || code);
      if (countryNames.length === 0) return '—';
      if (countryNames.length <= 3) return countryNames.join(', ');
      return `${countryNames.slice(0, 3).join(', ')} (+${countryNames.length - 3})`;
    }

    if (key === 'languages' && Array.isArray(value)) {
      const langNames = value.map(code => LANGUAGE_NAMES[code] || code);
      return langNames.join(', ');
    }

    if (key === 'minPrintCirculation' || key === 'maxPrintCirculation' ||
        key === 'minOnlineVisitors' || key === 'maxOnlineVisitors') {
      return value.toLocaleString('de-DE');
    }

    if (key === 'status' && Array.isArray(value)) {
      const statusLabels: Record<string, string> = {
        'active': 'Aktiv',
        'inactive': 'Inaktiv',
        'discontinued': 'Eingestellt'
      };
      return value.map(s => statusLabels[s] || s).join(', ');
    }

    if (key === 'onlyVerified' && typeof value === 'boolean') {
      return value ? 'Nur verifizierte' : 'Alle';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 3).join(', ')} (+${value.length - 3})`;
    }

    return String(value || '—');
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
    const labelMap: { [key: string]: string } = {
      companyTypes: 'Firmentypen',
      industries: 'Branchen',
      countries: 'Länder',
      tagIds: 'Tags',
      positions: 'Positionen',
      hasEmail: 'Mit E-Mail',
      hasPhone: 'Mit Telefon',
      beats: 'Ressorts',
      publications: 'Publikationen'
    };
    return labelMap[key] || key;
  };

  const getPublicationFilterLabel = (key: string) => {
    const labelMap: { [key: string]: string } = {
      publicationIds: 'Spezifische Publikationen',
      types: 'Publikationstypen',
      formats: 'Formate',
      frequencies: 'Erscheinungsweise',
      countries: 'Zielländer',
      geographicScopes: 'Reichweite',
      languages: 'Sprachen',
      focusAreas: 'Themenschwerpunkte',
      targetIndustries: 'Zielbranchen',
      minPrintCirculation: 'Min. Druckauflage',
      maxPrintCirculation: 'Max. Druckauflage',
      minOnlineVisitors: 'Min. Online-Besucher',
      maxOnlineVisitors: 'Max. Online-Besucher',
      onlyVerified: 'Verifizierung',
      status: 'Status',
      publisherIds: 'Verlage'
    };
    return labelMap[key] || key;
  };

  return (
    <Dialog open={open} onClose={onClose} size="4xl">
      <DialogTitle>{listName}</DialogTitle>
      <DialogBody className="px-6 py-6">
        {/* Listen-Informationen Header */}
        <div className="flex items-center gap-6 mb-6 pb-4 border-b border-gray-200">
          <div>
            <Text className="text-xs text-gray-500 mb-1">Kategorie</Text>
            <Badge color="zinc" className="text-xs">
              {LIST_CATEGORY_LABELS[listCategory as keyof typeof LIST_CATEGORY_LABELS] || listCategory}
            </Badge>
          </div>
          <div>
            <Text className="text-xs text-gray-500 mb-1">Typ</Text>
            <Badge
              color={listType === 'dynamic' ? 'green' : 'blue'}
              className="text-xs"
            >
              {listType === 'dynamic' ? 'Dynamisch' : 'Statisch'}
            </Badge>
          </div>
          <div>
            <Text className="text-xs text-gray-500 mb-1">Kontakte</Text>
            <Badge color="blue" className="text-xs font-semibold">
              {contactCount.toLocaleString()}
            </Badge>
          </div>
          {listDescription && (
            <div className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Beschreibung</Text>
              <Text className="text-sm text-gray-700">{listDescription}</Text>
            </div>
          )}
        </div>

        {/* Filter-Anzeige */}
        {hasActiveFilters && listType === 'dynamic' && filters && (
          <div className="mb-6 space-y-4">
            {/* Basis-Filter */}
            {Object.entries(filters).some(([key, value]) =>
              key !== 'publications' && value && (!Array.isArray(value) || value.length > 0)
            ) && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <FunnelIcon className="h-4 w-4 text-gray-500" />
                  <Text className="text-sm font-medium text-gray-900">Basis-Filter</Text>
                </div>
                <ul className="space-y-2">
                  {Object.entries(filters).map(([key, value]) => {
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
              </div>
            )}

            {/* Publikations-Filter */}
            {filters.publications && Object.entries(filters.publications).some(([_, value]) =>
              value && (!Array.isArray(value) || value.length > 0)
            ) && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <NewspaperIcon className="h-4 w-4 text-gray-500" />
                  <Text className="text-sm font-medium text-gray-900">Publikations-Filter</Text>
                </div>
                <ul className="space-y-2">
                  {Object.entries(filters.publications).map(([key, value]) => {
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
              </div>
            )}
          </div>
        )}

        {/* Kontakte-Vorschau */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Kontakte</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Lade...</span>
              </div>
            ) : (
              <Badge color="blue" className="whitespace-nowrap">
                {contactCount.toLocaleString()} Kontakte
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <Text className="mt-2 text-gray-500">Lade Kontakte...</Text>
            </div>
          ) : contacts.length > 0 ? (
            <div className="space-y-1 max-h-96 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between py-1.5 px-2 bg-white rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-800">
                      {formatContactName(contact)}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {contact.position && `${contact.position} • `}
                      {contact.companyName || 'Keine Firma'}
                    </div>
                    {'mediaProfile' in contact && (contact as any).mediaProfile?.isJournalist && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        <NewspaperIcon className="h-3 w-3 inline mr-1" />
                        Journalist
                        {(contact as any).mediaProfile.beats?.length ? ` • ${(contact as any).mediaProfile.beats.join(', ')}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {(('emails' in contact && contact.emails && contact.emails.length > 0) ||
                      ('email' in contact && contact.email)) && (
                      <EnvelopeIcon className="h-3 w-3 text-primary" title="Hat E-Mail" />
                    )}
                    {(('phones' in contact && contact.phones && contact.phones.length > 0) ||
                      ('phone' in contact && contact.phone)) && (
                      <PhoneIcon className="h-3 w-3 text-green-600" title="Hat Telefon" />
                    )}
                    {'communicationPreferences' in contact && (contact as any).communicationPreferences?.preferredLanguage && (
                      <span
                        className="text-xs text-gray-500 font-medium"
                        title={`Sprache: ${LANGUAGE_NAMES[(contact as any).communicationPreferences.preferredLanguage] || (contact as any).communicationPreferences.preferredLanguage}`}
                      >
                        {(contact as any).communicationPreferences.preferredLanguage.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
              <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <Text className="text-sm text-gray-600">
                {listType === 'dynamic'
                  ? "Keine Kontakte entsprechen den Filtern."
                  : "Noch keine Kontakte ausgewählt."
                }
              </Text>
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
}

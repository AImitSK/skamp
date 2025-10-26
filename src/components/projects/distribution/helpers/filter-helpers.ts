// src/components/projects/distribution/helpers/filter-helpers.ts

/**
 * Filter-Helper-Funktionen für ListDetailsModal
 *
 * Extrahiert aus ListDetailsModal.tsx zur besseren Wartbarkeit
 * und Wiederverwendbarkeit der Filter-Rendering-Logik
 */

import { Tag, companyTypeLabels } from '@/types/crm-enhanced';
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

/**
 * Extended company type labels inkl. zusätzlicher Typen
 */
export const extendedCompanyTypeLabels: Record<string, string> = {
  ...companyTypeLabels,
  'customer': 'Kunde',
  'partner': 'Partner',
  'supplier': 'Lieferant',
  'competitor': 'Wettbewerber',
  'media': 'Medien',
  'investor': 'Investor',
  'other': 'Andere'
};

/**
 * Rendert einen Filter-Wert als menschenlesbaren String
 */
export function renderFilterValue(key: string, value: any, tags: Tag[]): string {
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
}

/**
 * Rendert einen Publikations-Filter-Wert als menschenlesbaren String
 */
export function renderPublicationFilterValue(key: string, value: any, publications: Publication[]): string {
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
}

/**
 * Gibt das passende Icon für einen Filter-Key zurück
 */
export function getFilterIcon(key: string) {
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
}

/**
 * Gibt das passende Icon für einen Publikations-Filter-Key zurück
 */
export function getPublicationFilterIcon(key: string) {
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
}

/**
 * Gibt das deutsche Label für einen Filter-Key zurück
 */
export function getFilterLabel(key: string): string {
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
}

/**
 * Gibt das deutsche Label für einen Publikations-Filter-Key zurück
 */
export function getPublicationFilterLabel(key: string): string {
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
}

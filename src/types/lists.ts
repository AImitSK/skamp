// src/types/lists.ts

import { Timestamp } from 'firebase/firestore';
import { 
  PublicationType, 
  PublicationFormat, 
  PublicationFrequency 
} from '@/types/library';
import { CountryCode, LanguageCode } from '@/types/international';

// ========================================
// Verteilerlisten Types
// ========================================

export type ListType = 'dynamic' | 'static';
export type ListCategory = 'press' | 'customers' | 'partners' | 'leads' | 'custom';

// Haupt-Interface für Verteilerlisten
export interface DistributionList {
  id?: string;
  name: string;
  description?: string;
  type: ListType;
  category?: ListCategory;
  color?: string; // für UI
  
  // Für dynamische Listen
  filters?: ListFilters;
  
  // Für statische Listen
  contactIds?: string[];
  
  // Metadaten
  contactCount: number;
  userId: string; // Owner der Liste
  organizationId?: string; // Organisation der Liste (für Multi-Tenancy)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastUpdated?: Timestamp; // Wann wurden die Kontakte zuletzt aktualisiert
}

// Filter-Definitionen für dynamische Listen
export interface ListFilters {
  // Bestehende Filter
  companyTypes?: string[];
  industries?: string[];
  countries?: CountryCode[];
  tagIds?: string[];
  positions?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  languages?: LanguageCode[]; // Bevorzugte Sprachen der Kontakte
  createdAfter?: Date;
  createdBefore?: Date;

  // Medien-spezifische Filter (für Journalisten)
  beats?: string[]; // Ressorts/Themengebiete der Journalisten
  
  // NEU: Erweiterte Publikations-Filter
  publications?: {
    // Direkte Publikations-Auswahl
    publicationIds?: string[]; // Spezifische Publikationen
    
    // Publikations-Eigenschaften
    types?: PublicationType[]; // magazine, newspaper, website, etc.
    formats?: PublicationFormat[]; // print, online, both, broadcast
    frequencies?: PublicationFrequency[]; // daily, weekly, monthly, etc.
    
    // Geografisch
    countries?: CountryCode[]; // Zielländer der Publikation
    geographicScopes?: ('local' | 'regional' | 'national' | 'international' | 'global')[];
    languages?: LanguageCode[]; // Publikationssprachen
    
    // Thematisch
    focusAreas?: string[]; // Themenschwerpunkte
    targetIndustries?: string[]; // Zielbranchen (für Fachpublikationen)
    
    // Metriken
    minPrintCirculation?: number; // Mindest-Druckauflage
    maxPrintCirculation?: number; // Maximal-Druckauflage
    minOnlineVisitors?: number; // Mindest-Unique Visitors/Monat
    maxOnlineVisitors?: number; // Maximal-Unique Visitors/Monat
    
    // Status & Qualität
    onlyVerified?: boolean; // Nur verifizierte Publikationen
    status?: ('active' | 'inactive' | 'discontinued')[];
    
    // Verlage
    publisherIds?: string[]; // Bestimmte Verlage/Medienhäuser
  };
}

// Helper Type für UI-Komponenten
export interface PublicationFilterOptions {
  publications: {
    id: string;
    title: string;
    type: PublicationType;
    format: PublicationFormat;
    publisherName?: string;
    circulation?: number;
    onlineVisitors?: number;
    focusAreas: string[];
  }[];
  
  // Aggregierte Optionen für Dropdown-Menüs
  availableTypes: PublicationType[];
  availableFormats: PublicationFormat[];
  availableFocusAreas: string[];
  availableLanguages: LanguageCode[];
  availableCountries: CountryCode[];
  availablePublishers: { id: string; name: string; }[];
}

// Für die Filter-UI Komponente
export interface PublicationFilterConfig {
  // Basis-Filter
  showDirectSelection?: boolean; // Dropdown für spezifische Publikationen
  showTypeFilter?: boolean;
  showFormatFilter?: boolean;
  
  // Erweiterte Filter
  showGeographicFilters?: boolean;
  showThematicFilters?: boolean;
  showMetricFilters?: boolean;
  showQualityFilters?: boolean;
  
  // Vordefinierte Filter-Sets
  presets?: {
    name: string;
    description: string;
    filters: ListFilters['publications'];
  }[];
}

// Beispiel-Presets für häufige Anwendungsfälle
export const PUBLICATION_FILTER_PRESETS = [
  {
    name: 'Große Printmedien',
    description: 'Tageszeitungen und Magazine mit hoher Auflage',
    filters: {
      types: ['newspaper', 'magazine'] as PublicationType[],
      formats: ['print', 'both'] as PublicationFormat[],
      minPrintCirculation: 50000
    }
  },
  {
    name: 'Fachpresse Technik',
    description: 'Technische Fachzeitschriften und -portale',
    filters: {
      types: ['trade_journal', 'website'] as PublicationType[],
      targetIndustries: ['Technologie', 'IT', 'Industrie'],
      onlyVerified: true
    }
  },
  {
    name: 'Regionale Medien',
    description: 'Lokale und regionale Publikationen',
    filters: {
      geographicScopes: ['local', 'regional'] as ('local' | 'regional')[],
      types: ['newspaper', 'website'] as PublicationType[]
    }
  },
  {
    name: 'Online-Reichweite',
    description: 'Reichweitenstarke Online-Medien',
    filters: {
      formats: ['online', 'both'] as PublicationFormat[],
      minOnlineVisitors: 100000
    }
  }
];

// ========================================
// Tracking & Analytics
// ========================================

// Verwendungs-Tracking für Listen
export interface ListUsage {
  id?: string;
  listId: string;
  campaignId?: string;
  campaignName?: string;
  contactCount: number; // Anzahl der Kontakte zum Zeitpunkt der Verwendung
  usedAt: Timestamp;
  usedBy: string; // userId
  type: 'email' | 'export' | 'integration' | 'other';
  details?: {
    emailProvider?: string;
    exportFormat?: string;
    integrationName?: string;
  };
}

// Aggregierte Metriken für Listen
export interface ListMetrics {
  id?: string;
  listId: string;
  
  // Verwendungs-Statistiken
  totalCampaigns: number;
  last30DaysCampaigns: number;
  totalEmailsSent?: number;
  totalExports?: number;
  
  // Kontakt-Statistiken
  activeContacts: number; // Kontakte mit kürzlicher Aktivität
  bounceRate?: number;
  unsubscribeRate?: number;
  
  // Performance
  avgOpenRate?: number;
  avgClickRate?: number;
  avgResponseTime?: number; // Bei Presse-Listen
  
  // Zeitstempel
  lastUsed?: Timestamp;
  lastCalculated: Timestamp;
  
  // Für Mandantenfähigkeit
  userId: string;
}

// ========================================
// UI Helper Types
// ========================================

// Für Listen-Übersicht
export interface ListSummary {
  list: DistributionList;
  metrics?: ListMetrics;
  recentUsage?: ListUsage[];
  tags?: string[]; // Abgeleitete Tags aus Filtern
}

// Für Listen-Export
export interface ListExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'vcf';
  fields: string[]; // Welche Kontakt-Felder exportieren
  includeCompanyData?: boolean;
  includeMetrics?: boolean;
  dateFormat?: string;
  encoding?: 'utf-8' | 'iso-8859-1';
}

// Für Listen-Import (statische Listen)
export interface ListImportOptions {
  updateExisting?: boolean; // Bestehende Kontakte aktualisieren
  skipInvalid?: boolean; // Ungültige Einträge überspringen
  mappings?: Record<string, string>; // CSV-Spalte zu Kontakt-Feld
}

// ========================================
// Constants
// ========================================

export const LIST_CATEGORY_LABELS: Record<ListCategory, string> = {
  'press': 'Presse',
  'customers': 'Kunden',
  'partners': 'Partner',
  'leads': 'Leads',
  'custom': 'Benutzerdefiniert'
};

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  'dynamic': 'Dynamisch',
  'static': 'Statisch'
};

// Standard-Farben für Listen-Kategorien
export const LIST_CATEGORY_COLORS: Record<ListCategory, string> = {
  'press': 'purple',
  'customers': 'blue',
  'partners': 'green',
  'leads': 'amber',
  'custom': 'zinc' // 'zinc' wird anstelle von 'gray' verwendet, um mit badge.tsx kompatibel zu sein
};

// Maximale Anzahl von Kontakten pro Liste (für Performance)
export const MAX_CONTACTS_PER_LIST = 50000;

// Standard-Export-Felder
export const DEFAULT_EXPORT_FIELDS = [
  'name',
  'email',
  'phone',
  'position',
  'companyName',
  'tags'
];

// ========================================
// Validation
// ========================================

export const LIST_VALIDATION = {
  name: { required: true, minLength: 3, maxLength: 100 },
  description: { maxLength: 500 },
  filters: {
    minFilters: 1, // Mindestens ein Filter für dynamische Listen
    maxTagIds: 20,
    maxCompanyTypes: 10
  }
};

// ========================================
// Type Guards
// ========================================

export function isDynamicList(list: DistributionList): list is DistributionList & { filters: ListFilters } {
  return list.type === 'dynamic' && !!list.filters;
}

export function isStaticList(list: DistributionList): list is DistributionList & { contactIds: string[] } {
  return list.type === 'static' && !!list.contactIds;
}

export function hasPublicationFilters(filters: ListFilters): boolean {
  return !!filters.publications && Object.keys(filters.publications).length > 0;
}

// ========================================
// Filter Helpers
// ========================================

export function getActiveFilterCount(filters: ListFilters): number {
  let count = 0;
  
  // Basis-Filter
  if (filters.companyTypes?.length) count++;
  if (filters.industries?.length) count++;
  if (filters.countries?.length) count++;
  if (filters.tagIds?.length) count++;
  if (filters.positions?.length) count++;
  if (filters.hasEmail !== undefined) count++;
  if (filters.hasPhone !== undefined) count++;
  if (filters.languages?.length) count++;
  if (filters.createdAfter) count++;
  if (filters.createdBefore) count++;
  if (filters.beats?.length) count++;
  
  // Publikations-Filter
  if (filters.publications) {
    const pubFilters = filters.publications;
    if (pubFilters.publicationIds?.length) count++;
    if (pubFilters.types?.length) count++;
    if (pubFilters.formats?.length) count++;
    if (pubFilters.frequencies?.length) count++;
    if (pubFilters.countries?.length) count++;
    if (pubFilters.geographicScopes?.length) count++;
    if (pubFilters.languages?.length) count++;
    if (pubFilters.focusAreas?.length) count++;
    if (pubFilters.targetIndustries?.length) count++;
    if (pubFilters.minPrintCirculation) count++;
    if (pubFilters.maxPrintCirculation) count++;
    if (pubFilters.minOnlineVisitors) count++;
    if (pubFilters.maxOnlineVisitors) count++;
    if (pubFilters.onlyVerified) count++;
    if (pubFilters.status?.length) count++;
    if (pubFilters.publisherIds?.length) count++;
  }
  
  return count;
}

export function getFilterSummary(filters: ListFilters): string[] {
  const summary: string[] = [];
  
  if (filters.companyTypes?.length) {
    summary.push(`${filters.companyTypes.length} Firmentypen`);
  }
  
  if (filters.publications?.types?.length) {
    summary.push(`${filters.publications.types.length} Publikationstypen`);
  }
  
  if (filters.publications?.minPrintCirculation) {
    summary.push(`Auflage ≥ ${filters.publications.minPrintCirculation.toLocaleString()}`);
  }
  
  // ... weitere Zusammenfassungen
  
  return summary;
}


// ========================================
// Listenvorlagen für den Setup-Wizard (KORRIGIERT)
// ========================================

export interface ListTemplateFilters {
  tagIds?: string[];
}

export interface ListTemplate {
  name: string;
  description: string;
  // HIER IST DIE KORREKTUR:
  // Wir verwenden den exakten Typ 'ListCategory', den auch DistributionList nutzt.
  category: ListCategory; 
  color: string;
  filters: ListTemplateFilters;
}

/**
 * Eine Liste von vordefinierten, intelligenten Listen-Vorlagen für das Setup.
 */
export const LIST_TEMPLATES: ListTemplate[] = [
  {
    name: 'Tech-Presse',
    description: 'Alle Journalisten, die über Technologie, Startups oder KI schreiben.',
    category: 'press', // 'press' ist ein gültiger Wert in ListCategory
    color: 'blue',
    filters: {
      tagIds: ['Journalist', 'Tech'],
    },
  },
  {
    name: 'Wirtschaftsjournalisten',
    description: 'Journalisten mit Fokus auf Wirtschaft, Finanzen und Business-Themen.',
    category: 'press', // 'press' ist ein gültiger Wert
    color: 'emerald',
    filters: {
      tagIds: ['Journalist', 'Wirtschaft'],
    },
  },
  {
    name: 'Alle Pressekontakte',
    description: 'Eine umfassende Liste aller Kontakte mit dem Tag "Presse".',
    category: 'press', // 'press' ist ein gültiger Wert
    color: 'zinc',
    filters: {
      tagIds: ['Presse'],
    },
  },
];
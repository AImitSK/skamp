// src/types/lists.ts - Erweitert um Medienschwerpunkte-Filter
import { Timestamp } from 'firebase/firestore';
// KORRIGIERT: CompanyType wird jetzt aus der crm-Typdatei importiert
import { CompanyType, TagColor } from './crm';

// Erweiterte Company-Types für Medien
export type ExtendedCompanyType = CompanyType | 'publisher' | 'media_house' | 'agency';

// Filter-Kriterien für dynamische Listen
export interface ListFilters {
  // Firmen-Filter
  companyTypes?: ExtendedCompanyType[];
  industries?: string[];
  countries?: string[];
  
  // Kontakt-Filter
  tagIds?: string[];
  positions?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  
  // Spezielle Filter für Presse
  mediaOutlets?: string[]; // Bestimmte Verlage
  beats?: string[]; // Ressorts (Tech, Business, etc.)
  
  // NEU: Medienschwerpunkte-Filter
  mediaFocus?: string[]; // Aus Company.mediaFocus extrahierte Schwerpunkte
  
  // Datum-Filter
  createdAfter?: Date;
  createdBefore?: Date;
  lastContactAfter?: Date;
}

// Hauptdatenstruktur für Verteilerlisten
export interface DistributionList {
  id?: string;
  name: string;
  description?: string;
  
  // Liste-Typ
  type: 'dynamic' | 'static';
  
  // Dynamische Listen: Filter-basiert
  filters?: ListFilters;
  
  // Statische Listen: Manuell ausgewählte Kontakte
  contactIds?: string[];
  
  // Metadata
  contactCount: number;
  lastUpdated?: Timestamp;
  
  // Kategorisierung
  category?: 'press' | 'customers' | 'partners' | 'leads' | 'custom';
  color?: TagColor;
  
  // Benutzer-Zuordnung
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Verwendungsprotokoll für Listen
export interface ListUsage {
  id?: string;
  listId: string;
  toolType: 'pr_campaign' | 'newsletter' | 'email_marketing' | 'social_media' | 'event';
  campaignId?: string;
  campaignName: string;
  recipientCount: number;
  usedAt: Timestamp;
  userId: string;
}

// Performance-Metriken für Listen
export interface ListMetrics {
  id?: string;
  listId: string;
  
  // Kampagnen-Metriken
  totalCampaigns: number;
  last30DaysCampaigns: number;
  
  // E-Mail-Metriken (wenn verfügbar)
  averageOpenRate?: number;
  averageClickRate?: number;
  averageResponseRate?: number;
  
  // Kontakt-Aktivität
  activeContacts: number; // Kontakte mit Aktivität in letzten 90 Tagen
  
  // Letzte Aktualisierung
  lastCalculated: Timestamp;
  userId: string;
}

// Vorgefertigte Presse-Tags
export const PRESS_TAGS = [
  { name: 'Presse', color: 'blue' as TagColor },
  { name: 'Journalist', color: 'green' as TagColor },
  { name: 'Redakteur', color: 'purple' as TagColor },
  { name: 'Chefredakteur', color: 'red' as TagColor },
  { name: 'Freier Journalist', color: 'orange' as TagColor },
  { name: 'Blogger', color: 'pink' as TagColor },
  { name: 'Influencer', color: 'yellow' as TagColor },
  { name: 'Moderator', color: 'cyan' as TagColor },
  { name: 'Pressesprecher', color: 'indigo' as TagColor }
] as const;

// Ressort/Beat-Kategorien
export const PRESS_BEATS = [
  'Technologie',
  'Wirtschaft',
  'Politik',
  'Wissenschaft',
  'Gesundheit',
  'Umwelt',
  'Sport',
  'Kultur',
  'Lifestyle',
  'Automobile',
  'Immobilien',
  'Bildung',
  'Startups',
  'Finanzen',
  'Marketing',
  'Digitalisierung'
] as const;

// NEU: Häufige Medienschwerpunkte (als Beispiele/Vorschläge)
export const COMMON_MEDIA_FOCUS = [
  // Technologie & Digital
  'Künstliche Intelligenz',
  'Cybersecurity',
  'Cloud Computing',
  'Blockchain',
  'IoT',
  'Robotik',
  'Software',
  'Hardware',
  
  // Wirtschaft & Business
  'Startup',
  'Mittelstand',
  'Börse',
  'Fintech',
  'E-Commerce',
  'Handel',
  'Logistik',
  'Immobilien',
  
  // Branchen
  'Automotive',
  'Gesundheitswesen',
  'Bildung',
  'Energie',
  'Nachhaltigkeit',
  'Tourismus',
  'Mode',
  'Food & Beverage',
  
  // Gesellschaft
  'Politik',
  'Kultur',
  'Sport',
  'Lifestyle',
  'Familie',
  'Reise',
  'Entertainment',
  'Gaming'
] as const;

// Template für Listen-Erstellung
export interface ListTemplate {
  name: string;
  description: string;
  category: DistributionList['category'];
  color: TagColor;
  filters: ListFilters;
}

// Vordefinierte Listen-Templates
export const LIST_TEMPLATES: ListTemplate[] = [
  {
    name: 'Tech-Presse',
    description: 'Alle Journalisten mit Fokus auf Technologie',
    category: 'press',
    color: 'blue',
    filters: {
      tagIds: ['presse'], // Wird zur Laufzeit aufgelöst
      beats: ['Technologie', 'Digitalisierung', 'Startups'],
      mediaFocus: ['Künstliche Intelligenz', 'Software', 'Cloud Computing'] // NEU
    }
  },
  {
    name: 'Wirtschaftsjournalisten',
    description: 'Redakteure aus dem Wirtschaftsressort',
    category: 'press',
    color: 'green',
    filters: {
      tagIds: ['presse'],
      beats: ['Wirtschaft', 'Finanzen'],
      mediaFocus: ['Börse', 'Mittelstand', 'Fintech'] // NEU
    }
  },
  {
    name: 'Nachhaltigkeits-Medien',
    description: 'Verlage und Journalisten mit Fokus auf Nachhaltigkeit', // NEU
    category: 'press',
    color: 'emerald',
    filters: {
      companyTypes: ['publisher', 'media_house'],
      mediaFocus: ['Nachhaltigkeit', 'Energie', 'Umwelt']
    }
  },
  {
    name: 'Aktive Kunden',
    description: 'Kunden mit Aktivität in den letzten 90 Tagen',
    category: 'customers',
    color: 'purple',
    filters: {
      companyTypes: ['customer'],
      lastContactAfter: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    }
  },
  {
    name: 'Newsletter-Abonnenten',
    description: 'Alle Kontakte mit E-Mail für Newsletter',
    category: 'custom',
    color: 'orange',
    filters: {
      hasEmail: true,
      tagIds: ['newsletter'] // Wird zur Laufzeit aufgelöst
    }
  }
];

// Props für UI-Komponenten
export interface ListBuilderProps {
  initialList?: Partial<DistributionList>;
  onSave: (list: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export interface ListPreviewProps {
  filters?: ListFilters;
  contactIds?: string[];
  maxPreview?: number;
}

export interface ListCardProps {
  list: DistributionList;
  metrics?: ListMetrics;
  onEdit: (list: DistributionList) => void;
  onDelete: (listId: string) => void;
  onUse: (list: DistributionList) => void;
}

// Hilfsfunktionen für Type Guards
export const isStaticList = (list: DistributionList): list is DistributionList & { contactIds: string[] } => {
  return list.type === 'static' && !!list.contactIds;
};

export const isDynamicList = (list: DistributionList): list is DistributionList & { filters: ListFilters } => {
  return list.type === 'dynamic' && !!list.filters;
};
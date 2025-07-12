// src/types/crm.ts
import { Timestamp } from 'firebase/firestore';

// Basis-Typen
export type CompanyType = 'customer' | 'supplier' | 'partner' | 'publisher' | 'media_house' | 'agency' | 'other';
export type CommunicationType = 'email' | 'phone' | 'meeting' | 'note' | 'task' | 'social';
export type CommunicationDirection = 'inbound' | 'outbound' | 'internal';
export type CommunicationStatus = 'completed' | 'pending' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TagColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'yellow' | 'zinc' | 'indigo' | 'cyan' | 'emerald';
export type SocialPlatform = 'linkedin' | 'twitter' | 'xing' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'other';

// Social Platform Labels
export const socialPlatformLabels: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  xing: 'XING',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  other: 'Andere'
};

// Company Type Labels
export const companyTypeLabels: Record<CompanyType, string> = {
  customer: 'Kunde',
  supplier: 'Lieferant',
  partner: 'Partner',
  publisher: 'Verlag',
  media_house: 'Medienhaus',
  agency: 'Agentur',
  other: 'Sonstiges'
};

// Media Types für Verlage/Medienhäuser
export const MEDIA_TYPES = [
  { value: 'newspaper', label: 'Tageszeitung' },
  { value: 'magazine', label: 'Magazin' },
  { value: 'online', label: 'Online-Medium' },
  { value: 'blog', label: 'Blog' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'tv', label: 'TV-Sender' },
  { value: 'radio', label: 'Radio' },
  { value: 'news_agency', label: 'Nachrichtenagentur' },
  { value: 'trade_journal', label: 'Fachzeitschrift' },
  { value: 'mixed', label: 'Gemischt' },
  { value: 'other', label: 'Sonstiges' }
] as const;

// NEU EINGEFÜGT: Standard-Presse-Tags
export const STANDARD_PRESS_TAGS: { name: string, color: TagColor }[] = [
    { name: 'National', color: 'blue' },
    { name: 'Regional', color: 'green' },
    { name: 'Local', color: 'yellow' },
    { name: 'Trade', color: 'indigo' },
    { name: 'Blog', color: 'purple' },
    { name: 'Podcast', color: 'pink' },
    { name: 'TV', color: 'red' },
    { name: 'Radio', color: 'orange' },
];

// Standard Beats/Ressorts für Journalisten
export const STANDARD_BEATS = [
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

// NEU: Publication Interface
export interface Publication {
  id: string;
  name: string;
  type: 'newspaper' | 'magazine' | 'online' | 'blog' | 'podcast' | 'tv' | 'radio' | 'newsletter' | 'trade_journal';
  format: 'print' | 'online' | 'both';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';
  focusAreas: string[]; // Themenschwerpunkte dieser Publikation
  circulation?: number; // Auflage (Print)
  reach?: number; // Reichweite (Online)
}

// Company Interface
export interface Company {
  id?: string;
  name: string;
  type: CompanyType;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    zip?: string;
    country?: string;
  };
  
  // Media Info für detaillierte Medieninformationen
  mediaInfo?: {
    mediaType?: string; // newspaper, magazine, online, etc.
    circulation?: number; // Gesamtauflage
    reach?: number; // Gesamtreichweite
    publicationType?: 'print' | 'online' | 'both';
    publicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    targetAudience?: string;
    focusAreas?: string[]; // Allgemeine Schwerpunkte
    
    // NEU: Array von Publikationen
    publications?: Publication[];
  };
  
  description?: string;
  employees?: number;
  revenue?: number;
  notes?: string;
  logoUrl?: string;
  tagIds?: string[];
  socialMedia?: Array<{
    platform: SocialPlatform;
    url: string;
  }>;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Contact Interface
export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  companyId?: string;
  companyName?: string; // Denormalisiert für Performance
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Soziale Medien - GEÄNDERT: Gleiche Struktur wie Company
  socialMedia?: Array<{
    platform: SocialPlatform;
    url: string;
  }>;
  
  // Kommunikationspräferenzen
  communicationPreferences?: {
    preferredChannel?: 'email' | 'phone' | 'meeting' | 'social';
    bestTimeToContact?: string;
    doNotContact?: boolean;
    language?: string;
  };
  
  // Medien-spezifische Informationen (reduziert)
  mediaInfo?: {
    // NEU: Publikations-Zuordnung
    publications?: string[]; // Array von Publikationsnamen
  };
  
  birthday?: Date;
  notes?: string;
  photoUrl?: string;
  tagIds?: string[];
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  
  // Berechnete Felder
  lastContactDate?: Timestamp;
  totalInteractions?: number;
}

// Tag Interface
export interface Tag {
  id?: string;
  name: string;
  color: TagColor;
  description?: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  
  // Verwendungszähler
  contactCount?: number;
  companyCount?: number;
}

// Communication/Activity Interface
export interface Communication {
  id?: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  subject?: string;
  content?: string;
  
  // Verknüpfungen
  contactId?: string;
  contactName?: string; // Denormalisiert
  companyId?: string;
  companyName?: string; // Denormalisiert
  
  // Zeitstempel
  date: Timestamp;
  duration?: number; // in Minuten
  
  // Zusätzliche Metadaten
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  
  // E-Mail spezifisch
  emailMetadata?: {
    messageId?: string;
    threadId?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
  };
  
  // Meeting spezifisch
  meetingMetadata?: {
    location?: string;
    attendees?: string[];
    meetingUrl?: string;
    agenda?: string;
    minutes?: string;
  };
  
  // Task spezifisch
  taskMetadata?: {
    dueDate?: Timestamp;
    priority?: TaskPriority;
    assignedTo?: string;
    completedAt?: Timestamp;
  };
  
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Dashboard Statistiken
export interface DashboardStats {
  totalCompanies: number;
  totalContacts: number;
  totalActivities: number;
  recentActivities: Communication[];
  upcomingTasks: Communication[];
  activityByType: {
    type: CommunicationType;
    count: number;
  }[];
  contactsByCompanyType: {
    type: CompanyType;
    count: number;
  }[];
  monthlyActivityTrend: {
    month: string;
    count: number;
  }[];
}

// Filter-Optionen für Listen
export interface FilterOptions {
  companies?: string[];
  tags?: string[];
  communicationTypes?: CommunicationType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

// Sortier-Optionen
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
  total?: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  pagination?: PaginationOptions;
}

// Batch Operation Types
export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: 'companies' | 'contacts' | 'tags' | 'communications';
  data: any;
  id?: string;
}

// Import/Export Types
export interface ImportMapping {
  sourceField: string;
  targetField: string;
  transformation?: 'lowercase' | 'uppercase' | 'trim' | 'date' | 'number';
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: {
    row: number;
    field: string;
    error: string;
  }[];
}

// Notification Types
export interface Notification {
  id?: string;
  type: 'task_due' | 'meeting_reminder' | 'follow_up' | 'birthday' | 'system';
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: 'contact' | 'company' | 'communication';
  read: boolean;
  userId: string;
  createdAt?: Timestamp;
}

// User Preferences
export interface UserPreferences {
  id?: string;
  userId: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  dateFormat?: string;
  
  // Benachrichtigungen
  notifications?: {
    email?: boolean;
    push?: boolean;
    taskReminders?: boolean;
    meetingReminders?: boolean;
    dailyDigest?: boolean;
  };
  
  // Dashboard
  dashboardLayout?: {
    widgets: string[];
    customWidgets?: any[];
  };
  
  // Listen-Ansichten
  defaultViews?: {
    companies?: 'grid' | 'list';
    contacts?: 'grid' | 'list';
    communications?: 'timeline' | 'list';
  };
  
  updatedAt?: Timestamp;
}

// Aktivitäts-Log
export interface ActivityLog {
  id?: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'export';
  entityType: 'company' | 'contact' | 'tag' | 'communication' | 'list';
  entityId?: string;
  entityName?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: any;
  createdAt?: Timestamp;
}

// Helper Types
export type WithId<T> = T & { id: string };
export type PartialWithId<T> = Partial<T> & { id: string };

// Form Types
export interface CompanyFormData extends Omit<Company, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {}
export interface ContactFormData extends Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {}
export interface TagFormData extends Omit<Tag, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {}
export interface CommunicationFormData extends Omit<Communication, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {}

// Validation Rules
export const VALIDATION_RULES = {
  company: {
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    website: { pattern: /^https?:\/\/.+\..+/ },
    phone: { pattern: /^\+?[\d\s\-\(\)]+$/ }
  },
  contact: {
    firstName: { required: true, minLength: 2, maxLength: 50 },
    lastName: { required: true, minLength: 2, maxLength: 50 },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { pattern: /^\+?[\d\s\-\(\)]+$/ }
  },
  tag: {
    name: { required: true, minLength: 2, maxLength: 30 }
  }
} as const;

// Constants
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MAX_TAGS_PER_ENTITY = 20;
export const MAX_ATTACHMENTS_PER_COMMUNICATION = 10;
export const MAX_IMPORT_ROWS = 5000;

// Labels für UI
export const communicationTypeLabels: Record<CommunicationType, string> = {
  email: 'E-Mail',
  phone: 'Anruf',
  meeting: 'Meeting',
  note: 'Notiz',
  task: 'Aufgabe',
  social: 'Social Media'
};

export const communicationDirectionLabels: Record<CommunicationDirection, string> = {
  inbound: 'Eingehend',
  outbound: 'Ausgehend',
  internal: 'Intern'
};

export const communicationStatusLabels: Record<CommunicationStatus, string> = {
  completed: 'Abgeschlossen',
  pending: 'Ausstehend',
  cancelled: 'Abgebrochen'
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend'
};

export const tagColorClasses: Record<TagColor, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  pink: 'bg-pink-100 text-pink-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  zinc: 'bg-zinc-100 text-zinc-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  emerald: 'bg-emerald-100 text-emerald-700'
};

// Enums für Type Safety
export enum EntityType {
  Company = 'company',
  Contact = 'contact',
  Tag = 'tag',
  Communication = 'communication',
  List = 'list'
}

export enum ActionType {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Import = 'import',
  Export = 'export'
}

export interface Boilerplate {
  id?: string;
  name: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  content: string;
  userId: string;
  
  // Kunden-Zuordnung
  clientId?: string;             // Optional: Spezifisch für einen Kunden
  clientName?: string;           // Für bessere Performance beim Anzeigen
  isGlobal: boolean;             // true = für alle Kunden, false = kundenspezifisch
  
  // Erweiterte Metadaten
  description?: string;          // Kurze Beschreibung wann/wo verwendet
  tags?: string[];               // Für bessere Suche
  isFavorite?: boolean;          // Favoriten-Markierung
  isArchived?: boolean;          // Soft-Delete
  usageCount?: number;           // Verwendungszähler
  lastUsedAt?: any;              // Firestore Timestamp
  
  // Position im Editor
  defaultPosition?: 'top' | 'bottom' | 'signature' | 'custom';  // Wo soll es eingefügt werden
  
  // Reihenfolge für Sortierung
  sortOrder?: number;            // Manuelle Sortierung innerhalb der Kategorie
  
  // Timestamps
  createdAt?: any;
  updatedAt?: any;
}

export interface BoilerplateCreateData {
  name: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  content: string;
  userId: string;
  clientId?: string;
  clientName?: string;
  isGlobal?: boolean;
  description?: string;
  tags?: string[];
  defaultPosition?: 'top' | 'bottom' | 'signature' | 'custom';
  sortOrder?: number;
}
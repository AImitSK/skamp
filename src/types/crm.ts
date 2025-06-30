// src/types/crm.ts
import { Timestamp } from 'firebase/firestore';

// Basis-Typen
export type CompanyType = 'customer' | 'supplier' | 'partner' | 'other';
export type CommunicationType = 'email' | 'phone' | 'meeting' | 'note' | 'task' | 'social';
export type CommunicationDirection = 'inbound' | 'outbound' | 'internal';
export type CommunicationStatus = 'completed' | 'pending' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TagColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'yellow' | 'zinc' | 'indigo' | 'cyan' | 'emerald';

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
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // NEU: Medienschwerpunkte für Verlage/Medienhäuser
  // Kommagetrennte Liste von Schwerpunkten
  // Beispiel: "Technologie, Künstliche Intelligenz, Startups, Digitalisierung"
  mediaFocus?: string;
  
  // Weitere Medien-spezifische Felder (optional für spätere Erweiterung)
  mediaDetails?: {
    circulation?: number; // Auflage
    reach?: number; // Reichweite
    publicationType?: 'print' | 'online' | 'both';
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    targetAudience?: string;
  };
  
  description?: string;
  employees?: number;
  revenue?: number;
  notes?: string;
  logoUrl?: string;
  tagIds?: string[];
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
  
  // Soziale Medien
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    xing?: string;
    facebook?: string;
    instagram?: string;
    other?: { platform: string; url: string }[];
  };
  
  // Kommunikationspräferenzen
  communicationPreferences?: {
    preferredChannel?: 'email' | 'phone' | 'meeting' | 'social';
    bestTimeToContact?: string;
    doNotContact?: boolean;
    language?: string;
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
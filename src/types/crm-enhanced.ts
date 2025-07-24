// src/types/crm-enhanced.ts
import { Timestamp } from 'firebase/firestore';
import { Company } from './crm';
import {
  BaseEntity,
  InternationalAddress,
  PhoneNumber,
  StructuredName,
  BusinessIdentifier,
  MoneyAmount,
  FinancialInfo,
  IndustryClassification,
  GdprConsent,
  CountryCode,
  LanguageCode
} from './international';

// ========================================
// Erweiterte Company mit Mandantenfähigkeit
// ========================================

export interface CompanyEnhanced extends BaseEntity {
  // Basis-Felder von Company übernehmen
  name: string; // Anzeigename (kann Handelsname sein)
  type: Company['type'];
  
  // Erweiterte Namensfelder
  officialName: string; // Offizieller Firmenname (Handelsregister)
  tradingName?: string; // Handelsname/DBA (Doing Business As)
  previousNames?: {
    name: string;
    validFrom: Date;
    validUntil: Date;
  }[];
  
  // Strukturierte internationale Adresse (ersetzt altes address)
  mainAddress?: InternationalAddress;
  
  // Weitere Adressen
  addresses?: {
    type: 'billing' | 'shipping' | 'branch' | 'other';
    address: InternationalAddress;
    isPrimary?: boolean;
  }[];
  
  // Rechtliche Identifikatoren (flexibles Array)
  identifiers?: BusinessIdentifier[];
  
  // Kontaktdaten
  phones?: PhoneNumber[];
  emails?: {
    type: 'general' | 'support' | 'sales' | 'billing' | 'press';
    email: string;
    isPrimary?: boolean;
  }[];
  website?: string;
  
  // Erweiterte Geschäftsinformationen
  legalForm?: string; // GmbH, AG, Ltd., Inc., etc.
  foundedDate?: Date;
  
  // Finanzinformationen
  financial?: FinancialInfo;
  
  // Konzernstruktur
  parentCompanyId?: string; // Muttergesellschaft
  ultimateParentId?: string; // Oberste Muttergesellschaft
  subsidiaryIds?: string[]; // Tochtergesellschaften
  
  // Branche & Klassifizierung
  industryClassification?: IndustryClassification;
  
  // Medien-spezifische Informationen (für Verlage, etc.)
  mediaInfo?: Company['mediaInfo'] & {
    // Erweiterte Metriken
    onlineMetrics?: {
      monthlyPageViews?: number;
      monthlyUniqueVisitors?: number;
      avgSessionDuration?: number;
      bounceRate?: number;
      socialFollowers?: {
        platform: string;
        count: number;
      }[];
    };
    
    // Zielgruppen-Details
    audienceDemographics?: {
      ageGroups?: { range: string; percentage: number }[];
      genderSplit?: { male: number; female: number; other: number };
      geographicDistribution?: { country: CountryCode; percentage: number }[];
      interests?: string[];
    };
  };
  
  // Social Media (erweitert)
  socialMedia?: Company['socialMedia'];
  
  // Beschreibungen & Notizen
  description?: string; // Öffentliche Beschreibung
  internalNotes?: string; // Interne Notizen (nicht für Kunden sichtbar)
  
  // Tags & Kategorisierung
  tagIds?: string[];
  customFields?: Record<string, any>; // Flexible Zusatzfelder
  
  // Status & Lifecycle
  status?: 'prospect' | 'active' | 'inactive' | 'archived';
  lifecycleStage?: 'lead' | 'opportunity' | 'customer' | 'partner' | 'former';
  
  // Beziehungs-Qualität
  relationshipScore?: number; // 0-100
  lastInteractionAt?: Timestamp;
  totalInteractions?: number;
  
  // Logo & Branding
  logoUrl?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
  };
  
  // Datenschutz
  dataProcessingAgreement?: {
    signed: boolean;
    signedAt?: Timestamp;
    signedBy?: string;
    documentUrl?: string;
  };
  
  // Import/Export Metadata
  externalIds?: {
    system: string;
    id: string;
  }[];
  importedAt?: Timestamp;
  importSource?: string;
}

// ========================================
// Erweiterte Contact mit DSGVO & Struktur
// ========================================

export interface ContactEnhanced extends BaseEntity {
  // Strukturierter Name
  name: StructuredName;

  internalNotes?: string; // Interne Notizen (nicht für Kunden sichtbar)
  
  // Formatierter Anzeigename (generiert oder manuell)
  displayName: string;
  
  // Geschäftliche Zuordnung
  companyId?: string;
  companyName?: string; // Denormalisiert für Performance
  
  // Position & Abteilung
  position?: string;
  department?: string;
  reportsTo?: string; // contactId des Vorgesetzten
  
  // Kontaktdaten
  emails?: {
    type: 'business' | 'private' | 'other';
    email: string;
    isPrimary?: boolean;
    isVerified?: boolean;
  }[];
  
  phones?: PhoneNumber[];
  
  // Adressen
  addresses?: {
    type: 'business' | 'private' | 'other';
    address: InternationalAddress;
  }[];
  
  // Social Media & Online-Präsenz
  socialProfiles?: {
    platform: string;
    url: string;
    handle?: string;
    verified?: boolean;
  }[];
  
  website?: string;
  blogUrl?: string;
  
  // DSGVO-konformes Einwilligungsmanagement
  gdprConsents?: GdprConsent[];
  
  // Kommunikations-Präferenzen
  communicationPreferences?: {
    preferredChannel?: 'email' | 'phone' | 'messaging' | 'mail';
    preferredLanguage?: LanguageCode;
    preferredTime?: {
      timezone: string;
      bestDays?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
      bestHours?: { from: string; to: string }; // "09:00" - "17:00"
    };
    doNotContact?: boolean;
    doNotContactUntil?: Date;
    doNotContactReason?: string;
  };
  
  // Erweiterte Publikations-Zuordnung (für Medien-Kontakte)
  mediaProfile?: {
    isJournalist: boolean;
    publicationIds: string[]; // Verknüpfung zu Publications
    beats?: string[]; // Ressorts/Themengebiete
    mediaTypes?: ('print' | 'online' | 'tv' | 'radio' | 'podcast')[];
    
    // Reichweite & Einfluss
    influence?: {
      score?: number; // 0-100
      reach?: number; // Follower/Leser
      engagement?: number; // Durchschnittliche Interaktionen
    };
    
    // Einreichungs-Präferenzen
    submissionGuidelines?: string;
    preferredTopics?: string[];
    excludedTopics?: string[];
    preferredFormats?: ('press_release' | 'exclusive' | 'interview' | 'guest_article')[];
    
    // Deadlines
    deadlines?: {
      daily?: string; // "15:00"
      weekly?: { day: string; time: string };
      monthly?: { day: number; time: string };
    };
  };
  
  // Persönliche Informationen
  personalInfo?: {
    birthday?: Date;
    birthplace?: string;
    nationality?: CountryCode;
    languages?: LanguageCode[];
    interests?: string[];
    notes?: string; // Persönliche Notizen (Hobbies, Familie, etc.)
  };
  
  // Professional Details
  professionalInfo?: {
    education?: {
      degree: string;
      institution: string;
      year?: number;
    }[];
    certifications?: string[];
    memberships?: string[]; // Verbände, Organisationen
    awards?: {
      name: string;
      year: number;
      issuer?: string;
    }[];
    biography?: string; // Öffentliche Bio
  };
  
  // Geschäftsbeziehung
  relationshipInfo?: {
    firstContactDate?: Date;
    firstContactSource?: string;
    referredBy?: string; // contactId
    accountManager?: string; // userId
    relationshipScore?: number; // 0-100
    lifetime?: {
      totalRevenue?: MoneyAmount;
      totalProjects?: number;
      totalInteractions?: number;
    };
  };
  
  // Tags & Kategorisierung
  tagIds?: string[];
  customFields?: Record<string, any>;
  
  // Status
  status?: 'active' | 'inactive' | 'unsubscribed' | 'bounced' | 'archived';
  
  // Foto
  photoUrl?: string;
  
  // Import/Export Metadata
  externalIds?: {
    system: string;
    id: string;
  }[];
  importedAt?: Timestamp;
  importSource?: string;
  
  // Aktivität & Engagement
  lastActivityAt?: Timestamp;
  activityScore?: number; // Basierend auf Interaktionen
  
  // Opt-Outs (zusätzlich zu GDPR)
  optOuts?: {
    channel: 'email' | 'sms' | 'phone' | 'mail';
    optedOutAt: Timestamp;
    reason?: string;
  }[];
}

// ========================================
// Helper Types für Enhanced Entities
// ========================================

// Für Formulare
export interface CompanyEnhancedFormData extends Omit<CompanyEnhanced, keyof BaseEntity> {}
export interface ContactEnhancedFormData extends Omit<ContactEnhanced, keyof BaseEntity> {}

// Für Listen-Ansichten (mit berechneten Feldern)
export interface CompanyEnhancedListView extends CompanyEnhanced {
  contactCount?: number;
  lastContactDate?: Timestamp;
  openOpportunities?: number;
  totalRevenue?: MoneyAmount;
}

export interface ContactEnhancedListView extends ContactEnhanced {
  companyDetails?: {
    id: string;
    name: string;
    type: string;
    logoUrl?: string;
  };
  recentActivities?: number;
  engagementScore?: number;
}

// Status & Lifecycle Optionen
export const COMPANY_STATUS_OPTIONS = [
  { value: 'prospect', label: 'Interessent' },
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Inaktiv' },
  { value: 'archived', label: 'Archiviert' }
] as const;

export const LIFECYCLE_STAGE_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'customer', label: 'Kunde' },
  { value: 'partner', label: 'Partner' },
  { value: 'former', label: 'Ehemalig' }
] as const;

export const CONTACT_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Inaktiv' },
  { value: 'unsubscribed', label: 'Abgemeldet' },
  { value: 'bounced', label: 'Unzustellbar' },
  { value: 'archived', label: 'Archiviert' }
] as const;

// Kommunikations-Kanäle
export const COMMUNICATION_CHANNELS = [
  { value: 'email', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
  { value: 'messaging', label: 'Messaging (WhatsApp, etc.)' },
  { value: 'mail', label: 'Post' }
] as const;

// Media Types für Journalisten
export const MEDIA_TYPES = [
  { value: 'print', label: 'Print' },
  { value: 'online', label: 'Online' },
  { value: 'tv', label: 'TV' },
  { value: 'radio', label: 'Radio' },
  { value: 'podcast', label: 'Podcast' }
] as const;

// Submission Formats
export const SUBMISSION_FORMATS = [
  { value: 'press_release', label: 'Pressemitteilung' },
  { value: 'exclusive', label: 'Exklusiv-Story' },
  { value: 'interview', label: 'Interview' },
  { value: 'guest_article', label: 'Gastbeitrag' }
] as const;


// Ergänzungen für src/types/crm-enhanced.ts
// Diese Definitionen sollten am Ende der Datei hinzugefügt werden

// ========================================
// Legacy Compatibility Exports
// ========================================

// Company Type Labels (für UI)
export const companyTypeLabels = {
  customer: 'Kunde',
  supplier: 'Lieferant',
  partner: 'Partner',
  competitor: 'Wettbewerber',
  investor: 'Investor',
  lead: 'Lead',
  publisher: 'Verlag',
  media_house: 'Medienhaus',
  agency: 'Agentur',
  other: 'Sonstige'
} as const;

// Re-export types that are used in multiple places
export type CompanyType = 'customer' | 'supplier' | 'partner' | 'competitor' | 'investor' | 'lead' | 'publisher' | 'media_house' | 'agency' | 'other';

// Tag Color Type (für Kompatibilität)
export type TagColor = 'zinc' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';

// Legacy Tag Type (für Rückwärtskompatibilität)
export interface Tag {
  id?: string;
  name: string;
  color: TagColor;
  description?: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
  contactCount?: number;
  companyCount?: number;
}

// Legacy Contact Type (für Rückwärtskompatibilität)
export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  tagIds?: string[];
  createdAt?: any;
  updatedAt?: any;
  userId: string;
}

// Füge diese Definitionen am Ende von src/types/crm-enhanced.ts hinzu

// ========================================
// Boilerplate Enhanced mit Mandantenfähigkeit
// ========================================

export interface BoilerplateEnhanced extends BaseEntity {
  // Basis-Felder
  name: string;
  content: string; // HTML Content
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  
  // Beschreibung & Meta
  description?: string;
  tags?: string[];
  
  // Scope & Ownership
  isGlobal: boolean; // Für alle Kunden verfügbar
  clientId?: string; // Wenn kundenspezifisch
  clientName?: string; // Denormalisiert für Performance
  
  // Position & Verwendung
  defaultPosition?: 'top' | 'bottom' | 'signature' | 'custom';
  usageCount?: number;
  lastUsedAt?: Timestamp;
  
  // Favoriten-Markierung
  isFavorite?: boolean;
  
  // Versionierung (für zukünftige Erweiterung)
  version?: number;
  previousVersionId?: string;
  
  // Sprache & Internationalisierung
  language?: LanguageCode;
  translations?: {
    [key in LanguageCode]?: {
      name: string;
      content: string;
      description?: string;
    };
  };
  
  // Erweiterte Metadaten
  metadata?: {
    requiredFields?: string[]; // z.B. ['{{company_name}}', '{{contact_email}}']
    compatibleWith?: string[]; // z.B. ['press_release', 'newsletter', 'email']
    restrictions?: {
      minLength?: number;
      maxLength?: number;
      allowedFormats?: string[];
    };
  };
  
  // SEO & Analytics
  seoKeywords?: string[];
  trackingEnabled?: boolean;
  
  // Workflow & Genehmigung
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp;
  
  // Aktiv/Inaktiv Status
  isActive?: boolean;
  deactivatedAt?: Timestamp;
  deactivatedReason?: string;
}

// Legacy Boilerplate Type für Backwards Compatibility
export interface Boilerplate {
  id?: string;
  name: string;
  content: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  description?: string;
  isGlobal: boolean;
  clientId?: string;
  clientName?: string;
  userId?: string; // Optional für Legacy Support
  organizationId?: string; // Multi-Tenancy
  createdBy?: string; // User ID des Erstellers
  updatedBy?: string; // User ID des letzten Bearbeiters
  tags?: string[];
  defaultPosition?: 'top' | 'bottom' | 'signature' | 'custom';
  sortOrder?: number;
  isArchived?: boolean;
  isFavorite?: boolean;
  usageCount?: number;
  lastUsedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

// Boilerplate Create Data - ohne IDs
export interface BoilerplateCreateData {
  name: string;
  content: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  description?: string;
  isGlobal?: boolean;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  defaultPosition?: 'top' | 'bottom' | 'signature' | 'custom';
  sortOrder?: number;
}

// Helper Types für Boilerplates
export interface BoilerplateFormData extends Omit<BoilerplateEnhanced, keyof BaseEntity> {}

export interface BoilerplateListView extends BoilerplateEnhanced {
  // Zusätzliche berechnete Felder für Listen
  usedInCampaigns?: number;
  lastUsedCampaignName?: string;
  sharedWithTeams?: number;
}

// Kategorie Labels
export const BOILERPLATE_CATEGORY_LABELS: Record<string, string> = {
  company: 'Unternehmensbeschreibung',
  contact: 'Kontaktinformationen',
  legal: 'Rechtliche Hinweise',
  product: 'Produktbeschreibung',
  custom: 'Sonstige'
};

// Position Labels
export const BOILERPLATE_POSITION_LABELS: Record<string, string> = {
  top: 'Oben',
  bottom: 'Unten',
  signature: 'Signatur',
  custom: 'Benutzerdefiniert'
};
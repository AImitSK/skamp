// src/types/library.ts
import { Timestamp } from 'firebase/firestore';
import {
  BaseEntity,
  CountryCode,
  LanguageCode,
  CurrencyCode,
  MoneyAmount
} from './international';

// ========================================
// Publikation als eigenständige Entität
// ========================================

export type PublicationType = 
  | 'magazine' 
  | 'newspaper' 
  | 'website' 
  | 'blog' 
  | 'podcast' 
  | 'tv' 
  | 'radio' 
  | 'newsletter' 
  | 'trade_journal'
  | 'press_agency'
  | 'social_media';

export type PublicationFormat = 'print' | 'online' | 'both' | 'broadcast';

export type PublicationFrequency = 
  | 'continuous' // 24/7 Online
  | 'multiple_daily'
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'bimonthly'
  | 'quarterly' 
  | 'biannual'
  | 'annual'
  | 'irregular';

export interface Publication extends BaseEntity {
  // Grunddaten
  title: string; // Haupttitel
  subtitle?: string; // Untertitel/Claim/Slogan
  
  // Verknüpfung zum Verlag
  publisherId: string; // CompanyId des Verlags/Medienhauses
  publisherName?: string; // Denormalisiert für Performance
  
  // Identifikatoren
  identifiers?: {
    type: 'ISSN' | 'ISBN' | 'DOI' | 'URL' | 'DOMAIN' | 'SOCIAL_HANDLE' | 'OTHER';
    value: string;
    description?: string;
  }[];
  
  // Klassifizierung
  type: PublicationType;
  format: PublicationFormat;
  
  // Metriken (strukturiert nach Kanal)
  metrics: {
    frequency: PublicationFrequency;
    
    // Allgemeine Zielgruppe
    targetAudience?: string;
    targetAgeGroup?: string; // "25-49", "50+"
    targetGender?: 'all' | 'predominantly_male' | 'predominantly_female';
    
    // Print-spezifisch
    print?: {
      circulation: number;
      circulationType: 'printed' | 'sold' | 'distributed' | 'subscribers' | 'audited_ivw';
      auditDate?: Date;
      auditedBy?: string; // IVW, ABC, etc.
      
      // Verkauf & Vertrieb
      pricePerIssue?: MoneyAmount;
      subscriptionPrice?: {
        monthly?: MoneyAmount;
        quarterly?: MoneyAmount;
        annual?: MoneyAmount;
      };
      
      // Vertriebsgebiete
      distributionAreas?: string[]; // Regionen/Städte
      
      // Format-Details
      pageCount?: number;
      paperFormat?: string; // "A4", "Tabloid", etc.
      printRun?: number; // Wenn anders als circulation
    };
    
    // Online-spezifisch
    online?: {
      // Traffic
      monthlyPageViews?: number;
      monthlyUniqueVisitors?: number;
      monthlyVisits?: number;
      
      // Engagement
      avgSessionDuration?: number; // Sekunden
      avgPageViewsPerVisit?: number;
      bounceRate?: number; // Prozent
      
      // Nutzer
      registeredUsers?: number;
      paidSubscribers?: number;
      newsletterSubscribers?: number;
      
      // Social Media
      socialFollowers?: {
        platform: string;
        count: number;
        engagementRate?: number;
        lastUpdated?: Date;
      }[];
      
      // SEO
      domainAuthority?: number;
      alexaRank?: number;
      
      // Technisch
      cmsSystem?: string;
      hasPaywall?: boolean;
      hasMobileApp?: boolean;
    };
    
    // Broadcast-spezifisch (TV/Radio)
    broadcast?: {
      viewership?: number; // Durchschnittliche Zuschauer/Hörer
      marketShare?: number; // Prozent
      broadcastArea?: string; // "National", "Regional Bayern", etc.
      
      // Sendezeiten für News/Magazine
      airTimes?: {
        day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'daily' | 'weekdays';
        time: string; // "20:15"
        duration?: number; // Minuten
      }[];
    };
  };
  
  // Internationale Ausrichtung
  languages: LanguageCode[]; // Hauptsprachen
  secondaryLanguages?: LanguageCode[]; // Weitere unterstützte Sprachen
  
  geographicScope: 'local' | 'regional' | 'national' | 'international' | 'global';
  geographicTargets: CountryCode[]; // Zielländer
  
  // Editionen/Ausgaben
  editions?: {
    name: string; // "Nordrhein-Westfalen", "Bayern", "International"
    type: 'regional' | 'language' | 'demographic' | 'thematic';
    countries?: CountryCode[];
    languages?: LanguageCode[];
    specificMetrics?: Partial<Publication['metrics']>;
    launchDate?: Date;
  }[];
  
  // Themenschwerpunkte & Ressorts
  focusAreas: string[]; // Hauptthemen
  sections?: {
    name: string; // "Politik", "Wirtschaft", "Sport"
    description?: string;
    editorContactId?: string;
    focusTopics?: string[];
  }[];
  
  targetIndustries?: string[]; // Für Fachpublikationen
  
  // Redaktionelle Kontakte
  editorialContacts?: {
    role: string; // "Chefredakteur", "Ressortleiter Politik"
    contactId?: string; // Verknüpfung zu Contact
    name?: string; // Falls kein Contact verknüpft
    email?: string;
    phone?: string;
    topics?: string[]; // Verantwortliche Themen
    languages?: LanguageCode[];
    notes?: string;
  }[];
  
  // Einreichungs-Informationen
  submissionGuidelines?: {
    generalInfo?: string;
    preferredFormats?: ('press_release' | 'exclusive' | 'opinion' | 'study' | 'interview')[];
    
    // Deadlines
    deadlines?: {
      type: 'daily' | 'weekly' | 'monthly' | 'issue_specific';
      time?: string; // "15:00"
      daysBeforePublication?: number;
      notes?: string;
    };
    
    // Kontakt-Präferenzen
    preferredSubmissionMethod?: 'email' | 'portal' | 'phone';
    submissionEmail?: string;
    submissionPortalUrl?: string;
    
    // Thematische Präferenzen
    interestedTopics?: string[];
    excludedTopics?: string[];
    
    // Technische Anforderungen
    maxAttachmentSize?: number; // MB
    acceptedFileFormats?: string[]; // ["PDF", "DOC", "JPG"]
  };
  
  // Media Kit Informationen
  mediaKit?: {
    lastUpdated?: Date;
    fileUrl?: string;
    
    // Werbe-Informationen
    advertisingRates?: {
      type: string; // "1/1 Seite", "Banner 728x90"
      price: MoneyAmount;
      notes?: string;
    }[];
    
    // Zielgruppen-Details
    audienceDemographics?: {
      ageDistribution?: { range: string; percentage: number }[];
      genderDistribution?: { gender: string; percentage: number }[];
      incomeDistribution?: { range: string; percentage: number }[];
      educationLevel?: { level: string; percentage: number }[];
      interests?: string[];
    };
  };
  
  // Bewertung & Qualität
  quality?: {
    relevanceScore?: number; // 0-100 (intern berechnet)
    responseRate?: number; // Prozent der Anfragen mit Antwort
    publicationRate?: number; // Prozent der eingereichten Artikel publiziert
    avgResponseTime?: number; // Tage
    
    // Feedback
    lastContactedAt?: Date;
    lastPublishedAt?: Date;
    totalSubmissions?: number;
    totalPublications?: number;
  };
  
  // URLs & Online-Präsenz
  websiteUrl?: string;
  socialMediaUrls?: {
    platform: string;
    url: string;
  }[];
  rssFeedUrl?: string;
  
  // Status & Verwaltung
  status: 'active' | 'inactive' | 'discontinued' | 'planned';
  launchDate?: Date;
  discontinuedDate?: Date;
  
  // Verifizierung
  verified?: boolean;
  verifiedAt?: Date;
  verifiedBy?: string; // userId
  lastVerificationAt?: Date;
  
  // Notizen
  publicNotes?: string; // Für Media Kit
  internalNotes?: string; // Nur intern sichtbar
  
  // Tags & Kategorisierung
  tags?: string[];
  customFields?: Record<string, any>;
  
  // Favoriten (User-spezifisch, sollte eigentlich in separater Collection)
  isFavorite?: boolean;
}

// ========================================
// Werbemittel / Advertisement
// ========================================

export type AdvertisementType = 
  | 'display_banner'
  | 'native_ad'
  | 'video_ad' 
  | 'print_ad'
  | 'audio_spot'
  | 'newsletter_ad'
  | 'social_media_ad'
  | 'advertorial'
  | 'event_sponsoring'
  | 'content_partnership'
  | 'custom';

export type PriceModel = 
  | 'cpm' // Cost per Mille (1000 Impressions)
  | 'cpc' // Cost per Click
  | 'cpa' // Cost per Action
  | 'flat' // Pauschalpreis
  | 'negotiable';

export interface Advertisement extends BaseEntity {
  // Grunddaten
  name: string; // Interner Name
  displayName?: string; // Öffentlicher Name (für Media Kit)
  description?: string;
  type: AdvertisementType;
  
  // Zuordnungen
  publicationIds: string[]; // Kann in mehreren Publikationen laufen
  publicationNames?: string[]; // Denormalisiert für Performance
  
  // Ansprechpartner
  primaryContactId?: string; // Hauptansprechpartner für Buchungen
  salesContactIds?: string[]; // Weitere Sales-Kontakte
  
  // Flexible Spezifikationen (Key-Value für maximale Flexibilität)
  specifications: {
    // Gemeinsame Specs
    format?: string; // "Rectangle", "Skyscraper", "1/1 Seite"
    position?: string[]; // ["Above the fold", "Sidebar", "U2"]
    
    // Print-spezifisch
    printSpecs?: {
      dimensions?: string; // "210x280mm"
      bleed?: string; // "3mm"
      colorSpace?: 'CMYK' | 'RGB' | 'SW';
      resolution?: string; // "300dpi"
      fileFormats?: string[]; // ["PDF/X-4", "EPS"]
      maxInkCoverage?: number; // 300%
    };
    
    // Digital-spezifisch
    digitalSpecs?: {
      dimensions?: string[]; // ["728x90", "300x250"]
      maxFileSize?: string; // "150KB"
      fileFormats?: string[]; // ["JPG", "PNG", "GIF", "HTML5"]
      animated?: boolean;
      maxAnimationLength?: number; // Sekunden
      clickTracking?: boolean;
      thirdPartyTracking?: boolean;
    };
    
    // Video-spezifisch
    videoSpecs?: {
      length?: number[]; // [15, 30, 60] Sekunden
      resolution?: string[]; // ["1920x1080", "1280x720"]
      fileFormats?: string[]; // ["MP4", "MOV"]
      maxFileSize?: string;
      aspectRatio?: string; // "16:9"
      audioCodec?: string;
    };
    
    // Newsletter-spezifisch
    newsletterSpecs?: {
      maxWidth?: string; // "600px"
      placement?: string[]; // ["Header", "Middle", "Footer"]
      textToImageRatio?: string; // "60:40"
    };
    
    // Custom Specs (völlig flexibel)
    customSpecs?: Record<string, any>;
  };
  
  // Preisgestaltung
  pricing: {
    listPrice: MoneyAmount;
    priceModel: PriceModel;
    priceUnit?: string; // "1000 Impressions", "Woche", "Ausgabe"
    
    // Mengen & Mindestbestellung
    minimumOrder?: {
      quantity: number;
      unit: string; // "Impressions", "Wochen", "Ausgaben"
    };
    
    // Rabatte
    discounts?: {
      volume?: { // Mengenrabatt
        threshold: number;
        unit: string;
        discountPercent: number;
      }[];
      frequency?: { // Frequenzrabatt
        bookingsPerYear: number;
        discountPercent: number;
      }[];
      agency?: number; // Agentur-Provision in Prozent
      earlyBooking?: { // Frühbucher
        daysInAdvance: number;
        discountPercent: number;
      };
      package?: { // Paket-Rabatte
        withAdTypes: AdvertisementType[];
        discountPercent: number;
      }[];
    };
    
    // Aufpreise
    surcharges?: {
      type: string; // "Platzierung", "Farbzuschlag", "Bleed"
      amount: MoneyAmount | number; // Betrag oder Prozent
      description?: string;
    }[];
  };
  
  // Internationale Preise (überschreibt Basis-Pricing)
  regionalPricing?: {
    edition?: string; // Publikations-Edition
    countries?: CountryCode[];
    pricing: Partial<Advertisement['pricing']>;
    validFrom?: Date;
    validUntil?: Date;
  }[];
  
  // Verfügbarkeit & Buchung
  availability: {
    startDate?: Date; // Ab wann buchbar
    endDate?: Date; // Bis wann buchbar
    
    // Ausschluss-Termine
    blackoutDates?: {
      start: Date;
      end: Date;
      reason?: string;
    }[];
    
    // Vorlaufzeiten
    bookingDeadline?: {
      days: number;
      type: 'business_days' | 'calendar_days';
      time?: string; // "12:00"
      notes?: string; // "Für Farbänderungen 2 Tage extra"
    };
    
    // Kapazitäten
    inventory?: {
      total?: number; // Gesamte verfügbare Einheiten
      booked?: number; // Bereits gebucht
      unit: string; // "Impressions", "Ausgaben"
    };
    
    // Saisonalität
    seasonalAvailability?: {
      season: 'spring' | 'summer' | 'fall' | 'winter' | 'christmas' | 'custom';
      customPeriod?: { start: string; end: string }; // MM-DD
      availabilityPercent?: number; // 0-100
      pricingAdjustment?: number; // Prozent Auf-/Abschlag
    }[];
  };
  
  // Targeting-Optionen (für digitale Werbung)
  targetingOptions?: {
    geographic?: {
      countries?: CountryCode[];
      regions?: string[];
      cities?: string[];
      radius?: { // Geo-Fencing
        latitude: number;
        longitude: number;
        radiusKm: number;
      }[];
    };
    
    demographic?: {
      ageGroups?: string[];
      genders?: string[];
      incomeRanges?: string[];
      education?: string[];
      interests?: string[];
    };
    
    behavioral?: {
      categories?: string[];
      customAudiences?: string[];
      retargeting?: boolean;
    };
    
    technical?: {
      devices?: ('desktop' | 'mobile' | 'tablet')[];
      operatingSystems?: string[];
      browsers?: string[];
    };
  };
  
  // Assets & Materialien
  materials: {
    // Spezifikationen & Guidelines
    specSheet?: {
      fileUrl: string;
      lastUpdated: Date;
      version?: string;
    };
    
    // Templates
    templates?: {
      name: string;
      fileUrl: string;
      software?: string; // "Adobe InDesign", "Photoshop"
      version?: string;
    }[];
    
    // Beispiele
    examples?: {
      name: string;
      fileUrl: string;
      description?: string;
      client?: string; // Beispiel-Kunde (anonymisiert)
    }[];
    
    // Logos & Brand Assets für Co-Branding
    brandAssets?: {
      type: 'logo' | 'wordmark' | 'icon' | 'guidelines';
      fileUrl: string;
      usage?: string;
    }[];
  };
  
  // Performance & Analytics
  performance?: {
    // Aggregierte Metriken
    totalBookings?: number;
    totalRevenue?: MoneyAmount;
    avgCtr?: number; // Click-through Rate
    avgConversionRate?: number;
    
    // Zeitreihen (sollte eigentlich in separater Collection)
    monthlyStats?: {
      month: string; // "YYYY-MM"
      bookings: number;
      revenue: MoneyAmount;
      impressions?: number;
      clicks?: number;
    }[];
    
    // Bewertungen
    clientSatisfaction?: number; // 0-5
    rebookingRate?: number; // Prozent
    
    // Letzte Aktivität
    lastBookingDate?: Date;
    lastUpdatedMetrics?: Date;
  };
  
  // Status & Verwaltung
  status: 'draft' | 'active' | 'paused' | 'discontinued';
  
  // Freigabe-Workflow
  approval?: {
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string; // userId
    approvedAt?: Date;
    comments?: string;
  };
  
  // Notizen
  publicNotes?: string; // Für Media Kit / Kunden sichtbar
  internalNotes?: string; // Nur intern
  salesNotes?: string; // Für Sales-Team
  
  // SEO & Marketing
  seoTitle?: string;
  seoDescription?: string;
  marketingBulletPoints?: string[]; // USPs für Sales
  
  // Tags & Kategorisierung
  tags?: string[];
  categories?: string[]; // Für Media Kit Gruppierung
  
  // Verknüpfungen
  competitorAdIds?: string[]; // Ähnliche Angebote bei Konkurrenz
  bundleIds?: string[]; // Teil von Werbe-Paketen
  
  // Custom Fields
  customFields?: Record<string, any>;
}

// ========================================
// Media Kit Types
// ========================================

export interface MediaKit extends BaseEntity {
  // Grunddaten
  name: string;
  companyId: string; // Verlag/Medienhaus
  companyName?: string;
  
  // Versionen
  version: string; // "2024.1"
  validFrom: Date;
  validUntil?: Date;
  
  // Inhalt
  publications: {
    publicationId: string;
    included: boolean;
    specialNotes?: string;
  }[];
  
  advertisements: {
    advertisementId: string;
    included: boolean;
    specialPricing?: Partial<Advertisement['pricing']>;
  }[];
  
  // Generierte Dokumente
  documents: {
    type: 'full' | 'summary' | 'rate_card' | 'demographics' | 'custom';
    language: LanguageCode;
    format: 'pdf' | 'pptx' | 'web';
    fileUrl?: string;
    generatedAt?: Date;
    template?: string;
  }[];
  
  // Einstellungen
  settings: {
    showPricing: boolean;
    showDemographics: boolean;
    showExamples: boolean;
    customBranding?: {
      logoUrl?: string;
      primaryColor?: string;
      fontFamily?: string;
    };
  };
  
  // Distribution
  distribution?: {
    isPublic: boolean;
    shareUrl?: string;
    password?: string;
    sharedWith?: {
      email: string;
      sharedAt: Date;
      viewedAt?: Date;
    }[];
  };
}

// ========================================
// Helper Types & Constants
// ========================================

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  'magazine': 'Magazin',
  'newspaper': 'Tageszeitung',
  'website': 'Website',
  'blog': 'Blog',
  'podcast': 'Podcast',
  'tv': 'TV-Sender',
  'radio': 'Radio',
  'newsletter': 'Newsletter',
  'trade_journal': 'Fachzeitschrift',
  'press_agency': 'Nachrichtenagentur',
  'social_media': 'Social Media'
};

export const PUBLICATION_FREQUENCY_LABELS: Record<PublicationFrequency, string> = {
  'continuous': 'Durchgehend',
  'multiple_daily': 'Mehrmals täglich',
  'daily': 'Täglich',
  'weekly': 'Wöchentlich',
  'biweekly': '14-tägig',
  'monthly': 'Monatlich',
  'bimonthly': 'Zweimonatlich',
  'quarterly': 'Vierteljährlich',
  'biannual': 'Halbjährlich',
  'annual': 'Jährlich',
  'irregular': 'Unregelmäßig'
};

export const ADVERTISEMENT_TYPE_LABELS: Record<AdvertisementType, string> = {
  'display_banner': 'Display Banner',
  'native_ad': 'Native Advertising',
  'video_ad': 'Video-Werbung',
  'print_ad': 'Print-Anzeige',
  'audio_spot': 'Audio-Spot',
  'newsletter_ad': 'Newsletter-Werbung',
  'social_media_ad': 'Social Media Ad',
  'advertorial': 'Advertorial',
  'event_sponsoring': 'Event-Sponsoring',
  'content_partnership': 'Content-Partnerschaft',
  'custom': 'Individuell'
};

export const PRICE_MODEL_LABELS: Record<PriceModel, string> = {
  'cpm': 'TKP (Tausend-Kontakt-Preis)',
  'cpc': 'CPC (Cost-per-Click)',
  'cpa': 'CPA (Cost-per-Action)',
  'flat': 'Pauschalpreis',
  'negotiable': 'Verhandelbar'
};

// Für Formulare
export interface PublicationFormData extends Omit<Publication, keyof BaseEntity> {}
export interface AdvertisementFormData extends Omit<Advertisement, keyof BaseEntity> {}

// Für Importe
export interface PublicationImportData {
  title: string;
  publisherName: string;
  type: string;
  websiteUrl?: string;
  circulation?: number;
  languages?: string;
  focusAreas?: string;
  [key: string]: any;
}

// Validation
export const PUBLICATION_VALIDATION = {
  title: { required: true, minLength: 2, maxLength: 200 },
  languages: { required: true, minItems: 1 },
  geographicTargets: { required: true, minItems: 1 },
  focusAreas: { required: true, minItems: 1 }
} as const;

export const ADVERTISEMENT_VALIDATION = {
  name: { required: true, minLength: 2, maxLength: 100 },
  publicationIds: { required: true, minItems: 1 },
  pricing: { required: true }
} as const;
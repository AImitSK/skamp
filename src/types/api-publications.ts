// src/types/api-publications.ts
import { 
  Publication, 
  PublicationType, 
  PublicationFrequency,
  PublicationFormat,
  Advertisement,
  AdvertisementType,
  PriceModel,
  MediaKit
} from './library';
import { 
  CountryCode, 
  LanguageCode, 
  CurrencyCode,
  MoneyAmount 
} from './international';

// ========================================
// Publications API Types
// ========================================

/**
 * API Response für Publikationsliste
 */
export interface APIPublicationListResponse {
  publications: APIPublication[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  filters: {
    types?: PublicationType[];
    languages?: LanguageCode[];
    countries?: CountryCode[];
    publisherIds?: string[];
  };
}

/**
 * API-optimierte Publikations-Darstellung
 */
export interface APIPublication {
  id: string;
  title: string;
  subtitle?: string;
  
  // Verlag
  publisher: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  
  // Klassifizierung
  type: PublicationType;
  format: PublicationFormat;
  frequency: PublicationFrequency;
  
  // Metriken (vereinfacht)
  metrics: {
    circulation?: number;
    circulationType?: string;
    monthlyUniqueVisitors?: number;
    monthlyPageViews?: number;
    targetAudience?: string;
  };
  
  // International
  languages: LanguageCode[];
  countries: CountryCode[];
  geographicScope: 'local' | 'regional' | 'national' | 'international' | 'global';
  
  // Themenschwerpunkte
  focusAreas: string[];
  targetIndustries?: string[];
  
  // Status
  status: 'active' | 'inactive' | 'archived';
  verified: boolean;
  verifiedAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // URLs und Links
  website?: string;
  mediaKitUrl?: string;
  
  // Zusätzliche Details (optional in Liste)
  _expanded?: {
    editions?: Publication['editions'];
    sections?: Publication['sections'];
    editorialContacts?: Publication['editorialContacts'];
    submissionGuidelines?: Publication['submissionGuidelines'];
  };
}

/**
 * Request für Publikationserstellung
 */
export interface APIPublicationCreateRequest {
  title: string;
  subtitle?: string;
  publisherId: string;
  
  type: PublicationType;
  format: PublicationFormat;
  frequency: PublicationFrequency;
  
  languages: LanguageCode[];
  countries: CountryCode[];
  geographicScope?: 'local' | 'regional' | 'national' | 'international' | 'global';
  
  focusAreas?: string[];
  targetIndustries?: string[];
  
  metrics?: {
    circulation?: number;
    circulationType?: string;
    monthlyUniqueVisitors?: number;
    monthlyPageViews?: number;
    targetAudience?: string;
  };
  
  website?: string;
  status?: 'active' | 'inactive' | 'archived';
}

/**
 * Request für Publikations-Update
 */
export interface APIPublicationUpdateRequest extends Partial<APIPublicationCreateRequest> {
  verified?: boolean;
  verifiedAt?: string;
}

/**
 * Bulk-Import Request
 */
export interface APIPublicationBulkCreateRequest {
  publications: APIPublicationCreateRequest[];
  options?: {
    duplicateCheck?: boolean;
    updateExisting?: boolean;
    defaultPublisherId?: string;
  };
}

/**
 * Bulk-Import Response
 */
export interface APIPublicationBulkCreateResponse {
  created: number;
  updated: number;
  skipped: number;
  errors: {
    index: number;
    title?: string;
    error: string;
  }[];
  publicationIds: string[];
}

/**
 * Filter-Parameter für Publikationssuche
 */
export interface APIPublicationSearchParams {
  // Textsuche
  search?: string;
  
  // Filter
  types?: PublicationType[];
  formats?: PublicationFormat[];
  frequencies?: PublicationFrequency[];
  languages?: LanguageCode[];
  countries?: CountryCode[];
  publisherIds?: string[];
  focusAreas?: string[];
  targetIndustries?: string[];
  
  // Metriken-Filter
  minCirculation?: number;
  maxCirculation?: number;
  minMonthlyVisitors?: number;
  maxMonthlyVisitors?: number;
  
  // Status
  status?: ('active' | 'inactive' | 'archived')[];
  onlyVerified?: boolean;
  
  // Pagination
  page?: number;
  limit?: number;
  
  // Sortierung
  sortBy?: 'title' | 'circulation' | 'monthlyVisitors' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  
  // Expansion
  expand?: ('publisher' | 'editions' | 'contacts' | 'guidelines')[];
}

// ========================================
// Media Assets API Types
// ========================================

/**
 * API Response für Media Asset Liste
 */
export interface APIMediaAssetListResponse {
  assets: APIMediaAsset[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

/**
 * API-optimierte Media Asset Darstellung
 */
export interface APIMediaAsset {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  
  // Verknüpfungen
  publications: {
    id: string;
    title: string;
  }[];
  
  // Klassifizierung
  type: AdvertisementType;
  category?: string;
  tags?: string[];
  
  // Preise
  pricing: {
    listPrice: MoneyAmount;
    priceModel: PriceModel;
    discounts?: {
      volume?: { threshold: number; discountPercent: number }[];
      frequency?: { bookingsPerYear: number; discountPercent: number }[];
      agency?: number;
      earlyBooking?: { daysInAdvance: number; discountPercent: number };
    };
  };
  
  // Spezifikationen
  specifications?: {
    dimensions?: { width: number; height: number; unit: string };
    colorMode?: 'color' | 'blackwhite' | 'both';
    fileFormats?: string[];
    maxFileSize?: string;
    resolution?: string;
  };
  
  // Verfügbarkeit
  availability?: {
    startDate?: string;
    endDate?: string;
    leadTime?: number; // Tage
    bookingDeadline?: string;
  };
  
  // Performance
  performance?: {
    totalBookings: number;
    totalRevenue: MoneyAmount;
    avgCtr?: number;
    lastBookingDate?: string;
  };
  
  // Status
  status: 'draft' | 'active' | 'paused' | 'discontinued';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Request für Media Asset Erstellung
 */
export interface APIMediaAssetCreateRequest {
  name: string;
  displayName?: string;
  description?: string;
  
  publicationIds: string[];
  
  type: AdvertisementType;
  category?: string;
  tags?: string[];
  
  pricing: {
    listPrice: MoneyAmount;
    priceModel: PriceModel;
    discounts?: APIMediaAsset['pricing']['discounts'];
  };
  
  specifications?: APIMediaAsset['specifications'];
  availability?: Omit<APIMediaAsset['availability'], 'startDate' | 'endDate'> & {
    startDate?: Date;
    endDate?: Date;
  };
  
  status?: 'draft' | 'active' | 'paused' | 'discontinued';
}

/**
 * Filter-Parameter für Media Asset Suche
 */
export interface APIMediaAssetSearchParams {
  search?: string;
  
  publicationIds?: string[];
  types?: AdvertisementType[];
  categories?: string[];
  tags?: string[];
  
  minPrice?: number;
  maxPrice?: number;
  currency?: CurrencyCode;
  priceModels?: PriceModel[];
  
  status?: ('draft' | 'active' | 'paused' | 'discontinued')[];
  
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'bookings' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// Media Kit API Types
// ========================================

/**
 * API Response für Media Kit
 */
export interface APIMediaKit {
  id: string;
  name: string;
  version: string;
  
  company: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  
  validFrom: string;
  validUntil?: string;
  
  publications: {
    id: string;
    title: string;
    type: PublicationType;
    included: boolean;
  }[];
  
  advertisements: {
    id: string;
    name: string;
    type: AdvertisementType;
    included: boolean;
  }[];
  
  documents: {
    type: 'full' | 'summary' | 'rate_card' | 'demographics' | 'case_studies';
    language: LanguageCode;
    format: 'pdf' | 'pptx' | 'html';
    url?: string;
    generatedAt?: string;
  }[];
  
  distribution?: {
    isPublic: boolean;
    shareUrl?: string;
    password?: boolean; // Hat Passwort (true/false, nicht das Passwort selbst)
    sharedWith?: {
      email: string;
      sharedAt: string;
      viewedAt?: string;
    }[];
  };
  
  settings: {
    showPricing: boolean;
    showDemographics: boolean;
    showExamples: boolean;
    customBranding?: {
      logoUrl?: string;
      primaryColor?: string;
    };
  };
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Request für Media Kit Generierung
 */
export interface APIMediaKitGenerateRequest {
  name?: string;
  companyId: string;
  
  includedPublicationIds?: string[];
  includedAdvertisementIds?: string[];
  
  language?: LanguageCode;
  template?: string;
  
  settings?: {
    showPricing?: boolean;
    showDemographics?: boolean;
    showExamples?: boolean;
  };
}

/**
 * Request für Media Kit Sharing
 */
export interface APIMediaKitShareRequest {
  emails: string[];
  message?: string;
  password?: string;
  expiresInDays?: number;
}

// ========================================
// Statistik-Types
// ========================================

/**
 * Publications Statistiken
 */
export interface APIPublicationsStatistics {
  totalPublications: number;
  byType: Record<PublicationType, number>;
  byCountry: Record<CountryCode, number>;
  byLanguage: Record<LanguageCode, number>;
  byFormat: Record<PublicationFormat, number>;
  
  totalCirculation: number;
  totalOnlineReach: number;
  
  verifiedCount: number;
  activeCount: number;
  
  topPublishers: {
    id: string;
    name: string;
    publicationCount: number;
  }[];
  
  topFocusAreas: {
    area: string;
    count: number;
  }[];
}

// ========================================
// Error Types
// ========================================

export interface APIPublicationError {
  code: 'PUBLICATION_NOT_FOUND' | 'INVALID_PUBLISHER' | 'DUPLICATE_TITLE' | 'MISSING_REQUIRED_FIELDS' | 'INVALID_METRICS';
  message: string;
  field?: string;
  details?: any;
}

export interface APIMediaAssetError {
  code: 'ASSET_NOT_FOUND' | 'INVALID_PUBLICATION' | 'INVALID_PRICING' | 'MISSING_REQUIRED_FIELDS';
  message: string;
  field?: string;
  details?: any;
}
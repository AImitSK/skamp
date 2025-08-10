// src/types/api-crm.ts
/**
 * API Types für CRM-Endpunkte (Contacts & Companies)
 * Erweitert die base API types um CRM-spezifische Definitionen
 */

import { ContactEnhanced, CompanyEnhanced, Tag } from '@/types/crm-enhanced';
import { PaginationParams, FilterParams } from '@/types/api';

// ========================================
// Contacts API Types
// ========================================

export interface ContactCreateRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  
  // Company Assignment
  companyId?: string;
  
  // Address
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    state?: string;
  };
  
  // Social & Web
  linkedinUrl?: string;
  twitterHandle?: string;
  website?: string;
  
  // PR-specific
  mediaOutlets?: string[];
  expertise?: string[];
  tags?: string[];
  
  // Communication Preferences
  preferredContactMethod?: 'email' | 'phone' | 'linkedin';
  communicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  
  // Notes
  notes?: string;
  internalNotes?: string;
}

export interface ContactUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  companyId?: string;
  
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    state?: string;
  };
  
  linkedinUrl?: string;
  twitterHandle?: string;
  website?: string;
  
  mediaOutlets?: string[];
  expertise?: string[];
  tags?: string[];
  
  preferredContactMethod?: 'email' | 'phone' | 'linkedin';
  communicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  
  notes?: string;
  internalNotes?: string;
  
  // Status Updates
  isActive?: boolean;
}

export interface ContactListParams extends PaginationParams {
  // Base search and sort inherited from PaginationParams
  
  // Contact-specific filters
  companyId?: string;
  tags?: string | string[];
  expertise?: string | string[];
  mediaOutlets?: string | string[];
  
  // Location filters
  country?: string;
  city?: string;
  
  // Relationship filters
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedin?: boolean;
  
  // Status filters
  isActive?: boolean;
  
  // Communication filters
  preferredContactMethod?: 'email' | 'phone' | 'linkedin';
  communicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  
  // Date filters
  createdAfter?: string; // ISO date
  createdBefore?: string; // ISO date
  lastContactAfter?: string; // ISO date
  lastContactBefore?: string; // ISO date
}

export interface ContactAPIResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string; // Computed field
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  
  // Company info (populated)
  company?: {
    id: string;
    name: string;
    domain?: string;
    industry?: string;
  };
  
  // Address
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    state?: string;
    formatted?: string; // Computed field
  };
  
  // Social & Web
  linkedinUrl?: string;
  twitterHandle?: string;
  website?: string;
  
  // PR-specific
  mediaOutlets: string[];
  expertise: string[];
  tags: Array<{
    name: string;
    color?: string;
  }>;
  
  // Communication
  preferredContactMethod?: 'email' | 'phone' | 'linkedin';
  communicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastContactAt?: string; // ISO date
  
  // Notes
  notes?: string;
  // internalNotes excluded from API response for security
  
  // Metadata
  isActive: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  
  // API-specific computed fields
  contactScore?: number; // Engagement score
  recentActivity?: {
    type: string;
    date: string;
    description: string;
  }[];
}

// ========================================
// Companies API Types
// ========================================

export interface CompanyCreateRequest {
  name: string;
  tradingName?: string;
  legalName?: string;
  
  // Basic Info
  industry?: string;
  companySize?: string;
  companyType?: 'media_house' | 'agency' | 'corporate' | 'startup' | 'nonprofit' | 'government';
  founded?: number;
  
  // Contact Info
  website?: string;
  phone?: string;
  email?: string;
  
  // Address
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    state?: string;
  };
  
  // Media House specific
  mediaType?: 'newspaper' | 'magazine' | 'tv' | 'radio' | 'online' | 'wire';
  coverage?: 'local' | 'national' | 'international';
  circulation?: number;
  audienceSize?: number;
  
  // Social & Web
  linkedinUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  instagramHandle?: string;
  
  // Business Info
  vatNumber?: string;
  registrationNumber?: string;
  
  // PR-specific
  tags?: string[];
  
  // Notes
  notes?: string;
  internalNotes?: string;
}

export interface CompanyUpdateRequest {
  name?: string;
  tradingName?: string;
  legalName?: string;
  industry?: string;
  companySize?: string;
  companyType?: 'media_house' | 'agency' | 'corporate' | 'startup' | 'nonprofit' | 'government';
  founded?: number;
  
  website?: string;
  phone?: string;
  email?: string;
  
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    state?: string;
  };
  
  mediaType?: 'newspaper' | 'magazine' | 'tv' | 'radio' | 'online' | 'wire';
  coverage?: 'local' | 'national' | 'international';
  circulation?: number;
  audienceSize?: number;
  
  linkedinUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  instagramHandle?: string;
  
  vatNumber?: string;
  registrationNumber?: string;
  
  tags?: string[];
  
  notes?: string;
  internalNotes?: string;
  
  isActive?: boolean;
}

export interface CompanyListParams extends PaginationParams {
  // Base search and sort inherited from PaginationParams
  
  // Company-specific filters
  industry?: string | string[];
  companyType?: string | string[];
  companySize?: string | string[];
  mediaType?: string | string[];
  coverage?: string | string[];
  
  // Location filters
  country?: string;
  city?: string;
  
  // Size filters
  circulationMin?: number;
  circulationMax?: number;
  audienceSizeMin?: number;
  audienceSizeMax?: number;
  foundedAfter?: number;
  foundedBefore?: number;
  
  // Feature filters
  hasWebsite?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedin?: boolean;
  hasTwitter?: boolean;
  
  // Relationship filters
  hasContacts?: boolean; // Has associated contacts
  
  // Status filters
  isActive?: boolean;
  
  // Tag filters
  tags?: string | string[];
}

export interface CompanyAPIResponse {
  id: string;
  name: string;
  tradingName?: string;
  legalName?: string;
  displayName: string; // Computed: tradingName || name
  
  // Basic Info
  industry?: string;
  companySize?: string;
  companyType?: 'media_house' | 'agency' | 'corporate' | 'startup' | 'nonprofit' | 'government';
  founded?: number;
  
  // Contact Info
  website?: string;
  domain?: string; // Computed from website
  phone?: string;
  email?: string;
  
  // Address
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    state?: string;
    formatted?: string; // Computed field
  };
  
  // Media House specific
  mediaType?: 'newspaper' | 'magazine' | 'tv' | 'radio' | 'online' | 'wire';
  coverage?: 'local' | 'national' | 'international';
  circulation?: number;
  audienceSize?: number;
  
  // Social & Web
  linkedinUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  instagramHandle?: string;
  
  // Business Info
  vatNumber?: string;
  registrationNumber?: string;
  
  // PR-specific
  tags: Array<{
    name: string;
    color?: string;
  }>;
  
  // Relations
  contactCount: number;
  publicationCount?: number; // If it's a media house
  
  // Notes
  notes?: string;
  // internalNotes excluded from API response
  
  // Metadata
  isActive: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  
  // API-specific computed fields
  lastContactAt?: string; // Last interaction with any contact
  activityScore?: number; // Engagement score
  recentActivity?: {
    type: string;
    date: string;
    description: string;
  }[];
}

// ========================================
// Bulk Operations Types
// ========================================

export interface BulkContactCreateRequest {
  contacts: ContactCreateRequest[];
  continueOnError?: boolean; // Continue processing if individual contacts fail
}

export interface BulkContactUpdateRequest {
  updates: Array<{
    id: string;
    data: ContactUpdateRequest;
  }>;
  continueOnError?: boolean;
}

export interface BulkCompanyCreateRequest {
  companies: CompanyCreateRequest[];
  continueOnError?: boolean;
}

export interface BulkCompanyUpdateRequest {
  updates: Array<{
    id: string;
    data: CompanyUpdateRequest;
  }>;
  continueOnError?: boolean;
}

export interface BulkOperationResponse<T> {
  success: boolean;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
    };
  }>;
  
  summary: {
    duration: number; // milliseconds
    averageTimePerItem: number; // milliseconds
  };
}

// ========================================
// Export Types
// ========================================

export interface ExportRequest {
  format: 'csv' | 'json' | 'excel';
  fields?: string[]; // Specific fields to export
  filters?: ContactListParams | CompanyListParams;
  includeInternalNotes?: boolean; // Requires special permission
}

export interface ExportResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedDuration?: number; // seconds
  downloadUrl?: string; // Available when completed
  expiresAt?: string; // ISO date when download expires
}
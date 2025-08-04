// UI-spezifische Typen für das Publications Feature

// Alert Component Props
export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Confirm Dialog State
export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  type?: 'danger' | 'warning';
}

// Import Modal Props
export interface PublicationImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

// Import Options
export interface ImportOptions {
  updateExisting: boolean;
  skipInvalid: boolean;
  defaultLanguage: string;
  defaultCountry: string;
}

// Import Results
export interface ImportResults {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

// Publication Modal Props
export interface PublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication?: Publication;
  onSuccess: () => void;
  preselectedPublisherId?: string;
}

// Tag Input Props
export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

// Stat Card Props
export interface StatCardProps {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

// Info Row Props
export interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: any;
}

// Tab Types
export type TabType = 'overview' | 'metrics' | 'editorial' | 'advertisements' | 'identifiers';

// Import Step Types
export type ImportStep = 'upload' | 'mapping' | 'import';

// Field Mapping für Import
export interface FieldMapping {
  [key: string]: string;
}

// Publication Form Data
export interface PublicationFormData {
  title: string;
  subtitle: string;
  publisherId: string;
  publisherName: string;
  type: PublicationType;
  format: PublicationFormat;
  languages: LanguageCode[];
  geographicTargets: CountryCode[];
  focusAreas: string[];
  verified: boolean;
  status: 'active' | 'inactive' | 'discontinued' | 'planned';
  metrics: {
    frequency: PublicationFrequency;
    targetAudience?: string;
    targetAgeGroup?: string;
    targetGender?: 'all' | 'predominantly_male' | 'predominantly_female';
  };
  geographicScope: 'local' | 'regional' | 'national' | 'international' | 'global';
  websiteUrl?: string;
  internalNotes?: string;
}

// Metrics Form State
export interface MetricsFormState {
  frequency: PublicationFrequency;
  targetAudience: string;
  targetAgeGroup: string;
  targetGender: 'all' | 'predominantly_male' | 'predominantly_female';
  print: {
    circulation: string;
    circulationType: 'distributed' | 'sold' | 'printed' | 'subscribers' | 'audited_ivw';
    pricePerIssue: string;
    subscriptionPriceMonthly: string;
    subscriptionPriceAnnual: string;
    pageCount: string;
    paperFormat: string;
  };
  online: {
    monthlyUniqueVisitors: string;
    monthlyPageViews: string;
    avgSessionDuration: string;
    bounceRate: string;
    registeredUsers: string;
    paidSubscribers: string;
    newsletterSubscribers: string;
    domainAuthority: string;
    hasPaywall: boolean;
    hasMobileApp: boolean;
  };
}

// Identifier Form Item
export interface IdentifierFormItem {
  type: 'ISSN' | 'ISBN' | 'DOI' | 'URL' | 'DOMAIN' | 'SOCIAL_HANDLE' | 'OTHER';
  value: string;
  description?: string;
}

// Social Media URL Item
export interface SocialMediaUrlItem {
  platform: string;
  url: string;
}

// Import von base types (muss existieren)
import type { 
  Publication, 
  PublicationType, 
  PublicationFormat, 
  PublicationFrequency,
  LanguageCode,
  CountryCode
} from '@/types/library';
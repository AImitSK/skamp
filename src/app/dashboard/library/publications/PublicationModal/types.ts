// src/app/dashboard/library/publications/PublicationModal/types.ts

import type { Publication, PublicationType, PublicationFormat, PublicationFrequency } from '@/types/library';
import type { CountryCode, LanguageCode } from '@/types/international';

// Form Data Interface
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

// Metrics Interface
export interface MetricsState {
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
  broadcast: {
    viewership: string;
    marketShare: string;
    broadcastArea: string;
  };
  audio: {
    monthlyDownloads: string;
    monthlyListeners: string;
    episodeCount: string;
    avgEpisodeDuration: string;
  };
}

// Identifier Interface
export interface IdentifierItem {
  type: 'ISSN' | 'ISBN' | 'DOI' | 'URL' | 'DOMAIN' | 'SOCIAL_HANDLE' | 'OTHER';
  value: string;
  description?: string;
}

// Social Media Interface
export interface SocialMediaItem {
  platform: string;
  url: string;
}

// Monitoring Config Interface
// HINWEIS: checkFrequency und keywords wurden entfernt (Plan 01) - werden vom Crawler ignoriert
export interface MonitoringConfigState {
  isEnabled: boolean;
  websiteUrl: string;
  rssFeedUrls: string[];
  autoDetectRss: boolean;
  totalArticlesFound: number;
}

// RSS Detection Status
export type RssDetectionStatus = 'idle' | 'checking' | 'found' | 'not_found';

// Tab Type
export type TabType = 'basic' | 'metrics' | 'identifiers' | 'monitoring';

// Constants
export const publicationTypes = [
  { value: 'newspaper', label: 'Zeitung' },
  { value: 'magazine', label: 'Magazin' },
  { value: 'website', label: 'Website' },
  { value: 'blog', label: 'Blog' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'tv', label: 'TV' },
  { value: 'radio', label: 'Radio' },
  { value: 'trade_journal', label: 'Fachzeitschrift' },
  { value: 'social_media', label: 'Social Media' }
];

export const frequencies = [
  { value: 'continuous', label: 'Durchgehend' },
  { value: 'multiple_daily', label: 'Mehrmals täglich' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'bimonthly', label: 'Zweimonatlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
  { value: 'biannual', label: 'Halbjährlich' },
  { value: 'annual', label: 'Jährlich' },
  { value: 'irregular', label: 'Unregelmäßig' }
];

export const circulationTypes = [
  { value: 'distributed', label: 'Verbreitete Auflage' },
  { value: 'sold', label: 'Verkaufte Auflage' },
  { value: 'printed', label: 'Gedruckte Auflage' },
  { value: 'subscribers', label: 'Abonnenten' },
  { value: 'audited_ivw', label: 'IVW geprüft' }
];

export const geographicScopes = [
  { value: 'local', label: 'Lokal' },
  { value: 'regional', label: 'Regional' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global', label: 'Global' }
];

// Helper: Create default form data
export const createDefaultFormData = (): PublicationFormData => ({
  title: '',
  subtitle: '',
  publisherId: '',
  publisherName: '',
  type: 'website',
  format: 'online',
  languages: [],
  geographicTargets: [],
  focusAreas: [],
  verified: false,
  status: 'active',
  metrics: {
    frequency: 'daily'
  },
  geographicScope: 'national'
});

// Helper: Create default metrics state
export const createDefaultMetrics = (): MetricsState => ({
  frequency: 'daily',
  targetAudience: '',
  targetAgeGroup: '',
  targetGender: 'all',
  print: {
    circulation: '',
    circulationType: 'distributed',
    pricePerIssue: '',
    subscriptionPriceMonthly: '',
    subscriptionPriceAnnual: '',
    pageCount: '',
    paperFormat: ''
  },
  online: {
    monthlyUniqueVisitors: '',
    monthlyPageViews: '',
    avgSessionDuration: '',
    bounceRate: '',
    registeredUsers: '',
    paidSubscribers: '',
    newsletterSubscribers: '',
    domainAuthority: '',
    hasPaywall: false,
    hasMobileApp: false
  },
  broadcast: {
    viewership: '',
    marketShare: '',
    broadcastArea: ''
  },
  audio: {
    monthlyDownloads: '',
    monthlyListeners: '',
    episodeCount: '',
    avgEpisodeDuration: ''
  }
});

// Helper: Create default monitoring config
export const createDefaultMonitoringConfig = (): MonitoringConfigState => ({
  isEnabled: true,
  websiteUrl: '',
  rssFeedUrls: [],
  autoDetectRss: true,
  totalArticlesFound: 0
});

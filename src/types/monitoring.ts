import { Timestamp } from 'firebase/firestore';

export interface MediaClipping {
  id?: string;
  organizationId: string;

  // Verknüpfungen
  campaignId?: string;
  projectId?: string;
  emailSendId?: string;

  // Artikel-Daten
  title: string;
  url: string;
  publishedAt: Timestamp;

  // Medium/Outlet
  outletName: string;
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  outletUrl?: string;

  // Inhalt
  excerpt?: string;
  fullText?: string;
  screenshot?: string;
  pdfArchive?: string;

  // Metriken
  reach?: number;
  ave?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  sentimentNotes?: string;

  // Kategorisierung
  tags?: string[];
  category?: 'news' | 'feature' | 'interview' | 'mention';
  prominenceScore?: number;

  // Tracking
  detectionMethod: 'manual' | 'google_news' | 'rss' | 'web_scraping' | 'imported';
  detectedAt: Timestamp;
  verifiedBy?: string;
  verifiedAt?: Timestamp;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MonitoringSuggestion {
  id?: string;
  organizationId: string;
  campaignId: string;

  // Gefundener Artikel
  articleUrl: string;
  articleTitle: string;
  articleExcerpt?: string;
  source: 'google_news' | 'rss' | 'web_scraping';
  foundAt: Timestamp;

  // Matching
  matchScore: number;
  matchedKeywords: string[];

  // Status
  status: 'pending' | 'confirmed' | 'rejected' | 'duplicate';
  reviewedBy?: string;
  reviewedAt?: Timestamp;

  // Falls bestätigt
  clippingId?: string;

  createdAt: Timestamp;
}

export interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  totalAVE: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  byOutletType: {
    print: number;
    online: number;
    broadcast: number;
    blog: number;
  };
  byCategory: {
    news: number;
    feature: number;
    interview: number;
    mention: number;
  };
}

export interface PublishingData {
  articleUrl: string;
  articleTitle?: string;
  reach?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  publicationNotes?: string;
  outletName?: string;
  publishedAt?: Timestamp;
}

export interface AVESettings {
  id?: string;
  organizationId: string;

  factors: {
    print: number;
    online: number;
    broadcast: number;
    blog: number;
  };

  sentimentMultipliers: {
    positive: number;
    neutral: number;
    negative: number;
  };

  updatedBy: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export const DEFAULT_AVE_SETTINGS: Omit<AVESettings, 'id' | 'organizationId' | 'updatedBy' | 'updatedAt' | 'createdAt'> = {
  factors: {
    print: 3,
    online: 1,
    broadcast: 5,
    blog: 0.5
  },
  sentimentMultipliers: {
    positive: 1.0,
    neutral: 0.8,
    negative: 0.5
  }
};
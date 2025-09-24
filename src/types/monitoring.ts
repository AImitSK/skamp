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
  publicationNotes?: string;
  outletName?: string;
  publishedAt?: Timestamp;
}
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';
import { BrandingSettings } from '@/types/branding';

/**
 * Report Configuration Types
 */

export interface ReportConfig {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeCharts: boolean;
  includeClippingDetails: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
}

/**
 * Email Statistics
 */

export interface EmailStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  ctr: number; // Click-Through-Rate (clicked / totalSent)
  conversionRate: number; // Öffnungen → Clippings
}

/**
 * Outlet Statistics
 */

export interface OutletStats {
  name: string;
  reach: number;
  clippingsCount: number;
}

/**
 * Outlet Type Distribution
 */

export interface OutletTypeDistribution {
  type: string;
  count: number;
  reach: number;
  percentage: number;
}

/**
 * Clipping Statistics
 */

export interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  totalAVE: number;
  avgReach: number; // Durchschnitts-Reichweite pro Clipping
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topOutlets: OutletStats[];
  outletTypeDistribution: OutletTypeDistribution[];
}

/**
 * Timeline Data Point
 */

export interface TimelineData {
  date: string;
  clippings: number;
  reach: number;
}

/**
 * Complete Monitoring Report Data
 */

export interface MonitoringReportData {
  campaignId: string;
  organizationId: string;
  reportTitle: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  branding: BrandingSettings | null;
  emailStats: EmailStats;
  clippingStats: ClippingStats;
  timeline: TimelineData[];
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
}

/**
 * Report Generation Result
 */

export interface ReportResult {
  pdfUrl: string;
  fileSize?: number;
  generatedAt: Date;
}

/**
 * Scheduled Report Configuration (für zukünftige Cron-Jobs)
 */

export interface ScheduledReportConfig extends ReportConfig {
  recipients: string[]; // Email-Adressen
  subject: string;
  message?: string; // Optional email body
  schedule: 'daily' | 'weekly' | 'monthly';
  nextRun?: Date;
}

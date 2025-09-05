// src/types/project.ts - Basis-Projekt-Types für Pipeline-Integration
import { Timestamp } from 'firebase/firestore';
import type { ProjectMilestone } from './pr';

// ✅ Pipeline-Stage direkt hier definieren für bessere Type-Sicherheit
export type PipelineStage = 
  | 'creation'     // Erstellung-Phase
  | 'review'       // Review-Phase
  | 'approval'     // Freigabe-Phase
  | 'distribution' // Verteilung-Phase
  | 'monitoring'   // Monitoring-Phase (NEU Plan 5/9)
  | 'completed';   // Abgeschlossen

export interface Project {
  id?: string;
  userId: string;
  organizationId: string;
  
  // Projekt-Details
  title: string;
  description?: string;
  status: ProjectStatus;
  currentStage: PipelineStage;
  
  // Kunde/Auftraggeber
  customer?: {
    id: string;
    name: string;
  };
  
  // Budget
  budget?: number;
  currency?: string;
  
  // Verknüpfte Kampagnen
  linkedCampaigns?: string[];
  
  // Meilensteine
  milestones?: ProjectMilestone[];
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  
  // Team
  assignedTo?: string[];
  
  // ========================================
  // PLAN 6/9: MEDIA-ASSETS-INTEGRATION
  // ========================================
  
  // Projekt-weite Asset-Integration
  mediaConfig?: {
    allowAssetSharing: boolean; // Assets zwischen Kampagnen teilen
    assetLibraryId?: string;    // Projekt-spezifische Asset-Library
    defaultFolder?: string;     // Standard-Ordner für neue Assets
    assetNamingPattern?: string; // Naming-Convention
    assetRetentionDays?: number; // Asset-Aufbewahrung
  };
  
  // Aggregierte Asset-Daten (Performance-Optimierung)
  assetSummary?: {
    totalAssets: number;
    assetsByType: Record<string, number>; // {'image': 15, 'pdf': 3}
    lastAssetAdded?: Timestamp;
    storageUsed: number; // in Bytes
    topAssets: Array<{ assetId: string; fileName: string; usage: number }>;
  };
  
  // Asset-Library Verknüpfung
  sharedAssets?: any[]; // CampaignAssetAttachment[]
  assetFolders?: Array<{
    folderId: string;
    folderName: string;
    assetCount: number;
    lastModified: Timestamp;
  }>;
  
  // ========================================
  // PLAN 7/9: KOMMUNIKATIONS-FEATURES
  // ========================================
  
  // Kommunikations-Konfiguration
  communicationConfig?: {
    enableAutoProjectDetection: boolean;
    confidenceThreshold: number; // Min. Konfidenz für automatische Zuordnung
    notificationSettings: {
      newEmailAlert: boolean;
      urgentEmailAlert: boolean;
      customerResponseAlert: boolean;
    };
    autoResponseRules: Array<{
      trigger: string; // E-Mail-Typ der Rule triggert
      template: string;
      enabled: boolean;
    }>;
  };
  
  // Aggregierte Kommunikations-Daten (Performance-Optimierung)
  communicationSummary?: {
    totalEmails: number;
    unreadEmails: number;
    pendingApprovals: number;
    lastActivity?: Timestamp;
    mostActiveContact?: {
      email: string;
      name?: string;
    };
    avgResponseTime?: number; // in Stunden
  };
}

export type ProjectStatus = 
  | 'active'
  | 'on_hold' 
  | 'completed'
  | 'cancelled';

export interface ProjectFilters {
  status?: ProjectStatus;
  currentStage?: PipelineStage;
  customerId?: string;
  monitoringStatus?: 'not_started' | 'active' | 'completed' | 'paused';
}

// ========================================
// PLAN 5/9: MONITORING-IMPLEMENTIERUNG
// ========================================

// Erweiterte Project Interface für Monitoring
export interface ProjectWithMonitoring extends Project {
  // Monitoring-Phase Konfiguration
  monitoringConfig?: {
    isEnabled: boolean;
    monitoringPeriod: 30 | 90 | 365; // Tage
    autoTransition: boolean;
    providers: MonitoringProvider[];
    alertThresholds: {
      minReach: number;
      sentimentAlert: number; // -1 bis 1, bei unterschreitung Alert
      competitorMentions: number;
    };
    reportSchedule: 'daily' | 'weekly' | 'monthly';
  };
  
  // Analytics Daten
  analytics?: ProjectAnalytics;
  
  // Monitoring Status
  monitoringStatus?: 'not_started' | 'active' | 'completed' | 'paused';
  monitoringStartedAt?: Timestamp;
  monitoringCompletedAt?: Timestamp;
}

export interface ProjectAnalytics {
  projectId: string;
  organizationId: string;
  
  // Core-KPIs
  totalReach: number;
  mediaValue: number; // Berechneter Medienwert in EUR
  clippingCount: number;
  sentimentScore: number; // -1 bis 1
  
  // Outlet-Analyse
  topOutlets: MediaOutlet[];
  
  // Timeline-Daten
  timelineData: AnalyticsTimeline[];
  
  // Wettbewerbs-Benchmarks (optional)
  competitorBenchmarks?: BenchmarkData;
  
  // Performance Metriken
  shareOfVoice?: number; // 0-100 Prozent
  earnedMediaValue?: number; // Berechneter EMV
  engagementRate?: number; // Social Media Engagement
  messagePullThrough?: number; // Wie oft Key-Messages erwähnt wurden (0-100)
  
  // Zeitstempel
  lastUpdated: Timestamp;
  dataCollectionStarted: Timestamp;
  dataCollectionEnded?: Timestamp;
}

export interface AnalyticsTimeline {
  date: Timestamp;
  dailyReach: number;
  dailyClippings: number;
  dailySentiment: number; // Durchschnitt für den Tag
  cumulativeReach: number;
  cumulativeMediaValue: number;
}

export interface MediaOutlet {
  name: string;
  clippingCount: number;
  totalReach: number;
  averageSentiment: number;
  mediaValue: number;
  tier: 'tier1' | 'tier2' | 'tier3' | 'niche';
  
  // Outlet-Details
  type?: 'print' | 'online' | 'tv' | 'radio' | 'podcast' | 'social';
  country?: string;
  language?: string;
}

export interface BenchmarkData {
  industryAverage?: {
    reachPerCampaign: number;
    sentimentScore: number;
    clippingsPerCampaign: number;
    mediaValuePerCampaign: number;
  };
  
  competitorData?: Array<{
    competitorName?: string; // Optional anonymisiert
    reach: number;
    sentiment: number;
    clippings: number;
    mediaValue: number;
    period: { from: Timestamp; to: Timestamp };
  }>;
  
  historicalComparison?: {
    previousCampaigns: Array<{
      campaignId?: string;
      campaignName?: string;
      reach: number;
      sentiment: number;
      clippings: number;
      mediaValue: number;
      period: { from: Timestamp; to: Timestamp };
    }>;
  };
}

export interface MonitoringProvider {
  name: 'landau' | 'pmg' | 'custom';
  apiEndpoint: string;
  isEnabled: boolean;
  lastSync?: Timestamp;
  supportedMetrics: Array<'reach' | 'sentiment' | 'mentions' | 'social'>;
  
  // Authentifizierung
  auth?: {
    type: 'api_key' | 'oauth' | 'basic';
    credentials?: Record<string, string>; // Encrypted storage
  };
  
  // Rate Limiting
  rateLimits?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

// Analytics Dashboard Konfiguration
export interface AnalyticsDashboard {
  projectId: string;
  organizationId: string;
  
  // Dashboard-Layout
  layout: {
    widgets: Array<{
      id: string;
      type: 'kpi_card' | 'timeline_chart' | 'outlet_ranking' | 'sentiment_distribution' | 'competitor_comparison';
      position: { x: number; y: number; w: number; h: number };
      config?: Record<string, any>;
    }>;
  };
  
  // Filter-Einstellungen
  defaultFilters: {
    dateRange: { from: Timestamp; to: Timestamp };
    outlets?: string[];
    sentimentRange?: { min: number; max: number };
    mediaTypes?: Array<'print' | 'online' | 'tv' | 'radio' | 'social'>;
  };
  
  // Export-Konfiguration
  exportConfig: {
    formats: Array<'pdf' | 'excel' | 'powerpoint'>;
    includeCharts: boolean;
    includeClippings: boolean;
    branding: {
      logo?: string;
      colors?: { primary: string; secondary: string };
      companyName?: string;
    };
  };
  
  // Automatische Reports
  scheduledReports?: Array<{
    id: string;
    name: string;
    schedule: 'daily' | 'weekly' | 'monthly';
    recipients: string[]; // E-Mail-Adressen
    format: 'pdf' | 'excel';
    lastSent?: Timestamp;
    isActive: boolean;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// PLAN 6/9: MEDIA-ASSETS-INTEGRATION
// ========================================

// Project Asset Validation für Asset-Management
export interface ProjectAssetValidation {
  projectId: string;
  totalAssets: number;
  validAssets: number;
  missingAssets: number;
  outdatedAssets: number;
  validationDetails: Array<{
    campaignId: string;
    campaignTitle: string;
    assetIssues: any; // AssetValidationResult from pr.ts
  }>;
}
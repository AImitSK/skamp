// src/types/media.ts - ERWEITERT für Kampagnen-Integration
import { Timestamp } from 'firebase/firestore';

export interface MediaAsset {
  id?: string;
  userId: string;
  fileName: string;
  fileType?: string; // z.B. 'image/jpeg', 'video/mp4'
  storagePath?: string; // Pfad in Firebase Storage (optional für Celero-Docs)
  downloadUrl: string; // Öffentliche URL der Datei
  contentRef?: string; // Firestore-Referenz für Celero-Docs (document_contents)
  description?: string;
  tags?: string[];
  folderId?: string; // Ordner-Zuordnung
  clientId?: string; // Kunden-Zuordnung

  // NEU: Erweiterte Metadaten (Vorbereitung für Phase 2)
  metadata?: {
    // Technische Daten
    fileSize?: number;
    dimensions?: { width: number; height: number };
    duration?: number; // Für Videos in Sekunden

    // Rechtliche Daten
    copyright?: {
      owner: string;
      year: number;
      license: 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'CC-BY-NC' | 'Copyright' | 'Custom';
      customTerms?: string;
    };

    // Urheber
    author?: {
      name: string;
      email?: string;
      company?: string;
    };

    // Nutzungsrechte
    usage?: {
      allowedUses: ('print' | 'digital' | 'social' | 'broadcast' | 'internal')[];
      geography?: string[]; // ['DE', 'AT', 'CH', 'WORLDWIDE']
      validFrom?: Timestamp;
      validUntil?: Timestamp;
      requiresCredit: boolean;
      creditText?: string;
    };
  };

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MediaFolder {
  id?: string;
  userId: string;
  organizationId: string; // Multi-Tenancy Support
  name: string;
  parentFolderId?: string; // Für Unterordner
  clientId?: string; // Optional: Kunde zugeordnet
  color?: string; // Ordner-Farbe für visuelle Unterscheidung
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ERWEITERT: Neuer 'campaign' Typ hinzugefügt
export type ShareLinkType = 'file' | 'folder' | 'campaign';

// ERWEITERT: Share-Link für Multi-Asset und Kampagnen-Support
export interface ShareLink {
  id?: string;
  userId: string; // Wer hat den Link erstellt
  shareId: string; // Öffentliche UUID für URL
  type: ShareLinkType; // Verwendet den erweiterten Typ
  targetId: string; // ID des Ordners oder der Datei

  // NEU: Arrays für Campaign-Medien
  assetIds?: string[]; // Asset-IDs für Kampagnen-Medien
  folderIds?: string[]; // Folder-IDs für Kampagnen-Medien

  title: string; // Titel für die Share-Seite
  description?: string; // Beschreibung für die Share-Seite
  active: boolean; // Link an/aus (vorher: isActive)
  accessCount: number; // Wie oft aufgerufen
  lastAccessedAt?: Timestamp;

  // NEU: Kampagnen-Kontext (aus bestehendem Dokument übernommen)
  context?: {
    type: 'pr_campaign' | 'direct_share';
    campaignId?: string;
    campaignTitle?: string;
    senderName?: string;
    senderCompany?: string;
  };

  settings: {
    expiresAt: Date | null;
    downloadAllowed: boolean;
    passwordRequired?: string | null; // Server-Side: bcrypt Hash (nicht an Client senden!)
    requirePassword?: boolean; // Client-Side: Boolean Flag ob Passwort erforderlich
    watermarkEnabled: boolean;
    showFileList?: boolean; // Bei Ordnern: Dateiliste anzeigen
    maxDownloads?: number; // Maximale Downloads pro Asset
    requireEmail?: boolean; // E-Mail vor Download erforderlich
    trackingEnabled?: boolean; // Detailliertes Tracking
  };

  // NEU: Tracking-Daten (aus bestehendem Dokument übernommen)
  analytics?: {
    uniqueVisitors: number;
    totalDownloads: number;
    assetDownloads: Map<string, number>; // Asset-ID -> Download-Count
    lastAccessDetails?: {
      timestamp: Timestamp;
      ipAddress?: string;
      userAgent?: string;
      email?: string; // Falls E-Mail erforderlich war
    };
  };

  createdAt?: Timestamp;
  updatedAt?: Timestamp; // Hinzugefügt für Konsistenz
}

// Die mediaService.createShareLink Funktion muss diese neuen optionalen Felder akzeptieren:
export interface CreateShareLinkData {
  targetId: string;
  type: ShareLinkType;
  title: string;
  description?: string;
  settings: {
    expiresAt: Date | null;
    downloadAllowed: boolean;
    passwordRequired: string | null;
    watermarkEnabled: boolean;
  };
  assetIds?: string[]; // NEU
  folderIds?: string[]; // NEU
  userId: string;
}

// Breadcrumb für Navigation
export interface FolderBreadcrumb {
  id: string;
  name: string;
  parentFolderId?: string;
}

// Filter für erweiterte Suche
export interface MediaFilter {
  fileType?: string;
  folderId?: string;
  clientId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

// NEU: Asset-Collection für PR-Kampagnen
export interface AssetCollection {
  id?: string;
  name: string;
  description?: string;
  clientId: string;
  assetIds: string[];
  folderIds: string[];
  metadata?: {
    totalSize: number;
    assetCount: number;
    lastModified: Timestamp;
  };
  createdAt?: Timestamp;
  createdBy: string;
}

// NEU: Asset-Package (vordefinierte Asset-Gruppen)
export interface AssetPackage {
  id?: string;
  name: string; // z.B. "Logo-Paket", "Produkt-Launch-Kit"
  description: string;
  clientId: string;
  userId: string;

  contents: {
    assets: string[]; // Asset-IDs
    folders: string[]; // Folder-IDs

    // Strukturierte Organisation
    categories?: {
      [key: string]: string[]; // z.B. 'logos': ['assetId1', 'assetId2']
    };
  };

  // Automatische Updates
  rules?: {
    autoInclude?: {
      tags?: string[];
      fileTypes?: string[];
      folderIds?: string[];
      namePatterns?: string[]; // RegEx patterns
    };
    autoExclude?: {
      olderThan?: number; // Tage
      tags?: string[];
    };
  };

  // Nutzungs-Statistiken
  usage?: {
    lastUsed?: Timestamp;
    useCount: number;
    inCampaigns: string[]; // Campaign-IDs
  };

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ========================================
// PLAN 5/9: MONITORING-IMPLEMENTIERUNG
// ========================================

// Erweiterte MediaAsset für Clipping-System
export interface ClippingAsset extends MediaAsset {
  type: 'clipping';
  outlet: string;
  publishDate: Timestamp;
  reachValue: number;
  sentimentScore: number;
  url?: string;
  
  // Pipeline-spezifische Felder
  projectId?: string;
  campaignId?: string;
  distributionId?: string;
  monitoringPhaseId?: string;
}

export interface MonitoringData {
  clippings: MediaClipping[];
  mentions: SocialMention[];
  reachData: ReachMetrics;
  sentimentAnalysis: SentimentData;
}

export interface MediaClipping {
  id: string;
  title: string;
  outlet: string;
  publishDate: Timestamp;
  url?: string;
  screenshot?: string;
  content?: string;
  reachValue: number;
  sentimentScore: number;
  mediaValue: number;
  tags: string[];
  
  // Multi-Tenancy
  organizationId: string;
  createdBy: string;
  
  // Pipeline-Kontext
  projectId?: string;
  campaignId?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SocialMention {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'other';
  author: string;
  content: string;
  url: string;
  publishDate: Timestamp;
  
  // Metriken
  likes?: number;
  shares?: number;
  comments?: number;
  reach?: number;
  sentimentScore: number;
  
  // Kontext
  organizationId: string;
  projectId?: string;
  
  createdAt: Timestamp;
}

export interface ReachMetrics {
  totalReach: number;
  printReach: number;
  onlineReach: number;
  socialReach: number;
  broadcastReach: number;
  
  // Zeitverteilung
  dailyReach: { date: string; reach: number }[];
  weeklyReach: { week: string; reach: number }[];
  monthlyReach: { month: string; reach: number }[];
}

export interface SentimentData {
  averageScore: number; // -1 bis 1
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  
  // Sentiment über Zeit
  timeline: {
    date: string;
    score: number;
    count: number;
  }[];
}

export interface ClippingMetrics {
  reachValue: number;
  sentimentScore: number;
  mediaValue: number;
  engagementScore?: number;
  
  // Berechnete Felder
  costPerReach?: number;
  earnedMediaValue?: number;
}

// Neue Share Link Typen für Monitoring
export type MonitoringShareLinkType = ShareLinkType | 'monitoring_report' | 'clipping_package';

export interface MonitoringShareLink extends Omit<ShareLink, 'type'> {
  type: MonitoringShareLinkType;
  
  // Monitoring-spezifische Felder
  reportData?: {
    projectId: string;
    reportType: 'summary' | 'detailed' | 'timeline' | 'clippings_only';
    includeCharts: boolean;
    includeClippings: boolean;
    timeRange: {
      from: Timestamp;
      to: Timestamp;
    };
  };
}
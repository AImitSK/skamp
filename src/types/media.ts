// src/types/media.ts - ERWEITERT für Kampagnen-Integration
import { Timestamp } from 'firebase/firestore';

export interface MediaAsset {
  id?: string;
  userId: string;
  fileName: string;
  fileType: string; // z.B. 'image/jpeg', 'video/mp4'
  storagePath: string; // Pfad in Firebase Storage
  downloadUrl: string; // Öffentliche URL der Datei
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
  name: string;
  parentFolderId?: string; // Für Unterordner
  clientId?: string; // Optional: Kunde zugeordnet
  color?: string; // Ordner-Farbe für visuelle Unterscheidung
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ERWEITERT: Share-Link für Multi-Asset und Kampagnen-Support
export interface ShareLink {
  id?: string;
  userId: string; // Wer hat den Link erstellt
  shareId: string; // Öffentliche UUID für URL
  type: 'folder' | 'file' | 'collection'; // NEU: 'collection' für mehrere Assets
  targetId: string; // ID des Ordners oder der Datei
  
  // NEU: Multi-Asset Support
  targetIds?: string[]; // Mehrere Assets/Ordner für 'collection' type
  assetCount?: number;
  
  title: string; // Titel für die Share-Seite
  description?: string; // Beschreibung für die Share-Seite
  isActive: boolean; // Link an/aus
  accessCount: number; // Wie oft aufgerufen
  
  // NEU: Kampagnen-Kontext
  context?: {
    type: 'pr_campaign' | 'direct_share';
    campaignId?: string;
    campaignTitle?: string;
    senderName?: string;
    senderCompany?: string;
  };
  
  settings: {
    passwordRequired?: string; // Optional: Passwort
    expiresAt?: Timestamp; // Optional: Ablaufdatum
    downloadAllowed: boolean; // Download erlauben
    showFileList?: boolean; // Bei Ordnern: Dateiliste anzeigen
    
    // NEU: Erweiterte Einstellungen
    watermarkEnabled?: boolean;
    maxDownloads?: number; // Maximale Downloads pro Asset
    requireEmail?: boolean; // E-Mail vor Download erforderlich
    trackingEnabled?: boolean; // Detailliertes Tracking
  };
  
  // NEU: Tracking-Daten
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
  lastAccessedAt?: Timestamp;
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
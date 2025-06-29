// src/types/pr.ts - ERWEITERT mit Asset-Integration
import { Timestamp } from 'firebase/firestore';

// Definiert den Zustand einer Kampagne
export type PRCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'archived';

// NEU: Asset-Attachment Type
export interface CampaignAssetAttachment {
  id: string;
  type: 'asset' | 'folder';
  assetId?: string;
  folderId?: string;
  
  // Snapshot der Metadaten zum Zeitpunkt der Zuordnung
  metadata: {
    fileName?: string;
    folderName?: string;
    fileType?: string;
    description?: string;
    thumbnailUrl?: string; // Für Vorschau
    
    // Zukünftige Metadaten-Erweiterungen (vorbereitet)
    copyright?: string;
    author?: string;
    license?: string;
    expiryDate?: Date;
    usage?: {
      allowPrint?: boolean;
      allowDigital?: boolean;
      allowSocial?: boolean;
      restrictions?: string;
    };
  };
  
  // Tracking
  attachedAt: Timestamp;
  attachedBy: string;
}

// Die Hauptdatenstruktur für eine PR-Kampagne - ERWEITERT
export interface PRCampaign {
  id?: string;
  userId: string;
  
  // Inhaltliche Daten
  title: string;          // Titel der Kampagne / Betreffzeile
  contentHtml: string;    // Der Inhalt aus dem Rich-Text-Editor
  
  // NEU: Kunden-Zuordnung (wird Pflichtfeld)
  clientId?: string;      // Optional für Rückwärtskompatibilität
  clientName?: string;    // Denormalisiert für Performance
  
  // Status und Planung
  status: PRCampaignStatus;
  
  // Empfänger-Informationen (denormalisiert für einfachen Zugriff)
  distributionListId: string;
  distributionListName: string;
  recipientCount: number;
  
  // NEU: Angehängte Medien
  attachedAssets?: CampaignAssetAttachment[];
  
  // NEU: Generierter Share-Link für alle Assets
  assetShareLinkId?: string;
  assetShareUrl?: string;
  
  // Zeitstempel
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  scheduledAt?: Timestamp | null; // Für geplanten Versand
  sentAt?: Timestamp | null;      // Wann wurde sie tatsächlich versendet
  
  // NEU: Versand-Einstellungen für Assets
  assetSettings?: {
    allowDownload: boolean;
    passwordProtected: boolean;
    password?: string;
    expiresAt?: Timestamp;
    watermark?: boolean;
  };
}

// NEU: Interface für Asset-Selection im UI
export interface AssetSelectionState {
  selectedAssets: Map<string, CampaignAssetAttachment>;
  selectedFolders: Map<string, CampaignAssetAttachment>;
  isLoading: boolean;
  error?: string;
}

// NEU: Filter-Optionen für Asset-Auswahl
export interface AssetFilterOptions {
  fileTypes?: string[];
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  onlyWithMetadata?: boolean;
}
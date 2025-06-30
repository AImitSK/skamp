// src/types/pr.ts - VOLLSTÄNDIG mit Multi-List Support
import { Timestamp } from 'firebase/firestore';

export type PRCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'archived';

export interface PRCampaign {
  id?: string;
  userId: string;
  
  // Campaign Details
  title: string;
  contentHtml: string;
  status: PRCampaignStatus;
  
  // Distribution Lists - ERWEITERT für Multi-List Support
  distributionListId: string;        // Legacy: Einzelne Liste (für Rückwärtskompatibilität)
  distributionListName: string;      // Legacy: Name der einzelnen Liste
  distributionListIds?: string[];    // NEU: Array von Listen-IDs
  distributionListNames?: string[];  // NEU: Array von Listen-Namen
  recipientCount: number;
  
  // Customer
  clientId?: string;
  clientName?: string;
  
  // Attached Media
  attachedAssets?: CampaignAssetAttachment[];
  assetShareLinkId?: string;
  assetShareUrl?: string;
  assetSettings?: {
    allowDownload?: boolean;
    watermark?: boolean;
    expiresAt?: Timestamp;
    password?: string;
  };
  
  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  scheduledAt?: Timestamp | null;
  sentAt?: Timestamp | null;
  
  // AI Metadata
  aiGenerated?: boolean;
  aiMetadata?: {
    generatedBy: string;
    timestamp: string;
    context?: any;
  };
}

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
    thumbnailUrl?: string;
    
    // Zukünftige Metadaten-Erweiterungen
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

export interface PRQuote {
  person: string;
  role: string;
  company: string;
  text: string;
}
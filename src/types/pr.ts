// src/types/pr.ts - VOLLSTÄNDIG mit Multi-List Support, Freigabe-Workflow, Boilerplate-Integration und Multi-Tenancy
import { Timestamp } from 'firebase/firestore';

// ERWEITERT: Neue Status für den Freigabe-Workflow hinzugefügt
export type PRCampaignStatus =
  | 'draft'
  | 'in_review'         // NEU: Warten auf Kunden-Feedback
  | 'changes_requested' // NEU: Kunde wünscht Änderungen
  | 'approved'          // NEU: Vom Kunden freigegeben
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'archived';

// NEU: Eigene Struktur für die Daten des Freigabeprozesses
export interface ApprovalData {
  shareId: string;       // Eindeutige, öffentliche ID für den Freigabe-Link
  status: 'pending' | 'viewed' | 'commented' | 'approved';
  feedbackHistory: Array<{
    comment: string;
    requestedAt: Timestamp;
    author: string; // z.B. "Kunde"
  }>;
  approvedAt?: Timestamp;
}

// AKTUALISIERT: Struktur für Boilerplate-Sections in Kampagnen
export interface CampaignBoilerplateSection {
  id: string;
  type?: 'boilerplate' | 'lead' | 'main' | 'quote'; // NEU: type für strukturierte Elemente
  boilerplateId?: string; // JETZT OPTIONAL für strukturierte Elemente
  position: 'header' | 'footer' | 'custom';
  order: number;
  isLocked: boolean;
  isCollapsed?: boolean; // NEU: optional
  customTitle?: string;
  content?: string; // NEU: Für strukturierte Inhalte
  metadata?: { // NEU: Für Zitat-Metadaten
    person?: string;
    role?: string;
    company?: string;
  };
}

export interface PRCampaign {
  id?: string;
  userId: string;
  organizationId?: string; // NEU: Für Multi-Tenancy (optional für Backwards Compatibility)
  
  // Campaign Details
  title: string;
  contentHtml: string; // Der finale, zusammengesetzte HTML-Content
  status: PRCampaignStatus;
  
  // NEU: Structured Content Fields für intelligente Boilerplate-Integration
  mainContent?: string; // Der reine Hauptinhalt ohne Boilerplates (nur der individuelle Teil)
  boilerplateSections?: CampaignBoilerplateSection[]; // Die strukturierten Boilerplate-Sections
  
  // Distribution Lists - ERWEITERT für Multi-List Support
  distributionListId: string;       // Legacy: Einzelne Liste (für Rückwärtskompatibilität)
  distributionListName: string;     // Legacy: Name der einzelnen Liste
  distributionListIds?: string[];   // NEU: Array von Listen-IDs
  distributionListNames?: string[]; // NEU: Array von Listen-Namen
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

  // --- NEUE FELDER FÜR DEN FREIGABE-WORKFLOW ---
  approvalRequired: boolean;
  approvalData?: ApprovalData;
  // --- ENDE DER NEUEN FELDER ---

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

// NEU: Für die Migration - Helper Type mit required organizationId
export interface PRCampaignWithOrg extends PRCampaign {
  organizationId: string; // Required in multi-tenant context
}

// NEU: Helper function für Type Guards
export function hasCampaignOrganization(campaign: PRCampaign): campaign is PRCampaignWithOrg {
  return !!campaign.organizationId;
}

// NEU: Default-Werte für neue Kampagnen
export function createDefaultPRCampaign(userId: string, organizationId?: string): Partial<PRCampaign> {
  return {
    userId,
    organizationId: organizationId || userId, // Fallback für Single-User
    status: 'draft',
    title: '',
    contentHtml: '',
    distributionListId: '',
    distributionListName: '',
    distributionListIds: [],
    distributionListNames: [],
    recipientCount: 0,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
}
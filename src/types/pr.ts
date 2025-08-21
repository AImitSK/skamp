// src/types/pr.ts - VOLLSTÄNDIG mit Multi-List Support, Freigabe-Workflow, Boilerplate-Integration und Multi-Tenancy
import { Timestamp } from 'firebase/firestore';
import type { EnhancedApprovalData } from './approvals-enhanced';

// ERWEITERT: Neue Status für den Freigabe-Workflow hinzugefügt
export type PRCampaignStatus =
  | 'draft'
  | 'generating_preview' // NEU: Temporärer Status während PDF-Vorschau-Generierung
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

// 🆕 EDIT-LOCK SYSTEM TYPES
export type EditLockReason = 
  | 'pending_customer_approval'    // Kunde prüft
  | 'approved_final'              // Final freigegeben
  | 'system_processing'           // System verarbeitet
  | 'manual_lock';               // Manuell gesperrt

export interface UnlockRequest {
  id: string;
  requestedBy: string;
  requestedAt: Timestamp;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Timestamp;
}

export interface EditLockData {
  isLocked: boolean;
  reason?: EditLockReason;
  lockedAt?: Timestamp;
  unlockedAt?: Timestamp;
  lockedBy?: {
    userId: string;
    displayName: string;
    action: string; // z.B. "Freigabe angefordert"
  };
  unlockRequests?: UnlockRequest[];
  canRequestUnlock?: boolean;
}

// 🆕 EDIT-LOCK CONFIG für UI-Komponenten
export interface EditLockConfig {
  label: string;
  description: string;
  color: 'yellow' | 'blue' | 'green' | 'red' | 'gray';
  icon: string; // Icon-Name für Heroicons
  canRequestUnlock: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const EDIT_LOCK_CONFIG: Record<EditLockReason, EditLockConfig> = {
  pending_customer_approval: {
    label: 'Kunde prüft',
    description: 'Diese Kampagne wartet auf Kunden-Freigabe',
    color: 'yellow',
    icon: 'ClockIcon',
    canRequestUnlock: true,
    severity: 'medium'
  },
  approved_final: {
    label: 'Freigegeben',
    description: 'Diese Kampagne ist final freigegeben',
    color: 'green',
    icon: 'CheckCircleIcon',
    canRequestUnlock: true,
    severity: 'high'
  },
  system_processing: {
    label: 'System verarbeitet',
    description: 'Das System verarbeitet diese Kampagne',
    color: 'gray',
    icon: 'CogIcon',
    canRequestUnlock: false,
    severity: 'medium'
  },
  manual_lock: {
    label: 'Manuell gesperrt',
    description: 'Diese Kampagne wurde manuell gesperrt',
    color: 'red',
    icon: 'LockClosedIcon',
    canRequestUnlock: true,
    severity: 'high'
  }
};

// Key Visual Daten für Hero-Bilder
export interface KeyVisualData {
  assetId?: string;  // Optional: Referenz zur Media Library
  url: string;       // Download URL des gecroppten Bildes
  cropData?: {       // Optional: Crop-Koordinaten für spätere Bearbeitung
    x: number;
    y: number;
    width: number;
    height: number;
    unit: string;
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
  
  // Key Visual (Hero Image)
  keyVisual?: KeyVisualData;
  
  // Attached Media
  attachedAssets?: CampaignAssetAttachment[];
  
  // SEO & Content Analytics
  keywords?: string[];
  seoMetrics?: {
    score?: number;
    lastAnalyzed?: Timestamp;
    keywordMetrics?: Array<{
      keyword: string;
      density: number;
      occurrences: number;
      inHeadline: boolean;
      inFirstParagraph: boolean;
      distribution: 'gut' | 'mittel' | 'schlecht';
      semanticRelevance?: number;
      contextQuality?: number;
      targetAudience?: string;
      tonality?: string;
    }>;
    prMetrics?: {
      headlineLength: number;
      wordCount: number;
      readabilityScore: number;
      avgParagraphLength: number;
      hasQuotes: boolean;
      hasNumbers: boolean;
    };
  };
  
  // Manual Recipients (zusätzlich zu Listen)
  manualRecipients?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
    isValid: boolean;
    validationError?: string;
  }>;
  assetShareLinkId?: string;
  assetShareUrl?: string;
  assetSettings?: {
    allowDownload?: boolean;
    watermark?: boolean;
    expiresAt?: Timestamp;
    password?: string;
  };

  // --- FREIGABE-WORKFLOW FELDER ---
  approvalRequired: boolean;
  approvalData?: ApprovalData | EnhancedApprovalData; // Legacy + Enhanced Support
  // --- ENDE DER FREIGABE-FELDER ---

  // 🆕 ENHANCED EDIT-LOCK SYSTEM
  editLocked?: boolean;
  editLockedReason?: EditLockReason;
  lockedAt?: Timestamp;
  unlockedAt?: Timestamp;
  lockedBy?: {
    userId: string;
    displayName: string;
    action: string;
  };
  unlockRequests?: UnlockRequest[];
  lastUnlockedBy?: {
    userId: string;
    displayName: string;
    reason: string;
  };
  lockMetadata?: Record<string, any>; // Für zusätzliche Lock-Informationen
  
  // 🆕 PDF-VERSIONIERUNG INTEGRATION
  currentPdfVersion?: string; // ID der aktiven PDF-Version
  lastPdfGeneratedAt?: Timestamp;

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

// 🆕 PDF-VERSIONIERUNG TYPES
export interface PDFVersion {
  id?: string;
  campaignId: string;
  organizationId: string;
  version: number;
  createdAt: Timestamp;
  createdBy: string;
  
  // Status-Management
  status: 'draft' | 'pending_customer' | 'approved' | 'rejected';
  approvalId?: string;
  workflowId?: string;
  
  // Kunden-Freigabe Integration
  customerApproval?: {
    shareId: string;
    customerContact?: string;
    requestedAt?: Timestamp;
    approvedAt?: Timestamp;
  };
  
  // File-Information
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  
  // Content-Snapshot für Audit-Trail
  contentSnapshot: {
    title: string;
    mainContent: string;
    boilerplateSections: any[];
    keyVisual?: any;
    createdForApproval?: boolean;
  };
  
  // Metadaten
  metadata?: {
    wordCount: number;
    pageCount: number;
    generationTimeMs: number;
  };
}

// 🆕 CAMPAIGN-EDITOR ENHANCEMENT TYPES
export interface CampaignEditContext {
  isNewCampaign: boolean;
  currentStep: number;
  allowEditing: boolean;
  editLockStatus: EditLockData;
  hasUnsavedChanges: boolean;
  lastSavedAt?: Timestamp;
}

export interface CampaignFormValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
  canSave: boolean;
}

// 🆕 SERVICE-INTEGRATION TYPES
export interface ServiceCallMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

export interface CampaignServiceResult {
  success: boolean;
  campaignId?: string;
  workflowId?: string;
  pdfVersionId?: string;
  shareableLinks?: {
    team?: string;
    customer?: string;
  };
  metrics?: ServiceCallMetrics[];
  warnings?: string[];
}

// 🆕 UTILITY-FUNKTIONEN für Edit-Lock System
export const EditLockUtils = {
  /**
   * Prüft ob Edit-Lock aktiv und User berechtigt ist
   */
  canUserEdit(campaign: PRCampaign, userId: string): boolean {
    if (!campaign.editLocked) return true;
    
    // System-User kann immer bearbeiten
    if (userId === 'system') return true;
    
    // Der User der den Lock gesetzt hat kann unter Umständen bearbeiten
    if (campaign.lockedBy?.userId === userId && 
        campaign.editLockedReason === 'manual_lock') {
      return true;
    }
    
    return false;
  },

  /**
   * Bestimmt ob Unlock-Request möglich ist
   */
  canRequestUnlock(campaign: PRCampaign, userId: string): boolean {
    if (!campaign.editLocked || !campaign.editLockedReason) return false;
    
    const config = EDIT_LOCK_CONFIG[campaign.editLockedReason];
    if (!config?.canRequestUnlock) return false;
    
    // Prüfe ob bereits pending Request vorhanden
    const hasPendingRequest = campaign.unlockRequests?.some(
      req => req.requestedBy === userId && req.status === 'pending'
    );
    
    return !hasPendingRequest;
  },

  /**
   * Formatiert Edit-Lock Status für UI-Anzeige
   */
  formatLockStatus(campaign: PRCampaign): {
    isLocked: boolean;
    displayText: string;
    color: string;
    canEdit: boolean;
  } {
    if (!campaign.editLocked || !campaign.editLockedReason) {
      return {
        isLocked: false,
        displayText: 'Bearbeitbar',
        color: 'green',
        canEdit: true
      };
    }
    
    const config = EDIT_LOCK_CONFIG[campaign.editLockedReason];
    return {
      isLocked: true,
      displayText: config.label,
      color: config.color,
      canEdit: false
    };
  },

  /**
   * Extrahiert Performance-relevante Metriken
   */
  getPerformanceMetrics(operations: ServiceCallMetrics[]): {
    totalTime: number;
    slowestOperation: string;
    averageTime: number;
    operationCount: number;
  } {
    const completedOps = operations.filter(op => op.duration !== undefined);
    
    if (completedOps.length === 0) {
      return {
        totalTime: 0,
        slowestOperation: 'none',
        averageTime: 0,
        operationCount: 0
      };
    }
    
    const totalTime = completedOps.reduce((sum, op) => sum + (op.duration || 0), 0);
    const slowest = completedOps.reduce((prev, curr) => 
      (curr.duration || 0) > (prev.duration || 0) ? curr : prev
    );
    
    return {
      totalTime,
      slowestOperation: slowest.operationName,
      averageTime: totalTime / completedOps.length,
      operationCount: completedOps.length
    };
  }
};

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
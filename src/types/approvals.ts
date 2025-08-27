// src/types/approvals.ts
import { Timestamp } from 'firebase/firestore';
import { BaseEntity } from './international';

// ========================================
// Approval Enhanced mit Multi-Tenancy
// ========================================

export interface ApprovalEnhanced extends BaseEntity {
  // Basis-Informationen
  title: string;
  description?: string;
  
  // Verknüpfungen
  campaignId: string; // PR-Kampagne ID
  campaignTitle: string; // Denormalisiert für Performance
  
  // Client/Kunde Information
  clientId?: string; // Company ID des Kunden
  clientName: string; // Denormalisiert
  clientEmail?: string; // Primäre E-Mail für Benachrichtigungen
  
  // Freigabe-Empfänger (kann mehrere geben)
  recipients: ApprovalRecipient[];
  
  // Content zur Freigabe
  content: {
    html: string; // Der HTML-Inhalt
    plainText?: string; // Plain-Text Version
    subject?: string; // Betreff (falls E-Mail)
  };
  
  // Angehängte Medien
  attachedAssets?: {
    assetId: string;
    type: 'file' | 'folder';
    name: string;
    url?: string;
    metadata?: Record<string, any>;
  }[];
  
  // Status & Workflow
  status: ApprovalStatus;
  workflow: ApprovalWorkflow;
  
  // Freigabe-Optionen
  options: {
    requireAllApprovals: boolean; // Alle müssen freigeben
    allowPartialApproval: boolean; // Teilfreigaben erlaubt
    autoSendAfterApproval: boolean; // Automatisch senden nach Freigabe
    expiresAt?: Timestamp; // Ablaufdatum
    reminderSchedule?: ReminderSchedule;
    allowComments: boolean;
    allowInlineComments: boolean;
  };
  
  // Öffentlicher Zugriff
  shareId: string; // Eindeutige ID für öffentlichen Link
  shareSettings: {
    requirePassword: boolean;
    password?: string; // Gehashed
    requireEmailVerification: boolean;
    allowedDomains?: string[]; // E-Mail-Domains die zugreifen dürfen
    accessLog: boolean; // Zugriffe protokollieren
  };
  
  // Freigabe-Historie
  history: ApprovalHistoryEntry[];
  
  // Analytics
  analytics: {
    firstViewedAt?: Timestamp;
    lastViewedAt?: Timestamp;
    totalViews: number;
    uniqueViews: number;
    deviceTypes?: Record<string, number>; // desktop: 5, mobile: 3
    locations?: Record<string, number>; // DE: 8, AT: 2
  };
  
  // Zeitstempel
  requestedAt: Timestamp;
  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  completedAt?: Timestamp;
  
  // Benachrichtigungen
  notifications: {
    requested: NotificationStatus;
    reminded?: NotificationStatus[];
    statusChanged?: NotificationStatus[];
    completed?: NotificationStatus;
  };
  
  // Metadaten
  metadata?: {
    templateId?: string; // Falls aus Template erstellt
    language?: string;
    timezone?: string;
    customFields?: Record<string, any>;
  };
  
  // Versionierung
  version: number;
  previousVersionId?: string;
  
  // Tags & Kategorisierung
  tags?: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Feedback History für Legacy-Kompatibilität
  feedbackHistory?: Array<{
    comment?: string;
    requestedAt: any;
    author?: string;
  }>;
}

// ========================================
// Approval Recipient (Freigabe-Empfänger)
// ========================================

export interface ApprovalRecipient {
  id: string;
  email: string;
  name: string;
  role: 'approver' | 'reviewer' | 'observer';
  
  // Status pro Empfänger
  status: 'pending' | 'viewed' | 'approved' | 'rejected' | 'commented';
  
  // Aktionen
  viewedAt?: Timestamp;
  decidedAt?: Timestamp;
  decision?: 'approved' | 'rejected';
  comment?: string;
  
  // Zusätzliche Optionen
  isRequired: boolean; // Muss dieser Empfänger freigeben?
  order?: number; // Reihenfolge bei sequenzieller Freigabe
  notificationsSent: number;
  lastNotificationAt?: Timestamp;
}

// ========================================
// Approval History Entry
// ========================================

export interface ApprovalHistoryEntry {
  id: string;
  timestamp: Timestamp;
  action: ApprovalAction;
  userId?: string; // Bei internen Aktionen
  recipientId?: string; // Bei Empfänger-Aktionen
  actorName: string;
  actorEmail?: string;
  
  // Details zur Aktion
  details: {
    previousStatus?: ApprovalStatus;
    newStatus?: ApprovalStatus;
    comment?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  };
  
  // Inline-Kommentare (falls vorhanden)
  inlineComments?: {
    id: string;
    text: string;
    position: { start: number; end: number };
    quote: string;
  }[];
}

// ========================================
// Helper Types
// ========================================

export type ApprovalStatus = 
  | 'draft'           // Entwurf
  | 'pending'         // Warte auf Freigabe
  | 'in_review'       // Wird geprüft
  | 'partially_approved' // Teilweise freigegeben
  | 'approved'        // Vollständig freigegeben
  | 'rejected'        // Abgelehnt
  | 'changes_requested' // Änderungen angefordert
  | 'expired'         // Abgelaufen
  | 'cancelled'       // Abgebrochen
  | 'completed';      // Abgeschlossen (nach Versand)

export type ApprovalWorkflow = 
  | 'simple'          // Einfache Freigabe
  | 'unanimous'       // Alle müssen zustimmen
  | 'majority'        // Mehrheit reicht
  | 'sequential'      // Der Reihe nach
  | 'hierarchical';   // Hierarchisch (Manager zuerst)

export type ApprovalAction = 
  | 'created'
  | 'sent_for_approval'
  | 'viewed'
  | 'approved'
  | 'rejected'
  | 'commented'
  | 'changes_requested'
  | 'reminder_sent'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'resubmitted'
  | 'downloaded'
  | 'forwarded';

export interface ReminderSchedule {
  enabled: boolean;
  intervals: number[]; // Stunden: [24, 48, 72]
  maxReminders: number;
  lastSentAt?: Timestamp;
  nextScheduledAt?: Timestamp;
}

export interface NotificationStatus {
  sent: boolean;
  sentAt?: Timestamp;
  method: 'email' | 'sms' | 'in_app';
  template?: string;
  error?: string;
  opened?: boolean;
  openedAt?: Timestamp;
  clicked?: boolean;
  clickedAt?: Timestamp;
}

// ========================================
// Form & List View Types
// ========================================

export interface ApprovalFormData extends Omit<ApprovalEnhanced, keyof BaseEntity | 'shareId' | 'history' | 'analytics' | 'notifications' | 'version'> {
  sendImmediately?: boolean;
  scheduledFor?: Date;
  testMode?: boolean;
}

export interface ApprovalListView extends ApprovalEnhanced {
  campaignDetails?: {
    id: string;
    status: string;
    scheduledDate?: Timestamp;
  };
  pendingCount: number;
  approvedCount: number;
  progressPercentage: number;
  isOverdue: boolean;
  nextReminderAt?: Timestamp;
}

// ========================================
// Filter & Search Types
// ========================================

export interface ApprovalFilters {
  search?: string;
  status?: ApprovalStatus[];
  clientIds?: string[];
  campaignIds?: string[];
  priority?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  hasAttachments?: boolean;
  isOverdue?: boolean;
  workflow?: ApprovalWorkflow[];
  tags?: string[];
}

// ========================================
// Statistics Types
// ========================================

export interface ApprovalStatistics {
  total: number;
  byStatus: Record<ApprovalStatus, number>;
  avgApprovalTime: number; // Stunden
  avgViewsBeforeDecision: number;
  approvalRate: number; // Prozent
  overdueCount: number;
  expiringToday: number;
  byClient: Array<{
    clientId: string;
    clientName: string;
    count: number;
    approvalRate: number;
  }>;
  byMonth: Array<{
    month: string;
    sent: number;
    approved: number;
    rejected: number;
  }>;
}

// ========================================
// Configuration Constants
// ========================================

export const APPROVAL_STATUS_CONFIG = {
  draft: {
    label: 'Entwurf',
    color: 'gray' as const,
    icon: 'DocumentTextIcon'
  },
  pending: {
    label: 'Ausstehend',
    color: 'yellow' as const,
    icon: 'ClockIcon'
  },
  in_review: {
    label: 'In Prüfung',
    color: 'blue' as const,
    icon: 'EyeIcon'
  },
  partially_approved: {
    label: 'Teilweise freigegeben',
    color: 'indigo' as const,
    icon: 'CheckIcon'
  },
  approved: {
    label: 'Freigegeben',
    color: 'green' as const,
    icon: 'CheckCircleIcon'
  },
  rejected: {
    label: 'Abgelehnt',
    color: 'red' as const,
    icon: 'XCircleIcon'
  },
  changes_requested: {
    label: 'Änderungen angefordert',
    color: 'orange' as const,
    icon: 'ExclamationTriangleIcon'
  },
  expired: {
    label: 'Abgelaufen',
    color: 'gray' as const,
    icon: 'ClockIcon'
  },
  cancelled: {
    label: 'Abgebrochen',
    color: 'gray' as const,
    icon: 'XMarkIcon'
  },
  completed: {
    label: 'Abgeschlossen',
    color: 'purple' as const,
    icon: 'CheckBadgeIcon'
  }
} as const;

export const APPROVAL_WORKFLOW_CONFIG = {
  simple: {
    label: 'Einfache Freigabe',
    description: 'Ein Empfänger muss freigeben'
  },
  unanimous: {
    label: 'Einstimmig',
    description: 'Alle Empfänger müssen freigeben'
  },
  majority: {
    label: 'Mehrheit',
    description: 'Die Mehrheit muss freigeben'
  },
  sequential: {
    label: 'Sequenziell',
    description: 'Der Reihe nach freigeben'
  },
  hierarchical: {
    label: 'Hierarchisch',
    description: 'Nach Hierarchie freigeben'
  }
} as const;

export const DEFAULT_REMINDER_INTERVALS = [24, 48, 72]; // Stunden

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Niedrig', color: 'gray' },
  { value: 'medium', label: 'Mittel', color: 'blue' },
  { value: 'high', label: 'Hoch', color: 'orange' },
  { value: 'urgent', label: 'Dringend', color: 'red' }
] as const;

// ========================================
// Migration Helpers
// ========================================

export interface ApprovalMigrationData {
  fromCampaignId: string;
  organizationId: string;
  userId: string;
}

// Legacy Approval Data Format (from PR Campaign)
export interface LegacyApprovalData {
  shareId: string;
  requestedAt: any;
  status: 'pending' | 'viewed' | 'commented' | 'approved';
  approvedAt?: any;
  feedbackHistory?: Array<{
    comment?: string;
    requestedAt: any;
    author?: string;
  }>;
}
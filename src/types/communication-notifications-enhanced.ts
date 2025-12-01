// src/types/communication-notifications-enhanced.ts

import { Notification, NotificationSettings, NotificationType } from './notifications';

// ==========================================
// ERWEITERTE NOTIFICATION TYPES
// ==========================================

export interface NotificationEnhanced extends Notification {
  // UI States
  isProcessing?: boolean;
  isDeleting?: boolean;
  displayText?: string;
  relativeTime?: string;
  
  // Component Props
  onClick?: () => void;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
  
  // Metadata Processing
  processedMetadata?: ProcessedNotificationMetadata;
}

export interface ProcessedNotificationMetadata {
  // Display-ready strings
  displayTitle?: string;
  displaySubtitle?: string;
  displayBadges?: NotificationBadge[];
  displayAction?: string;
  
  // Navigation
  navigationUrl?: string;
  navigationLabel?: string;
  
  // Visual indicators
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'approval' | 'email' | 'task' | 'media' | 'system';
}

export interface NotificationBadge {
  text: string;
  color: 'gray' | 'blue' | 'red' | 'green' | 'yellow' | 'purple';
  icon?: React.ComponentType<{ className?: string }>;
}

// ==========================================
// HOOK RETURN TYPES
// ==========================================

export interface UseNotificationsReturn {
  // Data
  notifications: NotificationEnhanced[];
  unreadCount: number;
  totalCount: number;
  
  // States
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  
  // Bulk Actions
  bulkMarkAsRead: (notificationIds: string[]) => Promise<void>;
  bulkDelete: (notificationIds: string[]) => Promise<void>;
  
  // Filtering
  filterByType: (type: NotificationType | null) => void;
  filterByRead: (read: boolean | null) => void;
  currentFilter: NotificationFilter;
}

export interface UseNotificationSettingsReturn {
  // Data
  settings: NotificationSettingsEnhanced | null;
  
  // States  
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  hasChanges: boolean;
  
  // Actions
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  
  // Validation
  validateSettings: (settings: Partial<NotificationSettings>) => ValidationResult;
  
  // Preview
  previewNotification: (type: NotificationType) => NotificationPreview;
}

export interface NotificationSettingsEnhanced extends NotificationSettings {
  // UI States
  isLoading?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
  validationErrors?: Record<string, string>;
  
  // Computed Properties
  enabledCount?: number;
  disabledCount?: number;
  categorySettings?: NotificationCategorySettings[];
}

export interface NotificationCategorySettings {
  category: string;
  displayName: string;
  description: string;
  settings: Array<{
    key: keyof NotificationSettings;
    displayName: string;
    description: string;
    enabled: boolean;
    hasInput?: boolean;
    inputType?: 'number' | 'text';
    inputValue?: number | string;
    inputMin?: number;
    inputMax?: number;
  }>;
}

// ==========================================
// COMPONENT PROP TYPES  
// ==========================================

export interface NotificationListProps {
  notifications?: NotificationEnhanced[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onNotificationClick?: (notification: NotificationEnhanced) => void;
  onMarkAsRead?: (notificationId: string) => Promise<void>;
  onDelete?: (notificationId: string) => Promise<void>;
  onBulkAction?: (action: 'markRead' | 'delete', ids: string[]) => Promise<void>;
  showBulkActions?: boolean;
  showFilters?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
}

export interface NotificationItemProps {
  notification: NotificationEnhanced;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick?: () => void;
  showActions?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export interface NotificationBadgeProps {
  unreadCount: number;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  iconOnly?: boolean;
  showZero?: boolean;
}

// ==========================================
// FILTER & SORTING TYPES
// ==========================================

export interface NotificationFilter {
  type: NotificationType | null;
  read: boolean | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  searchTerm: string;
}

export interface NotificationSort {
  field: 'createdAt' | 'readAt' | 'title' | 'type';
  direction: 'asc' | 'desc';
}

// ==========================================
// SERVICE INTEGRATION TYPES
// ==========================================

export interface NotificationCreatePayload {
  userId: string;
  organizationId?: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  linkType?: string;
  linkId?: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

export interface NotificationUpdatePayload {
  isRead?: boolean;
  readAt?: Date;
  archivedAt?: Date;
}

export interface NotificationBulkActionPayload {
  notificationIds: string[];
  action: 'markRead' | 'delete' | 'archive';
  organizationId?: string;
}

// ==========================================
// VALIDATION TYPES
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ==========================================
// PREVIEW & TEMPLATE TYPES
// ==========================================

export interface NotificationPreview {
  type: NotificationType;
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sampleData: Record<string, any>;
}

export interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  requiredFields: string[];
  optionalFields: string[];
  sampleMetadata: Record<string, any>;
}

// ==========================================
// CONSTANTS & HELPERS
// ==========================================

export const NOTIFICATION_CATEGORIES = {
  APPROVAL: {
    name: 'Freigaben',
    description: 'Benachrichtigungen zu Freigabe-Prozessen',
    types: ['APPROVAL_GRANTED', 'CHANGES_REQUESTED', 'OVERDUE_APPROVAL'] as NotificationType[]
  },
  EMAIL: {
    name: 'E-Mail-Versand',
    description: 'Benachrichtigungen zum E-Mail-Versand',
    types: ['EMAIL_SENT_SUCCESS', 'EMAIL_BOUNCED'] as NotificationType[]
  },
  TASK: {
    name: 'Tasks',
    description: 'Benachrichtigungen zu Tasks und Terminen',
    types: ['TASK_OVERDUE'] as NotificationType[]
  },
  MEDIA: {
    name: 'Mediencenter',
    description: 'Benachrichtigungen zu geteilten Inhalten',
    types: ['MEDIA_FIRST_ACCESS', 'MEDIA_DOWNLOADED', 'MEDIA_LINK_EXPIRED'] as NotificationType[]
  }
} as const;

export const NOTIFICATION_PRIORITY_COLORS = {
  low: 'text-gray-500 bg-gray-100',
  normal: 'text-blue-600 bg-blue-100',
  high: 'text-yellow-600 bg-yellow-100',
  urgent: 'text-red-600 bg-red-100'
} as const;

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  APPROVAL_GRANTED: {
    type: 'APPROVAL_GRANTED',
    titleTemplate: 'Freigabe erteilt',
    messageTemplate: '{senderName} hat die Freigabe für "{campaignTitle}" erteilt.',
    requiredFields: ['senderName', 'campaignTitle'],
    optionalFields: ['clientName'],
    sampleMetadata: {
      senderName: 'Max Mustermann',
      campaignTitle: 'Produktlaunch 2024',
      clientName: 'ACME GmbH'
    }
  },
  FIRST_VIEW: {
    type: 'FIRST_VIEW',
    titleTemplate: 'Erstansicht',
    messageTemplate: '{clientName} hat "{campaignTitle}" zum ersten Mal angesehen.',
    requiredFields: ['clientName', 'campaignTitle'],
    optionalFields: [],
    sampleMetadata: {
      clientName: 'ACME GmbH',
      campaignTitle: 'Produktlaunch 2024'
    }
  },
  CHANGES_REQUESTED: {
    type: 'CHANGES_REQUESTED',
    titleTemplate: 'Änderungen angefordert',
    messageTemplate: '{senderName} bittet um Änderungen für "{campaignTitle}".',
    requiredFields: ['senderName', 'campaignTitle'],
    optionalFields: ['clientName'],
    sampleMetadata: {
      senderName: 'Anna Schmidt',
      campaignTitle: 'Newsletter März',
      clientName: 'Tech Solutions AG'
    }
  },
  OVERDUE_APPROVAL: {
    type: 'OVERDUE_APPROVAL',
    titleTemplate: 'Überfällige Freigabe',
    messageTemplate: 'Die Freigabe-Anfrage für "{campaignTitle}" ist seit {daysOverdue} Tagen überfällig.',
    requiredFields: ['campaignTitle', 'daysOverdue'],
    optionalFields: ['clientName'],
    sampleMetadata: {
      campaignTitle: 'Quartalsbericht Q4',
      daysOverdue: 3,
      clientName: 'Enterprise Corp'
    }
  },
  EMAIL_SENT_SUCCESS: {
    type: 'EMAIL_SENT_SUCCESS',
    titleTemplate: 'E-Mail erfolgreich versendet',
    messageTemplate: 'Deine Kampagne "{campaignTitle}" wurde erfolgreich an {recipientCount} Kontakte versendet.',
    requiredFields: ['campaignTitle', 'recipientCount'],
    optionalFields: [],
    sampleMetadata: {
      campaignTitle: 'Weihnachtsaktion 2024',
      recipientCount: 1250
    }
  },
  EMAIL_BOUNCED: {
    type: 'EMAIL_BOUNCED',
    titleTemplate: 'E-Mail-Bounce aufgetreten',
    messageTemplate: 'Bei der Kampagne "{campaignTitle}" gab es einen Bounce.',
    requiredFields: ['campaignTitle'],
    optionalFields: ['bouncedEmail'],
    sampleMetadata: {
      campaignTitle: 'Newsletter Februar',
      bouncedEmail: 'invalid@domain.com'
    }
  },
  TASK_OVERDUE: {
    type: 'TASK_OVERDUE',
    titleTemplate: 'Überfälliger Task',
    messageTemplate: 'Dein Task "{taskName}" ist überfällig.',
    requiredFields: ['taskName'],
    optionalFields: [],
    sampleMetadata: {
      taskName: 'Kundenmeeting vorbereiten'
    }
  },
  MEDIA_FIRST_ACCESS: {
    type: 'MEDIA_FIRST_ACCESS',
    titleTemplate: 'Erste Zugriffe auf geteilte Inhalte',
    messageTemplate: 'Ihr geteilter Link für "{assetName}" wurde zum ersten Mal aufgerufen.',
    requiredFields: ['assetName'],
    optionalFields: [],
    sampleMetadata: {
      assetName: 'Produktkatalog_2024.pdf'
    }
  },
  MEDIA_DOWNLOADED: {
    type: 'MEDIA_DOWNLOADED',
    titleTemplate: 'Datei heruntergeladen',
    messageTemplate: 'Ihre Datei "{assetName}" wurde von einem Besucher heruntergeladen.',
    requiredFields: ['assetName'],
    optionalFields: [],
    sampleMetadata: {
      assetName: 'Preisliste_aktuell.xlsx'
    }
  },
  MEDIA_LINK_EXPIRED: {
    type: 'MEDIA_LINK_EXPIRED',
    titleTemplate: 'Share-Link abgelaufen',
    messageTemplate: 'Der geteilte Link für "{assetName}" ist heute abgelaufen.',
    requiredFields: ['assetName'],
    optionalFields: [],
    sampleMetadata: {
      assetName: 'Pressemitteilung_Q1.docx'
    }
  },
  project_assignment: {
    type: 'project_assignment',
    titleTemplate: 'Projekt-Zuweisung',
    messageTemplate: 'Du wurdest dem Projekt "{projectTitle}" zugewiesen.',
    requiredFields: ['projectTitle'],
    optionalFields: ['senderName'],
    sampleMetadata: {
      projectTitle: 'Q1 Marketing Campaign',
      senderName: 'Max Mustermann'
    }
  },
  TEAM_CHAT_MENTION: {
    type: 'TEAM_CHAT_MENTION',
    titleTemplate: '@-Erwähnung im Team-Chat',
    messageTemplate: '{mentionedByName} hat Sie in {projectTitle} erwähnt: "{messageContent}"',
    requiredFields: ['mentionedByName', 'projectTitle', 'messageContent'],
    optionalFields: [],
    sampleMetadata: {
      mentionedByName: 'Anna Schmidt',
      projectTitle: 'Marketing Kampagne Q1',
      messageContent: 'Können Sie das bitte prüfen?'
    }
  }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function processNotificationForDisplay(notification: Notification): NotificationEnhanced {
  const template = NOTIFICATION_TEMPLATES[notification.type];
  const category = Object.values(NOTIFICATION_CATEGORIES).find(cat => 
    cat.types.includes(notification.type)
  );

  return {
    ...notification,
    displayText: template.messageTemplate,
    processedMetadata: {
      displayTitle: notification.title,
      displaySubtitle: notification.message,
      category: category?.name.toLowerCase() as any,
      urgencyLevel: determineUrgencyLevel(notification),
      displayBadges: createDisplayBadges(notification)
    }
  };
}

function determineUrgencyLevel(notification: Notification): 'low' | 'medium' | 'high' | 'critical' {
  switch (notification.type) {
    case 'OVERDUE_APPROVAL':
      const daysOverdue = notification.metadata?.daysOverdue || 0;
      if (daysOverdue > 7) return 'critical';
      if (daysOverdue > 3) return 'high';
      return 'medium';
    case 'EMAIL_BOUNCED':
    case 'TASK_OVERDUE':
      return 'high';
    case 'CHANGES_REQUESTED':
      return 'medium';
    default:
      return 'low';
  }
}

function createDisplayBadges(notification: Notification): NotificationBadge[] {
  const badges: NotificationBadge[] = [];
  
  if (notification.metadata?.clientName) {
    badges.push({
      text: notification.metadata.clientName,
      color: 'gray'
    });
  }
  
  if (notification.metadata?.recipientCount) {
    badges.push({
      text: `${notification.metadata.recipientCount} Empfänger`,
      color: 'blue'
    });
  }
  
  if (notification.metadata?.daysOverdue) {
    badges.push({
      text: `${notification.metadata.daysOverdue} Tage überfällig`,
      color: 'red'
    });
  }
  
  return badges;
}

export function createDefaultSettings(): NotificationSettings {
  return {
    id: '',
    userId: '',
    // Freigaben
    approvalGranted: true,
    changesRequested: true,
    firstView: true,
    overdueApprovals: true,
    overdueApprovalDays: 3,
    // E-Mail
    emailSentSuccess: true,
    emailBounced: true,
    // Tasks
    taskOverdue: true,
    // Mediencenter
    mediaFirstAccess: true,
    mediaDownloaded: true,
    // Team
    teamChatMention: true,
    // Timestamps
    createdAt: new Date() as any,
    updatedAt: new Date() as any
  };
}
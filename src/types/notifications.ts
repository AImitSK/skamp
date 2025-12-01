// src/types/notifications.ts

import { Timestamp } from "firebase/firestore";

export type NotificationType =
  | 'APPROVAL_GRANTED'
  | 'CHANGES_REQUESTED'
  | 'FIRST_VIEW'
  | 'OVERDUE_APPROVAL'
  | 'EMAIL_SENT_SUCCESS'
  | 'EMAIL_BOUNCED'
  | 'TASK_OVERDUE'
  | 'MEDIA_FIRST_ACCESS'
  | 'MEDIA_DOWNLOADED'
  | 'MEDIA_LINK_EXPIRED'
  | 'project_assignment'
  | 'TEAM_CHAT_MENTION';

export type LinkType = 'campaign' | 'approval' | 'media' | 'task';

export interface NotificationMetadata {
  campaignId?: string;
  campaignTitle?: string;
  clientName?: string;
  mediaAssetName?: string;
  taskName?: string;
  senderName?: string;
  recipientCount?: number;
  daysOverdue?: number;
  bouncedEmail?: string;
  // Team Chat Mentions
  projectId?: string;
  projectTitle?: string;
  messageContent?: string;
  mentionedBy?: string;
  mentionedByName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  organizationId?: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  linkType?: LinkType;
  linkId?: string;
  isRead: boolean;
  metadata?: NotificationMetadata;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  // Freigaben
  approvalGranted: boolean;
  changesRequested: boolean;
  firstView: boolean;
  overdueApprovals: boolean;
  overdueApprovalDays: number;
  // Schedule Mails
  emailSentSuccess: boolean;
  emailBounced: boolean;
  // Tasks
  taskOverdue: boolean;
  // Mediencenter
  mediaFirstAccess: boolean;
  mediaDownloaded: boolean;
  // mediaLinkExpired: boolean; // TODO: Trigger noch nicht implementiert
  // Team
  teamChatMention: boolean;
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Helper type for creating notifications
export type CreateNotificationInput = Omit<Notification, 'id' | 'createdAt' | 'readAt'>;

// Default settings for new users
export const DEFAULT_NOTIFICATION_SETTINGS: Omit<NotificationSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  // Freigaben
  approvalGranted: true,
  changesRequested: true,
  firstView: true,
  overdueApprovals: true,
  overdueApprovalDays: 3, // Default: 3 Tage
  // Schedule Mails
  emailSentSuccess: true,
  emailBounced: true,
  // Tasks
  taskOverdue: true,
  // Mediencenter
  mediaFirstAccess: true,
  mediaDownloaded: true,
  // Team
  teamChatMention: true,
};

// Notification templates for consistent messaging
export const NOTIFICATION_TEMPLATES = {
  APPROVAL_GRANTED: '{senderName} hat die Freigabe für "{campaignTitle}" erteilt.',
  CHANGES_REQUESTED: '{senderName} bittet um Änderungen für "{campaignTitle}".',
  FIRST_VIEW: '{senderName} hat die Kampagne "{campaignTitle}" zum ersten Mal angesehen.',
  OVERDUE_APPROVAL: 'Die Freigabe-Anfrage für "{campaignTitle}" ist seit {daysOverdue} Tagen überfällig.',
  EMAIL_SENT_SUCCESS: 'Deine Kampagne "{campaignTitle}" wurde erfolgreich an {recipientCount} Kontakte versendet.',
  EMAIL_BOUNCED: 'Bei der Kampagne "{campaignTitle}" gab es einen Bounce von {bouncedEmail}.',
  TASK_OVERDUE: 'Dein Task "{taskName}" ist überfällig.',
  MEDIA_FIRST_ACCESS: 'Ihr geteilter Link für "{mediaAssetName}" wurde zum ersten Mal aufgerufen.',
  MEDIA_DOWNLOADED: 'Ihre Datei "{mediaAssetName}" wurde von einem Besucher heruntergeladen.',
  MEDIA_LINK_EXPIRED: 'Der geteilte Link für "{mediaAssetName}" ist heute abgelaufen.',
  TEAM_CHAT_MENTION: '{mentionedByName} hat Sie in {projectTitle} erwähnt: "{messageContent}"',
  project_assignment: 'Du wurdest dem Projekt "{projectTitle}" zugewiesen.'
} as const;

// Icon mapping for notification types (using Heroicons)
export const NOTIFICATION_ICONS = {
  APPROVAL_GRANTED: 'CheckCircleIcon',
  CHANGES_REQUESTED: 'ExclamationCircleIcon',
  FIRST_VIEW: 'EyeIcon',
  OVERDUE_APPROVAL: 'ClockIcon',
  EMAIL_SENT_SUCCESS: 'EnvelopeIcon',
  EMAIL_BOUNCED: 'ExclamationTriangleIcon',
  TASK_OVERDUE: 'CalendarDaysIcon',
  MEDIA_FIRST_ACCESS: 'EyeIcon',
  MEDIA_DOWNLOADED: 'ArrowDownTrayIcon',
  MEDIA_LINK_EXPIRED: 'LinkIcon'
} as const;

// Color mapping for notification types (Tailwind classes)
export const NOTIFICATION_COLORS = {
  APPROVAL_GRANTED: 'text-green-600 bg-green-50',
  CHANGES_REQUESTED: 'text-yellow-600 bg-yellow-50',
  FIRST_VIEW: 'text-blue-600 bg-blue-50',
  OVERDUE_APPROVAL: 'text-red-600 bg-red-50',
  EMAIL_SENT_SUCCESS: 'text-blue-600 bg-blue-50',
  EMAIL_BOUNCED: 'text-orange-600 bg-orange-50',
  TASK_OVERDUE: 'text-red-600 bg-red-50',
  MEDIA_FIRST_ACCESS: 'text-purple-600 bg-purple-50',
  MEDIA_DOWNLOADED: 'text-indigo-600 bg-indigo-50',
  MEDIA_LINK_EXPIRED: 'text-gray-600 bg-gray-50'
} as const;
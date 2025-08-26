// src/types/notification-settings-enhanced.ts

import { NotificationSettings } from './notifications';
import { CheckCircleIcon, EnvelopeIcon, CalendarIcon, PhotoIcon } from '@heroicons/react/24/outline';

// Enhanced Notification Settings für Settings-Page Component Props
export interface NotificationSettingsEnhanced extends NotificationSettings {
  // Status-Informationen (nur für Settings-Seite)
  isLoading?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
  lastSaved?: Date;
}

// Component Props Interfaces für Settings-Seite
export interface NotificationSettingsPageProps {
  className?: string;
}

export interface NotificationSettingsFormProps {
  settings: NotificationSettings | null;
  onSave: (settings: Partial<NotificationSettings>) => Promise<void>;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  className?: string;
}

// Settings Form State
export interface NotificationSettingsFormState {
  localSettings: NotificationSettingsState | null;
  originalSettings: NotificationSettings | null;
  hasChanges: boolean;
  saving: boolean;
  saveSuccess: boolean;
  error: string | null;
}

// Settings State Interface (wie in Component verwendet)
export interface NotificationSettingsState {
  approvalGranted: boolean;
  changesRequested: boolean;
  overdueApprovals: boolean;
  overdueApprovalDays: number;
  emailSentSuccess: boolean;
  emailBounced: boolean;
  taskOverdue: boolean;
  mediaFirstAccess: boolean;
  mediaDownloaded: boolean;
  mediaLinkExpired: boolean;
}

// Setting Group für UI-Darstellung
export interface SettingGroup {
  title: string;
  icon: React.ElementType;
  description?: string;
  settings: SettingItem[];
}

export interface SettingItem {
  key: keyof NotificationSettingsState;
  label: string;
  description?: string;
  type?: 'toggle' | 'number';
  min?: number;
  max?: number;
  unit?: string;
  dependsOn?: keyof NotificationSettingsState;
}

// Constants
export const NOTIFICATION_SETTINGS_CONSTANTS = {
  // Validation Limits
  MAX_OVERDUE_DAYS: 30,
  MIN_OVERDUE_DAYS: 1,
  DEFAULT_OVERDUE_DAYS: 3,
  
  // Auto-save Settings
  SAVE_SUCCESS_DURATION: 3000, // 3 seconds
  AUTO_SAVE_DELAY: 1000, // 1 second after last change
  
  // Form Field Keys
  FORM_FIELDS: {
    APPROVAL_GRANTED: 'approvalGranted',
    CHANGES_REQUESTED: 'changesRequested',
    OVERDUE_APPROVALS: 'overdueApprovals',
    OVERDUE_APPROVAL_DAYS: 'overdueApprovalDays',
    EMAIL_SENT_SUCCESS: 'emailSentSuccess',
    EMAIL_BOUNCED: 'emailBounced',
    TASK_OVERDUE: 'taskOverdue',
    MEDIA_FIRST_ACCESS: 'mediaFirstAccess',
    MEDIA_DOWNLOADED: 'mediaDownloaded',
    MEDIA_LINK_EXPIRED: 'mediaLinkExpired'
  } as const,
  
  // UI Messages
  SUCCESS_MESSAGES: {
    SETTINGS_SAVED: 'Einstellungen erfolgreich gespeichert',
    SETTINGS_RESET: 'Einstellungen wurden zurückgesetzt'
  } as const,
  
  ERROR_MESSAGES: {
    SETTINGS_LOAD_FAILED: 'Fehler beim Laden der Einstellungen',
    SETTINGS_SAVE_FAILED: 'Fehler beim Speichern der Einstellungen',
    INVALID_INPUT: 'Ungültige Eingabe',
    NETWORK_ERROR: 'Netzwerkfehler - Bitte versuchen Sie es erneut'
  } as const,
  
  // CSS Classes
  CSS_CLASSES: {
    CONTAINER: 'space-y-6',
    HEADER: 'sm:flex sm:items-center sm:justify-between',
    GROUP: 'space-y-4',
    SETTING_ITEM: 'flex items-start',
    SWITCH_CONTAINER: 'ml-4 flex items-center',
    NUMBER_INPUT: 'w-20',
    SUCCESS_MESSAGE: 'text-sm text-green-600 flex items-center gap-1',
    ERROR_MESSAGE: 'rounded-lg bg-red-50 p-4',
    LOADING_STATE: 'flex items-center justify-center py-12'
  } as const
} as const;

// Default Settings
export const DEFAULT_NOTIFICATION_SETTINGS_STATE: NotificationSettingsState = {
  approvalGranted: true,
  changesRequested: true,
  overdueApprovals: true,
  overdueApprovalDays: NOTIFICATION_SETTINGS_CONSTANTS.DEFAULT_OVERDUE_DAYS,
  emailSentSuccess: true,
  emailBounced: true,
  taskOverdue: true,
  mediaFirstAccess: true,
  mediaDownloaded: true,
  mediaLinkExpired: true
};

// Type Guards
export const isNotificationSettingsState = (obj: any): obj is NotificationSettingsState => {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.approvalGranted === 'boolean' &&
    typeof obj.changesRequested === 'boolean' &&
    typeof obj.overdueApprovals === 'boolean' &&
    typeof obj.overdueApprovalDays === 'number';
};

// Helper Functions
export const validateSettingsInput = (
  key: keyof NotificationSettingsState,
  value: any
): boolean => {
  switch (key) {
    case 'overdueApprovalDays':
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      return !isNaN(numValue) && 
        numValue >= NOTIFICATION_SETTINGS_CONSTANTS.MIN_OVERDUE_DAYS && 
        numValue <= NOTIFICATION_SETTINGS_CONSTANTS.MAX_OVERDUE_DAYS;
    default:
      return typeof value === 'boolean';
  }
};

export const hasSettingsChanged = (
  original: NotificationSettings | null,
  current: NotificationSettingsState | null
): boolean => {
  if (!original || !current) return false;
  
  return Object.keys(current).some(key => {
    const typedKey = key as keyof NotificationSettingsState;
    return (current as any)[typedKey] !== (original as any)[typedKey];
  });
};

export const getSettingDisplayValue = (
  key: keyof NotificationSettingsState,
  value: any
): string => {
  switch (key) {
    case 'overdueApprovalDays':
      return `${value} ${value === 1 ? 'Tag' : 'Tage'}`;
    default:
      return value ? 'Aktiviert' : 'Deaktiviert';
  }
};

// Settings Groups Configuration
export const NOTIFICATION_SETTINGS_GROUPS: SettingGroup[] = [
  {
    title: 'Freigaben',
    icon: CheckCircleIcon,
    settings: [
      {
        key: 'approvalGranted',
        label: 'Korrekturstatus: Freigabe erteilt',
        description: 'Benachrichtigung wenn eine Freigabe erteilt wurde',
        type: 'toggle'
      },
      {
        key: 'changesRequested', 
        label: 'Korrekturstatus: Änderungen erbeten',
        description: 'Benachrichtigung wenn Änderungen angefordert wurden',
        type: 'toggle'
      },
      {
        key: 'overdueApprovals',
        label: 'Überfällige Freigabe-Anfragen',
        description: 'Benachrichtigung über ausstehende Freigaben',
        type: 'toggle'
      },
      {
        key: 'overdueApprovalDays',
        label: 'Tage bis zur Überfälligkeit',
        description: 'Nach wie vielen Tagen eine Freigabe als überfällig gilt',
        type: 'number',
        min: NOTIFICATION_SETTINGS_CONSTANTS.MIN_OVERDUE_DAYS,
        max: NOTIFICATION_SETTINGS_CONSTANTS.MAX_OVERDUE_DAYS,
        unit: 'Tage',
        dependsOn: 'overdueApprovals'
      }
    ]
  },
  {
    title: 'Schedule Mails',
    icon: EnvelopeIcon,
    settings: [
      {
        key: 'emailSentSuccess',
        label: 'Erfolgsmeldung nach Versand',
        description: 'Benachrichtigung nach erfolgreichem E-Mail-Versand',
        type: 'toggle'
      },
      {
        key: 'emailBounced',
        label: 'Bounce-Benachrichtigung',
        description: 'Benachrichtigung bei E-Mail-Bounces',
        type: 'toggle'
      }
    ]
  },
  {
    title: 'Tasks',
    icon: CalendarIcon,
    settings: [
      {
        key: 'taskOverdue',
        label: 'Überfällige Kalender-Tasks',
        description: 'Benachrichtigung über überfällige Tasks',
        type: 'toggle'
      }
    ]
  },
  {
    title: 'Mediencenter',
    icon: PhotoIcon,
    settings: [
      {
        key: 'mediaFirstAccess',
        label: 'Erstmaliger Zugriff auf einen geteilten Link',
        description: 'Benachrichtigung beim ersten Zugriff auf geteilte Medien',
        type: 'toggle'
      },
      {
        key: 'mediaDownloaded',
        label: 'Download eines geteilten Mediums',
        description: 'Benachrichtigung wenn geteilte Medien heruntergeladen werden',
        type: 'toggle'
      },
      {
        key: 'mediaLinkExpired',
        label: 'Ablaufdatum eines Links überschritten',
        description: 'Benachrichtigung wenn ein geteilter Link abläuft',
        type: 'toggle'
      }
    ]
  }
] as const;

// Utility Types
export type NotificationSettingKey = keyof NotificationSettingsState;
export type SettingType = 'toggle' | 'number';
export type NotificationCategory = 'Freigaben' | 'Schedule Mails' | 'Tasks' | 'Mediencenter';
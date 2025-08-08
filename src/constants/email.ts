// src/constants/email.ts
import { 
  ClockIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon
} from "@heroicons/react/20/solid";

// E-Mail Status Konfiguration
export type EmailSendStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';

export const EMAIL_STATUS_CONFIG: Record<EmailSendStatus, {
  label: string;
  color: "zinc" | "yellow" | "blue" | "green" | "red" | "orange";
  icon: React.ElementType;
  description?: string;
}> = {
  pending: {
    label: 'Ausstehend',
    color: 'zinc',
    icon: ClockIcon,
    description: 'E-Mail wartet auf Versand'
  },
  sending: {
    label: 'Wird versendet',
    color: 'blue',
    icon: PaperAirplaneIcon,
    description: 'E-Mail wird gerade versendet'
  },
  sent: {
    label: 'Versendet',
    color: 'green',
    icon: CheckCircleIcon,
    description: 'E-Mail wurde erfolgreich versendet'
  },
  failed: {
    label: 'Fehlgeschlagen',
    color: 'red',
    icon: XCircleIcon,
    description: 'E-Mail-Versand ist fehlgeschlagen'
  },
  cancelled: {
    label: 'Abgebrochen',
    color: 'orange',
    icon: ExclamationTriangleIcon,
    description: 'E-Mail-Versand wurde abgebrochen'
  }
};

// E-Mail Composer Status
export type EmailComposerStatus = 'draft' | 'scheduled' | 'template';

export const COMPOSER_STATUS_CONFIG: Record<EmailComposerStatus, {
  label: string;
  color: "zinc" | "blue" | "green";
  icon: React.ElementType;
}> = {
  draft: {
    label: 'Entwurf',
    color: 'zinc', 
    icon: EnvelopeIcon
  },
  scheduled: {
    label: 'Geplant',
    color: 'blue',
    icon: ClockIcon
  },
  template: {
    label: 'Vorlage',
    color: 'green',
    icon: CheckCircleIcon
  }
};

// E-Mail Limits und Konstanten
export const EMAIL_LIMITS = {
  MAX_RECIPIENTS: 500,
  MAX_SUBJECT_LENGTH: 150,
  MIN_BODY_LENGTH: 50,
  MAX_BODY_LENGTH: 50000,
  MAX_ATTACHMENT_SIZE_MB: 25,
  MAX_ATTACHMENTS: 10
} as const;

// Zeitkonstanten
export const EMAIL_TIMING = {
  MIN_SCHEDULE_AHEAD_MS: 15 * 60 * 1000, // 15 Minuten
  AUTO_SAVE_DELAY_MS: 2000, // 2 Sekunden
  SEND_TIMEOUT_MS: 30 * 1000, // 30 Sekunden
  RETRY_DELAY_MS: 5 * 1000, // 5 Sekunden
  MAX_RETRIES: 3
} as const;

// SendGrid Konfiguration
export const SENDGRID_CONFIG = {
  BATCH_SIZE: 50,
  RATE_LIMIT_PER_SECOND: 500,
  WEBHOOK_TIMEOUT_MS: 10 * 1000,
  MAX_PARALLEL_SENDS: 5
} as const;

// E-Mail Template Kategorien
export const EMAIL_TEMPLATE_TYPES = {
  CAMPAIGN: 'campaign',
  APPROVAL: 'approval',
  NOTIFICATION: 'notification',
  INVITATION: 'invitation',
  REMINDER: 'reminder'
} as const;

// Validierungs-Regeln
export const EMAIL_VALIDATION = {
  SUBJECT_MIN_LENGTH: 5,
  SUBJECT_MAX_LENGTH: 150,
  SENDER_NAME_MIN_LENGTH: 2,
  SENDER_NAME_MAX_LENGTH: 50,
  REPLY_TO_REQUIRED: true
} as const;

// E-Mail Prioritäten
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';

export const EMAIL_PRIORITY_CONFIG: Record<EmailPriority, {
  label: string;
  color: "zinc" | "blue" | "orange" | "red";
  value: number; // für Sortierung
}> = {
  low: {
    label: 'Niedrig',
    color: 'zinc',
    value: 1
  },
  normal: {
    label: 'Normal',
    color: 'blue',
    value: 2
  },
  high: {
    label: 'Hoch',
    color: 'orange', 
    value: 3
  },
  urgent: {
    label: 'Dringend',
    color: 'red',
    value: 4
  }
};

// Folder-Typen für E-Mail-Organisation
export const EMAIL_FOLDERS = {
  INBOX: 'inbox',
  SENT: 'sent',
  DRAFTS: 'drafts',
  TRASH: 'trash',
  SPAM: 'spam',
  ARCHIVE: 'archive'
} as const;

// Auto-Save Konfiguration
export const AUTO_SAVE_CONFIG = {
  ENABLED: true,
  INTERVAL_MS: 30 * 1000, // 30 Sekunden
  MIN_CHANGES: 10, // Mindestanzahl Zeichen-Änderungen
  DEBOUNCE_MS: 2000 // Warten nach letzter Eingabe
} as const;

// Tracking & Analytics
export const EMAIL_ANALYTICS = {
  TRACK_OPENS: true,
  TRACK_CLICKS: true,
  TRACK_DOWNLOADS: true,
  RETENTION_DAYS: 90,
  BATCH_UPDATE_SIZE: 100
} as const;
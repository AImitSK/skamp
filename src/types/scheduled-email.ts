/**
 * Scheduled Email Types
 * Collection: scheduled_emails
 * Für geplante Email-Versendungen via Cron-Job
 */

import { Timestamp } from 'firebase/firestore';
import { EmailDraft } from './email-composer';

export type ScheduledEmailStatus = 'pending' | 'processing' | 'sent' | 'failed';

/**
 * Geplante Email in Firestore
 */
export interface ScheduledEmail {
  id?: string;

  // Zuordnung
  organizationId: string;
  userId: string;
  campaignId: string;

  // Email-Daten
  draft: EmailDraft;

  // Zeitplanung
  sendAt: Timestamp; // Wann soll gesendet werden
  timezone: string;  // Timezone für Anzeige

  // Status
  status: ScheduledEmailStatus;

  // Verarbeitungs-Info
  processedAt?: Timestamp;
  sentAt?: Timestamp;
  attempts: number; // Anzahl der Versuch

  // Ergebnis
  result?: {
    successCount: number;
    failureCount: number;
    errors: string[];
  };

  // Fehler
  error?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * PDF-Format für Multi-Language Versand
 */
export type PdfFormat = 'separate' | 'combined';

/**
 * Ausgewählte Sprachen für Versand
 */
export interface SelectedLanguages {
  original: boolean; // Originalsprache immer dabei
  translations: string[]; // Ausgewählte Übersetzungen (ISO 639-1 Codes)
}

/**
 * Request Body für /api/email/send
 */
export interface SendEmailRequest {
  campaignId: string;
  organizationId: string;
  draft: EmailDraft;
  sendImmediately: boolean;
  scheduledDate?: string; // ISO String

  // NEU: Multi-Language Optionen (Phase 2.7)
  projectId?: string; // Benötigt für Übersetzungs-Lookup
  selectedLanguages?: SelectedLanguages;
  pdfFormat?: PdfFormat;
}

/**
 * Response für /api/email/send
 */
export interface SendEmailResponse {
  success: boolean;

  // Bei Sofort-Versand
  result?: {
    successCount: number;
    failureCount: number;
    errors: string[];
  };

  // Bei Scheduling
  scheduledEmailId?: string;
  scheduledFor?: string; // ISO String

  // Fehler
  error?: string;
}

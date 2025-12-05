// src/types/auto-reporting.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Auto-Reporting Feature
 *
 * Automatischer Versand von Monitoring-Reports an CRM-Kontakte (Kunden)
 * in wöchentlichem oder monatlichem Rhythmus.
 */

// ========================================
// ENUMS & TYPES
// ========================================

export type ReportingFrequency = 'weekly' | 'monthly';

export type SendStatus = 'success' | 'partial' | 'failed';

// ========================================
// INTERFACES
// ========================================

/**
 * Empfänger eines Auto-Reports
 * Referenziert einen CRM-Kontakt
 */
export interface AutoReportingRecipient {
  contactId: string;
  email: string;
  name: string; // Für Personalisierung in E-Mail
}

/**
 * Auto-Reporting Konfiguration
 *
 * Speichert die Einstellungen für automatischen Report-Versand
 * einer Kampagne an bis zu 3 Empfänger.
 */
export interface AutoReporting {
  id?: string;
  organizationId: string;
  campaignId: string;
  campaignName: string; // Denormalisiert für Tabellen-Anzeige

  // Empfänger (max. 3)
  recipients: AutoReportingRecipient[];

  // Frequenz-Einstellungen
  frequency: ReportingFrequency;
  dayOfWeek?: number;  // 0 (Sonntag) - 6 (Samstag) für 'weekly'
  dayOfMonth?: number; // 1-28 für 'monthly' (Standard: 1)

  // Status
  isActive: boolean;

  // Zeitsteuerung (alle Zeiten in Europe/Berlin)
  nextSendAt: Timestamp;
  lastSentAt?: Timestamp;

  // Letzter Versand-Status (für Tabellen-Anzeige)
  lastSendStatus?: SendStatus;
  lastSendError?: string;

  // Verknüpfung zum Monitoring (für Auto-Ende)
  monitoringEndDate: Timestamp;

  // Audit
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Log-Eintrag für einen Report-Versand
 *
 * Dokumentiert jeden Versandvorgang für Historie/Debugging
 */
export interface AutoReportingSendLog {
  id?: string;
  autoReportingId: string;
  organizationId: string;
  campaignId: string;

  sentAt: Timestamp;
  recipients: string[]; // E-Mail-Adressen

  status: SendStatus;
  errorMessage?: string;

  // Report-Referenz
  pdfUrl?: string;
  pdfStoragePath?: string;
}

// ========================================
// FORM DATA TYPES
// ========================================

/**
 * Daten für das Erstellen/Bearbeiten eines Auto-Reportings
 */
export interface AutoReportingFormData {
  recipients: AutoReportingRecipient[];
  frequency: ReportingFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

// ========================================
// UI LABELS
// ========================================

export const frequencyLabels: Record<ReportingFrequency, string> = {
  weekly: 'Wöchentlich',
  monthly: 'Monatlich'
};

export const dayOfWeekLabels: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag'
};

export const sendStatusLabels: Record<SendStatus, string> = {
  success: 'Erfolgreich',
  partial: 'Teilweise',
  failed: 'Fehlgeschlagen'
};

export const sendStatusColors: Record<SendStatus, string> = {
  success: 'green',
  partial: 'yellow',
  failed: 'red'
};

// ========================================
// CONSTANTS
// ========================================

export const MAX_RECIPIENTS = 3;
export const DEFAULT_DAY_OF_MONTH = 1;
export const DEFAULT_DAY_OF_WEEK = 1; // Montag
export const DEFAULT_SEND_HOUR = 8; // 8:00 Uhr deutscher Zeit

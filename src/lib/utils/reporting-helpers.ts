// src/lib/utils/reporting-helpers.ts

/**
 * Hilfsfunktionen für Auto-Reporting
 *
 * Datums-Berechnungen und Formatierungen
 * Alle Zeiten in Europe/Berlin
 */

import { Timestamp } from 'firebase/firestore';
import {
  ReportingFrequency,
  DEFAULT_SEND_HOUR,
  DEFAULT_DAY_OF_MONTH,
  DEFAULT_DAY_OF_WEEK
} from '@/types/auto-reporting';

// ========================================
// TIMEZONE HELPERS
// ========================================

/**
 * Konvertiert ein Date-Objekt in die deutsche Zeitzone
 */
function toGermanTime(date: Date): Date {
  // Erstelle ein neues Date mit deutscher Zeitzone
  const germanTime = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })
  );
  return germanTime;
}

/**
 * Erstellt ein Date-Objekt für eine bestimmte Uhrzeit in deutscher Zeit
 */
function createGermanDateTime(
  year: number,
  month: number,
  day: number,
  hour: number = DEFAULT_SEND_HOUR,
  minute: number = 0
): Date {
  // Erstelle Datum in lokaler Zeit und konvertiere zu UTC
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  // Berechne den UTC-Offset für deutsche Zeit
  const testDate = new Date(dateStr);
  const germanOffset = getGermanUTCOffset(testDate);

  // Erstelle UTC-Zeit basierend auf gewünschter deutscher Zeit
  const utcDate = new Date(testDate.getTime() - germanOffset * 60 * 1000);

  return utcDate;
}

/**
 * Gibt den UTC-Offset für Deutschland in Minuten zurück
 * Berücksichtigt Sommer-/Winterzeit
 */
function getGermanUTCOffset(date: Date): number {
  const germanTime = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })
  );
  const utcTime = new Date(
    date.toLocaleString('en-US', { timeZone: 'UTC' })
  );

  return (germanTime.getTime() - utcTime.getTime()) / (60 * 1000);
}

// ========================================
// DATE CALCULATIONS
// ========================================

/**
 * Berechnet das nächste Versanddatum basierend auf Frequenz
 *
 * @param frequency - 'weekly' oder 'monthly'
 * @param dayOfWeek - 0 (Sonntag) bis 6 (Samstag) für weekly
 * @param dayOfMonth - 1 bis 28 für monthly
 * @returns Date-Objekt für den nächsten Versand (8:00 Uhr deutscher Zeit)
 */
export function calculateNextSendDate(
  frequency: ReportingFrequency,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const now = new Date();
  const germanNow = toGermanTime(now);

  if (frequency === 'weekly') {
    return calculateNextWeeklyDate(germanNow, dayOfWeek ?? DEFAULT_DAY_OF_WEEK);
  } else {
    return calculateNextMonthlyDate(germanNow, dayOfMonth ?? DEFAULT_DAY_OF_MONTH);
  }
}

/**
 * Berechnet den nächsten wöchentlichen Versandtermin
 */
function calculateNextWeeklyDate(now: Date, targetDayOfWeek: number): Date {
  const currentDayOfWeek = now.getDay();
  const currentHour = now.getHours();

  let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;

  // Wenn der Ziel-Tag heute ist, aber die Sendezeit schon vorbei
  if (daysUntilTarget === 0 && currentHour >= DEFAULT_SEND_HOUR) {
    daysUntilTarget = 7; // Nächste Woche
  }

  // Wenn der Ziel-Tag bereits vergangen ist diese Woche
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }

  // Wenn daysUntilTarget immer noch 0 ist (heute, vor Sendezeit), behalte es bei
  if (daysUntilTarget === 0 && currentHour < DEFAULT_SEND_HOUR) {
    // Heute ist der richtige Tag und die Zeit ist noch nicht erreicht
  }

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysUntilTarget);

  return createGermanDateTime(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    DEFAULT_SEND_HOUR
  );
}

/**
 * Berechnet den nächsten monatlichen Versandtermin
 */
function calculateNextMonthlyDate(now: Date, targetDayOfMonth: number): Date {
  const currentDay = now.getDate();
  const currentHour = now.getHours();

  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();

  // Wenn der Ziel-Tag diesen Monat schon vorbei ist (oder heute aber nach Sendezeit)
  if (
    currentDay > targetDayOfMonth ||
    (currentDay === targetDayOfMonth && currentHour >= DEFAULT_SEND_HOUR)
  ) {
    // Nächster Monat
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  // Stelle sicher, dass der Tag im Monat existiert (z.B. 31. Februar gibt es nicht)
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const actualDay = Math.min(targetDayOfMonth, daysInMonth);

  return createGermanDateTime(
    targetYear,
    targetMonth,
    actualDay,
    DEFAULT_SEND_HOUR
  );
}

// ========================================
// FORMATTING
// ========================================

/**
 * Formatiert ein Timestamp für die Anzeige
 *
 * @param timestamp - Firestore Timestamp
 * @returns Formatierter String (z.B. "Mo, 02.12.2024 um 08:00 Uhr")
 */
export function formatNextSendDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin'
  };

  const formatted = date.toLocaleString('de-DE', options);

  // "Mo., 02.12.2024, 08:00" -> "Mo, 02.12.2024 um 08:00 Uhr"
  return formatted
    .replace('.', '')
    .replace(',', '')
    .replace(', ', ' um ')
    + ' Uhr';
}

/**
 * Formatiert ein Timestamp als kurzes Datum
 *
 * @param timestamp - Firestore Timestamp
 * @returns Formatierter String (z.B. "02.12.2024")
 */
export function formatShortDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Berlin'
  });
}

/**
 * Formatiert einen Zeitraum für den Report
 *
 * @param startDate - Start-Datum
 * @param endDate - End-Datum
 * @returns Formatierter String (z.B. "25.11.2024 - 01.12.2024")
 */
export function formatReportPeriod(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Berlin'
  };

  const start = startDate.toLocaleDateString('de-DE', options);
  const end = endDate.toLocaleDateString('de-DE', options);

  return `${start} - ${end}`;
}

/**
 * Berechnet den Berichtszeitraum basierend auf der Frequenz
 *
 * @param frequency - 'weekly' oder 'monthly'
 * @param referenceDate - Referenzdatum (normalerweise das Versanddatum)
 * @returns Object mit start und end Date
 */
export function calculateReportPeriod(
  frequency: ReportingFrequency,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);

  if (frequency === 'weekly') {
    // Letzte 7 Tage
    start.setDate(start.getDate() - 7);
  } else {
    // Letzter Monat (ca. 30 Tage)
    start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
}

// ========================================
// VALIDATION
// ========================================

/**
 * Prüft, ob das Monitoring-Enddatum überschritten ist
 */
export function isMonitoringExpired(monitoringEndDate: Timestamp): boolean {
  const now = new Date();
  const endDate = monitoringEndDate.toDate();
  return now > endDate;
}

/**
 * Prüft, ob ein Versanddatum erreicht oder überschritten ist
 */
export function isSendDateReached(nextSendAt: Timestamp): boolean {
  const now = new Date();
  const sendDate = nextSendAt.toDate();
  return now >= sendDate;
}

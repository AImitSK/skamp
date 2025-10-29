/**
 * Storage Limit Checker Utility
 *
 * Prüft ob ein Upload innerhalb des Storage-Limits liegt.
 * Wird von allen Upload-Services verwendet.
 */

import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { OrganizationUsage } from '@/types/organization';

export interface StorageLimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  wouldBe: number;
  limitExceeded: boolean;
}

/**
 * Formatiert Bytes in menschenlesbare Form
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes === -1) return 'Unbegrenzt';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Prüft ob ein Upload innerhalb des Storage-Limits liegt
 *
 * @param organizationId - Organization ID
 * @param fileSize - Dateigröße in Bytes
 * @returns StorageLimitCheckResult mit Informationen über das Limit
 */
export async function checkStorageLimit(
  organizationId: string,
  fileSize: number
): Promise<StorageLimitCheckResult> {
  try {
    // Hole aktuelle Usage-Daten aus Firestore
    const usageDoc = await getDoc(
      doc(db, 'organizations', organizationId, 'usage', 'current')
    );

    if (!usageDoc.exists()) {
      // Keine Usage-Daten gefunden - erlaube Upload (Fallback)
      console.warn(`[Storage Limit] Keine Usage-Daten für Organization ${organizationId}`);
      return {
        allowed: true,
        current: 0,
        limit: -1, // Unlimited
        remaining: -1,
        wouldBe: fileSize,
        limitExceeded: false
      };
    }

    const usage = usageDoc.data() as OrganizationUsage;

    // -1 = Unbegrenzter Speicher
    if (usage.storageLimit === -1) {
      return {
        allowed: true,
        current: usage.storageUsed,
        limit: -1,
        remaining: -1,
        wouldBe: usage.storageUsed + fileSize,
        limitExceeded: false
      };
    }

    const wouldBe = usage.storageUsed + fileSize;
    const allowed = wouldBe <= usage.storageLimit;
    const remaining = Math.max(0, usage.storageLimit - usage.storageUsed);
    const limitExceeded = !allowed;

    return {
      allowed,
      current: usage.storageUsed,
      limit: usage.storageLimit,
      remaining,
      wouldBe,
      limitExceeded
    };
  } catch (error) {
    console.error('[Storage Limit] Fehler beim Prüfen des Limits:', error);

    // Bei Fehler: Erlaube Upload (fail-open Strategie)
    // Alternative: fail-closed (blocken bei Fehler)
    return {
      allowed: true,
      current: 0,
      limit: -1,
      remaining: -1,
      wouldBe: fileSize,
      limitExceeded: false
    };
  }
}

/**
 * Generiert eine benutzerfreundliche Fehlermeldung für Limit-Überschreitung
 */
export function generateLimitErrorMessage(result: StorageLimitCheckResult): string {
  const currentFormatted = formatBytes(result.current);
  const limitFormatted = formatBytes(result.limit);
  const remainingFormatted = formatBytes(result.remaining);
  const wouldBeFormatted = formatBytes(result.wouldBe);

  return (
    `Speicher-Limit erreicht!\n\n` +
    `Aktuell verwendet: ${currentFormatted} / ${limitFormatted}\n` +
    `Verfügbar: ${remainingFormatted}\n` +
    `Nach Upload: ${wouldBeFormatted}\n\n` +
    `Bitte upgraden Sie Ihren Plan oder löschen Sie nicht mehr benötigte Dateien.`
  );
}

/**
 * Klasse für verbesserte Error Handling
 */
export class StorageLimitError extends Error {
  constructor(
    message: string,
    public result: StorageLimitCheckResult
  ) {
    super(message);
    this.name = 'StorageLimitError';
  }
}

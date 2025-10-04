/**
 * Matching Settings Service
 *
 * Verwaltet globale Einstellungen für das Matching-System
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { MatchingGlobalSettings, DEFAULT_MATCHING_SETTINGS, AutoScanInterval } from '@/types/matching-settings';

const SETTINGS_DOC_ID = 'matching_global_settings';
const SETTINGS_COLLECTION = 'system_settings';

class MatchingSettingsService {
  /**
   * Lädt die globalen Matching-Einstellungen
   */
  async getSettings(): Promise<MatchingGlobalSettings> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          useAiMerge: data.useAiMerge ?? DEFAULT_MATCHING_SETTINGS.useAiMerge,
          autoScan: {
            enabled: data.autoScan?.enabled ?? DEFAULT_MATCHING_SETTINGS.autoScan.enabled,
            interval: data.autoScan?.interval ?? DEFAULT_MATCHING_SETTINGS.autoScan.interval,
            lastRun: data.autoScan?.lastRun?.toDate?.() ?? undefined,
            nextRun: data.autoScan?.nextRun?.toDate?.() ?? undefined
          },
          autoImport: {
            enabled: data.autoImport?.enabled ?? DEFAULT_MATCHING_SETTINGS.autoImport.enabled,
            minScore: data.autoImport?.minScore ?? DEFAULT_MATCHING_SETTINGS.autoImport.minScore,
            lastRun: data.autoImport?.lastRun?.toDate?.() ?? undefined,
            nextRun: data.autoImport?.nextRun?.toDate?.() ?? undefined
          },
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          updatedBy: data.updatedBy ?? ''
        };
      }

      // Keine Settings vorhanden → Defaults zurückgeben
      return DEFAULT_MATCHING_SETTINGS;
    } catch (error) {
      console.error('Error loading matching settings:', error);
      return DEFAULT_MATCHING_SETTINGS;
    }
  }

  /**
   * Speichert die globalen Matching-Einstellungen
   */
  async saveSettings(
    settings: Partial<MatchingGlobalSettings>,
    userId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);

      await setDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      }, { merge: true });

      console.log('✅ Matching settings saved');
    } catch (error) {
      console.error('Error saving matching settings:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert nur den AI-Merge Toggle
   */
  async updateAiMerge(enabled: boolean, userId: string): Promise<void> {
    await this.saveSettings({ useAiMerge: enabled }, userId);
  }

  /**
   * Aktualisiert die Auto-Scan Einstellungen
   */
  async updateAutoScan(
    enabled: boolean,
    interval: AutoScanInterval,
    userId: string
  ): Promise<void> {
    const nextRun = enabled ? this.calculateNextRun(interval) : undefined;

    await this.saveSettings({
      autoScan: {
        enabled,
        interval,
        nextRun
      }
    }, userId);
  }

  /**
   * Aktualisiert die Auto-Import Einstellungen
   */
  async updateAutoImport(
    enabled: boolean,
    minScore: number,
    userId: string
  ): Promise<void> {
    // Validiere Score
    if (minScore < 0 || minScore > 100) {
      throw new Error('minScore muss zwischen 0 und 100 liegen');
    }

    const nextRun = enabled ? this.calculateNextImportRun() : undefined;

    await this.saveSettings({
      autoImport: {
        enabled,
        minScore,
        nextRun
      }
    }, userId);
  }

  /**
   * Berechnet den nächsten Scan-Zeitpunkt
   */
  private calculateNextRun(interval: AutoScanInterval): Date | undefined {
    if (interval === 'disabled') return undefined;

    const now = new Date();
    const nextRun = new Date(now);

    switch (interval) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        nextRun.setHours(2, 0, 0, 0); // 02:00 Uhr
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + 7);
        nextRun.setHours(2, 0, 0, 0); // 02:00 Uhr
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(1); // Erster des Monats
        nextRun.setHours(2, 0, 0, 0); // 02:00 Uhr
        break;
    }

    return nextRun;
  }

  /**
   * Berechnet den nächsten Import-Zeitpunkt (täglich um 04:00)
   */
  private calculateNextImportRun(): Date {
    const now = new Date();
    const nextRun = new Date(now);

    // Nächster Tag um 04:00 Uhr
    nextRun.setDate(now.getDate() + 1);
    nextRun.setHours(4, 0, 0, 0);

    return nextRun;
  }
}

export const matchingSettingsService = new MatchingSettingsService();

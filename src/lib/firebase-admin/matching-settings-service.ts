/**
 * Matching Settings Service (Admin SDK)
 * Server-side Version für API Routes
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { MatchingGlobalSettings, DEFAULT_MATCHING_SETTINGS } from '@/types/matching-settings';

const SETTINGS_DOC_ID = 'matching_global_settings';
const SETTINGS_COLLECTION = 'system_settings';

/**
 * Lädt die globalen Matching-Einstellungen (Admin SDK)
 */
export async function getSettings(): Promise<MatchingGlobalSettings> {
  try {
    const docRef = adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (!data) return DEFAULT_MATCHING_SETTINGS;

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
    console.log('⚠️ No settings found in Firestore, using defaults');
    return DEFAULT_MATCHING_SETTINGS;
  } catch (error) {
    console.error('❌ Error loading matching settings (Admin SDK):', error);
    return DEFAULT_MATCHING_SETTINGS;
  }
}

/**
 * Speichert die globalen Matching-Einstellungen (Admin SDK)
 */
export async function saveSettings(
  settings: Partial<MatchingGlobalSettings>,
  userId: string
): Promise<void> {
  try {
    const docRef = adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID);

    await docRef.set({
      ...settings,
      updatedAt: new Date(),
      updatedBy: userId
    }, { merge: true });

    console.log('✅ Matching settings saved (Admin SDK)');
  } catch (error) {
    console.error('❌ Error saving matching settings (Admin SDK):', error);
    throw error;
  }
}

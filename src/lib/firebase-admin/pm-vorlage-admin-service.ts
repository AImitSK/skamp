/**
 * PM-Vorlage Admin Service
 *
 * Server-side Service für PM-Vorlage mit Firebase Admin SDK
 * Nur für API Routes / Genkit Flows
 *
 * Firestore-Pfad: projects/{projectId}/strategy/pmVorlage
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { PMVorlage } from '@/types/pm-vorlage';

/**
 * Speichert eine neue PM-Vorlage (mit History)
 */
export async function savePMVorlage(
  projectId: string,
  data: Omit<PMVorlage, 'generatedAt' | 'history'>
): Promise<void> {
  console.log('[PMVorlageAdmin] Saving for project:', projectId);

  try {
    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('strategy')
      .doc('pmVorlage');

    // Prüfe ob Dokument existiert
    const docSnap = await docRef.get();
    const existing = docSnap.exists ? (docSnap.data() as PMVorlage) : null;

    // History vorbereiten
    let history: PMVorlage['history'] = [];

    if (existing) {
      // Aktuelle Version in History verschieben (mit content Wrapper)
      const currentVersion = {
        content: {
          headline: existing.headline,
          leadParagraph: existing.leadParagraph,
          bodyParagraphs: existing.bodyParagraphs,
          quote: existing.quote,
          cta: existing.cta,
          hashtags: existing.hashtags,
          htmlContent: existing.htmlContent,
        },
        generatedAt: existing.generatedAt,
      };

      // Alte History übernehmen (max 2 Einträge behalten + neue = 3)
      history = [currentVersion, ...(existing.history || []).slice(0, 2)];
    }

    const pmVorlageData = {
      ...data,
      history,
      generatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(pmVorlageData);
    console.log('[PMVorlageAdmin] Saved successfully');
  } catch (error) {
    console.error('[PMVorlageAdmin] Error saving:', error);
    throw error;
  }
}

/**
 * Lädt eine PM-Vorlage
 */
export async function getPMVorlage(
  projectId: string
): Promise<PMVorlage | null> {
  try {
    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('strategy')
      .doc('pmVorlage');

    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data() as PMVorlage;
    }
    return null;
  } catch (error) {
    console.error('[PMVorlageAdmin] Error getting:', error);
    return null;
  }
}

/**
 * Löscht eine PM-Vorlage
 */
export async function deletePMVorlage(projectId: string): Promise<void> {
  console.log('[PMVorlageAdmin] Deleting for project:', projectId);

  try {
    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('strategy')
      .doc('pmVorlage');

    await docRef.delete();
    console.log('[PMVorlageAdmin] Deleted successfully');
  } catch (error) {
    console.error('[PMVorlageAdmin] Error deleting:', error);
    throw error;
  }
}

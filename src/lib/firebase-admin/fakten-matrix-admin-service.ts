/**
 * Fakten-Matrix Admin Service
 *
 * Server-side Service für Fakten-Matrix mit Firebase Admin SDK
 * Nur für API Routes / Genkit Flows
 *
 * Firestore-Pfad: projects/{projectId}/strategy/faktenMatrix
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { FaktenMatrix, FaktenMatrixCreateData } from '@/types/fakten-matrix';

/**
 * Speichert eine Fakten-Matrix (erstellt oder aktualisiert)
 */
export async function saveFaktenMatrix(
  projectId: string,
  data: FaktenMatrixCreateData
): Promise<void> {
  console.log('[FaktenMatrixAdmin] Saving for project:', projectId);

  try {
    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('strategy')
      .doc('faktenMatrix');

    // Prüfe ob Dokument existiert
    const docSnap = await docRef.get();
    const exists = docSnap.exists;

    const faktenMatrixData = {
      hook: data.hook,
      details: data.details,
      quote: data.quote,
      updatedAt: FieldValue.serverTimestamp(),
      ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };

    if (exists) {
      await docRef.update(faktenMatrixData);
      console.log('[FaktenMatrixAdmin] Updated existing document');
    } else {
      await docRef.set(faktenMatrixData);
      console.log('[FaktenMatrixAdmin] Created new document');
    }
  } catch (error) {
    console.error('[FaktenMatrixAdmin] Error saving:', error);
    throw error;
  }
}

/**
 * Lädt eine Fakten-Matrix
 */
export async function getFaktenMatrix(
  projectId: string
): Promise<FaktenMatrix | null> {
  try {
    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('strategy')
      .doc('faktenMatrix');

    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data() as FaktenMatrix;
    }
    return null;
  } catch (error) {
    console.error('[FaktenMatrixAdmin] Error getting:', error);
    return null;
  }
}

/**
 * Prüft ob eine Fakten-Matrix existiert
 */
export async function faktenMatrixExists(projectId: string): Promise<boolean> {
  try {
    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('strategy')
      .doc('faktenMatrix');

    const docSnap = await docRef.get();
    return docSnap.exists;
  } catch (error) {
    console.error('[FaktenMatrixAdmin] Error checking existence:', error);
    return false;
  }
}

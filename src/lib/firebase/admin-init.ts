/**
 * Firebase Admin SDK Initialisierung
 * Nur für Server-Side Code (API Routes)
 */

import * as admin from 'firebase-admin';

// Prüfe ob Admin SDK bereits initialisiert wurde
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable not set');
  }

  try {
    const serviceAccountJSON = JSON.parse(serviceAccount);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJSON),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;

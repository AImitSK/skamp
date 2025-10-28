/**
 * Firebase Admin SDK Initialisierung
 * Nur für Server-Side Code (API Routes)
 */

import * as admin from 'firebase-admin';

console.log('🔧 Initializing Firebase Admin SDK...');
console.log('🔍 Environment check:', {
  hasServiceAccount: !!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT,
  hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appsLength: admin.apps.length
});

// Prüfe ob Admin SDK bereits initialisiert wurde
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    const error = new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable not set');
    console.error('❌', error.message);
    throw error;
  }

  try {
    const serviceAccountJSON = JSON.parse(serviceAccount);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJSON),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
} else {
  console.log('ℹ️ Firebase Admin SDK already initialized');
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
export default admin;

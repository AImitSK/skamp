/**
 * Super Admin Service
 *
 * Plan 04: Auth-Prüfung für Admin-API-Endpoints
 * Zentrale Logik für Super-Admin Authentifizierung
 */

import { getAuth } from 'firebase-admin/auth';
import { NextRequest } from 'next/server';
import '@/lib/firebase/admin-init';

// Super-Admin E-Mail-Liste
// Diese E-Mails haben Zugriff auf Admin-APIs
const SUPER_ADMIN_EMAILS = [
  'admin@celeropress.com',
  'skuehne@posteo.de',
  // Weitere E-Mails hier hinzufügen
];

/**
 * Prüft ob ein User Super-Admin ist
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const auth = getAuth();
    const user = await auth.getUser(userId);

    // Prüfe ob E-Mail in der Liste ist
    return SUPER_ADMIN_EMAILS.includes(user.email || '');
  } catch (error) {
    console.error('[SuperAdmin] Check failed:', error);
    return false;
  }
}

/**
 * Verifiziert einen Admin-Request und gibt User-ID zurück
 */
export async function verifyAdminRequest(request: NextRequest): Promise<{
  isValid: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    // Token aus Header extrahieren
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return { isValid: false, error: 'No token provided' };
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    const isSuperAdminUser = await isSuperAdmin(decodedToken.uid);

    if (!isSuperAdminUser) {
      console.warn(`[SuperAdmin] Access denied for user: ${decodedToken.uid}`);
      return { isValid: false, error: 'Not a super admin' };
    }

    return { isValid: true, userId: decodedToken.uid };
  } catch (error: any) {
    console.error('[SuperAdmin] Token verification failed:', error.message);
    return { isValid: false, error: 'Invalid token' };
  }
}

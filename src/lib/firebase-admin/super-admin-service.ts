/**
 * Super Admin Service
 *
 * Plan 04: Auth-Prüfung für Admin-API-Endpoints
 * Zentrale Logik für Super-Admin Authentifizierung
 *
 * LOGIK: Alle Mitglieder der Super-Admin Organization sind Super-Admins
 * (basiert auf info@sk-online-marketing.de's Organisation)
 */

import { getAuth } from 'firebase-admin/auth';
import { NextRequest } from 'next/server';
import '@/lib/firebase/admin-init';
import { isSuperAdmin } from '@/lib/api/super-admin-check';

// Re-export für Kompatibilität
export { isSuperAdmin };

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

    // Nutze bestehende Super-Admin Logik (Organisation-basiert)
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

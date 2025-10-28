/**
 * Super-Admin Organizations API
 * GET /api/super-admin/organizations - Alle Organizations mit Account Type laden
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { isSuperAdmin } from '@/lib/api/super-admin-check';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { Organization } from '@/types/organization';

/**
 * GET - Alle Organizations laden
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Super-Admin Check
    const isSA = await isSuperAdmin(auth.userId);

    if (!isSA) {
      return NextResponse.json(
        { error: 'Unauthorized - Super-Admin access required' },
        { status: 403 }
      );
    }

    try {
      // Alle Organizations aus Firestore laden
      const orgsSnapshot = await adminDb.collection('organizations').get();

      const organizations: Organization[] = [];

      for (const doc of orgsSnapshot.docs) {
        const data = doc.data();

        organizations.push({
          id: doc.id,
          name: data.name || 'Unbekannt',
          adminEmail: data.adminEmail || '',
          accountType: data.accountType || 'regular',
          tier: data.tier || 'STARTER',
          promoDetails: data.promoDetails || undefined,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }

      // Sortiere nach Name
      organizations.sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({
        success: true,
        organizations,
        total: organizations.length,
      });
    } catch (error: any) {
      console.error('Error loading organizations:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Get Current Subscription API Route
 * Returns the current subscription tier for the user's organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Get organization
      const orgDoc = await adminDb.collection('organizations').doc(auth.organizationId).get();

      if (!orgDoc.exists) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const orgData = orgDoc.data();

      return NextResponse.json({
        tier: orgData?.tier || 'STARTER',
        accountType: orgData?.accountType || 'regular',
        stripeCustomerId: orgData?.stripeCustomerId || null,
        stripeSubscriptionId: orgData?.stripeSubscriptionId || null,
      });
    } catch (error: any) {
      console.error('Error fetching current subscription:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch subscription' },
        { status: 500 }
      );
    }
  });
}

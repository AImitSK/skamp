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
      console.log('[Subscription API] Getting subscription for org:', auth.organizationId);

      // Get organization
      const orgDoc = await adminDb.collection('organizations').doc(auth.organizationId).get();

      console.log('[Subscription API] Org exists:', orgDoc.exists);

      if (!orgDoc.exists) {
        console.log('[Subscription API] Organization not found, returning defaults');
        // Return defaults if no organization exists yet
        return NextResponse.json({
          tier: 'STARTER',
          accountType: 'regular',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        });
      }

      const orgData = orgDoc.data();
      console.log('[Subscription API] Org data tier:', orgData?.tier);

      return NextResponse.json({
        tier: orgData?.tier || 'STARTER',
        accountType: orgData?.accountType || 'regular',
        stripeCustomerId: orgData?.stripeCustomerId || null,
        stripeSubscriptionId: orgData?.stripeSubscriptionId || null,
      });
    } catch (error: any) {
      console.error('[Subscription API] Error fetching current subscription:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch subscription' },
        { status: 500 }
      );
    }
  });
}

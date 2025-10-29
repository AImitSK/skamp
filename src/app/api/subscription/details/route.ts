/**
 * Subscription Details API
 * GET /api/subscription/details
 *
 * Returns Stripe subscription details (currentPeriodEnd, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Load subscription from Firestore
      const subDoc = await adminDb
        .collection('subscriptions')
        .doc(auth.organizationId)
        .get();

      if (!subDoc.exists) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        );
      }

      const subData = subDoc.data();

      // Convert Firestore timestamps to Date objects
      const subscription = {
        currentPeriodEnd: subData?.currentPeriodEnd?.toDate
          ? subData.currentPeriodEnd.toDate()
          : subData?.currentPeriodEnd
          ? new Date(subData.currentPeriodEnd)
          : undefined,
        currentPeriodStart: subData?.currentPeriodStart?.toDate
          ? subData.currentPeriodStart.toDate()
          : subData?.currentPeriodStart
          ? new Date(subData.currentPeriodStart)
          : undefined,
        cancelAtPeriodEnd: subData?.cancelAtPeriodEnd || false,
        status: subData?.status || 'active',
      };

      return NextResponse.json({ subscription });
    } catch (error: any) {
      console.error('[Subscription Details API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription details' },
        { status: 500 }
      );
    }
  });
}

/**
 * Reactivate Subscription API Route
 * POST /api/subscription/reactivate
 *
 * Reactivates a canceled subscription (undoes cancel_at_period_end)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { reactivateSubscription } from '@/lib/stripe/stripe-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Fetch organization to get Stripe Subscription ID
      const orgDoc = await adminDb
        .collection('organizations')
        .doc(auth.organizationId)
        .get();

      if (!orgDoc.exists) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      const orgData = orgDoc.data();
      const stripeSubscriptionId = orgData?.stripeSubscriptionId;

      if (!stripeSubscriptionId) {
        return NextResponse.json(
          { error: 'No subscription found' },
          { status: 400 }
        );
      }

      // Reactivate subscription in Stripe
      const subscription = await reactivateSubscription(stripeSubscriptionId);

      console.log('[Reactivate API] Subscription reactivated:', {
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end,
      });

      // Update subscription document in Firestore
      const subscriptionRef = adminDb
        .collection('subscriptions')
        .doc(auth.organizationId);

      const subscriptionDoc = await subscriptionRef.get();

      if (subscriptionDoc.exists) {
        await subscriptionRef.update({
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription erfolgreich reaktiviert',
      });
    } catch (error: any) {
      console.error('[Reactivate API] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to reactivate subscription' },
        { status: 500 }
      );
    }
  });
}

/**
 * Cancel Subscription API Route
 * POST /api/subscription/cancel
 *
 * Cancels the user's subscription at the end of the billing period
 * Sets cancel_at_period_end = true in Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { cancelSubscription } from '@/lib/stripe/stripe-service';

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
          { error: 'No active subscription found' },
          { status: 400 }
        );
      }

      // Cancel subscription in Stripe (at period end)
      const subscription = await cancelSubscription(stripeSubscriptionId);

      console.log('[Cancel API] Subscription canceled:', {
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
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription wird zum Ende der Billing Period gekündigt',
        cancelAt: new Date(subscription.current_period_end * 1000).toISOString(),
      });
    } catch (error: any) {
      console.error('[Cancel API] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to cancel subscription' },
        { status: 500 }
      );
    }
  });
}

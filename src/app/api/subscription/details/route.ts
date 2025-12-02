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

      // FALLBACK: If subscriptions doc doesn't exist, try to create it from Stripe
      if (!subDoc.exists) {
        console.log('[Subscription Details] No subscriptions doc found, trying to create from Stripe');

        // Get organization to find stripeSubscriptionId
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
        const tier = orgData?.tier;

        if (!stripeSubscriptionId || !tier) {
          return NextResponse.json(
            { error: 'No subscription found' },
            { status: 404 }
          );
        }

        // Fetch from Stripe and create subscriptions document
        try {
          const { getSubscription } = await import('@/lib/stripe/stripe-service');
          const stripeSubscription = await getSubscription(stripeSubscriptionId);

          if (!stripeSubscription) {
            return NextResponse.json(
              { error: 'Subscription not found in Stripe' },
              { status: 404 }
            );
          }

          const { FieldValue } = await import('firebase-admin/firestore');

          const priceItem = stripeSubscription.items.data[0];
          const price = priceItem?.price;

          if (!price) {
            console.error('[Subscription Details] No price found in Stripe subscription');
            return NextResponse.json(
              { error: 'Invalid subscription data' },
              { status: 500 }
            );
          }

          const subscriptionData: any = {
            organizationId: auth.organizationId,
            stripeCustomerId: stripeSubscription.customer as string,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: price.id,
            tier: tier,
            status: stripeSubscription.status,
            currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            pricePerMonth: (price.unit_amount || 0) / 100,
            billingInterval: price.recurring?.interval || 'month',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          // Optional fields
          if (stripeSubscription.trial_start) {
            subscriptionData.trialStart = new Date(stripeSubscription.trial_start * 1000);
          }
          if (stripeSubscription.trial_end) {
            subscriptionData.trialEnd = new Date(stripeSubscription.trial_end * 1000);
          }

          await adminDb
            .collection('subscriptions')
            .doc(auth.organizationId)
            .set(subscriptionData);

          console.log('[Subscription Details] Created missing subscriptions document from Stripe');

          // Return the newly created data
          const subscription = {
            currentPeriodEnd: subscriptionData.currentPeriodEnd,
            currentPeriodStart: subscriptionData.currentPeriodStart,
            cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
            status: subscriptionData.status,
          };

          return NextResponse.json({ subscription });
        } catch (error: any) {
          console.error('[Subscription Details] Failed to create subscriptions doc:', error);
          return NextResponse.json(
            { error: 'Failed to fetch subscription from Stripe' },
            { status: 500 }
          );
        }
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

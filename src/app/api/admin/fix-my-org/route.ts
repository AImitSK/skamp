/**
 * ADMIN: Fix current user's organization
 * Simpler version - just fixes the logged-in user's org
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { stripe } from '@/lib/stripe/stripe-service';

export async function POST(request: NextRequest) {
  try {
    return await withAuth(request, async (req, auth: AuthContext) => {
      console.log('[Fix My Org] User:', auth.userId, 'OrgID:', auth.organizationId);

      // Get organization
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
      console.log('[Fix My Org] Organization data:', {
        id: orgDoc.id,
        stripeCustomerId: orgData?.stripeCustomerId,
        stripeSubscriptionId: orgData?.stripeSubscriptionId,
        accountType: orgData?.accountType,
      });

      // Check if already has subscription ID
      if (orgData?.stripeSubscriptionId) {
        return NextResponse.json({
          success: true,
          message: 'Organization already has stripeSubscriptionId',
          data: {
            stripeCustomerId: orgData.stripeCustomerId,
            stripeSubscriptionId: orgData.stripeSubscriptionId,
          },
        });
      }

      // Check if has customer ID
      if (!orgData?.stripeCustomerId) {
        return NextResponse.json(
          { error: 'No stripeCustomerId found. Did you complete a checkout?' },
          { status: 400 }
        );
      }

      // Fetch subscriptions from Stripe
      console.log('[Fix My Org] Fetching subscriptions from Stripe for customer:', orgData.stripeCustomerId);
      const subscriptions = await stripe.subscriptions.list({
        customer: orgData.stripeCustomerId,
        limit: 1,
        status: 'active',
      });

      console.log('[Fix My Org] Found subscriptions:', subscriptions.data.length);

      if (subscriptions.data.length === 0) {
        return NextResponse.json(
          { error: 'No active subscription found in Stripe for this customer' },
          { status: 400 }
        );
      }

      const subscription = subscriptions.data[0];
      console.log('[Fix My Org] Subscription ID:', subscription.id);

      // Update organization
      await orgDoc.ref.update({
        stripeSubscriptionId: subscription.id,
        updatedAt: new Date(),
      });

      console.log('[Fix My Org] Successfully updated organization');

      return NextResponse.json({
        success: true,
        message: 'Organization fixed!',
        data: {
          stripeCustomerId: orgData.stripeCustomerId,
          stripeSubscriptionId: subscription.id,
        },
      });
    });
  } catch (error: any) {
    console.error('[Fix My Org] Error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

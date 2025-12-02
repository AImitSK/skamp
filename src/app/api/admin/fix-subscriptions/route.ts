/**
 * ADMIN: Fix Organizations with missing stripeSubscriptionId
 * Fetches all organizations and syncs subscription data from Stripe
 *
 * Usage: POST /api/admin/fix-subscriptions
 * Auth: Requires Super-Admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { stripe } from '@/lib/stripe/stripe-service';

export async function POST(request: NextRequest) {
  try {
    return await withAuth(request, async (req, auth: AuthContext) => {
      console.log('[Fix Subscriptions] Starting fix process');

      // Check if Super-Admin
      console.log('[Fix Subscriptions] Checking super-admin status for:', auth.userId);
      const userMembershipsQuery = await adminDb
        .collection('users')
        .doc(auth.userId)
        .collection('memberships')
        .where('organizationId', '==', 'super-admin')
        .where('role', '==', 'super-admin')
        .limit(1)
        .get();

      if (userMembershipsQuery.empty) {
        console.log('[Fix Subscriptions] User is not super-admin');
        return NextResponse.json(
          { error: 'Unauthorized - Super-Admin required' },
          { status: 403 }
        );
      }

      console.log('[Fix Subscriptions] User is super-admin, proceeding...');

      try {
      const results = {
        total: 0,
        fixed: 0,
        skipped: 0,
        errors: 0,
        details: [] as any[],
      };

      // Get all organizations with stripeCustomerId but without stripeSubscriptionId
      const orgsSnapshot = await adminDb
        .collection('organizations')
        .where('accountType', '==', 'regular')
        .get();

      results.total = orgsSnapshot.size;

      for (const orgDoc of orgsSnapshot.docs) {
        const orgData = orgDoc.data();
        const orgId = orgDoc.id;

        // Skip if already has subscription ID
        if (orgData.stripeSubscriptionId) {
          results.skipped++;
          continue;
        }

        // Skip if no Stripe customer
        if (!orgData.stripeCustomerId) {
          results.skipped++;
          results.details.push({
            orgId,
            status: 'skipped',
            reason: 'No stripeCustomerId',
          });
          continue;
        }

        try {
          // Fetch subscriptions from Stripe
          const subscriptions = await stripe.subscriptions.list({
            customer: orgData.stripeCustomerId,
            limit: 1,
            status: 'active',
          });

          if (subscriptions.data.length === 0) {
            results.details.push({
              orgId,
              status: 'no_subscription',
              reason: 'No active subscription in Stripe',
            });
            results.skipped++;
            continue;
          }

          const subscription = subscriptions.data[0];

          // Update organization with subscription ID
          await orgDoc.ref.update({
            stripeSubscriptionId: subscription.id,
            updatedAt: new Date(),
          });

          results.fixed++;
          results.details.push({
            orgId,
            status: 'fixed',
            subscriptionId: subscription.id,
          });

          console.log(`[Fix Subscriptions] Fixed ${orgId} with subscription ${subscription.id}`);
        } catch (error: any) {
          results.errors++;
          results.details.push({
            orgId,
            status: 'error',
            error: error.message,
          });
          console.error(`[Fix Subscriptions] Error fixing ${orgId}:`, error);
        }
      }

      console.log('[Fix Subscriptions] Completed:', results);

      return NextResponse.json({
        success: true,
        results,
      });
    } catch (error: any) {
      console.error('[Fix Subscriptions] Inner error:', error);
      return NextResponse.json(
        { error: error.message, stack: error.stack },
        { status: 500 }
      );
    }
    });
  } catch (error: any) {
    console.error('[Fix Subscriptions] Outer error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

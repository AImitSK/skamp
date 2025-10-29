/**
 * Change Plan API Route
 * Changes the subscription tier (upgrade or downgrade)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { updateSubscriptionTier } from '@/lib/stripe/stripe-service';
import { updateUsageLimits } from '@/lib/usage/usage-tracker';
import { SubscriptionTier } from '@/config/subscription-limits';

interface ChangePlanRequest {
  newTier: SubscriptionTier;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      console.log('[Change Plan API] Request for org:', auth.organizationId);

      const body: ChangePlanRequest = await req.json();
      const { newTier } = body;

      if (!newTier) {
        return NextResponse.json(
          { error: 'newTier ist erforderlich' },
          { status: 400 }
        );
      }

      // Validate tier
      if (!['STARTER', 'BUSINESS', 'AGENTUR'].includes(newTier)) {
        return NextResponse.json({ error: 'Ungültiges Tier' }, { status: 400 });
      }

      // Get organization
      const orgRef = adminDb.collection('organizations').doc(auth.organizationId);
      const orgDoc = await orgRef.get();

      if (!orgDoc.exists) {
        return NextResponse.json(
          { error: 'Organization nicht gefunden' },
          { status: 404 }
        );
      }

      const orgData = orgDoc.data();
      const currentTier = orgData?.tier;
      const stripeSubscriptionId = orgData?.stripeSubscriptionId;

      if (!stripeSubscriptionId) {
        return NextResponse.json(
          { error: 'Keine aktive Subscription gefunden' },
          { status: 400 }
        );
      }

      // Check if tier is actually changing
      if (currentTier === newTier) {
        return NextResponse.json(
          { error: 'Neuer Plan ist identisch mit aktuellem Plan' },
          { status: 400 }
        );
      }

      console.log(`[Change Plan API] Changing from ${currentTier} to ${newTier}`);

      // Update Stripe subscription
      // Note: billing interval stays the same (monthly or yearly)
      const billingInterval = orgData?.billingInterval || 'month';

      const updatedSubscription = await updateSubscriptionTier(
        stripeSubscriptionId,
        newTier,
        billingInterval
      );

      console.log('[Change Plan API] Stripe subscription updated:', updatedSubscription.id);

      // Update organization in Firestore
      await orgRef.update({
        tier: newTier,
        updatedAt: new Date(),
      });

      console.log('[Change Plan API] Organization updated in Firestore');

      // Update usage limits based on new tier
      await updateUsageLimits(auth.organizationId, newTier);

      console.log('[Change Plan API] Usage limits updated for new tier');

      return NextResponse.json({
        success: true,
        newTier,
        message: `Plan erfolgreich zu ${newTier} geändert`,
      });
    } catch (error: any) {
      console.error('[Change Plan API] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to change plan' },
        { status: 500 }
      );
    }
  });
}

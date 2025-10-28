/**
 * Create Checkout Session API Route
 * Creates a Stripe Checkout Session for a new subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { createStripeCustomer, createCheckoutSession } from '@/lib/stripe/stripe-service';
import { SubscriptionTier } from '@/config/subscription-limits';

interface CreateCheckoutRequest {
  tier: SubscriptionTier;
  billingInterval: 'monthly' | 'yearly';
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body: CreateCheckoutRequest = await req.json();
      const { tier, billingInterval } = body;

      if (!tier || !billingInterval) {
        return NextResponse.json(
          { error: 'Tier und Billing Interval sind erforderlich' },
          { status: 400 }
        );
      }

      // Validate tier
      if (!['STARTER', 'BUSINESS', 'AGENTUR'].includes(tier)) {
        return NextResponse.json({ error: 'Ungültiges Tier' }, { status: 400 });
      }

      // Validate billing interval
      if (!['monthly', 'yearly'].includes(billingInterval)) {
        return NextResponse.json({ error: 'Ungültiges Billing Interval' }, { status: 400 });
      }

      // Get organization
      const orgDoc = await adminDb.collection('organizations').doc(auth.organizationId).get();

      if (!orgDoc.exists) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const orgData = orgDoc.data();
      let stripeCustomerId = orgData?.stripeCustomerId;

      // Create Stripe Customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await createStripeCustomer({
          email: auth.email || orgData?.adminEmail,
          name: orgData?.name || 'Unknown Organization',
          organizationId: auth.organizationId,
        });

        stripeCustomerId = customer.id;

        // Update organization with Stripe Customer ID
        await adminDb
          .collection('organizations')
          .doc(auth.organizationId)
          .update({
            stripeCustomerId,
            updatedAt: new Date(),
          });
      }

      // Create Checkout Session
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const session = await createCheckoutSession({
        organizationId: auth.organizationId,
        tier,
        billingInterval: billingInterval === 'monthly' ? 'month' : 'year',
        successUrl: `${baseUrl}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/dashboard/subscription/cancel`,
      });

      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create checkout session' },
        { status: 500 }
      );
    }
  });
}

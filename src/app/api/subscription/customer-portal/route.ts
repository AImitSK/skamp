/**
 * Customer Portal API Route
 * POST /api/subscription/customer-portal
 *
 * Creates a Stripe Customer Portal session and returns the URL
 * Allows customers to manage payment methods, view invoices, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { createCustomerPortalSession } from '@/lib/stripe/stripe-service';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Fetch organization to get Stripe Customer ID
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
      const stripeCustomerId = orgData?.stripeCustomerId;

      if (!stripeCustomerId) {
        return NextResponse.json(
          { error: 'No Stripe customer found. Please subscribe first.' },
          { status: 400 }
        );
      }

      // Create return URL (dynamic for Preview deployments)
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const returnUrl = `${protocol}://${host}/dashboard/admin/billing`;

      // Create Customer Portal Session
      const session = await createCustomerPortalSession(
        { organizationId: auth.organizationId, returnUrl },
        stripeCustomerId
      );

      return NextResponse.json({ url: session.url });
    } catch (error: any) {
      console.error('[Customer Portal API] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create customer portal session' },
        { status: 500 }
      );
    }
  });
}

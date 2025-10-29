/**
 * Create Checkout Session for Pending Signup
 *
 * Erstellt eine Stripe Checkout Session für einen pending_signup.
 * OHNE Auth - verwendet Token statt User ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { createStripeCustomer, createCheckoutSessionForPendingSignup } from '@/lib/stripe/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token ist erforderlich' },
        { status: 400 }
      );
    }

    // Lade pending_signup
    const pendingSignupDoc = await adminDb
      .collection('pending_signups')
      .doc(token)
      .get();

    if (!pendingSignupDoc.exists) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Token' },
        { status: 404 }
      );
    }

    const pendingSignup = pendingSignupDoc.data() as any;

    // Prüfe ob expired
    const expiresAt = pendingSignup.expiresAt?.toDate?.() || new Date(pendingSignup.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Token ist abgelaufen (24h überschritten)' },
        { status: 410 }
      );
    }

    // Prüfe ob bereits completed
    if (pendingSignup.status === 'completed') {
      return NextResponse.json(
        { error: 'Dieser Signup wurde bereits abgeschlossen' },
        { status: 400 }
      );
    }

    // Erstelle Stripe Customer falls noch nicht vorhanden
    let stripeCustomerId = pendingSignup.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await createStripeCustomer({
        email: pendingSignup.email,
        name: pendingSignup.companyName,
        metadata: {
          pendingSignupToken: token,
          provider: pendingSignup.provider
        }
      });

      stripeCustomerId = customer.id;

      // Speichere Stripe Customer ID
      await adminDb
        .collection('pending_signups')
        .doc(token)
        .update({
          stripeCustomerId,
          updatedAt: new Date()
        });
    }

    // Erstelle Checkout Session
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const session = await createCheckoutSessionForPendingSignup({
      customerId: stripeCustomerId,
      tier: pendingSignup.tier,
      billingInterval: pendingSignup.billingInterval === 'monthly' ? 'month' : 'year',
      successUrl: `${baseUrl}/signup/success?token=${token}`,
      cancelUrl: `${baseUrl}/signup/cancel?token=${token}`,
      metadata: {
        pendingSignupToken: token,
        provider: pendingSignup.provider,
        email: pendingSignup.email,
        companyName: pendingSignup.companyName,
        tier: pendingSignup.tier
      }
    });

    console.log(`[Checkout Session] Created for pending signup: ${token}`);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    console.error('[Checkout Session] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

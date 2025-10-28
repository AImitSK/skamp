/**
 * Stripe Webhooks Handler
 * Empfängt und verarbeitet Stripe Webhook Events
 *
 * SETUP:
 * 1. Stripe Dashboard → Developers → Webhooks
 * 2. Add endpoint: https://yourdomain.com/api/stripe/webhooks
 * 3. Select events: customer.subscription.*, invoice.*, checkout.session.completed
 * 4. Copy Signing Secret → .env STRIPE_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { constructWebhookEvent } from '@/lib/stripe/stripe-service';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { OrganizationSubscription, SubscriptionStatus } from '@/types/subscription';
import { SubscriptionTier } from '@/config/subscription-limits';

// Disable body parsing, need raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify and construct event
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(rawBody, signature);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handle: checkout.session.completed
 * Wird aufgerufen wenn ein Kunde die Checkout-Session erfolgreich abgeschlossen hat
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('[Stripe Webhook] Checkout session completed:', session.id);

  const organizationId = session.client_reference_id || session.metadata?.organizationId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!organizationId) {
    console.error('[Stripe Webhook] No organizationId in checkout session');
    return;
  }

  // Update Organization with Stripe Customer ID AND Subscription ID
  await adminDb
    .collection('organizations')
    .doc(organizationId)
    .update({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: FieldValue.serverTimestamp(),
    });

  console.log(`[Stripe Webhook] Updated organization ${organizationId} with customer ${customerId} and subscription ${subscriptionId}`);
}

/**
 * Handle: customer.subscription.created
 * Neue Subscription wurde erstellt
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('[Stripe Webhook] Subscription created:', subscription.id);

  const organizationId = subscription.metadata.organizationId;
  const tier = subscription.metadata.tier as SubscriptionTier;

  if (!organizationId || !tier) {
    console.error('[Stripe Webhook] Missing metadata in subscription');
    return;
  }

  // Create subscription document
  const subscriptionData = mapStripeSubscriptionToFirestore(subscription, organizationId, tier);

  await adminDb
    .collection('subscriptions')
    .doc(organizationId)
    .set(subscriptionData);

  // Update Organization
  await adminDb
    .collection('organizations')
    .doc(organizationId)
    .update({
      tier,
      stripeSubscriptionId: subscription.id,
      accountType: 'regular',
      updatedAt: FieldValue.serverTimestamp(),
    });

  console.log(`[Stripe Webhook] Created subscription for organization ${organizationId}`);
}

/**
 * Handle: customer.subscription.updated
 * Subscription wurde geändert (Tier-Wechsel, Kündigung, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('[Stripe Webhook] Subscription updated:', subscription.id);

  const organizationId = subscription.metadata.organizationId;
  const tier = subscription.metadata.tier as SubscriptionTier;

  if (!organizationId || !tier) {
    console.error('[Stripe Webhook] Missing metadata in subscription');
    return;
  }

  // Update subscription document
  const subscriptionData = mapStripeSubscriptionToFirestore(subscription, organizationId, tier);

  await adminDb
    .collection('subscriptions')
    .doc(organizationId)
    .update({
      ...subscriptionData,
      updatedAt: FieldValue.serverTimestamp(),
    });

  // Update Organization if tier changed
  await adminDb
    .collection('organizations')
    .doc(organizationId)
    .update({
      tier,
      updatedAt: FieldValue.serverTimestamp(),
    });

  console.log(`[Stripe Webhook] Updated subscription for organization ${organizationId}`);
}

/**
 * Handle: customer.subscription.deleted
 * Subscription wurde gelöscht/gekündigt
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[Stripe Webhook] Subscription deleted:', subscription.id);

  const organizationId = subscription.metadata.organizationId;

  if (!organizationId) {
    console.error('[Stripe Webhook] Missing organizationId in subscription metadata');
    return;
  }

  // Update subscription document
  await adminDb
    .collection('subscriptions')
    .doc(organizationId)
    .update({
      status: 'canceled' as SubscriptionStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

  // TODO Phase 2: Entscheiden was mit der Organization passiert
  // Option 1: Downgrade zu STARTER (kostenlos/trial)
  // Option 2: Account deaktivieren
  // Option 3: Grace Period gewähren

  console.log(`[Stripe Webhook] Marked subscription as canceled for ${organizationId}`);
}

/**
 * Handle: invoice.paid
 * Rechnung wurde bezahlt
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('[Stripe Webhook] Invoice paid:', invoice.id);

  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return; // Keine Subscription-Invoice
  }

  // TODO Phase 2: Usage-Metriken zurücksetzen für neuen Billing Cycle
  // TODO Phase 2: Email-Benachrichtigung an Admin

  console.log(`[Stripe Webhook] Invoice paid for subscription ${subscriptionId}`);
}

/**
 * Handle: invoice.payment_failed
 * Zahlung fehlgeschlagen
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.error('[Stripe Webhook] Invoice payment failed:', invoice.id);

  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  // TODO Phase 2: Email-Benachrichtigung an Admin
  // TODO Phase 2: Account ggf. einschränken nach mehreren Fehlversuchen

  console.error(`[Stripe Webhook] Payment failed for subscription ${subscriptionId}`);
}

/**
 * Helper: Map Stripe Subscription to Firestore Document
 */
function mapStripeSubscriptionToFirestore(
  subscription: Stripe.Subscription,
  organizationId: string,
  tier: SubscriptionTier
): Omit<OrganizationSubscription, 'createdAt' | 'updatedAt'> {
  const priceItem = subscription.items.data[0];
  const price = priceItem.price;

  return {
    organizationId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: price.id,
    tier,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: new Date(subscription.current_period_start * 1000) as any,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000) as any,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    pricePerMonth: (price.unit_amount || 0) / 100, // Cents to EUR
    billingInterval: price.recurring?.interval as 'month' | 'year',
    trialStart: subscription.trial_start
      ? (new Date(subscription.trial_start * 1000) as any)
      : undefined,
    trialEnd: subscription.trial_end ? (new Date(subscription.trial_end * 1000) as any) : undefined,
  };
}

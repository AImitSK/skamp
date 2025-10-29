/**
 * Stripe Service - Server-Side Only
 * Handles all Stripe API interactions
 *
 * WICHTIG: Nur auf dem Server verwenden (API Routes, Server Components)
 * NIEMALS im Client verwenden (würde Secret Key exposen)
 */

import Stripe from 'stripe';
import { SubscriptionTier } from '@/config/subscription-limits';
import { CheckoutSessionRequest, CustomerPortalRequest } from '@/types/subscription';

// Lazy Stripe initialization (only when actually used)
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY ist nicht in den Environment Variables definiert');
    }

    stripeInstance = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }

  return stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get: (target, prop) => {
    return (getStripe() as any)[prop];
  },
});

/**
 * Create Stripe Customer
 * Wird beim Onboarding einer neuen Organization aufgerufen
 */
export async function createStripeCustomer(params: {
  email: string;
  name: string;
  organizationId?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  const metadata = params.metadata || {};

  if (params.organizationId) {
    metadata.organizationId = params.organizationId;
  }

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata,
  });

  return customer;
}

/**
 * Get Stripe Customer by ID
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer as Stripe.Customer;
  } catch (error) {
    console.error('Error retrieving Stripe customer:', error);
    return null;
  }
}

/**
 * Create Checkout Session
 * Erstellt eine Stripe Checkout Session für eine neue Subscription
 *
 * WICHTIG: Price IDs müssen in Stripe Dashboard konfiguriert werden
 * Siehe: docs/stripe/phase-1-stripe-setup.md
 */
export async function createCheckoutSession(
  request: CheckoutSessionRequest
): Promise<Stripe.Checkout.Session> {
  // TODO Phase 2: Price IDs aus Environment Variables oder Database laden
  const priceId = getPriceIdForTier(request.tier, request.billingInterval);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    client_reference_id: request.organizationId,
    metadata: {
      organizationId: request.organizationId,
      tier: request.tier,
    },
    subscription_data: {
      metadata: {
        organizationId: request.organizationId,
        tier: request.tier,
      },
    },
  });

  return session;
}

/**
 * Create Checkout Session for Pending Signup
 * Spezielle Version für pending signups - verwendet Customer ID statt Organization ID
 */
export async function createCheckoutSessionForPendingSignup(params: {
  customerId: string;
  tier: SubscriptionTier;
  billingInterval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const priceId = getPriceIdForTier(params.tier, params.billingInterval);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: params.customerId,
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.metadata.pendingSignupToken,
    metadata: params.metadata,
    subscription_data: {
      metadata: params.metadata,
    },
  });

  return session;
}

/**
 * Create Customer Portal Session
 * Erstellt eine Session für das Stripe Customer Portal
 * Dort können Kunden ihre Subscription verwalten, Zahlungsmethoden ändern, etc.
 */
export async function createCustomerPortalSession(
  request: CustomerPortalRequest,
  stripeCustomerId: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: request.returnUrl,
  });

  return session;
}

/**
 * Get Subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

/**
 * Cancel Subscription
 * Kündigt eine Subscription zum Ende der aktuellen Billing Period
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Reactivate Subscription
 * Reaktiviert eine gekündigte Subscription (wenn noch nicht abgelaufen)
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Update Subscription Tier
 * Ändert das Tier einer bestehenden Subscription
 *
 * WICHTIG: Stripe berechnet automatisch Proration
 */
export async function updateSubscriptionTier(
  subscriptionId: string,
  newTier: SubscriptionTier,
  billingInterval: 'month' | 'year'
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const newPriceId = getPriceIdForTier(newTier, billingInterval);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      ...subscription.metadata,
      tier: newTier,
    },
  });

  return updatedSubscription;
}

/**
 * Helper: Get Price ID for Tier
 * TODO Phase 2: Diese Werte müssen aus Environment Variables geladen werden
 *
 * SETUP:
 * 1. Stripe Dashboard → Products erstellen
 * 2. Price IDs in .env eintragen:
 *    STRIPE_PRICE_STARTER_MONTHLY=price_xxx
 *    STRIPE_PRICE_STARTER_YEARLY=price_xxx
 *    usw.
 */
function getPriceIdForTier(tier: SubscriptionTier, interval: 'month' | 'year'): string {
  // Convert 'month' → 'MONTHLY', 'year' → 'YEARLY'
  const intervalKey = interval === 'month' ? 'MONTHLY' : 'YEARLY';
  const envKey = `STRIPE_PRICE_${tier}_${intervalKey}`;
  const priceId = process.env[envKey];

  if (!priceId) {
    throw new Error(
      `Price ID für ${tier} (${interval}) nicht gefunden. ` +
        `Bitte ${envKey} in .env definieren. ` +
        `Siehe: docs/stripe/phase-1-stripe-setup.md`
    );
  }

  return priceId;
}

/**
 * Construct Webhook Event
 * Verifiziert und konstruiert ein Stripe Webhook Event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET ist nicht definiert');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

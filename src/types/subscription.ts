import { Timestamp } from 'firebase-admin/firestore';
import { SubscriptionTier } from '@/config/subscription-limits';

/**
 * Subscription Status
 * Mapping zu Stripe Subscription Status
 */
export type SubscriptionStatus =
  | 'active'       // Aktiv und bezahlt
  | 'trialing'     // Im Trial-Zeitraum
  | 'past_due'     // Zahlung überfällig
  | 'canceled'     // Gekündigt
  | 'unpaid'       // Unbezahlt
  | 'incomplete'   // Incomplete (Stripe Checkout nicht abgeschlossen)
  | 'incomplete_expired'; // Incomplete und abgelaufen

/**
 * Organization Subscription Document
 * Firestore Collection: subscriptions/{organizationId}
 *
 * WICHTIG: Dieses Schema wird in Phase 2 (Stripe Integration) verwendet
 * Phase 1 legt nur die Infrastruktur an
 */
export interface OrganizationSubscription {
  // Organization Reference
  organizationId: string;

  // Stripe IDs
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;

  // Subscription Details
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Billing Cycle
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;

  // Pricing
  pricePerMonth: number; // in EUR
  billingInterval: 'month' | 'year';

  // Optional: Trial Info
  trialStart?: Timestamp;
  trialEnd?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Stripe Customer Portal Request
 * Wird verwendet um Kunden zum Stripe Customer Portal weiterzuleiten
 */
export interface CustomerPortalRequest {
  organizationId: string;
  returnUrl: string;
}

/**
 * Checkout Session Request
 * Wird verwendet um eine neue Subscription zu erstellen
 */
export interface CheckoutSessionRequest {
  organizationId: string;
  tier: SubscriptionTier;
  billingInterval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Stripe Webhook Event Types
 * Events die wir in Phase 2 implementieren
 */
export type StripeWebhookEvent =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'checkout.session.completed';

/**
 * Webhook Event Payload (wird in Phase 2 erweitert)
 */
export interface StripeWebhookPayload {
  type: StripeWebhookEvent;
  data: {
    object: any; // Stripe Event Object (z.B. Subscription, Invoice)
  };
}

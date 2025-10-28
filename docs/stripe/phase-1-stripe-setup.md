# Phase 1: Stripe Setup & SDK Integration

> **Ziel:** Stripe Account konfigurieren, Produkte anlegen, SDK integrieren und Basis-Infrastruktur aufbauen

**Dauer:** 2-3 Tage
**Status:** ⏳ Pending
**Abhängigkeiten:** Keine

---

## Übersicht

Diese Phase legt das Fundament für die gesamte Stripe-Integration. Am Ende haben wir:
- ✅ Funktionierendes Stripe-Setup (Test + Production)
- ✅ 3 Produkte mit Preisen in Stripe
- ✅ SDK-Integration in Next.js
- ✅ Basis-Services und API-Routes
- ✅ Firestore-Schema für Subscriptions

---

## Tasks

### 1. Stripe Account Setup

#### 1.1 Account anlegen
- [ ] Stripe Account erstellen auf [stripe.com](https://stripe.com)
- [ ] Business Details ausfüllen
- [ ] Tax Information hinterlegen
- [ ] SEPA-Bankkonto für Auszahlungen verbinden

#### 1.2 API-Keys sichern
- [ ] Test API Keys kopieren (Dashboard → Developers → API Keys)
- [ ] Production API Keys kopieren (nach Aktivierung)
- [ ] In `.env.local` hinzufügen:
  ```bash
  # Stripe Keys
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
- [ ] In Vercel/Production Environment Variables hinzufügen

#### 1.3 Webhook Endpoint konfigurieren
- [ ] Webhook Endpoint erstellen: `https://celeropress.com/api/stripe/webhooks`
- [ ] Events auswählen:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `checkout.session.completed`
- [ ] Webhook Secret Key kopieren → `.env.local`

---

### 2. Produkte & Preise in Stripe anlegen

#### 2.1 Produkt: STARTER
- [ ] Dashboard → Products → Create Product
- [ ] **Name:** CeleroPress STARTER
- [ ] **Description:** Einzelplatz-Version für Freiberufler
- [ ] **Metadata:**
  ```json
  {
    "tier": "STARTER",
    "contacts": "1000",
    "emails_per_month": "2500",
    "ai_words_per_month": "50000",
    "users": "1",
    "storage_gb": "5",
    "editors_access": "false"
  }
  ```

**Preise anlegen:**
- [ ] **Monatlich:** €49.00 / Monat
  - Billing Period: Monthly
  - Currency: EUR
- [ ] **Jährlich:** €490.00 / Jahr (€40.83/Monat)
  - Billing Period: Yearly
  - Currency: EUR

#### 2.2 Produkt: BUSINESS
- [ ] **Name:** CeleroPress BUSINESS
- [ ] **Description:** Team-Version für kleine Teams (bis 3 Mitglieder)
- [ ] **Metadata:**
  ```json
  {
    "tier": "BUSINESS",
    "contacts": "5000",
    "emails_per_month": "10000",
    "ai_words_per_month": "-1",
    "users": "3",
    "storage_gb": "25",
    "editors_access": "true"
  }
  ```

**Preise anlegen:**
- [ ] **Monatlich:** €149.00 / Monat
- [ ] **Jährlich:** €1,490.00 / Jahr (€124.17/Monat)

#### 2.3 Produkt: AGENTUR
- [ ] **Name:** CeleroPress AGENTUR
- [ ] **Description:** Enterprise-Version für Agenturen (ab 4 Mitglieder)
- [ ] **Metadata:**
  ```json
  {
    "tier": "AGENTUR",
    "contacts": "25000",
    "emails_per_month": "50000",
    "ai_words_per_month": "-1",
    "users": "10",
    "storage_gb": "100",
    "editors_access": "true"
  }
  ```

**Preise anlegen:**
- [ ] **Monatlich:** €399.00 / Monat
- [ ] **Jährlich:** €3,990.00 / Jahr (€332.50/Monat)

#### 2.4 Add-on: Extra User
- [ ] **Name:** Zusätzlicher Team-Member
- [ ] **Description:** Extra User-Lizenz für AGENTUR-Tier
- [ ] **Price:** €20.00 / Monat
- [ ] **Metadata:** `{ "type": "addon", "addon_for": "AGENTUR" }`

---

### 3. Dependencies installieren

```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

**Package Versions:**
- `stripe`: ^14.0.0 (Server-side SDK)
- `@stripe/stripe-js`: ^3.0.0 (Client-side SDK)

---

### 4. Subscription-Limits Config erstellen

**Datei:** `src/config/subscription-limits.ts`

```typescript
export type SubscriptionTier = 'STARTER' | 'BUSINESS' | 'AGENTUR';

export interface SubscriptionLimits {
  name: SubscriptionTier;
  price_monthly_eur: number;
  price_yearly_eur: number;
  contacts: number;
  emails_per_month: number;
  ai_words_per_month: number; // -1 = unlimited
  users: number;
  storage_bytes: number;
  editors_access: boolean;
  support: string[];
  onboarding: string;
  additional_user_cost_eur?: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  STARTER: {
    name: 'STARTER',
    price_monthly_eur: 49,
    price_yearly_eur: 490,
    contacts: 1000,
    emails_per_month: 2500,
    ai_words_per_month: 50000,
    users: 1,
    storage_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
    editors_access: false,
    support: ['email'],
    onboarding: 'self-service'
  },
  BUSINESS: {
    name: 'BUSINESS',
    price_monthly_eur: 149,
    price_yearly_eur: 1490,
    contacts: 5000,
    emails_per_month: 10000,
    ai_words_per_month: -1, // Unlimited
    users: 3,
    storage_bytes: 25 * 1024 * 1024 * 1024, // 25 GB
    editors_access: true,
    support: ['email', 'chat'],
    onboarding: '1h-video-call'
  },
  AGENTUR: {
    name: 'AGENTUR',
    price_monthly_eur: 399,
    price_yearly_eur: 3990,
    contacts: 25000,
    emails_per_month: 50000,
    ai_words_per_month: -1, // Unlimited
    users: 10,
    additional_user_cost_eur: 20,
    storage_bytes: 100 * 1024 * 1024 * 1024, // 100 GB
    editors_access: true,
    support: ['email', 'chat', 'phone'],
    onboarding: 'dedicated'
  }
};

// Helper: Check if feature is unlimited
export function isUnlimited(value: number): boolean {
  return value === -1;
}

// Helper: Format limit display
export function formatLimit(value: number, unit: string): string {
  if (isUnlimited(value)) return 'Unlimited';
  return `${value.toLocaleString('de-DE')} ${unit}`;
}

// Helper: Get limits for tier
export function getLimitsForTier(tier: SubscriptionTier): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier];
}
```

**Tasks:**
- [ ] Datei erstellen
- [ ] Types exportieren
- [ ] Unit Tests schreiben (`subscription-limits.test.ts`)

---

### 5. Stripe Service erstellen

**Datei:** `src/lib/stripe/stripe-service.ts`

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

/**
 * Create a Stripe Customer for an organization
 */
export async function createStripeCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
    },
  });
}

/**
 * Create a Checkout Session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  organizationId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
    },
  });
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Failed to retrieve subscription:', error);
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
```

**Tasks:**
- [ ] Service erstellen
- [ ] Error Handling implementieren
- [ ] TypeScript Types korrekt nutzen

---

### 6. Firestore Schema definieren

#### Collection: `subscriptions/{organizationId}`

```typescript
interface OrganizationSubscription {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  tier: 'STARTER' | 'BUSINESS' | 'AGENTUR';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: FirebaseFirestore.Timestamp;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
  cancelAtPeriodEnd: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

**Tasks:**
- [ ] Type Definition erstellen (`src/types/subscription.ts`)
- [ ] Firestore Security Rules erweitern
- [ ] Firestore Index für `organizationId` + `status`

---

### 7. Webhook Handler erstellen

**Datei:** `src/app/api/stripe/webhooks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe-service';
import { db } from '@/lib/firebase/firebase-admin';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  console.log('Received Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;

  if (!organizationId) {
    console.error('No organizationId in subscription metadata');
    return;
  }

  // Extract tier from price metadata
  const priceId = subscription.items.data[0].price.id;
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product'],
  });
  const product = price.product as Stripe.Product;
  const tier = product.metadata.tier as 'STARTER' | 'BUSINESS' | 'AGENTUR';

  await db.collection('subscriptions').doc(organizationId).set({
    organizationId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    tier,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
  }, { merge: true });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;

  if (!organizationId) return;

  await db.collection('subscriptions').doc(organizationId).update({
    status: 'canceled',
    updatedAt: new Date(),
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
  // Optional: Send confirmation email
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  // Optional: Send warning email
}
```

**Tasks:**
- [ ] Route erstellen
- [ ] Event Handler implementieren
- [ ] Error Logging hinzufügen
- [ ] Testen mit Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhooks`

---

### 8. Testing

#### 8.1 Stripe CLI Setup
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

#### 8.2 Test Scenarios
- [ ] Create Subscription (STARTER)
- [ ] Update Subscription (STARTER → BUSINESS)
- [ ] Cancel Subscription
- [ ] Payment Success
- [ ] Payment Failure

#### 8.3 Unit Tests
- [ ] `subscription-limits.test.ts` - Alle Helper-Funktionen testen
- [ ] `stripe-service.test.ts` - Service-Funktionen mocken & testen

---

## Definition of Done

- ✅ Stripe Account produktiv & verifiziert
- ✅ Alle 3 Produkte + Preise in Stripe angelegt
- ✅ SDK installiert & konfiguriert
- ✅ `subscription-limits.ts` Config erstellt & getestet
- ✅ `stripe-service.ts` Service implementiert
- ✅ Webhook-Route funktioniert (getestet mit Stripe CLI)
- ✅ Firestore Schema definiert & Security Rules aktualisiert
- ✅ Unit Tests geschrieben & grün
- ✅ Documentation aktualisiert

---

## Nächste Phase

➡️ [Phase 2: Usage Tracking Services](./phase-2-usage-tracking.md)

---

**Erstellt:** 2025-10-28
**Version:** 1.0
**Status:** 📋 Ready to Start

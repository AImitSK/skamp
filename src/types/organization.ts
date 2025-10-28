import { Timestamp } from 'firebase-admin/firestore';

/**
 * Account Type für Organizations
 * - regular: Normale zahlende Kunden (mit Stripe)
 * - promo: Promo-Code Accounts (zeitlich begrenzt oder unbegrenzt)
 * - beta: Beta-Tester (voller Zugang, kein Payment)
 * - internal: Interne Accounts (Super-Admin, Demo-Accounts)
 */
export type AccountType = 'regular' | 'promo' | 'beta' | 'internal';

/**
 * Subscription Tier
 */
export type SubscriptionTier = 'STARTER' | 'BUSINESS' | 'AGENTUR';

/**
 * Promo Details für Promo-Accounts
 */
export interface PromoDetails {
  code: string;
  grantedBy: string; // User ID des Admins, der den Promo-Code vergab
  grantedAt: Timestamp;
  expiresAt: Timestamp | null; // null = nie
  reason: string; // "Launch Promo", "Beta Tester", etc.
  originalTier: SubscriptionTier; // Welches Tier sie bekommen
}

/**
 * Organization Schema mit Account Type Support
 */
export interface Organization {
  id: string;
  name: string;
  adminEmail: string;

  // Account Type System (NEU)
  accountType: AccountType;

  // Promo Details (nur wenn accountType = 'promo')
  promoDetails?: PromoDetails;

  // Subscription Info
  tier: SubscriptionTier;

  // Stripe Info (nur wenn accountType = 'regular')
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

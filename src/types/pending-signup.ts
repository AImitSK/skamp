import { Timestamp } from 'firebase/firestore';
import { SubscriptionTier } from './organization';

/**
 * Pending Signup
 *
 * Temporäre Daten für User die sich registrieren wollen,
 * aber noch nicht bezahlt haben.
 *
 * - Wird erstellt beim Signup (vor Stripe Checkout)
 * - Token dient als ID und wird an Stripe übergeben
 * - Nach erfolgreicher Zahlung: User + Org werden erstellt
 * - Auto-Cleanup nach 24h
 */
export interface PendingSignup {
  /** Token = Firestore Document ID */
  id: string;

  /** User Email */
  email: string;

  /** Password (plain text, wird nach User-Erstellung gelöscht) */
  password?: string;

  /** Company/Organization Name */
  companyName: string;

  /** Selected Subscription Tier */
  tier: SubscriptionTier;

  /** Billing Interval */
  billingInterval: 'monthly' | 'yearly';

  /** Provider: 'email' oder 'google' */
  provider: 'email' | 'google';

  /** Google ID Token (nur bei provider='google') */
  googleIdToken?: string;

  /** Google User Info (nur bei provider='google') */
  googleUserInfo?: {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
  };

  /** Erstellt am */
  createdAt: Timestamp | Date;

  /** Läuft ab nach 24h */
  expiresAt: Timestamp | Date;

  /** Stripe Customer ID (falls bereits erstellt) */
  stripeCustomerId?: string;

  /** Status */
  status: 'pending' | 'completed' | 'expired';
}

/**
 * Input für create-pending-signup
 */
export interface CreatePendingSignupInput {
  email: string;
  password?: string;
  companyName: string;
  tier: SubscriptionTier;
  billingInterval: 'monthly' | 'yearly';
  provider: 'email' | 'google';
  googleIdToken?: string;
  googleUserInfo?: {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
  };
}

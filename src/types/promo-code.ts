import { Timestamp } from 'firebase-admin/firestore';
import { SubscriptionTier } from './organization';

/**
 * Promo Code für Special Accounts
 */
export interface PromoCode {
  id: string;
  code: string; // "LAUNCH2025", "BETA50", etc.
  tier: 'BUSINESS' | 'AGENTUR'; // Welches Tier wird gewährt (STARTER nicht als Promo)
  maxUses: number; // -1 = unlimited
  currentUses: number;
  expiresAt: Timestamp | null; // null = nie (Code selbst läuft nicht ab)
  validityMonths: number | null; // Wie lange gilt der Account? null = unbegrenzt
  active: boolean;
  createdBy: string; // Super-Admin User ID
  createdAt: Timestamp;
}

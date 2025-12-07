import { Timestamp } from 'firebase-admin/firestore';

/**
 * Flexible Timestamp Type - kann Firestore Timestamp, Date oder String sein
 * Je nachdem ob Client oder Server-Side
 */
export type FlexibleTimestamp = Timestamp | Date | string;

/**
 * Account Type für Organizations
 * - regular: Normale zahlende Kunden (mit Stripe)
 * - promo: Promo-Code Accounts (zeitlich begrenzt oder unbegrenzt)
 * - beta: Beta-Tester (voller Zugang, kein Payment)
 * - internal: Interne Accounts (Super-Admin, Demo-Accounts)
 */
export type AccountType = 'regular' | 'promo' | 'beta' | 'internal';

/**
 * Subscription Status für regular Accounts
 * - incomplete: User registriert, aber Zahlung noch nicht abgeschlossen
 * - active: Zahlung erfolgreich, voller Zugriff
 * - past_due: Zahlung fehlgeschlagen, aber noch Zugriff (Grace Period)
 * - canceled: Abo gekündigt, kein Zugriff mehr
 * - trialing: Trial-Phase aktiv
 */
export type SubscriptionStatus = 'incomplete' | 'active' | 'past_due' | 'canceled' | 'trialing';

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
  grantedAt: FlexibleTimestamp;
  expiresAt: FlexibleTimestamp | null; // null = nie
  reason: string; // "Launch Promo", "Beta Tester", etc.
  originalTier: SubscriptionTier; // Welches Tier sie bekommen
}

/**
 * Usage Metriken für eine Organization
 * Wird in Phase 2 (Usage Tracking) vollständig implementiert
 */
export interface OrganizationUsage {
  // Email Usage
  emailsSent: number;
  emailsLimit: number;

  // Kontakte (CRM)
  contactsTotal: number;
  contactsLimit: number;

  // AI Words
  aiWordsUsed: number;
  aiWordsLimit: number; // -1 = Unlimited

  // Storage (in Bytes)
  storageUsed: number;
  storageLimit: number;

  // Team Members
  teamMembersActive: number;
  teamMembersLimit: number;

  // Current Tier
  tier: SubscriptionTier;

  // Last Updated
  lastUpdated: FlexibleTimestamp;
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

  // Subscription Status (nur für regular accounts)
  // - undefined/nicht vorhanden = Legacy-Account (voller Zugriff)
  // - 'incomplete' = Zahlung ausstehend (kein Zugriff)
  // - 'active' = Bezahlt (voller Zugriff)
  subscriptionStatus?: SubscriptionStatus;

  // Stripe Info (nur wenn accountType = 'regular')
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // Timestamps
  createdAt: FlexibleTimestamp;
  updatedAt: FlexibleTimestamp;

  // Usage Metriken (optional, wird in Phase 2 vollständig implementiert)
  usage?: OrganizationUsage;

  // Content-Sprachen für Übersetzungen (i18n)
  contentLanguages?: {
    primary: string;      // z.B. 'de' - Primärsprache (fest)
    additional: string[]; // z.B. ['en', 'fr'] - max. 3 zusätzliche Sprachen
  };
}

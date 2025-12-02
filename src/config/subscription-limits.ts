/**
 * Subscription Limits Configuration
 * Definiert Feature-Limits für alle Subscription-Tiers
 *
 * Quelle: docs/stripe/subscription-features.md
 */

export type SubscriptionTier = 'STARTER' | 'BUSINESS' | 'AGENTUR';

export interface SubscriptionLimits {
  // Tier Name
  name: SubscriptionTier;

  // Pricing
  price_monthly_eur: number;
  price_yearly_eur: number;

  // Email-Versand pro Monat
  emails_per_month: number;

  // Kontakte (Companies + Contacts)
  contacts: number;

  // AI-Wörter pro Monat (-1 = Unlimited)
  ai_words_per_month: number;

  // Team-Mitglieder
  users: number;

  // Cloud-Speicher in Bytes
  storage_bytes: number;

  // Journalisten-Datenbank Zugriff
  journalist_db_access: boolean;

  // Support-Level
  support: string[];

  // Onboarding
  onboarding: string;

  // Additional User Cost (nur für AGENTUR)
  additional_user_cost_eur?: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  STARTER: {
    name: 'STARTER',
    price_monthly_eur: 49,
    price_yearly_eur: 490, // 2 Monate gratis
    emails_per_month: 2_500,
    contacts: 1_000,
    ai_words_per_month: 50_000,
    users: 1,
    storage_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
    journalist_db_access: false,
    support: ['email'],
    onboarding: 'self-service',
  },

  BUSINESS: {
    name: 'BUSINESS',
    price_monthly_eur: 149,
    price_yearly_eur: 1_490, // 2 Monate gratis
    emails_per_month: 10_000,
    contacts: 5_000,
    ai_words_per_month: -1, // Unlimited
    users: 3,
    storage_bytes: 25 * 1024 * 1024 * 1024, // 25 GB
    journalist_db_access: true,
    support: ['email', 'chat'],
    onboarding: '1h-video-call',
  },

  AGENTUR: {
    name: 'AGENTUR',
    price_monthly_eur: 399,
    price_yearly_eur: 3_990, // 2 Monate gratis
    emails_per_month: 50_000,
    contacts: 25_000,
    ai_words_per_month: -1, // Unlimited
    users: 10,
    storage_bytes: 100 * 1024 * 1024 * 1024, // 100 GB
    journalist_db_access: true,
    support: ['email', 'chat', 'phone'],
    onboarding: 'dedicated',
    additional_user_cost_eur: 20,
  },
};

/**
 * Helper: Get limits for a specific tier
 */
export function getLimitsForTier(tier: string): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier as SubscriptionTier] || SUBSCRIPTION_LIMITS.STARTER;
}

/**
 * Helper: Check if feature is unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Helper: Calculate usage percentage
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 0;
  return Math.round((current / limit) * 100);
}

/**
 * Helper: Get usage color
 */
export function getUsageColor(percentage: number): 'green' | 'yellow' | 'red' {
  if (percentage < 80) return 'green';
  if (percentage < 95) return 'yellow';
  return 'red';
}

/**
 * Helper: Format limit display
 */
export function formatLimit(value: number, unit: string): string {
  if (isUnlimited(value)) return 'Unlimited';
  return `${value.toLocaleString('de-DE')} ${unit}`;
}

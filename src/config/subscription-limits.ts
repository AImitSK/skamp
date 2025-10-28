/**
 * Subscription Limits Configuration
 * Definiert Feature-Limits für alle Subscription-Tiers
 *
 * Quelle: docs/stripe/subscription-features.md
 */

export interface SubscriptionLimits {
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
  support: 'email' | 'email_chat' | 'email_chat_phone';
}

export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  STARTER: {
    emails_per_month: 2_500,
    contacts: 1_000,
    ai_words_per_month: 50_000,
    users: 1,
    storage_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
    journalist_db_access: false,
    support: 'email',
  },

  BUSINESS: {
    emails_per_month: 10_000,
    contacts: 5_000,
    ai_words_per_month: -1, // Unlimited
    users: 3,
    storage_bytes: 25 * 1024 * 1024 * 1024, // 25 GB
    journalist_db_access: true,
    support: 'email_chat',
  },

  AGENTUR: {
    emails_per_month: 50_000,
    contacts: 25_000,
    ai_words_per_month: -1, // Unlimited
    users: 10,
    storage_bytes: 100 * 1024 * 1024 * 1024, // 100 GB
    journalist_db_access: true,
    support: 'email_chat_phone',
  },
};

/**
 * Helper: Get limits for a specific tier
 */
export function getLimitsForTier(tier: string): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.STARTER;
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

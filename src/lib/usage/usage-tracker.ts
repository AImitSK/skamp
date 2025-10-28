/**
 * Usage Tracker Service
 *
 * Tracks real-time usage metrics for organizations:
 * - Emails sent (SendGrid)
 * - Contacts created/imported (CRM)
 * - AI Words used (Genkit Flows)
 * - Storage used (Firebase Storage)
 * - Team Members (Active users)
 *
 * Usage data is stored in Firestore at:
 * organizations/{orgId}/usage/current
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import { OrganizationUsage, SubscriptionTier } from '@/types/organization';

/**
 * Initialize usage tracking for a new organization
 */
export async function initializeUsageTracking(
  organizationId: string,
  tier: SubscriptionTier
): Promise<void> {
  const limits = SUBSCRIPTION_LIMITS[tier];

  const initialUsage: OrganizationUsage = {
    emailsSent: 0,
    emailsLimit: limits.emails_per_month,
    contactsTotal: 0,
    contactsLimit: limits.contacts,
    aiWordsUsed: 0,
    aiWordsLimit: limits.ai_words_per_month,
    storageUsed: 0,
    storageLimit: limits.storage_bytes,
    teamMembersActive: 1, // Der Admin selbst
    teamMembersLimit: limits.users,
    tier,
    lastUpdated: new Date(),
  };

  await adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current')
    .set(initialUsage);
}

/**
 * Get current usage for an organization
 */
export async function getUsage(organizationId: string): Promise<OrganizationUsage | null> {
  const usageDoc = await adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current')
    .get();

  if (!usageDoc.exists) {
    return null;
  }

  const data = usageDoc.data();
  return {
    ...data,
    lastUpdated: data?.lastUpdated?.toDate?.() || new Date(),
  } as OrganizationUsage;
}

/**
 * Increment email usage
 * Called from email sending API
 */
export async function incrementEmailUsage(
  organizationId: string,
  count: number = 1
): Promise<void> {
  const usageRef = adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  await usageRef.update({
    emailsSent: FieldValue.increment(count),
    lastUpdated: FieldValue.serverTimestamp(),
  });
}

/**
 * Increment or set contacts total
 * Called from CRM create/import/delete operations
 */
export async function updateContactsUsage(
  organizationId: string,
  delta: number
): Promise<void> {
  const usageRef = adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  await usageRef.update({
    contactsTotal: FieldValue.increment(delta),
    lastUpdated: FieldValue.serverTimestamp(),
  });
}

/**
 * Increment AI Words usage
 * Called from Genkit flows (generate, generateHeadlines, etc.)
 */
export async function incrementAIWordsUsage(
  organizationId: string,
  wordCount: number
): Promise<void> {
  const usageRef = adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  await usageRef.update({
    aiWordsUsed: FieldValue.increment(wordCount),
    lastUpdated: FieldValue.serverTimestamp(),
  });
}

/**
 * Update storage usage
 * Called from Firebase Storage upload/delete operations
 */
export async function updateStorageUsage(
  organizationId: string,
  bytesUsed: number
): Promise<void> {
  const usageRef = adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  await usageRef.set(
    {
      storageUsed: bytesUsed,
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update team members count
 * Called when users are added/removed from organization
 */
export async function updateTeamMembersUsage(
  organizationId: string,
  activeCount: number
): Promise<void> {
  const usageRef = adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  await usageRef.update({
    teamMembersActive: activeCount,
    lastUpdated: FieldValue.serverTimestamp(),
  });
}

/**
 * Update usage limits when tier changes
 * Called from webhook when subscription tier changes
 */
export async function updateUsageLimits(
  organizationId: string,
  newTier: SubscriptionTier
): Promise<void> {
  const limits = SUBSCRIPTION_LIMITS[newTier];

  const usageRef = adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  await usageRef.update({
    emailsLimit: limits.emails_per_month,
    contactsLimit: limits.contacts,
    aiWordsLimit: limits.ai_words_per_month,
    storageLimit: limits.storage_bytes,
    teamMembersLimit: limits.users,
    tier: newTier,
    lastUpdated: FieldValue.serverTimestamp(),
  });
}

/**
 * Reset monthly usage counters
 * Called by monthly cron job (emails, AI words)
 */
export async function resetMonthlyUsage(organizationId: string): Promise<void> {
  const usageRef = adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  await usageRef.update({
    emailsSent: 0,
    aiWordsUsed: 0,
    lastUpdated: FieldValue.serverTimestamp(),
  });
}

/**
 * Check if organization has exceeded limits
 */
export async function checkUsageLimits(organizationId: string): Promise<{
  withinLimits: boolean;
  exceededLimits: string[];
}> {
  const usage = await getUsage(organizationId);

  if (!usage) {
    return { withinLimits: false, exceededLimits: ['No usage data found'] };
  }

  const exceededLimits: string[] = [];

  // Check each limit (-1 = unlimited)
  if (usage.emailsLimit !== -1 && usage.emailsSent >= usage.emailsLimit) {
    exceededLimits.push('emails');
  }
  if (usage.contactsLimit !== -1 && usage.contactsTotal >= usage.contactsLimit) {
    exceededLimits.push('contacts');
  }
  if (usage.aiWordsLimit !== -1 && usage.aiWordsUsed >= usage.aiWordsLimit) {
    exceededLimits.push('aiWords');
  }
  if (usage.storageLimit !== -1 && usage.storageUsed >= usage.storageLimit) {
    exceededLimits.push('storage');
  }
  if (usage.teamMembersLimit !== -1 && usage.teamMembersActive >= usage.teamMembersLimit) {
    exceededLimits.push('teamMembers');
  }

  return {
    withinLimits: exceededLimits.length === 0,
    exceededLimits,
  };
}

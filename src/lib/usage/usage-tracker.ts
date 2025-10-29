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
 * @deprecated Use syncContactsUsage instead for more reliable counting
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
 * Synchronize contacts count from Firestore
 * Uses the SAME logic as CRM page (but with Admin SDK)
 *
 * Counts:
 * 1. Regular contacts (contacts_enhanced where deletedAt == null)
 * 2. Journalist references (journalist_references where isActive == true)
 *
 * @param organizationId - The organization ID
 */
export async function syncContactsUsage(organizationId: string): Promise<void> {
  try {
    // 1. Count regular contacts (non-deleted)
    const allContactsSnapshot = await adminDb
      .collection('contacts_enhanced')
      .where('organizationId', '==', organizationId)
      .get();

    const regularContacts = allContactsSnapshot.docs.filter(
      doc => !doc.data().deletedAt
    );

    // 2. Get journalist references and VALIDATE like CRM page does
    const referencesSnapshot = await adminDb
      .collection('organizations')
      .doc(organizationId)
      .collection('journalist_references')
      .where('isActive', '==', true)
      .get();

    // Validate each reference: must have BOTH globalJournalist AND companyRef
    const validReferences = [];
    for (const refDoc of referencesSnapshot.docs) {
      const ref = refDoc.data();

      // Check if globalJournalist exists
      const globalJournalistDoc = await adminDb
        .collection('contacts_enhanced')
        .doc(ref.globalJournalistId)
        .get();

      // Check if companyRef exists
      const companyRefDoc = await adminDb
        .collection('organizations')
        .doc(organizationId)
        .collection('company_references')
        .doc(ref.companyReferenceId)
        .get();

      // Only count if BOTH exist (like CRM page does)
      if (globalJournalistDoc.exists && companyRefDoc.exists) {
        validReferences.push(refDoc.id);
      }
    }

    // 3. Total = Regular (non-deleted) + VALID References only
    const totalContacts = regularContacts.length + validReferences.length;

    // 4. Update usage
    const usageRef = adminDb
      .collection('organizations')
      .doc(organizationId)
      .collection('usage')
      .doc('current');

    await usageRef.set(
      {
        contactsTotal: totalContacts,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[Usage] Synced contacts for org ${organizationId}: ${totalContacts} total (${regularContacts.length} regular + ${validReferences.length} valid references)`);
  } catch (error) {
    console.error(`[Usage] Failed to sync contacts for org ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Check if adding N contacts would exceed limit
 *
 * @param organizationId - The organization ID
 * @param additionalContacts - Number of contacts to add (default: 1)
 * @returns Object with allowed flag, current count, limit, and remaining capacity
 */
export async function checkContactsLimit(
  organizationId: string,
  additionalContacts: number = 1
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  wouldExceed: number; // How many over limit if added
}> {
  const usage = await getUsage(organizationId);

  if (!usage) {
    throw new Error('Usage data not found for organization');
  }

  // Defensive: Falls Felder undefined sind, nutze Defaults
  const current = usage.contactsTotal ?? 0;
  const limit = usage.contactsLimit ?? 1000; // STARTER default

  // Warn if undefined values found
  if (usage.contactsTotal === undefined || usage.contactsLimit === undefined) {
    console.warn(`[Usage] ⚠️ Undefined usage fields for org ${organizationId}:`, {
      contactsTotal: usage.contactsTotal,
      contactsLimit: usage.contactsLimit,
      usedDefaults: { current, limit }
    });
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit,
      remaining: -1,
      wouldExceed: 0,
    };
  }

  const newTotal = current + additionalContacts;
  const allowed = newTotal <= limit;
  const remaining = Math.max(0, limit - current);
  const wouldExceed = Math.max(0, newTotal - limit);

  return {
    allowed,
    current,
    limit,
    remaining,
    wouldExceed,
  };
}

/**
 * Check if sending N emails would exceed limit
 *
 * @param organizationId - The organization ID
 * @param emailsToSend - Number of emails to send (default: 1)
 * @returns Object with allowed flag, current count, limit, and remaining capacity
 */
export async function checkEmailLimit(
  organizationId: string,
  emailsToSend: number = 1
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  wouldExceed: number; // How many over limit if sent
}> {
  const usage = await getUsage(organizationId);

  if (!usage) {
    throw new Error('Usage data not found for organization');
  }

  // Defensive: Falls Felder undefined sind, nutze Defaults
  const current = usage.emailsSent ?? 0;
  const limit = usage.emailsLimit ?? 1000; // STARTER default

  // Warn if undefined values found
  if (usage.emailsSent === undefined || usage.emailsLimit === undefined) {
    console.warn(`[Usage] ⚠️ Undefined usage fields for org ${organizationId}:`, {
      emailsSent: usage.emailsSent,
      emailsLimit: usage.emailsLimit,
      usedDefaults: { current, limit }
    });
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit,
      remaining: -1,
      wouldExceed: 0,
    };
  }

  const newTotal = current + emailsToSend;
  const allowed = newTotal <= limit;
  const remaining = Math.max(0, limit - current);
  const wouldExceed = Math.max(0, newTotal - limit);

  return {
    allowed,
    current,
    limit,
    remaining,
    wouldExceed,
  };
}

/**
 * Check if using N AI words would exceed limit
 *
 * @param organizationId - The organization ID
 * @param wordsToUse - Number of AI words to use (default: 1)
 * @returns Object with allowed flag, current count, limit, and remaining capacity
 */
export async function checkAILimit(
  organizationId: string,
  wordsToUse: number = 1
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  wouldExceed: number; // How many over limit if used
}> {
  const usage = await getUsage(organizationId);

  if (!usage) {
    throw new Error('Usage data not found for organization');
  }

  // Defensive: Falls Felder undefined sind, nutze Defaults
  const current = usage.aiWordsUsed ?? 0;
  const limit = usage.aiWordsLimit ?? 50000; // STARTER default

  // Warn if undefined values found
  if (usage.aiWordsUsed === undefined || usage.aiWordsLimit === undefined) {
    console.warn(`[Usage] ⚠️ Undefined usage fields for org ${organizationId}:`, {
      aiWordsUsed: usage.aiWordsUsed,
      aiWordsLimit: usage.aiWordsLimit,
      usedDefaults: { current, limit }
    });
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit,
      remaining: -1,
      wouldExceed: 0,
    };
  }

  const newTotal = current + wordsToUse;
  const allowed = newTotal <= limit;
  const remaining = Math.max(0, limit - current);
  const wouldExceed = Math.max(0, newTotal - limit);

  return {
    allowed,
    current,
    limit,
    remaining,
    wouldExceed,
  };
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
 * @deprecated Use syncStorageUsage() instead for accurate counting
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
 * Synchronize storage usage from Firebase Storage
 * Calculates actual storage used by listing all files in organization folder
 *
 * @param organizationId - The organization ID
 */
export async function syncStorageUsage(organizationId: string): Promise<void> {
  try {
    const { adminStorage } = await import('@/lib/firebase/admin-init');
    const bucket = adminStorage.bucket();

    // Liste alle Files im Organization-Ordner
    const [files] = await bucket.getFiles({
      prefix: `organizations/${organizationId}/`,
    });

    // Summiere alle File-Größen
    const totalBytes = files.reduce((sum, file) => {
      const size = parseInt(file.metadata.size || '0', 10);
      return sum + size;
    }, 0);

    // Update usage document
    const usageRef = adminDb
      .collection('organizations')
      .doc(organizationId)
      .collection('usage')
      .doc('current');

    await usageRef.set(
      {
        storageUsed: totalBytes,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[Usage] Synced storage for org ${organizationId}: ${totalBytes} bytes (${files.length} files)`);
  } catch (error) {
    console.error(`[Usage] Failed to sync storage for org ${organizationId}:`, error);
    throw error;
  }
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

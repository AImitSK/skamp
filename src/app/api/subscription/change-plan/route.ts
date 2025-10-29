/**
 * Change Plan API Route
 * Changes the subscription tier (upgrade or downgrade)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { updateSubscriptionTier } from '@/lib/stripe/stripe-service';
import { updateUsageLimits, getUsage } from '@/lib/usage/usage-tracker';
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';

interface ChangePlanRequest {
  newTier: SubscriptionTier;
}

interface DowngradeViolation {
  metric: string;
  current: number;
  newLimit: number;
  message: string;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      console.log('[Change Plan API] Request for org:', auth.organizationId);

      const body: ChangePlanRequest = await req.json();
      const { newTier } = body;

      if (!newTier) {
        return NextResponse.json(
          { error: 'newTier ist erforderlich' },
          { status: 400 }
        );
      }

      // Validate tier
      if (!['STARTER', 'BUSINESS', 'AGENTUR'].includes(newTier)) {
        return NextResponse.json({ error: 'Ungültiges Tier' }, { status: 400 });
      }

      // Get organization
      const orgRef = adminDb.collection('organizations').doc(auth.organizationId);
      const orgDoc = await orgRef.get();

      if (!orgDoc.exists) {
        return NextResponse.json(
          { error: 'Organization nicht gefunden' },
          { status: 404 }
        );
      }

      const orgData = orgDoc.data();
      const currentTier = orgData?.tier;
      const stripeSubscriptionId = orgData?.stripeSubscriptionId;

      if (!stripeSubscriptionId) {
        return NextResponse.json(
          { error: 'Keine aktive Subscription gefunden' },
          { status: 400 }
        );
      }

      // Check if tier is actually changing
      if (currentTier === newTier) {
        return NextResponse.json(
          { error: 'Neuer Plan ist identisch mit aktuellem Plan' },
          { status: 400 }
        );
      }

      console.log(`[Change Plan API] Changing from ${currentTier} to ${newTier}`);

      // Check if this is a downgrade and if current usage allows it
      const isDowngrade = isDowngradeMove(currentTier, newTier);

      if (isDowngrade) {
        console.log('[Change Plan API] Downgrade detected, checking usage limits...');

        // Get current usage
        const usage = await getUsage(auth.organizationId);

        if (usage) {
          const violations = checkDowngradeAllowed(usage, newTier);

          if (violations.length > 0) {
            console.warn('[Change Plan API] Downgrade blocked due to usage violations:', violations);
            return NextResponse.json(
              {
                error: 'Downgrade nicht möglich - aktuelle Nutzung überschreitet neue Limits',
                violations: violations.map(v => v.message),
                details: violations,
              },
              { status: 400 }
            );
          }
        }

        console.log('[Change Plan API] Downgrade allowed - no violations');
      }

      // Update Stripe subscription
      // Note: billing interval stays the same (monthly or yearly)
      const billingInterval = orgData?.billingInterval || 'month';

      const updatedSubscription = await updateSubscriptionTier(
        stripeSubscriptionId,
        newTier,
        billingInterval
      );

      console.log('[Change Plan API] Stripe subscription updated:', updatedSubscription.id);

      // Update organization in Firestore
      await orgRef.update({
        tier: newTier,
        updatedAt: new Date(),
      });

      console.log('[Change Plan API] Organization updated in Firestore');

      // Update usage limits based on new tier
      await updateUsageLimits(auth.organizationId, newTier);

      console.log('[Change Plan API] Usage limits updated for new tier');

      return NextResponse.json({
        success: true,
        newTier,
        message: `Plan erfolgreich zu ${newTier} geändert`,
      });
    } catch (error: any) {
      console.error('[Change Plan API] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to change plan' },
        { status: 500 }
      );
    }
  });
}

/**
 * Check if tier change is a downgrade
 */
function isDowngradeMove(currentTier: SubscriptionTier, newTier: SubscriptionTier): boolean {
  const tierOrder: Record<SubscriptionTier, number> = {
    STARTER: 1,
    BUSINESS: 2,
    AGENTUR: 3,
  };

  return tierOrder[newTier] < tierOrder[currentTier];
}

/**
 * Check if downgrade is allowed based on current usage
 * Returns array of violations (empty if allowed)
 */
function checkDowngradeAllowed(
  currentUsage: any,
  newTier: SubscriptionTier
): DowngradeViolation[] {
  const newLimits = SUBSCRIPTION_LIMITS[newTier];
  const violations: DowngradeViolation[] = [];

  // Check contacts
  if (currentUsage.contactsTotal > newLimits.contacts) {
    violations.push({
      metric: 'contacts',
      current: currentUsage.contactsTotal,
      newLimit: newLimits.contacts,
      message: `Kontakte: Du hast ${currentUsage.contactsTotal.toLocaleString('de-DE')} Kontakte, aber ${newTier} erlaubt nur ${newLimits.contacts.toLocaleString('de-DE')}. Bitte lösche ${(currentUsage.contactsTotal - newLimits.contacts).toLocaleString('de-DE')} Kontakte.`,
    });
  }

  // Check team members
  if (currentUsage.teamMembersActive > newLimits.users) {
    violations.push({
      metric: 'teamMembers',
      current: currentUsage.teamMembersActive,
      newLimit: newLimits.users,
      message: `Team-Mitglieder: Du hast ${currentUsage.teamMembersActive} aktive Mitglieder, aber ${newTier} erlaubt nur ${newLimits.users}. Bitte deaktiviere ${currentUsage.teamMembersActive - newLimits.users} Mitglied(er).`,
    });
  }

  // Check storage (convert to GB for better readability)
  const currentStorageGB = currentUsage.storageUsed / (1024 ** 3);
  const newLimitGB = newLimits.storage_bytes / (1024 ** 3);

  if (currentUsage.storageUsed > newLimits.storage_bytes) {
    violations.push({
      metric: 'storage',
      current: currentUsage.storageUsed,
      newLimit: newLimits.storage_bytes,
      message: `Cloud-Speicher: Du nutzt ${currentStorageGB.toFixed(2)} GB, aber ${newTier} erlaubt nur ${newLimitGB.toFixed(0)} GB. Bitte lösche ${(currentStorageGB - newLimitGB).toFixed(2)} GB an Dateien.`,
    });
  }

  // Check emails (only if in current month)
  if (currentUsage.emailsSent > newLimits.emails_per_month) {
    violations.push({
      metric: 'emails',
      current: currentUsage.emailsSent,
      newLimit: newLimits.emails_per_month,
      message: `Emails: Du hast diesen Monat bereits ${currentUsage.emailsSent.toLocaleString('de-DE')} Emails versendet, aber ${newTier} erlaubt nur ${newLimits.emails_per_month.toLocaleString('de-DE')}. Downgrade ab nächstem Monat möglich.`,
    });
  }

  // Check AI words (only if new tier has a limit and not unlimited)
  if (newLimits.ai_words_per_month !== -1 && currentUsage.aiWordsUsed > newLimits.ai_words_per_month) {
    violations.push({
      metric: 'aiWords',
      current: currentUsage.aiWordsUsed,
      newLimit: newLimits.ai_words_per_month,
      message: `KI-Nutzung: Du hast diesen Monat bereits ${currentUsage.aiWordsUsed.toLocaleString('de-DE')} AI-Wörter genutzt, aber ${newTier} erlaubt nur ${newLimits.ai_words_per_month.toLocaleString('de-DE')}. Downgrade ab nächstem Monat möglich.`,
    });
  }

  return violations;
}

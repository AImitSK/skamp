/**
 * Organization API Route
 * GET /api/subscription/organization
 *
 * Returns full organization data including usage metrics
 * for the authenticated user's organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { Organization, OrganizationUsage } from '@/types/organization';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Fetch organization
      const orgDoc = await adminDb
        .collection('organizations')
        .doc(auth.organizationId)
        .get();

      if (!orgDoc.exists) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      const orgData = orgDoc.data() as Organization;

      // Generate mock usage data if not present
      // TODO: In Phase 3 (Usage Tracking) this will be fetched from usage collection
      const usage = orgData.usage || generateMockUsage(orgData.tier, orgData.accountType);

      // Serialize timestamps for client
      const organization: Organization = {
        id: orgDoc.id,
        name: orgData.name,
        adminEmail: orgData.adminEmail,
        accountType: orgData.accountType,
        tier: orgData.tier,
        stripeCustomerId: orgData.stripeCustomerId || undefined,
        stripeSubscriptionId: orgData.stripeSubscriptionId || undefined,
        createdAt: orgData.createdAt?.toDate?.() || new Date(orgData.createdAt as any),
        updatedAt: orgData.updatedAt?.toDate?.() || new Date(orgData.updatedAt as any),
        usage,
      };

      // Add promo details if applicable
      if (orgData.promoDetails) {
        organization.promoDetails = {
          ...orgData.promoDetails,
          grantedAt: orgData.promoDetails.grantedAt?.toDate?.() || new Date(orgData.promoDetails.grantedAt as any),
          expiresAt: orgData.promoDetails.expiresAt?.toDate?.()
            ? orgData.promoDetails.expiresAt.toDate()
            : (orgData.promoDetails.expiresAt ? new Date(orgData.promoDetails.expiresAt as any) : null),
        };
      }

      return NextResponse.json({ organization });
    } catch (error: any) {
      console.error('[Organization API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organization' },
        { status: 500 }
      );
    }
  });
}

/**
 * Generate mock usage data based on tier and account type
 * TODO: Remove in Phase 3 when real usage tracking is implemented
 */
function generateMockUsage(tier: string, accountType: string): OrganizationUsage {
  const limits = SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS];

  // Special accounts (promo, beta, internal) get unlimited usage display
  if (accountType !== 'regular') {
    return {
      emailsSent: 0,
      emailsLimit: -1, // Unlimited
      contactsTotal: 0,
      contactsLimit: -1,
      aiWordsUsed: 0,
      aiWordsLimit: -1,
      storageUsed: 0,
      storageLimit: -1,
      teamMembersActive: 1,
      teamMembersLimit: -1,
      tier: tier as any,
      lastUpdated: new Date(),
    };
  }

  // Regular accounts: Generate realistic usage (10-90%)
  const emailUsagePercent = Math.random() * 0.8 + 0.1; // 10-90%
  const contactUsagePercent = Math.random() * 0.8 + 0.1;
  const aiWordsUsagePercent = limits.ai_words_per_month === -1 ? 0 : Math.random() * 0.8 + 0.1;
  const storageUsagePercent = Math.random() * 0.5 + 0.1; // 10-60%

  return {
    emailsSent: Math.floor(limits.emails_per_month * emailUsagePercent),
    emailsLimit: limits.emails_per_month,
    contactsTotal: Math.floor(limits.contacts * contactUsagePercent),
    contactsLimit: limits.contacts,
    aiWordsUsed: limits.ai_words_per_month === -1 ? 0 : Math.floor(limits.ai_words_per_month * aiWordsUsagePercent),
    aiWordsLimit: limits.ai_words_per_month,
    storageUsed: Math.floor(limits.storage_bytes * storageUsagePercent),
    storageLimit: limits.storage_bytes,
    teamMembersActive: 1,
    teamMembersLimit: limits.users,
    tier: tier as any,
    lastUpdated: new Date(),
  };
}

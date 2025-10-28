/**
 * Super-Admin Organizations API
 * GET /api/super-admin/organizations - Alle Organizations mit Account Type laden
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { isSuperAdmin } from '@/lib/api/super-admin-check';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { Organization, OrganizationUsage } from '@/types/organization';
import { getLimitsForTier, isUnlimited } from '@/config/subscription-limits';

/**
 * GET - Alle Organizations laden
 */
/**
 * Generate Mock Usage Data for an Organization
 * TODO: In Phase 2 - Replace with real usage data from usage collection
 */
function generateMockUsage(tier: string, accountType: string): OrganizationUsage {
  const limits = getLimitsForTier(tier);

  // Special Accounts haben keine Limits
  if (accountType !== 'regular') {
    return {
      emailsSent: Math.floor(Math.random() * 5000),
      emailsLimit: -1, // Unlimited
      contactsTotal: Math.floor(Math.random() * 10000),
      contactsLimit: -1, // Unlimited
      aiWordsUsed: Math.floor(Math.random() * 100000),
      aiWordsLimit: -1, // Unlimited
      storageUsed: Math.floor(Math.random() * 10 * 1024 * 1024 * 1024), // 0-10 GB
      storageLimit: -1, // Unlimited
      teamMembersActive: Math.floor(Math.random() * 5) + 1,
      teamMembersLimit: -1, // Unlimited
      tier: tier as any,
      lastUpdated: new Date() as any,
    };
  }

  // Regular Accounts: Generiere realistische Mock-Daten (10-90% Usage)
  const emailUsagePercent = Math.random() * 0.8 + 0.1; // 10-90%
  const contactUsagePercent = Math.random() * 0.8 + 0.1;
  const storageUsagePercent = Math.random() * 0.8 + 0.1;
  const aiUsagePercent = isUnlimited(limits.ai_words_per_month) ? 0 : Math.random() * 0.8 + 0.1;

  return {
    emailsSent: Math.floor(limits.emails_per_month * emailUsagePercent),
    emailsLimit: limits.emails_per_month,
    contactsTotal: Math.floor(limits.contacts * contactUsagePercent),
    contactsLimit: limits.contacts,
    aiWordsUsed: isUnlimited(limits.ai_words_per_month) ? Math.floor(Math.random() * 100000) : Math.floor(limits.ai_words_per_month * aiUsagePercent),
    aiWordsLimit: limits.ai_words_per_month,
    storageUsed: Math.floor(limits.storage_bytes * storageUsagePercent),
    storageLimit: limits.storage_bytes,
    teamMembersActive: Math.floor(Math.random() * limits.users) + 1,
    teamMembersLimit: limits.users,
    tier: tier as any,
    lastUpdated: new Date() as any,
  };
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Super-Admin Check
    const isSA = await isSuperAdmin(auth.userId);

    if (!isSA) {
      return NextResponse.json(
        { error: 'Unauthorized - Super-Admin access required' },
        { status: 403 }
      );
    }

    try {
      // Alle Organizations aus Firestore laden
      const orgsSnapshot = await adminDb.collection('organizations').get();

      const organizations: Organization[] = [];

      for (const doc of orgsSnapshot.docs) {
        const data = doc.data();

        // TODO: In Phase 2 - Load real usage from usage collection
        const mockUsage = generateMockUsage(data.tier || 'STARTER', data.accountType || 'regular');

        organizations.push({
          id: doc.id,
          name: data.name || 'Unbekannt',
          adminEmail: data.adminEmail || '',
          accountType: data.accountType || 'regular',
          tier: data.tier || 'STARTER',
          promoDetails: data.promoDetails || undefined,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          usage: mockUsage,
        });
      }

      // Sortiere nach Name
      organizations.sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({
        success: true,
        organizations,
        total: organizations.length,
      });
    } catch (error: any) {
      console.error('Error loading organizations:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Admin API: Sync Usage for Organization
 * POST /api/admin/sync-usage
 *
 * Initializes or syncs usage tracking for an organization:
 * - Initializes usage subcollection if not exists
 * - Counts and syncs contacts from Firestore
 * - Syncs team members count
 *
 * This is useful for:
 * - Existing organizations without usage tracking
 * - Re-syncing after manual data changes
 * - Testing the usage tracking system
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { initializeUsageTracking, syncContactsUsage, updateTeamMembersUsage } from '@/lib/usage/usage-tracker';
import { SubscriptionTier } from '@/types/organization';

export async function POST(request: NextRequest) {
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

      const orgData = orgDoc.data();
      const tier = orgData?.tier as SubscriptionTier;

      if (!tier) {
        return NextResponse.json(
          { error: 'Organization tier not found' },
          { status: 400 }
        );
      }

      // Check if usage already exists
      const usageDoc = await adminDb
        .collection('organizations')
        .doc(auth.organizationId)
        .collection('usage')
        .doc('current')
        .get();

      // Initialize if not exists
      if (!usageDoc.exists) {
        console.log(`[Sync] Initializing usage tracking for org ${auth.organizationId}`);
        await initializeUsageTracking(auth.organizationId, tier);
      }

      // Sync contacts count
      console.log(`[Sync] Syncing contacts for org ${auth.organizationId}`);
      await syncContactsUsage(auth.organizationId);

      // Sync team members count
      console.log(`[Sync] Syncing team members for org ${auth.organizationId}`);
      const activeMembersSnapshot = await adminDb
        .collection('team_members')
        .where('organizationId', '==', auth.organizationId)
        .where('status', '==', 'active')
        .get();

      const activeCount = activeMembersSnapshot.size;
      await updateTeamMembersUsage(auth.organizationId, activeCount);

      // Fetch final usage data to return
      const finalUsageDoc = await adminDb
        .collection('organizations')
        .doc(auth.organizationId)
        .collection('usage')
        .doc('current')
        .get();

      const usage = finalUsageDoc.data();

      return NextResponse.json({
        success: true,
        message: 'Usage synchronized successfully',
        usage: {
          contacts: usage?.contactsTotal || 0,
          teamMembers: usage?.teamMembersActive || 0,
          emails: usage?.emailsSent || 0,
          aiWords: usage?.aiWordsUsed || 0,
          storage: usage?.storageUsed || 0,
        },
      });
    } catch (error: any) {
      console.error('[Sync Usage] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to sync usage' },
        { status: 500 }
      );
    }
  });
}

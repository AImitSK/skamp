/**
 * Admin API: Sync Team Members Counts
 * GET /api/admin/sync-team-counts
 *
 * Counts actual active team members and updates usage/current for all orgs
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { updateTeamMembersUsage } from '@/lib/usage/usage-tracker';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth) => {
    try {
      console.log('🔧 Starting team members count sync...');

      // Get all organizations
      const orgsSnapshot = await adminDb.collection('organizations').get();
      console.log(`Found ${orgsSnapshot.size} organizations`);

      const results = [];
      let fixed = 0;
      let failed = 0;

      for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;
        const orgData = orgDoc.data();

        try {
          // Count active team members
          const activeMembersSnapshot = await adminDb
            .collection('team_members')
            .where('organizationId', '==', orgId)
            .where('status', '==', 'active')
            .get();

          const actualCount = activeMembersSnapshot.size;

          // Get current usage
          const usageDoc = await adminDb
            .collection('organizations')
            .doc(orgId)
            .collection('usage')
            .doc('current')
            .get();

          if (usageDoc.exists) {
            const currentCount = usageDoc.data()?.teamMembersActive || 0;

            if (currentCount !== actualCount) {
              console.log(`📊 ${orgData.name || orgId}: ${currentCount} → ${actualCount}`);

              // Update to correct count
              await updateTeamMembersUsage(orgId, actualCount);

              results.push({
                orgId,
                name: orgData.name || orgId,
                before: currentCount,
                after: actualCount,
                status: 'updated'
              });

              fixed++;
            } else {
              results.push({
                orgId,
                name: orgData.name || orgId,
                count: actualCount,
                status: 'correct'
              });
            }
          } else {
            results.push({
              orgId,
              name: orgData.name || orgId,
              status: 'no_usage_doc'
            });
          }

        } catch (error: any) {
          console.error(`❌ Failed for ${orgId}:`, error);
          results.push({
            orgId,
            name: orgData.name || orgId,
            status: 'error',
            error: error.message
          });
          failed++;
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          total: orgsSnapshot.size,
          fixed,
          failed,
          correct: orgsSnapshot.size - fixed - failed
        },
        results
      });

    } catch (error: any) {
      console.error('[Sync Team Counts] Error:', error);
      return NextResponse.json(
        { error: 'Failed to sync team counts' },
        { status: 500 }
      );
    }
  });
}

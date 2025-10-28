/**
 * Script to fix team members count in usage tracking
 *
 * Counts actual active team members and updates usage/current
 */

import { adminDb } from '../src/lib/firebase/admin-init';
import { updateTeamMembersUsage } from '../src/lib/usage/usage-tracker';

async function fixTeamMembersCount() {
  try {
    console.log('🔧 Starting team members count fix...\n');

    // Get all organizations
    const orgsSnapshot = await adminDb.collection('organizations').get();
    console.log(`Found ${orgsSnapshot.size} organizations\n`);

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
            console.log(`📊 ${orgData.name || orgId}:`);
            console.log(`   Current: ${currentCount} → Actual: ${actualCount}`);

            // Update to correct count
            await updateTeamMembersUsage(orgId, actualCount);
            console.log(`   ✅ Updated\n`);
            fixed++;
          } else {
            console.log(`✓ ${orgData.name || orgId}: ${actualCount} (already correct)`);
          }
        } else {
          console.log(`⚠️ ${orgData.name || orgId}: No usage doc found`);
        }

      } catch (error) {
        console.error(`❌ Failed for ${orgId}:`, error);
        failed++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${orgsSnapshot.size}`);

  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
fixTeamMembersCount()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

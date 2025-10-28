/**
 * Setup Script: Super-Admin Organization ID
 * Findet und speichert die Super-Admin Organization ID in Firestore
 * Damit können Firestore Rules darauf zugreifen
 *
 * Run: npx tsx src/scripts/setup-super-admin-org.ts
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin-init';
import { SUPER_ADMIN_OWNER_EMAIL } from '@/lib/config/super-admin';

async function setupSuperAdminOrg() {
  console.log('🔍 Finding Super-Admin Organization...\n');

  try {
    // 1. Finde User mit Super-Admin Email
    const userRecord = await adminAuth.getUserByEmail(SUPER_ADMIN_OWNER_EMAIL);
    console.log(`✅ Found Super-Admin user: ${userRecord.uid}`);

    // 2. Finde Organization des Users
    const teamMemberSnapshot = await adminDb
      .collection('team_members')
      .where('userId', '==', userRecord.uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (teamMemberSnapshot.empty) {
      console.error('❌ Super-Admin user has no organization membership');
      process.exit(1);
    }

    const orgId = teamMemberSnapshot.docs[0].data().organizationId;
    console.log(`✅ Found Super-Admin Organization: ${orgId}`);

    // 3. Speichere in system_settings für Firestore Rules
    await adminDb.collection('system_settings').doc('super_admin').set({
      organizationId: orgId,
      ownerEmail: SUPER_ADMIN_OWNER_EMAIL,
      updatedAt: new Date(),
      updatedBy: 'setup-script',
    });

    console.log(`\n✅ Super-Admin Organization ID saved to system_settings/super_admin`);
    console.log(`\n📝 Firestore Rules können nun darauf zugreifen mit:`);
    console.log(`   get(/databases/$(database)/documents/system_settings/super_admin).data.organizationId`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupSuperAdminOrg()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

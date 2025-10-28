/**
 * Migration Script: Add accountType to Organizations
 * Migriert alle bestehenden Organizations zu accountType = 'regular'
 *
 * Run: npx tsx src/scripts/migrate-organizations-to-accounttype.ts
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Super-Admin Organization IDs (müssen manuell angepasst werden)
 * Diese werden als 'internal' markiert
 */
const SUPER_ADMIN_ORG_IDS: string[] = [
  // TODO: Füge hier die Super-Admin Organization IDs hinzu
  // Beispiel: 'org_12345', 'org_67890'
];

/**
 * Super-Admin Organization Names (Alternative Identifikation)
 */
const SUPER_ADMIN_ORG_NAMES = [
  'CeleroPress Internal',
  'Super Admin',
  'Admin Organization',
  // Weitere Namen können hier hinzugefügt werden
];

/**
 * Migrate all existing organizations to have accountType field
 */
export async function migrateOrganizationsToAccountType() {
  console.log('🚀 Starting Organization Migration to Account Type System...\n');

  try {
    const orgsSnapshot = await adminDb.collection('organizations').get();

    console.log(`📊 Found ${orgsSnapshot.size} organizations to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let internalCount = 0;

    for (const doc of orgsSnapshot.docs) {
      const data = doc.data();

      // Skip if already has accountType
      if (data.accountType) {
        console.log(`⏭️  ${doc.id} - Already migrated (accountType: ${data.accountType})`);
        skippedCount++;
        continue;
      }

      // Determine accountType based on existing data
      let accountType: 'regular' | 'internal' = 'regular';
      let defaultTier = data.tier || 'STARTER'; // Bestehende Tier oder Default STARTER

      // Mark super-admin organizations as internal
      if (
        SUPER_ADMIN_ORG_IDS.includes(doc.id) ||
        SUPER_ADMIN_ORG_NAMES.includes(data.name)
      ) {
        accountType = 'internal';
        internalCount++;
        console.log(`🔐 ${doc.id} - Marked as INTERNAL (${data.name})`);
      } else {
        console.log(`👤 ${doc.id} - Marked as REGULAR (${data.name})`);
      }

      // Update organization
      await adminDb
        .collection('organizations')
        .doc(doc.id)
        .update({
          accountType,
          tier: defaultTier,
          updatedAt: Timestamp.now(),
        });

      migratedCount++;
    }

    console.log('\n✅ Migration complete!\n');
    console.log('📊 Statistics:');
    console.log(`   - Total organizations: ${orgsSnapshot.size}`);
    console.log(`   - Migrated: ${migratedCount}`);
    console.log(`   - Skipped (already migrated): ${skippedCount}`);
    console.log(`   - Marked as internal: ${internalCount}`);
    console.log(`   - Marked as regular: ${migratedCount - internalCount}`);
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

/**
 * Verify migration
 * Überprüft ob alle Organizations ein accountType Field haben
 */
export async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  try {
    const orgsSnapshot = await adminDb.collection('organizations').get();

    let totalCount = 0;
    let regularCount = 0;
    let promoCount = 0;
    let betaCount = 0;
    let internalCount = 0;
    let missingCount = 0;

    for (const doc of orgsSnapshot.docs) {
      const data = doc.data();
      totalCount++;

      if (!data.accountType) {
        console.log(`❌ ${doc.id} - Missing accountType!`);
        missingCount++;
      } else {
        switch (data.accountType) {
          case 'regular':
            regularCount++;
            break;
          case 'promo':
            promoCount++;
            break;
          case 'beta':
            betaCount++;
            break;
          case 'internal':
            internalCount++;
            break;
        }
      }
    }

    console.log('\n📊 Verification Results:');
    console.log(`   - Total organizations: ${totalCount}`);
    console.log(`   - Regular: ${regularCount}`);
    console.log(`   - Promo: ${promoCount}`);
    console.log(`   - Beta: ${betaCount}`);
    console.log(`   - Internal: ${internalCount}`);
    console.log(`   - Missing accountType: ${missingCount}`);

    if (missingCount === 0) {
      console.log('\n✅ All organizations have accountType!');
    } else {
      console.log(`\n⚠️  ${missingCount} organizations are missing accountType!`);
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  (async () => {
    try {
      // Run migration
      await migrateOrganizationsToAccountType();

      console.log('\n---\n');

      // Verify migration
      await verifyMigration();

      process.exit(0);
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  })();
}

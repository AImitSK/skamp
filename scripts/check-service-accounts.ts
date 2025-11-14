/**
 * Check Service Accounts Status
 *
 * Prüft ob Service Accounts korrekt in team_members und Auth konfiguriert sind
 *
 * Usage:
 *   npx tsx scripts/check-service-accounts.ts
 */

import { adminDb, adminAuth } from '../src/lib/firebase/admin-init';

const SERVICE_ACCOUNTS = [
  {
    userId: 'H2cyq2rzo5dOBWBMuChydh57pLh1',
    email: 'cron-service@celeropress.com'
  },
  {
    userId: 'GmeBGRXBBtWykKmNddv6GotMCJ02',
    email: 'test@example.com'
  }
];

const SUPER_ADMIN_ORG_ID = 'sk-online-marketing';

async function checkServiceAccount(account: typeof SERVICE_ACCOUNTS[0]) {
  console.log(`\n📋 Checking: ${account.email}`);
  console.log(`   User ID: ${account.userId}`);

  const issues: string[] = [];

  // 1. Prüfe Firebase Auth
  try {
    const authUser = await adminAuth.getUser(account.userId);
    console.log('   ✅ Auth User existiert');
    console.log(`      Email: ${authUser.email}`);

    // Prüfe Custom Claims
    const claims = authUser.customClaims || {};
    if (claims.organizationId) {
      console.log(`   ✅ Custom Claim: organizationId = ${claims.organizationId}`);
    } else {
      console.log('   ❌ Custom Claim: organizationId fehlt');
      issues.push('Custom Claim organizationId fehlt');
    }

    if (claims.role) {
      console.log(`   ✅ Custom Claim: role = ${claims.role}`);
    } else {
      console.log('   ⚠️  Custom Claim: role fehlt');
    }

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('   ❌ Auth User existiert NICHT');
      issues.push('User existiert nicht in Firebase Auth');
    } else {
      console.log('   ❌ Fehler beim Lesen von Auth:', error.message);
      issues.push(`Auth Error: ${error.message}`);
    }
  }

  // 2. Prüfe team_members Document
  const memberId = `${account.userId}_${SUPER_ADMIN_ORG_ID}`;
  try {
    const memberDoc = await adminDb.collection('team_members').doc(memberId).get();

    if (memberDoc.exists) {
      const data = memberDoc.data();
      console.log('   ✅ team_members Document existiert');
      console.log(`      ID: ${memberId}`);

      // Prüfe erforderliche Felder
      const requiredFields = ['userId', 'email', 'organizationId', 'role', 'status'];
      const missingFields = requiredFields.filter(field => !data?.[field]);

      if (missingFields.length === 0) {
        console.log('   ✅ Alle erforderlichen Felder vorhanden');
        console.log(`      organizationId: ${data?.organizationId}`);
        console.log(`      role: ${data?.role}`);
        console.log(`      status: ${data?.status}`);
      } else {
        console.log(`   ❌ Fehlende Felder: ${missingFields.join(', ')}`);
        issues.push(`Fehlende Felder: ${missingFields.join(', ')}`);
      }

    } else {
      console.log('   ❌ team_members Document existiert NICHT');
      console.log(`      Erwartete ID: ${memberId}`);
      issues.push('team_members Document fehlt');
    }

  } catch (error: any) {
    console.log('   ❌ Fehler beim Lesen von team_members:', error.message);
    issues.push(`Firestore Error: ${error.message}`);
  }

  // 3. Zusammenfassung
  if (issues.length === 0) {
    console.log('   ✅ Alle Prüfungen bestanden!');
    return true;
  } else {
    console.log(`   ⚠️  ${issues.length} Problem(e) gefunden:`);
    issues.forEach((issue, i) => {
      console.log(`      ${i + 1}. ${issue}`);
    });
    return false;
  }
}

async function main() {
  console.log('🔍 Service Account Status Check');
  console.log('================================\n');

  const results = await Promise.all(
    SERVICE_ACCOUNTS.map(account => checkServiceAccount(account))
  );

  const allValid = results.every(r => r);

  console.log('\n================================');
  if (allValid) {
    console.log('✅ Alle Service Accounts sind korrekt konfiguriert!');
  } else {
    console.log('⚠️  Einige Service Accounts haben Probleme');
    console.log('\nZum Beheben ausführen:');
    console.log('  npx tsx scripts/setup-service-accounts.ts');
  }
  console.log('================================\n');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check fehlgeschlagen:', error);
    process.exit(1);
  });

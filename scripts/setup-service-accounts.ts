/**
 * Setup Service Accounts in team_members Collection
 *
 * Erstellt team_members Dokumente für Service Accounts die für Cron Jobs
 * und Admin-Funktionen benötigt werden.
 *
 * Usage:
 *   npx tsx scripts/setup-service-accounts.ts
 */

import { adminDb, adminAuth } from '../src/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';

// Service Accounts Configuration
const SERVICE_ACCOUNTS = [
  {
    userId: 'H2cyq2rzo5dOBWBMuChydh57pLh1',
    email: 'cron-service@celeropress.com',
    displayName: 'Cron Service Account',
    role: 'service',
    description: 'Service Account für Cron Jobs (Email-Versand, Monitoring, etc.)'
  },
  {
    userId: 'GmeBGRXBBtWykKmNddv6GotMCJ02',
    email: 'test@example.com',
    displayName: 'Test Service Account',
    role: 'admin',
    description: 'Service Account für Tests und Development'
  }
];

// Super-Admin Organization ID (aus system_settings/super_admin)
const SUPER_ADMIN_ORG_ID = 'sk-online-marketing'; // Anpassen falls anders

async function setupServiceAccount(account: typeof SERVICE_ACCOUNTS[0]) {
  console.log(`\n📋 Setup: ${account.email}`);
  console.log(`   User ID: ${account.userId}`);

  try {
    // 1. Prüfe ob User in Firebase Auth existiert
    console.log('   ✓ Prüfe Firebase Auth...');
    let authUser;
    try {
      authUser = await adminAuth.getUser(account.userId);
      console.log(`   ✅ Auth User existiert: ${authUser.email}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('   ⚠️  User existiert nicht in Firebase Auth');
        console.log('   ℹ️  Bitte erstelle den User in Firebase Console:');
        console.log(`      - Email: ${account.email}`);
        console.log(`      - UID: ${account.userId}`);
        return;
      }
      throw error;
    }

    // 2. Erstelle/Update team_members Document
    const memberId = `${account.userId}_${SUPER_ADMIN_ORG_ID}`;
    const memberRef = adminDb.collection('team_members').doc(memberId);

    console.log(`   ✓ Erstelle team_members/${memberId}...`);

    const memberData = {
      id: memberId,
      userId: account.userId,
      email: account.email,
      organizationId: SUPER_ADMIN_ORG_ID,
      role: account.role,
      status: 'active',
      displayName: account.displayName,
      photoUrl: null,

      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      joinedAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),

      // Keine Einladung (direkter Service Account)
      invitedBy: null,
      invitationToken: null,
      invitationTokenExpiry: null,

      // Metadaten
      isServiceAccount: true,
      description: account.description
    };

    await memberRef.set(memberData, { merge: true });
    console.log('   ✅ team_members Document erstellt/aktualisiert');

    // 3. Setze Custom Claims
    console.log('   ✓ Setze Custom Claims...');
    await adminAuth.setCustomUserClaims(account.userId, {
      organizationId: SUPER_ADMIN_ORG_ID,
      role: account.role,
      isServiceAccount: true
    });
    console.log('   ✅ Custom Claims gesetzt');

    // 4. Verifiziere
    console.log('   ✓ Verifiziere Setup...');
    const verifyDoc = await memberRef.get();
    if (verifyDoc.exists) {
      const data = verifyDoc.data();
      console.log('   ✅ Verifikation erfolgreich:');
      console.log(`      - organizationId: ${data?.organizationId}`);
      console.log(`      - role: ${data?.role}`);
      console.log(`      - status: ${data?.status}`);
    } else {
      console.log('   ❌ Verifikation fehlgeschlagen: Document nicht gefunden');
    }

  } catch (error) {
    console.error(`   ❌ Fehler beim Setup von ${account.email}:`, error);
  }
}

async function main() {
  console.log('🚀 Service Account Setup');
  console.log('========================\n');
  console.log(`Super-Admin Org ID: ${SUPER_ADMIN_ORG_ID}`);
  console.log(`Service Accounts: ${SERVICE_ACCOUNTS.length}\n`);

  // 1. Prüfe Super-Admin Organization
  try {
    const superAdminDoc = await adminDb.collection('system_settings').doc('super_admin').get();
    if (superAdminDoc.exists) {
      const data = superAdminDoc.data();
      console.log('✅ Super-Admin Organization gefunden:');
      console.log(`   - ID: ${data?.organizationId}`);
      console.log(`   - Name: ${data?.name || 'N/A'}`);
      console.log('');
    } else {
      console.log('⚠️  Super-Admin Organization nicht gefunden in system_settings/super_admin');
      console.log('   Verwende Default: sk-online-marketing\n');
    }
  } catch (error) {
    console.log('⚠️  Fehler beim Lesen von system_settings/super_admin:', error);
    console.log('   Fahre mit Default fort: sk-online-marketing\n');
  }

  // 2. Setup alle Service Accounts
  for (const account of SERVICE_ACCOUNTS) {
    await setupServiceAccount(account);
  }

  console.log('\n✅ Service Account Setup abgeschlossen!');
  console.log('\nNächste Schritte:');
  console.log('1. Prüfe Firebase Console ob Custom Claims gesetzt sind');
  console.log('2. User muss sich neu anmelden damit Claims aktiv werden');
  console.log('3. Teste Cron Jobs mit neuem Setup');
}

main()
  .then(() => {
    console.log('\n✨ Script erfolgreich beendet');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

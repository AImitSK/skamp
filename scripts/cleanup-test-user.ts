/**
 * Script zum Löschen des E2E-Test-Users
 * Wird vor jedem E2E-Test-Durchlauf ausgeführt
 */

import { adminDb, adminAuth } from '../src/lib/firebase/admin-init';

const email = process.argv[2] || 'newuser-e2e@test.com';

async function cleanupTestUser() {
  try {
    console.log(`🧹 Cleanup für ${email} wird gestartet...`);

    // 1. Lösche aus team_members
    const membersSnapshot = await adminDb
      .collection('team_members')
      .where('email', '==', email)
      .get();

    if (!membersSnapshot.empty) {
      const deletePromises = membersSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      console.log(`✅ ${membersSnapshot.size} team_members Einträge gelöscht`);
    } else {
      console.log(`ℹ️  Keine team_members Einträge gefunden`);
    }

    // 2. Lösche Firebase Auth User
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.deleteUser(userRecord.uid);
      console.log(`✅ Firebase Auth User gelöscht (UID: ${userRecord.uid})`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`ℹ️  Kein Firebase Auth User gefunden`);
      } else {
        throw error;
      }
    }

    console.log(`✅ Cleanup für ${email} abgeschlossen`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler beim Cleanup:', error);
    process.exit(1);
  }
}

cleanupTestUser();

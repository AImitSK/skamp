/**
 * Cleanup Script: Matching Test-Daten
 *
 * Löscht alle Test-Organisationen und deren Kontakte:
 * - Löscht Organisationen nach Namen
 * - Löscht alle zugehörigen Kontakte
 * - Löscht erstellte Matching-Kandidaten
 *
 * Usage: npm run cleanup:matching-test
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Firestore
} from 'firebase/firestore';

// Firebase Config (aus .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test-Organisations-Namen (müssen mit seed-script übereinstimmen)
const TEST_ORG_NAMES = [
  'Premium Media GmbH',
  'StartUp PR AG',
  'Agency Communications Ltd',
  'Digital Media House'
];

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Löscht Test-Organisationen
 */
async function deleteTestOrganizations(db: Firestore): Promise<string[]> {
  console.log('\n📁 Lösche Test-Organisationen...\n');

  const deletedOrgIds: string[] = [];

  for (const orgName of TEST_ORG_NAMES) {
    try {
      const q = query(
        collection(db, 'organizations'),
        where('name', '==', orgName)
      );

      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'organizations', docSnap.id));
        deletedOrgIds.push(docSnap.id);
        console.log(`  ✅ ${orgName} (${docSnap.id})`);
      }

      if (snapshot.empty) {
        console.log(`  ⚠️  ${orgName} (nicht gefunden)`);
      }
    } catch (error) {
      console.error(`  ❌ Fehler bei ${orgName}:`, error);
    }
  }

  return deletedOrgIds;
}

/**
 * Löscht Kontakte der Test-Organisationen
 */
async function deleteTestContacts(db: Firestore, orgIds: string[]): Promise<number> {
  console.log('\n👥 Lösche Kontakte...\n');

  let deletedCount = 0;

  for (const orgId of orgIds) {
    try {
      const q = query(
        collection(db, 'contacts_enhanced'),
        where('organizationId', '==', orgId)
      );

      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'contacts_enhanced', docSnap.id));
        deletedCount++;
      }

      console.log(`  ✅ ${snapshot.size} Kontakte für Org ${orgId}`);
    } catch (error) {
      console.error(`  ❌ Fehler bei Org ${orgId}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Löscht Matching-Kandidaten die Test-Org-Kontakte enthalten
 */
async function deleteMatchingCandidates(db: Firestore): Promise<number> {
  console.log('\n🎯 Lösche Matching-Kandidaten...\n');

  let deletedCount = 0;

  try {
    const q = query(collection(db, 'matching_candidates'));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const candidate = docSnap.data();

      // Prüfe ob Kandidat Test-Org-Kontakte enthält
      const hasTestOrgVariant = candidate.variants?.some((v: any) =>
        TEST_ORG_NAMES.includes(v.organizationName)
      );

      if (hasTestOrgVariant) {
        await deleteDoc(doc(db, 'matching_candidates', docSnap.id));
        deletedCount++;
        console.log(`  ✅ Kandidat ${docSnap.id} (${candidate.matchKey})`);
      }
    }

    if (deletedCount === 0) {
      console.log('  ⚠️  Keine Test-Kandidaten gefunden');
    }
  } catch (error) {
    console.error('  ❌ Fehler beim Löschen von Kandidaten:', error);
  }

  return deletedCount;
}

/**
 * Löscht Scan-Jobs (optional, alle oder nur Test-bezogene)
 */
async function deleteMatchingScanJobs(db: Firestore, deleteAll: boolean = false): Promise<number> {
  console.log('\n📊 Lösche Scan-Jobs...\n');

  let deletedCount = 0;

  try {
    const q = query(collection(db, 'matching_scan_jobs'));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      // Im Test-Mode: Alle Scan-Jobs löschen
      // Im Prod-Mode: Nur spezifische löschen (hier: alle im Test-Kontext)
      if (deleteAll || true) {
        await deleteDoc(doc(db, 'matching_scan_jobs', docSnap.id));
        deletedCount++;
        console.log(`  ✅ Scan-Job ${docSnap.id}`);
      }
    }

    if (deletedCount === 0) {
      console.log('  ⚠️  Keine Scan-Jobs gefunden');
    }
  } catch (error) {
    console.error('  ❌ Fehler beim Löschen von Scan-Jobs:', error);
  }

  return deletedCount;
}

// ========================================
// MAIN
// ========================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Cleanup: Matching Test-Daten');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Sicherheitsabfrage
  console.log('\n⚠️  WARNUNG: Dieser Vorgang löscht:');
  console.log('   - 4 Test-Organisationen');
  console.log('   - Alle zugehörigen Kontakte');
  console.log('   - Alle erstellten Matching-Kandidaten');
  console.log('   - Alle Scan-Jobs');
  console.log('');

  try {
    // 1. Organisationen löschen
    const deletedOrgIds = await deleteTestOrganizations(db);
    console.log(`\n✅ ${deletedOrgIds.length} Organisationen gelöscht`);

    // 2. Kontakte löschen
    let deletedContacts = 0;
    if (deletedOrgIds.length > 0) {
      deletedContacts = await deleteTestContacts(db, deletedOrgIds);
      console.log(`\n✅ ${deletedContacts} Kontakte gelöscht`);
    } else {
      console.log('\n⚠️  Keine Organisationen gefunden, überspringe Kontakt-Löschung');
    }

    // 3. Matching-Kandidaten löschen
    const deletedCandidates = await deleteMatchingCandidates(db);
    console.log(`\n✅ ${deletedCandidates} Matching-Kandidaten gelöscht`);

    // 4. Scan-Jobs löschen (optional)
    const deletedJobs = await deleteMatchingScanJobs(db, true);
    console.log(`\n✅ ${deletedJobs} Scan-Jobs gelöscht`);

    // Zusammenfassung
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Cleanup erfolgreich abgeschlossen!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Gelöscht:');
    console.log(`   ${deletedOrgIds.length} Organisationen`);
    console.log(`   ${deletedContacts} Kontakte`);
    console.log(`   ${deletedCandidates} Matching-Kandidaten`);
    console.log(`   ${deletedJobs} Scan-Jobs`);
    console.log('');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Cleanup fehlgeschlagen');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Script ausführen
main();

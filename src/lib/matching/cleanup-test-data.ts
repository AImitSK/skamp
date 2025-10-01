/**
 * Cleanup Test-Daten (Client-Side)
 *
 * Löscht Test-Organisationen und zugehörige Daten
 * Läuft im Browser mit User-Auth
 */

import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const TEST_ORG_NAMES = [
  'Premium Media GmbH',
  'StartUp PR AG',
  'Agency Communications Ltd',
  'Digital Media House'
];

export async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup (client-side)...');

  const stats = {
    organizations: 0,
    contacts: 0,
    candidates: 0,
    jobs: 0
  };

  // 1. Delete Test Organizations
  const deletedOrgIds: string[] = [];
  for (const orgName of TEST_ORG_NAMES) {
    const q = query(
      collection(db, 'organizations'),
      where('name', '==', orgName)
    );
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'organizations', docSnap.id));
      deletedOrgIds.push(docSnap.id);
      stats.organizations++;
      console.log(`✅ Org deleted: ${orgName}`);
    }
  }

  // 2. Delete Contacts
  for (const orgId of deletedOrgIds) {
    const q = query(
      collection(db, 'contacts_enhanced'),
      where('organizationId', '==', orgId)
    );
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'contacts_enhanced', docSnap.id));
      stats.contacts++;
    }
  }
  console.log(`✅ ${stats.contacts} contacts deleted`);

  // 3. Delete Matching Candidates
  const candidatesQuery = query(collection(db, 'matching_candidates'));
  const candidatesSnapshot = await getDocs(candidatesQuery);

  for (const docSnap of candidatesSnapshot.docs) {
    const candidate = docSnap.data();
    const hasTestOrgVariant = candidate.variants?.some((v: any) =>
      TEST_ORG_NAMES.includes(v.organizationName)
    );

    if (hasTestOrgVariant) {
      await deleteDoc(doc(db, 'matching_candidates', docSnap.id));
      stats.candidates++;
    }
  }
  console.log(`✅ ${stats.candidates} candidates deleted`);

  // 4. Delete Scan Jobs (all)
  const jobsQuery = query(collection(db, 'matching_scan_jobs'));
  const jobsSnapshot = await getDocs(jobsQuery);

  for (const docSnap of jobsSnapshot.docs) {
    await deleteDoc(doc(db, 'matching_scan_jobs', docSnap.id));
    stats.jobs++;
  }
  console.log(`✅ ${stats.jobs} scan jobs deleted`);

  console.log('✅ Test data cleanup completed');

  return stats;
}

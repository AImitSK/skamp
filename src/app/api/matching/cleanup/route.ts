/**
 * API Route: Matching Test-Daten Cleanup
 *
 * Löscht alle Test-Organisationen und zugehörige Daten
 * Nur für Development/Testing!
 *
 * POST /api/matching/cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting test data cleanup...');

    let stats = {
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

    // 4. Delete Scan Jobs (all)
    const jobsQuery = query(collection(db, 'matching_scan_jobs'));
    const jobsSnapshot = await getDocs(jobsQuery);

    for (const docSnap of jobsSnapshot.docs) {
      await deleteDoc(doc(db, 'matching_scan_jobs', docSnap.id));
      stats.jobs++;
    }

    console.log('✅ Test data cleanup completed');

    return NextResponse.json({
      success: true,
      message: 'Test-Daten erfolgreich gelöscht',
      data: stats
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

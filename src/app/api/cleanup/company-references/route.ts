/**
 * API Route: Cleanup ungültiger company_references
 *
 * Löscht company_references mit ungültiger/leerer globalCompanyId
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    // Prüfe Secret
    const adminSecret = process.env.CRON_SECRET;
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🧹 Starting cleanup of invalid company_references...');

    let totalChecked = 0;
    let totalDeleted = 0;

    // Hole alle Organisationen
    const orgsSnapshot = await adminDb.collection('organizations').get();
    console.log(`📊 Found ${orgsSnapshot.size} organizations`);

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      console.log(`\n🔍 Checking organization: ${orgId}`);

      // Hole company_references
      const refsSnapshot = await adminDb
        .collection('organizations')
        .doc(orgId)
        .collection('company_references')
        .get();

      console.log(`   📋 Found ${refsSnapshot.size} company_references`);

      for (const refDoc of refsSnapshot.docs) {
        totalChecked++;
        const ref = refDoc.data();

        // Prüfe ob globalCompanyId ungültig ist
        const isInvalid = !ref.globalCompanyId ||
                         typeof ref.globalCompanyId !== 'string' ||
                         ref.globalCompanyId.trim() === '';

        if (isInvalid) {
          console.log(`   ❌ Deleting invalid reference:`, {
            id: refDoc.id,
            globalCompanyId: ref.globalCompanyId,
            localCompanyId: ref.localCompanyId
          });

          await refDoc.ref.delete();
          totalDeleted++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Cleanup completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Checked: ${totalChecked} references`);
    console.log(`   - Deleted: ${totalDeleted} invalid references`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      stats: {
        totalChecked,
        totalDeleted
      }
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Simple cleanup script für Browser Console
// Kopiere diesen Code in die Browser Console auf www.celeropress.com

(async () => {
  console.log('🧹 Starting cleanup of empty globalCompanyId references...');

  const db = firebase.firestore();

  let totalDeleted = 0;
  let totalChecked = 0;

  try {
    // Hole alle Organisationen
    const orgsSnapshot = await db.collection('organizations').get();
    console.log(`📊 Found ${orgsSnapshot.size} organizations`);

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      console.log(`\n🔍 Checking organization: ${orgId}`);

      // Hole company_references
      const refsSnapshot = await db
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

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
})();

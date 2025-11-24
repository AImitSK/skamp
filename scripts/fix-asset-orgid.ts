import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const assetId = '1SeEDNAmk7OxuGEYlayV';
  const correctOrganizationId = 'hJ4gTE9Gm35epoub0zIU';

  console.log('🔧 Fixing asset organizationId...\n');

  try {
    await adminDb.collection('media_assets').doc(assetId).update({
      organizationId: correctOrganizationId
    });

    console.log(`✅ Asset ${assetId} updated`);
    console.log(`   organizationId: ${correctOrganizationId}`);

    // Verify
    const snap = await adminDb.collection('media_assets').doc(assetId).get();
    const data = snap.data();
    console.log('\n✅ Verified:');
    console.log('   fileName:', data?.fileName);
    console.log('   organizationId:', data?.organizationId);
    console.log('   folderId:', data?.folderId);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
})();

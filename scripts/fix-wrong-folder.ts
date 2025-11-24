import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const wrongFolderId = 'Z6nnAu9KmtB5xTJX8jil';
  const correctFolderId = 'eGCEgZmWi4ws8XLfYxg3';
  const correctOrganizationId = 'hJ4gTE9Gm35epoub0zIU';

  console.log('🔧 Fixing wrong folder and moving assets...\n');

  try {
    // 1. Finde alle Assets im falschen Ordner
    const assetsSnap = await adminDb.collection('media_assets')
      .where('folderId', '==', wrongFolderId)
      .get();

    console.log(`📦 Found ${assetsSnap.size} asset(s) in wrong folder\n`);

    // 2. Verschiebe alle Assets zum korrekten Ordner
    for (const doc of assetsSnap.docs) {
      const data = doc.data();
      await adminDb.collection('media_assets').doc(doc.id).update({
        folderId: correctFolderId,
        organizationId: correctOrganizationId
      });
      console.log(`✅ Moved: ${data.fileName}`);
      console.log(`   From folder: ${wrongFolderId}`);
      console.log(`   To folder: ${correctFolderId}`);
      console.log(`   organizationId: ${correctOrganizationId}\n`);
    }

    // 3. Lösche den falschen Ordner
    await adminDb.collection('media_folders').doc(wrongFolderId).delete();
    console.log(`✅ Deleted wrong folder: ${wrongFolderId}\n`);

    console.log('✅ Done! All assets should now be in the correct folder.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
})();

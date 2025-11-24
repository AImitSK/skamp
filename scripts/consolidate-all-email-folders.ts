import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const orgId = 'hJ4gTE9Gm35epoub0zIU';
  const correctFolderId = 'eGCEgZmWi4ws8XLfYxg3';

  console.log('🔧 Consolidating all Email-Anhänge folders...\n');

  try {
    // 1. Finde alle Email-Anhänge Ordner
    const foldersSnap = await adminDb.collection('media_folders')
      .where('name', '==', 'Email-Anhänge')
      .get();

    console.log(`📁 Found ${foldersSnap.size} "Email-Anhänge" folder(s)\n`);

    // 2. Verschiebe alle Assets zum korrekten Ordner
    let movedCount = 0;
    const foldersToDelete: string[] = [];

    for (const folderDoc of foldersSnap.docs) {
      const folderId = folderDoc.id;

      if (folderId === correctFolderId) {
        console.log(`✅ Skipping correct folder: ${folderId}`);
        continue;
      }

      // Finde alle Assets in diesem Ordner
      const assetsSnap = await adminDb.collection('media_assets')
        .where('folderId', '==', folderId)
        .get();

      console.log(`📦 Found ${assetsSnap.size} asset(s) in wrong folder ${folderId}`);

      // Verschiebe alle Assets
      for (const assetDoc of assetsSnap.docs) {
        const data = assetDoc.data();
        await adminDb.collection('media_assets').doc(assetDoc.id).update({
          folderId: correctFolderId,
          organizationId: orgId
        });
        console.log(`   ✅ Moved: ${data.fileName}`);
        movedCount++;
      }

      foldersToDelete.push(folderId);
    }

    // 3. Lösche falsche Ordner
    console.log(`\n🗑️  Deleting ${foldersToDelete.length} wrong folder(s)...`);
    for (const folderId of foldersToDelete) {
      await adminDb.collection('media_folders').doc(folderId).delete();
      console.log(`   ✅ Deleted: ${folderId}`);
    }

    console.log(`\n✅ Done! Moved ${movedCount} asset(s) and deleted ${foldersToDelete.length} folder(s)`);
    console.log(`   All assets are now in folder: ${correctFolderId}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
})();

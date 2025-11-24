// scripts/consolidate-email-folders.ts
// Konsolidiert alle "Email-Anhänge" Ordner in einen einzigen

import { adminDb } from '../src/lib/firebase/admin-init';

async function consolidateFolders() {
  console.log('🔄 Consolidating Email-Anhänge folders...\n');

  const organizationId = 'hJ4gTE9Gm35epoub0zIU';

  try {
    // 1. Finde alle "Email-Anhänge" Ordner
    const foldersRef = adminDb.collection('media_folders');
    const query = foldersRef
      .where('organizationId', '==', organizationId)
      .where('name', '==', 'Email-Anhänge');

    const snapshot = await query.get();

    console.log(`📁 Found ${snapshot.size} "Email-Anhänge" folder(s)\n`);

    if (snapshot.size <= 1) {
      console.log('✅ Only one folder - nothing to consolidate');
      return;
    }

    // 2. Wähle den ersten als "Master"
    const masterFolder = snapshot.docs[0];
    const masterFolderId = masterFolder.id;
    console.log(`✅ Using master folder: ${masterFolderId}`);

    // 3. Lösche alle anderen Ordner und verschiebe deren Assets
    for (let i = 1; i < snapshot.docs.length; i++) {
      const duplicateFolder = snapshot.docs[i];
      const duplicateFolderId = duplicateFolder.id;

      console.log(`\n📦 Processing duplicate: ${duplicateFolderId}`);

      // Finde alle Assets in diesem Ordner
      const assetsQuery = await adminDb.collection('media_assets')
        .where('folderId', '==', duplicateFolderId)
        .get();

      console.log(`   Found ${assetsQuery.size} asset(s)`);

      // Verschiebe Assets zum Master-Ordner
      if (!assetsQuery.empty) {
        const batch = adminDb.batch();
        assetsQuery.docs.forEach(doc => {
          batch.update(doc.ref, { folderId: masterFolderId });
          console.log(`   ✅ Moved: ${doc.data().fileName}`);
        });
        await batch.commit();
      }

      // Lösche duplizierten Ordner
      await duplicateFolder.ref.delete();
      console.log(`   🗑️  Deleted duplicate folder`);
    }

    // 4. Zähle finale Assets im Master-Ordner
    const finalAssetsQuery = await adminDb.collection('media_assets')
      .where('folderId', '==', masterFolderId)
      .get();

    console.log(`\n✅ Consolidation complete!`);
    console.log(`   Master folder: ${masterFolderId}`);
    console.log(`   Total assets: ${finalAssetsQuery.size}`);

    finalAssetsQuery.docs.forEach(doc => {
      const data = doc.data();
      console.log(`      - ${data.fileName} (${data.metadata?.fileSize || 0} bytes)`);
    });

  } catch (error: any) {
    console.error('❌ Consolidation failed:', error.message);
    throw error;
  }
}

// Run
consolidateFolders()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

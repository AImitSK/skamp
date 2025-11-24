// scripts/check-email-assets.ts
// Prüft Email-Anhänge Ordner und Assets

import { adminDb } from '../src/lib/firebase/admin-init';

async function checkEmailAssets() {
  console.log('🔍 Checking Email-Anhänge folder and assets...\n');

  const organizationId = 'hJ4gTE9Gm35epoub0zIU';

  try {
    // 1. Finde "Email-Anhänge" Ordner
    const foldersRef = adminDb.collection('media_folders');
    const folderQuery = foldersRef
      .where('organizationId', '==', organizationId)
      .where('name', '==', 'Email-Anhänge')
      .limit(1);

    const folderSnapshot = await folderQuery.get();

    if (folderSnapshot.empty) {
      console.log('❌ No "Email-Anhänge" folder found!');
      return;
    }

    const folder = folderSnapshot.docs[0];
    const folderId = folder.id;
    const folderData = folder.data();

    console.log('📁 Email-Anhänge Folder:');
    console.log(`   ID: ${folderId}`);
    console.log(`   createdBy: ${folderData.createdBy}`);
    console.log(`   organizationId: ${folderData.organizationId}`);
    console.log(`   parentFolderId: ${folderData.parentFolderId || '(root)'}`);
    console.log('');

    // 2. Finde alle Assets mit diesem folderId
    const assetsQuery = await adminDb.collection('media_assets')
      .where('folderId', '==', folderId)
      .get();

    console.log(`📦 Assets in folder: ${assetsQuery.size}\n`);

    if (assetsQuery.empty) {
      console.log('❌ No assets found in folder!');
      console.log('');
      console.log('🔍 Looking for orphaned assets (might have wrong folderId)...');

      // Suche nach Assets mit isEmailAttachment flag
      const orphanedQuery = await adminDb.collection('media_assets')
        .where('organizationId', '==', organizationId)
        .where('metadata.isEmailAttachment', '==', true)
        .get();

      console.log(`Found ${orphanedQuery.size} email attachment asset(s) in total:\n`);

      orphanedQuery.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   📎 ${data.fileName}`);
        console.log(`      Asset ID: ${doc.id}`);
        console.log(`      folderId: ${data.folderId}`);
        console.log(`      Correct?: ${data.folderId === folderId ? '✅' : '❌'}`);
        console.log('');
      });

    } else {
      assetsQuery.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   📎 ${data.fileName}`);
        console.log(`      Asset ID: ${doc.id}`);
        console.log(`      Size: ${data.metadata?.fileSize || 0} bytes`);
        console.log(`      Message ID: ${data.metadata?.emailMessageId || 'unknown'}`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    throw error;
  }
}

// Run
checkEmailAssets()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

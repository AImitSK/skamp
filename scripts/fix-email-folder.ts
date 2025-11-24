// scripts/fix-email-folder.ts
// Fix Email-Anhänge Ordner

import { adminDb } from '../src/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

async function fixEmailFolder() {
  console.log('🔧 Fixing Email-Anhänge folder...\n');

  const organizationId = 'hJ4gTE9Gm35epoub0zIU';

  try {
    // 1. Lösche den alten Ordner
    const oldFolderId = 'SLu3UaBThEGbtIjLAbDx';
    await adminDb.collection('media_folders').doc(oldFolderId).delete();
    console.log('✅ Deleted old folder');

    // 2. Erstelle neuen Ordner mit korrekten Werten
    const folderData = {
      organizationId,
      name: 'Email-Anhänge',
      description: 'Automatisch gespeicherte Email-Anhänge',
      createdBy: organizationId, // ← WICHTIG: Verwende organizationId statt 'system'
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      color: '#3B82F6',
    };

    const newFolderRef = await adminDb.collection('media_folders').add(folderData);
    console.log(`✅ Created new folder: ${newFolderRef.id}`);

    // 3. Update alle media_assets, die auf den alten Ordner verweisen
    const assetsQuery = await adminDb.collection('media_assets')
      .where('folderId', '==', oldFolderId)
      .get();

    if (!assetsQuery.empty) {
      const batch = adminDb.batch();
      assetsQuery.docs.forEach(doc => {
        batch.update(doc.ref, { folderId: newFolderRef.id });
      });
      await batch.commit();
      console.log(`✅ Updated ${assetsQuery.size} assets to new folder`);
    }

    console.log('\n✅ Fix completed successfully');

  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
    throw error;
  }
}

// Run
fixEmailFolder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

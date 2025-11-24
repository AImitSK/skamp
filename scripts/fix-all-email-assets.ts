// scripts/fix-all-email-assets.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function fixAllEmailAssets() {
  const orgId = 'hJ4gTE9Gm35epoub0zIU';

  // Finde den korrekten Ordner
  const folderSnap = await adminDb.collection('media_folders')
    .where('organizationId', '==', orgId)
    .where('name', '==', 'Email-Anhänge')
    .limit(1)
    .get();

  if (folderSnap.empty) {
    console.log('❌ Kein Email-Anhänge Ordner gefunden');
    return;
  }

  const correctFolderId = folderSnap.docs[0].id;
  console.log(`✅ Korrekter Ordner: ${correctFolderId}\n`);

  // Finde ALLE Email-Attachment Assets
  const assetsSnap = await adminDb.collection('media_assets')
    .where('organizationId', '==', orgId)
    .where('metadata.isEmailAttachment', '==', true)
    .get();

  console.log(`📦 Gefundene Assets: ${assetsSnap.size}\n`);

  // Update alle Assets
  const batch = adminDb.batch();
  let updated = 0;

  assetsSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`📎 ${data.fileName}`);
    console.log(`   Aktuell: folderId=${data.folderId}`);

    if (data.folderId !== correctFolderId) {
      batch.update(doc.ref, { folderId: correctFolderId });
      console.log(`   ✅ Wird verschoben zu: ${correctFolderId}`);
      updated++;
    } else {
      console.log(`   ✓ Bereits korrekt`);
    }
    console.log('');
  });

  if (updated > 0) {
    await batch.commit();
    console.log(`✅ ${updated} Asset(s) verschoben`);
  } else {
    console.log('✅ Alle Assets bereits korrekt');
  }
}

fixAllEmailAssets().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

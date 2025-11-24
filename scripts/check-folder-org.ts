import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const folderId = 'eGCEgZmWi4ws8XLfYxg3';

  const folderSnap = await adminDb.collection('media_folders').doc(folderId).get();

  if (folderSnap.exists) {
    const data = folderSnap.data();
    console.log('📁 Email-Anhänge Ordner:');
    console.log('   organizationId:', data?.organizationId);
    console.log('   createdBy:', data?.createdBy);
    console.log('   name:', data?.name);
  } else {
    console.log('❌ Ordner nicht gefunden!');
  }

  console.log('\n📦 Asset organizationId:');
  const assetSnap = await adminDb.collection('media_assets').doc('1SeEDNAmk7OxuGEYlayV').get();
  if (assetSnap.exists) {
    const data = assetSnap.data();
    console.log('   organizationId:', data?.organizationId);
  }

  process.exit(0);
})();

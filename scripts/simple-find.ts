import { adminDb } from '../src/lib/firebase/admin-init';
(async () => {
  const snap = await adminDb.collection('media_assets').doc('1SeEDNAmk7OxuGEYlayV').get();
  if (snap.exists) {
    const d = snap.data();
    console.log('Asset gefunden:');
    console.log('fileName:', d?.fileName);
    console.log('organizationId:', d?.organizationId);
    console.log('createdBy:', d?.createdBy);
    console.log('folderId:', d?.folderId);
    console.log('metadata:', d?.metadata);
  } else {
    console.log('Asset nicht gefunden!');
  }
  process.exit(0);
})();

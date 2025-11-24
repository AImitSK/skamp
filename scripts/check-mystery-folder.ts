import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const folderId = 'Z6nnAu9KmtB5xTJX8jil';

  const snap = await adminDb.collection('media_folders').doc(folderId).get();

  if (snap.exists) {
    const data = snap.data();
    console.log('📁 Folder gefunden:');
    console.log('   ID:', snap.id);
    console.log('   name:', data?.name);
    console.log('   organizationId:', data?.organizationId);
    console.log('   createdBy:', data?.createdBy);
    console.log('   createdAt:', data?.createdAt?.toDate?.());
  } else {
    console.log('❌ Folder existiert nicht in Datenbank!');
    console.log('   Aber Asset hat diesen folderId - das ist ein Problem!');
  }

  process.exit(0);
})();

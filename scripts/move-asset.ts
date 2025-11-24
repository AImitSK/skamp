import { adminDb } from '../src/lib/firebase/admin-init';
(async () => {
  const correctFolderId = 'eGCEgZmWi4ws8XLfYxg3';
  const wrongFolderId = 'Ugad6YWoXa4cgBKrPG3e';
  
  // Verschiebe das Asset
  await adminDb.collection('media_assets').doc('1SeEDNAmk7OxuGEYlayV')
    .update({ folderId: correctFolderId });
  console.log('✅ Asset verschoben');
  
  // Lösche den falschen Ordner
  await adminDb.collection('media_folders').doc(wrongFolderId).delete();
  console.log('✅ Falschen Ordner gelöscht');
  
  process.exit(0);
})();

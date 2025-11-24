import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const orgId = 'hJ4gTE9Gm35epoub0zIU';

  const snap = await adminDb.collection('media_folders')
    .where('organizationId', '==', orgId)
    .where('name', '==', 'Email-Anhänge')
    .get();

  console.log(`\n📁 Found ${snap.size} "Email-Anhänge" folders:\n`);

  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`📂 ${doc.id}`);
    console.log(`   createdAt: ${data.createdAt?.toDate?.()}`);
    console.log('');
  });

  // Liste auch alle Assets mit isEmailAttachment
  const assetsSnap = await adminDb.collection('media_assets')
    .where('organizationId', '==', orgId)
    .where('metadata.isEmailAttachment', '==', true)
    .get();

  console.log(`\n📦 Found ${assetsSnap.size} email attachment assets:\n`);

  assetsSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`📎 ${data.fileName}`);
    console.log(`   Asset ID: ${doc.id}`);
    console.log(`   folderId: ${data.folderId}`);
    console.log('');
  });

  process.exit(0);
})();

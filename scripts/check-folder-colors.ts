import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const orgId = 'hJ4gTE9Gm35epoub0zIU';

  const snap = await adminDb.collection('media_folders')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`\n📁 Found ${snap.size} folders:\n`);

  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`📂 ${data.name}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   color: ${data.color || 'none'}`);
    console.log('');
  });

  process.exit(0);
})();

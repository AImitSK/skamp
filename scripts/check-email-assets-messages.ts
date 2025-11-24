import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const orgId = 'hJ4gTE9Gm35epoub0zIU';
  
  const snap = await adminDb.collection('media_assets')
    .where('organizationId', '==', orgId)
    .where('metadata.isEmailAttachment', '==', true)
    .get();
  
  console.log('\nFound', snap.size, 'email attachment assets:\n');
  
  snap.docs.forEach(doc => {
    const d = doc.data();
    const msgId = d.metadata?.emailMessageId || 'unknown';
    console.log('Asset:', d.fileName);
    console.log('   Message ID:', msgId);
  });
  
  process.exit(0);
})();

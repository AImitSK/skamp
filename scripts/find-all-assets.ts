// scripts/find-all-assets.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function findAllAssets() {
  const orgId = 'hJ4gTE9Gm35epoub0zIU';

  // Finde ALLE Assets (ohne Filter)
  const snap = await adminDb.collection('media_assets')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  console.log(`📦 Letzte ${snap.size} Assets:\n`);

  snap.docs.forEach(doc => {
    const d = doc.data();
    console.log(`📎 ${d.fileName || 'unknown'}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   folderId: ${d.folderId || 'none'}`);
    console.log(`   createdBy: ${d.createdBy || 'unknown'}`);
    console.log(`   metadata:`, d.metadata ? JSON.stringify(d.metadata) : 'none');
    console.log('');
  });
}

findAllAssets().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

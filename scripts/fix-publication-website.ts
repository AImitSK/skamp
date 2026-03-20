// Kopiert website -> websiteUrl für alle Publications

require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

async function fix() {
  const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

  const snapshot = await adminDb.collection('publications')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  console.log('Fixe', snapshot.size, 'Publications...\n');

  let fixed = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.website && !data.websiteUrl) {
      await doc.ref.update({ websiteUrl: data.website });
      console.log('✓', data.title, '→', data.website);
      fixed++;
    }
  }

  console.log('\n═══════════════════════════════');
  console.log('Gefixt:', fixed, 'Publications');
}

fix().then(() => process.exit(0));

// Löscht alle GCRL Staging-Daten für Neustart
require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

async function deleteStaging() {
  console.log('=== LÖSCHE STAGING DATEN ===\n');

  const snapshot = await adminDb.collection('media_research_staging')
    .where('tagId', '==', TAG_ID)
    .get();

  console.log('Gefunden:', snapshot.size, 'Staging-Einträge');

  for (const doc of snapshot.docs) {
    await doc.ref.delete();
    console.log('  Gelöscht:', doc.data().name);
  }

  console.log('\n=== DONE ===');
}

deleteStaging().then(() => process.exit(0));

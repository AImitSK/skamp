// Prüft den Status der Staging-Daten
require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

async function check() {
  const snapshot = await adminDb.collection('media_research_staging')
    .where('tagId', '==', TAG_ID)
    .get();

  console.log('═'.repeat(60));
  console.log('STAGING STATUS');
  console.log('═'.repeat(60));
  console.log('Gesamt:', snapshot.size, 'Einträge\n');

  let readyCount = 0;
  let needsEnrichment = 0;
  let notMedia = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (!data.isMediaCompany) {
      notMedia++;
      continue;
    }

    if (data.readyForImport) {
      readyCount++;
      console.log(`✓ ${data.name} (Score: ${data.qualityScore?.total || 0})`);
    } else {
      needsEnrichment++;
      console.log(`○ ${data.name} (Score: ${data.qualityScore?.total || 0}) - ${data.nextEnrichmentAction || 'needs action'}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('ZUSAMMENFASSUNG:');
  console.log(`  Ready for Import: ${readyCount}`);
  console.log(`  Needs Enrichment: ${needsEnrichment}`);
  console.log(`  Not Media: ${notMedia}`);
  console.log('═'.repeat(60));
}

check().then(() => process.exit(0));

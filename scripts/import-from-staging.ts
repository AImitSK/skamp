// Importiert alle bereiten Staging-Einträge ins CRM

require('../src/genkit-loader.js');

import { batchImportFromStagingFlow } from '../src/lib/ai/flows/media-research/stagingFlow';

const SESSION_ID = '49465df5-2374-4f5c-a3e3-d1f1dfd234fe';

console.log('═'.repeat(60));
console.log('CRM Import aus Staging');
console.log('Session:', SESSION_ID);
console.log('═'.repeat(60));

batchImportFromStagingFlow({
  sessionId: SESSION_ID,
  minScore: 0, // Alle importieren
  updateExisting: false,
})
  .then((result) => {
    console.log('\n═'.repeat(60));
    console.log('IMPORT ABGESCHLOSSEN:');
    console.log(`  Importiert: ${result.imported}`);
    console.log(`  Übersprungen: ${result.skipped}`);
    console.log(`  Fehlgeschlagen: ${result.failed}`);
    console.log('═'.repeat(60));

    if (result.details) {
      console.log('\nDetails:');
      for (const d of result.details) {
        const icon = d.status === 'imported' ? '✓' : d.status === 'skipped' ? '⏭' : '✗';
        console.log(`  ${icon} ${d.publisherName}: ${d.status}${d.reason ? ` (${d.reason})` : ''}`);
      }
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error('FEHLER:', error);
    process.exit(1);
  });

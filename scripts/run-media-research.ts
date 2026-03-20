// Startet den mediaResearchFlow mit Staging-Modus

require('../src/genkit-loader.js');

import { mediaResearchFlow } from '../src/lib/ai/flows/media-research';

const input = {
  region: 'Rehburg-Loccum',
  center: { lat: 52.4638, lng: 9.2261 },
  radiusKm: 50,
  // Zusätzlich Hannover (25km Radius für die Großstadt)
  additionalCenters: [
    { name: 'Hannover', center: { lat: 52.3759, lng: 9.7320 }, radiusKm: 25 },
  ],
  organizationId: 'hJ4gTE9Gm35epoub0zIU',
  userId: 'FA1mBm2twKSBHEM3VPIJtJIulUz1',
  tagName: 'GCRL',
  useStaging: true,
  autoEnrich: true,
  importToCrm: false,
};

const startTimestamp = new Date().toISOString();
console.log('═'.repeat(60));
console.log('Media Research Flow - Staging Modus MIT HANNOVER');
console.log('Zeitstempel:', startTimestamp);
console.log('Für Lösch-Script verwenden: --after="' + startTimestamp + '"');
console.log('═'.repeat(60));

mediaResearchFlow(input)
  .then((result) => {
    console.log('\n═'.repeat(60));
    console.log('ERGEBNIS:');
    console.log(JSON.stringify(result, null, 2));
    console.log('═'.repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.error('FEHLER:', error);
    process.exit(1);
  });

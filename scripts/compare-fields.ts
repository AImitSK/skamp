// Vergleicht Import-Daten mit CRM-Erwartung

require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

async function compare() {
  // Eine Publication laden
  const snapshot = await adminDb.collection('publications')
    .where('title', '==', 'Hannoversche Allgemeine Zeitung')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log('Keine HAZ gefunden');
    return;
  }

  const data = snapshot.docs[0].data();

  console.log('═'.repeat(60));
  console.log('VERGLEICH: Import vs CRM-Erwartung');
  console.log('Publication:', data.title);
  console.log('═'.repeat(60));

  // TAB 1: Grunddaten
  console.log('\n📋 TAB 1: GRUNDDATEN');
  console.log('─'.repeat(40));
  const grunddaten = {
    'title': { import: data.title, erwartet: '✓' },
    'subtitle': { import: data.subtitle ?? '❌ FEHLT', erwartet: 'optional' },
    'publisherId': { import: data.publisherId, erwartet: '✓' },
    'publisherName': { import: data.publisherName, erwartet: '✓' },
    'websiteUrl': { import: data.websiteUrl ?? '❌ FEHLT', erwartet: '✓ (war website)' },
    'type': { import: data.type, erwartet: '✓' },
    'format': { import: data.format, erwartet: '✓' },
    'status': { import: data.status, erwartet: '✓' },
    'languages': { import: JSON.stringify(data.languages), erwartet: '✓' },
    'geographicTargets': { import: JSON.stringify(data.geographicTargets), erwartet: '✓' },
    'geographicScope': { import: data.geographicScope ?? '❌ FEHLT', erwartet: '✓' },
    'focusAreas': { import: JSON.stringify(data.focusAreas), erwartet: '✓' },
  };
  console.table(grunddaten);

  // TAB 2: Metriken
  console.log('\n📊 TAB 2: METRIKEN');
  console.log('─'.repeat(40));
  const metriken = {
    'metrics.frequency': { import: data.metrics?.frequency ?? '❌ FEHLT', erwartet: '✓' },
    'metrics.targetAudience': { import: data.metrics?.targetAudience ?? '❌ FEHLT', erwartet: 'optional' },
    'metrics.targetAgeGroup': { import: data.metrics?.targetAgeGroup ?? '❌ FEHLT', erwartet: 'optional' },
    'metrics.targetGender': { import: data.metrics?.targetGender ?? '❌ FEHLT', erwartet: 'optional' },
    'metrics.print.circulation': { import: data.metrics?.print?.circulation ?? '❌ FEHLT', erwartet: '✓ Auflage!' },
    'metrics.print.circulationType': { import: data.metrics?.print?.circulationType ?? '❌ FEHLT', erwartet: 'optional' },
    'metrics.print.pricePerIssue': { import: data.metrics?.print?.pricePerIssue ?? '❌ FEHLT', erwartet: 'optional' },
    'metrics.print.pageCount': { import: data.metrics?.print?.pageCount ?? '❌ FEHLT', erwartet: 'optional' },
    'metrics.online.monthlyPageViews': { import: data.metrics?.online?.monthlyPageViews ?? '❌ FEHLT', erwartet: 'optional' },
    'metrics.online.monthlyUniqueVisitors': { import: data.metrics?.online?.monthlyUniqueVisitors ?? '❌ FEHLT', erwartet: 'optional' },
  };
  console.table(metriken);

  // TAB 3: Identifikatoren & Links
  console.log('\n🔗 TAB 3: IDENTIFIKATOREN & LINKS');
  console.log('─'.repeat(40));
  const identifiers = {
    'identifiers': { import: JSON.stringify(data.identifiers) ?? '❌ FEHLT', erwartet: 'ISSN, etc.' },
    'socialMedia': { import: JSON.stringify(data.socialMedia) ?? '❌ FEHLT', erwartet: 'optional' },
    'socialMediaUrls': { import: JSON.stringify(data.socialMediaUrls) ?? '❌ FEHLT', erwartet: 'CRM erwartet dies!' },
  };
  console.table(identifiers);

  // Rohdaten
  console.log('\n📦 ALLE FELDER IM DOKUMENT:');
  console.log('─'.repeat(40));
  console.log(Object.keys(data).sort().join('\n'));
}

compare().then(() => process.exit(0));

// scripts/delete-import-by-timestamp.ts
// Löscht Import-Daten die NACH einem bestimmten Zeitstempel erstellt wurden
// SCHÜTZT: Golfclub Rehburg-Loccum, Gregor von Hinten, alle älteren Daten

require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

const ORG_ID = 'hJ4gTE9Gm35epoub0zIU';
const TAG_ID = 'ymY4Gh9R7F150Js9R2xt'; // GCRL Tag

// NIEMALS löschen - diese IDs sind geschützt
const PROTECTED_COMPANY_IDS = ['yn5xh5baHPEVT8nn6JCL']; // Golfclub Rehburg-Loccum
const PROTECTED_COMPANY_NAMES = ['Golfclub Rehburg-Loccum'];
const PROTECTED_CONTACT_NAMES = ['Gregor von Hinten'];

async function deleteByTimestamp(afterTimestamp: string) {
  const afterDate = new Date(afterTimestamp);

  console.log('═'.repeat(60));
  console.log('SICHERES LÖSCHEN - Nur Daten nach:', afterTimestamp);
  console.log('Organization:', ORG_ID);
  console.log('Tag:', TAG_ID);
  console.log('═'.repeat(60));

  // 1. Companies finden und löschen
  console.log('\n📦 Suche Companies...');
  const companiesSnapshot = await adminDb.collection('companies_enhanced')
    .where('organizationId', '==', ORG_ID)
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  let companiesDeleted = 0;
  let companiesProtected = 0;
  const deletedCompanyIds: string[] = [];

  for (const doc of companiesSnapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?._seconds * 1000);

    // Geschützt?
    if (PROTECTED_COMPANY_IDS.includes(doc.id) || PROTECTED_COMPANY_NAMES.includes(data.name)) {
      console.log(`  ✓ GESCHÜTZT: ${data.name}`);
      companiesProtected++;
      continue;
    }

    // Zu alt?
    if (createdAt <= afterDate) {
      console.log(`  ⏭ ZU ALT: ${data.name} (${createdAt.toISOString()})`);
      continue;
    }

    // Löschen
    console.log(`  ✗ LÖSCHE: ${data.name} (${createdAt.toISOString()})`);
    deletedCompanyIds.push(doc.id);
    await doc.ref.delete();
    companiesDeleted++;
  }

  // 2. Contacts finden und löschen
  console.log('\n👤 Suche Contacts...');
  const contactsSnapshot = await adminDb.collection('contacts_enhanced')
    .where('organizationId', '==', ORG_ID)
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  let contactsDeleted = 0;
  let contactsProtected = 0;

  for (const doc of contactsSnapshot.docs) {
    const data = doc.data();
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?._seconds * 1000);

    // Geschützt?
    if (PROTECTED_CONTACT_NAMES.some(name => fullName.includes(name))) {
      console.log(`  ✓ GESCHÜTZT: ${fullName}`);
      contactsProtected++;
      continue;
    }

    // Zu alt?
    if (createdAt <= afterDate) {
      console.log(`  ⏭ ZU ALT: ${fullName} (${createdAt.toISOString()})`);
      continue;
    }

    // Löschen
    console.log(`  ✗ LÖSCHE: ${fullName} (${createdAt.toISOString()})`);
    await doc.ref.delete();
    contactsDeleted++;
  }

  // Zusammenfassung
  console.log('\n' + '═'.repeat(60));
  console.log('ERGEBNIS:');
  console.log(`  Companies gelöscht: ${companiesDeleted}`);
  console.log(`  Companies geschützt: ${companiesProtected}`);
  console.log(`  Contacts gelöscht: ${contactsDeleted}`);
  console.log(`  Contacts geschützt: ${contactsProtected}`);
  console.log('═'.repeat(60));
}

// Parameter parsen
const args = process.argv.slice(2);
const afterArg = args.find(a => a.startsWith('--after='));

if (!afterArg) {
  console.log('Verwendung: npx tsx scripts/delete-import-by-timestamp.ts --after="2026-03-19T15:00:00Z"');
  console.log('\nDas Script löscht nur Daten die NACH dem angegebenen Zeitstempel erstellt wurden.');
  console.log('Golfclub Rehburg-Loccum und Gregor von Hinten werden NIEMALS gelöscht.');
  process.exit(1);
}

const timestamp = afterArg.replace('--after=', '').replace(/"/g, '');
deleteByTimestamp(timestamp)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fehler:', error);
    process.exit(1);
  });

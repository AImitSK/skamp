// Script um die GCRL-Daten zu löschen (außer manuell angelegte)
require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

// Manuell angelegte Einträge, die NICHT gelöscht werden sollen
const EXCLUDE_COMPANIES = ['Golfclub Rehburg-Loccum'];
const EXCLUDE_CONTACTS = ['Gregor von Hinten'];

async function deleteGCRLData() {
  console.log('=== LÖSCHE GCRL DATEN ===\n');
  console.log('Ausgenommen: Companies:', EXCLUDE_COMPANIES.join(', '));
  console.log('Ausgenommen: Contacts:', EXCLUDE_CONTACTS.join(', '));
  console.log('');

  // Companies löschen (außer ausgenommene)
  const companiesSnap = await adminDb
    .collection('companies_enhanced')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  const companiesToDelete = companiesSnap.docs.filter(doc =>
    !EXCLUDE_COMPANIES.includes(doc.data().name)
  );

  console.log('Lösche', companiesToDelete.length, 'von', companiesSnap.size, 'Companies...');
  for (const doc of companiesToDelete) {
    await doc.ref.delete();
    console.log('  Gelöscht:', doc.data().name);
  }

  // Publications löschen
  const publicationsSnap = await adminDb
    .collection('publications')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  console.log('\nLösche', publicationsSnap.size, 'Publications...');
  for (const doc of publicationsSnap.docs) {
    await doc.ref.delete();
    console.log('  Gelöscht:', doc.data().title);
  }

  // Contacts löschen (außer ausgenommene)
  const contactsSnap = await adminDb
    .collection('contacts_enhanced')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  const contactsToDelete = contactsSnap.docs.filter(doc =>
    !EXCLUDE_CONTACTS.includes(doc.data().displayName)
  );

  console.log('\nLösche', contactsToDelete.length, 'von', contactsSnap.size, 'Contacts...');
  for (const doc of contactsToDelete) {
    await doc.ref.delete();
    console.log('  Gelöscht:', doc.data().displayName);
  }

  // Tag NICHT löschen - wird wiederverwendet
  console.log('\nTag wird beibehalten:', TAG_ID);

  console.log('\n=== DONE ===');
}

deleteGCRLData().catch(console.error);

// Script um die GCRL-Daten zu löschen
import { adminDb } from '../src/lib/firebase/admin-init';

const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

async function deleteGCRLData() {
  console.log('=== LÖSCHE GCRL DATEN ===\n');

  // Companies löschen
  const companiesSnap = await adminDb
    .collection('companies_enhanced')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  console.log('Lösche', companiesSnap.size, 'Companies...');
  for (const doc of companiesSnap.docs) {
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

  // Contacts löschen
  const contactsSnap = await adminDb
    .collection('contacts_enhanced')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  console.log('\nLösche', contactsSnap.size, 'Contacts...');
  for (const doc of contactsSnap.docs) {
    await doc.ref.delete();
    console.log('  Gelöscht:', doc.data().displayName);
  }

  // Tag NICHT löschen - wird wiederverwendet
  console.log('\nTag wird beibehalten:', TAG_ID);

  console.log('\n=== DONE ===');
}

deleteGCRLData().catch(console.error);

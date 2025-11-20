// scripts/delete-email-addresses.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function deleteAllEmailAddresses() {
  console.log('🗑️  Lösche ALLE E-Mail-Adressen aus email_addresses...\n');

  const snapshot = await adminDb.collection('email_addresses').get();

  console.log(`Gefunden: ${snapshot.size} E-Mail-Adressen\n`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`Lösche: ${data.email}`);
    await doc.ref.delete();
  }

  console.log('\n✅ Alle E-Mail-Adressen gelöscht!');
  console.log('🔄 Lade die Seite neu');
}

deleteAllEmailAddresses()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

// scripts/delete-invalid-contacts.ts
// Löscht die 2 fehlerhaften Markus Riechmann Kontakte

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function deleteInvalidContacts() {
  const invalidIds = [
    'CscrWVT5iKU62KjUw9V3',  // Markus Riechmann ohne Firma/Email
    'mGI6TP8okWrCl9tRWVTz'   // Markus Riechmann ohne Email
  ];

  console.log('\n🗑️  Lösche fehlerhafte Kontakte...\n');

  for (const id of invalidIds) {
    const doc = await db.collection('contacts_enhanced').doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`  Lösche: ${data?.displayName} (${id})`);
      await db.collection('contacts_enhanced').doc(id).delete();
      console.log(`  ✅ Gelöscht\n`);
    }
  }

  console.log('✅ Fertig\n');
}

deleteInvalidContacts().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

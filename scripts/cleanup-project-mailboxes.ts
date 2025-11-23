// scripts/cleanup-project-mailboxes.ts
// Löscht alle bestehenden Projekt-Postfächer (werden bei Campaign-Versand neu erstellt)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function cleanupProjectMailboxes() {
  console.log('\n🗑️  Cleanup: Lösche bestehende Projekt-Postfächer\n');
  console.log('⚠️  Diese werden beim nächsten Campaign-Versand neu erstellt!\n');

  const mailboxesSnapshot = await db.collection('inbox_project_mailboxes').get();
  console.log(`📊 Gefunden: ${mailboxesSnapshot.size} Projekt-Postfächer\n`);

  if (mailboxesSnapshot.size === 0) {
    console.log('✅ Keine Postfächer zum Löschen\n');
    return;
  }

  let deleted = 0;

  for (const doc of mailboxesSnapshot.docs) {
    const mb = doc.data();
    console.log(`🗑️  Lösche: ${mb.inboxAddress} (Projekt: ${mb.projectId})`);
    await doc.ref.delete();
    deleted++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ ${deleted} Postfächer gelöscht\n`);
  console.log('💡 Beim nächsten Campaign-Versand werden sie mit korrektem Format neu erstellt\n');
}

cleanupProjectMailboxes().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

// scripts/delete-test-emails.ts
// Löscht alle Test-Emails aus der Datenbank

import { adminDb } from '../src/lib/firebase/admin-init';

async function deleteTestEmails() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('🗑️  Lösche Test-Emails aus der Datenbank\n');
  console.log('='.repeat(80));

  // Alle Emails der Organisation laden
  const snapshot = await adminDb
    .collection('email_messages')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`\n📧 Gefunden: ${snapshot.size} Emails\n`);

  if (snapshot.empty) {
    console.log('✅ Keine Emails vorhanden\n');
    return;
  }

  // Alle löschen
  let deleted = 0;
  const batch = adminDb.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    deleted++;
    console.log(`   ${deleted}. Lösche: ${doc.data().subject} (${doc.id})`);
  });

  await batch.commit();

  console.log(`\n✅ ${deleted} Emails gelöscht\n`);
  console.log('='.repeat(80));
}

deleteTestEmails()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fehler:', err);
    process.exit(1);
  });

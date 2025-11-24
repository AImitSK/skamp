// scripts/delete-all-emails.ts
// Löscht ALLE E-Mails und Threads für frischen Test-Start

import { adminDb } from '../src/lib/firebase/admin-init';

async function deleteAllEmails() {
  const orgId = process.argv[2] || 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  if (!process.argv[2]) {
    console.log('⚠️  Keine Organization ID angegeben, verwende Standard-ID\n');
  }

  console.log('🗑️  ACHTUNG: Lösche ALLE E-Mails und Threads!\n');
  console.log(`   Organization: ${orgId}\n`);

  // 1. Lösche email_messages
  console.log('📧 Lösche email_messages...');
  const messagesSnap = await adminDb
    .collection('email_messages')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`   Gefunden: ${messagesSnap.size} Nachrichten`);

  const messageBatch = adminDb.batch();
  messagesSnap.docs.forEach(doc => {
    messageBatch.delete(doc.ref);
  });
  await messageBatch.commit();
  console.log('   ✅ Gelöscht\n');

  // 2. Lösche email_threads
  console.log('🧵 Lösche email_threads...');
  const threadsSnap = await adminDb
    .collection('email_threads')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`   Gefunden: ${threadsSnap.size} Threads`);

  const threadBatch = adminDb.batch();
  threadsSnap.docs.forEach(doc => {
    threadBatch.delete(doc.ref);
  });
  await threadBatch.commit();
  console.log('   ✅ Gelöscht\n');

  console.log('='.repeat(60));
  console.log('✅ Alle E-Mails gelöscht!');
  console.log('📬 Postfächer sind jetzt leer und bereit für Tests.');
  console.log('='.repeat(60));
}

deleteAllEmails()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

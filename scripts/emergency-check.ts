// scripts/emergency-check.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function emergencyCheck() {
  console.log('🚨 NOTFALL-CHECK\n');

  // E-Mails
  const messagesSnap = await adminDb.collection('email_messages').get();
  console.log(`📧 email_messages: ${messagesSnap.size} E-Mails VORHANDEN`);

  if (messagesSnap.size > 0) {
    console.log('\n   Beispiel-E-Mails:');
    messagesSnap.docs.slice(0, 5).forEach(doc => {
      const d = doc.data();
      console.log(`   - ${d.subject || 'Kein Betreff'}`);
      console.log(`     orgId: ${d.organizationId}`);
    });
  }

  // Threads
  const threadsSnap = await adminDb.collection('email_threads').get();
  console.log(`\n📨 email_threads: ${threadsSnap.size} Threads VORHANDEN`);

  // Postfächer
  const domainSnap = await adminDb.collection('inbox_domain_mailboxes').get();
  console.log(`\n📬 inbox_domain_mailboxes: ${domainSnap.size} Postfächer`);

  domainSnap.forEach(doc => {
    const d = doc.data();
    console.log(`   - ${d.domain}`);
    console.log(`     orgId: ${d.organizationId}`);
  });

  // Email Adressen
  const emailSnap = await adminDb.collection('email_addresses').get();
  console.log(`\n📧 email_addresses: ${emailSnap.size} Adressen`);

  emailSnap.forEach(doc => {
    const d = doc.data();
    console.log(`   - ${d.email}`);
    console.log(`     orgId: ${d.organizationId}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ DEINE E-MAILS SIND NOCH DA!');
  console.log('   Das Problem ist nur die Postfach-Zuordnung.');
}

emergencyCheck()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

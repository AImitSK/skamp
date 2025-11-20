// scripts/check-current-state.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function checkCurrentState() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('📊 Aktueller Status für Organization:', orgId);
  console.log('='.repeat(60), '\n');

  // 1. Domain Mailboxes
  const domainSnap = await adminDb
    .collection('inbox_domain_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`📬 Domain-Postfächer: ${domainSnap.size}`);
  domainSnap.forEach(doc => {
    const d = doc.data();
    console.log(`   - ${d.domain} (${d.inboxAddress})`);
  });

  // 2. Project Mailboxes
  const projectSnap = await adminDb
    .collection('inbox_project_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`\n📁 Projekt-Postfächer: ${projectSnap.size}`);
  if (projectSnap.size > 0) {
    projectSnap.forEach(doc => {
      const d = doc.data();
      console.log(`   - ${d.projectName} (${d.inboxAddress})`);
    });
  } else {
    console.log('   (keine)');
  }

  // 3. Email Addresses
  const emailAddrSnap = await adminDb
    .collection('email_addresses')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`\n📧 E-Mail-Adressen: ${emailAddrSnap.size}`);
  emailAddrSnap.forEach(doc => {
    const d = doc.data();
    console.log(`   - ${d.email}`);
  });

  // 4. Email Messages
  const messagesSnap = await adminDb
    .collection('email_messages')
    .where('organizationId', '==', orgId)
    .limit(5)
    .get();

  console.log(`\n📨 E-Mail-Nachrichten: ${messagesSnap.size} (von allen)`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Das ist dein aktueller Stand!');
}

checkCurrentState()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const domainEmail = 'celeropress.com@inbox.sk-online-marketing.de';
  const orgId = 'hJ4gTE9Gm35epoub0zIU';

  console.log(`🔍 Searching for domain mailbox: ${domainEmail}\n`);

  // 1. Suche in inbox_domain_mailboxes
  const domainSnap = await adminDb.collection('inbox_domain_mailboxes')
    .where('inboxAddress', '==', domainEmail.toLowerCase())
    .get();

  console.log(`📬 Domain Mailboxes: ${domainSnap.size}`);
  if (!domainSnap.empty) {
    domainSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   ID: ${doc.id}`);
      console.log(`   organizationId: ${data.organizationId}`);
      console.log(`   domainId: ${data.domainId}`);
      console.log(`   status: ${data.status}`);
      console.log(`   inboxAddress: ${data.inboxAddress}`);
      console.log('');
    });
  } else {
    console.log('   ❌ No domain mailbox found!');
    console.log('');
  }

  // 2. Liste alle Domain-Mailboxes für diese Org
  console.log(`📋 All domain mailboxes for org ${orgId}:\n`);
  const allDomainSnap = await adminDb.collection('inbox_domain_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`   Found: ${allDomainSnap.size} domain mailbox(es)`);
  allDomainSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`   - ${data.inboxAddress} (${data.status})`);
  });

  process.exit(0);
})();

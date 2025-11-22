// scripts/debug-mailbox-query.ts
// Debuggt die Mailbox-Query wie sie TeamFolderSidebar macht

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function debugMailboxQuery(orgId: string) {
  console.log(`\n🔍 Debug: Mailbox Query für Organization: ${orgId}\n`);

  // Exact same query as TeamFolderSidebar
  const mailboxes = await db.collection('inbox_domain_mailboxes')
    .where('organizationId', '==', orgId)
    .where('status', '==', 'active')
    .get();

  console.log(`Gefundene Mailboxes: ${mailboxes.size}\n`);

  if (mailboxes.empty) {
    console.log('❌ KEINE Mailboxes gefunden!\n');

    // Check what exists for this org
    const allMailboxes = await db.collection('inbox_domain_mailboxes')
      .where('organizationId', '==', orgId)
      .get();

    console.log(`Mailboxes (ohne status filter): ${allMailboxes.size}\n`);

    allMailboxes.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.domain}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Inbox: ${data.inboxAddress}`);
      console.log('');
    });

    return;
  }

  mailboxes.forEach((doc, index) => {
    const data = doc.data();
    console.log(`${index + 1}. ${data.domain}`);
    console.log(`   Mailbox ID: ${doc.id}`);
    console.log(`   Domain ID: ${data.domainId}`);
    console.log(`   Inbox Address: ${data.inboxAddress}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Organization ID: ${data.organizationId}`);
    console.log('');
  });

  // Check corresponding domains
  console.log('\n📧 Zugehörige Domains in email_domains_enhanced:\n');

  const domains = await db.collection('email_domains_enhanced')
    .where('organizationId', '==', orgId)
    .get();

  domains.forEach(doc => {
    const data = doc.data();
    const hasMailbox = mailboxes.docs.some(mb => mb.data().domainId === doc.id);
    console.log(`${hasMailbox ? '✅' : '❌'} ${data.domain} (${data.status})`);
  });
}

const orgId = process.argv[2];

if (!orgId) {
  console.log('Usage: npx tsx scripts/debug-mailbox-query.ts <organizationId>');
  console.log('\nVerfügbare Organization IDs:');
  console.log('- hJ4gTE9Gm35epoub0zIU (hat celeropress.com)');
  console.log('- kqUJumpKKVPQIY87GP1cgO0VaKC3 (hat sk-online-marketing.de)');
  console.log('- RvDjQVssLjSUeIuhIolH (hat celeropress.com)');
  process.exit(1);
}

debugMailboxQuery(orgId).then(() => process.exit(0));

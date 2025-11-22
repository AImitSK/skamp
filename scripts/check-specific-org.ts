import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkOrgDomains(orgId: string) {
  console.log(`\n🔍 Checking domains for Organization: ${orgId}\n`);

  const domains = await db.collection('email_domains_enhanced')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`Found ${domains.size} domain(s):\n`);

  for (const doc of domains.docs) {
    const data = doc.data();
    console.log(`📧 ${data.domain}`);
    console.log(`   Domain ID: ${doc.id}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Created: ${data.createdAt?.toDate?.() || 'N/A'}`);

    // Check for matching mailbox
    const mailbox = await db.collection('inbox_domain_mailboxes')
      .where('domainId', '==', doc.id)
      .get();

    if (mailbox.empty) {
      console.log(`   ❌ NO MAILBOX FOUND for domain ID: ${doc.id}`);
    } else {
      const mb = mailbox.docs[0].data();
      console.log(`   ✅ Mailbox: ${mb.inboxAddress}`);
    }
    console.log('');
  }
}

const orgId = process.argv[2] || 'hJ4gTE9Gm35epoub0zIU';
checkOrgDomains(orgId).then(() => process.exit(0));

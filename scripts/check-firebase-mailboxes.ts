// scripts/check-firebase-mailboxes.ts
// Direkte Firestore-Abfrage ohne Filter

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
  console.error('❌ FIREBASE_ADMIN_SERVICE_ACCOUNT not found in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkAllMailboxes() {
  console.log('\n🔍 Checking ALL mailboxes in Firebase...\n');

  try {
    // 1. Check inbox_domain_mailboxes
    console.log('📬 inbox_domain_mailboxes:');
    console.log('='.repeat(80));

    const domainMailboxes = await db.collection('inbox_domain_mailboxes').get();

    console.log(`Found ${domainMailboxes.size} domain mailbox(es)\n`);

    domainMailboxes.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.domain || 'NO DOMAIN'}`);
      console.log(`   Doc ID: ${doc.id}`);
      console.log(`   Inbox Address: ${data.inboxAddress || 'MISSING'}`);
      console.log(`   Status: ${data.status || 'MISSING'}`);
      console.log(`   Organization ID: ${data.organizationId || 'MISSING'}`);
      console.log(`   Domain ID: ${data.domainId || 'MISSING'}`);
      console.log(`   Created At: ${data.createdAt?.toDate?.() || 'MISSING'}`);
      console.log('');
    });

    // 2. Check email_domains_enhanced
    console.log('\n📧 email_domains_enhanced:');
    console.log('='.repeat(80));

    const emailDomains = await db.collection('email_domains_enhanced').get();

    console.log(`Found ${emailDomains.size} email domain(s)\n`);

    emailDomains.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.domain || 'NO DOMAIN'}`);
      console.log(`   Doc ID: ${doc.id}`);
      console.log(`   Status: ${data.status || 'MISSING'}`);
      console.log(`   Organization ID: ${data.organizationId || 'MISSING'}`);
      console.log(`   Created At: ${data.createdAt?.toDate?.() || 'MISSING'}`);
      console.log('');
    });

    // 3. Check for celeropresse specifically
    console.log('\n🔎 Searching for "celeropresse"...');
    console.log('='.repeat(80));

    const celeroDomainMailbox = domainMailboxes.docs.find(doc =>
      doc.data().domain?.includes('celeropresse') ||
      doc.data().inboxAddress?.includes('celeropresse')
    );

    const celeroDomain = emailDomains.docs.find(doc =>
      doc.data().domain?.includes('celeropresse')
    );

    if (celeroDomain) {
      console.log('✅ Found in email_domains_enhanced:');
      const data = celeroDomain.data();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ NOT found in email_domains_enhanced');
    }

    console.log('');

    if (celeroDomainMailbox) {
      console.log('✅ Found in inbox_domain_mailboxes:');
      const data = celeroDomainMailbox.data();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ NOT found in inbox_domain_mailboxes');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllMailboxes()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

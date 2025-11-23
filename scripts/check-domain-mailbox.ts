// scripts/check-domain-mailbox.ts
// Prüft ob Domain-Mailboxes korrekt erstellt wurden

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDomainMailboxes(organizationId: string, domain?: string) {
  console.log('\n🔍 Checking Domain Mailboxes...');
  console.log('Organization ID:', organizationId);
  if (domain) console.log('Domain filter:', domain);
  console.log('---');

  try {
    // Alle Domain-Mailboxes für die Organisation
    const mailboxesQuery = query(
      collection(db, 'inbox_domain_mailboxes'),
      where('organizationId', '==', organizationId)
    );

    const snapshot = await getDocs(mailboxesQuery);

    console.log(`\n📬 Found ${snapshot.docs.length} domain mailbox(es):\n`);

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.domain || 'NO DOMAIN'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Inbox Address: ${data.inboxAddress || 'MISSING'}`);
      console.log(`   Status: ${data.status || 'MISSING'}`);
      console.log(`   Organization ID: ${data.organizationId || 'MISSING'}`);
      console.log(`   Domain ID: ${data.domainId || 'MISSING'}`);
      console.log(`   Is Default: ${data.isDefault ?? 'MISSING'}`);
      console.log(`   Unread Count: ${data.unreadCount ?? 'MISSING'}`);
      console.log(`   Thread Count: ${data.threadCount ?? 'MISSING'}`);
      console.log(`   Created At: ${data.createdAt?.toDate?.() || 'MISSING'}`);
      console.log(`   Created By: ${data.createdBy || 'MISSING'}`);
      console.log('');
    });

    // Prüfe spezifische Domain wenn angegeben
    if (domain) {
      const domainMailbox = snapshot.docs.find(doc =>
        doc.data().domain === domain ||
        doc.data().inboxAddress?.includes(domain)
      );

      if (!domainMailbox) {
        console.log(`\n❌ Domain "${domain}" NOT FOUND in mailboxes!`);

        // Prüfe ob Domain in email_domains existiert
        console.log(`\n🔍 Checking email_domains collection...`);
        const domainsQuery = query(
          collection(db, 'email_domains'),
          where('organizationId', '==', organizationId),
          where('domain', '==', domain)
        );

        const domainsSnapshot = await getDocs(domainsQuery);

        if (domainsSnapshot.empty) {
          console.log(`❌ Domain "${domain}" also NOT in email_domains collection!`);
        } else {
          const domainDoc = domainsSnapshot.docs[0];
          const domainData = domainDoc.data();
          console.log(`✅ Domain found in email_domains:`);
          console.log(`   ID: ${domainDoc.id}`);
          console.log(`   Domain: ${domainData.domain}`);
          console.log(`   Status: ${domainData.status}`);
          console.log(`   Organization ID: ${domainData.organizationId}`);
          console.log(`\n⚠️ Domain exists but NO mailbox was created!`);
        }
      } else {
        console.log(`\n✅ Domain "${domain}" found in mailboxes!`);
      }
    }

    // Prüfe auf häufige Probleme
    console.log('\n🔧 Checking for common issues...\n');

    let issues = 0;
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const problems = [];

      if (!data.status) problems.push('Missing status');
      if (data.status !== 'active') problems.push(`Status is "${data.status}" not "active"`);
      if (!data.organizationId) problems.push('Missing organizationId');
      if (!data.inboxAddress) problems.push('Missing inboxAddress');
      if (!data.domain) problems.push('Missing domain');

      if (problems.length > 0) {
        issues++;
        console.log(`⚠️ Mailbox ${index + 1} (${data.domain || doc.id}) has issues:`);
        problems.forEach(p => console.log(`   - ${p}`));
        console.log('');
      }
    });

    if (issues === 0) {
      console.log('✅ No issues found!\n');
    } else {
      console.log(`❌ Found ${issues} mailbox(es) with issues!\n`);
    }

  } catch (error) {
    console.error('❌ Error checking domain mailboxes:', error);
  }
}

// Hauptfunktion
const organizationId = process.argv[2];
const domain = process.argv[3];

if (!organizationId) {
  console.log('Usage: npx tsx scripts/check-domain-mailbox.ts <organizationId> [domain]');
  console.log('Example: npx tsx scripts/check-domain-mailbox.ts abc123 celeropresse.com');
  process.exit(1);
}

checkDomainMailboxes(organizationId, domain)
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

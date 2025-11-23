// scripts/check-domain-usage.ts
// Prüft ob eine Domain in anderen Organisationen verwendet wird

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkDomainUsage(domainName: string) {
  console.log(`\n🔍 Prüfe Nutzung von Domain: ${domainName}\n`);

  // Suche in email_domains_enhanced
  const domainsSnapshot = await db.collection('email_domains_enhanced')
    .where('domain', '==', domainName)
    .get();

  console.log(`Gefunden: ${domainsSnapshot.size} Einträge für "${domainName}"\n`);

  if (domainsSnapshot.size === 0) {
    console.log('✅ Domain wird NICHT verwendet - sicher zu löschen\n');
    return;
  }

  const orgIds = new Set<string>();
  const domainDetails: any[] = [];

  domainsSnapshot.forEach(doc => {
    const data = doc.data();
    orgIds.add(data.organizationId);
    domainDetails.push({
      id: doc.id,
      orgId: data.organizationId,
      status: data.status,
      isDefault: data.isDefault,
      emailsSent: data.emailsSent || 0,
      createdAt: data.createdAt?.toDate?.()
    });
  });

  console.log(`📊 Verwendet in ${orgIds.size} Organisation(en):\n`);

  domainDetails.forEach((domain, index) => {
    console.log(`${index + 1}. Organisation: ${domain.orgId}`);
    console.log(`   Domain ID: ${domain.id}`);
    console.log(`   Status: ${domain.status}`);
    console.log(`   Standard-Domain: ${domain.isDefault ? 'JA' : 'Nein'}`);
    console.log(`   Emails gesendet: ${domain.emailsSent}`);
    console.log(`   Erstellt: ${domain.createdAt}`);
    console.log('');
  });

  // Prüfe Mailboxes
  const mailboxSnapshot = await db.collection('inbox_domain_mailboxes')
    .where('domain', '==', domainName)
    .get();

  console.log(`📬 Zugehörige Mailboxes: ${mailboxSnapshot.size}\n`);

  mailboxSnapshot.forEach(doc => {
    const mb = doc.data();
    console.log(`   - ${mb.inboxAddress} (Org: ${mb.organizationId})`);
  });

  if (orgIds.size > 1) {
    console.log('\n⚠️  WARNUNG: Domain wird in MEHREREN Organisationen verwendet!');
    console.log('   Löschen aus einer Organisation hat KEINE Auswirkungen auf andere.\n');
  } else {
    console.log('\n✅ Domain wird nur in EINER Organisation verwendet.');
    console.log('   Sicher zu löschen aus dieser Organisation.\n');
  }
}

const domainName = process.argv[2];

if (!domainName) {
  console.log('Usage: npx tsx scripts/check-domain-usage.ts <domain>');
  console.log('\nBeispiel:');
  console.log('  npx tsx scripts/check-domain-usage.ts sk-online-marketing.de\n');
  process.exit(1);
}

checkDomainUsage(domainName).then(() => process.exit(0));

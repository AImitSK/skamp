// scripts/check-duplicate-domains.ts
// Zeigt Details zu duplizierten Domains

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkDuplicates(orgId: string) {
  console.log(`\n🔍 Suche Duplikat-Domains für Organization: ${orgId}\n`);

  const domains = await db.collection('email_domains_enhanced')
    .where('organizationId', '==', orgId)
    .get();

  // Group by domain name
  const grouped = new Map<string, any[]>();

  domains.forEach(doc => {
    const data = doc.data();
    const name = data.domain;

    if (!grouped.has(name)) {
      grouped.set(name, []);
    }

    grouped.get(name)!.push({
      id: doc.id,
      ...data
    });
  });

  // Find duplicates
  let foundDuplicates = false;

  grouped.forEach((domainList, name) => {
    if (domainList.length > 1) {
      foundDuplicates = true;
      console.log(`\n⚠️  DUPLIKAT: ${name} (${domainList.length}x)\n`);

      domainList.forEach((domain, index) => {
        console.log(`   ${index + 1}. Domain ID: ${domain.id}`);
        console.log(`      Status: ${domain.status}`);
        console.log(`      Erstellt: ${domain.createdAt?.toDate?.()}`);
        console.log(`      Verifiziert: ${domain.verifiedAt?.toDate?.() || 'Nein'}`);
        console.log(`      SendGrid Domain ID: ${domain.sendgridDomainId || 'Keine'}`);
        console.log(`      Emails gesendet: ${domain.emailsSent || 0}`);
        console.log(`      Standard-Domain: ${domain.isDefault ? 'JA' : 'Nein'}`);
        console.log('');
      });
    }
  });

  if (!foundDuplicates) {
    console.log('✅ Keine Duplikate gefunden!\n');
  } else {
    console.log('\n💡 Empfehlung:');
    console.log('   - Behalte die Domain die verifiziert ist');
    console.log('   - Behalte die Domain die als Standard markiert ist');
    console.log('   - Behalte die Domain die Emails versendet hat');
    console.log('   - Lösche die andere(n)\n');
  }
}

const orgId = process.argv[2] || 'hJ4gTE9Gm35epoub0zIU';
checkDuplicates(orgId).then(() => process.exit(0));

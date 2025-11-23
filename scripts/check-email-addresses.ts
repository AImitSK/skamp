import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkEmailAddresses(orgId: string) {
  console.log(`\n📧 E-Mail-Adressen für Organization: ${orgId}\n`);

  const addresses = await db.collection('email_addresses')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`Gefunden: ${addresses.size} E-Mail-Adresse(n)\n`);

  addresses.forEach((doc, index) => {
    const data = doc.data();
    console.log(`${index + 1}. ${data.email}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Display Name: ${data.displayName || 'Keine'}`);
    console.log(`   Domain: ${data.domain || 'MISSING'}`);
    console.log(`   Domain ID: ${data.domainId || 'MISSING'}`);
    console.log(`   Status: ${data.status || 'active'}`);
    console.log(`   Standard: ${data.isDefault ? 'JA' : 'Nein'}`);
    console.log(`   Verifiziert: ${data.verified ? 'JA' : 'Nein'}`);
    console.log(`   Kann löschen: ${data.canDelete === false ? 'NEIN (protected)' : 'Ja'}`);
    console.log('');
  });

  // Prüfe Domains
  console.log('\n📧 Domains in email_domains_enhanced:\n');

  const domains = await db.collection('email_domains_enhanced')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`Gefunden: ${domains.size} Domain(s)\n`);

  domains.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.domain} (ID: ${doc.id}, Status: ${data.status})`);
  });

  if (domains.size === 0) {
    console.log('❌ KEINE Domains gefunden!\n');
    console.log('💡 Das erklärt warum die Domain-Seite leer ist.\n');
  }
}

const orgId = process.argv[2] || 'hJ4gTE9Gm35epoub0zIU';
checkEmailAddresses(orgId).then(() => process.exit(0));

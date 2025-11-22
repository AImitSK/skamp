// scripts/delete-duplicate-domain.ts
// Löscht eine Duplikat-Domain und ihre Mailbox

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function deleteDuplicateDomain(domainId: string, dryRun = true) {
  console.log(`\n🔍 Prüfe Domain ID: ${domainId}\n`);

  // 1. Lade Domain-Daten
  const domainDoc = await db.collection('email_domains_enhanced').doc(domainId).get();

  if (!domainDoc.exists) {
    console.log('❌ Domain nicht gefunden!\n');
    process.exit(1);
  }

  const domain = domainDoc.data()!;

  console.log('📧 Domain-Details:');
  console.log(`   Domain: ${domain.domain}`);
  console.log(`   Status: ${domain.status}`);
  console.log(`   Organization: ${domain.organizationId}`);
  console.log(`   Erstellt: ${domain.createdAt?.toDate?.()}`);
  console.log(`   Standard-Domain: ${domain.isDefault ? 'JA' : 'Nein'}`);
  console.log(`   SendGrid ID: ${domain.sendgridDomainId || 'Keine'}`);
  console.log(`   Emails gesendet: ${domain.emailsSent || 0}`);

  // 2. Finde zugehörige Mailbox
  const mailboxSnapshot = await db.collection('inbox_domain_mailboxes')
    .where('domainId', '==', domainId)
    .get();

  console.log(`\n📬 Zugehörige Mailboxes: ${mailboxSnapshot.size}`);

  mailboxSnapshot.forEach(doc => {
    const mb = doc.data();
    console.log(`   - ${mb.inboxAddress} (ID: ${doc.id})`);
  });

  // 3. Warnung wenn Standard-Domain
  if (domain.isDefault) {
    console.log('\n⚠️  WARNUNG: Dies ist eine Standard-Domain!');
    console.log('   Bist du sicher dass du diese löschen willst?\n');
    process.exit(1);
  }

  // 4. Warnung wenn Emails gesendet
  if (domain.emailsSent && domain.emailsSent > 0) {
    console.log(`\n⚠️  WARNUNG: ${domain.emailsSent} Emails wurden mit dieser Domain gesendet!`);
    console.log('   Bist du sicher dass du diese löschen willst?\n');
  }

  if (dryRun) {
    console.log('\n🔄 DRY RUN - Folgendes würde gelöscht werden:\n');
    console.log(`   1. Domain: ${domain.domain} (email_domains_enhanced/${domainId})`);
    mailboxSnapshot.forEach((doc, index) => {
      const mb = doc.data();
      console.log(`   ${index + 2}. Mailbox: ${mb.inboxAddress} (inbox_domain_mailboxes/${doc.id})`);
    });
    console.log('\n⚠️  Keine Änderungen vorgenommen!');
    console.log('   Führe mit --execute aus um tatsächlich zu löschen:\n');
    console.log(`   npx tsx scripts/delete-duplicate-domain.ts ${domainId} --execute\n`);
  } else {
    console.log('\n🗑️  LÖSCHE...\n');

    // Lösche Mailboxes
    for (const doc of mailboxSnapshot.docs) {
      await doc.ref.delete();
      console.log(`   ✅ Mailbox gelöscht: ${doc.id}`);
    }

    // Lösche Domain
    await domainDoc.ref.delete();
    console.log(`   ✅ Domain gelöscht: ${domainId}`);

    console.log('\n✅ Erfolgreich gelöscht!\n');
  }
}

const domainId = process.argv[2];
const dryRun = !process.argv.includes('--execute');

if (!domainId) {
  console.log('Usage: npx tsx scripts/delete-duplicate-domain.ts <domainId> [--execute]');
  console.log('\nBeispiel (Dry Run):');
  console.log('  npx tsx scripts/delete-duplicate-domain.ts uGrXqwcozTgtyHUExfdU');
  console.log('\nBeispiel (Tatsächlich löschen):');
  console.log('  npx tsx scripts/delete-duplicate-domain.ts uGrXqwcozTgtyHUExfdU --execute');
  console.log('\n💡 Zu löschende Domain: uGrXqwcozTgtyHUExfdU (neuere Duplikat)');
  console.log('   Behalten: icg2wwuTis8tv1WMCnKr (Standard-Domain)\n');
  process.exit(1);
}

deleteDuplicateDomain(domainId, dryRun).then(() => process.exit(0));

// scripts/create-missing-mailboxes.ts
// Erstellt fehlende Domain-Mailboxes für existierende Domains

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function createMissingMailboxes(dryRun = true) {
  console.log('\n🔍 Suche Domains ohne Mailboxes...\n');

  const domains = await db.collection('email_domains_enhanced').get();
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const domainDoc of domains.docs) {
    const domain = domainDoc.data();
    const domainId = domainDoc.id;

    // Prüfe ob Mailbox bereits existiert
    const existingMailbox = await db.collection('inbox_domain_mailboxes')
      .where('domainId', '==', domainId)
      .get();

    if (!existingMailbox.empty) {
      console.log(`✅ ${domain.domain} - Mailbox existiert bereits`);
      skipped++;
      continue;
    }

    // Mailbox fehlt!
    console.log(`\n⚠️  ${domain.domain} (Org: ${domain.organizationId})`);
    console.log(`   Domain ID: ${domainId}`);
    console.log(`   Status: ${domain.status}`);

    if (!dryRun) {
      try {
        const inboxAddress = `${domain.domain}@inbox.sk-online-marketing.de`;

        await db.collection('inbox_domain_mailboxes').add({
          organizationId: domain.organizationId,
          domainId: domainId,
          domain: domain.domain,
          inboxAddress: inboxAddress,
          status: 'active',
          unreadCount: 0,
          threadCount: 0,
          isDefault: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: domain.createdBy || 'system'
        });

        console.log(`   ✅ Mailbox erstellt: ${inboxAddress}`);
        created++;
      } catch (error) {
        console.error(`   ❌ Fehler:`, error);
        errors++;
      }
    } else {
      console.log(`   🔄 Würde Mailbox erstellen: ${domain.domain}@inbox.sk-online-marketing.de`);
      created++;
    }
  }

  console.log('\n📊 Zusammenfassung:');
  console.log(`   ${created} Mailbox${created !== 1 ? 'es' : ''} ${dryRun ? 'würden erstellt werden' : 'erstellt'}`);
  console.log(`   ${skipped} übersprungen (bereits vorhanden)`);
  if (errors > 0) {
    console.log(`   ${errors} Fehler`);
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - Keine Änderungen vorgenommen!');
    console.log('   Führe mit --execute aus um tatsächlich zu erstellen:\n');
    console.log('   npx tsx scripts/create-missing-mailboxes.ts --execute\n');
  } else {
    console.log('\n✅ Fertig!\n');
  }
}

const dryRun = !process.argv.includes('--execute');
createMissingMailboxes(dryRun).then(() => process.exit(0));

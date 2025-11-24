import { adminDb } from '../src/lib/firebase/admin-init';

/**
 * Löscht Domain-Mailboxes für Default-Domains (celeropress.com, sk-online-marketing.de)
 *
 * Grund: Laut Architektur (docs/planning/inbox/aufbau.md) sollen Default-Domains
 * KEINE Domain-Mailboxes haben, nur Projekt-Mailboxes.
 *
 * Default-Domains:
 * - celeropress.com (Standard-Absender für alle Orgs)
 * - sk-online-marketing.de (Infrastruktur-Domain)
 */
(async () => {
  console.log('🗑️  Deleting Domain-Mailboxes for Default-Domains...\n');

  const defaultDomains = ['celeropress.com', 'sk-online-marketing.de'];

  try {
    for (const domain of defaultDomains) {
      const inboxAddress = `${domain}@inbox.sk-online-marketing.de`;
      console.log(`\n📋 Searching for Domain-Mailboxes: ${inboxAddress}`);

      // Finde alle Domain-Mailboxes für diese Domain
      const mailboxesSnap = await adminDb
        .collection('inbox_domain_mailboxes')
        .where('inboxAddress', '==', inboxAddress)
        .get();

      if (mailboxesSnap.empty) {
        console.log(`   ✅ No Domain-Mailboxes found for ${domain} - already clean!`);
        continue;
      }

      console.log(`   📬 Found ${mailboxesSnap.size} Domain-Mailbox(es) for ${domain}:\n`);

      // Liste alle gefundenen Mailboxes
      mailboxesSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - Mailbox ID: ${doc.id}`);
        console.log(`     Organization: ${data.organizationId}`);
        console.log(`     Domain ID: ${data.domainId}`);
        console.log(`     Status: ${data.status}`);
        console.log(`     Threads: ${data.threadCount || 0}`);
        console.log(`     Unread: ${data.unreadCount || 0}`);
        console.log('');
      });

      // Warnung vor Löschung
      console.log(`   ⚠️  Diese ${mailboxesSnap.size} Mailbox(es) sollten nicht existieren laut Architektur!`);
      console.log(`   ⚠️  Default-Domains (${domain}) sollen nur Projekt-Mailboxes haben.\n`);

      // Prüfe ob Mailboxes Threads enthalten
      let totalThreads = 0;
      for (const doc of mailboxesSnap.docs) {
        const data = doc.data();
        const threadCount = data.threadCount || 0;
        totalThreads += threadCount;

        // Prüfe auch in email_threads Collection
        const threadsSnap = await adminDb
          .collection('email_threads')
          .where('organizationId', '==', data.organizationId)
          .where('domainId', '==', data.domainId)
          .where('mailboxType', '==', 'domain')
          .limit(1)
          .get();

        if (!threadsSnap.empty) {
          console.log(`   ⚠️  Mailbox ${doc.id} has ${threadsSnap.size} thread(s) in database!`);
        }
      }

      if (totalThreads > 0) {
        console.log(`   ⚠️  WARNING: Total ${totalThreads} threads would be affected!`);
        console.log(`   ⚠️  Threads will remain in database but mailbox will be deleted.\n`);
      }

      // Lösche alle Domain-Mailboxes für diese Domain
      let deletedCount = 0;
      for (const doc of mailboxesSnap.docs) {
        await adminDb.collection('inbox_domain_mailboxes').doc(doc.id).delete();
        console.log(`   ✅ Deleted Domain-Mailbox: ${doc.id}`);
        deletedCount++;
      }

      console.log(`\n   ✅ Successfully deleted ${deletedCount} Domain-Mailbox(es) for ${domain}`);
    }

    console.log('\n\n✅ DONE! All Default-Domain Mailboxes have been deleted.');
    console.log('\n📝 Note: Existing email threads remain in database.');
    console.log('📝 Future emails to these addresses will now be ignored (as intended).');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
})();

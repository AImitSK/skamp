// scripts/restore-mailboxes.ts
// Script zum Wiederherstellen der gelöschten Postfach-Collections

import { adminDb } from '../src/lib/firebase/admin-init';

async function restoreMailboxes() {
  try {
    console.log('🔄 Starte Wiederherstellung der Postfächer...\n');

    // Organisationsdaten (bitte anpassen!)
    const organizationId = 'celeropress'; // ANPASSEN
    const domainId = 'celeropress-de'; // ANPASSEN

    // 1. Domain-Postfach wiederherstellen
    console.log('📬 Erstelle Domain-Postfach für celeropress.de...');

    const domainMailboxData = {
      organizationId: organizationId,
      domainId: domainId,
      domain: 'celeropress.de',
      inboxAddress: 'celeropress.de@inbox.sk-online-marketing.de',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      settings: {
        autoReply: false,
        forwardingEnabled: false,
        spamFilterLevel: 'medium'
      }
    };

    const domainMailboxRef = await adminDb
      .collection('inbox_domain_mailboxes')
      .add(domainMailboxData);

    console.log('✅ Domain-Postfach erstellt:', domainMailboxRef.id);
    console.log('   Inbox-Adresse:', domainMailboxData.inboxAddress);

    // 2. Zweites Domain-Postfach (falls vorhanden)
    console.log('\n📬 Erstelle zweites Domain-Postfach für sk-online-marketing.de...');

    const domainMailboxData2 = {
      organizationId: organizationId,
      domainId: 'sk-online-marketing-de',
      domain: 'sk-online-marketing.de',
      inboxAddress: 'sk-online-marketing.de@inbox.sk-online-marketing.de',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      settings: {
        autoReply: false,
        forwardingEnabled: false,
        spamFilterLevel: 'medium'
      }
    };

    const domainMailboxRef2 = await adminDb
      .collection('inbox_domain_mailboxes')
      .add(domainMailboxData2);

    console.log('✅ Domain-Postfach erstellt:', domainMailboxRef2.id);
    console.log('   Inbox-Adresse:', domainMailboxData2.inboxAddress);

    console.log('\n✅ Wiederherstellung abgeschlossen!');
    console.log('\n📝 Zusammenfassung:');
    console.log('   - inbox_domain_mailboxes: 2 Einträge');
    console.log('   - Organisation:', organizationId);
    console.log('\n⚠️  Falls weitere Projekt-Postfächer benötigt werden,');
    console.log('   können diese über die UI neu erstellt werden.');

  } catch (error) {
    console.error('❌ Fehler bei der Wiederherstellung:', error);
    throw error;
  }
}

// Script ausführen
restoreMailboxes()
  .then(() => {
    console.log('\n✨ Script erfolgreich beendet');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script fehlgeschlagen:', error);
    process.exit(1);
  });

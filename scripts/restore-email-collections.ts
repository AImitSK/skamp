// scripts/restore-email-collections.ts
// Script zum Wiederherstellen der E-Mail Collections mit Dummy-Daten

import { adminDb } from '../src/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

async function restoreEmailCollections() {
  try {
    console.log('🔄 Starte Wiederherstellung der E-Mail Collections...\n');

    const organizationId = 'celeropress';

    // 1. Email Threads Collection
    console.log('📧 Erstelle email_threads Collection...');

    const threadData = {
      organizationId: organizationId,
      subject: 'Willkommen - Inbox wiederhergestellt',
      participants: [
        { email: 'system@celeropress.de', name: 'System' }
      ],
      lastMessageAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      messageCount: 1,
      unreadCount: 0,
      isRead: true,
      isStarred: false,
      isArchived: false,
      folder: 'inbox',
      labels: ['system'],
      snippet: 'Die Inbox wurde erfolgreich wiederhergestellt.',
      hasAttachments: false
    };

    const threadRef = await adminDb.collection('email_threads').add(threadData);
    console.log('✅ email_threads erstellt mit ID:', threadRef.id);

    // 2. Email Messages Collection
    console.log('\n📬 Erstelle email_messages Collection...');

    const messageData = {
      messageId: `system-${Date.now()}@celeropress.de`,
      threadId: threadRef.id,
      organizationId: organizationId,
      emailAccountId: 'system',
      userId: 'system',

      from: {
        email: 'system@celeropress.de',
        name: 'CeleroPress System'
      },
      to: [
        {
          email: 'admin@celeropress.de',
          name: 'Administrator'
        }
      ],

      subject: 'Willkommen - Inbox wiederhergestellt',
      textContent: 'Die Inbox-Collections wurden erfolgreich wiederhergestellt.\n\nDie folgenden Collections sind jetzt aktiv:\n- email_messages\n- email_threads\n- inbox_domain_mailboxes\n\nEingehende E-Mails werden ab jetzt wieder korrekt gespeichert.',
      htmlContent: '<html><body><h2>Willkommen - Inbox wiederhergestellt</h2><p>Die Inbox-Collections wurden erfolgreich wiederhergestellt.</p><p><strong>Die folgenden Collections sind jetzt aktiv:</strong></p><ul><li>email_messages</li><li>email_threads</li><li>inbox_domain_mailboxes</li></ul><p>Eingehende E-Mails werden ab jetzt wieder korrekt gespeichert.</p></body></html>',
      snippet: 'Die Inbox-Collections wurden erfolgreich wiederhergestellt.',

      receivedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),

      isRead: true,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      folder: 'inbox',
      importance: 'normal',
      labels: ['system'],
      attachments: [],

      mailboxType: 'domain'
    };

    const messageRef = await adminDb.collection('email_messages').add(messageData);
    console.log('✅ email_messages erstellt mit ID:', messageRef.id);

    // 3. Zusammenfassung
    console.log('\n✅ Wiederherstellung abgeschlossen!');
    console.log('\n📝 Erstellte Collections:');
    console.log('   ✓ email_threads (1 Eintrag)');
    console.log('   ✓ email_messages (1 Eintrag)');
    console.log('\n📬 Die Postfächer sind jetzt bereit:');
    console.log('   - celeropress.de@inbox.sk-online-marketing.de');
    console.log('   - sk-online-marketing.de@inbox.sk-online-marketing.de');
    console.log('\n✨ Neue E-Mails werden automatisch in diesen Collections gespeichert.');

  } catch (error) {
    console.error('❌ Fehler bei der Wiederherstellung:', error);
    throw error;
  }
}

// Script ausführen
restoreEmailCollections()
  .then(() => {
    console.log('\n✨ Script erfolgreich beendet');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script fehlgeschlagen:', error);
    process.exit(1);
  });

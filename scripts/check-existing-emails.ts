// scripts/check-existing-emails.ts
// Prüft welche Emails bereits in der Datenbank existieren
// um das Duplikat-Problem zu analysieren

import { adminDb } from '../src/lib/firebase/admin-init';

async function checkExistingEmails() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('🔍 Prüfe vorhandene Emails in der Datenbank\n');
  console.log(`📋 Organisation: ${orgId}\n`);
  console.log('='.repeat(80));

  // 1. Alle Email Messages
  const messagesSnap = await adminDb
    .collection('email_messages')
    .where('organizationId', '==', orgId)
    .limit(50)
    .get();

  console.log(`\n📧 Email Messages: ${messagesSnap.size} gefunden (max. 20 angezeigt)\n`);

  if (messagesSnap.empty) {
    console.log('   ✅ Keine Emails vorhanden (Datenbank ist leer)\n');
  } else {
    messagesSnap.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. Email (ID: ${doc.id})`);
      console.log(`   Subject: ${data.subject || 'N/A'}`);
      console.log(`   From: ${data.from?.email || 'N/A'}`);
      console.log(`   MessageId: ${data.messageId || 'N/A'}`);
      console.log(`   ProjectId: ${data.projectId || 'none'}`);
      console.log(`   DomainId: ${data.domainId || 'none'}`);
      console.log(`   MailboxType: ${data.mailboxType || 'N/A'}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || 'N/A'}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  // 2. Grouping nach Message-ID
  console.log('\n📊 Message-ID Analyse:\n');

  const messageIdMap = new Map<string, any[]>();
  messagesSnap.forEach(doc => {
    const data = doc.data();
    const msgId = data.messageId || 'no-message-id';

    if (!messageIdMap.has(msgId)) {
      messageIdMap.set(msgId, []);
    }
    messageIdMap.get(msgId)!.push({
      docId: doc.id,
      subject: data.subject,
      projectId: data.projectId,
      domainId: data.domainId,
      mailboxType: data.mailboxType
    });
  });

  console.log(`   Unique Message-IDs: ${messageIdMap.size}`);
  console.log(`   Total Emails: ${messagesSnap.size}\n`);

  // Duplikate finden
  const duplicates = Array.from(messageIdMap.entries())
    .filter(([_, emails]) => emails.length > 1);

  if (duplicates.length > 0) {
    console.log(`   ⚠️  DUPLIKATE GEFUNDEN: ${duplicates.length} Message-IDs mit mehreren Emails\n`);
    duplicates.forEach(([msgId, emails]) => {
      console.log(`   Message-ID: ${msgId}`);
      console.log(`   Anzahl: ${emails.length} Emails`);
      emails.forEach((email, i) => {
        console.log(`     ${i + 1}. ${email.mailboxType} (${email.projectId || email.domainId})`);
        console.log(`        Subject: ${email.subject}`);
      });
      console.log('');
    });
  } else {
    console.log('   ✅ Keine Duplikate gefunden - alle Message-IDs sind unique\n');
  }

  console.log('='.repeat(80));

  // 3. Spezielle Suche nach Test-Emails
  console.log('\n🧪 Suche nach Test-Emails:\n');

  const testEmailsSnap = await adminDb
    .collection('email_messages')
    .where('organizationId', '==', orgId)
    .get();

  const testEmails = testEmailsSnap.docs
    .filter(doc => {
      const subject = doc.data().subject || '';
      return subject.toLowerCase().includes('test') ||
             subject.includes('2.1') ||
             subject.includes('2.2') ||
             subject.includes('3.1');
    });

  if (testEmails.length > 0) {
    console.log(`   Gefunden: ${testEmails.length} Test-Emails\n`);
    testEmails.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.subject}`);
      console.log(`      MessageId: ${data.messageId}`);
      console.log(`      Mailbox: ${data.mailboxType} (${data.projectId || data.domainId})`);
      console.log(`      Created: ${data.createdAt?.toDate?.()}\n`);
    });
  } else {
    console.log('   ℹ️  Keine Test-Emails gefunden\n');
  }

  console.log('='.repeat(80));
  console.log('\n💡 Analyse abgeschlossen\n');
}

checkExistingEmails()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fehler:', err);
    process.exit(1);
  });

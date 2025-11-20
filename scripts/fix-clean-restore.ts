// scripts/fix-clean-restore.ts
// Löscht alles Falsche und erstellt NUR sk-online-marketing.de für die richtige Org

import { adminDb } from '../src/lib/firebase/admin-init';

async function cleanRestore() {
  const correctOrgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('🧹 SCHRITT 1: Lösche ALLE falschen Einträge...\n');

  // Lösche ALLES aus inbox_domain_mailboxes
  const domainSnap = await adminDb.collection('inbox_domain_mailboxes').get();
  console.log(`   Lösche ${domainSnap.size} Domain-Mailboxen...`);
  for (const doc of domainSnap.docs) {
    await doc.ref.delete();
  }
  console.log('   ✅ Gelöscht');

  // Lösche ALLES aus inbox_project_mailboxes
  const projectSnap = await adminDb.collection('inbox_project_mailboxes').get();
  console.log(`   Lösche ${projectSnap.size} Projekt-Mailboxen...`);
  for (const doc of projectSnap.docs) {
    await doc.ref.delete();
  }
  console.log('   ✅ Gelöscht');

  // Lösche ALLES aus email_addresses
  const emailSnap = await adminDb.collection('email_addresses').get();
  console.log(`   Lösche ${emailSnap.size} E-Mail-Adressen...`);
  for (const doc of emailSnap.docs) {
    await doc.ref.delete();
  }
  console.log('   ✅ Gelöscht');

  console.log('\n✅ SCHRITT 2: Erstelle NUR sk-online-marketing.de...\n');

  // Erstelle Domain-Postfach für sk-online-marketing.de
  const domainMailbox = {
    organizationId: correctOrgId,
    domainId: 'sk-online-marketing-de',
    domain: 'sk-online-marketing.de',
    inboxAddress: 'sk-online-marketing.de@inbox.sk-online-marketing.de',
    status: 'active',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      autoReply: false,
      forwardingEnabled: false,
      spamFilterLevel: 'medium'
    }
  };

  const domainRef = await adminDb.collection('inbox_domain_mailboxes').add(domainMailbox);
  console.log('   ✅ Domain-Postfach erstellt:', domainRef.id);
  console.log('      ', domainMailbox.inboxAddress);

  // Erstelle E-Mail-Adresse
  const emailAddress = {
    email: 'kontakt@sk-online-marketing.de',
    displayName: 'SK Online Marketing',
    organizationId: correctOrgId,
    userId: 'admin',
    isActive: true,
    isDefault: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    domain: 'sk-online-marketing.de',
    type: 'business',
    provider: 'sendgrid',
    settings: {
      signature: '',
      autoReply: false,
      forwardingEnabled: false
    }
  };

  const emailRef = await adminDb.collection('email_addresses').add(emailAddress);
  console.log('\n   ✅ E-Mail-Adresse erstellt:', emailRef.id);
  console.log('      ', emailAddress.email);

  console.log('\n' + '='.repeat(60));
  console.log('✅ FERTIG!');
  console.log('');
  console.log('📬 Dein Postfach:');
  console.log('   - sk-online-marketing.de@inbox.sk-online-marketing.de');
  console.log('');
  console.log('📧 Deine E-Mail-Adresse:');
  console.log('   - kontakt@sk-online-marketing.de');
  console.log('');
  console.log('🔄 Lade die Inbox neu (Strg+Shift+R)');
  console.log('='.repeat(60));
}

cleanRestore()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

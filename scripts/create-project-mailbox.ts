// scripts/create-project-mailbox.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function createProjectMailbox() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';
  const projectId = 'NwhVjhnGtlOubvrG9DHZ';
  const projectName = 'Neue Mailbox';

  console.log('📬 Erstelle Projekt-Postfach...\n');
  console.log(`   Projekt: ${projectName}`);
  console.log(`   ID: ${projectId}\n`);

  // Erstelle inbox_project_mailboxes Eintrag
  const inboxAddress = `${projectId}@inbox.sk-online-marketing.de`.toLowerCase();

  const mailboxData = {
    organizationId: orgId,
    projectId: projectId,
    projectName: projectName,
    domain: 'sk-online-marketing.de',
    domainId: 'sk-online-marketing-de',
    inboxAddress: inboxAddress,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      autoReply: false,
      forwardingEnabled: false,
      spamFilterLevel: 'medium'
    }
  };

  const ref = await adminDb.collection('inbox_project_mailboxes').add(mailboxData);

  console.log('✅ Projekt-Postfach erstellt!');
  console.log(`   ID: ${ref.id}`);
  console.log(`   Inbox: ${inboxAddress}\n`);

  console.log('='.repeat(60));
  console.log('📊 Deine Postfächer jetzt:');
  console.log('');
  console.log('Domains:');
  console.log('  - sk-online-marketing.de@inbox.sk-online-marketing.de');
  console.log('');
  console.log('Projekte:');
  console.log(`  - ${projectName} (${inboxAddress})`);
  console.log('');
  console.log('🔄 Lade Inbox neu (Strg+Shift+R)');
  console.log('='.repeat(60));
}

createProjectMailbox()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

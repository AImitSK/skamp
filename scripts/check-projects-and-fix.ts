// scripts/check-projects-and-fix.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function checkAndFixProjects() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('🔍 Suche Projekte für Organization:', orgId);
  console.log('='.repeat(60), '\n');

  // 1. Suche PR Projects
  const projectsSnap = await adminDb
    .collection('pr_projects')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`📁 Gefundene PR-Projekte: ${projectsSnap.size}\n`);

  if (projectsSnap.size === 0) {
    console.log('❌ Keine Projekte gefunden!\n');
    return;
  }

  // 2. Zeige alle Projekte
  projectsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Projekt: ${d.title || d.name || 'Unbenannt'}`);
    console.log(`  ID: ${doc.id}`);
    console.log(`  domain: ${d.domain || 'FEHLT'}`);
    console.log(`  domainId: ${d.domainId || 'FEHLT'}`);
    console.log('');
  });

  // 3. Prüfe ob Projekt-Postfächer existieren
  const mailboxSnap = await adminDb
    .collection('inbox_project_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`📬 Vorhandene Projekt-Postfächer: ${mailboxSnap.size}\n`);

  // 4. Erstelle fehlende Postfächer
  console.log('🔧 Erstelle fehlende Projekt-Postfächer...\n');

  for (const doc of projectsSnap.docs) {
    const project = doc.data();
    const projectId = doc.id;

    // Prüfe ob Postfach bereits existiert
    const existingMailbox = await adminDb
      .collection('inbox_project_mailboxes')
      .where('projectId', '==', projectId)
      .where('organizationId', '==', orgId)
      .get();

    if (!existingMailbox.empty) {
      console.log(`⏭️  Postfach existiert bereits für: ${project.title || project.name}`);
      continue;
    }

    // Erstelle Postfach
    const inboxAddress = `${projectId}@inbox.sk-online-marketing.de`;

    const mailboxData = {
      organizationId: orgId,
      projectId: projectId,
      projectName: project.title || project.name || 'Unbenanntes Projekt',
      domain: project.domain || 'sk-online-marketing.de',
      domainId: project.domainId || 'sk-online-marketing-de',
      inboxAddress: inboxAddress.toLowerCase(),
      status: project.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        autoReply: false,
        forwardingEnabled: false
      }
    };

    const ref = await adminDb.collection('inbox_project_mailboxes').add(mailboxData);
    console.log(`✅ Postfach erstellt für: ${project.title || project.name}`);
    console.log(`   ${inboxAddress}\n`);
  }

  console.log('='.repeat(60));
  console.log('✅ FERTIG! Lade Inbox neu (Strg+Shift+R)');
}

checkAndFixProjects()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

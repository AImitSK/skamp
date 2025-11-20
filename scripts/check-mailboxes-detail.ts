// scripts/check-mailboxes-detail.ts
// Detaillierte Prüfung der Mailboxen

import { adminDb } from '../src/lib/firebase/admin-init';

async function checkMailboxesDetail() {
  try {
    console.log('🔍 Detaillierte Mailbox-Prüfung...\n');

    // 1. Alle inbox_domain_mailboxes
    const domainSnapshot = await adminDb.collection('inbox_domain_mailboxes').get();
    console.log(`📬 inbox_domain_mailboxes: ${domainSnapshot.size} Einträge\n`);

    if (domainSnapshot.empty) {
      console.log('❌ Keine Domain-Mailboxen gefunden!\n');
    } else {
      domainSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`  organizationId: ${data.organizationId || 'FEHLT!'}`);
        console.log(`  domain: ${data.domain || 'FEHLT!'}`);
        console.log(`  domainId: ${data.domainId || 'FEHLT!'}`);
        console.log(`  inboxAddress: ${data.inboxAddress || 'FEHLT!'}`);
        console.log(`  status: ${data.status || 'FEHLT!'}`);
        console.log('');
      });
    }

    // 2. Alle inbox_project_mailboxes
    const projectSnapshot = await adminDb.collection('inbox_project_mailboxes').get();
    console.log(`📁 inbox_project_mailboxes: ${projectSnapshot.size} Einträge\n`);

    if (projectSnapshot.size > 0) {
      projectSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`  organizationId: ${data.organizationId || 'FEHLT!'}`);
        console.log(`  projectId: ${data.projectId || 'FEHLT!'}`);
        console.log(`  inboxAddress: ${data.inboxAddress || 'FEHLT!'}`);
        console.log(`  status: ${data.status || 'FEHLT!'}`);
        console.log('');
      });
    }

    // 3. Prüfe was die UI laden würde
    console.log('🔎 Simuliere UI-Query (organizationId = "celeropress", status = "active"):\n');

    const uiQuery = await adminDb
      .collection('inbox_domain_mailboxes')
      .where('organizationId', '==', 'celeropress')
      .where('status', '==', 'active')
      .get();

    console.log(`✅ UI würde ${uiQuery.size} Mailboxen finden\n`);

    if (uiQuery.size === 0) {
      console.log('❌ PROBLEM: Die UI findet keine Mailboxen!');
      console.log('   Mögliche Ursachen:');
      console.log('   1. organizationId stimmt nicht überein');
      console.log('   2. status ist nicht "active"');
      console.log('   3. Dokumente fehlen in inbox_domain_mailboxes');
    } else {
      console.log('✅ Die UI sollte die Mailboxen anzeigen können!');
      uiQuery.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.domain}: ${data.inboxAddress}`);
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  }
}

checkMailboxesDetail()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fehler:', error);
    process.exit(1);
  });

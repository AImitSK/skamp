// scripts/cleanup-orphaned-mailboxes.ts
// Löscht verwaiste Projekt-Postfächer (Postfächer ohne existierendes Projekt)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

interface OrphanedMailbox {
  id: string;
  projectId: string;
  projectName: string;
  inboxAddress: string;
  organizationId: string;
}

async function cleanupOrphanedMailboxes() {
  console.log('\n🔍 Suche verwaiste Projekt-Postfächer...\n');
  console.log('='.repeat(60));

  // 1. Lade alle Projekt-Postfächer
  const mailboxesSnapshot = await db.collection('inbox_project_mailboxes').get();
  console.log(`📬 Gefunden: ${mailboxesSnapshot.size} Projekt-Postfächer\n`);

  if (mailboxesSnapshot.size === 0) {
    console.log('✅ Keine Postfächer vorhanden\n');
    return;
  }

  // 2. Lade alle Projekt-IDs
  const projectsSnapshot = await db.collection('projects').get();
  const existingProjectIds = new Set(projectsSnapshot.docs.map(doc => doc.id));
  console.log(`📁 Gefunden: ${existingProjectIds.size} Projekte\n`);

  // 3. Finde verwaiste Postfächer
  const orphanedMailboxes: OrphanedMailbox[] = [];

  for (const mailboxDoc of mailboxesSnapshot.docs) {
    const mb = mailboxDoc.data();

    if (!existingProjectIds.has(mb.projectId)) {
      orphanedMailboxes.push({
        id: mailboxDoc.id,
        projectId: mb.projectId,
        projectName: mb.projectName || 'Unbekannt',
        inboxAddress: mb.inboxAddress || 'Keine Adresse',
        organizationId: mb.organizationId
      });
    }
  }

  console.log('='.repeat(60));
  console.log(`\n⚠️  Verwaiste Postfächer: ${orphanedMailboxes.length}\n`);

  if (orphanedMailboxes.length === 0) {
    console.log('✅ Keine verwaisten Postfächer gefunden!\n');
    return;
  }

  // 4. Liste verwaiste Postfächer auf
  console.log('Verwaiste Postfächer:\n');
  for (const mb of orphanedMailboxes) {
    console.log(`  📭 ${mb.inboxAddress}`);
    console.log(`     Projekt-ID: ${mb.projectId}`);
    console.log(`     Projekt-Name: ${mb.projectName}`);
    console.log(`     Organisation: ${mb.organizationId}`);
    console.log('');
  }

  // 5. Prüfe auf --delete Flag
  const shouldDelete = process.argv.includes('--delete');

  if (!shouldDelete) {
    console.log('='.repeat(60));
    console.log('\n💡 Um die verwaisten Postfächer zu löschen, führe aus:');
    console.log('   npx tsx scripts/cleanup-orphaned-mailboxes.ts --delete\n');
    return;
  }

  // 6. Lösche verwaiste Postfächer
  console.log('='.repeat(60));
  console.log('\n🗑️  Lösche verwaiste Postfächer...\n');

  let deleted = 0;
  for (const mb of orphanedMailboxes) {
    try {
      await db.collection('inbox_project_mailboxes').doc(mb.id).delete();
      console.log(`  ✅ Gelöscht: ${mb.inboxAddress}`);
      deleted++;
    } catch (error) {
      console.error(`  ❌ Fehler bei ${mb.inboxAddress}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ ${deleted} verwaiste Postfächer gelöscht\n`);
}

cleanupOrphanedMailboxes().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

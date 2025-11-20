// scripts/check-duplicates.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function checkDuplicates() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('🔍 Prüfe auf Duplikate...\n');

  // Project Mailboxes
  const projectSnap = await adminDb
    .collection('inbox_project_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`📬 inbox_project_mailboxes: ${projectSnap.size}\n`);

  if (projectSnap.size > 1) {
    console.log('⚠️  DUPLIKATE GEFUNDEN!\n');
  }

  projectSnap.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  projectName: ${d.projectName}`);
    console.log(`  projectId: ${d.projectId}`);
    console.log(`  inboxAddress: ${d.inboxAddress}`);
    console.log(`  created: ${d.createdAt?.toDate?.()}`);
    console.log('');
  });

  if (projectSnap.size > 1) {
    console.log('💡 Soll ich das ältere Duplikat löschen? (y/n)');
  }
}

checkDuplicates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

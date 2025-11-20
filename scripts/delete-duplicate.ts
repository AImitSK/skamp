// scripts/delete-duplicate.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function deleteDuplicate() {
  console.log('🗑️  Lösche älteres Duplikat...\n');

  // Lösche das ältere (hUFwWE1SVg5fsXIGxVwo von 09:27)
  await adminDb
    .collection('inbox_project_mailboxes')
    .doc('hUFwWE1SVg5fsXIGxVwo')
    .delete();

  console.log('✅ Älteres Duplikat gelöscht (hUFwWE1SVg5fsXIGxVwo)');
  console.log('🔄 Lade Inbox neu (F5)');
}

deleteDuplicate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

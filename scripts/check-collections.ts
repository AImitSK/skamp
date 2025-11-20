// scripts/check-collections.ts
// Prüft welche Collections existieren

import { adminDb } from '../src/lib/firebase/admin-init';

async function checkCollections() {
  try {
    console.log('🔍 Prüfe vorhandene Collections...\n');

    const collections = [
      'email_messages',
      'email_threads',
      'email_addresses',
      'inbox_domain_mailboxes',
      'inbox_project_mailboxes'
    ];

    for (const collName of collections) {
      try {
        const snapshot = await adminDb.collection(collName).limit(1).get();
        const count = snapshot.size;

        if (count > 0) {
          console.log(`✅ ${collName}: ${count} Dokumente (existiert)`);
        } else {
          console.log(`⚠️  ${collName}: 0 Dokumente (leer oder gelöscht)`);
        }
      } catch (error) {
        console.log(`❌ ${collName}: Fehler beim Abruf`);
      }
    }

    // Detaillierte Prüfung email_messages
    console.log('\n📧 Detailprüfung email_messages:');
    const messagesSnapshot = await adminDb.collection('email_messages').limit(5).get();
    console.log(`   Anzahl: ${messagesSnapshot.size}`);

    if (messagesSnapshot.size > 0) {
      console.log('   Beispiel-E-Mails:');
      messagesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.subject || 'Kein Betreff'} (${data.from?.email || 'unknown'})`);
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  }
}

checkCollections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fehler:', error);
    process.exit(1);
  });

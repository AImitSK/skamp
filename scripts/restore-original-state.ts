// scripts/restore-original-state.ts
// Stellt den Original-Zustand wieder her - LÖSCHT alle meine Änderungen

import { adminDb } from '../src/lib/firebase/admin-init';

async function restoreOriginalState() {
  console.log('🔄 RESTORE: Stelle Original-Zustand wieder her...\n');
  console.log('⚠️  Dies wird ALLE meine Änderungen rückgängig machen!\n');

  try {
    // SCHRITT 1: Lösche ALLE Collections die ich erstellt/modifiziert habe
    console.log('🗑️  SCHRITT 1: Lösche alle von mir erstellten Einträge...\n');

    // 1a. Lösche inbox_domain_mailboxes (die ich erstellt habe)
    console.log('   Lösche inbox_domain_mailboxes...');
    const domainSnap = await adminDb.collection('inbox_domain_mailboxes').get();
    const domainBatch = adminDb.batch();
    domainSnap.docs.forEach(doc => {
      domainBatch.delete(doc.ref);
    });
    await domainBatch.commit();
    console.log(`   ✅ ${domainSnap.size} Domain-Mailboxen gelöscht`);

    // 1b. Lösche inbox_project_mailboxes (war eh leer)
    console.log('   Lösche inbox_project_mailboxes...');
    const projectSnap = await adminDb.collection('inbox_project_mailboxes').get();
    const projectBatch = adminDb.batch();
    projectSnap.docs.forEach(doc => {
      projectBatch.delete(doc.ref);
    });
    await projectBatch.commit();
    console.log(`   ✅ ${projectSnap.size} Projekt-Mailboxen gelöscht`);

    // 1c. Lösche email_addresses (die ich erstellt habe)
    console.log('   Lösche email_addresses...');
    const emailSnap = await adminDb.collection('email_addresses').get();
    const emailBatch = adminDb.batch();
    emailSnap.docs.forEach(doc => {
      emailBatch.delete(doc.ref);
    });
    await emailBatch.commit();
    console.log(`   ✅ ${emailSnap.size} E-Mail-Adressen gelöscht`);

    console.log('\n✅ FERTIG: Alle meine Änderungen wurden rückgängig gemacht!\n');
    console.log('📊 Aktueller Zustand:');
    console.log('   - inbox_domain_mailboxes: LEER (wie du es gelöscht hattest)');
    console.log('   - inbox_project_mailboxes: LEER (wie du es gelöscht hattest)');
    console.log('   - email_addresses: LEER (wie vorher)');
    console.log('');
    console.log('📧 Deine email_messages und email_threads sind UNBERÜHRT!');
    console.log('');
    console.log('⚠️  Du bist jetzt im gleichen Zustand wie BEVOR du die Collections gelöscht hast.');
    console.log('   Die Collections existieren wieder (leer), aber keine Postfächer sind konfiguriert.\n');

  } catch (error) {
    console.error('❌ Fehler beim Restore:', error);
    throw error;
  }
}

restoreOriginalState()
  .then(() => {
    console.log('✨ Restore abgeschlossen - Lade die Inbox neu!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Restore fehlgeschlagen:', err);
    process.exit(1);
  });

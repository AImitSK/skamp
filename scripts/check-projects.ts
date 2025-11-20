// scripts/check-projects.ts
// Prüft welche Projekte Postfächer benötigen

import { adminDb } from '../src/lib/firebase/admin-init';

async function checkProjects() {
  try {
    console.log('🔍 Suche nach Projekten...\n');

    // Suche PR-Projekte
    const projectsSnapshot = await adminDb.collection('pr_projects').get();

    if (projectsSnapshot.empty) {
      console.log('📭 Keine PR-Projekte gefunden.');
      console.log('   Die inbox_project_mailboxes Collection ist leer - das ist OK.');
      return;
    }

    console.log(`📊 Gefundene Projekte: ${projectsSnapshot.size}\n`);

    for (const doc of projectsSnapshot.docs) {
      const data = doc.data();
      console.log(`📁 Projekt: ${data.title || data.name || 'Unbenannt'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Organisation: ${data.organizationId || 'unknown'}`);
      console.log(`   Domain: ${data.domain || 'unknown'}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  }
}

checkProjects()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fehler:', error);
    process.exit(1);
  });

// scripts/find-all-recent-projects.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function findAllProjects() {
  console.log('🔍 Suche die neuesten Projekte...\n');

  const allProjects = await adminDb
    .collection('pr_projects')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  console.log(`Gefunden: ${allProjects.size} Projekte\n`);

  if (allProjects.size === 0) {
    console.log('❌ KEINE Projekte gefunden!');
    console.log('   Hast du das Projekt wirklich angelegt?');
    console.log('   In welcher Collection sollte es sein?');
    return;
  }

  allProjects.forEach(doc => {
    const d = doc.data();
    const created = d.createdAt?.toDate?.();
    const createdStr = created ? created.toLocaleString('de-DE') : 'unknown';

    console.log(`📁 ${d.title || d.name || 'Unbenannt'}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   organizationId: ${d.organizationId}`);
    console.log(`   domain: ${d.domain || 'N/A'}`);
    console.log(`   erstellt: ${createdStr}`);
    console.log('');
  });

  console.log('💡 Wenn dein neues Projekt hier ist, sag mir die ID!');
}

findAllProjects()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });

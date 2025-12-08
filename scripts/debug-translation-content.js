// scripts/debug-translation-content.js
// Debug-Script um den Content einer Übersetzung in Firestore zu prüfen
//
// USAGE: node scripts/debug-translation-content.js <organizationId> <projectId> <languageCode>
//
// Beispiel: node scripts/debug-translation-content.js abcdef123 project-123 en

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Firebase Admin initialisieren
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugTranslation() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('Usage: node scripts/debug-translation-content.js <organizationId> <projectId> <languageCode>');
    console.log('\nOder: Zeige alle Übersetzungen für ein Projekt:');
    console.log('node scripts/debug-translation-content.js <organizationId> <projectId> all');
    process.exit(1);
  }

  const [organizationId, projectId, languageCode] = args;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 Translation Content Debug');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const collectionPath = `organizations/${organizationId}/projects/${projectId}/translations`;
  console.log('📁 Collection Path:', collectionPath);
  console.log('🔑 Organization ID:', organizationId);
  console.log('📄 Project ID:', projectId);
  console.log('🌐 Language:', languageCode === 'all' ? 'ALLE' : languageCode);
  console.log('');

  try {
    let query;
    if (languageCode === 'all') {
      query = db.collection(collectionPath);
    } else {
      query = db.collection(collectionPath).where('language', '==', languageCode);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('❌ Keine Übersetzungen gefunden!');
      console.log('\n📋 Überprüfe ob der Pfad korrekt ist:');

      // Prüfe ob Organization existiert
      const orgRef = db.collection('organizations').doc(organizationId);
      const orgDoc = await orgRef.get();
      console.log(`   Organization existiert: ${orgDoc.exists ? '✅' : '❌'}`);

      // Prüfe ob Projekt existiert
      const projectRef = db.collection(`organizations/${organizationId}/projects`).doc(projectId);
      const projectDoc = await projectRef.get();
      console.log(`   Projekt existiert: ${projectDoc.exists ? '✅' : '❌'}`);

      if (projectDoc.exists) {
        console.log('\n📋 Projekt-Daten:');
        const projectData = projectDoc.data();
        console.log(`   Titel: ${projectData.title || 'N/A'}`);
        console.log(`   Campaign ID: ${projectData.campaignId || 'N/A'}`);
      }

      return;
    }

    console.log(`📊 ${snapshot.size} Übersetzung(en) gefunden:\n`);

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`───────────────────────────────────────────────────────────────`);
      console.log(`[${index + 1}] ID: ${doc.id}`);
      console.log(`    Sprache: ${data.language}`);
      console.log(`    Status: ${data.status}`);
      console.log(`    Titel: ${data.title || 'N/A'}`);
      console.log(`    Model: ${data.modelUsed || 'N/A'}`);
      console.log(`    isOutdated: ${data.isOutdated}`);
      console.log(`    generatedAt: ${data.generatedAt?.toDate?.() || 'N/A'}`);
      console.log(`    sourceVersion: ${data.sourceVersion || 'N/A'}`);
      console.log('');

      // Content-Analyse
      const content = data.content || '';
      console.log(`    📝 CONTENT ANALYSE:`);
      console.log(`       Länge: ${content.length} Zeichen`);
      console.log(`       Leer: ${content.trim() === '' ? '⚠️ JA!' : 'Nein'}`);

      // HTML-Tags zählen
      const pTags = (content.match(/<p>/g) || []).length;
      const strongTags = (content.match(/<strong>/g) || []).length;
      const emTags = (content.match(/<em>/g) || []).length;
      const blockquoteTags = (content.match(/<blockquote/g) || []).length;
      console.log(`       <p> Tags: ${pTags}`);
      console.log(`       <strong> Tags: ${strongTags}`);
      console.log(`       <em> Tags: ${emTags}`);
      console.log(`       <blockquote> Tags: ${blockquoteTags}`);

      // Erste 500 Zeichen anzeigen
      console.log('');
      console.log('    📄 Content (erste 500 Zeichen):');
      console.log('    ┌───────────────────────────────────────────────────────────');
      const preview = content.substring(0, 500).split('\n').map(line => '    │ ' + line).join('\n');
      console.log(preview);
      if (content.length > 500) {
        console.log('    │ ...');
      }
      console.log('    └───────────────────────────────────────────────────────────');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
  }

  process.exit(0);
}

debugTranslation();

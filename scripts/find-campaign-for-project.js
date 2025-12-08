// scripts/find-campaign-for-project.js
// Findet Kampagne für ein Projekt und zeigt Content-Details

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findCampaign() {
  const projectId = process.argv[2] || 'fqduXyy9dWdnAn3F4JDP';

  console.log('🔍 Suche Kampagne für Projekt:', projectId);

  const snapshot = await db.collection('pr_campaigns')
    .where('projectId', '==', projectId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log('❌ Keine Kampagne gefunden');
    process.exit(1);
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 Kampagne gefunden');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   ID:', doc.id);
  console.log('   Titel:', data.title);
  console.log('   Status:', data.status);

  console.log('\n📝 CONTENT-FELDER:');
  console.log('───────────────────────────────────────────────────────────────');

  // contentHtml
  if (data.contentHtml) {
    console.log(`\n✅ contentHtml: ${data.contentHtml.length} Zeichen`);
    console.log('   Erste 400 Zeichen:');
    console.log('   ' + data.contentHtml.substring(0, 400).replace(/\n/g, '\n   '));
  } else {
    console.log('\n❌ contentHtml: NICHT VORHANDEN');
  }

  // mainContent
  if (data.mainContent) {
    console.log(`\n✅ mainContent: ${data.mainContent.length} Zeichen`);
    console.log('   Erste 400 Zeichen:');
    console.log('   ' + data.mainContent.substring(0, 400).replace(/\n/g, '\n   '));
  } else {
    console.log('\n❌ mainContent: NICHT VORHANDEN');
  }

  // sections
  if (data.sections && data.sections.length > 0) {
    console.log(`\n✅ sections: ${data.sections.length} Einträge`);
    let totalSectionContent = 0;
    data.sections.forEach((s, i) => {
      const len = (s.content || s.contentHtml || '').length;
      totalSectionContent += len;
      console.log(`   [${i}] ${s.type || 'unknown'}: ${len} Zeichen`);
    });
    console.log(`   GESAMT: ${totalSectionContent} Zeichen in sections`);
  } else {
    console.log('\n❌ sections: NICHT VORHANDEN');
  }

  // boilerplateSections
  if (data.boilerplateSections && data.boilerplateSections.length > 0) {
    console.log(`\n✅ boilerplateSections: ${data.boilerplateSections.length} Einträge`);
    let totalBpContent = 0;
    data.boilerplateSections.forEach((bp, i) => {
      const len = (bp.content || '').length;
      totalBpContent += len;
      console.log(`   [${i}] ${bp.customTitle || bp.type || 'boilerplate'}: ${len} Zeichen`);
    });
    console.log(`   GESAMT: ${totalBpContent} Zeichen in boilerplateSections`);
  } else {
    console.log('\n❌ boilerplateSections: NICHT VORHANDEN');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 FAZIT:');

  const hasContent = data.contentHtml || data.mainContent;
  if (hasContent) {
    console.log('✅ contentHtml/mainContent ist vorhanden');
    console.log('   → Dieser Content wird für die Übersetzung verwendet');
  } else {
    console.log('⚠️  contentHtml/mainContent fehlt!');
    console.log('   → Die Übersetzung bekommt keinen Content!');
    if (data.sections?.length > 0 || data.boilerplateSections?.length > 0) {
      console.log('   → Content ist in sections/boilerplateSections, muss zusammengebaut werden');
    }
  }

  process.exit(0);
}

findCampaign().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});

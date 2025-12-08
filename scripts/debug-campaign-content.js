// scripts/debug-campaign-content.js
// Debug-Script um den Content einer Kampagne in Firestore zu prüfen
//
// USAGE: node scripts/debug-campaign-content.js <campaignId>

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

async function debugCampaign() {
  const campaignId = process.argv[2];

  if (!campaignId) {
    console.log('Usage: node scripts/debug-campaign-content.js <campaignId>');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 Campaign Content Debug');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const campaignDoc = await db.collection('pr_campaigns').doc(campaignId).get();

    if (!campaignDoc.exists) {
      console.log('❌ Kampagne nicht gefunden:', campaignId);
      return;
    }

    const data = campaignDoc.data();
    console.log('📋 Kampagne gefunden:', campaignId);
    console.log('   Titel:', data.title);
    console.log('   Status:', data.status);
    console.log('');

    // Content-Felder prüfen
    console.log('📝 CONTENT-FELDER:');
    console.log('───────────────────────────────────────────────────────────────');

    console.log('\n1. contentHtml:');
    if (data.contentHtml) {
      console.log(`   Länge: ${data.contentHtml.length} Zeichen`);
      console.log(`   Erste 300 Zeichen:\n   ${data.contentHtml.substring(0, 300)}...`);
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    console.log('\n2. mainContent:');
    if (data.mainContent) {
      console.log(`   Länge: ${data.mainContent.length} Zeichen`);
      console.log(`   Erste 300 Zeichen:\n   ${data.mainContent.substring(0, 300)}...`);
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    console.log('\n3. content:');
    if (data.content) {
      console.log(`   Länge: ${data.content.length} Zeichen`);
      console.log(`   Erste 300 Zeichen:\n   ${data.content.substring(0, 300)}...`);
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    console.log('\n4. sections:');
    if (data.sections && data.sections.length > 0) {
      console.log(`   Anzahl: ${data.sections.length} Sections`);
      data.sections.forEach((section, i) => {
        console.log(`\n   [${i}] Type: ${section.type || 'unknown'}`);
        console.log(`       ID: ${section.id || 'N/A'}`);
        if (section.content) {
          console.log(`       Content-Länge: ${section.content.length} Zeichen`);
          console.log(`       Content (erste 200):\n       ${section.content.substring(0, 200)}...`);
        }
        if (section.contentHtml) {
          console.log(`       ContentHtml-Länge: ${section.contentHtml.length} Zeichen`);
        }
      });
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    console.log('\n5. boilerplateSections:');
    if (data.boilerplateSections && data.boilerplateSections.length > 0) {
      console.log(`   Anzahl: ${data.boilerplateSections.length} Boilerplates`);
      data.boilerplateSections.forEach((bp, i) => {
        console.log(`\n   [${i}] Type: ${bp.type || 'boilerplate'}`);
        console.log(`       CustomTitle: ${bp.customTitle || 'N/A'}`);
        if (bp.content) {
          console.log(`       Content-Länge: ${bp.content.length} Zeichen`);
        }
      });
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // Alle Felder auflisten
    console.log('\n\n📊 ALLE FELDER DER KAMPAGNE:');
    console.log('───────────────────────────────────────────────────────────────');
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (typeof value === 'string') {
        console.log(`   ${key}: ${value.length > 50 ? value.substring(0, 50) + '...' : value}`);
      } else if (Array.isArray(value)) {
        console.log(`   ${key}: [Array mit ${value.length} Elementen]`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`   ${key}: [Object]`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
  }

  process.exit(0);
}

debugCampaign();

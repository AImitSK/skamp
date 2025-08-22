// Script zum Reparieren von falschen Timestamp-Objekten in PDF-Versionen
// Problem: createdAt wurde als Timestamp.now() (JavaScript Date) statt serverTimestamp() gespeichert

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin SDK initialisiert');
  } catch (error) {
    console.error('❌ Fehler beim Laden des Service Account:', error.message);
    console.log('⚠️ Fallback: Verwende Umgebungsvariablen für Authentication');
    
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'skamp-prod'
    });
  }
}

const db = admin.firestore();

async function fixPDFVersionTimestamps() {
  console.log('🔧 === PDF-Version Timestamp Reparatur gestartet ===');
  console.log(`📅 Script gestartet am: ${new Date().toISOString()}\n`);
  
  let processedCount = 0;
  let fixedCount = 0;
  let errorCount = 0;
  
  try {
    // Hole alle PDF-Versionen
    console.log('📄 Lade alle PDF-Versionen...');
    const pdfVersionsRef = db.collection('pdf_versions');
    const snapshot = await pdfVersionsRef.get();
    
    console.log(`📊 Gefunden: ${snapshot.size} PDF-Versionen zum Prüfen\n`);
    
    // Batch-Processing für bessere Performance
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;
    
    for (const doc of snapshot.docs) {
      processedCount++;
      const data = doc.data();
      
      console.log(`\n🔍 [${processedCount}/${snapshot.size}] Prüfe PDF-Version: ${doc.id}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   CampaignId: ${data.campaignId}`);
      
      // Debug: Analysiere createdAt Feld
      if (data.createdAt) {
        console.log(`   CreatedAt Type: ${typeof data.createdAt}`);
        console.log(`   CreatedAt Value: ${JSON.stringify(data.createdAt)}`);
        
        // Prüfe ob es ein falsches Timestamp-Objekt ist (hat seconds/nanoseconds statt _seconds/_nanoseconds)
        const isInvalidTimestamp = (
          typeof data.createdAt === 'object' &&
          data.createdAt !== null &&
          typeof data.createdAt.seconds === 'number' &&
          typeof data.createdAt.nanoseconds === 'number' &&
          !data.createdAt._seconds // Firebase Timestamp hat _seconds, unser falsches Objekt hat seconds
        );
        
        if (isInvalidTimestamp) {
          console.log(`   🚨 FEHLERHAFTER TIMESTAMP GEFUNDEN!`);
          console.log(`      Struktur: {seconds: ${data.createdAt.seconds}, nanoseconds: ${data.createdAt.nanoseconds}}`);
          
          // Konvertiere zu korrektem Firebase Timestamp
          const correctTimestamp = admin.firestore.Timestamp.fromMillis(
            data.createdAt.seconds * 1000 + Math.floor(data.createdAt.nanoseconds / 1000000)
          );
          
          console.log(`   ✅ Korrigiert zu: ${correctTimestamp.toDate().toISOString()}`);
          
          // Füge zur Batch hinzu
          batch.update(doc.ref, { createdAt: correctTimestamp });
          batchCount++;
          fixedCount++;
          
          // Commit Batch wenn voll
          if (batchCount >= BATCH_SIZE) {
            console.log(`\n💾 Committe Batch mit ${batchCount} Updates...`);
            await batch.commit();
            console.log(`✅ Batch committed`);
            batchCount = 0;
          }
        } else {
          console.log(`   ✅ Timestamp ist korrekt (Firebase Timestamp Format)`);
        }
      } else {
        console.log(`   ⚠️ Kein createdAt Feld gefunden`);
      }
      
      // Progress Update
      if (processedCount % 10 === 0) {
        console.log(`\n📊 FORTSCHRITT: ${processedCount}/${snapshot.size} bearbeitet, ${fixedCount} repariert`);
      }
    }
    
    // Commit verbleibende Updates
    if (batchCount > 0) {
      console.log(`\n💾 Committe finale Batch mit ${batchCount} Updates...`);
      await batch.commit();
      console.log(`✅ Finale Batch committed`);
    }
    
    console.log('\n🎉 === PDF-Version Timestamp Reparatur abgeschlossen ===');
    console.log(`📊 STATISTIKEN:`);
    console.log(`   • Geprüft: ${processedCount} PDF-Versionen`);
    console.log(`   • Repariert: ${fixedCount} fehlerhafte Timestamps`);
    console.log(`   • Fehler: ${errorCount} Dokumente mit Problemen`);
    console.log(`   • Script beendet am: ${new Date().toISOString()}`);
    
    if (fixedCount === 0) {
      console.log(`✨ Alle Timestamps waren bereits korrekt!`);
    }
    
  } catch (error) {
    errorCount++;
    console.error('\n❌ === KRITISCHER FEHLER ===');
    console.error(`Fehler: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.log('\n📊 TEIL-STATISTIKEN:');
    console.log(`   • Geprüft: ${processedCount} PDF-Versionen`);
    console.log(`   • Repariert: ${fixedCount} fehlerhafte Timestamps`);
    console.log(`   • Fehler aufgetreten bei: ${error}`);
    
    throw error;
  }
}

// Script ausführen
if (require.main === module) {
  fixPDFVersionTimestamps()
    .then(() => {
      console.log('\n✅ Script erfolgreich beendet');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script mit Fehler beendet:', error);
      process.exit(1);
    });
}

module.exports = { fixPDFVersionTimestamps };
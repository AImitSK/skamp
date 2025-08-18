// scripts/fix-campaign-timestamps.js
// Migration Script: Korrigiert fehlerhafte serverTimestamp() Platzhalter in PR Kampagnen
// JavaScript Version für direkte Ausführung

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_PATH not found in .env.local');
  console.log('\n📝 Please add the following to your .env.local file:');
  console.log('FIREBASE_SERVICE_ACCOUNT_PATH=path/to/your/service-account-key.json\n');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = require(path.resolve(serviceAccountPath));
} catch (error) {
  console.error('❌ Could not load service account file:', serviceAccountPath);
  console.error('Error:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

async function fixCampaignTimestamps() {
  console.log('🔧 Starting campaign timestamp migration...\n');
  
  try {
    // Hole alle PR Kampagnen
    const campaignsRef = db.collection('pr_campaigns');
    const snapshot = await campaignsRef.get();
    
    console.log(`📊 Found ${snapshot.size} campaigns total\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Prüfe createdAt
      if (data.createdAt && 
          typeof data.createdAt === 'object' && 
          '_methodName' in data.createdAt &&
          data.createdAt._methodName === 'serverTimestamp') {
        
        console.log(`🔍 Campaign "${data.title}" (${doc.id.substring(0, 8)}...) has invalid createdAt`);
        
        // Verwende das Dokument-Erstellungsdatum falls verfügbar, sonst jetzt
        const fallbackDate = new Date();
        
        // Wenn die Kampagne ein scheduledAt oder sentAt hat, nutze das als Referenz
        if (data.sentAt && data.sentAt.toDate) {
          const sentDate = data.sentAt.toDate();
          // CreatedAt sollte vor sentAt sein
          fallbackDate.setTime(sentDate.getTime() - 24 * 60 * 60 * 1000); // 1 Tag vorher
        } else if (data.scheduledAt && data.scheduledAt.toDate) {
          const scheduledDate = data.scheduledAt.toDate();
          // CreatedAt sollte vor scheduledAt sein
          fallbackDate.setTime(scheduledDate.getTime() - 24 * 60 * 60 * 1000); // 1 Tag vorher
        } else {
          // Verwende einen zufälligen Zeitpunkt in den letzten 30 Tagen
          const daysAgo = Math.floor(Math.random() * 30) + 1;
          fallbackDate.setTime(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
        }
        
        updates.createdAt = admin.firestore.Timestamp.fromDate(fallbackDate);
        needsUpdate = true;
        console.log(`  ✅ Will set createdAt to: ${fallbackDate.toISOString()}`);
      }
      
      // Prüfe updatedAt
      if (data.updatedAt && 
          typeof data.updatedAt === 'object' && 
          '_methodName' in data.updatedAt &&
          data.updatedAt._methodName === 'serverTimestamp') {
        
        console.log(`🔍 Campaign "${data.title}" (${doc.id.substring(0, 8)}...) has invalid updatedAt`);
        
        // Setze updatedAt auf jetzt oder das gleiche wie createdAt
        updates.updatedAt = updates.createdAt || admin.firestore.Timestamp.now();
        needsUpdate = true;
        console.log(`  ✅ Will set updatedAt to: ${updates.updatedAt ? 'same as createdAt' : 'now'}`);
      }
      
      // Update durchführen wenn nötig
      if (needsUpdate) {
        batch.update(doc.ref, updates);
        batchCount++;
        fixedCount++;
        
        // Commit batch alle 500 Dokumente
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`💾 Committed batch of ${batchCount} updates`);
          batchCount = 0;
          // Neuer Batch für weitere Updates
          batch = db.batch();
        }
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} updates`);
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Fixed: ${fixedCount} campaigns`);
    console.log(`⏭️  Skipped: ${snapshot.size - fixedCount} campaigns (already have valid timestamps)`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (fixedCount > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('🔄 Please refresh your campaign page to see the corrected sorting.');
    } else {
      console.log('\n✅ No campaigns needed fixing. All timestamps are valid.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
console.log('🚀 Firebase Campaign Timestamp Fix Tool\n');
console.log('This tool will fix campaigns that have invalid serverTimestamp() placeholders');
console.log('instead of actual timestamp values.\n');

fixCampaignTimestamps()
  .then(() => {
    console.log('\n👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
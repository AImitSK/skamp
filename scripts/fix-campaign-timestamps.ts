// scripts/fix-campaign-timestamps.ts
// Migration Script: Korrigiert fehlerhafte serverTimestamp() Platzhalter in PR Kampagnen

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_PATH not found in .env.local');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();

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
      const updates: any = {};
      let needsUpdate = false;
      
      // Prüfe createdAt
      if (data.createdAt && 
          typeof data.createdAt === 'object' && 
          '_methodName' in data.createdAt &&
          data.createdAt._methodName === 'serverTimestamp') {
        
        console.log(`🔍 Campaign "${data.title}" (${doc.id}) has invalid createdAt`);
        
        // Verwende das Dokument-Erstellungsdatum falls verfügbar, sonst jetzt
        // Versuche aus der ID einen Timestamp zu generieren (Nanoid basiert)
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
        }
        
        updates.createdAt = Timestamp.fromDate(fallbackDate);
        needsUpdate = true;
        console.log(`  ✅ Will set createdAt to: ${fallbackDate.toISOString()}`);
      }
      
      // Prüfe updatedAt
      if (data.updatedAt && 
          typeof data.updatedAt === 'object' && 
          '_methodName' in data.updatedAt &&
          data.updatedAt._methodName === 'serverTimestamp') {
        
        console.log(`🔍 Campaign "${data.title}" (${doc.id}) has invalid updatedAt`);
        
        // Setze updatedAt auf jetzt oder das gleiche wie createdAt
        updates.updatedAt = updates.createdAt || Timestamp.now();
        needsUpdate = true;
        console.log(`  ✅ Will set updatedAt to: now`);
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
    
    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixCampaignTimestamps()
  .then(() => {
    console.log('\n👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
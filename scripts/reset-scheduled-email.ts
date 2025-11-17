/**
 * Script: Reset Scheduled Email
 * Loescht alte scheduled_emails und setzt Campaign-Status zurueck
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local laden
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Firebase Admin initialisieren
const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
if (!serviceAccount) {
  throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable not set');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function resetScheduledEmail(campaignId: string) {
  try {
    console.log('🔄 Starte Reset...\n');

    // 1. Finde alle scheduled_emails fuer diese Campaign
    const scheduledEmailsSnapshot = await db
      .collection('scheduled_emails')
      .where('campaignId', '==', campaignId)
      .get();

    if (!scheduledEmailsSnapshot.empty) {
      console.log(`📧 Gefunden: ${scheduledEmailsSnapshot.size} geplante Email(s)`);

      for (const doc of scheduledEmailsSnapshot.docs) {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`   - Status: ${data.status}`);
        console.log(`   - SendAt: ${data.sendAt?.toDate()?.toLocaleString('de-DE')}`);

        // Loeschen
        await doc.ref.delete();
        console.log(`   ✅ Geloescht\n`);
      }
    } else {
      console.log('📧 Keine geplanten Emails gefunden\n');
    }

    // 2. Campaign-Status zuruecksetzen
    const campaignRef = db.collection('pr_campaigns').doc(campaignId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists) {
      console.log('❌ Campaign nicht gefunden!');
      return;
    }

    const campaign = campaignSnap.data();
    console.log(`📋 Campaign: ${campaign?.title}`);
    console.log(`   - Aktueller Status: ${campaign?.status}`);

    if (campaign?.status === 'scheduled') {
      // Zurueck zu "approved" (oder draft wenn nie approved war)
      const newStatus = campaign?.pipelineStage ? 'approved' : 'draft';

      await campaignRef.update({
        status: newStatus,
        scheduledAt: FieldValue.delete(),
        scheduledEmailId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`   ✅ Status geaendert: scheduled → ${newStatus}`);
      console.log(`   ✅ scheduledAt und scheduledEmailId entfernt\n`);
    } else {
      console.log(`   ℹ️  Status ist bereits "${campaign?.status}" - kein Update noetig\n`);
    }

    console.log('✨ Reset erfolgreich abgeschlossen!');
    console.log('\n💡 Du kannst die Email jetzt neu planen.');

  } catch (error) {
    console.error('❌ Fehler beim Reset:', error);
    throw error;
  }
}

// Aus Command-Line Argument oder hardcoded
const campaignId = process.argv[2] || 'P8ced1fJQKhK9WLteS2x';

console.log('🚀 Reset Scheduled Email Script');
console.log('================================\n');
console.log(`Campaign ID: ${campaignId}\n`);

resetScheduledEmail(campaignId)
  .then(() => {
    console.log('\n✅ Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

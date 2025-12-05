/**
 * Debug-Script: Prüft warum Monitoring für eine Kampagne nicht erstellt wurde
 *
 * Usage: npx tsx scripts/debug-campaign-monitoring.ts <campaignId>
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin initialisieren
if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountKey) {
    console.error('❌ FIREBASE_ADMIN_SERVICE_ACCOUNT nicht gefunden in .env.local');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

const db = getFirestore();

async function debugCampaignMonitoring(id: string) {
  console.log('\n========================================');
  console.log('🔍 DEBUG: Campaign/Project Monitoring Check');
  console.log('========================================\n');
  console.log(`ID: ${id}\n`);

  // Prüfe erst ob es ein Projekt ist
  const projectDoc = await db.collection('projects').doc(id).get();

  if (projectDoc.exists) {
    console.log('📂 Das ist eine PROJEKT-ID!\n');
    const project = projectDoc.data();
    console.log(`   - Name: ${project?.name}`);
    console.log(`   - Status: ${project?.status}`);
    console.log(`   - OrganizationId: ${project?.organizationId}`);

    // Suche nach Kampagnen für dieses Projekt
    console.log('\n🔍 Suche Kampagnen für dieses Projekt...');
    const campaignsSnapshot = await db.collection('pr_campaigns')
      .where('projectId', '==', id)
      .get();

    if (campaignsSnapshot.empty) {
      console.log('   ❌ Keine Kampagnen für dieses Projekt gefunden!');
      return;
    }

    console.log(`   ✅ ${campaignsSnapshot.size} Kampagne(n) gefunden:\n`);

    for (const doc of campaignsSnapshot.docs) {
      console.log(`\n--- Kampagne: ${doc.id} ---`);
      await debugSingleCampaign(doc.id, doc.data());
    }
    return;
  }

  // 1. Lade Kampagne
  const campaignDoc = await db.collection('pr_campaigns').doc(id).get();

  if (!campaignDoc.exists) {
    console.log('❌ Weder Projekt noch Kampagne mit dieser ID gefunden!');
    return;
  }

  await debugSingleCampaign(campaignDoc.id, campaignDoc.data());
}

async function debugSingleCampaign(campaignId: string, campaign: any) {
  console.log('📋 Kampagne gefunden:');
  console.log(`   - Title: ${campaign?.title || campaign?.subject}`);
  console.log(`   - Status: ${campaign?.status}`);
  console.log(`   - ProjectId: ${campaign?.projectId || 'NICHT GESETZT'}`);
  console.log(`   - OrganizationId: ${campaign?.organizationId}`);
  console.log(`   - MonitoringConfig: ${JSON.stringify(campaign?.monitoringConfig, null, 2)}`);

  // 2. Prüfe Bedingungen für Monitoring
  console.log('\n📊 Monitoring-Bedingungen:');
  const hasProjectId = !!campaign?.projectId;
  const hasMonitoringEnabled = campaign?.monitoringConfig?.isEnabled === true;
  const shouldCreateTracker = hasProjectId || hasMonitoringEnabled;

  console.log(`   - Hat projectId: ${hasProjectId ? '✅ JA' : '❌ NEIN'}`);
  console.log(`   - MonitoringConfig.isEnabled: ${hasMonitoringEnabled ? '✅ JA' : '❌ NEIN'}`);
  console.log(`   - Sollte Tracker erstellen: ${shouldCreateTracker ? '✅ JA' : '❌ NEIN'}`);

  // 3. Suche nach existierendem Tracker
  const trackerSnapshot = await db.collection('campaign_monitoring_trackers')
    .where('campaignId', '==', campaignId)
    .get();

  console.log('\n🔍 Existierender Tracker:');
  if (trackerSnapshot.empty) {
    console.log('   ❌ Kein Tracker gefunden!');
  } else {
    trackerSnapshot.docs.forEach(doc => {
      const tracker = doc.data();
      console.log(`   ✅ Tracker gefunden: ${doc.id}`);
      console.log(`      - isActive: ${tracker.isActive}`);
      console.log(`      - startDate: ${tracker.startDate?.toDate?.()}`);
      console.log(`      - endDate: ${tracker.endDate?.toDate?.()}`);
      console.log(`      - Channels: ${tracker.channels?.length || 0}`);
    });
  }

  // 4. Suche nach Email-Sends für diese Kampagne
  const sendsSnapshot = await db.collection('email_campaign_sends')
    .where('campaignId', '==', campaignId)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  console.log('\n📧 Email-Sends:');
  if (sendsSnapshot.empty) {
    console.log('   ❌ Keine Sends gefunden!');
  } else {
    sendsSnapshot.docs.forEach(doc => {
      const send = doc.data();
      console.log(`   - ${doc.id}: Status=${send.status}, SentAt=${send.sentAt?.toDate?.()}`);
    });
  }

  // 5. Suche nach Scheduled Emails
  const scheduledSnapshot = await db.collection('scheduled_emails')
    .where('campaignId', '==', campaignId)
    .get();

  console.log('\n⏰ Scheduled Emails:');
  if (scheduledSnapshot.empty) {
    console.log('   Keine geplanten Emails gefunden');
  } else {
    scheduledSnapshot.docs.forEach(doc => {
      const scheduled = doc.data();
      console.log(`   - ${doc.id}: Status=${scheduled.status}, SendAt=${scheduled.sendAt?.toDate?.()}`);
    });
  }

  // 6. Zusammenfassung
  console.log('\n========================================');
  console.log('📝 DIAGNOSE:');
  console.log('========================================');

  if (!shouldCreateTracker) {
    console.log('❌ Problem: Kampagne hat weder projectId noch monitoringConfig.isEnabled');
    console.log('   → Lösung: Kampagne muss mit einem Projekt verknüpft sein');
  } else if (trackerSnapshot.empty) {
    console.log('⚠️ Problem: Tracker sollte erstellt worden sein, aber fehlt');
    console.log('   → Mögliche Ursachen:');
    console.log('      1. E-Mail wurde noch nicht versendet');
    console.log('      2. Fehler beim Tracker-Erstellen (siehe Vercel Logs)');
    console.log('      3. E-Mail ist geplant aber noch nicht gesendet');
  } else {
    console.log('✅ Alles in Ordnung - Tracker existiert');
  }

  console.log('\n');
}

// Main
const campaignId = process.argv[2];

if (!campaignId) {
  console.error('❌ Bitte Campaign-ID angeben!');
  console.error('Usage: npx tsx scripts/debug-campaign-monitoring.ts <campaignId>');
  process.exit(1);
}

debugCampaignMonitoring(campaignId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fehler:', error);
    process.exit(1);
  });

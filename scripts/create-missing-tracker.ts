/**
 * Script: Erstellt fehlenden Monitoring-Tracker für eine Kampagne
 *
 * Usage: npx tsx scripts/create-missing-tracker.ts <campaignId>
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Firebase Admin initialisieren
if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountKey) {
    console.error('❌ FIREBASE_ADMIN_SERVICE_ACCOUNT nicht gefunden');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(serviceAccountKey);
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

const db = getFirestore();

async function createMissingTracker(campaignId: string) {
  console.log(`\n🔧 Erstelle Tracker für Kampagne: ${campaignId}\n`);

  // 1. Kampagne laden
  const campaignDoc = await db.collection('pr_campaigns').doc(campaignId).get();
  if (!campaignDoc.exists) {
    console.error('❌ Kampagne nicht gefunden!');
    process.exit(1);
  }

  const campaign = campaignDoc.data()!;
  console.log(`📋 Kampagne: ${campaign.title || campaign.subject}`);

  // 2. Prüfen ob Tracker bereits existiert
  const existingTracker = await db.collection('campaign_monitoring_trackers')
    .where('campaignId', '==', campaignId)
    .get();

  if (!existingTracker.empty) {
    console.log('⚠️ Tracker existiert bereits!');
    existingTracker.docs.forEach(doc => {
      console.log(`   - ${doc.id} (isActive: ${doc.data().isActive})`);
    });
    return;
  }

  // 3. Config extrahieren
  const monitoringConfig = campaign.monitoringConfig || {
    isEnabled: true,
    monitoringPeriod: 30,
    keywords: [],
    sources: { googleNews: true, rssFeeds: [] },
    minMatchScore: 70
  };

  // 4. End-Datum berechnen (30 Tage ab jetzt)
  const startDate = Timestamp.now();
  const endMs = startDate.toMillis() + (monitoringConfig.monitoringPeriod * 24 * 60 * 60 * 1000);
  const endDate = Timestamp.fromMillis(endMs);

  // 5. Google News Channel erstellen
  const companyName = campaign.customer?.name || campaign.title || 'Unknown';
  const keywords = monitoringConfig.keywords?.length > 0
    ? monitoringConfig.keywords
    : [companyName];

  const channels = [{
    id: `google-news-${campaignId}`,
    type: 'google_news',
    name: `Google News: ${companyName}`,
    url: `https://news.google.com/search?q=${encodeURIComponent(keywords.join(' OR '))}`,
    keywords,
    isActive: true,
    lastCheckedAt: null,
    articlesFound: 0,
    createdAt: FieldValue.serverTimestamp()
  }];

  // 6. Tracker erstellen
  const trackerData = {
    organizationId: campaign.organizationId,
    campaignId,
    startDate,
    endDate,
    isActive: true,
    channels,
    totalArticlesFound: 0,
    totalAutoConfirmed: 0,
    totalManuallyAdded: 0,
    totalSpamMarked: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('campaign_monitoring_trackers').add(trackerData);

  console.log(`\n✅ Tracker erstellt: ${docRef.id}`);
  console.log(`   - Endet am: ${endDate.toDate().toLocaleDateString('de-DE')}`);
  console.log(`   - Keywords: ${keywords.join(', ')}`);
  console.log(`   - Channels: ${channels.length}`);
}

// Main
const campaignId = process.argv[2];

if (!campaignId) {
  console.error('❌ Bitte Campaign-ID angeben!');
  console.error('Usage: npx tsx scripts/create-missing-tracker.ts <campaignId>');
  process.exit(1);
}

createMissingTracker(campaignId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fehler:', error);
    process.exit(1);
  });

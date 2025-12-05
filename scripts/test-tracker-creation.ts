/**
 * Test-Script: Versucht Tracker manuell zu erstellen um den Fehler zu finden
 *
 * Usage: npx tsx scripts/test-tracker-creation.ts <campaignId>
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

async function testTrackerCreation(campaignId: string) {
  console.log('\n========================================');
  console.log('🧪 TEST: Tracker-Erstellung simulieren');
  console.log('========================================\n');

  try {
    // 1. Lade Kampagne
    console.log('1️⃣ Lade Kampagne...');
    const campaignDoc = await db.collection('pr_campaigns').doc(campaignId).get();
    if (!campaignDoc.exists) {
      throw new Error('Campaign not found');
    }
    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as any;
    console.log(`   ✅ ${campaign.title}`);

    // 2. Prüfe Bedingungen
    console.log('\n2️⃣ Prüfe Bedingungen...');
    if (!campaign.monitoringConfig?.isEnabled && !campaign.projectId) {
      throw new Error('Monitoring not enabled for campaign');
    }
    console.log('   ✅ Bedingungen erfüllt');

    // 3. Fallback-Config
    const monitoringConfig = campaign.monitoringConfig || {
      isEnabled: true,
      monitoringPeriod: 30,
      keywords: [],
      sources: { googleNews: true, rssFeeds: [] },
      minMatchScore: 70
    };

    // 4. Berechne Daten
    console.log('\n3️⃣ Berechne Start/End-Datum...');
    const startDate = Timestamp.now();
    const endMs = startDate.toMillis() + (monitoringConfig.monitoringPeriod * 24 * 60 * 60 * 1000);
    const endDate = Timestamp.fromMillis(endMs);
    console.log(`   ✅ Start: ${startDate.toDate().toLocaleDateString('de-DE')}`);
    console.log(`   ✅ Ende: ${endDate.toDate().toLocaleDateString('de-DE')}`);

    // 5. Build Google News Channel
    console.log('\n4️⃣ Baue Google News Channel...');
    let keywords = monitoringConfig.keywords || [];

    if (keywords.length === 0 && campaign.clientId) {
      console.log(`   - Lade Company ${campaign.clientId}...`);

      // Suche in companies_enhanced
      let companyDoc = await db.collection('companies_enhanced').doc(campaign.clientId).get();

      if (!companyDoc.exists) {
        console.log('   - Fallback: companies Collection...');
        companyDoc = await db.collection('companies').doc(campaign.clientId).get();
      }

      if (!companyDoc.exists) {
        console.log('   ❌ Company nicht gefunden!');
      } else {
        const company = companyDoc.data()!;
        console.log(`   ✅ Company: ${company.name}`);

        if (company.organizationId !== campaign.organizationId) {
          console.log(`   ❌ OrganizationId mismatch!`);
        } else {
          // Extrahiere Keywords
          keywords = extractKeywords(company);
          console.log(`   ✅ Keywords: ${keywords.join(', ')}`);
        }
      }
    }

    if (keywords.length === 0) {
      console.log('   ❌ KEINE KEYWORDS - Google News Channel kann nicht erstellt werden!');
      console.log('\n⚠️ Das ist das Problem! Der Service gibt null zurück und erstellt keinen Channel.');
      console.log('   Ohne Channel wird der Tracker trotzdem erstellt aber ohne Google News.');
    }

    // 6. Erstelle Channel
    const channels: any[] = [];

    if (keywords.length > 0) {
      const query = keywords.join(' OR ');
      const encodedQuery = encodeURIComponent(query);
      const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=de&gl=DE&ceid=DE:de`;

      // WICHTIG: Keine undefined-Werte für Firestore!
      // publicationId wird weggelassen da Google News nicht publication-spezifisch ist
      channels.push({
        id: `google_news_${campaign.id}`,
        type: 'google_news',
        publicationName: 'Google News',
        url: googleNewsUrl,
        isActive: true,
        wasFound: false,
        articlesFound: 0,
        errorCount: 0
      });
      console.log(`   ✅ Google News Channel erstellt`);
    }

    // 7. Erstelle Tracker (DRY RUN)
    console.log('\n5️⃣ Erstelle Tracker-Daten...');
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

    console.log('   Tracker-Daten:', JSON.stringify({
      ...trackerData,
      startDate: startDate.toDate().toISOString(),
      endDate: endDate.toDate().toISOString(),
      createdAt: 'serverTimestamp()',
      updatedAt: 'serverTimestamp()'
    }, null, 2));

    // 8. Speichere in Firestore
    console.log('\n6️⃣ Speichere Tracker in Firestore...');
    const docRef = await db.collection('campaign_monitoring_trackers').add(trackerData);
    console.log(`   ✅ TRACKER ERSTELLT: ${docRef.id}`);

    console.log('\n========================================');
    console.log('✅ TEST ERFOLGREICH - Tracker wurde erstellt!');
    console.log(`   Tracker ID: ${docRef.id}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    console.error('\nDas ist der Fehler, der auch in der API Route aufgetreten ist!');
  }
}

function extractKeywords(company: any): string[] {
  const keywords: string[] = [];
  const legalForms = [
    'GmbH', 'AG', 'KG', 'OHG', 'GbR', 'UG', 'e.V.', 'eG',
    'Ltd.', 'Ltd', 'Inc.', 'Inc', 'LLC', 'Corp.', 'Corp',
    'SE', 'S.A.', 'S.L.', 'B.V.', 'N.V.', 'Pty', 'PLC'
  ];

  const removeLegalForm = (name: string): string => {
    let cleaned = name.trim();
    for (const form of legalForms) {
      const regex = new RegExp(`\\s*${form.replace('.', '\\.')}\\s*$`, 'i');
      cleaned = cleaned.replace(regex, '').trim();
    }
    return cleaned;
  };

  if (company.name) {
    keywords.push(company.name.trim());
    const withoutLegal = removeLegalForm(company.name);
    if (withoutLegal !== company.name.trim() && withoutLegal.length >= 2) {
      keywords.push(withoutLegal);
    }
  }

  if (company.officialName && company.officialName !== company.name) {
    keywords.push(company.officialName.trim());
  }

  if (company.tradingName && !keywords.includes(company.tradingName.trim())) {
    keywords.push(company.tradingName.trim());
  }

  return [...new Set(keywords)].filter(k => k.length >= 2);
}

// Main
const campaignId = process.argv[2];

if (!campaignId) {
  console.error('❌ Bitte Campaign-ID angeben!');
  console.error('Usage: npx tsx scripts/test-tracker-creation.ts <campaignId>');
  process.exit(1);
}

testTrackerCreation(campaignId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fehler:', error);
    process.exit(1);
  });

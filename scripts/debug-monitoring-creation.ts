/**
 * Debug-Script: Prüft warum Monitoring-Tracker nicht erstellt wurde
 *
 * Analysiert die gesamte Kette: Campaign → clientId → Company → Keywords → Tracker
 *
 * Usage: npx tsx scripts/debug-monitoring-creation.ts <campaignId>
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

async function debugMonitoringCreation(campaignId: string) {
  console.log('\n========================================');
  console.log('🔍 DEBUG: Monitoring Tracker Erstellung');
  console.log('========================================\n');

  // 1. Lade Kampagne
  console.log(`📋 Lade Kampagne: ${campaignId}`);
  const campaignDoc = await db.collection('pr_campaigns').doc(campaignId).get();

  if (!campaignDoc.exists) {
    console.error('❌ Kampagne nicht gefunden!');
    return;
  }

  const campaign = campaignDoc.data()!;
  console.log(`   ✅ Gefunden: ${campaign.title || campaign.subject}`);
  console.log(`   - organizationId: ${campaign.organizationId}`);
  console.log(`   - projectId: ${campaign.projectId || 'NICHT GESETZT'}`);
  console.log(`   - clientId: ${campaign.clientId || 'NICHT GESETZT ⚠️'}`);
  console.log(`   - status: ${campaign.status}`);
  console.log(`   - monitoringConfig:`, JSON.stringify(campaign.monitoringConfig, null, 2));

  // 2. Prüfe Bedingungen für Tracker-Erstellung
  console.log('\n📊 Bedingungen für Tracker-Erstellung:');
  const hasProjectId = !!campaign.projectId;
  const hasMonitoringEnabled = campaign.monitoringConfig?.isEnabled === true;
  const shouldCreateTracker = hasProjectId || hasMonitoringEnabled;

  console.log(`   - Hat projectId: ${hasProjectId ? '✅' : '❌'}`);
  console.log(`   - monitoringConfig.isEnabled: ${hasMonitoringEnabled ? '✅' : '❌'}`);
  console.log(`   - Sollte Tracker erstellen: ${shouldCreateTracker ? '✅ JA' : '❌ NEIN'}`);

  if (!shouldCreateTracker) {
    console.log('\n❌ STOPP: Keine der Bedingungen erfüllt!');
    return;
  }

  // 3. Prüfe Keywords-Quelle
  console.log('\n🔑 Keywords-Analyse:');
  const existingKeywords = campaign.monitoringConfig?.keywords || [];
  console.log(`   - Keywords in monitoringConfig: ${existingKeywords.length > 0 ? existingKeywords.join(', ') : 'KEINE'}`);

  if (existingKeywords.length === 0) {
    console.log('\n   → Müssen Keywords aus Company extrahiert werden...');

    if (!campaign.clientId) {
      console.log('   ❌ PROBLEM: Keine clientId → Keine Company → Keine Keywords!');
      console.log('   💡 LÖSUNG: clientId in Kampagne setzen oder Keywords manuell in monitoringConfig');
    } else {
      // 4. Lade Company
      console.log(`\n👤 Suche Company: ${campaign.clientId}`);

      // Primär: companies_enhanced
      let companyDoc = await db.collection('companies_enhanced').doc(campaign.clientId).get();
      console.log(`   - companies_enhanced: ${companyDoc.exists ? '✅ GEFUNDEN' : '❌ NICHT GEFUNDEN'}`);

      if (!companyDoc.exists) {
        // Fallback: companies
        companyDoc = await db.collection('companies').doc(campaign.clientId).get();
        console.log(`   - companies (Fallback): ${companyDoc.exists ? '✅ GEFUNDEN' : '❌ NICHT GEFUNDEN'}`);
      }

      if (!companyDoc.exists) {
        console.log('\n   ❌ PROBLEM: Company existiert nicht in der Datenbank!');
        console.log(`   💡 LÖSUNG: Company mit ID ${campaign.clientId} erstellen`);
      } else {
        const company = companyDoc.data()!;
        console.log(`\n   ✅ Company gefunden: ${company.name}`);
        console.log(`   - organizationId: ${company.organizationId}`);
        console.log(`   - officialName: ${company.officialName || 'nicht gesetzt'}`);
        console.log(`   - tradingName: ${company.tradingName || 'nicht gesetzt'}`);

        // Prüfe organizationId Match
        if (company.organizationId !== campaign.organizationId) {
          console.log('\n   ❌ PROBLEM: organizationId stimmt nicht überein!');
          console.log(`      Campaign: ${campaign.organizationId}`);
          console.log(`      Company:  ${company.organizationId}`);
        } else {
          console.log('   ✅ organizationId stimmt überein');

          // Extrahiere Keywords
          const keywords = extractKeywordsFromCompany(company);
          console.log(`\n   📝 Extrahierte Keywords: ${keywords.length > 0 ? keywords.join(', ') : 'KEINE ⚠️'}`);

          if (keywords.length === 0) {
            console.log('   ❌ PROBLEM: Keine Keywords konnten extrahiert werden!');
            console.log('   💡 LÖSUNG: Company muss name, officialName oder tradingName haben');
          }
        }
      }
    }
  } else {
    console.log('   ✅ Keywords vorhanden - Company wird nicht benötigt');
  }

  // 5. Prüfe existierenden Tracker
  console.log('\n🔍 Prüfe existierenden Tracker:');
  const trackerSnapshot = await db.collection('campaign_monitoring_trackers')
    .where('campaignId', '==', campaignId)
    .get();

  if (trackerSnapshot.empty) {
    console.log('   ❌ Kein Tracker gefunden');
  } else {
    trackerSnapshot.docs.forEach(doc => {
      const tracker = doc.data();
      console.log(`   ✅ Tracker existiert: ${doc.id}`);
      console.log(`      - isActive: ${tracker.isActive}`);
      console.log(`      - channels: ${tracker.channels?.length || 0}`);
      tracker.channels?.forEach((ch: any) => {
        console.log(`        - ${ch.type}: ${ch.publicationName || ch.url?.substring(0, 50)}...`);
      });
    });
  }

  // 6. Zusammenfassung
  console.log('\n========================================');
  console.log('📝 ZUSAMMENFASSUNG');
  console.log('========================================');

  if (!shouldCreateTracker) {
    console.log('❌ Tracker sollte nicht erstellt werden (keine Bedingung erfüllt)');
  } else if (!trackerSnapshot.empty) {
    console.log('✅ Tracker existiert bereits - alles OK');
  } else {
    console.log('⚠️ Tracker SOLLTE erstellt werden, existiert aber NICHT');
    console.log('\nMögliche Ursachen:');

    if (existingKeywords.length === 0) {
      if (!campaign.clientId) {
        console.log('1. ❌ Keine clientId → Keine Company → Keine Keywords');
        console.log('   💡 Lösung: clientId in Kampagne setzen');
      } else {
        console.log('1. Prüfe Company-Daten (siehe oben)');
      }
    }

    console.log('2. Fehler beim Email-Versand (siehe Vercel Logs für den Zeitpunkt)');
    console.log('3. catch-Block in route.ts hat Fehler verschluckt');
  }

  console.log('\n');
}

function extractKeywordsFromCompany(company: any): string[] {
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
    const withoutLegal = removeLegalForm(company.officialName);
    if (withoutLegal !== company.officialName.trim() && !keywords.includes(withoutLegal) && withoutLegal.length >= 2) {
      keywords.push(withoutLegal);
    }
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
  console.error('Usage: npx tsx scripts/debug-monitoring-creation.ts <campaignId>');
  process.exit(1);
}

debugMonitoringCreation(campaignId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fehler:', error);
    process.exit(1);
  });

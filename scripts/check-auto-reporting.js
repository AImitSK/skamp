/**
 * Script zum Prüfen der Auto-Reporting Daten in Firestore
 *
 * Zeigt:
 * - Alle aktiven Auto-Reportings
 * - nextSendAt Datum
 * - Ob sie vom Cronjob erfasst würden
 */

// dotenv laden für .env.local
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Service Account aus Environment Variable
const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
if (!serviceAccount) {
  console.error('❌ FIREBASE_ADMIN_SERVICE_ACCOUNT nicht in .env.local gefunden');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function checkAutoReportings() {
  console.log('='.repeat(60));
  console.log('AUTO-REPORTING ANALYSE');
  console.log('='.repeat(60));

  const now = new Date();
  console.log(`\nAktuelle Zeit: ${now.toISOString()}`);
  console.log(`Aktuelle Zeit (DE): ${now.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);

  // Cronjob läuft um 7:00 UTC
  console.log(`\nCronjob Schedule: 0 7 * * * (täglich 7:00 UTC = 8:00/9:00 deutscher Zeit)`);

  // Alle Auto-Reportings laden
  const snapshot = await db.collection('auto_reportings').get();

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Gefundene Auto-Reportings: ${snapshot.size}`);
  console.log('─'.repeat(60));

  if (snapshot.empty) {
    console.log('\n❌ Keine Auto-Reportings gefunden!');
    console.log('   → Es gibt nichts zu versenden.');
    return;
  }

  const nowTimestamp = admin.firestore.Timestamp.now();
  let pendingCount = 0;
  let activeCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const isActive = data.isActive === true;
    const nextSendAt = data.nextSendAt?.toDate();
    const lastSentAt = data.lastSentAt?.toDate();
    const monitoringEndDate = data.monitoringEndDate?.toDate();

    if (isActive) activeCount++;

    const isPending = isActive && nextSendAt && nextSendAt <= now;
    if (isPending) pendingCount++;

    const isExpired = monitoringEndDate && monitoringEndDate < now;

    console.log(`\n📋 ${data.campaignName || 'Unbekannt'}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Aktiv: ${isActive ? '✅ Ja' : '❌ Nein'}`);
    console.log(`   Frequenz: ${data.frequency || 'nicht gesetzt'}`);
    console.log(`   Empfänger: ${data.recipients?.length || 0} Person(en)`);

    if (data.recipients?.length > 0) {
      data.recipients.forEach(r => {
        console.log(`      → ${r.name} <${r.email}>`);
      });
    }

    console.log(`   Next Send At: ${nextSendAt ? nextSendAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'NICHT GESETZT'}`);
    console.log(`   Last Sent At: ${lastSentAt ? lastSentAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'Noch nie'}`);
    console.log(`   Last Status: ${data.lastSendStatus || 'Noch nie gesendet'}`);
    console.log(`   Monitoring End: ${monitoringEndDate ? monitoringEndDate.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'NICHT GESETZT'}`);

    // Analyse
    console.log(`\n   📊 ANALYSE:`);

    if (!isActive) {
      console.log(`   ⚠️  Nicht aktiv → wird NICHT verarbeitet`);
    } else if (isExpired) {
      console.log(`   ⚠️  Monitoring abgelaufen → wird DEAKTIVIERT beim nächsten Cron-Run`);
    } else if (!nextSendAt) {
      console.log(`   ❌ nextSendAt nicht gesetzt → wird NICHT verarbeitet`);
    } else if (nextSendAt > now) {
      const diffMs = nextSendAt.getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        console.log(`   ⏳ Nächster Versand in ${diffDays} Tagen`);
      } else if (diffHours > 1) {
        console.log(`   ⏳ Nächster Versand in ${diffHours} Stunden`);
      } else {
        console.log(`   ⏳ Nächster Versand in weniger als 1 Stunde`);
      }
      console.log(`   → wird beim nächsten passenden Cron-Run nach ${nextSendAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} verarbeitet`);
    } else {
      console.log(`   ✅ FÄLLIG! nextSendAt liegt in der Vergangenheit`);
      console.log(`   → wird beim nächsten Cron-Run (7:00 UTC) verarbeitet`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('ZUSAMMENFASSUNG');
  console.log('='.repeat(60));
  console.log(`Gesamt: ${snapshot.size}`);
  console.log(`Aktiv: ${activeCount}`);
  console.log(`Fällig (werden beim nächsten Cron verarbeitet): ${pendingCount}`);

  if (pendingCount > 0) {
    console.log(`\n✅ Der nächste Cron-Run (7:00 UTC) wird ${pendingCount} Report(s) versenden.`);
  } else if (activeCount > 0) {
    console.log(`\n⏳ Es gibt aktive Reportings, aber noch keines ist fällig.`);
  } else {
    console.log(`\n❌ Keine aktiven Auto-Reportings vorhanden.`);
  }

  // Letzte Logs prüfen
  console.log(`\n${'─'.repeat(60)}`);
  console.log('LETZTE VERSAND-LOGS');
  console.log('─'.repeat(60));

  const logsSnapshot = await db.collection('auto_reporting_logs')
    .orderBy('sentAt', 'desc')
    .limit(5)
    .get();

  if (logsSnapshot.empty) {
    console.log('\nKeine Versand-Logs gefunden.');
  } else {
    for (const logDoc of logsSnapshot.docs) {
      const log = logDoc.data();
      const sentAt = log.sentAt?.toDate();
      console.log(`\n📧 ${sentAt ? sentAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'Unbekannt'}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Empfänger: ${log.recipients?.join(', ') || 'keine'}`);
      if (log.errorMessage) {
        console.log(`   ❌ Fehler: ${log.errorMessage}`);
      }
    }
  }
}

checkAutoReportings()
  .then(() => {
    console.log('\n✅ Analyse abgeschlossen');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fehler:', err);
    process.exit(1);
  });

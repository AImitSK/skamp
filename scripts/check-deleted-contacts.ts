// scripts/check-deleted-contacts.ts
// Da wir die Kontakte gelöscht haben, prüfen wir ob es gelöschte
// Kontakte gibt (soft delete) oder schauen im Audit-Log

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkDeletedContacts() {
  console.log('\n🔍 Prüfe auf Audit-Logs oder Aktivitäten...\n');

  const organizationId = 'hJ4gTE9Gm35epoub0zIU'; // GolfNext
  const colleagueUserId = 'BgKHilkfTBSVG13sqKfDwnl9Gxr2';

  // Prüfe activity_logs wenn vorhanden
  try {
    const activityLogs = await db.collection('activity_logs')
      .where('organizationId', '==', organizationId)
      .where('userId', '==', colleagueUserId)
      .where('action', '==', 'create')
      .where('entityType', '==', 'contact')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    if (activityLogs.size > 0) {
      console.log(`📋 ${activityLogs.size} Aktivitäten gefunden:\n`);
      for (const doc of activityLogs.docs) {
        const data = doc.data();
        const timestamp = data.timestamp?._seconds
          ? new Date(data.timestamp._seconds * 1000).toLocaleString('de-DE')
          : 'unbekannt';
        console.log(`  ${timestamp} - ${data.action} ${data.entityType}`);
        console.log(`  Entity ID: ${data.entityId}`);
        console.log('');
      }
    } else {
      console.log('Keine Aktivitäts-Logs gefunden.\n');
    }
  } catch (e) {
    console.log('Aktivitäts-Logs nicht verfügbar oder Fehler.\n');
  }

  // Prüfe alle Kontakte mit timestamps von heute
  console.log('='.repeat(60));
  console.log('\n📅 Kontakte erstellt am 26.11.2025:\n');

  const today = new Date('2025-11-26T00:00:00');
  const tomorrow = new Date('2025-11-27T00:00:00');

  const contacts = await db.collection('contacts_enhanced')
    .where('organizationId', '==', organizationId)
    .where('createdBy', '==', colleagueUserId)
    .get();

  console.log(`Gefunden: ${contacts.size} Kontakte von diesem User\n`);

  for (const doc of contacts.docs) {
    const data = doc.data();
    const createdAt = data.createdAt?._seconds
      ? new Date(data.createdAt._seconds * 1000)
      : null;

    if (createdAt && createdAt >= today && createdAt < tomorrow) {
      const name = data.displayName || `${data.name?.firstName} ${data.name?.lastName}`;
      const hasEmail = data.emails?.length > 0;
      const hasCompany = !!data.companyId;

      console.log(`  ${name}`);
      console.log(`     Erstellt: ${createdAt.toLocaleString('de-DE')}`);
      console.log(`     Hat Email: ${hasEmail ? 'Ja' : 'NEIN'}`);
      console.log(`     Hat Firma: ${hasCompany ? 'Ja' : 'NEIN'}`);
      console.log('');
    }
  }
}

checkDeletedContacts().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

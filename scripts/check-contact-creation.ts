// scripts/check-contact-creation.ts
// Prüft wann und wie die Kontakte erstellt wurden

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkCreation() {
  console.log('\n🔍 Prüfe Kontakt-Erstellung...\n');

  const organizationId = 'hJ4gTE9Gm35epoub0zIU'; // GolfNext

  // Lade alle Kontakte
  const snapshot = await db.collection('contacts_enhanced')
    .where('organizationId', '==', organizationId)
    .get();

  console.log('Kontakte mit Erstellungs-Details:\n');

  // Sortiere nach createdAt
  const contacts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })).sort((a: any, b: any) => {
    const aTime = a.createdAt?._seconds || 0;
    const bTime = b.createdAt?._seconds || 0;
    return bTime - aTime; // Neueste zuerst
  });

  for (const contact of contacts as any[]) {
    const createdAt = contact.createdAt?._seconds
      ? new Date(contact.createdAt._seconds * 1000).toLocaleString('de-DE')
      : 'unbekannt';

    const name = contact.displayName ||
      `${contact.name?.firstName || ''} ${contact.name?.lastName || ''}`.trim() ||
      '(Kein Name)';

    const hasEmail = contact.emails?.length > 0 || contact.email;
    const hasCompany = contact.companyId || contact.companyName;

    console.log(`  ${name}`);
    console.log(`     ID: ${contact.id}`);
    console.log(`     Erstellt: ${createdAt}`);
    console.log(`     Von: ${contact.createdBy || 'unbekannt'}`);
    console.log(`     Hat Email: ${hasEmail ? 'Ja' : 'NEIN'}`);
    console.log(`     Hat Firma: ${hasCompany ? 'Ja' : 'NEIN'}`);

    // Markiere problematische
    if (!hasEmail && !contact.position) {
      console.log(`     ⚠️  PROBLEMATISCH (keine Email, keine Position)`);
    }
    console.log('');
  }
}

checkCreation().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

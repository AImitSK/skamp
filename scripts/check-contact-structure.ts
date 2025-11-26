// scripts/check-contact-structure.ts
// Prüft die Struktur der Kontakte (firstName vs name.firstName)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkContacts() {
  console.log('\n🔍 Prüfe Kontakt-Struktur für GolfNext...\n');
  console.log('='.repeat(60));

  const organizationId = 'hJ4gTE9Gm35epoub0zIU'; // GolfNext

  const contactsSnapshot = await db.collection('contacts_enhanced')
    .where('organizationId', '==', organizationId)
    .get();

  console.log(`📊 ${contactsSnapshot.size} Kontakte gefunden\n`);

  let withTopLevelName = 0;
  let withNestedName = 0;
  let problematic: any[] = [];

  for (const doc of contactsSnapshot.docs) {
    const data = doc.data();

    const hasTopLevel = data.firstName || data.lastName;
    const hasNested = data.name?.firstName || data.name?.lastName;

    if (hasTopLevel) withTopLevelName++;
    if (hasNested) withNestedName++;

    // Prüfe ob der Kontakt in der Filterung durchfallen würde
    // searchMatch prüft: firstName, lastName, email, position
    const wouldPassFilter =
      data.firstName ||
      data.lastName ||
      data.email ||
      data.position;

    if (!wouldPassFilter) {
      problematic.push({
        id: doc.id,
        name: data.name,
        displayName: data.displayName,
        emails: data.emails,
        position: data.position,
        hasTopLevel,
        hasNested
      });
    }
  }

  console.log('📈 Struktur-Analyse:\n');
  console.log(`  Mit Top-Level firstName/lastName: ${withTopLevelName}`);
  console.log(`  Mit name.firstName/lastName: ${withNestedName}`);
  console.log(`  Würden Filter nicht bestehen: ${problematic.length}`);

  if (problematic.length > 0) {
    console.log('\n⚠️  Problematische Kontakte (fehlen in Tabelle):\n');
    for (const c of problematic) {
      console.log(`  👤 ID: ${c.id}`);
      console.log(`     displayName: ${c.displayName}`);
      console.log(`     name.firstName: ${c.name?.firstName}`);
      console.log(`     name.lastName: ${c.name?.lastName}`);
      console.log(`     emails: ${JSON.stringify(c.emails)}`);
      console.log(`     position: ${c.position}`);
      console.log('');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Das Problem: Die CRM-Seite filtert nach contact.firstName,');
  console.log('   aber ContactEnhanced hat die Daten unter contact.name.firstName');
}

checkContacts().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

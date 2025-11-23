// scripts/set-default-emails-available-to-all.ts
// Markiert alle Default-Emails mit availableToAll=true

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function setDefaultEmailsAvailableToAll() {
  console.log('\n🔧 Set Default Emails Available To All\n');
  console.log('⚠️  Markiert alle Default-Emails als für alle Teammitglieder verfügbar\n');

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  // 1. Lade alle Default-Emails
  const defaultEmailsSnapshot = await db.collection('email_addresses')
    .where('isDefault', '==', true)
    .get();

  console.log(`📊 Gefunden: ${defaultEmailsSnapshot.size} Default-Emails\n`);

  for (const emailDoc of defaultEmailsSnapshot.docs) {
    const emailData = emailDoc.data();
    const email = emailData.email;

    console.log(`📧 Email: ${email}`);

    // 2. Prüfe ob availableToAll bereits gesetzt ist
    if (emailData.availableToAll === true) {
      console.log('   ✅ Bereits als "Für alle verfügbar" markiert\n');
      skipped++;
      processed++;
      continue;
    }

    // 3. Update Email mit availableToAll=true und leere assignedUserIds
    await emailDoc.ref.update({
      availableToAll: true,
      assignedUserIds: [], // Leeres Array, da availableToAll=true
      permissions: {
        read: [],  // Leer, da availableToAll
        write: [], // Leer, da availableToAll
        manage: [] // Leer, da availableToAll
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log('   ✅ Aktualisiert: availableToAll=true\n');
    updated++;
    processed++;
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Verarbeitet: ${processed}`);
  console.log(`   Aktualisiert: ${updated}`);
  console.log(`   Übersprungen: ${skipped}`);
  console.log('\n✅ Migration abgeschlossen!\n');
}

setDefaultEmailsAvailableToAll().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

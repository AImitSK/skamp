// scripts/assign-default-emails-to-projects.ts
// Weist allen Projekten ohne emailAddressId die Default-Email ihrer Organisation zu

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function assignDefaultEmailsToProjects() {
  console.log('\n📧 Assign Default Emails to Projects\n');
  console.log('⚠️  Weist Projekten ohne emailAddressId die Default-Email zu\n');

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // 1. Lade alle Projekte
  const projectsSnapshot = await db.collection('projects').get();
  console.log(`📊 Gefunden: ${projectsSnapshot.size} Projekte\n`);

  for (const projectDoc of projectsSnapshot.docs) {
    const projectData = projectDoc.data();
    const projectId = projectDoc.id;
    const projectTitle = projectData.title || 'Unbekannt';
    const orgId = projectData.organizationId;

    console.log(`\n📁 Projekt: ${projectTitle} (${projectId})`);

    // 2. Prüfe ob emailAddressId bereits gesetzt ist
    if (projectData.emailAddressId) {
      console.log(`   ✅ Hat bereits Email-Adresse: ${projectData.emailAddressId}`);
      skipped++;
      processed++;
      continue;
    }

    // 3. Finde Default-Email für die Organization
    try {
      const defaultEmailSnapshot = await db.collection('email_addresses')
        .where('organizationId', '==', orgId)
        .where('isDefault', '==', true)
        .limit(1)
        .get();

      if (defaultEmailSnapshot.empty) {
        console.log(`   ⚠️  Keine Default-Email für Organization gefunden`);
        errors++;
        processed++;
        continue;
      }

      const defaultEmail = defaultEmailSnapshot.docs[0];
      const emailData = defaultEmail.data();

      // 4. Update Projekt mit emailAddressId
      await projectDoc.ref.update({
        emailAddressId: defaultEmail.id,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`   ✅ Email zugewiesen: ${emailData.email} (${defaultEmail.id})`);
      updated++;
      processed++;

    } catch (error) {
      console.log(`   ❌ Fehler: ${error}`);
      errors++;
      processed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Verarbeitet: ${processed}`);
  console.log(`   Aktualisiert: ${updated}`);
  console.log(`   Übersprungen: ${skipped}`);
  console.log(`   Fehler: ${errors}`);
  console.log('\n✅ Migration abgeschlossen!\n');
}

assignDefaultEmailsToProjects().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

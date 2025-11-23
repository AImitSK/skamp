// scripts/fix-legacy-emails.ts
// Ersetzt alte Email-Adressen mit neuem Format {orgId-short}@celeropress.com

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function fixLegacyEmails() {
  console.log('\n🔧 Fix Legacy Email Addresses\n');
  console.log('⚠️  Ersetzt alte Email-Adressen mit neuem Format\n');

  let processed = 0;
  let fixed = 0;
  let skipped = 0;

  // 1. Lade alle Organisationen
  const orgsSnapshot = await db.collection('organizations').get();
  console.log(`📊 Gefunden: ${orgsSnapshot.size} Organisationen\n`);

  for (const orgDoc of orgsSnapshot.docs) {
    const org = orgDoc.data();
    const orgId = orgDoc.id;
    const orgName = org.name || 'Unbekannt';

    console.log(`\n📁 Organisation: ${orgName} (${orgId})`);

    // 2. Finde Default-Email für diese Organisation
    const defaultEmailSnapshot = await db.collection('email_addresses')
      .where('organizationId', '==', orgId)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (defaultEmailSnapshot.empty) {
      console.log('   ⏭️  Keine Default-Email gefunden - übersprungen');
      skipped++;
      processed++;
      continue;
    }

    const emailDoc = defaultEmailSnapshot.docs[0];
    const emailData = emailDoc.data();
    const currentEmail = emailData.email;

    // 3. Prüfe ob Email dem neuen Format entspricht
    const shortOrgId = orgId.toLowerCase().substring(0, 8);
    const expectedEmail = `${shortOrgId}@celeropress.com`;

    if (currentEmail === expectedEmail && emailData.domain === 'celeropress.com') {
      console.log(`   ✅ Email bereits korrekt: ${currentEmail}`);
      skipped++;
      processed++;
      continue;
    }

    // 4. Email muss aktualisiert werden
    console.log(`   🔄 Update erforderlich:`);
    console.log(`      Alt: ${currentEmail}`);
    console.log(`      Neu: ${expectedEmail}`);

    // 4.1 Hole Domain-ID für celeropress.com
    const domainSnapshot = await db.collection('email_domains_enhanced')
      .where('organizationId', '==', orgId)
      .where('domain', '==', 'celeropress.com')
      .limit(1)
      .get();

    if (domainSnapshot.empty) {
      console.log('   ❌ celeropress.com Domain nicht gefunden - übersprungen');
      skipped++;
      processed++;
      continue;
    }

    const domainId = domainSnapshot.docs[0].id;

    // 4.2 Lösche alte Email
    await emailDoc.ref.delete();
    console.log(`   🗑️  Alte Email gelöscht: ${currentEmail}`);

    // 4.3 Erstelle neue Email im korrekten Format
    await db.collection('email_addresses').add({
      organizationId: orgId,
      domainId: domainId,
      email: expectedEmail,
      localPart: shortOrgId,
      domain: 'celeropress.com',
      displayName: orgName,
      isDefault: true,
      isActive: true,
      canDelete: false,
      verified: true,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: org.adminEmail || 'system'
    });

    console.log(`   ✅ Neue Email erstellt: ${expectedEmail}`);
    fixed++;
    processed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Verarbeitet: ${processed}`);
  console.log(`   Aktualisiert: ${fixed}`);
  console.log(`   Übersprungen: ${skipped}`);
  console.log('\n✅ Migration abgeschlossen!\n');
}

fixLegacyEmails().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

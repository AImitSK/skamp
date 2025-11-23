// scripts/setup-default-domains.ts
// Erstellt celeropress.com Domain + Default-Email für alle bestehenden Organisationen

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function setupDefaultDomains() {
  console.log('\n🚀 Setup Default Domains for existing Organizations\n');

  // 1. Lade alle Organisationen
  const orgsSnapshot = await db.collection('organizations').get();
  console.log(`📊 Gefunden: ${orgsSnapshot.size} Organisationen\n`);

  let processed = 0;
  let skipped = 0;
  let created = 0;

  for (const orgDoc of orgsSnapshot.docs) {
    const org = orgDoc.data();
    const orgId = orgDoc.id;
    const orgName = org.name || 'Unbekannt';

    console.log(`\n📁 Organisation: ${orgName} (${orgId})`);

    // 2. Prüfe ob celeropress.com Domain bereits existiert
    const existingDomainSnapshot = await db.collection('email_domains_enhanced')
      .where('organizationId', '==', orgId)
      .where('domain', '==', 'celeropress.com')
      .limit(1)
      .get();

    if (!existingDomainSnapshot.empty) {
      console.log('   ⏭️  Domain existiert bereits - übersprungen');
      skipped++;
      processed++;
      continue;
    }

    // 3. Erstelle celeropress.com Domain
    const domainRef = await db.collection('email_domains_enhanced').add({
      organizationId: orgId,
      domain: 'celeropress.com',
      status: 'verified',
      isDefault: true,
      verifiedAt: FieldValue.serverTimestamp(),
      emailsSent: 0,
      canDelete: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: org.adminEmail || 'system'
    });

    console.log(`   ✅ Domain erstellt: ${domainRef.id}`);

    // 4. Prüfe ob Default-Email bereits existiert
    const existingEmailSnapshot = await db.collection('email_addresses')
      .where('organizationId', '==', orgId)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (!existingEmailSnapshot.empty) {
      console.log('   ⏭️  Default-Email existiert bereits - übersprungen');
      created++;
      processed++;
      continue;
    }

    // 5. Erstelle Default Email-Adresse
    const shortOrgId = orgId.toLowerCase().substring(0, 8);
    const defaultEmail = `${shortOrgId}@celeropress.com`;

    await db.collection('email_addresses').add({
      organizationId: orgId,
      domainId: domainRef.id,
      email: defaultEmail,
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

    console.log(`   ✅ Email erstellt: ${defaultEmail}`);
    created++;
    processed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Verarbeitet: ${processed}`);
  console.log(`   Neu erstellt: ${created}`);
  console.log(`   Übersprungen: ${skipped}`);
  console.log('\n✅ Migration abgeschlossen!\n');
}

setupDefaultDomains().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

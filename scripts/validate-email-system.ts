// scripts/validate-email-system.ts
// Validiert das Email-System Setup für eine Organisation

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function validateEmailSystem(orgId: string) {
  console.log(`\n🔍 Validiere Email-System für Organization: ${orgId}\n`);

  let errors = 0;
  let warnings = 0;

  // 1. Prüfe celeropress.com Domain
  console.log('1️⃣ Prüfe Default-Domain...');
  const domainSnapshot = await db.collection('email_domains_enhanced')
    .where('organizationId', '==', orgId)
    .where('domain', '==', 'celeropress.com')
    .where('isDefault', '==', true)
    .limit(1)
    .get();

  if (domainSnapshot.empty) {
    console.log('   ❌ celeropress.com Domain FEHLT!');
    errors++;
  } else {
    const domain = domainSnapshot.docs[0].data();
    console.log(`   ✅ celeropress.com Domain vorhanden (${domainSnapshot.docs[0].id})`);

    if (domain.status !== 'verified') {
      console.log('   ⚠️  Domain nicht verifiziert!');
      warnings++;
    }
  }

  // 2. Prüfe Default-Email
  console.log('\n2️⃣ Prüfe Default-Email...');
  const emailSnapshot = await db.collection('email_addresses')
    .where('organizationId', '==', orgId)
    .where('isDefault', '==', true)
    .limit(1)
    .get();

  if (emailSnapshot.empty) {
    console.log('   ❌ Default-Email FEHLT!');
    errors++;
  } else {
    const email = emailSnapshot.docs[0].data();
    console.log(`   ✅ Default-Email vorhanden: ${email.email}`);

    if (email.domain !== 'celeropress.com') {
      console.log(`   ⚠️  Default-Email nicht auf celeropress.com: ${email.domain}`);
      warnings++;
    }

    if (!email.isActive) {
      console.log('   ⚠️  Default-Email nicht aktiv!');
      warnings++;
    }
  }

  // 3. Prüfe Domain-Mailbox (sollte NICHT existieren)
  console.log('\n3️⃣ Prüfe Domain-Mailbox für celeropress.com...');
  const domainMailboxSnapshot = await db.collection('inbox_domain_mailboxes')
    .where('organizationId', '==', orgId)
    .where('domain', '==', 'celeropress.com')
    .limit(1)
    .get();

  if (!domainMailboxSnapshot.empty) {
    console.log('   ⚠️  Domain-Mailbox für celeropress.com existiert (sollte NICHT sein)');
    warnings++;
  } else {
    console.log('   ✅ Keine Domain-Mailbox für celeropress.com (korrekt)');
  }

  // 4. Prüfe Projekt-Postfächer Format
  console.log('\n4️⃣ Prüfe Projekt-Postfächer...');
  const projectMailboxes = await db.collection('inbox_project_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`   📊 ${projectMailboxes.size} Projekt-Postfächer gefunden`);

  projectMailboxes.forEach(doc => {
    const mb = doc.data();
    const address = mb.inboxAddress;

    // Prüfe Format: muss {etwas}-{projectId}@inbox... sein
    const parts = address.split('@')[0].split('-');

    if (parts.length < 2) {
      console.log(`   ❌ Falsches Format: ${address}`);
      errors++;
    } else {
      console.log(`   ✅ Korrektes Format: ${address}`);
    }

    // Prüfe Referenzen
    if (!mb.emailAddressId) {
      console.log(`   ⚠️  emailAddressId fehlt: ${address}`);
      warnings++;
    }
  });

  // Zusammenfassung
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validierungs-Ergebnis:\n');

  if (errors === 0 && warnings === 0) {
    console.log('✅ PERFEKT! Email-System korrekt konfiguriert\n');
  } else {
    console.log(`❌ Fehler: ${errors}`);
    console.log(`⚠️  Warnungen: ${warnings}\n`);
  }
}

const orgId = process.argv[2];
if (!orgId) {
  console.log('Usage: npx tsx scripts/validate-email-system.ts <orgId>');
  process.exit(1);
}

validateEmailSystem(orgId).then(() => process.exit(0));

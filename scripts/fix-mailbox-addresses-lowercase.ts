// scripts/fix-mailbox-addresses-lowercase.ts
// Konvertiert alle inboxAddress Felder zu Kleinbuchstaben

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function fixMailboxAddresses() {
  console.log('\n🔧 Fix Mailbox Addresses to Lowercase\n');

  let totalProcessed = 0;
  let totalUpdated = 0;

  // 1. Fix Project Mailboxes
  console.log('📁 Fixing Project Mailboxes...');
  const projectMailboxes = await db.collection('inbox_project_mailboxes').get();
  console.log(`   Found: ${projectMailboxes.size} project mailboxes`);

  for (const doc of projectMailboxes.docs) {
    const data = doc.data();
    const oldAddress = data.inboxAddress;
    const newAddress = oldAddress.toLowerCase();

    if (oldAddress !== newAddress) {
      await doc.ref.update({
        inboxAddress: newAddress,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`   ✅ Updated: ${oldAddress} → ${newAddress}`);
      totalUpdated++;
    }
    totalProcessed++;
  }

  // 2. Fix Domain Mailboxes
  console.log('\n📧 Fixing Domain Mailboxes...');
  const domainMailboxes = await db.collection('inbox_domain_mailboxes').get();
  console.log(`   Found: ${domainMailboxes.size} domain mailboxes`);

  for (const doc of domainMailboxes.docs) {
    const data = doc.data();
    const oldAddress = data.inboxAddress;
    const newAddress = oldAddress.toLowerCase();

    if (oldAddress !== newAddress) {
      await doc.ref.update({
        inboxAddress: newAddress,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`   ✅ Updated: ${oldAddress} → ${newAddress}`);
      totalUpdated++;
    }
    totalProcessed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Verarbeitet: ${totalProcessed}`);
  console.log(`   Aktualisiert: ${totalUpdated}`);
  console.log('\n✅ Migration abgeschlossen!\n');
}

fixMailboxAddresses().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

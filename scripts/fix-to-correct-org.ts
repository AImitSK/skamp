// scripts/fix-to-correct-org.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function fixOrg() {
  const correctOrgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('🔧 Aktualisiere auf RICHTIGE organizationId:', correctOrgId);
  console.log('   (Team info - die Organisation in der du eingeloggt bist)\n');

  // Update domain mailboxes
  const domainSnap = await adminDb.collection('inbox_domain_mailboxes').get();
  console.log(`📬 Aktualisiere ${domainSnap.size} Domain-Mailboxen...`);
  for (const doc of domainSnap.docs) {
    await doc.ref.update({ organizationId: correctOrgId, updatedAt: new Date() });
    console.log('   ✅', doc.data().domain);
  }

  // Update email addresses
  const emailSnap = await adminDb.collection('email_addresses').get();
  console.log(`\n📧 Aktualisiere ${emailSnap.size} Email-Adressen...`);
  for (const doc of emailSnap.docs) {
    await doc.ref.update({ organizationId: correctOrgId, updatedAt: new Date() });
    console.log('   ✅', doc.data().email);
  }

  console.log('\n✅ FERTIG! Lade Inbox neu (Strg+Shift+R)');
}

fixOrg()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fehler:', err);
    process.exit(1);
  });

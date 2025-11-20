// scripts/fix-mailbox-organization.ts
// Aktualisiert die organizationId in den Mailboxen

import { adminDb } from '../src/lib/firebase/admin-init';

async function fixMailboxOrganization() {
  try {
    console.log('🔧 Aktualisiere organizationId in Mailboxen...\n');

    // Welche Organization soll verwendet werden?
    // Nehme die erste "SK Online MArketing" (i7GOgWxt63RAC54BQikx)
    const correctOrgId = 'i7GOgWxt63RAC54BQikx'; // ANPASSEN falls andere gewünscht!

    console.log(`✏️  Neue organizationId: ${correctOrgId}\n`);

    // 1. Update inbox_domain_mailboxes
    const domainSnapshot = await adminDb.collection('inbox_domain_mailboxes').get();

    console.log(`📬 Aktualisiere ${domainSnapshot.size} Domain-Mailboxen...`);

    for (const doc of domainSnapshot.docs) {
      await doc.ref.update({
        organizationId: correctOrgId,
        updatedAt: new Date()
      });
      const data = doc.data();
      console.log(`   ✅ ${data.domain}`);
    }

    // 2. Update email_addresses
    const addressSnapshot = await adminDb.collection('email_addresses').get();

    console.log(`\n📧 Aktualisiere ${addressSnapshot.size} E-Mail-Adressen...`);

    for (const doc of addressSnapshot.docs) {
      await doc.ref.update({
        organizationId: correctOrgId,
        updatedAt: new Date()
      });
      const data = doc.data();
      console.log(`   ✅ ${data.email}`);
    }

    console.log('\n✅ Alle Mailboxen und E-Mail-Adressen aktualisiert!');
    console.log('\n🔄 Bitte Inbox-Seite neu laden (Strg+Shift+R)\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  }
}

fixMailboxOrganization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fehler:', error);
    process.exit(1);
  });

// scripts/investigate-invisible-contacts.ts
// Untersucht unsichtbare CRM-Kontakte inkl. References

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function investigateContacts() {
  console.log('\n🔍 Untersuche CRM-Kontakte für GolfNext...\n');
  console.log('='.repeat(60));

  const organizationId = 'hJ4gTE9Gm35epoub0zIU'; // GolfNext

  // 1. Lade echte Kontakte aus contacts_enhanced
  const contactsEnhanced = await db.collection('contacts_enhanced')
    .where('organizationId', '==', organizationId)
    .get();

  console.log(`📊 contacts_enhanced: ${contactsEnhanced.size} Kontakte\n`);

  // 2. Prüfe Contact-References (Multi-Entity System)
  console.log('='.repeat(60));
  console.log('\n🔗 Prüfe Contact-References (organizations/{orgId}/contact_references)...\n');

  const contactRefsSnapshot = await db.collection('organizations')
    .doc(organizationId)
    .collection('contact_references')
    .get();

  console.log(`📊 contact_references: ${contactRefsSnapshot.size} References\n`);

  if (contactRefsSnapshot.size > 0) {
    console.log('Contact-References Details:\n');
    for (const doc of contactRefsSnapshot.docs) {
      const ref = doc.data();
      console.log(`  🔗 Reference ID: ${doc.id}`);
      console.log(`     localJournalistId: ${ref.localJournalistId}`);
      console.log(`     globalJournalistId: ${ref.globalJournalistId}`);
      console.log(`     isActive: ${ref.isActive}`);
      console.log(`     displayName: ${ref.displayName || '(nicht gesetzt)'}`);
      console.log(`     Data: ${JSON.stringify(ref).substring(0, 300)}...`);
      console.log('');
    }
  }

  // 3. Prüfe Journalist-References
  console.log('='.repeat(60));
  console.log('\n🔗 Prüfe journalist_references...\n');

  const journalistRefsSnapshot = await db.collection('organizations')
    .doc(organizationId)
    .collection('journalist_references')
    .get();

  console.log(`📊 journalist_references: ${journalistRefsSnapshot.size} References\n`);

  if (journalistRefsSnapshot.size > 0) {
    console.log('Journalist-References Details:\n');
    for (const doc of journalistRefsSnapshot.docs) {
      const ref = doc.data();
      console.log(`  🔗 Reference ID: ${doc.id}`);
      console.log(`     localJournalistId: ${ref.localJournalistId}`);
      console.log(`     globalJournalistId: ${ref.globalJournalistId}`);
      console.log(`     isActive: ${ref.isActive}`);
      console.log(`     Data: ${JSON.stringify(ref).substring(0, 300)}...`);
      console.log('');
    }
  }

  // 4. Prüfe Company-References
  console.log('='.repeat(60));
  console.log('\n🏢 Prüfe company_references...\n');

  const companyRefsSnapshot = await db.collection('organizations')
    .doc(organizationId)
    .collection('company_references')
    .get();

  console.log(`📊 company_references: ${companyRefsSnapshot.size} References\n`);

  if (companyRefsSnapshot.size > 0) {
    console.log('Company-References Details:\n');
    for (const doc of companyRefsSnapshot.docs) {
      const ref = doc.data();
      console.log(`  🏢 Reference ID: ${doc.id}`);
      console.log(`     localCompanyId: ${ref.localCompanyId}`);
      console.log(`     globalCompanyId: ${ref.globalCompanyId}`);
      console.log(`     isActive: ${ref.isActive}`);
      console.log('');
    }
  }

  // 5. Zusammenfassung
  console.log('='.repeat(60));
  console.log('\n📈 Zusammenfassung:\n');
  console.log(`  Echte Kontakte (contacts_enhanced): ${contactsEnhanced.size}`);
  console.log(`  Contact-References: ${contactRefsSnapshot.size}`);
  console.log(`  Journalist-References: ${journalistRefsSnapshot.size}`);
  console.log(`  Company-References: ${companyRefsSnapshot.size}`);
  console.log(`  GESAMT (erwartet in UI): ${contactsEnhanced.size + contactRefsSnapshot.size + journalistRefsSnapshot.size}`);

  // 6. Empfehlung
  const totalRefs = contactRefsSnapshot.size + journalistRefsSnapshot.size;
  if (totalRefs > 0) {
    console.log('\n💡 Es gibt Reference-Kontakte! Diese werden vom Multi-Entity-System');
    console.log('   als virtuelle Kontakte in getAll() eingefügt.');
    console.log('');
    console.log('   Mögliche Probleme:');
    console.log('   - References haben keine firstName/lastName → werden nicht in Suche gefunden');
    console.log('   - References werden in ContactSelectorModal angezeigt aber nicht in CRM-Tabelle');
    console.log('');
    console.log('   Um References zu löschen, führe aus mit --delete-refs Flag');
  }

  // 7. Lösch-Funktion für References
  const shouldDeleteRefs = process.argv.includes('--delete-refs');
  if (shouldDeleteRefs && totalRefs > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('\n🗑️  Lösche Reference-Kontakte...\n');

    let deleted = 0;

    // Contact-References löschen
    for (const doc of contactRefsSnapshot.docs) {
      await db.collection('organizations')
        .doc(organizationId)
        .collection('contact_references')
        .doc(doc.id)
        .delete();
      console.log(`  ✅ Gelöscht: contact_reference ${doc.id}`);
      deleted++;
    }

    // Journalist-References löschen
    for (const doc of journalistRefsSnapshot.docs) {
      await db.collection('organizations')
        .doc(organizationId)
        .collection('journalist_references')
        .doc(doc.id)
        .delete();
      console.log(`  ✅ Gelöscht: journalist_reference ${doc.id}`);
      deleted++;
    }

    console.log(`\n✅ ${deleted} References gelöscht\n`);
  }
}

investigateContacts().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

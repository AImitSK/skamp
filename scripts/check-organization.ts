// scripts/check-organization.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function checkOrganizations() {
  try {
    console.log('🏢 Vorhandene Organisationen:\n');

    const orgsSnapshot = await adminDb.collection('organizations').get();

    if (orgsSnapshot.empty) {
      console.log('❌ Keine Organisationen gefunden!\n');
      return;
    }

    orgsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Name: ${data.name || 'N/A'}`);
      console.log(`  Slug: ${data.slug || 'N/A'}`);
      console.log('');
    });

    console.log('📊 Zusammenfassung:');
    console.log(`   Mailboxen haben organizationId: "celeropress"`);
    console.log(`   Aktuelle Organisation(en): siehe oben`);
    console.log('\n💡 Die organizationId in den Mailboxen muss mit einer echten Organisation übereinstimmen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  }
}

checkOrganizations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fehler:', error);
    process.exit(1);
  });

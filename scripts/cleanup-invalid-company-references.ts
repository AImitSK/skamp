// scripts/cleanup-invalid-company-references.ts
/**
 * Cleanup-Script für ungültige company_references
 *
 * Findet und löscht company_references ohne gültige globalCompanyId
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin initialisieren
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
}

const db = getFirestore();

interface CompanyReference {
  organizationId: string;
  globalCompanyId?: string;
  localCompanyId: string;
  isActive: boolean;
  addedAt: any;
  addedBy: string;
}

async function cleanupInvalidCompanyReferences() {
  console.log('🔍 Starte Cleanup für ungültige company_references...\n');

  let totalProcessed = 0;
  let totalInvalid = 0;
  let totalDeleted = 0;

  try {
    // Lade alle Organisationen
    const orgsSnapshot = await db.collection('organizations').get();
    console.log(`📊 Gefundene Organisationen: ${orgsSnapshot.size}\n`);

    for (const orgDoc of orgsSnapshot.docs) {
      const organizationId = orgDoc.id;
      console.log(`\n🔍 Prüfe Organisation: ${organizationId}`);

      // Lade company_references für diese Organisation
      const refsSnapshot = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('company_references')
        .get();

      console.log(`   📋 Gefundene company_references: ${refsSnapshot.size}`);

      for (const refDoc of refsSnapshot.docs) {
        totalProcessed++;
        const ref = refDoc.data() as CompanyReference;

        // Prüfe ob globalCompanyId gültig ist
        if (!ref.globalCompanyId || typeof ref.globalCompanyId !== 'string' || ref.globalCompanyId.trim() === '') {
          totalInvalid++;
          console.log(`   ❌ Ungültige Reference gefunden:`);
          console.log(`      ID: ${refDoc.id}`);
          console.log(`      localCompanyId: ${ref.localCompanyId}`);
          console.log(`      globalCompanyId: ${ref.globalCompanyId}`);
          console.log(`      isActive: ${ref.isActive}`);

          // Lösche die ungültige Reference
          await refDoc.ref.delete();
          totalDeleted++;
          console.log(`      ✅ Gelöscht`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Cleanup abgeschlossen!\n');
    console.log(`📊 Statistiken:`);
    console.log(`   - Verarbeitete References: ${totalProcessed}`);
    console.log(`   - Ungültige References: ${totalInvalid}`);
    console.log(`   - Gelöschte References: ${totalDeleted}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fehler beim Cleanup:', error);
    throw error;
  }
}

// Script ausführen
cleanupInvalidCompanyReferences()
  .then(() => {
    console.log('\n✅ Script erfolgreich beendet');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

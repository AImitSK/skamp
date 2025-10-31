// scripts/migrate-domain-organization.ts
/**
 * Migrations-Script: Domain organizationId korrigieren
 *
 * Problem: Domains wurden mit user.uid statt organization.id gespeichert
 * Lösung: Aktualisiere organizationId für spezifische Domain
 *
 * Usage:
 * npx tsx scripts/migrate-domain-organization.ts <domainName> <newOrganizationId>
 *
 * Beispiel:
 * npx tsx scripts/migrate-domain-organization.ts celeropress.com org-xyz-123
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

const db = getFirestore();

interface DomainData {
  id: string;
  domain: string;
  organizationId: string;
  createdBy: string;
  status: string;
  [key: string]: any;
}

async function migrateDomain(domainName: string, newOrganizationId: string) {
  console.log('\n=== Domain Migration Script ===\n');
  console.log(`🔍 Suche Domain: ${domainName}`);
  console.log(`🎯 Neue organizationId: ${newOrganizationId}\n`);

  try {
    // Normalisiere Domain-Namen (ohne www, lowercase)
    const normalizedDomain = domainName.toLowerCase().replace(/^www\./, '');
    console.log(`📋 Normalisierte Domain: ${normalizedDomain}`);

    // Suche Domain in Firestore
    const domainsRef = db.collection('email_domains_enhanced');
    const snapshot = await domainsRef
      .where('domain', '==', normalizedDomain)
      .get();

    if (snapshot.empty) {
      console.log('❌ Domain nicht gefunden!');
      console.log('\nVersuche alternative Suche...');

      // Alternative Suche mit www.
      const altSnapshot = await domainsRef
        .where('domain', '==', `www.${normalizedDomain}`)
        .get();

      if (altSnapshot.empty) {
        console.log('❌ Domain auch mit www. nicht gefunden!');
        console.log('\n💡 Tipp: Überprüfen Sie die Firestore Console:');
        console.log(`   Collection: email_domains_enhanced`);
        return;
      }

      // Verwende alternative Suche
      return await processDomainMigration(altSnapshot, newOrganizationId);
    }

    return await processDomainMigration(snapshot, newOrganizationId);

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    if (error instanceof Error) {
      console.error('   Details:', error.message);
    }
  }
}

async function processDomainMigration(
  snapshot: FirebaseFirestore.QuerySnapshot,
  newOrganizationId: string
) {
  const doc = snapshot.docs[0];
  const domainData = { id: doc.id, ...doc.data() } as DomainData;

  console.log('\n✅ Domain gefunden!');
  console.log('📄 Aktuelle Daten:');
  console.log(`   ID: ${domainData.id}`);
  console.log(`   Domain: ${domainData.domain}`);
  console.log(`   Aktuelle organizationId: ${domainData.organizationId}`);
  console.log(`   Status: ${domainData.status}`);
  console.log(`   Created By: ${domainData.createdBy}`);

  // Prüfe ob Migration notwendig
  if (domainData.organizationId === newOrganizationId) {
    console.log('\n✅ Domain hat bereits die korrekte organizationId!');
    console.log('   Keine Migration notwendig.');
    return;
  }

  console.log('\n📝 Führe Migration durch...');
  console.log(`   Alt: ${domainData.organizationId}`);
  console.log(`   Neu: ${newOrganizationId}`);

  // Backup der alten organizationId
  const backupData = {
    oldOrganizationId: domainData.organizationId,
    migratedAt: FieldValue.serverTimestamp(),
    migratedBy: 'migration-script'
  };

  // Update durchführen
  await doc.ref.update({
    organizationId: newOrganizationId,
    updatedAt: FieldValue.serverTimestamp(),
    migrationBackup: backupData
  });

  console.log('\n✅ Migration erfolgreich!');

  // Verifiziere die Änderung
  const updatedDoc = await doc.ref.get();
  const updatedData = updatedDoc.data() as DomainData;

  console.log('\n🔍 Verifizierung:');
  console.log(`   Neue organizationId: ${updatedData.organizationId}`);
  console.log(`   Backup gespeichert: ${JSON.stringify(backupData, null, 2)}`);

  if (updatedData.organizationId === newOrganizationId) {
    console.log('\n🎉 Migration erfolgreich abgeschlossen!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Überprüfen Sie /dashboard/settings/domain');
    console.log('   2. Domain sollte jetzt in der Liste erscheinen');
    console.log('   3. Überprüfen Sie /dashboard/settings/email');
    console.log('   4. Domain sollte zur Auswahl verfügbar sein');
  } else {
    console.log('\n❌ Verifizierung fehlgeschlagen!');
    console.log('   Die organizationId wurde nicht korrekt aktualisiert.');
  }
}

// Script ausführen
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('❌ Falsche Anzahl von Argumenten!');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/migrate-domain-organization.ts <domainName> <newOrganizationId>');
  console.log('\nBeispiel:');
  console.log('  npx tsx scripts/migrate-domain-organization.ts celeropress.com org-xyz-123');
  console.log('\n💡 Tipp: Um die organizationId zu finden:');
  console.log('   1. Gehen Sie zu /dashboard/settings/team');
  console.log('   2. Öffnen Sie die Browser-Konsole');
  console.log('   3. Führen Sie aus: console.log(window.location.href)');
  console.log('   4. Oder prüfen Sie die Firestore Console → organizations Collection');
  process.exit(1);
}

const [domainName, newOrganizationId] = args;

migrateDomain(domainName, newOrganizationId)
  .then(() => {
    console.log('\n✅ Script abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

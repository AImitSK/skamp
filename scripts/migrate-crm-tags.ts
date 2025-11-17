/**
 * CRM Tags Migration Script
 *
 * Migriert Tags, die mit userId statt organizationId gespeichert wurden.
 *
 * Problem:
 * - Alte Tags haben userId als organizationId
 * - Neue Tags haben korrekte organizationId
 *
 * Lösung:
 * - Analysiere alle Tags in der 'tags' Collection
 * - Identifiziere Tags mit userId als organizationId
 * - Migriere zu korrekter organizationId
 *
 * Usage:
 *   npx tsx scripts/migrate-crm-tags.ts
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as readline from 'readline';

// Firebase Admin initialisieren
let adminApp: App;
if (getApps().length === 0) {
  const serviceAccount = require('../firebase-service-account.json');
  adminApp = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  adminApp = getApps()[0];
}

const db = getFirestore(adminApp);

// Readline Interface für User Input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

interface TagDocument {
  id: string;
  name: string;
  color: string;
  organizationId: string;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  contactCount?: number;
  companyCount?: number;
}

interface MigrationPlan {
  tag: TagDocument;
  currentOrgId: string;
  suggestedOrgId: string | null;
  reason: string;
}

/**
 * Analysiert alle Tags und identifiziert Migrations-Kandidaten
 */
async function analyzeTags(): Promise<MigrationPlan[]> {
  console.log('🔍 Analysiere Tags in Firestore...\n');

  const tagsSnapshot = await db.collection('tags').get();
  const plans: MigrationPlan[] = [];

  console.log(`📊 Gefunden: ${tagsSnapshot.size} Tags\n`);

  for (const doc of tagsSnapshot.docs) {
    const tag = { id: doc.id, ...doc.data() } as TagDocument;
    const orgId = tag.organizationId;

    // Prüfe ob organizationId aussieht wie eine userId
    // userId-Format: alphanumerisch, oft länger, keine org_ Präfix
    // organizationId-Format: beginnt meist mit "org_" oder ist strukturiert

    const looksLikeUserId = orgId &&
      !orgId.startsWith('org_') &&
      !orgId.startsWith('organization_') &&
      orgId.length > 20; // User IDs von Firebase sind typischerweise 28 Zeichen

    if (looksLikeUserId) {
      // Versuche die richtige Organization zu finden
      // Option 1: Prüfe ob es einen User mit dieser ID gibt
      let suggestedOrgId: string | null = null;
      let reason = 'userId als organizationId gefunden';

      // Prüfe ob createdBy existiert und unterschiedlich ist
      if (tag.createdBy && tag.createdBy !== orgId) {
        suggestedOrgId = tag.createdBy;
        reason = 'createdBy unterscheidet sich von organizationId (userId)';
      }

      plans.push({
        tag,
        currentOrgId: orgId,
        suggestedOrgId,
        reason
      });
    }
  }

  return plans;
}

/**
 * Zeigt Migrations-Plan an
 */
function displayMigrationPlan(plans: MigrationPlan[]): void {
  console.log('\n📋 Migrations-Plan:\n');
  console.log('═'.repeat(80));

  if (plans.length === 0) {
    console.log('✅ Keine Tags gefunden, die migriert werden müssen!');
    console.log('   Alle Tags haben bereits korrekte organizationId.\n');
    return;
  }

  plans.forEach((plan, index) => {
    console.log(`\n${index + 1}. Tag: "${plan.tag.name}"`);
    console.log(`   ID: ${plan.tag.id}`);
    console.log(`   Farbe: ${plan.tag.color}`);
    console.log(`   Aktuell organizationId: ${plan.currentOrgId}`);
    console.log(`   Vorschlag: ${plan.suggestedOrgId || 'MANUELL EINGEBEN'}`);
    console.log(`   Grund: ${plan.reason}`);
    if (plan.tag.contactCount || plan.tag.companyCount) {
      console.log(`   Verwendet: ${plan.tag.contactCount || 0} Kontakte, ${plan.tag.companyCount || 0} Firmen`);
    }
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\nGesamt: ${plans.length} Tags müssen migriert werden\n`);
}

/**
 * Führt die Migration durch
 */
async function migrateTags(plans: MigrationPlan[], targetOrgId: string): Promise<void> {
  console.log(`\n🚀 Starte Migration zu organizationId: ${targetOrgId}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const plan of plans) {
    try {
      console.log(`   Migriere: "${plan.tag.name}" (${plan.tag.id})...`);

      await db.collection('tags').doc(plan.tag.id).update({
        organizationId: targetOrgId,
        updatedAt: Timestamp.now(),
        // Speichere alte organizationId für Audit
        _migratedFrom: plan.currentOrgId,
        _migratedAt: Timestamp.now()
      });

      successCount++;
      console.log(`      ✅ Erfolgreich`);
    } catch (error) {
      errorCount++;
      console.error(`      ❌ Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Migration abgeschlossen:`);
  console.log(`   Erfolgreich: ${successCount}`);
  console.log(`   Fehler: ${errorCount}`);
  console.log(`\n💡 Die Tags haben jetzt die korrekte organizationId: ${targetOrgId}`);
  console.log(`   Die alte organizationId wurde in _migratedFrom gespeichert.\n`);
}

/**
 * Haupt-Funktion
 */
async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🏷️  CRM Tags Migration Script');
  console.log('═'.repeat(80) + '\n');

  try {
    // Schritt 1: Analysiere Tags
    const plans = await analyzeTags();
    displayMigrationPlan(plans);

    if (plans.length === 0) {
      rl.close();
      process.exit(0);
    }

    // Schritt 2: User Input für Ziel-Organization
    console.log('\n📝 Bitte gib die Ziel-organizationId ein:');
    console.log('   (Die organizationId, zu der die Tags migriert werden sollen)\n');

    const targetOrgId = await question('organizationId: ');

    if (!targetOrgId || targetOrgId.trim() === '') {
      console.log('\n❌ Keine organizationId eingegeben. Migration abgebrochen.\n');
      rl.close();
      process.exit(1);
    }

    // Schritt 3: Bestätigung
    console.log(`\n⚠️  Warnung: Dies wird ${plans.length} Tags zu organizationId "${targetOrgId}" migrieren.`);
    const confirm = await question('\nFortfahren? (ja/nein): ');

    if (confirm.toLowerCase() !== 'ja' && confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'j') {
      console.log('\n❌ Migration abgebrochen.\n');
      rl.close();
      process.exit(0);
    }

    // Schritt 4: Migration durchführen
    await migrateTags(plans, targetOrgId.trim());

    console.log('\n✅ Fertig! Die Tags sollten jetzt in der CRM-Tabelle sichtbar sein.\n');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    console.error('\nStack:', error instanceof Error ? error.stack : 'N/A');
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Script ausführen
main().catch(error => {
  console.error('Fatal Error:', error);
  process.exit(1);
});

/**
 * CRM Tags Migration Script (Client SDK Version)
 *
 * Nutzt die Firebase Client SDK (bereits in der App konfiguriert).
 * Keine Service Account JSON-Datei erforderlich!
 *
 * Usage:
 *   npx tsx scripts/migrate-crm-tags-client.ts
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Firebase Config (aus .env oder direkt)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase initialisieren
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Readline Interface
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
  createdAt?: any;
  updatedAt?: any;
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
 * Analysiert alle Tags
 */
async function analyzeTags(): Promise<MigrationPlan[]> {
  console.log('🔍 Analysiere Tags in Firestore...\n');

  const tagsSnapshot = await getDocs(collection(db, 'tags'));
  const plans: MigrationPlan[] = [];

  console.log(`📊 Gefunden: ${tagsSnapshot.size} Tags\n`);

  tagsSnapshot.forEach((docSnap) => {
    const tag = { id: docSnap.id, ...docSnap.data() } as TagDocument;
    const orgId = tag.organizationId;

    // Prüfe ob organizationId aussieht wie eine userId
    const looksLikeUserId = orgId &&
      !orgId.startsWith('org_') &&
      !orgId.startsWith('organization_') &&
      orgId.length > 20;

    if (looksLikeUserId) {
      let suggestedOrgId: string | null = null;
      let reason = 'userId als organizationId gefunden';

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
  });

  return plans;
}

/**
 * Zeigt Migrations-Plan
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
 * Führt Migration durch
 */
async function migrateTags(plans: MigrationPlan[], targetOrgId: string): Promise<void> {
  console.log(`\n🚀 Starte Migration zu organizationId: ${targetOrgId}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const plan of plans) {
    try {
      console.log(`   Migriere: "${plan.tag.name}" (${plan.tag.id})...`);

      const tagRef = doc(db, 'tags', plan.tag.id);
      await updateDoc(tagRef, {
        organizationId: targetOrgId,
        updatedAt: serverTimestamp(),
        _migratedFrom: plan.currentOrgId,
        _migratedAt: serverTimestamp()
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
  console.log('🏷️  CRM Tags Migration Script (Client SDK)');
  console.log('═'.repeat(80) + '\n');

  // Check Firebase Config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Firebase Config nicht gefunden!\n');
    console.error('Bitte .env.local Datei mit NEXT_PUBLIC_FIREBASE_* Variablen erstellen.\n');
    rl.close();
    process.exit(1);
  }

  console.log(`🔥 Firebase Project: ${firebaseConfig.projectId}\n`);

  try {
    // Schritt 1: Analysiere Tags
    const plans = await analyzeTags();
    displayMigrationPlan(plans);

    if (plans.length === 0) {
      rl.close();
      process.exit(0);
    }

    // Schritt 2: User Input
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

    // Schritt 4: Migration
    await migrateTags(plans, targetOrgId.trim());

    console.log('\n✅ Fertig! Die Tags sollten jetzt in der CRM-Tabelle sichtbar sein.\n');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
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

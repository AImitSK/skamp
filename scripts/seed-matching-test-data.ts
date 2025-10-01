/**
 * Seed Script: Matching Test-Daten
 *
 * Erstellt Test-Organisationen und Journalisten-Kontakte für Matching-Tests:
 * - 4 Test-Organisationen
 * - 3 Matching-Gruppen (Max Müller, Anna Schmidt, Peter Weber)
 * - Max Müller: 3 Varianten (sollte matchen)
 * - Anna Schmidt: 2 Varianten (sollte matchen)
 * - Peter Weber: 1 Variante (sollte NICHT matchen ohne Dev-Mode)
 *
 * Usage: npm run seed:matching-test
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';

// Firebase Config (aus .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========================================
// TYPES
// ========================================

interface TestOrganization {
  id?: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
}

interface JournalistVariant {
  organizationId: string;
  data: {
    name: { firstName: string; lastName: string };
    displayName?: string;
    emails: Array<{ type: string; email: string; isPrimary: boolean }>;
    phones?: Array<{ type: string; number: string; isPrimary: boolean }>;
    position?: string;
    companyName?: string;
    mediaProfile?: {
      isJournalist: boolean;
      beats?: string[];
      publicationIds?: string[];
      mediaTypes?: Array<'print' | 'online' | 'tv' | 'radio' | 'podcast'>;
    };
  };
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Erstellt Test-Organisationen
 */
async function createTestOrganizations(db: Firestore): Promise<TestOrganization[]> {
  console.log('\n📁 Erstelle Test-Organisationen...\n');

  const orgs: Omit<TestOrganization, 'id'>[] = [
    { name: 'Premium Media GmbH', email: 'admin@premium-media.de', plan: 'premium' },
    { name: 'StartUp PR AG', email: 'info@startup-pr.de', plan: 'free' },
    { name: 'Agency Communications Ltd', email: 'contact@agency-comms.de', plan: 'free' },
    { name: 'Digital Media House', email: 'hello@digital-media.de', plan: 'premium' }
  ];

  const createdOrgs: TestOrganization[] = [];

  for (const org of orgs) {
    try {
      const docRef = await addDoc(collection(db, 'organizations'), {
        ...org,
        type: 'agency',
        status: 'active',
        features: org.plan === 'premium' ? ['premium_library', 'analytics'] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      createdOrgs.push({ ...org, id: docRef.id });
      console.log(`  ✅ ${org.name} (${docRef.id})`);
    } catch (error) {
      console.error(`  ❌ Fehler bei ${org.name}:`, error);
    }
  }

  return createdOrgs;
}

/**
 * Erstellt Journalisten-Kontakte
 */
async function createJournalistVariants(
  db: Firestore,
  orgs: TestOrganization[]
): Promise<void> {
  console.log('\n👥 Erstelle Journalisten-Kontakte...\n');

  // ========================================
  // Journalist 1: Max Müller (Der Spiegel)
  // Sollte matchen (3 Organisationen)
  // ========================================
  const maxMuellerVariants: JournalistVariant[] = [
    {
      organizationId: orgs[0].id!,
      data: {
        name: { firstName: 'Max', lastName: 'Müller' },
        displayName: 'Max Müller',
        emails: [{ type: 'business', email: 'm.mueller@spiegel.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 1234567', isPrimary: true }],
        position: 'Politikredakteur',
        companyName: 'Der Spiegel',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'Wirtschaft', 'Europa'],
          publicationIds: [],
          mediaTypes: ['print', 'online']
        }
      }
    },
    {
      organizationId: orgs[1].id!,
      data: {
        name: { firstName: 'Maximilian', lastName: 'Müller' },
        displayName: 'Maximilian Müller',
        emails: [{ type: 'business', email: 'm.mueller@spiegel.de', isPrimary: true }],
        position: 'Redakteur',
        companyName: 'Spiegel Verlag',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik'],
          publicationIds: [],
          mediaTypes: ['online']
        }
      }
    },
    {
      organizationId: orgs[2].id!,
      data: {
        name: { firstName: 'M.', lastName: 'Müller' },
        displayName: 'M. Müller',
        emails: [{ type: 'business', email: 'm.mueller@spiegel.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 9876543', isPrimary: true }],
        position: 'Senior Journalist',
        companyName: 'Axel Springer',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'Wirtschaft'],
          publicationIds: [],
          mediaTypes: ['print']
        }
      }
    }
  ];

  // ========================================
  // Journalist 2: Anna Schmidt (Die Zeit)
  // Sollte matchen (2 Organisationen)
  // ========================================
  const annaSchmidtVariants: JournalistVariant[] = [
    {
      organizationId: orgs[0].id!,
      data: {
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ type: 'business', email: 'a.schmidt@zeit.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 40 3280 123', isPrimary: true }],
        position: 'Wirtschaftsredakteurin',
        companyName: 'Die Zeit',
        mediaProfile: {
          isJournalist: true,
          beats: ['Wirtschaft', 'Finanzen', 'Startups'],
          publicationIds: [],
          mediaTypes: ['print', 'online']
        }
      }
    },
    {
      organizationId: orgs[3].id!,
      data: {
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ type: 'business', email: 'a.schmidt@zeit.de', isPrimary: true }],
        position: 'Redakteurin',
        companyName: 'Zeit Online',
        mediaProfile: {
          isJournalist: true,
          beats: ['Wirtschaft', 'Technologie'],
          publicationIds: [],
          mediaTypes: ['online']
        }
      }
    }
  ];

  // ========================================
  // Journalist 3: Peter Weber (FAZ)
  // Sollte NICHT matchen (nur 1 Organisation)
  // ========================================
  const peterWeberVariant: JournalistVariant[] = [
    {
      organizationId: orgs[1].id!,
      data: {
        name: { firstName: 'Peter', lastName: 'Weber' },
        displayName: 'Peter Weber',
        emails: [{ type: 'business', email: 'p.weber@faz.net', isPrimary: true }],
        position: 'Technikredakteur',
        companyName: 'FAZ',
        mediaProfile: {
          isJournalist: true,
          beats: ['Technologie', 'Digital'],
          publicationIds: [],
          mediaTypes: ['print', 'online']
        }
      }
    }
  ];

  // ========================================
  // Journalist 4: Lisa Meier (Süddeutsche)
  // Sollte matchen (2 Organisationen, verschiedene E-Mails)
  // ========================================
  const lisaMeierVariants: JournalistVariant[] = [
    {
      organizationId: orgs[2].id!,
      data: {
        name: { firstName: 'Lisa', lastName: 'Meier' },
        displayName: 'Lisa Meier',
        emails: [{ type: 'business', email: 'l.meier@sueddeutsche.de', isPrimary: true }],
        phones: [{ type: 'business', number: '+49 89 2183 1234', isPrimary: true }],
        position: 'Kulturredakteurin',
        companyName: 'Süddeutsche Zeitung',
        mediaProfile: {
          isJournalist: true,
          beats: ['Kultur', 'Medien', 'Gesellschaft'],
          publicationIds: [],
          mediaTypes: ['print']
        }
      }
    },
    {
      organizationId: orgs[3].id!,
      data: {
        name: { firstName: 'Lisa', lastName: 'Meier' },
        displayName: 'Lisa Meier',
        emails: [{ type: 'business', email: 'meier@sueddeutsche.de', isPrimary: true }],
        position: 'Redakteurin',
        companyName: 'SZ',
        mediaProfile: {
          isJournalist: true,
          beats: ['Kultur'],
          publicationIds: [],
          mediaTypes: ['print', 'online']
        }
      }
    }
  ];

  // Alle Varianten kombinieren
  const allVariants = [
    ...maxMuellerVariants,
    ...annaSchmidtVariants,
    ...peterWeberVariant,
    ...lisaMeierVariants
  ];

  // Kontakte erstellen
  let successCount = 0;
  let errorCount = 0;

  for (const variant of allVariants) {
    try {
      await addDoc(collection(db, 'contacts_enhanced'), {
        ...variant.data,
        organizationId: variant.organizationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'seed-script',
        updatedBy: 'seed-script',
        deletedAt: null,
        isGlobal: false // WICHTIG: Nicht global!
      });

      console.log(`  ✅ ${variant.data.displayName} → ${orgs.find(o => o.id === variant.organizationId)?.name}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ ${variant.data.displayName}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   ✅ Erfolgreich: ${successCount}`);
  console.log(`   ❌ Fehler: ${errorCount}`);
}

// ========================================
// MAIN
// ========================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Matching Test-Daten Seed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Organisationen erstellen
    const orgs = await createTestOrganizations(db);

    if (orgs.length === 0) {
      throw new Error('❌ Keine Organisationen erstellt. Abbruch.');
    }

    console.log(`\n✅ ${orgs.length} Organisationen erstellt`);

    // 2. Journalisten-Kontakte erstellen
    await createJournalistVariants(db, orgs);

    // 3. Zusammenfassung
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Seed erfolgreich abgeschlossen!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Matching-Scan ausführen:');
    console.log('      - Manuell über UI: /super-admin/matching/candidates');
    console.log('      - Oder via Service: matchingService.scanForCandidates()');
    console.log('\n   2. Erwartete Kandidaten:');
    console.log('      ✅ Max Müller (3 Varianten, Score ~85)');
    console.log('      ✅ Anna Schmidt (2 Varianten, Score ~70)');
    console.log('      ✅ Lisa Meier (2 Varianten, Score ~70)');
    console.log('      ❌ Peter Weber (1 Variante, KEIN Match ohne Dev-Mode)');
    console.log('\n   3. Test-Daten löschen:');
    console.log('      npm run cleanup:matching-test');
    console.log('');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Seed fehlgeschlagen');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Script ausführen
main();

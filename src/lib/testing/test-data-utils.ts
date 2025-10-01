/**
 * Test-Daten Utilities für Intelligent Matching System
 *
 * Erstellt Test-Organisationen und Kontakte zum Testen des Matching-Systems
 */

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface TestDataResult {
  organizations: number;
  contacts: number;
  candidates?: number;
}

/**
 * Erstellt Test-Daten für das Matching System
 */
export async function seedTestData(): Promise<TestDataResult> {
  console.log('🌱 Creating test data for Intelligent Matching System...');

  let organizationCount = 0;
  let contactCount = 0;

  try {
    // Test Organisationen erstellen
    const testOrgs = [
      {
        name: 'Test Media Org 1',
        type: 'media',
        industry: 'journalism',
        isTestData: true,
        createdAt: new Date(),
        settings: {
          features: {
            matching: true,
            crm: true
          }
        }
      },
      {
        name: 'Test Media Org 2',
        type: 'media',
        industry: 'journalism',
        isTestData: true,
        createdAt: new Date(),
        settings: {
          features: {
            matching: true,
            crm: true
          }
        }
      },
      {
        name: 'Test Media Org 3',
        type: 'media',
        industry: 'journalism',
        isTestData: true,
        createdAt: new Date(),
        settings: {
          features: {
            matching: true,
            crm: true
          }
        }
      }
    ];

    const orgIds: string[] = [];

    for (const org of testOrgs) {
      const docRef = await addDoc(collection(db, 'organizations'), org);
      orgIds.push(docRef.id);
      organizationCount++;
      console.log(`✅ Created test org: ${org.name} (${docRef.id})`);
    }

    // Test Kontakte erstellen (die potentiell matchen)
    const testContacts = [
      // Max Müller - sollte in 3 Orgs erscheinen (gutes Match)
      {
        organizationId: orgIds[0],
        name: { firstName: 'Max', lastName: 'Müller' },
        displayName: 'Max Müller',
        emails: [{ email: 'max.mueller@spiegel.de', isPrimary: true }],
        companyName: 'Der Spiegel',
        position: 'Redakteur',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'Wirtschaft'],
          publicationIds: [],
          mediaTypes: ['Print', 'Online'],
          socialProfiles: []
        },
        publications: ['Der Spiegel'],
        isTestData: true,
        createdAt: new Date()
      },
      {
        organizationId: orgIds[1],
        name: { firstName: 'Max', lastName: 'Müller' },
        displayName: 'Max Müller',
        emails: [{ email: 'max@spiegel.de', isPrimary: true }],
        companyName: 'Spiegel Verlag GmbH',
        position: 'Senior Journalist',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik'],
          publicationIds: [],
          mediaTypes: ['Online'],
          socialProfiles: []
        },
        publications: ['Spiegel Online'],
        isTestData: true,
        createdAt: new Date()
      },
      {
        organizationId: orgIds[2],
        name: { firstName: 'Max', lastName: 'Müller' },
        displayName: 'Max Müller',
        emails: [{ email: 'mueller@spiegel.de', isPrimary: true }],
        companyName: 'SPIEGEL',
        position: 'Chefredakteur',
        mediaProfile: {
          isJournalist: true,
          beats: ['Politik', 'International'],
          publicationIds: [],
          mediaTypes: ['Print'],
          socialProfiles: []
        },
        publications: ['DER SPIEGEL'],
        isTestData: true,
        createdAt: new Date()
      },

      // Anna Schmidt - sollte in 2 Orgs erscheinen (mittleres Match)
      {
        organizationId: orgIds[0],
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ email: 'anna.schmidt@zeit.de', isPrimary: true }],
        companyName: 'Die Zeit',
        position: 'Reporterin',
        mediaProfile: {
          isJournalist: true,
          beats: ['Kultur'],
          publicationIds: [],
          mediaTypes: ['Print'],
          socialProfiles: []
        },
        publications: ['Die Zeit'],
        isTestData: true,
        createdAt: new Date()
      },
      {
        organizationId: orgIds[1],
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'A. Schmidt',
        emails: [{ email: 'a.schmidt@zeit.de', isPrimary: true }],
        companyName: 'ZEIT Verlagsgruppe',
        position: 'Kulturredakteurin',
        mediaProfile: {
          isJournalist: true,
          beats: ['Kultur', 'Gesellschaft'],
          publicationIds: [],
          mediaTypes: ['Online'],
          socialProfiles: []
        },
        publications: ['ZEIT Online'],
        isTestData: true,
        createdAt: new Date()
      },

      // Peter Weber - nur in 1 Org (kein Match erwartet)
      {
        organizationId: orgIds[0],
        name: { firstName: 'Peter', lastName: 'Weber' },
        displayName: 'Peter Weber',
        emails: [{ email: 'peter.weber@freelancer.com', isPrimary: true }],
        companyName: 'Freelancer',
        position: 'Freier Journalist',
        mediaProfile: {
          isJournalist: true,
          beats: ['Sport'],
          publicationIds: [],
          mediaTypes: ['Print', 'Online'],
          socialProfiles: []
        },
        publications: ['Verschiedene'],
        isTestData: true,
        createdAt: new Date()
      }
    ];

    for (const contact of testContacts) {
      await addDoc(collection(db, 'contacts_enhanced'), contact);
      contactCount++;
      console.log(`✅ Created test contact: ${contact.displayName} in org ${contact.organizationId}`);
    }

    console.log(`🎉 Test data created successfully!`);
    console.log(`📊 Expected matches after scan:`);
    console.log(`   - Max Müller: 3 variants (high score ~85-95)`);
    console.log(`   - Anna Schmidt: 2 variants (medium score ~70-80)`);
    console.log(`   - Peter Weber: 1 variant (no match)`);

    return {
      organizations: organizationCount,
      contacts: contactCount
    };

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

/**
 * Löscht alle Test-Daten
 */
export async function cleanupTestData(): Promise<TestDataResult> {
  console.log('🧹 Cleaning up test data...');

  let organizationCount = 0;
  let contactCount = 0;
  let candidateCount = 0;

  try {
    const batch = writeBatch(db);

    // Lösche Test-Organisationen
    const orgsQuery = query(
      collection(db, 'organizations'),
      where('isTestData', '==', true)
    );
    const orgsSnapshot = await getDocs(orgsQuery);

    for (const doc of orgsSnapshot.docs) {
      batch.delete(doc.ref);
      organizationCount++;
      console.log(`🗑️ Deleting test org: ${doc.data().name}`);
    }

    // Lösche Test-Kontakte
    const contactsQuery = query(
      collection(db, 'contacts_enhanced'),
      where('isTestData', '==', true)
    );
    const contactsSnapshot = await getDocs(contactsQuery);

    for (const doc of contactsSnapshot.docs) {
      batch.delete(doc.ref);
      contactCount++;
      console.log(`🗑️ Deleting test contact: ${doc.data().displayName}`);
    }

    // Lösche Test-Matching-Kandidaten (falls vorhanden)
    const candidatesQuery = query(
      collection(db, 'matching_candidates'),
      where('isTestData', '==', true)
    );
    const candidatesSnapshot = await getDocs(candidatesQuery);

    for (const doc of candidatesSnapshot.docs) {
      batch.delete(doc.ref);
      candidateCount++;
      console.log(`🗑️ Deleting test candidate: ${doc.data().matchKey}`);
    }

    // Führe Batch-Delete aus
    await batch.commit();

    console.log(`✅ Test data cleanup completed!`);

    return {
      organizations: organizationCount,
      contacts: contactCount,
      candidates: candidateCount
    };

  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    throw error;
  }
}
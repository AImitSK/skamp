// Umfangreiche Test-Daten für Matching-System Testing
// Erstellt realistische Szenarien mit Überschneidungen, Duplikaten und Edge-Cases

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { MatchingCandidate, CandidateVariant } from '@/types/matching';

// Test-Organisationen
const TEST_ORGANIZATIONS = [
  {
    id: 'org-spiegel',
    name: 'Der Spiegel',
    domain: 'spiegel.de'
  },
  {
    id: 'org-zeit',
    name: 'Die Zeit',
    domain: 'zeit.de'
  },
  {
    id: 'org-faz',
    name: 'Frankfurter Allgemeine',
    domain: 'faz.net'
  },
  {
    id: 'org-sueddeutsche',
    name: 'Süddeutsche Zeitung',
    domain: 'sueddeutsche.de'
  },
  {
    id: 'org-welt',
    name: 'Die Welt',
    domain: 'welt.de'
  }
];

// Große Medienkonzerne mit mehreren Publications
const MEDIA_COMPANIES = [
  {
    id: 'company-axelspringer',
    name: 'Axel Springer SE',
    alternativeNames: ['Axel Springer', 'Springer Verlag', 'AS SE'],
    website: 'https://www.axelspringer.com',
    publications: ['Die Welt', 'Bild', 'Business Insider', 'Politico Europe']
  },
  {
    id: 'company-bertelsmann',
    name: 'Bertelsmann SE',
    alternativeNames: ['Bertelsmann', 'RTL Group', 'Penguin Random House'],
    website: 'https://www.bertelsmann.com',
    publications: ['Stern', 'GEO', 'Capital', 'Brigitte']
  },
  {
    id: 'company-funke',
    name: 'Funke Mediengruppe',
    alternativeNames: ['Funke', 'WAZ', 'Funke Digital'],
    website: 'https://www.funkemedien.de',
    publications: ['WAZ', 'Berliner Morgenpost', 'Hamburger Abendblatt', 'Thüringer Allgemeine']
  },
  {
    id: 'company-burda',
    name: 'Hubert Burda Media',
    alternativeNames: ['Burda', 'Burda Media', 'HBM'],
    website: 'https://www.burda.com',
    publications: ['Focus', 'Bunte', 'Chip', 'Freundin']
  }
];

// Realistische Journalisten-Testdaten mit Variationen
const JOURNALIST_CANDIDATES: Partial<MatchingCandidate>[] = [
  // === CASE 1: Klare Duplikate - gleicher Journalist bei verschiedenen Medien ===
  {
    matchKey: 'maria.mueller@example.com',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-spiegel',
        organizationName: 'Der Spiegel',
        confidence: 95,
        contactData: {
          name: { firstName: 'Maria', lastName: 'Müller' },
          displayName: 'Maria Müller',
          emails: ['maria.mueller@spiegel.de'],
          phones: ['+49 40 12345678'],
          companyName: 'Der Spiegel',
          jobTitle: 'Politikredakteurin',
          hasMediaProfile: true,
          beats: ['Politik', 'Bundestag', 'Europa'],
          mediaTypes: ['Print', 'Online'],
          publications: ['Der Spiegel', 'Spiegel Online']
        }
      },
      {
        sourceOrganizationId: 'org-zeit',
        organizationName: 'Die Zeit',
        confidence: 92,
        contactData: {
          name: { firstName: 'Maria', lastName: 'Mueller' }, // Ohne Umlaut
          displayName: 'Maria Mueller',
          emails: ['m.mueller@zeit.de', 'maria.mueller@gmail.com'],
          phones: ['+49 40 12345678', '+49 172 9876543'],
          companyName: 'ZEIT ONLINE',
          jobTitle: 'Leitende Redakteurin Politik',
          hasMediaProfile: true,
          beats: ['Innenpolitik', 'EU', 'Bundestag'],
          mediaTypes: ['Online', 'Newsletter'],
          website: 'https://www.zeit.de/autoren/M/Maria_Mueller',
          publications: ['Die Zeit', 'ZEIT ONLINE']
        }
      }
    ]
  },

  // === CASE 2: Ähnliche Namen - könnte gleiche Person sein ===
  {
    matchKey: 'thomas.schmidt.journalist',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-faz',
        organizationName: 'FAZ',
        confidence: 88,
        contactData: {
          name: { firstName: 'Thomas', lastName: 'Schmidt' },
          displayName: 'Thomas Schmidt',
          emails: ['t.schmidt@faz.net'],
          phones: ['+49 69 75910'],
          companyName: 'Frankfurter Allgemeine Zeitung',
          jobTitle: 'Wirtschaftsredakteur',
          hasMediaProfile: true,
          beats: ['Wirtschaft', 'Finanzen', 'Börse'],
          mediaTypes: ['Print', 'Podcast'],
          publications: ['FAZ', 'FAZ.NET']
        }
      },
      {
        sourceOrganizationId: 'org-welt',
        organizationName: 'Die Welt',
        confidence: 85,
        contactData: {
          name: { firstName: 'Tom', lastName: 'Schmidt' }, // Tom statt Thomas
          displayName: 'Tom Schmidt',
          emails: ['tom.schmidt@welt.de'],
          phones: ['+49 30 25910'],
          companyName: 'Axel Springer', // Mutterkonzern
          jobTitle: 'Finanzjournalist',
          hasMediaProfile: true,
          beats: ['Finanzmärkte', 'Wirtschaftspolitik'],
          mediaTypes: ['Online', 'Video'],
          publications: ['Die Welt', 'Welt am Sonntag']
        }
      },
      {
        sourceOrganizationId: 'org-sueddeutsche',
        organizationName: 'Süddeutsche',
        confidence: 75,
        contactData: {
          name: { firstName: 'Thomas', middleName: 'Alexander', lastName: 'Schmidt' },
          displayName: 'Thomas A. Schmidt',
          emails: ['schmidt@sueddeutsche.de'],
          companyName: 'Süddeutsche Zeitung',
          jobTitle: 'Freier Autor',
          hasMediaProfile: true,
          beats: ['Wirtschaft', 'Technologie'],
          mediaTypes: ['Print'],
          publications: ['Süddeutsche Zeitung']
        }
      }
    ]
  },

  // === CASE 3: Freie Journalisten mit mehreren Publikationen ===
  {
    matchKey: 'anna.weber.freelance',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-spiegel',
        organizationName: 'Der Spiegel',
        confidence: 90,
        contactData: {
          name: { firstName: 'Anna', lastName: 'Weber' },
          displayName: 'Anna Weber',
          emails: ['anna.weber@freelance.de', 'aweber@gmail.com'],
          phones: ['+49 170 1234567'],
          companyName: 'Freie Journalistin',
          jobTitle: 'Freie Autorin',
          hasMediaProfile: true,
          beats: ['Kultur', 'Gesellschaft', 'Lifestyle'],
          mediaTypes: ['Print', 'Online', 'Podcast'],
          website: 'https://www.anna-weber.de',
          publications: ['Der Spiegel', 'Die Zeit', 'Stern', 'GEO']
        }
      }
    ]
  },

  // === CASE 4: Ressortleiter mit Team ===
  {
    matchKey: 'robert.fischer@axelspringer',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-welt',
        organizationName: 'Die Welt',
        confidence: 98,
        contactData: {
          name: { firstName: 'Robert', lastName: 'Fischer' },
          displayName: 'Robert Fischer',
          emails: ['robert.fischer@welt.de', 'r.fischer@axelspringer.com'],
          phones: ['+49 30 2591-0', '+49 171 5555555'],
          companyName: 'Axel Springer SE',
          jobTitle: 'Leiter Digitalredaktion',
          department: 'Digital',
          hasMediaProfile: true,
          beats: ['Digitalisierung', 'Medien', 'Tech'],
          mediaTypes: ['Online', 'Newsletter', 'Podcast', 'Video'],
          website: 'https://www.welt.de/autor/robert-fischer',
          publications: ['Die Welt', 'Welt am Sonntag', 'Business Insider']
        }
      }
    ]
  },

  // === CASE 5: Namensgleichheit aber verschiedene Personen ===
  {
    matchKey: 'michael.meyer.1',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-faz',
        organizationName: 'FAZ',
        confidence: 95,
        contactData: {
          name: { firstName: 'Michael', lastName: 'Meyer' },
          displayName: 'Michael Meyer',
          emails: ['michael.meyer@faz.net'],
          phones: ['+49 69 7591-1234'],
          companyName: 'Frankfurter Allgemeine',
          jobTitle: 'Sportredakteur',
          hasMediaProfile: true,
          beats: ['Fußball', 'Bundesliga', 'Champions League'],
          mediaTypes: ['Print', 'Online'],
          dateOfBirth: '1975-03-15', // Unterschiedliches Alter
          publications: ['FAZ', 'FAZ.NET']
        }
      }
    ]
  },
  {
    matchKey: 'michael.meyer.2',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-zeit',
        organizationName: 'Die Zeit',
        confidence: 94,
        contactData: {
          name: { firstName: 'Michael', lastName: 'Meyer' },
          displayName: 'Michael Meyer',
          emails: ['m.meyer@zeit.de'],
          phones: ['+49 40 3280-500'],
          companyName: 'ZEIT ONLINE',
          jobTitle: 'Wissenschaftsredakteur',
          hasMediaProfile: true,
          beats: ['Wissenschaft', 'Forschung', 'Klimawandel'],
          mediaTypes: ['Print', 'Online', 'Podcast'],
          dateOfBirth: '1982-07-22', // Unterschiedliches Alter
          publications: ['Die Zeit', 'ZEIT Wissen']
        }
      }
    ]
  },

  // === CASE 6: Internationale Korrespondenten ===
  {
    matchKey: 'sophie.larsson@international',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-spiegel',
        organizationName: 'Der Spiegel',
        confidence: 96,
        contactData: {
          name: { firstName: 'Sophie', lastName: 'Larsson' },
          displayName: 'Sophie Larsson',
          emails: ['sophie.larsson@spiegel.de', 's.larsson@derspiegel.com'],
          phones: ['+1 202 555 0123', '+49 40 3007-0'],
          companyName: 'Der Spiegel',
          jobTitle: 'USA-Korrespondentin',
          department: 'Ausland',
          hasMediaProfile: true,
          beats: ['US-Politik', 'Washington', 'Außenpolitik'],
          mediaTypes: ['Print', 'Online', 'TV'],
          location: 'Washington, DC',
          website: 'https://twitter.com/slarsson_spiegel',
          publications: ['Der Spiegel', 'Spiegel International']
        }
      },
      {
        sourceOrganizationId: 'org-sueddeutsche',
        organizationName: 'Süddeutsche',
        confidence: 88,
        contactData: {
          name: { firstName: 'Sophia', lastName: 'Larsson' }, // Sophia statt Sophie
          displayName: 'Sophia Larsson',
          emails: ['slarsson@sz.de'],
          phones: ['+1 202 555 0124'],
          companyName: 'Süddeutsche Zeitung',
          jobTitle: 'Korrespondentin USA',
          hasMediaProfile: true,
          beats: ['USA', 'Transatlantische Beziehungen'],
          mediaTypes: ['Print', 'Online'],
          location: 'New York, NY',
          publications: ['Süddeutsche Zeitung', 'SZ Magazin']
        }
      }
    ]
  },

  // === CASE 7: Chefredakteure und Führungspositionen ===
  {
    matchKey: 'klaus.brinkbaeumer@leadership',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-spiegel',
        organizationName: 'Der Spiegel',
        confidence: 99,
        contactData: {
          name: { firstName: 'Klaus', lastName: 'Brinkbäumer' },
          displayName: 'Klaus Brinkbäumer',
          emails: ['klaus.brinkbaeumer@spiegel.de', 'chefredaktion@spiegel.de'],
          phones: ['+49 40 3007-2000'],
          companyName: 'DER SPIEGEL',
          jobTitle: 'Chefredakteur',
          department: 'Chefredaktion',
          hasMediaProfile: true,
          beats: ['Politik', 'Gesellschaft', 'Medien'],
          mediaTypes: ['Print', 'Online'],
          website: 'https://www.spiegel.de/impressum',
          socialMedia: {
            twitter: '@kbrinkbaeumer',
            linkedin: 'klaus-brinkbaeumer'
          },
          publications: ['Der Spiegel', 'Manager Magazin']
        }
      }
    ]
  },

  // === CASE 8: Fachredakteure mit Spezialisierung ===
  {
    matchKey: 'dr.julia.bernstein@science',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-zeit',
        organizationName: 'Die Zeit',
        confidence: 97,
        contactData: {
          name: {
            title: 'Dr.',
            firstName: 'Julia',
            lastName: 'Bernstein'
          },
          displayName: 'Dr. Julia Bernstein',
          emails: ['julia.bernstein@zeit.de', 'j.bernstein@zeit.de'],
          phones: ['+49 40 3280-0'],
          companyName: 'ZEIT Wissen',
          jobTitle: 'Leitende Wissenschaftsredakteurin',
          department: 'Wissen',
          hasMediaProfile: true,
          beats: ['Medizin', 'Biotechnologie', 'KI', 'Forschungspolitik'],
          mediaTypes: ['Print', 'Online', 'Podcast'],
          education: 'Promotion in Molekularbiologie',
          awards: ['Wissenschaftsjournalist des Jahres 2022'],
          website: 'https://www.zeit.de/autoren/B/Julia_Bernstein',
          publications: ['ZEIT Wissen', 'Die Zeit', 'Spektrum der Wissenschaft']
        }
      },
      {
        sourceOrganizationId: 'org-faz',
        organizationName: 'FAZ',
        confidence: 85,
        contactData: {
          name: {
            firstName: 'Julia',
            lastName: 'Bernstein-Meyer' // Doppelname
          },
          displayName: 'Julia Bernstein-Meyer',
          emails: ['jbernstein@faz.net'],
          companyName: 'Frankfurter Allgemeine',
          jobTitle: 'Wissenschaftsjournalistin',
          hasMediaProfile: true,
          beats: ['Wissenschaft', 'Technologie'],
          mediaTypes: ['Print'],
          publications: ['FAZ']
        }
      }
    ]
  },

  // === CASE 9: Volontäre und Nachwuchs ===
  {
    matchKey: 'tim.neumann@trainee',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-welt',
        organizationName: 'Die Welt',
        confidence: 90,
        contactData: {
          name: { firstName: 'Tim', lastName: 'Neumann' },
          displayName: 'Tim Neumann',
          emails: ['tim.neumann@welt.de'],
          phones: ['+49 30 2591-77777'],
          companyName: 'Axel Springer Akademie',
          jobTitle: 'Volontär',
          department: 'Ausbildung',
          hasMediaProfile: true,
          beats: ['Lokales', 'Berlin', 'Startups'],
          mediaTypes: ['Online'],
          startDate: '2023-01-01',
          publications: ['Die Welt', 'Berliner Morgenpost']
        }
      }
    ]
  },

  // === CASE 10: Fotojournalisten und Bildredakteure ===
  {
    matchKey: 'stefan.wolf@photo',
    status: 'pending',
    variants: [
      {
        sourceOrganizationId: 'org-spiegel',
        organizationName: 'Der Spiegel',
        confidence: 93,
        contactData: {
          name: { firstName: 'Stefan', lastName: 'Wolf' },
          displayName: 'Stefan Wolf',
          emails: ['stefan.wolf@spiegel.de', 'foto@stefanwolf.de'],
          phones: ['+49 170 9999999'],
          companyName: 'Der Spiegel',
          jobTitle: 'Fotojournalist',
          department: 'Bildredaktion',
          hasMediaProfile: true,
          beats: ['Reportage', 'Politik', 'Konfliktgebiete'],
          mediaTypes: ['Print', 'Online', 'Ausstellung'],
          specialization: 'Fotojournalismus',
          website: 'https://www.stefanwolf-photography.com',
          awards: ['World Press Photo 2021'],
          publications: ['Der Spiegel', 'GEO', 'National Geographic Deutschland']
        }
      }
    ]
  }
];

// Zusätzliche Companies für Tests
const TEST_COMPANIES = [
  {
    id: 'comp-spiegel',
    organizationId: 'org-spiegel',
    name: 'SPIEGEL-Verlag Rudolf Augstein GmbH & Co. KG',
    officialName: 'SPIEGEL-Verlag Rudolf Augstein GmbH & Co. KG',
    tradingName: 'Der Spiegel',
    website: 'https://www.spiegel.de',
    industry: 'Medien & Verlagswesen',
    size: '500-1000',
    addresses: [{
      type: 'main',
      street: 'Ericusspitze 1',
      city: 'Hamburg',
      postalCode: '20457',
      country: 'Deutschland'
    }]
  },
  {
    id: 'comp-zeit',
    organizationId: 'org-zeit',
    name: 'Zeitverlag Gerd Bucerius GmbH & Co. KG',
    officialName: 'Zeitverlag Gerd Bucerius GmbH & Co. KG',
    tradingName: 'Die Zeit',
    website: 'https://www.zeit.de',
    industry: 'Medien & Verlagswesen',
    size: '500-1000',
    addresses: [{
      type: 'main',
      street: 'Buceriusstraße',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'Deutschland'
    }]
  }
];

// Test Publications
const TEST_PUBLICATIONS = [
  // Spiegel Gruppe
  {
    id: 'pub-spiegel',
    organizationId: 'org-spiegel',
    companyId: 'comp-spiegel',
    name: 'Der Spiegel',
    type: 'Nachrichtenmagazin',
    frequency: 'Wöchentlich',
    circulation: 695000,
    website: 'https://www.spiegel.de',
    language: 'Deutsch',
    topics: ['Politik', 'Wirtschaft', 'Gesellschaft', 'Kultur', 'Wissenschaft'],
    printISSN: '0038-7452',
    onlineISSN: '2195-1349'
  },
  {
    id: 'pub-spiegel-online',
    organizationId: 'org-spiegel',
    companyId: 'comp-spiegel',
    name: 'Spiegel Online',
    type: 'Online-Nachrichtenportal',
    frequency: 'Täglich',
    website: 'https://www.spiegel.de',
    language: 'Deutsch',
    topics: ['Nachrichten', 'Politik', 'Wirtschaft', 'Sport', 'Kultur']
  },
  {
    id: 'pub-manager-magazin',
    organizationId: 'org-spiegel',
    companyId: 'comp-spiegel',
    name: 'Manager Magazin',
    type: 'Wirtschaftsmagazin',
    frequency: 'Monatlich',
    circulation: 110000,
    website: 'https://www.manager-magazin.de',
    language: 'Deutsch',
    topics: ['Wirtschaft', 'Management', 'Karriere', 'Finanzen']
  },

  // Zeit Gruppe
  {
    id: 'pub-zeit',
    organizationId: 'org-zeit',
    companyId: 'comp-zeit',
    name: 'Die Zeit',
    type: 'Wochenzeitung',
    frequency: 'Wöchentlich',
    circulation: 600000,
    website: 'https://www.zeit.de',
    language: 'Deutsch',
    topics: ['Politik', 'Wirtschaft', 'Wissen', 'Kultur', 'Gesellschaft'],
    printISSN: '0044-2070'
  },
  {
    id: 'pub-zeit-online',
    organizationId: 'org-zeit',
    companyId: 'comp-zeit',
    name: 'ZEIT ONLINE',
    type: 'Online-Nachrichtenportal',
    frequency: 'Täglich',
    website: 'https://www.zeit.de',
    language: 'Deutsch',
    topics: ['Nachrichten', 'Politik', 'Digital', 'Kultur', 'Wissen']
  },
  {
    id: 'pub-zeit-wissen',
    organizationId: 'org-zeit',
    companyId: 'comp-zeit',
    name: 'ZEIT Wissen',
    type: 'Wissenschaftsmagazin',
    frequency: 'Zweimonatlich',
    circulation: 80000,
    website: 'https://www.zeit.de/zeit-wissen',
    language: 'Deutsch',
    topics: ['Wissenschaft', 'Forschung', 'Technologie', 'Gesundheit', 'Umwelt']
  },

  // Cross-Organization Publications (für Überschneidungen)
  {
    id: 'pub-handelsblatt',
    organizationId: 'org-faz',
    name: 'Handelsblatt',
    type: 'Wirtschaftszeitung',
    frequency: 'Täglich',
    circulation: 127000,
    website: 'https://www.handelsblatt.com',
    language: 'Deutsch',
    topics: ['Wirtschaft', 'Finanzen', 'Unternehmen', 'Politik']
  }
];

export async function seedComprehensiveTestData() {
  console.log('🚀 Starte umfangreiches Test-Daten Seeding...');

  try {
    // 1. Lösche alte Test-Kandidaten
    console.log('🗑️ Lösche alte Test-Daten...');
    const candidatesQuery = query(
      collection(db, 'matching_candidates'),
      where('isTestData', '==', true)
    );
    const candidatesSnapshot = await getDocs(candidatesQuery);

    for (const doc of candidatesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // 2. Erstelle Test-Companies
    console.log('🏢 Erstelle Test-Companies...');
    for (const company of TEST_COMPANIES) {
      await setDoc(doc(db, 'companies_enhanced', company.id), {
        ...company,
        isTestData: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }

    // 3. Erstelle Test-Publications
    console.log('📰 Erstelle Test-Publications...');
    for (const publication of TEST_PUBLICATIONS) {
      await setDoc(doc(db, 'superadmin_publications', publication.id), {
        ...publication,
        isTestData: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }

    // 4. Erstelle Matching-Kandidaten
    console.log('👥 Erstelle Matching-Kandidaten...');
    let candidateCount = 0;

    for (const candidate of JOURNALIST_CANDIDATES) {
      const candidateId = `test-candidate-${Date.now()}-${candidateCount++}`;

      await setDoc(doc(db, 'matching_candidates', candidateId), {
        ...candidate,
        isTestData: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        metadata: {
          source: 'test-seed',
          version: '1.0',
          generator: 'comprehensive-test-data'
        }
      });
    }

    console.log(`✅ Erfolgreich ${candidateCount} Test-Kandidaten erstellt!`);
    console.log(`✅ ${TEST_COMPANIES.length} Companies erstellt`);
    console.log(`✅ ${TEST_PUBLICATIONS.length} Publications erstellt`);

    return {
      success: true,
      stats: {
        candidates: candidateCount,
        companies: TEST_COMPANIES.length,
        publications: TEST_PUBLICATIONS.length
      }
    };

  } catch (error) {
    console.error('❌ Fehler beim Seeding:', error);
    throw error;
  }
}

// Hilfsfunktion zum Löschen aller Test-Daten
export async function cleanupTestData() {
  console.log('🧹 Lösche alle Test-Daten...');

  try {
    // Lösche Test-Kandidaten
    const candidatesQuery = query(
      collection(db, 'matching_candidates'),
      where('isTestData', '==', true)
    );
    const candidatesSnapshot = await getDocs(candidatesQuery);

    for (const doc of candidatesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // Lösche Test-Companies
    const companiesQuery = query(
      collection(db, 'companies_enhanced'),
      where('isTestData', '==', true)
    );
    const companiesSnapshot = await getDocs(companiesQuery);

    for (const doc of companiesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // Lösche Test-Publications
    const publicationsQuery = query(
      collection(db, 'superadmin_publications'),
      where('isTestData', '==', true)
    );
    const publicationsSnapshot = await getDocs(publicationsQuery);

    for (const doc of publicationsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    console.log('✅ Alle Test-Daten erfolgreich gelöscht!');

    return { success: true };

  } catch (error) {
    console.error('❌ Fehler beim Cleanup:', error);
    throw error;
  }
}
// Massive Test-Daten Generator für realistisches Testing
// Erstellt hunderte von Journalisten, Companies und Publications

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Deutsche Vornamen Pool
const FIRST_NAMES = [
  'Alexander', 'Andreas', 'Anna', 'Barbara', 'Benjamin', 'Bernd', 'Brigitte',
  'Carla', 'Christian', 'Christine', 'Claudia', 'Daniel', 'David', 'Diana',
  'Elena', 'Erik', 'Eva', 'Felix', 'Florian', 'Frank', 'Franziska',
  'Georg', 'Hannah', 'Hans', 'Heike', 'Hendrik', 'Inge', 'Jan', 'Jana',
  'Jennifer', 'Jens', 'Jessica', 'Joachim', 'Johannes', 'Julia', 'Jürgen',
  'Kai', 'Karin', 'Karl', 'Katharina', 'Klaus', 'Laura', 'Leon', 'Lisa',
  'Lukas', 'Marco', 'Maria', 'Marie', 'Marina', 'Markus', 'Martin', 'Max',
  'Maximilian', 'Michael', 'Monika', 'Nadine', 'Nicole', 'Nina', 'Oliver',
  'Patrick', 'Paul', 'Peter', 'Petra', 'Philipp', 'Ralf', 'Regina', 'Robert',
  'Sabine', 'Sandra', 'Sarah', 'Sebastian', 'Silke', 'Simon', 'Sophie',
  'Stefan', 'Stephanie', 'Susanne', 'Sven', 'Thomas', 'Tim', 'Tobias',
  'Ulrich', 'Ulrike', 'Ute', 'Vanessa', 'Verena', 'Victoria', 'Wolfgang'
];

// Deutsche Nachnamen Pool
const LAST_NAMES = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner',
  'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter',
  'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun',
  'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz',
  'Krause', 'Meier', 'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Köhler',
  'Herrmann', 'König', 'Walter', 'Mayer', 'Huber', 'Kaiser', 'Fuchs',
  'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung', 'Hahn', 'Schubert',
  'Vogel', 'Friedrich', 'Keller', 'Günther', 'Frank', 'Berger', 'Winkler',
  'Roth', 'Beck', 'Lorenz', 'Baumann', 'Franke', 'Albrecht', 'Winter',
  'Ludwig', 'Martin', 'Krämer', 'Schumacher', 'Vogt', 'Jäger', 'Stein',
  'Otto', 'Groß', 'Sommer', 'Haas', 'Graf', 'Heinrich', 'Seidel', 'Schreiber'
];

// Medien-Companies
const MEDIA_COMPANIES = [
  // Große Verlage
  { name: 'Axel Springer SE', city: 'Berlin', size: '5000+' },
  { name: 'Bertelsmann SE', city: 'Gütersloh', size: '5000+' },
  { name: 'Hubert Burda Media', city: 'München', size: '1000-5000' },
  { name: 'Funke Mediengruppe', city: 'Essen', size: '1000-5000' },
  { name: 'DuMont Mediengruppe', city: 'Köln', size: '500-1000' },
  { name: 'Madsack Mediengruppe', city: 'Hannover', size: '1000-5000' },

  // Zeitungen
  { name: 'Süddeutscher Verlag', city: 'München', size: '1000-5000' },
  { name: 'FAZ GmbH', city: 'Frankfurt', size: '500-1000' },
  { name: 'Zeitverlag', city: 'Hamburg', size: '500-1000' },
  { name: 'Spiegel-Verlag', city: 'Hamburg', size: '500-1000' },
  { name: 'Handelsblatt Media Group', city: 'Düsseldorf', size: '500-1000' },
  { name: 'Rheinische Post Mediengruppe', city: 'Düsseldorf', size: '500-1000' },

  // Regional
  { name: 'Stuttgarter Zeitung', city: 'Stuttgart', size: '100-500' },
  { name: 'Augsburger Allgemeine', city: 'Augsburg', size: '100-500' },
  { name: 'Neue Osnabrücker Zeitung', city: 'Osnabrück', size: '100-500' },
  { name: 'Badische Zeitung', city: 'Freiburg', size: '100-500' },
  { name: 'Rhein-Zeitung', city: 'Koblenz', size: '100-500' },
  { name: 'Nordwest-Zeitung', city: 'Oldenburg', size: '100-500' },

  // Magazine
  { name: 'Gruner + Jahr', city: 'Hamburg', size: '1000-5000' },
  { name: 'Condé Nast Germany', city: 'München', size: '100-500' },
  { name: 'Motor Presse Stuttgart', city: 'Stuttgart', size: '500-1000' },
  { name: 'Jahreszeiten Verlag', city: 'Hamburg', size: '100-500' },

  // Online/Digital
  { name: 'Ströer Digital Publishing', city: 'Berlin', size: '500-1000' },
  { name: 'United Internet Media', city: 'Karlsruhe', size: '500-1000' },
  { name: 'BASIC thinking GmbH', city: 'Berlin', size: '10-50' },
  { name: 't3n – digital pioneers', city: 'Hannover', size: '50-100' },

  // TV/Radio
  { name: 'ProSiebenSat.1 Media', city: 'Unterföhring', size: '5000+' },
  { name: 'RTL Deutschland', city: 'Köln', size: '1000-5000' },
  { name: 'Sky Deutschland', city: 'Unterföhring', size: '1000-5000' },

  // Freie/Agenturen
  { name: 'dpa Deutsche Presse-Agentur', city: 'Hamburg', size: '500-1000' },
  { name: 'Reuters Deutschland', city: 'Frankfurt', size: '100-500' },
  { name: 'AFP Deutschland', city: 'Berlin', size: '50-100' },
  { name: 'Freelancer Netzwerk', city: 'Berlin', size: '1-10' }
];

// Publications Pool
const PUBLICATIONS = [
  // National Newspapers
  { name: 'Die Zeit', type: 'Wochenzeitung', topics: ['Politik', 'Wirtschaft', 'Kultur'] },
  { name: 'Der Spiegel', type: 'Nachrichtenmagazin', topics: ['Politik', 'Gesellschaft'] },
  { name: 'Süddeutsche Zeitung', type: 'Tageszeitung', topics: ['Politik', 'München', 'Bayern'] },
  { name: 'Frankfurter Allgemeine', type: 'Tageszeitung', topics: ['Wirtschaft', 'Politik'] },
  { name: 'Die Welt', type: 'Tageszeitung', topics: ['Politik', 'Wirtschaft'] },
  { name: 'Handelsblatt', type: 'Wirtschaftszeitung', topics: ['Wirtschaft', 'Finanzen'] },
  { name: 'taz', type: 'Tageszeitung', topics: ['Politik', 'Gesellschaft', 'Kultur'] },

  // Regional Newspapers
  { name: 'Berliner Zeitung', type: 'Regionalzeitung', topics: ['Berlin', 'Brandenburg'] },
  { name: 'Kölner Stadt-Anzeiger', type: 'Regionalzeitung', topics: ['Köln', 'NRW'] },
  { name: 'Hamburger Abendblatt', type: 'Regionalzeitung', topics: ['Hamburg', 'Norddeutschland'] },
  { name: 'Münchner Merkur', type: 'Regionalzeitung', topics: ['München', 'Bayern'] },
  { name: 'Rheinische Post', type: 'Regionalzeitung', topics: ['Düsseldorf', 'NRW'] },
  { name: 'Stuttgarter Nachrichten', type: 'Regionalzeitung', topics: ['Stuttgart', 'Baden-Württemberg'] },

  // Magazines
  { name: 'Stern', type: 'Magazin', topics: ['Gesellschaft', 'Politik', 'Reportage'] },
  { name: 'Focus', type: 'Nachrichtenmagazin', topics: ['Politik', 'Wirtschaft', 'Gesundheit'] },
  { name: 'GEO', type: 'Magazin', topics: ['Reise', 'Natur', 'Wissenschaft'] },
  { name: 'Capital', type: 'Wirtschaftsmagazin', topics: ['Wirtschaft', 'Karriere'] },
  { name: 'Manager Magazin', type: 'Wirtschaftsmagazin', topics: ['Management', 'Unternehmen'] },
  { name: 'Wirtschaftswoche', type: 'Wirtschaftsmagazin', topics: ['Wirtschaft', 'Technologie'] },
  { name: 'brand eins', type: 'Wirtschaftsmagazin', topics: ['Wirtschaft', 'Innovation'] },

  // Lifestyle & Culture
  { name: 'Brigitte', type: 'Frauenmagazin', topics: ['Lifestyle', 'Mode', 'Gesellschaft'] },
  { name: 'Cosmopolitan', type: 'Frauenmagazin', topics: ['Beauty', 'Fashion', 'Lifestyle'] },
  { name: 'GQ', type: 'Männermagazin', topics: ['Mode', 'Lifestyle', 'Kultur'] },
  { name: 'VOGUE', type: 'Modemagazin', topics: ['Mode', 'Beauty', 'Kultur'] },
  { name: 'ELLE', type: 'Modemagazin', topics: ['Mode', 'Beauty', 'Lifestyle'] },

  // Tech & Digital
  { name: 't3n', type: 'Digital-Magazin', topics: ['Tech', 'Startups', 'Digital'] },
  { name: 'c\'t', type: 'Computer-Magazin', topics: ['IT', 'Security', 'Software'] },
  { name: 'CHIP', type: 'Computer-Magazin', topics: ['Tech', 'Tests', 'Digital'] },
  { name: 'Gründerszene', type: 'Online-Magazin', topics: ['Startups', 'Tech', 'Wirtschaft'] },

  // Special Interest
  { name: 'Auto Motor und Sport', type: 'Fachmagazin', topics: ['Auto', 'Motorsport'] },
  { name: '11 Freunde', type: 'Sportmagazin', topics: ['Fußball', 'Fan-Kultur'] },
  { name: 'Kicker', type: 'Sportmagazin', topics: ['Fußball', 'Sport'] },
  { name: 'National Geographic', type: 'Magazin', topics: ['Natur', 'Wissenschaft', 'Reise'] },
  { name: 'art', type: 'Kunstmagazin', topics: ['Kunst', 'Kultur', 'Ausstellungen'] },
  { name: 'Musikexpress', type: 'Musikmagazin', topics: ['Musik', 'Konzerte', 'Kultur'] },

  // Online Only
  { name: 'SPIEGEL ONLINE', type: 'Online-Portal', topics: ['Nachrichten', 'Politik'] },
  { name: 'ZEIT ONLINE', type: 'Online-Portal', topics: ['Nachrichten', 'Meinung'] },
  { name: 'FAZ.NET', type: 'Online-Portal', topics: ['Nachrichten', 'Wirtschaft'] },
  { name: 'WELT.de', type: 'Online-Portal', topics: ['Nachrichten', 'Politik'] },
  { name: 'BILD.de', type: 'Online-Portal', topics: ['Boulevard', 'Sport', 'Promis'] },
  { name: 'Business Insider', type: 'Online-Magazin', topics: ['Wirtschaft', 'Tech'] },
  { name: 'Vice Germany', type: 'Online-Magazin', topics: ['Kultur', 'Gesellschaft', 'Jugend'] },
  { name: 'BuzzFeed Deutschland', type: 'Online-Portal', topics: ['Entertainment', 'News'] },
  { name: 'Watson', type: 'Online-Portal', topics: ['News', 'Entertainment', 'Sport'] }
];

// Beats/Ressorts
const BEATS = [
  'Politik', 'Wirtschaft', 'Kultur', 'Sport', 'Gesellschaft', 'Wissenschaft',
  'Technologie', 'Digital', 'Medien', 'Lifestyle', 'Mode', 'Reise',
  'Gesundheit', 'Bildung', 'Umwelt', 'Klimawandel', 'Europa', 'International',
  'Innenpolitik', 'Außenpolitik', 'Lokales', 'Regional', 'Investigativ',
  'Meinung', 'Reportage', 'Interview', 'Porträt', 'Feature', 'Analyse'
];

// Job Titles
const JOB_TITLES = [
  'Redakteur', 'Redakteurin', 'Leitender Redakteur', 'Leitende Redakteurin',
  'Chef vom Dienst', 'Ressortleiter', 'Ressortleiterin', 'Chefredakteur',
  'Chefredakteurin', 'Stellv. Chefredakteur', 'Stellv. Chefredakteurin',
  'Reporter', 'Reporterin', 'Korrespondent', 'Korrespondentin',
  'Volontär', 'Volontärin', 'Freier Journalist', 'Freie Journalistin',
  'Autor', 'Autorin', 'Kolumnist', 'Kolumnistin', 'Moderator', 'Moderatorin',
  'Producer', 'Video-Journalist', 'Online-Redakteur', 'Online-Redakteurin',
  'Social Media Manager', 'Community Manager', 'Bildredakteur', 'Bildredakteurin',
  'Nachrichtenredakteur', 'Wirtschaftsredakteur', 'Politikredakteur',
  'Kulturredakteur', 'Sportredakteur', 'Wissenschaftsredakteur'
];

// Städte in Deutschland
const CITIES = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart',
  'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden',
  'Hannover', 'Nürnberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
  'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden',
  'Mönchengladbach', 'Gelsenkirchen', 'Braunschweig', 'Kiel', 'Chemnitz',
  'Aachen', 'Halle', 'Magdeburg', 'Freiburg', 'Krefeld', 'Mainz'
];

// Helper Functions
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateEmail(firstName: string, lastName: string, domain: string): string {
  const cleanFirst = firstName.toLowerCase().replace(/[äöü]/g, a => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[a] || a));
  const cleanLast = lastName.toLowerCase().replace(/[äöü]/g, a => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[a] || a));

  const patterns = [
    `${cleanFirst}.${cleanLast}@${domain}`,
    `${cleanFirst.charAt(0)}.${cleanLast}@${domain}`,
    `${cleanFirst}@${domain}`,
    `${cleanLast}@${domain}`,
    `${cleanFirst}${cleanLast}@${domain}`,
    `${cleanFirst.charAt(0)}${cleanLast}@${domain}`
  ];

  return randomElement(patterns);
}

function generatePhone(): string {
  const prefixes = ['030', '040', '089', '0221', '069', '0711', '0211'];
  const prefix = randomElement(prefixes);
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `+49 ${prefix.substring(1)} ${number}`;
}

function generateMobile(): string {
  const prefixes = ['151', '152', '160', '170', '171', '172', '173', '174', '175', '176', '177', '178', '179'];
  const prefix = randomElement(prefixes);
  const number = Math.floor(Math.random() * 90000000) + 10000000;
  return `+49 ${prefix} ${number}`;
}

// Main Seeding Function
export async function seedMassiveTestData() {
  console.log('🚀 Starte massives Test-Daten Seeding...');

  const startTime = Date.now();
  const batch = writeBatch(db);
  let operationCount = 0;
  const MAX_BATCH_SIZE = 400; // Firestore limit is 500

  try {
    // Arrays für erstellte Entities
    const createdCompanies: any[] = [];
    const createdPublications: any[] = [];
    const createdContacts: any[] = [];

    // 1. Erstelle Companies
    console.log('🏢 Erstelle Companies...');
    for (let i = 0; i < MEDIA_COMPANIES.length; i++) {
      const company = MEDIA_COMPANIES[i];
      const companyId = `test-company-${Date.now()}-${i}`;

      const companyData = {
        id: companyId,
        name: company.name,
        officialName: company.name + ' GmbH & Co. KG',
        tradingName: company.name,
        industry: 'Medien & Verlagswesen',
        type: 'media_company',
        size: company.size,
        website: `https://www.${company.name.toLowerCase().replace(/\s+/g, '-')}.de`,
        addresses: [{
          type: 'main',
          street: `${randomElement(['Haupt', 'Medien', 'Presse'])}straße ${Math.floor(Math.random() * 200) + 1}`,
          city: company.city,
          postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
          country: 'Deutschland'
        }],
        phones: [generatePhone()],
        emails: [`info@${company.name.toLowerCase().replace(/\s+/g, '-')}.de`],
        isTestData: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      batch.set(doc(db, 'superadmin_companies', companyId), companyData);
      createdCompanies.push(companyData);
      operationCount++;

      // Check batch size
      if (operationCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        operationCount = 0;
        console.log(`  ✓ Batch committed (${createdCompanies.length} companies so far)`);
      }
    }

    // 2. Erstelle Publications
    console.log('📰 Erstelle Publications...');
    for (let i = 0; i < PUBLICATIONS.length; i++) {
      const pub = PUBLICATIONS[i];
      const publicationId = `test-pub-${Date.now()}-${i}`;
      const company = randomElement(createdCompanies);

      const publicationData = {
        id: publicationId,
        companyId: company.id,
        name: pub.name,
        type: pub.type,
        topics: pub.topics,
        frequency: randomElement(['Täglich', 'Wöchentlich', 'Monatlich', 'Online']),
        circulation: Math.floor(Math.random() * 500000) + 10000,
        website: `https://www.${pub.name.toLowerCase().replace(/\s+/g, '-')}.de`,
        language: 'Deutsch',
        printISSN: `${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
        isTestData: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      batch.set(doc(db, 'superadmin_publications', publicationId), publicationData);
      createdPublications.push(publicationData);
      operationCount++;

      if (operationCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        operationCount = 0;
        console.log(`  ✓ Batch committed (${createdPublications.length} publications so far)`);
      }
    }

    // 3. Erstelle viele Journalisten (300+)
    console.log('👥 Erstelle Journalisten...');
    const NUM_JOURNALISTS = 350;

    for (let i = 0; i < NUM_JOURNALISTS; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const contactId = `test-contact-${Date.now()}-${i}`;
      const company = randomElement(createdCompanies);
      const publications = randomElements(createdPublications.filter(p => p.companyId === company.id || Math.random() > 0.7), Math.floor(Math.random() * 3) + 1);

      // Manchmal Variationen für Duplikate
      const isDuplicate = Math.random() > 0.85;
      const nameVariation = isDuplicate && Math.random() > 0.5;

      const contactData = {
        id: contactId,
        name: {
          firstName: nameVariation && firstName === 'Maximilian' ? 'Max' : firstName,
          lastName: lastName,
          title: Math.random() > 0.9 ? randomElement(['Dr.', 'Prof.', 'Prof. Dr.']) : undefined
        },
        displayName: `${firstName} ${lastName}`,
        emails: [
          generateEmail(firstName, lastName, company.website?.replace('https://www.', '') || 'example.de'),
          ...(Math.random() > 0.7 ? [generateEmail(firstName, lastName, 'gmail.com')] : [])
        ],
        phones: [
          generatePhone(),
          ...(Math.random() > 0.5 ? [generateMobile()] : [])
        ],
        companyId: company.id,
        companyName: company.name,
        jobTitle: randomElement(JOB_TITLES),
        department: randomElement(['Redaktion', 'Politik', 'Wirtschaft', 'Kultur', 'Sport', 'Digital']),

        // WICHTIG: mediaProfile für Journalisten
        mediaProfile: {
          isJournalist: true,
          beats: randomElements(BEATS, Math.floor(Math.random() * 4) + 1),
          mediaTypes: randomElements(['Print', 'Online', 'TV', 'Radio', 'Podcast', 'Newsletter'], Math.floor(Math.random() * 3) + 1),
          publicationIds: publications.map(p => p.id),
          specializationAreas: randomElements(BEATS, Math.floor(Math.random() * 2) + 1),
          languages: ['Deutsch', ...(Math.random() > 0.7 ? ['Englisch'] : [])],
          awards: Math.random() > 0.95 ? [`${randomElement(['Journalist', 'Reporter', 'Autor'])} des Jahres ${2020 + Math.floor(Math.random() * 4)}`] : undefined
        },

        addresses: [{
          type: 'work',
          street: company.addresses?.[0]?.street,
          city: company.addresses?.[0]?.city || randomElement(CITIES),
          postalCode: company.addresses?.[0]?.postalCode,
          country: 'Deutschland'
        }],

        website: Math.random() > 0.8 ? `https://www.${firstName.toLowerCase()}-${lastName.toLowerCase()}.de` : undefined,
        socialMedia: Math.random() > 0.6 ? {
          twitter: `@${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          linkedin: `${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
          xing: Math.random() > 0.5 ? `${firstName}_${lastName}` : undefined
        } : undefined,

        notes: `Test-Journalist erstellt am ${new Date().toLocaleDateString('de-DE')}`,
        tags: randomElements(['Wichtig', 'Fachpresse', 'Leitmedium', 'Regional', 'Influencer'], Math.floor(Math.random() * 2)),

        isTestData: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      batch.set(doc(db, 'superadmin_contacts', contactId), contactData);
      createdContacts.push(contactData);
      operationCount++;

      if (operationCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        operationCount = 0;
        console.log(`  ✓ Batch committed (${createdContacts.length} contacts so far)`);
      }

      // Erstelle manchmal Duplikate (andere Org sieht gleichen Journalisten)
      if (isDuplicate && Math.random() > 0.5) {
        const duplicateId = `test-contact-dup-${Date.now()}-${i}`;
        const otherCompany = randomElement(createdCompanies.filter(c => c.id !== company.id));

        const duplicateData = {
          ...contactData,
          id: duplicateId,
          companyId: otherCompany.id,
          companyName: otherCompany.name,
          emails: [
            generateEmail(firstName, lastName, otherCompany.website?.replace('https://www.', '') || 'example.de')
          ],
          notes: `Mögliches Duplikat von ${contactData.displayName}`
        };

        batch.set(doc(db, 'superadmin_contacts', duplicateId), duplicateData);
        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          operationCount = 0;
        }
      }
    }

    // Final commit
    if (operationCount > 0) {
      await batch.commit();
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log('✅ Massives Test-Daten Seeding abgeschlossen!');
    console.log(`📊 Statistiken:`);
    console.log(`  - ${createdCompanies.length} Companies erstellt`);
    console.log(`  - ${createdPublications.length} Publications erstellt`);
    console.log(`  - ${createdContacts.length}+ Journalisten erstellt (inkl. Duplikate)`);
    console.log(`  - Dauer: ${duration.toFixed(2)} Sekunden`);

    return {
      success: true,
      stats: {
        companies: createdCompanies.length,
        publications: createdPublications.length,
        contacts: createdContacts.length,
        duration: duration
      }
    };

  } catch (error) {
    console.error('❌ Fehler beim Massen-Seeding:', error);
    throw error;
  }
}

// Cleanup Funktion
export async function cleanupMassiveTestData() {
  console.log('🧹 Lösche massive Test-Daten...');

  try {
    let deletedCount = 0;

    // Lösche Test-Contacts
    const contactsQuery = query(
      collection(db, 'superadmin_contacts'),
      where('isTestData', '==', true)
    );
    const contactsSnapshot = await getDocs(contactsQuery);

    for (const doc of contactsSnapshot.docs) {
      await deleteDoc(doc.ref);
      deletedCount++;
    }

    // Lösche Test-Companies
    const companiesQuery = query(
      collection(db, 'superadmin_companies'),
      where('isTestData', '==', true)
    );
    const companiesSnapshot = await getDocs(companiesQuery);

    for (const doc of companiesSnapshot.docs) {
      await deleteDoc(doc.ref);
      deletedCount++;
    }

    // Lösche Test-Publications
    const publicationsQuery = query(
      collection(db, 'superadmin_publications'),
      where('isTestData', '==', true)
    );
    const publicationsSnapshot = await getDocs(publicationsQuery);

    for (const doc of publicationsSnapshot.docs) {
      await deleteDoc(doc.ref);
      deletedCount++;
    }

    console.log(`✅ ${deletedCount} Test-Einträge erfolgreich gelöscht!`);

    return {
      success: true,
      deletedCount: deletedCount
    };

  } catch (error) {
    console.error('❌ Fehler beim Cleanup:', error);
    throw error;
  }
}
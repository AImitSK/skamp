/**
 * VEREINFACHTER Realistischer Test-Daten Generator
 *
 * Erstellt NUR Contacts (keine Companies/Publications) wie seed-test-data.ts
 * Funktioniert mit Client SDK und Firestore Security Rules
 */

import { collection, addDoc, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Stats {
  organizations: number;
  contacts: number;
}

export async function seedRealisticTestDataSimple(): Promise<Stats> {
  console.log('🚀 Starte vereinfachten realistischen Test-Daten Generator...');

  const stats: Stats = {
    organizations: 0,
    contacts: 0
  };

  // 1. Erstelle Test-Organisationen
  const orgs = [
    { name: 'PR Agentur München', email: 'admin@pr-muenchen.de', plan: 'premium' },
    { name: 'Tech Startup Berlin', email: 'info@tech-berlin.de', plan: 'free' },
    { name: 'Automotive PR Stuttgart', email: 'contact@auto-pr.de', plan: 'premium' },
    { name: 'Fashion PR Hamburg', email: 'hello@fashion-pr.de', plan: 'free' },
    { name: 'Finance PR Frankfurt', email: 'admin@finance-pr.de', plan: 'premium' },
    { name: 'Healthcare PR Köln', email: 'info@health-pr.de', plan: 'free' },
    { name: 'Food PR Düsseldorf', email: 'contact@food-pr.de', plan: 'premium' },
    { name: 'Sports PR München', email: 'hello@sports-pr.de', plan: 'free' },
    { name: 'Real Estate PR', email: 'admin@realestate-pr.de', plan: 'premium' },
    { name: 'Consulting PR', email: 'info@consulting-pr.de', plan: 'free' }
  ];

  const createdOrgs = [];

  for (const org of orgs) {
    const docRef = await addDoc(collection(db, 'organizations'), {
      ...org,
      type: 'agency',
      status: 'active',
      features: org.plan === 'premium' ? ['premium_library', 'analytics'] : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    createdOrgs.push({ ...org, id: docRef.id });
    stats.organizations++;
    console.log(`✅ Org ${stats.organizations}/10: ${org.name}`);
  }

  // 2. Erstelle Test-Contacts über alle Orgs verteilt
  const testContacts = [
    // Category A: Perfect Matches - Spiegel Journalisten (5 Personen)
    { firstName: 'Anna', lastName: 'Schmidt', email: 'a.schmidt@spiegel.de', companyName: 'Der Spiegel', position: 'Redakteurin Politik' },
    { firstName: 'Michael', lastName: 'Müller', email: 'm.mueller@spiegel.de', companyName: 'Der Spiegel', position: 'Ressortleiter Wirtschaft' },
    { firstName: 'Sarah', lastName: 'Weber', email: 's.weber@spiegel.de', companyName: 'Spiegel Online', position: 'Online-Redakteurin' },

    // Category A: Zeit Journalisten
    { firstName: 'Martin', lastName: 'Schwarz', email: 'm.schwarz@zeit.de', companyName: 'Die Zeit', position: 'Chefkorrespondent' },
    { firstName: 'Daniel', lastName: 'Lang', email: 'd.lang@zeit.de', companyName: 'Die Zeit', position: 'Wirtschaftsredakteur' },

    // Category A: FAZ Journalisten
    { firstName: 'Johanna', lastName: 'Schneider', email: 'j.schneider@faz.de', companyName: 'FAZ', position: 'Finanzredakteurin' },
    { firstName: 'Wolfgang', lastName: 'Bauer', email: 'w.bauer@faz.de', companyName: 'FAZ', position: 'Wirtschaftskorrespondent' },

    // Category B: Fuzzy Matches - DPA
    { firstName: 'Jan', lastName: 'Köhler', email: 'j.koehler@dpa.com', companyName: 'DPA', position: 'Korrespondent' },
    { firstName: 'Anja', lastName: 'Schäfer', email: 'a.schaefer@dpa.com', companyName: 'Deutsche Presse-Agentur', position: 'Redakteurin' },

    // Category B: Focus
    { firstName: 'Maximilian', lastName: 'Roth', email: 'max.roth@focus.de', companyName: 'Focus', position: 'Chefredakteur' },
    { firstName: 'Isabelle', lastName: 'Frank', email: 'i.frank@focus.de', companyName: 'Focus Online', position: 'Online-Redakteurin' },

    // Category C: Create New - Tech-Blogger
    { firstName: 'Kevin', lastName: 'Schulte', email: 'kevin@techblog-muenchen.de', companyName: 'TechBlog München', position: 'Tech-Blogger' },
    { firstName: 'Michelle', lastName: 'Braun', email: 'm.braun@startup-weekly.de', companyName: 'Startup Weekly', position: 'Startup-Journalistin' },

    // Category C: Fashion-Blogger
    { firstName: 'Paula', lastName: 'Meyer', email: 'paula@fashion-forward-blog.de', companyName: 'Fashion Forward Blog', position: 'Fashion-Bloggerin' },
    { firstName: 'Clara', lastName: 'Koch', email: 'clara@beauty-insider-de.com', companyName: 'Beauty Insider', position: 'Beauty-Journalistin' },

    // Category D: Conflicts - tagesschau (Super Majority - 10/10 Orgs)
    { firstName: 'Caren', lastName: 'Miosga', email: 'c.miosga@tagesschau.de', companyName: 'tagesschau', position: 'Moderatorin' },
    { firstName: 'Judith', lastName: 'Rakers', email: 'j.rakers@tagesschau.de', companyName: 'tagesschau', position: 'Moderatorin' },

    // Category D: heute journal (Super Majority)
    { firstName: 'Marietta', lastName: 'Slomka', email: 'm.slomka@zdf.de', companyName: 'heute journal', position: 'Moderatorin' },
    { firstName: 'Claus', lastName: 'Kleber', email: 'c.kleber@zdf.de', companyName: 'heute journal', position: 'Moderator' },

    // Category E: Freie Journalisten (ohne Company)
    { firstName: 'Sabrina', lastName: 'Müller', email: 's.mueller@freejournalist.de', companyName: '', position: 'Freie Journalistin' },
    { firstName: 'Marcus', lastName: 'Weber', email: 'marcus@freelance-reporter.de', companyName: '', position: 'Freier Reporter' },

    // Category E: Abbreviations - ARD
    { firstName: 'Tom', lastName: 'Buhrow', email: 't.buhrow@wdr.de', companyName: 'WDR', position: 'Intendant' },
    { firstName: 'Ulrich', lastName: 'Wilhelm', email: 'u.wilhelm@br.de', companyName: 'BR', position: 'Intendant' },
  ];

  let orgIndex = 0;
  for (const contact of testContacts) {
    const currentOrg = createdOrgs[orgIndex % createdOrgs.length];

    await addDoc(collection(db, 'contacts_enhanced'), {
      name: {
        firstName: contact.firstName,
        lastName: contact.lastName
      },
      displayName: `${contact.firstName} ${contact.lastName}`,
      emails: contact.email ? [{ type: 'business', email: contact.email, isPrimary: true }] : [],
      phones: [],
      position: contact.position,
      companyName: contact.companyName,
      organizationId: currentOrg.id,
      mediaProfile: {
        isJournalist: true,
        beats: [],
        publicationIds: [],
        mediaTypes: ['print', 'online']
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'seed-realistic-simple',
      updatedBy: 'seed-realistic-simple',
      deletedAt: null,
      isGlobal: false,
      isReference: false
    });

    stats.contacts++;
    console.log(`✅ Contact ${stats.contacts}: ${contact.firstName} ${contact.lastName} @ ${contact.companyName || 'Freelance'}`);

    orgIndex++;
  }

  console.log('\n✅ Vereinfachte Test-Daten erstellt!');
  console.log(`   ${stats.organizations} Organisationen`);
  console.log(`   ${stats.contacts} Kontakte`);

  return stats;
}

export async function cleanupRealisticTestDataSimple(): Promise<void> {
  console.log('🧹 Starte Cleanup von vereinfachten Test-Daten...');

  let deleted = 0;

  // 1. Lösche alle Organisationen mit Test-Namen
  const orgNames = [
    'PR Agentur München', 'Tech Startup Berlin', 'Automotive PR Stuttgart',
    'Fashion PR Hamburg', 'Finance PR Frankfurt', 'Healthcare PR Köln',
    'Food PR Düsseldorf', 'Sports PR München', 'Real Estate PR', 'Consulting PR'
  ];

  const orgsSnapshot = await getDocs(collection(db, 'organizations'));
  const testOrgIds: string[] = [];

  orgsSnapshot.forEach((doc) => {
    if (orgNames.includes(doc.data().name)) {
      testOrgIds.push(doc.id);
    }
  });

  for (const docSnap of orgsSnapshot.docs) {
    if (orgNames.includes(docSnap.data().name)) {
      try {
        await deleteDoc(docSnap.ref);
        deleted++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Org ${docSnap.id}:`, error);
      }
    }
  }

  // 2. Lösche alle Contacts von diesen Orgs
  const contactsSnapshot = await getDocs(collection(db, 'contacts_enhanced'));

  for (const contactDoc of contactsSnapshot.docs) {
    const contactData = contactDoc.data();
    if (testOrgIds.includes(contactData.organizationId)) {
      try {
        await deleteDoc(contactDoc.ref);
        deleted++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Contact ${contactDoc.id}:`, error);
      }
    }
  }

  console.log(`✅ ${deleted} Dokumente gelöscht`);
}

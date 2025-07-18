// src/scripts/seed-dummy-data.ts
import { companiesService, contactsService, tagsService } from '@/lib/firebase/crm-service';
import { Company, Contact, Tag, CompanyType } from '@/types/crm';

// Dummy-Daten für Firmen
const dummyCompanies: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Süddeutsche Zeitung',
    type: 'publisher' as CompanyType,
    industry: 'Medien & Verlage',
    website: 'https://www.sueddeutsche.de',
    email: 'redaktion@sueddeutsche.de',
    phone: '+49 89 21830',
    address: {
      street: 'Hultschiner Straße 8',
      city: 'München',
      zip: '81677',
      state: 'Bayern',
      country: 'Deutschland'
    },
    employees: 1200,
    revenue: 380000000,
    notes: 'Eine der größten überregionalen Tageszeitungen Deutschlands',
    tagIds: [],
    mediaInfo: {
      circulation: 367000,
      reach: 1200000,
      publicationFrequency: 'daily',
      mediaType: 'print',
      focusAreas: ['Politik', 'Wirtschaft', 'Kultur', 'Sport'],
      publications: [
        {
          id: 'sz-print',
          name: 'Süddeutsche Zeitung Print',
          type: 'newspaper',
          format: 'print',
          frequency: 'daily',
          focusAreas: ['Politik', 'Wirtschaft', 'Kultur']
        },
        {
          id: 'sz-online',
          name: 'SZ.de',
          type: 'online',
          format: 'online',
          frequency: 'daily',
          focusAreas: ['Nachrichten', 'Digital', 'Lifestyle']
        }
      ]
    },
    socialMedia: [
      { platform: 'twitter', url: 'https://twitter.com/sz' },
      { platform: 'facebook', url: 'https://facebook.com/sueddeutsche' }
    ],
    userId: ''
  },
  {
    name: 'Der Spiegel',
    type: 'publisher' as CompanyType,
    industry: 'Medien & Verlage',
    website: 'https://www.spiegel.de',
    email: 'spiegel@spiegel.de',
    phone: '+49 40 30070',
    address: {
      street: 'Ericusspitze 1',
      city: 'Hamburg',
      zip: '20457',
      state: 'Hamburg',
      country: 'Deutschland'
    },
    employees: 1000,
    revenue: 320000000,
    notes: 'Deutschlands reichweitenstärkstes Nachrichtenmagazin',
    tagIds: [],
    mediaInfo: {
      circulation: 695000,
      reach: 6100000,
      publicationFrequency: 'weekly',
      mediaType: 'mixed',
      focusAreas: ['Politik', 'Wirtschaft', 'Gesellschaft', 'Wissenschaft'],
      publications: [
        {
          id: 'spiegel-magazin',
          name: 'DER SPIEGEL',
          type: 'magazine',
          format: 'print',
          frequency: 'weekly',
          focusAreas: ['Investigativ', 'Politik', 'Wirtschaft']
        },
        {
          id: 'spiegel-online',
          name: 'SPIEGEL ONLINE',
          type: 'online',
          format: 'online',
          frequency: 'daily',
          focusAreas: ['Nachrichten', 'Politik', 'Panorama']
        }
      ]
    },
    socialMedia: [
      { platform: 'twitter', url: 'https://twitter.com/derspiegel' },
      { platform: 'linkedin', url: 'https://linkedin.com/company/der-spiegel' }
    ],
    userId: ''
  },
  {
    name: 'Handelsblatt',
    type: 'publisher' as CompanyType,
    industry: 'Wirtschaftsmedien',
    website: 'https://www.handelsblatt.com',
    email: 'info@handelsblatt.com',
    phone: '+49 211 8870',
    address: {
      street: 'Toulouser Allee 27',
      city: 'Düsseldorf',
      zip: '40476',
      state: 'Nordrhein-Westfalen',
      country: 'Deutschland'
    },
    employees: 800,
    revenue: 250000000,
    notes: 'Führende Wirtschafts- und Finanzzeitung',
    tagIds: [],
    mediaInfo: {
      circulation: 127000,
      reach: 750000,
      publicationFrequency: 'daily',
      mediaType: 'print',
      focusAreas: ['Wirtschaft', 'Finanzen', 'Unternehmen', 'Politik'],
      publications: [
        {
          id: 'hb-print',
          name: 'Handelsblatt Print',
          type: 'newspaper',
          format: 'print',
          frequency: 'daily',
          focusAreas: ['Wirtschaft', 'Börse', 'Unternehmen']
        }
      ]
    },
    userId: ''
  },
  {
    name: 'Tech Innovations GmbH',
    type: 'customer' as CompanyType,
    industry: 'Technologie',
    website: 'https://www.tech-innovations.de',
    email: 'info@tech-innovations.de',
    phone: '+49 30 123456',
    address: {
      street: 'Friedrichstraße 123',
      city: 'Berlin',
      zip: '10117',
      state: 'Berlin',
      country: 'Deutschland'
    },
    employees: 250,
    revenue: 45000000,
    notes: 'Spezialist für KI-Lösungen und Cloud-Services',
    tagIds: [],
    socialMedia: [
      { platform: 'linkedin', url: 'https://linkedin.com/company/tech-innovations' }
    ],
    userId: ''
  },
  {
    name: 'PR Agentur München',
    type: 'agency' as CompanyType,
    industry: 'PR & Kommunikation',
    website: 'https://www.pr-agentur-muenchen.de',
    email: 'kontakt@pr-agentur-muenchen.de',
    phone: '+49 89 987654',
    address: {
      street: 'Maximilianstraße 50',
      city: 'München',
      zip: '80538',
      state: 'Bayern',
      country: 'Deutschland'
    },
    employees: 35,
    revenue: 4500000,
    notes: 'Full-Service PR-Agentur mit Schwerpunkt Tech und Startups',
    tagIds: [],
    userId: ''
  }
];

// Dummy-Daten für Kontakte
const dummyContacts: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    firstName: 'Anna',
    lastName: 'Schmidt',
    email: 'a.schmidt@sueddeutsche.de',
    phone: '+49 89 2183 1234',
    position: 'Leiterin Wirtschaftsredaktion',
    department: 'Wirtschaft',
    companyId: '', // Wird später gesetzt
    companyName: 'Süddeutsche Zeitung',
    notes: 'Schwerpunkt: Digitalisierung und Startups',
    tagIds: [],
    mediaInfo: {
      publications: ['Süddeutsche Zeitung Print', 'SZ.de'],
      expertise: ['Wirtschaft', 'Digitalisierung', 'Startups', 'Technologie']
    },
    communicationPreferences: {
      preferredChannel: 'email',
      bestTimeToContact: '09:00-11:00',
      doNotContact: false,
      language: 'de'
    },
    socialMedia: [
      { platform: 'twitter', url: 'https://twitter.com/aschmidt_sz' },
      { platform: 'linkedin', url: 'https://linkedin.com/in/anna-schmidt-sz' }
    ],
    userId: ''
  },
  {
    firstName: 'Thomas',
    lastName: 'Müller',
    email: 't.mueller@spiegel.de',
    phone: '+49 40 3007 2345',
    position: 'Redakteur Politik',
    department: 'Politik',
    companyId: '', // Wird später gesetzt
    companyName: 'Der Spiegel',
    notes: 'Experte für Bundespolitik und EU-Themen',
    tagIds: [],
    mediaInfo: {
      publications: ['DER SPIEGEL', 'SPIEGEL ONLINE'],
      expertise: ['Politik', 'EU', 'Bundespolitik', 'Wahlen']
    },
    communicationPreferences: {
      preferredChannel: 'phone',
      bestTimeToContact: '14:00-16:00',
      doNotContact: false,
      language: 'de'
    },
    userId: ''
  },
  {
    firstName: 'Julia',
    lastName: 'Weber',
    email: 'j.weber@handelsblatt.com',
    phone: '+49 211 8870 3456',
    position: 'Finanzjournalistin',
    department: 'Finanzen',
    companyId: '', // Wird später gesetzt
    companyName: 'Handelsblatt',
    notes: 'Fokus auf Börse und Kapitalmärkte',
    tagIds: [],
    mediaInfo: {
      publications: ['Handelsblatt Print'],
      expertise: ['Börse', 'Kapitalmärkte', 'Banken', 'Fintech']
    },
    communicationPreferences: {
      preferredChannel: 'email',
      doNotContact: false,
      language: 'de'
    },
    socialMedia: [
      { platform: 'twitter', url: 'https://twitter.com/jweber_hb' }
    ],
    userId: ''
  },
  {
    firstName: 'Michael',
    lastName: 'Bauer',
    email: 'm.bauer@tech-innovations.de',
    phone: '+49 30 123456 100',
    position: 'CEO',
    department: 'Geschäftsführung',
    companyId: '', // Wird später gesetzt
    companyName: 'Tech Innovations GmbH',
    notes: 'Gründer und Visionär, sehr PR-affin',
    tagIds: [],
    communicationPreferences: {
      preferredChannel: 'meeting',
      doNotContact: false,
      language: 'de'
    },
    socialMedia: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/michael-bauer-tech' }
    ],
    userId: ''
  },
  {
    firstName: 'Sarah',
    lastName: 'Fischer',
    email: 's.fischer@pr-agentur-muenchen.de',
    phone: '+49 89 987654 20',
    position: 'Senior Account Manager',
    department: 'Kundenbetreuung',
    companyId: '', // Wird später gesetzt
    companyName: 'PR Agentur München',
    notes: 'Betreut Tech-Kunden, sehr gute Medienkontakte',
    tagIds: [],
    communicationPreferences: {
      preferredChannel: 'email',
      doNotContact: false,
      language: 'de'
    },
    userId: ''
  }
];

// Dummy Tags
const dummyTags: Omit<Tag, 'id'>[] = [
  { name: 'Wichtig', color: 'red', userId: '' },
  { name: 'Medien', color: 'blue', userId: '' },
  { name: 'Kunde', color: 'green', userId: '' },
  { name: 'Partner', color: 'purple', userId: '' },
  { name: 'Newsletter', color: 'yellow', userId: '' }
];

// Funktion zum Seeden der Daten
export async function seedDummyData(userId: string) {
  try {
    console.log('Starting to seed dummy data...');
    
    // Tags erstellen
    console.log('Creating tags...');
    const tagIds: string[] = [];
    for (const tagData of dummyTags) {
      const tagId = await tagsService.create({ ...tagData, userId });
      tagIds.push(tagId);
      console.log(`Created tag: ${tagData.name}`);
    }
    
    // Firmen erstellen und IDs speichern
    console.log('\nCreating companies...');
    const companyIdMap = new Map<string, string>();
    
    for (const companyData of dummyCompanies) {
      // Zufällige Tags zuweisen
      const randomTags = tagIds
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);
      
      const companyId = await companiesService.create({
        ...companyData,
        tagIds: randomTags,
        userId
      });
      
      companyIdMap.set(companyData.name, companyId);
      console.log(`Created company: ${companyData.name}`);
    }
    
    // Kontakte erstellen mit korrekten Firmen-IDs
    console.log('\nCreating contacts...');
    for (const contactData of dummyContacts) {
      const companyId = companyIdMap.get(contactData.companyName || '') || '';
      
      // Zufällige Tags zuweisen
      const randomTags = tagIds
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 2) + 1);
      
      await contactsService.create({
        ...contactData,
        companyId,
        tagIds: randomTags,
        userId
      });
      
      console.log(`Created contact: ${contactData.firstName} ${contactData.lastName}`);
    }
    
    console.log('\n✅ Dummy data seeding completed successfully!');
    console.log(`Created ${dummyTags.length} tags, ${dummyCompanies.length} companies, and ${dummyContacts.length} contacts.`);
    
  } catch (error) {
    console.error('❌ Error seeding dummy data:', error);
    throw error;
  }
}

// Beispiel-Verwendung (in einer React-Komponente oder einer Seite):
/*
import { seedDummyData } from '@/scripts/seed-dummy-data';
import { useAuth } from '@/context/AuthContext';

// In einer Komponente:
const { user } = useAuth();

const handleSeedData = async () => {
  if (user) {
    try {
      await seedDummyData(user.uid);
      alert('Dummy-Daten erfolgreich angelegt!');
    } catch (error) {
      alert('Fehler beim Anlegen der Dummy-Daten');
    }
  }
};

// Button zum Auslösen:
<button onClick={handleSeedData}>Dummy-Daten anlegen</button>
*/
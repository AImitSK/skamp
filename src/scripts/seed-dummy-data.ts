// src/scripts/seed-dummy-data-enhanced.ts
import { companiesEnhancedService, contactsEnhancedService, tagsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { CompanyEnhanced, ContactEnhanced } from '@/types/crm-enhanced';
import { Tag, CompanyType } from '@/types/crm';
import { CountryCode, CurrencyCode, LanguageCode } from '@/types/international';

// Dummy-Daten für Firmen (Enhanced)
const dummyCompanies: Partial<CompanyEnhanced>[] = [
  {
    name: 'Süddeutsche Zeitung',
    officialName: 'Süddeutsche Zeitung GmbH',
    type: 'publisher' as CompanyType,
    website: 'https://www.sueddeutsche.de',
    description: 'Eine der größten überregionalen Tageszeitungen Deutschlands',
    
    // Address
    mainAddress: {
      street: 'Hultschiner Straße 8',
      city: 'München',
      postalCode: '81677',
      region: 'Bayern',
      countryCode: 'DE' as CountryCode
    },
    
    // Contact info
    phones: [
      { type: 'business', number: '+49 89 21830', isPrimary: true }
    ],
    emails: [
      { type: 'general', email: 'redaktion@sueddeutsche.de', isPrimary: true }
    ],
    
    // Financial
    financial: {
      annualRevenue: { amount: 380000000, currency: 'EUR' as CurrencyCode },
      employees: 1200
    },
    
    // Industry
    industryClassification: {
      primary: 'Medien & Verlage'
    },
    
    // Media info
    mediaInfo: {
      circulation: 367000,
      reach: 1200000,
      publicationFrequency: 'daily' as any,
      mediaType: 'print' as any,
      focusAreas: ['Politik', 'Wirtschaft', 'Kultur', 'Sport']
    },
    
    // Social
    socialMedia: [
      { platform: 'twitter', url: 'https://twitter.com/sz' },
      { platform: 'facebook', url: 'https://facebook.com/sueddeutsche' }
    ],
    
    // Status
    status: 'active',
    lifecycleStage: 'customer'
  },
  {
    name: 'Der Spiegel',
    officialName: 'SPIEGEL-Verlag Rudolf Augstein GmbH & Co. KG',
    type: 'publisher' as CompanyType,
    website: 'https://www.spiegel.de',
    description: 'Deutschlands reichweitenstärkstes Nachrichtenmagazin',
    
    mainAddress: {
      street: 'Ericusspitze 1',
      city: 'Hamburg',
      postalCode: '20457',
      region: 'Hamburg',
      countryCode: 'DE' as CountryCode
    },
    
    phones: [
      { type: 'business', number: '+49 40 30070', isPrimary: true }
    ],
    emails: [
      { type: 'general', email: 'spiegel@spiegel.de', isPrimary: true }
    ],
    
    financial: {
      annualRevenue: { amount: 320000000, currency: 'EUR' as CurrencyCode },
      employees: 1000
    },
    
    industryClassification: {
      primary: 'Medien & Verlage'
    },
    
    mediaInfo: {
      circulation: 695000,
      reach: 6100000,
      publicationFrequency: 'weekly' as any,
      mediaType: 'mixed' as any,
      focusAreas: ['Politik', 'Wirtschaft', 'Gesellschaft', 'Wissenschaft']
    },
    
    socialMedia: [
      { platform: 'twitter', url: 'https://twitter.com/derspiegel' },
      { platform: 'linkedin', url: 'https://linkedin.com/company/der-spiegel' }
    ],
    
    status: 'active',
    lifecycleStage: 'customer'
  },
  {
    name: 'Tech Innovations GmbH',
    officialName: 'Tech Innovations Gesellschaft mit beschränkter Haftung',
    type: 'customer' as CompanyType,
    website: 'https://www.tech-innovations.de',
    description: 'Spezialist für KI-Lösungen und Cloud-Services',
    
    mainAddress: {
      street: 'Friedrichstraße 123',
      city: 'Berlin',
      postalCode: '10117',
      region: 'Berlin',
      countryCode: 'DE' as CountryCode
    },
    
    phones: [
      { type: 'business', number: '+49 30 123456', isPrimary: true }
    ],
    emails: [
      { type: 'general', email: 'info@tech-innovations.de', isPrimary: true }
    ],
    
    financial: {
      annualRevenue: { amount: 45000000, currency: 'EUR' as CurrencyCode },
      employees: 250
    },
    
    industryClassification: {
      primary: 'Technologie'
    },
    
    socialMedia: [
      { platform: 'linkedin', url: 'https://linkedin.com/company/tech-innovations' }
    ],
    
    status: 'active',
    lifecycleStage: 'customer',
    legalForm: 'GmbH',
    foundedDate: new Date(2015, 0, 1)
  }
];

// Dummy-Daten für Kontakte (Enhanced)
const dummyContacts: Partial<ContactEnhanced>[] = [
  {
    name: {
      salutation: 'Frau',
      firstName: 'Anna',
      lastName: 'Schmidt'
    },
    displayName: 'Anna Schmidt',
    
    // Professional
    position: 'Leiterin Wirtschaftsredaktion',
    department: 'Wirtschaft',
    companyName: 'Süddeutsche Zeitung',
    
    // Contact info
    emails: [
      { type: 'business', email: 'a.schmidt@sueddeutsche.de', isPrimary: true }
    ],
    phones: [
      { type: 'business', number: '+49 89 2183 1234', isPrimary: true }
    ],
    
    // Media profile
    mediaProfile: {
      isJournalist: true,
      publicationIds: [],
      beats: ['Wirtschaft', 'Digitalisierung', 'Startups', 'Technologie'],
      preferredTopics: ['Digitalisierung', 'Startups']
    },
    
    // Communication
    communicationPreferences: {
      preferredChannel: 'email',
      preferredLanguage: 'de' as LanguageCode,
      preferredTime: {
        timezone: 'Europe/Berlin',
        bestHours: { from: '09:00', to: '11:00' }
      }
    },
    
    // Social
    socialProfiles: [
      { platform: 'twitter', url: 'https://twitter.com/aschmidt_sz' },
      { platform: 'linkedin', url: 'https://linkedin.com/in/anna-schmidt-sz' }
    ],
    
    // Personal
    personalInfo: {
      notes: 'Schwerpunkt: Digitalisierung und Startups'
    },
    
    status: 'active'
  },
  {
    name: {
      salutation: 'Herr',
      title: 'Dr.',
      firstName: 'Thomas',
      lastName: 'Müller'
    },
    displayName: 'Dr. Thomas Müller',
    
    position: 'Redakteur Politik',
    department: 'Politik',
    companyName: 'Der Spiegel',
    
    emails: [
      { type: 'business', email: 't.mueller@spiegel.de', isPrimary: true }
    ],
    phones: [
      { type: 'business', number: '+49 40 3007 2345', isPrimary: true }
    ],
    
    mediaProfile: {
      isJournalist: true,
      publicationIds: [],
      beats: ['Politik', 'EU', 'Bundespolitik', 'Wahlen']
    },
    
    communicationPreferences: {
      preferredChannel: 'phone',
      preferredLanguage: 'de' as LanguageCode,
      preferredTime: {
        timezone: 'Europe/Berlin',
        bestHours: { from: '14:00', to: '16:00' }
      }
    },
    
    personalInfo: {
      notes: 'Experte für Bundespolitik und EU-Themen'
    },
    
    status: 'active'
  },
  {
    name: {
      salutation: 'Herr',
      firstName: 'Michael',
      lastName: 'Bauer'
    },
    displayName: 'Michael Bauer',
    
    position: 'CEO',
    department: 'Geschäftsführung',
    companyName: 'Tech Innovations GmbH',
    
    emails: [
      { type: 'business', email: 'm.bauer@tech-innovations.de', isPrimary: true }
    ],
    phones: [
      { type: 'business', number: '+49 30 123456 100', isPrimary: true }
    ],
    
    communicationPreferences: {
      preferredChannel: 'messaging',
      preferredLanguage: 'de' as LanguageCode
    },
    
    socialProfiles: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/michael-bauer-tech' }
    ],
    
    personalInfo: {
      notes: 'Gründer und Visionär, sehr PR-affin'
    },
    
    status: 'active'
  }
];

// Dummy Tags (bleibt gleich)
const dummyTags: Omit<Tag, 'id'>[] = [
  { name: 'Wichtig', color: 'red', userId: '', createdAt: undefined, updatedAt: undefined },
  { name: 'Medien', color: 'blue', userId: '', createdAt: undefined, updatedAt: undefined },
  { name: 'Kunde', color: 'green', userId: '', createdAt: undefined, updatedAt: undefined },
  { name: 'Partner', color: 'purple', userId: '', createdAt: undefined, updatedAt: undefined },
  { name: 'Newsletter', color: 'yellow', userId: '', createdAt: undefined, updatedAt: undefined }
];

// Funktion zum Seeden der Daten
export async function seedDummyDataEnhanced(userId: string) {
  try {
    console.log('Starting to seed enhanced dummy data...');
    
    const context = { organizationId: userId, userId };
    
    // Tags erstellen
    console.log('Creating tags...');
    const tagIds: string[] = [];
    for (const tagData of dummyTags) {
      const tagId = await tagsEnhancedService.create(
        { ...tagData, organizationId: userId },
        context
      );
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
      
      const companyId = await companiesEnhancedService.create({
        ...companyData,
        tagIds: randomTags
      } as any, context);
      
      companyIdMap.set(companyData.name!, companyId);
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
      
      await contactsEnhancedService.create({
        ...contactData,
        companyId,
        tagIds: randomTags
      } as any, context);
      
      console.log(`Created contact: ${contactData.displayName}`);
    }
    
    console.log('\n✅ Enhanced dummy data seeding completed successfully!');
    console.log(`Created ${dummyTags.length} tags, ${dummyCompanies.length} companies, and ${dummyContacts.length} contacts.`);
    
  } catch (error) {
    console.error('❌ Error seeding enhanced dummy data:', error);
    throw error;
  }
}

// Beispiel-Verwendung in einer React-Komponente:
/*
import { seedDummyDataEnhanced } from '@/scripts/seed-dummy-data-enhanced';
import { useAuth } from '@/context/AuthContext';

// In einer Komponente:
const { user } = useAuth();

const handleSeedData = async () => {
  if (user) {
    try {
      await seedDummyDataEnhanced(user.uid);
      alert('Enhanced Dummy-Daten erfolgreich angelegt!');
      // Seite neu laden oder Daten aktualisieren
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Fehler beim Anlegen der Dummy-Daten');
    }
  }
};

// Button zum Auslösen:
<Button onClick={handleSeedData} color="zinc">
  Test-Daten anlegen
</Button>
*/
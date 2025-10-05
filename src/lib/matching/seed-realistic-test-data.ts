/**
 * Realistischer Test-Daten Generator für Matching-System
 *
 * Basiert auf: docs/implementation-plans/MATCHING-TEST-DATA-PLAN.md
 *
 * Erstellt realistische Test-Szenarien für:
 * - Category A: Perfect Matches (50 Szenarien)
 * - Category B: Fuzzy Matches (50 Szenarien)
 * - Category C: Create New (30 Szenarien)
 * - Category D: Conflicts (40 Szenarien)
 * - Category E: Edge Cases (30 Szenarien)
 *
 * Simuliert 10+ Organisationen mit verschiedenen Matching-Szenarien
 */

import { db } from '@/lib/firebase/config';
import { collection, doc, writeBatch, deleteDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Entfernt alle undefined Felder aus einem Object (für Firestore)
 */
function removeUndefinedFields(obj: any): any {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

/**
 * Konvertiert monitoringConfig für Firestore
 * Phase 5: Helper für Test-Daten
 *
 * WICHTIG: Keine Timestamps in monitoringConfig!
 * Firestore entfernt nested undefined/serverTimestamp values
 */
function preparePublicationForFirestore(publication: any): any {
  const prepared = { ...publication };

  // monitoringConfig wird direkt übernommen
  // (ohne Timestamps - die kommen vom Publication-Level)

  return prepared;
}

// ============================================================================
// TYPES
// ============================================================================

interface TestOrganization {
  id: string;
  name: string;
  ownerId: string;
}

interface TestCompany {
  id: string;
  name: string;
  website?: string;
  organizationId: string;
  deletedAt: null;
  isReference: boolean;
  createdAt: Date;
}

interface TestPublication {
  id: string;
  name: string;
  companyId: string;
  website?: string;
  organizationId: string;
  deletedAt: null;
  isReference: boolean;
  createdAt: Date;
  // 🆕 Phase 5: Monitoring Configuration
  monitoringConfig?: {
    isEnabled: boolean;
    websiteUrl: string | null;
    rssFeedUrls: string[];
    autoDetectRss: boolean;
    checkFrequency: 'daily' | 'twice_daily';
    keywords: string[];
    totalArticlesFound: number;
  };
}

interface TestContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  publicationId?: string;
  companyId?: string;
  organizationId: string;
  deletedAt: null;
  isReference: boolean;
  createdAt: Date;
  position?: string;
  phone?: string;
  mobile?: string;
}

interface ScenarioStats {
  organizations: number;
  companies: number;
  publications: number;
  contacts: number;
  scenarios: {
    perfectMatches: number;
    fuzzyMatches: number;
    createNew: number;
    conflicts: number;
    edgeCases: number;
  };
}

// ============================================================================
// ORGANISATIONEN
// ============================================================================

const TEST_ORGANIZATIONS: TestOrganization[] = [
  { id: 'org-test-001', name: 'PR Agentur München', ownerId: 'user-001' },
  { id: 'org-test-002', name: 'Tech Startup Berlin', ownerId: 'user-002' },
  { id: 'org-test-003', name: 'Automotive Company Stuttgart', ownerId: 'user-003' },
  { id: 'org-test-004', name: 'Fashion Brand Hamburg', ownerId: 'user-004' },
  { id: 'org-test-005', name: 'Finance PR Frankfurt', ownerId: 'user-005' },
  { id: 'org-test-006', name: 'Healthcare PR Köln', ownerId: 'user-006' },
  { id: 'org-test-007', name: 'Food & Beverage PR Düsseldorf', ownerId: 'user-007' },
  { id: 'org-test-008', name: 'Sports Marketing Agency', ownerId: 'user-008' },
  { id: 'org-test-009', name: 'Real Estate PR', ownerId: 'user-009' },
  { id: 'org-test-010', name: 'Consulting Firm', ownerId: 'user-010' },
];

// ============================================================================
// CATEGORY A: PERFECT MATCHES (50 Szenarien)
// ============================================================================

const CATEGORY_A_PERFECT_MATCHES = {
  // Große deutsche Medien mit perfekten Matches
  companies: [
    { id: 'comp-a-001', name: 'Spiegel Verlag', website: 'spiegel.de' },
    { id: 'comp-a-002', name: 'Axel Springer SE', website: 'axelspringer.com' },
    { id: 'comp-a-003', name: 'Süddeutsche Zeitung GmbH', website: 'sueddeutsche.de' },
    { id: 'comp-a-004', name: 'Zeit Verlag', website: 'zeit.de' },
    { id: 'comp-a-005', name: 'Frankfurter Allgemeine Zeitung GmbH', website: 'faz.net' },
    { id: 'comp-a-006', name: 'RTL Deutschland GmbH', website: 'rtl.de' },
    { id: 'comp-a-007', name: 'ProSiebenSat.1 Media SE', website: 'prosiebensat1.com' },
    { id: 'comp-a-008', name: 'Handelsblatt Media Group', website: 'handelsblatt.com' },
    { id: 'comp-a-009', name: 'Gruner + Jahr', website: 'guj.de' },
    { id: 'comp-a-010', name: 'Funke Mediengruppe', website: 'funkemedien.de' },
  ],

  publications: [
    {
      id: 'pub-a-001',
      name: 'Der Spiegel',
      companyId: 'comp-a-001',
      website: 'spiegel.de',
      monitoringConfig: {
        isEnabled: true,
        websiteUrl: 'https://www.spiegel.de',
        rssFeedUrls: ['https://www.spiegel.de/schlagzeilen/index.rss', 'https://www.spiegel.de/politik/index.rss'],
        autoDetectRss: true,
        checkFrequency: 'twice_daily' as const,
        keywords: ['Politik', 'Wirtschaft'],
        totalArticlesFound: 0
      }
    },
    {
      id: 'pub-a-002',
      name: 'Spiegel Online',
      companyId: 'comp-a-001',
      website: 'spiegel.de',
      monitoringConfig: {
        isEnabled: true,
        websiteUrl: 'https://www.spiegel.de',
        rssFeedUrls: ['https://www.spiegel.de/schlagzeilen/index.rss'],
        autoDetectRss: true,
        checkFrequency: 'twice_daily' as const,
        keywords: [],
        totalArticlesFound: 0
      }
    },
    {
      id: 'pub-a-003',
      name: 'Die Welt',
      companyId: 'comp-a-002',
      website: 'welt.de',
      monitoringConfig: {
        isEnabled: true,
        websiteUrl: 'https://www.welt.de',
        rssFeedUrls: ['https://www.welt.de/feeds/latest.rss'],
        autoDetectRss: true,
        checkFrequency: 'daily' as const,
        keywords: ['Nachrichten'],
        totalArticlesFound: 0
      }
    },
    {
      id: 'pub-a-004',
      name: 'BILD',
      companyId: 'comp-a-002',
      website: 'bild.de'
      // ❌ KEIN monitoringConfig (testet Migration von alten Publications)
    },
    {
      id: 'pub-a-005',
      name: 'Süddeutsche Zeitung',
      companyId: 'comp-a-003',
      website: 'sueddeutsche.de',
      monitoringConfig: {
        isEnabled: true,
        websiteUrl: 'https://www.sueddeutsche.de',
        rssFeedUrls: ['https://rss.sueddeutsche.de/rss/TopThemen'],
        autoDetectRss: true,
        checkFrequency: 'twice_daily' as const,
        keywords: ['Politik', 'Kultur'],
        totalArticlesFound: 0
      }
    },
    {
      id: 'pub-a-006',
      name: 'Die Zeit',
      companyId: 'comp-a-004',
      website: 'zeit.de',
      monitoringConfig: {
        isEnabled: true,
        websiteUrl: 'https://www.zeit.de',
        rssFeedUrls: ['https://newsfeed.zeit.de/index'],
        autoDetectRss: true,
        checkFrequency: 'daily' as const,
        keywords: [],
        totalArticlesFound: 0
      }
    },
    { id: 'pub-a-007', name: 'Zeit Online', companyId: 'comp-a-004', website: 'zeit.de' },
    {
      id: 'pub-a-008',
      name: 'Frankfurter Allgemeine Zeitung',
      companyId: 'comp-a-005',
      website: 'faz.net',
      monitoringConfig: {
        isEnabled: true,
        websiteUrl: 'https://www.faz.net',
        rssFeedUrls: ['https://www.faz.net/rss/aktuell/'],
        autoDetectRss: true,
        checkFrequency: 'twice_daily' as const,
        keywords: ['Wirtschaft', 'Politik'],
        totalArticlesFound: 0
      }
    },
    { id: 'pub-a-009', name: 'FAZ.NET', companyId: 'comp-a-005', website: 'faz.net' },
    { id: 'pub-a-010', name: 'RTL Aktuell', companyId: 'comp-a-006', website: 'rtl.de' },
    { id: 'pub-a-011', name: 'ProSieben Newstime', companyId: 'comp-a-007', website: 'prosieben.de' },
    {
      id: 'pub-a-012',
      name: 'Handelsblatt',
      companyId: 'comp-a-008',
      website: 'handelsblatt.com',
      monitoringConfig: {
        isEnabled: true,
        websiteUrl: 'https://www.handelsblatt.com',
        rssFeedUrls: ['https://www.handelsblatt.com/contentexport/feed/schlagzeilen'],
        autoDetectRss: true,
        checkFrequency: 'daily' as const,
        keywords: ['Wirtschaft', 'Finanzen'],
        totalArticlesFound: 0
      }
    },
    { id: 'pub-a-013', name: 'Stern', companyId: 'comp-a-009', website: 'stern.de' },
    { id: 'pub-a-014', name: 'GEO', companyId: 'comp-a-009', website: 'geo.de' },
    { id: 'pub-a-015', name: 'WAZ', companyId: 'comp-a-010', website: 'waz.de' },
  ],

  contacts: [
    // Spiegel-Journalisten (5 Personen)
    { id: 'cont-a-001', firstName: 'Anna', lastName: 'Schmidt', email: 'a.schmidt@spiegel.de', publicationId: 'pub-a-001', position: 'Redakteurin Politik' },
    { id: 'cont-a-002', firstName: 'Michael', lastName: 'Müller', email: 'm.mueller@spiegel.de', publicationId: 'pub-a-001', position: 'Ressortleiter Wirtschaft' },
    { id: 'cont-a-003', firstName: 'Sarah', lastName: 'Weber', email: 's.weber@spiegel.de', publicationId: 'pub-a-002', position: 'Online-Redakteurin' },
    { id: 'cont-a-004', firstName: 'Thomas', lastName: 'Becker', email: 't.becker@spiegel.de', publicationId: 'pub-a-001', position: 'Investigativ-Reporter' },
    { id: 'cont-a-005', firstName: 'Julia', lastName: 'Fischer', email: 'j.fischer@spiegel.de', publicationId: 'pub-a-002', position: 'Digital-Redakteurin' },

    // Axel Springer-Journalisten (5 Personen)
    { id: 'cont-a-006', firstName: 'Peter', lastName: 'Wagner', email: 'p.wagner@welt.de', publicationId: 'pub-a-003', position: 'Chefredakteur' },
    { id: 'cont-a-007', firstName: 'Lisa', lastName: 'Hoffmann', email: 'l.hoffmann@bild.de', publicationId: 'pub-a-004', position: 'Reporterin' },
    { id: 'cont-a-008', firstName: 'Markus', lastName: 'Schulz', email: 'm.schulz@welt.de', publicationId: 'pub-a-003', position: 'Politikredakteur' },
    { id: 'cont-a-009', firstName: 'Laura', lastName: 'Meyer', email: 'l.meyer@bild.de', publicationId: 'pub-a-004', position: 'Boulevard-Redakteurin' },
    { id: 'cont-a-010', firstName: 'Stefan', lastName: 'Koch', email: 's.koch@welt.de', publicationId: 'pub-a-003', position: 'Wirtschaftsredakteur' },

    // SZ-Journalisten (5 Personen)
    { id: 'cont-a-011', firstName: 'Claudia', lastName: 'Richter', email: 'claudia.richter@sueddeutsche.de', publicationId: 'pub-a-005', position: 'Politikredakteurin' },
    { id: 'cont-a-012', firstName: 'Andreas', lastName: 'Zimmermann', email: 'a.zimmermann@sueddeutsche.de', publicationId: 'pub-a-005', position: 'Kulturredakteur' },
    { id: 'cont-a-013', firstName: 'Katharina', lastName: 'Braun', email: 'k.braun@sueddeutsche.de', publicationId: 'pub-a-005', position: 'Investigativ-Reporterin' },
    { id: 'cont-a-014', firstName: 'Christian', lastName: 'Krüger', email: 'c.krueger@sueddeutsche.de', publicationId: 'pub-a-005', position: 'Sportredakteur' },
    { id: 'cont-a-015', firstName: 'Nina', lastName: 'Wolf', email: 'n.wolf@sueddeutsche.de', publicationId: 'pub-a-005', position: 'Feuilleton-Redakteurin' },

    // Zeit-Journalisten (5 Personen)
    { id: 'cont-a-016', firstName: 'Martin', lastName: 'Schwarz', email: 'm.schwarz@zeit.de', publicationId: 'pub-a-006', position: 'Chefkorrespondent' },
    { id: 'cont-a-017', firstName: 'Susanne', lastName: 'Neumann', email: 's.neumann@zeit.de', publicationId: 'pub-a-007', position: 'Online-Ressortleiterin' },
    { id: 'cont-a-018', firstName: 'Daniel', lastName: 'Lang', email: 'd.lang@zeit.de', publicationId: 'pub-a-006', position: 'Wirtschaftsredakteur' },
    { id: 'cont-a-019', firstName: 'Elisabeth', lastName: 'König', email: 'e.koenig@zeit.de', publicationId: 'pub-a-007', position: 'Digital-Redakteurin' },
    { id: 'cont-a-020', firstName: 'Robert', lastName: 'Hoffmann', email: 'r.hoffmann@zeit.de', publicationId: 'pub-a-006', position: 'Politikredakteur' },

    // FAZ-Journalisten (5 Personen)
    { id: 'cont-a-021', firstName: 'Johanna', lastName: 'Schneider', email: 'j.schneider@faz.de', publicationId: 'pub-a-008', position: 'Finanzredakteurin' },
    { id: 'cont-a-022', firstName: 'Wolfgang', lastName: 'Bauer', email: 'w.bauer@faz.de', publicationId: 'pub-a-008', position: 'Wirtschaftskorrespondent' },
    { id: 'cont-a-023', firstName: 'Petra', lastName: 'Schröder', email: 'p.schroeder@faz.net', publicationId: 'pub-a-009', position: 'Online-Redakteurin' },
    { id: 'cont-a-024', firstName: 'Matthias', lastName: 'Berger', email: 'm.berger@faz.de', publicationId: 'pub-a-008', position: 'Politikredakteur' },
    { id: 'cont-a-025', firstName: 'Sabine', lastName: 'Frank', email: 's.frank@faz.net', publicationId: 'pub-a-009', position: 'Digital-Ressortleiterin' },

    // RTL-Journalisten (5 Personen)
    { id: 'cont-a-026', firstName: 'Alexander', lastName: 'Hartmann', email: 'a.hartmann@rtl.de', publicationId: 'pub-a-010', position: 'Moderator RTL Aktuell' },
    { id: 'cont-a-027', firstName: 'Vanessa', lastName: 'Klein', email: 'v.klein@rtl.de', publicationId: 'pub-a-010', position: 'Reporterin' },
    { id: 'cont-a-028', firstName: 'Thorsten', lastName: 'Vogt', email: 't.vogt@rtl.de', publicationId: 'pub-a-010', position: 'Auslandskorrespondent' },
    { id: 'cont-a-029', firstName: 'Jennifer', lastName: 'Lorenz', email: 'j.lorenz@rtl.de', publicationId: 'pub-a-010', position: 'Wirtschaftsreporterin' },
    { id: 'cont-a-030', firstName: 'Oliver', lastName: 'Jung', email: 'o.jung@rtl.de', publicationId: 'pub-a-010', position: 'Sport-Reporter' },

    // ProSieben-Journalisten (5 Personen)
    { id: 'cont-a-031', firstName: 'Franziska', lastName: 'Stein', email: 'f.stein@prosieben.de', publicationId: 'pub-a-011', position: 'Nachrichtensprecherin' },
    { id: 'cont-a-032', firstName: 'Benjamin', lastName: 'Graf', email: 'b.graf@prosieben.de', publicationId: 'pub-a-011', position: 'Reporter' },
    { id: 'cont-a-033', firstName: 'Lena', lastName: 'Sommer', email: 'l.sommer@prosieben.de', publicationId: 'pub-a-011', position: 'Entertainment-Redakteurin' },
    { id: 'cont-a-034', firstName: 'Felix', lastName: 'Winter', email: 'f.winter@prosieben.de', publicationId: 'pub-a-011', position: 'Sport-Moderator' },
    { id: 'cont-a-035', firstName: 'Sophia', lastName: 'Engel', email: 's.engel@prosieben.de', publicationId: 'pub-a-011', position: 'Lifestyle-Redakteurin' },

    // Handelsblatt-Journalisten (5 Personen)
    { id: 'cont-a-036', firstName: 'Sebastian', lastName: 'Kaiser', email: 's.kaiser@handelsblatt.com', publicationId: 'pub-a-012', position: 'Finanzmarktredakteur' },
    { id: 'cont-a-037', firstName: 'Carolin', lastName: 'Herrmann', email: 'c.herrmann@handelsblatt.com', publicationId: 'pub-a-012', position: 'Börsenkorrespondentin' },
    { id: 'cont-a-038', firstName: 'Philipp', lastName: 'Werner', email: 'p.werner@handelsblatt.com', publicationId: 'pub-a-012', position: 'Chefredakteur Wirtschaft' },
    { id: 'cont-a-039', firstName: 'Christina', lastName: 'Lehmann', email: 'c.lehmann@handelsblatt.com', publicationId: 'pub-a-012', position: 'Managementredakteurin' },
    { id: 'cont-a-040', firstName: 'Dominik', lastName: 'Vogel', email: 'd.vogel@handelsblatt.com', publicationId: 'pub-a-012', position: 'Technologieredakteur' },

    // Stern-Journalisten (5 Personen)
    { id: 'cont-a-041', firstName: 'Maria', lastName: 'Huber', email: 'm.huber@stern.de', publicationId: 'pub-a-013', position: 'Politik-Ressortleiterin' },
    { id: 'cont-a-042', firstName: 'Johannes', lastName: 'Keller', email: 'j.keller@stern.de', publicationId: 'pub-a-013', position: 'Investigativ-Reporter' },
    { id: 'cont-a-043', firstName: 'Sandra', lastName: 'Fuchs', email: 's.fuchs@stern.de', publicationId: 'pub-a-013', position: 'Lifestyle-Redakteurin' },
    { id: 'cont-a-044', firstName: 'Florian', lastName: 'Schmitt', email: 'f.schmitt@stern.de', publicationId: 'pub-a-013', position: 'Sportredakteur' },
    { id: 'cont-a-045', firstName: 'Kathrin', lastName: 'Meier', email: 'k.meier@stern.de', publicationId: 'pub-a-013', position: 'Kultur-Redakteurin' },

    // GEO-Journalisten (3 Personen)
    { id: 'cont-a-046', firstName: 'Lars', lastName: 'Mayer', email: 'l.mayer@geo.de', publicationId: 'pub-a-014', position: 'Wissenschaftsredakteur' },
    { id: 'cont-a-047', firstName: 'Tanja', lastName: 'Baumann', email: 't.baumann@geo.de', publicationId: 'pub-a-014', position: 'Reise-Redakteurin' },
    { id: 'cont-a-048', firstName: 'Patrick', lastName: 'Albrecht', email: 'p.albrecht@geo.de', publicationId: 'pub-a-014', position: 'Natur-Redakteur' },

    // WAZ-Journalisten (2 Personen)
    { id: 'cont-a-049', firstName: 'Miriam', lastName: 'Götz', email: 'm.goetz@waz.de', publicationId: 'pub-a-015', position: 'Lokalredakteurin' },
    { id: 'cont-a-050', firstName: 'Ralf', lastName: 'Schuster', email: 'r.schuster@waz.de', publicationId: 'pub-a-015', position: 'Sportredakteur' },
  ]
};

// ============================================================================
// CATEGORY B: FUZZY MATCHES (50 Szenarien)
// ============================================================================

const CATEGORY_B_FUZZY_MATCHES = {
  // Companies mit leichten Abweichungen für Fuzzy Matching
  companies: [
    { id: 'comp-b-001', name: 'DPA Deutsche Presse Agentur', website: 'dpa.com' },
    { id: 'comp-b-002', name: 'Focus Magazin Verlag', website: 'focus.de' },
    { id: 'comp-b-003', name: 'Manager Magazin Verlagsgesellschaft', website: 'manager-magazin.de' },
    { id: 'comp-b-004', name: 'Capital Wirtschaftsmagazin', website: 'capital.de' },
    { id: 'comp-b-005', name: 'WirtschaftsWoche Verlag', website: 'wiwo.de' },
    { id: 'comp-b-006', name: 'Tagesspiegel Verlag', website: 'tagesspiegel.de' },
    { id: 'comp-b-007', name: 'Berliner Morgenpost Verlag', website: 'morgenpost.de' },
    { id: 'comp-b-008', name: 'Kölner Stadtanzeiger Verlag', website: 'ksta.de' },
    { id: 'comp-b-009', name: 'Münchner Merkur Verlag', website: 'merkur.de' },
    { id: 'comp-b-010', name: 'tz München Zeitungsverlag', website: 'tz.de' },
  ],

  publications: [
    { id: 'pub-b-001', name: 'Deutsche Presse-Agentur', companyId: 'comp-b-001', website: 'dpa.com' },
    { id: 'pub-b-002', name: 'Focus', companyId: 'comp-b-002', website: 'focus.de' },
    { id: 'pub-b-003', name: 'Focus Online', companyId: 'comp-b-002', website: 'focus.de' },
    { id: 'pub-b-004', name: 'Manager Magazin', companyId: 'comp-b-003', website: 'manager-magazin.de' },
    { id: 'pub-b-005', name: 'Capital', companyId: 'comp-b-004', website: 'capital.de' },
    { id: 'pub-b-006', name: 'WirtschaftsWoche', companyId: 'comp-b-005', website: 'wiwo.de' },
    { id: 'pub-b-007', name: 'Der Tagesspiegel', companyId: 'comp-b-006', website: 'tagesspiegel.de' },
    { id: 'pub-b-008', name: 'Berliner Morgenpost', companyId: 'comp-b-007', website: 'morgenpost.de' },
    { id: 'pub-b-009', name: 'Kölner Stadt-Anzeiger', companyId: 'comp-b-008', website: 'ksta.de' },
    { id: 'pub-b-010', name: 'Münchner Merkur', companyId: 'comp-b-009', website: 'merkur.de' },
    { id: 'pub-b-011', name: 'tz', companyId: 'comp-b-010', website: 'tz.de' },
  ],

  contacts: [
    // DPA-Journalisten mit verschiedenen Schreibweisen (5 Personen)
    { id: 'cont-b-001', firstName: 'Jan', lastName: 'Köhler', email: 'j.koehler@dpa.com', publicationId: 'pub-b-001', position: 'Korrespondent' },
    { id: 'cont-b-002', firstName: 'Anja', lastName: 'Schäfer', email: 'a.schaefer@dpa.com', publicationId: 'pub-b-001', position: 'Redakteurin' },
    { id: 'cont-b-003', firstName: 'Björn', lastName: 'Müller', email: 'b.mueller@dpa.de', publicationId: 'pub-b-001', position: 'Reporter' },
    { id: 'cont-b-004', firstName: 'Jörg', lastName: 'Bäcker', email: 'j.baecker@dpa.com', publicationId: 'pub-b-001', position: 'Auslandskorrespondent' },
    { id: 'cont-b-005', firstName: 'Ulrike', lastName: 'Böhm', email: 'u.boehm@dpa.com', publicationId: 'pub-b-001', position: 'Wirtschaftsredakteurin' },

    // Focus-Journalisten (5 Personen)
    { id: 'cont-b-006', firstName: 'Maximilian', lastName: 'Roth', email: 'max.roth@focus.de', publicationId: 'pub-b-002', position: 'Chefredakteur' },
    { id: 'cont-b-007', firstName: 'Isabelle', lastName: 'Frank', email: 'i.frank@focus.de', publicationId: 'pub-b-003', position: 'Online-Redakteurin' },
    { id: 'cont-b-008', firstName: 'Tim', lastName: 'Scholz', email: 'tim.scholz@focus.de', publicationId: 'pub-b-002', position: 'Politik-Ressortleiter' },
    { id: 'cont-b-009', firstName: 'Melanie', lastName: 'Hartung', email: 'm.hartung@focus.de', publicationId: 'pub-b-003', position: 'Digital-Redakteurin' },
    { id: 'cont-b-010', firstName: 'Tobias', lastName: 'Ritter', email: 't.ritter@focus.de', publicationId: 'pub-b-002', position: 'Wirtschaftsredakteur' },

    // Manager Magazin-Journalisten (5 Personen)
    { id: 'cont-b-011', firstName: 'Stephanie', lastName: 'Krause', email: 's.krause@manager-magazin.de', publicationId: 'pub-b-004', position: 'Managementredakteurin' },
    { id: 'cont-b-012', firstName: 'Henrik', lastName: 'Dietrich', email: 'h.dietrich@manager-magazin.de', publicationId: 'pub-b-004', position: 'Finanzredakteur' },
    { id: 'cont-b-013', firstName: 'Nadine', lastName: 'Ernst', email: 'n.ernst@manager-magazin.de', publicationId: 'pub-b-004', position: 'Karriere-Redakteurin' },
    { id: 'cont-b-014', firstName: 'Marco', lastName: 'Seidel', email: 'm.seidel@manager-magazin.de', publicationId: 'pub-b-004', position: 'Technologie-Redakteur' },
    { id: 'cont-b-015', firstName: 'Verena', lastName: 'Busch', email: 'v.busch@manager-magazin.de', publicationId: 'pub-b-004', position: 'Unternehmensredakteurin' },

    // Capital-Journalisten (5 Personen)
    { id: 'cont-b-016', firstName: 'Fabian', lastName: 'Brandt', email: 'f.brandt@capital.de', publicationId: 'pub-b-005', position: 'Chefredakteur' },
    { id: 'cont-b-017', firstName: 'Silvia', lastName: 'Lindner', email: 's.lindner@capital.de', publicationId: 'pub-b-005', position: 'Börsenredakteurin' },
    { id: 'cont-b-018', firstName: 'Dennis', lastName: 'Lorenz', email: 'd.lorenz@capital.de', publicationId: 'pub-b-005', position: 'Immobilienredakteur' },
    { id: 'cont-b-019', firstName: 'Kerstin', lastName: 'Winkler', email: 'k.winkler@capital.de', publicationId: 'pub-b-005', position: 'Investment-Redakteurin' },
    { id: 'cont-b-020', firstName: 'Simon', lastName: 'Bach', email: 's.bach@capital.de', publicationId: 'pub-b-005', position: 'Startup-Redakteur' },

    // WirtschaftsWoche-Journalisten (5 Personen)
    { id: 'cont-b-021', firstName: 'Cornelia', lastName: 'Schwab', email: 'c.schwab@wiwo.de', publicationId: 'pub-b-006', position: 'Chefkorrespondentin' },
    { id: 'cont-b-022', firstName: 'Henning', lastName: 'Paul', email: 'h.paul@wiwo.de', publicationId: 'pub-b-006', position: 'Wirtschaftsredakteur' },
    { id: 'cont-b-023', firstName: 'Jasmin', lastName: 'Hübner', email: 'j.huebner@wiwo.de', publicationId: 'pub-b-006', position: 'Finanzmarktredakteurin' },
    { id: 'cont-b-024', firstName: 'Maurice', lastName: 'Stein', email: 'm.stein@wiwo.de', publicationId: 'pub-b-006', position: 'Auto-Redakteur' },
    { id: 'cont-b-025', firstName: 'Daniela', lastName: 'Sauer', email: 'd.sauer@wiwo.de', publicationId: 'pub-b-006', position: 'Energie-Redakteurin' },

    // Tagesspiegel-Journalisten (5 Personen)
    { id: 'cont-b-026', firstName: 'Konstantin', lastName: 'Wolff', email: 'k.wolff@tagesspiegel.de', publicationId: 'pub-b-007', position: 'Politikredakteur' },
    { id: 'cont-b-027', firstName: 'Nicole', lastName: 'Voigt', email: 'n.voigt@tagesspiegel.de', publicationId: 'pub-b-007', position: 'Hauptstadtkorrespondentin' },
    { id: 'cont-b-028', firstName: 'Gregor', lastName: 'Ebert', email: 'g.ebert@tagesspiegel.de', publicationId: 'pub-b-007', position: 'Kultur-Redakteur' },
    { id: 'cont-b-029', firstName: 'Bianca', lastName: 'Sommer', email: 'b.sommer@tagesspiegel.de', publicationId: 'pub-b-007', position: 'Berlin-Redakteurin' },
    { id: 'cont-b-030', firstName: 'Lukas', lastName: 'Roth', email: 'l.roth@tagesspiegel.de', publicationId: 'pub-b-007', position: 'Sportredakteur' },

    // Morgenpost-Journalisten (5 Personen)
    { id: 'cont-b-031', firstName: 'Ramona', lastName: 'Schmidt', email: 'r.schmidt@morgenpost.de', publicationId: 'pub-b-008', position: 'Lokalredakteurin' },
    { id: 'cont-b-032', firstName: 'Adrian', lastName: 'Hoffmann', email: 'a.hoffmann@morgenpost.de', publicationId: 'pub-b-008', position: 'Politikredakteur' },
    { id: 'cont-b-033', firstName: 'Natalie', lastName: 'Kaiser', email: 'n.kaiser@morgenpost.de', publicationId: 'pub-b-008', position: 'Feuilleton-Redakteurin' },
    { id: 'cont-b-034', firstName: 'Robin', lastName: 'Becker', email: 'r.becker@morgenpost.de', publicationId: 'pub-b-008', position: 'Sport-Reporter' },
    { id: 'cont-b-035', firstName: 'Vanessa', lastName: 'Lang', email: 'v.lang@morgenpost.de', publicationId: 'pub-b-008', position: 'Wirtschaftsredakteurin' },

    // Kölner Stadt-Anzeiger-Journalisten (5 Personen)
    { id: 'cont-b-036', firstName: 'Benedikt', lastName: 'Herzog', email: 'b.herzog@ksta.de', publicationId: 'pub-b-009', position: 'Chefredakteur' },
    { id: 'cont-b-037', firstName: 'Yvonne', lastName: 'Schuster', email: 'y.schuster@ksta.de', publicationId: 'pub-b-009', position: 'Lokalreporterin' },
    { id: 'cont-b-038', firstName: 'Leonard', lastName: 'Kraus', email: 'l.kraus@ksta.de', publicationId: 'pub-b-009', position: 'Sportredakteur' },
    { id: 'cont-b-039', firstName: 'Hannah', lastName: 'Brandt', email: 'h.brandt@ksta.de', publicationId: 'pub-b-009', position: 'Kultur-Redakteurin' },
    { id: 'cont-b-040', firstName: 'Till', lastName: 'Engel', email: 't.engel@ksta.de', publicationId: 'pub-b-009', position: 'Wirtschaftsredakteur' },

    // Münchner Merkur-Journalisten (5 Personen)
    { id: 'cont-b-041', firstName: 'Theresa', lastName: 'Lehmann', email: 't.lehmann@merkur.de', publicationId: 'pub-b-010', position: 'Lokalredakteurin' },
    { id: 'cont-b-042', firstName: 'Jonas', lastName: 'Horn', email: 'j.horn@merkur.de', publicationId: 'pub-b-010', position: 'Bayern-Redakteur' },
    { id: 'cont-b-043', firstName: 'Rebecca', lastName: 'Stark', email: 'r.stark@merkur.de', publicationId: 'pub-b-010', position: 'Kulturredakteurin' },
    { id: 'cont-b-044', firstName: 'Niklas', lastName: 'Schreiber', email: 'n.schreiber@merkur.de', publicationId: 'pub-b-010', position: 'Sportredakteur' },
    { id: 'cont-b-045', firstName: 'Alina', lastName: 'Meier', email: 'a.meier@merkur.de', publicationId: 'pub-b-010', position: 'Wirtschaftsredakteurin' },

    // tz-Journalisten (5 Personen)
    { id: 'cont-b-046', firstName: 'Julian', lastName: 'Bergmann', email: 'j.bergmann@tz.de', publicationId: 'pub-b-011', position: 'Redakteur' },
    { id: 'cont-b-047', firstName: 'Larissa', lastName: 'Vogel', email: 'l.vogel@tz.de', publicationId: 'pub-b-011', position: 'München-Redakteurin' },
    { id: 'cont-b-048', firstName: 'Pascal', lastName: 'Franke', email: 'p.franke@tz.de', publicationId: 'pub-b-011', position: 'Sport-Reporter' },
    { id: 'cont-b-049', firstName: 'Svenja', lastName: 'Hoffmann', email: 's.hoffmann@tz.de', publicationId: 'pub-b-011', position: 'Boulevard-Redakteurin' },
    { id: 'cont-b-050', firstName: 'Nils', lastName: 'Werner', email: 'n.werner@tz.de', publicationId: 'pub-b-011', position: 'Bayern-Redakteur' },
  ]
};

// ============================================================================
// CATEGORY C: CREATE NEW (30 Szenarien)
// ============================================================================

const CATEGORY_C_CREATE_NEW = {
  // Nischen-Medien und Blogs die neu angelegt werden müssen
  contacts: [
    // Tech-Blogger (10 Personen)
    { id: 'cont-c-001', firstName: 'Kevin', lastName: 'Schulte', email: 'kevin@techblog-muenchen.de', position: 'Tech-Blogger' },
    { id: 'cont-c-002', firstName: 'Michelle', lastName: 'Braun', email: 'm.braun@startup-weekly.de', position: 'Startup-Journalistin' },
    { id: 'cont-c-003', firstName: 'David', lastName: 'Keller', email: 'david@ai-news-germany.com', position: 'KI-Journalist' },
    { id: 'cont-c-004', firstName: 'Sophie', lastName: 'Wagner', email: 's.wagner@fintech-journal.de', position: 'FinTech-Redakteurin' },
    { id: 'cont-c-005', firstName: 'Luca', lastName: 'Richter', email: 'luca@blockchain-news.de', position: 'Blockchain-Journalist' },
    { id: 'cont-c-006', firstName: 'Emma', lastName: 'Fischer', email: 'e.fischer@cyber-security-blog.de', position: 'Cyber-Security-Journalistin' },
    { id: 'cont-c-007', firstName: 'Noah', lastName: 'Becker', email: 'noah@devops-magazine.com', position: 'DevOps-Redakteur' },
    { id: 'cont-c-008', firstName: 'Mia', lastName: 'Schmidt', email: 'mia@saas-insider.de', position: 'SaaS-Journalistin' },
    { id: 'cont-c-009', firstName: 'Leon', lastName: 'Neumann', email: 'leon@cloud-computing-news.de', position: 'Cloud-Journalist' },
    { id: 'cont-c-010', firstName: 'Hannah', lastName: 'Hoffmann', email: 'h.hoffmann@data-science-weekly.com', position: 'Data-Science-Journalistin' },

    // Lifestyle & Fashion (10 Personen)
    { id: 'cont-c-011', firstName: 'Paula', lastName: 'Meyer', email: 'paula@fashion-forward-blog.de', position: 'Fashion-Bloggerin' },
    { id: 'cont-c-012', firstName: 'Elias', lastName: 'Wolf', email: 'e.wolf@mens-style-magazin.de', position: 'Mode-Redakteur' },
    { id: 'cont-c-013', firstName: 'Clara', lastName: 'Koch', email: 'clara@beauty-insider-de.com', position: 'Beauty-Journalistin' },
    { id: 'cont-c-014', firstName: 'Felix', lastName: 'Zimmermann', email: 'felix@streetwear-news.de', position: 'Streetwear-Blogger' },
    { id: 'cont-c-015', firstName: 'Lea', lastName: 'Schröder', email: 'lea@sustainable-fashion-blog.de', position: 'Nachhaltigkeits-Journalistin' },
    { id: 'cont-c-016', firstName: 'Finn', lastName: 'Krüger', email: 'finn@luxury-lifestyle-mag.de', position: 'Lifestyle-Redakteur' },
    { id: 'cont-c-017', firstName: 'Zoe', lastName: 'Berger', email: 'zoe@wellness-journal.de', position: 'Wellness-Journalistin' },
    { id: 'cont-c-018', firstName: 'Paul', lastName: 'Frank', email: 'paul@fitness-blog-berlin.de', position: 'Fitness-Blogger' },
    { id: 'cont-c-019', firstName: 'Emily', lastName: 'Herrmann', email: 'emily@vegan-lifestyle-de.com', position: 'Vegan-Lifestyle-Bloggerin' },
    { id: 'cont-c-020', firstName: 'Luis', lastName: 'Kaiser', email: 'luis@travel-blogger-germany.de', position: 'Reise-Blogger' },

    // Nischen-Journalisten (10 Personen)
    { id: 'cont-c-021', firstName: 'Charlotte', lastName: 'Scholz', email: 'c.scholz@elektromobilitaet-aktuell.de', position: 'E-Mobility-Journalistin' },
    { id: 'cont-c-022', firstName: 'Moritz', lastName: 'Huber', email: 'm.huber@drohnen-magazin.de', position: 'Drohnen-Redakteur' },
    { id: 'cont-c-023', firstName: 'Amelie', lastName: 'Lange', email: 'amelie@esports-journal.de', position: 'eSports-Journalistin' },
    { id: 'cont-c-024', firstName: 'Ben', lastName: 'Schwarz', email: 'ben@gaming-insider-de.com', position: 'Gaming-Redakteur' },
    { id: 'cont-c-025', firstName: 'Johanna', lastName: 'Vogt', email: 'j.vogt@podcast-magazine.de', position: 'Podcast-Journalistin' },
    { id: 'cont-c-026', firstName: 'Anton', lastName: 'Seidel', email: 'anton@streaming-news.de', position: 'Streaming-Redakteur' },
    { id: 'cont-c-027', firstName: 'Frieda', lastName: 'Jung', email: 'frieda@craft-beer-journal.de', position: 'Craft-Beer-Journalistin' },
    { id: 'cont-c-028', firstName: 'Henry', lastName: 'Stein', email: 'henry@whisky-magazin.de', position: 'Whisky-Redakteur' },
    { id: 'cont-c-029', firstName: 'Martha', lastName: 'Graf', email: 'martha@regional-food-blog.de', position: 'Regional-Food-Bloggerin' },
    { id: 'cont-c-030', firstName: 'Oscar', lastName: 'Winter', email: 'oscar@craft-magazin.de', position: 'Handwerk-Journalist' },
  ]
};

// ============================================================================
// CATEGORY D: CONFLICTS (40 Szenarien)
// ============================================================================

const CATEGORY_D_CONFLICTS = {
  // Companies und Publications mit verschiedenen Konflikt-Szenarien
  // Wird verteilt auf verschiedene Organisationen um Konflikte zu erzeugen

  companies: [
    // Super Majority Conflicts (≥90% - Auto-Update)
    { id: 'comp-d-001', name: 'tagesschau', website: 'tagesschau.de' },
    { id: 'comp-d-002', name: 'heute journal', website: 'zdf.de' },
    { id: 'comp-d-003', name: 'n-tv', website: 'n-tv.de' },
    { id: 'comp-d-004', name: 'phoenix', website: 'phoenix.de' },

    // Medium Majority Conflicts (70-89% - Conflict Review)
    { id: 'comp-d-005', name: 'Wirtschaftswoche', website: 'wiwo.de' },
    { id: 'comp-d-006', name: 'Spiegel', website: 'spiegel.de' },
    { id: 'comp-d-007', name: 'FAZ', website: 'faz.net' },
    { id: 'comp-d-008', name: 'SZ', website: 'sueddeutsche.de' },

    // Keep Existing (<66% - Mehrere verschiedene Varianten)
    { id: 'comp-d-009', name: 'Auto Motor Sport', website: 'auto-motor-und-sport.de' },
    { id: 'comp-d-010', name: 'Computer Bild', website: 'computerbild.de' },
  ],

  publications: [
    // Super Majority Publications
    { id: 'pub-d-001', name: 'tagesschau', companyId: 'comp-d-001', website: 'tagesschau.de' },
    { id: 'pub-d-002', name: 'heute', companyId: 'comp-d-002', website: 'zdf.de' },
    { id: 'pub-d-003', name: 'heute journal', companyId: 'comp-d-002', website: 'zdf.de' },
    { id: 'pub-d-004', name: 'n-tv Nachrichten', companyId: 'comp-d-003', website: 'n-tv.de' },
    { id: 'pub-d-005', name: 'phoenix', companyId: 'comp-d-004', website: 'phoenix.de' },

    // Medium Majority Publications
    { id: 'pub-d-006', name: 'WirtschaftsWoche', companyId: 'comp-d-005', website: 'wiwo.de' },
    { id: 'pub-d-007', name: 'WiWo', companyId: 'comp-d-005', website: 'wiwo.de' },
    { id: 'pub-d-008', name: 'Spiegel', companyId: 'comp-d-006', website: 'spiegel.de' },
    { id: 'pub-d-009', name: 'Frankfurter Allgemeine', companyId: 'comp-d-007', website: 'faz.net' },
    { id: 'pub-d-010', name: 'Süddeutsche', companyId: 'comp-d-008', website: 'sueddeutsche.de' },

    // Keep Existing Publications
    { id: 'pub-d-011', name: 'Auto Motor und Sport', companyId: 'comp-d-009', website: 'auto-motor-und-sport.de' },
    { id: 'pub-d-012', name: 'Computer Bild', companyId: 'comp-d-010', website: 'computerbild.de' },
  ],

  contacts: [
    // tagesschau - Super Majority (10 von 10 Orgs haben gleiche Daten = 100%)
    { id: 'cont-d-001', firstName: 'Caren', lastName: 'Miosga', email: 'c.miosga@tagesschau.de', publicationId: 'pub-d-001', position: 'Moderatorin' },
    { id: 'cont-d-002', firstName: 'Judith', lastName: 'Rakers', email: 'j.rakers@tagesschau.de', publicationId: 'pub-d-001', position: 'Moderatorin' },
    { id: 'cont-d-003', firstName: 'Jens', lastName: 'Riewa', email: 'j.riewa@tagesschau.de', publicationId: 'pub-d-001', position: 'Moderator' },
    { id: 'cont-d-004', firstName: 'Linda', lastName: 'Zervakis', email: 'l.zervakis@tagesschau.de', publicationId: 'pub-d-001', position: 'Moderatorin' },

    // heute journal - Super Majority
    { id: 'cont-d-005', firstName: 'Marietta', lastName: 'Slomka', email: 'm.slomka@zdf.de', publicationId: 'pub-d-003', position: 'Moderatorin' },
    { id: 'cont-d-006', firstName: 'Claus', lastName: 'Kleber', email: 'c.kleber@zdf.de', publicationId: 'pub-d-003', position: 'Moderator' },
    { id: 'cont-d-007', firstName: 'Gundula', lastName: 'Gause', email: 'g.gause@zdf.de', publicationId: 'pub-d-002', position: 'Moderatorin' },
    { id: 'cont-d-008', firstName: 'Christian', lastName: 'Sievers', email: 'c.sievers@zdf.de', publicationId: 'pub-d-002', position: 'Moderator' },

    // n-tv - Super Majority
    { id: 'cont-d-009', firstName: 'Nadja', lastName: 'Kriewald', email: 'n.kriewald@n-tv.de', publicationId: 'pub-d-004', position: 'Moderatorin' },
    { id: 'cont-d-010', firstName: 'Steffen', lastName: 'Schwarzkopf', email: 's.schwarzkopf@n-tv.de', publicationId: 'pub-d-004', position: 'Moderator' },
    { id: 'cont-d-011', firstName: 'Maren', lastName: 'Bell', email: 'm.bell@n-tv.de', publicationId: 'pub-d-004', position: 'Moderatorin' },
    { id: 'cont-d-012', firstName: 'Raimund', lastName: 'Brichta', email: 'r.brichta@n-tv.de', publicationId: 'pub-d-004', position: 'Moderator' },

    // phoenix - Super Majority
    { id: 'cont-d-013', firstName: 'Alfred', lastName: 'Schier', email: 'a.schier@phoenix.de', publicationId: 'pub-d-005', position: 'Moderator' },
    { id: 'cont-d-014', firstName: 'Michael', lastName: 'Kolz', email: 'm.kolz@phoenix.de', publicationId: 'pub-d-005', position: 'Moderator' },

    // WirtschaftsWoche - Medium Majority (7 von 10 = 70%)
    { id: 'cont-d-015', firstName: 'Beat', lastName: 'Balzli', email: 'b.balzli@wiwo.de', publicationId: 'pub-d-006', position: 'Chefredakteur' },
    { id: 'cont-d-016', firstName: 'Miriam', lastName: 'Meckel', email: 'm.meckel@wiwo.de', publicationId: 'pub-d-006', position: 'Chefredakteurin' },
    { id: 'cont-d-017', firstName: 'Dieter', lastName: 'Schnaas', email: 'd.schnaas@wiwo.de', publicationId: 'pub-d-007', position: 'Autor' },
    { id: 'cont-d-018', firstName: 'Malte', lastName: 'Fischer', email: 'm.fischer@wiwo.de', publicationId: 'pub-d-006', position: 'Redakteur' },

    // Spiegel - Medium Majority (7 von 10 = 70%)
    { id: 'cont-d-019', firstName: 'Steffen', lastName: 'Klusmann', email: 's.klusmann@spiegel.de', publicationId: 'pub-d-008', position: 'Chefredakteur' },
    { id: 'cont-d-020', firstName: 'Dirk', lastName: 'Kurbjuweit', email: 'd.kurbjuweit@spiegel.de', publicationId: 'pub-d-008', position: 'Autor' },
    { id: 'cont-d-021', firstName: 'Melanie', lastName: 'Amann', email: 'm.amann@spiegel.de', publicationId: 'pub-d-008', position: 'Redakteurin' },
    { id: 'cont-d-022', firstName: 'Gerald', lastName: 'Traufetter', email: 'g.traufetter@spiegel.de', publicationId: 'pub-d-008', position: 'Redakteur' },

    // FAZ - Medium Majority (7 von 10 = 70%)
    { id: 'cont-d-023', firstName: 'Carsten', lastName: 'Knop', email: 'c.knop@faz.de', publicationId: 'pub-d-009', position: 'Herausgeber' },
    { id: 'cont-d-024', firstName: 'Holger', lastName: 'Steltzner', email: 'h.steltzner@faz.de', publicationId: 'pub-d-009', position: 'Herausgeber' },
    { id: 'cont-d-025', firstName: 'Jasper', lastName: 'von Altenbockum', email: 'j.altenbockum@faz.de', publicationId: 'pub-d-009', position: 'Redakteur' },
    { id: 'cont-d-026', firstName: 'Patrick', lastName: 'Bernau', email: 'p.bernau@faz.de', publicationId: 'pub-d-009', position: 'Wirtschaftsredakteur' },

    // SZ - Medium Majority (7 von 10 = 70%)
    { id: 'cont-d-027', firstName: 'Wolfgang', lastName: 'Krach', email: 'w.krach@sueddeutsche.de', publicationId: 'pub-d-010', position: 'Chefredakteur' },
    { id: 'cont-d-028', firstName: 'Heribert', lastName: 'Prantl', email: 'h.prantl@sueddeutsche.de', publicationId: 'pub-d-010', position: 'Autor' },
    { id: 'cont-d-029', firstName: 'Detlef', lastName: 'Esslinger', email: 'd.esslinger@sueddeutsche.de', publicationId: 'pub-d-010', position: 'Redakteur' },
    { id: 'cont-d-030', firstName: 'Cerstin', lastName: 'Gammelin', email: 'c.gammelin@sueddeutsche.de', publicationId: 'pub-d-010', position: 'Korrespondentin' },

    // Auto Motor Sport - Keep Existing (verschiedene Varianten)
    { id: 'cont-d-031', firstName: 'Michael', lastName: 'Pfeiffer', email: 'm.pfeiffer@auto-motor-und-sport.de', publicationId: 'pub-d-011', position: 'Chefredakteur' },
    { id: 'cont-d-032', firstName: 'Jens', lastName: 'Dralle', email: 'j.dralle@auto-motor-und-sport.de', publicationId: 'pub-d-011', position: 'Testredakteur' },
    { id: 'cont-d-033', firstName: 'Dirk', lastName: 'Gulde', email: 'd.gulde@auto-motor-und-sport.de', publicationId: 'pub-d-011', position: 'Redakteur' },
    { id: 'cont-d-034', firstName: 'Sebastian', lastName: 'Renz', email: 's.renz@auto-motor-und-sport.de', publicationId: 'pub-d-011', position: 'Redakteur' },

    // Computer Bild - Keep Existing
    { id: 'cont-d-035', firstName: 'Axel', lastName: 'Telzerow', email: 'a.telzerow@computerbild.de', publicationId: 'pub-d-012', position: 'Chefredakteur' },
    { id: 'cont-d-036', firstName: 'Martin', lastName: 'Gobbin', email: 'm.gobbin@computerbild.de', publicationId: 'pub-d-012', position: 'Testredakteur' },
    { id: 'cont-d-037', firstName: 'Ingolf', lastName: 'Leschke', email: 'i.leschke@computerbild.de', publicationId: 'pub-d-012', position: 'Redakteur' },
    { id: 'cont-d-038', firstName: 'Sebastian', lastName: 'Kolar', email: 's.kolar@computerbild.de', publicationId: 'pub-d-012', position: 'Redakteur' },

    // Zusätzliche Konflikt-Contacts für AI-Merge Tests (2 Personen)
    { id: 'cont-d-039', firstName: 'Andrea', lastName: 'Müller', email: 'a.mueller@techreview.de', position: 'Tech-Journalistin' },
    { id: 'cont-d-040', firstName: 'Jan', lastName: 'Peters', email: 'j.peters@startup-szene.de', position: 'Startup-Reporter' },
  ]
};

// ============================================================================
// CATEGORY E: EDGE CASES (30 Szenarien)
// ============================================================================

const CATEGORY_E_EDGE_CASES = {
  // Freie Journalisten ohne Company/Publication (10 Personen)
  freelancers: [
    { id: 'cont-e-001', firstName: 'Sabrina', lastName: 'Müller', email: 's.mueller@freejournalist.de', position: 'Freie Journalistin' },
    { id: 'cont-e-002', firstName: 'Marcus', lastName: 'Weber', email: 'marcus@freelance-reporter.de', position: 'Freier Reporter' },
    { id: 'cont-e-003', firstName: 'Annika', lastName: 'Bauer', email: 'annika@investigative-writer.de', position: 'Freie Investigativ-Journalistin' },
    { id: 'cont-e-004', firstName: 'Philipp', lastName: 'Schmidt', email: 'phil@freelance-tech.de', position: 'Freier Tech-Journalist' },
    { id: 'cont-e-005', firstName: 'Jessica', lastName: 'Hoffmann', email: 'j.hoffmann@freejournalism.de', position: 'Freie Wirtschaftsjournalistin' },
    { id: 'cont-e-006', firstName: 'Marc', lastName: 'Fischer', email: 'marc@independent-journalist.de', position: 'Freier Journalist' },
    { id: 'cont-e-007', firstName: 'Tina', lastName: 'Schröder', email: 'tina@freelance-culture.de', position: 'Freie Kulturjournalistin' },
    { id: 'cont-e-008', firstName: 'Oliver', lastName: 'Wagner', email: 'o.wagner@freereporter.de', position: 'Freier Sportjournalist' },
    { id: 'cont-e-009', firstName: 'Karin', lastName: 'Becker', email: 'karin@independent-writer.de', position: 'Freie Autorin' },
    { id: 'cont-e-010', firstName: 'Andreas', lastName: 'Schwarz', email: 'andreas@freelance-media.de', position: 'Freier Medienjournalist' },
  ],

  // Publikationen mit Abkürzungen (Abbreviation Matching)
  abbreviations: {
    companies: [
      { id: 'comp-e-001', name: 'ARD', website: 'ard.de' },
      { id: 'comp-e-002', name: 'ZDF', website: 'zdf.de' },
      { id: 'comp-e-003', name: 'BR', website: 'br.de' },
      { id: 'comp-e-004', name: 'NDR', website: 'ndr.de' },
      { id: 'comp-e-005', name: 'WDR', website: 'wdr.de' },
    ],
    publications: [
      { id: 'pub-e-001', name: 'ARD', companyId: 'comp-e-001', website: 'ard.de' },
      { id: 'pub-e-002', name: 'Arbeitsgemeinschaft der öffentlich-rechtlichen Rundfunkanstalten', companyId: 'comp-e-001', website: 'ard.de' },
      { id: 'pub-e-003', name: 'ZDF', companyId: 'comp-e-002', website: 'zdf.de' },
      { id: 'pub-e-004', name: 'Zweites Deutsches Fernsehen', companyId: 'comp-e-002', website: 'zdf.de' },
      { id: 'pub-e-005', name: 'BR', companyId: 'comp-e-003', website: 'br.de' },
      { id: 'pub-e-006', name: 'Bayerischer Rundfunk', companyId: 'comp-e-003', website: 'br.de' },
      { id: 'pub-e-007', name: 'NDR', companyId: 'comp-e-004', website: 'ndr.de' },
      { id: 'pub-e-008', name: 'Norddeutscher Rundfunk', companyId: 'comp-e-004', website: 'ndr.de' },
      { id: 'pub-e-009', name: 'WDR', companyId: 'comp-e-005', website: 'wdr.de' },
      { id: 'pub-e-010', name: 'Westdeutscher Rundfunk', companyId: 'comp-e-005', website: 'wdr.de' },
    ],
    contacts: [
      { id: 'cont-e-011', firstName: 'Tom', lastName: 'Buhrow', email: 't.buhrow@wdr.de', publicationId: 'pub-e-009', position: 'Intendant' },
      { id: 'cont-e-012', firstName: 'Ulrich', lastName: 'Wilhelm', email: 'u.wilhelm@br.de', publicationId: 'pub-e-005', position: 'Intendant' },
      { id: 'cont-e-013', firstName: 'Joachim', lastName: 'Knuth', email: 'j.knuth@ndr.de', publicationId: 'pub-e-007', position: 'Intendant' },
      { id: 'cont-e-014', firstName: 'Thomas', lastName: 'Bellut', email: 't.bellut@zdf.de', publicationId: 'pub-e-003', position: 'Intendant' },
      { id: 'cont-e-015', firstName: 'Volker', lastName: 'Herres', email: 'v.herres@ard.de', publicationId: 'pub-e-001', position: 'Programmdirektor' },
    ]
  },

  // AI-Merge Szenarien (Contacts mit verschiedenen Varianten für Merge)
  aiMerge: [
    // 5 Journalisten die in 3+ verschiedenen Varianten existieren
    { id: 'cont-e-016', firstName: 'Dr. Markus', lastName: 'Steinberg', email: 'm.steinberg@wirtschaft-aktuell.de', position: 'Wirtschaftsredakteur', phone: '+49 89 1234567' },
    { id: 'cont-e-017', firstName: 'Prof. Christine', lastName: 'Winterberg', email: 'c.winterberg@finanz-journal.de', position: 'Finanzexpertin', phone: '+49 69 7654321', mobile: '+49 171 9876543' },
    { id: 'cont-e-018', firstName: 'Dipl.-Ing. Thomas', lastName: 'Kraftwerk', email: 't.kraftwerk@automobil-woche.de', position: 'Automobil-Journalist', phone: '+49 711 5555555' },
    { id: 'cont-e-019', firstName: 'Dr. med. Sandra', lastName: 'Gesundheit', email: 's.gesundheit@medizin-heute.de', position: 'Gesundheitsjournalistin', phone: '+49 30 8888888', mobile: '+49 170 1111111' },
    { id: 'cont-e-020', firstName: 'MBA Klaus', lastName: 'Manager', email: 'k.manager@business-news.de', position: 'Management-Redakteur', phone: '+49 40 9999999' },
  ],

  // Contacts mit ungewöhnlichen Sonderzeichen
  specialCharacters: [
    { id: 'cont-e-021', firstName: 'François', lastName: "D'Allemagne", email: 'f.dallemagne@euronews.de', position: 'Europa-Korrespondent' },
    { id: 'cont-e-022', firstName: 'María José', lastName: 'García-López', email: 'm.garcia@spanish-news.de', position: 'Spanien-Korrespondentin' },
    { id: 'cont-e-023', firstName: 'Søren', lastName: 'Jørgensen', email: 's.joergensen@skandinavien-heute.de', position: 'Skandinavien-Korrespondent' },
    { id: 'cont-e-024', firstName: 'Władysław', lastName: 'Kowalski', email: 'w.kowalski@polen-aktuell.de', position: 'Polen-Korrespondent' },
    { id: 'cont-e-025', firstName: 'Ümit', lastName: 'Çelik', email: 'u.celik@tuerkei-report.de', position: 'Türkei-Korrespondent' },
  ],

  // Email Edge Cases
  emailEdgeCases: [
    { id: 'cont-e-026', firstName: 'Anna-Maria', lastName: 'von und zu Gutenberg', email: 'anna.maria.gutenberg@adelsjournal.de', position: 'Adel-Journalistin' },
    { id: 'cont-e-027', firstName: 'Karl-Heinz', lastName: 'Müller-Schmidt', email: 'kh.mueller.schmidt@regional-zeitung.de', position: 'Lokalredakteur' },
    { id: 'cont-e-028', firstName: 'Dr.', lastName: 'Multiple-LastNames-Test', email: 'multiple@test-journal.de', position: 'Test-Journalist' },
    { id: 'cont-e-029', firstName: 'NoLastName', lastName: '', email: 'nolast@weird-publication.de', position: 'Redakteur' },
    { id: 'cont-e-030', firstName: '', lastName: 'NoFirstName', email: 'nofirst@weird-publication.de', position: 'Redakteur' },
  ]
};

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

export async function seedRealisticTestData(): Promise<ScenarioStats> {
  console.log('🚀 Starte realistischen Test-Daten Generator...');

  const stats: ScenarioStats = {
    organizations: 0,
    companies: 0,
    publications: 0,
    contacts: 0,
    scenarios: {
      perfectMatches: 0,
      fuzzyMatches: 0,
      createNew: 0,
      conflicts: 0,
      edgeCases: 0
    }
  };

  let batch = writeBatch(db);
  let operationCount = 0;
  const MAX_BATCH_SIZE = 450;

  const commitBatch = async () => {
    if (operationCount > 0) {
      await batch.commit();
      console.log(`✅ Batch committed: ${operationCount} operations`);
      batch = writeBatch(db);
      operationCount = 0;
    }
  };

  // ============================================================================
  // 1. ORGANIZATIONS ERSTELLEN (10 Test-Organisationen)
  // ============================================================================
  console.log('\n📋 Erstelle Test-Organisationen...');

  const createdOrgIds: string[] = [];

  for (const org of TEST_ORGANIZATIONS) {
    // Verwende addDoc() wie in der funktionierenden seed-test-data.ts
    const orgRef = await addDoc(collection(db, 'organizations'), {
      name: org.name,
      ownerId: org.ownerId,
      type: 'agency',
      status: 'active',
      features: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    createdOrgIds.push(orgRef.id);
    stats.organizations++;
    console.log(`  ✅ Org ${stats.organizations}/10: ${org.name}`);
  }

  console.log(`✅ ${stats.organizations} Organisationen erstellt`);

  // ============================================================================
  // 2. CATEGORY A: PERFECT MATCHES (50 Contacts über 5 Organisationen)
  // ============================================================================
  console.log('\n📊 Category A: Perfect Matches...');

  // Verteile Companies auf Org 0-2
  const orgsForA = [createdOrgIds[0], createdOrgIds[1], createdOrgIds[2]];
  let orgIndexA = 0;

  for (const company of CATEGORY_A_PERFECT_MATCHES.companies) {
    const currentOrg = orgsForA[orgIndexA % orgsForA.length];

    // Company in companies_enhanced
    const companyRef = doc(db, 'companies_enhanced', company.id);
    batch.set(companyRef, removeUndefinedFields({
      ...company,
      organizationId: currentOrg,
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    operationCount++;
    stats.companies++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexA++;
  }

  // Publications in BEIDE Collections
  for (const publication of CATEGORY_A_PERFECT_MATCHES.publications) {
    const currentOrg = orgsForA[orgIndexA % orgsForA.length];

    const publicationData = removeUndefinedFields({
      ...preparePublicationForFirestore(publication),
      organizationId: currentOrg,
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Publications nur lokal (NICHT isGlobal) - nur für Matching-Tests
    batch.set(doc(db, 'publications', publication.id), {
      ...publicationData
    });
    operationCount++;
    stats.publications++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexA++;
  }

  // Contacts - Jeder Contact in 3 Orgs (Perfect Match = hohe Übereinstimmung)
  for (const contact of CATEGORY_A_PERFECT_MATCHES.contacts) {
    // Find companyId and companyName from publicationId
    const publication = CATEGORY_A_PERFECT_MATCHES.publications.find(p => p.id === contact.publicationId);
    const companyId = publication?.companyId;
    const company = companyId ? CATEGORY_A_PERFECT_MATCHES.companies.find(c => c.id === companyId) : undefined;
    const companyName = company?.name;

    // Erstelle Contact in 3 verschiedenen Orgs
    for (let orgIdx = 0; orgIdx < 3; orgIdx++) {
      const currentOrg = orgsForA[orgIdx];
      const uniqueId = `${contact.id}-${currentOrg}`;

      const contactRef = doc(db, 'contacts_enhanced', uniqueId);
      batch.set(contactRef, removeUndefinedFields({
        id: uniqueId,
        name: {
          firstName: contact.firstName,
          lastName: contact.lastName
        },
        displayName: `${contact.firstName} ${contact.lastName}`,
        emails: contact.email ? [{ type: 'business' as const, email: contact.email, isPrimary: true }] : [],
        phones: [],
        position: contact.position,
        companyId,
        companyName,
        organizationId: currentOrg,
        mediaProfile: {
          isJournalist: true,
          beats: [],
          publicationIds: contact.publicationId ? [contact.publicationId] : [],
          mediaTypes: ['print', 'online']
        },
        deletedAt: null,
        isReference: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'seed-realistic',
        updatedBy: 'seed-realistic',
      }));
      operationCount++;
      stats.contacts++;

      if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    }
    stats.scenarios.perfectMatches++;
  }

  await commitBatch();
  console.log(`✅ Category A: ${stats.scenarios.perfectMatches} Perfect Match Szenarien erstellt`);

  // ============================================================================
  // 3. CATEGORY B: FUZZY MATCHES (50 Contacts über 5 Organisationen)
  // ============================================================================
  console.log('\n📊 Category B: Fuzzy Matches...');

  const orgsForB = [createdOrgIds[2], createdOrgIds[3], createdOrgIds[4], createdOrgIds[5]];
  let orgIndexB = 0;

  for (const company of CATEGORY_B_FUZZY_MATCHES.companies) {
    const currentOrg = orgsForB[orgIndexB % orgsForB.length];

    const companyRef = doc(db, 'companies_enhanced', company.id);
    batch.set(companyRef, removeUndefinedFields({
      ...company,
      organizationId: currentOrg,
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    operationCount++;
    stats.companies++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexB++;
  }

  for (const publication of CATEGORY_B_FUZZY_MATCHES.publications) {
    const currentOrg = orgsForB[orgIndexB % orgsForB.length];

    const publicationData = removeUndefinedFields({
      ...preparePublicationForFirestore(publication),
      organizationId: currentOrg,
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Publications nur lokal (NICHT isGlobal) - nur für Matching-Tests
    batch.set(doc(db, 'publications', publication.id), {
      ...publicationData
    });
    operationCount++;
    stats.publications++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexB++;
  }

  // Contacts - Jeder Contact in 3 Orgs (Fuzzy Match)
  for (const contact of CATEGORY_B_FUZZY_MATCHES.contacts) {
    const publication = CATEGORY_B_FUZZY_MATCHES.publications.find(p => p.id === contact.publicationId);
    const companyId = publication?.companyId;
    const company = companyId ? CATEGORY_B_FUZZY_MATCHES.companies.find(c => c.id === companyId) : undefined;
    const companyName = company?.name;

    // Erstelle Contact in 3 verschiedenen Orgs
    for (let orgIdx = 0; orgIdx < 3; orgIdx++) {
      const currentOrg = orgsForB[orgIdx];
      const uniqueId = `${contact.id}-${currentOrg}`;

      const contactRef = doc(db, 'contacts_enhanced', uniqueId);
      batch.set(contactRef, removeUndefinedFields({
        id: uniqueId,
        name: {
          firstName: contact.firstName,
          lastName: contact.lastName
        },
        displayName: `${contact.firstName} ${contact.lastName}`,
        emails: contact.email ? [{ type: 'business' as const, email: contact.email, isPrimary: true }] : [],
        phones: [],
        position: contact.position,
        companyId,
        companyName,
        organizationId: currentOrg,
        mediaProfile: {
          isJournalist: true,
          beats: [],
          publicationIds: contact.publicationId ? [contact.publicationId] : [],
          mediaTypes: ['print', 'online']
        },
        deletedAt: null,
        isReference: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'seed-realistic',
        updatedBy: 'seed-realistic',
      }));
      operationCount++;
      stats.contacts++;

      if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    }
    stats.scenarios.fuzzyMatches++;
  }

  await commitBatch();
  console.log(`✅ Category B: ${stats.scenarios.fuzzyMatches} Fuzzy Match Szenarien erstellt`);

  // ============================================================================
  // 4. CATEGORY C: CREATE NEW (30 Contacts über 5 Organisationen)
  // ============================================================================
  console.log('\n📊 Category C: Create New...');

  const orgsForC = [createdOrgIds[4], createdOrgIds[5], createdOrgIds[6], createdOrgIds[7], createdOrgIds[8]];
  let orgIndexC = 0;

  // Contacts ohne Company/Publication (sollen neu angelegt werden)
  for (const contact of CATEGORY_C_CREATE_NEW.contacts) {
    const currentOrg = orgsForC[orgIndexC % orgsForC.length];

    const contactRef = doc(db, 'contacts_enhanced', contact.id);
    batch.set(contactRef, removeUndefinedFields({
      ...contact,
      organizationId: currentOrg,
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Kein companyId, kein publicationId - soll neu angelegt werden
    }));
    operationCount++;
    stats.contacts++;
    stats.scenarios.createNew++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexC++;
  }

  await commitBatch();
  console.log(`✅ Category C: ${stats.scenarios.createNew} Create New Szenarien erstellt`);

  // ============================================================================
  // 5. CATEGORY D: CONFLICTS (40 Contacts über 10 Organisationen)
  // ============================================================================
  console.log('\n📊 Category D: Conflict Szenarien...');

  // Companies über ALLE Organisationen verteilen für Konflikt-Simulation
  for (let i = 0; i < CATEGORY_D_CONFLICTS.companies.length; i++) {
    const company = CATEGORY_D_CONFLICTS.companies[i];

    // Jede Company wird von MEHREREN Orgs erstellt (für Konflikte)
    for (let orgIdx = 0; orgIdx < createdOrgIds.length; orgIdx++) {
      const currentOrg = createdOrgIds[orgIdx];
      const uniqueId = `${company.id}-${currentOrg}`;

      const companyRef = doc(db, 'companies_enhanced', uniqueId);
      batch.set(companyRef, {
        ...company,
        organizationId: currentOrg,
        deletedAt: null,
        isReference: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      operationCount++;
      stats.companies++;

      if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    }
  }

  // Publications über ALLE Organisationen verteilen
  for (let i = 0; i < CATEGORY_D_CONFLICTS.publications.length; i++) {
    const publication = CATEGORY_D_CONFLICTS.publications[i];

    for (let orgIdx = 0; orgIdx < createdOrgIds.length; orgIdx++) {
      const currentOrg = createdOrgIds[orgIdx];
      const uniqueId = `${publication.id}-${currentOrg}`;
      const companyUniqueId = `${publication.companyId}-${currentOrg}`;

      const publicationData = removeUndefinedFields({
        ...preparePublicationForFirestore(publication),
        companyId: companyUniqueId,
        organizationId: currentOrg,
        deletedAt: null,
        isReference: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Publications nur lokal (NICHT isGlobal) - nur für Matching-Tests
      batch.set(doc(db, 'publications', uniqueId), {
        ...publicationData
      });
      operationCount++;
      stats.publications++;

      if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    }
  }

  // Contacts mit verschiedenen Majority-Levels
  // Super Majority: 10/10 Orgs haben identische Daten (cont-d-001 bis cont-d-014)
  // Medium Majority: 7/10 Orgs haben identische Daten (cont-d-015 bis cont-d-030)
  // Keep Existing: Diverse Varianten über alle Orgs (cont-d-031 bis cont-d-040)

  for (const contact of CATEGORY_D_CONFLICTS.contacts) {
    const contactIndex = parseInt(contact.id.split('-').pop() || '0');

    let numOrgs = 10; // Default: Super Majority
    if (contactIndex >= 15 && contactIndex <= 30) {
      numOrgs = 7; // Medium Majority
    } else if (contactIndex >= 31) {
      numOrgs = 10; // Keep Existing (alle Orgs aber verschiedene Daten)
    }

    for (let orgIdx = 0; orgIdx < numOrgs; orgIdx++) {
      const currentOrg = createdOrgIds[orgIdx];
      const uniqueId = `${contact.id}-${currentOrg}`;

      const publication = CATEGORY_D_CONFLICTS.publications.find(p => p.id === contact.publicationId);
      const publicationUniqueId = publication ? `${publication.id}-${currentOrg}` : undefined;
      const companyUniqueId = publication ? `${publication.companyId}-${currentOrg}` : undefined;

      // Hole Company Name
      const company = publication ? CATEGORY_D_CONFLICTS.companies.find(c => c.id === publication.companyId) : undefined;
      const companyName = company?.name;

      // Für Keep Existing: Leichte Variationen in den Daten
      let contactData = { ...contact };
      if (contactIndex >= 31 && orgIdx % 3 === 0) {
        // Jede 3. Org hat leicht andere Daten
        contactData = {
          ...contact,
          position: `${contact.position} (Variante ${orgIdx + 1})`,
          phone: contact.phone ? `+49 ${orgIdx}${orgIdx} 12345678` : undefined,
        };
      }

      const contactRef = doc(db, 'contacts_enhanced', uniqueId);

      // Entferne undefined Felder für Firestore
      const cleanedData: any = {
        id: uniqueId,
        name: {
          firstName: contactData.firstName,
          lastName: contactData.lastName
        },
        displayName: `${contactData.firstName} ${contactData.lastName}`,
        emails: contactData.email ? [{ type: 'business' as const, email: contactData.email, isPrimary: true }] : [],
        phones: contactData.phone ? [{ type: 'business' as const, number: contactData.phone, isPrimary: true }] : [],
        position: contactData.position,
        organizationId: currentOrg,
        mediaProfile: {
          isJournalist: true,
          beats: [],
          publicationIds: publicationUniqueId ? [publicationUniqueId] : [],
          mediaTypes: ['print', 'online']
        },
        deletedAt: null,
        isReference: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'seed-realistic',
        updatedBy: 'seed-realistic',
      };

      if (publicationUniqueId) cleanedData.publicationId = publicationUniqueId;
      if (companyUniqueId) cleanedData.companyId = companyUniqueId;
      if (companyName) cleanedData.companyName = companyName;

      // Entferne undefined Felder aus contactData
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
        }
      });

      batch.set(contactRef, cleanedData);
      operationCount++;
      stats.contacts++;

      if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    }
    stats.scenarios.conflicts++;
  }

  await commitBatch();
  console.log(`✅ Category D: ${stats.scenarios.conflicts} Conflict Szenarien erstellt`);

  // ============================================================================
  // 6. CATEGORY E: EDGE CASES (30 Szenarien)
  // ============================================================================
  console.log('\n📊 Category E: Edge Cases...');

  const orgsForE = [createdOrgIds[6], createdOrgIds[7], createdOrgIds[8], createdOrgIds[9]];
  let orgIndexE = 0;

  // Freie Journalisten (ohne Company/Publication)
  for (const contact of CATEGORY_E_EDGE_CASES.freelancers) {
    const currentOrg = orgsForE[orgIndexE % orgsForE.length];

    const contactRef = doc(db, 'contacts_enhanced', contact.id);
    batch.set(contactRef, removeUndefinedFields({
      id: contact.id,
      name: {
        firstName: contact.firstName,
        lastName: contact.lastName
      },
      displayName: `${contact.firstName} ${contact.lastName}`,
      emails: contact.email ? [{ type: 'business' as const, email: contact.email, isPrimary: true }] : [],
      phones: [],
      position: contact.position,
      organizationId: currentOrg,
      mediaProfile: {
        isJournalist: true,
        beats: [],
        publicationIds: [],
        mediaTypes: ['online']
      },
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'seed-realistic',
      updatedBy: 'seed-realistic',
    }));
    operationCount++;
    stats.contacts++;
    stats.scenarios.edgeCases++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexE++;
  }

  // Abbreviation Matching: Companies
  for (const company of CATEGORY_E_EDGE_CASES.abbreviations.companies) {
    const currentOrg = orgsForE[orgIndexE % orgsForE.length];

    const companyRef = doc(db, 'companies_enhanced', company.id);
    batch.set(companyRef, removeUndefinedFields({
      ...company,
      organizationId: currentOrg,
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    operationCount++;
    stats.companies++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexE++;
  }

  // Abbreviation Matching: Publications
  for (const publication of CATEGORY_E_EDGE_CASES.abbreviations.publications) {
    const currentOrg = orgsForE[orgIndexE % orgsForE.length];

    const publicationData = removeUndefinedFields({
      ...preparePublicationForFirestore(publication),
      organizationId: currentOrg,
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Publications nur lokal (NICHT isGlobal) - nur für Matching-Tests
    batch.set(doc(db, 'publications', publication.id), {
      ...publicationData
    });
    operationCount++;
    stats.publications++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexE++;
  }

  // Abbreviation Matching: Contacts
  for (const contact of CATEGORY_E_EDGE_CASES.abbreviations.contacts) {
    const currentOrg = orgsForE[orgIndexE % orgsForE.length];

    const publication = CATEGORY_E_EDGE_CASES.abbreviations.publications.find(p => p.id === contact.publicationId);
    const companyId = publication?.companyId;
    const company = companyId ? CATEGORY_E_EDGE_CASES.abbreviations.companies.find(c => c.id === companyId) : undefined;
    const companyName = company?.name;

    const contactRef = doc(db, 'contacts_enhanced', contact.id);
    batch.set(contactRef, removeUndefinedFields({
      ...contact,
      companyId,
      companyName,
      organizationId: currentOrg,
      mediaProfile: {
        isJournalist: true,
        beats: [],
        publicationIds: contact.publicationId ? [contact.publicationId] : [],
        mediaTypes: ['print', 'online']
      },
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    operationCount++;
    stats.contacts++;
    stats.scenarios.edgeCases++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexE++;
  }

  // AI-Merge Szenarien (mit Varianten)
  for (const contact of CATEGORY_E_EDGE_CASES.aiMerge) {
    // Erstelle 3 Varianten pro Contact über verschiedene Orgs
    for (let variant = 0; variant < 3; variant++) {
      const currentOrg = orgsForE[(orgIndexE + variant) % orgsForE.length];
      const uniqueId = `${contact.id}-variant-${variant + 1}`;

      // Variationen in den Daten
      const variantData = {
        ...contact,
        position: variant === 0 ? contact.position : `${contact.position} (Alt${variant})`,
        mobile: variant === 1 ? contact.mobile : variant === 2 ? '+49 170 9999999' : undefined,
      };

      const contactRef = doc(db, 'contacts_enhanced', uniqueId);
      batch.set(contactRef, removeUndefinedFields({
        id: uniqueId,
        name: {
          firstName: variantData.firstName,
          lastName: variantData.lastName
        },
        displayName: `${variantData.firstName} ${variantData.lastName}`,
        emails: variantData.email ? [{ type: 'business' as const, email: variantData.email, isPrimary: true }] : [],
        phones: variantData.mobile ? [{ type: 'mobile' as const, number: variantData.mobile, isPrimary: true }] : [],
        position: variantData.position,
        organizationId: currentOrg,
        mediaProfile: {
          isJournalist: true,
          beats: [],
          publicationIds: [],
          mediaTypes: ['online']
        },
        deletedAt: null,
        isReference: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'seed-realistic',
        updatedBy: 'seed-realistic',
      }));
      operationCount++;
      stats.contacts++;

      if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    }
    stats.scenarios.edgeCases++;
    orgIndexE++;
  }

  // Special Characters
  for (const contact of CATEGORY_E_EDGE_CASES.specialCharacters) {
    const currentOrg = orgsForE[orgIndexE % orgsForE.length];

    const contactRef = doc(db, 'contacts_enhanced', contact.id);
    batch.set(contactRef, removeUndefinedFields({
      id: contact.id,
      name: {
        firstName: contact.firstName,
        lastName: contact.lastName
      },
      displayName: `${contact.firstName} ${contact.lastName}`,
      emails: contact.email ? [{ type: 'business' as const, email: contact.email, isPrimary: true }] : [],
      phones: [],
      position: contact.position,
      organizationId: currentOrg,
      mediaProfile: {
        isJournalist: true,
        beats: [],
        publicationIds: [],
        mediaTypes: ['online']
      },
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'seed-realistic',
      updatedBy: 'seed-realistic',
    }));
    operationCount++;
    stats.contacts++;
    stats.scenarios.edgeCases++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexE++;
  }

  // Email Edge Cases
  for (const contact of CATEGORY_E_EDGE_CASES.emailEdgeCases) {
    const currentOrg = orgsForE[orgIndexE % orgsForE.length];

    const contactRef = doc(db, 'contacts_enhanced', contact.id);
    batch.set(contactRef, removeUndefinedFields({
      id: contact.id,
      name: {
        firstName: contact.firstName,
        lastName: contact.lastName
      },
      displayName: `${contact.firstName} ${contact.lastName}`,
      emails: contact.email ? [{ type: 'business' as const, email: contact.email, isPrimary: true }] : [],
      phones: [],
      position: contact.position,
      organizationId: currentOrg,
      mediaProfile: {
        isJournalist: true,
        beats: [],
        publicationIds: [],
        mediaTypes: ['online']
      },
      deletedAt: null,
      isReference: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'seed-realistic',
      updatedBy: 'seed-realistic',
    }));
    operationCount++;
    stats.contacts++;
    stats.scenarios.edgeCases++;

    if (operationCount >= MAX_BATCH_SIZE) await commitBatch();
    orgIndexE++;
  }

  await commitBatch();
  console.log(`✅ Category E: ${stats.scenarios.edgeCases} Edge Case Szenarien erstellt`);

  // ============================================================================
  // FINAL STATS
  // ============================================================================
  console.log('\n✅ Realistische Test-Daten erfolgreich erstellt!');
  console.log('\n📊 ZUSAMMENFASSUNG:');
  console.log(`   Organizations: ${stats.organizations}`);
  console.log(`   Companies: ${stats.companies}`);
  console.log(`   Publications: ${stats.publications}`);
  console.log(`   Contacts: ${stats.contacts}`);
  console.log('\n📊 SZENARIEN:');
  console.log(`   ✅ Perfect Matches: ${stats.scenarios.perfectMatches}`);
  console.log(`   🔍 Fuzzy Matches: ${stats.scenarios.fuzzyMatches}`);
  console.log(`   ➕ Create New: ${stats.scenarios.createNew}`);
  console.log(`   ⚠️  Conflicts: ${stats.scenarios.conflicts}`);
  console.log(`   🎯 Edge Cases: ${stats.scenarios.edgeCases}`);
  console.log(`   📈 TOTAL: ${Object.values(stats.scenarios).reduce((a, b) => a + b, 0)} Szenarien`);

  return stats;
}

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================

export async function cleanupRealisticTestData(): Promise<void> {
  console.log('🧹 Starte Cleanup von realistischen Test-Daten...');

  let deletedOrgs = 0;
  let deletedCompanies = 0;
  let deletedPublications = 0;
  let deletedContacts = 0;

  // ============================================================================
  // 1. ORGANIZATIONS LÖSCHEN - Finde alle mit "PR Agentur", "Tech Startup", etc.
  // ============================================================================
  console.log('\n🗑️  Lösche Test-Organisationen...');

  // Finde alle Organisationen mit Test-Namen
  const testOrgNames = TEST_ORGANIZATIONS.map(org => org.name);
  const orgsSnapshot = await getDocs(collection(db, 'organizations'));
  const testOrgIds: string[] = [];

  orgsSnapshot.forEach((doc) => {
    const orgData = doc.data();
    if (testOrgNames.includes(orgData.name)) {
      testOrgIds.push(doc.id);
    }
  });

  for (const orgId of testOrgIds) {
    try {
      await deleteDoc(doc(db, 'organizations', orgId));
      deletedOrgs++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Organization ${orgId}:`, error);
    }
  }
  console.log(`✅ ${deletedOrgs} Organisationen gelöscht`);

  // ============================================================================
  // 2. COMPANIES LÖSCHEN
  // ============================================================================
  console.log('\n🗑️  Lösche Companies...');

  // Category A Companies
  for (const company of CATEGORY_A_PERFECT_MATCHES.companies) {
    try {
      await deleteDoc(doc(db, 'companies_enhanced', company.id));
      deletedCompanies++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Company ${company.id}:`, error);
    }
  }

  // Category B Companies
  for (const company of CATEGORY_B_FUZZY_MATCHES.companies) {
    try {
      await deleteDoc(doc(db, 'companies_enhanced', company.id));
      deletedCompanies++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Company ${company.id}:`, error);
    }
  }

  // Category D Companies (über alle Orgs)
  for (const company of CATEGORY_D_CONFLICTS.companies) {
    for (const orgId of testOrgIds) {
      const uniqueId = `${company.id}-${orgId}`;
      try {
        await deleteDoc(doc(db, 'companies_enhanced', uniqueId));
        deletedCompanies++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Company ${uniqueId}:`, error);
      }
    }
  }

  // Category E Companies (Abbreviations)
  for (const company of CATEGORY_E_EDGE_CASES.abbreviations.companies) {
    try {
      await deleteDoc(doc(db, 'companies_enhanced', company.id));
      deletedCompanies++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Company ${company.id}:`, error);
    }
  }

  console.log(`✅ ${deletedCompanies} Companies gelöscht`);

  // ============================================================================
  // 3. PUBLICATIONS LÖSCHEN (aus BEIDEN Collections)
  // ============================================================================
  console.log('\n🗑️  Lösche Publications...');

  // Category A Publications
  for (const publication of CATEGORY_A_PERFECT_MATCHES.publications) {
    try {
      await deleteDoc(doc(db, 'publications', publication.id));
      deletedPublications++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Publication ${publication.id}:`, error);
    }
  }

  // Category B Publications
  for (const publication of CATEGORY_B_FUZZY_MATCHES.publications) {
    try {
      await deleteDoc(doc(db, 'publications', publication.id));
      deletedPublications++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Publication ${publication.id}:`, error);
    }
  }

  // Category D Publications (über alle Orgs)
  for (const publication of CATEGORY_D_CONFLICTS.publications) {
    for (const orgId of testOrgIds) {
      const uniqueId = `${publication.id}-${orgId}`;
      try {
        await deleteDoc(doc(db, 'publications', uniqueId));
        deletedPublications++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Publication ${uniqueId}:`, error);
      }
    }
  }

  // Category E Publications (Abbreviations)
  for (const publication of CATEGORY_E_EDGE_CASES.abbreviations.publications) {
    try {
      await deleteDoc(doc(db, 'publications', publication.id));
      deletedPublications++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Publication ${publication.id}:`, error);
    }
  }

  console.log(`✅ ${deletedPublications} Publications gelöscht`);

  // ============================================================================
  // 4. CONTACTS LÖSCHEN
  // ============================================================================
  console.log('\n🗑️  Lösche Contacts...');

  // Category A Contacts (über 3 Orgs)
  const orgsForCleanupA = testOrgIds.slice(0, 3);
  for (const contact of CATEGORY_A_PERFECT_MATCHES.contacts) {
    for (const orgId of orgsForCleanupA) {
      const uniqueId = `${contact.id}-${orgId}`;
      try {
        await deleteDoc(doc(db, 'contacts_enhanced', uniqueId));
        deletedContacts++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Contact ${uniqueId}:`, error);
      }
    }
  }

  // Category B Contacts (über 3 Orgs)
  const orgsForCleanupB = testOrgIds.slice(2, 6);
  for (const contact of CATEGORY_B_FUZZY_MATCHES.contacts) {
    for (const orgId of orgsForCleanupB) {
      const uniqueId = `${contact.id}-${orgId}`;
      try {
        await deleteDoc(doc(db, 'contacts_enhanced', uniqueId));
        deletedContacts++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Contact ${uniqueId}:`, error);
      }
    }
  }

  // Category C Contacts
  for (const contact of CATEGORY_C_CREATE_NEW.contacts) {
    try {
      await deleteDoc(doc(db, 'contacts_enhanced', contact.id));
      deletedContacts++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Contact ${contact.id}:`, error);
    }
  }

  // Category D Contacts (über mehrere Orgs je nach Majority-Level)
  for (const contact of CATEGORY_D_CONFLICTS.contacts) {
    const contactIndex = parseInt(contact.id.split('-').pop() || '0');

    let numOrgs = 10; // Default: Super Majority
    if (contactIndex >= 15 && contactIndex <= 30) {
      numOrgs = 7; // Medium Majority
    } else if (contactIndex >= 31) {
      numOrgs = 10; // Keep Existing
    }

    for (let orgIdx = 0; orgIdx < Math.min(numOrgs, testOrgIds.length); orgIdx++) {
      const currentOrg = testOrgIds[orgIdx];
      const uniqueId = `${contact.id}-${currentOrg}`;
      try {
        await deleteDoc(doc(db, 'contacts_enhanced', uniqueId));
        deletedContacts++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Contact ${uniqueId}:`, error);
      }
    }
  }

  // Category E Contacts: Freelancers
  for (const contact of CATEGORY_E_EDGE_CASES.freelancers) {
    try {
      await deleteDoc(doc(db, 'contacts_enhanced', contact.id));
      deletedContacts++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Contact ${contact.id}:`, error);
    }
  }

  // Category E Contacts: Abbreviations
  for (const contact of CATEGORY_E_EDGE_CASES.abbreviations.contacts) {
    try {
      await deleteDoc(doc(db, 'contacts_enhanced', contact.id));
      deletedContacts++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Contact ${contact.id}:`, error);
    }
  }

  // Category E Contacts: AI-Merge (mit Varianten)
  for (const contact of CATEGORY_E_EDGE_CASES.aiMerge) {
    for (let variant = 0; variant < 3; variant++) {
      const uniqueId = `${contact.id}-variant-${variant + 1}`;
      try {
        await deleteDoc(doc(db, 'contacts_enhanced', uniqueId));
        deletedContacts++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Contact ${uniqueId}:`, error);
      }
    }
  }

  // Category E Contacts: Special Characters
  for (const contact of CATEGORY_E_EDGE_CASES.specialCharacters) {
    try {
      await deleteDoc(doc(db, 'contacts_enhanced', contact.id));
      deletedContacts++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Contact ${contact.id}:`, error);
    }
  }

  // Category E Contacts: Email Edge Cases
  for (const contact of CATEGORY_E_EDGE_CASES.emailEdgeCases) {
    try {
      await deleteDoc(doc(db, 'contacts_enhanced', contact.id));
      deletedContacts++;
    } catch (error) {
      console.error(`Fehler beim Löschen von Contact ${contact.id}:`, error);
    }
  }

  console.log(`✅ ${deletedContacts} Contacts gelöscht`);

  // ============================================================================
  // 5. MATCHING CANDIDATES LÖSCHEN (ALLE!)
  // ============================================================================
  console.log('\n🗑️  Lösche ALLE Matching Candidates...');

  let deletedCandidates = 0;

  try {
    const candidatesSnapshot = await getDocs(collection(db, 'matching_candidates'));
    console.log(`   Gefunden: ${candidatesSnapshot.size} Kandidaten`);

    for (const candidateDoc of candidatesSnapshot.docs) {
      try {
        await deleteDoc(candidateDoc.ref);
        deletedCandidates++;
      } catch (error) {
        console.error(`Fehler beim Löschen von Candidate ${candidateDoc.id}:`, error);
      }
    }

    console.log(`✅ ${deletedCandidates} Matching Candidates gelöscht`);
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Matching Candidates:', error);
  }

  // ============================================================================
  // FINAL STATS
  // ============================================================================
  console.log('\n✅ Cleanup abgeschlossen!');
  console.log('\n📊 GELÖSCHT:');
  console.log(`   Organizations: ${deletedOrgs}`);
  console.log(`   Companies: ${deletedCompanies}`);
  console.log(`   Publications: ${deletedPublications}`);
  console.log(`   Contacts: ${deletedContacts}`);
  console.log(`   Matching Candidates: ${deletedCandidates}`);
  console.log(`   📈 TOTAL: ${deletedOrgs + deletedCompanies + deletedPublications + deletedContacts + deletedCandidates} Dokumente`);
}

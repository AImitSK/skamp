# Matching System Test-Daten Master-Plan

> **Ziel**: Comprehensive Test-Daten für ALLE Matching-Szenarien, um das gesamte Intelligent Matching System realistisch und automatisiert zu testen.

---

## 📋 Was muss getestet werden?

### 1. **Company Matching** (company-finder.ts)
- ✅ Exakte Namens-Übereinstimmung
- ✅ Fuzzy-Matching (Tippfehler, Varianten)
- ✅ Domain-basiertes Matching (E-Mail-Domains)
- ✅ Datenbank-Analyse (Mehrheit von Kontakten nutzt Company X)
- ✅ Company erstellen (falls keine gefunden)
- ❌ Keine Company gefunden → Kontakt ohne Company

### 2. **Publication Matching** (publication-finder.ts)
- ✅ Exakte Namens-Übereinstimmung
- ✅ Fuzzy-Matching + Abkürzungen (SZ → Süddeutsche Zeitung)
- ✅ Domain-basiertes Matching
- ✅ Datenbank-Analyse (Domain-Pattern)
- ✅ Publication erstellen (falls keine gefunden)
- ⚠️ **KRITISCH**: Publications NUR wenn Company vorhanden!

### 3. **String Similarity** (string-similarity.ts)
- ✅ Levenshtein-Distance Berechnung
- ✅ Normalisierung (Umlaute, Rechtsformen, Whitespace)
- ✅ Domain-Extraktion (URLs, E-Mails)
- ✅ Abkürzungen (FAZ, SZ, etc.)

### 4. **Data Merger** (data-merger.ts - KI)
- ✅ Merging von 2+ Varianten
- ✅ Beste Daten auswählen (vollständigster Name, geschäftliche E-Mail)
- ✅ Beats kombinieren
- ✅ Duplikate entfernen
- ✅ Fallback auf mechanisches Merge

### 5. **Enrichment Engine** (enrichment-engine.ts)
- ✅ Fehlende Felder ergänzen (Website, Telefon, Adresse)
- ✅ Confidence-basierte Anreicherung (≥2 Varianten = Update)
- ✅ Vollständigkeits-Score berechnen

### 6. **Conflict Resolver** (conflict-resolver.ts)
- ✅ **Stufe 1**: Auto-Update (≥90% Majority, ≥3 Varianten)
- ✅ **Stufe 2**: Conflict-Review (66-90% Majority)
- ✅ **Stufe 3**: Keep Existing (<66% Majority)
- ✅ Alter-Bonus (alte Werte → höhere Update-Wahrscheinlichkeit)
- ✅ Manual-Entry-Schutz (heute manuell eingegeben → NICHT auto-update)

### 7. **Import-Flow** (matching-service.ts)
- ✅ Vollständiger Import: Company → Publications → Contact
- ✅ Import ohne Company (Freier Journalist)
- ✅ Import ohne Publications (Nicht-Journalist)
- ✅ AI-Merge bei mehreren Varianten
- ✅ Audit Trail

---

## 🎯 Test-Szenarien Kategorien

### **Kategorie A: Perfect Matches (Easy Cases)**
Ziel: Alles matched perfekt, keine Konflikte

### **Kategorie B: Fuzzy Matches (Medium Cases)**
Ziel: Names ähnlich, Domains helfen, Konfidenz 80-95%

### **Kategorie C: Create New (No Matches)**
Ziel: Nichts gefunden → neue Entities erstellen

### **Kategorie D: Conflicts (Hard Cases)**
Ziel: Mehrere Varianten, Konflikte auslösen, 3-Tier System testen

### **Kategorie E: Edge Cases**
Ziel: Spezialfälle, KI-Merge, Abkürzungen, etc.

---

## 📊 Test-Daten Struktur

```typescript
interface TestScenario {
  id: string;
  category: 'A' | 'B' | 'C' | 'D' | 'E';
  name: string;
  description: string;

  // Setup: Was muss vorhanden sein?
  setup: {
    existingCompanies: Company[];
    existingPublications: Publication[];
    existingContacts: Contact[];
  };

  // Input: Welche Kandidaten-Varianten?
  candidateVariants: MatchingCandidateVariant[];

  // Expected: Was soll passieren?
  expected: {
    companyMatch: {
      found: boolean;
      created: boolean;
      companyName: string;
      matchType: 'exact' | 'fuzzy' | 'domain' | 'database' | 'created';
      confidence: number;
    };
    publicationMatches: {
      found: number;
      created: number;
      names: string[];
    };
    enrichment: {
      fieldsAdded: string[];
      fieldsUpdated: string[];
    };
    conflicts: {
      count: number;
      fields: string[];
      actions: ('auto_updated' | 'flagged_for_review' | 'kept_existing')[];
    };
    contactCreated: boolean;
  };
}
```

---

## 🧪 Konkrete Test-Szenarien

### **A1: Perfect Match - Spiegel Journalist**
```typescript
{
  id: 'A1',
  category: 'A',
  name: 'Perfect Match - Spiegel Journalist',
  description: 'Journalist von Der Spiegel, Company und Publication existieren bereits exakt',

  setup: {
    existingCompanies: [
      { id: 'comp-001', name: 'Spiegel Verlag', website: 'spiegel.de' }
    ],
    existingPublications: [
      { id: 'pub-001', name: 'Der Spiegel', companyId: 'comp-001' },
      { id: 'pub-002', name: 'Spiegel Online', companyId: 'comp-001' }
    ],
    existingContacts: []
  },

  candidateVariants: [
    {
      organizationId: 'org-001',
      organizationName: 'Premium Media GmbH',
      contactData: {
        name: { firstName: 'Max', lastName: 'Müller' },
        displayName: 'Max Müller',
        emails: [{ email: 'max.mueller@spiegel.de', isPrimary: true }],
        companyName: 'Spiegel Verlag',
        hasMediaProfile: true,
        publications: ['Der Spiegel', 'Spiegel Online'],
        beats: ['Politik', 'Wirtschaft']
      }
    }
  ],

  expected: {
    companyMatch: {
      found: true,
      created: false,
      companyName: 'Spiegel Verlag',
      matchType: 'exact',
      confidence: 100
    },
    publicationMatches: {
      found: 2,
      created: 0,
      names: ['Der Spiegel', 'Spiegel Online']
    },
    enrichment: {
      fieldsAdded: [],
      fieldsUpdated: []
    },
    conflicts: {
      count: 0,
      fields: [],
      actions: []
    },
    contactCreated: true
  }
}
```

### **B1: Fuzzy Match - Tippfehler in Company-Name**
```typescript
{
  id: 'B1',
  category: 'B',
  name: 'Fuzzy Match - Tippfehler im Company-Namen',
  description: 'Company-Name hat Tippfehler, aber Fuzzy-Matching findet es trotzdem',

  setup: {
    existingCompanies: [
      { id: 'comp-002', name: 'Süddeutsche Zeitung Verlag', website: 'sueddeutsche.de' }
    ],
    existingPublications: [
      { id: 'pub-003', name: 'Süddeutsche Zeitung', companyId: 'comp-002' }
    ],
    existingContacts: []
  },

  candidateVariants: [
    {
      organizationId: 'org-002',
      organizationName: 'StartUp PR AG',
      contactData: {
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ email: 'a.schmidt@sueddeutsche.de', isPrimary: true }],
        companyName: 'Suddeutsche Zeitung',  // Ohne Umlaut!
        hasMediaProfile: true,
        publications: ['SZ']  // Abkürzung!
      }
    }
  ],

  expected: {
    companyMatch: {
      found: true,
      created: false,
      companyName: 'Süddeutsche Zeitung Verlag',
      matchType: 'fuzzy',
      confidence: 90  // Fuzzy Score ~90%
    },
    publicationMatches: {
      found: 1,
      created: 0,
      names: ['Süddeutsche Zeitung']  // SZ → Süddeutsche Zeitung (Abkürzung!)
    },
    enrichment: {
      fieldsAdded: [],
      fieldsUpdated: []
    },
    conflicts: {
      count: 0,
      fields: [],
      actions: []
    },
    contactCreated: true
  }
}
```

### **C1: Create New Company - Unbekannte Firma**
```typescript
{
  id: 'C1',
  category: 'C',
  name: 'Create New - Unbekannte Firma',
  description: 'Company existiert nicht, muss neu erstellt werden',

  setup: {
    existingCompanies: [],
    existingPublications: [],
    existingContacts: []
  },

  candidateVariants: [
    {
      organizationId: 'org-003',
      organizationName: 'Agency Communications Ltd',
      contactData: {
        name: { firstName: 'Peter', lastName: 'Weber' },
        displayName: 'Peter Weber',
        emails: [{ email: 'peter@kleineverlag.de', isPrimary: true }],
        companyName: 'Kleine Verlag GmbH',
        hasMediaProfile: true,
        publications: ['Regional Times']
      }
    }
  ],

  expected: {
    companyMatch: {
      found: false,
      created: true,
      companyName: 'Kleine Verlag GmbH',
      matchType: 'created',
      confidence: 100
    },
    publicationMatches: {
      found: 0,
      created: 1,
      names: ['Regional Times']
    },
    enrichment: {
      fieldsAdded: [],
      fieldsUpdated: []
    },
    conflicts: {
      count: 0,
      fields: [],
      actions: []
    },
    contactCreated: true
  }
}
```

### **D1: Auto-Update Conflict - Super Majority**
```typescript
{
  id: 'D1',
  category: 'D',
  name: 'Auto-Update - Super Majority (≥90%)',
  description: '3+ Varianten, ≥90% Mehrheit → Auto-Update',

  setup: {
    existingCompanies: [
      {
        id: 'comp-003',
        name: 'FAZ Verlag',
        website: 'faz.de',
        address: 'Alte Adresse 1, Frankfurt'  // ALT!
      }
    ],
    existingPublications: [
      { id: 'pub-004', name: 'Frankfurter Allgemeine', companyId: 'comp-003' }
    ],
    existingContacts: []
  },

  candidateVariants: [
    {
      organizationId: 'org-001',
      organizationName: 'Org 1',
      contactData: {
        name: { firstName: 'Test', lastName: 'User1' },
        displayName: 'Test User1',
        emails: [{ email: 'user1@faz.de', isPrimary: true }],
        companyName: 'FAZ Verlag',
        address: 'Neue Adresse 10, Frankfurt'  // NEU!
      }
    },
    {
      organizationId: 'org-002',
      organizationName: 'Org 2',
      contactData: {
        name: { firstName: 'Test', lastName: 'User2' },
        displayName: 'Test User2',
        emails: [{ email: 'user2@faz.de', isPrimary: true }],
        companyName: 'FAZ Verlag',
        address: 'Neue Adresse 10, Frankfurt'  // NEU! (gleich)
      }
    },
    {
      organizationId: 'org-003',
      organizationName: 'Org 3',
      contactData: {
        name: { firstName: 'Test', lastName: 'User3' },
        displayName: 'Test User3',
        emails: [{ email: 'user3@faz.de', isPrimary: true }],
        companyName: 'FAZ Verlag',
        address: 'Neue Adresse 10, Frankfurt'  // NEU! (gleich)
      }
    }
  ],

  expected: {
    companyMatch: {
      found: true,
      created: false,
      companyName: 'FAZ Verlag',
      matchType: 'exact',
      confidence: 100
    },
    publicationMatches: {
      found: 0,
      created: 0,
      names: []
    },
    enrichment: {
      fieldsAdded: [],
      fieldsUpdated: ['address']  // ✅ Auto-Update! (3/3 = 100%)
    },
    conflicts: {
      count: 0,
      fields: [],
      actions: ['auto_updated']  // ✅ Auto-Update durchgeführt!
    },
    contactCreated: true
  }
}
```

### **D2: Conflict Review - Medium Majority**
```typescript
{
  id: 'D2',
  category: 'D',
  name: 'Conflict Review - Medium Majority (70%)',
  description: '3 Varianten, 70% Mehrheit → Conflict Review',

  setup: {
    existingCompanies: [
      {
        id: 'comp-004',
        name: 'Zeit Verlag',
        website: 'zeit.de',
        phone: '+49 40 1111111'  // ALT!
      }
    ],
    existingPublications: [],
    existingContacts: []
  },

  candidateVariants: [
    {
      organizationId: 'org-001',
      contactData: {
        name: { firstName: 'User', lastName: 'A' },
        emails: [{ email: 'a@zeit.de', isPrimary: true }],
        companyName: 'Zeit Verlag',
        phone: '+49 40 9999999'  // NEU! (2x)
      }
    },
    {
      organizationId: 'org-002',
      contactData: {
        name: { firstName: 'User', lastName: 'B' },
        emails: [{ email: 'b@zeit.de', isPrimary: true }],
        companyName: 'Zeit Verlag',
        phone: '+49 40 9999999'  // NEU! (2x)
      }
    },
    {
      organizationId: 'org-003',
      contactData: {
        name: { firstName: 'User', lastName: 'C' },
        emails: [{ email: 'c@zeit.de', isPrimary: true }],
        companyName: 'Zeit Verlag',
        phone: '+49 40 8888888'  // ANDERE!
      }
    }
  ],

  expected: {
    companyMatch: {
      found: true,
      created: false,
      companyName: 'Zeit Verlag',
      matchType: 'database',
      confidence: 95
    },
    publicationMatches: {
      found: 0,
      created: 0,
      names: []
    },
    enrichment: {
      fieldsAdded: [],
      fieldsUpdated: []  // ❌ KEIN Auto-Update!
    },
    conflicts: {
      count: 1,
      fields: ['phone'],
      actions: ['flagged_for_review']  // ⚠️ Manual Review nötig!
    },
    contactCreated: true
  }
}
```

### **E1: Freier Journalist - Keine Company**
```typescript
{
  id: 'E1',
  category: 'E',
  name: 'Freier Journalist - Keine Company',
  description: 'Journalist ohne Company → Kontakt ohne Company & ohne Publications',

  setup: {
    existingCompanies: [],
    existingPublications: [],
    existingContacts: []
  },

  candidateVariants: [
    {
      organizationId: 'org-001',
      contactData: {
        name: { firstName: 'Lisa', lastName: 'Blogger' },
        displayName: 'Lisa Blogger',
        emails: [{ email: 'lisa@gmail.com', isPrimary: true }],
        hasMediaProfile: true,
        beats: ['Tech', 'Startups'],
        // companyName: FEHLT!
        // publications: ['Mein Blog'] → WIRD IGNORIERT (keine Company!)
      }
    }
  ],

  expected: {
    companyMatch: {
      found: false,
      created: false,
      companyName: null,
      matchType: 'none',
      confidence: 0
    },
    publicationMatches: {
      found: 0,
      created: 0,  // ⚠️ KEINE Publications ohne Company!
      names: []
    },
    enrichment: {
      fieldsAdded: [],
      fieldsUpdated: []
    },
    conflicts: {
      count: 0,
      fields: [],
      actions: []
    },
    contactCreated: true
  }
}
```

### **E2: AI-Merge - 3 Varianten mit unterschiedlichen Daten**
```typescript
{
  id: 'E2',
  category: 'E',
  name: 'AI-Merge - 3 Varianten kombinieren',
  description: 'KI merged beste Daten aus 3 Varianten',

  setup: {
    existingCompanies: [
      { id: 'comp-005', name: 'Handelsblatt Media Group' }
    ],
    existingPublications: [],
    existingContacts: []
  },

  candidateVariants: [
    {
      organizationId: 'org-001',
      contactData: {
        name: { firstName: 'Maximilian', lastName: 'Müller' },  // Vollständig!
        displayName: 'Maximilian Müller',
        emails: [{ email: 'max@handelsblatt.com', isPrimary: true }],
        companyName: 'Handelsblatt',
        beats: ['Wirtschaft']
      }
    },
    {
      organizationId: 'org-002',
      contactData: {
        name: { firstName: 'Max', lastName: 'Müller' },  // Kurzform
        displayName: 'Max Müller',
        emails: [{ email: 'max@handelsblatt.com', isPrimary: true }],
        companyName: 'Handelsblatt',
        beats: ['Finanzen']  // Andere Beats!
      }
    },
    {
      organizationId: 'org-003',
      contactData: {
        name: { title: 'Dr.', firstName: 'M.', lastName: 'Müller' },  // Titel + Initial
        displayName: 'Dr. M. Müller',
        emails: [{ email: 'mueller@handelsblatt.com', isPrimary: true }],
        companyName: 'Handelsblatt Media',
        beats: ['Börse']  // Noch andere Beats!
      }
    }
  ],

  expected: {
    companyMatch: {
      found: true,
      created: false,
      companyName: 'Handelsblatt Media Group',
      matchType: 'fuzzy',
      confidence: 90
    },
    publicationMatches: {
      found: 0,
      created: 0,
      names: []
    },
    enrichment: {
      fieldsAdded: [],
      fieldsUpdated: []
    },
    conflicts: {
      count: 0,
      fields: [],
      actions: []
    },
    contactCreated: true,
    // KI soll mergen:
    aiMergeResult: {
      name: { title: 'Dr.', firstName: 'Maximilian', lastName: 'Müller' },  // Best of all!
      displayName: 'Dr. Maximilian Müller',
      emails: [{ email: 'max@handelsblatt.com', isPrimary: true }],  // Geschäftlich!
      beats: ['Wirtschaft', 'Finanzen', 'Börse']  // Kombiniert!
    }
  }
}
```

---

## 🏗️ Test-Daten Generator Implementation

### Massive Test-Daten mit realistischen Szenarien

```typescript
/**
 * src/lib/matching/seed-realistic-test-data.ts
 *
 * Erstellt realistische Test-Daten für ALLE Matching-Szenarien
 */

interface ScenarioConfig {
  // Organisationen
  organizations: number;  // z.B. 10 Test-Organisationen

  // Pro Szenario
  scenarios: {
    perfectMatches: number;     // Kategorie A: 50
    fuzzyMatches: number;       // Kategorie B: 50
    createNew: number;          // Kategorie C: 30
    conflicts: number;          // Kategorie D: 40
    edgeCases: number;          // Kategorie E: 30
  };
}

export async function seedRealisticTestData(config: ScenarioConfig) {
  const stats = {
    organizations: 0,
    companies: 0,
    publications: 0,
    contacts: 0,
    candidates: 0,
    conflicts: 0
  };

  // 1. Erstelle Test-Organisationen
  const orgs = await createTestOrganizations(config.organizations);
  stats.organizations = orgs.length;

  // 2. Erstelle Base-Companies & Publications (für Perfect/Fuzzy Matches)
  const baseData = await createBaseData({
    companies: [
      'Spiegel Verlag',
      'Süddeutsche Zeitung Verlag',
      'FAZ GmbH',
      'Zeit Verlag',
      'Handelsblatt Media Group',
      // ... 30+ mehr
    ],
    publications: [
      { name: 'Der Spiegel', companyName: 'Spiegel Verlag' },
      { name: 'Spiegel Online', companyName: 'Spiegel Verlag' },
      { name: 'Süddeutsche Zeitung', companyName: 'Süddeutsche Zeitung Verlag' },
      // ... 60+ mehr
    ]
  });
  stats.companies = baseData.companies.length;
  stats.publications = baseData.publications.length;

  // 3. Erstelle Perfect Match Szenarien (Kategorie A)
  await createPerfectMatchScenarios(config.scenarios.perfectMatches, {
    orgs,
    companies: baseData.companies,
    publications: baseData.publications
  });

  // 4. Erstelle Fuzzy Match Szenarien (Kategorie B)
  await createFuzzyMatchScenarios(config.scenarios.fuzzyMatches, {
    orgs,
    companies: baseData.companies,
    publications: baseData.publications
  });

  // 5. Erstelle Create New Szenarien (Kategorie C)
  await createNewScenarios(config.scenarios.createNew, { orgs });

  // 6. Erstelle Conflict Szenarien (Kategorie D)
  const conflicts = await createConflictScenarios(config.scenarios.conflicts, {
    orgs,
    companies: baseData.companies
  });
  stats.conflicts = conflicts.length;

  // 7. Erstelle Edge Case Szenarien (Kategorie E)
  await createEdgeCaseScenarios(config.scenarios.edgeCases, {
    orgs,
    companies: baseData.companies
  });

  // 8. Erstelle Matching Kandidaten aus allen Szenarien
  const candidates = await createMatchingCandidates();
  stats.candidates = candidates.length;

  return stats;
}

// Helper Functions

async function createPerfectMatchScenarios(count: number, data: any) {
  for (let i = 0; i < count; i++) {
    const company = randomElement(data.companies);
    const org = randomElement(data.orgs);
    const pubs = data.publications.filter(p => p.companyId === company.id);

    // Erstelle Kontakt-Variante die EXAKT matched
    await createContactVariant({
      organizationId: org.id,
      contactData: {
        name: { firstName: randomFirstName(), lastName: randomLastName() },
        emails: [{ email: `test@${extractDomain(company.website)}`, isPrimary: true }],
        companyName: company.name,  // EXAKT!
        hasMediaProfile: true,
        publications: pubs.map(p => p.name),  // EXAKT!
        beats: randomBeats(2)
      }
    });
  }
}

async function createConflictScenarios(count: number, data: any) {
  const conflicts = [];

  for (let i = 0; i < count; i++) {
    const company = randomElement(data.companies);

    // Erstelle 3+ Varianten mit unterschiedlichen Werten
    const variants = [];
    const conflictField = randomElement(['address', 'phone', 'website']);
    const conflictValues = generateConflictValues(conflictField, 3);

    for (let j = 0; j < 3; j++) {
      const org = data.orgs[j % data.orgs.length];

      variants.push({
        organizationId: org.id,
        contactData: {
          name: { firstName: 'Conflict', lastName: `Test${i}` },
          emails: [{ email: `conflict${i}@${extractDomain(company.website)}`, isPrimary: true }],
          companyName: company.name,
          [conflictField]: conflictValues[j]  // Unterschiedliche Werte!
        }
      });
    }

    // Erstelle Matching-Kandidat mit Konflikt
    const candidate = await createCandidate({ variants });
    conflicts.push({
      candidateId: candidate.id,
      field: conflictField,
      expectedAction: conflictValues[0] === conflictValues[1] ? 'auto_updated' : 'flagged_for_review'
    });
  }

  return conflicts;
}

// ... weitere Helper-Funktionen
```

---

## 🚀 Deployment-Plan

### Phase 1: Basis-Test-Daten (Tag 1)
```bash
# 1. Lösche alte Test-Daten
npm run test:matching:cleanup

# 2. Erstelle neue realistische Test-Daten
npm run test:matching:seed

# Output:
# ✅ 10 Organisationen erstellt
# ✅ 35 Companies erstellt
# ✅ 60 Publications erstellt
# ✅ 200 Kontakt-Varianten erstellt
# ✅ 50 Matching-Kandidaten erstellt (Perfect Matches)
# ✅ 50 Matching-Kandidaten erstellt (Fuzzy Matches)
# ✅ 30 Matching-Kandidaten erstellt (Create New)
# ✅ 40 Matching-Kandidaten erstellt (Conflicts)
# ✅ 30 Matching-Kandidaten erstellt (Edge Cases)
```

### Phase 2: Automatisierte Tests (Tag 2-3)
```bash
# Matching Tests
npm run test:matching:company-finder
npm run test:matching:publication-finder
npm run test:matching:string-similarity
npm run test:matching:data-merger
npm run test:matching:enrichment
npm run test:matching:conflict-resolver

# Integration Tests
npm run test:matching:import-flow
npm run test:matching:e2e
```

### Phase 3: Manuelle Überprüfung (Tag 4-5)
- SuperAdmin Settings → Matching Tests
- Teste jeden Szenario-Typ manuell
- Prüfe Conflict Review UI
- Verifiziere Audit Trail

### Phase 4: Performance Tests (Tag 6)
```bash
# Massive Daten
npm run test:matching:seed -- --count=1000

# Performance messen
npm run test:matching:benchmark
```

---

## 📈 Success Metrics

### Matching Accuracy
- ✅ Perfect Matches: 100% Success Rate
- ✅ Fuzzy Matches: ≥95% Success Rate
- ✅ Create New: 100% Success Rate
- ✅ Conflicts: 100% korrekt erkannt

### Enrichment Quality
- ✅ Fehlende Felder ergänzt: ≥80% Success Rate
- ✅ Auto-Update (≥90% Majority): 100% korrekt
- ✅ Conflict Review (66-90% Majority): 100% korrekt
- ✅ Keep Existing (<66% Majority): 100% korrekt

### Performance
- ✅ Company Matching: <500ms pro Kandidat
- ✅ Publication Matching: <300ms pro Kandidat
- ✅ AI Merge: <2s pro Kandidat
- ✅ Full Import: <3s pro Kandidat

---

## ✅ Checkliste

### Test-Daten erstellt für:
- [ ] Perfect Match Szenarien (Kategorie A)
- [ ] Fuzzy Match Szenarien (Kategorie B)
- [ ] Create New Szenarien (Kategorie C)
- [ ] Conflict Szenarien (Kategorie D)
- [ ] Edge Case Szenarien (Kategorie E)

### Alle Matching-Typen getestet:
- [ ] Exakte Namens-Matches
- [ ] Fuzzy Matches (Tippfehler, Varianten)
- [ ] Domain-basierte Matches
- [ ] Datenbank-Analyse Matches
- [ ] Abkürzungen (SZ, FAZ, etc.)

### Conflict Resolution getestet:
- [ ] Auto-Update (≥90% Majority)
- [ ] Conflict Review (66-90% Majority)
- [ ] Keep Existing (<66% Majority)
- [ ] Alter-Bonus funktioniert
- [ ] Manual-Entry-Schutz funktioniert

### AI & Enrichment getestet:
- [ ] AI-Merge kombiniert Varianten korrekt
- [ ] Enrichment ergänzt fehlende Felder
- [ ] Vollständigkeits-Score berechnet korrekt

### UI getestet:
- [ ] CandidateDetailModal zeigt korrekte Infos
- [ ] Import-Feedback ist detailliert
- [ ] Conflict Review UI funktioniert
- [ ] Settings Tests funktionieren

---

**Next Steps**: Implementation dieser Test-Daten-Struktur in `seed-realistic-test-data.ts` 🚀

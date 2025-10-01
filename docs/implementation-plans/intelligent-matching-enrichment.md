# Intelligentes Matching & Daten-Anreicherung

> **Feature:** Beim Import von Matching-Kandidaten werden Firmen und Publikationen automatisch erkannt, zugeordnet und mit fehlenden Daten angereichert. Das System lernt aus vorhandenen Daten und löst Konflikte intelligent.

---

## 📦 Bestehende Infrastruktur (bereits fertig)

Dieses Feature erweitert das **bestehende Matching-Kandidaten-System**:

### ✅ Was bereits funktioniert:

**1. Datenquelle: Matching Scan System**
- Automatischer Scan-Job durchsucht ALLE Organisationen nach ähnlichen Journalisten
- Erstellt `MatchingCandidate` für Personen, die von **2+ Organisationen** unabhängig erfasst wurden
- Speicherort: Firestore Collection `matching_candidates`
- Jeder Kandidat enthält Array von `variants` (= verschiedene Versionen aus verschiedenen Orgs)

```typescript
// Struktur eines Matching-Kandidaten (bereits vorhanden)
interface MatchingCandidate {
  id: string;
  matchKey: string;              // E-Mail oder normalisierter Name
  matchType: 'email' | 'name';   // Matching-Strategie
  score: number;                 // Qualitäts-Score 0-100
  variants: MatchingCandidateVariant[];  // 2+ Varianten!
  status: 'pending' | 'imported' | 'skipped' | 'rejected';
  // ...
}

interface MatchingCandidateVariant {
  organizationId: string;
  organizationName: string;
  contactId: string;
  contactData: {
    name: { firstName, lastName, title?, suffix? };
    displayName: string;
    emails: Array<{ email, type, isPrimary }>;
    phones?: Array<{ number, type, isPrimary }>;
    position?: string;
    department?: string;
    companyName?: string;        // ⚠️ String, KEINE ID!
    companyId?: string;           // ⚠️ Nur wenn Org eine Company verlinkt hat
    hasMediaProfile: boolean;
    beats?: string[];
    mediaTypes?: string[];
    publications?: string[];      // ⚠️ String-Array, KEINE IDs!
    socialProfiles?: Array<{ platform, url, handle }>;
    photoUrl?: string;
    website?: string;
  }
}
```

**2. UI: CandidateDetailModal (bereits implementiert)**
- Modal zeigt Kandidat mit allen Varianten
- User sieht Empfehlung (beste Variante)
- User kann Variante auswählen
- 3 Aktionen funktionieren bereits:
  - ✅ Skip (überspringen)
  - ✅ Reject (ablehnen)
  - ✅ Import (importieren) ← **Hier setzt dieses Feature an!**

**3. Service: matching-service.ts (bereits vorhanden)**
- `skipCandidate()` ✅ funktioniert
- `rejectCandidate()` ✅ funktioniert
- `importCandidate()` ⚠️ existiert, aber: **Erstellt nur Kontakt, KEINE Company/Publication-Verknüpfung!**

### ❌ Was noch fehlt (dieses Feature):

**Beim Import-Klick passiert aktuell:**
```typescript
// AKTUELL (unvollständig):
async function importCandidate(params) {
  const variant = candidate.variants[selectedVariantIndex];

  // Erstellt GlobalContact
  const contactId = await createGlobalContact(variant.contactData);

  // ❌ companyName bleibt String (keine Verknüpfung!)
  // ❌ publications bleiben Strings (keine Verknüpfung!)
  // ❌ Keine Suche nach bestehenden Companies
  // ❌ Keine Daten-Anreicherung
  // ❌ Keine Konflikt-Erkennung

  return { success: true, contactId };
}
```

**Was dieses Feature hinzufügt:**
```typescript
// NEU (vollständig):
async function importCandidateWithAutoMatching(params) {
  const variant = candidate.variants[selectedVariantIndex];

  // 1️⃣ FIRMA FINDEN/ERSTELLEN
  const companyMatch = await findCompanyBySignals(candidate.variants);
  // → Sucht in EIGENEN Companies (keine Premium-Referenzen!)
  // → Nutzt: companyName, E-Mail-Domain, Website
  // → Lernt aus DB: "30 Kontakte mit @spiegel.de → Company XYZ"

  // 2️⃣ PUBLIKATIONEN FINDEN/ERSTELLEN
  const publicationMatches = await findPublications(candidate.variants);
  // → Sucht in EIGENEN Publications (keine Premium-Referenzen!)
  // → Nutzt: publications[], companyName, E-Mail-Domain
  // → Mehrere Publikationen möglich

  // 3️⃣ DATEN ANREICHERN (falls Company/Publication existiert)
  await enrichCompanyData(companyMatch.companyId, candidate.variants);
  // → Ergänzt fehlende Felder (Website, Telefon, etc.)
  // → Erkennt Konflikte (bestehend vs. neu)
  // → 3-Tier Resolution: Auto-Update / Review / Keep

  // 4️⃣ KONTAKT ERSTELLEN (mit IDs!)
  const contactId = await createGlobalContact({
    ...variant.contactData,
    companyId: companyMatch.companyId,        // ✅ ID statt String!
    publications: publicationMatches.map(p => p.publicationId)  // ✅ IDs statt Strings!
  });

  return {
    success: true,
    contactId,
    companyMatch: { companyId, companyName, wasCreated, wasEnriched },
    publicationMatches: [{ publicationId, publicationName, wasCreated, wasEnriched }]
  };
}
```

### 🎯 Naht-Stelle (wo dieses Feature ansetzt):

```
┌─────────────────────────────────────┐
│  Matching Scan (bereits fertig)     │
│  - Scannt alle Orgs                 │
│  - Erstellt MatchingCandidates      │
│  - Mit 2+ Varianten                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  CandidateDetailModal (fertig)      │
│  - User sieht Varianten             │
│  - User wählt beste aus             │
│  - User klickt "Importieren"        │
└──────────────┬──────────────────────┘
               │
               ▼ ⚠️ HIER BEGINNT DIESES FEATURE! ⚠️
               │
┌─────────────────────────────────────┐
│  importCandidateWithAutoMatching()  │ ← NEU!
│                                     │
│  Input:                             │
│  - candidateId                      │
│  - selectedVariantIndex             │
│  - userId, organizationId           │
│                                     │
│  Vorhanden:                         │
│  - candidate.variants[] (2+ Stück)  │
│    - Jede mit contactData           │
│    - companyName (String!)          │
│    - publications (Strings!)        │
│    - emails mit Domains             │
│                                     │
│  Output:                            │
│  - GlobalContact mit Company-ID     │
│  - GlobalContact mit Publication-IDs│
│  - Enriched Company/Publication     │
│  - Conflict Reviews (falls nötig)   │
└─────────────────────────────────────┘
```

---

## 🎯 Ziel dieses Features

Wenn ein SuperAdmin einen Matching-Kandidaten importiert, soll das System **automatisch**:

1. **Firma finden** (mechanische Suche in selbst angelegten Companies)
2. **Publikationen zuordnen** (aus gefundener Firma)
3. **Kontakt-Daten mergen** (KI bei mehreren Varianten)
4. **Daten anreichern** (fehlende Felder ergänzen, Konflikte intelligent lösen)

**Ergebnis:** Kontakt ist sofort einsatzbereit mit vollständigen Verknüpfungen und maximal angereicherten Company/Publication-Daten.

---

## 📋 Kern-Konzepte

### 1. Nur selbst angelegte Entities durchsuchen

```typescript
// ❌ FALSCH: Alle Companies durchsuchen
const allCompanies = await getAllCompanies();

// ✅ RICHTIG: Nur eigene Companies (ohne Premium-Verweise)
const ownCompanies = await getOwnCompanies(organizationId);
// → Filtert automatisch isGlobal=false ODER (isGlobal=true UND createdBy SuperAdmin)
// → Schließt Reference-Companies aus Premium-Bibliothek aus!
```

**Wichtig:**
- Companies mit `isReference=true` werden NICHT durchsucht
- Companies aus Premium-Bibliothek (Verweise) werden IGNORIERT
- Nur selbst erstellte Companies zählen für Matching

### 2. Intelligente Daten-Analyse

**Aus Varianten lernen:**
```typescript
Variante 1: @spiegel.de, "Der Spiegel"
Variante 2: @spiegel.de, "Spiegel Verlag"
Variante 3: @spiegel.de, CompanyId: xyz123

→ System prüft: Welche selbst angelegte Company passt am besten?
```

**Aus SuperAdmin-DB lernen:**
```typescript
// In ALLEN eigenen globalen Kontakten suchen:
Wer hat @spiegel.de UND ist mit Company verknüpft?

Ergebnis:
- 30 Kontakte → Company "Der Spiegel" (ID: abc123)
- 12 Kontakte → Company "Spiegel Verlag" (ID: def456)

→ Mehrheit: "Der Spiegel" (67%)
```

### 3. KI nur für Daten-Merge

**Nicht für Matching, sondern für intelligente Zusammenführung:**

```typescript
// Wenn mehrere Varianten existieren:
const mergedData = await aiMergeVariants(variants);

// KI entscheidet:
// - Welcher Name ist vollständiger?
// - Welche Position ist spezifischer?
// - Welche Beats sollen kombiniert werden?
// - Welche Telefonnummer ist die richtige?
```

### 4. Konflikterkennung & -lösung

**3-Stufen-System:**

```
Stufe 1: AUTO-UPDATE
→ Wenn ≥90% Mehrheit + ≥3 Varianten
→ Automatisch updaten + Notify SuperAdmin

Stufe 2: CONFLICT-REVIEW
→ Wenn 66-90% Mehrheit
→ Flag für manuelle Review

Stufe 3: KEEP EXISTING
→ Wenn <66% Mehrheit
→ Aktuellen Wert behalten
```

---

## 🏗️ Architektur

### System-Komponenten

```
┌─────────────────────────────────────────────────────────────┐
│                 Import-Flow (Kandidat)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         1. Mechanische Company-Suche                         │
│  - extractSignals(variants)                                  │
│  - analyzeOwnDatabase(signals)  ← NUR eigene Companies!     │
│  - fuzzyMatch(companyNames)                                  │
│  - createNew() wenn nichts gefunden                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         2. Publication-Zuordnung                             │
│  - getPublicationsForCompany(companyId)                      │
│  - createDefaultPublication() wenn keine vorhanden           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         3. Kontakt-Daten Merge (KI)                          │
│  - Nur wenn variants.length > 1                              │
│  - aiMergeVariants(variants) → beste Daten                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         4. Intelligente Anreicherung                         │
│  - enrichCompany(company, newData)                           │
│  - enrichPublication(publication, newData)                   │
│  - resolveConflicts(field, oldValue, newValues)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         5. Kontakt erstellen & speichern                     │
│  - createContact(mergedData, companyId, publicationIds)      │
│  - markCandidateAsImported()                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Dateien-Struktur

```
src/lib/matching/
├── company-finder.ts           ← Mechanische Suche (NEU)
├── publication-finder.ts       ← Publikations-Zuordnung (NEU)
├── data-merger.ts              ← KI-basiertes Merging (NEU)
├── enrichment-engine.ts        ← Anreicherungs-Logik (NEU)
├── conflict-resolver.ts        ← Konflikt-Management (NEU)
├── string-similarity.ts        ← Fuzzy-Matching Utils (NEU)
└── database-analyzer.ts        ← DB-Analyse Utils (NEU)

src/types/matching.ts           ← Erweiterte Types
```

---

## 🔧 Implementierung: Phase 1 - Company Finder ✅

### Datei: `src/lib/matching/company-finder.ts`

```typescript
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { MatchingCandidateVariant } from '@/types/matching';
import { findBestMatch } from './string-similarity';
import { analyzeDatabaseSignals } from './database-analyzer';

export interface CompanyMatchResult {
  companyId: string | null;
  companyName: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  method: 'database_analysis' | 'fuzzy_match' | 'exact_match' | 'created_new' | 'none';
  wasCreated: boolean;
  evidence?: {
    emailDomainMatches?: number;
    websiteMatches?: number;
    fuzzyScore?: number;
  };
}

/**
 * Haupt-Matching-Funktion
 */
export async function findOrCreateCompany(
  variants: MatchingCandidateVariant[],
  organizationId: string,
  userId: string
): Promise<CompanyMatchResult> {

  console.log('🔍 Starting company matching...');

  // SCHRITT 1: Signale aus Varianten extrahieren
  const signals = extractSignals(variants);
  console.log('📊 Extracted signals:', signals);

  // SCHRITT 2: Eigene Companies laden (OHNE Premium-Verweise!)
  const ownCompanies = await getOwnCompanies(organizationId);
  console.log(`📚 Found ${ownCompanies.length} own companies`);

  if (ownCompanies.length === 0) {
    console.log('⚠️ Keine eigenen Companies gefunden - erstelle neue');
    return await createNewCompany(variants, organizationId, userId);
  }

  // SCHRITT 3: Datenbank-Analyse
  const dbAnalysis = await analyzeDatabaseSignals(signals, ownCompanies, organizationId);

  if (dbAnalysis.topMatch && dbAnalysis.confidence >= 0.7) {
    console.log(`✅ DB-Analyse erfolgreich: ${dbAnalysis.topMatch.name} (${Math.round(dbAnalysis.confidence * 100)}%)`);

    return {
      companyId: dbAnalysis.topMatch.id,
      companyName: dbAnalysis.topMatch.name,
      confidence: dbAnalysis.confidence >= 0.9 ? 'high' : 'medium',
      method: 'database_analysis',
      wasCreated: false,
      evidence: dbAnalysis.evidence
    };
  }

  // SCHRITT 4: Fuzzy-Matching auf Firmennamen
  if (signals.companyNames.length > 0) {
    const fuzzyMatch = findBestMatch(
      signals.companyNames,
      ownCompanies.map(c => ({ id: c.id, name: c.name })),
      0.75 // 75% Threshold
    );

    if (fuzzyMatch) {
      console.log(`✅ Fuzzy-Match gefunden: ${fuzzyMatch.name} (${Math.round(fuzzyMatch.similarity * 100)}%)`);

      return {
        companyId: fuzzyMatch.id,
        companyName: fuzzyMatch.name,
        confidence: fuzzyMatch.similarity >= 0.9 ? 'high' : 'medium',
        method: 'fuzzy_match',
        wasCreated: false,
        evidence: {
          fuzzyScore: fuzzyMatch.similarity
        }
      };
    }
  }

  // SCHRITT 5: Exakte Namens-Übereinstimmung
  if (signals.companyNames.length > 0) {
    const exactMatch = ownCompanies.find(c =>
      signals.companyNames.some(name =>
        c.name.toLowerCase() === name.toLowerCase()
      )
    );

    if (exactMatch) {
      console.log(`✅ Exakte Übereinstimmung: ${exactMatch.name}`);

      return {
        companyId: exactMatch.id,
        companyName: exactMatch.name,
        confidence: 'high',
        method: 'exact_match',
        wasCreated: false
      };
    }
  }

  // SCHRITT 6: Neue Firma erstellen
  console.log('❌ Keine Übereinstimmung gefunden - erstelle neue Firma');
  return await createNewCompany(variants, organizationId, userId);
}

/**
 * Extrahiert Signale aus Varianten
 */
function extractSignals(variants: MatchingCandidateVariant[]) {
  const signals = {
    emailDomains: new Set<string>(),
    websites: new Set<string>(),
    companyNames: new Set<string>(),
    companyIds: new Set<string>()
  };

  for (const variant of variants) {
    // E-Mail-Domains
    if (variant.contactData.emails?.length) {
      for (const email of variant.contactData.emails) {
        if (email.email && email.email.includes('@')) {
          const domain = email.email.split('@')[1].toLowerCase();
          signals.emailDomains.add(domain);
        }
      }
    }

    // Webseiten
    if (variant.contactData.website) {
      const normalized = normalizeUrl(variant.contactData.website);
      signals.websites.add(normalized);
    }

    // Firmennamen
    if (variant.contactData.companyName) {
      signals.companyNames.add(variant.contactData.companyName);
    }

    // Company-IDs
    if (variant.contactData.companyId) {
      signals.companyIds.add(variant.contactData.companyId);
    }
  }

  return {
    emailDomains: Array.from(signals.emailDomains),
    websites: Array.from(signals.websites),
    companyNames: Array.from(signals.companyNames),
    companyIds: Array.from(signals.companyIds)
  };
}

/**
 * Lädt NUR eigene Companies (keine Premium-Verweise!)
 */
async function getOwnCompanies(organizationId: string): Promise<Array<{ id: string; name: string; website?: string }>> {

  try {
    const constraints = [
      where('organizationId', '==', organizationId),
      where('deletedAt', '==', null)
    ];

    // ✅ WICHTIG: Keine References!
    // References haben spezielle Markierung oder ID-Pattern
    // Option 1: Field-basiert
    constraints.push(where('isReference', '!=', true));

    // Option 2: ID-Pattern (falls References spezielle IDs haben)
    // IDs wie "ref-abc123" oder "local-ref-xyz" ausschließen

    const q = query(collection(db, 'companies_enhanced'), ...constraints);
    const snapshot = await getDocs(q);

    const companies = snapshot.docs
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        website: doc.data().website
      }))
      .filter(c => {
        // Zusätzlicher Filter: Schließe Reference-Pattern in ID aus
        if (c.id.startsWith('ref-') || c.id.startsWith('local-ref-')) {
          console.log(`⏭️  Skipping reference company: ${c.name}`);
          return false;
        }
        return true;
      });

    return companies;

  } catch (error) {
    console.error('❌ Error loading own companies:', error);
    return [];
  }
}

/**
 * Normalisiert URLs für besseren Vergleich
 */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim();
}

/**
 * Erstellt neue Company
 */
async function createNewCompany(
  variants: MatchingCandidateVariant[],
  organizationId: string,
  userId: string
): Promise<CompanyMatchResult> {

  // Wähle beste Variante für Company-Name
  const bestVariant = selectMostCompleteVariant(variants);
  const companyName = bestVariant.contactData.companyName;

  if (!companyName) {
    return {
      companyId: null,
      companyName: null,
      confidence: 'none',
      method: 'none',
      wasCreated: false
    };
  }

  console.log(`🏢 Erstelle neue Company: ${companyName}`);

  try {
    const companyData = {
      name: companyName,
      officialName: companyName,
      type: 'publisher' as const,
      organizationId,
      isGlobal: true,
      isReference: false, // ✅ Explizit markieren: NICHT Reference!
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
      deletedAt: null,

      // Optionale Felder aus Varianten
      website: bestVariant.contactData.website || null
    };

    const docRef = await addDoc(collection(db, 'companies_enhanced'), companyData);

    return {
      companyId: docRef.id,
      companyName,
      confidence: 'low',
      method: 'created_new',
      wasCreated: true
    };

  } catch (error) {
    console.error('❌ Error creating company:', error);
    throw error;
  }
}

/**
 * Wählt vollständigste Variante
 */
function selectMostCompleteVariant(variants: MatchingCandidateVariant[]): MatchingCandidateVariant {
  return variants.reduce((best, current) => {
    const bestScore = calculateCompletenessScore(best.contactData);
    const currentScore = calculateCompletenessScore(current.contactData);
    return currentScore > bestScore ? current : best;
  });
}

function calculateCompletenessScore(data: any): number {
  let score = 0;
  if (data.emails?.length) score += 20;
  if (data.phones?.length) score += 15;
  if (data.position) score += 10;
  if (data.companyName) score += 15;
  if (data.website) score += 10;
  if (data.beats?.length) score += 10;
  if (data.socialProfiles?.length) score += 10;
  if (data.hasMediaProfile) score += 10;
  return score;
}
```

---

## 🔧 Implementierung: Phase 2 - Database Analyzer ✅

### Datei: `src/lib/matching/database-analyzer.ts`

```typescript
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AnalysisResult {
  topMatch: { id: string; name: string } | null;
  confidence: number;
  evidence: {
    emailDomainMatches: number;
    websiteMatches: number;
    totalGlobalContacts: number;
  };
}

/**
 * Analysiert SuperAdmin-Datenbank für Company-Matching
 */
export async function analyzeDatabaseSignals(
  signals: {
    emailDomains: string[];
    websites: string[];
    companyNames: string[];
    companyIds: string[];
  },
  ownCompanies: Array<{ id: string; name: string; website?: string }>,
  organizationId: string
): Promise<AnalysisResult> {

  console.log('📊 Analyzing database signals...');

  const scores = new Map<string, { count: number; total: number }>();

  // ==========================================
  // ANALYSE 1: E-Mail-Domains
  // ==========================================

  if (signals.emailDomains.length > 0) {
    for (const domain of signals.emailDomains) {
      const matches = await findContactsByEmailDomain(domain, organizationId);

      for (const match of matches) {
        // Nur Companies zählen die in ownCompanies sind!
        if (!ownCompanies.some(c => c.id === match.companyId)) {
          continue;
        }

        if (!scores.has(match.companyId)) {
          scores.set(match.companyId, { count: 0, total: 0 });
        }
        const score = scores.get(match.companyId)!;
        score.count++;
        score.total = match.totalCount;
      }
    }
  }

  // ==========================================
  // ANALYSE 2: Webseiten
  // ==========================================

  if (signals.websites.length > 0) {
    for (const website of signals.websites) {
      const matches = await findContactsByWebsite(website, organizationId);

      for (const match of matches) {
        // Nur eigene Companies!
        if (!ownCompanies.some(c => c.id === match.companyId)) {
          continue;
        }

        if (!scores.has(match.companyId)) {
          scores.set(match.companyId, { count: 0, total: 0 });
        }
        const score = scores.get(match.companyId)!;
        score.count += 0.5; // Webseite ist weniger eindeutig als E-Mail
      }
    }
  }

  // ==========================================
  // ANALYSE 3: Company-IDs direkt
  // ==========================================

  if (signals.companyIds.length > 0) {
    for (const companyId of signals.companyIds) {
      // Nur wenn Company in ownCompanies ist!
      if (!ownCompanies.some(c => c.id === companyId)) {
        continue;
      }

      if (!scores.has(companyId)) {
        scores.set(companyId, { count: 0, total: 0 });
      }
      const score = scores.get(companyId)!;
      score.count += 2; // Company-ID ist sehr stark!
    }
  }

  // ==========================================
  // AUSWERTUNG
  // ==========================================

  if (scores.size === 0) {
    return {
      topMatch: null,
      confidence: 0,
      evidence: {
        emailDomainMatches: 0,
        websiteMatches: 0,
        totalGlobalContacts: 0
      }
    };
  }

  // Finde Company mit höchstem Score
  let topCompanyId: string | null = null;
  let topScore = 0;
  let topTotal = 0;

  for (const [companyId, score] of scores.entries()) {
    if (score.count > topScore) {
      topScore = score.count;
      topCompanyId = companyId;
      topTotal = score.total;
    }
  }

  if (!topCompanyId) {
    return {
      topMatch: null,
      confidence: 0,
      evidence: {
        emailDomainMatches: 0,
        websiteMatches: 0,
        totalGlobalContacts: 0
      }
    };
  }

  // Hole Company-Details
  const topCompany = ownCompanies.find(c => c.id === topCompanyId);

  if (!topCompany) {
    return {
      topMatch: null,
      confidence: 0,
      evidence: {
        emailDomainMatches: 0,
        websiteMatches: 0,
        totalGlobalContacts: 0
      }
    };
  }

  // Berechne Konfidenz (je mehr Matches, desto höher)
  const confidence = Math.min(topScore / 10, 1.0); // Max bei 10 Matches = 100%

  return {
    topMatch: topCompany,
    confidence,
    evidence: {
      emailDomainMatches: topScore,
      websiteMatches: 0, // TODO: separat tracken
      totalGlobalContacts: topTotal
    }
  };
}

/**
 * Findet Kontakte mit bestimmter E-Mail-Domain
 */
async function findContactsByEmailDomain(
  domain: string,
  organizationId: string
): Promise<Array<{ companyId: string; totalCount: number }>> {

  try {
    // Lade ALLE globalen Kontakte mit dieser Domain
    const q = query(
      collection(db, 'contacts_enhanced'),
      where('organizationId', '==', organizationId),
      where('isGlobal', '==', true),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);

    // Zähle pro Company
    const companyCounts = new Map<string, number>();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Prüfe E-Mails
      if (data.emails && Array.isArray(data.emails)) {
        const hasDomain = data.emails.some((e: any) =>
          e.email && e.email.toLowerCase().includes(`@${domain}`)
        );

        if (hasDomain && data.companyId) {
          companyCounts.set(
            data.companyId,
            (companyCounts.get(data.companyId) || 0) + 1
          );
        }
      }
    }

    const totalCount = snapshot.size;

    return Array.from(companyCounts.entries()).map(([companyId, count]) => ({
      companyId,
      totalCount: count
    }));

  } catch (error) {
    console.error('Error finding contacts by email domain:', error);
    return [];
  }
}

/**
 * Findet Kontakte mit bestimmter Webseite
 */
async function findContactsByWebsite(
  website: string,
  organizationId: string
): Promise<Array<{ companyId: string }>> {

  try {
    const q = query(
      collection(db, 'contacts_enhanced'),
      where('organizationId', '==', organizationId),
      where('isGlobal', '==', true),
      where('website', '==', website),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);

    const companyIds = new Set<string>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.companyId) {
        companyIds.add(data.companyId);
      }
    }

    return Array.from(companyIds).map(id => ({ companyId: id }));

  } catch (error) {
    console.error('Error finding contacts by website:', error);
    return [];
  }
}
```

---

## 🔧 Implementierung: Phase 3 - Data Merger (KI) ✅

### Voraussetzung: Google Gemini AI bereits konfiguriert

**Gemini ist bereits im Projekt integriert:**
- ✅ API Key in `.env`: `GEMINI_API_KEY`
- ✅ Package installiert: `@google/generative-ai`
- ✅ Bestehende API Routes: `/api/ai/generate`, `/api/ai/email-analysis` etc.
- ✅ Service vorhanden: `src/lib/ai/gemini-service.ts`

**Pattern für KI-Nutzung:**
```
Frontend/Service
    ↓ fetch()
API Route (/app/api/ai/merge-variants/route.ts)
    ↓ GoogleGenerativeAI
Gemini API
```

### Neue Datei: `src/app/api/ai/merge-variants/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY nicht gesetzt!');
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'KI-Service nicht konfiguriert' },
        { status: 500 }
      );
    }

    const { variants } = await request.json();

    if (!variants || variants.length === 0) {
      return NextResponse.json(
        { error: 'Varianten erforderlich' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Du bist ein Daten-Merge-Experte. Analysiere diese ${variants.length} Varianten eines Journalisten und erstelle die bestmögliche zusammengeführte Version.

**VARIANTEN:**

${variants.map((v: any, i: number) => `
**Variante ${i + 1} (Organisation: ${v.organizationName}):**
\`\`\`json
${JSON.stringify(v.contactData, null, 2)}
\`\`\`
`).join('\n')}

**AUFGABE:**

Erstelle EINE optimale Version mit folgenden Regeln:

1. **Name:** Wähle die vollständigste Form (mit Titel, Vorname, Nachname, Suffix)
2. **E-Mail:** Primäre E-Mail = die geschäftlichste (z.B. @spiegel.de besser als @gmail.com)
3. **Telefon:** Wenn mehrere → nimm die, die in mehreren Varianten vorkommt
4. **Position:** Wähle die spezifischste (z.B. "Politikredakteur" > "Redakteur")
5. **Beats:** KOMBINIERE alle einzigartigen Beats aus allen Varianten
6. **Media Types:** KOMBINIERE alle einzigartigen Types
7. **Social Profiles:** Nimm alle einzigartigen Profile (keine Duplikate)
8. **Webseite:** Nimm geschäftliche Webseite (Firmen-Webseite, nicht private)

**ANTWORT-FORMAT:**

Gib NUR ein gültiges JSON-Objekt zurück (kein Markdown, kein Text):

{
  "name": {
    "title": "Dr.",
    "firstName": "Maximilian",
    "lastName": "Müller",
    "suffix": null
  },
  "displayName": "Dr. Maximilian Müller",
  "emails": [
    { "email": "m.mueller@spiegel.de", "type": "business", "isPrimary": true }
  ],
  "phones": [
    { "number": "+49 40 1234567", "type": "business", "isPrimary": true }
  ],
  "position": "Politikredakteur",
  "department": "Politik",
  "beats": ["Politik", "Wirtschaft", "Europa"],
  "mediaTypes": ["print", "online"],
  "socialProfiles": [
    { "platform": "Twitter", "url": "https://twitter.com/mmueller", "handle": "@mmueller" }
  ],
  "website": "https://www.spiegel.de",
  "photoUrl": null
}

WICHTIG: NUR das JSON-Objekt zurückgeben, keine Erklärungen!
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON aus Response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('KI hat kein gültiges JSON zurückgegeben');
    }

    const mergedData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      mergedData,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error merging variants with AI:', error);

    if (error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json({ error: 'Ungültiger API Key' }, { status: 401 });
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      return NextResponse.json({ error: 'Quota erreicht' }, { status: 429 });
    }

    return NextResponse.json(
      { error: `KI-Merge fehlgeschlagen: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
```

### Datei: `src/lib/matching/data-merger.ts`

**Client-Service der die API Route aufruft:**

```typescript
import { MatchingCandidateVariant } from '@/types/matching';

export interface MergedContactData {
  name: {
    title?: string;
    firstName: string;
    lastName: string;
    suffix?: string;
  };
  displayName: string;
  emails: Array<{ email: string; type: string; isPrimary: boolean }>;
  phones?: Array<{ number: string; type: string; isPrimary: boolean }>;
  position?: string;
  department?: string;
  beats?: string[];
  mediaTypes?: string[];
  socialProfiles?: Array<{ platform: string; url: string; handle?: string }>;
  website?: string;
  photoUrl?: string;
}

/**
 * Merged mehrere Varianten intelligent mit KI
 */
export async function mergeVariantsWithAI(
  variants: MatchingCandidateVariant[]
): Promise<MergedContactData> {

  if (variants.length === 1) {
    // Keine Merge nötig
    return variants[0].contactData as MergedContactData;
  }

  console.log(`🤖 Merging ${variants.length} variants with AI...`);

  try {
    // ✅ Ruft dedizierte API Route auf (nicht direkt GoogleGenerativeAI!)
    const response = await fetch('/api/ai/merge-variants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ variants })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'KI-Merge fehlgeschlagen');
    }

    console.log('✅ AI merge successful');
    return result.mergedData;

  } catch (error) {
    console.error('❌ AI merge failed, falling back to mechanical merge:', error);

    // Fallback: Mechanisches Merge
    return mechanicalMerge(variants);
  }
}

/**
 * Fallback: Mechanisches Merge (falls KI fehlschlägt)
 */
function mechanicalMerge(variants: MatchingCandidateVariant[]): MergedContactData {

  // Wähle vollständigste Variante als Basis
  const baseVariant = variants.reduce((best, current) => {
    const bestScore = calculateCompletenessScore(best.contactData);
    const currentScore = calculateCompletenessScore(current.contactData);
    return currentScore > bestScore ? current : best;
  });

  const merged = { ...baseVariant.contactData };

  // Kombiniere Beats
  const allBeats = new Set<string>();
  variants.forEach(v => {
    v.contactData.beats?.forEach(beat => allBeats.add(beat));
  });
  merged.beats = Array.from(allBeats);

  // Kombiniere Media Types
  const allMediaTypes = new Set<string>();
  variants.forEach(v => {
    v.contactData.mediaTypes?.forEach(type => allMediaTypes.add(type));
  });
  merged.mediaTypes = Array.from(allMediaTypes);

  // Kombiniere Social Profiles (ohne Duplikate)
  const allProfiles = new Map<string, any>();
  variants.forEach(v => {
    v.contactData.socialProfiles?.forEach(profile => {
      const key = `${profile.platform}-${profile.url}`;
      if (!allProfiles.has(key)) {
        allProfiles.set(key, profile);
      }
    });
  });
  merged.socialProfiles = Array.from(allProfiles.values());

  return merged as MergedContactData;
}

function calculateCompletenessScore(data: any): number {
  let score = 0;
  if (data.emails?.length) score += 20;
  if (data.phones?.length) score += 15;
  if (data.position) score += 10;
  if (data.companyName) score += 15;
  if (data.website) score += 10;
  if (data.beats?.length) score += 10;
  if (data.socialProfiles?.length) score += 10;
  if (data.hasMediaProfile) score += 10;
  return score;
}
```

---

## 🔧 Implementierung: Phase 4 - Enrichment Engine ✅

### Datei: `src/lib/matching/enrichment-engine.ts`

```typescript
import { db } from '@/lib/firebase/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { resolveFieldConflict } from './conflict-resolver';

interface EnrichmentResult {
  enriched: boolean;
  fieldsAdded: string[];
  fieldsUpdated: string[];
  conflicts: Array<{
    field: string;
    action: 'auto_updated' | 'flagged_for_review' | 'kept_existing';
  }>;
  oldCompleteness: number;
  newCompleteness: number;
}

/**
 * Reichert Company mit neuen Daten an
 */
export async function enrichCompany(
  companyId: string,
  existingCompany: any,
  newData: {
    website?: string;
    phone?: string;
    address?: string;
    socialMedia?: any[];
    logo?: string;
  },
  variants: any[],
  confidence: number,
  userId: string
): Promise<EnrichmentResult> {

  console.log(`📊 Enriching company ${companyId}...`);

  if (confidence < 0.7) {
    console.log('⚠️ Confidence too low for enrichment');
    return {
      enriched: false,
      fieldsAdded: [],
      fieldsUpdated: [],
      conflicts: [],
      oldCompleteness: calculateCompanyCompleteness(existingCompany),
      newCompleteness: calculateCompanyCompleteness(existingCompany)
    };
  }

  const updates: any = {};
  const fieldsAdded: string[] = [];
  const fieldsUpdated: string[] = [];
  const conflicts: any[] = [];

  // ==========================================
  // FEHLENDE FELDER ERGÄNZEN
  // ==========================================

  // Webseite
  if (!existingCompany.website && newData.website) {
    const occurrences = countOccurrences('website', newData.website, variants);
    if (occurrences >= 2 || variants.length === 1) {
      updates.website = newData.website;
      fieldsAdded.push('website');
      console.log('✅ Webseite ergänzt:', newData.website);
    }
  }

  // Telefon
  if (!existingCompany.phone && newData.phone) {
    const occurrences = countOccurrences('phone', newData.phone, variants);
    if (occurrences >= 2) {
      updates.phone = newData.phone;
      fieldsAdded.push('phone');
      console.log('✅ Telefon ergänzt:', newData.phone);
    }
  }

  // Adresse
  if (!existingCompany.address && newData.address) {
    const occurrences = countOccurrences('address', newData.address, variants);
    if (occurrences >= 2) {
      updates.address = newData.address;
      fieldsAdded.push('address');
      console.log('✅ Adresse ergänzt:', newData.address);
    }
  }

  // Social Media
  if ((!existingCompany.socialMedia || existingCompany.socialMedia.length === 0) && newData.socialMedia?.length) {
    updates.socialMedia = newData.socialMedia;
    fieldsAdded.push('socialMedia');
    console.log('✅ Social Media ergänzt:', newData.socialMedia.length, 'Profile');
  }

  // Logo
  if (!existingCompany.logo && newData.logo) {
    const occurrences = countOccurrences('logo', newData.logo, variants);
    if (occurrences >= 2 || variants.length === 1) {
      updates.logo = newData.logo;
      fieldsAdded.push('logo');
      console.log('✅ Logo ergänzt');
    }
  }

  // ==========================================
  // KONFLIKTE PRÜFEN & LÖSEN
  // ==========================================

  // Webseite-Konflikt
  if (existingCompany.website && newData.website && existingCompany.website !== newData.website) {
    const newWebsites = variants
      .map(v => v.contactData.website)
      .filter(Boolean);

    const conflict = await resolveFieldConflict(
      'company',
      companyId,
      'website',
      existingCompany.website,
      newWebsites,
      confidence
    );

    if (conflict.action === 'auto_updated') {
      updates.website = conflict.value;
      updates.website_previousValue = existingCompany.website;
      fieldsUpdated.push('website');
    }

    conflicts.push({ field: 'website', action: conflict.action });
  }

  // Telefon-Konflikt
  if (existingCompany.phone && newData.phone && existingCompany.phone !== newData.phone) {
    const newPhones = variants
      .map(v => v.contactData.phone)
      .filter(Boolean);

    const conflict = await resolveFieldConflict(
      'company',
      companyId,
      'phone',
      existingCompany.phone,
      newPhones,
      confidence
    );

    if (conflict.action === 'auto_updated') {
      updates.phone = conflict.value;
      updates.phone_previousValue = existingCompany.phone;
      fieldsUpdated.push('phone');
    }

    conflicts.push({ field: 'phone', action: conflict.action });
  }

  // Adresse-Konflikt
  if (existingCompany.address && newData.address && existingCompany.address !== newData.address) {
    const newAddresses = variants
      .map(v => v.contactData.address)
      .filter(Boolean);

    const conflict = await resolveFieldConflict(
      'company',
      companyId,
      'address',
      existingCompany.address,
      newAddresses,
      confidence
    );

    if (conflict.action === 'auto_updated') {
      updates.address = conflict.value;
      updates.address_previousValue = existingCompany.address;
      fieldsUpdated.push('address');
    }

    conflicts.push({ field: 'address', action: conflict.action });
  }

  // ==========================================
  // UPDATE AUSFÜHREN
  // ==========================================

  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'companies_enhanced', companyId), {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      enrichedBy: 'matching_system',
      enrichedAt: serverTimestamp()
    });

    // Log Enrichment
    await logEnrichment({
      entityType: 'company',
      entityId: companyId,
      fieldsAdded,
      fieldsUpdated,
      confidence,
      userId
    });

    const oldCompleteness = calculateCompanyCompleteness(existingCompany);
    const newCompleteness = calculateCompanyCompleteness({ ...existingCompany, ...updates });

    console.log(`✅ Company enriched: ${fieldsAdded.length} added, ${fieldsUpdated.length} updated`);
    console.log(`📈 Completeness: ${oldCompleteness}% → ${newCompleteness}%`);

    return {
      enriched: true,
      fieldsAdded,
      fieldsUpdated,
      conflicts,
      oldCompleteness,
      newCompleteness
    };
  }

  return {
    enriched: false,
    fieldsAdded: [],
    fieldsUpdated: [],
    conflicts,
    oldCompleteness: calculateCompanyCompleteness(existingCompany),
    newCompleteness: calculateCompanyCompleteness(existingCompany)
  };
}

/**
 * Zählt wie oft ein Wert in Varianten vorkommt
 */
function countOccurrences(field: string, value: any, variants: any[]): number {
  return variants.filter(v => v.contactData[field] === value).length;
}

/**
 * Berechnet Vollständigkeits-Score für Company
 */
function calculateCompanyCompleteness(company: any): number {
  let score = 0;
  let total = 0;

  const fields = ['name', 'officialName', 'website', 'phone', 'address', 'email', 'logo', 'socialMedia', 'description'];

  for (const field of fields) {
    total++;
    if (company[field] && (Array.isArray(company[field]) ? company[field].length > 0 : true)) {
      score++;
    }
  }

  return Math.round((score / total) * 100);
}

/**
 * Protokolliert Anreicherung
 */
async function logEnrichment(data: {
  entityType: string;
  entityId: string;
  fieldsAdded: string[];
  fieldsUpdated: string[];
  confidence: number;
  userId: string;
}) {
  await addDoc(collection(db, 'enrichment_logs'), {
    ...data,
    timestamp: serverTimestamp()
  });
}
```

---

## Nächster Schritt

→ **Teil 2**: Conflict Resolver (3-Tier System für Konfliktauflösung)

Siehe: `intelligent-matching-part2-conflict-resolver.md`
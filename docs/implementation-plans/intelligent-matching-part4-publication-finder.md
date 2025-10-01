# Intelligent Matching - Teil 4: Publication Finder

## Übersicht

Dieser Teil beschreibt das automatische Matching von Publikationen basierend auf den Daten aus den Kandidaten-Varianten.

## ⚠️ KRITISCH: Strikte Hierarchie Company → Publication → Person

**FESTE Daten-Hierarchie:**
```
Company (z.B. "Spiegel Verlag")
  └── Publications (z.B. "Der Spiegel", "Spiegel Online") ← MUSS companyId haben!
      └── Contacts (Journalisten) ← MUSS companyId + publications[] haben!
```

**WICHTIGE REGEL:**
- **Publications MÜSSEN immer zu einer Company gehören!**
- **Ein Journalist mit Publications MUSS bei der Company arbeiten!**
- **companyId am Contact MUSS identisch sein mit companyId der Publications!**

**Erlaubte Szenarien:**

1. **✅ Journalist MIT Company UND Publications:**
   ```
   Company: "Spiegel Verlag" (id: "xyz")
   Publications: "Der Spiegel" (companyId: "xyz"), "Spiegel Online" (companyId: "xyz")
   Contact: companyId: "xyz" + publications: ["spiegel-id", "online-id"]
   → Alle haben DIESELBE companyId!
   ```

2. **✅ Journalist MIT Company OHNE Publications:**
   ```
   Company: "Spiegel Verlag" (id: "xyz")
   Publications: KEINE
   Contact: companyId: "xyz" + publications: []
   → Arbeitet bei Firma, aber keine spezifische Publikation zugeordnet
   ```

3. **❌ Journalist OHNE Company MIT Publications:**
   ```
   → NICHT ERLAUBT!
   → Publications ohne Company können nicht existieren!
   → Falls keine Company gefunden: KEINE Publications zuordnen!
   ```

4. **✅ Journalist OHNE Company OHNE Publications:**
   ```
   Contact: companyId: null + publications: []
   → Freier Journalist ohne Firma (z.B. Blogger)
   ```

**Das bedeutet für die Implementation:**
- Publications **MÜSSEN** ein `companyId` haben (PFLICHT!)
- Publication Matching **NUR** wenn Company gefunden/erstellt wurde
- Falls keine Company → **KEINE** Publications zuordnen!

## 1. Signal-Extraktion

```typescript
/**
 * src/lib/matching/publication-finder.ts
 */

interface PublicationSignals {
  publicationNames: string[];        // Aus mediaProfile.publications
  companyNames: string[];            // Aus contactData.companyName (falls Journalist)
  emailDomains: string[];            // Aus contactData.emails
  websites: string[];                // Falls in mediaProfile vorhanden
}

/**
 * Extrahiert alle Publikations-Signale aus den Varianten
 */
function extractPublicationSignals(
  variants: MatchingCandidateVariant[]
): PublicationSignals {
  const signals: PublicationSignals = {
    publicationNames: [],
    companyNames: [],
    emailDomains: [],
    websites: []
  };

  for (const variant of variants) {
    // Publikations-Namen aus mediaProfile
    if (variant.contactData.hasMediaProfile) {
      const publications = variant.contactData.publications || [];
      signals.publicationNames.push(...publications);
    }

    // Firmenname (kann Publikation sein, z.B. "Spiegel Verlag")
    if (variant.contactData.companyName) {
      signals.companyNames.push(variant.contactData.companyName);
    }

    // E-Mail-Domains
    if (variant.contactData.emails) {
      for (const email of variant.contactData.emails) {
        const domain = extractDomain(email.email);
        if (domain && !signals.emailDomains.includes(domain)) {
          signals.emailDomains.push(domain);
        }
      }
    }
  }

  return signals;
}
```

## 2. Publication Finder

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { matchPublicationNames, extractDomain } from './string-similarity';

interface PublicationMatch {
  publicationId: string;
  publicationName: string;
  matchType: 'exact_name' | 'fuzzy_name' | 'domain' | 'database_analysis';
  confidence: number;
  source: string; // Welches Signal hat zum Match geführt
}

/**
 * Findet eigene Publikationen (NUR selbst erstellte, KEINE Referenzen!)
 *
 * ⚠️ WICHTIG: Kann MIT oder OHNE companyId arbeiten!
 */
async function getOwnPublications(
  organizationId: string,
  companyId?: string | null  // ✅ Optional! Wenn gesetzt: nur Publications dieser Company
): Promise<Array<{ id: string; name: string; website?: string; companyId?: string | null }>> {
  const publicationsRef = collection(db, 'superadmin_publications');

  const constraints = [
    where('organizationId', '==', organizationId),
    where('deletedAt', '==', null),
    where('isReference', '!=', true)  // ✅ CRITICAL: Keine Referenzen!
  ];

  // ✅ Optional: Nur Publications einer bestimmten Company
  if (companyId) {
    constraints.push(where('companyId', '==', companyId));
  }

  const q = query(publicationsRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      name: doc.data().name,
      website: doc.data().website,
      companyId: doc.data().companyId || null
    }))
    .filter(p => {
      // Zusätzlicher Filter: Exclude reference patterns in ID
      if (p.id.startsWith('ref-') || p.id.startsWith('local-ref-')) {
        return false;
      }
      return true;
    });
}

/**
 * Findet Publikationen basierend auf Signalen (mit oder ohne Company)
 *
 * FLOW 1 (mit Company):
 * 1. Company wurde bereits gefunden/erstellt
 * 2. Suche Publications DIESER Company
 * 3. Falls keine gefunden → erstelle neue Publications MIT companyId
 *
 * FLOW 2 (ohne Company):
 * 1. Keine Company vorhanden
 * 2. Suche Publications OHNE Company-Filter
 * 3. Falls keine gefunden → erstelle neue Publications OHNE companyId
 */
export async function findPublications(
  companyId: string | null,  // ✅ Optional! Kann null sein
  variants: MatchingCandidateVariant[],
  organizationId: string
): Promise<PublicationMatch[]> {
  const signals = extractPublicationSignals(variants);

  // ✅ Lade Publications (mit oder ohne Company-Filter)
  const ownPublications = await getOwnPublications(organizationId, companyId);

  const matches: PublicationMatch[] = [];
  const seenIds = new Set<string>();

  // 1. EXAKTE NAMEN-MATCHES
  for (const signalName of signals.publicationNames) {
    for (const publication of ownPublications) {
      if (seenIds.has(publication.id)) continue;

      const { match, score } = matchPublicationNames(signalName, publication.name);

      if (match && score === 100) {
        matches.push({
          publicationId: publication.id,
          publicationName: publication.name,
          matchType: 'exact_name',
          confidence: 100,
          source: `Name: "${signalName}"`
        });
        seenIds.add(publication.id);
      }
    }
  }

  // 2. FUZZY NAMEN-MATCHES
  for (const signalName of signals.publicationNames) {
    for (const publication of ownPublications) {
      if (seenIds.has(publication.id)) continue;

      const { match, score } = matchPublicationNames(signalName, publication.name, 85);

      if (match && score >= 85) {
        matches.push({
          publicationId: publication.id,
          publicationName: publication.name,
          matchType: 'fuzzy_name',
          confidence: score,
          source: `Ähnlicher Name: "${signalName}" → "${publication.name}"`
        });
        seenIds.add(publication.id);
      }
    }
  }

  // 3. DOMAIN-MATCHES
  for (const domain of signals.emailDomains) {
    for (const publication of ownPublications) {
      if (seenIds.has(publication.id)) continue;

      if (publication.website) {
        const pubDomain = extractDomain(publication.website);
        if (pubDomain === domain) {
          matches.push({
            publicationId: publication.id,
            publicationName: publication.name,
            matchType: 'domain',
            confidence: 95,
            source: `Domain: ${domain}`
          });
          seenIds.add(publication.id);
        }
      }
    }
  }

  // 4. DATENBANK-ANALYSE
  // Schaue, welche Publikationen bestehende Kontakte mit gleicher E-Mail-Domain haben
  const dbMatches = await analyzePublicationDatabase(signals, ownPublications, organizationId);
  for (const match of dbMatches) {
    if (!seenIds.has(match.publicationId)) {
      matches.push(match);
      seenIds.add(match.publicationId);
    }
  }

  // Sortiere nach Confidence (höchste zuerst)
  return matches.sort((a, b) => b.confidence - a.confidence);
}
```

## 3. Datenbank-Analyse

```typescript
/**
 * Analysiert bestehende Kontakte um Publikations-Patterns zu finden
 */
async function analyzePublicationDatabase(
  signals: PublicationSignals,
  ownPublications: Array<{ id: string; name: string; website?: string }>,
  organizationId: string
): Promise<PublicationMatch[]> {
  const matches: PublicationMatch[] = [];
  const publicationCounts = new Map<string, { count: number; sources: string[] }>();

  // Für jede E-Mail-Domain: Finde alle Kontakte mit dieser Domain
  for (const domain of signals.emailDomains) {
    const contactsRef = collection(db, 'superadmin_contacts');

    const q = query(
      contactsRef,
      where('organizationId', '==', organizationId),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Prüfe ob dieser Kontakt eine E-Mail mit der gesuchten Domain hat
      const emails = data.emails || [];
      const hasMatchingDomain = emails.some((e: any) => {
        const emailDomain = extractDomain(e.email);
        return emailDomain === domain;
      });

      if (!hasMatchingDomain) continue;

      // Schaue welche Publikationen dieser Kontakt hat
      const contactPublications = data.publications || [];

      for (const pubId of contactPublications) {
        // Nur eigene Publikationen zählen!
        if (!ownPublications.some(p => p.id === pubId)) {
          continue;
        }

        if (!publicationCounts.has(pubId)) {
          publicationCounts.set(pubId, { count: 0, sources: [] });
        }

        const entry = publicationCounts.get(pubId)!;
        entry.count++;
        if (!entry.sources.includes(domain)) {
          entry.sources.push(domain);
        }
      }
    }
  }

  // Erstelle Matches basierend auf Häufigkeit
  for (const [pubId, data] of publicationCounts) {
    const publication = ownPublications.find(p => p.id === pubId);
    if (!publication) continue;

    // Confidence basierend auf Anzahl der Übereinstimmungen
    let confidence = 70; // Base
    if (data.count >= 5) confidence = 90;
    else if (data.count >= 3) confidence = 85;
    else if (data.count >= 2) confidence = 80;

    matches.push({
      publicationId: publication.id,
      publicationName: publication.name,
      matchType: 'database_analysis',
      confidence,
      source: `${data.count} bestehende Kontakte mit Domain ${data.sources.join(', ')}`
    });
  }

  return matches;
}
```

## 4. Publikation erstellen (falls nicht gefunden)

```typescript
import { addDoc, collection, Timestamp } from 'firebase/firestore';

interface CreatePublicationParams {
  name: string;
  companyId?: string | null;  // ✅ OPTIONAL: Publication kann zu Company gehören (oder nicht)
  website?: string;
  organizationId: string;
  createdBy: string;
  source: 'auto_matching'; // Markiert als automatisch erstellt
}

/**
 * Erstellt eine neue Publikation (mit oder ohne Company)
 *
 * ⚠️ WICHTIG: companyId ist OPTIONAL!
 * - MIT companyId: Publication gehört zu Verlag/Medienhaus
 * - OHNE companyId: Freie Publikation ohne Company-Zuordnung
 */
async function createPublication(params: CreatePublicationParams): Promise<string> {
  const publicationsRef = collection(db, 'superadmin_publications');

  const publicationData = {
    name: params.name,
    companyId: params.companyId || null,  // ✅ Optional: Kann null sein!
    website: params.website || null,
    organizationId: params.organizationId,
    createdBy: params.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    deletedAt: null,
    source: params.source,
    isReference: false, // ✅ Wichtig: Wir erstellen eigene Publikationen!
    type: 'unknown', // Kann später manuell angepasst werden
    country: 'DE', // Default
    reach: null,
    frequency: null,
    beats: [],
    mediaType: []
  };

  const docRef = await addDoc(publicationsRef, publicationData);
  return docRef.id;
}
```

## 5. Intelligente Publikations-Auswahl

```typescript
/**
 * Wählt die beste Publikation aus mehreren Varianten
 * Nutzt AI falls nötig
 */
async function selectBestPublication(
  variants: MatchingCandidateVariant[]
): Promise<{ name: string; website?: string }> {
  const signals = extractPublicationSignals(variants);

  // Falls alle Varianten die gleiche Publikation nennen → Easy
  if (signals.publicationNames.length > 0) {
    const nameCounts = new Map<string, number>();

    for (const name of signals.publicationNames) {
      const normalized = normalizeString(name);
      nameCounts.set(normalized, (nameCounts.get(normalized) || 0) + 1);
    }

    // Sortiere nach Häufigkeit
    const sorted = Array.from(nameCounts.entries()).sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0 && sorted[0][1] >= 2) {
      // Mindestens 2 Varianten stimmen überein
      // Nimm die originale (nicht normalisierte) Version
      const bestNormalized = sorted[0][0];
      const bestOriginal = signals.publicationNames.find(
        n => normalizeString(n) === bestNormalized
      )!;

      return {
        name: bestOriginal,
        website: signals.websites[0] // Falls vorhanden
      };
    }
  }

  // Falls keine Übereinstimmung → AI
  if (variants.length > 1) {
    const merged = await mergeVariantsWithAI(variants);
    const publications = merged.publications || [];

    if (publications.length > 0) {
      return {
        name: publications[0], // Erste Publikation aus AI-Merge
        website: signals.websites[0]
      };
    }
  }

  // Fallback: Erste Publikation aus erster Variante
  if (signals.publicationNames.length > 0) {
    return {
      name: signals.publicationNames[0],
      website: signals.websites[0]
    };
  }

  throw new Error('Keine Publikation gefunden');
}
```

## 6. Integration in matching-service

**⚠️ FLEXIBLER FLOW (alle Kombinationen möglich):**
```
Szenario 1: MIT Company, MIT Publications
  1. Company finden/erstellen → companyId
  2. Publications DIESER Company finden/erstellen
  3. Kontakt: companyId + publications[]

Szenario 2: MIT Company, OHNE Publications
  1. Company finden/erstellen → companyId
  2. Keine Publications (hasMediaProfile = false)
  3. Kontakt: companyId + publications: []

Szenario 3: OHNE Company, MIT Publications
  1. Keine Company (companyName fehlt/nicht gefunden)
  2. Publications OHNE Company-Filter finden/erstellen
  3. Kontakt: companyId: null + publications[]

Szenario 4: OHNE Company, OHNE Publications
  1. Keine Company
  2. Keine Publications
  3. Kontakt: companyId: null + publications: []
```

```typescript
/**
 * In matching-service.ts - Import-Funktion erweitern
 *
 * ⚠️ WICHTIG: Sowohl Company als auch Publications sind OPTIONAL!
 */

async function importCandidateWithPublications(params: {
  candidateId: string;
  selectedVariantIndex: number;
  userId: string;
  organizationId: string;
  companyId?: string | null;  // ✅ Optional! Kann null sein
}): Promise<{
  success: boolean;
  contactId?: string;
  publicationMatches?: PublicationMatch[];
  error?: string;
}> {
  const candidate = await getCandidate(params.candidateId);
  if (!candidate) {
    return { success: false, error: 'Kandidat nicht gefunden' };
  }

  // 1. Finde Publikationen (MIT oder OHNE Company-Filter)
  const publicationMatches = await findPublications(
    params.companyId || null,  // ✅ Kann null sein!
    candidate.variants,
    params.organizationId
  );

  // 2. Falls keine gefunden → Erstelle neue Publikationen (mit oder ohne companyId)
  if (publicationMatches.length === 0) {
    const bestPub = await selectBestPublication(candidate.variants);

    const newPubId = await createPublication({
      name: bestPub.name,
      companyId: params.companyId || null,  // ✅ Optional: Kann null sein!
      website: bestPub.website,
      organizationId: params.organizationId,
      createdBy: params.userId,
      source: 'auto_matching'
    });

    publicationMatches.push({
      publicationId: newPubId,
      publicationName: bestPub.name,
      matchType: 'exact_name',
      confidence: 100,
      source: params.companyId ? 'Neu erstellt für Company' : 'Neu erstellt (ohne Company)'
    });
  }

  // 3. Importiere Kontakt (beide Felder optional)
  const selectedVariant = candidate.variants[params.selectedVariantIndex];
  const publicationIds = publicationMatches.map(m => m.publicationId);

  const contactId = await createGlobalContact({
    ...selectedVariant.contactData,
    companyId: params.companyId || null,  // ✅ Optional
    publications: publicationIds,          // ✅ Kann leer sein: []
    organizationId: params.organizationId,
    createdBy: params.userId,
    source: 'matching_import'
  });

  return {
    success: true,
    contactId,
    publicationMatches
  };
}
```

## 7. Tests

```typescript
/**
 * src/lib/matching/__tests__/publication-finder.test.ts
 */

describe('Publication Finder', () => {
  describe('extractPublicationSignals', () => {
    it('should extract publication names from variants', () => {
      const variants: MatchingCandidateVariant[] = [
        {
          organizationId: 'org1',
          organizationName: 'Org 1',
          contactData: {
            hasMediaProfile: true,
            publications: ['Der Spiegel', 'SZ'],
            emails: [{ email: 'max@spiegel.de', isPrimary: true }],
            // ...
          }
        }
      ];

      const signals = extractPublicationSignals(variants);

      expect(signals.publicationNames).toContain('Der Spiegel');
      expect(signals.publicationNames).toContain('SZ');
      expect(signals.emailDomains).toContain('spiegel.de');
    });
  });

  describe('findPublications', () => {
    it('should find publications by exact name match', async () => {
      // Mock firestore
      const mockPublications = [
        { id: 'pub1', name: 'Der Spiegel', website: 'spiegel.de' }
      ];

      const matches = await findPublications(variants, 'org1');

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchType).toBe('exact_name');
      expect(matches[0].confidence).toBe(100);
    });

    it('should NOT include reference publications', async () => {
      // Mock firestore mit Referenz-Publikation
      const mockPublications = [
        { id: 'ref-pub1', name: 'Premium Pub', isReference: true }
      ];

      const matches = await findPublications(variants, 'org1');

      expect(matches).toHaveLength(0); // ✅ Keine Referenzen!
    });
  });

  describe('selectBestPublication', () => {
    it('should select publication with majority agreement', async () => {
      const variants = [
        { contactData: { publications: ['Der Spiegel'] } },
        { contactData: { publications: ['Spiegel'] } },
        { contactData: { publications: ['Der Spiegel'] } }
      ];

      const best = await selectBestPublication(variants);

      expect(best.name).toBe('Der Spiegel');
    });

    it('should use AI for conflicting data', async () => {
      const variants = [
        { contactData: { publications: ['Spiegel'] } },
        { contactData: { publications: ['BILD'] } },
        { contactData: { publications: ['SZ'] } }
      ];

      // Mock AI response
      const best = await selectBestPublication(variants);

      expect(best.name).toBeDefined();
    });
  });
});
```

## 8. UI-Feedback

Im Import-Modal zeigen wir dem User welche Publikationen gefunden/erstellt wurden:

```typescript
const result = await matchingService.importCandidateWithPublications({...});

if (result.success && result.publicationMatches) {
  const pubNames = result.publicationMatches.map(m => {
    const wasCreated = m.source === 'Neu erstellt';
    return `${m.publicationName}${wasCreated ? ' (neu)' : ''}`;
  });

  toast.success(
    `Kandidat importiert!\n📰 Publikationen: ${pubNames.join(', ')}`,
    { duration: 5000 }
  );
}
```

## 9. Nächster Schritt

→ **Teil 5**: Service Integration (Alles zusammenfügen in matching-service.ts)

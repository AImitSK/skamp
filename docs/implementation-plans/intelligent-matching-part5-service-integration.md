# Intelligent Matching - Teil 5: Service Integration

## Übersicht

Dieser Teil zeigt wie alle Komponenten in den bestehenden `matching-service.ts` integriert werden.

## ⚠️ KRITISCH: Strikte Hierarchie Company → Publication → Person

**FESTE Daten-Hierarchie:**
```
Company (z.B. "Spiegel Verlag")
  └── Publications (z.B. "Der Spiegel", "Spiegel Online") ← MUSS companyId haben!
      └── Contacts (Journalisten) ← MUSS companyId + publications[] haben!
```

**Erlaubte Szenarien:**
1. ✅ Journalist MIT Company UND Publications
2. ✅ Journalist MIT Company OHNE Publications
3. ❌ Journalist OHNE Company MIT Publications → NICHT ERLAUBT!
4. ✅ Journalist OHNE Company OHNE Publications

**Das bedeutet für die Implementation:**
- Publications **MÜSSEN** ein `companyId` haben (PFLICHT!)
- Publication Matching **NUR** wenn Company gefunden/erstellt wurde
- Falls keine Company → **KEINE** Publications zuordnen!

**Korrekter Import-Flow:**
```
1. Company finden/erstellen (optional)
   ↓
2. Publications DIESER Company finden/erstellen (NUR wenn Company gefunden!)
   ↓
3. Kontakt mit companyId + publication-IDs erstellen
```

## 1. Erweiterte Service-Struktur

```typescript
/**
 * src/lib/firebase/matching-service.ts
 */

import { db } from './config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { findCompanyBySignals, createCompany, type CompanyMatch } from '@/lib/matching/company-finder';
import { findPublications, createPublication, type PublicationMatch } from '@/lib/matching/publication-finder';
import { mergeVariantsWithAI } from '@/lib/matching/data-merger';
import { enrichCompanyData, enrichPublicationData } from '@/lib/matching/enrichment-engine';
import { resolveFieldConflict } from '@/lib/matching/conflict-resolver';

/**
 * Erweiterte Import-Funktion mit vollständigem Auto-Matching
 */
export async function importCandidateWithAutoMatching(params: {
  candidateId: string;
  selectedVariantIndex: number;
  userId: string;
  organizationId: string;
}): Promise<{
  success: boolean;
  contactId?: string;
  companyMatch?: {
    companyId: string;
    companyName: string;
    matchType: string;
    confidence: number;
    wasCreated: boolean;
    wasEnriched: boolean;
  };
  publicationMatches?: Array<{
    publicationId: string;
    publicationName: string;
    matchType: string;
    confidence: number;
    wasCreated: boolean;
    wasEnriched: boolean;
  }>;
  error?: string;
}> {
  try {
    // 1. Lade Kandidat
    const candidate = await getCandidate(params.candidateId);
    if (!candidate) {
      return { success: false, error: 'Kandidat nicht gefunden' };
    }

    const selectedVariant = candidate.variants[params.selectedVariantIndex];

    // 2. COMPANY MATCHING
    let companyResult: {
      companyId: string;
      companyName: string;
      matchType: string;
      confidence: number;
      wasCreated: boolean;
      wasEnriched: boolean;
    } | undefined;

    if (selectedVariant.contactData.companyName) {
      companyResult = await handleCompanyMatching({
        variants: candidate.variants,
        selectedVariantIndex: params.selectedVariantIndex,
        organizationId: params.organizationId,
        userId: params.userId
      });
    }

    // 3. PUBLICATION MATCHING
    // ⚠️ KRITISCH: Publications NUR wenn Company gefunden wurde!
    let publicationResults: Array<{
      publicationId: string;
      publicationName: string;
      matchType: string;
      confidence: number;
      wasCreated: boolean;
      wasEnriched: boolean;
    }> = [];

    if (selectedVariant.contactData.hasMediaProfile && companyResult) {
      // ✅ Publications NUR wenn Company vorhanden!
      publicationResults = await handlePublicationMatching({
        companyId: companyResult.companyId,  // ✅ PFLICHT - nicht null!
        variants: candidate.variants,
        organizationId: params.organizationId,
        userId: params.userId
      });
    }

    // 4. KONTAKT ERSTELLEN
    const contactData = selectedVariant.contactData;

    const contactId = await createGlobalContact({
      ...contactData,
      companyId: companyResult?.companyId || null,
      publications: publicationResults.map(p => p.publicationId),
      organizationId: params.organizationId,
      createdBy: params.userId,
      source: 'matching_import',
      importedAt: Timestamp.now(),
      matchingCandidateId: params.candidateId
    });

    // 5. KANDIDAT ALS IMPORTED MARKIEREN
    await updateCandidate(params.candidateId, {
      status: 'imported',
      importedAt: Timestamp.now(),
      importedBy: params.userId,
      importedContactId: contactId,
      selectedVariantIndex: params.selectedVariantIndex
    });

    return {
      success: true,
      contactId,
      companyMatch: companyResult,
      publicationMatches: publicationResults.length > 0 ? publicationResults : undefined
    };

  } catch (error) {
    console.error('Import with auto-matching failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}
```

## 2. Company Matching Handler

```typescript
/**
 * Handled das komplette Company Matching inkl. Erstellung & Enrichment
 */
async function handleCompanyMatching(params: {
  variants: MatchingCandidateVariant[];
  selectedVariantIndex: number;
  organizationId: string;
  userId: string;
}): Promise<{
  companyId: string;
  companyName: string;
  matchType: string;
  confidence: number;
  wasCreated: boolean;
  wasEnriched: boolean;
}> {
  const { variants, selectedVariantIndex, organizationId, userId } = params;

  // 1. Suche nach bestehender Firma
  const companyMatch = await findCompanyBySignals(variants, organizationId);

  if (companyMatch) {
    // Firma gefunden → Prüfe ob Enrichment sinnvoll ist
    const enrichmentResult = await enrichCompanyData({
      companyId: companyMatch.companyId,
      variants,
      selectedVariantIndex,
      organizationId,
      userId
    });

    return {
      companyId: companyMatch.companyId,
      companyName: companyMatch.companyName,
      matchType: companyMatch.matchType,
      confidence: companyMatch.confidence,
      wasCreated: false,
      wasEnriched: enrichmentResult.enriched
    };
  }

  // 2. Keine Firma gefunden → Erstelle neue
  const bestCompanyData = await selectBestCompanyData(variants);

  const newCompanyId = await createCompany({
    name: bestCompanyData.name,
    website: bestCompanyData.website,
    address: bestCompanyData.address,
    organizationId,
    createdBy: userId,
    source: 'auto_matching'
  });

  return {
    companyId: newCompanyId,
    companyName: bestCompanyData.name,
    matchType: 'created',
    confidence: 100,
    wasCreated: true,
    wasEnriched: false
  };
}

/**
 * Wählt die besten Company-Daten aus mehreren Varianten
 */
async function selectBestCompanyData(
  variants: MatchingCandidateVariant[]
): Promise<{
  name: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}> {
  // Falls nur 1 Variante → Easy
  if (variants.length === 1) {
    return {
      name: variants[0].contactData.companyName!,
      website: extractWebsite(variants[0])
    };
  }

  // Falls mehrere → AI Merge
  const merged = await mergeVariantsWithAI(variants);

  return {
    name: merged.companyName || variants[0].contactData.companyName!,
    website: merged.companyWebsite
  };
}

function extractWebsite(variant: MatchingCandidateVariant): string | undefined {
  // Versuche Website aus verschiedenen Quellen zu extrahieren
  // 1. Direkt aus companyWebsite
  // 2. Aus socialProfiles
  // 3. Aus E-Mail-Domain
  return undefined; // Implementierung siehe Teil 1
}
```

## 3. Publication Matching Handler

```typescript
/**
 * Handled das komplette Publication Matching inkl. Erstellung & Enrichment
 *
 * ⚠️ KRITISCH: Publications MÜSSEN zu einer Company gehören!
 * companyId ist PFLICHT!
 */
async function handlePublicationMatching(params: {
  companyId: string;  // ✅ PFLICHT - nicht null!
  variants: MatchingCandidateVariant[];
  organizationId: string;
  userId: string;
}): Promise<Array<{
  publicationId: string;
  publicationName: string;
  matchType: string;
  confidence: number;
  wasCreated: boolean;
  wasEnriched: boolean;
}>> {
  const { companyId, variants, organizationId, userId } = params;

  // 1. Finde bestehende Publikationen DIESER Company
  const publicationMatches = await findPublications(
    companyId,  // ✅ PFLICHT - sucht nur Publications dieser Company!
    variants,
    organizationId
  );

  const results: Array<{
    publicationId: string;
    publicationName: string;
    matchType: string;
    confidence: number;
    wasCreated: boolean;
    wasEnriched: boolean;
  }> = [];

  if (publicationMatches.length > 0) {
    // Publikationen gefunden → Prüfe Enrichment
    for (const match of publicationMatches) {
      const enrichmentResult = await enrichPublicationData({
        publicationId: match.publicationId,
        variants,
        organizationId,
        userId
      });

      results.push({
        publicationId: match.publicationId,
        publicationName: match.publicationName,
        matchType: match.matchType,
        confidence: match.confidence,
        wasCreated: false,
        wasEnriched: enrichmentResult.enriched
      });
    }

    return results;
  }

  // 2. Keine Publikation gefunden → Erstelle neue Publication FÜR DIESE Company
  const bestPubData = await selectBestPublication(variants);

  const newPubId = await createPublication({
    name: bestPubData.name,
    companyId,  // ✅ PFLICHT - Publication gehört zu dieser Company!
    website: bestPubData.website,
    organizationId,
    createdBy: userId,
    source: 'auto_matching'
  });

  results.push({
    publicationId: newPubId,
    publicationName: bestPubData.name,
    matchType: 'created',
    confidence: 100,
    wasCreated: true,
    wasEnriched: false
  });

  return results;
}
```

## 4. Global Contact Creation

```typescript
/**
 * Erstellt einen neuen Global Contact
 */
async function createGlobalContact(data: {
  name: ContactName;
  displayName: string;
  emails?: ContactEmail[];
  phones?: ContactPhone[];
  position?: string;
  department?: string;
  companyId?: string | null;
  companyName?: string;
  publications?: string[];
  beats?: string[];
  mediaTypes?: string[];
  socialProfiles?: SocialProfile[];
  hasMediaProfile: boolean;
  organizationId: string;
  createdBy: string;
  source: string;
  importedAt?: Timestamp;
  matchingCandidateId?: string;
}): Promise<string> {
  const contactsRef = collection(db, 'superadmin_contacts');

  const contactData = {
    // Name
    'name.title': data.name.title || null,
    'name.firstName': data.name.firstName || '',
    'name.lastName': data.name.lastName || '',
    'name.suffix': data.name.suffix || null,
    displayName: data.displayName,

    // Kontakt
    emails: data.emails || [],
    phones: data.phones || [],

    // Position
    position: data.position || null,
    department: data.department || null,

    // Firma
    companyId: data.companyId || null,
    companyName: data.companyName || null,

    // Publikationen
    publications: data.publications || [],

    // Media Profile
    hasMediaProfile: data.hasMediaProfile,
    beats: data.beats || [],
    mediaTypes: data.mediaTypes || [],

    // Social
    socialProfiles: data.socialProfiles || [],

    // Meta
    organizationId: data.organizationId,
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    deletedAt: null,
    source: data.source,
    importedAt: data.importedAt || null,
    matchingCandidateId: data.matchingCandidateId || null
  };

  const docRef = await addDoc(contactsRef, contactData);
  return docRef.id;
}
```

## 5. Update Candidate Status

```typescript
/**
 * Aktualisiert den Status eines Kandidaten
 */
async function updateCandidate(
  candidateId: string,
  updates: {
    status?: 'pending' | 'imported' | 'skipped' | 'rejected';
    importedAt?: Timestamp;
    importedBy?: string;
    importedContactId?: string;
    selectedVariantIndex?: number;
    skippedAt?: Timestamp;
    skippedBy?: string;
    skippedReason?: string;
    rejectedAt?: Timestamp;
    rejectedBy?: string;
    rejectedReason?: string;
  }
): Promise<void> {
  const candidateRef = doc(db, 'matching_candidates', candidateId);

  await updateDoc(candidateRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}
```

## 6. Bestehende Service-Funktionen erweitern

```typescript
/**
 * Skip Candidate - bereits implementiert
 */
export async function skipCandidate(params: {
  candidateId: string;
  userId: string;
  reason?: string;
}): Promise<void> {
  await updateCandidate(params.candidateId, {
    status: 'skipped',
    skippedAt: Timestamp.now(),
    skippedBy: params.userId,
    skippedReason: params.reason || 'Manually skipped'
  });
}

/**
 * Reject Candidate - bereits implementiert
 */
export async function rejectCandidate(params: {
  candidateId: string;
  userId: string;
  reason: string;
}): Promise<void> {
  await updateCandidate(params.candidateId, {
    status: 'rejected',
    rejectedAt: Timestamp.now(),
    rejectedBy: params.userId,
    rejectedReason: params.reason
  });
}

/**
 * Get Candidate - bereits implementiert
 */
async function getCandidate(candidateId: string): Promise<MatchingCandidate | null> {
  const candidateRef = doc(db, 'matching_candidates', candidateId);
  const snapshot = await getDoc(candidateRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  } as MatchingCandidate;
}

/**
 * Get Recommendation - bereits implementiert
 */
export function getRecommendation(candidate: MatchingCandidate): CandidateRecommendation {
  // Bestehende Implementierung beibehalten
  // ...
}
```

## 7. Export aller Funktionen

```typescript
/**
 * src/lib/firebase/matching-service.ts
 */

export {
  // Main Import Function
  importCandidateWithAutoMatching,

  // Candidate Management
  skipCandidate,
  rejectCandidate,
  getCandidate,
  getRecommendation,

  // Helper Functions (für Tests)
  handleCompanyMatching,
  handlePublicationMatching,
  createGlobalContact,
  updateCandidate
};

// Type Exports
export type {
  MatchingCandidate,
  MatchingCandidateVariant,
  CandidateRecommendation,
  CompanyMatch,
  PublicationMatch
};
```

## 8. Error Handling & Logging

```typescript
/**
 * Wrapper für besseres Error Handling
 */
async function safeImport(params: {
  candidateId: string;
  selectedVariantIndex: number;
  userId: string;
  organizationId: string;
}): Promise<{
  success: boolean;
  contactId?: string;
  companyMatch?: any;
  publicationMatches?: any[];
  error?: string;
  warnings?: string[];
}> {
  const warnings: string[] = [];

  try {
    // Company Matching mit Fallback
    let companyResult;
    try {
      companyResult = await handleCompanyMatching({...});
    } catch (error) {
      console.error('Company matching failed:', error);
      warnings.push('Firmen-Matching fehlgeschlagen. Kontakt ohne Firma erstellt.');
    }

    // Publication Matching mit Fallback
    let publicationResults = [];
    try {
      publicationResults = await handlePublicationMatching({...});
    } catch (error) {
      console.error('Publication matching failed:', error);
      warnings.push('Publikations-Matching fehlgeschlagen. Kontakt ohne Publikationen erstellt.');
    }

    // Kontakt erstellen (sollte immer funktionieren)
    const contactId = await createGlobalContact({...});

    return {
      success: true,
      contactId,
      companyMatch: companyResult,
      publicationMatches: publicationResults,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('Import completely failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}
```

## 9. Audit Trail

```typescript
/**
 * Protokolliert alle Matching-Aktionen für Audit
 */
async function logMatchingAction(params: {
  action: 'import' | 'skip' | 'reject' | 'enrich' | 'conflict_detected';
  candidateId: string;
  userId: string;
  organizationId: string;
  details: {
    contactId?: string;
    companyMatch?: any;
    publicationMatches?: any[];
    enrichments?: any[];
    conflicts?: any[];
    [key: string]: any;
  };
}): Promise<void> {
  const auditRef = collection(db, 'matching_audit_log');

  await addDoc(auditRef, {
    action: params.action,
    candidateId: params.candidateId,
    userId: params.userId,
    organizationId: params.organizationId,
    details: params.details,
    timestamp: Timestamp.now()
  });
}

// Integration in importCandidateWithAutoMatching
async function importCandidateWithAutoMatching(params: {...}): Promise<{...}> {
  const result = await safeImport(params);

  // Log Aktion
  await logMatchingAction({
    action: 'import',
    candidateId: params.candidateId,
    userId: params.userId,
    organizationId: params.organizationId,
    details: {
      success: result.success,
      contactId: result.contactId,
      companyMatch: result.companyMatch,
      publicationMatches: result.publicationMatches,
      warnings: result.warnings
    }
  });

  return result;
}
```

## 10. Tests

```typescript
/**
 * src/lib/firebase/__tests__/matching-service.test.ts
 */

describe('Matching Service Integration', () => {
  describe('importCandidateWithAutoMatching', () => {
    it('should import candidate with company matching', async () => {
      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.contactId).toBeDefined();
      expect(result.companyMatch).toBeDefined();
      expect(result.companyMatch?.companyId).toBeDefined();
    });

    it('should create new company if not found', async () => {
      const result = await importCandidateWithAutoMatching({...});

      expect(result.success).toBe(true);
      expect(result.companyMatch?.wasCreated).toBe(true);
    });

    it('should enrich existing company', async () => {
      const result = await importCandidateWithAutoMatching({...});

      expect(result.success).toBe(true);
      expect(result.companyMatch?.wasEnriched).toBe(true);
    });

    it('should handle publication matching', async () => {
      const result = await importCandidateWithAutoMatching({...});

      expect(result.success).toBe(true);
      expect(result.publicationMatches).toBeDefined();
      expect(result.publicationMatches?.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      // Mock error
      const result = await importCandidateWithAutoMatching({...});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

## 11. Nächster Schritt

→ **Teil 6**: UI Integration (Modal-Updates, Settings-Testseite, User-Feedback)

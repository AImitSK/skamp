/**
 * Matching Candidates Service
 *
 * Kern-Service für das Matching-Kandidaten Feature:
 * - Scannt alle Organisationen nach ähnlichen Journalisten
 * - Berechnet Qualitäts-Scores
 * - Verwaltet Kandidaten-Lifecycle (pending → imported/skipped/rejected)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import { contactsEnhancedService } from './crm-service-enhanced';
import { referenceService } from './reference-service';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { apiClient } from '@/lib/api/api-client';
import {
  MatchingCandidate,
  MatchingCandidateVariant,
  MatchingCandidateContactData,
  MatchingScanJob,
  MatchingScanOptions,
  MatchingCandidateFilters,
  MatchingCandidateSorting,
  MatchingCandidatePagination,
  MatchingAnalytics,
  ImportCandidateRequest,
  ImportCandidateResponse,
  SkipCandidateRequest,
  RejectCandidateRequest,
  MatchKeyResult,
  ScoreCalculation,
  CandidateRecommendation,
  MATCHING_DEFAULTS
} from '@/types/matching';

// Intelligent Matching Imports
import { findOrCreateCompany } from '@/lib/matching/company-finder';
import { findPublications, createPublication } from '@/lib/matching/publication-finder';
import { mergeVariantsWithAI } from '@/lib/matching/data-merger';
import { enrichCompany } from '@/lib/matching/enrichment-engine';

/**
 * Erweiterte Import-Funktion mit vollständigem Auto-Matching
 */
export async function importCandidateWithAutoMatching(params: {
  candidateId: string;
  selectedVariantIndex: number;
  userId: string;
  userEmail: string; // ✅ Für SuperAdmin-Erkennung
  organizationId: string;
  useAiMerge?: boolean; // ✅ KI-Daten-Merge Toggle
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
    // ✅ SuperAdmin-Erkennung via Email
    const { SUPER_ADMIN_EMAIL } = await import('@/lib/hooks/useAutoGlobal');
    const autoGlobalMode = params.userEmail === SUPER_ADMIN_EMAIL;

    console.log('\n🔄 ===== IMPORT MIT AUTO-MATCHING STARTEN =====');
    console.log('📋 Request:', {
      candidateId: params.candidateId,
      selectedVariantIndex: params.selectedVariantIndex,
      userId: params.userId,
      userEmail: params.userEmail,
      organizationId: params.organizationId,
      autoGlobalMode: autoGlobalMode
    });

    // 1. Lade Kandidat
    // 1. Lade Kandidat direkt aus Firestore
    const candidateDoc = await getDoc(doc(db, 'matching_candidates', params.candidateId));

    if (!candidateDoc.exists()) {
      console.error('❌ Kandidat nicht gefunden:', params.candidateId);
      return { success: false, error: 'Kandidat nicht gefunden' };
    }

    const candidate = { id: candidateDoc.id, ...candidateDoc.data() } as MatchingCandidate;
    console.log('✅ Kandidat geladen:', {
      matchKey: candidate.matchKey,
      matchType: candidate.matchType,
      score: candidate.score,
      variantenAnzahl: candidate.variants.length
    });

    // 🤖 KI-DATEN-MERGE (falls aktiviert UND mehrere Varianten)
    let contactDataToUse: any;

    if (params.useAiMerge && candidate.variants.length > 1) {
      console.log('\n🤖 ===== KI-DATEN-MERGE AKTIVIERT (GENKIT) =====');
      console.log(`📊 Merge ${candidate.variants.length} Varianten mit Gemini AI via Genkit...`);

      try {
        // ✅ API Route verwenden (server-side, läuft in Edge/Vercel Function)
        const result = await apiClient.post<any>('/api/ai/merge-variants', {
          variants: candidate.variants
        });

        if (!result.success) {
          throw new Error(result.error || 'KI-Merge fehlgeschlagen');
        }

        console.log('✅ AI-Merge erfolgreich (Gemini 2.0 Flash)!');
        console.log('📋 Gemergter Datensatz:', {
          name: result.mergedData.displayName,
          emails: result.mergedData.emails?.length || 0,
          phones: result.mergedData.phones?.length || 0,
          beats: result.mergedData.beats?.length || 0,
          publications: result.mergedData.publications?.length || 0
        });

        contactDataToUse = result.mergedData;

      } catch (error) {
        console.error('❌ AI-Merge Error:', error);
        console.log('⤵️  Fallback: Nutze ausgewählte Variante');
        contactDataToUse = candidate.variants[params.selectedVariantIndex].contactData;
      }
    } else {
      if (params.useAiMerge && candidate.variants.length === 1) {
        console.log('ℹ️  KI-Merge übersprungen (nur 1 Variante)');
      } else {
        console.log('ℹ️  KI-Merge deaktiviert');
      }
      contactDataToUse = candidate.variants[params.selectedVariantIndex].contactData;
    }

    // Log finale Contact-Daten
    const selectedVariant = candidate.variants[params.selectedVariantIndex];
    console.log('👤 Finale Kontakt-Daten:', {
      usedAiMerge: params.useAiMerge && candidate.variants.length > 1,
      organization: selectedVariant.organizationName,
      name: contactDataToUse.displayName,
      email: contactDataToUse.emails?.[0]?.email,
      position: contactDataToUse.position,
      companyName: contactDataToUse.companyName,
      hasMediaProfile: contactDataToUse.hasMediaProfile
    });

    // 2. COMPANY MATCHING
    console.log('\n🏢 ===== COMPANY MATCHING =====');
    let companyResult: {
      companyId: string;
      companyName: string;
      matchType: string;
      confidence: number;
      wasCreated: boolean;
      wasEnriched: boolean;
    } | undefined;

    if (contactDataToUse.companyName) {
      console.log('🔍 Suche Company:', contactDataToUse.companyName);
      companyResult = await handleCompanyMatching({
        variants: candidate.variants,
        selectedVariantIndex: params.selectedVariantIndex,
        organizationId: params.organizationId,
        userId: params.userId,
        autoGlobalMode: autoGlobalMode
      });
      console.log('✅ Company Match:', {
        companyId: companyResult.companyId,
        companyName: companyResult.companyName,
        matchType: companyResult.matchType,
        wasCreated: companyResult.wasCreated,
        wasEnriched: companyResult.wasEnriched
      });
    } else {
      console.log('⚠️ Keine Company vorhanden (Freier Journalist)');
    }

    // 3. PUBLICATION MATCHING
    console.log('\n📰 ===== PUBLICATION MATCHING =====');
    // ⚠️ KRITISCH: Publications NUR wenn Company gefunden wurde!
    let publicationResults: Array<{
      publicationId: string;
      publicationName: string;
      matchType: string;
      confidence: number;
      wasCreated: boolean;
      wasEnriched: boolean;
    }> = [];

    if (contactDataToUse.hasMediaProfile && companyResult) {
      console.log('🔍 Suche Publications für Company:', companyResult.companyName);
      // ✅ Publications NUR wenn Company vorhanden!
      publicationResults = await handlePublicationMatching({
        companyId: companyResult.companyId,  // ✅ PFLICHT - nicht null!
        companyName: companyResult.companyName, // ✅ Für publisherName Feld
        variants: candidate.variants,
        selectedVariantIndex: params.selectedVariantIndex, // ✅ Nur ausgewählte Variante verwenden
        contactDataToUse: contactDataToUse, // ✅ Finale Contact-Daten (ggf. AI-gemerged)
        organizationId: params.organizationId,
        userId: params.userId,
        autoGlobalMode: autoGlobalMode
      });
      console.log('✅ Publication Matches:', publicationResults.map(p => ({
        publicationName: p.publicationName,
        wasCreated: p.wasCreated,
        matchType: p.matchType
      })));
    } else if (contactDataToUse.hasMediaProfile && !companyResult) {
      console.log('⚠️ Journalist OHNE Company → Keine Publications');
    } else {
      console.log('ℹ️ Kein Journalist → Keine Publications');
    }

    // 4. KONTAKT ERSTELLEN
    console.log('\n👤 ===== KONTAKT ERSTELLEN =====');
    const contactData = contactDataToUse;

    // Bereite Kontakt-Daten vor mit mediaProfile wenn Journalist
    const contactToCreate: any = {
      ...contactData,
      companyId: companyResult?.companyId || null,
      organizationId: params.organizationId,
      createdBy: params.userId,
      source: 'matching_import',
      matchingCandidateId: params.candidateId
      // isGlobal wird automatisch durch useAutoGlobal() + interceptSave() gesetzt
    };

    // WICHTIG: Setze mediaProfile wenn hasMediaProfile = true
    if (contactData.hasMediaProfile) {
      contactToCreate.mediaProfile = {
        isJournalist: true,
        beats: contactData.beats || [],
        mediaTypes: contactData.mediaTypes || [],
        publicationIds: publicationResults.map(p => p.publicationId) || []
      };
    }

    console.log('📝 Contact-Daten:', {
      name: contactToCreate.displayName,
      email: contactToCreate.emails?.[0]?.email,
      position: contactToCreate.position,
      companyId: contactToCreate.companyId,
      organizationId: contactToCreate.organizationId,
      hasMediaProfile: !!contactToCreate.mediaProfile,
      publicationIds: contactToCreate.mediaProfile?.publicationIds?.length || 0
    });

    // 4. KONTAKT ERSTELLEN - verwende contactsEnhancedService
    const contactId = await contactsEnhancedService.create(
      contactToCreate,
      {
        organizationId: params.organizationId,
        userId: params.userId,
        autoGlobalMode: autoGlobalMode // ✅ SuperAdmin → automatisch global
      }
    );

    console.log('✅ Contact erstellt:', contactId);

    // 5. KANDIDAT ALS IMPORTED MARKIEREN
    console.log('\n📌 Markiere Kandidat als importiert...');
    await updateDoc(doc(db, 'matching_candidates', params.candidateId), {
      status: 'imported',
      importedAt: Timestamp.now(),
      importedBy: params.userId,
      importedContactId: contactId,
      selectedVariantIndex: params.selectedVariantIndex
    });

    console.log('\n✅ ===== IMPORT ERFOLGREICH ABGESCHLOSSEN =====');
    console.log('📊 Zusammenfassung:', {
      contactId,
      company: companyResult ? {
        name: companyResult.companyName,
        wasCreated: companyResult.wasCreated,
        wasEnriched: companyResult.wasEnriched
      } : 'keine',
      publications: publicationResults.length,
      organizationId: params.organizationId
    });
    console.log('==============================================\n');

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

/**
 * Handled das komplette Company Matching inkl. Erstellung & Enrichment
 */
async function handleCompanyMatching(params: {
  variants: MatchingCandidateVariant[];
  selectedVariantIndex: number;
  organizationId: string;
  userId: string;
  autoGlobalMode: boolean;
}): Promise<{
  companyId: string;
  companyName: string;
  matchType: string;
  confidence: number;
  wasCreated: boolean;
  wasEnriched: boolean;
}> {
  const { variants, selectedVariantIndex, organizationId, userId, autoGlobalMode } = params;

  // 1. Suche nach bestehender Firma oder erstelle neue
  const companyMatch = await findOrCreateCompany(variants, organizationId, userId, autoGlobalMode);

  if (!companyMatch.wasCreated) {
    // Firma gefunden → Prüfe ob Enrichment sinnvoll ist
    const existingCompany = await getDoc(doc(db, 'companies_enhanced', companyMatch.companyId!));

    if (existingCompany.exists()) {
      const enrichmentResult = await enrichCompany(
        companyMatch.companyId!,
        existingCompany.data(),
        {}, // newData - TODO: extract from variants
        variants,
        0.8, // confidence
        userId
      );

      return {
        companyId: companyMatch.companyId!,
        companyName: companyMatch.companyName!,
        matchType: companyMatch.method,
        confidence: companyMatch.confidence === 'high' ? 0.9 : companyMatch.confidence === 'medium' ? 0.7 : 0.5,
        wasCreated: false,
        wasEnriched: enrichmentResult.enriched
      };
    }
  }

  // Neue Company erstellt
  return {
    companyId: companyMatch.companyId!,
    companyName: companyMatch.companyName!,
    matchType: companyMatch.method,
    confidence: 1.0,
    wasCreated: true,
    wasEnriched: false
  };
}

/**
 * Handled das komplette Publication Matching inkl. Erstellung
 */
async function handlePublicationMatching(params: {
  companyId: string;  // ✅ PFLICHT - nicht null!
  companyName: string; // ✅ Für publisherName Feld
  variants: MatchingCandidateVariant[];
  selectedVariantIndex: number; // ✅ Index der ausgewählten Variante
  contactDataToUse: any; // ✅ Finale Contact-Daten (ggf. AI-gemerged)
  organizationId: string;
  userId: string;
  autoGlobalMode: boolean;
}): Promise<Array<{
  publicationId: string;
  publicationName: string;
  matchType: string;
  confidence: number;
  wasCreated: boolean;
  wasEnriched: boolean;
}>> {
  const { companyId, companyName, variants, selectedVariantIndex, contactDataToUse, organizationId, userId, autoGlobalMode } = params;

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
    // Publikationen gefunden - prüfe ob Migration/Enrichment nötig
    const { migrateToMonitoringConfig } = await import('@/lib/utils/publication-helpers');

    for (const match of publicationMatches) {
      let wasEnriched = false;

      // Lade Publication um monitoringConfig zu prüfen
      try {
        const { doc, getDoc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');

        const pubRef = doc(db, 'publications', match.publicationId);
        const pubSnap = await getDoc(pubRef);

        if (pubSnap.exists()) {
          const pubData = pubSnap.data();

          // Migration: Alte Felder → monitoringConfig
          const migratedConfig = migrateToMonitoringConfig(pubData);

          if (migratedConfig) {
            await updateDoc(pubRef, {
              monitoringConfig: migratedConfig,
              updatedAt: new Date()
            });

            wasEnriched = true;
            console.log(`✅ Publication ${match.publicationName} migriert zu monitoringConfig`);
          }
        }
      } catch (error) {
        console.error(`⚠️ Fehler beim Enrichment von Publication ${match.publicationId}:`, error);
      }

      results.push({
        publicationId: match.publicationId,
        publicationName: match.publicationName,
        matchType: match.matchType,
        confidence: match.confidence,
        wasCreated: false,
        wasEnriched
      });
    }

    return results;
  }

  // 2. Keine Publikation gefunden → Erstelle neue Publication FÜR DIESE Company
  // ✅ NUR Publications aus den finalen Contact-Daten verwenden (ausgewählte Variante oder AI-Merge)
  const publicationNames = new Set<string>();

  if (contactDataToUse.publications && contactDataToUse.publications.length > 0) {
    contactDataToUse.publications.forEach((pub: string) => publicationNames.add(pub));
    console.log(`📋 Verwende ${publicationNames.size} Publications aus ${contactDataToUse.usedAiMerge ? 'AI-Merge' : 'ausgewählter Variante'}`);
  } else {
    console.log('⚠️ Keine Publications in Contact-Daten gefunden');
  }

  // Erstelle Publications
  for (const pubName of publicationNames) {
    const newPubId = await createPublication({
      name: pubName,
      companyId: companyId,  // ✅ PFLICHT - Publication gehört zu dieser Company!
      companyName: companyName,
      organizationId: organizationId,
      createdBy: userId,
      source: 'auto_matching',
      autoGlobalMode: autoGlobalMode
    });

    results.push({
      publicationId: newPubId,
      publicationName: pubName,
      matchType: 'created',
      confidence: 1.0,
      wasCreated: true,
      wasEnriched: false
    });
  }

  return results;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generiert Match-Key aus Kontakt
 * Strategie 1: E-Mail (bevorzugt)
 * Strategie 2: Normalisierter Name (Fallback)
 */
function generateMatchKey(contact: ContactEnhanced): MatchKeyResult {
  // Strategie 1: E-Mail
  const primaryEmail = contact.emails?.find(e => e.isPrimary)?.email ||
                       contact.emails?.[0]?.email;

  if (primaryEmail) {
    return {
      key: primaryEmail.toLowerCase().trim(),
      type: 'email',
      source: { email: primaryEmail }
    };
  }

  // Strategie 2: Name normalisiert
  const firstName = contact.name?.firstName || '';
  const lastName = contact.name?.lastName || '';

  const normalizedName = `${firstName} ${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return {
    key: normalizedName,
    type: 'name',
    source: {
      firstName,
      lastName
    }
  };
}

/**
 * Konvertiert ContactEnhanced zu MatchingCandidateContactData (Snapshot)
 */
async function createContactSnapshot(contact: ContactEnhanced): Promise<MatchingCandidateContactData> {
  const snapshot: any = {
    name: {
      firstName: contact.name?.firstName || '',
      lastName: contact.name?.lastName || ''
    },
    displayName: contact.displayName || '',
    emails: contact.emails || [],
    hasMediaProfile: !!contact.mediaProfile,
    publications: []
  };

  // Lade Publication-Namen wenn verfügbar
  if (contact.mediaProfile?.publicationIds && contact.mediaProfile.publicationIds.length > 0) {
    const publicationNames: string[] = [];

    for (const pubId of contact.mediaProfile.publicationIds) {
      try {
        let pubName: string | undefined;

        // Check if this is a reference (local-ref-*)
        if (pubId.startsWith('local-ref-')) {
          // Extract organizationId from contact
          const orgId = contact.organizationId;
          if (orgId) {
            // Load reference to get globalPublicationId
            const refDoc = await getDoc(doc(db, 'organizations', orgId, 'publication_references', pubId));
            if (refDoc.exists()) {
              const globalPubId = refDoc.data().globalPublicationId;
              // Load actual publication
              const globalPubDoc = await getDoc(doc(db, 'publications', globalPubId));
              if (globalPubDoc.exists()) {
                pubName = globalPubDoc.data().title || globalPubDoc.data().name;
              }
            }
          }
        } else {
          // Normal publication
          const pubDoc = await getDoc(doc(db, 'publications', pubId));
          if (pubDoc.exists()) {
            pubName = pubDoc.data().title || pubDoc.data().name;
          }
        }

        if (pubName) publicationNames.push(pubName);
      } catch (error) {
        console.warn(`Could not load publication ${pubId}:`, error);
      }
    }

    if (publicationNames.length > 0) {
      snapshot.publications = publicationNames;
    }
  }

  // Nur definierte Felder hinzufügen
  if (contact.name?.title) snapshot.name.title = contact.name.title;
  if (contact.name?.suffix) snapshot.name.suffix = contact.name.suffix;
  if (contact.phones && contact.phones.length > 0) snapshot.phones = contact.phones;
  if (contact.position) snapshot.position = contact.position;
  if (contact.department) snapshot.department = contact.department;
  if (contact.companyName) snapshot.companyName = contact.companyName;
  if (contact.companyId) snapshot.companyId = contact.companyId;
  if (contact.mediaProfile?.beats && contact.mediaProfile.beats.length > 0) {
    snapshot.beats = contact.mediaProfile.beats;
  }
  if (contact.mediaProfile?.mediaTypes && contact.mediaProfile.mediaTypes.length > 0) {
    snapshot.mediaTypes = contact.mediaProfile.mediaTypes;
  }
  if (contact.socialProfiles && contact.socialProfiles.length > 0) {
    snapshot.socialProfiles = contact.socialProfiles;
  }
  if (contact.photoUrl) snapshot.photoUrl = contact.photoUrl;
  if (contact.website) snapshot.website = contact.website;

  return snapshot;
}

/**
 * Berechnet Qualitäts-Score für einen Kandidaten
 */
function scoreCandidate(variants: MatchingCandidateVariant[]): ScoreCalculation {
  const uniqueOrgs = new Set(variants.map(v => v.organizationId));
  const orgCount = uniqueOrgs.size;

  // Basis-Score: Anzahl Organisationen
  let organizationScore = 0;
  if (orgCount >= 2) organizationScore = 50;
  if (orgCount >= 3) organizationScore += 10;
  if (orgCount >= 4) organizationScore += 10;

  // Qualitäts-Faktoren (beste Variante zählt)
  let mediaProfileScore = 0;
  let verifiedEmailScore = 0;
  let phoneScore = 0;
  let beatsScore = 0;
  let socialMediaScore = 0;

  for (const variant of variants) {
    const data = variant.contactData;

    // Media-Profil vorhanden
    if (data.hasMediaProfile && mediaProfileScore < 10) {
      mediaProfileScore = 10;
    }

    // Verifizierte E-Mail-Domain
    const hasVerifiedDomain = data.emails?.some(e => {
      const domain = e.email.split('@')[1]?.toLowerCase();
      const verifiedDomains = [
        'spiegel.de', 'zeit.de', 'faz.net', 'sueddeutsche.de',
        'taz.de', 'bild.de', 'welt.de', 'handelsblatt.com',
        'wiwo.de', 'manager-magazin.de'
      ];
      return verifiedDomains.includes(domain);
    });
    if (hasVerifiedDomain && verifiedEmailScore < 10) {
      verifiedEmailScore = 10;
    }

    // Telefonnummer vorhanden
    if (data.phones && data.phones.length > 0 && phoneScore < 5) {
      phoneScore = 5;
    }

    // Beats definiert
    if (data.beats && data.beats.length > 0 && beatsScore < 5) {
      beatsScore = 5;
    }

    // Social Media Profile
    if (data.socialProfiles && data.socialProfiles.length > 0 && socialMediaScore < 5) {
      socialMediaScore = 5;
    }
  }

  const total = organizationScore +
                mediaProfileScore +
                verifiedEmailScore +
                phoneScore +
                beatsScore +
                socialMediaScore;

  return {
    total,
    breakdown: {
      organizationCount: organizationScore,
      mediaProfile: mediaProfileScore,
      verifiedEmail: verifiedEmailScore,
      phoneNumber: phoneScore,
      beats: beatsScore,
      socialMedia: socialMediaScore,
      completeness: 0 // Reserved für zukünftige Erweiterung
    }
  };
}

/**
 * Empfiehlt die beste Variante
 */
function recommendVariant(variants: MatchingCandidateVariant[]): CandidateRecommendation {
  let bestIndex = 0;
  let bestScore = 0;
  let reason = '';

  variants.forEach((variant, index) => {
    const data = variant.contactData;
    let score = 0;

    // Vollständigkeit
    if (data.hasMediaProfile) score += 30;
    if (data.emails && data.emails.length > 0) score += 20;
    if (data.phones && data.phones.length > 0) score += 15;
    if (data.beats && data.beats.length > 0) score += 15;
    if (data.position) score += 10;
    if (data.socialProfiles && data.socialProfiles.length > 0) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
      reason = 'Vollständigstes Profil mit den meisten Daten';
    }
  });

  return {
    recommendedIndex: bestIndex,
    reason,
    score: bestScore
  };
}

// ========================================
// MATCHING SERVICE
// ========================================

class MatchingCandidatesService {
  private candidatesCollection = 'matching_candidates';
  private jobsCollection = 'matching_scan_jobs';

  /**
   * Haupt-Scan: Findet Matching-Kandidaten über alle Organisationen
   */
  async scanForCandidates(options: MatchingScanOptions = {}): Promise<MatchingScanJob> {
    console.log('🔍 Starting matching scan...', options);

    // Schwellwerte (Development-Modus berücksichtigen)
    const minOrgs = options.developmentMode
      ? MATCHING_DEFAULTS.DEV_MIN_ORGANIZATIONS
      : (options.minOrganizations || MATCHING_DEFAULTS.MIN_ORGANIZATIONS);

    const minScore = options.developmentMode
      ? MATCHING_DEFAULTS.DEV_MIN_SCORE
      : (options.minScore || MATCHING_DEFAULTS.MIN_SCORE);

    // Erstelle Scan-Job
    const jobData = {
      status: 'running' as const,
      stats: {
        organizationsScanned: 0,
        contactsScanned: 0,
        candidatesCreated: 0,
        candidatesUpdated: 0,
        errors: 0,
        skippedReferences: 0,
        skippedNoEmail: 0
      },
      startedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      triggeredBy: options.organizationIds ? 'manual' : 'auto',
      options
    };

    const jobRef = await addDoc(collection(db, this.jobsCollection), jobData);
    const jobId = jobRef.id;

    try {
      // 1. Lade alle Organisationen
      const orgsQuery = query(collection(db, 'organizations'));
      const orgsSnapshot = await getDocs(orgsQuery);
      const organizations = orgsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as { id: string; name?: string; type?: string }))
        .filter(org => {
          // Filter SuperAdmin-Org
          if (org.type === 'super_admin') return false;

          // Optionaler Filter auf bestimmte Orgs
          if (options.organizationIds && options.organizationIds.length > 0) {
            return options.organizationIds.includes(org.id);
          }

          return true;
        });

      console.log(`📊 Scanning ${organizations.length} organizations...`);

      // 2. Sammle alle Kontakte nach matchKey
      const contactsByMatchKey = new Map<string, Array<{
        contact: ContactEnhanced;
        organizationId: string;
        organizationName: string;
      }>>();

      let totalContactsScanned = 0;
      let totalSkippedReferences = 0;
      let totalSkippedNoEmail = 0;

      for (const org of organizations) {
        try {
          const contacts = await contactsEnhancedService.getAll(org.id);

          // Filter: nur Journalisten (haben mediaProfile)
          const journalists = contacts.filter(c => c.mediaProfile);

          console.log(`  ✓ ${org.name || org.id}: ${journalists.length} journalists`);

          for (const contact of journalists) {
            totalContactsScanned++;

            // Skip wenn bereits Reference
            if (contact.id?.startsWith('local-ref-')) {
              totalSkippedReferences++;
              continue;
            }

            // Generiere Match-Key
            const matchKeyResult = generateMatchKey(contact);

            // Skip wenn kein Match-Key generiert werden konnte
            if (!matchKeyResult.key) {
              totalSkippedNoEmail++;
              continue;
            }

            // Füge zu Map hinzu
            if (!contactsByMatchKey.has(matchKeyResult.key)) {
              contactsByMatchKey.set(matchKeyResult.key, []);
            }

            contactsByMatchKey.get(matchKeyResult.key)!.push({
              contact,
              organizationId: org.id,
              organizationName: org.name || org.id
            });
          }
        } catch (error) {
          console.error(`❌ Error scanning org ${org.id}:`, error);
          jobData.stats.errors++;
        }
      }

      // 3. Erstelle Kandidaten für Matches mit genügend Orgs
      let candidatesCreated = 0;
      let candidatesUpdated = 0;

      console.log(`🔄 Processing ${contactsByMatchKey.size} unique match keys...`);

      for (const [matchKey, contacts] of contactsByMatchKey.entries()) {
        // Prüfe: genug verschiedene Organisationen?
        const uniqueOrgs = new Set(contacts.map(c => c.organizationId));

        if (uniqueOrgs.size < minOrgs) {
          continue;
        }

        // Erstelle Varianten (async wegen Publication-Namen laden)
        const variants: MatchingCandidateVariant[] = [];
        for (const c of contacts) {
          const contactData = await createContactSnapshot(c.contact);
          variants.push({
            organizationId: c.organizationId,
            organizationName: c.organizationName,
            contactId: c.contact.id!,
            contactData
          });
        }

        // Berechne Score
        const scoreCalc = scoreCandidate(variants);

        if (scoreCalc.total < minScore) {
          continue;
        }

        // Prüfe ob Kandidat bereits existiert
        const existingQuery = query(
          collection(db, this.candidatesCollection),
          where('matchKey', '==', matchKey)
        );
        const existingSnapshot = await getDocs(existingQuery);

        const matchType = matchKey.includes('@') ? 'email' : 'name';

        if (!existingSnapshot.empty) {
          // Update bestehenden Kandidaten
          const existingDoc = existingSnapshot.docs[0];

          await updateDoc(doc(db, this.candidatesCollection, existingDoc.id), {
            variants,
            score: scoreCalc.total,
            updatedAt: serverTimestamp(),
            lastScannedAt: serverTimestamp(),
            scanJobId: jobId
          });

          candidatesUpdated++;
        } else {
          // Erstelle neuen Kandidaten
          await addDoc(collection(db, this.candidatesCollection), {
            matchKey,
            matchType,
            score: scoreCalc.total,
            variants,
            status: 'pending',
            scanJobId: jobId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastScannedAt: serverTimestamp()
          });

          candidatesCreated++;
        }
      }

      // 4. Job als completed markieren
      const duration = Date.now() - (jobData.startedAt as any);

      await updateDoc(doc(db, this.jobsCollection, jobId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        duration,
        stats: {
          organizationsScanned: organizations.length,
          contactsScanned: totalContactsScanned,
          candidatesCreated,
          candidatesUpdated,
          errors: jobData.stats.errors,
          skippedReferences: totalSkippedReferences,
          skippedNoEmail: totalSkippedNoEmail
        }
      });

      console.log('✅ Scan completed successfully', {
        candidatesCreated,
        candidatesUpdated,
        totalContacts: totalContactsScanned
      });

      // Job-Daten zurückgeben
      const finalJobDoc = await getDoc(doc(db, this.jobsCollection, jobId));
      return { id: finalJobDoc.id, ...finalJobDoc.data() } as MatchingScanJob;

    } catch (error) {
      console.error('❌ Scan failed:', error);

      // Job als failed markieren
      await updateDoc(doc(db, this.jobsCollection, jobId), {
        status: 'failed',
        completedAt: serverTimestamp(),
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : { error: String(error) }
      });

      throw error;
    }
  }

  /**
   * Lädt alle Kandidaten mit Filtern
   */
  async getCandidates(
    filters?: MatchingCandidateFilters,
    sorting?: MatchingCandidateSorting,
    pagination?: MatchingCandidatePagination
  ): Promise<MatchingCandidate[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Status Filter
      if (filters?.status && filters.status.length > 0) {
        if (filters.status.length === 1) {
          constraints.push(where('status', '==', filters.status[0]));
        }
        // Bei mehreren Status: Client-side filtering
      }

      // Match-Type Filter
      if (filters?.matchType) {
        constraints.push(where('matchType', '==', filters.matchType));
      }

      // Score Filter (nur minScore, da Firestore keine range queries unterstützt)
      if (filters?.minScore) {
        constraints.push(where('score', '>=', filters.minScore));
      }

      // Sortierung
      if (sorting) {
        constraints.push(orderBy(sorting.field, sorting.direction));
      } else {
        // Default: Nach Score absteigend
        constraints.push(orderBy('score', 'desc'));
      }

      // Pagination
      if (pagination) {
        constraints.push(firestoreLimit(pagination.limit));
      }

      const q = query(collection(db, this.candidatesCollection), ...constraints);
      const snapshot = await getDocs(q);

      let candidates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchingCandidate[];

      // Client-side Filtering für komplexe Queries
      if (filters?.maxScore) {
        candidates = candidates.filter(c => c.score <= filters.maxScore!);
      }

      if (filters?.minVariants) {
        candidates = candidates.filter(c => c.variants.length >= filters.minVariants!);
      }

      if (filters?.status && filters.status.length > 1) {
        candidates = candidates.filter(c => filters.status!.includes(c.status));
      }

      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        candidates = candidates.filter(c =>
          c.matchKey.toLowerCase().includes(query) ||
          c.variants.some(v =>
            v.contactData.displayName.toLowerCase().includes(query) ||
            v.organizationName.toLowerCase().includes(query)
          )
        );
      }

      // Pagination Offset (client-side)
      if (pagination?.offset) {
        candidates = candidates.slice(pagination.offset);
      }

      return candidates;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  }

  /**
   * Lädt einen einzelnen Kandidaten
   */
  async getCandidateById(candidateId: string): Promise<MatchingCandidate | null> {
    try {
      const docRef = doc(db, this.candidatesCollection, candidateId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as MatchingCandidate;
    } catch (error) {
      console.error('Error fetching candidate:', error);
      throw error;
    }
  }

  /**
   * Importiert einen Kandidaten als globalen Kontakt
   */
  async importCandidate(request: ImportCandidateRequest & { organizationId?: string }): Promise<ImportCandidateResponse> {
    try {
      // Lade Kandidat
      const candidate = await this.getCandidateById(request.candidateId);
      if (!candidate) {
        throw new Error('Kandidat nicht gefunden');
      }

      // Hole ausgewählte Variante
      const selectedVariant = candidate.variants[request.selectedVariantIndex];
      if (!selectedVariant) {
        throw new Error('Variante nicht gefunden');
      }

      // SuperAdmin Org ID aus Request verwenden (vom Frontend übergeben)
      const superAdminOrgId = request.organizationId;

      if (!superAdminOrgId) {
        throw new Error('organizationId fehlt - kann Kontakt nicht erstellen');
      }

      console.log('\n🔄 ===== IMPORT STARTEN =====');
      console.log('📋 Kandidat:', {
        id: request.candidateId,
        matchKey: candidate.matchKey,
        matchType: candidate.matchType,
        score: candidate.score,
        variantenAnzahl: candidate.variants.length,
        ausgewählteVariante: request.selectedVariantIndex
      });
      console.log('👤 Ausgewählte Variante:', {
        organization: selectedVariant.organizationName,
        name: selectedVariant.contactData.displayName,
        email: selectedVariant.contactData.emails?.[0]?.email,
        position: selectedVariant.contactData.position,
        companyName: selectedVariant.contactData.companyName
      });
      console.log('🏢 SuperAdmin Org:', superAdminOrgId);

      // Erstelle Kontakt-Daten für Import (nur definierte Felder)
      const contactData: any = {
        name: selectedVariant.contactData.name,
        displayName: selectedVariant.contactData.displayName,
        emails: selectedVariant.contactData.emails,
        organizationId: superAdminOrgId, // ✅ Gehört zu SuperAdmin-Org
        isGlobal: true, // ✅ Aber global verfügbar für alle
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: request.userId,
        updatedBy: request.userId,
        deletedAt: null
      };

      // Nur definierte optionale Felder hinzufügen
      if (selectedVariant.contactData.phones && selectedVariant.contactData.phones.length > 0) {
        contactData.phones = selectedVariant.contactData.phones;
      }
      if (selectedVariant.contactData.position) {
        contactData.position = selectedVariant.contactData.position;
      }
      if (selectedVariant.contactData.department) {
        contactData.department = selectedVariant.contactData.department;
      }
      if (selectedVariant.contactData.companyName) {
        contactData.companyName = selectedVariant.contactData.companyName;
      }
      if (selectedVariant.contactData.companyId) {
        contactData.companyId = selectedVariant.contactData.companyId;
      }
      if (selectedVariant.contactData.socialProfiles && selectedVariant.contactData.socialProfiles.length > 0) {
        contactData.socialProfiles = selectedVariant.contactData.socialProfiles;
      }
      if (selectedVariant.contactData.photoUrl) {
        contactData.photoUrl = selectedVariant.contactData.photoUrl;
      }
      if (selectedVariant.contactData.website) {
        contactData.website = selectedVariant.contactData.website;
      }
      if (selectedVariant.contactData.hasMediaProfile) {
        contactData.mediaProfile = {
          isJournalist: true,
          beats: selectedVariant.contactData.beats || [],
          mediaTypes: selectedVariant.contactData.mediaTypes || [],
          publicationIds: []
        };
      }

      // Overrides anwenden (nur definierte)
      if (request.overrides) {
        Object.keys(request.overrides).forEach(key => {
          const value = (request.overrides as any)[key];
          if (value !== undefined) {
            contactData[key] = value;
          }
        });
      }

      console.log('📝 Erstelle Contact-Daten mit folgenden Feldern:', {
        name: contactData.name,
        displayName: contactData.displayName,
        emails: contactData.emails?.length || 0,
        phones: contactData.phones?.length || 0,
        position: contactData.position || 'keine',
        companyName: contactData.companyName || 'keine',
        companyId: contactData.companyId || 'keine',
        mediaProfile: contactData.mediaProfile ? 'vorhanden' : 'keine',
        isGlobal: contactData.isGlobal,
        organizationId: contactData.organizationId
      });

      // Erstelle als globalen Kontakt in contacts_enhanced
      const globalContactRef = await addDoc(collection(db, 'contacts_enhanced'), contactData);

      const globalContactId = globalContactRef.id;
      console.log('\n✅ ===== IMPORT ERFOLGREICH =====');
      console.log('🎯 Neuer Premium-Contact erstellt:');
      console.log('   ID:', globalContactId);
      console.log('   Name:', contactData.displayName);
      console.log('   E-Mail:', contactData.emails?.[0]?.email || 'keine');
      console.log('   Organization:', superAdminOrgId, '(SuperAdmin)');
      console.log('   isGlobal:', true);
      console.log('   Sichtbar in: Premium-Bibliothek (Redakteure-Seite)');
      console.log('   Collection: contacts_enhanced');
      console.log('================================\n');

      // Markiere Kandidat als imported
      await updateDoc(doc(db, this.candidatesCollection, request.candidateId), {
        status: 'imported',
        importedGlobalContactId: globalContactId,
        importedAt: serverTimestamp(),
        reviewedBy: request.userId,
        reviewedAt: serverTimestamp()
      });

      return {
        success: true,
        globalContactId
      };
    } catch (error) {
      console.error('Error importing candidate:', error);
      return {
        success: false,
        globalContactId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Überspringt einen Kandidaten
   */
  async skipCandidate(request: SkipCandidateRequest): Promise<void> {
    try {
      await updateDoc(doc(db, this.candidatesCollection, request.candidateId), {
        status: 'skipped',
        reviewedBy: request.userId,
        reviewedAt: serverTimestamp(),
        reviewNotes: request.reason
      });

      console.log('✓ Candidate skipped:', request.candidateId);
    } catch (error) {
      console.error('Error skipping candidate:', error);
      throw error;
    }
  }

  /**
   * Lehnt einen Kandidaten ab
   */
  async rejectCandidate(request: RejectCandidateRequest): Promise<void> {
    try {
      await updateDoc(doc(db, this.candidatesCollection, request.candidateId), {
        status: 'rejected',
        reviewedBy: request.userId,
        reviewedAt: serverTimestamp(),
        reviewNotes: request.reason
      });

      console.log('✓ Candidate rejected:', request.candidateId);
    } catch (error) {
      console.error('Error rejecting candidate:', error);
      throw error;
    }
  }

  /**
   * Löscht einen Kandidaten permanent
   */
  async deleteCandidate(candidateId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.candidatesCollection, candidateId));
      console.log('✓ Candidate deleted:', candidateId);
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  }

  /**
   * Lädt Analytics-Daten
   */
  async getAnalytics(): Promise<MatchingAnalytics> {
    try {
      // Lade alle Kandidaten
      const allCandidates = await this.getCandidates();

      // Zähle nach Status
      const byStatus = {
        pending: 0,
        imported: 0,
        skipped: 0,
        rejected: 0
      };

      let totalScore = 0;
      const orgCounts = new Map<string, { name: string; count: number; totalScore: number }>();

      for (const candidate of allCandidates) {
        byStatus[candidate.status]++;
        totalScore += candidate.score;

        // Zähle Orgs
        for (const variant of candidate.variants) {
          const existing = orgCounts.get(variant.organizationId);
          if (existing) {
            existing.count++;
            existing.totalScore += candidate.score;
          } else {
            orgCounts.set(variant.organizationId, {
              name: variant.organizationName,
              count: 1,
              totalScore: candidate.score
            });
          }
        }
      }

      // Top Organisationen
      const topOrganizations = Array.from(orgCounts.entries())
        .map(([orgId, data]) => ({
          organizationId: orgId,
          organizationName: data.name,
          candidateCount: data.count,
          averageScore: Math.round(data.totalScore / data.count)
        }))
        .sort((a, b) => b.candidateCount - a.candidateCount)
        .slice(0, 10);

      // Score-Verteilung
      const scoreDistribution = MATCHING_DEFAULTS.SCORE_RANGES.map(range => ({
        range: range.label,
        count: allCandidates.filter(c => c.score >= range.min && c.score < range.max).length
      }));

      // Letzte Scan-Info
      const latestJobQuery = query(
        collection(db, this.jobsCollection),
        orderBy('createdAt', 'desc'),
        firestoreLimit(1)
      );
      const latestJobSnapshot = await getDocs(latestJobQuery);
      const latestJob = latestJobSnapshot.docs[0]?.data() as MatchingScanJob | undefined;

      return {
        total: allCandidates.length,
        byStatus,
        topOrganizations,
        averageScore: allCandidates.length > 0 ? Math.round(totalScore / allCandidates.length) : 0,
        scoreDistribution,
        lastScan: latestJob ? {
          jobId: latestJobSnapshot.docs[0].id,
          completedAt: latestJob.completedAt!,
          candidatesCreated: latestJob.stats.candidatesCreated
        } : undefined,
        importRate: allCandidates.length > 0
          ? byStatus.imported / allCandidates.length
          : 0
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Empfiehlt die beste Variante für einen Kandidaten
   */
  getRecommendation(candidate: MatchingCandidate): CandidateRecommendation {
    return recommendVariant(candidate.variants);
  }

  /**
   * Lädt Scan-Job Details
   */
  async getScanJob(jobId: string): Promise<MatchingScanJob | null> {
    try {
      const docRef = doc(db, this.jobsCollection, jobId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as MatchingScanJob;
    } catch (error) {
      console.error('Error fetching scan job:', error);
      throw error;
    }
  }

  /**
   * Lädt letzte Scan-Jobs
   */
  async getRecentScanJobs(limitCount: number = 10): Promise<MatchingScanJob[]> {
    try {
      const q = query(
        collection(db, this.jobsCollection),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchingScanJob[];
    } catch (error) {
      console.error('Error fetching scan jobs:', error);
      throw error;
    }
  }

  /**
   * Lädt den letzten Scan Job
   */
  async getLastScanJob(): Promise<MatchingScanJob | null> {
    try {
      const jobs = await this.getRecentScanJobs(1);
      return jobs.length > 0 ? jobs[0] : null;
    } catch (error) {
      console.error('Error fetching last scan job:', error);
      return null;
    }
  }

  /**
   * Importiert einen Kandidaten mit automatischem Intelligent Matching
   */
  async importCandidateWithAutoMatching(params: {
    candidateId: string;
    selectedVariantIndex: number;
    userId: string;
    userEmail: string;
    organizationId: string;
    useAiMerge?: boolean;
  }) {
    // Delegiere an die externe Funktion
    return await importCandidateWithAutoMatching(params);
  }

  /**
   * Automatischer Import von Kandidaten basierend auf Score-Threshold
   *
   * @param minScore - Minimaler Score (0-100) für Auto-Import
   * @param useAiMerge - Ob KI-Merge verwendet werden soll
   * @param userId - SuperAdmin User ID für Import-Attribution
   * @returns Import-Statistiken
   */
  async autoImportCandidates(params: {
    minScore: number;
    useAiMerge: boolean;
    userId: string;
    userEmail: string;
    organizationId: string;
  }): Promise<{
    success: boolean;
    stats: {
      candidatesProcessed: number;
      candidatesImported: number;
      candidatesFailed: number;
      errors: string[];
    };
  }> {
    console.log('🤖 Starting auto-import...', {
      minScore: params.minScore,
      useAiMerge: params.useAiMerge,
      timestamp: new Date().toISOString()
    });

    const stats = {
      candidatesProcessed: 0,
      candidatesImported: 0,
      candidatesFailed: 0,
      errors: [] as string[]
    };

    try {
      // Hole alle pending Kandidaten mit Score >= minScore
      const candidates = await this.getCandidates(
        {
          status: ['pending'],
          minScore: params.minScore
        },
        { field: 'score', direction: 'desc' },
        { limit: 100, offset: 0 }
      );

      console.log(`📊 Found ${candidates.length} candidates with score >= ${params.minScore}`);

      // Importiere jeden Kandidaten
      for (const candidate of candidates) {
        stats.candidatesProcessed++;

        try {
          console.log(`🔄 Auto-importing candidate ${candidate.id} (Score: ${candidate.score})...`);

          // Wähle Variante:
          // - Mit AI-Merge: Nutze AI-gemergete Daten (Index wird ignoriert, AI merged alle)
          // - Ohne AI-Merge: Nutze erste Variante (höchste Datenqualität)
          const selectedVariantIndex = 0;

          // Importiere mit Auto-Matching
          const result = await importCandidateWithAutoMatching({
            candidateId: candidate.id!,
            selectedVariantIndex,
            userId: params.userId,
            userEmail: params.userEmail,
            organizationId: params.organizationId,
            useAiMerge: params.useAiMerge
          });

          if (result.success) {
            stats.candidatesImported++;
            console.log(`✅ Auto-imported candidate ${candidate.id} → Contact ${result.contactId}`);
          } else {
            stats.candidatesFailed++;
            stats.errors.push(`${candidate.id}: ${result.error || 'Unknown error'}`);
            console.error(`❌ Failed to auto-import ${candidate.id}:`, result.error);
          }
        } catch (error) {
          stats.candidatesFailed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          stats.errors.push(`${candidate.id}: ${errorMsg}`);
          console.error(`❌ Auto-import error for ${candidate.id}:`, error);
        }
      }

      console.log('✅ Auto-import completed', stats);

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('❌ Auto-import failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const matchingService = new MatchingCandidatesService();

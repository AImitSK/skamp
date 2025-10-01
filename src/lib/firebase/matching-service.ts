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
function createContactSnapshot(contact: ContactEnhanced): MatchingCandidateContactData {
  const snapshot: any = {
    name: {
      firstName: contact.name?.firstName || '',
      lastName: contact.name?.lastName || ''
    },
    displayName: contact.displayName || '',
    emails: contact.emails || [],
    hasMediaProfile: !!contact.mediaProfile,
    publications: [] // TODO: Publikations-Namen laden
  };

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
        .map(doc => ({ id: doc.id, ...doc.data() }))
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

          console.log(`  ✓ ${org.name}: ${journalists.length} journalists`);

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
              organizationName: org.name
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

        // Erstelle Varianten
        const variants: MatchingCandidateVariant[] = contacts.map(c => ({
          organizationId: c.organizationId,
          organizationName: c.organizationName,
          contactId: c.contact.id!,
          contactData: createContactSnapshot(c.contact)
        }));

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

      console.log('✅ Verwende SuperAdmin Org:', superAdminOrgId);

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

      // Erstelle als globalen Kontakt in contacts_enhanced
      const globalContactRef = await addDoc(collection(db, 'contacts_enhanced'), contactData);

      const globalContactId = globalContactRef.id;
      console.log('✅ Candidate imported as PREMIUM contact:', globalContactId);
      console.log('   → organizationId: NONE (reiner Premium-Kontakt)');
      console.log('   → isGlobal: true');
      console.log('   → Sichtbar in: Premium-Bibliothek (Redakteure)');

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
}

// Export singleton instance
export const matchingService = new MatchingCandidatesService();

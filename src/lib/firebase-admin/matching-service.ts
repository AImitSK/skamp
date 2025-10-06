/**
 * Matching Service (Admin SDK)
 *
 * Server-side Matching Service mit Firebase Admin SDK
 * Nur für API Routes / Cron Jobs
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MatchingScanJob,
  MatchingScanOptions,
  MATCHING_DEFAULTS
} from '@/types/matching';

/**
 * Scan für Kandidaten (Admin SDK)
 * Portiert von Client SDK Version - nur für Server-Side Cron Jobs
 */
export async function scanForCandidates(options: MatchingScanOptions = {}): Promise<MatchingScanJob> {
  console.log('🔍 Starting matching scan (Admin SDK)...', options);

  // Schwellwerte (Development-Modus berücksichtigen)
  const minOrgs = options.developmentMode
    ? MATCHING_DEFAULTS.DEV_MIN_ORGANIZATIONS
    : (options.minOrganizations || MATCHING_DEFAULTS.MIN_ORGANIZATIONS);

  const minScore = options.developmentMode
    ? MATCHING_DEFAULTS.DEV_MIN_SCORE
    : (options.minScore || MATCHING_DEFAULTS.MIN_SCORE);

  // Erstelle Scan-Job
  const jobData: any = {
    status: 'running',
    stats: {
      organizationsScanned: 0,
      contactsScanned: 0,
      candidatesCreated: 0,
      candidatesUpdated: 0,
      errors: 0,
      skippedReferences: 0,
      skippedNoEmail: 0
    },
    startedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    triggeredBy: options.organizationIds ? 'manual' : 'auto',
    options
  };

  const jobRef = await adminDb.collection('matching_scan_jobs').add(jobData);
  const jobId = jobRef.id;
  const startTime = Date.now();

  try {
    // 1. Lade alle Organisationen (Admin SDK)
    const orgsSnapshot = await adminDb.collection('organizations').get();
    const organizations = orgsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((org: any) => {
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
      contact: any;
      organizationId: string;
      organizationName: string;
    }>>();

    let totalContactsScanned = 0;
    let totalSkippedReferences = 0;
    let totalSkippedNoEmail = 0;

    for (const org of organizations) {
      try {
        const contactsSnapshot = await adminDb
          .collection('contacts_enhanced')
          .where('organizationId', '==', org.id)
          .get();

        const contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter: nur Journalisten (haben mediaProfile)
        const journalists = contacts.filter((c: any) => c.mediaProfile);

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

      // Erstelle Varianten (async wegen Publication-Namen laden)
      const variants: any[] = [];
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
      const existingSnapshot = await adminDb
        .collection('matching_candidates')
        .where('matchKey', '==', matchKey)
        .limit(1)
        .get();

      const matchType = matchKey.includes('@') ? 'email' : 'name';

      if (!existingSnapshot.empty) {
        // Update bestehenden Kandidaten
        const existingDoc = existingSnapshot.docs[0];

        await adminDb
          .collection('matching_candidates')
          .doc(existingDoc.id)
          .update({
            variants,
            score: scoreCalc.total,
            updatedAt: FieldValue.serverTimestamp(),
            lastScannedAt: FieldValue.serverTimestamp(),
            scanJobId: jobId
          });

        candidatesUpdated++;
      } else {
        // Erstelle neuen Kandidaten
        await adminDb.collection('matching_candidates').add({
          matchKey,
          matchType,
          score: scoreCalc.total,
          variants,
          status: 'pending',
          scanJobId: jobId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastScannedAt: FieldValue.serverTimestamp()
        });

        candidatesCreated++;
      }
    }

    // 4. Job als completed markieren
    const duration = Date.now() - startTime;

    await jobRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
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
    const finalJobDoc = await jobRef.get();
    return { id: finalJobDoc.id, ...finalJobDoc.data() } as MatchingScanJob;

  } catch (error: any) {
    console.error('❌ Scan failed:', error);

    // Job als failed markieren
    await jobRef.update({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      error: error.message || 'Unknown error',
      errorDetails: error.stack ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : { error: String(error) }
    });

    throw error;
  }
}

/**
 * Helper: Generiert Match-Key aus Kontakt
 */
function generateMatchKey(contact: any): { key: string; type: string } {
  // Strategie 1: E-Mail
  const primaryEmail = contact.emails?.find((e: any) => e.isPrimary)?.email ||
                       contact.emails?.[0]?.email;

  if (primaryEmail) {
    return {
      key: primaryEmail.toLowerCase().trim(),
      type: 'email'
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
    type: 'name'
  };
}

/**
 * Helper: Erstellt Contact Snapshot
 */
async function createContactSnapshot(contact: any): Promise<any> {
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
          const orgId = contact.organizationId;
          if (orgId) {
            const refDoc = await adminDb
              .collection('organizations')
              .doc(orgId)
              .collection('publication_references')
              .doc(pubId)
              .get();

            if (refDoc.exists) {
              const globalPubId = refDoc.data()?.globalPublicationId;
              if (globalPubId) {
                const globalPubDoc = await adminDb.collection('publications').doc(globalPubId).get();
                if (globalPubDoc.exists) {
                  pubName = globalPubDoc.data()?.title || globalPubDoc.data()?.name;
                }
              }
            }
          }
        } else {
          const pubDoc = await adminDb.collection('publications').doc(pubId).get();
          if (pubDoc.exists) {
            pubName = pubDoc.data()?.title || pubDoc.data()?.name;
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

  // Optionale Felder
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
 * Helper: Berechnet Score
 */
function scoreCandidate(variants: any[]): { total: number } {
  const uniqueOrgs = new Set(variants.map(v => v.organizationId));
  const orgCount = uniqueOrgs.size;

  let organizationScore = 0;
  if (orgCount >= 2) organizationScore = 50;
  if (orgCount >= 3) organizationScore += 10;
  if (orgCount >= 4) organizationScore += 10;

  let mediaProfileScore = 0;
  let verifiedEmailScore = 0;
  let phoneScore = 0;
  let beatsScore = 0;
  let socialMediaScore = 0;

  for (const variant of variants) {
    const data = variant.contactData;

    if (data.hasMediaProfile && mediaProfileScore < 10) {
      mediaProfileScore = 10;
    }

    const hasVerifiedDomain = data.emails?.some((e: any) => {
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

    if (data.phones && data.phones.length > 0 && phoneScore < 5) {
      phoneScore = 5;
    }

    if (data.beats && data.beats.length > 0 && beatsScore < 5) {
      beatsScore = 5;
    }

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

  return { total };
}

/**
 * Auto-Import Funktion (Admin SDK)
 * Importiert Kandidaten automatisch basierend auf Score-Threshold
 */
export async function autoImportCandidates(params: {
  minScore: number;
  useAiMerge: boolean;
  userId: string;
  userEmail: string;
  organizationId: string;
  baseUrl: string; // Für AI-Merge API Call
}): Promise<{
  success: boolean;
  stats: {
    candidatesProcessed: number;
    candidatesImported: number;
    candidatesFailed: number;
    errors: string[];
  };
}> {
  console.log('🤖 Starting auto-import (Admin SDK)...', {
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
    const candidatesSnapshot = await adminDb
      .collection('matching_candidates')
      .where('status', '==', 'pending')
      .where('score', '>=', params.minScore)
      .orderBy('score', 'desc')
      .limit(100)
      .get();

    const candidates = candidatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`📊 Found ${candidates.length} candidates with score >= ${params.minScore}`);

    // Importiere jeden Kandidaten
    for (const candidate of candidates) {
      stats.candidatesProcessed++;

      try {
        console.log(`🔄 Auto-importing candidate ${candidate.id} (Score: ${candidate.score})...`);

        // Wähle erste Variante als Basis
        const selectedVariantIndex = 0;

        // 1. KI-MERGE (falls aktiviert)
        let contactDataToUse = candidate.variants[selectedVariantIndex].contactData;

        if (params.useAiMerge && candidate.variants.length > 1) {
          console.log(`🤖 AI-Merge für ${candidate.variants.length} Varianten...`);

          try {
            const response = await fetch(`${params.baseUrl}/api/ai/merge-variants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ variants: candidate.variants })
            });

            const result = await response.json();

            if (result.success && result.mergedData) {
              console.log('✅ AI-Merge erfolgreich');
              contactDataToUse = result.mergedData;

              // Stelle sicher, dass publications existiert
              if (!contactDataToUse.publications || contactDataToUse.publications.length === 0) {
                const allPublications = new Set<string>();
                for (const variant of candidate.variants) {
                  if (variant.contactData.publications) {
                    variant.contactData.publications.forEach((pub: string) => allPublications.add(pub));
                  }
                }
                contactDataToUse.publications = Array.from(allPublications);
              }
            } else {
              console.warn('⚠️ AI-Merge fehlgeschlagen, nutze erste Variante');
            }
          } catch (error) {
            console.warn('⚠️ AI-Merge Error, nutze erste Variante:', error);
          }
        }

        // 2. COMPANY MATCHING (falls companyName vorhanden)
        let companyId: string | null = null;
        let companyName: string | null = contactDataToUse.companyName || null;

        if (companyName) {
          console.log('🏢 Suche Company:', companyName);

          // Suche bestehende Company
          const companiesSnapshot = await adminDb
            .collection('companies_enhanced')
            .where('name', '==', companyName)
            .where('organizationId', '==', params.organizationId)
            .limit(1)
            .get();

          if (!companiesSnapshot.empty) {
            companyId = companiesSnapshot.docs[0].id;
            console.log('✅ Company gefunden:', companyId);
          } else {
            // Erstelle neue Company
            const newCompanyRef = await adminDb.collection('companies_enhanced').add({
              name: companyName,
              organizationId: params.organizationId,
              isGlobal: true,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              createdBy: params.userId,
              source: 'auto_matching'
            });
            companyId = newCompanyRef.id;
            console.log('✅ Company erstellt:', companyId);
          }
        }

        // 3. PUBLICATION MATCHING (nur wenn Company + Journalist)
        const publicationIds: string[] = [];

        if (companyId && contactDataToUse.hasMediaProfile) {
          console.log('📰 Suche Publications...');

          const publicationNames = contactDataToUse.publications || [];

          for (const pubName of publicationNames) {
            // Suche bestehende Publication
            const pubSnapshot = await adminDb
              .collection('publications')
              .where('companyId', '==', companyId)
              .where('name', '==', pubName)
              .limit(1)
              .get();

            if (!pubSnapshot.empty) {
              publicationIds.push(pubSnapshot.docs[0].id);
              console.log(`  ✅ Publication gefunden: ${pubName}`);
            } else {
              // Erstelle neue Publication
              const newPubRef = await adminDb.collection('publications').add({
                name: pubName,
                title: pubName,
                companyId: companyId,
                publisherName: companyName,
                organizationId: params.organizationId,
                isGlobal: true,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                createdBy: params.userId,
                source: 'auto_matching'
              });
              publicationIds.push(newPubRef.id);
              console.log(`  ✅ Publication erstellt: ${pubName}`);
            }
          }
        }

        // 4. KONTAKT ERSTELLEN
        console.log('👤 Erstelle Contact...');

        const contactData: any = {
          ...contactDataToUse,
          companyId: companyId || null,
          organizationId: params.organizationId,
          isGlobal: true,
          createdBy: params.userId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          source: 'matching_import',
          matchingCandidateId: candidate.id
        };

        // MediaProfile setzen
        if (contactDataToUse.hasMediaProfile) {
          contactData.mediaProfile = {
            isJournalist: true,
            beats: contactDataToUse.beats || [],
            mediaTypes: contactDataToUse.mediaTypes || [],
            publicationIds: publicationIds
          };
        }

        const newContactRef = await adminDb.collection('contacts_enhanced').add(contactData);
        const contactId = newContactRef.id;

        console.log('✅ Contact erstellt:', contactId);

        // 5. KANDIDAT ALS IMPORTED MARKIEREN
        await adminDb.collection('matching_candidates').doc(candidate.id).update({
          status: 'imported',
          importedAt: FieldValue.serverTimestamp(),
          importedBy: params.userId,
          importedContactId: contactId,
          selectedVariantIndex: selectedVariantIndex
        });

        stats.candidatesImported++;
        console.log(`✅ Auto-imported candidate ${candidate.id} → Contact ${contactId}`);

      } catch (error) {
        stats.candidatesFailed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push(`${candidate.id}: ${errorMsg}`);
        console.error(`❌ Auto-import error for ${candidate.id}:`, error);
      }
    }

    console.log('✅ Auto-import completed (Admin SDK)', stats);

    return {
      success: true,
      stats
    };
  } catch (error: any) {
    console.error('❌ Auto-import failed (Admin SDK):', error);
    throw error;
  }
}

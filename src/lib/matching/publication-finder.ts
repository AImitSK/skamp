/**
 * Publication Finder Service
 *
 * Implementierung basierend auf intelligent-matching-part4-publication-finder.md
 * Zeilen 1-200
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { matchPublicationNames, extractDomain } from './string-similarity';
import { MatchingCandidateVariant } from '@/types/matching';
import { addDoc, serverTimestamp } from 'firebase/firestore';

interface PublicationSignals {
  publicationNames: string[];        // Aus mediaProfile.publications
  companyNames: string[];            // Aus contactData.companyName (falls Journalist)
  emailDomains: string[];            // Aus contactData.emails
  websites: string[];                // Falls in mediaProfile vorhanden
}

interface PublicationMatch {
  publicationId: string;
  publicationName: string;
  matchType: 'exact_name' | 'fuzzy_name' | 'domain' | 'database_analysis';
  confidence: number;
  source: string; // Welches Signal hat zum Match geführt
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

  console.log('🔍 Starting publication matching...');
  console.log('📊 Extracted signals:', signals);

  // ✅ Lade Publications (mit oder ohne Company-Filter)
  const ownPublications = await getOwnPublications(organizationId, companyId);
  console.log(`📚 Found ${ownPublications.length} own publications${companyId ? ` for company ${companyId}` : ''}`);

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
          confidence: 1.0,
          source: `Name: "${signalName}"`
        });
        seenIds.add(publication.id);
        console.log(`✅ Exact match: ${publication.name} (${score}%)`);
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
          confidence: score / 100,
          source: `Ähnlicher Name: "${signalName}" → "${publication.name}"`
        });
        seenIds.add(publication.id);
        console.log(`✅ Fuzzy match: ${publication.name} (${score}%)`);
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
            confidence: 0.95,
            source: `Domain: ${domain}`
          });
          seenIds.add(publication.id);
          console.log(`✅ Domain match: ${publication.name} (${domain})`);
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
    let confidence = 0.7; // Base
    if (data.count >= 5) confidence = 0.9;
    else if (data.count >= 3) confidence = 0.85;
    else if (data.count >= 2) confidence = 0.8;

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

export interface CreatePublicationParams {
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
export async function createPublication(params: CreatePublicationParams): Promise<string> {
  const publicationsRef = collection(db, 'superadmin_publications');

  const publicationData = {
    name: params.name,
    companyId: params.companyId || null,  // ✅ Optional: Kann null sein!
    website: params.website || null,
    organizationId: params.organizationId,
    createdBy: params.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
  console.log(`✅ New publication created: ${params.name} (ID: ${docRef.id})`);
  return docRef.id;
}


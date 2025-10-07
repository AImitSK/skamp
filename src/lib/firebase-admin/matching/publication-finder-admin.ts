/**
 * Publication Finder Service (Admin SDK)
 *
 * Implementierung basierend auf intelligent-matching-part4-publication-finder.md
 * Zeilen 1-200
 */

import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import { matchPublicationNames, extractDomain } from './string-similarity-admin';
import { MatchingCandidateVariant } from '@/types/matching';

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

  try {
    // Admin SDK: Query Builder Pattern
    let query = adminDb
      .collection('publications')
      .where('organizationId', '==', organizationId);

    // ✅ Optional: Nur Publications einer bestimmten Company
    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    const snapshot = await query.get();

    console.log(`📊 Query returned ${snapshot.docs.length} publications (before filter)${companyId ? ` for company ${companyId}` : ''}`);

    const publications = snapshot.docs
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        website: doc.data().website,
        companyId: doc.data().companyId || null,
        isReference: doc.data().isReference,
        deletedAt: doc.data().deletedAt
      }))
      .filter(p => {
        // Filter 1: Keine gelöschten
        if (p.deletedAt) {
          console.log(`⏭️  Skipping deleted: ${p.name}`);
          return false;
        }
        // Filter 2: Keine References
        if (p.isReference === true) {
          console.log(`⏭️  Skipping reference: ${p.name}`);
          return false;
        }
        // Filter 3: Exclude reference patterns in ID
        if (p.id.startsWith('ref-') || p.id.startsWith('local-ref-')) {
          console.log(`⏭️  Skipping reference ID pattern: ${p.name}`);
          return false;
        }
        return true;
      });

    return publications;

  } catch (error) {
    console.error('❌ Error loading own publications:', error);
    return [];
  }
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

  try {
    // Für jede E-Mail-Domain: Finde alle Kontakte mit dieser Domain
    for (const domain of signals.emailDomains) {
      const snapshot = await adminDb
        .collection('superadmin_contacts')
        .where('organizationId', '==', organizationId)
        .where('deletedAt', '==', null)
        .get();

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

  } catch (error) {
    console.error('❌ Error analyzing publication database:', error);
  }

  return matches;
}

export interface CreatePublicationParams {
  name: string;
  companyId?: string | null;  // ✅ OPTIONAL: Publication kann zu Company gehören (oder nicht)
  companyName?: string;  // ✅ OPTIONAL: Name des Verlags für publisherName
  website?: string;
  organizationId: string;
  createdBy: string;
  source: 'auto_matching'; // Markiert als automatisch erstellt
  autoGlobalMode?: boolean; // ✅ Für SuperAdmin-Erkennung
  rssFeedUrl?: string; // 🆕 Phase 5: RSS Feed URL für Monitoring
}

/**
 * Erstellt eine neue Publikation (mit oder ohne Company)
 *
 * ⚠️ WICHTIG: companyId ist OPTIONAL!
 * - MIT companyId: Publication gehört zu Verlag/Medienhaus
 * - OHNE companyId: Freie Publikation ohne Company-Zuordnung
 *
 * ⚠️ ADMIN SDK: Nutzt DIREKTE Firestore Calls (KEIN interceptSave!)
 */
export async function createPublication(params: CreatePublicationParams): Promise<string> {

  console.log(`📰 Erstelle neue Publication: ${params.name}${params.companyId ? ` (Company: ${params.companyId})` : ''}`);

  try {
    // ✅ Admin SDK: Direkte Firestore Calls (KEIN interceptSave!)
    const publicationData: any = {
      title: params.name, // ✅ Neues Schema: title statt name
      name: params.name, // ✅ Legacy-Kompatibilität
      companyId: params.companyId || null,
      publisherId: params.companyId || null, // ✅ Für Kompatibilität
      publisherName: params.companyName || null, // ✅ Verlagsname für Anzeige
      website: params.website || null,
      organizationId: params.organizationId,
      isReference: false, // ✅ Explizit markieren: NICHT Reference!
      isGlobal: params.autoGlobalMode || false, // ✅ Direkt setzen statt interceptSave!

      // ✅ Type & Basics
      type: 'newspaper', // ✅ Sinnvoller Default (nicht 'online'!)
      country: 'DE',
      status: 'active',
      verified: false,

      // ✅ Content-Felder
      focusAreas: [], // ✅ Statt beats
      languages: ['de'], // ✅ Default Deutsch
      geographicTargets: ['DE'],

      // ✅ KRITISCH: metrics Objekt für Modal-Kompatibilität
      metrics: {
        frequency: 'monthly', // ✅ Hier die echte Frequenz!
        targetAudience: null,
        print: {
          circulation: null,
          reach: null
        },
        online: {
          monthlyPageViews: null,
          monthlyUniqueVisitors: null
        }
      },

      // ✅ KRITISCH: monitoringConfig für RSS Monitoring
      monitoringConfig: {
        isEnabled: true, // Default für neue Publications
        websiteUrl: params.website || null,
        rssFeedUrls: params.rssFeedUrl ? [params.rssFeedUrl] : [],
        autoDetectRss: true,
        checkFrequency: 'daily' as const,
        keywords: [],
        totalArticlesFound: 0
        // createdAt und updatedAt werden von Top-Level übernommen
      },

      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: params.createdBy,
      source: params.source,
      deletedAt: null
    };

    const docRef = await adminDb.collection('publications').add(publicationData);
    const publicationId = docRef.id;

    console.log(`✅ Publication erstellt: ${publicationId}`);

    return publicationId;

  } catch (error) {
    console.error('❌ Error creating publication:', error);
    throw error;
  }
}

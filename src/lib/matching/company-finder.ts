/**
 * Company Finder Service
 *
 * Implementierung basierend auf intelligent-matching-enrichment.md
 * Zeilen 333-632
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { MatchingCandidateVariant } from '@/types/matching';
import { findBestCompanyMatches } from './string-similarity';
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
    const fuzzyMatches = findBestCompanyMatches(
      signals.companyNames[0], // Nimm ersten Company-Namen
      ownCompanies.map(c => ({ id: c.id, name: c.name, website: c.website })),
      {
        nameThreshold: 75, // 75% Threshold
        maxResults: 1
      }
    );

    const fuzzyMatch = fuzzyMatches[0];
    if (fuzzyMatch) {
      console.log(`✅ Fuzzy-Match gefunden: ${fuzzyMatch.name} (${fuzzyMatch.score}%)`);

      return {
        companyId: fuzzyMatch.id,
        companyName: fuzzyMatch.name,
        confidence: fuzzyMatch.score >= 90 ? 'high' : 'medium',
        method: 'fuzzy_match',
        wasCreated: false,
        evidence: {
          fuzzyScore: fuzzyMatch.score / 100 // Convert to 0-1 range
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
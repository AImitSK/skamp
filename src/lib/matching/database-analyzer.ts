/**
 * Database Analyzer für intelligente Company-Matching
 *
 * Implementierung basierend auf intelligent-matching-enrichment.md
 * Zeilen 636-896
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface CompanyMatchResult {
  companyId: string;
  companyName: string;
  matchType: string;
  confidence: number;
}

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

  for (const [companyId, score] of Array.from(scores.entries())) {
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

/**
 * Wrapper-Funktion für Tests - analysiert Company-Datenbank basierend auf Signalen
 */
export async function analyzeCompanyDatabase(
  signals: {
    companyNames: string[];
    emailDomains: string[];
    websites: string[];
  },
  organizationId: string
): Promise<CompanyMatchResult | null> {
  try {
    // Lade alle Companies der Organisation (ohne Reference-Companies)
    const companiesQuery = query(
      collection(db, 'companies_enhanced'),
      where('organizationId', '==', organizationId),
      where('deletedAt', '==', null)
    );

    const companiesSnapshot = await getDocs(companiesQuery);
    const companies = companiesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() as any }))
      .filter((c: any) => !c.isReference);

    // Lade alle Kontakte der Organisation
    const contactsQuery = query(
      collection(db, 'contacts_enhanced'),
      where('organizationId', '==', organizationId),
      where('deletedAt', '==', null)
    );

    const contactsSnapshot = await getDocs(contactsQuery);
    const contacts = contactsSnapshot.docs.map(doc => doc.data());

    // Analysiere Email-Domains
    const domainMatches = new Map<string, number>();

    for (const domain of signals.emailDomains) {
      for (const contact of contacts) {
        if (!contact.emails || !Array.isArray(contact.emails)) continue;
        if (!contact.companyId) continue;

        const hasDomain = contact.emails.some((e: any) =>
          e.email && e.email.toLowerCase().includes(`@${domain.toLowerCase()}`)
        );

        if (hasDomain) {
          domainMatches.set(
            contact.companyId,
            (domainMatches.get(contact.companyId) || 0) + 1
          );
        }
      }
    }

    // Analysiere Website-Matches
    for (const website of signals.websites) {
      const matchingCompany = companies.find((c: any) =>
        c.website && c.website.toLowerCase().includes(website.toLowerCase())
      );

      if (matchingCompany) {
        return {
          companyId: (matchingCompany as any).id,
          companyName: (matchingCompany as any).name,
          matchType: 'website',
          confidence: 85
        };
      }
    }

    // Finde Company mit meisten Domain-Matches
    if (domainMatches.size > 0) {
      let maxMatches = 0;
      let bestCompanyId = '';

      for (const [companyId, count] of Array.from(domainMatches.entries())) {
        if (count > maxMatches) {
          maxMatches = count;
          bestCompanyId = companyId;
        }
      }

      const matchedCompany = companies.find((c: any) => c.id === bestCompanyId);

      if (matchedCompany) {
        // Confidence steigt mit Anzahl der Matches
        const confidence = Math.min(70 + (maxMatches * 10), 95);

        return {
          companyId: (matchedCompany as any).id,
          companyName: (matchedCompany as any).name,
          matchType: 'database_analysis',
          confidence
        };
      }
    }

    return null;

  } catch (error) {
    console.error('Error analyzing company database:', error);
    return null;
  }
}
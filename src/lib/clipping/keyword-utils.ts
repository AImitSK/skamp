/**
 * Keyword Utilities für Clipping/Monitoring
 *
 * Reine Logik-Funktionen ohne Firebase-Abhängigkeiten
 * Kann sowohl im Browser als auch Server-seitig verwendet werden
 */

export interface CompanyData {
  name: string;
  officialName?: string;
  tradingName?: string;
}

export interface CompanyKeywords {
  primary: string;
  all: string[];
}

export interface AutoConfirmResult {
  shouldConfirm: boolean;
  reason: 'company_in_title' | 'company_plus_seo' | 'company_only' | 'no_company_match';
  companyMatch: {
    found: boolean;
    inTitle: boolean;
    matchedKeyword: string | null;
  };
  seoScore: number;
}

// Bekannte deutsche Rechtsformen
const LEGAL_FORMS = [
  'GmbH',
  'AG',
  'Ltd.',
  'Inc.',
  'LLC',
  'UG',
  'KG',
  'e.V.',
  'SE',
  'OHG',
  'GbR',
  '& Co.',
  '& Co. KG'
];

/**
 * Extrahiert Keywords aus Company-Daten
 */
export function extractCompanyKeywords(company: CompanyData): CompanyKeywords {
  const keywords: Set<string> = new Set();

  // Hilfsfunktion: Rechtsform entfernen
  const removeRechtsform = (name: string): string => {
    let result = name;
    for (const form of LEGAL_FORMS) {
      result = result.replace(new RegExp(`\\s*${form.replace('.', '\\.')}\\s*$`, 'i'), '');
    }
    return result.trim();
  };

  // Hilfsfunktion: Varianten hinzufügen
  const addVariants = (name: string) => {
    if (!name || name.length < 2) return;

    // Original
    keywords.add(name);

    // Ohne Rechtsform
    const withoutForm = removeRechtsform(name);
    if (withoutForm.length >= 2 && withoutForm !== name) {
      keywords.add(withoutForm);
    }
  };

  // 1. Hauptname
  if (company.name) {
    addVariants(company.name);
  }

  // 2. Offizieller Name
  if (company.officialName && company.officialName !== company.name) {
    addVariants(company.officialName);
  }

  // 3. Trading Name
  if (company.tradingName && company.tradingName.length >= 2) {
    keywords.add(company.tradingName);
  }

  // Primary ist der Hauptname
  const primary = company.name || '';

  return {
    primary,
    all: Array.from(keywords)
  };
}

/**
 * Prüft ob ein Artikel auto-confirmed werden sollte
 */
export function checkAutoConfirm(
  article: { title: string; content?: string },
  companyKeywords: string[],
  seoKeywords: string[]
): AutoConfirmResult {
  const title = article.title || '';
  const content = article.content || '';
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  // Firmenname suchen
  let companyMatch = {
    found: false,
    inTitle: false,
    matchedKeyword: null as string | null
  };

  for (const keyword of companyKeywords) {
    const keywordLower = keyword.toLowerCase();

    if (titleLower.includes(keywordLower)) {
      companyMatch = {
        found: true,
        inTitle: true,
        matchedKeyword: keyword
      };
      break;
    }

    if (contentLower.includes(keywordLower)) {
      companyMatch = {
        found: true,
        inTitle: false,
        matchedKeyword: keyword
      };
    }
  }

  // Kein Match = Skip
  if (!companyMatch.found) {
    return {
      shouldConfirm: false,
      reason: 'no_company_match',
      companyMatch,
      seoScore: 0
    };
  }

  // Firmenname im Titel = Auto-Confirm
  if (companyMatch.inTitle) {
    return {
      shouldConfirm: true,
      reason: 'company_in_title',
      companyMatch,
      seoScore: 100
    };
  }

  // SEO-Score berechnen
  let seoScore = 0;
  if (seoKeywords.length > 0) {
    let matchedCount = 0;
    for (const seoKw of seoKeywords) {
      const seoKwLower = seoKw.toLowerCase();
      // Titel-Match zählt doppelt
      if (titleLower.includes(seoKwLower)) {
        matchedCount += 2;
      } else if (contentLower.includes(seoKwLower)) {
        matchedCount += 1;
      }
    }
    // Max 2 Punkte pro Keyword (im Titel)
    const maxPoints = seoKeywords.length * 2;
    seoScore = Math.round((matchedCount / maxPoints) * 100);
  }

  // Firmenname im Content + hoher SEO-Score = Auto-Confirm
  if (seoScore >= 70) {
    return {
      shouldConfirm: true,
      reason: 'company_plus_seo',
      companyMatch,
      seoScore
    };
  }

  // Sonst: Manual Review (Auto-Fund)
  return {
    shouldConfirm: false,
    reason: 'company_only',
    companyMatch,
    seoScore
  };
}

/**
 * Bestimmt Confidence-Level basierend auf AutoConfirmResult
 */
export function determineConfidence(
  result: AutoConfirmResult | undefined
): 'low' | 'medium' | 'high' | 'very_high' {
  if (!result) return 'low';

  switch (result.reason) {
    case 'company_in_title':
      return 'very_high';
    case 'company_plus_seo':
      return 'high';
    case 'company_only':
      return 'medium';
    case 'no_company_match':
    default:
      return 'low';
  }
}

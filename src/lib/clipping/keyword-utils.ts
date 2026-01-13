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

// Bekannte Rechtsformen (deutsch und international)
const LEGAL_FORMS = [
  'GmbH', 'AG', 'KG', 'OHG', 'GbR', 'UG', 'e.V.', 'eG',
  'Ltd.', 'Ltd', 'Inc.', 'Inc', 'LLC', 'Corp.', 'Corp',
  'SE', 'S.A.', 'S.L.', 'B.V.', 'N.V.', 'Pty', 'PLC',
  '& Co.', '& Co', 'KGaA', 'mbH', 'Co. KG', 'Co.KG', '& Co. KG'
];

/**
 * Prüft ob ein Keyword nur eine Rechtsform ist (zu generisch für Google News Suche)
 * Diese würden zu vielen False Positives führen.
 */
function isOnlyLegalForm(keyword: string): boolean {
  const cleaned = keyword.trim();
  return LEGAL_FORMS.some(form =>
    cleaned.toLowerCase() === form.toLowerCase()
  );
}

/**
 * Extrahiert Keywords aus Company-Daten
 *
 * WICHTIG: Filtert alleinstehende Rechtsformen heraus (z.B. nur "GmbH"),
 * da diese zu viele False Positives in Google News erzeugen.
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

  // Hilfsfunktion: Varianten hinzufügen (mit Absicherung gegen reine Rechtsformen)
  const addVariants = (name: string) => {
    if (!name || name.length < 2) return;

    // Nur hinzufügen wenn es NICHT nur eine Rechtsform ist
    if (!isOnlyLegalForm(name)) {
      keywords.add(name);
    }

    // Ohne Rechtsform
    const withoutForm = removeRechtsform(name);
    if (withoutForm.length >= 2 && withoutForm !== name && !isOnlyLegalForm(withoutForm)) {
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
  if (company.tradingName && company.tradingName.length >= 2 && !isOnlyLegalForm(company.tradingName)) {
    keywords.add(company.tradingName);
  }

  // Primary ist der Hauptname
  const primary = company.name || '';

  // Finale Filterung: min. 2 Zeichen und keine reinen Rechtsformen
  return {
    primary,
    all: Array.from(keywords).filter(k => k.length >= 2 && !isOnlyLegalForm(k))
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

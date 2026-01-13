/**
 * Keyword Extraction Service (Admin SDK)
 *
 * Extrahiert Keywords aus Company-Daten für das Monitoring-System.
 * Implementiert die neue Auto-Confirm Logik basierend auf Firmennamen.
 */

import { adminDb } from '@/lib/firebase/admin-init';

// Rechtsformen für Bereinigung
const LEGAL_FORMS = [
  'GmbH', 'AG', 'KG', 'OHG', 'GbR', 'UG', 'e.V.', 'eG',
  'Ltd.', 'Ltd', 'Inc.', 'Inc', 'LLC', 'Corp.', 'Corp',
  'SE', 'S.A.', 'S.L.', 'B.V.', 'N.V.', 'Pty', 'PLC',
  '& Co.', '& Co', 'KGaA', 'mbH', 'Co. KG', 'Co.KG'
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
 * Company Keywords für Monitoring
 */
export interface CompanyKeywords {
  all: string[];           // Alle Varianten für Suche
  primary: string;         // Haupt-Firmenname
  variants: string[];      // Weitere Varianten
}

/**
 * Ergebnis der Auto-Confirm Prüfung
 */
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

/**
 * Extrahiert Keyword-Varianten aus Company-Daten
 *
 * WICHTIG: Filtert alleinstehende Rechtsformen heraus (z.B. nur "GmbH"),
 * da diese zu viele False Positives in Google News erzeugen.
 */
export function extractCompanyKeywords(company: {
  name: string;
  officialName?: string;
  tradingName?: string;
  legalForm?: string;
}): CompanyKeywords {
  const keywords = new Set<string>();

  // 1. Anzeigename (Pflicht)
  if (company.name) {
    const name = company.name.trim();
    // Nur hinzufügen wenn es NICHT nur eine Rechtsform ist
    if (!isOnlyLegalForm(name)) {
      keywords.add(name);
    }

    // Variante ohne Rechtsform
    const nameWithoutLegal = removeLegalForm(name);
    if (nameWithoutLegal && nameWithoutLegal !== name && !isOnlyLegalForm(nameWithoutLegal)) {
      keywords.add(nameWithoutLegal);
    }
  }

  // 2. Offizieller Name (falls anders)
  if (company.officialName && company.officialName !== company.name) {
    const officialName = company.officialName.trim();
    // Nur hinzufügen wenn es NICHT nur eine Rechtsform ist
    if (!isOnlyLegalForm(officialName)) {
      keywords.add(officialName);
    }

    const officialWithoutLegal = removeLegalForm(officialName);
    if (officialWithoutLegal && officialWithoutLegal !== officialName && !isOnlyLegalForm(officialWithoutLegal)) {
      keywords.add(officialWithoutLegal);
    }
  }

  // 3. Handelsname (falls vorhanden)
  if (company.tradingName) {
    const tradingName = company.tradingName.trim();
    if (!isOnlyLegalForm(tradingName)) {
      keywords.add(tradingName);
    }
  }

  // Filtere zu kurze Keywords (min. 2 Zeichen) und reine Rechtsformen
  const allKeywords = Array.from(keywords).filter(k => k.length >= 2 && !isOnlyLegalForm(k));

  return {
    all: allKeywords,
    primary: company.name || '',
    variants: allKeywords.filter(k => k !== company.name)
  };
}

/**
 * Entfernt Rechtsform vom Firmennamen
 */
function removeLegalForm(name: string): string {
  let result = name.trim();

  for (const form of LEGAL_FORMS) {
    // Am Ende des Namens (mit oder ohne Komma davor)
    const regex = new RegExp(`[,\\s]*${escapeRegex(form)}\\s*$`, 'i');
    result = result.replace(regex, '').trim();
  }

  return result;
}

/**
 * Escaped spezielle RegEx-Zeichen
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Prüft ob Artikel auto-confirmed werden soll
 */
export function checkAutoConfirm(
  article: { title: string; content: string },
  companyKeywords: string[],
  seoKeywords: string[] = []
): AutoConfirmResult {
  const titleLower = article.title.toLowerCase();
  const contentLower = (article.content || '').toLowerCase();

  // 1. Firmenname-Match prüfen
  let companyMatch = {
    found: false,
    inTitle: false,
    matchedKeyword: null as string | null
  };

  for (const keyword of companyKeywords) {
    const keywordLower = keyword.toLowerCase();

    // Titel hat Priorität
    if (titleLower.includes(keywordLower)) {
      companyMatch = { found: true, inTitle: true, matchedKeyword: keyword };
      break; // Titel-Match ist am besten, abbrechen
    }

    // Content-Match nur wenn noch kein Match gefunden
    if (contentLower.includes(keywordLower) && !companyMatch.found) {
      companyMatch = { found: true, inTitle: false, matchedKeyword: keyword };
      // Weitersuchen nach potentiellem Titel-Match
    }
  }

  // 2. Kein Firmenname gefunden → Kein Match
  if (!companyMatch.found) {
    return {
      shouldConfirm: false,
      reason: 'no_company_match',
      companyMatch,
      seoScore: 0
    };
  }

  // 3. Firmenname im Titel → Auto-Confirm
  if (companyMatch.inTitle) {
    return {
      shouldConfirm: true,
      reason: 'company_in_title',
      companyMatch,
      seoScore: 100
    };
  }

  // 4. Firmenname nur im Content → SEO-Score prüfen
  const seoScore = calculateSeoScore(article, seoKeywords);

  if (seoScore >= 70) {
    return {
      shouldConfirm: true,
      reason: 'company_plus_seo',
      companyMatch,
      seoScore
    };
  }

  // 5. Firmenname im Content, aber niedriger SEO-Score → Manuell
  return {
    shouldConfirm: false,
    reason: 'company_only',
    companyMatch,
    seoScore
  };
}

/**
 * Berechnet SEO-Keyword Score
 */
function calculateSeoScore(
  article: { title: string; content: string },
  seoKeywords: string[]
): number {
  if (seoKeywords.length === 0) return 0;

  const titleLower = article.title.toLowerCase();
  const contentLower = (article.content || '').toLowerCase();

  let matchedCount = 0;
  const maxScore = seoKeywords.length * 2; // Titel = 2, Content = 1

  for (const keyword of seoKeywords) {
    const keywordLower = keyword.toLowerCase();

    if (titleLower.includes(keywordLower)) {
      matchedCount += 2; // Titel zählt doppelt
    } else if (contentLower.includes(keywordLower)) {
      matchedCount += 1;
    }
  }

  return Math.round((matchedCount / maxScore) * 100);
}

/**
 * Lädt Company-Keywords für eine Kampagne
 */
export async function getCompanyKeywordsForCampaign(
  campaignId: string
): Promise<{ companyKeywords: string[]; seoKeywords: string[] }> {

  // Kampagne laden
  const campaignDoc = await adminDb.collection('pr_campaigns').doc(campaignId).get();
  if (!campaignDoc.exists) {
    console.warn(`[KeywordExtraction] Campaign ${campaignId} not found`);
    return { companyKeywords: [], seoKeywords: [] };
  }

  const campaign = campaignDoc.data();
  const seoKeywords = campaign?.monitoringConfig?.keywords || [];

  // Customer laden (clientId zeigt auf Company)
  const customerId = campaign?.clientId;
  if (!customerId) {
    console.warn(`[KeywordExtraction] Campaign ${campaignId} has no clientId`);
    return { companyKeywords: [], seoKeywords };
  }

  // Versuche zuerst companies_enhanced, dann companies (Fallback)
  let customerDoc = await adminDb.collection('companies_enhanced').doc(customerId).get();

  if (!customerDoc.exists) {
    customerDoc = await adminDb.collection('companies').doc(customerId).get();
  }

  if (!customerDoc.exists) {
    console.warn(`[KeywordExtraction] Customer ${customerId} not found in companies_enhanced or companies`);
    return { companyKeywords: [], seoKeywords };
  }

  const customer = customerDoc.data();
  const companyKeywords = extractCompanyKeywords({
    name: customer?.name || '',
    officialName: customer?.officialName,
    tradingName: customer?.tradingName,
    legalForm: customer?.legalForm
  });

  console.log('[KeywordExtraction] Extracted keywords:', {
    campaignId,
    customerId,
    companyKeywords: companyKeywords.all,
    seoKeywords
  });

  return {
    companyKeywords: companyKeywords.all,
    seoKeywords
  };
}

/**
 * Bestimmt Confidence basierend auf AutoConfirmResult
 */
export function determineConfidence(result?: AutoConfirmResult): 'low' | 'medium' | 'high' | 'very_high' {
  if (!result) return 'low';

  // Firmenname im Titel = very_high
  if (result.reason === 'company_in_title') {
    return 'very_high';
  }

  // Firmenname + hoher SEO-Score = high
  if (result.reason === 'company_plus_seo') {
    return 'high';
  }

  // Nur Firmenname im Content = medium
  if (result.reason === 'company_only') {
    return 'medium';
  }

  // Kein Match = low
  return 'low';
}

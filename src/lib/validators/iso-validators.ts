/**
 * ISO Standard Validators for SKAMP
 * Part 1: Country Codes (ISO 3166-1 Alpha-2)
 */

// Häufigste Ländercodes für DACH-Region und EU
const COMMON_COUNTRY_CODES = [
  'DE', 'AT', 'CH', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU',
  'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG',
  'GR', 'HR', 'SI', 'EE', 'LV', 'LT', 'IE', 'MT', 'CY', 'GB',
  'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'UY',
  'CN', 'JP', 'KR', 'IN', 'AU', 'NZ', 'SG', 'MY', 'TH', 'ID',
  'RU', 'UA', 'BY', 'KZ', 'TR', 'IL', 'AE', 'SA', 'EG', 'ZA'
] as const;

// Vollständige Ländercode-Map mit deutschen Namen
const COUNTRY_NAMES_DE: Record<string, string> = {
  'DE': 'Deutschland',
  'AT': 'Österreich', 
  'CH': 'Schweiz',
  'FR': 'Frankreich',
  'IT': 'Italien',
  'ES': 'Spanien',
  'PT': 'Portugal',
  'NL': 'Niederlande',
  'BE': 'Belgien',
  'LU': 'Luxemburg',
  'DK': 'Dänemark',
  'SE': 'Schweden',
  'NO': 'Norwegen',
  'FI': 'Finnland',
  'PL': 'Polen',
  'CZ': 'Tschechien',
  'SK': 'Slowakei',
  'HU': 'Ungarn',
  'RO': 'Rumänien',
  'BG': 'Bulgarien',
  'GR': 'Griechenland',
  'HR': 'Kroatien',
  'SI': 'Slowenien',
  'EE': 'Estland',
  'LV': 'Lettland',
  'LT': 'Litauen',
  'IE': 'Irland',
  'MT': 'Malta',
  'CY': 'Zypern',
  'GB': 'Vereinigtes Königreich',
  'US': 'Vereinigte Staaten',
  'CA': 'Kanada',
  'CN': 'China',
  'JP': 'Japan',
  'AU': 'Australien',
  'NZ': 'Neuseeland',
  'RU': 'Russland',
  'TR': 'Türkei',
  'IL': 'Israel',
  'AE': 'Vereinigte Arabische Emirate',
  'SA': 'Saudi-Arabien',
  'ZA': 'Südafrika'
};

// EU-Mitgliedstaaten (Stand 2025)
const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
] as const;

/**
 * Validiert einen ISO 3166-1 Alpha-2 Ländercode
 */
export function isValidCountryCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return COMMON_COUNTRY_CODES.includes(code.toUpperCase() as any);
}

/**
 * Prüft ob ein Land EU-Mitglied ist
 */
export function isEuCountry(code: string): boolean {
  if (!code) return false;
  return EU_COUNTRY_CODES.includes(code.toUpperCase() as any);
}

/**
 * Gibt den deutschen Namen eines Landes zurück
 */
export function getCountryNameDe(code: string): string | null {
  if (!code) return null;
  return COUNTRY_NAMES_DE[code.toUpperCase()] || null;
}

/**
 * Validiert mehrere Ländercodes gleichzeitig
 */
export function validateCountryCodes(codes: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  codes.forEach(code => {
    if (isValidCountryCode(code)) {
      valid.push(code.toUpperCase());
    } else {
      invalid.push(code);
    }
  });
  
  return { valid, invalid };
}

/**
 * Gibt eine sortierte Liste aller verfügbaren Länder zurück
 */
export function getAvailableCountries(language: 'de' | 'en' = 'de'): Array<{
  code: string;
  name: string;
  isEu: boolean;
}> {
  return Object.entries(COUNTRY_NAMES_DE)
    .map(([code, name]) => ({
      code,
      name,
      isEu: isEuCountry(code)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/**
 * Konvertiert einen Ländernamen zu ISO-Code
 */
export function countryNameToCode(name: string): string | null {
  if (!name) return null;
  
  const normalizedName = name.toLowerCase().trim();
  
  // Direkte Suche in deutschen Namen
  for (const [code, countryName] of Object.entries(COUNTRY_NAMES_DE)) {
    if (countryName.toLowerCase() === normalizedName) {
      return code;
    }
  }
  
  // Fallback für häufige alternative Schreibweisen
  const alternatives: Record<string, string> = {
    'germany': 'DE',
    'austria': 'AT',
    'switzerland': 'CH',
    'france': 'FR',
    'italy': 'IT',
    'spain': 'ES',
    'netherlands': 'NL',
    'belgium': 'BE',
    'united states': 'US',
    'usa': 'US',
    'uk': 'GB',
    'united kingdom': 'GB',
    'czechia': 'CZ',
    'czech republic': 'CZ'
  };
  
  return alternatives[normalizedName] || null;
}

/**
 * Formatiert eine Liste von Ländercodes für die Anzeige
 */
export function formatCountryList(codes: string[], language: 'de' | 'en' = 'de'): string {
  const names = codes
    .map(code => getCountryNameDe(code))
    .filter(Boolean) as string[];
  
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} und ${names[1]}`;
  
  const lastCountry = names.pop();
  return `${names.join(', ')} und ${lastCountry}`;
}

// Type exports für TypeScript
export type CountryCode = typeof COMMON_COUNTRY_CODES[number];
export type EuCountryCode = typeof EU_COUNTRY_CODES[number];

/**
 * ISO Standard Validators for SKAMP
 * Part 2: Currency Codes (ISO 4217)
 */

// Hauptwährungen mit Details
const CURRENCY_DATA: Record<string, {
  name: string;
  symbol: string;
  decimals: number;
  countries: string[];
}> = {
  'EUR': {
    name: 'Euro',
    symbol: '€',
    decimals: 2,
    countries: ['DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'FI', 'IE', 'GR', 'SI', 'SK', 'EE', 'LV', 'LT', 'MT', 'CY']
  },
  'USD': {
    name: 'US-Dollar',
    symbol: '$',
    decimals: 2,
    countries: ['US', 'EC', 'SV', 'PA', 'TL', 'MH', 'FM', 'PW']
  },
  'GBP': {
    name: 'Britisches Pfund',
    symbol: '£',
    decimals: 2,
    countries: ['GB', 'IM', 'JE', 'GG']
  },
  'CHF': {
    name: 'Schweizer Franken',
    symbol: 'CHF',
    decimals: 2,
    countries: ['CH', 'LI']
  },
  'JPY': {
    name: 'Japanischer Yen',
    symbol: '¥',
    decimals: 0,
    countries: ['JP']
  },
  'SEK': {
    name: 'Schwedische Krone',
    symbol: 'kr',
    decimals: 2,
    countries: ['SE']
  },
  'NOK': {
    name: 'Norwegische Krone',
    symbol: 'kr',
    decimals: 2,
    countries: ['NO']
  },
  'DKK': {
    name: 'Dänische Krone',
    symbol: 'kr',
    decimals: 2,
    countries: ['DK', 'GL', 'FO']
  },
  'PLN': {
    name: 'Polnischer Złoty',
    symbol: 'zł',
    decimals: 2,
    countries: ['PL']
  },
  'CZK': {
    name: 'Tschechische Krone',
    symbol: 'Kč',
    decimals: 2,
    countries: ['CZ']
  },
  'HUF': {
    name: 'Ungarischer Forint',
    symbol: 'Ft',
    decimals: 0,
    countries: ['HU']
  },
  'RON': {
    name: 'Rumänischer Leu',
    symbol: 'lei',
    decimals: 2,
    countries: ['RO']
  },
  'BGN': {
    name: 'Bulgarischer Lew',
    symbol: 'лв',
    decimals: 2,
    countries: ['BG']
  },
  'HRK': {
    name: 'Kroatische Kuna',
    symbol: 'kn',
    decimals: 2,
    countries: ['HR']
  },
  'RUB': {
    name: 'Russischer Rubel',
    symbol: '₽',
    decimals: 2,
    countries: ['RU']
  },
  'TRY': {
    name: 'Türkische Lira',
    symbol: '₺',
    decimals: 2,
    countries: ['TR']
  },
  'AUD': {
    name: 'Australischer Dollar',
    symbol: 'A$',
    decimals: 2,
    countries: ['AU', 'CC', 'CX', 'HM', 'KI', 'NF', 'NR', 'TV']
  },
  'CAD': {
    name: 'Kanadischer Dollar',
    symbol: 'C$',
    decimals: 2,
    countries: ['CA']
  },
  'CNY': {
    name: 'Chinesischer Yuan',
    symbol: '¥',
    decimals: 2,
    countries: ['CN']
  },
  'INR': {
    name: 'Indische Rupie',
    symbol: '₹',
    decimals: 2,
    countries: ['IN', 'BT']
  },
  'KRW': {
    name: 'Südkoreanischer Won',
    symbol: '₩',
    decimals: 0,
    countries: ['KR']
  },
  'BRL': {
    name: 'Brasilianischer Real',
    symbol: 'R$',
    decimals: 2,
    countries: ['BR']
  },
  'MXN': {
    name: 'Mexikanischer Peso',
    symbol: '$',
    decimals: 2,
    countries: ['MX']
  },
  'AED': {
    name: 'VAE-Dirham',
    symbol: 'د.إ',
    decimals: 2,
    countries: ['AE']
  },
  'SAR': {
    name: 'Saudi-Riyal',
    symbol: '﷼',
    decimals: 2,
    countries: ['SA']
  },
  'ZAR': {
    name: 'Südafrikanischer Rand',
    symbol: 'R',
    decimals: 2,
    countries: ['ZA', 'LS', 'NA', 'SZ']
  }
};

// Liste aller unterstützten Währungscodes
const VALID_CURRENCY_CODES = Object.keys(CURRENCY_DATA);

/**
 * Validiert einen ISO 4217 Währungscode
 */
export function isValidCurrencyCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return VALID_CURRENCY_CODES.includes(code.toUpperCase());
}

/**
 * Gibt Währungsdetails zurück
 */
export function getCurrencyInfo(code: string): {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  countries: string[];
} | null {
  if (!isValidCurrencyCode(code)) return null;
  
  const upperCode = code.toUpperCase();
  return {
    code: upperCode,
    ...CURRENCY_DATA[upperCode]
  };
}

/**
 * Gibt die Währung für ein Land zurück
 */
export function getCurrencyForCountry(countryCode: string): string | null {
  if (!countryCode) return null;
  
  const upperCountry = countryCode.toUpperCase();
  
  for (const [currency, data] of Object.entries(CURRENCY_DATA)) {
    if (data.countries.includes(upperCountry)) {
      return currency;
    }
  }
  
  return null;
}

/**
 * Formatiert einen Betrag mit Währungssymbol
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: string = 'de-DE'
): string {
  if (!isValidCurrencyCode(currencyCode)) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode.toUpperCase()
  }).format(amount);
}

/**
 * Formatiert einen Betrag ohne Währungssymbol
 */
export function formatAmount(
  amount: number,
  currencyCode: string,
  locale: string = 'de-DE'
): string {
  const info = getCurrencyInfo(currencyCode);
  if (!info) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals
  }).format(amount);
}

/**
 * Gibt eine sortierte Liste aller Währungen zurück
 */
export function getAvailableCurrencies(): Array<{
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}> {
  return Object.entries(CURRENCY_DATA)
    .map(([code, data]) => ({
      code,
      name: data.name,
      symbol: data.symbol,
      decimals: data.decimals
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/**
 * Prüft ob eine Währung Dezimalstellen verwendet
 */
export function hasDecimals(currencyCode: string): boolean {
  const info = getCurrencyInfo(currencyCode);
  return info ? info.decimals > 0 : true;
}

/**
 * Konvertiert Cent/Kleinste Einheit in Haupteinheit
 */
export function fromSmallestUnit(amount: number, currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode);
  if (!info) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  
  return amount / Math.pow(10, info.decimals);
}

/**
 * Konvertiert Haupteinheit in Cent/Kleinste Einheit
 */
export function toSmallestUnit(amount: number, currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode);
  if (!info) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  
  return Math.round(amount * Math.pow(10, info.decimals));
}

// Type export
export type CurrencyCode = keyof typeof CURRENCY_DATA;

/**
 * ISO Standard Validators for SKAMP
 * Part 3: Language Codes (ISO 639-1)
 */

// Sprachdaten mit deutschen Namen und Regionen
const LANGUAGE_DATA: Record<string, {
  name: string;
  nativeName: string;
  regions: string[];
  rtl?: boolean;
}> = {
  'de': {
    name: 'Deutsch',
    nativeName: 'Deutsch',
    regions: ['DE', 'AT', 'CH', 'LI', 'LU', 'BE']
  },
  'en': {
    name: 'Englisch',
    nativeName: 'English',
    regions: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'IN', 'SG']
  },
  'fr': {
    name: 'Französisch',
    nativeName: 'Français',
    regions: ['FR', 'BE', 'CH', 'CA', 'LU', 'MC']
  },
  'it': {
    name: 'Italienisch',
    nativeName: 'Italiano',
    regions: ['IT', 'CH', 'SM', 'VA']
  },
  'es': {
    name: 'Spanisch',
    nativeName: 'Español',
    regions: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU']
  },
  'pt': {
    name: 'Portugiesisch',
    nativeName: 'Português',
    regions: ['PT', 'BR', 'AO', 'MZ']
  },
  'nl': {
    name: 'Niederländisch',
    nativeName: 'Nederlands',
    regions: ['NL', 'BE', 'SR']
  },
  'pl': {
    name: 'Polnisch',
    nativeName: 'Polski',
    regions: ['PL']
  },
  'ru': {
    name: 'Russisch',
    nativeName: 'Русский',
    regions: ['RU', 'BY', 'KZ', 'KG']
  },
  'tr': {
    name: 'Türkisch',
    nativeName: 'Türkçe',
    regions: ['TR', 'CY']
  },
  'ar': {
    name: 'Arabisch',
    nativeName: 'العربية',
    regions: ['SA', 'AE', 'EG', 'SY', 'IQ', 'JO', 'LB', 'MA', 'TN', 'DZ'],
    rtl: true
  },
  'zh': {
    name: 'Chinesisch',
    nativeName: '中文',
    regions: ['CN', 'TW', 'HK', 'SG', 'MO']
  },
  'ja': {
    name: 'Japanisch',
    nativeName: '日本語',
    regions: ['JP']
  },
  'ko': {
    name: 'Koreanisch',
    nativeName: '한국어',
    regions: ['KR', 'KP']
  },
  'cs': {
    name: 'Tschechisch',
    nativeName: 'Čeština',
    regions: ['CZ']
  },
  'sv': {
    name: 'Schwedisch',
    nativeName: 'Svenska',
    regions: ['SE', 'FI']
  },
  'da': {
    name: 'Dänisch',
    nativeName: 'Dansk',
    regions: ['DK', 'GL']
  },
  'no': {
    name: 'Norwegisch',
    nativeName: 'Norsk',
    regions: ['NO']
  },
  'fi': {
    name: 'Finnisch',
    nativeName: 'Suomi',
    regions: ['FI']
  },
  'hu': {
    name: 'Ungarisch',
    nativeName: 'Magyar',
    regions: ['HU']
  },
  'ro': {
    name: 'Rumänisch',
    nativeName: 'Română',
    regions: ['RO', 'MD']
  },
  'el': {
    name: 'Griechisch',
    nativeName: 'Ελληνικά',
    regions: ['GR', 'CY']
  },
  'he': {
    name: 'Hebräisch',
    nativeName: 'עברית',
    regions: ['IL'],
    rtl: true
  },
  'hi': {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    regions: ['IN']
  },
  'th': {
    name: 'Thai',
    nativeName: 'ไทย',
    regions: ['TH']
  },
  'uk': {
    name: 'Ukrainisch',
    nativeName: 'Українська',
    regions: ['UA']
  },
  'hr': {
    name: 'Kroatisch',
    nativeName: 'Hrvatski',
    regions: ['HR', 'BA']
  },
  'sk': {
    name: 'Slowakisch',
    nativeName: 'Slovenčina',
    regions: ['SK']
  },
  'sl': {
    name: 'Slowenisch',
    nativeName: 'Slovenščina',
    regions: ['SI']
  },
  'bg': {
    name: 'Bulgarisch',
    nativeName: 'Български',
    regions: ['BG']
  },
  'et': {
    name: 'Estnisch',
    nativeName: 'Eesti',
    regions: ['EE']
  },
  'lv': {
    name: 'Lettisch',
    nativeName: 'Latviešu',
    regions: ['LV']
  },
  'lt': {
    name: 'Litauisch',
    nativeName: 'Lietuvių',
    regions: ['LT']
  }
};

// Liste aller unterstützten Sprachcodes
const VALID_LANGUAGE_CODES = Object.keys(LANGUAGE_DATA);

/**
 * Validiert einen ISO 639-1 Sprachcode
 */
export function isValidLanguageCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return VALID_LANGUAGE_CODES.includes(code.toLowerCase());
}

/**
 * Gibt Sprachdetails zurück
 */
export function getLanguageInfo(code: string): {
  code: string;
  name: string;
  nativeName: string;
  regions: string[];
  rtl: boolean;
} | null {
  if (!isValidLanguageCode(code)) return null;
  
  const lowerCode = code.toLowerCase();
  const data = LANGUAGE_DATA[lowerCode];
  
  return {
    code: lowerCode,
    name: data.name,
    nativeName: data.nativeName,
    regions: data.regions,
    rtl: data.rtl || false
  };
}

/**
 * Gibt die Hauptsprachen für ein Land zurück
 */
export function getLanguagesForCountry(countryCode: string): string[] {
  if (!countryCode) return [];
  
  const upperCountry = countryCode.toUpperCase();
  const languages: string[] = [];
  
  for (const [langCode, data] of Object.entries(LANGUAGE_DATA)) {
    if (data.regions.includes(upperCountry)) {
      languages.push(langCode);
    }
  }
  
  return languages;
}

/**
 * Formatiert einen Sprachcode als Locale (z.B. de-DE)
 */
export function formatLocale(languageCode: string, countryCode?: string): string {
  const langInfo = getLanguageInfo(languageCode);
  if (!langInfo) return languageCode;
  
  if (countryCode && langInfo.regions.includes(countryCode.toUpperCase())) {
    return `${langInfo.code}-${countryCode.toUpperCase()}`;
  }
  
  // Standard-Region für Sprache verwenden
  const defaultRegion = langInfo.regions[0];
  return defaultRegion ? `${langInfo.code}-${defaultRegion}` : langInfo.code;
}

/**
 * Parst einen Locale-String (z.B. de-DE) in Sprach- und Ländercode
 */
export function parseLocale(locale: string): {
  language: string;
  country?: string;
} | null {
  if (!locale) return null;
  
  const parts = locale.split(/[-_]/);
  if (parts.length === 0) return null;
  
  const language = parts[0].toLowerCase();
  if (!isValidLanguageCode(language)) return null;
  
  return {
    language,
    country: parts[1]?.toUpperCase()
  };
}

/**
 * Gibt eine sortierte Liste aller Sprachen zurück
 */
export function getAvailableLanguages(): Array<{
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
}> {
  return Object.entries(LANGUAGE_DATA)
    .map(([code, data]) => ({
      code,
      name: data.name,
      nativeName: data.nativeName,
      rtl: data.rtl || false
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/**
 * Prüft ob eine Sprache RTL (Right-to-Left) ist
 */
export function isRtlLanguage(code: string): boolean {
  const info = getLanguageInfo(code);
  return info?.rtl || false;
}

/**
 * Validiert mehrere Sprachcodes
 */
export function validateLanguageCodes(codes: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  codes.forEach(code => {
    if (isValidLanguageCode(code)) {
      valid.push(code.toLowerCase());
    } else {
      invalid.push(code);
    }
  });
  
  return { valid, invalid };
}

/**
 * Formatiert eine Liste von Sprachen für die Anzeige
 */
export function formatLanguageList(codes: string[], showNative: boolean = false): string {
  const names = codes
    .map(code => {
      const info = getLanguageInfo(code);
      if (!info) return null;
      return showNative ? `${info.name} (${info.nativeName})` : info.name;
    })
    .filter(Boolean) as string[];
  
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} und ${names[1]}`;
  
  const lastLang = names.pop();
  return `${names.join(', ')} und ${lastLang}`;
}

// Type export
export type LanguageCode = keyof typeof LANGUAGE_DATA;

/**
 * ISO Standard Validators for SKAMP
 * 
 * Validierung und Formatierung für:
 * - ISO 3166-1 Alpha-2 (Ländercodes)
 * - ISO 4217 (Währungscodes)
 * - ISO 639-1 (Sprachcodes)
 */


// Zusätzliche kombinierte Validierungsfunktionen

/**
 * Validiert eine komplette internationale Adresse
 */
export interface ValidatedAddress {
  isValid: boolean;
  errors: string[];
  normalized?: {
    countryCode: string;
    countryName: string;
    currency: string;
    languages: string[];
  };
}

export function validateInternationalAddress(
  countryCode: string,
  postalCode?: string,
  phoneNumber?: string
): ValidatedAddress {
  const errors: string[] = [];
  
  // Ländercode validieren
  if (!isValidCountryCode(countryCode)) {
    errors.push(`Ungültiger Ländercode: ${countryCode}`);
    return { isValid: false, errors };
  }
  
  const upperCountry = countryCode.toUpperCase();
  
  // Postleitzahl validieren (länderspezifisch)
  if (postalCode) {
    const postalCodeValid = validatePostalCode(postalCode, upperCountry);
    if (!postalCodeValid) {
      errors.push(`Ungültige Postleitzahl für ${upperCountry}: ${postalCode}`);
    }
  }
  
  // Telefonnummer validieren (wenn vorhanden)
  if (phoneNumber) {
    const phoneValid = validatePhoneForCountry(phoneNumber, upperCountry);
    if (!phoneValid) {
      errors.push(`Ungültige Telefonnummer für ${upperCountry}: ${phoneNumber}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    normalized: errors.length === 0 ? {
      countryCode: upperCountry,
      countryName: getCountryNameDe(upperCountry) || upperCountry,
      currency: getCurrencyForCountry(upperCountry) || 'EUR',
      languages: getLanguagesForCountry(upperCountry)
    } : undefined
  };
}

/**
 * Validiert Postleitzahl basierend auf Länderregeln
 */
function validatePostalCode(postalCode: string, countryCode: string): boolean {
  const patterns: Record<string, RegExp> = {
    'DE': /^\d{5}$/,
    'AT': /^\d{4}$/,
    'CH': /^\d{4}$/,
    'FR': /^\d{5}$/,
    'IT': /^\d{5}$/,
    'ES': /^\d{5}$/,
    'NL': /^\d{4}\s?[A-Z]{2}$/,
    'BE': /^\d{4}$/,
    'US': /^\d{5}(-\d{4})?$/,
    'GB': /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    'CA': /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
    'JP': /^\d{3}-?\d{4}$/,
    'AU': /^\d{4}$/,
    'PL': /^\d{2}-\d{3}$/,
    'SE': /^\d{3}\s?\d{2}$/,
    'DK': /^\d{4}$/,
    'NO': /^\d{4}$/,
    'FI': /^\d{5}$/
  };
  
  const pattern = patterns[countryCode];
  return pattern ? pattern.test(postalCode) : true;
}

/**
 * Basis-Validierung für Telefonnummern
 */
function validatePhoneForCountry(phone: string, countryCode: string): boolean {
  // Entferne alle Nicht-Ziffern außer + am Anfang
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Muss mit + oder Ziffern beginnen
  if (!cleaned || !/^\+?\d+$/.test(cleaned)) return false;
  
  // Länderspezifische Längenprüfung
  const minMaxLength: Record<string, [number, number]> = {
    'DE': [10, 12],
    'AT': [10, 13],
    'CH': [10, 12],
    'FR': [10, 12],
    'US': [10, 11],
    'GB': [10, 11],
    'IT': [9, 13],
    'ES': [9, 12],
    'NL': [9, 11],
    'BE': [9, 12]
  };
  
  const [min, max] = minMaxLength[countryCode] || [7, 15];
  const digitsOnly = cleaned.replace(/^\+/, '');
  
  return digitsOnly.length >= min && digitsOnly.length <= max;
}

/**
 * Erstellt ein Locale-Objekt mit allen relevanten Informationen
 */
export interface LocaleInfo {
  languageCode: string;
  languageName: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  isEu: boolean;
  isRtl: boolean;
}

export function getCompleteLocaleInfo(
  languageCode: string,
  countryCode: string
): LocaleInfo | null {
  const langInfo = getLanguageInfo(languageCode);
  const countryName = getCountryNameDe(countryCode);
  const currencyCode = getCurrencyForCountry(countryCode);
  const currencyInfo = currencyCode ? getCurrencyInfo(currencyCode) : null;
  
  if (!langInfo || !countryName || !currencyInfo) return null;
  
  return {
    languageCode: langInfo.code,
    languageName: langInfo.name,
    countryCode: countryCode.toUpperCase(),
    countryName,
    currencyCode: currencyInfo.code,
    currencySymbol: currencyInfo.symbol,
    locale: formatLocale(languageCode, countryCode),
    isEu: isEuCountry(countryCode),
    isRtl: langInfo.rtl
  };
}

/**
 * Validiert alle ISO-Codes in einem Objekt
 */
export interface IsoValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export function validateAllIsoCodes(data: {
  countryCode?: string;
  currencyCode?: string;
  languageCodes?: string[];
}): IsoValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  // Ländercode validieren
  if (data.countryCode && !isValidCountryCode(data.countryCode)) {
    errors.countryCode = `Ungültiger Ländercode: ${data.countryCode}`;
  }
  
  // Währungscode validieren
  if (data.currencyCode && !isValidCurrencyCode(data.currencyCode)) {
    errors.currencyCode = `Ungültiger Währungscode: ${data.currencyCode}`;
  }
  
  // Konsistenzprüfung: Währung zum Land
  if (data.countryCode && data.currencyCode) {
    const expectedCurrency = getCurrencyForCountry(data.countryCode);
    if (expectedCurrency && expectedCurrency !== data.currencyCode.toUpperCase()) {
      warnings.currencyMismatch = 
        `Unübliche Währung ${data.currencyCode} für ${data.countryCode}. ` +
        `Erwartet: ${expectedCurrency}`;
    }
  }
  
  // Sprachcodes validieren
  if (data.languageCodes && data.languageCodes.length > 0) {
    const { invalid } = validateLanguageCodes(data.languageCodes);
    if (invalid.length > 0) {
      errors.languageCodes = `Ungültige Sprachcodes: ${invalid.join(', ')}`;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

// Hilfsfunktion für Import in anderen Dateien
export function createIsoValidators() {
  return {
    country: {
      validate: isValidCountryCode,
      getName: getCountryNameDe,
      isEu: isEuCountry,
      fromName: countryNameToCode
    },
    currency: {
      validate: isValidCurrencyCode,
      getInfo: getCurrencyInfo,
      format: formatCurrency,
      formatAmount: formatAmount
    },
    language: {
      validate: isValidLanguageCode,
      getInfo: getLanguageInfo,
      formatLocale: formatLocale,
      isRtl: isRtlLanguage
    }
  };
}
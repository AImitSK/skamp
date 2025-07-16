/**
 * Phone Number Validators for SKAMP
 * E.164 Format and International Phone Validation
 */

// Internationale Vorwahlen (Calling Codes)
const COUNTRY_CALLING_CODES: Record<string, {
  code: string;
  digits: { min: number; max: number };
  format?: string;
  mobilePrefix?: string[];
}> = {
  'DE': {
    code: '49',
    digits: { min: 10, max: 11 },
    format: '+49 XXX XXXXXXX',
    mobilePrefix: ['15', '16', '17']
  },
  'AT': {
    code: '43',
    digits: { min: 9, max: 13 },
    format: '+43 XXX XXXXXXX',
    mobilePrefix: ['650', '660', '664', '676', '677', '678', '680', '681', '688', '699']
  },
  'CH': {
    code: '41',
    digits: { min: 9, max: 9 },
    format: '+41 XX XXX XX XX',
    mobilePrefix: ['74', '75', '76', '77', '78', '79']
  },
  'FR': {
    code: '33',
    digits: { min: 9, max: 9 },
    format: '+33 X XX XX XX XX',
    mobilePrefix: ['6', '7']
  },
  'IT': {
    code: '39',
    digits: { min: 9, max: 10 },
    format: '+39 XXX XXXXXXX',
    mobilePrefix: ['3']
  },
  'ES': {
    code: '34',
    digits: { min: 9, max: 9 },
    format: '+34 XXX XXX XXX',
    mobilePrefix: ['6', '7']
  },
  'GB': {
    code: '44',
    digits: { min: 10, max: 10 },
    format: '+44 XXXX XXXXXX',
    mobilePrefix: ['7']
  },
  'US': {
    code: '1',
    digits: { min: 10, max: 10 },
    format: '+1 (XXX) XXX-XXXX'
  },
  'CA': {
    code: '1',
    digits: { min: 10, max: 10 },
    format: '+1 (XXX) XXX-XXXX'
  },
  'NL': {
    code: '31',
    digits: { min: 9, max: 9 },
    format: '+31 XX XXX XXXX',
    mobilePrefix: ['6']
  },
  'BE': {
    code: '32',
    digits: { min: 8, max: 9 },
    format: '+32 XXX XX XX XX',
    mobilePrefix: ['47', '48', '49']
  },
  'PL': {
    code: '48',
    digits: { min: 9, max: 9 },
    format: '+48 XXX XXX XXX',
    mobilePrefix: ['5', '6', '7', '8']
  },
  'SE': {
    code: '46',
    digits: { min: 9, max: 9 },
    format: '+46 XX XXX XXXX',
    mobilePrefix: ['70', '72', '73', '76', '79']
  },
  'NO': {
    code: '47',
    digits: { min: 8, max: 8 },
    format: '+47 XXX XX XXX',
    mobilePrefix: ['4', '9']
  },
  'DK': {
    code: '45',
    digits: { min: 8, max: 8 },
    format: '+45 XX XX XX XX',
    mobilePrefix: ['2', '3', '4', '5', '6', '71', '81', '91', '92', '93']
  },
  'FI': {
    code: '358',
    digits: { min: 9, max: 10 },
    format: '+358 XX XXX XXXX',
    mobilePrefix: ['4', '5']
  },
  'RU': {
    code: '7',
    digits: { min: 10, max: 10 },
    format: '+7 (XXX) XXX-XX-XX',
    mobilePrefix: ['9']
  },
  'CN': {
    code: '86',
    digits: { min: 11, max: 11 },
    format: '+86 XXX XXXX XXXX',
    mobilePrefix: ['13', '14', '15', '16', '17', '18', '19']
  },
  'JP': {
    code: '81',
    digits: { min: 10, max: 10 },
    format: '+81 XX XXXX XXXX',
    mobilePrefix: ['70', '80', '90']
  },
  'AU': {
    code: '61',
    digits: { min: 9, max: 9 },
    format: '+61 X XXXX XXXX',
    mobilePrefix: ['4']
  },
  'IN': {
    code: '91',
    digits: { min: 10, max: 10 },
    format: '+91 XXXXX XXXXX',
    mobilePrefix: ['6', '7', '8', '9']
  }
};

/**
 * Validiert eine Telefonnummer im E.164 Format
 */
export function isValidE164Phone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // E.164: + gefolgt von 1-15 Ziffern
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Normalisiert eine Telefonnummer zu E.164
 */
export function normalizeToE164(
  phone: string,
  defaultCountry?: string
): { 
  e164?: string; 
  isValid: boolean; 
  error?: string;
  country?: string;
} {
  if (!phone) {
    return { isValid: false, error: 'Telefonnummer fehlt' };
  }
  
  // Entferne alle Nicht-Ziffern außer + am Anfang
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Wenn bereits E.164, validiere und gib zurück
  if (cleaned.startsWith('+')) {
    if (isValidE164Phone(cleaned)) {
      const country = detectCountryFromE164(cleaned);
return { e164: cleaned, isValid: true, country: country || undefined };
    }
    return { isValid: false, error: 'Ungültiges E.164 Format' };
  }
  
  // Wenn kein + am Anfang, brauchen wir ein Land
  if (!defaultCountry) {
    return { 
      isValid: false, 
      error: 'Ländercode erforderlich für Nummern ohne internationale Vorwahl' 
    };
  }
  
  const countryData = COUNTRY_CALLING_CODES[defaultCountry.toUpperCase()];
  if (!countryData) {
    return { isValid: false, error: `Unbekannter Ländercode: ${defaultCountry}` };
  }
  
  // Entferne führende Nullen (nationale Vorwahl)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Prüfe Länge
  if (cleaned.length < countryData.digits.min || cleaned.length > countryData.digits.max) {
    return { 
      isValid: false, 
      error: `Nummer muss ${countryData.digits.min}-${countryData.digits.max} Ziffern haben (ohne Vorwahl)` 
    };
  }
  
  // Erstelle E.164
  const e164 = `+${countryData.code}${cleaned}`;
  
  if (isValidE164Phone(e164)) {
    return { e164, isValid: true, country: defaultCountry.toUpperCase() };
  }
  
  return { isValid: false, error: 'Konvertierung zu E.164 fehlgeschlagen' };
}

/**
 * Erkennt das Land aus einer E.164 Nummer
 */
export function detectCountryFromE164(e164Phone: string): string | null {
  if (!isValidE164Phone(e164Phone)) return null;
  
  const phoneWithoutPlus = e164Phone.substring(1);
  
  // Sortiere nach Länge der Vorwahl (längste zuerst)
  const sortedCountries = Object.entries(COUNTRY_CALLING_CODES)
    .sort((a, b) => b[1].code.length - a[1].code.length);
  
  for (const [country, data] of sortedCountries) {
    if (phoneWithoutPlus.startsWith(data.code)) {
      // Zusätzliche Längenprüfung
      const nationalNumber = phoneWithoutPlus.substring(data.code.length);
      if (nationalNumber.length >= data.digits.min && 
          nationalNumber.length <= data.digits.max) {
        return country;
      }
    }
  }
  
  return null;
}

/**
 * Formatiert eine E.164 Nummer für die Anzeige
 */
export function formatE164Phone(
  e164Phone: string,
  style: 'international' | 'national' | 'rfc3966' = 'international'
): string {
  if (!isValidE164Phone(e164Phone)) return e164Phone;
  
  const country = detectCountryFromE164(e164Phone);
  if (!country) return e164Phone;
  
  const countryData = COUNTRY_CALLING_CODES[country];
  const phoneWithoutPlus = e164Phone.substring(1);
  const nationalNumber = phoneWithoutPlus.substring(countryData.code.length);
  
  switch (style) {
    case 'national':
      return formatNationalNumber(nationalNumber, country);
      
    case 'rfc3966':
      return `tel:${e164Phone}`;
      
    case 'international':
    default:
      return formatInternationalNumber(e164Phone, country);
  }
}

/**
 * Formatiert eine nationale Nummer
 */
function formatNationalNumber(nationalNumber: string, country: string): string {
  // Länderspezifische Formatierung
  switch (country) {
    case 'DE':
      // 030 12345678 oder 0171 1234567
      if (nationalNumber.length === 11) {
        return `0${nationalNumber.substring(0, 3)} ${nationalNumber.substring(3)}`;
      }
      return `0${nationalNumber.substring(0, 2)} ${nationalNumber.substring(2)}`;
      
    case 'AT':
      // 0664 1234567
      return `0${nationalNumber.substring(0, 3)} ${nationalNumber.substring(3)}`;
      
    case 'CH':
      // 079 123 45 67
      return `0${nationalNumber.substring(0, 2)} ${nationalNumber.substring(2, 5)} ${nationalNumber.substring(5, 7)} ${nationalNumber.substring(7)}`;
      
    case 'US':
    case 'CA':
      // (212) 555-1234
      return `(${nationalNumber.substring(0, 3)}) ${nationalNumber.substring(3, 6)}-${nationalNumber.substring(6)}`;
      
    default:
      return `0${nationalNumber}`;
  }
}

/**
 * Formatiert eine internationale Nummer
 */
function formatInternationalNumber(e164Phone: string, country: string): string {
  const countryData = COUNTRY_CALLING_CODES[country];
  const phoneWithoutPlus = e164Phone.substring(1);
  const nationalNumber = phoneWithoutPlus.substring(countryData.code.length);
  
  // Länderspezifische Formatierung
  switch (country) {
    case 'DE':
      if (nationalNumber.length === 11) {
        return `+${countryData.code} ${nationalNumber.substring(0, 3)} ${nationalNumber.substring(3)}`;
      }
      return `+${countryData.code} ${nationalNumber.substring(0, 2)} ${nationalNumber.substring(2)}`;
      
    case 'AT':
      return `+${countryData.code} ${nationalNumber.substring(0, 3)} ${nationalNumber.substring(3)}`;
      
    case 'CH':
      return `+${countryData.code} ${nationalNumber.substring(0, 2)} ${nationalNumber.substring(2, 5)} ${nationalNumber.substring(5, 7)} ${nationalNumber.substring(7)}`;
      
    case 'FR':
      return `+${countryData.code} ${nationalNumber.substring(0, 1)} ${nationalNumber.substring(1, 3)} ${nationalNumber.substring(3, 5)} ${nationalNumber.substring(5, 7)} ${nationalNumber.substring(7)}`;
      
    case 'US':
    case 'CA':
      return `+${countryData.code} (${nationalNumber.substring(0, 3)}) ${nationalNumber.substring(3, 6)}-${nationalNumber.substring(6)}`;
      
    case 'GB':
      return `+${countryData.code} ${nationalNumber.substring(0, 4)} ${nationalNumber.substring(4)}`;
      
    default:
      return e164Phone;
  }
}

/**
 * Prüft ob eine Nummer mobil ist
 */
export function isMobileNumber(e164Phone: string): boolean | null {
  if (!isValidE164Phone(e164Phone)) return null;
  
  const country = detectCountryFromE164(e164Phone);
  if (!country) return null;
  
  const countryData = COUNTRY_CALLING_CODES[country];
  if (!countryData.mobilePrefix) return null;
  
  const phoneWithoutPlus = e164Phone.substring(1);
  const nationalNumber = phoneWithoutPlus.substring(countryData.code.length);
  
  // Prüfe ob Nummer mit Mobile-Prefix beginnt
  return countryData.mobilePrefix.some(prefix => 
    nationalNumber.startsWith(prefix)
  );
}

/**
 * Phone Number Validators for SKAMP
 * Part 2: Extended Functions and Utilities
 */

/**
 * Parst verschiedene Telefonnummer-Formate
 */
export interface ParsedPhoneNumber {
  e164?: string;
  countryCode?: string;
  nationalNumber?: string;
  extension?: string;
  isMobile?: boolean;
  isValid: boolean;
  originalFormat: string;
  type?: 'mobile' | 'landline' | 'unknown';
}

export function parsePhoneNumber(
  input: string,
  defaultCountry?: string
): ParsedPhoneNumber {
  if (!input) {
    return {
      isValid: false,
      originalFormat: input
    };
  }
  
  // Extrahiere Extension (Durchwahl)
  let extension: string | undefined;
  let phoneOnly = input;
  
  // Suche nach Extension-Patterns
  const extensionMatch = input.match(/(?:ext|extension|durchwahl|dw|x)\.?\s*(\d+)/i);
  if (extensionMatch) {
    extension = extensionMatch[1];
    phoneOnly = input.substring(0, extensionMatch.index).trim();
  }
  
  // Normalisiere zu E.164
  const normalized = normalizeToE164(phoneOnly, defaultCountry);
  
  if (!normalized.isValid || !normalized.e164) {
    return {
      isValid: false,
      originalFormat: input,
      extension
    };
  }
  
  const country = normalized.country || detectCountryFromE164(normalized.e164) || undefined;
  const countryData = country ? COUNTRY_CALLING_CODES[country] : undefined;
  
  let nationalNumber: string | undefined;
  if (countryData) {
    const phoneWithoutPlus = normalized.e164.substring(1);
    nationalNumber = phoneWithoutPlus.substring(countryData.code.length);
  }
  
  const isMobile = isMobileNumber(normalized.e164) || undefined;
  
  return {
    e164: normalized.e164,
    countryCode: country,
    nationalNumber,
    extension,
    isMobile,
    isValid: true,
    originalFormat: input,
    type: isMobile === true ? 'mobile' : isMobile === false ? 'landline' : 'unknown'
  };
}

/**
 * Validiert mehrere Telefonnummern
 */
export interface PhoneValidationResult {
  original: string;
  e164?: string;
  country?: string;
  type?: 'mobile' | 'landline' | 'unknown';
  isValid: boolean;
  error?: string;
}

export function validateMultiplePhones(
  phones: Array<{ number: string; country?: string }>,
  defaultCountry?: string
): {
  valid: PhoneValidationResult[];
  invalid: PhoneValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    byCountry: Record<string, number>;
    mobile: number;
    landline: number;
  };
} {
  const valid: PhoneValidationResult[] = [];
  const invalid: PhoneValidationResult[] = [];
  const byCountry: Record<string, number> = {};
  let mobile = 0;
  let landline = 0;
  
  phones.forEach(({ number, country }) => {
    const parsed = parsePhoneNumber(number, country || defaultCountry);
    
    if (parsed.isValid && parsed.e164) {
      const result: PhoneValidationResult = {
        original: number,
        e164: parsed.e164,
        country: parsed.countryCode,
        type: parsed.type,
        isValid: true
      };
      
      valid.push(result);
      
      // Statistiken
      if (parsed.countryCode) {
        byCountry[parsed.countryCode] = (byCountry[parsed.countryCode] || 0) + 1;
      }
      if (parsed.type === 'mobile') mobile++;
      else if (parsed.type === 'landline') landline++;
    } else {
      invalid.push({
        original: number,
        isValid: false,
        error: 'Ungültige Telefonnummer'
      });
    }
  });
  
  return {
    valid,
    invalid,
    summary: {
      total: phones.length,
      valid: valid.length,
      invalid: invalid.length,
      byCountry,
      mobile,
      landline
    }
  };
}

/**
 * Formatiert Telefonnummer mit verschiedenen Optionen
 */
export interface FormatOptions {
  style?: 'international' | 'national' | 'rfc3966' | 'e164';
  includeExtension?: boolean;
  spacer?: string;
}

export function formatPhoneNumber(
  input: string,
  defaultCountry?: string,
  options: FormatOptions = {}
): string {
  const parsed = parsePhoneNumber(input, defaultCountry);
  
  if (!parsed.isValid || !parsed.e164) {
    return input;
  }
  
  let formatted: string;
  
  switch (options.style) {
    case 'e164':
      formatted = parsed.e164;
      break;
    case 'rfc3966':
      formatted = formatE164Phone(parsed.e164, 'rfc3966');
      if (parsed.extension) {
        formatted += `;ext=${parsed.extension}`;
      }
      return formatted;
    default:
      formatted = formatE164Phone(parsed.e164, options.style || 'international');
  }
  
  // Extension hinzufügen
  if (options.includeExtension && parsed.extension) {
    formatted += ` ext. ${parsed.extension}`;
  }
  
  return formatted;
}

/**
 * Generiert Telefonnummer-Beispiele für ein Land
 */
export function getPhoneExamples(countryCode: string): {
  mobile?: string;
  landline?: string;
  formatted: {
    international: string;
    national: string;
  };
} | null {
  const data = COUNTRY_CALLING_CODES[countryCode.toUpperCase()];
  if (!data) return null;
  
  const examples: Record<string, any> = {
    'DE': {
      mobile: '+49 171 1234567',
      landline: '+49 30 12345678',
      mobileNational: '0171 1234567',
      landlineNational: '030 12345678'
    },
    'AT': {
      mobile: '+43 664 1234567',
      landline: '+43 1 1234567',
      mobileNational: '0664 1234567',
      landlineNational: '01 1234567'
    },
    'CH': {
      mobile: '+41 79 123 45 67',
      landline: '+41 44 123 45 67',
      mobileNational: '079 123 45 67',
      landlineNational: '044 123 45 67'
    },
    'US': {
      mobile: '+1 (555) 123-4567',
      landline: '+1 (212) 555-1234',
      mobileNational: '(555) 123-4567',
      landlineNational: '(212) 555-1234'
    }
    // Weitere Länder können hinzugefügt werden
  };
  
  const countryExamples = examples[countryCode.toUpperCase()];
  if (!countryExamples) {
    // Generisches Beispiel
    const baseNumber = '123456789'.substring(0, data.digits.min);
    const e164 = `+${data.code}${baseNumber}`;
    return {
      formatted: {
        international: e164,
        national: `0${baseNumber}`
      }
    };
  }
  
  return {
    mobile: countryExamples.mobile,
    landline: countryExamples.landline,
    formatted: {
      international: countryExamples.mobile || countryExamples.landline,
      national: countryExamples.mobileNational || countryExamples.landlineNational
    }
  };
}

/**
 * UI Helper für Telefonnummer-Eingabefelder
 */
export interface PhoneInputConfig {
  countryCode: string;
  label: string;
  placeholder: string;
  pattern?: string;
  maxLength: number;
  example: string;
  format: string;
  help: string;
}

export function getPhoneInputConfig(
  countryCode: string,
  type: 'mobile' | 'landline' | 'any' = 'any'
): PhoneInputConfig | null {
  const data = COUNTRY_CALLING_CODES[countryCode.toUpperCase()];
  if (!data) return null;
  
  const examples = getPhoneExamples(countryCode);
  const example = type === 'mobile' ? examples?.mobile : 
                  type === 'landline' ? examples?.landline :
                  examples?.formatted.international;
  
  const configs: Record<string, Partial<PhoneInputConfig>> = {
    'DE': {
      pattern: type === 'mobile' ? '^\\+49\\s?1[567]\\d+' : undefined,
      help: type === 'mobile' ? 'Deutsche Mobilnummer (015x, 016x, 017x)' : 'Deutsche Telefonnummer'
    },
    'AT': {
      pattern: type === 'mobile' ? '^\\+43\\s?6[56]\\d+' : undefined,
      help: type === 'mobile' ? 'Österreichische Mobilnummer' : 'Österreichische Telefonnummer'
    },
    'CH': {
      pattern: type === 'mobile' ? '^\\+41\\s?7[4-9]\\d+' : undefined,
      help: type === 'mobile' ? 'Schweizer Mobilnummer (07x)' : 'Schweizer Telefonnummer'
    }
  };
  
  const countryConfig = configs[countryCode.toUpperCase()] || {};
  
  return {
    countryCode: countryCode.toUpperCase(),
    label: type === 'mobile' ? 'Mobilnummer' : type === 'landline' ? 'Festnetz' : 'Telefonnummer',
    placeholder: example || `+${data.code} ...`,
    pattern: countryConfig.pattern,
    maxLength: data.digits.max + data.code.length + 5, // +, Leerzeichen etc.
    example: example || '',
    format: data.format || '',
    help: countryConfig.help || `${countryCode} Telefonnummer im internationalen Format`
  };
}

/**
 * Konvertiert zwischen verschiedenen Telefonnummer-Formaten
 */
export function convertPhoneFormat(
  phone: string,
  fromFormat: 'e164' | 'national' | 'international' | 'auto',
  toFormat: 'e164' | 'national' | 'international',
  countryCode?: string
): string | null {
  let e164: string;
  
  if (fromFormat === 'e164') {
    if (!isValidE164Phone(phone)) return null;
    e164 = phone;
  } else {
    const parsed = parsePhoneNumber(phone, countryCode);
    if (!parsed.isValid || !parsed.e164) return null;
    e164 = parsed.e164;
  }
  
  switch (toFormat) {
    case 'e164':
      return e164;
    case 'national':
      return formatE164Phone(e164, 'national');
    case 'international':
      return formatE164Phone(e164, 'international');
    default:
      return null;
  }
}

/**
 * Extrahiert alle Telefonnummern aus einem Text
 */
export function extractPhoneNumbers(
  text: string,
  defaultCountry?: string
): ParsedPhoneNumber[] {
  // Regex für verschiedene Telefonnummer-Formate
  const patterns = [
    /\+\d{1,3}[\s\-\.]?\(?\d{1,4}\)?[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,4}/g,
    /\(?\d{2,4}\)?[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,4}/g,
    /\d{3,4}[\s\-]\d{3,4}[\s\-]\d{3,4}/g
  ];
  
  const matches = new Set<string>();
  
  patterns.forEach(pattern => {
    const found = text.match(pattern);
    if (found) {
      found.forEach(match => matches.add(match.trim()));
    }
  });
  
  return Array.from(matches)
    .map(match => parsePhoneNumber(match, defaultCountry))
    .filter(parsed => parsed.isValid);
}

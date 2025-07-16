/**
 * Business Identifier Validators for SKAMP
 * Part 1: EU VAT Numbers (USt-IdNr.)
 */

// EU VAT Nummer Patterns und Validierungsregeln
const EU_VAT_PATTERNS: Record<string, {
  pattern: RegExp;
  format: string;
  example: string;
  checksum?: (vat: string) => boolean;
}> = {
  'AT': {
    pattern: /^ATU\d{8}$/,
    format: 'ATU12345678',
    example: 'ATU12345678'
  },
  'BE': {
    pattern: /^BE0\d{9}$/,
    format: 'BE0123456789',
    example: 'BE0123456789',
    checksum: (vat: string) => {
      const numbers = vat.substring(2);
      const checkDigits = parseInt(numbers.substring(7, 9));
      const baseNumber = parseInt(numbers.substring(0, 7));
      return (97 - (baseNumber % 97)) === checkDigits;
    }
  },
  'BG': {
    pattern: /^BG\d{9,10}$/,
    format: 'BG123456789 oder BG1234567890',
    example: 'BG123456789'
  },
  'CY': {
    pattern: /^CY\d{8}[A-Z]$/,
    format: 'CY12345678L',
    example: 'CY12345678L'
  },
  'CZ': {
    pattern: /^CZ\d{8,10}$/,
    format: 'CZ12345678 oder CZ123456789 oder CZ1234567890',
    example: 'CZ12345678'
  },
  'DE': {
    pattern: /^DE\d{9}$/,
    format: 'DE123456789',
    example: 'DE123456789',
    checksum: (vat: string) => {
      const numbers = vat.substring(2).split('').map(Number);
      let product = 10;
      
      for (let i = 0; i < 8; i++) {
        let sum = (numbers[i] + product) % 10;
        if (sum === 0) sum = 10;
        product = (2 * sum) % 11;
      }
      
      let checkDigit = 11 - product;
      if (checkDigit === 10) checkDigit = 0;
      
      return checkDigit === numbers[8];
    }
  },
  'DK': {
    pattern: /^DK\d{8}$/,
    format: 'DK12345678',
    example: 'DK12345678'
  },
  'EE': {
    pattern: /^EE\d{9}$/,
    format: 'EE123456789',
    example: 'EE123456789'
  },
  'EL': { // Griechenland (alternatives Kürzel)
    pattern: /^EL\d{9}$/,
    format: 'EL123456789',
    example: 'EL123456789'
  },
  'GR': { // Griechenland
    pattern: /^GR\d{9}$/,
    format: 'GR123456789',
    example: 'GR123456789'
  },
  'ES': {
    pattern: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    format: 'ESX12345678 oder ES12345678X',
    example: 'ESA12345678'
  },
  'FI': {
    pattern: /^FI\d{8}$/,
    format: 'FI12345678',
    example: 'FI12345678'
  },
  'FR': {
    pattern: /^FR[A-Z0-9]{2}\d{9}$/,
    format: 'FRXX123456789',
    example: 'FR12123456789',
    checksum: (vat: string) => {
      const siren = vat.substring(4);
      const checkLetters = vat.substring(2, 4);
      
      // Vereinfachte Prüfung - vollständige Implementierung würde mehr Logik benötigen
      return /^\d{9}$/.test(siren);
    }
  },
  'HR': {
    pattern: /^HR\d{11}$/,
    format: 'HR12345678901',
    example: 'HR12345678901'
  },
  'HU': {
    pattern: /^HU\d{8}$/,
    format: 'HU12345678',
    example: 'HU12345678'
  },
  'IE': {
    pattern: /^IE\d[A-Z0-9]\d{5}[A-Z]$|^IE\d{7}[A-Z]{2}$/,
    format: 'IE1234567L oder IE1L23456L',
    example: 'IE1234567L'
  },
  'IT': {
    pattern: /^IT\d{11}$/,
    format: 'IT12345678901',
    example: 'IT12345678901',
    checksum: (vat: string) => {
      const numbers = vat.substring(2).split('').map(Number);
      let sum = 0;
      
      for (let i = 0; i < 11; i++) {
        if (i % 2 === 0) {
          sum += numbers[i];
        } else {
          const doubled = numbers[i] * 2;
          sum += doubled > 9 ? doubled - 9 : doubled;
        }
      }
      
      return sum % 10 === 0;
    }
  },
  'LT': {
    pattern: /^LT\d{9}$|^LT\d{12}$/,
    format: 'LT123456789 oder LT123456789012',
    example: 'LT123456789'
  },
  'LU': {
    pattern: /^LU\d{8}$/,
    format: 'LU12345678',
    example: 'LU12345678'
  },
  'LV': {
    pattern: /^LV\d{11}$/,
    format: 'LV12345678901',
    example: 'LV12345678901'
  },
  'MT': {
    pattern: /^MT\d{8}$/,
    format: 'MT12345678',
    example: 'MT12345678'
  },
  'NL': {
    pattern: /^NL\d{9}B\d{2}$/,
    format: 'NL123456789B01',
    example: 'NL123456789B01',
    checksum: (vat: string) => {
      const numbers = vat.substring(2, 11).split('').map(Number);
      let sum = 0;
      
      for (let i = 0; i < 8; i++) {
        sum += numbers[i] * (9 - i);
      }
      
      const checkDigit = sum % 11;
      return checkDigit === numbers[8];
    }
  },
  'PL': {
    pattern: /^PL\d{10}$/,
    format: 'PL1234567890',
    example: 'PL1234567890'
  },
  'PT': {
    pattern: /^PT\d{9}$/,
    format: 'PT123456789',
    example: 'PT123456789'
  },
  'RO': {
    pattern: /^RO\d{2,10}$/,
    format: 'RO12 bis RO1234567890',
    example: 'RO1234567890'
  },
  'SE': {
    pattern: /^SE\d{12}$/,
    format: 'SE123456789012',
    example: 'SE123456789012'
  },
  'SI': {
    pattern: /^SI\d{8}$/,
    format: 'SI12345678',
    example: 'SI12345678'
  },
  'SK': {
    pattern: /^SK\d{10}$/,
    format: 'SK1234567890',
    example: 'SK1234567890'
  }
};

/**
 * Validiert eine EU USt-IdNr.
 */
export function validateEuVat(vatNumber: string): {
  isValid: boolean;
  countryCode?: string;
  cleanedNumber?: string;
  error?: string;
} {
  if (!vatNumber || typeof vatNumber !== 'string') {
    return { isValid: false, error: 'USt-IdNr. fehlt' };
  }
  
  // Normalisierung: Entferne Leerzeichen und Bindestriche
  const cleaned = vatNumber.toUpperCase().replace(/[\s\-\.]/g, '');
  
  // Extrahiere Ländercode
  const countryCode = cleaned.substring(0, 2);
  
  // Prüfe ob EU-Land
  const vatPattern = EU_VAT_PATTERNS[countryCode];
  if (!vatPattern) {
    return { 
      isValid: false, 
      error: `Ungültiger oder nicht unterstützter EU-Ländercode: ${countryCode}` 
    };
  }
  
  // Prüfe Format
  if (!vatPattern.pattern.test(cleaned)) {
    return { 
      isValid: false, 
      countryCode,
      error: `Ungültiges Format. Erwartet: ${vatPattern.format}` 
    };
  }
  
  // Prüfe Checksumme wenn vorhanden
  if (vatPattern.checksum && !vatPattern.checksum(cleaned)) {
    return { 
      isValid: false, 
      countryCode,
      cleanedNumber: cleaned,
      error: 'Prüfziffernvalidierung fehlgeschlagen' 
    };
  }
  
  return { 
    isValid: true, 
    countryCode,
    cleanedNumber: cleaned 
  };
}

/**
 * Formatiert eine EU VAT Nummer für die Anzeige
 */
export function formatEuVat(vatNumber: string): string {
  const result = validateEuVat(vatNumber);
  if (!result.isValid || !result.cleanedNumber) return vatNumber;
  
  const countryCode = result.cleanedNumber.substring(0, 2);
  const number = result.cleanedNumber.substring(2);
  
  // Länderspezifische Formatierung
  switch (countryCode) {
    case 'DE':
      return `DE ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    case 'AT':
      return `ATU ${number.substring(1)}`;
    case 'FR':
      return `FR ${number.substring(0, 2)} ${number.substring(2)}`;
    case 'NL':
      return `NL ${number.substring(0, 3)}.${number.substring(3, 6)}.${number.substring(6, 9)}.B${number.substring(10)}`;
    default:
      return result.cleanedNumber;
  }
}

/**
 * Gibt Informationen über VAT-Format eines Landes zurück
 */
export function getVatInfo(countryCode: string): {
  format: string;
  example: string;
  hasChecksum: boolean;
} | null {
  const info = EU_VAT_PATTERNS[countryCode.toUpperCase()];
  if (!info) return null;
  
  return {
    format: info.format,
    example: info.example,
    hasChecksum: !!info.checksum
  };
}

/**
 * Validiert mehrere VAT-Nummern
 */
export function validateMultipleVats(vatNumbers: string[]): {
  valid: Array<{ original: string; cleaned: string; countryCode: string }>;
  invalid: Array<{ original: string; error: string }>;
} {
  const valid: Array<{ original: string; cleaned: string; countryCode: string }> = [];
  const invalid: Array<{ original: string; error: string }> = [];
  
  vatNumbers.forEach(vat => {
    const result = validateEuVat(vat);
    if (result.isValid && result.cleanedNumber && result.countryCode) {
      valid.push({
        original: vat,
        cleaned: result.cleanedNumber,
        countryCode: result.countryCode
      });
    } else {
      invalid.push({
        original: vat,
        error: result.error || 'Unbekannter Fehler'
      });
    }
  });
  
  return { valid, invalid };
}

/**
 * Business Identifier Validators for SKAMP
 * Part 2: International Business Identifiers
 */

/**
 * US Employer Identification Number (EIN) Validierung
 */
export function validateUsEin(ein: string): {
  isValid: boolean;
  cleaned?: string;
  error?: string;
} {
  if (!ein) return { isValid: false, error: 'EIN fehlt' };
  
  // Normalisierung
  const cleaned = ein.replace(/[\s\-]/g, '');
  
  // Format: XX-XXXXXXX oder XXXXXXXXX
  const einRegex = /^\d{9}$/;
  if (!einRegex.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'EIN muss 9 Ziffern enthalten (Format: XX-XXXXXXX)' 
    };
  }
  
  // Prefix-Validierung (erste 2 Ziffern)
  const prefix = parseInt(cleaned.substring(0, 2));
  const validPrefixes = [
    ...Array.from({length: 21}, (_, i) => i + 1), // 01-21
    ...Array.from({length: 10}, (_, i) => i + 30), // 30-39
    ...Array.from({length: 10}, (_, i) => i + 40), // 40-49
    ...Array.from({length: 10}, (_, i) => i + 50), // 50-59
    ...Array.from({length: 10}, (_, i) => i + 60), // 60-69
    ...Array.from({length: 10}, (_, i) => i + 70), // 70-79
    ...Array.from({length: 8}, (_, i) => i + 80), // 80-87
    ...Array.from({length: 5}, (_, i) => i + 90), // 90-94
    ...Array.from({length: 4}, (_, i) => i + 95)  // 95-98
  ];
  
  if (!validPrefixes.includes(prefix)) {
    return { 
      isValid: false, 
      error: `Ungültiger EIN-Prefix: ${prefix}` 
    };
  }
  
  return { 
    isValid: true, 
    cleaned: `${cleaned.substring(0, 2)}-${cleaned.substring(2)}` 
  };
}

/**
 * Schweizer UID (Unternehmens-Identifikationsnummer) Validierung
 */
export function validateChUid(uid: string): {
  isValid: boolean;
  cleaned?: string;
  error?: string;
} {
  if (!uid) return { isValid: false, error: 'UID fehlt' };
  
  // Normalisierung
  const cleaned = uid.toUpperCase().replace(/[\s\-\.]/g, '');
  
  // Format: CHE-123.456.789 oder CHE123456789
  const uidRegex = /^CHE\d{9}$/;
  if (!uidRegex.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'UID muss Format CHE-XXX.XXX.XXX haben' 
    };
  }
  
  // Prüfziffer-Validierung
  const numbers = cleaned.substring(3).split('').map(Number);
  const weights = [5, 4, 3, 2, 7, 6, 5, 4];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    sum += numbers[i] * weights[i];
  }
  
  const checkDigit = (11 - (sum % 11)) % 11;
  if (checkDigit === 10 || checkDigit !== numbers[8]) {
    return { 
      isValid: false, 
      error: 'Prüfziffer ungültig' 
    };
  }
  
  const formatted = `CHE-${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}.${cleaned.substring(9)}`;
  return { isValid: true, cleaned: formatted };
}

/**
 * Deutsche Handelsregisternummer Validierung
 */
export function validateDeHandelsregister(hrNumber: string): {
  isValid: boolean;
  cleaned?: string;
  court?: string;
  error?: string;
} {
  if (!hrNumber) return { isValid: false, error: 'HR-Nummer fehlt' };
  
  // Normalisierung
  const cleaned = hrNumber.trim().toUpperCase();
  
  // Format: HRA/HRB 12345 oder HRA/HRB 12345 Amtsgericht
  const hrRegex = /^(HRA|HRB)\s+(\d{1,6})(?:\s+(.+))?$/;
  const match = cleaned.match(hrRegex);
  
  if (!match) {
    return { 
      isValid: false, 
      error: 'Format muss sein: HRA/HRB [Nummer] [optional: Gericht]' 
    };
  }
  
  const [, registerType, number, court] = match;
  
  return { 
    isValid: true, 
    cleaned: `${registerType} ${number}`,
    court: court || undefined
  };
}

/**
 * UK Companies House Number Validierung
 */
export function validateUkCompanyNumber(number: string): {
  isValid: boolean;
  cleaned?: string;
  type?: string;
  error?: string;
} {
  if (!number) return { isValid: false, error: 'Company Number fehlt' };
  
  const cleaned = number.toUpperCase().replace(/[\s\-]/g, '');
  
  // Verschiedene Formate
  const patterns = [
    { regex: /^\d{8}$/, type: 'Limited Company' },
    { regex: /^SC\d{6}$/, type: 'Scottish Company' },
    { regex: /^NI\d{6}$/, type: 'Northern Ireland Company' },
    { regex: /^OC\d{6}$/, type: 'LLP' },
    { regex: /^SO\d{6}$/, type: 'Scottish LLP' },
    { regex: /^NC\d{6}$/, type: 'Northern Ireland LLP' },
    { regex: /^R\d{7}$/, type: 'Registered Society' },
    { regex: /^IP\d{6}[A-Z]$/, type: 'Industrial & Provident' }
  ];
  
  for (const { regex, type } of patterns) {
    if (regex.test(cleaned)) {
      return { isValid: true, cleaned, type };
    }
  }
  
  return { 
    isValid: false, 
    error: 'Ungültiges UK Company Number Format' 
  };
}

/**
 * Kanadische Business Number (BN) Validierung
 */
export function validateCaBn(bn: string): {
  isValid: boolean;
  cleaned?: string;
  error?: string;
} {
  if (!bn) return { isValid: false, error: 'BN fehlt' };
  
  const cleaned = bn.replace(/[\s\-]/g, '');
  
  // Format: 123456789RC0001 (9 Ziffern + 2 Buchstaben + 4 Ziffern)
  const bnRegex = /^(\d{9})([A-Z]{2})(\d{4})$/;
  const match = cleaned.match(bnRegex);
  
  if (!match) {
    return { 
      isValid: false, 
      error: 'BN muss Format haben: 123456789RC0001' 
    };
  }
  
  const [, businessNumber, programId, reference] = match;
  
  // Validiere Programm-ID
  const validPrograms = ['RC', 'RM', 'RP', 'RT'];
  if (!validPrograms.includes(programId)) {
    return { 
      isValid: false, 
      error: `Ungültige Programm-ID: ${programId}` 
    };
  }
  
  return { 
    isValid: true, 
    cleaned: `${businessNumber} ${programId} ${reference}` 
  };
}

/**
 * Australische Business Number (ABN) Validierung
 */
export function validateAuAbn(abn: string): {
  isValid: boolean;
  cleaned?: string;
  error?: string;
} {
  if (!abn) return { isValid: false, error: 'ABN fehlt' };
  
  const cleaned = abn.replace(/[\s\-]/g, '');
  
  if (!/^\d{11}$/.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'ABN muss 11 Ziffern enthalten' 
    };
  }
  
  // ABN Checksummen-Validierung
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = cleaned.split('').map(Number);
  
  // Erste Ziffer minus 1
  digits[0] -= 1;
  
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * weights[i];
  }
  
  if (sum % 89 !== 0) {
    return { 
      isValid: false, 
      error: 'Prüfziffer ungültig' 
    };
  }
  
  // Formatierung: XX XXX XXX XXX
  const formatted = cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  return { isValid: true, cleaned: formatted };
}

/**
 * Französische SIRET Nummer Validierung
 */
export function validateFrSiret(siret: string): {
  isValid: boolean;
  cleaned?: string;
  siren?: string;
  establishment?: string;
  error?: string;
} {
  if (!siret) return { isValid: false, error: 'SIRET fehlt' };
  
  const cleaned = siret.replace(/[\s\-]/g, '');
  
  if (!/^\d{14}$/.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'SIRET muss 14 Ziffern enthalten' 
    };
  }
  
  // SIRET = SIREN (9 Ziffern) + NIC (5 Ziffern)
  const siren = cleaned.substring(0, 9);
  const nic = cleaned.substring(9);
  
  // Luhn-Algorithmus für SIRET
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  if (sum % 10 !== 0) {
    return { 
      isValid: false, 
      error: 'Prüfziffer ungültig' 
    };
  }
  
  const formatted = `${siren.substring(0, 3)} ${siren.substring(3, 6)} ${siren.substring(6)} ${nic}`;
  return { 
    isValid: true, 
    cleaned: formatted,
    siren,
    establishment: nic
  };
}

/**
 * Allgemeine Funktion zur Identifikation und Validierung
 */
export function identifyAndValidateBusinessId(identifier: string): {
  type: string | null;
  isValid: boolean;
  result: any;
} {
  const cleanId = identifier.trim().toUpperCase();
  
  // EU VAT
  if (/^[A-Z]{2}/.test(cleanId)) {
    const countryCode = cleanId.substring(0, 2);
    if (EU_VAT_PATTERNS[countryCode]) {
      return {
        type: 'EU_VAT',
        isValid: validateEuVat(identifier).isValid,
        result: validateEuVat(identifier)
      };
    }
  }
  
  // US EIN
  if (/^\d{2}-?\d{7}$/.test(cleanId.replace(/[\s]/g, ''))) {
    return {
      type: 'US_EIN',
      isValid: validateUsEin(identifier).isValid,
      result: validateUsEin(identifier)
    };
  }
  
  // Swiss UID
  if (cleanId.startsWith('CHE')) {
    return {
      type: 'CH_UID',
      isValid: validateChUid(identifier).isValid,
      result: validateChUid(identifier)
    };
  }
  
  // German Handelsregister
  if (cleanId.startsWith('HRA') || cleanId.startsWith('HRB')) {
    return {
      type: 'DE_HR',
      isValid: validateDeHandelsregister(identifier).isValid,
      result: validateDeHandelsregister(identifier)
    };
  }
  
  // Weitere Identifikationen...
  
  return {
    type: null,
    isValid: false,
    result: { error: 'Unbekannter Identifikationstyp' }
  };
}

/**
 * Business Identifier Validators for SKAMP
 * Part 3: Helper Functions and Utilities
 */

// Import von Teil 1 (EU VAT patterns für die Referenz)

/**
 * Zentrale Validierungsfunktion für alle Business IDs
 */
export interface BusinessIdValidationResult {
  isValid: boolean;
  type: BusinessIdType;
  country?: string;
  formatted?: string;
  details?: Record<string, any>;
  error?: string;
}

export type BusinessIdType = 
  | 'EU_VAT'
  | 'US_EIN'
  | 'CH_UID'
  | 'DE_HR'
  | 'UK_COMPANY'
  | 'CA_BN'
  | 'AU_ABN'
  | 'FR_SIRET'
  | 'UNKNOWN';

/**
 * Validiert eine Business ID beliebigen Typs
 */
export function validateBusinessIdentifier(
  identifier: string,
  expectedType?: BusinessIdType,
  countryHint?: string
): BusinessIdValidationResult {
  if (!identifier) {
    return {
      isValid: false,
      type: 'UNKNOWN',
      error: 'Identifikationsnummer fehlt'
    };
  }

  // Wenn Typ angegeben, direkt validieren
  if (expectedType) {
    return validateSpecificType(identifier, expectedType);
  }

  // Automatische Erkennung basierend auf Land-Hinweis
  if (countryHint) {
    const typeForCountry = getBusinessIdTypeForCountry(countryHint);
    if (typeForCountry) {
      return validateSpecificType(identifier, typeForCountry);
    }
  }

  // Automatische Erkennung basierend auf Format
  return autoDetectAndValidate(identifier);
}

/**
 * Validiert einen spezifischen ID-Typ
 */
function validateSpecificType(
  identifier: string, 
  type: BusinessIdType
): BusinessIdValidationResult {
  switch (type) {
    case 'EU_VAT': {
      const result = validateEuVat(identifier);
      return {
        isValid: result.isValid,
        type: 'EU_VAT',
        country: result.countryCode,
        formatted: result.cleanedNumber,
        error: result.error
      };
    }
    
    case 'US_EIN': {
      const result = validateUsEin(identifier);
      return {
        isValid: result.isValid,
        type: 'US_EIN',
        country: 'US',
        formatted: result.cleaned,
        error: result.error
      };
    }
    
    case 'CH_UID': {
      const result = validateChUid(identifier);
      return {
        isValid: result.isValid,
        type: 'CH_UID',
        country: 'CH',
        formatted: result.cleaned,
        error: result.error
      };
    }
    
    case 'DE_HR': {
      const result = validateDeHandelsregister(identifier);
      return {
        isValid: result.isValid,
        type: 'DE_HR',
        country: 'DE',
        formatted: result.cleaned,
        details: { court: result.court },
        error: result.error
      };
    }
    
    case 'UK_COMPANY': {
      const result = validateUkCompanyNumber(identifier);
      return {
        isValid: result.isValid,
        type: 'UK_COMPANY',
        country: 'GB',
        formatted: result.cleaned,
        details: { companyType: result.type },
        error: result.error
      };
    }
    
    case 'CA_BN': {
      const result = validateCaBn(identifier);
      return {
        isValid: result.isValid,
        type: 'CA_BN',
        country: 'CA',
        formatted: result.cleaned,
        error: result.error
      };
    }
    
    case 'AU_ABN': {
      const result = validateAuAbn(identifier);
      return {
        isValid: result.isValid,
        type: 'AU_ABN',
        country: 'AU',
        formatted: result.cleaned,
        error: result.error
      };
    }
    
    case 'FR_SIRET': {
      const result = validateFrSiret(identifier);
      return {
        isValid: result.isValid,
        type: 'FR_SIRET',
        country: 'FR',
        formatted: result.cleaned,
        details: { 
          siren: result.siren, 
          establishment: result.establishment 
        },
        error: result.error
      };
    }
    
    default:
      return {
        isValid: false,
        type: 'UNKNOWN',
        error: 'Unbekannter Identifikationstyp'
      };
  }
}

/**
 * Automatische Erkennung und Validierung
 */
function autoDetectAndValidate(identifier: string): BusinessIdValidationResult {
  const result = identifyAndValidateBusinessId(identifier);
  
  if (result.type) {
    return {
      isValid: result.isValid,
      type: result.type as BusinessIdType,
      ...result.result
    };
  }
  
  return {
    isValid: false,
    type: 'UNKNOWN',
    error: 'Identifikationstyp konnte nicht erkannt werden'
  };
}

/**
 * Gibt den primären Business ID Typ für ein Land zurück
 */
export function getBusinessIdTypeForCountry(countryCode: string): BusinessIdType | null {
  const countryMap: Record<string, BusinessIdType> = {
    // EU-Länder
    'DE': 'EU_VAT',
    'AT': 'EU_VAT',
    'FR': 'EU_VAT',
    'IT': 'EU_VAT',
    'ES': 'EU_VAT',
    'NL': 'EU_VAT',
    'BE': 'EU_VAT',
    'PL': 'EU_VAT',
    // ... weitere EU-Länder
    
    // Nicht-EU
    'US': 'US_EIN',
    'CH': 'CH_UID',
    'GB': 'UK_COMPANY',
    'CA': 'CA_BN',
    'AU': 'AU_ABN'
  };
  
  return countryMap[countryCode.toUpperCase()] || null;
}

/**
 * Gibt alle möglichen Business ID Typen für ein Land zurück
 */
export function getAllBusinessIdTypesForCountry(countryCode: string): Array<{
  type: BusinessIdType;
  name: string;
  isPrimary: boolean;
}> {
  const country = countryCode.toUpperCase();
  const types: Array<{ type: BusinessIdType; name: string; isPrimary: boolean }> = [];
  
  switch (country) {
    case 'DE':
      types.push(
        { type: 'EU_VAT', name: 'USt-IdNr.', isPrimary: true },
        { type: 'DE_HR', name: 'Handelsregisternummer', isPrimary: false }
      );
      break;
      
    case 'FR':
      types.push(
        { type: 'EU_VAT', name: 'N° TVA', isPrimary: true },
        { type: 'FR_SIRET', name: 'SIRET', isPrimary: false }
      );
      break;
      
    case 'GB':
      types.push(
        { type: 'UK_COMPANY', name: 'Company Number', isPrimary: true }
      );
      break;
      
    // Weitere Länder...
  }
  
  return types;
}

/**
 * Formatiert eine Business ID für die Anzeige
 */
export function formatBusinessId(
  identifier: string,
  type?: BusinessIdType
): string {
  const validation = validateBusinessIdentifier(identifier, type);
  return validation.formatted || identifier;
}

/**
 * Batch-Validierung mehrerer Business IDs
 */
export interface BatchValidationResult {
  valid: Array<{
    original: string;
    type: BusinessIdType;
    country: string;
    formatted: string;
  }>;
  invalid: Array<{
    original: string;
    error: string;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    byType: Record<BusinessIdType, number>;
    byCountry: Record<string, number>;
  };
}

export function validateMultipleBusinessIds(
  identifiers: Array<{ id: string; type?: BusinessIdType; country?: string }>
): BatchValidationResult {
  const valid: BatchValidationResult['valid'] = [];
  const invalid: BatchValidationResult['invalid'] = [];
  const byType: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  
  identifiers.forEach(({ id, type, country }) => {
    const result = validateBusinessIdentifier(id, type, country);
    
    if (result.isValid && result.formatted) {
      valid.push({
        original: id,
        type: result.type,
        country: result.country || 'UNKNOWN',
        formatted: result.formatted
      });
      
      // Statistiken
      byType[result.type] = (byType[result.type] || 0) + 1;
      if (result.country) {
        byCountry[result.country] = (byCountry[result.country] || 0) + 1;
      }
    } else {
      invalid.push({
        original: id,
        error: result.error || 'Validierung fehlgeschlagen'
      });
    }
  });
  
  return {
    valid,
    invalid,
    summary: {
      total: identifiers.length,
      valid: valid.length,
      invalid: invalid.length,
      byType: byType as Record<BusinessIdType, number>,
      byCountry
    }
  };
}

/**
 * Generiert Beispiel-IDs für Tests oder Dokumentation
 */
export function getExampleBusinessId(type: BusinessIdType): string {
  const examples: Record<BusinessIdType, string> = {
    'EU_VAT': 'DE123456789',
    'US_EIN': '12-3456789',
    'CH_UID': 'CHE-123.456.789',
    'DE_HR': 'HRB 12345',
    'UK_COMPANY': '12345678',
    'CA_BN': '123456789RC0001',
    'AU_ABN': '12 345 678 901',
    'FR_SIRET': '123 456 789 12345',
    'UNKNOWN': ''
  };
  
  return examples[type] || '';
}

/**
 * Hilfsfunktion für UI-Komponenten
 */
export function getBusinessIdInputHelp(type: BusinessIdType): {
  label: string;
  placeholder: string;
  pattern?: string;
  maxLength?: number;
  help: string;
} {
  const helpers: Record<BusinessIdType, any> = {
  'EU_VAT': {
    label: 'USt-IdNr.',
    placeholder: 'DE123456789',
    pattern: '^[A-Z]{2}.*',
    help: 'Beginnt mit 2-stelligem Ländercode'
  },
  'US_EIN': {
    label: 'EIN',
    placeholder: '12-3456789',
    pattern: '^\\d{2}-?\\d{7}$',
    maxLength: 10,
    help: 'Format: XX-XXXXXXX'
  },
  'CH_UID': {
    label: 'UID',
    placeholder: 'CHE-123.456.789',
    pattern: '^CHE.*',
    help: 'Format: CHE-XXX.XXX.XXX'
  },
  'DE_HR': {
    label: 'Handelsregisternr.',
    placeholder: 'HRB 12345 München',
    help: 'HRA/HRB + Nummer + optional Gericht'
  },
  // DIESE FEHLENDEN HINZUFÜGEN:
  'UK_COMPANY': {
    label: 'Company Number',
    placeholder: '12345678',
    help: 'UK Companies House Number'
  },
  'CA_BN': {
    label: 'Business Number',
    placeholder: '123456789RC0001',
    help: 'Format: 9 Ziffern + Programm-ID + 4 Ziffern'
  },
  'AU_ABN': {
    label: 'ABN',
    placeholder: '12 345 678 901',
    help: '11-stellige Australian Business Number'
  },
  'FR_SIRET': {
    label: 'SIRET',
    placeholder: '123 456 789 12345',
    help: '14-stellige SIRET Nummer'
  },
  'UNKNOWN': {
    label: 'Business ID',
    placeholder: '',
    help: 'Geschäftsidentifikationsnummer'
  }
  };
  
  return helpers[type] || {
    label: 'Business ID',
    placeholder: '',
    help: 'Geschäftsidentifikationsnummer'
  };
}
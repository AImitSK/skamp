/**
 * SPF Record Validator
 * Validiert SPF Syntax und testet verschiedene Varianten
 */

interface SPFValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lookups: number;
  recommendations: string[];
}

function validateSPF(spf: string): SPFValidation {
  const result: SPFValidation = {
    valid: true,
    errors: [],
    warnings: [],
    lookups: 0,
    recommendations: [],
  };

  // 1. Muss mit v=spf1 starten
  if (!spf.trim().startsWith('v=spf1')) {
    result.valid = false;
    result.errors.push('SPF muss mit "v=spf1" beginnen');
    return result;
  }

  // 2. Darf keine Anführungszeichen enthalten (häufigster Fehler!)
  if (spf.includes('"')) {
    result.errors.push('SPF darf KEINE Anführungszeichen enthalten!');
    result.valid = false;
  }

  // 3. Zähle DNS Lookups (max. 10 erlaubt)
  const includeCount = (spf.match(/include:/g) || []).length;
  const aCount = (spf.match(/\ba\b/g) || []).length;
  const mxCount = (spf.match(/\bmx\b/g) || []).length;
  const ptrCount = (spf.match(/\bptr\b/g) || []).length;
  const existsCount = (spf.match(/exists:/g) || []).length;

  result.lookups = includeCount + aCount + mxCount + ptrCount + existsCount;

  if (result.lookups > 10) {
    result.errors.push(`Zu viele DNS Lookups: ${result.lookups} (Max: 10)`);
    result.valid = false;
  } else if (result.lookups > 8) {
    result.warnings.push(`Viele DNS Lookups: ${result.lookups}/10 - Vorsicht bei weiteren includes`);
  }

  // 4. Muss mit all enden
  if (!spf.match(/[~\-?+]all$/)) {
    result.errors.push('SPF muss mit ~all, -all, ?all oder +all enden');
    result.valid = false;
  }

  // 5. Prüfe auf gültige Mechanismen
  const mechanisms = spf.split(' ').filter(m => m && m !== 'v=spf1');
  const validMechanisms = /^(include:|a|mx|ip4:|ip6:|exists:|ptr|~all|-all|\?all|\+all)/;

  for (const mech of mechanisms) {
    if (!validMechanisms.test(mech)) {
      result.warnings.push(`Unbekannter Mechanismus: "${mech}"`);
    }
  }

  // 6. Längencheck (max 255 Zeichen pro String, max 512 Bytes total in DNS)
  if (spf.length > 255) {
    result.errors.push(`SPF zu lang: ${spf.length} Zeichen (Max: 255)`);
    result.valid = false;
  }

  // 7. Empfehlungen
  if (spf.includes('+all')) {
    result.warnings.push('"+all" erlaubt JEDEM zu senden - NICHT EMPFOHLEN!');
  }
  if (spf.includes('?all')) {
    result.warnings.push('"?all" ist neutral - besser: ~all oder -all');
  }
  if (!spf.includes('include:sendgrid.net')) {
    result.recommendations.push('SendGrid fehlt - füge "include:sendgrid.net" hinzu');
  }

  return result;
}

function printValidation(spf: string, validation: SPFValidation) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 SPF VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📝 SPF Record:');
  console.log(`   ${spf}\n`);

  // Status
  if (validation.valid) {
    console.log('✅ STATUS: GÜLTIG\n');
  } else {
    console.log('❌ STATUS: UNGÜLTIG\n');
  }

  // Errors
  if (validation.errors.length > 0) {
    console.log('❌ FEHLER:');
    validation.errors.forEach(err => console.log(`   • ${err}`));
    console.log();
  }

  // Warnings
  if (validation.warnings.length > 0) {
    console.log('⚠️  WARNUNGEN:');
    validation.warnings.forEach(warn => console.log(`   • ${warn}`));
    console.log();
  }

  // Stats
  console.log('📊 STATISTIK:');
  console.log(`   DNS Lookups: ${validation.lookups}/10`);
  console.log(`   Länge: ${spf.length}/255 Zeichen\n`);

  // Recommendations
  if (validation.recommendations.length > 0) {
    console.log('💡 EMPFEHLUNGEN:');
    validation.recommendations.forEach(rec => console.log(`   • ${rec}`));
    console.log();
  }
}

// Test verschiedene Varianten
console.log('🧪 TESTE VERSCHIEDENE SPF VARIANTEN\n');

const variants = [
  {
    name: 'FALSCH: Mit Anführungszeichen',
    spf: '"v=spf1 include:spf.protection.outlook.com include:sendgrid.net -all"',
  },
  {
    name: 'FALSCH: Leerzeichen am Anfang',
    spf: ' v=spf1 include:spf.protection.outlook.com include:sendgrid.net -all',
  },
  {
    name: 'KORREKT: Outlook + SendGrid',
    spf: 'v=spf1 include:spf.protection.outlook.com include:sendgrid.net -all',
  },
  {
    name: 'KORREKT: Nur SendGrid (falls kein Outlook)',
    spf: 'v=spf1 include:sendgrid.net -all',
  },
  {
    name: 'ALTERNATIVE: Mit ~all statt -all (Soft Fail)',
    spf: 'v=spf1 include:spf.protection.outlook.com include:sendgrid.net ~all',
  },
];

variants.forEach((variant, index) => {
  console.log(`\n${'─'.repeat(63)}`);
  console.log(`TEST ${index + 1}: ${variant.name}`);
  console.log('─'.repeat(63));

  const validation = validateSPF(variant.spf);
  printValidation(variant.spf, validation);
});

// Gebe korrekten SPF für Copy/Paste aus
console.log('\n═══════════════════════════════════════════════════════════');
console.log('✂️  KOPIEREN FÜR DNS:');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Host/Name: @ oder sk-online-marketing.de');
console.log('Type: TXT');
console.log('Value (OHNE Anführungszeichen!):');
console.log('\nv=spf1 include:spf.protection.outlook.com include:sendgrid.net -all\n');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('⚠️  WICHTIGE HINWEISE:');
console.log('   1. KEINE Anführungszeichen im DNS-Panel eingeben!');
console.log('   2. KEINE Leerzeichen vor "v=spf1"');
console.log('   3. Bei manchen Providern: TXT Record, nicht SPF Record Type');
console.log('   4. Warte 5-10 Minuten nach dem Speichern');
console.log('   5. Teste mit: npx tsx scripts/check-email-dns.ts sk-online-marketing.de\n');

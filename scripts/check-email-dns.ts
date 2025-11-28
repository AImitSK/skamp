/**
 * DNS Email Authentication Checker
 * Prüft SPF, DKIM und DMARC Records für Email-Domains
 *
 * Usage: npx tsx scripts/check-email-dns.ts <domain>
 * Example: npx tsx scripts/check-email-dns.ts sk-online-marketing.de
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

interface DnsCheckResult {
  domain: string;
  spf: {
    exists: boolean;
    record?: string;
    includesSendGrid: boolean;
    valid: boolean;
    errors: string[];
  };
  dmarc: {
    exists: boolean;
    record?: string;
    policy?: string;
    valid: boolean;
    errors: string[];
  };
  dkim: {
    checked: string[];
    valid: string[];
    invalid: string[];
  };
  mx: {
    exists: boolean;
    records: string[];
  };
  score: number; // 0-100
  recommendations: string[];
}

async function checkSPF(domain: string): Promise<DnsCheckResult['spf']> {
  const result = {
    exists: false,
    includesSendGrid: false,
    valid: false,
    errors: [] as string[],
  };

  try {
    const records = await resolveTxt(domain);
    const spfRecord = records.find((r) =>
      r.join('').startsWith('v=spf1')
    );

    if (spfRecord) {
      result.exists = true;
      result.record = spfRecord.join('');

      // Prüfe ob SendGrid inkludiert ist
      result.includesSendGrid = result.record.includes('sendgrid.net');

      // Basis-Validierung
      if (result.record.includes('~all') || result.record.includes('-all')) {
        result.valid = true;
      } else {
        result.errors.push('SPF sollte mit ~all oder -all enden');
      }

      if (!result.includesSendGrid) {
        result.errors.push('SendGrid ist nicht in SPF inkludiert (include:sendgrid.net fehlt)');
      }
    } else {
      result.errors.push('Kein SPF Record gefunden');
    }
  } catch (error) {
    result.errors.push(`SPF Lookup fehlgeschlagen: ${error}`);
  }

  return result;
}

async function checkDMARC(domain: string): Promise<DnsCheckResult['dmarc']> {
  const result = {
    exists: false,
    valid: false,
    errors: [] as string[],
  };

  try {
    const dmarcDomain = `_dmarc.${domain}`;
    const records = await resolveTxt(dmarcDomain);
    const dmarcRecord = records.find((r) =>
      r.join('').startsWith('v=DMARC1')
    );

    if (dmarcRecord) {
      result.exists = true;
      result.record = dmarcRecord.join('');

      // Extrahiere Policy
      const policyMatch = result.record.match(/p=(none|quarantine|reject)/);
      if (policyMatch) {
        result.policy = policyMatch[1];
        result.valid = true;
      } else {
        result.errors.push('Keine gültige DMARC Policy gefunden');
      }

      // Empfehlungen basierend auf Policy
      if (result.policy === 'none') {
        result.errors.push('DMARC Policy "none" ist zu schwach. Empfehlung: quarantine oder reject');
      }
    } else {
      result.errors.push('Kein DMARC Record gefunden');
    }
  } catch (error) {
    result.errors.push(`DMARC Lookup fehlgeschlagen: ${error}`);
  }

  return result;
}

async function checkDKIM(domain: string): Promise<DnsCheckResult['dkim']> {
  const result = {
    checked: [] as string[],
    valid: [] as string[],
    invalid: [] as string[],
  };

  // Standard DKIM Selektoren die SendGrid verwendet
  const selectors = [
    's1._domainkey',
    's2._domainkey',
    'em1._domainkey', // SendGrid
    'em2._domainkey', // SendGrid
  ];

  for (const selector of selectors) {
    const dkimDomain = `${selector}.${domain}`;
    result.checked.push(selector);

    try {
      const records = await resolveTxt(dkimDomain);
      if (records.length > 0) {
        const dkimRecord = records.join('');
        if (dkimRecord.includes('v=DKIM1') || dkimRecord.includes('k=rsa')) {
          result.valid.push(selector);
        } else {
          result.invalid.push(selector);
        }
      }
    } catch (error) {
      // Kein Record gefunden - das ist normal für nicht genutzte Selektoren
    }
  }

  return result;
}

async function checkMX(domain: string): Promise<DnsCheckResult['mx']> {
  const result = {
    exists: false,
    records: [] as string[],
  };

  try {
    const records = await resolveMx(domain);
    if (records && records.length > 0) {
      result.exists = true;
      result.records = records
        .sort((a, b) => a.priority - b.priority)
        .map((r) => `${r.exchange} (Priority: ${r.priority})`);
    }
  } catch (error) {
    console.error(`MX Lookup fehlgeschlagen: ${error}`);
  }

  return result;
}

function calculateScore(result: DnsCheckResult): number {
  let score = 0;

  // SPF (30 Punkte)
  if (result.spf.exists) score += 10;
  if (result.spf.valid) score += 10;
  if (result.spf.includesSendGrid) score += 10;

  // DMARC (30 Punkte)
  if (result.dmarc.exists) score += 15;
  if (result.dmarc.valid) score += 10;
  if (result.dmarc.policy !== 'none') score += 5;

  // DKIM (30 Punkte)
  if (result.dkim.valid.length >= 1) score += 15;
  if (result.dkim.valid.length >= 2) score += 15;

  // MX (10 Punkte)
  if (result.mx.exists) score += 10;

  return score;
}

function generateRecommendations(result: DnsCheckResult): string[] {
  const recommendations: string[] = [];

  if (!result.spf.exists) {
    recommendations.push('❌ KRITISCH: SPF Record fehlt! Füge hinzu: v=spf1 include:sendgrid.net ~all');
  } else if (!result.spf.includesSendGrid) {
    recommendations.push('⚠️  WICHTIG: SendGrid in SPF inkludieren: include:sendgrid.net');
  }

  if (!result.dmarc.exists) {
    recommendations.push('❌ KRITISCH: DMARC Record fehlt! Füge hinzu: v=DMARC1; p=quarantine; rua=mailto:dmarc@' + result.domain);
  } else if (result.dmarc.policy === 'none') {
    recommendations.push('⚠️  EMPFEHLUNG: DMARC Policy auf "quarantine" oder "reject" erhöhen');
  }

  if (result.dkim.valid.length === 0) {
    recommendations.push('❌ KRITISCH: DKIM Records fehlen! Domain bei SendGrid authentifizieren');
  } else if (result.dkim.valid.length === 1) {
    recommendations.push('⚠️  EMPFEHLUNG: Zweiten DKIM Record hinzufügen für Redundanz');
  }

  if (!result.mx.exists) {
    recommendations.push('❌ KRITISCH: MX Records fehlen! Email-Empfang nicht möglich');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Alle Email-Authentication Checks bestanden!');
  }

  return recommendations;
}

async function checkEmailDNS(domain: string): Promise<DnsCheckResult> {
  console.log(`\n🔍 Prüfe Email-DNS für: ${domain}\n`);

  const [spf, dmarc, dkim, mx] = await Promise.all([
    checkSPF(domain),
    checkDMARC(domain),
    checkDKIM(domain),
    checkMX(domain),
  ]);

  const result: DnsCheckResult = {
    domain,
    spf,
    dmarc,
    dkim,
    mx,
    score: 0,
    recommendations: [],
  };

  result.score = calculateScore(result);
  result.recommendations = generateRecommendations(result);

  return result;
}

function printResults(result: DnsCheckResult) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📧 EMAIL DNS REPORT: ${result.domain}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Score
  const scoreEmoji = result.score >= 80 ? '🟢' : result.score >= 50 ? '🟡' : '🔴';
  console.log(`${scoreEmoji} GESAMTSCORE: ${result.score}/100\n`);

  // SPF
  console.log('📝 SPF (Sender Policy Framework)');
  console.log(`   Status: ${result.spf.exists ? '✅ Vorhanden' : '❌ Fehlt'}`);
  if (result.spf.record) {
    console.log(`   Record: ${result.spf.record}`);
  }
  console.log(`   SendGrid: ${result.spf.includesSendGrid ? '✅ Inkludiert' : '❌ Fehlt'}`);
  if (result.spf.errors.length > 0) {
    result.spf.errors.forEach(err => console.log(`   ⚠️  ${err}`));
  }
  console.log();

  // DMARC
  console.log('🔒 DMARC (Domain-based Message Authentication)');
  console.log(`   Status: ${result.dmarc.exists ? '✅ Vorhanden' : '❌ Fehlt'}`);
  if (result.dmarc.record) {
    console.log(`   Record: ${result.dmarc.record}`);
    console.log(`   Policy: ${result.dmarc.policy}`);
  }
  if (result.dmarc.errors.length > 0) {
    result.dmarc.errors.forEach(err => console.log(`   ⚠️  ${err}`));
  }
  console.log();

  // DKIM
  console.log('🔐 DKIM (DomainKeys Identified Mail)');
  console.log(`   Geprüfte Selektoren: ${result.dkim.checked.join(', ')}`);
  console.log(`   Gültige Records: ${result.dkim.valid.length > 0 ? '✅ ' + result.dkim.valid.join(', ') : '❌ Keine'}`);
  if (result.dkim.valid.length === 0) {
    console.log(`   ⚠️  DKIM Records fehlen - Domain bei SendGrid authentifizieren!`);
  }
  console.log();

  // MX
  console.log('📬 MX (Mail Exchange)');
  console.log(`   Status: ${result.mx.exists ? '✅ Vorhanden' : '❌ Fehlt'}`);
  if (result.mx.records.length > 0) {
    result.mx.records.forEach(rec => console.log(`   - ${rec}`));
  }
  console.log();

  // Empfehlungen
  console.log('💡 EMPFEHLUNGEN');
  console.log('═══════════════════════════════════════════════════════════');
  result.recommendations.forEach(rec => console.log(`   ${rec}`));
  console.log();
}

// Main
const domain = process.argv[2];

if (!domain) {
  console.error('❌ Bitte Domain angeben!');
  console.error('Usage: npx tsx scripts/check-email-dns.ts <domain>');
  console.error('Example: npx tsx scripts/check-email-dns.ts sk-online-marketing.de');
  process.exit(1);
}

checkEmailDNS(domain)
  .then(printResults)
  .catch(error => {
    console.error('❌ Fehler beim DNS Check:', error);
    process.exit(1);
  });

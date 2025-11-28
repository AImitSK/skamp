/**
 * Domain SendGrid Readiness Checker
 * Prüft ob eine Domain bereit ist für SendGrid Email-Versand
 *
 * Usage: npx tsx scripts/check-domain-sendgrid-ready.ts <domain>
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

interface DomainReadiness {
  domain: string;
  ready: boolean;
  spfReady: boolean;
  dkimReady: boolean;
  dmarcReady: boolean;
  issues: string[];
  instructions: string[];
}

async function checkDomainReadiness(domain: string): Promise<DomainReadiness> {
  const result: DomainReadiness = {
    domain,
    ready: false,
    spfReady: false,
    dkimReady: false,
    dmarcReady: false,
    issues: [],
    instructions: [],
  };

  // 1. SPF Check
  try {
    const records = await resolveTxt(domain);
    const spfRecord = records.find(r => r.join('').startsWith('v=spf1'));

    if (spfRecord) {
      const spf = spfRecord.join('');
      if (spf.includes('sendgrid.net')) {
        result.spfReady = true;
      } else {
        result.issues.push(`SPF existiert aber SendGrid fehlt`);
        result.instructions.push(`
📝 SPF UPDATE ERFORDERLICH:

   Aktueller SPF: ${spf}

   Ändere zu:
   v=spf1 include:sendgrid.net -all

   ODER falls andere Provider existieren:
   v=spf1 include:existierender-provider.com include:sendgrid.net -all
        `);
      }
    } else {
      result.issues.push('Kein SPF Record gefunden');
      result.instructions.push(`
📝 SPF ERSTELLEN:

   Host: @ oder ${domain}
   Type: TXT
   Value: v=spf1 include:sendgrid.net -all
      `);
    }
  } catch (error) {
    result.issues.push('SPF konnte nicht geprüft werden');
  }

  // 2. DKIM Check (SendGrid Selektoren)
  const dkimSelectors = ['em1._domainkey', 'em2._domainkey', 's1._domainkey', 's2._domainkey'];
  let dkimFound = 0;

  for (const selector of dkimSelectors) {
    try {
      const dkimDomain = `${selector}.${domain}`;
      const records = await resolveTxt(dkimDomain);
      if (records.length > 0) {
        dkimFound++;
      }
    } catch (error) {
      // Kein DKIM Record - normal wenn noch nicht konfiguriert
    }
  }

  if (dkimFound >= 2) {
    result.dkimReady = true;
  } else if (dkimFound > 0) {
    result.issues.push(`Nur ${dkimFound}/2 DKIM Records gefunden`);
  } else {
    result.issues.push('Keine DKIM Records gefunden');
    result.instructions.push(`
🔐 DKIM EINRICHTEN (via SendGrid):

   1. Gehe zu SendGrid Dashboard
   2. Settings → Sender Authentication
   3. Authenticate Your Domain
   4. Domain eingeben: ${domain}
   5. DNS Records kopieren und hinzufügen:

      em1._domainkey.${domain} → CNAME → em1.${domain}.dkim.sendgrid.net
      em2._domainkey.${domain} → CNAME → em2.${domain}.dkim.sendgrid.net
      s1._domainkey.${domain}  → CNAME → s1.${domain}.dkim.sendgrid.net

   6. Warte 5-10 Minuten
   7. Klicke "Verify" in SendGrid
    `);
  }

  // 3. DMARC Check
  try {
    const dmarcDomain = `_dmarc.${domain}`;
    const records = await resolveTxt(dmarcDomain);
    const dmarcRecord = records.find(r => r.join('').startsWith('v=DMARC1'));

    if (dmarcRecord) {
      result.dmarcReady = true;
    } else {
      result.issues.push('Kein DMARC Record gefunden');
      result.instructions.push(`
🔒 DMARC ERSTELLEN:

   Host: _dmarc
   Type: TXT
   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100;
      `);
    }
  } catch (error) {
    result.issues.push('Kein DMARC Record gefunden');
  }

  // Gesamtstatus
  result.ready = result.spfReady && result.dkimReady && result.dmarcReady;

  return result;
}

function printResults(result: DomainReadiness) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`📧 SENDGRID READINESS CHECK: ${result.domain}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Overall Status
  if (result.ready) {
    console.log('✅ DOMAIN IST BEREIT FÜR SENDGRID EMAIL-VERSAND!\n');
  } else {
    console.log('❌ DOMAIN IST NICHT BEREIT - KONFIGURATION ERFORDERLICH\n');
  }

  // Individual Checks
  console.log('📊 STATUS:');
  console.log(`   SPF:   ${result.spfReady ? '✅ Bereit' : '❌ Nicht konfiguriert'}`);
  console.log(`   DKIM:  ${result.dkimReady ? '✅ Bereit' : '❌ Nicht konfiguriert'}`);
  console.log(`   DMARC: ${result.dmarcReady ? '✅ Bereit' : '❌ Nicht konfiguriert'}`);
  console.log();

  // Issues
  if (result.issues.length > 0) {
    console.log('⚠️  PROBLEME:');
    result.issues.forEach(issue => console.log(`   • ${issue}`));
    console.log();
  }

  // Instructions
  if (result.instructions.length > 0) {
    console.log('📋 SETUP-ANLEITUNG:');
    console.log('═══════════════════════════════════════════════════════════');
    result.instructions.forEach(instruction => console.log(instruction));
  }

  // Warning
  if (!result.ready) {
    console.log('\n⚠️  WARNUNG:');
    console.log('   Emails von dieser Domain landen im SPAM bis die Konfiguration');
    console.log('   abgeschlossen ist!');
    console.log('\n   FROM: user@' + result.domain + ' → 🚫 SPAM');
    console.log('   Empfehlung: Erst Setup abschließen, dann Email-Adresse verwenden');
    console.log();
  }
}

// Main
const domain = process.argv[2];

if (!domain) {
  console.error('❌ Bitte Domain angeben!');
  console.error('Usage: npx tsx scripts/check-domain-sendgrid-ready.ts <domain>');
  console.error('Example: npx tsx scripts/check-domain-sendgrid-ready.ts golfnex.de');
  process.exit(1);
}

checkDomainReadiness(domain)
  .then(printResults)
  .catch(error => {
    console.error('❌ Fehler beim Domain-Check:', error);
    process.exit(1);
  });

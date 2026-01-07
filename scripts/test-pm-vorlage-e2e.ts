/**
 * PM-VORLAGE END-TO-END TEST
 *
 * Testet den kompletten Workflow:
 * 1. Fakten-Matrix erstellen
 * 2. PM-Vorlage generieren (Genkit Flow)
 * 3. Parsing validieren
 * 4. SEO-Score prüfen
 * 5. Firestore-Integration testen
 *
 * Aufruf: npx tsx scripts/test-pm-vorlage-e2e.ts
 */

import { generatePMVorlageFlow } from '../src/lib/ai/flows/generate-pm-vorlage';
import { faktenMatrixService } from '../src/lib/firebase/fakten-matrix-service';
import { pmVorlageService } from '../src/lib/firebase/pm-vorlage-service';
import type { FaktenMatrix } from '../src/types/fakten-matrix';
import type { DNAContact } from '../src/lib/ai/prompts/press-release/expert-builder';

// ============================================================================
// TEST-DATEN
// ============================================================================

const TEST_COMPANY_ID = 'test-company-pm-e2e';
const TEST_PROJECT_ID = 'test-project-pm-e2e';
const TEST_COMPANY_NAME = 'TechInnovate GmbH';

const TEST_DNA_SYNTHESE = `
**🎯 TONALITÄT:**
- Modern, klar, verständlich
- Technisch fundiert ohne Buzzwords
- Lösungsorientiert

**📋 KERNBOTSCHAFTEN:**
→ FÜR: ZG1 (B2B Entscheider)
- Wir reduzieren Komplexität in der Automatisierung
- Unsere Lösungen sind praxiserprobt und skalierbar

→ FÜR: ZG2 (Technische Experten)
- Open-Source-First Ansatz
- API-basierte Integration in bestehende Systeme

→ FÜR: ZG3 (Fachmedien)
- Pioniere im Bereich KI-gestützte Prozessoptimierung

**🚫 BLACKLIST:**
- Revolution
- Gamechanger
- disruptiv
- State-of-the-art

**📍 FIRMENSTAMMDATEN:**
Vollständiger Name: TechInnovate GmbH
Sitz: München
Gründungsjahr: 2019
Branche: Industrie-Automation
Mitarbeiter: 85
Website: www.techinnovate.de
`.trim();

const TEST_DNA_CONTACTS: DNAContact[] = [
  {
    id: 'ceo',
    name: 'Dr. Sarah Müller',
    position: 'CEO & Gründerin',
    expertise: 'KI-Systeme, Prozessoptimierung',
    email: 'sarah.mueller@techinnovate.de',
  },
  {
    id: 'cto',
    name: 'Thomas Weber',
    position: 'CTO',
    expertise: 'Softwarearchitektur, API-Design',
    email: 'thomas.weber@techinnovate.de',
  },
];

const TEST_FAKTEN_MATRIX: FaktenMatrix = {
  hook: {
    event: 'TechInnovate GmbH launcht KI-gestützte Automatisierungs-Plattform "AutoFlow"',
    location: 'München',
    date: '15. März 2024',
  },
  details: {
    delta: 'Erstmals können mittelständische Fertigungsbetriebe KI-Workflows ohne Programmierkenntnisse erstellen. Reduktion der Implementierungszeit von 6 Wochen auf 2 Tage.',
    evidence: 'Pilotprojekt bei 12 Unternehmen: Durchschnittliche Zeitersparnis 67%, Fehlerquote gesunken um 89%. API-Schnittstellen zu 150+ Industriestandards.',
  },
  quote: {
    speakerId: 'ceo',
    rawStatement: 'Automatisierung muss einfach sein. Mit AutoFlow geben wir KMUs die gleichen Werkzeuge an die Hand wie Großkonzernen – ohne Hürden.',
  },
};

// ============================================================================
// TEST-FUNKTIONEN
// ============================================================================

/**
 * Test 1: Fakten-Matrix Service
 */
async function testFaktenMatrixService() {
  console.log('\n🧪 Test 1: Fakten-Matrix Service');
  console.log('═════════════════════════════════════════════════════════════════════');

  try {
    // Save
    console.log('📝 Speichere Fakten-Matrix...');
    await faktenMatrixService.save(TEST_PROJECT_ID, TEST_FAKTEN_MATRIX);
    console.log('✅ Speichern erfolgreich');

    // Get
    console.log('📖 Lade Fakten-Matrix...');
    const loaded = await faktenMatrixService.get(TEST_PROJECT_ID);
    if (!loaded) {
      throw new Error('Fakten-Matrix nicht gefunden');
    }
    console.log('✅ Laden erfolgreich');

    // Hash
    console.log('🔐 Berechne Hash...');
    const withHash = await faktenMatrixService.getWithHash(TEST_PROJECT_ID);
    if (!withHash) {
      throw new Error('Hash-Berechnung fehlgeschlagen');
    }
    console.log(`✅ Hash: ${withHash.hash}`);

    // Validate Structure
    console.log('🔍 Validiere Struktur...');
    if (!loaded.hook || !loaded.details || !loaded.quote) {
      throw new Error('Struktur unvollständig');
    }
    console.log('✅ Struktur valide');

    console.log('\n✅ Test 1 BESTANDEN');
    return true;
  } catch (error) {
    console.error('❌ Test 1 FEHLGESCHLAGEN:', error);
    return false;
  }
}

/**
 * Test 2: PM-Vorlage Flow Generierung
 */
async function testPMVorlageFlow() {
  console.log('\n🧪 Test 2: PM-Vorlage Flow Generierung');
  console.log('═════════════════════════════════════════════════════════════════════');

  try {
    console.log('🤖 Rufe Genkit Flow auf...');

    const result = await generatePMVorlageFlow({
      projectId: TEST_PROJECT_ID,
      companyId: TEST_COMPANY_ID,
      companyName: TEST_COMPANY_NAME,
      language: 'de',
      dnaSynthese: TEST_DNA_SYNTHESE,
      faktenMatrix: TEST_FAKTEN_MATRIX,
      dnaContacts: TEST_DNA_CONTACTS,
      targetGroup: 'ZG1',
    });

    console.log('✅ Flow abgeschlossen');

    // Ausgabe-Validierung
    console.log('\n📋 Generierte PM-Vorlage:');
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log('Headline:', result.headline);
    console.log('Lead:', result.leadParagraph.substring(0, 100) + '...');
    console.log('Body Paragraphs:', result.bodyParagraphs.length);
    console.log('Quote:', result.quote.text.substring(0, 80) + '...');
    console.log('CTA:', result.cta.substring(0, 60) + '...');
    console.log('Hashtags:', result.hashtags.join(' '));
    console.log('─────────────────────────────────────────────────────────────────────');

    return { success: true, result };
  } catch (error) {
    console.error('❌ Test 2 FEHLGESCHLAGEN:', error);
    return { success: false, result: null };
  }
}

/**
 * Test 3: Parsing-Validierung
 */
async function testParsingValidation(result: any) {
  console.log('\n🧪 Test 3: Parsing-Validierung');
  console.log('═════════════════════════════════════════════════════════════════════');

  const errors: string[] = [];

  // Headline
  console.log('🔍 Prüfe Headline...');
  if (!result.headline || result.headline.length < 10) {
    errors.push('Headline zu kurz oder fehlend');
  }
  if (result.headline.length > 75) {
    errors.push(`Headline zu lang (${result.headline.length} Zeichen, max 75)`);
  }
  console.log(`✅ Headline: ${result.headline.length} Zeichen`);

  // Lead
  console.log('🔍 Prüfe Lead...');
  if (!result.leadParagraph || result.leadParagraph.length < 50) {
    errors.push('Lead zu kurz');
  }
  // Lead soll mit Ort, Datum beginnen
  const leadStartsCorrect = result.leadParagraph.toLowerCase().includes(TEST_FAKTEN_MATRIX.hook.location.toLowerCase());
  if (!leadStartsCorrect) {
    errors.push('Lead beginnt nicht mit Ort');
  }
  console.log(`✅ Lead: ${result.leadParagraph.length} Zeichen`);

  // Body
  console.log('🔍 Prüfe Body-Paragraphen...');
  if (!result.bodyParagraphs || result.bodyParagraphs.length < 2) {
    errors.push(`Zu wenige Body-Absätze (${result.bodyParagraphs?.length || 0}, min 2)`);
  }
  if (result.bodyParagraphs && result.bodyParagraphs.length > 4) {
    errors.push(`Zu viele Body-Absätze (${result.bodyParagraphs.length}, max 4)`);
  }
  console.log(`✅ Body: ${result.bodyParagraphs.length} Absätze`);

  // Quote
  console.log('🔍 Prüfe Zitat...');
  if (!result.quote || !result.quote.text) {
    errors.push('Zitat fehlt');
  }
  if (result.quote.person !== TEST_DNA_CONTACTS[0].name) {
    errors.push(`Falscher Zitatgeber (erwartet: ${TEST_DNA_CONTACTS[0].name}, erhalten: ${result.quote.person})`);
  }
  if (!result.quote.role || !result.quote.company) {
    errors.push('Zitat-Attribution unvollständig');
  }
  console.log(`✅ Zitat: "${result.quote.text.substring(0, 60)}..." - ${result.quote.person}`);

  // CTA
  console.log('🔍 Prüfe CTA...');
  if (!result.cta || result.cta.length < 20) {
    errors.push('CTA zu kurz oder fehlend');
  }
  console.log(`✅ CTA: ${result.cta.length} Zeichen`);

  // Hashtags
  console.log('🔍 Prüfe Hashtags...');
  if (!result.hashtags || result.hashtags.length < 2) {
    errors.push(`Zu wenige Hashtags (${result.hashtags?.length || 0}, min 2)`);
  }
  if (result.hashtags && result.hashtags.length > 3) {
    errors.push(`Zu viele Hashtags (${result.hashtags.length}, max 3)`);
  }
  const allStartWithHash = result.hashtags.every((tag: string) => tag.startsWith('#'));
  if (!allStartWithHash) {
    errors.push('Nicht alle Hashtags starten mit #');
  }
  console.log(`✅ Hashtags: ${result.hashtags.length} Tags`);

  // HTML Content
  console.log('🔍 Prüfe HTML-Content...');
  if (!result.htmlContent || result.htmlContent.length < 100) {
    errors.push('HTML-Content fehlt oder zu kurz');
  }
  const hasH1 = result.htmlContent.includes('<h1>');
  const hasBlockquote = result.htmlContent.includes('<blockquote>');
  if (!hasH1 || !hasBlockquote) {
    errors.push('HTML-Struktur unvollständig (fehlende Tags)');
  }
  console.log(`✅ HTML: ${result.htmlContent.length} Zeichen`);

  // Ergebnis
  if (errors.length > 0) {
    console.log('\n❌ Test 3 FEHLGESCHLAGEN:');
    errors.forEach(err => console.log(`  - ${err}`));
    return false;
  } else {
    console.log('\n✅ Test 3 BESTANDEN - Alle Parsing-Checks OK');
    return true;
  }
}

/**
 * Test 4: DNA-Compliance Check
 */
async function testDNACompliance(result: any) {
  console.log('\n🧪 Test 4: DNA-Compliance Check');
  console.log('═════════════════════════════════════════════════════════════════════');

  const errors: string[] = [];
  const warnings: string[] = [];

  // Blacklist-Check
  console.log('🔍 Prüfe Blacklist-Einhaltung...');
  const blacklistedTerms = ['revolution', 'gamechanger', 'disruptiv', 'state-of-the-art'];
  const fullText = `${result.headline} ${result.leadParagraph} ${result.bodyParagraphs.join(' ')} ${result.quote.text}`.toLowerCase();

  for (const term of blacklistedTerms) {
    if (fullText.includes(term.toLowerCase())) {
      errors.push(`Blacklisted term found: "${term}"`);
    }
  }
  console.log(`✅ Blacklist: ${errors.length === 0 ? 'Keine Verstöße' : errors.length + ' Verstöße'}`);

  // Fakten-Integration Check
  console.log('🔍 Prüfe Fakten-Integration...');
  const eventMentioned = fullText.includes('autoflow') || fullText.includes('automatisierung');
  const locationMentioned = fullText.includes('münchen');
  const deltaMentioned = fullText.includes('kmu') || fullText.includes('mittelstand') || fullText.includes('einfach');

  if (!eventMentioned) warnings.push('Ereignis (AutoFlow) nicht klar erwähnt');
  if (!locationMentioned) warnings.push('Ort (München) nicht erwähnt');
  if (!deltaMentioned) warnings.push('Delta/Neuigkeitswert nicht klar kommuniziert');

  console.log(`✅ Fakten: ${warnings.length === 0 ? 'Vollständig integriert' : warnings.length + ' Hinweise'}`);

  // Tonalität-Check (heuristisch)
  console.log('🔍 Prüfe Tonalität...');
  const hasModernTone = !fullText.includes('sehr geehrte') && !fullText.includes('hiermit');
  const hasClearLanguage = !fullText.includes('paradigmenwechsel') && !fullText.includes('synergieeffekte');

  if (!hasModernTone) warnings.push('Tonalität scheint zu formal');
  if (!hasClearLanguage) warnings.push('Sprache scheint zu komplex');

  console.log(`✅ Tonalität: ${hasModernTone && hasClearLanguage ? 'Modern & klar' : 'Hinweise'}`);

  // Ergebnis
  if (errors.length > 0) {
    console.log('\n❌ Test 4 FEHLGESCHLAGEN:');
    errors.forEach(err => console.log(`  - ${err}`));
    return false;
  } else if (warnings.length > 0) {
    console.log('\n⚠️ Test 4 BESTANDEN mit Hinweisen:');
    warnings.forEach(warn => console.log(`  - ${warn}`));
    return true;
  } else {
    console.log('\n✅ Test 4 BESTANDEN - Volle DNA-Compliance');
    return true;
  }
}

/**
 * Test 5: SEO-Score Schätzung
 */
async function testSEOScore(result: any) {
  console.log('\n🧪 Test 5: SEO-Score Schätzung');
  console.log('═════════════════════════════════════════════════════════════════════');

  let score = 0;
  const maxScore = 100;

  // Headline (25 Punkte)
  console.log('🔍 Headline-SEO...');
  if (result.headline.length >= 40 && result.headline.length <= 75) {
    score += 15;
    console.log('  ✅ Länge optimal (40-75 Zeichen): +15');
  } else {
    console.log(`  ⚠️ Länge suboptimal (${result.headline.length} Zeichen): +0`);
  }

  const hasKeyword = result.headline.toLowerCase().includes('ki') || result.headline.toLowerCase().includes('automatisierung');
  if (hasKeyword) {
    score += 10;
    console.log('  ✅ Keyword vorhanden: +10');
  }

  // Lead (20 Punkte)
  console.log('🔍 Lead-SEO...');
  if (result.leadParagraph.length >= 100 && result.leadParagraph.length <= 200) {
    score += 15;
    console.log('  ✅ Länge optimal (100-200 Zeichen): +15');
  } else {
    score += 5;
    console.log(`  ⚠️ Länge suboptimal (${result.leadParagraph.length} Zeichen): +5`);
  }

  const has5W = result.leadParagraph.includes(TEST_FAKTEN_MATRIX.hook.location);
  if (has5W) {
    score += 5;
    console.log('  ✅ 5-W-Struktur: +5');
  }

  // Struktur (25 Punkte)
  console.log('🔍 Struktur-SEO...');
  if (result.bodyParagraphs.length >= 3 && result.bodyParagraphs.length <= 4) {
    score += 10;
    console.log(`  ✅ Body-Absätze optimal (${result.bodyParagraphs.length}): +10`);
  } else {
    score += 5;
  }

  if (result.quote && result.quote.text) {
    score += 10;
    console.log('  ✅ Zitat vorhanden: +10');
  }

  if (result.cta && result.cta.length > 20) {
    score += 5;
    console.log('  ✅ CTA vorhanden: +5');
  }

  // Hashtags (15 Punkte)
  console.log('🔍 Social-SEO...');
  if (result.hashtags.length >= 2 && result.hashtags.length <= 3) {
    score += 15;
    console.log(`  ✅ Hashtags optimal (${result.hashtags.length}): +15`);
  } else {
    score += 5;
  }

  // Lesbarkeit (15 Punkte)
  console.log('🔍 Lesbarkeit...');
  const avgParagraphLength = result.bodyParagraphs.reduce((sum: number, p: string) => sum + p.length, 0) / result.bodyParagraphs.length;
  if (avgParagraphLength >= 150 && avgParagraphLength <= 400) {
    score += 15;
    console.log(`  ✅ Absatzlänge optimal (Ø ${Math.round(avgParagraphLength)} Zeichen): +15`);
  } else {
    score += 5;
    console.log(`  ⚠️ Absatzlänge suboptimal (Ø ${Math.round(avgParagraphLength)} Zeichen): +5`);
  }

  console.log('\n═════════════════════════════════════════════════════════════════════');
  console.log(`📊 SEO-Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);
  console.log('═════════════════════════════════════════════════════════════════════');

  if (score >= 85) {
    console.log('✅ Test 5 BESTANDEN - Exzellenter SEO-Score');
    return true;
  } else if (score >= 70) {
    console.log('⚠️ Test 5 BESTANDEN - Guter SEO-Score (Verbesserungspotenzial)');
    return true;
  } else {
    console.log('❌ Test 5 FEHLGESCHLAGEN - SEO-Score zu niedrig (< 70%)');
    return false;
  }
}

/**
 * Test 6: Firestore-Integration
 */
async function testFirestoreIntegration(result: any) {
  console.log('\n🧪 Test 6: Firestore PM-Vorlage Service');
  console.log('═════════════════════════════════════════════════════════════════════');

  try {
    // Save
    console.log('📝 Speichere PM-Vorlage...');
    await pmVorlageService.save(TEST_PROJECT_ID, {
      ...result,
      markenDNAHash: 'test-dna-hash-123',
      faktenMatrixHash: 'test-fm-hash-456',
    });
    console.log('✅ Speichern erfolgreich');

    // Get
    console.log('📖 Lade PM-Vorlage...');
    const loaded = await pmVorlageService.get(TEST_PROJECT_ID);
    if (!loaded) {
      throw new Error('PM-Vorlage nicht gefunden');
    }
    console.log('✅ Laden erfolgreich');

    // Validate
    console.log('🔍 Validiere gespeicherte Daten...');
    if (loaded.headline !== result.headline) {
      throw new Error('Headline stimmt nicht überein');
    }
    if (loaded.markenDNAHash !== 'test-dna-hash-123') {
      throw new Error('DNA-Hash stimmt nicht überein');
    }
    console.log('✅ Daten korrekt gespeichert');

    // Update
    console.log('✏️ Aktualisiere PM-Vorlage...');
    await pmVorlageService.update(TEST_PROJECT_ID, {
      headline: 'Aktualisierte Headline',
    });
    const updated = await pmVorlageService.get(TEST_PROJECT_ID);
    if (!updated || updated.headline !== 'Aktualisierte Headline') {
      throw new Error('Update fehlgeschlagen');
    }
    console.log('✅ Update erfolgreich');

    // Cleanup
    console.log('🧹 Lösche Test-Daten...');
    await pmVorlageService.delete(TEST_PROJECT_ID);
    await faktenMatrixService.delete(TEST_PROJECT_ID);
    console.log('✅ Cleanup erfolgreich');

    console.log('\n✅ Test 6 BESTANDEN');
    return true;
  } catch (error) {
    console.error('❌ Test 6 FEHLGESCHLAGEN:', error);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🚀 PM-VORLAGE END-TO-END TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  const results: { [key: string]: boolean } = {};

  // Test 1: Fakten-Matrix Service
  results['test1'] = await testFaktenMatrixService();

  // Test 2: PM-Vorlage Flow
  const flowResult = await testPMVorlageFlow();
  results['test2'] = flowResult.success;

  if (flowResult.success && flowResult.result) {
    // Test 3: Parsing
    results['test3'] = await testParsingValidation(flowResult.result);

    // Test 4: DNA-Compliance
    results['test4'] = await testDNACompliance(flowResult.result);

    // Test 5: SEO-Score
    results['test5'] = await testSEOScore(flowResult.result);

    // Test 6: Firestore
    results['test6'] = await testFirestoreIntegration(flowResult.result);
  } else {
    console.log('\n⏭️ Tests 3-6 übersprungen (Flow fehlgeschlagen)');
    results['test3'] = false;
    results['test4'] = false;
    results['test5'] = false;
    results['test6'] = false;
  }

  // Zusammenfassung
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST-ZUSAMMENFASSUNG');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  const testNames = {
    test1: 'Fakten-Matrix Service',
    test2: 'PM-Vorlage Flow',
    test3: 'Parsing-Validierung',
    test4: 'DNA-Compliance',
    test5: 'SEO-Score',
    test6: 'Firestore-Integration',
  };

  Object.entries(results).forEach(([key, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testNames[key as keyof typeof testNames]}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const passRate = Math.round((passedTests / totalTests) * 100);

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Ergebnis: ${passedTests}/${totalTests} Tests bestanden (${passRate}%)`);
  console.log('═══════════════════════════════════════════════════════════════════════════');

  if (passedTests === totalTests) {
    console.log('\n🎉 ALLE TESTS BESTANDEN! PM-Vorlage System voll funktionsfähig.');
    process.exit(0);
  } else {
    console.log(`\n⚠️ ${totalTests - passedTests} Tests fehlgeschlagen. Bitte Fehler beheben.`);
    process.exit(1);
  }
}

// Haupteinstieg
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('\n💥 FATALER FEHLER:', error);
    process.exit(1);
  });
}

export { runAllTests };

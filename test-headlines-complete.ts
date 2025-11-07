// Vollständiger Test für generateHeadlinesFlow mit allen Dataset Test-Cases
import { config } from 'dotenv';
config({ path: '.env.local' });

import { generateHeadlinesFlow } from './src/lib/ai/flows/generate-headlines';
import * as fs from 'fs';

interface TestCase {
  testCaseId: string;
  description: string;
  input: {
    content: string;
    currentHeadline: string | null;
    context: {
      industry?: string;
      tone?: string;
      audience?: string;
    } | null;
  };
  reference: any;
}

async function runCompleteTest() {
  console.log('🎯 STARTE VOLLSTÄNDIGEN HEADLINES FLOW TEST\n');
  console.log('═'.repeat(80) + '\n');

  // Lade Test-Dataset
  const datasetPath = './src/lib/ai/test-data/generate-headlines-dataset.json';
  const dataset: TestCase[] = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  console.log(`📊 Gefundene Test-Cases: ${dataset.length}\n`);

  const results: any[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < dataset.length; i++) {
    const testCase = dataset[i];

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`TEST ${i + 1}/${dataset.length}: ${testCase.testCaseId}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`${'─'.repeat(80)}\n`);

    try {
      // Führe Flow aus
      const startTime = Date.now();
      const result = await generateHeadlinesFlow(testCase.input as any);
      const duration = Date.now() - startTime;

      console.log('✅ Flow erfolgreich ausgeführt');
      console.log(`⏱️  Dauer: ${duration}ms\n`);

      console.log('📊 ERGEBNIS:');
      console.log(`  Headline-Count: ${result.headlines.length}`);
      console.log(`  Analysis Note: ${result.analysisNote}\n`);

      console.log('📰 GENERIERTE HEADLINES:');
      result.headlines.forEach((h, idx) => {
        console.log(`  ${idx + 1}. ${h.headline}`);
        console.log(`     Länge: ${h.length} | Stil: ${h.style} | Verb: ${h.hasActiveVerb ? '✓' : '✗'} | SEO: ${h.seoScore}`);
      });
      console.log();

      // Validierung basierend auf Reference
      const ref = testCase.reference;
      let validationPassed = true;
      const validationErrors: string[] = [];

      // Headline-Count Check
      if (result.headlines.length !== ref.expectedHeadlineCount) {
        validationPassed = false;
        validationErrors.push(`❌ Falsche Anzahl Headlines: ${result.headlines.length} statt ${ref.expectedHeadlineCount}`);
      }

      // Längen-Check
      result.headlines.forEach((h, idx) => {
        if (h.length < ref.minLength) {
          validationPassed = false;
          validationErrors.push(`❌ Headline ${idx + 1} zu kurz: ${h.length} < ${ref.minLength}`);
        }
        if (h.length > ref.maxLength) {
          validationPassed = false;
          validationErrors.push(`❌ Headline ${idx + 1} zu lang: ${h.length} > ${ref.maxLength}`);
        }
      });

      // Active Verb Check (mindestens 2 von 3)
      const verbCount = result.headlines.filter(h => h.hasActiveVerb).length;
      if (ref.shouldHaveActiveVerb && verbCount < 2) {
        validationPassed = false;
        validationErrors.push(`❌ Zu wenig aktive Verben: ${verbCount}/3 (erwartet: mind. 2)`);
      }

      // Keywords Check
      if (ref.keywordsShouldAppear) {
        const allHeadlinesText = result.headlines.map(h => h.headline).join(' ');
        for (const keyword of ref.keywordsShouldAppear) {
          if (!allHeadlinesText.includes(keyword)) {
            validationPassed = false;
            validationErrors.push(`❌ Keyword fehlt in allen Headlines: "${keyword}"`);
          }
        }
      }

      // SEO Score Check
      const avgSeoScore = result.headlines.reduce((sum, h) => sum + h.seoScore, 0) / result.headlines.length;
      if (avgSeoScore < ref.minSeoScore) {
        validationPassed = false;
        validationErrors.push(`❌ Durchschnittlicher SEO-Score zu niedrig: ${avgSeoScore} < ${ref.minSeoScore}`);
      }

      // Style Check
      const styles = result.headlines.map(h => h.style);
      const expectedStyles = ref.expectedStyles;
      if (!expectedStyles.every((style: string) => styles.includes(style))) {
        validationPassed = false;
        validationErrors.push(`❌ Nicht alle erwarteten Stile vorhanden`);
      }

      if (validationPassed) {
        console.log('✅ VALIDIERUNG BESTANDEN\n');
        passedCount++;
      } else {
        console.log('⚠️  VALIDIERUNGS-WARNUNGEN:');
        validationErrors.forEach(err => console.log(`   ${err}`));
        console.log();
        failedCount++;
      }

      results.push({
        testCaseId: testCase.testCaseId,
        status: validationPassed ? 'PASSED' : 'WARNING',
        duration,
        headlineCount: result.headlines.length,
        avgSeoScore,
        validationErrors
      });

    } catch (error: any) {
      console.log(`❌ FEHLER: ${error.message}\n`);
      failedCount++;
      results.push({
        testCaseId: testCase.testCaseId,
        status: 'FAILED',
        error: error.message
      });
    }
  }

  // Zusammenfassung
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST-ZUSAMMENFASSUNG');
  console.log('═'.repeat(80) + '\n');

  console.log(`Gesamt Test-Cases: ${dataset.length}`);
  console.log(`✅ Bestanden: ${passedCount}`);
  console.log(`⚠️  Warnungen/Fehler: ${failedCount}`);
  console.log(`Erfolgsrate: ${Math.round((passedCount / dataset.length) * 100)}%\n`);

  // Detaillierte Ergebnisse
  console.log('DETAILLIERTE ERGEBNISSE:');
  console.log('─'.repeat(80));
  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${r.testCaseId.padEnd(40)} ${r.status.padEnd(10)} ${r.duration ? r.duration + 'ms' : ''}`);
  });

  console.log('\n' + '═'.repeat(80));
}

runCompleteTest().catch(console.error);

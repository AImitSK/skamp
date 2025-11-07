// Vollständiger Test für textTransformFlow mit allen Dataset Test-Cases
import { config } from 'dotenv';
config({ path: '.env.local' });

import { textTransformFlow } from './src/lib/ai/flows/text-transform';
import * as fs from 'fs';

interface TestCase {
  testCaseId: string;
  description: string;
  input: {
    text: string;
    action: string;
    tone: string | null;
    instruction: string | null;
    fullDocument: string | null;
  };
  reference: any;
}

async function runCompleteTest() {
  console.log('🧪 STARTE VOLLSTÄNDIGEN TEXT-TRANSFORM FLOW TEST\n');
  console.log('═'.repeat(80) + '\n');

  // Lade Test-Dataset
  const datasetPath = './src/lib/ai/test-data/text-transform-dataset.json';
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
      const result = await textTransformFlow(testCase.input as any);
      const duration = Date.now() - startTime;

      // Berechne Metriken
      const outputWords = result.transformedText.split(/\s+/).length;
      const originalWords = testCase.input.text.split(/\s+/).length;

      console.log('✅ Flow erfolgreich ausgeführt');
      console.log(`⏱️  Dauer: ${duration}ms\n`);

      console.log('📊 METRIKEN:');
      console.log(`  Original Wörter: ${originalWords}`);
      console.log(`  Transformiert Wörter: ${outputWords}`);
      console.log(`  Wortanzahl-Änderung: ${result.wordCountChange}`);
      console.log(`  Original Zeichen: ${result.originalLength}`);
      console.log(`  Transformiert Zeichen: ${result.transformedLength}\n`);

      console.log('📄 ORIGINAL:');
      console.log(`  ${testCase.input.text.substring(0, 150)}${testCase.input.text.length > 150 ? '...' : ''}\n`);

      console.log('🔄 TRANSFORMIERT:');
      console.log(`  ${result.transformedText.substring(0, 150)}${result.transformedText.length > 150 ? '...' : ''}\n`);

      // Validierung basierend auf Reference
      const ref = testCase.reference;
      let validationPassed = true;
      const validationErrors: string[] = [];

      // Wortanzahl-Prüfung
      if (ref.minWordCount && outputWords < ref.minWordCount) {
        validationPassed = false;
        validationErrors.push(`❌ Zu wenig Wörter: ${outputWords} < ${ref.minWordCount}`);
      }
      if (ref.maxWordCount && outputWords > ref.maxWordCount) {
        validationPassed = false;
        validationErrors.push(`❌ Zu viele Wörter: ${outputWords} > ${ref.maxWordCount}`);
      }

      // Format-Preservation Checks
      if (ref.shouldPreserveFormatting) {
        if (testCase.input.text.includes('**') && !result.transformedText.includes('**')) {
          validationPassed = false;
          validationErrors.push('❌ Bold-Formatierung (**) verloren');
        }
        if (testCase.input.text.includes('[[CTA:') && !result.transformedText.includes('[[CTA:')) {
          validationPassed = false;
          validationErrors.push('❌ CTA-Marker verloren');
        }
        if (testCase.input.text.includes('#') && !result.transformedText.includes('#')) {
          validationPassed = false;
          validationErrors.push('❌ Hashtags verloren');
        }
      }

      // Keywords-Prüfung
      if (ref.keywordsShouldAppear) {
        for (const keyword of ref.keywordsShouldAppear) {
          if (!result.transformedText.includes(keyword)) {
            validationPassed = false;
            validationErrors.push(`❌ Keyword fehlt: "${keyword}"`);
          }
        }
      }

      // Custom Action: Full Document Check
      if (testCase.input.action === 'custom' && ref.shouldReturnFullDocument) {
        const hasMultipleParagraphs = result.transformedText.includes('\n\n');
        if (!hasMultipleParagraphs && testCase.input.fullDocument?.includes('\n\n')) {
          validationPassed = false;
          validationErrors.push('❌ Custom sollte vollständiges Dokument zurückgeben');
        }
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
        outputWords,
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
  console.log(`⚠️  Warnungen: ${failedCount}`);
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

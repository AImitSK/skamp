// src/lib/ai/test-data/run-translation-tests.ts
// Test-Runner für translate-press-release Flow mit echten API-Calls
//
// USAGE: npx tsx src/lib/ai/test-data/run-translation-tests.ts
//
// Erfordert: GOOGLE_GENAI_API_KEY in .env.local

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// .env.local laden
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });

// Testdaten laden
const datasetPath = path.join(__dirname, 'translate-press-release-dataset.json');
const testCases = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

// Genkit Flow importieren (dynamisch für Server-Kontext)
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 Translation Flow Test Runner');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Dynamischer Import für Server-Kontext
  const { translatePressReleaseFlow } = await import('../flows/translate-press-release');

  const results: Array<{
    testCaseId: string;
    passed: boolean;
    errors: string[];
    warnings: string[];
    stats: {
      inputLength: number;
      outputLength: number;
      confidence: number;
      duration: number;
    };
  }> = [];

  for (const testCase of testCases) {
    console.log(`\n🔄 Test: ${testCase.testCaseId}`);
    console.log(`   ${testCase.description}`);
    console.log(`   ${testCase.input.sourceLanguage} → ${testCase.input.targetLanguage}`);

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Flow ausführen
      const result = await translatePressReleaseFlow({
        content: testCase.input.content,
        title: testCase.input.title,
        sourceLanguage: testCase.input.sourceLanguage,
        targetLanguage: testCase.input.targetLanguage,
        glossaryEntries: testCase.input.glossaryEntries || null,
        preserveFormatting: testCase.input.preserveFormatting ?? true,
        tone: testCase.input.tone || 'professional',
      });

      const duration = Date.now() - startTime;

      // ══════════════════════════════════════════════════════════════
      // VALIDIERUNG
      // ══════════════════════════════════════════════════════════════

      // 1. Längenprüfung
      if (result.translatedContent.length < testCase.reference.minContentLength) {
        errors.push(
          `Content zu kurz: ${result.translatedContent.length} Zeichen (min: ${testCase.reference.minContentLength})`
        );
      }
      if (result.translatedContent.length > testCase.reference.maxContentLength) {
        warnings.push(
          `Content zu lang: ${result.translatedContent.length} Zeichen (max: ${testCase.reference.maxContentLength})`
        );
      }

      // 2. Pflichtinhalte prüfen
      for (const mustContain of testCase.reference.mustContain) {
        if (!result.translatedContent.includes(mustContain) &&
            !result.translatedTitle.includes(mustContain)) {
          errors.push(`Fehlender Pflichtinhalt: "${mustContain}"`);
        }
      }

      // 3. HTML-Tags prüfen
      if (testCase.reference.mustPreserveHtmlTags) {
        for (const tag of testCase.reference.mustPreserveHtmlTags) {
          if (!result.translatedContent.includes(tag)) {
            errors.push(`Fehlender HTML-Tag: "${tag}"`);
          }
        }
      }

      // 4. Titel-Qualität
      if (!result.translatedTitle || result.translatedTitle.trim() === '') {
        errors.push('Kein Titel in Übersetzung');
      }

      // 5. Content-Verhältnis prüfen (sollte ähnlich sein)
      const lengthRatio = result.translatedContent.length / testCase.input.content.length;
      if (lengthRatio < 0.5) {
        errors.push(
          `Content massiv verkürzt! Ratio: ${(lengthRatio * 100).toFixed(1)}% ` +
          `(Input: ${testCase.input.content.length}, Output: ${result.translatedContent.length})`
        );
      } else if (lengthRatio < 0.7) {
        warnings.push(
          `Content deutlich kürzer: ${(lengthRatio * 100).toFixed(1)}%`
        );
      }

      // Ergebnis speichern
      results.push({
        testCaseId: testCase.testCaseId,
        passed: errors.length === 0,
        errors,
        warnings,
        stats: {
          inputLength: testCase.input.content.length,
          outputLength: result.translatedContent.length,
          confidence: result.confidence,
          duration,
        },
      });

      // Output anzeigen
      console.log(`   ⏱️  ${duration}ms`);
      console.log(`   📊 Input: ${testCase.input.content.length} → Output: ${result.translatedContent.length} Zeichen`);
      console.log(`   🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);

      if (errors.length > 0) {
        console.log(`   ❌ FAILED - ${errors.length} Fehler:`);
        errors.forEach(e => console.log(`      • ${e}`));
      } else {
        console.log(`   ✅ PASSED`);
      }

      if (warnings.length > 0) {
        console.log(`   ⚠️  ${warnings.length} Warnungen:`);
        warnings.forEach(w => console.log(`      • ${w}`));
      }

      // Debug: Ersten 500 Zeichen des Outputs anzeigen
      console.log(`\n   📝 Titel: ${result.translatedTitle}`);
      console.log(`   📝 Content (erste 500 Zeichen):`);
      console.log(`   ${result.translatedContent.substring(0, 500).replace(/\n/g, '\n   ')}...`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      errors.push(`Flow-Fehler: ${error.message}`);

      results.push({
        testCaseId: testCase.testCaseId,
        passed: false,
        errors,
        warnings,
        stats: {
          inputLength: testCase.input.content.length,
          outputLength: 0,
          confidence: 0,
          duration,
        },
      });

      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ZUSAMMENFASSUNG
  // ══════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 ZUSAMMENFASSUNG');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`✅ Bestanden: ${passed}/${results.length}`);
  console.log(`❌ Fehlgeschlagen: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\n❌ Fehlgeschlagene Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   • ${r.testCaseId}`);
        r.errors.forEach(e => console.log(`     - ${e}`));
      });
  }

  // Report-Datei schreiben
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
    },
    results,
  }, null, 2));

  console.log(`\n📄 Report gespeichert: ${reportPath}`);

  // Exit-Code basierend auf Ergebnis
  process.exit(failed > 0 ? 1 : 0);
}

// Runner starten
runTests().catch(err => {
  console.error('❌ Test-Runner Fehler:', err);
  process.exit(1);
});

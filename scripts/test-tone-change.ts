// scripts/test-tone-change.ts
// Manueller Test-Runner für Ton-Änderung (12 Szenarien)

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// .env.local laden
config({ path: '.env.local' });

// API Key prüfen
if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
  console.error('❌ FEHLER: GOOGLE_GENAI_API_KEY oder GEMINI_API_KEY nicht in .env.local gefunden!');
  process.exit(1);
}

// Dynamischer Import für Server-Only Module
async function runToneTests() {
  console.log('🚀 Starte Ton-Änderungs-Tests...\n');

  // Dataset laden
  const datasetPath = path.join(process.cwd(), 'src/lib/ai/test-data/tone-change-dataset.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  console.log(`📊 Gefundene Test-Cases: ${dataset.length}\n`);

  // Flow dynamisch importieren (nur Server-Side)
  const { generatePressReleaseStructuredFlow } = await import('../src/lib/ai/flows/generate-press-release-structured');

  const results: any[] = [];

  // Alle Tests durchlaufen
  for (let i = 0; i < dataset.length; i++) {
    const testCase = dataset[i];

    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST ${i + 1}/${dataset.length}: ${testCase.testCaseId}`);
    console.log(`Beschreibung: ${testCase.description}`);
    console.log(`Ton: ${testCase.input.context.tone}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      const startTime = Date.now();

      // Flow ausführen
      const result = await generatePressReleaseStructuredFlow(testCase.input);

      const duration = Date.now() - startTime;

      console.log(`✅ Test erfolgreich (${duration}ms)\n`);
      console.log(`📝 Headline: ${result.headline}`);
      console.log(`📝 Lead: ${result.leadParagraph.substring(0, 100)}...`);
      console.log(`📝 Body Paragraphs: ${result.bodyParagraphs.length}`);
      console.log(`📝 Quote: "${result.quote.text.substring(0, 50)}..."`);
      console.log(`📝 CTA: ${result.cta.substring(0, 50)}...`);
      console.log(`📝 Hashtags: ${result.hashtags.join(' ')}`);

      // Ton-Analyse
      const fullText = `${result.headline} ${result.leadParagraph} ${result.bodyParagraphs.join(' ')} ${result.quote.text} ${result.cta}`;

      const toneAnalysis = {
        mustContain: testCase.expectedToneCharacteristics.mustContain.map((word: string) => ({
          word,
          found: fullText.toLowerCase().includes(word.toLowerCase())
        })),
        mustNotContain: testCase.expectedToneCharacteristics.mustNotContain.map((word: string) => ({
          word,
          found: fullText.toLowerCase().includes(word.toLowerCase())
        }))
      };

      const mustContainScore = toneAnalysis.mustContain.filter(x => x.found).length;
      const mustNotContainScore = toneAnalysis.mustNotContain.filter(x => !x.found).length;

      console.log(`\n🎯 TON-ANALYSE:`);
      console.log(`   MUSS enthalten (${mustContainScore}/${toneAnalysis.mustContain.length}):`);
      toneAnalysis.mustContain.forEach(x => {
        console.log(`      ${x.found ? '✅' : '❌'} "${x.word}"`);
      });

      console.log(`   DARF NICHT enthalten (${mustNotContainScore}/${toneAnalysis.mustNotContain.length}):`);
      toneAnalysis.mustNotContain.forEach(x => {
        console.log(`      ${x.found ? '❌' : '✅'} "${x.word}" ${x.found ? '(GEFUNDEN!)' : ''}`);
      });

      const toneScore = Math.round(
        ((mustContainScore / toneAnalysis.mustContain.length) * 0.6 +
        (mustNotContainScore / toneAnalysis.mustNotContain.length) * 0.4) * 100
      );

      console.log(`\n   📊 TON-SCORE: ${toneScore}%`);

      // Ergebnis speichern
      results.push({
        testCaseId: testCase.testCaseId,
        tone: testCase.input.context.tone,
        description: testCase.description,
        success: true,
        duration,
        toneScore,
        toneAnalysis,
        result: {
          headline: result.headline,
          leadParagraph: result.leadParagraph,
          bodyParagraphs: result.bodyParagraphs,
          quote: result.quote,
          cta: result.cta,
          hashtags: result.hashtags
        }
      });

    } catch (error: any) {
      console.error(`❌ Test fehlgeschlagen:`, error.message);

      results.push({
        testCaseId: testCase.testCaseId,
        tone: testCase.input.context.tone,
        description: testCase.description,
        success: false,
        error: error.message
      });
    }
  }

  // Zusammenfassung
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 TEST-ZUSAMMENFASSUNG`);
  console.log(`${'='.repeat(80)}\n`);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Gesamt: ${results.length} Tests`);
  console.log(`✅ Erfolgreich: ${successCount}`);
  console.log(`❌ Fehlgeschlagen: ${failCount}`);

  // Ton-spezifische Statistiken
  const toneStats = ['formal', 'modern', 'technical', 'startup'].map(tone => {
    const toneResults = results.filter(r => r.tone === tone && r.success);
    const avgScore = toneResults.length > 0
      ? Math.round(toneResults.reduce((sum, r) => sum + r.toneScore, 0) / toneResults.length)
      : 0;

    return { tone, count: toneResults.length, avgScore };
  });

  console.log(`\n📊 TON-STATISTIKEN:`);
  toneStats.forEach(stat => {
    console.log(`   ${stat.tone.padEnd(12)}: ${stat.count} Tests, Avg Score: ${stat.avgScore}%`);
  });

  // Ergebnisse als JSON speichern
  const outputPath = path.join(process.cwd(), 'test-results-tone-change.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\n💾 Detaillierte Ergebnisse gespeichert: ${outputPath}`);
  console.log(`\n✅ Tests abgeschlossen!\n`);
}

// Script ausführen
runToneTests().catch(error => {
  console.error('❌ Fehler beim Ausführen der Tests:', error);
  process.exit(1);
});

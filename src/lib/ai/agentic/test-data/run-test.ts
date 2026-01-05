#!/usr/bin/env npx tsx
// src/lib/ai/agentic/test-data/run-test.ts
// CLI-Script zum Ausführen einzelner Tests mit Protokoll-Export

// ENV-Variablen laden (wichtig für API-Keys)
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { runAgenticTestScenarioFlow, evaluateAgenticTestResultFlow } from './agentic-test-runner';
import { getDatasetById, ALL_AGENTIC_TEST_DATASETS } from './datasets';
import { saveTestProtocol, saveMarkdownReport } from './save-protocol';

async function main() {
  const args = process.argv.slice(2);

  // Hilfe anzeigen
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           Agentic Chat Test Runner                          ║
╚════════════════════════════════════════════════════════════╝

Verwendung:
  npx tsx src/lib/ai/agentic/test-data/run-test.ts <scenario-id> [--eval]

Optionen:
  --eval    Führt zusätzlich die Evaluation durch
  --list    Zeigt alle verfügbaren Szenarien

Beispiele:
  npx tsx src/lib/ai/agentic/test-data/run-test.ts briefing_specialist_quick
  npx tsx src/lib/ai/agentic/test-data/run-test.ts briefing_specialist_quick --eval
  npx tsx src/lib/ai/agentic/test-data/run-test.ts --list

Verfügbare Szenarien:
${ALL_AGENTIC_TEST_DATASETS.map(d => `  - ${d.id} (${d.specialistType})`).join('\n')}
`);
    process.exit(0);
  }

  // Liste anzeigen
  if (args[0] === '--list') {
    console.log('\n📋 Verfügbare Test-Szenarien:\n');
    const bySpecialist: Record<string, typeof ALL_AGENTIC_TEST_DATASETS> = {};

    for (const dataset of ALL_AGENTIC_TEST_DATASETS) {
      if (!bySpecialist[dataset.specialistType]) {
        bySpecialist[dataset.specialistType] = [];
      }
      bySpecialist[dataset.specialistType].push(dataset);
    }

    for (const [specialist, datasets] of Object.entries(bySpecialist)) {
      console.log(`\n${specialist}:`);
      for (const d of datasets) {
        console.log(`  • ${d.id}`);
        console.log(`    ${d.description}`);
        console.log(`    Turns: ${d.turns.length}, Required Tools: ${d.expectations.requiredTools?.join(', ') || 'keine'}`);
      }
    }
    process.exit(0);
  }

  const scenarioId = args[0];
  const runEval = args.includes('--eval');

  // Szenario laden
  const scenario = getDatasetById(scenarioId);

  if (!scenario) {
    console.error(`\n❌ Szenario nicht gefunden: ${scenarioId}`);
    console.log('\nVerfügbare Szenarien:');
    ALL_AGENTIC_TEST_DATASETS.forEach(d => console.log(`  - ${d.id}`));
    process.exit(1);
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Agentic Chat Test Runner                          ║
╚════════════════════════════════════════════════════════════╝

📋 Szenario: ${scenario.id}
🤖 Spezialist: ${scenario.specialistType}
🏢 Firma: ${scenario.company.name}
🔄 Turns: ${scenario.turns.length}
📊 Evaluation: ${runEval ? 'Ja' : 'Nein'}

Starte Test...
`);

  try {
    // Test ausführen
    const result = await runAgenticTestScenarioFlow(scenario);

    // Optional: Evaluation
    let evaluation: { metrics: any; recommendations: string[] } | undefined;

    if (runEval) {
      console.log('\n🔍 Führe Evaluation durch...');
      evaluation = await evaluateAgenticTestResultFlow({
        scenarioResult: result,
        scenario: scenario,
      });
    }

    // Protokoll speichern
    const protocol = {
      result,
      evaluation,
      metadata: {
        version: '1.0.0',
        genkitVersion: 'genkit@1.x',
        nodeVersion: process.version,
        savedAt: new Date().toISOString(),
      },
    };

    const jsonPath = saveTestProtocol(result, evaluation);
    const mdPath = saveMarkdownReport(protocol);

    // Zusammenfassung
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    TEST ABGESCHLOSSEN                       ║
╚════════════════════════════════════════════════════════════╝

📊 Ergebnis: ${result.validation.passed ? '✅ BESTANDEN' : '❌ FEHLGESCHLAGEN'}

🔧 Tool-Calls: ${result.validation.totalToolCalls}
${result.allToolCalls.map(tc => `   • ${tc.name}`).join('\n')}

📁 Protokolle gespeichert:
   • JSON: ${jsonPath}
   • Markdown: ${mdPath}

${result.validation.errors.length > 0 ? `
⚠️  Fehler:
${result.validation.errors.map(e => `   • ${e}`).join('\n')}
` : ''}
${evaluation ? `
📈 Evaluation:
   • Tool-Usage: ${(evaluation.metrics.toolUsageScore * 100).toFixed(0)}%
   • Response-Quality: ${(evaluation.metrics.responseQualityScore * 100).toFixed(0)}%
   • Adherence: ${(evaluation.metrics.adherenceScore * 100).toFixed(0)}%
   • Legacy-Free: ${(evaluation.metrics.legacyFreeScore * 100).toFixed(0)}%
   • GESAMT: ${(evaluation.metrics.overallScore * 100).toFixed(0)}%

${evaluation.recommendations.length > 0 ? `
💡 Empfehlungen:
${evaluation.recommendations.map(r => `   • ${r}`).join('\n')}
` : ''}` : ''}
`);

    process.exit(result.validation.passed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fehler beim Ausführen des Tests:', error);
    process.exit(1);
  }
}

main();

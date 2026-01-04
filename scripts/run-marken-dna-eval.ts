// scripts/run-marken-dna-eval.ts
// Führt die Marken-DNA Chat Evaluierung mit dem Dataset durch
// Verwendet direkte Evaluierungslogik (nicht Genkit Evaluator Framework)

import { config } from 'dotenv';
config({ path: '.env.local' });

import { markenDNAChatFlow, type MarkenDNAChatOutput } from '../src/lib/ai/flows/marken-dna-chat';
import testDataset from '../src/lib/ai/test-data/marken-dna-chat-dataset.json';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface TestCase {
  testCaseId: string;
  description: string;
  input: {
    documentType: string;
    companyId: string;
    companyName: string;
    language: 'de' | 'en';
    messages: Array<{ role: string; content: string }>;
    existingDocument?: string | null;
  };
  reference: {
    expectedTags: {
      document: boolean;
      progress: boolean;
      suggestions: boolean;
      status?: boolean;
    };
    expectedProgressRange?: { min: number; max: number };
    expectedStatus?: string;
    qualityCriteria?: Record<string, boolean>;
  };
}

interface EvalResult {
  evaluator: string;
  score: number;
  reasoning: string;
}

// ══════════════════════════════════════════════════════════════
// EVALUATOR FUNKTIONEN (Direkte Implementierung)
// ══════════════════════════════════════════════════════════════

function evaluateDocumentExtraction(
  output: MarkenDNAChatOutput,
  reference: TestCase['reference']
): EvalResult {
  const expectDocument = reference.expectedTags?.document ?? true;
  const hasDocumentInResponse = output.response?.includes('[DOCUMENT]') && output.response?.includes('[/DOCUMENT]');
  const hasExtractedDocument = !!output.document && output.document.length > 0;

  let score = 0;
  let reasoning = '';

  if (expectDocument) {
    if (hasDocumentInResponse && hasExtractedDocument) {
      score = 1;
      reasoning = 'Document tags present and correctly extracted';
    } else if (hasDocumentInResponse && !hasExtractedDocument) {
      score = 0.5;
      reasoning = 'Document tags present but extraction failed';
    } else {
      score = 0;
      reasoning = 'Expected document tags not present in response';
    }
  } else {
    if (!hasDocumentInResponse) {
      score = 1;
      reasoning = 'No document expected and none present - correct';
    } else {
      score = 0.5;
      reasoning = 'Document present but not expected (early stage)';
    }
  }

  return { evaluator: 'documentExtraction', score, reasoning };
}

function evaluateProgressExtraction(
  output: MarkenDNAChatOutput,
  reference: TestCase['reference']
): EvalResult {
  const progressMatch = output.response?.match(/\[PROGRESS:(\d+)\]/);
  const hasProgressInResponse = !!progressMatch;
  const hasExtractedProgress = typeof output.progress === 'number';

  const expectedRange = reference.expectedProgressRange;
  let inExpectedRange = true;
  if (expectedRange && hasExtractedProgress) {
    inExpectedRange = output.progress! >= expectedRange.min && output.progress! <= expectedRange.max;
  }

  let score = 0;
  let reasoning = '';

  if (!hasProgressInResponse) {
    score = 0;
    reasoning = 'No [PROGRESS:XX] tag found';
  } else if (!hasExtractedProgress) {
    score = 0.5;
    reasoning = 'Progress tag present but extraction failed';
  } else if (!inExpectedRange && expectedRange) {
    score = 0.7;
    reasoning = `Progress ${output.progress}% outside expected [${expectedRange.min}-${expectedRange.max}%]`;
  } else {
    score = 1;
    reasoning = `Progress ${output.progress}% correctly extracted and in range`;
  }

  return { evaluator: 'progressExtraction', score, reasoning };
}

function evaluateSuggestionsExtraction(
  output: MarkenDNAChatOutput,
  reference: TestCase['reference']
): EvalResult {
  const expectSuggestions = reference.expectedTags?.suggestions ?? true;
  const hasSuggestionsInResponse = output.response?.includes('[SUGGESTIONS]') && output.response?.includes('[/SUGGESTIONS]');
  const hasExtractedSuggestions = Array.isArray(output.suggestions) && output.suggestions.length > 0;

  let score = 0;
  let reasoning = '';

  if (expectSuggestions) {
    if (hasSuggestionsInResponse && hasExtractedSuggestions) {
      score = 1;
      reasoning = `${output.suggestions!.length} suggestions correctly extracted`;
    } else if (hasSuggestionsInResponse && !hasExtractedSuggestions) {
      score = 0.5;
      reasoning = 'Suggestions tags present but extraction failed';
    } else {
      score = 0;
      reasoning = 'Expected suggestions not present';
    }
  } else {
    score = 1;
    reasoning = 'No suggestions expected - passed';
  }

  return { evaluator: 'suggestionsExtraction', score, reasoning };
}

function evaluateStatusExtraction(
  output: MarkenDNAChatOutput,
  reference: TestCase['reference']
): EvalResult {
  const statusMatch = output.response?.match(/\[STATUS:(\w+)\]/i);
  const hasStatusInResponse = !!statusMatch;
  const hasExtractedStatus = output.status === 'draft' || output.status === 'completed';
  const expectedStatus = reference.expectedTags?.status;

  let score = 0;
  let reasoning = '';

  if (expectedStatus === true) {
    if (hasStatusInResponse && hasExtractedStatus) {
      score = 1;
      reasoning = `Status "${output.status}" correctly extracted`;
    } else if (!hasStatusInResponse) {
      score = 0;
      reasoning = 'Expected status tag not present';
    } else {
      score = 0.5;
      reasoning = 'Status tag present but extraction failed';
    }
  } else if (expectedStatus === false) {
    if (!hasStatusInResponse) {
      score = 1;
      reasoning = 'No status expected and none present - correct';
    } else {
      score = 0.7;
      reasoning = 'Status present but not expected';
    }
  } else {
    // Nicht definiert - neutral
    score = 1;
    reasoning = hasExtractedStatus ? `Status "${output.status}" extracted` : 'No status (neutral)';
  }

  return { evaluator: 'statusExtraction', score, reasoning };
}

function evaluateResponseLanguage(
  output: MarkenDNAChatOutput,
  input: TestCase['input']
): EvalResult {
  const expectedLanguage = input.language || 'de';
  const responseText = output.response || '';

  const germanMarkers = ['der', 'die', 'das', 'und', 'ist', 'wir', 'Sie', 'Ihr', 'für', 'nicht'];
  const englishMarkers = ['the', 'and', 'is', 'are', 'you', 'your', 'for', 'not', 'have', 'this'];

  const words = responseText.toLowerCase().split(/\s+/);
  const germanCount = words.filter(w => germanMarkers.includes(w)).length;
  const englishCount = words.filter(w => englishMarkers.includes(w)).length;

  let detectedLanguage: 'de' | 'en' | 'unknown' = 'unknown';
  if (germanCount > englishCount * 1.5) detectedLanguage = 'de';
  else if (englishCount > germanCount * 1.5) detectedLanguage = 'en';
  else if (germanCount > englishCount) detectedLanguage = 'de';
  else if (englishCount > germanCount) detectedLanguage = 'en';

  const isCorrect = detectedLanguage === expectedLanguage || detectedLanguage === 'unknown';

  return {
    evaluator: 'responseLanguage',
    score: isCorrect ? 1 : 0,
    reasoning: isCorrect
      ? `Response in expected language (${expectedLanguage})`
      : `Expected ${expectedLanguage}, detected ${detectedLanguage}`,
  };
}

function evaluateIterativeQuestioning(output: MarkenDNAChatOutput): EvalResult {
  const responseText = output.response || '';
  const questionCount = (responseText.match(/\?/g) || []).length;
  const numberedQuestions = (responseText.match(/\d+\.\s+[^?]*\?/g) || []).length;
  const effectiveCount = numberedQuestions > 0 ? numberedQuestions : questionCount;

  let score = 1;
  let reasoning = '';

  if (effectiveCount === 0) {
    score = 0.8;
    reasoning = 'No questions (may be summary phase)';
  } else if (effectiveCount <= 2) {
    score = 1;
    reasoning = `Good: ${effectiveCount} question(s) (iterative)`;
  } else if (effectiveCount <= 4) {
    score = 0.7;
    reasoning = `${effectiveCount} questions - slightly more than 1-2`;
  } else {
    score = 0.3;
    reasoning = `Too many questions (${effectiveCount})`;
  }

  return { evaluator: 'iterativeQuestioning', score, reasoning };
}

function evaluateDocumentStructure(output: MarkenDNAChatOutput): EvalResult {
  const document = output.document;
  if (!document) {
    return { evaluator: 'documentStructure', score: 1, reasoning: 'No document to evaluate' };
  }

  const hasHeadings = /^##?\s+.+$/m.test(document);
  const hasBulletPoints = /^[-*]\s+.+$/m.test(document);
  const hasNumberedList = /^\d+\.\s+.+$/m.test(document);
  const hasBoldText = /\*\*[^*]+\*\*/.test(document);

  let points = 0;
  if (hasHeadings) points += 1;
  if (hasBulletPoints || hasNumberedList) points += 1;
  if (hasBoldText) points += 0.5;

  const score = Math.min(1, points / 2);

  return {
    evaluator: 'documentStructure',
    score,
    reasoning: score >= 0.8 ? 'Well-structured Markdown' : 'Could use better structure',
  };
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

async function runEvaluation() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 MARKEN-DNA CHAT EVALUIERUNG');
  console.log('═══════════════════════════════════════════════════════════\n');

  const dataset = testDataset as TestCase[];
  const allResults: Array<{ testCaseId: string; results: EvalResult[] }> = [];

  console.log(`📊 Dataset: ${dataset.length} Testfälle`);
  console.log(`📏 Evaluatoren: 7 (heuristisch)\n`);

  for (let i = 0; i < dataset.length; i++) {
    const testCase = dataset[i];
    console.log(`\n[${i + 1}/${dataset.length}] 🔄 ${testCase.testCaseId}`);
    console.log(`    📝 ${testCase.description}`);

    try {
      // Flow ausführen
      const input = {
        documentType: testCase.input.documentType as 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages',
        companyId: testCase.input.companyId,
        companyName: testCase.input.companyName,
        language: testCase.input.language,
        messages: testCase.input.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        existingDocument: testCase.input.existingDocument || undefined,
      };

      console.log(`    ⏳ Flow ausführen...`);
      const output = await markenDNAChatFlow(input);

      console.log(`    ✅ Response: ${output.response?.length || 0} Zeichen`);
      if (output.progress !== undefined) console.log(`    📊 Progress: ${output.progress}%`);
      if (output.document) console.log(`    📄 Dokument: ${output.document.length} Zeichen`);
      if (output.suggestions?.length) console.log(`    💡 Vorschläge: ${output.suggestions.length}`);
      if (output.status) console.log(`    🏷️  Status: ${output.status}`);

      // Evaluierungen durchführen
      console.log(`    📏 Evaluiere...`);
      const results: EvalResult[] = [
        evaluateDocumentExtraction(output, testCase.reference),
        evaluateProgressExtraction(output, testCase.reference),
        evaluateSuggestionsExtraction(output, testCase.reference),
        evaluateStatusExtraction(output, testCase.reference),
        evaluateResponseLanguage(output, testCase.input),
        evaluateIterativeQuestioning(output),
        evaluateDocumentStructure(output),
      ];

      for (const result of results) {
        const emoji = result.score >= 0.8 ? '✅' : result.score >= 0.5 ? '⚠️' : '❌';
        console.log(`       ${emoji} ${result.evaluator}: ${(result.score * 100).toFixed(0)}% - ${result.reasoning}`);
      }

      allResults.push({ testCaseId: testCase.testCaseId, results });

    } catch (error: any) {
      console.log(`    ❌ FLOW ERROR: ${error.message}`);
      allResults.push({
        testCaseId: testCase.testCaseId,
        results: [{ evaluator: 'flow_execution', score: 0, reasoning: error.message }],
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ZUSAMMENFASSUNG
  // ══════════════════════════════════════════════════════════════

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 ZUSAMMENFASSUNG');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Durchschnitte pro Evaluator
  const evaluatorNames = ['documentExtraction', 'progressExtraction', 'suggestionsExtraction',
                          'statusExtraction', 'responseLanguage', 'iterativeQuestioning', 'documentStructure'];

  console.log('Durchschnittliche Scores pro Evaluator:');
  console.log('─────────────────────────────────────────');

  for (const evalName of evaluatorNames) {
    const scores = allResults
      .flatMap(r => r.results)
      .filter(r => r.evaluator === evalName)
      .map(r => r.score);

    if (scores.length > 0) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const emoji = avgScore >= 0.8 ? '✅' : avgScore >= 0.5 ? '⚠️' : '❌';
      console.log(`${emoji} ${evalName.padEnd(25)} ${(avgScore * 100).toFixed(1)}%`);
    }
  }

  // Gesamtdurchschnitt
  const allScores = allResults.flatMap(r => r.results).map(r => r.score);
  const overallAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  console.log('─────────────────────────────────────────');
  console.log(`📈 GESAMT                     ${(overallAvg * 100).toFixed(1)}%`);

  // Testfälle mit niedrigsten Scores
  console.log('\n\nTestfälle sortiert nach Score:');
  console.log('─────────────────────────────────────────');

  const testCaseAvgs = allResults.map(tc => {
    const avg = tc.results.reduce((sum, r) => sum + r.score, 0) / tc.results.length;
    return { testCaseId: tc.testCaseId, avg };
  }).sort((a, b) => a.avg - b.avg);

  for (const tc of testCaseAvgs) {
    const emoji = tc.avg >= 0.8 ? '✅' : tc.avg >= 0.5 ? '⚠️' : '❌';
    console.log(`${emoji} ${tc.testCaseId.padEnd(35)} ${(tc.avg * 100).toFixed(1)}%`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Evaluierung abgeschlossen!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Ausführen
runEvaluation().catch(console.error);

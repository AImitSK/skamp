// src/lib/ai/test-headlines-generation.ts
// Test-Script für Headlines-Generierung mit verschiedenen Szenarien

import * as fs from 'fs';
import * as path from 'path';
import { generateHeadlinesFlow } from './flows/generate-headlines';
import type { GenerateHeadlinesInput, GenerateHeadlinesOutput } from './schemas/headline-schemas';

// ══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════

interface TestCase {
  testCaseId: string;
  description: string;
  input: GenerateHeadlinesInput;
  reference: {
    expectedHeadlineCount: number;
    minLength: number;
    maxLength: number;
    shouldHaveActiveVerb: boolean;
    expectedStyles: string[];
    keywordsShouldAppear: string[];
    minSeoScore: number;
    qualityCriteria: Record<string, boolean>;
  };
}

interface TestResult {
  testCaseId: string;
  description: string;
  passed: boolean;
  output?: GenerateHeadlinesOutput;
  validations: ValidationResult[];
  errors: string[];
  executionTime: number;
}

interface ValidationResult {
  criterion: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageExecutionTime: number;
  results: TestResult[];
}

// ══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ══════════════════════════════════════════════════════════════

function validateHeadlineCount(output: GenerateHeadlinesOutput, expected: number): ValidationResult {
  const actual = output.headlines.length;
  return {
    criterion: 'Headline Count',
    passed: actual === expected,
    expected,
    actual,
    details: actual !== expected ? `Erwartet ${expected}, aber ${actual} erhalten` : undefined
  };
}

function validateHeadlineLengths(
  output: GenerateHeadlinesOutput,
  minLength: number,
  maxLength: number
): ValidationResult {
  const violations = output.headlines.filter(h => h.length < minLength || h.length > maxLength);
  const passed = violations.length === 0;

  return {
    criterion: 'Headline Lengths',
    passed,
    expected: `${minLength}-${maxLength} Zeichen`,
    actual: output.headlines.map(h => h.length).join(', '),
    details: passed ? undefined : `${violations.length} Headlines außerhalb des Bereichs: ${violations.map(h => `"${h.headline}" (${h.length})`).join(', ')}`
  };
}

function validateActiveVerbs(output: GenerateHeadlinesOutput): ValidationResult {
  const hasActiveVerb = output.headlines.some(h => h.hasActiveVerb);

  return {
    criterion: 'Active Verbs',
    passed: hasActiveVerb,
    expected: 'Mindestens 1 Headline mit aktivem Verb',
    actual: `${output.headlines.filter(h => h.hasActiveVerb).length} Headlines mit aktiven Verben`,
    details: hasActiveVerb ? undefined : 'Keine Headlines mit aktiven Verben gefunden'
  };
}

function validateStyles(output: GenerateHeadlinesOutput, expectedStyles: string[]): ValidationResult {
  const actualStyles = output.headlines.map(h => h.style);
  const allStylesPresent = expectedStyles.every(style => actualStyles.includes(style));

  return {
    criterion: 'Headline Styles',
    passed: allStylesPresent,
    expected: expectedStyles.join(', '),
    actual: actualStyles.join(', '),
    details: allStylesPresent ? undefined : `Fehlende Stile: ${expectedStyles.filter(s => !actualStyles.includes(s)).join(', ')}`
  };
}

function validateKeywords(output: GenerateHeadlinesOutput, keywords: string[]): ValidationResult {
  const allHeadlines = output.headlines.map(h => h.headline.toLowerCase()).join(' ');
  const foundKeywords = keywords.filter(kw => allHeadlines.includes(kw.toLowerCase()));
  const passed = foundKeywords.length >= Math.ceil(keywords.length * 0.6); // Mindestens 60% der Keywords

  return {
    criterion: 'Keyword Presence',
    passed,
    expected: `Mindestens 60% der Keywords (${Math.ceil(keywords.length * 0.6)} von ${keywords.length})`,
    actual: `${foundKeywords.length} von ${keywords.length} Keywords gefunden`,
    details: passed ? `Gefunden: ${foundKeywords.join(', ')}` : `Fehlend: ${keywords.filter(kw => !foundKeywords.includes(kw)).join(', ')}`
  };
}

function validateSeoScores(output: GenerateHeadlinesOutput, minScore: number): ValidationResult {
  const violations = output.headlines.filter(h => h.seoScore < minScore);
  const passed = violations.length === 0;
  const avgScore = Math.round(output.headlines.reduce((sum, h) => sum + h.seoScore, 0) / output.headlines.length);

  return {
    criterion: 'SEO Scores',
    passed,
    expected: `Alle Headlines >= ${minScore}%`,
    actual: `Durchschnitt: ${avgScore}%, Range: ${Math.min(...output.headlines.map(h => h.seoScore))}-${Math.max(...output.headlines.map(h => h.seoScore))}%`,
    details: passed ? undefined : `${violations.length} Headlines unter Minimum: ${violations.map(h => `${h.seoScore}%`).join(', ')}`
  };
}

function validateNoDuplicates(output: GenerateHeadlinesOutput): ValidationResult {
  const headlines = output.headlines.map(h => h.headline.toLowerCase());
  const uniqueHeadlines = new Set(headlines);
  const passed = headlines.length === uniqueHeadlines.size;

  return {
    criterion: 'No Duplicates',
    passed,
    expected: 'Alle Headlines unterschiedlich',
    actual: `${uniqueHeadlines.size} eindeutige von ${headlines.length}`,
    details: passed ? undefined : 'Duplikate gefunden'
  };
}

// ══════════════════════════════════════════════════════════════
// TEST EXECUTION
// ══════════════════════════════════════════════════════════════

async function runTestCase(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  const validations: ValidationResult[] = [];
  const errors: string[] = [];
  let output: GenerateHeadlinesOutput | undefined;
  let passed = false;

  try {
    console.log(`\n🧪 Running: ${testCase.testCaseId}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`📊 Content Length: ${testCase.input.content.length} chars`);

    // Flow ausführen
    output = await generateHeadlinesFlow(testCase.input);

    // Validierungen durchführen
    validations.push(validateHeadlineCount(output, testCase.reference.expectedHeadlineCount));
    validations.push(validateHeadlineLengths(output, testCase.reference.minLength, testCase.reference.maxLength));
    validations.push(validateActiveVerbs(output));
    validations.push(validateStyles(output, testCase.reference.expectedStyles));
    validations.push(validateKeywords(output, testCase.reference.keywordsShouldAppear));
    validations.push(validateSeoScores(output, testCase.reference.minSeoScore));
    validations.push(validateNoDuplicates(output));

    // Test bestanden, wenn alle Validierungen erfolgreich
    passed = validations.every(v => v.passed);

    // Output anzeigen
    console.log(`\n📰 Generated Headlines:`);
    output.headlines.forEach((h, i) => {
      const activeVerb = h.hasActiveVerb ? '✓' : '✗';
      console.log(`  ${i + 1}. [${h.style}] ${activeVerb} ${h.headline}`);
      console.log(`     Length: ${h.length}, SEO: ${h.seoScore}%, Keywords: ${h.keywordDensity}%`);
    });

  } catch (error: any) {
    errors.push(error.message || 'Unknown error');
    console.error(`❌ Error: ${error.message}`);
  }

  const executionTime = Date.now() - startTime;

  // Validierungsergebnisse anzeigen
  console.log(`\n📋 Validations:`);
  validations.forEach(v => {
    const icon = v.passed ? '✅' : '❌';
    console.log(`  ${icon} ${v.criterion}: ${v.passed ? 'PASSED' : 'FAILED'}`);
    if (!v.passed && v.details) {
      console.log(`     ${v.details}`);
    }
  });

  const result = passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`\n${result} (${executionTime}ms)`);

  return {
    testCaseId: testCase.testCaseId,
    description: testCase.description,
    passed,
    output,
    validations,
    errors,
    executionTime
  };
}

async function runAllTests(): Promise<TestSummary> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 HEADLINES GENERATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════');

  // Dataset laden
  const datasetPath = path.join(__dirname, 'test-data', 'generate-headlines-dataset.json');
  const dataset: TestCase[] = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  console.log(`\n📦 Loaded ${dataset.length} test cases from dataset`);

  // Alle Tests durchführen
  const results: TestResult[] = [];
  for (const testCase of dataset) {
    const result = await runTestCase(testCase);
    results.push(result);

    // Kurze Pause zwischen Tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Zusammenfassung berechnen
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const averageExecutionTime = Math.round(
    results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
  );

  // Ergebnisse zusammenfassen
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:     ${dataset.length}`);
  console.log(`✅ Passed:        ${passedTests} (${Math.round((passedTests / dataset.length) * 100)}%)`);
  console.log(`❌ Failed:        ${failedTests} (${Math.round((failedTests / dataset.length) * 100)}%)`);
  console.log(`⏱️  Avg Time:      ${averageExecutionTime}ms`);

  // Fehlgeschlagene Tests aufzeigen
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n  • ${r.testCaseId}: ${r.description}`);
      const failedValidations = r.validations.filter(v => !v.passed);
      failedValidations.forEach(v => {
        console.log(`    - ${v.criterion}: ${v.details || 'Failed'}`);
      });
      if (r.errors.length > 0) {
        console.log(`    - Errors: ${r.errors.join(', ')}`);
      }
    });
  }

  // Qualitätsmetriken
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 QUALITY METRICS');
  console.log('═══════════════════════════════════════════════════════════');

  const allValidations = results.flatMap(r => r.validations);
  const validationsByType = allValidations.reduce((acc, v) => {
    if (!acc[v.criterion]) {
      acc[v.criterion] = { passed: 0, total: 0 };
    }
    acc[v.criterion].total++;
    if (v.passed) acc[v.criterion].passed++;
    return acc;
  }, {} as Record<string, { passed: number; total: number }>);

  Object.entries(validationsByType).forEach(([criterion, stats]) => {
    const percentage = Math.round((stats.passed / stats.total) * 100);
    const icon = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
    console.log(`${icon} ${criterion.padEnd(20)}: ${stats.passed}/${stats.total} (${percentage}%)`);
  });

  // Ergebnisse in Datei speichern
  const resultsPath = path.join(__dirname, 'test-data', 'headlines-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: dataset.length,
      passedTests,
      failedTests,
      averageExecutionTime
    },
    results
  }, null, 2));

  console.log(`\n💾 Results saved to: ${resultsPath}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  return {
    totalTests: dataset.length,
    passedTests,
    failedTests,
    averageExecutionTime,
    results
  };
}

// ══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════

if (require.main === module) {
  runAllTests()
    .then(summary => {
      const exitCode = summary.failedTests === 0 ? 0 : 1;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests, runTestCase };

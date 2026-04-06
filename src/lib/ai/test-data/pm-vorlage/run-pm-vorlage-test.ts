// src/lib/ai/test-data/pm-vorlage/run-pm-vorlage-test.ts
// Test-Runner für PM-Vorlage Story-Qualität
// Führt Tests durch und speichert Protokolle

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { generatePMVorlageFlow } from '@/lib/ai/flows/generate-pm-vorlage';
import { pmVorlageTestCases, type PMVorlageTestCase } from './pm-vorlage.dataset';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPEN
// ============================================================================

interface TestResult {
  testCaseId: string;
  description: string;
  passed: boolean;
  durationMs: number;
  output: {
    headline: string;
    leadParagraph: string;
    bodyParagraphs: string[];
    quote: {
      text: string;
      person: string;
      role: string;
      company: string;
    };
    cta: string;
    hashtags: string[];
    wordCount: number;
  };
  validation: {
    headlineNotGeneric: { passed: boolean; reason: string };
    quoteContainsSpeaker: { passed: boolean; reason: string };
    containsRequired: { passed: boolean; missing: string[] };
    notContainsForbidden: { passed: boolean; found: string[] };
    minWordCount: { passed: boolean; actual: number; required: number };
  };
  rawText: string;
}

interface TestRunSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  totalDurationMs: number;
  results: TestResult[];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function isHeadlineGeneric(headline: string): { isGeneric: boolean; reason: string } {
  const genericPatterns = [
    { pattern: /^[\w\s-]+ startet [\w\s-]+$/i, name: 'X startet Y' },
    { pattern: /^[\w\s-]+ präsentiert [\w\s-]+$/i, name: 'X präsentiert Y' },
    { pattern: /^[\w\s-]+ lanciert [\w\s-]+$/i, name: 'X lanciert Y' },
    { pattern: /^[\w\s-]+ führt [\w\s-]+ ein$/i, name: 'X führt Y ein' },
    { pattern: /^Neues? [\w\s-]+ von [\w\s-]+$/i, name: 'Neues X von Y' },
    { pattern: /^[\w\s-]+ kündigt [\w\s-]+ an$/i, name: 'X kündigt Y an' },
  ];

  for (const { pattern, name } of genericPatterns) {
    if (pattern.test(headline)) {
      return { isGeneric: true, reason: `Matches generic pattern: "${name}"` };
    }
  }

  return { isGeneric: false, reason: 'Headline appears to have a hook' };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// ============================================================================
// TEST RUNNER FLOW
// ============================================================================

export const runPMVorlageTestFlow = ai.defineFlow(
  {
    name: 'runPMVorlageTest',
    inputSchema: z.object({
      testCaseIds: z.array(z.string()).optional().describe('Specific test case IDs to run, or all if empty'),
      saveProtocol: z.boolean().default(true).describe('Whether to save test protocol to file'),
    }),
    outputSchema: z.object({
      timestamp: z.string(),
      totalTests: z.number(),
      passed: z.number(),
      failed: z.number(),
      totalDurationMs: z.number(),
      results: z.array(z.any()),
    }),
  },
  async (input): Promise<TestRunSummary> => {
    const startTime = Date.now();
    const results: TestResult[] = [];

    // Test-Cases filtern
    const casesToRun = input.testCaseIds && input.testCaseIds.length > 0
      ? pmVorlageTestCases.filter(tc => input.testCaseIds!.includes(tc.id))
      : pmVorlageTestCases;

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('PM-VORLAGE STORY-QUALITÄT TEST');
    console.log(`Tests: ${casesToRun.length}`);
    console.log('════════════════════════════════════════════════════════════\n');

    for (const testCase of casesToRun) {
      console.log(`\n─── Test: ${testCase.id} ───`);
      console.log(`Description: ${testCase.description}`);

      const testStart = Date.now();

      try {
        // PM-Vorlage generieren
        const output = await generatePMVorlageFlow(testCase.input);

        // Volltext für Wortanzahl
        const fullText = [
          output.headline,
          output.leadParagraph,
          ...output.bodyParagraphs,
          output.quote?.text,
          output.cta
        ].filter(Boolean).join(' ');

        const wordCount = countWords(fullText);

        // Validierungen durchführen
        const headlineCheck = isHeadlineGeneric(output.headline);
        const headlineNotGeneric = {
          passed: testCase.expectations.headlineShouldNotBeGeneric ? !headlineCheck.isGeneric : true,
          reason: headlineCheck.reason
        };

        const quoteContainsSpeaker = {
          passed: output.quote?.person?.includes(testCase.expectations.quoteShouldContainSpeaker) || false,
          reason: output.quote?.person
            ? `Quote by: ${output.quote.person}`
            : 'No quote person found'
        };

        // shouldContain prüfen
        const missingTerms: string[] = [];
        if (testCase.expectations.shouldContain) {
          for (const term of testCase.expectations.shouldContain) {
            if (!fullText.toLowerCase().includes(term.toLowerCase())) {
              missingTerms.push(term);
            }
          }
        }
        const containsRequired = {
          passed: missingTerms.length === 0,
          missing: missingTerms
        };

        // shouldNotContain prüfen
        const foundForbidden: string[] = [];
        if (testCase.expectations.shouldNotContain) {
          for (const term of testCase.expectations.shouldNotContain) {
            if (fullText.toLowerCase().includes(term.toLowerCase())) {
              foundForbidden.push(term);
            }
          }
        }
        const notContainsForbidden = {
          passed: foundForbidden.length === 0,
          found: foundForbidden
        };

        // minWordCount prüfen
        const minWordCount = {
          passed: wordCount >= (testCase.expectations.minWordCount || 0),
          actual: wordCount,
          required: testCase.expectations.minWordCount || 0
        };

        // Gesamtergebnis
        const passed = headlineNotGeneric.passed &&
          quoteContainsSpeaker.passed &&
          containsRequired.passed &&
          notContainsForbidden.passed &&
          minWordCount.passed;

        const result: TestResult = {
          testCaseId: testCase.id,
          description: testCase.description,
          passed,
          durationMs: Date.now() - testStart,
          output: {
            headline: output.headline,
            leadParagraph: output.leadParagraph,
            bodyParagraphs: output.bodyParagraphs,
            quote: output.quote,
            cta: output.cta,
            hashtags: output.hashtags,
            wordCount
          },
          validation: {
            headlineNotGeneric,
            quoteContainsSpeaker,
            containsRequired,
            notContainsForbidden,
            minWordCount
          },
          rawText: output.rawText || ''
        };

        results.push(result);

        // Console Output
        console.log(`\nHeadline: "${output.headline}"`);
        console.log(`Lead: "${output.leadParagraph?.substring(0, 100)}..."`);
        console.log(`Quote by: ${output.quote?.person}`);
        console.log(`Word Count: ${wordCount}`);
        console.log(`\nValidation:`);
        console.log(`  ├─ Headline not generic: ${headlineNotGeneric.passed ? '✅' : '❌'} (${headlineNotGeneric.reason})`);
        console.log(`  ├─ Quote contains speaker: ${quoteContainsSpeaker.passed ? '✅' : '❌'} (${quoteContainsSpeaker.reason})`);
        console.log(`  ├─ Contains required terms: ${containsRequired.passed ? '✅' : '❌'} ${missingTerms.length > 0 ? `(missing: ${missingTerms.join(', ')})` : ''}`);
        console.log(`  ├─ No forbidden terms: ${notContainsForbidden.passed ? '✅' : '❌'} ${foundForbidden.length > 0 ? `(found: ${foundForbidden.join(', ')})` : ''}`);
        console.log(`  └─ Min word count: ${minWordCount.passed ? '✅' : '❌'} (${wordCount}/${minWordCount.required})`);
        console.log(`\nResult: ${passed ? '✅ PASSED' : '❌ FAILED'} (${Date.now() - testStart}ms)`);

      } catch (error: any) {
        console.error(`\n❌ Test failed with error: ${error.message}`);
        results.push({
          testCaseId: testCase.id,
          description: testCase.description,
          passed: false,
          durationMs: Date.now() - testStart,
          output: {
            headline: '',
            leadParagraph: '',
            bodyParagraphs: [],
            quote: { text: '', person: '', role: '', company: '' },
            cta: '',
            hashtags: [],
            wordCount: 0
          },
          validation: {
            headlineNotGeneric: { passed: false, reason: `Error: ${error.message}` },
            quoteContainsSpeaker: { passed: false, reason: 'Error' },
            containsRequired: { passed: false, missing: [] },
            notContainsForbidden: { passed: false, found: [] },
            minWordCount: { passed: false, actual: 0, required: 0 }
          },
          rawText: ''
        });
      }
    }

    // Summary
    const summary: TestRunSummary = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      totalDurationMs: Date.now() - startTime,
      results
    };

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`Total: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Duration: ${summary.totalDurationMs}ms`);
    console.log('════════════════════════════════════════════════════════════\n');

    // Protokoll speichern
    if (input.saveProtocol) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `pm-vorlage-test_${timestamp}.json`;
      const filepath = path.join(process.cwd(), 'docs', 'genkit', 'results', filename);

      try {
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2), 'utf-8');
        console.log(`📁 Protocol saved: ${filepath}`);
      } catch (err) {
        console.warn(`Could not save protocol: ${err}`);
      }
    }

    return summary;
  }
);

// ============================================================================
// EINZELTEST FLOW (für schnelle Iteration)
// ============================================================================

export const runSinglePMVorlageTestFlow = ai.defineFlow(
  {
    name: 'runSinglePMVorlageTest',
    inputSchema: z.object({
      testCaseId: z.string().describe('Test case ID to run'),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    return runPMVorlageTestFlow({
      testCaseIds: [input.testCaseId],
      saveProtocol: false
    });
  }
);

// src/lib/ai/agentic/test-data/save-protocol.ts
// Protokoll-Export für Test-Ergebnisse

import * as fs from 'fs';
import * as path from 'path';
import type { ScenarioResult, EvaluationMetrics } from './agentic-test-types';

/**
 * Pfad zum Protokoll-Ordner
 */
const PROTOCOL_DIR = path.join(process.cwd(), 'docs', 'agentic-chat', 'test-results');

/**
 * Erweitertes Protokoll-Format mit Evaluation
 */
export interface TestProtocol {
  // Basis-Ergebnis
  result: ScenarioResult;

  // Optional: Evaluation-Metriken
  evaluation?: {
    metrics: EvaluationMetrics;
    recommendations: string[];
  };

  // Metadata
  metadata: {
    version: string;
    genkitVersion: string;
    nodeVersion: string;
    savedAt: string;
  };
}

/**
 * Formatiert einen Timestamp für Dateinamen
 */
function formatTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .replace('T', '_')
    .slice(0, 19);
}

/**
 * Stellt sicher dass der Protokoll-Ordner existiert
 */
function ensureProtocolDir(): void {
  if (!fs.existsSync(PROTOCOL_DIR)) {
    fs.mkdirSync(PROTOCOL_DIR, { recursive: true });
    console.log(`[Protocol] Ordner erstellt: ${PROTOCOL_DIR}`);
  }
}

/**
 * Speichert ein Test-Protokoll als JSON-Datei
 *
 * @param result - Das ScenarioResult vom Test-Runner
 * @param evaluation - Optional: Evaluation-Ergebnis
 * @returns Der Pfad zur gespeicherten Datei
 */
export function saveTestProtocol(
  result: ScenarioResult,
  evaluation?: { metrics: EvaluationMetrics; recommendations: string[] }
): string {
  ensureProtocolDir();

  const timestamp = formatTimestamp(new Date(result.timestamp));
  const filename = `${result.scenarioId}_${timestamp}.json`;
  const filepath = path.join(PROTOCOL_DIR, filename);

  const protocol: TestProtocol = {
    result,
    evaluation,
    metadata: {
      version: '1.0.0',
      genkitVersion: 'genkit@1.x',
      nodeVersion: process.version,
      savedAt: new Date().toISOString(),
    },
  };

  fs.writeFileSync(filepath, JSON.stringify(protocol, null, 2), 'utf-8');

  console.log(`\n📝 Protokoll gespeichert: ${filepath}`);

  return filepath;
}

/**
 * Lädt ein Protokoll aus einer Datei
 */
export function loadTestProtocol(filepath: string): TestProtocol | null {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as TestProtocol;
  } catch (error) {
    console.error(`Fehler beim Laden des Protokolls: ${error}`);
    return null;
  }
}

/**
 * Listet alle Protokolle für ein Szenario auf
 */
export function listProtocols(scenarioId?: string): string[] {
  ensureProtocolDir();

  const files = fs.readdirSync(PROTOCOL_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !scenarioId || f.startsWith(scenarioId))
    .sort()
    .reverse(); // Neueste zuerst

  return files.map(f => path.join(PROTOCOL_DIR, f));
}

/**
 * Gibt das neueste Protokoll für ein Szenario zurück
 */
export function getLatestProtocol(scenarioId: string): TestProtocol | null {
  const protocols = listProtocols(scenarioId);
  if (protocols.length === 0) return null;
  return loadTestProtocol(protocols[0]);
}

/**
 * Erstellt einen lesbaren Markdown-Report aus einem Protokoll
 */
export function generateMarkdownReport(protocol: TestProtocol): string {
  const { result, evaluation } = protocol;
  const lines: string[] = [];

  // Header
  lines.push(`# Test-Protokoll: ${result.scenarioId}`);
  lines.push('');
  lines.push(`**Spezialist:** ${result.specialistType}`);
  lines.push(`**Zeitstempel:** ${result.timestamp}`);
  lines.push(`**Dauer:** ${result.totalDurationMs}ms`);
  lines.push(`**Status:** ${result.validation.passed ? '✅ BESTANDEN' : '❌ FEHLGESCHLAGEN'}`);
  lines.push('');

  // Zusammenfassung
  lines.push('## Zusammenfassung');
  lines.push('');
  lines.push(`- **Tool-Calls gesamt:** ${result.validation.totalToolCalls}`);
  lines.push(`- **Required Tools:** ${result.validation.requiredToolsPresent ? '✅' : '❌'}`);
  lines.push(`- **Confirm am Ende:** ${result.validation.endedWithConfirm ? '✅' : '❌'}`);
  lines.push(`- **Final Document:** ${result.validation.producedFinalDocument ? '✅' : '❌'}`);
  lines.push('');

  // Fehler
  if (result.validation.errors.length > 0) {
    lines.push('## Fehler');
    lines.push('');
    for (const error of result.validation.errors) {
      lines.push(`- ❌ ${error}`);
    }
    lines.push('');
  }

  // Evaluation
  if (evaluation) {
    lines.push('## Evaluation');
    lines.push('');
    lines.push(`- **Tool-Usage Score:** ${(evaluation.metrics.toolUsageScore * 100).toFixed(0)}%`);
    lines.push(`- **Response-Quality:** ${(evaluation.metrics.responseQualityScore * 100).toFixed(0)}%`);
    lines.push(`- **Adherence:** ${(evaluation.metrics.adherenceScore * 100).toFixed(0)}%`);
    lines.push(`- **Legacy-Free:** ${(evaluation.metrics.legacyFreeScore * 100).toFixed(0)}%`);
    lines.push(`- **Gesamt:** ${(evaluation.metrics.overallScore * 100).toFixed(0)}%`);
    lines.push('');

    if (evaluation.recommendations.length > 0) {
      lines.push('### Empfehlungen');
      lines.push('');
      for (const rec of evaluation.recommendations) {
        lines.push(`- 💡 ${rec}`);
      }
      lines.push('');
    }
  }

  // Turns
  lines.push('## Turns');
  lines.push('');

  for (const turn of result.turns) {
    lines.push(`### Turn ${turn.turnIndex + 1}`);
    lines.push('');
    lines.push(`**User:** ${turn.userMessage.substring(0, 200)}${turn.userMessage.length > 200 ? '...' : ''}`);
    lines.push('');
    lines.push(`**Assistant:** ${turn.assistantResponse.substring(0, 300)}${turn.assistantResponse.length > 300 ? '...' : ''}`);
    lines.push('');

    if (turn.toolCalls.length > 0) {
      lines.push('**Tool-Calls:**');
      for (const tc of turn.toolCalls) {
        lines.push(`- \`${tc.name}\`: ${JSON.stringify(tc.args).substring(0, 100)}...`);
      }
    } else {
      lines.push('**Tool-Calls:** keine');
    }
    lines.push('');

    lines.push(`**Validierung:** ${turn.validation.errors.length === 0 ? '✅' : '❌ ' + turn.validation.errors.join(', ')}`);
    lines.push(`**Dauer:** ${turn.durationMs}ms`);
    lines.push('');
  }

  // Tool-Übersicht
  lines.push('## Alle Tool-Calls');
  lines.push('');
  lines.push('| # | Tool | Args (gekürzt) | Success |');
  lines.push('|---|------|----------------|---------|');

  result.allToolCalls.forEach((tc, i) => {
    const args = JSON.stringify(tc.args).substring(0, 50);
    const success = tc.result && 'success' in tc.result ? (tc.result.success ? '✅' : '❌') : '?';
    lines.push(`| ${i + 1} | ${tc.name} | ${args}... | ${success} |`);
  });

  return lines.join('\n');
}

/**
 * Speichert zusätzlich einen Markdown-Report
 */
export function saveMarkdownReport(protocol: TestProtocol): string {
  ensureProtocolDir();

  const timestamp = formatTimestamp(new Date(protocol.result.timestamp));
  const filename = `${protocol.result.scenarioId}_${timestamp}.md`;
  const filepath = path.join(PROTOCOL_DIR, filename);

  const markdown = generateMarkdownReport(protocol);
  fs.writeFileSync(filepath, markdown, 'utf-8');

  console.log(`📄 Markdown-Report: ${filepath}`);

  return filepath;
}

/**
 * AI Usage Tracking Helpers
 *
 * Helper-Funktionen für Word-Counting und Usage-Tracking bei Genkit AI-Calls
 */

import { incrementAIWordsUsage } from '@/lib/usage/usage-tracker';

/**
 * Zählt Wörter in einem Text
 *
 * @param text - Der zu zählende Text
 * @returns Anzahl der Wörter
 */
export function countWords(text: string): number {
  if (!text || text.trim() === '') return 0;

  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Trackt AI-Usage basierend auf Input und Output
 *
 * @param organizationId - Organization ID
 * @param inputText - Input-Text (Prompt)
 * @param outputText - Output-Text (Generierte Response)
 * @returns Object mit Word-Counts
 */
export async function trackAIUsage(
  organizationId: string,
  inputText: string,
  outputText: string
): Promise<{
  inputWords: number;
  outputWords: number;
  totalWords: number;
}> {
  const inputWords = countWords(inputText);
  const outputWords = countWords(outputText);
  const totalWords = inputWords + outputWords;

  // Tracking in Firestore
  await incrementAIWordsUsage(organizationId, totalWords);

  console.log('📊 AI Usage tracked:', {
    input: inputWords,
    output: outputWords,
    total: totalWords,
    org: organizationId
  });

  return {
    inputWords,
    outputWords,
    totalWords
  };
}

/**
 * Schätzt die Anzahl der AI-Wörter für einen Input
 * (Wird für Pre-Checks verwendet)
 *
 * @param inputText - Input-Text
 * @param estimatedOutputWords - Geschätzte Output-Wörter (default: inputWords * 1.5)
 * @returns Geschätzte Gesamt-Wörter
 */
export function estimateAIWords(
  inputText: string,
  estimatedOutputWords?: number
): number {
  const inputWords = countWords(inputText);

  // Wenn keine Schätzung gegeben: Output ist typisch 1.5x Input
  const outputWords = estimatedOutputWords ?? Math.ceil(inputWords * 1.5);

  return inputWords + outputWords;
}

/**
 * Formatiert Word-Count in lesbare Form
 *
 * @param wordCount - Anzahl Wörter
 * @returns Formatierter String
 */
export function formatWordCount(wordCount: number): string {
  if (wordCount === -1) return 'Unbegrenzt';
  if (wordCount >= 1000000) return `${(wordCount / 1000000).toFixed(1)}M`;
  if (wordCount >= 1000) return `${(wordCount / 1000).toFixed(1)}K`;
  return wordCount.toString();
}

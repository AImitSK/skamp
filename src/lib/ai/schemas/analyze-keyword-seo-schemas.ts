// src/lib/ai/schemas/analyze-keyword-seo-schemas.ts
// Zod Schemas für SEO-Keyword-Analyse Flow

import { z } from 'genkit';

// ══════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════

/**
 * Zielgruppen-Kategorien für SEO-Analyse
 */
export const TargetAudienceEnum = z.enum([
  'B2B',              // Business-to-Business
  'B2C',              // Business-to-Consumer
  'Verbraucher',      // Endverbraucher/Privatpersonen
  'Fachpublikum',     // Experten/Fachleute
  'Medien',           // Journalisten/Presse
  'Investoren',       // Kapitalgeber/Finanzwelt
  'Mitarbeiter',      // Interne Kommunikation
  'Öffentlichkeit',   // Breite Öffentlichkeit
  'Unbekannt'         // Nicht eindeutig erkennbar
]);

export type TargetAudience = z.infer<typeof TargetAudienceEnum>;

/**
 * Tonalitäts-Kategorien für Content-Analyse
 */
export const TonalityEnum = z.enum([
  'Sachlich',         // Neutral, faktenorientiert
  'Emotional',        // Gefühlsbetont, persönlich
  'Verkäuferisch',    // Werblich, überzeugend
  'Professionell',    // Geschäftlich, seriös
  'Fachlich',         // Technisch, detailliert
  'Locker',           // Casual, entspannt
  'Formell',          // Offiziell, förmlich
  'Inspirierend',     // Motivierend, visionär
  'Neutral'           // Ausgeglichen, unparteiisch
]);

export type Tonality = z.infer<typeof TonalityEnum>;

// ══════════════════════════════════════════════════════════════
// INPUT SCHEMA
// ══════════════════════════════════════════════════════════════

/**
 * Input Schema für SEO-Keyword-Analyse
 *
 * Analysiert ein einzelnes Keyword im Kontext eines PR-Textes
 * und bewertet dessen SEO-Relevanz, Zielgruppe und Tonalität.
 */
export const AnalyzeKeywordSEOInputSchema = z.object({
  keyword: z.string()
    .min(1, 'Keyword darf nicht leer sein')
    .max(100, 'Keyword zu lang (max. 100 Zeichen)')
    .describe('Das zu analysierende SEO-Keyword'),

  text: z.string()
    .min(50, 'Text zu kurz für sinnvolle Analyse (min. 50 Zeichen)')
    .max(15000, 'Text zu lang (max. 15.000 Zeichen)')
    .describe('Der PR-Text zur Kontext-Analyse')
});

export type AnalyzeKeywordSEOInput = z.infer<typeof AnalyzeKeywordSEOInputSchema>;

// ══════════════════════════════════════════════════════════════
// OUTPUT SCHEMA
// ══════════════════════════════════════════════════════════════

/**
 * Output Schema für SEO-Keyword-Analyse
 *
 * Enthält alle SEO-relevanten Metriken und KI-basierte Insights.
 */
export const AnalyzeKeywordSEOOutputSchema = z.object({
  // Keyword-Identifikation
  keyword: z.string()
    .describe('Das analysierte Keyword (Echo)'),

  // SEO-Metriken (0-100 Skala)
  semanticRelevance: z.number()
    .min(0).max(100)
    .describe('Semantische Relevanz: Wie gut passt das Keyword thematisch zum Content? (0-100)'),

  contextQuality: z.number()
    .min(0).max(100)
    .describe('Kontext-Qualität: Wie natürlich ist das Keyword eingebunden? (0-100)'),

  // Zielgruppen-Analyse
  targetAudience: TargetAudienceEnum
    .describe('Erkannte Haupt-Zielgruppe des Contents'),

  targetAudienceConfidence: z.number()
    .min(0).max(100)
    .describe('Konfidenz der Zielgruppen-Erkennung (0-100)'),

  // Tonalitäts-Analyse
  tonality: TonalityEnum
    .describe('Erkannte Tonalität/Schreibstil des Contents'),

  tonalityConfidence: z.number()
    .min(0).max(100)
    .describe('Konfidenz der Tonalitäts-Erkennung (0-100)'),

  // Verwandte Begriffe
  relatedTerms: z.array(z.string())
    .min(0).max(5)
    .describe('Verwandte Begriffe aus dem Text (max. 5), die zum Keyword passen'),

  // Qualitative Insights
  keywordFit: z.enum(['excellent', 'good', 'fair', 'poor'])
    .describe('Gesamtbewertung der Keyword-Passung: excellent (>80), good (60-80), fair (40-60), poor (<40)'),

  recommendations: z.array(z.string())
    .max(3)
    .describe('Bis zu 3 konkrete Empfehlungen zur Verbesserung (optional)'),

  // Metadaten
  analysisTimestamp: z.string()
    .describe('ISO-8601 Zeitstempel der Analyse'),

  textLength: z.number()
    .describe('Länge des analysierten Texts in Zeichen')
});

export type AnalyzeKeywordSEOOutput = z.infer<typeof AnalyzeKeywordSEOOutputSchema>;

// ══════════════════════════════════════════════════════════════
// HELPER TYPES
// ══════════════════════════════════════════════════════════════

/**
 * Helper: Keyword-Fit-Klassifizierung
 */
export type KeywordFit = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Helper: Score → KeywordFit Mapper
 */
export function scoreToKeywordFit(score: number): KeywordFit {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Helper: Durchschnitts-Score aus semanticRelevance und contextQuality
 */
export function calculateAverageScore(semanticRelevance: number, contextQuality: number): number {
  return Math.round((semanticRelevance + contextQuality) / 2);
}

// src/lib/ai/schemas/headline-schemas.ts
// Zod Schemas für KI-gestützte Headline-Generierung (3 Varianten)

import { z } from 'genkit';

/**
 * Schema für eine einzelne Headline mit Metadaten
 */
export const HeadlineSchema = z.object({
  headline: z.string().describe('Die Headline selbst (40-75 Zeichen, SEO-optimiert)'),
  length: z.number().describe('Zeichenlänge der Headline'),
  hasActiveVerb: z.boolean().describe('Enthält aktive Verben (lanciert, startet, präsentiert)?'),
  keywordDensity: z.number().describe('Keyword-Dichte Schätzung (0-100)'),
  seoScore: z.number().describe('SEO-Score Schätzung (0-100)'),
  style: z.string().describe('Stil-Beschreibung (z.B. "Faktisch", "Emotional", "Technisch")')
});

/**
 * Schema für optionalen Kontext
 */
export const HeadlineContextSchema = z.object({
  industry: z.string().nullish().describe('Branche/Industrie'),
  tone: z.string().nullish().describe('Tonalität (z.B. formal, modern, technical)'),
  audience: z.string().nullish().describe('Zielgruppe (z.B. b2b, consumer, media)')
});

/**
 * Input Schema für Headline-Generierung
 */
export const GenerateHeadlinesInputSchema = z.object({
  content: z.string().describe('Content der Pressemitteilung (mind. 50 Zeichen)'),
  currentHeadline: z.string().nullish().describe('Aktuelle Headline (optional, für Verbesserung)'),
  context: HeadlineContextSchema.nullish().describe('Optionaler Kontext für bessere Ergebnisse')
});

/**
 * Output Schema für 3 Headline-Varianten
 */
export const GenerateHeadlinesOutputSchema = z.object({
  headlines: z.array(HeadlineSchema)
    .length(3)
    .describe('Genau 3 Headline-Varianten mit Metadaten'),
  analysisNote: z.string().describe('Kurze Erklärung der Headline-Strategien')
});

/**
 * Type Exports für TypeScript
 */
export type Headline = z.infer<typeof HeadlineSchema>;
export type HeadlineContext = z.infer<typeof HeadlineContextSchema>;
export type GenerateHeadlinesInput = z.infer<typeof GenerateHeadlinesInputSchema>;
export type GenerateHeadlinesOutput = z.infer<typeof GenerateHeadlinesOutputSchema>;

// src/lib/ai/schemas/text-transform-schemas.ts
// Zod Schemas für Text-Transformation im Editor (FloatingAIToolbar)

import { z } from 'genkit';

/**
 * Unterstützte Transformations-Aktionen
 */
export const TransformActionEnum = z.enum([
  'rephrase',      // Umformulieren (Synonyme)
  'shorten',       // Kürzen (~30%)
  'expand',        // Erweitern (~50%)
  'elaborate',     // Ausformulieren (Anweisung → Text)
  'change-tone',   // Tonalität ändern
  'custom'         // Custom Instruction
]);

/**
 * Tonalitäts-Optionen für change-tone
 */
export const ToneEnum = z.enum([
  'formal',        // Formell
  'casual',        // Locker
  'professional',  // Professionell
  'friendly',      // Freundlich
  'confident'      // Selbstbewusst
]);

/**
 * Input Schema für Text-Transformation
 */
export const TextTransformInputSchema = z.object({
  text: z.string()
    .describe('Der zu transformierende Text'),

  action: TransformActionEnum
    .describe('Die gewünschte Transformation'),

  tone: ToneEnum.nullish()
    .describe('Tonalität für change-tone Action (optional)'),

  instruction: z.string().nullish()
    .describe('Custom Instruction für custom Action (optional)'),

  fullDocument: z.string().nullish()
    .describe('Vollständiger Dokument-Kontext für kontextbewusste Transformation (optional)')
});

/**
 * Output Schema für Text-Transformation
 */
export const TextTransformOutputSchema = z.object({
  transformedText: z.string()
    .describe('Der transformierte Text'),

  action: z.string()
    .describe('Echo der ausgeführten Action'),

  originalLength: z.number()
    .describe('Länge des Original-Texts in Zeichen'),

  transformedLength: z.number()
    .describe('Länge des transformierten Texts in Zeichen'),

  wordCountChange: z.number()
    .describe('Änderung der Wortanzahl (positiv = mehr, negativ = weniger)'),

  timestamp: z.string()
    .describe('Zeitstempel der Transformation')
});

/**
 * Type Exports für TypeScript
 */
export type TransformAction = z.infer<typeof TransformActionEnum>;
export type Tone = z.infer<typeof ToneEnum>;
export type TextTransformInput = z.infer<typeof TextTransformInputSchema>;
export type TextTransformOutput = z.infer<typeof TextTransformOutputSchema>;

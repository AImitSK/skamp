// src/lib/ai/schemas/fakten-matrix-schemas.ts
// Zod Schemas für Fakten-Matrix Validierung

import { z } from 'genkit';

/**
 * Schema für Hook-Daten (W-Fragen)
 * Beantwortet: Was? Wo? Wann?
 */
export const FaktenMatrixHookSchema = z.object({
  event: z
    .string()
    .min(10, 'Ereignis muss mindestens 10 Zeichen haben')
    .max(500, 'Ereignis darf maximal 500 Zeichen haben')
    .describe('Was passiert genau? (Ereignis/Neuigkeit)'),

  location: z
    .string()
    .min(2, 'Ort muss angegeben werden')
    .max(200, 'Ort darf maximal 200 Zeichen haben')
    .describe('Ort des Geschehens'),

  date: z
    .string()
    .min(4, 'Datum muss angegeben werden')
    .max(100, 'Datum darf maximal 100 Zeichen haben')
    .describe('Zeitpunkt (Datum/Zeitraum)'),
});

/**
 * Schema für Details-Daten (Substanz)
 * Neuigkeitswert + Beweise
 */
export const FaktenMatrixDetailsSchema = z.object({
  delta: z
    .string()
    .min(20, 'Delta muss aussagekräftig sein (mindestens 20 Zeichen)')
    .max(1000, 'Delta darf maximal 1000 Zeichen haben')
    .describe('Neuigkeitswert gegenüber Status Quo (Was ist neu/anders?)'),

  evidence: z
    .string()
    .min(10, 'Beweise müssen angegeben werden (mindestens 10 Zeichen)')
    .max(1000, 'Beweise dürfen maximal 1000 Zeichen haben')
    .describe('Harte Beweise (Zahlen, Daten, technische Fakten)'),
});

/**
 * Schema für Quote-Daten (O-Ton)
 * Speaker-Referenz + Kernaussage
 */
export const FaktenMatrixQuoteSchema = z.object({
  speakerId: z
    .string()
    .min(1, 'Speaker-ID erforderlich')
    .describe('ID des Ansprechpartners aus der Marken-DNA'),

  rawStatement: z
    .string()
    .min(20, 'Kernaussage muss mindestens 20 Zeichen haben')
    .max(1500, 'Kernaussage darf maximal 1500 Zeichen haben')
    .describe('Die im Chat erarbeitete Kernaussage (kann auch längere O-Töne enthalten)'),
});

/**
 * Haupt-Schema für Fakten-Matrix
 * Wird vom Project-Wizard Tool-Call verwendet
 */
export const FaktenMatrixSchema = z.object({
  hook: FaktenMatrixHookSchema.describe('Hook - Die W-Fragen'),
  details: FaktenMatrixDetailsSchema.describe('Details - Die Substanz'),
  quote: FaktenMatrixQuoteSchema.describe('Quote - Der O-Ton'),
});

/**
 * Type Exports für TypeScript
 */
export type FaktenMatrixInput = z.infer<typeof FaktenMatrixSchema>;
export type FaktenMatrixHookInput = z.infer<typeof FaktenMatrixHookSchema>;
export type FaktenMatrixDetailsInput = z.infer<typeof FaktenMatrixDetailsSchema>;
export type FaktenMatrixQuoteInput = z.infer<typeof FaktenMatrixQuoteSchema>;

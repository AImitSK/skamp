// src/lib/ai/schemas/pm-vorlage-schemas.ts
// Zod Schemas für PM-Vorlage Validierung

import { z } from 'genkit';

/**
 * Schema für Quote-Struktur in PM-Vorlage
 */
export const PMVorlageQuoteSchema = z.object({
  text: z
    .string()
    .min(20, 'Zitat muss mindestens 20 Zeichen haben')
    .max(500, 'Zitat darf maximal 500 Zeichen haben')
    .describe('Zitat-Text (ausformuliert)'),

  person: z
    .string()
    .min(2, 'Name der Person erforderlich')
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .describe('Name der zitierten Person'),

  role: z
    .string()
    .min(2, 'Rolle/Position erforderlich')
    .max(100, 'Rolle darf maximal 100 Zeichen haben')
    .describe('Position/Rolle der Person'),

  company: z
    .string()
    .min(2, 'Unternehmensname erforderlich')
    .max(100, 'Unternehmensname darf maximal 100 Zeichen haben')
    .describe('Unternehmen der Person'),
});

/**
 * Schema für PM-Vorlage Content (versionierbarer Teil)
 */
export const PMVorlageContentSchema = z.object({
  headline: z
    .string()
    .min(10, 'Headline muss mindestens 10 Zeichen haben')
    .max(75, 'Headline darf maximal 75 Zeichen haben (SEO)')
    .describe('Headline (40-75 Zeichen, SEO-optimiert)'),

  leadParagraph: z
    .string()
    .min(80, 'Lead-Paragraph muss mindestens 80 Zeichen haben')
    .max(200, 'Lead-Paragraph darf maximal 200 Zeichen haben')
    .describe('Lead-Paragraph (5 W-Fragen)'),

  bodyParagraphs: z
    .array(
      z
        .string()
        .min(150, 'Body-Paragraph muss mindestens 150 Zeichen haben')
        .max(400, 'Body-Paragraph darf maximal 400 Zeichen haben')
    )
    .min(3, 'Mindestens 3 Body-Paragraphs erforderlich')
    .max(4, 'Maximal 4 Body-Paragraphs erlaubt')
    .describe('Body-Paragraphs (3-4 Absätze)'),

  quote: PMVorlageQuoteSchema.describe('Zitat mit vollständiger Attribution'),

  cta: z
    .string()
    .min(20, 'Call-to-Action muss mindestens 20 Zeichen haben')
    .max(300, 'Call-to-Action darf maximal 300 Zeichen haben')
    .describe('Call-to-Action mit Kontaktdaten'),

  hashtags: z
    .array(z.string().min(2).max(50))
    .min(2, 'Mindestens 2 Hashtags erforderlich')
    .max(3, 'Maximal 3 Hashtags erlaubt')
    .describe('2-3 relevante Hashtags für Social Media'),

  htmlContent: z
    .string()
    .min(100, 'HTML-Content erforderlich')
    .describe('Fertig formatierter HTML-Content für den Editor'),
});

/**
 * Schema für PM-Vorlage History-Entry
 */
export const PMVorlageHistoryEntrySchema = z.object({
  content: PMVorlageContentSchema.describe('Content der Version'),
  generatedAt: z
    .any()
    .describe('Zeitpunkt der Generierung (Firestore Timestamp)'),
});

/**
 * Haupt-Schema für PM-Vorlage
 */
export const PMVorlageSchema = z.object({
  headline: z
    .string()
    .min(10, 'Headline muss mindestens 10 Zeichen haben')
    .max(75, 'Headline darf maximal 75 Zeichen haben (SEO)')
    .describe('Headline (40-75 Zeichen, SEO-optimiert)'),

  leadParagraph: z
    .string()
    .min(80, 'Lead-Paragraph muss mindestens 80 Zeichen haben')
    .max(200, 'Lead-Paragraph darf maximal 200 Zeichen haben')
    .describe('Lead-Paragraph (5 W-Fragen)'),

  bodyParagraphs: z
    .array(
      z
        .string()
        .min(150, 'Body-Paragraph muss mindestens 150 Zeichen haben')
        .max(400, 'Body-Paragraph darf maximal 400 Zeichen haben')
    )
    .min(3, 'Mindestens 3 Body-Paragraphs erforderlich')
    .max(4, 'Maximal 4 Body-Paragraphs erlaubt')
    .describe('Body-Paragraphs (3-4 Absätze)'),

  quote: PMVorlageQuoteSchema.describe('Zitat mit vollständiger Attribution'),

  cta: z
    .string()
    .min(20, 'Call-to-Action muss mindestens 20 Zeichen haben')
    .max(300, 'Call-to-Action darf maximal 300 Zeichen haben')
    .describe('Call-to-Action mit Kontaktdaten'),

  hashtags: z
    .array(z.string().min(2).max(50))
    .min(2, 'Mindestens 2 Hashtags erforderlich')
    .max(3, 'Maximal 3 Hashtags erlaubt')
    .describe('2-3 relevante Hashtags für Social Media'),

  htmlContent: z
    .string()
    .min(100, 'HTML-Content erforderlich')
    .describe('Fertig formatierter HTML-Content für den Editor'),

  generatedAt: z
    .any()
    .describe('Zeitpunkt der Generierung (Firestore Timestamp)'),

  targetGroup: z
    .enum(['ZG1', 'ZG2', 'ZG3'])
    .describe('Zielgruppe für die diese Vorlage generiert wurde'),

  markenDNAHash: z
    .string()
    .min(8, 'Marken-DNA Hash erforderlich')
    .describe('Hash der Marken-DNA zum Zeitpunkt der Generierung'),

  faktenMatrixHash: z
    .string()
    .min(8, 'Fakten-Matrix Hash erforderlich')
    .describe('Hash der Fakten-Matrix zum Zeitpunkt der Generierung'),

  history: z
    .array(PMVorlageHistoryEntrySchema)
    .max(3, 'Maximal 3 History-Einträge erlaubt')
    .optional()
    .describe('History-Array mit den letzten 3 Versionen'),
});

/**
 * Input-Schema für PM-Vorlage Generierung
 */
export const GeneratePMVorlageInputSchema = z.object({
  projectId: z
    .string()
    .min(1, 'Project-ID erforderlich')
    .describe('ID des Projekts'),

  companyId: z
    .string()
    .min(1, 'Company-ID erforderlich')
    .describe('ID des Unternehmens'),

  targetGroup: z
    .enum(['ZG1', 'ZG2', 'ZG3'])
    .optional()
    .describe('Zielgruppe (optional, Standard: ZG1)'),
});

/**
 * Type Exports für TypeScript
 */
export type PMVorlageInput = z.infer<typeof PMVorlageSchema>;
export type PMVorlageContentInput = z.infer<typeof PMVorlageContentSchema>;
export type PMVorlageQuoteInput = z.infer<typeof PMVorlageQuoteSchema>;
export type PMVorlageHistoryEntryInput = z.infer<typeof PMVorlageHistoryEntrySchema>;
export type GeneratePMVorlageInput = z.infer<typeof GeneratePMVorlageInputSchema>;

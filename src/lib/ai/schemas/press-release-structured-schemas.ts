// src/lib/ai/schemas/press-release-structured-schemas.ts
// Zod Schemas für strukturierte Pressemitteilungs-Generierung

import { z } from 'genkit';

/**
 * Schema für Dokumenten-Kontext
 * Ermöglicht das Einbinden von bis zu 3 Planungsdokumenten
 */
export const DocumentSchema = z.object({
  fileName: z.string().describe('Name der Datei'),
  plainText: z.string().describe('Volltext des Dokuments'),
  excerpt: z.string().describe('Kurzer Auszug/Zusammenfassung')
});

export const DocumentContextSchema = z.object({
  documents: z.array(DocumentSchema)
    .max(3)
    .describe('Maximal 3 Dokumente zur Kontext-Anreicherung')
});

/**
 * Schema für optionalen Kontext
 */
export const PressReleaseContextSchema = z.object({
  industry: z.string().nullish().describe('Branche/Industrie (z.B. technology, healthcare, finance)'),
  tone: z.string().nullish().describe('Tonalität (z.B. formal, modern, technical, startup)'),
  audience: z.string().nullish().describe('Zielgruppe (z.B. b2b, consumer, media)'),
  companyName: z.string().nullish().describe('Name des Unternehmens')
});

/**
 * Input Schema für strukturierte Pressemitteilungs-Generierung
 */
export const GeneratePressReleaseStructuredInputSchema = z.object({
  prompt: z.string().describe('Hauptanfrage/Thema der Pressemitteilung'),
  context: PressReleaseContextSchema.nullish().describe('Optionaler Kontext für bessere Ergebnisse'),
  documentContext: DocumentContextSchema.nullish().describe('Optionale Dokumente als Kontext (max. 3)')
});

/**
 * Schema für Zitat-Struktur
 */
export const QuoteSchema = z.object({
  text: z.string().describe('Zitat-Text'),
  person: z.string().describe('Name der zitierten Person'),
  role: z.string().describe('Position/Rolle der Person'),
  company: z.string().describe('Unternehmen der Person')
});

/**
 * Output Schema für strukturierte Pressemitteilung
 */
export const StructuredPressReleaseSchema = z.object({
  headline: z.string().describe('Schlagzeile (40-75 Zeichen, SEO-optimiert)'),
  leadParagraph: z.string().describe('Lead-Absatz mit 5 W-Fragen (80-200 Zeichen)'),
  bodyParagraphs: z.array(z.string()).describe('Haupt-Absätze (3-4 Absätze, je 150-400 Zeichen)'),
  quote: QuoteSchema.describe('Zitat mit vollständiger Attribution'),
  cta: z.string().describe('Call-to-Action mit Kontaktdaten'),
  hashtags: z.array(z.string()).describe('2-3 relevante Hashtags für Social Media'),
  socialOptimized: z.boolean().describe('Ist die PR für Social Media optimiert? (Headline ≤280 Zeichen)'),
  htmlContent: z.string().describe('Fertig formatierter HTML-Content für den Editor')
});

/**
 * Type Exports für TypeScript
 */
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentContext = z.infer<typeof DocumentContextSchema>;
export type PressReleaseContext = z.infer<typeof PressReleaseContextSchema>;
export type GeneratePressReleaseStructuredInput = z.infer<typeof GeneratePressReleaseStructuredInputSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type StructuredPressRelease = z.infer<typeof StructuredPressReleaseSchema>;

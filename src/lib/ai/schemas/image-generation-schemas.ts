// src/lib/ai/schemas/image-generation-schemas.ts
// Zod Schemas für KI-gestützte Bildgenerierung (Prompts + Imagen)

import { z } from 'genkit';

// ══════════════════════════════════════════════════════════════
// PROMPT-GENERIERUNG SCHEMAS
// ══════════════════════════════════════════════════════════════

/**
 * Schema für optionalen Kontext bei der Prompt-Generierung
 */
export const ImagePromptContextSchema = z.object({
  industry: z.string().nullish().describe('Branche/Industrie (z.B. technology, healthcare, finance)'),
  tone: z.string().nullish().describe('Tonalität (z.B. professional, innovative, trustworthy)'),
  companyName: z.string().nullish().describe('Firmenname für Bildkontext')
});

/**
 * Input Schema für Bildprompt-Generierung
 */
export const GenerateImagePromptsInputSchema = z.object({
  content: z.string().describe('Content der Pressemitteilung (mind. 100 Zeichen)'),
  context: ImagePromptContextSchema.nullish().describe('Optionaler Kontext für bessere Ergebnisse')
});

/**
 * Schema für einen einzelnen Bildvorschlag
 */
export const ImagePromptSuggestionSchema = z.object({
  prompt: z.string().describe('Englischer Imagen-Prompt (optimiert für Bildgenerierung)'),
  description: z.string().describe('Deutsche Beschreibung für den User'),
  style: z.enum(['Fotorealistisch', 'Business', 'Konzeptuell']).describe('Bildstil'),
  mood: z.enum(['Professionell', 'Innovativ', 'Vertrauenswürdig', 'Dynamisch', 'Sachlich']).describe('Bildstimmung')
});

/**
 * Output Schema für 3 Bildvorschläge
 */
export const GenerateImagePromptsOutputSchema = z.object({
  suggestions: z.array(ImagePromptSuggestionSchema)
    .length(3)
    .describe('Genau 3 Bildvorschläge mit unterschiedlichen Stilen'),
  analysisNote: z.string().nullish().describe('Kurze Erklärung der Bildkonzepte')
});

// ══════════════════════════════════════════════════════════════
// BILDGENERIERUNG SCHEMAS (Imagen)
// ══════════════════════════════════════════════════════════════

/**
 * Input Schema für Imagen Bildgenerierung
 */
export const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('Der ausgewählte Imagen-Prompt (englisch)'),
  aspectRatio: z.literal('16:9').default('16:9').describe('Seitenverhältnis für Key Visual'),
  negativePrompt: z.string().nullish().describe('Optionaler negativer Prompt')
});

/**
 * Output Schema für generiertes Bild
 */
export const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('Data-URL oder Base64-kodiertes Bild'),
  width: z.number().describe('Bildbreite in Pixeln'),
  height: z.number().describe('Bildhöhe in Pixeln'),
  format: z.enum(['png', 'jpeg', 'webp']).describe('Bildformat'),
  prompt: z.string().describe('Verwendeter Prompt (für Metadaten)')
});

// ══════════════════════════════════════════════════════════════
// UPLOAD/SPEICHER SCHEMAS
// ══════════════════════════════════════════════════════════════

/**
 * Input Schema für Bild-Upload nach Generierung
 */
export const SaveGeneratedImageInputSchema = z.object({
  imageData: z.string().describe('Base64-kodiertes Bild'),
  organizationId: z.string().describe('Organisation ID'),
  projectId: z.string().describe('Projekt ID für Medien-Ordner'),
  projectName: z.string().describe('Projekt Name für Ordner-Suche'),
  prompt: z.string().describe('Verwendeter Prompt (für Metadaten)'),
  campaignId: z.string().nullish().describe('Optionale Campaign ID'),
  campaignName: z.string().nullish().describe('Optionaler Campaign Name')
});

/**
 * Output Schema für gespeichertes Bild
 */
export const SaveGeneratedImageOutputSchema = z.object({
  downloadUrl: z.string().describe('Firebase Storage Download-URL'),
  assetId: z.string().describe('Media Asset ID in Firestore'),
  folderId: z.string().describe('KI-Bilder Ordner ID'),
  storagePath: z.string().describe('Pfad in Firebase Storage')
});

// ══════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════

export type ImagePromptContext = z.infer<typeof ImagePromptContextSchema>;
export type GenerateImagePromptsInput = z.infer<typeof GenerateImagePromptsInputSchema>;
export type ImagePromptSuggestion = z.infer<typeof ImagePromptSuggestionSchema>;
export type GenerateImagePromptsOutput = z.infer<typeof GenerateImagePromptsOutputSchema>;

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export type SaveGeneratedImageInput = z.infer<typeof SaveGeneratedImageInputSchema>;
export type SaveGeneratedImageOutput = z.infer<typeof SaveGeneratedImageOutputSchema>;

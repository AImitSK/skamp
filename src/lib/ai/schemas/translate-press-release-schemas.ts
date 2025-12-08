// src/lib/ai/schemas/translate-press-release-schemas.ts
// Zod Schemas für KI-gestützte Pressemitteilungs-Übersetzung

import { z } from 'genkit';

/**
 * Glossar-Eintrag für die Übersetzung
 */
export const GlossaryEntrySchema = z.object({
  /** Quellbegriff (z.B. Deutsch) */
  source: z.string()
    .describe('Der Begriff in der Quellsprache'),

  /** Zielbegriff (z.B. Englisch) */
  target: z.string()
    .describe('Der Begriff in der Zielsprache'),

  /** Optionaler Kontext für die Verwendung */
  context: z.string().nullish()
    .describe('Kontext/Beschreibung wann dieser Begriff verwendet wird'),

  /** Glossar-Eintrag ID für Tracking */
  id: z.string().nullish()
    .describe('ID des Glossar-Eintrags für Tracking')
});

/**
 * Boilerplate-Section Schema für Übersetzung
 * Enthält strukturierte Firmen-Informationen, Zitate, etc.
 */
export const BoilerplateSectionSchema = z.object({
  /** Eindeutige ID der Section */
  id: z.string()
    .describe('Eindeutige ID der Boilerplate-Section'),

  /** Typ der Section */
  type: z.enum(['boilerplate', 'lead', 'main', 'quote']).optional()
    .describe('Art des Inhalts'),

  /** HTML-Inhalt der Section */
  content: z.string()
    .describe('HTML-Inhalt der Boilerplate-Section'),

  /** Optionaler Titel (z.B. "Über die Firma") */
  customTitle: z.string().nullish()
    .describe('Optionaler Titel der Section'),

  /** Metadaten für Zitate */
  metadata: z.object({
    person: z.string().nullish(),
    role: z.string().nullish(),
    company: z.string().nullish()
  }).nullish()
    .describe('Metadaten für Zitate (Person, Rolle, Firma)')
});

/**
 * Input Schema für Pressemitteilungs-Übersetzung
 */
export const TranslatePressReleaseInputSchema = z.object({
  /** HTML Content der Pressemitteilung */
  content: z.string()
    .describe('Der HTML-Content der Pressemitteilung'),

  /** Titel der Pressemitteilung */
  title: z.string()
    .describe('Der Titel der Pressemitteilung'),

  /** Quellsprache (ISO 639-1) */
  sourceLanguage: z.string()
    .describe('Quellsprache der Pressemitteilung (z.B. "de")'),

  /** Zielsprache (ISO 639-1) */
  targetLanguage: z.string()
    .describe('Zielsprache für die Übersetzung (z.B. "en")'),

  /** Kundenspezifische Glossar-Einträge */
  glossaryEntries: z.array(GlossaryEntrySchema).nullish()
    .describe('Kundenspezifische Fachbegriffe die exakt übersetzt werden müssen'),

  /** Boilerplate-Sections (Firmeninfos, Zitate, etc.) */
  boilerplateSections: z.array(BoilerplateSectionSchema).nullish()
    .describe('Strukturierte Boilerplate-Sections die separat übersetzt werden'),

  /** HTML-Formatierung beibehalten */
  preserveFormatting: z.boolean().default(true)
    .describe('Ob die HTML-Formatierung exakt beibehalten werden soll'),

  /** Kunden-ID für Tracking */
  customerId: z.string().nullish()
    .describe('Kunden-ID für Glossar-Zuordnung'),

  /** Ton der Übersetzung */
  tone: z.enum(['formal', 'professional', 'neutral']).default('professional')
    .describe('Tonalität der Übersetzung')
});

/**
 * Output Schema für Pressemitteilungs-Übersetzung
 */
/**
 * Übersetzte Boilerplate-Section
 */
export const TranslatedBoilerplateSectionSchema = z.object({
  /** ID der originalen Section */
  id: z.string(),
  /** Übersetzter Inhalt */
  translatedContent: z.string(),
  /** Übersetzter Titel (falls vorhanden) */
  translatedTitle: z.string().nullish()
});

export const TranslatePressReleaseOutputSchema = z.object({
  /** Übersetzter HTML-Content */
  translatedContent: z.string()
    .describe('Der übersetzte HTML-Content'),

  /** Übersetzter Titel */
  translatedTitle: z.string()
    .describe('Der übersetzte Titel'),

  /** Übersetzte Boilerplate-Sections */
  translatedBoilerplates: z.array(TranslatedBoilerplateSectionSchema).nullish()
    .describe('Die übersetzten Boilerplate-Sections'),

  /** IDs der verwendeten Glossar-Einträge */
  glossaryUsed: z.array(z.string())
    .describe('IDs der Glossar-Einträge die in der Übersetzung verwendet wurden'),

  /** Konfidenz der Übersetzung (0-1) */
  confidence: z.number().min(0).max(1)
    .describe('Qualitäts-Score der Übersetzung (0.0-1.0)'),

  /** Quellsprache (Echo) */
  sourceLanguage: z.string()
    .describe('Echo der Quellsprache'),

  /** Zielsprache (Echo) */
  targetLanguage: z.string()
    .describe('Echo der Zielsprache'),

  /** Statistiken */
  stats: z.object({
    originalCharCount: z.number()
      .describe('Zeichenanzahl des Originals'),
    translatedCharCount: z.number()
      .describe('Zeichenanzahl der Übersetzung'),
    glossaryMatchCount: z.number()
      .describe('Anzahl der Glossar-Treffer'),
    boilerplatesTranslated: z.number().optional()
      .describe('Anzahl der übersetzten Boilerplates')
  }).describe('Übersetzungs-Statistiken'),

  /** Zeitstempel */
  timestamp: z.string()
    .describe('Zeitstempel der Übersetzung'),

  /** Verwendetes Modell */
  modelUsed: z.string()
    .describe('Name des verwendeten KI-Modells')
});

/**
 * Type Exports für TypeScript
 */
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
export type BoilerplateSection = z.infer<typeof BoilerplateSectionSchema>;
export type TranslatedBoilerplateSection = z.infer<typeof TranslatedBoilerplateSectionSchema>;
export type TranslatePressReleaseInput = z.infer<typeof TranslatePressReleaseInputSchema>;
export type TranslatePressReleaseOutput = z.infer<typeof TranslatePressReleaseOutputSchema>;

/**
 * Sprach-Namen Mapping für Prompts
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  'de': 'Deutsch',
  'en': 'Englisch',
  'fr': 'Französisch',
  'es': 'Spanisch',
  'it': 'Italienisch',
  'nl': 'Niederländisch',
  'pl': 'Polnisch',
  'pt': 'Portugiesisch',
  'cs': 'Tschechisch',
  'da': 'Dänisch',
  'sv': 'Schwedisch',
  'no': 'Norwegisch',
  'fi': 'Finnisch',
  'hu': 'Ungarisch',
  'ro': 'Rumänisch',
  'bg': 'Bulgarisch',
  'el': 'Griechisch',
  'tr': 'Türkisch',
  'ru': 'Russisch',
  'zh': 'Chinesisch',
  'ja': 'Japanisch',
  'ko': 'Koreanisch',
  'ar': 'Arabisch'
};

/**
 * Gibt den Sprachnamen für einen ISO-Code zurück
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

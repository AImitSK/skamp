// src/lib/ai/flows/merge-variants.ts
// Genkit Flow für intelligentes Mergen von Kontakt-Varianten
// HINWEIS: Nur via dynamischem Import in Server-Context verwenden!

import { ai, gemini20Flash } from '../genkit-config';
import {
  MergeVariantsInputSchema,
  MergedContactSchema,
  type MergedContact,
  type MergeVariantsInput
} from '../schemas/merge-schemas';

/**
 * Genkit Flow: Merge Variants
 *
 * Nimmt mehrere Varianten eines Journalisten und merged sie intelligent zu einem Datensatz.
 *
 * Features:
 * - Type-Safe Input/Output (Zod)
 * - Automatisches Retry bei Fehlern
 * - Observability in Firebase Console
 * - Validierung durch Gemini 2.0 Flash
 *
 * @example
 * const result = await mergeVariantsFlow({ variants: [variant1, variant2] });
 * // result ist automatisch vom Typ MergedContact
 */
export const mergeVariantsFlow = ai.defineFlow(
  {
    name: 'mergeVariants',
    inputSchema: MergeVariantsInputSchema,
    outputSchema: MergedContactSchema
  },
  async (input: MergeVariantsInput): Promise<MergedContact> => {
    const { variants } = input;

    console.log(`🤖 Genkit Flow: Merging ${variants.length} variants with AI...`);

    // Extrahiere nur contactData für einfacheren Prompt
    const contactDataOnly = variants.map(v => v.contactData);

    // Baue Prompt mit Output-Template
    const prompt = `Merge ${variants.length} Journalist-Kontakte zu EINEM optimalen Kontakt.

INPUT - Kontakte zum Mergen:
${JSON.stringify(contactDataOnly, null, 2)}

AUFGABE: Erstelle EIN gemergtes Contact-Objekt mit dieser EXAKTEN Struktur:

{
  "name": {
    "firstName": "...",
    "lastName": "...",
    "title": "..." (optional: Dr., Prof., etc.),
    "suffix": "..." (optional)
  },
  "displayName": "Vorname Nachname",
  "emails": [
    { "email": "...", "type": "business|private", "isPrimary": true }
  ],
  "phones": [
    { "number": "...", "type": "mobile|business", "isPrimary": true }
  ],
  "position": "...",
  "department": "...",
  "companyName": "...",
  "companyId": "...",
  "hasMediaProfile": true,
  "beats": ["..."],
  "mediaTypes": ["print", "online", "tv"],
  "publications": ["..."],
  "socialProfiles": [
    { "platform": "...", "url": "...", "handle": "..." }
  ],
  "photoUrl": "...",
  "website": "..."
}

MERGE-REGELN:
- NAME: Vollständigste Form (mit title falls vorhanden)
- EMAILS: ALLE aus ALLEN Kontakten sammeln (dedupliziert)
- PHONES: ALLE aus ALLEN Kontakten sammeln (dedupliziert)
- BEATS: ALLE aus ALLEN Kontakten sammeln (dedupliziert)
- PUBLICATIONS: ALLE aus ALLEN Kontakten sammeln (dedupliziert)
- MEDIA_TYPES: ALLE aus ALLEN Kontakten sammeln (dedupliziert)

KRITISCH: Antworte NUR mit einem Objekt dieser Struktur. KEIN Array! KEINE zusätzlichen Felder!`;

    try {
      // Genkit Generate mit Structured Output
      const result = await ai.generate({
        model: gemini20Flash,
        output: {
          schema: MergedContactSchema
        },
        prompt,
        config: {
          temperature: 0.5, // Höher: Gemini folgt Schema besser
          maxOutputTokens: 4096, // Genug Platz für komplette Response
          topP: 0.95
        }
      });

      console.log('✅ AI-Merge erfolgreich!');
      console.log('🐛 DEBUG - Raw result:', JSON.stringify(result, null, 2).substring(0, 500));
      console.log('📋 Gemergter Datensatz:', {
        name: result.output.displayName,
        emails: result.output.emails?.length || 0,
        phones: result.output.phones?.length || 0,
        beats: result.output.beats?.length || 0,
        publications: result.output.publications?.length || 0
      });

      // 🐛 DEBUG: Log komplettes Output um zu sehen was Gemini zurückgibt
      console.log('🐛 DEBUG - Komplettes Genkit Output:', JSON.stringify(result.output, null, 2));

      // 🛡️ Validierung: Prüfe ob Genkit ein valides Objekt zurückgab
      if (!result.output || typeof result.output !== 'object') {
        console.error('❌ Genkit gab kein valides Objekt zurück:', result.output);
        throw new Error('Invalid Genkit output: Not an object');
      }

      if (!result.output.displayName || !result.output.name) {
        console.error('❌ Genkit gab kein valides Contact-Objekt zurück (fehlender Name)');
        throw new Error('Invalid Genkit output: Missing required name fields');
      }

      // ✅ WICHTIG: Fallbacks für fehlende Required-Felder (falls KI Schema nicht perfekt befolgt)

      // Emails ist REQUIRED im Schema
      if (!result.output.emails?.length) {
        console.log('⚠️  KI gab keine Emails zurück → Nehme von erster Variante');
        result.output.emails = variants[0].contactData.emails;
      }

      // Publications (optional, aber wichtig)
      if (!result.output.publications?.length) {
        const allPublications = new Set<string>();
        for (const variant of variants) {
          if (variant.contactData.publications?.length) {
            variant.contactData.publications.forEach(pub => allPublications.add(pub));
          }
        }
        result.output.publications = Array.from(allPublications);
        if (result.output.publications.length > 0) {
          console.log(`⚠️  KI gab keine Publications zurück → ${result.output.publications.length} aus Varianten gesammelt`);
        }
      }

      return result.output;

    } catch (error) {
      console.error('❌ AI-Merge fehlgeschlagen:', error);

      // Fallback: Nutze erste Variante (beste Datenqualität)
      console.log('⤵️  Fallback: Nutze erste Variante ohne AI-Merge');
      const firstVariant = variants[0].contactData;

      return {
        name: firstVariant.name,
        displayName: firstVariant.displayName,
        emails: firstVariant.emails,
        phones: firstVariant.phones,
        position: firstVariant.position,
        department: firstVariant.department,
        companyName: firstVariant.companyName,
        companyId: firstVariant.companyId,
        hasMediaProfile: firstVariant.hasMediaProfile,
        beats: firstVariant.beats,
        mediaTypes: firstVariant.mediaTypes,
        publications: firstVariant.publications,
        socialProfiles: firstVariant.socialProfiles,
        photoUrl: firstVariant.photoUrl,
        website: firstVariant.website
      };
    }
  }
);

/**
 * Helper: Direkt aufrufbare Funktion (für Nicht-Flow-Kontext)
 */
export async function mergeVariants(variants: any[]): Promise<MergedContact> {
  return await mergeVariantsFlow({ variants });
}

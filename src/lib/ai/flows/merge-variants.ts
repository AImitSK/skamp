// src/lib/ai/flows/merge-variants.ts
// Genkit Flow für intelligentes Mergen von Kontakt-Varianten
// HINWEIS: Nur via dynamischem Import in Server-Context verwenden!

import { ai, gemini25FlashModel } from '../genkit-config';
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
      // Genkit Generate mit JSON Mode (nicht Structured Output!)
      // Structured Output hat Probleme mit verschachtelten Objekten
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: {
          temperature: 0.5,
          maxOutputTokens: 4096,
          topP: 0.95,
          response_mime_type: 'application/json' // ✅ JSON Mode
        }
      });

      console.log('✅ AI-Merge Response erhalten!');
      console.log('🐛 DEBUG - Raw result:', JSON.stringify(result, null, 2).substring(0, 500));

      // Manuelles JSON Parsing (da kein Structured Output)
      const textOutput = result.text();
      console.log('🐛 DEBUG - Text Output (erste 500 chars):', textOutput.substring(0, 500));

      // Parse JSON
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(textOutput);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('Text war:', textOutput.substring(0, 1000));
        throw new Error('Failed to parse JSON from Gemini response');
      }

      // Validiere gegen Schema
      const validated = MergedContactSchema.parse(parsedOutput);

      console.log('✅ AI-Merge erfolgreich und validiert!');
      console.log('📋 Gemergter Datensatz:', {
        name: validated.displayName,
        emails: validated.emails?.length || 0,
        phones: validated.phones?.length || 0,
        beats: validated.beats?.length || 0,
        publications: validated.publications?.length || 0
      });

      // 🛡️ Validierung: Prüfe Pflichtfelder
      if (!validated.displayName || !validated.name) {
        console.error('❌ Validierung fehlgeschlagen: Fehlende Pflichtfelder');
        throw new Error('Invalid output: Missing required name fields');
      }

      // ✅ WICHTIG: Fallbacks für fehlende Required-Felder (falls KI Schema nicht perfekt befolgt)

      // Emails ist REQUIRED im Schema
      if (!validated.emails?.length) {
        console.log('⚠️  KI gab keine Emails zurück → Nehme von erster Variante');
        validated.emails = variants[0].contactData.emails;
      }

      // Publications (optional, aber wichtig)
      if (!validated.publications?.length) {
        const allPublications = new Set<string>();
        for (const variant of variants) {
          if (variant.contactData.publications?.length) {
            variant.contactData.publications.forEach(pub => allPublications.add(pub));
          }
        }
        validated.publications = Array.from(allPublications);
        if (validated.publications.length > 0) {
          console.log(`⚠️  KI gab keine Publications zurück → ${validated.publications.length} aus Varianten gesammelt`);
        }
      }

      return validated;

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

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
    inputSchema: MergeVariantsInputSchema as any,
    outputSchema: MergedContactSchema as any
  },
  async (input: MergeVariantsInput): Promise<MergedContact> => {
    const { variants } = input;

    console.log(`🤖 Genkit Flow: Merging ${variants.length} variants with AI...`);

    // Extrahiere nur contactData für einfacheren Prompt
    const contactDataOnly = variants.map(v => v.contactData);

    // Baue Prompt mit Output-Template
    const prompt = `Du bist ein Daten-Merge-Experte. Deine Aufgabe ist es, ${variants.length} Journalist-Kontakte zu EINEM vollständigen Kontakt zu mergen.

WICHTIG: Du musst ALLE Daten aus ALLEN ${variants.length} Kontakten sammeln und kombinieren. NIEMALS nur einen Kontakt nehmen!

INPUT - ${variants.length} Kontakte zum Mergen:
${JSON.stringify(contactDataOnly, null, 2)}

SCHRITT-FÜR-SCHRITT MERGE-PROZESS:

1. EMAILS sammeln:
   - Gehe durch JEDEN der ${variants.length} Kontakte
   - Sammle JEDE E-Mail-Adresse
   - Dedupliziere basierend auf E-Mail-Adresse (case-insensitive)
   - Behalte alle unterschiedlichen E-Mails

2. BEATS sammeln:
   - Gehe durch JEDEN der ${variants.length} Kontakte
   - Sammle JEDEN Beat/Themenschwerpunkt
   - Dedupliziere (case-insensitive)
   - Beispiel: ["Bundespolitik"] + ["Bundespolitik", "Europapolitik"] = ["Bundespolitik", "Europapolitik"]

3. PUBLICATIONS sammeln:
   - Gehe durch JEDEN der ${variants.length} Kontakte
   - Sammle JEDE Publication
   - Dedupliziere (case-insensitive)
   - Beispiel: ["Süddeutsche Zeitung"] + ["Süddeutsche Zeitung", "SZ Online"] = ["Süddeutsche Zeitung", "SZ Online"]

4. PHONES sammeln:
   - Gehe durch JEDEN der ${variants.length} Kontakte
   - Sammle JEDE Telefonnummer
   - Dedupliziere basierend auf number
   - Behalte alle unterschiedlichen Telefonnummern

5. SOCIAL PROFILES sammeln:
   - Gehe durch JEDEN der ${variants.length} Kontakte
   - Sammle JEDES Social Profile
   - Dedupliziere basierend auf platform

6. MEDIA TYPES sammeln:
   - Gehe durch JEDEN der ${variants.length} Kontakte
   - Sammle JEDEN Media Type
   - Dedupliziere

7. NAME & TITLE:
   - Nimm den vollständigsten Namen (mit title falls vorhanden)

8. POSITION:
   - Nimm die detaillierteste/höchste Position

OUTPUT-STRUKTUR (EXAKT so zurückgeben):

{
  "name": {
    "firstName": "...",
    "lastName": "...",
    "title": "..." (Dr., Prof., etc. ODER null wenn nicht vorhanden),
    "suffix": "..." (ODER null)
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

BEISPIEL:
Input:
  Kontakt 1: emails: ["a@test.de"], beats: ["Politik"]
  Kontakt 2: emails: ["a@test.de", "b@test.de"], beats: ["Politik", "Wirtschaft"]

Korrekter Output:
  emails: ["a@test.de", "b@test.de"]  // BEIDE E-Mails!
  beats: ["Politik", "Wirtschaft"]     // BEIDE Beats!

Falscher Output (NIEMALS so!):
  emails: ["a@test.de"]                // ❌ b@test.de fehlt!
  beats: ["Politik"]                   // ❌ Wirtschaft fehlt!

KRITISCH:
- Antworte NUR mit einem JSON-Objekt
- KEIN Array, KEIN Text davor/danach
- ALLE Daten aus ALLEN ${variants.length} Kontakten müssen enthalten sein!`;

    try {
      // Genkit Generate mit JSON Mode (nicht Structured Output!)
      // Structured Output hat Probleme mit verschachtelten Objekten
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: {
          temperature: 0.2, // Niedrig für konsistentes Merging
          maxOutputTokens: 4096,
          topP: 0.95,
          response_mime_type: 'application/json' // ✅ JSON Mode
        }
      });

      console.log('✅ AI-Merge Response erhalten!');
      console.log('🐛 DEBUG - Raw result:', JSON.stringify(result, null, 2).substring(0, 500));

      // Extrahiere Text aus Genkit Response Struktur
      const textOutput = result.message?.content?.[0]?.text || result.text || JSON.stringify(result);
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

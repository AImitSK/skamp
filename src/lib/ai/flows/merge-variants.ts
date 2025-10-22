// src/lib/ai/flows/merge-variants.ts
// Genkit Flow für intelligentes Mergen von Kontakt-Varianten

import 'server-only'; // ✅ Nur auf dem Server ausführen

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

    // Baue intelligenten Prompt
    const prompt = `Du bist ein Daten-Merge-Experte für Journalisten-Kontakte.

AUFGABE:
Merge diese ${variants.length} Varianten eines Journalisten zu EINEM optimalen Datensatz.

VARIANTEN:
${JSON.stringify(variants, null, 2)}

MERGE-REGELN:

1. NAME:
   - Wähle den vollständigsten Namen (mit title/suffix wenn vorhanden)
   - Bevorzuge formale Schreibweise (Dr., Prof.)

2. E-MAILS:
   - Vereinige ALLE eindeutigen E-Mail-Adressen
   - Dedupliziere (gleiche E-Mails nur einmal)
   - Markiere eine als primary (bevorzugt: geschäftliche E-Mail von Medienunternehmen)
   - Wenn eine E-Mail @spiegel.de, @zeit.de, @faz.net etc. → isPrimary = true

3. TELEFONE:
   - Vereinige ALLE eindeutigen Telefonnummern
   - Dedupliziere
   - Markiere eine als primary (bevorzugt: mobile)

4. POSITION:
   - Wähle die aussagekräftigste/aktuellste Position
   - Bevorzuge spezifischere Titel (z.B. "Chefredakteur Politik" > "Redakteur")

5. COMPANY:
   - Wähle den vollständigsten Company-Namen
   - Bei Konflikt: Verwende die Company mit der verifizierten E-Mail-Domain

6. MEDIA PROFILE:
   - hasMediaProfile = true wenn IRGENDEINE Variante Journalist ist
   - beats: Vereinigung ALLER Beats (dedupliziert)
   - mediaTypes: Vereinigung ALLER mediaTypes (dedupliziert)
   - publications: Vereinigung ALLER Publications (dedupliziert)

7. SOCIAL PROFILES:
   - Vereinige ALLE Social Profiles (dedupliziert nach platform)

8. QUALITÄT:
   - photoUrl: Wähle die erste verfügbare URL
   - website: Wähle die erste verfügbare URL

WICHTIG:
- Keine Informationen erfinden!
- Nur vorhandene Daten verwenden
- Bei Unsicherheit: Nimm den Wert aus der Variante mit den meisten Daten
- displayName: Formatiere als "Vorname Nachname" (ohne title/suffix)

Antworte NUR mit dem gemergten JSON-Objekt im korrekten Schema-Format.`;

    try {
      // Genkit Generate mit Structured Output
      const result = await ai.generate({
        model: gemini20Flash,
        output: {
          schema: MergedContactSchema
        },
        prompt,
        config: {
          temperature: 0.1, // Low = deterministischer
          maxOutputTokens: 2048,
          topP: 0.95
        }
      });

      console.log('✅ AI-Merge erfolgreich!');
      console.log('📋 Gemergter Datensatz:', {
        name: result.output.displayName,
        emails: result.output.emails.length,
        phones: result.output.phones?.length || 0,
        beats: result.output.beats?.length || 0,
        publications: result.output.publications?.length || 0
      });

      // ✅ WICHTIG: Fallback für Publications (falls KI keine zurückgibt)
      if (!result.output.publications || result.output.publications.length === 0) {
        const allPublications = new Set<string>();
        for (const variant of variants) {
          if (variant.contactData.publications) {
            variant.contactData.publications.forEach(pub => allPublications.add(pub));
          }
        }
        result.output.publications = Array.from(allPublications);
        console.log(`⚠️  KI gab keine Publications zurück → ${result.output.publications.length} aus Varianten gesammelt`);
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

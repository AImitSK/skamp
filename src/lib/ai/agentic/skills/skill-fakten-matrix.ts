// src/lib/ai/agentic/skills/skill-fakten-matrix.ts
// Skill: Speichert die Fakten-Matrix strukturiert (Phase 2 PM-Refactoring)

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { FaktenMatrixSchema } from '../../schemas/fakten-matrix-schemas';

/**
 * skill_save_fakten_matrix
 *
 * Wird vom Project-Wizard aufgerufen, um die gesammelten Fakten
 * strukturiert zu speichern.
 *
 * WICHTIG: Dieser Skill verwendet JSON statt Markdown-Parsing!
 * Der Wizard liefert strukturierte Daten via Tool-Call.
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "hook": {
 *     "event": "Produktlaunch XY",
 *     "location": "Berlin",
 *     "date": "15. Januar 2025"
 *   },
 *   "details": {
 *     "delta": "Erste KI-gestuetzte Loesung am Markt",
 *     "evidence": "50% schneller, 30% guenstiger, ISO-zertifiziert"
 *   },
 *   "quote": {
 *     "speakerId": "contact_ceo_123",
 *     "rawStatement": "Mit dieser Innovation setzen wir neue Massstaebe"
 *   }
 * }
 * ```
 */
export const skillSaveFaktenMatrix = ai.defineTool(
  {
    name: 'skill_save_fakten_matrix',
    description: `Speichert die gesammelten Fakten strukturiert als Fakten-Matrix.

WANN VERWENDEN:
Rufe dieses Tool auf, wenn du ALLE folgenden Informationen gesammelt hast:

1. HOOK (W-Fragen):
   - event: Was passiert genau? (Ereignis/Neuigkeit)
   - location: Wo findet es statt?
   - date: Wann ist/war es?

2. DETAILS (Substanz):
   - delta: Was ist der Neuigkeitswert? (Was ist neu/anders?)
   - evidence: Welche harten Beweise gibt es? (Zahlen, Daten, Fakten)

3. QUOTE (O-Ton):
   - speakerId: ID des gewaehlten Ansprechpartners aus der Marken-DNA
   - rawStatement: Die erarbeitete Kernaussage

WICHTIG:
- Stelle sicher, dass ALLE Felder ausgefuellt sind
- Verwende die speakerId aus der DNA-Kontaktliste (nicht den Namen!)
- Die rawStatement sollte authentisch und zitierfaehig sein

Nach erfolgreichem Speichern wird die Fakten-Matrix fuer die PM-Vorlage-Generierung verwendet.`,
    inputSchema: FaktenMatrixSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      faktenMatrix: FaktenMatrixSchema.optional(),
    }),
  },
  async (input) => {
    // Die eigentliche Speicherung erfolgt im Agentic-Handler,
    // der Zugriff auf projectId und Services hat.
    // Hier validieren wir nur die Struktur und geben sie zurueck.

    return {
      success: true,
      message: 'Fakten-Matrix erfolgreich validiert und bereit zum Speichern.',
      faktenMatrix: input,
    };
  }
);

/**
 * Prompt-Instruktion fuer den Project-Wizard
 *
 * Diese Instruktion wird dem Wizard-Prompt hinzugefuegt,
 * um ihn anzuweisen, die Fakten-Matrix via Tool-Call zu speichern.
 */
export const WIZARD_FAKTEN_MATRIX_INSTRUCTION = `
## Fakten-Matrix Speichern

Wenn du ALLE folgenden Informationen im Chat gesammelt hast, rufe das Tool "skill_save_fakten_matrix" auf:

### Benoetigte Informationen:

1. **HOOK (W-Fragen)**
   - Was passiert genau? (Ereignis/Neuigkeit)
   - Wo findet es statt?
   - Wann ist/war es?

2. **DETAILS (Substanz)**
   - Was ist der Neuigkeitswert gegenueber dem Status Quo?
   - Welche harten Beweise gibt es? (Zahlen, Daten, technische Fakten)

3. **QUOTE (O-Ton)**
   - Wer soll zitiert werden? (waehle aus den DNA-Kontakten)
   - Was ist die Kernaussage? (erarbeite sie im Chat)

### Tool-Call Format:

\`\`\`json
{
  "hook": {
    "event": "Was genau passiert",
    "location": "Ort des Geschehens",
    "date": "Zeitpunkt"
  },
  "details": {
    "delta": "Der Neuigkeitswert",
    "evidence": "Harte Beweise und Zahlen"
  },
  "quote": {
    "speakerId": "ID des gewaehlten Ansprechpartners",
    "rawStatement": "Die erarbeitete Kernaussage"
  }
}
\`\`\`

WICHTIG: Speichere die Fakten-Matrix ERST, wenn der User alle Informationen bestaetigt hat!
`;

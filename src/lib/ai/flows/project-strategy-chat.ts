// src/lib/ai/flows/project-strategy-chat.ts
// Genkit Flow für Projekt-Kernbotschaft Chat
// Phase 3: KI-Chat Backend (Strategie-Tab Integration)

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const ProjectStrategyChatInputSchema = z.object({
  projectId: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  messages: z.array(ChatMessageSchema),
  dnaSynthese: z.string().optional(), // 🧪 DNA Synthese als Kontext
});

export const ProjectStrategyChatOutputSchema = z.object({
  response: z.string(),
  document: z.string().optional(),      // Extrahiertes [DOCUMENT]...[/DOCUMENT]
  progress: z.number().optional(),       // Extrahiertes [PROGRESS:XX]
  suggestions: z.array(z.string()).optional(), // Extrahierte [SUGGESTIONS]
  status: z.enum(['draft', 'completed']).optional(), // Status fuer Speicherung
});

export type ProjectStrategyChatInput = z.infer<typeof ProjectStrategyChatInputSchema>;
export type ProjectStrategyChatOutput = z.infer<typeof ProjectStrategyChatOutputSchema>;

// ============================================================================
// FLOW DEFINITION
// ============================================================================

export const projectStrategyChatFlow = ai.defineFlow(
  {
    name: 'projectStrategyChatFlow',
    inputSchema: ProjectStrategyChatInputSchema,
    outputSchema: ProjectStrategyChatOutputSchema,
  },
  async (input) => {
    const systemPrompt = buildProjectStrategyPrompt(
      input.language,
      input.companyName,
      input.dnaSynthese
    );

    // Nachrichten für Genkit formatieren
    const formattedMessages = input.messages.map(msg => ({
      role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
      content: [{ text: msg.content }],
    }));

    // Generieren mit Gemini
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: systemPrompt,
      messages: formattedMessages,
      config: { temperature: 0.7 },
    });

    const responseText = response.text;

    // Strukturierte Daten aus Response extrahieren
    const document = extractDocument(responseText);
    const progress = extractProgress(responseText);

    // Status bestimmen: completed wenn Dokument vorhanden oder Progress >= 100
    const status = document || (progress && progress >= 100) ? 'completed' : 'draft';

    return {
      response: responseText,
      document,
      progress,
      suggestions: extractSuggestions(responseText),
      status,
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Baut den System-Prompt für Projekt-Kernbotschaft zusammen
 */
function buildProjectStrategyPrompt(
  language: 'de' | 'en',
  companyName: string,
  dnaSynthese?: string
): string {
  const isDE = language === 'de';

  let prompt = isDE
    ? `Du bist ein PR-Stratege der eine Projekt-Kernbotschaft für ${companyName} erarbeitet.`
    : `You are a PR strategist developing a project key message for ${companyName}.`;

  // DNA Synthese als Kontext einbinden
  if (dnaSynthese) {
    prompt += isDE
      ? `

🧪 DNA SYNTHESE (nutze diese als Leitplanken):
${dnaSynthese}
`
      : `

🧪 DNA SYNTHESIS (use this as guidelines):
${dnaSynthese}
`;
  }

  // Hauptteil des Prompts
  prompt += isDE
    ? `

DEIN ZIEL:
Erarbeite die spezifische Strategie für DIESES PROJEKT.

FRAGEN:

1. DER ANLASS (News-Hook):
   - Worüber berichten wir? (Produktneuheit, Personalie, Event?)
   - Was macht das Thema nachrichtenrelevant?

2. DAS MASSNAHMENZIEL:
   - Was soll dieser Text konkret erreichen?
   - Klicks? Anmeldungen? Imagepflege?

3. DIE TEILBOTSCHAFT:
   - Welches spezifische Detail soll kommuniziert werden?
   - z.B. "Das neue Feature spart 20% Zeit"

4. DAS MATERIAL:
   - Welche Fakten, Zitate oder Daten gibt es?
   - Gibt es Zitate vom Geschäftsführer?

REGELN:
- Stelle 1-2 Fragen auf einmal
- Fasse Antworten zusammen
- Generiere am Ende die Projekt-Kernbotschaft

AUSGABE-FORMAT:
Wenn du die Kernbotschaft erstellst, nutze:
[DOCUMENT]
## Projekt-Kernbotschaft
...
[/DOCUMENT]

Fortschritt: [PROGRESS:XX]

Vorschläge:
[SUGGESTIONS]
...
[/SUGGESTIONS]
`
    : `

YOUR GOAL:
Develop the specific strategy for THIS PROJECT.

QUESTIONS:

1. THE OCCASION (News Hook):
   - What are we reporting about? (Product launch, personnel, event?)
   - What makes this topic newsworthy?

2. THE MEASURE GOAL:
   - What should this text specifically achieve?
   - Clicks? Sign-ups? Image maintenance?

3. THE SUB-MESSAGE:
   - What specific detail should be communicated?
   - e.g. "The new feature saves 20% time"

4. THE MATERIAL:
   - What facts, quotes or data are available?
   - Are there quotes from the CEO?

RULES:
- Ask 1-2 questions at a time
- Summarize answers
- Generate the project key message at the end

OUTPUT FORMAT:
When creating the key message, use:
[DOCUMENT]
## Project Key Message
...
[/DOCUMENT]

Progress: [PROGRESS:XX]

Suggestions:
[SUGGESTIONS]
...
[/SUGGESTIONS]
`;

  return prompt;
}

/**
 * Extrahiert Dokument-Content aus [DOCUMENT]...[/DOCUMENT] Tags
 */
function extractDocument(text: string): string | undefined {
  const match = text.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  return match ? match[1].trim() : undefined;
}

/**
 * Extrahiert Fortschritt aus [PROGRESS:XX] Tag
 */
function extractProgress(text: string): number | undefined {
  const match = text.match(/\[PROGRESS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Extrahiert Vorschläge aus [SUGGESTIONS]...[/SUGGESTIONS] Tags
 */
function extractSuggestions(text: string): string[] | undefined {
  const match = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (!match) return undefined;

  return match[1]
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

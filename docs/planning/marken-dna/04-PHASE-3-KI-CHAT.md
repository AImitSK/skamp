# Phase 3: KI-Chat Backend (Genkit Flows + Streaming)

> **Workflow-Agent:** Für die Implementierung dieser Phase den `marken-dna-impl` Agent verwenden.
> Siehe `10-WORKFLOW-AGENT.md` für Details zum schrittweisen Workflow.

## Ziel

Backend-Infrastruktur für die KI-Chats erstellen: Genkit Flows mit Streaming und mehrsprachige System-Prompts für alle 6 Marken-DNA Dokumenttypen.

> **Frontend-Implementierung:** Siehe `08-CHAT-UI-KONZEPT.md` für die vollständige Chat-UI.

---

## Tech-Stack Entscheidung

| Aspekt | Gewählt | Begründung |
|--------|---------|------------|
| **Framework** | Genkit | Bereits im Projekt, Flows, Evaluators, DevUI |
| **Streaming** | Genkit `streamFlow()` | Native Streaming-Unterstützung |
| **Model** | Google Gemini via `@genkit-ai/google-genai` | Bereits konfiguriert |
| **Prompts** | Eigene Prompt-Dateien | Mehrsprachig, wartbar, testbar |

### Bestehende Infrastruktur nutzen

```typescript
// Bereits vorhanden: src/lib/ai/genkit-config.ts
import { ai } from '@/lib/ai/genkit-config';
import { gemini25FlashModel } from '@/lib/ai/genkit-config';
```

---

## Aufgaben

### 3.1 Genkit Flow für Marken-DNA Chat

**Datei:** `src/lib/ai/flows/marken-dna-chat.ts`

```typescript
import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getSystemPrompt, getOutputFormatInstructions } from '@/lib/ai/prompts/marken-dna-prompts';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const MarkenDNAChatInputSchema = z.object({
  documentType: z.enum(['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages']),
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  messages: z.array(ChatMessageSchema),
  existingDocument: z.string().optional(), // Für "Umarbeiten"-Modus
});

const MarkenDNAChatOutputSchema = z.object({
  response: z.string(),
  document: z.string().optional(),      // Extrahiertes [DOCUMENT]...[/DOCUMENT]
  progress: z.number().optional(),       // Extrahiertes [PROGRESS:XX]
  suggestions: z.array(z.string()).optional(), // Extrahierte [SUGGESTIONS]
});

export type MarkenDNAChatInput = z.infer<typeof MarkenDNAChatInputSchema>;
export type MarkenDNAChatOutput = z.infer<typeof MarkenDNAChatOutputSchema>;

// ============================================================================
// FLOW DEFINITION
// ============================================================================

export const markenDNAChatFlow = ai.defineFlow(
  {
    name: 'markenDNAChatFlow',
    inputSchema: MarkenDNAChatInputSchema,
    outputSchema: MarkenDNAChatOutputSchema,
  },
  async (input) => {
    // System-Prompt zusammenbauen
    const systemPrompt = buildFullSystemPrompt(
      input.documentType,
      input.language,
      input.companyName,
      input.existingDocument
    );

    // Nachrichten für Genkit formatieren
    const formattedMessages = input.messages.map(msg => ({
      role: msg.role as 'user' | 'model',
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
    return {
      response: responseText,
      document: extractDocument(responseText),
      progress: extractProgress(responseText),
      suggestions: extractSuggestions(responseText),
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildFullSystemPrompt(
  documentType: string,
  language: 'de' | 'en',
  companyName: string,
  existingDocument?: string
): string {
  const basePrompt = getSystemPrompt(documentType as any, language);
  const outputFormat = getOutputFormatInstructions(language);

  let prompt = `${basePrompt}

KONTEXT:
- Unternehmen: ${companyName}
- Sprache: ${language === 'de' ? 'Deutsch' : 'English'}

${outputFormat}`;

  // Für "Umarbeiten"-Modus: Bestehendes Dokument als Kontext
  if (existingDocument) {
    prompt += language === 'de'
      ? `

BESTEHENDES DOKUMENT (überarbeite basierend auf User-Feedback):
${existingDocument}
`
      : `

EXISTING DOCUMENT (revise based on user feedback):
${existingDocument}
`;
  }

  return prompt;
}

function extractDocument(text: string): string | undefined {
  const match = text.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  return match ? match[1].trim() : undefined;
}

function extractProgress(text: string): number | undefined {
  const match = text.match(/\[PROGRESS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractSuggestions(text: string): string[] | undefined {
  const match = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (!match) return undefined;

  return match[1]
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
```

---

### 3.2 API-Route mit Streaming

**Datei:** `src/app/api/ai-chat/marken-dna/route.ts`

```typescript
import { markenDNAChatFlow } from '@/lib/ai/flows/marken-dna-chat';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Auth-Check
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();

    // Flow aufrufen
    const result = await markenDNAChatFlow(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Marken-DNA Chat Error:', error);
    return NextResponse.json(
      { error: 'Chat generation failed' },
      { status: 500 }
    );
  }
}
```

### 3.2.1 Streaming-Variante (Optional)

Für Echtzeit-Streaming kann `streamFlow` verwendet werden:

**Datei:** `src/app/api/ai-chat/marken-dna/stream/route.ts`

```typescript
import { ai } from '@/lib/ai/genkit-config';
import { googleAI } from '@genkit-ai/google-genai';
import { getServerSession } from 'next-auth';
import { getSystemPrompt, getOutputFormatInstructions } from '@/lib/ai/prompts/marken-dna-prompts';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { documentType, companyId, companyName, language = 'de', messages } = await req.json();

  const systemPrompt = buildFullSystemPrompt(documentType, language, companyName);

  // Streaming mit Genkit
  const { stream, response } = await ai.generateStream({
    model: googleAI.model('gemini-2.0-flash'),
    system: systemPrompt,
    messages: messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      content: [{ text: msg.content }],
    })),
    config: { temperature: 0.7 },
  });

  // Als Server-Sent Events streamen
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function buildFullSystemPrompt(documentType: string, language: string, companyName: string): string {
  const basePrompt = getSystemPrompt(documentType as any, language as any);
  const outputFormat = getOutputFormatInstructions(language as any);
  return `${basePrompt}\n\nKONTEXT:\n- Unternehmen: ${companyName}\n\n${outputFormat}`;
}
```

---

### 3.3 System-Prompts pro Dokumenttyp (Mehrsprachig)

**Datei:** `src/lib/ai/prompts/marken-dna-prompts.ts`

```typescript
import { MarkenDNADocumentType } from '@/types/marken-dna';

type PromptLanguage = 'de' | 'en';

// ============================================================================
// SYSTEM-PROMPTS FÜR ALLE 6 DOKUMENTTYPEN
// ============================================================================

export const MARKEN_DNA_PROMPTS: Record<MarkenDNADocumentType, Record<PromptLanguage, string>> = {

  // --------------------------------------------------------------------------
  // 1. BRIEFING-CHECK
  // --------------------------------------------------------------------------
  briefing: {
    de: `Du bist ein erfahrener PR-Stratege, der ein Briefing-Check durchführt.

DEIN ZIEL:
Erarbeite mit dem User die Faktenbasis des Unternehmens. Diese Fakten sind die
"unverrückbare Faktenplattform" - sie verhindern, dass später falsche
Informationen kommuniziert werden.

FRAGEN DIE DU STELLEN SOLLST (in dieser Reihenfolge):

1. DAS UNTERNEHMEN (Der Absender):
   - In welcher Branche ist das Unternehmen tätig?
   - Wie groß ist es (Mitarbeiter, Umsatz)?
   - Wo ist der Hauptsitz?
   - Was sind die Hauptprodukte oder -dienstleistungen?
   - Gibt es eine besondere Unternehmensgeschichte?
   - Hat das Unternehmen ein Leitbild?

2. DIE AUFGABE (Der Anlass):
   - Warum wird jetzt eine PR-Strategie benötigt?
   - Was ist das konkrete Kommunikationsproblem?

3. MARKT & WETTBEWERB:
   - Wer sind die direkten Konkurrenten?
   - Wie unterscheidet sich das Unternehmen objektiv?

REGELN:
- Stelle immer nur 1-2 Fragen auf einmal
- Fasse Antworten kurz zusammen bevor du weiterfragst
- Wenn du genug Infos hast, generiere das Dokument
- Sei freundlich aber professionell
- Hake nach wenn Antworten zu vage sind`,

    en: `You are an experienced PR strategist conducting a briefing check.

YOUR GOAL:
Work with the user to establish the company's factual foundation. These facts are
the "immutable fact platform" - they prevent false information from being communicated later.

QUESTIONS TO ASK (in this order):

1. THE COMPANY (The Sender):
   - What industry is the company in?
   - How big is it (employees, revenue)?
   - Where is the headquarters?
   - What are the main products or services?
   - Is there a special company history?
   - Does the company have a mission statement?

2. THE TASK (The Occasion):
   - Why is a PR strategy needed now?
   - What is the specific communication problem?

3. MARKET & COMPETITION:
   - Who are the direct competitors?
   - How does the company objectively differ?

RULES:
- Ask only 1-2 questions at a time
- Briefly summarize answers before continuing
- When you have enough info, generate the document
- Be friendly but professional
- Follow up on vague answers`,
  },

  // --------------------------------------------------------------------------
  // 2. SWOT-ANALYSE
  // --------------------------------------------------------------------------
  swot: {
    de: `Du bist ein erfahrener PR-Stratege, der eine SWOT-Analyse durchführt.

DEIN ZIEL:
Verdichte die Fakten zu Strategiefaktoren. Zwinge den User ehrlich zu sein.
Erstelle ein "klares Bild der Ist-Situation".

FRAGEN DIE DU STELLEN SOLLST:

1. INTERNE STÄRKEN (Strengths):
   - Was kann das Unternehmen besser als der Wettbewerb?
   - Technologie? Personal? Schnelligkeit? Service?

2. INTERNE SCHWÄCHEN (Weaknesses):
   - Wo drückt der Schuh?
   - Wo ist das Unternehmen angreifbar?
   - Budget? Bekanntheit? Vertrieb?

3. EXTERNE CHANCEN (Opportunities):
   - Welche Trends spielen dem Unternehmen in die Karten?
   - Gesetzesänderungen? Technologiewandel? Gesellschaftliche Trends?

4. EXTERNE RISIKEN (Threats):
   - Was bedroht den Erfolg von außen?
   - Neue Wettbewerber? Schlechte Presse? Verändertes Kundenverhalten?

REGELN:
- Pro Bereich mindestens 2-3 Punkte sammeln
- Hake kritisch nach ("Sind Sie sicher, dass das eine echte Stärke ist?")
- Am Ende: Erstelle ein analytisches Fazit mit Lösungsrichtungen`,

    en: `You are an experienced PR strategist conducting a SWOT analysis.

YOUR GOAL:
Condense facts into strategic factors. Push the user to be honest.
Create a "clear picture of the current situation".

QUESTIONS TO ASK:

1. INTERNAL STRENGTHS:
   - What can the company do better than competitors?
   - Technology? Personnel? Speed? Service?

2. INTERNAL WEAKNESSES:
   - Where does it hurt?
   - Where is the company vulnerable?
   - Budget? Awareness? Sales?

3. EXTERNAL OPPORTUNITIES:
   - What trends favor the company?
   - Legal changes? Technology shifts? Social trends?

4. EXTERNAL THREATS:
   - What threatens success from outside?
   - New competitors? Bad press? Changed customer behavior?

RULES:
- Collect at least 2-3 points per area
- Challenge critically ("Are you sure this is a real strength?")
- At the end: Create an analytical conclusion with solution directions`,
  },

  // --------------------------------------------------------------------------
  // 3. ZIELGRUPPEN-RADAR
  // --------------------------------------------------------------------------
  audience: {
    de: `Du bist ein erfahrener PR-Stratege für Zielgruppenanalyse.

DEIN ZIEL:
Definiere präzise Zielgruppen statt "Gießkannenprinzip".
Unterscheide strikt drei Gruppen.

FRAGEN:

1. DIE EMPFÄNGER (Endkunden):
   - Wen will das Unternehmen wirtschaftlich erreichen?
   - Soziodemografie: Alter? Beruf? Einkommen?
   - Psychografie: Einstellungen? Ängste? Wünsche?

2. DIE MITTLER (Journalisten/Influencer):
   - Wer soll die Botschaft transportieren?
   - Fachpresse? Lokalzeitung? Blogger? TV?
   - Gibt es konkrete Ansprechpartner?
   WICHTIG: Das ist für PR entscheidend!

3. DIE ABSENDER (Interne):
   - Müssen Mitarbeiter oder Partner mitgenommen werden?
   - Führungskräfte? Vertrieb? Partner?
   - Wie können sie die Botschaft unterstützen?`,

    en: `You are an experienced PR strategist for target audience analysis.

YOUR GOAL:
Define precise target groups instead of "spray and pray".
Strictly distinguish three groups.

QUESTIONS:

1. THE RECEIVERS (End customers):
   - Who does the company want to reach economically?
   - Demographics: Age? Profession? Income?
   - Psychographics: Attitudes? Fears? Desires?

2. THE INTERMEDIARIES (Journalists/Influencers):
   - Who should transport the message?
   - Trade press? Local newspaper? Bloggers? TV?
   - Are there specific contacts?
   IMPORTANT: This is crucial for PR!

3. THE SENDERS (Internal):
   - Do employees or partners need to be involved?
   - Executives? Sales? Partners?
   - How can they support the message?`,
  },

  // --------------------------------------------------------------------------
  // 4. POSITIONIERUNGS-DESIGNER
  // --------------------------------------------------------------------------
  positioning: {
    de: `Du bist ein erfahrener PR-Stratege für Positionierung.

DEIN ZIEL:
Dies ist der WICHTIGSTE strategische Schritt. Finde die Nische des Unternehmens
und definiere das Soll-Image.

FRAGEN:

1. DIE ALLEINSTELLUNG (USP):
   - Was ist DER EINE Punkt, der das Unternehmen einzigartig macht?
   - Wenn es keinen gibt: Was wird anders oder sympathischer gemacht?
   - Warum sollte ein Kunde HIER kaufen und nicht beim Wettbewerb?

2. DAS SOLL-IMAGE:
   - Wenn jemand über die Firma spricht, was soll er sagen?
   - Formuliere DEN EINEN SATZ, der das Selbstverständnis definiert.
   - Das ist die Soll-Positionierung.

3. DIE ABGRENZUNG:
   - Soll das Unternehmen nah am Marktführer sein (Me-too)?
   - Oder maximale Distanz (Nische)?
   - Oder Challenger-Position?

4. TONALITÄT:
   - Welche Adjektive beschreiben den gewünschten Sound?
   - Seriös? Innovativ? Nahbar? Premium? Bodenständig?
   - Welche Wörter sollen VERMIEDEN werden?

WICHTIG:
Die Positionierung bestimmt den "Sound" ALLER Texte.
Eine Discounter-Positionierung braucht andere Adjektive als eine Luxus-Marke.`,

    en: `You are an experienced PR strategist for positioning.

YOUR GOAL:
This is the MOST IMPORTANT strategic step. Find the company's niche
and define the target image.

QUESTIONS:

1. THE UNIQUE SELLING PROPOSITION (USP):
   - What is THE ONE point that makes the company unique?
   - If there isn't one: What is done differently or more likably?
   - Why should a customer buy HERE and not from competitors?

2. THE TARGET IMAGE:
   - When someone talks about the company, what should they say?
   - Formulate THE ONE SENTENCE that defines the self-image.
   - This is the target positioning.

3. THE DIFFERENTIATION:
   - Should the company be close to the market leader (Me-too)?
   - Or maximum distance (Niche)?
   - Or Challenger position?

4. TONALITY:
   - Which adjectives describe the desired sound?
   - Serious? Innovative? Approachable? Premium? Down-to-earth?
   - Which words should be AVOIDED?

IMPORTANT:
The positioning determines the "sound" of ALL texts.
A discounter positioning needs different adjectives than a luxury brand.`,
  },

  // --------------------------------------------------------------------------
  // 5. ZIELE-SETZER
  // --------------------------------------------------------------------------
  goals: {
    de: `Du bist ein erfahrener PR-Stratege für Zielsetzung.

DEIN ZIEL:
Messbarkeit herstellen. Verhindere, dass der User schwammig bleibt.
Definiere Ziele auf drei Ebenen.

FRAGEN:

1. WAHRNEHMUNGSZIELE (Kopf):
   - Soll die Bekanntheit gesteigert werden? Wie messbar?
   - Sollen spezifische Informationen vermittelt werden?
   - FOKUS: Was sollen die Menschen WISSEN?

2. EINSTELLUNGSZIELE (Herz):
   - Soll das Image verbessert werden? In welche Richtung?
   - Soll Sympathie geweckt werden?
   - Sollen Vorurteile abgebaut werden? Welche?
   - FOKUS: Was sollen die Menschen FÜHLEN?

3. VERHALTENSZIELE (Hand):
   - Was sollen die Menschen TUN?
   - Kaufen? Webseite besuchen? Newsletter abonnieren? Anrufen?
   - Was ist der konkrete Call-to-Action?
   - FOKUS: Welche AKTION ist das Ziel?

REGELN:
- Jedes Ziel sollte messbar formuliert sein wenn möglich
- Priorisiere: Was ist das Hauptziel?
- Warne wenn zu viele Ziele genannt werden ("Zu viele Ziele zersplittern die Kommunikationskräfte")`,

    en: `You are an experienced PR strategist for goal setting.

YOUR GOAL:
Establish measurability. Prevent the user from being vague.
Define goals on three levels.

QUESTIONS:

1. PERCEPTION GOALS (Head):
   - Should awareness be increased? How measurable?
   - Should specific information be conveyed?
   - FOCUS: What should people KNOW?

2. ATTITUDE GOALS (Heart):
   - Should the image be improved? In which direction?
   - Should sympathy be aroused?
   - Should prejudices be reduced? Which ones?
   - FOCUS: What should people FEEL?

3. BEHAVIOR GOALS (Hand):
   - What should people DO?
   - Buy? Visit website? Subscribe to newsletter? Call?
   - What is the concrete call-to-action?
   - FOCUS: What ACTION is the goal?

RULES:
- Each goal should be measurably formulated if possible
- Prioritize: What is the main goal?
- Warn if too many goals are mentioned ("Too many goals fragment communication power")`,
  },

  // --------------------------------------------------------------------------
  // 6. BOTSCHAFTEN-BAUKASTEN
  // --------------------------------------------------------------------------
  messages: {
    de: `Du bist ein erfahrener PR-Stratege für Botschaftsentwicklung.

DEIN ZIEL:
Entwickle Kernbotschaften die journalistisch standhalten.
Nutze die Formel: KERN + BEWEIS + NUTZEN.

FRAGEN (für jede Kernbotschaft):

1. DER KERN (Behauptung):
   - Was ist die zentrale Aussage?
   - z.B. "Wir sind der schnellste Lieferant"
   - Maximal 3-5 Kernbotschaften entwickeln!

2. DIE BEGRÜNDUNG (Beweis):
   - Warum stimmt das? Gib mir FAKTEN!
   - z.B. "Weil wir ein patentiertes Logistiksystem nutzen"
   - Ohne Beweis ist eine Botschaft wertlos!

3. DER NUTZEN (Benefit):
   - Was hat der Kunde davon?
   - z.B. "Er spart Lagerkosten und Zeit"
   - Der Nutzen macht die Botschaft relevant!

REGELN:
- Jede Botschaft braucht alle drei Teile
- Priorisiere die Botschaften (1 = wichtigste)
- Prüfe auf Konsistenz mit der Positionierung
- Diese Botschaften werden in JEDER Kommunikation verwendet`,

    en: `You are an experienced PR strategist for message development.

YOUR GOAL:
Develop key messages that hold up journalistically.
Use the formula: CORE + PROOF + BENEFIT.

QUESTIONS (for each key message):

1. THE CORE (Claim):
   - What is the central statement?
   - e.g. "We are the fastest supplier"
   - Develop a maximum of 3-5 key messages!

2. THE REASONING (Proof):
   - Why is this true? Give me FACTS!
   - e.g. "Because we use a patented logistics system"
   - Without proof, a message is worthless!

3. THE BENEFIT:
   - What does the customer get out of it?
   - e.g. "They save storage costs and time"
   - The benefit makes the message relevant!

RULES:
- Each message needs all three parts
- Prioritize the messages (1 = most important)
- Check for consistency with positioning
- These messages will be used in EVERY communication`,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Holt den System-Prompt für einen Dokumenttyp in der gewünschten Sprache
 */
export function getSystemPrompt(
  documentType: MarkenDNADocumentType,
  language: PromptLanguage = 'de'
): string {
  const prompts = MARKEN_DNA_PROMPTS[documentType];
  return prompts[language] || prompts['de']; // Fallback auf Deutsch
}

/**
 * Output-Format Anweisungen für die KI
 */
export function getOutputFormatInstructions(language: PromptLanguage = 'de'): string {
  if (language === 'de') {
    return `
AUSGABE-FORMAT:
1. Antworte immer auf Deutsch
2. Formatiere mit Markdown (**, *, -, ##, etc.)
3. Wenn du das Dokument aktualisierst, gib es so aus:
   [DOCUMENT]
   ## Überschrift
   - Punkt 1
   - Punkt 2
   [/DOCUMENT]
4. Gib deinen Fortschritt an: [PROGRESS:40] (0-100)
5. Schlage nächste Antworten vor:
   [SUGGESTIONS]
   Vorschlag 1
   Vorschlag 2
   Vorschlag 3
   [/SUGGESTIONS]
`;
  }

  return `
OUTPUT FORMAT:
1. Always respond in English
2. Format with Markdown (**, *, -, ##, etc.)
3. When updating the document, output it like this:
   [DOCUMENT]
   ## Heading
   - Point 1
   - Point 2
   [/DOCUMENT]
4. Indicate your progress: [PROGRESS:40] (0-100)
5. Suggest next responses:
   [SUGGESTIONS]
   Suggestion 1
   Suggestion 2
   Suggestion 3
   [/SUGGESTIONS]
`;
}

/**
 * Dokumenttyp-Namen für UI-Anzeige
 */
export const DOCUMENT_TYPE_NAMES: Record<MarkenDNADocumentType, Record<PromptLanguage, string>> = {
  briefing: { de: 'Briefing-Check', en: 'Briefing Check' },
  swot: { de: 'SWOT-Analyse', en: 'SWOT Analysis' },
  audience: { de: 'Zielgruppen-Radar', en: 'Target Audience Radar' },
  positioning: { de: 'Positionierungs-Designer', en: 'Positioning Designer' },
  goals: { de: 'Ziele-Setzer', en: 'Goal Setter' },
  messages: { de: 'Botschaften-Baukasten', en: 'Message Builder' },
};
```

---

### 3.4 Projekt-Kernbotschaft Flow

**Datei:** `src/lib/ai/flows/project-strategy-chat.ts`

```typescript
import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ProjectStrategyChatInputSchema = z.object({
  projectId: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  dnaSynthese: z.string().optional(), // 🧪 DNA Synthese als Kontext
});

const ProjectStrategyChatOutputSchema = z.object({
  response: z.string(),
  document: z.string().optional(),
  progress: z.number().optional(),
  suggestions: z.array(z.string()).optional(),
});

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

    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: systemPrompt,
      messages: input.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        content: [{ text: msg.content }],
      })),
      config: { temperature: 0.7 },
    });

    const responseText = response.text;

    return {
      response: responseText,
      document: extractDocument(responseText),
      progress: extractProgress(responseText),
      suggestions: extractSuggestions(responseText),
    };
  }
);

function buildProjectStrategyPrompt(
  language: 'de' | 'en',
  companyName: string,
  dnaSynthese?: string
): string {
  const isDE = language === 'de';

  let prompt = isDE
    ? `Du bist ein PR-Stratege der eine Projekt-Kernbotschaft für ${companyName} erarbeitet.`
    : `You are a PR strategist developing a project key message for ${companyName}.`;

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

// Helper functions (same as in marken-dna-chat.ts)
function extractDocument(text: string): string | undefined {
  const match = text.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  return match ? match[1].trim() : undefined;
}

function extractProgress(text: string): number | undefined {
  const match = text.match(/\[PROGRESS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractSuggestions(text: string): string[] | undefined {
  const match = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (!match) return undefined;
  return match[1].split('\n').map(s => s.trim()).filter(s => s.length > 0);
}
```

---

## Frontend-Integration

> **Vollständige Dokumentation:** Siehe `08-CHAT-UI-KONZEPT.md`

### Kurzübersicht

```typescript
// Im Frontend wird der useGenkitChat Hook verwendet
import { useGenkitChat } from '@/lib/hooks/useGenkitChat';

function MarkenDNAChat({ documentType, companyId, companyName }) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    document,
    progress,
    suggestedPrompts,
  } = useGenkitChat({
    flowName: 'markenDNAChat',
    documentType,
    companyId,
    companyName,
  });

  // ... Rendering
}
```

---

## Toast-Benachrichtigungen & i18n

Error-Handling erfolgt im `useGenkitChat` Hook (siehe `08-CHAT-UI-KONZEPT.md`):

```typescript
// Im useGenkitChat Hook
const sendMessage = async (userMessage: string) => {
  try {
    const response = await fetch('/api/ai-chat/marken-dna', {
      method: 'POST',
      body: JSON.stringify({ ... }),
    });
    // ...
  } catch (error) {
    toastService.error(tToast('markenDNA.chatError', { error: error.message }));
  }
};
```

> Siehe `07-ENTWICKLUNGSRICHTLINIEN.md` für vollständige Toast- und i18n-Dokumentation.

---

## Abhängigkeiten

- Phase 1 (Datenmodell)
- Bestehende Genkit-Konfiguration (`src/lib/ai/genkit-config.ts`)
- **Zentraler Toast-Service** (`src/lib/utils/toast.ts`)

---

## Erledigungs-Kriterien

### Backend
- [ ] Genkit Flow `markenDNAChatFlow` implementiert
- [ ] Genkit Flow `projectStrategyChatFlow` implementiert
- [ ] API-Route `/api/ai-chat/marken-dna` erstellt
- [ ] Streaming-Route `/api/ai-chat/marken-dna/stream` erstellt (optional)
- [ ] Alle 6 System-Prompts in DE + EN
- [ ] Output-Format-Anweisungen implementiert
- [ ] Extraktion von [DOCUMENT], [PROGRESS], [SUGGESTIONS]
- [ ] Auth-Check in allen Routes

### Frontend (siehe 08-CHAT-UI-KONZEPT.md)
- [ ] useGenkitChat Hook implementiert
- [ ] AIChatModal Komponente
- [ ] Message-Komponenten
- [ ] Streaming funktioniert (optional)
- [ ] Tests geschrieben

---

## Nächste Schritte

- **Weiter:** `05-PHASE-4-STRATEGIE-TAB.md` (Strategie-Tab Umbau)
- **Dokumentation:** Nach Abschluss aller Phasen → `09-DOKUMENTATION.md`

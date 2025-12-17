# Phase 3: KI-Chat-Wizard (Genkit Flows)

## Ziel
Genkit-Flows erstellen, die durch interaktive Chats die 6 Marken-DNA Dokumente erarbeiten.

---

## Aufgaben

### 3.1 Basis-Chat-Flow erstellen

**Datei:** `src/genkit/flows/marken-dna-chat.ts`

```typescript
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Input Schema
const MarkenDNAChatInputSchema = z.object({
  documentType: z.enum(['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages']),
  customerId: z.string(),
  customerName: z.string(),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  userMessage: z.string(),
  existingContent: z.string().optional(),  // Falls Bearbeitung
});

// Output Schema
const MarkenDNAChatOutputSchema = z.object({
  assistantMessage: z.string(),
  documentUpdate: z.string().optional(),      // HTML für Dokument
  documentPlainText: z.string().optional(),   // Plain-Text für KI
  structuredData: z.record(z.unknown()).optional(),
  isComplete: z.boolean(),
  completeness: z.number(),                   // 0-100
  nextQuestion: z.string().optional(),
});

export const markenDNAChatFlow = ai.defineFlow(
  {
    name: 'markenDNAChatFlow',
    inputSchema: MarkenDNAChatInputSchema,
    outputSchema: MarkenDNAChatOutputSchema,
  },
  async (input) => {
    const systemPrompt = getSystemPrompt(input.documentType);

    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-pro'),
      system: systemPrompt,
      messages: [
        ...(input.chatHistory || []).map(msg => ({
          role: msg.role,
          content: [{ text: msg.content }],
        })),
        { role: 'user', content: [{ text: input.userMessage }] },
      ],
      config: { temperature: 0.7 },
    });

    return parseResponse(response.text, input.documentType);
  }
);
```

---

### 3.2 System-Prompts pro Dokumenttyp

**Datei:** `src/genkit/prompts/marken-dna-prompts.ts`

```typescript
export const MARKEN_DNA_PROMPTS: Record<MarkenDNADocumentType, string> = {

  briefing: `Du bist ein erfahrener PR-Stratege, der ein Briefing-Check durchführt.

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
- Hake nach wenn Antworten zu vage sind

OUTPUT FORMAT:
Wenn du genug Informationen hast, generiere ein strukturiertes HTML-Dokument.`,

  swot: `Du bist ein erfahrener PR-Stratege, der eine SWOT-Analyse durchführt.

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
- Am Ende: Erstelle ein analytisches Fazit mit Lösungsrichtungen

OUTPUT:
Strukturiertes SWOT-Dokument mit Fazit.`,

  audience: `Du bist ein erfahrener PR-Stratege für Zielgruppenanalyse.

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
   - Wie können sie die Botschaft unterstützen?

OUTPUT:
Detailliertes Zielgruppen-Profil mit allen drei Gruppen.`,

  positioning: `Du bist ein erfahrener PR-Stratege für Positionierung.

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
Eine Discounter-Positionierung braucht andere Adjektive als eine Luxus-Marke.

OUTPUT:
Positionierungs-Statement mit USP, Soll-Image, Tonalität-Guidelines.`,

  goals: `Du bist ein erfahrener PR-Stratege für Zielsetzung.

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
- Warne wenn zu viele Ziele genannt werden ("Zu viele Ziele zersplittern die Kommunikationskräfte")

OUTPUT:
Strukturierte Ziel-Matrix mit Kopf/Herz/Hand.`,

  messages: `Du bist ein erfahrener PR-Stratege für Botschaftsentwicklung.

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
- Diese Botschaften werden in JEDER Kommunikation verwendet

OUTPUT:
Botschaften-Katalog mit Kern, Beweis, Nutzen pro Botschaft.`,

};
```

---

### 3.3 Projekt-Kernbotschaft Flow

**Datei:** `src/genkit/flows/project-strategy-chat.ts`

```typescript
// Für den Chat im Strategie-Tab des Projekts
// Nutzt die Marken-DNA als Kontext

const ProjectStrategyChatInputSchema = z.object({
  projectId: z.string(),
  customerId: z.string(),
  markenDNA: z.string().optional(),       // Zusammengefasste Marken-DNA
  chatHistory: z.array(ChatMessageSchema).optional(),
  userMessage: z.string(),
});

export const projectStrategyChatFlow = ai.defineFlow(
  {
    name: 'projectStrategyChatFlow',
    inputSchema: ProjectStrategyChatInputSchema,
    outputSchema: ProjectStrategyOutputSchema,
  },
  async (input) => {
    const systemPrompt = `Du bist ein PR-Stratege der eine Projekt-Kernbotschaft erarbeitet.

${input.markenDNA ? `
MARKEN-DNA DES KUNDEN (nutze diese als Leitplanken):
${input.markenDNA}
` : ''}

DEIN ZIEL:
Erarbeite die spezifische Strategie für DIESES PROJEKT.

FRAGEN:

1. DER ANLASS (News-Hook):
   - Worüber berichten wir? (Produktneuheit, Personalie, Event?)
   - Was macht das Thema nachrichtenrelevant?

2. DAS MASJNAHMENZIEL:
   - Was soll dieser Text konkret erreichen?
   - Klicks? Anmeldungen? Imagepflege?

3. DIE TEILBOTSCHAFT:
   - Welches spezifische Detail soll kommuniziert werden?
   - z.B. "Das neue Feature spart 20% Zeit"

4. DAS MATERIAL:
   - Welche Fakten, Zitate oder Daten gibt es?
   - Gibt es Zitate vom Geschäftsführer?

OUTPUT:
Projekt-Strategie-Dokument mit Anlass, Ziel, Kernbotschaft.`;

    // ... Generate logic
  }
);
```

---

### 3.4 API-Endpunkte

**Datei:** `src/app/api/marken-dna/chat/route.ts`

```typescript
import { markenDNAChatFlow } from '@/genkit/flows/marken-dna-chat';

export async function POST(request: Request) {
  const body = await request.json();

  // Auth Check
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Flow ausführen
  const result = await markenDNAChatFlow(body);

  return NextResponse.json(result);
}
```

**Datei:** `src/app/api/project-strategy/chat/route.ts`

```typescript
// Ähnlich für Projekt-Strategie Chat
```

---

### 3.5 Frontend Chat-Hook

**Datei:** `src/lib/hooks/useMarkenDNAChat.ts`

```typescript
export function useMarkenDNAChat(
  documentType: MarkenDNADocumentType,
  customerId: string,
  customerName: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [document, setDocument] = useState<string>('');
  const [completeness, setCompleteness] = useState(0);

  const sendMessage = async (userMessage: string) => {
    setIsLoading(true);

    // Optimistisch User-Nachricht hinzufügen
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    const response = await fetch('/api/marken-dna/chat', {
      method: 'POST',
      body: JSON.stringify({
        documentType,
        customerId,
        customerName,
        chatHistory: messages,
        userMessage,
        existingContent: document,
      }),
    });

    const result = await response.json();

    // Assistant-Antwort hinzufügen
    setMessages(prev => [...prev, { role: 'assistant', content: result.assistantMessage }]);

    // Dokument aktualisieren wenn vorhanden
    if (result.documentUpdate) {
      setDocument(result.documentUpdate);
    }

    setCompleteness(result.completeness);
    setIsLoading(false);

    return result;
  };

  const resetChat = () => {
    setMessages([]);
    setDocument('');
    setCompleteness(0);
  };

  return {
    messages,
    document,
    completeness,
    isLoading,
    sendMessage,
    resetChat,
  };
}
```

---

## Streaming-Support (Optional)

Für bessere UX kann Streaming implementiert werden:

```typescript
// Mit Genkit Streaming
const response = await ai.generateStream({
  model: googleAI.model('gemini-2.5-pro'),
  // ...
});

for await (const chunk of response.stream) {
  // Chunk an Frontend senden
}
```

---

## Abhängigkeiten

- Phase 1 (Datenmodell)
- Genkit Setup (bereits vorhanden)
- API-Routes Infrastruktur

---

## Erledigungs-Kriterien

- [ ] Basis-Chat-Flow funktioniert
- [ ] Alle 6 System-Prompts implementiert
- [ ] Projekt-Strategie-Flow funktioniert
- [ ] API-Endpunkte erstellt
- [ ] Frontend-Hook funktioniert
- [ ] Chat-Verlauf wird gespeichert
- [ ] Dokument wird live aktualisiert
- [ ] Streaming funktioniert (optional)
- [ ] Tests geschrieben

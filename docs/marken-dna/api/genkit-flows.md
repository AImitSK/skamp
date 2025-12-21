# Genkit Flows Dokumentation

## Übersicht

Das Marken-DNA System nutzt drei Genkit Flows für verschiedene Chat- und Assistenten-Funktionen. Alle Flows folgen einem konsistenten Pattern mit strukturierten Input/Output-Schemas und verwenden Gemini 2.0 Flash als Standard-Modell.

### Flow-Übersicht

| Flow | Zweck | Einsatzort |
|------|-------|------------|
| `markenDNAChatFlow` | Interaktive Erstellung der 6 Marken-DNA Dokumente | Marken-DNA Bibliothek |
| `projectStrategyChatFlow` | Projekt-Kernbotschaft Chat mit DNA Synthese Kontext | Strategie-Tab (Kernbotschaft) |
| `expertAssistantFlow` | CeleroPress Formel für markentreue Texterstellung | KI-Assistenten (Experten-Modus) |

---

## 1. Marken-DNA Chat Flow

### Zweck
Interaktive Erstellung und Überarbeitung der 6 Marken-DNA Dokumente (Briefing, SWOT, Zielgruppen, Positionierung, Ziele, Botschaften).

### Datei
```
src/lib/ai/flows/marken-dna-chat.ts
```

### Input Schema

```typescript
{
  documentType: 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages',
  companyId: string,
  companyName: string,
  language: 'de' | 'en' (default: 'de'),
  messages: Array<{
    role: 'user' | 'assistant',
    content: string
  }>,
  existingDocument?: string // Für "Umarbeiten"-Modus
}
```

### Output Schema

```typescript
{
  response: string,                    // Vollständige Chat-Antwort
  document?: string,                   // Extrahiertes [DOCUMENT]...[/DOCUMENT]
  progress?: number,                   // Extrahiertes [PROGRESS:XX]
  suggestions?: string[]               // Extrahierte [SUGGESTIONS]
}
```

### System-Prompt Struktur

Der System-Prompt wird dynamisch aus mehreren Komponenten zusammengebaut:

1. **Basis-Prompt** (aus `marken-dna-prompts.ts`)
   - Dokumenttyp-spezifische Persona und Regeln
   - Fragenkatalog
   - Abschluss-Protokoll

2. **Kontext-Informationen**
   - Unternehmensname
   - Sprache

3. **Output-Format Instruktionen**
   - Markdown-Formatierung
   - Tag-Struktur für Parsing

4. **Bestehendes Dokument** (optional)
   - Nur im "Umarbeiten"-Modus

### Beispiel System-Prompt (Briefing-Check)

```
Du bist ein erfahrener Senior-PR-Stratege bei CeleroPress. Dein Ziel ist es,
eine unverrückbare Faktenplattform für das Unternehmen zu errichten.

### DEINE PERSONA & REGELN:
1. Methodische Strenge: Akzeptiere keine Worthülsen wie "wir sind innovativ"
2. Iteratives Vorgehen: Stelle niemals mehr als 1-2 Fragen gleichzeitig
3. Fakten-Fokus: Verhindere Halluzinationen durch präzise Abfragen
4. Struktur-Zwang: Nutze technische Tags [DOCUMENT], [PROGRESS:X], [SUGGESTIONS]

[... weitere Abschnitte ...]

KONTEXT:
- Unternehmen: TechStart GmbH
- Sprache: Deutsch

AUSGABE-FORMAT:
1. Antworte immer auf Deutsch
2. Formatiere mit Markdown (**, *, -, ##, etc.)
3. Wenn du das Dokument aktualisierst, gib es so aus:
   [DOCUMENT]
   ## Überschrift
   - Punkt 1
   [/DOCUMENT]
4. Gib deinen Fortschritt an: [PROGRESS:40] (0-100)
5. Schlage nächste Antworten vor:
   [SUGGESTIONS]
   Vorschlag 1
   Vorschlag 2
   [/SUGGESTIONS]
```

### Output-Parsing

Die Flow-Response enthält strukturierte Tags, die im Flow automatisch geparst werden:

#### [DOCUMENT] Tag
```typescript
function extractDocument(text: string): string | undefined {
  const match = text.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  return match ? match[1].trim() : undefined;
}
```

Beispiel Response:
```
Ich habe das Briefing zusammengefasst:

[DOCUMENT]
## Briefing-Check: TechStart GmbH

### Das Unternehmen
- Branche: KI-gestützte HR-Software
- Gründung: 2021
- Mitarbeiter: 12
[/DOCUMENT]
```

#### [PROGRESS] Tag
```typescript
function extractProgress(text: string): number | undefined {
  const match = text.match(/\[PROGRESS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : undefined;
}
```

Beispiel:
```
[PROGRESS:60]
```

#### [SUGGESTIONS] Tag
```typescript
function extractSuggestions(text: string): string[] | undefined {
  const match = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (!match) return undefined;

  return match[1]
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
```

Beispiel Response:
```
[SUGGESTIONS]
Wir sind ein Marktführer
Wir bieten innovative Lösungen
Wir haben 50 Enterprise-Kunden
[/SUGGESTIONS]
```

### API-Route

```
POST /api/marken-dna/chat
```

Request Body:
```json
{
  "documentType": "briefing",
  "companyId": "abc123",
  "companyName": "TechStart GmbH",
  "language": "de",
  "messages": [
    {
      "role": "user",
      "content": "Wir entwickeln KI-Software für HR-Abteilungen"
    }
  ]
}
```

Response:
```json
{
  "response": "Vielen Dank! ...",
  "document": "## Briefing-Check\n...",
  "progress": 40,
  "suggestions": [
    "Wie viele Mitarbeiter hat das Unternehmen?",
    "In welchem Jahr wurde das Unternehmen gegründet?"
  ]
}
```

### Code-Beispiel: Flow aufrufen

```typescript
import { markenDNAChatFlow } from '@/lib/ai/flows/marken-dna-chat';

const result = await markenDNAChatFlow({
  documentType: 'briefing',
  companyId: 'abc123',
  companyName: 'TechStart GmbH',
  language: 'de',
  messages: [
    { role: 'user', content: 'Wir entwickeln KI-Software' }
  ]
});

console.log(result.response);      // Vollständige Antwort
console.log(result.document);      // Nur das [DOCUMENT] Content
console.log(result.progress);      // 0-100
console.log(result.suggestions);   // Array von Vorschlägen
```

---

## 2. Projekt-Strategie Chat Flow

### Zweck
Interaktive Erstellung der Projekt-Kernbotschaft mit DNA Synthese als Kontext-Leitplanken.

### Datei
```
src/lib/ai/flows/project-strategy-chat.ts
```

### Input Schema

```typescript
{
  projectId: string,
  companyId: string,
  companyName: string,
  language: 'de' | 'en' (default: 'de'),
  messages: Array<{
    role: 'user' | 'assistant',
    content: string
  }>,
  dnaSynthese?: string  // 🧪 DNA Synthese als Kontext (~500 Tokens)
}
```

### Output Schema

```typescript
{
  response: string,
  document?: string,         // Extrahiertes [DOCUMENT]
  progress?: number,         // Extrahiertes [PROGRESS:XX]
  suggestions?: string[]     // Extrahierte [SUGGESTIONS]
}
```

### System-Prompt Struktur

```
Du bist ein PR-Stratege der eine Projekt-Kernbotschaft für {companyName} erarbeitet.

🧪 DNA SYNTHESE (nutze diese als Leitplanken):
{dnaSynthese}

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
```

### API-Route

```
POST /api/project/strategy-chat
```

Request Body:
```json
{
  "projectId": "proj456",
  "companyId": "abc123",
  "companyName": "TechStart GmbH",
  "language": "de",
  "messages": [
    {
      "role": "user",
      "content": "Wir launchen ein neues KI-Feature"
    }
  ],
  "dnaSynthese": "🧪 DNA SYNTHESE: TechStart GmbH\n- USP: ..."
}
```

### Code-Beispiel

```typescript
import { projectStrategyChatFlow } from '@/lib/ai/flows/project-strategy-chat';

const result = await projectStrategyChatFlow({
  projectId: 'proj456',
  companyId: 'abc123',
  companyName: 'TechStart GmbH',
  language: 'de',
  messages: [
    { role: 'user', content: 'Wir launchen ein neues Feature' }
  ],
  dnaSynthese: dnaText // Von DNA Synthese Service
});
```

---

## 3. Experten-Assistenten Flow

### Zweck
CeleroPress Formel für markentreue Texterstellung mit DNA Synthese (~500 Tokens) und Kernbotschaft.

### Datei
```
src/lib/ai/flows/expert-assistant.ts
```

### Input Schema

```typescript
{
  projectId: string,
  userPrompt: string,
  language: 'de' | 'en' (default: 'de'),
  outputFormat?: 'pressrelease' | 'social' | 'blog' | 'email' | 'custom'
}
```

### Output Schema

```typescript
{
  content: string,              // Generierter Text
  usedDNASynthese: boolean,     // DNA Synthese verwendet?
  usedKernbotschaft: boolean,   // Kernbotschaft verwendet?
  suggestions?: string[]        // Optionale Verbesserungsvorschläge
}
```

### Drei-Schichten-Architektur

Der Experten-Modus orchestriert drei Ebenen:

1. **EBENE 1: MARKEN-DNA** (Höchste Priorität)
   - DNA Synthese (~500 Tokens)
   - USP, Tonalität, Kernbotschaften
   - No-Go-Words

2. **EBENE 2: SCORE-REGELN** (Journalistisches Handwerk)
   - Headline-Regeln (40-75 Zeichen, aktive Verben)
   - Lead-Regeln (5 W-Fragen)
   - Struktur-Regeln (3-4 Absätze)
   - Zitat-Regeln (wörtliche Rede)
   - CTA & Hashtags

3. **EBENE 3: PROJEKT-KONTEXT** (Aktuelle Fakten)
   - Anlass (News-Hook)
   - Ziel (Massnahmenziel)
   - Kernbotschaft für dieses Projekt

### System-Prompt Struktur

```
Du bist ein erfahrener PR-Profi und Texter bei CeleroPress.

MODUS: EXPERTE 🧪 - CeleroPress Formel
Du hast Zugriff auf die DNA Synthese des Kunden und nutzt diese
für konsistente, markentreue Kommunikation.

═══════════════════════════════════════════════════════════════════
🧪 DNA SYNTHESE (KI-optimierte Kurzform der Marken-DNA)
═══════════════════════════════════════════════════════════════════

{dnaSynthese}

WICHTIG: Nutze Tonalität, Kernbotschaften und Positionierung aus dieser Synthese!

═══════════════════════════════════════════════════════════════════
💬 PROJEKT-KERNBOTSCHAFT (Aktuelle Aufgabe)
═══════════════════════════════════════════════════════════════════

ANLASS
{occasion}

ZIEL
{goal}

KERNBOTSCHAFT FÜR DIESES PROJEKT
{keyMessage}

═══════════════════════════════════════════════════════════════════
DEINE AUFGABE
═══════════════════════════════════════════════════════════════════

Erstelle den gewünschten Text unter Beachtung folgender Regeln:

1. KONSISTENZ: Halte dich strikt an Positionierung und Tonalität aus der DNA Synthese
2. BOTSCHAFTEN: Integriere die Kernbotschaften subtil - nicht plakativ
3. ZIELGRUPPE: Schreibe für die definierten Zielgruppen
4. FOKUS: Erfülle das Projektziel und transportiere die Projekt-Kernbotschaft
5. FAKTEN: Nutze nur Fakten aus der Synthese - erfinde nichts dazu
6. NO-GO-WORDS: Vermeide strikt alle verbotenen Begriffe aus der DNA
7. TONALITÄT: Die Tonalität aus der DNA hat VORRANG vor allen anderen Regeln

═══════════════════════════════════════════════════════════════════
USER-ANFRAGE
═══════════════════════════════════════════════════════════════════

{userPrompt}
```

### Context Builder

Der Flow nutzt `buildAIContext()` aus `context-builder.ts`:

```typescript
import { buildAIContext } from '@/lib/ai/context-builder';

const context = await buildAIContext(
  projectId,
  'expert',
  userPrompt
);

// context enthält:
// {
//   mode: 'expert',
//   dnaSynthese: '🧪 DNA SYNTHESE: ...',
//   kernbotschaft: {
//     occasion: '...',
//     goal: '...',
//     keyMessage: '...'
//   },
//   userPrompt: 'Schreibe eine Pressemeldung...'
// }
```

### API-Route

```
POST /api/assistant/expert
```

Request Body:
```json
{
  "projectId": "proj456",
  "userPrompt": "Schreibe eine Pressemeldung über unser neues KI-Feature",
  "language": "de",
  "outputFormat": "pressrelease"
}
```

Response:
```json
{
  "content": "# KI-Feature revolutioniert HR-Prozesse\n\n...",
  "usedDNASynthese": true,
  "usedKernbotschaft": true,
  "suggestions": []
}
```

### Code-Beispiel

```typescript
import { expertAssistantFlow } from '@/lib/ai/flows/expert-assistant';

const result = await expertAssistantFlow({
  projectId: 'proj456',
  userPrompt: 'Schreibe eine Pressemeldung über unser neues Feature',
  language: 'de',
  outputFormat: 'pressrelease'
});

console.log(result.content);              // Generierter Text
console.log(result.usedDNASynthese);      // true/false
console.log(result.usedKernbotschaft);    // true/false
```

---

## Prompt-Bibliotheken

### 1. Marken-DNA Prompts

**Datei:** `src/lib/ai/prompts/marken-dna-prompts.ts`

Enthält die System-Prompts für alle 6 Dokumenttypen:

```typescript
export const MARKEN_DNA_PROMPTS: Record<MarkenDNADocumentType, Record<PromptLanguage, string>> = {
  briefing: {
    de: '...',
    en: '...'
  },
  swot: { ... },
  audience: { ... },
  positioning: { ... },
  goals: { ... },
  messages: { ... }
};
```

**Helper Functions:**

```typescript
// Holt den System-Prompt für einen Dokumenttyp
getSystemPrompt(documentType: MarkenDNADocumentType, language: 'de' | 'en'): string

// Output-Format Instruktionen
getOutputFormatInstructions(language: 'de' | 'en'): string
```

### 2. DNA Synthese Prompt

**Zweck:** Transformiert 6 Dokumente in ~500 Token Kurzform

```typescript
export const DNA_SYNTHESE_PROMPT: Record<PromptLanguage, string> = {
  de: `Du bist ein Strategie-Analyst und Prompt-Engineer.
       Deine Aufgabe ist es, die 6 Dokumente der Marken-DNA
       in eine hocheffiziente, KI-optimierte Kurzform (~500 Tokens)
       zu transformieren.

       ANALYSE-AUFTRAG:
       1. Identität & Kern
       2. Tonalität & Sound
       3. Zielgruppen-Matrix
       4. Botschaften-Konzentrat
       5. Leitplanken (Do's & Don'ts)

       STRUKTUR DER AUSGABE:
       #### 🧪 DNA SYNTHESE: [Unternehmensname]
       - **USP:** ...
       - **POSITIONIERUNG:** ...
       - **ZIELGRUPPEN:** ...
       - **KERNBOTSCHAFTEN:** ...
       - **PROMPT-GUIDELINE:** ...
       - **NO-GO-AREA:** ...`,
  en: '...'
};
```

### 3. Score Optimization Prompts

**Datei:** `src/lib/ai/prompts/score-optimization.ts`

Regeln für PR-SEO Score von 85-95%:

```typescript
export const SCORE_PROMPTS = {
  headline: {
    rules: [
      'Länge: 40-75 Zeichen',
      'Aktive Verben verwenden',
      'Keywords in erste 5 Wörter',
      'Keine Füllwörter',
      'Zahlen und Fakten bevorzugen'
    ],
    examples: {
      good: ['KI-Startup sichert 50 Mio. € Series-A-Finanzierung'],
      bad: ['Sehr interessante Neuigkeiten von unserem Unternehmen']
    }
  },
  lead: { ... },
  structure: { ... },
  quote: { ... },
  cta: { ... },
  industry: {
    tech: [...],
    healthcare: [...],
    finance: [...]
  }
};
```

**Helper Function:**

```typescript
getScoreOptimizationPrompt(industry?: string): string
```

### 4. AI Sequenz Prompts

**Datei:** `src/lib/ai/prompts/ai-sequence.ts`

Drei-Schichten-Architektur für CeleroPress Formel:

```typescript
export function buildAISequencePrompt(context: AISequenceContext): string {
  // EBENE 1: MARKEN-DNA (Höchste Priorität)
  // EBENE 2: SCORE-REGELN (Journalistisches Handwerk)
  // EBENE 3: PROJEKT-KONTEXT (Aktuelle Fakten)
  // KONFLIKT-AUFLÖSUNG
}
```

**Context Interface:**

```typescript
export interface AISequenceContext {
  dnaSynthese?: string;
  kernbotschaft?: {
    occasion: string;
    goal: string;
    keyMessage: string;
  };
  industry?: string;
  toneOverride?: 'formal' | 'casual' | 'modern' | null;
}
```

### 5. Expert Mode Prompts

**Datei:** `src/lib/ai/prompts/expert-mode.ts`

Mehrsprachige System-Prompts für Experten-Modus:

```typescript
export const EXPERT_MODE_TEXTS: Record<PromptLanguage, {
  intro: string;
  synthesisHeader: string;
  synthesisNote: string;
  kernbotschaftHeader: string;
  occasionLabel: string;
  goalLabel: string;
  messageLabel: string;
  taskHeader: string;
  rules: string[];
  userRequestHeader: string;
}>;
```

**Helper Functions:**

```typescript
buildExpertModePrompt(context: AIContext, language: 'de' | 'en'): string

getExpertModeInfo(context: AIContext, language: 'de' | 'en'): {
  hasDNA: boolean;
  hasKernbotschaft: boolean;
  infoText: string;
}
```

---

## Genkit Konfiguration

**Datei:** `src/lib/ai/genkit-config.ts`

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

// Standard-Modell für alle Flows
export const gemini25FlashModel = googleAI.model('gemini-2.0-flash');
```

---

## Testing

### Flow Tests

```typescript
// test/flows/marken-dna-chat.test.ts
import { markenDNAChatFlow } from '@/lib/ai/flows/marken-dna-chat';

describe('markenDNAChatFlow', () => {
  it('should extract document from response', async () => {
    const result = await markenDNAChatFlow({
      documentType: 'briefing',
      companyId: 'test-123',
      companyName: 'Test GmbH',
      language: 'de',
      messages: [
        { role: 'user', content: 'Test input' }
      ]
    });

    expect(result.response).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.progress).toBeGreaterThanOrEqual(0);
  });
});
```

### Prompt Tests

```typescript
// test/prompts/marken-dna-prompts.test.ts
import { getSystemPrompt, getOutputFormatInstructions } from '@/lib/ai/prompts/marken-dna-prompts';

describe('Marken-DNA Prompts', () => {
  it('should return German prompt for briefing', () => {
    const prompt = getSystemPrompt('briefing', 'de');
    expect(prompt).toContain('Senior-PR-Stratege');
  });

  it('should return output format instructions', () => {
    const instructions = getOutputFormatInstructions('de');
    expect(instructions).toContain('[DOCUMENT]');
    expect(instructions).toContain('[PROGRESS:');
  });
});
```

---

## Best Practices

### 1. Flow-Aufruf

```typescript
// ✅ RICHTIG: Mit Try-Catch
try {
  const result = await markenDNAChatFlow(input);
  console.log(result.response);
} catch (error) {
  console.error('Flow failed:', error);
}

// ❌ FALSCH: Ohne Error-Handling
const result = await markenDNAChatFlow(input);
```

### 2. Output-Parsing

```typescript
// ✅ RICHTIG: Optional Chaining
const document = result.document ?? null;
const progress = result.progress ?? 0;

// ❌ FALSCH: Direkt zugreifen
const document = result.document;
```

### 3. Context Builder

```typescript
// ✅ RICHTIG: Kontext laden vor Flow-Aufruf
const context = await buildAIContext(projectId, 'expert', userPrompt);
const prompt = buildExpertModePrompt(context, 'de');

// ❌ FALSCH: Direkt im Flow
const prompt = buildExpertModePrompt({ mode: 'expert' }, 'de');
```

### 4. Multi-Tenancy

```typescript
// ✅ RICHTIG: CompanyId/ProjectId immer mitgeben
await markenDNAChatFlow({
  companyId: currentUser.companyId,
  projectId: currentProject.id,
  // ...
});

// ❌ FALSCH: Hardcoded IDs
await markenDNAChatFlow({
  companyId: 'abc123',
  // ...
});
```

---

## Weiterführende Dokumentation

- **[Marken-DNA Prompts](../prompts/marken-dna-prompts.md)** - Details zu allen 6 Dokumenttyp-Prompts
- **[CeleroPress Formel](../konzepte/celeropress-formel.md)** - Drei-Schichten-Architektur
- **[Context Builder](./context-builder.md)** - DNA Synthese & Kernbotschaft laden
- **[Genkit Integration](../../../GENKIT.md)** - Genkit Framework Setup

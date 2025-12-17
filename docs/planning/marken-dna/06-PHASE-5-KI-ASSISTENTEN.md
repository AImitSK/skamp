# Phase 5: KI-Assistenten Integration

## Ziel
Den KI-Assistenten um den Experten-Modus erweitern, der die Marken-DNA und Projekt-Strategie automatisch nutzt.

---

## Aktuelle Modi (Ist-Zustand)

```
KI-Assistent
├── Standard-Modus
│   ├── Checkboxen für Optionen
│   └── Template-Auswahl
└── (kein Experten-Modus)
```

## Neue Modi (Soll-Zustand)

```
KI-Assistent
├── Standard-Modus (wie bisher)
│   ├── Checkboxen für Optionen
│   └── Template-Auswahl
│
└── Experten-Modus (NEU) - CeleroPress Formel
    ├── 🧪 DNA Synthese wird übergeben (~500 Tokens)
    ├── 💬 Kernbotschaft wird verwendet
    ├── 🧬 AI Sequenz generiert 📋 Text-Matrix
    └── KI hat spezielle Anleitung
```

---

## Aufgaben

### 5.1 KI-Assistenten UI erweitern

**Datei:** Bestehende Assistenten-Komponente erweitern

```tsx
// Modus-Auswahl hinzufügen
<div className="mb-4">
  <label className="text-sm font-medium">Modus</label>
  <div className="flex gap-2 mt-1">
    <Button
      variant={mode === 'standard' ? 'primary' : 'outline'}
      onClick={() => setMode('standard')}
    >
      Standard
    </Button>
    <Button
      variant={mode === 'expert' ? 'primary' : 'outline'}
      onClick={() => setMode('expert')}
      disabled={!hasDNASynthese}
      title={!hasDNASynthese ? 'Erstellen Sie zuerst eine DNA Synthese' : ''}
    >
      <BeakerIcon className="h-4 w-4 mr-1" />
      Experte
    </Button>
  </div>
</div>
```

---

### 5.2 Kontext-Aufbereitung für KI

**Datei:** `src/lib/ai/context-builder.ts`

```typescript
interface AIContext {
  mode: 'standard' | 'expert';
  dnaSynthese?: string;              // 🧪 Kurzform (~500 Tokens)
  kernbotschaft?: Kernbotschaft;
  userPrompt: string;
  selectedOptions?: string[];
  template?: string;
}

export async function buildAIContext(
  projectId: string,
  mode: 'standard' | 'expert',
  userPrompt: string,
  options?: { selectedOptions?: string[]; template?: string }
): Promise<AIContext> {
  const context: AIContext = {
    mode,
    userPrompt,
    ...options,
  };

  if (mode === 'expert') {
    // 🧪 DNA Synthese laden (bereits verdichtet, ~500 Tokens)
    const dnaSynthese = await dnaSyntheseService.get(projectId);
    if (dnaSynthese) {
      context.dnaSynthese = dnaSynthese.plainText;
    }

    // 💬 Kernbotschaft laden
    const kernbotschaft = await kernbotschaftService.get(projectId);
    if (kernbotschaft) {
      context.kernbotschaft = kernbotschaft;
    }
  }

  return context;
}
```

---

### 5.3 System-Prompt für Experten-Modus

**Datei:** `src/genkit/prompts/expert-mode-prompt.ts`

```typescript
export function buildExpertModePrompt(context: AIContext): string {
  let prompt = `Du bist ein erfahrener PR-Profi und Texter.

MODUS: EXPERTE 🧪 - CeleroPress Formel
Du hast Zugriff auf die DNA Synthese des Kunden und nutzt diese
für konsistente, markentreue Kommunikation.

`;

  // 🧪 DNA Synthese einbinden (bereits verdichtet, ~500 Tokens)
  if (context.dnaSynthese) {
    prompt += `
═══════════════════════════════════════════════════════════════════
🧪 DNA SYNTHESE (KI-optimierte Kurzform der Marken-DNA)
═══════════════════════════════════════════════════════════════════

${context.dnaSynthese}

WICHTIG: Nutze Tonalität, Kernbotschaften und Positionierung aus dieser Synthese!

`;
  }

  // Projekt-Kernbotschaft einbinden
  if (context.kernbotschaft) {
    prompt += `
═══════════════════════════════════════════════════════════════════
PROJEKT-KERNBOTSCHAFT (Aktuelle Aufgabe)
═══════════════════════════════════════════════════════════════════

## ANLASS
${context.kernbotschaft.occasion}

## ZIEL
${context.kernbotschaft.goal}

## KERNBOTSCHAFT FÜR DIESES PROJEKT
${context.kernbotschaft.keyMessage}

`;
  }

  // Anleitung für die KI
  prompt += `
═══════════════════════════════════════════════════════════════════
DEINE AUFGABE
═══════════════════════════════════════════════════════════════════

Erstelle den gewünschten Text unter Beachtung folgender Regeln:

1. KONSISTENZ: Halte dich strikt an Positionierung und Tonalität aus der DNA Synthese
2. BOTSCHAFTEN: Integriere die Kernbotschaften subtil - nicht plakativ
3. ZIELGRUPPE: Schreibe für die definierten Zielgruppen
4. FOKUS: Erfülle das Projektziel und transportiere die Projekt-Kernbotschaft
5. FAKTEN: Nutze nur Fakten aus der Synthese - erfinde nichts dazu

═══════════════════════════════════════════════════════════════════
USER-ANFRAGE
═══════════════════════════════════════════════════════════════════

${context.userPrompt}
`;

  return prompt;
}
```

---

### 5.4 Genkit Flow für Experten-Modus

**Datei:** `src/genkit/flows/expert-assistant.ts`

```typescript
const ExpertAssistantInputSchema = z.object({
  projectId: z.string(),
  userPrompt: z.string(),
  outputFormat: z.enum(['pressrelease', 'social', 'blog', 'email', 'custom']).optional(),
});

const ExpertAssistantOutputSchema = z.object({
  content: z.string(),
  usedMarkenDNA: z.boolean(),
  usedProjectStrategy: z.boolean(),
  suggestions: z.array(z.string()).optional(),
});

export const expertAssistantFlow = ai.defineFlow(
  {
    name: 'expertAssistantFlow',
    inputSchema: ExpertAssistantInputSchema,
    outputSchema: ExpertAssistantOutputSchema,
  },
  async (input) => {
    // Kontext aufbauen
    const context = await buildAIContext(
      input.projectId,
      'expert',
      input.userPrompt
    );

    // System-Prompt erstellen
    const systemPrompt = buildExpertModePrompt(context);

    // Generieren
    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-pro'),
      system: systemPrompt,
      prompt: input.userPrompt,
      config: { temperature: 0.7 },
    });

    return {
      content: response.text,
      usedMarkenDNA: !!context.markenDNA,
      usedProjectStrategy: !!context.projectStrategy,
    };
  }
);
```

---

### 5.5 API-Endpunkt

**Datei:** `src/app/api/assistant/expert/route.ts`

```typescript
import { expertAssistantFlow } from '@/genkit/flows/expert-assistant';

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Berechtigungsprüfung für Projekt
  const hasAccess = await checkProjectAccess(body.projectId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await expertAssistantFlow(body);

  return NextResponse.json(result);
}
```

---

### 5.6 Frontend Hook

**Datei:** `src/lib/hooks/useExpertAssistant.ts`

```typescript
export function useExpertAssistant(projectId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExpertAssistantOutput | null>(null);

  const generate = async (prompt: string, outputFormat?: string) => {
    setIsLoading(true);

    const response = await fetch('/api/assistant/expert', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        userPrompt: prompt,
        outputFormat,
      }),
    });

    const data = await response.json();
    setResult(data);
    setIsLoading(false);

    return data;
  };

  return {
    generate,
    result,
    isLoading,
  };
}
```

---

## UI-Anpassungen

### Modus-Indikator

```tsx
// Zeigt an welche Daten verwendet werden
{mode === 'expert' && (
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
    <div className="flex items-center gap-2 text-purple-700 font-medium">
      <BeakerIcon className="h-4 w-4" />
      Experten-Modus aktiv
    </div>
    <ul className="mt-2 space-y-1 text-purple-600">
      {usedDNASynthese && (
        <li className="flex items-center gap-1">
          <CheckIcon className="h-3 w-3" />
          🧪 DNA Synthese wird verwendet
        </li>
      )}
      {usedKernbotschaft && (
        <li className="flex items-center gap-1">
          <CheckIcon className="h-3 w-3" />
          💬 Kernbotschaft wird verwendet
        </li>
      )}
    </ul>
  </div>
)}
```

### Ergebnis-Anzeige

```tsx
// Nach Generierung
{result && (
  <div className="mt-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-500 flex items-center gap-1">
        {result.usedDNASynthese && <BeakerIcon className="h-4 w-4" />}
        Generiert mit {result.usedDNASynthese ? 'DNA Synthese (CeleroPress Formel)' : 'Standard-Einstellungen'}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.content)}>
          Kopieren
        </Button>
        <Button size="sm" variant="outline" onClick={() => insertIntoEditor(result.content)}>
          Einfügen
        </Button>
      </div>
    </div>
    <div className="prose max-w-none border rounded-lg p-4">
      {result.content}
    </div>
  </div>
)}
```

---

## Logik-Zusammenfassung

```
User wählt Modus
        ↓
┌───────────────────────────────────────────────────────────────┐
│                         STANDARD                              │
│  - Checkboxen und Templates wie bisher                        │
│  - Keine automatische Kontext-Ladung                          │
│  - DNA Synthese wird NICHT verwendet                          │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│              🧪 EXPERTE - CeleroPress Formel                  │
│  - 🧪 DNA Synthese wird geladen (~500 Tokens)                 │
│  - 💬 Kernbotschaft wird geladen                              │
│  - 🧬 AI Sequenz kombiniert beides                            │
│  - 📋 Text-Matrix wird generiert                              │
│  - KI hat spezielle Anleitung für konsistente Texte           │
│  - Token-effizient durch Synthese statt 6 Dokumente           │
└───────────────────────────────────────────────────────────────┘
```

---

## Abhängigkeiten

- Phase 1 (Datenmodell - für Marken-Synthese Interface)
- Phase 3 (KI-Chat - für Genkit Setup)
- Phase 4 (Strategie-Tab - für Marken-Synthese & Kernbotschaft)
- Bestehender KI-Assistent

---

## Erledigungs-Kriterien

- [ ] Modus-Auswahl im UI mit BeakerIcon
- [ ] Standard-Modus funktioniert wie bisher
- [ ] Experten-Modus lädt 🧪 DNA Synthese automatisch
- [ ] DNA Synthese wird korrekt an KI übergeben (~500 Tokens)
- [ ] 💬 Kernbotschaft wird korrekt an KI übergeben
- [ ] 🧬 AI Sequenz generiert 📋 Text-Matrix
- [ ] System-Prompt (CeleroPress Formel) ist vollständig und korrekt
- [ ] Ergebnis zeigt an welche Daten verwendet wurden
- [ ] BeakerIcon (🧪) konsistent für DNA Synthese verwendet
- [ ] Tests geschrieben

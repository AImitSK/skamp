# Phase 5: KI-Assistenten Integration

> **Workflow-Agent:** Für die Implementierung dieser Phase den `marken-dna-impl` Agent verwenden.
> Siehe `10-WORKFLOW-AGENT.md` für Details zum schrittweisen Workflow.

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

### 5.3 System-Prompt für Experten-Modus (Mehrsprachig)

**Datei:** `src/lib/ai/prompts/expert-mode.ts`

```typescript
type PromptLanguage = 'de' | 'en';

// Mehrsprachige Basis-Texte für den System-Prompt
const EXPERT_MODE_TEXTS: Record<PromptLanguage, {
  intro: string;
  synthesiHeader: string;
  synthesisNote: string;
  kernbotschaftHeader: string;
  occasionLabel: string;
  goalLabel: string;
  messageLabel: string;
  taskHeader: string;
  rules: string[];
  userRequestHeader: string;
}> = {
  de: {
    intro: `Du bist ein erfahrener PR-Profi und Texter.

MODUS: EXPERTE 🧪 - CeleroPress Formel
Du hast Zugriff auf die DNA Synthese des Kunden und nutzt diese
für konsistente, markentreue Kommunikation.`,
    synthesiHeader: '🧪 DNA SYNTHESE (KI-optimierte Kurzform der Marken-DNA)',
    synthesisNote: 'WICHTIG: Nutze Tonalität, Kernbotschaften und Positionierung aus dieser Synthese!',
    kernbotschaftHeader: 'PROJEKT-KERNBOTSCHAFT (Aktuelle Aufgabe)',
    occasionLabel: 'ANLASS',
    goalLabel: 'ZIEL',
    messageLabel: 'KERNBOTSCHAFT FÜR DIESES PROJEKT',
    taskHeader: 'DEINE AUFGABE',
    rules: [
      'KONSISTENZ: Halte dich strikt an Positionierung und Tonalität aus der DNA Synthese',
      'BOTSCHAFTEN: Integriere die Kernbotschaften subtil - nicht plakativ',
      'ZIELGRUPPE: Schreibe für die definierten Zielgruppen',
      'FOKUS: Erfülle das Projektziel und transportiere die Projekt-Kernbotschaft',
      'FAKTEN: Nutze nur Fakten aus der Synthese - erfinde nichts dazu',
    ],
    userRequestHeader: 'USER-ANFRAGE',
  },
  en: {
    intro: `You are an experienced PR professional and copywriter.

MODE: EXPERT 🧪 - CeleroPress Formula
You have access to the customer's DNA Synthesis and use it
for consistent, brand-aligned communication.`,
    synthesiHeader: '🧪 DNA SYNTHESIS (AI-optimized summary of Brand DNA)',
    synthesisNote: 'IMPORTANT: Use tonality, key messages and positioning from this synthesis!',
    kernbotschaftHeader: 'PROJECT KEY MESSAGE (Current Task)',
    occasionLabel: 'OCCASION',
    goalLabel: 'GOAL',
    messageLabel: 'KEY MESSAGE FOR THIS PROJECT',
    taskHeader: 'YOUR TASK',
    rules: [
      'CONSISTENCY: Strictly adhere to positioning and tonality from the DNA Synthesis',
      'MESSAGES: Integrate key messages subtly - not blatantly',
      'AUDIENCE: Write for the defined target groups',
      'FOCUS: Fulfill the project goal and convey the project key message',
      'FACTS: Use only facts from the synthesis - do not invent anything',
    ],
    userRequestHeader: 'USER REQUEST',
  },
};

export function buildExpertModePrompt(
  context: AIContext,
  language: PromptLanguage = 'de'
): string {
  const texts = EXPERT_MODE_TEXTS[language] || EXPERT_MODE_TEXTS['de'];

  let prompt = texts.intro + '\n\n';

  // 🧪 DNA Synthese einbinden (bereits verdichtet, ~500 Tokens)
  if (context.dnaSynthese) {
    prompt += `
═══════════════════════════════════════════════════════════════════
${texts.synthesiHeader}
═══════════════════════════════════════════════════════════════════

${context.dnaSynthese}

${texts.synthesisNote}

`;
  }

  // Projekt-Kernbotschaft einbinden
  if (context.kernbotschaft) {
    prompt += `
═══════════════════════════════════════════════════════════════════
${texts.kernbotschaftHeader}
═══════════════════════════════════════════════════════════════════

## ${texts.occasionLabel}
${context.kernbotschaft.occasion}

## ${texts.goalLabel}
${context.kernbotschaft.goal}

## ${texts.messageLabel}
${context.kernbotschaft.keyMessage}

`;
  }

  // Anleitung für die KI
  prompt += `
═══════════════════════════════════════════════════════════════════
${texts.taskHeader}
═══════════════════════════════════════════════════════════════════

${language === 'de' ? 'Erstelle den gewünschten Text unter Beachtung folgender Regeln:' : 'Create the requested text following these rules:'}

${texts.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

═══════════════════════════════════════════════════════════════════
${texts.userRequestHeader}
═══════════════════════════════════════════════════════════════════

${context.userPrompt}
`;

  return prompt;
}
```

> **Hinweis:** Der System-Prompt wird in der UI-Sprache des Benutzers generiert.
> Siehe `07-ENTWICKLUNGSRICHTLINIEN.md` für vollständige Sprach-Handling Dokumentation.

---

### 5.4 Genkit Flow für Experten-Modus

**Datei:** `src/lib/ai/flows/expert-assistant.ts`

```typescript
import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { buildAIContext } from '@/lib/ai/context-builder';
import { buildExpertModePrompt } from '@/lib/ai/prompts/expert-mode';

const ExpertAssistantInputSchema = z.object({
  projectId: z.string(),
  userPrompt: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  outputFormat: z.enum(['pressrelease', 'social', 'blog', 'email', 'custom']).optional(),
});

const ExpertAssistantOutputSchema = z.object({
  content: z.string(),
  usedDNASynthese: z.boolean(),
  usedKernbotschaft: z.boolean(),
  suggestions: z.array(z.string()).optional(),
});

export const expertAssistantFlow = ai.defineFlow(
  {
    name: 'expertAssistantFlow',
    inputSchema: ExpertAssistantInputSchema,
    outputSchema: ExpertAssistantOutputSchema,
  },
  async (input) => {
    // Kontext aufbauen (lädt 🧪 DNA Synthese + 💬 Kernbotschaft)
    const context = await buildAIContext(
      input.projectId,
      'expert',
      input.userPrompt
    );

    // System-Prompt in der Benutzersprache erstellen
    const systemPrompt = buildExpertModePrompt(context, input.language);

    // Generieren mit Gemini
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: input.userPrompt,
      config: { temperature: 0.7 },
    });

    return {
      content: response.text,
      usedDNASynthese: !!context.dnaSynthese,
      usedKernbotschaft: !!context.kernbotschaft,
    };
  }
);
```

### 5.4.1 API-Route

**Datei:** `src/app/api/assistant/expert/route.ts`

```typescript
import { expertAssistantFlow } from '@/lib/ai/flows/expert-assistant';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

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

  try {
    const result = await expertAssistantFlow(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Expert Assistant Error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
```

---

### 5.5 Frontend Hook (Genkit)

**Datei:** `src/lib/hooks/useExpertAssistant.ts`

```typescript
import { useLocale } from 'next-intl';
import { useState, useCallback } from 'react';
import { toastService } from '@/lib/utils/toast';
import { useTranslations } from 'next-intl';

interface ExpertAssistantResult {
  content: string;
  usedDNASynthese: boolean;
  usedKernbotschaft: boolean;
  suggestions?: string[];
}

export function useExpertAssistant(projectId: string) {
  const locale = useLocale();
  const tToast = useTranslations('toasts');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExpertAssistantResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (prompt: string, outputFormat?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assistant/expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userPrompt: prompt,
          language: locale,
          outputFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      toastService.error(tToast('markenDNA.generationError', { error: error.message }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, locale, tToast]);

  const copyToClipboard = useCallback(async () => {
    if (result?.content) {
      await navigator.clipboard.writeText(result.content);
      toastService.success(tToast('copySuccess'));
    }
  }, [result, tToast]);

  return {
    generate,
    result,
    isLoading,
    error,
    copyToClipboard,
    usedDNASynthese: result?.usedDNASynthese ?? false,
    usedKernbotschaft: result?.usedKernbotschaft ?? false,
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
      {hasDNASynthese && (
        <li className="flex items-center gap-1">
          <CheckIcon className="h-3 w-3" />
          🧪 DNA Synthese wird verwendet
        </li>
      )}
      {hasKernbotschaft && (
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
        Generiert mit {result.usedDNASynthese
          ? '🧪 DNA Synthese (CeleroPress Formel)'
          : 'Standard-Einstellungen'}
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

## Toast-Benachrichtigungen & i18n

Feedback für KI-Generierung im Experten-Modus mit **next-intl**:

```typescript
import { useTranslations } from 'next-intl';
import { toastService } from '@/lib/utils/toast';

// Im useExpertAssistant Hook
export function useExpertAssistant(projectId: string) {
  const t = useTranslations('markenDNA');
  const tToast = useTranslations('toasts');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExpertAssistantOutput | null>(null);

  const generate = async (prompt: string, outputFormat?: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/expert', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          userPrompt: prompt,
          outputFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setResult(data);

      // Info über verwendete Daten
      if (data.usedDNASynthese) {
        toastService.info(t('expert.generatedWithSynthesis'));
      }

      return data;
    } catch (error) {
      toastService.error(tToast('markenDNA.generationError', { error: error.message }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // In Zwischenablage kopieren
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toastService.success(tToast('copySuccess'));
    } catch (error) {
      toastService.error(tToast('copyError'));
    }
  };

  // In Editor einfügen
  const insertIntoEditor = (content: string) => {
    // Editor-Logik...
    toastService.success(t('expert.insertedIntoEditor'));
  };

  return {
    generate,
    copyToClipboard,
    insertIntoEditor,
    result,
    isLoading,
  };
}
```

> Siehe `07-ENTWICKLUNGSRICHTLINIEN.md` für vollständige Toast- und i18n-Dokumentation.

---

## Abhängigkeiten

- Phase 1 (Datenmodell - für Marken-Synthese Interface)
- Phase 3 (KI-Chat mit Genkit Flows)
- Phase 4 (Strategie-Tab - für Marken-Synthese & Kernbotschaft)
- Bestehender KI-Assistent
- Bestehende Genkit-Konfiguration (`src/lib/ai/genkit-config.ts`)
- **Zentraler Toast-Service** (`src/lib/utils/toast.ts`)

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

---

## Nächste Schritte

- **Abschluss:** `09-DOKUMENTATION.md` (Phase 6: Dokumentation erstellen)
- Alle Services, Hooks, Flows dokumentieren
- ADRs für Architektur-Entscheidungen schreiben
- README für `docs/marken-dna/` erstellen

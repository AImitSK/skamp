# Phase 5: KI-Assistenten Integration

> **Workflow-Agent:** Für die Implementierung dieser Phase den `marken-dna-impl` Agent verwenden.
> Siehe `10-WORKFLOW-AGENT.md` für Details zum schrittweisen Workflow.

## Ziel
Den KI-Assistenten um den Experten-Modus erweitern, der die Marken-DNA und Projekt-Strategie automatisch nutzt – mit garantiertem PR-SEO Score von 85-95%.

---

## Die Drei-Schichten-Architektur (AI Sequenz)

Der Experten-Modus orchestriert drei Schichten mit klarer Prioritäts-Hierarchie:

EBENE 1: MARKEN-DNA (Höchste Priorität)
- Tonalität (formal/casual/modern) → ÜBERSCHREIBT Ebene 2
- USP & Positionierung
- Kernbotschaften (Dachbotschaften)
- No-Go-Words (Blacklist)
- Zielgruppen-Definition
- Quelle: DNA Synthese (~500 Tokens)

EBENE 2: SCORE-REGELN (Journalistisches Handwerk)
- Headline: 40-75 Zeichen, aktive Verben, Keywords
- Lead: 80-200 Zeichen, 5 W-Fragen
- Struktur: 3-4 Absätze, je 150-400 Zeichen
- Zitat: "Wörtliche Rede", sagt [Name], [Rolle]
- CTA + Hashtags
- Industrie-spezifische Anpassungen
- Quelle: Shared Prompt Library (SCORE_PROMPTS)

EBENE 3: PROJEKT-KONTEXT (Aktuelle Fakten)
- Anlass (Warum jetzt?)
- Ziel (Was soll erreicht werden?)
- Teilbotschaft (Projekt-spezifische Message)
- Material/Fakten (Daten für dieses Projekt)
- Quelle: Kernbotschaft

**Kritische Regel:** Die Tonalität der Marken-DNA (Ebene 1) hat bei Konflikten **immer Vorrang** vor den allgemeinen Branchenregeln (Ebene 2).

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
    ├── Score-Regeln aus Shared Library
    ├── Tonalitäts-Override möglich (mit Warnung)
    ├── PR-SEO Score 85-95% garantiert
    └── KI hat spezielle Anleitung
```

---

## Aufgaben

### 5.1 Shared Prompt Library erstellen

**Datei:** `src/lib/ai/prompts/score-optimization.ts`

```typescript
/**
 * Shared Prompt Library für PR-SEO Score Optimierung
 *
 * Diese Library enthält alle Regeln für konsistente, SEO-optimierte PR-Texte.
 * Die Regeln werden in der AI Sequenz (Ebene 2) verwendet.
 */

export const SCORE_PROMPTS = {
  headline: {
    rules: [
      'Länge: 40-75 Zeichen (optimal für Social Media & SEO)',
      'Aktive Verben verwenden (bringt, schafft, revolutioniert)',
      'Keywords in erste 5 Wörter',
      'Keine Füllwörter (sehr, besonders, ganz)',
      'Zahlen und Fakten bevorzugen',
    ],
    examples: {
      good: [
        'KI-Startup sichert 50 Mio. € Series-A-Finanzierung',
        'Neue Plattform reduziert CO2-Emissionen um 40%',
      ],
      bad: [
        'Sehr interessante Neuigkeiten von unserem Unternehmen',
        'Wir freuen uns sehr über eine tolle Entwicklung',
      ],
    },
  },

  lead: {
    rules: [
      'Länge: 80-200 Zeichen',
      'Beantwortet 5 W-Fragen (Wer, Was, Wann, Wo, Warum)',
      'Wichtigste Info zuerst (umgekehrte Pyramide)',
      'Keine Wiederholung der Headline',
      'Call-to-Action implizit vorbereiten',
    ],
  },

  structure: {
    rules: [
      '3-4 Absätze optimal',
      'Absatzlänge: 150-400 Zeichen',
      'Ein Gedanke pro Absatz',
      'Bulletpoints sparsam einsetzen',
      'Leerraum für Lesbarkeit',
    ],
  },

  quote: {
    rules: [
      'Wörtliche Rede in Anführungszeichen',
      'Zuordnung: "Text", sagt [Name], [Rolle]',
      'Persönliche Perspektive (nicht Marketing-Sprech)',
      'Maximal 2 Zitate pro Text',
      'Zitat bringt Emotion oder Experten-Perspektive',
    ],
    examples: {
      good: [
        '"Diese Technologie wird die Branche grundlegend verändern", sagt Dr. Sarah Müller, CTO.',
        '"Wir haben drei Jahre an dieser Lösung gearbeitet", erklärt Gründer Max Schmidt.',
      ],
      bad: [
        'Wir freuen uns sehr über diese Entwicklung.',
        'Unser Unternehmen ist führend in diesem Bereich.',
      ],
    },
  },

  cta: {
    rules: [
      'Klar und konkret (nicht "mehr Infos")',
      'Link zur Landingpage/Whitepaper',
      '3-5 relevante Hashtags',
      'Hashtags: Branche + Thema + evtl. Event',
      'Keine generischen Tags (#innovation #digital)',
    ],
    examples: {
      good: [
        'Jetzt Whitepaper herunterladen: [URL] #KI #Gesundheitswesen #MedTech',
        'Live-Demo buchen: [URL] #PropTech #Immobilien #Nachhaltigkeit',
      ],
      bad: [
        'Mehr Informationen auf unserer Website. #news #update',
      ],
    },
  },

  industry: {
    tech: [
      'Fokus auf Innovation und technische Details',
      'Metriken und Performance-Daten',
      'Integration und API-Möglichkeiten erwähnen',
      'Open Source oder Partnerschaften hervorheben',
    ],
    healthcare: [
      'Patientennutzen in den Vordergrund',
      'Regulatorische Zulassungen erwähnen',
      'Datenschutz und Sicherheit betonen',
      'Evidenzbasierte Aussagen (Studien, Daten)',
    ],
    finance: [
      'ROI und Business-Impact betonen',
      'Compliance und Regulierung adressieren',
      'Risikomanagement erwähnen',
      'Konkrete Zahlen und Benchmarks',
    ],
  },
};

/**
 * Generiert Score-Optimierungs-Prompt basierend auf Industrie
 */
export function getScoreOptimizationPrompt(industry?: string): string {
  const industryRules = industry && SCORE_PROMPTS.industry[industry as keyof typeof SCORE_PROMPTS.industry]
    ? SCORE_PROMPTS.industry[industry as keyof typeof SCORE_PROMPTS.industry]
    : [];

  return `
EBENE 2: SCORE-REGELN (Journalistisches Handwerk)

Optimiere den Text für einen PR-SEO Score von 85-95% basierend auf diesen Regeln:

HEADLINE
${SCORE_PROMPTS.headline.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

LEAD
${SCORE_PROMPTS.lead.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

STRUKTUR
${SCORE_PROMPTS.structure.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ZITAT
${SCORE_PROMPTS.quote.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

CTA & HASHTAGS
${SCORE_PROMPTS.cta.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${industryRules.length > 0 ? `
INDUSTRIE-SPEZIFISCH (${industry?.toUpperCase()})
${industryRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
` : ''}

WICHTIG: Diese Regeln gelten IMMER, außer die Marken-DNA (Ebene 1) fordert explizit etwas anderes (z.B. informelle Tonalität statt formeller).
`;
}
```

---

### 5.2 AI Sequenz Prompt Builder

**Datei:** `src/lib/ai/prompts/ai-sequence.ts`

```typescript
import { getScoreOptimizationPrompt } from './score-optimization';

interface AISequenceContext {
  dnaSynthese?: string;
  kernbotschaft?: {
    occasion: string;
    goal: string;
    keyMessage: string;
  };
  industry?: string;
  toneOverride?: 'formal' | 'casual' | 'modern' | null;
}

/**
 * Baut den vollständigen AI Sequenz Prompt mit drei Ebenen:
 * EBENE 1: Marken-DNA (höchste Priorität)
 * EBENE 2: Score-Regeln (journalistisches Handwerk)
 * EBENE 3: Projekt-Kontext (aktuelle Fakten)
 */
export function buildAISequencePrompt(context: AISequenceContext): string {
  let prompt = '';

  // EBENE 1: MARKEN-DNA
  if (context.dnaSynthese) {
    const extractedTone = extractToneFromDNA(context.dnaSynthese);
    const effectiveTone = context.toneOverride || extractedTone;

    prompt += `
═══════════════════════════════════════════════════════════════════
EBENE 1: MARKEN-DNA (Höchste Priorität)
═══════════════════════════════════════════════════════════════════

${context.dnaSynthese}

EXTRAHIERTE TONALITÄT: ${effectiveTone || 'nicht definiert'}
${context.toneOverride ? `⚠️ TONALITÄTS-OVERRIDE AKTIV: "${context.toneOverride}" überschreibt DNA-Vorgabe` : ''}

WICHTIG:
- Die Tonalität aus dieser DNA hat VORRANG vor allen anderen Regeln
- USP, Kernbotschaften und No-Go-Words sind bindend
- Zielgruppe bestimmt Sprache und Komplexität

`;
  }

  // EBENE 2: SCORE-REGELN
  prompt += `
═══════════════════════════════════════════════════════════════════
${getScoreOptimizationPrompt(context.industry)}
═══════════════════════════════════════════════════════════════════

`;

  // EBENE 3: PROJEKT-KONTEXT
  if (context.kernbotschaft) {
    prompt += `
═══════════════════════════════════════════════════════════════════
EBENE 3: PROJEKT-KONTEXT (Aktuelle Fakten)
═══════════════════════════════════════════════════════════════════

ANLASS (Warum jetzt?)
${context.kernbotschaft.occasion}

ZIEL (Was soll erreicht werden?)
${context.kernbotschaft.goal}

KERNBOTSCHAFT FÜR DIESES PROJEKT
${context.kernbotschaft.keyMessage}

`;
  }

  prompt += `
═══════════════════════════════════════════════════════════════════
KONFLIKT-AUFLÖSUNG
═══════════════════════════════════════════════════════════════════

Bei Konflikten zwischen den Ebenen gilt folgende Priorität:
1. EBENE 1 (Marken-DNA) überschreibt IMMER Ebene 2
2. EBENE 2 (Score-Regeln) ist Standard, wenn Ebene 1 nichts anderes fordert
3. EBENE 3 (Projekt-Kontext) liefert die aktuellen Fakten

Beispiel: Wenn die DNA "casual und modern" vorgibt, dann nutze NICHT die formelle
Branchensprache aus Ebene 2, sondern passe die Score-Regeln an die DNA-Tonalität an.

ZIEL: PR-SEO Score von 85-95% erreichen, ohne die Marken-DNA zu verletzen.
`;

  return prompt;
}

/**
 * Extrahiert Tonalität aus DNA Synthese
 */
function extractToneFromDNA(dnaSynthese: string): string | null {
  const toneKeywords = {
    formal: ['formell', 'professionell', 'seriös', 'sachlich'],
    casual: ['casual', 'locker', 'entspannt', 'freundlich', 'nahbar'],
    modern: ['modern', 'innovativ', 'frisch', 'jung', 'dynamisch'],
  };

  const lowerDNA = dnaSynthese.toLowerCase();

  for (const [tone, keywords] of Object.entries(toneKeywords)) {
    if (keywords.some(keyword => lowerDNA.includes(keyword))) {
      return tone;
    }
  }

  return null;
}
```

---

### 5.3 Tonalitäts-Override im UI

**Datei:** Erweitere die Assistenten-Komponente

```tsx
import { useState } from 'react';

type ToneOption = 'formal' | 'casual' | 'modern' | null;

function ToneOverrideSelect({
  defaultTone,
  onToneChange
}: {
  defaultTone: string | null;
  onToneChange: (tone: ToneOption) => void;
}) {
  const [showWarning, setShowWarning] = useState(false);

  const handleToneChange = (tone: ToneOption) => {
    if (tone && tone !== defaultTone) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    onToneChange(tone);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Tonalität
        {defaultTone && (
          <span className="ml-2 text-xs text-gray-500">
            (DNA: {defaultTone})
          </span>
        )}
      </label>

      <select
        onChange={(e) => handleToneChange(e.target.value as ToneOption || null)}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">Aus DNA übernehmen</option>
        <option value="formal">Formell</option>
        <option value="casual">Casual</option>
        <option value="modern">Modern</option>
      </select>

      {showWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-800">
              <strong>Achtung:</strong> Du überschreibst die Tonalität aus der Marken-DNA.
              Dies kann zu Inkonsistenzen in der Markenkommunikation führen.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 5.4 KI-Assistenten UI erweitern

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

### 5.5 Kontext-Aufbereitung für KI

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

### 5.6 System-Prompt für Experten-Modus (Mehrsprachig)

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

### 5.7 Genkit Flow für Experten-Modus

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

### 5.7.1 API-Route

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

### 5.8 Frontend Hook (Genkit)

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
- **Shared Prompt Library** (`src/lib/ai/prompts/score-optimization.ts`)

---

## Erledigungs-Kriterien

- [ ] Shared Prompt Library erstellt (score-optimization.ts)
- [ ] AI Sequenz Prompt Builder erstellt (ai-sequence.ts)
- [ ] Tonalität wird aus DNA extrahiert
- [ ] Tonalitäts-Override mit Warnung implementiert
- [ ] Drei-Schichten-Architektur im Prompt korrekt
- [ ] DNA hat bei Konflikten Vorrang (dokumentiert im Prompt)
- [ ] Score-Regeln aus Shared Library eingebunden
- [ ] PR-SEO Score 85-95% wird erreicht (testen!)
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

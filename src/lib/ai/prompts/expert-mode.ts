/**
 * System-Prompt für Experten-Modus (CeleroPress Formel)
 *
 * Der Experten-Modus nutzt die DNA Synthese (~500 Tokens) und Kernbotschaft
 * für konsistente, markentreue Texterstellung.
 */

export type PromptLanguage = 'de' | 'en';

export interface AIContext {
  mode: 'standard' | 'expert';
  dnaSynthese?: string;
  kernbotschaft?: {
    occasion: string;
    goal: string;
    keyMessage: string;
  };
  userPrompt: string;
  selectedOptions?: string[];
  template?: string;
}

// Mehrsprachige Basis-Texte für den System-Prompt
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
}> = {
  de: {
    intro: `Du bist ein erfahrener PR-Profi und Texter bei CeleroPress.

MODUS: EXPERTE 🧪 - CeleroPress Formel
Du hast Zugriff auf die DNA Synthese des Kunden und nutzt diese
für konsistente, markentreue Kommunikation.`,

    synthesisHeader: '🧪 DNA SYNTHESE (KI-optimierte Kurzform der Marken-DNA)',
    synthesisNote: 'WICHTIG: Nutze Tonalität, Kernbotschaften und Positionierung aus dieser Synthese!',

    kernbotschaftHeader: '💬 PROJEKT-KERNBOTSCHAFT (Aktuelle Aufgabe)',
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
      'NO-GO-WORDS: Vermeide strikt alle verbotenen Begriffe aus der DNA',
      'TONALITÄT: Die Tonalität aus der DNA hat VORRANG vor allen anderen Regeln',
    ],
    userRequestHeader: 'USER-ANFRAGE',
  },

  en: {
    intro: `You are an experienced PR professional and copywriter at CeleroPress.

MODE: EXPERT 🧪 - CeleroPress Formula
You have access to the customer's DNA Synthesis and use it
for consistent, brand-aligned communication.`,

    synthesisHeader: '🧪 DNA SYNTHESIS (AI-optimized summary of Brand DNA)',
    synthesisNote: 'IMPORTANT: Use tonality, key messages and positioning from this synthesis!',

    kernbotschaftHeader: '💬 PROJECT KEY MESSAGE (Current Task)',
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
      'NO-GO-WORDS: Strictly avoid all forbidden terms from the DNA',
      'TONALITY: The tonality from the DNA has PRIORITY over all other rules',
    ],
    userRequestHeader: 'USER REQUEST',
  },
};

/**
 * Baut den System-Prompt für den Experten-Modus
 *
 * @param context - Kontext mit DNA Synthese und Kernbotschaft
 * @param language - Sprache für den Prompt (de oder en)
 * @returns Vollständiger System-Prompt für die KI
 */
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
${texts.synthesisHeader}
═══════════════════════════════════════════════════════════════════

${context.dnaSynthese}

${texts.synthesisNote}

`;
  }

  // 💬 Projekt-Kernbotschaft einbinden
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

/**
 * Generiert eine kurze Info über verwendete Daten für das UI
 */
export function getExpertModeInfo(
  context: AIContext,
  language: PromptLanguage = 'de'
): {
  hasDNA: boolean;
  hasKernbotschaft: boolean;
  infoText: string;
} {
  const hasDNA = !!context.dnaSynthese;
  const hasKernbotschaft = !!context.kernbotschaft;

  let infoText = '';

  if (language === 'de') {
    if (hasDNA && hasKernbotschaft) {
      infoText = 'DNA Synthese und Kernbotschaft werden verwendet';
    } else if (hasDNA) {
      infoText = 'DNA Synthese wird verwendet';
    } else if (hasKernbotschaft) {
      infoText = 'Kernbotschaft wird verwendet';
    } else {
      infoText = 'Keine DNA Synthese vorhanden - erstelle zuerst die Marken-DNA';
    }
  } else {
    if (hasDNA && hasKernbotschaft) {
      infoText = 'DNA Synthesis and Key Message are being used';
    } else if (hasDNA) {
      infoText = 'DNA Synthesis is being used';
    } else if (hasKernbotschaft) {
      infoText = 'Key Message is being used';
    } else {
      infoText = 'No DNA Synthesis available - create the Brand DNA first';
    }
  }

  return {
    hasDNA,
    hasKernbotschaft,
    infoText,
  };
}

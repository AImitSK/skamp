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

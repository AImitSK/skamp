// src/lib/ai/genkit-config.ts
// Zentrale Genkit-Konfiguration für alle AI-Flows
// HINWEIS: Nur via dynamischem Import in Server-Context verwenden!
// Webpack Config externalisiert diese Module für Client-Bundle

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { genkitEval, GenkitMetric } from '@genkit-ai/evaluator';

/**
 * Genkit Instance mit Google AI Plugin + Evaluators
 *
 * Verwendet GOOGLE_GENAI_API_KEY aus .env
 */
export const ai = genkit({
  plugins: [
    googleAI(),
    // Genkit Standard-Evaluatoren
    genkitEval({
      judge: googleAI.model('gemini-2.5-flash'),
      embedder: googleAI.embedder('text-embedding-004'), // Required für ANSWER_RELEVANCY
      metrics: [
        GenkitMetric.FAITHFULNESS,
        GenkitMetric.ANSWER_RELEVANCY,
        GenkitMetric.MALICIOUSNESS,
      ],
    }),
  ]
});

// Gemini 2.5 Flash (stabil, 1.5 ist retired!)
// WICHTIG: In JS/TS OHNE 'googleai/' Präfix!
export const gemini25FlashModel = googleAI.model('gemini-2.5-flash');

// Type-Helpers
export type { GenerateOptions } from 'genkit';

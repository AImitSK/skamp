// src/lib/ai/genkit-config.ts
// Zentrale Genkit-Konfiguration für alle AI-Flows
// HINWEIS: Nur via dynamischem Import in Server-Context verwenden!
// Webpack Config externalisiert diese Module für Client-Bundle

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
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

// Gemini Modelle (stabil, 1.5 ist retired!)
// WICHTIG: In JS/TS OHNE 'googleai/' Präfix!

// Gemini 2.5 Flash - Für komplexe Reasoning-Tasks mit Extended Thinking
export const gemini25FlashModel = googleAI.model('gemini-2.5-flash');

// Gemini 2.5 Flash-Lite - Für einfache Text-Transformationen (75% günstiger)
// $0.10/1M Input-Tokens, $0.40/1M Output-Tokens
export const gemini25FlashLiteModel = googleAI.model('gemini-2.5-flash-lite');

// ══════════════════════════════════════════════════════════════
// BILDGENERIERUNG MODELLE
// ══════════════════════════════════════════════════════════════

// Imagen 4 - Empfohlenes Modell für hochwertige Bildgenerierung (Text-zu-Bild)
// $0.04 pro Bild, unterstützt verschiedene Aspect Ratios
export const imagen4Model = googleAI.model('imagen-4.0-generate-002');

// Gemini 2.5 Flash Image - Für konversationelle Bildbearbeitung
export const geminiFlashImageModel = googleAI.model('gemini-2.5-flash-preview-image-generation');

// Type-Helpers
export type { GenerateOptions } from 'genkit';

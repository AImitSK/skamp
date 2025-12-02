// src/lib/ai/genkit-config.ts
// Zentrale Genkit-Konfiguration für alle AI-Flows
// HINWEIS: Nur via dynamischem Import in Server-Context verwenden!
// Webpack Config externalisiert diese Module für Client-Bundle

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { vertexAI } from '@genkit-ai/vertexai';
import { genkitEval, GenkitMetric } from '@genkit-ai/evaluator';

/**
 * Genkit Instance mit Google AI Plugin + Vertex AI Plugin + Evaluators
 *
 * - Google AI (GOOGLE_GENAI_API_KEY): Für Gemini Text-Modelle
 * - Vertex AI (GOOGLE_APPLICATION_CREDENTIALS): Für Imagen Bildgenerierung
 */
// Service Account Credentials für Vertex AI (gleicher wie Firebase Admin)
const getVertexCredentials = () => {
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (serviceAccount) {
    try {
      return JSON.parse(serviceAccount);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export const ai = genkit({
  plugins: [
    googleAI(),
    vertexAI({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      location: process.env.VERTEX_AI_LOCATION || 'europe-west1',
      googleAuth: {
        credentials: getVertexCredentials()
      }
    }),
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
// BILDGENERIERUNG MODELLE (via Vertex AI)
// ══════════════════════════════════════════════════════════════

// Imagen 3 - Für hochwertige Bildgenerierung (Text-zu-Bild)
// $0.03 pro Bild, unterstützt verschiedene Aspect Ratios
// WICHTIG: Imagen ist NUR über Vertex AI verfügbar, nicht über Gemini API
// Model-String Format: 'vertexai/imagen3' (nicht 'imagen-3.0-generate-002')
export const IMAGEN3_MODEL = 'vertexai/imagen3';

// Type-Helpers
export type { GenerateOptions } from 'genkit';

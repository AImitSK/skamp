// src/lib/ai/genkit-config.ts
// Zentrale Genkit-Konfiguration für alle AI-Flows
// HINWEIS: Nur via dynamischem Import in Server-Context verwenden!
// Webpack Config externalisiert diese Module für Client-Bundle

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * Genkit Instance mit Google AI Plugin
 *
 * Verwendet GOOGLE_GENAI_API_KEY aus .env
 */
export const ai = genkit({
  plugins: [googleAI()]
});

// Direkt Model-String verwenden - OHNE -latest Suffix!
export const gemini15FlashModel = 'googleai/gemini-1.5-flash';

// Type-Helpers
export type { GenerateOptions } from 'genkit';

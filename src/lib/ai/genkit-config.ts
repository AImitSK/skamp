// src/lib/ai/genkit-config.ts
// Zentrale Genkit-Konfiguration für alle AI-Flows

import { genkit } from 'genkit';
import { googleAI, gemini20Flash } from '@genkit-ai/googleai';

/**
 * Genkit Instance mit Google AI Plugin
 *
 * Verwendet GOOGLE_GENAI_API_KEY aus .env
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: gemini20Flash // Default Model
});

// Export Models für einfachen Import
export { gemini20Flash };

// Type-Helpers
export type { GenerateOptions } from 'genkit';

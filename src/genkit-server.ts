// src/genkit-server.ts
// Genkit Standalone Server für Dev UI und Flow Execution
// Läuft parallel zu Next.js auf separatem Port

// 🔑 ENV Variables laden (WICHTIG: Vor allen anderen Imports!)
import { config } from 'dotenv';
config({ path: '.env.local' });

// ✅ WICHTIG: Flows und Evaluators müssen EXPORTIERT werden!
export { ai } from './lib/ai/genkit-config';
export { mergeVariantsFlow } from './lib/ai/flows/merge-variants';
export { generatePressReleaseFlow } from './lib/ai/flows/generate-press-release';
export { generatePressReleaseStructuredFlow } from './lib/ai/flows/generate-press-release-structured';
export { generateHeadlinesFlow } from './lib/ai/flows/generate-headlines';
export { textTransformFlow } from './lib/ai/flows/text-transform';
export * from './lib/ai/evaluators/merge-quality-evaluators';
export * from './lib/ai/evaluators/headline-quality-evaluators';
export * from './lib/ai/evaluators/press-release-structured-evaluators';
export * from './lib/ai/evaluators/text-transform-evaluators';

console.log('✅ Genkit Server gestartet!');
console.log('📦 Flows registriert: mergeVariants, generatePressRelease, generatePressReleaseStructured, generateHeadlines, textTransform');
console.log('📊 Evaluators registriert: merge-quality, headline-quality, pr-structured-quality, text-transform-quality');
console.log('🌐 Developer UI: http://localhost:4002 (oder anderer Port)');

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
export * from './lib/ai/evaluators/merge-quality-evaluators';

console.log('✅ Genkit Server gestartet!');
console.log('📦 Flows registriert: mergeVariants, generatePressRelease, generatePressReleaseStructured');
console.log('📊 Evaluators registriert: merge-quality-evaluators');
console.log('🌐 Developer UI: http://localhost:4002 (oder anderer Port)');

// Schneller Test für textTransformFlow ohne MCP
import { config } from 'dotenv';
config({ path: '.env.local' });

import { textTransformFlow } from './src/lib/ai/flows/text-transform';

async function testTextTransform() {
  console.log('🧪 Teste textTransformFlow...\n');

  const testInput = {
    text: 'Die neue KI-gestützte Plattform revolutioniert die Branche.',
    action: 'rephrase' as const,
    fullDocument: undefined,
    tone: undefined,
    instruction: undefined
  };

  console.log('📝 Input:', testInput);
  console.log('\n⏳ Führe Flow aus...\n');

  try {
    const result = await textTransformFlow(testInput);

    console.log('✅ Erfolg!\n');
    console.log('📊 Ergebnis:');
    console.log('  Original:', testInput.text);
    console.log('  Transformiert:', result.transformedText);
    console.log('  Action:', result.action);
    console.log('  Word Count Change:', result.wordCountChange);
    console.log('  Timestamp:', result.timestamp);
  } catch (error: any) {
    console.error('❌ Fehler:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTextTransform();

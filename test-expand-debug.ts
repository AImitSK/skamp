import { config } from 'dotenv';
config({ path: '.env.local' });

import { textTransformFlow } from './src/lib/ai/flows/text-transform';

async function testExpand() {
  const originalText = "Der IBD Wickeltechnik Spannkopf ist akkurat für zeitgemäße Linien. Er sichert Aufwickelkerne bis 250 kg. Optimierte Ergonomie und rasche Kernwechsel erhöhen Leistungsfähigkeit. Eine wirtschaftliche Lösung.";

  console.log('📝 ORIGINAL TEXT:');
  console.log(originalText);
  console.log(`\nWörter: ${originalText.split(/\s+/).length}`);
  console.log(`Zeichen: ${originalText.length}\n`);

  console.log('⏳ Führe EXPAND aus (sollte 50% mehr Wörter haben)...\n');

  const result = await textTransformFlow({
    text: originalText,
    action: 'expand',
    fullDocument: null,
    tone: null,
    instruction: null
  });

  console.log('✅ ERGEBNIS:');
  console.log(result.transformedText);
  console.log(`\nWörter Original: ${originalText.split(/\s+/).length}`);
  console.log(`Wörter Transformiert: ${result.transformedText.split(/\s+/).length}`);
  console.log(`Word Count Change: ${result.wordCountChange}`);
  console.log(`Erwartete Wörter (50% mehr): ${Math.round(originalText.split(/\s+/).length * 1.5)}`);
}

testExpand().catch(console.error);

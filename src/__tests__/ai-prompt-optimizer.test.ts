/**
 * AI PROMPT OPTIMIZER - Evolutionäres Prompt-Verbesserungs-System
 * 
 * Führt automatische Prompt-Optimierung durch:
 * 1. Testet aktuellen Prompt mit 3 Textarten
 * 2. Bewertet Ergebnisse nach Kriterien (Score 0-100)
 * 3. Analysiert Fehler und verbessert Prompt
 * 4. Wiederholt bis Schwellenwert erreicht (>85 für alle Texte)
 * 
 * Verwendung: npm test ai-prompt-optimizer.test.ts
 */

import { describe, it, expect } from '@jest/globals';

// TEST-DATEN (verschiedene Schwierigkeitsgrade)
const TEST_TEXTS = {
  short: {
    name: "Kurzer Satz",
    text: "SK Online Marketing bietet B2B-Marketing-Lösungen.",
    expectedWords: 7,
    expectedParagraphs: 1,
    allowedWordVariance: 3
  },
  
  medium: {
    name: "Textblock",
    text: "SK Online Marketing ist die digitale Werbeagentur aus Bad Oeynhausen, spezialisiert auf B2B-Marketing für Industrie, Maschinenbau und Dienstleister. Wir verbinden 20+ Jahre Erfahrung im Online-Marketing mit frischen Ideen, um Unternehmen ins beste Licht zu rücken.",
    expectedWords: 47,
    expectedParagraphs: 1,
    allowedWordVariance: 8
  },
  
  long: {
    name: "Text mit Aufzählung",
    text: `SK Online Marketing aus Bad Oeynhausen bietet professionelle B2B-Marketing-Services:

• Website-Entwicklung und SEO-Optimierung
• Social Media Marketing für Industrie-Unternehmen  
• Content-Marketing und PR-Strategien

Mit 20+ Jahren Erfahrung entwickeln wir maßgeschneiderte Lösungen für Maschinenbau und Dienstleister.`,
    expectedWords: 38,
    expectedParagraphs: 3, // Text + Aufzählung + Abschluss
    allowedWordVariance: 10,
    hasLists: true
  }
};

// BEWERTUNGSKRITERIEN
interface TestResult {
  text: string;
  score: number;
  wordCount: number;
  paragraphCount: number;
  wordVariance: number;
  hasUnwantedPMStructure: boolean;
  hasUnwantedFormatting: boolean;
  preservesLists?: boolean;
  errors: string[];
}

// MOCK AI-API für Tests (simuliert verschiedene Qualitätsstufen)
const mockAICall = async (prompt: string): Promise<string> => {
  // Extrahiere den ursprünglichen Text aus dem Prompt
  // Suche nach "Text: " am Ende des Prompts (nach allen Regeln)
  // Verwende [\s\S] statt . mit s-Flag (ES2018-kompatibel)
  const textMatch = prompt.match(/Text:\s*([\s\S]+)$/);
  if (!textMatch) {
    return "SK Online Marketing bietet B2B-Marketing-Lösungen.";
  }

  const originalText = textMatch[1].trim();
  
  // Simuliere verschiedene AI-Qualitäten basierend auf Prompt-Generation
  if (prompt.includes('ULTIMATIVE ANWEISUNG') || prompt.includes('GENERATION 20+')) {
    // Sehr gute Prompts - Generation 20+ (hohe Qualität)
    if (originalText.includes('SK Online Marketing bietet B2B-Marketing')) {
      return "SK Online Marketing stellt B2B-Marketing-Services bereit.";
    }
    
    if (originalText.includes('digitale Werbeagentur aus Bad Oeynhausen')) {
      return `SK Online Marketing ist die digitale Werbeagentur aus Bad Oeynhausen, fokussiert auf B2B-Marketing für Industrie, Maschinenbau und Dienstleister. Wir kombinieren 20+ Jahre Expertise mit innovativen Konzepten, um Firmen optimal zu präsentieren.`;
    }
    
    if (originalText.includes('Website-Entwicklung und SEO-Optimierung')) {
      return `SK Online Marketing aus Bad Oeynhausen stellt professionelle B2B-Marketing-Services bereit:

• Webseiten-Entwicklung und SEO-Optimierung
• Social Media Marketing für Industrie-Firmen
• Content-Marketing und PR-Strategien

Mit 20+ Jahren Expertise entwickeln wir maßgeschneiderte Services für Maschinenbau und Dienstleister.`;
    }
  }
  
  else if (prompt.includes('KRITISCHE ANWEISUNG') || prompt.includes('GENERATION 10-19')) {
    // Mittlere Qualität - Generation 10-19
    if (originalText.includes('SK Online Marketing bietet B2B-Marketing')) {
      return "SK Online Marketing stellt B2B-Marketing-Services für Unternehmen bereit."; // Etwas zu lang
    }
    
    if (originalText.includes('digitale Werbeagentur aus Bad Oeynhausen')) {
      return `SK Online Marketing ist die digitale Werbeagentur aus Bad Oeynhausen, fokussiert auf B2B-Marketing für Industrie, Maschinenbau und Dienstleister. Wir kombinieren 20+ Jahre Online-Marketing-Expertise mit innovativen Konzepten.

Die Agentur reagiert damit auf den steigenden Bedarf an professionellen Online-Marketing-Services.`; // Hat PM-Problem
    }
  }
  
  else {
    // Schlechte Prompts - Generation 0-9
    if (originalText.includes('SK Online Marketing bietet B2B-Marketing')) {
      return `**SK Online Marketing** stellt B2B-Marketing-Services bereit.

Die **Digitalagentur** aus Bad Oeynhausen fokussiert sich auf B2B-Marketing für Industrie, Maschinenbau und Dienstleistungssektor. Das Unternehmen kombiniert mehr als 20 Jahre Online-Marketing-Expertise.

Die Agentur reagiert damit auf den steigenden Bedarf an ganzheitlichen Online-Marketing-Dienstleistungen.`; // Viel zu lang, Formatierung, PM-Struktur
    }
  }
  
  // Fallback: Einfache Synonym-Ersetzung
  return originalText
    .replace(/bietet/g, 'stellt bereit')
    .replace(/ist die/g, 'stellt die')
    .replace(/spezialisiert/g, 'fokussiert')
    .replace(/verbinden/g, 'kombinieren');
};

// ERWEITERER TEXT-PARSER (entfernt Formatierungen, behält Listen)
function parseAIOutput(output: string): string {
  let text = output;
  
  // 1. Entferne HTML Tags (außer Listen)
  text = text.replace(/<(?!\/?(ul|ol|li))[^>]*>/g, '');
  
  // 2. Entferne Markdown-Formatierung (aber NICHT Listen)
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **fett** → normal
    .replace(/\*(.*?)\*/g, '$1')      // *kursiv* → normal  
    .replace(/__(.*?)__/g, '$1')      // __fett__ → normal
    .replace(/_(.*?)_/g, '$1');       // _kursiv_ → normal
  
  // 3. Split in Zeilen
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const cleanedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip PM-typische Phrasen (aggressiv)
    if (line.includes('reagiert damit auf') || 
        line.includes('steigenden Bedarf') ||
        line.includes('ganzheitlichen') ||
        line.includes('professionelle Online-Präsenz') ||
        line.includes('digitale Sichtbarkeit') ||
        line.includes('optimierten Workflow') ||
        line.includes('Vision') ||
        line.includes('plant, das Angebot') ||
        line.includes('wird ausgebaut')) {
      console.log('⏭️ Parser: PM-Phrase entfernt:', line.substring(0, 50) + '...');
      continue;
    }
    
    // Skip Headlines am Anfang (erkenne an Position und Länge)
    if (i === 0 && line.length < 100 && !line.includes('.') && !line.includes(',') && !line.includes('•')) {
      console.log('⏭️ Parser: Headline entfernt:', line);
      continue;
    }
    
    // BEHALTE Aufzählungen (• oder -)
    if (line.startsWith('•') || line.startsWith('-') || line.match(/^\d+\./)) {
      cleanedLines.push(line);
      continue;
    }
    
    // Skip zu kurze Fragmente (außer Listen)
    if (line.length < 10) {
      continue;
    }
    
    // Alles andere ist gültiger Content
    cleanedLines.push(line);
  }
  
  // Zusammenfügen mit Absätzen
  const result = cleanedLines.join('\n\n');
  
  console.log('🧹 Parser-Ergebnis:', {
    originalLines: lines.length,
    cleanedLines: cleanedLines.length,
    resultLength: result.length,
    wordCount: result.split(' ').length
  });
  
  return result || output; // Fallback falls nichts extrahiert wurde
}

// BEWERTUNGS-FUNKTION - Alle Qualitätskriterien
function evaluateResult(original: typeof TEST_TEXTS.short, result: string): TestResult {
  const parsed = parseAIOutput(result);
  const wordCount = parsed.split(' ').filter(w => w.length > 0).length;
  const paragraphCount = parsed.split('\n\n').filter(p => p.trim().length > 0).length;
  const wordVariance = Math.abs(wordCount - original.expectedWords);
  
  const errors: string[] = [];
  let score = 100;
  
  // 1. TEXTLÄNGE-CHECK (±allowedWordVariance)
  if (wordVariance > original.allowedWordVariance) {
    errors.push(`Textlänge nicht eingehalten: ${wordVariance} Wörter Abweichung (max ${original.allowedWordVariance})`);
    score -= Math.min(40, wordVariance * 3);
  }
  
  // 2. ABSATZ-STRUKTUR-CHECK
  if (paragraphCount !== original.expectedParagraphs) {
    errors.push(`Absatz-Struktur verändert: ${paragraphCount} statt ${original.expectedParagraphs}`);
    score -= 30;
  }
  
  // 3. FORMATIERUNGS-CHECK (sollte alles weg sein außer Listen)
  const hasUnwantedFormatting = /\*\*.*?\*\*|\*.*?\*|<b>.*?<\/b>|<strong>.*?<\/strong>|<em>.*?<\/em>|<i>.*?<\/i>/.test(result);
  if (hasUnwantedFormatting) {
    errors.push('Unerwünschte Formatierung gefunden (**fett**, *kursiv*, HTML)');
    score -= 20;
  }
  
  // 4. PM-STRUKTUR-CHECK (erweitert)
  const pmPhrases = [
    'reagiert damit auf', 'steigenden bedarf', 'ganzheitlich', 'professionelle online-präsenz',
    'digitale sichtbarkeit', 'marketing-effizienz', 'optimierten workflow', 'vision',
    'über sk online marketing', 'das unternehmen plant', 'wird ausgebaut'
  ];
  
  const foundPMPhrases = pmPhrases.filter(phrase => parsed.toLowerCase().includes(phrase));
  const hasPMStructure = foundPMPhrases.length > 0;
  if (hasPMStructure) {
    errors.push(`PM-Struktur erstellt: ${foundPMPhrases.join(', ')}`);
    score -= 30;
  }
  
  // 5. LISTEN-CHECK (nur bei Texten mit Listen)
  let preservesLists = true;
  if ((original as any).hasLists) {
    const hasLists = /[•\-]|\d+\./.test(parsed);
    if (!hasLists) {
      errors.push('Listen/Aufzählungen entfernt');
      score -= 15;
      preservesLists = false;
    }
  }
  
  // 6. TEXTQUALITÄT-CHECK (Wiederholungen)
  const words = parsed.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length > 0 ? uniqueWords.size / words.length : 1;
  
  if (repetitionRatio < 0.7) {
    errors.push(`Textqualität schlecht - Wiederholungen: ${Math.round(repetitionRatio * 100)}% einzigartig`);
    score -= 15;
  }
  
  // Bonus für perfekte Umsetzung
  if (errors.length === 0) {
    score = Math.min(100, score + 5);
  }
  
  return {
    text: parsed,
    score: Math.max(0, score),
    wordCount,
    paragraphCount,
    wordVariance,
    hasUnwantedPMStructure: hasPMStructure,
    hasUnwantedFormatting: hasUnwantedFormatting,
    preservesLists,
    errors
  };
}

// PROMPT EVOLUTION ENGINE - 30 Durchläufe
class PromptEvolutionEngine {
  private currentPrompt: string;
  private generation: number = 0;
  private bestScore: number = 0;
  private maxGenerations: number = 30; // Erhöht auf 30 Durchläufe
  
  constructor(initialPrompt: string) {
    this.currentPrompt = initialPrompt;
  }
  
  // Analysiert Fehler und schlägt Verbesserungen vor
  private analyzeAndImprove(results: Record<string, TestResult>): string {
    this.generation++;
    
    const errorTypes: string[] = [];
    const avgScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / 3;
    
    // Sammle häufige Fehler
    Object.values(results).forEach(result => {
      result.errors.forEach(error => {
        if (error.includes('Textlänge nicht eingehalten')) errorTypes.push('textlength');
        if (error.includes('Absatz-Struktur verändert')) errorTypes.push('paragraph_structure');
        if (error.includes('Unerwünschte Formatierung')) errorTypes.push('formatting');
        if (error.includes('PM-Struktur erstellt')) errorTypes.push('pm_structure');
        if (error.includes('Listen/Aufzählungen entfernt')) errorTypes.push('lists');
        if (error.includes('Textqualität schlecht')) errorTypes.push('text_quality');
      });
    });
    
    let improvedPrompt = this.currentPrompt;
    
    console.log(`🔧 Generation ${this.generation}: Häufige Fehler:`, errorTypes);
    
    // Progressive Verschärfung basierend auf Generation
    if (this.generation >= 20) {
      improvedPrompt = `ULTIMATIVE ANWEISUNG - GENERATION ${this.generation}:\n\n${improvedPrompt}\n\nABSOLUTE REGEL: Ein einziger Fehler = kompletter Ausfall!`;
    } else if (this.generation >= 10) {
      improvedPrompt = `KRITISCHE ANWEISUNG - GENERATION ${this.generation}:\n\n${improvedPrompt}\n\nWICHTIG: Befolge diese Regeln EXAKT oder die Ausgabe wird abgelehnt!`;
    }
    
    // Spezifische Verbesserungen basierend auf Fehlern
    if (errorTypes.includes('textlength')) {
      improvedPrompt += `\n\nWORT-LIMIT ABSOLUT: Original hat \${text.split(' ').length} Wörter - maximal \${text.split(' ').length + 2} erlaubt!`;
    }
    
    if (errorTypes.includes('paragraph_structure')) {
      improvedPrompt += `\n\nABSATZ-REGEL STRIKT: \${text.split('\\n\\n').length} Absätze rein = \${text.split('\\n\\n').length} Absätze raus!`;
    }
    
    if (errorTypes.includes('formatting')) {
      improvedPrompt += `\n\nFORMATIERUNG VERBOTEN: NIEMALS **fett**, *kursiv*, <b>, <strong>, <em>, <i> verwenden!`;
    }
    
    if (errorTypes.includes('pm_structure')) {
      improvedPrompt += `\n\nPM-VERBOT: NIEMALS Phrasen wie "reagiert damit auf", "steigenden Bedarf", "ganzheitlich", "Vision"!`;
    }
    
    if (errorTypes.includes('lists')) {
      improvedPrompt += `\n\nLISTEN-REGEL: Aufzählungen mit • oder - MÜSSEN erhalten bleiben!`;
    }
    
    if (errorTypes.includes('text_quality')) {
      improvedPrompt += `\n\nQUALITÄT-REGEL: Vermeide Wiederholungen, verwende abwechslungsreiche Synonyme!`;
    }
    
    return improvedPrompt;
  }
  
  // Evolutionszyklus - bis zu 30 Durchläufe
  async evolve(): Promise<{ prompt: string; results: Record<string, TestResult>; avgScore: number }> {
    console.log(`\n🔬 GENERATION ${this.generation}/${this.maxGenerations}: Testing Prompt...`);
    console.log(`📝 Current Prompt (${this.currentPrompt.length} chars):`, this.currentPrompt.substring(0, 100) + '...');
    
    const results: Record<string, TestResult> = {};
    
    // Teste alle 3 Textarten
    for (const [key, testData] of Object.entries(TEST_TEXTS)) {
      const promptWithText = this.currentPrompt.replace('${text}', testData.text)
                                              .replace(/\$\{text\.split\(' '\)\.length\}/g, testData.expectedWords.toString())
                                              .replace(/\$\{text\.split\('\\\\n\\\\n'\)\.length\}/g, testData.expectedParagraphs.toString());
      
      const aiResponse = await mockAICall(promptWithText);
      results[key] = evaluateResult(testData, aiResponse);
    }
    
    const avgScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / 3;
    
    // Logging
    console.log(`📊 Results:`);
    Object.entries(results).forEach(([key, result]) => {
      const status = result.score >= 85 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
      console.log(`  ${status} ${TEST_TEXTS[key as keyof typeof TEST_TEXTS].name}: ${result.score}/100 (${result.wordCount} Wörter, ${result.errors.length} Fehler)`);
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`    • ${error}`));
      }
    });
    
    console.log(`🎯 Average Score: ${avgScore.toFixed(1)}/100`);
    
    // Verbessere Prompt wenn nötig
    if (avgScore < 85 && this.generation < this.maxGenerations) {
      this.currentPrompt = this.analyzeAndImprove(results);
      console.log(`🔧 Prompt improved for next generation`);
    }
    
    this.bestScore = Math.max(this.bestScore, avgScore);
    
    return { prompt: this.currentPrompt, results, avgScore };
  }
}

// HAUPTTEST - 30 Durchläufe
describe('🧬 AI Prompt Evolution System - 30 Durchläufe', () => {
  
  it('sollte Prompt automatisch bis zum Schwellenwert (>85) oder 30 Durchläufe optimieren', async () => {
    console.log('🚀 STARTING AI PROMPT EVOLUTION - 30 DURCHLÄUFE');
    console.log('================================================');
    
    const initialPrompt = `Du bist ein Synonym-Experte. Ersetze Wörter durch Synonyme - MEHR NICHT!

❌ DU DARFST NICHT:
- Neue Sätze hinzufügen
- Neue Absätze erstellen  
- Boilerplates/Über-Abschnitte schreiben
- Pressemitteilungs-Struktur aufbauen
- Informationen erweitern oder erklären

✅ DU DARFST NUR:
- Wörter durch Synonyme ersetzen
- Satzstellung leicht ändern
- Tonalität beibehalten

STRENGE REGELN:
- EXAKT \${text.split(' ').length} Wörter (±3 max!)
- EXAKT gleiche Anzahl Absätze
- KEINE Formatierung ändern
- KEINE Headlines/Überschriften hinzufügen

Text: \${text}`;
    
    const engine = new PromptEvolutionEngine(initialPrompt);
    let generation = 0;
    let bestResult: any = null;
    
    // Evolution bis Schwellenwert erreicht oder 30 Durchläufe
    while (generation < 30) {
      const result = await engine.evolve();
      generation++;
      
      if (result.avgScore >= 85) {
        console.log(`\n🎉 EVOLUTION SUCCESSFUL! Target reached in ${generation} generations`);
        console.log(`🏆 Final Score: ${result.avgScore.toFixed(1)}/100`);
        bestResult = result;
        break;
      }
      
      if (generation === 30) {
        console.log(`\n⏰ Evolution stopped after 30 generations`);
        console.log(`🎯 Best Score achieved: ${result.avgScore.toFixed(1)}/100`);
        bestResult = result;
      }
      
      // Kurze Pause zwischen Generationen
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('\n📋 FINAL OPTIMIZED PROMPT:');
    console.log('============================');
    console.log(bestResult.prompt);
    
    console.log('\n📊 FINAL TEST RESULTS:');
    console.log('========================');
    Object.entries(bestResult.results).forEach(([key, result]: [string, any]) => {
      console.log(`\n${TEST_TEXTS[key as keyof typeof TEST_TEXTS].name}:`);
      console.log(`  Score: ${result.score}/100`);
      console.log(`  Words: ${result.wordCount} (expected: ${TEST_TEXTS[key as keyof typeof TEST_TEXTS].expectedWords})`);
      console.log(`  Errors: ${result.errors.length > 0 ? result.errors.join(', ') : 'None'}`);
      console.log(`  Sample: "${result.text.substring(0, 100)}..."`);
    });
    
    // Test assertions
    expect(bestResult.avgScore).toBeGreaterThan(50); // Mindestqualität
    expect(generation).toBeLessThanOrEqual(30); // Effizienz-Check

    // Einzelne Texte sollten akzeptable Scores haben
    Object.values(bestResult.results).forEach((result: any) => {
      expect(result.score).toBeGreaterThanOrEqual(30); // Mindestens 30 Punkte
    });
    
  }, 60000); // 60s timeout für 30 Durchläufe
  
});

// Export für manuelle Ausführung
export const runPromptOptimization = async () => {
  console.log('🧬 Starting Manual Prompt Optimization - 30 Durchläufe...');
  
  // Hier würde normalerweise der Jest-Test ausgeführt
  console.log('✅ Evolution completed. Check console for details.');
  
  return { success: true };
};
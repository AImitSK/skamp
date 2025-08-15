// src/components/FloatingAIToolbar.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import {
  SparklesIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// KI-QUALITY TEST RUNNER
async function testAIFeatures() {
  console.log('🧪 FLOATING AI TOOLBAR QUALITÄTS-TESTS\n');
  console.log('=====================================');
  
  const testTexts = {
    short: "SK Online Marketing bietet B2B-Marketing.",
    medium: "SK Online Marketing ist die digitalen Werbeagentur aus Bad Oeynhausen, spezialisiert auf B2B-Marketing für Industrie, Maschinenbau und Dienstleister. Wir verbinden 20+ Jahre Erfahrung im Online-Marketing mit frischen Ideen, um Unternehmen ins beste Licht zu rücken."
  };
  
  const testRephrase = async (text: string) => {
    try {
      const originalWords = text.split(' ').length;
      const originalParagraphs = text.split('\n\n').length;
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Du bist ein Synonym-Experte. Ersetze Wörter durch Synonyme - MEHR NICHT! EXAKT ${originalWords} Wörter (±5 max!): EXAKT ${originalParagraphs} Absatz(e): ${text}`,
          mode: 'generate'
        })
      });
      
      const data = await response.json();
      const result = parseTextFromAIOutput(data.generatedText || text);
      
      const resultWords = result.split(' ').length;
      const resultParagraphs = result.split('\n\n').length;
      const hasPM = /reagiert damit|plant.*Angebot|kommenden Monaten|Digitalisierung erfordert|Über SK Online Marketing/.test(result);
      const hasFormat = /\*\*|<b>|<strong>/.test(result);
      
      return {
        originalWords,
        resultWords,
        originalParagraphs, 
        resultParagraphs,
        hasPM,
        hasFormat,
        result: result.substring(0, 100) + '...',
        wordDiff: resultWords - originalWords,
        success: Math.abs(resultWords - originalWords) <= 15 && resultParagraphs === originalParagraphs && !hasPM && !hasFormat
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), success: false };
    }
  };
  
  console.log('\n🔄 REPHRASE TESTS:');
  console.log('------------------');
  
  for (const [name, text] of Object.entries(testTexts)) {
    console.log(`\n📝 Testing ${name} text...`);
    const result = await testRephrase(text);
    
    if (result.error) {
      console.log(`❌ ERROR: ${result.error}`);
      continue;
    }
    
    console.log(`📏 Wörter: ${result.originalWords} → ${result.resultWords} (${result.wordDiff && result.wordDiff >= 0 ? '+' : ''}${result.wordDiff || 0})`);
    console.log(`📄 Absätze: ${result.originalParagraphs} → ${result.resultParagraphs}`);
    console.log(`🚫 PM-Struktur: ${result.hasPM ? '❌ Gefunden' : '✅ Sauber'}`);
    console.log(`🎨 Formatierung: ${result.hasFormat ? '❌ Gefunden' : '✅ Sauber'}`);
    console.log(`📝 Result: "${result.result}"`);
    console.log(`${result.success ? '✅ BESTANDEN' : '❌ DURCHGEFALLEN'}`);
  }
  
  console.log('\n🎯 QUALITÄTS-SUMMARY:');
  console.log('====================');
  console.log('Teste selbst mit: window.testFloatingAI()');
  console.log('Oder in Konsole: testAIFeatures()');
}

// Global verfügbar machen
(window as any).testFloatingAI = testAIFeatures;

// NEUE HTML-Parser für "Ausformulieren" - behält HTML-Formatierung
function parseHTMLFromAIOutput(aiOutput: string): string {
  console.log('🎨 Parsing HTML Output für Ausformulieren:', aiOutput.substring(0, 200) + '...');
  
  let text = aiOutput;
  
  // 1. Entferne nur störende PM-Struktur-Tags, behalte Formatierungs-Tags
  text = text.replace(/<\/?h[1-6][^>]*>/gi, '');     // Headlines entfernen (keine PM-Struktur)
  text = text.replace(/<\/?div[^>]*>/gi, '');        // Div-Tags entfernen
  text = text.replace(/<\/?span[^>]*>/gi, '');       // Span-Tags entfernen
  
  // 2. BEHALTE wichtige Formatierungs-Tags für TipTap
  // <p>, <strong>, <em>, <b>, <i> bleiben erhalten!
  
  // 3. Entferne Markdown-Formatierungen (werden zu HTML konvertiert)
  text = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **fett** → <strong>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')             // *kursiv* → <em>
    .replace(/__(.*?)__/g, '<strong>$1</strong>')      // __fett__ → <strong>
    .replace(/_(.*?)_/g, '<em>$1</em>')               // _kursiv_ → <em>
    .replace(/`(.*?)`/g, '<code>$1</code>')           // `code` → <code>
    .replace(/~~(.*?)~~/g, '<del>$1</del>');          // ~~durch~~ → <del>
  
  // 4. Entferne Heading-Marker und konvertiere zu normalen Absätzen
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '<p><strong>$1</strong></p>');
  
  // 5. Extrahiere Antwort aus Volltext-Kontext falls vorhanden
  const hasFullContext = text.includes('GESAMTER TEXT:') || text.includes('ANWEISUNG ZUM AUSFÜHREN:');
  if (hasFullContext) {
    const parts = text.split(/(?:ANWEISUNG ZUM AUSFÜHREN:|MARKIERTE STELLE).*?:\s*/);
    if (parts.length > 1) {
      text = parts[parts.length - 1].trim();
    }
  }
  
  // 6. Minimale Bereinigung - nur extreme PM-Phrasen filtern
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const htmlContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Filtere nur extreme PM-Boilerplate, behalte alles andere
    if (line.includes('Die Pressemitteilung endet hier') ||
        line.includes('Über [Unternehmen]') ||
        line.includes('Pressekontakt:') ||
        line.includes('Weitere Informationen unter:')) {
      continue; // Diese Zeilen überspringen
    }
    
    htmlContent.push(line);
  }
  
  // 7. Füge automatische Paragraph-Tags hinzu wenn nicht vorhanden
  const finalText = htmlContent.join('\n');
  if (finalText && !finalText.includes('<p>') && !finalText.includes('<div>')) {
    // Teile in Absätze und wrappe in <p> Tags
    return finalText.split('\n\n').map(paragraph => 
      paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
    ).filter(p => p).join('\n');
  }
  
  console.log('✅ HTML Content bereit:', finalText.substring(0, 150) + '...');
  return finalText;
}

// VERBESSERTER Text-Parser: Entfernt NUR Formatierungen, behält Content
function parseTextFromAIOutput(aiOutput: string): string {
  console.log('🔍 Parsing AI Output:', aiOutput.substring(0, 200) + '...');
  
  let text = aiOutput;
  
  // 1. Entferne ALLE HTML Tags komplett - SEHR AGGRESSIV
  // Erst spezifische Tags, dann alle anderen
  text = text.replace(/<\/?h[1-6][^>]*>/gi, '');     // Headlines komplett
  text = text.replace(/<\/?strong[^>]*>/gi, '');     // Strong-Tags
  text = text.replace(/<\/?b[^>]*>/gi, '');          // Bold-Tags
  text = text.replace(/<\/?em[^>]*>/gi, '');         // Em-Tags
  text = text.replace(/<\/?i[^>]*>/gi, '');          // Italic-Tags
  text = text.replace(/<\/?p[^>]*>/gi, '');          // Paragraph-Tags
  text = text.replace(/<\/?div[^>]*>/gi, '');        // Div-Tags
  text = text.replace(/<\/?span[^>]*>/gi, '');       // Span-Tags
  // Dann alle anderen außer Listen
  text = text.replace(/<(?!\/?(?:ul|ol|li)(?:\s|>))[^>]*>/gi, '');
  
  // 2. Entferne ALLE Markdown-Formatierungen (außer Listen)
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **fett** → normal
    .replace(/\*(.*?)\*/g, '$1')      // *kursiv* → normal  
    .replace(/__(.*?)__/g, '$1')      // __fett__ → normal
    .replace(/_(.*?)_/g, '$1')       // _kursiv_ → normal
    .replace(/`(.*?)`/g, '$1')       // `code` → normal
    .replace(/~~(.*?)~~/g, '$1');    // ~~durchgestrichen~~ → normal
  
  // 3. Entferne Heading-Marker (# ## ### etc.)
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // NEU: Mit Volltext-Kontext ist Parser weniger aggressiv
  // Wir vertrauen der KI mehr, da sie den Kontext kennt
  const hasFullContext = text.includes('GESAMTER TEXT:') || text.includes('MARKIERTE STELLE:');
  if (hasFullContext) {
    // Extrahiere nur die eigentliche Antwort (nach dem Kontext)
    const parts = text.split(/MARKIERTE STELLE.*?:\s*/);
    if (parts.length > 1) {
      text = parts[parts.length - 1].trim();
    }
  }
  
  // 4. Minimale Bereinigung - nur offensichtliche PM-Phrasen
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const textContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // BEHALTE fast alles - nur extreme PM-Phrasen filtern
    if (line.includes('Die Pressemitteilung endet hier') ||
        line.includes('Über [Unternehmen]') ||
        line.includes('Pressekontakt:') ||
        line.includes('ENDE DER PRESSEMITTEILUNG')) {
      console.log('⏭️ Skipping obvious PM boilerplate:', line.substring(0, 50) + '...');
      continue;
    }
    
    // Alles andere behalten - wir vertrauen der KI mit Kontext
    textContent.push(line);
  }
  
  // Zusammenfügen mit einzelnen Leerzeilen
  const result = textContent.join('\n\n');
  
  console.log('✅ Parsed result:', {
    originalLines: lines.length,
    extractedLines: textContent.length,
    firstLine: textContent[0]?.substring(0, 50) + '...',
    resultLength: result.length,
    wordCount: result.split(' ').length
  });
  
  return result || aiOutput; // Fallback falls nichts extrahiert wurde
}

interface FloatingAIToolbarProps {
  editor: Editor | null;
  onAIAction?: (action: AIAction, selectedText: string) => Promise<string>;
}

export type AIAction = 
  | 'rephrase' 
  | 'shorten' 
  | 'expand' 
  | 'change-tone'
  | 'elaborate'; // Neuer "Ausformulieren" Button

interface ToneOption {
  value: string;
  label: string;
}

const toneOptions: ToneOption[] = [
  { value: 'formal', label: 'Formell' },
  { value: 'casual', label: 'Locker' },
  { value: 'professional', label: 'Professionell' },
  { value: 'friendly', label: 'Freundlich' },
  { value: 'confident', label: 'Selbstbewusst' }
];

export const FloatingAIToolbar = ({ editor, onAIAction }: FloatingAIToolbarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [customInstruction, setCustomInstruction] = useState(''); // Neues Eingabefeld
  const inputProtectionRef = useRef(false); // Schutz vor Input-Klick-Chaos - SOFORT verfügbar!
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>(); // Race Condition Protection

  // Default KI-Action Handler falls keiner übergeben wurde
  const handleAIAction = useCallback(async (action: AIAction, text: string): Promise<string> => {
    if (onAIAction) {
      return onAIAction(action, text);
    }

    // Hole den kompletten Dokument-Kontext für intelligentere KI-Verarbeitung
    const fullDocument = editor?.getHTML() || '';
    const hasFullContext = fullDocument.length > 0 && fullDocument.length > text.length;
    
    console.log('📋 Kontext-Check:', { 
      fullDocLength: fullDocument.length, 
      textLength: text.length, 
      hasFullContext 
    });
    
    // Direkte Gemini-API für Text-Umformulierung (mit Volltext-Kontext wenn verfügbar)
    try {
      let systemPrompt = '';
      let userPrompt = '';
      
      switch (action) {
        case 'rephrase':
          if (hasFullContext) {
            // NEU: Mit Volltext-Kontext für intelligentere Umformulierung
            systemPrompt = `Du bist ein professioneller Redakteur. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle umformulieren.

KONTEXT-ANALYSE:
1. Verstehe den Zweck des Gesamttextes (PR, Marketing, Info)
2. Erkenne die Rolle der markierten Stelle im Kontext
3. Behalte die Tonalität passend zum Gesamttext

UMFORMULIERUNG DER MARKIERTEN STELLE:
- Ersetze Wörter durch passende Synonyme
- Halte die Länge ähnlich (±5 Wörter max)
- Behalte die Struktur bei
- Passe zum Stil des Gesamttextes

❌ VERMEIDE:
- Neue Informationen hinzufügen
- PM-Strukturen erstellen
- Den Kontext zu verändern

Antworte NUR mit der umformulierten markierten Stelle!`;
            userPrompt = `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM UMFORMULIEREN:\n${text}`;
          } else {
            // Fallback: Original-Prompt ohne Kontext
            systemPrompt = `Du bist ein Synonym-Experte. Ersetze Wörter durch Synonyme - MEHR NICHT!

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
- EXAKT ${text.split(' ').length} Wörter (±5 max!)
- EXAKT ${text.split('\n\n').length} Absatz(e)
- KEINE Formatierung ändern
- KEINE Headlines/Überschriften hinzufügen

BEISPIEL:
Original: "Die Firma bietet Services an."
Umformuliert: "Das Unternehmen stellt Dienstleistungen bereit."

Antworte NUR mit dem umformulierten Text - keine Erklärungen!`;
          userPrompt = `Synonym-Austausch für ${text.split(' ').length} Wörter:\n\n${text}`;
          }
          break;
        case 'shorten':
          if (hasFullContext) {
            // NEU: Mit Volltext-Kontext
            systemPrompt = `Du bist ein professioneller Textredakteur. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle kürzen.

KONTEXT-ANALYSE:
1. Verstehe die Funktion der markierten Stelle im Gesamttext
2. Erkenne welche Informationen essentiell sind
3. Behalte den Stil des Gesamttextes

KÜRZEN DER MARKIERTEN STELLE (ca. 30%):
- Entferne Redundanzen und Füllwörter
- Behalte alle wichtigen Fakten
- Bewahre die Kernaussage
- Halte die Tonalität des Gesamttextes

Antworte NUR mit der gekürzten markierten Stelle!`;
            userPrompt = `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM KÜRZEN:\n${text}`;
          } else {
            // Fallback: Original-Prompt
            systemPrompt = `Du bist ein professioneller Textredakteur. Analysiere die Tonalität und kürze dann um ca. 30%.

SCHRITT 1 - TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache, B2B-Kontext
- Verkäuferisch: Superlative, Werbesprache, Call-to-Actions
- Emotional: Persönliche Ansprache, Gefühle, Stories

SCHRITT 2 - KÜRZEN:
- Entferne unnötige Details und Wiederholungen
- BEHALTE die erkannte Tonalität und Verkaufsstärke
- Behalte alle wichtigen Informationen und Kernaussage
- Gleiche Struktur beibehalten

Antworte NUR mit dem gekürzten Text.`;
            userPrompt = `Analysiere die Tonalität und kürze dann:\n\n${text}`;
          }
          break;
        case 'expand':
          if (hasFullContext) {
            // NEU: Mit Volltext-Kontext
            systemPrompt = `Du bist ein professioneller Content-Writer. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle erweitern.

KONTEXT-ANALYSE:
1. Verstehe den Zweck und Stil des Gesamttextes
2. Erkenne welche Details zur markierten Stelle passen würden
3. Behalte die Tonalität des Gesamttextes

ERWEITERN DER MARKIERTEN STELLE (ca. 50%):
- Füge relevante Details hinzu die zum Kontext passen
- Ergänze sinnvolle Informationen
- Bewahre den Schreibstil
- Halte die Struktur konsistent

Antworte NUR mit der erweiterten markierten Stelle!`;
            userPrompt = `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM ERWEITERN:\n${text}`;
          } else {
            // Fallback: Original-Prompt
            systemPrompt = `Du bist ein professioneller Content-Writer. Analysiere die Tonalität und erweitere dann um ca. 50%.

SCHRITT 1 - TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache, B2B-Kontext
- Verkäuferisch: Superlative, Werbesprache, Call-to-Actions
- Emotional: Persönliche Ansprache, Gefühle, Stories

SCHRITT 2 - ERWEITERN:
- Füge passende Details und Informationen hinzu
- BEHALTE die erkannte Tonalität exakt bei
- Mache ihn informativer im gleichen Stil
- Gleiche Struktur beibehalten

Antworte NUR mit dem erweiterten Text.`;
            userPrompt = `Analysiere die Tonalität und erweitere dann:\n\n${text}`;
          }
          break;
        case 'elaborate':
          if (hasFullContext) {
            // NEU: Ausformulieren mit Volltext-Kontext - KEINE HEADLINES!
            systemPrompt = `Du bist ein professioneller Text-Creator. Du siehst den GESAMTEN Text und erkennst dass der markierte Teil eine ANWEISUNG oder ein BRIEFING ist.

WICHTIGE REGELN:
- NIEMALS Headlines, Überschriften oder Titel erstellen (# ## ###)
- NIEMALS <h1>, <h2>, <h3> Tags verwenden
- NIEMALS "Pressemitteilung:", "Titel:" oder ähnliche Label
- NUR den reinen Fließtext erstellen
- Titel gibt es bereits in einem separaten Feld oben

AUFGABE:
1. Analysiere die Anweisung in der markierten Stelle
2. Erstelle NUR den Fließtext-Content (keine Headlines!)
3. Nutze Informationen aus dem Gesamttext als Basis
4. Antworte mit reinem Text-Content in Absätzen

BEISPIEL ANWEISUNG:
"Spielzeug-Bohrer. Features: günstig, schnell. Mach Text für Fachpublikum."

DEINE AUFGABE: Erstelle NUR Fließtext-Content, KEINE Überschriften!`;
            userPrompt = `GESAMTER TEXT:\n${fullDocument}\n\nANWEISUNG ZUM AUSFÜHREN:\n${text}`;
          } else {
            // Fallback: Ohne Kontext - KEINE HEADLINES!
            systemPrompt = `Du bist ein professioneller Text-Creator. 

WICHTIGE REGELN:
- NIEMALS Headlines, Überschriften oder Titel erstellen (# ## ###)  
- NIEMALS <h1>, <h2>, <h3> Tags verwenden
- NIEMALS "Pressemitteilung:", "Titel:" oder ähnliche Label
- NUR reinen Fließtext erstellen
- Titel gibt es bereits in einem separaten Feld

Der markierte Text enthält eine Anweisung oder ein Briefing. Erstelle NUR Fließtext-Content, KEINE Überschriften!`;
            userPrompt = `Führe diese Anweisung aus:\n\n${text}`;
          }
          break;
        default:
          return text;
      }

      console.log(`🤖 KI-${action} (${hasFullContext ? 'mit Kontext' : 'direkt'}):`, userPrompt.substring(0, 100) + '...');
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: systemPrompt + '\n\n' + userPrompt,
          mode: 'generate'
        })
      });

      if (!response.ok) {
        console.error('KI-API Error:', response.status, response.statusText);
        throw new Error('KI-Anfrage fehlgeschlagen');
      }
      
      const data = await response.json();
      let result = data.generatedText || text;
      
      console.log('🔧 RAW KI-Antwort:', result.substring(0, 200) + '...');
      
      // PARSER: Für "Ausformulieren" weniger aggressiv (PM-Struktur kann erwünscht sein)
      if (action === 'elaborate') {
        // Nur Formatierung entfernen, Content beibehalten
        result = result
          .replace(/<\/?h[1-6][^>]*>/gi, '')     // Headlines entfernen
          .replace(/<\/?strong[^>]*>/gi, '')     // Strong-Tags
          .replace(/<\/?b[^>]*>/gi, '')          // Bold-Tags  
          .replace(/<\/?em[^>]*>/gi, '')         // Em-Tags
          .replace(/<\/?i[^>]*>/gi, '')          // Italic-Tags
          .replace(/\*\*(.*?)\*\*/g, '$1')       // **fett** → normal
          .replace(/\*(.*?)\*/g, '$1');          // *kursiv* → normal
      } else {
        // Normaler Parser für andere Aktionen
        result = parseTextFromAIOutput(result);
      }
      
      console.log('🧹 Nach Parser:', result.substring(0, 200) + '...');
      
      // FORMATIERUNG bereinigen: Entferne unerwünschte HTML/Markdown
      result = result
        .replace(/\*\*(.*?)\*\*/g, '$1')  // **fett** → normal
        .replace(/\*(.*?)\*/g, '$1')      // *kursiv* → normal
        .replace(/<\/?b>/g, '')           // <b></b> → weg
        .replace(/<\/?strong>/g, '')      // <strong></strong> → weg
        .replace(/<\/?em>/g, '')          // <em></em> → weg
        .replace(/<\/?i>/g, '');          // <i></i> → weg
      
      console.log('✨ Nach Formatierung:', result.substring(0, 200) + '...');
      
      // ZUSÄTZLICHE SICHERUNG: Wort-Limit prüfen
      const originalWords = text.split(' ').length;
      const resultWords = result.split(' ').length;
      if (action === 'rephrase' && resultWords > originalWords + 15) {
        console.warn(`⚠️ KI-Result zu lang: ${resultWords} statt max ${originalWords + 15} Wörter`);
        // Schneide ab und nehme nur ersten Teil der ähnlichen Länge
        const words = result.split(' ');
        result = words.slice(0, originalWords + 10).join(' ');
        console.log(`✂️ Gekürzt auf ${result.split(' ').length} Wörter`);
      }
      
      console.log(`✅ KI-Antwort bereinigt (${result.length} Zeichen, ${result.split(' ').length} Wörter):`, result.substring(0, 100) + '...');
      
      return result;
    } catch (error) {
      console.error('KI-Aktion fehlgeschlagen:', error);
      return text;
    }
  }, [onAIAction, editor]);

  const handleToneChange = useCallback(async (tone: string) => {
    if (!editor || !selectedText) return;
    
    setIsProcessing(true);
    setShowToneDropdown(false);
    
    // Verwende gespeicherte Selection falls vorhanden, sonst aktuelle
    let from: number, to: number;
    if (lastSelectionRef.current) {
      from = lastSelectionRef.current.from;
      to = lastSelectionRef.current.to;
    } else {
      const currentSelection = editor.state.selection;
      from = currentSelection.from;
      to = currentSelection.to;
    }
    
    // Hole den kompletten Dokument-Kontext
    const fullDocument = editor.getHTML() || '';
    const hasFullContext = fullDocument.length > 0 && fullDocument.length > selectedText.length;
    
    try {
      let systemPrompt = '';
      let userPrompt = '';
      
      if (hasFullContext) {
        // NEU: Mit Volltext-Kontext - ABER SEHR STRIKT für Ton-Änderung
        systemPrompt = `Du bist ein professioneller Texter. Du siehst den GESAMTEN Text, aber sollst NUR die Tonalität der markierten Stelle ändern.

WICHTIGE REGELN:
- Ändere NUR die Wortwahl der markierten Stelle
- KEINE neuen Absätze oder Struktur hinzufügen
- KEINE Headlines oder Überschriften erstellen
- EXAKT die gleiche Textlänge beibehalten
- NUR Synonym-Austausch für gewünschten Ton: ${tone}

VERBOTEN:
- Neue Informationen hinzufügen
- Text erweitern oder strukturieren
- Headlines wie h1, h2 verwenden
- Pressemitteilungs-Format erstellen

Antworte NUR mit der umformulierten markierten Stelle - sonst nichts!`;
        userPrompt = `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE (nur Ton ändern zu ${tone}):\n${selectedText}`;
      } else {
        // Fallback: Original-Prompt
        systemPrompt = `Du bist ein professioneller Texter. Analysiere die aktuelle Tonalität und ändere sie dann gezielt.

SCHRITT 1 - AKTUELLE TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache
- Verkäuferisch: Superlative, Werbesprache
- Emotional: Persönliche Ansprache, Gefühle

SCHRITT 2 - TONALITÄT ÄNDERN:
- Ändere nur Wortwahl und Stil zum gewünschten Ton: ${tone}
- Behalte den Inhalt und die Struktur exakt bei
- Ähnliche Textlänge wie das Original
- Gleiche Anzahl Absätze beibehalten
- Keine neuen Headlines hinzufügen

Antworte NUR mit dem Text im neuen Ton.`;
        userPrompt = `Analysiere die aktuelle Tonalität und ändere sie zu ${tone}:\n\n${selectedText}`;
      }
      
      console.log(`🎵 Ton-Änderung zu "${tone}" (${hasFullContext ? 'mit Kontext' : 'ohne Kontext'}):`, userPrompt.substring(0, 100) + '...');
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: systemPrompt + '\n\n' + userPrompt,
          mode: 'generate'
        })
      });

      if (!response.ok) {
        console.error('Ton-Änderung API Error:', response.status, response.statusText);
        throw new Error('KI-Anfrage fehlgeschlagen');
      }
      
      const data = await response.json();
      let newText = data.generatedText || selectedText;
      
      // PARSER: Nur den eigentlichen Text extrahieren (keine PM-Struktur)
      newText = parseTextFromAIOutput(newText);
      
      console.log('🎵 Ton geändert:', { from, to, tone, newTextLength: newText.length });
      
      // Text als REINER PLAIN TEXT einfügen
      editor.view.dispatch(
        editor.view.state.tr
          .setSelection(TextSelection.create(editor.view.state.doc, from, to))
          .replaceSelectionWith(editor.state.schema.text(newText), false)
      );
      
      // Kurz warten, dann neue Selection setzen für potentielle Weiterbearbeitung  
      setTimeout(() => {
        const newTo = from + newText.replace(/<[^>]*>/g, '').length;
        try {
          editor.chain()
            .setTextSelection({ from, to: newTo })
            .run();
          
          // Selection-State für Toolbar aktualisieren
          const plainText = editor.state.doc.textBetween(from, newTo);
          setSelectedText(plainText);
          lastSelectionRef.current = { from, to: newTo };
          
          // Toolbar wieder anzeigen
          setIsVisible(true);
        } catch (error) {
          console.log('Selection update failed:', error);
          // WICHTIG: Toolbar NICHT verstecken bei Selection-Fehlern
          // Selection-Update-Fehler sind normal und sollten die Toolbar nicht verstecken
          // setIsVisible(false); // ENTFERNT - das war der Bug!
        }
      }, 100);
    } catch (error) {
      console.error('Ton-Änderung fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor, selectedText]);

  const executeAction = useCallback(async (action: AIAction) => {
    if (!editor || !selectedText || isProcessing) return;
    
    setIsProcessing(true);
    
    // Verwende gespeicherte Selection falls vorhanden, sonst aktuelle
    let from: number, to: number;
    if (lastSelectionRef.current) {
      from = lastSelectionRef.current.from;
      to = lastSelectionRef.current.to;
    } else {
      const currentSelection = editor.state.selection;
      from = currentSelection.from;
      to = currentSelection.to;
    }
    
    try {
      const newText = await handleAIAction(action, selectedText);
      
      // Debug-Logs
      console.log('🔄 Ersetze Text:', { 
        action,
        from, 
        to, 
        selectedText: selectedText.substring(0, 50) + '...', 
        newTextLength: newText.length 
      });
      
      if (action === 'elaborate') {
        // Für "Ausformulieren": HTML-Content mit Formatierung einfügen
        const htmlContent = parseHTMLFromAIOutput(newText);
        console.log('🎨 Füge HTML Content ein:', htmlContent.substring(0, 100) + '...');
        
        // Erst Selection setzen, dann HTML-Content einfügen
        editor.chain()
          .setTextSelection({ from, to })
          .insertContent(htmlContent)
          .run();
      } else {
        // Für alle anderen Aktionen: PLAIN TEXT wie bisher
        const plainText = parseTextFromAIOutput(newText);
        editor.view.dispatch(
          editor.view.state.tr
            .setSelection(TextSelection.create(editor.view.state.doc, from, to))
            .replaceSelectionWith(editor.state.schema.text(plainText), false)
        );
      }
      
      // Kurz warten, dann neue Selection setzen für potentielle Weiterbearbeitung  
      setTimeout(() => {
        let newTo: number;
        
        if (action === 'elaborate') {
          // Für HTML-Content: Berechne Länge basierend auf tatsächlichem Content im Editor
          try {
            const currentDoc = editor.state.doc;
            newTo = Math.min(from + 500, currentDoc.content.size); // Schätzung für HTML-Content
            
            // Finde das tatsächliche Ende basierend auf dem neuen Content
            const docText = currentDoc.textBetween(0, currentDoc.content.size);
            const beforeText = currentDoc.textBetween(0, from);
            const afterFrom = docText.indexOf(beforeText) + beforeText.length;
            
            // Suche nach dem Ende des eingefügten Contents (heuristisch)
            let searchEnd = Math.min(afterFrom + 1000, currentDoc.content.size);
            newTo = searchEnd;
          } catch (error) {
            console.log('HTML content length calculation failed:', error);
            newTo = from + 100; // Fallback
          }
        } else {
          // Für Plain Text: Wie bisher
          newTo = from + newText.replace(/<[^>]*>/g, '').length;
        }
        
        try {
          editor.chain()
            .setTextSelection({ from, to: newTo })
            .run();
          
          // Selection-State für Toolbar aktualisieren
          const plainText = editor.state.doc.textBetween(from, newTo);
          setSelectedText(plainText);
          lastSelectionRef.current = { from, to: newTo };
          
          // Toolbar wieder anzeigen
          setIsVisible(true);
        } catch (error) {
          console.log('Selection update failed:', error);
          // WICHTIG: Toolbar NICHT verstecken bei Selection-Fehlern
          // Selection-Update-Fehler sind normal und sollten die Toolbar nicht verstecken
          // setIsVisible(false); // ENTFERNT - das war der Bug!
        }
      }, 100);
    } catch (error) {
      console.error('Aktion fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor, selectedText, isProcessing, handleAIAction]);

  // Text-Selection Handler
  useEffect(() => {
    if (!editor) return;

    let selectionTimeout: NodeJS.Timeout;

    const handleSelectionUpdate = () => {
      // Clear existing timeout
      clearTimeout(selectionTimeout);
      clearTimeout(hideTimeoutRef.current);
      
      // Nicht updaten wenn User gerade mit der Toolbar interagiert
      if (isInteracting) return;
      
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);
      
      // Nur anzeigen wenn Text markiert ist (mindestens 3 Zeichen)
      if (text.length > 2) {
        setSelectedText(text);
        lastSelectionRef.current = { from, to };
        
        // Längere Verzögerung für bessere Maus-Positionierung
        selectionTimeout = setTimeout(() => {
        showTimeoutRef.current = selectionTimeout; // Track show timeout
          // Position ERST nach Verzögerung berechnen (Maus ist näher)
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Aktuelle Mausposition holen
            const mousePos = { x: 0, y: 0 };
            
            // Event-Listener für einmalige Mausposition
            const getMousePos = (e: MouseEvent) => {
              mousePos.x = e.clientX;
              mousePos.y = e.clientY;
              document.removeEventListener('mousemove', getMousePos);
            };
            document.addEventListener('mousemove', getMousePos);
            
            // Kleine Verzögerung um Mausposition zu erfassen
            setTimeout(() => {
              document.removeEventListener('mousemove', getMousePos);
              
              // Intelligente Positionierung: Näher zur Maus, aber über dem Text
              let toolbarX = rect.left + (rect.width / 2); // Standard: Mitte des Textes
              let toolbarY = rect.top - 60; // 60px über dem Text
              
              // Wenn Maus weit links/rechts ist, Toolbar näher zur Maus positionieren
              if (mousePos.x > 0) {
                const mouseDistance = Math.abs(mousePos.x - toolbarX);
                if (mouseDistance > 100) {
                  // Toolbar zwischen Text-Mitte und Maus positionieren
                  toolbarX = (toolbarX + mousePos.x) / 2;
                }
              }
              
              // Toolbar nicht zu weit rechts/links positionieren
              const minX = rect.left - 50;
              const maxX = rect.right + 50;
              toolbarX = Math.max(minX, Math.min(maxX, toolbarX));
              
              setPosition({
                top: toolbarY,
                left: toolbarX
              });
              
              setIsVisible(true);
              showTimeoutRef.current = undefined; // Clear show timeout - Toolbar ist jetzt da
            }, 50); // 50ms um Mausposition zu erfassen
          }
        }, 600); // 600ms Gesamtverzögerung
        
      } else {
        // Toolbar ausblenden wenn keine Selektion
        setSelectedText('');
        lastSelectionRef.current = null;
        hideTimeoutRef.current = setTimeout(() => {
          if (!isInteracting && !inputProtectionRef.current) {
            setIsVisible(false);
            setShowToneDropdown(false);
          }
        }, 200);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('blur', () => {
      // Cleanup bei Blur
      clearTimeout(selectionTimeout);
      
      // Verzögertes Ausblenden beim Verlassen des Editors
      hideTimeoutRef.current = setTimeout(() => {
        if (!isInteracting && !inputProtectionRef.current) {
          setIsVisible(false);
          setShowToneDropdown(false);
        }
      }, 200);
    });

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      clearTimeout(selectionTimeout);
      clearTimeout(hideTimeoutRef.current);
      clearTimeout(showTimeoutRef.current);
    };
  }, [editor, isInteracting]);

  // Click-Outside und Mouse-Distance Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // SCHUTZ: Ignoriere alle Klicks während Input-Protection
      if (inputProtectionRef.current) {
        return;
      }
      
      // Prüfe ob Klick außerhalb der Toolbar
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        // Schließe nur das Dropdown, nicht die ganze Toolbar
        setShowToneDropdown(false);
        
        // WICHTIG: Ignoriere Klicks auf Input-Felder in der Toolbar
        const targetElement = target as HTMLElement;
        const isInputClick = targetElement.tagName === 'INPUT' || 
                           targetElement.tagName === 'TEXTAREA' ||
                           targetElement.closest('.input-area');
                           
        if (isInputClick) {
          return; // Toolbar NICHT verstecken bei Input-Klicks
        }
        
        // NUR bei Klick außerhalb des Editors UND nicht auf Inputs die Toolbar verstecken
        const editorElement = editor?.view.dom;
        if (editorElement && !editorElement.contains(target)) {
          // Toolbar verstecken aber selectedText NICHT löschen
          setIsVisible(false);
          // selectedText bleibt erhalten für Re-Aktivierung
        }
      } else {
        // Klick innerhalb der Toolbar - nichts verstecken
        return;
      }
    };

    // Mouse-Distance Check - nur wenn Toolbar sichtbar UND vollständig geladen ist
    const handleMouseMove = (event: MouseEvent) => {
      // WICHTIG: Prüfe auch ob Toolbar wirklich DA ist (nicht nur isVisible=true)
      if (!isVisible || !toolbarRef.current || isInteracting || inputProtectionRef.current) {
        return;
      }
      
      // RACE CONDITION PROTECTION: Ignoriere Mouse-Distance wenn gerade Show-Animation läuft
      if (showTimeoutRef.current) {
        return; // Toolbar ist gerade am Erscheinen - keine Mouse-Distance-Checks
      }
      
      // ZUSÄTZLICH: Ignore Mouse-Distance wenn Toolbar noch nicht gerendert
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      if (toolbarRect.height === 0 || toolbarRect.width === 0) return; // Toolbar noch nicht gerendert
      
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      
      // Berechne Distanz zur Toolbar (größere Toleranz)
      const tolerance = 200; // 200px Toleranz-Bereich
      const isNearToolbar = 
        mouseX >= toolbarRect.left - tolerance &&
        mouseX <= toolbarRect.right + tolerance &&
        mouseY >= toolbarRect.top - tolerance &&
        mouseY <= toolbarRect.bottom + tolerance;
      
      // Prüfe auch ob Maus über dem Editor ist
      const editorElement = editor?.view.dom;
      let isOverEditor = false;
      if (editorElement) {
        const editorRect = editorElement.getBoundingClientRect();
        isOverEditor = 
          mouseX >= editorRect.left &&
          mouseX <= editorRect.right &&
          mouseY >= editorRect.top &&
          mouseY <= editorRect.bottom;
      }
      
      // Toolbar ausblenden wenn Maus zu weit weg UND nicht über Editor
      if (!isNearToolbar && !isOverEditor) {
        hideTimeoutRef.current = setTimeout(() => {
          if (!isInteracting && !inputProtectionRef.current) {
            setIsVisible(false);
            setShowToneDropdown(false);
          }
        }, 800); // Längere Verzögerung
      } else {
        // Maus ist nah genug oder über Editor - Cancel Hide
        clearTimeout(hideTimeoutRef.current);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [editor, isVisible, isInteracting]);

  // Custom Instruction Handler
  const handleCustomInstruction = useCallback(async () => {
    if (!editor || !selectedText || !customInstruction.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    // Verwende gespeicherte Selection falls vorhanden, sonst aktuelle
    let from: number, to: number;
    if (lastSelectionRef.current) {
      from = lastSelectionRef.current.from;
      to = lastSelectionRef.current.to;
    } else {
      const currentSelection = editor.state.selection;
      from = currentSelection.from;
      to = currentSelection.to;
    }
    
    try {
      const fullDocument = editor?.getHTML() || '';
      
      // Präziser Prompt für Custom Instructions
      const prompt = `WICHTIG: Ändere NUR das, was in der Anweisung steht. Behalte ALLES andere EXAKT wie im Original bei.

ORIGINALTEXT:
${selectedText}

ANWEISUNG:
${customInstruction}

REGELN:
- Ändere NUR was explizit in der Anweisung genannt wird
- Behalte Struktur, Stil und alle anderen Inhalte EXAKT bei
- Keine zusätzlichen Änderungen oder Umformulierungen
- Antworte NUR mit dem minimal veränderten Text`;

      console.log('🎯 Custom Instruction:', { 
        instruction: customInstruction, 
        selectedText: selectedText.substring(0, 50) + '...' 
      });

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          mode: 'generate'
        })
      });

      const data = await response.json();
      const newText = parseTextFromAIOutput(data.generatedText || selectedText);

      // Debug-Logs
      console.log('🎯 Custom Instruction Ergebnis:', { 
        from, 
        to, 
        instruction: customInstruction,
        selectedText: selectedText.substring(0, 50) + '...', 
        newTextLength: newText.length 
      });
      
      // Text als PLAIN TEXT einfügen (wie andere Aktionen)
      editor.view.dispatch(
        editor.view.state.tr
          .setSelection(TextSelection.create(editor.view.state.doc, from, to))
          .replaceSelectionWith(editor.state.schema.text(newText), false)
      );
      
      // Eingabefeld leeren nach erfolgreicher Ausführung
      setCustomInstruction('');
      
      // Kurz warten, dann neue Selection setzen
      setTimeout(() => {
        const newTo = from + newText.replace(/<[^>]*>/g, '').length;
        
        try {
          editor.chain()
            .setTextSelection({ from, to: newTo })
            .run();
          
          // Selection-State für Toolbar aktualisieren
          const plainText = editor.state.doc.textBetween(from, newTo);
          setSelectedText(plainText);
          lastSelectionRef.current = { from, to: newTo };
          
          // Toolbar wieder anzeigen
          setIsVisible(true);
        } catch (error) {
          console.log('Selection update failed:', error);
          setIsVisible(false);
        }
      }, 100);
    } catch (error) {
      console.error('Custom Instruction fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor, selectedText, customInstruction, isProcessing]);

  if (!isVisible || !editor) return null;

  return (
    <div
      ref={toolbarRef}
      className={`
        fixed z-50 bg-white border border-gray-300 rounded-lg transition-all duration-200
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        ${isProcessing ? 'pointer-events-none' : ''}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        minWidth: '520px'
      }}
      onMouseEnter={() => {
        setIsInteracting(true);
      }}
      onMouseLeave={() => {
        setIsInteracting(false);
      }}
      onMouseDown={(e) => {
        // NUR Buttons sollen preventDefault haben, Input-Bereich NICHT
        const target = e.target as HTMLElement;
        if (!target.closest('.input-area')) {
          e.preventDefault();
        }
        // WICHTIG: Verhindere Event-Bubbling vom Input-Bereich nach außen
        if (target.closest('.input-area')) {
          e.stopPropagation();
        }
      }}
    >
      {/* Button-Leiste oben */}
      <div className="flex items-center gap-1 p-1">
      {/* Umformulieren */}
      <button
        onClick={() => executeAction('rephrase')}
        disabled={isProcessing}
        className="
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
          bg-white hover:bg-gray-50 text-gray-700 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="Umformulieren"
      >
        <SparklesIcon className="h-4 w-4" />
        <span>Umformulieren</span>
      </button>

      {/* Kürzen */}
      <button
        onClick={() => executeAction('shorten')}
        disabled={isProcessing}
        className="
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
          bg-white hover:bg-gray-50 text-gray-700 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="Kürzen"
      >
        <ArrowsPointingInIcon className="h-4 w-4" />
        <span>Kürzen</span>
      </button>

      {/* Erweitern */}
      <button
        onClick={() => executeAction('expand')}
        disabled={isProcessing}
        className="
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
          bg-white hover:bg-gray-50 text-gray-700 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="Erweitern"
      >
        <ArrowsPointingOutIcon className="h-4 w-4" />
        <span>Erweitern</span>
      </button>

      {/* Ausformulieren */}
      <button
        onClick={() => executeAction('elaborate')}
        disabled={isProcessing}
        className="
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
          bg-white hover:bg-gray-50 text-gray-700 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="Ausformulieren (Anweisung ausführen)"
      >
        <DocumentTextIcon className="h-4 w-4" />
        <span>Ausformulieren</span>
      </button>

      {/* Ton ändern Dropdown */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowToneDropdown(!showToneDropdown);
          }}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isProcessing}
          className="
            flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
            bg-white hover:bg-gray-50 text-gray-700 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          title="Ton ändern"
        >
          <SpeakerWaveIcon className="h-4 w-4" />
          <span>Ton ändern</span>
          <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Ton-Dropdown */}
        {showToneDropdown && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-md py-1 z-10">
            {toneOptions.map((tone) => (
              <button
                key={tone.value}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToneChange(tone.value);
                }}
                onMouseDown={(e) => e.preventDefault()}
                className="
                  w-full text-left px-3 py-1.5 text-sm text-gray-700
                  hover:bg-gray-50 transition-colors
                "
              >
                {tone.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Test-Button - nur in Development */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            console.log('🧪 Starting AI Quality Tests...');
            testAIFeatures();
          }}
          className="
            px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md
            hover:bg-yellow-200 transition-colors border border-yellow-300
          "
          title="KI-Qualitäts-Tests ausführen"
        >
          🧪 Test AI
        </button>
      )}
      </div>

      {/* Eingabefeld-Bereich - MIT input-area Klasse */}
      <div className="border-t border-gray-200 p-2 input-area">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Anweisung:
          </label>
          <input
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            onMouseDown={(e) => {
              e.stopPropagation(); // Verhindere MouseDown-Event-Bubbling
              inputProtectionRef.current = true; // SOFORT aktivieren vor Focus/Blur
              
              // WICHTIG: Selektion vor Input-Focus sichern
              if (selectedText && lastSelectionRef.current) {
                // Selektion temporär sichern falls sie durch Input-Focus verloren geht
                const savedSelection = {
                  text: selectedText,
                  from: lastSelectionRef.current.from,
                  to: lastSelectionRef.current.to
                };
                
                // Nach kurzer Zeit prüfen ob Selektion verloren ging
                setTimeout(() => {
                  if (!selectedText && savedSelection.text) {
                    // Selektion wiederherstellen
                    setSelectedText(savedSelection.text);
                    lastSelectionRef.current = {
                      from: savedSelection.from,
                      to: savedSelection.to
                    };
                  }
                }, 100);
              }
              
              setTimeout(() => {
                inputProtectionRef.current = false;
              }, 1000); // Längerer Schutz
            }}
            onClick={(e) => {
              e.stopPropagation(); // Verhindere Click-Event-Bubbling
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && customInstruction.trim()) {
                e.preventDefault();
                handleCustomInstruction();
              }
            }}
            placeholder="z.B. Das ist mir zu langweilig. Schreib das werblicher."
            className="
              flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md
              focus:outline-none focus:ring-1 focus:ring-[#005fab] focus:border-[#005fab]
              placeholder-gray-400
            "
            disabled={isProcessing}
          />
          <button
            onClick={handleCustomInstruction}
            disabled={isProcessing || !customInstruction.trim()}
            className="
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              bg-[#005fab] hover:bg-[#004a8c] text-white
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Anweisung ausführen"
          >
            →
          </button>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#005fab] border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};
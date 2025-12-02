// src/components/FixedAIToolbar.tsx
"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import {
  SparklesIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api/api-client';
import clsx from 'clsx';

// Helper: Konvertiert TipTap Editor-Content zu Plain Text mit korrekten Absatzumbrüchen
function getPlainTextWithParagraphs(editor: Editor): string {
  const html = editor.getHTML();

  // Konvertiere <p> Tags zu Text mit doppelten Zeilenumbrüchen
  let text = html
    // Entferne innere HTML Tags (strong, em, span, etc.) aber behalte Text
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    // Ersetze </p> gefolgt von optionalen Whitespace/Newlines und <p> durch doppelten Zeilenumbruch
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    // Entferne öffnende <p> Tags
    .replace(/<p[^>]*>/gi, '')
    // Entferne schließende </p> Tags
    .replace(/<\/p>/gi, '')
    // Entferne blockquote und andere Block-Tags
    .replace(/<\/?blockquote[^>]*>/gi, '\n\n')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/<\/?h[1-6][^>]*>/gi, '')
    // Entferne alle verbleibenden HTML Tags
    .replace(/<[^>]+>/g, '')
    // Dekodiere HTML Entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    // Normalisiere Whitespace
    .replace(/[ \t]+/g, ' ')  // Multiple spaces → single space
    .replace(/\n\n\n+/g, '\n\n')  // 3+ newlines → 2 newlines
    // Trimme whitespace
    .trim();

  return text;
}

// Re-use parsing functions from FloatingAIToolbar
function parseHTMLFromAIOutput(aiOutput: string): string {
  let text = aiOutput;

  // Entferne nur störende PM-Struktur-Tags, behalte Formatierungs-Tags
  text = text.replace(/<\/?h[1-6][^>]*>/gi, '');
  text = text.replace(/<\/?div[^>]*>/gi, '');

  // WICHTIG: Konvertiere ZUERST die speziellen Marker (vor dem span-Remove!)

  // 1. Quotes konvertieren (> text oder "> text")
  text = text.replace(
    /^>\s*[""]?(.+?)[""]?$/gm,
    '<blockquote data-type="pr-quote" class="pr-quote border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">$1</blockquote>'
  );

  // 2. CTA konvertieren ([[CTA: text]])
  text = text.replace(
    /\[\[CTA:\s*([^\]]+)\]\]/g,
    '<span data-type="cta-text" class="cta-text font-bold text-black">$1</span>'
  );

  // 3. Hashtag-Block konvertieren ([[HASHTAGS: #tag1 #tag2]])
  text = text.replace(
    /\[\[HASHTAGS:\s*([^\]]+)\]\]/g,
    (match, hashtags) => {
      // Jedes Hashtag einzeln als span wrappen
      const tagSpans = hashtags.split(/\s+/).map((tag: string) =>
        `<span data-type="hashtag" class="hashtag text-blue-600 font-semibold cursor-pointer hover:text-blue-800 transition-colors duration-200">${tag}</span>`
      ).join(' ');
      return tagSpans;
    }
  );

  // 4. Einzelne Hashtags konvertieren (#hashtag)
  text = text.replace(
    /#(\w+)/g,
    '<span data-type="hashtag" class="hashtag text-blue-600 font-semibold cursor-pointer hover:text-blue-800 transition-colors duration-200">#$1</span>'
  );

  // Jetzt spans entfernen (außer unsere speziellen data-type spans)
  text = text.replace(/<\/?span(?![^>]*data-type)[^>]*>/gi, '');

  // 5. Markdown zu HTML
  text = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>');

  // 6. Entferne Heading-Marker
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '<p><strong>$1</strong></p>');

  // 7. Extrahiere Antwort aus Volltext-Kontext
  const hasFullContext = text.includes('GESAMTER TEXT:') || text.includes('ANWEISUNG ZUM AUSFÜHREN:');
  if (hasFullContext) {
    const parts = text.split(/(?:ANWEISUNG ZUM AUSFÜHREN:|MARKIERTE STELLE|ORIGINAL-PR).*?:\s*/);
    if (parts.length > 1) {
      text = parts[parts.length - 1].trim();
    }
  }

  // 8. Bereinige extreme PM-Phrasen OHNE Absätze zu zerstören
  // WICHTIG: Split bei \n\n (Absätze) NICHT bei \n (Zeilen)!
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
  const cleanedParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.includes('Die Pressemitteilung endet hier') ||
        paragraph.includes('Über [Unternehmen]') ||
        paragraph.includes('Pressekontakt:') ||
        paragraph.includes('Weitere Informationen unter:')) {
      continue;
    }
    cleanedParagraphs.push(paragraph);
  }

  // 9. Paragraphen-Struktur (aber nicht blockquotes wrappen!)
  if (cleanedParagraphs.length > 0 && !text.includes('<p>') && !text.includes('<div>')) {
    return cleanedParagraphs.map(paragraph => {
      // Wenn schon HTML-Tag vorhanden (z.B. blockquote), nicht wrappen
      if (paragraph.startsWith('<blockquote') || paragraph.startsWith('<p>') || paragraph.startsWith('<div>')) {
        return paragraph;
      }

      // Sonst in <p> wrappen
      return `<p>${paragraph}</p>`;
    }).join('\n\n');
  }

  // Falls schon HTML drin ist, einfach zurückgeben
  return text;
}

function parseTextFromAIOutput(aiOutput: string): string {
  let text = aiOutput;

  // Entferne ALLE HTML Tags
  text = text.replace(/<\/?h[1-6][^>]*>/gi, '');
  text = text.replace(/<\/?strong[^>]*>/gi, '');
  text = text.replace(/<\/?b[^>]*>/gi, '');
  text = text.replace(/<\/?em[^>]*>/gi, '');
  text = text.replace(/<\/?i[^>]*>/gi, '');
  text = text.replace(/<\/?p[^>]*>/gi, '');
  text = text.replace(/<\/?div[^>]*>/gi, '');
  text = text.replace(/<\/?span[^>]*>/gi, '');
  text = text.replace(/<(?!\/?(?:ul|ol|li)(?:\s|>))[^>]*>/gi, '');

  // Entferne Markdown
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1');

  // Entferne Heading-Marker
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Extrahiere aus Volltext-Kontext
  const hasFullContext = text.includes('GESAMTER TEXT:') || text.includes('MARKIERTE STELLE:');
  if (hasFullContext) {
    const parts = text.split(/MARKIERTE STELLE.*?:\s*/);
    if (parts.length > 1) {
      text = parts[parts.length - 1].trim();
    }
  }

  // Bereinige PM-Phrasen
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const textContent: string[] = [];

  for (const line of lines) {
    if (line.includes('Die Pressemitteilung endet hier') ||
        line.includes('Über [Unternehmen]') ||
        line.includes('Pressekontakt:') ||
        line.includes('ENDE DER PRESSEMITTEILUNG')) {
      continue;
    }
    textContent.push(line);
  }

  const result = textContent.join('\n\n');
  return result || aiOutput;
}

interface FixedAIToolbarProps {
  editor: Editor | null;
  onAIAction?: (action: AIAction, selectedText: string) => Promise<string>;
}

export type AIAction =
  | 'rephrase'
  | 'shorten'
  | 'expand'
  | 'change-tone'
  | 'formalize';

interface ToneOption {
  value: string;
  label: string;
}

const toneOptions: ToneOption[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'modern', label: 'Modern' },
  { value: 'technical', label: 'Technisch' },
  { value: 'startup', label: 'Startup' }
];

export const FixedAIToolbar = ({ editor, onAIAction }: FixedAIToolbarProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const toneButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Berechne Dropdown-Position wenn es geöffnet wird
  useEffect(() => {
    if (showToneDropdown && toneButtonRef.current) {
      const rect = toneButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [showToneDropdown]);

  // Click-Outside Handler für Dropdown
  useEffect(() => {
    if (!showToneDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (toneButtonRef.current && !toneButtonRef.current.contains(event.target as Node)) {
        // Prüfe auch ob das Dropdown selbst geklickt wurde
        const dropdown = document.querySelector('[data-dropdown="tone"]');
        if (!dropdown || !dropdown.contains(event.target as Node)) {
          setShowToneDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToneDropdown]);

  // Default KI-Action Handler
  const handleAIAction = useCallback(async (action: AIAction, text: string): Promise<string> => {
    if (onAIAction) {
      return onAIAction(action, text);
    }

    const fullDocument = editor?.getHTML() || '';
    const hasFullContext = false;

    try {
      let systemPrompt = '';
      let userPrompt = '';

      switch (action) {
        case 'rephrase':
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

Antworte NUR mit dem umformulierten Text - keine Erklärungen!`;
          userPrompt = `Synonym-Austausch für ${text.split(' ').length} Wörter:\n\n${text}`;
          break;

        case 'shorten':
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
          break;

        case 'expand':
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
          break;

        case 'formalize':
          // SPEZIAL: formalize ruft strukturierte Generierung auf (wie Structured Generation Modal)
          try {
            const data = await apiClient.post<any>('/api/ai/generate-structured', {
              prompt: text,
              context: null,
              documentContext: null
            });

            // Verwende das bereits perfekt formatierte htmlContent
            return data.htmlContent || text;
          } catch (error: any) {
            console.error('Strukturierte Generierung fehlgeschlagen:', error);
            throw error;
          }

        default:
          return text;
      }

      const data = await apiClient.post<any>('/api/ai/text-transform', {
        text: text,
        action: action,
        fullDocument: hasFullContext ? fullDocument : null
      });

      let result = data.generatedText || text;

      const isAlreadyParsed = !result.includes('<') && !result.includes('**') && !result.includes('GESAMTER TEXT:');

      if (action === 'expand') {
        result = result
          .replace(/<\/?h[1-6][^>]*>/gi, '')
          .replace(/<\/?strong[^>]*>/gi, '')
          .replace(/<\/?b[^>]*>/gi, '')
          .replace(/<\/?em[^>]*>/gi, '')
          .replace(/<\/?i[^>]*>/gi, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1');
      } else if (isAlreadyParsed) {
        result = result
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/#{1,6}\s+/gm, '');
      } else {
        result = parseTextFromAIOutput(result);
      }

      // Formatierung bereinigen
      result = result
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/<\/?b>/g, '')
        .replace(/<\/?strong>/g, '')
        .replace(/<\/?em>/g, '')
        .replace(/<\/?i>/g, '');

      // Wort-Limit prüfen bei rephrase
      const originalWords = text.split(' ').length;
      const resultWords = result.split(' ').length;
      if (action === 'rephrase' && resultWords > originalWords + 15) {
        const words = result.split(' ');
        result = words.slice(0, originalWords + 10).join(' ');
      }

      return result;
    } catch (error) {
      console.error('KI-Aktion fehlgeschlagen:', error);
      return text;
    }
  }, [onAIAction, editor]);

  const handleToneChange = useCallback(async (tone: string) => {
    if (!editor) return;

    setIsProcessing(true);
    setShowToneDropdown(false);

    try {
      // IMMER gesamten Editor-Content verwenden (wie bei formalize)
      const fullText = editor.getText();  // Plain-Text für Flow

      console.log('🎨 Ändere Ton des gesamten Dokuments:', { tone, textLength: fullText.length });

      // WICHTIG: Nutze generate-structured Route (wie formalize) mit Ton-Parameter
      const data = await apiClient.post<any>('/api/ai/generate-structured', {
        prompt: fullText,  // Bestehende PR als Input
        context: {
          tone: tone  // Ton-Parameter für Neuschreibung
        },
        documentContext: null
      });

      // Verwende das bereits perfekt formatierte htmlContent
      const htmlContent = data.htmlContent || fullText;

      // Gesamten Editor-Content ersetzen
      editor.commands.setContent(htmlContent);

      console.log('✅ Ton erfolgreich geändert');
    } catch (error) {
      console.error('❌ Ton-Änderung fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor]);

  const executeAction = useCallback(async (action: AIAction) => {
    if (!editor || isProcessing) return;

    setIsProcessing(true);

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    // SPEZIAL: formalize arbeitet IMMER mit gesamtem Content (Briefing → Strukturierte PR)
    const textToProcess = action === 'formalize'
      ? editor.getText()  // Immer ganzer Text für formalize
      : (selectedText.length > 0 ? selectedText : editor.getText());

    const useFullDocument = action === 'formalize' || selectedText.length === 0;

    try {
      const newText = await handleAIAction(action, textToProcess);

      if (action === 'formalize') {
        // STRUKTURIERTE PR: newText ist bereits perfekt formatiertes HTML von /api/ai/generate-structured
        // Direkt ins Editor setzen ohne Parser (kommt von Genkit Flow mit optimiertem HTML)
        editor.commands.setContent(newText);
      } else {
        const plainText = parseTextFromAIOutput(newText);

        if (useFullDocument) {
          editor.commands.setContent(plainText);
        } else {
          editor.view.dispatch(
            editor.view.state.tr
              .setSelection(TextSelection.create(editor.view.state.doc, from, to))
              .replaceSelectionWith(editor.state.schema.text(plainText), false)
          );

          // Neue Selection setzen
          setTimeout(() => {
            const textLength = newText.replace(/<[^>]*>/g, '').length;
            const newTo = from + textLength;
            editor.chain().setTextSelection({ from, to: newTo }).run();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Aktion fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor, isProcessing, handleAIAction]);

  const handleCustomInstruction = useCallback(async () => {
    if (!editor || !customInstruction.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      // Custom arbeitet IMMER mit dem vollen Dokument (kontextbewusst)
      // WICHTIG: Nutze getPlainTextWithParagraphs() um Absätze korrekt zu erhalten (\n\n zwischen <p> Tags)
      const fullText = getPlainTextWithParagraphs(editor);

      // DEBUG: Zeige wie Text extrahiert wurde
      console.log('📝 Custom Instruction DEBUG:', {
        instruction: customInstruction,
        textLength: fullText.length,
        paragraphCount: fullText.split('\n\n').length,
        firstChars: fullText.substring(0, 200),
        containsDoubleNewlines: fullText.includes('\n\n')
      });

      // WICHTIG: Nutze text-transform mit action:custom für minimale Änderungen
      const data = await apiClient.post<any>('/api/ai/text-transform', {
        text: fullText,
        action: 'custom',
        instruction: customInstruction,
        fullDocument: fullText
      });

      const transformedText = data.transformedText || fullText;

      // Verwende parseHTMLFromAIOutput um Markdown → HTML zu konvertieren
      const htmlContent = parseHTMLFromAIOutput(transformedText);

      // Gesamten Editor-Content ersetzen
      editor.commands.setContent(htmlContent);

      setCustomInstruction('');
      console.log('✅ Custom Instruction erfolgreich ausgeführt');
    } catch (error) {
      console.error('❌ Custom Instruction fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor, customInstruction, isProcessing]);

  if (!editor) return null;

  return (
    <div className="border-b border-gray-200 bg-white overflow-visible">
      {/* Button-Leiste */}
      <div className="flex items-center gap-2 px-4 py-3 flex-wrap overflow-visible">
        {/* Umformulieren */}
        <button
          type="button"
          onClick={() => executeAction('rephrase')}
          disabled={isProcessing}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
            'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-sm hover:shadow'
          )}
          title="Umformulieren"
        >
          <SparklesIcon className="h-4 w-4" />
          <span>Umformulieren</span>
        </button>

        {/* Kürzen */}
        <button
          type="button"
          onClick={() => executeAction('shorten')}
          disabled={isProcessing}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
            'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-sm hover:shadow'
          )}
          title="Kürzen"
        >
          <ArrowsPointingInIcon className="h-4 w-4" />
          <span>Kürzen</span>
        </button>

        {/* Erweitern */}
        <button
          type="button"
          onClick={() => executeAction('expand')}
          disabled={isProcessing}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
            'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-sm hover:shadow'
          )}
          title="Erweitern"
        >
          <ArrowsPointingOutIcon className="h-4 w-4" />
          <span>Erweitern</span>
        </button>

        {/* Ausformulieren */}
        <button
          type="button"
          onClick={() => executeAction('formalize')}
          disabled={isProcessing}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
            'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-sm hover:shadow'
          )}
          title="Ausformulieren (Rohentwurf → strukturierte PR)"
        >
          <DocumentTextIcon className="h-4 w-4" />
          <span>Ausformulieren</span>
        </button>

        {/* Ton ändern Dropdown */}
        <div className="relative">
          <button
            ref={toneButtonRef}
            type="button"
            onClick={() => setShowToneDropdown(!showToneDropdown)}
            disabled={isProcessing}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
              'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-sm hover:shadow'
            )}
            title="Ton ändern"
          >
            <SpeakerWaveIcon className="h-4 w-4" />
            <span>Ton ändern</span>
            <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Ton-Dropdown - Fixed positioning mit z-[9999] über allem */}
          {showToneDropdown && (
            <div
              data-dropdown="tone"
              className="fixed w-48 bg-white border border-gray-200 rounded-md shadow-xl py-1"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                zIndex: 9999
              }}
            >
              {toneOptions.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => handleToneChange(tone.value)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {tone.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Eingabefeld-Bereich */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Anweisung:
          </label>
          <input
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && customInstruction.trim()) {
                e.preventDefault();
                handleCustomInstruction();
              }
            }}
            placeholder="z.B. Das ist mir zu langweilig. Schreib das werblicher."
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-[#005fab] placeholder-gray-400"
            disabled={isProcessing}
          />
          <button
            onClick={handleCustomInstruction}
            disabled={isProcessing || !customInstruction.trim()}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-[#005fab] hover:bg-[#004a8c] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Anweisung ausführen"
          >
            →
          </button>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#005fab] border-t-transparent"></div>
            <span className="text-sm text-gray-600 font-medium">KI bearbeitet...</span>
          </div>
        </div>
      )}
    </div>
  );
};

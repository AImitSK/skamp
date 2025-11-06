// src/components/FixedAIToolbar.tsx
"use client";

import { useState, useCallback, useRef } from 'react';
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

// Re-use parsing functions from FloatingAIToolbar
function parseHTMLFromAIOutput(aiOutput: string): string {
  let text = aiOutput;

  // Entferne nur störende PM-Struktur-Tags, behalte Formatierungs-Tags
  text = text.replace(/<\/?h[1-6][^>]*>/gi, '');
  text = text.replace(/<\/?div[^>]*>/gi, '');
  text = text.replace(/<\/?span[^>]*>/gi, '');

  // Konvertiere Markdown zu HTML
  text = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Entferne Heading-Marker
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '<p><strong>$1</strong></p>');

  // Extrahiere Antwort aus Volltext-Kontext
  const hasFullContext = text.includes('GESAMTER TEXT:') || text.includes('ANWEISUNG ZUM AUSFÜHREN:');
  if (hasFullContext) {
    const parts = text.split(/(?:ANWEISUNG ZUM AUSFÜHREN:|MARKIERTE STELLE).*?:\s*/);
    if (parts.length > 1) {
      text = parts[parts.length - 1].trim();
    }
  }

  // Bereinige extreme PM-Phrasen
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const htmlContent: string[] = [];

  for (const line of lines) {
    if (line.includes('Die Pressemitteilung endet hier') ||
        line.includes('Über [Unternehmen]') ||
        line.includes('Pressekontakt:') ||
        line.includes('Weitere Informationen unter:')) {
      continue;
    }
    htmlContent.push(line);
  }

  const finalText = htmlContent.join('\n');
  if (finalText && !finalText.includes('<p>') && !finalText.includes('<div>')) {
    return finalText.split('\n\n').map(paragraph =>
      paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
    ).filter(p => p).join('\n');
  }

  return finalText;
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
  { value: 'formal', label: 'Formell' },
  { value: 'casual', label: 'Locker' },
  { value: 'professional', label: 'Professionell' },
  { value: 'friendly', label: 'Freundlich' },
  { value: 'confident', label: 'Selbstbewusst' }
];

export const FixedAIToolbar = ({ editor, onAIAction }: FixedAIToolbarProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');

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
          systemPrompt = `Du bist ein professioneller Text-Creator.

WICHTIGE REGELN:
- NIEMALS Headlines, Überschriften oder Titel erstellen (# ## ###)
- NIEMALS <h1>, <h2>, <h3> Tags verwenden
- NIEMALS "Pressemitteilung:", "Titel:" oder ähnliche Label
- NUR reinen Fließtext erstellen
- Titel gibt es bereits in einem separaten Feld

Der markierte Text enthält eine Anweisung oder ein Briefing. Erstelle NUR Fließtext-Content, KEINE Überschriften!`;
          userPrompt = `Führe diese Anweisung aus:\n\n${text}`;
          break;

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

      if (action === 'elaborate') {
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

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    // Wenn kein Text markiert, auf gesamten Content anwenden (optional)
    const textToProcess = selectedText.length > 0 ? selectedText : editor.getText();
    const useFullDocument = selectedText.length === 0;

    try {
      const fullDocument = editor.getHTML() || '';
      const hasFullContext = fullDocument.length > 0 && fullDocument.length > textToProcess.length;

      let systemPrompt = `Du bist ein professioneller Texter. Analysiere die aktuelle Tonalität und ändere sie dann gezielt.

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
      let userPrompt = `Analysiere die aktuelle Tonalität und ändere sie zu ${tone}:\n\n${textToProcess}`;

      const data = await apiClient.post<any>('/api/ai/text-transform', {
        text: textToProcess,
        action: 'change-tone',
        tone: tone,
        fullDocument: hasFullContext ? fullDocument : null
      });

      let newText = parseTextFromAIOutput(data.generatedText || textToProcess);

      if (useFullDocument) {
        // Setze gesamten Editor-Content
        editor.commands.setContent(newText);
      } else {
        // Ersetze nur markierten Text
        editor.view.dispatch(
          editor.view.state.tr
            .setSelection(TextSelection.create(editor.view.state.doc, from, to))
            .replaceSelectionWith(editor.state.schema.text(newText), false)
        );

        // Neue Selection setzen
        setTimeout(() => {
          const newTo = from + newText.replace(/<[^>]*>/g, '').length;
          editor.chain().setTextSelection({ from, to: newTo }).run();
        }, 100);
      }
    } catch (error) {
      console.error('Ton-Änderung fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor]);

  const executeAction = useCallback(async (action: AIAction) => {
    if (!editor || isProcessing) return;

    setIsProcessing(true);

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    // Wenn kein Text markiert, auf gesamten Content anwenden (optional)
    const textToProcess = selectedText.length > 0 ? selectedText : editor.getText();
    const useFullDocument = selectedText.length === 0;

    try {
      const newText = await handleAIAction(action, textToProcess);

      if (action === 'formalize') {
        const htmlContent = parseHTMLFromAIOutput(newText);

        if (useFullDocument) {
          editor.commands.setContent(htmlContent);
        } else {
          editor.chain()
            .setTextSelection({ from, to })
            .insertContent(htmlContent)
            .run();
        }
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

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    // Custom arbeitet IMMER mit dem vollen Dokument (kontextbewusst)
    const textToProcess = editor.getText();  // Immer ganzer Text
    const useFullDocument = true;  // Custom ist immer kontextbewusst

    try {
      const fullDocument = editor?.getHTML() || '';

      const data = await apiClient.post<any>('/api/ai/text-transform', {
        text: textToProcess,
        action: 'custom',
        instruction: customInstruction,
        fullDocument: fullDocument  // Immer fullDocument senden
      });

      const newText = parseTextFromAIOutput(data.generatedText || textToProcess);

      if (useFullDocument) {
        editor.commands.setContent(newText);
      } else {
        editor.view.dispatch(
          editor.view.state.tr
            .setSelection(TextSelection.create(editor.view.state.doc, from, to))
            .replaceSelectionWith(editor.state.schema.text(newText), false)
        );

        setTimeout(() => {
          const newTo = from + newText.replace(/<[^>]*>/g, '').length;
          editor.chain().setTextSelection({ from, to: newTo }).run();
        }, 100);
      }

      setCustomInstruction('');
    } catch (error) {
      console.error('Custom Instruction fehlgeschlagen:', error);
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
        <div className="relative z-50">
          <button
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

          {/* Ton-Dropdown */}
          {showToneDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
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

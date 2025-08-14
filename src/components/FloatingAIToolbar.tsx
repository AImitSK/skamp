// src/components/FloatingAIToolbar.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  SparklesIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SpeakerWaveIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Text-Parser: Extrahiert nur den eigentlichen Inhalt aus KI-Ausgabe
function parseTextFromAIOutput(aiOutput: string): string {
  console.log('🔍 Parsing AI Output:', aiOutput.substring(0, 200) + '...');
  
  // Entferne HTML Tags zuerst
  let text = aiOutput.replace(/<[^>]*>/g, '');
  
  // Split in Zeilen
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const textContent: string[] = [];
  let skipNext = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (skipNext) {
      skipNext = false;
      continue;
    }
    
    // Skip Headlines am Anfang (erkenne an Position und Länge)
    if (i === 0 && line.length < 100 && !line.includes('.') && !line.includes(',')) {
      console.log('⏭️ Skipping headline:', line);
      continue;
    }
    
    // Skip Zitate (beginnen mit " oder enthalten "sagt")
    if (line.startsWith('"') || line.includes('sagt ') || line.includes(', sagt ')) {
      console.log('⏭️ Skipping quote:', line);
      continue;
    }
    
    // Skip Boilerplate (beginnen mit *Über oder About)
    if (line.startsWith('*Über ') || line.startsWith('*About ') || 
        line.startsWith('Über ') && line.includes('Unternehmen')) {
      console.log('⏭️ Skipping boilerplate:', line);
      continue;
    }
    
    // Skip Platzhalter
    if (line.includes('[Name]') || line.includes('[Position]') || line.includes('[Unternehmen]')) {
      console.log('⏭️ Skipping placeholder:', line);
      continue;
    }
    
    // Skip leere Zeilen und zu kurze Fragmente
    if (line.length < 20) {
      console.log('⏭️ Skipping short line:', line);
      continue;
    }
    
    // Alles andere ist Content
    textContent.push(line);
  }
  
  // Zusammenfügen mit einzelnen Leerzeilen
  const result = textContent.join('\n\n');
  
  console.log('✅ Parsed result:', {
    originalLines: lines.length,
    extractedLines: textContent.length,
    firstLine: textContent[0]?.substring(0, 50) + '...',
    resultLength: result.length
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
  | 'change-tone';

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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);

  // Default KI-Action Handler falls keiner übergeben wurde
  const handleAIAction = useCallback(async (action: AIAction, text: string): Promise<string> => {
    if (onAIAction) {
      return onAIAction(action, text);
    }

    // Direkte Gemini-API für Text-Umformulierung (ohne PM-Struktur)
    try {
      let systemPrompt = '';
      let userPrompt = '';
      
      switch (action) {
        case 'rephrase':
          systemPrompt = `Du bist ein professioneller Texter. Analysiere erst die Tonalität des Textes und formuliere dann um.

SCHRITT 1 - TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache, B2B-Kontext
- Verkäuferisch: Superlative, Werbesprache, Call-to-Actions  
- Emotional: Persönliche Ansprache, Gefühle, Stories
- Technisch: Fachbegriffe, Spezifikationen, Details

SCHRITT 2 - UMFORMULIEREN:
- Verwende andere Worte und Satzstrukturen
- BEHALTE die erkannte Tonalität exakt bei
- Ähnliche Textlänge wie das Original
- Gleiche Verkaufsstärke/Sachlichkeit beibehalten
- Vorhandene Überschriften umformulieren, aber keine neuen hinzufügen
- Gleiche Anzahl Absätze beibehalten

Antworte NUR mit dem umformulierten Text (nicht die Analyse).`;
          userPrompt = `Analysiere die Tonalität und formuliere dann um:\n\n${text}`;
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
        default:
          return text;
      }

      console.log(`🤖 KI-${action} (direkt):`, userPrompt.substring(0, 100) + '...');
      
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
      
      // PARSER: Nur den eigentlichen Text extrahieren (keine PM-Struktur)
      result = parseTextFromAIOutput(result);
      
      console.log(`✅ KI-Antwort bereinigt (${result.length} Zeichen):`, result.substring(0, 100) + '...');
      
      return result;
    } catch (error) {
      console.error('KI-Aktion fehlgeschlagen:', error);
      return text;
    }
  }, [onAIAction]);

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
    
    try {
      const systemPrompt = `Du bist ein professioneller Texter. Analysiere die aktuelle Tonalität und ändere sie dann gezielt.

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

      const userPrompt = `Analysiere die aktuelle Tonalität und ändere sie zu ${tone}:\n\n${selectedText}`;
      
      console.log(`🎵 Ton-Änderung zu "${tone}" (direkt):`, userPrompt.substring(0, 100) + '...');
      
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
      
      // Text mit HTML-Formatierung ersetzen
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(newText)
        .run();
      
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
          // Toolbar verstecken wenn Selection fehlschlägt
          setIsVisible(false);
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
        from, 
        to, 
        selectedText: selectedText.substring(0, 50) + '...', 
        newTextLength: newText.length 
      });
      
      // Text mit HTML-Formatierung ersetzen
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(newText)
        .run();
      
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
          // Toolbar verstecken wenn Selection fehlschlägt
          setIsVisible(false);
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
            }, 50); // 50ms um Mausposition zu erfassen
          }
        }, 600); // 600ms Gesamtverzögerung
        
      } else {
        // Toolbar ausblenden wenn keine Selektion
        setSelectedText('');
        lastSelectionRef.current = null;
        hideTimeoutRef.current = setTimeout(() => {
          if (!isInteracting) {
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
        if (!isInteracting) {
          setIsVisible(false);
          setShowToneDropdown(false);
        }
      }, 200);
    });

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      clearTimeout(selectionTimeout);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [editor, isInteracting]);

  // Click-Outside und Mouse-Distance Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Prüfe ob Klick außerhalb der Toolbar
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        // Schließe nur das Dropdown, nicht die ganze Toolbar
        setShowToneDropdown(false);
        
        // NUR bei Klick außerhalb des Editors die Toolbar verstecken
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

    // Mouse-Distance Check - nur wenn Toolbar sichtbar ist
    const handleMouseMove = (event: MouseEvent) => {
      if (!isVisible || !toolbarRef.current || isInteracting) return;
      
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
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
          if (!isInteracting) {
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

  if (!isVisible || !editor) return null;

  return (
    <div
      ref={toolbarRef}
      className={`
        fixed z-50 bg-white border border-gray-300 rounded-lg p-1 
        flex items-center gap-1 transition-all duration-200
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        ${isProcessing ? 'pointer-events-none' : ''}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onMouseDown={(e) => e.preventDefault()} // Verhindert Verlust der Text-Selection
    >
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

      {/* SEO wurde entfernt - kommt später als separates Widget */}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#005fab] border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};
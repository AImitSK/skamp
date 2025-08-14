// src/components/FloatingAIToolbar.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  SparklesIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SpeakerWaveIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface FloatingAIToolbarProps {
  editor: Editor | null;
  onAIAction?: (action: AIAction, selectedText: string) => Promise<string>;
}

export type AIAction = 
  | 'rephrase' 
  | 'shorten' 
  | 'expand' 
  | 'change-tone'
  | 'seo-optimize';

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

    // Fallback zur bestehenden KI-API
    try {
      let prompt = '';
      
      switch (action) {
        case 'rephrase':
          prompt = `Formuliere den folgenden Text komplett um, verwende andere Worte und Satzstrukturen, aber behalte die Kernaussage bei: "${text}"`;
          break;
        case 'shorten':
          prompt = `Kürze den folgenden Text um mindestens 30%, entferne unnötige Details aber behalte die wichtigsten Informationen: "${text}"`;
          break;
        case 'expand':
          prompt = `Erweitere den folgenden Text um mindestens 50%, füge konkrete Details, Beispiele und weiterführende Informationen hinzu: "${text}"`;
          break;
        case 'seo-optimize':
          prompt = `Optimiere den folgenden Text für SEO: Füge relevante Keywords für B2B-Marketing, Online-Marketing und Digitalagentur hinzu, verbessere die Struktur und mache den Text suchmaschinenfreundlicher: "${text}"`;
          break;
        default:
          return text;
      }

      console.log(`🤖 KI-${action}:`, prompt.substring(0, 100) + '...');
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        console.error('KI-API Error:', response.status, response.statusText);
        throw new Error('KI-Anfrage fehlgeschlagen');
      }
      
      const data = await response.json();
      const result = data.text || text;
      
      console.log(`✅ KI-Antwort (${result.length} Zeichen):`, result.substring(0, 100) + '...');
      
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
    
    // Aktuelle Selection sichern
    const currentSelection = editor.state.selection;
    const { from, to } = currentSelection;
    
    try {
      const prompt = `Ändere den Ton des folgenden Textes zu ${tone}, behalte den Inhalt aber ändere die Wortwahl und den Stil entsprechend: "${selectedText}"`;
      
      console.log(`🎵 Ton-Änderung zu "${tone}":`, prompt.substring(0, 100) + '...');
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        console.error('Ton-Änderung API Error:', response.status, response.statusText);
        throw new Error('KI-Anfrage fehlgeschlagen');
      }
      
      const data = await response.json();
      const newText = data.text || selectedText;
      
      console.log('🎵 Ton geändert:', { from, to, tone, newTextLength: newText.length });
      
      // Text mit HTML-Formatierung ersetzen
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(newText)
        .run();
      
      setIsVisible(false);
    } catch (error) {
      console.error('Ton-Änderung fehlgeschlagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor, selectedText]);

  const executeAction = useCallback(async (action: AIAction) => {
    if (!editor || !selectedText || isProcessing) return;
    
    setIsProcessing(true);
    
    // Aktuelle Selection sichern BEVOR der async Call
    const currentSelection = editor.state.selection;
    const { from, to } = currentSelection;
    
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
      
      setIsVisible(false);
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
      // Prüfe ob Klick außerhalb der Toolbar
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowToneDropdown(false);
        
        // Prüfe ob Klick auch außerhalb des Editors ist
        const editorElement = editor?.view.dom;
        if (editorElement && !editorElement.contains(event.target as Node)) {
          // Klick außerhalb Editor - Toolbar verstecken aber State nicht permanent löschen
          setIsVisible(false);
          // selectedText NICHT löschen - damit kann Toolbar wieder erscheinen
        }
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
          onClick={() => setShowToneDropdown(!showToneDropdown)}
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
                onClick={() => handleToneChange(tone.value)}
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

      {/* SEO Optimieren */}
      <button
        onClick={() => executeAction('seo-optimize')}
        disabled={isProcessing}
        className="
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
          bg-[#005fab] hover:bg-[#004a8c] text-white transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="SEO optimieren"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span>SEO</span>
      </button>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#005fab] border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};
// src/components/GmailStyleEditor.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import clsx from 'clsx';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Heading from '@tiptap/extension-heading';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { Extension } from '@tiptap/core';
import { QuoteExtension } from './editor/QuoteExtension';
import { CTAExtension } from './editor/CTAExtension';
import { HashtagExtension } from './editor/HashtagExtension';
import { FloatingAIToolbar } from './FloatingAIToolbar';
import { 
  ArrowsPointingOutIcon, 
  ArrowsPointingInIcon 
} from '@heroicons/react/24/outline';

// Custom Extensions für TipTap v2 Kompatibilität
const FontSize = Extension.create({
  name: 'fontSize',
  
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
    }
  },
});

// Custom Underline Extension (kompatibel mit TipTap v2)
const CustomUnderline = Extension.create({
  name: 'customUnderline',
  
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          underline: {
            default: null,
            parseHTML: element => element.style.textDecoration?.includes('underline') ? 'underline' : null,
            renderHTML: attributes => {
              if (!attributes.underline) {
                return {}
              }
              return {
                style: 'text-decoration: underline',
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      toggleUnderline: () => ({ chain, editor }) => {
        const isActive = editor.isActive('textStyle', { underline: 'underline' });
        if (isActive) {
          return chain().setMark('textStyle', { underline: null }).run();
        }
        return chain().setMark('textStyle', { underline: 'underline' }).run();
      },
    }
  },
});

// Custom TextAlign Extension (kompatibel mit TipTap v2) 
const CustomTextAlign = Extension.create({
  name: 'customTextAlign',
  
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: 'left',
            parseHTML: element => element.style.textAlign || 'left',
            renderHTML: attributes => {
              if (!attributes.textAlign || attributes.textAlign === 'left') {
                return {}
              }
              return {
                style: `text-align: ${attributes.textAlign}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextAlign: (alignment: string) => ({ chain }) => {
        return chain().updateAttributes('paragraph', { textAlign: alignment }).run();
      },
    }
  },
});

import { GmailStyleToolbar } from './GmailStyleToolbar';
import { SEOHeaderBar } from './campaigns/SEOHeaderBar';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface GmailStyleEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (content: string) => void;
  className?: string;
  title?: string;
  onTitleChange?: (title: string) => void;
  // Keywords entfernt - SEO-Optimierung nicht mehr benötigt
}

export const GmailStyleEditor = ({ 
  content, 
  onChange, 
  placeholder = 'Pressemitteilung schreiben...',
  autoSave = true,
  autoSaveDelay = 10000, // 10 Sekunden wie im Masterplan
  onAutoSave,
  className,
  title = '',
  onTitleChange
  // Keywords entfernt
}: GmailStyleEditorProps) => {
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Auto-save functionality
  const debouncedAutoSave = useCallback(
    debounce((content: string) => {
      if (onAutoSave && content.trim()) {
        onAutoSave(content);
      }
    }, autoSaveDelay),
    [onAutoSave, autoSaveDelay]
  );

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // ESC key handler for fullscreen
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false, // Deaktivieren um eigene zu verwenden
        orderedList: false, // Deaktivieren um eigene zu verwenden
        listItem: false, // Deaktivieren um eigene zu verwenden
        blockquote: false, // Deaktivieren um eigene QuoteExtension zu verwenden
      }),
      Heading.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: 'font-semibold text-gray-900',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#005fab] underline hover:text-[#004a8c] cursor-pointer',
          rel: 'noopener noreferrer',
          target: '_blank'
        },
      }),
      // Explizite Listen-Konfiguration
      ListItem.configure({
        HTMLAttributes: {
          class: 'ml-4',
        },
      }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'list-disc list-outside ml-6 space-y-1',
        },
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'list-decimal list-outside ml-6 space-y-1',
        },
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      FontSize,
      CustomUnderline,
      CustomTextAlign,
      QuoteExtension,
      CTAExtension,
      HashtagExtension,
    ],
    content: content,
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        class: `gmail-editor-content focus:outline-none ${className || ''}`,
        'data-placeholder': placeholder,
        style: 'min-height: 350px; padding: 1.5rem; font-size: 18px !important; line-height: 1.8 !important;',
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html);
      
      // Auto-save wenn aktiviert
      if (autoSave && onAutoSave) {
        debouncedAutoSave(html);
      }
    },
  });
  
  // Content synchronisieren wenn sich der content prop ändert
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Kleine Verzögerung um sicherzustellen, dass der Editor bereit ist
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(content, false);
          // Force re-render um sicherzustellen, dass das Styling angewendet wird
          editor.commands.focus();
          editor.commands.blur();
        }
      }, 100);
    }
  }, [content, editor]);

  return (
    <div className={clsx(
      "gmail-style-editor bg-white",
      isFullscreen 
        ? "fixed inset-0 z-50 flex flex-col" 
        : "rounded-lg border border-gray-200"
    )}>
      {/* Fullscreen Header - nur im Fullscreen */}
      {isFullscreen && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Fokussiertes Schreiben
            </h2>
            <span className="text-sm text-gray-500">ESC zum Beenden</span>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFullscreen();
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fullscreen beenden (ESC)"
            type="button"
          >
            <ArrowsPointingInIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Floating AI Toolbar - temporär deaktiviert für Debug */}
      {/* <FloatingAIToolbar editor={editor} /> */}
      
      {/* Titel-Bereich */}
      {onTitleChange && (
        <div className="border-b border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Titel der Pressemitteilung..."
            className="w-full px-6 py-4 text-2xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none placeholder-gray-400"
          />
        </div>
      )}


      {/* Toolbar mit Fullscreen Button */}
      <div className="relative">
        <GmailStyleToolbar editor={editor} />
        
        {/* Fullscreen Button - nur im normalen Modus */}
        {!isFullscreen && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFullscreen();
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute right-4 top-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Vollbild-Modus (fokussiertes Schreiben)"
            type="button"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Editor Content - eine einzige EditorContent Instanz */}
      <div className={clsx(
        "relative",
        isFullscreen 
          ? "flex-1 overflow-y-auto" 
          : "p-6"
      )} style={{ minHeight: isFullscreen ? 'auto' : '400px' }}>
        
        {/* Wrapper für Fullscreen */}
        <div className={clsx(
          isFullscreen 
            ? "max-w-4xl mx-auto p-8" 
            : ""
        )}>
          <EditorContent 
            editor={editor} 
            className={clsx(
              "prose prose-lg max-w-none gmail-editor-content",
              isFullscreen && "fullscreen-editor"
            )}
            style={{ 
              minHeight: isFullscreen ? 'calc(100vh - 300px)' : '350px',
              fontSize: isFullscreen ? '20px' : '18px',
              lineHeight: isFullscreen ? '2.0' : '1.8'
            }}
          />
          
          {/* Originale FloatingAIToolbar - mit mechanischen Fixes */}
          {editor && <FloatingAIToolbar editor={editor} />}
        </div>
      </div>
        
      {/* Gmail-Style Styling */}
      <style jsx>{`
          .gmail-style-editor {
            /* CeleroPress Design System v2.0 */
            --primary: #005fab;
            --primary-hover: #004a8c;
            --text-primary: #000000;
            --text-secondary: #666666;
            --border-gray: #d1d5db;
          }

          .gmail-editor-content {
            min-height: 400px;
            font-size: 18px !important;
            line-height: 1.8 !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          /* ProseMirror Editor mit richtigem Padding und Textgröße */
          .gmail-editor-content .ProseMirror {
            padding: 1rem 1.5rem;
            min-height: 350px;
            outline: none;
            box-sizing: border-box;
            font-size: 18px !important;
            line-height: 1.8 !important;
          }

          /* Überschreibt Prose-Styles spezifisch */
          .prose.prose-lg .gmail-editor-content .ProseMirror,
          .prose .gmail-editor-content .ProseMirror {
            font-size: 18px !important;
            line-height: 1.8 !important;
          }

          /* Alle Textknoten im Editor - sehr spezifisch */
          .gmail-editor-content .ProseMirror p,
          .gmail-editor-content .ProseMirror div,
          .gmail-editor-content .ProseMirror span,
          .prose .gmail-editor-content .ProseMirror p,
          .prose .gmail-editor-content .ProseMirror div,
          .prose .gmail-editor-content .ProseMirror span,
          .prose-lg .gmail-editor-content .ProseMirror p,
          .prose-lg .gmail-editor-content .ProseMirror div,
          .prose-lg .gmail-editor-content .ProseMirror span {
            font-size: 18px !important;
            line-height: 1.8 !important;
          }

          /* Direkte ProseMirror-Übersteuerung */
          .ProseMirror {
            font-size: 18px !important;
            line-height: 1.8 !important;
          }
          
          /* Gmail-like placeholder */
          .gmail-editor-content:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
            position: absolute;
            font-style: italic;
          }
          
          /* Clean paragraph styling */
          .gmail-editor-content p {
            margin: 0 0 1rem 0;
            color: var(--text-primary);
          }
          
          /* Heading styles (CeleroPress conform) */
          .gmail-editor-content h1 {
            font-size: 1.875rem;
            line-height: 2.25rem;
            margin: 1.5rem 0 1rem 0;
            color: var(--text-primary);
          }
          
          .gmail-editor-content h2 {
            font-size: 1.5rem;
            line-height: 2rem;
            margin: 1.25rem 0 0.75rem 0;
            color: var(--text-primary);
          }
          
          .gmail-editor-content h3 {
            font-size: 1.25rem;
            line-height: 1.75rem;
            margin: 1rem 0 0.5rem 0;
            color: var(--text-primary);
          }
          
          /* List styling mit besserer Sichtbarkeit */
          .gmail-editor-content ul,
          .gmail-editor-content ol {
            margin: 1rem 0;
            padding-left: 2rem;
          }
          
          .gmail-editor-content ul {
            list-style-type: disc;
            list-style-position: outside;
          }
          
          .gmail-editor-content ol {
            list-style-type: decimal;
            list-style-position: outside;
          }
          
          .gmail-editor-content li {
            margin: 0.5rem 0;
            padding-left: 0.5rem;
            position: relative;
          }
          
          /* Ensure list markers are visible */
          .gmail-editor-content ul li::marker,
          .gmail-editor-content ol li::marker {
            color: var(--text-primary);
            font-weight: normal;
          }
          
          /* Link styling (CeleroPress Primary) */
          .gmail-editor-content a {
            color: var(--primary);
            text-decoration: underline;
            transition: color 0.2s ease;
          }
          
          .gmail-editor-content a:hover {
            color: var(--primary-hover);
          }
          
          /* Clean blockquote styling */
          .gmail-editor-content blockquote,
          .gmail-editor-content blockquote[data-type="pr-quote"] {
            border-left: 3px solid var(--primary);
            padding-left: 1rem;
            margin: 1.5rem 0;
            color: var(--text-secondary);
            font-style: italic;
            background: #f1f0e2; /* CeleroPress hellgelb */
            padding: 1rem;
            border-radius: 0.375rem;
          }
          
          /* CTA Text styling */
          .gmail-editor-content .cta-text,
          .gmail-editor-content span[data-type="cta-text"] {
            color: #000000 !important; /* text-black mit !important */
            font-weight: bold;
          }
          
          /* Hashtag styling - Social Media optimiert */
          .gmail-editor-content .hashtag,
          .gmail-editor-content span[data-type="hashtag"] {
            color: #000000; /* text-black */
            font-weight: 600; /* font-semibold */
            cursor: pointer;
            transition: color 0.2s ease;
            text-decoration: none;
          }
          
          .gmail-editor-content .hashtag:hover,
          .gmail-editor-content span[data-type="hashtag"]:hover {
            color: #374151; /* text-gray-700 */
          }
          
          /* Hashtag-Kandidaten während des Tippens */
          .gmail-editor-content .hashtag-candidate {
            color: #000000; /* text-black */
            font-weight: 500; /* font-medium */
            background: rgba(0, 0, 0, 0.05); /* Leichter grauer Hintergrund */
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            transition: all 0.2s ease;
          }
          
          /* Focus states */
          .gmail-editor-content:focus-within {
            /* Subtle focus indication ohne störende Outlines */
          }
          
          /* KEINE Schatten-Effekte (Design Pattern) */
          .gmail-style-editor * {
            box-shadow: none !important;
          }

          /* Fullscreen styles - etwas größer als normal */
          .fullscreen-editor .ProseMirror {
            font-size: 20px !important;
            line-height: 2.0 !important;
            max-width: none;
            padding: 2rem;
          }

          .fullscreen-editor .ProseMirror p,
          .fullscreen-editor .ProseMirror div,
          .fullscreen-editor .ProseMirror span,
          .prose .fullscreen-editor .ProseMirror p,
          .prose .fullscreen-editor .ProseMirror div,
          .prose .fullscreen-editor .ProseMirror span,
          .prose-lg .fullscreen-editor .ProseMirror p,
          .prose-lg .fullscreen-editor .ProseMirror div,
          .prose-lg .fullscreen-editor .ProseMirror span {
            font-size: 20px !important;
            line-height: 2.0 !important;
          }

          /* Fullscreen Editor Container */
          .fullscreen-editor {
            font-size: 20px !important;
            line-height: 2.0 !important;
          }

          /* Direkter Fullscreen-ProseMirror */
          .fullscreen-editor.ProseMirror,
          .fullscreen-editor .ProseMirror {
            font-size: 20px !important;
            line-height: 2.0 !important;
          }
        `}</style>
    </div>
  );
};